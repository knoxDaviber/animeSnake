// summoner.js: the Summoner hero. His rule: followers are not lives to protect, they are ammunition.
// Every SUMMONER_COOLDOWN ticks the TAIL follower is spent (it leaves the chain for good) and released as a SPIRIT: the
// upgraded (fusion) version of that follower (Miner -> Bomber, Keysman -> Kingsman, Magneto -> Mr.X, Raiden -> Raiden
// Shogun, Gorgon -> Medusa; a tail that is already a fusion comes out as itself). The spirit fights on its own for
// AGENT_TICKS and then fades, and each summon also leaves that fusion's permanent run modifier (applyFusionBonus in
// merge.js), up to AGENT_BONUS_MAX times per fusion. With no follower to spend the timer waits and he cannot attack.
// S.agents = [{ c, id, x, y, px, py, fx, fy, ttl, need, t, cd, sk }]: c = FOLLOWERS index, id = its id, px/py = tile before
// the last move, ttl = ticks left, need = ticks per move, t = ticks since the last move, cd = hit cooldown, sk = skill cooldown.
// S.spiritBuffs = { fusionId: times its permanent bonus was granted this run }.
// Spirit damage to the boss is always a "minor" hit (1, no crit), see damageEnemyHead in enemies.js.

const AGENT_KEY_SEEKERS = ['kingsman'];   // these look for keys, everyone else for enemies
const absD = (ax, ay, bx, by) => Math.abs(ax - bx) + Math.abs(ay - by);

function updateSummoner() {
  updateAgents();
  if (S.snake.length < 2) { S.lastSwing = S.tick; return; }   // no follower to spend: the timer waits
  if (S.agents.length < AGENT_MAX && weaponReady(SUMMONER_COOLDOWN)) { summonAgent(); S.lastSwing = S.tick; }
}

function summonAgent() {
  const tail = S.snake.pop(), slot = S.roster.pop();            // the tail follower is spent (S.prev is rebuilt on the next move)
  const from = FOLLOWERS[slot.c], id = from.fusion ? from.id : from.merge;
  const c = followerIndex(id);
  let fx = slot.fx, fy = slot.fy;
  if (!fx && !fy) fy = 1;
  S.agents.push({ c, id, x: tail.x, y: tail.y, px: tail.x, py: tail.y, fx, fy, ttl: AGENT_TICKS, need: agentNeed(id), t: 0, cd: 0, sk: 0 });
  S.popups.push({ x: tail.x, y: tail.y, text: FOLLOWERS[c].name + ' spirit', age: 0 });
  const n = S.spiritBuffs[id] || 0;
  if (n < AGENT_BONUS_MAX) { S.spiritBuffs[id] = n + 1; applyFusionBonus(id); }   // the Summoner's way to power
  playSfx('summon');
}

function agentNeed(id) { return id === 'shogun' ? 1 : AGENT_MOVE_TICKS; }   // Shogun spirits move every tick
function agentCanEnter(x, y, dx, dy) {
  if (!inBounds(x, y)) return false;
  const t = tileAt(x, y);
  return t !== '#' && t !== 'B' && t !== 'T' && t !== 'H' && t !== 'D' && !gateBlocks(x, y, dx, dy);
}

function updateAgents() {
  for (const a of S.agents) {
    a.ttl--; a.t++;
    if (a.cd > 0) a.cd--;
    if (a.sk > 0) a.sk--;
    agentAct(a);
    if (a.t >= a.need) { a.t = 0; agentMove(a); }
  }
  S.agents = S.agents.filter(a => a.ttl > 0);
}

// ---- Targets ----
function agentNearestEnemy(a, headsOnly) {
  let best = null, bd = AGENT_SIGHT + 1;
  for (const e of S.enemies) for (const s of headsOnly ? [e.segs[0]] : e.segs) {
    const d = absD(a.x, a.y, s.x, s.y);
    if (d < bd) { best = s; bd = d; }
  }
  return best ? { x: best.x, y: best.y, d: bd, enemy: true } : null;
}
function agentNearestKey(a) {
  let best = null, bd = Infinity;
  for (const k of S.keys) { const d = absD(a.x, a.y, k.x, k.y); if (d < bd) { best = k; bd = d; } }
  return best ? { x: best.x, y: best.y, d: bd, key: true } : null;
}

// ---- Moving ----
function agentMove(a) {
  const id = a.id;
  a.px = a.x; a.py = a.y;
  a.need = agentNeed(id);
  const h = S.snake[0];
  let tgt = AGENT_KEY_SEEKERS.includes(id) ? agentNearestKey(a) : agentNearestEnemy(a, id === 'medusa');
  let stop = 0;
  if (!tgt) { tgt = { x: h.x, y: h.y, d: absD(a.x, a.y, h.x, h.y) }; stop = 2; }   // nothing to do: stay near the hero
  else if (tgt.enemy) stop = 1;                                                      // next to an enemy: stand and fight
  if (tgt.d <= stop) return;
  const dm = distField(tgt.x, tgt.y);
  const here = dm[a.y * COLS + a.x];
  let best = null, bv = here >= 0 ? here : Infinity;
  for (const d of DIRS) {
    const nx = a.x + d.x, ny = a.y + d.y;
    if (!agentCanEnter(nx, ny, d.x, d.y)) continue;
    const v = dm[ny * COLS + nx];
    if (v >= 0 && v < bv) { bv = v; best = { d, nx, ny }; }
  }
  if (!best) {                                                                       // too far for the path map: just head toward it
    let bd = absD(a.x, a.y, tgt.x, tgt.y);
    for (const d of DIRS) {
      const nx = a.x + d.x, ny = a.y + d.y;
      if (!agentCanEnter(nx, ny, d.x, d.y)) continue;
      const v = absD(nx, ny, tgt.x, tgt.y);
      if (v < bd) { bd = v; best = { d, nx, ny }; }
    }
  }
  if (!best) return;
  a.x = best.nx; a.y = best.ny; a.fx = best.d.x; a.fy = best.d.y;
}

