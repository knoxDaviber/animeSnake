// render.js: everything that draws. Reads S, never changes game state (hud() only touches the page text).

const cv = document.getElementById('c'), ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;

function hud() { updatePanel(); } // the numbers now live on the canvas (drawHud); this only refreshes the info bar

// Draws one frame of a directional sheet, scaled to fit one 32x32 tile. Sprites face right; left is mirrored.
// The frame size comes from the sheet itself (width / 4), so 128x128 and 448x448 sheets both work.
function drawDirectional(sh, fx, fy, tick, px, py) {
  let row = DIR_ROW.right, flip = false;
  if (fy < 0) row = DIR_ROW.up;
  else if (fy > 0) row = DIR_ROW.down;
  else flip = fx < 0;
  const fw = Math.floor(sh.img.width / FRAMES), fh = Math.floor(sh.img.height / 4);
  const sx = (tick % FRAMES) * fw, sy = row * fh;
  ctx.save();
  ctx.imageSmoothingEnabled = fw !== SPRITE; // smooth only when the sheet had to be scaled down
  if (flip) {
    ctx.translate(px + CELL, py);
    ctx.scale(-1, 1);
    ctx.drawImage(sh.img, sx, sy, fw, fh, 0, 0, SPRITE, SPRITE);
  } else {
    ctx.drawImage(sh.img, sx, sy, fw, fh, px, py, SPRITE, SPRITE);
  }
  ctx.restore();
}
// One row of 32x32 frames, looping with the animation clock.
function drawItem(sh, tick, px, py) {
  const frames = Math.max(1, Math.floor(sh.img.width / SPRITE));
  ctx.drawImage(sh.img, (tick % frames) * SPRITE, 0, SPRITE, SPRITE, px, py, SPRITE, SPRITE);
}

