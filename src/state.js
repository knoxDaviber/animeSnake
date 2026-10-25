// state.js: ALL mutable game state lives in the one object S. Other files read and change S.x
// instead of keeping their own globals, so there is a single place to look when something is off.
//
//   snake / prev   tile positions, head first / the same one tick ago (for smooth rendering)
//   roster         one slot per chain position: { c, fx, fy, cd }. Slot 0 is the head (c indexes HEADS), every
//                  other slot is a follower (c indexes FOLLOWERS). fx/fy = facing, cd = skill cooldown (ticks)
//   tailLeft       the tile the tail left this tick, or null if the snake grew or was blocked (Miners use it)
//   dir / nextDir  current and queued heading
//   waitDir        true after running into your own tail (and after a revive): the snake stands still until the
//                  player steers
//   food           the recruit KEY on the map, or null while RECRUIT_MAX characters are already waiting
//   zaps  bolt and gaze flashes { kind, age, ... }
//   recruits       characters summoned by keys: { c, x, y, px, py, dx, dy, left, tx, ty, ready, age }.
//                  They start off the grid, walk `left` more tiles toward (tx, ty), then wait there, ready
//   enemies        enemy snakes: { segs, prev, dir, hp, stun }
//   mines / blasts mines waiting on the map { x, y } / explosion flashes { x, y, age }
//   attacks        attacks playing right now (drawn on top of everything)
//   drops          fade-out effects for dropped characters, killed enemies and killed recruits
//   picking        true while the run-start pick screen is up (the run has not started); pickIndex = highlighted
//                  card, pickAfter = time (ms) before which picks are ignored, buff = id of the buff chosen
//   scoreMult      multiplier on all points (the '+10% score' buff sets it)
//   alive          false from the moment you die. Then either:
//     reviving     true during the revive countdown: reviveEnd = when it runs out (ms), inputAfter = time (ms)
//                  before which input is ignored, revives = how many revives were used this run
//     over         true on the game-over screen: restartAfter = time (ms) before which restarting is ignored
//   runId          counts runs; slow leaderboard answers from an old run check it and are ignored
//   lb             the leaderboard on the game-over screen: status ('idle' | 'off' | 'loading' | 'ok' | 'error'),
//                  rows (top scores), qualifies, submitting, submitted, submitError, skipped, name, mine (row index)
//   tick           animation clock: 1 animation frame = 1 logic tick
//   alpha          0..1 progress through the current tick, for interpolation
//   combo          kills chained inside COMBO_WINDOW; comboTimer counts the window down
//   heroLast / heroAlpha   the hero's own move timer (ms of its last move) and progress through its current move (0..1)
//   popups         floating score text
//   best / bestCombo   saved across runs (storage.js); survive newRun()
//   bestWave / bestAtStart   best wave ever (saved) / the best score when this run began (retention.js)
//   ret            retention meter (saved): frustration 0-100, deathStreak, spendHist (revive coins per recent run), runs
//   coinMult       this run's coin payout multiplier (coin tiers); runSpend = revive coins spent this run
//   runStart / deathAt / lastEndAt   ms stamps: run began / last death / last run ended. pity = got the pity boost
const S = { best: 0, bestCombo: 0, bestWave: 0, coins: 0, unlocked: {}, lastTouchAt: 0, muted: false, heroDetail: false,
            adStep: 0, adLastAt: 0, adsOff: false, ad: null, adNote: null,
            buffLv: {}, startPick: null, shopScroll: 0, shopIndex: 1, shopNote: null, adHold: false, adKey: false,
            ret: { frustration: 0, deathStreak: 0, spendHist: [], runs: 0 }, lastEndAt: 0, coinMult: 1 };

function newLeaderboardState() {
  return { status: 'idle', rows: [], qualifies: false, submitting: false, submitted: false, submitError: false,
           skipped: false, name: '', mine: -1 };
}

function newRun() {
  hideNameEntry(); // the initials box belongs to the previous game-over screen
  // The head plus START_FOLLOWERS, in a line heading right from the middle of the grid.
  const snake = range(1 + START_FOLLOWERS.length).map(i => ({ x: Math.floor(COLS / 2) - i, y: Math.floor(ROWS / 2) }));
  Object.assign(S, {
    runId: (S.runId || 0) + 1, lb: newLeaderboardState(), cam: null, camT: 0,
    snake,
    prev: snake.map(s => ({ ...s })),
    roster: [newSlot(0, 1, 0), ...START_FOLLOWERS.map(id => newSlot(followerIndex(id), 1, 0))],
    tailLeft: null,
    picking: true, pickIndex: 0, pickAfter: performance.now() + PICK_LOCKOUT_MS, buff: null, scoreMult: 1,
    pickChoices: rollPickChoices(), cardNote: null,
    titleText: Math.random() < TITLE_ALT_CHANCE ? TITLE_ALT : TITLE_MAIN,
    splashText: SPLASHES[Math.floor(Math.random() * SPLASHES.length)],
    headPicking: true,                          // first pick screen: choose the head. The buff pick follows
    shield: true, shieldTimer: 0, bullets: [], shockCharges: SHOCK_MAX_CHARGES, shockTimer: 0, mineMaxBonus: 0, damageBonus: 0, speedBonus: 0, medMerges: 0, medShieldCd: 0,  // Swordsman block ready / ticks until it is back; Gunman bullets
    invulnBonus: 0, swingMult: 1, comboWindow: COMBO_WINDOW, cdMult: 1, bounty: 0, richBonus: 0, coinsStart: 0, richPaid: 0, reviveBonus: REVIVE_SCORE_BONUS, // set by buffs
    dir: { x: 1, y: 0 }, nextDir: { x: 1, y: 0 }, waitDir: false,
    dirQueue: [], graceUsed: 0, devMode: false, devStep: false, glass: false, dmgMult: 1, bombAll: false,
    gift: false, giftCharges: 0, freeRevive: false, thirdUnlocked: false, pickNote: null,
    giftPerWave: 1, bombChance: BOMB_CHANCE, shopping: false, giveAskUntil: 0,
    challenge: false, pacifist: false, won: false, winCoins: 0, stuckTicks: 0, pentaPaid: false, ad: null,
    boss: null, bossWait: false, pendingReward: false, rewardPicking: false, keys: [], kicks: [], kickCount: 0, growQueue: [], recruits: [], map: null, rooms: [], decor: [], keySpots: [], spits: [], keyBonus: 0, mines: [], blasts: [], zaps: [],
    score: 0, alive: true, paused: false, crashed: null,
    reviving: false, reviveEnd: 0, inputAfter: 0, revives: 0, over: false, restartAfter: 0,
    tick: 0, alpha: 1, last: performance.now(), heroLast: performance.now(), heroAlpha: 1,
    invuln: 0, quietHit: false, newBest: false,
    bestAtStart: S.best, coinMult: coinMult(), runSpend: 0, runStart: 0, deathAt: 0, pity: false, // retention.js
    combo: 0, comboTimer: 0, popups: [],
    attacks: [], lastSwing: 0, swordAgain: 0, drops: [],
    level: 1, xp: 0, weapons: ['base'], wlv: { base: 0 }, bt: {}, pendingBranch: false, branchPicking: false, // levels.js
    enemies: [], wave: 0, toSpawn: 0, spawnTimer: 0, waveTimer: START_DELAY,
  });
  buildWorld(); placeFood(); hud();
}
