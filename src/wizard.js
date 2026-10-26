// wizard.js: the wave 20 boss, the Hollow Wizard. He is NOT a snake: one tile, stationary, and he only moves by teleporting.
//  * He lives in S.enemies as { wizard: true, segs: [one tile] }, so every weapon already reaches him through enemyAt().
//    While his FIELD is up, enemyAt() answers for the whole 5x5 square around him ("a hit on the field"). Three field hits
//    break it. Then he is exposed (WIZARD_HP, no teleporting) for WIZARD_EXPOSED_TICKS, then the field reforms at full
//    strength, he heals, blinks away and the next volley has one more beam.
//  * The field is a soft wall for the hero (playerMove): stepping into it is a stall, never damage. Enemy snakes cannot enter it.
//  * Lasers (S.lasers): charge WIZARD_CHARGE_TICKS (a telegraph that follows you, locked for the last WIZARD_LOCK_TICKS), fire,
//    stay on the field WIZARD_LASER_ACTIVE ticks. Nothing blocks them. They cost you a ring while you stand on one and cut enemy snakes.
// State: S.wizard (the wizard while he lives), S.wizardWait (waiting for a place to appear), S.lasers.
// The reward pick is the buff pick screen (S.pendingReward, boss.js openBossReward).

// ---- The field ----
function wizardAt(e, x, y) { // does tile (x, y) belong to him (his tile, or any tile of the field while it is up)?
  const r = e.field > 0 ? WIZARD_FIELD_R : 0, w = e.segs[0];
  return Math.abs(x - w.x) <= r && Math.abs(y - w.y) <= r;
}

// ---- Appearing and teleporting ----
function startWizard() { // wave 20 begins (startWave in enemies.js)
  S.toSpawn = 0; S.wizardWait = true;
  // (the "The air goes still..." banner is shown 10 s earlier by updateBossWarning in hud.js)
  playSfx('waveStart');
}
// A spot for him: open floor, the whole 5x5 mostly free of walls, nowhere near your chain. Prefers spots at least minDist away.
function wizardPickSpot(minDist) {
  const h = S.snake[0], good = [], R = WIZARD_FIELD_R;
  let best = null, bestD = -1;
  for (let t = 0; t < 400; t++) {
    const x = 2 + Math.floor(Math.random() * (COLS - 4)), y = 2 + Math.floor(Math.random() * (ROWS - 4));
    if (!tileFree(x, y) || noItems(x, y)) continue;
    if (S.snake.some(s => Math.max(Math.abs(s.x - x), Math.abs(s.y - y)) <= R + 1)) continue;
    let open = 0;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) if (!isWall(x + dx, y + dy)) open++;
    if (open < 18) continue;
    const d = Math.abs(x - h.x) + Math.abs(y - h.y);
    if (d >= minDist) good.push({ x, y });
    if (d > bestD) { bestD = d; best = { x, y }; }
  }
  return good.length ? good[Math.floor(Math.random() * good.length)] : best;
}
function makeWizard(x, y) {
  return { segs: [{ x, y }], prev: [{ x, y }], dir: { x: 0, y: 1 }, hp: WIZARD_HP, maxHp: WIZARD_HP, stun: 0, type: 'wizard', wizard: true, fire: 0,
           speed: 1, last: performance.now(), alpha: 1, field: WIZARD_FIELD_HITS, exposed: 0, round: 0, tp: WIZARD_TP_TICKS,
           laserCd: WIZARD_FIRST_LASER, charge: 0, aim: 0, hitAt: 0, flashUntil: 0, blink: 0 };
}
function wizardTeleport(e) {
  const s = wizardPickSpot(WIZARD_MIN_DIST), o = e.segs[0];
  if (!s) return;                                     // no spot found: it stays scheduled and tries again after the next shot
  S.zaps.push({ kind: 'portal', x1: o.x, y1: o.y, x2: s.x, y2: s.y, age: 0 });
  e.segs = [{ x: s.x, y: s.y }]; e.prev = e.segs; e.tp = WIZARD_TP_TICKS; e.tpDue = false; e.blink = 6;
  playSfx('portal');
}
function wizardReform(e) { // the field is back at full strength and he is healed. He blinks away right after his next shot (soon).
  e.field = WIZARD_FIELD_HITS; e.hp = Math.min(e.maxHp, e.hp + Math.ceil(e.maxHp * WIZARD_REFORM_HEAL)); e.round++;
  e.tpDue = true; e.laserCd = Math.min(e.laserCd, 8);
  const o = e.segs[0];
  S.popups.push({ x: o.x, y: o.y - 2, text: 'The field reforms!', age: 0 });
  playSfx('merge');
}

