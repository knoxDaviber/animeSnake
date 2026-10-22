// passives.js: what followers do just by being in the chain. Each helper counts how many of a follower are
// in the chain (slot 0 is the head, so it is skipped), so extra copies stack.

function countFollower(id) {
  let n = 0;
  for (let i = 1; i < S.roster.length; i++) if (FOLLOWERS[S.roster[i].c].id === id) n++;
  return n;
}

// Raiden: extra base points per kill (added before the combo multiplier).
function killBonus() { return RAIDEN_KILL_BONUS * countFollower('raiden'); }

// Keysman: chance that eating a key summons a second character.
function keyDoubleChance() { return Math.min(1, KEYSMAN_DOUBLE_CHANCE * countFollower('keysman')); }

// Medusa: extra stun ticks on an enemy that your sword just hit.
function addSwordStun(e) { e.stun += MEDUSA_STUN_BONUS * countFollower('medusa'); }

// Magneto: a key near your head is pulled one tile closer each tick. Each extra Magneto adds 1 tile of range.
function magnetPull() {
  const n = countFollower('magneto');
  if (!n || !S.food) return;
  const h = S.snake[0], dx = h.x - S.food.x, dy = h.y - S.food.y;
  if (Math.abs(dx) + Math.abs(dy) > MAGNETO_RANGE + n - 1) return;
  const sx = Math.sign(dx), sy = Math.sign(dy);
  const steps = Math.abs(dx) >= Math.abs(dy) ? [{ x: sx, y: 0 }, { x: 0, y: sy }] : [{ x: 0, y: sy }, { x: sx, y: 0 }];
  for (const s of steps) {
    if (!s.x && !s.y) continue;
    const nx = S.food.x + s.x, ny = S.food.y + s.y;
    if (tileFree(nx, ny)) { S.food = { x: nx, y: ny }; return; } // never pulls onto a hazard, mine, recruit or snake
  }
}

// Called once per tick, after the player has moved.
function updatePassives() { magnetPull(); }