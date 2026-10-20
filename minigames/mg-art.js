/* ---------- Mini-game art ----------
   Everything new the mini-games need to draw, in exactly the main game's style:
   the same D.* primitives, the same chunky outline (D.OUTLINE), the same palette.
   Every drawer is centred on (0,0) at scale 1 unless it says otherwise, so games
   can ctx.translate/scale freely. */
const MA = {
  /* ================= vegetables =================
     Each has a silhouette path (used for the hole it fits into) and a detail
     pass (leaves, ridges, kernels). Shapes are deliberately very distinct from
     each other so a two-year-old can match by shape alone, and colours are
     distinct enough to match by colour alone — except carrot vs pumpkin, which
     share orange on purpose so the shape has to do the work. */
  VEG: {
    carrot:   { name: 'Carrot',   color: '#ff8c42', emoji: '🥕' },
    tomato:   { name: 'Tomato',   color: '#e74c3c', emoji: '🍅' },
    corn:     { name: 'Corn',     color: '#ffd23f', emoji: '🌽' },
    eggplant: { name: 'Eggplant', color: '#7b4fb5', emoji: '🍆' },
    pumpkin:  { name: 'Pumpkin',  color: '#ff9f43', emoji: '🎃' },
    peapod:   { name: 'Peas',     color: '#5dbb63', emoji: '🫛' },
    cabbage:  { name: 'Cabbage',  color: '#9ad26a', emoji: '🥬' },
    radish:   { name: 'Radish',   color: '#ff5e8a', emoji: '🌱' },
  },
  vegPath(ctx, kind) {
    ctx.beginPath();
    switch (kind) {
      case 'carrot':
        ctx.moveTo(-18, -38); ctx.quadraticCurveTo(-21, 12, 0, 48); ctx.quadraticCurveTo(21, 12, 18, -38); ctx.quadraticCurveTo(0, -47, -18, -38); break;
      case 'tomato':
        ctx.ellipse(0, 2, 38, 34, 0, 0, Math.PI * 2); break;
      case 'corn':
        D.rr(ctx, -19, -48, 38, 96, 19); return;
      case 'eggplant':
        ctx.moveTo(0, -46); ctx.bezierCurveTo(22, -46, 31, 0, 27, 20); ctx.bezierCurveTo(23, 46, -23, 46, -27, 20); ctx.bezierCurveTo(-31, 0, -22, -46, 0, -46); break;
      case 'pumpkin':
        ctx.ellipse(0, 4, 48, 36, 0, 0, Math.PI * 2); break;
      case 'peapod':
        ctx.moveTo(-48, 10); ctx.quadraticCurveTo(0, -38, 48, 10); ctx.quadraticCurveTo(0, 16, -48, 10); break;
      case 'cabbage':
        ctx.arc(0, 0, 40, 0, Math.PI * 2); break;
      case 'radish':
        ctx.moveTo(-28, -4); ctx.quadraticCurveTo(-29, -34, 0, -34); ctx.quadraticCurveTo(29, -34, 28, -4); ctx.quadraticCurveTo(25, 22, 0, 40); ctx.quadraticCurveTo(-25, 22, -28, -4); break;
    }
    ctx.closePath();
  },
  // the vegetable itself
  drawVeg(ctx, kind, o = {}) {
    const V = MA.VEG[kind], OLc = D.OUTLINE;
    ctx.save();
    if (o.shadow !== false) D.shadow(ctx, 0, 48, 34, 9, 0.16);
    // leaves / stalks go BEHIND the body
    if (kind === 'carrot') { [-10, 0, 10].forEach((dx, i) => D.fillEll(ctx, dx, -56 - (i === 1 ? 6 : 0), 6, 16, '#3fa34d', OLc, 2.2, dx * 0.03)); }
    if (kind === 'radish') { [-9, 0, 9].forEach((dx, i) => D.fillEll(ctx, dx * 1.3, -46 - (i === 1 ? 8 : 0), 7, 15, '#3fa34d', OLc, 2.2, dx * 0.04)); }
    if (kind === 'corn') { D.fillEll(ctx, -24, 14, 10, 40, '#7ccc5a', OLc, 2.4, 0.25); D.fillEll(ctx, 24, 14, 10, 40, '#7ccc5a', OLc, 2.4, -0.25); }
    if (kind === 'peapod') { D.line(ctx, -46, 8, -58, -4, '#3fa34d', 4); }
    if (kind === 'pumpkin') { D.fillRR(ctx, -6, -46, 12, 18, 4, '#6b8e23', OLc, 2.4); }
    MA.vegPath(ctx, kind);
    ctx.fillStyle = V.color; ctx.fill(); ctx.strokeStyle = OLc; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke();
    // details inside the body
    ctx.save(); MA.vegPath(ctx, kind); ctx.clip();
    switch (kind) {
      case 'carrot':
        [-20, -4, 12, 26].forEach(y => D.line(ctx, -12, y, 12, y + 2, 'rgba(120,50,0,0.22)', 2.4));
        D.fillEll(ctx, -8, -14, 4, 22, 'rgba(255,255,255,0.28)'); break;
      case 'tomato':
        D.fillEll(ctx, -14, -12, 9, 6, 'rgba(255,255,255,0.35)', null, 0, -0.5); break;
      case 'corn':
        for (let r = -36; r <= 36; r += 12) for (let c = -12; c <= 12; c += 12) D.fillEll(ctx, c + (r % 24 ? 6 : 0), r, 5.2, 4.6, '#f7e27a', 'rgba(150,110,0,0.35)', 1.2);
        D.fillEll(ctx, -10, -20, 4, 24, 'rgba(255,255,255,0.25)'); break;
      case 'eggplant':
        D.fillEll(ctx, -12, 6, 5, 22, 'rgba(255,255,255,0.22)', null, 0, 0.1); break;
      case 'pumpkin':
        [-30, -10, 10, 30].forEach(x => { ctx.beginPath(); ctx.ellipse(x, 4, 12, 34, 0, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(120,50,0,0.22)'; ctx.lineWidth = 3; ctx.stroke(); });
        D.fillEll(ctx, -18, -12, 10, 5, 'rgba(255,255,255,0.3)'); break;
      case 'peapod':
        [-28, -9, 10, 29].forEach(x => D.circle(ctx, x, 1 + Math.abs(x) * 0.08, 8.5, '#7ddc7f', 'rgba(20,90,30,0.45)', 1.6));
        break;
      case 'cabbage':
        [[-14, -10, 24, 0.6], [14, -8, 22, -0.4], [0, 14, 26, 0.1]].forEach(([x, y, r, rot]) => { ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.7, rot, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(30,110,40,0.4)'; ctx.lineWidth = 3; ctx.stroke(); });
        D.circle(ctx, 0, 0, 10, '#c8f0a0', 'rgba(30,110,40,0.4)', 2); break;
      case 'radish':
        D.fillEll(ctx, -10, -14, 6, 10, 'rgba(255,255,255,0.35)', null, 0, 0.4);
        D.line(ctx, 0, 30, 0, 40, 'rgba(120,30,50,0.4)', 2); break;
    }
    ctx.restore();
    // bits that sit ON TOP of the body
    if (kind === 'tomato') { for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / 5; D.fillEll(ctx, Math.cos(a) * 11, -28 + Math.sin(a) * 6, 12, 4.5, '#3fa34d', OLc, 2, a); } D.circle(ctx, 0, -31, 4, '#3fa34d', OLc, 2); }
    if (kind === 'eggplant') { for (let i = 0; i < 4; i++) { const a = Math.PI * 0.25 + i * Math.PI * 0.5; D.fillEll(ctx, Math.cos(a) * 12, -40 + Math.sin(a) * 4, 13, 5, '#3fa34d', OLc, 2, a * 0.5); } D.fillRR(ctx, -4, -58, 8, 18, 3, '#6b8e23', OLc, 2); }
    if (kind === 'cabbage') { D.fillEll(ctx, -30, 12, 18, 10, '#7ccc5a', OLc, 2.2, 0.6); D.fillEll(ctx, 30, 12, 18, 10, '#7ccc5a', OLc, 2.2, -0.6); }
    ctx.restore();
  },
  // the hole the vegetable fits into: its silhouette, in its own colour but
  // darkened into the soil, with a soft inner shadow so it reads as sunken
  drawHole(ctx, kind, o = {}) {
    const V = MA.VEG[kind];
    ctx.save();
    MA.vegPath(ctx, kind);
    ctx.fillStyle = U.mix(V.color, '#4a3418', o.glow ? 0.35 : 0.58); ctx.fill();
    ctx.strokeStyle = 'rgba(40,25,10,0.55)'; ctx.lineWidth = 3.5; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.clip();
    // inner shadow along the top edge
    ctx.translate(0, 6); MA.vegPath(ctx, kind); ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 10; ctx.stroke();
    if (o.glow) { ctx.translate(0, -6); MA.vegPath(ctx, kind); ctx.strokeStyle = `rgba(255,240,150,${0.6 * o.glow})`; ctx.lineWidth = 8; ctx.stroke(); }
    ctx.restore();
  },

  /* ================= foods ================= */
  FOOD: {
    hay:     { name: 'hay',     say: 'some hay' },
    grass:   { name: 'grass',   say: 'some grass' },
    apple:   { name: 'apple',   say: 'an apple' },
    carrot:  { name: 'carrot',  say: 'a carrot' },
    corn:    { name: 'corn',    say: 'some corn' },
    bone:    { name: 'bone',    say: 'a bone' },
    fish:    { name: 'fish',    say: 'a fish' },
    milk:    { name: 'milk',    say: 'some milk' },
    seeds:   { name: 'seeds',   say: 'some seeds' },
    bread:   { name: 'bread',   say: 'some bread' },
    cabbage: { name: 'cabbage', say: 'a cabbage' },
  },
  drawFood(ctx, kind) {
    const OLc = D.OUTLINE;
    ctx.save();
    switch (kind) {
      case 'hay':
        D.shadow(ctx, 0, 30, 34, 8, 0.15);
        D.fillEll(ctx, 0, 0, 40, 26, '#e9c46a', OLc);
        for (let i = -3; i <= 3; i++) D.line(ctx, -30 + i * 4, -10 + i * 5, 30 + i * 3, -14 + i * 5, '#c9a227', 2);
        D.fillRR(ctx, -6, -28, 12, 56, 4, '#8b5a2b', OLc, 2); break;
      case 'grass':
        D.shadow(ctx, 0, 30, 28, 7, 0.14);
        for (let i = -4; i <= 4; i++) { D.line(ctx, i * 7, 26, i * 9 + (i % 2 ? 4 : -4), -24 - Math.abs(i) * 2, OLc, 7); }
        for (let i = -4; i <= 4; i++) { D.line(ctx, i * 7, 26, i * 9 + (i % 2 ? 4 : -4), -24 - Math.abs(i) * 2, i % 2 ? '#5dbb63' : '#7ccc5a', 4); }
        D.fillRR(ctx, -22, 20, 44, 10, 4, '#c9a227', OLc, 2); break;
      case 'apple':
        D.shadow(ctx, 0, 34, 28, 7, 0.15);
        D.fillEll(ctx, -12, 4, 22, 26, '#e74c3c', OLc); D.fillEll(ctx, 12, 4, 22, 26, '#e74c3c', OLc);
        D.fillEll(ctx, 0, 6, 26, 26, '#e74c3c');
        D.fillEll(ctx, -10, -6, 7, 5, 'rgba(255,255,255,0.35)', null, 0, -0.5);
        D.fillRR(ctx, -2, -32, 5, 16, 2, '#6b4a24', OLc, 2); D.fillEll(ctx, 10, -24, 11, 5, '#3fa34d', OLc, 2, -0.5); break;
      case 'carrot': ctx.scale(0.68, 0.68); ctx.rotate(0.5); MA.drawVeg(ctx, 'carrot'); break;
      case 'corn': ctx.scale(0.62, 0.62); ctx.rotate(0.6); MA.drawVeg(ctx, 'corn'); break;
      case 'cabbage': ctx.scale(0.72, 0.72); MA.drawVeg(ctx, 'cabbage'); break;
      case 'bone':
        D.shadow(ctx, 0, 24, 36, 7, 0.14);
        ctx.rotate(-0.3);
        D.fillRR(ctx, -30, -8, 60, 16, 8, '#fdf6e3', OLc);
        [[-32, -10], [-32, 10], [32, -10], [32, 10]].forEach(([x, y]) => D.circle(ctx, x, y, 11, '#fdf6e3', OLc));
        D.fillRR(ctx, -26, -5, 52, 10, 5, '#fdf6e3'); break;
      case 'fish':
        D.shadow(ctx, 0, 24, 34, 7, 0.14);
        D.poly(ctx, [[22, 0], [44, -18], [44, 18]], '#54a0ff', OLc, 2.5);
        D.fillEll(ctx, -4, 0, 32, 18, '#74b9ff', OLc);
        D.fillEll(ctx, -2, -4, 14, 5, 'rgba(255,255,255,0.3)');
        D.circle(ctx, -18, -4, 4, '#fff', OLc, 1.5); D.circle(ctx, -17, -4, 2, '#222');
        [[-8, 8], [4, 10]].forEach(([x, y]) => D.fillEll(ctx, x, y, 7, 3, '#54a0ff', OLc, 1.5, 0.3)); break;
      case 'milk':
        D.shadow(ctx, 0, 36, 22, 6, 0.14);
        D.fillRR(ctx, -16, -16, 32, 50, 6, '#fff', OLc);
        D.fillRR(ctx, -9, -34, 18, 20, 4, '#fff', OLc);
        D.fillRR(ctx, -11, -40, 22, 8, 3, '#54a0ff', OLc, 2);
        D.fillRR(ctx, -12, 0, 24, 22, 4, '#54a0ff', null);
        D.text(ctx, 'MILK', 0, 11, 11, '#fff'); break;
      case 'seeds':
        D.shadow(ctx, 0, 24, 32, 7, 0.14);
        D.fillEll(ctx, 0, 12, 34, 12, '#8b5a2b', OLc);
        D.fillRR(ctx, -34, -6, 68, 20, 6, '#c9895a', OLc);
        D.fillEll(ctx, 0, -6, 30, 9, '#e9c46a', OLc, 2);
        for (let i = 0; i < 14; i++) { const a = i * 2.4, r = 4 + (i * 7) % 20; D.fillEll(ctx, Math.cos(a) * r, -7 + Math.sin(a) * r * 0.3, 3.2, 2, i % 3 ? '#8b5a2b' : '#ffd23f', null, 0, a); } break;
      case 'bread':
        D.shadow(ctx, 0, 24, 34, 7, 0.14);
        D.fillRR(ctx, -34, -14, 68, 36, 12, '#e9a86b', OLc);
        D.fillRR(ctx, -34, -22, 68, 20, 10, '#f5c48b', OLc);
        [-20, -6, 8, 22].forEach(x => D.line(ctx, x - 4, -18, x + 4, -10, 'rgba(120,60,10,0.3)', 2.5)); break;
    }
    ctx.restore();
  },

  /* ================= props ================= */
  // wooden tray/crate, top-left at (x,y)
  crate(ctx, x, y, w, h) {
    D.fillRR(ctx, x, y, w, h, 8, '#a5693b', D.OUTLINE);
    D.fillRR(ctx, x + 6, y + 6, w - 12, h - 12, 5, '#c9895a', null);
    ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 2;
    for (let sx = x + 24; sx < x + w - 12; sx += 28) { ctx.beginPath(); ctx.moveTo(sx, y + 8); ctx.lineTo(sx, y + h - 8); ctx.stroke(); }
    [[x + 8, y + 8], [x + w - 8, y + 8], [x + 8, y + h - 8], [x + w - 8, y + h - 8]].forEach(([nx, ny]) => D.circle(ctx, nx, ny, 2.5, '#4a2f1a'));
  },
  // wooden sign with text; (x,y) is the bottom of the post
  sign(ctx, x, y, text, w = 140, big = false) {
    ctx.save(); ctx.translate(x, y);
    D.fillRR(ctx, -5, -46, 10, 46, 3, '#a5693b', D.OUTLINE, 2.5);
    const h = big ? 54 : 40;
    D.fillRR(ctx, -w / 2, -46 - h, w, h, 8, '#f5e6c8', D.OUTLINE);
    D.text(ctx, text, 0, -46 - h / 2 + 1, big ? 30 : 22, '#7a3e12');
    ctx.restore();
  },
  // bath tub centred on its base line
  tub(ctx, t = 0) {
    const OLc = D.OUTLINE;
    ctx.save();
    D.shadow(ctx, 0, 4, 180, 22, 0.18);
    // feet
    [-120, 120].forEach(x => D.fillRR(ctx, x - 14, -14, 28, 18, 6, '#c9a227', OLc, 2.5));
    // body
    D.fillRR(ctx, -170, -120, 340, 116, 40, '#eef2f7', OLc);
    D.fillRR(ctx, -170, -120, 340, 26, 13, '#fff', OLc, 2.5);
    // water
    ctx.save(); D.rr(ctx, -156, -102, 312, 60, 24); ctx.clip();
    ctx.fillStyle = '#74c9ff'; ctx.fillRect(-160, -104, 320, 70);
    for (let i = 0; i < 6; i++) { const x = -150 + i * 56 + Math.sin(t * 1.6 + i) * 8; D.line(ctx, x - 14, -92 + (i % 2) * 6, x + 14, -92 + (i % 2) * 6, 'rgba(255,255,255,0.6)', 3); }
    ctx.restore();
    // tap
    D.fillRR(ctx, 118, -176, 14, 64, 6, '#b8c4d0', OLc, 2.5);
    D.fillRR(ctx, 96, -176, 44, 14, 6, '#b8c4d0', OLc, 2.5);
    D.fillRR(ctx, 90, -170, 16, 30, 6, '#b8c4d0', OLc, 2.5);
    D.circle(ctx, 125, -186, 9, '#e74c3c', OLc, 2.5);
    ctx.restore();
  },
  sponge(ctx) {
    const OLc = D.OUTLINE;
    D.shadow(ctx, 0, 22, 34, 8, 0.16);
    D.fillRR(ctx, -36, -22, 72, 44, 12, '#ffd23f', OLc);
    D.fillRR(ctx, -36, 4, 72, 18, 10, '#48c774', OLc, 2.5);
    [[-20, -10, 4], [0, -8, 5], [18, -12, 3.5], [-8, 2, 3], [24, 0, 3]].forEach(([x, y, r]) => D.circle(ctx, x, y, r, '#e8a317'));
  },
  bubble(ctx, x, y, r, a = 1) {
    ctx.save(); ctx.globalAlpha = a;
    D.circle(ctx, x, y, r, 'rgba(200,235,255,0.35)', 'rgba(255,255,255,0.85)', 2);
    D.fillEll(ctx, x - r * 0.35, y - r * 0.35, r * 0.28, r * 0.18, 'rgba(255,255,255,0.9)', null, 0, -0.6);
    ctx.restore();
  },
  rubberDuck(ctx) {
    const OLc = D.OUTLINE;
    D.fillEll(ctx, 0, 0, 24, 15, '#ffd23f', OLc);
    D.circle(ctx, 14, -14, 12, '#ffd23f', OLc);
    D.poly(ctx, [[24, -14], [36, -10], [24, -6]], '#ff9f43', OLc, 2);
    D.circle(ctx, 17, -17, 2.4, '#222');
    D.fillEll(ctx, -16, -4, 8, 4, '#ffe066', OLc, 1.8, -0.5);
  },
  // round stepping-stone drum for the band
  drum(ctx, color, press = 0) {
    const OLc = D.OUTLINE;
    ctx.save(); ctx.translate(0, press * 4);
    D.fillEll(ctx, 0, 14, 62, 22, U.shade(color, -0.35), OLc);
    D.fillRR(ctx, -62, -8, 124, 24, 8, U.shade(color, -0.2), OLc, 2.5);
    D.fillEll(ctx, 0, -8, 62, 22, color, OLc);
    D.fillEll(ctx, 0, -8, 46, 14, U.shade(color, 0.25), null);
    ctx.restore();
  },
  note(ctx, color = '#fff') {
    const OLc = D.OUTLINE;
    D.fillEll(ctx, 0, 10, 10, 7, color, OLc, 2.5, -0.4);
    D.line(ctx, 8, 8, 8, -22, OLc, 5); D.line(ctx, 8, 8, 8, -22, color, 2.5);
    D.poly(ctx, [[8, -22], [22, -14], [8, -8]], color, OLc, 2.5);
  },
  bread(ctx, s = 1) { ctx.save(); ctx.scale(s, s); MA.drawFood(ctx, 'bread'); ctx.restore(); },
  crumb(ctx, r = 4) { D.circle(ctx, 0, 0, r, '#f5c48b', D.OUTLINE, 1.5); },
  basket(ctx) {
    const OLc = D.OUTLINE;
    D.shadow(ctx, 0, 22, 48, 10, 0.16);
    ctx.beginPath(); ctx.ellipse(0, -36, 34, 30, 0, Math.PI, 0); ctx.strokeStyle = OLc; ctx.lineWidth = 8; ctx.stroke(); ctx.strokeStyle = '#c9895a'; ctx.lineWidth = 4; ctx.stroke();
    D.fillRR(ctx, -50, -14, 100, 36, 12, '#c9895a', OLc);
    D.fillEll(ctx, 0, -14, 50, 10, '#a5693b', OLc, 2.5);
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 2;
    for (let i = -36; i <= 36; i += 12) { ctx.beginPath(); ctx.moveTo(i, -10); ctx.lineTo(i + 4, 18); ctx.stroke(); }
  },
  // count badge, as the barn uses
  badge(ctx, x, y, n, r = 19) {
    D.circle(ctx, x, y, r, '#ffd23f', D.OUTLINE, 3);
    D.text(ctx, String(n), x, y + 1, r * 1.25, '#7a3e12');
  },
  // gentle pulsing ring under something you're meant to look at
  ring(ctx, x, y, rx, ry, t, color = '255,240,120') {
    const k = 0.5 + 0.5 * Math.sin(t * 4);
    D.fillEll(ctx, x, y, rx * (1 + k * 0.08), ry * (1 + k * 0.08), `rgba(${color},${0.22 + k * 0.2})`);
    D.fillEll(ctx, x, y, rx * 0.8, ry * 0.8, null, `rgba(${color},${0.55 + k * 0.3})`, 4);
  }
};

/* ---------- shared backdrop: a patch of the farm ----------
   Games that happen outdoors draw this pre-rendered field so they look like the
   farm, not like a blank canvas. */
const MiniBG = {
  field(w = 1280, h = 800, o = {}) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    S.grass(ctx, w, h, o.seed || 7);
    if (o.fence !== false) {
      const line = (x1, y1, x2, y2, step) => { const n = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1) / step)); for (let i = 0; i < n; i++) S.fenceSeg(ctx, U.lerp(x1, x2, i / n), U.lerp(y1, y2, i / n), U.lerp(x1, x2, (i + 1) / n), U.lerp(y1, y2, (i + 1) / n), { end: i === n - 1 }); };
      line(-10, 28, 1290, 28, 64);
    }
    (o.flowers || [[90, 740], [1190, 720], [120, 120], [1160, 130]]).forEach(([x, y]) => S.flowerPatch(ctx, x, y, 7));
    if (o.vignette !== false) ctx.drawImage(S.makeVignette(w, h), 0, 0);
    return c;
  }
};
