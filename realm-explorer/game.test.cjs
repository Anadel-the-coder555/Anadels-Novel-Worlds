const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const nodes = [], draws = [];
const handlers = {};
let savedGown = '3';
const drawing = new Proxy({ drawImage: (...args) => draws.push(args),
  createRadialGradient: () => ({ addColorStop() {} }) }, { get: (o, k) => o[k] || (() => {}) });
function element(id) {
  const node = { id, dataset: {}, classList: { add() {}, remove() {}, toggle() {} },
    setAttribute(k, v) { this[k] = v; }, addEventListener(k, f) { this[k] = f; },
    appendChild() {}, focus() {}, getBoundingClientRect: () => ({ width: 960 }), getContext: () => drawing };
  nodes.push(node); return node;
}
const get = id => nodes.find(n => n.id === id) || element(id);
const sandbox = { Math, Number, String, Promise, Error, setTimeout() {},
  matchMedia: () => ({ matches: false }), ResizeObserver: class { observe() {} },
  document: { getElementById: get, createElement: () => element(''), body: element('body'),
    querySelectorAll: q => q === '#places .place' ? nodes.filter(n => n.dataset.place !== undefined) : [],
    fonts: { load: async () => {} } }, window: { devicePixelRatio: 1 },
  localStorage: { getItem: () => savedGown, setItem: (_, value) => savedGown = value },
  Image: class { set src(v) { this.source = v; this.width = 2172; this.height = 724; this.onload(); } },
  addEventListener: (name, handler) => handlers[name] = handler, requestAnimationFrame() {},
};
let source = fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8');
source = source.replace(/\}\)\(\);\s*$/, `globalThis.testGame = { enterPlace, walkOff, useDoor, update, render, drawWalker, pickGown,
  state: () => ({ place, leaderX, worldW, door, gown, dressing }) }; })();`);
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
});
