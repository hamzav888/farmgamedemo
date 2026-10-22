/* ---------- Inside the barn ---------- */
class BarnScene {
  constructor(game) {
    this.game = game; this.t = 0;
    this.animals = []; this.zs = []; this.motes = []; this.confetti = [];
    this.counts = {}; // group -> number counted so far
    this.quiz = null; this.autoCount = null;
    // Camera. During a quiz we glide in on just the animals being counted so a
    // toddler isn't asked to count three pigs out of a barn full of animals.
    this.cam = { x: 640, y: 400, s: 1, tx: 640, ty: 400, ts: 1 };
    this.snoreT = 3; this._allDone = false;
    this.vignette = S.makeVignette(1280, 800);
    this._buildBackground();
    this._buildAnimals();
    for (let i = 0; i < 40; i++) this.motes.push({ x: U.rand(400, 900), y: U.rand(60, 700), vx: U.rand(-6, 6), vy: U.rand(-4, 4), ph: U.rand(0, 6.28) });
  }
  _buildBackground() {
    const c = document.createElement('canvas'); c.width = 1280; c.height = 800;
    const ctx = c.getContext('2d');
    S.barnInterior(ctx, 1280, 800);
    // stalls along the back wall
    [40, 190, 340].forEach(x => S.stallDivider(ctx, x, 330, 440));   // horse stalls
    [400, 560, 720, 880].forEach(x => S.stallDivider(ctx, x, 330, 440)); // cow stalls
    // hay in the stalls
    [115, 265].forEach(x => S.hayPile(ctx, x, 445, 0.9)); [480, 640, 800].forEach(x => S.hayPile(ctx, x, 445, 0.9));
    S.hayPile(ctx, 200, 690, 1.0); S.hayPile(ctx, 620, 690, 1.1); S.hayPile(ctx, 860, 690, 0.8);
    // name plates on the wall
    S.namePlate(ctx, 190, 250, 'HORSES'); S.namePlate(ctx, 640, 250, 'COWS'); S.namePlate(ctx, 1110, 250, 'CHICKENS');
    S.namePlate(ctx, 190, 540, 'PIGS'); S.namePlate(ctx, 640, 520, 'SHEEP & GOAT'); S.namePlate(ctx, 1000, 560, 'DOG'); S.namePlate(ctx, 1090, 402, 'DUCKS'); S.namePlate(ctx, 1160, 550, 'CATS');
    // roosts (two levels) + nest + bed
    S.roost(ctx, 940, 1250, 300); S.roost(ctx, 920, 1260, 358);
    S.nest(ctx, 1090, 450);
    S.bed(ctx, 1000, 705);
    S.hayBale(ctx, 1150, 660, 1.2);
    // pens (rails in front are drawn live so they overlap animals)
    this.bg = c;
  }
  _buildAnimals() {
    const A = (sp, x, y, o) => { const a = new Animal(sp, x, y, { sleeping: true, scale: 1.1, hitPad: 12, ...o }); a.home = { x, y }; this.animals.push(a); return a; };
    // back row
    A('horse', 112, 442, { variant: 0, dir: 1 }); A('horse', 268, 442, { variant: 1, dir: -1 });
    A('cow', 480, 442, { variant: 0, dir: 1 }); A('cow', 640, 442, { variant: 1, dir: -1 }); A('cow', 800, 442, { variant: 2, dir: 1 });
    // chickens on two roosts
    [[985, 298], [1095, 298], [1205, 298], [975, 356], [1085, 356]].forEach(([x, y], i) => A('chicken', x, y, { variant: i, dir: i % 2 ? -1 : 1 }));
    A('rooster', 1210, 354, { variant: 0, dir: -1 });
    // ducks in the nest
    A('duck', 1045, 448, { variant: 0, dir: 1 }); A('duck', 1100, 456, { variant: 1, dir: -1 }); A('duck', 1145, 446, { variant: 2, dir: 1 });
    // front row
    A('pig', 100, 665, { variant: 0, dir: 1 }); A('pig', 215, 705, { variant: 1, dir: -1 }); A('pig', 305, 655, { variant: 2, dir: 1 });
    A('sheep', 450, 650, { variant: 0, dir: 1 }); A('sheep', 560, 705, { variant: 1, dir: -1 }); A('sheep', 670, 650, { variant: 2, dir: 1 }); A('sheep', 780, 705, { variant: 3, dir: -1 });
    A('goat', 885, 655, { variant: 0, dir: -1 });
    A('dog', 1000, 708, { variant: 0, dir: 1 });
    A('cat', 1150, 640, { variant: 0, dir: -1 }); A('kitten', 1100, 720, { variant: 0, dir: 1, scale: 1.35 }); A('kitten', 1210, 722, { variant: 1, dir: -1, scale: 1.35 });
    this.groups = {};
    for (const a of this.animals) (this.groups[a.cfg.group] = this.groups[a.cfg.group] || []).push(a);
  }
  groupInfo(group) {
    const list = this.groups[group]; const first = list[0].cfg;
    const plural = group === 'cat' ? 'cats' : group === 'chicken' ? 'chickens' : first.plural;
    const single = group === 'cat' ? 'cat' : first.name.toLowerCase();
    return { list, plural, single, emoji: first.emoji };
  }
  resetCounts() { this.counts = {}; this._allDone = false; for (const a of this.animals) { a.counted = 0; a.glow = 0; } }

