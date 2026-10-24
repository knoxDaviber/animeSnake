// enemies.js: enemy snakes, their simple AI, and the wave spawner.
// Enemy = { segs: [{x,y}] head first, prev: segs one tick ago, dir, hp, stun }.

function enemyAt(x, y) {
  for (const e of S.enemies) {
    const i = e.segs.findIndex(s => s.x === x && s.y === y);
    if (i >= 0) return { e, i };
  }
  return null;
}
function enemyCanEnter(x, y) {
  return inBounds(x, y) && !(x === S.hazard.x && y === S.hazard.y) &&
    !S.snake.some(s => s.x === x && s.y === y) && !enemyAt(x, y);
}
// Which way segment i is facing (the head faces its heading, the rest face the segment ahead of them).
function faceOf(e, i) {
  return i === 0 ? { fx: e.dir.x, fy: e.dir.y }
                 : { fx: e.segs[i - 1].x - e.segs[i].x, fy: e.segs[i - 1].y - e.segs[i].y };
}

// ---- Damage ------------------------------------------------------------------
// Returns true if the enemy survived.
function damageEnemyHead(e, n) {
  if (S.pacifist) return true;
  e.hp -= n;
  if (e.hp <= 0) { killEnemy(e); return false; }
  playSfx('hitEnemy');
  e.stun = Math.max(e.stun, 2);
  return true;
}
function killEnemy(e) {
  S.enemies = S.enemies.filter(x => x !== e);
  e.segs.forEach((s, i) => {
    const f = faceOf(e, i);
    dropFx(s.x, s.y, (px, py) => drawEnemySeg(i === 0, f.fx, f.fy, px, py));
  });
  registerKill(e.segs[0].x, e.segs[0].y);
}
// Breaks segment i and cuts off everything behind it.
function cutEnemy(e, i) {
  if (S.pacifist) return;
  const faces = e.segs.map((_, k) => faceOf(e, k));
  const cut = e.segs.splice(i);
  cut.forEach((s, k) => {
    const f = faces[i + k];
    dropFx(s.x, s.y, (px, py) => drawEnemySeg(false, f.fx, f.fy, px, py));
  });
  addScore(POINTS.segment * cut.length, cut[0].x, cut[0].y);
  playSfx('cut');
  e.stun = Math.max(e.stun, 2);
}

// ---- AI ----------------------------------------------------------------------
// Never reverses, avoids walls, the hazard and other snakes. Chases the player's head most of the time
// and wanders otherwise. Moving into the player's head is a head-on collision.
function stepEnemy(e) {
  e.prev = e.segs.map(s => ({ ...s }));
  if (e.stun > 0) return;                       // stun is counted down in world ticks (stepEnemies below)
  const head = e.segs[0], ph = S.snake[0];
  const opts = [];
  for (const d of DIRS) {
    if (d.x === -e.dir.x && d.y === -e.dir.y) continue;
    const x = head.x + d.x, y = head.y + d.y;
        if (x === ph.x && y === ph.y) { if (!S.pacifist) opts.push({ d, x, y, headOn: true }); } // Pacifist: your head is just solid
    else if (enemyCanEnter(x, y) || isOwnTail(e, x, y)) opts.push({ d, x, y });
  }
  if (!opts.length) { turnAround(e); return; } // boxed in: flip the snake so its tail becomes the head
  let pick;
  if (Math.random() < enemyChase()) {
    const tgt = chaseTarget(head, ph);          // the player's head, or a nearby recruit or key
    const dist = o => Math.abs(o.x - tgt.x) + Math.abs(o.y - tgt.y);
    pick = opts.reduce((a, b) => dist(b) < dist(a) ? b : a);
  } else pick = opts[Math.floor(Math.random() * opts.length)];
  if (pick.headOn) {
    if (countFollower('medusa') > 0) { killEnemy(e); return; } // Medusa: an enemy head that touches you dies at once
    if (S.invuln > 0) return;                   // player is immune: the enemy just waits
    takeHit('enemyHead');                       // head-on: both snakes take damage, short stun
    if (damageEnemyHead(e, 1)) e.stun = 4;
    bombContact(ph.x, ph.y);
    return;
  }
  e.dir = pick.d;
  e.segs.unshift({ x: pick.x, y: pick.y });
  // Eating: a key or a recruit on the tile is gone, and the snake grows and speeds up.
  let ate = false;
  const key = S.keys.find(k => k.x === pick.x && k.y === pick.y);
  if (key) { S.keys = S.keys.filter(k => k !== key); ate = true; }
  S.recruits.filter(r => r.x === pick.x && r.y === pick.y).forEach(r => { killRecruit(r); ate = true; });
  if (ate) e.speed = Math.min(ENEMY_SPEED_MAX, e.speed + ENEMY_EAT_SPEED);
  if (!(ate && e.segs.length <= ENEMY_MAX_LEN)) e.segs.pop(); // growing = keep the tail this move
  const mine = mineAt(pick.x, pick.y);
  if (mine) detonateMine(mine);               // enemies do not avoid mines: lure them in
}
function isOwnTail(e, x, y) { const t = e.segs[e.segs.length - 1]; return e.segs.length > 1 && t.x === x && t.y === y; }
// Boxed in: the snake reverses end for end, so its tail becomes the head and it can leave the other way.
function turnAround(e) {
  if (e.segs.length < 2) return;
  e.segs.reverse();
  e.prev = e.segs.map(s => ({ ...s }));
  e.dir = { x: e.segs[0].x - e.segs[1].x, y: e.segs[0].y - e.segs[1].y };
}
// Once per world tick: stun counts down in world ticks. The moving itself is on each enemy's own timer (stepEnemyTimers).
function stepEnemies() {
  S.enemies.forEach(e => { if (e.stun > 0) e.stun--; });
}
function enemyInterval(e) { return TICK_MS / (ENEMY_BASE_SPEED * e.speed); } // ms between moves of this enemy
// Runs every frame from loop() in main.js. Each enemy moves on its own timer, like the hero. A stunned enemy
// keeps its timer "ready", so it moves the moment the stun ends.
function stepEnemyTimers(t) {
  for (const e of [...S.enemies]) {
    if (!S.alive) break;
    if (!S.enemies.includes(e)) continue;        // killed earlier this frame
    const iv = enemyInterval(e);
    if (e.stun > 0) { e.last = t - iv; e.alpha = 1; continue; }
    if (t - e.last >= iv) {
      e.last += iv;
      if (t - e.last >= iv) e.last = t;          // fell far behind: don't fast-forward
      stepEnemy(e);
    }
    e.alpha = Math.min(1, Math.max(0, (t - e.last) / iv));
  }
  checkDeath();                                  // an enemy may have killed you (main.js)
}
// After a pause or a revive: continue every enemy mid-move instead of letting it jump ahead.
function resetEnemyClocks() {
  const now = performance.now();
  S.enemies.forEach(e => { e.last = now - e.alpha * enemyInterval(e); });
}
// What a chasing enemy heads for: the player's head, unless a recruit on the grid is both closer and within
// RECRUIT_THREAT_DIST tiles, in which case it goes for the recruit.
function chaseTarget(head, ph) {
  const d = t => Math.abs(t.x - head.x) + Math.abs(t.y - head.y);
  let best = ph;
  for (const r of S.recruits) {
    if (inBounds(r.x, r.y) && d(r) <= RECRUIT_THREAT_DIST && d(r) < d(best)) best = r;
  }
  if (ENEMY_KEY_HUNT_DIST > 0)
    for (const k of S.keys) if (d(k) <= ENEMY_KEY_HUNT_DIST && d(k) < d(best)) best = k;
  return best;
}

