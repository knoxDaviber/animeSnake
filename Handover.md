# animeSnake: Handover

For whoever picks this up next (a new chat, a new session, or future you). Read this first, then [DESIGN.md](DESIGN.md) for the design and [ART_SPEC.md](ART_SPEC.md) for sprite formats.

## Snapshot

Snake, but anime: a fast roguelike where the snake is a chain of anime characters. The user's first small game, fully vibecoded (code with AI help, art and audio from other AI tools). Plain HTML, CSS and JavaScript, no build step, no server, no dependencies. Repo: https://github.com/knoxDaviber/animeSnake

**Wording:** the playable head is called a **hero** in anything the player sees. The code still says head / `HEADS` / `HEAD_DEFS` (renaming is optional and not worth the risk yet).

**Works today (Tiers 1 and 2 are written but NOT yet play-tested in a browser):** smooth Snake loop, sprites with fallbacks, rings and damage, one hazard, enemy snakes in waves, 3 heroes (Swordsman, Magician, Gunman) with a hero-select screen, 5 followers with passives, follower skills (mines, Shogun lightning, Raiden remote detonation), recruitment (keys summon characters), the tail stall, merging into fusion followers (all five families) with run-long fusion modifiers, the hero speed system, score and combos, saved bests and coins, the Supabase top-10 leaderboard, the title screen that is the hero select screen (flavour/detail toggle), coin-gated hero unlocks, the on-canvas HUD, placeholder sound, the info bar, pause and an error screen, retention systems, tap-zone touch controls, and the Batch B systems below.

**Batch B (latest):**
- Two-entry input buffer (`INPUT_BUFFER`, `S.dirQueue`) and a grace tick (`GRACE_TICKS`, 0 or 1) that forgives the first wall or body bump.
- Flag buffs in `buffs.js`: Magician's gift (portals, `GIFT_PORTALS_PER_WAVE` per wave, reset in `updateWaves`), Glass cannon (`weaponDamage()` in heads.js, one hit kills), Dev mode (one step per key press; held keys step via `HELD`/`heldDir()` in input.js and `playerMove`), Everything is a bomb (`bombContact()` in mines.js, `BOMB_CHANCE` 0.3).
- Second wind is now one free revive (`S.freeRevive`, `reviveCost()` returns 0).
- Modifier score multipliers: `GLASS_SCORE_MULT`, `DEV_SCORE_MULT`, `BOMB_SCORE_MULT` (guesses, tune them).
- Buff screen: the third card starts locked (1 coin, `THIRD_CARD_COST`), and a mulligan (R key or button, 5 coins, `MULLIGAN_COST`) rerolls the cards. Both call `spendCoins()`, which adds to `S.runSpend` for the retention coin tiers.

**Not built yet:** speed rework (halved base speed, enemy move timers), timed waves, enemies eating keys/recruits, the fake-ad revive and scarce-coin economy, Pacifist and Challenge, hero levelling, title-screen shop, larger scrolling map, new enemy types, temporary buff drops, kickable projectiles, Goliath, Summoner, rooms/walls/hazard templates, the wave 10 boss, and the later wizard. Real audio files and final sprites are also still pending.

## Run it

Open `src/index.html` in a browser. Sprites load from `../assets/images/`, so keep the folder structure. Controls: arrows / WASD / swipe / tap zones (see Touch controls), P or Escape pauses, I (or hold the small bar under the game) shows or hides the info bar. On the buff screen: 1/2/3 or arrows and Enter pick, R is the mulligan.

The game opens on the hero select screen. Swordsman is free; Magician is locked at 50 coins, Gunman costs 100, and Goliath/Summoner will cost 200. Old saves that already own Gunman retain that unlock.

The revive flow is still the old coin-priced one (15 coins, +15 per revive) and is being replaced by the fake-ad system. Do not treat the old rules as the target.

## Code layout (`src/`, loaded in this order by `index.html`)

