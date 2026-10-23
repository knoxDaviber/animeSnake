// panel.js: the info bar under the game. Minimal on purpose: a row of small portraits (the head, then the
// followers), each with a count and, if it has a skill, a thin solid bar that fills as the skill recharges. A full
// bar glows. Under it, one muted line about waves and recruits. Hover (desktop) for details. Plain page elements
// like the HUD: it reads S and never changes it. updatePanel() runs from hud() every tick.
// The bar can be hidden: HOLD the little handle under it for PANEL_HOLD_MS (so a stray tap cannot hide it), or press I.
// It starts hidden on phones and very short screens. The choice is remembered.
// A new follower shows up by itself; give a new skill a name in SKILL_NAMES and a new follower a line in FOLLOWER_NOTES.

const SKILL_NAMES = { mine: 'Mine', shogun: 'Lightning', gaze: 'Gaze', bomb: 'Mine' };
// One short line per follower for the hover text: what it is doing for you right now (n = how many are in the chain).
const FOLLOWER_NOTES = {
  miner:   () => `mines on map ${S.mines.length}/${MINE_MAX}`,
  raiden:  n => `hero speed +${Math.round(Math.min(RAIDEN_MAX_BONUS, RAIDEN_SPEED_BONUS * n) * 100)}%`,
  keysman: () => `${Math.round(keyDoubleChance() * 100)}% chance of a 2nd recruit`,
  magneto: () => `pulls keys within ${magnetRange()} tiles`,
  gorgon:  n => `shields ${gorgonReady()}/${Math.min(n, GORGON_MAX_SHIELDS)} ready, hero -${Math.round(Math.min(GORGON_MAX_SLOW, GORGON_SLOW * n) * 100)}%`,
  medusa:  () => 'freezes heads in your line, kills on touch, hero -10%',
  bomber:   () => 'mine blasts cross the whole map',
  kingsman: () => 'bounty: 1-3 keys, Keysman +40% likely',
  shogun:   n => `hero speed +${Math.round(SHOGUN_SPEED_BONUS * n * 100)}%, lightning 1-3 dmg`,
};
const PANEL_KEY = 'animeSnake.panel';
const PANEL = { built: false };

function panelEl(tag, cls, parent, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  if (parent) parent.appendChild(e);
  return e;
}
// One portrait with its count badge and thin bar. img = sprite sheet url (frame 0 of the top row is shown).
function panelChip(parent, img, color, barColor, hasBar) {
  const box = panelEl('div', 'chip', parent), pic = panelEl('div', 'cpic', box);
  pic.style.backgroundColor = color;
  if (img) pic.style.backgroundImage = `url("${img}")`;
  const cnt = panelEl('span', 'ccnt', pic);
  const bar = panelEl('div', 'cbar', box), fill = panelEl('i', '', bar);
  fill.style.background = barColor;
  if (!hasBar) bar.style.visibility = 'hidden';   // keeps the row aligned
  return { box, pic, cnt, fill, last: 0, tip: '' };
}
// frac 0..1. A bar that empties jumps back without sliding; a full bar glows (unless glow is false).
function panelFill(c, frac, glow = true) {
  frac = Math.max(0, Math.min(1, frac));
  c.fill.style.transition = frac < c.last ? 'none' : '';
  c.fill.style.width = (frac * 100) + '%';
  c.box.classList.toggle('ready', glow && frac >= 1);
  c.last = frac;
}
function panelTip(c, text) { if (c.tip !== text) { c.tip = text; c.box.title = text; } } // only when it changes, so tooltips do not flicker
function panelTime(ticks) { return secs(ticks).toFixed(1) + 's'; }

function buildPanel() {
  PANEL.root = document.getElementById('panel');
  const row = panelEl('div', 'chips', PANEL.root);
  PANEL.head = panelChip(row, '', '#3a2d5c', '#ffd36b', true);
  PANEL.followers = FOLLOWERS.map(f => panelChip(row, f.sheet.img.src, f.color, f.color, !!f.skill));
  PANEL.line = panelEl('div', 'pline', PANEL.root);
  PANEL.built = true;
}

