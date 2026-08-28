/* ---------- Animal definitions + procedural drawing ----------
   Every drawer draws the animal facing RIGHT with its feet at (0,0).
   `a` = animation state: { t, dir, moving, phase, sleeping, graze, peck, talk, blink, inWater, action:{type,p} }
*/
const OL = () => D.OUTLINE;
const IS_TOUCH = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;

const SPECIES = {
  cow:     { name: 'Cow',     plural: 'cows',     emoji: '🐄', says: 'Moo!',        sound: 'cow',     speed: 26, w: 100, h: 84, head: [42, 78], group: 'cow',
             variants: [{ body: '#ffffff', spots: '#2d3436' }, { body: '#c98a4b', spots: null }, { body: '#ffffff', spots: '#a0522d' }],
             trick: 'jump', trickText: 'Munch munch!', trickSound: 'munch' },
  horse:   { name: 'Horse',   plural: 'horses',   emoji: '🐴', says: 'Neigh!',      sound: 'horse',   speed: 40, w: 110, h: 110, head: [56, 100], group: 'horse',
             variants: [{ body: '#a8683a', mane: '#3b2313' }, { body: '#f1ede4', mane: '#c9a86a' }],
             trick: 'rear', trickText: 'Wheee!', trickSound: 'gallop' },
  pig:     { name: 'Pig',     plural: 'pigs',     emoji: '🐷', says: 'Oink!',       sound: 'pig',     speed: 22, w: 76, h: 60, head: [30, 55], group: 'pig',
             variants: [{ body: '#f8a5c2', spots: null }, { body: '#f8a5c2', spots: '#c97b9c' }, { body: '#f5b7c9', spots: null }],
             trick: 'roll', trickText: 'Splish splash!', trickSound: 'splash' },
  sheep:   { name: 'Sheep',   plural: 'sheep',    emoji: '🐑', says: 'Baa!',        sound: 'sheep',   speed: 22, w: 78, h: 64, head: [30, 60], group: 'sheep',
             variants: [{ face: '#3d3d3d' }, { face: '#3d3d3d' }, { face: '#8b5a2b' }, { face: '#3d3d3d' }],
             trick: 'bounce', trickText: 'Boing!', trickSound: 'boing' },
  goat:    { name: 'Goat',    plural: 'goats',    emoji: '🐐', says: 'Meh-eh-eh!',  sound: 'goat',    speed: 30, w: 80, h: 76, head: [36, 70], group: 'goat',
             variants: [{ body: '#ecebe4' }],
             trick: 'bounce', trickText: 'Boing!', trickSound: 'boing' },
  dog:     { name: 'Dog',     plural: 'dogs',     emoji: '🐶', says: 'Woof woof!',  sound: 'dog',     speed: 55, w: 72, h: 60, head: [30, 58], group: 'dog',
             variants: [{ body: '#c98a4b', patch: '#fff' }],
             trick: 'spin', trickText: 'Woof!', trickSound: 'dog' },
  cat:     { name: 'Cat',     plural: 'cats',     emoji: '🐱', says: 'Meow!',       sound: 'cat',     speed: 38, w: 58, h: 48, head: [24, 46], group: 'cat',
             variants: [{ body: '#f39c3d', stripes: '#c96a13' }],
             trick: 'pounce', trickText: 'Purrrr...', trickSound: 'purr' },
  kitten:  { name: 'Kitten',  plural: 'kittens',  emoji: '🐱', says: 'Mew!',        sound: 'kitten',  speed: 45, w: 40, h: 34, head: [16, 32], group: 'cat', scale: 0.68,
             variants: [{ body: '#95a5a6', stripes: '#636e72' }, { body: '#2d3436', stripes: null, patch: '#fff' }],
             trick: 'pounce', trickText: 'Mew mew!', trickSound: 'kitten' },
  chicken: { name: 'Chicken', plural: 'chickens', emoji: '🐔', says: 'Bok bok!',    sound: 'chicken', speed: 30, w: 46, h: 54, head: [16, 50], group: 'chicken', scale: 1.15,
             variants: [{ body: '#ffffff' }, { body: '#e8b06b' }, { body: '#ffffff' }, { body: '#d98c4a' }, { body: '#fdf3d0' }],
             trick: 'flap', trickText: 'Bok bok!', trickSound: 'flap' },
  rooster: { name: 'Rooster', plural: 'roosters', emoji: '🐓', says: 'Cock-a-doodle-doo!', sound: 'rooster', speed: 32, w: 60, h: 72, head: [20, 68], group: 'rooster', scale: 1.25,
             variants: [{ body: '#b03a2e' }],
             trick: 'crow', trickText: 'Cock-a-doodle-doo!', trickSound: 'rooster' },
  duck:    { name: 'Duck',    plural: 'ducks',    emoji: '🦆', says: 'Quack!',      sound: 'duck',    speed: 24, w: 46, h: 50, head: [16, 46], group: 'duck', scale: 1.15,
             variants: [{ body: '#ffffff', bill: '#ff9f43' }, { body: '#ffe066', bill: '#ff9f43', duckling: true }, { body: '#ffe066', bill: '#ff9f43', duckling: true }],
             trick: 'dive', trickText: 'Splash!', trickSound: 'splash' },
  owl:     { name: 'Owl',     plural: 'owls',     emoji: '🦉', says: 'Hoo hoo!',    sound: 'owl',     speed: 0, w: 46, h: 70, head: [0, 66], group: 'owl',
             variants: [{ body: '#8d6748' }],
             trick: 'hoot', trickText: 'Hoo hoo!', trickSound: 'owl' },
  frog:    { name: 'Frog',    plural: 'frogs',    emoji: '🐸', says: 'Ribbit!',     sound: 'frog',    speed: 0, w: 44, h: 36, head: [0, 30], group: 'frog',
             variants: [{ body: '#5dbb63' }, { body: '#6fcf6f' }, { body: '#4caf50' }],
             trick: 'jump', trickText: 'Ribbit!', trickSound: 'frog' },
};

