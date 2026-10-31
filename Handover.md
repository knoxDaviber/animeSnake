# animeSnake: Handover

For whoever picks this up next (a new chat, a new session, or future you). This is the one document to load every time. Read the "How we work" section first. [DESIGN.md](DESIGN.md) has the design intent, [ART_SPEC.md](ART_SPEC.md) the sprite formats and [Templates.md](Templates.md) the room sketches. Open those only when a task needs them.

Last updated: 2026-10-28. Everything below marked "built" was delivered as copy-paste edits and has NOT been run by the assistant (it cannot run the game). The dev plays it in a browser before every commit.

## How we work (read first)

**Token-saving workflow. Do it this way from now on:**
1. The dev describes an idea.
2. The assistant answers with ONLY: a short plan, any questions (one at a time), and a **"Files I need"** list: each file named, with `read` or `edit`, and why. It does NOT ask for the whole repo. Use the "Task to files" table below to choose. For `config.js` (large) it is enough to paste just the block that matters.
3. The dev uploads or pastes those files (their current versions).
4. The assistant delivers copy-paste edits (exact Ctrl+F find text, and where it goes) and new files, plus an `edits.md` with a check list. When a file is changed in many places it delivers the whole file instead.
5. After a batch it updates the "Last session" section here. The dev asks for full doc files when the docs need refreshing.

Other preferences:
- If a request is ambiguous, ask ONE clarifying question before doing anything.
- Plan tool calls ahead and group them in sensible batches.
- Docs (Handover, DESIGN, README) are delivered as full files, not edit lists.
- Say "hero", not "head", in anything the player sees. Use kaomojis in chat replies.
- Commit when something works, and before big AI changes. Keep raw AI art in `assets/_raw/` (git-ignored).
- Fun matters more than balance. Minimal UI: the game is the main attraction, nothing outside the canvases, gameplay text at half opacity. It should play like a **Newgrounds flash game**: nothing interrupts the run (no pick screens if they can be avoided).
- Worried about bloat: prefer improving existing content to adding new content. A full code refactor, with the assistant managing it, comes once the game is considered good.

## Snapshot

Snake, but anime: a fast roguelike where the snake is a chain of anime characters. The dev's first small game, fully vibecoded (code with AI help, art and audio from other AI tools). Plain HTML, CSS and JavaScript, no build step, no server, no dependencies. Repo: https://github.com/knoxDaviber/animeSnake. Run it by opening `src/index.html`.

**Testing status (honest).** The dev is the only playtester. "Runs" is mostly confirmed, "feels right" is not. No structured balance pass has been done. Ten strangers playing without coaching is still the most valuable test not yet done.

## What exists (built)

**Run flow.** Title screen = hero select (shop, ads, volume, mute, detail toggle). Pick a hero, then a run-start buff (3 cards, 3rd costs 1 coin, mulligan 5). Then a pause-style "Ready?" screen: the world is frozen until the first steering input (`S.holdStart`), with a short hint ("Eat a key, then touch the character that walks in" for the first 5 runs). The first key lies close to the start. A one-time "One more of the same merges them!" banner appears when two matching followers are in the chain. Pause (P/Esc) has a volume slider and Give up (Q twice).

**The chain.** Hero in slot 0, followers behind. A hit drops the tail character; losing the last one ends the run. Tail stall (running into your own tail just stops you). Three identical followers anywhere merge into one fusion. Heroes start with zero followers. Reversing is only allowed when alone.

**Heroes (5).** Swordsman (free; sword plus a block that absorbs the first enemy-head hit and fires a **counter slash** at the attacker, `RIPOSTE_MULT` x sword damage), Magician (50), Gunman (100), Goliath (200; hurt only from behind, kicks, cannot recruit, key shields), Summoner (200; spends the tail follower for a fusion spirit and gains its permanent bonus).

**Followers (5 base, 5 fusions).** Miner/Bomber, Raiden/Raiden Shogun, Keysman/Kingsman, Magneto/Mr.X, Gorgon/Medusa. Heroes and fusions have real sprites; base followers are deliberately simple. Raiden's remote detonation picks the oldest mine **on screen**, draws a thin blue dashed line to it (`RAIDEN_TELEGRAPH_TICKS`), then blows it. **Mr.X rejects (shoots) every recruit except Magneto.**

