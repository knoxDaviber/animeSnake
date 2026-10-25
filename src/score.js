// score.js: points, combos, and floating score text.
// A kill chains with the last one if it lands inside COMBO_WINDOW ticks. Kill points are multiplied by
// the combo count (capped at COMBO_MAX_MULT). Food and cut segments are flat.

function comboMult() { return Math.min(Math.max(S.combo, 1), COMBO_MAX_MULT); }
// XP for a kill: LEVEL_XP_KILL for a snake with up to LEVEL_XP_TAIL_FREE tail segments, LEVEL_XP_PER_TAIL more per extra segment.
function killXp(tail) { return LEVEL_XP_KILL + Math.max(0, tail - LEVEL_XP_TAIL_FREE) * LEVEL_XP_PER_TAIL; }
// Adds points. If a tile (x, y) is given, a "+N" popup floats up from it.
function addScore(points, x, y, suffix = '') {
  points = Math.round(points * S.scoreMult);
  S.score += points;
  if (x !== undefined) S.popups.push({ x, y, text: '+' + points + suffix, age: 0 });
}
function registerKill(x, y, tail = 0) {
  S.combo++;
  S.comboTimer = S.comboWindow;
  if (S.combo > S.bestCombo) S.bestCombo = S.combo;
  const m = comboMult();
  playSfx('kill', S.combo - 1);
  addXp(LEVEL_XP_KILL);
  addScore((POINTS.kill + killBonus()) * m, x, y, m > 1 ? ' x' + m : '');
  if (S.combo >= PENTAKILL_AT && !S.pentaPaid) {      // hidden side quest: coins once per chain
    S.pentaPaid = true;
    const c = coinReward(PENTAKILL_COINS);
    S.coins += c;
    S.popups.push({ x, y, text: `Pentakill! +${c} coins`, age: 0 });
    playSfx('unlock');
  }
}
// Called once per tick: runs the combo window down.
function updateCombo() {
  if (S.combo > 0 && --S.comboTimer <= 0) { S.combo = 0; S.pentaPaid = false; }
}
function agePopups() {
  S.popups.forEach(p => p.age++);
  S.popups = S.popups.filter(p => p.age < POPUP_TICKS);
}
