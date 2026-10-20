/* ---------- Mini-game host ----------
   A mini-game is a class with this shape:

     class MyGame {
       static id = 'veggie'; static title = 'Veggie Patch'; static emoji = '🥕'; static blurb = '...';
       static pose(game) {}       // optional: arrange a nice still for the picker's preview card
       constructor(host) {}
       enter() {}                 // start the first round
       update(dt) {}
       render(ctx) {}
       onDown(x, y) {}            // pointer down
       onMove(x, y, down) {}      // pointer move (down = dragging)
       onUp(x, y) {}              // pointer up
       onTap(x, y) {}             // a quick down+up without much movement
       hover(x, y) { return false; } // optional: pointer cursor
       exit() {}
     }

   There are two hosts. MiniHost (below) runs the standalone hub page.
   MiniScene (js/mini.js) runs the very same game classes INSIDE the main farm
   game as a scene. Everything a host owes a game that has nothing to do with
   the page lives in MiniFX and is mixed into both, so they cannot drift apart. */

const MiniFX = {
  _fxInit() { this.tweens = []; this.confetti = []; this.particles = []; this._timers = []; this._down = null; },

  /* ----- tweens: tiny helper for snapping / returning / bouncing ----- */
  tween(obj, to, dur, o = {}) {
    const from = {}; for (const k in to) from[k] = obj[k];
    const tw = { obj, from, to, dur, t: 0, ease: o.ease || U.easeInOut, onDone: o.onDone, delay: o.delay || 0 };
    // one tween per object+property; a new one replaces the old
    this.tweens = this.tweens.filter(x => !(x.obj === obj && Object.keys(to).some(k => k in x.to)));
    this.tweens.push(tw);
    return tw;
  },
  _updateTweens(dt) {
    for (const tw of this.tweens) {
      if (tw.delay > 0) { tw.delay -= dt; continue; }
      tw.t = Math.min(tw.dur, tw.t + dt);
      const k = tw.ease(tw.t / tw.dur);
      for (const p in tw.to) tw.obj[p] = U.lerp(tw.from[p], tw.to[p], k);
    }
    const done = this.tweens.filter(tw => tw.t >= tw.dur);
    this.tweens = this.tweens.filter(tw => tw.t < tw.dur);
    done.forEach(tw => tw.onDone && tw.onDone());
  },

  /* ----- timers that belong to the running game ----- */
  // cancelled by stop(); skipped if a different game is running when it fires
  later(fn, ms) {
    const g = this.game;
    const id = setTimeout(() => { if (this.game === g) fn(); }, ms);
    this._timers.push(id);
    return id;
  },
  _clearTimers() { this._timers.forEach(clearTimeout); this._timers = []; },

  /* ----- effects ----- */
  sparkle(x, y, n = 8) {
    for (let i = 0; i < n; i++) { const a = U.rand(0, 6.28), sp = U.rand(40, 130); this.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, life: 0.65, r: U.rand(2, 4.5), color: U.pick(['#ffd23f', '#ff9f43', '#fff', '#a29bfe']) }); }
  },
  crumbs(x, y, n = 8, color = '#8e6a3a') {
    for (let i = 0; i < n; i++) { const a = U.rand(-2.6, -0.5), sp = U.rand(60, 150); this.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.55, r: U.rand(2, 4), color }); }
  },
  hearts(x, y, n = 5) {
    for (let i = 0; i < n; i++) this.particles.push({ x: x + U.rand(-20, 20), y, vx: U.rand(-25, 25), vy: -U.rand(40, 80), life: 1.3, r: 5, color: '#ff6b81', type: 'heart' });
  },
  burst(x, y, n = 40) {
    for (let i = 0; i < n; i++) this.confetti.push({ x, y, vx: U.rand(-220, 220), vy: U.rand(-320, -80), t: 0, rot: U.rand(0, 6), vr: U.rand(-8, 8), color: U.pick(['#ff6b6b', '#ffd23f', '#48c774', '#54a0ff', '#a29bfe', '#ff9f43']) });
    Sfx.play('sparkle', 0.8);
  },
  celebrate(text, stars = 1, cb) {
    Sfx.play('success', 0.9);
    for (let i = 0; i < 3; i++) this.later(() => this.burst(U.rand(300, 980), U.rand(180, 420)), i * 260);
    if (stars) this.addStars(stars);
    this.narrate(text, { onend: cb });
  },
  _updateEffects(dt) {
    for (const p of this.particles) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.type !== 'heart') p.vy += 300 * dt; }
    this.particles = this.particles.filter(p => p.life > 0);
    for (const c of this.confetti) { c.t += dt; c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 260 * dt; c.rot += c.vr * dt; }
    this.confetti = this.confetti.filter(c => c.t < 2.6);
  },
  _drawEffects(ctx) {
    for (const p of this.particles) {
      ctx.save(); ctx.globalAlpha = Math.min(1, p.life * 2);
      if (p.type === 'heart') { ctx.translate(p.x, p.y); ctx.fillStyle = p.color; ctx.beginPath(); ctx.moveTo(0, 4); ctx.bezierCurveTo(-8, -4, -4, -10, 0, -5); ctx.bezierCurveTo(4, -10, 8, -4, 0, 4); ctx.fill(); }
      else D.circle(ctx, p.x, p.y, p.r, p.color);
      ctx.restore();
    }
    for (const c of this.confetti) { ctx.save(); ctx.globalAlpha = c.t > 2 ? 2.6 - c.t : 1; ctx.translate(c.x, c.y); ctx.rotate(c.rot); ctx.fillStyle = c.color; ctx.fillRect(-5, -3, 10, 6); ctx.restore(); }
  },

  /* ----- animals ----- */
  // a parked animal: no wander zone, so it just stands, blinks and reacts
  makeAnimal(species, x, y, o = {}) { const a = new Animal(species, x, y, { zone: null, ...o }); a.sortY = y; return a; },
  // say + sound + mouth, the way the farm introduces an animal
  animalSpeak(a, vol = 1) { a.talk(1); Sfx.play(a.cfg.sound, vol); a.say(a.cfg.says, 1.8); },
  hitAnimal(list, x, y) { return Animal.pickHit(list, x, y); },

  /* ----- pointer routing: hosts feed raw events in, games get tap + drag ----- */
  _ptrDown(x, y, id) {
    this._down = { x, y, t: performance.now(), moved: false, id };
    if (this.game && this.game.onDown) this.game.onDown(x, y);
  },
  _ptrMove(x, y, id) {
    if (!this.game) return false;
    if (this._down && this._down.id === id) {
      if (U.dist(x, y, this._down.x, this._down.y) > 12) this._down.moved = true;
      if (this.game.onMove) this.game.onMove(x, y, true);
      return true;
    }
    if (this.game.onMove) this.game.onMove(x, y, false);
    return !!(this.game.hover && this.game.hover(x, y));
  },
  _ptrUp(x, y) {
    if (!this.game || !this._down) return;
    const d = this._down; this._down = null;
    if (this.game.onUp) this.game.onUp(x, y);
    if (!d.moved && performance.now() - d.t < 450 && this.game.onTap) this.game.onTap(x, y);
  }
};

