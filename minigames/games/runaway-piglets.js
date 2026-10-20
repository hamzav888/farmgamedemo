/* ---------- 🐷 Runaway Piglets ----------
   The gate's open and the piglets are out, zig-zagging across the field. Tap
   one to catch it — it squeals, gets scooped up and floats home to the sty.
   They get a little faster each round. Tap the dog and his bark freezes them
   for a moment, which is exactly the help a two-year-old needs.
   Teaches: tracking a moving target, reflexes, "one more to go". */
class RunawayPiglets {
  static id = 'piglets'; static title = 'Runaway Piglets'; static emoji = '🐷';
  static blurb = 'Catch the piglets before they get away!';
  static STY = { x1: 60, y1: 500, x2: 330, y2: 750 };
  static FIELD = { x1: 400, y1: 330, x2: 1210, y2: 760 };
  static pose(g) { g.piglets.forEach((p, i) => { p.wait = 0; p.x = 520 + i * 220; p.y = 480 + (i % 2) * 180; p.moving = true; }); const c = g.piglets[0]; c.mode = 'caught'; c.y -= 40; c.scale *= 1.2; c.say('Wee!', 9); }

  constructor(h) {
    this.h = h; this.t = 0;
    const c = MiniBG.field(1280, 800, { seed: 23 }); const x = c.getContext('2d');
    S.mud(x, 190, 680, 100, 40, 0); S.trough(x, 110, 560, false);
    this.bg = c;
    this.piglets = []; this.caught = 0; this.need = 3; this.round = 0; this.speed = 85;
    this.mama = null; this.dog = null; this.freezeT = 0; this.gate = 1; this.busy = false; this.idleT = 0; this.puddle = { x: 900, y: 620, rx: 60, ry: 26 };
  }
  enter() {
    this.mama = this.h.makeAnimal('pig', 170, 640, { variant: 0, dir: 1, scale: 1.6 });
    this.dog = this.h.makeAnimal('dog', 1120, 720, { dir: -1, scale: 1.2 }); this.dog.hitPad = 34;
    this._spawn();
    this.h.narrate('Oh no! The piglets have escaped! Tap a piglet to catch it. If they are too quick, tap the dog!');
  }
  _spawn() {
    this.piglets = []; this.caught = 0; this.busy = false; this.gate = 1;
    for (let i = 0; i < this.need; i++) {
      const p = this.h.makeAnimal('pig', 330, 610, { variant: i % 3, dir: 1, scale: 0.85 });
      p.hitPad = 34; p.mode = 'run'; p.wait = 0.4 + i * 0.55; p.vx = this.speed; p.vy = U.rand(-40, 40); p.turnT = U.rand(0.6, 1.2); p.restT = 0;
      this.piglets.push(p);
    }
  }
  _heading(p) {
    const F = RunawayPiglets.FIELD;
    // run somewhere new, biased away from walls and from the sty
    const cx = (F.x1 + F.x2) / 2, cy = (F.y1 + F.y2) / 2;
    let a = U.rand(0, Math.PI * 2);
    if (p.x < F.x1 + 120) a = U.rand(-0.9, 0.9);
    if (p.x > F.x2 - 120) a = Math.PI + U.rand(-0.9, 0.9);
    if (p.y < F.y1 + 90) a = Math.PI / 2 + U.rand(-0.9, 0.9);
    if (p.y > F.y2 - 90) a = -Math.PI / 2 + U.rand(-0.9, 0.9);
    p.vx = Math.cos(a) * this.speed; p.vy = Math.sin(a) * this.speed * 0.7;
    p.turnT = U.rand(0.6, 1.5);
  }