/* ===== shared parts ===== */
function legPiece(ctx, hx, hy, ang, L, far) {
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang);
  const col = far ? U.shade(L.color, -0.28) : L.color;
  D.fillRR(ctx, -L.legW / 2, -6, L.legW, L.legLen + 6, L.legW / 2, col, OL(), 2.4);
  if (L.hoof) {
    const hc = far ? U.shade(L.hoof, -0.25) : L.hoof;
    D.fillRR(ctx, -L.legW / 2 - 1.5, L.legLen - L.hoofH, L.legW + 3, L.hoofH, 3, hc, OL(), 2);
  }
  ctx.restore();
}
// which: 'far' | 'near'
function quadLegs(ctx, a, L, which) {
  const amp = a.moving ? (a.run ? 0.75 : 0.5) : 0;
  const s1 = Math.sin(a.phase) * amp, s2 = Math.sin(a.phase + Math.PI) * amp;
  if (which === 'far') { legPiece(ctx, L.hipBack - 5, L.hipY, s2, L, true); legPiece(ctx, L.hipFront - 5, L.hipY, s1, L, true); }
  else { legPiece(ctx, L.hipBack + 3, L.hipY, s1, L, false); legPiece(ctx, L.hipFront + 3, L.hipY, s2, L, false); }
}
function foldedLegs(ctx, x1, x2, y, w, color) { // for sleeping animals
  D.fillRR(ctx, x1 - 8, y - 5, 22, w, w / 2, color, OL(), 2.2);
  D.fillRR(ctx, x2 - 6, y - 5, 22, w, w / 2, color, OL(), 2.2);
}
function birdLegs(ctx, a, color, x1, x2, topY) {
  const sw = a.moving ? Math.sin(a.phase * 1.4) * 0.5 : 0;
  [[x1, sw], [x2, -sw]].forEach(([x, s]) => {
    ctx.save(); ctx.translate(x, topY); ctx.rotate(s);
    D.line(ctx, 0, 0, 0, -topY, OL(), 5); D.line(ctx, 0, 0, 0, -topY, color, 2.6);
    // toes
    [-5, 0, 5].forEach(tx => { D.line(ctx, 0, -topY, tx * 1.2, -topY + 0.5, OL(), 4.2); D.line(ctx, 0, -topY, tx * 1.2, -topY + 0.5, color, 2); });
    ctx.restore();
  });
}
function mouth(ctx, x, y, talk, w = 6) {
  if (talk > 0.05) { D.fillEll(ctx, x, y, w * (0.5 + talk * 0.7), w * 0.9 * talk + 1, '#5b1f1f', OL(), 1.6); }
  else { ctx.beginPath(); ctx.arc(x, y - 1, w * 0.6, Math.PI * 0.15, Math.PI * 0.85); ctx.strokeStyle = OL(); ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.stroke(); }
}
function eyes(ctx, x1, x2, y, r, a, look = 0) {
  const closed = a.sleeping || a.blink;
  D.eye(ctx, x1, y, r, { closed, look, happy: a.happy });
  D.eye(ctx, x2, y, r, { closed, look, happy: a.happy });
}
function bobOf(a) { return a.moving ? Math.abs(Math.sin(a.phase)) * 2.5 : Math.sin(a.t * 2.2) * (a.sleeping ? 1.2 : 0.7); }

/* ===== COW ===== */
function drawCow(ctx, v, a) {
  const L = { hipBack: -24, hipFront: 22, hipY: -26, legLen: 26, legW: 12, color: v.body, hoof: '#4a2f1a', hoofH: 8 };
  const bob = bobOf(a); const slp = a.sleeping;
  const jump = a.action && a.action.type === 'jump' ? Math.sin(Math.min(1, a.action.p * 2) * Math.PI) * 26 : 0;
  ctx.save();
  D.shadow(ctx, 0, 0, 48, 12);
  ctx.translate(0, -jump);
  if (slp) ctx.translate(0, 18);
  if (!slp) quadLegs(ctx, a, L, 'far');
  ctx.translate(0, -bob);
  // tail
  ctx.save(); ctx.translate(-42, -56);
  const sway = Math.sin(a.t * 3) * 0.15;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-8 + sway * 20, 14, -10 + sway * 30, 30);
  ctx.strokeStyle = OL(); ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.stroke(); ctx.strokeStyle = v.body; ctx.lineWidth = 3; ctx.stroke();
  D.fillEll(ctx, -10 + sway * 30, 32, 6, 8, v.spots || '#4a2f1a', OL(), 2);
  ctx.restore();
  // body
  D.fillEll(ctx, 0, -48, 44, 24, v.body, OL());
  if (v.spots) {
    ctx.save(); D.ell(ctx, 0, -48, 44, 24); ctx.clip();
    D.fillEll(ctx, -20, -54, 14, 10, v.spots, null, 0, 0.3); D.fillEll(ctx, 14, -40, 12, 9, v.spots, null, 0, -0.4); D.fillEll(ctx, 8, -64, 10, 7, v.spots);
    ctx.restore();
  }
  // belly highlight
  D.fillEll(ctx, 6, -36, 22, 6, 'rgba(255,255,255,0.25)');
  // udder
  if (!slp) { D.fillEll(ctx, 6, -27, 11, 6, '#f7b7c8', OL(), 2); }
  ctx.translate(0, bob);
  if (slp) foldedLegs(ctx, -26, 14, -24, 11, v.body); else quadLegs(ctx, a, L, 'near');
  ctx.translate(0, -bob);
  // head
  ctx.save();
  if (a.graze) { ctx.translate(48, -30); ctx.rotate(0.9); }
  else if (slp) { ctx.translate(44, -50); ctx.rotate(0.35); }
  else ctx.translate(46, -64);
  const bodyDark = U.shade(v.body, -0.15);
  // ears
  D.fillEll(ctx, -14, -8, 10, 5, v.body, OL(), 2.4, -0.5); D.fillEll(ctx, 12, -12, 9, 5, v.body, OL(), 2.4, 0.4);
  // horns
  D.fillRR(ctx, -8, -24, 6, 12, 3, '#f5e6c8', OL(), 2); D.fillRR(ctx, 4, -25, 6, 12, 3, '#f5e6c8', OL(), 2);
  D.fillEll(ctx, 0, -2, 18, 16, v.body, OL());
  if (v.spots) { ctx.save(); D.ell(ctx, 0, -2, 18, 16); ctx.clip(); D.fillEll(ctx, -10, -8, 9, 8, v.spots); ctx.restore(); }
  else D.fillEll(ctx, 0, -14, 8, 4, bodyDark); // forelock
  // muzzle
  D.fillEll(ctx, 8, 5, 12, 9, '#f7b7c8', OL(), 2.4);
  D.circle(ctx, 5, 4, 1.8, '#a0455e'); D.circle(ctx, 12, 4, 1.8, '#a0455e');
  mouth(ctx, 8, 10, a.talk, 5);
  eyes(ctx, -5, 7, -6, 4.2, a);
  D.cheek(ctx, -10, 1, 3.5);
  ctx.restore();
  ctx.restore();
}

