# animeSnake: Handover

For whoever picks this up next (a new chat, a new session, or future you). Read this first, then [DESIGN.md](DESIGN.md) for the design and [ART_SPEC.md](ART_SPEC.md) for sprite formats.

## Snapshot

Snake, but anime: a fast roguelike where the snake is a chain of anime characters. The user's first small game, fully vibecoded (code with AI help, art and audio from other AI tools). Plain HTML, CSS and JavaScript, no build step, no server, no dependencies. Repo: https://github.com/knoxDaviber/animeSnake

**Wording:** the playable head is called a **hero** in anything the player sees. The code still says head / `HEADS` / `HEAD_DEFS` (renaming is optional and not worth the risk yet).

**Works today:** smooth Snake loop, sprites with fallbacks, rings and damage, one hazard, enemy snakes in waves, 3 heroes (Swordsman, Magician, Gunman) with a hero-select screen, 5 followers with passives, 3 follower skills, a run-start buff pick (10 buffs), recruitment (keys summon characters), the tail stall, coins and paid revives, merging into fusion followers (Miner, Keysman and Magneto families), score and combos, saved bests and coins, the Supabase top-10 leaderboard (needs the key in `config.js`), the info bar, pause and an error screen.

**Not built yet:** fusion batch 2 (Raiden and Medusa/Gorgon families plus the hero speed system, spec below), coin-gated hero unlocks, retention systems, expand-grid, rooms, audio.

## Run it

Open `src/index.html` in a browser. Sprites load from `../assets/images/`, so keep the folder structure. Controls: arrows / WASD / swipe, P or Escape pauses, I (or hold the small bar under the game) shows or hides the info bar. After dying: any key, click or tap revives (costs coins), Q / Backspace / Give up ends the run, Space or tap restarts from game over.

## Code layout (`src/`, loaded in this order by `index.html`)

| File | Owns |
|------|------|
| `config.js` | All constants and tuning numbers |
| `sprites.js` | Shared sprite sheets (`SPRITES`, `HEADS`) |
| `followers.js` | `FOLLOWERS` (5 base followers + fusions), `newSlot`, `randomFollower` (never a fusion) |
| `state.js` | The `S` object (all mutable state) and `newRun()` |
| `storage.js` | Saves best score, best combo and coins (localStorage) |
| `world.js` | `tileFree`, keys (`placeFood`), hazard, drop effects |
| `score.js` | Points, combos, kill coins, popups |
| `player.js` | Steering, `playerMove`, `takeHit` |
| `attacks.js` | Attack sheets, sword hit, bullets |
| `heads.js` | `HEAD_DEFS`: the 3 heroes, their weapons, the hero-select screen |
| `skills.js` | Follower active skills (mine, bomb, lightning, gaze) |
| `mines.js` | Mines, blast shape (`blastRange`, `blastTiles`) |
| `passives.js` | Follower passives (kill bonus, Keysman chance, Magneto pull, enemy chase) |
| `recruits.js` | Keys and recruits: summon, walk in, touch, `eatKey`, `shootRecruit` |
| `merge.js` | `mergeCheck`: three identical followers anywhere in the chain fuse |
| `buffs.js` | `BUFFS`, buff pick layout, `startRun` |
| `revive.js` | Revive countdown, revive cost, game over |
| `leaderboard.js` | Shared top 10 (Supabase) and the initials box |
| `enemies.js` | Enemy snakes, AI, damage, waves |
| `render.js` | All drawing (reads `S`, never changes it) |
| `panel.js` | The info bar |
| `input.js` | Keyboard, touch, pause |
| `main.js` | `step()`, `loop()`, start-up |

Rules of thumb: tuning numbers go in `config.js`, state goes in `S`, drawing goes in `render.js`. No loose globals. No `import`/`export` modules (they fail from `file://`).

## How one tick works (125 ms)

1. `S.tick++`, then `ageDrops`, `agePopups`, `ageBlasts`, `ageZaps`.
2. `playerMove()`.
3. If alive: `mergeCheck`, `updateCombo`, `updateSkills`, `updatePassives` (Magneto), `updateAttacks`, `updateHead` (hero weapon), `updateRecruits`, `stepEnemies`, `refreshKey`, `updateWaves`.
4. Update best, `hud()`. If dead: `saveProgress()` and `beginRevive()`.

`loop()` also calls `updateRevive()` every frame. If anything throws, a "Something broke" screen shows.

