// heads.js: the playable heads (slot 0 of the chain). Each head has its own weapon, which fires by itself on a
// timer, and some have a passive. HEAD_DEFS is in the same order as HEADS in sprites.js (which holds the sprites).
// The player picks a head on the first pick screen of every run (chooseHead; drawn by drawHeadPick in render.js).
//   Swordsman  sword slash on the tile ahead; blocks the first enemy-head hit, then recharges.
//   Magician   walls open a portal to the other side (see playerMove in player.js); a 3x3 shockwave ahead.
//   Gunman     a bullet flies out to each side of the heading.

function secs(ticks) { return Math.round(ticks * TICK_MS / 100) / 10; }

const HEAD_DEFS = [
  { id: 'swordsman', name: 'Swordsman', update: updateSwordsman, weapon: 'Sword', cd: SWORD_COOLDOWN,
    desc: 'A blade, a shield, and zero chill.',
    detail: `Sword hits for ${SWORD_DAMAGE} every ${secs(SWORD_COOLDOWN)} s. Blocks the first enemy-head hit, ready again after ${secs(SHIELD_RECHARGE)} s.` },
  { id: 'magician', name: 'Magician', update: updateMagician, weapon: 'Shockwave', cd: SHOCK_COOLDOWN,
    desc: 'Walls are just suggestions.',
    detail: `Walls open a portal. A 3x3 shockwave fires itself at enemies in range: ${SHOCK_MAX_CHARGES} charges, 1 back per ${secs(SHOCK_COOLDOWN)} s.` },
  { id: 'gunman', name: 'Gunman', update: updateGunman, weapon: 'Bullets', cd: GUNMAN_COOLDOWN,
    desc: 'Why aim when you can spray?',
    detail: `Bullets fly out ahead and to each side every ${secs(GUNMAN_COOLDOWN)} s.` },
  { id: 'goliath', name: 'Goliath', update: updateGoliath, weapon: 'Headbutt', cd: 0,
    desc: 'Stares down everything. Kicks the rest.',
    detail: `Harmless from the front, hurt from the sides and back. Kicks keys, mines and characters: they slide until they hit something. Every ${KICK_REWARD_EVERY} kicks a fusion follower joins. ${Math.round(GOLIATH_SPEED * 100)}% speed.` },
];

function heroText(def) { return S.heroDetail ? def.detail : def.desc; } // hero select: flavour by default, stats when toggled
function detailButtonRect() { return { x: 52, y: 8, w: 36, h: 36 }; }   // the "i" button next to the speaker icon
function headId() { return HEAD_DEFS[S.roster[0].c].id; }


// Weapon timing: S.lastSwing is the tick the head's weapon last fired; S.swingMult comes from the Quick hands buff.
function weaponPower(id = 'base') { return 1 + (S.wlv[id] || 0) * LEVEL_STEP; } // levels.js: 1 + levels x LEVEL_STEP
function weaponCooldown(base, id = 'base') { return Math.max(2, Math.round(base * S.swingMult / (1 + (weaponPower(id) - 1) * LEVEL_SPEED_SHARE))); }
function weaponReady(base) { return S.tick - S.lastSwing >= weaponCooldown(base); }
function weaponDamage(base, id = 'base') { return Math.max(1, Math.round((base + S.damageBonus) * S.dmgMult * weaponPower(id))); } // Kingsman bonus, Glass cannon, level

// Called once per tick, after the player has moved.
function updateHead() { HEAD_DEFS[S.roster[0].c].update(); }
function updateGoliath() { /* no weapon: he is the weapon (see kicks.js) */ }

// ---- Swordsman -----------------------------------------------------------------
function updateSwordsman() {
  if (!S.shield && --S.shieldTimer <= 0) S.shield = true;
  if (!weaponReady(SWORD_COOLDOWN)) return;
  const h = S.snake[0], tx = h.x + S.dir.x, ty = h.y + S.dir.y;
  if (!inBounds(tx, ty)) return;
  fireAttack(ATTACKS.sword, tx, ty, S.dir, weaponDamage(SWORD_DAMAGE));
  playSfx('sword');
  S.lastSwing = S.tick;
}
// Called by takeHit for a hit from an enemy HEAD. True if the Swordsman's block absorbs it.
function shieldAbsorbs() {
  if (headId() !== 'swordsman' || !S.shield) return false;
  S.shield = false; S.shieldTimer = SHIELD_RECHARGE;
  S.popups.push({ x: S.snake[0].x, y: S.snake[0].y, text: 'Blocked!', age: 0 });
  playSfx('block');
  return true;
}

