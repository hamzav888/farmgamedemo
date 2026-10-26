#!/usr/bin/env python3
"""Build the game's sound-effect library (sfx/) from real recordings.

Sources
  * Apple's iLife / iMovie sound-effect library, installed with iMovie on this
    Mac. Apple's licence lets you use it in your own projects royalty-free; it
    only forbids repackaging the clips as a sound library of their own.
  * A few freely licensed recordings from Wikimedia Commons (public domain,
    CC0, CC BY, CC BY-SA) for the animals Apple does not have: pig, cat, goat,
    crow. They live in tools/sfx-src/ (git-ignored); credits go to CREDITS.md.

Every take is cut from its recording, high-passed, trimmed, faded, levelled to
a common loudness and encoded to a small mono AAC file named by content hash,
so the files can be cached for a year. sfx/manifest.json lists them;
js/audio.js plays a random take with a little pitch variation, and falls back
to its own synthesised version of each sound until the files have arrived.

Usage
  tools/tts/.venv/bin/python -I tools/make-sfx.py                     build sfx/
  tools/tts/.venv/bin/python -I tools/make-sfx.py --scan FILE [GATE]  list the takes inside a recording
Needs numpy + soundfile (the Kokoro venv has both) and afconvert (macOS).
"""
import sys, os, json, hashlib, subprocess, tempfile, argparse
import numpy as np, soundfile as sf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'sfx')
SRC = os.path.join(ROOT, 'tools', 'sfx-src')
FS = os.path.join(SRC, 'freesound')                   # HQ previews fetched by tools/freesound-scout.py
SR = 44100
VERSION = 2

def F(fsid): return os.path.join(FS, f'{fsid}.ogg')
# who made each Freesound clip, from the scout's notes (for CREDITS.md)
FS_META = {}
try:
    for rows in json.load(open(os.path.join(FS, 'candidates.json'))).values():
        for r in rows: FS_META[r['id']] = r
except FileNotFoundError: pass

# Wikimedia Commons files: who made them and under what licence (for CREDITS.md)
COMMONS = {
    'Pig grunt - Erdie.ogg':                               ('Erdie (via Freesound)', 'CC BY 3.0'),
    'Mudchute pig 1.ogg':                                  ('Richard Nevell', 'CC BY-SA 3.0'),
    'Mudchute pig 2.ogg':                                  ('Richard Nevell', 'CC BY-SA 3.0'),
    'Mudchute pig 3.ogg':                                  ('Richard Nevell', 'CC BY-SA 3.0'),
    'Meow of a Siamese cat - freemaster2.wav':             ('freemaster2 (via Freesound)', 'CC0'),
    'Maullido de gata hembra joven.ogg':                   ('Wikimedia Commons contributor', 'CC0'),
    'Herd of goats bleating.ogg':                          ('stephan (via PDSounds)', 'Public domain'),
    'Carrion Crow (Corvus corone) (W1CDR0001425 BD18).ogg': ('British Library, Culver, Devon', 'CC BY-SA 4.0'),
    'Corvus corone - Carrion Crow XC511130.mp3':           ('xeno-canto', 'CC BY-SA 4.0'),
    'Sheep bleating.ogg':                                  ('PDSounds', 'Public domain'),
}
def commons_url(name): return 'https://commons.wikimedia.org/wiki/File:' + name.replace(' ', '_')

# A take is (file, start, end, options). Options: hp / lp (Hz), pitch (x1.25 =
# a fifth up), fade_in / fade_out (s), target (dBFS, max 300 ms RMS), expand_db,
# and split=dict(gate=dB, n=.., min=.., max=..) to carve a recording into its
# separate calls, loudest first. Sources are Freesound ids (see freesound-scout.py).
T = -24      # the common loudness for one-shots (max 300 ms RMS, dBFS)
def S(gate=-16, n=2, mn=0.3, mx=2.2, gap=0.22): return dict(split=dict(gate=gate, n=n, min=mn, max=mx, gap=gap))
def take(fsid, start=0, end=None, **o): return (F(fsid), start, end, o)

