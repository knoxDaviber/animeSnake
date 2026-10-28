// waves.js: how the game gets harder as the waves go on. Bosses every BOSS_EVERY waves, rushes, and the wave 30 victory.
//  * BOSSES. Every BOSS_EVERY (10) waves a boss arrives and the waves pause until it is dead. They alternate: wave 10 the Great
//    Serpent, 20 the Hollow Wizard, 30 BOTH at once (the finale), 40 the serpent again, 50 the wizard, 60 both... Each time they are
//    stronger: S.bossTier = wave / BOSS_EVERY, and HP, speed and attack rate follow it (bossHp, bossSpeedMult, bossCd).
//    Beating both at wave 30 is the VICTORY (updateFinale): coins and score, and then the run simply goes on.
//  * RUSHES. Every RUSH_EVERY (5) waves that are not boss waves, a flood of snakes enters from every side (startRush, updateRush).
//    They ignore the alive cap. Clear them all for a temp buff block and coins.
//  * The rest of the scaling (snakes per wave, hits to kill, length, speed) is in config.js. The alive cap, the chance of special
//    snakes and the gap between spawns are here (enemyCap is in doors.js).
// State (state.js): S.bossTier, S.rush = { left, total, wait, wave, fails } while a rush is on, S.finale, S.finaleWon.

// ---- Boss waves ----
// 'serpent', 'wizard' or 'both' for a boss wave, otherwise null. Wave 10 serpent, 20 wizard, 30 both, 40 serpent...
function bossKindAt(w) {
  if (w < BOSS_EVERY || w % BOSS_EVERY !== 0) return null;
  const n = (w / BOSS_EVERY) % 3;
  return n === 1 ? 'serpent' : n === 2 ? 'wizard' : 'both';
}
function bossTier() { return Math.max(1, S.bossTier || 1); }
function bossHp() { return Math.round(BOSS_HP * (1 + BOSS_TIER_HP * (bossTier() - 1))); }
function wizardHp() { return Math.round(WIZARD_HP * (1 + BOSS_TIER_HP * (bossTier() - 1))); }
function bossSpeedMult() { return 1 + BOSS_TIER_SPEED * (bossTier() - 1); }
function bossCd() { return Math.max(BOSS_TIER_CD_MIN, 1 - BOSS_TIER_CD * (bossTier() - 1)); }   // multiplies attack cooldowns

// Called by startWave (enemies.js) on a boss wave.
function startBossWave(kind) {
  S.bossTier = Math.round(S.wave / BOSS_EVERY);
  if (kind === 'serpent' || kind === 'both') startBoss();     // boss.js
  if (kind === 'wizard' || kind === 'both') startWizard();    // wizard.js
  if (kind === 'both' && !S.finaleWon) S.finale = true;       // beat both and the run is won (updateFinale)
}

// Once per world tick. When both bosses of the finale are down: the victory. The run goes on afterwards.
function updateFinale() {
  if (!S.finale || !S.alive || wavesPaused()) return;
  S.finale = false; S.finaleWon = true;
  const h = S.snake[0], c = coinReward(FINALE_COINS);
  S.coins += c;
  addScore(FINALE_SCORE, h.x, h.y);
  showBanner('VICTORY!', '', '#ffd36b');
  S.popups.push({ x: h.x, y: h.y - 1, text: `Victory! +${c} coins`, age: 0 });
  playSfx('win');
  saveProgress();
}

// ---- Rushes ----
function isRushWave(w) { return RUSH_EVERY > 0 && w >= RUSH_EVERY && w % RUSH_EVERY === 0 && !bossKindAt(w); }
function rushSize(w) { return Math.min(RUSH_MAX, RUSH_BASE + Math.floor(w * RUSH_PER_WAVE)); }

// Called by startWave (enemies.js) on every normal wave. Does nothing unless this is a rush wave.
function startRush() {
  if (S.pacifist || !isRushWave(S.wave)) return;
  const n = rushSize(S.wave);
  S.rush = { left: n, total: n, wait: RUSH_WARN_TICKS, wave: S.wave, fails: 0 };
  showBanner('A rush is coming!', '', '#ff8a8a');
  playSfx('waveStart');
}
// Once per world tick: after the warning the snakes pour in from the edges of the view, ignoring the alive cap.
function updateRush() {
  const r = S.rush;
  if (!r || !S.alive) return;
  if (r.wait > 0) { r.wait--; return; }
  if (r.left > 0) {
    for (let k = 0; k < RUSH_PER_TICK && r.left > 0; k++) {
      if (spawnEnemy()) r.left--;                    // enemies.js: just outside the view, or inside an open room
      else { if (++r.fails > 80) r.left = 0; break; } // no room found: try again next tick, give up after a while
    }
    return;
  }
  if (S.enemies.length === 0 && S.toSpawn === 0 && !wavesPaused()) rushCleared(r);
}
function rushCleared(r) {
  S.rush = null;
  const h = S.snake[0], c = coinReward(RUSH_COINS + Math.floor(r.wave / 10)), t = nearFreeTile(h.x, h.y);
  S.coins += c; saveProgress();
  if (t) S.pickups.push({ x: t.x, y: t.y, id: pickRand(Object.keys(TEMP_BUFFS)), ttl: TB_PICKUP_TICKS });   // a temp buff block lies close by
  showBanner(`Rush cleared! +${c} coins`, '', '#8dff6b', true);
  playSfx('waveClear');
}
// A free tile a few steps from (cx, cy), or null.
function nearFreeTile(cx, cy) {
  for (let r = 2; r <= 8; r++) for (let tries = 0; tries < 12; tries++) {
    const x = cx + Math.floor(Math.random() * (2 * r + 1)) - r, y = cy + Math.floor(Math.random() * (2 * r + 1)) - r;
    if (tileFree(x, y) && !inTextZone(x, y)) return { x, y };
  }
  return null;
}

// ---- Other scaling ----
// Chance that the next snake is a special type once one is unlocked: it grows every wave.
function enemyTypeChance() { return Math.min(ENEMY_TYPE_CHANCE_MAX, ENEMY_TYPE_CHANCE + ENEMY_TYPE_CHANCE_STEP * (S.wave || 0)); }
// Ticks between two spawns inside a wave: they come faster as waves go on.
function spawnGap() { return Math.max(SPAWN_GAP_MIN, SPAWN_GAP - Math.floor((S.wave || 0) / 4)); }