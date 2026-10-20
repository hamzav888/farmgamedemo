/* ---------- Narrator ----------
   Two engines; the better one available wins.

   1. Pre-recorded clips: voice/manifest.json maps every line the game can say
      to a file in voice/. They play through the game's own Web Audio graph, so
      they sit in the mix and duck the music like a real game's dialogue.
      tools/make-voice.py renders them — from the Mac's own voice by default,
      or from a neural voice (OpenAI / ElevenLabs) when given an API key.
   2. The browser's speech synthesis, with its voices ranked by quality
      markers (Natural, Neural, Enhanced, Premium, Online), as the fallback.

   Policy: neural clips are always used. Standard-quality clips are used unless
   the browser can offer a natural/enhanced voice of its own, which would sound
   better — and if a line has no clip, synthesis fills in. */
const Voice = {
  voice: null, ready: false, enabled: true, _sub: null, _subTimer: null,
  clips: null, clipBase: '', _buffers: {}, _cur: null, _useClips: false, _id: 0,

  init(o = {}) {
    this.clipBase = o.base || '';
    this._sub = document.getElementById('subtitle');
    if ('speechSynthesis' in window) {
      const pick = () => {
        const vs = speechSynthesis.getVoices(); if (!vs.length) return;
        this.voice = this._rank(vs)[0] || null; this.ready = !!this.voice; this._decide();
      };
      pick(); speechSynthesis.onvoiceschanged = pick;
    }
    fetch(this.clipBase + 'voice/manifest.json', { cache: 'no-cache' })
      .then(r => r.ok ? r.json() : null)
      .then(mf => { if (mf && mf.lines) { this.clips = mf; this._decide(); } })
      .catch(() => { });
  },
  // the better a voice, the higher it sorts; anything novelty or deep goes last
  _score(v) {
    const n = v.name || '';
    let s = /^en/i.test(v.lang) ? 100 : 0;
    if (/natural|neural|enhanced|premium|online/i.test(n)) s += 50;
    if (/aria|jenny|samantha|karen|moira|google us english|google uk english female|libby|sonia|zira|victoria|fiona|susan|hazel|tessa|ava|allison|nicky/i.test(n)) s += 20;
    if (/female|woman/i.test(n)) s += 10;
    if (/david|mark|george|daniel|\bmale\b|\bman\b|rishi|aman|fred|ralph|albert|eddy|reed|rocko|grandpa|grandma|junior|jester|bells|boing|bubbles|cellos|organ|bad news|good news|wobble|whisper|trinoids|zarvox|kathy|flo|sandy|shelley|superstar/i.test(n)) s -= 60;
    return s;
  },
  _rank(vs) { return vs.slice().sort((a, b) => this._score(b) - this._score(a)); },
  _decide() {
    if (!this.clips) { this._useClips = false; return; }
    const browserGood = !!(this.voice && /natural|neural|enhanced|premium|online/i.test(this.voice.name));
    this._useClips = this.clips.quality === 'neural' || !browserGood;
  },
  usingClips() { return this._useClips && !!this.clips; },

  cancel() {
    this._id++;
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    if (this._cur) { try { this._cur.stop(); } catch (e) { } this._cur = null; }
    this._hideSub();
  },
  say(text, opts = {}) {
    const { rate = 0.95, pitch = 1.08, interrupt = true, onend = null, subtitle = true } = opts;
    const id = ++this._id;
    let done = false;
    const finish = () => { if (done) return; done = true; if (onend) onend(); };
    if (subtitle) this._showSub(text);
    if (!this.enabled) { setTimeout(finish, Math.min(2500, 250 + text.length * 45)); return; }
    if (interrupt) {
      if ('speechSynthesis' in window) speechSynthesis.cancel();
      if (this._cur) { try { this._cur.stop(); } catch (e) { } this._cur = null; }
    }
    const key = text.trim(), file = this._useClips && this.clips.lines[key];
    if (file && Sfx.ctx) { this._playClip(file, key, id, finish, rate, pitch); return; }
    this._speak(text, rate, pitch, finish);
  },
  _speak(text, rate, pitch, finish) {
    if (!('speechSynthesis' in window)) { setTimeout(finish, Math.min(2500, 250 + text.length * 45)); return; }
    const u = new SpeechSynthesisUtterance(text);
    if (this.voice) u.voice = this.voice;
    u.rate = rate; u.pitch = pitch; u.volume = 1;
    u.onend = finish; u.onerror = finish;
    try { speechSynthesis.speak(u); } catch (e) { finish(); }
    setTimeout(finish, 1200 + text.length * 90);   // safety net in case onend never fires
  },
  async _playClip(file, text, id, finish, rate, pitch) {
    try {
      const url = this.clipBase + 'voice/' + file;
      let buf = this._buffers[url];
      if (!buf) {
        const ab = await (await fetch(url)).arrayBuffer();
        buf = await Sfx.ctx.decodeAudioData(ab);
        this._buffers[url] = buf;
      }
      if (id !== this._id) return;              // something else was said while this loaded
      const src = Sfx.ctx.createBufferSource(); src.buffer = buf;
      src.connect(Sfx.voiceBus || Sfx.bus);
      src.onended = () => { if (this._cur === src) this._cur = null; finish(); };
      this._cur = src; src.start();
      setTimeout(finish, buf.duration * 1000 + 300);
    } catch (e) { this._speak(text, rate, pitch, finish); }
  },
  _showSub(text) {
    if (!this._sub) return;
    this._sub.textContent = text; this._sub.classList.remove('hidden');
    clearTimeout(this._subTimer);
    this._subTimer = setTimeout(() => this._hideSub(), 1200 + text.length * 80);
  },
  _hideSub() { if (this._sub) this._sub.classList.add('hidden'); }
};
