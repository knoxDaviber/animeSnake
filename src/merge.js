// merge.js: three identical followers ANYWHERE in the chain (no need to sit side by side) fuse into ONE new follower.
// A base follower names its fusion with merge: '<id>' in followers.js. The fusion takes the slot of the first of the
// three, the other two vanish, and the last two tiles of the chain go with them. Fusions cannot merge again.

function mergeCheck() { // called once per tick (step in main.js)
  const seen = {};
  for (let i = 1; i < S.roster.length; i++) {
    const c = S.roster[i].c;
    if (!FOLLOWERS[c].merge) continue;
    (seen[c] = seen[c] || []).push(i);
    if (seen[c].length === 3) { mergeAt(seen[c]); return; }
  }
}
function mergeAt(idx) { // idx = the three slot numbers, lowest first
  const first = idx[0], fusionC = followerIndex(FOLLOWERS[S.roster[first].c].merge);
  const at = S.snake[first];
  S.popups.push({ x: at.x, y: at.y, text: FOLLOWERS[fusionC].name + '!', age: 0 });
  playSfx('merge');
  const gone = [S.roster.splice(idx[2], 1)[0], S.roster.splice(idx[1], 1)[0]]; // highest first so the numbers stay valid
  gone.forEach(r => {                              // their fade-out is drawn on the last two tiles of the chain
    const t = S.snake.pop(); S.prev.pop();
    dropFx(t.x, t.y, (px, py) => drawSegment(r, px, py, false));
  });
  S.roster[first].c = fusionC;
  S.roster[first].cd = 0;
}