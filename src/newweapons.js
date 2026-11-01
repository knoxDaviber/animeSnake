// newweapons.js: the free start weapon, Hook and Black hole. Both weapons are BRANCHES entries (levels.js).

function grantStartWeapon() { // every run starts with one random weapon (called by startRun in buffs.js)
  if (S.pacifist) return;
  const b = BRANCHES[Math.floor(Math.random() * BRANCHES.length)];
  S.weapons.push(b.id); S.wlv[b.id] = 0; S.bt[b.id] = 0;
  S.popups.push({ x: S.snake[0].x, y: S.snake[0].y, text: b.name + '!', age: 0 });
}

// ---- Hook: charges, then smashes the nearest snake head. Comes with bonus shields. ----
function hookShieldAbsorbs() { // asked by takeHit (player.js)
  if (S.hookShields <= 0) return false;
  S.hookShields--;
  S.popups.push({ x: S.snake[0].x, y: S.snake[0].y, text: 'Shielded!', age: 0 });
  playSfx('shield');
  return true;
}
function hookReady() { return (S.bt.hook || 0) >= weaponCooldown(HOOK_COOLDOWN, 'hook'); }
function hookTarget() { // nearest enemy head on screen, within range
  const h = S.snake[0], v = viewTiles();
  let best = null, bd = HOOK_RANGE + 1;
  for (const e of S.enemies) {
    const s = e.segs[0];
    if (!onScreen(s.x, s.y, v)) continue;
    const d = Math.abs(s.x - h.x) + Math.abs(s.y - h.y);
    if (d < bd) { best = e; bd = d; }
  }
  return best;
}
function updateHook(id) {
  S.hookFx.forEach(f => f.age++);
  S.hookFx = S.hookFx.filter(f => f.age < HOOK_FX_TICKS);
  if (!S.hookGiven) {                                   // first tick with the Hook: the bonus shields
    S.hookGiven = true; S.hookShields += HOOK_BONUS_SHIELDS;
    showBanner(`Hook: +${HOOK_BONUS_SHIELDS} shields`, '', '#ffd36b', true);
  }
  S.bt[id] = Math.min((S.bt[id] || 0) + 1, 999);
  if (!hookReady()) return;
  const e = hookTarget();
  if (!e) return;                                       // stays ready until something is in range
  const h = S.snake[0], s = e.segs[0], dmg = weaponDamage(HOOK_DAMAGE, id);
  S.bt[id] = 0;
  S.hookFx.push({ x1: h.x, y1: h.y, x2: s.x, y2: s.y, age: 0 });
  if (!e.boss && !e.wizard) e.stun = Math.max(e.stun, 6);
  S.invuln = Math.max(S.invuln, HOOK_IMMUNE_TICKS); S.quietHit = true;   // a few ticks of immunity, no blink
  playSfx('kick'); playSfx('hitEnemy');
  strikeEnemyAt(s.x, s.y, dmg);
}
function drawHook() { // world space: a pulsing gold ring + "HOOK" while ready, a dashed aim line to the target, a chain flash on firing
  if (!S.alive || S.picking || !S.weapons.includes('hook')) return;
  const now = performance.now(), p = lerpPos(S.prev, 0, S.snake[0], S.heroAlpha), cx = p.x + CELL / 2, cy = p.y + CELL / 2;
  ctx.save();
  if (hookReady()) {
    const pulse = 0.5 + 0.5 * Math.sin(now / 120);
    ctx.strokeStyle = `rgba(255,211,107,${0.6 + 0.4 * pulse})`; ctx.lineWidth = 3;
    ctx.shadowColor = '#ffd36b'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(cx, cy, CELL * (0.8 + 0.15 * pulse), 0, 6.3); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#14101f'; ctx.lineJoin = 'round';
    ctx.strokeText('HOOK', cx, cy - CELL * 0.95); ctx.fillStyle = '#ffd36b'; ctx.fillText('HOOK', cx, cy - CELL * 0.95);
    const e = hookTarget();
    if (e) {
      const s = e.segs[0], tx = s.x * CELL + CELL / 2, ty = s.y * CELL + CELL / 2;
      ctx.strokeStyle = 'rgba(255,211,107,.7)'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.lineDashOffset = -now / 40;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(tx, ty); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(tx, ty, CELL * 0.6, 0, 6.3); ctx.stroke();
    }
  }
  S.hookFx.forEach(f => {                               // the chain flash
    ctx.globalAlpha = 1 - f.age / HOOK_FX_TICKS; ctx.strokeStyle = '#ffd36b'; ctx.lineWidth = 5; ctx.setLineDash([8, 4]);
    ctx.beginPath(); ctx.moveTo(f.x1 * CELL + CELL / 2, f.y1 * CELL + CELL / 2); ctx.lineTo(f.x2 * CELL + CELL / 2, f.y2 * CELL + CELL / 2); ctx.stroke();
  });
  ctx.restore();
}

