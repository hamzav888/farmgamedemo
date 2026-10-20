/* ---------- 🍎 Feeding Time ----------
   One hungry animal stands behind its trough with a "?" over its head. Three
   foods sit on a tray; drag the right one to the animal. The wrong food gets a
   gentle head-shake and a fact; the right one gets munched, hearts, and the
   animal's sound. Teaches: what animals eat, food names, matching. */
class FeedingTime {
  static id = 'feed'; static title = 'Feeding Time'; static emoji = '🍎';
  static blurb = 'Who eats what? Feed the hungry animals';
  static pose(g) { g.animal.x = 640; g.animal.moving = false; g.busy = false; const f = g.foods[1]; f.lifted = true; f.x = 560; f.y = 560; f.s = 1.2; f.rot = 0; }
  static DIET = {
    cow:     { eats: ['hay', 'grass'],                         fact: 'Cows eat hay and grass. Munch munch!' },
    horse:   { eats: ['carrot', 'apple', 'hay'],               fact: 'Horses love carrots and apples!' },
    pig:     { eats: ['apple', 'corn'],                        fact: 'Pigs eat apples and corn. Oink!' },
    sheep:   { eats: ['grass', 'hay'],                         fact: 'Sheep nibble grass all day long.' },
    goat:    { eats: ['cabbage', 'carrot', 'apple', 'corn', 'grass'], fact: 'Goats will eat almost anything!' },
    dog:     { eats: ['bone'],                                 fact: 'Dogs love a big bone!' },
    cat:     { eats: ['fish', 'milk'],                         fact: 'Cats like fish and milk.' },
    chicken: { eats: ['seeds', 'corn'],                        fact: 'Chickens peck at seeds and corn.' },
    duck:    { eats: ['bread', 'seeds'],                       fact: 'Ducks love bread and seeds.' },
  };

  constructor(h) {
    this.h = h; this.t = 0;
    this.bg = MiniBG.field(1280, 800, { seed: 5 });
    this.queue = []; this.animal = null; this.foods = []; this.drag = null;
    this.busy = false; this.shake = 0; this.idleT = 0; this.over = false; this.fed = 0; this.leaving = null;
  }
  enter() {
    this.queue = U.shuffle(Object.keys(FeedingTime.DIET));
    this._round();
    this.h.narrate(`The animals are hungry! Drag the right food to the ${this.animal.cfg.name.toLowerCase()}.`);
  }
  _round() {
    if (!this.queue.length) this.queue = U.shuffle(Object.keys(FeedingTime.DIET));
    const sp = this.queue.shift(), diet = FeedingTime.DIET[sp];
    const big = ['cow', 'horse'].includes(sp) ? 1.7 : ['pig', 'sheep', 'goat', 'dog'].includes(sp) ? 2.0 : 2.3;
    const a = this.animal = this.h.makeAnimal(sp, -170, 470, { scale: big, dir: 1 });
    a.hitPad = 40; a.moving = true;
    // walks in from the lane on the left; nobody can feed him until he's arrived
    this.h.tween(a, { x: 640 }, 1.15, { ease: U.easeInOut, onDone: () => { if (this.animal !== a) return; a.moving = false; this.busy = false; this.h.animalSpeak(a, 0.8); } });
    const right = U.pick(diet.eats);
    const others = U.shuffle(Object.keys(MA.FOOD).filter(f => !diet.eats.includes(f))).slice(0, 2);
    const set = U.shuffle([right, ...others]);
    this.foods = set.map((k, i) => ({ kind: k, x: 400 + i * 240, y: 690, hx: 400 + i * 240, hy: 690, s: 1, rot: U.rand(-0.1, 0.1), gone: false, lifted: false }));
    this.right = right; this.drag = null; this.busy = true; this.idleT = 0; this.over = false;
  }

  update(dt) {
    this.t += dt; this.idleT += dt;
    const a = this.animal; if (!a) return;
    a.update(dt, {}); if (a.moving) a.phase += dt * 10;
    if (this.leaving) { this.leaving.update(dt, {}); this.leaving.phase += dt * 10; }
    if (this.shake > 0) {   // "no thank you" head shake
      const before = Math.floor((this.shake + dt) * 9);
      this.shake -= dt;
      if (Math.floor(this.shake * 9) !== before) a.dir *= -1;
      if (this.shake <= 0) a.dir = 1;
    }
  }

