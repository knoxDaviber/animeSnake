// ads.js: the fake joke ads. Nothing real: no network, no tracking, just a silly overlay you have to sit through.
//  * REVIVE ad: tap or press a key during the revive countdown. When the ad ends you are revived (revive.js, doRevive).
//  * COIN ad: the button on the hero select screen. Pays the next number in AD_PAYOUTS (10, 5, 2, 1). An hour after
//    the last coin ad, the payouts start again at 10.
//  * The ad "fast-forwards" (it claims to be AD_FAKE_SECONDS long but really takes AD_SECONDS) and cannot be skipped.
//  * Dev toggle: ADS_ENABLED in config.js. Player toggle: buy "No ads" for AD_FREE_PRICE coins on the hero select
//    screen, then tap it to switch ads off or on. With ads off, a revive is instant and free.
// S.ad = { kind: 'revive' | 'coins', start, end, idx } while an ad is playing (input is ignored, see input.js).
// The drawing is in render.js (drawAd, drawAdButtons).

function adsActive() { return ADS_ENABLED && !(S.adsOff && isUnlocked('perk', 'noads', AD_FREE_PRICE)); }

// Which payout step we are on right now (an hour after the last coin ad it is back to 0).
function adStepNow() { return S.adLastAt && Date.now() - S.adLastAt >= AD_RESET_MS ? 0 : S.adStep; }
function adPayout() { return AD_PAYOUTS[Math.min(adStepNow(), AD_PAYOUTS.length - 1)]; }

function startAd(kind) {
  if (S.ad || !adsActive()) return;
  const now = performance.now();
  S.ad = { kind, start: now, last: now, p: 0, holding: false, ad: generateAd() };
  S.adHold = false; S.adKey = false;
  playSfx('pause');
}

function adNote(which, ok, text) { S.adNote = { which, ok, text, until: performance.now() + CARD_NOTE_MS }; }

// Runs every frame (loop in main.js): when the ad ends, give the reward.
function updateAd() {
  const a = S.ad;
  if (!a) return;
  const now = performance.now(), dt = Math.min(100, now - a.last); a.last = now;
  a.holding = now - a.start > AD_HOLD_DELAY_MS && (S.adHold || S.adKey);   // the player has to HOLD the button
  a.p = Math.min(1, a.p + dt / (AD_SECONDS * 1000) * (a.holding ? AD_HOLD_SPEED : 1));
  if (a.p < 1) return;
  S.adHold = false; S.adKey = false;
  S.ad = null;
  if (a.kind === 'revive') { doRevive(); return; }
  const step = adStepNow(), pay = AD_PAYOUTS[Math.min(step, AD_PAYOUTS.length - 1)];
  S.coins += pay;
  S.adStep = Math.min(step + 1, AD_PAYOUTS.length - 1);
  S.adLastAt = Date.now();
  saveProgress();
  adNote('ad', true, `+${pay} coins!`);
  playSfx('unlock');
}

// Where the two buttons sit on the 640x640 hero select screen. Shared by drawing (render.js) and tapping (below).
function adButtonRect() { return { x: 90, y: 546, w: 260, h: 32 }; }
function noAdsRect() { return { x: 360, y: 546, w: 190, h: 32 }; }