SOUNDS = {
    # ---- animals ----
    'cow':     dict(rate=0.025, takes=[take(58277, fade_out=0.3), take(57791, **S(n=2, mn=0.8, mx=3.0)), take(707961, fade_out=0.3)]),
    'sheep':   dict(rate=0.04,  takes=[take(692900, **S(n=2, mn=0.4, mx=2.0)), take(360547, **S(n=1, mn=0.4, mx=1.5)), take(360455)]),
    'goat':    dict(rate=0.05,  takes=[take(581240, **S(n=2, mn=0.3, mx=1.6)), take(683259, **S(n=2, mn=0.3, mx=1.6)), take(343025)]),
    'pig':     dict(rate=0.05,  takes=[take(233173), take(233171), take(233172, **S(n=1, mn=0.25, mx=1.2)), take(233170)]),
    'horse':   dict(rate=0.03,  takes=[take(419231), take(269571, **S(n=1, mn=0.6, mx=1.6))]),
    'dog':     dict(rate=0.05,  takes=[take(277058), take(554599), take(630648), take(502655)]),
    'cat':     dict(rate=0.04,  takes=[take(412017, **S(n=2, mn=0.3, mx=1.4)), take(138404, **S(n=2, mn=0.3, mx=1.4)), take(110010)]),
    'kitten':  dict(rate=0.05,  takes=[take(220018), take(448084), take(262312)]),
    'chicken': dict(rate=0.04,  takes=[take(120582, **S(gate=-20, n=2, mn=0.6, mx=2.0, gap=0.35)), take(607245, **S(gate=-20, n=1, mn=0.6, mx=2.0, gap=0.35)), take(572955, **S(gate=-20, n=2, mn=0.6, mx=2.0, gap=0.35))]),
    'rooster': dict(rate=0.03,  takes=[take(435508), take(435506), take(435507)]),
    'duck':    dict(rate=0.05,  takes=[take(418509), take(90028, **S(n=2, mn=0.3, mx=1.4)), take(185546), take(607226, 0.7, 2.25)]),
    'owl':     dict(rate=0.02,  takes=[take(398734, 0, 2.6, fade_out=0.5), take(187669, **S(gate=-18, n=2, mn=0.6, mx=2.2, gap=0.4)), take(558397, **S(gate=-18, n=1, mn=0.6, mx=2.2, gap=0.4))]),
    'frog':    dict(rate=0.04,  takes=[take(354132), take(536759), take(361117, **S(n=1, mn=0.3, mx=1.4))]),
    'caw':     dict(rate=0.05,  takes=[take(75162, **S(n=2, mn=0.3, mx=1.4)), take(741366, **S(n=2, mn=0.3, mx=1.4))]),
    # ---- the animals' tricks ----
    'munch':   dict(rate=0.06,  takes=[take(20280), take(20279)]),
    'boing':   dict(rate=0.05,  takes=[take(334031), take(334032), take(825575)]),
    'flap':    dict(rate=0.05,  takes=[take(330965), take(246225, 0, 2.0, fade_out=0.3), take(330966)]),
    'gallop':  dict(rate=0.04,  takes=[take(717604, fade_out=0.4), take(175356, 0, 3.0, fade_out=0.5)]),
    'purr':    dict(rate=0.03,  takes=[take(213144, 0, 2.8, fade_out=0.6), take(583379)]),
    'snore':   dict(rate=0.04,  takes=[take(108519, 0.5, 2.4, fade_out=0.25), take(108519, 2.8, 4.3, fade_out=0.25), take(774670, **S(gate=-20, n=2, mn=0.8, mx=2.5, gap=0.4))]),
    # ---- foley ----
    'door':    dict(rate=0.04,  takes=[take(431117), take(216878, 0, 2.0, fade_out=0.3), take(188606)]),
    'doorClose': dict(rate=0.04, takes=[take(411789), take(117415), take(444409)]),
    'honk':    dict(rate=0.06,  takes=[take(27882), take(27881)]),
    'squeakToy': dict(rate=0.05, takes=[take(685067), take(232017), take(240015, **S(n=1, mn=0.3, mx=1.2))]),
    'bee':     dict(rate=0.05,  takes=[take(103046, target=T - 2), take(481647, 0, 2.0, fade_out=0.4, target=T - 2)]),
    'bubble':  dict(rate=0.08,  takes=[take(235264, target=T - 1), take(104948, target=T - 1), take(104943, target=T - 1), take(269583, target=T - 1)]),
    'firework': dict(rate=0.04, takes=[take(336008, target=T - 2), take(347163, target=T - 2), take(422079, target=T - 2)]),
    'cheer':   dict(rate=0.03,  takes=[take(321572, 0, 3.0, fade_out=0.5, target=T - 3), take(252808, target=T - 3), take(243406, 0, 3.0, fade_out=0.5, target=T - 3)]),
    'splash':  dict(rate=0.06,  takes=[take(212143), take(469608), take(398032, 0.0, 0.7)]),
    'whoosh':  dict(rate=0.06,  takes=[take(352719), take(60013), take(216675)]),
    'giggle':  dict(rate=0.03,  takes=[take(367493, target=T - 2), take(616088, 0, 2.2, fade_out=0.4, target=T - 2)]),
    'mouse':   dict(rate=0.06,  takes=[take(288941, 0.0, 0.75, fade_out=0.08), take(288941, 0.7, 1.45), take(445958), take(109831)]),
    'egg':     dict(rate=0.06,  takes=[take(174718, target=T + 1), take(30341, target=T + 1)]),
    # ---- interface ----
    'pop':     dict(rate=0.06,  takes=[take(669918, target=T - 1), take(540568, target=T - 1), take(708605, target=T - 1)]),
    'ding':    dict(rate=0.02,  takes=[take(91926, 0, 1.6, fade_out=0.5, target=T - 1)]),
    'sparkle': dict(rate=0.02,  takes=[take(511485, target=T - 2), take(66136, target=T - 2), take(562292, target=T - 2)]),
    'success': dict(rate=0.015, takes=[take(171671, target=T - 1), take(337049, target=T - 1)]),
    'oops':    dict(rate=0.02,  takes=[take(366103, target=T - 2)]),
    'listen':  dict(rate=0.0,   takes=[take(80921, 0, 2.0, fade_out=0.4, target=T - 1), take(186719, target=T - 1)]),
    'count':   dict(rate=0.0,   takes=[take(193210, 0, 1.4, fade_out=0.5), take(193209, 0, 1.4, fade_out=0.5)]),
}
# Continuous beds: stereo, looped seamlessly by the game. Level = overall RMS;
# gain = what the game plays it at (loudest second ~8 dB under the music).
BEDS = {
    'day':    dict(file=F(385280), start=5.0, end=95.0, xfade=2.0, hp=150, target=-37, gain=0.45),
    'night':  dict(file=F(393389), start=2.0, end=62.0, xfade=2.0, hp=250, target=-40, gain=1.0),
    'engine': dict(file=F(518294), start=10.0, end=20.0, xfade=1.0, hp=40, lp=6000, target=-30, gain=1),
}

