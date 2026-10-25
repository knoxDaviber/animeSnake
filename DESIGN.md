# animeSnake: Design Doc

Working design notes. Balance is not critical; fun comes first. Get everything fun with plain shapes before adding art.

**Wording:** the playable head is a **hero** everywhere the player can see it.

## Pillars

1. **Quick runs.** A run is a few minutes. Dying and restarting should take one tap.
2. **Roguelike.** Each run starts with choices (hero, buff) and builds a different chain.
3. **The chain is everything.** Composition and merges matter more than raw reflexes.
4. **One more run.** Systems are tuned to keep players coming back (see Retention).

## Core loop

Pick a hero and a starting buff, steer the chain around the world, eat keys, recruit characters, merge them, fight enemy snakes in waves, die (or revive through the ad system), bank coins and score, repeat.

## Controls

- Desktop: arrows or WASD.
- Phone: swipe, or tap. The screen is split into four zones by an X (top, bottom, left, right); a tap steers toward its zone. The X is centred below the middle (`TAP_CENTER_Y`, 0.62 of the height) so a thumb near the bottom reaches every direction. A tap anywhere in the window counts, also outside the square UI area. Taps give no on-screen feedback. A tap that turns into a swipe is a swipe. A tap that only resumes from pause does not steer.
- Movement-feel fixes (built): a two-entry input buffer and a configurable 0/1-tick coyote/grace window (`GRACE_TICKS`) for moves that would otherwise hit a wall or body. These soften trapping without removing the snake feel.
- A reverse action may be tested later for one-segment heroes; the broader enemy U-turn behaviour remains separate.
- Page text is not selectable, so long-presses never pop up menus. The initials box stays typable.

## On-screen text and UI

The game is the main attraction, so there is **no info bar and nothing outside the canvases** (the initials box on the game-over screen is the only exception).

- There are two canvases. The world canvas fills the window and is moved by the camera. The UI canvas is a 640x640 square centred on top and holds the HUD, the menus and all overlays. On a wide or tall screen the world shows around the square; menus and overlays dim or hide the world behind them.
- All gameplay text is drawn on the UI canvas at `TEXT_ALPHA` (half opacity): score, combo, "N to beat best", wave, coins, and level.
- The **next-wave timer** ("Next wave 7s") appears under the wave number only when `WAVE_SHOW_MS` (10 s) or less is left before the next wave, in the same faded style. It is hidden otherwise and while a boss pauses the waves.
- Nothing spawns on the tiles where static text sits (`TEXT_ZONES`). The zones are screen areas, so a tile is checked relative to where the camera is looking.
- Instructions live only on the hero select screen and stay short.
- Follower counts and skill cooldown bars are no longer shown anywhere. If they are missed in play-testing, bring them back on the canvas at the same opacity rather than as a separate bar.
- Possible later change: with the world showing around the square, the HUD could move to the window corners.

## The chain

- The snake is a chain of anime characters following each other on a grid. Slot 0 is the hero, every other slot is a follower.
- **Rings:** a hit drops one character (the tail). You die when none are left. Walls, the hazard, enemy snakes, your own body and mine blasts all count as hits. The snake stays put on a blocked move, and after a hit it is invulnerable for 8 ticks (the chain blinks). A hit absorbed by a shield (the Swordsman's block or a Gorgon's shield) does not blink.
- **Tail stall:** moving into your own tail tile is not a hit. The snake just stops and waits until you choose a direction, which gives enemy snakes time to chase you.
- **Merging:** three identical followers **anywhere in the chain** (no need to be side by side) merge into one **fusion follower**. A fusion is a completely different character with different abilities, not a stronger copy, and it counts as one character, so a merge costs you 2 characters. Fusions are killed like any follower and cannot merge again. Different merges make different fusions.
- Heroes start with **no followers** (`START_FOLLOWERS = []`). A lone hero therefore has one life. The Starting follower buff and pity boost are deliberately more valuable as a result.

## Heroes

| Hero      | Weapon                                                                                                     | Passive                                                                          |
| --------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Swordsman | Sword on the tile ahead, 3 damage, about once a second (tunable)                                           | Blocks the first enemy-head hit, recharges after 5 s                             |
| Magician  | 3x3 shockwave, charge-based (2 charges, 5 s per charge, fires by itself when an enemy is in range)         | Walls open a portal to the other side of the world                               |
| Gunman    | A bullet out of each side every 16 ticks, plus a front bullet                                              | None yet                                                                         |
| Goliath   | No normal follower body; the player protects him by facing threats (planned)                               | Back/side contacts hurt; front contact is harmless under the Goliath rules below |
| Summoner  | Planned autonomous-follower hero; summons and fusion summons have timed lifetimes and context AI           | Planned                                                                          |