  /* ---------- camera ---------- */
  // Frame a group of animals: centre on them and zoom in, keeping the view
  // inside the barn walls and leaving room for the quiz panel along the top.
  focusGroup(list) {
    if (!list || !list.length) return this.resetCam();
    let x1 = 1e9, y1 = 1e9, x2 = -1e9, y2 = -1e9;
    for (const a of list) {
      const b = a.bounds();
      x1 = Math.min(x1, b.x); y1 = Math.min(y1, b.y);
      x2 = Math.max(x2, b.x + b.w); y2 = Math.max(y2, b.y + b.h);
    }
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    // The camera may not leave the barn, so for a group near a wall it cannot
    // simply centre on them. Walk the zoom down until the whole group lands
    // inside the safe rect (clear of the HUD and the quiz panel up top).
    const SX1 = 16, SX2 = 1264, SY1 = 318, SY2 = 792;
    let best = null;
    for (let z = 2.0; z >= 1.001; z -= 0.04) {
      const cx = U.clamp(mx, 640 / z, 1280 - 640 / z);
      const cy = U.clamp(my - 90 / z, 400 / z, 800 - 400 / z);
      const px = w => 640 + (w - cx) * z, py = w => 400 + (w - cy) * z;
      if (px(x1) >= SX1 && px(x2) <= SX2 && py(y1) >= SY1 && py(y2) <= SY2) { best = { z, cx, cy }; break; }
    }
    if (!best) { const z = 1; best = { z, cx: 640, cy: 400 }; }
    this.cam.ts = best.z; this.cam.tx = best.cx; this.cam.ty = best.cy;
  }
  resetCam() { this.cam.ts = 1; this.cam.tx = 640; this.cam.ty = 400; }
  _clampCam() {
    const s = this.cam.ts, hw = 640 / s, hh = 400 / s;
    this.cam.tx = U.clamp(this.cam.tx, hw, 1280 - hw);
    this.cam.ty = U.clamp(this.cam.ty, hh, 800 - hh);
  }
  _updateCam(dt) {
    const c = this.cam, k = Math.min(1, dt * 3.4);
    c.x += (c.tx - c.x) * k; c.y += (c.ty - c.y) * k; c.s += (c.ts - c.s) * k;
  }
  // screen (canvas) coords -> barn world coords
  _unproject(x, y) {
    const c = this.cam;
    return { x: (x - 640) / c.s + c.x, y: (y - 400) / c.s + c.y };
  }

  enter() { this.t = 0; this.cam.x = this.cam.tx = 640; this.cam.y = this.cam.ty = 400; this.cam.s = this.cam.ts = 1; }

