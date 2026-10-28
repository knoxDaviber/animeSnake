// config.js: constants and tuning numbers. Change how the game feels here, not in the logic files.

// Numbers from ART_SPEC.md: 32x32 tiles, 20x20 grid (640x640), 125 ms logic tick.
const GRID = 5;   // the world is a GRID x GRID grid of 20x20 room cells. rooms.js LAYOUTS decide which cells hold a room, the rest is rock
const FORCE_LAYOUT = null;   // for testing: a layout name from rooms.js, like 'The Cross'. null = a random shape each run
const COLS = GRID * 20, ROWS = GRID * 20, CELL = 32, TICK_MS = 125; // COLS / ROWS = the WORLD size in tiles
const SCREEN_W = 640, SCREEN_H = 640;   // the UI canvas (HUD, menus, overlays): a fixed square, must match index.html
const VIEW_SHORT_TILES = 20;            // the window's short side shows this many tiles...
const VIEW_LONG_MAX_TILES = 32;         // ...and the long side never more than this (whichever zooms in more wins)
const CAM_SMOOTH_MS = 110;              // camera follow lag (bigger = lazier)
const GRID_ALPHA = 0.05;                // faint tile grid so scrolling is visible on an empty floor (0 = off)
const SPRITE = 32;   // size of one frame in a character / enemy / item sheet
const FRAMES = 4;    // frames per animation row in a directional sheet

// On-canvas text (render.js). All gameplay text is drawn at TEXT_ALPHA. Nothing spawns on the tiles in TEXT_ZONES
// (world.js inTextZone), so text never sits on top of a key, mine, hazard, recruit or new enemy. Tiles: x, y, w, h.
const TEXT_ALPHA = 0.5;
const TEXT_ZONES = [
  { ax: 'l', ay: 't', w: 190, h: 80 },   // score, combo, "to beat best"
  { ax: 'c', ay: 't', w: 150, h: 56 },   // wave and "next wave" timer
  { ax: 'r', ay: 't', w: 110, h: 34 },   // coins
  { ax: 'c', ay: 'b', w: 240, h: 44 },   // "Choose a direction"
  { ax: 'l', ay: 'b', w: 230, h: 280 },  // buff and weapon list
];

// Rings and damage
const INVULN_TICKS = 8;            // ticks of immunity after a hit (the chain blinks)
const DROP_TICKS = 4;              // length of the drop fade, in ticks
const SELF_HIT_COSTS_RING = true;  // false = running into your own body is instant death
const HAZARD_MIN_DIST = 5;         // the hazard spawns at least this many tiles from the head

// Hero speed (passives.js heroSpeed). 1 = normal. Only the hero changes speed, never enemies or skill timers.
const HERO_BASE_SPEED = 0.5;       // base hero speed, in old-speed units (halved: 1 tile per 2 world ticks)
const HERO_SPEED_MIN = 0.15;       // slowest allowed (Gorgons, Goliath later)
const HERO_SPEED_MAX = 2;          // fastest allowed, in old-speed units
const HERO_SPEED_TEST = 1;         // for testing: try 1.5 (fast) or 0.6 (slow), then set back to 1

// Enemies and waves
const ENEMY_CHASE = 0.6;           // chance per move that an enemy heads toward the player instead of wandering
const ENEMY_SPAWN_MIN_DIST = 6;    // enemies spawn at least this many tiles from the player's head
const START_DELAY = 24;            // ticks before the first wave
const WAVE_SHOW_MS = 10000;        // the "Next wave" timer on screen appears only when this much time is left
const WAVE_CLEAR_SKIP = 16;        // field fully cleared: the wave timer jumps ahead to this many ticks left (0 = off)
const ENEMY_CAP = 16;               // most enemy snakes alive at once
const ENEMY_QUEUE_MAX = 24;         // most snakes waiting to spawn (when the cap is full)
const ENEMY_BASE_SPEED = 0.5;      // enemy speed, same scale as HERO_BASE_SPEED
const ENEMY_WAVE_SPEED = 0.02;     // extra enemy speed (fraction) per wave after the first
const ENEMY_WAVE_SPEED_MAX = 0.6;  // cap on that wave bonus
const ENEMY_EAT_SPEED = 0.1;       // extra speed (fraction) for each key or recruit an enemy eats
const ENEMY_SPEED_MAX = 2.1;       // enemy speed multiplier never goes above this
const ENEMY_MAX_LEN = 10;          // an eating enemy stops growing at this length
const ENEMY_KEY_HUNT_DIST = 4;     // a chasing enemy goes for a key this close (0 = never)
const SPAWN_GAP = 10;              // ticks between enemies inside one wave
function hitsToKill(w) { return w <= 5 ? 1 : w <= 9 ? 2 : w <= 13 ? 3 : w <= 17 ? 4 : 5 + Math.floor((w - 18) / 4); } // keeps going: +1 hit every 4 waves after 17
// Timed waves: a new wave starts this many ticks after the last one. ~10 s at wave 1, ~30 s at wave 10, ~60 s from wave 20.
function waveDuration(w) {
  if (w > 20) return Math.max(WAVE_MIN_TICKS, Math.round(480 - WAVE_SHRINK * (w - 20)));
  const n = Math.min(Math.max(w, 1), 20);
  return Math.round(n <= 10 ? 80 + 160 * (n - 1) / 9 : 240 + 240 * (n - 10) / 10);
}
function enemyWaveSpeed(w) { return 1 + Math.min(ENEMY_WAVE_SPEED_MAX, ENEMY_WAVE_SPEED * (w - 1)); }
function waveSize(w) { return Math.min(1 + Math.floor(w / 2), WAVE_SIZE_MAX); }   // wave 10: 6, wave 20: 11, wave 30: 16
function enemyLength(w) { return 3 + Math.min(Math.floor((w - 1) / 3), ENEMY_LEN_BONUS_MAX); }

