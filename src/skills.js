// skills.js: active skills carried by followers. Each follower in the chain with a skill (FOLLOWERS[].skill)
// has its own cooldown timer, kept in its roster slot (slot.cd). A skill's fire(slot, index) returns true if it
// went off, otherwise it stays ready and tries again next tick.

const SKILLS = {
  // Miner: drops a mine on the tile the tail just left, so your own chain can loop back into it.
  mine:      { cooldown: MINE_COOLDOWN, fire: dropMine },
  // Raiden: a bolt hits the nearest enemy head.
  lightning: { cooldown: LIGHTNING_COOLDOWN, fire: castLightning },
  // Medusa: freezes every enemy in the line ahead of the head.
  gaze:      { cooldown: GAZE_COOLDOWN, fire: castGaze },
};

function dropMine() {
  const t = S.tailLeft;                         // null when the snake grew or did not move this tick
  if (!t || S.mines.length >= MINE_MAX || !tileFree(t.x, t.y)) return false;
  S.mines.push({ x: t.x, y: t.y });
  return true;
}

function castLightning(r, i) {
  const h = S.snake[0];
  let best = null, bestD = Infinity;
  for (const e of S.enemies) {
    const d = Math.abs(e.segs[0].x - h.x) + Math.abs(e.segs[0].y - h.y);
    if (d < bestD) { best = e; bestD = d; }
  }
  if (!best) return false;
  const from = S.snake[i], to = best.segs[0];  // the bolt leaves the Raiden's own tile
  S.zaps.push({ kind: 'bolt', x1: from.x, y1: from.y, x2: to.x, y2: to.y, age: 0,
                jig: range(3).map(() => (Math.random() - 0.5) * 24) });
  damageEnemyHead(best, LIGHTNING_DAMAGE);      // a kill here feeds the combo like any other
  return true;
}

function castGaze() {
  const h = S.snake[0], d = S.dir, tiles = [], hit = new Set();
  for (let x = h.x + d.x, y = h.y + d.y; inBounds(x, y); x += d.x, y += d.y) {
    tiles.push({ x, y });
    const t = enemyAt(x, y);
    if (t) hit.add(t.e);                        // any segment in the line freezes that whole snake
  }
  if (!hit.size) return false;
  hit.forEach(e => { e.stun = Math.max(e.stun, GAZE_STUN); });
  S.zaps.push({ kind: 'gaze', tiles, age: 0 });
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