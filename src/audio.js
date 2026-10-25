// audio.js: all sound. Sound effects and music.
//
//  * Placeholder sounds are SYNTHESIZED here with the Web Audio API (oscillators and noise), so the game has sound
//    with no files at all, and it works from file:// too.
//  * To use a real recording instead, put the file in assets/audio/sfx/ (or music/) and add its name to SFX_FILES
//    (or MUSIC_FILES) in config.js. A listed file replaces that one placeholder; everything else keeps working.
//  * Browsers keep audio silent until the player's first tap or key press. audioUnlock() listens for that, so the
//    very first tap on the hero select screen switches the sound on.
//  * Game code only calls playSfx('name', optionalNumber). Everything else (music mood, revive countdown ticks, wave
//    horns, "new best" fanfare...) is worked out from S by audioWatch() / audioMode(), once per frame.
//  * Audio can never crash or freeze the game: every entry point is wrapped, and an error just turns sound off.
//  * Handy in the browser console: audioDemo() plays every sound in turn. Set AUDIO_LOG = true in config.js to see names.

const AUDIO = {
  ctx: null, master: null, sfxBus: null, musicBus: null, noise: null,   // Web Audio objects (cannot live in S)
  unlocked: false, dead: false,
  files: {}, musicFiles: {},        // real <audio> files that loaded (see SFX_FILES / MUSIC_FILES)
  lastAt: {},                       // when each sound last played (stops machine-gun repeats)
  mode: null, modeGain: {}, duck: 1, // music: current mood, one gain node per mood, pause ducking
  nextStep: 0, stepIndex: 0, battleUntil: 0,
  seen: { runId: -1 },              // what audioWatch saw last frame, to spot changes
};
const MUSIC_MODES = ['title', 'run', 'battle', 'tense']; // title = hero/buff pick, run = calm, battle = enemies about, tense = revive countdown

function muteButtonRect() { return { x: 8, y: 8, w: 36, h: 36 }; } // the speaker icon on the hero select screen (render.js draws it, input.js taps it)

// ---- Setup ------------------------------------------------------------------------
function loadAudioFile(src, loop) {
  const a = new Audio();
  a.preload = 'auto'; a.loop = loop; a.ready = false; a.failed = false;
  a.addEventListener('canplaythrough', () => { a.ready = true; });
  a.addEventListener('error', () => { a.failed = true; console.warn('Missing audio file:', src); });
  a.src = src;
  return a;
}
function audioLoadFiles() {
  try {
    for (const name of Object.keys(SFX_FILES)) AUDIO.files[name] = loadAudioFile(AUDIO_DIR + 'sfx/' + SFX_FILES[name], false);
    for (const mode of Object.keys(MUSIC_FILES)) AUDIO.musicFiles[mode] = loadAudioFile(AUDIO_DIR + 'music/' + MUSIC_FILES[mode], true);
  } catch (err) { console.warn('Could not load audio files:', err); }
}

function audioBuild() { // the Web Audio graph: sfx and music buses -> master -> compressor -> speakers
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) { AUDIO.dead = true; return; }
  const c = new AC();
  AUDIO.ctx = c;
  AUDIO.master = c.createGain(); AUDIO.master.gain.value = S.muted ? 0 : MASTER_VOLUME;
  const comp = c.createDynamicsCompressor();
  AUDIO.master.connect(comp); comp.connect(c.destination);
  AUDIO.sfxBus = c.createGain(); AUDIO.sfxBus.gain.value = SFX_VOLUME; AUDIO.sfxBus.connect(AUDIO.master);
  AUDIO.musicBus = c.createGain(); AUDIO.musicBus.gain.value = MUSIC_VOLUME; AUDIO.musicBus.connect(AUDIO.master);
  MUSIC_MODES.forEach(m => { const g = c.createGain(); g.gain.value = 0; g.connect(AUDIO.musicBus); AUDIO.modeGain[m] = g; });
  const len = c.sampleRate, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0); // one second of white noise
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  AUDIO.noise = buf;
  AUDIO.nextStep = c.currentTime + 0.1;
}
function audioFail(err) { console.warn('Audio turned off after an error:', err); AUDIO.dead = true; }

