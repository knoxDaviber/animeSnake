# animeSnake

Snake, but anime. A fast roguelike where your snake is a chain of anime characters.

A small, fully vibecoded first game: code is written with AI help, and art, music and sound come from other AI tools.

## Status

Early prototype, with the core loop working. You pick a hero on the title screen, choose a run-start buff, then steer a chain of characters around the grid. Heroes attack automatically. Enemy snakes arrive in waves. Eat a key to summon a character, touch it to add it to your chain, and merge three identical followers into a distinct fusion follower.

The current design is being expanded substantially. Heroes now start with no followers. The planned hero prices are Swordsman free, Magician 50 coins, Gunman 100, Goliath 200 and Summoner 200; old saves that already own Gunman keep that unlock.

The next foundation work is movement feel, halved base speed, timed waves, enemies eating keys/recruits, and a larger scrolling world. The economy is also changing: coins become scarce, Pentakills are an optional 5-coin mini-sidequest, and revives move to a fake-ad system. The later roadmap adds enemy types, temporary buff drops, hero levelling, a title-screen shop, kick physics, Goliath, Summoner, rooms/walls/hazards, and a wave 10 boss.

The wave 10 boss is the first boss to build. The wave 20 wizard is intentionally much later because it depends on the larger map/room system.

## Run it

No install needed. Open `src/index.html` in any browser (desktop or phone). Sprites load from `assets/images/`, so keep the folder structure as is.

- Desktop: arrow keys or WASD
- Phone: swipe, or just tap. A tap steers: the screen is split into four zones by an X (top, bottom, left, right), and the X sits a bit below the middle so a thumb near the bottom reaches every direction. There is no on-screen feedback, and text on the page cannot be selected.
- Hero select (the title screen): tap a card, or press its number, or use the arrows and Enter. Locked heroes are bought with coins.
- Mute: M (or the speaker icon on the hero select screen). Sound starts after your first tap or key press.
- Pause: P or Escape (also pauses when the tab loses focus); tap to resume.
- Info bar: press I, or hold the small bar under the game.
- After dying: the target flow is a fake-ad revive rather than a coin-priced revive.
- Restart from the game-over screen: tap or press Space.

## The idea in short

- Your snake is a chain of characters: a hero at the front, followers behind it.
- Characters act as rings: a hit drops one, and you die when none are left.
- Heroes auto-attack in the direction they face. Followers add passives, and some have active skills or change hero speed.
- Three identical followers anywhere in the chain merge into one fusion follower with completely different abilities; you lose 2 characters, so merging is a choice.
- Heroes start with no followers, making the Starting follower buff and pity boost meaningful.
- Enemy snakes arrive in waves and get tougher. Later enemies can eat keys and recruits and grow.
- A larger world uses a scrolling camera so the whole field is not always visible.
- Temporary buff blocks can drop from enemy snakes.
- Coins are intentionally scarce. A Pentakill can award 5 coins as a hidden mini-sidequest; wave milestones and bosses are intended to be the main income.
- Modifier runs such as Pacifist, Glass cannon and Dev mode remain legitimate leaderboard runs but are scored differently.
- The first planned boss is the wave 10 giant snake. The wizard comes much later.

## Heroes

| Hero      | Cost / state              |
| --------- | ------------------------- |
| Swordsman | Free                      |
| Magician  | 50 coins; locked at start |
| Gunman    | 100 coins                 |
| Goliath   | 200 coins                 |
| Summoner  | 200 coins                 |

## Followers and fusions

The five base follower families are Miner, Keysman, Magneto, Raiden and Gorgon.

- **Bomber:** whole-row/column mines, plus a permanent +1 max-mine run modifier.
- **Kingsman:** 1-3 key drops and more likely Keysman summons, plus a permanent +1 damage run modifier.
- **Mr.X:** eats nearby keys and rejects new recruits to shoot at enemies.
- **Raiden Shogun:** lightning attacks and a permanent +10% speed run modifier.
- **Medusa:** freezes enemies in the facing line and can kill a touched enemy head; its fusion buff gives a 60 s shield with shorter cooldowns on later merges.

Exact balance is still subject to play-testing.

## Planned movement and map

The snake feel stays central.

