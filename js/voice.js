/* ---------- Narrator: a friendly voice using the Web Speech API ---------- */
const Voice = {
  voice: null, ready: false, enabled: true, _sub: null, _subTimer: null, _lastText: '',

  init() {
    if (!('speechSynthesis' in window)) { this.ready = false; return; }
    const pickVoice = () => {
      const voices = speechSynthesis.getVoices();
      if (!voices.length) return;
      const en = voices.filter(v => /^en/i.test(v.lang));
      const prefs = [/Aria/i, /Jenny/i, /Zira/i, /Samantha/i, /Google US English/i, /Google UK English Female/i, /Karen/i, /Moira/i, /Tessa/i, /Female/i, /Victoria/i, /Fiona/i, /Susan/i, /Hazel/i, /Libby/i, /Sonia/i];
      let v = null;
      for (const p of prefs) { v = en.find(x => p.test(x.name)); if (v) break; }
      if (!v) v = en.find(x => !/male|David|Mark|George|Daniel/i.test(x.name)) || en[0] || voices[0];
      this.voice = v; this.ready = true;
    };
    pickVoice();
    speechSynthesis.onvoiceschanged = pickVoice;
    this._sub = document.getElementById('subtitle');
  },
  cancel() { if ('speechSynthesis' in window) speechSynthesis.cancel(); this._hideSub(); },
  say(text, opts = {}) {
    const { rate = 0.92, pitch = 1.12, interrupt = true, onend = null, subtitle = true } = opts;
    let done = false;
    const finish = () => { if (done) return; done = true; if (onend) onend(); };
    if (subtitle) this._showSub(text);
    if (!('speechSynthesis' in window) || !this.enabled) { setTimeout(finish, Math.min(2500, 250 + text.length * 45)); return; }
    if (interrupt) speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (this.voice) u.voice = this.voice;
    u.rate = rate; u.pitch = pitch; u.volume = 1;
    u.onend = finish; u.onerror = finish;
    try { speechSynthesis.speak(u); } catch (e) { finish(); }
    // safety net in case onend never fires
    setTimeout(finish, 1200 + text.length * 90);
  },
  _showSub(text) {
    if (!this._sub) return;
    this._sub.textContent = text; this._sub.classList.remove('hidden');
    clearTimeout(this._subTimer);
    this._subTimer = setTimeout(() => this._hideSub(), 1200 + text.length * 80);
  },
  _hideSub() { if (this._sub) this._sub.classList.add('hidden'); }
};