/* ===== HORSE ===== */
function drawHorse(ctx, v, a) {
  const L = { hipBack: -26, hipFront: 24, hipY: -40, legLen: 40, legW: 9, color: v.body, hoof: '#333', hoofH: 8 };
  const bob = bobOf(a), slp = a.sleeping;
  const rear = a.action && a.action.type === 'rear' ? Math.sin(Math.min(1, a.action.p * 1.6) * Math.PI) : 0;
  ctx.save();
  D.shadow(ctx, 0, 0, 50, 12);
  if (rear) { ctx.translate(-30, 0); ctx.rotate(-rear * 0.6); ctx.translate(30, 0); }
  if (slp) ctx.translate(0, 26);
  if (!slp) quadLegs(ctx, { ...a, run: a.run || rear > 0 }, L, 'far');
  ctx.translate(0, -bob);
  // tail (hair)
  ctx.save(); ctx.translate(-42, -60);
  const sway = Math.sin(a.t * 2.5) * 6;
  D.poly(ctx, [[0, 0], [-8 + sway, 14], [-16 + sway, 40], [-8 + sway, 46], [2 + sway, 44], [8, 20], [6, 4]], v.mane, OL(), 2.5);
  D.line(ctx, -4 + sway * 0.5, 10, -8 + sway, 34, U.shade(v.mane, 0.25), 2);
  ctx.restore();
  // body
  D.fillEll(ctx, 0, -62, 46, 22, v.body, OL());
  D.fillEll(ctx, 4, -50, 24, 6, 'rgba(255,255,255,0.18)');
  ctx.translate(0, bob);
  if (slp) foldedLegs(ctx, -28, 16, -34, 10, v.body); else quadLegs(ctx, a, L, 'near');
  ctx.translate(0, -bob);
  // neck + head
  ctx.save();
  ctx.translate(30, -70);
  let neckAng = -1.05; // up
  if (a.graze) neckAng = 0.55; else if (slp) neckAng = -0.4;
  ctx.rotate(neckAng);
  // neck
  D.fillRR(ctx, -12, -6, 48, 24, 12, v.body, OL());
  // mane along top edge
  for (let i = 0; i < 5; i++) D.circle(ctx, 2 + i * 9, -7, 6, v.mane, OL(), 2);
  // head at end of neck (angled down-forward like a real horse)
  ctx.translate(40, 6);
  ctx.rotate(a.graze ? 0.9 : slp ? 1.1 : 1.45);
  D.fillEll(ctx, 8, 0, 21, 12, v.body, OL());
  D.fillEll(ctx, 23, 2, 9, 7, U.shade(v.body, -0.15), OL(), 2); // muzzle
  D.circle(ctx, 25, 0, 1.6, '#3b2313');
  // ears
  D.poly(ctx, [[-10, -8], [-6, -21], [-1, -8]], v.body, OL(), 2.2);
  D.poly(ctx, [[-2, -9], [3, -20], [7, -8]], v.body, OL(), 2.2);
  D.fillEll(ctx, -4, -7, 7, 4, v.mane, null); // forelock
  D.eye(ctx, 3, -3, 4.2, { closed: a.sleeping || a.blink, happy: a.happy });
  mouth(ctx, 22, 7, a.talk, 4);
  D.cheek(ctx, 12, 4, 3);
  ctx.restore();
  ctx.restore();
}

/* ===== PIG ===== */
function drawPig(ctx, v, a) {
  const L = { hipBack: -18, hipFront: 16, hipY: -15, legLen: 15, legW: 9, color: v.body, hoof: '#8b4a5c', hoofH: 6 };
  const bob = bobOf(a), slp = a.sleeping;
  const roll = a.action && a.action.type === 'roll' ? a.action.p : 0;
  ctx.save();
  D.shadow(ctx, 0, 0, 36, 10);
  if (roll) { ctx.translate(0, -30 + 4); ctx.rotate(Math.sin(roll * Math.PI * 2) * 0.5); ctx.translate(0, 30 - 4); }
  if (slp) ctx.translate(0, 9);
  if (!slp) quadLegs(ctx, a, L, 'far');
  ctx.translate(0, -bob);
  // curly tail
  ctx.save(); ctx.translate(-33, -40); ctx.strokeStyle = OL(); ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(-3, 0, 4, 0, Math.PI * 1.5); ctx.arc(-4, 6, 3, Math.PI * 1.5, Math.PI * 3.2); ctx.stroke();
  ctx.strokeStyle = v.body; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
  D.fillEll(ctx, 0, -35, 33, 21, v.body, OL());
  if (v.spots) { ctx.save(); D.ell(ctx, 0, -35, 33, 21); ctx.clip(); D.fillEll(ctx, -14, -40, 9, 7, v.spots); D.fillEll(ctx, 10, -28, 7, 5, v.spots); ctx.restore(); }
  D.fillEll(ctx, 4, -24, 18, 5, 'rgba(255,255,255,0.28)');
  ctx.translate(0, bob);
  if (slp) foldedLegs(ctx, -20, 8, -13, 8, v.body); else quadLegs(ctx, a, L, 'near');
  ctx.translate(0, -bob);
  // head
  ctx.save();
  if (a.graze) { ctx.translate(30, -24); ctx.rotate(0.7); } else if (slp) { ctx.translate(28, -34); ctx.rotate(0.3); } else ctx.translate(29, -42);
  // ears
  D.poly(ctx, [[-10, -10], [-4, -26], [4, -12]], v.body, OL(), 2.4);
  D.poly(ctx, [[4, -11], [12, -24], [14, -8]], v.body, OL(), 2.4);
  D.fillEll(ctx, 0, 0, 17, 15, v.body, OL());
  D.fillEll(ctx, 13, 3, 9, 7, U.shade(v.body, -0.12), OL(), 2.4);
  D.circle(ctx, 10, 3, 1.8, '#a0455e'); D.circle(ctx, 16, 3, 1.8, '#a0455e');
  eyes(ctx, -5, 5, -4, 3.6, a);
  mouth(ctx, 8, 11, a.talk, 4);
  D.cheek(ctx, -9, 3, 3.5);
  ctx.restore();
  ctx.restore();
}

