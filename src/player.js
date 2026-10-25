// player.js: steering, moving, picking up keys and recruits, and rings and damage.
// Walls, the hazard, enemy snakes, your own body and mine blasts each cost one character per hit
// (the Magician's walls are portals instead, and the Swordsman blocks the first enemy-head hit).
// You die when none are left (see revive.js for what happens next).
// Running into your own TAIL is not a hit: the snake just stops and waits until you choose a direction.
// Batch B: steering goes through a small queue (INPUT_BUFFER), a wall/body hit can be forgiven once (GRACE_TICKS),
// Dev mode moves one tile per key press, Glass cannon dies in one hit, Magician's gift grants portals.

function setDir(x, y) {
  if (S.picking || !S.alive) return; // the run has not started yet, or you are dead
  const ref = S.dirQueue.length ? S.dirQueue[S.dirQueue.length - 1] : S.dir; // compare with the last queued heading
    if (x === -ref.x && y === -ref.y && !(isGoliath() && S.snake.length === 1)) return; // no instant reverse (Goliath alone may)
  S.waitDir = false;                        // any steering input ends a stall
  if (x === ref.x && y === ref.y) { if (S.devMode) S.devStep = true; return; } // same heading: nothing to queue (Dev mode: it is still a step)
  if (S.dirQueue.length >= INPUT_BUFFER) return;        // buffer full
  S.dirQueue.push({ x, y });
  if (S.devMode) S.devStep = true;          // Dev mode: this press is one step
}
// A step between neighbouring tiles is -1, 0 or 1. Across a Magician portal it looks like +-(COLS-1): flip it back.
function wrapStep(d) { return Math.abs(d) > 1 ? Math.sign(d) : d; }
// Each segment faces the direction it is travelling in (the head faces the steering direction).
function faceSegments() {
  S.snake.forEach((s, i) => {
    S.roster[i].fx = i === 0 ? S.dir.x : wrapStep(S.snake[i - 1].x - s.x);
    S.roster[i].fy = i === 0 ? S.dir.y : wrapStep(S.snake[i - 1].y - s.y);
  });
}

// source = 'enemyHead' when an enemy head caused the hit (the Swordsman can block that).
function takeHit(source) {
  S.invuln = INVULN_TICKS + S.invulnBonus;
  if (source === 'enemyHead' && shieldAbsorbs()) { S.invuln = INVULN_TICKS; S.quietHit = true; return; } // blocked: no blink
  if (gorgonAbsorbs() || medusaShieldAbsorbs()) { S.invuln = INVULN_TICKS; S.quietHit = true; return; } // a Gorgon's shield took the hit (no blink)
  S.quietHit = false;
  playSfx('hit');
  if (S.snake.length === 1 || S.glass) { S.alive = false; return; } // last character lost (Glass cannon: any hit that lands)
  if (S.challenge) {                                     // Challenge: a hit costs ALL your followers
    while (S.snake.length > 1) { const t = S.snake.pop(), r = S.roster.pop(); dropFx(t.x, t.y, (px, py) => drawSegment(r, px, py, false)); }
    S.popups.push({ x: S.snake[0].x, y: S.snake[0].y, text: 'All lost!', age: 0 });
    return;
  }
  const t = S.snake.pop(), r = S.roster.pop();           // the tail character is the one dropped
  dropFx(t.x, t.y, (px, py) => drawSegment(r, px, py, false));
}

