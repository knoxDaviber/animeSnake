# animeSnake: Design Doc

Working design notes. Balance is not critical; fun comes first. Get everything fun with plain shapes before adding art.

**Wording:** the playable head is a **hero** everywhere the player can see it.

## Pillars

1. **Quick runs.** A run is a few minutes. Dying and restarting should take one tap.
2. **Roguelike.** Each run starts with choices (hero, buff) and builds a different chain.
3. **The chain is everything.** Composition and merges matter more than raw reflexes.
4. **One more run.** Systems are tuned to keep players coming back (see Retention).

## Core loop

Pick a hero and a starting buff, steer the chain around the grid, eat keys, recruit characters, merge them, fight enemy snakes in waves, die (or revive through the ad system), bank coins and score, repeat.

## Controls

- Desktop: arrows or WASD.
- Phone: swipe, or tap. The canvas is split into four zones by an X (top, bottom, left, right); a tap steers toward its zone. The X is centred below the middle (`TAP_CENTER_Y`, 0.62 of the height) so a thumb near the bottom reaches every direction. Taps give no on-screen feedback. A tap that turns into a swipe is a swipe. A tap that only resumes from pause does not steer.
- Planned movement-feel fixes: a two-entry input buffer and a configurable 0/1-tick coyote/grace window (`GRACE_TICKS`) for moves that would otherwise hit a wall or body. These are meant to soften trapping without removing the snake feel.
- A reverse action may be tested later for one-segment heroes; the broader enemy U-turn behaviour remains separate.
- Page text is not selectable, so long-presses never pop up menus. The initials box stays typable.

## The chain

- The snake is a chain of anime characters following each other on a grid. Slot 0 is the hero, every other slot is a follower.
- **Rings:** a hit drops one character (the tail). You die when none are left. Walls, the hazard, enemy snakes, your own body and mine blasts all count as hits. The snake stays put on a blocked move, and after a hit it is invulnerable for 8 ticks (the chain blinks). A hit absorbed by a shield (the Swordsman's block or a Gorgon's shield) does not blink.
- **Tail stall:** moving into your own tail tile is not a hit. The snake just stops and waits until you choose a direction, which gives enemy snakes time to chase you.
- **Merging:** three identical followers **anywhere in the chain** (no need to be side by side) merge into one **fusion follower**. A fusion is a completely different character with different abilities, not a stronger copy, and it counts as one character, so a merge costs you 2 characters. Fusions are killed like any follower and cannot merge again. Different merges make different fusions.
- Heroes start with **no followers** (`START_FOLLOWERS = []`). A lone hero therefore has one life. The Starting follower buff and pity boost are deliberately more valuable as a result.
- A larger world is planned. The initial implementation should use a **scrolling camera** over a world larger than the visible area. Room-snap framing remains compatible with the same world/room structure and can be explored later.

## Heroes

| Hero      | Weapon                                                                                                     | Passive                                                                          |
| --------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Swordsman | Sword on the tile ahead, 3 damage, about once a second (tunable)                                           | Blocks the first enemy-head hit, recharges after 5 s                             |
| Magician  | Magician keeps the 3x3 shockwave, now charge-based (2 charges, 5 s per charge, fires by itself when an enemy is in range). | Walls open a portal to the other side                                            |
| Gunman    | A bullet out of each side every 16 ticks, with a front bullet added                                        | None yet                                                                         |
| Goliath   | No normal follower body; the player protects him by facing threats                                         | Back/side contacts hurt; front contact is harmless under the Goliath rules below |
| Summoner  | Planned autonomous-follower hero; summons and fusion summons have timed lifetimes and context AI           | Planned                                                                          |

### Hero unlocks

- Swordsman is free.
- Magician starts locked and costs 50 coins.
- Gunman costs 100 coins.
- Goliath and Summoner cost 200 coins.
- Unlocks are saved by hero id. Old saves that already own Gunman keep it; an old save that does not own it follows the new price/lock rule.

### Goliath

Goliath is tied to the kickable-projectile system.