// ---- Waves -------------------------------------------------------------------
function spawnEnemy() {
  const len = enemyLength(S.wave);
  for (let tries = 0; tries < 40; tries++) {
    const side = Math.floor(Math.random() * 4);
    const c = Math.floor(Math.random() * (side < 2 ? ROWS : COLS));
    let d, segs; // the snake starts in a straight line along an edge, heading inward
    if (side === 0)      { d = DIRS[0]; segs = range(len).map(i => ({ x: len - 1 - i, y: c })); }
    else if (side === 1) { d = DIRS[1]; segs = range(len).map(i => ({ x: COLS - len + i, y: c })); }
    else if (side === 2) { d = DIRS[2]; segs = range(len).map(i => ({ x: c, y: len - 1 - i })); }
    else                 { d = DIRS[3]; segs = range(len).map(i => ({ x: c, y: ROWS - len + i })); }
    const head = S.snake[0];
    const far = Math.abs(segs[0].x - head.x) + Math.abs(segs[0].y - head.y) >= ENEMY_SPAWN_MIN_DIST;
    if (far && segs.every(s => enemyCanEnter(s.x, s.y) && !recruitAt(s.x, s.y) && !inTextZone(s.x, s.y))) {
      S.enemies.push({ segs, prev: segs.map(s => ({ ...s })), dir: d, hp: hitsToKill(S.wave), stun: 0,
                      speed: enemyWaveSpeed(S.wave), last: performance.now(), alpha: 1 });
      return true;
    }
  }
  return false;
}
// Boss hook: a boss fight (later) sets S.boss, which stops the wave timer.
function wavesPaused() { return !!S.boss; }

function startWave() {
  S.wave++; S.giftCharges = GIFT_PORTALS_PER_WAVE;
  const h = S.snake[0], bonus = WAVE_COINS[S.wave];
  if (bonus) {
    const c = coinReward(bonus); S.coins += c;
    S.popups.push({ x: h.x, y: h.y, text: `Wave ${S.wave}! +${c} coins`, age: 0 });
    playSfx('unlock');
  }
  if (S.pacifist) addScore(PACIFIST_POINTS.wave, h.x, h.y);
  if (S.challenge && S.wave >= CHALLENGE_WAVE) { winRun(); return; }   // Challenge won (revive.js)
  S.toSpawn = Math.min(ENEMY_QUEUE_MAX, S.toSpawn + waveSize(S.wave) + Math.round(RET_PRESSURE_EXTRA * pressure()));
  S.spawnTimer = 0;
  S.waveTimer = waveDuration(S.wave);
}
function updateWaves() {
  if (S.toSpawn > 0 && S.enemies.length < ENEMY_CAP) {   // snakes of the queue walk in one by one, up to the cap
    if (--S.spawnTimer <= 0 && spawnEnemy()) { S.toSpawn--; S.spawnTimer = SPAWN_GAP; }
  }
  if (wavesPaused()) return;
  const clear = S.toSpawn === 0 && S.enemies.length === 0;
  if (clear && S.wave > 0 && WAVE_CLEAR_SKIP > 0 && S.waveTimer > WAVE_CLEAR_SKIP) S.waveTimer = WAVE_CLEAR_SKIP;
  if (--S.waveTimer <= 0) startWave();
}
