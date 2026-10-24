// shop.js: the title-screen shop (opened from the Shop button or B on the hero select screen) and the permanent
// starting followers. Prices live in SHOP_LOCKED etc. in config.js.
//  * Locked buffs: S.buffLv[id] = level (0 = locked). Level 1 unlocks the buff (it joins the pick pool); later levels
//    make Magician's gift and Everything is a bomb stronger. You always play your highest level.
//  * Starting followers: "random follower" (perk 'startRandom'), then each base follower can be bought (kind 'follower')
//    and ONE of the bought ones selected (S.startPick). Both are added at the start of every run (applyPermanentStart).
// Bought things are saved by storage.js (S.unlocked, S.buffLv, S.startPick).

const SHOP_TOP = 64, SHOP_BOTTOM = 604, SHOP_ROW_H = 66, SHOP_HEAD_H = 36;

function shopButtonRect() { return { x: 96, y: 8, w: 64, h: 36 }; }  // on the hero select screen
function shopBackRect() { return { x: 8, y: 8, w: 72, h: 36 }; }

// ---- Buff levels ----
function buffLevel(id) { return S.buffLv[id] || 0; }
function buffAvailable(id) { return !SHOP_LOCKED[id] || buffLevel(id) > 0; }   // used by rollPickChoices (buffs.js)
function giftPerWave() { return buffLevel('magiciansGift') || GIFT_PORTALS_PER_WAVE; }
function bombPct() { return buffLevel('bombAll') || Math.round(BOMB_CHANCE * 100); }
function bombMult(pct) { return 1 + pct * BOMB_SCORE_PER_PCT; }

// ---- Rows and scrolling ----
function shopRows() {
  const rows = [{ head: 'RUN BUFFS' }];
  Object.keys(SHOP_LOCKED).forEach(id => rows.push({ kind: 'buff', id }));
  rows.push({ head: 'STARTING FOLLOWERS' }, { kind: 'rand' });
  if (isUnlocked('perk', 'startRandom', SHOP_RANDOM_PRICE))
    FOLLOWERS.forEach(f => { if (!f.fusion) rows.push({ kind: 'pick', id: f.id }); });
  return rows;
}
function shopLayout() { // each row with its y inside the scrolling list
  let y = 0;
  return shopRows().map(r => { const h = r.head ? SHOP_HEAD_H : SHOP_ROW_H, o = { r, y, h }; y += h; return o; });
}
function shopMaxScroll() { const L = shopLayout(), last = L[L.length - 1]; return Math.max(0, last.y + last.h - (SHOP_BOTTOM - SHOP_TOP)); }
function setShopScroll(v) { S.shopScroll = Math.max(0, Math.min(shopMaxScroll(), v)); }
function shopRowAt(p) { // index of the buyable row under a canvas point, or -1
  if (p.y < SHOP_TOP || p.y > SHOP_BOTTOM) return -1;
  const cy = p.y - SHOP_TOP + S.shopScroll;
  return shopLayout().findIndex(o => !o.r.head && cy >= o.y && cy < o.y + o.h);
}
function shopMove(d) { // arrow keys: next buyable row, scrolled into view
  const L = shopLayout(); let i = S.shopIndex;
  do { i += d; } while (i >= 0 && i < L.length && L[i].r.head);
  if (i < 0 || i >= L.length) return;
  S.shopIndex = i; playSfx('tick');
  const o = L[i], vh = SHOP_BOTTOM - SHOP_TOP;
  if (o.y < S.shopScroll) setShopScroll(o.y - SHOP_HEAD_H); else if (o.y + o.h > S.shopScroll + vh) setShopScroll(o.y + o.h - vh);
}
function openShop() {
  if (!S.picking || !S.headPicking || performance.now() < S.pickAfter) return;
  S.shopping = true; S.shopScroll = 0; S.shopIndex = 1; S.shopNote = null;
  S.pickAfter = performance.now() + PICK_LOCKOUT_MS;   // the tap that opened it must not also buy
  playSfx('select');
}
function closeShop() { S.shopping = false; S.pickAfter = performance.now() + PICK_LOCKOUT_MS; playSfx('tick'); }

// Tap or click: the Back button, or a row. First tap focuses a row, tapping the focused row buys (mouse hover focuses).
function shopTap(clientX, clientY) {
  if (performance.now() < S.pickAfter) return;
  const p = canvasPoint(clientX, clientY);
  if (inRect(p, shopBackRect())) return closeShop();
  const i = shopRowAt(p);
  if (i < 0) return;
  if (S.shopIndex !== i) { S.shopIndex = i; playSfx('tick'); return; }
  shopBuy(i);
}