// Rooms and terrain (rooms.js, world.js)
const PORTAL_WALL_REACH = 8;  // Magician / gift: a wall up to this many tiles thick can be stepped through
const MUD_SLOW = 0.5;         // speed multiplier while a snake's head is on mud
const TURRET_COOLDOWN = 32;   // ticks (4 s) between a wall turret's shots; it only counts down while the hero is in its room
// Kicking (kicks.js): mines, keys and waiting recruits can be kicked. A kicked item slides until it hits something.
const KICK_ALL_HEROES = false;  // true: every hero kicks (for testing). false: Goliath only
const KICK_SPEED = 2;           // tiles per world tick that a kicked item slides
const KICK_FLOOR = '.*e~IP';     // tiles a sliding item can cross
const KICK_REWARD_EVERY = 5;    // Goliath: every Nth kick, a random fusion follower joins the chain
const GOLIATH_SPEED = 0.75;     // Goliath's speed multiplier
// Food presence (world.js)
const KEY_PRESENCE = 3;       // keys on the map at once (a Kingsman fusion adds 1 for the rest of the run)
const KEY_MIN_DIST = 8;       // new keys appear at least this far from the hero
const KEY_SPOT_CHANCE = 0.5;  // chance a new key goes on a '*' key spot of a room
const KEY_ARROW = true;       // the arrow toward the nearest key
const KEY_ARROW_RADIUS = 90;  // UI px from the hero
const KEY_ARROW_HIDE_DIST = 5;
// Enemy types (enemies.js). speed = multiplier, hp = x hitsToKill, len = segments added, from = first wave
const ENEMY_TYPES = {
  normal:  { speed: 1,    hp: 1, len: 0,  from: 1 },
  fast:    { speed: 1.6,  hp: 1, len: -1, from: 4 },
  armored: { speed: 0.85, hp: 2, len: 1,  from: 7 },
  spitter: { speed: 0.9,  hp: 1, len: 0,  from: 10 },
  kamikaze: { speed: 1.25, hp: 1, len: -1, from: 8 },   // hunts bombs near you (bombs.js)
  runner:   { speed: 1.2,  hp: 1, len: 0,  from: 6 },   // flees until it grows big (snakes.js)
};
const ENEMY_TYPE_CHANCE = 0.45;   // chance a snake is a special type once one is unlocked
const ENEMY_FAVOR_CHANCE = 0.6;   // chance it is the room's favoured type while you are in that room
const SPIT_COOLDOWN = 24, SPIT_RANGE = 10, SPIT_SPEED = 1; // ticks between spits, tiles, tiles per tick

