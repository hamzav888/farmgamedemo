/* ---------- 🌾 Hay Bale Peek-a-boo ----------
   Memory pairs, toddler style. Hay bales in the barn; tap one and it flips to
   show an animal (with its sound). Find the two that match. Starts at two pairs
   — which for a one-year-old is simply peek-a-boo — and grows to six.
   Teaches: memory, animal names, "same / not the same". */
class PeekABoo {
  static id = 'peek'; static title = 'Peek-a-boo'; static emoji = '🌾';
  static blurb = 'Who is hiding in the hay? Find the pairs';
  static POOL = ['cow', 'pig', 'sheep', 'chicken', 'duck', 'horse', 'cat', 'dog', 'goat'];
  static pose(g) {
    const p = g.cards[0], q = g.cards.find(c => c !== p && c.sp === p.sp);
    p.open = 1; p.state = 'open'; if (q) { q.open = 1; q.state = 'open'; }
    const r = g.cards.find(c => c.state === 'closed'); if (r) r.peek = 0.8;
  }

  constructor(h) {
    this.h = h; this.t = 0; this.round = 0;
    this.cards = []; this.open = []; this.busy = false; this.matched = 0; this.pairs = 2; this.peekT = 3;
    const c = document.createElement('canvas'); c.width = 1280; c.height = 800;
    const x = c.getContext('2d'); S.barnInterior(x, 1280, 800); x.drawImage(S.makeVignette(1280, 800), 0, 0);
    this.bg = c;
  }
  enter() {
    this._setup();
    this.h.narrate('Peek-a-boo! Who is hiding in the hay? Tap a hay bale to look. Find two animals that are the same!');
  }
  _setup() {
    const pairs = [2, 3, 4, 6][Math.min(this.round, 3)];
    const cols = pairs === 2 ? 2 : pairs === 3 ? 3 : 4, rows = Math.ceil(pairs * 2 / cols);
    const species = U.shuffle(PeekABoo.POOL).slice(0, pairs);
    const deck = U.shuffle([...species, ...species]);
    const cw = Math.min(260, 1120 / cols), ch = Math.min(240, 640 / rows);
    const x0 = 640 - (cols - 1) * cw / 2, y0 = 440 - (rows - 1) * ch / 2;
    this.cards = deck.map((sp, i) => {
      const c = i % cols, r = Math.floor(i / cols), x = x0 + c * cw, y = y0 + r * ch;
      const cfg = SPECIES[sp];
      const a = this.h.makeAnimal(sp, x, y + 56, { variant: 0, dir: 1, scale: Math.min(2.0, 150 / (cfg.h * (cfg.scale || 1))) });
      return { sp, x, y, a, open: 0, state: 'closed', bounce: 0, peek: 0 };
    });
    this.open = []; this.busy = false; this.matched = 0; this.pairs = pairs; this.cw = cw; this.ch = ch;
  }

  update(dt) {
    this.t += dt;
    for (const c of this.cards) { c.a.update(dt, {}); if (c.bounce > 0) c.bounce -= dt; if (c.peek > 0) c.peek -= dt; }
    // every few seconds somebody peeps over the top of their bale — the tease is the game
    this.peekT -= dt;
    if (this.peekT <= 0 && !this.busy) {
      this.peekT = U.rand(2.5, 5);
      const closed = this.cards.filter(c => c.state === 'closed' && c.peek <= 0);
      if (closed.length) U.pick(closed).peek = 1.4;
    }
  }
  _at(x, y) { return this.cards.find(c => Math.abs(x - c.x) < this.cw / 2 - 6 && Math.abs(y - (c.y + 10)) < this.ch / 2 - 6); }

