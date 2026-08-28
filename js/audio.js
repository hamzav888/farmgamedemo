/* ---------- Procedural sound engine (Web Audio, no external files) ---------- */
const Sfx = {
  ctx: null, master: null, sfx: null, amb: null, music: null, ambFilter: null,
  enabled: true, musicOn: true,
  _ambNodes: [], _ambMode: null, _ambTimers: {},
  _musicTimer: null, _musicNext: 0, _musicStep: 0, _musicMode: null,
  _lastSnore: 0,

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    const c = this.ctx;
    this.master = c.createGain(); this.master.gain.value = 0.9; this.master.connect(c.destination);
    this.sfx = c.createGain(); this.sfx.gain.value = 1; this.sfx.connect(this.master);
    this.ambFilter = c.createBiquadFilter(); this.ambFilter.type = 'lowpass'; this.ambFilter.frequency.value = 20000;
    this.amb = c.createGain(); this.amb.gain.value = 1; this.amb.connect(this.ambFilter); this.ambFilter.connect(this.master);
    this.music = c.createGain(); this.music.gain.value = 0.2; this.music.connect(this.master);
    // white noise buffer for reuse
    const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
  },
  now() { return this.ctx ? this.ctx.currentTime : 0; },
  setEnabled(on) { this.enabled = on; if (this.master) this.master.gain.setTargetAtTime(on ? 0.9 : 0, this.now(), 0.05); },
  setMusic(on) { this.musicOn = on; this._applyMusicGain(); },
  // quieten music + ambience while the narrator talks so kids can hear her clearly
  duck(on) {
    this._duck = on; this._applyMusicGain();
    if (this.amb) this.amb.gain.setTargetAtTime(on ? 0.45 : 1, this.now(), 0.2);
  },
  _applyMusicGain() { if (this.music) this.music.gain.setTargetAtTime(this.musicOn ? (this._duck ? 0.06 : 0.2) : 0, this.now(), 0.15); },
  setMuffled(m) { if (this.ambFilter) this.ambFilter.frequency.setTargetAtTime(m ? 700 : 20000, this.now(), 0.3); },

  /* ----- building blocks ----- */
  tone(o) {
    if (!this.ctx) return null;
    const c = this.ctx, t0 = c.currentTime + (o.when || 0);
    const osc = c.createOscillator(); osc.type = o.wave || 'sine';
    const dur = o.dur || 0.3, vol = (o.vol == null ? 0.3 : o.vol), at = o.at == null ? 0.02 : o.at, rel = o.rel == null ? Math.min(0.1, dur * 0.4) : o.rel;
    osc.frequency.setValueAtTime(o.f0 || 440, t0);
    if (o.curve) { // array of [timeFrac, freq]
      o.curve.forEach(([tf, f]) => osc.frequency.exponentialRampToValueAtTime(Math.max(20, f), t0 + dur * tf));
    } else if (o.f1) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + at);
    if (o.tremRate) { // amplitude modulation
      const lfo = c.createOscillator(); lfo.frequency.value = o.tremRate; lfo.type = o.tremWave || 'sine';
      const lg = c.createGain(); lg.gain.value = vol * (o.tremDepth || 0.5);
      lfo.connect(lg); lg.connect(g.gain); lfo.start(t0); lfo.stop(t0 + dur + 0.1);
    }
    g.gain.setValueAtTime(vol, Math.max(t0 + at, t0 + dur - rel));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    if (o.vibRate) {
      const v = c.createOscillator(); v.frequency.value = o.vibRate; const vg = c.createGain(); vg.gain.value = o.vibDepth || 10;
      v.connect(vg); vg.connect(osc.frequency); v.start(t0); v.stop(t0 + dur + 0.1);
    }
    let last = osc;
    if (o.lp || o.bp) {
      const f = c.createBiquadFilter(); f.type = o.bp ? 'bandpass' : 'lowpass';
      f.frequency.setValueAtTime(o.bp || o.lp, t0); f.Q.value = o.q || 1;
      if (o.fcurve) o.fcurve.forEach(([tf, fr]) => f.frequency.exponentialRampToValueAtTime(fr, t0 + dur * tf));
      last.connect(f); last = f;
    }
    last.connect(g); g.connect(o.bus || this.sfx);
    osc.start(t0); osc.stop(t0 + dur + 0.15);
    return osc;
  },
  noise(o) {
    if (!this.ctx) return null;
    const c = this.ctx, t0 = c.currentTime + (o.when || 0), dur = o.dur || 0.2, vol = o.vol == null ? 0.2 : o.vol;
    const src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const f = c.createBiquadFilter(); f.type = o.type || 'bandpass'; f.frequency.setValueAtTime(o.f || 1000, t0); f.Q.value = o.q || 1;
    if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t0 + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + (o.at == null ? 0.01 : o.at));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(o.bus || this.sfx);
    src.start(t0); src.stop(t0 + dur + 0.05);
  },

  /* ----- animal sounds ----- */
  play(name, vol = 1) { if (!this.ctx || !this.enabled) return; const fn = this['s_' + name]; if (fn) fn.call(this, vol); },
  s_cow(v) {
    this.tone({ wave: 'sawtooth', f0: 150, curve: [[0.25, 190], [0.6, 175], [1, 120]], dur: 1.15, vol: 0.45 * v, at: 0.12, rel: 0.35, lp: 500, q: 6, fcurve: [[0.3, 900], [0.7, 700], [1, 300]], vibRate: 5, vibDepth: 4 });
    this.tone({ wave: 'sine', f0: 150, curve: [[0.25, 190], [0.6, 175], [1, 120]], dur: 1.15, vol: 0.25 * v, at: 0.1, rel: 0.35 });
  },
  s_sheep(v) {
    this.tone({ wave: 'sawtooth', f0: 380, curve: [[0.3, 400], [1, 300]], dur: 0.85, vol: 0.28 * v, at: 0.05, rel: 0.2, lp: 1500, q: 3, tremRate: 9, tremDepth: 0.7, vibRate: 9, vibDepth: 15 });
  },
  s_goat(v) {
    this.tone({ wave: 'sawtooth', f0: 520, curve: [[0.2, 560], [1, 420]], dur: 0.6, vol: 0.25 * v, at: 0.03, rel: 0.15, lp: 2200, q: 3, tremRate: 13, tremDepth: 0.8, vibRate: 13, vibDepth: 25 });
  },
  s_pig(v) {
    for (let i = 0; i < 2; i++) {
      const w = i * 0.32;
      this.tone({ wave: 'sawtooth', f0: 220, curve: [[0.5, 380], [1, 200]], dur: 0.16, vol: 0.32 * v, when: w, lp: 900, q: 4 });
      this.noise({ f: 500, q: 1.5, dur: 0.14, vol: 0.18 * v, when: w + 0.05 });
      this.tone({ wave: 'square', f0: 110, f1: 70, dur: 0.14, vol: 0.14 * v, when: w + 0.1, lp: 400 });
    }
  },
  s_horse(v) {
    this.tone({ wave: 'sawtooth', f0: 1000, curve: [[0.15, 1200], [0.5, 800], [1, 420]], dur: 1.0, vol: 0.28 * v, at: 0.04, rel: 0.3, lp: 2600, q: 2, vibRate: 14, vibDepth: 60, tremRate: 14, tremDepth: 0.5 });
    this.tone({ wave: 'square', f0: 90, f1: 70, dur: 0.35, vol: 0.12 * v, when: 0.95, lp: 300, tremRate: 28, tremDepth: 0.9 });
  },
  s_chicken(v) {
    for (let i = 0; i < 3; i++) {
      const w = i * 0.17;
      this.tone({ wave: 'square', f0: 750, f1: 380, dur: 0.09, vol: 0.14 * v, when: w, lp: 1800, q: 2 });
      this.noise({ f: 1500, q: 2, dur: 0.06, vol: 0.06 * v, when: w });
    }
    this.tone({ wave: 'square', f0: 500, curve: [[0.4, 1000], [1, 600]], dur: 0.35, vol: 0.16 * v, when: 0.55, lp: 2500, q: 2, vibRate: 20, vibDepth: 40 });
  },
  s_rooster(v) {
    const seq = [[0, 700, 700, 0.18], [0.2, 850, 900, 0.16], [0.38, 1050, 1150, 0.22], [0.62, 1250, 550, 0.75]];
    seq.forEach(([w, f0, f1, d]) => this.tone({ wave: 'sawtooth', f0, f1, dur: d, vol: 0.22 * v, when: w, lp: 3000, q: 2, vibRate: 11, vibDepth: 30, at: 0.02, rel: d * 0.5 }));
  },
  s_duck(v) {
    for (let i = 0; i < 3; i++) {
      this.tone({ wave: 'square', f0: 330, f1: 240, dur: 0.16, vol: 0.2 * v, when: i * 0.22, bp: 1100, q: 4, tremRate: 40, tremDepth: 0.4 });
    }
  },
  s_dog(v) {
    for (let i = 0; i < 2; i++) {
      const w = i * 0.28;
      this.tone({ wave: 'sawtooth', f0: 320, f1: 130, dur: 0.16, vol: 0.34 * v, when: w, lp: 1000, q: 3, fcurve: [[1, 300]] });
      this.noise({ f: 700, q: 1, dur: 0.1, vol: 0.14 * v, when: w });
    }
  },
  s_cat(v) {
    this.tone({ wave: 'triangle', f0: 480, curve: [[0.35, 820], [1, 400]], dur: 0.75, vol: 0.28 * v, at: 0.06, rel: 0.25, bp: 1000, q: 1.5, fcurve: [[0.35, 2400], [1, 700]], vibRate: 6, vibDepth: 8 });
    this.tone({ wave: 'sawtooth', f0: 480, curve: [[0.35, 820], [1, 400]], dur: 0.75, vol: 0.06 * v, at: 0.06, rel: 0.25, lp: 1800 });
  },
  s_kitten(v) {
    this.tone({ wave: 'triangle', f0: 800, curve: [[0.4, 1300], [1, 700]], dur: 0.45, vol: 0.22 * v, at: 0.04, rel: 0.15, bp: 1800, q: 1.5, fcurve: [[0.4, 3200], [1, 1200]] });
  },
  s_owl(v) {
    this.tone({ wave: 'sine', f0: 400, f1: 380, dur: 0.3, vol: 0.28 * v, at: 0.05, rel: 0.1, lp: 800 });
    this.tone({ wave: 'sine', f0: 400, f1: 380, dur: 0.3, vol: 0.28 * v, when: 0.4, at: 0.05, rel: 0.1, lp: 800 });
    this.tone({ wave: 'sine', f0: 340, f1: 300, dur: 0.7, vol: 0.28 * v, when: 0.85, at: 0.08, rel: 0.3, lp: 800 });
  },
  s_frog(v) {
    this.tone({ wave: 'sawtooth', f0: 140, f1: 130, dur: 0.18, vol: 0.28 * v, bp: 450, q: 2, tremRate: 32, tremDepth: 0.9 });
    this.tone({ wave: 'sawtooth', f0: 160, f1: 260, dur: 0.15, vol: 0.28 * v, when: 0.22, bp: 600, q: 2, tremRate: 40, tremDepth: 0.7 });
  },
  s_bee(v) { this.tone({ wave: 'sawtooth', f0: 220, f1: 200, dur: 0.6, vol: 0.06 * v, lp: 800, tremRate: 30, tremDepth: 0.4 }); },
  s_mouse(v) { this.tone({ wave: 'sine', f0: 3000, f1: 4200, dur: 0.1, vol: 0.15 * v }); this.tone({ wave: 'sine', f0: 3400, f1: 2800, dur: 0.1, vol: 0.15 * v, when: 0.14 }); },
  s_snore(v = 1) {
    // inhale (rattly) + exhale (soft whistle)
    this.tone({ wave: 'sawtooth', f0: 75, f1: 95, dur: 1.0, vol: 0.09 * v, at: 0.3, rel: 0.4, lp: 350, q: 2, tremRate: 24, tremDepth: 0.9, bus: this.amb });
    this.noise({ type: 'lowpass', f: 500, f1: 900, dur: 1.0, vol: 0.05 * v, at: 0.4, bus: this.amb });
    this.noise({ type: 'lowpass', f: 900, f1: 400, dur: 0.7, vol: 0.05 * v, at: 0.2, when: 1.3, bus: this.amb });
    this.tone({ wave: 'sine', f0: 1400, f1: 1100, dur: 0.6, vol: 0.02 * v, at: 0.2, rel: 0.3, when: 1.35, bus: this.amb });
  },
  s_munch(v = 1) { for (let i = 0; i < 4; i++) this.noise({ f: 1200, q: 1.5, dur: 0.07, vol: 0.12 * v, when: i * 0.16 }); },
  s_splash(v = 1) { this.noise({ type: 'lowpass', f: 1200, f1: 400, dur: 0.45, vol: 0.28 * v, at: 0.01 }); this.noise({ f: 2500, q: 0.8, dur: 0.25, vol: 0.12 * v, when: 0.05 }); },
  s_boing(v = 1) { this.tone({ wave: 'sine', f0: 200, curve: [[0.15, 500], [1, 240]], dur: 0.35, vol: 0.2 * v, vibRate: 25, vibDepth: 30 }); },
  s_flap(v = 1) { for (let i = 0; i < 4; i++) this.noise({ type: 'lowpass', f: 900, dur: 0.09, vol: 0.14 * v, when: i * 0.11 }); },
  s_gallop(v = 1) { for (let i = 0; i < 6; i++) this.noise({ type: 'lowpass', f: 300, dur: 0.07, vol: 0.2 * v, when: i * 0.13 + (i % 2) * 0.03 }); },
  s_purr(v = 1) { this.tone({ wave: 'sawtooth', f0: 50, f1: 55, dur: 1.4, vol: 0.09 * v, at: 0.2, rel: 0.4, lp: 200, tremRate: 24, tremDepth: 0.95 }); },
  s_egg(v = 1) { this.tone({ wave: 'sine', f0: 900, f1: 1400, dur: 0.12, vol: 0.14 * v }); this.tone({ wave: 'sine', f0: 1400, f1: 1800, dur: 0.15, vol: 0.14 * v, when: 0.12 }); },
  s_squeakToy(v = 1) { this.tone({ wave: 'sine', f0: 1500, f1: 900, dur: 0.2, vol: 0.12 * v }); },
  s_honk(v = 1) {
    [[0, 310], [0.3, 245]].forEach(([w, f]) => {
      this.tone({ wave: 'square', f0: f, f1: f * 0.97, dur: 0.28, vol: 0.15 * v, when: w, lp: 900, q: 2 });
      this.tone({ wave: 'sawtooth', f0: f * 1.5, f1: f * 1.45, dur: 0.28, vol: 0.06 * v, when: w, lp: 1400 });
    });
  },
  s_caw(v = 1) { for (let i = 0; i < 2; i++) this.tone({ wave: 'sawtooth', f0: 900, f1: 520, dur: 0.26, vol: 0.18 * v, when: i * 0.34, bp: 1300, q: 2, tremRate: 28, tremDepth: 0.5 }); },
  s_firework(v = 1) {
    this.noise({ type: 'lowpass', f: 2500, f1: 300, dur: 0.7, vol: 0.18 * v });
    [1200, 1500, 1900, 2300, 950].forEach((f, i) => this.tone({ wave: 'sine', f0: f, f1: f * 0.7, dur: 0.5, vol: 0.05 * v, when: 0.12 + i * 0.08 }));
  },

  /* ----- UI ----- */
  s_pop(v = 1) { this.tone({ wave: 'sine', f0: 500, f1: 900, dur: 0.09, vol: 0.18 * v }); },
  s_ding(v = 1) { this.tone({ wave: 'sine', f0: 880, dur: 0.35, vol: 0.18 * v, rel: 0.3 }); this.tone({ wave: 'sine', f0: 1320, dur: 0.3, vol: 0.09 * v, rel: 0.25 }); },
  s_count(v = 1) { this.tone({ wave: 'triangle', f0: 660, f1: 990, dur: 0.14, vol: 0.18 * v }); },
  s_success(v = 1) { [523, 659, 784, 1047].forEach((f, i) => this.tone({ wave: 'triangle', f0: f, dur: 0.28, vol: 0.2 * v, when: i * 0.11, rel: 0.2 })); this.tone({ wave: 'sine', f0: 1568, dur: 0.6, vol: 0.12 * v, when: 0.45, rel: 0.5 }); },
  s_oops(v = 1) { this.tone({ wave: 'triangle', f0: 300, f1: 220, dur: 0.25, vol: 0.14 * v }); this.tone({ wave: 'triangle', f0: 240, f1: 180, dur: 0.3, vol: 0.14 * v, when: 0.25 }); },
  s_door(v = 1) { this.tone({ wave: 'sawtooth', f0: 180, f1: 240, dur: 0.5, vol: 0.06 * v, lp: 600, tremRate: 18, tremDepth: 0.9 }); this.noise({ type: 'lowpass', f: 600, f1: 200, dur: 0.4, vol: 0.12 * v, when: 0.35 }); },
  s_whoosh(v = 1) { this.noise({ type: 'bandpass', f: 400, f1: 2000, q: 0.7, dur: 0.4, vol: 0.14 * v, at: 0.15 }); },
  s_sparkle(v = 1) { [1200, 1600, 2000, 2400].forEach((f, i) => this.tone({ wave: 'sine', f0: f, dur: 0.18, vol: 0.09 * v, when: i * 0.06 })); },
  s_bird(v = 1) {
    const n = U.randInt(2, 5), base = U.rand(1900, 3200);
    for (let i = 0; i < n; i++) {
      const f0 = base * U.rand(0.9, 1.15);
      this.tone({ wave: 'sine', f0, f1: f0 * U.rand(1.15, 1.5), dur: U.rand(0.06, 0.12), vol: 0.07 * v, when: i * U.rand(0.1, 0.16), bus: this.amb });
    }
  },
  s_cricketChirp(v = 1) { for (let i = 0; i < 3; i++) this.tone({ wave: 'sine', f0: 4200, dur: 0.06, vol: 0.05 * v, when: i * 0.09, tremRate: 60, tremDepth: 0.9, bus: this.amb }); },

  /* ----- ambient beds ----- */
  _stopAmb() {
    this._ambNodes.forEach(n => { try { n.stop ? n.stop() : n.disconnect(); } catch (e) { } });
    this._ambNodes = [];
  },
  startAmbient(mode) {
    if (!this.ctx || this._ambMode === mode) return;
    this._ambMode = mode; this._stopAmb();
    const c = this.ctx, t = c.currentTime;
    // gentle wind bed for both
    const wind = c.createBufferSource(); wind.buffer = this.noiseBuf; wind.loop = true;
    const wf = c.createBiquadFilter(); wf.type = 'lowpass'; wf.frequency.value = mode === 'day' ? 500 : 350; wf.Q.value = 0.7;
    const wg = c.createGain(); wg.gain.value = mode === 'day' ? 0.035 : 0.05;
    const wl = c.createOscillator(); wl.frequency.value = 0.13; const wlg = c.createGain(); wlg.gain.value = 0.02;
    wl.connect(wlg); wlg.connect(wg.gain);
    wind.connect(wf); wf.connect(wg); wg.connect(this.amb); wind.start(t); wl.start(t);
    this._ambNodes.push(wind, wl);
    if (mode === 'night') {
      // cricket chorus: two crickets with different chirp rhythms
      [[4300, 21, 2.2], [4900, 17, 1.7]].forEach(([f, trill, gate]) => {
        const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f;
        const g1 = c.createGain(); g1.gain.value = 0; // trill
        const l1 = c.createOscillator(); l1.type = 'square'; l1.frequency.value = trill; const l1g = c.createGain(); l1g.gain.value = 0.5;
        const off1 = c.createConstantSource(); off1.offset.value = 0.5;
        l1.connect(l1g); l1g.connect(g1.gain); off1.connect(g1.gain);
        const g2 = c.createGain(); g2.gain.value = 0; // gate (chirp bursts)
        const l2 = c.createOscillator(); l2.type = 'square'; l2.frequency.value = gate; const l2g = c.createGain(); l2g.gain.value = 0.5;
        const off2 = c.createConstantSource(); off2.offset.value = 0.5;
        l2.connect(l2g); l2g.connect(g2.gain); off2.connect(g2.gain);
        const out = c.createGain(); out.gain.value = 0.018;
        o.connect(g1); g1.connect(g2); g2.connect(out); out.connect(this.amb);
        [o, l1, l2, off1, off2].forEach(n => n.start(t));
        this._ambNodes.push(o, l1, l2, off1, off2);
      });
    }
  },
  // Random ambient one-shots — called from the game loop
  updateAmbient(dt, mode, ctxInfo) {
    if (!this.ctx || !this.enabled) return;
    const T = this._ambTimers;
    const tick = (key, min, max, fn) => {
      T[key] = (T[key] == null ? U.rand(0.5, min) : T[key]) - dt;
      if (T[key] <= 0) { fn(); T[key] = U.rand(min, max); }
    };
    if (mode === 'day') {
      tick('bird', 3, 8, () => this.s_bird(ctxInfo.inside ? 0.6 : 1));
      tick('bird2', 8, 16, () => this.s_bird(0.5));
    } else {
      tick('cricket', 7, 14, () => this.s_cricketChirp());
    }
  },

  /* ----- music: tiny sequencer ----- */
  _midi(n) { return 440 * Math.pow(2, (n - 69) / 12); },
  startMusic(mode) {
    if (!this.ctx || this._musicMode === mode) return;
    this.stopMusic();
    this._musicMode = mode; this._musicStep = 0; this._musicNext = this.ctx.currentTime + 0.1;
    this._musicTimer = setInterval(() => this._scheduleMusic(), 90);
  },
  stopMusic() { if (this._musicTimer) clearInterval(this._musicTimer); this._musicTimer = null; this._musicMode = null; },
  _scheduleMusic() {
    const c = this.ctx; if (!c) return;
    const M = this._musicMode === 'day' ? MUSIC.day : MUSIC.night;
    const stepDur = 60 / M.bpm / 2; // eighth notes
    while (this._musicNext < c.currentTime + 0.25) {
      const step = this._musicStep % M.len;
      const when = this._musicNext - c.currentTime;
      (M.mel[step] || []).forEach(n => this.tone({ wave: M.melWave, f0: this._midi(n), dur: stepDur * (M.melDur || 1.8), vol: M.melVol, when, at: 0.01, rel: stepDur, lp: M.lp, bus: this.music }));
      (M.bass[step] || []).forEach(n => this.tone({ wave: M.bassWave, f0: this._midi(n), dur: stepDur * 3.5, vol: M.bassVol, when, at: 0.02, rel: stepDur * 2, lp: 700, bus: this.music }));
      if (M.perc && M.perc[step]) this.noise({ type: 'bandpass', f: 4000, q: 1, dur: 0.05, vol: 0.05, when, bus: this.music });
      this._musicNext += stepDur; this._musicStep++;
    }
  }
};

