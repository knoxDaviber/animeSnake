// storage.js: best score and best combo survive reloads (localStorage). If the browser blocks storage,
// the game still runs and the bests just last for the session.
const SAVE_KEY = 'animeSnake.progress.v1';

// Saved unlocks look like { hero: ['gunman'] }. Anything odd (or missing, in old saves) becomes "nothing bought".
function cleanUnlocked(u) {
  const out = {};
  if (u && typeof u === 'object') for (const k of Object.keys(u))
    if (Array.isArray(u[k])) out[k] = u[k].filter(x => typeof x === 'string');
  return out;
}
function loadProgress() {
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    S.best = Number(d.best) || 0;
    S.bestCombo = Number(d.bestCombo) || 0;
    S.coins = Number(d.coins) || 0;
    S.unlocked = cleanUnlocked(d.unlocked);
    S.muted = !!d.muted;
  } catch (err) { console.warn('Could not load saved progress:', err); }
}
function saveProgress() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ best: S.best, bestCombo: S.bestCombo, coins: S.coins, unlocked: S.unlocked, muted: S.muted })); }
  catch (err) { console.warn('Could not save progress:', err); }
}
addEventListener('pagehide', saveProgress);
