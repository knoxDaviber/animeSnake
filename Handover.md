# animeSnake: Handover

For whoever picks this up next (a new chat, a new session, or future you). Read this first, then [DESIGN.md](DESIGN.md) for the design, [ART_SPEC.md](ART_SPEC.md) for sprite formats and [templates.md](templates.md) for the room template sketches.

## Snapshot

Snake, but anime: a fast roguelike where the snake is a chain of anime characters. The user's first small game, fully vibecoded (code with AI help, art and audio from other AI tools). Plain HTML, CSS and JavaScript, no build step, no server, no dependencies. Repo: https://github.com/knoxDaviber/animeSnake

**Wording:** the playable head is called a **hero** in anything the player sees. The code still says head / `HEADS` / `HEAD_DEFS` (renaming is optional and not worth the risk yet).

**Everything below that is written is NOT yet play-tested in a browser.** First job for the next session: play-test and fix.

**Works today (written):** smooth Snake loop, sprites with fallbacks, rings and damage, one hazard, enemy snakes in timed waves, 3 heroes (Swordsman, Magician, Gunman) with a hero-select screen, 5 followers with passives, follower skills (mines, Shogun lightning, Raiden remote detonation), recruitment (keys summon characters), the tail stall, merging into fusion followers (all five families) with run-long fusion modifiers, the halved hero speed system, enemies with their own move timers that eat keys and recruits, score and combos, saved bests and coins, the Supabase top-10 leaderboard, the title screen that is the hero select screen, coin-gated hero unlocks, the on-canvas HUD, placeholder sound, pause and an error screen, retention systems, tap-zone touch controls, the Batch B systems, the economy (Pentakill, wave coins, fake ads), Pacifist and Challenge, hero levelling with weapon branches, the title-screen shop, and the **scrolling camera over a 60x60 world whose view adapts to the device shape**.

**Also written (untested): rooms and terrain** (a 3x3 world of stamped room templates with walls, hazards, mud, conveyors, one-way gates and ice), **a food arrow, food presence (3 keys on the map, Kingsman +1), Dark Souls style story decor, and four enemy types** (normal, fast, armored, spitter).

**Not built yet:** push blocks, bumpers, turrets and crumbling floor (templates 4, 5, 7, 8 in templates.md), the serpentine (6, it has no side doors), temporary buff drops, kickable projectiles, Goliath, Summoner, the wave 10 boss, and the later wizard. Real audio files and final sprites are also still pending.

## Latest step: terrain fixes and window HUD (written, untested)

- **Terrain (player.js):** ice and conveyors no longer lock you into a wall (`terrainBlocked`, `forced`). While on ice or a belt, bumping a wall, hazard or wrong-way gate is free and just waits for a new heading. A belt running against a chain longer than 1 holds you in place (steer sideways to leave); a lone hero is turned around.
- **HUD (hud.js, new, loaded after render.js and overriding the old drawHud/drawComboBar/drawStallHint/drawKeyArrow):** drawn on the WORLD canvas in window pixels (window corners), not on the 640 square. `draw()` in render.js calls it after the camera `restore()`. `TEXT_ZONES` are now window-pixel boxes anchored to a corner (`inTextZone` in world.js).
- **Buff list** (`activeBuffs`/`drawBuffList`): small chips bottom-left. **Level bar** is world-space under the hero. **Key arrow** sits halfway between the hero and the window edge.
- Old `drawHud` etc. in render.js can be deleted. `worldToUi` and `KEY_ARROW_RADIUS` are now unused.
- Check first: ice/belt rooms (chapel, mill) no longer trap you, the HUD sits in the window corners on wide and tall windows, the chips do not overlap anything important, and the arrow looks right at the window edges.
- **Passive XP (levels.js `passiveXp`, called from `step`):** `LEVEL_XP_PASSIVE` XP/s at level 1, fading linearly to 0 at `LEVEL_XP_PASSIVE_FADE`. XP can now be fractional.

## Latest step: kick physics and Goliath (written, untested)

