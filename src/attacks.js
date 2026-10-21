// attacks.js: attacks are independent of the characters. Each has its own sheet of equal-sized frames,
// drawn facing right. They live in S.attacks and are drawn on top of the grid, on the tile they hit.
// 1 attack frame = ticksPerFrame logic ticks. The hit resolves when the attack reaches hitFrame.

const ATTACKS = {
  sword: {
    sheet: loadSheet('../assets/images/attacks/slash_sword.png'),
    w: 64, h: 41,  // size of ONE frame in the sheet (use 32 x 32 for tile-sized frames)
    fit: true,     // scale each frame down to fit inside one 32x32 tile (keeps aspect ratio)
    // frames: 4,  // optional: omit to count every frame in the sheet (left to right, top to bottom)
    ticksPerFrame: 1,
    hitFrame: 1,   // hit resolves at the start of tick 1
    cooldown: 6,   // ticks between swings (750 ms at base speed)
  },
};

function frameCount(d) {
  if (d.frames) return d.frames;
  const img = d.sheet.img;
  return d.sheet.ready ? Math.floor(img.width / d.w) * Math.floor(img.height / d.h) : 4;
}
function fireAttack(def, tx, ty, d) {
  S.attacks.push({ def, x: tx, y: ty, dir: d, age: 0 });
}

// The sword hits the enemy segment on the target tile.
//  * Head: costs the enemy one hit point (hits needed grow with the wave). At zero the whole snake dies.
//  * Body segment: breaks it, and everything behind it is cut off.
function resolveHit(a) {
  const t = enemyAt(a.x, a.y);
  if (!t) return;
  if (t.i === 0) { damageEnemyHead(t.e, 1); return; }
  cutEnemy(t.e, t.i);
}

// Called once per tick: ages attacks, resolves hits, and swings the sword on its timer.
function updateAttacks() {
  for (const a of S.attacks) {
    a.age++;
    if (a.age === a.def.hitFrame * a.def.ticksPerFrame) resolveHit(a);
  }
  S.attacks = S.attacks.filter(a => a.age < frameCount(a.def) * a.def.ticksPerFrame);
  // The head auto-attacks in its facing direction.
  if (S.tick - S.lastSwing >= ATTACKS.sword.cooldown) {
    const tx = S.snake[0].x + S.dir.x, ty = S.snake[0].y + S.dir.y;
    if (inBounds(tx, ty)) {
      fireAttack(ATTACKS.sword, tx, ty, S.dir);
      S.lastSwing = S.tick;
    }
  }
}
