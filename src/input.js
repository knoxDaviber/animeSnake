// input.js: keyboard, touch and pause.

function pause() { if (S.alive && !S.picking) S.paused = true; }
function resume() {
  if (!S.paused) return;
  S.paused = false;
  S.last = performance.now() - S.alpha * TICK_MS; // continue mid-tick instead of skipping ahead
}
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
addEventListener('blur', pause);

// Keys that do not count as "any key" on the revive screen (so shortcuts like Ctrl+R do not revive you).
const MODIFIER_KEYS = ['shift', 'control', 'alt', 'meta', 'capslock', 'altgraph'];

addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (S.crashed) { if (k === ' ' || k === 'enter') newRun(); return; }
  if (!S.alive) {
    if (S.reviving) {                    // revive countdown: Q / Backspace give up, any other key revives
      if (e.repeat || MODIFIER_KEYS.includes(k)) return;
      if (k === 'q' || k === 'backspace') giveUp(); else revive();
    } else if ((k === ' ' || k === 'enter') && !e.repeat) restartRun(); // game over (after its short lockout)
    return;
  }
  if (S.picking) {                       // run-start pick screen: 1/2 choose, arrows move, Enter/Space confirm
    if (e.repeat) return;
    const n = Number(k);
    if (n >= 1 && n <= BUFFS.length) return startRun(n - 1);
    if (k === 'arrowleft' || k === 'a') S.pickIndex = (S.pickIndex + BUFFS.length - 1) % BUFFS.length;
    else if (k === 'arrowright' || k === 'd') S.pickIndex = (S.pickIndex + 1) % BUFFS.length;
    else if (k === 'enter' || k === ' ') startRun(S.pickIndex);
    return;
  }
  if (k === 'p' || k === 'escape') return S.paused ? resume() : pause();
  if (S.paused) return;
  if (k === 'arrowup' || k === 'w') setDir(0, -1);
  else if (k === 'arrowdown' || k === 's') setDir(0, 1);
  else if (k === 'arrowleft' || k === 'a') setDir(-1, 0);
  else if (k === 'arrowright' || k === 'd') setDir(1, 0);
});

// Converts a page point to canvas pixels.
function canvasPoint(clientX, clientY) {
  const r = cv.getBoundingClientRect();
  return { x: (clientX - r.left) * cv.width / r.width, y: (clientY - r.top) * cv.height / r.height };
}
// Which buff card is under a screen point (-1 if none).
function pickAtPoint(clientX, clientY) {
  const p = canvasPoint(clientX, clientY);
  return BUFFS.findIndex((_, i) => { const c = pickCardRect(i); return p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h; });
}
// A tap or click while dead: on the revive screen the Give up button gives up and anywhere else revives;
// on the game-over screen it restarts (after the lockout).
function tapWhileDead(clientX, clientY) {
  if (S.reviving) {
    const p = canvasPoint(clientX, clientY), b = giveUpRect();
    if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) giveUp(); else revive();
  } else restartRun();
}

let touchX, touchY;
addEventListener('touchstart', e => {
  touchX = e.touches[0].clientX; touchY = e.touches[0].clientY;
  if (S.crashed) return newRun();
  if (!S.alive) return tapWhileDead(touchX, touchY);
  if (S.picking) return startRun(pickAtPoint(touchX, touchY));
  resume();
});
addEventListener('touchmove', e => {
  if (S.paused) return;
  const dx = e.touches[0].clientX - touchX, dy = e.touches[0].clientY - touchY;
  if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
  if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 1 : -1, 0); else setDir(0, dy > 0 ? 1 : -1);
  touchX = e.touches[0].clientX; touchY = e.touches[0].clientY;
});
addEventListener('mousedown', e => {
  if (S.crashed) return;
  if (!S.alive) tapWhileDead(e.clientX, e.clientY);
  else if (S.picking) startRun(pickAtPoint(e.clientX, e.clientY));
  else if (S.paused) resume();
});
