// state.js: ALL mutable game state lives in the one object S. Other files read and change S.x
// instead of keeping their own globals, so there is a single place to look when something is off.
//
//   snake / prev   tile positions, head first / the same one tick ago (for smooth rendering)
//   roster         which character sits in each chain slot ({ c, fx, fy }: character index, facing)
//   dir / nextDir  current and queued heading
//   enemies        enemy snakes: { segs, prev, dir, hp, stun }
//   attacks        attacks playing right now (drawn on top of everything)
//   drops          fade-out effects for dropped characters and killed enemies
//   tick           animation clock: 1 animation frame = 1 logic tick
//   alpha          0..1 progress through the current tick, for interpolation
//   combo          kills chained inside COMBO_WINDOW; comboTimer counts the window down
//   popups         floating score text
//   best / bestCombo   saved across runs (storage.js); survive newRun()
const S = { best: 0, bestCombo: 0 };

function newRun() {
  const snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
  Object.assign(S, {
    snake,
    prev: snake.map(s => ({ ...s })),
    roster: snake.map((_, i) => ({ c: i % CHARACTERS.length, fx: 1, fy: 0 })),
    dir: { x: 1, y: 0 }, nextDir: { x: 1, y: 0 },
    food: null, hazard: null,
    score: 0, alive: true, paused: false, crashed: null,
    tick: 0, alpha: 1, last: performance.now(),
    invuln: 0, newBest: false,
    combo: 0, comboTimer: 0, popups: [],
    attacks: [], lastSwing: 0, drops: [],
    enemies: [], wave: 0, toSpawn: 0, spawnTimer: 0, waveTimer: START_DELAY,
  });
  placeHazard(); placeFood(); hud();
}