/* ===== SHEEP ===== */
function drawSheep(ctx, v, a) {
  const wool = '#fdf6e3', L = { hipBack: -18, hipFront: 16, hipY: -20, legLen: 20, legW: 6.5, color: '#3d3d3d', hoof: null };
  const bob = bobOf(a), slp = a.sleeping;
  const bounce = a.action && a.action.type === 'bounce' ? Math.abs(Math.sin(a.action.p * Math.PI * 3)) * 22 : 0;
  ctx.save();
  D.shadow(ctx, 0, 0, 36, 10);
  ctx.translate(0, -bounce);
  if (slp) ctx.translate(0, 12);
  if (!slp) quadLegs(ctx, a, L, 'far');
  ctx.translate(0, -bob);
  // wool body: puffs
  const puffs = [[-26, -34, 11], [-18, -46, 12], [-4, -52, 12], [12, -50, 12], [24, -42, 11], [26, -30, 10], [-26, -24, 9], [0, -22, 10], [16, -24, 9]];
  puffs.forEach(([x, y, r]) => D.circle(ctx, x, y, r, wool, OL(), 2.4));
  D.fillEll(ctx, 0, -36, 30, 20, wool);
  D.circle(ctx, -30, -30, 6, wool, OL(), 2.2); // tail puff
  ctx.translate(0, bob);
  if (slp) foldedLegs(ctx, -20, 8, -18, 6, '#3d3d3d'); else quadLegs(ctx, a, L, 'near');
  ctx.translate(0, -bob);
  // head
  ctx.save();
  if (a.graze) { ctx.translate(30, -26); ctx.rotate(0.8); } else if (slp) { ctx.translate(28, -38); ctx.rotate(0.3); } else ctx.translate(30, -46);
  D.fillEll(ctx, -12, -2, 7, 4, v.face, OL(), 2.2, 0.3); D.fillEll(ctx, 10, -6, 7, 4, v.face, OL(), 2.2, -0.3); // ears
  D.fillEll(ctx, 0, 0, 13, 12, v.face, OL());
  D.circle(ctx, -6, -11, 6, wool, OL(), 2); D.circle(ctx, 3, -13, 6, wool, OL(), 2); // wool tuft
  eyes(ctx, -4, 6, -2, 3.5, a);
  D.circle(ctx, 8, 6, 2, '#222'); mouth(ctx, 5, 9, a.talk, 4);
  ctx.restore();
  ctx.restore();
}

/* ===== GOAT ===== */
function drawGoat(ctx, v, a) {
  const L = { hipBack: -20, hipFront: 18, hipY: -24, legLen: 24, legW: 7, color: v.body, hoof: '#4a2f1a', hoofH: 6 };
  const bob = bobOf(a), slp = a.sleeping;
  const bounce = a.action && a.action.type === 'bounce' ? Math.abs(Math.sin(a.action.p * Math.PI * 3)) * 26 : 0;
  ctx.save();
  D.shadow(ctx, 0, 0, 36, 10);
  ctx.translate(0, -bounce);
  if (slp) ctx.translate(0, 16);
  if (!slp) quadLegs(ctx, a, L, 'far');
  ctx.translate(0, -bob);
  D.poly(ctx, [[-30, -46], [-40, -58], [-26, -52]], v.body, OL(), 2.4); // tail up
  D.fillEll(ctx, 0, -42, 33, 18, v.body, OL());
  D.fillEll(ctx, 4, -32, 18, 5, 'rgba(255,255,255,0.3)');
  ctx.translate(0, bob);
  if (slp) foldedLegs(ctx, -22, 8, -22, 7, v.body); else quadLegs(ctx, a, L, 'near');
  ctx.translate(0, -bob);
  // bell
  D.circle(ctx, 30, -46, 5, '#ffd23f', OL(), 2);
  // head
  ctx.save();
  if (a.graze) { ctx.translate(34, -30); ctx.rotate(0.8); } else if (slp) { ctx.translate(34, -44); ctx.rotate(0.3); } else ctx.translate(36, -60);
  // horns (curving back)
  const horn = (x0, y0) => { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(x0 - 4, y0 - 22, x0 - 20, y0 - 22); ctx.quadraticCurveTo(x0 - 8, y0 - 18, x0 - 6, y0 - 4); ctx.closePath(); ctx.fillStyle = '#d4b06a'; ctx.fill(); ctx.strokeStyle = OL(); ctx.lineWidth = 2.2; ctx.lineJoin = 'round'; ctx.stroke(); };
  horn(-2, -10); horn(6, -11);
  D.fillEll(ctx, -12, -2, 8, 4, v.body, OL(), 2.2, 0.6); D.fillEll(ctx, 8, -6, 8, 4, v.body, OL(), 2.2, -0.6); // ears
  D.fillEll(ctx, 2, 0, 16, 13, v.body, OL());
  D.poly(ctx, [[8, 10], [12, 20], [16, 9]], v.body, OL(), 2.2); // beard
  D.circle(ctx, 15, 3, 2, '#333');
  eyes(ctx, -3, 7, -3, 3.8, a);
  D.cheek(ctx, -8, 3, 3);
  mouth(ctx, 10, 8, a.talk, 3.5);
  ctx.restore();
  ctx.restore();
}

/* ===== DOG ===== */
function drawDog(ctx, v, a) {
  const L = { hipBack: -18, hipFront: 16, hipY: -22, legLen: 22, legW: 8, color: v.body, hoof: null };
  const bob = bobOf(a), slp = a.sleeping;
  const spin = a.action && a.action.type === 'spin';
  ctx.save();
  D.shadow(ctx, 0, 0, 34, 9);
  if (spin) { const p = a.action.p; ctx.translate(Math.sin(p * Math.PI * 4) * 12, -Math.abs(Math.sin(p * Math.PI * 4)) * 10); }
  if (slp) ctx.translate(0, 14);
  if (!slp) quadLegs(ctx, { ...a, run: true }, L, 'far');
  ctx.translate(0, -bob);
  // tail (wagging)
  ctx.save(); ctx.translate(-28, -34);
  const wag = (a.moving || a.happy || spin) ? Math.sin(a.t * 16) * 0.5 : Math.sin(a.t * 3) * 0.15;
  ctx.rotate(-0.9 + wag);
  D.fillRR(ctx, -4, -22, 8, 26, 4, v.body, OL(), 2.4); D.fillRR(ctx, -3, -22, 6, 8, 3, v.patch, null);
  ctx.restore();
  D.fillEll(ctx, 0, -36, 30, 15, v.body, OL());
  D.fillEll(ctx, 6, -28, 14, 6, v.patch, null); // belly
  ctx.translate(0, bob);
  if (slp) foldedLegs(ctx, -20, 8, -20, 7, v.body); else quadLegs(ctx, { ...a, run: true }, L, 'near');
  ctx.translate(0, -bob);
  // collar
  D.fillRR(ctx, 20, -48, 12, 5, 2, '#e74c3c', OL(), 1.6);
  // head
  ctx.save();
  if (slp) { ctx.translate(30, -34); ctx.rotate(0.35); } else if (a.graze) { ctx.translate(30, -30); ctx.rotate(0.6); } else ctx.translate(30, -52);
  D.fillEll(ctx, 0, 0, 16, 14, v.body, OL());
  D.fillEll(ctx, -12, 4, 6, 12, U.shade(v.body, -0.3), OL(), 2.4, 0.2); // ear
  D.fillEll(ctx, 9, 4, 10, 8, v.patch, OL(), 2.2); // muzzle
  D.circle(ctx, 16, 1, 3.2, '#222');
  if (a.happy || spin) { D.fillEll(ctx, 8, 12, 4, 6, '#ff7675', OL(), 1.6); }
  mouth(ctx, 10, 9, a.talk, 4);
  eyes(ctx, -3, 6, -4, 3.6, a);
  D.cheek(ctx, -8, 3, 3);
  ctx.restore();
  ctx.restore();
}

