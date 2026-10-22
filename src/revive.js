// revive.js: what happens after you die.
//  1. REVIVE COUNTDOWN (S.reviving): REVIVE_SECONDS long. Any key, click or tap revives you (revive()), and Q,
//     Backspace, the Give up button or running out of time ends the run (giveUp() / endRevive()).
//     Input is ignored for REVIVE_LOCKOUT_MS after dying, so a steering key you were mashing cannot revive by accident.
//  2. GAME OVER (S.over): restarting is ignored for DEATH_LOCKOUT_MS, so there is no instant restart.
// Revives are free for now (coins come later). A revive adds REVIVE_SCORE_BONUS of your score on top of it and
// brings back just your head, with a few seconds of immunity. The snake waits for you to pick a direction.

function beginRevive() { // called once, on the tick you die
  const now = performance.now();
  S.reviving = true; S.over = false;
  S.reviveEnd = now + REVIVE_SECONDS * 1000;
  S.inputAfter = now + REVIVE_LOCKOUT_MS;
}

function revive() {
  if (S.alive || !S.reviving || performance.now() < S.inputAfter) return;
  S.reviving = false; S.revives++;
  const bonus = Math.round(S.score * REVIVE_SCORE_BONUS);
  S.score += bonus;
  if (S.score > S.best) { S.best = S.score; S.newBest = true; }
  S.popups.push({ x: S.snake[0].x, y: S.snake[0].y, text: '+' + bonus + ' revive', age: 0 });
  S.alive = true; S.paused = false;
  S.invuln = REVIVE_INVULN_TICKS;
  S.waitDir = true;                              // stand still until the player chooses a direction
  S.prev = S.snake.map(s => ({ ...s }));
  S.alpha = 1; S.last = performance.now();
  hud();
}

function endRevive() { // the countdown is over: show the game-over screen
  S.reviving = false; S.over = true;
  S.restartAfter = performance.now() + DEATH_LOCKOUT_MS;
  leaderboardGameOver(); // the run is really over: fetch the top 10 and offer the initials box if it qualifies
}
function giveUp() { // Q, Backspace or the Give up button
  if (S.alive || !S.reviving || performance.now() < S.inputAfter) return;
  endRevive();
}
// Runs every frame (loop in main.js): ends the countdown when the time is up.
function updateRevive() {
  if (!S.alive && S.reviving && performance.now() >= S.reviveEnd) endRevive();
}

function restartRun() { // from the game-over screen, once the lockout has passed
  if (S.alive || !S.over || performance.now() < S.restartAfter) return;
  newRun();
}

// The Give up button on the revive screen (canvas pixels). Shared by drawing (render.js) and tapping (input.js).
function giveUpRect() {
  const w = COLS * CELL, h = ROWS * CELL;
  return { x: w / 2 - 100, y: h / 2 + 115, w: 200, h: 40 };
}
