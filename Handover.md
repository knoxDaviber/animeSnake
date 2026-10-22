# animeSnake: Handover

For whoever picks this up next (a new chat, a new session, or future you). Read this first, then [DESIGN.md](DESIGN.md) for the full design and [ART_SPEC.md](ART_SPEC.md) for sprite formats.

## Snapshot

Snake, but anime: a fast roguelike where the snake is a chain of anime characters. It is the user's first small game, fully vibecoded (code with AI help, art and audio from other AI tools). Plain HTML, CSS and JavaScript, no build step, no server, no dependencies. Repo: https://github.com/knoxDaviber/animeSnake

What works today: the Snake loop with smooth movement, sprites with fallbacks, rings and damage, one hazard, enemy snakes in waves, an auto-sword that hits them, followers with active skills (the Miner drops mines), a run-start buff pick screen, score and combos, best score and best combo saved in the browser, pause, and an error screen. Added in the latest step: recruitment (keys summon characters that walk in and wait to be recruited), the tail stall (running into your own tail stops you instead of hurting you), and a 10 s revive countdown with a game-over screen that has no instant restart. Also added: a shared online top-10 leaderboard (Supabase), switched off until the publishable key is pasted into `config.js`.

What does not exist yet: follower passives (defined as text only), the other followers' active skills, extra heads, more than 2 run-start buffs, expand-grid (set aside for now), coins (revives are free for now), retention systems, merging, character unlocks, audio.

## Run it

Open `src/index.html` in a browser. Sprites load from `../assets/images/`, so keep the folder structure. Controls: arrows/WASD/swipe, P or Escape pauses. After dying: any key, click or tap revives, Q or Backspace (or the Give up button) ends the run, and Space or tap restarts from the game-over screen.

## Code layout (`src/`)

Plain script files loaded in the order below by `index.html`. Each file may use the ones above it while loading, and any function from any file while the game runs.