/* ===== CAT / KITTEN ===== */
function drawCat(ctx, v, a) {
  const L = { hipBack: -14, hipFront: 13, hipY: -16, legLen: 16, legW: 6, color: v.body, hoof: null };
  const bob = bobOf(a), slp = a.sleeping;
  const pounce = a.action && a.action.type === 'pounce' ? Math.sin(Math.min(1, a.action.p * 1.5) * Math.PI) : 0;
  ctx.save();
  D.shadow(ctx, 0, 0, 26, 7);
  if (pounce) ctx.translate(pounce * 14, -pounce * 18);
  if (slp) ctx.translate(0, 10);
  if (!slp) quadLegs(ctx, a, L, 'far');
  ctx.translate(0, -bob);
  // tail
  ctx.save(); ctx.translate(-22, -26);
  const sw = Math.sin(a.t * 2.5) * 5;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-14, -2, -18 + sw, -20, -8 + sw, -30);
  ctx.strokeStyle = OL(); ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.stroke(); ctx.strokeStyle = v.body; ctx.lineWidth = 5; ctx.stroke();
  if (v.stripes) { ctx.strokeStyle = v.stripes; ctx.lineWidth = 5; ctx.setLineDash([3, 6]); ctx.stroke(); ctx.setLineDash([]); }
  ctx.restore();
  D.fillEll(ctx, 0, -28, 25, 13, v.body, OL());
  if (v.stripes) { ctx.save(); D.ell(ctx, 0, -28, 25, 13); ctx.clip(); ctx.strokeStyle = v.stripes; ctx.lineWidth = 3.5; [-12, -2, 8].forEach(x => { ctx.beginPath(); ctx.moveTo(x, -41); ctx.quadraticCurveTo(x + 4, -30, x, -22); ctx.stroke(); }); ctx.restore(); }
  if (v.patch) D.fillEll(ctx, 6, -22, 12, 5, v.patch);
  ctx.translate(0, bob);
  if (slp) foldedLegs(ctx, -16, 6, -14, 6, v.body); else quadLegs(ctx, a, L, 'near');
  ctx.translate(0, -bob);
  // head
  ctx.save();
  if (slp) { ctx.translate(22, -30); ctx.rotate(0.3); } else ctx.translate(24, -42);
  D.poly(ctx, [[-13, -4], [-11, -18], [-3, -9]], v.body, OL(), 2.2); D.poly(ctx, [[3, -9], [10, -18], [12, -4]], v.body, OL(), 2.2);
  D.poly(ctx, [[-10, -6], [-9.5, -14], [-5, -9]], '#f8a5c2'); D.poly(ctx, [[4.5, -9], [9, -14], [9.5, -6]], '#f8a5c2');
  D.fillEll(ctx, 0, 0, 14, 12, v.body, OL());
  if (v.patch) D.fillEll(ctx, 4, 4, 8, 6, v.patch);
  D.fillEll(ctx, 6, 5, 6, 4, '#fff', null); D.poly(ctx, [[3, 2], [9, 2], [6, 5]], '#f78fb3', OL(), 1.4);
  // whiskers
  ctx.strokeStyle = OL(); ctx.lineWidth = 1.2; [-2, 2].forEach(dy => { D.line(ctx, 8, 5 + dy, 20, 3 + dy * 2, OL(), 1.2); D.line(ctx, -2, 5 + dy, -14, 3 + dy * 2, OL(), 1.2); });
  const closed = a.sleeping || a.blink;
  [-4, 6].forEach(x => { if (closed) D.eye(ctx, x, -3, 3.2, { closed: true }); else { D.circle(ctx, x, -3, 3.4, '#a3e635', OL(), 1.6); D.fillRR(ctx, x - 1, -6, 2, 6, 1, '#222'); } });
  mouth(ctx, 6, 9, a.talk, 3);
  ctx.restore();
  ctx.restore();
}

