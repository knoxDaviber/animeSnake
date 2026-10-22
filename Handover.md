# animeSnake: Handover

For whoever picks this up next (a new chat, a new session, or future you). Read this first, then [DESIGN.md](DESIGN.md) for the full design and [ART_SPEC.md](ART_SPEC.md) for sprite formats.

## Snapshot

Snake, but anime: a fast roguelike where the snake is a chain of anime characters. It is the user's first small game, fully vibecoded (code with AI help, art and audio from other AI tools). Plain HTML, CSS and JavaScript, no build step, no server, no dependencies. Repo: https://github.com/knoxDaviber/animeSnake

What works today: the Snake loop with smooth movement, sprites with fallbacks, rings and damage, one hazard, enemy snakes in waves, an auto-sword that hits them, followers with active skills (the Miner drops mines), score and combos, best score and best combo saved in the browser, pause, and an error screen.

What does not exist yet: recruitment (keys and wandering characters), follower passives (defined as text only), the other followers' active skills, extra heads, run-start buff choice, expand-grid (set aside for now), coins, revives, retention systems, merging, character unlocks, audio.

## Run it

Open `src/index.html` in a browser. Sprites load from `../assets/images/`, so keep the folder structure. Controls: arrows/WASD/swipe, P or Escape pauses, Space or tap restarts.

## Code layout (`src/`)

Plain script files loaded in the order below by `index.html`. Each file may use the ones above it while loading, and any function from any file while the game runs.

