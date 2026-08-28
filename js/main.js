/* ---------- Game controller ---------- */
class Game {
  constructor() {
    this.W = 1280; this.H = 800;
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    this.stage = document.getElementById('stage');
    this.mode = 'day'; this.dark = 0; this.dayTimer = 0;
    this.DAY_LEN = 120; this.NIGHT_LEN = 75;
    this.autoCycle = true;
    this.speaking = false;
    this.started = false; this.sceneName = 'farm';
    this.lastTime = 0; this.t = 0;
    this._pendingClick = null; this._lastDown = { t: 0, x: 0, y: 0 };
    this.cardTimer = null; this.barnVisited = false; this.hintT = 0;
    try { this.stars = parseInt(localStorage.getItem('sbf_stars') || '0', 10) || 0; } catch (e) { this.stars = 0; }
    this._setupDPR();
    this._resize(); window.addEventListener('resize', () => this._resize());
    this.farm = new FarmScene(this);
    this.barn = new BarnScene(this);
    this._bindUI();
    this._bindInput();
    this._applyUrlFlags();
    requestAnimationFrame(ts => this._frame(ts));
  }
  // Optional URL flags for quick testing: ?start  ?night  ?barn  ?quiz  ?card
  _applyUrlFlags() {
    const q = new URLSearchParams(location.search);
    if (!q.has('start') && !q.has('night') && !q.has('barn')) return;
    setTimeout(() => {
      this.start();
      if (q.has('night')) { this.setMode('night', false); this.dark = 1; this.farm.animals.forEach(a => a.hidden = true); }
      if (q.has('barn')) { this.sceneName = 'barn'; this.barn.enter(); this.$barnUI.classList.remove('hidden'); Sfx.setMuffled(true); this._updateBarnUI(); }
      if (q.has('quiz')) setTimeout(() => this.barn.startQuiz(), 300);
      if (q.has('card')) setTimeout(() => this.introduce(this.farm.animals[0]), 300);
    }, 50);
  }
  _setupDPR() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = this.W * dpr; this.canvas.height = this.H * dpr;
    this.canvas.style.width = this.W + 'px'; this.canvas.style.height = this.H + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.dpr = dpr;
  }
  _resize() {
    const s = Math.min(window.innerWidth / this.W, window.innerHeight / this.H);
    this.scale = s;
    this.stage.style.transform = `translate(${-this.W * s / 2}px, ${-this.H * s / 2}px) scale(${s})`;
    // phones/tablets shrink the stage a lot — switch to bigger buttons & text
    document.body.classList.toggle('compact', s < 0.62);
  }
  get scene() { return this.sceneName === 'farm' ? this.farm : this.barn; }

  /* ----- UI ----- */
  _bindUI() {
    const $ = id => document.getElementById(id);
    $('btn-start').addEventListener('click', () => this.start());
    $('btn-help').addEventListener('click', () => { $('splash').classList.remove('hidden'); $('btn-start').textContent = '▶ Back to the farm!'; });
    $('btn-daynight').addEventListener('click', () => { Sfx.play('pop'); this.setMode(this.mode === 'day' ? 'night' : 'day', true); });
    $('btn-sound').addEventListener('click', e => { const on = !Sfx.enabled; Sfx.setEnabled(on); Voice.enabled = on; if (!on) Voice.cancel(); e.currentTarget.textContent = on ? '🔊' : '🔇'; e.currentTarget.classList.toggle('off', !on); });
    $('btn-music').addEventListener('click', e => { const on = !Sfx.musicOn; Sfx.setMusic(on); e.currentTarget.classList.toggle('off', !on); Sfx.play('pop'); });
    $('btn-outside').addEventListener('click', () => this.exitBarn());
    $('btn-quiz').addEventListener('click', () => { Sfx.play('pop'); if (this.barn.quiz && this.barn.quiz.state === 'ask') { this.barn.stopQuiz(); this.barn.resetCounts(); } else this.barn.startQuiz(); });
    $('btn-recount').addEventListener('click', () => { Sfx.play('pop'); this.barn.stopQuiz(); this.barn.resetCounts(); this.narrate('Okay! Tap the animals to count them again.'); });
    this.$card = $('card'); this.$quiz = $('quiz'); this.$tapHint = $('tap-hint'); this.$barnUI = $('barn-ui'); this.$hint = $('barn-hint');
    $('star-pill').textContent = '⭐ ' + this.stars;
  }
  addStars(n) {
    this.stars += n;
    try { localStorage.setItem('sbf_stars', String(this.stars)); } catch (e) { }
    const p = document.getElementById('star-pill');
    p.textContent = '⭐ ' + this.stars;
    p.classList.remove('bump'); void p.offsetWidth; p.classList.add('bump');
    Sfx.play('sparkle', 0.7);
  }
  start() {
    document.getElementById('splash').classList.add('hidden');
    if (this.started) return;
    this.started = true;
    // go fullscreen on touch devices for a proper game feel (silently ignored where unsupported, e.g. iPhone)
    if (window.matchMedia && matchMedia('(pointer: coarse)').matches) {
      const el = document.documentElement;
      if (el.requestFullscreen) { try { const p = el.requestFullscreen(); if (p && p.catch) p.catch(() => { }); } catch (e) { } }
    }
    Sfx.init(); Voice.init();
    Sfx.startAmbient('day'); Sfx.startMusic('day');
    this.hintT = 14; this.$tapHint.classList.remove('hidden');
    setTimeout(() => this.narrate('Welcome to Sunny Barn Farm! Tap the animals to say hello!'), 400);
  }
  _bindInput() {
    const toLocal = e => { const r = this.canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * this.W, y: (e.clientY - r.top) / r.height * this.H }; };
    this.canvas.addEventListener('pointerdown', e => {
      if (!this.started) return;
      e.preventDefault();
      const p = toLocal(e), now = performance.now();
      const isDouble = now - this._lastDown.t < 320 && U.dist(p.x, p.y, this._lastDown.x, this._lastDown.y) < 40;
      this._lastDown = { t: now, x: p.x, y: p.y };
      if (isDouble) {
        if (this._pendingClick) { clearTimeout(this._pendingClick.timer); this._pendingClick = null; }
        this._lastDown.t = 0;
        this.scene.onDouble(p.x, p.y);
      } else {
        const timer = setTimeout(() => { this._pendingClick = null; this.scene.onSingle(p.x, p.y); }, 240);
        this._pendingClick = { timer };
      }
    });
    this.canvas.addEventListener('pointermove', e => {
      if (!this.started) return;
      const p = toLocal(e);
      this.canvas.style.cursor = this.scene.hover(p.x, p.y) ? 'pointer' : 'default';
    });
    // fallback: on first interaction anywhere, resume audio
    document.addEventListener('pointerdown', () => { if (Sfx.ctx && Sfx.ctx.state === 'suspended') Sfx.ctx.resume(); }, { passive: true });
    // mobile: no long-press menus or pinch zoom on the game
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('gesturestart', e => e.preventDefault());
  }

  /* ----- day / night ----- */
  setMode(mode, manual) {
    if (mode === this.mode) return;
    this.mode = mode; this.dayTimer = 0;
    this.farm.onModeChange(mode);
    const b = document.getElementById('btn-daynight');
    b.textContent = mode === 'day' ? '🌞' : '🌙'; b.classList.toggle('night', mode === 'night');
    Sfx.startAmbient(mode); Sfx.startMusic(mode);
    if (manual) {
      if (mode === 'night') this.narrate(this.sceneName === 'farm' ? 'It is getting dark! Time for the animals to go to bed. Tap the barn to see them sleep!' : 'It is night time now. Shhh, everyone is sleeping.');
      else this.narrate('Good morning! The sun is up and the animals are coming outside!');
    } else {
      if (mode === 'night') this.narrate(this.sceneName === 'farm' ? 'The sun is setting. Time for bed, animals!' : 'It is night time now. Shhh, everyone is sleeping.');
      else this.narrate('Good morning! Cock-a-doodle-doo!');
    }
    if (mode === 'day') { this.barn.stopQuiz(); this.barn.resetCounts(); }
    // each nightfall, remind little players where the fun is
    if (mode === 'night' && this.sceneName === 'farm' && this.started) { this.hintT = 12; this.$tapHint.classList.remove('hidden'); }
    this._updateBarnUI();
  }
  _updateBarnUI() {
    if (this.sceneName !== 'barn') return;
    const night = this.mode === 'night';
    document.getElementById('barn-actions').style.display = night ? 'flex' : 'none';
    this.$hint.textContent = night ? '🌙 Tap the sleeping animals to count them! Tap twice to hear them.' : '🌞 Everyone is outside! Tap the 🌙 button to make it night.';
  }

  /* ----- scene transitions ----- */
  fade(cb) {
    const f = document.getElementById('fader');
    f.classList.add('on');
    setTimeout(() => { cb(); setTimeout(() => f.classList.remove('on'), 60); }, 380);
  }
  enterBarn() {
    if (this.sceneName === 'barn') return;
    Sfx.play('door'); this.barnVisited = true; this.$tapHint.classList.add('hidden');
    this.fade(() => {
      this.sceneName = 'barn'; this.barn.enter();
      this.$barnUI.classList.remove('hidden');
      Sfx.setMuffled(true);
      this._updateBarnUI();
      this.hideCard();
      if (this.mode === 'night') this.narrate('Shhh... all the animals are sleeping in the barn. Tap them to count them!');
      else this.narrate('The barn is empty right now — everyone is playing outside! Tap the moon button to make it night time.');
    });
  }
  exitBarn() {
    if (this.sceneName === 'farm') return;
    Sfx.play('door');
    this.fade(() => {
      this.sceneName = 'farm'; this.$barnUI.classList.add('hidden');
      Sfx.setMuffled(false); this.barn.stopQuiz(); this.hideCard();
    });
  }

  /* ----- learning helpers ----- */
  introduce(a) {
    // single tap: name + sound
    const cfg = a.cfg;
    a.talk(1); Sfx.play(cfg.sound, 1); a.say(cfg.says, 2);
    this.showCard(a);
    const article = /^[aeiou]/i.test(cfg.name) ? 'an' : 'a';
    const sayText = cfg.says.replace(/!/g, '');
    setTimeout(() => this.narrate(`${cfg.name}! This is ${article} ${cfg.name.toLowerCase()}. The ${cfg.name.toLowerCase()} says ${sayText}!`), 350);
  }
  trick(a) {
    const cfg = a.cfg;
    Voice.cancel();
    a.doTrick();
    a.say(cfg.trickText, 1.8);
    const delay = ['munch', 'splash'].includes(cfg.trickSound) ? 500 : 0;
    setTimeout(() => Sfx.play(cfg.trickSound, 1), delay);
    if (cfg.trick === 'flap') setTimeout(() => Sfx.play('egg'), 900);
    if (cfg.trick === 'rear') Sfx.play('horse', 0.8);
    if (cfg.trick === 'jump') Sfx.play('cow', 0.7);
    if (cfg.trick === 'roll') Sfx.play('pig', 0.8);
    this.showCard(a, true);
  }
  showCard(a, trick = false) {
    const cfg = a.cfg;
    document.getElementById('card-emoji').textContent = cfg.emoji;
    document.getElementById('card-name').textContent = cfg.name.toUpperCase();
    document.getElementById('card-sub').innerHTML = trick ? `${cfg.trickText}` : `The ${cfg.name.toLowerCase()} says <b>${cfg.says}</b>`;
    this.$card.classList.remove('hidden');
    // restart pop animation
    this.$card.style.animation = 'none'; void this.$card.offsetWidth; this.$card.style.animation = '';
    clearTimeout(this.cardTimer); this.cardTimer = setTimeout(() => this.hideCard(), 3800);
  }
  hideCard() { this.$card.classList.add('hidden'); }
  narrate(text, opts = {}) {
    this.speaking = true;
    const id = this._narrId = (this._narrId || 0) + 1;
    Sfx.duck(true); // music & ambience dip so the voice is easy to hear
    Voice.say(text, { ...opts, onend: () => {
      if (id === this._narrId) { this.speaking = false; Sfx.duck(false); }
      if (opts.onend) opts.onend();
    } });
  }
  showQuiz(question, maxN, cb) {
    document.getElementById('quiz-q').textContent = question;
    const box = document.getElementById('quiz-choices'); box.innerHTML = '';
    const colors = ['#ff6b6b', '#ff9f43', '#ffd23f', '#48c774', '#54a0ff', '#a29bfe', '#fd79a8', '#00cec9'];
    for (let n = 1; n <= maxN; n++) {
      const b = document.createElement('button'); b.className = 'num-btn'; b.textContent = n; b.style.background = colors[(n - 1) % colors.length];
      b.addEventListener('click', () => cb(n)); box.appendChild(b);
    }
    this.$quiz.classList.remove('hidden'); this.$hint.classList.add('hidden');
    document.getElementById('btn-quiz').textContent = '✖ Stop Quiz';
  }
  markQuizAnswer(n, right) { const btns = document.querySelectorAll('.num-btn'); const b = btns[n - 1]; if (b) b.classList.add(right ? 'right' : 'wrong'); if (right) btns.forEach((x, i) => { if (i !== n - 1) x.classList.add('wrong'); }); }
  resetQuizButtons() { document.querySelectorAll('.num-btn').forEach(b => b.classList.remove('right', 'wrong')); }
  hideQuiz() { this.$quiz.classList.add('hidden'); this.$hint.classList.remove('hidden'); document.getElementById('btn-quiz').textContent = '🧮 Quiz Me!'; }

  /* ----- main loop ----- */
  _frame(ts) {
    requestAnimationFrame(t => this._frame(t));
    if (!this.lastTime) this.lastTime = ts;
    let dt = (ts - this.lastTime) / 1000; this.lastTime = ts;
    if (dt > 0.1) dt = 0.1;
    this.t += dt;
    if (this.started) {
      // auto day/night cycle
      if (this.autoCycle) {
        this.dayTimer += dt;
        if (this.mode === 'day' && this.dayTimer > this.DAY_LEN) this.setMode('night', false);
        else if (this.mode === 'night' && this.dayTimer > this.NIGHT_LEN) this.setMode('day', false);
      }
      const target = this.mode === 'night' ? 1 : 0;
      this.dark += (target - this.dark) * Math.min(1, dt * 0.55);
      if (Math.abs(this.dark - target) < 0.004) this.dark = target;
      // hint
      if (this.hintT > 0) { this.hintT -= dt; if (this.hintT <= 0 || this.sceneName === 'barn') this.$tapHint.classList.add('hidden'); }
      Sfx.updateAmbient(dt, this.mode, { inside: this.sceneName === 'barn' });
    }
    // update both scenes lightly (farm keeps living while inside)
    this.farm.update(dt);
    if (this.sceneName === 'barn') this.barn.update(dt);
    // render
    const ctx = this.ctx;
    ctx.save();
    this.scene.render(ctx);
    ctx.restore();
  }
}

window.addEventListener('load', () => { window.game = new Game(); });