- `kicks.js` (new) has one shared kick system for mines, keys and waiting recruits: `tryKick` (called from `playerMove`), `updateKicks` (each world tick), `S.kicks`, `S.kickCount`. A kicked item slides `KICK_SPEED` tiles per tick until a wall, snake or another item blocks it; a sliding mine that hits an enemy explodes. A pinned item (cannot slide) is eaten or stepped on normally.
- Only Goliath kicks (`KICK_ALL_HEROES` in config.js switches it on for everyone). Every `KICK_REWARD_EVERY` (5) kicks a random fusion joins his chain.
- Goliath (hero 4, `HEADS` needs `goliath.png`, placeholder fallback exists): 0.75x speed; hits from the tile he faces are harmless (walls, hazards, enemy heads, spit orbs; he headbutts heads for 1); side/back hits and mines hurt; instant reverse when his chain is 1 long.
- Not built: food shields, wall kicks that revert fusions, recruits walking in as the kick reward, Goliath art.
- Check first: kicks slide and stop correctly, pinned items are eaten, front hits are harmless, back hits hurt, speed feels right.

## Latest step: rooms, food and enemy types (written, untested)

- **Rooms.** `rooms.js` holds the templates (20 strings of 20 characters), themes and `buildWorld()`, called from `newRun`. The world is a 3x3 grid of 20x20 rooms. The middle room is always the start room; the four rooms next to it are tier 1 and the corners tier 2. Each room is picked at random (never the same as the previous one), rotated 0 to 3 quarter turns and maybe mirrored (`transformRows`; direction tiles turn with it). The world edge is always wall. Built templates: start, ruins, gauntlet, garden, mill, chapel (ice), keep (moat), nest (barracks). A console warning appears if a template is not 20x20.
- **Tile map.** `S.map[y][x]` is one character per tile (legend at the top of rooms.js): `#` wall, `H` hazard, `~` mud, `> < ^ v` conveyors, `r l u d` one-way gates, `I` ice, `*` key spot, `e` floor. `S.hazard` is gone: use `tileAt`, `isWall`, `isHazardAt`, `gateBlocks` (world.js). `tileFree` now only accepts plain floor (`.*e~`).
- **Terrain rules.** Walls, hazards and gates that are entered the wrong way block the hero like the old out-of-bounds walls (grace tick, ring loss, bombContact on the hero tile). A conveyor forces the hero's heading (not into his own back when the chain is longer than 1). On ice the heading is locked and queued turns wait. Mud halves hero speed (`heroSpeed`) and enemy speed (`enemyInterval`). Mine blasts and bullets stop at walls. Magician's gift and the Magician now step through a wall up to `PORTAL_WALL_REACH` (8) thick to the first open tile (the old edge-to-edge wrap is gone because the world edge is wall). `wrapStep` was fixed for these longer jumps.
- **Enemies and terrain.** Enemies cannot enter walls or hazards, only enter gates the right way, ride conveyors, slide on ice. Chasing now uses a walls-aware distance map (`distField`, a limited breadth-first search from the target), so they walk around walls.
- **Enemy types** (`ENEMY_TYPES` in config.js): fast (wave 4+, thin, x1.6 speed, 1 segment shorter), armored (wave 7+, double hit points, steel outline, slower), spitter (wave 10+, spits an orb along a row or column when lined up with you, `SPIT_*`; harmless in Pacifist). `pickEnemyType` picks a special `ENEMY_TYPE_CHANCE` of the time, and a room can favour a type (`favors`) while the hero is in it. Spits live in `S.spits` and are moved by `updateSpits` each world tick.
- **Food presence.** `KEY_PRESENCE` (3) keys are kept on the map; `S.keyBonus` adds to it. `placeFood()` tops up (it is no longer a 1 to 3 key bounty drop); `refreshKey` calls it every tick unless `RECRUIT_MAX` characters are waiting. New keys are at least `KEY_MIN_DIST` tiles from the hero and half of them go on `*` key spots. The Kingsman fusion now adds **+1 food presence for the rest of the run** (and still +1 weapon damage); its old 1 to 3 key bounty was removed.
- **Food arrow.** `drawKeyArrow` (render.js) draws a faint arrow around the hero toward the nearest key, hidden when it is closer than `KEY_ARROW_HIDE_DIST` tiles. Turn it off with `KEY_ARROW`.
- **Story decor.** `scenery.js` draws the floor, walls and tiles from shapes, and the decor (bones, skulls, ribs, a cold bonfire, swords in the ground, helms, candles, banners, headless statues, a throne, chains, a broken wheel, bedrolls, moss, puddles, frost). Each template lists its decor as `[kind, x, y]`; the story is only told by what lies where (a bone trail from the cold hearth to the north door, knights who died facing their gates, a king on his throne with the drawbridge chains cut, a frozen congregation, soldiers who never left their beds). Themes in `ROOM_THEMES` set the colours and what is scattered.
- **Check first:** the start room looks right and the hero stands on a free tile; every room is reachable (openings line up, no room sealed); conveyors and ice feel fair; enemies get around walls and do not freeze; spitters are dodgeable; the arrow points at a real key; keys refill to 3; two Kingsmen give +1 key each fusion; Magician and Magician's gift pass walls; the world stays smooth (many wall tiles are drawn each frame).
- **Known thin spots:** hazards are now many but the old one-hazard sprite is reused per tile; there are no push blocks, bumpers, turrets or crumbling floor yet; keys on ice rooms only appear on the plain floor ring; the retention coin-tier thresholds are still unchanged.

