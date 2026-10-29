// help.js: the help page on the title screen. Open it with the "?" button (or H on the hero select screen). It costs HELP_PRICE
// coins every time you go in. The text is in help_data.js (HELP_PAGES): vague posts that are all true. A hero's page and lore
// only show once that hero is unlocked, until then it is a "???" page.
// Keys: left/right or A/D turn the page, up/down or W/S scroll, Escape/Backspace/H leave. Mouse: the arrows, the wheel.
// Touch: tap the arrows, swipe left or right to turn the page, drag up or down to scroll.
// State: S.helping (page is open), S.helpPage, S.helpScroll, S.helpNote ({ text, until }: shown under the button).

const HELP_TOP = 112, HELP_BOTTOM = 596;   // the text area, in UI canvas pixels
function helpButtonRect() { return { x: 168, y: 8, w: 36, h: 36 }; }   // on the hero select screen, next to Shop
function helpBackRect() { return { x: 8, y: 8, w: 72, h: 36 }; }
function helpPrevRect() { return { x: 20, y: 62, w: 44, h: 36 }; }
function helpNextRect() { return { x: 576, y: 62, w: 44, h: 36 }; }

// The pages you can see right now: locked heroes' pages turn into "???".
function helpPages() {
  return HELP_PAGES.map(p => {
    const locked = p.need && !isUnlocked('hero', p.need, heroPrice(p.need));
    return locked ? { title: '???', lines: p.teaser || HELP_TEASER, locked: true } : p;
  });
}
function helpCurrent() { const pages = helpPages(); return pages[Math.max(0, Math.min(pages.length - 1, S.helpPage || 0))]; }

function openHelp() {
  if (!S.picking || !S.headPicking || S.shopping || S.helping || performance.now() < S.pickAfter) return;
  S.pickAfter = performance.now() + PICK_LOCKOUT_MS;   // the tap that opened it must not also do something else
  if (S.coins < HELP_PRICE) {
    const n = HELP_PRICE - S.coins;
    playSfx('deny'); S.helpNote = { text: `Need ${n} more coin${n === 1 ? '' : 's'}`, until: performance.now() + CARD_NOTE_MS };
    return;
  }
  S.coins -= HELP_PRICE; saveProgress();
  S.helping = true; S.helpPage = 0; S.helpScroll = 0;
  playSfx('unlock');
}
function closeHelp() { S.helping = false; S.pickAfter = performance.now() + PICK_LOCKOUT_MS; playSfx('tick'); }
function helpPage(d) {
  const n = helpPages().length;
  S.helpPage = ((S.helpPage || 0) + d + n) % n; S.helpScroll = 0;
  playSfx('tick');
}

// The page text, wrapped to the text width: { out: [{ t, y }], h }. Uses the UI canvas font, so it also works from event handlers.
function helpLines(pg) {
  ctx.font = '16px system-ui';
  const out = []; let y = 0;
  pg.lines.forEach(t => { wrapText(t, 560).forEach(l => { out.push({ t: l, y }); y += 22; }); y += 10; });
  return { out, h: y };
}
function setHelpScroll(v) {
  const max = Math.max(0, helpLines(helpCurrent()).h - (HELP_BOTTOM - HELP_TOP));
  S.helpScroll = Math.max(0, Math.min(max, v));
}

// A tap or click on the help page (canvas point from the client point).
function helpTap(clientX, clientY) {
  if (performance.now() < S.pickAfter) return;
  const p = canvasPoint(clientX, clientY);
  if (inRect(p, helpBackRect())) return closeHelp();
  if (inRect(p, helpPrevRect())) return helpPage(-1);
  if (inRect(p, helpNextRect())) return helpPage(1);
}

