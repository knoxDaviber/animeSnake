# animeSnake: Room templates (sketches)

Sample room templates for the rooms/walls/hazards work (DESIGN.md, "Larger map, camera and rooms"). Built so far: the start room, ruins, the gauntlet (1), garden (2), mill (3), chapel (ice, 9), keep (10), barracks (11), vault (push blocks, 4), pinball (bumpers, 5), bridges (crumbling floor, 7), alley (turrets, 8) and serpentine (6). Every sketch below now exists in some form; they differ a little from the sketches (key spots, some floor rows). These are design sketches to react to, so change, merge or throw away anything. These are design sketches to react to, so change, merge or throw away anything.

## How rooms fit

- The world is 60x60 tiles, so it holds a **3x3 grid of 20x20 rooms**. A template is a 20x20 grid of characters, stamped into one cell of that grid.
- Every room has openings in the middle of the sides it connects to: **columns 9-10** on the top and bottom walls, **rows 9-10** on the left and right walls. A template that does not use an opening leaves it as wall.
- The outer edge of the whole world is always wall.
- A room is a template plus tags: difficulty tier, which enemy types it favours, how many keys it may hold, and which doors it uses.
- Templates can be mirrored and rotated in 90 degree steps (careful: the one-way gates, conveyors and turrets rotate with them).

## Legend

```
.   floor
#   wall (solid for everything)
H   hazard: costs a ring, like the hazard today
~   mud: hero speed halved while on it (enemies too)
>   <   ^   v   conveyor: while you stand on it your heading is forced this way
r   l   u   d   one-way gate: can only be entered heading right / left / up / down, solid from every other side
I   ice: you cannot turn while on it (the heading is locked)
B   push block: heading into it pushes it one tile. If it cannot move, it counts as a wall hit
C   crumble tile: becomes a hazard once it has been stepped on and left
Z   bumper: turns your heading 90 degrees clockwise (pinball)
T   turret in a wall: fires along its row every few seconds (the planned spitter)
e   enemy door: a snake can spawn here
*   key spawn point (the key is the recruit item)
1-9 portal pairs (same digit = one pair)
P   bomb pedestal: holds a bomb that regrows after it is gone (kickable by Goliath, set off by anything that steps on it)
```

## Design rules for every template

1. **No width-1 dead ends.** A snake cannot turn around in one tile, so a one-wide dead end is a guaranteed death. Corridors are at least 2 tiles wide, and a width-1 passage must be a pass-through only.
2. **Always a way out.** From every opening there must be a route to every other opening and every key point that does not depend on luck.
3. **Followers count.** A chain is long. Tight bends, mud and ice hurt long chains more than a lone hero, which is a good lever for scaling difficulty.
4. **Enemies obey the room too.** Gates and walls block enemy snakes, conveyors and mud move them, and hazards are avoided (enemies already avoid the hazard). Only the nest in template 11 gets a special exit.
5. **One idea per room.** The room is readable at a glance, and the idea is easy to combine with another room next door.

---

## 1. The Gauntlet (forced direction)

*Inspiration: Pac-Man ghost loop, one-way streets.* A ring corridor around a solid block. Four gates make the ring clockwise only, so you cannot reverse and cannot cut across. Entering from any opening drops you into the flow.

```
#########..#########
#.....r............#
#.....r............#
#.....r............#
#...############...#
#...############...#
#...############...#
#...############ddd#
#...############...#
....############....
....############....
#...############...#
#uuu############...#
#...############...#
#...############...#
#...############...#
#.......l..........#
#.......l..........#
#.......l..........#
#########..#########
```

Notes: this one is easy with a short chain and nasty with a long one, because you cannot turn back when enemies enter behind you. A good room to put the key in a corner of the ring.

## 2. Spike Garden (hazard pattern)

*Inspiration: Zelda spike traps.* Clusters of hazards leave lanes open. The side openings use a clear lane; the vertical lane is blocked by clusters so you weave.

```
#########..#########
#..................#
#..HH....HH....HH..#
#..HH....HH....HH..#
#..................#
#..................#
#.HH....HHHH....HH.#
#.HH....HHHH....HH.#
#..................#
....................
....................
#..................#
#.HH....HHHH....HH.#
#.HH....HHHH....HH.#
#..................#
#..................#
#..HH....HH....HH..#
#..HH....HH....HH..#
#..................#
#########..#########
```

Variant ideas: spikes that alternate on a timer (like Mario Maker spike traps), or a room where only the hazard pattern moves one tile each wave.

## 3. Washing Machine (conveyors)

*Inspiration: Zelda conveyor rooms, Mario Maker belts.* Two rivers flowing in opposite directions drag you toward spikes at their ends. You can steer, but you keep getting pushed, so you must leave the river before the end.

```
#########..#########
#..................#
#..................#
#..................#
#..................#
#...>>>>>>>>>>>>.HH#
#...>>>>>>>>>>>>.HH#
#..................#
#..................#
....................
....................
#..................#
#..................#
#HH.<<<<<<<<<<<<...#
#HH.<<<<<<<<<<<<...#
#..................#
#...HH........HH...#
#..................#
#..................#
#########..#########
```

