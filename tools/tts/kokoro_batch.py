#!/usr/bin/env python3
"""Render narration lines with Kokoro — free, offline, open-source neural TTS.

Run through the venv in this folder (python 3.12), by tools/make-voice.py:

    tools/tts/.venv/bin/python tools/tts/kokoro_batch.py jobs.json

jobs.json: {"voice": "af_heart", "speed": 0.95,
            "jobs": [{"text": "...", "wav": "/abs/path/out.wav"}, ...]}

The model (~310 MB) loads once per run, so all missing lines render in one go.
Voices worth trying for a children's narrator:
    af_heart   warm, natural American (Kokoro's showcase voice)   <- default
    af_bella   bright, friendly American
    bf_emma    gentle British
    af_sarah / af_nicole / bf_isabella   also good
"""
import json, os, sys
import soundfile as sf
from kokoro_onnx import Kokoro

HERE = os.path.dirname(os.path.abspath(__file__))

def main():
    spec = json.load(open(sys.argv[1]))
    voice, speed = spec.get('voice', 'af_heart'), float(spec.get('speed', 0.95))
    lang = 'en-gb' if voice.startswith('b') else 'en-us'
    k = Kokoro(os.path.join(HERE, 'models', 'kokoro-v1.0.onnx'), os.path.join(HERE, 'models', 'voices-v1.0.bin'))
    jobs = spec['jobs']
    for i, j in enumerate(jobs):
        samples, sr = k.create(j['text'], voice=voice, speed=speed, lang=lang)
        sf.write(j['wav'], samples, sr)
        if (i + 1) % 25 == 0: print(f'  {i + 1}/{len(jobs)}', flush=True)
    print(f'rendered {len(jobs)} with kokoro/{voice} @ {speed}', flush=True)

if __name__ == '__main__': main()
