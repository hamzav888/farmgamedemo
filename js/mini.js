/* ---------- Mini-games inside the farm ----------
   MiniScene is the third scene of the main game (farm, barn, mini). It hosts
   the exact same game classes as minigames/index.html, using the main Game for
   the things that belong to the page — narrator, learning card, stars, HUD —
   and the shared MiniFX mixin for everything else. Nothing is duplicated:
   a mini-game played here and on the hub page is byte-for-byte the same code. */
class MiniScene {
  constructor(app) {
    this.app = app;                     // the main Game
    this.ctx = app.ctx;
    this.game = null; this.GameClass = null; this.t = 0;
    this._fxInit();
  }

  /* ----- host interface the games use ----- */
  narrate(text, opts = {}) {
    const g = this.game;
    this.app.narrate(text, { ...opts, onend: () => { if (opts.onend && this.game === g) opts.onend(); } });
  }
  showCard(emoji, name, sub, ms) { this.app.showCardRaw(emoji, name, sub, ms); }
  hideCard() { this.app.hideCard(); }
  addStars(n, x, y) { this.app.addStars(n, x, y); }

  /* ----- lifecycle (the app does the fading and the HUD) ----- */
  start(GameClass) {
    this.stop();
    this.GameClass = GameClass;
    const g = new GameClass(this);
    this.game = g; this.t = 0;
    g.enter();
  }
  stop() {
    this._clearTimers();
    if (this.game && this.game.exit) this.game.exit();
    this.game = null; this.tweens = []; this.particles = []; this.confetti = []; this._down = null;
  }

  update(dt) {
    this.t += dt;
    this._updateTweens(dt); this._updateEffects(dt);
    if (this.game) this.game.update(dt);
  }
  render(ctx) {
    if (!this.game) return;
    ctx.save(); this.game.render(ctx); ctx.restore();
    this._drawEffects(ctx);
  }

  /* ----- input: the app forwards raw pointer events here ----- */
  onDown(x, y, id) { this._ptrDown(x, y, id); }
  onMove(x, y, id) { return this._ptrMove(x, y, id); }
  onUp(x, y) { this._ptrUp(x, y); }
  hover(x, y) { return !!(this.game && this.game.hover && this.game.hover(x, y)); }
}
Object.assign(MiniScene.prototype, MiniFX);
