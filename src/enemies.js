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
  e.hp -= n;
  if (e.hp <= 0) { killEnemy(e); return false; }
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
  const faces = e.segs.map((_, k) => faceOf(e, k));
  const cut = e.segs.splice(i);
  cut.forEach((s, k) => {
    const f = faces[i + k];
    dropFx(s.x, s.y, (px, py) => drawEnemySeg(false, f.fx, f.fy, px, py));
  });
  addScore(POINTS.segment * cut.length, cut[0].x, cut[0].y);
  e.stun = Math.max(e.stun, 2);
}

// ---- AI ----------------------------------------------------------------------
// Never reverses, avoids walls, the hazard and other snakes. Chases the player's head most of the time
// and wanders otherwise. Moving into the player's head is a head-on collision.
function stepEnemy(e) {
  e.prev = e.segs.map(s => ({ ...s }));
  if (e.stun > 0) { e.stun--; return; }
  const head = e.segs[0], ph = S.snake[0];
  const opts = [];
  for (const d of DIRS) {
    if (d.x === -e.dir.x && d.y === -e.dir.y) continue;
    const x = head.x + d.x, y = head.y + d.y;
    if (x === ph.x && y === ph.y) opts.push({ d, x, y, headOn: true });
    else if (enemyCanEnter(x, y) || isOwnTail(e, x, y)) opts.push({ d, x, y });
  }
  if (!opts.length) { turnAround(e); return; } // boxed in: flip the snake so its tail becomes the head
  let pick;
  if (Math.random() < enemyChase()) {
    const tgt = chaseTarget(head, ph);          // usually the player's head, sometimes a nearby recruit
    const dist = o => Math.abs(o.x - tgt.x) + Math.abs(o.y - tgt.y);
    pick = opts.reduce((a, b) => dist(b) < dist(a) ? b : a);
  } else pick = opts[Math.floor(Math.random() * opts.length)];
  if (pick.headOn) {
    if (S.invuln > 0) return;                 // player is immune: the enemy just waits
        takeHit('enemyHead');                     // head-on: both snakes take damage, short stun                                // head-on: both snakes take damage, short stun
    if (damageEnemyHead(e, 1)) e.stun = 4;
    return;
  }
  e.dir = pick.d;
  e.segs.unshift({ x: pick.x, y: pick.y });
  e.segs.pop();
  S.recruits.filter(r => r.x === pick.x && r.y === pick.y).forEach(killRecruit); // stepping on a recruit kills it
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
function stepEnemies() {
  [...S.enemies].forEach(e => { if (S.alive && S.enemies.includes(e)) stepEnemy(e); });
}
// What a chasing enemy heads for: the player's head, unless a recruit on the grid is both closer and within
// RECRUIT_THREAT_DIST tiles, in which case it goes for the recruit.
function chaseTarget(head, ph) {
  const d = t => Math.abs(t.x - head.x) + Math.abs(t.y - head.y);
  let best = ph;
  for (const r of S.recruits) {
    if (inBounds(r.x, r.y) && d(r) <= RECRUIT_THREAT_DIST && d(r) < d(best)) best = r;
  }
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
    if (far && segs.every(s => enemyCanEnter(s.x, s.y) && !recruitAt(s.x, s.y))) {
      S.enemies.push({ segs, prev: segs.map(s => ({ ...s })), dir: d, hp: hitsToKill(S.wave), stun: 0 });
      return true;
    }
  }
  return false;
}
function updateWaves() {
  if (S.toSpawn > 0) {
    if (--S.spawnTimer <= 0 && spawnEnemy()) { S.toSpawn--; S.spawnTimer = SPAWN_GAP; }
  } else if (S.enemies.length === 0) {
    if (--S.waveTimer <= 0) { S.wave++; S.coins += COIN_PER_WAVE; S.toSpawn = waveSize(S.wave); S.spawnTimer = 0; S.waveTimer = WAVE_DELAY; }
  }
}
