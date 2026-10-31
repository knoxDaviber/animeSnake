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
// The retention meter: anything odd (or missing, in old saves) becomes a clean default.
function cleanRet(r) {
  r = r && typeof r === 'object' ? r : {};
  const num = (v, max) => Math.max(0, Math.min(max, Number(v) || 0));
  return { frustration: num(r.frustration, 100), deathStreak: num(r.deathStreak, 999), runs: num(r.runs, 1e6),
           spendHist: Array.isArray(r.spendHist) ? r.spendHist.map(x => num(x, 1e6)).slice(-RET_COIN_HISTORY) : [] };
}
function loadProgress() {
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    S.best = Number(d.best) || 0;
    S.bestCombo = Number(d.bestCombo) || 0;
    S.coins = Number(d.coins) || 0;
    S.unlocked = cleanUnlocked(d.unlocked);
    S.muted = !!d.muted;
    S.bestWave = Number(d.bestWave) || 0;
    S.ret = cleanRet(d.ret);
    S.adStep = Math.max(0, Math.min(AD_PAYOUTS.length - 1, Number(d.adStep) || 0));
    S.adLastAt = Number(d.adLastAt) || 0;
    S.adsOff = !!d.adsOff;
    S.buffLv = {};
    if (d.buffLv && typeof d.buffLv === 'object') for (const k of Object.keys(d.buffLv)) S.buffLv[k] = Math.max(0, Math.min(99, Number(d.buffLv[k]) || 0));
    S.startPick = typeof d.startPick === 'string' ? d.startPick : null;
    S.volume = d.volume === undefined || !isFinite(Number(d.volume)) ? 1 : Math.max(0, Math.min(1, Number(d.volume)));
    S.hintMerge = !!d.hintMerge;
    S.safeMines = !!d.safeMines;
    S.devour = !!d.devour;
    S.credits = !!d.credits;
  } catch (err) { console.warn('Could not load saved progress:', err); }
}
function saveProgress() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ best: S.best, bestCombo: S.bestCombo, coins: S.coins, unlocked: S.unlocked, muted: S.muted, bestWave: S.bestWave, ret: S.ret, adStep: S.adStep, adLastAt: S.adLastAt, adsOff: S.adsOff, buffLv: S.buffLv, startPick: S.startPick, volume: S.volume, hintMerge: S.hintMerge, safeMines: S.safeMines, devour: S.devour, credits: S.credits })); }
  catch (err) { console.warn('Could not save progress:', err); }
}
addEventListener('pagehide', saveProgress);
