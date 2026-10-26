# animeSnake: Handover

For whoever picks this up next (a new chat, a new session, or future you). Read this first, then [DESIGN.md](DESIGN.md) for the design, [ART_SPEC.md](ART_SPEC.md) for sprite formats and [Templates.md](Templates.md) for the room template sketches.

## Snapshot

Snake, but anime: a fast roguelike where the snake is a chain of anime characters. The user's first small game, fully vibecoded (code with AI help, art and audio from other AI tools). Plain HTML, CSS and JavaScript, no build step, no server, no dependencies. Repo: https://github.com/knoxDaviber/animeSnake

**Wording:** the playable head is called a **hero** in anything the player sees. The code still says head / `HEADS` / `HEAD_DEFS` (renaming is optional and not worth the risk yet).

**Testing status (honest version).** The dev plays the game in a browser before every commit and fixes errors and odd interactions as they appear. There has been no structured balance pass, and the assistant that writes the code cannot run the game (it can only read, reason about and simulate code in Node). So: "runs" is mostly confirmed, "feels right" is mostly not. Older versions of these docs said "nothing is play-tested"; that was stale.

**What exists:** the Snake loop with sprites and fallbacks; rings and damage; timed enemy waves with four enemy types; four heroes in the game (Swordsman, Magician, Gunman, Goliath) plus a first version of a fifth (Summoner, see below); five followers and five fusions; recruitment by keys; the tail stall; merging; the halved hero speed system with enemy move timers; scoring and combos; saved bests and coins; the Supabase top 10; the hero select screen that is the title screen; coin-gated unlocks and a shop; the window-corner HUD; placeholder audio; retention systems; tap-zone touch controls; Pacifist and Challenge; hero levelling with weapon branches; fake joke ads for revives and coins; a scrolling camera over a 60x60 world of 13 room templates with rich terrain; kick physics; temporary buff drops; Goliath key shields; and the wave 10 gridless boss.

**Not built:** the Summoner redesign (decided, see "Decisions waiting to be built"), progressive room opening, the Goliath rework, boss changes, fixed bombs and kamikaze snakes, the Necromancer, the wave 20 wizard, real audio files and final sprites.

## The assistant's review: thoughts on the game so far

Written from reading all the code and docs, not from playing. Treat it as a second opinion, and trust the dev's own play feel over anything here.

### What is working

- **The core hook is strong and a little unusual.** Characters as rings (a hit costs the tail, not the run) plus merging as a real cost (three followers become one, so you lose two characters) is a good pair. It makes every recruit a decision: grow safer, or merge into something stronger and thinner. Most Snake games only have "get longer, get slower".
- **Auto-attack with steering as aiming** is the right call for a phone game. You only ever do one thing with your thumb, and the build does the rest. That is why the genre it borrows from (the auto-battler survivors) works.
- **Heroes that break one snake rule each** is the best pattern in the game and worth leaning on. Magician breaks "walls stop you". Goliath breaks "your head is the weak point". The planned Summoner breaks "followers are your lives". A planned Necromancer could break "dead is dead". When a new hero idea does not break a rule, it is probably just another weapon.
- **The code is easy to change.** One state object, one config file, plain scripts, every weapon going through `enemyAt` / `strikeEnemyAt` so the boss and every future attack work together for free. That is the reason a first-time dev can keep adding things safely, and it is worth protecting.
- **Personality.** The splash lines, the joke ads, the story decor (bones, headless knights, a dead king) and the humour in the unlock texts are what will make people remember it. The ad-as-revive joke is genuinely good commentary. Lean into this more than into new systems.

### Concerns, most important first