// A tap on the hero select screen (p = canvas point). Returns true if it hit one of the two buttons.
function tapAdButtons(p) {
  if (!ADS_ENABLED || S.ad) return false;
  const hit = r => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  if (hit(adButtonRect())) {
    if (adsActive()) startAd('coins'); else { playSfx('deny'); adNote('ad', false, 'Ads are switched off'); }
    return true;
  }
  if (hit(noAdsRect())) {
    if (isUnlocked('perk', 'noads', AD_FREE_PRICE)) {            // owned: it is a toggle
      S.adsOff = !S.adsOff; saveProgress(); playSfx('tick');
    } else {
      const r = tryUnlock('perk', 'noads', AD_FREE_PRICE);
      if (r.ok) { S.adsOff = true; saveProgress(); playSfx('unlock'); adNote('noads', true, 'Ads are gone!'); }
      else { playSfx('deny'); adNote('noads', false, `Need ${r.need} more coins`); }
    }
    return true;
  }
  return false;
}
// ---- Madlib ads: parts come from assets/ads/ads_data.js (AD_DATA), see assets/ads/README.md. Falls back to ADS in config.js ----
const AD_IMG = {};
function pickOf(a) { return a[Math.floor(Math.random() * a.length)]; }
function adHoldRect() { return { x: 140, y: 410, w: 360, h: 66 }; } // the hold-to-fast-forward button (render.js draws it, input.js reads it)
function fillAd(t, vars, depth = 0) { // replaces {word} with a random entry of AD_DATA.parts.word (or a value in vars, like {name})
  const parts = AD_DATA.parts || {};
  return String(t).replace(/\{(\w+)\}/g, (m, k) => {
    if (vars[k]) return vars[k];
    return parts[k] && parts[k].length && depth < 4 ? fillAd(pickOf(parts[k]), vars, depth + 1) : m;
  });
}
function loadAdImage(file) {
  if (!AD_IMG[file]) { const im = new Image(); im.onerror = () => console.warn('Missing ad image:', file); im.src = '../assets/ads/' + file; AD_IMG[file] = im; }
  return AD_IMG[file];
}
function generateAd() { // { name, line, review, fine, image }
  if (typeof AD_DATA === 'undefined' || !AD_DATA.names || !AD_DATA.names.length) {
    const f = pickOf(ADS);
    return { name: f.name, line: f.line, review: '', fine: '', image: null };
  }
  const D = AD_DATA, vars = {};
  vars.name = fillAd(pickOf(D.names), vars);
  const make = list => list && list.length ? fillAd(pickOf(list), vars) : '';
  return { name: vars.name, line: make(D.lines), review: make(D.reviews), fine: make(D.fine),
           image: D.images && D.images.length ? loadAdImage(pickOf(D.images)) : null, fx: rollAdFx() };
}
if (typeof AD_DATA !== 'undefined' && AD_DATA.images) AD_DATA.images.forEach(loadAdImage);


// ---- Image effects (settings: AD_FX in config.js) ----
function rollAdFx() { // a random pick of the effects that are switched on, each with its own random phase
  if (!AD_FX_ON) return [];
  const names = Object.keys(AD_FX).filter(k => AD_FX[k].on), out = [];
  while (out.length < AD_FX_PER_AD && names.length)
    out.push({ k: names.splice(Math.floor(Math.random() * names.length), 1)[0], ph: Math.random() * 6.283 });
  return out;
}
// Draws the ad picture centred on (cx, cy), fitted into 240 x 130, with its effects. p = ad progress 0..1.
function drawAdImage(ad, cx, cy, p) {
  const im = ad.image;
  if (!im || !im.complete || !im.naturalWidth) return;
  const t = performance.now() / 1000, s = Math.min(240 / im.naturalWidth, 130 / im.naturalHeight);
  const w = im.naturalWidth * s, h = im.naturalHeight * s;
  let rot = 0, sx = 1, sy = 1, ox = 0, oy = 0, hue = 0;
  for (const f of ad.fx || []) {
    const c = AD_FX[f.k], ph = f.ph;
    if (f.k === 'wobble') rot += Math.sin(t * c.speed + ph) * c.deg * Math.PI / 180;
    else if (f.k === 'pulse') { const k = 1 + Math.sin(t * c.speed + ph) * c.amount; sx *= k; sy *= k; }
    else if (f.k === 'spin') rot += t * c.speed + ph;
    else if (f.k === 'bounce') oy -= Math.abs(Math.sin(t * c.speed + ph)) * c.px;
    else if (f.k === 'shake') { ox += (Math.random() - 0.5) * c.px * 2; oy += (Math.random() - 0.5) * c.px * 2; }
    else if (f.k === 'flip') sx *= Math.cos(t * c.speed + ph);
    else if (f.k === 'hue') hue += t * c.speed + ph * 57;
    else if (f.k === 'mirror') sx *= ph > 3.14 ? -1 : 1;
    else if (f.k === 'tilt') rot += (ph / 6.283 - 0.5) * 2 * c.deg * Math.PI / 180;
    else if (f.k === 'zoom') { const k = 0.8 + c.amount * p; sx *= k; sy *= k; }
  }
  ctx.save();
  ctx.translate(cx + ox, cy + oy); ctx.rotate(rot); ctx.scale(sx, sy);
  if (hue && 'filter' in ctx) ctx.filter = `hue-rotate(${Math.round(hue) % 360}deg)`;
  ctx.drawImage(im, -w / 2, -h / 2, w, h);
  ctx.restore();
}