/* ---------- 🥕 Veggie Patch ----------
   The scarecrow's garden. Vegetable-shaped holes in the soil; the vegetables
   sit in a crate below. Drag each one into the hole that matches its shape.
   Teaches: shape matching, colour words, vegetable names.

   Round 1 is three very different shapes. Round 3 deliberately puts the carrot
   and the pumpkin together — both orange — so the shape has to do the work. */
class VeggiePatch {
  static id = 'veggie'; static title = 'Veggie Patch'; static emoji = '🥕';
  static blurb = 'Match each vegetable to its shape';
  static COLORS = { carrot: 'orange', tomato: 'red', corn: 'yellow', eggplant: 'purple', pumpkin: 'orange', peapod: 'green', cabbage: 'green', radish: 'pink' };
  static ROUNDS = [['carrot', 'tomato', 'corn'], ['tomato', 'eggplant', 'pumpkin', 'peapod'], ['carrot', 'pumpkin', 'cabbage', 'radish', 'corn']];
  // preview: one planted, one mid-air
  static pose(g) {
    const v = g.vegs[0], h = g.holes.find(x => x.kind === v.kind);
    v.placed = true; h.filled = true; v.x = h.x; v.y = h.y; v.s = 1; v.rot = 0; g.placedN = 1;
    const w = g.vegs[1]; w.lifted = true; w.x = 470; w.y = 540; w.s = 1.05; w.rot = 0;
  }

  constructor(h) {
    this.h = h; this.t = 0; this.round = 0;
    this.bg = MiniBG.field(1280, 800, { seed: 3 });
    this.holes = []; this.vegs = []; this.drag = null;
    this.cheer = 0; this.idleT = 0; this.hint = null; this.busy = false; this.placedN = 0;
  }
  enter() {
    this._setup();
    this.h.narrate('Welcome to the veggie patch! Drag each vegetable into the hole that matches its shape.');
  }
  _setup() {
    const R = VeggiePatch.ROUNDS;
    const set = this.round < R.length ? R[this.round] : U.shuffle(Object.keys(MA.VEG)).slice(0, this.round >= 4 ? 6 : 5);
    const n = set.length;
    // holes: one row up to five, two rows beyond that
    const rows = n > 5 ? 2 : 1, per = Math.ceil(n / rows), hsp = Math.min(200, 860 / per);
    const holePos = set.map((_, i) => { const r = Math.floor(i / per), c = i % per, cnt = Math.min(per, n - r * per); return { x: 640 + (c - (cnt - 1) / 2) * hsp, y: rows === 1 ? 372 : 322 + r * 100 }; });
    this.holes = set.map((k, i) => ({ kind: k, x: holePos[i].x, y: holePos[i].y, filled: false, glow: 0, target: 0 }));
    const order = U.shuffle(set), csp = Math.min(200, 900 / n), hs = n > 5 ? 0.7 : 0.8;
    this.vegs = order.map((k, i) => { const x = 640 + (i - (n - 1) / 2) * csp; return { kind: k, x, y: 690, hx: x, hy: 690, s: hs, hs, rot: U.rand(-0.12, 0.12), placed: false, lifted: false }; });
    this.drag = null; this.idleT = 0; this.hint = null; this.busy = false; this.placedN = 0;
  }

  update(dt) {
    this.t += dt; this.idleT += dt;
    for (const ho of this.holes) ho.glow += (ho.target - ho.glow) * Math.min(1, dt * 8);
    if (this.cheer > 0) this.cheer -= dt;
    // after a while with nothing happening, point at one vegetable and its hole
    if (!this.drag && !this.busy && this.idleT > 9) {
      const v = this.vegs.find(v => !v.placed);
      this.hint = v ? { v, hole: this.holes.find(h => h.kind === v.kind) } : null;
    } else this.hint = null;
  }