/* ===== CHICKEN / ROOSTER ===== */
function drawChicken(ctx, v, a, rooster) {
  const body = v.body, slp = a.sleeping;
  const flap = a.action && (a.action.type === 'flap' || a.action.type === 'crow') ? Math.abs(Math.sin(a.action.p * Math.PI * 5)) : 0;
  const hop = a.action && a.action.type === 'flap' ? Math.sin(Math.min(1, a.action.p * 1.2) * Math.PI) * 18 : 0;
  const bob = a.moving ? Math.abs(Math.sin(a.phase * 1.4)) * 2 : 0;
  ctx.save();
  D.shadow(ctx, 0, 0, 18, 6);
  ctx.translate(0, -hop);
  if (slp) ctx.translate(0, 12);
  if (!slp) birdLegs(ctx, a, rooster ? '#f1c40f' : '#ff9f43', -4, 5, -16);
  ctx.translate(0, -bob);
  // tail
  ctx.save(); ctx.translate(-14, -30);
  if (rooster) {
    ['#145a32', '#1e8449', '#0e6655', '#2c3e50'].forEach((c, i) => {
      ctx.beginPath(); ctx.moveTo(0, 4); ctx.bezierCurveTo(-8, -6 - i * 4, -22 - i * 3, -18 - i * 6, -30 - i * 2, -6 - i * 8);
      ctx.strokeStyle = OL(); ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.stroke(); ctx.strokeStyle = c; ctx.lineWidth = 5; ctx.stroke();
    });
  } else {
    [[-0.9, 0], [-0.55, -4], [-0.2, -6]].forEach(([r, dy]) => D.fillEll(ctx, -6, dy, 12, 5, U.shade(body, -0.12), OL(), 2.2, r));
  }
  ctx.restore();
  // body
  D.fillEll(ctx, 0, -26, 17, 13, body, OL());
  if (rooster) D.fillEll(ctx, 8, -30, 9, 9, '#f5b041', null); // hackles
  // wing
  ctx.save(); ctx.translate(2, -30); ctx.rotate(-flap * 0.9);
  D.fillEll(ctx, -4, 3, 10, 6, U.shade(body, -0.14), OL(), 2.2, 0.15);
  ctx.restore();
  // head
  ctx.save();
  if (slp) { ctx.translate(8, -30); ctx.rotate(0.6); }
  else if (a.peck) { ctx.translate(16, -22); ctx.rotate(0.9); }
  else if (a.action && a.action.type === 'crow') { ctx.translate(12, -46); ctx.rotate(-0.5); }
  else ctx.translate(14, -42);
  // comb
  const combN = rooster ? 4 : 3;
  for (let i = 0; i < combN; i++) D.circle(ctx, -6 + i * 4.5, -9 - Math.sin(i / (combN - 1) * Math.PI) * 4, rooster ? 4.5 : 3.5, '#e74c3c', OL(), 2);
  D.circle(ctx, 0, 0, rooster ? 10 : 8.5, body, OL());
  D.fillEll(ctx, 6, 8, 3.5, 5, '#e74c3c', OL(), 1.6); // wattle
  D.poly(ctx, [[6, -3], [17, 0], [6, 3]], '#ff9f43', OL(), 2); // beak
  if (a.talk > 0.05) D.poly(ctx, [[6, 1], [15, 4 + a.talk * 3], [6, 4]], '#ff9f43', OL(), 1.6);
  D.eye(ctx, 1, -2, 3, { closed: a.sleeping || a.blink });
  D.cheek(ctx, -3, 3, 2.5);
  ctx.restore();
  ctx.restore();
}

/* ===== DUCK ===== */
function drawDuck(ctx, v, a) {
  const slp = a.sleeping, body = v.body, small = v.duckling;
  const dive = a.action && a.action.type === 'dive' ? Math.sin(Math.min(1, a.action.p) * Math.PI) : 0;
  const bob = a.moving ? Math.abs(Math.sin(a.phase * 1.4)) * 2 : Math.sin(a.t * 2) * 1;
  ctx.save();
  if (small) ctx.scale(0.75, 0.75);
  if (a.inWater) {
    // ripple ring
    D.fillEll(ctx, 0, 0, 26 + Math.sin(a.t * 3) * 2, 8, 'rgba(255,255,255,0.35)');
    D.fillEll(ctx, 0, 0, 20, 5, 'rgba(255,255,255,0.35)');
    ctx.translate(0, 8);
  } else {
    D.shadow(ctx, 0, 0, 18, 6);
    if (!slp) birdLegs(ctx, a, v.bill, -4, 5, -14);
    if (slp) ctx.translate(0, 10);
  }
  ctx.translate(0, -bob);
  if (dive) { ctx.translate(6, 0); ctx.rotate(dive * 1.3); ctx.translate(-6, 0); }
  // tail
  D.poly(ctx, [[-14, -22], [-26, -32], [-16, -18]], body, OL(), 2.2);
  D.fillEll(ctx, 0, -20, 18, 12, body, OL());
  D.fillEll(ctx, -2, -22, 10, 5, U.shade(body, -0.12), OL(), 2, 0.2); // wing
  // neck + head
  ctx.save();
  if (slp) { ctx.translate(6, -26); ctx.rotate(0.9); } else ctx.translate(12, -36);
  D.fillRR(ctx, -6, -2, 12, 18, 6, body, null);
  D.circle(ctx, 0, -2, 9.5, body, OL());
  D.fillRR(ctx, 6, -3, 14, 6, 3, v.bill, OL(), 2);
  if (a.talk > 0.05) D.fillRR(ctx, 6, 1, 12, 3 + a.talk * 3, 2, U.shade(v.bill, -0.2), OL(), 1.6);
  D.eye(ctx, 1, -4, 3, { closed: a.sleeping || a.blink });
  D.cheek(ctx, -4, 1, 2.5);
  ctx.restore();
  ctx.restore();
}

/* ===== OWL ===== */
function drawOwl(ctx, v, a) {
  const hoot = a.action && a.action.type === 'hoot' ? Math.abs(Math.sin(a.action.p * Math.PI * 2)) : 0;
  const closed = a.blink;
  ctx.save();
  // feet on branch
  D.line(ctx, -8, 0, -8, -6, '#ff9f43', 3); D.line(ctx, 8, 0, 8, -6, '#ff9f43', 3);
  ctx.translate(0, -hoot * 3);
  ctx.scale(1 + hoot * 0.08, 1 - hoot * 0.05);
  // wings
  D.fillEll(ctx, -16, -26, 8, 20, U.shade(v.body, -0.25), OL(), 2.4, 0.15);
  D.fillEll(ctx, 16, -26, 8, 20, U.shade(v.body, -0.25), OL(), 2.4, -0.15);
  D.fillEll(ctx, 0, -26, 17, 24, v.body, OL());
  D.fillEll(ctx, 0, -22, 11, 16, '#e8c98f', null);
  ctx.strokeStyle = '#8d6748'; ctx.lineWidth = 1.5;
  for (let r = 0; r < 3; r++) for (let c = -1; c <= 1; c++) { const x = c * 6, y = -30 + r * 8; ctx.beginPath(); ctx.moveTo(x - 3, y); ctx.lineTo(x, y + 3); ctx.lineTo(x + 3, y); ctx.stroke(); }
  // head
  D.poly(ctx, [[-16, -56], [-14, -72], [-4, -60]], v.body, OL(), 2.4); D.poly(ctx, [[4, -60], [14, -72], [16, -56]], v.body, OL(), 2.4);
  D.circle(ctx, 0, -50, 18, v.body, OL());
  D.circle(ctx, -7, -50, 8.5, '#e8c98f'); D.circle(ctx, 7, -50, 8.5, '#e8c98f');
  if (a.night && !closed) { D.circle(ctx, -7, -50, 9, 'rgba(255,230,120,0.35)'); D.circle(ctx, 7, -50, 9, 'rgba(255,230,120,0.35)'); }
  [-7, 7].forEach(x => { if (closed) D.eye(ctx, x, -50, 6, { closed: true }); else { D.circle(ctx, x, -50, 6.5, '#ffd23f', OL(), 1.8); D.circle(ctx, x, -50, 3.2, '#222'); D.circle(ctx, x - 1.5, -51.5, 1.2, '#fff'); } });
  D.poly(ctx, [[-3, -46], [3, -46], [0, -40]], '#ff9f43', OL(), 1.6);
  ctx.restore();
}

