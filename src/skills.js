// skills.js: active skills carried by followers. Each follower in the chain with a skill (FOLLOWERS[].skill)
// has its own cooldown timer, kept in its roster slot (slot.cd). A skill's fire(slot, index) returns true if it
// went off, otherwise it stays ready and tries again next tick.

const SKILLS = {
  // Miner: drops a mine on the tile the tail just left, so your own chain can loop back into it.
  mine:      { cooldown: MINE_COOLDOWN, fire: dropMine },
  // Raiden Shogun (3 Raidens fused): a bolt hits the closest enemy tile.
  shogun:    { cooldown: SHOGUN_COOLDOWN, fire: castShogun },
  // Raiden: sets off your oldest mine from afar, every RAIDEN_DETONATE_COOLDOWN ticks.
  remote:    { cooldown: RAIDEN_DETONATE_COOLDOWN, fire: detonateOldest },
  // Bomber (3 Miners fused): same mine drop, shorter cooldown
  bomb:      { cooldown: BOMBER_COOLDOWN, fire: dropMine },
};

function dropMine() {
  const t = S.tailLeft;                         // null when the snake grew or did not move this tick
  if (!t || S.mines.length >= mineMax() || !tileFree(t.x, t.y)) return false;
  S.mines.push({ x: t.x, y: t.y });
  playSfx('mineDrop');
  return true;
}
// Raiden: picks the oldest mine you can SEE on screen and marks it with a thin blue line. A few ticks later it blows.
// No mine in view: nothing happens and the skill stays ready (it fires the moment a mine comes into view).
function detonateOldest(r, i) {
  const v = viewTiles(), m = S.mines.find(q => onScreen(q.x, q.y, v) && !q.armed);   // S.mines is in the order they were laid
  if (!m) return false;
  m.armed = true;
  S.tethers.push({ from: Math.min(i, S.snake.length - 1), mine: m, ttl: RAIDEN_TELEGRAPH_TICKS, max: RAIDEN_TELEGRAPH_TICKS });
  playSfx('tick');
  return true;
}
// Once per world tick: the blue lines count down, then the mine goes off (unless something else already set it off).
function updateTethers() {
  if (!S.tethers || !S.tethers.length) return;
  for (const t of S.tethers) {
    if (!S.mines.includes(t.mine)) { t.ttl = 0; continue; }
    if (--t.ttl <= 0) detonateMine(t.mine);
  }
  S.tethers = S.tethers.filter(t => t.ttl > 0);
}
// World space: a thin blue dashed line from the Raiden to the mine it is about to set off, and a ring closing in on the mine.
function drawTethers() {
  if (!S.tethers || !S.tethers.length) return;
  ctx.save();
  S.tethers.forEach(t => {
    if (!S.mines.includes(t.mine) || !S.snake.length) return;
    const i = Math.min(t.from, S.snake.length - 1), p = lerpPos(S.prev, i, S.snake[i], S.heroAlpha), ip = itemPos(t.mine);
    const ax = p.x + CELL / 2, ay = p.y + CELL / 2, bx = ip.x + CELL / 2, by = ip.y + CELL / 2, k = 1 - t.ttl / t.max;
    ctx.globalAlpha = 0.5 + 0.4 * k; ctx.strokeStyle = '#6bc5ff'; ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]); ctx.lineDashOffset = -performance.now() / 40;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(bx, by, 8 + 6 * (1 - k), 0, 6.3); ctx.stroke();
  });
  ctx.restore();
}
function castShogun(r, i) {
  const h = S.snake[0];
  let best = null, bestD = Infinity;
    const v = viewTiles();
  for (const e of S.enemies) for (const s of e.segs) {
    if (!onScreen(s.x, s.y, v)) continue;      // any segment counts, not just heads
    const d = Math.abs(s.x - h.x) + Math.abs(s.y - h.y);
    if (d < bestD) { best = s; bestD = d; }
  }
  if (!best) return false;
  const from = S.snake[i], dmg = SHOGUN_DMG_MIN + Math.floor(Math.random() * (SHOGUN_DMG_MAX - SHOGUN_DMG_MIN + 1));
  S.zaps.push({ kind: 'bolt', x1: from.x, y1: from.y, x2: best.x, y2: best.y, age: 0,
                jig: range(3).map(() => (Math.random() - 0.5) * 24) });
  playSfx('lightning');
  strikeEnemyAt(best.x, best.y, dmg, true);                       // a head loses `dmg` hit points, a body segment is cut off
  return true;
}

// Called once per tick: runs the bolt / gaze flashes down.
function ageZaps() {
  S.zaps.forEach(z => z.age++);
  S.zaps = S.zaps.filter(z => z.age < ZAP_TICKS);
}

// Called once per tick, after the player has moved.
function updateSkills() {
  for (let i = 1; i < S.roster.length; i++) {   // slot 0 is the head: it attacks through attacks.js
    const r = S.roster[i], sk = SKILLS[FOLLOWERS[r.c].skill];
    if (!sk) continue;
    if (r.cd > 0) r.cd--;
    if (r.cd === 0 && sk.fire(r, i)) r.cd = Math.max(1, Math.round(sk.cooldown * S.cdMult));
  }
}