# animeSnake: Design Doc

Design intent and rules. Fun comes first; balance is secondary. The game should play like a **Newgrounds flash game**: quick to start, nothing interrupts the run. For what is built and how to work on it, see [Handover.md](Handover.md).

**Wording:** the playable head is a **hero** everywhere the player can see it.

## Pillars

1. **Quick runs.** A run is a few minutes of play per boss; dying and restarting takes one tap. No hard timer, but skill compresses time (a cleared field skips ahead).
2. **Roguelike.** Each run starts with choices (hero, buff) and builds a different chain, weapon set and map shape.
3. **The chain is everything.** Composition and merges matter more than raw reflexes. *Under review:* Goliath and the Summoner never build a chain and Mr.X works against it, so this may become "your build is everything".
4. **One more run.** Systems are tuned to keep players coming back (see Retention).

**Tests for new ideas:** each hero should *break one snake rule* (Magician: walls stop you. Goliath: the head is the weak point. Summoner: followers are your lives). A new weapon should be *delivered* differently from the existing ones (forward shot, bounce, burst, auto-target, orbit, lobbed, trail). Prefer improving existing content over adding new content. Avoid pick screens.

## Core loop

Pick a hero and a starting buff, wait on the "Ready?" screen, steer the chain through a world shaped differently every run, eat keys, recruit characters, merge them, break doors to open rooms, find weapon chests, fight enemy snakes (waves, rushes, bosses every 10 waves), collect temporary buffs, die (or revive through the ad system), bank coins and score, repeat.

## Controls and on-screen text

- Desktop: arrows or WASD. Phone: swipe, or tap (four zones split by an X centred at `TAP_CENTER_Y`). A tap that turns into a swipe is a swipe.
- Two-entry input buffer and a one-tick grace for a fatal wall bump. **Reversing** is only allowed when the chain has no followers.
- **The run starts on the first input.** The opening screen is the pause screen with different words ("Ready?"), nothing moves until you steer. Pause (P/Esc) has a volume slider; M mutes.
- No info bar and nothing outside the canvases. The world canvas fills the window and carries the HUD; the 640x640 UI canvas holds menus. All gameplay text is half opacity (`TEXT_ALPHA`); nothing spawns on a text zone.
- HUD: score, combo and "N to beat best" top left; wave and the boss bars top centre; coins top right; bottom left a list of chips: your weapons with levels, seconds left and a refilling bar, follower skills, buffs, shields, temp buffs, `Chests n/4` and `Weapons n/slots`. Banners are one quiet line (big only for bosses, rushes and victory).

## The chain

- Slot 0 is the hero, every other slot a follower. **Rings:** a hit drops one character (the tail). A **big snake's** head costs two followers (never the hero by the extra one). You die when none are left. After a hit you are invulnerable for 8 ticks.
- **Tail stall:** moving into your own tail stops you until you steer.
- **Merging:** three identical followers anywhere merge into one **fusion**: a different character, not a stronger copy, counting as one body (a merge costs 2 characters). Fusions cannot merge again.
- **Headbutt:** when two heads collide the **longer chain shoves the shorter one back** (`BUMP_TILES`). You still take the damage. Equal chains stay put.
- Heroes start with no followers.

## Heroes

| Hero | Weapon | Rule |
| ---- | ------ | ---- |
| Swordsman (free) | Sword on the tile ahead; strikes twice from level 10 | Blocks the first enemy-head hit (recharges 5 s) and **counters with a heavy slash** on the attacker. His power is the shield; the raw sword stays weak on purpose |
| Magician (50) | 3x3 shockwave, 2 charges | Walls open a portal |
| Gunman (100) | A bullet to each side and one ahead | None yet |
| Goliath (200) | Swipe across the 3 tiles ahead | Hurt only from behind; kicks keys, mines, characters; cannot recruit (keys give shields); every 5 kicks a fusion joins |
| Summoner (200) | Spirits | Spends the tail follower, releases its fusion form as a spirit and gains that fusion's permanent bonus. Needs followers |

## Followers and fusions

| Follower | Now | Fusion |
| -------- | --- | ------ |
| Miner | +1 mine blast length each; drops a mine every 8 s | **Bomber**: blasts reach the whole row and column; mine every 5 s; +1 max mine |
| Raiden | +10% hero speed each; every 10 s sets off your oldest mine **on screen**, telegraphed by a thin blue line | **Raiden Shogun**: +30% speed; lightning every 5 s; +10% speed permanent |
| Keysman | +10% chance a key summons 2 characters | **Kingsman**: Keysman likelier; +1 key on the map and +1 weapon damage |
| Magneto | Pulls keys up to 4 tiles; enemies chase more | **Mr.X**: eats keys in 3x3; **rejects and shoots every recruit except Magneto** |
| Gorgon | One-hit shield each (max 5); slows the hero | **Medusa**: freezes enemy heads in your line; a head you touch dies; leaves a shield |

