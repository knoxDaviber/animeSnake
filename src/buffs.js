// buffs.js: run-start buffs. Every run begins on a pick screen (drawn by drawPick in render.js, steered by
// input.js): choose one buff, then the run starts. Add a buff by adding an entry to BUFFS; the screen lays
// the cards out by itself. apply() runs once, right after the pick, on the freshly built run.

const BUFFS = [
  { id: 'extraFollower', name: 'Extra follower', desc: 'Start the run with one more random follower in the chain.',
    apply() {
      const tail = S.snake[S.snake.length - 1], slot = S.roster[S.roster.length - 1];
      const t = { x: tail.x - 1, y: tail.y };            // one more tile behind the tail
      S.snake.push(t); S.prev.push({ ...t });
      S.roster.push(newSlot(randomFollower(), slot.fx, slot.fy));
      if (S.food && S.food.x === t.x && S.food.y === t.y) placeFood();
    } },
  { id: 'bonusScore', name: '+10% score', desc: 'Everything you score this run is worth 10% more. (Coins too, once coins exist.)',
    apply() { S.scoreMult = BONUS_SCORE_MULT; } },
];

// Where card i sits on the 640x640 canvas. Shared by drawing (render.js) and tapping (input.js).
function pickCardRect(i) {
  const n = BUFFS.length, gap = 20, margin = 30, w = (COLS * CELL - 2 * margin - (n - 1) * gap) / n;
  return { x: margin + i * (w + gap), y: 200, w, h: 240 };
}

// Picks buff i and starts the run. Ignored if no pick is pending, or for a moment after the screen appears
// (so the tap or key that restarted the game cannot also choose a buff).
function startRun(i) {
  if (!S.picking || performance.now() < S.pickAfter || !BUFFS[i]) return;
  BUFFS[i].apply();
  S.buff = BUFFS[i].id;
  S.picking = false;
  S.last = performance.now();
  hud();
}
