// tempbuffs.js: temporary buffs dropped by enemy snakes. A dead enemy may leave a block on a free tile (maybeDropBuff,
// called by killEnemy). Touch it with the hero (collectPickup, called by playerMove) and the buff runs for a few
// seconds. S.tb[id] = ticks left, S.pickups = blocks on the map { x, y, id, ttl }. Taking the same buff again refreshes it.
//   Ghost body  followers do not collide with your own head (player.js)     Haste   hero speed up (passives.js)
//   Magnet      keys are pulled in from max range (passives.js)             Frenzy  weapon cooldowns halved (heads.js)
//   Bubble      absorbs one hit (takeHit in player.js)

const TEMP_BUFFS = {
  ghost:  { name: 'Ghost body', color: '#c9bde6', ticks: TB_GHOST_TICKS,  letter: 'G' },
  haste:  { name: 'Haste',      color: '#6bc5ff', ticks: TB_HASTE_TICKS,  letter: 'H' },
  magnet: { name: 'Magnet',     color: '#c78bff', ticks: TB_MAGNET_TICKS, letter: 'M' },
  bubble: { name: 'Bubble',     color: '#ff9ad5', ticks: TB_BUBBLE_TICKS, letter: 'B' },
  frenzy: { name: 'Frenzy',     color: '#ff8a3c', ticks: TB_FRENZY_TICKS, letter: 'F' },
};

function newTempBuffs() { const o = {}; for (const id in TEMP_BUFFS) o[id] = 0; return o; }

// Called by killEnemy after the enemy is removed.
function maybeDropBuff(e) {
  if (S.pacifist || !S.alive) return;
  if (!e.boss && Math.random() >= TB_DROP_CHANCE) return;
  const ids = Object.keys(TEMP_BUFFS), pref = TB_PREFER[e.type];
  const id = pref && Math.random() < TB_PREFER_CHANCE ? pref : ids[Math.floor(Math.random() * ids.length)];
  const seg = e.segs.find(s => tileFree(s.x, s.y) && !noItems(s.x, s.y));   // first segment lying on free floor
  if (!seg) return;
  S.pickups.push({ x: seg.x, y: seg.y, id, ttl: TB_PICKUP_TICKS });
}

// Called by playerMove for the tile the hero just entered.
function collectPickup(x, y) {
  const p = S.pickups.find(q => q.x === x && q.y === y);
  if (!p) return;
  S.pickups = S.pickups.filter(q => q !== p);
  const def = TEMP_BUFFS[p.id];
  S.tb[p.id] = def.ticks;
  S.popups.push({ x, y, text: def.name + '!', age: 0 });
  playSfx('recruit');
}

// Once per world tick (step in main.js).
function updateTempBuffs() {
  for (const id in S.tb) if (S.tb[id] > 0) S.tb[id]--;
  S.pickups.forEach(p => p.ttl--);
  S.pickups = S.pickups.filter(p => p.ttl > 0);
}

// Bubble: takes one hit, then it is gone. Asked by takeHit.
function bubbleAbsorbs() {
  if (S.tb.bubble <= 0) return false;
  S.tb.bubble = 0;
  S.popups.push({ x: S.snake[0].x, y: S.snake[0].y, text: 'Bubble pop!', age: 0 });
  playSfx('shield');
  return true;
}

// ---- Drawing (world space, called from draw() in render.js) ----
function drawPickups() {
  const now = performance.now();
  S.pickups.forEach(p => {
    if (p.ttl <= 16 && S.tick % 2 === 0) return;            // blinks when about to vanish
    const def = TEMP_BUFFS[p.id], x = p.x * CELL, y = p.y * CELL + Math.round(Math.sin(now / 200 + p.x) * 2);
    ctx.save();
    ctx.fillStyle = 'rgba(20,16,31,.85)'; ctx.beginPath(); ctx.arc(x + 16, y + 16, 12, 0, 6.3); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = def.color; ctx.stroke();
    ctx.fillStyle = def.color; ctx.font = 'bold 14px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(def.letter, x + 16, y + 17);
    ctx.restore();
  });
}
function drawTempAuras() { // a ring around the hero while the Bubble is up
  if (!S.alive || S.picking || S.tb.bubble <= 0) return;
  const p = lerpPos(S.prev, 0, S.snake[0], S.heroAlpha);
  ctx.save();
  ctx.strokeStyle = TEMP_BUFFS.bubble.color; ctx.lineWidth = 2; ctx.globalAlpha = 0.85;
  ctx.beginPath(); ctx.arc(p.x + CELL / 2, p.y + CELL / 2, CELL / 2 + 5, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}