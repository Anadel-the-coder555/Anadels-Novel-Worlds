const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const nodes = [], draws = [];
const handlers = {};
let savedGown = '3';
const drawing = new Proxy({ drawImage: (...args) => draws.push(args),
  createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }) }, { get: (o, k) => o[k] || (() => {}) });
function element(id) {
  const node = { id, dataset: {}, style: {}, classList: { add() {}, remove() {}, toggle() {} },
    querySelector: () => element(''), close() {}, showModal() {},
    setAttribute(k, v) { this[k] = v; }, addEventListener(k, f) { this[k] = f; },
    appendChild() {}, focus() {}, getBoundingClientRect: () => ({ width: 960 }), getContext: () => drawing };
  nodes.push(node); return node;
}
const get = id => nodes.find(n => n.id === id) || element(id);
const opened = [];
let gamesOpen = false;
const scenes = { has: () => true, start(key, options) { opened.push({ key, options }); gamesOpen = true; return true; }, active: () => gamesOpen, update() {}, render() {} };
const sandbox = { Math, Number, String, Promise, Error, URLSearchParams, location: { search: '' }, setTimeout() {}, setInterval() {}, clearInterval() {},
  Audio: class { play() { return Promise.resolve(); } pause() {} },
  matchMedia: () => ({ matches: false }), ResizeObserver: class { observe() {} },
  document: { getElementById: get, createElement: () => element(''), body: element('body'),
    querySelectorAll: q => q === '#places .place' ? nodes.filter(n => n.dataset.place !== undefined) : [],
    fonts: { load: async () => {} } }, window: { devicePixelRatio: 1, EmberScenes: scenes },
  localStorage: { getItem: () => savedGown, setItem: (_, value) => savedGown = value },
  Image: class { set src(v) { this.source = v; this.width = 2172; this.height = 724; this.onload(); } },
  addEventListener: (name, handler) => handlers[name] = handler, requestAnimationFrame() {},
};
let source = fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8');
source = source.replace(/\}\)\(\);\s*$/, `globalThis.testGame = { enterPlace, walkOff, useDoor, update, render, drawWalker, pickGown,
  openMap, PLACES, LANDS, VILLA, state: () => ({ place, leaderX, worldW, door, gown, dressing, picnic }), startPicnic, toggleFood, closePicnic }; })();`);
