// rooms.js: the world is a 3x3 grid of 20x20 ROOMS. Each room is a template (20 strings of 20 characters) that is
// randomly rotated / mirrored and stamped into S.map by buildWorld() (called from newRun in state.js).
// The middle room is always the start room (the hero begins in the middle of it). More template sketches are in
// templates.md; the ones built so far need only the tiles below.
//
// Tile characters (S.map[y][x] holds one character per tile):
//   .  floor          #  wall (solid for everything)       H  hazard: costs a ring
//   ~  mud: a snake whose head is on it moves at half speed
//   > < ^ v   conveyor: whoever stands on it is pushed this way (the hero's heading is forced)
//   r l u d   one-way gate: can only be entered heading right / left / up / down, solid from every other side
//   I  ice: the hero cannot turn while the head is on it
//   *  key spot: new keys prefer these tiles (plain floor otherwise)      e  floor (enemy door, unused for now)
//   P  bomb pedestal

// Decor is the "show, don't tell" layer: bones, a dead bonfire, swords stuck in the ground, headless statues...
// Each template lists its decor as [kind, x, y]. buildWorld turns it into S.decor = { x, y, k, v } and scatters more
// small decor on the floor from the room's theme. Drawing is in scenery.js.
//
// Room tags: tier (1 = rooms next to the start room, 2 = corner rooms), favors = the enemy type that spawns more
// often while the hero is in that room (see pickEnemyType in enemies.js).

const ROOM = 20; // tiles per room side. COLS and ROWS in config.js are 3 x ROOM

const ROOM_THEMES = {
  crypt:    { floor: '#1d1730', alt: '#221a38', wall: '#3a3350', density: 0.035, scatter: ['bone', 'crack', 'crack', 'skull'] },
  knights:  { floor: '#1f1a2b', alt: '#251f33', wall: '#403b5a', density: 0.03,  scatter: ['bone', 'crack'] },
  garden:   { floor: '#16241d', alt: '#1b2b22', wall: '#2f4a3a', density: 0.09,  scatter: ['moss', 'moss', 'flower', 'bone'] },
  flooded:  { floor: '#15212d', alt: '#1a2938', wall: '#2f4357', density: 0.08,  scatter: ['puddle', 'puddle', 'crack', 'bone'] },
  frozen:   { floor: '#1a2433', alt: '#202c3e', wall: '#3d516b', density: 0.07,  scatter: ['frost', 'frost', 'bone'] },
  keep:     { floor: '#241922', alt: '#2b1f29', wall: '#4d3548', density: 0.04,  scatter: ['bone', 'crack', 'chain'] },
  barracks: { floor: '#231c1a', alt: '#2a211e', wall: '#4a3a34', density: 0.04,  scatter: ['bone', 'crack', 'skull'] },
};

// ---- The story, told only by what is lying around -------------------------------------------------
// The start room is a cold hearth: a dead bonfire, an empty helm and a trail of bones that crawls to the north door.
// Every other room hints at what happened to the people who lived here (knights died at the gates they guarded, a king
// died on his throne with the drawbridge chains cut, a congregation froze while kneeling, soldiers never left their beds).

const START_ROOM = {
  id: 'start', theme: 'crypt',
  rows: [
    '#########..#########',
    '#..................#',
    '#..................#',
    '#..#............#..#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#..................#',
    '....................',
    '....................',
    '#..................#',
    '#..................#',
    '#..................#',
    '#..#............#..#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#########..#########',
  ],
  decor: [['bonfire', 10, 12], ['helm', 9, 12], ['ribs', 8, 13], ['sword', 11, 13], ['bone', 10, 7], ['bone', 10, 5], ['skull', 10, 3],
          ['banner', 4, 0], ['banner', 15, 0], ['banner', 4, 19], ['banner', 15, 19]],
};

