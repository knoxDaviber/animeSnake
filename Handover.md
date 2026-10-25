# animeSnake: Handover

For whoever picks this up next (a new chat, a new session, or future you). Read this first, then [DESIGN.md](DESIGN.md) for the design, [ART_SPEC.md](ART_SPEC.md) for sprite formats and [templates.md](templates.md) for the room template sketches.

## Snapshot

Snake, but anime: a fast roguelike where the snake is a chain of anime characters. The user's first small game, fully vibecoded (code with AI help, art and audio from other AI tools). Plain HTML, CSS and JavaScript, no build step, no server, no dependencies. Repo: https://github.com/knoxDaviber/animeSnake

**Wording:** the playable head is called a **hero** in anything the player sees. The code still says head / `HEADS` / `HEAD_DEFS` (renaming is optional and not worth the risk yet).

**Everything below that is written is NOT yet play-tested in a browser.** First job for the next session: play-test and fix. (The assistant that wrote the boss could only syntax-check and simulate it in Node; it cannot run the game.)

**Works today (written):** smooth Snake loop, sprites with fallbacks, rings and damage, enemy snakes in timed waves, 4 heroes (Swordsman, Magician, Gunman, Goliath) with a hero-select screen, 5 followers with passives, follower skills (mines, Shogun lightning, Raiden remote detonation), recruitment (keys summon characters), the tail stall, merging into fusion followers (all five families) with run-long fusion modifiers, the halved hero speed system, enemies with their own move timers that eat keys and recruits, score and combos, saved bests and coins, the Supabase top-10 leaderboard, the title screen that is the hero select screen, coin-gated hero unlocks, the window-corner HUD, placeholder sound, pause and an error screen, retention systems, tap-zone touch controls, the Batch B systems, the economy (Pentakill, wave coins, fake ads), Pacifist and Challenge, hero levelling with weapon branches, the title-screen shop, the scrolling camera over a 60x60 world whose view adapts to the device shape, rooms and terrain (see below), the food arrow and food presence, story decor, four enemy types, kick physics with Goliath, and the **wave 10 boss (gridless Great Serpent)**.

**Rooms and terrain written:** a 3x3 world of stamped room templates with walls, hazards, mud, conveyors, one-way gates, ice, push blocks (`B`), bumpers (`Z`), crumbling floor (`C`) and wall turrets (`T`). Templates: start, ruins, gauntlet, garden, mill, chapel, keep, barracks (nest), vault, pinball, bridges, alley, serpentine (some use `doors: 'tb'`, `noItems`).

**Not built yet:** temporary buff drops, Summoner, the later wizard (wave 20), a proper pushable-block/kick interaction audit, Goliath's food shields and wall-kick fusion reversion, real audio files and final sprites.

## Latest step: the wave 10 boss, gridless (written, partly simulated, untested in game)

Delivered as `boss.js` plus a list of paste-in edits (`BOSS_EDITS.md`: config constants, state fields, enemies.js hooks, player.js and passives.js Medusa tweaks, main.js calls, render.js drawing, reward pick). If the edits were applied, `boss.js` is loaded after `enemies.js` in `index.html`.

