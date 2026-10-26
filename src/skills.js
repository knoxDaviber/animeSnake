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
function detonateOldest() { if (S.mines.length) detonateMine(S.mines[0]); return true; } // free-running timer: no mine = nothing happens this cycle
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