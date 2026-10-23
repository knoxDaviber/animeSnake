// unlocks.js: click-to-buy unlocks. Generic on purpose: heroes use it now, followers and upgrades can reuse it later.
// An item is named by a kind ('hero') and its id (the id in its definition, never an array index).
// Price 0 = free from the start. Bought items are kept in S.unlocked[kind] = [ids] and saved by storage.js.

function heroPrice(id) {
  if (HERO_FREE.includes(id)) return 0;
  return id in HERO_PRICES ? HERO_PRICES[id] : HERO_DEFAULT_PRICE;
}
function isUnlocked(kind, id, price) {
  return price <= 0 || (S.unlocked[kind] || []).includes(id);
}
// Buys the item if it is locked and you can pay. Returns { ok: true } when bought,
// { ok: false, need } when you are short of coins, { ok: false, owned: true } when you already own it.
function tryUnlock(kind, id, price) {
  if (isUnlocked(kind, id, price)) return { ok: false, owned: true };
  if (S.coins < price) return { ok: false, need: price - S.coins };
  S.coins -= price;
  (S.unlocked[kind] = S.unlocked[kind] || []).push(id);
  saveProgress();
  return { ok: true };
}