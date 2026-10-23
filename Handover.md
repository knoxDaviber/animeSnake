# animeSnake: Handover

For whoever picks this up next (a new chat, a new session, or future you). Read this first, then [DESIGN.md](DESIGN.md) for the design and [ART_SPEC.md](ART_SPEC.md) for sprite formats.

## Snapshot

Snake, but anime: a fast roguelike where the snake is a chain of anime characters. The user's first small game, fully vibecoded (code with AI help, art and audio from other AI tools). Plain HTML, CSS and JavaScript, no build step, no server, no dependencies. Repo: https://github.com/knoxDaviber/animeSnake

**Wording:** the playable head is called a **hero** in anything the player sees. The code still says head / `HEADS` / `HEAD_DEFS` (renaming is optional and not worth the risk yet).

**Works today:** smooth Snake loop, sprites with fallbacks, rings and damage, one hazard, enemy snakes in waves, 3 heroes (Swordsman, Magician, Gunman) with a hero-select screen, 5 followers with passives, follower skills (mines, Shogun lightning), a run-start buff pick (10 buffs), recruitment (keys summon characters), the tail stall, coins and paid revives, merging into fusion followers (all five families: Miner, Keysman, Magneto, Raiden, Gorgon), the hero speed system, score and combos, saved bests and coins, the Supabase top-10 leaderboard (needs the key in `config.js`), the title screen that is the hero select screen (random title and splash line), coin-gated hero unlocks, the on-canvas score / wave / coins display, the info bar, pause and an error screen.

**Not built yet:** retention systems, mine kicking, expand-grid, rooms, audio.

## Run it

Open `src/index.html` in a browser. Sprites load from `../assets/images/`, so keep the folder structure. Controls: arrows / WASD / swipe, P or Escape pauses, I (or hold the small bar under the game) shows or hides the info bar. After dying: any key, click or tap revives (costs coins), Q / Backspace / Give up ends the run, Space or tap restarts from game over. The game opens on the hero select screen (and returns to it after game over): tap a card, or press 1-9, or use the arrows and Enter. Tapping a locked hero buys it if you have the coins.

## Code layout (`src/`, loaded in this order by `index.html`)

| File | Owns |
|------|------|
| `config.js` | All constants and tuning numbers |
| `sprites.js` | Shared sprite sheets (`SPRITES`, `HEADS`) |
| `followers.js` | `FOLLOWERS` (5 base followers + fusions), `newSlot`, `randomFollower` (never a fusion) |
| `state.js` | The `S` object (all mutable state) and `newRun()` |
| `storage.js` | Saves best score, best combo, coins and unlocks (localStorage) |
| `unlocks.js` | Click-to-buy unlocks: `isUnlocked`, `tryUnlock`, `heroPrice` |
| `world.js` | `tileFree`, keys (`placeFood`), hazard, drop effects |
| `score.js` | Points, combos, kill coins, popups |
| `player.js` | Steering, `playerMove`, `takeHit` |
| `attacks.js` | Attack sheets, sword hit, bullets |
| `heads.js` | `HEAD_DEFS`: the 3 heroes, their weapons, the hero-select layout and `chooseHead` (which also buys locked heroes) |
| `skills.js` | Follower active skills (mine, bomb, Shogun lightning) |
| `mines.js` | Mines, blast shape (`blastRange`, `blastTiles`) |
| `passives.js` | Follower passives (Keysman chance, Magneto pull, enemy chase), `heroSpeed()`, Gorgon shields, Medusa freeze |
| `recruits.js` | Keys and recruits: summon, walk in, touch, `eatKey`, `shootRecruit` |
| `merge.js` | `mergeCheck`: three identical followers anywhere in the chain fuse |
| `buffs.js` | `BUFFS`, buff pick layout, `startRun` |
| `revive.js` | Revive countdown, revive cost, game over |
| `leaderboard.js` | Shared top 10 (Supabase) and the initials box |
| `enemies.js` | Enemy snakes, AI, damage, waves |
| `render.js` | All drawing, including the title screen and the on-canvas score / wave / coins (reads `S`, never changes it). `hud()` now only refreshes the info bar |
| `panel.js` | The info bar |
| `input.js` | Keyboard, touch, pause |
| `main.js` | `step()` (world tick), `heroStep()` (hero move), `loop()`, start-up |