  update(dt) {
    this.t += dt; this.idleT += dt;
    if (this.freezeT > 0) this.freezeT -= dt;
    this.mama.update(dt, {}); this.dog.update(dt, {});
    const F = RunawayPiglets.FIELD;
    for (const p of this.piglets) {
      p.update(dt, {});
      if (p.mode !== 'run') continue;
      if (p.wait > 0) { p.wait -= dt; p.moving = true; p.phase += dt * 12; p.x += 120 * dt; continue; }   // trotting out of the gate
      if (this.freezeT > 0) { p.moving = false; continue; }
      if (p.restT > 0) { p.restT -= dt; p.moving = false; continue; }         // a breather in the puddle: easy pickings
      p.turnT -= dt; if (p.turnT <= 0) { this._heading(p); if (Math.random() < 0.25) { p.restT = 1.1; p.say(U.pick(['Hee!', 'Oink!']), 1); } }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x < F.x1) { p.x = F.x1; p.vx = Math.abs(p.vx); } if (p.x > F.x2) { p.x = F.x2; p.vx = -Math.abs(p.vx); }
      if (p.y < F.y1) { p.y = F.y1; p.vy = Math.abs(p.vy); } if (p.y > F.y2) { p.y = F.y2; p.vy = -Math.abs(p.vy); }
      p.dir = p.vx >= 0 ? 1 : -1; p.moving = true; p.run = true; p.phase += dt * 15;
    }
    if (this.idleT > 9 && !this.busy) { this.idleT = 3; this.h.narrate(U.pick(['Tap a piglet to catch it!', 'Tap the dog to make them stop!'])); }
  }

  onTap(x, y) {
    if (this.busy) return;
    if (this.dog.hit(x, y)) {
      this.h.animalSpeak(this.dog, 0.9); this.dog.doTrick(); this.freezeT = 1.9; this.idleT = 0;
      for (const p of this.piglets) if (p.mode === 'run') { p.happy = true; p.talk(0.4); this.h.later(() => p.happy = false, 1900); }
      this.h.narrate('Woof! Stay still, piglets!', { rate: 1.05 });
      return;
    }
    const p = this.h.hitAnimal(this.piglets.filter(p => p.mode === 'run'), x, y);
    if (!p) { this.h.crumbs(x, y, 6); Sfx.play('splash', 0.15); return; }
    this.idleT = 0; p.mode = 'caught'; this.caught++;
    Sfx.play('pig', 0.8); p.say('Wee!', 1.2); p.moving = false; p.happy = true;
    this.h.sparkle(p.x, p.y - 30, 12);
    const w = U.numberWord(this.caught), W = w[0].toUpperCase() + w.slice(1);
    const home = { x: U.rand(100, 290), y: U.rand(560, 730) };
    this.h.tween(p, { y: p.y - 50, scale: p.scale * 1.25 }, 0.25, { ease: U.easeOut, onDone: () => this.h.tween(p, { x: home.x, y: home.y, scale: 0.85 * (SPECIES.pig.scale || 1) }, 0.8, { onDone: () => {
      p.mode = 'home'; p.happy = false; p.zone = { x1: 90, y1: 540, x2: 300, y2: 735 }; p.state = 'idle'; p.stateT = 1; p.speedMul = 0.5;
      this.mama.talk(0.6); Sfx.play('pig', 0.4); Sfx.play('pop', 0.5);
    } }) });
    if (this.caught >= this.need) {
      this.busy = true; this.round++;
      this.h.tween(this, { gate: 0 }, 0.6, { delay: 1.1 });
      this.h.celebrate(`${W}! You caught all the piglets! Back in the sty, you lot!`, 1, () => this.h.later(() => {
        this.need = Math.min(6, 3 + this.round); this.speed = Math.min(190, 85 + this.round * 28);
        this._spawn(); this.h.narrate('Uh oh — the gate is open again! Here they come!');
      }, 400));
    } else this.h.narrate(`${W}! ${this.need - this.caught === 1 ? 'One more to go!' : ''}`, { rate: 1.05 });
  }

  render(ctx) {
    const t = this.t, S0 = RunawayPiglets.STY;
    ctx.drawImage(this.bg, 0, 0);
    ctx.save(); ctx.translate(this.puddle.x, this.puddle.y); MA.puddle(ctx, this.puddle.rx, this.puddle.ry, t); ctx.restore();
    // the sty: three fence sides, the gate on the right
    const fence = (x1, y1, x2, y2, o) => { const n = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1) / 62)); for (let i = 0; i < n; i++) S.fenceSeg(ctx, U.lerp(x1, x2, i / n), U.lerp(y1, y2, i / n), U.lerp(x1, x2, (i + 1) / n), U.lerp(y1, y2, (i + 1) / n), { ...o, end: i === n - 1 }); };
    fence(S0.x1, S0.y1, S0.x2, S0.y1, { h: 30 }); fence(S0.x1, S0.y1, S0.x1, S0.y2, { h: 30 });
    fence(S0.x2, S0.y1, S0.x2, 575, { h: 30 }); fence(S0.x2, 690, S0.x2, S0.y2, { h: 30 });
    const ents = [...this.piglets, this.mama, this.dog].map(a => ({ y: a.y, d: () => a.draw(ctx, t) }));
    ents.sort((a, b) => a.y - b.y).forEach(e => e.d());
    fence(S0.x1, S0.y2, S0.x2, S0.y2, { h: 30 });
    ctx.save(); ctx.translate(S0.x2, 690); MA.gate(ctx, 60, this.gate); ctx.restore();
    if (this.freezeT > 0) { ctx.save(); ctx.globalAlpha = Math.min(1, this.freezeT); D.text(ctx, 'STAY!', this.dog.x, this.dog.y - 110, 34, '#fff', { stroke: OL(), lw: 6 }); ctx.restore(); }
    [...this.piglets, this.mama, this.dog].forEach(a => a.drawBubble(ctx));
    // progress: piglet faces
    const n = this.need, w = n * 50;
    D.fillRR(ctx, 640 - w / 2 - 14, 92, w + 28, 56, 18, 'rgba(255,255,255,0.88)', OL(), 3);
    for (let i = 0; i < n; i++) { const x = 640 - w / 2 + 25 + i * 50; ctx.save(); if (i >= this.caught) ctx.globalAlpha = 0.25; D.circle(ctx, x, 120, 17, '#f8a5c2', OL(), 2.5); D.fillEll(ctx, x + 6, 123, 7, 5, '#f39cb7', OL(), 1.5); D.circle(ctx, x + 4, 123, 1.5, '#a0455e'); D.circle(ctx, x + 8, 123, 1.5, '#a0455e'); D.circle(ctx, x - 5, 116, 2, '#222'); ctx.restore(); }
    if (this.idleT > 6 && !this.busy) MA.ring(ctx, this.dog.x, this.dog.y - 40, 70, 60, t);
  }
  hover(x, y) { return !!(this.h.hitAnimal(this.piglets.filter(p => p.mode === 'run'), x, y) || this.dog.hit(x, y)); }
  exit() { }
}