vm.runInNewContext(source, sandbox);
setImmediate(() => {
  const g = sandbox.testGame;
  function settle() { for (let i = 0; i < 30; i++) g.update(.04); }
  g.enterPlace(1, .82); g.update(0);
  assert.equal(g.state().door[1], 7, 'village door wins over nearby scenery captions');
  assert.equal(get('doorLabel').textContent, 'Visit Lavender Village');
  g.useDoor(); settle(); assert.equal(g.state().place, 7);
  assert.equal(get('placeName').textContent, 'Lavender Village');
  assert.equal(get('placeNum').textContent, 'in the village');
  assert.equal(g.state().gown, 3, 'selected gown survives travel');
  assert.equal(g.state().door[1], 1, 'return door is reachable on arrival');
  const villageButton = nodes.find(n => Number(n.dataset.place) === 7);
  assert.equal(villageButton['aria-current'], 'true');
  g.render(); assert(draws.some(d => d[0].source === 'lavender-village.jpg'));
  g.drawWalker(0, 0); assert.equal(draws.at(-1)[0].source, 'walk-gold.png');
  g.useDoor(); settle(); assert.equal(g.state().place, 1);
  assert.equal(g.state().leaderX, g.state().worldW * .82);
  g.enterPlace(7, .5); g.walkOff('left'); settle(); assert.equal(g.state().place, 1);
  g.enterPlace(7, .5); g.walkOff('right'); settle(); assert.equal(g.state().place, 17);
  g.render(); assert(draws.some(d => d[0].source === 'lavender-village-inn.jpg'));
  g.walkOff('left'); settle(); assert.equal(g.state().place, 7);
  villageButton.click(); settle(); assert.equal(g.state().place, 7);
  g.enterPlace(2, 'left'); g.walkOff('right'); settle();
  assert.equal(g.state().place, 0, 'countryside loop remains three places');
  g.enterPlace(6, .57); g.update(0); g.useDoor(); settle();
  assert.equal(g.state().dressing, true, 'Rose Bedroom mirror still opens wardrobe');
  assert(get('gown-6').innerHTML.includes('gown-blush.png'), 'seventh gown card uses the new portrait');
  handlers.keydown({ key: '7', target: {}, preventDefault() {} });
  assert.equal(g.state().gown, 6); assert.equal(get('gownName').textContent, 'Blush Rose');
  assert.equal(savedGown, '6', 'new gown selection persists');
  g.render(); assert(draws.some(d => d[0].source === 'gown-blush.png'));
  get('dressDone').click(); settle();
  for (const place of [0, 1, 2, 6, 7]) {
    g.enterPlace(place, .57); g.update(.04); g.drawWalker(0, 0);
    assert.equal(draws.at(-1)[0].source, 'walk-blush.png');
    assert.equal(draws.at(-1)[3], 287); assert.equal(draws.at(-1)[4], 357);
  }
  console.log('Passed village entry/return doors, both exit edges, place selection, market rendering, retained gown, countryside loop and wardrobe access.');
  console.log('Passed Blush Rose portrait, seventh-gown shortcut, saved selection and matching walking sheet across countryside, bedroom and village.');
  g.enterPlace(0, .86); g.update(0);
  assert.equal(g.state().door[1], 8); g.useDoor(); settle();
  assert.equal(g.state().place, 8); assert.equal(get('placeNum').textContent, 'inside the castle');
  g.render(); assert(draws.some(d => d[0].source === 'castle-hall.jpg'));
  g.walkOff('left'); settle(); assert.equal(g.state().place, 9, 'ballroom is left of hall');
  g.render(); assert(draws.some(d => d[0].source === 'castle-ballroom.jpg'));
  assert.equal(g.state().gown, 6); g.drawWalker(0, 0);
  assert.equal(draws.at(-1)[0].source, 'walk-blush.png');
  g.walkOff('right'); settle(); assert.equal(g.state().place, 8, 'hall is right of ballroom');
  g.enterPlace(8, .1); g.update(0); g.useDoor(); settle(); assert.equal(g.state().place, 9);
  g.update(0); g.useDoor(); settle(); assert.equal(g.state().place, 8);
  g.enterPlace(8, .8); g.update(0); g.useDoor(); settle(); assert.equal(g.state().place, 0);
  for (const index of [8, 9]) {
    nodes.find(n => Number(n.dataset.place) === index).click(); settle(); assert.equal(g.state().place, index);
  }
  console.log('Passed castle entrance/exit, ballroom on the left, hall on the right, archway doors, both images, gown retention and place shortcuts.');
  function doorAt(place, position, destination) {
    g.enterPlace(place, position); g.update(0);
    assert.equal(g.state().door[1], destination);
    g.useDoor(); settle(); assert.equal(g.state().place, destination);
  }
  doorAt(8, .5, 10); assert.equal(get('placeNum').textContent, 'upstairs in the castle');
  g.render(); assert(draws.some(d => d[0].source === 'castle-landing.jpg'));
  doorAt(10, .15, 11); doorAt(11, .12, 13);
  assert.equal(get('placeName').textContent, 'Light-Green Bedroom');
  g.render(); assert(draws.some(d => d[0].source === 'castle-bedroom-light.jpg'));
  g.drawWalker(0, 0); assert.equal(draws.at(-1)[0].source, 'walk-blush.png');
  doorAt(13, .08, 11); doorAt(11, .865, 10);
  doorAt(10, .85, 12); doorAt(12, .7, 14);
  assert.equal(get('placeName').textContent, 'Dark-Green Bedroom');
  g.render(); assert(draws.some(d => d[0].source === 'castle-bedroom-dark.jpg'));
  doorAt(14, .9, 12); doorAt(12, .875, 10); doorAt(10, .5, 8);
  for (const [place, side, destination] of [[10, 'left', 11], [11, 'right', 10], [10, 'right', 12], [12, 'left', 10]]) {
    g.enterPlace(place, .5); g.walkOff(side); settle(); assert.equal(g.state().place, destination);
  }
  doorAt(12, .12, 18);
  assert.equal(get('placeName').textContent, 'Castle Library');
  g.render(); assert(draws.some(d => d[0].source === 'castle-library.jpg'));
  doorAt(18, .79, 12);
  assert.equal(g.state().leaderX, g.state().worldW * .12);
  doorAt(12, .365, 18); doorAt(18, .79, 12);
  console.log('Passed grand staircase, both upstairs wings, bedroom entry/return, landing descent, corridor edges, room art and retained gown.');
  doorAt(11, .7, 15);
  assert.equal(get('placeName').textContent, 'Royal Children’s Playroom');
  g.render(); assert(draws.some(d => d[0].source === 'castle-playroom.jpg'));
  g.drawWalker(0, 0); assert.equal(draws.at(-1)[0].source, 'walk-blush.png');
  doorAt(15, .08, 13); doorAt(13, .9, 15); doorAt(15, .7, 11);
  for (const [place, side, destination] of [[13, 'right', 15], [15, 'left', 13]]) {
    g.enterPlace(place, .5); g.walkOff(side); settle(); assert.equal(g.state().place, destination);
  }
  console.log('Passed nursery/playroom artwork, adjacency to light-green bedroom, connecting doors, left-corridor access, return routes and retained gown.');
  doorAt(15, .94, 16); assert.equal(get('placeName').textContent, 'Pink Bedroom');
  g.render(); assert(draws.some(d => d[0].source === 'castle-bedroom-pink.jpg'));
  g.drawWalker(0, 0); assert.equal(draws.at(-1)[0].source, 'walk-blush.png');
  doorAt(16, .08, 15);
  g.walkOff('right'); settle(); assert.equal(g.state().place, 16);
  g.walkOff('left'); settle(); assert.equal(g.state().place, 15);
  doorAt(11, .365, 16); doorAt(16, .7, 11);
  console.log('Passed pink bedroom to the right of playroom, doors, edge travel, room artwork and retained gown.');
  doorAt(7, .96, 17); doorAt(17, .03, 7);
  assert.equal(g.state().gown, 6);
  for (const [place, position, name, image] of [[3, .34, 'Evelynn', 'evelynn.png'], [18, .63, 'Hendrix', 'hendrix.png']]) {
    g.enterPlace(place, position); g.update(0);
    assert.equal(get('talkBtn').hidden, false);
    assert.equal(get('talkLabel').textContent, `Talk to ${name}`);
    g.render(); assert(draws.some(d => d[0].source === image));
    const event = { key: 'e', target: {}, preventDefault() {} };
    handlers.keydown(event);
    const firstLine = get('speech').textContent;
    assert(firstLine.startsWith(`${name}:`));
    get('talkBtn').click(); assert.notEqual(get('speech').textContent, firstLine);
    handlers.keydown({ ...event, repeat: true });
    g.enterPlace(place, .98); g.update(0);
    assert.equal(get('talkBtn').hidden, true);
    handlers.keydown(event); assert.notEqual(get('speech').textContent, firstLine);
    g.enterPlace(0, .5); assert.equal(get('talkBtn').hidden, true);
  }
  console.log('Passed both resident sprites, nearby talk buttons, keyboard/click dialogue and departure.');
  console.log('Passed second village scene, walking right to Inn Street, walking left to the square, both street doors and retained gown.');

  // games: each play door opens its hub, keys are paused while it's open, and the party stays put
  const playDoors = [[0, .64, 'garden'], [1, .22, 'horses'], [1, .55, 'festival'], [2, .58, 'treehouse'], [3, .18, 'kitchen'],
    [7, .1, 'carpenter'], [7, .44, 'stage'], [7, .63, 'dress'], [7, .88, 'haberdashery'], [17, .11, 'shoes'], [17, .26, 'toys'], [17, .42, 'books'],
    [8, .3, 'royal-kitchen'], [9, .5, 'royal-event'], [g.VILLA, .86, 'boating'], [32, .78, 'villa-animals'], [27, .36, 'villa-dance'], [26, .68, 'villa-piano']];
  for (const [place, position, key] of playDoors) {
    gamesOpen = false;
    g.enterPlace(place, position); g.update(0);
    assert.equal(g.state().door?.[1], 'play', `play door at ${g.PLACES[place].name} ${position}`);
    assert.equal(g.state().door[2], key);
    g.useDoor(); settle();
    assert.equal(opened.at(-1).key, key); assert.equal(g.state().place, place, 'opening a game does not travel');
    const before = g.state().leaderX;
    handlers.keydown({ key: 'ArrowRight', target: {}, preventDefault() {} }); g.update(.2);
    assert.equal(g.state().leaderX, before, 'walking keys are paused while a game is open');
    handlers.keyup({ key: 'ArrowRight' });
  }
  gamesOpen = false;
  const hubs = new Set(playDoors.map(d => d[2]));
  const sceneSource = fs.readFileSync(path.join(__dirname, 'scenes.js'), 'utf8');
  for (const key of hubs) assert(new RegExp(`['\\s]${key}'?: \\{ title`).test(sceneSource), `hub ${key} exists in scenes.js`);
  const cast = opened.at(-1).options.cast;
  assert.equal(cast.length, 4, 'the whole party joins the game'); assert.equal(cast[0].name, 'Ember'); assert.equal(cast[0].sheet.img, 'walk-blush.png');
  console.log(`Passed ${playDoors.length} game doors across Celedonia and Byzantine, opening ${hubs.size} hubs without moving the party.`);

  const byz = g.LANDS.find(l => l.key === 'byzantine');
  assert.deepEqual([...byz.to], [g.VILLA, .85], 'Byzantine can be visited from the atlas');
  g.enterPlace(g.VILLA, .85); assert.equal(get('placeName').textContent, 'Byzantine · Lakeside Villa');
  assert.equal(get('placeNum').textContent, 'in Byzantine');
  g.render(); assert(draws.some(d => d[0].source === 'byzantine-villa.jpg'));
  doorAt(g.VILLA, .775, 0);
  nodes.find(n => Number(n.dataset.place) === g.VILLA).click(); settle(); assert.equal(g.state().place, g.VILLA);
  doorAt(g.VILLA, .945, 30); assert.equal(get('placeName').textContent, 'Byzantine · Villa Terrace');
  doorAt(30, .955, g.VILLA);
  console.log('Passed the photographed lakeside villa and terrace, the atlas link, place button and the boat home.');
  // the photographed villa interior, entered from the terrace
  doorAt(30, .9, 23); assert.equal(get('placeName').textContent, 'Byzantine · Villa Foyer'); assert.equal(get('placeNum').textContent, 'inside the villa');
  g.render(); assert(draws.some(d => d[0].source === 'byzantine-foyer.jpg'));
  doorAt(23, .58, 24); doorAt(24, .49, 26); doorAt(26, .05, 24); doorAt(24, .87, 28); doorAt(28, .04, 24);
  g.enterPlace(24, .5); g.walkOff('right'); settle(); assert.equal(g.state().place, 25);
  g.walkOff('right'); settle(); assert.equal(get('placeName').textContent, 'Byzantine · Ballroom');
  doorAt(27, .5, 29); doorAt(29, .5, 27);
  g.walkOff('left'); settle(); assert.equal(g.state().place, 25);
  g.walkOff('left'); settle(); assert.equal(g.state().place, 24);
  g.walkOff('left'); settle(); assert.equal(g.state().place, 23);
  doorAt(23, .45, 30);
  ['byzantine-foyer.jpg', 'byzantine-hall-doors.jpg', 'byzantine-hall-windows.jpg', 'byzantine-library.jpg', 'byzantine-ballroom.jpg', 'byzantine-dining.jpg', 'byzantine-balcony.jpg']
    .forEach((img, k) => { g.enterPlace(23 + k, .5); g.render(); assert(draws.some(d => d[0].source === img), img); });
  console.log('Passed the villa interior: foyer, both hallways, library, dining room, ballroom and balcony, and back out.');
  // the gardens behind the villa: the rose garden by the lake, then the animal garden to its right
  doorAt(30, .845, 31); assert.equal(get('placeName').textContent, 'Byzantine · Villa Gardens'); assert.equal(get('placeNum').textContent, 'behind the villa');
  g.render(); assert(draws.some(d => d[0].source === 'byzantine-garden.jpg'));
  g.walkOff('right'); settle(); assert.equal(get('placeName').textContent, 'Byzantine · Animal Garden');
  g.render(); assert(draws.some(d => d[0].source === 'byzantine-animal-garden.jpg'));
  g.walkOff('left'); settle(); assert.equal(g.state().place, 31);
  doorAt(31, .5, 30);
  console.log('Passed the villa gardens and the animal garden behind the terrace, and back.');
  // picnics are laid out in the scene itself, not in the games window
  [[0, .35], [1, .4], [2, .3], [31, .22]].forEach(([i, x]) => {
    g.enterPlace(i, x); g.update(0);
    assert.equal(g.state().door[1], 'picnic', `picnic spot in ${g.PLACES[i].name}`);
    const before = opened.length;
    g.useDoor(); settle();
    assert.equal(opened.length, before, 'the picnic does not open the games window');
    assert(g.state().picnic, 'picnic under way'); assert.equal(g.state().place, i);
    assert.equal(get('picnicPanel').hidden, false);
    g.render(); assert(draws.some(d => d[0].source === 'picnic/cheese.png'), 'food drawn on the blanket');
    g.toggleFood('ice-cream'); settle(); g.render(); assert(draws.some(d => d[0].source === 'picnic/ice-cream.png'));
    handlers.keydown({ key: 'ArrowRight', target: {}, preventDefault() {} }); settle();
    assert(g.state().picnic, 'walking keys do not break up the picnic');
    handlers.keydown({ key: 'Escape', target: {}, preventDefault() {} }); settle();
    assert.equal(g.state().picnic, null); assert.equal(get('picnicPanel').hidden, true);
  });
  g.enterPlace(3, .18); g.startPicnic([2, .3]); settle();
  assert.equal(g.state().place, 2, 'the kitchen picnic heads out to Aspen Meadow'); assert(g.state().picnic);
  g.closePicnic(); settle();
  console.log('Passed picnics on the grass in Castle Valley, the Lavender Fields, Aspen Meadow and the villa gardens, and the kitchen picnic.');
});
