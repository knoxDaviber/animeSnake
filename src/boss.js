// boss.js: the wave 10 boss, the Great Serpent. It does NOT follow the grid rules.
//
//  * Gridless body. The boss is a chain of float points (e.pts, in tile units: 1.0 = one tile, an integer is the middle of
//    that tile). The head moves smoothly every frame at its own speed and turns at a limited turn rate; every other point
//    follows the one before it, like a rope. It is drawn big and smooth, never snapped to tiles.
//  * It still lives in S.enemies, so every weapon, mine, bullet and shockwave already hurts it. enemyAt() (enemies.js) asks
//    bossIndexAt() for it (a tile counts if its middle is within BOSS_RADIUS of a point), and e.segs is kept as one rounded
//    tile per point for the code that only wants tiles (targeting, kill effects).
//  * Damage. BOSS_HP total. A hit on the head is a CRIT (BOSS_CRIT x damage): the boss flashes, freezes for BOSS_FLASH_MS, then
//    swaps ends (the head becomes the tail) and keeps moving. A hit on the body does BOSS_BODY_DAMAGE and only flashes.
//  * Smarter AI (bossSteer): it leads its target (aims where you are going), uses line of sight and a path flow field to get
//    around walls, steers away from walls and mines, hunts other snakes and nearby keys (it eats them), telegraphs and
//    then CHARGES at you in a straight line (dazing itself if it hits a wall), gets faster and charges more when enraged
//    (under BOSS_ENRAGE_AT of its HP), and reverses ends if it gets stuck.
//  * It hurts you by touching you (head against any of your segments, or its body against your hero) and recoils afterwards.
//  * No regular snakes arrive while it lives (S.boss stops the wave timer, see wavesPaused in enemies.js).
//  * Medusa cannot freeze it or kill it in one touch. A touch costs it BOSS_MEDUSA_DAMAGE (crit applies). Goliath: a touch
//    from the front is harmless to him and chips the boss.
// Beating it pays coins and score and opens a reward pick (the buff pick screen, reused).
// State (state.js): S.boss = the boss enemy while it lives, S.bossWait = waiting for a place to spawn,
// S.pendingReward / S.rewardPicking = the reward pick.

const BOSS_REWARD_POOL = ['thickSkin', 'quickHands', 'comboKeeper', 'skillHaste', 'secondWind', 'welcomeParty'];

function angDiff(a, b) { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; }
function bossDist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }

// ---- Spawning ------------------------------------------------------------------------------------
// Wave 10 begins: no more regular snakes, and the boss walks in as soon as it finds room.
function startBoss() {
  S.toSpawn = 0;
  S.bossWait = true;
  S.popups.push({ x: S.snake[0].x, y: S.snake[0].y, text: 'Something huge is coming...', age: 3 });
  playSfx('waveStart');
}
// Once per world tick.
function updateBoss() {
  if (!S.bossWait || !S.alive) return;
  if (spawnBoss()) {
    S.bossWait = false;
    S.popups.push({ x: S.snake[0].x, y: S.snake[0].y, text: 'The Great Serpent!', age: 0 });
  }
}
// A straight line of BOSS_PTS points, first just outside the camera view heading inward, then anywhere far away.
function spawnBoss() {
  const v = viewTiles(), head = S.snake[0], n = BOSS_PTS, now = performance.now();
  for (let tries = 0; tries < 160; tries++) {
    let d, sx, sy;
    if (tries < 80) {
      const side = Math.floor(Math.random() * 4);
      const lane = side < 2 ? v.y0 + Math.floor(Math.random() * (v.y1 - v.y0 + 1)) : v.x0 + Math.floor(Math.random() * (v.x1 - v.x0 + 1));
      d = DIRS[side];
      sx = side === 0 ? v.x0 - 1 : side === 1 ? v.x1 + 1 : lane;
      sy = side === 2 ? v.y0 - 1 : side === 3 ? v.y1 + 1 : lane;
    } else { d = DIRS[Math.floor(Math.random() * 4)]; const t = randomTile(); sx = t.x; sy = t.y; }
    const pts = range(n).map(i => ({ x: sx - d.x * i * BOSS_SPACING, y: sy - d.y * i * BOSS_SPACING }));
    const far = Math.abs(sx - head.x) + Math.abs(sy - head.y) >= (tries < 80 ? ENEMY_SPAWN_MIN_DIST : 12);
    if (far && !bossBlocked(pts[0].x, pts[0].y, pts) &&
        pts.every(p => { const x = Math.round(p.x), y = Math.round(p.y); return enemyCanEnter(x, y) && !recruitAt(x, y) && !noItems(x, y); })) {
      const boss = { pts, segs: [], prev: [], dir: d, hp: BOSS_HP, maxHp: BOSS_HP, stun: 0, type: 'boss', boss: true, fire: 0,
                     speed: 1, last: now, alpha: 1, ang: Math.atan2(d.y, d.x), lastT: now,
                     phase: 'move', phaseUntil: 0, chargeReady: now + BOSS_FIRST_CHARGE_MS, pauseUntil: 0, flashUntil: 0, swapPending: false,
                     hitAt: 0, bodyHitAt: 0, contactAt: 0, flow: null, flowAt: 0, stuckAt: now, stuckX: pts[0].x, stuckY: pts[0].y };
      bossSync(boss);
      S.enemies.push(boss);
      S.boss = boss;
      return true;
    }
  }
  return false;
}