| File             | Owns                                                                                   |
| ---------------- | -------------------------------------------------------------------------------------- |
| `config.js`      | All constants and tuning numbers                                                       |
| `sprites.js`     | Shared sprite sheets (`SPRITES`, `HEADS`)                                              |
| `followers.js`   | `FOLLOWERS` (5 base followers + fusions), `newSlot`, `randomFollower` (never a fusion) |
| `state.js`       | The `S` object (all mutable state) and `newRun()`                                      |
| `storage.js`     | Saves best score, best combo, best wave, coins, unlocks and retention data             |
| `unlocks.js`     | Click-to-buy unlocks: `isUnlocked`, `tryUnlock`, `heroPrice`                           |
| `audio.js`       | All sound: synthesized placeholder effects and music moods                             |
| `world.js`       | `tileFree`, keys, hazard, drop effects                                                 |
| `score.js`       | Points, combos, coin rewards and popups                                                |
| `player.js`      | Steering and input queue, `playerMove` (grace, portals, Dev mode), `takeHit`           |
| `attacks.js`     | Attack sheets, sword hit, bullets                                                      |
| `heads.js`       | Hero definitions, weapons, `weaponDamage`, hero-select layout and `chooseHead`         |
| `skills.js`      | Follower active skills (mine, bomb, Shogun lightning, Raiden detonate)                 |
| `mines.js`       | Mines, blast shape, detonation, `bombContact`                                          |
| `passives.js`    | Follower passives, hero speed, Gorgon shields, Medusa freeze and shield                |
| `recruits.js`    | Keys and recruits: summon, walk in, touch, `eatKey`, `shootRecruit`                    |
| `merge.js`       | `mergeCheck`: three identical followers anywhere in the chain fuse; fusion modifiers   |
| `buffs.js`       | `BUFFS`, buff pick layout, third-card unlock, mulligan, `startRun`                     |
| `revive.js`      | Death/revive/game-over flow; target is changing to fake-ad revives                     |
| `leaderboard.js` | Shared top 10 and initials box                                                         |
| `retention.js`   | Pressure, frustration/pity and coin-tier logic                                         |
| `enemies.js`     | Enemy snakes, AI, damage and waves                                                     |
| `render.js`      | All drawing, including title screen, buff screen and HUD                               |
| `panel.js`       | Info bar                                                                               |
| `input.js`       | Keyboard (with `HELD` keys), touch, swipe/tap zones, mulligan and pause                |
| `main.js`        | `step()`, `heroStep()`, `loop()` and start-up                                          |

Rules of thumb: tuning numbers go in `config.js`, state goes in `S`, drawing goes in `render.js`. No loose globals. No `import`/`export` modules (they fail from `file://`).

## Clocks

The current game has a 125 ms world tick and a separate hero movement timer.

- `heroStep` runs on `heroInterval()` based on `heroSpeed()`.
- `step` advances the world, skills, attacks, recruits, enemies and waves.
- The speed rework will halve the base hero speed and give enemies their own movement timers.
- Enemy/food speed changes should not silently change skill timers.
- Grace and the input queue count hero moves, not world ticks.

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
- Retention coin tiers and revive costs still use the old numbers until the economy batch.

## Heroes and prices

| Hero      | Price / state             |
| --------- | ------------------------- |
| Swordsman | Free                      |
| Magician  | 50 coins; locked at start |
| Gunman    | 100 coins                 |
| Goliath   | 200 coins                 |
| Summoner  | 200 coins                 |

Unlocks are by hero id, not card index. Preserve old Gunman unlocks.

## Buffs

Current pool: Starting follower, +20% score, Thick skin, Quick hands, Combo keeper, Skill haste, Second wind (free revive), Welcome party, Rich, Minefield, Magician's gift, Glass cannon, Dev mode, Everything is a bomb. Bounty hunter is removed. The pity boost (`startFollower`) stays, because starting with zero followers makes it materially more useful.

Buff screen economy: the third card costs 1 coin to reveal, a mulligan costs 5. Both count toward `S.runSpend`.

Known loose ends: `SECOND_WIND_BONUS`, `COIN_PER_KILL`, `COIN_PER_WAVE` and the `revive` coin costs are leftovers from the old economy. Delete or replace them in the economy batch. The Rich buff pays 10% of coins earned at the run's end.

## Economy (target)

The old "+3 per kill, +5 per wave, coin-priced revive" economy is obsolete.

- Coins are scarce.
- A Pentakill can pay **5 coins** as a hidden mini-sidequest. It is a once-per-chain bonus, not 5 coins per kill.
- Wave milestones and bosses provide most of the normal run income.
- Fake ads handle revives.
- Hero-select ad button: 10, 5, 2, 1 coins, then back to 10 after an hour.
- Dev-side ad toggle and 1000-coin player toggle.
- Joke ads are absurd fake products with no tracking.
- Retention coin tiers stay, but use coins spent in runs. Initial threshold idea: 0 / 5 / 12 / 25 over five runs (config still has 0 / 15 / 45 / 90).

## Movement and map

The intended movement feel is still unmistakably Snake.

Built: input queue, grace tick, Dev mode stepping. Still to try: an instant reverse for a one-segment hero, a temporary Ghost Body buff, and halved base speed to improve reaction time.

Map direction:

