// world.js: the food, the hazard, free-tile checks, and drop effects.

// True if nothing is on the tile: inside the grid, and no hazard, key, mine, recruit, player or enemy segment.
// Everything that spawns something on the map asks this first. (Enemies walk over food and mines on purpose,
// so enemyCanEnter in enemies.js has its own rules.)
function tileFree(x, y) {
  return inBounds(x, y) &&
    !(S.hazard && x === S.hazard.x && y === S.hazard.y) &&
    !S.keys.some(k => k.x === x && k.y === y) &&
    !S.mines.some(m => m.x === x && m.y === y) &&
    !S.recruits.some(r => (r.x === x && r.y === y) || (r.tx === x && r.ty === y)) && // a recruit, or where one is heading
    !S.snake.some(s => s.x === x && s.y === y) &&
    !enemyAt(x, y);
}
function randomTile() { return { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) }; }

function placeHazard() { // one static hazard tile, away from the snake's head
  const head = S.snake[0];
  let h;
  do { h = randomTile(); }
  while (!tileFree(h.x, h.y) || Math.abs(h.x - head.x) + Math.abs(h.y - head.y) < HAZARD_MIN_DIST);
  S.hazard = h;
}
// The "food" is the recruit KEY: eating it summons a character (see recruits.js). With a Kingsman a drop is 1-3 keys.
function placeFood() {
  let n = countFollower('kingsman') > 0 ? 1 + Math.floor(Math.random() * KINGSMAN_BOUNTY_MAX) : 1;
  n = Math.min(n, Math.max(1, RECRUIT_MAX - S.recruits.length));
  for (let i = 0; i < n; i++) {
    let f, tries = 0;
    do { f = randomTile(); } while (!tileFree(f.x, f.y) && ++tries < 200);
    if (tries < 200) S.keys.push(f);
  }
}

// A drop effect: something fades out and floats up on a tile. draw(px, py) paints it (see render.js).
function dropFx(x, y, draw) { S.drops.push({ x, y, age: 0, draw }); }
function ageDrops() {
  S.drops.forEach(d => d.age++);
  S.drops = S.drops.filter(d => d.age < DROP_TICKS);
}
