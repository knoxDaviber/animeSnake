// buffs.js: run-start buffs. Every run begins on a pick screen (drawn by drawPick in render.js, steered by
// input.js): the game rolls PICK_CHOICES random buffs from BUFFS. Two cards are open; the third (THIRD_CARD) is
// revealed for THIRD_CARD_COST coin. A mulligan (MULLIGAN_COST coins) rerolls all the cards. You choose one, then the run starts.
// Add a buff by adding an entry to BUFFS (keep desc short, it has to fit on a card). apply() runs once, right
// after the pick, on the freshly built run. Buffs that change a number set a modifier field on S (see state.js).

const BUFFS = [
  { id: 'startFollower', name: 'Starting follower', desc: 'Start the run with one random follower in the chain.',
    apply() {
      const tail = S.snake[S.snake.length - 1], slot = S.roster[S.roster.length - 1];
      const t = { x: tail.x - 1, y: tail.y };            // one more tile behind the tail
      S.snake.push(t); S.prev.push({ ...t });
      S.roster.push(newSlot(randomFollower(), slot.fx, slot.fy));
      S.keys = S.keys.filter(k => !(k.x === t.x && k.y === t.y));
      if (!S.keys.length) placeFood();
    } },
  { id: 'bonusScore', name: '+20% score', desc: 'Everything you score this run is worth 20% more.',
    apply() { S.scoreMult = BONUS_SCORE_MULT; } },
  { id: 'thickSkin', name: 'Thick skin', desc: `After a hit you stay immune ${THICK_SKIN_TICKS} ticks longer.`,
    apply() { S.invulnBonus = THICK_SKIN_TICKS; } },
  { id: 'quickHands', name: 'Quick hands', desc: `Your hero's weapon recharges ${Math.round((1 - QUICK_HANDS_MULT) * 100)}% faster.`,
    apply() { S.swingMult = QUICK_HANDS_MULT; } },
  { id: 'comboKeeper', name: 'Combo keeper', desc: `Combos last ${COMBO_KEEPER_TICKS} ticks longer.`,
    apply() { S.comboWindow = COMBO_WINDOW + COMBO_KEEPER_TICKS; } },
  { id: 'skillHaste', name: 'Skill haste', desc: `Follower skill cooldowns are ${Math.round((1 - SKILL_HASTE_MULT) * 100)}% shorter.`,
    apply() { S.cdMult = SKILL_HASTE_MULT; } },
  { id: 'secondWind', name: 'Second wind', desc: 'Your first revive this run is free.',
    apply() { S.freeRevive = true; } },
  { id: 'welcomeParty', name: 'Welcome party', desc: 'A character is already walking in when the run starts.',
    apply() { summonRecruit(); } },
  { id: 'rich', name: 'Rich', desc: `Get ${Math.round(RICH_BONUS * 100)}% more coins at the end of the run.`,
    apply() { S.richBonus = RICH_BONUS; S.coinsStart = S.coins + S.runSpend; } }, // pick-screen spending is not "earned" coins
  { id: 'minefield', name: 'Minefield', desc: `Start with ${MINEFIELD_COUNT} mines scattered on the map.`,
    apply() {
      const h = S.snake[0];
      for (let tries = 0, n = 0; tries < 80 && n < MINEFIELD_COUNT; tries++) {
        const t = randomTile();
        if (tileFree(t.x, t.y) && Math.abs(t.x - h.x) + Math.abs(t.y - h.y) >= 4) { S.mines.push(t); n++; }
      }
    } },
  // ---- Flag buffs (modifier runs: each also changes the score multiplier) ----
  { id: 'magiciansGift', name: "Magician's gift", desc: `Walls open a portal for you, ${GIFT_PORTALS_PER_WAVE} times per wave.`,
    apply() { S.gift = true; S.giftCharges = GIFT_PORTALS_PER_WAVE; } },
  { id: 'glassCannon', name: 'Glass cannon', desc: `Your weapon hits ${GLASS_DAMAGE_MULT}x as hard, but one hit kills you. Score x${GLASS_SCORE_MULT}.`,
    apply() { S.glass = true; S.dmgMult = GLASS_DAMAGE_MULT; S.scoreMult *= GLASS_SCORE_MULT; } },
  { id: 'devMode', name: 'Dev mode', desc: `The snake moves one tile per key press. Score x${DEV_SCORE_MULT}.`,
    apply() { S.devMode = true; S.scoreMult *= DEV_SCORE_MULT; } },
  { id: 'bombAll', name: 'Everything is a bomb', desc: `Touching anything has a ${Math.round(BOMB_CHANCE * 100)}% chance to explode. Score x${BOMB_SCORE_MULT}.`,
    apply() { S.bombAll = true; S.scoreMult *= BOMB_SCORE_MULT; } },
  { id: 'pacifist', name: 'Pacifist', desc: 'No weapons. Enemies cannot hurt you. Score from recruits, merges and waves.',
    apply() { S.pacifist = true; S.scoreMult *= PACIFIST_SCORE_MULT; } },
  { id: 'challenge', name: 'Challenge', desc: `Any hit costs ALL your followers. Reach wave ${CHALLENGE_WAVE} to win ${CHALLENGE_REWARD} coins.`,
    apply() { S.challenge = true; S.scoreMult *= CHALLENGE_SCORE_MULT; } },
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
// The mulligan button under the cards (render.js draws it, input.js taps it).
function mulliganRect() { return { x: COLS * CELL / 2 - 120, y: 470, w: 240, h: 44 }; }

// ---- Buff-screen coin spending ----
function spendCoins(n) { S.coins -= n; S.runSpend += n; saveProgress(); } // counts toward the retention coin tiers
function pickNote(ok, text) { S.pickNote = { ok, text, until: performance.now() + CARD_NOTE_MS }; }
function thirdCardLocked() { return S.pickChoices.length > THIRD_CARD && !S.thirdUnlocked; }

function unlockThird() {
  S.pickAfter = performance.now() + PICK_LOCKOUT_MS;
  if (S.coins < THIRD_CARD_COST) { playSfx('deny'); pickNote(false, `Need ${THIRD_CARD_COST - S.coins} more coin`); return; }
  spendCoins(THIRD_CARD_COST); S.thirdUnlocked = true;
  playSfx('unlock'); pickNote(true, 'Unlocked!'); hud();
}
function mulligan() {
  if (!S.picking || S.headPicking || performance.now() < S.pickAfter) return;
  S.pickAfter = performance.now() + PICK_LOCKOUT_MS;
  if (S.coins < MULLIGAN_COST) { playSfx('deny'); pickNote(false, `Need ${MULLIGAN_COST - S.coins} more coin${MULLIGAN_COST - S.coins === 1 ? '' : 's'}`); return; }
  spendCoins(MULLIGAN_COST);
  S.pickChoices = rollPickChoices(); S.pickIndex = 0;   // the third card stays open if you already paid for it
  playSfx('unlock'); pickNote(true, 'New cards!'); hud();
}

// Picks card i and starts the run. Ignored if no pick is pending, or for a moment after the screen appears
// (so the tap or key that restarted the game cannot also choose a buff). A locked third card is unlocked instead.
function startRun(i) {
  if (!S.picking || performance.now() < S.pickAfter) return;
  if (i === THIRD_CARD && thirdCardLocked()) return unlockThird();
  const buff = BUFFS[S.pickChoices[i]];
  if (!buff) return;
  buff.apply();
  S.buff = buff.id;
  S.picking = false;
  retentionRunStart(); // run timer, fast-restart check and the pity boost (retention.js)
  S.last = performance.now();
  hud();
}