// main.js: one logic tick, the frame loop, and start-up.

// One logic tick (every TICK_MS). The order here is the order things happen in a tick.
function step() {
  S.tick++; // animation clock: 1 frame per tick
  ageDrops();
  agePopups();
  playerMove();
  if (S.alive) {
    updateCombo();
    updateAttacks();
    stepEnemies();
    updateWaves();
  } else S.alpha = 1;
  if (S.score > S.best) { S.best = S.score; S.newBest = true; }
  hud();
  if (!S.alive) saveProgress();
}

// Runs every display frame. Logic ticks are fixed; drawing is smooth in between.
// If anything throws, the game shows an error screen instead of silently freezing.
function loop(t) {
  if (S.alive && !S.paused && !S.crashed) {
    try {
      if (t - S.last >= TICK_MS) {
        S.last += TICK_MS;
        if (t - S.last >= TICK_MS) S.last = t; // fell far behind (slow device): don't fast-forward
        step();
      }
      if (S.alive) S.alpha = Math.min(1, Math.max(0, (t - S.last) / TICK_MS));
    } catch (err) { console.error(err); S.crashed = err.message || 'error'; }
  }
  if (S.crashed) drawCrash(S.crashed);
  else {
    try { draw(); } catch (err) { console.error(err); S.crashed = err.message || 'error'; }
  }
  requestAnimationFrame(loop);
}

loadProgress();
newRun();
requestAnimationFrame(loop);
