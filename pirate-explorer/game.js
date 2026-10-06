(() => {
'use strict';
// ---- stage constants (logical 960x540) ----
const VW = 960, VH = 540;
const BG_H = 600, BG_YOFF = -60;          // the deck painting is drawn a little taller than the stage, top cropped
const BASE_H = 250;                       // drawn height of a grown-up at the front of the deck
const WALK = 130, HURRY = 230, STEP = 50; // px per second (a stroll is about two steps a second); px of travel per bob
const SAMPLE = 3, SPACING = 86;           // followers walk SPACING px apart along the leader's path
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Pirates with a `walk` sheet step through it while moving (side view, facing their direction) and face the viewer
// when they stop; the rest travel with a bob and sway. walk.cycle = px of road per full cycle at the front of the deck.
// size = height relative to a grown-up; face = [x, y, size] of the head as fractions of the portrait, for thumbnails.
const PIRATES = {
  ruby:        { name: 'Captain Ruby', img: 'ruby.png', size: 1, face: [.42, .1, .14],
                 walk: { img: 'ruby-walk.png', frames: 8, fw: 250, fh: 420, ax: 106, cycle: 110 },
                 // duel sheets (fight_cut.py): same px scale as the walk sheet, feet 4 px above the bottom
                 fight: { idle: { img: 'ruby-idle.png', fw: 333, fh: 379, ax: 158 },
                          advance: { img: 'ruby-advance.png', fw: 339, fh: 383, ax: 159 },
                          block: { img: 'ruby-block.png', fw: 374, fh: 447, ax: 201 },
                          strike: { img: 'ruby-strike.png', fw: 492, fh: 438, ax: 167 },
                          hurt: { img: 'ruby-hurt.png', fw: 403, fh: 386, ax: 136 },
                          defeat: { img: 'ruby-defeat.png', fw: 544, fh: 377, ax: 274 } } },
  cutlass:     { name: 'Captain Cutlass', img: 'cutlass.png', size: 1.02, face: [.46, .085, .13],
                 walk: { img: 'cutlass-walk.png', frames: 8, fw: 238, fh: 420, ax: 120, cycle: 110 },
                 fight: { idle: { img: 'cutlass-idle.png', fw: 329, fh: 378, ax: 159 },
                          advance: { img: 'cutlass-advance.png', fw: 305, fh: 379, ax: 145 },
                          block: { img: 'cutlass-block.png', fw: 369, fh: 355, ax: 181 },
                          strike: { img: 'cutlass-strike.png', fw: 522, fh: 457, ax: 183 },
                          hurt: { img: 'cutlass-hurt.png', fw: 395, fh: 350, ax: 144 },
                          defeat: { img: 'cutlass-defeat.png', fw: 394, fh: 304, ax: 249 } } },
  bones:       { name: 'Bones', img: 'bones.png', size: .84, face: [.5, .09, .14], station: [.2, 428], greet: 'Ahoy, Captain! I’ve swabbed this deck twice already.',
                 walk: { img: 'bones-walk.png', frames: 8, fw: 250, fh: 420, ax: 112, cycle: 125 } },
  absalom:     { name: 'Absalom', img: 'absalom.png', size: .94, face: [.5, .1, .14], station: [.3, 490], greet: 'Captain! The wind’s in our favour today.' },
  scarlett:    { name: 'Scarlett', img: 'scarlett.png', size: .96, face: [.48, .085, .14], station: [.44, 418], greet: 'Ahoy! Is it time to set sail?' },
  tempest:     { name: 'Tempest', img: 'tempest.png', portrait: [375, 0, 330, 1010], size: .94, face: [.35, .10, .14], station: [.5, 450], greet: 'Is the fog finally lifting, Captain?' },
  crispin:     { name: 'Crispin', img: 'crispin.png', size: 1, face: [.5, .075, .13], station: [.57, 478], greet: 'Captain, the hold’s stowed and secure.' },
  jade:        { name: 'Jade', img: 'jade.png', size: 1, face: [.5, .075, .13], station: [.69, 424], greet: 'Land ho, off the starboard side!',
                 walk: { img: 'jade-walk.png', frames: 8, fw: 246, fh: 420, ax: 129, cycle: 132 } },
  monsoon:     { name: 'Monsoon', img: 'monsoon.png', size: 1, face: [.5, .085, .13], station: [.8, 454], greet: 'The cannon’s polished and ready, Captain.',
                 walk: { img: 'monsoon-walk.png', frames: 7, fw: 277, fh: 420, ax: 138, cycle: 138 } },
  stormcaller: { name: 'Stormcaller', img: 'stormcaller.png', size: 1, face: [.5, .075, .13], station: [.93, 482], greet: 'Clear skies ahead. Not a storm in sight.',
                 walk: { img: 'stormcaller-walk.png', frames: 8, fw: 246, fh: 420, ax: 108, cycle: 133 } },
  marietta:    { name: 'Marietta', img: 'marietta.png', size: .97, face: [.5, .085, .14], station: [.27, 445, 'below'],
                 walk: { img: 'marietta-walk.png', frames: 8, fw: 254, fh: 420, ax: 120, cycle: 127 }, greet: 'Ahoy, Captain! I’ve been counting barrels down here all morning. Take me up top?' },
  arabella:    { name: 'Arabella', img: 'arabella.png', size: .96, face: [.455, .09, .14], station: [.1, 470], greet: 'I can see three islands from the crow’s nest, Captain! Shall I keep watch?' },
  odessa:      { name: 'Odessa', img: 'odessa.png', size: .97, face: [.45, .093, .14], station: [.22, 470, 'dining'], greet: 'There’s bread in the oven and stew on the stove, Captain. Nobody goes hungry on this ship.' },
  hazel:       { name: 'Hazel', img: 'hazel.png', size: .8, face: [.5, .093, .15], station: [.35, 500, 'hall'], greet: 'Captain! Can I climb the rigging today? I’ll hold on with both hands, I promise.' },
  oro:         { name: 'Oro', img: 'oro.png', size: 1, face: [.5, .085, .13], station: [.55, 470], greet: 'Took you long enough, big sister. Am I on the crew or not?',
                 walk: { img: 'oro-walk.png', frames: 8, fw: 258, fh: 420, ax: 129, cycle: 145 } },
  // the villain: you can find him and talk to him, but he will never join
  clement:     { name: 'Clement “Goldtooth”', img: 'clement.png', size: 1.03, face: [.5, .09, .13], station: [.55, 505, 'study'], villain: true,
                 taunts: ['Well, well. Captain Ruby’s little crew.', 'Lovely maps. I’ll be borrowing them.', 'Join you? I’d sooner kiss a jellyfish.', 'This ship will be mine. Enjoy it while it lasts.', 'Run along now. The grown-ups are plotting.'],
                 walk: { img: 'clement-walk.png', frames: 8, fw: 264, fh: 420, ax: 132, cycle: 150 } },
};
const CAPTAINS = ['ruby', 'cutlass'];
const CREW = ['bones', 'absalom', 'scarlett', 'crispin', 'jade', 'monsoon', 'stormcaller', 'marietta', 'oro', 'tempest', 'arabella', 'odessa', 'hazel'];
const VILLAINS = ['clement'];
const JOIN_LINES = ['Aye aye, Captain!', 'Right behind you, Captain!', 'Ready to sail, Captain!', 'At your command!'];
// Places on the ship. Each has its own floor depth (yBack..yFront), things to notice (spots, by fraction of
// the width), doors you step through with Space (x fraction -> room `to`, arriving at fraction `at`), and
// optionally an edge you can walk off (`right`/`left`) into a neighbouring room. `scale` sizes people to the
// room's furniture (indoor paintings are drawn much closer than the deck).
const ROOMS = {
  deck: { name: 'The Ship’s Deck', img: 'ship-deck.jpg', yBack: 402, yFront: 530, outside: true,
    doors: [{ x: .06, to: 'dining', at: .5, label: 'Into the captain’s quarters' }, { x: .17, to: 'upper', at: .32, label: 'Up to the upper deck' }, { x: .62, to: 'below', at: .5, label: 'Down the hatch, below decks' }],
    spots: [
  [.06, 'The captain’s cabin, tucked under the quarterdeck.'],
  [.33, 'The mainmast, wrapped in coils of rope.'],
  [.5, 'Green islands on the horizon, and open sea all around.'],
  [.84, 'A cannon, with a crate of cannonballs ready.'],
  [.95, 'A rope ladder climbs up into the rigging.'],
    ] },
  // The upper deck is a wider, higher view: people are smaller, walk on the deck between two traced edges
  // (source-image px), and the front railing (`rail`, a line in source px) is drawn over them.
  upper: { name: 'The Upper Deck', img: 'ship-upper.jpg', outside: true, scale: 1.15, yBack: 270, yFront: 360,
    floorBack: [[520, 352], [1000, 388], [1700, 395]], floorFront: [[520, 374], [700, 394], [1000, 428], [1436, 452], [1446, 520], [1680, 520]],   // just behind the railing top, so feet stay on visible boards
    rail: [[0, 292], [300, 350], [700, 398], [1000, 433], [1438, 458], [1446, 545], [1688, 545], [1696, 362], [1900, 300], [2172, 225]],
    doors: [{ x: .3, to: 'deck', at: .17, label: 'Down to the main deck' }],
    spots: [[.36, 'The ship’s wheel, and the bell that rings the watches.'], [.45, 'The mizzenmast, wrapped in rope and pulley blocks.'],
            [.52, 'A grating over the hold. You can hear the crew below.'], [.62, 'Sea chests and barrels, lashed down for rough weather.'],
            [.73, 'The bow. Nothing ahead but islands and open sea.']] },
  below: { name: 'Below Decks', img: 'ship-below.jpg', yBack: 440, yFront: 530, scale: 1.4,
    doors: [{ x: .5, to: 'deck', at: .62, label: 'Up the stairs to the deck' },
            // the two hallways run back between the pillars either side of the stairs
            { x: .35, to: 'hallLeft', at: .06, label: 'Down the hall' }, { x: .64, to: 'hall', at: .06, label: 'Down the hall' }],
    spots: [[.08, 'A crew cabin with a proper bed. Someone left the door open.'], [.24, 'Barrels of fresh water, roped down for rough seas.'],
            [.38, 'The corridor runs the length of the ship, lit by brass lanterns.'], [.62, 'A rug with a compass rose, worn thin down the middle.'],
            [.75, 'A sea chest outside a cabin door, waiting to be carried in.'], [.92, 'Another crew cabin, with a blue blanket and a porthole.']] },
  hall: { name: 'The Cabin Hall', img: 'ship-hall.jpg', yBack: 470, yFront: 530, scale: 1.15,
    doors: [{ x: .04, to: 'below', at: .64, label: 'Back to the stairs' }],   // halls run left to right; the way back is where you came in
    spots: [[.08, 'A barrel and a coil of rope, left by whoever had the last watch.'], [.25, 'An open cabin. The bed’s made, for once.'],
            [.45, 'A cargo net hung on the wall, and a sea chest with a lamp on it.'], [.6, 'A tiny cabin with a writing desk and a porthole.'],
            [.72, 'A map of the islands, with somebody’s initials scratched in the corner.'], [.84, 'Another cabin, with a blue blanket on the bunk.'],
            [.96, 'The hall ends at a cabin door with an anchor on it.']] },
  hallLeft: { name: 'The Compass Hall', img: 'ship-hall-left.jpg', yBack: 470, yFront: 530, scale: 1.15,
    doors: [{ x: .04, to: 'below', at: .35, label: 'Back to the stairs' }],
    spots: [[.06, 'A cabin with shelves of books and a porthole.'], [.2, 'A little table with a globe and a pair of brass dividers.'],
            [.33, 'An open cabin, the bed made up with a blue blanket.'], [.46, 'Barrels, a coil of rope and a cargo net, ready for the next port.'],
            [.62, 'A cabin with a writing desk. Someone’s halfway through a letter.'], [.76, 'A chart of the islands above an old sea chest.'],
            [.92, 'The last cabin, with a sash hanging on the door.']] },
  dining: { name: 'The Dining Salon', img: 'ship-dining.jpg', yBack: 430, yFront: 530, scale: 1.45,
    doors: [{ x: .08, to: 'bedroom', at: .9, label: 'Into the bedroom' }, { x: .87, to: 'study', at: .12, label: 'Into the study' }],
    spots: [[.25, 'A dresser full of the good china, for when the captains have guests.'], [.5, 'A compass rose is set into the floor, right under the chandelier.'],
            [.66, 'Stern windows look out over the islands.'], [.78, 'Two crossed swords hang above the door.']] },
  bedroom: { name: 'The Captain’s Bedroom', img: 'ship-bedroom.jpg', yBack: 470, yFront: 530, scale: 1.6,
    doors: [{ x: .09, to: 'deck', at: .06, label: 'Up the stairs to the deck' }],
    right: { to: 'dining', at: .12 },
    spots: [[.35, 'A four-poster bed with heavy curtains, for nights in a storm.'], [.58, 'An old sea chest at the foot of the bed. It’s locked.'],
            [.7, 'A window seat piled with cushions, looking out to sea.'], [.92, 'A worn leather armchair by the porthole.']] },
  study: { name: 'The Captain’s Study', img: 'ship-study.jpg', yBack: 480, yFront: 530, scale: 1.65,
    doors: [{ x: .1, to: 'dining', at: .87, label: 'Back to the dining salon' }],
    spots: [[.28, 'A big chart of the islands, with routes marked in ink.'], [.5, 'The captain’s desk, buried in maps and a brass sextant.'],
            [.68, 'Tall windows behind the desk. You can see the rigging outside.'], [.9, 'A model ship on the bookshelf. Someone built it by hand.']] },
};

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const $ = id => document.getElementById(id);
let K = 1;
function resize() {
  const r = canvas.getBoundingClientRect();
  if (!r.width) return;
  K = Math.min(2.5, (r.width / VW) * (window.devicePixelRatio || 1));
  canvas.width = Math.round(VW * K);
  canvas.height = Math.round(VH * K);
}
new ResizeObserver(resize).observe(canvas);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const scaleAt = y => { const R = ROOMS[room].floorBack ? ROOMS[room] : ROOMS.deck; return lerp(.72, 1, (y - R.yBack) / (R.yFront - R.yBack)); };
// traced floor edges and railings are in source-image px; convert to world px once the image is loaded
const toWorld = (R, pts) => pts.map(([x, y]) => [x * BG_H / R.img_.height, y * BG_H / R.img_.height + BG_YOFF]);
function lineY(pts, x) {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0); }
  return pts[pts.length - 1][1];
}
function keepOnFloor(R, s) {
  if (!R.fb) { s.y = clamp(s.y, R.yBack, R.yFront); return; }
  s.x = clamp(s.x, R.fb[0][0], R.fb[R.fb.length - 1][0]);
  s.y = clamp(s.y, lineY(R.fb, s.x), lineY(R.ff, s.x));
}