// Called by the first tap / key press. Creates the audio engine and wakes it up (browsers require a gesture).
function audioUnlock() {
  if (AUDIO.dead) return;
  try {
    if (!AUDIO.ctx) audioBuild();
    if (AUDIO.ctx && AUDIO.ctx.state !== 'running') { const p = AUDIO.ctx.resume(); if (p && p.catch) p.catch(() => {}); }
    AUDIO.unlocked = !!AUDIO.ctx;
  } catch (err) { audioFail(err); }
}
// touchend / pointerup matter on iPhones, which do not count touchstart as a gesture for audio.
['keydown', 'mousedown', 'pointerdown', 'pointerup', 'touchend', 'click'].forEach(t => addEventListener(t, audioUnlock, { passive: true }));

document.addEventListener('visibilitychange', () => { // silence while the tab is hidden
  try {
    if (document.hidden) { if (AUDIO.ctx) AUDIO.ctx.suspend(); Object.values(AUDIO.musicFiles).forEach(a => a.pause()); }
    else if (AUDIO.unlocked && AUDIO.ctx) AUDIO.ctx.resume();
  } catch (err) { /* ignore */ }
});

function toggleMute() { // M key anywhere, or the speaker icon on the hero select screen
  S.muted = !S.muted;
  saveProgress();
  if (AUDIO.ctx && AUDIO.master) AUDIO.master.gain.setTargetAtTime(S.muted ? 0 : MASTER_VOLUME, AUDIO.ctx.currentTime, 0.03);
  if (!S.muted) playSfx('tick');
}

// ---- Synth building blocks ----------------------------------------------------------
// Options: at = seconds from now, when = absolute audio time (music), vol, type, slide = end frequency, bus.
function tone(freq, dur, o) {
  o = o || {};
  const c = AUDIO.ctx, t = (o.when !== undefined ? o.when : c.currentTime + (o.at || 0)) + 0.005;
  const osc = c.createOscillator(), g = c.createGain();
  osc.type = o.type || 'square';
  osc.frequency.setValueAtTime(freq, t);
  if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slide), t + dur);
  const v = o.vol === undefined ? 0.25 : o.vol, a = Math.min(o.attack || 0.004, dur / 2);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(v, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g); g.connect(o.bus || AUDIO.sfxBus);
  osc.start(t); osc.stop(t + dur + 0.03);
}
// Filtered noise: explosions, swooshes, drums. filter = 'lowpass' (default), 'highpass' or 'bandpass'; freqEnd sweeps it.
function noise(dur, o) {
  o = o || {};
  const c = AUDIO.ctx, t = (o.when !== undefined ? o.when : c.currentTime + (o.at || 0)) + 0.005;
  const src = c.createBufferSource(); src.buffer = AUDIO.noise; src.loop = true;
  const f = c.createBiquadFilter(); f.type = o.filter || 'lowpass';
  f.frequency.setValueAtTime(o.freq || 1000, t);
  if (o.freqEnd) f.frequency.exponentialRampToValueAtTime(Math.max(20, o.freqEnd), t + dur);
  f.Q.value = o.q || 1;
  const g = c.createGain(), v = o.vol === undefined ? 0.3 : o.vol;
  g.gain.setValueAtTime(v, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(o.bus || AUDIO.sfxBus);
  src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.03);
}
const NOTE = n => 440 * Math.pow(2, (n - 69) / 12); // MIDI note number to Hz (69 = A4)

