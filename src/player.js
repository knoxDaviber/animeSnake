// player.js: steering, moving, eating, and rings and damage.
// Walls, the hazard, enemy snakes and your own body each cost one character per hit.
// You die when none are left.

function setDir(x, y) {
  if (x === -S.dir.x && y === -S.dir.y) return; // no instant reverse
  S.nextDir = { x, y };
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
  S.dir = S.nextDir;
  const h = S.snake[0];
  const nx = h.x + S.dir.x, ny = h.y + S.dir.y;
  S.prev = S.snake.map(s => ({ ...s }));
  const self = S.snake.some(s => s.x === nx && s.y === ny);
  const en = enemyAt(nx, ny);
  const blocked = !inBounds(nx, ny) || self || en || (nx === S.hazard.x && ny === S.hazard.y);
  const wasInvuln = S.invuln > 0;
  if (S.invuln > 0) S.invuln--;
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
  const ate = nx === S.food.x && ny === S.food.y;
  S.snake.unshift({ x: nx, y: ny });
  if (ate) {
    const tail = S.roster[S.roster.length - 1];
    S.roster.push({ c: Math.floor(Math.random() * CHARACTERS.length), fx: tail.fx, fy: tail.fy });
    S.score += POINTS.food; placeFood();
  } else S.snake.pop();
  faceSegments();
}
