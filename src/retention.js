// retention.js: the retention hooks from DESIGN.md. All numbers are RET_* constants in config.js, and
// RETENTION_ON = false switches everything here off at once.
//  1. High-score pressure: as your score nears the best you had when the run began, enemies chase harder and a wave
//     gets one more snake. Gradual and capped (pressure() goes 0..1). The HUD shows "N to beat best".
//  2. Frustration meter (S.ret.frustration, 0-100, saved by storage.js): short runs, low scores, death streaks and fast
//     restarts fill it, a long run or a new best cools it. When it is high, the next run starts with a pity boost.
//  3. Coin tiers: coins from kills and waves are multiplied by a tier based on the coins you spent on revives over your
//     last few runs (coinMult). Shown on the hero select screen and the info bar.
//  4. Boast hooks: the game-over screen (drawGameOver in render.js) shows your best wave, your previous best and how
//     close you came.
// Coins are earned in play only. If real-money purchases are ever considered, revisit this file first.
// Called from: startRun (buffs.js), endRevive (revive.js), enemyChase (passives.js), updateWaves (enemies.js),
// registerKill (score.js) and the drawing code (render.js).

// 0 to 1: how hard the run is leaning on you because you are close to (or past) your best.
function pressure() {
  const b = S.bestAtStart;
  if (!RETENTION_ON || b < RET_PRESSURE_MIN_BEST) return 0;
  return Math.max(0, Math.min(1, (S.score / b - RET_PRESSURE_FROM) / (1 - RET_PRESSURE_FROM)));
}

// The coin multiplier for a run, from the revive coins spent in your last RET_COIN_HISTORY runs. Neutral (1) until
// you have RET_COIN_MIN_RUNS runs of history. Rolled once per run in newRun (state.js) so it cannot change mid-run.
function coinMult() {
  const hist = S.ret.spendHist;
  if (!RETENTION_ON || !RET_COIN_TIERS_ON || hist.length < RET_COIN_MIN_RUNS) return 1;
  const spent = hist.reduce((a, b) => a + b, 0);
  let m = 1;
  for (const t of RET_COIN_TIERS) if (spent >= t.min) m = t.mult;
  return m;
}
function coinReward(n) { return Math.max(1, Math.round(n * S.coinMult)); }

// Called by startRun the moment the run really begins (after the hero and buff picks).
function retentionRunStart() {
  const r = S.ret, now = performance.now();
  S.runStart = now;
  if (!RETENTION_ON) return;
  if (S.lastEndAt && now - S.lastEndAt < RET_FAST_RESTART_MS) r.frustration = Math.min(100, r.frustration + RET_F_FAST);
  if (r.frustration >= RET_PITY_AT) {                      // pity boost: a free buff, right at the start
    const b = BUFFS.find(x => x.id === RET_PITY_BUFF);
    if (b) b.apply();
    r.frustration = RET_PITY_RESET;
    S.pity = true;
    S.popups.push({ x: S.snake[0].x, y: S.snake[0].y, text: 'Pity boost!', age: 0 });
  }
  saveProgress();
}

// Called by endRevive when the run is really over (the revive countdown ended or you gave up).
function retentionRunEnd() {
  const now = performance.now();
  S.lastEndAt = now;
  if (!RETENTION_ON) return;
  const r = S.ret, secs = S.runStart ? Math.max(0, (S.deathAt - S.runStart) / 1000) : 0;
  const beat = S.score > S.bestAtStart;
  r.runs++;
  r.spendHist = [...r.spendHist, S.runSpend].slice(-RET_COIN_HISTORY);
  r.deathStreak = beat ? 0 : r.deathStreak + 1;
  let f = r.frustration;
  if (secs < RET_SHORT_RUN_SECONDS) f += RET_F_SHORT;
  if (S.bestAtStart > 0 && S.score < S.bestAtStart * RET_LOW_SCORE_FRAC) f += RET_F_LOW;
  if (r.deathStreak >= RET_STREAK_LEN) f += RET_F_STREAK;
  if (beat || secs >= RET_LONG_RUN_SECONDS) f -= RET_F_RELIEF;
  r.frustration = Math.max(0, Math.min(100, f));
  saveProgress();
}