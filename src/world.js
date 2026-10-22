// world.js: the food, the hazard, free-tile checks, and drop effects.

// True if nothing is on the tile: inside the grid, and no hazard, food, mine, player or enemy segment.
// Everything that spawns something on the map asks this first. (Enemies walk over food and mines on purpose,
// so enemyCanEnter in enemies.js has its own rules.)
function tileFree(x, y) {
  return inBounds(x, y) &&
    !(S.hazard && x === S.hazard.x && y === S.hazard.y) &&
    !(S.food && x === S.food.x && y === S.food.y) &&
    !S.mines.some(m => m.x === x && m.y === y) &&
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
function placeFood() {
  let f;
  do { f = randomTile(); } while (!tileFree(f.x, f.y));
  S.food = f;
}

// A drop effect: something fades out and floats up on a tile. draw(px, py) paints it (see render.js).
function dropFx(x, y, draw) { S.drops.push({ x, y, age: 0, draw }); }
function ageDrops() {
  S.drops.forEach(d => d.age++);
  S.drops = S.drops.filter(d => d.age < DROP_TICKS);
}
