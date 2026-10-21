# Free neural narrator — Kokoro

The game's narrator is pre-recorded (see `../make-voice.py`). This folder holds the
free, offline, open-source neural voice that records it: **Kokoro** (Apache-2.0),
running on the Mac's own CPU via ONNX. No account, no key, no limit — re-render as
often as you like.

## One-time setup (≈2 minutes, ≈350 MB)

```bash
cd tools/tts
uv venv --python 3.12 .venv            # or: python3.12 -m venv .venv
uv pip install --python .venv/bin/python kokoro-onnx soundfile
mkdir -p models && cd models
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
```

(`uv` comes from <https://docs.astral.sh/uv/>; Homebrew's `python@3.12` works too.
The venv and models are git-ignored — they are tooling, not source.)

## Render the narrator

From the repo root:

```bash
python3 tools/make-voice.py --engine kokoro --voice af_heart
```

That renders all 506 lines (~6 minutes), AAC-encodes them into `voice/`, and writes
`voice/manifest.json` marked `neural`, which the game prefers on every platform. Only
missing lines are rendered, so after changing one line it takes seconds. Switching
voice re-renders everything and clears the old clips.

Voices worth trying for a children's narrator (`--voice`):

| voice | character |
| --- | --- |
| `af_heart` | warm, natural American — the default |
| `af_bella` | brighter, friendlier American |
| `af_sarah`, `af_nicole` | softer American |
| `bf_emma` | gentle British |
| `bf_isabella` | clear British |

`--speed 0.95` (default) is a touch unhurried for small children; `1.0` is natural pace.

## The other free route: Apple's Premium voices

macOS ships neural-quality voices too; they just need downloading once:
**System Settings → Accessibility → Spoken Content → System Voice → Manage Voices…**,
then download e.g. *Ava (Premium)*, *Zoe (Premium)* or *Samantha (Enhanced)*. After that:

```bash
python3 tools/make-voice.py --engine say --voice "Ava (Premium)"
```

(The tool marks a *(Premium)* / *(Enhanced)* voice as `neural` automatically.)
