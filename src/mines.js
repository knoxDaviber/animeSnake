// mines.js: mines on the map and their explosions. A Miner drops them (skills.js); any snake head that
// steps on one sets it off. Enemies do not avoid mines, so the player can lure them in.
// Blast = the mine's tile plus the four tiles around it. Enemy heads lose MINE_DAMAGE hit points, enemy body
// segments are cut off (like the sword), and the player's head loses a character if it is inside the blast.

function mineAt(x, y) { return S.mines.find(m => m.x === x && m.y === y) || null; }

// Blast = the mine's tile plus an arm in each of the 4 directions. Arm length is 1 + MINER_BLAST_BONUS per Miner;
// with a Bomber in the chain the arms reach the edge of the map (like Bomberman).
function blastRange() {
  if (countFollower('bomber') > 0) return Math.max(COLS, ROWS);
  return 1 + MINER_BLAST_BONUS * countFollower('miner');
}
function blastTiles(m) {
  const tiles = [{ x: m.x, y: m.y }], reach = blastRange();
  for (const d of DIRS) for (let k = 1; k <= reach; k++) {
    const x = m.x + d.x * k, y = m.y + d.y * k;
    if (!inBounds(x, y)) break;
    tiles.push({ x, y });
  }
  return tiles;
}

function detonateMine(m) {
  S.mines = S.mines.filter(x => x !== m);
  const tiles = blastTiles(m);
  tiles.forEach(t => S.blasts.push({ x: t.x, y: t.y, age: 0 }));
  for (const t of tiles) {          // look up each tile fresh: an earlier hit can cut or kill a snake
    const hit = enemyAt(t.x, t.y);
    if (!hit) continue;
    if (hit.i === 0) damageEnemyHead(hit.e, MINE_DAMAGE); else cutEnemy(hit.e, hit.i);
  }
  const h = S.snake[0];
  if (S.alive && S.invuln === 0 && tiles.some(t => t.x === h.x && t.y === h.y)) takeHit();
}

// Called once per tick: runs the explosion flash down.
function ageBlasts() {
  S.blasts.forEach(b => b.age++);
  S.blasts = S.blasts.filter(b => b.age < BLAST_TICKS);
}
