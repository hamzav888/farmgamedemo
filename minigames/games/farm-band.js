/* ---------- 🎵 Farm Band ----------
   Five animals on five coloured drums. Every tap plays a banjo note (pentatonic,
   so anything a toddler bashes out sounds like a tune) plus a whisper of the
   animal's own call. That alone is the game for a one-year-old.
   Tap the rooster and he plays a short tune for you to copy — Simon, but gentle:
   a mistake just replays it. The tune grows from two notes to five.
   Teaches: cause and effect, listening, sequence memory, rhythm. */
class FarmBand {
  static id = 'band'; static title = 'Farm Band'; static emoji = '🎵';
  static blurb = "Make music, then copy the rooster's tune";
  static SLOTS = [['cow', 60, '#ff6b6b'], ['pig', 62, '#ff9f43'], ['sheep', 64, '#ffd23f'], ['dog', 67, '#48c774'], ['chicken', 69, '#54a0ff']];
  static pose(g) {
    g.slots[1].press = 0.6; g.slots[1].hop = 0.5; g.slots[3].glow = 0.8;
    g.notes.push({ x: g.slots[1].x, y: 360, t: 0.3, color: g.slots[1].color }, { x: g.slots[3].x + 20, y: 330, t: 0.5, color: g.slots[3].color });
  }

  constructor(h) {
    this.h = h; this.t = 0;
    this.bg = MiniBG.field(1280, 800, { seed: 13 });
    this.slots = []; this.notes = []; this.mode = 'free'; this.seq = []; this.pos = 0; this.len = 2;
    this.rooster = null; this.freeTaps = 0; this.timers = [];
  }
  enter() {
    Sfx.setMusicLevel(0.25);   // the child is the music here; the song sits right back
    this.slots = FarmBand.SLOTS.map(([sp, midi, color], i) => {
      const x = 250 + i * 195;
      const a = this.h.makeAnimal(sp, x, 520, { variant: 0, dir: 1, scale: sp === 'chicken' ? 1.6 : sp === 'cow' ? 1.0 : 1.15 });
      a.hitPad = 30;
      return { sp, midi, color, x, y: 520, a, press: 0, glow: 0, hop: 0 };
    });
    this.rooster = this.h.makeAnimal('rooster', 1150, 572, { dir: -1, scale: 1.5 }); this.rooster.hitPad = 30;
    this.h.narrate('Welcome to the farm band! Tap the animals to make music. Tap the rooster when you want to copy his tune!');
  }
  _later(fn, ms) { this.timers.push(this.h.later(fn, ms)); }

  update(dt) {
    this.t += dt;
    for (const s of this.slots) { s.a.update(dt, {}); s.press = Math.max(0, s.press - dt * 5); s.glow = Math.max(0, s.glow - dt * 2.5); s.hop = Math.max(0, s.hop - dt * 4); }
    this.rooster.update(dt, {});
    for (const n of this.notes) { n.t += dt; n.y -= 60 * dt; n.x += Math.sin(n.t * 4) * 20 * dt; }
    this.notes = this.notes.filter(n => n.t < 1.4);
  }
  _play(s, fromRooster = false) {
    s.press = 1; s.glow = 1; s.hop = 1;
    const f = 440 * Math.pow(2, (s.midi - 69) / 12);
    Sfx.pluck({ f0: f, dur: 1.1, vol: 0.55, bright: true, body: 420 });
    Sfx.pluck({ f0: f * 2, dur: 0.6, vol: 0.12, bright: true });
    s.a.talk(0.5); if (!fromRooster) Sfx.play(s.a.cfg.sound, 0.25, s.x);
    this.notes.push({ x: s.x + U.rand(-30, 30), y: s.y - 150, t: 0, color: s.color });
  }
  _slotAt(x, y) { return this.slots.find(s => s.a.hit(x, y) || (Math.abs(x - s.x) < 80 && Math.abs(y - (s.y + 20)) < 60)); }