// ---- The placeholder sound effects ----------------------------------------------------
// Name -> function(p). p is an optional number from the caller (combo count for 'kill', seconds left for 'reviveTick').
// A sound listed in SFX_FILES (config.js) is played from its file instead.
const SYNTH = {
  // menus and run flow
  tick()   { tone(880, 0.04, { vol: 0.1 }); },                                           // moving the card focus
  select() { [523, 659, 784].forEach((f, i) => tone(f, 0.1, { at: i * 0.07, vol: 0.18 })); }, // hero chosen
  unlock() { tone(988, 0.07, { vol: 0.2 }); tone(1319, 0.28, { at: 0.07, vol: 0.2 }); tone(2637, 0.2, { at: 0.07, type: 'sine', vol: 0.08 }); }, // coins spent
  deny()   { tone(160, 0.14, { type: 'sawtooth', slide: 110, vol: 0.22 }); tone(140, 0.2, { at: 0.13, type: 'sawtooth', slide: 90, vol: 0.22 }); },
  start()  { tone(196, 0.45, { type: 'triangle', slide: 784, vol: 0.3 }); [392, 523, 659].forEach((f, i) => tone(f, 0.25, { at: 0.3 + i * 0.04, vol: 0.12 })); }, // the run begins
  pause()  { tone(520, 0.12, { type: 'triangle', slide: 340, vol: 0.2 }); },
  resume() { tone(340, 0.12, { type: 'triangle', slide: 520, vol: 0.2 }); },

  // your weapons
  sword()  { noise(0.12, { filter: 'bandpass', freq: 2600, freqEnd: 800, q: 1.5, vol: 0.2 }); },
  shock()  { tone(170, 0.4, { type: 'sine', slide: 45, vol: 0.55 }); noise(0.35, { freq: 900, freqEnd: 80, vol: 0.3 }); tone(520, 0.25, { slide: 160, vol: 0.08 }); },
  shoot()  { tone(1300, 0.09, { slide: 220, vol: 0.16 }); noise(0.05, { filter: 'highpass', freq: 4000, vol: 0.1 }); },

  // hitting enemies
  hitEnemy() { tone(320, 0.09, { slide: 120, vol: 0.22 }); noise(0.06, { filter: 'bandpass', freq: 1500, vol: 0.18 }); },
  cut()      { tone(560, 0.1, { type: 'sawtooth', slide: 170, vol: 0.18 }); noise(0.08, { filter: 'highpass', freq: 3000, vol: 0.15 }); },
  kill(p)    { // climbs a pentatonic scale as the combo grows (p = combo count minus one)
    const f = 440 * Math.pow(2, [0, 2, 4, 7, 9][Math.max(0, Math.min(4, p | 0))] / 12);
    tone(f, 0.1, { vol: 0.2 }); tone(f * 1.5, 0.16, { at: 0.07, vol: 0.2 }); noise(0.1, { filter: 'bandpass', freq: 2200, vol: 0.18 });
  },
  explosion() { noise(0.7, { freq: 2000, freqEnd: 70, vol: 0.75 }); tone(120, 0.5, { type: 'sine', slide: 32, vol: 0.65 }); },
  mineDrop()  { tone(330, 0.05, { vol: 0.14 }); tone(220, 0.09, { at: 0.06, vol: 0.14 }); },
  lightning() { noise(0.22, { filter: 'highpass', freq: 2500, vol: 0.3 }); tone(2000, 0.16, { type: 'sawtooth', slide: 180, vol: 0.18 }); tone(90, 0.3, { at: 0.05, type: 'sine', slide: 40, vol: 0.3 }); }, // Raiden Shogun
  gaze()      { tone(300, 0.45, { type: 'triangle', slide: 700, vol: 0.2 }); tone(308, 0.45, { type: 'triangle', slide: 710, vol: 0.2 }); },   // Medusa freezes a head
  mrx()       { tone(800, 0.22, { type: 'sawtooth', slide: 90, vol: 0.22 }); noise(0.15, { filter: 'bandpass', freq: 1200, vol: 0.2 }); },    // Mr.X shoots a recruit

  // you getting hit, and defences
  block()  { tone(1400, 0.3, { vol: 0.15 }); tone(2100, 0.22, { type: 'triangle', vol: 0.14 }); tone(700, 0.35, { type: 'triangle', vol: 0.14 }); noise(0.05, { filter: 'highpass', freq: 5000, vol: 0.2 }); }, // Swordsman block: a clang
  shield() { tone(210, 0.28, { type: 'triangle', slide: 120, vol: 0.32 }); noise(0.16, { filter: 'bandpass', freq: 500, vol: 0.25 }); tone(900, 0.14, { at: 0.02, type: 'sine', vol: 0.12 }); }, // Gorgon shield: stone
  shieldReady() { tone(1047, 0.08, { type: 'sine', vol: 0.12 }); tone(1568, 0.16, { at: 0.08, type: 'sine', vol: 0.12 }); },
  hit()    { tone(240, 0.3, { type: 'sawtooth', slide: 70, vol: 0.38 }); noise(0.22, { freq: 1000, freqEnd: 180, vol: 0.35 }); },       // a character is lost
  portal() { tone(300, 0.18, { type: 'sine', slide: 1300, vol: 0.22 }); tone(1300, 0.18, { at: 0.14, type: 'sine', slide: 300, vol: 0.18 }); }, // Magician walls
  stall()  { tone(120, 0.12, { type: 'sine', slide: 70, vol: 0.35 }); },                                                              // ran into your own tail
  kick()   { tone(180, 0.1, { slide: 70, vol: 0.25 }); noise(0.06, { freq: 800, vol: 0.2 }); },

  // keys and characters
  key()     { tone(784, 0.06, { type: 'triangle', vol: 0.22 }); tone(1175, 0.14, { at: 0.06, type: 'triangle', vol: 0.22 }); },
  summon()  { tone(262, 0.32, { type: 'triangle', slide: 700, vol: 0.18 }); noise(0.25, { filter: 'bandpass', freq: 1000, freqEnd: 3000, vol: 0.06 }); },
  recruit() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.09, { at: i * 0.05, vol: 0.16 })); },
  recruitLost() { tone(420, 0.35, { type: 'triangle', slide: 90, vol: 0.3 }); },
  merge()   { [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, { at: i * 0.07, vol: 0.18 }));
              [262, 330, 392].forEach(f => tone(f, 0.7, { at: 0.35, type: 'triangle', vol: 0.16 }));
              noise(0.5, { at: 0.35, filter: 'highpass', freq: 6000, vol: 0.08 }); },

  // waves
  waveStart() { tone(196, 0.5, { type: 'sawtooth', vol: 0.2 }); tone(262, 0.5, { at: 0.25, type: 'sawtooth', vol: 0.2 }); tone(70, 0.25, { type: 'sine', slide: 40, vol: 0.5 }); },
  waveClear() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.12, { at: i * 0.06, type: 'triangle', vol: 0.2 })); },
  spawn()     { tone(110, 0.18, { type: 'sawtooth', slide: 65, vol: 0.12 }); },

  // death, revive, game over
  die()        { tone(420, 0.9, { type: 'sawtooth', slide: 50, vol: 0.3 }); noise(0.5, { freq: 1200, freqEnd: 100, vol: 0.3 }); },
  reviveTick(p){ tone(p <= 3 ? 988 : 660, 0.06, { vol: 0.14 }); },                       // p = seconds left
  revive()     { [262, 330, 392, 523, 659].forEach((f, i) => tone(f, 0.18, { at: i * 0.07, type: 'triangle', vol: 0.22 })); tone(200, 0.5, { slide: 800, vol: 0.1 }); },
  gameOver()   { [392, 349, 330, 262].forEach((f, i) => tone(f, 0.28, { at: i * 0.24, vol: 0.2 })); tone(131, 1.1, { type: 'triangle', vol: 0.3 }); },
  newBest()    { [523, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.13, { at: i * 0.09, vol: 0.2 })); noise(0.6, { at: 0.3, filter: 'highpass', freq: 6000, vol: 0.08 }); },
  win()        { [523, 659, 784, 1047, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.16, { at: i * 0.1, type: 'triangle', vol: 0.22 })); tone(262, 1.2, { at: 0.5, type: 'sine', vol: 0.2 }); noise(0.8, { at: 0.4, filter: 'highpass', freq: 6000, vol: 0.08 }); },
};