// ---- Tiles and collisions ---------------------------------------------------------------------------
// enemyAt() asks this: which point of boss e is on tile (x, y)? -1 = none. Lower index (the head) wins.
function bossIndexAt(e, x, y) {
  const r2 = BOSS_RADIUS * BOSS_RADIUS;
  for (let i = 0; i < e.pts.length; i++) { const p = e.pts[i]; if ((p.x - x) * (p.x - x) + (p.y - y) * (p.y - y) <= r2) return i; }
  return -1;
}
// Would a circle (the head) at (px, py) overlap a wall, push block or turret? (tile (x, y) covers x +- 0.5)
function bossBlocked(px, py) {
  const r = BOSS_WALL_RADIUS, x0 = Math.round(px), y0 = Math.round(py);
  for (let ty = y0 - 1; ty <= y0 + 1; ty++) for (let tx = x0 - 1; tx <= x0 + 1; tx++) {
    if (!isWall(tx, ty)) continue;
    const cx = Math.max(tx - 0.5, Math.min(tx + 0.5, px)), cy = Math.max(ty - 0.5, Math.min(ty + 0.5, py));
    if ((px - cx) * (px - cx) + (py - cy) * (py - cy) < r * r) return true;
  }
  return false;
}
function bossLOS(ax, ay, bx, by) { // a straight line with no wall tile on it
  const n = Math.ceil(bossDist(ax, ay, bx, by) / 0.5);
  for (let k = 1; k < n; k++) { const t = k / n; if (isWall(Math.round(ax + (bx - ax) * t), Math.round(ay + (by - ay) * t))) return false; }
  return true;
}
// Keeps e.segs (one rounded tile per point), e.prev and e.dir in step with the points, for the code that wants tiles.
function bossSync(e) {
  e.segs = e.pts.map(p => ({ x: Math.round(p.x), y: Math.round(p.y) }));
  e.prev = e.segs;
  const c = Math.cos(e.ang), s = Math.sin(e.ang);
  e.dir = Math.abs(c) > Math.abs(s) ? { x: Math.sign(c), y: 0 } : { x: 0, y: Math.sign(s) || 1 };
}