- Two-entry input buffering may prevent quick taps from overwriting each other.
- A configurable 0/1-tick coyote/grace window may forgive an otherwise fatal wall/body move.
- Base hero speed is being halved, with `HERO_SPEED_MAX` raised to 2.0 in the old-speed scale and the minimum lowered.
- Enemies will get their own move timers.
- The world will become larger than the viewport and use a scrolling camera first.
- Room-snap/Zelda-style framing can be layered onto the same room/world structure later.
- Curated room templates, wall types and hazard templates are planned.
- Ghost Body can be tested as a temporary buff: followers stop colliding with your head for a short time, while enemies and walls still matter.

## Economy and retention

The old per-kill/per-wave coin economy is being replaced.

- Coins are scarce.
- Pentakill: 5-coin optional sidequest reward, once per chain.
- Wave milestones and bosses: main intended run income.
- Fake joke ads: used for revives and the hero-select coin button.
- Hero-select ad payouts: 10, 5, 2, 1 coins, then back to 10 after an hour.
- Buff screen: 1 coin for the third card, 5 coins for a mulligan.
- Retention coin tiers remain, but now use coins spent in runs rather than revive coins spent.
- Frustration/pity and high-score pressure remain.

## Code layout

Plain script files, no build step and no server: `src/index.html` loads them in this order.

| File             | What lives there                                                               |
| ---------------- | ------------------------------------------------------------------------------ |
| `config.js`      | Constants and tuning numbers                                                   |
| `sprites.js`     | Loads the shared sprite sheets                                                 |
| `followers.js`   | Followers and fusions, their sheets, `newSlot()`                               |
| `state.js`       | The `S` object holding all mutable game state, and `newRun()`                  |
| `storage.js`     | Saves best score, best combo, best wave, coins, unlocks and retention data     |
| `unlocks.js`     | Click-to-buy unlocks, prices from config.js                                    |
| `audio.js`       | Sound effects and music: synthesized placeholders, real files can replace them |
| `world.js`       | Keys, hazards, free-tile checks, drop effects                                  |
| `score.js`       | Points, combos, coin rewards, floating score text                              |
| `player.js`      | Steering, movement, rings and damage                                           |
| `attacks.js`     | Attack definitions, hit resolution, bullets                                    |
| `heads.js`       | Hero definitions, weapons, passives and hero-select screen                     |
| `skills.js`      | Active follower skills                                                         |
| `mines.js`       | Mines and explosions                                                           |
| `passives.js`    | Follower passives, hero speed, shields and freeze                              |
| `recruits.js`    | Keys summon characters that walk in and wait to be recruited                   |
| `merge.js`       | Three identical followers fuse into a fusion follower                          |
| `buffs.js`       | Run-start buffs and the pick screen                                            |
| `revive.js`      | Death, fake-ad revive flow and game-over                                       |
| `leaderboard.js` | Shared online top 10 and initials box                                          |
| `retention.js`   | High-score pressure, frustration/pity and coin tiers                           |
| `enemies.js`     | Enemy snakes, AI, waves and future enemy types                                 |
| `render.js`      | All drawing, including title screen and HUD                                    |
| `panel.js`       | Info bar                                                                       |
| `input.js`       | Keyboard, touch, swipe/tap zones and pause                                     |
| `main.js`        | World tick, hero movement, frame loop and start-up                             |

Rules of thumb: tuning numbers go in `config.js`, state goes in `S`, drawing goes in `render.js`. If the game code throws, it shows an error screen (details in the browser console) instead of freezing.

## Online leaderboard

An optional shared top 10 is kept in a free Supabase project. It stays off until you paste the publishable key into `src/config.js`. Setup steps are in [Handover.md](Handover.md), and the database script is `tools/supabase_setup.sql`. Never put a secret or service_role key in the game files.

Modifier runs remain eligible; they are scored according to their modifier rather than being excluded.

## Assets

```text
src/                     game code
assets/images/
  characters/            hero sheets, 4x4
  followers/             follower and fusion sheets, 4x4
  enemies/               enemy head and body sheets, 4x4
  attacks/               attack sheets, equal-sized frames
  food.png, hazard.png, mine.png, recruit.png   item sheets
assets/audio/            optimized music and sfx
assets/_raw/             raw AI outputs (git-ignored)
```

## Workflow habits

- Commit every time something works.
- Commit before asking AI for a big change, so `git restore .` or `git reset --hard HEAD` can undo it.
- Keep originals in `assets/_raw/`; commit only optimized assets.
