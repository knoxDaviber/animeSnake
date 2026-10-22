// input.js: keyboard, touch and pause.

function pause() { if (S.alive && !S.picking) S.paused = true; }
function resume() {
  if (!S.paused) return;
  S.paused = false;
  S.last = performance.now() - S.alpha * TICK_MS; // continue mid-tick instead of skipping ahead
}
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
addEventListener('blur', pause);

addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if ((!S.alive || S.crashed) && (k === ' ' || k === 'enter')) return newRun();
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

// Which buff card is under a screen point (-1 if none). Converts page pixels to canvas pixels.
function pickAtPoint(clientX, clientY) {
  const r = cv.getBoundingClientRect();
  const x = (clientX - r.left) * cv.width / r.width, y = (clientY - r.top) * cv.height / r.height;
  return BUFFS.findIndex((_, i) => { const c = pickCardRect(i); return x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h; });
}

let touchX, touchY;
addEventListener('touchstart', e => {
  touchX = e.touches[0].clientX; touchY = e.touches[0].clientY;
  if (S.crashed) return newRun();
  if (S.picking) return startRun(pickAtPoint(touchX, touchY));
  if (!S.alive) newRun(); else resume();
});
addEventListener('touchmove', e => {
  if (S.paused) return;
  const dx = e.touches[0].clientX - touchX, dy = e.touches[0].clientY - touchY;
  if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
  if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 1 : -1, 0); else setDir(0, dy > 0 ? 1 : -1);
  touchX = e.touches[0].clientX; touchY = e.touches[0].clientY;
});
addEventListener('mousedown', e => {
  if (S.picking && !S.crashed) startRun(pickAtPoint(e.clientX, e.clientY));
  else if (S.paused) resume();
});