// ---- state ----
let worldW = 1800, camX = 0, t = 0;
let room = 'deck', fade = 0, fadeDir = 0, pending = null, doorNear = null;
let lead = 'ruby';
let mode = null, storyStep = 0, storyReady = false, dialogueIndex = 0, tourStop = -1;
const STORY_CREW = ['scarlett', 'tempest', 'marietta', 'arabella', 'odessa'];   // Ruby's crew in the story; the boys sail with Cutlass
// The stranded ship's deck is a thin strip low in its painting, so the painting is drawn 1.6x (`zoom`, top
// cropped by `yoff`) to bring the boards down to where people stand.
ROOMS.rival = { name: 'The Stranded Ship · Broken Deck', img: 'story-broken-deck.png', zoom: 1.6, yoff: -231, yBack: 444, yFront: 520, outside: true, doors: [], spots: [[.5, 'Bootsteps echo on the mysterious ship.']] };

ROOMS.rivalCabin = { name: 'The Stranger’s Cabin', img: 'story-cabin.png', yBack: 450, yFront: 510, scale: 1.3, doors: [], spots: [] };
let distantShip, swordDuel = null, duelFinished = false, duelWon = false, duelHome = 0;   // duelHome: where Ruby stands as each duel opens
let sceneT = 0, storyTilt = 0, shakeT = 0, slideFrom = {};   // story staging: time in scene, deck lean, cannon jolt, slide start x
const CHAPTER = window.SOULMATES_CHAPTER;

