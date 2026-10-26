// summoner.js: the Summoner hero. Every SUMMONER_COOLDOWN ticks a copy of a random follower in the chain (a random base
// follower if the chain is empty) leaves it as a SPIRIT: an autonomous agent that lives AGENT_TICKS (AGENT_FUSION_TICKS
// for a fusion), fights on its own and then fades. The chain itself is never touched. Spirits cannot be hurt.
// S.agents = [{ c, x, y, px, py, fx, fy, ttl, need, t, cd, sk }]: c = FOLLOWERS index, px/py = tile before the last move,
// ttl = ticks left, need = ticks per move, t = ticks since the last move, cd = hit cooldown, sk = skill cooldown.
// Context AI: each follower has its own habit (agentAct) and its own target (agentMove). Called from the hero's update
// (HEAD_DEFS in heads.js), so spirits only exist while a Summoner plays.

const AGENT_KEY_SEEKERS = ['keysman', 'kingsman', 'magneto'];   // these look for keys, everyone else for enemies

function updateSummoner() {
  updateAgents();
  if (S.agents.length < AGENT_MAX && weaponReady(SUMMONER_COOLDOWN)) { summonAgent(); S.lastSwing = S.tick; }
}

function summonAgent() {
  const slots = range(S.roster.length).filter(i => i > 0);
  let c, at, fx, fy;
  if (slots.length) {
    const i = slots[Math.floor(Math.random() * slots.length)], r = S.roster[i];
    c = r.c; at = S.snake[i]; fx = r.fx; fy = r.fy;
  } else { c = randomFollower(); at = S.snake[0]; fx = S.dir.x; fy = S.dir.y; }
  if (!fx && !fy) fy = 1;
  const id = FOLLOWERS[c].id, ttl = FOLLOWERS[c].fusion ? AGENT_FUSION_TICKS : AGENT_TICKS;
  S.agents.push({ c, x: at.x, y: at.y, px: at.x, py: at.y, fx, fy, ttl, need: agentNeed(id), t: 0, cd: 0, sk: 0 });
  S.popups.push({ x: at.x, y: at.y, text: FOLLOWERS[c].name + ' spirit', age: 0 });
  playSfx('summon');
}

function agentNeed(id) { return id === 'raiden' || id === 'shogun' ? 1 : AGENT_MOVE_TICKS; }
function agentCanEnter(x, y, dx, dy) {
  if (!inBounds(x, y)) return false;
  const t = tileAt(x, y);
  return t !== '#' && t !== 'B' && t !== 'T' && t !== 'H' && !gateBlocks(x, y, dx, dy);
}
const absD = (ax, ay, bx, by) => Math.abs(ax - bx) + Math.abs(ay - by);

function updateAgents() {
  for (const a of S.agents) {
    a.ttl--; a.t++;
    if (a.cd > 0) a.cd--;
    if (a.sk > 0) a.sk--;
    const id = FOLLOWERS[a.c].id;
    agentAct(a, id);
    if (a.t >= a.need) { a.t = 0; agentMove(a, id); }
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
function agentMove(a, id) {
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

// ---- Acting: every spirit hits what is next to it, plus its follower's own habit ----
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
  strikeEnemyAt(t.x, t.y, dmin + Math.floor(Math.random() * (dmax - dmin + 1)));
  return true;
}
function agentAct(a, id) {
  const h = S.snake[0];
  if (a.cd <= 0) {                                                                   // melee
    const hit = agentAdjacentEnemy(a);
    if (hit) {
      a.cd = AGENT_HIT_CD;
      if (id === 'medusa' && !hit.e.boss) killEnemy(hit.e);                         // Medusa: a touch kills a snake outright
      else {
        strikeEnemyAt(hit.x, hit.y, weaponDamage(AGENT_DAMAGE));
        if (id === 'gorgon') { const t = enemyAt(hit.x, hit.y); if (t) t.e.stun = Math.max(t.e.stun, AGENT_GORGON_STUN); }
      }
    }
  }
  if (id === 'miner' || id === 'bomber') {                                           // mines, but only when there is a fight to lure
    if (a.sk <= 0) {
      const t = agentNearestEnemy(a, false);
      if (t && t.d <= AGENT_MINE_RANGE && S.mines.length < mineMax() && tileFree(a.x, a.y)) {
        S.mines.push({ x: a.x, y: a.y }); playSfx('mineDrop');
        a.sk = id === 'bomber' ? Math.round(AGENT_MINE_CD / 2) : AGENT_MINE_CD;
      }
    }
  } else if (id === 'keysman' || id === 'kingsman') {                                // fetches keys: you get the summoned character
    const k = S.keys.find(q => q.x === a.x && q.y === a.y);
    if (k) {
      eatKey(k);
      if (id === 'kingsman' && S.recruits.length < RECRUIT_MAX) summonRecruit();
    }
  } else if (id === 'magneto') {                                                     // drags nearby keys toward you
    if (S.tick % 2 === 0) for (const k of S.keys) {
      if (absD(a.x, a.y, k.x, k.y) > AGENT_MAGNET_RANGE) continue;
      const dx = h.x - k.x, dy = h.y - k.y;
      if (!dx && !dy) continue;
      const sx = Math.sign(dx), sy = Math.sign(dy);
      const steps = Math.abs(dx) >= Math.abs(dy) ? [{ x: sx, y: 0 }, { x: 0, y: sy }] : [{ x: 0, y: sy }, { x: sx, y: 0 }];
      for (const s of steps) {
        if ((!s.x && !s.y) || !tileFree(k.x + s.x, k.y + s.y)) continue;
        k.x += s.x; k.y += s.y; break;
      }
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
    ctx.fillStyle = def.color; ctx.fillRect(Math.round(x) + 4, Math.round(y) - 6, Math.round((CELL - 8) * a.ttl / (FOLLOWERS[a.c].fusion ? AGENT_FUSION_TICKS : AGENT_TICKS)), 3);
    ctx.restore();
  });
}