// ---- Damage ----------------------------------------------------------------------------------------
// head = true: a crit (the caller already multiplied dmg). Returns false if the boss died.
function bossHit(e, dmg, head) {
  const now = performance.now();
  if (head) { if (now - e.hitAt < BOSS_IFRAMES_MS) return true; e.hitAt = now; }
  else { if (now - e.bodyHitAt < BOSS_IFRAMES_MS) return true; e.bodyHitAt = now; }
  e.hp -= dmg;
  if (e.hp <= 0) { killEnemy(e); return false; }
  playSfx('hitEnemy');
  const h = e.pts[0];
  if (head) {                                          // crit: flash, freeze, then swap ends
    e.flashUntil = now + BOSS_FLASH_MS; e.pauseUntil = Math.max(e.pauseUntil, e.flashUntil);
    e.swapPending = true; e.phase = 'move'; e.chargeReady = Math.max(e.chargeReady, now + 1500);
    S.popups.push({ x: Math.round(h.x), y: Math.round(h.y), text: `Crit! -${dmg}`, age: 0 });
  } else e.flashUntil = Math.max(e.flashUntil, now + 120);
  return true;
}
// The head becomes the tail: the points reverse and the boss slithers off the other way.
function bossSwap(e) {
  e.pts.reverse();
  const a = e.pts[0], b = e.pts[1];
  e.ang = bossDist(a.x, a.y, b.x, b.y) > 0.01 ? Math.atan2(a.y - b.y, a.x - b.x) : e.ang + Math.PI;
  e.flow = null; e.phase = 'move';
  playSfx('gaze');
}
// Called by killEnemy when the boss dies.
function bossDefeated(e) {
  S.boss = null; S.bossWait = false;
  const h = S.snake[0], c = coinReward(BOSS_COINS), hx = Math.round(e.pts[0].x), hy = Math.round(e.pts[0].y);
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (inBounds(hx + dx, hy + dy) && !isWall(hx + dx, hy + dy)) S.blasts.push({ x: hx + dx, y: hy + dy, age: 0 });
  S.coins += c;
  addScore(BOSS_SCORE, h.x, h.y);
  S.popups.push({ x: h.x, y: h.y - 1, text: `Boss down! +${c} coins`, age: 0 });
  playSfx('explosion'); playSfx('unlock');
  S.waveTimer = Math.min(S.waveTimer, BOSS_AFTER_TICKS);   // the waves start again soon
  S.pendingReward = true;
  saveProgress();
}

// ---- Eating -------------------------------------------------------------------------------------------
// The boss eats snake o from its point k on (the whole snake if k = 0). Returns how many segments went.
function bossEat(e, o, k) {
  let gone;
  if (k === 0) {
    S.enemies = S.enemies.filter(q => q !== o);
    gone = o.segs.map((s, i) => ({ s, f: faceOf(o, i), head: i === 0 }));
  } else {
    const faces = o.segs.map((_, j) => faceOf(o, j));
    gone = o.segs.splice(k).map((s, j) => ({ s, f: faces[k + j], head: false }));
  }
  gone.forEach(g => dropFx(g.s.x, g.s.y, (px, py) => drawEnemySeg(g.head, g.f.fx, g.f.fy, px, py)));
  e.hp = Math.min(e.maxHp, e.hp + BOSS_HEAL);
  playSfx('cut');
  return gone.length;
}
// Per frame: mines go off under the head, keys / recruits / nearby snakes are eaten, and eating makes it longer and faster.
function bossEatStuff(e) {
  const h = e.pts[0];
  let ate = false;
  const m = mineAt(Math.round(h.x), Math.round(h.y));
  if (m) { detonateMine(m); if (!S.enemies.includes(e)) return; }
  for (const k of [...S.keys]) if (bossDist(k.x, k.y, h.x, h.y) <= BOSS_EAT_DIST) { S.keys = S.keys.filter(q => q !== k); ate = true; }
  for (const r of [...S.recruits]) if (inBounds(r.x, r.y) && bossDist(r.x, r.y, h.x, h.y) <= BOSS_EAT_DIST) { killRecruit(r); ate = true; }
  for (const o of [...S.enemies]) {
    if (o === e || o.boss) continue;
    const k = o.segs.findIndex(s => bossDist(s.x, s.y, h.x, h.y) <= BOSS_EAT_DIST);
    if (k >= 0 && bossEat(e, o, k) > 0) ate = true;
  }
  if (ate) {
    if (e.pts.length < BOSS_MAX_PTS) { const t = e.pts[e.pts.length - 1]; e.pts.push({ x: t.x, y: t.y }); }
    e.speed = Math.min(BOSS_SPEED_MAX, e.speed + BOSS_EAT_SPEED);
  }
}