const joined = [];                         // crew keys, in the order they came aboard
const st = {};                             // per pirate: x, y, phase, moving, lean, say, sayT
let trail = [];
let near = null, captionText = '', gulls = [];
const keys = { left: false, right: false, up: false, down: false, hurry: false };

const roomScale = () => mode === 'story' && room === 'upper' ? .85 : ROOMS[room].scale || 1;
const gap = () => SPACING * roomScale();      // followers keep a bigger gap when people are drawn bigger
function party() {
  if (mode === 'story') return CHAPTER[storyStep].party || (storyStep < 3 ? ['ruby', 'marietta'] : ['ruby']);
  return [lead, ...CAPTAINS.filter(k => k !== lead && st[k]?.room !== 'hidden'), ...joined]; }

// ---- trail the followers walk along ----
function pushTrail(x, y) {
  let last = trail[trail.length - 1];
  let d = Math.hypot(x - last.x, y - last.y);
  while (d >= SAMPLE) {
    const k = SAMPLE / d;
    last = { x: last.x + (x - last.x) * k, y: last.y + (y - last.y) * k };
    trail.push(last); d -= SAMPLE;
  }
  if (trail.length > 3000) trail.splice(0, trail.length - 3000);
}

// ---- controls ----
function faceStyle(key, size) {
  const p = PIRATES[key], img = p.img_, s = size / (p.face[2] * img.height);
  return `background-image:url('${p.img}');background-size:${img.width * s}px ${img.height * s}px;background-position:${-(p.face[0] * img.width * s - size / 2)}px ${-(p.face[1] * img.height * s - size / 2)}px`;
}
function buildControls() {
  CAPTAINS.forEach((key, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'leader'; b.dataset.key = key;
    b.innerHTML = `<span class="face" style="${faceStyle(key, 44)}"></span><span>${PIRATES[key].name}</span><kbd>${i + 1}</kbd>`;
    b.addEventListener('click', () => setLead(key));
    $('leaders').appendChild(b);
  });
  CREW.forEach(key => {
    const li = document.createElement('li'); li.id = 'roster-' + key;
    li.innerHTML = `<span class="face" style="${faceStyle(key, 32)}"></span><span>${PIRATES[key].name}</span>`;
    $('roster').appendChild(li);
  });
  $('crewTotal').textContent = CREW.length;
  updateControls();
}
function updateControls() {
  document.querySelectorAll('.leader').forEach(b => b.setAttribute('aria-pressed', b.dataset.key === lead ? 'true' : 'false'));
  CREW.forEach(k => $('roster-' + k).classList.toggle('aboard', joined.includes(k)));
  $('crewCount').textContent = joined.length;
  $('crewPill').classList.toggle('full', joined.length === CREW.length);
}
function setLead(key) {
  if (!mode || $('modeDialog').open || mode === 'story' || key === lead) return;
  // the other captain steps to the front where the leader was standing
  const a = st[lead], b = st[key];
  [a.x, b.x] = [b.x, a.x]; [a.y, b.y] = [b.y, a.y];
  lead = key;
  updateControls();
}
function action() {
  if (!mode || $('modeDialog').open) return;
  if (swordDuel) { if (!duelFinished) swordDuel.act('parry'); else if (duelWon) enterStoryStep(storyStep + 1); return; }
  if (mode === 'story') {
    if (dialogueIndex < storyLines().length - 1) { dialogueIndex++; showStory(); return; }
    const scene = CHAPTER[storyStep];
    if (scene.button && (storyReady || scene.walk === undefined)) enterStoryStep(storyStep + 1);
    return;
  }
  if (near) return invite();
  if (doorNear) travel(doorNear.to, doorNear.at);
}
function travel(to, at) {
  if (fadeDir) return;
  pending = { to, at }; fadeDir = 1;
}
function arrive({ to, at }) {
  room = to; const R = ROOMS[room]; worldW = R.w;
  const dir = at > .5 ? -1 : 1, y = (R.yBack + R.yFront) / 2 + 20;
  const room4 = 70 + Math.min(party().length - 1, 2) * gap();          // leave space behind the leader for followers
  const x = dir > 0 ? clamp(at * worldW, room4, worldW - 70) : clamp(at * worldW, 70, worldW - room4);
  party().forEach((k, i) => { const s = st[k]; s.room = room; s.x = clamp(x - dir * i * gap(), 40, worldW - 40); s.y = y; s.facing = dir; s.moving = false; keepOnFloor(R, s); });
  trail = []; for (let d = (party().length) * gap() + 6; d >= 0; d -= SAMPLE) trail.push({ x: x - dir * d, y });
  camX = clamp(x - VW / 2, 0, worldW - VW);
  $('placeName').textContent = R.name; caption('');
}
function invite() {
  if (!near) return;
  if (PIRATES[near].villain) {               // he answers, but never joins
    const v = PIRATES[near], s = st[near];
    s.taunt = ((s.taunt ?? 0) + 1) % v.taunts.length; s.say = v.taunts[s.taunt]; s.sayT = 2.6;
    return;
  }
  const key = near; near = null;
  joined.push(key);
  const s = st[key];
  s.say = JOIN_LINES[(joined.length - 1) % JOIN_LINES.length].replace('Captain!', `Captain ${PIRATES[lead].name.replace('Captain ', '')}!`);
  s.sayT = 2;
  updateControls();
  if (joined.length === CREW.length) caption('All hands on deck! The whole crew is aboard.', 5);
}

