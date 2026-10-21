// score.js: points, combos, and floating score text.
// A kill chains with the last one if it lands inside COMBO_WINDOW ticks. Kill points are multiplied by
// the combo count (capped at COMBO_MAX_MULT). Food and cut segments are flat.

function comboMult() { return Math.min(Math.max(S.combo, 1), COMBO_MAX_MULT); }

// Adds points. If a tile (x, y) is given, a "+N" popup floats up from it.
function addScore(points, x, y, suffix = '') {
  S.score += points;
  if (x !== undefined) S.popups.push({ x, y, text: '+' + points + suffix, age: 0 });
}
function registerKill(x, y) {
  S.combo++;
  S.comboTimer = COMBO_WINDOW;
  if (S.combo > S.bestCombo) S.bestCombo = S.combo;
  const m = comboMult();
  addScore(POINTS.kill * m, x, y, m > 1 ? ' x' + m : '');
}
// Called once per tick: runs the combo window down.
function updateCombo() {
  if (S.combo > 0 && --S.comboTimer <= 0) S.combo = 0;
}
function agePopups() {
  S.popups.forEach(p => p.age++);
  S.popups = S.popups.filter(p => p.age < POPUP_TICKS);
}
