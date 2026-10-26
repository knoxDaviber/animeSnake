// kicks.js: one shared kick system for mines, keys and waiting recruits, plus the Goliath rules.
// A kick: the hero steps toward an item, the item slides away (KICK_SPEED tiles per world tick) until the next tile is
// blocked (wall, snake, another item...). A sliding mine that hits an enemy explodes. If an item cannot slide at all
// (pinned), the hero just steps on it as usual (eats the key, recruits the character, sets off the mine).
// Goliath (heads.js): hits from the tile he FACES are harmless, hits from any other side hurt. Mines hurt him as usual.

function isGoliath() { return headId() === 'goliath'; }
function heroKicks() { return KICK_ALL_HEROES || isGoliath(); }
// (fx, fy) = the direction from the hero toward whatever touched him. True if Goliath is looking at it.
// Goliath is only hurt from BEHIND: a hit from the front or from either side is harmless. (The name stays so callers need no change.)
function goliathFront(fx, fy) { return isGoliath() && !(fx === -S.dir.x && fy === -S.dir.y); }

// Where to draw a mine or key (smooth while it slides).
function itemPos(o) {
  if (o.px === undefined) return { x: o.x * CELL, y: o.y * CELL };
  return { x: (o.px + (o.x - o.px) * S.alpha) * CELL, y: (o.py + (o.y - o.py) * S.alpha) * CELL };
}

function kickableAt(x, y) {
  const mine = mineAt(x, y);
  if (mine) return { kind: 'mine', o: mine };
  const key = S.keys.find(k => k.x === x && k.y === y);
  if (key) return { kind: 'key', o: key };
  const rec = touchableRecruitAt(x, y);
  if (rec) return { kind: 'recruit', o: rec };
  return null;
}
function canSlideTo(x, y) {
  return inBounds(x, y) && KICK_FLOOR.includes(S.map[y][x]) &&
    !S.snake.some(s => s.x === x && s.y === y) && !enemyAt(x, y) && !kickableAt(x, y);
}
function moveItem(o, x, y) {
  o.x = x; o.y = y;
  if ('tx' in o) { o.tx = x; o.ty = y; o.left = 0; o.ready = true; }   // a recruit: it stops walking in and is ready
}

// Called by playerMove for the tile the hero is about to enter. Returns true if something was kicked.
function tryKick(x, y, dx, dy) {
  const it = kickableAt(x, y);
  if (!it || S.kicks.some(k => k.o === it.o) || !canSlideTo(x + dx, y + dy)) return false;
  const o = it.o;
  o.px = x; o.py = y;
  moveItem(o, x + dx, y + dy);
  S.kicks.push({ kind: it.kind, o, dx, dy, done: false, settled: false });
  S.kickCount++;
  playSfx('kick');
  if (isGoliath() && S.kickCount % KICK_REWARD_EVERY === 0) kickReward();
  return true;
}
// Goliath: every KICK_REWARD_EVERY kicks a random fusion follower joins the chain on his next move.
function kickReward() {
  const fus = FOLLOWERS.map((f, i) => f.fusion ? i : -1).filter(i => i >= 0);
  S.growQueue.push(fus[Math.floor(Math.random() * fus.length)]);
  const h = S.snake[0];
  S.popups.push({ x: h.x, y: h.y, text: `${KICK_REWARD_EVERY} kicks!`, age: 0 });
  playSfx('recruit');
}

function kickAlive(k) { return (k.kind === 'mine' ? S.mines : k.kind === 'key' ? S.keys : S.recruits).includes(k.o); }

// Once per world tick (step in main.js, after updateRecruits).
function updateKicks() {
  for (const k of S.kicks) {
    const o = k.o;
    if (!kickAlive(k)) { k.settled = true; continue; }          // eaten, exploded or killed meanwhile
    o.px = o.x; o.py = o.y;
    if (k.done) {                                               // one tick after stopping: stop drawing it as moving
      k.settled = true;
      if (k.kind !== 'recruit') { delete o.px; delete o.py; }
      continue;
    }
    for (let n = 0; n < KICK_SPEED; n++) {
      const nx = o.x + k.dx, ny = o.y + k.dy;
      if (k.kind === 'mine' && enemyAt(nx, ny)) { detonateMine(o); k.done = true; break; }   // a kicked mine hits a snake
      if (!canSlideTo(nx, ny)) { k.done = true; break; }
      moveItem(o, nx, ny);
    }
  }
  S.kicks = S.kicks.filter(k => !k.settled);
}
// ---- Goliath's key shields: eating a key gives a one-hit shield (max GOLIATH_SHIELD_MAX) instead of a recruit ----
function goliathKeyShield(k) {
  if (S.keyShields < GOLIATH_SHIELD_MAX) {
    S.keyShields++;
    S.popups.push({ x: k.x, y: k.y, text: 'Shield +1', age: 0 });
    playSfx('shieldReady');
  } else S.popups.push({ x: k.x, y: k.y, text: 'Shields full', age: 0 });
}
// Asked by takeHit (player.js). Shields are used up for good.
function goliathShieldAbsorbs() {
  if (!isGoliath() || S.keyShields <= 0) return false;
  S.keyShields--;
  S.popups.push({ x: S.snake[0].x, y: S.snake[0].y, text: 'Shielded!', age: 0 });
  playSfx('shield');
  return true;
}