// heads.js: the playable heads (slot 0 of the chain). Each head has its own weapon, which fires by itself on a
// timer, and some have a passive. HEAD_DEFS is in the same order as HEADS in sprites.js (which holds the sprites).
// The player picks a head on the first pick screen of every run (chooseHead; drawn by drawHeadPick in render.js).
//   Swordsman  sword slash on the tile ahead; blocks the first enemy-head hit, then recharges.
//   Magician   walls open a portal to the other side (see playerMove in player.js); a 3x3 shockwave ahead.
//   Gunman     a bullet flies out to each side of the heading.

function secs(ticks) { return Math.round(ticks * TICK_MS / 100) / 10; }

const HEAD_DEFS = [
  { id: 'swordsman', name: 'Swordsman', update: updateSwordsman, weapon: 'Sword', cd: SWORD_COOLDOWN,
    desc: `Sword hits for ${SWORD_DAMAGE} every ${secs(SWORD_COOLDOWN)} s. Blocks the first enemy-head hit, ready again after ${secs(SHIELD_RECHARGE)} s.` },
  { id: 'magician', name: 'Magician', update: updateMagician, weapon: 'Shockwave', cd: SHOCK_COOLDOWN,
    desc: `Walls open a portal to the other side instead of hurting. A 3x3 shockwave every ${secs(SHOCK_COOLDOWN)} s.` },
  { id: 'gunman', name: 'Gunman', update: updateGunman, weapon: 'Bullets', cd: GUNMAN_COOLDOWN,
    desc: `A bullet flies out to each side every ${secs(GUNMAN_COOLDOWN)} s.` },
];

function headId() { return HEAD_DEFS[S.roster[0].c].id; }

// Weapon timing: S.lastSwing is the tick the head's weapon last fired; S.swingMult comes from the Quick hands buff.
function weaponCooldown(base) { return Math.max(2, Math.round(base * S.swingMult)); }
function weaponReady(base) { return S.tick - S.lastSwing >= weaponCooldown(base); }

// Called once per tick, after the player has moved.
function updateHead() { HEAD_DEFS[S.roster[0].c].update(); }

// ---- Swordsman -----------------------------------------------------------------
function updateSwordsman() {
  if (!S.shield && --S.shieldTimer <= 0) S.shield = true;
  if (!weaponReady(SWORD_COOLDOWN)) return;
  const h = S.snake[0], tx = h.x + S.dir.x, ty = h.y + S.dir.y;
  if (!inBounds(tx, ty)) return;
  fireAttack(ATTACKS.sword, tx, ty, S.dir, SWORD_DAMAGE);
  S.lastSwing = S.tick;
}
// Called by takeHit for a hit from an enemy HEAD. True if the Swordsman's block absorbs it.
function shieldAbsorbs() {
  if (headId() !== 'swordsman' || !S.shield) return false;
  S.shield = false; S.shieldTimer = SHIELD_RECHARGE;
  S.popups.push({ x: S.snake[0].x, y: S.snake[0].y, text: 'Blocked!', age: 0 });
  return true;
}

// ---- Magician ------------------------------------------------------------------
function updateMagician() {
  if (!weaponReady(SHOCK_COOLDOWN)) return;
  const h = S.snake[0], cx = h.x + S.dir.x * SHOCK_REACH, cy = h.y + S.dir.y * SHOCK_REACH, tiles = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++)
    if (inBounds(cx + dx, cy + dy)) tiles.push({ x: cx + dx, y: cy + dy });
  S.zaps.push({ kind: 'wave', tiles, age: 0 });
  tiles.forEach(t => strikeEnemyAt(t.x, t.y, SHOCK_DAMAGE)); // each tile is looked up fresh: an earlier hit can cut or kill a snake
  S.lastSwing = S.tick;
}

// ---- Gunman --------------------------------------------------------------------
function updateGunman() {
  if (!weaponReady(GUNMAN_COOLDOWN)) return;
  const h = S.snake[0], d = S.dir;
  for (const side of [-1, 1]) {                    // the two sides of the heading
    S.bullets.push({ x: h.x, y: h.y, px: h.x, py: h.y, dx: -d.y * side, dy: d.x * side, dmg: BULLET_DAMAGE, dead: false });
  }
  S.lastSwing = S.tick;
}

// ---- Head select screen (the first pick screen of a run) ----------------------------
// Where card i sits on the 640x640 canvas. Shared by drawing (render.js) and tapping (input.js).
function headCardRect(i) {
  const n = HEAD_DEFS.length, gap = 20, margin = 30, w = (COLS * CELL - 2 * margin - (n - 1) * gap) / n;
  return { x: margin + i * (w + gap), y: 140, w, h: 300 };
}
// Chooses head i, then the buff pick screen follows. Ignored for a moment after the screen appears.
function chooseHead(i) {
  if (!S.picking || !S.headPicking || performance.now() < S.pickAfter || !HEAD_DEFS[i]) return;
  S.roster[0].c = i;
  S.headPicking = false;
  S.pickIndex = 0;
  S.pickAfter = performance.now() + PICK_LOCKOUT_MS; // the tap that chose the head must not also choose a buff
  hud(); // the buff pick screen is drawn by hud() (render.js)
}