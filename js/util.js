/* ---------- Small utility helpers ---------- */
const U = {
  rand(a, b) { return a + Math.random() * (b - a); },
  randInt(a, b) { return Math.floor(U.rand(a, b + 1)); },
  pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  clamp(v, a, b) { return v < a ? a : v > b ? b : v; },
  lerp(a, b, t) { return a + (b - a) * t; },
  dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); },
  easeInOut(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; },
  easeOut(t) { return 1 - (1 - t) * (1 - t); },
  shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
  // Mix two hex/rgb colours
  mix(c1, c2, t) {
    const a = U.rgb(c1), b = U.rgb(c2);
    return `rgb(${Math.round(U.lerp(a[0], b[0], t))},${Math.round(U.lerp(a[1], b[1], t))},${Math.round(U.lerp(a[2], b[2], t))})`;
  },
  rgb(c) {
    if (Array.isArray(c)) return c;
    if (c[0] === '#') {
      const h = c.length === 4 ? c.slice(1).split('').map(x => x + x).join('') : c.slice(1);
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    }
    const m = c.match(/\d+/g); return [+m[0], +m[1], +m[2]];
  },
  shade(c, amt) { // amt -1..1 darken/lighten
    const [r, g, b] = U.rgb(c);
    const f = v => Math.round(U.clamp(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt, 0, 255));
    return `rgb(${f(r)},${f(g)},${f(b)})`;
  },
  numberWord(n) {
    return ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'][n] || String(n);
  }
};

/* ---------- Canvas drawing helpers ---------- */
const D = {
  OUTLINE: '#4a2f1a',
  LW: 3,
  rr(ctx, x, y, w, h, r) { // rounded rect path
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },
  ell(ctx, x, y, rx, ry, rot = 0) {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2);
    ctx.closePath();
  },
  fillEll(ctx, x, y, rx, ry, fill, stroke, lw, rot = 0) {
    D.ell(ctx, x, y, rx, ry, rot);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || D.LW; ctx.stroke(); }
  },
  fillRR(ctx, x, y, w, h, r, fill, stroke, lw) {
    D.rr(ctx, x, y, w, h, r);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || D.LW; ctx.stroke(); }
  },
  circle(ctx, x, y, r, fill, stroke, lw) {
    ctx.beginPath(); ctx.arc(x, y, Math.max(0.1, r), 0, Math.PI * 2); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || D.LW; ctx.stroke(); }
  },
  poly(ctx, pts, fill, stroke, lw, close = true) {
    ctx.beginPath();
    pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
    if (close) ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || D.LW; ctx.lineJoin = 'round'; ctx.stroke(); }
  },
  line(ctx, x1, y1, x2, y2, stroke, lw, cap = 'round') {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.lineCap = cap; ctx.stroke();
  },
  shadow(ctx, x, y, rx, ry, a = 0.18) {
    D.fillEll(ctx, x, y, rx, ry, `rgba(0,0,0,${a})`);
  },
  // Cute eye: white with pupil + highlight, or closed arc when asleep
  eye(ctx, x, y, r, opts = {}) {
    const { closed = false, look = 0, happy = false, color = '#222', glow = null } = opts;
    if (closed) {
      ctx.beginPath(); ctx.arc(x, y - r * 0.2, r * 1.05, Math.PI * 0.15, Math.PI * 0.85);
      ctx.strokeStyle = D.OUTLINE; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.stroke();
      return;
    }
    if (happy) {
      ctx.beginPath(); ctx.arc(x, y + r * 0.3, r * 1.05, Math.PI * 1.15, Math.PI * 1.85);
      ctx.strokeStyle = D.OUTLINE; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.stroke();
      return;
    }
    D.circle(ctx, x, y, r, '#fff', D.OUTLINE, 1.6);
    if (glow) { D.circle(ctx, x, y, r * 0.75, glow); }
    D.circle(ctx, x + look * r * 0.3, y + r * 0.1, r * 0.55, color);
    D.circle(ctx, x + look * r * 0.3 - r * 0.2, y - r * 0.2, r * 0.2, '#fff');
  },
  cheek(ctx, x, y, r) { D.circle(ctx, x, y, r, 'rgba(255,120,140,0.35)'); },
  text(ctx, str, x, y, size, fill, opts = {}) {
    const { align = 'center', stroke = null, lw = 4, font = 'bold', baseline = 'middle', family = '"Comic Sans MS","Chalkboard SE","Segoe UI Rounded",sans-serif' } = opts;
    ctx.font = `${font} ${size}px ${family}`;
    ctx.textAlign = align; ctx.textBaseline = baseline;
    if (stroke) { ctx.lineJoin = 'round'; ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.strokeText(str, x, y); }
    ctx.fillStyle = fill; ctx.fillText(str, x, y);
  },
  bubble(ctx, x, y, str, scale = 1, opts = {}) {
    // Speech bubble centred at x, with tail pointing down to (x, y)
    const size = opts.size || 22;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.font = `bold ${size}px "Comic Sans MS","Chalkboard SE","Segoe UI Rounded",sans-serif`;
    const w = ctx.measureText(str).width + 28, h = size + 22;
    const bx = -w / 2, by = -h - 18;
    ctx.beginPath();
    ctx.moveTo(bx + 14, by);
    ctx.lineTo(bx + w - 14, by); ctx.quadraticCurveTo(bx + w, by, bx + w, by + 14);
    ctx.lineTo(bx + w, by + h - 14); ctx.quadraticCurveTo(bx + w, by + h, bx + w - 14, by + h);
    ctx.lineTo(10, by + h); ctx.lineTo(0, by + h + 16); ctx.lineTo(-10, by + h);
    ctx.lineTo(bx + 14, by + h); ctx.quadraticCurveTo(bx, by + h, bx, by + h - 14);
    ctx.lineTo(bx, by + 14); ctx.quadraticCurveTo(bx, by, bx + 14, by);
    ctx.closePath();
    ctx.fillStyle = opts.fill || '#fff'; ctx.fill();
    ctx.strokeStyle = opts.stroke || D.OUTLINE; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.fillStyle = opts.color || '#c0392b'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(str, 0, by + h / 2 + 1);
    ctx.restore();
  }
};