const ROOM_TEMPLATES = [
  { id: 'ruins', name: 'Ruins', tier: [1], theme: 'crypt',
    rows: [
      '#########..#########',
      '#*................*#',
      '#..................#',
      '#..................#',
      '#...##........##...#',
      '#...##........##...#',
      '#..................#',
      '#..................#',
      '#........~~........#',
      '....................',
      '....................',
      '#........~~........#',
      '#..................#',
      '#..................#',
      '#...##........##...#',
      '#...##........##...#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#########..#########',
    ],
    // a lone grave: a sword in the ground, a helm, burnt-out candles
    decor: [['sword', 3, 16], ['helm', 3, 17], ['candle', 2, 16], ['candle', 4, 16], ['candle', 2, 17], ['ribs', 16, 3], ['bone', 15, 2], ['banner', 6, 0]] },

  { id: 'gauntlet', name: 'The Gauntlet', tier: [1, 2], theme: 'knights', favors: 'armored',
    rows: [
      '#########..#########',
      '#.....r............#',
      '#.....r..........*.#',
      '#.....r............#',
      '#...############...#',
      '#...############...#',
      '#...############...#',
      '#...############ddd#',
      '#...############...#',
      '....############....',
      '....############....',
      '#...############...#',
      '#uuu############...#',
      '#...############...#',
      '#...############...#',
      '#...############...#',
      '#..*....l..........#',
      '#.......l..........#',
      '#.......l..........#',
      '#########..#########',
    ],
    // headless knights line the walls, and each gate has a fallen one in front of it, all facing the same way
    decor: [['statue', 5, 4], ['statue', 10, 4], ['statue', 14, 4], ['statue', 5, 15], ['statue', 10, 15], ['statue', 14, 15],
            ['statue', 4, 7], ['statue', 15, 7], ['statue', 4, 12],
            ['ribs', 5, 2], ['ribs', 17, 6], ['ribs', 9, 17], ['ribs', 2, 13],
            ['sword', 4, 1], ['sword', 17, 5], ['sword', 10, 18], ['sword', 3, 14]] },

  { id: 'garden', name: 'The Withered Garden', tier: [1, 2], theme: 'garden', favors: 'fast',
    rows: [
      '#########..#########',
      '#*................*#',
      '#..HH....HH....HH..#',
      '#..HH....HH....HH..#',
      '#..................#',
      '#..................#',
      '#.HH....HHHH....HH.#',
      '#.HH....HHHH....HH.#',
      '#..................#',
      '....................',
      '....................',
      '#..................#',
      '#.HH....HHHH....HH.#',
      '#.HH....HHHH....HH.#',
      '#..................#',
      '#..................#',
      '#..HH....HH....HH..#',
      '#..HH....HH....HH..#',
      '#..................#',
      '#########..#########',
    ],
    // somebody sat down against the wall with a flower and never got up
    decor: [['ribs', 2, 5], ['flower', 3, 5], ['skull', 9, 12], ['statue', 0, 5], ['statue', 19, 14], ['bone', 8, 14]] },

  { id: 'mill', name: 'The Flooded Mill', tier: [1, 2], theme: 'flooded', favors: 'fast',
    rows: [
      '#########..#########',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#...>>>>>>>>>>>>.HH#',
      '#...>>>>>>>>>>>>.HH#',
      '#..................#',
      '#..................#',
      '....................',
      '....................',
      '#..................#',
      '#..................#',
      '#HH.<<<<<<<<<<<<...#',
      '#HH.<<<<<<<<<<<<...#',
      '#..................#',
      '#...HH........HH...#',
      '#........*.........#',
      '#..................#',
      '#########..#########',
    ],
    // the wheel broke, the water kept running, and the current drags everything toward the spikes
    decor: [['wheel', 5, 0], ['wheel', 14, 19], ['skull', 16, 4], ['ribs', 2, 12], ['bone', 3, 12], ['chain', 1, 8]] },

  { id: 'chapel', name: 'The Frozen Chapel', tier: [2], theme: 'frozen', favors: 'spitter',
    rows: [
      '#########..#########',
      '#*................*#',
      '#IIII#III..IIII#III#',
      '#IIIIIIII..IIIIIIII#',
      '#III#IIII..IIIIII#I#',
      '#IIIIIIII..IIIIIIII#',
      '#IIIIII##..##IIIIII#',
      '#IIIIIIII..IIIIIIII#',
      '#I#IIIIII..IIIIII#I#',
      '....................',
      '....................',
      '#IIIIIIII..IIIIIIII#',
      '#IIIIII##..##IIIIII#',
      '#IIIIIIII..IIIIIIII#',
      '#III#IIII..IIIIII#I#',
      '#IIIIIIII..IIIIIIII#',
      '#IIII#III..IIII#III#',
      '#IIIIIIII..IIIIIIII#',
      '#..................#',
      '#########..#########',
    ],
    // a congregation knelt in the middle and froze there, facing a sword
    decor: [['candle', 5, 2], ['candle', 15, 2], ['candle', 4, 4], ['candle', 17, 4], ['candle', 8, 6], ['candle', 9, 6],
            ['ribs', 8, 9], ['ribs', 11, 9], ['ribs', 9, 11], ['helm', 10, 10], ['sword', 10, 9]] },

  { id: 'keep', name: 'The Moat Keep', tier: [2], theme: 'keep', favors: 'armored',
    rows: [
      '#########..#########',
      '#..................#',
      '#.HHHHHHH..HHHHHHH.#',
      '#.H..............H.#',
      '#.H..............H.#',
      '#.H..............H.#',
      '#.H..............H.#',
      '#.H..............H.#',
      '#.H..............H.#',
      '.........*..........',
      '....................',
      '#.H..............H.#',
      '#.H..............H.#',
      '#.H..............H.#',
      '#.H..............H.#',
      '#.H..............H.#',
      '#.H..............H.#',
      '#.HHHHHHH..HHHHHHH.#',
      '#..................#',
      '#########..#########',
    ],
    // the king died on his throne, his crown still on his lap, and somebody cut the drawbridge chains
    decor: [['throne', 10, 4], ['ribs', 10, 5], ['crown', 10, 6], ['chain', 2, 9], ['chain', 17, 9], ['banner', 4, 0], ['banner', 15, 0],
            ['skull', 6, 6], ['bone', 7, 7], ['sword', 13, 7]] },

  { id: 'nest', name: 'The Barracks', tier: [2], theme: 'barracks', favors: 'spitter',
    rows: [
      '#########..#########',
      '#*................*#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#....####uu####....#',
      '#....#........#....#',
      '#....#..eeee..#....#',
      '.....#........#.....',
      '.....#........#.....',
      '#....#........#....#',
      '#....#........#....#',
      '#....##########....#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#########..#########',
    ],
    // the soldiers never left their beds, and whatever hatched in there leaves through the only gate
    decor: [['bedroll', 7, 8], ['bedroll', 12, 8], ['bedroll', 7, 11], ['bedroll', 12, 11], ['ribs', 9, 12], ['skull', 9, 5], ['bone', 10, 4],
            ['banner', 4, 0], ['banner', 15, 0], ['sword', 3, 3]] },
  // ---- Paste these inside ROOM_TEMPLATES, right after the nest template (before the closing  ];  ) ----
  // doors: 'tb' = only the top and bottom openings exist. buildWorld (rooms.js) turns such a room so the opening that
  // faces the middle of the world stays open. noItems = no keys, recruits or enemy spawns here.

  { id: 'vault', name: 'The Sealed Vault', tier: [2], theme: 'keep', favors: 'armored', doors: 'tb', noItems: true,
    rows: [
      '#########..#########',
      '#..................#',
      '#..................#',
      '#.....B......B.....#',
      '#..................#',
      '#.....B......B.....#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#HHHHHHHHHHHHHHHHHH#',
      '#HHHHHHHHHHHHHHHHHH#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#.....B......B.....#',
      '#..................#',
      '#.....B......B.....#',
      '#..................#',
      '#..................#',
      '#########..#########',
    ],
    // somebody dragged crates to the edge of the pit and ran out of strength
    decor: [['skull', 6, 8], ['bone', 13, 8], ['ribs', 9, 12], ['sword', 16, 16], ['helm', 3, 15], ['banner', 4, 0], ['banner', 15, 19]] },

  { id: 'pinball', name: 'The Bouncing Hall', tier: [1, 2], theme: 'knights', favors: 'fast',
    rows: [
      '#########..#########',
      '#*................*#',
      '#.......Z....Z.....#',
      '#..................#',
      '#..Z..........Z....#',
      '#..................#',
      '#........ZZ........#',
      '#..................#',
      '#..Z............Z..#',
      '....................',
      '....................',
      '#..................#',
      '#...Z..........Z...#',
      '#..................#',
      '#........ZZ........#',
      '#..................#',
      '#.....Z......Z.....#',
      '#..................#',
      '#*................*#',
      '#########..#########',
    ],
    // helms scattered like something threw them from stone to stone
    decor: [['wheel', 5, 0], ['helm', 13, 6], ['skull', 10, 10], ['bone', 5, 12], ['bone', 14, 12], ['sword', 16, 17]] },

  { id: 'bridges', name: 'The Crumbling Bridges', tier: [2], theme: 'keep', favors: 'fast', doors: 'tb',
    rows: [
      '#########..#########',
      '#HHHHHHHH..HHHHHHHH#',
      '#HHHHHHHHCCHHHHHHHH#',
      '#HHHHHHHHCCHHHHHHHH#',
      '#HHCCCCCCCCCCCCCCHH#',
      '#HHCCCCCCCCCCCCCCHH#',
      '#HHCCHHHHHHHHHHCCHH#',
      '#HHCCHHHHHHHHHHCCHH#',
      '#HHCCHHHHHHHHHHCCHH#',
      '#HHCCHHHHHHHHHHCCHH#',
      '#HHCCCCCCCCCCCCCCHH#',
      '#HHCCCCCCCCCCCCCCHH#',
      '#HHHHHHHHCCHHHHHHHH#',
      '#HHHHHHHHCCHHHHHHHH#',
      '#HHHHHHHHCCHHHHHHHH#',
      '#HHHHHHHHCCHHHHHHHH#',
      '#HHHHHHHHCCHHHHHHHH#',
      '#HHHHHHHHCCHHHHHHHH#',
      '#HHHHHHHH..HHHHHHHH#',
      '#########..#########',
    ],
    // the ones who stopped to rest on the way
    decor: [['skull', 9, 1], ['bone', 10, 1], ['sword', 9, 18], ['ribs', 10, 18], ['banner', 4, 0], ['banner', 15, 0]] },

  { id: 'alley', name: 'Turret Alley', tier: [2], theme: 'knights', favors: 'armored', doors: 'tb',
    rows: [
      '#########..#########',
      '#..................#',
      'T..................#',
      '#..................#',
      '#..................T',
      '#..................#',
      'T..................#',
      '#..................#',
      '#..................T',
      '#..................#',
      'T..................#',
      '#..................#',
      '#..................T',
      '#..................#',
      'T..................#',
      '#..................#',
      '#..................T',
      '#*................*#',
      '#..................#',
      '#########..#########',
    ],
    // the stone watchers still keep the rhythm; the ones who ran straight through lie in the lanes
    decor: [['ribs', 10, 3], ['skull', 5, 5], ['bone', 12, 7], ['sword', 15, 11], ['helm', 3, 15], ['bone', 9, 18]] },

  { id: 'serpentine', name: 'The Long March', tier: [1, 2], theme: 'knights', favors: 'fast', doors: 'tb',
    rows: [
      '#########..#########',
      '#..................#',
      '#..................#',
      '#################..#',
      '#..................#',
      '#..................#',
      '#..#################',
      '#..................#',
      '#........*.........#',
      '#################..#',
      '#..................#',
      '#..................#',
      '#..#################',
      '#........*.........#',
      '#..................#',
      '#################..#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#########..#########',
    ],
    // a column of soldiers walked this lane, one lost helm and one sword at a time
    decor: [['banner', 4, 0], ['helm', 2, 1], ['sword', 17, 4], ['skull', 2, 7], ['bone', 16, 10], ['ribs', 3, 13], ['candle', 17, 16], ['bone', 9, 18]] },

  // P = bomb pedestal (bombs.js). Four of them, each beside a pillar, so a bomb always has a place to be kicked from.
  { id: 'powder', name: 'The Powder Store', tier: [1, 2], theme: 'barracks', favors: 'kamikaze',
    rows: [
      '#########..#########',
      '#*................*#',
      '#..................#',
      '#..##..........##..#',
      '#..##..........##..#',
      '#....P........P....#',
      '#..................#',
      '#..................#',
      '#..................#',
      '....................',
      '....................',
      '#..................#',
      '#..................#',
      '#..................#',
      '#....P........P....#',
      '#..##..........##..#',
      '#..##..........##..#',
      '#..................#',
      '#*................*#',
      '#########..#########',
    ],
    // the sappers left in a hurry, and the powder kept regrowing
    decor: [['skull', 5, 6], ['bone', 14, 13], ['chain', 9, 1], ['banner', 4, 0], ['candle', 5, 4], ['ribs', 10, 9], ['sword', 16, 17]] },

  { id: 'yard', name: "The Sapper's Yard", tier: [2], theme: 'keep', favors: 'kamikaze',
    rows: [
      '#########..#########',
      '#..................#',
      '#..................#',
      '#....##......##....#',
      '#....##......##....#',
      '#..................#',
      '#..................#',
      '#.......P..P.......#',
      '#..................#',
      '....................',
      '....................',
      '#..................#',
      '#.......P..P.......#',
      '#..................#',
      '#..................#',
      '#....##......##....#',
      '#....##......##....#',
      '#..................#',
      '#........*.........#',
      '#########..#########',
    ],
    // a trench of pedestals, and a flag nobody bothered to take down
    decor: [['banner', 4, 0], ['banner', 15, 0], ['helm', 3, 9], ['bone', 16, 11], ['skull', 10, 5], ['ribs', 9, 14]] },
];