### Hero unlocks

- Swordsman is free.
- Magician starts locked and costs 50 coins.
- Gunman costs 100 coins.
- Goliath and Summoner cost 200 coins.
- Unlocks are saved by hero id. Old saves that already own Gunman keep it; an old save that does not own it follows the new price/lock rule.

### Goliath

Goliath is tied to the kickable-projectile system.

- Anything that touches Goliath from a tile other than the one he faces hurts him.
- A hit from the front is harmless, including walls, the hazard and enemy heads.
- Mines kill him regardless of facing.
- The intended rule is "he is looking at the thing that hit him", not a literal follower-defined back.
- Because a lone hero has no body to reverse into, an instant reverse can be allowed when the chain is one segment long.
- Goliath moves at **0.75x** the halved base speed (the lowered `HERO_SPEED_MIN` already allows this).
- His merged-follower walking rule, food shields, wall-kick fusion reversion and every-5-kicks merge behaviour depend on the kickable-projectile system.

## Followers and fusions

Followers form the body and give passives, and some have active skills.

| Follower | Now                                                             | Fusion                                                                                                                                                                    |
| -------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Miner    | +1 mine blast arm length each; mine every 8 s each, max 5 mines | **Bomber**: blast reaches the whole row and column of the mine; mine every 5 s; fusion gives +1 max mine as a permanent run modifier                                      |
| Keysman  | +10% each (max 50%) that a key summons 2 characters             | **Kingsman**: Keysman are 40% likelier to be summoned; fusion leaves +1 food presence for the run                                                                                             |
| Magneto  | Pulls keys up to 4 tiles; enemies chase you more               | **Mr.X**: eats keys within 3x3 of your hero; recruits are rejected and shot at the nearest snake for 2-5 damage                                                           |
| Raiden   | +10% hero speed each (max +50%); every 10 s sets off your oldest mine | **Raiden Shogun**: +30% hero speed, every 5 s 1-3 lightning damage to the closest enemy tile; fusion gives +10% speed as a permanent run modifier                  |
| Gorgon   | 1-hit shield each (max 5, no recharge); slows the hero 5% each (max 50%) | **Medusa**: enemy heads in the line you face freeze, any head you touch dies at once; hero slowed 10%; fusion gives a 60 s shield with a shorter cooldown on later merges |

**Fusion permanent buffs:** Bomber +1 max mines, Kingsman +1 damage and +1 food presence, Shogun +10% speed, and Medusa's 60 s shield/shorter later cooldown are **run modifiers** stored in `S`. They persist for the current run, not across runs.

**Keysman overlap:** the rule is that recruiting a Keysman summons a non-Keysman follower. The existing "+10% double summon" passive stays for now. Both remain unless play-testing shows that the overlap is too strong.

Speed and slowdown change the hero only, not enemies or skill timers.

## Recruitment

- The old food is a **key**: eating it no longer grows the chain. You grow by recruiting a character, which needs a key plus a character.
- Eating a key summons a random follower (never a fusion). It starts just outside your **view**, walks in, then jumps on the spot. The hero can recruit it from the moment it is on the grid, walking or jumping.
- **Enemy snakes can eat keys and recruits** (see Enemies). If a character is eaten before you reach it, or an enemy eats the key first, that key is wasted.
- Up to 3 can wait at once. A new key drops once every key is gone and fewer than 3 characters wait.
- **Food presence:** `KEY_PRESENCE` (3) keys lie on the map at once, topped up every tick (unless 3 characters already wait). A Kingsman fusion adds 1 more for the rest of the run. New keys appear at least 8 tiles from the hero, half of them on a room's key spots. An arrow around the hero points to the nearest key (it hides when the key is closer than 5 tiles). Later, each character may need its own key.

## Speed and clocks

Built in Batch C.