**Weapons.** Each hero has a base weapon. Extra weapons ("branches": Gatling, Ricochet, Nova, Thunder, **Razor**) come from **chests**, not from levelling. Razor: square rings of blades that pulse out and back in nonstop; speed comes from weapon levels, a second ring joins at level `RAZOR_SECOND_LEVEL`, the ring grows by 1 tile every `RAZOR_GROW_LEVELS`. Levelling (kills give XP) only makes weapons stronger. **Caps (config.js):** `WEAPON_LEVEL_CAP`, `WEAPON_DAMAGE_CAP`, `WEAPON_MIN_COOLDOWN`, `WEAPON_SLOTS` (3 chest weapons; the **Relic: weapon slot** buff adds 1 and can also be a boss reward).

**World.** A 5x5 grid of 20x20 cells (100x100 tiles). Each run picks one of 7 **shapes** (`LAYOUTS` in rooms.js: Cross, Keyhole, Long L, Serpent, Stairs, Keep, Crossbar), rotated and mirrored at random; the other cells are rock. 14 room templates plus the start room, with walls, hazards, mud, conveyors, gates, ice, push blocks, bumpers, crumbling floor, turrets and bomb pedestals. `tb` templates only sit where the shape runs straight. Only the start room is open at first. Rooms that touch rock or the world edge are sealed (no dead-end nooks).

**Doors.** No pick screen. At `DOOR_WAVES` (3, 5, 7, 9, 12, 14, 16, 18) a small "A door is ready!" line appears and `DOOR_READY_PER_WAVE` (2) closed rooms get a faint pulsing gold outline on their doors. **Walk into a glowing door to break it** and open the room (the room's name shows as a quiet banner). Rooms carry a surprise twist: variety, cache, swarm, lockdown or quiet. Doors that are not glowing hurt like any wall.

**Chests.** At most 4 per run, placed at run start on reachable floor: `CHESTS_NEAR` (1) in a room 1 door from the start and `CHESTS_FAR` (3) in rooms 2+ doors away (counted along the shape, `S.layout.dist`). Walk onto one: a random weapon you do not own (starting at `CHEST_START_SHARE` of your hero level). If you own them all or the slots are full, every weapon gets +1 level. Pacifist gets coins. Chests stay hidden until their room opens.

**Enemies.** Types: normal, fast (wave 4), armored (7), kamikaze (8, needs a mine on the map), spitter (10), **runner** (6: flees from you while small, heads for keys and recruits, grows `RUNNER_EAT_GROWTH` segments per bite, hunts once big). **Longer = faster and stronger:** +`LEN_SPEED_PER` speed per segment beyond `LEN_SPEED_FROM`, +`ENEMY_EAT_HP` hit points per bite. **Big snakes** (longer than `BIG_SNAKE_LEN` = 7, bosses excluded): their head hit costs you 2 followers (`BIG_SNAKE_HIT_RINGS`), a head hit that would kill one only breaks its chain down to `BIG_SNAKE_KEEP` segments, and they wear a red ring. **Headbutts:** on a head-on collision the longer chain shoves the shorter one back `BUMP_TILES` (you still take the damage; bosses are not shoved; Goliath is never pushed).

**Waves.** Timed waves. Nothing stops growing any more: snakes per wave (to 24), the alive cap (to `ENEMY_CAP` 16, growing with the wave and the number of open rooms), hits to kill (+1 every 4 waves after 17), length, speed, special-type chance, shorter spawn gaps, and waves get shorter after wave 20. **Rushes** every 5th non-boss wave: a red banner, then a flood from several sides that ignores the alive cap; clearing it gives a temp buff block and coins.

**Bosses (waves.js).** Every `BOSS_EVERY` (10) waves, alternating: 10 Great Serpent, 20 Hollow Wizard, 30 BOTH (the finale), 40 serpent, 50 wizard, 60 both... `S.bossTier = wave / 10`; each tier has +40% HP, +6% speed and 8% faster attacks (`BOSS_TIER_*`); from tier 3 the serpent's volley is always 8 orbs and the wizard gets an extra beam every 2 tiers. Beating both at wave 30 shows VICTORY (coins and score) and **the run goes on**. **Boss minions:** during a serpent fight ordinary snakes keep arriving a few at a time (cap 4 at wave 10, +1 per 5 waves, max 12; the mix of types grows with the tier). **Enraged serpent** (under half HP): its body is armoured, only head hits hurt it. Challenge mode still ends at wave 20.

**Economy.** Coins: wave milestones, bosses, Pentakill (5), rush clears, door lockdowns, fake ads (`AD_PAYOUTS`). **Score becomes coins when the run ends: 100 score = 1 coin** (`SCORE_PER_COIN`, before the Rich bonus; no retention multiplier). Spend them on heroes, the third buff card, mulligans, the shop and "No ads".

**HUD.** Window corners, half opacity. Bottom left: your hero's weapon (level, seconds left, a refilling bar), chest weapons, follower skills (soonest-ready copy), buffs, shields, temp buffs, `Chests 0/4`, `Weapons n/slots`. Top: score, combo, wave, coins, boss and wizard bars (wizard bar sits below the serpent's when both are up), banners.