/* ================= standalone host for minigames/index.html ================= */
class MiniHost {
  constructor(games) {
    this.W = 1280; this.H = 800;
    this.games = games;
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    this.stage = document.getElementById('stage');
    this.game = null; this.t = 0; this.lastTime = 0;
    this.started = false; this.speaking = false; this.cardTimer = null; this._pending = null;
    this._fxInit();
    try { this.stars = parseInt(localStorage.getItem('sbf_stars') || '0', 10) || 0; } catch (e) { this.stars = 0; }
    this._setupDPR();
    this._resize(); window.addEventListener('resize', () => this._resize());
    this._bindUI(); this._bindInput();
    MiniHub.buildCards(document.getElementById('hub-grid'), games, this, G => { this._ensureAudio(); Sfx.play('pop'); this.start(G); });
    this._applyUrlFlags();
    // the farm's root service worker also covers this folder; register it here
    // too so a visitor who lands straight on the hub gets offline play as well
    if ('serviceWorker' in navigator && location.protocol !== 'file:') setTimeout(() => navigator.serviceWorker.register('../sw.js').catch(() => { }), 800);
    requestAnimationFrame(ts => this._frame(ts));
  }

  /* ----- stage ----- */
  _setupDPR() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = this.W * dpr; this.canvas.height = this.H * dpr;
    this.canvas.style.width = this.W + 'px'; this.canvas.style.height = this.H + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0); this.dpr = dpr;
  }
  _resize() {
    const s = Math.min(window.innerWidth / this.W, window.innerHeight / this.H);
    this.scale = s;
    this.stage.style.transform = `translate(${-this.W * s / 2}px, ${-this.H * s / 2}px) scale(${s})`;
    document.body.classList.toggle('compact', s < 0.62);
  }
  showHub() {
    this.stop();
    document.getElementById('hub').classList.remove('hidden');
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('star-pill-hub').textContent = '⭐ ' + this.stars;
  }
  _applyUrlFlags() {
    // ?game=veggie  jumps straight in (handy for testing)
    const id = new URLSearchParams(location.search).get('game');
    const G = id && this.games.find(g => g.id === id);
    if (G) setTimeout(() => this.start(G), 50);
  }

  /* ----- game lifecycle ----- */
  start(GameClass) {
    this.stop();
    this._ensureAudio();
    document.getElementById('hub').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    this.setTitle(GameClass.emoji + ' ' + GameClass.title);
    this.GameClass = GameClass;
    // Build now, but only hand the game to the loop once enter() has run —
    // otherwise the frame behind the fade renders a game with no animals yet.
    const g = new GameClass(this);
    this._pending = g;
    this.fade(() => {
      if (this._pending !== g) return;        // stopped or restarted mid-fade
      this._pending = null; this.game = g; this.t = 0;
      g.enter();
    });
  }
  restart() { if (this.GameClass) { Sfx.play('pop'); this.start(this.GameClass); } }
  stop() {
    this._pending = null; this._clearTimers();
    if (this.game && this.game.exit) this.game.exit();
    this.game = null; this.tweens = []; this.confetti = []; this.particles = []; this._down = null;
    this.hideCard(); Voice.cancel();
  }
  fade(cb) {
    const f = document.getElementById('fader');
    f.classList.add('on');
    setTimeout(() => { cb(); setTimeout(() => f.classList.remove('on'), 60); }, 300);
  }

  /* ----- audio ----- */
  _ensureAudio() {
    if (this.started) { if (Sfx.ctx && Sfx.ctx.state === 'suspended') Sfx.ctx.resume(); return; }
    this.started = true;
    if (window.matchMedia && matchMedia('(pointer: coarse)').matches) {
      const el = document.documentElement;
      if (el.requestFullscreen) { try { const p = el.requestFullscreen(); if (p && p.catch) p.catch(() => { }); } catch (e) { } }
    }
    Sfx.init(); Voice.init();
    Sfx.startAmbient('day'); Sfx.startMusic('day');
  }
  narrate(text, opts = {}) {
    this.speaking = true;
    const id = this._narrId = (this._narrId || 0) + 1;
    const g = this.game;                   // the game that asked; its callback dies with it
    Sfx.duck(true);
    Voice.say(text, { ...opts, onend: () => {
      if (id === this._narrId) { this.speaking = false; Sfx.duck(false); }
      if (opts.onend && this.game === g) opts.onend();
    } });
  }

  /* ----- UI ----- */
  _bindUI() {
    const $ = id => document.getElementById(id);
    $('btn-home').addEventListener('click', () => { Sfx.play('pop'); this.showHub(); });
    $('btn-again').addEventListener('click', () => this.restart());
    $('btn-sound').addEventListener('click', e => { const on = !Sfx.enabled; Sfx.setEnabled(on); Voice.enabled = on; if (!on) Voice.cancel(); e.currentTarget.textContent = on ? '🔊' : '🔇'; e.currentTarget.classList.toggle('off', !on); });
    $('btn-music').addEventListener('click', e => { const on = !Sfx.musicOn; Sfx.setMusic(on); e.currentTarget.classList.toggle('off', !on); Sfx.play('pop'); });
    $('btn-farm').addEventListener('click', () => { location.href = '../index.html'; });
    this.$card = $('card'); this.$title = $('title-pill');
    $('star-pill').textContent = '⭐ ' + this.stars;
    $('star-pill-hub').textContent = '⭐ ' + this.stars;
  }
  setTitle(text) { this.$title.textContent = text; }
  addStars(n) {
    this.stars += n;
    try { localStorage.setItem('sbf_stars', String(this.stars)); } catch (e) { }
    ['star-pill', 'star-pill-hub'].forEach(id => {
      const p = document.getElementById(id); if (!p) return;
      p.textContent = '⭐ ' + this.stars;
      p.classList.remove('bump'); void p.offsetWidth; p.classList.add('bump');
    });
    Sfx.play('sparkle', 0.7);
  }
  showCard(emoji, name, subHtml, ms = 3200) {
    document.getElementById('card-emoji').textContent = emoji;
    document.getElementById('card-name').textContent = name.toUpperCase();
    document.getElementById('card-sub').innerHTML = subHtml || '';
    this.$card.classList.remove('hidden');
    this.$card.style.animation = 'none'; void this.$card.offsetWidth; this.$card.style.animation = '';
    clearTimeout(this.cardTimer); this.cardTimer = setTimeout(() => this.hideCard(), ms);
  }
  hideCard() { this.$card.classList.add('hidden'); }

  /* ----- input ----- */
  _bindInput() {
    const toLocal = e => { const r = this.canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * this.W, y: (e.clientY - r.top) / r.height * this.H }; };
    const c = this.canvas;
    c.addEventListener('pointerdown', e => {
      if (!this.game) return;
      e.preventDefault();
      try { c.setPointerCapture(e.pointerId); } catch (x) { }
      this._ensureAudio();
      const p = toLocal(e); this._ptrDown(p.x, p.y, e.pointerId);
    });
    c.addEventListener('pointermove', e => { const p = toLocal(e); c.style.cursor = this._ptrMove(p.x, p.y, e.pointerId) ? 'pointer' : 'default'; });
    const up = e => { const p = toLocal(e); this._ptrUp(p.x, p.y); };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    c.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('gesturestart', e => e.preventDefault());
    document.addEventListener('pointerdown', () => { if (Sfx.ctx && Sfx.ctx.state === 'suspended') Sfx.ctx.resume(); }, { passive: true });
  }

  /* ----- main loop ----- */
  _frame(ts) {
    requestAnimationFrame(t => this._frame(t));
    if (!this.lastTime) this.lastTime = ts;
    let dt = (ts - this.lastTime) / 1000; this.lastTime = ts;
    if (dt > 0.1) dt = 0.1;
    this.t += dt;
    this._updateTweens(dt); this._updateEffects(dt);
    if (this.started) Sfx.updateAmbient(dt, 'day', { inside: false });
    if (!this.game) return;
    this.game.update(dt);
    const ctx = this.ctx;
    ctx.save(); this.game.render(ctx); ctx.restore();
    this._drawEffects(ctx);
  }
}
Object.assign(MiniHost.prototype, MiniFX);