// ---- Damage (damageEnemyHead in enemies.js sends every hit here) ----
// Returns false if he died.
function wizardHit(e, n) {
  const now = performance.now(), o = e.segs[0];
  if (now - e.hitAt < WIZARD_IFRAMES_MS) return true;
  e.hitAt = now; e.flashUntil = now + 200;
  if (e.field > 0) {                                   // a hit on the field
    e.field--;
    playSfx('shield');
    if (e.field > 0) S.popups.push({ x: o.x, y: o.y - 2, text: `Field ${e.field}/${WIZARD_FIELD_HITS}`, age: 0 });
    else {
      e.exposed = WIZARD_EXPOSED_TICKS;
      S.popups.push({ x: o.x, y: o.y - 2, text: 'Field down!', age: 0 });
      for (let dy = -WIZARD_FIELD_R; dy <= WIZARD_FIELD_R; dy++) for (let dx = -WIZARD_FIELD_R; dx <= WIZARD_FIELD_R; dx++)
        if (inBounds(o.x + dx, o.y + dy)) S.blasts.push({ x: o.x + dx, y: o.y + dy, age: 0 });
      playSfx('explosion');
    }
    return true;
  }
  e.hp -= n;                                           // exposed: a real hit
  if (e.hp <= 0) { killEnemy(e); return false; }
  playSfx('hitEnemy');
  S.popups.push({ x: o.x, y: o.y - 1, text: `-${n}`, age: 0 });
  return true;
}
// Called by killEnemy when he dies.
function wizardDefeated(e) {
  S.wizard = null; S.wizardWait = false; S.lasers = [];
  const h = S.snake[0], o = e.segs[0], c = coinReward(WIZARD_COINS);
  for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (inBounds(o.x + dx, o.y + dy)) S.blasts.push({ x: o.x + dx, y: o.y + dy, age: 0 });
  S.coins += c;
  addScore(WIZARD_SCORE, h.x, h.y);
  S.popups.push({ x: h.x, y: h.y - 1, text: `The Hollow Wizard falls! +${c} coins`, age: 0 });
  playSfx('explosion'); playSfx('unlock');
  S.waveTimer = Math.min(S.waveTimer, BOSS_AFTER_TICKS);
  S.pendingReward = true;
  saveProgress();
}

// ---- Lasers ----
function wizardAngles(e, base) { // one beam, or a fan of up to WIZARD_LASER_MAX after each reform
  const n = Math.min(WIZARD_LASER_MAX, 1 + e.round), out = [];
  for (let k = 0; k < n; k++) out.push(base + (k - (n - 1) / 2) * WIZARD_FAN);
  return out;
}
function wizardAim(e) { const w = e.segs[0], h = S.snake[0]; e.aim = Math.atan2(h.y - w.y, h.x - w.x); }
// The tiles under a beam from tile o at angle ang to the edge of the world. Walking in half-tile steps makes the line
// 8-connected, so a snake moving along rows and columns can never slip through it.
function makeLaser(o, ang) {
  const tiles = [], set = new Set(), dx = Math.cos(ang), dy = Math.sin(ang);
  for (let t = 0.5; t < 120; t += 0.5) {
    const x = Math.round(o.x + dx * t), y = Math.round(o.y + dy * t);
    if (!inBounds(x, y)) break;
    const k = y * COLS + x;
    if (!set.has(k)) { set.add(k); tiles.push({ x, y }); }
  }
  return { ox: o.x, oy: o.y, ang, set, tiles, age: 0, life: WIZARD_LASER_ACTIVE, hit: new Set() };
}
function wizardFire(e) {
  const o = e.segs[0];
  wizardAngles(e, e.aim).forEach(a => S.lasers.push(makeLaser(o, a)));
  e.laserCd = WIZARD_LASER_EVERY - WIZARD_CHARGE_TICKS;
  playSfx('lightning'); playSfx('explosion');
  if (e.tpDue && e.field > 0) wizardTeleport(e);      // a scheduled teleport happens right after the shot (the beam stays where it was fired)
}
// Once per world tick: beams age, hurt you while any of your segments is on one, and cut enemy snakes (once per beam).
function updateLasers() {
  if (!S.lasers.length) return;
  for (const l of S.lasers) {
    l.age++;
    if (S.alive && S.invuln <= 0 && S.snake.some(s => l.set.has(s.y * COLS + s.x))) takeHit();
    for (const e of [...S.enemies]) {
      if (e.boss || e.wizard || l.hit.has(e)) continue;
      const i = e.segs.findIndex(s => l.set.has(s.y * COLS + s.x));
      if (i < 0) continue;
      l.hit.add(e);
      if (i === 0) damageEnemyHead(e, 1, true); else cutEnemy(e, i);
    }
  }
  S.lasers = S.lasers.filter(l => l.age < l.life);
}