**Audio (synthesized chiptune).** Reverb, a few percent of random pitch jitter on repeated effects, chords that change by wave band (waves 1-5, 6-10, 11-15, 16-20, 21+), their own loops for the serpent and the wizard, and reactive layers (drums fade in with a combo of 3+, in battle and bosses; a lead melody at a combo of 5+ and in the serpent fight). Volume slider on the pause screen.

**Other systems.** Retention (pressure, frustration meter and pity boost, coin tiers) stays ON by design. Pacifist and Challenge modes, the shop, temp buffs, kick physics, Supabase leaderboard, touch controls, fake joke ads for revives and coins.

## Decisions (the dev's, keep them)

| Topic | Decision |
| ----- | -------- |
| Goliath | Stays hurt only from behind. The "front-only" rework was dropped. |
| Swordsman | His power is the shield. Do not buff the raw sword; the counter slash ties the two together. |
| Tutorial | None. A "Ready?" screen and one merge banner. The player works out the rest. |
| Pick screens | Avoid them (doors and weapons no longer have one). The boss reward pick and the run-start picks remain. |
| Retention systems | On while testing, by design. |
| Audio | Keep the synthesized 16-bit style. |
| Volume slider | Kept for now, but it does not really match the Newgrounds vibe. Easy to remove (audio.js, render.js drawVolumeSlider, input.js). |
| Finale | Wave 30 (both bosses) can be won; the run then continues, bosses keep alternating and getting stronger. |
| Refactor | Later, with the assistant managing it, once the game is good. |
| Leaderboard | Will be reset later. |
| Economy | The dev tunes it over time (score to coins made coins plentiful). |

## Backlog (NOT built)

**New weapons the dev chose:** tail whip (the tail lashes beside and behind; Fear), bomb thrower (bombs land 3-5 tiles ahead after a delay, 3x3 AOE, **also hurts the player**; Stagger), phoenix (orbits the hero clockwise, alternating the 3x3 and 5x5 ring; Burn), hook (when charged, auto-targets the nearest enemy head or tail, pulls and smashes it, gives the hero a few ticks of immunity; Mark), poison food trail (bait tiles that enemies chase; poisoned snakes lose their last segment when it ends; against bosses just 1 damage). Razor is done. Each is a `BRANCHES` entry in levels.js.

**Status effects (new `effects.js`).** Slow, Poison, Burn, Bleed, Confuse, Fear, Mark, Brittle, Static, Stagger, Volatile. `e.fx` ticked once per world tick; against bosses every effect is just a 1-damage minor hit. Planned assignment: Sword Mark, Magician shockwave Confuse, Gunman Bleed, Goliath swipe Stagger, Gatling Slow, Ricochet Brittle, Nova Slow, Thunder Static, Shogun Static, Mr.X Volatile, Medusa Brittle, Summoner spirits inherit, Hook Mark, Phoenix Burn, Bomb thrower Stagger, Tail whip Fear, Poison trail Poison. Mines, Bomber and Raiden detonation get none. Caps on duration and stacking from the start; Pacifist turns effects off.

**Followers (proposal, undecided).** Turn four of the new attacks into follower families (Alchemist, Whipper, Grenadier, Firebird) with fusions (Plague Doctor, Tamer, Demolitionist, Phoenix). Follower skills fire from their own chain tile, so a skill fires from every copy. More families dilute the recruit pool: bias summons toward families already held.