| File | Owns |
|------|------|
| `config.js` | All constants and tuning numbers (grid, tick, invulnerability, combo, waves, enemy settings, points) |
| `sprites.js` | Loads the shared sprite sheets (`SPRITES`, `HEADS`) |
| `followers.js` | The 5 followers (`FOLLOWERS`: sheet, colour, skill, passive text), `newSlot()`, `randomFollower()` |
| `state.js` | The `S` object (all mutable state) and `newRun()` |
| `storage.js` | `loadProgress()` / `saveProgress()` for best score and best combo (localStorage, fails safe) |
| `world.js` | `tileFree()`, key (food) and hazard placement, drop effects |
| `score.js` | `addScore`, `registerKill`, combo timer, floating score text |
| `player.js` | Steering, `playerMove` (keys, recruiting, tail stall), `takeHit` (rings and damage) |
| `attacks.js` | `ATTACKS` definitions, swing timer, `resolveHit` |
| `skills.js` | `SKILLS` (followers' active skills, per-slot cooldowns), `dropMine`, `updateSkills` |
| `mines.js` | `mineAt`, `detonateMine`, blast flash (`ageBlasts`) |
| `recruits.js` | Keys summon characters: `summonRecruit`, `updateRecruits` (walk in, become ready), `killRecruit`, `refreshKey` |
| `buffs.js` | `BUFFS` (run-start buffs), `pickCardRect()`, `startRun()` |
| `revive.js` | Death flow: `beginRevive`, `revive`, `giveUp`, `updateRevive`, `restartRun`, lockouts, `giveUpRect()` |
| `leaderboard.js` | Shared top 10 via Supabase REST: `loadBoard`, `leaderboardGameOver`, `submitScore`, the initials box (plain HTML over the canvas) |
| `enemies.js` | Enemy snakes, AI, damage and cutting, waves |
| `render.js` | All drawing. Reads `S`, never changes it (`hud()` only writes page text) |
| `input.js` | Keyboard, touch, pause |
| `main.js` | `step()`, `loop()`, start-up, crash screen |

Rules of thumb: tuning numbers go in `config.js`, state goes in `S`, drawing goes in `render.js`. Do not add loose globals. Do not use `import`/`export` modules, because they fail when `index.html` is opened as a file.

## How one tick works

The logic tick is 125 ms. Rendering runs at display rate and interpolates between ticks (`S.alpha`). `step()` in `main.js` runs, in order:

1. `S.tick++` (animation clock: 1 animation frame = 1 tick)
2. `ageDrops()`, `agePopups()` and `ageBlasts()`
3. `playerMove()`: stand still if stalled (`S.waitDir`), otherwise move, pick up a key, recruit a ready character, stall on your own tail, or get blocked (wall, hazard, enemy, own body) and take a hit
4. If still alive: `updateCombo()`, `updateSkills()` (Miner drops a mine), `updateAttacks()` (fires the sword, resolves hits), `updateRecruits()` (summoned characters walk in), `stepEnemies()` (enemies may kill recruits), `refreshKey()` (next key, unless `RECRUIT_MAX` are waiting), `updateWaves()`
5. Update best score, `hud()`, and on death save progress and start the revive countdown (`beginRevive()`)

Outside the tick, `loop()` calls `updateRevive()` every frame so the countdown runs in real time while the game is not ticking.

If anything throws, `loop()` shows a "Something broke" screen with the message instead of freezing.

## Rules as built

- **Rings:** a hit drops the tail character. You die when a hit lands on your last one. Walls, the hazard, enemy snakes and your own body all count as hits (`SELF_HIT_COSTS_RING` in `config.js`). A blocked move leaves the snake in place. After a hit you are invulnerable for 8 ticks (the chain blinks). Your own tail tile is the exception (see Tail stall below).
- **Sword:** the head auto-attacks the tile in front every 6 ticks. The hit resolves on frame 1. An enemy head loses one hit point (hits to kill grow with the wave, from `hitsToKill`), and at zero the snake dies. Hitting a body segment cuts it and everything behind it off.
- **Head-on:** both snakes take damage, the enemy is stunned for 4 ticks.
- **Waves:** the first wave starts after 24 ticks. Wave size is `1 + wave/3` (max 5). Enemies spawn along the edges, never reverse, avoid obstacles, and chase the player's head 60% of the time.
- **Score:** food 10, cut segment 5, kill 20 x combo count (capped at x5). A kill must land within 24 ticks of the last one. Getting hit does not break a combo.
- **Run start:** `newRun()` builds the run but leaves `S.picking = true`. The loop does not tick until the player picks a buff (tap a card, keys 1/2, or arrows + Enter). `startRun(i)` applies the buff and starts the clock. Input is ignored for `PICK_LOCKOUT_MS` after the screen appears so the restart tap cannot also pick. Buffs: **Extra follower** (one more random follower behind the tail) and **+10% score** (`S.scoreMult`; coins too once they exist).
- **Chain:** slot 0 is the head (`HEADS`), every other slot is a follower (`FOLLOWERS`). A slot is `{ c, fx, fy, cd }` (`cd` = skill cooldown). A run starts as the head plus `START_FOLLOWERS` (Miner, Raiden). Only recruiting adds a follower (eating a key no longer grows the chain).
- **Mines:** each Miner in the chain drops a mine on the tile the tail just left every `MINE_COOLDOWN` ticks (max `MINE_MAX` on the map; skipped if the snake grew or the tile is taken). Any snake head stepping on one sets it off. Blast = that tile plus the 4 around it: enemy heads lose `MINE_DAMAGE`, enemy body segments are cut, and the player loses a ring if the head is inside the blast (not while invulnerable). Enemies do not avoid mines. Kills from mines feed the combo.
- **Attacks** are independent objects with their own sheets, drawn on top of everything. Frame size is set per attack (`w`, `h`, optional `fit` to scale into one tile, optional `frames`).
- **Tail stall:** moving into your own tail tile is not a hit and not a move. The snake stops, a blinking "Choose a direction" prompt shows, and it stays put until you steer (enemies keep moving, so they can close in). The heading is reset to the real one so the no-reverse rule still works. Every other body segment is still a hit. `S.waitDir` is the flag; a revive sets it too.
- **Keys and recruits** (`recruits.js`): the old food is now a key (`S.food`, still drawn with `food.png`). Eating it scores 10 and summons a random follower right away. The character starts one tile outside the grid, walks in along a straight lane (6 to 12 tiles at 1 tile per tick, so 0.75 to 1.5 s), then jumps on the spot, with the `recruit.png` marker, when it is ready. Touching a ready recruit with your head adds it to the tail (the snake grows that tick). One that is still walking cannot be recruited. At most `RECRUIT_MAX` (3) wait at once; no new key appears until one is recruited or killed. An enemy head stepping on a recruit kills it (the key is wasted), and a chasing enemy goes for a recruit instead of you when one is within `RECRUIT_THREAT_DIST` tiles. Mines and keys never land on a recruit or on the tile one is heading for. Recruiting gives no points.
- **Leaderboard** (`leaderboard.js`, `tools/supabase_setup.sql`): a shared top 10 in a Supabase table `scores` (name = 1 to 3 letters or digits, score, wave, revives). Project URL and publishable key live in `LEADERBOARD` in `config.js`; while the key is the `PASTE_...` placeholder the leaderboard is off and the game works exactly as before. When the run really ends (the revive timer ran out or the player gave up, `endRevive()`), the game fetches the top 10 once. If the score is above 0 and beats the 10th place (a tie does not count, the earlier score keeps the spot) or the board has fewer than 10, an initials box appears over the game-over screen. Save posts the score and reloads the board, highlighting the new row. Skip dismisses the box. Initials are remembered in localStorage. Failures are quiet: a failed fetch shows "Leaderboard offline right now", a failed save brings the box back with an error so the player can retry, and requests time out after 6 s. `S.runId` makes slow answers from an old run get ignored. Input aimed at the initials box (`#nameEntry`) is ignored by the game, so typing or tapping Save cannot restart it. The database refuses edits and deletes from the browser and trims itself to the top 10 after every insert (a trigger in the SQL). Only the publishable key (or legacy anon key) may ever go in `config.js`, never the secret or service_role key.
- **Death and revive** (`revive.js`): dying starts a 10 s countdown. Any key, click or tap revives. Input is ignored for 700 ms after dying (so a steering key cannot revive by accident), and modifier keys and held-down keys do not count. Q, Backspace, the Give up button or the timer running out shows the game-over screen, which ignores restart input for 1 s, so there is no instant restart. A revive is free and unlimited for now: it adds 10% of the score on top, brings back just the head with 24 ticks of immunity, and the snake waits for a direction.

## Assets (`assets/images/`)

Every object has a placeholder PNG at its final path, so real art is swapped in by overwriting the file (keep cell size and layout):

| File | Size | Layout |
|------|------|--------|
| `characters/character1.png` | 128x128 | 4x4: rows down, right (mirrored for left), up, reserved; 4 frames each. This one is the user's own art, never overwrite it |
| `enemies/enemy_head.png`, `enemy_body.png` | 128x128 | same 4x4 |
| `attacks/slash_sword.png` | 256x41 | 4 frames of 64x41, faces right, scaled into one tile |
| `food.png`, `hazard.png`, `mine.png`, `recruit.png` | 128x32 | 4 frames of 32x32. `food.png` is now the recruit key. `recruit.png` is the small "recruit me" marker drawn at 16x16 above a ready recruit, so keep its icon readable at half size |
| `followers/<id>.png` (miner, raiden, keysman, magneto, medusa) | 128x128 | same 4x4 as the heads |

The follower and mine placeholders come from `tools/make_placeholders.py`, which never overwrites an existing file. The older placeholders (food, hazard, enemies, slash) came from a script that was not saved. Hit, stun and drop effects are done in code (blink, fade), not drawn.

## Setting up the leaderboard (one time)

The Supabase project URL is already in `config.js`. To switch it on:
1. In Supabase, open **SQL Editor**, click **New query**, paste all of `tools/supabase_setup.sql` and press **Run**. Check the table `scores` appears under **Table Editor**.
2. In Supabase open **Project Settings, API Keys**, copy the **publishable** key (starts with `sb_publishable_`; on an older project the legacy **anon** key is fine) and paste it over `PASTE_YOUR_PUBLISHABLE_KEY_HERE` in `src/config.js`. Do not use the secret key.
3. Commit and push. After the Pages deploy, play a run until the game-over screen: "TOP 10" should appear, and you can save a score.

## Design decisions the user has confirmed

- Only the head attacks for now. Attacks fire automatically in the facing direction. Starting weapon: the sword.
- Revives add 10% of the current score on top of the current score.
- First version ships 10 buffs: 3 playable heads, 5 followers (Miner, Raiden, Keysman, Magneto, Medusa) and about 2 run-start buffs. Followers form the body; each has passives and some have active skills. A run-start buff pick (Slay the Spire style) is planned. Passives and the non-Miner skills are proposals in `followers.js`, text only for now.
- Mines are a player weapon (the Miner's skill), not a map hazard. Enemies ignore them so the player can lure them in.
- The starting 20x20 grid stays. The expand-grid buff adds one tile ring on all sides and scales the whole playfield down to fit the viewer.
- Recruitment replaces food growth: the old food becomes a key, and you need a key plus a character to grow. Characters walk into the play area from the edges at random, and enemy snakes can kill them. If one dies before you reach it you need another key.
- Attack sheets should support variety, but keep it simple for now.
- Follower passives and skills in `followers.js` are fine as proposed; add or adjust them later.
- A key summons its character right away, but it has to walk in from outside the grid and start jumping, 1 to 2 s at most for the whole process.
- Moving into your own tail does not count as a hit, but it stops you until you choose a direction. Enemies can use that to chase you.
- Revive: a 10 s countdown after dying. Any key revives; Backspace, Q or the timer running out shows the death screen. No instant restart.
- Mine numbers are fine for now.
- Retention hooks (high-score pressure, frustration meter, coin tiers, boast screen) are deliberate and described in DESIGN.md. Tune them so deaths feel like near-misses.

## Open questions

Nothing is waiting on the user. Assumptions made when building the recruitment and revive step, all easy to change:
- The tail stall applies to the tail tile only; running into any other body segment is still a hit.
- Revives are free and unlimited until coins exist, and bring back only the head (lost followers do not return).
- Mines do not hurt recruits; enemies do, and go after them when close.
- The key is bound to its character: if an enemy kills the recruit, that key is wasted.
- Numbers in `config.js` are first guesses to tune after playing: recruit walk 6 to 12 tiles, `RECRUIT_MAX` 3, enemy threat distance 6, revive immunity 24 ticks, lockouts 700 ms (revive) and 1 s (game over), and the mine numbers (blast of 5 tiles, 1 damage, 5 s cooldown, max 3).

## Next steps (proposed order)

1. **Done: foundation, mines, the run-start pick screen, recruitment, the tail stall and the revive countdown.** Playtest and tune them first.
2. **Heads, follower skills and buffs:** 3 heads with starting weapons, the other follower passives and skills, more run-start picks. Expand-grid is set aside for now.
3. **Coins, revive cost and retention systems** (build step 5), including the death-screen hooks.
4. Merging of three adjacent identical characters, character unlocks with different starting weapons, then art, music and sound polish.

## Known gaps and cautions

- Nothing has been played in a real browser by the assistant. The code was syntax-checked and run through a headless Node simulation of hundreds of random games (plus scripted tests for mines, recruitment, the tail stall and the revive flow) with the canvas stubbed out. That harness lives outside the repo.
- The leaderboard code was tested against a fake Supabase server in the harness (qualifying, saving, failures, timeouts, stale answers, input guards), but `tools/supabase_setup.sql` and the real project have not been run by the assistant. If saving fails after setup, check the browser console and the Supabase table, grants and policies first.
- Anyone can post a fake score from the browser console (within the limits in the SQL: 1 to 500000). That is accepted for a hobby game. Real anti-cheat would need a server that replays inputs.
- Feel to check in a real browser: the recruit walk-in and jump, the "Choose a direction" prompt, and the revive screen (countdown, and the Give up button on touch screens, where Q and Backspace do not exist).
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
- Use kaomojis in chat replies.