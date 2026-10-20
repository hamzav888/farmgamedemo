/* ---------- 🚜 Tractor Ride ----------
   Tap (or hold) anywhere and the tractor drives there, trailer bouncing along
   behind. Drive over hay bales to scoop them up, through puddles to splash,
   near the chickens to send them flapping. Fill the trailer, then deliver to
   the barn. Nothing to get wrong — it's a toy with a goal.
   Teaches: steering by touch, cause and effect, counting the load. */
class TractorRide {
  static id = 'tractor'; static title = 'Tractor Ride'; static emoji = '🚜';
  static blurb = 'Drive! Collect the hay and bring it to the barn';
  static BOUNDS = { x1: 90, y1: 330, x2: 1190, y2: 760 };
  static DOOR = { x: 640, y: 324 };
  static pose(g) { g.tr.x = 520; g.tr.y = 560; g.tr.ang = 0; g.trailer.x = 442; g.trailer.y = 560; g.loaded = 2; g.bales[0].taken = g.bales[1].taken = true; g.tr.speed = 150; g.tr.bounce = 2; }

  constructor(h) {
    this.h = h; this.t = 0;
    this.bg = MiniBG.field(1280, 800, { seed: 21, flowers: [[70, 740], [1210, 750], [1230, 360]] });
    this.tr = { x: 400, y: 580, ang: 0, speed: 0, dir: 1, wheel: 0, bounce: 0, honk: 0 };
    this.trailer = { x: 322, y: 580 };
    this.target = null; this.holding = false;
    this.bales = []; this.puddles = [{ x: 860, y: 640, rx: 70, ry: 30 }, { x: 300, y: 720, rx: 55, ry: 24 }];
    this.chickens = []; this.sheep = []; this.dog = null; this.puffs = []; this.flying = [];
    this.loaded = 0; this.need = 5; this.round = 0; this.full = false; this.busy = false;
    this.engineT = 0; this.splashT = 0; this.barkT = 0; this.idleT = 0;
  }
  enter() {
    this._placeBales();
    const B = TractorRide.BOUNDS;
    for (let i = 0; i < 3; i++) { const a = new Animal('chicken', 1050 + i * 50, 420 + i * 40, { variant: i, zone: { x1: 940, y1: 380, x2: 1170, y2: 560 }, scale: 1.2 }); this.chickens.push(a); }
    this.sheep.push(new Animal('sheep', 230, 460, { variant: 0, zone: { x1: 120, y1: 380, x2: 420, y2: 560 }, scale: 1.1 }));
    this.sheep.push(new Animal('sheep', 330, 400, { variant: 2, zone: { x1: 120, y1: 380, x2: 420, y2: 560 }, scale: 1.1 }));
    this.dog = this.h.makeAnimal('dog', 560, 700, { dir: 1, scale: 1.1 }); this.dog.hitPad = 30;
    this.h.narrate('Tap anywhere to drive the tractor! Pick up all the hay bales, then bring them to the barn.');
  }
  _placeBales() {
    const spots = U.shuffle([[560, 460], [760, 520], [980, 700], [440, 680], [700, 720], [880, 420], [250, 620], [1100, 600], [600, 600]]);
    this.bales = spots.slice(0, this.need).map(([x, y]) => ({ x, y, taken: false, wob: 0 }));
    this.loaded = 0; this.full = false;
  }