// ---- Drawing ----
function drawHelpButton() { // hero select: a "?" with its price (or a note when you cannot pay)
  const b = helpButtonRect(), note = S.helpNote && performance.now() < S.helpNote.until ? S.helpNote : null;
  ctx.save();
  ctx.fillStyle = '#211a3b'; ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.lineWidth = 2; ctx.strokeStyle = '#ffd36b'; ctx.strokeRect(b.x, b.y, b.w, b.h);
  ctx.fillStyle = '#ffd36b'; ctx.font = 'bold 20px system-ui'; ctx.textAlign = 'center';
  ctx.fillText('?', b.x + b.w / 2, b.y + b.h / 2 + 7);
  ctx.font = '12px system-ui'; ctx.fillStyle = note ? '#ff8a8a' : '#9a8cc4';
  ctx.fillText(note ? note.text : `${HELP_PRICE} coins`, b.x + b.w / 2, b.y + b.h + 14);
  ctx.restore();
}
function drawHelp() {
  const pages = helpPages(), pg = helpCurrent(), mid = cv.width / 2, box = (r, label) => {
    ctx.fillStyle = '#211a3b'; ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.lineWidth = 2; ctx.strokeStyle = '#3a2d5c'; ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = '#f3e9ff'; ctx.font = 'bold 18px system-ui'; ctx.textAlign = 'center'; ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2 + 6);
  };
  ctx.save();
  ctx.fillStyle = '#14101f'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.textAlign = 'center'; ctx.fillStyle = '#ffd36b'; ctx.font = 'bold 28px system-ui'; ctx.fillText('Help', mid, 40);
  const bk = helpBackRect(); box(bk, '< Back');
  ctx.font = 'bold 18px system-ui'; ctx.textAlign = 'right';             // your coins, top right
  const label = `${S.coins} coins`, lw = ctx.measureText(label).width;
  drawCoinIcon(cv.width - 16 - lw - 12, 24, 7);
  ctx.fillStyle = '#f3e9ff'; ctx.fillText(label, cv.width - 16, 30);
  box(helpPrevRect(), '<'); box(helpNextRect(), '>');
  ctx.textAlign = 'center'; ctx.fillStyle = pg.locked ? '#9a8cc4' : '#f3e9ff'; ctx.font = 'bold 22px system-ui';
  ctx.fillText(pg.title, mid, 88);
  const L = helpLines(pg);                                                  // the text, clipped to its area and scrolled
  ctx.save(); ctx.beginPath(); ctx.rect(0, HELP_TOP, cv.width, HELP_BOTTOM - HELP_TOP); ctx.clip();
  ctx.font = '16px system-ui'; ctx.textAlign = 'left'; ctx.fillStyle = pg.locked ? '#9a8cc4' : '#f3e9ff';
  L.out.forEach(l => { const y = HELP_TOP + 22 + l.y - (S.helpScroll || 0); if (y > HELP_TOP - 6 && y < HELP_BOTTOM + 22) ctx.fillText(l.t, 40, y); });
  ctx.restore();
  const view = HELP_BOTTOM - HELP_TOP;                                       // a thin scroll bar when the page is longer than the area
  if (L.h > view) { ctx.fillStyle = '#3a2d5c'; ctx.fillRect(632, HELP_TOP + view * (S.helpScroll || 0) / L.h, 4, view * view / L.h); }
  ctx.textAlign = 'center'; ctx.fillStyle = '#9a8cc4'; ctx.font = '13px system-ui';
  ctx.fillText(`${(S.helpPage || 0) + 1} / ${pages.length}     Turn the page with the arrows or swipe. Esc = leave`, mid, 622);
  ctx.restore();
}

// ---- Input (self-contained, like the shop) ----
addEventListener('keydown', e => {
  if (inNameBox(e) || S.ad) return;
  const k = e.key.toLowerCase();
  if (S.picking && S.headPicking && !S.shopping && !S.helping && k === 'h' && !e.repeat) return openHelp();
  if (!S.helping) return;
  if (k === 'escape' || k === 'backspace' || k === 'h') { if (!e.repeat) closeHelp(); }
  else if (k === 'arrowright' || k === 'd') helpPage(1);
  else if (k === 'arrowleft' || k === 'a') helpPage(-1);
  else if (k === 'arrowdown' || k === 's') setHelpScroll((S.helpScroll || 0) + 40);
  else if (k === 'arrowup' || k === 'w') setHelpScroll((S.helpScroll || 0) - 40);
});
addEventListener('mousedown', e => { if (S.helping && !S.ad && !inNameBox(e) && performance.now() - S.lastTouchAt >= 700) helpTap(e.clientX, e.clientY); });
addEventListener('wheel', e => { if (S.helping) setHelpScroll((S.helpScroll || 0) + e.deltaY); }, { passive: true });
let helpTouch = null; // a finger on the help page: a short touch is a tap, a vertical drag scrolls, a sideways swipe turns the page
addEventListener('touchstart', e => {
  if (!S.helping || S.ad || inNameBox(e)) return;
  helpTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY, scroll: S.helpScroll || 0, moved: false };
}, { passive: true });
addEventListener('touchmove', e => {
  if (!helpTouch) return;
  const dx = e.touches[0].clientX - helpTouch.x, dy = e.touches[0].clientY - helpTouch.y;
  if (Math.abs(dy) > 10 || Math.abs(dx) > 10) helpTouch.moved = true;
  if (helpTouch.moved && Math.abs(dy) > Math.abs(dx)) setHelpScroll(helpTouch.scroll - dy * cv.height / cv.getBoundingClientRect().height);
}, { passive: true });
addEventListener('touchend', e => {
  if (!helpTouch) return;
  const t = helpTouch; helpTouch = null;
  if (!S.helping) return;
  const c = e.changedTouches[0], dx = c.clientX - t.x, dy = c.clientY - t.y;
  if (!t.moved) helpTap(c.clientX, c.clientY);
  else if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) helpPage(dx < 0 ? 1 : -1);
}, { passive: true });