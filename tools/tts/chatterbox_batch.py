#!/usr/bin/env python3
"""Render narrator lines with Chatterbox (Resemble AI, MIT) — tools/tts/.venv-chatterbox.

Spec JSON: {"jobs": [{"text": ..., "wav": ...}], "exaggeration": 0.5, "cfg_weight": 0.5,
            "seed": 1234, "audio_prompt": optional path to a reference clip}
Same finishing (trim, level, fades) as the Kokoro renders, so the clips sit identically in the mix.
"""
import sys, os, json, functools
import numpy as np, soundfile as sf, torch
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from finishing import finish, TEXT_FIX
import re

def main():
    spec = json.load(open(sys.argv[1]))
    seed = int(spec.get('seed', 1234)); torch.manual_seed(seed); np.random.seed(seed)
    device = 'mps' if torch.backends.mps.is_available() else 'cpu'
    torch.load = functools.partial(torch.load, map_location=torch.device(device))   # the checkpoints were saved on CUDA
    import perth
    if getattr(perth, 'PerthImplicitWatermarker', None) is None:   # its implicit watermarker needs extras this build lacks
        perth.PerthImplicitWatermarker = perth.DummyWatermarker
    from chatterbox.tts import ChatterboxTTS
    model = ChatterboxTTS.from_pretrained(device=device)
    kw = dict(exaggeration=float(spec.get('exaggeration', 0.5)), cfg_weight=float(spec.get('cfg_weight', 0.5)))
    if spec.get('audio_prompt'): kw['audio_prompt_path'] = spec['audio_prompt']
    jobs = spec['jobs']
    for i, j in enumerate(jobs):
        text = j['text']
        for pat, rep in TEXT_FIX: text = re.sub(pat, rep, text)
        torch.manual_seed(seed)            # the same seed every line: one consistent speaker
        wav = model.generate(text, **kw).squeeze(0).cpu().numpy()
        sf.write(j['wav'], finish(wav, model.sr), model.sr)
        if (i + 1) % 10 == 0: print(f'  {i + 1}/{len(jobs)}', flush=True)
    print(f'rendered {len(jobs)} with chatterbox ({device}) exaggeration={kw["exaggeration"]} cfg={kw["cfg_weight"]}', flush=True)

if __name__ == '__main__': main()