let captionHold = 0;
function caption(text, hold = 0) {
  if (hold) captionHold = hold; else if (captionHold > 0) return;
  if (text === captionText) return; captionText = text;
  const el = $('caption');
  if (text) { el.textContent = text; el.classList.add('on'); } else el.classList.remove('on');
}

const KEYMAP = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down' };
addEventListener('keydown', e => {
  if (!mode || $('modeDialog').open) return;
  if (swordDuel && duelFinished) {   // after a win, Space carries the story on
    if (e.key === ' ' && !e.repeat && !e.target.closest?.('button,input')) { e.preventDefault(); action(); }
    return;
  }
  if (swordDuel) {
    const move = { f: 'strike', F: 'strike', q: 'parry', Q: 'parry', e: 'dodge', E: 'dodge', ' ': 'parry' }[e.key];
    if (move && !e.repeat && !e.target.closest?.('button,input')) { e.preventDefault(); swordDuel.act(move); }
    return;
  }
  const onButton = e.target.closest && e.target.closest('button,input');
  if (KEYMAP[e.key]) { keys[KEYMAP[e.key]] = true; e.preventDefault(); return; }
  if (e.key === 'Shift') { keys.hurry = true; return; }
  if (e.key === '1' || e.key === '2') { setLead(CAPTAINS[+e.key - 1]); return; }
  if ((e.key === ' ' || e.key === 'e' || e.key === 'E') && !onButton) { e.preventDefault(); action(); }
});
addEventListener('keyup', e => { if (KEYMAP[e.key]) keys[KEYMAP[e.key]] = false; if (e.key === 'Shift') keys.hurry = false; });
addEventListener('blur', () => { Object.keys(keys).forEach(k => keys[k] = false); });
function hold(id, k) {
  const el = $(id);
  el.addEventListener('pointerdown', e => { e.preventDefault(); el.setPointerCapture?.(e.pointerId); el.classList.add('held'); keys[k] = true; });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => el.addEventListener(ev, () => { el.classList.remove('held'); keys[k] = false; }));
}
hold('tLeft', 'left'); hold('tRight', 'right'); hold('tUp', 'up'); hold('tDown', 'down');
$('tInvite').addEventListener('click', action);

// ---- update ----
function update(dt) {
  t += dt;
  if (!mode || $('modeDialog').open) return;
  if (swordDuel) { swordDuel.update(dt); return; }
  captionHold = Math.max(0, captionHold - dt);
  if (mode === 'story') updateScene(dt);
  if (fadeDir) {
    fade = clamp(fade + fadeDir * dt / .3, 0, 1);
    if (fadeDir === 1 && fade === 1) { arrive(pending); pending = null; fadeDir = -1; }
    else if (fadeDir === -1 && fade === 0) fadeDir = 0;
  }
  const L = st[lead], RM = ROOMS[room];
  let dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0), dy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
  if (fadeDir === 1 || (mode === 'story' && storyStep === 0)) dx = dy = 0;
  const sp = (keys.hurry ? HURRY : WALK) * roomScale();
  if (dx || dy) {
    const n = Math.hypot(dx, dy);
    const nx = clamp(L.x + dx / n * sp * dt, 60, worldW - 60), ny = clamp(L.y + dy / n * sp * .55 * dt, RM.yBack, RM.yFront);
    if (dx > 0 && RM.right && L.x >= worldW - 62) travel(RM.right.to, RM.right.at);
    if (dx < 0 && RM.left && L.x <= 62) travel(RM.left.to, RM.left.at);
    const moved = Math.hypot(nx - L.x, ny - L.y);
    L.moving = moved > .01; L.phase += moved; L.lean = lerp(L.lean, dx, Math.min(1, dt * 8)); if (dx) L.facing = dx;
    L.x = nx; L.y = ny; keepOnFloor(RM, L);
    pushTrail(L.x, L.y);
  } else { L.moving = false; L.lean = lerp(L.lean, 0, Math.min(1, dt * 6)); }

  // followers walk toward their spot on the trail
  party().slice(1).forEach((key, i) => {
    const s = st[key];
    if (mode === 'story' && room === 'upper' && !L.moving) { s.moving = false; return; }
    const p = trail[Math.max(0, trail.length - 1 - Math.round((i + 1) * gap() / SAMPLE))];
    const ddx = p.x - s.x, ddy = p.y - s.y, d = Math.hypot(ddx, ddy);
    const step = Math.min(d, (d > 160 ? HURRY * 1.3 : sp * 1.05) * dt);
    s.moving = step > .05;
    if (s.moving) { s.x += ddx / d * step; s.y += ddy / d * step; s.phase += step; if (Math.abs(ddx) > 1) s.facing = Math.sign(ddx); }
    keepOnFloor(RM, s);
    s.lean = lerp(s.lean, s.moving ? clamp(ddx / (d || 1), -1, 1) : 0, Math.min(1, dt * 6));
  });

  Object.values(st).forEach(s => { if (s.sayT > 0) s.sayT -= dt; });

  const target = clamp(L.x - VW / 2, 0, worldW - VW);
  camX += (target - camX) * Math.min(1, dt * (reduceMotion ? 20 : 4));

  // who's nearby
  near = null; let best = 1e9;
  (mode === 'story' ? [] : [...CREW, ...VILLAINS]).forEach(k => {
    if (joined.includes(k) || st[k].room !== room) return;
    const s = st[k], ddx = Math.abs(s.x - L.x), ddy = Math.abs(s.y - L.y);
    if (ddx < 120 * roomScale() && ddy < 70 && ddx + ddy < best) { best = ddx + ddy; near = k; }   // reach grows with how big people are drawn
  });
  if (mode === 'story' && !storyReady && CHAPTER[storyStep].walk !== undefined) {
    const scene = CHAPTER[storyStep];
    if (scene.direction === 'left' ? L.x <= worldW * scene.walk : L.x >= worldW * scene.walk) {
      storyReady = true;
      if (scene.auto) { enterStoryStep(storyStep + 1); return; }
      showStory();
    }
  }
  doorNear = null;
  (mode === 'story' ? [] : RM.doors || []).forEach(d => { if (Math.abs(L.x - d.x * worldW) < 110) doorNear = d; });
  let spot = '', bestD = 130;
  RM.spots.forEach(([fx, text]) => { const d = Math.abs(L.x - fx * worldW); if (d < bestD) { bestD = d; spot = text; } });
  // in the story, place notes only while walking somewhere; otherwise they'd sit over the scene being played
  if (mode === 'story' && (CHAPTER[storyStep].walk === undefined || storyReady)) spot = '';
  caption(near || doorNear || fadeDir ? '' : spot);
  $('tInvite').textContent = mode === 'story' ? (CHAPTER[storyStep].button ? (storyReady || CHAPTER[storyStep].walk === undefined ? 'Continue' : 'Explore') : 'The end') : near ? (PIRATES[near].villain ? 'Talk' : 'Invite') : doorNear ? 'Go in' : 'Invite';

  // gulls wheeling over the water
  if (!reduceMotion && RM.outside) {
    while (gulls.length < 4) gulls.push({ x: camX * .3 + Math.random() * VW, y: 60 + Math.random() * 120, vx: 18 + Math.random() * 22, ph: Math.random() * 7 });
    gulls.forEach(g => { g.x += g.vx * dt; if (g.x - camX * .3 > VW + 40) g.dead = true; });
    gulls = gulls.filter(g => !g.dead);
  }
}