1. **Goliath is close to invulnerable (a code finding, not a feeling).** In `playerMove`, anything in front of him is harmless, and that includes walls, hazards and gates, so he can ignore terrain entirely. For enemies, `stepEnemy` only hurts him when an enemy head enters his head tile from behind. With followers, the tile behind his head is his own body, so that cannot happen. Alone, enemies chase along the shortest path and almost never end up directly behind a moving head. So in practice only mines and spit orbs hit him. The dev's instinct is right. The fix has three parts: walls and hazards must cost him again, invulnerability must be front-only, and something has to be able to reach his sides and back (see "Decisions waiting to be built").
2. **Early-run pacing and the huge world.** Heroes start with zero followers (one life), the hero moves one tile every 250 ms, the world is 60x60 and keys must spawn at least 8 tiles away. Crossing the map takes about 15 seconds. The first minute risks being long walks with nothing to do, then a sudden wave. The dev's idea to open rooms gradually is the right fix, and it also fixes "bombarded with a full massive map". The start room is exactly one screen (20 tiles), which is a lucky fit.
3. **Hidden systems that rubber-band.** High-score pressure (enemies get harder when you are doing well), the frustration meter and pity boost, and coin tiers (earn less if you spend little) all adjust the game quietly. They are hard to tune and they hide balance problems, because a bad curve gets patched instead of fixed. Coin tiers in particular are shaped like a monetisation tool in a game with no real money. Suggestion: keep `RETENTION_ON = false` while balancing the core, and turn them on later only if the core loop needs them. The flag exists for exactly this.
4. **Snowballing.** Levelling, weapon branches, buffs, fusion run modifiers and the planned Summoner rule (every summon grants a permanent fusion buff) all stack with no ceiling. Some snowball is the fun of a roguelike, but the Summoner can reach very high power quickly. Cap or taper at least the stacking ones (Kingsman damage, Shogun speed) before they hide the rest of the balance.
5. **Merge planning is too random.** Followers arrive randomly from five families, so three of the same kind is mostly luck. The game wants the player to plan merges. Give them one lever: a reroll, a way to reject a recruit (Mr.X does it as a side effect), or a way to see what is walking in. Without one, fusions feel like lottery wins.
6. **Run length versus "quick runs".** From `waveDuration`, wave 10 (the boss) begins about 3.3 minutes in and wave 20 about 11 minutes in. That is fine for Challenge, but pillar 1 says a run is a few minutes. The boss should land in a normal run, so check how often runs actually reach it. (`BOSS_WAVE` is 2 in the config right now, which looks like a test value.)
7. **Boss hit rules reward spamming.** Every damage source, including summoned spirits, can crit its head, and the boss has the lowest HP in the game relative to hero damage. It dies in seconds when a few damage sources line up. Details and a proposal are below.
8. **Content is ahead of feel.** 5 heroes, 10 followers, 4 enemy types, a boss, 13 rooms, a shop, ads, retention and a leaderboard is a lot for a prototype whose basic loop is still being tuned. This is not a reason to stop. It is a reason to prefer changes that make existing content better (the Goliath fix, the boss pass, progressive rooms) over new content (the Necromancer, new followers).
9. **Small hygiene.** Old duplicate functions in `render.js` that `hud.js` overrides, a few leftover constants and test values (see Known gaps). None of it matters for play, but it makes the next bug harder to find.

### What I would do next, in order

1. **Goliath fix** (small code, big balance effect): walls and hazards cost a ring for him, invulnerability only from the front, keep mines dangerous.
2. **Boss pass:** more HP, spirits cannot crit, one more attack (see below).
3. **Summoner redesign** (a small change on top of the first version): spend the tail, release the fusion form, grant the fusion's permanent buff.
4. **Progressive rooms** (the biggest change to the first minute): start in one room and open doors with purpose.
5. **A short structured balance pass.** Time the same things every run: seconds to the first recruit, first merge, wave 5, boss and first death, and note what killed you. Ten runs with one hero will show more than any new feature.
6. **Park everything else** (Necromancer, bombs, kamikaze snakes, wizard) until 1 to 5 feel right.

## Decisions waiting to be built

These were decided or leaned towards in the latest design talk. None of it is in the code yet, except where noted.

### Summoner redesign (supersedes the first version)

- He summons only **from the chain**: the **tail follower is spent** and released as a spirit. He needs followers to summon. Spending the last follower is allowed (the hero stays, so he only dies when he is hit).
- The released spirit is the **upgraded version**: a Miner becomes a Bomber, a Raiden becomes a Raiden Shogun, and so on. If the tail is already a fusion it is released as itself.
- Spirits do **context-based actions** and **vanish after 5 seconds**. He can summon **every 5 seconds**, so one spirit is out about as long as he has followers to spend.
- **He gains the fusion's permanent run modifier each time** he releases one (`applyFusionBonus` in merge.js already does this for real merges): Bomber +1 max mine, Kingsman +1 damage and +1 key, Raiden Shogun +10% hero speed, Medusa a shield. This is the Summoner's route to power: no merging needed, so in theory he becomes the strongest, fastest.
- The balance is meant to come from risk: with few followers he lives on one or two lives, and any hit is dangerous.
- **Check before tuning:** the modifiers stack without limit, so a good run could stack Kingsman damage very high. Consider a cap per fusion type.
- **Code state:** a first version (`summoner.js`, plus the edits in config, heads, state, render and hud) copies a random follower and leaves the chain intact. **If you applied it, it is the old design.** To get the new design: spend `S.snake.pop()` and `S.roster.pop()` (like `takeHit` does, with the drop effect) instead of copying, map the follower to its fusion with its `merge` field, set both `AGENT_TICKS` and `AGENT_FUSION_TICKS` to 40, call `applyFusionBonus`, and delete the base-follower behaviours (only bomber, kingsman, mrx, shogun and medusa are needed). Also decide what happens with zero followers (nothing, probably).

