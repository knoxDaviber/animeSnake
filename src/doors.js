// doors.js: progressive room opening. The world is a GRID x GRID grid of room cells (rooms.js LAYOUTS decide which cells hold a
// room and which stay rock), but only the start room is open at first. Every doorway between two rooms is sealed with door
// tiles ('D', solid for everything). At the waves in DOOR_WAVES a few doors become READY: they glow, and walking into one breaks
// it (breakDoor, called by playerMove) and opens that room. The room carries a TWIST that is a surprise when it opens:
//   variety   a snake type joins the spawn pool early      cache     keys and temp buff blocks lie inside
//   swarm     snakes burst out when you walk well inside   lockdown  the doors seal behind you until its snakes are dead
//   quiet     nothing (rooms flagged noItems, like the vault)
// State (state.js): S.openRooms = open room indexes (row * GRID + column), S.doors = every doorway { a, b, tiles, open, ready },
// S.roomTwist[room], S.extraTypes, S.lockdown, S.pendingDoor. S.layout (rooms.js) says which cells hold a room.
// There is no pick screen: nothing interrupts the run.

const DOOR_TWISTS = { variety: 3, lockdown: 2, swarm: 2, cache: 2 };   // weights
const absTile = (ax, ay, bx, by) => Math.abs(ax - bx) + Math.abs(ay - by);
const cap1 = s => s.charAt(0).toUpperCase() + s.slice(1);
const pickRand = a => a[Math.floor(Math.random() * a.length)];
const roomOx = ri => (ri % GRID) * ROOM, roomOy = ri => Math.floor(ri / GRID) * ROOM;   // top left tile of room cell ri

// ---- Which rooms are open ----
function roomIndexAt(x, y) {
  const rx = Math.max(0, Math.min(GRID - 1, Math.floor(x / ROOM))), ry = Math.max(0, Math.min(GRID - 1, Math.floor(y / ROOM)));
  return ry * GRID + rx;
}
function roomOpenAt(x, y) { return !S.openRooms || S.openRooms.includes(roomIndexAt(x, y)); }
function enemyCap() { return Math.min(ENEMY_CAP, ENEMY_CAP_BASE + (S.openRooms ? S.openRooms.length : GRID * GRID)); }

// ---- Building the doors (called by buildWorld in rooms.js) ----
// A doorway is the 2x2 block of tiles where the openings of two neighbouring rooms meet. Only cells that both hold a room get
// one. If any of its tiles is wall in the template (a room with no opening on that side), there is no door there. Every real
// doorway starts sealed.
function buildDoors(map) {
  const doors = [], N = GRID, L = S.layout, wall = c => c === '#' || c === 'T' || c === 'B';
  for (let ry = 0; ry < N; ry++) for (let rx = 0; rx < N; rx++) {
    if (!L.has[ry * N + rx]) continue;
    [[1, 0], [0, 1]].forEach(([dx, dy]) => {
      const nx = rx + dx, ny = ry + dy;
      if (nx >= N || ny >= N || !L.has[ny * N + nx]) return;
      const tiles = [];
      for (let k = 9; k <= 10; k++) for (let s = 0; s < 2; s++) {
        const x = dx ? rx * ROOM + ROOM - 1 + s : rx * ROOM + k;
        const y = dx ? ry * ROOM + k : ry * ROOM + ROOM - 1 + s;
        tiles.push({ x, y, c: map[y][x] });
      }
      if (tiles.some(t => wall(t.c))) return;
      doors.push({ a: ry * N + rx, b: ny * N + nx, tiles, open: false, ready: false });
    });
  }
  doors.forEach(d => d.tiles.forEach(t => { map[t.y][t.x] = 'D'; }));
  return doors;
}

// ---- Twists ----
function rollTwist(ri) {
  const r = S.rooms[ri];
  if (r.noItems) return { kind: 'quiet' };
  const kinds = S.pacifist ? ['cache'] : Object.keys(DOOR_TWISTS), bag = [];
  kinds.forEach(k => { for (let i = 0; i < DOOR_TWISTS[k]; i++) bag.push(k); });
  const kind = pickRand(bag);
  if (kind === 'variety') {
    const types = Object.keys(ENEMY_TYPES).filter(k => k !== 'normal' && S.wave < ENEMY_TYPES[k].from && !S.extraTypes.includes(k));
    if (!types.length) return { kind: 'cache' };
    return { kind, type: r.favors && types.includes(r.favors) ? r.favors : pickRand(types) };
  }
  return { kind };
}