// ---- Magician ------------------------------------------------------------------
function updateMagician() {
  const need = weaponCooldown(SHOCK_COOLDOWN);   // ticks per charge (Quick hands makes it shorter)
  if (S.shockCharges < SHOCK_MAX_CHARGES) { if (++S.shockTimer >= need) { S.shockCharges++; S.shockTimer = 0; } } else S.shockTimer = 0;
  if (S.shockCharges <= 0 || S.tick - S.lastSwing < SHOCK_GAP) return;
  const h = S.snake[0], cx = h.x + S.dir.x * SHOCK_REACH, cy = h.y + S.dir.y * SHOCK_REACH, tiles = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++)
    if (inBounds(cx + dx, cy + dy)) tiles.push({ x: cx + dx, y: cy + dy });
  if (!tiles.some(t => enemyAt(t.x, t.y))) return;   // only fires when it can hit something
  S.shockCharges--;
  S.zaps.push({ kind: 'wave', tiles, age: 0 });
  playSfx('shock');
  tiles.forEach(t => strikeEnemyAt(t.x, t.y, weaponDamage(SHOCK_DAMAGE))); // each tile is looked up fresh: an earlier hit can cut or kill a snake
  S.lastSwing = S.tick;
}

// ---- Gunman --------------------------------------------------------------------
function updateGunman() {
  if (!weaponReady(GUNMAN_COOLDOWN)) return;
  const h = S.snake[0], d = S.dir;
  playSfx('shoot');
  S.bullets.push({ x: h.x, y: h.y, px: h.x, py: h.y, dx: d.x, dy: d.y, dmg: weaponDamage(BULLET_DAMAGE), dead: false }); // front bullet
  for (const side of [-1, 1]) {                    // the two sides of the heading
    S.bullets.push({ x: h.x, y: h.y, px: h.x, py: h.y, dx: -d.y * side, dy: d.x * side, dmg: weaponDamage(BULLET_DAMAGE), dead: false });
  }
  S.lastSwing = S.tick;
}

// ---- Hero select screen (the title screen, and the first pick screen of every run) --------
// Layout for any number of heroes. Up to 3: one row of big cards with the description on the card. More: a grid of
// compact cards (HERO_GRID_COLS per row, last row centred); the focused hero's description is drawn under the grid.
function headLayout() {
  const n = HEAD_DEFS.length, big = n <= 3, cols = big ? n : HERO_GRID_COLS, rows = Math.ceil(n / cols);
  const gap = big ? 20 : 14, margin = 30, top = big ? 140 : 130, area = big ? 300 : 310;
  const w = (SCREEN_W - 2 * margin - (cols - 1) * gap) / cols;
  const h = big ? area : Math.min(190, (area - (rows - 1) * gap) / rows);
  return { n, big, cols, rows, gap, margin, top, w, h };
}
// Where card i sits on the 640x640 canvas. Shared by drawing (render.js) and tapping (input.js).
function headCardRect(i) {
  const L = headLayout(), col = i % L.cols, row = Math.floor(i / L.cols);
  const inRow = Math.min(L.cols, L.n - row * L.cols), shift = (L.cols - inRow) * (L.w + L.gap) / 2; // centres a short last row
  return { x: L.margin + shift + col * (L.w + L.gap), y: L.top + row * (L.h + L.gap), w: L.w, h: L.h };
}
// Acts on hero i. A free or bought hero starts the run (the buff pick follows). A locked hero is BOUGHT instead, if you
// can pay: it does not start the run, you click it again to pick it. Ignored for a moment after the screen appears
// and after each unlock attempt, so one click or a double click cannot do both.
function chooseHead(i) {
  const def = HEAD_DEFS[i];
  if (!S.picking || !S.headPicking || performance.now() < S.pickAfter || !def) return;
  const price = heroPrice(def.id);
  if (!isUnlocked('hero', def.id, price)) {
    const r = tryUnlock('hero', def.id, price);
    playSfx(r.ok ? 'unlock' : 'deny');
    S.pickIndex = i;
    S.cardNote = { i, ok: r.ok, until: performance.now() + CARD_NOTE_MS,
                   text: r.ok ? 'Unlocked!' : `Need ${r.need} more coin${r.need === 1 ? '' : 's'}` };
    S.pickAfter = performance.now() + PICK_LOCKOUT_MS;
    hud();                                             // the coin count changed
    return;
  }
  S.roster[0].c = i;
  S.headPicking = false;
  S.pickIndex = 0;
  S.pickAfter = performance.now() + PICK_LOCKOUT_MS; // the tap that chose the hero must not also choose a buff
  hud(); // the buff pick screen is drawn by hud() (render.js)
}