// Melodies in MIDI numbers, one array entry per eighth-note step (16 steps per 4/4 bar... here 8 per bar)
const MUSIC = (() => {
  const C4 = 60, D4 = 62, E4 = 64, F4 = 65, G4 = 67, A4 = 69, B4 = 71, C5 = 72, D5 = 74, E5 = 76, F5 = 77, G5 = 79, A5 = 81;
  const C3 = 48, F3 = 53, G3 = 55, A3 = 57, E3 = 52, D3 = 50;
  const day = { bpm: 116, len: 64, melWave: 'triangle', melVol: 0.16, bassWave: 'triangle', bassVol: 0.11, lp: 3000, mel: [], bass: [], perc: [] };
  const dm = [C5, 0, E5, 0, G5, 0, E5, 0, F5, 0, A5, G5, 0, 0, E5, 0, D5, 0, C5, D5, E5, 0, G4, 0, C5, 0, 0, 0, 0, 0, G4, A4,
    C5, 0, E5, 0, G5, 0, E5, 0, A5, 0, G5, F5, 0, 0, D5, 0, E5, 0, D5, C5, B4, 0, D5, 0, C5, 0, 0, 0, 0, 0, 0, 0];
  const db = [C3, 0, 0, 0, G3, 0, 0, 0, F3, 0, 0, 0, G3, 0, 0, 0, C3, 0, 0, 0, G3, 0, 0, 0, C3, 0, 0, 0, G3, 0, 0, 0,
    C3, 0, 0, 0, G3, 0, 0, 0, F3, 0, 0, 0, D3, 0, 0, 0, C3, 0, 0, 0, G3, 0, 0, 0, C3, 0, 0, 0, C3, 0, 0, 0];
  for (let i = 0; i < 64; i++) { day.mel[i] = dm[i] ? [dm[i]] : []; day.bass[i] = db[i] ? [db[i]] : []; day.perc[i] = i % 4 === 2; }
  const night = { bpm: 72, len: 64, melWave: 'sine', melVol: 0.2, melDur: 3.5, bassWave: 'sine', bassVol: 0.13, lp: 4000, mel: [], bass: [], perc: null };
  const nm = [E5, 0, G5, 0, A5, 0, 0, 0, G5, 0, E5, 0, D5, 0, 0, 0, C5, 0, D5, 0, E5, 0, 0, 0, D5, 0, 0, 0, 0, 0, 0, 0,
    E5, 0, G5, 0, A5, 0, 0, 0, G5, 0, E5, 0, D5, 0, 0, 0, C5, 0, D5, 0, D5, 0, C5, 0, C5, 0, 0, 0, 0, 0, 0, 0];
  const nb = [C3, 0, 0, 0, 0, 0, 0, 0, G3, 0, 0, 0, 0, 0, 0, 0, A3, 0, 0, 0, 0, 0, 0, 0, G3, 0, 0, 0, 0, 0, 0, 0,
    C3, 0, 0, 0, 0, 0, 0, 0, E3, 0, 0, 0, 0, 0, 0, 0, F3, 0, 0, 0, G3, 0, 0, 0, C3, 0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 64; i++) { night.mel[i] = nm[i] ? [nm[i]] : []; night.bass[i] = nb[i] ? [nb[i]] : []; }
  return { day, night };
})();