// ---- Ready doors (no pick screen) ----
// Closed rooms that touch an open room through a real doorway.
function doorCandidates() {
  const out = [];
  S.doors.forEach(d => {
    const ao = S.openRooms.includes(d.a), bo = S.openRooms.includes(d.b);
    if (ao === bo) return;
    const room = ao ? d.b : d.a, from = ao ? d.a : d.b;
    if (!out.some(c => c.room === room)) out.push({ room, from });
  });
  return out;
}
// At a door wave a few doors just become READY: they glow, and walking into one breaks it (breakDoor).
// Called every frame from loop() in main.js (the name is old, there is no pick any more).
function openDoorPick() {
  if (!S.pendingDoor || S.picking || !S.alive || S.lockdown) return;
  S.pendingDoor = false;
  const isReady = ri => S.doors.some(d => d.ready && !d.open && (d.a === ri || d.b === ri));
  const list = doorCandidates().filter(c => !isReady(c.room));
  for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  const rooms = list.slice(0, DOOR_READY_PER_WAVE).map(c => c.room);
  if (!rooms.length) return;
  S.doors.forEach(d => {                          // every doorway from an open room into one of the chosen rooms
    if (d.open || d.ready) return;
    const ao = S.openRooms.includes(d.a), bo = S.openRooms.includes(d.b);
    if (ao !== bo && rooms.includes(ao ? d.b : d.a)) d.ready = true;
  });
  showBanner('A door is ready!', '', '#ffd36b', true);
  playSfx('waveClear');
}
function doorAt(x, y) { return S.doors.find(d => d.tiles.some(t => t.x === x && t.y === y)) || null; }
// True if (x, y) belonged to a READY door and it broke. Its room opens (with a surprise twist) and you walk on through.
function breakDoor(x, y) {
  const d = S.doors.find(q => q.ready && !q.open && q.tiles.some(t => t.x === x && t.y === y));
  if (!d) return false;
  const ri = S.openRooms.includes(d.a) ? d.b : d.a;
  if (S.openRooms.includes(ri)) { d.open = true; d.tiles.forEach(t => { S.map[t.y][t.x] = t.c; }); return true; }
  openRoom(ri, rollTwist(ri));
  return true;
}

// ---- Opening a room ----
function openRoom(ri, tw) {
  S.openRooms.push(ri);
  const state = { ...tw, done: false };
  S.roomTwist[ri] = state;
  S.doors.forEach(d => {                            // every doorway between this room and an open one opens
    if (d.open) return;
    const other = d.a === ri ? d.b : d.b === ri ? d.a : -1;
    if (other < 0 || !S.openRooms.includes(other)) return;
    d.open = true;
    d.tiles.forEach(t => { S.map[t.y][t.x] = t.c; S.blasts.push({ x: t.x, y: t.y, age: 0 }); });
  });
  const h = S.snake[0];
  S.popups.push({ x: h.x, y: h.y, text: 'A door opens!', age: 0 });
  if (S.rooms[ri] && S.rooms[ri].name) showBanner(S.rooms[ri].name, '', '#c9bde6', true);   // the room's name, one quiet line
  playSfx('waveClear');
  if (tw.kind === 'variety') {
    S.extraTypes.push(tw.type); state.done = true;
    S.popups.push({ x: h.x, y: h.y - 1, text: `${cap1(tw.type)} snakes!`, age: 0 });
  } else if (tw.kind === 'cache') { dropCache(ri); state.done = true; }
  else if (tw.kind === 'quiet') state.done = true;
}
function freeTileIn(ri) {
  const ox = roomOx(ri), oy = roomOy(ri);
  for (let i = 0; i < 80; i++) {
    const x = ox + 2 + Math.floor(Math.random() * (ROOM - 4)), y = oy + 2 + Math.floor(Math.random() * (ROOM - 4));
    if (tileFree(x, y) && !inTextZone(x, y)) return { x, y };
  }
  return null;
}
function dropCache(ri) {
  for (let i = 0; i < DOOR_CACHE_KEYS; i++) { const t = freeTileIn(ri); if (t) S.keys.push({ x: t.x, y: t.y }); }
  for (let i = 0; i < DOOR_CACHE_BUFFS; i++) {
    const t = freeTileIn(ri);
    if (t) S.pickups.push({ x: t.x, y: t.y, id: pickRand(Object.keys(TEMP_BUFFS)), ttl: DOOR_CACHE_TTL });
  }
  const h = S.snake[0];
  S.popups.push({ x: h.x, y: h.y - 1, text: 'A cache!', age: 0 });
}

