# animeSnake: Handover

For whoever picks this up next (a new chat, a new session, or future you). Read this first, then [DESIGN.md](DESIGN.md) for the design and [ART_SPEC.md](ART_SPEC.md) for sprite formats.

## Snapshot

Snake, but anime: a fast roguelike where the snake is a chain of anime characters. The user's first small game, fully vibecoded (code with AI help, art and audio from other AI tools). Plain HTML, CSS and JavaScript, no build step, no server, no dependencies. Repo: https://github.com/knoxDaviber/animeSnake

**Wording:** the playable head is called a **hero** in anything the player sees. The code still says head / `HEADS` / `HEAD_DEFS` (renaming is optional and not worth the risk yet).

**Works today:** smooth Snake loop, sprites with fallbacks, rings and damage, one hazard, enemy snakes in waves, 3 heroes (Swordsman, Magician, Gunman) with a hero-select screen, 5 followers with passives, follower skills (mines, Shogun lightning), a run-start buff pick, recruitment (keys summon characters), the tail stall, coins and paid revives, merging into fusion followers (all five families), the hero speed system, score and combos, saved bests and coins, the Supabase top-10 leaderboard, the title screen that is the hero select screen, coin-gated hero unlocks, the on-canvas score / wave / coins display, placeholder sound effects and music, the info bar, pause and an error screen, retention systems (high-score pressure, frustration meter with pity boost, coin tiers and boast hooks), and tap-zone touch controls next to swiping.

**Not built yet:** the new economy/ad revive system, larger scrolling map, movement-feel buffer/grace, timed waves, enemies eating keys/recruits, new enemy types, temporary buff drops, hero levelling, title-screen shop, kickable projectiles, Goliath, Summoner, rooms/walls/hazard templates, the wave 10 boss, and the later wizard. Real audio files and final sprites are also still pending.

## Run it

Open `src/index.html` in a browser. Sprites load from `../assets/images/`, so keep the folder structure. Controls: arrows / WASD / swipe / tap zones (see Touch controls), P or Escape pauses, I (or hold the small bar under the game) shows or hides the info bar.

The game opens on the hero select screen. Swordsman is free; Magician is now intended to start locked at 50 coins, Gunman costs 100, and Goliath/Summoner will cost 200. Old saves that already own Gunman retain that unlock.

After dying, the revive flow is being replaced by the fake-ad system. The old coin-priced revive rules should not be treated as the target implementation.

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
| `player.js`      | Steering, `playerMove`, `takeHit`                                                      |
| `attacks.js`     | Attack sheets, sword hit, bullets                                                      |
| `heads.js`       | Hero definitions, weapons, hero-select layout and `chooseHead`                         |
| `skills.js`      | Follower active skills (mine, bomb, Shogun lightning)                                  |
| `mines.js`       | Mines, blast shape and detonation                                                      |
| `passives.js`    | Follower passives, hero speed, Gorgon shields, Medusa freeze                           |
| `recruits.js`    | Keys and recruits: summon, walk in, touch, `eatKey`, `shootRecruit`                    |
| `merge.js`       | `mergeCheck`: three identical followers anywhere in the chain fuse                     |
| `buffs.js`       | `BUFFS`, buff pick layout, `startRun`                                                  |
| `revive.js`      | Death/revive/game-over flow; target is changing to fake-ad revives                     |
| `leaderboard.js` | Shared top 10 and initials box                                                         |
| `retention.js`   | Pressure, frustration/pity and coin-tier logic                                         |
| `enemies.js`     | Enemy snakes, AI, damage and waves                                                     |
| `render.js`      | All drawing, including title screen and HUD                                            |
| `panel.js`       | Info bar                                                                               |
| `input.js`       | Keyboard, touch, swipe/tap zones and pause                                             |
| `main.js`        | `step()`, `heroStep()`, `loop()` and start-up                                          |

