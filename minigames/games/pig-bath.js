/* ---------- 🐷 Muddy Pig Bath ----------
   A pig in a tub, caked in mud. Rub anywhere and the sponge follows your finger
   and wipes the mud away where you rub, with bubbles and giggles. When he's
   shiny, he jumps for joy — then rolls in the mud and you start again.
   Pure cause-and-effect; the youngest players' favourite kind of game.
   Teaches: fine motor control, persistence, "clean / dirty".

   Everything is drawn big: the pig is ~320px wide so a whole small hand can
   scrub him, and the mud is a separate canvas erased under the finger. */
class PigBath {
  static id = 'bath'; static title = 'Muddy Pig Bath'; static emoji = '🐷';
  static blurb = 'Scrub the muddy pig until he shines';
  static pose(g) {
    for (let y = 400; y < 600; y += 14) for (let x = 520; x < 700; x += 10) g._scrubAt(x, y, 10);
    g.scrub = { x: 700, y: 500 }; g.bubbles.push(g._bubble(640, 470, 18), g._bubble(700, 430, 12), g._bubble(600, 520, 14));
  }
  static PIG = { x: 640, y: 612, s: 4.2 };          // feet position + scale
  static TUB = { x: 640, y: 640, s: 1.9 };
  static DUCK = { x: 420, y: 578 };
  static TAP = { x1: 846, x2: 910, y1: 276, y2: 432, spray: [872, 430] };
  static BOX = { x: 440, y: 340, w: 400, h: 280 };  // where the mud lives, for sampling

  constructor(h) {
    this.h = h; this.t = 0;
    const c = MiniBG.field(1280, 800, { seed: 17 }); const x = c.getContext('2d');
    S.mud(x, 150, 710, 130, 50, 0); S.mud(x, 1130, 700, 120, 46, 0);
    this.bg = c;
    this.mud = document.createElement('canvas'); this.mud.width = 1280; this.mud.height = 800;
    this.mask = document.createElement('canvas'); this.mask.width = 1280; this.mask.height = 800;
    this.pig = null; this.bubbles = []; this.drops = []; this.scrub = null; this.clean = 0; this.sampleT = 0;
    this.busy = false; this.scrubT = 0; this.giggleT = 0; this.variant = 0; this.sprayT = 0; this.duckWig = 0; this.mudTotal = 1; this.rounds = 0;
    this.shine = 0; this._shine = document.createElement('canvas'); this._shine.width = 1280; this._shine.height = 800;
  }
  enter() {
    this._newPig();
    this.h.narrate('Oh no! This pig is covered in mud! Rub the sponge on him to wash it off.');
  }
  _newPig() {
    const P = PigBath.PIG;
    this.variant = (this.variant + 1) % 3;
    this.pig = this.h.makeAnimal('pig', P.x, P.y, { variant: this.variant, dir: 1, scale: P.s });
    this.pig.hitPad = 70; this.busy = false; this.clean = 0; this.bubbles = [];
    this._remud();
  }
  // paint mud splotches, then keep only the part that lies on the pig's body
  _remud() {
    const mk = this.mask.getContext('2d'); mk.clearRect(0, 0, 1280, 800);
    const sh = D.shadow; D.shadow = () => { }; this.pig.draw(mk, 0); D.shadow = sh;   // no mud on the shadow
    const m = this.mud.getContext('2d');
    m.globalCompositeOperation = 'source-over'; m.clearRect(0, 0, 1280, 800);
    for (let i = 0; i < 95; i++) D.fillEll(m, 640 + U.rand(-190, 190), 490 + U.rand(-140, 110), U.rand(30, 80), U.rand(20, 52), U.pick(['#6b4a24', '#8e6a3a', '#7a5530']), null, 0, U.rand(0, 3));
    m.globalCompositeOperation = 'destination-in'; m.drawImage(this.mask, 0, 0);
    m.globalCompositeOperation = 'source-over';
    this.mudTotal = Math.max(1, this._sample());
  }
  _sample() {
    const B = PigBath.BOX, d = this.mud.getContext('2d').getImageData(B.x, B.y, B.w, B.h).data; let n = 0;
    for (let y = 0; y < B.h; y += 8) for (let x = 0; x < B.w; x += 8) if (d[(y * B.w + x) * 4 + 3] > 40) n++;
    return n;
  }
  _bubble(x, y, r) { return { x, y, r, t: 0, life: U.rand(1.2, 2.4), vy: U.rand(20, 50), ph: U.rand(0, 6) }; }

