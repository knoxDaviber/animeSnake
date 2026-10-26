// scenery.js: how the world LOOKS. Room floors, wall / hazard / mud / conveyor / gate / ice tiles, and the decor that
// tells the story without a single word (Dark Souls style): bones, a dead bonfire, a sword stuck in the ground,
// headless statues, a dead king. Everything is drawn from plain shapes, so no art files are needed; real tile art can
// replace any function here later.
// drawScenery() is called by drawWorld (render.js), inside the camera transform, so positions are world pixels.

function themeAt(x, y) { const r = roomAt(x, y); return ROOM_THEMES[r ? r.theme : 'crypt']; }

function drawScenery() {
  const v = viewTiles(), x0 = Math.max(0, v.x0), y0 = Math.max(0, v.y0), x1 = Math.min(COLS - 1, v.x1), y1 = Math.min(ROWS - 1, v.y1);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (roomOpenAt(x, y) || S.map[y][x] === 'D') drawTile(x, y);
  for (const d of S.decor) {
       if (d.x < x0 || d.x > x1 || d.y < y0 || d.y > y1) continue;
       if (!roomOpenAt(d.x, d.y)) continue;
    const f = DECOR[d.k];
    if (f) f(d.x * CELL, d.y * CELL, d.v);
  }
}

// ---- Tiles ------------------------------------------------------------------------------------------------------
function drawTile(x, y) {
  const t = S.map[y][x], th = themeAt(x, y), px = x * CELL, py = y * CELL;
  if (t === '#') return drawWallTile(x, y, th, px, py);
  if (t === 'T') return drawTurretTile(x, y, th, px, py);
  if (t === 'D') return drawDoorTile(x, y, th, px, py);
  ctx.fillStyle = (x * 7 + y * 13) % 5 === 0 ? th.alt : th.floor;   // a few lighter flagstones so the floor is not flat
  ctx.fillRect(px, py, CELL, CELL);
  if (t === 'H') drawHazardTile(px, py);
  else if (t === '~') drawMud(px, py);
  else if (t === 'B') drawBlockTile(px, py);
  else if (t === 'Z') drawBumper(px, py);
  else if (t === 'C') drawCrumble(x, y, px, py);
  else if (t === 'I') drawIce(x, y, px, py);
  else if (CONVEYOR_DIR[t]) drawConveyor(t, px, py);
  else if (GATE_DIR[t]) drawGate(t, th, px, py);
  else if (t === '*') {                                              // a faint worn sigil: keys like to appear here
    ctx.strokeStyle = 'rgba(255,211,107,.16)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(px + 16, py + 16, 9, 0, 6.3); ctx.stroke();
  }
}
function drawWallTile(x, y, th, px, py) {
  ctx.fillStyle = th.wall; ctx.fillRect(px, py, CELL, CELL);
  ctx.fillStyle = 'rgba(0,0,0,.28)';                                 // mortar between the stones
  const o = y % 2 ? 0 : 12;
  ctx.fillRect(px, py + 15, CELL, 2); ctx.fillRect(px + 10 + o, py, 2, 15); ctx.fillRect(px + 22 - o, py + 17, 2, 15);
  if (!isWall(x, y - 1)) { ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fillRect(px, py, CELL, 3); }       // lit top edge
  if (!isWall(x, y + 1)) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(px, py + CELL - 3, CELL, 3); }  // shadowed foot
}
function drawHazardTile(px, py) {
  if (SPRITES.hazard.ready) return drawItem(SPRITES.hazard, S.tick, px, py);
  ctx.fillStyle = '#8a8aa3'; // fallback spikes
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(px + 2 + i * 10, py + CELL - 4);
    ctx.lineTo(px + 7 + i * 10, py + 6);
    ctx.lineTo(px + 12 + i * 10, py + CELL - 4);
    ctx.fill();
  }
}
function drawMud(px, py) {
  ctx.fillStyle = 'rgba(70,48,34,.85)'; ctx.fillRect(px, py, CELL, CELL);
  ctx.fillStyle = 'rgba(30,20,14,.6)';
  ctx.beginPath(); ctx.ellipse(px + 10, py + 12, 7, 4, 0, 0, 6.3); ctx.fill();
  ctx.beginPath(); ctx.ellipse(px + 22, py + 21, 6, 3.5, 0, 0, 6.3); ctx.fill();
}
function drawIce(x, y, px, py) {
  ctx.fillStyle = 'rgba(150,200,255,.2)'; ctx.fillRect(px, py, CELL, CELL);
  ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 1.5;
  const s = (x * 5 + y * 11) % 9;
  ctx.beginPath(); ctx.moveTo(px + 5 + s, py + 8); ctx.lineTo(px + 13 + s, py + 4); ctx.moveTo(px + 14, py + 24 - s / 2); ctx.lineTo(px + 24, py + 19 - s / 2); ctx.stroke();
}
function drawConveyor(t, px, py) {
  const c = CONVEYOR_DIR[t];
  ctx.fillStyle = 'rgba(20,16,31,.55)'; ctx.fillRect(px, py, CELL, CELL);
  ctx.save(); ctx.translate(px + 16, py + 16); ctx.rotate(Math.atan2(c.y, c.x));
  ctx.strokeStyle = '#8a7cc0'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
  for (const k of [-10, 2]) {                                        // two chevrons sliding along the belt
    const x = ((k + (S.tick % 4) * 3 + 16) % 24) - 12;
    ctx.beginPath(); ctx.moveTo(x - 4, -6); ctx.lineTo(x + 2, 0); ctx.lineTo(x - 4, 6); ctx.stroke();
  }
  ctx.restore();
}
function drawGate(t, th, px, py) {                                   // stone posts on the two blocked sides, a gold arrow
  const g = GATE_DIR[t];
  ctx.fillStyle = th.wall;
  if (g.x) { ctx.fillRect(px, py, CELL, 5); ctx.fillRect(px, py + CELL - 5, CELL, 5); }
  else { ctx.fillRect(px, py, 5, CELL); ctx.fillRect(px + CELL - 5, py, 5, CELL); }
  ctx.save(); ctx.translate(px + 16, py + 16); ctx.rotate(Math.atan2(g.y, g.x));
  ctx.fillStyle = '#c9a64b'; ctx.beginPath(); ctx.moveTo(-6, -7); ctx.lineTo(7, 0); ctx.lineTo(-6, 7); ctx.fill();
  ctx.restore();
}
function drawBlockTile(px, py) {                                     // a push block: a stone crate
  ctx.fillStyle = '#6b5f86'; ctx.fillRect(px + 3, py + 3, CELL - 6, CELL - 6);
  ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(px + 3, py + 3, CELL - 6, 3);
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(px + 3, py + CELL - 7, CELL - 6, 4);
  ctx.strokeStyle = '#2b2440'; ctx.lineWidth = 2; ctx.strokeRect(px + 3, py + 3, CELL - 6, CELL - 6);
  ctx.strokeStyle = 'rgba(43,36,64,.6)'; ctx.beginPath();
  ctx.moveTo(px + 3, py + 3); ctx.lineTo(px + CELL - 3, py + CELL - 3); ctx.moveTo(px + CELL - 3, py + 3); ctx.lineTo(px + 3, py + CELL - 3); ctx.stroke();
}
function drawBumper(px, py) {                                        // a purple pad with a clockwise arrow
  const cx = px + 16, cy = py + 16, r = 11 * (1 + 0.08 * Math.sin(S.tick));
  ctx.fillStyle = '#7a3fb5'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.3); ctx.fill();
  ctx.strokeStyle = '#c78bff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.3); ctx.stroke();
  ctx.strokeStyle = '#fff6d0'; ctx.fillStyle = '#fff6d0'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, 5, -2.4, 0.6); ctx.stroke();
  const a = 0.6, ex = cx + Math.cos(a) * 5, ey = cy + Math.sin(a) * 5, tx = -Math.sin(a), ty = Math.cos(a), nx = Math.cos(a), ny = Math.sin(a);
  ctx.beginPath(); ctx.moveTo(ex + tx * 4, ey + ty * 4); ctx.lineTo(ex + nx * 3, ey + ny * 3); ctx.lineTo(ex - nx * 3, ey - ny * 3); ctx.fill();
}
function drawCrumble(x, y, px, py) {                                 // cracked flagstone
  ctx.fillStyle = 'rgba(120,100,80,.5)'; ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
  ctx.strokeStyle = 'rgba(20,12,8,.7)'; ctx.lineWidth = 1.5; ctx.beginPath();
  const s = (x * 3 + y * 7) % 6;
  ctx.moveTo(px + 4 + s, py + 3); ctx.lineTo(px + 13, py + 14); ctx.lineTo(px + 9, py + 20); ctx.lineTo(px + 18, py + 29);
  ctx.moveTo(px + 13, py + 14); ctx.lineTo(px + 26, py + 10);
  ctx.stroke();
}
function drawTurretTile(x, y, th, px, py) {                          // a wall tile with a barrel pointing into the room; it glows just before it fires
  drawWallTile(x, y, th, px, py);
  const t = (S.turrets || []).find(q => q.x === x && q.y === y);
  if (!t) return;
  const cx = px + 16, cy = py + 16, hot = t.cd <= 3;
  ctx.fillStyle = '#2a2438'; ctx.beginPath(); ctx.arc(cx, cy, 11, 0, 6.3); ctx.fill();
  ctx.fillStyle = hot ? '#ff6b4d' : '#7b7f8f'; ctx.beginPath(); ctx.arc(cx, cy, 7, 0, 6.3); ctx.fill();
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.atan2(t.dy, t.dx));
  ctx.fillStyle = hot ? '#ff6b4d' : '#9aa3b5'; ctx.fillRect(2, -3, 14, 6);
  ctx.restore();
}
// ---- Decor: small drawings, each in its own 32x32 tile (px, py = top left, v = a random 0..1 for variety) --------
const DECOR = {
  bone(px, py, v) {
    ctx.save(); ctx.translate(px + 16, py + 16); ctx.rotate(v * 6.28); ctx.fillStyle = '#b9b2a0';
    ctx.fillRect(-9, -1.5, 18, 3); ctx.fillRect(-10, -3, 3, 6); ctx.fillRect(7, -3, 3, 6); ctx.restore();
  },
  skull(px, py) {
    ctx.fillStyle = '#cfc8b4'; ctx.beginPath(); ctx.arc(px + 16, py + 14, 7, 0, 6.3); ctx.fill(); ctx.fillRect(px + 12, py + 18, 8, 5);
    ctx.fillStyle = '#14101f'; ctx.fillRect(px + 12, py + 12, 3, 4); ctx.fillRect(px + 17, py + 12, 3, 4); ctx.fillRect(px + 15, py + 19, 2, 3);
  },
  ribs(px, py) {
    ctx.strokeStyle = '#b9b2a0'; ctx.lineWidth = 2; ctx.beginPath();
    ctx.moveTo(px + 16, py + 5); ctx.lineTo(px + 16, py + 27);
    for (let i = 0; i < 4; i++) {
      const y = py + 9 + i * 5;
      ctx.moveTo(px + 16, y); ctx.quadraticCurveTo(px + 5, y - 2, px + 6, y + 4);
      ctx.moveTo(px + 16, y); ctx.quadraticCurveTo(px + 27, y - 2, px + 26, y + 4);
    }
    ctx.stroke();
  },
  crack(px, py, v) {
    ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 1.5; ctx.beginPath();
    const s = v * 8; ctx.moveTo(px + 4 + s, py + 5); ctx.lineTo(px + 12, py + 13); ctx.lineTo(px + 10 + s / 2, py + 19); ctx.lineTo(px + 20, py + 27); ctx.stroke();
  },
  moss(px, py, v) {
    ctx.fillStyle = 'rgba(70,120,70,.35)';
    ctx.beginPath(); ctx.ellipse(px + 11 + v * 8, py + 14, 8, 5, 0, 0, 6.3); ctx.fill();
    ctx.beginPath(); ctx.ellipse(px + 20, py + 22 - v * 4, 6, 4, 0, 0, 6.3); ctx.fill();
  },
  flower(px, py, v) {                                                // a wilted one: the head hangs down
    ctx.strokeStyle = '#4b6b3a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px + 14, py + 26); ctx.quadraticCurveTo(px + 14, py + 10, px + 20, py + 9 + v * 3); ctx.stroke();
    ctx.fillStyle = '#7a4a6a'; ctx.beginPath(); ctx.arc(px + 21, py + 13 + v * 3, 3.5, 0, 6.3); ctx.fill();
  },
  puddle(px, py, v) {
    ctx.fillStyle = 'rgba(90,140,190,.28)'; ctx.beginPath(); ctx.ellipse(px + 16, py + 17, 11 - v * 3, 6, 0, 0, 6.3); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(px + 11, py + 15, 6, 1.5);
  },
  frost(px, py, v) {
    ctx.strokeStyle = 'rgba(220,240,255,.45)'; ctx.lineWidth = 1.5; ctx.beginPath();
    const cx = px + 16, cy = py + 16, r = 7 + v * 3;
    for (let i = 0; i < 3; i++) { const a = i * 1.05; ctx.moveTo(cx - Math.cos(a) * r, cy - Math.sin(a) * r); ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
    ctx.stroke();
  },
  candle(px, py) {                                                   // burnt out: no flame, wax dripped down the side
    ctx.fillStyle = '#d8d2c0'; ctx.fillRect(px + 13, py + 14, 6, 11);
    ctx.fillStyle = '#9d977f'; ctx.fillRect(px + 17, py + 16, 2, 7);
    ctx.fillStyle = '#14101f'; ctx.fillRect(px + 15, py + 11, 2, 4);
  },
  chain(px, py, v) {
    ctx.strokeStyle = '#7b7f8f'; ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(px + 7 + i * 6, py + 12 + i * 3 + v * 4, 3.5, 2.2, 0.4, 0, 6.3); ctx.stroke(); }
  },
  sword(px, py) {                                                    // stuck in the ground, point down
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(px + 16, py + 27, 7, 2.5, 0, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#9aa3b5'; ctx.fillRect(px + 14, py + 7, 4, 19);
    ctx.fillStyle = '#6b5a3a'; ctx.fillRect(px + 9, py + 5, 14, 3); ctx.fillRect(px + 15, py + 1, 2, 4);
  },
  helm(px, py) {
    ctx.fillStyle = '#7c8499'; ctx.beginPath(); ctx.arc(px + 16, py + 20, 9, Math.PI, 0); ctx.fill(); ctx.fillRect(px + 7, py + 20, 18, 5);
    ctx.fillStyle = '#14101f'; ctx.fillRect(px + 10, py + 19, 12, 3);
  },
  bonfire(px, py) {                                                  // cold: a coiled sword in grey ash, one faint ember
    ctx.fillStyle = '#3a3440'; ctx.beginPath(); ctx.ellipse(px + 16, py + 24, 13, 6, 0, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#4b4452'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(px + 4 + i * 4.8, py + 25 + (i % 2) * 2, 2.5, 0, 6.3); ctx.fill(); }
    ctx.fillStyle = '#8b93a8'; ctx.fillRect(px + 15, py + 3, 3, 21); ctx.fillStyle = '#6b5a3a'; ctx.fillRect(px + 11, py + 7, 11, 2);
    ctx.fillStyle = `rgba(255,120,40,${0.2 + 0.12 * Math.sin(S.tick / 3)})`; ctx.beginPath(); ctx.arc(px + 17, py + 24, 2.5, 0, 6.3); ctx.fill();
  },
  banner(px, py) {                                                   // on a wall: torn, faded
    ctx.fillStyle = '#3a2d2d'; ctx.fillRect(px + 6, py + 3, 20, 2);
    ctx.fillStyle = '#6e1f2a'; ctx.beginPath(); ctx.moveTo(px + 8, py + 5); ctx.lineTo(px + 24, py + 5); ctx.lineTo(px + 24, py + 23);
    ctx.lineTo(px + 20, py + 19); ctx.lineTo(px + 16, py + 26); ctx.lineTo(px + 12, py + 20); ctx.lineTo(px + 8, py + 24); ctx.fill();
  },
  statue(px, py) {                                                   // on a wall: a knight with no head (it lies at his feet)
    ctx.fillStyle = '#7b7f8f'; ctx.fillRect(px + 10, py + 17, 5, 10); ctx.fillRect(px + 17, py + 17, 5, 10);
    ctx.fillRect(px + 9, py + 9, 14, 9); ctx.fillRect(px + 5, py + 9, 5, 4); ctx.fillRect(px + 22, py + 9, 5, 4); ctx.fillRect(px + 14, py + 6, 4, 4);
    ctx.fillStyle = '#5a5e6e'; ctx.beginPath(); ctx.arc(px + 26, py + 27, 3, 0, 6.3); ctx.fill();
  },
  throne(px, py) {
    ctx.fillStyle = '#4a3a52'; ctx.fillRect(px + 6, py + 2, 20, 22); ctx.fillRect(px + 3, py + 15, 26, 9);
    ctx.fillStyle = '#8a7a3a'; ctx.fillRect(px + 6, py + 2, 20, 2); ctx.fillRect(px + 3, py + 15, 3, 9); ctx.fillRect(px + 26, py + 15, 3, 9);
  },
  crown(px, py) {
    ctx.fillStyle = '#c9a64b'; ctx.beginPath(); ctx.moveTo(px + 10, py + 22); ctx.lineTo(px + 10, py + 14); ctx.lineTo(px + 13, py + 18);
    ctx.lineTo(px + 16, py + 12); ctx.lineTo(px + 19, py + 18); ctx.lineTo(px + 22, py + 14); ctx.lineTo(px + 22, py + 22); ctx.fill();
  },
  wheel(px, py) {                                                    // on a wall: a broken mill wheel
    ctx.strokeStyle = '#6b5a44'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(px + 16, py + 16, 11, 0.3, 5.2); ctx.stroke();
    ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i < 5; i++) { const a = i * 1.2 + 0.4; ctx.moveTo(px + 16, py + 16); ctx.lineTo(px + 16 + Math.cos(a) * 10, py + 16 + Math.sin(a) * 10); }
    ctx.stroke();
  },
  bedroll(px, py) {
    ctx.fillStyle = '#5a4a3a'; ctx.fillRect(px + 6, py + 9, 20, 14);
    ctx.fillStyle = '#8a7a62'; ctx.fillRect(px + 7, py + 10, 7, 12);
  },
};