// ---- drawing ----
function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function wrap(text, max) {
  const out = []; let line = '';
  text.split(' ').forEach(w => { const tryL = line ? line + ' ' + w : w; if (ctx.measureText(tryL).width > max && line) { out.push(line); line = w; } else line = tryL; });
  if (line) out.push(line); return out;
}
function bubble(x, y, lines, name, hint) {
  ctx.font = '18px "IM Fell English", Georgia, serif';
  const all = lines.flatMap(l => wrap(l, 290));
  const w = Math.min(330, Math.max(...all.map(l => ctx.measureText(l).width)) + 30);
  const h = 16 + all.length * 22 + (hint ? 22 : 0), bx = clamp(x - w / 2, 10, VW - w - 10), by = Math.max(46, y - h - 18);
  const tip = clamp(x, bx + 18, bx + w - 18);
  ctx.fillStyle = 'rgba(0,0,0,.2)'; roundRect(bx + 2, by + 4, w, h, 12); ctx.fill();
  ctx.fillStyle = '#fff8ea'; roundRect(bx, by, w, h, 12); ctx.fill();
  ctx.beginPath(); ctx.moveTo(tip - 9, by + h - 1); ctx.lineTo(tip, by + h + 12); ctx.lineTo(tip + 9, by + h - 1); ctx.fill();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#3a2816'; all.forEach((l, i) => ctx.fillText(l, bx + w / 2, by + 19 + i * 22));
  if (hint) { ctx.font = '700 13px "Alegreya Sans", sans-serif'; ctx.fillStyle = '#9b7230'; ctx.fillText(hint, bx + w / 2, by + h - 15); }
  ctx.font = '700 12px "Alegreya Sans", sans-serif'; ctx.fillStyle = '#fff8ea';
  ctx.strokeStyle = 'rgba(40,25,10,.75)'; ctx.lineWidth = 3; ctx.strokeText(name.toUpperCase(), bx + w / 2, by - 9); ctx.fillText(name.toUpperCase(), bx + w / 2, by - 9);
}
function doorSign(x, label) {
  const hint = matchMedia('(pointer: coarse)').matches ? 'tap Go in' : 'press Space';
  ctx.font = '22px "Pirata One", Georgia, serif';
  const w = Math.max(ctx.measureText(label).width, 90) + 34, bx = clamp(x - w / 2, 10, VW - w - 10), by = 64, bob = reduceMotion ? 0 : Math.sin(t * 3) * 3;
  ctx.fillStyle = 'rgba(0,0,0,.25)'; roundRect(bx + 2, by + 4 + bob, w, 54, 8); ctx.fill();
  ctx.fillStyle = '#f3e6cc'; roundRect(bx, by + bob, w, 54, 8); ctx.fill();
  ctx.strokeStyle = '#9b7230'; ctx.lineWidth = 2; roundRect(bx + 3, by + 3 + bob, w - 6, 48, 6); ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#3a2816';
  ctx.fillText('▲ ' + label, bx + w / 2, by + 20 + bob);
  ctx.font = '700 12px "Alegreya Sans", sans-serif'; ctx.fillStyle = '#9b7230'; ctx.fillText(hint.toUpperCase(), bx + w / 2, by + 41 + bob);
}
function drawPirate(key) {
  const p = PIRATES[key], s = st[key], img = p.img_;
  const k = scaleAt(s.y) * p.size * roomScale(), h = BASE_H * k, x = s.x - camX;
  if (x < -300 || x > VW + 300) return;
  const pose = p.fight && (swordDuel ? swordDuel.pose(key) : scenePose(key));
  if (pose) {
    // duel pose, drawn at the same scale as the walk sheet; dx steps back from whoever they face
    const f = p.fight[pose.anim], u = h / (p.walk.fh - 4), px = x + pose.dx * k * s.facing;
    ctx.fillStyle = 'rgba(40,25,10,.28)';
    ctx.beginPath(); ctx.ellipse(px, s.y, Math.min(f.fw * u * .3, 70 * k), 7 * k, 0, 0, 7); ctx.fill();
    ctx.save(); ctx.translate(px, s.y); if (s.facing < 0) ctx.scale(-1, 1);
    ctx.drawImage(f.img_, pose.frame * f.fw, 0, f.fw, f.fh, -f.ax * u, -(f.fh - 4) * u, f.fw * u, f.fh * u);
    ctx.restore();
    s.headY = s.y - h;
    return;
  }
  if (p.walk && s.moving) {
    // side-view walk cycle, mirrored when heading left
    const wk = p.walk, wh = h * wk.fh / (wk.fh - 4), ww = wk.fw * wh / wk.fh;
    const frame = Math.floor(s.phase / (wk.cycle * k / wk.frames)) % wk.frames;
    ctx.fillStyle = 'rgba(40,25,10,.28)';
    ctx.beginPath(); ctx.ellipse(x, s.y, ww * .3, 7 * k, 0, 0, 7); ctx.fill();
    ctx.save(); ctx.translate(x, s.y); if (s.facing < 0) ctx.scale(-1, 1);
    ctx.drawImage(p.walkImg, frame * wk.fw, 0, wk.fw, wk.fh, -wk.ax * wh / wk.fh, -wh + 4 * wh / wk.fh, ww, wh);
    ctx.restore();
    s.headY = s.y - h;
    return;
  }
  const source = p.portrait || [0, 0, img.width, img.height];
  const w = source[2] * h / source[3];
  const bob = s.moving ? Math.abs(Math.sin(s.phase / STEP * Math.PI)) * 7 * k : 0;
  const sway = s.moving ? Math.sin(s.phase / STEP * Math.PI) * .035 + s.lean * .035 : (reduceMotion ? 0 : Math.sin(t * 1.4 + s.x) * .006);
  ctx.fillStyle = `rgba(40,25,10,${.28 - bob * .01})`;
  ctx.beginPath(); ctx.ellipse(x, s.y, w * .34, 7 * k, 0, 0, 7); ctx.fill();
  ctx.save(); ctx.translate(x, s.y - bob); ctx.rotate(sway); ctx.drawImage(img, ...source, -w / 2, -h, w, h); ctx.restore();
  s.headY = s.y - h - bob;
}

