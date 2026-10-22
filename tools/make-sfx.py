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
SRC = os.path.join(ROOT, 'tools', 'sfx-src')          # Commons downloads
APPLE = '/Applications/iMovie.app/Contents/Resources'
ILIFE = APPLE + '/iLife Sound Effects'
IMOVIE = APPLE + '/iMovie Sound Effects'
SR = 44100
VERSION = 1

def A(sub): return os.path.join(ILIFE, sub)
def M(name): return os.path.join(IMOVIE, name)
def C(name): return os.path.join(SRC, name)

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
# a fifth up), fade_in / fade_out (s), target (dBFS, max 300 ms RMS), and
# split=dict(gate=dB, n=..) to carve a region into its separate calls, loudest first.
T = -24      # the common loudness for one-shots (max 300 ms RMS, dBFS)
SOUNDS = {
    # ---- animals (Apple) ----
    'cow':      dict(rate=0.025, takes=[(A('Animals/Cow Moo.caf'), 0.08, 2.75, dict(fade_out=0.4))]),
    'sheep':    dict(rate=0.04,  takes=[(A('Animals/Sheep Bah.caf'), 0.17, 1.05, {}),
                                        (A('Animals/Sheep Bah.caf'), 5.36, 6.5, {}), (A('Animals/Sheep Bah.caf'), 7.39, 8.2, {}),
                                        (C('Sheep bleating.ogg'), 0, None, dict(split=dict(gate=-14, n=1, min=0.4, max=1.5)))]),
    'rooster':  dict(rate=0.03,  takes=[(A('Animals/Rooster Call.caf'), 0.0, 1.95, {})]),
    'dog':      dict(rate=0.05,  takes=[(A('Animals/Bark.caf'), 0.75, 1.65, {}), (A('Animals/Bark.caf'), 0.11, 0.51, {}), (A('Animals/Bark.caf'), 1.82, 2.18, {})]),
    'chicken':  dict(rate=0.04,  takes=[(M('Chicken.mp3'), 6.15, 7.23, {}), (M('Chicken.mp3'), 18.16, 18.97, {}), (M('Chicken.mp3'), 19.53, 20.45, {}), (M('Chicken.mp3'), 16.74, 17.58, {})]),
    'duck':     dict(rate=0.05,  takes=[(M('Duck.mp3'), 0.69, 1.77, {}), (M('Duck.mp3'), 2.22, 3.36, {}), (M('Duck.mp3'), 5.49, 6.57, {}), (M('Duck.mp3'), 7.78, 8.92, {})]),
    'horse':    dict(rate=0.03,  takes=[(M('Horse Whinny.mp3'), 0.08, 1.9, {})]),
    'owl':      dict(rate=0.02,  takes=[(M('Owl.mp3'), 0.04, 1.85, {})]),
    'frog':     dict(rate=0.04,  takes=[(A('Animals/Frogs at Night.caf'), 0.54, 2.23, {}), (A('Animals/Frogs at Night.caf'), 9.23, 10.78, {})]),
    # ---- animals (Commons) ----
    'pig':      dict(rate=0.05,  takes=[(C('Pig grunt - Erdie.ogg'), 0, None, dict(split=dict(gate=-16, n=2, min=0.25, max=1.6))),
                                        (C('Mudchute pig 1.ogg'), 0, None, dict(lp=9000)), (C('Mudchute pig 2.ogg'), 0, None, dict(lp=9000)), (C('Mudchute pig 3.ogg'), 0, None, dict(lp=9000))]),
    'cat':      dict(rate=0.04,  takes=[(C('Meow of a Siamese cat - freemaster2.wav'), 0, None, dict(split=dict(gate=-16, n=2, min=0.3, max=1.6))),
                                        (C('Maullido de gata hembra joven.ogg'), 0, None, {})]),
    'kitten':   dict(rate=0.05, takes=[(C('Maullido de gata hembra joven.ogg'), 0, None, dict(pitch=1.28, target=T - 1)),
                                        (C('Meow of a Siamese cat - freemaster2.wav'), 0, None, dict(pitch=1.32, target=T - 1, split=dict(gate=-16, n=1, min=0.3, max=1.4)))]),
    'goat':     dict(rate=0.05,  takes=[(C('Herd of goats bleating.ogg'), 0, None, dict(split=dict(gate=-10, n=3, min=0.35, max=1.3)))]),
    'caw':      dict(rate=0.05,  takes=[(C('Carrion Crow (Corvus corone) (W1CDR0001425 BD18).ogg'), 0, None, dict(split=dict(gate=-12, n=2, min=0.3, max=1.6))),
                                        (C('Corvus corone - Carrion Crow XC511130.mp3'), 0, None, dict(split=dict(gate=-12, n=2, min=0.3, max=1.6)))]),
    # ---- foley / UI (Apple) ----
    'honk':     dict(rate=0.06,  takes=[(A('Stingers/Comedy Low Honk.caf'), 0.0, 0.52, {})]),
    'door':     dict(rate=0.04,  takes=[(A('Foley/Barn Door Open.caf'), 0.39, 2.7, dict(fade_out=0.3))]),
    'doorClose': dict(rate=0.04, takes=[(A('Foley/Barn Door Close.caf'), 0.05, 1.05, {})]),
    'splash':   dict(rate=0.06, layer=True, takes=[(A('People/Swimming.caf'), 21.40, 22.05, dict(fade_in=0.02, fade_out=0.15)),
                                                    (A('People/Swimming.caf'), 50.85, 51.55, dict(fade_in=0.02, fade_out=0.15)),
                                                    (A('People/Swimming.caf'), 25.75, 26.35, dict(fade_in=0.02, fade_out=0.15))]),
    'squeakToy': dict(rate=0.05, takes=[(A('Foley/Squeeze Toy.caf'), 0.01, 1.48, {})]),
    'cheer':    dict(rate=0.03,  takes=[(A('People/Kids Cheering.caf'), 0.07, 3.7, dict(fade_out=0.6, target=T - 3))]),
    'giggle':   dict(rate=0.03,  takes=[(A('People/Small Child Giggle.caf'), 5.89, 7.85, dict(fade_out=0.3, target=T - 2))]),
}
# Continuous beds: stereo, looped seamlessly by the game. Level = overall RMS.
BEDS = {
    # gain = what the game plays it at: the birdsong's loudest phrases then sit ~8 dB
    # under the music, the crickets ~9 dB under the night song
    'day':    dict(file=A('Ambience/Forest.caf'),   start=0.3, end=63.6, xfade=1.5, hp=150, target=-37, gain=0.45),
    'night':  dict(file=A('Animals/Crickets.caf'),  start=0.0, end=9.36, xfade=2.0, hp=250, target=-40, gain=0.63),
    'engine': dict(file=A('Transportation/Diesel Truck Start.caf'), start=6.0, end=14.0, xfade=0.8, hp=40, lp=4000, target=-30, gain=1),
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
    n = int(round(x.shape[0] * factor)); t = np.linspace(0, x.shape[0] - 1, n)
    return np.stack([np.interp(t, np.arange(x.shape[0]), x[:, c]) for c in range(x.shape[1])], 1).astype('float32')

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

def encode(x, name, stereo=False, kbps=64):
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
            if path.startswith(SRC): used_commons.add(os.path.basename(path))
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
        f = encode(y, 'amb-' + name, stereo=True, kbps=96); keep.add(f)
        manifest['beds'][name] = {'f': f, 'd': round(len(y) / SR, 3), 'gain': b.get('gain', 1)}
        print(f'  bed {name:7s} {f:28s} {len(y) / SR:5.1f}s  level {l:6.1f}  peak {pk:6.1f}')
    for f in os.listdir(OUT):
        if f.endswith('.m4a') and f not in keep: os.unlink(os.path.join(OUT, f))
    json.dump(manifest, open(os.path.join(OUT, 'manifest.json'), 'w'), indent=1)
    total = sum(os.path.getsize(os.path.join(OUT, f)) for f in keep)
    print(f'\n{len(manifest["sounds"])} sounds, {sum(len(s["takes"]) for s in manifest["sounds"].values())} takes, {len(manifest["beds"])} beds, {total / 1024:.0f} KB -> sfx/')
    write_credits(used_commons)

def write_credits(used):
    lines = ['# Credits', '',
             '## Sound effects', '',
             'Animal calls, the barn door, the tractor horn, water, the cheering and the ambience beds are real recordings from',
             "Apple's iLife / iMovie sound-effect library (© Apple Inc.), used in this game under Apple's software licence.", '']
    if used:
        lines += ['The following recordings come from Wikimedia Commons. Each is used under the licence shown; the edited',
                  'clips in sfx/ made from them carry the same licence.', '']
        for n in sorted(used):
            who, lic = COMMONS.get(n, ('unknown', 'unknown'))
            lines.append(f'- "{n}" — {who}, {lic} — {commons_url(n)}')
        lines.append('')
    lines += ['## Music', '', '"High Meadow Skip" and "Crickets in the Tall Grass" are original tracks made for this game.', '',
              '## Narrator', '', 'Voiced with Kokoro (open-source neural TTS, Apache 2.0), voice af_heart.', '',
              '## Font', '', 'Fredoka by Milena Brandão, SIL Open Font License 1.1.', '']
    open(os.path.join(ROOT, 'CREDITS.md'), 'w').write('\n'.join(lines))

if __name__ == '__main__': main()