- Anything that touches Goliath from a tile other than the one he faces hurts him.
- A hit from the front is harmless, including walls, the hazard and enemy heads.
- Mines kill him regardless of facing.
- The intended rule is "he is looking at the thing that hit him", not a literal follower-defined back.
- Because a lone hero has no body to reverse into, an instant reverse can be allowed when the chain is one segment long.
- Goliath moves at **0.75x** the halved base speed.
- His merged-follower walking rule, food shields, wall-kick fusion reversion and every-5-kicks merge behaviour depend on the kickable-projectile system.

## Followers and fusions

Followers form the body and give passives, and some have active skills.

| Follower | Now                                                             | Fusion                                                                                                                                                                    |
| -------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Miner    | +1 mine blast arm length each; mine every 8 s each, max 5 mines | **Bomber**: blast reaches the whole row and column of the mine; mine every 5 s; fusion gives +1 max mine as a permanent run modifier                                      |
| Keysman  | +10% each (max 50%) that a key summons 2 characters             | **Kingsman**: key drops are 1-3 keys; Keysman are 40% likelier to be summoned                                                                                             |
| Magneto  | Pulls keys up to 4 tiles; enemies chase you more                | **Mr.X**: eats keys within 3x3 of your hero; recruits are rejected and shot at the nearest snake for 2-5 damage                                                           |
| Raiden   | +10% hero speed each (max +50%)                                 | **Raiden Shogun**: +30% hero speed, every 5 s 1-3 lightning damage to the closest enemy tile; fusion gives +10% speed as a permanent run modifier                         |
| Gorgon   | 1-hit shield each (max 5); slows the hero 5% each (max 50%)     | **Medusa**: enemy heads in the line you face freeze, any head you touch dies at once; hero slowed 10%; fusion gives a 60 s shield with a shorter cooldown on later merges |

**Fusion permanent buffs:** Bomber +1 max mines, Kingsman +1 damage, Shogun +10% speed, and Medusa's 60 s shield/shorter later cooldown are **run modifiers** stored in `S`. They persist for the current run, not across runs. Exact implementation/tuning belongs with the fusion work.

**Keysman overlap:** the new rule is that recruiting a Keysman summons a non-Keysman follower. The existing "+10% double summon" passive stays for now. Both remain unless play-testing shows that the overlap is too strong.

Speed and slowdown change the hero only, not enemies or skill timers. The hero has its own move timer, separate from the 125 ms world tick.

## Recruitment

- The old food is a **key**: eating it no longer grows the chain. You grow by recruiting a character, which needs a key plus a character.
- Eating a key summons a random follower (never a fusion). It starts outside the grid, walks in, then jumps on the spot. The hero can recruit it from the moment it is on the grid, walking or jumping.
- Enemy snakes can kill recruits. If the character dies before you reach it, the key is wasted.
- Up to 3 can wait at once. A new key drops once every key is gone and fewer than 3 characters wait.
- For now there is one generic key. Later, each character may need its own key.
- In the larger-map version, recruits should spawn near the player rather than at a far world edge, so their walk-in remains meaningful.

## Combat

- **Only the hero attacks** for now. Attacks fire in the facing direction, automatically, on a timer. Steering is aiming.
- **Attacks are their own objects with their own sprite sheets**, drawn on top of the grid and snakes.
- Attacks hit **enemy snakes only**.
- **Mines:** explode when any snake head steps on one. The blast is a plus shape; arm length grows with Miners, and a Bomber makes it reach the map edge. Careful: it hurts you too if you stand in line with it.
- **Kickable projectiles:** one kickable-projectile system will serve both the old mine-kick idea and Goliath. The exact kick physics are part of Tier 4.
- Hitting an enemy segment breaks it and cuts off everything behind it. Hitting its head costs hit points; at zero the whole snake dies.
- **Head-on collision:** both snakes take damage, short stun.
- **Waves:** the first wave starts after about 3 seconds. The old fixed spawn timing is being replaced by timed waves: about 10 s early, 30 s by wave 10 and 60 s by wave 20. Waves need a cap on live enemies. During boss fights, no new regular snakes arrive and the wave timer is paused.
- Enemies chase the hero, never reverse, and flip around if boxed in. Exact chase scaling remains tunable.