  onTap(x, y) {
    if (this.rooster.hit(x, y)) {
      if (this.mode === 'free' || this.mode === 'done') this._startCopy();
      else this.h.animalSpeak(this.rooster, 0.6);
      return;
    }
    const s = this._slotAt(x, y); if (!s) return;
    if (this.mode === 'free') {
      this._play(s); this.freeTaps++;
      if (this.freeTaps === 8) this.h.narrate('Lovely music! Tap the rooster when you want to copy his tune.');
      return;
    }
    if (this.mode !== 'you') return;
    this._play(s);
    if (s === this.seq[this.pos]) {
      this.pos++;
      if (this.pos >= this.seq.length) {
        this.mode = 'done'; this.h.sparkle(640, 420, 16);
        const star = this.len >= 3 ? 1 : 0;
        const grown = this.len < 5;
        this.len = Math.min(5, this.len + 1);
        if (!grown) { this._concert(); return; }
        this.h.celebrate(U.pick(['You did it! Now listen to a longer tune.', 'Perfect! Let\'s try a longer one.']), star, () => this._later(() => this._startCopy(), 600));
      }
    } else {
      this.mode = 'listen'; Sfx.play('oops', 0.5);
      this.h.narrate('Oops! Listen to the rooster again.', { onend: () => this._playSeq() });
    }
  }
  // the whole band plays the five-note tune back together, twice, with confetti
  _concert() {
    this.mode = 'concert'; this.h.sparkle(640, 420, 20); this.h.addStars(2);
    this.h.narrate('You played the whole tune! Now everybody together!', { onend: () => {
      const tune = [...this.seq, ...this.seq];
      tune.forEach((s, i) => this._later(() => {
        this._play(s, true);
        this.slots.forEach(o => { if (o !== s) o.hop = Math.max(o.hop, 0.55); });
        if (i % 3 === 0) this.h.burst(s.x, s.y - 170, 16);
      }, i * 420));
      this._later(() => {
        this.h.animalSpeak(this.rooster, 0.8); this.rooster.doTrick();
        this.len = 2; this.mode = 'free'; this.freeTaps = 8;
        this.h.narrate('What a concert! You are a farm band star! Tap the rooster for a brand new tune.');
      }, tune.length * 420 + 500);
    } });
  }
  _startCopy() {
    this.mode = 'listen'; this.seq = [];
    for (let i = 0; i < this.len; i++) { let s = U.pick(this.slots); if (i && s === this.seq[i - 1] && Math.random() < 0.7) s = U.pick(this.slots); this.seq.push(s); }
    this.h.animalSpeak(this.rooster, 0.7);
    this.h.narrate("Listen to the rooster's tune!", { onend: () => this._playSeq() });
  }
  _playSeq() {
    this.mode = 'listen';
    this.seq.forEach((s, i) => this._later(() => { if (this.mode === 'listen') this._play(s, true); }, i * 620));
    this._later(() => { if (this.mode === 'listen') { this.mode = 'you'; this.pos = 0; this.h.narrate('Your turn!', { rate: 1 }); } }, this.seq.length * 620 + 250);
  }

  render(ctx) {
    const t = this.t; ctx.drawImage(this.bg, 0, 0);
    ctx.save(); ctx.translate(640, 330); ctx.scale(0.78, 0.78); S.barn(ctx, 0, 0, { night: 0, doorOpen: 0 }); ctx.restore();
    // the stage
    D.fillRR(ctx, 110, 470, 1060, 120, 22, '#a5693b', OL()); D.fillRR(ctx, 120, 480, 1040, 100, 16, '#c9895a', null);
    ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.lineWidth = 2;
    for (let x = 160; x < 1160; x += 40) { ctx.beginPath(); ctx.moveTo(x, 484); ctx.lineTo(x, 576); ctx.stroke(); }
    S.hayBale(ctx, 1150, 574, 1.5);
    for (const s of this.slots) {
      ctx.save(); ctx.translate(s.x, s.y + 16); MA.drum(ctx, s.color, s.press);
      if (s.glow > 0) { ctx.globalAlpha = s.glow * 0.8; D.fillEll(ctx, 0, -8, 62, 22, 'rgba(255,255,255,0.8)'); }
      ctx.restore();
    }
    for (const s of this.slots) { ctx.save(); ctx.translate(0, -Math.sin(s.hop * Math.PI) * 26); s.a.draw(ctx, t); ctx.restore(); }
    this.rooster.draw(ctx, t);
    for (const n of this.notes) { ctx.save(); ctx.globalAlpha = Math.max(0, 1 - n.t / 1.4); ctx.translate(n.x, n.y); ctx.scale(1.3, 1.3); MA.note(ctx, n.color); ctx.restore(); }
    this.slots.forEach(s => s.a.drawBubble(ctx)); this.rooster.drawBubble(ctx);
    const label = this.mode === 'free' ? '🎵 Tap the animals to play!' : this.mode === 'listen' ? '👂 Listen...' : this.mode === 'you' ? '👉 Your turn!' : this.mode === 'concert' ? '🎉 Everybody together!' : '⭐';
    D.text(ctx, label, 640, 106, 32, '#fff', { stroke: OL(), lw: 6 });
    if (this.mode === 'you') for (let i = 0; i < this.seq.length; i++) { const x = 640 + (i - (this.seq.length - 1) / 2) * 48; D.circle(ctx, x, 152, 14, i < this.pos ? this.seq[i].color : 'rgba(255,255,255,0.35)', OL(), 2.5); }
    if (this.mode === 'free') {
      if (this.freeTaps === 0 && this.t > 3) MA.ring(ctx, this.slots[2].x, this.slots[2].y - 40, 90, 80, t);
      if (this.freeTaps >= 8) MA.ring(ctx, this.rooster.x, this.rooster.y - 50, 80, 80, t);
    }
  }
  hover(x, y) { return !!(this._slotAt(x, y) || this.rooster.hit(x, y)); }
  exit() { this.timers.forEach(clearTimeout); this.timers = []; Sfx.setMusicLevel(1); }
}
