// player.js: steering, moving, picking up keys and recruits, and rings and damage.
// Walls, the hazard, enemy snakes, your own body and mine blasts each cost one character per hit.
// You die when none are left (see revive.js for what happens next).
// Running into your own TAIL is not a hit: the snake just stops and waits until you choose a direction.

function setDir(x, y) {
  if (S.picking || !S.alive) return; // the run has not started yet, or you are dead
  if (x === -S.dir.x && y === -S.dir.y) return; // no instant reverse
  S.nextDir = { x, y };
  S.waitDir = false; // any steering input ends a stall
}
// Each segment faces the direction it is travelling in (the head faces the steering direction).
function faceSegments() {
  S.snake.forEach((s, i) => {
    S.roster[i].fx = i === 0 ? S.dir.x : S.snake[i - 1].x - s.x;
    S.roster[i].fy = i === 0 ? S.dir.y : S.snake[i - 1].y - s.y;
  });
}

function takeHit() {
  S.invuln = INVULN_TICKS;
  if (S.snake.length === 1) { S.alive = false; return; } // last character lost
  const t = S.snake.pop(), r = S.roster.pop();           // the tail character is the one dropped
  dropFx(t.x, t.y, (px, py) => drawSegment(r, px, py, false));
}

function playerMove() {
  S.tailLeft = null;
  S.prev = S.snake.map(s => ({ ...s }));
  const wasInvuln = S.invuln > 0;
  if (S.invuln > 0) S.invuln--;
  if (S.waitDir) return;               // stalled: stand still until the player steers (enemies keep moving)
  S.dir = S.nextDir;
  const h = S.snake[0], tail = S.snake[S.snake.length - 1];
  const nx = h.x + S.dir.x, ny = h.y + S.dir.y;
  if (S.snake.length > 1 && nx === tail.x && ny === tail.y) {
    // Own tail: no hit, but the snake stops. It waits for a new direction, so enemies get time to close in.
    S.dir = { x: h.x - S.snake[1].x, y: h.y - S.snake[1].y }; // back to the real heading (keeps no-reverse correct)
    S.waitDir = true;
    return;
  }
  const self = S.snake.some(s => s.x === nx && s.y === ny);
  const en = enemyAt(nx, ny);
  const blocked = !inBounds(nx, ny) || self || en || (nx === S.hazard.x && ny === S.hazard.y);
  if (blocked) {
    // Wall, hazard, enemy or own body: the snake stays put and loses one character (unless invulnerable).
    if (!wasInvuln) {
      if (self && !SELF_HIT_COSTS_RING) S.alive = false;
      else {
        takeHit();
        if (en && en.i === 0 && damageEnemyHead(en.e, 1)) en.e.stun = 4; // head-on: the enemy is hurt too
      }
    }
    return;
  }
  const ate = S.food && nx === S.food.x && ny === S.food.y;   // the key
  const rec = readyRecruitAt(nx, ny);                          // a character that is jumping, ready
  S.snake.unshift({ x: nx, y: ny });
  if (rec) {
    // Recruited: the character joins the tail (the snake grows by not shedding its tail tile).
    const last = S.roster[S.roster.length - 1];
    S.roster.push(newSlot(rec.c, last.fx, last.fy));
    S.recruits = S.recruits.filter(r => r !== rec);
    S.popups.push({ x: nx, y: ny, text: FOLLOWERS[rec.c].name + '!', age: 0 });
  } else S.tailLeft = S.snake.pop();
  if (ate) {
    // Key picked up: it summons a character right away (it still has to walk in). Eating no longer grows the chain.
    addScore(POINTS.food, nx, ny);
    summonRecruit();
    S.food = null;                     // step() puts the next key down (refreshKey in recruits.js)
  }
  faceSegments();
  const mine = mineAt(nx, ny);
  if (mine) detonateMine(mine); // stepped on a mine
}