- Make the world larger than the viewport.
- Use a **scrolling camera first**.
- Keep room-snap/Zelda-style framing compatible with the same world/room architecture for later.
- Do not add an edge arrow for keys initially; searching is intentional.
- Recruits should spawn near the player, not from the far world edge.
- Room templates are curated rather than fully procedural.
- Walls and hazard templates are part of the room/map work.

## Waves and enemies

Target wave system:

- Early wave timing around 10 s, around 30 s by wave 10, around 60 s by wave 20.
- Cap live enemies.
- No new regular snakes during boss fights; pause the wave timer during boss fights.
- Enemies can eat keys and recruits, then grow and speed up.
- Add fast thin snakes, armored heads and spitters in later wave bands.
- Room templates can favour enemy types.

## Goliath and kicking

One kickable-projectile system should support both the mine-kick idea and Goliath.

- Any contact from a non-facing tile hurts him. Front contact is harmless, including walls, hazard and enemy heads. Mines kill him regardless.
- "Back" means the tile behind his head / any direction he is not facing.
- Goliath is 0.75x the halved base speed.
- Food shields, follower walk-in every 5 kicks, fusion reversion on wall kicks and other kick rules depend on the shared kick system.

## Summoner

Tier 4/hard work. Followers become autonomous agents. Normal summons live for 8 s, fusion summons for 5 s (Medusa freezes and chases, for example). Context AI chooses useful behaviour.

## Bosses

**Wave 10: giant snake (build first).** Gridless, swaps head and tail when hit, eats other snakes, no new regular snakes during the fight. Boss rewards reuse the buff-pick screen. Payouts are tuning targets.

**Wave 20: wizard (build much later).** Teleports, persistent map-wide laser, forcefield pushes the player out, can fire across rooms. Needs the larger map/room support first.

## Challenge and Pacifist

**Challenge:** separate win screen; 100-coin reward; intentionally difficult. Modifier runs stay on the leaderboard with their own scoring multiplier.

**Pacifist:** normal Snake-style avoidance. No combat. Enemies are solid but do not damage you. Score through keys, recruits, merges and waves survived. Add a stuck detector and decide the exact goal during implementation.

## Build order

Tiers 1 and 2 are done. Remaining:

1. **Batch C, pacing foundation:** speed rework (17), timed waves (18), enemies eating (19).
2. **Batch D, economy:** fake ads, scarce coins, Pentakill, retention coin-tier input (20).
3. **Batch E, modes:** Pacifist and Challenge (16).
4. **Batch F:** hero levelling (21), title-screen shop (22).
5. **Map:** larger scrolling world, enemy types, temporary buff blocks, rooms/walls/hazards (25).
6. **Kick physics** (23), then **Goliath** and **Summoner** (24, 26).
7. **Bosses:** wave 10 snake first; wizard much later (27, 28).

## Files likely to change next (Batch C)

`config.js`, `state.js`, `main.js`, `passives.js`, `enemies.js`, `recruits.js`, `world.js`, `panel.js`, `audio.js`.

## Known gaps and cautions

- Tier 1 and Tier 2 have not been verified in a real browser; they are design targets until play-tested.
- The old retention implementation needs migration from revive spending to run spending.
- The old coin rewards/revive costs must not survive accidentally when the economy is rebuilt.
- Old saves must preserve any existing Gunman unlock.
- Exact speed bonus numbers, modifier score multipliers, boss payouts, ad timing, Pacifist goal, room templates and kick physics need play-testing.
- Everything is a bomb can hurt the player on key/recruit contact (30%); tune `BOMB_CHANCE` if it feels punishing.
- The daily challenge is parked and should not block the main roadmap.
- The leaderboard currently accepts hobby-game scores without anti-cheat protection.
- The assistant cannot push to git. Files are delivered as edits; the user copies them in and commits.
- Docs mention HEADS/HEAD_DEFS because the code uses those names.

## Working preferences

- Ask a clarifying question on vague instructions.
- Give copy-paste edits with exact Ctrl+F find text and where it goes. For the docs (Handover, DESIGN, README), give the full files.
- Write a short handover after long code sessions.
- Code split across files, not one big file.
- Commit when something works, and before big AI changes.
- Keep raw AI art in `assets/_raw/` (git-ignored); commit only cleaned sheets.
- Say "hero", not "head", in anything the player sees. Use kaomojis in chat replies.

## Last session

Batch A (Tier 2 items 10-13: fusion run modifiers, Raiden remote detonation, Keysman rule, Magician charges) and Batch B (items 9, 14, 15, described above) were written. Dev mode holds were added afterwards (tracked held keys). Nothing is play-tested yet. Next: play-test and commit, then Batch C (items 17, 18, 19).