- **Gridless.** The boss is an enemy (`e.boss`, `type: 'boss'`) in `S.enemies`, but its body is a chain of float points `e.pts` (tile units; an integer is a tile's middle). The head moves every frame (`bossFrame`, called from `stepEnemyTimers`), turning at `BOSS_TURN` rad/s; each other point drags behind the one in front at `BOSS_SPACING`. Drawn big and smooth by `drawBossSnake`.
- **Tile compatibility.** `enemyAt(x, y)` asks `bossIndexAt` (a tile counts if its middle is within `BOSS_RADIUS` of a point), so weapons, mines, bullets, shockwaves, the player's own move and spawn checks all see it. `e.segs` is kept as one rounded tile per point (`bossSync`) for code that only wants tiles (Shogun and Thunder targeting, kill effects). Walls use a circle against tile squares (`bossBlocked`, `BOSS_WALL_RADIUS`).
- **Damage.** `BOSS_HP` 18. A hit on the head (`damageEnemyHead`) is a crit (`BOSS_CRIT` x2): it flashes, freezes `BOSS_FLASH_MS`, then `bossSwap` reverses the points (the head becomes the tail) and it keeps moving. A sword hit is 3, so three head hits kill it. Body hits (`cutEnemy`) only chip `BOSS_BODY_DAMAGE`. `BOSS_IFRAMES_MS` stops one blast from counting twice on the same part.
- **AI (`bossSteer`).** Goal: another snake's head close by (it eats it), a nearby key, otherwise you, aimed `BOSS_LEAD_MAX` tiles ahead of your heading. Direct line if it has line of sight, otherwise a walls-aware flow field (`distField`, replanned every `BOSS_PATH_MS`). It steers away from walls and mines (`bossRepel`). Every `BOSS_CHARGE_CD` ms, with line of sight at 4 to 11 tiles, it stops (windup, red ring and line telegraph), then charges straight at `BOSS_CHARGE_SPEED` x speed for `BOSS_CHARGE_MS`; ramming a wall dazes it `BOSS_DAZE_MS`. Under `BOSS_ENRAGE_AT` of its HP it is faster, turns faster and charges more often. If it barely moves for a second it swaps ends. Mines under the head go off.
- **Eating.** Keys, recruits and other snakes near its head are eaten (`bossEatStuff`); a head contact eats the whole snake, a body contact cuts it. Eating adds a body point (max `BOSS_MAX_PTS`), +`BOSS_EAT_SPEED` speed and heals `BOSS_HEAL`.
- **Hurting you.** `bossContact`: head within `BOSS_HEAD_REACH` of any of your segments, or any body point within `BOSS_BODY_REACH` of your hero, costs a ring (`takeHit`; a head touch counts as `'enemyHead'` so the Swordsman block works), then it recoils `BOSS_RECOIL_MS`. Medusa: a head touch hurts the boss instead (`BOSS_MEDUSA_DAMAGE`) and the gaze cannot freeze it. Goliath: a front touch is harmless and chips the boss.
- **Flow.** Wave 10 (`startWave`) calls `startBoss` (clears the spawn queue, sets `S.bossWait`); `updateBoss` spawns it just outside the view (or anywhere far if there is no room). `wavesPaused()` is true while `S.boss` or `S.bossWait`. Pacifist skips the boss. On death (`bossDefeated`, from `killEnemy`): `BOSS_COINS` coins, `BOSS_SCORE` score, a blast flash, `S.pendingReward`; `openBossReward` then opens the buff pick screen with `S.rewardPicking` (pool `BOSS_REWARD_POOL`, no mulligan, no locked third card) and `chooseReward` applies the buff. The waves restart after `BOSS_AFTER_TICKS`.
- **Check first:** the boss slides in from outside the view and looks big and smooth; a head hit shows "Crit!", the white flash, the freeze, then it reverses; it goes around walls and does not clip into them; the charge telegraph is readable and dodgeable; touching it costs a ring and it recoils; it eats other snakes and keys; no regular snakes during the fight; the reward pick works and play resumes; the HP bar sits under the wave number and the window corners are still clear; a Magician or gift portal through the boss does not break anything. Tune `BOSS_HP`, `BOSS_TPS`, `BOSS_TURN`, `BOSS_CHARGE_CD`, `BOSS_RADIUS`.
- **Known soft spots:** its body can slightly clip walls on tight bends (only the head is wall-tested); width-1 gaps are too narrow for the head circle (it may swap ends there); `distField` is limited to 1800 tiles, so very far goals fall back to a straight line; a Magician portal onto its body just counts as bumping it.

## Earlier step: key spots fix (paste-in, in BOSS_EDITS.md section 11)

`buildWorld` (rooms.js) created `spots` but never filled it, so `S.keySpots` was always empty and the `*` tiles in templates were never used. One line in the stamping loop fixes it: `if (c === '*') spots.push({ x: ox + x, y: oy + y });`.

## Earlier step: terrain fixes and window HUD (written, untested)

- **Terrain (player.js):** ice and conveyors no longer lock you into a wall (`terrainBlocked`, `forced`). While on ice or a belt, bumping a wall, hazard or wrong-way gate is free and just waits for a new heading. A belt running against a chain longer than 1 holds you in place (steer sideways to leave); a lone hero is turned around.
- **HUD (hud.js, loaded after render.js and overriding the old drawHud/drawComboBar/drawStallHint/drawKeyArrow):** drawn on the WORLD canvas in window pixels (window corners), not on the 640 square. `TEXT_ZONES` are window-pixel boxes anchored to a corner (`inTextZone` in world.js).
- **Buff list** (`activeBuffs`/`drawBuffList`): small chips bottom-left. **Level bar** is world-space under the hero. **Key arrow** sits halfway between the hero and the window edge.
- Old `drawHud` etc. in render.js can be deleted. `worldToUi` and `KEY_ARROW_RADIUS` are now unused.
- **Passive XP (levels.js `passiveXp`):** `LEVEL_XP_PASSIVE` XP/s at level 1, fading to 0 at `LEVEL_XP_PASSIVE_FADE`.

## Earlier step: kick physics and Goliath (written, untested)

- `kicks.js` has one shared kick system for mines, keys and waiting recruits: `tryKick` (called from `playerMove`), `updateKicks` (each world tick), `S.kicks`, `S.kickCount`. A kicked item slides `KICK_SPEED` tiles per tick until a wall, snake or another item blocks it; a sliding mine that hits an enemy explodes. A pinned item is eaten or stepped on normally.
- Only Goliath kicks (`KICK_ALL_HEROES` switches it on for everyone). Every `KICK_REWARD_EVERY` (5) kicks a random fusion joins his chain.
- Goliath (hero 4, `goliath.png`, placeholder fallback exists): 0.75x speed; hits from the front and sides are harmless (walls, hazards, enemy heads, spit orbs; he headbutts heads for 1); only back hits and mines hurt; instant reverse when his chain is 1 long; a 3-wide swipe attack.
- Not built: food shields, wall kicks that revert fusions, recruits walking in as the kick reward, Goliath art.

## Earlier step: rooms, food and enemy types (written, untested)

- **Rooms.** `rooms.js` holds the templates (20 strings of 20 characters), themes and `buildWorld()`, called from `newRun`. The world is a 3x3 grid of 20x20 rooms. The middle room is always the start room; the four rooms next to it are tier 1 and the corners tier 2. Each room is picked at random (never the same as the previous one), rotated and maybe mirrored (`transformRows`; direction tiles turn with it; `doors: 'tb'` rooms keep the opening that faces the middle). A console warning appears if a template is not 20x20.
- **Tile map.** `S.map[y][x]` is one character per tile: `#` wall, `H` hazard, `~` mud, `> < ^ v` conveyors, `r l u d` one-way gates, `I` ice, `B` push block, `Z` bumper, `C` crumble, `T` turret, `*` key spot, `e` floor. Use `tileAt`, `isWall` (walls, blocks and turrets), `isHazardAt`, `gateBlocks` (world.js). `tileFree` only accepts plain floor (`.*e~`).
- **Terrain rules.** Walls, hazards and wrongly-entered gates block the hero (grace tick, ring loss). A conveyor forces the hero's heading. On ice the heading is locked. Mud halves hero and enemy speed. Push blocks slide if the tile behind is free and fill hazards (`pushBlock`). A bumper turns the heading a quarter turn clockwise (`bumperTurn`). A crumble tile becomes a hazard once the tail leaves it. Turrets fire spitter orbs along their row while the hero is in their room (`updateTurrets`). Mine blasts smash the first push block in their way. The Magician and Magician's gift step through walls up to `PORTAL_WALL_REACH` (8) thick.
- **Enemies and terrain.** Enemies cannot enter walls, blocks, turrets or hazards, only enter gates the right way, ride conveyors, slide on ice. Chasing uses a walls-aware distance map (`distField`).
- **Enemy types** (`ENEMY_TYPES`): fast (wave 4+), armored (wave 7+, double HP), spitter (wave 10+). A room can favour a type (`favors`) while the hero is in it. `noItems` rooms (the vault) get no keys, recruits or spawns.
- **Food presence.** `KEY_PRESENCE` (3) keys on the map; a Kingsman fusion adds +1 for the run (`S.keyBonus`). New keys are at least `KEY_MIN_DIST` tiles from the hero and half go on `*` key spots (needs the key-spot fix above to work). An arrow points to the nearest key.
- **Story decor.** `scenery.js` draws the floor, walls, tiles and the decor from shapes (bones, bonfire, statues, banners, throne, ...). Each template lists its decor as `[kind, x, y]`.
- **Check first:** the start room looks right and the hero stands on a free tile; every room is reachable (openings line up, no room sealed, `doors: 'tb'` rooms face the right way); conveyors and ice feel fair; push blocks, bumpers and crumbling floor behave; turrets are dodgeable; enemies get around walls and do not freeze; keys refill to 3; the world stays smooth (many wall tiles are drawn each frame).

## Earlier step: the camera (written, untested)

- **World and view.** `COLS` and `ROWS` in config.js are the **world** size, 60x60 tiles. The hero starts in the middle. `SCREEN_W` / `SCREEN_H` (640) are the size of the UI canvas.
- **Two canvases.** `#w` fills the window and draws the world, moved by the camera. `#c` is the 640x640 square (centred, on top) that draws menus, overlays and the ad screen. `render.js` has `let ctx` (the UI canvas) and `wctx` for the world; `draw()` swaps `ctx` while it draws the world layers and swaps it back in a `finally`. The world canvas is hidden on the hero select, shop and ad screens, and dimmed behind pauses, deaths and picks (`worldOpacity()`).
- **View size adapts.** `resizeView()` in camera.js sets `S.view = { cssW, cssH, dpr, scale, w, h }`. The short side shows `VIEW_SHORT_TILES` (20) tiles and the long side at most `VIEW_LONG_MAX_TILES` (32).
- **Camera.** `S.cam` is the top-left of the view in world pixels. `updateCamera(t)` follows the hero's interpolated position with `CAM_SMOOTH_MS` smoothing, clamped to the world, snapping when the goal jumps far (portals, revives).
- **`viewTiles()`** returns the tiles in view; enemy and recruit spawns (and the boss) use it to start just outside the view.
- Screen-space layouts (cards, buttons) use `SCREEN_W` / `SCREEN_H`. Tap steering works anywhere in the window.
- **Check first:** the hero starts centred and the camera follows smoothly; it stops at the world edge; menus and the HUD look right; resizing or rotating re-fits the view; the canvas looks crisp (the scale is not rounded to whole pixels).

## Earlier batches (all untested)

**Batch C (pacing foundation):**
- **Speed rework.** `HERO_BASE_SPEED = 0.5`. `heroSpeed()` in passives.js is `HERO_BASE_SPEED` times the old percentage modifiers, clamped to `HERO_SPEED_MIN` (0.15) .. `HERO_SPEED_MAX` (2). At base speed the hero moves every 250 ms.
- **Enemy move timers.** Each enemy has `speed`, `last` and `alpha`. `stepEnemyTimers(t)` runs every frame from `loop()` and calls `stepEnemy` when an enemy's own interval has passed. `ENEMY_BASE_SPEED` is 0.5. Enemies speed up per wave and per thing eaten. `resetEnemyClocks()` is called on resume and revive.
- **Stun is in world ticks.** A stunned enemy keeps its timer "ready", so it moves the moment the stun ends.
- **Timed waves.** `S.waveTimer` counts down whether or not the last wave is dead. `waveDuration(w)`: about 10 s at wave 1, 30 s at wave 10, 60 s from wave 20. A fully cleared field jumps the timer to `WAVE_CLEAR_SKIP`. At most `ENEMY_CAP` (6) enemies at once; the rest wait in a queue (`ENEMY_QUEUE_MAX`). `wavesPaused()` is the boss hook.
- **Enemies eat.** An enemy that steps on a key or recruit removes it, grows a segment (max 10) and gets +10% speed (cap x1.8).
- **Info bar removed.** `hud()` in render.js is an empty function that many files still call.

**Batch B:**
- Two-entry input buffer (`INPUT_BUFFER`) and a grace tick (`GRACE_TICKS`).
- Flag buffs: Magician's gift, Glass cannon, Dev mode, Everything is a bomb (`bombContact()`).
- Second wind is one free revive (`S.freeRevive`).
- Modifier score multipliers (guesses, tune them).
- Buff screen: third card starts locked (1 coin), mulligan (R, 5 coins). Both call `spendCoins()`.

**Economy, modes, levelling and shop:**
- **Coins and ads.** `WAVE_COINS` pays on waves 5, 10, 15, 20. Pentakill pays 5 coins once per chain. Fake ads: `ads.js` + `assets/ads/ads_data.js`; the hold button fast-forwards by `AD_HOLD_SPEED`. `ADS_ENABLED` is currently **true**.
- **Give up.** P, then Q (or Backspace, or the button) twice within `GIVE_UP_CONFIRM_MS`.
- **Pacifist and Challenge** are buffs. Pacifist: enemies solid and harmless, no weapons, stuck detector, no boss. Challenge: a hit drops all followers, reach wave 20 to call `winRun()` for 100 coins.
- **Levelling** (`levels.js`): kills give XP, every level boosts the newest weapon, every 5 levels `openBranchPick()` offers a branch (Gatling, Ricochet, Nova, Thunder). The pick screen is reused with `S.branchPicking = true`. (The boss reward pick reuses it the same way with `S.rewardPicking`.)
- **Shop** (`shop.js`): `SHOP_LOCKED` locks buffs until bought (`S.buffLv[id]`); permanent starting followers.

## Run it

Open `src/index.html` in a browser. Sprites load from `../assets/images/`, so keep the folder structure. Controls: arrows / WASD / swipe / tap zones, P or Escape pauses. On the hero select screen, I toggles stat details, B opens the shop. On the buff screen: 1/2/3 or arrows and Enter pick, R is the mulligan.

The game opens on the hero select screen. Swordsman is free; Magician 50, Gunman 100, Goliath 200 (built), Summoner 200 (not built). Old saves that already own Gunman retain that unlock.

## Code layout (`src/`, loaded in this order by `index.html`)

| File             | Owns                                                                                   |
| ---------------- | -------------------------------------------------------------------------------------- |
| `config.js`      | All constants and tuning numbers (including `BOSS_*`)                                  |
| `sprites.js`     | Shared sprite sheets (`SPRITES`, `HEADS`)                                              |
| `followers.js`   | `FOLLOWERS` (5 base followers + fusions), `newSlot`, `randomFollower` (never a fusion) |
| `state.js`       | The `S` object (all mutable state) and `newRun()`                                      |
| `storage.js`     | Saves best score, best combo, best wave, coins, unlocks, shop levels, retention data   |
| `unlocks.js`     | Click-to-buy unlocks: `isUnlocked`, `tryUnlock`, `heroPrice`                           |
| `audio.js`       | All sound: synthesized placeholder effects and music moods                             |
| `world.js`       | `tileAt`, `tileFree`, `pushBlock`, `inTextZone`, keys and food presence, `nearestKey`  |
| `rooms.js`       | Room templates, themes, `buildWorld()`, `roomAt()`                                     |
| `score.js`       | Points, combos, coin rewards and popups                                                |
| `player.js`      | Steering and input queue, `playerMove` (grace, portals, terrain, Dev mode), `takeHit`  |
| `camera.js`      | `resizeView`, `camTarget`, `updateCamera`, `viewTiles`                                 |
| `attacks.js`     | Attack sheets, sword hit, bullets                                                      |
| `heads.js`       | Hero definitions, weapons, `weaponDamage`, hero-select layout and `chooseHead`         |
| `levels.js`      | XP, levels, weapon branches                                                            |
| `skills.js`      | Follower active skills (mine, bomb, Shogun lightning, Raiden detonate)                 |
| `mines.js`       | Mines, blast shape, detonation, `bombContact`                                          |
| `passives.js`    | Follower passives, `heroSpeed`, Gorgon shields, Medusa freeze and shield               |
| `recruits.js`    | Keys and recruits: summon, walk in, touch, `eatKey`, `shootRecruit`                    |
| `kicks.js`       | Kick physics for mines, keys and recruits; Goliath rules                               |
| `merge.js`       | `mergeCheck`: three identical followers anywhere in the chain fuse                     |
| `buffs.js`       | `BUFFS`, buff pick layout, third-card unlock, mulligan, `startRun`                     |
| `shop.js`        | The shop, buff levels, permanent starting followers                                    |
| `revive.js`      | Death/revive/game-over flow, give up                                                   |
| `ads.js`         | Fake ads (data in `assets/ads/ads_data.js`, loaded before it)                          |
| `retention.js`   | Pressure, frustration/pity and coin-tier logic                                         |
| `leaderboard.js` | Shared top 10 and initials box                                                         |
| `enemies.js`     | Enemy snakes, AI, damage, eating, move timers, spitters, turrets, timed waves          |
| `boss.js`        | The wave 10 gridless boss: spawn, AI, damage, drawing, reward pick                     |
| `scenery.js`     | Floor, wall and terrain tiles, story decor                                             |
| `render.js`      | All drawing, including title screen, buff screen, shop and ads                         |
| `hud.js`         | Window-corner HUD, buff list, level bar, key arrow (overrides old versions in render.js) |
| `input.js`       | Keyboard (with `HELD` keys), touch, swipe/tap zones, mulligan, shop input and pause    |
| `main.js`        | `step()`, `heroStep()`, `loop()` and start-up                                          |

Rules of thumb: tuning numbers go in `config.js`, state goes in `S`, drawing goes in `render.js` (the boss draws itself from `boss.js`). No loose globals. No `import`/`export` modules (they fail from `file://`).

## Clocks

- **Hero clock:** `heroStep` runs on `heroInterval()` = `TICK_MS / heroSpeed()`.
- **World tick (125 ms):** `step` advances skills, attacks, recruits, stun countdown, wave timer, combos and the animation frame. All cooldowns in config.js are in world ticks.
- **Enemy clocks:** each enemy moves on its own `enemyInterval(e)` (`stepEnemyTimers`).
- **Boss clock:** the boss ignores tiles and ticks. `bossFrame` runs every frame from `stepEnemyTimers` and uses real time (`performance.now()` and a clamped `dt`), so its speeds and timers are in tiles per second and milliseconds (`BOSS_*`).

Rendering is separate: the hero uses `S.heroAlpha`, grid enemies use `e.alpha`, everything else `S.alpha`. The boss draws straight from its float points.

## Rules to preserve

- Heroes attack automatically in the facing direction; steering is aiming.
- Heroes start with **zero followers**.
- A hit removes the tail character; losing the last character kills the run. Glass cannon kills on any hit that lands (shields still absorb).
- Three identical followers anywhere in the chain merge into one distinct fusion.
- Fusion permanent buffs are run-only modifiers stored in `S`.
- Gorgon shields do not recharge. Medusa fusion leaves a one-hit shield: 60 s recharge, 15 s shorter per later merge, minimum 15 s.
- Gunman fires every 16 ticks and gets a front bullet.
- Magician keeps the 3x3 shockwave, charge-based (2 charges, 5 s per charge, fires itself when an enemy is in range).
- Keys remain the recruitment item.
- Keysman keeps both its old double-summon chance and the rule that recruiting a Keysman summons a non-Keysman follower.
- Raiden's remote mine detonation is oldest-first.
- Modifiers such as Dev mode, Pacifist and Glass cannon are legitimate runs, scored differently.
- Gameplay text sits at half opacity (`TEXT_ALPHA`), and nothing spawns on a text zone.
- The menus UI is a fixed 640x640 square; only the world adapts to the window.
- No info bar. Follower counts and skill bars come back on the canvas if they are missed.
- The boss is hurt by every weapon through the normal enemy paths (`enemyAt`, `damageEnemyHead`, `cutEnemy`). Keep new weapons going through those and they work on it for free.

## Heroes and prices

| Hero      | Price / state             |
| --------- | ------------------------- |
| Swordsman | Free                      |
| Magician  | 50 coins; locked at start |
| Gunman    | 100 coins                 |
| Goliath   | 200 coins (written)       |
| Summoner  | 200 coins (not built)     |

Unlocks are by hero id, not card index. Preserve old Gunman unlocks.

## Buffs

Current pool: Starting follower, +20% score, Thick skin, Quick hands, Combo keeper, Skill haste, Second wind (free revive), Welcome party, Rich, Minefield, Magician's gift, Glass cannon, Dev mode, Everything is a bomb, Pacifist, Challenge. Magician's gift, Everything is a bomb, Pacifist, Challenge, Dev mode, Glass cannon and +20% score are **locked in the shop** (`SHOP_LOCKED`) until bought. The boss reward pick draws from `BOSS_REWARD_POOL` (Thick skin, Quick hands, Combo keeper, Skill haste, Second wind, Welcome party: buffs that make sense mid-run).

Buff screen economy: the third card costs 1 coin, a mulligan costs 5. Both count toward `S.runSpend`.

Known loose ends: `SECOND_WIND_BONUS`, `COIN_PER_KILL`, `COIN_PER_WAVE`, `REVIVE_COST_*`, `BOUNTY_POINTS` and `KINGSMAN_BOUNTY_MAX` are leftovers of old economies. Delete them when convenient. The Rich buff pays 10% of coins earned at the run's end.

## Economy (as built)

- Coins are scarce.
- A Pentakill pays **5 coins** as a hidden mini-sidequest, once per chain.
- Wave milestones pay coins (`WAVE_COINS`). The wave 10 boss pays `BOSS_COINS` (10) on top of the wave 10 coins.
- Fake ads: revives and the hero-select ad button (10, 5, 2, 1 coins, back to 10 after an hour). Dev toggle `ADS_ENABLED`, player toggle "No ads" (`AD_FREE_PRICE`, currently 99999 in config.js; the intended price is 1000).
- Retention coin tiers use coins spent in runs. **The thresholds in config.js are still the old 0 / 15 / 45 / 90**; the intended ones were about 0 / 5 / 12 / 25.

## Waves and enemies

Built: timed waves, enemy cap, enemy move timers, enemies eating keys and recruits, spawning just outside the view, fast / armored / spitter types, room-favoured types, wall turrets, and the wave 10 boss (no new regular snakes during it).

Still to do: more enemy variety later, temporary buff drops from enemies (see DESIGN.md).

## Goliath and kicking

One kickable-projectile system (kicks.js) serves mines, keys and recruits. Goliath is hurt only from behind; front and side contact is harmless; mines hurt him. Food shields, follower walk-in every 5 kicks and fusion reversion on wall kicks are not built.

## Summoner

Tier 4/hard work. Followers become autonomous agents. Normal summons live for 8 s, fusion summons for 5 s (Medusa freezes and chases, for example). Context AI chooses useful behaviour.

## Bosses

**Wave 10: the Great Serpent (written).** See "Latest step" above. Idea followed: it does not follow the grid rules, a head hit is a 2x crit that makes it flash and then swap head and tail, three head hits kill it. Payouts and numbers are tuning targets.

**Wave 20: wizard (build much later).** Teleports, persistent map-wide laser, forcefield pushes the player out, can fire across rooms. The room system now exists, so it is possible, but it should wait until the boss and the rooms are play-tested.

## Challenge and Pacifist

**Challenge:** a buff; separate win screen; 100-coin reward; intentionally difficult. **Pacifist:** normal Snake-style avoidance. No combat, no boss. A stuck detector ends the run.

## Build order

Tiers 1 to 4 (except Summoner), the camera, rooms and tiles, kicks, Goliath and the wave 10 boss are written (untested). Remaining:

1. **Play-test and fix** everything written so far. This is the most valuable thing now.
2. **Temporary buff drops** (Ghost body, Haste, Magnet, Bubble, Frenzy) dropped by enemy snakes, with timer chips in the buff list.
3. **Goliath extras** (food shields, wall kicks), **Summoner**.
4. **Wizard (wave 20)** much later.
5. Real audio files and final sprites.

## Known gaps and cautions

- Nothing from Tiers 1 to 4, the camera, rooms or the boss has been verified in a real browser; they are design targets until play-tested.
- Exact numbers still need play-testing: hero and enemy base speeds, wave durations, `ENEMY_CAP`, eating speed-up, Raiden's bonus, modifier score multipliers, boss numbers (`BOSS_*`), ad timing, Pacifist goal, camera view sizes, room templates, kick physics.
- With a 60x60 world, Bomber blasts reach up to 60 tiles and bullets fly across the whole world.
- Small code issues noticed: `HERO_PRICES = {...}` in config.js has no `const` (it works as a global, but add `const`); the TEST ONLY comment is duplicated; `ART_SPEC.md` still says the starting grid is 20x20 (the world is 60x60 with a 20-tile-wide view); the comment above `MINEFIELD_COUNT` mentions a MINE_MAX of 3 (it is 8); `AD_FREE_PRICE` is 99999 (probably a test value).
- Everything is a bomb can hurt the player on key/recruit contact (30%); tune `BOMB_CHANCE` if it feels punishing.
- The daily challenge is parked and should not block the main roadmap.
- The leaderboard currently accepts hobby-game scores without anti-cheat protection.
- The assistant cannot push to git and (in some sessions) cannot see the game files on disk. Files are delivered as new files or as copy-paste edits; the user copies them in and commits.
- Docs mention HEADS/HEAD_DEFS because the code uses those names.
- `animeSnake.panel` may linger in a player's localStorage from the old info bar. It is harmless.

## Online leaderboard setup

The shared top 10 stays off until the Supabase key is set (`LEADERBOARD` in `src/config.js`).

1. Make a free Supabase project.
2. Open SQL Editor, New query, paste `tools/supabase_setup.sql`, Run. (It keeps the best 50 scores and the game shows 10. If you set it up earlier with the old limit of 10, run `tools/supabase_keep50.sql` once.)
3. Paste the project URL and the **publishable** (or legacy anon) key into `LEADERBOARD.url` and `LEADERBOARD.key`. Never use a secret or service_role key, because the file is served to every player.
4. A new top-10 score shows an initials box on the game-over screen.

## Working preferences

- Ask a clarifying question on vague instructions.
- Give copy-paste edits with exact Ctrl+F find text and where it goes. For the docs (Handover, DESIGN, README), give the full files.
- Write a short handover after long code sessions.
- Code split across files, not one big file.
- Commit when something works, and before big AI changes.
- Keep raw AI art in `assets/_raw/` (git-ignored); commit only cleaned sheets.
- Say "hero", not "head", in anything the player sees. Use kaomojis in chat replies.
- Minimal UI: the game is the main attraction. Nothing outside the canvases, and all gameplay text at half opacity.

## Last session

Built the wave 10 boss as a gridless snake (`boss.js` + `BOSS_EDITS.md`): float-point body that moves every frame, crit on head hits with flash then head/tail swap, a smarter AI (target leading, wall-aware pathing, wall and mine avoidance, telegraphed charges, enrage, eating, stuck recovery), touch damage and recoil, Medusa and Goliath rules, an HP bar and a reward pick. Found and fixed (paste-in) the key-spot bug in `buildWorld`. Synced the docs with what is actually built. The boss was simulated in Node (chase, path around a wall, crit and swap, kill) but nothing has been run in a browser.

Next: apply the paste-ins, play-test everything (especially the boss feel: speed, turn rate, charge fairness, hit radius), then temporary buff drops.