### Enemy head toughness

| Waves | Hits |
| ----- | ---- |
| 1-5   | 1    |
| 6-9   | 2    |
| 10-13 | 3    |
| 14-17 | 4    |
| 18+   | 5    |

### Enemy types

Planned enemy variants are introduced in wave bands:

- Fast thin snakes.
- Armored heads.
- Spitters that fire back.
- Room templates can favour certain enemy types.

## Speed rework

The old hero-speed values are being replaced.

- Base hero speed is **halved** for everyone.
- `HERO_SPEED_MAX` becomes 2.0, expressed in the old-speed scale/range rather than as "2x the new base".
- `HERO_SPEED_MIN` is lowered because Goliath at 0.75x the halved base would otherwise fall below the current 0.4 floor.
- Enemy snakes get their own movement timers, analogous to the hero's move timer, rather than moving only on the shared world tick.
- Wave scaling and food-eating speed-ups (+0.1) hang off the new speed system.
- Raiden/Shogun bonuses should be treated as additive in old-speed units during implementation; exact values need play-testing. The current tuning idea is that Raiden may need a larger per-follower bonus than +0.1 to make its cap meaningful.
- Speed changes still affect the hero only unless an explicit enemy-speed rule says otherwise.

## Waves and bosses

### Timed waves

Wave duration grows with progression:

- About 10 seconds in the early game.
- About 30 seconds by wave 10.
- About 60 seconds by wave 20.

There is a cap on live enemies. During a boss fight, regular spawning stops and the wave timer pauses.

### Wave 10 boss: giant snake

The first boss is a **gridless giant snake**.

- It swaps head and tail when hit.
- It eats other snakes.
- New regular snakes do not arrive during the boss fight.
- Its growth from eating is therefore naturally bounded by the snakes already alive; any additional cap can be tuned if needed.
- The boss is the first boss to build. The wave 20 wizard is deliberately much later.

### Wave 20 wizard

The wizard is not part of the first boss implementation. It comes after the larger-map/room work.

Planned abilities:

- Teleporting.
- A persistent map-wide laser.
- A forcefield that pushes the player out.
- Firing across rooms.

The wizard should become scarier because the player cannot see the entire larger map at once.

## Larger map, camera and rooms

The current 20x20 grid is not the final world size.

### Scrolling camera first

The first larger-map implementation should use a scrolling camera.

- `COLS` and `ROWS` split into world size and view size.
- World drawing is translated by the camera; HUD, popups and overlays remain in screen space.
- Enemies can spawn at world edges and arrive from outside the visible area.
- Recruits spawn near the player so their walk-in is visible and useful.
- Text/hud-covered screen zones become camera-relative spawn exclusions.
- A faint edge arrow for nearby keys is intentionally **not** included initially; searching is part of the intended tension.
- A larger map is also a trapping-feel solution: the player can no longer see the entire field, so finding food and tracking threats takes more work.

### Room snap later

Room-snap/Zelda-style framing remains a possible presentation layer over the same larger world:

|             | Scrolling camera               | Room snap                         |
| ----------- | ------------------------------ | --------------------------------- |
| Feel        | Smooth, always centered on you | Screen flips as you cross an edge |
| Hidden info | Edges cut off                  | Whole other rooms hidden          |
| Wizard      | Fires from off-screen          | Fires from another room           |
| Cost        | Lower initial cost             | Needs doorways and room logic     |

The preferred sequence is scrolling camera first, then room-snap behaviour if it adds enough value. Room and hazard templates should be compatible with both.

### Rooms, walls and hazards

Curated rooms are preferred over purely procedural floors.

- Rooms can be stamped as templates onto a larger world, initially around 20x20 chunks.
- Wall types and hazard templates are part of the same structural change.
- Enemies and recruits must cross room boundaries.
- The wizard's cross-room attacks depend on this support.

## Temporary buffs