# ---------------- DSP helpers (numpy only) ----------------
def decode(path):
    """Any file -> float32 array (frames, channels) at 44.1 kHz."""
    ext = os.path.splitext(path)[1].lower()
    x = None
    if ext in ('.caf', '.mp3', '.m4a', '.aif', '.aiff'):
        tmp = tempfile.NamedTemporaryFile(suffix='.wav', delete=False).name
        r = subprocess.run(['afconvert', '-f', 'WAVE', '-d', 'LEI16@44100', path, tmp], capture_output=True)
        if r.returncode == 0: x, sr = sf.read(tmp, dtype='float32', always_2d=True)
        os.unlink(tmp)
    if x is None:
        try: x, sr = sf.read(path, dtype='float32', always_2d=True)
        except Exception:
            if ext not in ('.ogg', '.oga'): raise
            x, sr = sf.read(strip_ogg_skeleton(path), dtype='float32', always_2d=True)
    if sr != SR: x = resample(x, SR / sr)
    return x

def strip_ogg_skeleton(path):
    """Some Commons uploads carry an Ogg Skeleton metadata stream libsndfile rejects; keep only the audio stream."""
    data = open(path, 'rb').read(); pos = 0; pages = []
    while pos < len(data):
        if data[pos:pos + 4] != b'OggS': break
        nseg = data[pos + 26]; segs = data[pos + 27: pos + 27 + nseg]; body = sum(segs); size = 27 + nseg + body
        serial = int.from_bytes(data[pos + 14: pos + 18], 'little')
        pages.append((serial, data[pos: pos + size], data[pos + 27 + nseg: pos + 27 + nseg + 8])); pos += size
    skel = {ser for ser, _, head in pages if head.startswith(b'fishead') or head.startswith(b'fisbone')}
    out = tempfile.NamedTemporaryFile(suffix='.ogg', delete=False).name
    open(out, 'wb').write(b''.join(pg for ser, pg, _ in pages if ser not in skel)); return out