Heroes and fusions have real sprites; base followers are simple so fusing is a visual reward. Fusion bonuses are run-only modifiers. Kingsman's +1 damage is added before multipliers, so it doubles low-damage weapons (Gatling, Nova, Thunder, Razor).

## Weapons

- Every hero has a base weapon. Extra **branch weapons** come from **chests** (no pick screen): Gatling (bullets ahead), Ricochet (bouncing shot), Nova (blast around you), Thunder (lightning on nearest enemies), **Razor** (square blade rings that pulse out and back in forever; weapon levels make it faster, a second ring joins at level 4, the ring grows every 8 levels).
- Kills give XP; levels make weapons stronger (+15% damage, some speed). A weapon from a chest starts at half your hero level.
- **Caps** (config, changeable): weapon level, damage per hit, fastest cooldown, and weapon slots (3 chest weapons; the **Relic** buff adds 1).
- Attacks hit enemy snakes only. Hitting a head costs hit points; hitting a body segment cuts it and everything behind.
- **Mines** explode when any head steps on one; blast is a plus shape. **Kicks** (Goliath) slide items.

**Planned (not built):** tail whip, bomb thrower (hurts you too), phoenix, hook, poison food trail; status effects (Slow, Poison, Burn, Bleed, Confuse, Fear, Mark, Brittle, Static, Stagger, Volatile) with one signature effect per attack and caps on stacking; combos and resonance. Against bosses every effect is just a 1-damage minor hit. The dev also floated turning some of these into follower families, because followers should be stronger than weapons.

## Recruitment

- A **key** is the old food. Eating it summons a random base follower that walks in from outside the view, then jumps on the spot when ready. Touch it to recruit. Goliath gets a shield instead.
- Enemy snakes and bosses can eat keys and recruits. Up to 3 recruits wait at once. Three keys lie on the map (`KEY_PRESENCE`); an arrow points to the nearest.
- Merge planning is mostly luck. Levers considered: Mr.X's filter, biasing summons toward families you already hold.

## Enemies

- Chase the hero, never reverse, flip around if boxed in, path around walls, eat keys and recruits (grow, speed up, gain hit points).
- **Longer = faster and stronger.** Speed rises per segment; eating adds hit points.
- **Types:** normal; fast (wave 4); armored (7, double HP); **runner** (6, flees while small, hunts keys and recruits to grow, hunts you once big); kamikaze (8, hunts bombs near you); spitter (10, spits along rows and columns). A room can favour a type.
- **Big snakes** (longer than 7): head hit costs you 2 followers; a head hit that would kill only breaks the chain down to 4 segments; red ring.
- Terrain obeys enemies too: walls and blocks stop them, gates are one-way, conveyors carry, ice keeps them straight, mud slows them.

## Waves, rushes and bosses

- **Timed waves** (about 10 s at wave 1, 30 s at wave 10, 60 s at wave 20, shorter after that). A cleared field skips ahead to 2 s.
- **Nothing stops growing:** snakes per wave up to 24, alive cap up to 16 (more rooms open and later waves raise it), hits to kill +1 every 4 waves after 17, speed up to +60%, more special types every wave, faster spawning.
- **Rushes:** every 5th non-boss wave a flood of snakes enters from several sides, ignoring the alive cap. Clear it for a temp buff block and coins.
- **Bosses every 10 waves, alternating and stronger each time:** 10 Great Serpent, 20 Hollow Wizard, 30 both at once (the **finale**: beat both for VICTORY, then the run goes on), 40 serpent, 50 wizard, 60 both. Each tier: +40% HP, +6% speed, 8% faster attacks.
- **Great Serpent:** gridless smooth snake; leads its target, charges after a telegraph, fires an orb volley, eats snakes (heals), swaps head and tail after a head crit. **Enraged under half HP:** faster, and **its body is armoured, only head hits hurt it**.
- **Hollow Wizard:** teleports, 5x5 soft forcefield (5 hits to break), laser beams that run to the world edge, then exposed for 7 s before the field reforms.
- **Boss minions:** during the serpent fight ordinary snakes keep coming a few at a time (4 at wave 10, +1 per 5 waves, max 12), with a mix that grows with the boss tier.
- Medusa cannot freeze or one-touch a boss. Goliath's front is safe. Pacifist skips bosses and rushes. Challenge still ends at wave 20.

## World, shapes, doors and chests

