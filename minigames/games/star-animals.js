/* ---------- ⭐ Star Animals ----------
   Night over the farm. Numbered stars hang in the sky in the shape of an
   animal; tap them in order — 1, 2, 3 — and glowing lines join them up. Finish
   the shape and the real animal fades into the constellation and says hello.
   The next star always pulses, so even a two-year-old knows where to tap.
   Teaches: number order 1–7, animal names, the farm's day/night story. */
class StarAnimals {
  static id = 'stars'; static title = 'Star Animals'; static emoji = '⭐';
  static blurb = 'Join the stars 1, 2, 3… and see who appears';
  // points in each animal's own space (facing right, feet at 0,0), traced round the outline
  static SHAPES = {
    pig:     [[44, -40], [34, -66], [-16, -56], [-36, -36], [16, 0]],
    chicken: [[22, -50], [10, -66], [-22, -42], [0, 0], [16, -22]],
    duck:    [[24, -46], [12, -58], [-24, -32], [0, 0], [16, -16]],
    sheep:   [[40, -46], [28, -62], [-12, -56], [-32, -30], [14, 0]],
    cat:     [[30, -42], [22, -62], [-8, -46], [-34, -56], [12, 0]],
    dog:     [[46, -50], [26, -64], [-8, -52], [-30, -62], [12, 0]],
    cow:     [[58, -62], [48, -92], [-16, -72], [-50, -32], [-24, 0], [24, 0]],
    horse:   [[66, -70], [44, -104], [-20, -84], [-52, -52], [-26, 0], [24, 0]],
    goat:    [[44, -60], [30, -82], [-10, -56], [-36, -56], [-22, 0], [20, 0], [36, -40]],
  };
  static pose(g) { g.done = 3; g.lines = g.pts.slice(0, 3); }

  constructor(h) {
    this.h = h; this.t = 0; this.round = 0;
    this.bg = MA.nightSky(1280, 800);
    this.fireflies = []; for (let i = 0; i < 18; i++) this.fireflies.push({ x: U.rand(100, 1180), y: U.rand(520, 740), ph: U.rand(0, 6), a: U.rand(0, 6) });
    this.sp = null; this.animal = null; this.pts = []; this.done = 0; this.lines = []; this.reveal = 0; this.busy = false; this.idleT = 0; this.wiggle = -1; this.moonWob = 0;
    this.SCALE = 3.1; this.CX = 640; this.CY = 580;
  }
  enter() { this._setup(); this.h.narrate('Look at the stars! Tap star number one, then two, then three, and see who appears!'); }
  _setup() {
    const easy = ['pig', 'chicken', 'duck', 'sheep', 'cat', 'dog'], hard = ['cow', 'horse', 'goat'];
    const pool = this.round < 2 ? easy : [...easy, ...hard];
    this.sp = U.pick(pool.filter(s => s !== this.sp));
    this.animal = this.h.makeAnimal(this.sp, this.CX, this.CY, { variant: 0, dir: 1, scale: this.SCALE });
    this.pts = StarAnimals.SHAPES[this.sp].map(([px, py]) => ({ x: this.CX + px * this.SCALE, y: this.CY + py * this.SCALE }));
    this.done = 0; this.lines = []; this.reveal = 0; this.busy = false; this.idleT = 0; this.wiggle = -1;
  }

  update(dt) {
    this.t += dt; this.idleT += dt;
    if (this.animal) this.animal.update(dt, {});
    if (this.moonWob > 0) this.moonWob -= dt;
    for (const f of this.fireflies) { f.ph += dt; f.a += U.rand(-1.5, 1.5) * dt; f.x += Math.cos(f.a) * 16 * dt; f.y += Math.sin(f.a) * 10 * dt; }
    if (!this.busy && this.idleT > 8) { this.idleT = 2; this.h.narrate(`Tap star number ${U.numberWord(this.done + 1)}!`, { rate: 1 }); }
  }