  onTap(x, y) {
    if (this.busy) return;
    const c = this._at(x, y); if (!c || c.state !== 'closed') return;
    c.state = 'opening'; Sfx.play('pop');
    this.h.tween(c, { open: 1 }, 0.32, { onDone: () => { c.state = 'open'; this.h.animalSpeak(c.a, 0.9); } });
    this.h.narrate('A ' + c.a.cfg.name.toLowerCase() + '!', { rate: 1.05 });
    this.open.push(c);
    if (this.open.length === 2) { this.busy = true; const [p, q] = this.open; this.h.later(() => this._check(p, q), 1000); }
  }
  _check(p, q) {
    this.open = [];
    if (p.sp === q.sp) {
      p.state = q.state = 'matched'; this.matched++;
      p.bounce = q.bounce = 1.2; this.h.sparkle(p.x, p.y, 10); this.h.sparkle(q.x, q.y, 10); Sfx.play('ding');
      const plural = SPECIES[p.sp].plural;
      if (this.matched >= this.pairs) {
        this.round++;
        this.h.celebrate(`Two ${plural}! You found them all! Hooray!`, 1, () => this.h.later(() => {
          this._setup();
          this.h.narrate(this.pairs < 6 ? 'More animals are hiding now!' : 'Even more animals! Can you find all the pairs?');
        }, 600));
      } else { this.busy = false; this.h.narrate(`Two ${plural}! You found a pair!`); }
    } else {
      this.h.narrate(`A ${p.a.cfg.name.toLowerCase()} and a ${q.a.cfg.name.toLowerCase()}. Not the same! Try again.`);
      this.h.later(() => {
        [p, q].forEach(c => { c.state = 'closing'; this.h.tween(c, { open: 0 }, 0.3, { onDone: () => c.state = 'closed' }); });
        this.busy = false;
      }, 800);
    }
  }

  render(ctx) {
    const t = this.t; ctx.drawImage(this.bg, 0, 0);
    for (const c of this.cards) {
      const k = Math.cos(c.open * Math.PI);          // 1 = bale, -1 = animal
      const by = c.y + 56, bounce = c.bounce > 0 ? Math.abs(Math.sin(c.bounce * 10)) * 14 * c.bounce : 0;
      ctx.save(); ctx.translate(c.x, by - bounce);
      if (k >= 0) {
        ctx.scale(Math.max(0.02, k), 1);
        S.hayBale(ctx, 0, 0, 2.6);
        if (c.peek > 0) {   // a pair of eyes rises over the bale, looks about, ducks back down
          const k2 = c.peek > 1.1 ? (1.4 - c.peek) / 0.3 : c.peek < 0.3 ? c.peek / 0.3 : 1;
          const ey = -92 + (1 - U.easeOut(k2)) * 20, look = Math.sin(this.t * 3) * 0.7;
          ctx.save(); ctx.beginPath(); ctx.rect(-70, -140, 140, 52); ctx.clip();
          D.fillEll(ctx, 0, ey + 12, 32, 15, c.a.variant.body || '#fdf6e3', OL(), 2.5);
          D.eye(ctx, -12, ey, 5.5, { look }); D.eye(ctx, 12, ey, 5.5, { look });
          ctx.restore();
        }
      } else {
        ctx.scale(Math.max(0.02, -k), 1);
        D.fillEll(ctx, 0, 4, 72, 18, '#e9c46a', OL(), 2.5);   // the nest of hay it was hiding in
        ctx.translate(-c.x, -by); c.a.draw(ctx, t); ctx.translate(c.x, by);
        if (c.state === 'matched') { D.circle(ctx, 60, -112, 17, '#ffd23f', OL(), 2.5); D.text(ctx, '✓', 60, -111, 22, '#7a3e12'); }
      }
      ctx.restore();
    }
    for (const c of this.cards) if (c.open > 0.5) c.a.drawBubble(ctx);
    for (let i = 0; i < this.pairs; i++) { const x = 640 + (i - (this.pairs - 1) / 2) * 44; D.circle(ctx, x, 96, 14, i < this.matched ? '#ff6b81' : 'rgba(255,255,255,0.35)', OL(), 2.5); }
  }
  hover(x, y) { const c = this._at(x, y); return !!(c && c.state === 'closed'); }
  exit() { }
}
