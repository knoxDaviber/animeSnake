# animeSnake

Snake, but anime. A fast roguelike where your snake is a chain of anime characters.

A small, fully vibecoded first game: code is written with AI help, and art, music and sound come from other AI tools.

## Status

Early prototype with the core loop working. You pick a hero on the title screen, choose a run-start buff, then steer a chain of characters around a world that scrolls under a camera. Heroes attack automatically. Enemy snakes arrive in timed waves, and wave 10 brings a gridless boss. Eat a key to summon a character, touch it to add it to your chain, and merge three identical followers into a distinct fusion follower.

Built but **not yet play-tested in a browser**: the movement-feel fixes, the halved speed system, timed waves, enemies that eat keys and recruits, four enemy types, the scarce-coin economy with fake joke ads, Pacifist and Challenge modes, hero levelling with weapon branches, the title-screen shop, the scrolling camera over a 60x60 world made of room templates (walls, hazards, mud, conveyors, gates, ice, push blocks, bumpers, crumbling floor, turrets), kick physics with the Goliath hero, and the wave 10 boss (the Great Serpent: a smooth, gridless snake with a crit-on-head, swap-ends fight).

Heroes start with no followers. Hero prices: Swordsman free, Magician 50 coins, Gunman 100, Goliath 200 (built), Summoner 200 (not built yet). Old saves that already own Gunman keep that unlock.

Next up: play-testing, then temporary buff drops, Summoner, Goliath extras, and much later the wave 20 wizard.

## Run it

No install needed. Open `src/index.html` in any browser (desktop or phone). Sprites load from `assets/images/`, so keep the folder structure as is.

- Desktop: arrow keys or WASD
- Phone: swipe, or just tap. A tap steers: the screen is split into four zones by an X (top, bottom, left, right), and the X sits a bit below the middle so a thumb near the bottom reaches every direction. A tap anywhere on the screen counts, also outside the square UI area. There is no on-screen feedback, and text on the page cannot be selected.
- Hero select (the title screen): tap a card, or press its number, or use the arrows and Enter. Locked heroes are bought with coins. The "i" button (or I) toggles flavour text and stat details. Shop button (or B) opens the shop.
- Buff screen: tap a card, press 1/2/3, or use arrows and Enter. The third card costs 1 coin to reveal; R (or the button) is a mulligan for 5 coins.
- Mute: M (or the speaker icon on the hero select screen). Sound starts after your first tap or key press.
- Pause: P or Escape (also pauses when the tab loses focus); tap to resume. While paused, press Q (or tap Give up) twice to quit the run.
- After dying: a countdown offers a revive. With ads on, a revive is a fake joke ad you hold a button to fast-forward.
- Restart from the game-over screen: tap or press Space.

## The idea in short

- Your snake is a chain of characters: a hero at the front, followers behind it.
- Characters act as rings: a hit drops one, and you die when none are left.
- Heroes auto-attack in the direction they face. Followers add passives, and some have active skills or change hero speed.
- Three identical followers anywhere in the chain merge into one fusion follower with completely different abilities; you lose 2 characters, so merging is a choice.
- Heroes start with no followers, making the Starting follower buff and the pity boost meaningful.
- Enemy snakes arrive in timed waves and get tougher. They eat keys and recruits, and grow and speed up when they do. Later waves bring fast thin snakes, armored heads and spitters, and some rooms favour one type.
- At wave 10 a giant snake that ignores the grid slides in. Hit its head for a crit: it flashes, swaps head and tail and keeps coming. It eats other snakes, charges at you after a red telegraph, and beating it opens a reward pick.
- The world is 60x60 tiles and the camera follows you, so you never see all of it. The view adapts to the device: about 20 tiles on the short side, at most 32 on the long side.
- Coins are scarce. A Pentakill can award 5 coins as a hidden mini-sidequest; wave milestones and bosses are the main income. Fake ads give small payouts on the hero select screen.
- Modifier runs such as Pacifist, Glass cannon and Dev mode are legitimate leaderboard runs but are scored differently.
- Hero levelling: kills give XP, and every 5 levels you pick a weapon branch (Gatling, Ricochet, Nova, Thunder).

## Heroes

| Hero      | Cost / state                          |
| --------- | ------------------------------------- |
| Swordsman | Free                                  |
| Magician  | 50 coins; locked at start             |
| Gunman    | 100 coins                             |
| Goliath   | 200 coins (built, needs art)          |
| Summoner  | 200 coins (planned, not built)        |

## Followers and fusions

The five base follower families are Miner, Keysman, Magneto, Raiden and Gorgon.

- **Bomber:** whole-row/column mines, plus a permanent +1 max-mine run modifier.
- **Kingsman:** more likely Keysman summons, plus two permanent run modifiers: +1 damage and +1 key on the map (food presence).
- **Mr.X:** eats nearby keys and rejects new recruits to shoot at enemies.
- **Raiden Shogun:** lightning attacks and a permanent +10% speed run modifier.
- **Medusa:** freezes enemies in the facing line and can kill a touched enemy head; its fusion leaves a shield (60 s recharge, shorter on later merges). The boss can only be hurt by it, not frozen or killed outright.

Exact balance is still subject to play-testing.

## Movement and map

The snake feel stays central.

- Built: a two-entry input buffer, a configurable 0/1-tick grace window for an otherwise fatal wall/body move, halved base hero speed, enemies with their own move timers.
- Built (untested): a 60x60 world with a smooth scrolling camera, a 3x3 grid of 20x20 room templates (see [templates.md](templates.md)) with walls, hazards, mud, conveyors, one-way gates, ice, push blocks, bumpers, crumbling floor and wall turrets. Three keys lie on the map at once (a Kingsman fusion adds one), and an arrow points to the nearest one. Enemies and recruits come in from just outside your view.
- Planned: more room templates, a Ghost Body temporary buff (followers stop colliding with your head for a short time). Room-snap/Zelda-style framing can be layered on the same structure later.

