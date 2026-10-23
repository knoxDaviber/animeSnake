// main.js: one logic tick, the frame loop, and start-up.

// One logic tick (every TICK_MS). The order here is the order things happen in a tick.
function step() {
  S.tick++; // animation clock: 1 frame per tick
  ageDrops();
  agePopups();
  ageBlasts();
  ageZaps();
  playerMove();
  if (S.alive) {
    mergeCheck();       // three identical followers in a row fuse (merge.js)
    updateCombo();
    updateSkills();
    updatePassives();   // Magneto pulls the key toward you
    updateAttacks();
    updateHead();       // the head's weapon (heads.js)
    updateRecruits();   // summoned characters walk in (before enemies move, so enemies can catch them)
    stepEnemies();
    refreshKey();       // puts the next key down unless enough characters are already waiting
    updateWaves();
  } else S.alpha = 1;
  if (S.score > S.best) { S.best = S.score; S.newBest = true; }
  hud();
  if (!S.alive) { saveProgress(); beginRevive(); } // you just died: start the revive countdown
}

// Runs every display frame. Logic ticks are fixed; drawing is smooth in between.
// If anything throws, the game shows an error screen instead of silently freezing.
function loop(t) {
  updateRevive(); // ends the revive countdown when the time is up
  if (S.alive && !S.paused && !S.crashed && !S.picking) {
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
