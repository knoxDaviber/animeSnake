// config.js: constants and tuning numbers. Change how the game feels here, not in the logic files.

// Numbers from ART_SPEC.md: 32x32 tiles, 20x20 grid (640x640), 125 ms logic tick.
const COLS = 20, ROWS = 20, CELL = 32, TICK_MS = 125;
const SPRITE = 32;   // size of one frame in a character / enemy / item sheet
const FRAMES = 4;    // frames per animation row in a directional sheet

// Info bar (panel.js)
const PANEL_HOLD_MS = 400;   // hold the little handle under the info bar this long to show or hide it

// Rings and damage
const INVULN_TICKS = 8;            // ticks of immunity after a hit (the chain blinks)
const DROP_TICKS = 4;              // length of the drop fade, in ticks
const SELF_HIT_COSTS_RING = true;  // false = running into your own body is instant death
const HAZARD_MIN_DIST = 5;         // the hazard spawns at least this many tiles from the head

// Hero speed (passives.js heroSpeed). 1 = normal. Only the hero changes speed, never enemies or skill timers.
const HERO_SPEED_MIN = 0.4;        // slowest allowed (Gorgons slow you down)
const HERO_SPEED_MAX = 1.8;        // fastest allowed (Raidens speed you up)
const HERO_SPEED_TEST = 1;         // for testing: try 1.5 (fast) or 0.6 (slow), then set back to 1

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
const START_FOLLOWERS = ['raiden', 'raiden']; // who follows the head at the start of a run (ids from followers.js)
const MINE_COOLDOWN = 64;   // ticks (8 s) between mines dropped by each Miner in the chain
const MINE_MAX = 8;         // most mines allowed on the map at once
const MINE_DAMAGE = 1;      // hit points a mine blast takes off an enemy head (body segments are cut off)
const BLAST_TICKS = 4;      // how long the explosion flash stays on screen

// Follower skills (skills.js)
//const LIGHTNING_COOLDOWN = 64;  // ticks (8 s) between strikes, per Raiden in the chain
//const LIGHTNING_DAMAGE = 1;     // hit points taken off the nearest enemy head
const GAZE_COOLDOWN = 80;       // ticks (10 s) between gazes, per Medusa in the chain
const GAZE_STUN = 4;            // ticks every enemy in the line stays frozen
const ZAP_TICKS = 3;            // how long the bolt / gaze flash stays on screen

// Heads (heads.js)
const SWORD_COOLDOWN = 8;      // ticks (1 s) between Swordsman swings
const SWORD_DAMAGE = 3;         // hit points a sword hit takes off an enemy head
const SHIELD_RECHARGE = 40;     // ticks (5 s) until the Swordsman's block is ready again after it blocks a hit
const SHOCK_COOLDOWN = 40;      // ticks (5 s) between Magician shockwaves
const SHOCK_DAMAGE = 1;         // hit points a shockwave takes off an enemy head
const SHOCK_REACH = 2;          // the 3x3 area is centred this many tiles ahead of the head (0 = around the head)
const GUNMAN_COOLDOWN = 24;     // ticks (3 s) between volleys (one bullet each way)
const BULLET_DAMAGE = 1;
const BULLET_SPEED = 2;         // tiles per tick

// Follower passives (passives.js)
const KEYSMAN_DOUBLE_CHANCE = 0.1;  // per Keysman: chance that eating a key summons a second character
const MAGNETO_RANGE = 3;            // tiles: a key this close to your head is pulled one tile closer per tick (+1 per extra Magneto)
const GORGON_SLOW = 0.05;           // per Gorgon: hero speed -5%
const GORGON_MAX_SLOW = 0.50;       // cap on the Gorgon slowdown
const GORGON_SHIELD_RECHARGE = 160; // ticks (20 s) until a used Gorgon shield is ready again
const GORGON_MAX_SHIELDS = 5;       // most Gorgon shields that count
const MEDUSA_SLOW = 0.10;           // per Medusa: hero speed -10%
const MEDUSA_FREEZE_TICKS = 2;      // an enemy head in your facing line stays frozen this long (refreshed every tick)        // extra stun ticks per Medusa on an enemy hit by your sword

const KEYSMAN_MAX_CHANCE = 0.7;     // cap on the double-summon chance
const MAGNETO_MAX_RANGE = 4;        // most tiles a key can be pulled from
const MAGNETO_CHASE_BONUS = 0.1;    // per Magneto: extra chance each enemy move heads for you
const MINER_BLAST_BONUS = 1;        // per Miner: mine blast arms are this many tiles longer
const BOMBER_COOLDOWN = 40;         // ticks (5 s) between mines dropped by a Bomber
const KINGSMAN_BOUNTY_MAX = 3;      // with a Kingsman, a key drop is 1 to this many keys
const KINGSMAN_SUMMON_BONUS = 0.4;  // Keysman is this much more likely to be summoned
const MRX_SHOT_MIN = 2, MRX_SHOT_MAX = 5; // damage of a rejected recruit shot by Mr.X
const RAIDEN_SPEED_BONUS = 0.10;    // per Raiden: hero speed +10%
const RAIDEN_MAX_BONUS = 0.50;      // cap on the Raiden speed bonus (5 Raidens)
const SHOGUN_SPEED_BONUS = 0.30;    // per Raiden Shogun: hero speed +30%
const SHOGUN_COOLDOWN = 40;         // ticks (5 s) between Shogun lightning strikes
const SHOGUN_DMG_MIN = 1, SHOGUN_DMG_MAX = 3; // lightning damage to the closest enemy tile

