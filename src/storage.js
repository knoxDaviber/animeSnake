// storage.js: best score and best combo survive reloads (localStorage). If the browser blocks storage,
// the game still runs and the bests just last for the session.
const SAVE_KEY = 'animeSnake.progress.v1';

function loadProgress() {
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    S.best = Number(d.best) || 0;
    S.bestCombo = Number(d.bestCombo) || 0;
  } catch (err) { console.warn('Could not load saved progress:', err); }
}
function saveProgress() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ best: S.best, bestCombo: S.bestCombo })); }
  catch (err) { console.warn('Could not save progress:', err); }
}
addEventListener('pagehide', saveProgress);
