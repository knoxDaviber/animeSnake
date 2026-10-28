// main.js: one logic tick, the frame loop, and start-up.

// Death: called after anything that can kill you (a hero move or a world tick).
function checkDeath() {
  if (S.alive || S.won) return;
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
  ageBanners();
  if (S.alive) {
    mergeCheck();       // three identical followers fuse (merge.js)
    if (S.pacifist && ++S.stuckTicks >= PACIFIST_STUCK_TICKS) { // Pacifist stuck detector
      S.popups.push({ x: S.snake[0].x, y: S.snake[0].y, text: 'Stuck!', age: 0 });
      S.alive = false;
    }
    updateCombo();
    passiveXp();        // the XP bar trickles up on its own (levels.js)
    if (!S.pacifist) { updateSkills(); updateTethers(); }   // skills.js: Raiden's telegraphed mine pops
    S.tailLeft = null;  // the Miner only gets the tile the tail left since the last tick
    updatePassives();   // Magneto pulls the key toward you
    updateTempBuffs();
    updateAttacks();
    if (!S.pacifist) { updateHead(); updateBranches(); }   // the hero's weapon (heads.js) and level branches (levels.js)
    updateRecruits();   // summoned characters walk in (before enemies move, so enemies can catch them)
    updateKicks();      // kicked items slide (kicks.js)
    stepEnemies();
    updateTurrets();    // wall turrets fire (enemies.js)
    updateSpits();      // spitter orbs fly (enemies.js)
    refreshKey();       // puts the next key down unless enough characters are already waiting
    updateWaves();
    updateBoss();
    updateWizard();     // wizard.js: the wave 20 wizard and his lasers
    updatePedestals();  // bombs.js: bomb pedestals regrow their bomb
    updateDoors();      // ambush and lockdown triggers (doors.js)
    updateRush();       // waves.js: enemy rushes
    updateFinale();     // waves.js: the wave 30 victory  
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
  updateAd();     // a finished ad gives its reward (ads.js)
  updateRevive(); // ends the revive countdown when the time is up
  audioUpdate();
  if (S.holdStart && S.alive && !S.picking) { S.last = t; S.heroLast = t; S.alpha = 1; S.heroAlpha = 1; }   // waiting for the first input: the world is frozen
  else if (S.alive && !S.paused && !S.crashed && !S.picking) {
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
      if (S.alive) openBranchPick();     // a level-5 weapon branch pick (levels.js)
         if (S.alive) openBossReward();
         if (S.alive) openDoorPick();       // door pick at wave milestones (doors.js)     // reward pick after the boss (boss.js)
      if (S.alive) {
        S.alpha = Math.min(1, Math.max(0, (t - S.last) / TICK_MS));
        S.heroAlpha = Math.min(1, Math.max(0, (t - S.heroLast) / iv));
      }
    } catch (err) { console.error(err); S.crashed = err.message || 'error'; }
  }
  if (S.crashed) drawCrash(S.crashed);
  else {
    try { updateCamera(t); draw(); } catch (err) { console.error(err); S.crashed = err.message || 'error'; }
  }
  requestAnimationFrame(loop);
}

resizeView();
loadProgress();
if (TEST_RELOCK) S.unlocked = {};                     // TEST ONLY
if (TEST_START_COINS > 0) S.coins = TEST_START_COINS; // TEST ONLY
newRun();
requestAnimationFrame(loop);
