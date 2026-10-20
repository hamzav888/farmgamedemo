/* ---------- 🐄 Big Pen, Little Pen ----------
   Animals come out of the barn one at a time: a big one, then its baby. Drag
   each to the BIG pen (tall fence, big sign) or the little pen (low fence,
   little sign). The sign typography itself teaches the words.
   Teaches: big/little, baby-animal names (calf, lamb, foal...), sorting. */
class BigLittle {
  static id = 'pens'; static title = 'Big Pen, Little Pen'; static emoji = '🐄';
  static blurb = 'Sort the big animals from the little babies';
  static pose(g) {
    g._next(); if (g.cur) { g.cur.y = 350; g.cur.moving = false; }
    const big = g.h.makeAnimal('cow', 250, 660, { scale: 1.1, dir: 1 }), lit = g.h.makeAnimal('cat', 880, 680, { scale: 0.66, dir: -1 });
    big.info = { big: true, name: 'cow' }; lit.info = { big: false, name: 'kitten' };
    g.inPens.big.push(big); g.inPens.little.push(lit);
  }
  // [species, baby name, baby scale, baby variant]
  static PAIRS = [['cow', 'calf', 0.52, 0], ['pig', 'piglet', 0.52, 0], ['sheep', 'lamb', 0.55, 0], ['horse', 'foal', 0.5, 1], ['duck', 'duckling', 0.62, 1], ['cat', 'kitten', 0.6, 0], ['chicken', 'chick', 0.5, 4], ['dog', 'puppy', 0.52, 0], ['goat', 'kid', 0.5, 0]];

  constructor(h) {
    this.h = h; this.t = 0; this.round = 0;
    this.bg = MiniBG.field(1280, 800, { seed: 9, fence: false });
    this.queue = []; this.cur = null; this.inPens = { big: [], little: [] }; this.drag = null;
    this.busy = false; this.emergeT = 0; this.idleT = 0; this.overPen = null; this.total = 0; this.done = 0;
  }
  enter() {
    this._setup();
    this.h.narrate('Big animals go in the BIG pen. Little babies go in the little pen. Drag each animal to its pen!');
  }
  _setup() {
    const pairs = U.shuffle(BigLittle.PAIRS).slice(0, 3), list = [];
    for (const [sp, baby, s, v] of pairs) {
      list.push({ sp, big: true, name: sp, scale: 1.1, variant: 0 });
      list.push({ sp, big: false, name: baby, scale: s * 1.1, variant: v });
    }
    this.queue = U.shuffle(list); this.inPens = { big: [], little: [] }; this.cur = null;
    this.busy = false; this.emergeT = 0.8; this.total = list.length; this.done = 0;
  }
  _next() {
    if (!this.queue.length) return;
    const d = this.queue.shift();
    const a = this.h.makeAnimal(d.sp, 640, 262, { scale: d.scale, variant: d.variant, dir: 1 });
    a.hitPad = 36; a.info = d;
    this.cur = a; a.moving = true;
    this.h.tween(a, { y: 350 }, 0.6, { ease: U.easeOut, onDone: () => { if (this.cur === a) a.moving = false; } });
    this.h.animalSpeak(a, 0.7);
    // early rounds say the answer out loud — that is how the concept gets learned
    const tell = this.round < 2 ? (d.big ? ` The ${d.name} is big.` : ` The ${d.name} is little.`) : '';
    this.h.narrate(`A ${d.name}!${tell} Which pen?`);
    this.idleT = 0;
  }