**Combos and hooks (ideas).** Shatter, Toxic fire, Bait and bomb, Plague, Conductor, Execute, Confuse plus mines, Echo follower, Martyr trigger, resonance (2-3 sources of an effect upgrade it). Cheap hooks: weapons detonate mines, any shield break fires a counter, kills shorten follower skill timers, keys refund the weapon cooldown, speed feeds weapon speed, Magneto pulls enemy heads toward the tile in front of you. Any new weapon that pops mines remotely must only pop mines on screen.

**Other.** Leaderboard v2 (columns `time_s`, `hero`, `build`/version; click a row for details; flag modifier runs; reset by bumping the version). Pillar 3 ("the chain is everything") is broken for Goliath and the Summoner: reword it to "your build is everything" or give them chain-adjacent resources. A faster route to level 20 and 30 (an idea: a bonus for quick wave clears). Real settings (key remapping, gamepad, text contrast: not addressed yet). The Necromancer is parked. The daily challenge is parked. Real audio files and the remaining art.

## Open questions

1. Does Challenge end at wave 20 or wave 30?
2. What does levelling do now that weapons come from chests (it only strengthens weapons)? Is that enough?
3. Do the new attacks become follower families, or stay weapons?
4. Do poison tiles hurt the hero? (assumed no)
5. Pillar 3: reword it, or give Goliath and the Summoner chain-adjacent resources?
6. HUD text readability at half opacity.
7. The serpent heals when it eats boss minions: is it too strong? (`BOSS_HEAL` is the knob.)

## Suggested order

1. Play-test the last batches; fix what breaks. Economy and test values (below) before anything else.
2. Status effects (`effects.js`) and the synergy hooks, then the remaining four chosen weapons.
3. Leaderboard v2 when the scores are reset.
4. A timed balance pass (the dev plays, the assistant tunes) and ten strangers.
5. New follower families only after that. The refactor last.

## File map (`src/`, loaded in this order by `index.html`)

| File | Owns | Notes |
| ---- | ---- | ----- |
| `config.js` | Every constant and tuning number | Big. Blocks at the end are the newest: waves, rushes, boss tiers and minions, weapon caps, razor, big snakes |
| `sprites.js` | `SPRITES`, `HEADS` | |
| `followers.js` | `FOLLOWERS`, `newSlot`, `randomFollower` | |
| `state.js` | The `S` object, `newRun()` | Picks the world shape first, then everything else |
| `storage.js` | Saves (best, coins, unlocks, volume, ...) | |
| `unlocks.js` | `isUnlocked`, `tryUnlock`, `heroPrice` | |
| `audio.js` | All sound, music, reverb, jitter, layers | |
| `world.js` | `tileAt`, `tileFree`, keys, `randomTile`, `pushBlock` | |
| `rooms.js` | Room templates, `LAYOUTS`, `pickLayout`, `buildWorld`, `roomAt` | |
| `doors.js` | Room grid helpers, ready doors, `breakDoor`, twists, in-room spawns, `enemyCap` | |
| `score.js` | Points, combos, popups | |
| `player.js` | Steering, `playerMove`, `takeHit` | Calls `breakDoor`, `openChestAt`, `headbutt`, `shieldAbsorbs` |
| `camera.js` | Camera, `viewTiles`, `onScreen` | |
| `attacks.js` | Attack sheets, `strikeEnemyAt`, bullets | |
| `heads.js` | Hero definitions, `weaponDamage`, `weaponCooldown`, `shieldAbsorbs`, `riposte`, hero select layout | |
| `levels.js` | XP, `BRANCHES`, the branch weapons, Razor | Branch update runs through `updateBranches` |
| `chests.js` | Chest placement, opening, drawing, `weaponSlots` | |
| `skills.js` | Follower skills, Raiden telegraph (`updateTethers`, `drawTethers`) | |
| `mines.js` | Mines, blasts | |
| `passives.js` | Follower passives, `heroSpeed`, Mr.X filter (`mrxRejects`) | |
| `tempbuffs.js` | Temp buff drops | |
| `summoner.js` | Summoner spirits | |
| `recruits.js` | Keys, recruits, `eatKey` | |
| `kicks.js` | Kick physics, Goliath rules | |
| `merge.js` | Fusions, fusion bonuses | |
| `buffs.js` | `BUFFS` (incl. Relic), pick screen, `startRun` | |
| `shop.js` | Shop, buff levels, starting followers | |
| `revive.js` | Death, revive, game over, `payScoreCoins` | |
| `ads.js` | Fake ads | |
| `retention.js` | Pressure, frustration, coin tiers | |
| `leaderboard.js` | Supabase top 10 | |
| `enemies.js` | Enemy AI, damage, waves, spitters, turrets | Hooks into `snakes.js` and `waves.js` |
| `boss.js` | The Great Serpent | |
| `wizard.js` | The Hollow Wizard | |
| `bombs.js` | Bomb pedestals, kamikaze targeting | |
| `waves.js` | Boss kinds and tiers, minions, armour, rushes, finale, scaling helpers | |
| `snakes.js` | Big snakes, runner AI, length speed, headbutt | |
| `scenery.js` | Floors, walls, terrain, story decor | |
| `render.js` | All drawing on the UI canvas, title, pick, shop, ads, game over | |
| `hud.js` | Window-corner HUD, weapon/buff chips, banners | Overrides old versions in render.js |
| `input.js` | Keyboard, touch, pause, volume drag, shop input | |
| `main.js` | `step()`, `heroStep()`, `loop()` | |

