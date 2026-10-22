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
- **Tail stall:** moving into your own tail tile is not a hit. The snake just stops and waits until you choose a direction, which gives enemy snakes time to chase you.
- **Merging:** three **adjacent** identical characters merge into one bigger version with a stronger buff. Chain order becomes a puzzle.

## Recruitment

- Recruitment replaces food growth. The old food is now a **key**: eating food no longer grows the chain. You grow by recruiting a character, which needs a key plus a character.
- Characters **walk into the play area from the edges at random**. Touch one while holding a key to recruit it onto the tail of the chain.
- Picking up a key summons a character right away. It starts outside the grid, walks in, then jumps on the spot to show it is ready. The whole process takes 1 to 2 seconds at most. Only a ready (jumping) character can be recruited. Up to 3 can wait at once; no new key appears until one is recruited or killed.
- Enemy snakes can kill recruitable characters. If the character dies before you reach it, the key is wasted and you need another.
- For now there is one generic key. Later, each character needs its own specific key.

## Combat

- **Only the head attacks** for now. Later, specific characters can help the head attack.
- Attacks fire in the **facing direction**, automatically, on a timer (Vampire Survivors style). Steering is aiming.
- **Attacks are their own objects with their own sprite sheets.** They are not part of any character's art. An attack is spawned on the tile it hits, plays its animation in a layer drawn on top of the grid and the snakes, and stays where it was fired even if the head moves on. The character (or later a buff) only decides which attack is used and how it is modified.
- **Starting weapon: sword.** One-tile melee attack on the tile in front of the head.
- Attacks hit **enemy snakes only** for now.
- Attack sheets should support variety, but keep it simple for now (the sword is the only attack).
- **Mines:** static objects that explode when a snake head hits one (player or enemy). Blast size and damage are still to be decided.
- Hitting an enemy segment breaks it, and everything behind it is cut off. Hitting its head costs it one hit point, and at zero the whole snake dies.
- **Head-on collision:** both snakes take damage (the player loses a character, the enemy head loses a hit point), short stun, then they go their separate ways. Enemy bodies block the player like walls and cost a hit.
- **Waves:** the first wave starts after about 3 seconds. A wave is 1 + wave/3 enemy snakes (max 5), spawned along the edges 10 ticks apart. The next wave starts 16 ticks after the last enemy dies.
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
- One of the buff types will **expand the play area**: the starting 20x20 grid gets one extra tile ring on every side, and the whole playfield scales down to fit the screen.
- The first version ships **3 unique characters and 10 buffs**.

## Score

- No drops for now. Kills, food and combos give points.
- **Combos:** chain kills within a short window for a multiplier. The best combo is shown on the HUD. A kill must land within 3 seconds of the last one. Kill points are 20 x the combo count, capped at x5. Food (10) and cut segments (5) are flat, and getting hit does not break a combo. A bar along the top of the board shows the time left.
- High scores and best combos are tracked across runs, saved in the browser (localStorage).

## Meta layer

- Every run pays **coins**.
- Coins revive the run on the spot. Cost rises with each revive in a run.
- Each revive adds **10% of the current score on top of the current score**, to encourage using coins.
- On death a **10 second countdown** offers the revive. Any key (or tap) revives; Backspace, Q or running out of time goes to the death screen, which ignores restart input briefly so there is no instant restart. Until coins exist, revives are free.
- Coins also unlock and switch the **starting character**. Each character has a different starting weapon.

## Retention systems (hook design)

These are deliberate. Tune them so deaths feel like near-misses, not cheats.

- **High-score pressure:** from about 85% of the player's best score, enemy pressure ramps up, capped and gradual. Show "X pts to beat your best".
- **Frustration meter:** score from short runs, death streaks and fast restarts. When high, next run gives a **pity** rare upgrade early.
- **Coin tiers:** payout multiplier between about 0.7x and 1.5x based on recent revive spending (heavy users earn more, light users less).
- **Boast hooks:** previous high score, best combo and best wave shown on the death screen.
- **Shared leaderboard:** the game-over screen shows an online top 10 (3-letter initials). Beating the 10th place lets the player add their initials. Held in a Supabase table (best 50 stored, 10 shown); the browser can only read and add scores.

Note: all coins are earned in-game. If real-money purchases are ever considered, revisit this section first.

## Build order

1. Core Snake with colored squares (done), now with sprite sheets, smooth movement, pause and an attack layer.
2. Rings and damage: hits remove a segment, death at zero, one static hazard. (done)
3. Sword attack hitting enemy snakes, enemy snakes and waves. (done, simple AI)
3b. Mines: explode when any snake head hits one. (done)
4. Score and combos. (done)
5. Coins, revive, high-score tracking, retention systems. (high-score tracking, a free revive countdown and the shared top-10 leaderboard are done; coins and the rest are pending)
6. Recruitment (keys and walking-in characters replace food growth) (done), then 3 characters and 10 buffs, run-start buff choice (including expand play area).
7. Merging of three adjacent identical characters.
8. Character unlocks with different starting weapons.
9. Assets and polish: sprites, music, sound effects.

## Open questions

- Sword cooldown and swing timing (currently a 6-tick cycle).
- Of the 10 buffs, how many belong to a specific character and how many are run-start picks?
- Mine blast size, damage, and how many spawn (fine for now, tune after playing).
- When recruitment keys become specific per character, how do they spawn?