  onTap(x, y) {
    // the moon is a toy: it always answers, even mid-celebration
    if (Math.hypot(x - 1120, y - 130) < 60) { Sfx.play('ding', 0.6); this.moonWob = 0.8; if (!this.busy) this.h.narrate('Hello, moon!', { rate: 1.1 }); return; }
    if (this.busy) return;
    let best = -1, bd = 1e9;
    this.pts.forEach((p, i) => { const d = Math.hypot(x - p.x, y - p.y); if (d < 64 && d < bd) { bd = d; best = i; } });
    if (best < 0) { this.h.sparkle(x, y, 3); return; }
    this.idleT = 0;
    if (best !== this.done) {
      if (best < this.done) { Sfx.play('pop', 0.4); return; }           // already joined: harmless
      this.wiggle = best; Sfx.play('oops', 0.4);
      this.h.narrate(`That's number ${U.numberWord(best + 1)}. Find number ${U.numberWord(this.done + 1)}!`);
      this.h.later(() => this.wiggle = -1, 600);
      return;
    }
    // the right star
    this.done++; this.lines = this.pts.slice(0, this.done);
    Sfx.play('count', 0.9); Sfx.pluck({ f0: 523 * Math.pow(2, (this.done - 1) / 12 * 2), dur: 0.8, vol: 0.3, bright: true, body: 420 });
    this.h.sparkle(this.pts[best].x, this.pts[best].y, 10);
    const w = U.numberWord(this.done), W = w[0].toUpperCase() + w.slice(1);
    if (this.done >= this.pts.length) this._complete(); else this.h.narrate(`${W}!`, { rate: 1.05 });
  }
  _complete() {
    this.busy = true; this.round++;
    const a = this.animal;
    this.h.tween(this, { reveal: 1 }, 1.3, { onDone: () => { this.h.animalSpeak(a, 1); a.doTrick(); } });
    for (let i = 0; i < 4; i++) this.h.later(() => this.h.particles.push({ x: U.rand(150, 1100), y: U.rand(60, 240), vx: -U.rand(260, 380), vy: U.rand(60, 110), life: 1.1, r: 4, color: '#fff6c2', type: 'shoot' }), 300 + i * 420);
    this.h.later(() => this.h.celebrate(`It's a ${a.cfg.name.toLowerCase()}! ${a.cfg.says} The stars made a ${a.cfg.name.toLowerCase()}!`, 1, () => this.h.later(() => { this._setup(); this.h.narrate('Here is another one. Start at number one!'); }, 800)), 1500);
  }

  render(ctx) {
    const t = this.t;
    ctx.drawImage(this.bg, 0, 0);
    ctx.save(); ctx.translate(1120, 130); if (this.moonWob > 0) ctx.rotate(Math.sin(this.moonWob * 20) * 0.15 * this.moonWob); S.moon(ctx, 0, 0, t, 44); ctx.restore();
    for (const f of this.fireflies) { const a = 0.35 + 0.35 * Math.sin(f.ph * 2); D.circle(ctx, f.x, f.y, 3, `rgba(230,255,140,${a})`); }
    // the animal, fading in once the shape is done, with a soft glow beneath
    if (this.reveal > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = this.reveal * 0.6;
      const g = ctx.createRadialGradient(this.CX, this.CY - 120, 20, this.CX, this.CY - 120, 320); g.addColorStop(0, 'rgba(255,240,170,0.55)'); g.addColorStop(1, 'rgba(255,240,170,0)'); ctx.fillStyle = g; ctx.fillRect(this.CX - 340, this.CY - 460, 680, 680);
      ctx.restore();
      ctx.save(); ctx.globalAlpha = this.reveal; this.animal.draw(ctx, t); ctx.restore();
    }
    // joined lines, glowing
    if (this.lines.length > 1) {
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,230,120,0.35)'; ctx.lineWidth = 16; ctx.beginPath(); this.lines.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); if (this.done >= this.pts.length) ctx.closePath(); ctx.stroke();
      ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = '#fff6c2'; ctx.lineWidth = 5; ctx.stroke();
      ctx.restore();
    }
    this.pts.forEach((p, i) => { ctx.save(); ctx.translate(p.x, p.y); MA.numStar(ctx, i + 1, { t, state: i < this.done ? 'done' : i === this.done ? 'next' : 'todo', wiggle: this.wiggle === i }); ctx.restore(); });
    if (this.reveal > 0.9) this.animal.drawBubble(ctx);
    // shooting stars ride the host's particle list with a trail
    for (const s of this.h.particles) if (s.type === 'shoot') { ctx.save(); ctx.globalAlpha = Math.min(1, s.life); ctx.strokeStyle = '#fff6c2'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 0.16, s.y - s.vy * 0.16); ctx.stroke(); ctx.restore(); }
    D.text(ctx, this.busy ? '✨' : `Tap star number ${this.done + 1}`, 640, 108, 30, '#fff6c2', { stroke: 'rgba(10,18,48,0.9)', lw: 6 });
  }
  hover(x, y) { return this.pts.some(p => Math.hypot(x - p.x, y - p.y) < 64); }
  exit() { }
}