  update(dt) {
    this.t += dt; this.idleT += dt;
    const tr = this.tr, B = TractorRide.BOUNDS;
    // ----- driving -----
    if (this.target && !this.busy) {
      const dx = this.target.x - tr.x, dy = this.target.y - tr.y, d = Math.hypot(dx, dy);
      if (d > 10) {
        const want = Math.atan2(dy, dx);
        let diff = want - tr.ang; while (diff > Math.PI) diff -= Math.PI * 2; while (diff < -Math.PI) diff += Math.PI * 2;
        tr.ang += diff * Math.min(1, dt * 6);
        const inMud = this.puddles.some(p => ((tr.x - p.x) / p.rx) ** 2 + ((tr.y - p.y) / p.ry) ** 2 < 1);
        const top = inMud ? 95 : 175;
        tr.speed += (top - tr.speed) * Math.min(1, dt * 3);
      } else { this.target = this.holding ? this.target : null; tr.speed *= Math.max(0, 1 - dt * 6); }
    } else tr.speed *= Math.max(0, 1 - dt * 5);
    if (tr.speed > 2) {
      tr.x = U.clamp(tr.x + Math.cos(tr.ang) * tr.speed * dt, B.x1, B.x2);
      tr.y = U.clamp(tr.y + Math.sin(tr.ang) * tr.speed * dt, B.y1, B.y2);
      tr.wheel += tr.speed * dt / 24;
      tr.dir = Math.cos(tr.ang) >= 0 ? 1 : -1;
      tr.bounce = Math.abs(Math.sin(this.t * 22)) * 3 * (tr.speed / 175);
      this.engineT -= dt;
      if (this.engineT <= 0) { this.engineT = 0.11; Sfx.tone({ wave: 'square', f0: 70 + tr.speed * 0.25, f1: 60, dur: 0.09, vol: 0.05, lp: 500 }); }
      if (Math.random() < dt * 9) this.puffs.push({ x: tr.x + tr.dir * 23, y: tr.y - 86, r: 6, t: 0 });
    } else tr.bounce = 0;
    if (tr.honk > 0) tr.honk -= dt;
    // the trailer follows, hitched behind
    const hx = tr.x - Math.cos(tr.ang) * 82, hy = tr.y - Math.sin(tr.ang) * 82 * 0.35;
    this.trailer.x += (hx - this.trailer.x) * Math.min(1, dt * 9); this.trailer.y += (hy - this.trailer.y) * Math.min(1, dt * 9);
    for (const p of this.puffs) { p.t += dt; p.y -= 30 * dt; p.r += 14 * dt; }
    this.puffs = this.puffs.filter(p => p.t < 1.1);
    // ----- things the tractor bumps into -----
    for (const b of this.bales) {
      if (b.wob > 0) b.wob -= dt;
      if (!b.taken && !this.full && Math.hypot(b.x - tr.x, b.y - tr.y) < 58) {
        b.taken = true; this.loaded++; this.idleT = 0;
        Sfx.play('pop'); this.h.sparkle(b.x, b.y - 20, 10);
        this.flying.push({ x: b.x, y: b.y, t: 0 });
        const w = U.numberWord(this.loaded);
        if (this.loaded >= this.need) { this.full = true; this.h.narrate(`${w[0].toUpperCase() + w.slice(1)}! The trailer is full! Drive to the barn!`); }
        else this.h.narrate(`${w[0].toUpperCase() + w.slice(1)}${this.loaded === 1 ? ' bale!' : '!'}`, { rate: 1 });
      }
    }
    for (const f of this.flying) f.t += dt;
    this.flying = this.flying.filter(f => f.t < 0.5);
    this.splashT -= dt;
    if (tr.speed > 40 && this.splashT <= 0 && this.puddles.some(p => ((tr.x - p.x) / p.rx) ** 2 + ((tr.y - p.y) / p.ry) ** 2 < 1)) {
      this.splashT = 0.35; Sfx.play('splash', 0.5);
      for (let i = 0; i < 10; i++) this.h.particles.push({ x: tr.x + U.rand(-30, 30), y: tr.y, vx: U.rand(-90, 90), vy: U.rand(-200, -80), life: 0.6, r: U.rand(3, 6), color: '#8fd3ff' });
    }
    for (const a of this.chickens) {
      a.update(dt, {});
      if (!a.action && tr.speed > 30 && Math.hypot(a.x - tr.x, a.y - tr.y) < 120) {
        a.doTrick(); a.say('Bok!', 1.2); Sfx.play('chicken', 0.5);
        const away = Math.atan2(a.y - tr.y, a.x - tr.x); const z = a.zone;
        a.target = { x: U.clamp(a.x + Math.cos(away) * 140, z.x1, z.x2), y: U.clamp(a.y + Math.sin(away) * 140, z.y1, z.y2) };
        a.actionAfter = () => { a.state = 'walk'; a.speedMul = 2.2; };
        for (let i = 0; i < 4; i++) this.h.particles.push({ x: a.x, y: a.y - 30, vx: U.rand(-40, 40), vy: U.rand(-40, 10), life: 1.2, r: 3, color: '#fff', type: 'heart' });
      }
    }
    for (const a of this.sheep) {
      a.update(dt, {});
      if (!a.action && tr.speed > 30 && Math.hypot(a.x - tr.x, a.y - tr.y) < 110) { a.doTrick(); a.say('Baa!', 1.2); Sfx.play('sheep', 0.4); const away = Math.atan2(a.y - tr.y, a.x - tr.x), z = a.zone; a.target = { x: U.clamp(a.x + Math.cos(away) * 120, z.x1, z.x2), y: U.clamp(a.y + Math.sin(away) * 120, z.y1, z.y2) }; a.actionAfter = () => { a.state = 'walk'; a.speedMul = 2; }; }
    }
    // the dog chases the tractor
    const dg = this.dog; dg.update(dt, {});
    const gx = tr.x - tr.dir * 110, gy = tr.y + 40, gd = Math.hypot(gx - dg.x, gy - dg.y);
    if (gd > 30 && tr.speed > 20) { dg.moving = true; dg.phase += dt * 16; dg.x += (gx - dg.x) / gd * Math.min(gd, 200 * dt); dg.y += (gy - dg.y) / gd * Math.min(gd, 200 * dt); dg.dir = gx > dg.x ? 1 : -1; dg.happy = true; }
    else { dg.moving = false; }
    this.barkT -= dt; if (tr.speed > 60 && this.barkT <= 0) { this.barkT = U.rand(3, 6); dg.talk(0.6); Sfx.play('dog', 0.35); dg.say('Woof!', 1.2); }
    // ----- delivery -----
    const D0 = TractorRide.DOOR;
    if (this.full && !this.busy && Math.hypot(tr.x - D0.x, tr.y - D0.y) < 95) this._deliver();
    // nudge
    if (this.idleT > 10 && !this.busy) { this.idleT = 4; const b = this.bales.find(b => !b.taken); if (b) { b.wob = 1; } this.h.narrate(this.full ? 'Drive to the barn!' : 'Tap near a hay bale to drive there!'); }
  }
  _deliver() {
    this.busy = true; this.target = null; this.tr.speed = 0;
    const n = this.loaded;
    for (let i = 0; i < n; i++) this.h.later(() => { Sfx.play('pop', 0.7); this.loaded--; this.h.sparkle(640, 284, 8); this.flying.push({ x: this.trailer.x, y: this.trailer.y - 50, t: 0, toBarn: true }); }, i * 220);
    this.h.later(() => {
      Sfx.play('ding'); this.round++;
      this.h.celebrate(`${U.numberWord(n)[0].toUpperCase() + U.numberWord(n).slice(1)} bales in the barn! What a great driver!`, 1, () => {
        this.need = Math.min(8, 5 + this.round); this._placeBales(); this.busy = false;
        this.h.narrate(`More hay to collect! ${U.numberWord(this.need)[0].toUpperCase() + U.numberWord(this.need).slice(1)} bales this time.`);
      });
    }, n * 220 + 400);
  }