Enemy snakes can drop temporary buff blocks when they die. They are deliberately short-lived and shown as icons with timer bars.

Candidate drops:

- **Ghost body:** about 8 s; followers do not collide with your own head, while enemies and walls still do. This is a temporary test of the anti-trapping idea without removing the snake identity.
- **Haste:** short speed boost.
- **Magnet:** short key pull.
- **Bubble:** absorbs one hit.
- **Frenzy:** halves weapon cooldown.

Enemy types may have preferred drops, such as an armored snake dropping Bubble.

## Buffs

The old buff list is being cleaned up.

- Extra follower → **Starting follower**.
- +10% score → **+20% score**.
- Bounty hunter → **removed**.
- Get Rich Quick → **added** (the intended name is "Rich").
- Second wind → free revive.
- Glass cannon → flag-style modifier.
- Dev mode → flag-style modifier; one WASD step per press.
- Everything is a bomb → flag-style modifier.
- Magician's gift → flag-style modifier.
- Other existing buffs remain unless removed by implementation/testing.

The pity boost still matters because heroes now start with no followers.

### Buff screen economy

- 1 coin unlocks the third card.
- 5 coins buys a mulligan.

## Score and coins

- Kills, keys and cut segments give points. Kill points are 20 x the combo count, capped at x5. A kill must land within 3 seconds of the last one.
- **Combo coins are a hidden side quest.** A chain can earn up to 5 extra coins for a Pentakill. It is not a normal per-kill payout: the player gets the reward for completing the side quest, and ordinary kills in the chain do not each pay coins. Players who read the docs can deliberately chase it.
- The economy is intentionally scarce. Most reliable run income should come from wave milestones and bosses, with combo rewards as optional bonus income.
- A wave 10 boss may pay about 10 coins and a wave 20 boss about 20 coins; these are tuning targets, not final balance.
- Challenge's 100-coin reward is intentionally hard relative to the 50/100/200 hero prices. It can be made harder later if necessary.
- Coins are kept between runs and are used for hero unlocks, buff-screen choices and the new ad/revive economy.

### Ads and revives

The revive economy is changing from coin-priced revives to fake ads.

- Revives are offered through a joke fake-ad screen.
- Ads are a pool of absurd fake products; there is no tracking.
- The ad is a fast-forward-but-not-skip overlay: it should feel like waiting, not like leaving the game.
- The hero-select screen gets an ad button with payouts of 10, 5, 2, then 1 coins, returning to 10 after an hour.
- There is a dev-side toggle for the ad system and a 1000-coin player toggle.
- Exact ad/reward implementation is part of the economy work.

## Retention

The retention systems stay, but their inputs change.

### High-score pressure

Pressure still ramps from the player's best score and makes enemies more demanding near a personal best. The exact values remain in `config.js`.

### Frustration meter

The frustration meter and pity boost stay. The pity boost is more valuable because a normal run starts with zero followers.

### Coin tiers

The coin tiers are **not obsolete**.

The old input was revive coins spent, but revives no longer spend coins. Replace that input with **coins spent during runs**, such as the 1-coin third buff card and 5-coin mulligans. The principle stays:

> Players who use more coins in runs earn more coins later; players who spend little earn less.

Initial threshold ideas were 0 / 5 / 12 / 25 coins spent over the last five runs, replacing the old 0 / 15 / 45 / 90 revive-spend thresholds. Tune them once the buff screen exists.

## Challenge and Pacifist

### Pacifist

Pacifist is intended to be a normal Snake-style avoidance mode rather than a separate combat gimmick.

- Enemies cannot hurt you and you cannot hurt them.
- Enemies remain solid, so touching one behaves like a tail stall.
- Walls, the hazard, mines and your own body still matter.
- Weapons and follower attacks are disabled.
- Score comes from keys, recruits, merges and waves survived.
- A stuck detector is required, with the existing stuck/game-over logic providing the failure path.
- The exact win/score target can be tuned after the mode exists.

### Challenge

Challenge gets a separate win screen and its own completion/reward flow.