  update(dt) {
    this.t += dt; this.idleT += dt;
    if (this.emergeT > 0) { this.emergeT -= dt; if (this.emergeT <= 0 && !this.cur && this.queue.length) this._next(); }
    if (this.cur) { this.cur.update(dt, {}); if (this.cur.moving) this.cur.phase += dt * 9; }
    for (const k in this.inPens) for (const a of this.inPens[k]) { a.update(dt, {}); if (a.moving && !a.zone) a.phase += dt * 9; }
  }
  _pen(x, y) {
    if (x > 70 && x < 570 && y > 400 && y < 760) return 'big';
    if (x > 710 && x < 1210 && y > 440 && y < 760) return 'little';
    return null;
  }
  onDown(x, y) {
    if (this.busy || !this.cur || !this.cur.hit(x, y)) return;
    const a = this.cur; this.drag = { ox: a.x - x, oy: a.y - y }; this.idleT = 0;
    Sfx.play('pop', 0.5); a.happy = true;
  }
  onMove(x, y) {
    if (!this.drag || !this.cur) return;
    const a = this.cur; a.x = x + this.drag.ox; a.y = y + this.drag.oy;
    this.overPen = this._pen(a.x, a.y);
  }
  onUp() {
    if (!this.drag || !this.cur) return;
    this.drag = null; const a = this.cur, pen = this._pen(a.x, a.y); this.overPen = null; a.happy = false; this.idleT = 0;
    if (!pen) { this.h.tween(a, { x: 640, y: 350 }, 0.35); return; }
    const want = a.info.big ? 'big' : 'little';
    if (pen === want) {
      this.busy = true;
      const slot = this.inPens[pen].length;
      const sx = (pen === 'big' ? 170 : 800) + slot * 150, sy = (pen === 'big' ? 660 : 680) + (slot % 2) * 22;
      this.inPens[pen].push(a); this.cur = null; this.done++;
      a.dir = sx > a.x ? 1 : -1; a.moving = true;
      this.h.tween(a, { x: sx, y: sy }, 0.5, { onDone: () => {
        a.moving = false; a.dir = 1;
        // once home, the pen is theirs to wander — the farm's own wander AI takes over
        a.zone = pen === 'big' ? { x1: 125, y1: 545, x2: 515, y2: 715 } : { x1: 765, y1: 565, x2: 1155, y2: 715 };
        a.state = 'idle'; a.stateT = U.rand(1, 3); a.speedMul = 0.7;
      } });
      Sfx.play('ding', 0.6); this.h.sparkle(sx, sy - 40, 10); this.h.animalSpeak(a, 0.6);
      if (this.done >= this.total) { this.round++; this.h.later(() => this._finish(), 500); }
      else {
        this.h.narrate(U.pick([`Yes! The ${a.info.name} is ${want}.`, `${want === 'big' ? 'Big' : 'Little'} ${a.info.name}, ${want} pen!`, 'Good sorting!']), { rate: 1 });
        this.h.later(() => { this.busy = false; this._next(); }, 1100);
      }
    } else {
      Sfx.play('oops', 0.6);
      this.h.narrate(a.info.big ? `The ${a.info.name} is BIG! Big animals go in the big pen.` : `The ${a.info.name} is little! Little animals go in the little pen.`);
      this.h.tween(a, { x: 640, y: 350 }, 0.4);
    }
  }
  _finish() {
    const all = [...this.inPens.big, ...this.inPens.little];
    all.forEach((a, i) => this.h.later(() => this.h.animalSpeak(a, 0.5), i * 220));
    this.h.celebrate('Everyone is in the right pen! Big ones here, little ones there!', 1, () => this.h.later(() => { this._setup(); this.h.narrate('Here come some more animals!'); }, 500));
  }
  onTap(x, y) { if (this.cur && this.cur.hit(x, y) && !this.drag) this.h.animalSpeak(this.cur, 0.8); }

  render(ctx) {
    const t = this.t; ctx.drawImage(this.bg, 0, 0);
    ctx.save(); ctx.translate(640, 262); ctx.scale(0.62, 0.62); S.barn(ctx, 0, 0, { night: 0, doorOpen: 1 }); ctx.restore();
    const fence = (x1, y1, x2, y2, o) => { const n = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1) / 64)); for (let i = 0; i < n; i++) S.fenceSeg(ctx, U.lerp(x1, x2, i / n), U.lerp(y1, y2, i / n), U.lerp(x1, x2, (i + 1) / n), U.lerp(y1, y2, (i + 1) / n), { ...o, end: i === n - 1 }); };
    const BIG = { h: 48, w: 12 }, LIT = { h: 24, w: 8 };
    fence(70, 400, 570, 400, BIG); fence(70, 400, 70, 760, BIG); fence(570, 400, 570, 760, BIG);
    fence(710, 440, 1210, 440, LIT); fence(710, 440, 710, 760, LIT); fence(1210, 440, 1210, 760, LIT);
    MA.sign(ctx, 320, 400, 'BIG', 190, true); MA.sign(ctx, 960, 440, 'little', 150, false);
    if (this.overPen) { const big = this.overPen === 'big'; D.fillRR(ctx, big ? 80 : 720, big ? 410 : 450, 490, 340, 20, 'rgba(255,240,120,0.28)'); }
    const ents = [...this.inPens.big, ...this.inPens.little]; if (this.cur) ents.push(this.cur);
    ents.sort((a, b) => a.y - b.y).forEach(a => a.draw(ctx, t));
    fence(70, 760, 570, 760, BIG); fence(710, 760, 1210, 760, LIT);
    ents.forEach(a => a.drawBubble(ctx));
    if (this.cur && !this.drag && this.idleT > 8) {
      MA.ring(ctx, this.cur.x, this.cur.y - 40, 90, 70, t);
      const big = this.cur.info.big; MA.ring(ctx, big ? 320 : 960, big ? 600 : 620, 130, 60, t);
    }
    for (let i = 0; i < this.total; i++) { const x = 640 + (i - (this.total - 1) / 2) * 40; D.circle(ctx, x, 96, 12, i < this.done ? '#48c774' : 'rgba(255,255,255,0.35)', OL(), 2.5); }
  }
  hover(x, y) { return !!(this.cur && this.cur.hit(x, y)); }
  exit() { }
}