| File | Owns |
|------|------|
| `config.js` | All constants and tuning numbers (grid, tick, invulnerability, combo, waves, enemy settings, points) |
| `sprites.js` | Loads the shared sprite sheets (`SPRITES`, `HEADS`) |
| `followers.js` | The 5 followers (`FOLLOWERS`: sheet, colour, skill, passive text), `newSlot()`, `randomFollower()` |
| `state.js` | The `S` object (all mutable state) and `newRun()` |
| `storage.js` | `loadProgress()` / `saveProgress()` for best score and best combo (localStorage, fails safe) |
| `world.js` | `tileFree()`, food and hazard placement, drop effects |
| `score.js` | `addScore`, `registerKill`, combo timer, floating score text |
| `player.js` | Steering, `playerMove`, `takeHit` (rings and damage) |
| `attacks.js` | `ATTACKS` definitions, swing timer, `resolveHit` |
| `skills.js` | `SKILLS` (followers' active skills, per-slot cooldowns), `dropMine`, `updateSkills` |
| `mines.js` | `mineAt`, `detonateMine`, blast flash (`ageBlasts`) |
| `enemies.js` | Enemy snakes, AI, damage and cutting, waves |
| `render.js` | All drawing. Reads `S`, never changes it (`hud()` only writes page text) |
| `input.js` | Keyboard, touch, pause |
| `main.js` | `step()`, `loop()`, start-up, crash screen |

Rules of thumb: tuning numbers go in `config.js`, state goes in `S`, drawing goes in `render.js`. Do not add loose globals. Do not use `import`/`export` modules, because they fail when `index.html` is opened as a file.

## How one tick works

The logic tick is 125 ms. Rendering runs at display rate and interpolates between ticks (`S.alpha`). `step()` in `main.js` runs, in order:

1. `S.tick++` (animation clock: 1 animation frame = 1 tick)
2. `ageDrops()`, `agePopups()` and `ageBlasts()`
3. `playerMove()`: move, eat, or get blocked (wall, hazard, enemy, own body) and take a hit
4. If still alive: `updateCombo()`, `updateSkills()` (Miner drops a mine), `updateAttacks()` (fires the sword, resolves hits), `stepEnemies()`, `updateWaves()`
5. Update best score, `hud()`, and save progress on death

If anything throws, `loop()` shows a "Something broke" screen with the message instead of freezing.

## Rules as built

- **Rings:** a hit drops the tail character. You die when a hit lands on your last one. Walls, the hazard, enemy snakes and your own body all count as hits (`SELF_HIT_COSTS_RING` in `config.js`). A blocked move leaves the snake in place. After a hit you are invulnerable for 8 ticks (the chain blinks).
- **Sword:** the head auto-attacks the tile in front every 6 ticks. The hit resolves on frame 1. An enemy head loses one hit point (hits to kill grow with the wave, from `hitsToKill`), and at zero the snake dies. Hitting a body segment cuts it and everything behind it off.
- **Head-on:** both snakes take damage, the enemy is stunned for 4 ticks.
- **Waves:** the first wave starts after 24 ticks. Wave size is `1 + wave/3` (max 5). Enemies spawn along the edges, never reverse, avoid obstacles, and chase the player's head 60% of the time.
- **Score:** food 10, cut segment 5, kill 20 x combo count (capped at x5). A kill must land within 24 ticks of the last one. Getting hit does not break a combo.
- **Chain:** slot 0 is the head (`HEADS`), every other slot is a follower (`FOLLOWERS`). A slot is `{ c, fx, fy, cd }` (`cd` = skill cooldown). A run starts as the head plus `START_FOLLOWERS` (Miner, Raiden). Eating food still adds a random follower until recruitment replaces it.
- **Mines:** each Miner in the chain drops a mine on the tile the tail just left every `MINE_COOLDOWN` ticks (max `MINE_MAX` on the map; skipped if the snake grew or the tile is taken). Any snake head stepping on one sets it off. Blast = that tile plus the 4 around it: enemy heads lose `MINE_DAMAGE`, enemy body segments are cut, and the player loses a ring if the head is inside the blast (not while invulnerable). Enemies do not avoid mines. Kills from mines feed the combo.
- **Attacks** are independent objects with their own sheets, drawn on top of everything. Frame size is set per attack (`w`, `h`, optional `fit` to scale into one tile, optional `frames`).

## Assets (`assets/images/`)

Every object has a placeholder PNG at its final path, so real art is swapped in by overwriting the file (keep cell size and layout):

| File | Size | Layout |
|------|------|--------|
| `characters/character1.png` | 128x128 | 4x4: rows down, right (mirrored for left), up, reserved; 4 frames each. This one is the user's own art, never overwrite it |
| `enemies/enemy_head.png`, `enemy_body.png` | 128x128 | same 4x4 |
| `attacks/slash_sword.png` | 256x41 | 4 frames of 64x41, faces right, scaled into one tile |
| `food.png`, `hazard.png`, `mine.png`, `recruit.png` | 128x32 | 4 frames of 32x32 (`recruit.png` is unused until recruitment) |
| `followers/<id>.png` (miner, raiden, keysman, magneto, medusa) | 128x128 | same 4x4 as the heads |

The follower and mine placeholders come from `tools/make_placeholders.py`, which never overwrites an existing file. The older placeholders (food, hazard, enemies, slash) came from a script that was not saved. Hit, stun and drop effects are done in code (blink, fade), not drawn.

## Design decisions the user has confirmed

- Only the head attacks for now. Attacks fire automatically in the facing direction. Starting weapon: the sword.
- Revives add 10% of the current score on top of the current score.
- First version ships 10 buffs: 3 playable heads, 5 followers (Miner, Raiden, Keysman, Magneto, Medusa) and about 2 run-start buffs. Followers form the body; each has passives and some have active skills. A run-start buff pick (Slay the Spire style) is planned. Passives and the non-Miner skills are proposals in `followers.js`, text only for now.
- Mines are a player weapon (the Miner's skill), not a map hazard. Enemies ignore them so the player can lure them in.
- The starting 20x20 grid stays. The expand-grid buff adds one tile ring on all sides and scales the whole playfield down to fit the viewer.
- Recruitment replaces food growth: the old food becomes a key, and you need a key plus a character to grow. Characters walk into the play area from the edges at random, and enemy snakes can kill them. If one dies before you reach it you need another key.
- Attack sheets should support variety, but keep it simple for now.
- Retention hooks (high-score pressure, frustration meter, coin tiers, boast screen) are deliberate and described in DESIGN.md. Tune them so deaths feel like near-misses.

## Open questions

Waiting on the user:
- Are the proposed follower passives and skills in `followers.js` right (Raiden lightning, Medusa gaze, Magneto pull, Keysman key rate)?
- What are the 2 run-start buffs?

Assumed, not confirmed:
- Picking up a key summons a character right away. If an enemy kills it before you reach it, the key is wasted.
- Mine numbers (blast of 5 tiles, 1 damage, 5 s cooldown, max 3, hurts the player's own head) are first guesses in `config.js`, to tune after playing.

## Next steps (proposed order)

1. **Done: foundation and mines** (heads/followers split, `tileFree`, active skills, Miner mines). Playtest and tune them first.
2. **Recruitment:** keys replace food growth, characters walk in from the edges, enemies can kill them.
3. **Heads, follower skills and buffs:** 3 heads with starting weapons, the other follower passives and skills, run-start pick. Expand-grid is set aside for now.
4. **Coins, revives and retention systems** (build step 5), including the death-screen hooks.
5. Merging of three adjacent identical characters, character unlocks with different starting weapons, then art, music and sound polish.

## Known gaps and cautions

- Nothing has been played in a real browser by the assistant. The code was syntax-checked and run through a headless Node simulation of hundreds of random games (plus scripted mine tests) with the canvas stubbed out. That harness lives outside the repo.
- Known feel issues to decide on: moving into your own tail tile counts as a hit even though the tail is leaving; tap/Space restarts instantly on the death screen (needs a short lockout before the revive screen).
- The assistant cannot push to git. Files are delivered as downloads and the user copies them into the repo and commits. Say which files changed each time.
- Placeholder art was generated (follower/mine ones by `tools/make_placeholders.py`), but the user's own `character1.png` is the real art. Check any new placeholder will not overwrite a file the user already has.
- Enemy AI is deliberately simple. Cutting a segment removes everything behind it instead of leaving a gap.
- Canvas anti-aliasing is off, but the fallback spikes drawn without a sheet still use canvas paths, so they are slightly soft.

## Working preferences

- The user wants code split across files, not one big file. Not everything needs to be object oriented.
- If a request is ambiguous, ask one clarifying question before doing anything.
- Plan tool calls ahead and batch them where it makes sense.
- The user often just copies and pastes. Give copy-paste-ready blocks or whole files, and say exactly where each goes.
- Commit when something works, and before big AI changes, so `git restore .` or `git reset --hard HEAD` can undo them.
- Keep raw AI art in `assets/_raw/` (git-ignored) and commit only cleaned sheets.