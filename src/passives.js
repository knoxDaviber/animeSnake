// passives.js: what followers do just by being in the chain. Each helper counts how many of a follower are
// in the chain (slot 0 is the head, so it is skipped), so extra copies stack.

function countFollower(id) {
  let n = 0;
  for (let i = 1; i < S.roster.length; i++) if (FOLLOWERS[S.roster[i].c].id === id) n++;
  return n;
}
// Mr.X rejects (shoots) new recruits, except in Pacifist where nothing may be hurt.
function mrxRejects() { return countFollower('mrx') > 0 && !S.pacifist; }

// Kill bonus: only the Bounty hunter buff now (Raiden gives hero speed instead).
function killBonus() { return S.bounty; }

// Keysman: chance that eating a key summons a second character.
function keyDoubleChance() { return Math.min(KEYSMAN_MAX_CHANCE, KEYSMAN_DOUBLE_CHANCE * countFollower('keysman')); }

// Enemies chase you more for every Magneto in the chain.
function enemyChase() { return Math.min(0.95, ENEMY_CHASE + MAGNETO_CHASE_BONUS * countFollower('magneto') + RET_PRESSURE_CHASE * pressure()); }

// Magneto: keys near your head are pulled one tile closer each tick (range 3, +1 per extra Magneto, max 4).
// Mr.X: pulls from the max range and eats any key within the 3x3 around your head.
function magnetRange() {
  if (countFollower('mrx') > 0 || S.tb.magnet > 0) return MAGNETO_MAX_RANGE;
  return Math.min(MAGNETO_MAX_RANGE, MAGNETO_RANGE + countFollower('magneto') - 1);
}
function magnetPull() {
  if (!S.keys.length || !(countFollower('magneto') + countFollower('mrx') + (S.tb.magnet > 0 ? 1 : 0))) return;
  const h = S.snake[0], reach = magnetRange(), mrx = countFollower('mrx') > 0;
  for (const k of [...S.keys]) {
    if (mrx && Math.abs(k.x - h.x) <= 1 && Math.abs(k.y - h.y) <= 1) { eatKey(k); continue; }
    const dx = h.x - k.x, dy = h.y - k.y;
    if (Math.abs(dx) + Math.abs(dy) > reach) continue;
    const sx = Math.sign(dx), sy = Math.sign(dy);
    const steps = Math.abs(dx) >= Math.abs(dy) ? [{ x: sx, y: 0 }, { x: 0, y: sy }] : [{ x: 0, y: sy }, { x: sx, y: 0 }];
    for (const s of steps) {
      if (!s.x && !s.y) continue;
      const nx = k.x + s.x, ny = k.y + s.y;
      if (tileFree(nx, ny)) { k.x = nx; k.y = ny; break; } // never pulls onto a hazard, mine, recruit or snake
    }
  }
}

// Hero speed: 1 = one tile per world tick. 1.5 = 1.5 tiles per tick. Batch 2 adds the Raiden bonus and Gorgon slowdown
// to the line marked below. Only the hero uses this.
function heroSpeed() {
  const raiden = Math.min(RAIDEN_MAX_BONUS, RAIDEN_SPEED_BONUS * countFollower('raiden'));
  const gorgon = Math.min(GORGON_MAX_SLOW, GORGON_SLOW * countFollower('gorgon'));
  const m = HERO_SPEED_TEST * (1 + raiden + S.speedBonus + (S.tb.haste > 0 ? TB_HASTE : 0) + SHOGUN_SPEED_BONUS * countFollower('shogun') - gorgon - MEDUSA_SLOW * countFollower('medusa'));
    const mud = S.map && tileAt(S.snake[0].x, S.snake[0].y) === '~' ? MUD_SLOW : 1;
  return Math.min(HERO_SPEED_MAX, Math.max(HERO_SPEED_MIN, HERO_BASE_SPEED * m * mud * (isGoliath() ? GOLIATH_SPEED : 1)));
}
function heroInterval() { return TICK_MS / heroSpeed(); } // ms between hero moves
// Gorgon shields. Each Gorgon (the first GORGON_MAX_SHIELDS in the chain) holds one 1-hit shield. Its slot's cd is the
// recharge: 0 = ready. takeHit (player.js) asks gorgonAbsorbs() for every hit.
function gorgonSlots() {
  const list = [];
  for (let i = 1; i < S.roster.length && list.length < GORGON_MAX_SHIELDS; i++)
    if (FOLLOWERS[S.roster[i].c].id === 'gorgon') list.push(i);
  return list;
}
function gorgonReady() { return gorgonSlots().filter(i => S.roster[i].cd === 0).length; }
function gorgonAbsorbs() {
  const i = gorgonSlots().find(k => S.roster[k].cd === 0);
  if (i === undefined) return false;
  S.roster[i].cd = GORGON_SHIELD_RECHARGE > 0 ? GORGON_SHIELD_RECHARGE : -1; // -1 = used for good (0 would mean ready)
  S.popups.push({ x: S.snake[0].x, y: S.snake[0].y, text: 'Shielded!', age: 0 });
  playSfx('shield');
  return true;
}
function updateGorgons() {
  for (let i = 1; i < S.roster.length; i++)
    if (FOLLOWERS[S.roster[i].c].id === 'gorgon' && S.roster[i].cd > 0) S.roster[i].cd--;
}
// Each Medusa fusion leaves one 1-hit shield for the run. Recharge: MEDUSA_SHIELD_COOLDOWN, MEDUSA_SHIELD_STEP shorter per later merge.
function medusaShieldAbsorbs() {
  if (S.medMerges <= 0 || S.medShieldCd > 0) return false;
  S.medShieldCd = Math.max(MEDUSA_SHIELD_MIN, MEDUSA_SHIELD_COOLDOWN - MEDUSA_SHIELD_STEP * (S.medMerges - 1));
  S.popups.push({ x: S.snake[0].x, y: S.snake[0].y, text: 'Shielded!', age: 0 });
  playSfx('shield');
  return true;
}
// Medusa: every enemy HEAD in the line you face stays frozen while it is in that line. A green flash shows when one first freezes.
function medusaGaze() {
  if (!countFollower('medusa') || S.pacifist) return;
  const h = S.snake[0], d = S.dir, tiles = [];
  let fresh = false;
    for (let x = h.x + d.x, y = h.y + d.y; inBounds(x, y) && !isWall(x, y); x += d.x, y += d.y) {   // the gaze stops at walls
    tiles.push({ x, y });
    const t = enemyAt(x, y);
    if (t && t.i === 0 && !t.e.boss) { if (t.e.stun <= 0) fresh = true; t.e.stun = Math.max(t.e.stun, MEDUSA_FREEZE_TICKS); }
  }
  if (fresh) { S.zaps.push({ kind: 'gaze', tiles, age: 0 }); playSfx('gaze'); }
}
// Called once per tick, after the player has moved.
function updatePassives() { magnetPull(); updateGorgons(); medusaGaze(); if (S.medShieldCd > 0) S.medShieldCd--; }