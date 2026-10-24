# Ads folder

The fake ads are madlibs. Everything lives in `ads_data.js` (a plain script, so it works from file://).

## How an ad is built
1. `names` picks a template, e.g. `The {adj} {thing}`. Each `{word}` is replaced by a random entry of `parts.word`.
2. `{name}` always means the product name that was just made, so later lines can mention it.
3. `lines`, `reviews` and `fine` are picked the same way. They appear one after the other as the ad plays (tagline first, review a third of the way in, fine print at two thirds), so holding the fast-forward button skips them.
4. `images` are optional pictures shown above the product name.

## Add things
- New words: add them to a list inside `parts`.
- New word type: add `mything: ['a', 'b']` to `parts`, then write `{mything}` in any template.
- Pictures: put the file in this folder and add its file name to `images`. png, jpg and gif all load. A gif shows only its first frame for now (animation comes later).
- If this folder or file is missing, the game falls back to the short ad list in `config.js` (`ADS`).

## Template
const AD_DATA = {
  names:   ['{adj} {thing}'],
  lines:   ['Now with {feature}.'],
  reviews: ['"{quote}" - {reviewer}'],
  fine:    ['{disclaimer}'],
  images:  [],
  parts: {
    adj: [], thing: [], feature: [], quote: [], reviewer: [], disclaimer: [],
  },
};