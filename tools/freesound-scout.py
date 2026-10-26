#!/usr/bin/env python3
"""Scout Freesound for the game's sounds.

For every sound the game needs, search Freesound for CC0 / CC BY recordings in
the right duration range, drop wrong content by keyword, rank by community
rating and downloads, fetch the HQ previews of the best few and measure them
(noise floor, clipping, bandwidth, how many separate calls they contain).
Writes tools/sfx-src/freesound/candidates.json and prints a table to choose from.

Needs a Freesound API key in tools/sfx-src/freesound.key (free account; the
key only searches and fetches previews). Run with the Kokoro venv:
  tools/tts/.venv/bin/python -I tools/freesound-scout.py [need ...]
"""
import sys, os, json, time, math, re, urllib.request, urllib.parse
import numpy as np, soundfile as sf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'tools', 'sfx-src', 'freesound')
KEY = open(os.path.join(ROOT, 'tools', 'sfx-src', 'freesound.key')).read().strip()
UA = {'User-Agent': 'sunny-barn-farm-sfx/1.0'}
FIELDS = 'id,name,username,license,duration,samplerate,bitdepth,channels,avg_rating,num_ratings,num_downloads,previews,tags,type,description'
LIC_OK = ('publicdomain/zero', 'licenses/by/')
GENERIC_NO = ['synth', 'cartoon', 'imitation', 'impression', 'human', 'mouth', 'voice', 'vocal', 'person', 'man ', 'woman', 'toy', '8-bit', '8bit', 'kid ', 'child', 'baby']

def need(q, dur, no=(), yes=(), n=6, generic=True, extra_q=()):
    return dict(q=[q, *extra_q], dur=dur, no=list(no) + (GENERIC_NO if generic else []), yes=list(yes), n=n)

