// snakes.js: how enemy snakes scale with their length, the runner type, and the headbutt.
//  * LONGER = FASTER AND STRONGER. lenSpeed: every segment beyond LEN_SPEED_FROM makes a snake LEN_SPEED_PER faster (enemyInterval in
//    enemies.js). Every key or recruit it eats also gives it ENEMY_EAT_HP more hit points.
//  * BIG snakes (longer than BIG_SNAKE_LEN, bosses excluded): their head hit costs you BIG_SNAKE_HIT_RINGS followers instead of 1
//    (ringsFor, used by takeHit in player.js), and a head hit that would kill one just breaks its chain (bigBreak) down to
//    BIG_SNAKE_KEEP segments. It survives with full hit points. Big snakes wear a red ring (drawEnemyMark in render.js).
//  * RUNNERS (ENEMY_TYPES.runner): flee from you while they are small (BIG_SNAKE_LEN or less), heading for keys and recruits to grow
//    on, RUNNER_EAT_GROWTH segments per bite. Once big they hunt you like any snake. Break their chain and they run again.
//  * HEADBUTT: when two heads collide (headbutt, called by playerMove and stepEnemy after the damage is dealt) the LONGER chain
//    shoves the shorter one back BUMP_TILES tiles. Equal chains stay where they are. Damage is unchanged. Bosses are not shoved.

function isBigSnake(e) { return !e.boss && !e.wizard && e.segs.length > BIG_SNAKE_LEN; }
function ringsFor(e) { return isBigSnake(e) ? BIG_SNAKE_HIT_RINGS : 1; }   // followers you lose to this snake's head
function lenSpeed(e) { return e.boss || e.wizard ? 1 : 1 + LEN_SPEED_PER * Math.max(0, e.segs.length - LEN_SPEED_FROM); }

// Called by damageEnemyHead when a head hit would kill. A big snake loses its chain instead and lives. True if it did.
function bigBreak(e) {
  if (!isBigSnake(e)) return false;
  const faces = e.segs.map((_, k) => faceOf(e, k)), cut = e.segs.splice(BIG_SNAKE_KEEP);
  cut.forEach((s, k) => {
    const f = faces[BIG_SNAKE_KEEP + k];
    dropFx(s.x, s.y, (px, py) => drawEnemySeg(false, f.fx, f.fy, px, py));
  });
  addScore(POINTS.segment * cut.length, cut[0].x, cut[0].y);
  e.hp = hitsToKill(S.wave) * ENEMY_TYPES[e.type || 'normal'].hp;     // back to full hit points
  e.stun = Math.max(e.stun, 4);
  e.prev = e.segs.map(s => ({ ...s }));
  S.popups.push({ x: e.segs[0].x, y: e.segs[0].y, text: 'Chain broken!', age: 0 });
  playSfx('cut');
  return true;
}

// ---- Runners ----
function isFleeing(e) { return e.type === 'runner' && e.segs.length <= BIG_SNAKE_LEN; }
// Picks the move of a fleeing runner from the options stepEnemy built (opts). Never walks into your head if it can help it.
// Heads for food (a key or recruit close to it and not next to you), otherwise away from you along the path map.
function runnerPick(e, opts, head, ph) {
  const safe = opts.filter(o => !o.headOn);
  if (!safe.length) return null;
  let food = null, fd = RUNNER_FOOD_DIST + 1;
  const consider = t => {
    const d = Math.abs(t.x - head.x) + Math.abs(t.y - head.y), dp = Math.abs(t.x - ph.x) + Math.abs(t.y - ph.y);
    if (d < fd && dp > 3) { food = t; fd = d; }
  };
  S.keys.forEach(consider);
  S.recruits.forEach(r => { if (inBounds(r.x, r.y)) consider(r); });
  if (food) {
    const dm = distField(food.x, food.y), cost = o => { const v = dm[o.y * COLS + o.x]; return v < 0 ? 1000 : v; };
    return safe.reduce((a, b) => cost(b) < cost(a) ? b : a);
  }
  const dm = distField(ph.x, ph.y), far = o => { const v = dm[o.y * COLS + o.x]; return v < 0 ? 1000 : v; };   // not reached = far away
  return safe.reduce((a, b) => far(b) > far(a) ? b : a);
}

// ---- Headbutt ----
function heroPushRoom(x, y) {
  return !terrainBlocked(x, y, 0, 0) && roomOpenAt(x, y) && !S.snake.some(s => s.x === x && s.y === y) && !enemyAt(x, y);
}
// The whole chain slides back one tile: the head takes the place of the next segment and a new tail tile is added behind.
// False (nothing happens) if there is no room behind the tail.
function pushHeroBack() {
  const n = S.snake.length;
  if (n === 1) {
    const h = S.snake[0], x = h.x - S.dir.x, y = h.y - S.dir.y;
    if (!heroPushRoom(x, y)) return false;
    S.snake[0] = { x, y };
    return true;
  }
  const t = S.snake[n - 1], b = S.snake[n - 2], x = t.x + wrapStep(t.x - b.x), y = t.y + wrapStep(t.y - b.y);
  if (!heroPushRoom(x, y)) return false;
  S.snake.shift(); S.snake.push({ x, y });
  faceSegments();
  return true;
}
function pushEnemyBack(e) {
  if (e.segs.length < 2 || e.boss || e.wizard) return false;
  const n = e.segs.length, t = e.segs[n - 1], b = e.segs[n - 2], x = t.x + (t.x - b.x), y = t.y + (t.y - b.y);
  if (!enemyCanEnter(x, y)) return false;
  e.segs.shift(); e.segs.push({ x, y });
  e.dir = { x: e.segs[0].x - e.segs[1].x, y: e.segs[0].y - e.segs[1].y };
  return true;
}
// Called after a head-on hit. The longer chain wins the shove. noRecoil = Goliath, who is never pushed.
function headbutt(e, noRecoil) {
  if (!S.alive || e.boss || e.wizard || !S.enemies.includes(e)) return;
  const mine = S.snake.length, theirs = e.segs.length;
  if (theirs > mine) {
    if (noRecoil) return;
    let moved = false;
    for (let k = 0; k < BUMP_TILES; k++) { if (!pushHeroBack()) break; moved = true; }
    if (moved) S.popups.push({ x: S.snake[0].x, y: S.snake[0].y, text: 'Knocked back!', age: 0 });
  } else if (mine > theirs) {
    let moved = false;
    for (let k = 0; k < BUMP_TILES; k++) { if (!pushEnemyBack(e)) break; moved = true; }
    if (moved) S.popups.push({ x: e.segs[0].x, y: e.segs[0].y, text: 'Shoved!', age: 0 });
  }
}