// ---- The brain: once per world tick (step in main.js) ----
function updateWizard() {
  updateLasers();
  if (S.wizardWait) {                                  // waiting for a place to appear
    if (!S.alive) return;
    const s = wizardPickSpot(WIZARD_MIN_DIST);
    if (!s) return;
    const e = makeWizard(s.x, s.y);
    S.enemies.push(e); S.wizard = e; S.wizardWait = false; e.blink = 6;
    S.zaps.push({ kind: 'portal', x1: s.x, y1: s.y, x2: s.x, y2: s.y, age: 0 });
    showBanner('The Hollow Wizard!', '', '#c78bff');
    playSfx('merge');
    return;
  }
  const e = S.wizard;
  if (!e || !S.alive) return;
  if (e.blink > 0) e.blink--;
  if (e.field <= 0) { if (--e.exposed <= 0) wizardReform(e); }          // exposed: no teleporting
  else if (!e.tpDue && --e.tp <= 0) e.tpDue = true;                     // scheduled: he blinks away right after his next shot
  if (e.charge > 0) {                                  // charging: the aim follows you until the lock
    if (e.charge > WIZARD_LOCK_TICKS) wizardAim(e);
    if (--e.charge === 0) wizardFire(e);
  } else if (--e.laserCd <= 0) { e.charge = WIZARD_CHARGE_TICKS; wizardAim(e); playSfx('gaze'); }
}

