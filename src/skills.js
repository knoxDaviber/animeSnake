// skills.js: active skills carried by followers. Each follower in the chain with a skill (FOLLOWERS[].skill)
// has its own cooldown timer, kept in its roster slot (slot.cd). A skill's fire() returns true if it went off,
// otherwise it stays ready and tries again next tick.

const SKILLS = {
  // Miner: drops a mine on the tile the tail just left, so your own chain can loop back into it.
  mine: { cooldown: MINE_COOLDOWN, fire: dropMine },
};

function dropMine() {
  const t = S.tailLeft;                         // null when the snake grew or did not move this tick
  if (!t || S.mines.length >= MINE_MAX || !tileFree(t.x, t.y)) return false;
  S.mines.push({ x: t.x, y: t.y });
  return true;
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