- **Hero speed is halved.** `HERO_BASE_SPEED = 0.5`. At base speed the hero moves one tile every 250 ms. Modifiers (Raiden +10% each, Shogun +30%, Gorgon -5%, Medusa -10%, fusion speed bonus) multiply the base. `HERO_SPEED_MAX` is 2 and `HERO_SPEED_MIN` is 0.15, both in the old-speed scale.
- **Enemies have their own move timers**, separate from the world tick, using the same base speed (`ENEMY_BASE_SPEED = 0.5`). Each enemy has its own speed multiplier.
- **Enemy speed-ups:** +2% per wave after the first (capped at +40%, `enemyWaveSpeed`), and +10% for each key or recruit it eats (total multiplier capped at x1.8).
- **The world tick stays 125 ms.** Skills, attacks, cooldowns, combos, stun and the wave timer are all counted in world ticks and are unaffected by speed changes.
- **Stun** counts in world ticks. A stunned enemy moves again the moment the stun ends, so a stun or a Medusa freeze lasts as long in real time as before the rework.
- Speed changes the hero only unless an explicit enemy-speed rule says otherwise.
- Open tuning point: Raiden's per-follower bonus may need to be larger than +10% for its cap to matter at the new base speed.

## Combat

- **Only the hero attacks** for now. Attacks fire in the facing direction, automatically, on a timer. Steering is aiming.
- **Attacks are their own objects with their own sprite sheets**, drawn on top of the grid and snakes.
- Attacks hit **enemy snakes only**.
- **Mines:** explode when any snake head steps on one. The blast is a plus shape; arm length grows with Miners, and a Bomber makes it reach the world edge. Careful: it hurts you too if you stand in line with it.
- **Kickable projectiles:** one kickable-projectile system will serve both the old mine-kick idea and Goliath. The exact kick physics are part of Tier 4.
- Hitting an enemy segment breaks it and cuts off everything behind it. Hitting its head costs hit points; at zero the whole snake dies.
- **Head-on collision:** both snakes take damage, short stun.

### Enemies

- Enemies chase the hero, never reverse, and flip around if boxed in. Chase chance grows with Magneto and high-score pressure.
- **Eating:** an enemy that steps on a key or a recruit removes it, grows by one segment (up to 10) and gets 10% faster. A chasing enemy also heads for a key within 4 tiles (and for a recruit within 6, as before).
- Spawned snakes start in a straight line just outside the camera view, heading inward, at least 6 tiles from your hero and never on a text zone. A side that falls outside the world is skipped.

### Enemy head toughness

| Waves | Hits |
| ----- | ---- |
| 1-5   | 1    |
| 6-9   | 2    |
| 10-13 | 3    |
| 14-17 | 4    |
| 18+   | 5    |

### Enemy types

Built (untested): **fast** (wave 4+, thin, quick, shorter), **armored** (wave 7+, double hit points, steel outline) and **spitter** (wave 10+, spits an orb along a row or column when lined up with you). A special type is picked about 45% of the time once one is unlocked, and a room can favour one type while you are in it (gauntlet and keep: armored; garden and mill: fast; chapel and barracks: spitter). Chasing enemies path around walls. Planned enemy variants are introduced in wave bands:

- Fast thin snakes.
- Armored heads.
- Spitters that fire back.
- Room templates can favour certain types.

## Waves and bosses

### Timed waves (built)

The wave timer counts down on its own, so a new wave starts even if the last one is still alive.

- About 10 seconds at wave 1, about 30 seconds at wave 10, and about 60 seconds from wave 20 (`waveDuration`, in world ticks). The first wave comes after 3 seconds.
- **Early clear:** if the field is completely clear (nothing alive, nothing waiting to spawn), the timer jumps ahead to 2 seconds (`WAVE_CLEAR_SKIP`, 0 turns it off). Good players are not left waiting, and the cleared-wave sound still plays.
- **Cap:** at most 6 enemies are alive at once (`ENEMY_CAP`). Extra spawns wait in a queue of at most 8 (`ENEMY_QUEUE_MAX`) and walk in as space frees up.
- Wave size is `waveSize` plus the high-score-pressure extra snake.
- **Boss hook:** while a boss fight is running (`S.boss` set), the wave timer is paused and no regular snakes spawn (`wavesPaused()`).
- The player sees the timer only in the last 10 seconds (see On-screen text).

### Wave 10 boss: giant snake

The first boss is a **gridless giant snake**.

