// world.js: tile lookups, free-tile checks, text zones, keys (the food) and drop effects.
// The map S.map[y][x] holds one character per tile (legend in rooms.js). Walls, hazards, mud, conveyors, gates and
// ice all live there. Anything that spawns something on the map asks tileFree() first.

// ---- Tiles ----
function tileAt(x, y) { return inBounds(x, y) && S.map ? S.map[y][x] : '#'; }   // outside the world counts as wall
function isWall(x, y) { const t = tileAt(x, y); return t === '#' || t === 'B' || t === 'T' || t === 'D'; }   // push blocks and wall turrets are solid too
function isHazardAt(x, y) { return tileAt(x, y) === 'H'; }
const GATE_DIR = { r: { x: 1, y: 0 }, l: { x: -1, y: 0 }, u: { x: 0, y: -1 }, d: { x: 0, y: 1 } };
const CONVEYOR_DIR = { '>': { x: 1, y: 0 }, '<': { x: -1, y: 0 }, '^': { x: 0, y: -1 }, v: { x: 0, y: 1 } };
// True if the tile is a one-way gate that cannot be entered heading (dx, dy). Other tiles never block here.
function gateBlocks(x, y, dx, dy) { const g = GATE_DIR[tileAt(x, y)]; return !!g && (g.x !== dx || g.y !== dy); }

// The tiles keys, mines and recruits may stand on: plain floor, key spots and mud (not walls, hazards, belts, gates or ice).
const ITEM_FLOOR = '.*e~';

// True if nothing is on the tile: plain floor, and no key, mine, recruit, player or enemy segment.
// Everything that spawns something on the map asks this first. (Enemies walk over food and mines on purpose,
// so enemyCanEnter in enemies.js has its own rules.)
function tileFree(x, y) {
  return inBounds(x, y) && ITEM_FLOOR.includes(S.map[y][x]) && roomOpenAt(x, y) &&
    !S.keys.some(k => k.x === x && k.y === y) &&
    !S.mines.some(m => m.x === x && m.y === y) &&
        !(S.chests || []).some(c => c.x === x && c.y === y) &&   // nothing spawns on a chest
    !S.recruits.some(r => (r.x === x && r.y === y) || (r.tx === x && r.ty === y)) && // a recruit, or where one is heading
    !S.snake.some(s => s.x === x && s.y === y) &&
    !enemyAt(x, y);
}
function randomTile() {
  const rooms = S.openRooms && S.openRooms.length ? S.openRooms : null;
  if (!rooms) return { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
  const ri = rooms[Math.floor(Math.random() * rooms.length)];
  return { x: (ri % GRID) * ROOM + Math.floor(Math.random() * ROOM), y: Math.floor(ri / GRID) * ROOM + Math.floor(Math.random() * ROOM) };
}
// Push blocks ('B'). Returns true if the block at (x, y) slid one tile along (dx, dy). It cannot move into a wall, another
// block, a snake, a key, a mine or a waiting recruit. Pushed onto a hazard it FILLS it: both turn into plain floor.
function pushBlock(x, y, dx, dy) {
  const bx = x + dx, by = y + dy;
  if (!inBounds(bx, by) || tileAt(x, y) !== 'B') return false;
  const fills = tileAt(bx, by) === 'H';
  if (!fills && !tileFree(bx, by)) return false;
  S.map[y][x] = '.';
  S.map[by][bx] = fills ? '.' : 'B';
  playSfx('kick');
  return true;
}
function inTextZone(x, y) {
  const v = S.view, c = S.cam || camTarget();
  if (!v) return false;
  const sx = (x * CELL + CELL / 2 - c.x) * v.scale, sy = (y * CELL + CELL / 2 - c.y) * v.scale;   // window pixels
  return TEXT_ZONES.some(z => {
    const x0 = z.ax === 'l' ? 0 : z.ax === 'r' ? v.cssW - z.w : (v.cssW - z.w) / 2, y0 = z.ay === 't' ? 0 : v.cssH - z.h;
    return sx >= x0 && sx < x0 + z.w && sy >= y0 && sy < y0 + z.h;
  });
}

// ---- Keys: the food ----
// FOOD PRESENCE = how many keys lie on the map at once: KEY_PRESENCE, plus S.keyBonus (a Kingsman fusion adds 1 for the
// rest of the run). refreshKey (recruits.js) tops the map up every tick, unless enough characters are already waiting.
function keyTarget() { return KEY_PRESENCE + S.keyBonus; }
function placeKey() { // one new key: on a key spot of a room if there is a free one, else on any free floor
  const h = S.snake[0], far = t => Math.abs(t.x - h.x) + Math.abs(t.y - h.y) >= KEY_MIN_DIST;
  if (S.keySpots.length && Math.random() < KEY_SPOT_CHANCE) {
    const spots = S.keySpots.filter(t => tileFree(t.x, t.y) && far(t));
    if (spots.length) { const t = spots[Math.floor(Math.random() * spots.length)]; S.keys.push({ x: t.x, y: t.y }); return true; }
  }
  for (let tries = 0; tries < 200; tries++) {
    const t = randomTile();
    if (tileFree(t.x, t.y) && far(t) && !noItems(t.x, t.y)) { S.keys.push(t); return true; }
  }
  return false;
}
function placeFood() { while (S.keys.length < keyTarget() && placeKey()) { /* top up */ } }
// Start of a run: one extra key close ahead of the hero, so the first thing a new player sees is something to eat.
function placeNearKey() {
  const h = S.snake[0];
  for (let tries = 0; tries < 60; tries++) {
    const x = h.x + 4 + Math.floor(Math.random() * 4), y = h.y - 3 + Math.floor(Math.random() * 7);
    if (tileFree(x, y) && !noItems(x, y)) { S.keys.push({ x, y }); return; }
  }
}
// The key closest to the hero (straight-line tiles), for the arrow on the HUD. null if there is none.
function nearestKey() {
  const h = S.snake[0];
  let best = null, bd = Infinity;
  for (const k of S.keys) {
    const d = Math.abs(k.x - h.x) + Math.abs(k.y - h.y);
    if (d < bd) { best = k; bd = d; }
  }
  return best ? { k: best, d: bd } : null;
}

// A drop effect: something fades out and floats up on a tile. draw(px, py) paints it (see render.js).
function dropFx(x, y, draw) { S.drops.push({ x, y, age: 0, draw }); }
function ageDrops() {
  S.drops.forEach(d => d.age++);
  S.drops = S.drops.filter(d => d.age < DROP_TICKS);
}


// ---- Crumbling floor: a 'C' tile the tail has left turns into a hazard, then heals CRUMBLE_RECOVER_TICKS later ----
function crumbleTile(x, y) {
  S.map[y][x] = 'H';
  S.crumbles.push({ x, y, ttl: CRUMBLE_RECOVER_TICKS });
}
function updateCrumbles() { // once per world tick (step in main.js)
  if (!S.crumbles.length) return;
  for (const c of S.crumbles) if (--c.ttl <= 0 && tileAt(c.x, c.y) === 'H') S.map[c.y][c.x] = 'C';   // (a hazard that was filled by a push block stays floor)
  S.crumbles = S.crumbles.filter(c => c.ttl > 0);
}