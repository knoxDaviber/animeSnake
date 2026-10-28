// chests.js: weapon chests. They replace the weapon pick that used to pop up every few levels, so no screen interrupts a run.
//  * At the start of a run (newRun in state.js calls placeChests) CHESTS_NEAR chest goes in a room ONE door from the start room
//    and CHESTS_FAR chests go in rooms TWO OR MORE doors away (counted along the world shape, S.layout.dist). Max 4 per run.
//    Rooms flagged noItems (the vault) get none, and a chest only goes on a plain floor tile the hero can really walk to.
//  * Walk onto a chest (playerMove calls openChestAt) and the weapon is yours at once: a random one you do not have yet, with a
//    small banner. Once you own them all, a chest gives every weapon +1 level. In Pacifist (no weapons) it pays coins.
//  * A weapon from a chest starts at CHEST_START_SHARE of your hero level, so a late chest is not a dud.
//  * S.chests = [{ x, y, room }] chests still closed, S.chestsOpened = how many were opened this run.
//  * Placeholder art for now: a brown box with a gold band (drawChests).

// Which tiles the hero could walk to from (sx, sy), counting door tiles as open (so closed rooms count too).
// Walls, push blocks, turrets, hazards and one-way gates block it, so a chest is never put somewhere unreachable.
function reachableTiles(sx, sy) {
  const seen = new Uint8Array(COLS * ROWS), q = [sy * COLS + sx];
  seen[q[0]] = 1;
  for (let h = 0; h < q.length; h++) {
    const i = q[h], x = i % COLS, y = (i - x) / COLS;
    for (const d of DIRS) {
      const nx = x + d.x, ny = y + d.y;
      if (!inBounds(nx, ny)) continue;
      const j = ny * COLS + nx, t = S.map[ny][nx];
      if (seen[j] || t === '#' || t === 'B' || t === 'T' || t === 'H' || GATE_DIR[t]) continue;
      seen[j] = 1; q.push(j);
    }
  }
  return seen;
}

// A random plain floor tile inside room ri (away from its edge walls) that the hero can reach, or null.
function chestSpot(ri, reach) {
  const ox = (ri % GRID) * ROOM, oy = Math.floor(ri / GRID) * ROOM;
  for (let tries = 0; tries < 200; tries++) {
    const x = ox + 2 + Math.floor(Math.random() * (ROOM - 4)), y = oy + 2 + Math.floor(Math.random() * (ROOM - 4));
    if (S.map[y][x] !== '.' || !reach[y * COLS + x]) continue;
    if (S.chests.some(c => c.x === x && c.y === y)) continue;
    return { x, y };
  }
  return null;
}

// Called by newRun (state.js) right after buildWorld.
function placeChests() {
  S.chests = []; S.chestsOpened = 0;
  if (!S.map || !S.rooms || !S.rooms.length || !S.layout) return;
  const h = S.snake[0], reach = reachableTiles(h.x, h.y), L = S.layout, near = [], far = [];
  range(GRID * GRID).forEach(i => {
    if (!L.has[i] || i === L.start) return;
    (L.dist[i] === 1 ? near : far).push(i);          // 1 door away, or 2 or more doors away
  });
  const shuffled = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const put = (rooms, n) => {
    for (const ri of shuffled(rooms)) {
      if (n <= 0) break;
      if (S.rooms[ri] && S.rooms[ri].noItems) continue;
      const t = chestSpot(ri, reach);
      if (t) { S.chests.push({ x: t.x, y: t.y, room: ri }); n--; }
    }
  };
  put(near, CHESTS_NEAR);
  put(far, CHESTS_FAR);
}

// Called by playerMove for the tile the hero just entered.
function openChestAt(x, y) {
  const i = (S.chests || []).findIndex(c => c.x === x && c.y === y);
  if (i < 0) return;
  S.chests.splice(i, 1);
  S.chestsOpened = (S.chestsOpened || 0) + 1;
  grantChestWeapon(x, y);
}

function grantChestWeapon(x, y) {
  playSfx('merge');
  if (S.pacifist) {                                    // no weapons in Pacifist: coins instead
    const c = coinReward(CHEST_PACIFIST_COINS);
    S.coins += c; saveProgress();
    showBanner(`Chest: +${c} coins`, '', '#ffd36b', true);
    return;
  }
  const left = BRANCHES.filter(b => !S.weapons.includes(b.id));
  if (!left.length || S.weapons.length - 1 >= WEAPON_SLOTS) {                                  // you already own everything: every weapon levels up
    S.weapons.forEach(id => { S.wlv[id] = Math.min(WEAPON_LEVEL_CAP, (S.wlv[id] || 0) + 1); });
    showBanner('Chest: all weapons +1 level', '', '#ffd36b', true);
    return;
  }
  const b = left[Math.floor(Math.random() * left.length)];
  S.weapons.push(b.id);
  S.wlv[b.id] = Math.min(WEAPON_LEVEL_CAP, Math.floor(Math.max(0, S.level - 1) * CHEST_START_SHARE));
  S.bt[b.id] = 0;
  S.popups.push({ x, y, text: b.name + '!', age: 0 });
  showBanner(`Chest: ${b.name}!`, '', '#ffd36b', true);
}

// ---- Drawing (world space, called from draw() in render.js). Placeholder art. ----
function drawChests() {
  if (!S.chests || !S.chests.length) return;
  const now = performance.now(), v = viewTiles();
  S.chests.forEach(c => {
    if (!roomOpenAt(c.x, c.y) || !onScreen(c.x, c.y, v)) return;   // a chest in a closed room stays hidden
    const px = c.x * CELL, py = c.y * CELL + Math.round(Math.sin(now / 400 + c.x) * 1);
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(px + 16, py + 27, 12, 3.5, 0, 0, 6.3); ctx.fill();   // shadow
    ctx.fillStyle = '#7a4a2a'; ctx.fillRect(px + 5, py + 13, 22, 13);                                                   // box
    ctx.fillStyle = '#9a6030'; ctx.fillRect(px + 4, py + 8, 24, 6);                                                      // lid
    ctx.fillStyle = '#c9a64b'; ctx.fillRect(px + 14, py + 8, 4, 18);                                                     // gold band
    ctx.fillStyle = '#14101f'; ctx.fillRect(px + 15, py + 15, 2, 3);                                                     // keyhole
    ctx.strokeStyle = '#2b1a0e'; ctx.lineWidth = 2; ctx.strokeRect(px + 4, py + 8, 24, 18);
    if (Math.floor(now / 300) % 3 === 0) {                                                                               // a twinkle
      ctx.fillStyle = '#fff6d0'; ctx.fillRect(px + 24, py + 4, 2, 6); ctx.fillRect(px + 22, py + 6, 6, 2);
    }
    ctx.restore();
  });
}