Rules of thumb: tuning numbers go in `config.js`, state goes in `S`, drawing goes in `render.js`. No loose globals. No `import`/`export` modules (they fail from `file://`).

## How the clocks work

The game has two fixed clocks, both run from `loop()` in `main.js`. Each frame the hero clock goes first.

**Hero move (`heroStep`)**, every `heroInterval()` ms = `TICK_MS / heroSpeed()` (125 ms at speed 1; see Hero speed below): `playerMove()`, `hud()`, `checkDeath()`. The player is drawn with its own progress value, `S.heroAlpha` (everything else uses `S.alpha`).

**World tick (`step`)**, every 125 ms:
1. `S.tick++`, the immunity countdown, then `ageDrops`, `agePopups`, `ageBlasts`, `ageZaps`.
2. If alive: `mergeCheck`, `updateCombo`, `updateSkills` (then `S.tailLeft` is cleared), `updatePassives` (Magneto pull, Gorgon recharge, Medusa freeze), `updateAttacks`, `updateHead` (hero weapon), `updateRecruits`, `stepEnemies`, `refreshKey`, `updateWaves`.
3. Update best, `hud()`, `checkDeath()` (if dead: `saveProgress()` and `beginRevive()`).

`loop()` also calls `updateRevive()` every frame. Pause, revive and run start reset both clocks (`S.last`, `S.heroLast`). If anything throws, a "Something broke" screen shows.

## Rules as built

- **Rings:** a hit drops the tail character; you die when a hit lands on your last one. Walls, the hazard, enemy snakes, your own body and mine blasts all count. Blocked moves leave you in place. After a hit you are immune for 8 ticks (the chain blinks). The Swordsman's shield blocks the first enemy-head hit without blinking. The Magician's walls are portals. Your own tail tile is not a hit (tail stall: you stop until you steer).
- **Heroes:** Swordsman (sword on the tile ahead, 3 damage; default every 1 s via `SWORD_COOLDOWN`), Magician (3x3 shockwave 2 tiles ahead every 10 s, 1 damage), Gunman (a bullet to each side every 6 s, 1 damage).
- **Enemies and waves:** first wave after 24 ticks; wave size `1 + wave/3` (max 5); enemies spawn on the edges, never reverse, chase 60% of the time (plus 10% per Magneto). A boxed-in enemy flips itself (its tail becomes the head); an enemy may step onto its own tail tile. Hits to kill grow with the wave (`hitsToKill`).
- **Keys and recruits:** keys are an array, `S.keys`. Eating one scores 10 and summons a random follower (never a fusion) that walks in from outside the grid, then jumps. A recruit can be touched by the hero from the moment it is on the grid, walking or ready (it also joins if it walks into your head). At most 3 wait at once; no new key drops until all keys are gone and fewer than 3 wait. Enemy heads kill recruits.
- **Merging:** three identical followers anywhere in the chain (no need to be side by side) fuse into one fusion follower in the first one's slot, so the chain loses 2 characters. Fusions are killed like any follower and cannot merge again. The base follower lists its fusion with `merge: '<id>'` in `followers.js`.
- **Hero speed:** `heroSpeed()` = 1 + Raiden (+10% each, max +50%) + Shogun (+30% each) - Gorgon (5% each, max 50%) - Medusa (10% each), kept between 0.4 and 1.8. `HERO_SPEED_TEST` in `config.js` multiplies it for testing (keep it at 1). It changes the **hero only**: enemies, skill timers and animations stay on the 125 ms world tick.
- **Gorgon shields:** each Gorgon (the first 5 in the chain) holds a 1-hit shield that blocks any hit without blinking, then recharges for 20 s (`slot.cd`). The Swordsman's block is used first.
- **Coins:** +3 per kill, +5 per wave started, kept between runs. A revive costs 15, then 30, 45... (`REVIVE_COST_*`). If you cannot afford it, you go straight to game over.
- **Score:** key 10, cut segment 5, kill 20 x combo (cap x5). Combo window 24 ticks.
- **Run start:** pick a hero, then one of 3 random buffs from 10 (Extra follower, +10% score, Thick skin, Quick hands, Combo keeper, Skill haste, Bounty hunter, Second wind, Welcome party, Minefield).
- **Revive and leaderboard:** 10 s countdown after dying, bonus +10% of score, 24 ticks of immunity. The shared top 10 is fetched when the run really ends; beating 10th place opens the initials box. Failures are quiet.