// ---- Rotating and mirroring templates ----------------------------------------------------------------------------
// Direction tiles must turn with the room: a conveyor pointing right becomes one pointing down after a quarter turn.
const CHAR_ROT = { '>': 'v', v: '<', '<': '^', '^': '>', r: 'd', d: 'l', l: 'u', u: 'r' };  // quarter turn clockwise
const CHAR_MIR = { '>': '<', '<': '>', r: 'l', l: 'r' };                                       // mirrored left-right

function rotCW(g) { // g = array of N strings of N characters
  const n = g.length, out = [];
  for (let y = 0; y < n; y++) { let row = ''; for (let x = 0; x < n; x++) row += g[n - 1 - x][y]; out.push(row); }
  return out;
}
function transformRows(rows, rot, flip) {
  let g = rows.slice();
  if (flip) g = g.map(r => r.split('').reverse().map(c => CHAR_MIR[c] || c).join(''));
  for (let i = 0; i < rot; i++) g = rotCW(g).map(r => r.split('').map(c => CHAR_ROT[c] || c).join(''));
  return g;
}
function transformPoint(x, y, rot, flip) { // the same turn, applied to one tile
  if (flip) x = ROOM - 1 - x;
  for (let i = 0; i < rot; i++) { const nx = ROOM - 1 - y, ny = x; x = nx; y = ny; }
  return { x, y };
}