function storyViewRoom() {
  // Cut to the main deck for Scarlett and Tempest without moving Ruby from the helm.
  return mode === 'story' && storyStep === 0 ? 'deck' : room;
}
function render() {
  const savedView = { room, worldW, camX };
  const view = storyViewRoom();
  if (view !== room) {
    room = view; worldW = ROOMS[view].w;
    camX = clamp((st.scarlett.x + st.tempest.x) / 2 - VW / 2, 0, worldW - VW);
  }
  ctx.setTransform(K, 0, 0, K, 0, 0);
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#7fb3d9'; ctx.fillRect(0, 0, VW, VH);
  // the whole ship rolls gently on the swell
  ctx.save();
  if (mode === 'story' && (storyTilt || shakeT > 0)) {   // the deck lurches (scaled up so no corner shows)
    ctx.translate(VW / 2, VH * .8); ctx.rotate(storyTilt); ctx.scale(1 + Math.abs(storyTilt) * 1.8, 1 + Math.abs(storyTilt) * 1.8); ctx.translate(-VW / 2, -VH * .8);
    if (shakeT > 0 && !reduceMotion) ctx.translate((Math.random() - .5) * 16 * shakeT, (Math.random() - .5) * 10 * shakeT);
  }
  if (!reduceMotion) {
    ctx.translate(VW / 2, VH); ctx.rotate(Math.sin(t * .55) * .007); ctx.scale(1.03, 1.03);
    ctx.translate(-VW / 2, -VH + Math.sin(t * .55 + 1) * 2.5);
  }
  const R0 = ROOMS[room]; ctx.drawImage(R0.img_, -camX, R0.yoff ?? BG_YOFF, worldW, BG_H * (R0.zoom || 1));
  if (mode === 'story' && room === 'upper' && storyStep === 2) {
    // far off on the water between the shrouds; the keel is cut at the waterline so the hull sits in the sea
    const w = 130, h = w * distantShip.height / distantShip.width, keep = .9, bob = reduceMotion ? 0 : Math.sin(t * .8) * 1.5;
    ctx.drawImage(distantShip, 0, 0, distantShip.width, distantShip.height * keep, 1340 - camX - w / 2, 152 - h * keep + bob, w, h * keep);
  }
  if (mode === 'story' && room === 'rivalCabin' && storyStep < 9) {
    ctx.fillStyle = 'rgba(4,10,20,.52)'; ctx.fillRect(0, 0, VW, VH);
  }
  if (mode === 'story' && ['deck', 'upper'].includes(room) && storyStep <= 3) {
    const mist = ctx.createLinearGradient(0, 0, 0, 390);
    mist.addColorStop(0, 'rgba(190,205,213,.48)'); mist.addColorStop(1, 'rgba(190,205,213,.08)');
    ctx.fillStyle = mist; ctx.fillRect(0, 0, VW, VH);
  }
  if (ROOMS[room].outside) gulls.forEach(g => {
    const x = g.x - camX * .3, f = Math.sin(t * 7 + g.ph) * 4, y = g.y + Math.sin(t * .8 + g.ph) * 6;
    ctx.strokeStyle = 'rgba(250,250,250,.85)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - 9, y - f); ctx.quadraticCurveTo(x - 4, y - 4, x, y); ctx.quadraticCurveTo(x + 4, y - 4, x + 9, y - f); ctx.stroke();
  });

  // everyone in this room, back to front
  const everyone = [...CAPTAINS, ...CREW, ...VILLAINS].filter(k => st[k].room === room).sort((a, b) => st[a].y - st[b].y);
  everyone.forEach(drawPirate);
  if (swordDuel) swordDuel.render(ctx, camX);
  const RR = ROOMS[room];
  if (RR.railW) {   // the front railing passes in front of everyone standing on the deck
    ctx.save(); ctx.beginPath(); ctx.moveTo(RR.railW[0][0] - camX, VH + 80);
    RR.railW.forEach(([x, y]) => ctx.lineTo(x - camX, y)); ctx.lineTo(RR.railW[RR.railW.length - 1][0] - camX, VH + 80); ctx.closePath(); ctx.clip();
    ctx.drawImage(RR.img_, -camX, BG_YOFF, worldW, BG_H); ctx.restore();
  }

  // speech
  if (near && !(st[near].sayT > 0)) {
    const v = PIRATES[near], touch = matchMedia('(pointer: coarse)').matches;
    if (v.villain) bubble(st[near].x - camX, st[near].headY, [v.taunts[st[near].taunt ?? 0]], v.name, touch ? 'Tap Talk to answer him' : 'Press Space to talk back');
    else bubble(st[near].x - camX, st[near].headY, [v.greet], v.name, touch ? 'Tap Invite to bring them aboard' : 'Press Space to invite aboard');
  }
  everyone.forEach(k => { const s = st[k]; if (s.sayT > 0) bubble(s.x - camX, s.headY, [s.say], PIRATES[k].name); });
  if (doorNear && !near && !fadeDir) doorSign(doorNear.x * worldW - camX, doorNear.label);
  ctx.restore();
  room = savedView.room; worldW = savedView.worldW; camX = savedView.camX;
  positionStorySpeech();
  if (fade > 0) { ctx.fillStyle = `rgba(20,12,6,${fade})`; ctx.fillRect(0, 0, VW, VH); }
}

