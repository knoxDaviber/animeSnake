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

function drawStallHint() { // after running into your own tail (or reviving): the snake waits for a direction
  if (!S.alive || S.paused || S.picking || !S.waitDir || !S.view) return;
  ctx.save();
  ctx.font = 'bold 20px system-ui'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#14101f'; ctx.lineJoin = 'round';
  ctx.globalAlpha = TEXT_ALPHA;
  ctx.strokeText('Choose a direction', S.view.cssW / 2, S.view.cssH - 24);
  ctx.fillStyle = '#fff'; ctx.fillText('Choose a direction', S.view.cssW / 2, S.view.cssH - 24);
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
function activeBuffs() { // [{ text, color }]
  const out = [], add = (text, color, prog) => out.push({ text, color, prog });
  const b = BUFFS.find(x => x.id === S.buff);
  if (b) add(b.name, '#ffd36b');
  for (const id in TEMP_BUFFS) if (S.tb[id] > 0)
    add(`${TEMP_BUFFS[id].name} ${Math.ceil(S.tb[id] * TICK_MS / 1000)}s`, TEMP_BUFFS[id].color, S.tb[id] / TEMP_BUFFS[id].ticks);
  if (headId() === 'goliath') add(`Shields ${S.keyShields}/${GOLIATH_SHIELD_MAX}`, '#8dff6b');
  if (S.pity) add('Pity boost', '#9a8cc4');
  if (S.gift) add(`Portals ${S.giftCharges}/${S.giftPerWave}`, '#c78bff');
  if (headId() === 'magician') add(`Charges ${S.shockCharges}/${SHOCK_MAX_CHARGES}`, '#c78bff',
  S.shockCharges < SHOCK_MAX_CHARGES ? Math.min(1, (S.shockTimer + S.alpha) / weaponCooldown(SHOCK_COOLDOWN)) : undefined);   // the thin bar under the chip is the reload
  if (headId() === 'swordsman') add(S.shield ? 'Block ready' : `Block ${Math.ceil(S.shieldTimer * TICK_MS / 1000)}s`, '#6bc5ff');
  if (S.freeRevive) add('Free revive', '#8dff6b');
  const gs = gorgonSlots().length;
  if (gs) add(`Shields ${gorgonReady()}/${gs}`, '#8dff6b');
  if (S.medMerges > 0) add(S.medShieldCd > 0 ? `Medusa shield ${Math.ceil(S.medShieldCd * TICK_MS / 1000)}s` : 'Medusa shield', '#2fbf71');
  S.weapons.forEach(id => {
  const w = id === 'base' ? null : BRANCHES.find(x => x.id === id);
  if (w) add(`${w.name} Lv ${1 + Math.floor(S.wlv[id] || 0)}`, '#6bc5ff');
  });
  if (S.speedBonus > 0) add(`+${Math.round(S.speedBonus * 100)}% speed`, '#6bc5ff');
  if (S.keyBonus > 0) add(`+${S.keyBonus} key`, '#ffd36b');
  if (S.mineMaxBonus > 0) add(`+${S.mineMaxBonus} mine`, '#ff8a3c');
  if (S.damageBonus > 0) add(`+${S.damageBonus} damage`, '#ff8a8a');
  return out.slice(0, 9);
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