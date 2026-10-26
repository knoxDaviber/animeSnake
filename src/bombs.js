// bombs.js: fixed bombs (pedestals) and kamikaze snakes. This is the Goliath balance step.
//  * 'P' tiles in a room template are bomb PEDESTALS (S.pedestals, built by buildWorld in rooms.js). Each holds one bomb: a
//    normal mine in S.mines with fixed: true and a bigger blast (reach). When it is gone (kicked away, blown up) a new one
//    appears PEDESTAL_REGEN ticks later. Goliath can kick them, and anything that steps on one sets it off.
//    Fixed bombs do not use up the Miner mine cap (mineMax in mines.js adds them).
//  * Goliath is weak to explosions: a blast that reaches him costs GOLIATH_BLAST_RINGS rings (detonateMine in mines.js).
//  * Kamikaze snakes (ENEMY_TYPES.kamikaze) always chase, and go for the bomb or mine nearest to YOU instead of you. Stepping
//    on it sets it off, and they die in the blast (stepEnemy in enemies.js).

function updatePedestals() { // once per world tick
  if (S.pacifist || !S.pedestals || !S.pedestals.length) return;
  let loose = S.mines.filter(m => m.fixed).length;
  for (const p of S.pedestals) {
    if (mineAt(p.x, p.y)) { p.cd = PEDESTAL_REGEN; continue; }          // the bomb is sitting there
    if (!roomOpenAt(p.x, p.y)) continue;                                  // a closed room stays quiet
    if (--p.cd > 0) continue;
    if (loose >= PEDESTAL_BOMB_CAP || S.snake.some(s => s.x === p.x && s.y === p.y) || enemyAt(p.x, p.y)) { p.cd = 4; continue; }
    S.mines.push({ x: p.x, y: p.y, fixed: true, reach: PEDESTAL_BLAST });
    loose++; p.cd = PEDESTAL_REGEN;
    playSfx('mineDrop');
  }
}

// What a kamikaze runs at: the bomb or mine that is close to it AND close to you (nearest to both), else you.
function kamikazeTarget(e, head, ph) {
  let best = null, bs = Infinity;
  for (const m of S.mines) {
    const dh = Math.abs(m.x - head.x) + Math.abs(m.y - head.y);
    if (dh > KAMI_SIGHT) continue;
    const dp = Math.abs(m.x - ph.x) + Math.abs(m.y - ph.y);
    if (dp > KAMI_HERO_RANGE) continue;                                   // a bomb far from you is not worth the trip
    if (dh + dp < bs) { best = m; bs = dh + dp; }
  }
  return best || chaseTarget(head, ph);
}

// ---- Drawing ----
function drawPedestal(x, y, px, py) { // a stone plinth with a ring that fills while the next bomb is on its way
  ctx.fillStyle = '#3a3440'; ctx.beginPath(); ctx.ellipse(px + 16, py + 20, 13, 8, 0, 0, 6.3); ctx.fill();
  ctx.fillStyle = '#5a5060'; ctx.beginPath(); ctx.ellipse(px + 16, py + 17, 11, 6.5, 0, 0, 6.3); ctx.fill();
  ctx.strokeStyle = '#8a7a68'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(px + 16, py + 17, 11, 6.5, 0, 0, 6.3); ctx.stroke();
  const p = S.pedestals && S.pedestals.find(q => q.x === x && q.y === y);
  if (p && !mineAt(x, y)) {
    ctx.strokeStyle = '#ff8a3c'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(px + 16, py + 16, 6, -1.57, -1.57 + 6.28 * Math.max(0, 1 - p.cd / PEDESTAL_REGEN)); ctx.stroke();
  }
}
function drawFixedBombs() { // an orange pulsing ring around every pedestal bomb, so you can tell it from a normal mine
  const now = performance.now();
  S.mines.forEach(m => {
    if (!m.fixed) return;
    const ip = itemPos(m), cx = ip.x + CELL / 2, cy = ip.y + CELL / 2;
    ctx.save();
    ctx.strokeStyle = `rgba(255,138,60,${0.55 + 0.3 * Math.sin(now / 150)})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, 14 + Math.sin(now / 150) * 1.5, 0, 6.3); ctx.stroke();
    ctx.fillStyle = '#ffd36b'; ctx.fillRect(cx - 1, cy - 19, 3, 5);
    ctx.restore();
  });
}