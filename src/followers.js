// followers.js: the follower characters that make up the body of the chain. (Slot 0 of the chain is a head,
// see HEADS in sprites.js.) Each follower has a sheet, a fallback colour, an optional active skill and passives.
//
//   skill     key into SKILLS (skills.js), or null. Only 'mine' is wired up so far.
//   passive   what the follower will do just by being in the chain. in passives.js
//   idea      a planned active skill for followers that do not have one yet. Text only.
//
// Sheets live at assets/images/followers/<id>.png (128x128, same 4x4 layout as the heads).
const FOLLOWERS = [
  { id: 'miner',   name: 'Miner',   color: '#ffb36b', skill: 'mine',
    merge: 'bomber',
    passive: 'Each Miner adds +1 to the mine blast range. Drops a mine every 8 s (max 5 on the map).' },
  { id: 'raiden',  name: 'Raiden',  color: '#6bc5ff', skill: 'lightning',
    passive: 'Kills are worth +5 points.',
    idea: 'Lightning: every ~8 s strikes the nearest enemy head for 1 damage.' },
  { id: 'keysman', name: 'Keysman', color: '#ffd36b', skill: null,
    merge: 'kingsman',
    passive: 'Each Keysman: +10% chance (max 50%) that eating a key summons a second character.' },
  { id: 'magneto', name: 'Magneto', color: '#c78bff', skill: null,
    merge: 'mrx',
    passive: 'Pulls keys up to 4 tiles one tile closer each tick. Enemies chase you more.' },
  { id: 'medusa',  name: 'Medusa',  color: '#8dff6b', skill: 'gaze',
    passive: 'Enemies hit by your sword stay stunned 2 ticks longer.',
    idea: 'Gaze: every ~10 s freezes every enemy in the line ahead for 4 ticks.' },
  // Fusions: made by merge.js, never recruited directly (fusion: true keeps them out of randomFollower)
  { id: 'bomber',   name: 'Bomber',   color: '#ff8a3c', skill: 'bomb', fusion: true,
    passive: 'Mine blasts reach across the whole map in a + shape. Drops a mine every 5 s.' },
  { id: 'kingsman', name: 'Kingsman', color: '#ffe36b', skill: null, fusion: true,
    passive: 'Bounty: when every key is gone, the next drop is 1 to 3 keys. Keysman are 40% more likely to be summoned.' },
  { id: 'mrx',      name: 'Mr. X',    color: '#9a4bd6', skill: null, fusion: true,
    passive: 'Keys within 3x3 of your head are eaten. New recruits are rejected and shot at the nearest snake for 2-5 damage.' },
].map(f => ({ ...f, sheet: dirSheet(`../assets/images/followers/${f.id}.png`) }));

function followerIndex(id) {
  const i = FOLLOWERS.findIndex(f => f.id === id);
  if (i < 0) throw new Error('Unknown follower: ' + id);
  return i;
}
function randomFollower() { // never a fusion; a Kingsman makes Keysman more likely
  const w = FOLLOWERS.map(f => f.fusion ? 0 : (f.id === 'keysman' && countFollower('kingsman') > 0 ? 1 + KINGSMAN_SUMMON_BONUS : 1));
  let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < w.length; i++) if ((r -= w[i]) < 0) return i;
  return 0;
}

// One slot in the chain. c = index into HEADS (slot 0) or FOLLOWERS (every other slot), fx/fy = facing,
// cd = ticks until this slot's active skill is ready again.
function newSlot(c, fx, fy) { return { c, fx, fy, cd: 0 }; }
