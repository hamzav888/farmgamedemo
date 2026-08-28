/* ---------- Scenery drawing: barn, trees, fences, pond, buildings, sky things ---------- */
const S = {
  /* ----- ground / grass texture (pre-rendered) ----- */
  grass(ctx, w, h, seed = 1) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#7ccc5a'); g.addColorStop(1, '#5fb548');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    let r = seed;
    const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
    // soft patches
    for (let i = 0; i < 70; i++) {
      D.fillEll(ctx, rnd() * w, rnd() * h, 40 + rnd() * 90, 20 + rnd() * 40, rnd() < 0.5 ? 'rgba(255,255,200,0.07)' : 'rgba(30,110,40,0.08)');
    }
    // grass tufts
    ctx.lineCap = 'round';
    for (let i = 0; i < 900; i++) {
      const x = rnd() * w, y = rnd() * h, s = 3 + rnd() * 5;
      ctx.strokeStyle = rnd() < 0.5 ? 'rgba(40,120,40,0.45)' : 'rgba(180,240,140,0.5)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - s * 0.5, y - s); ctx.moveTo(x, y); ctx.lineTo(x + s * 0.6, y - s * 1.1); ctx.moveTo(x, y); ctx.lineTo(x, y - s * 1.3); ctx.stroke();
    }
  },
  path(ctx, pts, width) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
    ctx.strokeStyle = '#b98b52'; ctx.lineWidth = width + 8; ctx.stroke();
    ctx.strokeStyle = '#d9b06a'; ctx.lineWidth = width; ctx.stroke();
    // pebbles
    let r = 7; const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
    for (let i = 0; i < pts.length - 1; i++) {
      for (let k = 0; k < 14; k++) {
        const t = rnd(), x = U.lerp(pts[i][0], pts[i + 1][0], t) + (rnd() - 0.5) * width * 0.8, y = U.lerp(pts[i][1], pts[i + 1][1], t) + (rnd() - 0.5) * width * 0.8;
        D.fillEll(ctx, x, y, 2 + rnd() * 3, 1.5 + rnd() * 2, 'rgba(120,80,40,0.35)');
      }
    }
    ctx.restore();
  },
  flower(ctx, x, y, color, r = 4) {
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; D.circle(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.75, color); }
    D.circle(ctx, x, y, r * 0.6, '#ffe066');
  },
  flowerPatch(ctx, x, y, n = 6, colors = ['#ff6b81', '#ffd23f', '#a29bfe', '#fff', '#ff9f43']) {
    let r = x * 3 + y; const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
    for (let i = 0; i < n; i++) {
      const fx = x + (rnd() - 0.5) * 60, fy = y + (rnd() - 0.5) * 30;
      D.line(ctx, fx, fy + 6, fx, fy, '#2e8b57', 2);
      S.flower(ctx, fx, fy, colors[Math.floor(rnd() * colors.length)], 3 + rnd() * 2);
    }
  },
  bush(ctx, x, y, s = 1, berries = false) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    D.shadow(ctx, 0, 2, 30, 8, 0.15);
    [[-16, -12, 15], [14, -12, 15], [0, -20, 17], [-4, -8, 14], [8, -6, 13]].forEach(([bx, by, r]) => D.circle(ctx, bx, by, r, '#3fa34d', OL(), 2.5));
    [[-14, -16, 6], [4, -24, 6], [12, -14, 5]].forEach(([bx, by, r]) => D.circle(ctx, bx, by, r, 'rgba(180,240,140,0.5)'));
    if (berries) [[-8, -6], [6, -16], [14, -8], [-16, -18]].forEach(([bx, by]) => D.circle(ctx, bx, by, 3, '#e74c3c', OL(), 1.5));
    ctx.restore();
  },
  tree(ctx, x, y, t, o = {}) {
    const s = o.s || 1, sway = Math.sin(t * 0.8 + x * 0.01) * 0.02;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    D.shadow(ctx, 6, 2, 40, 12, 0.18);
    // trunk
    D.fillRR(ctx, -11, -52, 22, 56, 8, '#8b5a2b', OL());
    D.fillRR(ctx, -4, -48, 6, 44, 3, 'rgba(255,255,255,0.15)');
    if (o.branch) { // owl branch to the right
      D.fillRR(ctx, 4, -70, 46, 10, 5, '#8b5a2b', OL()); D.fillRR(ctx, 20, -78, 6, 12, 3, '#8b5a2b', OL(), 2);
    }
    ctx.translate(0, -60); ctx.rotate(sway);
    const g1 = o.color || '#3fa34d', g2 = U.shade(g1, 0.25);
    const blobs = [[-30, 5, 30], [30, 5, 30], [-18, -28, 28], [18, -28, 28], [0, -44, 26], [0, -8, 32]];
    blobs.forEach(([bx, by, r]) => D.circle(ctx, bx, by, r, g1, OL(), 3));
    D.circle(ctx, 0, -10, 30, g1); D.circle(ctx, -18, -26, 26, g1); D.circle(ctx, 18, -26, 26, g1);
    [[-24, -34, 9], [10, -50, 8], [-8, -12, 6], [26, -10, 7]].forEach(([bx, by, r]) => D.circle(ctx, bx, by, r, g2));
    if (o.apples) [[-28, 6], [22, -18], [-6, -40], [30, 8], [8, -2]].forEach(([ax, ay]) => { D.circle(ctx, ax, ay, 5.5, '#e74c3c', OL(), 2); D.circle(ctx, ax - 1.5, ay - 1.5, 1.5, 'rgba(255,255,255,0.7)'); });
    ctx.restore();
  },
  pine(ctx, x, y, s = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    D.shadow(ctx, 4, 2, 30, 9, 0.18);
    D.fillRR(ctx, -8, -30, 16, 32, 5, '#8b5a2b', OL());
    [[0, -20, 44], [0, -50, 38], [0, -76, 30]].forEach(([cx, cy, w], i) => {
      D.poly(ctx, [[cx - w, cy], [cx, cy - 46], [cx + w, cy]], i % 2 ? '#2e8b57' : '#27ae60', OL(), 3);
    });
    D.poly(ctx, [[-14, -60], [0, -100], [6, -80]], 'rgba(180,240,140,0.35)');
    ctx.restore();
  },
  fenceSeg(ctx, x1, y1, x2, y2, o = {}) {
    const post = o.post || '#a5693b', rail = o.rail || '#c9895a', h = o.h || 34, w = o.w || 10;
    // rails
    [0.28, 0.6].forEach(f => {
      const ry1 = y1 - h + h * f, ry2 = y2 - h + h * f;
      D.line(ctx, x1, ry1, x2, ry2, OL(), 9, 'round'); D.line(ctx, x1, ry1, x2, ry2, rail, 5, 'round');
    });
    if (o.wire) { ctx.save(); ctx.strokeStyle = 'rgba(80,80,80,0.5)'; ctx.lineWidth = 1; for (let i = 0; i < 4; i++) { const f = 0.15 + i * 0.22; ctx.beginPath(); ctx.moveTo(x1, y1 - h + h * f); ctx.lineTo(x2, y2 - h + h * f); ctx.stroke(); } ctx.restore(); }
    // post at start
    D.fillRR(ctx, x1 - w / 2, y1 - h - 4, w, h + 4, 3, post, OL(), 2.5);
    D.fillRR(ctx, x1 - w / 2 - 2, y1 - h - 6, w + 4, 6, 2, U.shade(post, 0.2), OL(), 2);
    if (o.end) { D.fillRR(ctx, x2 - w / 2, y2 - h - 4, w, h + 4, 3, post, OL(), 2.5); D.fillRR(ctx, x2 - w / 2 - 2, y2 - h - 6, w + 4, 6, 2, U.shade(post, 0.2), OL(), 2); }
  },
  hayBale(ctx, x, y, s = 1, round = false) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    D.shadow(ctx, 0, 1, 30, 8, 0.15);
    if (round) { D.circle(ctx, 0, -22, 22, '#e9c46a', OL()); D.circle(ctx, 0, -22, 14, null, '#c9a227', 3); D.circle(ctx, 0, -22, 6, null, '#c9a227', 3); }
    else {
      D.fillRR(ctx, -26, -34, 52, 34, 6, '#e9c46a', OL());
      ctx.strokeStyle = '#c9a227'; ctx.lineWidth = 2; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-22, -30 + i * 5); ctx.lineTo(22, -30 + i * 5); ctx.stroke(); }
      D.line(ctx, -14, -34, -14, 0, '#8b5a2b', 3); D.line(ctx, 14, -34, 14, 0, '#8b5a2b', 3);
    }
    ctx.restore();
  },
  hayPile(ctx, x, y, s = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    D.fillEll(ctx, 0, -10, 40, 16, '#e9c46a', OL()); D.fillEll(ctx, -8, -20, 24, 12, '#f2d27a', OL(), 2.5); D.fillEll(ctx, 8, -26, 16, 9, '#f6dc8c', OL(), 2);
    ctx.strokeStyle = '#c9a227'; ctx.lineWidth = 2; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 14, -14 + Math.sin(a) * 6); ctx.lineTo(Math.cos(a) * 30, -12 + Math.sin(a) * 12); ctx.stroke(); }
    ctx.restore();
  },
  trough(ctx, x, y, water = true) {
    ctx.save(); ctx.translate(x, y);
    D.fillRR(ctx, -30, -20, 60, 22, 4, '#8b5a2b', OL());
    D.fillRR(ctx, -26, -18, 52, 8, 3, water ? '#74b9ff' : '#e9c46a', OL(), 2);
    if (water) D.fillEll(ctx, -8, -14, 8, 2, 'rgba(255,255,255,0.6)');
    ctx.restore();
  },
  rock(ctx, x, y, s = 1) { D.fillEll(ctx, x, y, 12 * s, 8 * s, '#95a5a6', OL(), 2.5); D.fillEll(ctx, x - 3 * s, y - 3 * s, 5 * s, 3 * s, 'rgba(255,255,255,0.35)'); },
  cattail(ctx, x, y, t) {
    const sw = Math.sin(t * 1.5 + x) * 3;
    ctx.save(); ctx.translate(x, y);
    D.line(ctx, 0, 0, sw, -40, '#2e8b57', 3.5); D.line(ctx, -6, 0, -12 + sw, -30, '#3fa34d', 3); D.line(ctx, 6, 0, 14 + sw, -34, '#3fa34d', 3);
    D.fillRR(ctx, sw - 4, -52, 8, 18, 4, '#8b5a2b', OL(), 2);
    ctx.restore();
  },
  lilyPad(ctx, x, y, r, flower) {
    ctx.save(); ctx.translate(x, y);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, 0.3, Math.PI * 2 - 0.3); ctx.closePath();
    ctx.fillStyle = '#4caf50'; ctx.fill(); ctx.strokeStyle = OL(); ctx.lineWidth = 2.5; ctx.stroke();
    D.fillEll(ctx, -3, -3, r * 0.4, r * 0.25, 'rgba(255,255,255,0.25)');
    if (flower) { for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; D.fillEll(ctx, Math.cos(a) * 5, -4 + Math.sin(a) * 3, 5, 3, '#ff8fab', OL(), 1.5, a); } D.circle(ctx, 0, -4, 3, '#ffd23f'); }
    ctx.restore();
  },
  pondShape(ctx, cx, cy, rx, ry, extra = 0) {
    ctx.beginPath();
    for (let i = 0; i <= 64; i++) {
      const a = i / 64 * Math.PI * 2, wob = 1 + 0.06 * Math.sin(a * 3 + 0.5) + 0.04 * Math.sin(a * 5 + 1.7);
      const x = cx + Math.cos(a) * (rx + extra) * wob, y = cy + Math.sin(a) * (ry + extra) * wob;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
  },
  pond(ctx, cx, cy, rx, ry) {
    S.pondShape(ctx, cx, cy, rx, ry, 14); ctx.fillStyle = '#d9c08a'; ctx.fill(); ctx.strokeStyle = 'rgba(90,60,30,0.35)'; ctx.lineWidth = 3; ctx.stroke();
    const g = ctx.createRadialGradient(cx - rx * 0.2, cy - ry * 0.2, 10, cx, cy, rx);
    g.addColorStop(0, '#8fdcf9'); g.addColorStop(0.7, '#4fb3e8'); g.addColorStop(1, '#3a9bd8');
    S.pondShape(ctx, cx, cy, rx, ry, 0); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = OL(); ctx.lineWidth = 3; ctx.stroke();
  },

  /* ----- buildings ----- */
  barn(ctx, cx, baseY, o = {}) {
    // cx: centre x, baseY: ground line at bottom of front wall
    const W = 380, wallH = 145, wallTop = baseY - wallH, night = o.night || 0, doorOpen = o.doorOpen == null ? 1 : o.doorOpen;
    const red = '#e0413a', redD = '#b8302a', trim = '#fff8f0';
    ctx.save();
    // ground shadow
    D.fillEll(ctx, cx, baseY + 4, W * 0.56, 16, 'rgba(0,0,0,0.2)');
    // ---- roof (gambrel, seen from front/above) ----
    const roofPts = [[cx - 205, wallTop + 6], [cx - 150, wallTop - 90], [cx - 60, wallTop - 145], [cx, wallTop - 152], [cx + 60, wallTop - 145], [cx + 150, wallTop - 90], [cx + 205, wallTop + 6]];
    const rg = ctx.createLinearGradient(0, wallTop - 152, 0, wallTop);
    rg.addColorStop(0, '#6d7a8a'); rg.addColorStop(1, '#4b5766');
    ctx.beginPath(); roofPts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
    ctx.fillStyle = rg; ctx.fill(); ctx.strokeStyle = OL(); ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.stroke();
    // shingle rows
    ctx.save(); ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 2;
    for (let y = wallTop - 140; y < wallTop; y += 14) { ctx.beginPath(); ctx.moveTo(cx - 210, y); ctx.lineTo(cx + 210, y); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    for (let x = cx - 200; x < cx + 200; x += 24) { ctx.beginPath(); ctx.moveTo(x, wallTop - 150); ctx.lineTo(x, wallTop); ctx.stroke(); }
    ctx.restore();
    // ridge trim
    D.line(ctx, cx - 62, wallTop - 146, cx + 62, wallTop - 146, trim, 6);
    // hayloft dormer
    D.poly(ctx, [[cx - 40, wallTop - 40], [cx, wallTop - 90], [cx + 40, wallTop - 40]], red, OL(), 3.5);
    D.fillRR(ctx, cx - 30, wallTop - 42, 60, 44, 4, red, OL(), 3.5);
    D.fillRR(ctx, cx - 20, wallTop - 34, 40, 34, 3, night > 0.5 ? U.mix('#5a3b1a', '#ffd23f', night) : '#5a3b1a', trim, 4);
    // hay poking out
    D.fillEll(ctx, cx, wallTop - 6, 22, 9, '#e9c46a', OL(), 2.5);
    ctx.strokeStyle = '#c9a227'; ctx.lineWidth = 2; for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(cx + i * 5, wallTop - 4); ctx.lineTo(cx + i * 7, wallTop - 14); ctx.stroke(); }
    // weathervane
    D.line(ctx, cx, wallTop - 150, cx, wallTop - 186, '#333', 3);
    D.line(ctx, cx - 16, wallTop - 176, cx + 16, wallTop - 176, '#333', 3); D.poly(ctx, [[cx + 16, wallTop - 180], [cx + 24, wallTop - 176], [cx + 16, wallTop - 172]], '#333');
    // rooster silhouette
    ctx.save(); ctx.translate(cx, wallTop - 186); ctx.fillStyle = '#333';
    D.fillEll(ctx, 0, -6, 8, 5, '#333'); D.circle(ctx, 7, -12, 4, '#333'); D.poly(ctx, [[-8, -8], [-16, -18], [-6, -12]], '#333'); D.poly(ctx, [[10, -12], [15, -11], [10, -10]], '#333');
    ctx.restore();

    // ---- front wall ----
    const wg = ctx.createLinearGradient(0, wallTop, 0, baseY);
    wg.addColorStop(0, red); wg.addColorStop(1, redD);
    D.fillRR(ctx, cx - W / 2, wallTop, W, wallH, 4, wg, OL(), 4);
    // plank lines
    ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 2;
    for (let x = cx - W / 2 + 22; x < cx + W / 2; x += 22) { ctx.beginPath(); ctx.moveTo(x, wallTop + 4); ctx.lineTo(x, baseY - 2); ctx.stroke(); }
    // white trim
    D.line(ctx, cx - W / 2, wallTop + 4, cx + W / 2, wallTop + 4, trim, 8);
    D.line(ctx, cx - W / 2 + 4, wallTop, cx - W / 2 + 4, baseY, trim, 8); D.line(ctx, cx + W / 2 - 4, wallTop, cx + W / 2 - 4, baseY, trim, 8);
    D.line(ctx, cx - W / 2, baseY - 3, cx + W / 2, baseY - 3, trim, 6);
    // windows
    [cx - 130, cx + 130].forEach(wx => {
      const wy = wallTop + 34, ws = 50;
      const glass = night > 0.05 ? U.mix('#9ad9ff', '#ffd76a', night) : '#9ad9ff';
      D.fillRR(ctx, wx - ws / 2, wy, ws, ws, 4, glass, trim, 6);
      D.fillRR(ctx, wx - ws / 2, wy, ws, ws, 4, null, OL(), 2);
      D.line(ctx, wx, wy, wx, wy + ws, trim, 5); D.line(ctx, wx - ws / 2, wy + ws / 2, wx + ws / 2, wy + ws / 2, trim, 5);
      D.fillRR(ctx, wx - ws / 2 - 6, wy + ws - 2, ws + 12, 8, 3, trim, OL(), 2);
      // flower box
      D.fillRR(ctx, wx - ws / 2 - 4, wy + ws + 4, ws + 8, 12, 3, '#8b5a2b', OL(), 2);
      [-16, -6, 4, 14].forEach((fx, i) => S.flower(ctx, wx + fx, wy + ws + 2, ['#ff6b81', '#ffd23f', '#a29bfe', '#ff9f43'][i], 3.5));
    });
    // big doors
    const dw = 130, dh = 118, dx = cx - dw / 2, dy = baseY - dh;
    // interior (dark) with hay glimpse
    D.fillRR(ctx, dx, dy, dw, dh, 3, '#3b2313', OL(), 3);
    if (doorOpen > 0.02) {
      D.fillEll(ctx, cx + 20, baseY - 12, 30, 12, '#c9a227'); D.fillEll(ctx, cx - 30, baseY - 8, 26, 10, '#e9c46a');
      D.fillRR(ctx, dx + 10, dy + 6, dw - 20, 20, 3, 'rgba(255,255,255,0.05)');
    }
    // door leaves
    const openW = dw / 2 * (1 - doorOpen * 0.7);
    [[dx, 1], [dx + dw, -1]].forEach(([ex, sgn]) => {
      const x0 = sgn > 0 ? ex : ex - openW;
      D.fillRR(ctx, x0, dy, openW, dh, 3, '#8b5a2b', OL(), 3);
      ctx.save(); D.rr(ctx, x0, dy, openW, dh, 3); ctx.clip();
      ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 2; for (let x = x0 + 12; x < x0 + openW; x += 12) { ctx.beginPath(); ctx.moveTo(x, dy); ctx.lineTo(x, dy + dh); ctx.stroke(); }
      // X brace
      ctx.strokeStyle = trim; ctx.lineWidth = 7; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x0 + 6, dy + 8); ctx.lineTo(x0 + openW - 6, dy + dh - 8); ctx.moveTo(x0 + openW - 6, dy + 8); ctx.lineTo(x0 + 6, dy + dh - 8); ctx.stroke();
      ctx.strokeStyle = trim; ctx.lineWidth = 6; ctx.strokeRect(x0 + 5, dy + 5, openW - 10, dh - 10);
      ctx.restore();
    });
    // light spill under closed doors at night
    if (night > 0.3 && doorOpen < 0.5) { ctx.save(); ctx.globalAlpha = night * 0.8; D.fillRR(ctx, cx - 4, dy + 4, 8, dh - 8, 3, '#ffd76a'); ctx.restore(); }
    // door frame trim + lamp
    D.line(ctx, dx - 4, dy - 4, dx + dw + 4, dy - 4, trim, 8); D.line(ctx, dx - 4, dy - 4, dx - 4, baseY, trim, 8); D.line(ctx, dx + dw + 4, dy - 4, dx + dw + 4, baseY, trim, 8);
    // horseshoe above door
    ctx.beginPath(); ctx.arc(cx, dy - 22, 10, Math.PI * 0.85, Math.PI * 2.15); ctx.strokeStyle = '#95a5a6'; ctx.lineWidth = 5; ctx.stroke();
    // lamp
    D.line(ctx, cx + 100, wallTop + 22, cx + 118, wallTop + 22, '#333', 3); D.circle(ctx, cx + 118, wallTop + 30, 8, night > 0.3 ? '#ffe066' : '#f5f5f5', OL(), 2);
    ctx.restore();
  },
  barnGlow(ctx, cx, baseY, night) {
    // additive glows drawn after the night overlay
    if (night < 0.05) return;
    const wallTop = baseY - 145;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = night;
    const glow = (x, y, r, a) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(255,200,90,${a})`); g.addColorStop(1, 'rgba(255,200,90,0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); };
    glow(cx - 130, wallTop + 60, 70, 0.55); glow(cx + 130, wallTop + 60, 70, 0.55); glow(cx, wallTop - 24, 50, 0.4); glow(cx + 118, wallTop + 30, 40, 0.5); glow(cx, baseY - 30, 60, 0.35);
    ctx.restore();
  },
  coop(ctx, x, y) {
    ctx.save(); ctx.translate(x, y);
    D.fillEll(ctx, 0, 2, 76, 12, 'rgba(0,0,0,0.18)');
    // stilts
    D.fillRR(ctx, -50, -22, 8, 22, 2, '#8b5a2b', OL(), 2); D.fillRR(ctx, 42, -22, 8, 22, 2, '#8b5a2b', OL(), 2);
    // body
    D.fillRR(ctx, -60, -90, 120, 70, 4, '#f0c987', OL());
    ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 2; for (let px = -48; px < 60; px += 14) { ctx.beginPath(); ctx.moveTo(px, -88); ctx.lineTo(px, -22); ctx.stroke(); }
    // roof
    D.poly(ctx, [[-70, -88], [0, -128], [70, -88]], '#e0413a', OL());
    D.line(ctx, -66, -90, 0, -126, 'rgba(255,255,255,0.3)', 3);
    // door + ramp
    D.fillRR(ctx, 20, -70, 30, 48, 12, '#3b2313', OL(), 3);
    D.poly(ctx, [[22, -24], [50, -24], [82, 4], [54, 4]], '#c9895a', OL(), 3);
    for (let i = 1; i < 5; i++) { const t = i / 5; D.line(ctx, U.lerp(22, 54, t), U.lerp(-24, 4, t), U.lerp(50, 82, t), U.lerp(-24, 4, t), OL(), 2); }
    // round window
    D.circle(ctx, -25, -58, 13, '#9ad9ff', '#fff8f0', 5); D.circle(ctx, -25, -58, 13, null, OL(), 2); D.line(ctx, -25, -71, -25, -45, '#fff8f0', 3); D.line(ctx, -38, -58, -12, -58, '#fff8f0', 3);
    // nest box
    D.fillRR(ctx, -70, -60, 14, 26, 3, '#c9895a', OL(), 2.5);
    // sign
    D.fillRR(ctx, -22, -112, 44, 18, 4, '#fff8f0', OL(), 2.5);
    D.text(ctx, 'COOP', 0, -103, 12, '#c0392b');
    ctx.restore();
  },
  dogHouse(ctx, x, y) {
    ctx.save(); ctx.translate(x, y);
    D.fillEll(ctx, 0, 2, 44, 9, 'rgba(0,0,0,0.18)');
    D.fillRR(ctx, -36, -46, 72, 46, 4, '#e9c46a', OL());
    D.poly(ctx, [[-44, -44], [0, -78], [44, -44]], '#e0413a', OL());
    ctx.beginPath(); ctx.arc(0, -18, 14, Math.PI, 0); ctx.lineTo(14, 0); ctx.lineTo(-14, 0); ctx.closePath(); ctx.fillStyle = '#3b2313'; ctx.fill(); ctx.strokeStyle = OL(); ctx.lineWidth = 3; ctx.stroke();
    // bone
    ctx.save(); ctx.translate(-30, 6); ctx.rotate(-0.3); D.fillRR(ctx, -8, -2, 16, 4, 2, '#fff', OL(), 1.5); [-8, 8].forEach(bx => { D.circle(ctx, bx, -2, 3, '#fff', OL(), 1.5); D.circle(ctx, bx, 2, 3, '#fff', OL(), 1.5); }); ctx.restore();
    // bowl
    D.fillEll(ctx, 34, 4, 12, 5, '#e74c3c', OL(), 2); D.fillEll(ctx, 34, 3, 8, 2.5, '#8b5a2b');
    ctx.restore();
  },
  tractor(ctx, x, y) {
    ctx.save(); ctx.translate(x, y);
    D.fillEll(ctx, 0, 2, 60, 10, 'rgba(0,0,0,0.18)');
    // wheels
    D.circle(ctx, -28, -22, 24, '#2d3436', OL()); D.circle(ctx, -28, -22, 12, '#636e72', OL(), 2); D.circle(ctx, -28, -22, 5, '#b2bec3');
    D.circle(ctx, 32, -14, 14, '#2d3436', OL()); D.circle(ctx, 32, -14, 7, '#636e72', OL(), 2);
    // body
    D.fillRR(ctx, -12, -50, 60, 32, 6, '#e0413a', OL());
    D.fillRR(ctx, -12, -84, 30, 40, 6, '#e0413a', OL());
    D.fillRR(ctx, -8, -78, 20, 20, 3, '#9ad9ff', OL(), 2.5);
    D.fillRR(ctx, 20, -60, 6, 26, 3, '#636e72', OL(), 2); // exhaust
    D.circle(ctx, 42, -40, 6, '#ffe066', OL(), 2); // headlight
    D.fillRR(ctx, -40, -46, 30, 10, 3, '#2d3436', OL(), 2); // seat
    D.circle(ctx, -22, -56, 7, null, '#2d3436', 3); // wheel
    ctx.restore();
  },
  windmill(ctx, x, y, t) {
    ctx.save(); ctx.translate(x, y);
    D.fillEll(ctx, 0, 2, 26, 8, 'rgba(0,0,0,0.18)');
    D.poly(ctx, [[-22, 0], [-10, -110], [10, -110], [22, 0]], '#c9895a', OL());
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 2; for (let i = 1; i < 5; i++) { const yy = -i * 22; ctx.beginPath(); ctx.moveTo(-22 + i * 2.4, yy); ctx.lineTo(22 - i * 2.4, yy); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-18, -20); ctx.lineTo(14, -90); ctx.moveTo(18, -20); ctx.lineTo(-14, -90); ctx.stroke();
    ctx.translate(0, -112); ctx.rotate(t * 0.9);
    for (let i = 0; i < 4; i++) { ctx.save(); ctx.rotate(i * Math.PI / 2); D.fillRR(ctx, -5, -52, 10, 50, 4, '#fff8f0', OL(), 2.5); D.fillRR(ctx, -2, -50, 4, 46, 2, '#e0413a'); ctx.restore(); }
    D.circle(ctx, 0, 0, 7, '#e0413a', OL(), 2.5);
    ctx.restore();
  },
  scarecrow(ctx, x, y, t) {
    ctx.save(); ctx.translate(x, y);
    D.fillEll(ctx, 0, 2, 22, 6, 'rgba(0,0,0,0.18)');
    D.fillRR(ctx, -4, -70, 8, 70, 3, '#8b5a2b', OL(), 2.5);
    D.line(ctx, -34, -58, 34, -58, '#8b5a2b', 6);
    // straw hands
    [-36, 36].forEach(hx => { for (let i = -2; i <= 2; i++) D.line(ctx, hx, -58, hx + Math.sign(hx) * 8, -60 + i * 4, '#e9c46a', 2); });
    // shirt
    D.fillRR(ctx, -22, -66, 44, 34, 6, '#54a0ff', OL()); D.fillRR(ctx, -6, -60, 12, 12, 2, '#e74c3c', OL(), 1.5);
    D.fillRR(ctx, -14, -34, 28, 20, 4, '#8e6a3a', OL());
    // head (sack)
    D.circle(ctx, 0, -78, 15, '#f2d27a', OL());
    D.eye(ctx, -5, -80, 3, {}); D.eye(ctx, 5, -80, 3, {});
    ctx.beginPath(); ctx.arc(0, -76, 7, 0.2, Math.PI - 0.2); ctx.strokeStyle = OL(); ctx.lineWidth = 2; ctx.stroke();
    // hat
    D.fillEll(ctx, 0, -90, 24, 6, '#c9a227', OL(), 2.5); D.fillRR(ctx, -13, -108, 26, 20, 4, '#c9a227', OL(), 2.5); D.fillRR(ctx, -13, -96, 26, 5, 1, '#e74c3c');
    // crow on arm
    ctx.save(); ctx.translate(30, -60);
    D.fillEll(ctx, 0, -6, 8, 5, '#2d3436', OL(), 2); D.circle(ctx, 7, -12, 4.5, '#2d3436', OL(), 2); D.poly(ctx, [[10, -12], [16, -11], [10, -9]], '#ff9f43', OL(), 1.5); D.circle(ctx, 8, -13, 1.2, '#fff');
    ctx.restore();
    ctx.restore();
  },
  garden(ctx, x, y, w, h) {
    ctx.save();
    D.fillRR(ctx, x, y, w, h, 8, '#8e6a3a', OL());
    const rows = 4;
    for (let r = 0; r < rows; r++) {
      const ry = y + 14 + r * (h - 20) / (rows - 1) * 0.9;
      D.line(ctx, x + 10, ry, x + w - 10, ry, 'rgba(0,0,0,0.15)', 8);
      for (let cx = x + 22; cx < x + w - 12; cx += 24) {
        if (r === 0) { D.fillEll(ctx, cx, ry, 8, 6, '#ff9f43', OL(), 1.5); D.line(ctx, cx, ry - 4, cx - 3, ry - 12, '#2e8b57', 2); D.line(ctx, cx, ry - 4, cx + 3, ry - 12, '#2e8b57', 2); }       // carrots
        else if (r === 1) { D.circle(ctx, cx, ry, 8, '#7ccc5a', OL(), 1.5); D.circle(ctx, cx, ry, 4, '#a3e635'); }   // cabbages
        else if (r === 2) { D.fillEll(ctx, cx, ry, 9, 7, '#ff8c42', OL(), 1.5); D.line(ctx, cx - 5, ry - 6, cx - 5, ry + 6, 'rgba(0,0,0,0.15)', 1.5); D.line(ctx, cx + 4, ry - 6, cx + 4, ry + 6, 'rgba(0,0,0,0.15)', 1.5); D.line(ctx, cx, ry - 7, cx, ry - 12, '#2e8b57', 3); }  // pumpkins
        else { D.circle(ctx, cx, ry, 6, '#e74c3c', OL(), 1.5); D.line(ctx, cx, ry - 6, cx, ry - 12, '#2e8b57', 2); }  // tomatoes
      }
    }
    ctx.restore();
  },
  sunflower(ctx, x, y, t) {
    const sw = Math.sin(t + x * 0.1) * 2;
    D.line(ctx, x, y, x + sw, y - 46, '#2e8b57', 4);
    D.fillEll(ctx, x - 8, y - 20, 9, 4, '#3fa34d', OL(), 1.5, -0.5); D.fillEll(ctx, x + 8, y - 28, 9, 4, '#3fa34d', OL(), 1.5, 0.5);
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; D.fillEll(ctx, x + sw + Math.cos(a) * 12, y - 48 + Math.sin(a) * 12, 7, 3.5, '#ffd23f', OL(), 1.5, a); }
    D.circle(ctx, x + sw, y - 48, 8, '#8b5a2b', OL(), 2);
  },
  mud(ctx, x, y, rx, ry, t) {
    D.fillEll(ctx, x, y, rx, ry, '#8e6a3a', '#6b4a24', 3);
    D.fillEll(ctx, x - rx * 0.3, y - ry * 0.2, rx * 0.4, ry * 0.4, '#a67c48');
    D.fillEll(ctx, x + rx * 0.35, y + ry * 0.2, rx * 0.3, ry * 0.3, '#a67c48');
    for (let i = 0; i < 4; i++) { const p = ((t * 0.4 + i * 0.25) % 1); D.circle(ctx, x - rx * 0.6 + i * rx * 0.4, y + ry * 0.3 - p * 6, 3 * (1 - p), null, 'rgba(60,40,20,0.5)', 1.5); }
  },

  /* ----- sky things (drawn as overlays) ----- */
  sun(ctx, x, y, t, r = 40) {
    ctx.save(); ctx.translate(x, y);
    ctx.save(); ctx.rotate(t * 0.2);
    for (let i = 0; i < 12; i++) { ctx.save(); ctx.rotate(i * Math.PI / 6); D.poly(ctx, [[-7, -r - 6], [0, -r - 24 - (i % 2) * 8], [7, -r - 6]], '#ffd23f', OL(), 2.5); ctx.restore(); }
    ctx.restore();
    D.circle(ctx, 0, 0, r, '#ffe066', OL(), 3.5); D.circle(ctx, -8, -8, r * 0.5, 'rgba(255,255,255,0.35)');
    D.eye(ctx, -12, -4, 5, { happy: true }); D.eye(ctx, 12, -4, 5, { happy: true });
    ctx.beginPath(); ctx.arc(0, 4, 14, 0.15, Math.PI - 0.15); ctx.strokeStyle = OL(); ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.stroke();
    D.cheek(ctx, -20, 6, 5); D.cheek(ctx, 20, 6, 5);
    ctx.restore();
  },
  moon(ctx, x, y, t, r = 36) {
    ctx.save(); ctx.translate(x, y);
    const g = ctx.createRadialGradient(0, 0, r, 0, 0, r * 2.4); g.addColorStop(0, 'rgba(255,240,180,0.35)'); g.addColorStop(1, 'rgba(255,240,180,0)');
    ctx.fillStyle = g; ctx.fillRect(-r * 3, -r * 3, r * 6, r * 6);
    D.circle(ctx, 0, 0, r, '#fff1b8', OL(), 3.5);
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip(); D.circle(ctx, r * 0.55, -r * 0.35, r * 0.78, '#0d1b3d'); ctx.restore();
    D.circle(ctx, 0, 0, r, null, OL(), 3.5);
    D.eye(ctx, -14, -2, 4, { closed: true }); D.eye(ctx, -2, 8, 4, { closed: true });
    ctx.beginPath(); ctx.arc(-9, 14, 5, 0.2, Math.PI - 0.2); ctx.strokeStyle = OL(); ctx.lineWidth = 2.5; ctx.stroke();
    D.cheek(ctx, -20, 8, 4);
    ctx.restore();
  },
  cloud(ctx, x, y, s = 1, alpha = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.globalAlpha = alpha;
    [[-30, 0, 20], [-8, -12, 26], [18, -6, 22], [36, 4, 16], [0, 6, 20]].forEach(([cx, cy, r]) => D.circle(ctx, cx, cy, r, '#fff', 'rgba(150,180,220,0.6)', 3));
    [[-30, 0, 20], [-8, -12, 26], [18, -6, 22], [36, 4, 16], [0, 6, 20]].forEach(([cx, cy, r]) => D.circle(ctx, cx, cy, r - 1.5, '#fff'));
    ctx.restore();
  },
  star(ctx, x, y, r, a) {
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y);
    ctx.beginPath(); for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.45 : r, an = i / 10 * Math.PI * 2 - Math.PI / 2; ctx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); } ctx.closePath();
    ctx.fillStyle = '#fff6c2'; ctx.fill(); ctx.restore();
  },
  butterfly(ctx, x, y, t, color) {
    ctx.save(); ctx.translate(x, y);
    const f = Math.abs(Math.sin(t * 12));
    ctx.save(); ctx.scale(f * 0.7 + 0.3, 1);
    D.fillEll(ctx, -7, -3, 7, 5, color, OL(), 1.5, -0.4); D.fillEll(ctx, -6, 4, 5, 4, U.shade(color, 0.3), OL(), 1.5, 0.3);
    D.fillEll(ctx, 7, -3, 7, 5, color, OL(), 1.5, 0.4); D.fillEll(ctx, 6, 4, 5, 4, U.shade(color, 0.3), OL(), 1.5, -0.3);
    ctx.restore();
    D.fillRR(ctx, -1.5, -5, 3, 12, 1.5, '#333');
    ctx.restore();
  },
  bat(ctx, x, y, t) {
    ctx.save(); ctx.translate(x, y);
    const f = Math.sin(t * 14) * 0.6;
    ctx.fillStyle = '#1e272e';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-10, -8 - f * 8, -22, -2 + f * 6); ctx.quadraticCurveTo(-14, 2, -10, 6); ctx.quadraticCurveTo(-4, 4, 0, 6); ctx.quadraticCurveTo(4, 4, 10, 6); ctx.quadraticCurveTo(14, 2, 22, -2 + f * 6); ctx.quadraticCurveTo(10, -8 - f * 8, 0, 0); ctx.fill();
    D.circle(ctx, 0, 1, 4, '#1e272e'); D.poly(ctx, [[-4, -1], [-3, -6], [-1, -2]], '#1e272e'); D.poly(ctx, [[1, -2], [3, -6], [4, -1]], '#1e272e');
    ctx.restore();
  },

  /* ----- barn interior ----- */
  barnInterior(ctx, W, H) {
    // back wall
    const wallH = 300;
    const wg = ctx.createLinearGradient(0, 0, 0, wallH); wg.addColorStop(0, '#7a4f2c'); wg.addColorStop(1, '#9a6738');
    ctx.fillStyle = wg; ctx.fillRect(0, 0, W, wallH);
    for (let x = 0; x < W; x += 58) { ctx.fillStyle = (x / 58) % 2 ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.04)'; ctx.fillRect(x, 0, 58, wallH); D.line(ctx, x, 0, x, wallH, 'rgba(60,35,15,0.5)', 2); }
    // loft ledge
    ctx.fillStyle = '#5a3a1e'; ctx.fillRect(0, 0, W, 54); D.line(ctx, 0, 54, W, 54, OL(), 4);
    for (let x = 0; x < W; x += 60) { D.line(ctx, x, 6, x, 50, 'rgba(0,0,0,0.25)', 2); }
    // hay hanging over the loft ledge
    for (let x = 30; x < W; x += 95) { D.fillEll(ctx, x, 54, 34 + (x % 3) * 6, 12, '#e9c46a', OL(), 2.5); ctx.strokeStyle = '#c9a227'; ctx.lineWidth = 2; for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(x + i * 6, 56); ctx.lineTo(x + i * 8, 66); ctx.stroke(); } }
    // support beams
    [220, 1060].forEach(bx => { D.fillRR(ctx, bx - 12, 54, 24, wallH - 54, 3, '#6b4423', OL(), 3); D.line(ctx, bx, 60, bx, wallH, 'rgba(255,255,255,0.1)', 3); });
    // floor
    const fg = ctx.createLinearGradient(0, wallH, 0, H); fg.addColorStop(0, '#b47c48'); fg.addColorStop(1, '#a06a3c');
    ctx.fillStyle = fg; ctx.fillRect(0, wallH, W, H - wallH);
    for (let y = wallH; y < H; y += 44) {
      D.line(ctx, 0, y, W, y, 'rgba(70,40,15,0.45)', 3);
      for (let x = ((y / 44) % 2) * 120; x < W; x += 240) D.line(ctx, x, y + 2, x, y + 42, 'rgba(70,40,15,0.35)', 2);
      for (let k = 0; k < 4; k++) D.fillEll(ctx, (y * 7 + k * 331) % W, y + 22, 4, 2, 'rgba(70,40,15,0.3)');
    }
    D.line(ctx, 0, wallH, W, wallH, OL(), 5);
    // scattered straw
    let r = 3; const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
    ctx.lineCap = 'round';
    for (let i = 0; i < 260; i++) { const x = rnd() * W, y = wallH + 10 + rnd() * (H - wallH - 20), a = rnd() * Math.PI, l = 6 + rnd() * 10; D.line(ctx, x, y, x + Math.cos(a) * l, y + Math.sin(a) * l * 0.5, rnd() < 0.5 ? 'rgba(233,196,106,0.75)' : 'rgba(255,225,140,0.6)', 2); }
    // wall decorations
    // horseshoes
    [[130, 130], [160, 165], [100, 165]].forEach(([hx, hy]) => { ctx.beginPath(); ctx.arc(hx, hy, 12, Math.PI * 0.85, Math.PI * 2.15); ctx.strokeStyle = '#b2bec3'; ctx.lineWidth = 6; ctx.stroke(); ctx.strokeStyle = OL(); ctx.lineWidth = 1.5; ctx.stroke(); });
    // rope coil
    D.circle(ctx, 320, 150, 26, null, '#d9b06a', 9); D.circle(ctx, 320, 150, 26, null, 'rgba(0,0,0,0.25)', 2); D.circle(ctx, 320, 150, 14, null, 'rgba(0,0,0,0.15)', 2); D.line(ctx, 320, 108, 320, 124, '#d9b06a', 5); D.circle(ctx, 320, 106, 4, '#636e72');
    // shelf with buckets
    D.fillRR(ctx, 800, 170, 220, 12, 3, '#6b4423', OL(), 2.5);
    [830, 890].forEach(bx => { D.poly(ctx, [[bx - 18, 130], [bx + 18, 130], [bx + 14, 170], [bx - 14, 170]], '#b2bec3', OL(), 2.5); ctx.beginPath(); ctx.arc(bx, 132, 16, Math.PI, 0); ctx.strokeStyle = OL(); ctx.lineWidth = 3; ctx.stroke(); });
    D.fillRR(ctx, 940, 132, 30, 38, 4, '#e74c3c', OL(), 2.5); D.fillRR(ctx, 950, 124, 10, 10, 2, '#e74c3c', OL(), 2);
    // ladder
    D.fillRR(ctx, 1170, 60, 8, 240, 3, '#c9895a', OL(), 2.5); D.fillRR(ctx, 1230, 60, 8, 240, 3, '#c9895a', OL(), 2.5);
    for (let y = 80; y < 300; y += 36) D.fillRR(ctx, 1172, y, 64, 8, 3, '#c9895a', OL(), 2);
    // pitchfork
    D.fillRR(ctx, 30, 120, 6, 200, 3, '#c9895a', OL(), 2); [24, 33, 42].forEach(px => D.line(ctx, px, 130, px, 100, '#b2bec3', 4)); D.line(ctx, 22, 130, 44, 130, '#b2bec3', 5);
    // hanging hat
    D.circle(ctx, 60, 200, 4, '#636e72'); D.fillEll(ctx, 60, 226, 26, 8, '#e9c46a', OL(), 2.5); D.fillRR(ctx, 46, 206, 28, 22, 6, '#e9c46a', OL(), 2.5); D.fillRR(ctx, 46, 216, 28, 5, 1, '#e74c3c');
    // corner hay pile
    S.hayPile(ctx, 60, 340, 1.4); S.hayBale(ctx, 1230, 360, 1.1); S.hayBale(ctx, 1150, 380, 1.1, true);
  },
  barnWindow(ctx, x, y, w, h, night, t) {
    // sky in the window
    ctx.save();
    D.rr(ctx, x, y, w, h, 6); ctx.clip();
    const sky = ctx.createLinearGradient(0, y, 0, y + h);
    if (night > 0.5) { sky.addColorStop(0, '#0d1b3d'); sky.addColorStop(1, '#23386b'); } else { sky.addColorStop(0, '#5fbdf7'); sky.addColorStop(1, '#bfe9ff'); }
    ctx.fillStyle = sky; ctx.fillRect(x, y, w, h);
    if (night > 0.5) {
      [[0.2, 0.25], [0.5, 0.15], [0.8, 0.35], [0.35, 0.6], [0.7, 0.7], [0.15, 0.8]].forEach(([fx, fy], i) => S.star(ctx, x + w * fx, y + h * fy, 4, 0.5 + 0.5 * Math.abs(Math.sin(t * 2 + i))));
      S.moon(ctx, x + w * 0.62, y + h * 0.4, t, 24);
    } else {
      S.cloud(ctx, x + w * 0.3 + Math.sin(t * 0.2) * 10, y + h * 0.35, 0.5, 0.9);
      S.sun(ctx, x + w * 0.75, y + h * 0.35, t, 20);
    }
    ctx.restore();
    // frame
    D.fillRR(ctx, x, y, w, h, 6, null, '#f5e6c8', 10); D.fillRR(ctx, x - 5, y - 5, w + 10, h + 10, 8, null, OL(), 3);
    D.line(ctx, x + w / 2, y, x + w / 2, y + h, '#f5e6c8', 8); D.line(ctx, x, y + h / 2, x + w, y + h / 2, '#f5e6c8', 8);
    D.fillRR(ctx, x - 12, y + h - 2, w + 24, 12, 3, '#f5e6c8', OL(), 2.5);
  },
  lantern(ctx, x, y, lit, t) {
    ctx.save(); ctx.translate(x, y);
    D.line(ctx, 0, -60, 0, -20, '#636e72', 3); D.circle(ctx, 0, -60, 5, '#636e72', OL(), 2);
    D.fillRR(ctx, -14, -22, 28, 6, 2, '#2d3436', OL(), 2);
    D.fillRR(ctx, -12, -16, 24, 34, 4, lit ? '#ffe9a0' : '#c7d0d8', OL(), 2.5);
    D.line(ctx, -8, -16, -8, 18, OL(), 2); D.line(ctx, 8, -16, 8, 18, OL(), 2);
    D.fillRR(ctx, -14, 18, 28, 6, 2, '#2d3436', OL(), 2);
    if (lit) { const f = 1 + Math.sin(t * 9) * 0.1 + Math.sin(t * 23) * 0.05; D.fillEll(ctx, 0, 6, 5 * f, 9 * f, '#ff9f43', null); D.fillEll(ctx, 0, 8, 3 * f, 5 * f, '#ffe066'); }
    ctx.restore();
  },
  namePlate(ctx, x, y, text) {
    ctx.save();
    ctx.font = 'bold 18px "Comic Sans MS","Chalkboard SE","Segoe UI Rounded",sans-serif';
    const w = ctx.measureText(text).width + 30;
    D.fillRR(ctx, x - w / 2, y - 15, w, 30, 6, '#f5e6c8', OL(), 2.5);
    D.circle(ctx, x - w / 2 + 8, y, 2.5, '#636e72'); D.circle(ctx, x + w / 2 - 8, y, 2.5, '#636e72');
    D.text(ctx, text, x, y + 1, 18, '#7a3e12');
    ctx.restore();
  },
  stallDivider(ctx, x, yTop, yBot) {
    D.fillRR(ctx, x - 6, yTop - 10, 12, yBot - yTop + 10, 3, '#8b5a2b', OL(), 2.5);
    [0.25, 0.55, 0.85].forEach(f => { const y = yTop + (yBot - yTop) * f; D.fillRR(ctx, x - 40, y - 4, 80, 8, 3, '#c9895a', OL(), 2); });
  },
  penRail(ctx, x1, x2, y) {
    D.fillRR(ctx, x1 - 5, y - 40, 10, 42, 3, '#8b5a2b', OL(), 2.5); D.fillRR(ctx, x2 - 5, y - 40, 10, 42, 3, '#8b5a2b', OL(), 2.5);
    [0.35, 0.7].forEach(f => { const yy = y - 40 + 40 * f; D.line(ctx, x1, yy, x2, yy, OL(), 9); D.line(ctx, x1, yy, x2, yy, '#c9895a', 5); });
  },
  bed(ctx, x, y) { D.fillEll(ctx, x, y - 6, 44, 20, '#e74c3c', OL()); D.fillEll(ctx, x, y - 8, 34, 13, '#ff7675', OL(), 2); },
  nest(ctx, x, y) {
    D.fillEll(ctx, x, y - 4, 70, 22, '#c9a227', OL()); D.fillEll(ctx, x, y - 8, 56, 14, '#e9c46a', null);
    ctx.strokeStyle = '#8b5a2b'; ctx.lineWidth = 2; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 40, y - 6 + Math.sin(a) * 12); ctx.lineTo(x + Math.cos(a) * 64, y - 4 + Math.sin(a) * 20); ctx.stroke(); }
  },
  roost(ctx, x1, x2, y) {
    D.fillRR(ctx, x1, y - 6, x2 - x1, 12, 5, '#8b5a2b', OL(), 3);
    [[x1 + 30], [x2 - 30]].forEach(([bx]) => D.poly(ctx, [[bx - 6, y + 4], [bx + 6, y + 4], [bx, y + 40]], '#6b4423', OL(), 2.5));
  }
};