/* ===== FROG ===== */
function drawFrog(ctx, v, a) {
  const jump = a.action && a.action.type === 'jump' ? Math.sin(Math.min(1, a.action.p) * Math.PI) : 0;
  ctx.save();
  D.shadow(ctx, 0, 0, 20, 5, 0.12);
  ctx.translate(0, -jump * 40);
  const stretch = jump > 0.2;
  // back legs
  D.fillEll(ctx, -14, -6, 9, 6, U.shade(v.body, -0.15), OL(), 2.2, stretch ? 0.8 : 0.3);
  D.fillEll(ctx, 14, -6, 9, 6, U.shade(v.body, -0.15), OL(), 2.2, stretch ? -0.8 : -0.3);
  D.fillEll(ctx, 0, -12, 17, 12, v.body, OL());
  D.fillEll(ctx, 0, -8, 11, 6, '#c9f4a3', null);
  D.circle(ctx, -8, -20, 3, U.shade(v.body, -0.2)); D.circle(ctx, 6, -16, 2.2, U.shade(v.body, -0.2));
  // front legs
  D.fillEll(ctx, -8, -3, 4, 3, v.body, OL(), 1.8); D.fillEll(ctx, 8, -3, 4, 3, v.body, OL(), 1.8);
  // eyes
  [-8, 8].forEach(x => { D.circle(ctx, x, -24, 6, v.body, OL(), 2.2); D.eye(ctx, x, -24, 4, { closed: a.blink }); });
  // throat when talking
  if (a.talk > 0.05) D.circle(ctx, 0, -6, 4 + a.talk * 5, '#e6f7c9', OL(), 1.6);
  ctx.beginPath(); ctx.arc(0, -16, 9, Math.PI * 0.1, Math.PI * 0.9); ctx.strokeStyle = OL(); ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
}

/* ===== dispatcher ===== */
function drawSpecies(ctx, species, variant, a) {
  switch (species) {
    case 'cow': return drawCow(ctx, variant, a);
    case 'horse': return drawHorse(ctx, variant, a);
    case 'pig': return drawPig(ctx, variant, a);
    case 'sheep': return drawSheep(ctx, variant, a);
    case 'goat': return drawGoat(ctx, variant, a);
    case 'dog': return drawDog(ctx, variant, a);
    case 'cat': case 'kitten': return drawCat(ctx, variant, a);
    case 'chicken': return drawChicken(ctx, variant, a, false);
    case 'rooster': return drawChicken(ctx, variant, a, true);
    case 'duck': return drawDuck(ctx, variant, a);
    case 'owl': return drawOwl(ctx, variant, a);
    case 'frog': return drawFrog(ctx, variant, a);
  }
}

