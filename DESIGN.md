# animeSnake: Design Doc

Working design notes. Balance is not critical; fun comes first. Get everything fun with plain shapes before adding art.

## Pillars

1. **Quick runs.** A run is a few minutes. Dying and restarting should take one tap.
2. **Roguelike.** Each run starts with choices (character, buff) and builds a different chain.
3. **The chain is everything.** Order, composition and merges matter more than raw reflexes.
4. **One more run.** Systems are tuned to keep players coming back (see Retention).

## Core loop

Start a run, pick a starting buff, steer the chain around the grid, eat food, recruit characters, fight enemy snakes in waves, die (or revive), bank coins and score, repeat.

## The chain

- The snake is a chain of anime characters following each other on a grid.
- Each character gives a **buff**, and some also modify the head's attack. A character can have a buff, an attack modifier, or both. Attacks never replace buffs.
- **Rings:** a hit drops one character (the tail). You die when none are left. Walls, hazards and your own body all count as hits. The snake stays put on a blocked move, and after a hit it is invulnerable for 8 ticks (the chain blinks) so one obstacle can't strip the whole chain.
- **Merging:** three **adjacent** identical characters merge into one bigger version with a stronger buff. Chain order becomes a puzzle.

## Recruitment

- Recruitable characters spawn on the grid. You can only recruit one while holding a recruitment object.
- For now there is one generic recruitment item. Later, each character needs its own specific item.

## Combat

- **Only the head attacks** for now. Later, specific characters can help the head attack.
- Attacks fire in the **facing direction**, automatically, on a timer (Vampire Survivors style). Steering is aiming.
- **Attacks are their own objects with their own sprite sheets.** They are not part of any character's art. An attack is spawned on the tile it hits, plays its animation in a layer drawn on top of the grid and the snakes, and stays where it was fired even if the head moves on. The character (or later a buff) only decides which attack is used and how it is modified.
- **Starting weapon: sword.** One-tile melee attack on the tile in front of the head.
- Attacks hit **enemy snakes only** for now. Bombs or barrels may come later.
- Hitting an enemy segment breaks it. Hitting its head kills the whole snake. A snake also dies when all segments are broken.
- **Head-on collision:** both snakes take damage, short stun, then they go their separate ways.
- Hit, stun and drop feedback on characters is done in code (flash, recoil, fade) rather than drawn per character.

### Enemy head toughness (sword hits to kill)

| Waves | Hits |
|-------|------|
| 1-5   | 1    |
| 6-9   | 2    |
| 10-13 | 3    |
| 14-17 | 4    |
| 18+   | 5    |

Enemies move like the player and have simple AI at first.

## Buffs and run setup

- Characters grant buffs while they are in the chain.
- At the start of a run, the player **chooses a buff**, Slay the Spire style.
- One of the buff types will **expand the play area**. Start small, grow with buffs.
- Planned first buffs: 3 simple ones across 3 characters.

## Score

- No drops for now. Kills, food and combos give points.
- **Combos:** chain kills within a short window for a multiplier. The best combo is shown on the HUD.
- High scores and best combos are tracked across runs.

## Meta layer

- Every run pays **coins**.
- Coins revive the run on the spot. Cost rises with each revive in a run.
- Each revive adds **10% of the current score** as a bonus, to encourage using coins.
- Coins also unlock and switch the **starting character**. Each character has a different starting weapon.

## Retention systems (hook design)

These are deliberate. Tune them so deaths feel like near-misses, not cheats.

- **High-score pressure:** from about 85% of the player's best score, enemy pressure ramps up, capped and gradual. Show "X pts to beat your best".
- **Frustration meter:** score from short runs, death streaks and fast restarts. When high, next run gives a **pity** rare upgrade early.
- **Coin tiers:** payout multiplier between about 0.7x and 1.5x based on recent revive spending (heavy users earn more, light users less).
- **Boast hooks:** previous high score, best combo and best wave shown on the death screen.

Note: all coins are earned in-game. If real-money purchases are ever considered, revisit this section first.

## Build order

1. Core Snake with colored squares (done), now with sprite sheets, smooth movement, pause and an attack layer.
2. Rings and damage: hits remove a segment, death at zero, one static hazard.
3. Sword attack hitting enemy snakes (the attack layer and swing timer exist; hits are a stub), enemy snakes and waves.
4. Score and combos.
5. Coins, revive, high-score tracking, retention systems.
6. Recruitment, buffs, run-start buff choice (including expand play area).
7. Merging of three adjacent identical characters.
8. Character unlocks with different starting weapons.
9. Assets and polish: sprites, music, sound effects.

## Open questions

- Does "10% of score on revive" add to the run score each time (assumed), or does it only apply to the high score?
- How many characters and buffs ship in the first playable version?
- How big is the starting grid, and how much does the expand buff add?
- Sword cooldown and swing timing (currently a 6-tick cycle).
- When recruitment items become specific per character, how do they spawn?
- Should attack sheets support frames larger than one tile (wide slashes, area attacks)?