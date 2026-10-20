/* ---------- 🔍 Hide & Seek ----------
   "Where's the cow?" She's behind the tree with both ends poking out, or in
   the hay with her ears showing, or in the pond with her eyes above the
   water. Tap the bit you can see and she pops out. Stuck for a few seconds?
   She moos — so you can find her by listening.
   Teaches: observation, listening, animal names, "behind / in / under". */
class HideSeek {
  static id = 'hide'; static title = 'Hide & Seek'; static emoji = '🔍';
  static blurb = 'Who is hiding? Find the animals around the farm';
  static POOL = ['cow', 'pig', 'sheep', 'chicken', 'duck', 'horse', 'cat', 'dog', 'goat'];
  static pose(g) { const h = g.hiders[0]; if (h) { h.found = true; h.a.y = h.spot.outY; h.a.scale *= 1.15; h.a.say('Found me!', 9); } }

  constructor(h) {
    this.h = h; this.t = 0; this.round = 0;
    const c = MiniBG.field(1280, 800, { seed: 29, flowers: [[80, 300], [1200, 300]] }); const x = c.getContext('2d');
    S.pond(x, 1040, 660, 190, 95);
    this.bg = c;
    // Each spot: where the animal stands, what covers it (drawn after it), and
    // where its top edge is so the animal can be lifted to peek over it.
    this.spots = [
      { id: 'tree', name: 'behind the tree', x: 150, y: 560, dir: 1, coverTop: null, lift: -16, outY: 610, cover: ctx => S.tree(ctx, 150, 560, this.t, { s: 1.6 }) },
      { id: 'hay', name: 'in the hay', x: 520, y: 700, dir: -1, coverTop: 622, outY: 720, cover: ctx => S.hayPile(ctx, 520, 700, 2.4) },
      { id: 'pond', name: 'in the pond', x: 1040, y: 660, dir: 1, coverTop: 636, outY: 590, cover: ctx => { ctx.save(); ctx.beginPath(); ctx.rect(0, 636, 1280, 220); ctx.clip(); S.pondShape(ctx, 1040, 660, 190, 95, 0); ctx.fillStyle = 'rgba(79,179,232,0.92)'; ctx.fill(); ctx.restore(); for (let i = 0; i < 4; i++) { const px = 940 + i * 60 + Math.sin(this.t * 1.5 + i) * 8; D.line(ctx, px - 12, 644 + i * 16, px + 12, 644 + i * 16, 'rgba(255,255,255,0.6)', 2.5); } } },
      { id: 'bush', name: 'in the bush', x: 320, y: 420, dir: 1, coverTop: 335, outY: 440, cover: ctx => S.bush(ctx, 320, 420, 2.6, true) },
      { id: 'tractor', name: 'behind the tractor', x: 900, y: 430, dir: -1, coverTop: 330, outY: 470, cover: ctx => { ctx.save(); ctx.translate(900, 430); ctx.scale(1.4, 1.4); MA.tractor(ctx, {}); ctx.restore(); } },
      { id: 'barn', name: 'behind the barn', x: 762, y: 322, dir: 1, coverTop: null, outY: 352, cover: ctx => { ctx.save(); ctx.translate(640, 322); ctx.scale(0.72, 0.72); S.barn(ctx, 0, 0, { night: 0, doorOpen: 0 }); ctx.restore(); } },
    ];
    this.hiders = []; this.cur = 0; this.busy = false; this.idleT = 0; this.wiggle = {};
  }
  enter() { this._setup(); this._ask(); }
  _setup() {
    const n = Math.min(3, 1 + this.round);
    const species = U.shuffle(HideSeek.POOL).slice(0, n), spots = U.shuffle(this.spots).slice(0, n);
    this.hiders = species.map((sp, i) => {
      const spot = spots[i], cfg = SPECIES[sp], scale = Math.max(1.0, Math.min(1.5, 110 / cfg.h)), H = cfg.h * scale;
      // lift the animal so roughly its top third peeks over the cover
      const y = spot.coverTop == null ? spot.y - (spot.lift == null ? 6 : spot.lift) : spot.coverTop + H * 0.6;
      const a = this.h.makeAnimal(sp, spot.x, y, { variant: 0, dir: spot.dir, scale });
      a.hitPad = 44;
      return { sp, a, spot, found: false };
    });
    this.cur = 0; this.busy = false; this.idleT = 0;
  }
  _ask() {
    const hd = this.hiders[this.cur]; if (!hd) return;
    const n = hd.a.cfg.name.toLowerCase();
    this.h.narrate(this.cur === 0 && this.round === 0 ? `Let's play hide and seek! Where is the ${n}? Can you find the ${n}?` : `Now, where is the ${n}?`);
    this.idleT = 0;
  }