/* ===== Animal entity (shared by farm + barn) ===== */
class Animal {
  constructor(species, x, y, opts = {}) {
    this.species = species; this.cfg = SPECIES[species];
    this.variant = this.cfg.variants[(opts.variant != null ? opts.variant : U.randInt(0, this.cfg.variants.length - 1)) % this.cfg.variants.length];
    this.x = x; this.y = y; this.dir = opts.dir || (Math.random() < 0.5 ? 1 : -1);
    this.scale = (this.cfg.scale || 1) * (opts.scale || 1);
    this.zone = opts.zone || null;      // {x1,y1,x2,y2} or function -> point
    this.home = { x, y };
    this.state = 'idle'; this.stateT = U.rand(0.5, 3); this.target = null;
    this.phase = U.rand(0, 6.28); this.moving = false; this.run = false;
    this.sleeping = !!opts.sleeping; this.graze = false; this.peck = false; this.happy = false;
    this.talkT = 0; this.blinkT = U.rand(2, 5); this.blink = false;
    this.action = null; this.bubble = null;
    this.hidden = false; this.inWater = false; this.wakeT = 0;
    this.id = Animal._id = (Animal._id || 0) + 1;
    this.sortY = y; this.hitPad = (opts.hitPad || 8) + (IS_TOUCH ? 8 : 0); // chubby-finger friendly
    this.egg = null; this.mudT = 0; this.zAcc = U.rand(0, 2);
    this.counted = 0; this.glow = 0;
    this.speedMul = 1;
  }
  get name() { return this.cfg.name; }
  bounds() {
    const s = this.scale, w = this.cfg.w * s, h = this.cfg.h * s * (this.sleeping ? 0.6 : 1);
    return { x: this.x - w / 2 - this.hitPad, y: this.y - h - this.hitPad, w: w + this.hitPad * 2, h: h + this.hitPad * 2 };
  }
  hit(px, py) { if (this.hidden) return false; const b = this.bounds(); return px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h; }
  // distance from a point to the animal's visual centre (used to pick between overlapping animals)
  hitDist(px, py) { const b = this.bounds(); return Math.hypot(px - (b.x + b.w / 2), py - (b.y + b.h / 2)); }
  static pickHit(list, px, py) {
    let best = null, bd = 1e9;
    for (const a of list) { if (a.hidden || !a.hit(px, py)) continue; const d = a.hitDist(px, py) - a.sortY * 0.001; if (d < bd) { bd = d; best = a; } }
    return best;
  }
  headPos() { const [hx, hy] = this.cfg.head, k = this.sleeping ? 0.72 : 1; return { x: this.x + this.dir * hx * this.scale * 0.6, y: this.y - hy * this.scale * k }; }
  say(text, dur = 1.8) { this.bubble = { text, t: 0, dur }; }
  talk(d = 1) { this.talkT = Math.max(this.talkT, d); }
  doTrick() {
    const type = this.cfg.trick;
    const durs = { jump: 2.2, rear: 2.6, roll: 2.0, bounce: 1.6, spin: 2.0, pounce: 1.6, flap: 1.4, crow: 1.8, dive: 1.6, hoot: 1.6 };
    this.action = { type, t: 0, dur: durs[type] || 1.5, p: 0 };
    this.happy = true; this.graze = false; this.peck = false; this.target = null; this.moving = false;
    if (type === 'jump' && this.species === 'cow') this.actionAfter = () => { this.state = 'graze'; this.stateT = 3; this.graze = true; };
    if (type === 'flap') this.egg = { t: 0, x: this.x - this.dir * 20, y: this.y + 2 };
    return this.action;
  }
  // wander AI in a zone
  update(dt, world) {
    this.blinkT -= dt;
    if (this.blinkT <= 0) { this.blink = !this.blink; this.blinkT = this.blink ? 0.12 : U.rand(2, 5); }
    if (this.talkT > 0) this.talkT -= dt;
    if (this.bubble) { this.bubble.t += dt; if (this.bubble.t > this.bubble.dur) this.bubble = null; }
    if (this.egg) { this.egg.t += dt; if (this.egg.t > 6) this.egg = null; }
    if (this.wakeT > 0) { this.wakeT -= dt; if (this.wakeT <= 0) { this.sleeping = true; this.happy = false; } }
    if (this.action) {
      this.action.t += dt; this.action.p = this.action.t / this.action.dur;
      // some tricks move the animal
      if (this.action.type === 'rear' && this.action.p > 0.55 && this.zone) {
        this.moving = true; this.run = true; this.phase += dt * 22;
        this.x += this.dir * 160 * dt;
        const z = this.zone;
        if (typeof z !== 'function' && (this.x < z.x1 + 20 || this.x > z.x2 - 20)) this.dir *= -1;
        this.x = U.clamp(this.x, (z.x1 || 0) + 10, (z.x2 || 1280) - 10);
      } else if (this.action.type === 'spin') {
        this.moving = true; this.run = true; this.phase += dt * 22;
        if (Math.floor(this.action.t * 4) !== Math.floor((this.action.t - dt) * 4)) this.dir *= -1;
      } else if (this.action.type === 'roll' && world && world.mud) {
        // splash particles handled by scene
      }
      if (this.action.p >= 1) {
        this.action = null; this.happy = false; this.moving = false; this.run = false;
        if (this.actionAfter) { this.actionAfter(); this.actionAfter = null; } else { this.state = 'idle'; this.stateT = 1; }
      }
      return;
    }
    if (this.hidden || this.sleeping || !this.zone) { this.moving = false; return; }
    if (world && world.goHome && world.door) { // walk to barn door
      this.graze = false; this.peck = false; this.state = 'walk'; this.target = { x: world.door.x + (this.id % 5 - 2) * 8, y: world.door.y };
      this.speedMul = 1.6;
      if (this._step(dt)) { this.hidden = true; if (world.onArrive) world.onArrive(this); }
      return;
    }
    this.speedMul = 1;
    this.stateT -= dt;
    if (this.state === 'walk') {
      if (this._step(dt) || this.stateT < -8) { this.state = 'idle'; this.stateT = U.rand(1, 4); this.moving = false; }
    } else {
      this.moving = false;
      if (this.stateT <= 0) this._pickState();
    }
  }
  _pickState() {
    const r = Math.random(), s = this.species;
    this.graze = false; this.peck = false;
    if (r < 0.55) { // walk
      this.target = this._randomPoint(); this.state = 'walk'; this.stateT = 0;
    } else if (r < 0.85 && ['cow', 'sheep', 'horse', 'goat'].includes(s)) { this.state = 'graze'; this.graze = true; this.stateT = U.rand(2.5, 5); }
    else if (r < 0.85 && ['chicken', 'rooster', 'duck'].includes(s) && !this.inWater) { this.state = 'peck'; this.peck = true; this.stateT = U.rand(1, 2.5); }
    else if (r < 0.9 && s === 'dog') { this.happy = true; this.state = 'idle'; this.stateT = 2; setTimeout(() => this.happy = false, 2000); }
    else { this.state = 'idle'; this.stateT = U.rand(1, 3.5); }
  }
  _randomPoint() {
    const z = this.zone;
    if (typeof z === 'function') return z(this);
    return { x: U.rand(z.x1, z.x2), y: U.rand(z.y1, z.y2) };
  }
  _step(dt) {
    if (!this.target) return true;
    const dx = this.target.x - this.x, dy = this.target.y - this.y, d = Math.hypot(dx, dy);
    const sp = this.cfg.speed * this.speedMul;
    if (d < Math.max(4, sp * dt)) { this.x = this.target.x; this.y = this.target.y; return true; }
    this.x += dx / d * sp * dt; this.y += dy / d * sp * dt;
    if (Math.abs(dx) > 2) this.dir = dx > 0 ? 1 : -1;
    this.moving = true; this.phase += dt * sp * 0.22;
    return false;
  }
  animState(t, extra = {}) {
    return { t: t + this.id * 0.37, dir: this.dir, moving: this.moving, run: this.run, phase: this.phase, sleeping: this.sleeping, graze: this.graze, peck: this.peck, happy: this.happy,
      talk: this.talkT > 0 ? 0.6 + 0.4 * Math.abs(Math.sin(t * 18)) : 0, blink: this.blink, inWater: this.inWater, action: this.action, ...extra };
  }
  draw(ctx, t, extra = {}) {
    if (this.hidden) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.glow > 0) { ctx.save(); ctx.globalAlpha = this.glow; D.fillEll(ctx, 0, -this.cfg.h * this.scale * 0.45, this.cfg.w * this.scale * 0.6, this.cfg.h * this.scale * 0.6, 'rgba(255,240,120,0.45)'); ctx.restore(); }
    ctx.scale(this.dir * this.scale, this.scale);
    drawSpecies(ctx, this.species, this.variant, this.animState(t, extra));
    ctx.restore();
    if (this.egg) {
      const e = this.egg; ctx.save(); ctx.globalAlpha = e.t > 5 ? 6 - e.t : 1;
      D.fillEll(ctx, e.x, e.y - 6, 7, 9, '#fffaf0', OL(), 2); D.fillEll(ctx, e.x - 2, e.y - 9, 2, 3, 'rgba(255,255,255,0.8)');
      ctx.restore();
    }
  }
  drawBubble(ctx) {
    if (!this.bubble || this.hidden) return;
    const b = this.bubble, hp = this.headPos();
    const s = b.t < 0.2 ? U.easeOut(b.t / 0.2) : b.t > b.dur - 0.25 ? Math.max(0, (b.dur - b.t) / 0.25) : 1;
    D.bubble(ctx, hp.x, hp.y - 4, b.text, s);
  }
}
