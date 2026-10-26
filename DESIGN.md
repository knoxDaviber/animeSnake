# animeSnake: Design Doc

Working design notes. Balance is not critical; fun comes first. Get everything fun with plain shapes before adding art.

**Wording:** the playable head is a **hero** everywhere the player can see it.

## Pillars

1. **Quick runs.** A run is a few minutes. Dying and restarting should take one tap.
2. **Roguelike.** Each run starts with choices (hero, buff) and builds a different chain.
3. **The chain is everything.** Composition and merges matter more than raw reflexes.
4. **One more run.** Systems are tuned to keep players coming back (see Retention).

**A test for new ideas:** each hero should *break one snake rule* (Magician: walls stop you. Goliath: the head is the weak point. Summoner: followers are your lives). A new hero that only changes the weapon is probably not worth building. And prefer improving existing content over adding new content: the prototype already has more than its basic loop has been tuned for.

## Core loop

Pick a hero and a starting buff, steer the chain around the world, eat keys, recruit characters, merge them, fight enemy snakes in waves (and the wave 10 boss), collect temporary buffs from dead snakes, die (or revive through the ad system), bank coins and score, repeat.

## Controls

- Desktop: arrows or WASD.
- Phone: swipe, or tap. The screen is split into four zones by an X (top, bottom, left, right); a tap steers toward its zone. The X is centred below the middle (`TAP_CENTER_Y`, 0.62 of the height) so a thumb near the bottom reaches every direction. A tap anywhere in the window counts, also outside the square UI area. Taps give no on-screen feedback. A tap that turns into a swipe is a swipe. A tap that only resumes from pause does not steer.
- Movement-feel fixes (built): a two-entry input buffer and a configurable 0/1-tick coyote/grace window (`GRACE_TICKS`) for moves that would otherwise hit a wall or body.
- **Reversing:** there is no instant reverse, except that **every hero can reverse when alone** (the chain has no followers). Any follower tail blocks it. (Built.)
- Page text is not selectable, so long-presses never pop up menus. The initials box stays typable.

## On-screen text and UI

The game is the main attraction, so there is **no info bar and nothing outside the canvases** (the initials box on the game-over screen is the only exception).

- There are two canvases. The world canvas fills the window and is moved by the camera; it also carries the in-game HUD. The UI canvas is a 640x640 square centred on top and holds the menus and overlays. Menus and overlays dim or hide the world behind them.
- All gameplay text is drawn at `TEXT_ALPHA` (half opacity). The **HUD sits in the window corners** (hud.js): score, combo and "N to beat best" top left, wave (and the boss bar under it) top centre, coins top right, buff and timer chips bottom left. A small level bar sits under the hero, and an arrow halfway between the hero and the window edge points to the nearest key.
- The **next-wave timer** appears under the wave number only when `WAVE_SHOW_MS` (10 s) or less is left. It is hidden otherwise and while a boss pauses the waves.
- Nothing spawns on the tiles where static text sits (`TEXT_ZONES`).
- Instructions live only on the hero select screen and stay short.
- Follower counts and skill cooldown bars are not shown anywhere. If they are missed in play-testing, bring them back as chips in the same faded style.

## The chain

