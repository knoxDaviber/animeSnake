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
src/                     game code (index.html)
assets/images/
  characters/            4x4 character sheets (committed)
  enemies/               4x4 enemy head and body sheets (placeholders)
  attacks/               attack sheets, equal-sized frames (placeholder sword)
  food.png, hazard.png, recruit.png   item sheets (placeholders)
assets/audio/            optimized music and sfx (committed)
assets/_raw/             raw AI outputs (git-ignored)
```

## Workflow habits

- Commit every time something works.
- Commit before asking AI for a big change, so `git restore .` or `git reset --hard HEAD` can undo it.
- Keep originals in `assets/_raw/`; commit only optimized assets.
