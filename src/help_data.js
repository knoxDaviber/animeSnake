// help_data.js: the text of the help page (help.js draws it). Plain data, so it is safe to edit.
// Style: vague posts. Everything is true, nothing is said plainly. Keep a line short (it wraps), and a page under about 12 lines.
//   title   the page name shown at the top
//   lines   each entry is one little post; long ones wrap
//   need    a hero id. Until that hero is unlocked the page shows "???" and the teaser lines instead
//   teaser  optional lines for the locked version (HELP_TEASER is used if missing)

const HELP_TEASER = [
  "a seat is empty. somebody could fill it.",
  "for a price, obviously.",
];
const HELP_TEASER_LORE = [
  "there is more to this story.",
  "it only opens for somebody who has met the right person.",
];

const HELP_PAGES = [
  // ---- the story ----
  { title: "Splendid Hills", lines: [
    "ok so this is a story about a place.",
    "the Kingdom of Splendid Hills. you could drop a weed there and come back to a flower.",
    "everybody loved them. they loved everybody. no enemies. none at all.",
    "(that last part did not last.)",
  ] },
  { title: "Something From Below", lines: [
    "it started with one. small. weak. hated the sun.",
    "so naturally they took care of it.",
    "it got big. like, really big. nobody minded. it was eating the other ones that kept showing up.",
    "what a nice solution to a problem. what could go wrong.",
    "the day it reached the castle they finally gave it a name. the Great Serpent. their own doing, but sure.",
    "and everything it had been keeping away came out all at once.",
  ] },
  { title: "The Circle", lines: [
    "a few brave people went down to see where they were coming from.",
    "they found a circle. glowing. old. not the natural kind.",
    "snakes do not come out of circles by themselves.",
    "nobody who went down was seen coming back up to explain.",
    "but some nights a beam goes up through the clouds, like something down there is picking a fight with the sky.",
    "people have a name for whoever is under there. the Hollow Wizard. that is all anyone really knows.",
  ] },
  { title: "Who Came Back", lines: [
    "friends from the neighbouring lands heard what happened.",
    "a swordsman. a gunman. a magician. they did not wait to be asked.",
    "and the people of the hills, the ones who stayed and did not run. they are the ones you keep bumping into on the way. hi.",
    "they know every inch of the land. they are here to take it back.",
  ] },

  // ---- heroes (a page shows up once that hero is unlocked) ----
  { title: "Swordsman", need: "swordsman", lines: [
    "people say his sword is nothing special.",
    "people are right.",
    "what they do not mention is the shield. the first head that hits him never lands. then it needs a moment to come back.",
    "and sometimes, just sometimes, it hits back. harder than the sword ever did.",
    "not naming names but going head first is a lifestyle.",
  ] },
  { title: "Magician", need: "magician", lines: [
    "walls are more of a suggestion for him. the really thick ones less so.",
    "he keeps a couple of waves in his pocket. they go off on their own when something gets close in front of him. then they need a while to come back.",
    "do not ask him to hurry them.",
  ] },
  { title: "Gunman", need: "gunman", lines: [
    "one forward. one to the left. one to the right.",
    "nothing behind. that is all i will say about his back.",
  ] },
  { title: "Goliath", need: "goliath", lines: [
    "nothing gets past his front. the back is another story.",
    "he does not make friends. keys turn into something else for him, and only so many of them.",
    "he likes to kick things. do not ask what. every few kicks somebody impressive shows up.",
    "slow. very slow. you will get used to it.",
  ] },
  { title: "Beneath the Castle", need: "goliath", teaser: HELP_TEASER_LORE, lines: [
    "under the castle there is an old pile of rubble the king used to guard.",
    "the last of the royal family was found down there. green. bleeding. the poison had gotten into him.",
    "he saw the rescue party. thanked them for coming. said it was too late for him. said the country was theirs now.",
    "then he did something, and there was a lot of blood on the green stone.",
    "the rubble moved. it got tall. something was carved into its chest.",
    "its eyes lit up and it started to walk, down into the dark. one last order from a king who did not live to see it through.",
  ] },
  { title: "Summoner", need: "summoner", lines: [
    "he is not good alone. he needs friends. he uses them up.",
    "what he calls back is a stronger version, and it only sticks around for a few seconds.",
    "the strange part is what each one leaves behind for the rest of the run.",
  ] },
  { title: "The Tower Keeper", need: "summoner", teaser: HELP_TEASER_LORE, lines: [
    "at the very end they thought they had the wizard cornered. he blinked away.",
    "then somebody else showed up with the same powers. the same face. the same everything.",
    "'not him,' he said. 'sort of. a copy. i kept his tower tidy.'",
    "the original went missing one day. he tracked him here, to the hills. something had gone wrong with him and he wants him back to normal.",
    "and the vial of blood? that is the question everybody asks.",
    "his magic needs the life of somebody who agrees. so he asked. kind of. he did not wait for the answer.",
    "someone fainted. someone woke up completely fine. and for a moment a ghost who moved with a lot more purpose fought on his behalf.",
    "the party let him join. reluctantly. it is still reluctant.",
  ] },

  // ---- how things work ----
  { title: "Snakes", lines: [
    "not all of them are the same. you will meet the quick thin ones first.",
    "then the armoured ones, the ones that run away, the ones that spit, and the ones that want to go off right next to you.",
    "the ones that go off keep an eye on bombs. yours too.",
    "the little runners are scared of you. they run until they have eaten enough to stop being scared.",
    "the longer a snake gets, the faster and tougher it gets.",
    "the really long ones take two of your friends at once and do not die when you hit them. they just come apart. what is left of them runs again.",
    "and when two heads meet, the longer chain wins the shove.",
  ] },
  { title: "The Big Ones", lines: [
    "every tenth wave something old comes back, and it brings company.",
    "the Great Serpent loves to eat. when it gets angry its body is not worth hitting. go for the face.",
    "the Hollow Wizard stands still, and then does not. there is a shimmering box around him. break it and he is a lot less impressive for a little while.",
    "at thirty, both at once. that is a bad time.",
    "they come back stronger every time. hopefully so do you.",
    "every fifth wave is a rush. a lot of snakes, all at once, from everywhere.",
  ] },
  { title: "Friends", lines: [
    "to make a friend you need a key first. then somebody has to walk in. do not forget the second part.",
    "Miner leaves mines behind you. watch your own tail.",
    "Raiden is fast and can set off a mine from far away, but only one he can actually see.",
    "Keysman says a key sometimes calls two people instead of one.",
    "Magneto pulls keys toward you. he also makes the snakes more interested in you.",
    "Gorgon hands out shields. one hit each. you get slower for it.",
  ] },
  { title: "Three of a Kind", lines: [
    "three of the same kind, anywhere in the chain, become somebody else entirely.",
    "you lose two bodies in the deal. what you get is worth more than both.",
    "Miners become a Bomber. Raidens, a Shogun. Keysmen, a Kingsman. Gorgons, a Medusa. and the Magnetos? ask Mr.X.",
    "the new ones tend to leave something behind for the rest of the run.",
    "Mr.X is picky. he only lets Magneto in. everybody else gets shot at your enemies.",
  ] },
  { title: "Treasure", lines: [
    "some people say there are chests hidden in the rooms. up to four. one near the start, the rest far away.",
    "a chest hands you a new way to hurt things. a fast stream. a bouncing shot. a burst around you. lightning. blades that spin out and back.",
    "you can only carry so many. a relic might change that.",
    "weapons and friends are not the same thing. both make you stronger. only one of them can die.",
  ] },
  { title: "Doors and Cracks", lines: [
    "at certain waves some doors start to glow. walk into one.",
    "some walls are cracked in the places where somebody needed a shortcut. a good bang breaks them fast. your own weapons need a few more tries.",
    "closed rooms are never empty. some lock behind you. some are very quiet. you will not know which until you look.",
    "the shape of the place is different every time. the story told by the bones is not.",
  ] },
  { title: "Little Things", lines: [
    "running into your own tail is not a hit. it is a pause.",
    "five kills in a row pays a few coins, once. the timer on the combo is short.",
    "when a run is over, every hundred points turns into a coin.",
    "the blocks that fall out of dead snakes give you a few seconds of something nice. pick them up.",
    "a revive is an ad. hold the button to make it go faster. you cannot skip it.",
    "pausing lets you quit, but it asks twice. there is also a volume slider in there.",
    "the shop sells peace of mind for your own mines.",
    "the third card on the pick screen costs a coin. a redraw costs more.",
  ] },
  { title: "Strange Ideas", lines: [
    "some people play without a weapon. snakes cannot hurt them and they cannot hurt back. you score for friends, merges and surviving.",
    "some people lose every friend in one hit and try to reach the twentieth wave anyway.",
    "some people hit twice as hard but fall in one. glass.",
    "those are in the shop. they all count on the leaderboard. in their own way.",
  ] },
];


// Shown as the LAST page of the help, only after the wave 30 victory (S.credits, set in updateFinale in waves.js).
const HELP_CREDITS = { title: "Credits", credits: true, lines: [
  "if you are reading this, you beat wave thirty. we are a little emotional.",
  "this game was made by Xiao xiao and Dun dun. i love my big brother. i forced him to say that.",
  "it is our first game together. we did not know what we were doing. we still kind of do not.",
  "the snakes are not real. the people are not real. the story is not real. the ads are real.",
  "thank you for playing. thank you for the revives you sat through. we are sorry about the ads. (we are not that sorry.)",
] };