// Would stepping onto (x, y) heading (dx, dy) hit a wall, hazard or wrong-way gate?
function terrainBlocked(x, y, dx, dy) { return !inBounds(x, y) || isWall(x, y) || isHazardAt(x, y) || gateBlocks(x, y, dx, dy); }
// A bumper turns the heading a quarter turn clockwise, or further if that way is blocked by terrain or your own body.
function bumperTurn(x, y) {
  let d = S.dir;
  for (let k = 0; k < 3; k++) {
    d = { x: -d.y, y: d.x };
    if (!terrainBlocked(x + d.x, y + d.y, d.x, d.y) && !S.snake.some(s => s.x === x + d.x && s.y === y + d.y)) { S.dir = d; S.dirQueue = []; return; }
  }
}
function playerMove() {
  S.tailLeft = null;
  S.prev = S.snake.map(s => ({ ...s }));
  if (S.devMode) { const d = heldDir(); if (d) setDir(d.x, d.y); } // Dev mode: a held key is a step every hero move
  if (S.waitDir) return;               // stalled: stand still until the player steers (enemies keep moving)
  if (S.devMode) { if (!S.devStep) return; S.devStep = false; } // Dev mode: only move when a key was pressed
  const h = S.snake[0], tail = S.snake[S.snake.length - 1];
  const under = tileAt(h.x, h.y), belt = CONVEYOR_DIR[under];
  const stuck = d => terrainBlocked(h.x + d.x, h.y + d.y, d.x, d.y) || S.snake.some((s, i) => i > 0 && s.x === h.x + d.x && s.y === h.y + d.y);   // terrain or your own body   // would this heading hit terrain?
  let forced = false;                                                  // on ice or a conveyor: terrain bumps are free
  if (under === 'I') {                                                 // ice: the heading is locked, unless it points into terrain
    forced = true;
    if (S.dirQueue.length && stuck(S.dir)) S.dir = S.dirQueue.shift();
  } else if (belt) {
    forced = true;
    const against = S.snake.length > 1 && belt.x === -S.dir.x && belt.y === -S.dir.y;
    if (against) {                                                     // a belt running against you: you cannot advance, but you can steer off it
      if (S.dirQueue.length) S.dir = S.dirQueue.shift(); else return;
    } else if (!stuck(belt)) { S.dir = { x: belt.x, y: belt.y }; S.dirQueue = []; }   // a conveyor pushes you
    else if (S.dirQueue.length) S.dir = S.dirQueue.shift();            // it pushes into terrain: you may steer
    else S.dir = { x: belt.x, y: belt.y };
  } else if (S.dirQueue.length) S.dir = S.dirQueue.shift();
  let nx = h.x + S.dir.x, ny = h.y + S.dir.y, portal = null;
  const isMage = headId() === 'magician', gift = !isMage && S.gift && S.giftCharges > 0;
  if (tileAt(nx, ny) === 'B' && !pushBlock(nx, ny, S.dir.x, S.dir.y) && !(isMage || gift)) { // a stuck block just stops the snake, like your own tail
    S.waitDir = true; playSfx('stall'); return;
  }
  if ((isMage || gift) && isWall(nx, ny)) {              // a wall opens a portal: step through to the first open tile beyond it
    for (let k = 2; k <= PORTAL_WALL_REACH; k++) {
      const tx = h.x + S.dir.x * k, ty = h.y + S.dir.y * k;
      if (!inBounds(tx, ty)) break;
      if (isWall(tx, ty)) continue;                      // still inside the wall
      if (tileAt(tx, ty) !== 'H' && !gateBlocks(tx, ty, S.dir.x, S.dir.y) && !S.snake.some(s => s.x === tx && s.y === ty) && !enemyAt(tx, ty)) {
        if (gift) S.giftCharges--;                       // Magician's gift: a limited number of portals per wave
        portal = { x1: h.x, y1: h.y, x2: tx, y2: ty }; nx = tx; ny = ty;
      }
      break;                                             // the first open tile decides: land there, or the wall wins
    }
  }
  if (S.snake.length > 1 && nx === tail.x && ny === tail.y) {
    // Own tail: no hit, but the snake stops. It waits for a new direction, so enemies get time to close in.
    S.dir = { x: wrapStep(h.x - S.snake[1].x), y: wrapStep(h.y - S.snake[1].y) }; // back to the real heading
    S.waitDir = true;
    playSfx('stall');
    bombContact(nx, ny);
    return;
  }
  const self = S.snake.some(s => s.x === nx && s.y === ny);
  let en = enemyAt(nx, ny);
  if (S.pacifist && en) {                                // Pacifist: enemies are solid. Touching one is a stall, like your own tail
    if (S.snake.length > 1) S.dir = { x: wrapStep(h.x - S.snake[1].x), y: wrapStep(h.y - S.snake[1].y) };
    S.waitDir = true; playSfx('stall');
    return;
  }
  if (en && en.i === 0 && countFollower('medusa') > 0) { killEnemy(en.e); en = null; } // Medusa: touching a head kills it at once
  const wallHit = !inBounds(nx, ny) || isWall(nx, ny) || gateBlocks(nx, ny, S.dir.x, S.dir.y);
  const blocked = wallHit || self || en || isHazardAt(nx, ny);
  if (blocked && isGoliath() && !self) {               // Goliath: whatever is in FRONT of him is harmless
    if (en) { if (en.i === 0) { if (damageEnemyHead(en.e, 1)) en.e.stun = 4; } else cutEnemy(en.e, en.i); } // he headbutts it
    S.waitDir = true; playSfx('stall');
    return;
  }
  if (blocked) {
    if (forced && !en && (!self || belt)) { S.waitDir = true; playSfx('stall'); return; }   // ice / conveyor: bumping terrain is free, wait for a new heading
    // Grace: the first wall/body bump is forgiven. The snake waits one hero move, so a turn can still get in.
    if (GRACE_TICKS > 0 && !S.devMode && (wallHit || self) && !en && S.graceUsed < GRACE_TICKS) { S.graceUsed++; return; }
    // Wall, gate, hazard, enemy or own body: the snake stays put and loses one character (unless invulnerable).
    if (S.invuln <= 0) {
      if (self && !SELF_HIT_COSTS_RING) S.alive = false;
      else {
        takeHit(en && en.i === 0 ? 'enemyHead' : undefined);
        if (en && en.i === 0 && damageEnemyHead(en.e, 1)) en.e.stun = 4; // head-on: the enemy is hurt too
        bombContact(wallHit ? h.x : nx, wallHit ? h.y : ny); // Everything is a bomb (a wall blows up on your tile)
      }
    }
    return;
  }
  S.graceUsed = 0;
  S.stuckTicks = 0;
  if (heroKicks()) tryKick(nx, ny, S.dir.x, S.dir.y);   // kicks.js: a kicked item slides away before we step in
  const key = S.keys.find(k => k.x === nx && k.y === ny);   // the key
  let rec = touchableRecruitAt(nx, ny); if (rec && mrxRejects()) { shootRecruit(rec, nx, ny); rec = null; } // a character that is jumping, ready
  S.snake.unshift({ x: nx, y: ny });
  if (portal) { S.zaps.push({ kind: 'portal', ...portal, age: 0 }); playSfx('portal'); }
  if (rec) {
    // Recruited: the character joins the tail (the snake grows by not shedding its tail tile).
    const last = S.roster[S.roster.length - 1];
    S.roster.push(newSlot(rec.c, last.fx, last.fy));
    S.recruits = S.recruits.filter(r => r !== rec);
    onRecruited(rec.c);
    S.popups.push({ x: nx, y: ny, text: FOLLOWERS[rec.c].name + '!', age: 0 });
    playSfx('recruit');
  } else if (S.growQueue.length) {
    // A recruit that walked into your hero joins now: the snake grows instead of shedding its tail.
    const last = S.roster[S.roster.length - 1];
    S.roster.push(newSlot(S.growQueue.shift(), last.fx, last.fy));
  } else S.tailLeft = S.snake.pop();
  if (key) eatKey(key);
  if (S.tailLeft && tileAt(S.tailLeft.x, S.tailLeft.y) === 'C') S.map[S.tailLeft.y][S.tailLeft.x] = 'H';   // crumbling floor: gone once the tail has left it
  if (tileAt(nx, ny) === 'Z') bumperTurn(nx, ny);                                                          // bumper: the heading turns
  faceSegments();
  const mine = mineAt(nx, ny);
  if (mine) detonateMine(mine); // stepped on a mine
  else if (key || rec) bombContact(nx, ny); // Everything is a bomb: eating a key or recruiting
}