  _pick(x, y) {
    let best = null, bd = 1e9;
    for (const v of this.vegs) { if (v.placed) continue; const d = Math.hypot(x - v.x, y - v.y); if (d < 72 && d < bd) { bd = d; best = v; } }
    return best;
  }
  onDown(x, y) {
    if (this.busy) return;
    const v = this._pick(x, y); if (!v) return;
    this.drag = { v, ox: v.x - x, oy: v.y - y }; v.lifted = true; this.idleT = 0;
    this.h.tween(v, { s: 1.05, rot: 0 }, 0.15);
    Sfx.play('pop', 0.6);
    const V = MA.VEG[v.kind];
    this.h.showCard(V.emoji, V.name, `A <b>${VeggiePatch.COLORS[v.kind]}</b> ${V.name.toLowerCase()}`);
    this.h.narrate(V.name + '!', { rate: 1 });
  }
  onMove(x, y) {
    if (!this.drag) return;
    const v = this.drag.v; v.x = x + this.drag.ox; v.y = y + this.drag.oy;
    for (const ho of this.holes) ho.target = (!ho.filled && ho.kind === v.kind && Math.hypot(ho.x - v.x, ho.y - v.y) < 110) ? 1 : 0;
  }
  onUp() {
    if (!this.drag) return;
    const v = this.drag.v; this.drag = null; v.lifted = false; this.idleT = 0;
    for (const ho of this.holes) ho.target = 0;
    let near = null, nd = 1e9;
    for (const ho of this.holes) { if (ho.filled) continue; const d = Math.hypot(ho.x - v.x, ho.y - v.y); if (d < 95 && d < nd) { nd = d; near = ho; } }
    const V = MA.VEG[v.kind];
    if (near && near.kind === v.kind) {
      near.filled = true; v.placed = true; this.placedN++;
      this.h.tween(v, { x: near.x, y: near.y, s: 1, rot: 0 }, 0.18, { ease: U.easeOut, onDone: () => this.h.tween(v, { s: 1.18 }, 0.12, { onDone: () => this.h.tween(v, { s: 1 }, 0.16) }) });
      Sfx.play('pop'); Sfx.play('ding', 0.6); this.h.sparkle(near.x, near.y - 20, 12); this.h.crumbs(near.x, near.y + 24, 10);
      if (this.placedN >= this.holes.length) this._complete();
      else this.h.narrate(U.pick([`${V.name}! That's the right shape!`, `Yes! The ${VeggiePatch.COLORS[v.kind]} ${V.name.toLowerCase()} fits!`, 'Great matching!']), { rate: 1 });
    } else {
      if (near) { Sfx.play('oops', 0.6); this.h.narrate(U.pick(['Hmm, that is not the right shape. Try another hole!', 'Not that one! Look at the shape.'])); v.rot = 0.25; }
      this.h.tween(v, { x: v.hx, y: v.hy, s: v.hs, rot: U.rand(-0.12, 0.12) }, 0.3);
    }
  }
  _complete() {
    this.busy = true; this.cheer = 2.4; this.round++;
    Sfx.play('caw', 0.5);
    this.h.celebrate('The garden is full! Hooray! What great matching!', 1, () => this.h.later(() => {
      this._setup();
      this.h.narrate(this.round === 2 ? 'Careful! Two of these are orange. Look at the shape!' : 'Here come some more vegetables!');
    }, 500));
  }

  render(ctx) {
    const t = this.t;
    ctx.drawImage(this.bg, 0, 0);
    // soil bed with rows
    D.fillRR(ctx, 150, 270, 980, 200, 18, '#8e6a3a', OL());
    for (let i = 0; i < 4; i++) D.line(ctx, 170, 300 + i * 46, 1110, 300 + i * 46, 'rgba(0,0,0,0.12)', 10);
    // sunflowers at one end, the scarecrow at the other (he wobbles when he cheers)
    [60, 96, 132].forEach((x, i) => S.sunflower(ctx, x, 470 - (i % 2) * 8, t));
    ctx.save();
    if (this.cheer > 0) { ctx.translate(1205, 470); ctx.rotate(Math.sin(this.cheer * 18) * 0.12 * Math.min(1, this.cheer)); ctx.translate(-1205, -470); }
    S.scarecrow(ctx, 1205, 470, t);
    ctx.restore();
    // holes, then the vegetables planted in them
    for (const ho of this.holes) { ctx.save(); ctx.translate(ho.x, ho.y); MA.drawHole(ctx, ho.kind, { glow: ho.glow }); ctx.restore(); }
    for (const v of this.vegs) if (v.placed) this._drawVeg(ctx, v);
    if (this.hint) MA.ring(ctx, this.hint.hole.x, this.hint.hole.y, 62, 62, t);
    // crate with the loose vegetables; the one being dragged goes on top
    MA.crate(ctx, 150, 600, 980, 170);
    if (this.hint) MA.ring(ctx, this.hint.v.x, this.hint.v.y, 62, 62, t);   // after the crate, or the crate hides it
    for (const v of this.vegs) if (!v.placed && !v.lifted) this._drawVeg(ctx, v);
    for (const v of this.vegs) if (v.lifted) this._drawVeg(ctx, v);
    // progress
    for (let i = 0; i < this.holes.length; i++) { const x = 640 + (i - (this.holes.length - 1) / 2) * 40; D.circle(ctx, x, 96, 12, i < this.placedN ? '#48c774' : 'rgba(255,255,255,0.35)', OL(), 2.5); }
  }
  _drawVeg(ctx, v) { ctx.save(); ctx.translate(v.x, v.y); ctx.rotate(v.rot); ctx.scale(v.s, v.s); MA.drawVeg(ctx, v.kind, { shadow: !v.placed }); ctx.restore(); }
  hover(x, y) { return !!this._pick(x, y); }
  exit() { }
}
