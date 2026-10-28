#!/usr/bin/env python3
"""Render narrator lines with Orpheus (Canopy Labs, Apache 2.0) through mlx-audio — tools/tts/.venv-mlx.

Spec JSON: {"jobs": [{"text": ..., "wav": ..., "raw": ...}], "voice": "tara", "model": "mlx-community/orpheus-3b-0.1-ft-4bit",
            "temperature": 0.6, "top_p": 0.8, "repetition_penalty": 1.3}
Same finishing (trim, level, fades) as the Kokoro renders, so the clips sit identically in the mix.
"raw" (optional) is where the untouched generation is kept; when it already exists it is used
instead of generating again, so a change to the finishing chain is a re-finish, not a two-hour re-render.
"""
import sys, os, json, re, inspect, time
import numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from finishing import finish, tidy, TEXT_FIX

# Orpheus voices emotion tags inline. A few, placed by rule, so the subtitles stay plain text:
# a chuckle on the big wins, a gasp when something goes wrong, a yawn at bedtime.
EMOTE = [
    (r'^(Hooray!|You did it!|What a concert!|All clean!|Brilliant!|Perfect!|The garden is full! Hooray!)(\s+)(?=\S)', r'\1 <chuckle>\2'),
    (r'^(Uh oh|Oh no)', r'<gasp> \1'),
    (r'^Shhh\.\.\. all the animals are sleeping', '<yawn> Shhh... all the animals are sleeping'),
]
def emote(text):
    for pat, rep in EMOTE: text = re.sub(pat, rep, text)
    return text

def plausible(wav, sr, text):
    """An LLM voice occasionally drops half a line or rambles; judge the tidied take by seconds per word."""
    words = max(1, len(re.findall(r"[A-Za-z']+", re.sub(r'<[a-z]+>', '', text)))); d = len(wav) / sr   # a tag is not a word
    return 0.17 * words + 0.2 <= d <= 0.8 * words + 2.0

def main():
    spec = json.load(open(sys.argv[1]))
    import mlx.core as mx
    from mlx_audio.tts.utils import load_model
    model = load_model(model_path=spec.get('model', 'mlx-community/orpheus-3b-0.1-ft-4bit'))
    allowed = set(inspect.signature(model.generate).parameters)
    opts = {k: spec[k] for k in ('voice', 'temperature', 'top_p', 'repetition_penalty', 'max_tokens', 'speed') if k in spec and k in allowed}
    if 'verbose' in allowed: opts['verbose'] = False
    jobs = spec['jobs']; t0 = time.time()
    for i, j in enumerate(jobs):
        text = j['text']
        for pat, rep in TEXT_FIX: text = re.sub(pat, rep, text)
        text = emote(text)
        raw = j.get('raw'); cached = bool(raw and os.path.exists(raw))
        for attempt in range(3):
            if attempt == 0 and cached:
                wav, sr = sf.read(raw, dtype='float32')
            else:
                mx.random.seed(int(spec.get('seed', 7)) + attempt * 1000 + i)
                chunks, sr = [], 24000
                for r in model.generate(text=text, **opts):
                    if r.audio.size: chunks.append(np.array(r.audio, dtype='float32')); sr = r.sample_rate
                wav = np.concatenate(chunks) if chunks else np.zeros(sr // 10, 'float32')
            take = tidy(wav, sr)
            if plausible(take, sr, text): break
            print(f'  retry {attempt + 1}: {len(take) / sr:.1f}s for "{text[:50]}"', flush=True)
        if raw and not (cached and attempt == 0):
            os.makedirs(os.path.dirname(raw), exist_ok=True); sf.write(raw, wav, sr, subtype='FLOAT')
        sf.write(j['wav'], finish(take, sr), sr)
        if (i + 1) % 10 == 0: print(f'  {i + 1}/{len(jobs)}  ({(time.time() - t0) / (i + 1):.1f} s/line)', flush=True)
    print(f'rendered {len(jobs)} with orpheus/{opts.get("voice", "?")} in {time.time() - t0:.0f} s', flush=True)

if __name__ == '__main__': main()
