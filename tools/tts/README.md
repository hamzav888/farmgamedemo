# Free neural narrator — Orpheus (shipped) and Kokoro

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


## The shipped voice: Orpheus "tara" (Apache 2.0)

Orpheus (Canopy Labs) is a 3-billion-parameter voice built on Llama: real phrasing, breaths and
emotion, a clear step up from Kokoro. It runs through Apple's MLX framework, in its own
environment so it cannot disturb the Kokoro one. One-time setup (≈2.5 GB, no account):

```bash
cd tools/tts
uv venv .venv-mlx --python 3.12
uv pip install --python .venv-mlx/bin/python mlx-audio soundfile
```

The 4-bit model (`mlx-community/orpheus-3b-0.1-ft-4bit`) and its audio decoder download on first
use. Render the narrator (about 14 s a line on an M-series Mac, two chunks of 25 at a time, so
count on an hour and a half for all 506; the run saves every chunk and resumes where it stopped
if interrupted):

```bash
python3 tools/make-voice.py --engine orpheus --voice tara
python3 tools/make-voice.py --engine orpheus --only "Hooray|Uh oh"   # re-do a few lines
```

Other voices: `leah`, `jess`, `mia`, `zoe` (female), `leo`, `dan`, `zac` (male).

`orpheus_batch.py` does three things on top of the raw model: it drops a few emotion tags in by
rule (`<chuckle>` on the big wins, `<gasp>` on "Uh oh", a `<yawn>` at bedtime — Orpheus voices
them; the subtitles keep the plain text), it trims each take to the speech and shortens any pause
over 0.45 s (`finishing.tidy`: the model likes to think for two seconds after "Hmm,", and it
leaves room tone about 35 dB under the voice in every pause, so "quiet" is judged against the
voiced level rather than against digital silence), and it re-renders a take whose speech length
is implausible for its word count, since an LLM voice occasionally drops or repeats words.
Every accepted generation is kept untouched in `tools/sfx-src/voice-raw/orpheus-<voice>/`
(git-ignored, ~200 MB for 506 lines): a change to the finishing chain is then a re-finish, not a
re-render — bump `RENDER_VERSION` in `make-voice.py` and rerun. Spelling fixes in `finishing.py`
(`TEXT_FIX`) apply to every engine; the phoneme fixes in `kokoro_batch.py` are Kokoro-only.

Chatterbox (Resemble AI, MIT) is set up the same way in `.venv-chatterbox` (`chatterbox_batch.py`)
and was auditioned alongside Orpheus; it is not wired into `make-voice.py`.
