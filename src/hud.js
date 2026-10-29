// hud.js: the in-game HUD, drawn on the WORLD canvas in window pixels, so it sits in the window corners instead of
// on the old 640x640 square. Loaded after render.js: these functions replace the old versions there.
// drawLevelBar and drawKeyArrow draw in world pixels (inside the camera transform); the rest in window pixels.

function drawHud() { // score (top left), wave (top centre), coins (top right)
  if (S.picking || !S.alive || !S.view) return;
  const W = S.view.cssW, pad = 12;
  ctx.save();
  ctx.globalAlpha = TEXT_ALPHA; ctx.font = 'bold 16px system-ui'; ctx.textBaseline = 'alphabetic'; ctx.lineWidth = 3; ctx.strokeStyle = '#14101f'; ctx.lineJoin = 'round';
  const text = (s, x, y, align, color) => { ctx.textAlign = align; ctx.strokeText(s, x, y); ctx.fillStyle = color; ctx.fillText(s, x, y); };
  text(`Score ${S.score}`, pad, pad + 14, 'left', '#fff');
  if (S.combo > 0) { const m = comboMult(); text(`Combo ${S.combo}` + (m > 1 ? `  x${m}` : ''), pad, pad + 34, 'left', '#ffd36b'); }
  const bb = S.bestAtStart;
  if (RETENTION_ON && bb >= RET_PRESSURE_MIN_BEST && S.score >= bb * RET_SHOW_FROM) {
    const left = bb - S.score + 1;
    text(left > 0 ? `${left} to beat best` : 'New best!', pad, pad + (S.combo > 0 ? 54 : 34), 'left', left > 0 ? '#c9bde6' : '#8dff6b');
  }
  text(`Wave ${S.wave || 1}`, W / 2, pad + 14, 'center', '#fff');
  if (!wavesPaused() && S.waveTimer > 0 && S.waveTimer * TICK_MS <= WAVE_SHOW_MS)
    text(`Next wave ${Math.ceil(S.waveTimer * TICK_MS / 1000)}s`, W / 2, pad + 34, 'center', '#c9bde6');
  const label = String(S.coins);
  ctx.font = 'bold 16px system-ui';
  const w = ctx.measureText(label).width;
  drawCoinIcon(W - pad - w - 12, pad + 9, 6);
  text(label, W - pad, pad + 14, 'right', '#ffd36b');
  ctx.restore();
}

function drawComboBar() { // thin bar along the top of the window: time left to chain the next kill
  if (S.combo <= 0 || !S.view) return;
  ctx.fillStyle = '#ffd36b';
  ctx.fillRect(0, 0, Math.round(S.view.cssW * S.comboTimer / S.comboWindow), 4);
}

function drawStallHint() { // the snake waits for a direction: after a tail stall or a revive, and at the very start of a run
    if (!S.alive || S.paused || S.picking || !S.waitDir || !S.view || S.holdStart) return;   // the opening screen is drawn by drawOverlay in render.js
  const start = S.holdStart, W = S.view.cssW, H = S.view.cssH;
  const lines = !start ? ['Choose a direction']
    : S.ret.runs < 5 ? ['WASD, arrows or swipe to move', 'Eat a key, then touch the character that walks in']
    : ['WASD, arrows or swipe to move'];   // the second line is for the first few runs only
  ctx.save();
  ctx.font = 'bold 20px system-ui'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#14101f'; ctx.lineJoin = 'round';
  ctx.globalAlpha = start ? 0.9 : TEXT_ALPHA;
  lines.forEach((s, i) => {
    const y = H - 24 - (lines.length - 1 - i) * 28;
    ctx.strokeText(s, W / 2, y); ctx.fillStyle = '#fff'; ctx.fillText(s, W / 2, y);
  });
  ctx.restore();
}

// World space: a small level bar directly under the hero. It scales with the world, like the sprites.
function drawLevelBar() {
  if (S.picking || !S.alive || S.pacifist) return;
  const p = lerpPos(S.prev, 0, S.snake[0], S.heroAlpha), w = CELL + 8;
  const x = Math.round(p.x + CELL / 2 - w / 2), y = Math.round(p.y + CELL + 3);
  ctx.save();
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = 'rgba(20,16,31,.8)'; ctx.fillRect(x - 1, y - 1, w + 2, 5);
  ctx.fillStyle = '#6bc5ff'; ctx.fillRect(x, y, Math.round(w * S.xp / xpNeed(S.level)), 3);
  ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'left'; ctx.fillText(`Lv ${S.level}`, x + w + 4, y + 4);
  ctx.restore();
}