def resample(x, factor):
    """Band-limited resampling in the frequency domain (as scipy.signal.resample does):
    the spectrum is truncated or zero-padded, so nothing aliases and nothing dulls."""
    n0 = x.shape[0]; n1 = int(round(n0 * factor)); X = np.fft.rfft(x, axis=0)
    k1 = n1 // 2 + 1; Y = np.zeros((k1, x.shape[1]), dtype=complex); k = min(k1, X.shape[0]); Y[:k] = X[:k]
    return (np.fft.irfft(Y, n=n1, axis=0) * (n1 / n0)).astype('float32')

def expand(x, thresh_db=-42, ratio=2.0, win=0.03):
    """Downward expander: below the threshold (relative to the clip's peak) the level is
    pushed down progressively, so room hiss between calls sinks away without being chopped."""
    env = envelope(mono(x), win); pk = env.max() or 1e-9
    lvl = 20 * np.log10(np.maximum(env / pk, 1e-6)); under = np.minimum(0, lvl - thresh_db)
    g = 10 ** (under * (ratio - 1) / 20)
    W = max(1, int(SR * win)); g = np.convolve(g, np.ones(W) / W, 'same')   # smooth the gain so it never pumps
    return (x * g[:, None]).astype('float32')

def fft_filter(x, hp=None, lp=None):
    """Zero-phase 2nd-order (12 dB/oct) high / low pass."""
    n = x.shape[0]; X = np.fft.rfft(x, axis=0); f = np.fft.rfftfreq(n, 1 / SR); H = np.ones_like(f)
    if hp: H *= 1 / np.sqrt(1 + (hp / np.maximum(f, 1e-6)) ** 4)
    if lp: H *= 1 / np.sqrt(1 + (f / lp) ** 4)
    return np.fft.irfft(X * H[:, None], n=n, axis=0).astype('float32')

def mono(x): return x.mean(1)

def envelope(m, win=0.01):
    W = max(1, int(SR * win)); c = np.cumsum(np.concatenate([[0.0], m.astype('float64') ** 2]))
    e = np.sqrt(np.maximum(0, (c[W:] - c[:-W]) / W)); return np.concatenate([e, np.full(len(m) - len(e), e[-1] if len(e) else 0)])

def max_rms(m, win=0.3):
    """Loudest 300 ms window. A clip shorter than the window is judged over the whole
    window anyway (silence included), the way the ear integrates a short grunt."""
    W = max(1, int(SR * win)); c = np.cumsum(np.concatenate([[0.0], m.astype('float64') ** 2]))
    return float(np.sqrt(np.max((c[W:] - c[:-W]) / W))) if len(m) > W else float(np.sqrt(np.sum(m.astype('float64') ** 2) / W))

def db(v): return 20 * np.log10(max(v, 1e-9))

