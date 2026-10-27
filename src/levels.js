// levels.js: hero levelling. Kills give XP; every level makes your NEWEST weapon stronger (+LEVEL_STEP power).
// Every LEVEL_BRANCH_EVERY levels the game pauses and you pick a branch: a new auto-weapon. From then on the new
// weapon gets the full boost each level, and older weapons only LEVEL_OLD_SHARE of it (they keep growing, slowly).
// S.weapons = ids in the order picked ('base' = the hero's own weapon), S.wlv[id] = that weapon's level (can be fractional).

const BRANCHES = [
  { id: 'gatling',  name: 'Gatling',  desc: 'Rapid bullets straight ahead.',            cd: GATLING_COOLDOWN,  update: updateGatling },
  { id: 'ricochet', name: 'Ricochet', desc: 'A heavy shot that bounces off the walls.', cd: RICOCHET_COOLDOWN, update: updateRicochet },
  { id: 'nova',     name: 'Nova',     desc: 'A blast around you when enemies get close.', cd: NOVA_COOLDOWN,   update: updateNova },
  { id: 'thunder',  name: 'Thunder',  desc: 'Lightning strikes the nearest enemies.',   cd: THUNDER_COOLDOWN,  update: updateThunder },
];

function addXp(n) {
  if (S.pacifist || !S.alive) return;
  S.xp += n;
  while (S.xp >= xpNeed(S.level)) { S.xp -= xpNeed(S.level); levelUp(); }
}
// Once per world tick: the bar fills slowly by itself, more at low levels (fades out by LEVEL_XP_PASSIVE_FADE).
function passiveXp() {
  if (LEVEL_XP_PASSIVE_FADE <= 0 || S.level >= LEVEL_XP_PASSIVE_FADE) return;
  const k = 1 - (S.level - 1) / LEVEL_XP_PASSIVE_FADE;
  addXp(LEVEL_XP_PASSIVE * k * TICK_MS / 1000);
}
function levelUp() {
  S.level++;
  const newest = S.weapons[S.weapons.length - 1];
  S.weapons.forEach(id => { S.wlv[id] = (S.wlv[id] || 0) + (id === newest ? 1 : LEVEL_OLD_SHARE); });
  const h = S.snake[0];
  S.popups.push({ x: h.x, y: h.y, text: `Level ${S.level}!`, age: 0 });
  playSfx('recruit');
  // weapons now come from chests (chests.js), so levelling no longer opens a pick screen
}

// Called every frame from loop() (main.js). Opens the branch pick once it is safe (alive, nothing else picking).
function openBranchPick() {
  if (!S.pendingBranch || S.picking || !S.alive) return;
  S.pendingBranch = false;
  const left = range(BRANCHES.length).filter(i => !S.weapons.includes(BRANCHES[i].id));
  if (!left.length) return;
  for (let i = left.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [left[i], left[j]] = [left[j], left[i]]; }
  S.pickChoices = left.slice(0, BRANCH_CHOICES);   // the pick screen reuses pickChoices (indexes into BRANCHES here)
  S.pickIndex = 0; S.pickAfter = performance.now() + BRANCH_LOCKOUT_MS;
  S.dirQueue = [];
  S.picking = true; S.branchPicking = true; S.headPicking = false;
  playSfx('merge');
}
function chooseBranch(i) {
  if (!S.picking || !S.branchPicking || performance.now() < S.pickAfter) return;
  const b = BRANCHES[S.pickChoices[i]];
  if (!b) return;
  S.weapons.push(b.id); S.wlv[b.id] = 0; S.bt[b.id] = 0;
  S.popups.push({ x: S.snake[0].x, y: S.snake[0].y, text: b.name + '!', age: 0 });
  S.picking = false; S.branchPicking = false;
  const now = performance.now();                    // continue mid-tick, like resume()
  S.last = now - S.alpha * TICK_MS;
  S.heroLast = now - S.heroAlpha * heroInterval();
  resetEnemyClocks();
}

// ---- Branch weapons (each has its own timer in S.bt) ----
function updateBranches() { // once per tick, after the hero's own weapon
  for (const id of S.weapons) {
    const b = id === 'base' ? null : BRANCHES.find(x => x.id === id);
    if (b) b.update(id);
  }
}
function branchReady(id, base) { S.bt[id] = Math.min((S.bt[id] || 0) + 1, 999); return S.bt[id] >= weaponCooldown(base, id); }
function branchFired(id) { S.bt[id] = 0; }
function branchBullet(dx, dy, dmg, extra) {
  const h = S.snake[0];
  S.bullets.push({ x: h.x, y: h.y, px: h.x, py: h.y, dx, dy, dmg, dead: false, ...extra });
}

function updateGatling(id) {
  if (!branchReady(id, GATLING_COOLDOWN)) return;
  branchFired(id); playSfx('shoot');
  branchBullet(S.dir.x, S.dir.y, weaponDamage(GATLING_DAMAGE, id));
}
function updateRicochet(id) {
  if (!branchReady(id, RICOCHET_COOLDOWN)) return;
  branchFired(id); playSfx('shoot');
  branchBullet(S.dir.x, S.dir.y, weaponDamage(RICOCHET_DAMAGE, id),
    { bounce: RICOCHET_BOUNCES + Math.floor(S.wlv[id] / 3), col: '#6bf0ff' });
}
function updateNova(id) {
  if (!branchReady(id, NOVA_COOLDOWN)) return;
  const r = 1 + Math.floor(S.wlv[id] / 5), h = S.snake[0], tiles = [];
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++)
    if ((dx || dy) && inBounds(h.x + dx, h.y + dy)) tiles.push({ x: h.x + dx, y: h.y + dy });
  if (!tiles.some(t => enemyAt(t.x, t.y))) return;   // only fires when it can hit something (keeps its charge)
  branchFired(id); playSfx('shock');
  S.zaps.push({ kind: 'wave', tiles, age: 0 });
  tiles.forEach(t => strikeEnemyAt(t.x, t.y, weaponDamage(NOVA_DAMAGE, id)));
}
function updateThunder(id) {
  if (!branchReady(id, THUNDER_COOLDOWN)) return;
  const h = S.snake[0], segs = [];
    const v = viewTiles();
  for (const e of S.enemies) for (const s of e.segs) if (onScreen(s.x, s.y, v)) segs.push({ x: s.x, y: s.y, d: Math.abs(s.x - h.x) + Math.abs(s.y - h.y) });
  if (!segs.length) return;
  segs.sort((a, b) => a.d - b.d);
  branchFired(id); playSfx('lightning');
  segs.slice(0, 1 + Math.floor(S.wlv[id] / 4)).forEach(s => {
    S.zaps.push({ kind: 'bolt', x1: h.x, y1: h.y, x2: s.x, y2: s.y, age: 0, jig: range(3).map(() => (Math.random() - 0.5) * 24) });
    strikeEnemyAt(s.x, s.y, weaponDamage(THUNDER_DAMAGE, id));
  });
}