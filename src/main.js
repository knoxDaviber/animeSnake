// main.js: one logic tick, the frame loop, and start-up.

// Death: called after anything that can kill you (a hero move or a world tick).
function checkDeath() {
  if (S.alive) return;
  S.alpha = 1; S.heroAlpha = 1;
  saveProgress(); beginRevive(); // start the revive countdown
}

// One hero move. Runs on the hero's own timer (see heroInterval in passives.js), so it can be faster or slower than step().
function heroStep() {
  playerMove();
  hud();
  checkDeath();
}

// One world tick (every TICK_MS): everything except the hero's own movement. The order here is the order things happen.
function step() {
  S.tick++; // animation clock: 1 frame per tick
  if (S.invuln > 0) S.invuln--; else S.quietHit = false; // immunity counts world ticks, not hero moves
  ageDrops();
  agePopups();
  ageBlasts();
  ageZaps();
  if (S.alive) {
    mergeCheck();       // three identical followers fuse (merge.js)
    updateCombo();
    updateSkills();
    S.tailLeft = null;  // the Miner only gets the tile the tail left since the last tick
    updatePassives();   // Magneto pulls the key toward you
    updateAttacks();
    updateHead();       // the head's weapon (heads.js)
    updateRecruits();   // summoned characters walk in (before enemies move, so enemies can catch them)
    stepEnemies();
    refreshKey();       // puts the next key down unless enough characters are already waiting
    updateWaves();
  }
  if (S.score > S.best) { S.best = S.score; S.newBest = true; }
  if (S.wave > S.bestWave) S.bestWave = S.wave;
  hud();
  checkDeath();         // an enemy or mine may have killed you
}

// Runs every display frame. Two fixed clocks: the hero's moves and the world tick. Drawing is smooth in between.
// The hero moves first, so at normal speed it still acts before the world each tick, as before.
// If anything throws, the game shows an error screen instead of silently freezing.
function loop(t) {
  updateRevive(); // ends the revive countdown when the time is up
  audioUpdate();
  if (S.alive && !S.paused && !S.crashed && !S.picking) {
    try {
      const iv = heroInterval();
      if (t - S.heroLast >= iv) {
        S.heroLast += iv;
        if (t - S.heroLast >= iv) S.heroLast = t; // fell far behind: don't fast-forward
        heroStep();
      }
      if (S.alive && t - S.last >= TICK_MS) {
        S.last += TICK_MS;
        if (t - S.last >= TICK_MS) S.last = t;
        step();
      }
      if (S.alive) stepEnemyTimers(t);   // enemies move on their own timers (enemies.js)
      if (S.alive) {
        S.alpha = Math.min(1, Math.max(0, (t - S.last) / TICK_MS));
        S.heroAlpha = Math.min(1, Math.max(0, (t - S.heroLast) / iv));
      }
    } catch (err) { console.error(err); S.crashed = err.message || 'error'; }
  }
  if (S.crashed) drawCrash(S.crashed);
  else {
    try { draw(); } catch (err) { console.error(err); S.crashed = err.message || 'error'; }
  }
  requestAnimationFrame(loop);
}

loadProgress();
if (TEST_RELOCK) S.unlocked = {};                     // TEST ONLY
if (TEST_START_COINS > 0) S.coins = TEST_START_COINS; // TEST ONLY
newRun();
requestAnimationFrame(loop);
