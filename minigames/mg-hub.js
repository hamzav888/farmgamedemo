/* ---------- Game picker ----------
   Builds the grid of game cards, each with a LIVE preview: the game is
   instantiated against a silent stand-in host, posed, and rendered once with
   its own render() — so the picture on the card is always the real game, not
   a screenshot that goes stale. Used by both the standalone hub page and the
   picker inside the main farm game. */
const MiniHub = {
  // a host that draws but never speaks, scores or schedules
  _silent(host) {
    const s = Object.create(host);
    Object.assign(s, {
      game: null, t: 0, tweens: [], particles: [], confetti: [], _timers: [], _down: null,
      narrate() { }, showCard() { }, hideCard() { }, addStars() { }, celebrate() { },
      sparkle() { }, hearts() { }, burst() { }, crumbs() { },
      later() { return 0; },
      tween(obj, to, dur, o = {}) { Object.assign(obj, to); if (o.onDone) o.onDone(); }   // land instantly
    });
    return s;
  },
  preview(GameClass, host, w = 400, h = 250) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    try {
      const s = MiniHub._silent(host);
      const g = new GameClass(s); s.game = g;
      const realPlay = Sfx.play, realPluck = Sfx.pluck, realNoise = Sfx.noise;
      Sfx.play = () => { }; Sfx.pluck = () => { }; Sfx.noise = () => { };   // posing must be silent too
      try {
        g.enter();
        if (GameClass.pose) GameClass.pose(g);
        for (let i = 0; i < 24; i++) g.update(1 / 30);
        const big = document.createElement('canvas'); big.width = 1280; big.height = 800;
        g.render(big.getContext('2d'));
        ctx.drawImage(big, 0, 0, w, h);
      } finally { Sfx.play = realPlay; Sfx.pluck = realPluck; Sfx.noise = realNoise; if (g.exit) g.exit(); }
    } catch (e) {
      ctx.fillStyle = '#7ccc5a'; ctx.fillRect(0, 0, w, h);
      ctx.font = `${h * 0.5}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(GameClass.emoji, w / 2, h / 2);
    }
    return c;
  },
  buildCards(grid, games, host, onPick) {
    grid.innerHTML = '';
    games.forEach(G => {
      const b = document.createElement('button'); b.className = 'game-card'; b.type = 'button';
      const pv = MiniHub.preview(G, host); pv.className = 'gc-preview'; b.appendChild(pv);
      const row = document.createElement('span'); row.className = 'gc-row';
      const em = document.createElement('span'); em.className = 'gc-emoji'; em.textContent = G.emoji;
      const nm = document.createElement('span'); nm.className = 'gc-name'; nm.textContent = G.title;
      row.append(em, nm);
      const bl = document.createElement('span'); bl.className = 'gc-blurb'; bl.textContent = G.blurb;
      b.append(row, bl);
      b.addEventListener('click', () => onPick(G));
      grid.appendChild(b);
    });
  }
};