// ---- Black hole: drops a vortex ahead of you that pulls snakes in, then explodes and fires pellets ----
// Levels: pull radius, damage, and the pellets (4 directions, +4 diagonals at HOLE_DIAG_LEVEL, a second ring at HOLE_RING2_LEVEL).
function holeRadius(id) { return HOLE_RADIUS + Math.floor((S.wlv[id] || 0) / HOLE_RADIUS_LEVELS); }
function holeSpot() { // a few tiles ahead of the hero, backing off from walls
  const h = S.snake[0];
  for (let k = HOLE_AHEAD; k >= 0; k--) {
    const x = h.x + S.dir.x * k, y = h.y + S.dir.y * k;
    if (inBounds(x, y) && !isWall(x, y) && roomOpenAt(x, y)) return { x, y };
  }
  return { x: h.x, y: h.y };
}
function updateHole(id) {
  if (branchReady(id, HOLE_COOLDOWN)) {                 // only drops when a snake is near the spot
    const spot = holeSpot(), v = viewTiles();
    let near = false;
    for (const e of S.enemies) {
      for (const s of e.segs) if (onScreen(s.x, s.y, v) && Math.abs(s.x - spot.x) + Math.abs(s.y - spot.y) <= HOLE_CAST_RANGE) { near = true; break; }
      if (near) break;
    }
    if (near) { branchFired(id); S.holes.push({ x: spot.x, y: spot.y, age: 0, life: HOLE_LIFE, r: holeRadius(id), done: false }); playSfx('portal'); }
  }
  for (const o of S.holes) { o.age++; if (o.age >= o.life) explodeHole(o, id); }
  S.holes = S.holes.filter(o => !o.done);
}
function explodeHole(o, id) {
  o.done = true;
  const lvl = S.wlv[id] || 0, R = HOLE_BLAST_R + Math.floor(lvl / 6), dmg = weaponDamage(HOLE_DAMAGE, id);
  playSfx('explosion');
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    if (dx * dx + dy * dy > R * R + 1) continue;
    const x = o.x + dx, y = o.y + dy;
    if (!inBounds(x, y) || isWall(x, y)) continue;
    S.blasts.push({ x, y, age: 0 });
    strikeEnemyAt(x, y, dmg);
  }
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  if (lvl >= HOLE_DIAG_LEVEL) dirs.push([1, 1], [1, -1], [-1, 1], [-1, -1]);
  const rings = lvl >= HOLE_RING2_LEVEL ? [1, 3] : [1], pd = weaponDamage(HOLE_PELLET_DAMAGE, id);
  for (const k of rings) for (const d of dirs) {
    const x = o.x + d[0] * k, y = o.y + d[1] * k;
    if (!inBounds(x, y) || isWall(x, y)) continue;
    S.bullets.push({ x, y, px: x, py: y, dx: d[0], dy: d[1], dmg: pd, dead: false, col: '#c78bff', boom: true });
  }
}
function pelletBoom(x, y, dmg) { // an explosive pellet hit something (attacks.js updateBullets): a small 3x3 blast
  const d = Math.max(1, Math.ceil(dmg / 2));
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const tx = x + dx, ty = y + dy;
    if (!inBounds(tx, ty) || isWall(tx, ty)) continue;
    S.blasts.push({ x: tx, y: ty, age: 0 });
    if (dx || dy) strikeEnemyAt(tx, ty, d, true);
  }
}
// Enemy AI hooks (stepEnemy in enemies.js): a snake whose head is inside a live vortex heads for its centre.
function holeTarget(e) {
  if (!S.holes || !S.holes.length) return null;
  const h = e.segs[0];
  return S.holes.find(o => !o.done && Math.abs(h.x - o.x) + Math.abs(h.y - o.y) <= o.r) || null;
}
function holePick(e, opts) {
  const o = holeTarget(e), safe = opts.filter(q => !q.headOn), list = safe.length ? safe : opts;
  const dm = distField(o.x, o.y), cost = q => { const v = dm[q.y * COLS + q.x]; return v < 0 ? 1000 + Math.abs(q.x - o.x) + Math.abs(q.y - o.y) : v; };
  return list.reduce((a, b) => cost(b) < cost(a) ? b : a);
}
function drawHoles() { // world space: a spinning purple vortex with a dashed ring showing the pull range
  if (!S.holes || !S.holes.length) return;
  const now = performance.now();
  ctx.save();
  S.holes.forEach(o => {
    const cx = o.x * CELL + CELL / 2, cy = o.y * CELL + CELL / 2, t = Math.min(1, (o.age + S.alpha) / o.life), R = o.r * CELL + CELL / 2;
    ctx.globalAlpha = 0.16; ctx.fillStyle = '#7a3fb5'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.3); ctx.fill();
    ctx.globalAlpha = 0.5; ctx.strokeStyle = '#c78bff'; ctx.lineWidth = 2; ctx.setLineDash([8, 8]); ctx.lineDashOffset = -now / 30;
    ctx.beginPath(); ctx.arc(cx, cy, R * (1 - 0.15 * t), 0, 6.3); ctx.stroke(); ctx.setLineDash([]);
    ctx.globalAlpha = 0.95; ctx.lineWidth = 3;
    for (let k = 0; k < 4; k++) {                       // spiral arms, spinning faster as it nears the blast
      ctx.strokeStyle = k % 2 ? '#c78bff' : '#6bc5ff'; ctx.beginPath();
      for (let a = 0; a < 4.5; a += 0.3) {
        const rad = (a / 4.5) * (16 + 6 * t), ang = a + now / (200 - 120 * t) + k * 1.57;
        const px = cx + Math.cos(ang) * rad, py = cy + Math.sin(ang) * rad;
        a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.fillStyle = '#0d0a18'; ctx.beginPath(); ctx.arc(cx, cy, 6 + 6 * t, 0, 6.3); ctx.fill();
  });
  ctx.restore();
}