// World space: an arrow halfway between the hero and the window edge, pointing at the nearest key.
function drawKeyArrow() {
  if (!KEY_ARROW || S.picking || !S.alive || !S.view || !S.cam) return;
  const n = nearestKey();
  if (!n || n.d < KEY_ARROW_HIDE_DIST) return;
  const v = S.view, cx = Math.round(S.cam.x), cy = Math.round(S.cam.y), s = 1 / v.scale;   // s = one screen pixel in world pixels
  const p = lerpPos(S.prev, 0, S.snake[0], S.heroAlpha), hx = p.x + CELL / 2, hy = p.y + CELL / 2;
  const a = Math.atan2(n.k.y * CELL + CELL / 2 - hy, n.k.x * CELL + CELL / 2 - hx), dx = Math.cos(a), dy = Math.sin(a);
  const m = 24 * s, rx = hx - cx, ry = hy - cy;                                            // keep the arrow m inside the window edge
  const tx = dx > 0.001 ? (v.w - m - rx) / dx : dx < -0.001 ? (m - rx) / dx : Infinity;
  const ty = dy > 0.001 ? (v.h - m - ry) / dy : dy < -0.001 ? (m - ry) / dy : Infinity;
  const edge = Math.max(0, Math.min(tx, ty)), d = Math.min(edge, Math.max(edge / 2, 40 * s));   // halfway, but never hugging the hero
  ctx.save();
  ctx.globalAlpha = TEXT_ALPHA; ctx.translate(hx + dx * d, hy + dy * d); ctx.rotate(a); ctx.scale(s, s);
  ctx.lineWidth = 3; ctx.strokeStyle = '#14101f'; ctx.fillStyle = '#ffd36b'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-8, -9); ctx.lineTo(11, 0); ctx.lineTo(-8, 9); ctx.closePath(); ctx.stroke(); ctx.fill();
  ctx.restore();
}

