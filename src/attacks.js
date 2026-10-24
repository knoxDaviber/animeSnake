// attacks.js: attacks are independent of the characters. Each has its own sheet of equal-sized frames,
// drawn facing right. They live in S.attacks and are drawn on top of the grid, on the tile they hit.
// 1 attack frame = ticksPerFrame logic ticks. The hit resolves when the attack reaches hitFrame.
// WHICH attack fires, and when, is up to the head (heads.js). The Gunman's bullets live in S.bullets (below).

const ATTACKS = {
  sword: {
    sheet: loadSheet('../assets/images/attacks/slash_sword.png'),
    w: 64, h: 41,  // size of ONE frame in the sheet (use 32 x 32 for tile-sized frames)
    fit: true,     // scale each frame down to fit inside one 32x32 tile (keeps aspect ratio)
    // frames: 4,  // optional: omit to count every frame in the sheet (left to right, top to bottom)
    ticksPerFrame: 1,
    hitFrame: 1,   // hit resolves at the start of tick 1
  },
};

function frameCount(d) {
  if (d.frames) return d.frames;
  const img = d.sheet.img;
  return d.sheet.ready ? Math.floor(img.width / d.w) * Math.floor(img.height / d.h) : 4;
}
function fireAttack(def, tx, ty, d, damage = 1) {
  S.attacks.push({ def, x: tx, y: ty, dir: d, age: 0, damage });
}

// The sword hits the enemy segment on the target tile.
//  * Head: costs the enemy `damage` hit points (hits needed grow with the wave). At zero the whole snake dies.
//  * Body segment: breaks it, and everything behind it is cut off.
function resolveHit(a) {
  const t = enemyAt(a.x, a.y);
  if (!t) return;
  if (t.i === 0) { damageEnemyHead(t.e, a.damage); return; }
  cutEnemy(t.e, t.i);
}

// Hits whatever enemy is on (x, y): a head loses `dmg` hit points, a body segment is cut (with everything behind it).
// Used by shockwaves and bullets. Returns true if an enemy was there.
function strikeEnemyAt(x, y, dmg) {
  if (S.pacifist) return false;
  const t = enemyAt(x, y);
  if (!t) return false;
  if (t.i === 0) damageEnemyHead(t.e, dmg); else cutEnemy(t.e, t.i);
  return true;
}

// Bullets move BULLET_SPEED tiles per tick, one tile at a time so they cannot skip over an enemy. They stop at
// the first enemy or at the wall, and ignore everything else (your own chain, mines, the hazard).
function updateBullets() {
  for (const b of S.bullets) {
    b.px = b.x; b.py = b.y;
    for (let k = 0; k < BULLET_SPEED && !b.dead; k++) {
      const nx = b.x + b.dx, ny = b.y + b.dy;
      if (!inBounds(nx, ny)) {
        if (b.bounce > 0) { b.bounce--; b.dx = -b.dx; b.dy = -b.dy; continue; } // Ricochet: turn around at the wall
        b.dead = true; break;
      }
      b.x = nx; b.y = ny;
      if (strikeEnemyAt(nx, ny, b.dmg)) b.dead = true;
    }
  }
  S.bullets = S.bullets.filter(b => !b.dead);
}

// Called once per tick: ages attacks, resolves hits, and moves bullets. The head's weapon fires in updateHead.
function updateAttacks() {
  for (const a of S.attacks) {
    a.age++;
    if (a.age === a.def.hitFrame * a.def.ticksPerFrame) resolveHit(a);
  }
  S.attacks = S.attacks.filter(a => a.age < frameCount(a.def) * a.def.ticksPerFrame);
  updateBullets();
}