// ---- What a row shows ----
// { name, desc, price (null = nothing to buy), status (text when price is null), owned, selected }
function shopInfo(r) {
  if (r.kind === 'buff') {
    const def = SHOP_LOCKED[r.id], L = buffLevel(r.id), b = BUFFS.find(x => x.id === r.id), maxed = L >= def.max;
    let desc = b.desc;
    if (r.id === 'magiciansGift') desc = maxed ? `Walls open ${L} portals per wave.` : `Walls open a portal for you. Portals per wave: ${L} -> ${L + 1}`;
    if (r.id === 'bombAll') desc = maxed ? `Touching anything has a ${L}% chance to explode. Score x${bombMult(L).toFixed(2)}.`
      : `Touching anything may explode. Chance ${L}% -> ${L + 1}%. Score x${bombMult(L).toFixed(2)} -> x${bombMult(L + 1).toFixed(2)}`;
    return { name: b.name + (def.max > 1 ? `  Lv ${L}/${def.max}` : ''), desc, price: maxed ? null : def.cost(L + 1),
             status: def.max > 1 ? 'MAX' : 'Owned', owned: L > 0, selected: false };
  }
  if (r.kind === 'rand') {
    const owned = isUnlocked('perk', 'startRandom', SHOP_RANDOM_PRICE);
    return { name: 'Start with a random follower', desc: 'Every run begins with one random follower. Unlocks the follower rows below.',
             price: owned ? null : SHOP_RANDOM_PRICE, status: 'Owned', owned, selected: false };
  }
  const f = FOLLOWERS.find(x => x.id === r.id), owned = isUnlocked('follower', r.id, SHOP_PICK_PRICE), sel = S.startPick === r.id;
  return { name: `Start with ${f.name}`, desc: f.passive, price: owned ? null : SHOP_PICK_PRICE,
           status: sel ? 'Selected' : 'Tap to select', owned, selected: sel };
}

function shopBuy(i) {
  const row = shopRows()[i];
  if (!row || row.head) return;
  const note = (ok, text) => { S.shopNote = { i, ok, text, until: performance.now() + CARD_NOTE_MS }; playSfx(ok ? 'unlock' : 'deny'); hud(); };
  const short = n => `Need ${n} more coin${n === 1 ? '' : 's'}`;
  if (row.kind === 'buff') {
    const def = SHOP_LOCKED[row.id], L = buffLevel(row.id);
    if (L >= def.max) return note(false, 'Maxed');
    const cost = def.cost(L + 1);
    if (S.coins < cost) return note(false, short(cost - S.coins));
    S.coins -= cost; S.buffLv[row.id] = L + 1; saveProgress();
    return note(true, L === 0 ? 'Unlocked!' : 'Level up!');
  }
  if (row.kind === 'rand') {
    const r = tryUnlock('perk', 'startRandom', SHOP_RANDOM_PRICE);
    return r.owned ? note(false, 'Already owned') : note(r.ok, r.ok ? 'Unlocked!' : short(r.need));
  }
  if (isUnlocked('follower', row.id, SHOP_PICK_PRICE)) {   // owned: tap = select / deselect
    S.startPick = S.startPick === row.id ? null : row.id; saveProgress();
    S.shopNote = { i, ok: true, text: S.startPick ? 'Selected!' : 'Deselected', until: performance.now() + CARD_NOTE_MS }; playSfx('tick');
    return;
  }
  const r = tryUnlock('follower', row.id, SHOP_PICK_PRICE);
  if (r.ok) S.startPick = row.id;                           // a fresh purchase is selected right away
  note(r.ok, r.ok ? 'Unlocked!' : short(r.need));
}

// ---- Permanent starting followers (called by startRun in buffs.js) ----
function addStartFollower(c) {
  const tail = S.snake[S.snake.length - 1], slot = S.roster[S.roster.length - 1];
  const t = { x: tail.x - 1, y: tail.y };
  S.snake.push(t); S.prev.push({ ...t });
  S.roster.push(newSlot(c, slot.fx, slot.fy));
  S.keys = S.keys.filter(k => !(k.x === t.x && k.y === t.y));
  if (!S.keys.length) placeFood();
}
function applyPermanentStart() {
  if (isUnlocked('perk', 'startRandom', SHOP_RANDOM_PRICE)) addStartFollower(randomFollower());
  const pick = FOLLOWERS.findIndex(f => f.id === S.startPick && !f.fusion);
  if (pick >= 0 && isUnlocked('follower', S.startPick, SHOP_PICK_PRICE)) addStartFollower(pick);
}