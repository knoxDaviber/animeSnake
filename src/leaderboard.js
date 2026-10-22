// leaderboard.js: the shared top-10 leaderboard, kept in a Supabase table (set up with tools/supabase_setup.sql).
// The game talks to Supabase's REST API with plain fetch, so there is no SDK and no build step.
//
// Flow: when a run really ends (the revive countdown is over, see endRevive in revive.js) the game fetches the top 10.
// If the score would make the board, an initials box appears over the game-over screen; saving posts the score and
// reloads the board. The board and the box are drawn by render.js (the board) and built here (the box).
//
// Safe by design: if the leaderboard is off (no key in config.js), the network fails, or a request is slow, the game
// simply carries on without it. State lives in S.lb (see state.js); `S.runId` stops a slow answer from an old run
// from touching a new one.

function lbEnabled() { return !!LEADERBOARD.key && !/^PASTE/.test(LEADERBOARD.key); }

function lbHeaders(extra) {
  const h = { apikey: LEADERBOARD.key, ...extra };
  if (LEADERBOARD.key.startsWith('eyJ')) h.Authorization = 'Bearer ' + LEADERBOARD.key; // legacy anon keys are JWTs
  return h;
}

// One request to the table, with a timeout. Throws on a network error, a timeout or a non-2xx answer.
async function lbRequest(path, options = {}) {
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), LEADERBOARD.timeoutMs);
  try {
    const base = LEADERBOARD.url.replace(/\/+$/, '');
    const res = await fetch(`${base}/rest/v1/${path}`, { ...options, headers: lbHeaders(options.headers), signal: ctl.signal });
    if (!res.ok) throw new Error('Leaderboard request failed: HTTP ' + res.status);
    return res;
  } finally { clearTimeout(timer); }
}

// The current top scores, best first (earlier scores win ties).
async function loadBoard() {
  const q = `select=name,score,wave,revives&order=score.desc,created_at.asc,id.asc&limit=${LEADERBOARD.size}`;
  const rows = await (await lbRequest(`${LEADERBOARD.table}?${q}`)).json();
  if (!Array.isArray(rows)) throw new Error('Leaderboard: unexpected answer');
  return rows.map(r => ({ name: String(r.name), score: Number(r.score) || 0, wave: Number(r.wave) || 1, revives: Number(r.revives) || 0 }));
}

// Initials: letters and digits only, upper case, at most 3 (the database enforces the same rule).
function cleanName(s) { return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3); }

const NAME_KEY = 'animeSnake.name';
function lbSavedName() { try { return cleanName(localStorage.getItem(NAME_KEY)); } catch (err) { return ''; } }
function lbSaveName(n) { try { localStorage.setItem(NAME_KEY, n); } catch (err) { /* storage blocked: fine */ } }

// ---- The flow ------------------------------------------------------------------
// Called once when the game-over screen appears.
async function leaderboardGameOver() {
  const lb = S.lb, id = S.runId;
  if (!lbEnabled()) { lb.status = 'off'; return; }
  lb.status = 'loading';
  try {
    const rows = await loadBoard();
    if (S.runId !== id) return;                        // a new run started while we waited
    lb.rows = rows; lb.status = 'ok';
    lb.qualifies = S.score > 0 && (rows.length < LEADERBOARD.size || S.score > rows[rows.length - 1].score);
    if (lb.qualifies) showNameEntry();
  } catch (err) {
    console.warn('Could not load the leaderboard:', err);
    if (S.runId === id) lb.status = 'error';
  }
}

