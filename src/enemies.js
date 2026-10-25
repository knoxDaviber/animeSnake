// enemies.js: enemy snakes, their AI, the enemy types, spit projectiles and the wave spawner.
// Enemy = { segs: [{x,y}] head first, prev: segs one tick ago, dir, hp, stun, type, fire, speed, last, alpha }.
// Types (ENEMY_TYPES in config.js): normal, fast (thin, quick, short), armored (tougher), spitter (spits along rows
// and columns). They unlock by wave, and a room can favour one (see pickEnemyType).
// Terrain (rooms.js): walls and hazards block enemies, one-way gates only let them through the right way, conveyors
// push them, ice keeps them going straight, and mud slows them.

function enemyAt(x, y) {
  for (const e of S.enemies) {
    const i = e.segs.findIndex(s => s.x === x && s.y === y);
    if (i >= 0) return { e, i };
  }
  return null;
}
// (dx, dy) = the way the snake is heading, so a one-way gate can refuse it. Leave them out and gates count as closed.
function enemyCanEnter(x, y, dx = 0, dy = 0) {
  if (!inBounds(x, y)) return false;
  const t = tileAt(x, y);
  return t !== '#' && t !== 'H' && !gateBlocks(x, y, dx, dy) &&
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

// ---- Path finding ------------------------------------------------------------------
// A walls-aware distance map from a target tile: DIST[y * COLS + x] = steps to the target, -1 = not reached (or too far).
// Chasing enemies pick the move with the smallest distance, so they walk around walls instead of getting stuck on them.
// Gates and hazards count as closed here; snakes and mines are ignored (they move).
const DIST = new Int16Array(COLS * ROWS), BFS_QUEUE = new Int32Array(COLS * ROWS), BFS_LIMIT = 1800;
function distField(tx, ty) {
  DIST.fill(-1);
  let head = 0, tail = 0;
  DIST[ty * COLS + tx] = 0; BFS_QUEUE[tail++] = ty * COLS + tx;
  while (head < tail && tail < BFS_LIMIT) {
    const i = BFS_QUEUE[head++], x = i % COLS, y = (i - x) / COLS, d = DIST[i] + 1;
    for (const o of DIRS) {
      const nx = x + o.x, ny = y + o.y;
      if (!inBounds(nx, ny)) continue;
      const j = ny * COLS + nx;
      if (DIST[j] >= 0) continue;
      const t = S.map[ny][nx];
      if (t === '#' || t === 'H' || GATE_DIR[t]) continue;
      DIST[j] = d; BFS_QUEUE[tail++] = j;
    }
  }
  return DIST;
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
    else if (enemyCanEnter(x, y, d.x, d.y) || isOwnTail(e, x, y)) opts.push({ d, x, y });
  }
  if (!opts.length) { turnAround(e); return; } // boxed in: flip the snake so its tail becomes the head
  const under = tileAt(head.x, head.y), belt = CONVEYOR_DIR[under];
  const pushed = belt ? opts.find(o => o.d.x === belt.x && o.d.y === belt.y) : null;                       // a conveyor carries it
  const sliding = under === 'I' ? opts.find(o => o.d.x === e.dir.x && o.d.y === e.dir.y) : null;           // ice: straight on
  let pick;
  if (pushed) pick = pushed;
  else if (sliding) pick = sliding;
  else if (Math.random() < enemyChase()) {
    const tgt = chaseTarget(head, ph);          // the player's head, or a nearby recruit or key
    const dm = distField(tgt.x, tgt.y);
    const cost = o => { const v = dm[o.y * COLS + o.x]; return v < 0 ? 1000 + Math.abs(o.x - tgt.x) + Math.abs(o.y - tgt.y) : v; };
    pick = opts.reduce((a, b) => cost(b) < cost(a) ? b : a);
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
// Once per world tick: stun counts down in world ticks, and spitters get to fire. The moving itself is on each
// enemy's own timer (stepEnemyTimers).
function stepEnemies() {
  S.enemies.forEach(e => {
    if (e.stun > 0) e.stun--;
    if (e.type === 'spitter') spitterFire(e);
  });
}
function enemyInterval(e) { // ms between moves of this enemy (a head on mud is slowed)
  const mud = tileAt(e.segs[0].x, e.segs[0].y) === '~' ? MUD_SLOW : 1;
  return TICK_MS / (ENEMY_BASE_SPEED * e.speed * mud);
}
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

// ---- Spitters --------------------------------------------------------------------
// A spitter that lines up with you on a row or column (no wall between, within SPIT_RANGE tiles) spits an orb at you
// every SPIT_COOLDOWN ticks. The orb flies SPIT_SPEED tiles per tick and costs a ring if it reaches any of your segments.
function spitterFire(e) {
  if (S.pacifist || e.stun > 0) return;
  if (e.fire > 0) { e.fire--; return; }
  const h = e.segs[0], p = S.snake[0];
  let dx = 0, dy = 0, n = 0;
  if (h.y === p.y) { dx = Math.sign(p.x - h.x); n = Math.abs(p.x - h.x); }
  else if (h.x === p.x) { dy = Math.sign(p.y - h.y); n = Math.abs(p.y - h.y); }
  if (!n || n > SPIT_RANGE) return;
  for (let k = 1; k < n; k++) if (isWall(h.x + dx * k, h.y + dy * k)) return; // a wall is in the way
  S.spits.push({ x: h.x, y: h.y, px: h.x, py: h.y, dx, dy, dead: false });
  e.fire = SPIT_COOLDOWN;
  playSfx('shoot');
}
// Called once per world tick (step in main.js), after the enemies' stun and fire timers.
function updateSpits() {
  for (const b of S.spits) {
    b.px = b.x; b.py = b.y;
    for (let k = 0; k < SPIT_SPEED && !b.dead; k++) {
      const nx = b.x + b.dx, ny = b.y + b.dy;
      if (!inBounds(nx, ny) || isWall(nx, ny)) { b.dead = true; break; }
      b.x = nx; b.y = ny;
      if (S.alive && S.snake.some(s => s.x === nx && s.y === ny)) {
        if (S.invuln <= 0) takeHit();
        b.dead = true;
      }
    }
  }
  S.spits = S.spits.filter(b => !b.dead);
}

// ---- Waves -------------------------------------------------------------------
// Which type the next snake is. Types unlock by wave (ENEMY_TYPES[type].from). While the hero is in a room that favours
// an unlocked type, that type is likely (ENEMY_FAVOR_CHANCE). Otherwise ENEMY_TYPE_CHANCE of snakes are a random special.
function pickEnemyType() {
  const open = Object.keys(ENEMY_TYPES).filter(k => k !== 'normal' && S.wave >= ENEMY_TYPES[k].from);
  if (!open.length) return 'normal';
  const here = roomAt(S.snake[0].x, S.snake[0].y);
  if (here && here.favors && open.includes(here.favors) && Math.random() < ENEMY_FAVOR_CHANCE) return here.favors;
  return Math.random() < ENEMY_TYPE_CHANCE ? open[Math.floor(Math.random() * open.length)] : 'normal';
}
// A new snake starts in a straight line just OUTSIDE the camera view, heading inward (a side that falls outside the
// world, or lands in a wall, just tries again).
function spawnEnemy() {
  const type = pickEnemyType(), T = ENEMY_TYPES[type];
  const len = Math.max(2, enemyLength(S.wave) + T.len), v = viewTiles();
  for (let tries = 0; tries < 40; tries++) {
    const side = Math.floor(Math.random() * 4);
    const lane = side < 2 ? v.y0 + Math.floor(Math.random() * (v.y1 - v.y0 + 1))
                          : v.x0 + Math.floor(Math.random() * (v.x1 - v.x0 + 1));
    let d, segs;
    if (side === 0)      { d = DIRS[0]; segs = range(len).map(i => ({ x: v.x0 - 1 - i, y: lane })); }
    else if (side === 1) { d = DIRS[1]; segs = range(len).map(i => ({ x: v.x1 + 1 + i, y: lane })); }
    else if (side === 2) { d = DIRS[2]; segs = range(len).map(i => ({ x: lane, y: v.y0 - 1 - i })); }
    else                 { d = DIRS[3]; segs = range(len).map(i => ({ x: lane, y: v.y1 + 1 + i })); }
    const head = S.snake[0];
    const far = Math.abs(segs[0].x - head.x) + Math.abs(segs[0].y - head.y) >= ENEMY_SPAWN_MIN_DIST;
    if (far && segs.every(s => enemyCanEnter(s.x, s.y) && !recruitAt(s.x, s.y) && !inTextZone(s.x, s.y))) {
      S.enemies.push({ segs, prev: segs.map(s => ({ ...s })), dir: d, hp: hitsToKill(S.wave) * T.hp, stun: 0, type, fire: SPIT_COOLDOWN,
                      speed: Math.min(ENEMY_SPEED_MAX, enemyWaveSpeed(S.wave) * T.speed), last: performance.now(), alpha: 1 });
      return true;
    }
  }
  return false;
}
// Boss hook: a boss fight (later) sets S.boss, which stops the wave timer.
function wavesPaused() { return !!S.boss; }

function startWave() {
  S.wave++; S.giftCharges = S.giftPerWave;
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