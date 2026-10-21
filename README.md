# animeSnake

Snake, but anime. A fast roguelike where your snake is a chain of anime characters.

A small, fully vibecoded first game: code is written with AI help, and art, music and sound come from other AI tools.

## Status

Early prototype. The core Snake loop works (grid movement, food, growing chain of colored placeholder squares). Everything else is planned in [DESIGN.md](DESIGN.md).

## Run it

No install needed. Open `index.html` in any browser (desktop or phone).

- Desktop: arrow keys or WASD
- Phone: swipe
- Restart after dying: tap or press Space

## The idea in short

- Your snake is a chain of characters. Each gives a buff and some have attacks.
- Characters act as rings: a hit drops one, and you die when none are left.
- Three adjacent identical characters merge into one stronger one.
- The head auto-attacks in the direction it faces, starting with a 1-tile sword.
- Enemy snakes arrive in waves and get tougher.
- Runs are short. Coins from each run buy revives and new starting characters.

Full details, build order and open questions are in [DESIGN.md](DESIGN.md).

## Planned structure

```
src/            game code
assets/images/  optimized sprites (committed)
assets/audio/   optimized music and sfx (committed)
assets/_raw/    raw AI outputs (git-ignored)
```

## Workflow habits

- Commit every time something works.
- Commit before asking AI for a big change, so `git restore .` or `git reset --hard HEAD` can undo it.
- Keep originals in `assets/_raw/`; commit only optimized assets.