### Boss changes (Great Serpent)

Problem: it dies in seconds, mostly to spirits and stacked damage, and swapping ends makes it harder to hit, not weaker.

- **More HP.** 18 is too low for the damage levelling gives. A first guess is 30 to 40. Alternatively scale HP with the hero's current weapon damage so levelling does not trivialise it.
- **Only the hero's own attacks crit.** Anything else (spirits, mines, shockwave and so on) does the body hit of `BOSS_BODY_DAMAGE` (1), including on the head. In code: spirit hits must not go through `damageEnemyHead` for a boss.
- **At least one more attack**, so it cannot be tanked face to face. Options, cheapest first: a **spit fan** (3 spitter orbs in a spread, reusing `S.spits`, used between charges), a **wall-ram shockwave** (a ring of hazard tiles or damage when it hits a wall), a **tail sweep** (a telegraphed arc of its body). I would start with the spit fan: no new systems and it forces movement. Enrage can add a second volley.
- Tune `BOSS_HP`, the new attack's timing and the crit rules together, then check the fight length (aim for 20 to 40 seconds).

### Goliath rework

- **Current (built):** hurt only from behind; front and side contact is harmless; walls, hazards and gates in front only stall him; mines hurt him; he cannot recruit followers, and eating a key gives one one-hit shield (max `GOLIATH_SHIELD_MAX`, 3) instead; every 5 kicks a random fusion joins his chain; 0.75x speed.
- **Planned:** invulnerable **from the front only**. Sides and back hurt. Walls and hazards cost a ring again. (My reading of the dev's note: "front invulnerable only".)
- **Weakness to mines:** the original idea was that he is very weak to mines, but the 60x60 map thinned them out. Two fixes the dev suggested, which fit together:
  - **Fixed bombs:** bomb pedestals placed by room templates that regenerate after a set time, so there is always a bomb to kick or trigger. Goliath can kick them into enemies (kicks.js already handles mines), and enemies can set them off beside him.
  - **Kamikaze snakes:** a new enemy type that hunts mines and bombs and sets them off near the hero. This gives the map a threat that actually comes at his sides.
- Not built: the wall-kick that turns a fusion back into base followers.

### Progressive room opening

The 3x3 world is fully open from the first second. Instead: start in the start room and open the rest with a purpose.
- A natural order already exists in the data: the start room, then tier 1 (the four rooms next to it), then tier 2 (the corners).
- Ideas for the trigger: wave milestones, clearing a room's enemies, a key spent on a door (the Zelda "locked rooms" idea in Templates.md, which also gives keys a second use against recruiting), or a mix. Make the choice visible and meaningful, for example the player picks which door opens next.
- Likely changes: a door tile that is wall until opened, keys, recruits and enemy spawns only in open rooms, the camera and the key arrow limited to the open area, the first wave and the boss tuned to the open size. Needs `S.openRooms` in state and a change in `buildWorld`.

### Necromancer (parked)

Too close to the Summoner as "revive dead followers". Best option so far: **dead enemy snakes rise as the Necromancer's minions**. Different fuel (kills, not keys), reuses enemy sprites, bounded by the enemy cap. Likely built on the spirit code from the Summoner. A unique skeleton follower is the most expensive option (new art and rules). Do not build until the Summoner is settled.

## Latest steps (written)

### Temporary buff drops (`tempbuffs.js`)
- A dead enemy snake may drop a block (`TB_DROP_CHANCE` 25%, the boss always) on a free tile of its body. Touch it with the hero to get the buff. Blocks last `TB_PICKUP_TICKS` (12 s) and blink before they vanish. Armored snakes favour Bubble, fast ones Haste, spitters Frenzy (`TB_PREFER`, `TB_PREFER_CHANCE`).
- Ghost body (8 s): your followers do not collide with your head or tail. Haste (6 s): +50% hero speed. Magnet (10 s): keys are pulled from max range. Bubble (up to 20 s): absorbs one hit. Frenzy (8 s): weapon cooldowns are halved. Taking the same buff refreshes it.
- State: `S.tb[id]` = ticks left, `S.pickups` = blocks on the map. Hooks: `killEnemy` (drop), `playerMove` (collect, ghost), `takeHit` (bubble), `heroSpeed`, `weaponCooldown`, `magnetRange` / `magnetPull`, `tileFree` (pickups block spawns), `activeBuffs` (timer chips), `draw()` (`drawPickups`, `drawTempAuras`).

### Goliath key shields and the reverse rule
- Goliath cannot recruit. `summonRecruit` returns false for him and `eatKey` calls `goliathKeyShield` instead. Shields (`S.keyShields`) are absorbed in `takeHit` through `goliathShieldAbsorbs` and never recharge. The kick reward (a fusion every 5 kicks) and starting-follower buffs still work.
- **All heroes can reverse direction, but only when alone.** `setDir` allows a 180 degree turn when the chain has length 1. Any follower tail blocks it.

### Summoner (first version, see the redesign above)
- `summoner.js`, config constants `SUMMONER_COOLDOWN` 40, `AGENT_TICKS` 64, `AGENT_FUSION_TICKS` 40, `AGENT_MAX` 4 and the other `AGENT_*` numbers. `updateSummoner` is called through `HEAD_DEFS` in heads.js (as a wrapper, because of file load order). Spirits are in `S.agents`; they chase, melee, and have per-follower habits. Hero price 200 coins. It needs a `summoner.png` (the placeholder tool can make one).

## Earlier step: the wave 10 boss, gridless

Delivered as `boss.js` (and paste-in edits). Loaded after `enemies.js`.

- **Gridless.** The boss is an enemy (`e.boss`, `type: 'boss'`) in `S.enemies`, but its body is a chain of float points `e.pts` (tile units; an integer is a tile's middle). The head moves every frame (`bossFrame`, called from `stepEnemyTimers`), turning at `BOSS_TURN` rad/s; each other point drags behind the one in front at `BOSS_SPACING`. Drawn big and smooth by `drawBossSnake`.
- **Tile compatibility.** `enemyAt(x, y)` asks `bossIndexAt` (a tile counts if its middle is within `BOSS_RADIUS` of a point), so weapons, mines, bullets, shockwaves and spawn checks all see it. `e.segs` is kept as one rounded tile per point (`bossSync`). Walls use a circle against tile squares (`bossBlocked`).
- **Damage.** `BOSS_HP` 18 (to be raised). A hit on the head (`damageEnemyHead`) is a crit (`BOSS_CRIT` x2): it flashes, freezes `BOSS_FLASH_MS`, then `bossSwap` reverses the points and it keeps moving. Body hits (`cutEnemy`) chip `BOSS_BODY_DAMAGE`. `BOSS_IFRAMES_MS` stops one blast from counting twice on the same part.
- **AI (`bossSteer`).** Goal: another snake's head close by (it eats it), a nearby key, otherwise you, aimed `BOSS_LEAD_MAX` tiles ahead. Direct line with line of sight, otherwise a walls-aware flow field (`distField`, replanned every `BOSS_PATH_MS`). It steers away from walls and mines (`bossRepel`). Every `BOSS_CHARGE_CD` ms, with line of sight at 4 to 11 tiles, it stops (red ring and line telegraph), then charges at `BOSS_CHARGE_SPEED` x speed; ramming a wall dazes it. Under `BOSS_ENRAGE_AT` of its HP it is faster, turns faster and charges more often. If it barely moves for a second it swaps ends.
- **Eating.** Keys, recruits and other snakes near its head are eaten; eating adds a body point (max `BOSS_MAX_PTS`), speed and heals.
- **Hurting you.** `bossContact`: head within `BOSS_HEAD_REACH` of any of your segments, or any body point within `BOSS_BODY_REACH` of your hero, costs a ring, then it recoils. Medusa: a head touch hurts the boss instead. Goliath: a front touch is harmless and chips the boss.
- **Flow.** Wave `BOSS_WAVE` (`startWave`) calls `startBoss`; `updateBoss` spawns it just outside the view. `wavesPaused()` is true while `S.boss` or `S.bossWait`. Pacifist skips it. On death (`bossDefeated`): coins, score, a blast flash, `S.pendingReward`; `openBossReward` then opens the buff pick screen with `S.rewardPicking`.
- **Known soft spots:** its body can slightly clip walls on tight bends (only the head is wall-tested); width-1 gaps are too narrow for the head circle (it may swap ends); `distField` is limited to 1800 tiles, so very far goals fall back to a straight line.

## Earlier steps (summary)

- **Terrain and HUD.** Ice and conveyors no longer lock you into a wall (`terrainBlocked`, `forced`); bumping terrain on ice or a belt is free and waits for a new heading. The HUD (`hud.js`) is drawn on the world canvas in window pixels (corners); `TEXT_ZONES` are window-pixel boxes. Buff chips bottom-left, level bar under the hero, key arrow halfway to the window edge. The old HUD functions in `render.js` are dead code (see Known gaps).
- **Kick physics (`kicks.js`).** One shared system for mines, keys and waiting recruits: `tryKick`, `updateKicks`, `S.kicks`, `S.kickCount`. A kicked item slides `KICK_SPEED` tiles per tick until blocked; a sliding mine that hits an enemy explodes. Only Goliath kicks (`KICK_ALL_HEROES` for testing).
- **Rooms and terrain (`rooms.js`).** The world is a 3x3 grid of 20x20 room templates (tiles: `#` wall, `H` hazard, `~` mud, `> < ^ v` conveyors, `r l u d` gates, `I` ice, `B` push block, `Z` bumper, `C` crumble, `T` turret, `*` key spot, `e` floor). The middle room is the start room; the four next to it are tier 1, the corners tier 2. Each is randomly rotated and mirrored (`transformRows`; direction tiles turn with it; `doors: 'tb'` rooms keep the opening facing the middle; `noItems` rooms get no keys, recruits or spawns). Templates built: start, ruins, gauntlet, garden, mill, chapel, keep, nest (barracks), vault, pinball, bridges, alley, serpentine. Story decor in `scenery.js`.
- **Enemies and terrain.** Enemies cannot enter walls, blocks, turrets or hazards, enter gates only the right way, ride conveyors and slide on ice. Chasing uses a walls-aware distance map. Types: fast (wave 4+), armored (wave 7+, double HP), spitter (wave 10+); a room can favour a type.
- **Food presence.** `KEY_PRESENCE` (3) keys on the map; a Kingsman fusion adds one. New keys are at least `KEY_MIN_DIST` tiles from the hero and half go on `*` key spots. The key-spot bug (`spots` never filled) has been fixed with one line in `buildWorld`.
- **Camera.** `COLS` / `ROWS` are the world size (60x60). Two canvases: `#w` fills the window and draws the world and HUD; `#c` is a 640x640 square for menus and overlays. `resizeView()` sizes the view (short side 20 tiles, long side at most 32); `updateCamera` follows the hero smoothly and snaps after portals and revives; `viewTiles()` gives the visible tiles (spawns use it).
- **Pacing foundation.** `HERO_BASE_SPEED = 0.5`; each enemy has its own move timer (`stepEnemyTimers`); stun counts in world ticks; timed waves with `waveDuration`, a cleared field skips ahead (`WAVE_CLEAR_SKIP`), `ENEMY_CAP` 6 alive at once; enemies eat keys and recruits.
- **Batch B.** Two-entry input buffer and a grace tick; flag buffs (Magician's gift, Glass cannon, Dev mode, Everything is a bomb); Second wind is one free revive; the third buff card costs 1 coin and a mulligan 5.
- **Economy, modes, levelling, shop.** `WAVE_COINS`, Pentakill (5 coins once per chain), fake ads (`ads.js`, data in `assets/ads/ads_data.js`), Give up (P then Q twice), Pacifist and Challenge, levelling with weapon branches (`levels.js`), the shop (`shop.js`).

## Run it

Open `src/index.html` in a browser. Sprites load from `../assets/images/`, so keep the folder structure. Controls: arrows / WASD / swipe / tap zones, P or Escape pauses. On the hero select screen, I toggles stat details, B opens the shop. On the buff screen: 1/2/3 or arrows and Enter pick, R is the mulligan.

The game opens on the hero select screen. Swordsman is free; Magician 50, Gunman 100, Goliath 200, Summoner 200. Old saves that already own Gunman keep that unlock.

## Code layout (`src/`, loaded in this order by `index.html`)

| File             | Owns                                                                                   |
| ---------------- | -------------------------------------------------------------------------------------- |
| `config.js`      | All constants and tuning numbers (including `BOSS_*`, `TB_*`, `AGENT_*`)               |
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
| `tempbuffs.js`   | Temporary buff drops: pickups, timers, Bubble, drawing                                 |
| `summoner.js`    | The Summoner hero: spirits (first version, redesign pending)                           |
| `recruits.js`    | Keys and recruits: summon, walk in, touch, `eatKey`, `shootRecruit`                    |
| `kicks.js`       | Kick physics for mines, keys and recruits; Goliath rules and key shields               |
| `merge.js`       | `mergeCheck`: three identical followers fuse; `applyFusionBonus`                       |
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

Rules of thumb: tuning numbers go in `config.js`, state goes in `S`, drawing goes in `render.js` (the boss and spirits draw themselves from their own files). No loose globals. No `import`/`export` modules (they fail from `file://`). Anything that refers to a function from a later file at load time (like `HEAD_DEFS`) must wrap it in an arrow function.

## Clocks

- **Hero clock:** `heroStep` runs on `heroInterval()` = `TICK_MS / heroSpeed()`.
- **World tick (125 ms):** `step` advances skills, attacks, recruits, spirits, stun countdown, wave timer, combos, temporary buffs and the animation frame. All cooldowns in config.js are in world ticks.
- **Enemy clocks:** each enemy moves on its own `enemyInterval(e)` (`stepEnemyTimers`).
- **Boss clock:** the boss ignores tiles and ticks. `bossFrame` runs every frame and uses real time (tiles per second and milliseconds).

Rendering is separate: the hero uses `S.heroAlpha`, grid enemies use `e.alpha`, everything else `S.alpha`. The boss draws straight from its float points.

## Rules to preserve

- Heroes attack automatically in the facing direction; steering is aiming.
- Heroes start with **zero followers**.
- A hit removes the tail character; losing the last character kills the run. Glass cannon kills on any hit that lands (shields still absorb).
- No instant reverse, except for a hero with no followers (any hero).
- Three identical followers anywhere in the chain merge into one distinct fusion.
- Fusion permanent buffs are run-only modifiers stored in `S`.
- Gorgon shields do not recharge. Medusa fusion leaves a one-hit shield: 60 s recharge, 15 s shorter per later merge, minimum 15 s.
- Gunman fires every 16 ticks and gets a front bullet.
- Magician keeps the 3x3 shockwave, charge-based (2 charges, 5 s per charge, fires itself when an enemy is in range).
- Keys remain the recruitment item. Goliath is the exception: his keys give shields.
- Keysman keeps both its old double-summon chance and the rule that recruiting a Keysman summons a non-Keysman follower.
- Raiden's remote mine detonation is oldest-first.
- Modifiers such as Dev mode, Pacifist and Glass cannon are legitimate runs, scored differently.
- Gameplay text sits at half opacity (`TEXT_ALPHA`), and nothing spawns on a text zone.
- The menus UI is a fixed 640x640 square; only the world adapts to the window.
- No info bar. Follower counts and skill bars come back on the canvas if they are missed.
- Every weapon, including the boss's damage, goes through the normal enemy paths (`enemyAt`, `damageEnemyHead`, `cutEnemy`, `strikeEnemyAt`). Keep new weapons going through those and they work on the boss for free (then add the boss rules from "Boss changes").

## Heroes and prices

| Hero      | Price / state                                   |
| --------- | ----------------------------------------------- |
| Swordsman | Free                                            |
| Magician  | 50 coins; locked at start                       |
| Gunman    | 100 coins                                       |
| Goliath   | 200 coins (built, rework planned)               |
| Summoner  | 200 coins (first version written, redesign pending) |

Unlocks are by hero id, not card index. Preserve old Gunman unlocks. `HERO_FREE`, `HERO_PRICES` and `HERO_DEFAULT_PRICE` are in `config.js`.

## Buffs

Current pool: Starting follower, +20% score, Thick skin, Quick hands, Combo keeper, Skill haste, Second wind (free revive), Welcome party, Rich, Minefield, Magician's gift, Glass cannon, Dev mode, Everything is a bomb, Pacifist, Challenge. Magician's gift, Everything is a bomb, Pacifist, Challenge, Dev mode, Glass cannon and +20% score are **locked in the shop** (`SHOP_LOCKED`) until bought. The boss reward pick draws from `BOSS_REWARD_POOL` (Thick skin, Quick hands, Combo keeper, Skill haste, Second wind, Welcome party). Temporary buffs (above) are separate from these run-start buffs.

Buff screen economy: the third card costs 1 coin, a mulligan costs 5. Both count toward `S.runSpend`.

## Economy (as built)

- Coins are scarce. A Pentakill pays 5 coins once per chain. Wave milestones (`WAVE_COINS`, waves 5, 10, 15, 20) and the boss (`BOSS_COINS`, 10) pay coins.
- Fake ads: revives and the hero-select ad button (10, 5, 2, 1 coins, back to 10 after an hour). Dev toggle `ADS_ENABLED`, player toggle "No ads".
- Retention coin tiers use coins spent in runs. The thresholds in config.js are still the old 0 / 15 / 45 / 90; the intended ones were about 0 / 5 / 12 / 25.

## Known gaps and cautions

- **Test values to check in config.js:** `BOSS_WAVE = 2` (should be 10), `AD_FREE_PRICE = 99999` (intended 1000), `HERO_PRICES = {...}` has no `const`, the `TEST ONLY` comment is duplicated.
- Leftover constants from older economies: `SECOND_WIND_BONUS`, `COIN_PER_KILL`, `COIN_PER_WAVE`, `REVIVE_COST_*` (still used when `ADS_ENABLED` is false), `BOUNTY_POINTS`, `KINGSMAN_BOUNTY_MAX`. Delete the unused ones when convenient.
- `render.js` still contains the old `drawHud`, `drawComboBar`, `drawStallHint` and `drawKeyArrow`, which `hud.js` overrides (later script wins). They can be deleted, and so can `worldToUi` / `KEY_ARROW_RADIUS` if unused.
- The Goliath `detail` text in heads.js does not yet mention his key shields or that he cannot recruit.
- The comment above `MINEFIELD_COUNT` says `MINE_MAX` is 3 (it is 8).
- With a 60x60 world, Bomber blasts reach up to 60 tiles and bullets fly across the whole world.
- Everything is a bomb can hurt the player on key/recruit contact (30%); tune `BOMB_CHANCE` if it feels punishing.
- The leaderboard accepts hobby-game scores without anti-cheat. Modifier runs share the board and are scored by their multipliers.
- The daily challenge is parked.
- The assistant cannot push to git and cannot run the game. Files are delivered as new files or copy-paste edits; the user copies them in and commits.
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
- Commit when something works, and before big AI changes. The dev plays before every commit.
- Keep raw AI art in `assets/_raw/` (git-ignored); commit only cleaned sheets.
- Say "hero", not "head", in anything the player sees. Use kaomojis in chat replies.
- Minimal UI: the game is the main attraction. Nothing outside the canvases, and all gameplay text at half opacity.
- Worried about bloat: prefer improving existing content over adding new content.

## Last session

## Last session

Built progressive room opening (`doors.js`). The world starts with only the start room open. Doorways are sealed with `D` tiles (solid). At `DOOR_WAVES` the game pauses and offers up to 3 doors (the buff pick screen, reused via `S.doorPicking`). Each door has a twist: variety (a snake type joins the pool early), cache (keys and buff blocks), swarm (snakes burst out when you walk inside) or lockdown (doors seal until its snakes are dead, with a 60 s failsafe). Closed rooms are black fog, spawns and keys only use open rooms (`roomOpenAt`, part of `tileFree`), the enemy cap grows with open rooms (`enemyCap`), and spawns and recruits have in-room fallbacks. Goliath fix skipped on purpose: he will be balanced later with mines and other things. Docs were stale: the Summoner redesign and boss pass (HP 36, orb volley, minor hits) are already in the code.

Untested: the assistant cannot run the game. Check each twist, the boss with few rooms open, and the Magician at a door. `BOSS_WAVE` is still the test value 2.

Next: a timed balance pass (tune `DOOR_WAVES` and twist weights), the config test values, then mines and fixed bombs.