# animeSnake: Art and Frame Spec

All sprites follow this. Numbers are starting values and can be tuned, but keep the structure so every sprite stays compatible.

## Core numbers

| Thing | Value |
|-------|-------|
| Sprite / grid cell | 32x32 px (1 character = 1 tile) |
| Starting grid | 20x20 tiles = 640x640 logical px |
| Logic tick | 125 ms (8 tiles per second at base speed) |
| Render rate | 60 fps, positions interpolated between ticks |
| Animation clock | 1 animation frame = 1 tick (8 fps) |

Logic runs on a fixed tick. Rendering is separate and smooth, so animations never depend on the display's refresh rate. Speed buffs shorten the tick, and animations speed up with it, so frame data below is measured in **ticks**, not milliseconds.

Pixel rendering: turn off image smoothing on the canvas and use `image-rendering: pixelated` in CSS. Draw frames 1:1 (never scale a 32x32 frame down to fit the safe area). Scale the whole canvas by whole numbers where possible.

## Character sheet layout

One PNG per character: **128x128 px**, 4 columns x 4 rows of 32x32 cells, transparent background.

| Row | Direction | Frames (cols) | Notes |
|-----|-----------|---------------|-------|
| 0 | Down | 4 (0-3) | Loops, 1 tick per frame |
| 1 | Right | 4 (0-3) | Loops. The code mirrors it horizontally for left. |
| 2 | Up | 4 (0-3) | Loops |
| 3 | Reserved | 4 (0-3) | Unused for now (alternate down or a future animation) |

The character sheet is only about movement. Each segment plays the row for the direction it is travelling in.

- Frame 0 of the "down" row is the portrait pose, used for icons and previews.
- Hit, stun and drop effects (flash, recoil, fall-off) are done in code for now, not drawn per character.

File: `assets/images/characters/<name>.png`

## Attack sheets

Attacks are **independent of characters**. They have their own sprite sheets, are spawned as separate objects, and are drawn in a layer **on top of the grid and the snake**, centered on the tile they hit. A character only decides which attack the head uses.

Layout: equal-sized frames read left to right, then top to bottom. The frame size is set per attack in code (`w`, `h`), so 32x32 and 64x41 frames both work. If `frames` is omitted, every whole frame in the sheet is used. With `fit: true` each frame is scaled down (keeping its aspect ratio) to fit inside one 32x32 tile, so a 64x41 frame draws at 32x21. Without `fit` it draws at its real size, centered on the tile. Drawn **facing right**, centered on the target tile. The code mirrors for left and rotates 90 degrees for up and down.

File: `assets/images/attacks/<name>.png`

### Sword attack frame data

The sword hits the tile directly in front of the head.

| Tick | Slash frame | What happens |
|------|-------------|--------------|
| 0 | 0 (windup) | Nothing hits yet |
| 1 | 1 (strike) | **Hit resolves** on the target tile at the start of this tick |
| 2 | 2 (follow-through) | |
| 3 | 3 (recover) | |
| 4-5 | none | Cooldown |

Attack cycle: 6 ticks (750 ms at base speed). Tunable. The attack stays on the tile where it was fired, even if the head moves on.

## Other sheets

- **Items (food, hazard, recruit):** one row of 32x32 frames (128x32 for 4 frames). Idle loop, 1 tick per frame. The frame count is read from the sheet width, so 2-8 frames all work.
- **Enemy snake:** same 4x4 layout as characters. Head and body segments are separate files.

### Placeholders

Every object has a placeholder PNG at its final path and size. To swap in real art, overwrite the file and keep the cell size and layout. No code changes are needed (only attack sheets need `w` / `h` set in code if the frame size differs).

| File | Size | Layout |
|------|------|--------|
| `characters/<name>.png` | 128x128 | 4x4, directional |
| `enemies/enemy_head.png` | 128x128 | 4x4, directional |
| `enemies/enemy_body.png` | 128x128 | 4x4, directional |
| `attacks/slash_sword.png` | 256x41 | 4 frames of 64x41 |
| `food.png` | 128x32 | 4 frames |
| `hazard.png` | 128x32 | 4 frames |
| `recruit.png` | 128x32 | 4 frames (used from build step 6) |

## Rules for every sprite

- Keep art inside the **28x28 safe area** (2 px margin) so neighboring chain segments don't touch.
- Hard pixels only: no anti-aliasing, no semi-transparent pixels (except FX glow).
- 1 px dark outline, light from top-left, limited palette (about 16 colors per character).
- AI generators rarely output real pixel grids. Generate larger, then snap to a 32x32 grid with nearest-neighbor downscaling or clean it up in a pixel editor.

## File naming

```
assets/images/characters/<name>.png
assets/images/attacks/slash_sword.png
assets/images/enemies/enemy_head.png
assets/images/enemies/enemy_body.png
assets/images/food.png
assets/images/hazard.png
assets/images/recruit.png
```

Raw AI outputs go in `assets/_raw/`. Commit only the cleaned sheets.