// Plays one sound. Quietly does nothing before the first tap, when muted, or if the same sound just played.
function playSfx(name, p) {
  if (AUDIO.dead || !AUDIO.unlocked || S.muted) return;
  try {
    const now = performance.now(), gap = SFX_GAPS[name] || SFX_MIN_GAP_MS;
    if (now - (AUDIO.lastAt[name] || 0) < gap) return;
    AUDIO.lastAt[name] = now;
    if (AUDIO_LOG) console.log('sfx', name, p === undefined ? '' : p);
    const f = AUDIO.files[name];
    if (f && f.ready && !f.failed) {                       // a real recording replaces the placeholder
      const c = f.cloneNode(); c.volume = Math.min(1, MASTER_VOLUME * SFX_VOLUME); c.play().catch(() => {});
      return;
    }
    if (SYNTH[name] && AUDIO.ctx) SYNTH[name](p);
  } catch (err) { audioFail(err); }
}
function audioDemo() { Object.keys(SYNTH).forEach((n, i) => setTimeout(() => playSfx(n, 2), i * 700)); } // console: hear everything

// ---- Placeholder music --------------------------------------------------------------
// One chord per bar (Am F C G), 16 steps per bar, all moods share the same clock so crossfades stay in time.
const BARS = [{ bass: 45, arp: [69, 72, 76] }, { bass: 41, arp: [65, 69, 72] }, { bass: 48, arp: [72, 76, 79] }, { bass: 43, arp: [67, 71, 74] }];
const ARP = [0, 1, 2, 1];

