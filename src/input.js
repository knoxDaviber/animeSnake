// input.js: keyboard, touch and pause.

function pause() { if (S.alive) S.paused = true; }
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
  if (k === 'p' || k === 'escape') return S.paused ? resume() : pause();
  if (S.paused) return;
  if (k === 'arrowup' || k === 'w') setDir(0, -1);
  else if (k === 'arrowdown' || k === 's') setDir(0, 1);
  else if (k === 'arrowleft' || k === 'a') setDir(-1, 0);
  else if (k === 'arrowright' || k === 'd') setDir(1, 0);
});

let touchX, touchY;
addEventListener('touchstart', e => {
  touchX = e.touches[0].clientX; touchY = e.touches[0].clientY;
  if (!S.alive || S.crashed) newRun(); else resume();
});
addEventListener('touchmove', e => {
  if (S.paused) return;
  const dx = e.touches[0].clientX - touchX, dy = e.touches[0].clientY - touchY;
  if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
  if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 1 : -1, 0); else setDir(0, dy > 0 ? 1 : -1);
  touchX = e.touches[0].clientX; touchY = e.touches[0].clientY;
});
addEventListener('mousedown', () => { if (S.paused) resume(); });