  update(dt) {
    this.t += dt;
    this._updateCam(dt);
    const night = this.game.dark > 0.5;
    for (const a of this.animals) {
      a.hidden = !night;
      a.update(dt, {});
      a.sortY = a.y;
      if (a.glow > 0) a.glow = Math.max(0, a.glow - dt * 0.6);
      // Zzz
      if (night && a.sleeping) { a.zAcc += dt; if (a.zAcc > U.rand(1.6, 3.2)) { a.zAcc = 0; const hp = a.headPos(); this.zs.push({ x: hp.x + a.dir * 6, y: hp.y - 6, t: 0, s: 0.6 + Math.random() * 0.4, dx: a.dir }); } }
    }
    for (const z of this.zs) { z.t += dt; }
    this.zs = this.zs.filter(z => z.t < 2.4);
    if (night) {
      this.snoreT -= dt;
      if (this.snoreT <= 0) { this.snoreT = U.rand(2.8, 5); Sfx.play('snore', U.rand(0.5, 0.9)); }
    }
    for (const m of this.motes) { m.ph += dt; m.x += m.vx * dt + Math.sin(m.ph) * 4 * dt; m.y += m.vy * dt; if (m.y < 60 || m.y > 720) m.vy *= -1; if (m.x < 380 || m.x > 920) m.vx *= -1; }
    for (const c of this.confetti) { c.t += dt; c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 260 * dt; c.rot += c.vr * dt; }
    this.confetti = this.confetti.filter(c => c.t < 2.6);
    // auto counting sequence (used by quiz)
    if (this.autoCount) {
      this.autoCount.t -= dt;
      if (this.autoCount.t <= 0) {
        const ac = this.autoCount, a = ac.list[ac.i];
        if (a) { this._countAnimal(a, true); ac.i++; ac.t = 0.95; }
        else { this.autoCount = null; if (ac.done) ac.done(); }
      }
    }
  }