// ---- adventure modes ----
const modeDialog = $('modeDialog');
modeDialog.addEventListener('cancel', e => e.preventDefault());
modeDialog.showModal();
$('changeMode').addEventListener('click', () => {
  Object.keys(keys).forEach(k => keys[k] = false);
  modeDialog.showModal();
});
function resetAdventure(nextMode, startAt = 0) {
  swordDuel = null; duelFinished = false; $('duelHud').hidden = true; $('touch').hidden = false;
  sceneT = storyTilt = shakeT = 0;
  mode = nextMode; lead = 'ruby'; joined.length = 0; storyStep = 0; storyReady = false; dialogueIndex = 0;
  tourStop = -1; fade = fadeDir = 0; pending = near = doorNear = null; captionHold = 0;
  Object.keys(keys).forEach(k => keys[k] = false);
  CAPTAINS.forEach(k => { st[k].room = 'deck'; st[k].sayT = 0; });
  [...CREW, ...VILLAINS].forEach(k => {
    const [fx, y, rm = 'deck'] = PIRATES[k].station;
    Object.assign(st[k], { room: rm, x: fx * ROOMS[rm].w, y, sayT: 0, moving: false });
  });
  if (mode === 'story') {
    st.cutlass.room = 'hidden';
    [...CREW, ...VILLAINS].filter(k => !STORY_CREW.includes(k)).forEach(k => st[k].room = 'hidden');
    joined.push(...STORY_CREW);
    st.arabella.room = 'hidden';   // up in the crow’s nest until the crew gathers to board
  }
  arrive({ to: mode === 'story' ? 'upper' : 'deck', at: .36 });
  if (mode === 'story') {
    st.marietta.x = st.ruby.x + 100; keepOnFloor(ROOMS.upper, st.marietta);
    joined.splice(0, joined.length, ...STORY_CREW);
  }
  updateControls();
  document.querySelector('[data-key="cutlass"]').disabled = mode === 'story';
  document.querySelector('.controls').hidden = mode === 'story';
  document.querySelector('.legend').hidden = mode === 'story';
  $('storySpeech').hidden = mode !== 'story';
  $('storyPanel').hidden = mode !== 'story'; $('freePanel').hidden = mode !== 'free';
  $('modeLabel').textContent = mode === 'story' ? `Story mode · Chapter ${chapterAt(startAt)}` : 'Free exploration';
  $('tourText').textContent = 'Explore at your own pace, or let Ruby show you around.';
  $('tourNext').textContent = 'Start the ship tour';
  modeDialog.close();
  if (mode === 'story') { if (startAt) enterStoryStep(startAt); else showStory(); }
}
const CHAPTER_TWO = CHAPTER.findIndex(sc => sc.chapter === 'Two');
const chapterAt = step => CHAPTER.slice(0, step + 1).reverse().find(sc => sc.chapter).chapter;
$('chooseStory').addEventListener('click', () => resetAdventure('story'));
$('chooseChapterTwo').addEventListener('click', () => resetAdventure('story', CHAPTER_TWO));
$('chooseFree').addEventListener('click', () => resetAdventure('free'));
function storyButton(label, fn) {
  const b = document.createElement('button'); b.type = 'button'; b.textContent = label;
  b.addEventListener('click', fn); $('storyActions').appendChild(b);
}
function enterStoryStep(next) {
  storyStep = next; dialogueIndex = 0;
  const scene = CHAPTER[storyStep];
  storyReady = scene.walk === undefined;
  near = doorNear = null;
  Object.keys(keys).forEach(k => keys[k] = false);
  if (swordDuel) { swordDuel = null; $('duelHud').hidden = true; $('touch').hidden = false; }
  if (scene.room) {
    // someone joining the walk shows up in the new place with Ruby
    party().forEach(k => { if (st[k].room === 'hidden') st[k].room = room; });
    arrive({ to: scene.room, at: scene.at });
  }
  sceneT = 0; shakeT = scene.shake ? .7 : 0;
  Object.entries(scene.cast || {}).forEach(([k, v]) => {
    if (!v) { st[k].room = 'hidden'; return; }
    const [fx, y, facing] = v;
    Object.assign(st[k], { room, x: fx * worldW, y: y ?? st[k].y, facing: facing ?? st[k].facing, moving: false, sayT: 0 });
    keepOnFloor(ROOMS[room], st[k]);
  });
  if (scene.cast?.ruby) { const L = st.ruby; trail = []; for (let d = party().length * gap() + 6; d >= 0; d -= SAMPLE) trail.push({ x: L.x - L.facing * d, y: L.y }); }
  slideFrom = Object.fromEntries(Object.keys(scene.slide || {}).map(k => [k, st[k].x]));
  $('modeLabel').textContent = `Story mode · Chapter ${chapterAt(storyStep)}`;
  if (storyStep === 3) {
    STORY_CREW.forEach((key, i) => Object.assign(st[key], { room: 'deck', x: st.ruby.x + 100 + i * 70, y: 470 + i * 8, moving: false }));
  }
  if (scene.reveal) Object.assign(st.cutlass, { room: 'rivalCabin', x: st.ruby.x + 160, y: st.ruby.y });
  showStory();
  if (scene.duel) { duelHome = st.ruby.x; startStoryDuel(); }
}
// Story staging that plays out over a scene: the deck's lean, slides, and people walking in or off.
function updateScene(dt) {
  const scene = CHAPTER[storyStep];
  sceneT += dt; shakeT = Math.max(0, shakeT - dt);
  storyTilt = lerp(storyTilt, scene.tilt || 0, Math.min(1, dt * (scene.tilt ? 3 : 1.5)));
  const ease = p => p * p * (3 - 2 * p);
  Object.entries(scene.slide || {}).forEach(([k, fx]) => {
    const p = Math.min(1, sceneT / 1.4);
    st[k].x = lerp(slideFrom[k], fx * worldW, ease(p));
  });
  const lastLine = dialogueIndex >= storyLines().length - 1;
  Object.entries(scene.walkTo || {}).forEach(([k, [fx, hide, afterTalk]]) => {
    const s = st[k];
    if (s.room !== room || (afterTalk && !lastLine)) { if (s.room === room) s.moving = false; return; }
    const d = fx * worldW - s.x, step = Math.min(Math.abs(d), WALK * roomScale() * dt);
    s.moving = step > .05;
    if (s.moving) { s.x += Math.sign(d) * step; s.phase += step; s.facing = Math.sign(d); }
    else if (hide) s.room = 'hidden';
  });
}
// a held duel pose from the scene: [sheet, frame], [sheet, from, to] played once, or ['idle'] breathing
function scenePose(key) {
  if (mode !== 'story' || st[key].moving) return null;
  const p = CHAPTER[storyStep].poses?.[key];
  if (!p) return null;
  const [anim, a, b] = p;
  if (a === undefined) return { anim, frame: [0, 1, 2, 3, 2, 1][Math.floor(sceneT * 5) % 6], dx: 0 };
  return { anim, frame: b === undefined ? a : Math.min(b, a + Math.floor(sceneT * 4)), dx: 0 };
}
function startStoryDuel() {
  duelFinished = duelWon = false; $('storySpeech').hidden = true; $('duelHud').hidden = false; $('touch').hidden = true;
  const dir = st.ruby.facing || 1, scene = CHAPTER[storyStep];
  st.ruby.x = duelHome;
  Object.assign(st.cutlass, { room, x: st.ruby.x + 300 * dir, y: st.ruby.y, moving: false, facing: -dir });
  st.ruby.moving = false;   // they close in to sword's reach as the duel opens
  $('rivalLabel').textContent = 'The stranger';
  camX = clamp((st.ruby.x + st.cutlass.x) / 2 - VW / 2, 0, worldW - VW);
  $('storyActions').replaceChildren();
  for (const [label, move] of [['Strike · F', 'strike'], ['Parry · Q / Space', 'parry'], ['Dodge · E', 'dodge']]) {
    storyButton(label, () => swordDuel.act(move));
  }
  $('storyGoal').textContent = 'Parry or dodge just before his strike. Attack during his recovery. Buttons work on touch screens too.';
  swordDuel = window.createSwordDuel({ ruby: st.ruby, cutlass: st.cutlass, rivalName: 'the stranger', rivalFalls: false,
    onChange: ({ health, rivalHealth, message }) => {
      $('rubyHealth').textContent = health; $('cutlassHealth').textContent = rivalHealth;
      $('storyText').textContent = message;
    },
    onFinish: won => {
      duelFinished = true; duelWon = won; $('storyActions').replaceChildren();
      $('storyTitle').textContent = won ? 'Ruby staggers him!' : 'The stranger wins this round';
      $('storyText').textContent = won ? scene.duelWin : 'The stranger gets past Ruby’s guard. Regroup and try the duel again.';
      $('storyGoal').textContent = won ? '' : 'Watch his windup. Defend late, then strike while he recovers.';
      if (won) storyButton(scene.button, () => enterStoryStep(storyStep + 1));
      else { storyButton('Try again', startStoryDuel); storyButton('Free exploration', () => resetAdventure('free')); }
    }
  });
}

