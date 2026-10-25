// camera.js: the scrolling camera and the view size.
// The world is COLS x ROWS tiles. It is drawn on its own canvas (#w) that fills the window; the HUD and menus live
// on the 640x640 square canvas (#c) on top. S.view says how much of the world fits the window on this device:
// the short side shows VIEW_SHORT_TILES tiles, the long side at most VIEW_LONG_MAX_TILES.
// S.cam = { x, y } is the top-left of the view in world pixels (null = snap on the next frame).

function clampNum(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// Sizes the world canvas to the window and works out the zoom. Runs at start-up and on resize / rotate.
function resizeView() {
  const cssW = innerWidth, cssH = innerHeight, short = Math.min(cssW, cssH), long = Math.max(cssW, cssH);
  const scale = Math.max(short / (VIEW_SHORT_TILES * CELL), long / (VIEW_LONG_MAX_TILES * CELL)); // css px per world px
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  wcv.width = Math.round(cssW * dpr); wcv.height = Math.round(cssH * dpr);
  wcv.style.width = cssW + 'px'; wcv.style.height = cssH + 'px';
  wctx.imageSmoothingEnabled = false;
  S.view = { cssW, cssH, dpr, scale, w: cssW / scale, h: cssH / scale }; // w / h = world pixels visible
}
addEventListener('resize', resizeView);
addEventListener('orientationchange', () => setTimeout(resizeView, 200));

// Where the camera wants to be: centred on the hero, kept inside the world.
function camTarget() {
  const h = S.snake[0], v = S.view;
  const p = S.prev && S.prev.length ? lerpPos(S.prev, 0, h, S.heroAlpha) : { x: h.x * CELL, y: h.y * CELL };
  return { x: clampNum(p.x + CELL / 2 - v.w / 2, 0, Math.max(0, COLS * CELL - v.w)),
           y: clampNum(p.y + CELL / 2 - v.h / 2, 0, Math.max(0, ROWS * CELL - v.h)) };
}

// Called every frame from loop() in main.js, before draw().
function updateCamera(t) {
  const goal = camTarget(), c = S.cam, v = S.view;
  if (!c || Math.hypot(goal.x - c.x, goal.y - c.y) > Math.min(v.w, v.h) * 0.75) { S.cam = goal; S.camT = t; return; } // first frame, revive, portal: snap
  const dt = clampNum(t - S.camT, 0, 100); S.camT = t;
  const k = 1 - Math.exp(-dt / CAM_SMOOTH_MS);
  c.x += (goal.x - c.x) * k; c.y += (goal.y - c.y) * k;
}

// The tiles currently in view (x1 / y1 include the partly visible last column / row).
function viewTiles() {
  const v = S.view, c = S.cam || camTarget(), x0 = Math.floor(c.x / CELL), y0 = Math.floor(c.y / CELL);
  return { x0, y0, x1: Math.ceil((c.x + v.w) / CELL), y1: Math.ceil((c.y + v.h) / CELL) };
}
function worldToUi(wx, wy) { // a world pixel -> a point on the 640x640 UI square
  const v = S.view, c = S.cam || camTarget(), r = cv.getBoundingClientRect();
  return { x: ((wx - c.x) * v.scale - r.left) * SCREEN_W / r.width, y: ((wy - c.y) * v.scale - r.top) * SCREEN_H / r.height };
}