- The snake is a chain of anime characters following each other on a grid. Slot 0 is the hero, every other slot is a follower.
- **Rings:** a hit drops one character (the tail). You die when none are left. Walls, hazards, enemy snakes, your own body and mine blasts all count as hits. The snake stays put on a blocked move, and after a hit it is invulnerable for 8 ticks (the chain blinks). A hit absorbed by a shield (the Swordsman's block, a Gorgon's shield, a Bubble, Goliath's key shield) does not blink.
- **Tail stall:** moving into your own tail tile is not a hit. The snake just stops and waits until you choose a direction.
- **Merging:** three identical followers **anywhere in the chain** merge into one **fusion follower**. A fusion is a completely different character with different abilities, not a stronger copy, and it counts as one character, so a merge costs you 2 characters. Fusions are killed like any follower and cannot merge again.
- Heroes start with **no followers** (`START_FOLLOWERS = []`). A lone hero has one life. The Starting follower buff and pity boost are deliberately more valuable as a result.

## Heroes

| Hero      | Weapon                                                                                                     | Passive / rule broken                                                                    |
| --------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Swordsman | Sword on the tile ahead, 3 damage, about once a second (tunable); strikes twice from level 10              | Blocks the first enemy-head hit, recharges after 5 s                                     |
| Magician  | 3x3 shockwave, charge-based (2 charges, 5 s per charge, fires by itself when an enemy is in range)         | Walls open a portal through the wall to the first open tile (up to 8 tiles thick)        |
| Gunman    | A bullet out of each side every 16 ticks, plus a front bullet                                              | None yet                                                                                 |
| Goliath   | A swipe across the 3 tiles in front every 2 s (6 tiles from level 10)                                     | Hurt only from behind (rework planned); kicks things; cannot recruit, keys give shields  |
| Summoner  | Releases a spirit every 5 s (first version written; redesign decided)                                      | Spends followers to call upgraded spirits; gains their permanent buffs (planned)         |

### Hero unlocks

- Swordsman is free. Magician 50 coins, Gunman 100, Goliath 200, Summoner 200.
- Unlocks are saved by hero id. Old saves that already own Gunman keep it.

### Goliath

Goliath is tied to the kickable-projectile system (`kicks.js`, built).

**Built now:**
- Hurt only from behind: a touch from the front or either side is harmless, including walls, hazards, gates, enemy heads and spit orbs; he headbutts enemy heads for 1.
- Mines hurt him regardless of facing.
- **He cannot recruit followers.** Eating a key gives him a one-hit **shield** instead (max 3, no recharge). This is his trade-off: no growing chain, but protection. His chain still grows from the kick reward and from starting-follower buffs.
- An instant reverse is allowed when he is alone, like every hero.
- Moves at 0.75x the halved base speed. Every 5 kicks a random fusion follower joins his chain.

**Why it needs a rework (found by reading the code):** because walls and hazards in front are harmless and enemies almost never reach his back (when he has followers, the tile behind his head is his own body), only mines and spit orbs actually hurt him. He is close to invulnerable.

**Planned rework:**
- **Front-only invulnerability.** Sides and back hurt. Walls and hazards cost a ring again.
- **Fixed bombs:** bomb pedestals placed by room templates that regenerate on a timer. Goliath can kick them into enemies; enemies can set them off next to him. This restores the original idea that he is very weak to explosions, which a thin map of random mines no longer delivers.
- **Kamikaze snakes:** an enemy type that hunts mines and bombs and sets them off near the hero. It also gives the map a threat that comes at his sides.
- Not built: wall kicks that turn a fusion back into base followers.

### Summoner (decided, not yet built as designed)

Rule broken: followers are lives. He **spends** them.

- Needs followers to summon. Every 5 seconds the **tail follower is spent** and released as a **spirit**. Spending the last follower is allowed; the hero stays, so he only dies when he is hit.
- The spirit is the **upgraded (fusion) version** of the follower: Miner becomes Bomber, Keysman Kingsman, Magneto Mr.X, Raiden Raiden Shogun, Gorgon Medusa. A tail that is already a fusion is released as itself.
- Spirits act on **context** and **vanish after 5 seconds**:
  - Bomber: lays mines when an enemy is near.
  - Kingsman: fetches keys and an extra summon.
  - Mr.X: shoots the nearest enemy for 2-5.
  - Raiden Shogun: fast, strikes the nearest enemy with lightning.
  - Medusa: chases enemy heads, freezes any in its lines, and kills one it touches.
- **He gains the fusion's permanent run modifier each time he releases one** (Bomber +1 max mine, Kingsman +1 damage and +1 key, Shogun +10% hero speed, Medusa a shield). So he skips merging and can become very strong, very fast.
- **Balance:** the cost is the follower itself. With few followers he lives on one or two lives and any hit is dangerous. Open question: the modifiers stack without limit, so consider a cap per fusion type.
- Spirits never crit the boss (see Boss).
- **Status:** a first version is written: it copies a random follower of any kind, keeps the chain intact and uses base-follower behaviours. The redesign above replaces it.

### Necromancer (parked idea)

Rule broken: dead is dead. Too close to the Summoner if it only revives dead followers.
- Best option so far: **dead enemy snakes rise as his minions** for a short time. Different fuel (kills instead of keys), reuses enemy sprites, bounded by the enemy cap.
- Alternatives: revive the followers you lost to hits (overlaps the Summoner), or a unique skeleton follower (new art and rules, the most expensive).
- Likely shares the spirit code with the Summoner. Do not build until the Summoner is settled.

## Followers and fusions

Followers form the body and give passives, and some have active skills.

| Follower | Now                                                             | Fusion                                                                                                                                                                    |
| -------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Miner    | +1 mine blast arm length each; mine every 8 s each, max 5 mines | **Bomber**: blast reaches the whole row and column of the mine; mine every 5 s; fusion gives +1 max mine as a permanent run modifier                                      |
| Keysman  | +10% each (max 50%) that a key summons 2 characters             | **Kingsman**: Keysman are 40% likelier to be summoned; fusion leaves +1 food presence and +1 weapon damage for the run                                                    |
| Magneto  | Pulls keys up to 4 tiles; enemies chase you more               | **Mr.X**: eats keys within 3x3 of your hero; recruits are rejected and shot at the nearest snake for 2-5 damage                                                           |
| Raiden   | +10% hero speed each (max +50%); every 10 s sets off your oldest mine | **Raiden Shogun**: +30% hero speed, every 5 s 1-3 lightning damage to the closest enemy tile; fusion gives +10% speed as a permanent run modifier                  |
| Gorgon   | 1-hit shield each (max 5, no recharge); slows the hero 5% each (max 50%) | **Medusa**: enemy heads in the line you face freeze, any head you touch dies at once; hero slowed 10%; fusion gives a 60 s shield with a shorter cooldown on later merges |

**Fusion permanent buffs:** Bomber +1 max mines, Kingsman +1 damage and +1 food presence, Shogun +10% speed, and Medusa's 60 s shield/shorter later cooldown are **run modifiers** stored in `S` (`applyFusionBonus`, merge.js). They persist for the current run, not across runs.

**Keysman overlap:** recruiting a Keysman summons a non-Keysman follower. The existing "+10% double summon" passive stays for now. Both remain unless play-testing shows that the overlap is too strong.

**Merge planning:** followers arrive randomly, so three of a kind is mostly luck. If merges feel like lottery wins, give the player one lever (a reroll, a way to reject a recruit, or a preview of what is walking in).

Speed and slowdown change the hero only, not enemies or skill timers.

## Recruitment

- The old food is a **key**: eating it no longer grows the chain. You grow by recruiting a character, which needs a key plus a character.
- Eating a key summons a random follower (never a fusion). It starts just outside your **view**, walks in, then jumps on the spot. The hero can recruit it from the moment it is on the grid, walking or jumping.
- **Goliath does not recruit:** a key gives him a shield instead.
- **Enemy snakes (and the boss) can eat keys and recruits.** If a character is eaten before you reach it, or an enemy eats the key first, that key is wasted.
- Up to 3 can wait at once. A new key drops once every key is gone and fewer than 3 characters wait.
- **Food presence:** `KEY_PRESENCE` (3) keys lie on the map at once, topped up every tick (unless 3 characters already wait). A Kingsman fusion adds 1 more for the rest of the run. New keys appear at least 8 tiles from the hero, half of them on a room's `*` key spots. An arrow points to the nearest key (it hides when the key is closer than 5 tiles).
- Keys, mines and waiting recruits can be kicked (Goliath only, `KICK_ALL_HEROES` for testing).

## Speed and clocks

- **Hero speed is halved.** `HERO_BASE_SPEED = 0.5`. At base speed the hero moves one tile every 250 ms. Modifiers (Raiden +10% each, Shogun +30%, Haste +50%, Gorgon -5%, Medusa -10%, fusion speed bonus) multiply the base. `HERO_SPEED_MAX` is 2 and `HERO_SPEED_MIN` is 0.15.
- **Enemies have their own move timers**, separate from the world tick, using the same base speed (`ENEMY_BASE_SPEED = 0.5`). Each enemy has its own speed multiplier.
- **Enemy speed-ups:** +2% per wave after the first (capped at +40%), and +10% for each key or recruit it eats (total multiplier capped at x1.8).
- **The world tick stays 125 ms.** Skills, attacks, cooldowns, combos, stun and the wave timer are all counted in world ticks and are unaffected by speed changes.
- **The boss has its own real-time clock:** it moves every frame in tiles per second (`BOSS_TPS`), not in tile steps.
- **Stun** counts in world ticks. A stunned enemy moves again the moment the stun ends.
- Open tuning point: Raiden's per-follower bonus may need to be larger than +10% for its cap to matter at the new base speed.

## Combat

- **Only the hero (and his follower skills, and Summoner spirits) attacks** for now. Hero attacks fire in the facing direction, automatically, on a timer. Steering is aiming.
- **Attacks are their own objects with their own sprite sheets**, drawn on top of the grid and snakes.
- Attacks hit **enemy snakes only**.
- **Mines:** explode when any snake head steps on one. The blast is a plus shape; arm length grows with Miners, and a Bomber makes it reach the world edge (walls stop it, and a blast smashes the first push block it meets). It hurts you too if you stand in line with it.
- **Kickable projectiles:** built (`kicks.js`).
- Hitting an enemy segment breaks it and cuts off everything behind it. Hitting its head costs hit points; at zero the whole snake dies.
- **Head-on collision:** both snakes take damage, short stun.

### Enemies

- Enemies chase the hero, never reverse, and flip around if boxed in. Chase chance grows with Magneto and high-score pressure. They path around walls with a distance map.
- **Eating:** an enemy that steps on a key or a recruit removes it, grows by one segment (up to 10) and gets 10% faster. A chasing enemy also heads for a key within 4 tiles (and for a recruit within 6).
- Spawned snakes start in a straight line just outside the camera view, heading inward, at least 6 tiles from your hero and never on a text zone or in a `noItems` room.
- Terrain obeys enemies too: walls, push blocks, turrets and hazards block them, gates only the right way, conveyors carry them, ice keeps them straight, mud slows them.

### Enemy head toughness

| Waves | Hits |
| ----- | ---- |
| 1-5   | 1    |
| 6-9   | 2    |
| 10-13 | 3    |
| 14-17 | 4    |
| 18+   | 5    |

### Enemy types (built)

**Fast** (wave 4+, thin, quick, shorter), **armored** (wave 7+, double hit points, steel outline) and **spitter** (wave 10+, spits an orb along a row or column when lined up with you). A special type is picked about 45% of the time once one is unlocked, and a room can favour one type while you are in it. Wall turrets fire the same orbs.

**Planned:** a **kamikaze** type that hunts mines and bombs (see Goliath).

## Temporary buffs (built)

Enemy snakes can drop short-lived buff blocks when they die. Touch one with the hero to get the buff; they show as chips with timer bars.

- **Drops:** 25% of dead enemies (`TB_DROP_CHANCE`), the boss always. The block appears on a free tile of the dead snake, lasts 12 s and blinks before vanishing. Armored snakes favour Bubble, fast snakes Haste, spitters Frenzy (60% of the time).
- **Ghost body** (8 s): followers do not collide with your own head or tail; enemies and walls still do. A test of the anti-trapping idea without removing the snake identity.
- **Haste** (6 s): +50% hero speed.
- **Magnet** (10 s): keys are pulled in from max range.
- **Bubble** (up to 20 s): absorbs one hit.
- **Frenzy** (8 s): weapon cooldowns are halved.
- Taking the same buff again refreshes it. No drops in Pacifist.

## Waves and bosses

### Timed waves (built)

The wave timer counts down on its own, so a new wave starts even if the last one is still alive.

- About 10 seconds at wave 1, about 30 seconds at wave 10, and about 60 seconds from wave 20 (`waveDuration`, in world ticks). The first wave comes after 3 seconds. (From these numbers wave 10 begins about 3.3 minutes in and wave 20 about 11 minutes in.)
- **Early clear:** if the field is completely clear, the timer jumps ahead to 2 seconds (`WAVE_CLEAR_SKIP`, 0 turns it off).
- **Cap:** at most 6 enemies are alive at once (`ENEMY_CAP`). Extra spawns wait in a queue of at most 8 and walk in as space frees up.
- Wave size is `waveSize` plus the high-score-pressure extra snake.
- **Boss hook:** while a boss fight is running, the wave timer is paused and no regular snakes spawn (`wavesPaused()`).
- The player sees the timer only in the last 10 seconds.

### Wave 10 boss: the Great Serpent (built)

Original idea: a gigantic snake that does not follow the grid rules. Hitting the head makes it flash, then the head becomes the tail and it keeps moving.

- **Gridless.** Its body is a chain of float points. The head moves smoothly every frame, turning at a limited rate; the body follows like a rope. It is drawn big and smooth. Weapons still hit it through the normal tile queries.
- **Damage (current).** 18 HP. A head hit is a 2x crit: it flashes white, freezes for 0.4 s, then swaps head and tail and slithers off the other way. A sword hit is 3, so three head hits kill it. A body hit does 1 and only flashes it.
- **AI.** It leads its target, uses line of sight and a path flow field to get around walls, steers away from walls and mines, hunts nearby snakes (it eats them: they feed its growth and heal it) and keys, and every ~5 s telegraphs and CHARGES in a straight line. A charge into a wall dazes it for about a second. Under half HP it is faster, turns faster and charges more often. If it gets stuck it swaps ends.
- **Touching you** costs a ring (a head touch can be blocked by the Swordsman) and it recoils briefly. Medusa cannot freeze or one-touch it; a touch hurts it. Goliath is safe from the front.
- **New regular snakes do not arrive during the fight.**
- **Reward:** coins, score, and a 3-card reward pick (the buff pick screen, reused). Waves restart a few seconds later. Pacifist skips the boss.
- All numbers are `BOSS_*` in config.js.

**Planned changes (it dies in seconds, mostly to spirits and stacked damage):**
- **More HP.** 18 is too low against levelled damage. Try 30 to 40, or scale HP with the hero's weapon damage.
- **Only the hero's own attacks crit.** Everything else (spirits, mines, shockwaves) does the body hit (1), even on the head.
- **At least one more attack**, so it cannot be tanked face to face: a spit fan (3 orbs in a spread, reusing the spitter orbs) between charges is the cheapest; a wall-ram shockwave and a telegraphed tail sweep are alternatives. Enrage can add a second volley.
- Aim for a fight of 20 to 40 seconds and tune HP, attack timing and crit rules together.

### Wave 20: the Hollow Wizard (built)

A small robed wizard with a hollow face, summoned at wave 20 on a far open tile. He is not a snake: he stands still on one tile and moves only by teleporting. No regular snakes arrive while he lives. Pacifist skips him.

- **Laser.** Every 5 s he charges for 2 s (a purple line follows you, then locks red for the last 0.5 s) and fires. Nothing blocks the beam, and it runs to the world edge, even if you are in another room. It stays on the field for 4 s and costs a ring while you stand in it. It also cuts enemy snakes.
- **Teleport.** Every 12 s (while his field is up) he blinks at least 14 tiles from you. An arrow points to him when he is off-screen.
- **Forcefield (5x5).** A soft wall: you stall against it, snakes cannot enter. Any weapon hit on it is a field hit (short immunity per hit). 3 field hits break it (Goliath headbutts it).
- **Exposed.** Field down: 4 HP, no teleporting. After 7 s the field reforms at full strength, he heals and blinks away, and the next volley has one more beam (up to a fan of 3).
- **Reward.** 25 coins, 2000 score, a reward pick. Waves restart soon after.
- Open: does the Challenge win move from "reach wave 20" to "beat the wizard"? (one character in `startWave`, see edits).

## World, camera and rooms

### Scrolling camera (built)

- The world is **60x60 tiles** (`COLS` and `ROWS` mean the world size). The hero starts in the middle.
- The camera follows the hero's smoothed position (`CAM_SMOOTH_MS`), never shows outside the world, and snaps after a portal or a revive.
- **The view adapts to the device.** The window's short side shows `VIEW_SHORT_TILES` (20) tiles, and the long side never more than `VIEW_LONG_MAX_TILES` (32), whichever zooms in more.
- The world is drawn on its own canvas behind the 640x640 UI square, with a faint grid so scrolling is visible.
- Enemies and recruits come in from just outside the view, so they arrive near you.
- A larger map is also a trapping-feel solution: the player can no longer see the entire field, so finding food and tracking threats takes more work.

### Room snap later

Room-snap/Zelda-style framing remains a possible presentation layer over the same world:

|             | Scrolling camera               | Room snap                         |
| ----------- | ------------------------------ | --------------------------------- |
| Feel        | Smooth, always centered on you | Screen flips as you cross an edge |
| Hidden info | Edges cut off                  | Whole other rooms hidden          |
| Wizard      | Fires from off-screen          | Fires from another room           |
| Cost        | Built                          | Needs doorways and room logic     |

### Rooms, walls and hazards (built)

Curated rooms are preferred over purely procedural floors.

- The 60x60 world is a **3x3 grid of 20x20 rooms**. A room is a template (20 rows of 20 characters) plus tags (difficulty tier, favoured enemy types, doors, `noItems`). The middle room is always the start room.
- Every room has openings in the middle of each connecting side (columns 9-10 on top/bottom, rows 9-10 left/right). `doors: 'tb'` rooms are turned so their opening faces the middle of the world.
- Tiles: walls, hazards, mud, conveyors, one-way gates, ice, push blocks, bumpers, crumbling floor, turrets and key spots. Rule of thumb: no width-1 dead ends and always a way out.
- Templates built: start, ruins, gauntlet, garden, mill, chapel (ice), keep (moat), barracks (nest), vault (push blocks over a hazard pit), pinball (bumpers), bridges (crumbling floor), alley (turrets) and serpentine. More sketches and ideas are in [Templates.md](Templates.md).
- **Story decor (Dark Souls style, no words):** each room's floor, colours and small props tell what happened here. The start room is a cold hearth with a trail of bones to the north door. The gauntlet has headless knights. The garden has a skeleton who sat down with a wilted flower. The mill has a broken wheel. The chapel has a frozen kneeling congregation. The keep has a dead king on his throne. The barracks has soldiers who never left their beds. Props are drawn from shapes in `scenery.js`.

### Progressive room opening (planned)

Problem: all nine rooms are open from the first second, with a halved hero speed. That is a lot of empty map for a new run, and the first minute risks being long walks.

- Start in the **start room only** (it is exactly one screen). Open the rest with a purpose.
- The data already has an order: the start room, then tier 1 (the four rooms beside it), then tier 2 (the corners). Harder rooms and more enemy types arrive as doors open.
- **Ways to open a door**, alone or mixed: a wave milestone; clearing a room's enemies; spending a key on it (the Zelda "locked rooms" idea; a key is then either a recruit or a door, which gives keys a second use); the player choosing which door opens next.
- **Needs:** a door tile that is wall until opened, `S.openRooms`, keys, recruits and enemy spawns only in open rooms, the camera and key arrow limited to the open area, and the first wave and the boss tuned to the open size. A visible opening moment (a door animation, a popup) matters as much as the logic.

## Buffs

The buff pool:

- Starting follower, +20% score, Thick skin, Quick hands, Combo keeper, Skill haste, Welcome party, Minefield.
- Second wind: a free revive.
- Rich: 10% more coins at the end of the run.
- Flag modifiers: Magician's gift, Glass cannon, Dev mode (one WASD step per press), Everything is a bomb.
- Mode buffs: Pacifist and Challenge (see below).
- Some buffs are **locked in the shop** (`SHOP_LOCKED` in config.js) and only join the pool once bought. Magician's gift and Everything is a bomb can be bought at higher levels.
- The boss reward pick offers three of: Thick skin, Quick hands, Combo keeper, Skill haste, Second wind, Welcome party.

The pity boost matters because heroes start with no followers. Temporary buffs (above) are a separate system.

### Buff screen economy

- 1 coin unlocks the third card.
- 5 coins buys a mulligan.

## Score and coins

- Kills, keys and cut segments give points. Kill points are 20 x the combo count, capped at x5. A kill must land within 3 seconds of the last one.
- **Combo coins are a hidden side quest.** A chain can earn up to 5 extra coins for a Pentakill (once per chain). Ordinary kills do not pay coins.
- The economy is intentionally scarce. Wave milestones pay coins (`WAVE_COINS`: wave 5, 10, 15, 20). The wave 10 boss pays 10 coins and 500 score on top.
- Challenge's 100-coin reward is intentionally hard relative to the 50/100/200 hero prices.
- Coins are kept between runs and are used for hero unlocks, buff-screen choices, shop items and the "No ads" toggle.

### Ads and revives

- A revive is offered through a joke fake-ad screen (`ADS_ENABLED` in config.js). Ads are madlib products from `assets/ads/ads_data.js`; there is no tracking and nothing is real.
- The ad is a fast-forward-but-not-skip overlay: hold the button to make it 4x faster.
- The hero-select screen has an ad button with payouts of 10, 5, 2, then 1 coins, returning to 10 after an hour.
- There is a dev-side toggle for the ad system and a player toggle ("No ads").
- With ads off, a revive is instant and free. Second wind is always a free instant revive.
- If real-money purchases are ever considered, revisit `retention.js` first.

## Retention

These are hidden systems that quietly adjust the game. They are hard to tune and can hide balance problems, so consider switching them off (`RETENTION_ON = false`) while the core is being balanced, and turning them on later only if the core loop needs them.

### High-score pressure

Pressure ramps from the player's best score and makes enemies more demanding near a personal best. The exact values are in `config.js`.

### Frustration meter

The frustration meter and pity boost stay. The pity boost is more valuable because a normal run starts with zero followers.

### Coin tiers

Coin rewards are multiplied by a tier based on **coins spent during runs** (the 1-coin third card, 5-coin mulligans, plus any revive cost):

> Players who use more coins in runs earn more coins later; players who spend little earn less.

`config.js` still has the old thresholds (0 / 15 / 45 / 90). The intended thresholds are about 0 / 5 / 12 / 25 coins spent over the last five runs. Tune them once play-testing shows how much players really spend.

## Challenge and Pacifist

Both are normal run-start buffs.

### Pacifist

A normal Snake-style avoidance mode rather than a combat gimmick.

- Enemies cannot hurt you and you cannot hurt them.
- Enemies remain solid, so touching one behaves like a tail stall.
- Walls, hazards, mines and your own body still matter.
- Weapons and follower attacks are disabled. No levelling, no boss, no temporary buff drops.
- Score comes from keys, recruits (15), merges (50) and waves survived (25).
- A stuck detector ends the run after 20 s without a real move.

### Challenge

- Any hit costs **all** your followers. Reach wave 20 to win (the wave 10 boss is part of the way).
- Win screen "Challenge complete!" with a **100 coin** reward, deliberately difficult.
- Challenge/modifier runs stay part of the normal game and the leaderboard.

## Modifier runs and leaderboard

Dev mode, Pacifist, Glass cannon and other modifiers are legitimate runs, not excluded runs.

- They remain in the buff/modifier pool.
- Their scoring uses `S.scoreMult` (the multipliers are guesses, tune them).
- A modifier does not invalidate a run; it changes how that run is scored.

## Hero levelling (built)

- Kills give XP (`LEVEL_XP_KILL`), plus a slow passive trickle at low levels; every level makes the newest weapon 15% stronger and a bit faster.
- Every 5 levels the game pauses and offers a weapon branch: **Gatling** (rapid bullets), **Ricochet** (bouncing heavy shot), **Nova** (blast around you), **Thunder** (lightning on the nearest enemies).
- A new branch weapon gets the full boost each level; older weapons keep growing at 30% of that.
- The pick screen is reused. Pacifist has no levelling.
- Watch for runaway power: levelling, branches, buffs and fusion modifiers stack without a ceiling.

## Title screen and shop

The title screen **is** the hero select screen.

- The game opens on it, and so does every new run.
- The only title element is the game name, floating at the top: "animeSnake", or "Snake-lite" about half the time, with a Minecraft-style splash line (a random joke, or a dig at the player or the dev) tilted beside it.
- Up to 3 heroes show as big cards. 4 to 8 show as a compact grid, with the focused hero's description under it.
- Hero cards get a **detail toggle** (the "i" button or the I key).
- Buttons on the screen: mute, detail, Shop, watch an ad, No ads.
- **The shop** (Shop button or B) is a scrolling list. Run buffs that start locked (with levels for Magician's gift and Everything is a bomb), and permanent starts: "Start with a random follower" (150 coins), then each base follower (200 coins) with one selectable as a permanent starter.

## Build order

### Tier 1 to 3 (done)

Locked Magician and new prices; buff cleanup; no starting followers; Gunman front bullet; Gorgon shields without recharge; zero-score line; detail toggle; speed limits; movement-feel fixes; fusion permanent buffs; Raiden remote detonation; Keysman rule; Magician charges; flag buffs; buff screen economy; Pacifist and Challenge; speed rework; timed waves; enemies that eat; economy rework and ads; hero levelling; the shop; the scrolling camera over a 60x60 world.

### Tier 4

Done:
23. Mine and recruit kicking (one shared system).
24. Goliath (back-hit rule, speed, swipe, kick reward, key shields, no recruiting).
25. Rooms, wall types and hazard templates: 13 templates, enemy types, food presence and arrow, story decor.
26. Temporary buff drops.
27. Reverse direction when alone, for every hero.
28. Summoner, first version (copies a follower, keeps the chain).
29. Goliath rework (front-only, terrain hurts, fixed bombs, kamikaze snakes).
31. Summoner redesign (spend the tail, fusion spirit, permanent buff).
32. Progressive room opening.

Next:

30. Boss pass (more HP, spirits cannot crit, one more attack).
33. Necromancer (parked).

### Tier 5: hardest

Wave 10 boss: gridless giant snake. **Built.** Wave 20 wizard: teleporting, persistent map-wide laser, forcefield that pushes the player out, and firing across rooms. Intentionally much later.**Built.**

## Suggested implementation sequence

1. Goliath fix, boss pass and Summoner redesign (small code, big balance effect).
2. Progressive rooms.
3. A short structured balance pass: time the same things every run (first recruit, first merge, wave 5, boss, first death) and note what killed you.
4. Fixed bombs and kamikaze snakes.
5. Necromancer and wizard much later.
6. Real art and audio.

## Problems and resolutions

- **Coins:** the old per-kill/wave coin stream was too generous. Pentakill is a side quest capped at 5 coins, while milestones/bosses provide the main economy.
- **Retention coin tiers:** they stay; their input changed from revive coins spent to coins spent in runs.
- **Timed waves plus boss:** no new snakes arrive during the boss fight, and the timer pauses. The boss eats only the existing enemies.
- **Timed waves with a clear field:** a long wave timer would leave a good player idle, so a cleared field skips ahead to 2 s.
- **Challenge reward:** 100 coins is intentionally a hard reward relative to the hero prices.
- **Modifier leaderboard:** modifiers remain on the leaderboard and are scored differently rather than excluded.
- **Trapping feeling:** larger maps reduce total visibility. Ghost body (temporary buff) reduces self-trapping without removing the snake feel. Input buffering, coyote ticks and the alone-reverse rule are cheap experiments. Halved speed should also improve reaction time.
- **Info bar:** removed to keep the game the main attraction.
- **Empty world:** 60x60 felt empty; fixed with rooms, three keys on the map, an arrow to the nearest and story decor. Progressive opening is the next answer.
- **Different screen shapes:** menus stay a fixed 640x640 square, and the world and HUD adapt to the window.
- **Boss in a grid game:** "gridless" is done by giving the boss float points and a real-time clock while keeping a tile view of it, so every existing weapon works on it without special cases. The cost is that damage rules must be added deliberately (see Boss).
- **Goliath too strong:** terrain immunity plus an unreachable back. Planned rework above.

## Brainstorm additions

- Boss reward: relic or buff pick after each boss (built for wave 10 as a buff pick).
- Joke ads: absurd fake products, fully fake and with no tracking.
- Room ideas: see Templates.md (soft blocks, pressure plates, shrinking arena, darkness, tunnels, teleporters, wind, locked rooms, mirror room, magnet tiles, rotating walls, patterned minefields, fixed bomb pedestals).
- Daily challenge: a seeded run on the existing Supabase board. Parked, low priority.

## Open questions / tuning notes

1. **Speed:** Raiden's bonus may need to be larger than +10%.
2. **Fusion buffs:** permanent for the current run, not across runs. Summoner can stack them; consider caps.
3. **Keysman:** both the non-Keysman recruit summon and the old double-summon chance stay for now.
4. **Enemy eating:** growth cap (10), speed-up (+10%, max x1.8) and the key-hunt distance (4) are first guesses.
5. **Camera:** the view sizes (20 short side, 32 long side), the follow smoothing and the HUD placement need tuning.
6. **Boss:** HP, speed (3.2 tiles/s against the hero's 4), turn rate, charge cooldown and telegraph length, hit radius and the reward pool all need tuning. `BOSS_WAVE` is currently 2 in config.js.
7. **Temporary buffs:** drop rate (25%), durations and the type preferences are first guesses.
8. **Summoner:** spirit lifetime and cooldown (5 s and 5 s), uncapped permanent buffs, and what a lone Summoner with no followers does.
9. Exact Pacifist score target, ad timings, boss payouts, wave durations, enemy cap, modifier score multipliers, room templates and kick physics.

## Current status

The prototype has the core Snake loop, recruitment, merging, five heroes (the fifth in a first version), five follower families, buffs and temporary buffs, a scarce-coin economy with joke-ad revives, Pacifist and Challenge, hero levelling, a shop, retention hooks, title-screen hero selection, touch controls, audio placeholders and the basic leaderboard. On top of that: halved hero speed, enemy move timers, timed waves, enemies that eat keys, the scrolling camera over a 60x60 world of room templates with rich terrain, four enemy types, kick physics, a window-corner HUD and the wave 10 gridless boss. The dev plays it in a browser before every commit; there has been no structured balance pass. The next work is the Goliath fix, the boss pass, the Summoner redesign and progressive rooms.