function storyLines() {
  return (CHAPTER[storyStep].dialogue || '').split('\n').filter(Boolean).map(line => {
    const colon = line.indexOf(':');
    return { speaker: line.slice(0, colon), text: line.slice(colon + 1).trim() };
  });
}
function positionStorySpeech() {
  if (mode !== 'story' || $('storySpeech').hidden) return;
  const line = storyLines()[dialogueIndex];
  const key = { Ruby: 'ruby', 'Ruby (thinking)': 'ruby', Marietta: 'marietta', Scarlett: 'scarlett', Tempest: 'tempest', Arabella: 'arabella', Odessa: 'odessa',
                'The stranger': 'cutlass', Cutlass: 'cutlass', Jade: 'jade', Bones: 'bones' }[line?.speaker];
  const speaker = st[key];
  const view = storyViewRoom();
  const viewCamera = view === room ? camX : clamp((st.scarlett.x + st.tempest.x) / 2 - VW / 2, 0, ROOMS[view].w - VW);
  const heads = Object.values(st).filter(s => s.room === view && s.x - viewCamera > -100 && s.x - viewCamera < VW + 100);
  // Keep the entire bubble above the tallest visible character, including the ship's sway.
  const bottom = Math.max(30, Math.min(...heads.map(s => s.headY || s.y - 250)) - 18);
  const x = clamp((speaker?.room === view ? speaker.x - viewCamera : VW / 2), 300, VW - 300);
  const el = $('storySpeech');
  el.style.left = `${x / VW * 100}%`;
  el.style.top = `${bottom / VH * 100}%`;
  el.style.maxHeight = `${Math.max(12, bottom - 8) / VH * 100}%`;
  $('speechLocation').textContent = speaker && ROOMS[speaker.room]
    ? (speaker.room === view ? ROOMS[view].name : `From ${ROOMS[speaker.room].name.toLowerCase()}`)
    : '';
}
$('speechNext').addEventListener('click', action);

function showStory() {
  const scene = CHAPTER[storyStep];
  $('storyTitle').textContent = scene.title;
  $('storyText').textContent = scene.text;
  const lines = storyLines(), line = lines[dialogueIndex];
  $('storySpeech').hidden = !line || mode !== 'story';
  $('speechSpeaker').textContent = line?.speaker || '';
  $('speechText').textContent = line?.text || '';
  $('speechNext').textContent = dialogueIndex < lines.length - 1 ? 'Next line →' : (scene.button ? 'Continue →' : 'End of chapter');
  $('speechNext').disabled = dialogueIndex >= lines.length - 1 && (!scene.button || (!storyReady && scene.walk !== undefined));
  $('storyDialogue').textContent = '';
  positionStorySpeech();
  $('storyGoal').textContent = scene.goal || '';
  $('storyActions').replaceChildren();
  if (dialogueIndex < lines.length - 1) {
    storyButton('Next line →', action);
  } else if (scene.button && (storyReady || scene.walk === undefined)) {
    storyButton(scene.button, action);
  }
  if (scene.ending && dialogueIndex >= lines.length - 1) $('storyGoal').textContent = scene.ending;
  if (storyStep === CHAPTER.length - 1) {
    storyButton('Read Chapter Two again', () => resetAdventure('story', CHAPTER_TWO));
    storyButton('Start from Chapter One', () => resetAdventure('story'));
    storyButton('Free exploration', () => resetAdventure('free'));
  }
}
const TOUR = ['deck', 'upper', 'below', 'hall', 'hallLeft', 'bedroom', 'dining', 'study'];
$('tourNext').addEventListener('click', () => {
  if (fadeDir) return;
  tourStop = (tourStop + 1) % TOUR.length;
  const to = TOUR[tourStop]; travel(to, .5);
  $('tourText').textContent = `Tour stop ${tourStop + 1} / ${TOUR.length}: ${ROOMS[to].name}. ${ROOMS[to].spots[0][1]}`;
  $('tourNext').textContent = tourStop === TOUR.length - 1 ? 'Take the tour again' : 'Next tour stop';
});

// ---- loop ----
let last = 0;
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000 || 0); last = now;
  update(dt); render();
  requestAnimationFrame(frame);
}
function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Could not load ' + src)); i.src = src; }); }

(async () => {
  resize();
  try { await Promise.race([document.fonts.load('18px "IM Fell English"'), new Promise(r => setTimeout(r, 1500))]); } catch (e) {}
  await Promise.all([...Object.values(ROOMS).map(async r => { r.img_ = await loadImg(r.img); r.w = r.img_.width * BG_H * (r.zoom || 1) / r.img_.height; if (r.floorBack) { r.fb = toWorld(r, r.floorBack); r.ff = toWorld(r, r.floorFront); r.railW = toWorld(r, r.rail); } }), ...Object.values(PIRATES).map(async p => { p.img_ = await loadImg(p.img); if (p.walk) p.walkImg = await loadImg(p.walk.img); if (p.fight) await Promise.all(Object.values(p.fight).map(async f => { f.img_ = await loadImg(f.img); })); })]);
  distantShip = await loadImg('distant-ship.png');
  worldW = ROOMS.deck.w;
  CAPTAINS.forEach((k, i) => { st[k] = { room: 'deck', x: 260 - i * SPACING, y: 500, phase: 0, moving: false, lean: 0, facing: 1, sayT: 0 }; });
  (mode === 'story' ? [] : [...CREW, ...VILLAINS]).forEach(k => { const [fx, y, rm = 'deck'] = PIRATES[k].station; st[k] = { room: rm, x: fx * ROOMS[rm].w, y, phase: 0, moving: false, lean: 0, facing: 1, sayT: 0 }; });
  trail = [];
  for (let x = 260 - SPACING - 6; x <= 260; x += SAMPLE) trail.push({ x, y: 500 });
  buildControls();
  $('chooseStory').disabled = $('chooseChapterTwo').disabled = $('chooseFree').disabled = false;
  $('loadingStatus').textContent = 'The ship is ready. Choose your adventure.';
  requestAnimationFrame(now => { last = now; requestAnimationFrame(frame); });
})().catch(error => {
  $('loadingStatus').textContent = 'The ship could not load. Please reload to try again.';
  console.error(error);
});
})();
