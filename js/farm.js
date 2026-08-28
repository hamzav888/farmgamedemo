/* ---------- Outdoor farm scene ---------- */
const FARM = {
  W: 1280, H: 800,
  barn: { cx: 640, baseY: 340, hit: { x: 440, y: 40, w: 400, h: 305 } },
  door: { x: 640, y: 352 },
  pond: { cx: 1060, cy: 620, rx: 165, ry: 100 },
  paddock: { x1: 50, y1: 320, x2: 370, y2: 570 },
  pigsty: { x1: 40, y1: 610, x2: 300, y2: 770 },
  run: { x1: 950, y1: 200, x2: 1230, y2: 305 },
  field: { x1: 430, y1: 400, x2: 870, y2: 750 },
  garden: { x: 930, y: 330, w: 240, h: 120 },
};

function inPond(x, y, k = 1) {
  const p = FARM.pond, dx = (x - p.cx) / (p.rx * k), dy = (y - p.cy) / (p.ry * k);
  return dx * dx + dy * dy <= 1;
}

class FarmScene {
  constructor(game) {
    this.game = game;
    this.t = 0;
    this.animals = []; this.nightAnimals = []; this.props = [];
    this.particles = []; this.clouds = []; this.butterflies = []; this.fireflies = []; this.bats = [];
    this.ripples = []; this.rippleT = 0;
    this.doorOpen = 1; this.goHome = false; this.emergeQueue = []; this.emergeT = 0;
    this.callT = 6; this.owlT = 6; this.frogT = 4; this.snoreT = 10;
    this.shots = []; this.shootT = 8;
    this.tractorBounce = 0; this.crowHop = 0; this.windBoost = 0; this.windT = U.rand(0, 6);
    // pre-rendered firefly glow (cheaper than a gradient per firefly per frame on phones)
    const fg = document.createElement('canvas'); fg.width = fg.height = 24;
    const fgc = fg.getContext('2d'); const grad = fgc.createRadialGradient(12, 12, 0, 12, 12, 12);
    grad.addColorStop(0, 'rgba(230,255,140,0.9)'); grad.addColorStop(1, 'rgba(220,255,120,0)');
    fgc.fillStyle = grad; fgc.fillRect(0, 0, 24, 24);
    this.fireflySprite = fg;
    this._buildBackground();
    this._buildProps();
    this._buildAnimals();
    for (let i = 0; i < 4; i++) this.clouds.push({ x: U.rand(0, 1280), y: U.rand(20, 130), s: U.rand(0.7, 1.1), v: U.rand(6, 14) });
    for (let i = 0; i < 6; i++) this.butterflies.push({ x: U.rand(380, 900), y: U.rand(380, 760), a: U.rand(0, 6.28), color: U.pick(['#ff9f43', '#a29bfe', '#ff6b81', '#48dbfb', '#ffd23f']), t: U.rand(0, 10) });
    for (let i = 0; i < 28; i++) this.fireflies.push({ x: U.rand(360, 1240), y: U.rand(360, 780), a: U.rand(0, 6.28), ph: U.rand(0, 6.28), sp: U.rand(0.5, 1.5) });
  }

  _buildBackground() {
    const c = document.createElement('canvas'); c.width = FARM.W; c.height = FARM.H;
    const ctx = c.getContext('2d');
    S.grass(ctx, FARM.W, FARM.H, 11);
    // dirt path from barn door to the bottom gate, plus a branch to the pond
    S.path(ctx, [[640, 330], [640, 500], [650, 700], [640, 810]], 56);
    S.path(ctx, [[646, 560], [780, 590], [905, 620]], 30);
    // paddock dirt patch + pigsty
    D.fillEll(ctx, 210, 445, 140, 90, 'rgba(210,180,120,0.35)');
    // garden
    S.garden(ctx, FARM.garden.x, FARM.garden.y, FARM.garden.w, FARM.garden.h);
    // pond
    S.pond(ctx, FARM.pond.cx, FARM.pond.cy, FARM.pond.rx, FARM.pond.ry);
    // flowers
    [[470, 385], [830, 385], [360, 785], [900, 785], [420, 590], [880, 470], [1210, 480], [340, 300], [900, 120], [1240, 330], [590, 770], [700, 770]].forEach(([x, y]) => S.flowerPatch(ctx, x, y, 7));
    // stepping stones by pond
    [[905, 700], [925, 715], [950, 725]].forEach(([x, y]) => S.rock(ctx, x, y, 0.8));
    // sand around pigsty mud is drawn live (animated bubbles)
    this.bg = c;
  }