## Task to files (what to ask for)

| Task | Read or edit these |
| ---- | ------------------ |
| New branch weapon | `levels.js`, `config.js` (its block), `hud.js` (chip is automatic if `cd` is set), `render.js` (draw call in `draw()`), `chests.js` only if the pool rules change |
| New hero weapon or passive | `heads.js`, `config.js`, `render.js` (hero select text), `unlocks.js` or `config.js` (price) |
| New enemy type | `config.js` (`ENEMY_TYPES`), `enemies.js`, `snakes.js`, `render.js` (`drawEnemyMark`) |
| Enemy damage, kills, effects | `enemies.js`, `attacks.js`, `snakes.js`, later `effects.js` |
| Wave difficulty, rushes, boss tiers | `config.js` (waves block), `waves.js`, `enemies.js`, `doors.js` (`enemyCap`) |
| Bosses | `boss.js` or `wizard.js`, `waves.js`, `config.js`, `enemies.js`, `hud.js` (warnings) |
| Rooms, shapes, templates | `rooms.js`, `doors.js`, `world.js`, `chests.js`, `scenery.js`, `Templates.md` |
| Doors and twists | `doors.js`, `player.js` (`playerMove` hook), `config.js` |
| Followers, merging | `followers.js`, `merge.js`, `passives.js`, `skills.js`, `recruits.js`, `summoner.js` |
| Mines and bombs | `mines.js`, `skills.js`, `bombs.js`, `kicks.js` |
| HUD, banners, overlays | `hud.js`, `render.js`, `input.js` |
| Pause, controls, touch | `input.js`, `player.js`, `main.js` |
| Audio | `audio.js`, `config.js` (audio block) |
| Shop, coins, ads, revive | `shop.js`, `ads.js`, `unlocks.js`, `retention.js`, `revive.js`, `storage.js`, `config.js` |
| Leaderboard | `leaderboard.js`, `render.js` (`drawBoard`), `tools/*.sql`, `config.js` |
| Saves | `storage.js`, `state.js` |

Rule of thumb: tuning numbers go in `config.js`, state goes in `S`, drawing goes in `render.js` (bosses, spirits, the wizard, chests, tethers and the Razor draw themselves from their own files). No loose globals. No `import`/`export` modules (they fail from `file://`). Anything that refers to a function from a later file at load time must wrap it in an arrow function.

## Clocks

- **Hero clock:** `heroStep` runs on `heroInterval()` = `TICK_MS / heroSpeed()`.
- **World tick (125 ms):** `step` advances skills, attacks, recruits, spirits, stun, the wave timer, combos, temp buffs, rushes, doors and the animation frame. Cooldowns in config.js are in world ticks.
- **Enemy clocks:** each enemy moves on its own `enemyInterval(e)` (longer snakes are faster).
- **Boss clock:** the serpent moves every frame in real time. The wizard teleports, once per world tick.
- **Frozen start:** while `S.holdStart` is true the world clocks do not run (loop in main.js).

## Rules to preserve