// ---- Buff list: small chips in the bottom-left corner, far from the hero, faded like the other HUD text ----
function activeBuffs() { // [{ text, color, prog }]. prog = 0..1, the thin bar under a chip: cooldowns fill up, timed buffs run down
  const out = [], add = (text, color, prog) => out.push({ text, color, prog });
  const secs = t => (Math.max(0, t) * TICK_MS / 1000).toFixed(1);
  const cool = (name, lv, left, need, color) =>
    add(`${name} Lv ${lv}` + (left > 0.05 ? `  ${secs(left)}s` : ''), color, Math.max(0, Math.min(1, 1 - left / Math.max(1, need))));

  // 1. Attacks: the hero's own weapon, the weapons from chests, then follower skills.
  const hd = HEAD_DEFS[S.roster[0].c];
  if (!S.pacifist && (hd.id === 'swordsman' || hd.id === 'gunman' || hd.id === 'goliath')) {   // Magician and Summoner have their own chips below
    const need = weaponCooldown(hd.cd);
    cool(hd.weapon, 1 + Math.floor(S.wlv.base || 0), need - (S.tick - S.lastSwing + S.alpha), need, '#ffd36b');
  }
  S.weapons.forEach(id => {
    const w = id === 'base' ? null : BRANCHES.find(x => x.id === id);
    if (!w) return;
    const need = weaponCooldown(w.cd, id);
    cool(w.name, 1 + Math.floor(S.wlv[id] || 0), need - ((S.bt[id] || 0) + S.alpha), need, '#6bc5ff');
  });
  const groups = {};                                  // follower skills, one chip per family (the soonest-ready copy sets the bar)
  for (let i = 1; i < S.roster.length; i++) {
    const f = FOLLOWERS[S.roster[i].c], sk = SKILLS[f.skill];
    if (!sk) continue;
    const g = groups[f.id] = groups[f.id] || { f, n: 0, best: Infinity, total: Math.max(1, Math.round(sk.cooldown * S.cdMult)) };
    g.n++; g.best = Math.min(g.best, Math.max(0, S.roster[i].cd));
  }
  Object.values(groups).forEach(g =>
    add(`${g.f.name}${g.n > 1 ? ' x' + g.n : ''}` + (g.best > 0 ? `  ${secs(g.best)}s` : ''), g.f.color, Math.max(0, Math.min(1, 1 - g.best / g.total))));

  // 2. Buffs and hero state.
  const b = BUFFS.find(x => x.id === S.buff);
  if (b) add(b.name, '#ffd36b');
  for (const id in TEMP_BUFFS) if (S.tb[id] > 0)
    add(`${TEMP_BUFFS[id].name} ${Math.ceil(S.tb[id] * TICK_MS / 1000)}s`, TEMP_BUFFS[id].color, S.tb[id] / TEMP_BUFFS[id].ticks);
  if (headId() === 'goliath') add(`Shields ${S.keyShields}/${GOLIATH_SHIELD_MAX}`, '#8dff6b');
  if (S.pity) add('Pity boost', '#9a8cc4');
  if (S.gift) add(`Portals ${S.giftCharges}/${S.giftPerWave}`, '#c78bff');
  if (headId() === 'magician') add(`Charges ${S.shockCharges}/${SHOCK_MAX_CHARGES}`, '#c78bff',
    S.shockCharges < SHOCK_MAX_CHARGES ? Math.min(1, (S.shockTimer + S.alpha) / weaponCooldown(SHOCK_COOLDOWN)) : undefined);
  if (headId() === 'summoner') {
    if (S.snake.length < 2) add('Spirits: needs a follower', '#c78bff');
    else add(`Spirits ${S.agents.length}/${AGENT_MAX}`, '#c78bff', S.agents.length < AGENT_MAX ? Math.min(1, (S.tick - S.lastSwing + S.alpha) / weaponCooldown(SUMMONER_COOLDOWN)) : undefined);
  }
  if (headId() === 'swordsman') add(S.shield ? 'Block ready' : `Block ${Math.ceil(S.shieldTimer * TICK_MS / 1000)}s`, '#6bc5ff', S.shield ? undefined : Math.max(0, 1 - S.shieldTimer / SHIELD_RECHARGE));
  if (S.freeRevive) add('Free revive', '#8dff6b');
  const gs = gorgonSlots().length;
  if (gs) add(`Shields ${gorgonReady()}/${gs}`, '#8dff6b');
  if (S.medMerges > 0) add(S.medShieldCd > 0 ? `Medusa shield ${Math.ceil(S.medShieldCd * TICK_MS / 1000)}s` : 'Medusa shield', '#2fbf71');
  if (S.speedBonus > 0) add(`+${Math.round(S.speedBonus * 100)}% speed`, '#6bc5ff');
  if (S.keyBonus > 0) add(`+${S.keyBonus} key`, '#ffd36b');
  if (S.mineMaxBonus > 0) add(`+${S.mineMaxBonus} mine`, '#ff8a3c');
  if (S.damageBonus > 0) add(`+${S.damageBonus} damage`, '#ff8a8a');
  const closed = (S.chests || []).length, opened = S.chestsOpened || 0;   // how many chests are hiding in this run
  if (closed + opened > 0) add(`Chests ${opened}/${closed + opened}`, '#ffd36b');
  if (!S.pacifist) add(`Weapons ${S.weapons.length - 1}/${weaponSlots()}`, '#6bc5ff');   // chest weapons held / slots
  return out.slice(0, 12);
}
function drawBuffList() {
  if (S.picking || !S.alive || !S.view) return;
  const list = activeBuffs();
  if (!list.length) return;
  const H = S.view.cssH, h = 20, gap = 4, x = 12;
  ctx.save();
  ctx.globalAlpha = TEXT_ALPHA + 0.1; ctx.font = '12px system-ui'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  list.forEach((c, i) => {
    const y = H - 12 - h - i * (h + gap), w = Math.ceil(ctx.measureText(c.text).width) + 20;
    ctx.fillStyle = 'rgba(20,16,31,.7)'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = c.color; ctx.fillRect(x, y, 3, h);
    ctx.fillStyle = '#f3e9ff'; ctx.fillText(c.text, x + 11, y + h / 2 + 1);
    if (c.prog !== undefined) { ctx.fillStyle = c.color; ctx.fillRect(x, y + h - 2, Math.round(w * c.prog), 2); }
  });
  ctx.restore();
}
// ---- Boss banners: big centred text for a few seconds (the warning 10 s ahead, and the boss's name when it appears) ----
function showBanner(text, sub, color, small) { S.banners.push({ text, sub: sub || '', color: color || '#fff', age: 0, life: BANNER_TICKS, small: !!small }); }
function ageBanners() { // once per world tick (step in main.js)
  S.banners.forEach(b => b.age++);
  S.banners = S.banners.filter(b => b.age < b.life);
}
// Which boss the NEXT wave brings: 'serpent', 'wizard', 'both' or null. (Pacifist has no bosses; Challenge ends at CHALLENGE_WAVE.)
function bossWaveNext() {
  if (S.pacifist) return null;
  const n = S.wave + 1;
  if (S.challenge && n >= CHALLENGE_WAVE) return null;
  return bossKindAt(n);   // waves.js
}
// Called every world tick from updateWaves (enemies.js) while the wave timer runs: shows the warning once per boss wave, BOSS_WARN_TICKS ahead.
function updateBossWarning() {
  const k = bossWaveNext(), key = k ? k + (S.wave + 1) : '';
  if (!k || S.announced[key] || S.waveTimer > BOSS_WARN_TICKS) return;
  S.announced[key] = true;
  showBanner(k === 'serpent' ? 'Something huge is coming...' : k === 'wizard' ? 'The air goes still...' : 'Two horrors are coming...', '', k === 'wizard' ? '#c78bff' : '#ff8a8a');
  playSfx('waveStart');
}
function drawBanners() { // window pixels: fades in fast, holds, fades out. A small banner is one quiet line.
  if (!S.banners.length || !S.view || S.picking || !S.alive) return;
  const W = S.view.cssW, H = S.view.cssH, big = Math.max(18, Math.min(44, Math.round(W / 18)));
  let y = H * 0.24;
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
  S.banners.forEach(b => {
    const size = b.small ? 20 : big, t = Math.min(1, (b.age + S.alpha) / b.life), a = Math.max(0, Math.min(1, t / 0.12, (1 - t) / 0.25));
    ctx.globalAlpha = (b.small ? 0.85 : 0.95) * a;
    ctx.font = `bold ${size}px system-ui`; ctx.lineWidth = Math.round(size / 6); ctx.strokeStyle = '#14101f';
    ctx.strokeText(b.text, W / 2, y); ctx.fillStyle = b.color; ctx.fillText(b.text, W / 2, y);
    y += size + 14;
  });
  ctx.restore();
}
// Window pixels: for the first NEWBIE_RUNS runs, a plain hint while you are alone: eat a key, then touch the friend who walked in.
function drawNewbieHint() {
  if (S.ret.runs >= NEWBIE_RUNS || !S.alive || S.picking || S.paused || S.holdStart || !S.view || S.snake.length > 1) return;
  if (S.runStart && performance.now() - S.runStart > 90000) return;      // not forever
  const text = S.recruits.length ? 'Touch the friend to add them to your chain' : S.keys.length ? 'Eat a key to call a friend' : '';
  if (!text) return;
  const W = S.view.cssW, H = S.view.cssH;
  ctx.save();
  ctx.font = 'bold 20px system-ui'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#14101f'; ctx.lineJoin = 'round'; ctx.globalAlpha = 0.9;
  ctx.strokeText(text, W / 2, H - 70); ctx.fillStyle = '#ffd36b'; ctx.fillText(text, W / 2, H - 70);
  ctx.restore();
}
// Window pixels: a faint ring where the thumb steers from and a dot under the finger (touch only).
function drawTouchStick() {
  const u = S.touchUi;
  if (!TOUCH_STICK_DRAW || !u || !S.alive || S.picking || S.paused || !S.view) return;
  ctx.save();
  ctx.globalAlpha = 0.28; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(u.ax, u.ay, TOUCH_TRAIL, 0, 6.3); ctx.stroke();
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(u.x, u.y, 10, 0, 6.3); ctx.fill();
  ctx.restore();
}