  _buildProps() {
    const P = (x, y, draw, sortY) => this.props.push({ x, y, sortY: sortY == null ? y : sortY, draw });
    const t0 = () => this.t;
    // trees & bushes
    P(55, 150, ctx => S.tree(ctx, 55, 150, t0(), { s: 0.9 }));
    P(140, 240, ctx => S.tree(ctx, 140, 240, t0(), { s: 1.2, branch: true }));
    P(215, 110, ctx => S.tree(ctx, 215, 110, t0(), { s: 0.85, apples: true }));
    P(1245, 62, ctx => S.pine(ctx, 1245, 62, 0.9));
    P(1240, 470, ctx => S.tree(ctx, 1240, 470, t0(), { s: 0.85, color: '#45a049' }));
    P(1245, 780, ctx => S.bush(ctx, 1245, 780, 1.1, true));
    P(330, 600, ctx => S.bush(ctx, 330, 600, 1, false));
    P(890, 480, ctx => S.bush(ctx, 890, 480, 0.8, true));
    P(400, 780, ctx => S.bush(ctx, 400, 780, 0.9, false));
    P(20, 790, ctx => S.bush(ctx, 20, 790, 0.9, false));
    // windmill (spins faster when tapped)
    P(315, 195, ctx => S.windmill(ctx, 315, 195, this.windT));
    // barn (drawn via special path in render so glow layers work) — placeholder prop for sorting
    P(640, 340, ctx => S.barn(ctx, FARM.barn.cx, FARM.barn.baseY, { night: this.game.dark, doorOpen: this.doorOpen }));
    // hay bales beside barn
    P(410, 330, ctx => S.hayBale(ctx, 410, 330, 1));
    P(418, 372, ctx => S.hayBale(ctx, 418, 372, 1, true));
    // tractor (honks & bounces when tapped) + doghouse
    P(905, 205, ctx => {
      const b = this.tractorBounce > 0 ? Math.abs(Math.sin(this.tractorBounce * 18)) * 7 * this.tractorBounce : 0;
      ctx.save(); ctx.translate(0, -b); S.tractor(ctx, 905, 205); ctx.restore();
    });
    P(880, 342, ctx => S.dogHouse(ctx, 880, 342));
    // coop
    P(1080, 190, ctx => S.coop(ctx, 1080, 190));
    // scarecrow (his crow caws when tapped) + sunflowers
    P(955, 455, ctx => {
      const w = this.crowHop > 0 ? Math.sin(this.crowHop * 22) * 0.05 * this.crowHop : 0;
      ctx.save(); ctx.translate(955, 455); ctx.rotate(w); ctx.translate(-955, -455);
      S.scarecrow(ctx, 955, 455, t0()); ctx.restore();
    });
    [880, 912, 944].forEach((x, i) => P(x, 76 + (i % 2) * 4, ctx => S.sunflower(ctx, x, 76 + (i % 2) * 4, t0())));
    // pond decorations
    [[905, 560], [1235, 640], [1040, 735], [1215, 700]].forEach(([x, y]) => P(x, y, ctx => S.rock(ctx, x, y, 1)));
    [[915, 655], [1225, 570], [1000, 520], [1205, 712], [1120, 515]].forEach(([x, y]) => P(x, y, ctx => S.cattail(ctx, x, y, t0())));
    // horse trough + pig trough + mud (mud is on the ground -> low sortY)
    P(330, 545, ctx => S.trough(ctx, 330, 545, true));
    P(268, 640, ctx => S.trough(ctx, 268, 640, false));
    P(170, 700, ctx => S.mud(ctx, 170, 705, 92, 40, t0()), 0);
    // lily pads (ground level)
    this.lilies = [[980, 660, true], [1130, 578, false], [1165, 662, true], [1000, 570, false]];
    this.lilies.forEach(([x, y, f]) => P(x, y, ctx => S.lilyPad(ctx, x, y, 16, f), 1));
    // fences
    const fence = (pts, o = {}) => {
      for (let i = 0; i < pts.length - 1; i++) {
        const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
        const isLast = i === pts.length - 2;
        P(x1, Math.max(y1, y2), ctx => S.fenceSeg(ctx, x1, y1, x2, y2, { ...o, end: isLast }), Math.max(y1, y2) + (o.sortOff || 0));
      }
    };
    const line = (x1, y1, x2, y2, step) => { const pts = []; const n = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1) / step)); for (let i = 0; i <= n; i++) pts.push([U.lerp(x1, x2, i / n), U.lerp(y1, y2, i / n)]); return pts; };
    // perimeter
    fence(line(-10, 28, 1290, 28, 64));
    fence(line(14, 28, 14, 792, 64));
    fence(line(1266, 28, 1266, 792, 64));
    fence(line(-10, 792, 585, 792, 64)); fence(line(695, 792, 1290, 792, 64));
    // gate posts
    P(590, 792, ctx => { D.fillRR(ctx, 583, 748, 14, 46, 4, '#a5693b', OL(), 2.5); D.circle(ctx, 590, 746, 8, '#e0413a', OL(), 2.5); });
    P(690, 792, ctx => { D.fillRR(ctx, 683, 748, 14, 46, 4, '#a5693b', OL(), 2.5); D.circle(ctx, 690, 746, 8, '#e0413a', OL(), 2.5); });
    // paddock
    const pd = FARM.paddock;
    fence(line(pd.x1, pd.y1, pd.x2, pd.y1, 64)); fence(line(pd.x2, pd.y1, pd.x2, pd.y2, 62)); fence(line(pd.x1, pd.y1, pd.x1, pd.y2, 62)); fence(line(pd.x1, pd.y2, pd.x2, pd.y2, 64));
    // pigsty
    const ps = FARM.pigsty;
    fence(line(ps.x1, ps.y1, ps.x2, ps.y1, 65), { h: 26 }); fence(line(ps.x2, ps.y1, ps.x2, ps.y2, 53), { h: 26 }); fence(line(ps.x1, ps.y2, ps.x2, ps.y2, 65), { h: 26 });
    // chicken run (wire)
    const rn = FARM.run;
    fence(line(rn.x1, rn.y1, rn.x2, rn.y1, 70), { wire: true, h: 40, w: 7 }); fence(line(rn.x1, rn.y1, rn.x1, rn.y2, 52), { wire: true, h: 40, w: 7 }); fence(line(rn.x2, rn.y1, rn.x2, rn.y2, 52), { wire: true, h: 40, w: 7 }); fence(line(rn.x1, rn.y2, rn.x2, rn.y2, 70), { wire: true, h: 40, w: 7 });
    // sign posts
    P(470, 760, ctx => { D.fillRR(ctx, 466, 720, 8, 40, 3, '#a5693b', OL(), 2); D.fillRR(ctx, 440, 700, 60, 26, 5, '#f5e6c8', OL(), 2.5); D.text(ctx, 'FARM', 470, 714, 15, '#7a3e12'); });
  }

  _buildAnimals() {
    const A = (sp, x, y, o) => { const a = new Animal(sp, x, y, o); this.animals.push(a); return a; };
    const F = FARM.field, pd = FARM.paddock, ps = FARM.pigsty, rn = FARM.run;
    const z = (r, pad = 20) => ({ x1: r.x1 + pad, y1: r.y1 + pad, x2: r.x2 - pad, y2: r.y2 - pad });
    // cows keep to the left half of the field, sheep to the right — less of a crowd in the middle
    const cowZ = { x1: 470, y1: 440, x2: 680, y2: 710 };
    A('cow', 500, 480, { variant: 0, zone: cowZ }); A('cow', 620, 640, { variant: 1, zone: cowZ }); A('cow', 560, 700, { variant: 2, zone: cowZ });
    // horses in paddock
    A('horse', 150, 440, { variant: 0, zone: z(pd, 45) }); A('horse', 280, 500, { variant: 1, zone: z(pd, 45) });
    // pigs in pigsty
    A('pig', 110, 690, { variant: 0, zone: { x1: 75, y1: 645, x2: 260, y2: 750 } }); A('pig', 200, 730, { variant: 1, zone: { x1: 75, y1: 645, x2: 260, y2: 750 } }); A('pig', 160, 660, { variant: 2, zone: { x1: 75, y1: 645, x2: 260, y2: 750 } });
    // sheep + goat
    const sz = { x1: 660, y1: 420, x2: 860, y2: 750 };
    A('sheep', 720, 470, { variant: 0, zone: sz }); A('sheep', 810, 540, { variant: 1, zone: sz }); A('sheep', 700, 600, { variant: 2, zone: sz }); A('sheep', 830, 700, { variant: 3, zone: sz });
    A('goat', 470, 600, { variant: 0, zone: z(F, 30) });
    // chickens in the run
    const cz = { x1: rn.x1 + 20, y1: rn.y1 + 25, x2: rn.x2 - 20, y2: rn.y2 - 12 };
    for (let i = 0; i < 5; i++) A('chicken', U.rand(cz.x1, cz.x2), U.rand(cz.y1, cz.y2), { variant: i, zone: cz });
    A('rooster', 1000, 290, { variant: 0, zone: cz });
    // ducks in pond
    const pz = () => { const a = U.rand(0, 6.28), r = Math.sqrt(Math.random()) * 0.72; return { x: FARM.pond.cx + Math.cos(a) * FARM.pond.rx * r, y: FARM.pond.cy + Math.sin(a) * FARM.pond.ry * r }; };
    A('duck', 1040, 600, { variant: 0, zone: pz }); A('duck', 1100, 650, { variant: 1, zone: pz }); A('duck', 1000, 640, { variant: 2, zone: pz });
    // dog & cats (dog stays near his house)
    A('dog', 840, 400, { variant: 0, zone: { x1: 700, y1: 360, x2: 900, y2: 580 } });
    const cat = A('cat', 470, 420, { variant: 0, zone: { x1: 400, y1: 370, x2: 880, y2: 770 } });
    const kz = () => ({ x: U.clamp(cat.x + U.rand(-90, 90), 400, 880), y: U.clamp(cat.y + U.rand(-50, 50), 380, 770) });
    A('kitten', 520, 440, { variant: 0, zone: kz }); A('kitten', 440, 460, { variant: 1, zone: kz });
    // night creatures
    this.owl = new Animal('owl', 140 + 30 * 1.2, 240 - 70 * 1.2, { variant: 0, dir: 1 }); this.owl.hidden = true;
    this.frogs = [];
    [[980, 652, 0], [1130, 570, 1], [1165, 654, 2]].forEach(([x, y, v]) => { const f = new Animal('frog', x, y, { variant: v, dir: x < 1060 ? 1 : -1 }); f.hidden = true; f.pad = [x, y]; this.frogs.push(f); });
    this.nightAnimals = [this.owl, ...this.frogs];
  }

  /* ---------- day/night hooks ---------- */
  onModeChange(mode) {
    if (mode === 'night') {
      this.goHome = true; this.emergeQueue = [];
    } else {
      this.goHome = false;
      // animals inside come back out one by one
      this.emergeQueue = U.shuffle(this.animals.filter(a => a.hidden));
      this.emergeT = 0.4;
    }
  }

  /* ---------- update ---------- */
  update(dt) {
    this.t += dt;
    const g = this.game, night = g.mode === 'night';
    const world = { goHome: this.goHome, door: FARM.door, onArrive: a => { Sfx.play('pop', 0.3); } };
    // emerge from barn in the morning
    if (this.emergeQueue.length) {
      this.emergeT -= dt;
      if (this.emergeT <= 0) {
        const a = this.emergeQueue.shift();
        a.hidden = false; a.x = FARM.door.x + U.rand(-10, 10); a.y = FARM.door.y + 4; a.sleeping = false;
        a.state = 'walk'; a.target = a._randomPoint(); a.speedMul = 1;
        this.emergeT = U.rand(0.35, 0.7);
        if (a.species === 'rooster') { a.doTrick(); Sfx.play('rooster', 0.9); a.say(a.cfg.says, 2); } // good-morning crow
      }
    }
    for (const a of this.animals) {
      a.update(dt, world);
      if (a.species === 'duck') a.inWater = !a.hidden && inPond(a.x, a.y, 0.95);
      a.sortY = a.y;
      // pig rolling in mud -> mud drops
      if (a.action && a.action.type === 'roll' && Math.random() < 0.5) this.particles.push({ x: a.x + U.rand(-20, 20), y: a.y - 20, vx: U.rand(-60, 60), vy: U.rand(-140, -60), life: 0.8, r: U.rand(2, 5), color: '#8e6a3a' });
      if (a.action && a.action.type === 'dive' && a.action.p < 0.5 && Math.random() < 0.6) this.particles.push({ x: a.x + U.rand(-16, 16), y: a.y - 4, vx: U.rand(-70, 70), vy: U.rand(-160, -60), life: 0.7, r: U.rand(2, 4), color: '#bfe9ff' });
      if (a.action && (a.action.type === 'flap' || a.action.type === 'crow') && Math.random() < 0.3) this.particles.push({ x: a.x + U.rand(-10, 10), y: a.y - 30, vx: U.rand(-40, 40), vy: U.rand(-40, 10), life: 1.2, r: 3, color: a.variant.body === '#b03a2e' ? '#f5b041' : '#fff', type: 'feather' });
      if (a.action && ['bounce', 'spin', 'rear', 'jump'].includes(a.action.type) && Math.random() < 0.3) this.particles.push({ x: a.x + U.rand(-20, 20), y: a.y, vx: U.rand(-30, 30), vy: U.rand(-30, -5), life: 0.6, r: U.rand(3, 6), color: 'rgba(220,200,150,0.7)' });
      if (a.action && a.action.type === 'pounce' && Math.random() < 0.15) this.particles.push({ x: a.x + U.rand(-10, 10), y: a.y - 40, vx: U.rand(-20, 20), vy: -50, life: 1.2, r: 5, color: '#ff6b81', type: 'heart' });
    }
    // barn doors
    const allIn = this.animals.every(a => a.hidden);
    const doorTarget = (night && allIn) ? 0 : 1;
    this.doorOpen += (doorTarget - this.doorOpen) * Math.min(1, dt * 2.5);
    // night creatures visibility
    const showNight = g.dark > 0.55;
    for (const n of this.nightAnimals) {
      if (showNight && n.hidden) { n.hidden = false; n.glow = 0; }
      if (!showNight && !n.hidden) n.hidden = true;
      n.update(dt, {}); n.sortY = n.species === 'owl' ? 241 : n.y; // owl sits in front of its tree canopy
      n.night = true;
      if (n.species === 'frog' && n.jumpTo) {
        if (n.action) { const p = U.easeInOut(Math.min(1, n.action.p)); n.x = U.lerp(n.jumpFrom[0], n.jumpTo[0], p); n.y = U.lerp(n.jumpFrom[1], n.jumpTo[1], p); }
        else { n.x = n.jumpTo[0]; n.y = n.jumpTo[1]; n.jumpTo = null; }
      }
    }
    // random ambient calls — one animal at a time, well spaced so it never gets noisy
    this.callT -= dt;
    if (this.callT <= 0) {
      this.callT = U.rand(8, 15);
      const vis = this.animals.filter(a => !a.hidden && !a.action);
      if (vis.length && !g.speaking) { const a = U.pick(vis); a.talk(0.9); Sfx.play(a.cfg.sound, 0.4); a.say(a.cfg.says, 1.4); }
    }
    if (showNight) {
      this.owlT -= dt; if (this.owlT <= 0) { this.owlT = U.rand(10, 18); this.owl.talk(1.2); Sfx.play('owl', 0.5); this.owl.say('Hoo hoo!', 1.6); }
      this.frogT -= dt; if (this.frogT <= 0) { this.frogT = U.rand(5, 10); const f = U.pick(this.frogs); f.talk(0.5); Sfx.play('frog', 0.35); }
      this.snoreT -= dt; if (this.snoreT <= 0) { this.snoreT = U.rand(9, 16); Sfx.play('snore', 0.35); }
    }
    // prop feedback timers
    this.windT += dt * (1 + Math.max(0, this.windBoost) * 2.5);
    if (this.windBoost > 0) this.windBoost -= dt;
    if (this.tractorBounce > 0) this.tractorBounce -= dt;
    if (this.crowHop > 0) this.crowHop -= dt;
    // particles
    for (const p of this.particles) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.type !== 'heart' && p.type !== 'feather') p.vy += 300 * dt; if (p.type === 'feather') { p.x += Math.sin(p.life * 8) * 40 * dt; } }
    this.particles = this.particles.filter(p => p.life > 0);
    // clouds
    for (const c of this.clouds) { c.x += c.v * dt; if (c.x > 1400) { c.x = -140; c.y = U.rand(20, 130); } }
    // butterflies
    for (const b of this.butterflies) { b.t += dt; b.a += U.rand(-2, 2) * dt; b.x += Math.cos(b.a) * 40 * dt; b.y += Math.sin(b.a) * 30 * dt; if (b.x < 380 || b.x > 900) b.a = Math.PI - b.a; if (b.y < 380 || b.y > 770) b.a = -b.a; }
    // fireflies
    for (const f of this.fireflies) { f.ph += dt * f.sp; f.a += U.rand(-1.5, 1.5) * dt; f.x += Math.cos(f.a) * 18 * dt; f.y += Math.sin(f.a) * 12 * dt; if (f.x < 360 || f.x > 1240) f.a = Math.PI - f.a; if (f.y < 360 || f.y > 780) f.a = -f.a; }
    // bats
    if (showNight && Math.random() < dt * 0.08 && this.bats.length < 2) this.bats.push({ x: -30, y: U.rand(40, 200), vy: U.rand(-10, 10), t: 0, dir: 1 });
    for (const b of this.bats) { b.t += dt; b.x += 90 * dt; b.y += Math.sin(b.t * 3) * 25 * dt + b.vy * dt; }
    this.bats = this.bats.filter(b => b.x < 1320);
    // shooting stars (deep night only)
    if (showNight && g.dark > 0.9) {
      this.shootT -= dt;
      if (this.shootT <= 0) { this.shootT = U.rand(7, 15); this.shots.push({ x: U.rand(250, 1150), y: U.rand(35, 140), vx: -U.rand(240, 360), vy: U.rand(50, 100), t: 0 }); }
    }
    for (const s of this.shots) { s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; }
    this.shots = this.shots.filter(s => s.t < 1.3 && s.x > -60);
    // pond ripples
    this.rippleT -= dt;
    if (this.rippleT <= 0) { this.rippleT = U.rand(0.5, 1.4); const p = FARM.pond, a = U.rand(0, 6.28), r = Math.random() * 0.8; this.ripples.push({ x: p.cx + Math.cos(a) * p.rx * r, y: p.cy + Math.sin(a) * p.ry * r, t: 0 }); }
    for (const r of this.ripples) r.t += dt;
    this.ripples = this.ripples.filter(r => r.t < 2.2);
  }

  /* ---------- render ---------- */
  render(ctx) {
    const g = this.game, t = this.t, dark = g.dark;
    ctx.drawImage(this.bg, 0, 0);
    // pond ripples & shimmer
    ctx.save();
    S.pondShape(ctx, FARM.pond.cx, FARM.pond.cy, FARM.pond.rx, FARM.pond.ry, 0); ctx.clip();
    for (const r of this.ripples) { const k = r.t / 2.2; ctx.globalAlpha = (1 - k) * 0.6; D.fillEll(ctx, r.x, r.y, 6 + k * 40, 3 + k * 16, null, '#fff', 2); }
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 7; i++) { const x = FARM.pond.cx - 120 + i * 40 + Math.sin(t * 1.5 + i) * 10, y = FARM.pond.cy - 40 + i * 12; D.line(ctx, x - 12, y, x + 12, y, 'rgba(255,255,255,0.7)', 2.5); }
    if (dark > 0.4) { ctx.globalAlpha = dark * 0.5; D.fillEll(ctx, FARM.pond.cx + 40, FARM.pond.cy - 20 + Math.sin(t) * 2, 30, 12, '#fff1b8'); }
    ctx.restore();
    // cloud shadows
    if (dark < 0.7) { ctx.save(); ctx.globalAlpha = (1 - dark) * 0.1; for (const c of this.clouds) D.fillEll(ctx, c.x + 30, c.y + 300, 70 * c.s, 30 * c.s, '#000'); ctx.restore(); }
    // fireflies drawn behind entities? no — later with glow. Entities:
    const ents = [];
    for (const p of this.props) ents.push({ sortY: p.sortY, draw: c => p.draw(c) });
    for (const a of this.animals) if (!a.hidden) ents.push({ sortY: a.sortY, draw: c => a.draw(c, t) });
    for (const n of this.nightAnimals) if (!n.hidden) ents.push({ sortY: n.sortY, draw: c => n.draw(c, t, { night: true }) });
    ents.sort((a, b) => a.sortY - b.sortY);
    for (const e of ents) e.draw(ctx);
    // particles
    for (const p of this.particles) {
      ctx.save(); ctx.globalAlpha = Math.min(1, p.life * 2);
      if (p.type === 'heart') { ctx.translate(p.x, p.y); ctx.fillStyle = p.color; ctx.beginPath(); ctx.moveTo(0, 4); ctx.bezierCurveTo(-8, -4, -4, -10, 0, -5); ctx.bezierCurveTo(4, -10, 8, -4, 0, 4); ctx.fill(); }
      else if (p.type === 'feather') { D.fillEll(ctx, p.x, p.y, 5, 2.5, p.color, OL(), 1.2, Math.sin(p.life * 5)); }
      else D.circle(ctx, p.x, p.y, p.r, p.color);
      ctx.restore();
    }
    // butterflies (day)
    if (dark < 0.6) { ctx.save(); ctx.globalAlpha = 1 - dark; for (const b of this.butterflies) S.butterfly(ctx, b.x, b.y, b.t, b.color); ctx.restore(); }
    // clouds
    for (const c of this.clouds) S.cloud(ctx, c.x, c.y, c.s, 0.92);
    // bats
    for (const b of this.bats) S.bat(ctx, b.x, b.y, b.t);
    // ---- night overlay (multiply) ----
    if (dark > 0.001) {
      ctx.save(); ctx.globalCompositeOperation = 'multiply';
      const col = dark < 0.45 ? U.mix('#ffffff', '#ffb98a', dark / 0.45) : U.mix('#ffb98a', '#4d5aa8', (dark - 0.45) / 0.55);
      ctx.fillStyle = col; ctx.fillRect(0, 0, FARM.W, FARM.H);
      ctx.restore();
      // glows
      S.barnGlow(ctx, FARM.barn.cx, FARM.barn.baseY, dark);
      if (dark > 0.5) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (const f of this.fireflies) { const a = (0.5 + 0.5 * Math.sin(f.ph * 2)) * (dark - 0.5) * 2; if (a < 0.05) continue; ctx.globalAlpha = a; ctx.drawImage(this.fireflySprite, f.x - 12, f.y - 12); }
        ctx.globalAlpha = 1;
        // owl eye glow
        if (!this.owl.hidden) { const hp = { x: this.owl.x, y: this.owl.y - 50 }; const gr = ctx.createRadialGradient(hp.x, hp.y, 0, hp.x, hp.y, 34); gr.addColorStop(0, 'rgba(255,230,120,0.5)'); gr.addColorStop(1, 'rgba(255,230,120,0)'); ctx.fillStyle = gr; ctx.fillRect(hp.x - 34, hp.y - 34, 68, 68); }
        ctx.restore();
        // lift the night creatures a little so they stay easy to see (and tap)
        ctx.save(); ctx.globalAlpha = 0.45 * (dark - 0.5) * 2;
        for (const n of this.nightAnimals) if (!n.hidden) n.draw(ctx, t, { night: true });
        ctx.restore();
      }
    }
    // speech bubbles (always on top)
    for (const a of this.animals) a.drawBubble(ctx);
    for (const n of this.nightAnimals) n.drawBubble(ctx);
    // sun / moon
    if (dark < 0.5) { ctx.save(); ctx.globalAlpha = 1 - dark * 2; S.sun(ctx, 440, 62, t); ctx.restore(); }
    else {
      ctx.save(); ctx.globalAlpha = (dark - 0.5) * 2;
      [[380, 40], [500, 30], [520, 90], [360, 100], [470, 120], [400, 130]].forEach(([x, y], i) => S.star(ctx, x, y, 5, 0.5 + 0.5 * Math.abs(Math.sin(t * 2 + i))));
      S.moon(ctx, 440, 62, t); ctx.restore();
      // shooting stars
      for (const s of this.shots) {
        const a = Math.max(0, Math.min(1, 1.3 - s.t) * (dark - 0.5) * 2);
        ctx.save(); ctx.globalAlpha = a;
        ctx.strokeStyle = '#fff6c2'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 0.16, s.y - s.vy * 0.16); ctx.stroke();
        D.circle(ctx, s.x, s.y, 3, '#fffceb');
        ctx.restore();
      }
    }
  }

  /* ---------- input ---------- */
  hitAnimal(x, y) { return Animal.pickHit([...this.animals, ...this.nightAnimals], x, y); }
  hitBarn(x, y) { const h = FARM.barn.hit; return x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h; }

  _propHit(x, y) {
    const inR = r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
    if (inR({ x: 845, y: 118, w: 124, h: 98 })) return 'tractor';
    if (inR({ x: 913, y: 333, w: 84, h: 127 })) return 'scarecrow';
    if (inR({ x: 283, y: 25, w: 64, h: 175 })) return 'windmill';
    return null;
  }
  _propTap(x, y) {
    const p = this._propHit(x, y);
    if (p === 'tractor') { Sfx.play('honk'); this.tractorBounce = 0.7; this.sparkle(x, y, 6); }
    else if (p === 'scarecrow') { Sfx.play('caw'); this.crowHop = 0.9; this.sparkle(x, y, 6); }
    else if (p === 'windmill') { Sfx.play('whoosh', 0.7); this.windBoost = 4; this.sparkle(x, y, 6); }
    return !!p;
  }
  onSingle(x, y) {
    const a = this.hitAnimal(x, y);
    if (a) { this.game.introduce(a); this.sparkle(x, y); return; }
    if (this.hitBarn(x, y)) { this.game.enterBarn(); return; }
    if (this._propTap(x, y)) return;
    // clicked ground: tiny sparkle
    this.sparkle(x, y, 4);
  }
  onDouble(x, y) {
    const a = this.hitAnimal(x, y);
    if (a) {
      if (a.species === 'frog' && a.action) return; // mid-jump
      this.game.trick(a);
      if (a.species === 'frog') {
        const taken = this.frogs.filter(f => f !== a).map(f => f.jumpTo || [f.x, f.y]);
        const free = this.lilies.filter(l => Math.hypot(l[0] - a.x, l[1] - a.y) > 30 && !taken.some(t => Math.hypot(t[0] - l[0], t[1] - l[1]) < 30));
        const other = U.pick(free.length ? free : this.lilies);
        a.jumpFrom = [a.x, a.y]; a.jumpTo = [other[0], other[1] - 8]; a.dir = other[0] > a.x ? 1 : -1;
        setTimeout(() => Sfx.play('splash', 0.5), 700);
      }
      return;
    }
    if (this.hitBarn(x, y)) { this.game.enterBarn(); }
  }
  sparkle(x, y, n = 8) {
    for (let i = 0; i < n; i++) { const a = U.rand(0, 6.28), sp = U.rand(40, 120); this.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, life: 0.6, r: U.rand(2, 4), color: U.pick(['#ffd23f', '#ff9f43', '#fff', '#a29bfe']) }); }
  }
  hover(x, y) { return !!(this.hitAnimal(x, y) || this.hitBarn(x, y) || this._propHit(x, y)); }
}
