// player.js: steering, moving, picking up keys and recruits, and rings and damage.
// Walls, the hazard, enemy snakes, your own body and mine blasts each cost one character per hit
// (the Magician's walls are portals instead, and the Swordsman blocks the first enemy-head hit).
// You die when none are left (see revive.js for what happens next).
// Running into your own TAIL is not a hit: the snake just stops and waits until you choose a direction.

function setDir(x, y) {
  if (S.picking || !S.alive) return; // the run has not started yet, or you are dead
  if (x === -S.dir.x && y === -S.dir.y) return; // no instant reverse
  S.nextDir = { x, y };
  S.waitDir = false; // any steering input ends a stall
}
// A step between neighbouring tiles is -1, 0 or 1. Across a Magician portal it looks like +-(COLS-1): flip it back.
function wrapStep(d) { return Math.abs(d) > 1 ? -Math.sign(d) : d; }
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
  if (gorgonAbsorbs()) { S.invuln = INVULN_TICKS; S.quietHit = true; return; } // a Gorgon's shield took the hit (no blink)
  S.quietHit = false;
  playSfx('hit');
  if (S.snake.length === 1) { S.alive = false; return; } // last character lost
  const t = S.snake.pop(), r = S.roster.pop();           // the tail character is the one dropped
  dropFx(t.x, t.y, (px, py) => drawSegment(r, px, py, false));
}

function playerMove() {
  S.tailLeft = null;
  S.prev = S.snake.map(s => ({ ...s }));
  if (S.waitDir) return;               // stalled: stand still until the player steers (enemies keep moving)
  S.dir = S.nextDir;
  const h = S.snake[0], tail = S.snake[S.snake.length - 1];
  let nx = h.x + S.dir.x, ny = h.y + S.dir.y, portal = null;
  if (!inBounds(nx, ny) && headId() === 'magician') {
    nx = (nx + COLS) % COLS; ny = (ny + ROWS) % ROWS;   // Magician: the wall opens a portal to the other side
    portal = { x1: h.x, y1: h.y, x2: nx, y2: ny };
  }
  if (S.snake.length > 1 && nx === tail.x && ny === tail.y) {
    // Own tail: no hit, but the snake stops. It waits for a new direction, so enemies get time to close in.
    S.dir = { x: wrapStep(h.x - S.snake[1].x), y: wrapStep(h.y - S.snake[1].y) }; // back to the real heading
    S.waitDir = true;
    playSfx('stall');
    return;
  }
  const self = S.snake.some(s => s.x === nx && s.y === ny);
  let en = enemyAt(nx, ny);
  if (en && en.i === 0 && countFollower('medusa') > 0) { killEnemy(en.e); en = null; } // Medusa: touching a head kills it at once
  const blocked = !inBounds(nx, ny) || self || en || (nx === S.hazard.x && ny === S.hazard.y);
  if (blocked) {
    // Wall, hazard, enemy or own body: the snake stays put and loses one character (unless invulnerable).
    if (S.invuln <= 0) {
      if (self && !SELF_HIT_COSTS_RING) S.alive = false;
      else {
        takeHit(en && en.i === 0 ? 'enemyHead' : undefined);
        if (en && en.i === 0 && damageEnemyHead(en.e, 1)) en.e.stun = 4; // head-on: the enemy is hurt too
      }
    }
    return;
  }
  const key = S.keys.find(k => k.x === nx && k.y === ny);   // the key
  let rec = touchableRecruitAt(nx, ny); if (rec && countFollower('mrx') > 0) { shootRecruit(rec, nx, ny); rec = null; }                          // a character that is jumping, ready
  S.snake.unshift({ x: nx, y: ny });
  if (portal) { S.zaps.push({ kind: 'portal', ...portal, age: 0 }); playSfx('portal'); }
  if (rec) {
    // Recruited: the character joins the tail (the snake grows by not shedding its tail tile).
    const last = S.roster[S.roster.length - 1];
    S.roster.push(newSlot(rec.c, last.fx, last.fy));
    S.recruits = S.recruits.filter(r => r !== rec);
    S.popups.push({ x: nx, y: ny, text: FOLLOWERS[rec.c].name + '!', age: 0 });
    playSfx('recruit');
  } else if (S.growQueue.length) {
    // A recruit that walked into your hero joins now: the snake grows instead of shedding its tail.
    const last = S.roster[S.roster.length - 1];
    S.roster.push(newSlot(S.growQueue.shift(), last.fx, last.fy));
  } else S.tailLeft = S.snake.pop();
  if (key) eatKey(key);
  faceSegments();
  const mine = mineAt(nx, ny);
  if (mine) detonateMine(mine); // stepped on a mine
}