- The world is a **5x5 grid of 20x20 cells** (100x100 tiles). Each run picks a **shape** (Cross, Keyhole, Long L, Serpent, Stairs, Keep, Crossbar), rotated and mirrored, with 9 to 11 rooms; other cells are rock. You start in the start room (a cold hearth with a trail of bones).
- Rooms are curated templates with one idea each (rules: no width-1 dead ends, always a way out). Rooms 1 door from the start are tier 1, farther rooms tier 2. Sides that touch rock are walled. Story decor tells what happened (no words).
- **Doors:** only the start room is open. At door waves a small popup says a door is ready and 2 closed rooms' doors glow faintly. **Walk into a glowing door to break it** (player agency, no menu). Each room has a surprise twist: variety, cache, swarm, lockdown, quiet.
- **Chests:** at most 4 per run, hidden in closed rooms: 1 in a room 1 door away, 3 in rooms 2+ doors away, on reachable floor. Walking onto one gives a weapon. They give a reason to open and explore rooms.
- The camera follows the hero; the view adapts to the device (20 tiles on the short side, at most 32 on the long side).

## Buffs and temporary buffs

- Run-start buffs: Starting follower, +20% score, Thick skin, Quick hands, Combo keeper, Skill haste, Second wind, Welcome party, Rich, Minefield, **Relic: weapon slot**, and flag modifiers (Magician's gift, Glass cannon, Dev mode, Everything is a bomb, Pacifist, Challenge). Some are locked in the shop. The boss reward pick draws from Thick skin, Quick hands, Combo keeper, Skill haste, Second wind, Welcome party and the Relic.
- Temp buffs dropped by dead snakes (25%) and rush clears: Ghost body, Haste, Magnet, Bubble, Frenzy.

## Score, coins, ads

- Kills are 20 x combo (x5 max), plus keys and cut segments. **When a run ends, 100 score = 1 coin.**
- Other coin sources: wave milestones (5, 10, 15, 20), bosses, the finale, rush clears, door lockdowns, a Pentakill (5 coins once per chain), fake ads. Coins buy heroes, the third buff card (1), mulligans (5), shop items and "No ads".
- **Ads and revives:** a revive is a joke fake ad you hold a button to fast-forward (`ADS_ENABLED`). With "No ads" bought and switched off, a revive is instant and free. Second wind is always a free instant revive. The title screen has an ad button with decreasing payouts. Nothing is real and nothing is tracked.

## Retention (on by design)

High-score pressure (enemies ramp near your best), the frustration meter and pity boost (a free buff at the start of the next run), and coin tiers (coins spent in recent runs set a multiplier on earned coins). They are hard to tune and can hide balance problems; `RETENTION_ON` switches them all off. A dev-only readout of pressure and frustration is a suggestion.

## Challenge, Pacifist, modifiers

- **Challenge:** any hit costs all followers; reach wave 20 to win 100 coins.
- **Pacifist:** no weapons, enemies solid and harmless, score from keys, recruits, merges, waves; no bosses, rushes, levelling or temp drops; chests pay coins; a stuck detector ends the run.
- Modifier runs (Dev mode, Glass cannon, Everything is a bomb...) are legitimate runs scored with multipliers.

## Title screen, shop, leaderboard

- The title screen is the hero select: a floating title (animeSnake or Snake-lite) with a splash line, hero cards (compact grid past 3 heroes), buttons for mute, details, Shop, ad, No ads.
- The shop is a scrolling list: locked run buffs (some with levels) and permanent starting followers.
- Supabase top 10 with an initials box. Planned: time survived, wave, hero, a version column so resets are one setting, a details view when clicking a row, modifier flags.

## Audio

Synthesized chiptune, kept on purpose. Reverb; pitch jitter on repeated effects; chords by wave band; their own loops for the serpent and the wizard; reactive layers (drums with a combo of 3+, in battle and bosses; a lead melody at a combo of 5+). Real files can replace any sound or mood.

## Backlog and open questions

See [Handover.md](Handover.md) (Backlog and Open questions). The big ones: the remaining four chosen weapons and the status effect system, follower families, leaderboard v2, pillar 3, the final economy, a structured balance pass and a stranger playtest, and the full code refactor.

## Problems and resolutions (short)

- **Waves stopped getting harder around wave 15:** every scaling curve now keeps going, rushes and boss tiers were added.
- **Boss in a grid game:** gridless float points with a tile view, so every weapon works on it; damage rules are explicit (head crit, armoured body when enraged, minor hits for non-hero damage).
- **Goliath:** stays hurt only from behind; fixed bombs and kamikazes give the map a threat from his sides.
- **Too many screens:** doors and chests replaced the pick screens.
- **Empty world:** shapes, chests, three keys on the map and progressive doors.
- **Trapping feeling:** a bigger map, input buffer, grace tick, reverse when alone, Ghost body, headbutt push-back.
- **Fragile code:** a refactor is planned once the design settles.