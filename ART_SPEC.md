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

Pixel rendering: turn off image smoothing on the canvas and use `image-rendering: pixelated` in CSS. Scale only by whole numbers where possible.

## Character sheet layout

One PNG per character: **256x128 px**, 8 columns x 4 rows of 32x32 cells, transparent background.

| Row | Animation | Frames (cols) | Ticks per frame | Notes |
|-----|-----------|---------------|-----------------|-------|
| 0 | Idle | 4 (0-3) | 1 | Loops. Cols 4-7 reserved. |
| 1 | Hit | 2 (0-1) | 1 | Flash / recoil. Cols 2-3: stun loop, 2 frames. |
| 2 | Attack | 4 (0-3) | 1 | Only characters that can attack as head. Faces right. |
| 3 | Drop | 4 (0-3) | 1 | Played when the character is knocked off the chain, then removed. |

Templates: `assets/character_sheet_blank.png` (transparent) and `assets/character_sheet_guides.png` (checker cells, yellow 28x28 safe area, pink center mark). Delete the guides before export.

## Rules for every sprite

- Keep art inside the **28x28 safe area** (2 px margin) so neighboring chain segments don't touch.
- Idle frame 0 is the "portrait" pose and is used for icons and previews.
- Characters are drawn upright and are not rotated in the chain. The code mirrors them horizontally if needed.
- Attack poses are drawn **facing right**. The code mirrors for left. Up and down are handled by rotating the FX, not the character.
- Hard pixels only: no anti-aliasing, no semi-transparent pixels (except FX glow).
- 1 px dark outline, light from top-left, limited palette (about 16 colors per character).
- AI generators rarely output real pixel grids. Generate larger, then snap to a 32x32 grid with nearest-neighbor downscaling or clean it up in a pixel editor.

## Sword attack frame data

The sword hits the tile directly in front of the head.

| Tick | Character frame | Slash FX frame | What happens |
|------|-----------------|----------------|--------------|
| 0 | Attack 0 (windup) | none | Nothing hits yet |
| 1 | Attack 1 (strike) | FX 0 | **Hit resolves** on the tile in front of the head at the start of this tick |
| 2 | Attack 2 (follow-through) | FX 1 | |
| 3 | Attack 3 (recover) | FX 2 | |
| 4-5 | Idle | FX 3 on tick 4 | Cooldown |

Attack cycle: 6 ticks (750 ms at base speed). Tunable.

Slash FX: a separate **128x32 sheet**, 4 frames of 32x32, drawn facing right, centered on the target tile.

## Other sheets

- **Food / recruit items:** 32x32, 2-4 frame idle loop, 1 tick per frame.
- **Enemy snake:** same sheet layout as characters (rows 0-3). Head and body segments are separate files.
- **Tiles / hazards:** 32x32, optional 2-4 frame loop.

## File naming

```
assets/images/characters/<name>.png
assets/images/fx/slash_sword.png
assets/images/enemies/<name>_head.png
assets/images/enemies/<name>_body.png
```

Raw AI outputs go in `assets/_raw/`. Commit only the cleaned sheets.