function musicStep(i, t) {
  const m = AUDIO.mode;
  if (!m) return;
  const file = AUDIO.musicFiles[m];
  if (file && file.ready && !file.failed) return;          // a real track plays this mood
  const bar = BARS[Math.floor(i / 16) % 4], s = i % 16, bus = AUDIO.modeGain[m];
  if (m === 'title') {                                     // soft and slow: a held bass note and a gentle arpeggio
    if (s === 0) tone(NOTE(bar.bass), 1.9, { type: 'sine', vol: 0.22, when: t, bus, attack: 0.05 });
    if (s % 2 === 0) tone(NOTE(bar.arp[ARP[(s / 2) % 4]]), 0.35, { type: 'triangle', vol: 0.1, when: t, bus });
  } else if (m === 'run') {                                // walking pace: bass, a light arpeggio, a quiet hat
    if (s === 0 || s === 6 || s === 10) tone(NOTE(bar.bass), 0.22, { type: 'triangle', vol: 0.28, when: t, bus });
    if (s % 2 === 0) tone(NOTE(bar.arp[ARP[(s / 2) % 4]]), 0.12, { vol: 0.07, when: t, bus });
    if (s % 4 === 2) noise(0.04, { filter: 'highpass', freq: 7000, vol: 0.06, when: t, bus });
  } else if (m === 'battle') {                             // drums, driving bass, fast arpeggio
    if (s % 4 === 0) tone(150, 0.15, { type: 'sine', slide: 45, vol: 0.5, when: t, bus });
    if (s === 4 || s === 12) noise(0.12, { filter: 'bandpass', freq: 1800, q: 0.8, vol: 0.25, when: t, bus });
    if (s % 2 === 0) { noise(0.03, { filter: 'highpass', freq: 8000, vol: 0.07, when: t, bus }); tone(NOTE(bar.bass), 0.12, { type: 'sawtooth', vol: 0.16, when: t, bus }); }
    tone(NOTE(bar.arp[ARP[s % 4]] + 12), 0.08, { vol: 0.05, when: t, bus });
  } else if (m === 'tense') {                              // revive countdown: a low drone, a clashing note, a heartbeat
    if (s === 0) { tone(NOTE(33), 2, { type: 'triangle', vol: 0.18, when: t, bus, attack: 0.3 }); tone(NOTE(34), 2, { type: 'triangle', vol: 0.07, when: t, bus, attack: 0.5 }); }
    if (s === 0 || s === 3) tone(70, 0.12, { type: 'sine', slide: 35, vol: 0.4, when: t, bus });
  }
}
function musicSchedule() { // runs every frame; schedules notes a little ahead of time on the audio clock
  const c = AUDIO.ctx, step = 60 / MUSIC_BPM / 4;
  if (AUDIO.nextStep < c.currentTime) AUDIO.nextStep = c.currentTime + 0.05; // fell behind (hidden tab): skip, do not catch up
  while (AUDIO.nextStep < c.currentTime + 0.25) {
    musicStep(AUDIO.stepIndex, AUDIO.nextStep);
    AUDIO.nextStep += step; AUDIO.stepIndex++;
  }
}
function musicSetMode(m) { // crossfade to another mood
  if (m === AUDIO.mode) return;
  AUDIO.mode = m;
  const now = AUDIO.ctx.currentTime;
  for (const k of MUSIC_MODES) { const g = AUDIO.modeGain[k].gain; g.cancelScheduledValues(now); g.setTargetAtTime(k === m ? 1 : 0, now, MUSIC_FADE); }
}
function fileMusicUpdate() { // real music files: fade by hand (they are plain <audio> elements)
  for (const k of MUSIC_MODES) {
    const a = AUDIO.musicFiles[k];
    if (!a || !a.ready || a.failed) continue;
    const want = AUDIO.mode === k && !S.muted ? MASTER_VOLUME * MUSIC_VOLUME * (S.paused ? PAUSE_DUCK : 1) : 0;
    a.fade = (a.fade || 0) + (want - (a.fade || 0)) * 0.06;
    a.volume = Math.max(0, Math.min(1, a.fade));
    if (want > 0 && a.paused) a.play().catch(() => {});
    else if (want === 0 && a.fade < 0.005 && !a.paused) a.pause();
  }
}
// Which mood fits the game right now.
function audioMode() {
  if (S.crashed) return null;
  if (S.picking) return 'title';
  if (!S.alive) return S.reviving ? 'tense' : null;      // silence on the game-over screen
  return performance.now() < AUDIO.battleUntil || S.toSpawn > 0 ? 'battle' : 'run';
}