## Followers and fusions (current)

| Follower | Now | Fusion (3 of them) |
|----------|-----|--------------------|
| Miner | +1 mine blast arm length each; mine every 8 s each (max 5 mines) | **Bomber**: blast arms reach the map edge (a + shape); mine every 5 s |
| Keysman | +10% each (max 50%) that a key summons 2 characters | **Kingsman**: key drops are 1-3 keys; Keysman 40% likelier to be summoned |
| Magneto | pulls keys up to 4 tiles; enemies chase you more | **Mr.X**: eats keys within 3x3 of your hero; new recruits are rejected and shot at the nearest snake for 2-5 damage |
| Raiden | +10% hero speed each (max +50%) | **Raiden Shogun**: +30% hero speed; every 5 s lightning hits the closest enemy tile (any segment) for 1-3 damage |
| Gorgon | 1-hit shield each (max 5, recharge 20 s); slows the hero 5% each (max 50%) | **Medusa**: enemy heads in the line you face freeze; any enemy head you touch dies at once; hero slowed 10% |

## Title screen and hero unlocks (built)

- `newRun()` always starts on the hero select screen (`S.headPicking`), so it is also the title screen: at game start and after every game over. `drawHeadPick` (render.js) draws it, `headLayout` / `headCardRect` / `chooseHead` (heads.js) lay it out and act on it, and input.js handles taps (`tapCard`), keys 1-9, arrows and Enter.
- `unlocks.js` is generic: `isUnlocked(kind, id, price)` and `tryUnlock(kind, id, price)`. `heroPrice(id)` reads `HERO_FREE`, `HERO_PRICES` and `HERO_DEFAULT_PRICE` in config.js. Bought ids live in `S.unlocked[kind]` and are saved by storage.js under `unlocked` (ids, not indexes; old saves without it load with nothing bought, so Gunman is locked).
- Clicking a locked card calls `tryUnlock` and never starts the run. A note shows on the card (`S.cardNote`, `CARD_NOTE_MS`).
- Layout: up to 3 heroes are big cards, 4 to 8 a compact grid (`HERO_GRID_COLS` per row). In the grid the first tap focuses a card and the second acts.
- The title is `S.titleText` ("animeSnake", or "Snake-lite" with chance `TITLE_ALT_CHANCE`) and the splash line is `S.splashText`, picked from `SPLASHES`. Both are rolled in `newRun()`.
- To add a hero: one `HEAD_DEFS` entry, its sheet name in `HEADS` (sprites.js), and optionally a price in `HERO_PRICES`. A hero not in `HERO_FREE` is locked by default.
- Testing: `TEST_START_COINS` and `TEST_RELOCK` in config.js, marked TEST ONLY. Keep them at 0 / false and remove them later.
- Phones send a fake mouse click after a tap, so `mousedown` ignores clicks within 700 ms of a touch (`S.lastTouchAt`).
- The numbers are drawn on the canvas (`drawHud` in render.js). Hard rule: nothing may sit above the canvas where it could move or resize the game. The info bar line is fixed height, one line, ellipsised.

## Hero speed (built)

Raiden, Shogun, Gorgon and Medusa all work through `heroSpeed()` in `passives.js`. The hero has its own move timer (`S.heroLast`, `heroStep()` in `main.js`), so speed changes never touch enemies or skill timers.

## Assets (`assets/images/`)

Every object has a PNG at its final path, so art is swapped by overwriting the file. Missing sheets fall back to coloured squares.