// Boss (boss.js): the wave 10 Great Serpent. Gridless: positions are floats in tile units.
const BOSS_WAVE = 10;            // the wave that brings the boss (no boss in Pacifist)
const BOSS_HP = 48;              // total hit points. A sword hit is 3, so a head crit (x2) is 6: three head hits kill it
const BOSS_CRIT = 2;             // damage multiplier for a hit on the head
const BOSS_BODY_DAMAGE = 1;      // a hit on the body (it is never cut in two)
const BOSS_FLASH_MS = 400;       // after a head hit it flashes and freezes this long, then swaps ends
const BOSS_IFRAMES_MS = 250;     // it ignores a second hit on the same part this soon (stops one blast counting twice)
const BOSS_PTS = 14, BOSS_MAX_PTS = 22;   // points in its body at the start, and the most eating can make it
const BOSS_SPACING = 0.85;       // tiles between body points (14 points is about 11 tiles long)
const BOSS_RADIUS = 0.8;         // how close a tile's middle must be to a body point to count as hit / blocked
const BOSS_WALL_RADIUS = 0.7;    // how close the head can get to a wall
const BOSS_SCALE = 1.35;         // how big it is drawn (the head is 1.25x that)
const BOSS_TPS = 3.2;            // base speed, tiles per second (the hero is 4)
const BOSS_TURN = 2.4;           // turn rate, radians per second
const BOSS_SPEED_MAX = 1.4, BOSS_EAT_SPEED = 0.03;   // eating a key, recruit or snake: +3% speed, up to x1.4
const BOSS_HEAL = 1;             // hit points it regains for every snake it eats
const BOSS_HUNT_DIST = 9;        // it goes for another snake's head this close (tiles)
const BOSS_KEY_HUNT_DIST = 5;    // ...or for a key this close, if that is nearer than you
const BOSS_EAT_DIST = 1;         // how close the head must be to eat something
const BOSS_LEAD_MAX = 4;         // it aims up to this many tiles ahead of where you are heading
const BOSS_PATH_MS = 200;        // how often it re-plans its way around walls
const BOSS_REPEL = 1.3, BOSS_MINE_FEAR = 1.2;   // how strongly it steers away from walls and from mines
const BOSS_ENRAGE_AT = 0.5, BOSS_ENRAGE_SPEED = 1.5;   // under half HP: faster, turns faster, charges more often
const BOSS_FIRST_CHARGE_MS = 2000, BOSS_CHARGE_CD = 5000;   // time to its first charge, and between charges
const BOSS_WINDUP_MS = 500, BOSS_CHARGE_MS = 700, BOSS_CHARGE_SPEED = 2.4;   // telegraph, charge length, charge speed (x)
const BOSS_DAZE_MS = 500;        // dazed for this long after ramming a wall in a charge (free hits)
const BOSS_HEAD_REACH = 1.0, BOSS_BODY_REACH = 0.8;   // how close counts as touching you
const BOSS_CONTACT_MS = 800, BOSS_RECOIL_MS = 600;    // it can hurt you at most this often, and pauses after
const BOSS_MEDUSA_DAMAGE = 2;    // touching its head with a Medusa in the chain (the crit makes it 6)
const BOSS_COINS = 10, BOSS_SCORE = 500;
const BOSS_AFTER_TICKS = 40;     // waves restart this many ticks after it dies
const BOSS_VOLLEY_CD = 4000, BOSS_FIRST_VOLLEY_MS = 6000, BOSS_VOLLEY_WINDUP_MS = 600;   // orb volley: gap between volleys, first volley, telegraph

// Temporary buffs (tempbuffs.js): enemies drop a block, touch it with the hero to get the buff
const TB_DROP_CHANCE = 0.25;        // chance a dead enemy drops one (the boss always does)
const TB_PREFER_CHANCE = 0.6;       // chance the drop is that enemy type's favourite
const TB_PREFER = { armored: 'bubble', fast: 'haste', spitter: 'frenzy' };
const TB_PICKUP_TICKS = 96;         // ticks (12 s) a block stays on the map
const TB_GHOST_TICKS = 64, TB_HASTE_TICKS = 48, TB_MAGNET_TICKS = 80, TB_BUBBLE_TICKS = 160, TB_FRENZY_TICKS = 64;
const TB_HASTE = 0.5;               // Haste: +50% hero speed
const TB_FRENZY_MULT = 0.5;         // Frenzy: weapon cooldowns are multiplied by this
const GOLIATH_SHIELD_MAX = 3;       // most key shields Goliath can hold

// Summoner (summoner.js): every SUMMONER_COOLDOWN ticks a copy of a random follower leaves the chain as a spirit
const SUMMONER_COOLDOWN = 40;     // ticks (5 s) between summons (Quick hands, Frenzy and levels speed it up)
const AGENT_TICKS = 32;           // ticks (4 s) a spirit lives
const AGENT_MAX = 4;              // most spirits at once
const AGENT_MOVE_TICKS = 2;       // ticks per tile (2 = same pace as the hero at base speed); Raiden and Shogun spirits move every tick
const AGENT_SIGHT = 14;           // how far (tiles) a spirit looks for enemies
const AGENT_DAMAGE = 1;           // melee hit (scales like weapon damage)
const AGENT_HIT_CD = 8;           // ticks between a spirit's hits
const AGENT_MINE_CD = 16;         // Miner spirit: ticks between mines (Bomber: half)
const AGENT_MINE_RANGE = 5;       // ...only when an enemy is this close
const AGENT_SHOT_CD = 8;          // Mr.X spirit: ticks between shots
const AGENT_SHOGUN_CD = 5;        // Shogun spirit: ticks between lightning strikes
const AGENT_GAZE_RANGE = 8;       // Medusa spirit: freeze range along rows and columns
const AGENT_BONUS_MAX = 99;   // times one fusion's permanent bonus can be granted per run

