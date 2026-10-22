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

// Follower skills (skills.js)
const LIGHTNING_COOLDOWN = 64;  // ticks (8 s) between strikes, per Raiden in the chain
const LIGHTNING_DAMAGE = 1;     // hit points taken off the nearest enemy head
const GAZE_COOLDOWN = 80;       // ticks (10 s) between gazes, per Medusa in the chain
const GAZE_STUN = 4;            // ticks every enemy in the line stays frozen
const ZAP_TICKS = 3;            // how long the bolt / gaze flash stays on screen

// Follower passives (passives.js)
const RAIDEN_KILL_BONUS = 5;        // extra base points per kill for each Raiden in the chain (before the combo multiplier)
const KEYSMAN_DOUBLE_CHANCE = 0.3;  // per Keysman: chance that eating a key summons a second character
const MAGNETO_RANGE = 3;            // tiles: a key this close to your head is pulled one tile closer per tick (+1 per extra Magneto)
const MEDUSA_STUN_BONUS = 2;        // extra stun ticks per Medusa on an enemy hit by your sword

// Run-start buffs (buffs.js)
const PICK_LOCKOUT_MS = 350;   // the pick screen ignores input this long after it appears
const PICK_CHOICES = 3;        // how many random buffs the pick screen offers
const FORCE_BUFFS = [];        // for testing: buff ids to always offer, e.g. ['minefield', 'thickSkin']. Leave empty normally
const BONUS_SCORE_MULT = 1.1;  // the '+10% score' buff
const THICK_SKIN_TICKS = 4;    // extra immunity ticks after a hit
const QUICK_BLADE_TICKS = 2;   // ticks taken off the sword cooldown
const COMBO_KEEPER_TICKS = 12; // ticks added to the combo window
const SKILL_HASTE_MULT = 0.7;  // follower skill cooldowns are multiplied by this
const BOUNTY_POINTS = 10;      // extra base points per kill (before the combo multiplier)
const SECOND_WIND_BONUS = 0.25;// revive bonus instead of REVIVE_SCORE_BONUS
const MINEFIELD_COUNT = 2;     // mines placed at the start (MINE_MAX is 3, so a Miner can still add one)

// Recruitment. The food is now a KEY: eating it summons a character that starts off the grid, walks in,
// then jumps on the spot when it is ready. Touch it with your head to recruit it onto the tail of the chain.
const RECRUIT_WALK_MIN = 6;         // tiles a summoned character walks in from outside the grid (1 tile per tick)
const RECRUIT_WALK_MAX = 12;        // so the whole summon takes 6-12 ticks (0.75-1.5 s) before it starts jumping
const RECRUIT_MAX = 3;              // no new key appears while this many characters are already waiting
const RECRUIT_THREAT_DIST = 6;      // a chasing enemy goes for a recruit instead of you when one is this close
const RECRUIT_JUMP = [0, 6, 10, 6]; // jump height in px per animation tick while a recruit waits, ready

// Death and revive (no coins yet, so a revive is free for now)
const REVIVE_SECONDS = 10;          // countdown after dying: any key or tap revives; Q, Backspace or timeout ends the run
const REVIVE_LOCKOUT_MS = 700;      // input is ignored this long after dying so a steering key cannot revive by accident
const REVIVE_SCORE_BONUS = 0.10;    // a revive adds this fraction of the current score on top of it
const REVIVE_INVULN_TICKS = 24;     // immunity after a revive (3 s)
const DEATH_LOCKOUT_MS = 1000;      // the game-over screen ignores restart input this long

// Shared leaderboard (Supabase, see leaderboard.js and tools/supabase_setup.sql)
// Paste your PUBLISHABLE key (or the legacy "anon" key) below. It is meant to be public. NEVER paste the secret or
// service_role key here: this file is served to every player.
const LEADERBOARD = {
  url: 'https://jpduvaprhtselimmwmei.supabase.co',
  key: 'sb_publishable_rB9gfhjgKSfvMZtd7GesFg_C5devkWz',   // while this is unchanged the leaderboard stays off and the game works as before
  table: 'scores',
  size: 10,           // how many scores the board shows
  timeoutMs: 6000,    // give up on a slow request after this long
  entryY: 490,        // canvas y (0-640) where the initials box sits on the game-over screen
};

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