  _pick(x, y) {
    let best = null, bd = 1e9;
    for (const f of this.foods) { if (f.gone) continue; const d = Math.hypot(x - f.x, y - f.y); if (d < 64 && d < bd) { bd = d; best = f; } }
    return best;
  }
  onDown(x, y) {
    if (this.busy) return;
    const f = this._pick(x, y); if (!f) return;
    this.drag = { f, ox: f.x - x, oy: f.y - y }; f.lifted = true; this.idleT = 0;
    this.h.tween(f, { s: 1.2, rot: 0 }, 0.15);
    Sfx.play('pop', 0.6);
    const n = MA.FOOD[f.kind].name;
    this.h.narrate(n[0].toUpperCase() + n.slice(1) + '.', { rate: 1 });
  }
  onMove(x, y) {
    if (!this.drag) return;
    const f = this.drag.f; f.x = x + this.drag.ox; f.y = y + this.drag.oy;
    this.over = this.animal.hit(f.x, f.y);
  }
  onUp() {
    if (!this.drag) return;
    const f = this.drag.f; this.drag = null; f.lifted = false; this.idleT = 0; this.over = false;
    const a = this.animal, diet = FeedingTime.DIET[a.species], name = a.cfg.name;
    const home = () => this.h.tween(f, { x: f.hx, y: f.hy, s: 1, rot: U.rand(-0.1, 0.1) }, 0.3);
    if (!a.hit(f.x, f.y)) return home();
    if (diet.eats.includes(f.kind)) {
      this.busy = true; f.gone = true; this.fed++;
      const hp = a.headPos();
      this.h.tween(f, { x: hp.x, y: hp.y + 10, s: 0 }, 0.25);
      Sfx.play('munch'); a.happy = true; a.talk(1.2); this.h.hearts(hp.x, hp.y - 30, 6);
      this.h.later(() => this.h.animalSpeak(a, 0.8), 750);
      this.h.showCard(a.cfg.emoji, name, `${name}s eat <b>${MA.FOOD[f.kind].name}</b>!`);
      this.h.narrate(`Yum! ${diet.fact}`, { onend: () => {
        this.h.addStars(1); this.h.sparkle(a.x, a.y - 60, 14);
        // off he trots, full and happy, while the next one comes in
        a.moving = true; this.leaving = a;
        this.h.tween(a, { x: 1480 }, 1.2, { ease: U.easeInOut, onDone: () => { if (this.leaving === a) this.leaving = null; } });
        this.h.later(() => {
          this._round();
          const n = this.animal.cfg.name.toLowerCase();
          this.h.narrate(`Now the ${n} is hungry! What does a ${n} eat?`);
        }, 900);
      } });
    } else {
      Sfx.play('oops', 0.7); this.shake = 0.7; a.talk(0.4);
      const fn = MA.FOOD[f.kind].name;
      this.h.narrate(U.pick([`${name}s don't eat ${fn}! Try something else.`, `No thank you! A ${name.toLowerCase()} doesn't eat ${fn}.`]));
      home();
    }
  }
  onTap(x, y) {
    if (this.animal && this.animal.hit(x, y) && !this.busy && !this.drag) {
      this.h.animalSpeak(this.animal, 0.9);
      this.h.narrate(`The ${this.animal.cfg.name.toLowerCase()} is hungry!`);
    }
  }

  render(ctx) {
    const t = this.t, a = this.animal;
    ctx.drawImage(this.bg, 0, 0);
    for (let x = 80; x < 1200; x += 64) S.fenceSeg(ctx, x, 330, x + 64, 330, { end: x + 64 >= 1200 });
    if (this.leaving) this.leaving.draw(ctx, t);
    a.draw(ctx, t);
    // big trough in front of the animal, overlapping its lower legs so it reads as "standing behind"
    ctx.save(); ctx.translate(640, 486); ctx.scale(3.2, 3.2); S.trough(ctx, 0, 0, false); ctx.restore();
    // "?" thought bubble while we wait
    if (!this.busy && !this.drag) {
      const hp = a.headPos(), bob = Math.sin(t * 3) * 4;
      D.circle(ctx, hp.x + 30, hp.y - 40 + bob, 6, '#fff', OL(), 2.5);
      D.circle(ctx, hp.x + 44, hp.y - 58 + bob, 9, '#fff', OL(), 2.5);
      D.circle(ctx, hp.x + 68, hp.y - 94 + bob, 30, '#fff', OL(), 3);
      D.text(ctx, '?', hp.x + 68, hp.y - 92 + bob, 40, '#e17055');
    }
    if (this.over) MA.ring(ctx, a.x, a.y - a.cfg.h * a.scale * 0.45, a.cfg.w * a.scale * 0.62, a.cfg.h * a.scale * 0.62, t, '150,255,150');
    a.drawBubble(ctx);
    MA.crate(ctx, 250, 610, 780, 160);
    for (const f of this.foods) if (!f.gone && !f.lifted) this._drawFood(ctx, f);
    if (!this.drag && !this.busy && this.idleT > 9) { const f = this.foods.find(f => f.kind === this.right); if (f) MA.ring(ctx, f.x, f.y, 56, 56, t); }
    for (const f of this.foods) if (f.lifted) this._drawFood(ctx, f);
  }
  _drawFood(ctx, f) { ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot); ctx.scale(f.s, f.s); MA.drawFood(ctx, f.kind); ctx.restore(); }
  hover(x, y) { return !!this._pick(x, y) || (this.animal && this.animal.hit(x, y)); }
  exit() { }
}
