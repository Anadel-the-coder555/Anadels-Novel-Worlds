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
const sizes = { 'forest.jpg': [2172, 724], 'praelia.webp': [472, 720], 'praelia-walk.webp': [1640, 420],
  'dorian.webp': [438, 720], 'dorian-walk.webp': [1928, 420], 'kaidan.webp': [414, 720], 'kaidan-walk.webp': [1784, 420],
  'thalion.webp': [383, 720], 'thalion-walk.webp': [2064, 420], 'carriage.webp': [3352, 720] };
const sandbox = { Math, Number, String, Promise, Error,
  document: { getElementById: get, addEventListener(k, f) { events[k] = f; } },
  window: { devicePixelRatio: 1 }, matchMedia: () => ({ matches: false }), ResizeObserver: class { observe() {} },
  Image: class { set src(v) { assert(v in sizes, v); this.source = v; [this.width, this.height] = sizes[v]; this.onload(); } },
  addEventListener: (k, f) => events[k] = f, requestAnimationFrame() {},
};
let source = fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8');
source = source.replace(/\}\)\(\);\s*$/, `globalThis.gameTest = { update, render, keys, PARTY, state: () => ({ camera, worldWidth, lead, chase }) }; })();`);
vm.runInNewContext(source, sandbox);
setImmediate(() => {
  const g = sandbox.gameTest, [praelia, dorian, kaidan, thalion] = g.PARTY;
  const key = k => events.keydown({ key: k, target: { closest: () => null }, preventDefault() {} });
  const tick = n => { for (let i = 0; i < n; i++) g.update(.05); };
  const walk = (direction, seconds) => { g.keys[direction] = true; tick(seconds * 20); g.keys[direction] = false; g.update(.05); };
  const drawn = () => { draws.length = 0; g.render(); return draws.slice(1).map(d => d[0].source); };
  assert.equal(get('reset').disabled, false, 'loaded'); assert.equal(g.state().worldWidth, 1800 * 3, 'the wood is three forests long');
  assert.equal(get('chase').disabled, false); assert.equal(g.state().chase, null, 'no carriage until you ask'); assert.equal(get('pick-dorian').disabled, false);
  assert.deepEqual(drawn(), ['thalion.webp', 'kaidan.webp', 'dorian.webp', 'praelia.webp'], 'all four stand in their paintings, Praelia in front');
  assert.equal(dorian.x, praelia.x - 140); assert.equal(kaidan.x, praelia.x - 280); assert.equal(thalion.x, praelia.x - 420);
  const x0 = praelia.x; walk('right', 1); assert.equal(praelia.x, x0 + 190);
  g.keys.right = true; tick(10);
  assert.deepEqual(drawn(), ['thalion-walk.webp', 'kaidan-walk.webp', 'dorian-walk.webp', 'praelia-walk.webp'], 'walking, all four use their walk sheets');
  assert(draws.at(-1)[1] > 0, 'and the leader\'s frame advances');
  g.keys.right = false; tick(40);
  assert.deepEqual(drawn(), ['thalion.webp', 'kaidan.webp', 'dorian.webp', 'praelia.webp'], 'they stand when they stop');
  assert(Math.abs(dorian.x - (praelia.x - 140)) < 1 && Math.abs(kaidan.x - (praelia.x - 280)) < 1 && Math.abs(thalion.x - (praelia.x - 420)) < 1, 'followers catch up and keep their places');
  // Dorian takes the lead where he stands; Praelia and Kaidan fall in behind him
  key('2'); assert.equal(g.state().lead, 1); assert.equal(get('pick-dorian')['aria-pressed'], 'true');
  assert.equal(get('pick-praelia')['aria-pressed'], 'false'); assert.equal(get('leaderName').textContent, 'Dorian');
  const dx = dorian.x; walk('right', 1); assert.equal(dorian.x, dx + 190, 'the keys now move Dorian');
  tick(60); assert(Math.abs(praelia.x - (dorian.x - 140)) < 1 && Math.abs(kaidan.x - (dorian.x - 280)) < 1 && Math.abs(thalion.x - (dorian.x - 420)) < 1);
  assert.equal(drawn().at(-1), 'dorian.webp', 'the leader is drawn in front');
  get('pick-kaidan').click(); assert.equal(g.state().lead, 2); assert.equal(get('leaderName').textContent, 'Kaidan');
  walk('right', 40); assert.equal(kaidan.x, g.state().worldWidth - 40);
  assert.equal(get('distance').textContent, 'Deep in the wood'); assert(g.state().camera > 0);
  walk('left', 1); assert.equal(kaidan.facing, -1); tick(40);
  assert(praelia.x > kaidan.x && dorian.x > kaidan.x && thalion.x > kaidan.x, 'turning round, the others follow from the other side');
  key('4'); assert.equal(g.state().lead, 3); assert.equal(get('leaderName').textContent, 'Thalion');
  const tx = thalion.x; walk('left', 1); assert.equal(thalion.x, tx - 190, 'the keys now move Thalion');
  get('pick-kaidan').click();
  get('right').pointerdown({ preventDefault() {}, pointerId: 1 }); assert.equal(g.keys.right, true);
  get('right').pointercancel(); assert.equal(g.keys.right, false);
  g.keys.left = true; events.blur(); assert.equal(g.keys.left, false);
  get('reset').click(); assert.equal(kaidan.x, 520); assert.equal(get('distance').textContent, 'The wood’s edge');
  assert(praelia.x < kaidan.x && dorian.x < kaidan.x && thalion.x < kaidan.x, 'back at the edge, the others line up behind the leader');
  // the carriage chase: it pulls away from a walking party, can be caught by hurrying, and waits at the end
  get('chase').click(); const c = g.state().chase; assert(c && c.x > kaidan.x, 'the carriage sets off just ahead');
  assert.equal(kaidan.x, 520, 'the party starts back at the edge'); assert.equal(get('chase').textContent, 'Chase it again');
  draws.length = 0; g.render(); assert(draws.some(d => d[0].source === 'carriage.webp'), 'the carriage is drawn');
  assert.notEqual(draws.findIndex(d => d[0].source === 'carriage.webp'), -1);
  assert(draws.findIndex(d => d[0].source === 'carriage.webp') < draws.length - 4, 'behind the party');
  g.keys.right = true; tick(100); g.keys.right = false;
  assert(g.state().chase.x - kaidan.x > 300, 'walking, the party falls behind'); assert.match(get('caption').textContent, /carriage|gaining/i);
  tick(100); assert(g.state().chase.x - kaidan.x > 650, 'it gets far ahead'); const s0 = g.state().chase.speed; assert(s0 < 130, 'and slows to wait');
  assert.match(get('caption').textContent, /pulling away/);
  g.keys.right = g.keys.hurry = true; let n = 0; while (!g.state().chase.caught && n++ < 2000) g.update(.05); g.keys.right = g.keys.hurry = false;
  assert(g.state().chase.caught, 'hurrying, Kaidan catches it'); assert.match(get('caption').textContent, /Kaidan catches up/);
  tick(30); assert.equal(g.state().chase.speed, 0, 'the coachman reins in');
  // walking only, you still catch it at the end of the path
  key('c'); g.keys.right = true; n = 0; while (!g.state().chase.caught && n++ < 3000) g.update(.05); g.keys.right = false;
  assert(g.state().chase.caught, 'caught at the end of the path without hurrying'); assert(g.state().chase.stopped);
  assert(g.state().chase.x <= g.state().worldWidth - 30);
  get('reset').click(); assert.equal(g.state().chase, null, 'going back puts the carriage away'); assert.equal(get('chase').textContent, 'Chase the carriage');
  console.log('Passed the carriage chase (pulling away, waiting, caught by hurrying or at the end, reset), and'); console.log('Passed loading, the party standing and walking on their sheets, followers keeping their places, choosing Dorian, Kaidan and Thalion to lead, the far end of the wood, turning round, touch, blur and reset.');
});
