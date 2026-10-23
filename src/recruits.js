// recruits.js: recruitment. Growing the chain takes a KEY and a CHARACTER.
//  * The key is the old food (S.food). Eating it summons a random follower right away (summonRecruit).
//  * The character starts one tile OUTSIDE the grid, walks in along a straight lane (1 tile per tick), then
//    stops and jumps on the spot: that jumping means it is ready.
//  * Touch a ready character with your head to recruit it onto the tail (handled in playerMove, player.js).
//    Characters still walking in cannot be recruited yet.
//  * Enemy snakes can kill a recruit by stepping on it (see stepEnemy in enemies.js). Then that key was wasted.
//  * No new key appears while RECRUIT_MAX characters are already waiting.
// A recruit is { c, x, y, px, py, dx, dy, left, tx, ty, ready, age }: c = FOLLOWERS index, x/y = tile now (it may be
// off the grid), px/py = tile one tick ago (for smooth drawing), dx/dy = walking direction, left = tiles still to
// walk, tx/ty = where it will stop, ready = arrived and free to be recruited, age = ticks since it was summoned.

function recruitAt(x, y) { return S.recruits.find(r => r.x === x && r.y === y) || null; }
function touchableRecruitAt(x, y) { return S.recruits.find(r => inBounds(r.x, r.y) && r.x === x && r.y === y) || null; }

// Puts the next key on the map, unless enough characters are already waiting. Called every tick.
function refreshKey() {
  if (!S.keys.length && S.recruits.length < RECRUIT_MAX) placeFood();
}

// Picks a random edge, a random lane, and a walking distance, and starts a character walking in.
// Returns false (the key is wasted) only if no valid lane is found after many tries.
function summonRecruit() {
  for (let tries = 0; tries < 60; tries++) {
    const side = Math.floor(Math.random() * 4);
    const d = DIRS[side];                  // inward heading: 0 = from the left edge, 1 = right, 2 = top, 3 = bottom
    const lane = Math.floor(Math.random() * (side < 2 ? ROWS : COLS));
    const sx = side === 0 ? -1 : side === 1 ? COLS : lane;   // start: one tile outside the grid
    const sy = side === 2 ? -1 : side === 3 ? ROWS : lane;
    const len = RECRUIT_WALK_MIN + Math.floor(Math.random() * (RECRUIT_WALK_MAX - RECRUIT_WALK_MIN + 1));
    const tx = sx + d.x * len, ty = sy + d.y * len;
    if (!inBounds(tx, ty) || !tileFree(tx, ty)) continue;
    if (S.recruits.some(r => r.tx === tx && r.ty === ty)) continue;
    let clear = true;                      // do not walk across the hazard
    for (let k = 1; k <= len; k++) if (sx + d.x * k === S.hazard.x && sy + d.y * k === S.hazard.y) clear = false;
    if (!clear) continue;
    S.recruits.push({ c: randomFollower(), x: sx, y: sy, px: sx, py: sy, dx: d.x, dy: d.y,
                      left: len, tx, ty, ready: false, age: 0 });
    return true;
  }
  return false;
}

// Called once per tick: walks recruits in, and marks them ready once they have arrived (and none of your
// segments is standing on their tile).
function updateRecruits() {
  const h = S.snake[0], touched = [];
  for (const r of S.recruits) {
    r.px = r.x; r.py = r.y; r.age++;
    if (r.left > 0) { r.x += r.dx; r.y += r.dy; r.left--; }
    if (r.x === h.x && r.y === h.y) touched.push(r);   // it walked into your hero: counts as touching it
    r.ready = r.ready || (r.left === 0 && !S.snake.some(s => s.x === r.x && s.y === r.y));
  }
  touched.forEach(r => {
    if (countFollower('mrx') > 0) return shootRecruit(r, h.x, h.y);
    S.recruits = S.recruits.filter(q => q !== r);
    S.growQueue.push(r.c);                              // joins on the next move (playerMove)
    S.popups.push({ x: h.x, y: h.y, text: FOLLOWERS[r.c].name + '!', age: 0 });
  });
}

// An enemy stepped on it: it is gone, and so is the key that summoned it.
function killRecruit(r) {
  S.recruits = S.recruits.filter(x => x !== r);
  const c = r.c;
  dropFx(r.x, r.y, (px, py) => drawSegment({ c, fx: 0, fy: 1 }, px, py, false));
}

// Eats key k (the head stepped on it, or Mr.X pulled it in): points, a summoned character, Keysman bonus.
function eatKey(k) {
  S.keys = S.keys.filter(x => x !== k);
  addScore(POINTS.food, k.x, k.y);
  summonRecruit();
  if (S.recruits.length < RECRUIT_MAX && Math.random() < keyDoubleChance()) summonRecruit(); // Keysman bonus
}

// Mr.X: a recruit you touch is not added to the chain. It is shot at the nearest enemy segment (2-5 damage) and dies.
function shootRecruit(r, x, y) {
  S.recruits = S.recruits.filter(q => q !== r);
  const c = r.c;
  dropFx(r.x, r.y, (px, py) => drawSegment({ c, fx: 0, fy: 1 }, px, py, false));
  let best = null, bestD = Infinity;
  for (const e of S.enemies) for (const s of e.segs) {
    const d = Math.abs(s.x - x) + Math.abs(s.y - y);
    if (d < bestD) { best = s; bestD = d; }
  }
  if (!best) return;
  const dmg = MRX_SHOT_MIN + Math.floor(Math.random() * (MRX_SHOT_MAX - MRX_SHOT_MIN + 1));
  S.zaps.push({ kind: 'bolt', x1: x, y1: y, x2: best.x, y2: best.y, age: 0, jig: range(3).map(() => (Math.random() - 0.5) * 24) });
  strikeEnemyAt(best.x, best.y, dmg);
}