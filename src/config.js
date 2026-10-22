// config.js: constants and tuning numbers. Change how the game feels here, not in the logic files.

// Numbers from ART_SPEC.md: 32x32 tiles, 20x20 grid (640x640), 125 ms logic tick.
const COLS = 20, ROWS = 20, CELL = 32, TICK_MS = 125;
const SPRITE = 32;   // size of one frame in a character / enemy / item sheet
const FRAMES = 4;    // frames per animation row in a directional sheet

// Rings and damage
const INVULN_TICKS = 8;            // ticks of immunity after a hit (the chain blinks)
const DROP_TICKS = 4;              // length of the drop fade, in ticks
const SELF_HIT_COSTS_RING = true;  // false = running into your own body is instant death
const HAZARD_MIN_DIST = 5;         // the hazard spawns at least this many tiles from the head

// Enemies and waves
const ENEMY_CHASE = 0.6;           // chance per move that an enemy heads toward the player instead of wandering
const ENEMY_SPAWN_MIN_DIST = 6;    // enemies spawn at least this many tiles from the player's head
const START_DELAY = 24;            // ticks before the first wave
const WAVE_DELAY = 16;             // ticks between a cleared wave and the next
const SPAWN_GAP = 10;              // ticks between enemies inside one wave
function hitsToKill(w) { return w <= 5 ? 1 : w <= 9 ? 2 : w <= 13 ? 3 : w <= 17 ? 4 : 5; } // from DESIGN.md
function waveSize(w) { return Math.min(1 + Math.floor(w / 3), 5); }
function enemyLength(w) { return 3 + Math.min(Math.floor((w - 1) / 3), 4); }

// Followers, skills and mines
const START_FOLLOWERS = ['miner', 'raiden']; // who follows the head at the start of a run (ids from followers.js)
const MINE_COOLDOWN = 40;   // ticks (5 s) between mines dropped by each Miner in the chain
const MINE_MAX = 3;         // most mines allowed on the map at once
const MINE_DAMAGE = 1;      // hit points a mine blast takes off an enemy head (body segments are cut off)
const BLAST_TICKS = 4;      // how long the explosion flash stays on screen

// Run-start buffs
const PICK_LOCKOUT_MS = 350;   // the pick screen ignores input this long after it appears
const BONUS_SCORE_MULT = 1.1;  // the '+10% score' buff

// Score and combos
const POINTS = { food: 10, kill: 20, segment: 5 };  // base points (a kill is multiplied by the combo)
const COMBO_WINDOW = 24;      // ticks (3 s) to land the next kill before the combo ends
const COMBO_MAX_MULT = 5;     // a kill is worth base points x the combo count, up to this
const POPUP_TICKS = 8;        // how long the floating "+60 x3" text stays

// Shared helpers
const COLORS = ['#ff6b9d', '#6bc5ff', '#ffd36b', '#8dff6b', '#c78bff']; // fallback when a character sheet is missing
const DIRS = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
const range = n => [...Array(n).keys()];
function inBounds(x, y) { return x >= 0 && y >= 0 && x < COLS && y < ROWS; }