// Posts this run's score under the given initials, then reloads the board and highlights the new row.
async function submitScore(raw) {
  const lb = S.lb, id = S.runId, name = cleanName(raw);
  if (S.alive || !S.over || !name || lb.submitting || lb.submitted) return;
  const score = S.score, wave = S.wave || 1, revives = S.revives;
  lb.submitting = true; lb.submitError = false; lb.name = name;
  hideNameEntry();
  try {
    await lbRequest(LEADERBOARD.table, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ name, score, wave, revives }),
    });
    lbSaveName(name);
    if (S.runId !== id) return;
    lb.submitted = true;
    try {
      const rows = await loadBoard();
      if (S.runId === id) { lb.rows = rows; lb.mine = rows.findIndex(r => r.name === name && r.score === score); }
    } catch (err) { console.warn('Score saved, but the board did not refresh:', err); }
  } catch (err) {
    console.warn('Could not save the score:', err);
    if (S.runId === id) { lb.submitError = true; showNameEntry(); }
  } finally {
    if (S.runId === id) lb.submitting = false;
  }
}

function skipEntry() { S.lb.skipped = true; hideNameEntry(); }

// ---- The initials box (plain HTML laid over the canvas, so phones get a keyboard) ---
const LB_UI = { box: null, input: null, msg: null };

function buildNameBox() {
  const box = document.createElement('div');
  box.id = 'nameEntry';
  Object.assign(box.style, {
    position: 'fixed', display: 'none', zIndex: '10', transform: 'translate(-50%, -50%)', textAlign: 'center',
    background: 'rgba(20,16,31,.95)', border: '2px solid #ffd36b', borderRadius: '8px', padding: '10px 14px',
    font: '14px system-ui, sans-serif', color: '#f3e9ff',
  });
  const msg = document.createElement('div');
  msg.id = 'nameMsg'; msg.style.marginBottom = '8px';
  const input = document.createElement('input');
  input.id = 'nameInput'; input.type = 'text'; input.maxLength = 3; input.value = lbSavedName();
  input.setAttribute('autocomplete', 'off'); input.setAttribute('autocapitalize', 'characters');
  input.setAttribute('spellcheck', 'false'); input.setAttribute('aria-label', 'Your initials');
  Object.assign(input.style, {
    width: '4.5ch', font: 'bold 26px monospace', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '2px',
    background: '#211a3b', color: '#ffd36b', border: '2px solid #3a2d5c', borderRadius: '6px', padding: '4px',
  });
  const mkButton = (id, text, strong) => {
    const b = document.createElement('button');
    b.id = id; b.textContent = text; b.type = 'button';
    Object.assign(b.style, {
      font: '16px system-ui, sans-serif', marginLeft: '8px', padding: '7px 14px', borderRadius: '6px', cursor: 'pointer',
      border: '2px solid ' + (strong ? '#ffd36b' : '#3a2d5c'), background: strong ? '#ffd36b' : '#211a3b', color: strong ? '#14101f' : '#f3e9ff',
    });
    return b;
  };
  const save = mkButton('nameSave', 'Save', true), skip = mkButton('nameSkip', 'Skip', false);
  input.addEventListener('input', () => { input.value = cleanName(input.value); });
  input.addEventListener('keydown', e => { if (e.key === 'Enter') submitScore(input.value); });
  save.addEventListener('click', () => submitScore(input.value));
  skip.addEventListener('click', skipEntry);
  box.appendChild(msg); box.appendChild(input); box.appendChild(save); box.appendChild(skip);
  document.body.appendChild(box);
  addEventListener('resize', placeNameBox);
  Object.assign(LB_UI, { box, input, msg });
}

// Sits the box over the game-over screen, whatever size the canvas is displayed at.
function placeNameBox() {
  if (!LB_UI.box) return;
  const r = cv.getBoundingClientRect();
  LB_UI.box.style.left = (r.left + r.width / 2) + 'px';
  LB_UI.box.style.top = (r.top + r.height * LEADERBOARD.entryY / cv.height) + 'px';
}
function showNameEntry() {
  if (!LB_UI.box) buildNameBox();
  LB_UI.msg.textContent = S.lb.submitError ? 'Could not save. Check your connection and try again.' : 'New top-10 score! Enter your initials:';
  LB_UI.box.style.display = 'block';
  placeNameBox();
  try { LB_UI.input.focus(); LB_UI.input.select(); } catch (err) { /* focus is a nicety */ }
}
function hideNameEntry() { if (LB_UI.box) LB_UI.box.style.display = 'none'; }