// ---- Touching you -------------------------------------------------------------------------------------
function bossContact(e, now) {
  if (!S.alive || now - e.contactAt < BOSS_CONTACT_MS) return;
  const head = e.pts[0], hero = S.snake[0];
  let touched = false, headOn = false;
  if (bossDist(head.x, head.y, hero.x, hero.y) <= BOSS_HEAD_REACH) { touched = true; headOn = true; }
  else if (S.snake.some(s => bossDist(head.x, head.y, s.x, s.y) <= BOSS_HEAD_REACH)) touched = true;       // its head hits your body
  else if (e.pts.some((p, i) => i > 0 && bossDist(p.x, p.y, hero.x, hero.y) <= BOSS_BODY_REACH)) touched = true;   // its body sweeps over your hero
  if (!touched) return;
  e.contactAt = now;
  if (headOn && countFollower('medusa') > 0) { damageEnemyHead(e, BOSS_MEDUSA_DAMAGE); return; }   // Medusa: it is hurt, you are not
  const dx = head.x - hero.x, dy = head.y - hero.y, fx = Math.abs(dx) > Math.abs(dy) ? Math.sign(dx) : 0, fy = fx ? 0 : Math.sign(dy);
  if (goliathFront(fx, fy)) { bossHit(e, 1, false); e.pauseUntil = Math.max(e.pauseUntil, now + 500); return; } // Goliath: harmless to him
  if (S.invuln > 0) return;
  takeHit(headOn ? 'enemyHead' : undefined);
  bombContact(hero.x, hero.y);
  e.pauseUntil = Math.max(e.pauseUntil, now + BOSS_RECOIL_MS);                                       // it recoils for a moment
  e.phase = 'move';
}

