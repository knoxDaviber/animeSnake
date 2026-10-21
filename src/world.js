// world.js: the food, the hazard, and drop effects.

function placeHazard() { // one static hazard tile, away from the snake's head
  const head = S.snake[0];
  let h;
  do { h = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) }; }
  while (Math.abs(h.x - head.x) + Math.abs(h.y - head.y) < HAZARD_MIN_DIST);
  S.hazard = h;
}
function placeFood() {
  let f;
  do { f = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) }; }
  while (S.snake.some(s => s.x === f.x && s.y === f.y) || (f.x === S.hazard.x && f.y === S.hazard.y));
  S.food = f;
}

// A drop effect: something fades out and floats up on a tile. draw(px, py) paints it (see render.js).
function dropFx(x, y, draw) { S.drops.push({ x, y, age: 0, draw }); }
function ageDrops() {
  S.drops.forEach(d => d.age++);
  S.drops = S.drops.filter(d => d.age < DROP_TICKS);
}