// ---- Acting: every spirit hits what is next to it, plus its own habit ----
function agentAdjacentEnemy(a) {
  for (const o of [{ x: 0, y: 0 }, ...DIRS]) {
    const x = a.x + o.x, y = a.y + o.y, t = enemyAt(x, y);
    if (t) return { x, y, e: t.e };
  }
  return null;
}
function agentBolt(a, dmin, dmax) { // lightning at the nearest enemy segment in sight
  const t = agentNearestEnemy(a, false);
  if (!t) return false;
  S.zaps.push({ kind: 'bolt', x1: a.x, y1: a.y, x2: t.x, y2: t.y, age: 0, jig: range(3).map(() => (Math.random() - 0.5) * 24) });
  strikeEnemyAt(t.x, t.y, dmin + Math.floor(Math.random() * (dmax - dmin + 1)), true);
  return true;
}
function agentAct(a) {
  const id = a.id;
  if (a.cd <= 0) {                                                                   // melee
    const hit = agentAdjacentEnemy(a);
    if (hit) {
      a.cd = AGENT_HIT_CD;
      if (id === 'medusa' && !hit.e.boss && !hit.e.wizard) killEnemy(hit.e);                         // Medusa: a touch kills a snake outright
      else strikeEnemyAt(hit.x, hit.y, weaponDamage(AGENT_DAMAGE), true);           // (a boss only takes a minor hit)
    }
  }
  if (id === 'bomber') {                                                             // lays mines, but only when there is a fight to lure
    if (a.sk <= 0) {
      const t = agentNearestEnemy(a, false);
      if (t && t.d <= AGENT_MINE_RANGE && S.mines.length < mineMax() && tileFree(a.x, a.y)) {
        S.mines.push({ x: a.x, y: a.y }); playSfx('mineDrop');
        a.sk = AGENT_MINE_CD;
      }
    }
  } else if (id === 'kingsman') {                                                    // fetches keys: you get the summoned characters
    const k = S.keys.find(q => q.x === a.x && q.y === a.y);
    if (k) {
      eatKey(k);
      if (S.recruits.length < RECRUIT_MAX) summonRecruit();
    }
  } else if (id === 'mrx') {
    if (a.sk <= 0 && agentBolt(a, MRX_SHOT_MIN, MRX_SHOT_MAX)) { a.sk = AGENT_SHOT_CD; playSfx('mrx'); }
  } else if (id === 'shogun') {
    if (a.sk <= 0 && agentBolt(a, SHOGUN_DMG_MIN, SHOGUN_DMG_MAX)) { a.sk = AGENT_SHOGUN_CD; playSfx('lightning'); }
  } else if (id === 'medusa') {                                                      // freezes enemy heads in its lines (not the boss)
    for (const d of DIRS) for (let k = 1; k <= AGENT_GAZE_RANGE; k++) {
      const x = a.x + d.x * k, y = a.y + d.y * k;
      if (!inBounds(x, y) || isWall(x, y)) break;
      const t = enemyAt(x, y);
      if (t && t.i === 0 && !t.e.boss) t.e.stun = Math.max(t.e.stun, MEDUSA_FREEZE_TICKS);
    }
  }
}

// ---- Drawing (world space, called from draw() in render.js) ----
function drawAgents() {
  S.agents.forEach(a => {
    if (a.ttl <= 8 && S.tick % 2 === 0) return;                                      // blinks just before it fades
    const prog = Math.min(1, (a.t + S.alpha) / a.need), def = FOLLOWERS[a.c];
    const x = (a.px + (a.x - a.px) * prog) * CELL, y = (a.py + (a.y - a.py) * prog) * CELL;
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = 'rgba(199,139,255,.25)'; ctx.beginPath(); ctx.ellipse(x + CELL / 2, y + CELL - 4, 12, 4, 0, 0, 6.3); ctx.fill();
    ctx.strokeStyle = def.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + CELL / 2, y + CELL / 2, CELL / 2 + 1, 0, 6.3); ctx.stroke();
    drawSegment({ c: a.c, fx: a.fx, fy: a.fy }, x, y - 2, false);
    ctx.fillStyle = 'rgba(20,16,31,.8)'; ctx.fillRect(Math.round(x) + 4, Math.round(y) - 6, CELL - 8, 3);   // time left
    ctx.fillStyle = def.color; ctx.fillRect(Math.round(x) + 4, Math.round(y) - 6, Math.round((CELL - 8) * a.ttl / AGENT_TICKS), 3);
    ctx.restore();
  });
}