  update(dt) {
    this.t += dt; this.idleT += dt;
    for (const hd of this.hiders) hd.a.update(dt, {});
    for (const k in this.wiggle) this.wiggle[k] = Math.max(0, this.wiggle[k] - dt);
    const hd = this.hiders[this.cur];
    // after a while the hider gives itself away — listen!
    if (hd && !this.busy && this.idleT > 6) {
      this.idleT = 1.5;
      hd.a.talk(0.8); Sfx.play(hd.a.cfg.sound, 0.7); this.wiggle[hd.spot.id] = 0.7;
    }
  }

  onTap(x, y) {
    if (this.busy) return;
    const hd = this.hiders[this.cur]; if (!hd) return;
    const near = this.hiders.find(h => !h.found && (h.a.hit(x, y) || Math.hypot(x - h.spot.x, y - (h.spot.y - 40)) < 80));
    if (!near) { this.h.sparkle(x, y, 4); return; }
    if (near !== hd) {   // the wrong hider: it giggles, we keep looking
      near.a.talk(0.6); Sfx.play(near.a.cfg.sound, 0.5); this.wiggle[near.spot.id] = 0.5;
      this.h.narrate(`That's the ${near.a.cfg.name.toLowerCase()}! We are looking for the ${hd.a.cfg.name.toLowerCase()}.`);
      return;
    }
    // found!
    this.busy = true; hd.found = true; this.idleT = 0;
    const a = hd.a; Sfx.play('pop'); this.h.sparkle(a.x, a.y - 50, 16);
    a.dir = a.x > 640 ? -1 : 1;
    this.h.tween(a, { y: hd.spot.outY, scale: a.scale * 1.12 }, 0.35, { ease: U.easeOut, onDone: () => { this.h.animalSpeak(a, 1); a.doTrick(); } });
    a.say('Found me!', 1.6);
    const n = a.cfg.name.toLowerCase();
    this.h.narrate(`You found the ${n} ${hd.spot.name}! ${a.cfg.says}`, { onend: () => {
      this.cur++;
      if (this.cur >= this.hiders.length) {
        this.round++;
        this.h.celebrate('You found everyone! You are brilliant at hide and seek!', 1, () => this.h.later(() => { this._setup(); this._ask(); }, 500));
      } else { this.busy = false; this._ask(); }
    } });
  }

  render(ctx) {
    const t = this.t;
    ctx.drawImage(this.bg, 0, 0);
    // every spot draws its hider (if any) and then its cover, back to front
    const order = [...this.spots].sort((a, b) => (a.id === 'barn' ? 0 : a.y) - (b.id === 'barn' ? 0 : b.y));
    for (const spot of order) {
      const hd = this.hiders.find(h => h.spot === spot);
      ctx.save();
      const wg = this.wiggle[spot.id] || 0;
      if (wg > 0) { ctx.translate(spot.x, spot.y); ctx.rotate(Math.sin(wg * 28) * 0.05); ctx.translate(-spot.x, -spot.y); }
      if (hd && !hd.found) hd.a.draw(ctx, t);
      spot.cover(ctx);
      ctx.restore();
    }
    // the found ones stand proudly in front
    for (const hd of this.hiders) if (hd.found) hd.a.draw(ctx, t);
    for (const hd of this.hiders) hd.a.drawBubble(ctx);
    // who we're looking for
    const hd = this.hiders[this.cur];
    if (hd) { D.fillRR(ctx, 470, 92, 340, 60, 20, 'rgba(255,255,255,0.88)', OL(), 3); D.text(ctx, `${hd.a.cfg.emoji}  Where is the ${hd.a.cfg.name.toLowerCase()}?`, 640, 123, 26, '#7a3e12'); }
    for (let i = 0; i < this.hiders.length; i++) { const x = 640 + (i - (this.hiders.length - 1) / 2) * 40; D.circle(ctx, x, 172, 12, this.hiders[i].found ? '#48c774' : 'rgba(255,255,255,0.35)', OL(), 2.5); }
  }
  hover(x, y) { return this.hiders.some(h => !h.found && h.a.hit(x, y)); }
  exit() { }
}