  render(ctx) {
    const t = this.t, dark = this.game.dark, night = dark > 0.5;
    const c = this.cam;
    ctx.save();
    ctx.translate(640, 400); ctx.scale(c.s, c.s); ctx.translate(-c.x, -c.y);
    ctx.drawImage(this.bg, 0, 0);
    S.barnWindow(ctx, 555, 70, 170, 150, dark, t);
    S.lantern(ctx, 1000, 220, night, t);
    // sunbeams by day
    if (!night) {
      ctx.save(); ctx.globalAlpha = 0.14 * (1 - dark * 2);
      const beam = (x0, w0, x1, w1) => { const g = ctx.createLinearGradient(0, 200, 0, 780); g.addColorStop(0, '#fff8d0'); g.addColorStop(1, 'rgba(255,248,208,0)'); D.poly(ctx, [[x0, 210], [x0 + w0, 210], [x1 + w1, 780], [x1, 780]], g); };
      beam(570, 60, 380, 200); beam(650, 60, 560, 220);
      ctx.restore();
      ctx.save(); for (const m of this.motes) { ctx.globalAlpha = 0.25 + 0.25 * Math.sin(m.ph * 2); D.circle(ctx, m.x, m.y, 2, '#fff8d0'); } ctx.restore();
    }
    // entities (animals + front rails), y-sorted
    const ents = [];
    // during a quiz, everyone who isn't being counted fades back so a small
    // child only has to see the animals the question is actually about
    const focus = this.quiz ? new Set(this.quiz.info.list.map(a => a.id)) : null;
    for (const a of this.animals) if (!a.hidden) ents.push({
      y: a.sortY, d: c => {
        const faded = focus && !focus.has(a.id);
        if (faded) { c.save(); c.globalAlpha = 0.28; }
        a.draw(c, t);
        if (faded) c.restore();
      }
    });
    ents.push({ y: 745, d: c => S.penRail(c, 40, 340, 745) });      // pig pen front
    ents.push({ y: 745, d: c => S.penRail(c, 385, 930, 745) });     // sheep pen front
    ents.push({ y: 500, d: c => { S.penRail(c, 40, 190, 500); S.penRail(c, 200, 350, 500); } }); // horse stall fronts
    ents.push({ y: 500, d: c => { S.penRail(c, 405, 555, 500); S.penRail(c, 565, 715, 500); S.penRail(c, 725, 875, 500); } });
    ents.sort((a, b) => a.y - b.y);
    for (const e of ents) e.d(ctx);
    // night tint (multiply) + lantern glow
    if (dark > 0.001) {
      ctx.save(); ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = U.mix('#ffffff', '#8b84b8', dark); ctx.fillRect(0, 0, 1280, 800); ctx.restore();
      if (night) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const f = 1 + Math.sin(t * 9) * 0.04;
        const g = ctx.createRadialGradient(1000, 226, 10, 1000, 226, 420 * f); g.addColorStop(0, 'rgba(255,190,90,0.55)'); g.addColorStop(0.4, 'rgba(255,170,70,0.18)'); g.addColorStop(1, 'rgba(255,170,70,0)');
        ctx.fillStyle = g; ctx.fillRect(500, 0, 780, 800);
        // moonlight through window
        const m = ctx.createLinearGradient(0, 220, 0, 700); m.addColorStop(0, 'rgba(180,200,255,0.25)'); m.addColorStop(1, 'rgba(180,200,255,0)');
        D.poly(ctx, [[560, 220], [720, 220], [820, 700], [420, 700]], m);
        ctx.restore();
      }
    }
    // Zzz (above the tint so they stay bright)
    for (const z of this.zs) {
      const k = z.t / 2.4; ctx.save(); ctx.globalAlpha = (k < 0.15 ? k / 0.15 : 1 - Math.max(0, (k - 0.6) / 0.4)) * 0.85;
      const x = z.x + Math.sin(z.t * 2.5) * 10 * z.dx + k * 14 * z.dx, y = z.y - k * 60, sz = (16 + k * 16) * z.s;
      D.text(ctx, 'z', x, y, sz, '#fff8d0', { stroke: OL(), lw: 5 });
      ctx.restore();
    }
    // count badges
    for (const a of this.animals) {
      if (a.hidden || !a.counted) continue;
      const hp = a.headPos(); const bx = hp.x, by = hp.y - 22;
      D.circle(ctx, bx, by, 19, '#ffd23f', OL(), 3);
      D.text(ctx, String(a.counted), bx, by + 1, 24, '#7a3e12');
    }
    // bubbles + confetti (top)
    for (const a of this.animals) a.drawBubble(ctx);
    for (const c of this.confetti) { ctx.save(); ctx.globalAlpha = c.t > 2 ? 2.6 - c.t : 1; ctx.translate(c.x, c.y); ctx.rotate(c.rot); ctx.fillStyle = c.color; ctx.fillRect(-5, -3, 10, 6); ctx.restore(); }
    // day-time message
    if (!night) {
      D.text(ctx, 'Everyone is outside playing! 🌞', 640, 385, 36, '#fff', { stroke: OL(), lw: 7 });
      D.text(ctx, 'Tap the 🌙 moon button up top to make it night', 640, 438, 26, '#fff8d0', { stroke: OL(), lw: 6 });
      D.text(ctx, 'and watch the animals sleep!', 640, 476, 26, '#fff8d0', { stroke: OL(), lw: 6 });
    }
    ctx.restore();
    // drawn outside the camera transform so the edge darkening stays put when we zoom
    ctx.drawImage(this.vignette, 0, 0);
  }

  /* ---------- counting ---------- */
  hitAnimal(x, y) { const p = this._unproject(x, y); return Animal.pickHit(this.animals, p.x, p.y); }
  onSingle(x, y) {
    if (this.game.dark <= 0.5) return;
    if (this.autoCount) return;
    const a = this.hitAnimal(x, y);
    if (!a) return;
    if (this.quiz && this.quiz.state === 'ask') { // clicking during a quiz just glows the animal
      a.glow = 1; Sfx.play('pop'); return;
    }
    this._countAnimal(a, false);
  }
  onDouble(x, y) {
    if (this.game.dark <= 0.5) return;
    const a = this.hitAnimal(x, y);
    if (!a) return;
    // wake up briefly and do the sound
    a.sleeping = false; a.wakeT = 2.6; a.happy = true; a.poke(1.2);
    const d = Sfx.play(a.cfg.sound, 0.8, a.x); a.talk(Math.min(2.6, d || 1)); a.say(a.cfg.says, Math.max(1.6, d + 0.4));
    this.game.showCard(a);
    this.game.narrate(`Shhh! The ${a.cfg.name.toLowerCase()} says ${a.cfg.says.replace('!', '')}... and goes back to sleep.`);
  }
  _countAnimal(a, auto) {
    const group = a.cfg.group, info = this.groupInfo(group);
    if (a.counted) { // already counted -> repeat its number
      Sfx.play('count'); a.glow = 1;
      this.game.narrate(`${U.numberWord(a.counted)[0].toUpperCase() + U.numberWord(a.counted).slice(1)}!`);
      return;
    }
    const n = (this.counts[group] || 0) + 1;
    this.counts[group] = n; a.counted = n; a.glow = 1;
    Sfx.play('count', 1, a.x); a.talk(0.5); a.poke(0.8);
    const total = info.list.length;
    const word = U.numberWord(n);
    if (n >= total) {
      Sfx.play('success', 0.9);
      this.burst(a.x, a.y - 60);
      const msg = total === 1 ? `One ${info.single}! There is only one ${info.single}. Great counting!` : `${word[0].toUpperCase() + word.slice(1)}! There are ${word} ${info.plural}! Great counting!`;
      this.game.narrate(msg);
      if (!auto) { const c = this.cam; this.game.addStars(1, 640 + (a.x - c.x) * c.s, 400 + (a.y - 60 - c.y) * c.s); }
      if (!this.quiz && !this._allDone && this.animals.every(x => x.counted)) { this._allDone = true; setTimeout(() => this.allDone(), 2400); }
    } else {
      this.game.narrate(`${word[0].toUpperCase() + word.slice(1)}...`, { rate: 1.0 });
    }
  }
  allDone() {
    Sfx.play('firework'); Sfx.play('success', 1); Sfx.play('cheer', 0.6);
    for (let i = 0; i < 5; i++) setTimeout(() => this.burst(U.rand(300, 1000), U.rand(200, 450)), i * 350);
    this.game.addStars(3);
    this.game.narrate('Hooray! You counted EVERY animal in the barn! Three gold stars for you!');
  }
  burst(x, y) {
    for (let i = 0; i < 40; i++) this.confetti.push({ x, y, vx: U.rand(-220, 220), vy: U.rand(-320, -80), t: 0, rot: U.rand(0, 6), vr: U.rand(-8, 8), color: U.pick(['#ff6b6b', '#ffd23f', '#48c774', '#54a0ff', '#a29bfe', '#ff9f43']) });
    Sfx.play('sparkle', 0.8);
  }

  /* ---------- quiz ---------- */
  startQuiz() {
    if (this.game.dark <= 0.5) return;
    const groups = Object.keys(this.groups).filter(g => this.groups[g].length >= 2 || Math.random() < 0.3);
    let g = U.pick(groups); if (this.quiz && this.quiz.group === g && groups.length > 1) g = U.pick(groups.filter(x => x !== g));
    this.resetCounts();
    const info = this.groupInfo(g);
    this.quiz = { group: g, state: 'ask', answer: info.list.length, info };
    for (const a of info.list) a.glow = 1;
    this.focusGroup(info.list);
    const q = `How many ${info.plural} are sleeping?`;
    this.game.showQuiz(`${info.emoji} ${q}`, Math.max(6, Math.min(8, info.list.length + 2)), n => this.answer(n));
    this.game.narrate(`How many ${info.plural} can you see? Count them, then tap the number!`);
  }
  answer(n) {
    if (!this.quiz || this.quiz.state !== 'ask') return;
    const q = this.quiz, info = q.info;
    if (n === q.answer) {
      q.state = 'done'; Sfx.play('success'); this.game.addStars(1);
      this.game.markQuizAnswer(n, true);
      const list = info.list; this.burst(this.cam.tx, this.cam.ty);
      this.game.narrate(`Yes! There are ${U.numberWord(n)} ${info.plural}! Well done! Let's count them together.`, { onend: () => {
        this.autoCount = { list, i: 0, t: 0.2, done: () => { this.game.hideQuiz(); setTimeout(() => this.startQuiz(), 800); } };
      } });
    } else {
      Sfx.play('oops'); this.game.markQuizAnswer(n, false);
      q.state = 'help';
      this.game.narrate(`Hmm, not ${U.numberWord(n)}. Let's count the ${info.plural} together!`, { onend: () => {
        this.resetCounts();
        this.autoCount = { list: info.list, i: 0, t: 0.2, done: () => { q.state = 'ask'; this.game.narrate(`So, how many ${info.plural}? Tap the number!`); this.game.resetQuizButtons(); } };
      } });
    }
  }
  stopQuiz() { this.quiz = null; this.autoCount = null; this.resetCam(); this.game.hideQuiz(); }
  hover(x, y) { return this.game.dark > 0.5 && !!this.hitAnimal(x, y); }
}