Rules of thumb: tuning numbers go in `config.js`, state goes in `S`, drawing goes in `render.js`. No loose globals. No `import`/`export` modules (they fail from `file://`).

## Clocks

The current game has a 125 ms world tick and a separate hero movement timer.

- `heroStep` runs on `heroInterval()` based on `heroSpeed()`.
- `step` advances the world, skills, attacks, recruits, enemies and waves.
- The speed rework will halve the base hero speed and give enemies their own movement timers.
- Enemy/food speed changes should not silently change skill timers.

## Rules to preserve

- Heroes attack automatically in the facing direction; steering is aiming.
- Heroes start with **zero followers**.
- A hit removes the tail character; losing the last character kills the run.
- Three identical followers anywhere in the chain merge into one distinct fusion.
- Fusion permanent buffs are run-only modifiers.
- Gorgon shields stop recharging under the new rules.
- Gunman fires every 16 ticks and gets a front bullet.
- Magician uses a piercing fireball rather than the old shockwave.
- Keys remain the recruitment item; eating a key summons a follower rather than directly growing the chain.
- Keysman keeps both its old double-summon chance and the new rule that recruiting a Keysman summons a non-Keysman follower.
- Raiden's remote mine detonation is oldest-first.
- Modifiers such as Dev mode, Pacifist and Glass cannon are legitimate runs; they are scored differently rather than removed from the leaderboard.

## Heroes and prices

| Hero      | Price / state             |
| --------- | ------------------------- |
| Swordsman | Free                      |
| Magician  | 50 coins; locked at start |
| Gunman    | 100 coins                 |
| Goliath   | 200 coins                 |
| Summoner  | 200 coins                 |

Unlocks are by hero id, not card index. Preserve old Gunman unlocks.

## Buff cleanup

Target buff changes:

- Extra follower → Starting follower.
- +10% score → +20% score.
- Remove Bounty hunter.
- Add Get Rich Quick.
- Second wind = free revive.
- Add/retain flag-style buffs: Magician's gift, Glass cannon, Dev mode, Everything is a bomb.
- The pity boost remains, because starting with zero followers makes it materially more useful.

## Economy

The old "+3 per kill, +5 per wave, coin-priced revive" economy is obsolete.

Target direction:

- Coins are scarce.
- A Pentakill can pay **5 coins** as a hidden mini-sidequest. It is a once-per-chain bonus, not 5 coins per kill.
- Wave milestones and bosses provide most of the normal run income.
- Fake ads handle revives.
- Hero-select ad button: 10, 5, 2, 1 coins, then back to 10 after an hour.
- Dev-side ad toggle and 1000-coin player toggle.
- Joke ads are absurd fake products with no tracking.
- Buff screen: 1 coin for the third card, 5 coins for a mulligan.
- Retention coin tiers stay, but use coins spent in runs rather than revive coins spent. Initial threshold idea: 0 / 5 / 12 / 25 over five runs.

## Movement and map

The intended movement feel is still unmistakably Snake.

First experiments:

1. Two-entry input buffer, so quick taps queue rather than overwrite.
2. `GRACE_TICKS = 0 or 1` coyote/grace tick before a wall/body collision lands.
3. Consider an instant reverse for a one-segment hero.
4. Temporary Ghost Body buff can remove self-collision for followers without permanently removing the chain's snake behaviour.
5. Halve base speed to improve reaction time.

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

- Early wave timing around 10 s.
- Around 30 s by wave 10.
- Around 60 s by wave 20.
- Cap live enemies.
- No new regular snakes during boss fights.
- Pause the wave timer during boss fights.
- Enemies can eat keys and recruits, then grow and speed up.
- Add fast thin snakes, armored heads and spitters in later wave bands.
- Room templates can favour enemy types.

## Goliath and kicking

One kickable-projectile system should support both the mine-kick idea and Goliath.

Goliath rules:

- Any contact from a non-facing tile hurts him.
- Front contact is harmless, including walls, hazard and enemy heads.
- Mines kill him regardless.
- "Back" means the tile behind his head / any direction he is not facing.
- Goliath is 0.75x the halved base speed.
- Food shields, follower walk-in every 5 kicks, fusion reversion on wall kicks and other kick rules depend on the shared kick system.

## Summoner

Summoner is Tier 4/hard work.

- Followers become autonomous agents.
- Normal summons live for 8 s.
- Context AI chooses useful movement/behaviour.
- Fusion summons last 5 s.
- Example: Medusa freezes and chases.

## Bosses

### Wave 10: giant snake

Build this first.

- Gridless giant snake.
- Swaps head and tail when hit.
- Eats other snakes.
- No new regular snakes arrive during the fight.
- Boss rewards should reuse the existing buff-pick screen; a relic/buff reward is a good target.
- Any boss payout is a tuning target; the earlier 10-coin wave-10 idea is not locked.

### Wave 20: wizard

Build much later.

- Teleports.
- Persistent map-wide laser.
- Forcefield pushes the player out.
- Can fire across rooms.
- Needs the larger map/room support first.

## Retention

Keep the existing high-score pressure and frustration meter/pity boost.

Change only the coin-tier input:

- Old input: revive coins spent.
- New input: coins spent in runs, especially buff-screen purchases.
- Principle: players who spend more in runs earn more later; players who spend little earn less.
- Tune thresholds after the buff screen exists.

## Challenge and Pacifist

**Challenge:** separate win screen; 100-coin reward; intentionally difficult and can be made harder later. Modifier runs stay on the leaderboard and receive their own scoring multiplier.

**Pacifist:** normal Snake-style avoidance. Avoid everything. No combat. Enemies are solid but do not damage you. Score through keys, recruits, merges and waves survived. Add a stuck detector and decide the exact goal during implementation.

## Build order

1. Foundation: Tier 1, movement feel, speed rework, timed waves, enemies eating.
2. Economy: joke ads, scarce coins, Pentakill, buff-screen purchases, shop and retention coin-tier change.
3. Hero kits: Gunman, Magician, follower/fusion changes and levelling.
4. Map: larger scrolling world, enemy types, temporary buff blocks, rooms/walls/hazards.
5. Kick physics: shared kickable-projectile system.
6. New heroes: Goliath, then Summoner.
7. Bosses: wave 10 snake first; wizard much later.

## Files likely to change

Near-term:

- `config.js`
- `state.js`
- `heads.js`
- `buffs.js`
- `input.js`
- `player.js`
- `passives.js`
- `skills.js`
- `mines.js`
- `recruits.js`
- `merge.js`
- `enemies.js`
- `score.js`
- `revive.js`
- `retention.js`
- `render.js`
- `panel.js`
- `audio.js`
- `storage.js`

Later:

- `camera.js` or equivalent camera logic
- room/map data
- kickable-projectile logic
- Goliath/Summoner definitions and AI
- boss logic

## Known gaps and cautions

- The assistant has not verified the new design changes in a real browser; they are design targets.
- The old retention implementation needs migration from revive spending to run spending.
- The old coin rewards/revive costs must not survive accidentally when the economy is rebuilt.
- Old saves must preserve any existing Gunman unlock.
- Exact speed bonus numbers, boss payouts, ad timing, Pacifist goal, room templates and kick physics need play-testing.
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

Tier 1 (config/text) is built: hero prices and the Magician lock, buff cleanup (Starting follower id `startFollower`, +20% score, Bounty hunter removed, Rich added: +10% of the run's earned coins paid in `endRevive` via `payRichBonus`), Gunman 16-tick volley plus front bullet, one-use Gorgon shields (cd -1 = used), zero-score game-over line, hero-card detail toggle (`S.heroDetail`, I key or the "i" button; `desc` = flavour, `detail` = stats), speed limits 0.25 to 2.0. Not yet play-tested in a browser. Next: Tier 2 (movement feel, fusion run modifiers, flag buffs, buff-screen coins).