NEEDS = {
    # ---- animals: a single clear call, close-miked ----
    'cow':     need('cow moo', (0.6, 6), no=['cowbell', 'bell', 'machine', 'herd', 'cows'], yes=['field-recording', 'moo']),
    'sheep':   need('sheep baa bleat', (0.4, 5), no=['herd', 'flock', 'lamb'], yes=['field-recording']),
    'goat':    need('goat bleat', (0.3, 5), no=['scream', 'screaming', 'herd', 'kid'], yes=['field-recording']),
    'pig':     need('pig oink grunt', (0.3, 5), no=['squeal', 'scream', 'slaughter', 'guinea'], yes=['field-recording', 'oink'], extra_q=['pig grunting']),
    'horse':   need('horse neigh whinny', (0.6, 5), no=['snort', 'gallop', 'hooves'], yes=['field-recording']),
    'dog':     need('dog bark single', (0.3, 4), no=['growl', 'angry', 'puppy whine', 'howl'], yes=['bark']),
    'cat':     need('cat meow', (0.3, 4), no=['hiss', 'angry', 'fight', 'scream', 'kitten', 'purr'], yes=['meow']),
    'kitten':  need('kitten meow', (0.3, 4), no=['hiss', 'angry', 'purr'], yes=['kitten']),
    'chicken': need('hen clucking chicken', (0.5, 8), no=['rooster', 'crow', 'coop', 'flock', 'many'], yes=['cluck', 'hen']),
    'rooster': need('rooster crowing', (0.8, 6), no=['hen', 'flock', 'distant'], yes=['rooster', 'crow']),
    'duck':    need('duck quack', (0.3, 6), no=['call', 'hunting', 'decoy', 'rubber', 'flock', 'wings'], yes=['quack', 'mallard']),
    'owl':     need('owl hoot', (0.6, 6), no=['screech', 'barn owl', 'scream'], yes=['hoot', 'tawny']),
    'frog':    need('frog croak', (0.3, 5), no=['chorus', 'pond', 'many', 'frogs'], yes=['croak', 'ribbit']),
    'caw':     need('crow caw', (0.3, 5), no=['rooster', 'flock', 'many'], yes=['crow', 'caw']),
    # ---- the animals' tricks ----
    'munch':   need('crunch bite apple eating', (0.3, 3), no=['glass', 'bone', 'metal', 'gravel', 'snow'], yes=['crunch', 'bite', 'eat']),
    'boing':   need('cartoon boing spring jump', (0.2, 2), no=[], yes=['boing', 'spring'], generic=False),
    'flap':    need('bird wing flap flutter', (0.3, 3), no=['flag', 'cloth', 'paper', 'bat'], yes=['wing', 'flap']),
    'gallop':  need('horse gallop hooves', (1.0, 8), no=['carriage', 'cart', 'coconut'], yes=['gallop', 'hooves']),
    'purr':    need('cat purring', (1.0, 10), no=['meow', 'engine', 'car'], yes=['purr']),
    'mouse': need('mouse squeak', (0.2, 3), no=['computer', 'click', 'door', 'hinge', 'toy', 'bed', 'balloon', 'shoe', 'chair', 'brake', 'rubber', 'wheel'], yes=['mouse', 'squeak', 'rat'], generic=False, extra_q=['rat squeak', 'mouse', 'squeak']),
    'egg': need('plop', (0.1, 1.2), no=['toilet', 'cartoon', 'synth', 'big'], yes=['plop', 'bloop', 'drop', 'pop'], generic=False, extra_q=['bloop', 'water drop', 'drip plop']),
    'snore':   need('snoring snore', (0.8, 6), no=['dog', 'cat', 'pig'], yes=['snore'], generic=False),
    # ---- foley ----
    'door': need('door creak', (0.5, 4), no=['slam', 'shut', 'closing', 'metal', 'car', 'cabinet', 'drawer', 'knock'], yes=['creak', 'wood', 'barn', 'open'], generic=False, extra_q=['barn door', 'door open', 'creaky door']),
    'doorClose': need('wooden door close', (0.2, 2.5), no=['open', 'creak', 'metal', 'car', 'cabinet', 'drawer', 'knock'], yes=['close', 'wood']),
    'honk': need('car horn', (0.3, 2.5), no=['truck', 'train', 'ship', 'air horn', 'goose', 'synth', 'fog', 'traffic', 'siren'], yes=['horn', 'honk', 'vintage', 'klaxon', 'bulb', 'old'], generic=False, extra_q=['klaxon', 'bulb horn', 'bicycle horn', 'horn honk', 'old horn']),
    'splash':  need('water splash', (0.3, 3), no=['toilet', 'flush', 'pour', 'bath tap', 'sink'], yes=['splash']),
    'squeakToy': need('rubber duck', (0.2, 2), no=['door', 'hinge', 'shoe', 'mouse', 'bed', 'chair', 'brake'], yes=['squeak', 'rubber', 'duck', 'toy'], generic=False, extra_q=['squeaky toy', 'squeak toy', 'dog toy squeak']),
    'whoosh':  need('whoosh swoosh', (0.3, 1.8), no=['sword', 'fire', 'laser', 'gun', 'synth'], yes=['whoosh', 'swoosh'], generic=False),
    'firework': need('firework', (0.8, 5), no=['gun', 'war', 'bomb', 'distant', 'crowd', 'loop'], yes=['firework', 'burst', 'crackle', 'whistle'], generic=False, extra_q=['fireworks burst', 'firework whistle', 'fireworks']),
    'bee': need('bee buzz', (0.6, 5), no=['swarm', 'hive', 'many', 'wasp', 'mosquito', 'synth', 'drone'], yes=['bee', 'buzz', 'bumble'], generic=False, extra_q=['bumblebee', 'bee flying', 'bee']),
    'bubble': need('bubble pop', (0.1, 1.2), no=['gum', 'cartoon', 'mouth', 'underwater', 'boiling', 'synth'], yes=['bubble', 'pop'], generic=False, extra_q=['bubbles', 'water bubble']),
    'cheer': need('children cheering', (0.8, 5), no=['stadium', 'adult', 'booing', 'boo ', 'crowd noise'], yes=['children', 'kids', 'cheer', 'yay', 'hooray'], generic=False, extra_q=['kids cheer', 'kids yay', 'children hooray', 'kids cheering']),
    'giggle':  need('child giggle laugh', (0.5, 4), no=['adult', 'evil', 'man', 'woman', 'creepy'], yes=['giggle', 'child', 'laugh'], generic=False),
    # ---- interface ----
    'pop':     need('pop short click soft', (0.05, 0.6), no=['gun', 'corn', 'cork', 'bubble gum', 'mouth'], yes=['pop', 'ui', 'click'], generic=False, extra_q=['ui pop sound']),
    'ding': need('glockenspiel', (0.3, 3), no=['loop', 'melody', 'scale', 'chord', 'wrong', 'tune'], yes=['glockenspiel', 'bell', 'note', 'ding'], generic=False, extra_q=['ding', 'bell ding', 'triangle hit', 'glockenspiel note']),
    'count':   need('xylophone single note', (0.2, 2.5), no=['loop', 'melody', 'scale', 'chord'], yes=['xylophone', 'marimba', 'note'], generic=False, extra_q=['marimba single hit']),
    'sparkle': need('sparkle', (0.4, 3), no=['dark', 'horror', 'evil', 'loop', 'drone', 'riser'], yes=['sparkle', 'magic', 'chime', 'shimmer', 'twinkle'], generic=False, extra_q=['magic chime', 'shimmer', 'twinkle', 'magic sparkle']),
    'success': need('success jingle', (0.8, 4), no=['loop', 'fail', 'wrong', 'lose', 'dark', '8-bit', '8bit', 'retro', 'game over'], yes=['success', 'win', 'jingle', 'ukulele', 'xylophone', 'happy'], generic=False, extra_q=['win jingle', 'level complete', 'success', 'achievement jingle']),
    'oops': need('wrong answer', (0.3, 2), no=['loop', 'alarm', 'scream', 'harsh', 'glitch', 'explosion'], yes=['wrong', 'fail', 'gentle', 'soft', 'xylophone', 'uh oh'], generic=False, extra_q=['uh oh', 'fail soft', 'wrong buzzer', 'error soft']),
    'listen': need('notification chime', (0.3, 2.5), no=['loop', 'alarm', 'phone', 'error', 'glitch'], yes=['chime', 'notification', 'ding dong', 'bell'], generic=False, extra_q=['ding dong', 'attention chime', 'chime', 'two tone chime']),
    # ---- ambience beds ----
    'amb-day': need('dawn chorus', (60, 600), no=['traffic', 'car', 'road', 'city', 'voice', 'talk', 'people', 'church', 'rain', 'thunder', 'storm', 'cowbell', 'sea', 'ocean', 'river', 'airplane', 'plane'], yes=['birds', 'dawn', 'meadow', 'farm', 'countryside', 'field-recording', 'morning'], n=8, generic=False, extra_q=['morning birds', 'birdsong', 'countryside ambience', 'meadow birds', 'farm ambience']),
    'amb-night': need('crickets night ambience', (30, 600), no=['traffic', 'car', 'road', 'city', 'voice', 'talk', 'people', 'rain', 'thunder', 'storm', 'sea', 'ocean', 'jungle', 'cicada'], yes=['crickets', 'night', 'field-recording'], n=6, generic=False),
    'engine': need('tractor idle', (6, 120), no=['start', 'pass', 'drive', 'horn', 'truck', 'lawn', 'mower', 'chainsaw'], yes=['tractor', 'idle', 'diesel', 'loop'], n=8, generic=False, extra_q=['tractor engine', 'tractor', 'diesel idle', 'engine idle loop']),
}

