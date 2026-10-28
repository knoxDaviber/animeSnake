# animeSnake

Snake, but anime. A fast roguelike where your snake is a chain of anime characters.

A small, fully vibecoded first game: code is written with AI help, and art, music and sound come from other AI tools.

## Status

An early prototype with the core loop working and a lot of content. You pick a hero on the title screen, choose a run-start buff, then steer a chain of characters through a world whose shape changes every run. Heroes attack automatically. Enemy snakes arrive in timed waves, rushes and bosses every 10 waves; weapons come from chests hidden in the rooms; doors open when you walk into them.

It is played and fixed in a browser before every commit, but there has been no structured balance pass, so numbers (speeds, wave sizes, boss health, prices) are still first guesses.

Next up: play-testing the latest batches, status effects, more weapons, better mobile controls. See [Handover.md](Handover.md).

## Run it

No install needed. Open `src/index.html` in any browser (desktop or phone). Sprites load from `assets/images/`, so keep the folder structure as is.

- Desktop: arrow keys or WASD.
- Phone: swipe, or tap. A tap steers by four zones split by an X. The run starts on your first move.
- Reversing: you cannot turn straight back on yourself, except when you have no followers.
- Hero select (the title screen): tap a card, press its number, or use the arrows and Enter. Locked heroes are bought with coins. The "i" button (or I) toggles flavour text and stat details. The Shop button (or B) opens the shop.
- Buff screen: tap a card, press 1/2/3, or use arrows and Enter. The third card costs 1 coin; R (or the button) is a mulligan for 5 coins.
- Doors: a door that glows is ready. Walk into it to break it open.
- Chests: walk onto one to get a weapon.
- Mute: M. Pause: P or Escape (also pauses when the tab loses focus); the pause screen has a volume slider (or press - and +) and Give up (Q twice).
- After dying: a countdown offers a revive. With ads on, a revive is a fake joke ad you hold a button to fast-forward.
- Restart from the game-over screen: tap or press Space.

## The idea in short

- Your snake is a chain of characters: a hero at the front, followers behind it. A hit drops one character; you die when none are left. A big enemy snake (longer than 7) takes two at once.
- Heroes auto-attack in the direction they face. Followers add passives and some have skills.
- Three identical followers anywhere in the chain merge into one fusion follower with completely different abilities. You lose 2 characters, so merging is a choice.
- When two heads collide, the longer chain shoves the shorter one back.
- The world is a 5x5 grid of room cells with a different shape every run (cross, keyhole, long L, serpent, stairs, keep, crossbar). Only the start room is open at first. At certain waves some doors glow; walk into one to open its room.
- Up to 4 weapon chests hide in the rooms (1 near the start, 3 farther away). Weapons: Gatling, Ricochet, Nova, Thunder and the Razor (rings of blades that pulse out and back in).
- Enemy snakes get longer, faster and tougher as waves go on. Types: normal, fast, armored, runner (flees until it grows), kamikaze, spitter. Every 5th wave is a rush. Every 10th wave brings a boss, alternating the Great Serpent and the Hollow Wizard, stronger each time. Wave 30 is both at once; beat them to win, and the run goes on.
- Coins: 100 score becomes 1 coin when a run ends. Spend them on heroes, buff cards, the shop and "No ads".

## Heroes

| Hero | Cost | Notes |
| ---- | ---- | ----- |
| Swordsman | Free | A block that absorbs the first enemy-head hit and counters with a heavy slash |
| Magician | 50 coins | Walls open a portal; a 3x3 shockwave |
| Gunman | 100 coins | Bullets ahead and to each side |
| Goliath | 200 coins | Hurt only from behind, kicks, cannot recruit (keys give shields) |
| Summoner | 200 coins | Spends followers to call upgraded spirits |

## Followers and fusions

The five base families are Miner, Keysman, Magneto, Raiden and Gorgon.

- **Bomber:** whole-row and whole-column mines, +1 max mine.
- **Kingsman:** more Keysman summons, +1 weapon damage and +1 key on the map.
- **Mr.X:** eats nearby keys; rejects every recruit except Magneto and shoots it at enemies.
- **Raiden Shogun:** lightning attacks and permanent speed.
- **Medusa:** freezes enemies in the facing line and kills a touched enemy head. A boss can only be hurt by it.
- Raiden sets off your oldest mine on screen every 10 seconds, with a thin blue line first.

Exact balance is subject to play-testing.

## Economy and retention

- Coins come from wave milestones, bosses, rush clears, the victory at wave 30, a hidden Pentakill bonus, fake ads and the end-of-run score conversion.
- Fake joke ads are used for revives and a coin button (`ADS_ENABLED` in `config.js` switches them off; players can buy "No ads").
- Retention systems (high-score pressure, a frustration meter with a pity boost, coin tiers) are on by design (`RETENTION_ON`).
- Modifier runs (Pacifist, Glass cannon, Dev mode, Challenge) are legitimate leaderboard runs, scored with multipliers.

## Code layout

Plain script files, no build step and no server: `src/index.html` loads them in order. The full file map (what each file owns), the task-to-files table and the working rules are in [Handover.md](Handover.md). Rules of thumb: tuning numbers go in `config.js`, state goes in `S`, drawing goes in `render.js`. If the game code throws, an error screen shows (details in the browser console) instead of freezing.

There are two canvases: `#w` fills the window and draws the world (moved by the camera) and the in-game HUD, and `#c` is a 640x640 square centred on top for menus and overlays.

## Online leaderboard

An optional shared top 10 is kept in a free Supabase project. It stays off until you paste the publishable key into `src/config.js`. Setup steps are in [Handover.md](Handover.md); the database script is `tools/supabase_setup.sql` (keeps the best 50, shows 10; `tools/supabase_keep50.sql` upgrades an older setup). Never put a secret or service_role key in the game files.

## Assets

```text
src/                     game code
assets/images/
  characters/            hero sheets, 4x4
  followers/             follower and fusion sheets, 4x4
  enemies/               enemy head and body sheets, 4x4 (the bosses reuse them, scaled up)
  attacks/               attack sheets, equal-sized frames
  food.png, hazard.png, mine.png, recruit.png   item sheets
assets/audio/            optional music and sfx files (the sound is synthesized by default)
assets/ads/              fake ad data (ads_data.js) and pictures
assets/_raw/             raw AI outputs (git-ignored)
tools/                   placeholder generator and Supabase scripts
```

## More docs

- [DESIGN.md](DESIGN.md): the design intent, systems and rules.
- [Handover.md](Handover.md): current state, decisions, backlog, file map and the workflow for working with the assistant.
- [ART_SPEC.md](ART_SPEC.md): sprite formats.
- [Templates.md](Templates.md): sample room templates.

## Workflow habits

- Play it in a browser and commit every time something works.
- Commit before asking AI for a big change, so `git restore .` or `git reset --hard HEAD` can undo it.
- When you describe a new idea, the assistant answers with a plan and the list of files it needs. Upload just those.
- Keep originals in `assets/_raw/`; commit only optimized assets.