def regions(m, gate_db, gap=0.2, min_len=0.3, max_len=99):
    """Separate calls inside a recording: where the envelope exceeds the gate (relative to the peak)."""
    env = envelope(m); on = env > env.max() * 10 ** (gate_db / 20)
    idx = np.flatnonzero(np.diff(np.concatenate([[0], on.astype(int), [0]])))
    segs = [[int(idx[i]), int(idx[i + 1])] for i in range(0, len(idx), 2)]
    merged = []
    for s in segs:
        if merged and s[0] - merged[-1][1] < SR * gap: merged[-1][1] = s[1]
        else: merged.append(s)
    return [(s, e) for s, e in merged if SR * min_len <= e - s <= SR * max_len]

def trim(x, thresh_db=-45, pre=0.012, post=0.08):
    env = envelope(mono(x)); on = np.flatnonzero(env > env.max() * 10 ** (thresh_db / 20))
    if not len(on): return x
    return x[max(0, on[0] - int(SR * pre)): min(len(x), on[-1] + int(SR * post))]

def fade(x, fin=0.005, fout=0.04):
    x = x.copy(); a, b = min(len(x) // 2, int(SR * fin)), min(len(x) // 2, int(SR * fout))
    if a: x[:a] *= (0.5 - 0.5 * np.cos(np.linspace(0, np.pi, a)))[:, None]
    if b: x[-b:] *= (0.5 + 0.5 * np.cos(np.linspace(0, np.pi, b)))[:, None]
    return x

def level(x, target_db, peak_db=-2, steady=False):
    m = mono(x); ref = float(np.sqrt(np.mean(m ** 2))) if steady else max_rms(m)
    g = 10 ** (target_db / 20) / max(ref, 1e-9)
    pk = float(np.abs(x).max()) * g
    if pk > 10 ** (peak_db / 20): g *= 10 ** (peak_db / 20) / pk
    return (x * g).astype('float32'), db(ref * g), db(float(np.abs(x).max()) * g)

def seamless(x, xf):
    """Fold the head into the tail (equal-power) so the clip loops without a seam."""
    n = int(SR * xf); body = x[n:].copy(); w = np.linspace(0, 1, n)[:, None]
    body[-n:] = body[-n:] * np.cos(w * np.pi / 2) + x[:n] * np.sin(w * np.pi / 2)
    return body

def encode(x, name, stereo=False, kbps=96):
    """16-bit wav -> AAC via afconvert; the file name carries a hash of the content."""
    y = x if stereo else mono(x)[:, None]
    tmp = tempfile.NamedTemporaryFile(suffix='.wav', delete=False).name
    sf.write(tmp, np.clip(y, -1, 1), SR, subtype='PCM_16')
    h = hashlib.sha1(open(tmp, 'rb').read()).hexdigest()[:8]
    fname = f'{name}-{h}.m4a'; out = os.path.join(OUT, fname)
    if not os.path.exists(out):
        subprocess.run(['afconvert', '-f', 'm4af', '-d', 'aac', '-b', str(kbps * 1000), tmp, out], check=True, capture_output=True)
    os.unlink(tmp); return fname

# ---------------- the build ----------------
def build_take(x, o):
    seg = fft_filter(x, o.get('hp', 80), o.get('lp'))
    if o.get('expand', True): seg = expand(seg, o.get('expand_db', -42))
    if 'pitch' in o: seg = resample(seg, 1 / o['pitch'])
    seg = trim(seg, o.get('trim', -45))
    seg = fade(seg, o.get('fade_in', 0.005), o.get('fade_out', 0.05))
    return level(seg, o.get('target', T), o.get('peak', -2))

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--scan', nargs='+', metavar='ARG'); args = ap.parse_args()
    if args.scan:
        path, gate = args.scan[0], float(args.scan[1]) if len(args.scan) > 1 else -20
        m = mono(decode(path))
        for s, e in regions(m, gate, min_len=0.05):
            seg = m[s:e]; print(f'  {s / SR:7.2f}-{e / SR:7.2f} ({(e - s) / SR:.2f}s)  rms {db(max_rms(seg)):6.1f}  pk {db(float(np.abs(seg).max())):6.1f}')
        return
    os.makedirs(OUT, exist_ok=True)
    manifest = {'version': VERSION, 'sounds': {}, 'beds': {}}; keep = set(); used_commons = set(); cache = {}
    def load(p):
        if p not in cache: cache[p] = decode(p)
        return cache[p]
    for name, spec in SOUNDS.items():
        takes = []
        for (path, start, end, o) in spec['takes']:
            if not os.path.exists(path):
                print(f'  {name:10s} skip (no file): {os.path.basename(path)}'); continue
            if path.startswith(FS): used_commons.add(int(os.path.basename(path).split('.')[0]))
            x = load(path); seg = x[int(start * SR): int(end * SR) if end else None]
            pieces = [seg]
            if 'split' in o:
                s = o['split']; m = mono(fft_filter(seg, o.get('hp', 80), o.get('lp')))
                found = regions(m, s['gate'], s.get('gap', 0.22), s['min'], s['max'])
                found.sort(key=lambda r: -max_rms(m[r[0]:r[1]]))
                pieces = [seg[max(0, a - int(SR * 0.03)): b + int(SR * 0.1)] for a, b in found[: s['n']]]
                if not pieces: print(f'  {name:10s} WARNING: no takes found in {os.path.basename(path)}')
            for p in pieces:
                y, l, pk = build_take(p, o)
                f = encode(y, name); keep.add(f)
                takes.append({'f': f, 'd': round(len(y) / SR, 3)})
                print(f'  {name:10s} {f:28s} {len(y) / SR:5.2f}s  level {l:6.1f}  peak {pk:6.1f}   <- {os.path.basename(path)}')
        if takes:
            manifest['sounds'][name] = {'takes': takes, 'rate': spec.get('rate', 0.04)}
            if spec.get('layer'): manifest['sounds'][name]['layer'] = True
    for name, b in BEDS.items():
        if not os.path.exists(b['file']): print(f'  bed {name}: skip (no file)'); continue
        x = load(b['file'])[int(b['start'] * SR): int(b['end'] * SR)]
        x = fft_filter(x, b.get('hp'), b.get('lp')); x = seamless(x, b['xfade'])
        y, l, pk = level(x, b['target'], -6, steady=True)
        f = encode(y, 'amb-' + name, stereo=True, kbps=128); keep.add(f)
        manifest['beds'][name] = {'f': f, 'd': round(len(y) / SR, 3), 'gain': b.get('gain', 1)}
        print(f'  bed {name:7s} {f:28s} {len(y) / SR:5.1f}s  level {l:6.1f}  peak {pk:6.1f}')
    for f in os.listdir(OUT):
        if f.endswith('.m4a') and f not in keep: os.unlink(os.path.join(OUT, f))
    json.dump(manifest, open(os.path.join(OUT, 'manifest.json'), 'w'), indent=1)
    total = sum(os.path.getsize(os.path.join(OUT, f)) for f in keep)
    print(f'\n{len(manifest["sounds"])} sounds, {sum(len(s["takes"]) for s in manifest["sounds"].values())} takes, {len(manifest["beds"])} beds, {total / 1024:.0f} KB -> sfx/')
    write_credits(used_commons)

def write_credits(used):
    lines = ['# Credits', '', '## Sound effects', '',
             'Every sound effect in `sfx/` is cut from a recording on [Freesound](https://freesound.org), used under the',
             'licence shown (CC0 = public domain dedication; CC BY 4.0 = attribution, given here). The edited clips keep',
             'the same licence as their source.', '']
    for fsid in sorted(used):
        r = FS_META.get(fsid)
        if r: lines.append(f'- "{r["name"]}" by {r["user"]} — {r["license"]} — {r["url"]}')
        else: lines.append(f'- Freesound sound #{fsid} — https://freesound.org/s/{fsid}/')
    lines += ['', '## Music', '', '"High Meadow Skip" and "Crickets in the Tall Grass" are original tracks made for this game.', '',
              '## Narrator', '', 'Voiced with Kokoro (open-source neural TTS, Apache 2.0), voice af_heart.', '',
              '## Font', '', 'Fredoka by Milena Brandão, SIL Open Font License 1.1.', '']
    open(os.path.join(ROOT, 'CREDITS.md'), 'w').write('\n'.join(lines))

if __name__ == '__main__': main()