## 4. Sokoban Vault (push blocks)

*Inspiration: Sokoban, Zelda block puzzles.* A two-tile-deep pit blocks the room. A block pushed into a pit tile fills it and becomes floor. There are three blocks and the path needs two in the same column, so one spare. Waste too many and you must find another route (the side openings are closed here).

```
#########..#########
#..................#
#.....B......B.....#
#..................#
#...............B..#
#..................#
#..................#
#..................#
#..................#
#HHHHHHHHHHHHHHHHHH#
#HHHHHHHHHHHHHHHHHH#
#..................#
#..................#
#..................#
#..................#
#..................#
#..................#
#..................#
#..................#
#########..#########
```

Why it is risky: pushing a block against a wall freezes it, and a push needs the tile behind it free. Because a push stalls you like your own tail, it also gives enemies time to close in. Great with the Miner: a mine can destroy a block.

## 5. Pinball (bumpers)

*Inspiration: pinball, Pong, Zelda bumper rooms.* Bumpers turn your heading 90 degrees clockwise. You can plan routes through them but the chain has to follow the bends, and it is chaos when enemies are in there too.

```
#########..#########
#..................#
#.......Z....Z.....#
#..................#
#..Z..........Z....#
#..................#
#........ZZ........#
#..................#
#..Z............Z..#
....................
....................
#..................#
#...Z..........Z...#
#..................#
#........ZZ........#
#..................#
#.....Z......Z.....#
#..................#
#..................#
#########..#########
```

## 6. The Serpentine (one winding lane)

*Inspiration: classic Snake mazes, Pac-Man mazes, Zelda dungeons.* Walls with alternating gaps force a long S-shaped route from the top opening to the bottom one. Lanes are 2 tiles wide so the chain can always turn. Mud patches or enemies at the bends make it tense.

```
#########..#########
#..................#
#..................#
#################..#
#..................#
#..................#
#..#################
#..................#
#..................#
#################..#
#..................#
#..................#
#..#################
#..................#
#..................#
#################..#
#..................#
#..................#
#..................#
#########..#########
```

## 7. Crumbling Bridges

*Inspiration: Mario crumbling platforms, Zelda cracked floors, Crash Bandicoot bridges.* A sea of hazards with a network of crumble tiles. A tile turns into a hazard after you leave it, so you cannot go back the way you came. The loop in the middle lets you choose left or right, but a long chain is still standing on tiles that have already crumbled behind the head, so it is a speed check. Safe floor at the entrance and exit.

```
#########..#########
#HHHHHHHH..HHHHHHHH#
#HHHHHHHHCCHHHHHHHH#
#HHHHHHHHCCHHHHHHHH#
#HHCCCCCCCCCCCCCCHH#
#HHCCCCCCCCCCCCCCHH#
#HHCCHHHHHHHHHHCCHH#
#HHCCHHHHHHHHHHCCHH#
#HHCCHHHHHHHHHHCCHH#
#HHCCHHHHHHHHHHCCHH#
#HHCCCCCCCCCCCCCCHH#
#HHCCCCCCCCCCCCCCHH#
#HHHHHHHHCCHHHHHHHH#
#HHHHHHHHCCHHHHHHHH#
#HHHHHHHHCCHHHHHHHH#
#HHHHHHHHCCHHHHHHHH#
#HHHHHHHHCCHHHHHHHH#
#HHHHHHHHCCHHHHHHHH#
#HHHHHHHH..HHHHHHHH#
#########..#########
```

