// input.js: keyboard, touch and pause.

function pause() { if (S.alive && !S.picking) S.paused = true; }
function resume() {
  if (!S.paused) return;
  S.paused = false;
  S.last = performance.now() - S.alpha * TICK_MS; // continue mid-tick instead of skipping ahead
  S.heroLast = performance.now() - S.heroAlpha * heroInterval();
}
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
addEventListener('blur', pause);

// Keys that do not count as "any key" on the revive screen (so shortcuts like Ctrl+R do not revive you).
const MODIFIER_KEYS = ['shift', 'control', 'alt', 'meta', 'capslock', 'altgraph'];

// True for events aimed at the initials box (leaderboard.js) or the info bar (panel.js). The game must not react to
// them: typing, Enter and taps there belong to those, and a tap on Save or the bar must not restart, revive or steer.
function inNameBox(e) { return !!(e.target && e.target.closest && e.target.closest('#nameEntry, #dock')); }

addEventListener('keydown', e => {
  if (inNameBox(e)) return;
  const k = e.key.toLowerCase();
  if (S.crashed) { if (k === ' ' || k === 'enter') newRun(); return; }
    if (k === 'm' && !e.repeat && !e.ctrlKey && !e.metaKey) return toggleMute();
  if (!S.alive) {
    if (S.reviving) {                    // revive countdown: Q / Backspace give up, any other key revives
      if (e.repeat || MODIFIER_KEYS.includes(k)) return;
      if (k === 'q' || k === 'backspace') giveUp(); else revive();
    } else if ((k === ' ' || k === 'enter') && !e.repeat) restartRun(); // game over (after its short lockout)
    return;
  }
  if (S.picking) {                       // pick screens: 1/2/3 choose, arrows move, Enter/Space confirm
    if (e.repeat) return;
    const n = Number(k), count = S.headPicking ? HEAD_DEFS.length : S.pickChoices.length;
    if (n >= 1 && n <= count) return chooseCard(n - 1);   // on a locked hero this unlocks it (if affordable)
    const cols = S.headPicking ? headLayout().cols : count;
    if (k === 'arrowleft' || k === 'a') S.pickIndex = (S.pickIndex + count - 1) % count;
    else if (k === 'arrowright' || k === 'd') S.pickIndex = (S.pickIndex + 1) % count;
    else if (k === 'arrowup' || k === 'w') { if (S.pickIndex - cols >= 0) S.pickIndex -= cols; }
    else if (k === 'arrowdown' || k === 's') { if (S.pickIndex + cols < count) S.pickIndex += cols; }
    else if (k === 'enter' || k === ' ') chooseCard(S.pickIndex);
    return;
  }
  if (k === 'i') return togglePanel();   // show or hide the info bar (works while paused too)
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
// Which card is under a screen point (-1 if none): head cards on the first pick screen, buff cards after it.
function pickAtPoint(clientX, clientY) {
  const p = canvasPoint(clientX, clientY);
  const rect = S.headPicking ? headCardRect : pickCardRect, n = S.headPicking ? HEAD_DEFS.length : S.pickChoices.length;
  return range(n).findIndex(i => { const c = rect(i); return p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h; });
}
function chooseCard(i) { return S.headPicking ? chooseHead(i) : startRun(i); }
// Tap on the hero select screen: the speaker icon mutes, anything else is a card.
function tapPick(clientX, clientY) {
  if (S.headPicking) {
    const p = canvasPoint(clientX, clientY), b = muteButtonRect();
    if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) return toggleMute();
  }
  tapCard(pickAtPoint(clientX, clientY));
}
// A tap or click on a card. In the compact hero grid the first tap only focuses the card (its description shows
// under the grid) and tapping the focused card acts. Big cards and buff cards act at once.
function tapCard(i) {
  if (i < 0) return;
  if (S.headPicking && !headLayout().big && S.pickIndex !== i) { S.pickIndex = i; return; }
  chooseCard(i);
}
// A tap or click while dead: on the revive screen the Give up button gives up and anywhere else revives;
// on the game-over screen it restarts (after the lockout).
function tapWhileDead(clientX, clientY) {
  if (S.reviving) {
    const p = canvasPoint(clientX, clientY), b = giveUpRect();
    if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) giveUp(); else revive();
  } else restartRun();
}

// A tap steers by four zones split by an X, centred at TAP_CENTER_Y of the canvas height. No visual feedback.
function tapSteer(x, y) {
  const dx = x - cv.width / 2, dy = y - cv.height * TAP_CENTER_Y;
  if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 1 : -1, 0); else setDir(0, dy > 0 ? 1 : -1);
}

let touchX, touchY, tapArmed = false; // tapArmed: this touch has not turned into a swipe, so lifting the finger is a tap
addEventListener('touchstart', e => {
  if (inNameBox(e)) return;
  touchX = e.touches[0].clientX; touchY = e.touches[0].clientY;
  S.lastTouchAt = performance.now();   // phones fire a fake mouse click after a tap: mousedown ignores it
  tapArmed = false;
  if (S.crashed) return newRun();
  if (!S.alive) return tapWhileDead(touchX, touchY);
  if (S.picking) return tapPick(touchX, touchY);
  tapArmed = !S.paused;                // a tap that only resumes from pause must not also steer
  resume();
});
addEventListener('touchmove', e => {
  if (inNameBox(e)) return;
  if (S.paused) return;
  const dx = e.touches[0].clientX - touchX, dy = e.touches[0].clientY - touchY;
  if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
  tapArmed = false;                    // it is a swipe now
  if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 1 : -1, 0); else setDir(0, dy > 0 ? 1 : -1);
  touchX = e.touches[0].clientX; touchY = e.touches[0].clientY;
});
addEventListener('touchend', e => {
  if (inNameBox(e) || !tapArmed) return;
  tapArmed = false;
  if (!S.alive || S.picking || S.paused || S.crashed) return;
  const t = e.changedTouches[0], p = canvasPoint(t.clientX, t.clientY);
  tapSteer(p.x, p.y);
});
addEventListener('contextmenu', e => { if (!inNameBox(e)) e.preventDefault(); }); // no long-press menus
addEventListener('mousedown', e => {
  if (S.crashed || inNameBox(e)) return;
  if (performance.now() - S.lastTouchAt < 700) return; // the fake click that follows a touch
  if (!S.alive) tapWhileDead(e.clientX, e.clientY);
  else if (S.picking) tapPick(e.clientX, e.clientY);
  else if (S.paused) resume();
});
addEventListener('mousemove', e => {
  if (!S.picking || inNameBox(e)) return;
  const i = pickAtPoint(e.clientX, e.clientY);
  if (i >= 0) S.pickIndex = i;
});