def api(path, **params):
    u = 'https://freesound.org/apiv2' + path + '?' + urllib.parse.urlencode(params)
    r = urllib.request.Request(u, headers={'Authorization': 'Token ' + KEY, **UA})
    for attempt in range(3):
        try: return json.load(urllib.request.urlopen(r, timeout=40))
        except Exception as e:
            if attempt == 2: raise
            time.sleep(5)
    
def search(q, dur, sort, n):
    time.sleep(1.05)   # 60 requests / minute
    flt = f'duration:[{dur[0]} TO {dur[1]}] license:("Creative Commons 0" OR "Attribution")'
    return api('/search/text/', query=q, filter=flt, fields=FIELDS, sort=sort, page_size=n).get('results', [])

def text_of(r): return (r['name'] + ' ' + ' '.join(r.get('tags', [])) + ' ' + (r.get('description') or '')).lower()

def prior(r, yes):
    rating = (r['avg_rating'] * r['num_ratings'] + 3.8 * 3) / (r['num_ratings'] + 3)   # shrink toward a plain 3.8
    s = rating + 0.45 * math.log10(r['num_downloads'] + 1)
    if r['samplerate'] >= 44100: s += 0.2
    if (r.get('bitdepth') or 0) >= 24: s += 0.15
    if r['type'] in ('wav', 'flac', 'aiff'): s += 0.15
    t = text_of(r); s += 0.12 * sum(1 for y in yes if y in t)
    return s