(The crumble tiles themselves do not hurt, so the hazard sea only matters once the floor has gone. The chain's tail is safe until it leaves a tile too.)

## 8. Turret Alley

*Inspiration: Zelda statues, Metroid wall turrets, Mega Man.* Turrets in the side walls fire along their rows on a rhythm. Pillars in each row give cover pockets. You run the gaps between volleys. The turret rows alternate sides so there is always one safe row to rest on.

```
#########..#########
#..................#
T..#..#......#..#..#
#..................#
#..#..#......#..#..T
#..................#
T..#..#......#..#..#
#..................#
#..#..#......#..#..T
#..................#
T..#..#......#..#..#
#..................#
#..#..#......#..#..T
#..................#
T..#..#......#..#..#
#..................#
#..#..#......#..#..T
#..................#
#..................#
#########..#########
```

Tuning idea: spitter enemy snakes (planned) behave like mobile versions of these.

## 9. Ice Rink

*Inspiration: Pokemon ice puzzles, Zelda ice caverns.* The whole floor is ice, so you cannot turn until you leave it. Rocks are the only way to be stopped, so aim by choosing the row you enter on. Enemies on ice are as stuck as you are.

```
#########..#########
#IIIIIIIIIIIIIIIIII#
#IIII#IIIIIIIII#III#
#IIIIIIIIIIIIIIIIII#
#III#IIIIIIIIIIII#I#
#IIIIIIIIIIIIIIIIII#
#IIIIIIII##IIIIIIII#
#IIIIIIIIIIIIIIIIII#
#I#IIIIIIIIIIIIII#I#
IIIIIIIIIIIIIIIIIIII
IIIIIIIIIIIIIIIIIIII
#IIIIIIIIIIIIIIIIII#
#IIIIIIII##IIIIIIII#
#IIIIIIIIIIIIIIIIII#
#III#IIIIIIIIIIII#I#
#IIIIIIIIIIIIIIIIII#
#IIII#IIIIIIIII#III#
#IIIIIIIIIIIIIIIIII#
#IIIIIIIIIIIIIIIIII#
#########..#########
```

Note: the grid has the outer ice edge touching the wall, which is the point (hit the wall = a ring). A softer version replaces the outermost ring of ice with floor.

## 10. Moat Keep

*Inspiration: Zelda moat castles, tower defence.* The key sits on an island in the middle, surrounded by a hazard moat. The bridges are the only way in, on the left and right. Enemies spawn on the island side, so you walk into a defended position. With the Magician's portals you can skip the bridges.

```
#########..#########
#..................#
#.HHHHHHH..HHHHHHH.#
#.H..............H.#
#.H..............H.#
#.H..............H.#
#.H..............H.#
#.H..............H.#
#.H..............H.#
....................
....................
#.H..............H.#
#.H..............H.#
#.H..............H.#
#.H..............H.#
#.H..............H.#
#.H..............H.#
#.HHHHHHH..HHHHHHH.#
#..................#
#########..#########
```

Put `*` at the centre of the island (row 9, column 9) and `e` doors at its corners. The top and bottom moat gaps (columns 9-10) are the "back doors", which are lower risk but come out beside the nest.

## 11. The Nest (enemy pen with a one-way exit)

*Inspiration: the Pac-Man ghost house.* Enemy snakes spawn in the pen at the centre and leave through a gate that only opens upward, so you cannot enter the pen from outside. A good room for a wave fight and for a boss arena later. The hero can only watch the gate and shoot into it.

```
#########..#########
#..................#
#..................#
#..................#
#..................#
#..................#
#....####uu####....#
#....#........#....#
#....#..eeee..#....#
.....#........#.....
.....#........#.....
#....#........#....#
#....#........#....#
#....##########....#
#..................#
#..................#
#..................#
#..................#
#..................#
#########..#########
```

---

## Not sketched yet (ideas to pick from)

- **Soft blocks (Bomberman):** breakable walls that a mine destroys. Strong synergy with Miner and Bomber, and a good way to hide keys.
- **Pressure plates and sliding doors (Zelda):** step on a plate (or push a block onto it) and a door opens for a few seconds.
- **Rising lava / shrinking arena (battle royale):** hazards creep inward from the edges for the length of a wave.
- **Darkness with a lantern radius (Zelda, Binding of Isaac):** only tiles near your head are drawn, so enemies pop out of the dark. Fits the "partly hidden map" goal.
- **Pac-Man tunnels:** a pair of openings that wrap straight across the room, like the Magician's wall portals but for everyone.
- **Teleporter maze (portals 1-9):** pairs of portals that you and enemies both use, which gets silly with a Magician hero.
- **Wind or current zones:** like conveyors but only a gentle push on every second tick, so you can still make progress against it.
- **Locked rooms (Zelda keys):** a door that needs a key, using the existing key item, so a key either recruits a character or opens a door.
- **Mirror room:** left and right steering are swapped inside. Cruel, so rare and short.
- **Gravity or magnet tiles:** pull keys, mines and recruits toward a spot (Magneto already pulls keys).
- **Rotating wall segments:** a bar that turns 90 degrees every wave (like Tetris pieces locking), changing the route in a room you have already learned.
- **Mine fields with a shape:** pre-laid mines in a pattern (a spiral or a checkerboard) to use with kicking later.
- **Fixed bomb pedestals:** a tile that holds a bomb and regenerates it after a set time. Goliath cannot kick this bomb, and kamikaze snakes can set it off.
- **Door tile (progressive rooms):** wall until opened by a wave, a cleared room or a key.

## Technical notes (for when this is built)

- Store a template as an array of 20 strings and stamp it into a room cell. The stamping code turns each character into world data: walls into a wall grid, `H` into hazards, and so on. Hazards, walls and every other tile type already live in the tile map S.map.
- New tile types need handling in `playerMove` (player.js), `enemyCanEnter` and `stepEnemy` (enemies.js), `tileFree` (world.js) and bullets (attacks.js), plus drawing in render.js. Keep per-tile rules in one table so adding a tile type is one entry.
- Conveyors and ice change the heading, so they interact with the input queue (`S.dirQueue`) and the grace tick.
- Spawns (keys, recruits, enemies) must never land inside a wall, on a hazard or inside a locked pen.
- Keep every template under a size budget and a difficulty tier, then let the room picker choose by wave band.