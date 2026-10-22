// render.js: everything that draws. Reads S, never changes game state (hud() only touches the page text).

const cv = document.getElementById('c'), ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;

function hud() {
  document.getElementById('score').textContent = S.score;
  document.getElementById('len').textContent = S.snake.length;
  document.getElementById('wave').textContent = S.wave || 1;
  document.getElementById('combo').textContent = S.combo ? `${S.combo} (x${comboMult()})` : '-';
  document.getElementById('best').textContent = S.best;
  document.getElementById('bestcombo').textContent = S.bestCombo;
  const b = BUFFS.find(x => x.id === S.buff);
  document.getElementById('buff').textContent = b ? b.name : '-';
}

// ---- Sprite helpers ------------------------------------------------------------
// Draws one 32x32 frame of a directional sheet at 1:1. Sprites face right; left is mirrored.
function drawDirectional(sh, fx, fy, tick, px, py) {
  let row = DIR_ROW.right, flip = false;
  if (fy < 0) row = DIR_ROW.up;
  else if (fy > 0) row = DIR_ROW.down;
  else flip = fx < 0;
  const sx = (tick % FRAMES) * SPRITE, sy = row * SPRITE;
  if (flip) {
    ctx.save();
    ctx.translate(px + CELL, py);
    ctx.scale(-1, 1);
    ctx.drawImage(sh.img, sx, sy, SPRITE, SPRITE, 0, 0, SPRITE, SPRITE);
    ctx.restore();
  } else {
    ctx.drawImage(sh.img, sx, sy, SPRITE, SPRITE, px, py, SPRITE, SPRITE);
  }
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
function drawFood() { // the recruit key (still the food sprite until it gets its own art)
  if (!S.food) return; // no key while enough characters are already waiting
  const x = S.food.x * CELL, y = S.food.y * CELL;
  if (SPRITES.food.ready) return drawItem(SPRITES.food, S.tick, x, y);
  ctx.fillStyle = '#ff4d4d';
  ctx.fillRect(x + 6, y + 6, CELL - 12, CELL - 12);
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
function lerpPos(prevList, i, cur) {
  const p = prevList[Math.min(i, prevList.length - 1)];
  return { x: (p.x + (cur.x - p.x) * S.alpha) * CELL, y: (p.y + (cur.y - p.y) * S.alpha) * CELL };
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
  fit=true;
  if (S.invuln > 0 && S.tick % 2 === 0) return; // chain blinks while invulnerable
  S.snake.forEach((s, i) => {
    const p = lerpPos(S.prev, i, s);
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
function drawComboBar() { // thin bar along the top: time left to chain the next kill
  if (S.combo <= 0) return;
  ctx.fillStyle = '#ffd36b';
  ctx.fillRect(0, 0, Math.round(cv.width * S.comboTimer / COMBO_WINDOW), 4);
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
  ctx.fillText(`Press any key or tap to revive (+${Math.round(REVIVE_SCORE_BONUS * 100)}% score)`, cx, cy + 45);
  ctx.fillStyle = '#9a8cc4'; ctx.font = '16px system-ui';
  ctx.fillText(`Score ${S.score}   Best ${S.best}`, cx, cy + 75);
  const b = giveUpRect();
  ctx.fillStyle = '#211a3b'; ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.lineWidth = 2; ctx.strokeStyle = '#3a2d5c'; ctx.strokeRect(b.x, b.y, b.w, b.h);
  ctx.fillStyle = live ? '#f3e9ff' : '#8a8aa3'; ctx.font = '16px system-ui';
  ctx.fillText('Give up  (Q / Backspace)', cx, b.y + 26);
}
function drawGameOver() {
  const cx = cv.width / 2, cy = cv.height / 2;
  ctx.fillStyle = '#fff'; ctx.font = '36px system-ui';
  ctx.fillText('Game over', cx, cy - 30);
  ctx.font = '20px system-ui';
  ctx.fillText(`Score ${S.score}${S.newBest ? '  (new best!)' : ''}`, cx, cy + 5);
  ctx.fillText(`Best ${S.best}   Best combo ${S.bestCombo}`, cx, cy + 33);
  ctx.fillStyle = performance.now() >= S.restartAfter ? '#fff' : '#8a8aa3'; // greyed out during the short lockout
  ctx.fillText('Tap or press Space to restart', cx, cy + 68);
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
function drawPick() { // run-start pick screen: one card per buff
  if (!S.picking) return;
  ctx.save();
  ctx.fillStyle = 'rgba(10,6,20,.85)'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = '28px system-ui';
  ctx.fillText('Choose your run-start buff', cv.width / 2, 150);
  BUFFS.forEach((b, i) => {
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
  drawDrops();
  S.attacks.forEach(drawAttack); // attack layer sits on top of everything else
  drawBlasts();
  drawPopups();
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