## Rules as built

- **Rings:** a hit drops the tail character; you die when a hit lands on your last one. Walls, the hazard, enemy snakes, your own body and mine blasts all count. Blocked moves leave you in place. After a hit you are immune for 8 ticks (the chain blinks). The Swordsman's shield blocks the first enemy-head hit without blinking. The Magician's walls are portals. Your own tail tile is not a hit (tail stall: you stop until you steer).
- **Heroes:** Swordsman (sword on the tile ahead, 3 damage; default every 1 s via `SWORD_COOLDOWN`), Magician (3x3 shockwave 2 tiles ahead every 10 s, 1 damage), Gunman (a bullet to each side every 6 s, 1 damage).
- **Enemies and waves:** first wave after 24 ticks; wave size `1 + wave/3` (max 5); enemies spawn on the edges, never reverse, chase 60% of the time (plus 10% per Magneto). A boxed-in enemy flips itself (its tail becomes the head); an enemy may step onto its own tail tile. Hits to kill grow with the wave (`hitsToKill`).
- **Keys and recruits:** keys are an array, `S.keys`. Eating one scores 10 and summons a random follower (never a fusion) that walks in from outside the grid, then jumps. A recruit can be touched by the hero from the moment it is on the grid, walking or ready (it also joins if it walks into your head). At most 3 wait at once; no new key drops until all keys are gone and fewer than 3 wait. Enemy heads kill recruits.
- **Merging:** three identical followers anywhere in the chain (no need to be side by side) fuse into one fusion follower in the first one's slot, so the chain loses 2 characters. Fusions are killed like any follower and cannot merge again. The base follower lists its fusion with `merge: '<id>'` in `followers.js`.
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
| Raiden | kills +5 points each; lightning every 8 s (old version) | batch 2 |
| Medusa | sword stuns +2 ticks each; gaze every 10 s (old version) | batch 2 |

## Fusion batch 2 (agreed, not built)

- **Raiden:** +10% hero speed each (max 50%). Fusion **Raiden Shogun**: +30% speed, every 5 s deals 1-3 lightning damage to the closest enemy tile (any segment).
- **Gorgon** (the current Medusa renamed; rename `followers/medusa.png` to `gorgon.png`): each gives the hero a 1-hit shield (recharge 20 s, max 5) and slows the hero 5% (max 50%). Fusion **Medusa**: enemy heads in the line you face freeze and die instantly on contact; hero slowed 10%.
- Speed and slowdown change the **hero only** (enemies and skill timers stay at normal speed). This needs a hero move timer separate from the 125 ms world tick.

## Assets (`assets/images/`)

Every object has a PNG at its final path, so art is swapped by overwriting the file. Missing sheets fall back to coloured squares.

- `characters/<name>.png`: heroes (`character1`, `magician`, `gunman`), 128x128, 4x4 directional. `character1.png` is the user's own art, never overwrite it.
- `followers/<id>.png`: miner, raiden, keysman, magneto, medusa, plus the fusions bomber, kingsman, mrx (batch 2 adds shogun and gorgon).
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
- Coins: earned per kill and wave, spent on revives. Hero unlocks come later.
- The 20x20 grid stays for now. Future idea: several rooms you can enter to expand the map, different wall types, and either floors that change hazard positions or curated dungeon-like rooms (the user leans towards curated rooms). See DESIGN.md.
- Retention hooks are deliberate (see DESIGN.md).

## Known gaps and cautions

- Nothing has been played in a real browser by the assistant. Recent changes (coins, fusions, enemy corner fix, shield flash, recruit touching, any-order merging) are untested.
- Enemy AI is simple. The corner fix lets a boxed-in snake flip itself; if enemies still get stuck, note where.
- Anyone can post a fake score from the console. Accepted for a hobby game.
- The assistant cannot push to git. Files are delivered as edits; the user copies them in and commits.
- Docs mention HEADS/HEAD_DEFS because the code uses those names.

## Working preferences

- Ask a clarifying question on vague instructions.
- Give copy-paste edits with exact Ctrl+F find text and where it goes. Do not resend whole files unless needed.
- Write a short handover after long code sessions.
- Code split across files, not one big file.
- Commit when something works, and before big AI changes.
- Keep raw AI art in `assets/_raw/` (git-ignored); commit only cleaned sheets.
- Say "hero", not "head", in anything the player sees. Use kaomojis in chat replies.