- The current confirmed reward target is **100 coins**.
- The reward is deliberately difficult and can be scaled harder later.
- Challenge/modifier runs remain part of the normal game and are **not removed from the leaderboard**. They are scored differently according to their modifiers.

## Modifier runs and leaderboard

Dev mode, Pacifist, Glass cannon and other modifiers are legitimate runs, not excluded runs.

- They remain in the buff/modifier pool.
- Their scoring can use `S.scoreMult` or another per-modifier multiplier.
- Different modifiers should have their own score multipliers so the leaderboard can compare runs honestly.
- A modifier does not invalidate a run; it changes how that run is scored.

## Hero levelling

Planned mid-run progression:

- Kills give XP.
- Every 5 levels, choose an upgrade.
- Initial upgrade ideas include **Gatling** and **ricochet**.
- Reuse the existing buff-pick screen during a run.

## Title screen and shop

The title screen **is** the hero select screen.

- The game opens on it, and so does every new run (death, revive countdown, game-over screen, tap, hero select).
- The only title element is the game name, floating at the top: "animeSnake", or "Snake-lite" about half the time.
- A Minecraft-style splash line (a random joke, or a dig at the player or the dev) sits tilted beside it.
- Up to 3 heroes show as big cards. 4 to 8 show as a compact grid, with the focused hero's description under it.
- Hero cards get a **detail toggle**. The old stat text becomes a `detail` field; flavour text remains the default view.
- The future title-screen shop is scrolling, with small per-hero buffs, rising costs and locked buffs. `unlocks.js` is already generic enough for the unlock side; the hard part is scroll vs tap vs tap steering.
- The title screen also gets an ad button for the economy system.

## More title-screen sections

The existing generic unlock architecture can support later sections such as Followers and Upgrades. They are now part of the planned title-screen/shop work rather than a separate menu.

## Build order

### Tier 1: config and text only

1. Magician locked at the start; new prices: Magician 50, Gunman 100, Goliath 200, Summoner 200. Old saves that already own Gunman keep it.
2. Buff cleanup: remove Bounty hunter, rename Extra follower to Starting follower, score buff to +20%, add Get Rich Quick.
3. Heroes start with no followers (`START_FOLLOWERS = []`).
4. Gunman fires every 16 ticks and adds a front bullet.
5. Gorgon shields stop recharging.
6. Game-over mock line for a zero score.
7. Detail toggle on hero cards; old stat text becomes `detail`, flavour remains default.
8. Raise `HERO_SPEED_MAX` to 2.0 and lower `HERO_SPEED_MIN`.

### Tier 2: small logic

9. Movement-feel fixes: two-entry input buffer and configurable coyote/grace tick.
10. Fusion permanent buffs: Bomber +1 max mines, Kingsman +1 damage, Shogun +10% speed, Medusa's 60 s shield with a shorter cooldown on later merges. Store these as run modifiers in `S`.
11. Raiden detonates mines remotely every 10 s, oldest first (`S.mines[0]`).
12. Keysman recruiting one summons a non-Keysman follower; keep the existing +10% double-summon chance for now.
13. Magician keeps the 3x3 shockwave, now charge-based (2 charges, 5 s per charge, fires by itself when an enemy is in range).
14. Mostly-flag buffs: Magician's gift, Second wind as a free revive, Glass cannon, Dev mode (one WASD step per press), Everything is a bomb.
15. Buff screen: 1 coin to unlock the third card, 5 coins for a mulligan.

### Tier 3: medium

16. Pacifist and Challenge. Challenge gets a new win screen; Pacifist gets a stuck detector and score/goal implementation.
17. Speed rework: halve base speed, give enemies their own move timers, then attach wave scaling and food-eating speed-ups (+0.1).
18. Timed waves: about 10 s early, 30 s by wave 10, 60 s by wave 20; cap live enemies; update wave-clear sound and the info-bar wave line.
19. Enemies eat keys and recruits, grow and speed up.
20. Economy rework: scarce coins, fake ads for revives, hero-select ad button (10/5/2/1, back to 10 after an hour), dev toggle and 1000-coin player toggle. Ad screen is fast-forward-but-not-skip.
21. Hero levelling: kills give XP; every 5 levels choose an upgrade (Gatling, ricochet); reuse the pick screen mid-run.
22. Title-screen shop: scrolling, per-hero small buffs with rising cost, locked buffs.