  update(dt) {
    this.t += dt; this.pig.update(dt, {}); this.sampleT -= dt; this.giggleT -= dt;
    if (this.duckWig > 0) this.duckWig -= dt;
    for (const b of this.bubbles) { b.t += dt; b.y -= b.vy * dt; b.x += Math.sin(b.t * 3 + b.ph) * 12 * dt; }
    this.bubbles = this.bubbles.filter(b => b.t < b.life);
    for (const d of this.drops) { d.t += dt; d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 500 * dt; }
    this.drops = this.drops.filter(d => d.t < 1.2);
    if (this.sprayT > 0) { this.sprayT -= dt; const [sx, sy] = PigBath.TAP.spray; for (let i = 0; i < 3; i++) this.drops.push({ x: sx + U.rand(-8, 8), y: sy, vx: U.rand(-90, -30), vy: U.rand(40, 120), t: 0 }); }
    if (!this.busy && this.sampleT <= 0) { this.sampleT = 0.35; this.clean = 1 - this._sample() / this.mudTotal; if (this.clean > 0.9) this._allClean(); }
  }
  _allClean() {
    this.busy = true; this.rounds++; this.clean = 1;
    this.mud.getContext('2d').clearRect(0, 0, 1280, 800);
    for (let i = 0; i < 30; i++) this.bubbles.push(this._bubble(640 + U.rand(-200, 200), 480 + U.rand(-120, 100), U.rand(14, 36)));
    Sfx.play('pig', 0.8); this.pig.talk(1); this.pig.say('Oink!', 1.6); this.pig.happy = true;
    // a shine sweeps across him, then a little jump for joy
    const h = this.h, p = this.pig, y0 = PigBath.PIG.y;
    this.shine = 0.001; h.tween(this, { shine: 1 }, 0.9, { ease: U.easeInOut, onDone: () => { this.shine = 0;
      h.tween(p, { y: y0 - 70 }, 0.24, { onDone: () => h.tween(p, { y: y0 }, 0.28, { onDone: () => h.tween(p, { y: y0 - 40 }, 0.2, { onDone: () => h.tween(p, { y: y0 }, 0.22) }) }) });
    } });
    h.celebrate('All clean! What a shiny, sparkly pig!', 1, () => this.h.later(() => this._muddyAgain(), 1400));
  }
  _muddyAgain() {
    this.h.narrate('Uh oh! He rolled in the mud again!');
    Sfx.play('splash', 0.7);
    for (let i = 0; i < 22; i++) this.h.particles.push({ x: 640 + U.rand(-140, 140), y: 540, vx: U.rand(-180, 180), vy: U.rand(-260, -80), life: 0.9, r: U.rand(4, 10), color: '#8e6a3a' });
    this.h.later(() => { this._newPig(); this.h.narrate('Scrub scrub scrub!'); }, 900);
  }

