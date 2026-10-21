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
function drawSegment(r, px, py, isHead) { // a character in the chain
  const ch = CHARACTERS[r.c % CHARACTERS.length];
  px = Math.round(px); py = Math.round(py);
  if (ch.ready) {
    drawDirectional(ch, r.fx, r.fy, S.tick, px, py);
  } else {
    ctx.fillStyle = COLORS[r.c % COLORS.length];
    ctx.fillRect(px + 2, py + 2, CELL - 4, CELL - 4);
    if (isHead) { ctx.fillStyle = '#fff'; ctx.fillRect(px + 11, py + 11, 10, 10); }
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
function drawFood() {
  const x = S.food.x * CELL, y = S.food.y * CELL;
  if (SPRITES.food.ready) return drawItem(SPRITES.food, S.tick, x, y);
  ctx.fillStyle = '#ff4d4d';
  ctx.fillRect(x + 6, y + 6, CELL - 12, CELL - 12);
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
function drawOverlay() {
  if (S.alive && !S.paused) return;
  ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.fillStyle = '#fff'; ctx.font = '36px system-ui'; ctx.textAlign = 'center';
  ctx.fillText(S.alive ? 'Paused' : 'Game over', cv.width / 2, cv.height / 2 - 30);
  ctx.font = '20px system-ui';
  if (!S.alive) {
    ctx.fillText(`Score ${S.score}${S.newBest ? '  (new best!)' : ''}`, cv.width / 2, cv.height / 2 + 5);
    ctx.fillText(`Best ${S.best}   Best combo ${S.bestCombo}`, cv.width / 2, cv.height / 2 + 33);
  }
  ctx.fillText(S.alive ? 'Tap or press P to resume' : 'Tap or press Space to restart', cv.width / 2, cv.height / 2 + (S.alive ? 20 : 68));
}
function draw() {
  ctx.clearRect(0, 0, cv.width, cv.height);
  drawHazard();
  drawFood();
  drawEnemies();
  drawPlayer();
  drawDrops();
  S.attacks.forEach(drawAttack); // attack layer sits on top of everything else
  drawPopups();
  drawComboBar();
  drawOverlay();
}
// Shown instead of a frozen screen if the game code throws. Uses nothing but the canvas.
function drawCrash(msg) {
  ctx.fillStyle = '#300'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
  ctx.font = '28px system-ui'; ctx.fillText('Something broke', cv.width / 2, cv.height / 2 - 20);
  ctx.font = '16px system-ui'; ctx.fillText(String(msg).slice(0, 70), cv.width / 2, cv.height / 2 + 12);
  ctx.fillText('See the browser console. Tap or press Space to restart.', cv.width / 2, cv.height / 2 + 40);
}
