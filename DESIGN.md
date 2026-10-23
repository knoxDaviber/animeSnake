# animeSnake: Design Doc

Working design notes. Balance is not critical; fun comes first. Get everything fun with plain shapes before adding art.

Wording: the playable head is a **hero** everywhere the player can see it.

## Pillars

1. **Quick runs.** A run is a few minutes. Dying and restarting should take one tap.
2. **Roguelike.** Each run starts with choices (hero, buff) and builds a different chain.
3. **The chain is everything.** Composition and merges matter more than raw reflexes.
4. **One more run.** Systems are tuned to keep players coming back (see Retention).

## Core loop

Pick a hero and a starting buff, steer the chain around the grid, eat keys, recruit characters, merge them, fight enemy snakes in waves, die (or pay to revive), bank coins and score, repeat.

## The chain

- The snake is a chain of anime characters following each other on a grid. Slot 0 is the hero, every other slot is a follower.
- **Rings:** a hit drops one character (the tail). You die when none are left. Walls, the hazard, enemy snakes, your own body and mine blasts all count as hits. The snake stays put on a blocked move, and after a hit it is invulnerable for 8 ticks (the chain blinks). A hit absorbed by a shield (the Swordsman's block or a Gorgon's shield) does not blink.
- **Tail stall:** moving into your own tail tile is not a hit. The snake just stops and waits until you choose a direction, which gives enemy snakes time to chase you.
- **Merging:** three identical followers **anywhere in the chain** (no need to be side by side) merge into one **fusion follower**. A fusion is a completely different character with different abilities, not a stronger copy, and it counts as one character, so a merge costs you 2 characters. Fusions are killed like any follower and cannot merge again. Different merges make different fusions.

## Heroes

| Hero | Weapon | Passive |
|------|--------|---------|
| Swordsman | Sword on the tile ahead, 3 damage, about once a second (tunable) | Blocks the first enemy-head hit, recharges after 5 s |
| Magician | 3x3 shockwave centred 2 tiles ahead every 10 s, 1 damage | Walls open a portal to the other side |
| Gunman | A bullet out of each side every 6 s, 1 damage | None yet |

## Followers and fusions

Followers form the body and give passives, and some have active skills. The five base followers and their fusions:

| Follower | Now | Fusion |
|----------|-----|--------|
| Miner | +1 mine blast arm each, mine every 8 s each, max 5 mines | **Bomber**: blast reaches the whole row and column of the mine (like Bomberman), mine every 5 s |
| Keysman | +10% each (max 50%) that a key summons 2 characters | **Kingsman**: key drops are 1-3 keys; Keysman are 40% likelier to be summoned |
| Magneto | Pulls keys up to 4 tiles; enemies chase you more | **Mr.X**: eats keys within 3x3 of your hero; recruits are rejected and shot at the nearest snake for 2-5 damage |
| Raiden | +10% hero speed each (max +50%) | **Raiden Shogun**: +30% hero speed, every 5 s 1-3 lightning damage to the closest enemy tile |
| Gorgon | 1-hit shield each (recharge 20 s, max 5); slows the hero 5% each (max 50%) | **Medusa**: enemy heads in the line you face freeze, any head you touch dies at once; hero slowed 10% |

Speed and slowdown change the hero only, not enemies or skill timers. The hero has its own move timer, separate from the 125 ms world tick.

## Recruitment

- The old food is a **key**: eating it no longer grows the chain. You grow by recruiting a character, which needs a key plus a character.
- Eating a key summons a random follower (never a fusion). It starts outside the grid, walks in, then jumps on the spot. The hero can recruit it from the moment it is on the grid, walking or jumping.
- Enemy snakes can kill recruits. If the character dies before you reach it, the key is wasted.
- Up to 3 can wait at once. A new key drops once every key is gone and fewer than 3 characters wait.
- For now there is one generic key. Later, each character may need its own key.

## Combat

- **Only the hero attacks** for now. Attacks fire in the facing direction, automatically, on a timer. Steering is aiming.
- **Attacks are their own objects with their own sprite sheets**, drawn on top of the grid and snakes.
- Attacks hit **enemy snakes only**.
- **Mines:** explode when any snake head steps on one. The blast is a plus shape; arm length grows with Miners, and a Bomber makes it reach the map edge. Careful: it hurts you too if you stand in line with it.
- Hitting an enemy segment breaks it and cuts off everything behind it. Hitting its head costs hit points; at zero the whole snake dies.
- **Head-on collision:** both snakes take damage, short stun.
- **Waves:** the first wave starts after about 3 seconds. A wave is 1 + wave/3 enemy snakes (max 5), spawned along the edges 10 ticks apart. The next wave starts 16 ticks after the last enemy dies.
- Enemies chase the hero 60% of the time (more with Magnetos), never reverse, and flip around if boxed in.

### Enemy head toughness (hits to kill)

| Waves | Hits |
|-------|------|
| 1-5   | 1    |
| 6-9   | 2    |
| 10-13 | 3    |
| 14-17 | 4    |
| 18+   | 5    |

## Title screen and unlocks