// Warns in the console if a template is not 20 rows of 20 characters (easy to get wrong when editing by hand).
(function checkTemplates() {
  [START_ROOM, ...ROOM_TEMPLATES].forEach(t => {
    if (t.rows.length !== ROOM || t.rows.some(r => r.length !== ROOM)) console.warn('Room template is not 20x20:', t.id);
  });
})();
// ---- World shapes ----------------------------------------------------------------------------------------------------
// The world is a GRID x GRID grid of 20x20 cells. A LAYOUT says which cells hold a room (R), where you start (S) and which
// cells stay solid rock (.). Every run picks one at random and turns / mirrors it, so the map is a different shape each time.
// Doors, chests and the "N doors away" rules all follow the shape (S.layout.dist = doors away from the start room).
const LAYOUTS = [
  { name: 'The Cross',    rows: ['..R..', '..R..', 'RRSRR', '..R..', '..R..'] },
  { name: 'The Keyhole',  rows: ['..R..', '.RRR.', '.R.R.', '.RSR.', '.....'] },
  { name: 'The Long L',   rows: ['R....', 'R....', 'R....', 'R....', 'SRRRR'] },
  { name: 'The Serpent',  rows: ['.RRR.', '.R...', '.RSR.', '...R.', '.RRR.'] },
  { name: 'The Stairs',   rows: ['RR...', '.RR..', '..SR.', '...RR', '....R'] },
  { name: 'The Keep',     rows: ['.....', '.RRR.', '.RSR.', '.RRR.', '.....'] },
  { name: 'The Crossbar', rows: ['RRRRR', '..R..', '..S..', '..R..', '..R..'] },
];
(function checkLayouts() {   // warns in the console if a shape is not GRID x GRID, or has no start
  LAYOUTS.forEach(l => {
    if (l.rows.length !== GRID || l.rows.some(r => r.length !== GRID) || l.rows.join('').split('S').length !== 2) console.warn('Bad world layout:', l.name);
  });
})();