// ---- Spawning inside rooms ----
function makeEnemy(segs, d, type) {
  const T = ENEMY_TYPES[type];
  return { segs, prev: segs.map(s => ({ ...s })), dir: d, hp: hitsToKill(S.wave) * T.hp, stun: 0, type, fire: SPIT_COOLDOWN,
           speed: Math.min(ENEMY_SPEED_MAX, enemyWaveSpeed(S.wave) * T.speed), last: performance.now(), alpha: 1 };
}
// n snakes inside room ri, at least 5 tiles from the hero, ignoring the enemy cap (swarm and lockdown). Returns them.
function spawnInRoom(ri, n) {
  const out = [], ox = roomOx(ri), oy = roomOy(ri), h = S.snake[0];
  for (let tries = 0; tries < 250 && out.length < n; tries++) {
    const type = pickEnemyType(), T = ENEMY_TYPES[type], len = Math.max(2, enemyLength(S.wave) + T.len), d = pickRand(DIRS);
    const sx = ox + 1 + Math.floor(Math.random() * (ROOM - 2)), sy = oy + 1 + Math.floor(Math.random() * (ROOM - 2));
    if (absTile(sx, sy, h.x, h.y) < 5) continue;
    const segs = range(len).map(i => ({ x: sx - d.x * i, y: sy - d.y * i }));
    if (!segs.every(s => roomIndexAt(s.x, s.y) === ri && enemyCanEnter(s.x, s.y) && !recruitAt(s.x, s.y))) continue;
    const e = makeEnemy(segs, d, type);
    e.stun = 4;                                     // a short moment to see them
    S.enemies.push(e); out.push(e);
  }
  return out;
}
// Fallback for normal waves when the camera edge is not in an open room (always the case at the start): a spot in an open
// room, out of view if possible, at least ENEMY_SPAWN_MIN_DIST + 2 tiles from the hero. Called by spawnEnemy (enemies.js).
function spawnEnemyInRoom() {
  const type = pickEnemyType(), T = ENEMY_TYPES[type], len = Math.max(2, enemyLength(S.wave) + T.len), v = viewTiles(), h = S.snake[0];
  for (let tries = 0; tries < 160; tries++) {
    const ri = pickRand(S.openRooms), ox = roomOx(ri), oy = roomOy(ri), d = pickRand(DIRS);
    const sx = ox + 1 + Math.floor(Math.random() * (ROOM - 2)), sy = oy + 1 + Math.floor(Math.random() * (ROOM - 2));
    if (tries < 80 && onScreen(sx, sy, v)) continue;                 // first look for a spot out of view
    if (absTile(sx, sy, h.x, h.y) < ENEMY_SPAWN_MIN_DIST + 2) continue;
    const segs = range(len).map(i => ({ x: sx - d.x * i, y: sy - d.y * i }));
    if (!segs.every(s => enemyCanEnter(s.x, s.y) && roomOpenAt(s.x, s.y) && !recruitAt(s.x, s.y) && !inTextZone(s.x, s.y) && !noItems(s.x, s.y))) continue;
    S.enemies.push(makeEnemy(segs, d, type));
    return true;
  }
  return false;
}
// Fallback for keys: a character that walks in along a straight lane INSIDE an open room (called by summonRecruit, recruits.js).
function summonRecruitInRoom(exceptId) {
  const h = S.snake[0];
  for (let tries = 0; tries < 100; tries++) {
    const ri = pickRand(S.openRooms), ox = roomOx(ri), oy = roomOy(ri), d = pickRand(DIRS);
    const tx = ox + 1 + Math.floor(Math.random() * (ROOM - 2)), ty = oy + 1 + Math.floor(Math.random() * (ROOM - 2));
    const len = RECRUIT_WALK_MIN + Math.floor(Math.random() * (RECRUIT_WALK_MAX - RECRUIT_WALK_MIN + 1));
    const sx = tx - d.x * len, sy = ty - d.y * len;
    if (!inBounds(sx, sy) || !tileFree(tx, ty) || noItems(tx, ty) || absTile(tx, ty, h.x, h.y) < 4) continue;
    if (S.recruits.some(r => r.tx === tx && r.ty === ty)) continue;
    let clear = true;
    for (let k = 0; k <= len; k++) {
      const px = sx + d.x * k, py = sy + d.y * k;
      if (!'.*e~'.includes(tileAt(px, py)) || !roomOpenAt(px, py) || S.snake.some(s => s.x === px && s.y === py)) clear = false;
    }
    if (!clear) continue;
    S.recruits.push({ c: randomFollower(exceptId), x: sx, y: sy, px: sx, py: sy, dx: d.x, dy: d.y, left: len, tx, ty, ready: false, age: 0 });
    playSfx('summon');
    return true;
  }
  return false;
}