// ---- Drawing (world space, called from draw() in render.js) ----
function drawWizardField(e, cx, cy, now) {
  const R = WIZARD_FIELD_R * CELL + CELL / 2, flash = now < e.flashUntil;
  ctx.save();
  ctx.fillStyle = flash ? 'rgba(255,255,255,.28)' : `rgba(150,90,255,${0.09 + 0.04 * Math.sin(now / 250)})`;
  ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
  ctx.strokeStyle = flash ? '#ffffff' : 'rgba(205,160,255,.9)'; ctx.lineWidth = 3;
  ctx.setLineDash([10, 7]); ctx.lineDashOffset = -now / 40;
  ctx.strokeRect(cx - R, cy - R, R * 2, R * 2);
  ctx.setLineDash([]);
  ctx.fillStyle = '#c78bff';
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => ctx.fillRect(cx + sx * R - 4, cy + sy * R - 4, 8, 8));
  for (let k = 0; k < e.field; k++) {                  // one orbiting rune per field hit left
    const a = now / 700 + k * 6.2832 / WIZARD_FIELD_HITS, ox = cx + Math.cos(a) * R * 0.78, oy = cy + Math.sin(a) * R * 0.78;
    ctx.fillStyle = '#14101f'; ctx.beginPath(); ctx.arc(ox, oy, 8, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#e6c9ff'; ctx.beginPath(); ctx.arc(ox, oy, 5, 0, 6.3); ctx.fill();
  }
  ctx.restore();
}
function drawWizard() {
  const e = S.wizard;
  if (!e || !S.enemies.includes(e)) return;
  const now = performance.now(), w = e.segs[0];
  const cx = w.x * CELL + CELL / 2, cy = w.y * CELL + CELL / 2 + Math.round(Math.sin(now / 300) * 2);
  if (e.field > 0) drawWizardField(e, w.x * CELL + CELL / 2, w.y * CELL + CELL / 2, now);
  if (e.blink > 0 && S.tick % 2 === 0) return;
  const hot = e.charge > 0, flash = now < e.flashUntil && e.field <= 0;
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(1.25, 1.25);
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(0, 15, 11, 3.5, 0, 0, 6.3); ctx.fill();            // shadow
  ctx.fillStyle = flash ? '#fff' : '#3b2a66';                                                                          // robe
  ctx.beginPath(); ctx.moveTo(-10, 14); ctx.lineTo(10, 14); ctx.lineTo(6, -5); ctx.lineTo(-6, -5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#2a1d4d'; ctx.fillRect(-7, 6, 14, 2);
  ctx.fillStyle = '#14101f'; ctx.beginPath(); ctx.arc(0, -8, 5.5, 0, 6.3); ctx.fill();                               // hollow face
  ctx.fillStyle = hot ? '#ff4d4d' : '#6bf0ff'; ctx.fillRect(-3.5, -9, 2, 2); ctx.fillRect(1.5, -9, 2, 2);
  ctx.fillStyle = flash ? '#fff' : '#4a3490';                                                                          // hat
  ctx.beginPath(); ctx.moveTo(-9, -11); ctx.lineTo(9, -11); ctx.lineTo(3, -28); ctx.closePath(); ctx.fill();
  ctx.fillRect(-11, -12, 22, 3);
  ctx.fillStyle = '#c9a64b'; ctx.fillRect(-7, -14, 14, 2);
  ctx.fillStyle = '#6b5a3a'; ctx.fillRect(11, -10, 2, 26);                                                             // staff
  const r = hot ? 5 + 2 * Math.sin(now / 40) : 4;
  ctx.fillStyle = hot ? '#ff4d4d' : '#c78bff'; ctx.beginPath(); ctx.arc(12, -13, r, 0, 6.3); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(11, -14, 1.5, 0, 6.3); ctx.fill();
  ctx.restore();
}
function drawLasers() {
  const e = S.wizard, now = performance.now(), L = 120 * CELL;
  ctx.save(); ctx.lineCap = 'round';
  if (e && S.enemies.includes(e) && e.charge > 0) {    // telegraph: thin and purple while it follows you, red and thick once locked
    const lock = e.charge <= WIZARD_LOCK_TICKS, o = e.segs[0], ox = o.x * CELL + CELL / 2, oy = o.y * CELL + CELL / 2;
    ctx.strokeStyle = lock ? 'rgba(255,60,60,.85)' : 'rgba(200,120,255,.5)'; ctx.lineWidth = lock ? 5 : 2;
    ctx.setLineDash(lock ? [] : [12, 9]); ctx.lineDashOffset = -now / 30;
    wizardAngles(e, e.aim).forEach(a => { ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + Math.cos(a) * L, oy + Math.sin(a) * L); ctx.stroke(); });
    ctx.setLineDash([]);
  }
  S.lasers.forEach(l => {                              // the beam: bright at first, thinner and blinking as it runs out
    if (l.age > l.life - 6 && S.tick % 2 === 0) return;
    const t = l.age / l.life, w = (l.age < 2 ? 26 : 18) * (1 - 0.5 * t) + Math.sin(now / 30) * 2;
    const ox = l.ox * CELL + CELL / 2, oy = l.oy * CELL + CELL / 2, ex = ox + Math.cos(l.ang) * L, ey = oy + Math.sin(l.ang) * L;
    ctx.strokeStyle = 'rgba(190,90,255,.55)'; ctx.lineWidth = w * 1.6; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.strokeStyle = '#ff6bd6'; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = w * 0.4; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ex, ey); ctx.stroke();
  });
  ctx.restore();
}
// Window pixels (called after drawBossBar in draw()): the name, the field pips, then his health once the field is down.
function drawWizardBar() {
  const e = S.wizard;
  if (!e || S.picking || !S.alive || !S.view || !S.enemies.includes(e)) return;
  const W = S.view.cssW, w = Math.min(320, W - 40), x = Math.round((W - w) / 2), y = 60;
  ctx.save();
  ctx.globalAlpha = TEXT_ALPHA + 0.25;
  ctx.fillStyle = 'rgba(20,16,31,.8)'; ctx.fillRect(x - 2, y - 2, w + 4, 12);
  if (e.field > 0) {
    const seg = (w - 4 * (WIZARD_FIELD_HITS - 1)) / WIZARD_FIELD_HITS;
    for (let k = 0; k < e.field; k++) { ctx.fillStyle = '#c78bff'; ctx.fillRect(Math.round(x + k * (seg + 4)), y, Math.round(seg), 8); }
  } else { ctx.fillStyle = '#ff4d4d'; ctx.fillRect(x, y, Math.round(w * Math.max(0, e.hp) / e.maxHp), 8); }
  ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#14101f'; ctx.lineJoin = 'round';
  const label = e.field > 0 ? 'The Hollow Wizard' : 'The Hollow Wizard: EXPOSED!';
  ctx.strokeText(label, W / 2, y + 24); ctx.fillStyle = '#fff'; ctx.fillText(label, W / 2, y + 24);
  ctx.restore();
}
// Window pixels: a purple arrow toward him while he is off-screen.
function drawWizardPointer() {
  const e = S.wizard;
  if (!e || S.picking || !S.alive || !S.view || !S.cam || !S.enemies.includes(e)) return;
  const w = e.segs[0];
  if (onScreen(w.x, w.y)) return;
  const v = S.view, p = lerpPos(S.prev, 0, S.snake[0], S.heroAlpha);
  const hx = (p.x + CELL / 2 - S.cam.x) * v.scale, hy = (p.y + CELL / 2 - S.cam.y) * v.scale;
  const a = Math.atan2(w.y - S.snake[0].y, w.x - S.snake[0].x), d = Math.min(v.cssW, v.cssH) * 0.28;
  ctx.save();
  ctx.globalAlpha = TEXT_ALPHA + 0.2; ctx.translate(hx + Math.cos(a) * d, hy + Math.sin(a) * d); ctx.rotate(a);
  ctx.lineWidth = 3; ctx.strokeStyle = '#14101f'; ctx.fillStyle = '#c78bff'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-8, -9); ctx.lineTo(11, 0); ctx.lineTo(-8, 9); ctx.closePath(); ctx.stroke(); ctx.fill();
  ctx.restore();
}
// Called by doRevive (revive.js): reviving against a boss puts the boss back to full health.
function reviveBosses() {
  const now = performance.now(), b = S.boss, w = S.wizard, h = S.snake[0];
  if (b && S.enemies.includes(b)) {                    // the Great Serpent
    b.hp = b.maxHp; b.phase = 'move';
    b.chargeReady = now + BOSS_FIRST_CHARGE_MS; b.volleyReady = now + BOSS_FIRST_VOLLEY_MS;
    b.pauseUntil = Math.max(b.pauseUntil, now + 1000);  // a moment to get your bearings
    S.popups.push({ x: h.x, y: h.y - 1, text: 'The Great Serpent recovers!', age: 0 });
  }
  if (w && S.enemies.includes(w)) {                    // the Hollow Wizard
    w.hp = w.maxHp; w.field = WIZARD_FIELD_HITS; w.exposed = 0;
    w.charge = 0; w.laserCd = WIZARD_FIRST_LASER; w.tpDue = false;
    S.lasers = [];                                     // no beam is left on the field to kill you the moment you are back
    const o = w.segs[0];
    if (Math.max(Math.abs(o.x - h.x), Math.abs(o.y - h.y)) <= WIZARD_FIELD_R + 2) wizardTeleport(w);   // you came back next to him: he blinks away
    S.popups.push({ x: h.x, y: h.y - 1, text: 'The Hollow Wizard recovers!', age: 0 });
  }
}