// ---- The brain ----------------------------------------------------------------------------------------
// What it wants right now: another snake close by (it is hungry), a key close by, otherwise YOU, a few tiles ahead of
// where you are heading (so it cuts you off instead of trailing behind).
function bossGoal(e) {
  const h = e.pts[0], p = S.snake[0], heroD = bossDist(h.x, h.y, p.x, p.y);
  const lead = Math.min(BOSS_LEAD_MAX, heroD * 0.35);
  let gx = Math.max(1, Math.min(COLS - 2, p.x + S.dir.x * lead)), gy = Math.max(1, Math.min(ROWS - 2, p.y + S.dir.y * lead));
  if (isWall(Math.round(gx), Math.round(gy))) { gx = p.x; gy = p.y; }
  let goal = { x: gx, y: gy, kind: 'hero', d: heroD };
  let prey = null, pd = BOSS_HUNT_DIST;
  for (const o of S.enemies) if (o !== e && !o.boss) { const s = o.segs[0], d = bossDist(h.x, h.y, s.x, s.y); if (d < pd) { prey = s; pd = d; } }
  if (prey && pd < heroD + 3) goal = { x: prey.x, y: prey.y, kind: 'prey', d: pd };
  else for (const k of S.keys) { const d = bossDist(h.x, h.y, k.x, k.y); if (d <= BOSS_KEY_HUNT_DIST && d < goal.d) goal = { x: k.x, y: k.y, kind: 'key', d }; }
  return goal;
}
// Which way to head: straight at the goal if it can see it, otherwise down the path flow field (walls-aware, like the enemies).
function bossSeek(e, goal, now) {
  const h = e.pts[0];
  if (bossLOS(h.x, h.y, goal.x, goal.y)) { e.flow = null; return { x: goal.x - h.x, y: goal.y - h.y }; }
  if (!e.flow || now - e.flowAt > BOSS_PATH_MS) {
    e.flowAt = now; e.flow = null;
    const dm = distField(Math.max(0, Math.min(COLS - 1, Math.round(goal.x))), Math.max(0, Math.min(ROWS - 1, Math.round(goal.y))));
    let cx = Math.round(h.x), cy = Math.round(h.y);
    for (let step = 0; step < 3; step++) {
      let best = dm[cy * COLS + cx] >= 0 ? dm[cy * COLS + cx] : Infinity, bx = null, by = null;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = cx + dx, ny = cy + dy;
        if (!inBounds(nx, ny)) continue;
        const v = dm[ny * COLS + nx];
        if (v < 0 || v >= best) continue;
        if (dx && dy && (isWall(cx + dx, cy) || isWall(cx, cy + dy))) continue;   // do not cut a wall corner
        best = v; bx = nx; by = ny;
      }
      if (bx === null) break;
      cx = bx; cy = by; e.flow = { x: bx, y: by };
    }
  }
  return e.flow ? { x: e.flow.x - h.x, y: e.flow.y - h.y } : { x: goal.x - h.x, y: goal.y - h.y };
}
// A push away from nearby walls and mines.
function bossRepel(e) {
  const h = e.pts[0], x0 = Math.round(h.x), y0 = Math.round(h.y);
  let rx = 0, ry = 0;
  for (let ty = y0 - 2; ty <= y0 + 2; ty++) for (let tx = x0 - 2; tx <= x0 + 2; tx++) {
    if (!isWall(tx, ty)) continue;
    const d = Math.max(0.1, bossDist(h.x, h.y, tx, ty));
    if (d < 2.2) { const w = (2.2 - d) / 2.2; rx += (h.x - tx) / d * w; ry += (h.y - ty) / d * w; }
  }
  for (const m of S.mines) {
    const d = Math.max(0.1, bossDist(h.x, h.y, m.x, m.y));
    if (d < 2.5) { const w = (2.5 - d) / 2.5 * BOSS_MINE_FEAR; rx += (h.x - m.x) / d * w; ry += (h.y - m.y) / d * w; }
  }
  return { x: rx, y: ry };
}
// Decides this frame's heading and speed (e.curSpeed). Phases: move -> windup (stands, faces you, telegraph) -> charge (fast, straight).
function bossSteer(e, now, dt) {
  const h = e.pts[0], enraged = e.hp <= e.maxHp * BOSS_ENRAGE_AT, goal = bossGoal(e);
  if (e.volleyReady === undefined) e.volleyReady = now + BOSS_FIRST_VOLLEY_MS;
  let speed = BOSS_TPS * e.speed * (enraged ? BOSS_ENRAGE_SPEED : 1), turn = BOSS_TURN * (enraged ? 1.25 : 1), v;
  if (e.phase === 'windup') {
    speed = 0; turn = BOSS_TURN * 2.5; v = { x: goal.x - h.x, y: goal.y - h.y };
    if (now >= e.phaseUntil) { e.phase = 'charge'; e.phaseUntil = now + BOSS_CHARGE_MS; }
  } else if (e.phase === 'charge') {
    speed *= BOSS_CHARGE_SPEED; turn = BOSS_TURN * 0.35; v = { x: goal.x - h.x, y: goal.y - h.y };
    if (now >= e.phaseUntil) { e.phase = 'move'; e.chargeReady = now + BOSS_CHARGE_CD * (enraged ? 0.6 : 1); }
  } else if (e.phase === 'volley') {                  // stands still, faces you, then fires a fan of orbs
    speed = 0; turn = BOSS_TURN * 2.5; v = { x: goal.x - h.x, y: goal.y - h.y };
    if (now >= e.phaseUntil) { bossVolley(e, goal, enraged); e.phase = 'move'; e.volleyReady = now + BOSS_VOLLEY_CD * (enraged ? 0.6 : 1); }
  } else {
    v = bossSeek(e, goal, now);
    if (goal.kind === 'hero' && now >= e.chargeReady && goal.d >= 4 && goal.d <= 11 && bossLOS(h.x, h.y, goal.x, goal.y)) {
      e.phase = 'windup'; e.phaseUntil = now + BOSS_WINDUP_MS; playSfx('gaze');
    } else if (goal.kind === 'hero' && now >= e.volleyReady && goal.d >= 3 && goal.d <= 12 && bossLOS(h.x, h.y, goal.x, goal.y)) {
      e.phase = 'volley'; e.phaseUntil = now + BOSS_VOLLEY_WINDUP_MS; playSfx('gaze');
    }
  }
  const len = Math.hypot(v.x, v.y) || 1;
  let vx = v.x / len, vy = v.y / len;
  if (e.phase !== 'charge') { const r = bossRepel(e); vx += r.x * BOSS_REPEL; vy += r.y * BOSS_REPEL; }
  if (Math.abs(vx) + Math.abs(vy) > 0.01) {
    const diff = angDiff(e.ang, Math.atan2(vy, vx)), maxTurn = turn * dt;
    e.ang += Math.max(-maxTurn, Math.min(maxTurn, diff));
  }
  e.curSpeed = speed;
}
// Fires spitter orbs (S.spits) from the head: 5 in a fan toward you, or all 8 directions when enraged.
function bossVolley(e, goal, enraged) {
  const h = e.pts[0], hx = Math.round(h.x), hy = Math.round(h.y);
  const ring = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];          // clockwise on screen
  const k = ((Math.round(Math.atan2(goal.y - h.y, goal.x - h.x) / (Math.PI / 4)) % 8) + 8) % 8;   // direction nearest to you
  const picks = enraged ? range(8) : [k - 2, k - 1, k, k + 1, k + 2].map(i => (i + 8) % 8);
  for (const i of picks) S.spits.push({ x: hx, y: hy, px: hx, py: hy, dx: ring[i][0], dy: ring[i][1], dead: false, col: '#ff4d4d' });
  playSfx('shoot');
}
// Moves the head along its heading, sliding along walls. Returns true if a wall got in the way.
function bossMove(e, dt) {
  const h = e.pts[0], step = e.curSpeed * dt, nx = h.x + Math.cos(e.ang) * step, ny = h.y + Math.sin(e.ang) * step;
  if (!bossBlocked(nx, ny)) { h.x = nx; h.y = ny; return false; }
  if (!bossBlocked(nx, h.y)) { h.x = nx; return true; }
  if (!bossBlocked(h.x, ny)) { h.y = ny; return true; }
  return true;
}
// Every other point drags behind the one in front of it, like a rope.
function bossFollow(e) {
  for (let i = 1; i < e.pts.length; i++) {
    const a = e.pts[i - 1], b = e.pts[i], dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy);
    if (d > BOSS_SPACING) { const k = (d - BOSS_SPACING) / d; b.x += dx * k; b.y += dy * k; }
  }
}