- It swaps head and tail when hit.
- It eats other snakes.
- New regular snakes do not arrive during the boss fight.
- Its growth from eating is therefore naturally bounded by the snakes already alive; any additional cap can be tuned if needed.
- The boss is the first boss to build. The wave 20 wizard is deliberately much later.

### Wave 20 wizard

The wizard is not part of the first boss implementation. It comes after the room work.

Planned abilities:

- Teleporting.
- A persistent map-wide laser.
- A forcefield that pushes the player out.
- Firing across rooms.

The wizard should become scarier because the player cannot see the entire map at once.

## World, camera and rooms

### Scrolling camera (built, untested)

- The world is **60x60 tiles** (`COLS` and `ROWS` mean the world size). The hero starts in the middle.
- The camera follows the hero's smoothed position (`CAM_SMOOTH_MS`), never shows outside the world, and snaps after a portal or a revive.
- **The view adapts to the device.** The window's short side shows `VIEW_SHORT_TILES` (20) tiles, and the long side never more than `VIEW_LONG_MAX_TILES` (32), whichever zooms in more. A desktop window shows about 32x18 tiles, a phone held upright about 16x32.
- The world is drawn on its own canvas behind the 640x640 UI square. The world floor has a faint grid (`GRID_ALPHA`) so scrolling is visible and a wall frame at the world edge.
- Enemies and recruits come in from just outside the view, so they arrive near you. Text-zone spawn exclusions are camera-relative.
- A faint edge arrow for nearby keys is intentionally **not** included initially; searching is part of the intended tension.
- A larger map is also a trapping-feel solution: the player can no longer see the entire field, so finding food and tracking threats takes more work. With enemies eating keys, key races between you and the enemies are more interesting.
- The 60x60 world is now built from rooms (see below), with three keys on the map and an arrow to the nearest one.

### Room snap later

Room-snap/Zelda-style framing remains a possible presentation layer over the same world:

|             | Scrolling camera               | Room snap                         |
| ----------- | ------------------------------ | --------------------------------- |
| Feel        | Smooth, always centered on you | Screen flips as you cross an edge |
| Hidden info | Edges cut off                  | Whole other rooms hidden          |
| Wizard      | Fires from off-screen          | Fires from another room           |
| Cost        | Built                          | Needs doorways and room logic     |

The preferred sequence is scrolling camera first (done), then room-snap behaviour if it adds enough value. Room and hazard templates are compatible with both.

### Rooms, walls and hazards

Curated rooms are preferred over purely procedural floors.

- The 60x60 world is a **3x3 grid of 20x20 rooms**. A room is a template (20 rows of 20 characters) plus tags (difficulty tier, favoured enemy types, key count, doors).
- Every room has openings in the middle of each connecting side (columns 9-10 on top/bottom, rows 9-10 left/right).
- Wall types and hazard templates are part of the same structural change, along with forced-path tiles: one-way gates, conveyors, ice, bumpers, push blocks, crumbling floor and turrets.
- Enemies and recruits must cross room boundaries.
- The wizard's cross-room attacks depend on this support.
- **Sample templates are in [templates.md](templates.md)**: eleven sketches (a one-way ring, spike garden, conveyor river, push-block vault, bumper pinball, serpentine, crumbling bridges, turret alley, ice rink, moat keep, enemy nest) with a legend, design rules and further ideas. Rule of thumb: no width-1 dead ends and always a way out.
- **Built (untested):** `rooms.js` stamps eight templates (start room, ruins, gauntlet, garden, mill, chapel, keep, barracks) with random rotation and mirroring, using these tiles: walls, hazards, mud, conveyors, one-way gates, ice and key spots. The tile map is `S.map`; `S.hazard` is gone. Not built yet: push blocks, bumpers, turrets, crumbling floor and the serpentine.
- **Story decor (Dark Souls style, no words):** each room's floor, colours and small props tell what happened here. The start room is a cold hearth (a dead bonfire with a sword in the ash, an empty helm, a trail of bones crawling to the north door). The gauntlet has headless knights and a fallen one in front of every gate. The garden has a skeleton who sat down with a wilted flower. The mill has a broken wheel and a current that drags things toward spikes. The chapel has a frozen kneeling congregation. The keep has a dead king on his throne and cut drawbridge chains. The barracks has soldiers who never left their beds. Props are drawn from shapes in `scenery.js`, so real art can replace them later.

## Temporary buffs