// ---- Objects -------------------------------------------------------------------
// Each draws its sprite, or a plain shape if the sheet is missing.
function drawSegment(r, px, py, isHead) { // a character in the chain: the head, or a follower
  const def = isHead ? null : FOLLOWERS[r.c];
  const ch = isHead ? HEADS[r.c % HEADS.length] : def.sheet;
  px = Math.round(px); py = Math.round(py);
  if (ch.ready) {
    drawDirectional(ch, r.fx, r.fy, S.tick, px, py);
  } else {
    ctx.fillStyle = isHead ? COLORS[r.c % COLORS.length] : def.color;
    ctx.fillRect(px + 2, py + 2, CELL - 4, CELL - 4);
    if (isHead) { ctx.fillStyle = '#fff'; ctx.fillRect(px + 11, py + 11, 10, 10); }
    else {
      ctx.save();
      ctx.fillStyle = '#14101f'; ctx.font = 'bold 16px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(def.name[0], px + CELL / 2, py + 22);
      ctx.restore();
    }
  }
}
function drawEnemySeg(isHead, fx, fy, px, py) {
  const sh = isHead ? SPRITES.enemyHead : SPRITES.enemyBody;
  px = Math.round(px); py = Math.round(py);
  if (sh.ready) {
    drawDirectional(sh, fx, fy, S.tick, px, py);
  } else {
    ctx.fillStyle = isHead ? '#b45cff' : '#7a3fb5';
    ctx.fillRect(px + 2, py + 2, CELL - 4, CELL - 4);
  }
}
function drawHazard() {
  const x = S.hazard.x * CELL, y = S.hazard.y * CELL;
  if (SPRITES.hazard.ready) return drawItem(SPRITES.hazard, S.tick, x, y);
  ctx.fillStyle = '#8a8aa3'; // fallback spikes
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(x + 2 + i * 10, y + CELL - 4);
    ctx.lineTo(x + 7 + i * 10, y + 6);
    ctx.lineTo(x + 12 + i * 10, y + CELL - 4);
    ctx.fill();
  }
}
function drawFood() { // the recruit keys (still the food sprite until it gets its own art)
  S.keys.forEach(k => {
    const x = k.x * CELL, y = k.y * CELL;
    if (SPRITES.food.ready) return drawItem(SPRITES.food, S.tick, x, y);
    ctx.fillStyle = '#ff4d4d';
    ctx.fillRect(x + 6, y + 6, CELL - 12, CELL - 12);
  });
}
function drawMines() {
  S.mines.forEach(m => {
    const x = m.x * CELL, y = m.y * CELL;
    if (SPRITES.mine.ready) return drawItem(SPRITES.mine, S.tick, x, y);
    ctx.fillStyle = '#3a3a4a'; // fallback: dark disc with a blinking red light
    ctx.beginPath(); ctx.arc(x + CELL / 2, y + CELL / 2, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = S.tick % 2 ? '#ff4d4d' : '#7a1f1f';
    ctx.fillRect(x + 13, y + 13, 6, 6);
  });
}
function drawBlasts() { // explosion flash on every tile of the blast, fading out
  ctx.save();
  S.blasts.forEach(b => {
    ctx.globalAlpha = 0.85 * (1 - b.age / BLAST_TICKS);
    ctx.fillStyle = '#ff9a3c'; ctx.fillRect(b.x * CELL, b.y * CELL, CELL, CELL);
    ctx.fillStyle = '#ffe9a8'; ctx.fillRect(b.x * CELL + 8, b.y * CELL + 8, CELL - 16, CELL - 16);
  });
  ctx.restore();
}
function drawZaps() { // bolt, gaze, shockwave and portal flashes, fading out
  ctx.save();
  S.zaps.forEach(z => {
    ctx.globalAlpha = 1;
    const fade = 1 - z.age / ZAP_TICKS;
    if (z.kind === 'gaze' || z.kind === 'wave') {          // a tinted patch on each tile
      ctx.fillStyle = `rgba(${z.kind === 'wave' ? '199,139,255' : '141,255,107'},${0.45 * fade})`;
      z.tiles.forEach(t => ctx.fillRect(t.x * CELL, t.y * CELL, CELL, CELL));
      return;
    }
    if (z.kind === 'portal') {                             // a ring on the entry and exit tile, growing as it fades
      ctx.globalAlpha = fade; ctx.strokeStyle = '#c78bff'; ctx.lineWidth = 3;
      [[z.x1, z.y1], [z.x2, z.y2]].forEach(([tx, ty]) => {
        ctx.beginPath(); ctx.arc(tx * CELL + CELL / 2, ty * CELL + CELL / 2, 6 + 10 * (1 - fade), 0, Math.PI * 2); ctx.stroke();
      });
      return;
    }
    const ax = z.x1 * CELL + CELL / 2, ay = z.y1 * CELL + CELL / 2, bx = z.x2 * CELL + CELL / 2, by = z.y2 * CELL + CELL / 2;
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
    const pts = [[ax, ay], ...z.jig.map((j, k) => {
      const t = (k + 1) / (z.jig.length + 1);
      return [ax + dx * t + nx * j, ay + dy * t + ny * j];
    }), [bx, by]];
    ctx.globalAlpha = fade; ctx.lineJoin = 'round';
    [['#6bc5ff', 6], ['#ffffff', 2]].forEach(([c, w]) => {
      ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath();
      pts.forEach(([px, py], k) => k ? ctx.lineTo(px, py) : ctx.moveTo(px, py));
      ctx.stroke();
    });
  });
  ctx.restore();
}
function drawBullets() { // the Gunman's bullets, interpolated between ticks
  S.bullets.forEach(b => {
    const x = Math.round((b.px + (b.x - b.px) * S.alpha) * CELL + CELL / 2);
    const y = Math.round((b.py + (b.y - b.py) * S.alpha) * CELL + CELL / 2);
    const w = b.dx ? 12 : 4, h = b.dx ? 4 : 12;
    ctx.fillStyle = '#ffd36b'; ctx.fillRect(x - w / 2, y - h / 2, w, h);
    ctx.fillStyle = '#fff6d0'; ctx.fillRect(x - w / 4, y - h / 4, w / 2, h / 2);
  });
}
function drawShield() { // Swordsman: a ring around the head while the block is ready
  if (!S.alive || S.picking || headId() !== 'swordsman' || !S.shield) return;
  const p = lerpPos(S.prev, 0, S.snake[0], S.heroAlpha);
  ctx.save();
  ctx.strokeStyle = '#6bc5ff'; ctx.lineWidth = 2; ctx.globalAlpha = 0.8;
  ctx.beginPath(); ctx.arc(p.x + CELL / 2, p.y + CELL / 2, CELL / 2 + 1, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}
// ---- Hero select screen (the title screen) ------------------------------------------
function drawLock(cx, cy, s, color) { // a padlock about s px tall, centred on (cx, cy)
  ctx.save();
  ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = Math.max(2, s / 8);
  const top = cy - s * 0.25;                                                     // top edge of the body
  ctx.beginPath(); ctx.arc(cx, top, s * 0.24, Math.PI, 0); ctx.stroke();        // shackle
  ctx.fillRect(cx - s * 0.4, top, s * 0.8, s * 0.7);                             // body
  ctx.fillStyle = '#14101f'; ctx.beginPath(); ctx.arc(cx, top + s * 0.33, s * 0.07, 0, Math.PI * 2); ctx.fill(); // keyhole
  ctx.restore();
}
function drawCoinIcon(x, y, r) {
  ctx.save();
  ctx.fillStyle = '#ffd36b'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#b8892a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}
function fitText(text, x, y, maxW, px, bold) { // one line of text, shrunk until it fits maxW
  let fs = px;
  do { ctx.font = `${bold ? 'bold ' : ''}${fs}px system-ui`; fs--; } while (fs >= 9 && ctx.measureText(text).width > maxW);
  ctx.fillText(text, x, y);
}
function drawHeadPick() { // title screen = hero select: one card per hero. A locked hero is dimmed with its price; clicking buys it.
  const L = headLayout(), now = performance.now(), mid = cv.width / 2;
  ctx.save();
  ctx.fillStyle = '#14101f'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.textAlign = 'center';
  const bob = Math.sin(now / 700) * 4;                    // the title floats
  ctx.font = 'bold 48px system-ui'; ctx.lineWidth = 6; ctx.strokeStyle = '#3a2d5c'; ctx.lineJoin = 'round';
  const tw = ctx.measureText(S.titleText).width;
  ctx.strokeText(S.titleText, mid, 72 + bob);
  ctx.fillStyle = '#ffd36b'; ctx.fillText(S.titleText, mid, 72 + bob);
  ctx.save();                                             // the splash line: tilted and pulsing, tucked under the title's right end
  ctx.translate(Math.min(mid + tw / 2 - 10, cv.width - 120), 94 + bob); ctx.rotate(-0.2);
  const pulse = 1 + Math.sin(now / 250) * 0.06; ctx.scale(pulse, pulse);
  ctx.fillStyle = '#8dff6b'; fitText(S.splashText, 0, 0, 220, 16, true);
  ctx.restore();
  ctx.font = 'bold 18px system-ui'; ctx.textAlign = 'right'; // your coins (top right), so you can see what you can afford
  const label = `${S.coins} coins`, lw = ctx.measureText(label).width;
  drawCoinIcon(cv.width - 16 - lw - 12, 24, 7);
  ctx.fillStyle = '#f3e9ff'; ctx.fillText(label, cv.width - 16, 30);
  ctx.textAlign = 'center';

  HEAD_DEFS.forEach((h, i) => {
    const c = headCardRect(i), sel = i === S.pickIndex, cx = c.x + c.w / 2;
    const price = heroPrice(h.id), locked = !isUnlocked('hero', h.id, price), afford = S.coins >= price;
    const note = S.cardNote && S.cardNote.i === i && now < S.cardNote.until ? S.cardNote : null;
    ctx.fillStyle = locked ? (sel ? '#251e3d' : '#1a1530') : (sel ? '#2c2250' : '#211a3b');
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.lineWidth = 3; ctx.strokeStyle = sel ? '#ffd36b' : '#3a2d5c'; ctx.strokeRect(c.x, c.y, c.w, c.h);
    const py = c.y + (L.big ? 20 : 14);                   // top of the portrait (frame 0 of the "down" row, drawn at 2x)
    ctx.save();
    ctx.globalAlpha = locked ? 0.3 : 1;
    ctx.translate(Math.round(cx - SPRITE), py); ctx.scale(2, 2);
    drawSegment({ c: i, fx: 0, fy: 1 }, 0, 0, true);
    ctx.restore();
    if (locked) drawLock(cx, py + SPRITE, 30, '#c9bde6');
    ctx.fillStyle = locked ? '#9a8cc4' : '#ffd36b';
    fitText(h.name, cx, py + (L.big ? 100 : 86), c.w - 12, L.big ? 22 : 16, true);
    if (L.big) {
      ctx.fillStyle = locked ? '#9a8cc4' : '#f3e9ff'; ctx.font = '14px system-ui';
      wrapText(h.desc, c.w - 24).forEach((line, k) => ctx.fillText(line, cx, c.y + 148 + k * 18));
    }
    const sy = L.big ? c.y + c.h - 40 : c.y + 124, sz = L.big ? 16 : 13;   // status line: a note, or the price
    if (note) {
      ctx.fillStyle = note.ok ? '#8dff6b' : '#ff8a8a'; fitText(note.text, cx, sy, c.w - 10, sz, true);
    } else if (locked) {
      ctx.font = `bold ${sz}px system-ui`;
      const tw = ctx.measureText(String(price)).width, x0 = cx - (tw + 18) / 2;
      drawCoinIcon(x0 + 7, sy - sz * 0.35, 6);
      ctx.fillStyle = afford ? '#ffd36b' : '#8a8aa3'; ctx.textAlign = 'left';
      ctx.fillText(String(price), x0 + 18, sy); ctx.textAlign = 'center';
    }
    ctx.fillStyle = '#9a8cc4'; ctx.font = '12px system-ui';
    if (L.big) ctx.fillText(`[${i + 1}]`, cx, c.y + c.h - 14);
    else { ctx.textAlign = 'left'; ctx.fillText(String(i + 1), c.x + 8, c.y + 16); ctx.textAlign = 'center'; }
  });

  if (!L.big && HEAD_DEFS[S.pickIndex]) {                 // compact grid: the focused hero's description
    const h = HEAD_DEFS[S.pickIndex];
    ctx.fillStyle = '#ffd36b'; ctx.font = 'bold 18px system-ui'; ctx.fillText(h.name, mid, 476);
    ctx.fillStyle = '#f3e9ff'; ctx.font = '14px system-ui';
    wrapText(h.desc, 560).slice(0, 3).forEach((line, k) => ctx.fillText(line, mid, 500 + k * 18));
  }
  ctx.fillStyle = '#9a8cc4'; ctx.font = '13px system-ui';
  ctx.fillText(L.big ? 'Tap a card, or press its number, or use the arrows and Enter'
                     : 'Tap a card to look, tap it again to choose (or use the number keys, arrows and Enter)', mid, 588);
  ctx.fillText('Locked heroes cost coins: tap one to unlock it', mid, 610);
  ctx.restore();
}
function drawAttack(a) {
  const d = a.def;
  if (!d.sheet.ready) return;
  const f = Math.floor(a.age / d.ticksPerFrame);
  const cols = Math.max(1, Math.floor(d.sheet.img.width / d.w));
  const sx = (f % cols) * d.w, sy = Math.floor(f / cols) * d.h;
  const s = d.fit ? Math.min(CELL / d.w, CELL / d.h) : 1; // "contain" inside one tile
  const dw = Math.round(d.w * s), dh = Math.round(d.h * s);
  ctx.save();
  ctx.translate(a.x * CELL + CELL / 2, a.y * CELL + CELL / 2);
  if (a.dir.x < 0) ctx.scale(-1, 1);                        // left: mirror
  else if (a.dir.y) ctx.rotate(a.dir.y * Math.PI / 2);      // up / down: rotate the FX
  ctx.drawImage(d.sheet.img, sx, sy, d.w, d.h, -Math.floor(dw / 2), -Math.floor(dh / 2), dw, dh);
  ctx.restore();
}

// ---- Layers --------------------------------------------------------------------
// Positions are interpolated between ticks: draw at prev + (now - prev) * alpha.
function lerpPos(prevList, i, cur, a = S.alpha) {
  const p = prevList[Math.min(i, prevList.length - 1)];
  if (Math.abs(cur.x - p.x) > 1 || Math.abs(cur.y - p.y) > 1) return { x: cur.x * CELL, y: cur.y * CELL }; // teleported (portal)
  return { x: (p.x + (cur.x - p.x) * a) * CELL, y: (p.y + (cur.y - p.y) * a) * CELL };
}
function drawEnemies() {
  S.enemies.forEach(e => {
    if (e.stun > 0 && S.tick % 2 === 0) return; // blink while stunned
    e.segs.forEach((s, i) => {
      const p = lerpPos(e.prev, i, s), f = faceOf(e, i);
      drawEnemySeg(i === 0, f.fx, f.fy, p.x, p.y);
    });
  });
}
function drawPlayer() {
  if (S.invuln > 0 && !S.quietHit && S.tick % 2 === 0) return; // chain blinks while invulnerable
  S.snake.forEach((s, i) => {
    const p = lerpPos(S.prev, i, s, S.heroAlpha);
    drawSegment(S.roster[i], p.x, p.y, i === 0);
  });
}
function drawDrops() { // dropped characters and dead enemies fade out and float up
  S.drops.forEach(d => {
    ctx.save();
    ctx.globalAlpha = 1 - d.age / DROP_TICKS;
    d.draw(d.x * CELL, d.y * CELL - d.age * 3);
    ctx.restore();
  });
}
function drawPopups() { // floating "+60 x3" text where points were scored
  ctx.save();
  ctx.font = 'bold 16px system-ui'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#14101f';
  S.popups.forEach(p => {
    const x = p.x * CELL + CELL / 2, y = p.y * CELL + 10 - p.age * 3;
    ctx.globalAlpha = 1 - p.age / POPUP_TICKS;
    ctx.strokeText(p.text, x, y);
    ctx.fillStyle = '#ffd36b'; ctx.fillText(p.text, x, y);
  });
  ctx.restore();
}
function drawHud() { // score (left), wave (centre) and coins (right), drawn on the canvas so no layout can ever move the game
  if (S.picking || !S.alive) return;
  ctx.save();
  ctx.font = 'bold 16px system-ui'; ctx.textBaseline = 'alphabetic'; ctx.lineWidth = 3; ctx.strokeStyle = '#14101f'; ctx.lineJoin = 'round';
  const text = (s, x, y, align, color) => {
    ctx.textAlign = align; ctx.strokeText(s, x, y); ctx.fillStyle = color; ctx.fillText(s, x, y);
  };
  text(`Score ${S.score}`, 8, 22, 'left', '#fff');
  if (S.combo > 0) { const m = comboMult(); text(`Combo ${S.combo}` + (m > 1 ? `  x${m}` : ''), 8, 42, 'left', '#ffd36b'); }
  text(`Wave ${S.wave || 1}`, cv.width / 2, 22, 'center', '#fff');
  const label = String(S.coins);
  ctx.textAlign = 'right';
  const w = ctx.measureText(label).width;
  drawCoinIcon(cv.width - 8 - w - 12, 17, 6);
  text(label, cv.width - 8, 22, 'right', '#ffd36b');
  ctx.restore();
}
function drawComboBar() { // thin bar along the top: time left to chain the next kill
  if (S.combo <= 0) return;
  ctx.fillStyle = '#ffd36b';
  ctx.fillRect(0, 0, Math.round(cv.width * S.comboTimer / S.comboWindow), 4);
}
function drawRecruits() { // characters summoned by keys: walking in, then jumping on the spot when ready
  S.recruits.forEach(r => {
    const x = (r.px + (r.x - r.px) * S.alpha) * CELL, y = (r.py + (r.y - r.py) * S.alpha) * CELL;
    if (!r.ready) {
      drawSegment({ c: r.c, fx: r.dx, fy: r.dy }, x, y, false); // walking: faces where it is heading
      return;
    }
    const jump = RECRUIT_JUMP[S.tick % RECRUIT_JUMP.length];
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.3)';                           // shadow stays on the ground while it jumps
    ctx.beginPath(); ctx.ellipse(Math.round(x) + CELL / 2, Math.round(y) + CELL - 4, 9 - jump / 3, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    drawSegment({ c: r.c, fx: 0, fy: 1 }, x, y - jump, false);  // facing down = its portrait pose
    if (SPRITES.recruit.ready) {                                // small "recruit me" marker (recruit.png)
      const frames = Math.max(1, Math.floor(SPRITES.recruit.img.width / SPRITE));
      ctx.drawImage(SPRITES.recruit.img, (S.tick % frames) * SPRITE, 0, SPRITE, SPRITE,
        Math.round(x) + 16, Math.round(y) - 4, 16, 16);
    }
  });
}
function drawStallHint() { // after running into your own tail (or reviving): the snake waits for a direction
  if (!S.alive || S.paused || S.picking || !S.waitDir) return;
  ctx.save();
  ctx.font = 'bold 20px system-ui'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#14101f';
  ctx.globalAlpha = S.tick % 4 < 3 ? 1 : 0.5;
  ctx.strokeText('Choose a direction', cv.width / 2, cv.height - 24);
  ctx.fillStyle = '#fff'; ctx.fillText('Choose a direction', cv.width / 2, cv.height - 24);
  ctx.restore();
}
function drawOverlay() {
  if (S.alive && !S.paused) return;
  ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.textAlign = 'center';
  if (S.alive) {
    ctx.fillStyle = '#fff'; ctx.font = '36px system-ui';
    ctx.fillText('Paused', cv.width / 2, cv.height / 2 - 30);
    ctx.font = '20px system-ui';
    ctx.fillText('Tap or press P to resume', cv.width / 2, cv.height / 2 + 20);
  } else if (S.reviving) drawRevive();
  else drawGameOver();
}
function drawRevive() { // after dying: a countdown to revive (any key or tap) or give up (Q, Backspace or the button)
  const now = performance.now(), cx = cv.width / 2, cy = cv.height / 2;
  const left = Math.max(0, S.reviveEnd - now), live = now >= S.inputAfter;
  ctx.fillStyle = '#fff'; ctx.font = '32px system-ui';
  ctx.fillText('Revive?', cx, cy - 115);
  ctx.fillStyle = '#ffd36b'; ctx.font = 'bold 84px system-ui';
  ctx.fillText(String(Math.ceil(left / 1000)), cx, cy - 25);
  ctx.fillStyle = '#3a2d5c'; ctx.fillRect(cx - 120, cy, 240, 8);
  ctx.fillStyle = '#ffd36b'; ctx.fillRect(cx - 120, cy, Math.round(240 * left / (REVIVE_SECONDS * 1000)), 8);
  ctx.fillStyle = live ? '#fff' : '#8a8aa3'; ctx.font = '20px system-ui';
  ctx.fillText(`Any key or tap: revive for ${reviveCost()} coins (+${Math.round(S.reviveBonus * 100)}% score)`, cx, cy + 45);
  ctx.fillStyle = '#9a8cc4'; ctx.font = '16px system-ui';
  ctx.fillText(`Score ${S.score}   Best ${S.best}   Coins ${S.coins}`, cx, cy + 75);
  const b = giveUpRect();
  ctx.fillStyle = '#211a3b'; ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.lineWidth = 2; ctx.strokeStyle = '#3a2d5c'; ctx.strokeRect(b.x, b.y, b.w, b.h);
  ctx.fillStyle = live ? '#f3e9ff' : '#8a8aa3'; ctx.font = '16px system-ui';
  ctx.fillText('Give up  (Q / Backspace)', cx, b.y + 26);
}
function drawGameOver() {
  const cx = cv.width / 2;
  ctx.fillStyle = '#fff'; ctx.font = '36px system-ui';
  ctx.fillText('Game over', cx, 48);
  ctx.font = '20px system-ui';
  ctx.fillText(`Score ${S.score}${S.newBest ? '  (new best!)' : ''}`, cx, 82);
  ctx.fillStyle = '#c9bde6'; ctx.font = '16px system-ui';
  ctx.fillText(`Best ${S.best}   Best combo ${S.bestCombo}   Coins ${S.coins}`, cx, 108);
  drawBoard();
  ctx.fillStyle = performance.now() >= S.restartAfter ? '#fff' : '#8a8aa3'; // greyed out during the short lockout
  ctx.font = '20px system-ui';
  ctx.fillText('Tap or press Space to restart', cx, 612);
}
function drawBoard() { // the shared top 10 (leaderboard.js fills S.lb). Nothing is drawn while the leaderboard is off.
  const lb = S.lb, cx = cv.width / 2, top = 150, step = 25;
  if (!lb || lb.status === 'off' || lb.status === 'idle') return;
  ctx.fillStyle = '#ffd36b'; ctx.font = 'bold 18px system-ui';
  ctx.fillText('TOP 10', cx, top);
  ctx.font = '16px system-ui';
  if (lb.status === 'loading') { ctx.fillStyle = '#9a8cc4'; ctx.fillText('Loading leaderboard...', cx, top + 40); return; }
  if (lb.status === 'error') { ctx.fillStyle = '#9a8cc4'; ctx.fillText('Leaderboard offline right now', cx, top + 40); return; }
  if (!lb.rows.length) { ctx.fillStyle = '#9a8cc4'; ctx.fillText('No scores yet. Be the first!', cx, top + 40); return; }
  lb.rows.forEach((r, i) => {
    const y = top + 30 + i * step, mine = i === lb.mine;
    if (mine) { ctx.fillStyle = 'rgba(255,211,107,.18)'; ctx.fillRect(cx - 130, y - 18, 260, 24); }
    ctx.fillStyle = mine ? '#ffd36b' : '#f3e9ff';
    ctx.textAlign = 'right'; ctx.fillText(`${i + 1}.`, cx - 80, y);
    ctx.textAlign = 'left';  ctx.fillText(r.name, cx - 66, y);
    ctx.textAlign = 'right'; ctx.fillText(String(r.score), cx + 120, y);
  });
  ctx.textAlign = 'center';
  if (lb.submitting) { ctx.fillStyle = '#9a8cc4'; ctx.fillText('Saving...', cx, 556); }
  else if (lb.submitted && lb.mine >= 0) { ctx.fillStyle = '#8dff6b'; ctx.fillText(`Saved! You are #${lb.mine + 1}`, cx, 556); }
  else if (lb.submitted) { ctx.fillStyle = '#8dff6b'; ctx.fillText('Score saved!', cx, 556); }
}
function wrapText(text, maxW) { // split text into lines that fit maxW pixels in the current font
  const lines = []; let line = '';
  text.split(' ').forEach(w => {
    if (line && ctx.measureText(line + ' ' + w).width > maxW) { lines.push(line); line = w; }
    else line = line ? line + ' ' + w : w;
  });
  if (line) lines.push(line);
  return lines;
}
function drawPick() { //'Tap a card, press 1 / 2 / 3, or use the arrows and Enter'
  if (!S.picking) return;
  if (S.headPicking) return drawHeadPick();
  ctx.save();
  ctx.fillStyle = 'rgba(10,6,20,.85)'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = '28px system-ui';
  ctx.fillText('Choose your run-start buff', cv.width / 2, 150);
  S.pickChoices.forEach((k, i) => {
    const b = BUFFS[k];
    const c = pickCardRect(i), sel = i === S.pickIndex, cx = c.x + c.w / 2;
    ctx.fillStyle = sel ? '#2c2250' : '#211a3b'; ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.lineWidth = 3; ctx.strokeStyle = sel ? '#ffd36b' : '#3a2d5c'; ctx.strokeRect(c.x, c.y, c.w, c.h);
    ctx.fillStyle = '#ffd36b'; ctx.font = 'bold 22px system-ui'; ctx.fillText(b.name, cx, c.y + 50);
    ctx.fillStyle = '#f3e9ff'; ctx.font = '16px system-ui';
    wrapText(b.desc, c.w - 30).forEach((line, k) => ctx.fillText(line, cx, c.y + 90 + k * 22));
    ctx.fillStyle = '#9a8cc4'; ctx.fillText(`[${i + 1}]`, cx, c.y + c.h - 20);
  });
  ctx.font = '14px system-ui'; ctx.fillStyle = '#9a8cc4';
  ctx.fillText('Tap a card, press 1 / 2, or use the arrows and Enter', cv.width / 2, 490);
  ctx.restore();
}
function draw() {
  ctx.clearRect(0, 0, cv.width, cv.height);
  drawHazard();
  drawFood();
  drawMines();
  drawRecruits();
  drawEnemies();
  drawPlayer();
  drawShield();
  drawDrops();
  S.attacks.forEach(drawAttack); // attack layer sits on top of everything else
  drawBullets();
  drawBlasts();
  drawZaps();
  drawPopups();
  drawHud();
  drawComboBar();
  drawStallHint();
  drawOverlay();
  drawPick();
}
// Shown instead of a frozen screen if the game code throws. Uses nothing but the canvas.
function drawCrash(msg) {
  ctx.fillStyle = '#300'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
  ctx.font = '28px system-ui'; ctx.fillText('Something broke', cv.width / 2, cv.height / 2 - 20);
  ctx.font = '16px system-ui'; ctx.fillText(String(msg).slice(0, 70), cv.width / 2, cv.height / 2 + 12);
  ctx.fillText('See the browser console. Tap or press Space to restart.', cv.width / 2, cv.height / 2 + 40);
}