// Runs every frame from stepEnemyTimers (enemies.js) for the boss, instead of the grid move.
function bossFrame(e, t) {
  const now = performance.now(), dt = Math.max(0, Math.min(0.05, (t - (e.lastT || t)) / 1000));
  e.lastT = t; e.alpha = 1;
  if (!S.alive || dt <= 0) return;
  if (e.swapPending && now >= e.flashUntil) { e.swapPending = false; bossSwap(e); }
  if (now >= e.pauseUntil) {
    bossSteer(e, now, dt);
    const blocked = bossMove(e, dt);
    if (blocked && e.phase === 'charge') {               // it rammed a wall: dazed for a moment
      e.phase = 'move'; e.chargeReady = now + BOSS_CHARGE_CD; e.pauseUntil = now + BOSS_DAZE_MS; e.flashUntil = Math.max(e.flashUntil, now + 200);
      playSfx('hitEnemy');
      S.popups.push({ x: Math.round(e.pts[0].x), y: Math.round(e.pts[0].y), text: 'Dazed!', age: 0 });
    }
    if (now - e.stuckAt > 1000) {                         // hardly moved in a second: turn around
      const h = e.pts[0];
      if (e.phase === 'move' && bossDist(h.x, h.y, e.stuckX, e.stuckY) < 0.6) bossSwap(e);
      e.stuckAt = now; e.stuckX = e.pts[0].x; e.stuckY = e.pts[0].y;
    }
  }
  bossFollow(e);
  bossSync(e);
  bossEatStuff(e);
  if (!S.enemies.includes(e)) return;
  bossContact(e, now);
}