// ---- Events spotted from the game state ----------------------------------------------
// Looks for things that changed since the last frame, so most sounds need no hook in the game code.
function audioWatch() {
  const w = AUDIO.seen, now = performance.now();
  if (w.runId !== S.runId) {                             // a new run, or the first frame
    Object.assign(w, { runId: S.runId, alive: true, picking: true, headPicking: true, index: 0, paused: false,
      wave: 0, inWave: false, enemies: 0, shield: true, secs: -1, over: false, bestChimed: false, bestAtStart: S.best });
    AUDIO.battleUntil = 0;
    return;
  }
  if (S.picking) {                                        // hero and buff pick screens
    if (w.headPicking && !S.headPicking) { playSfx('select'); w.index = S.pickIndex; }
    if (S.pickIndex !== w.index) { w.index = S.pickIndex; playSfx('tick'); }
  } else if (w.picking) playSfx('start');
  w.picking = S.picking; w.headPicking = S.headPicking;

  if (S.alive && !S.picking && S.paused !== w.paused) playSfx(S.paused ? 'pause' : 'resume');
  w.paused = S.paused;

  const died = w.alive && !S.alive, ended = S.over && !w.over;   // death, revive, game over
  if (died && !S.won) playSfx('die');
  else if (!w.alive && S.alive) playSfx('revive');
  if (ended && !S.won) { const runId = S.runId; setTimeout(() => { if (S.runId === runId) playSfx('gameOver'); }, died ? 900 : 0); }
  w.alive = S.alive; w.over = S.over;

  if (S.reviving) {                                       // revive countdown: one tick per second
    const secs = Math.ceil(Math.max(0, S.reviveEnd - now) / 1000);
    if (secs !== w.secs) { w.secs = secs; if (secs < REVIVE_SECONDS) playSfx('reviveTick', secs); }
  } else w.secs = -1;

  if (S.alive && !S.picking) {                            // waves and enemies
    if (S.wave > w.wave) { w.wave = S.wave; w.inWave = true; playSfx('waveStart'); }
    if (w.inWave && S.toSpawn === 0 && S.enemies.length === 0) { w.inWave = false; playSfx('waveClear'); }
    if (S.enemies.length > w.enemies) playSfx('spawn');
    w.enemies = S.enemies.length;
    if (S.enemies.length > 0) AUDIO.battleUntil = now + BATTLE_HOLD_MS;
    if (headId() === 'swordsman') { if (S.shield && !w.shield) playSfx('shieldReady'); w.shield = S.shield; }
  }
  if (S.newBest && !w.bestChimed && w.bestAtStart > 0) { w.bestChimed = true; playSfx('newBest'); } // beat the saved best (not on a first-ever run)
}

// Runs every frame from loop() in main.js.
function audioUpdate() {
  if (AUDIO.dead) return;
  try {
    audioWatch();
    if (!AUDIO.unlocked || !AUDIO.ctx) return;
    musicSetMode(audioMode());
    musicSchedule();
    fileMusicUpdate();
    const duck = S.paused ? PAUSE_DUCK : 1;               // music gets quieter while the game is paused
    if (duck !== AUDIO.duck) { AUDIO.duck = duck; AUDIO.musicBus.gain.setTargetAtTime(MUSIC_VOLUME * duck, AUDIO.ctx.currentTime, 0.05); }
  } catch (err) { audioFail(err); }
}

audioLoadFiles();
