# animeSnake

Snake, but anime. A fast roguelike where your snake is a chain of anime characters.

A small, fully vibecoded first game: code is written with AI help, and art, music and sound come from other AI tools.

## Status

Early prototype. The core Snake loop works (grid movement with smooth interpolation, pause), with rings and damage, enemy snakes in waves, an auto-sword, mines, score and combos, and recruitment: eat a key, then touch the character that walks in and starts jumping to add it to your chain. Running into your own tail stops you until you choose a direction. Dying starts a 10 second revive countdown. Character sprite sheets and a separate attack layer are wired up and fall back to colored squares or nothing when a sheet is missing. Everything else is planned in [DESIGN.md](DESIGN.md).

## Run it

No install needed. Open `src/index.html` in any browser (desktop or phone). Sprites load from `assets/images/`, so keep the folder structure as is.

- Desktop: arrow keys or WASD
- Phone: swipe
- Pause: P or Escape (also pauses when the tab loses focus); tap to resume
- After dying: any key, click or tap revives within 10 seconds (+10% score). Q, Backspace, the Give up button or the timer ends the run
- Restart from the game-over screen: tap or press Space

## The idea in short

- Your snake is a chain of characters. Each gives a buff and some modify attacks.
- Characters act as rings: a hit drops one, and you die when none are left.
- Three adjacent identical characters merge into one stronger one.
- The head auto-attacks in the direction it faces, starting with a 1-tile sword. Attacks are their own sprites, drawn on top of the grid.
- Enemy snakes arrive in waves and get tougher.
- Runs are short. Coins from each run buy revives and new starting characters.

Full details, build order and open questions are in [DESIGN.md](DESIGN.md). Sprite formats are in [ART_SPEC.md](ART_SPEC.md).

## Online leaderboard

An optional shared top 10 kept in a free Supabase project. It stays off until you paste the publishable key into `src/config.js`. Setup steps are in [Handover.md](Handover.md), and the database script is `tools/supabase_setup.sql`. Never put a secret or service_role key in the game files.

## Structure

```
src/                     game code, see "Code layout" below
assets/images/
  characters/            4x4 character sheets (committed)
  enemies/               4x4 enemy head and body sheets (placeholders)
  attacks/               attack sheets, equal-sized frames (placeholder sword)
  food.png, hazard.png, recruit.png   item sheets (placeholders)
assets/audio/            optimized music and sfx (committed)
assets/_raw/             raw AI outputs (git-ignored)
```

## Code layout

Plain script files, no build step and no server: `src/index.html` loads them in this order.

| File | What lives there |
|------|------------------|
| `config.js` | Constants and tuning numbers (grid, tick, invulnerability, wave and enemy settings, points) |
| `sprites.js` | Loads every sprite sheet |
| `state.js` | The `S` object holding all mutable game state, and `newRun()` |
| `storage.js` | Saves best score and best combo in the browser |
| `world.js` | Keys (the old food), the hazard, drop effects |
| `score.js` | Points, combos, floating score text |
| `player.js` | Steering, moving, keys, recruiting, the tail stall, rings and damage |
| `attacks.js` | Attack definitions, the swing timer, hit resolution |
| `skills.js` | Active skills carried by followers (the Miner's mines) |
| `mines.js` | Mines on the map and their explosions |
| `recruits.js` | Keys summon characters that walk in and wait to be recruited |
| `buffs.js` | Run-start buffs and the pick screen |
| `revive.js` | Death: the revive countdown and the game-over lockout |
| `leaderboard.js` | Shared online top 10 (Supabase) and the initials box |
| `enemies.js` | Enemy snakes, their AI, waves |
| `render.js` | All drawing (reads `S`, never changes it) |
| `input.js` | Keyboard, touch, pause |
| `main.js` | One logic tick (`step`), the frame loop, start-up |

Rules of thumb: tuning numbers go in `config.js`, state goes in `S`, drawing goes in `render.js`. If the game code throws, it shows an error screen (details in the browser console) instead of freezing.

## Workflow habits

- Commit every time something works.
- Commit before asking AI for a big change, so `git restore .` or `git reset --hard HEAD` can undo it.
- Keep originals in `assets/_raw/`; commit only optimized assets.