## Earlier step: the camera (written, untested)

- **World and view.** `COLS` and `ROWS` in config.js are now the **world** size, 60x60 tiles (3x3 rooms of 20x20 later). The hero starts in the middle. `SCREEN_W` / `SCREEN_H` (640) are the size of the UI canvas.
- **Two canvases.** `#w` fills the window and draws the world, moved by the camera. `#c` is the 640x640 square (centred, on top) that draws the HUD, menus, overlays and the ad screen. `render.js` has `let ctx` (the UI canvas) and `wctx` for the world; `draw()` swaps `ctx` while it draws the world layers and swaps it back in a `finally`. The world canvas is hidden on the hero select, shop and ad screens, and dimmed behind pauses, deaths and buff picks (`worldOpacity()`), so the world never shows around the square when it should not.
- **View size adapts.** `resizeView()` in camera.js sets `S.view = { cssW, cssH, dpr, scale, w, h }`. The short side of the window shows `VIEW_SHORT_TILES` (20) tiles and the long side at most `VIEW_LONG_MAX_TILES` (32), whichever zooms in more. It runs at start-up (main.js) and on `resize` / `orientationchange`.
- **Camera.** `S.cam` is the top-left of the view in world pixels (null = snap next frame). `updateCamera(t)` runs every frame from `loop()` before `draw()`. It follows the hero's interpolated position with `CAM_SMOOTH_MS` smoothing, is clamped to the world, and snaps when the goal jumps more than 75% of the smaller view side (Magician portals, revives).
- **`viewTiles()`** returns `{ x0, y0, x1, y1 }`, the tiles in view including the partly visible edge. Enemy spawns (`spawnEnemy`) and recruit spawns (`summonRecruit`) use it so they start just outside the view and arrive near the player. `inTextZone()` (world.js) converts a tile to a position inside the UI square, because `TEXT_ZONES` are screen areas.
- **Drawing.** The floor, a faint grid (`GRID_ALPHA`) and a wall frame come from `drawWorld()`. Everything else in the world (hazard, keys, mines, recruits, enemies, player, drops, attacks, bullets, blasts, zaps, popups) is drawn in world pixels; the HUD, combo bar, stall hint, overlays, picks and ads are drawn in screen pixels.
- **Screen-space layouts** (cards, buttons, give-up rects) use `SCREEN_W` / `SCREEN_H`, not `COLS` / `ROWS`.
- **Input.** Tap steering works anywhere in the window (it uses the square's centre as the X). Menus still use the square's coordinates.
- **Not done on purpose:** one hazard and one key for the whole world (the room system should fix it), a faint arrow for keys (searching is intentional), moving the HUD to the window corners.
- **Check first:** the hero starts centred and the camera follows smoothly; it stops at the world edge; the wall frame and grid show; enemies and recruits come in from just outside your view; a Magician portal snaps the camera; menus and the HUD look unchanged; resizing the window or rotating the phone re-fits the view; the canvas looks crisp (the scale is not rounded to whole pixels, so on odd window sizes some pixels can look uneven; if it bothers, snap `scale` to a nice value in `resizeView`).

## Earlier batches (all untested)

**Batch C (pacing foundation):**
- **Speed rework.** `HERO_BASE_SPEED = 0.5` (config.js). `heroSpeed()` in passives.js is `HERO_BASE_SPEED` times the old percentage modifiers (Raiden, Shogun, Gorgon, Medusa, `S.speedBonus`), clamped to `HERO_SPEED_MIN` (0.15) .. `HERO_SPEED_MAX` (2). At base speed the hero moves every 250 ms (every second world tick). Only the hero uses this.
- **Enemy move timers.** Each enemy has `speed`, `last` (ms of its last move) and `alpha` (progress through its move). `stepEnemyTimers(t)` (enemies.js) runs every frame from `loop()` in main.js and calls `stepEnemy` when an enemy's own interval (`enemyInterval(e)`) has passed. `ENEMY_BASE_SPEED` is 0.5, the same as the hero. Enemies speed up per wave (`enemyWaveSpeed`) and per thing eaten. `resetEnemyClocks()` is called on resume and revive so nothing jumps ahead.
- **Stun is in world ticks.** `stepEnemies()` (called from `step()`) only counts stun down. A stunned enemy keeps its timer "ready", so it moves the moment the stun ends. Medusa's freeze refreshes the stun every tick. `stepEnemyTimers` calls `checkDeath()` because an enemy can kill you outside `step()`.
- **Timed waves.** `S.waveTimer` is the ticks until the NEXT wave starts and counts down whether or not the last wave is dead. `waveDuration(w)`: about 10 s at wave 1, 30 s at wave 10, 60 s from wave 20. If the field is completely cleared the timer jumps to `WAVE_CLEAR_SKIP` (16 ticks, 0 turns it off). At most `ENEMY_CAP` (6) enemies live at once; extra spawns wait in a queue of at most `ENEMY_QUEUE_MAX` (8). `wavesPaused()` is the boss hook: setting `S.boss` stops the timer.
- **Enemies eat.** An enemy that steps on a key or recruit removes it, grows one segment (max `ENEMY_MAX_LEN`, 10) and gets `ENEMY_EAT_SPEED` (+10%) faster, capped at `ENEMY_SPEED_MAX` (x1.8). A chasing enemy also goes for a key within `ENEMY_KEY_HUNT_DIST` (4) tiles (`chaseTarget`). A key eaten by an enemy is lost; `refreshKey` puts the next one down.
- **Info bar removed.** `panel.js` and its markup are gone. `hud()` in render.js is an empty function that many files still call. All in-game text is on the canvas at `TEXT_ALPHA`. "Next wave Ns" is drawn only when `WAVE_SHOW_MS` (10 s) or less is left.

**Batch B:**
- Two-entry input buffer (`INPUT_BUFFER`, `S.dirQueue`) and a grace tick (`GRACE_TICKS`, 0 or 1) that forgives the first wall or body bump.
- Flag buffs in `buffs.js`: Magician's gift (portals, reset in `startWave`), Glass cannon (`weaponDamage()` in heads.js, one hit kills), Dev mode (one step per key press; held keys step via `HELD`/`heldDir()` in input.js and `playerMove`), Everything is a bomb (`bombContact()` in mines.js).
- Second wind is one free revive (`S.freeRevive`, `reviveCost()` returns 0).
- Modifier score multipliers: `GLASS_SCORE_MULT`, `DEV_SCORE_MULT`, `BOMB_SCORE_MULT` and the shop's `BOMB_SCORE_PER_PCT` (guesses, tune them).
- Buff screen: the third card starts locked (1 coin), and a mulligan (R key or button, 5 coins) rerolls the cards. Both call `spendCoins()`, which adds to `S.runSpend` for the retention coin tiers.

**Economy, modes, levelling and shop:**
- **Coins and ads.** `WAVE_COINS` pays on waves 5, 10, 15, 20. `PENTAKILL_AT` / `PENTAKILL_COINS`: the 5th kill in one chain pays 5 coins, once per chain (`S.pentaPaid`). Coin payouts go through `coinReward()` (retention coin tier). Fake ads: `ads.js` + `assets/ads/ads_data.js` (madlib parts, see assets/ads/README.md); `S.ad.p` is the progress, the hold button (`S.adHold` / `S.adKey`) fast-forwards by `AD_HOLD_SPEED`. `ADS_ENABLED` is currently **true** in config.js (the intended default may be the normal coin-priced mode, so flip it if you want that). Revive: `revive()` starts a revive ad, and `doRevive()` runs when it ends. GIFs show only their first frame.
- **Give up.** P, then Q (or Backspace, or the button) twice within `GIVE_UP_CONFIRM_MS` ends the run (`askGiveUp` / `giveUpRun` in revive.js).
- **Pacifist and Challenge** are buffs (`S.pacifist`, `S.challenge`). Pacifist: enemies solid and harmless, no weapons, points for recruits/merges/waves, stuck detector (`PACIFIST_STUCK_TICKS`). Challenge: a hit drops all followers, reach `CHALLENGE_WAVE` (20) to call `winRun()` for `CHALLENGE_REWARD` (100).
- **Levelling** (`levels.js`): kills give XP (`LEVEL_XP_KILL`), every level boosts the newest weapon (`weaponPower` in heads.js), every 5 levels `openBranchPick()` pauses and offers a branch (Gatling, Ricochet, Nova, Thunder). The pick screen is reused with `S.branchPicking = true` and `S.pickChoices` holding indexes into `BRANCHES`. Older weapons gain `LEVEL_OLD_SHARE` of a level per level-up. Bullets can have `bounce` / `col` (attacks.js, render.js).
- **Shop** (`shop.js`, `S.shopping`, opened by the Shop button or B on the hero select screen): `SHOP_LOCKED` in config.js locks buffs until bought (`S.buffLv[id]` = level, saved). Gift level = portals per wave; Everything is a bomb level = % chance (`S.bombChance`). Permanent starts: perk `startRandom` (150) unlocks follower rows (200 each); `S.startPick` is the one chosen; `applyPermanentStart()` runs in `startRun`.

## Run it

Open `src/index.html` in a browser. Sprites load from `../assets/images/`, so keep the folder structure. Controls: arrows / WASD / swipe / tap zones (see Touch controls), P or Escape pauses. On the hero select screen, I (or the "i" button) toggles flavour text and stat details, B opens the shop. On the buff screen: 1/2/3 or arrows and Enter pick, R is the mulligan.

The game opens on the hero select screen. Swordsman is free; Magician is locked at 50 coins, Gunman costs 100, and Goliath/Summoner will cost 200. Old saves that already own Gunman retain that unlock.

## Code layout (`src/`, loaded in this order by `index.html`)

| File             | Owns                                                                                   |
| ---------------- | -------------------------------------------------------------------------------------- |
| `config.js`      | All constants and tuning numbers                                                       |
| `sprites.js`     | Shared sprite sheets (`SPRITES`, `HEADS`)                                              |
| `followers.js`   | `FOLLOWERS` (5 base followers + fusions), `newSlot`, `randomFollower` (never a fusion) |
| `state.js`       | The `S` object (all mutable state) and `newRun()`                                      |
| `storage.js`     | Saves best score, best combo, best wave, coins, unlocks, shop levels, retention data   |
| `unlocks.js`     | Click-to-buy unlocks: `isUnlocked`, `tryUnlock`, `heroPrice`                           |
| `audio.js`       | All sound: synthesized placeholder effects and music moods                             |
| `world.js`       | `tileAt`, `tileFree`, `inTextZone`, keys and food presence, `nearestKey`, drop effects |
| `rooms.js`       | Room templates, themes, `buildWorld()`, `roomAt()`                                     |
| `score.js`       | Points, combos, coin rewards and popups                                                |
| `player.js`      | Steering and input queue, `playerMove` (grace, portals, Dev mode), `takeHit`           |
| `attacks.js`     | Attack sheets, sword hit, bullets                                                      |
| `heads.js`       | Hero definitions, weapons, `weaponDamage`, hero-select layout and `chooseHead`         |
| `levels.js`      | XP, levels, weapon branches                                                            |
| `skills.js`      | Follower active skills (mine, bomb, Shogun lightning, Raiden detonate)                 |
| `mines.js`       | Mines, blast shape, detonation, `bombContact`                                          |
| `passives.js`    | Follower passives, `heroSpeed`, Gorgon shields, Medusa freeze and shield               |
| `recruits.js`    | Keys and recruits: summon, walk in, touch, `eatKey`, `shootRecruit`                    |
| `merge.js`       | `mergeCheck`: three identical followers anywhere in the chain fuse; fusion modifiers   |
| `buffs.js`       | `BUFFS`, buff pick layout, third-card unlock, mulligan, `startRun`                     |
| `shop.js`        | The shop, buff levels, permanent starting followers                                    |
| `revive.js`      | Death/revive/game-over flow, give up                                                   |
| `ads.js`         | Fake ads (data in `assets/ads/ads_data.js`, loaded before it)                          |
| `retention.js`   | Pressure, frustration/pity and coin-tier logic                                         |
| `leaderboard.js` | Shared top 10 and initials box                                                         |
| `enemies.js`     | Enemy snakes, AI, damage, eating, enemy move timers, timed waves                       |
| `camera.js`      | `resizeView`, `camTarget`, `updateCamera`, `viewTiles`                                 |
| `scenery.js`     | Floor, wall and terrain tiles, story decor (bones, statues, bonfire...)                |
| `render.js`      | All drawing, including title screen, buff screen, shop, ads and the on-canvas HUD      |
| `input.js`       | Keyboard (with `HELD` keys), touch, swipe/tap zones, mulligan, shop input and pause    |
| `main.js`        | `step()`, `heroStep()`, `loop()` and start-up                                          |

Rules of thumb: tuning numbers go in `config.js`, state goes in `S`, drawing goes in `render.js`. No loose globals. No `import`/`export` modules (they fail from `file://`). Nothing lives outside the two canvases except the initials box on the game-over screen.

## Clocks

There are three independent clocks.

- **Hero clock:** `heroStep` runs on `heroInterval()` = `TICK_MS / heroSpeed()` (250 ms at base speed). Grace and the input queue count hero moves.
- **World tick (125 ms):** `step` advances skills, attacks, recruits, stun countdown, wave timer, combos and the animation frame. All cooldowns and timers in config.js are in world ticks.
- **Enemy clocks:** each enemy moves on its own `enemyInterval(e)` (`stepEnemyTimers`). Speed changes (waves, eating, Medusa) never touch skill timers.

Rendering is separate: the hero uses `S.heroAlpha`, enemies use `e.alpha`, everything else `S.alpha`. The camera follows the hero's interpolated position.

## Rules to preserve

- Heroes attack automatically in the facing direction; steering is aiming.
- Heroes start with **zero followers**.
- A hit removes the tail character; losing the last character kills the run. Glass cannon kills on any hit that lands (shields still absorb).
- Three identical followers anywhere in the chain merge into one distinct fusion.
- Fusion permanent buffs are run-only modifiers stored in `S`.
- Gorgon shields do not recharge. Medusa fusion leaves a one-hit shield: 60 s recharge, 15 s shorter per later merge, minimum 15 s.
- Gunman fires every 16 ticks and gets a front bullet.
- Magician keeps the 3x3 shockwave, charge-based (2 charges, 5 s per charge, fires itself when an enemy is in range).
- Keys remain the recruitment item; eating a key summons a follower rather than directly growing the chain.
- Keysman keeps both its old double-summon chance and the new rule that recruiting a Keysman summons a non-Keysman follower.
- Raiden's remote mine detonation is oldest-first.
- Modifiers such as Dev mode, Pacifist and Glass cannon are legitimate runs; they are scored differently rather than removed from the leaderboard.
- All gameplay text is on the UI canvas at half opacity (`TEXT_ALPHA`), and nothing spawns on a text zone.
- The UI is always a fixed 640x640 square; only the world adapts to the window.
- No info bar. Follower counts and skill bars come back on the canvas if they are missed.

## Heroes and prices

| Hero      | Price / state             |
| --------- | ------------------------- |
| Swordsman | Free                      |
| Magician  | 50 coins; locked at start |
| Gunman    | 100 coins                 |
| Goliath   | 200 coins (not built)     |
| Summoner  | 200 coins (not built)     |

Unlocks are by hero id, not card index. Preserve old Gunman unlocks.

## Buffs

Current pool: Starting follower, +20% score, Thick skin, Quick hands, Combo keeper, Skill haste, Second wind (free revive), Welcome party, Rich, Minefield, Magician's gift, Glass cannon, Dev mode, Everything is a bomb, Pacifist, Challenge. Magician's gift, Everything is a bomb, Pacifist, Challenge, Dev mode, Glass cannon and +20% score are **locked in the shop** (`SHOP_LOCKED`) until bought. Bounty hunter is removed. The pity boost (`startFollower`) stays, because starting with zero followers makes it materially more useful.

Buff screen economy: the third card costs 1 coin to reveal, a mulligan costs 5. Both count toward `S.runSpend`.

Known loose ends: `SECOND_WIND_BONUS`, `COIN_PER_KILL` (not in config any more), `COIN_PER_WAVE`, `REVIVE_COST_*` and `BOUNTY_POINTS` are leftovers of old economies. Delete them when convenient. The Rich buff pays 10% of coins earned at the run's end.

## Economy (as built)

- Coins are scarce.
- A Pentakill pays **5 coins** as a hidden mini-sidequest, once per chain.
- Wave milestones pay coins (`WAVE_COINS`). Bosses are meant to pay more later.
- Fake ads: revives and the hero-select ad button (10, 5, 2, 1 coins, back to 10 after an hour). Dev toggle `ADS_ENABLED`, player toggle "No ads" for 1000 coins.
- Retention coin tiers use coins spent in runs (`S.runSpend` history). **The thresholds in config.js are still the old 0 / 15 / 45 / 90**; the intended ones were about 0 / 5 / 12 / 25.

## Movement and map

The intended movement feel is still unmistakably Snake.

Built: input queue, grace tick, Dev mode stepping, halved base speed, the scrolling camera over a 60x60 world. Still to try: an instant reverse for a one-segment hero and a temporary Ghost Body buff.

Map direction:

- The world is a 3x3 grid of 20x20 rooms. Curated room templates (sketches in templates.md) will be stamped into it, with walls, hazards and forced-path tiles (one-way gates, conveyors, ice, push blocks, crumbling floor, turrets).
- Today there is one hazard (`S.hazard`) and one key lane. Rooms need a **hazard list and a wall grid**, and every spawn must avoid them (`tileFree`, `enemyCanEnter`, enemy and recruit spawns).
- Keep room-snap/Zelda-style framing compatible for later.
- Do not add an edge arrow for keys initially; searching is intentional. A key radius around the hero is the first thing to try if 60x60 is too empty.
- Recruits spawn near the player (just outside the view).

## Waves and enemies

Built: timed waves, enemy cap, enemy move timers, enemies eating keys and recruits, spawning just outside the view.

Still to do:

- Add fast thin snakes, armored heads and spitters in later wave bands.
- Room templates can favour enemy types.
- No new regular snakes during boss fights (`wavesPaused()` is already the hook).

## Goliath and kicking

One kickable-projectile system should support both the mine-kick idea and Goliath.

- Any contact from a non-facing tile hurts him. Front contact is harmless, including walls, hazard and enemy heads. Mines kill him regardless.
- "Back" means the tile behind his head / any direction he is not facing.
- Goliath is 0.75x the halved base speed (the new `HERO_SPEED_MIN` already allows this).
- Food shields, follower walk-in every 5 kicks, fusion reversion on wall kicks and other kick rules depend on the shared kick system.

## Summoner

Tier 4/hard work. Followers become autonomous agents. Normal summons live for 8 s, fusion summons for 5 s (Medusa freezes and chases, for example). Context AI chooses useful behaviour.

## Bosses

**Wave 10: giant snake (build first).** Gridless, swaps head and tail when hit, eats other snakes, no new regular snakes during the fight (set `S.boss` to pause waves). Boss rewards reuse the buff-pick screen. Payouts are tuning targets.

**Wave 20: wizard (build much later).** Teleports, persistent map-wide laser, forcefield pushes the player out, can fire across rooms. Needs the room system first.

## Challenge and Pacifist

**Challenge:** a buff; separate win screen; 100-coin reward; intentionally difficult. Modifier runs stay on the leaderboard with their own scoring multiplier.

**Pacifist:** normal Snake-style avoidance. No combat. Enemies are solid but do not damage you. Score through keys, recruits, merges and waves survived. A stuck detector ends the run.

## Build order

Tiers 1 to 3 and the camera are written (untested). Remaining:

1. **Play-test and fix** everything written so far.
2. **More room tiles** (item 25, partly built): push blocks, bumpers, turrets, crumbling floor and more templates from templates.md; then temporary buff blocks.
3. **Kick physics** (23), then **Goliath** and **Summoner** (24, 26).
4. **Bosses:** wave 10 snake first; wizard much later (27, 28).

## Files likely to change next (more tiles, kick physics)

`rooms.js` (more templates and tile characters), `world.js` (tile rules), `player.js` and `enemies.js` (what each tile does), `attacks.js` (bullets and new tiles), `scenery.js` (drawing), `config.js`. A push-block system would also serve the kickable-projectile work.

## Known gaps and cautions

- Nothing from Tiers 1 to 3 or the camera has been verified in a real browser; they are design targets until play-tested.
- Camera things to check are listed in the "Latest step" section. Also check the leaderboard initials box and the HUD still sit correctly on the UI square, and that the world is hidden or dimmed behind every menu.
- Batch C things to check: hero speed feels right at half; enemies glide smoothly and stun/Medusa still freeze them; a new wave starts while an old snake lives; an enemy eating a key or recruit grows and speeds up; the Miner still drops mines (it only sees the vacated tile on hero moves, now every second tick); the "Next wave" text appears at 10 s left and nothing overlaps it.
- Exact numbers still need play-testing: hero and enemy base speeds, wave durations, `ENEMY_CAP`, eating speed-up, Raiden's per-follower bonus (it may need to be larger than +10% for its cap to matter), modifier score multipliers, boss payouts, ad timing, Pacifist goal, camera view sizes, room templates, kick physics.
- With a 60x60 world, Bomber blasts reach up to 60 tiles and bullets fly across the whole world.
- Small code issues noticed: `HERO_PRICES = {...}` in config.js has no `const` (it works as a global, but add `const`); the TEST ONLY comment is duplicated; `ART_SPEC.md` still says the starting grid is 20x20 (the world is now 60x60 with a 20-tile-wide view); the comment above `MINEFIELD_COUNT` mentions a MINE_MAX of 3 (it is 8).
- Everything is a bomb can hurt the player on key/recruit contact (30%); tune `BOMB_CHANCE` if it feels punishing.
- Old saves must preserve any existing Gunman unlock.
- The daily challenge is parked and should not block the main roadmap.
- The leaderboard currently accepts hobby-game scores without anti-cheat protection.
- The assistant cannot push to git. Files are delivered as edits; the user copies them in and commits.
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

Built the first room system and the rest of the Tier 4 start: new `rooms.js` (templates, themes, `buildWorld`) and `scenery.js` (tile and decor drawing); `world.js` and `enemies.js` rewritten (tile map instead of `S.hazard`, key presence, nearest-key helper, enemy types, walls-aware chasing, spits); `playerMove` now handles walls, gates, conveyors, ice and wall portals; mud slows heroes and enemies; food arrow and Kingsman food presence; story decor per room. Camera and device-shaped view from the session before. Nothing has been run in a browser yet.

Next: play-test everything, then more room tiles (push blocks, bumpers, turrets, crumbling floor), then kick physics.