- `characters/<name>.png`: heroes (`character1`, `magician`, `gunman`), 128x128, 4x4 directional. `character1.png` is the user's own art, never overwrite it.
- `followers/<id>.png`: miner, raiden, keysman, magneto, gorgon (was medusa), plus the fusions bomber, kingsman, mrx, shogun, medusa (the new fusion). `tools/make_placeholders.py` draws a placeholder for each one that is missing.
- `enemies/enemy_head.png`, `enemy_body.png`; `attacks/slash_sword.png` (256x41, 4 frames of 64x41); `food.png` (the key), `hazard.png`, `mine.png`, `recruit.png` (128x32, 4 frames).

## Leaderboard setup (one time)

1. In Supabase, SQL Editor: run all of `tools/supabase_setup.sql` (if you set it up earlier with the keep-10 version, run `tools/supabase_keep50.sql` once).
2. Copy the **publishable** key (`sb_publishable_...`) into `LEADERBOARD.key` in `config.js`. Never the secret or service_role key.
3. Commit and push; play to the game-over screen to check "TOP 10" appears.

## Decisions the user has confirmed

- Heroes attack automatically in the facing direction; followers are the body with passives and skills.
- Keys plus characters replace food growth. A hit takes the tail character; losing the last one kills you.
- Fusions are completely different characters, not stronger copies, and each merge combination gives its own fusion.
- Merging does not need strict order.
- Speed and slowdown change the hero only, never enemies or skill timers.
- Coins: earned per kill and wave, spent on revives and on hero unlocks.
- The 20x20 grid stays for now. Future idea: several rooms you can enter to expand the map, different wall types, and either floors that change hazard positions or curated dungeon-like rooms (the user leans towards curated rooms). See DESIGN.md.
- Retention hooks are deliberate (see DESIGN.md).
- The title screen is the hero select screen, with no separate menu. Locked heroes are bought by clicking them. The title is "animeSnake" or, half the time, "Snake-lite", with a Minecraft-style splash joke.
- Score, wave and coins are drawn on the canvas. Best score and best combo are on the game-over screen.

## Ideas for later (not decided)

- **Kick the mines:** a kicked mine slides in the facing direction and explodes the moment it touches anything. Open questions: who kicks (the hero by walking into a mine, or a follower or fusion such as the Bomber?), how fast and how far it slides, what counts as "anything" (enemy segments, your own chain, walls, the hazard, keys, recruits, other mines), whether the blast can hurt you, and whether kicking uses a cooldown. Mines currently only go off when a snake head steps on them (`detonateMine` in `mines.js` can be reused for the explosion).

- **More title-screen sections:** Followers (choose which can appear in a run) and Upgrades, with locked items bought by clicking them, reusing `unlocks.js`. Not built.

## Known gaps and cautions

- Nothing has been played in a real browser by the assistant. Recent changes (coins, fusions, enemy corner fix, shield flash, recruit touching, any-order merging) are untested.
- Batch 2: the hero speed system has been checked in a browser. Raiden/Shogun lightning and Gorgon shields / Medusa freeze still need a proper play-through. Delete this line once they are tested.
- The title screen, unlocks and the on-canvas display are untested in a real browser (by the assistant).
- Enemy AI is simple. The corner fix lets a boxed-in snake flip itself; if enemies still get stuck, note where.
- Anyone can post a fake score from the console. Accepted for a hobby game.
- The assistant cannot push to git. Files are delivered as edits; the user copies them in and commits.
- Docs mention HEADS/HEAD_DEFS because the code uses those names.

## Working preferences

- Ask a clarifying question on vague instructions.
- Give copy-paste edits with exact Ctrl+F find text and where it goes. Do not resend whole files unless needed. For the docs (Handover, DESIGN, README), give the full files.
- Write a short handover after long code sessions.
- Code split across files, not one big file.
- Commit when something works, and before big AI changes.
- Keep raw AI art in `assets/_raw/` (git-ignored); commit only cleaned sheets.
- Say "hero", not "head", in anything the player sees. Use kaomojis in chat replies.

## Last session

Built build-order step 8: the title screen is the hero select screen (random title and splash), coin-gated hero unlocks (Gunman 40 coins), and the on-canvas display replacing the row above the canvas. To check in a browser: play to game over and back to hero select, buy Gunman with `TEST_START_COINS = 100`, try 5 to 8 heroes in the grid, and watch that the canvas never moves when numbers or the info bar line change. Next: retention systems, or rooms and wall types (see DESIGN.md).
