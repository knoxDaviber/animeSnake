// buffs.js: run-start buffs. Every run begins on a pick screen (drawn by drawPick in render.js, steered by
// input.js): the game offers PICK_CHOICES random buffs from BUFFS, you choose one, then the run starts.
// Add a buff by adding an entry to BUFFS (keep desc short, it has to fit on a card). apply() runs once, right
// after the pick, on the freshly built run. Buffs that change a number set a modifier field on S (see state.js).

const BUFFS = [
  { id: 'extraFollower', name: 'Extra follower', desc: 'Start the run with one more random follower in the chain.',
    apply() {
      const tail = S.snake[S.snake.length - 1], slot = S.roster[S.roster.length - 1];
      const t = { x: tail.x - 1, y: tail.y };            // one more tile behind the tail
      S.snake.push(t); S.prev.push({ ...t });
      S.roster.push(newSlot(randomFollower(), slot.fx, slot.fy));
      if (S.food && S.food.x === t.x && S.food.y === t.y) placeFood();
    } },
  { id: 'bonusScore', name: '+10% score', desc: 'Everything you score this run is worth 10% more.',
    apply() { S.scoreMult = BONUS_SCORE_MULT; } },
  { id: 'thickSkin', name: 'Thick skin', desc: `After a hit you stay immune ${THICK_SKIN_TICKS} ticks longer.`,
    apply() { S.invulnBonus = THICK_SKIN_TICKS; } },
  { id: 'quickBlade', name: 'Quick blade', desc: `Your sword swings ${QUICK_BLADE_TICKS} ticks sooner.`,
    apply() { S.swingBonus = QUICK_BLADE_TICKS; } },
  { id: 'comboKeeper', name: 'Combo keeper', desc: `Combos last ${COMBO_KEEPER_TICKS} ticks longer.`,
    apply() { S.comboWindow = COMBO_WINDOW + COMBO_KEEPER_TICKS; } },
  { id: 'skillHaste', name: 'Skill haste', desc: `Follower skill cooldowns are ${Math.round((1 - SKILL_HASTE_MULT) * 100)}% shorter.`,
    apply() { S.cdMult = SKILL_HASTE_MULT; } },
  { id: 'bounty', name: 'Bounty hunter', desc: `Every kill is worth ${BOUNTY_POINTS} more base points.`,
    apply() { S.bounty = BOUNTY_POINTS; } },
  { id: 'secondWind', name: 'Second wind', desc: `Revives add ${Math.round(SECOND_WIND_BONUS * 100)}% of your score instead of ${Math.round(REVIVE_SCORE_BONUS * 100)}%.`,
    apply() { S.reviveBonus = SECOND_WIND_BONUS; } },
  { id: 'welcomeParty', name: 'Welcome party', desc: 'A character is already walking in when the run starts.',
    apply() { summonRecruit(); } },
  { id: 'minefield', name: 'Minefield', desc: `Start with ${MINEFIELD_COUNT} mines scattered on the map.`,
    apply() {
      const h = S.snake[0];
      for (let tries = 0, n = 0; tries < 80 && n < MINEFIELD_COUNT; tries++) {
        const t = randomTile();
        if (tileFree(t.x, t.y) && Math.abs(t.x - h.x) + Math.abs(t.y - h.y) >= 4) { S.mines.push(t); n++; }
      }
    } },
];

// Which buffs this run offers: PICK_CHOICES random ones (or FORCE_BUFFS, for testing). Returns indexes into BUFFS.
function rollPickChoices() {
  if (FORCE_BUFFS.length) return FORCE_BUFFS.map(id => BUFFS.findIndex(b => b.id === id)).filter(i => i >= 0);
  const pool = range(BUFFS.length);
  for (let i = pool.length - 1; i > 0; i--) {          // shuffle
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(PICK_CHOICES, BUFFS.length));
}

// Where card i sits on the 640x640 canvas. Shared by drawing (render.js) and tapping (input.js).
function pickCardRect(i) {
  const n = S.pickChoices.length, gap = 20, margin = 30, w = (COLS * CELL - 2 * margin - (n - 1) * gap) / n;
  return { x: margin + i * (w + gap), y: 200, w, h: 240 };
}

// Picks card i and starts the run. Ignored if no pick is pending, or for a moment after the screen appears
// (so the tap or key that restarted the game cannot also choose a buff).
function startRun(i) {
  const buff = BUFFS[S.pickChoices[i]];
  if (!S.picking || performance.now() < S.pickAfter || !buff) return;
  buff.apply();
  S.buff = buff.id;
  S.picking = false;
  S.last = performance.now();
  hud();
}