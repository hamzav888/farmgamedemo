/* ---------- 🦆 Feed the Ducks ----------
   The barn teaches "count what is there"; this teaches "count OUT a number".
   The narrator asks for three ducks; the child taps three ducks and bread flies
   to each. A tray at the top fills in one loaf per duck so a pre-reader can see
   how many are left. The frog on the lily pad is just for fun.
   Teaches: counting to a target (2–5), one-to-one correspondence. */
class FeedDucks {
  static id = 'ducks'; static title = 'Feed the Ducks'; static emoji = '🦆';
  static blurb = 'Count out the bread for the ducks';
  static pose(g) { g.ducks.slice(0, 2).forEach((d, i) => d.fed = i + 1); g.fed = 2; g.ducks[0].say('Quack!', 9); }

  constructor(h) {
    this.h = h; this.t = 0;
    const c = MiniBG.field(1280, 800, { seed: 11 }); const x = c.getContext('2d');
    S.pond(x, 640, 470, 430, 215);
    [[300, 380, true], [980, 400, false], [420, 590, false], [900, 590, true], [640, 330, false]].forEach(([px, py, f]) => S.lilyPad(x, px, py, 22, f));
    [[200, 470], [1085, 470], [640, 712]].forEach(([px, py]) => S.cattail(x, px, py, 0));
    this.bg = c;
    this.ducks = []; this.target = 3; this.fed = 0; this.busy = false; this.crumbs = []; this.ripples = []; this.rippleT = 0; this.frog = null; this.idleT = 0; this.rounds = 0;
  }
  enter() {
    const pz = () => { const a = U.rand(0, 6.28), r = Math.sqrt(Math.random()) * 0.8; return { x: 640 + Math.cos(a) * 430 * r, y: 470 + Math.sin(a) * 215 * r }; };
    this.ducks = [];
    for (let i = 0; i < 5; i++) { const p = pz(); const d = new Animal('duck', p.x, p.y, { variant: i < 3 ? 0 : 1, zone: pz, scale: 1.35, hitPad: 24 }); d.inWater = true; d.fed = 0; d.wig = 0; this.ducks.push(d); }
    this.frog = this.h.makeAnimal('frog', 300, 372, { variant: 0, dir: 1, scale: 1.3 });
    this._ask();
  }
  _ask() {
    this.target = this.rounds === 0 ? 3 : U.randInt(2, 5);
    this.fed = 0; this.busy = false; this.idleT = 0;
    for (const d of this.ducks) d.fed = 0;
    const w = U.numberWord(this.target);
    this.h.narrate(`Can you feed ${w} ducks? Tap ${w} ducks!`);
  }

  update(dt) {
    this.t += dt; this.idleT += dt;
    for (const d of this.ducks) { d.update(dt, {}); d.inWater = true; d.sortY = d.y; if (d.wig > 0) d.wig -= dt; }
    this.frog.update(dt, {});
    for (const c of this.crumbs) {
      c.t += dt;
      if (!c.landed && c.t >= c.dur) { c.landed = true; this.ripples.push({ x: c.x1, y: c.y1 + 16, t: 0, big: true }); Sfx.play('splash', 0.25); }
    }
    this.crumbs = this.crumbs.filter(c => c.t < c.dur + 0.4);
    this.rippleT -= dt;
    if (this.rippleT <= 0) { this.rippleT = U.rand(0.4, 1.2); const a = U.rand(0, 6.28), r = Math.random() * 0.85; this.ripples.push({ x: 640 + Math.cos(a) * 430 * r, y: 470 + Math.sin(a) * 215 * r, t: 0 }); }
    for (const r of this.ripples) r.t += dt;
    this.ripples = this.ripples.filter(r => r.t < 2.2);
  }