- Heroes attack automatically in the facing direction; steering is aiming. Heroes start with zero followers.
- A hit removes the tail character (a big snake's head removes 2 followers, never the hero by the extra one); losing the last character kills the run. Glass cannon kills on any hit that lands (shields still absorb).
- No instant reverse, except for a hero with no followers.
- Three identical followers merge into one fusion. Fusion permanent buffs are run-only modifiers in `S`.
- Keys are the recruitment item. Goliath is the exception (keys give shields).
- Modifiers (Dev mode, Pacifist, Glass cannon) are legitimate runs, scored differently.
- Gameplay text sits at half opacity; nothing spawns on a text zone. Menus are a fixed 640x640 square; only the world adapts to the window.
- Every weapon goes through the normal enemy paths (`enemyAt`, `damageEnemyHead`, `cutEnemy`, `strikeEnemyAt`). Pass `minor = true` for anything that is not the hero's own attack so bosses are not crit. Against bosses every status effect is a 1-damage minor hit.
- Walking into a ready door opens it; a door that is not ready is a wall.
- Chests are max 4 per run (1 near, 3 far). Weapons come from chests, never from a pick screen.

## Economy (as built) and test values

- `AD_PAYOUTS = [100, 50, 50, 25]` (docs from earlier said 10/5/2/1), `AD_FREE_PRICE = 99999` (intended 1000), `AD_HOLD_SPEED = 8`. One coin ad can buy a hero. Score now pays coins too (100 score = 1 coin), so the dev is retuning prices and payouts over time.
- Retention coin tier thresholds are still 0 / 15 / 45 / 90 (intended about 0 / 5 / 12 / 25).
- Hero prices: Swordsman free, Magician 50, Gunman 100, Goliath 200, Summoner 200 (`HERO_PRICES`; check it has `const`).
- Challenge reward 100 coins, `FINALE_COINS` 60, boss coins 10, rush coins 2, wave milestones 5/10/15/20.

## Known gaps and cautions

- Check these were applied from the earlier config cleanup: `HERO_PRICES` has `const`, the duplicate `TEST ONLY` comment is gone, `AGENT_TICKS` comment (32 ticks is 4 s, not 8 s).
- Leftover constants: `SECOND_WIND_BONUS`, `COIN_PER_KILL`, `COIN_PER_WAVE`, `BOUNTY_POINTS`, `KINGSMAN_BOUNTY_MAX`, `BOSS_WAVE`, `WIZARD_WAVE` (unused now), `DOOR_CHOICES`. Dead code: the old pick-screen paths (`doorPicking`, `branchPicking`, `openBranchPick`, `chooseBranch`), old duplicate HUD functions in `render.js`.
- The Goliath `detail` text in heads.js does not mention his key shields or that he cannot recruit.
- The serpent heals from eating minions (see open question 7). With a 100x100 world Bomber blasts and bullets can fly very far.
- Performance: a rush or a boss fight can put 15+ snakes on the map. Each moving snake runs a path search (`distField`, limited to 1800 tiles). Watch for lag.
- The leaderboard has no anti-cheat; modifier runs share the board. Scores will be reset later.
- No accessibility options (remapping, gamepad, text contrast).
- Hand-pasted code has drifting indentation and some garbled comments; clean up in the refactor.
- The assistant cannot push to git and cannot run the game.

## Online leaderboard setup

The shared top 10 is on once the Supabase key is set (`LEADERBOARD` in `src/config.js`).
1. Make a free Supabase project. 2. SQL Editor, paste `tools/supabase_setup.sql`, Run (keeps the best 50, the game shows 10; `tools/supabase_keep50.sql` upgrades an older setup). 3. Paste the project URL and the **publishable** (or legacy anon) key into `LEADERBOARD.url` and `LEADERBOARD.key`. Never use a secret or service_role key. 4. A new top-10 score shows an initials box on the game-over screen.

## Last session

Batch (untested by the assistant):
- Help page: opens on a Contents list (help.js rewritten). Credits page (HELP_CREDITS in help_data.js) is added as the last page after the wave 30 victory (S.credits, saved). Its ARG line is a placeholder.
- Crumbling floor heals CRUMBLE_RECOVER_TICKS after it crumbles (crumbleTile / updateCrumbles in world.js, S.crumbles).
- Chapel (ice) room: plain-floor cross joins all four doors, so it is always solvable.
- Devour shop perk (DEVOUR_PRICE, S.devour, toggle): touching a snake shorter than your chain eats it for a random follower (snakes.js canDevour / devourEnemy). Not Goliath, Pacifist, bosses.