// Followers, skills and mines
const START_FOLLOWERS = []; // who follows the head at the start of a run (ids from followers.js)
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
const SHOCK_MAX_CHARGES = 2;     // Magician: most shockwave charges held at once
const SHOCK_GAP = 4;             // ticks (0.5 s) between two shockwaves, so both charges do not dump on the same enemy
const SHOGUN_PERMA_SPEED = 0.10; // run modifier left by each Raiden Shogun fusion: hero speed +10%
const MEDUSA_SHIELD_COOLDOWN = 480; // ticks (60 s): recharge of the shield each Medusa fusion leaves behind
const MEDUSA_SHIELD_STEP = 120;     // ticks (15 s) shorter recharge for every later Medusa merge
const MEDUSA_SHIELD_MIN = 120;      // the recharge never gets shorter than this
const RAIDEN_DETONATE_COOLDOWN = 80; // ticks (10 s) between Raiden setting off your oldest mine
const SWORD_COOLDOWN = 8;      // ticks (1 s) between Swordsman swings
const SWORD_DAMAGE = 3;         // hit points a sword hit takes off an enemy head
const SWORD_LINGER = 4;           // ticks (0.5 s) the slash stays on its tile, still hitting, after its animation
const SWORD_DOUBLE_LEVEL = 10;    // from this hero level the Swordsman strikes twice
const SWORD_DOUBLE_GAP = 4;       // ticks between the two strikes
const GOLIATH_SWIPE_COOLDOWN = 16, GOLIATH_SWIPE_DAMAGE = 2;   // ticks (2 s) between swipes
const GOLIATH_SWIPE_LINGER = 8;   // ticks (1 s) the swipe stays and keeps hitting
const GOLIATH_WIDE_LEVEL = 10;    // from this hero level the swipe is 3 wide and 2 deep
const LEVEL_XP_TAIL_FREE = 4;     // a snake with up to this many tail segments gives the normal LEVEL_XP_KILL
const LEVEL_XP_PER_TAIL = 0.5;    // extra XP per tail segment beyond that
const SHIELD_RECHARGE = 40;     // ticks (5 s) until the Swordsman's block is ready again after it blocks a hit
const RIPOSTE_MULT = 2;         // the counter slash after a Swordsman block hits this many times as hard as a normal sword swing
const SHOCK_COOLDOWN = 40;      // ticks (5 s) for the Magician to regain one shockwave charge
const SHOCK_DAMAGE = 1;         // hit points a shockwave takes off an enemy head
const SHOCK_REACH = 2;          // the 3x3 area is centred this many tiles ahead of the head (0 = around the head)
const GUNMAN_COOLDOWN = 16;     // ticks (2 s) between volleys (one bullet each way)
const BULLET_DAMAGE = 1;
const BULLET_SPEED = 2;         // tiles per tick

// Follower passives (passives.js)
const KEYSMAN_DOUBLE_CHANCE = 0.1;  // per Keysman: chance that eating a key summons a second character
const MAGNETO_RANGE = 3;            // tiles: a key this close to your head is pulled one tile closer per tick (+1 per extra Magneto)
const GORGON_SLOW = 0.05;           // per Gorgon: hero speed -5%
const GORGON_MAX_SLOW = 0.50;       // cap on the Gorgon slowdown
const GORGON_SHIELD_RECHARGE = 0; // ticks until a used Gorgon shield is ready again. 0 = never (shields are one-use)
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

// Hero levelling (levels.js)
const LEVEL_XP_KILL = 2;         // XP per enemy kill
const LEVEL_XP_BASE = 2, LEVEL_XP_STEP = 2; // XP to leave level l = BASE + STEP * l
function xpNeed(l) { return LEVEL_XP_BASE + LEVEL_XP_STEP * l; }
const LEVEL_XP_PASSIVE = 0.2;       // XP per second that trickles in just for surviving, at level 1
const LEVEL_XP_PASSIVE_FADE = 50;   // ...shrinking each level, and gone at this level (0 = no passive XP at all)
const LEVEL_BRANCH_EVERY = 5;    // every Nth level you pick a weapon branch
const BRANCH_CHOICES = 3;        // cards offered on a branch pick
const BRANCH_LOCKOUT_MS = 600;   // the branch pick ignores input this long after it appears
const LEVEL_STEP = 0.15;         // each weapon level: +15% damage
const LEVEL_SPEED_SHARE = 0.5;   // ...and half that much faster firing
const LEVEL_OLD_SHARE = 0.3;     // older weapons gain this fraction of a level each time you level up
const GATLING_COOLDOWN = 4,  GATLING_DAMAGE = 1;
const RICOCHET_COOLDOWN = 12, RICOCHET_DAMAGE = 2, RICOCHET_BOUNCES = 2; // +1 bounce per 3 weapon levels
const NOVA_COOLDOWN = 24,    NOVA_DAMAGE = 1;      // radius 1, +1 per 5 weapon levels
const THUNDER_COOLDOWN = 20, THUNDER_DAMAGE = 1;   // +1 target per 4 weapon levels

