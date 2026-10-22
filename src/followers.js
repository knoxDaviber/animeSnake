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
    passive: 'Each extra Miner in the chain shortens the mine cooldown.' },
  { id: 'raiden',  name: 'Raiden',  color: '#6bc5ff', skill: 'lightning',
    passive: 'Kills are worth +5 points.',
    idea: 'Lightning: every ~8 s strikes the nearest enemy head for 1 damage.' },
  { id: 'keysman', name: 'Keysman', color: '#ffd36b', skill: null,
    passive: 'Each Keysman: 30% chance that eating a key summons a second character.' },
  { id: 'magneto', name: 'Magneto', color: '#c78bff', skill: null,
    passive: 'Pulls food and keys within 3 tiles one tile closer to your head each tick.' },
  { id: 'medusa',  name: 'Medusa',  color: '#8dff6b', skill: 'gaze',
    passive: 'Enemies hit by your sword stay stunned 2 ticks longer.',
    idea: 'Gaze: every ~10 s freezes every enemy in the line ahead for 4 ticks.' },
].map(f => ({ ...f, sheet: dirSheet(`../assets/images/followers/${f.id}.png`) }));

function followerIndex(id) {
  const i = FOLLOWERS.findIndex(f => f.id === id);
  if (i < 0) throw new Error('Unknown follower: ' + id);
  return i;
}
function randomFollower() { return Math.floor(Math.random() * FOLLOWERS.length); }

// One slot in the chain. c = index into HEADS (slot 0) or FOLLOWERS (every other slot), fx/fy = facing,
// cd = ticks until this slot's active skill is ready again.
function newSlot(c, fx, fy) { return { c, fx, fy, cd: 0 }; }