// Picks this run's shape, turns and mirrors it, and works out how many doors away from the start every room is.
// Returns { name, has: Uint8Array (1 = a room is here), start: cell index, dist: Int8Array (doors from the start, -1 = no room) }.
function pickLayout() {
  const N = GRID, forced = FORCE_LAYOUT ? LAYOUTS.find(l => l.name === FORCE_LAYOUT) : null;
  const L = forced || LAYOUTS[Math.floor(Math.random() * LAYOUTS.length)];
  const rot = Math.floor(Math.random() * 4), flip = Math.random() < 0.5;
  const has = new Uint8Array(N * N); let start = 0;
  L.rows.forEach((row, y) => row.split('').forEach((ch, x) => {
    if (ch === '.') return;
    let px = flip ? N - 1 - x : x, py = y;
    for (let i = 0; i < rot; i++) { const nx = N - 1 - py, ny = px; px = nx; py = ny; }
    has[py * N + px] = 1;
    if (ch === 'S') start = py * N + px;
  }));
  const dist = new Int8Array(N * N).fill(-1), q = [start];
  dist[start] = 0;
  for (let h = 0; h < q.length; h++) {                 // doors away from the start: breadth first over touching room cells
    const i = q[h], x = i % N, y = (i - x) / N;
    for (const d of DIRS) {
      const nx = x + d.x, ny = y + d.y;
      if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
      const j = ny * N + nx;
      if (has[j] && dist[j] < 0) { dist[j] = dist[i] + 1; q.push(j); }
    }
  }
  return { name: L.name, has, start, dist };
}
// The tile the hero starts on: the middle of the start room.
function startTile() {
  const ri = S.layout.start;
  return { x: (ri % GRID) * ROOM + ROOM / 2, y: Math.floor(ri / GRID) * ROOM + ROOM / 2 };
}