// Run-start buffs (buffs.js)
const PICK_LOCKOUT_MS = 350;   // the pick screen ignores input this long after it appears
const PICK_CHOICES = 3;        // how many random buffs the pick screen offers
const FORCE_BUFFS = [];        // for testing: buff ids to always offer, e.g. ['minefield', 'thickSkin']. Leave empty normally
const BONUS_SCORE_MULT = 1.1;  // the '+10% score' buff
const THICK_SKIN_TICKS = 4;    // extra immunity ticks after a hit
const QUICK_HANDS_MULT = 0.8;  // the 'Quick hands' buff: head weapon cooldown is multiplied by this
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

// Death and revive
const REVIVE_SECONDS = 10;          // countdown after dying: any key or tap revives; Q, Backspace or timeout ends the run
const REVIVE_LOCKOUT_MS = 700;      // input is ignored this long after dying so a steering key cannot revive by accident
const REVIVE_SCORE_BONUS = 0.10;    // a revive adds this fraction of the current score on top of it
const REVIVE_INVULN_TICKS = 24;     // immunity after a revive (3 s)
const DEATH_LOCKOUT_MS = 1000;      // the game-over screen ignores restart input this long

// Coins: earned during a run, kept between runs, spent on revives
const COIN_PER_KILL = 3;            // coins for every enemy snake killed
const COIN_PER_WAVE = 5;            // coins each time a wave starts
const REVIVE_COST_BASE = 15;        // coins for the first revive in a run
const REVIVE_COST_STEP = 15;        // each further revive in the same run costs this much more

// Hero unlocks (unlocks.js). A hero not in HERO_FREE costs HERO_PRICES[id] coins, or HERO_DEFAULT_PRICE if it has no entry.
// So a new hero is locked automatically; add it to HERO_PRICES only to give it its own price.
const HERO_FREE = ['swordsman', 'magician'];
const HERO_PRICES = { gunman: 40 };
const HERO_DEFAULT_PRICE = 80;
const HERO_GRID_COLS = 4;      // hero select: most cards per row once there are more than 3 heroes
const CARD_NOTE_MS = 1800;     // how long "Need N more coins" / "Unlocked!" stays on a card

// Title screen (render.js drawHeadPick). The title is TITLE_ALT TITLE_ALT_CHANCE of the time, otherwise TITLE_MAIN.
// A random splash line wobbles beside it, Minecraft style. Both are rolled whenever the hero select screen appears.
const TITLE_MAIN = 'animeSnake';
const TITLE_ALT = 'Snake-lite';
const TITLE_ALT_CHANCE = 0.5;
const SPLASHES = [
  'Now with 100% more anime!',
  'Skill issue.',
  'The dev vibecoded this. Mostly.',
  'Tail stall is a feature!',
  'git commit -m "it works"',
  'Please do not eat the hazard.',
  'Your high score is watching you.',
  'One more run...',
  'Mines: now with friendly fire!',
  'Have you tried not dying?',
  'The wall is not your friend.',
  'Tail first, ask questions later.',
  'Revive responsibly.',
  'Mom, I am on the leaderboard!',
  'Also try Minecraft!',
  'Contains traces of snake.',
  'Works on my machine.',
  'Medusa sees you.',
  'Eat keys, not your own tail!',
  'Snake-lite: half the anime!',
  'Hit points are a social construct.',
  'Free of nutritional value.',
];

// TEST ONLY, remove later. Leave at 0 / false for normal play.
const TEST_START_COINS = 0;    // above 0: coins are set to this on every page load (try 30, then 100)
const TEST_RELOCK = false;     // true: all bought unlocks are forgotten on every page load

// Audio (audio.js). Every placeholder sound is synthesized, so there are no files to add. To use a real file, put it in
// assets/audio/sfx/ or music/ and list it below. Only listed files are requested.
const MASTER_VOLUME = 0.8;      // 0 to 1
const SFX_VOLUME = 0.7;
const MUSIC_VOLUME = 0.35;
const PAUSE_DUCK = 0.3;         // music plays at this fraction of its volume while paused
const MUSIC_BPM = 120;          // placeholder music tempo
const MUSIC_FADE = 0.3;         // how quickly music crossfades between moods (bigger = slower)
const BATTLE_HOLD_MS = 2500;    // battle music lingers this long after the last enemy dies
const SFX_MIN_GAP_MS = 45;      // the same sound cannot retrigger faster than this
const SFX_GAPS = { tick: 30, hitEnemy: 70, kill: 60, explosion: 120, spawn: 150 }; // per-sound overrides
const AUDIO_LOG = false;        // true: log every sound name to the console
const AUDIO_DIR = '../assets/audio/';
const SFX_FILES = {};           // e.g. { block: 'block.mp3' } loads assets/audio/sfx/block.mp3 instead of the beep
const MUSIC_FILES = {};         // e.g. { title: 'title.mp3', run: 'run.mp3', battle: 'battle.mp3', tense: 'tense.mp3' }

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
