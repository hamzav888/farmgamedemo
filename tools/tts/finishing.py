"""Shared by every voice engine: the spelling fixes for the spoken text and the finishing
chain (trim, level to the narrator's loudness, fades), so clips from any engine sit identically
in the game's mix. The engines live in kokoro_batch.py, chatterbox_batch.py, orpheus_batch.py."""
import re
import numpy as np

TEXT_FIX = [
    (r'Meh-eh-eh', 'Meh meh meh'),        # was read "meh-ay-ay"; a goat bleat is three short "meh"s
    (r'\s*—\s*', ', '),                   # an em dash is a pause, not a word
]

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



def tidy(a, sr, max_pause=0.45, rel_db=-24, lead=0.08, tail=0.12, win=0.02):
    """Trim to the speech and cap every pause at max_pause. An LLM voice likes to think for
    two seconds after "Hmm,"; a two-year-old does not like to wait. Orpheus also leaves room
    tone ~35 dB under the voice in its pauses, so "quiet" is judged against the voiced level
    (rel_db below it), not against digital silence: a -40 dB gate kept all of that dead air."""
    W = int(sr * win); n = len(a) // W
    if n < 3: return a
    rms = np.sqrt((a[:n * W].reshape(n, W) ** 2).mean(1))
    voiced = rms[rms > rms.max() * 10 ** (-25 / 20)]
    level = np.sqrt((voiced ** 2).mean()) if len(voiced) else rms.max()
    loud = rms > level * 10 ** (rel_db / 20)
    idx = np.flatnonzero(loud)
    if not len(idx): return a
    lo = max(0, idx[0] - int(round(lead / win))); hi = min(n, idx[-1] + 1 + int(round(tail / win)))
    keep = np.zeros(n, bool); keep[lo:hi] = True
    run = 0; limit = int(round(max_pause / win))
    for i in range(lo, hi):
        run = 0 if loud[i] else run + 1
        if run > limit: keep[i] = False          # drop the frames past the allowed pause
    return a[:n * W].reshape(n, W)[keep].ravel().astype(np.float32)