// nb = which sides of the room touch another room: { u, d, l, r }. A 'tb' template only has two opposite openings, so it
// cannot sit on a bend of the shape.
function pickTemplate(tier, avoidId, nb) {
  const bend = !!nb && (nb.u || nb.d) && (nb.l || nb.r);
  const list = ROOM_TEMPLATES.filter(t => t.tier.includes(tier) && t.id !== avoidId && !(t.doors === 'tb' && bend));
  return list.length ? list[Math.floor(Math.random() * list.length)] : ROOM_TEMPLATES.find(t => t.tier.includes(tier) && t.doors !== 'tb');
}

// Which room the tile (x, y) belongs to (S.rooms is in row order: index = room row * GRID + room column).
function roomAt(x, y) {
  const rx = Math.max(0, Math.min(GRID - 1, Math.floor(x / ROOM))), ry = Math.max(0, Math.min(GRID - 1, Math.floor(y / ROOM)));
  return S.rooms[ry * GRID + rx];
}
// Rooms with doors: 'tb' (only two opposite openings) are turned so their openings face the neighbours.
function pickRot(tpl, nb) {
  if (tpl.doors !== 'tb') return Math.floor(Math.random() * 4);
  const vert = nb.u || nb.d;
  return (vert ? 0 : 1) + 2 * Math.floor(Math.random() * 2);   // 0 or 180 for up/down neighbours, 90 or 270 for left/right ones
}
// True on tiles where nothing may spawn (keys, recruits, enemies): rooms flagged noItems, like the vault, and rock.
function noItems(x, y) { const r = roomAt(x, y); return !!(r && r.noItems); }

