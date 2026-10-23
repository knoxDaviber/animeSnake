# animeSnake

Snake, but anime. A fast roguelike where your snake is a chain of anime characters.

A small, fully vibecoded first game: code is written with AI help, and art, music and sound come from other AI tools.

## Status

Early prototype, but the core loop is complete. You pick a hero on the title screen (Swordsman and Magician are free, Gunman is bought with coins) and a run-start buff, then steer a chain of characters around a 20x20 grid. Your hero attacks automatically. Enemy snakes arrive in waves. Eat a key to summon a character, touch it to add it to your chain, and merge three identical followers into a stronger fusion follower. Hits drop characters from the tail (rings). Dying starts a 10 second revive countdown that costs coins, which you earn from kills and waves. Coins also unlock heroes. Best score, best combo and coins are saved in the browser, and an optional shared top 10 uses Supabase. Everything else is planned in [DESIGN.md](DESIGN.md).

## Run it

No install needed. Open `src/index.html` in any browser (desktop or phone). Sprites load from `assets/images/`, so keep the folder structure as is.

- Desktop: arrow keys or WASD
- Phone: swipe
- Hero select (the title screen): tap a card, or press its number, or use the arrows and Enter. Tapping a locked hero buys it with coins
- Pause: P or Escape (also pauses when the tab loses focus); tap to resume
- Info bar (hero and follower timers): press I, or hold the small bar under the game
- After dying: any key, click or tap revives if you can pay the coins. Q, Backspace, the Give up button or the timer ends the run
- Restart from the game-over screen: tap or press Space

## The idea in short

- Your snake is a chain of characters: a hero at the front, followers behind it.
- Characters act as rings: a hit drops one, and you die when none are left.
- The hero auto-attacks in the direction it faces. Followers add passives, and some have active skills or change how fast the hero moves.
- Three identical followers anywhere in the chain merge into one fusion follower with completely different abilities (you lose 2 characters, so merging is a choice).
- Enemy snakes arrive in waves and get tougher.
- Runs are short. Coins from kills and waves buy revives and hero unlocks.

Full details, build order and open questions are in [DESIGN.md](DESIGN.md). Sprite formats are in [ART_SPEC.md](ART_SPEC.md). A status note for the next session is in [Handover.md](Handover.md).

## Online leaderboard

An optional shared top 10 kept in a free Supabase project. It stays off until you paste the publishable key into `src/config.js`. Setup steps are in [Handover.md](Handover.md), and the database script is `tools/supabase_setup.sql`. Never put a secret or service_role key in the game files.

## Structure

```
src/                     game code, see "Code layout" below
assets/images/
  characters/            hero sheets, 4x4 (character1 is real art)
  followers/             follower and fusion sheets, 4x4
  enemies/               enemy head and body sheets, 4x4
  attacks/               attack sheets, equal-sized frames
  food.png, hazard.png, mine.png, recruit.png   item sheets
assets/audio/            optimized music and sfx (committed)
assets/_raw/             raw AI outputs (git-ignored)
```

## Code layout

Plain script files, no build step and no server: `src/index.html` loads them in this order.

| File | What lives there |
|------|------------------|
| `config.js` | Constants and tuning numbers |
| `sprites.js` | Loads the shared sprite sheets |
| `followers.js` | Followers and fusions, their sheets, `newSlot()` |
| `state.js` | The `S` object holding all mutable game state, and `newRun()` |
| `storage.js` | Saves best score, best combo, coins and unlocks in the browser |
| `unlocks.js` | Click-to-buy unlocks (heroes now), prices from config.js |
| `world.js` | Keys, the hazard, free-tile checks, drop effects |
| `score.js` | Points, combos, kill coins, floating score text |
| `player.js` | Steering, moving, keys, recruiting, the tail stall, rings and damage |
| `attacks.js` | Attack definitions, hit resolution, bullets |
| `heads.js` | The 3 heroes: weapons, passives, the hero-select screen |
| `skills.js` | Active skills carried by followers |
| `mines.js` | Mines on the map and their explosions |
| `passives.js` | Follower passives, hero speed, Gorgon shields |
| `recruits.js` | Keys summon characters that walk in and wait to be recruited |
| `merge.js` | Three identical followers fuse into a fusion follower |
| `buffs.js` | Run-start buffs and the pick screen |
| `revive.js` | Death: the revive countdown, revive cost, game-over lockout |
| `leaderboard.js` | Shared online top 10 (Supabase) and the initials box |
| `enemies.js` | Enemy snakes, their AI, waves |
| `render.js` | All drawing, including the title screen and the on-canvas score, wave and coins (reads `S`, never changes it) |
| `panel.js` | The info bar |
| `input.js` | Keyboard, touch, pause |
| `main.js` | One world tick (`step`), one hero move (`heroStep`), the frame loop, start-up |

Rules of thumb: tuning numbers go in `config.js`, state goes in `S`, drawing goes in `render.js`. If the game code throws, it shows an error screen (details in the browser console) instead of freezing.

## Workflow habits

- Commit every time something works.
- Commit before asking AI for a big change, so `git restore .` or `git reset --hard HEAD` can undo it.
- Keep originals in `assets/_raw/`; commit only optimized assets.