## Economy and retention

- Coins are scarce. Pentakill: 5-coin optional sidequest reward, once per chain. Wave milestones (waves 5, 10, 15, 20) and the wave 10 boss pay coins.
- Fake joke ads: used for revives and the hero-select coin button (payouts 10, 5, 2, 1, then back to 10 after an hour). `ADS_ENABLED` in `config.js` switches them off, and players can buy "No ads".
- Buff screen: 1 coin for the third card, 5 coins for a mulligan.
- Shop: locked run buffs (Magician's gift, Everything is a bomb, Pacifist, Challenge, Dev mode, Glass cannon, +20% score) and permanent starting followers.
- Retention: coin tiers (based on coins spent in recent runs), frustration/pity boost, high-score pressure, boast hooks. `RETENTION_ON` switches them all off.

## Code layout

Plain script files, no build step and no server: `src/index.html` loads them in this order.

| File             | What lives there                                                                |
| ---------------- | ------------------------------------------------------------------------------- |
| `config.js`      | Constants and tuning numbers (including `BOSS_*`)                               |
| `sprites.js`     | Loads the shared sprite sheets                                                  |
| `followers.js`   | Followers and fusions, their sheets, `newSlot()`                                |
| `state.js`       | The `S` object holding all mutable game state, and `newRun()`                   |
| `storage.js`     | Saves best score, best combo, best wave, coins, unlocks, shop and retention data |
| `unlocks.js`     | Click-to-buy unlocks, prices from config.js                                     |
| `audio.js`       | Sound effects and music: synthesized placeholders, real files can replace them  |
| `world.js`       | Tiles, keys, push blocks, free-tile checks, text-zone check, drop effects       |
| `rooms.js`       | Room templates, themes, world builder                                           |
| `score.js`       | Points, combos, coin rewards, floating score text                               |
| `player.js`      | Steering, movement, terrain, rings and damage                                   |
| `camera.js`      | Scrolling camera, view size for the device, `viewTiles()`                       |
| `attacks.js`     | Attack definitions, hit resolution, bullets                                     |
| `heads.js`       | Hero definitions, weapons, passives and hero-select screen                      |
| `levels.js`      | Hero levelling: XP, weapon branches                                             |
| `skills.js`      | Active follower skills                                                          |
| `mines.js`       | Mines and explosions                                                            |
| `passives.js`    | Follower passives, hero speed, shields and freeze                               |
| `recruits.js`    | Keys summon characters that walk in and wait to be recruited                    |
| `kicks.js`       | Kick physics for mines, keys and recruits, Goliath rules                        |
| `merge.js`       | Three identical followers fuse into a fusion follower                           |
| `buffs.js`       | Run-start buffs and the pick screen                                             |
| `shop.js`        | Title-screen shop, permanent starting followers                                 |
| `revive.js`      | Death, revive flow, give up, game-over                                          |
| `ads.js`         | Fake joke ads (data in `assets/ads/ads_data.js`)                                |
| `retention.js`   | High-score pressure, frustration/pity and coin tiers                            |
| `leaderboard.js` | Shared online top 10 and initials box                                           |
| `enemies.js`     | Enemy snakes, AI, spitters, turrets and timed waves                             |
| `boss.js`        | The wave 10 gridless boss, its AI, drawing and reward pick                      |
| `scenery.js`     | Floor, wall and terrain tiles, and the story decor (no art files needed)        |
| `render.js`      | All drawing, including title screen                                             |
| `hud.js`         | Window-corner HUD, buff list, level bar, key arrow                              |
| `input.js`       | Keyboard, touch, swipe/tap zones and pause                                      |
| `main.js`        | World tick, hero movement, frame loop and start-up                              |

Rules of thumb: tuning numbers go in `config.js`, state goes in `S`, drawing goes in `render.js`. If the game code throws, it shows an error screen (details in the browser console) instead of freezing.

There are two canvases: `#w` fills the window and draws the world (moved by the camera) and the in-game HUD, and `#c` is a 640x640 square centred on top for menus and overlays.

## Online leaderboard

An optional shared top 10 is kept in a free Supabase project. It stays off until you paste the publishable key into `src/config.js`. Setup steps are in [Handover.md](Handover.md), and the database script is `tools/supabase_setup.sql` (keeps the best 50, shows 10; `tools/supabase_keep50.sql` upgrades an older setup). Never put a secret or service_role key in the game files.

Modifier runs remain eligible; they are scored according to their modifier rather than being excluded.

## Assets

```text
src/                     game code
assets/images/
  characters/            hero sheets, 4x4
  followers/             follower and fusion sheets, 4x4
  enemies/               enemy head and body sheets, 4x4 (the boss reuses them, scaled up)
  attacks/               attack sheets, equal-sized frames
  food.png, hazard.png, mine.png, recruit.png   item sheets
assets/audio/            optimized music and sfx
assets/ads/              fake ad data (ads_data.js) and pictures
assets/_raw/             raw AI outputs (git-ignored)
tools/                   placeholder generator and Supabase scripts
```

## More docs

- [DESIGN.md](DESIGN.md): the design, pillars, systems and build order.
- [Handover.md](Handover.md): the current state for whoever picks this up next.
- [ART_SPEC.md](ART_SPEC.md): sprite formats.
- [templates.md](templates.md): sample room templates for the room system.

## Workflow habits

- Commit every time something works.
- Commit before asking AI for a big change, so `git restore .` or `git reset --hard HEAD` can undo it.
- Keep originals in `assets/_raw/`; commit only optimized assets.