def analyse(path):
    x, sr = sf.read(path, dtype='float32', always_2d=True); m = x.mean(1)
    if len(m) < sr * 0.05: return None
    pk = float(np.abs(m).max()) or 1e-9
    W = int(sr * 0.05); c = np.cumsum(np.concatenate([[0.0], m.astype('float64') ** 2]))
    rms = np.sqrt(np.maximum(0, (c[W:] - c[:-W]) / W))[::W // 2]
    floor = float(np.percentile(rms, 10)); loud = float(np.percentile(rms, 98))
    S = np.abs(np.fft.rfft(m[: min(len(m), sr * 20)])) ** 2; f = np.fft.rfftfreq(min(len(m), sr * 20), 1 / sr)
    hf = float(S[f > 8000].sum() / S.sum()); vhf = float(S[f > 15000].sum() / S.sum())
    clip = float((np.abs(x) > 0.985).mean())
    on = rms > loud * 10 ** (-20 / 20); events = int(np.sum(np.diff(np.concatenate([[0], on.astype(int)])) == 1))
    return dict(floor_db=round(20 * math.log10(floor / loud + 1e-6), 1), hf=round(hf, 3), vhf=round(vhf, 4), clip=round(clip, 5), events=events, peak_db=round(20 * math.log10(pk), 1))

def main():
    os.makedirs(SRC, exist_ok=True)
    wanted = sys.argv[1:] or list(NEEDS)
    cand_path = os.path.join(SRC, 'candidates.json')
    cands = json.load(open(cand_path)) if os.path.exists(cand_path) else {}
    for name in wanted:
        spec = NEEDS[name]; pool = {}
        got = dropped = 0
        for q in spec['q']:
            for sort, n in (('rating_desc', 60), ('downloads_desc', 30)):
                for r in search(q, spec['dur'], sort, n):
                    got += 1
                    if not any(k in r['license'] for k in LIC_OK): continue
                    t = text_of(r)
                    if any(w in t for w in spec['no']): dropped += 1; continue
                    r['prior'] = prior(r, spec['yes']); pool[r['id']] = r
        top = sorted(pool.values(), key=lambda r: -r['prior'])[: spec['n']]
        rows = []
        for r in top:
            path = os.path.join(SRC, f"{r['id']}.ogg")
            if not os.path.exists(path):
                try:
                    data = urllib.request.urlopen(urllib.request.Request(r['previews']['preview-hq-ogg'], headers=UA), timeout=120).read()
                    open(path, 'wb').write(data)
                except Exception as e: print('   fetch failed', r['id'], e); continue
            a = analyse(path)
            if not a: continue
            score = r['prior'] - 0.04 * max(0, a['floor_db'] + 45) - (2 if a['clip'] > 0.002 else 0) - (1 if a['events'] == 0 else 0)
            rows.append(dict(id=r['id'], name=r['name'], user=r['username'], license='CC0' if 'zero' in r['license'] else 'CC BY', url=f"https://freesound.org/s/{r['id']}/",
                             dur=round(r['duration'], 2), sr=int(r['samplerate']), bits=r.get('bitdepth') or 0, rating=round(r['avg_rating'], 1), nr=r['num_ratings'], dl=r['num_downloads'],
                             tags=r['tags'][:10], score=round(score, 2), **a))
        rows.sort(key=lambda r: -r['score']); cands[name] = rows
        json.dump(cands, open(cand_path, 'w'), indent=1)
        print(f"\n== {name}  ({len(pool)} usable of {got} results; {dropped} dropped by keyword)")
        for r in rows: print(f"   {r['id']:7d} {r['score']:5.2f}  {r['name'][:34]:34s} {r['user'][:14]:14s} {r['license']:5s} {r['dur']:6.1f}s {r['sr']:6d}Hz/{r['bits']:2d}b  rate {r['rating']:.1f}x{r['nr']:<3d} dl {r['dl']:<6d} floor {r['floor_db']:6.1f}  hf {r['hf']:.2f}  clip {r['clip']:.4f}  ev {r['events']}")
        sys.stdout.flush()

if __name__ == '__main__': main()