// Run-start buffs (buffs.js)
const RICH_BONUS = 0.1; // Rich buff: extra coins at the end of the run, as a fraction of the coins earned in it
const PICK_LOCKOUT_MS = 350;   // the pick screen ignores input this long after it appears
const PICK_CHOICES = 3;        // how many random buffs the pick screen offers
const FORCE_BUFFS = [];        // for testing: buff ids to always offer, e.g. ['minefield', 'thickSkin']. Leave empty normally
const BONUS_SCORE_MULT = 1.2;  // the '+20% score' buff
const THICK_SKIN_TICKS = 4;    // extra immunity ticks after a hit
const QUICK_HANDS_MULT = 0.8;  // the 'Quick hands' buff: head weapon cooldown is multiplied by this
const COMBO_KEEPER_TICKS = 12; // ticks added to the combo window
const SKILL_HASTE_MULT = 0.7;  // follower skill cooldowns are multiplied by this
const BOUNTY_POINTS = 10;      // extra base points per kill (before the combo multiplier)
const SECOND_WIND_BONUS = 0.25;// revive bonus instead of REVIVE_SCORE_BONUS
const MINEFIELD_COUNT = 2;     // mines placed at the start (MINE_MAX is 8, so a Miner can still add one)

// Batch B: movement feel, flag buffs, buff-screen coins
const INPUT_BUFFER = 2;          // steering inputs that can queue between two hero moves
const GRACE_TICKS = 1;           // 0 or 1: hero moves a wall/body hit is forgiven (the snake waits a beat for a turn)
const GIFT_PORTALS_PER_WAVE = 2; // Magician's gift: wall portals per wave on any hero
const GLASS_DAMAGE_MULT = 2;     // Glass cannon: weapon damage multiplier (and one hit kills you)
const BOMB_CHANCE = 0.3;         // Everything is a bomb: chance that a contact explodes
const GLASS_SCORE_MULT = 1.5, DEV_SCORE_MULT = 0.5, BOMB_SCORE_MULT = 1.25; // modifier score multipliers (tune)
const THIRD_CARD = 2;            // index of the card that starts locked on the buff screen
const THIRD_CARD_COST = 1;       // coins to reveal the third card
const MULLIGAN_COST = 5;         // coins to reroll the buff cards

// Shop (shop.js). A buff listed here is LOCKED until bought, then joins the buff pool. cost(l) = price of reaching level l.
const SHOP_LOCKED = {
  magiciansGift: { max: 3,  cost: l => [50, 200, 500][l - 1] },                    // level = portals per wave
  bombAll:       { max: 50, cost: l => 100 + 50 * Math.floor(l / 10) + (l % 10) }, // level = explosion chance %: 101..109, 150..159, ... 350
  pacifist:      { max: 1,  cost: () => 100 },
  challenge:     { max: 1,  cost: () => 150 },
  devMode:       { max: 1,  cost: () => 75 },
  glassCannon:   { max: 1,  cost: () => 150 },
  bonusScore:    { max: 1,  cost: () => 100 },
};
const BOMB_SCORE_PER_PCT = 0.0083;   // Everything is a bomb: score x = 1 + chance% x this (30% = x1.25, 1% = x1.01)
const SHOP_RANDOM_PRICE = 150;       // permanent: every run starts with one random follower. Unlocks the follower rows
const SHOP_PICK_PRICE = 200;         // per base follower: unlock it, then select ONE to also start every run with
const GIVE_UP_CONFIRM_MS = 3000;     // pause screen: press Q (or tap Give up) twice within this time to quit the run

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
const REVIVE_COST_BASE = 15;        // coins for the first revive in a run
const REVIVE_COST_STEP = 15;        // each further revive in the same run costs this much more
// Coins are scarce. Income: wave milestones (bosses later), the hidden Pentakill, and fake ads. Revives are ads, not coins.
const WAVE_COINS = { 5: 3, 10: 10, 15: 5, 20: 20 }; // wave number -> coins when that wave starts (tune)
const PENTAKILL_AT = 5;             // the Nth kill in one chain pays the coins below, once per chain
const PENTAKILL_COINS = 5;
const ADS_ENABLED = true;          // false = normal coin-priced revives, no ads. true = fake joke ads (ads.js)
const AD_SECONDS = 60;              // how long an ad lasts if you do NOT hold the fast-forward button
const AD_HOLD_SPEED = 10;            // holding the button runs the ad this many times faster (60 s -> 5 s)
const AD_HOLD_DELAY_MS = 300;       // a hold only counts this long after the ad starts (the tap that began it cannot hold)               // how long an ad really takes
const AD_FAKE_SECONDS = 60;         // how long the ad claims to be (it "fast-forwards", and cannot be skipped)
const AD_PAYOUTS = [100, 50, 50, 25];   // hero-select ad button: each ad pays the next number
const AD_RESET_MS = 60 * 60 * 1000; // an hour after the last coin ad, payouts start again at 10
const AD_FREE_PRICE = 99999;         // coins for the "No ads" toggle on the hero select screen
const ADS = [
  { name: 'ProteinBark', line: 'Dogs hate it. Dogs are wrong.' },
  { name: 'Wi-Fi for Fish', line: 'Finally, a reason for the aquarium.' },
  { name: 'Hot Singles In Your Grid', line: 'They are tiles. Very single tiles.' },
  { name: 'Mega Mattress 9000', line: 'Sleep through anything, including this ad.' },
  { name: 'Totally Real Antivirus', line: 'Found 0 viruses. Added 3.' },
  { name: 'Crypto Hamster Wheel', line: 'Number go round. Number go up. Maybe.' },
  { name: 'Left Sock Club', line: 'We have your other one.' },
  { name: 'Soup, But Square', line: 'It fits the grid. That is the whole pitch.' },
  { name: 'Gravity Insurance', line: 'What goes up must come down on you.' },
];

