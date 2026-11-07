const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const elements = new Map(), events = {}, draws = [];
const context = new Proxy({ drawImage: (...a) => draws.push(a) }, { get: (o, k) => o[k] || (() => {}) });
function get(id) {
  if (!elements.has(id)) elements.set(id, { id, dataset: {}, hidden: false, textContent: '', classList: { add() {}, remove() {} },
    setAttribute(k, v) { this[k] = v; }, addEventListener(k, f) { this[k] = f; }, focus() {},
    getBoundingClientRect: () => ({ width: 960 }), getContext: () => context, setPointerCapture() {} });
  return elements.get(id);
}
const sizes = { 'forest.jpg': [2172, 724], 'village-1.jpg': [2172, 724], 'village-2.jpg': [2172, 724], 'estate.jpg': [2172, 724],
  'praelia.webp': [472, 720], 'praelia-walk.webp': [1640, 420], 'dorian.webp': [438, 720], 'dorian-walk.webp': [1928, 420],
  'kaidan.webp': [414, 720], 'kaidan-walk.webp': [1784, 420], 'thalion.webp': [383, 720], 'thalion-walk.webp': [2064, 420],
  'carriage.webp': [3352, 720] };
const requested = [];
const sandbox = { Math, Number, String, Promise, Error,
  document: { getElementById: get, addEventListener(k, f) { events[k] = f; } },
  window: { devicePixelRatio: 1 }, matchMedia: () => ({ matches: false }), ResizeObserver: class { observe() {} },
  Image: class { set src(v) { assert(v in sizes, v); requested.push(v); this.source = v; [this.width, this.height] = sizes[v]; this.onload(); } },
  addEventListener: (k, f) => events[k] = f, requestAnimationFrame() {},
};
let source = fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8');
source = source.replace(/\}\)\(\);\s*$/, `globalThis.gameTest = { update, render, keys, PARTY, travel, useDoor, state: () => ({ camera, worldWidth, lead, chase, place: place.id, travelling }) }; })();`);
vm.runInNewContext(source, sandbox);
const settle = () => new Promise(resolve => setImmediate(resolve));
setImmediate(async () => {
  await settle();
  const g = sandbox.gameTest, [praelia, dorian, kaidan, thalion] = g.PARTY;
  const key = k => events.keydown({ key: k, target: { closest: () => null }, preventDefault() {} });
  const tick = n => { for (let i = 0; i < n; i++) g.update(.05); };
  const walk = (direction, seconds) => { g.keys[direction] = true; tick(seconds * 20); g.keys[direction] = false; g.update(.05); };
  // what is drawn over the paintings, back to front
  const drawn = () => { draws.length = 0; g.render(); return draws.map(d => d[0].source).filter(s => !s.endsWith('.jpg')); };
  const W = () => g.state().worldWidth;

  // loading: the wood first, then the village and estate quietly behind
  assert.equal(get('reset').disabled, false, 'loaded'); assert.equal(W(), 1800 * 3, 'the wood is three forests long');
  assert.equal(get('go-village').disabled, false); assert(['village-1.jpg', 'village-2.jpg', 'estate.jpg'].every(s => requested.includes(s)), 'the other places load in the background');
  assert.equal(get('chase').disabled, false); assert.equal(g.state().chase, null, 'no carriage until you ask'); assert.equal(get('pick-dorian').disabled, false);
  assert.equal(get('placeName').textContent, 'The Autumn Wood');

  // the party walks together
  assert.deepEqual(drawn(), ['thalion.webp', 'kaidan.webp', 'dorian.webp', 'praelia.webp'], 'all four stand in their paintings, Praelia in front');
  assert.equal(dorian.x, praelia.x - 140); assert.equal(kaidan.x, praelia.x - 280); assert.equal(thalion.x, praelia.x - 420);
  const start = praelia.x; assert.equal(get('distance').textContent, 'The wood’s edge');
  walk('right', 1); assert.equal(praelia.x, start + 190);
  g.keys.right = true; tick(10);
  assert.deepEqual(drawn(), ['thalion-walk.webp', 'kaidan-walk.webp', 'dorian-walk.webp', 'praelia-walk.webp'], 'walking, all four use their walk sheets');
  assert(draws.at(-1)[1] > 0, 'and the leader\'s frame advances');
  g.keys.right = false; tick(40);
  assert.deepEqual(drawn(), ['thalion.webp', 'kaidan.webp', 'dorian.webp', 'praelia.webp'], 'they stand when they stop');
  assert(Math.abs(dorian.x - (praelia.x - 140)) < 1 && Math.abs(thalion.x - (praelia.x - 420)) < 1, 'followers catch up and keep their places');

  // choosing who leads
  key('2'); assert.equal(g.state().lead, 1); assert.equal(get('pick-dorian')['aria-pressed'], 'true');
  assert.equal(get('pick-praelia')['aria-pressed'], 'false'); assert.equal(get('leaderName').textContent, 'Dorian');
  const dx = dorian.x; walk('right', 1); assert.equal(dorian.x, dx + 190, 'the keys now move Dorian');
  tick(60); assert(Math.abs(praelia.x - (dorian.x - 140)) < 1 && Math.abs(thalion.x - (dorian.x - 420)) < 1);
  assert.equal(drawn().at(-1), 'dorian.webp', 'the leader is drawn in front');
  key('4'); assert.equal(g.state().lead, 3); assert.equal(get('leaderName').textContent, 'Thalion');
  get('pick-kaidan').click(); assert.equal(g.state().lead, 2); assert.equal(get('leaderName').textContent, 'Kaidan');

  // the carriage chase, in the wood
  get('chase').click(); const c = g.state().chase; assert(c && c.x > kaidan.x, 'the carriage sets off just ahead');
  assert.equal(kaidan.x, start, 'the party starts back at the edge'); assert.equal(get('chase').textContent, 'Chase it again');
  let order = drawn(); assert(order.indexOf('carriage.webp') === 0, 'the carriage is drawn behind the party');
  g.keys.right = true; tick(100); g.keys.right = false;
  assert(g.state().chase.x - kaidan.x > 300, 'walking, the party falls behind'); assert.match(get('caption').textContent, /carriage|gaining/i);
  tick(100); assert(g.state().chase.x - kaidan.x > 650, 'it gets far ahead'); assert(g.state().chase.speed < 130, 'and slows to wait');
  assert.match(get('caption').textContent, /pulling away/);
  g.keys.right = g.keys.hurry = true; let n = 0; while (!g.state().chase.caught && n++ < 2000) g.update(.05); g.keys.right = g.keys.hurry = false;
  assert(g.state().chase.caught, 'hurrying, Kaidan catches it'); assert.match(get('caption').textContent, /Kaidan catches up/);
  tick(30); assert.equal(g.state().chase.speed, 0, 'the coachman reins in');
  key('c'); g.keys.right = true; n = 0; while (!g.state().chase.caught && n++ < 3000) g.update(.05); g.keys.right = false;
  assert(g.state().chase.caught && g.state().chase.stopped, 'walking only, you still catch it at the end of the path');

  // from the far end of the wood, ↑ walks on to the village
  walk('right', 30); assert.equal(kaidan.x, W() - 40); assert.equal(get('distance').textContent, 'The far edge of the wood');
  assert.equal(get('door').hidden, false); assert.equal(get('doorLabel').textContent, 'Walk on to the village');
  key('ArrowUp'); await settle();
  assert.equal(g.state().place, 'village'); assert.equal(get('placeName').textContent, 'The Village'); assert.equal(g.state().chase, null, 'the carriage stays in the wood');
  assert.equal(W(), 1800 * 2, 'two village streets end to end'); assert.equal(get('go-village')['aria-pressed'], 'true');
  assert.equal(kaidan.facing, 1); assert(praelia.x < kaidan.x && thalion.x < kaidan.x, 'the others arrive behind the leader');
  draws.length = 0; g.render(); const k = draws.at(-1); assert(Math.abs(k[4] - 286 * .58) < 1, 'in the village the party is drawn smaller, to fit the houses');
  const vx = kaidan.x; walk('right', 1); assert(kaidan.x - vx < 190 && kaidan.x - vx > 100, 'and walks a shorter step');
  while (Math.abs(kaidan.x - .41 * W()) > 30) walk(kaidan.x < .41 * W() ? 'right' : 'left', .1);
  assert.match(get('caption').textContent, /apples and pumpkins/);

  // the archway leads to Praelia's estate, where only the drive between the moats can be walked
  while (Math.abs(kaidan.x - .91 * W()) > 40) walk('right', .1);
  assert.equal(get('doorLabel').textContent, 'Through the archway to Praelia’s estate');
  get('door').click(); await settle();
  assert.equal(g.state().place, 'estate'); assert.equal(get('placeName').textContent, 'Praelia’s Estate'); assert.match(get('caption').textContent, /gates stand open/);
  walk('right', 10); assert(kaidan.x <= .64 * W() - 30, 'the moat stops them on the right');
  walk('left', 10); assert(kaidan.x >= .36 * W() + 30, 'and on the left');
  [praelia, dorian, thalion].forEach(p => assert(p.x >= .36 * W() + 30 && p.x <= .64 * W() - 30, 'followers stay on the drive too'));
  assert.equal(get('doorLabel').textContent, 'Back to the village');
  key('Enter'); await settle(); assert.equal(g.state().place, 'village'); assert.equal(kaidan.facing, -1, 'back out through the archway, facing home');

  // the place buttons go straight there; Back to the wood's edge always returns to the wood
  get('go-estate').click(); await settle(); assert.equal(g.state().place, 'estate');
  get('go-wood').click(); await settle(); assert.equal(g.state().place, 'wood'); assert.equal(get('placeName').textContent, 'The Autumn Wood');
  get('go-village').click(); await settle(); while (kaidan.x > 80) walk('left', .2);
  assert.equal(get('doorLabel').textContent, 'Back to the wood'); await g.useDoor(); assert.equal(g.state().place, 'wood');
  assert.equal(kaidan.facing, -1); assert(kaidan.x > W() * .9, 'arriving at the far end of the wood');
  get('go-estate').click(); await settle();
  get('reset').click(); assert.equal(g.state().place, 'wood'); assert.equal(kaidan.x, start); assert.equal(get('distance').textContent, 'The wood’s edge');
  assert(praelia.x < kaidan.x && dorian.x < kaidan.x && thalion.x < kaidan.x, 'back at the edge, the others line up behind the leader');
  get('go-village').click(); await settle(); key('c'); assert.equal(g.state().place, 'wood', 'chasing the carriage starts in the wood'); assert(g.state().chase);

  // touch, blur
  get('right').pointerdown({ preventDefault() {}, pointerId: 1 }); assert.equal(g.keys.right, true);
  get('right').pointercancel(); assert.equal(g.keys.right, false);
  g.keys.left = true; events.blur(); assert.equal(g.keys.left, false);
  console.log('Passed loading, the party walking and standing together, choosing who leads, the carriage chase, the wood → village → estate walk and back, the estate drive, place buttons, reset, touch and blur.');
});