  onTap(x, y) {
    if (this.busy) return;
    if (this.frog.hit(x, y) && !this.frog.action) { this.h.animalSpeak(this.frog, 0.8); this.frog.doTrick(); return; }
    const d = this.h.hitAnimal(this.ducks, x, y); if (!d) return;
    this.idleT = 0;
    if (d.fed) { Sfx.play('pop', 0.5); d.wig = 0.5; this.h.narrate('That duck already has bread! Feed a different duck.', { rate: 1 }); return; }
    d.fed = ++this.fed; d.talk(0.8); Sfx.play('duck', 0.8); d.say('Quack!', 1.4);
    this.crumbs.push({ x0: 640, y0: 745, x1: d.x, y1: d.y - 20, t: 0, dur: 0.45, landed: false });
    Sfx.play('count', 0.8);
    const w = U.numberWord(this.fed), W = w[0].toUpperCase() + w.slice(1);
    if (this.fed >= this.target) {
      this.busy = true; this.rounds++; this.h.sparkle(d.x, d.y - 30, 10);
      this.h.celebrate(`${W}! You fed ${w} ducks! Quack quack quack!`, 1, () => this.h.later(() => this._ask(), 700));
    } else this.h.narrate(`${W}...`, { rate: 1 });
  }

  render(ctx) {
    const t = this.t; ctx.drawImage(this.bg, 0, 0);
    ctx.save(); S.pondShape(ctx, 640, 470, 430, 215, 0); ctx.clip();
    for (const r of this.ripples) { const k = r.t / 2.2, b = r.big ? 1.8 : 1; ctx.globalAlpha = (1 - k) * 0.6; D.fillEll(ctx, r.x, r.y, (6 + k * 40) * b, (3 + k * 16) * b, null, '#fff', r.big ? 3 : 2); }
    ctx.globalAlpha = 0.45;
    for (let i = 0; i < 9; i++) { const x = 400 + i * 60 + Math.sin(t * 1.5 + i) * 10, y = 380 + i * 18; D.line(ctx, x - 14, y, x + 14, y, 'rgba(255,255,255,0.7)', 2.5); }
    ctx.restore();
    const ents = [...this.ducks, this.frog].sort((a, b) => a.sortY - b.sortY);
    ents.forEach(a => a.draw(ctx, t));
    for (const c of this.crumbs) {
      const k = Math.min(1, c.t / c.dur), x = U.lerp(c.x0, c.x1, k), y = U.lerp(c.y0, c.y1, k) - Math.sin(k * Math.PI) * 170;
      ctx.save(); ctx.translate(x, y); ctx.globalAlpha = k < 1 ? 1 : Math.max(0, 1 - (c.t - c.dur) / 0.4); MA.crumb(ctx, 6); ctx.restore();
    }
    for (const d of this.ducks) if (d.fed) { const hp = d.headPos(), wig = d.wig > 0 ? Math.sin(d.wig * 30) * 6 : 0; MA.badge(ctx, hp.x + wig, hp.y - 26, d.fed); }
    ents.forEach(a => a.drawBubble(ctx));
    ctx.save(); ctx.translate(640, 762); MA.basket(ctx); ctx.translate(0, -42); MA.bread(ctx, 0.7); ctx.restore();
    // the target, as loaves: filled in as the ducks get fed
    const n = this.target, w = n * 74;
    D.fillRR(ctx, 640 - w / 2 - 16, 92, w + 32, 84, 22, 'rgba(255,255,255,0.88)', OL(), 3);
    for (let i = 0; i < n; i++) { const x = 640 - w / 2 + 37 + i * 74; ctx.save(); ctx.translate(x, 138); ctx.scale(0.55, 0.55); if (i >= this.fed) ctx.globalAlpha = 0.22; MA.bread(ctx, 1); ctx.restore(); }
    D.text(ctx, String(this.target), 640 + w / 2 + 48, 136, 46, '#fff', { stroke: OL(), lw: 7 });
    if (!this.busy && this.idleT > 9) { const d = this.ducks.find(d => !d.fed); if (d) MA.ring(ctx, d.x, d.y - 20, 62, 46, t); }
  }
  hover(x, y) { return !!(this.h.hitAnimal(this.ducks, x, y) || this.frog.hit(x, y)); }
  exit() { }
}
