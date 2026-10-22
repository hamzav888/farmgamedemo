/* ---------- Procedural sound engine (Web Audio, no external files) ----------

   Signal flow
     sfx  ──┬─────────────────────────────► master ─► out
            └─► sfxSend ─► convolver(room) ─► verbOut ─┘
     amb  ─► ambFilter ─► master          (wind, crickets, birds, snoring)
     music ─┬────────────────────────────► master
            └─► musSend ─► convolver(room)

   Animal calls are built with `fvoice()`: a glottal source (buzzy oscillator +
   optional breath noise) pushed through parallel band-pass *formants*, the same
   trick that makes a vowel sound like a vowel. That is what stops them sounding
   like beeps and starts them sounding like animals.
*/
const Sfx = {
  ctx: null, master: null, sfx: null, amb: null, music: null, ambFilter: null,
  verb: null, verbOut: null, sfxSend: null, musSend: null,
  enabled: true, musicOn: true,
  _ambNodes: [], _ambMode: null, _ambTimers: {}, _bed: null, _synthCrickets: [],
  _musicTimer: null, _musicNext: 0, _musicStep: 0, _musicMode: null,
  _plucks: {}, _duck: false, _muffled: false, _pan: null, voiceBus: null, _windGain: null, _windBase: 0.04,

  init() {
    // A context can be closed out from under us (iOS does this after an
    // interruption), which would leave every bus node orphaned. Rebuild if so.
    if (this.ctx && this.ctx.state === 'closed') { this.ctx = null; this._plucks = {}; this._ambMode = null; this._bed = null; this.stopMusic(); }
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    const c = this.ctx;
    this.master = c.createGain(); this.master.gain.value = 0.9; this.master.connect(c.destination);

    // gentle limiter so a pile-up of sounds never clips or hurts little ears
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -12; comp.knee.value = 22; comp.ratio.value = 4;
    comp.attack.value = 0.004; comp.release.value = 0.22;
    comp.connect(this.master);
    this.bus = comp;

    this.sfx = c.createGain(); this.sfx.gain.value = 1; this.sfx.connect(this.bus);
    this.ambFilter = c.createBiquadFilter(); this.ambFilter.type = 'lowpass'; this.ambFilter.frequency.value = 20000;
    this.amb = c.createGain(); this.amb.gain.value = 1; this.amb.connect(this.ambFilter); this.ambFilter.connect(this.bus);
    this.music = c.createGain(); this.music.gain.value = 0.2; this.music.connect(this.bus);
    // the narrator's recorded clips: a touch of presence, almost no reverb
    // The narrator should sound like someone reading on the sofa, not a broadcast.
    // At 0.52 she sits ~-20 dBFS, about 17 dB over the ducked music and a little
    // over the animals, with peaks near -7 dBFS: room to spare, so phone speakers
    // are never pushed into crunching. The EQ swaps brightness for warmth: no
    // rumble, a touch of chest, the shouty band eased, and the fizz neural voices
    // carry up top rolled off. (Was 1.2 with a +2.5 dB presence shelf: too hot.)
    this.voiceBus = c.createGain(); this.voiceBus.gain.value = 0.52;
    let vlast = this.voiceBus;
    for (const [type, f, q, g] of [['highpass', 90, 0.7, 0], ['peaking', 220, 0.9, 1.5], ['peaking', 3200, 1.0, -2], ['highshelf', 7500, 0.7, -3]]) {
      const b = c.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; b.gain.value = g; vlast.connect(b); vlast = b;
    }
    vlast.connect(this.bus);

    // ----- room reverb (a synthesised impulse response: no files needed) -----
    this.verb = c.createConvolver();
    this.verb.buffer = this._makeIR(1.5, 2.6, 0.32);
    this.verbOut = c.createGain(); this.verbOut.gain.value = 0.9;
    this.verb.connect(this.verbOut); this.verbOut.connect(this.bus);
    this.sfxSend = c.createGain(); this.sfxSend.gain.value = 0.16;  // open field: a hint of space
    this.musSend = c.createGain(); this.musSend.gain.value = 0.10;
    this.sfx.connect(this.sfxSend); this.sfxSend.connect(this.verb);
    const vsend = c.createGain(); vsend.gain.value = 0.05; this.voiceBus.connect(vsend); vsend.connect(this.verb);
    this.music.connect(this.musSend); this.musSend.connect(this.verb);
    this.amb.connect(this.sfxSend);

    // white noise buffer for reuse
    const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
    for (const k in this.TRACKS) this._decodeTrack(k).catch(() => { });   // the songs were fetched at page load; decode now
    this._decodeSfx();
  },

  // Decaying stereo noise burst = a believable small-room impulse response.
  _makeIR(seconds, decay, damp) {
    const c = this.ctx, rate = c.sampleRate, len = Math.max(1, Math.floor(rate * seconds));
    const buf = c.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / len;
        const n = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
        lp += (n - lp) * damp;   // high frequencies die away first, like a real room
        d[i] = lp;
      }
    }
    return buf;
  },

  now() { return this.ctx ? this.ctx.currentTime : 0; },
  setEnabled(on) { this.enabled = on; if (this.master) this.master.gain.setTargetAtTime(on ? 0.9 : 0, this.now(), 0.05); },
  setMusic(on) { this.musicOn = on; this._applyMusicGain(); },
  // quieten music + ambience while the narrator talks so kids can hear her clearly
  duck(on) {
    this._duck = on; this._applyMusicGain();
    if (this.amb) this.amb.gain.setTargetAtTime(on ? 0.45 : 1, this.now(), 0.2);
  },
  _applyMusicGain() { if (this.music) this.music.gain.setTargetAtTime(this.musicOn ? (this._duck ? 0.06 : 0.2) * this._musicLevel : 0, this.now(), 0.15); },
  _musicLevel: 1,
  // a scene can sit the music back (the Farm Band, where the child is the music)
  setMusicLevel(k) { this._musicLevel = k; this._applyMusicGain(); },
  // Inside the barn: outside world goes muffled and the room gets boomy + echoey.
  setMuffled(m) {
    this._muffled = m;
    if (this.ambFilter) this.ambFilter.frequency.setTargetAtTime(m ? 700 : 20000, this.now(), 0.3);
    if (this.sfxSend) this.sfxSend.gain.setTargetAtTime(m ? 0.42 : 0.16, this.now(), 0.3);
    if (this.musSend) this.musSend.gain.setTargetAtTime(m ? 0.26 : 0.10, this.now(), 0.3);
  },

  /* ================= building blocks ================= */
  // last hop to the bus — with a stereo position when the sound has one
  _out(o, node) {
    const bus = o.bus || this.sfx, pan = o.pan != null ? o.pan : this._pan;
    if (pan != null && pan !== 0 && this.ctx.createStereoPanner) {
      const p = this.ctx.createStereoPanner(); p.pan.value = U.clamp(pan, -1, 1); node.connect(p); p.connect(bus);
    } else node.connect(bus);
  },
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
    last.connect(g); this._out(o, g);
    osc.start(t0); osc.stop(t0 + dur + 0.15);
    return osc;
  },

  noise(o) {
    if (!this.ctx) return null;
    const c = this.ctx, t0 = c.currentTime + (o.when || 0), dur = o.dur || 0.2, vol = o.vol == null ? 0.2 : o.vol;
    const src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    src.playbackRate.value = 0.7 + Math.random() * 0.6;      // never the exact same noise twice
    const f = c.createBiquadFilter(); f.type = o.type || 'bandpass'; f.frequency.setValueAtTime(o.f || 1000, t0); f.Q.value = o.q || 1;
    if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t0 + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + (o.at == null ? 0.01 : o.at));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); this._out(o, g);
    src.start(t0); src.stop(t0 + dur + 0.05);
  },

  /* ---- the voice box: source -> parallel formants -> envelope ----
     o.formants: [[freq, Q, gain, optional [[timeFrac, freq], ...] sweep], ...]
     o.env:      [[timeFrac, level0..1], ...]  multi-syllable amplitude shapes
  */
  fvoice(o) {
    if (!this.ctx) return null;
    const c = this.ctx, t0 = c.currentTime + (o.when || 0);
    const dur = o.dur || 0.5, vol = o.vol == null ? 0.3 : o.vol;
    const at = o.at == null ? 0.02 : o.at, rel = o.rel == null ? Math.min(0.14, dur * 0.4) : o.rel;

    // --- glottal source ---
    const osc = c.createOscillator(); osc.type = o.wave || 'sawtooth';
    osc.frequency.setValueAtTime(Math.max(20, o.f0 || 200), t0);
    (o.curve || []).forEach(([tf, f]) => osc.frequency.exponentialRampToValueAtTime(Math.max(20, f), t0 + dur * tf));
    if (o.vibRate) {
      const v = c.createOscillator(); v.type = o.vibWave || 'sine'; v.frequency.value = o.vibRate;
      const vg = c.createGain(); vg.gain.value = o.vibDepth || 10;
      v.connect(vg); vg.connect(osc.frequency); v.start(t0); v.stop(t0 + dur + 0.15);
    }
    const pre = c.createGain(); pre.gain.value = 1;
    osc.connect(pre);

    // a second, slightly detuned cord adds thickness (big animals)
    if (o.thick) {
      const o2 = c.createOscillator(); o2.type = o.wave || 'sawtooth';
      o2.frequency.setValueAtTime(Math.max(20, (o.f0 || 200) * o.thick), t0);
      (o.curve || []).forEach(([tf, f]) => o2.frequency.exponentialRampToValueAtTime(Math.max(20, f * o.thick), t0 + dur * tf));
      const g2 = c.createGain(); g2.gain.value = 0.5; o2.connect(g2); g2.connect(pre);
      o2.start(t0); o2.stop(t0 + dur + 0.2);
    }
    // breath / rasp
    if (o.breath) {
      const n = c.createBufferSource(); n.buffer = this.noiseBuf; n.loop = true;
      n.playbackRate.value = 0.8 + Math.random() * 0.4;
      const nf = c.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = o.breathF || 1600; nf.Q.value = 0.8;
      const ng = c.createGain(); ng.gain.value = o.breath;
      n.connect(nf); nf.connect(ng); ng.connect(pre);
      n.start(t0); n.stop(t0 + dur + 0.1);
    }

    // --- vocal tract: parallel band-pass formants ---
    const sum = c.createGain(); sum.gain.value = 1;
    const forms = o.formants || [[700, 6, 1], [1150, 8, 0.55], [2600, 10, 0.2]];
    forms.forEach(([f, q, gn, sweep]) => {
      const bp = c.createBiquadFilter(); bp.type = 'bandpass';
      bp.frequency.setValueAtTime(Math.max(20, f), t0); bp.Q.value = q;
      if (sweep) sweep.forEach(([tf, ff]) => bp.frequency.exponentialRampToValueAtTime(Math.max(20, ff), t0 + dur * tf));
      const gg = c.createGain(); gg.gain.value = gn;
      pre.connect(bp); bp.connect(gg); gg.connect(sum);
    });
    // a touch of dry source keeps the body/weight of the animal
    const dry = c.createGain(); dry.gain.value = o.dry == null ? 0.1 : o.dry;
    const dryLp = c.createBiquadFilter(); dryLp.type = 'lowpass'; dryLp.frequency.value = o.dryLp || 900;
    pre.connect(dryLp); dryLp.connect(dry); dry.connect(sum);

    // --- amplitude envelope ---
    const amp = c.createGain();
    amp.gain.setValueAtTime(0.0001, t0);
    if (o.env) {
      o.env.forEach(([tf, lv]) => amp.gain.linearRampToValueAtTime(Math.max(0.0001, lv * vol), t0 + dur * tf));
      amp.gain.linearRampToValueAtTime(0.0001, t0 + dur);
    } else {
      amp.gain.linearRampToValueAtTime(vol, t0 + at);
      amp.gain.setValueAtTime(vol, Math.max(t0 + at, t0 + dur - rel));
      amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    }
    if (o.tremRate) {
      const lfo = c.createOscillator(); lfo.type = o.tremWave || 'sine'; lfo.frequency.value = o.tremRate;
      const lg = c.createGain(); lg.gain.value = vol * (o.tremDepth || 0.5);
      lfo.connect(lg); lg.connect(amp.gain); lfo.start(t0); lfo.stop(t0 + dur + 0.15);
    }

    sum.connect(amp); this._out(o, amp);
    osc.start(t0); osc.stop(t0 + dur + 0.2);
    return osc;
  },

  /* ---- plucked string (Karplus-Strong) : banjo, guitar, upright bass ---- */
  _pluckBuf(freq, bright) {
    const key = Math.round(freq * 2) + (bright ? 'b' : 'w');
    if (this._plucks[key]) return this._plucks[key];
    const c = this.ctx, rate = c.sampleRate;
    const N = Math.max(2, Math.round(rate / freq));
    const len = Math.min(Math.round(rate * 2.0), Math.max(N * 8, Math.round(rate * (bright ? 1.1 : 1.6))));
    const buf = c.createBuffer(1, len, rate);
    const d = buf.getChannelData(0);
    // Excitation burst. It must contain energy AT the fundamental, so full-band
    // white noise for the bright banjo; a one-pole smoothed (darker) burst for
    // the mellow upright bass. Differencing the noise here would high-pass away
    // the fundamental and the string would ring at its harmonics and die.
    let prev = 0;
    for (let i = 0; i < N; i++) {
      const n = Math.random() * 2 - 1;
      d[i] = bright ? n : (n + prev) * 0.5;
      prev = n;
    }
    // each trip round the delay line loses `damp` and loses a little treble
    const damp = bright ? 0.9915 : 0.9975;
    for (let i = N; i < len; i++) d[i] = damp * 0.5 * (d[i - N] + d[i - N + 1]);
    let m = 0; for (let i = 0; i < len; i++) { const a = Math.abs(d[i]); if (a > m) m = a; }
    if (m > 0) for (let i = 0; i < len; i++) d[i] /= m;
    this._plucks[key] = buf;
    return buf;
  },
  pluck(o) {
    if (!this.ctx) return;
    const c = this.ctx, t0 = c.currentTime + (o.when || 0);
    const f = o.f0 || 220, dur = o.dur || 0.9, vol = o.vol == null ? 0.14 : o.vol;
    const src = c.createBufferSource(); src.buffer = this._pluckBuf(f, o.bright !== false);
    // The delay line is a whole number of samples, so the string lands slightly
    // off pitch (badly so up high). Nudge playback rate to put it exactly in tune.
    // Its two taps sit at lag N and N-1, so the effective loop length is N-0.5.
    const N = Math.max(2, Math.round(c.sampleRate / f));
    src.playbackRate.value = f / (c.sampleRate / (N - 0.5));
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let last = src;
    if (o.lp) { const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = o.lp; lp.Q.value = 0.7; src.connect(lp); last = lp; }
    // banjo body resonance
    if (o.body) { const pk = c.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = o.body; pk.Q.value = 1.4; pk.gain.value = 6; last.connect(pk); last = pk; }
    last.connect(g); this._out(o, g);
    src.start(t0); src.stop(t0 + dur + 0.05);
  },

  /* ================= animal voices ================= */
  // small random detune so the same animal never sounds identical twice
  _v() { return 0.94 + Math.random() * 0.12; },

  /* Loudness trim. A cow and a chicken need wildly different raw gains to feel
     equally loud to an ear, so each call is measured (max RMS over a 300 ms
     window) and scaled to the same target. Retune by measuring, not by guessing. */
  _trim: {
    cow: 0.47, horse: 0.63, owl: 0.59, sheep: 1.19, rooster: 1.14, pig: 1.31,
    goat: 1.38, cat: 1.43, frog: 1.44, dog: 1.95, chicken: 2.09, duck: 2.14, kitten: 2.42
  },
  // x (0..1280) places the sound in the stereo field: a cow on the left of the
  // farm moos from the left. Every building block honours it via _out().
  play(name, vol = 1, x = null) {
    if (!this.ctx || !this.enabled) return 0;
    this._pan = x == null ? null : U.clamp((x - 640) / 640, -1, 1) * 0.65;
    try {
      const takes = this._takes(name), dur = takes ? this._playSample(name, takes, vol) : 0;
      const fn = this['s_' + name];
      if (fn && (!takes || this._sfx.mf.sounds[name].layer)) fn.call(this, vol * (this._trim[name] || 1));
      return dur;   // seconds the recording lasts (0 for a synthesised sound), so a mouth can flap for exactly that long
    } finally { this._pan = null; }
  },

  /* ================= recorded sound effects =================
     sfx/manifest.json (built by tools/make-sfx.py) lists real recordings for
     most sounds: a few takes each, all levelled to one loudness. play() prefers
     them, picking a different take each time with a little pitch variation,
     and uses the synthesised version below only until the files have arrived
     or for sounds that have no recording. The beds (birdsong by day, crickets
     by night, the tractor's engine) loop seamlessly. */
  _sfx: { mf: null, ab: {}, buf: {}, beds: {}, bedAb: {}, last: {}, base: '' },
  _preloadSfx() {
    const src = (document.currentScript && document.currentScript.src) || '';
    const S = this._sfx; S.base = src.replace(/js\/audio\.js.*$/, '') + 'sfx/';
    const grab = f => fetch(S.base + f).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); });
    fetch(S.base + 'manifest.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).then(mf => {
      if (!mf || !mf.sounds) return; S.mf = mf;
      for (const name in mf.sounds) mf.sounds[name].takes.forEach((t, i) => grab(t.f).then(ab => this._gotSfx(S.ab, name, i, ab), () => { }));
      for (const k in mf.beds) grab(mf.beds[k].f).then(ab => this._gotSfx(S.bedAb, k, 0, ab), () => { });
    }).catch(() => { });
  },
  _gotSfx(store, name, i, ab) { (store[name] = store[name] || [])[i] = ab; if (this.ctx) this._decodeSfx(); },
  // decode whatever has arrived: at init, and again as each later file lands
  _decodeSfx() {
    const S = this._sfx, dec = (store, done) => {
      for (const name in store) store[name].forEach((ab, i) => {
        if (!ab) return; store[name][i] = null;
        this.ctx.decodeAudioData(ab).then(b => done(name, i, b), () => { });
      });
    };
    dec(S.ab, (name, i, b) => { (S.buf[name] = S.buf[name] || [])[i] = b; });
    dec(S.bedAb, (name, i, b) => { S.beds[name] = b; if (name === this._ambMode && !this._bed) this._startBed(name); });
  },
  _takes(name) { const b = this._sfx.buf[name]; if (!b) return null; const t = b.filter(Boolean); return t.length ? t : null; },
  hasSample(name) { return !!this._takes(name); },
  _playSample(name, takes, vol) {
    const spec = this._sfx.mf.sounds[name], S = this._sfx, c = this.ctx;
    let i = Math.floor(Math.random() * takes.length);
    if (takes.length > 1 && i === S.last[name]) i = (i + 1) % takes.length;   // never the same take twice running
    S.last[name] = i;
    const src = c.createBufferSource(); src.buffer = takes[i];
    const rate = 1 + (Math.random() * 2 - 1) * (spec.rate || 0.04); src.playbackRate.value = rate;
    const g = c.createGain(); g.gain.value = vol * (spec.gain || 1);
    src.connect(g); this._out({}, g); src.start();
    return takes[i].duration / rate;
  },
  // the ambience bed for a mode, crossfading from whatever bed is playing
  _startBed(mode) {
    const buf = this._sfx.beds[mode];
    if (!buf) { this._stopBed(2); return; }
    if (this._bed && this._bed.mode === mode) return;
    this._stopBed(2.5);
    const c = this.ctx, t = c.currentTime, src = c.createBufferSource(); src.buffer = buf; src.loop = true;
    const on = this._onsetOf(buf);   // skip any decoder priming silence and loop the sound itself
    src.loopStart = on; src.loopEnd = Math.min(buf.duration, on + this._sfx.mf.beds[mode].d);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(this._sfx.mf.beds[mode].gain || 1, t + 2.5);
    src.connect(g); g.connect(this.amb); src.start(t, on + Math.random() * (src.loopEnd - on) * 0.9);   // from a different spot each time
    this._bed = { src, gain: g, mode };
    this._synthCrickets.forEach(n => { try { n.stop(); } catch (e) { } }); this._synthCrickets = [];
  },
  _stopBed(fadeSec = 1) {
    const b = this._bed; if (!b) return; this._bed = null;
    const t = this.now(), p = b.gain.gain; p.cancelScheduledValues(t); p.setValueAtTime(Math.max(0.0001, p.value), t); p.exponentialRampToValueAtTime(0.0001, t + fadeSec);
    try { b.src.stop(t + fadeSec + 0.05); } catch (e) { }
  },
  // a looping recording a scene can steer (the tractor engine): rate follows the throttle
  loop(name, o = {}) {
    const buf = this._sfx.beds[name]; if (!buf || !this.ctx) return null;
    const c = this.ctx, t = c.currentTime, src = c.createBufferSource(); src.buffer = buf; src.loop = true;
    const on = this._onsetOf(buf); src.loopStart = on; src.loopEnd = Math.min(buf.duration, on + this._sfx.mf.beds[name].d);
    const g = c.createGain(); g.gain.value = o.gain == null ? 1 : o.gain; src.playbackRate.value = o.rate || 1;
    src.connect(g); this._out(o, g); src.start(t, on);
    return {
      set: (rate, gain) => { const n = this.now(); src.playbackRate.setTargetAtTime(rate, n, 0.12); g.gain.setTargetAtTime(gain, n, 0.1); },
      stop: (fade = 0.3) => { const n = this.now(); g.gain.setTargetAtTime(0, n, fade / 3); try { src.stop(n + fade + 0.1); } catch (e) { } }
    };
  },

  // Deep two-part "mmMOOoo" — closed lips, open throat, closed lips again.
  s_cow(v) {
    const k = this._v(), f = 132 * k;
    this.fvoice({
      wave: 'sawtooth', f0: f, curve: [[0.12, f * 1.42], [0.34, f * 1.5], [0.72, f * 1.28], [1, f * 0.72]],
      dur: 1.35, vol: 0.34 * v, thick: 1.004, dry: 0.16, dryLp: 420,
      env: [[0.05, 0.35], [0.16, 1], [0.62, 0.95], [0.86, 0.5], [0.97, 0.06]],
      formants: [
        [430, 5, 1, [[0.2, 560], [0.7, 520], [1, 300]]],   // open "oo" -> closing
        [1050, 9, 0.5, [[0.3, 1180], [1, 820]]],
        [2500, 12, 0.14]
      ],
      vibRate: 5.5, vibDepth: 3.5, breath: 0.035, breathF: 700
    });
    // chest resonance underneath
    this.tone({ wave: 'sine', f0: f * 0.5, curve: [[0.3, f * 0.72], [1, f * 0.4]], dur: 1.35, vol: 0.12 * v, at: 0.12, rel: 0.5, lp: 300 });
  },

  // "Baaaa" — the wobble IS the sheep. Heavy 9 Hz bleat on both pitch and volume.
  s_sheep(v) {
    const k = this._v(), f = 300 * k;
    this.fvoice({
      wave: 'sawtooth', f0: f, curve: [[0.18, f * 1.16], [0.6, f * 1.06], [1, f * 0.8]],
      dur: 0.95, vol: 0.24 * v, dry: 0.07, dryLp: 800,
      env: [[0.06, 1], [0.7, 0.85], [0.95, 0.15]],
      formants: [[760, 5, 1, [[0.25, 820], [1, 640]]], [1750, 8, 0.5], [2900, 11, 0.18]],
      vibRate: 9.5, vibDepth: 16, tremRate: 9.5, tremDepth: 0.55, breath: 0.05, breathF: 2000
    });
  },

  // Goat: a sheep with the wobble cranked up and the pitch raised — cheeky.
  s_goat(v) {
    const k = this._v(), f = 420 * k;
    this.fvoice({
      wave: 'sawtooth', f0: f, curve: [[0.15, f * 1.2], [1, f * 0.82]],
      dur: 0.72, vol: 0.2 * v, dry: 0.06,
      env: [[0.05, 1], [0.45, 0.8], [0.92, 0.2]],
      formants: [[900, 5, 1, [[0.3, 980], [1, 760]]], [2050, 8, 0.45], [3200, 12, 0.15]],
      vibRate: 14, vibDepth: 30, tremRate: 14, tremDepth: 0.7, breath: 0.06, breathF: 2400
    });
  },

  // Two wet grunts: a snort of air, a voiced "oink", a little squeal on the end.
  s_pig(v) {
    const k = this._v();
    for (let i = 0; i < 2; i++) {
      const w = i * 0.3, f = 210 * k * (i ? 1.12 : 1);
      this.fvoice({
        wave: 'sawtooth', f0: f, curve: [[0.35, f * 1.85], [0.7, f * 1.5], [1, f * 0.85]],
        dur: 0.26, vol: 0.28 * v, when: w, dry: 0.18, dryLp: 600,
        env: [[0.1, 1], [0.5, 0.8], [0.95, 0.1]],
        formants: [[420, 4, 1, [[0.4, 780], [1, 430]]], [1250, 7, 0.45], [2400, 10, 0.12]],
        tremRate: 46, tremDepth: 0.3, breath: 0.16, breathF: 900
      });
      // the snuffle through the snout
      this.noise({ type: 'bandpass', f: 620, f1: 1500, q: 1.1, dur: 0.16, vol: 0.12 * v, when: w + 0.02, at: 0.005 });
      this.noise({ type: 'lowpass', f: 420, f1: 240, dur: 0.14, vol: 0.09 * v, when: w + 0.14 });
    }
  },

  // Whinny: a high squeal that falls away in a flutter, then a low nicker.
  s_horse(v) {
    const k = this._v(), f = 620 * k;
    this.fvoice({
      wave: 'sawtooth', f0: f, curve: [[0.1, f * 1.25], [0.35, f * 0.95], [0.7, f * 0.62], [1, f * 0.38]],
      dur: 1.15, vol: 0.22 * v, dry: 0.06,
      env: [[0.04, 1], [0.3, 0.9], [0.75, 0.6], [0.97, 0.08]],
      formants: [[780, 4, 1, [[0.5, 700], [1, 560]]], [1900, 7, 0.55], [3100, 11, 0.2]],
      vibRate: 13, vibDepth: 45, tremRate: 13, tremDepth: 0.55, breath: 0.07, breathF: 2600
    });
    // closing nicker — lips fluttering
    this.fvoice({
      wave: 'sawtooth', f0: 95, curve: [[1, 72]], dur: 0.45, vol: 0.14 * v, when: 1.05, dry: 0.2, dryLp: 350,
      env: [[0.08, 1], [0.6, 0.7], [1, 0.05]],
      formants: [[300, 3, 1], [820, 6, 0.35]], tremRate: 26, tremDepth: 0.85, breath: 0.1, breathF: 500
    });
  },

  // "Bok bok bok… ba-GAWK" — three clipped clucks then the rising fuss.
  s_chicken(v) {
    const k = this._v();
    for (let i = 0; i < 3; i++) {
      const w = i * 0.16, f = 620 * k * (1 + i * 0.05);
      this.fvoice({
        wave: 'square', f0: f, curve: [[0.45, f * 0.62], [1, f * 0.48]],
        dur: 0.1, vol: 0.13 * v, when: w, dry: 0.05,
        env: [[0.12, 1], [0.55, 0.5], [1, 0.05]],
        formants: [[1100, 6, 1, [[1, 780]]], [2400, 9, 0.4]]
      });
      this.noise({ type: 'bandpass', f: 1800, q: 2.2, dur: 0.045, vol: 0.05 * v, when: w, at: 0.003 });
    }
    const g = 480 * k;
    this.fvoice({
      wave: 'sawtooth', f0: g, curve: [[0.3, g * 2.1], [0.6, g * 1.9], [1, g * 1.15]],
      dur: 0.42, vol: 0.16 * v, when: 0.54, dry: 0.05,
      env: [[0.08, 0.8], [0.3, 1], [0.7, 0.75], [1, 0.05]],
      formants: [[1250, 5, 1, [[0.4, 1900], [1, 1300]]], [2700, 9, 0.45]],
      vibRate: 19, vibDepth: 35
    });
  },

  // Four syllables, the last one long and falling: cock-a-doodle-dooooo.
  s_rooster(v) {
    const k = this._v();
    const seq = [[0, 640, 660, 0.2, 0.9], [0.22, 800, 860, 0.17, 1], [0.4, 980, 1080, 0.22, 1], [0.64, 1120, 480, 0.85, 0.95]];
    seq.forEach(([w, a, b, d, lv]) => {
      this.fvoice({
        wave: 'sawtooth', f0: a * k, curve: [[0.25, b * k], [1, b * k * 0.92]],
        dur: d, vol: 0.19 * v * lv, when: w, dry: 0.05,
        env: [[0.07, 1], [0.55, 0.85], [1, 0.06]],
        formants: [[1150, 5, 1, [[1, 900]]], [2500, 8, 0.5], [3600, 12, 0.18]],
        vibRate: 11, vibDepth: 26, breath: 0.05, breathF: 3000
      });
    });
  },

  // Quack: very short, very buzzy, falls fast. Three of them.
  s_duck(v) {
    const k = this._v();
    for (let i = 0; i < 3; i++) {
      const f = 290 * k * (1 - i * 0.05);
      this.fvoice({
        wave: 'sawtooth', f0: f, curve: [[0.35, f * 0.82], [1, f * 0.6]],
        dur: 0.17, vol: 0.2 * v, when: i * 0.21, dry: 0.08, dryLp: 1200,
        env: [[0.08, 1], [0.5, 0.8], [1, 0.05]],
        formants: [[880, 3.5, 1, [[1, 700]]], [2100, 6, 0.6], [3300, 9, 0.25]],
        tremRate: 55, tremDepth: 0.35
      });
    }
  },

  // Woof woof: noisy burst on the front, voiced "oh" body, quick decay.
  s_dog(v) {
    const k = this._v();
    for (let i = 0; i < 2; i++) {
      const w = i * 0.27, f = 290 * k * (i ? 0.92 : 1);
      this.noise({ type: 'bandpass', f: 1100, f1: 500, q: 0.9, dur: 0.07, vol: 0.13 * v, when: w, at: 0.002 });
      this.fvoice({
        wave: 'sawtooth', f0: f * 1.5, curve: [[0.15, f], [0.6, f * 0.72], [1, f * 0.5]],
        dur: 0.24, vol: 0.28 * v, when: w, dry: 0.16, dryLp: 700,
        env: [[0.05, 1], [0.35, 0.65], [1, 0.04]],
        formants: [[520, 4, 1, [[0.4, 700], [1, 450]]], [1350, 7, 0.5], [2600, 10, 0.15]],
        breath: 0.08, breathF: 1200
      });
    }
  },

  // "Me-ow": the vowel glides, which is the whole trick. Plus a purr tail.
  s_cat(v) {
    const k = this._v(), f = 440 * k;
    this.fvoice({
      wave: 'sawtooth', f0: f, curve: [[0.2, f * 1.32], [0.45, f * 1.24], [1, f * 0.76]],
      dur: 0.8, vol: 0.24 * v, dry: 0.06,
      env: [[0.08, 0.85], [0.25, 1], [0.7, 0.8], [0.96, 0.08]],
      formants: [
        [720, 4, 1, [[0.25, 880], [0.6, 700], [1, 560]]],   // "ee" -> "ow"
        [1900, 7, 0.6, [[0.3, 2050], [1, 1250]]],
        [3100, 11, 0.2]
      ],
      vibRate: 6.5, vibDepth: 7, breath: 0.04, breathF: 2400
    });
    this.tone({ wave: 'sawtooth', f0: 48, f1: 52, dur: 0.5, vol: 0.05 * v, when: 0.7, at: 0.12, rel: 0.25, lp: 210, tremRate: 25, tremDepth: 0.9 });
  },

  // Kitten: same shape, an octave up, half the length.
  s_kitten(v) {
    const k = this._v(), f = 760 * k;
    this.fvoice({
      wave: 'sawtooth', f0: f, curve: [[0.25, f * 1.45], [1, f * 0.85]],
      dur: 0.42, vol: 0.19 * v, dry: 0.04,
      env: [[0.1, 1], [0.6, 0.8], [1, 0.06]],
      formants: [[1150, 4, 1, [[0.3, 1450], [1, 950]]], [2600, 8, 0.55], [3900, 12, 0.2]],
      vibRate: 8, vibDepth: 12, breath: 0.05, breathF: 3000
    });
  },

  // Hoo-hoo… hoooo. Almost pure sine: owls are nearly flute-like.
  s_owl(v) {
    const k = this._v();
    const hoot = (when, f, dur, lv) => this.fvoice({
      wave: 'sine', f0: f * k, curve: [[0.25, f * k * 1.04], [1, f * k * 0.9]],
      dur, vol: 0.26 * v * lv, when, dry: 0.35, dryLp: 700,
      env: [[0.22, 1], [0.7, 0.85], [1, 0.05]],
      formants: [[500, 3, 1], [1150, 7, 0.16]],
      vibRate: 5, vibDepth: 2.5, breath: 0.02, breathF: 900
    });
    hoot(0, 395, 0.3, 0.85); hoot(0.42, 390, 0.28, 0.8); hoot(0.86, 330, 0.72, 1);
  },

  // Ribbit: a creaky low croak then a short rising chirp.
  s_frog(v) {
    const k = this._v();
    this.fvoice({
      wave: 'sawtooth', f0: 128 * k, curve: [[1, 118 * k]], dur: 0.2, vol: 0.24 * v, dry: 0.14, dryLp: 500,
      env: [[0.1, 1], [0.7, 0.85], [1, 0.05]],
      formants: [[460, 4, 1], [980, 7, 0.4], [1900, 10, 0.12]],
      tremRate: 33, tremDepth: 0.95
    });
    this.fvoice({
      wave: 'sawtooth', f0: 150 * k, curve: [[0.5, 250 * k], [1, 230 * k]], dur: 0.17, vol: 0.24 * v, when: 0.24, dry: 0.1,
      env: [[0.12, 1], [0.6, 0.8], [1, 0.05]],
      formants: [[640, 4, 1, [[1, 780]]], [1500, 8, 0.4]],
      tremRate: 42, tremDepth: 0.7
    });
  },

  s_bee(v) { this.tone({ wave: 'sawtooth', f0: 220, f1: 200, dur: 0.6, vol: 0.06 * v, lp: 800, tremRate: 30, tremDepth: 0.4 }); },
  s_mouse(v) { this.tone({ wave: 'sine', f0: 3000, f1: 4200, dur: 0.1, vol: 0.15 * v }); this.tone({ wave: 'sine', f0: 3400, f1: 2800, dur: 0.1, vol: 0.15 * v, when: 0.14 }); },

  // Warm, slow, unmistakably asleep: rattly inhale then a soft whistling sigh.
  s_snore(v = 1) {
    const k = 0.9 + Math.random() * 0.25;
    this.fvoice({
      wave: 'sawtooth', f0: 62 * k, curve: [[0.5, 78 * k], [1, 70 * k]], dur: 1.15, vol: 0.1 * v,
      dry: 0.3, dryLp: 260, bus: this.amb,
      env: [[0.3, 0.7], [0.62, 1], [1, 0.05]],
      formants: [[240, 3, 1], [560, 5, 0.3]],
      tremRate: 21, tremDepth: 0.9, breath: 0.22, breathF: 420
    });
    this.noise({ type: 'lowpass', f: 480, f1: 820, dur: 0.95, vol: 0.045 * v, at: 0.45, bus: this.amb });
    // the sigh out
    this.noise({ type: 'lowpass', f: 900, f1: 380, dur: 0.8, vol: 0.05 * v, at: 0.22, when: 1.35, bus: this.amb });
    this.tone({ wave: 'sine', f0: 1250 * k, f1: 980 * k, dur: 0.7, vol: 0.018 * v, at: 0.25, rel: 0.35, when: 1.4, bus: this.amb });
  },

  s_munch(v = 1) { for (let i = 0; i < 4; i++) { this.noise({ type: 'bandpass', f: 900 + Math.random() * 700, q: 1.6, dur: 0.08, vol: 0.12 * v, when: i * 0.16, at: 0.004 }); this.noise({ type: 'lowpass', f: 320, dur: 0.06, vol: 0.06 * v, when: i * 0.16 + 0.03 }); } },
  s_splash(v = 1) { this.noise({ type: 'lowpass', f: 1400, f1: 340, dur: 0.5, vol: 0.26 * v, at: 0.008 }); this.noise({ type: 'bandpass', f: 2800, q: 0.7, dur: 0.3, vol: 0.12 * v, when: 0.04 }); this.tone({ wave: 'sine', f0: 700, f1: 260, dur: 0.22, vol: 0.07 * v, when: 0.02, lp: 900 }); },
  s_boing(v = 1) { this.tone({ wave: 'sine', f0: 200, curve: [[0.15, 520], [1, 235]], dur: 0.38, vol: 0.19 * v, vibRate: 24, vibDepth: 32 }); },
  s_flap(v = 1) { for (let i = 0; i < 4; i++) this.noise({ type: 'lowpass', f: 760 + i * 60, dur: 0.1, vol: 0.13 * v, when: i * 0.11, at: 0.02 }); },
  s_gallop(v = 1) { for (let i = 0; i < 6; i++) { this.noise({ type: 'lowpass', f: 260, dur: 0.07, vol: 0.19 * v, when: i * 0.13 + (i % 2) * 0.03, at: 0.003 }); this.tone({ wave: 'sine', f0: 120, f1: 60, dur: 0.06, vol: 0.08 * v, when: i * 0.13 + (i % 2) * 0.03 }); } },
  s_purr(v = 1) { this.tone({ wave: 'sawtooth', f0: 48, f1: 54, dur: 1.5, vol: 0.09 * v, at: 0.2, rel: 0.45, lp: 200, tremRate: 24, tremDepth: 0.95 }); },
  s_egg(v = 1) { this.tone({ wave: 'sine', f0: 900, f1: 1400, dur: 0.12, vol: 0.13 * v }); this.tone({ wave: 'sine', f0: 1400, f1: 1900, dur: 0.16, vol: 0.13 * v, when: 0.12 }); },
  s_squeakToy(v = 1) { this.tone({ wave: 'sine', f0: 1500, f1: 900, dur: 0.2, vol: 0.12 * v }); },
  s_honk(v = 1) {
    [[0, 300], [0.3, 238]].forEach(([w, f]) => {
      this.fvoice({ wave: 'square', f0: f, curve: [[1, f * 0.97]], dur: 0.3, vol: 0.14 * v, when: w, dry: 0.2, dryLp: 700, formants: [[560, 4, 1], [1300, 7, 0.4]], env: [[0.06, 1], [0.8, 0.9], [1, 0.05]] });
    });
  },
  s_caw(v = 1) {
    for (let i = 0; i < 2; i++) {
      this.fvoice({ wave: 'sawtooth', f0: 760, curve: [[0.3, 900], [1, 480]], dur: 0.28, vol: 0.17 * v, when: i * 0.34, dry: 0.05, formants: [[1300, 5, 1, [[1, 950]]], [2700, 9, 0.45]], env: [[0.07, 1], [0.6, 0.7], [1, 0.05]], tremRate: 30, tremDepth: 0.5 });
    }
  },
  s_firework(v = 1) {
    this.noise({ type: 'lowpass', f: 2600, f1: 260, dur: 0.75, vol: 0.17 * v });
    [1200, 1500, 1900, 2300, 950].forEach((f, i) => this.tone({ wave: 'sine', f0: f, f1: f * 0.7, dur: 0.5, vol: 0.05 * v, when: 0.12 + i * 0.08 }));
  },

  /* ================= UI ================= */
  s_pop(v = 1) { this.tone({ wave: 'sine', f0: 420, curve: [[0.3, 760], [1, 640]], dur: 0.11, vol: 0.15 * v, at: 0.004 }); this.noise({ type: 'bandpass', f: 2600, q: 1.2, dur: 0.03, vol: 0.05 * v, at: 0.002 }); },
  s_ding(v = 1) { [[880, 0.16, 0.55], [1760, 0.07, 0.4], [2637, 0.03, 0.25]].forEach(([f, vv, d]) => this.tone({ wave: 'sine', f0: f, dur: d, vol: vv * v, at: 0.003, rel: d * 0.85 })); },
  // xylophone: fundamental + a bright inharmonic partial + the mallet click
  s_count(v = 1) { this.tone({ wave: 'sine', f0: 784, dur: 0.22, vol: 0.16 * v, at: 0.003, rel: 0.19 }); this.tone({ wave: 'sine', f0: 784 * 2.76, dur: 0.07, vol: 0.05 * v, at: 0.002, rel: 0.06 }); this.noise({ type: 'bandpass', f: 3000, q: 1.5, dur: 0.02, vol: 0.04 * v, at: 0.001 }); },
  // a harp run up the pentatonic with a bell on top
  s_success(v = 1) { [523, 587, 659, 784, 880, 1047].forEach((f, i) => this.pluck({ f0: f, dur: 0.9, vol: 0.14 * v, when: i * 0.07, bright: true, body: 600 })); [[1568, 0.1], [3136, 0.04]].forEach(([f, vv]) => this.tone({ wave: 'sine', f0: f, dur: 0.9, vol: vv * v, when: 0.45, at: 0.004, rel: 0.8 })); },
  // a soft, kind "mm-mm" rather than a buzzer
  s_oops(v = 1) { [[230, 200, 0, 0.2], [200, 170, 0.22, 0.26]].forEach(([a, b, w, d]) => this.fvoice({ wave: 'triangle', f0: a, curve: [[1, b]], dur: d, vol: 0.12 * v, when: w, dry: 0.3, dryLp: 600, formants: [[400, 3, 1], [900, 5, 0.3]], env: [[0.1, 1], [0.8, 0.8], [1, 0.05]] })); },
  s_door(v = 1) { this.tone({ wave: 'sawtooth', f0: 180, f1: 240, dur: 0.5, vol: 0.06 * v, lp: 600, tremRate: 18, tremDepth: 0.9 }); this.noise({ type: 'lowpass', f: 600, f1: 200, dur: 0.4, vol: 0.12 * v, when: 0.35 }); },
  s_doorClose(v = 1) { this.s_door(v); },
  s_whoosh(v = 1) { this.noise({ type: 'bandpass', f: 400, f1: 2000, q: 0.7, dur: 0.4, vol: 0.13 * v, at: 0.15 }); },
  s_sparkle(v = 1) { [1568, 2093, 2637, 3136, 3951].forEach((f, i) => this.tone({ wave: 'sine', f0: f, dur: 0.22, vol: 0.06 * v, when: i * 0.05, at: 0.003, rel: 0.2 })); },
  s_listen(v = 1) { [880, 1175].forEach((f, i) => this.tone({ wave: 'sine', f0: f, dur: 0.3, vol: 0.12 * v, when: i * 0.14, rel: 0.24 })); },

  // Three kinds of songbird, so the hedgerow never sounds like one looped chirp.
  s_bird(v = 1) {
    const kind = U.randInt(0, 2);
    if (kind === 0) {          // robin: a bubbly rising run
      const n = U.randInt(3, 6), base = U.rand(2200, 3000);
      for (let i = 0; i < n; i++) { const f0 = base * Math.pow(1.06, i); this.tone({ wave: 'sine', f0, f1: f0 * 1.25, dur: 0.07, vol: 0.06 * v, when: i * 0.09, at: 0.008, bus: this.amb }); }
    } else if (kind === 1) {   // blackbird: two slow, fluting whistles
      [[2000, 2600, 0.22], [2400, 1900, 0.28]].forEach(([a, b, d], i) => this.tone({ wave: 'sine', f0: a, f1: b, dur: d, vol: 0.055 * v, when: i * 0.3, at: 0.03, rel: 0.1, vibRate: 7, vibDepth: 30, bus: this.amb }));
    } else {                   // finch: a quick trill
      for (let i = 0; i < 8; i++) this.tone({ wave: 'sine', f0: 3400 + (i % 2) * 300, dur: 0.035, vol: 0.045 * v, when: i * 0.045, at: 0.004, bus: this.amb });
    }
  },
  // a gust: the wind swells for a couple of seconds and the leaves rustle
  _gust() {
    if (!this._windGain) return;
    const t = this.now();
    this._windGain.gain.setTargetAtTime(this._windBase * 2.6, t, 0.9);
    this._windGain.gain.setTargetAtTime(this._windBase, t + 2.4, 1.4);
    this.noise({ type: 'bandpass', f: 3800, q: 0.6, dur: 2.2, vol: 0.028, at: 0.7, bus: this.amb, pan: U.rand(-0.5, 0.5) });
  },
  s_cricketChirp(v = 1) { for (let i = 0; i < 3; i++) this.tone({ wave: 'sine', f0: 4200, dur: 0.06, vol: 0.05 * v, when: i * 0.09, tremRate: 60, tremDepth: 0.9, bus: this.amb }); },

  /* ================= ambient beds ================= */
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
    const wg = c.createGain(); wg.gain.value = (mode === 'day' ? 0.035 : 0.05) * (this._sfx.beds[mode] ? 0.6 : 1); this._windGain = wg; this._windBase = wg.gain.value;
    const wl = c.createOscillator(); wl.frequency.value = 0.13; const wlg = c.createGain(); wlg.gain.value = 0.02;
    wl.connect(wlg); wlg.connect(wg.gain);
    wind.connect(wf); wf.connect(wg); wg.connect(this.amb); wind.start(t); wl.start(t);
    this._ambNodes.push(wind, wl);
    this._startBed(mode);
    if (mode === 'night' && !this._bed) {
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
        this._ambNodes.push(o, l1, l2, off1, off2); this._synthCrickets.push(o, l1, l2, off1, off2);
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
    const bed = this._bed && this._bed.mode === mode;   // a real recording is playing; no synthetic birds or crickets on top
    if (mode === 'day') {
      // birds sit at different places along the hedge, so they come from the sides
      if (!bed) tick('bird', 3, 7, () => this.play('bird', ctxInfo.inside ? 0.6 : 1, U.rand(60, 1220)));
      if (!bed) tick('bird2', 6, 12, () => this.play('bird', 0.5, U.rand(60, 1220)));
      tick('gust', 9, 20, () => this._gust());
      tick('bee', 16, 34, () => this.play('bee', 0.7, U.pick([U.rand(60, 300), U.rand(980, 1220)])));
    } else {
      if (!bed) tick('cricket', 7, 14, () => this.s_cricketChirp());
      // far-off frogs by the pond and an owl in the oak, now and then
      if (!ctxInfo.inside && this.hasSample('frog')) tick('frogs', 14, 30, () => this.play('frog', 0.22, U.pick([U.rand(40, 260), U.rand(1020, 1240)])));
      if (!ctxInfo.inside && this.hasSample('owl')) tick('owl', 25, 50, () => this.play('owl', 0.18, U.rand(100, 1180)));
    }
  },

  /* ================= instruments for the songs =================
     All synthesised. The plucked ones are Karplus-Strong strings; the bowed and
     blown ones are oscillators shaped by filters, vibrato and a breath or bow
     noise on the attack. Everything goes to the music bus. */
  i_banjo(f, when, dur, vol) { this.pluck({ f0: f, dur, vol, when, bright: true, body: 420, bus: this.music }); },
  i_guitar(f, when, dur, vol) { this.pluck({ f0: f, dur, vol, when, bright: false, lp: 2400, body: 180, bus: this.music }); },
  i_bass(f, when, dur, vol) { this.pluck({ f0: f, dur, vol, when, bright: false, lp: 620, bus: this.music }); },
  i_mandolin(f, when, vol) { this.pluck({ f0: f, dur: 0.16, vol, when, bright: true, body: 900, bus: this.music, pan: 0.35 }); },
  i_whistle(f, when, dur, vol) {
    this.tone({ wave: 'triangle', f0: f * 0.995, curve: [[0.08, f]], dur, vol, when, at: 0.05, rel: Math.min(0.25, dur * 0.4), lp: 2600, vibRate: 5.2, vibDepth: f * 0.006, bus: this.music, pan: -0.15 });
    this.tone({ wave: 'sine', f0: f * 2, dur: dur * 0.8, vol: vol * 0.22, when, at: 0.06, rel: dur * 0.3, bus: this.music, pan: -0.15 });
    this.noise({ type: 'bandpass', f: 2800, q: 1.2, dur: 0.06, vol: vol * 0.25, when, at: 0.01, bus: this.music, pan: -0.15 });
  },
  i_fiddle(f, when, dur, vol) {
    this.tone({ wave: 'sawtooth', f0: f * 0.99, curve: [[0.1, f]], dur, vol: vol * 0.9, when, at: 0.09, rel: Math.min(0.3, dur * 0.35), bp: 1100, q: 0.7, vibRate: 5.6, vibDepth: f * 0.009, bus: this.music, pan: 0.25 });
    this.tone({ wave: 'sawtooth', f0: f * 1.003, dur, vol: vol * 0.45, when, at: 0.1, rel: Math.min(0.3, dur * 0.35), lp: 3000, vibRate: 5.6, vibDepth: f * 0.009, bus: this.music, pan: 0.25 });
    this.noise({ type: 'bandpass', f: 4200, q: 0.9, dur: 0.08, vol: vol * 0.12, when, at: 0.02, bus: this.music, pan: 0.25 });   // bow bite
  },
  i_kick(when, vol) { this.tone({ wave: 'sine', f0: 120, f1: 44, dur: 0.16, vol, when, at: 0.003, rel: 0.12, bus: this.music }); this.noise({ type: 'lowpass', f: 600, dur: 0.03, vol: vol * 0.5, when, at: 0.002, bus: this.music }); },
  i_snare(when, vol) { this.noise({ type: 'bandpass', f: 2200, q: 0.7, dur: 0.11, vol, when, at: 0.004, bus: this.music }); this.tone({ wave: 'triangle', f0: 190, f1: 120, dur: 0.06, vol: vol * 0.6, when, at: 0.002, bus: this.music }); },
  i_hat(when, vol) { this.noise({ type: 'highpass', f: 7000, dur: 0.035, vol, when, at: 0.002, bus: this.music, pan: 0.2 }); },
  i_spoons(when, vol) { this.noise({ type: 'bandpass', f: 4800, q: 2, dur: 0.025, vol, when, at: 0.001, bus: this.music, pan: -0.3 }); this.tone({ wave: 'sine', f0: 2400, dur: 0.02, vol: vol * 0.5, when, bus: this.music, pan: -0.3 }); },
  i_musicbox(f, when, dur, vol) { [[1, 1, 1], [2.01, 0.25, 0.4], [3.02, 0.1, 0.18]].forEach(([k, vv, dd]) => this.tone({ wave: 'sine', f0: f * k, dur: dur * dd, vol: vol * vv, when, at: 0.004, rel: dur * dd * 0.85, bus: this.music })); },
  i_glock(f, when, vol) { this.tone({ wave: 'sine', f0: f, dur: 0.9, vol, when, at: 0.003, rel: 0.85, bus: this.music, pan: 0.3 }); this.tone({ wave: 'sine', f0: f * 2.7, dur: 0.25, vol: vol * 0.2, when, at: 0.002, rel: 0.22, bus: this.music, pan: 0.3 }); },
  i_pad(freqs, when, dur, vol) { freqs.forEach(f => [0.997, 1.004].forEach(d => this.tone({ wave: 'triangle', f0: f * d, dur, vol: vol / freqs.length, when, at: Math.min(0.6, dur * 0.3), rel: Math.min(0.8, dur * 0.4), lp: 900, bus: this.music }))); },

  /* ================= the songs =================
     Day and night each have a recorded song (music/). Each loops on a bar line
     with an equal-power crossfade, so it never jumps or gaps; switching
     between day and night crossfades from one song into the other. If a song
     can't be loaded, the synthesised arrangements further down play instead. */
  TRACKS: {
    // file, mix gain (measured: -30 / -32 dBFS integrated at the output, under the animals
    // and the narrator), first audible sample, and the loop: bar lines found by beat analysis
    // (120 and 76 BPM) just before each song's ending, joined by an equal-power crossfade.
    day:   { file: 'music/high-meadow-skip-2c8ba75b.m4a', gain: 1.036, onset: 0.28, loopStart: 0.135, loopEnd: 116.132, xfade: 2.0 },
    night: { file: 'music/crickets-in-the-tall-grass-b3e204fe.m4a', gain: 0.855, onset: 0.075, loopStart: 0.448, loopEnd: 104.685, xfade: 3.0 },
  },
  _trk: {}, _players: [], _songTimer: null,
  // fetch at page load (day first, then night) so Play has its song ready
  _preloadTracks() {
    const src = (document.currentScript && document.currentScript.src) || '';
    this._trackBase = src.replace(/js\/audio\.js.*$/, '');
    let chain = Promise.resolve();
    for (const k of ['day', 'night']) {
      const t = this._trk[k] = { failed: false, shift: 0 };
      t.fetched = chain = chain.then(() => fetch(this._trackBase + this.TRACKS[k].file))
        .then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
        .then(ab => { t.ab = ab; }, () => { t.failed = true; });
    }
  },
  _decodeTrack(k) {
    const t = this._trk[k];
    if (!t || !this.ctx) return Promise.reject(new Error('no track'));
    if (!t.decoded) t.decoded = t.fetched
      .then(() => { if (t.failed || !t.ab) throw new Error('fetch failed'); const ab = t.ab; t.ab = null; return this.ctx.decodeAudioData(ab); })
      .then(buf => {
        t.buf = buf;
        // a browser's AAC decoder may keep or drop the encoder's priming samples; find the
        // first sound and shift the loop points by the difference so they stay on the beat
        const s = this._onsetOf(buf) - this.TRACKS[k].onset; t.shift = Math.abs(s) < 0.2 ? s : 0;
        return buf;
      })
      .catch(e => { t.failed = true; throw e; });
    return t.decoded;
  },
  _onsetOf(buf) {
    const d = buf.getChannelData(0); let pk = 0;
    for (let i = 0; i < d.length; i += 7) { const a = Math.abs(d[i]); if (a > pk) pk = a; }
    const thr = pk * 0.00316;                                       // -50 dB, as in the analysis
    for (let i = 0; i < d.length; i++) if (Math.abs(d[i]) > thr) return i / buf.sampleRate;
    return 0;
  },
  // equal-power ramp: keeps the loudness steady through a crossfade
  _eqRamp(param, start, dur, from, to) {
    const n = 64, curve = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = i / (n - 1); curve[i] = Math.max(0.0001, to > from ? from + (to - from) * Math.sin(x * Math.PI / 2) : to + (from - to) * Math.cos(x * Math.PI / 2)); }
    try { param.setValueCurveAtTime(curve, start, dur); }
    catch (e) { param.cancelScheduledValues(start); param.setValueAtTime(Math.max(0.0001, from), start); param.linearRampToValueAtTime(Math.max(0.0001, to), start + dur); }
  },
  _startInstance(mode, when, offset, fadeIn) {
    const T = this.TRACKS[mode], t = this._trk[mode], c = this.ctx;
    const src = c.createBufferSource(); src.buffer = t.buf;
    const g = c.createGain();
    if (fadeIn > 0) { g.gain.setValueAtTime(0.0001, when); this._eqRamp(g.gain, when, fadeIn, 0.0001, T.gain); } else g.gain.setValueAtTime(T.gain, when);
    src.connect(g); g.connect(this.music);
    src.start(when, offset);
    const p = { src, g, mode, vol: T.gain, seamAt: when + (T.loopEnd + t.shift - offset), out: false, next: false };
    src.onended = () => { this._players = this._players.filter(x => x !== p); try { g.disconnect(); } catch (e) { } };
    this._players.push(p);
    return p;
  },
  _playSong(mode) {
    const switching = this._players.some(p => !p.out);
    this._fadeSongs(switching ? 3 : 0.4);                          // day <-> night: a long crossfade between songs
    this._startInstance(mode, this.ctx.currentTime + 0.05, 0, switching ? 3 : 0.6);   // from the top
    if (!this._songTimer) this._songTimer = setInterval(() => this._tickSongs(), 250);
  },
  // schedule each next pass a second ahead, sample-accurately, crossfading at the seam
  _tickSongs() {
    const c = this.ctx; if (!c) return;
    for (const p of this._players.slice()) if (!p.out && !p.next && p.seamAt - c.currentTime <= 1.2) this._seam(p);
    if (!this._players.length) { clearInterval(this._songTimer); this._songTimer = null; }
  },
  // at the loop end, the next pass starts at the loop start and the two crossfade
  _seam(p) {
    p.next = true;
    const T = this.TRACKS[p.mode], t = this._trk[p.mode], at = Math.max(p.seamAt, this.ctx.currentTime + 0.02);
    const q = this._startInstance(p.mode, at, T.loopStart + t.shift, T.xfade);
    this._eqRamp(p.g.gain, at, T.xfade, p.vol, 0.0001);
    try { p.src.stop(at + T.xfade + 0.05); } catch (e) { }
    p.out = true;
    return q;
  },
  _fadeSongs(dur) {
    const now = this.ctx ? this.ctx.currentTime : 0;
    for (const p of this._players) {
      if (p.out) continue;
      p.out = p.next = true;
      const gp = p.g.gain, v = Math.max(0.0001, gp.value);
      gp.cancelScheduledValues(now); gp.setValueAtTime(v, now); gp.linearRampToValueAtTime(0.0001, now + dur);
      try { p.src.stop(now + dur + 0.05); } catch (e) { }
    }
  },

  /* ================= music: step sequencer (fallback) ================= */
  _midi(n) { return 440 * Math.pow(2, (n - 69) / 12); },
  startMusic(mode) {
    if (!this.ctx || this._musicMode === mode) return;
    this._musicMode = mode;
    if (mode === 'day') this._songPass = (this._songPass || 0) + 1;   // a different synth lead each day
    const t = this._trk[mode];
    if (this.TRACKS[mode] && t && !t.failed) {
      this._stopSynth();
      // the song is normally decoded by now; if it is slow, the synth fills in rather than silence
      const fb = setTimeout(() => { if (this._musicMode === mode && !this._players.some(p => p.mode === mode && !p.out)) this._startSynth(); }, 6000);
      this._decodeTrack(mode)
        .then(() => { clearTimeout(fb); if (this._musicMode === mode) { this._stopSynth(); this._playSong(mode); } })
        .catch(() => { clearTimeout(fb); if (this._musicMode === mode) this._startSynth(); });
      return;
    }
    this._fadeSongs(1.5); this._startSynth();
  },
  _startSynth() {
    this._stopSynth();
    this._musicStep = 0; this._musicNext = this.ctx.currentTime + 0.1;
    this._musicTimer = setInterval(() => this._scheduleMusic(), 70);
  },
  _stopSynth() { if (this._musicTimer) clearInterval(this._musicTimer); this._musicTimer = null; },
  stopMusic() { this._stopSynth(); this._fadeSongs(0.3); this._musicMode = null; },
  _scheduleMusic() {
    const c = this.ctx; if (!c) return;
    if (!this.music || this.music.context !== c) { this.stopMusic(); return; }
    const M = this._musicMode === 'day' ? MUSIC.day : MUSIC.night;
    const stepDur = 60 / M.bpm / (M.sub || 2);
    while (this._musicNext < c.currentTime + 0.2) {
      const when = this._musicNext - c.currentTime;
      if (when >= 0) M.play(this, this._musicStep, when, stepDur);   // the song decides how it loops
      this._musicNext += stepDur; this._musicStep++;
    }
  }
};