// Called from hud() (render.js) once per tick and whenever the run changes.
function updatePanel() {
  if (!PANEL.built) buildPanel();
  PANEL.root.classList.toggle('idle', !!S.picking);

  // Head: weapon bar, and a ring while the Swordsman's block is ready
  const c = S.roster[0].c, def = HEAD_DEFS[c], h = PANEL.head;
  if (PANEL.headC !== c) {                                  // the head changed (chosen on the head-select screen)
    PANEL.headC = c;
    h.pic.style.backgroundImage = `url("${HEADS[c].img.src}")`;
    h.pic.style.backgroundColor = COLORS[c % COLORS.length];
  }
  const cd = weaponCooldown(def.cd), since = S.tick - S.lastSwing, sword = def.id === 'swordsman';
  panelFill(h, since / cd, false);
  h.cnt.style.display = 'none';
  h.box.classList.toggle('shielded', sword && S.shield);
  panelTip(h, `${def.name} \u00b7 ${def.weapon} ${since >= cd ? 'ready' : 'recharging'}` + (sword ? ` \u00b7 block ${S.shield ? 'ready' : 'recharging'}` : ''));

  // Followers: count, skill bar (the copy that will be ready soonest), hover text
  FOLLOWERS.forEach((f, k) => {
    const p = PANEL.followers[k], n = countFollower(f.id);
    p.box.classList.toggle('none', n === 0);
    p.cnt.textContent = n;
    p.cnt.style.display = n ? '' : 'none';
    let tip = `${f.name} \u00d7${n}` + (n && FOLLOWER_NOTES[f.id] ? ` \u00b7 ${FOLLOWER_NOTES[f.id](n)}` : '');
    if (f.skill) {
      let soonest = null;
      for (let i = 1; i < S.roster.length; i++) if (S.roster[i].c === k) soonest = soonest === null ? S.roster[i].cd : Math.min(soonest, S.roster[i].cd);
      const total = Math.max(1, Math.round(SKILLS[f.skill].cooldown * S.cdMult));
      panelFill(p, soonest === null ? 0 : 1 - soonest / total);
      if (soonest !== null) tip += ` \u00b7 ${SKILL_NAMES[f.skill] || f.skill} ${soonest === 0 ? 'ready' : 'recharging'}`;
    }
    panelTip(p, tip);
  });

  // One muted line: wave and recruits
  const left = S.enemies.length + S.toSpawn;
  const wave = S.wave === 0 ? `first wave ${panelTime(S.waveTimer)}`
    : left > 0 ? `wave ${S.wave} \u00b7 ${left} left`
    : `next wave ${panelTime(S.waveTimer)}`;
  PANEL.line.textContent = `${wave} \u00b7 recruits ${S.recruits.length}/${RECRUIT_MAX}`;
}

// ---- Show / hide ------------------------------------------------------------------
function panelDefaultOpen() { return !matchMedia('(max-width: 600px), (max-height: 520px)').matches; } // closed on phones and short screens
function panelSavedOpen() {
  try { const v = localStorage.getItem(PANEL_KEY); if (v === 'open' || v === 'closed') return v === 'open'; }
  catch (err) { /* storage blocked: fine */ }
  return panelDefaultOpen();
}
function setPanelOpen(open) {
  document.body.classList.toggle('panel-closed', !open);
  try { localStorage.setItem(PANEL_KEY, open ? 'open' : 'closed'); } catch (err) { /* storage blocked: fine */ }
}
function togglePanel() {
  setPanelOpen(document.body.classList.contains('panel-closed'));
  dispatchEvent(new Event('resize')); // the canvas size changed: lets the initials box re-place itself
}

// The handle works by HOLDING (pointer events cover mouse and touch). Moving the finger away, lifting it early or
// leaving the handle cancels. input.js ignores everything that happens on #dock, so none of this steers or revives.
function initPanelHandle() {
  const btn = document.getElementById('panelHandle');
  let timer = null, sx = 0, sy = 0;
  const cancel = () => { clearTimeout(timer); timer = null; btn.classList.remove('holding'); };
  btn.style.setProperty('--hold', PANEL_HOLD_MS + 'ms');
  btn.addEventListener('pointerdown', e => {
    sx = e.clientX; sy = e.clientY;
    btn.classList.add('holding');                          // CSS fills a gold line over PANEL_HOLD_MS
    timer = setTimeout(() => { cancel(); togglePanel(); }, PANEL_HOLD_MS);
  });
  btn.addEventListener('pointermove', e => { if (timer && Math.hypot(e.clientX - sx, e.clientY - sy) > 12) cancel(); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => btn.addEventListener(t, cancel));
  btn.addEventListener('contextmenu', e => e.preventDefault()); // no long-press menu on phones
  document.body.classList.toggle('panel-closed', !panelSavedOpen());
}
initPanelHandle();