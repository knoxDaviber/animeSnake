// sprites.js: loads the shared sprite sheets. Drawing lives in render.js.
// Every object has a placeholder PNG at its final path. Swap art by overwriting the file; no code changes.
//  * Directional sheets (heads, followers, enemies): 128x128 = 4 frames x 4 rows (down, right, up, reserved).
//  * Item sheets (food, hazard, mine, recruit): one row of 32x32 frames; frame count = width / 32.
//  * Follower sheets are loaded in followers.js, next to their definitions.
//  * Attack sheets are declared in attacks.js (their frame size is set per attack).

function loadSheet(src, expectW, expectH) {
  const s = { img: new Image(), ready: false };
  s.img.onload = () => {
    s.ready = true;
    if (expectW && (s.img.width !== expectW || s.img.height !== expectH))
      console.warn(`${src} is ${s.img.width}x${s.img.height}, expected ${expectW}x${expectH}`);
  };
  s.img.onerror = () => console.warn('Missing sprite sheet:', src);
  s.img.src = src;
  return s;
}

const DIR_ROW = { down: 0, right: 1, up: 2 };
const dirSheet = path => loadSheet(path);

const SPRITES = {
  food:      loadSheet('../assets/images/food.png'),
  hazard:    loadSheet('../assets/images/hazard.png'),
  mine:      loadSheet('../assets/images/mine.png'),
  recruit:   loadSheet('../assets/images/recruit.png'), // not used until recruitment (build step 4)
  enemyHead: dirSheet('../assets/images/enemies/enemy_head.png'),
  enemyBody: dirSheet('../assets/images/enemies/enemy_body.png'),
};

// The playable heads: slot 0 of the chain. Add more names here as you export more sheets
// (assets/images/characters/<name>.png). Only one exists so far.
const HEADS = ['character1'].map(name => {
  const ch = dirSheet(`../assets/images/characters/${name}.png`);
  ch.name = name; // keep the same object so onload can set ch.ready
  return ch;
});
