// passives.js: what followers do just by being in the chain. Each helper counts how many of a follower are
// in the chain (slot 0 is the head, so it is skipped), so extra copies stack.

function countFollower(id) {
  let n = 0;
  for (let i = 1; i < S.roster.length; i++) if (FOLLOWERS[S.roster[i].c].id === id) n++;
  return n;
}

// Raiden: extra base points per kill (added before the combo multiplier).
function killBonus() { return RAIDEN_KILL_BONUS * countFollower('raiden') + S.bounty; }

// Keysman: chance that eating a key summons a second character.
function keyDoubleChance() { return Math.min(KEYSMAN_MAX_CHANCE, KEYSMAN_DOUBLE_CHANCE * countFollower('keysman')); }

// Medusa: extra stun ticks on an enemy that your sword just hit.
function addSwordStun(e) { e.stun += MEDUSA_STUN_BONUS * countFollower('medusa'); }

// Enemies chase you more for every Magneto in the chain.
function enemyChase() { return Math.min(0.95, ENEMY_CHASE + MAGNETO_CHASE_BONUS * countFollower('magneto')); }

// Magneto: keys near your head are pulled one tile closer each tick (range 3, +1 per extra Magneto, max 4).
// Mr.X: pulls from the max range and eats any key within the 3x3 around your head.
function magnetRange() {
  if (countFollower('mrx') > 0) return MAGNETO_MAX_RANGE;
  return Math.min(MAGNETO_MAX_RANGE, MAGNETO_RANGE + countFollower('magneto') - 1);
}
function magnetPull() {
  if (!S.keys.length || !(countFollower('magneto') + countFollower('mrx'))) return;
  const h = S.snake[0], reach = magnetRange(), mrx = countFollower('mrx') > 0;
  for (const k of [...S.keys]) {
    if (mrx && Math.abs(k.x - h.x) <= 1 && Math.abs(k.y - h.y) <= 1) { eatKey(k); continue; }
    const dx = h.x - k.x, dy = h.y - k.y;
    if (Math.abs(dx) + Math.abs(dy) > reach) continue;
    const sx = Math.sign(dx), sy = Math.sign(dy);
    const steps = Math.abs(dx) >= Math.abs(dy) ? [{ x: sx, y: 0 }, { x: 0, y: sy }] : [{ x: 0, y: sy }, { x: sx, y: 0 }];
    for (const s of steps) {
      if (!s.x && !s.y) continue;
      const nx = k.x + s.x, ny = k.y + s.y;
      if (tileFree(nx, ny)) { k.x = nx; k.y = ny; break; } // never pulls onto a hazard, mine, recruit or snake
    }
  }
}

// Called once per tick, after the player has moved.
function updatePassives() { magnetPull(); }