Enemy snakes can drop temporary buff blocks when they die. They are deliberately short-lived and shown as icons with timer bars (on the canvas, in the same faded style).

Candidate drops:

- **Ghost body:** about 8 s; followers do not collide with your own head, while enemies and walls still do. This is a temporary test of the anti-trapping idea without removing the snake identity.
- **Haste:** short speed boost.
- **Magnet:** short key pull.
- **Bubble:** absorbs one hit.
- **Frenzy:** halves weapon cooldown.

Enemy types may have preferred drops, such as an armored snake dropping Bubble.

## Buffs

The buff pool:

- Starting follower, +20% score, Thick skin, Quick hands, Combo keeper, Skill haste, Welcome party, Minefield.
- Second wind: a free revive.
- Rich: 10% more coins at the end of the run.
- Flag modifiers: Magician's gift, Glass cannon, Dev mode (one WASD step per press), Everything is a bomb.
- Mode buffs: Pacifist and Challenge (see below).
- Bounty hunter is removed.
- Some buffs are **locked in the shop** (`SHOP_LOCKED` in config.js) and only join the pool once bought. Magician's gift and Everything is a bomb can be bought at higher levels.

The pity boost still matters because heroes start with no followers.

### Buff screen economy

- 1 coin unlocks the third card.
- 5 coins buys a mulligan.

## Score and coins

- Kills, keys and cut segments give points. Kill points are 20 x the combo count, capped at x5. A kill must land within 3 seconds of the last one.
- **Combo coins are a hidden side quest.** A chain can earn up to 5 extra coins for a Pentakill (once per chain). Ordinary kills do not pay coins. Players who read the docs can deliberately chase it.
- The economy is intentionally scarce. Wave milestones pay coins (`WAVE_COINS`: wave 5, 10, 15, 20), and bosses are meant to pay more (about 10 coins at wave 10 and 20 at wave 20 are tuning targets).
- Challenge's 100-coin reward is intentionally hard relative to the 50/100/200 hero prices. It can be made harder later if necessary.
- Coins are kept between runs and are used for hero unlocks, buff-screen choices, shop items and the "No ads" toggle.

### Ads and revives

- A revive is offered through a joke fake-ad screen (`ADS_ENABLED` in config.js). Ads are madlib products from `assets/ads/ads_data.js`; there is no tracking and nothing is real.
- The ad is a fast-forward-but-not-skip overlay: hold the button to make it 4x faster. It should feel like waiting, not like leaving the game.
- The hero-select screen has an ad button with payouts of 10, 5, 2, then 1 coins, returning to 10 after an hour.
- There is a dev-side toggle for the ad system and a 1000-coin player toggle ("No ads").
- With ads off, a revive is instant and free. Second wind is always a free instant revive.
- Possible: the shop sells nothing for real money. If real-money purchases are ever considered, revisit `retention.js` first.

## Retention

### High-score pressure

Pressure ramps from the player's best score and makes enemies more demanding near a personal best. The exact values are in `config.js`.

### Frustration meter

The frustration meter and pity boost stay. The pity boost is more valuable because a normal run starts with zero followers.

### Coin tiers

Coin rewards are multiplied by a tier based on **coins spent during runs** (the 1-coin third card and 5-coin mulligans, plus any revive cost). The principle:

> Players who use more coins in runs earn more coins later; players who spend little earn less.

`config.js` still has the old thresholds (0 / 15 / 45 / 90). The intended thresholds are about 0 / 5 / 12 / 25 coins spent over the last five runs. Tune them once play-testing shows how much players really spend.

## Challenge and Pacifist

Both are normal run-start buffs.

### Pacifist

A normal Snake-style avoidance mode rather than a combat gimmick.

- Enemies cannot hurt you and you cannot hurt them.
- Enemies remain solid, so touching one behaves like a tail stall.
- Walls, the hazard, mines and your own body still matter.
- Weapons and follower attacks are disabled.
- Score comes from keys, recruits (15), merges (50) and waves survived (25).
- A stuck detector ends the run after 20 s without a real move.
- The exact win/score target can be tuned after play-testing.

### Challenge

- Any hit costs **all** your followers. Reach wave 20 to win.
- Win screen "Challenge complete!" with a **100 coin** reward, deliberately difficult. It can be scaled harder later.
- Challenge/modifier runs stay part of the normal game and the leaderboard.