  onDown(x, y) { this.scrub = { x, y }; this._scrubAt(x, y); }
  onMove(x, y, down) { if (!down || !this.scrub) return; const d = Math.hypot(x - this.scrub.x, y - this.scrub.y); this.scrub = { x, y }; if (d > 2) this._scrubAt(x, y, d); }
  onUp() { this.scrub = null; }
  _scrubAt(x, y, d = 10) {
    if (this.busy) return;
    const R = 64, m = this.mud.getContext('2d'); m.save(); m.globalCompositeOperation = 'destination-out';
    const g = m.createRadialGradient(x, y, 8, x, y, R); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.6, 'rgba(0,0,0,0.9)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    m.fillStyle = g; m.beginPath(); m.arc(x, y, R, 0, Math.PI * 2); m.fill(); m.restore();
    if (!this.pig.hit(x, y)) return;
    this.scrubT += d;
    if (this.scrubT > 30) {
      this.scrubT = 0;
      this.bubbles.push(this._bubble(x + U.rand(-26, 26), y + U.rand(-26, 12), U.rand(8, 22)));
      Sfx.play('bubble', 0.6, x);
    }
    if (this.giggleT <= 0) { this.giggleT = U.rand(1.4, 2.6); Sfx.play('pig', 0.3, x); if (Math.random() < 0.25) Sfx.play('giggle', 0.3); this.pig.talk(0.5); this.pig.happy = true; this.h.later(() => { if (!this.busy) this.pig.happy = false; }, 600); }
  }
  onTap(x, y) {
    const Dk = PigBath.DUCK, T = PigBath.TAP;
    if (Math.hypot(x - Dk.x, y - Dk.y) < 60) { Sfx.play('squeakToy'); this.duckWig = 0.5; }
    if (x > T.x1 && x < T.x2 && y > T.y1 && y < T.y2) { Sfx.play('splash', 0.5); this.sprayT = 0.8; }
  }

  render(ctx) {
    const t = this.t, T = PigBath.TUB, Dk = PigBath.DUCK;
    ctx.drawImage(this.bg, 0, 0);
    ctx.save(); ctx.translate(T.x, T.y); ctx.scale(T.s, T.s); MA.tub(ctx, t); ctx.restore();
    this.pig.draw(ctx, t);
    ctx.drawImage(this.mud, 0, 0);
    ctx.save(); ctx.globalAlpha = 0.55; D.fillRR(ctx, 346, 536, 588, 80, 30, '#74c9ff'); ctx.restore();   // water over his trotters
    if (this.shine > 0 && this.shine < 1) {   // a diagonal gleam, clipped to the pig's body
      const sc = this._shine, x = sc.getContext('2d'); x.clearRect(0, 0, 1280, 800);
      x.save(); x.translate(U.lerp(380, 920, this.shine), 480); x.rotate(-0.5);
      const gr = x.createLinearGradient(-70, 0, 70, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = gr; x.fillRect(-70, -420, 140, 840); x.restore();
      x.globalCompositeOperation = 'destination-in'; x.drawImage(this.mask, 0, 0); x.globalCompositeOperation = 'source-over';
      ctx.drawImage(sc, 0, 0);
    }
    ctx.save(); ctx.translate(Dk.x, Dk.y + Math.sin(t * 2) * 4); ctx.rotate(Math.sin(t * 2.3) * 0.08 + (this.duckWig > 0 ? Math.sin(this.duckWig * 30) * 0.3 : 0)); ctx.scale(1.6, 1.6); MA.rubberDuck(ctx); ctx.restore();
    for (const d of this.drops) D.circle(ctx, d.x, d.y, 4, '#74c9ff', 'rgba(255,255,255,0.7)', 1.2);
    for (const b of this.bubbles) MA.bubble(ctx, b.x, b.y, b.r, Math.max(0, 1 - b.t / b.life));
    this.pig.drawBubble(ctx);
    // the sponge follows the finger, and parks bottom-right between scrubs
    const sx = this.scrub ? this.scrub.x : 1110, sy = this.scrub ? this.scrub.y : 700;
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(this.scrub ? Math.sin(t * 18) * 0.15 : -0.2); const k = this.scrub ? 1.6 : 1.5; ctx.scale(k, k); MA.sponge(ctx); ctx.restore();
    D.fillRR(ctx, 440, 96, 400, 32, 16, 'rgba(255,255,255,0.85)', OL(), 3);
    D.fillRR(ctx, 444, 100, 392 * Math.max(0.02, this.clean), 24, 12, '#48c774');
    D.text(ctx, this.clean > 0.9 ? '✨ Clean!' : '🧽 Scrub!', 640, 113, 21, '#7a3e12');
    if (!this.scrub && !this.busy && this.t < 7) MA.ring(ctx, 1110, 700, 90, 76, t);
  }
  hover() { return true; }
  exit() { }
}