- The title screen IS the hero select screen. The game opens on it, and so does every new run (death, revive countdown, game-over screen, tap, hero select). There is no separate menu.
- The only title element is the game name, floating at the top: "animeSnake", or "Snake-lite" about half the time. A Minecraft-style splash line (a random joke, or a dig at the player or the dev) sits tilted beside it. Both are rolled each time the screen appears (`TITLE_*` and `SPLASHES` in config.js).
- Swordsman and Magician are free. Every other hero is locked until bought with coins (Gunman costs 40). Clicking or tapping a locked card buys it on the spot if you can pay. If you cannot, the card says how many more coins you need and nothing is spent. A bought hero is picked with another click. Your coin total is shown on the screen. There is no shop screen.
- Unlocks are saved by hero id, so adding heroes never breaks old saves. A new hero is locked by default.
- Up to 3 heroes show as big cards. 4 to 8 show as a compact grid, with the focused hero's description under it.
- The unlock logic (`unlocks.js`) is generic. Planned, not built: more sections on this screen, such as Followers (choose which can appear in your run) and Upgrades, with locked items bought by clicking them, like heroes.

## Run start

- First pick the hero (see above), then one of 3 random buffs (10 exist): Extra follower, +10% score, Thick skin, Quick hands, Combo keeper, Skill haste, Bounty hunter, Second wind, Welcome party, Minefield.

## Score and coins

- Kills, keys and cut segments give points. Kill points are 20 x the combo count (capped at x5), plus bonuses. A kill must land within 3 seconds of the last one.
- **Coins** are earned in-game: 3 per kill and 5 per wave started, kept between runs. They pay for revives and hero unlocks.
- **Revive:** on death a 10 second countdown offers a revive for coins (15, then 30, 45... within a run). A revive adds 10% of the score and brings back just the hero with 3 seconds of immunity. If you cannot afford it, the run ends at once. The game-over screen ignores restart input briefly.
- Best score, best combo and coins are saved in the browser. A shared online top 10 (initials) is optional.

## In-game display

- Score, wave and coins are drawn on the canvas in a fixed row at the top (score left, wave centre, coins right). While a combo runs it shows under the score.
- Nothing sits above the canvas, so no number can ever move or resize the game.
- Chain length and the run's buff are on the info bar's muted line. Best score and best combo are on the game-over screen.

## Audio

- Placeholder sounds and music are synthesized in code (`audio.js`), so the game has sound before any real audio exists. A real file replaces any one of them by being listed in `SFX_FILES` / `MUSIC_FILES` (config.js).
- Sound effects follow what happens: sword swish, shockwave, gunshot, enemy hit, cut, kill (the pitch climbs with the combo), mine drop and explosion, Shogun lightning, Medusa gaze, Mr.X shot, Swordsman block (a clang) versus Gorgon shield (stone), losing a character, portal, tail stall, key, summon, recruit, recruit lost, merge fanfare, wave horn and wave-clear jingle, enemy arrival, death, revive countdown ticks (higher in the last 3 s), revive, game over, new best, and menu sounds (focus, choose hero, unlock, can't afford, run start, pause).
- Music has four moods that crossfade: title (hero and buff pick), run (calm), battle (enemies about; lingers 2.5 s after the last one dies), tense (revive countdown). The game-over screen is silent apart from its sting. Music gets quieter while paused.
- Mute with M anywhere, or the speaker icon on the hero select screen. The choice is saved. Sound starts at the player's first tap or key press (a browser rule).

## Retention systems (hook design, not built yet)

These are deliberate. Tune them so deaths feel like near-misses, not cheats.

- **High-score pressure:** from about 85% of the player's best score, enemy pressure ramps up, capped and gradual. Show "X pts to beat your best".
- **Frustration meter:** score from short runs, death streaks and fast restarts. When high, the next run gives a pity upgrade early.
- **Coin tiers:** payout multiplier between about 0.7x and 1.5x based on recent revive spending.
- **Boast hooks:** previous high score, best combo and best wave on the death screen.
- **Shared leaderboard:** done (Supabase, best 50 stored, 10 shown).

Note: all coins are earned in-game. If real-money purchases are ever considered, revisit this section first.

## Future ideas (not decided)

- **Rooms:** instead of one big map, several rooms you can enter to expand the map.
- **Walls:** different kinds of walls.
- **Floors vs curated rooms:** floors could move hazard locations around, but curated, dungeon-like rooms may be the better way to give the map variety. The user leans towards curated rooms. Decide before building any map system.
- **Expand-grid buff:** set aside; it may be replaced by rooms.
- **Per-character keys** once recruitment is richer.
- **Kick the mines:** the hero (or a follower) can kick a mine so it slides and explodes on contact with anything. Undecided: who kicks, slide speed and distance, what counts as contact, and whether the blast can hurt you.

## Build order

1. Core Snake loop, sprites, smooth movement. (done)
2. Rings and damage, one hazard. (done)
3. Sword, enemy snakes and waves, mines. (done)
4. Score and combos. (done)
5. Coins and revive cost. (done, minimal) Retention systems. (pending)
6. Recruitment, 3 heroes, 5 followers, 10 buffs, run-start picks. (done)
7. Merging into fusions: all five families (Miner, Keysman, Magneto, Raiden, Gorgon) plus the hero speed system. (done)
8. Coin-gated hero unlocks, title screen as hero select, on-canvas display. (done)
9. Rooms, wall types and map variety.
10. Assets and polish: sprites (pending). Music and sound effects: placeholder synth sounds and music are done, real recordings are still to come.

## Open questions

- Sword numbers: 3 damage about once a second makes early waves trivial. Check against the difficulty curve.
- How should keys spawn once they become specific per character?
- Rooms: how do the player and enemies move between them, and what carries over?
- Followers and Upgrades sections on the title screen: what do they unlock, and what do they cost?