  onDown(x, y) {
    if (this.busy) return;
    if (Math.hypot(x - this.tr.x, y - (this.tr.y - 45)) < 70) { Sfx.play('honk'); this.tr.honk = 0.6; this.h.sparkle(this.tr.x, this.tr.y - 70, 6); this.dog.talk(0.5); Sfx.play('dog', 0.3); return; }
    this.holding = true; this.target = { x, y }; this.idleT = 0;
  }
  onMove(x, y, down) { if (down && this.holding && !this.busy) this.target = { x, y }; }
  onUp() { this.holding = false; }
  onTap(x, y) { if (this.dog.hit(x, y)) { this.h.animalSpeak(this.dog, 0.7); this.dog.doTrick(); } }

  render(ctx) {
    const t = this.t, tr = this.tr;
    ctx.drawImage(this.bg, 0, 0);
    ctx.save(); ctx.translate(640, 324); ctx.scale(0.72, 0.72); S.barn(ctx, 0, 0, { night: 0, doorOpen: 1 }); ctx.restore();
    if (this.full) { const k = 0.5 + 0.5 * Math.sin(t * 5); ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(640, 274, 10, 640, 274, 140); g.addColorStop(0, `rgba(255,230,120,${0.35 + k * 0.25})`); g.addColorStop(1, 'rgba(255,230,120,0)'); ctx.fillStyle = g; ctx.fillRect(500, 134, 280, 280); ctx.restore(); MA.ring(ctx, 640, 324, 90, 40, t); }
    for (const p of this.puddles) { ctx.save(); ctx.translate(p.x, p.y); MA.puddle(ctx, p.rx, p.ry, t); ctx.restore(); }
    // everything with feet, y-sorted
    const ents = [];
    for (const b of this.bales) if (!b.taken) ents.push({ y: b.y, d: () => { ctx.save(); ctx.translate(b.x, b.y); if (b.wob > 0) ctx.rotate(Math.sin(b.wob * 24) * 0.12); S.hayBale(ctx, 0, 0, 1.1); ctx.restore(); if (b.wob > 0) MA.ring(ctx, b.x, b.y - 18, 46, 30, t); } });
    for (const a of [...this.chickens, ...this.sheep, this.dog]) ents.push({ y: a.y, d: () => a.draw(ctx, t) });
    ents.push({ y: this.trailer.y, d: () => { ctx.save(); ctx.translate(this.trailer.x, this.trailer.y); ctx.scale(tr.dir, 1); MA.trailer(ctx, this.loaded, tr.wheel); ctx.restore(); } });
    ents.push({ y: tr.y + 1, d: () => { ctx.save(); ctx.translate(tr.x, tr.y); if (tr.honk > 0) ctx.translate(0, -Math.abs(Math.sin(tr.honk * 20)) * 8); ctx.scale(tr.dir, 1); MA.tractor(ctx, { wheel: tr.wheel, bounce: tr.bounce }); ctx.restore(); } });
    ents.sort((a, b) => a.y - b.y).forEach(e => e.d());
    for (const p of this.puffs) D.circle(ctx, p.x, p.y, p.r, `rgba(120,120,120,${0.45 * (1 - p.t / 1.1)})`);
    for (const f of this.flying) { const k = f.t / 0.5, tx = f.toBarn ? 640 : this.trailer.x, ty = f.toBarn ? 264 : this.trailer.y - 50; ctx.save(); ctx.translate(U.lerp(f.x, tx, k), U.lerp(f.y, ty, k) - Math.sin(k * Math.PI) * 90); ctx.scale(1 - k * 0.4, 1 - k * 0.4); ctx.rotate(k * 3); S.hayBale(ctx, 0, 0, 1); ctx.restore(); }
    for (const a of [...this.chickens, ...this.sheep, this.dog]) a.drawBubble(ctx);
    if (this.target && this.holding) MA.ring(ctx, this.target.x, this.target.y, 26, 16, t, '255,255,255');
    // the load, as bales at the top
    const n = this.need, w = n * 58;
    D.fillRR(ctx, 640 - w / 2 - 14, 92, w + 28, 64, 20, 'rgba(255,255,255,0.88)', OL(), 3);
    for (let i = 0; i < n; i++) { ctx.save(); ctx.translate(640 - w / 2 + 29 + i * 58, 146); if (i >= this.loaded) ctx.globalAlpha = 0.22; S.hayBale(ctx, 0, 0, 0.78); ctx.restore(); }
  }
  hover(x, y) { return true; }
  exit() { }
}