// ---- Drawing ----------------------------------------------------------------------------------------------
// A smooth big snake: every point drawn with the enemy sprites, scaled up, tail first so the head sits on top.
function drawBossSnake(e) {
  const now = performance.now(), n = e.pts.length, flash = now < e.flashUntil && Math.floor(now / 70) % 2 === 0;
  for (let i = n - 1; i >= 0; i--) {
    const p = e.pts[i], k = i === 0 ? BOSS_SCALE * 1.25 : BOSS_SCALE * (1 - 0.35 * i / (n - 1));
    let fx = e.dir.x, fy = e.dir.y;
    if (i > 0) { const dx = e.pts[i - 1].x - p.x, dy = e.pts[i - 1].y - p.y; if (Math.abs(dx) + Math.abs(dy) > 0.01) { fx = Math.abs(dx) > Math.abs(dy) ? Math.sign(dx) : 0; fy = fx ? 0 : Math.sign(dy); } }
    const cx = p.x * CELL + CELL / 2, cy = p.y * CELL + CELL / 2;
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(k, k); ctx.translate(-cx, -cy);
    drawEnemySeg(i === 0, fx, fy, p.x * CELL, p.y * CELL);
    if (flash) { ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.arc(cx, cy, CELL * 0.46, 0, 6.3); ctx.fill(); }
    ctx.restore();
  }
  const h = e.pts[0], hx = h.x * CELL + CELL / 2, hy = h.y * CELL + CELL / 2;
  ctx.save();
  if (e.phase === 'windup') {                              // telegraph: a pulsing ring and a line showing where it will charge
    const pulse = 0.5 + 0.5 * Math.sin(now / 50);
    ctx.strokeStyle = `rgba(255,77,77,${0.5 + 0.4 * pulse})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(hx, hy, CELL * (0.9 + 0.2 * pulse), 0, 6.3); ctx.stroke();
    ctx.globalAlpha = 0.35; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(hx, hy);
    ctx.lineTo(hx + Math.cos(e.ang) * CELL * 7, hy + Math.sin(e.ang) * CELL * 7); ctx.stroke();
  } else if (e.phase === 'volley') {                      // telegraph: an orange ring that tightens before the orbs fly
    const t = 1 - Math.max(0, Math.min(1, (e.phaseUntil - now) / BOSS_VOLLEY_WINDUP_MS));
    ctx.strokeStyle = `rgba(255,170,60,${0.5 + 0.4 * t})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(hx, hy, CELL * (1.6 - 0.7 * t), 0, 6.3); ctx.stroke();
  } else if (e.hp <= e.maxHp * BOSS_ENRAGE_AT) {          // enraged: a red ring on the head
    ctx.strokeStyle = 'rgba(255,77,77,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(hx, hy, CELL * 0.95, 0, 6.3); ctx.stroke();
  }
  ctx.restore();
}
// A health bar under the wave number, in window pixels (called from draw() in render.js).
function drawBossBar() {
  const b = S.boss;
  if (!b || S.picking || !S.alive || !S.view || !S.enemies.includes(b)) return;
  const W = S.view.cssW, w = Math.min(320, W - 40), x = Math.round((W - w) / 2), y = 60;
  ctx.save();
  ctx.globalAlpha = TEXT_ALPHA + 0.25;
  ctx.fillStyle = 'rgba(20,16,31,.8)'; ctx.fillRect(x - 2, y - 2, w + 4, 12);
  ctx.fillStyle = b.hp <= b.maxHp * BOSS_ENRAGE_AT ? '#ff8a3c' : '#ff4d4d'; ctx.fillRect(x, y, Math.round(w * Math.max(0, b.hp) / b.maxHp), 8);
  ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#14101f'; ctx.lineJoin = 'round';
  ctx.strokeText('The Great Serpent', W / 2, y + 24); ctx.fillStyle = '#fff'; ctx.fillText('The Great Serpent', W / 2, y + 24);
  ctx.restore();
}

// ---- Reward pick (the buff pick screen, reused). Called every frame from loop() in main.js. ----
function openBossReward() {
  if (!S.pendingReward || S.picking || !S.alive) return;
  S.pendingReward = false;
  const pool = BOSS_REWARD_POOL.map(id => BUFFS.findIndex(b => b.id === id)).filter(i => i >= 0);
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  S.pickChoices = pool.slice(0, PICK_CHOICES);
  S.pickIndex = 0; S.pickAfter = performance.now() + BRANCH_LOCKOUT_MS;
  S.dirQueue = [];
  S.picking = true; S.rewardPicking = true; S.branchPicking = false; S.headPicking = false;
  playSfx('merge');
}
function chooseReward(i) {
  if (!S.picking || !S.rewardPicking || performance.now() < S.pickAfter) return;
  const b = BUFFS[S.pickChoices[i]];
  if (!b) return;
  b.apply();
  S.popups.push({ x: S.snake[0].x, y: S.snake[0].y, text: b.name + '!', age: 0 });
  S.picking = false; S.rewardPicking = false;
  const now = performance.now();                       // continue mid-tick, like resume()
  S.last = now - S.alpha * TICK_MS;
  S.heroLast = now - S.heroAlpha * heroInterval();
  resetEnemyClocks();
}