### Tier 4: large

23. Mine and recruit kicking. One kickable-projectile system serves both the old mine-kick idea and Goliath.
24. Goliath: back-hit rule, food shields, merged followers walking in every 5 kicks, wall kicks reverting fusions and 0.75x speed all depend on item 23.
25. Rooms, wall types and hazard templates. Curated rooms are preferred. Enemies and recruits must cross room boundaries.
26. Summoner: followers become autonomous agents with 8 s lifetimes and context AI; fusion summons run for 5 s (Medusa freezes and chases, for example).

### Tier 5: hardest

27. Wave 10 boss: gridless giant snake that swaps head and tail when hit and eats other snakes.
28. Wave 20 wizard: teleporting, persistent map-wide laser, forcefield that pushes the player out, and firing across rooms. It needs room support first and is intentionally much later.

## Suggested implementation sequence

1. **Foundation:** Tier 1, movement feel, speed rework, timed waves and enemies eating.
2. **Map foundation:** scrolling camera and larger world; room structure remains compatible, with room snap later if desired.
3. **Economy:** joke ads, scarce coins, Pentakill pay, buff-screen coins, shop and retention coin-tier changes.
4. **Hero kits:** Gunman, Magician, follower/fusion changes and levelling.
5. **Map depth:** enemy types, temporary buff blocks, rooms, walls and hazards.
6. **Kick physics:** build the shared kickable-projectile system.
7. **New heroes:** Goliath, then Summoner.
8. **Bosses:** wave 10 snake first; wizard much later after the map/room foundation.

## Problems and resolutions

- **Coins:** the old per-kill/wave coin stream is too generous. Pentakill is a side quest capped at 5 coins, while milestones/bosses should provide the main economy.
- **Retention coin tiers:** they stay; their input changes from revive coins spent to coins spent in runs.
- **Timed waves plus boss:** no new snakes arrive during boss waves, and the timer pauses. The boss eats only the existing enemies.
- **Challenge reward:** 100 coins is intentionally a hard reward relative to the hero prices.
- **Modifier leaderboard:** modifiers remain on the leaderboard and are scored differently rather than excluded.
- **Trapping feeling:** larger maps reduce total visibility and make food/threat searching harder. Temporary Ghost Body buffs can reduce self-trapping without permanently removing the snake feel. Input buffering and coyote ticks are cheap experiments. Halved speed should also improve reaction time.

## Brainstorm additions

- Boss reward: relic or buff pick after each boss, reusing the existing pick screen.
- Enemy types: fast thin snakes, armored heads and spitters, introduced in wave bands; room templates can favour certain types.
- Joke ads: absurd fake products, fully fake and with no tracking.
- Daily challenge: a seeded run on the existing Supabase board. This is parked as a low-priority idea.

## Open questions / tuning notes

1. **Speed:** 2.0x max is relative to the old speed range; the new base is half the old base.
2. **Goliath back:** the tile behind his head / any non-facing contact is the damaging side.
3. **Fusion buffs:** permanent for the current run, not across runs.
4. **Pacifist:** normal Snake-style avoidance; avoid everything while scoring through keys, recruits, merges and waves.
5. **Keysman:** both the new non-Keysman recruit summon and the old double-summon chance stay for now.
6. Exact Pacifist score target, ad timings, boss payouts, speed bonus values, room templates and kick physics still need play-testing/tuning.

## Current status

The original prototype has the core Snake loop, recruitment, merging, three heroes, five follower families, buffs, coins/revive, retention hooks, title-screen hero selection, touch controls, audio placeholders and the basic leaderboard. The next work is the foundation and economy rework above; rooms, kick physics, Goliath, Summoner and the later bosses are not built yet.