/* ================= the two songs =================
   DAY  — "Sunny Barn Hoedown": a real arrangement rather than a loop.
          Intro (banjo + bass) · A (whistle) · A (fiddle joins in thirds) ·
          Chorus (kick, spoons, mandolin shimmer) · A on banjo over guitar ·
          Bridge (guitar + whistle, hushed) · Chorus · tag — then round again,
          and the lead swaps between whistle and fiddle from one day to the next.
   NIGHT — "Barn Lullaby": music box · + warm pad · a second tune with a
          glockenspiel echo · + a soft fiddle in thirds. Long enough never to
          repeat inside one night. */
const MUSIC = (() => {
  const N = {}; ['C', 'Cs', 'D', 'Ds', 'E', 'F', 'Fs', 'G', 'Gs', 'A', 'As', 'B'].forEach((n, i) => { for (let o = 2; o <= 6; o++) N[n + o] = 12 * (o + 1) + i; });
  const m = n => 440 * Math.pow(2, (n - 69) / 12);
  // a diatonic third below, in a given major key, for harmony lines
  const thirdBelow = (n, key) => { const sc = [0, 2, 4, 5, 7, 9, 11].map(x => (x + key) % 12); const pc = n % 12, i = sc.indexOf(pc); if (i < 0) return n - 3; let r = Math.floor(n / 12) * 12 + sc[(i + 5) % 7]; if (r >= n) r -= 12; return r; };
  // note length: a melody note lasts until the next one in its bar (legato), capped
  const noteLen = (bar, e, cap) => { let len = 1; for (let k = e + 1; k < bar.length && !bar[k]; k++) len++; return Math.min(len, cap); };

  /* ---------- DAY ---------- */
  const VOICE = { G: [N.G3, N.B3, N.D4, N.G4], C: [N.G3, N.C4, N.E4, N.G4], D: [N.Fs3, N.A3, N.D4, N.G4], Em: [N.E3, N.G3, N.B3, N.G4] };
  const ROOT = { G: N.G2, C: N.C3, D: N.D3, Em: N.E3 }, FIFTH = { G: N.D3, C: N.G3, D: N.A3, Em: N.B3 };
  const TONES = { G: [N.G3, N.B3, N.D4], C: [N.C4, N.E4, N.G4], D: [N.D4, N.Fs4, N.A4], Em: [N.E4, N.G4, N.B4] };
  const roll = [0, 1, 2, 3, 1, 2, 0, 1], rollB = [0, 1, 2, 3, 2, 1, 3, 2];
  const A_CH = ['G', 'G', 'C', 'G', 'G', 'D', 'C', 'G'], B_CH = ['C', 'G', 'C', 'D', 'C', 'G', 'D', 'G'], BR_CH = ['Em', 'C', 'G', 'D', 'Em', 'C', 'D', 'G'];
  const A_MEL = [
    [N.D5, 0, N.B4, 0, N.D5, 0, N.G5, 0], [N.E5, 0, N.D5, 0, N.B4, 0, 0, 0], [N.C5, 0, N.E5, 0, N.G5, 0, N.E5, 0], [N.D5, 0, 0, 0, N.B4, 0, 0, 0],
    [N.D5, 0, N.B4, 0, N.D5, 0, N.G5, 0], [N.A5, 0, N.G5, 0, N.Fs5, 0, N.D5, 0], [N.E5, 0, N.D5, 0, N.B4, 0, N.A4, 0], [N.G4, 0, 0, 0, 0, 0, 0, 0]];
  const B_MEL = [
    [N.E5, N.E5, N.G5, 0, N.E5, 0, N.C5, 0], [N.D5, N.D5, N.B4, 0, N.D5, 0, N.G5, 0], [N.E5, N.E5, N.G5, 0, N.A5, 0, N.G5, 0], [N.Fs5, 0, N.A5, 0, N.D5, 0, 0, 0],
    [N.E5, N.E5, N.G5, 0, N.E5, 0, N.C5, 0], [N.D5, N.D5, N.B4, 0, N.G4, 0, N.B4, 0], [N.A4, 0, N.B4, 0, N.C5, 0, N.A4, 0], [N.G4, 0, 0, 0, 0, 0, 0, 0]];
  const BR_MEL = [
    [N.B4, 0, N.G4, 0, N.E4, 0, N.G4, 0], [N.C5, 0, 0, 0, N.B4, 0, N.A4, 0], [N.G4, 0, N.B4, 0, N.D5, 0, 0, 0], [N.A4, 0, 0, 0, N.Fs4, 0, 0, 0],
    [N.B4, 0, N.G4, 0, N.E4, 0, N.G4, 0], [N.C5, 0, N.E5, 0, N.D5, 0, N.C5, 0], [N.A4, 0, N.B4, 0, N.C5, 0, N.D5, 0], [N.G5, 0, 0, 0, 0, 0, 0, 0]];
  const TAG_MEL = [[N.B4, 0, N.D5, 0, N.G5, 0, 0, 0], [N.G4, 0, 0, 0, 0, 0, 0, 0]];
  const INTRO = { chords: ['G', 'G', 'C', 'D'], mel: null, banjo: true, bass: true, drums: 'none', mix: 0.85 };
  const SECTIONS = [
    { chords: A_CH, mel: A_MEL, lead: 'rotate', harmony: false, banjo: true, guitar: false, mandolin: false, drums: 'light', bass: true },
    { chords: A_CH, mel: A_MEL, lead: 'rotate', harmony: true, banjo: true, guitar: false, mandolin: false, drums: 'light', bass: true },
    { chords: B_CH, mel: B_MEL, lead: 'rotate', harmony: true, banjo: true, guitar: false, mandolin: true, drums: 'full', bass: true, mix: 1.25 },
    { chords: A_CH, mel: A_MEL, lead: 'banjo', harmony: false, banjo: false, guitar: true, mandolin: false, drums: 'light', bass: true },
    { chords: BR_CH, mel: BR_MEL, lead: 'whistle', harmony: false, banjo: false, guitar: true, mandolin: false, drums: 'none', bass: 'soft', mix: 0.6 },
    { chords: B_CH, mel: B_MEL, lead: 'rotate', harmony: true, banjo: true, guitar: false, mandolin: true, drums: 'full', bass: true, mix: 1.3 },
    { chords: ['G', 'G'], mel: TAG_MEL, lead: 'rotate', harmony: false, banjo: true, guitar: false, mandolin: false, drums: 'light', bass: true },
  ];
  const introSteps = INTRO.chords.length * 16, loopSteps = SECTIONS.reduce((a, x) => a + x.chords.length * 16, 0);
  const day = {
    bpm: 106, sub: 4, len: loopSteps, introSteps,
    play(S, step, when, stepDur) {
      let sec, bar, inBar, pass = (S._songPass || 1) - 1;
      if (step < introSteps) { sec = INTRO; bar = Math.floor(step / 16); inBar = step % 16; }
      else {
        const s2 = (step - introSteps) % loopSteps; pass += Math.floor((step - introSteps) / loopSteps);
        let acc = 0; for (const x of SECTIONS) { const n = x.chords.length * 16; if (s2 < acc + n) { sec = x; bar = Math.floor((s2 - acc) / 16); inBar = (s2 - acc) % 16; break; } acc += n; }
      }
      const ch = sec.chords[bar], next = sec.chords[(bar + 1) % sec.chords.length], v = VOICE[ch], eighth = stepDur * 2, mix = sec.mix || 1;
      // banjo forward roll
      if (sec.banjo) { const idx = ((bar % 2) ? rollB : roll)[inBar % 8]; S.i_banjo(m(v[idx] + (inBar >= 8 && idx === 2 ? 12 : 0)), when, 0.95, (inBar % 4 === 0 ? 0.36 : 0.24) * mix); }
      // fingerpicked guitar: bass note, then chord tones, on eighths
      if (sec.guitar && inBar % 2 === 0) { const e = inBar / 2, tn = TONES[ch]; S.i_guitar(m(e % 4 === 0 ? tn[0] - 12 : tn[e % 4 - 1 < 0 ? 0 : e % 4 - 1]), when, 0.75, (e % 4 === 0 ? 0.3 : 0.2) * mix); }
      // mandolin shimmer between the banjo notes, chorus only
      if (sec.mandolin && inBar % 2 === 1) S.i_mandolin(m(v[1 + (inBar >> 1) % 3] + 12), when, 0.07 * mix);
      // upright bass: root, fifth, and a walk-up when the chord is about to change
      if (sec.bass) { const soft = sec.bass === 'soft'; if (inBar === 0) S.i_bass(m(ROOT[ch]), when, 0.9, (soft ? 0.38 : 0.6) * mix); if (inBar === 8) S.i_bass(m(FIFTH[ch]), when, 0.8, (soft ? 0.3 : 0.5) * mix); if (inBar === 14 && next !== ch) S.i_bass(m(ROOT[next] - 2), when, 0.4, 0.4 * mix); }
      // drums
      if (sec.drums === 'light') { if (inBar === 4 || inBar === 12) S.i_snare(when, 0.06); if (inBar % 4 === 2) S.i_hat(when, 0.05); }
      if (sec.drums === 'full') { if (inBar === 0 || inBar === 8) S.i_kick(when, 0.42 * mix); if (inBar === 4 || inBar === 12) S.i_snare(when, 0.11 * mix); if (inBar % 2 === 0) S.i_hat(when, 0.05 * mix); if (inBar === 6 || inBar === 14) S.i_spoons(when, 0.08 * mix); }
      // the tune
      if (sec.mel && inBar % 2 === 0) {
        const e = inBar / 2, line = sec.mel[bar], n = line[e];
        if (n) {
          const dur = noteLen(line, e, 4) * eighth * 0.92, f = m(n);
          const lead = sec.lead === 'rotate' ? (pass % 2 ? 'fiddle' : 'whistle') : sec.lead;
          if (lead === 'whistle') S.i_whistle(f, when, dur, 0.2 * mix);
          else if (lead === 'fiddle') S.i_fiddle(f, when, dur, 0.17 * mix);
          else S.i_banjo(f, when, Math.max(0.5, dur), 0.42 * mix);
          if (sec.harmony) { const h = m(thirdBelow(n, 7)); if (lead === 'whistle') S.i_fiddle(h, when, dur, 0.1 * mix); else S.i_whistle(h, when, dur, 0.12 * mix); }
        }
      }
    }
  };

  /* ---------- NIGHT ---------- */
  const NA_MEL = [
    [N.E5, 0, N.G5, 0, N.A5, 0, 0, 0], [N.G5, 0, N.E5, 0, N.D5, 0, 0, 0], [N.C5, 0, N.D5, 0, N.E5, 0, 0, 0], [N.D5, 0, 0, 0, 0, 0, 0, 0],
    [N.E5, 0, N.G5, 0, N.A5, 0, 0, 0], [N.G5, 0, N.E5, 0, N.D5, 0, 0, 0], [N.C5, 0, N.D5, 0, N.D5, 0, N.C5, 0], [N.C5, 0, 0, 0, 0, 0, 0, 0]];
  const NB_MEL = [
    [N.A5, 0, N.G5, 0, N.F5, 0, N.E5, 0], [N.G5, 0, 0, 0, N.E5, 0, 0, 0], [N.D5, 0, N.E5, 0, N.F5, 0, N.D5, 0], [N.E5, 0, 0, 0, N.C5, 0, 0, 0],
    [N.A5, 0, N.G5, 0, N.F5, 0, N.E5, 0], [N.G5, 0, N.E5, 0, N.C5, 0, N.E5, 0], [N.D5, 0, 0, 0, N.B4, 0, 0, 0], [N.C5, 0, 0, 0, 0, 0, 0, 0]];
  const NA_CH = ['C', 'G', 'Am', 'G', 'C', 'Em', 'F', 'C'], NB_CH = ['F', 'C', 'G', 'C', 'F', 'C', 'G', 'C'];
  const NROOT = { C: N.C3, G: N.G3, Am: N.A3, Em: N.E3, F: N.F3 };
  const NPAD = { C: [N.C4, N.E4, N.G4], G: [N.B3, N.D4, N.G4], Am: [N.A3, N.C4, N.E4], Em: [N.G3, N.B3, N.E4], F: [N.A3, N.C4, N.F4] };
  const NSEC = [
    { chords: NA_CH, mel: NA_MEL, pad: false, glock: false, harmony: false },
    { chords: NA_CH, mel: NA_MEL, pad: true, glock: false, harmony: false },
    { chords: NB_CH, mel: NB_MEL, pad: true, glock: true, harmony: false },
    { chords: NA_CH, mel: NA_MEL, pad: true, glock: true, harmony: true },
  ];
  const nightSteps = NSEC.reduce((a, x) => a + x.chords.length * 8, 0);
  const night = {
    bpm: 66, sub: 2, len: nightSteps,
    play(S, step, when, stepDur) {
      const s2 = step % nightSteps; let sec, bar, inBar, acc = 0;
      for (const x of NSEC) { const n = x.chords.length * 8; if (s2 < acc + n) { sec = x; bar = Math.floor((s2 - acc) / 8); inBar = (s2 - acc) % 8; break; } acc += n; }
      const ch = sec.chords[bar], line = sec.mel[bar], n = line[inBar];
      if (n) {
        const dur = noteLen(line, inBar, 4) * stepDur * 1.1;
        S.i_musicbox(m(n), when, dur, 0.2);
        if (sec.glock) S.i_glock(m(n + 12), when + stepDur * 0.5, 0.045);
        if (sec.harmony) S.i_fiddle(m(thirdBelow(n, 0)), when, dur, 0.055);
      }
      if (inBar === 0) {
        S.tone({ wave: 'sine', f0: m(NROOT[ch]), dur: stepDur * 6, vol: 0.12, when, at: 0.06, rel: stepDur * 4, lp: 600, bus: S.music });
        S.tone({ wave: 'triangle', f0: m(NROOT[ch] + 7), dur: stepDur * 6, vol: 0.035, when, at: 0.12, rel: stepDur * 4, lp: 500, bus: S.music });
        if (sec.pad) S.i_pad(NPAD[ch].map(m), when, stepDur * 8.3, 0.1);
      }
      if (bar === 6 && inBar === 4 && sec.chords === NA_CH) S.tone({ wave: 'sine', f0: m(N.G3), dur: stepDur * 4, vol: 0.12, when, at: 0.06, rel: stepDur * 3, lp: 600, bus: S.music });
    }
  };
  return { day, night };
})();

Sfx._preloadTracks();
Sfx._preloadSfx();
