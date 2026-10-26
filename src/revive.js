// revive.js: what happens after you die, and how a Challenge run is won.
//  1. REVIVE COUNTDOWN (S.reviving): REVIVE_SECONDS long. Any key, click or tap revives you (revive()), and Q,
//     Backspace, the Give up button or running out of time ends the run (giveUp() / endRevive()).
//     Input is ignored for REVIVE_LOCKOUT_MS after dying, so a steering key you were mashing cannot revive by accident.
//     Two modes, switched by ADS_ENABLED in config.js:
//       false (default): a revive costs coins (reviveCost). Can't pay = straight to game over.
//       true: a revive is a fake joke ad (ads.js) and costs nothing. When the ad ends, doRevive() runs.
//             A player who bought "No ads" and switched them off gets an instant free revive.
//     Second wind (S.freeRevive) makes the next revive free and instant in either mode.
//  2. GAME OVER (S.over): restarting is ignored for DEATH_LOCKOUT_MS, so there is no instant restart.
//  3. WIN (S.won): the Challenge buff ends the run on the game-over screen with a reward (winRun).
// A revive adds REVIVE_SCORE_BONUS of your score on top of it and brings back just your head, with a few seconds
// of immunity. The snake waits for you to pick a direction.

function reviveCost() {
  if (S.freeRevive || ADS_ENABLED) return 0;
  return REVIVE_COST_BASE + REVIVE_COST_STEP * S.revives;
}

function beginRevive() { // called once, on the tick you die
  const now = performance.now();
  S.deathAt = now;
  if (S.coins < reviveCost()) { endRevive(); return; } // can't afford it: straight to game over
  S.reviving = true; S.over = false;
  S.reviveEnd = now + REVIVE_SECONDS * 1000;
  S.inputAfter = now + REVIVE_LOCKOUT_MS;
}

// Any key / click / tap during the countdown.
function revive() {
  if (S.alive || !S.reviving || S.ad || performance.now() < S.inputAfter) return;
  if (S.coins < reviveCost()) return;
  if (S.freeRevive || !adsActive()) return doRevive();  // coin mode, Second wind, or ads switched off
  startAd('revive');                                    // doRevive() runs when the ad ends (updateAd in ads.js)
}

function doRevive() {
  if (S.alive || !S.reviving) return;
  const cost = reviveCost();
  if (S.coins < cost) return;
  S.coins -= cost; S.runSpend += cost; saveProgress();
  S.freeRevive = false; S.dirQueue = [];
  S.reviving = false; S.revives++;
  const bonus = Math.round(S.score * S.reviveBonus);
  S.score += bonus;
  if (S.score > S.best) { S.best = S.score; S.newBest = true; }
  S.popups.push({ x: S.snake[0].x, y: S.snake[0].y, text: '+' + bonus + ' revive', age: 0 });
  S.alive = true; S.paused = false;
  S.invuln = REVIVE_INVULN_TICKS;
  S.waitDir = true;                                   // stand still until the player chooses a direction
  S.stuckTicks = 0;
  S.prev = S.snake.map(s => ({ ...s }));
  S.alpha = 1; S.last = performance.now(); S.heroLast = S.last;
  S.heroAlpha = 1; S.heroLast = S.last;
  resetEnemyClocks();
  reviveBosses();   // wizard.js: bosses are back at full health
  hud();
}

// Rich buff: at the end of the run, add a share of the coins earned in it (revive coins spent are not subtracted).
function payRichBonus() {
  if (S.richBonus <= 0) return;
  S.richPaid = Math.max(0, Math.round((S.coins - S.coinsStart + S.runSpend) * S.richBonus));
  S.coins += S.richPaid; S.richBonus = 0;
  saveProgress();
}
function endRevive() { // the countdown is over: show the game-over screen
  S.reviving = false; S.over = true;
  S.restartAfter = performance.now() + DEATH_LOCKOUT_MS;
  payRichBonus(); retentionRunEnd(); // frustration meter and coin tier history
  leaderboardGameOver(); // the run is really over: fetch the top 10 and offer the initials box if it qualifies
}
// Challenge complete: the run ends on the game-over screen (titled "Challenge complete!") with the reward.
function winRun() {
  if (S.won || !S.alive) return;
  S.won = true; S.alive = false; S.reviving = false; S.over = true;
  S.deathAt = performance.now(); S.restartAfter = S.deathAt + DEATH_LOCKOUT_MS;
  S.alpha = 1; S.heroAlpha = 1;
  S.coins += CHALLENGE_REWARD; S.winCoins = CHALLENGE_REWARD;
  if (S.score > S.best) { S.best = S.score; S.newBest = true; }
  playSfx('win');
  payRichBonus(); retentionRunEnd(); saveProgress();
  leaderboardGameOver();
}
function giveUp() { // Q, Backspace or the Give up button
  if (S.alive || !S.reviving || S.ad || performance.now() < S.inputAfter) return;
  endRevive();
}
// Runs every frame (loop in main.js): ends the countdown when the time is up (not while an ad is playing).
function updateRevive() {
  if (!S.alive && S.reviving && !S.ad && performance.now() >= S.reviveEnd) endRevive();
}

function restartRun() { // from the game-over screen, once the lockout has passed
  if (S.alive || !S.over || performance.now() < S.restartAfter) return;
  newRun();
}

// The Give up button on the revive screen (canvas pixels). Shared by drawing (render.js) and tapping (input.js).
function giveUpRect() {
  const w = SCREEN_W, h = SCREEN_H;
  return { x: w / 2 - 100, y: h / 2 + 115, w: 200, h: 40 };
}
// ---- Give up mid-run: P to pause, then Q (or Backspace, or the Give up button) twice within GIVE_UP_CONFIRM_MS ----
function pauseGiveUpRect() { const w = SCREEN_W, h = SCREEN_H; return { x: w / 2 - 130, y: h / 2 + 60, w: 260, h: 40 }; }
function askGiveUp() {
  if (!S.alive || !S.paused || S.picking) return;
  const now = performance.now();
  if (now < S.giveAskUntil) return giveUpRun();    // second press: really quit
  S.giveAskUntil = now + GIVE_UP_CONFIRM_MS; playSfx('deny');
}
function giveUpRun() { // straight to game over, no revive countdown
  S.giveAskUntil = 0; S.paused = false; S.alive = false; S.alpha = 1; S.heroAlpha = 1;
  S.deathAt = performance.now();
  saveProgress();
  endRevive();
}