// Builds a fresh world for a new run (S.layout must be set): S.map, S.rooms, S.decor, S.keySpots.
function buildWorld() {
  const N = GRID, L = S.layout, map = range(ROWS).map(() => Array(COLS).fill('#'));   // rock everywhere, rooms are stamped in
  const rooms = [], vignettes = [], spots = [], turrets = [], pedestals = [];
  let last = null;
  const nearRooms = range(N * N).filter(i => L.has[i] && L.dist[i] === 1);
  const powderRoom = nearRooms.length ? nearRooms[Math.floor(Math.random() * nearRooms.length)] : -1;   // one near room always holds bomb pedestals
  const touching = i => {                              // which sides of cell i join another room
    const x = i % N, y = (i - x) / N, has = (cx, cy) => cx >= 0 && cy >= 0 && cx < N && cy < N && !!L.has[cy * N + cx];
    return { u: has(x, y - 1), d: has(x, y + 1), l: has(x - 1, y), r: has(x + 1, y) };
  };
  for (let ry = 0; ry < N; ry++) for (let rx = 0; rx < N; rx++) {
    const ri = ry * N + rx;
    if (!L.has[ri]) { rooms.push({ id: 'void', name: 'Rock', theme: 'crypt', favors: null, noItems: true, void: true }); continue; }
    const start = ri === L.start, nb = touching(ri);
    const tpl = start ? START_ROOM : ri === powderRoom ? ROOM_TEMPLATES.find(t => t.id === 'powder') : pickTemplate(L.dist[ri] <= 1 ? 1 : 2, last, nb);
    last = tpl.id;
    const rot = start ? 0 : pickRot(tpl, nb), flip = !start && Math.random() < 0.5;
    const rows = transformRows(tpl.rows, rot, flip), ox = rx * ROOM, oy = ry * ROOM;
    for (let y = 0; y < ROOM; y++) for (let x = 0; x < ROOM; x++) {
      const c = rows[y][x];
      map[oy + y][ox + x] = c;
      if (c === 'P') pedestals.push({ x: ox + x, y: oy + y, cd: PEDESTAL_FIRST });   // bombs.js
      if (c === '*') spots.push({ x: ox + x, y: oy + y });   // key spots (placeKey in world.js prefers these)
      if (c === 'T') {                                                          // a turret fires away from the room's edge it sits on
        const dx = x === 0 ? 1 : x === ROOM - 1 ? -1 : 0, dy = dx ? 0 : y === 0 ? 1 : y === ROOM - 1 ? -1 : 0;
        if (dx || dy) turrets.push({ x: ox + x, y: oy + y, dx, dy, cd: 10 + (turrets.length * 5) % 22 });
      }
    }
    const seal = (x, y) => { if (map[y][x] !== 'T') map[y][x] = '#'; };
    for (let k = 9; k <= 10; k++) {                    // a side that touches rock or the world edge is walled up, so there is no dead-end nook
      if (!nb.u) seal(ox + k, oy);
      if (!nb.d) seal(ox + k, oy + ROOM - 1);
      if (!nb.l) seal(ox, oy + k);
      if (!nb.r) seal(ox + ROOM - 1, oy + k);
    }
    (tpl.decor || []).forEach(([k, x, y]) => {
      const p = transformPoint(x, y, rot, flip);
      vignettes.push({ x: ox + p.x, y: oy + p.y, k, v: Math.random() });
    });
    rooms.push({ id: tpl.id, name: tpl.name, theme: tpl.theme, favors: tpl.favors || null, noItems: !!tpl.noItems });
  }
  for (let x = 0; x < COLS; x++) { if (map[0][x] !== 'T') map[0][x] = '#'; if (map[ROWS - 1][x] !== 'T') map[ROWS - 1][x] = '#'; }   // the edge of the world is always wall
  for (let y = 0; y < ROWS; y++) { if (map[y][0] !== 'T') map[y][0] = '#'; if (map[y][COLS - 1] !== 'T') map[y][COLS - 1] = '#'; }
  S.doors = buildDoors(map);   // doors.js: every doorway between two rooms starts sealed
  const scatter = [];                                                           // small decor from each room's theme
  rooms.forEach((r, i) => {
    if (r.void) return;
    const th = ROOM_THEMES[r.theme], ox = (i % N) * ROOM, oy = Math.floor(i / N) * ROOM;
    for (let y = oy; y < oy + ROOM; y++) for (let x = ox; x < ox + ROOM; x++)
      if (map[y][x] === '.' && Math.random() < th.density)
        scatter.push({ x, y, k: th.scatter[Math.floor(Math.random() * th.scatter.length)], v: Math.random() });
  });
  S.map = map; S.rooms = rooms; S.turrets = turrets; S.pedestals = pedestals;
  S.decor = scatter.concat(vignettes);                                          // vignettes are drawn on top
  S.keySpots = spots.filter(s => map[s.y][s.x] === '*');
}