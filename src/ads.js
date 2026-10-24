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
  S.ad = { kind, start: now, end: now + AD_SECONDS * 1000, idx: Math.floor(Math.random() * ADS.length) };
  playSfx('pause');
}

function adNote(which, ok, text) { S.adNote = { which, ok, text, until: performance.now() + CARD_NOTE_MS }; }

// Runs every frame (loop in main.js): when the ad ends, give the reward.
function updateAd() {
  const a = S.ad;
  if (!a || performance.now() < a.end) return;
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