## Modifier runs and leaderboard

Dev mode, Pacifist, Glass cannon and other modifiers are legitimate runs, not excluded runs.

- They remain in the buff/modifier pool.
- Their scoring uses `S.scoreMult` (the multipliers are guesses, tune them).
- Different modifiers should have their own score multipliers so the leaderboard can compare runs honestly.
- A modifier does not invalidate a run; it changes how that run is scored.

## Hero levelling (built, untested)

- Kills give XP (`LEVEL_XP_KILL`); every level makes the newest weapon 15% stronger and a bit faster.
- Every 5 levels the game pauses and offers a weapon branch: **Gatling** (rapid bullets), **Ricochet** (bouncing heavy shot), **Nova** (blast around you), **Thunder** (lightning on the nearest enemies).
- A new branch weapon gets the full boost each level; older weapons keep growing at 30% of that.
- The pick screen is reused. Pacifist has no levelling.

## Title screen and shop

The title screen **is** the hero select screen.

- The game opens on it, and so does every new run (death, revive countdown, game-over screen, tap, hero select).
- The only title element is the game name, floating at the top: "animeSnake", or "Snake-lite" about half the time.
- A Minecraft-style splash line (a random joke, or a dig at the player or the dev) sits tilted beside it.
- Up to 3 heroes show as big cards. 4 to 8 show as a compact grid, with the focused hero's description under it.
- Hero cards get a **detail toggle** (the "i" button or the I key). The old stat text is the `detail` field; flavour text is the default view.
- Buttons on the screen: mute, detail, Shop, watch an ad, No ads.
- **The shop** (Shop button or B) is a scrolling list. Run buffs that start locked (with levels for Magician's gift and Everything is a bomb), and permanent starts: "Start with a random follower" (150 coins), then each base follower (200 coins) with one selectable as a permanent starter. `unlocks.js` handles the unlocks generically.
- Later sections such as Followers and Upgrades can reuse the same unlock architecture.

## Build order

### Tier 1: config and text only (done)

1. Magician locked at the start; new prices: Magician 50, Gunman 100, Goliath 200, Summoner 200. Old saves that already own Gunman keep it.
2. Buff cleanup: remove Bounty hunter, rename Extra follower to Starting follower, score buff to +20%, add Rich.
3. Heroes start with no followers (`START_FOLLOWERS = []`).
4. Gunman fires every 16 ticks and adds a front bullet.
5. Gorgon shields stop recharging.
6. Game-over mock line for a zero score.
7. Detail toggle on hero cards.
8. Raise `HERO_SPEED_MAX` to 2.0 and lower `HERO_SPEED_MIN`.

### Tier 2: small logic (done)

9. Movement-feel fixes: two-entry input buffer and configurable coyote/grace tick.
10. Fusion permanent buffs (run modifiers in `S`).
11. Raiden detonates mines remotely every 10 s, oldest first.
12. Keysman recruiting one summons a non-Keysman follower; keep the existing +10% double-summon chance for now.
13. Magician keeps the 3x3 shockwave, now charge-based.
14. Mostly-flag buffs: Magician's gift, Second wind, Glass cannon, Dev mode, Everything is a bomb.
15. Buff screen: 1 coin for the third card, 5 coins for a mulligan.

### Tier 3: medium

Done (all written, untested):

16. Pacifist and Challenge.
17. Speed rework: halved base speed, enemy move timers, wave scaling and eating speed-ups.
18. Timed waves with a cap and a boss pause hook; the next-wave timer on the canvas.
19. Enemies eat keys and recruits.
20. Economy rework: scarce coins, Pentakill, fake ads for revives, hero-select ad button, "No ads" toggle.
21. Hero levelling with weapon branches.
22. Title-screen shop.
- **Scrolling camera** over a 60x60 world, with a view that adapts to the device shape (first part of 25).

### Tier 4: large

23. Mine and recruit kicking. One kickable-projectile system serves both the old mine-kick idea and Goliath.
24. Goliath: back-hit rule, food shields, merged followers walking in every 5 kicks, wall kicks reverting fusions and 0.75x speed all depend on item 23.
25. Rooms, wall types and hazard templates (see templates.md). The camera part is done. Curated rooms are preferred. Enemies and recruits must cross room boundaries.
26. Summoner: followers become autonomous agents with 8 s lifetimes and context AI; fusion summons run for 5 s (Medusa freezes and chases, for example).

### Tier 5: hardest

27. Wave 10 boss: gridless giant snake that swaps head and tail when hit and eats other snakes.
28. Wave 20 wizard: teleporting, persistent map-wide laser, forcefield that pushes the player out, and firing across rooms. It needs room support first and is intentionally much later.

## Suggested implementation sequence

1. **Play-test** everything written so far (Tiers 1 to 3 and the camera) and fix what breaks.
2. **Map depth:** the room system from templates.md (hazard list, wall grid, tile rules), more keys and hazards per world, enemy types, temporary buff blocks.
3. **Kick physics:** build the shared kickable-projectile system.
4. **New heroes:** Goliath, then Summoner.
5. **Bosses:** wave 10 snake first; wizard much later after the room foundation.

## Problems and resolutions

- **Coins:** the old per-kill/wave coin stream was too generous. Pentakill is a side quest capped at 5 coins, while milestones/bosses provide the main economy.
- **Retention coin tiers:** they stay; their input changed from revive coins spent to coins spent in runs.
- **Timed waves plus boss:** no new snakes arrive during boss waves, and the timer pauses. The boss eats only the existing enemies.
- **Timed waves with a clear field:** a long wave timer would leave a good player idle, so a cleared field skips ahead to 2 s.
- **Challenge reward:** 100 coins is intentionally a hard reward relative to the hero prices.
- **Modifier leaderboard:** modifiers remain on the leaderboard and are scored differently rather than excluded.
- **Trapping feeling:** larger maps reduce total visibility and make food/threat searching harder. Temporary Ghost Body buffs can reduce self-trapping without permanently removing the snake feel. Input buffering and coyote ticks are cheap experiments. Halved speed should also improve reaction time.
- **Info bar:** removed to keep the game the main attraction. Follower counts and skill bars are not shown for now; if they are missed, they come back on the canvas.
- **Empty world:** 60x60 with one key and one hazard feels empty. Fix with more keys and hazards, a key radius, and then rooms.
- **Different screen shapes:** the UI stays a fixed 640x640 square (so every menu keeps its layout), and only the world adapts to the window.

## Brainstorm additions

- Boss reward: relic or buff pick after each boss, reusing the existing pick screen.
- Enemy types: fast thin snakes, armored heads and spitters, introduced in wave bands; room templates can favour enemy types.
- Joke ads: absurd fake products, fully fake and with no tracking.
- Room ideas: see templates.md (one-way gates, conveyors, ice, push blocks, bumpers, crumbling floor, turrets, soft blocks, darkness, moving walls).
- Daily challenge: a seeded run on the existing Supabase board. This is parked as a low-priority idea.

## Open questions / tuning notes

1. **Speed:** 2.0x max is relative to the old speed range; the new base is half the old base. Raiden's bonus may need to be larger than +10%.
2. **Goliath back:** the tile behind his head / any non-facing contact is the damaging side.
3. **Fusion buffs:** permanent for the current run, not across runs.
4. **Pacifist:** normal Snake-style avoidance; avoid everything while scoring through keys, recruits, merges and waves.
5. **Keysman:** both the new non-Keysman recruit summon and the old double-summon chance stay for now.
6. **Enemy eating:** growth cap (10), speed-up (+10%, max x1.8) and the key-hunt distance (4) are first guesses.
7. **Camera:** the view sizes (20 short side, 32 long side), the follow smoothing and whether the HUD should move to the window corners all need play-testing. A one-tile-per-step snake on a very wide window may want a lower long-side limit.
8. Exact Pacifist score target, ad timings, boss payouts, speed bonus values, wave durations, enemy cap, modifier score multipliers, room templates and kick physics still need play-testing/tuning.

## Current status

The prototype has the core Snake loop, recruitment, merging, three heroes, five follower families, buffs, a scarce-coin economy with joke-ad revives, Pacifist and Challenge, hero levelling, a shop, retention hooks, title-screen hero selection, touch controls, audio placeholders and the basic leaderboard. Batch C added halved hero speed, enemy move timers, timed waves with a cap, and enemies that eat keys and recruits. The latest step is the scrolling camera over a 60x60 world with a view that adapts to the device. None of the Tier 1 to 3 work or the camera has been play-tested yet. The next work is play-testing, then the room system; kick physics, Goliath, Summoner and the later bosses are not built yet.