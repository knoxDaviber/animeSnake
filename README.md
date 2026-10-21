# animeSnake

Snake, but anime. A fast roguelike where your snake is a chain of anime characters.

A small, fully vibecoded first game: code is written with AI help, and art, music and sound come from other AI tools.

## Status

Early prototype. The core Snake loop works (grid movement with smooth interpolation, food, growing chain, pause). Character sprite sheets and a separate attack layer are wired up and fall back to colored squares or nothing when a sheet is missing. Everything else is planned in [DESIGN.md](DESIGN.md).

## Run it

No install needed. Open `src/index.html` in any browser (desktop or phone). Sprites load from `assets/images/`, so keep the folder structure as is.

- Desktop: arrow keys or WASD
- Phone: swipe
- Pause: P or Escape (also pauses when the tab loses focus); tap to resume
- Restart after dying: tap or press Space

## The idea in short

- Your snake is a chain of characters. Each gives a buff and some modify attacks.
- Characters act as rings: a hit drops one, and you die when none are left.
- Three adjacent identical characters merge into one stronger one.
- The head auto-attacks in the direction it faces, starting with a 1-tile sword. Attacks are their own sprites, drawn on top of the grid.
- Enemy snakes arrive in waves and get tougher.
- Runs are short. Coins from each run buy revives and new starting characters.

Full details, build order and open questions are in [DESIGN.md](DESIGN.md). Sprite formats are in [ART_SPEC.md](ART_SPEC.md).

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
| `world.js` | Food, the hazard, drop effects |
| `player.js` | Steering, moving, eating, rings and damage |
| `attacks.js` | Attack definitions, the swing timer, hit resolution |
| `enemies.js` | Enemy snakes, their AI, waves |
| `render.js` | All drawing (reads `S`, never changes it) |
| `input.js` | Keyboard, touch, pause |
| `main.js` | One logic tick (`step`), the frame loop, start-up |

Rules of thumb: tuning numbers go in `config.js`, state goes in `S`, drawing goes in `render.js`. If the game code throws, it shows an error screen (details in the browser console) instead of freezing.

## Workflow habits

- Commit every time something works.
- Commit before asking AI for a big change, so `git restore .` or `git reset --hard HEAD` can undo it.
- Keep originals in `assets/_raw/`; commit only optimized assets.