// Modes (buffs.js, revive.js winRun). Challenge: a hit drops all followers; reach the wave to win the reward.
const CHALLENGE_WAVE = 20, CHALLENGE_REWARD = 100, CHALLENGE_SCORE_MULT = 1.5;
// Pacifist: no weapons, enemies harmless and solid. Points for recruits, merges and waves. Stuck for this long = death.
const PACIFIST_SCORE_MULT = 1;
const PACIFIST_POINTS = { recruit: 15, merge: 50, wave: 25 };
const PACIFIST_STUCK_TICKS = 40;   // 20 s without a real move

// Hero unlocks (unlocks.js). A hero not in HERO_FREE costs HERO_PRICES[id] coins, or HERO_DEFAULT_PRICE if it has no entry.
// So a new hero is locked automatically; add it to HERO_PRICES only to give it its own price.
const HERO_FREE = ['swordsman'];
HERO_PRICES = { magician: 50, gunman: 100, goliath: 200, summoner: 200 }
const HERO_DEFAULT_PRICE = 200;
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

const ZERO_SCORE_LINES = [
  'Zero. A bold strategy.',
  'Did you even press anything?',
  'The snake is filing a complaint.',
  'Technically, you cannot go lower.',
  'Even the hazard felt bad for you.',
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
const SFX_JITTER = 0.03;        // repeated effects are randomly up to this much higher or lower in pitch (0 = off)
const REVERB_SECONDS = 1.4;     // length of the reverb tail (0 = no reverb at all)
const REVERB_SFX = 0.2;         // how much of the sound effects goes through the reverb
const REVERB_MUSIC = 0.28;      // ...and of the music
const LAYER_DRUMS_COMBO = 3;    // a combo this long brings the drum layer in, even in calm music (battle and bosses always have it)
const LAYER_LEAD_COMBO = 5;     // a combo this long brings the lead melody in (the serpent fight always has it)
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

// Touch controls (input.js): a tap steers by four zones split by an X. The X is centred this far down the canvas
// (0.5 = the middle). Lower = a bigger "up" zone, so a thumb near the bottom still reaches every direction.
const TAP_CENTER_Y = 0.62;

// Retention systems (retention.js, design in DESIGN.md). RETENTION_ON = false switches all of them off.
const RETENTION_ON = true;
// 1. High-score pressure: near the best you had when the run began, enemies ramp up. Capped.
const RET_PRESSURE_MIN_BEST = 200;  // no pressure until your best is at least this (new players are left alone)
const RET_PRESSURE_FROM = 0.85;     // starts at this fraction of your best, full at 100%
const RET_PRESSURE_CHASE = 0.15;    // extra chance an enemy move heads for you, at full pressure
const RET_PRESSURE_EXTRA = 1;       // extra enemy snakes per wave at full pressure (rounded, so 1 from half pressure)
const RET_SHOW_FROM = 0.6;          // the "N to beat best" line shows from this fraction of your best
// 2. Frustration meter (0-100). A high meter gives a pity boost at the start of the next run.
const RET_SHORT_RUN_SECONDS = 45;   const RET_F_SHORT = 15;     // a run shorter than this
const RET_LOW_SCORE_FRAC = 0.4;     const RET_F_LOW = 10;       // a run scoring under this fraction of your best
const RET_STREAK_LEN = 3;           const RET_F_STREAK = 10;    // this many runs in a row without a new best
const RET_FAST_RESTART_MS = 12000;  const RET_F_FAST = 10;      // a run started this soon after the last one ended
const RET_LONG_RUN_SECONDS = 150;   const RET_F_RELIEF = 25;    // a long run, or a new best, cools the meter
const RET_PITY_AT = 50;             // meter at or above this: the next run gets a pity boost
const RET_PITY_RESET = 10;          // meter after a pity boost
const RET_PITY_BUFF = 'startFollower'; // id from BUFFS
// 3. Coin tiers: kill and wave coins are multiplied by a tier based on revive coins spent over your last runs.
const RET_COIN_TIERS_ON = true;     // false = only the coin tiers off
const RET_COIN_HISTORY = 5;         // runs looked at
const RET_COIN_MIN_RUNS = 3;        // neutral (x1) until you have this many runs of history
const RET_COIN_TIERS = [{ min: 0, mult: 0.7 }, { min: 15, mult: 1 }, { min: 45, mult: 1.25 }, { min: 90, mult: 1.5 }];

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

// Progressive rooms (doors.js)
const DOOR_WAVES = [3, 5, 7, 9, 12, 14, 16, 18];  // at the start of these waves you pick a door to open
const DOOR_CHOICES = 3;            // doors offered per pick
const ENEMY_CAP_BASE = 2;          // enemy cap = this + open rooms, up to ENEMY_CAP
const DOOR_SWARM_SNAKES = 4;       // swarm twist: snakes that burst out
const DOOR_LOCK_SNAKES = 3;        // lockdown twist: snakes you must kill
const DOOR_LOCK_MAX_TICKS = 480;   // lockdown failsafe: doors give way after 60 s
const DOOR_LOCK_COINS = 2;         // lockdown reward
const DOOR_CACHE_KEYS = 2, DOOR_CACHE_BUFFS = 2;   // cache twist contents
const DOOR_CACHE_TTL = 400;        // ticks a cache buff block stays (50 s)
const DOOR_READY_PER_WAVE = 2;     // at a door wave this many closed rooms get a glowing, breakable door (9 = every door at once)

// Weapon chests (chests.js): at most CHESTS_NEAR + CHESTS_FAR = 4 per run
const CHESTS_NEAR = 1;             // chests in rooms ONE door from the start room
const CHESTS_FAR = 3;              // chests in rooms TWO doors from the start room (the corners)
const CHEST_START_SHARE = 0.5;     // a weapon from a chest starts at this share of your hero level, so a late chest is not a dud
const CHEST_PACIFIST_COINS = 3;    // Pacifist has no weapons: a chest pays this many coins instead

// Wizard boss (wizard.js): wave 20. Times are world ticks (8 per second) unless it says ms.
const WIZARD_WAVE = 20;
const WIZARD_HP = 24;                  // hit points once the field is down (a sword hit is 3)
const WIZARD_FIELD_R = 2;             // field reaches this many tiles from him (2 = 5x5)
const WIZARD_FIELD_HITS = 5;          // hits that break the field
const WIZARD_IFRAMES_MS = 450;        // one blast cannot count as several hits
const WIZARD_EXPOSED_TICKS = 56;      // 7 s with the field down, then it reforms and he heals and blinks away
const WIZARD_TP_TICKS = 96;           // 12 s between teleports while the field is up
const WIZARD_MIN_DIST = 14;           // he teleports at least this far (tiles) from you
const WIZARD_FIRST_LASER = 24;        // 3 s after he appears
const WIZARD_LASER_EVERY = 40;        // 5 s from one shot to the next
const WIZARD_CHARGE_TICKS = 16;       // 2 s of charge (the telegraph)
const WIZARD_LOCK_TICKS = 6;          // the aim stops following you this long before the shot
const WIZARD_LASER_ACTIVE = 24;       // 4 s the beam stays on the field
const WIZARD_FAN = 0.45;              // radians between beams when there are several
const WIZARD_LASER_MAX = 3;           // most beams in one volley (1 + one per field reform)
const WIZARD_REFORM_HEAL = 0.6;   // share of his max HP he heals when the field reforms (1 = full heal)
const WIZARD_COINS = 25, WIZARD_SCORE = 2000;

// Fixed bombs, kamikaze snakes, Goliath balance (bombs.js)
const PEDESTAL_FIRST = 8;             // ticks until a pedestal's first bomb
const PEDESTAL_REGEN = 96;            // ticks (12 s) for a new bomb after the old one is gone
const PEDESTAL_BLAST = 3;             // blast arm length of a pedestal bomb
const PEDESTAL_BOMB_CAP = 8;          // most pedestal bombs lying around at once
const GOLIATH_BLAST_RINGS = 2;        // rings Goliath loses when a blast reaches him
const KAMI_SIGHT = 18;                // a kamikaze notices bombs this close to it (tiles)
const KAMI_HERO_RANGE = 6;            // ...and only goes for bombs this close to YOU
const KAMI_GOLIATH_CHANCE = 0.5;      // with Goliath, this share of special snakes is a kamikaze (when a bomb exists)
// Boss banners (hud.js)
const BANNER_TICKS = 24;      // 3 s on screen
const BOSS_WARN_TICKS = 80;   // the warning appears this many ticks (10 s) before the boss wave starts
// ---- Harder waves, rushes, boss tiers (waves.js) ----
const ENEMY_CAP_WAVES = 3;        // the alive cap grows by 1 every this many waves (up to ENEMY_CAP)
const WAVE_SIZE_MAX = 24;         // most snakes in one wave (waveSize)
const ENEMY_LEN_BONUS_MAX = 4;    // enemyLength stops adding segments after this many
const ENEMY_TYPE_CHANCE_STEP = 0.01, ENEMY_TYPE_CHANCE_MAX = 0.8;   // special snakes get likelier every wave, up to this
const SPAWN_GAP_MIN = 3;          // ticks between spawns shrink by 1 every 4 waves, down to this
const WAVE_MIN_TICKS = 300;       // after wave 20 waves get shorter, never below this many ticks (300 = 37 s)
const WAVE_SHRINK = 6;            // ticks shorter per wave after wave 20
const RUSH_EVERY = 5;             // every this many waves (when it is not a boss wave) a rush floods in. 0 = no rushes
const RUSH_BASE = 5, RUSH_PER_WAVE = 0.6, RUSH_MAX = 30;   // snakes in a rush = base + wave x per wave, up to max
const RUSH_WARN_TICKS = 16;       // the warning shows this long (2 s) before the first snake of a rush
const RUSH_PER_TICK = 3;          // snakes that enter per world tick during a rush
const RUSH_COINS = 2;             // coins for clearing a rush (+1 per 10 waves)
const BOSS_EVERY = 10;            // a boss every this many waves, alternating serpent, wizard, both (the finale is wave 30)
const BOSS_TIER_HP = 0.4;         // each boss tier has this much more HP: x(1 + this x (tier - 1))
const BOSS_TIER_SPEED = 0.06;     // ...moves this much faster
const BOSS_TIER_CD = 0.08, BOSS_TIER_CD_MIN = 0.5;   // ...and attacks this much more often (cooldown x (1 - this x (tier - 1)), never below the min)
const FINALE_COINS = 60, FINALE_SCORE = 5000;        // victory reward when both bosses fall at wave 30

// ---- Weapon caps (change these freely) ----
const WEAPON_LEVEL_CAP = 40;      // no weapon goes above this level (levelling and chests both stop here)
const WEAPON_DAMAGE_CAP = 60;     // most damage one hit can do
const WEAPON_MIN_COOLDOWN = 2;    // fastest a weapon can fire, in world ticks (2 = 4 shots a second)
const WEAPON_SLOTS = 3;           // most chest weapons you can hold (more chests then level your weapons up instead)

// ---- Misc ----
const SCORE_PER_COIN = 100;       // when a run ends, every this many points of score become 1 coin
const RAIDEN_TELEGRAPH_TICKS = 4; // Raiden shows a thin blue line this long (0.5 s) before a mine goes off
// ---- Razor weapon (levels.js) ----
const RAZOR_PERIOD = 24;          // ticks (3 s) for one ring to pulse out and back in at level 1. Levels, Quick hands and Frenzy speed it up
const RAZOR_DAMAGE = 1;           // per ring sweep, scaled by weapon level like every weapon
const RAZOR_MIN_R = 1, RAZOR_MAX_R = 3;   // ring radius in tiles: from 1 out to 3 (a 7x7 square) and back
const RAZOR_GROW_LEVELS = 8;      // the biggest ring grows by 1 tile every this many weapon levels
const RAZOR_SECOND_LEVEL = 4;     // from this weapon level a second ring pulses half a cycle behind the first

// ---- Big snakes, runners, headbutts (snakes.js) ----
const BIG_SNAKE_LEN = 7;          // an enemy snake LONGER than this is big
const BIG_SNAKE_HIT_RINGS = 2;    // a big snake's head hit costs you this many followers
const BIG_SNAKE_KEEP = 4;         // a big snake that would die loses its chain down to this many segments instead
const LEN_SPEED_FROM = 3, LEN_SPEED_PER = 0.03;   // every segment beyond FROM makes a snake this much faster
const ENEMY_EAT_HP = 1;           // hit points a snake gains each time it eats a key or recruit
const RUNNER_FOOD_DIST = 7;       // a runner heads for a key or recruit this close (if you are not next to it)
const RUNNER_EAT_GROWTH = 2;      // a runner grows this many segments per key or recruit it eats
const BUMP_TILES = 1;             // a headbutt pushes the shorter chain back this many tiles