// ---- Triggers: swarm and lockdown (once per world tick, from step in main.js) ----
function updateDoors() {
  if (S.lockdown) updateLockdown(S.lockdown);
  if (S.lockdown || S.pacifist || wavesPaused()) return;
  const h = S.snake[0], ri = roomIndexAt(h.x, h.y), tw = S.roomTwist[ri];
  if (!tw || tw.done || (tw.kind !== 'swarm' && tw.kind !== 'lockdown')) return;
  const lx = h.x - roomOx(ri), ly = h.y - roomOy(ri);
  if (lx < 3 || lx > ROOM - 4 || ly < 3 || ly > ROOM - 4) return;     // wait until the hero is well inside
  tw.done = true;
  if (tw.kind === 'swarm') {
    const n = spawnInRoom(ri, DOOR_SWARM_SNAKES).length;
    if (n) { S.popups.push({ x: h.x, y: h.y - 1, text: 'Ambush!', age: 0 }); playSfx('waveStart'); }
  } else startLockdown(ri);
}
function startLockdown(ri) {
  const enemies = spawnInRoom(ri, DOOR_LOCK_SNAKES), tiles = [], h = S.snake[0];
  S.doors.forEach(d => { if (d.open && (d.a === ri || d.b === ri)) d.tiles.forEach(t => tiles.push({ t, sealed: false })); });
  if (!enemies.length || !tiles.length) return;
  S.lockdown = { room: ri, enemies, tiles, age: 0 };
  S.popups.push({ x: h.x, y: h.y - 1, text: 'Locked in!', age: 0 });
  playSfx('waveStart');
}
function updateLockdown(lk) {
  lk.age++;
  for (const s of lk.tiles) {                       // seal each doorway tile as soon as nobody is standing on it
    if (s.sealed || S.snake.some(q => q.x === s.t.x && q.y === s.t.y) || enemyAt(s.t.x, s.t.y)) continue;
    S.map[s.t.y][s.t.x] = 'D'; s.sealed = true;
  }
  const alive = lk.enemies.some(e => S.enemies.includes(e));
  if (alive && lk.age < DOOR_LOCK_MAX_TICKS) return;
  lk.tiles.forEach(s => { S.map[s.t.y][s.t.x] = s.t.c; });
  S.lockdown = null;
  const h = S.snake[0];
  playSfx('waveClear');
  if (alive) { S.popups.push({ x: h.x, y: h.y - 1, text: 'The doors give way...', age: 0 }); return; }
  const c = coinReward(DOOR_LOCK_COINS), t = freeTileIn(lk.room);
  S.coins += c; saveProgress();
  S.popups.push({ x: h.x, y: h.y - 1, text: `Cleared! +${c} coins`, age: 0 });
  if (t) S.pickups.push({ x: t.x, y: t.y, id: pickRand(Object.keys(TEMP_BUFFS)), ttl: DOOR_CACHE_TTL });
}

// ---- Drawing a door tile (scenery.js drawTile calls this) ----
function drawDoorTile(x, y, th, px, py) {
  const locked = !!S.lockdown;                      // doors glow red while you are locked in
  ctx.fillStyle = locked ? '#3a1822' : '#2a2236'; ctx.fillRect(px, py, CELL, CELL);
  ctx.fillStyle = locked ? '#7a2e40' : '#5a4630';
  for (let i = 0; i < 4; i++) ctx.fillRect(px + 2 + i * 8, py, 6, CELL);      // planks
  ctx.fillStyle = '#8a8aa3'; ctx.fillRect(px, py + 5, CELL, 3); ctx.fillRect(px, py + 24, CELL, 3);   // iron bands
  ctx.fillStyle = '#c9a64b'; ctx.fillRect(px + 13, py + 13, 6, 6);            // lock
  const d = doorAt(x, y);
  if (d && d.ready && !d.open) {                    // ready to break: a faint pulsing golden outline
    const a = 0.45 + 0.25 * Math.sin(performance.now() / 300);
    ctx.save();
    ctx.shadowColor = '#ffd36b'; ctx.shadowBlur = 8;
    ctx.strokeStyle = `rgba(255,211,107,${a})`; ctx.lineWidth = 2;
    ctx.strokeRect(px + 1.5, py + 1.5, CELL - 3, CELL - 3);
    ctx.restore();
  }
}