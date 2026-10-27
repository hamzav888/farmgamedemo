#!/usr/bin/env python3
"""Render narration lines with Kokoro — free, offline, open-source neural TTS.

Run through the venv in this folder (python 3.12), by tools/make-voice.py:

    tools/tts/.venv/bin/python tools/tts/kokoro_batch.py jobs.json

jobs.json: {"voice": "af_heart", "speed": 0.95,
            "jobs": [{"text": "...", "wav": "/abs/path/out.wav"}, ...]}

The model (~310 MB) loads once per run, so all missing lines render in one go.
Every clip is then finished like a studio would finish dialogue: silence
trimmed so the voice answers a tap at once, levelled to one loudness so no
line jumps out, peaks kept clear of clipping, and faded at the edges.

Voices worth trying for a children's narrator:
    af_heart   warm, natural American (Kokoro's top-graded voice)   <- default
    af_bella   bright, friendly American
    bf_emma    gentle British
"""
import json, os, re, sys
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

HERE = os.path.dirname(os.path.abspath(__file__))

# ---- pronunciation ----
# Words the model reads wrongly, checked by phonemising them (see tools/tts/README.md).
# Spelling tweaks for the spoken text only; the game's subtitles keep the original.
TEXT_FIX = [
    (r'Meh-eh-eh', 'Meh meh meh'),        # was read "meh-ay-ay"; a goat bleat is three short "meh"s
    (r'\s*—\s*', ', '),                   # an em dash is a pause, not a word
]
# Words no spelling can fix: supply the sound directly as phonemes.
PHONEME_FIX = {
    'Shhh': 'ʃːːː',                       # every spelling of "shh" is read out as the letters "S-H-H-H"
    'Hmm': 'hmːː', 'hmm': 'hmːː',         # was read "hum"; a thinking hum keeps the mouth closed
    'Hooray': 'hʊɹˈeɪ', 'hooray': 'hʊɹˈeɪ',   # was "hoar-ay"
    'Bok': 'bˈɑk', 'bok': 'bˈɑk',         # a hen's "bok" is clipped, not "bawk"
    'Woof': 'wˈʊf', 'woof': 'wˈʊf',       # was "woof" with a long oo
    'Kitten': 'kˈɪtən', 'kitten': 'kˈɪtən',   # was "ki'n" with a glottal stop
    'Button': 'bˈʌtən', 'button': 'bˈʌtən',
}

def to_phonemes(tok, text, lang):
    for pat, rep in TEXT_FIX: text = re.sub(pat, rep, text)
    words = '|'.join(re.escape(w) for w in PHONEME_FIX)
    out = []
    for part in re.split(rf'\b({words})\b', text):
        if not part: continue
        out.append(PHONEME_FIX[part] if part in PHONEME_FIX else tok.phonemize(part, lang))
    return re.sub(r'\s+', ' ', ' '.join(p.strip() for p in out)).strip()

# ---- finishing ----
TARGET = 0.12      # RMS of the voiced parts, the same for every line
PEAK = 0.95

def finish(a, sr):
    a = a.astype(np.float32)
    # trim to the speech, keeping a short breath either side
    thr = np.abs(a).max() * 10 ** (-40 / 20)
    idx = np.flatnonzero(np.abs(a) > thr)
    if len(idx): a = a[max(0, idx[0] - int(0.02 * sr)): min(len(a), idx[-1] + int(0.10 * sr))]
    # loudness of the voiced 20 ms frames only, so pauses don't skew it
    fl = int(0.02 * sr); n = len(a) // fl
    if n:
        rms = np.sqrt((a[:n * fl].reshape(n, fl) ** 2).mean(1))
        voiced = rms[rms > rms.max() * 10 ** (-25 / 20)]
        level = np.sqrt((voiced ** 2).mean()) if len(voiced) else rms.mean()
        a *= TARGET / max(level, 1e-6)
    pk = np.abs(a).max()
    if pk > PEAK: a *= PEAK / pk                       # a rare punchy line gets a little quieter rather than clip
    f = min(int(0.008 * sr), len(a) // 4)
    if f: a[:f] *= np.linspace(0, 1, f); a[-f:] *= np.linspace(1, 0, f)
    return a

def main():
    spec = json.load(open(sys.argv[1]))
    voice, speed = spec.get('voice', 'af_heart'), float(spec.get('speed', 0.95))
    lang = 'en-gb' if voice.startswith('b') else 'en-us'
    k = Kokoro(os.path.join(HERE, 'models', 'kokoro-v1.0.onnx'), os.path.join(HERE, 'models', 'voices-v1.0.bin'))
    tok = k.tokenizer
    jobs = spec['jobs']
    for i, j in enumerate(jobs):
        samples, sr = k.create(to_phonemes(tok, j['text'], lang), voice=voice, speed=speed, lang=lang, is_phonemes=True)
        sf.write(j['wav'], finish(samples, sr), sr)
        if (i + 1) % 25 == 0: print(f'  {i + 1}/{len(jobs)}', flush=True)
    print(f'rendered {len(jobs)} with kokoro/{voice} @ {speed}', flush=True)

if __name__ == '__main__': main()
