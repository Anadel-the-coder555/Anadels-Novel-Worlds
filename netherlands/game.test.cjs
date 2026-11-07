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
const sizes = { 'forest.jpg': [2172, 724], 'praelia.png': [472, 720], 'praelia-walk.png': [1640, 420],
  'dorian.png': [438, 720], 'dorian-walk.png': [1928, 420], 'kaidan.png': [414, 720], 'kaidan-walk.png': [1784, 420] };
const sandbox = { Math, Number, String, Promise, Error,
  document: { getElementById: get, addEventListener(k, f) { events[k] = f; } },
  window: { devicePixelRatio: 1 }, matchMedia: () => ({ matches: false }), ResizeObserver: class { observe() {} },
  Image: class { set src(v) { assert(v in sizes, v); this.source = v; [this.width, this.height] = sizes[v]; this.onload(); } },
  addEventListener: (k, f) => events[k] = f, requestAnimationFrame() {},
};
let source = fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8');
source = source.replace(/\}\)\(\);\s*$/, `globalThis.gameTest = { update, render, keys, PARTY, state: () => ({ camera, worldWidth, lead }) }; })();`);
vm.runInNewContext(source, sandbox);
setImmediate(() => {
  const g = sandbox.gameTest, [praelia, dorian, kaidan] = g.PARTY;
  const key = k => events.keydown({ key: k, target: { closest: () => null }, preventDefault() {} });
  const tick = n => { for (let i = 0; i < n; i++) g.update(.05); };
  const walk = (direction, seconds) => { g.keys[direction] = true; tick(seconds * 20); g.keys[direction] = false; g.update(.05); };
  const drawn = () => { draws.length = 0; g.render(); return draws.slice(1).map(d => d[0].source); };
  assert.equal(get('reset').disabled, false, 'loaded'); assert.equal(get('pick-dorian').disabled, false);
  assert.equal(get('caption').hidden, false, 'a landmark line at the edge');
  assert.deepEqual(drawn(), ['kaidan.png', 'dorian.png', 'praelia.png'], 'all three stand in their paintings, Praelia in front');
  assert.equal(dorian.x, praelia.x - 140); assert.equal(kaidan.x, praelia.x - 280);
  const x0 = praelia.x; walk('right', 1); assert.equal(praelia.x, x0 + 190);
  g.keys.right = true; tick(10);
  assert.deepEqual(drawn(), ['kaidan-walk.png', 'dorian-walk.png', 'praelia-walk.png'], 'walking, all three use their walk sheets');
  assert(draws.at(-1)[1] > 0, 'and the leader\'s frame advances');
  g.keys.right = false; tick(40);
  assert.deepEqual(drawn(), ['kaidan.png', 'dorian.png', 'praelia.png'], 'they stand when they stop');
  assert(Math.abs(dorian.x - (praelia.x - 140)) < 1 && Math.abs(kaidan.x - (praelia.x - 280)) < 1, 'followers catch up and keep their places');
  // Dorian takes the lead where he stands; Praelia and Kaidan fall in behind him
  key('2'); assert.equal(g.state().lead, 1); assert.equal(get('pick-dorian')['aria-pressed'], 'true');
  assert.equal(get('pick-praelia')['aria-pressed'], 'false'); assert.equal(get('leaderName').textContent, 'Dorian');
  const dx = dorian.x; walk('right', 1); assert.equal(dorian.x, dx + 190, 'the keys now move Dorian');
  tick(60); assert(Math.abs(praelia.x - (dorian.x - 140)) < 1 && Math.abs(kaidan.x - (dorian.x - 280)) < 1);
  assert.equal(drawn().at(-1), 'dorian.png', 'the leader is drawn in front');
  get('pick-kaidan').click(); assert.equal(g.state().lead, 2); assert.equal(get('leaderName').textContent, 'Kaidan');
  walk('right', 20); assert.equal(kaidan.x, g.state().worldWidth - 40);
  assert.equal(get('distance').textContent, 'Deep in the wood'); assert(g.state().camera > 0);
  walk('left', 1); assert.equal(kaidan.facing, -1); tick(40);
  assert(praelia.x > kaidan.x && dorian.x > kaidan.x, 'turning round, the others follow from the other side');
  get('right').pointerdown({ preventDefault() {}, pointerId: 1 }); assert.equal(g.keys.right, true);
  get('right').pointercancel(); assert.equal(g.keys.right, false);
  g.keys.left = true; events.blur(); assert.equal(g.keys.left, false);
  get('reset').click(); assert.equal(kaidan.x, 380); assert.equal(get('distance').textContent, 'The wood’s edge');
  assert(praelia.x < kaidan.x && dorian.x < kaidan.x, 'back at the edge, the others line up behind the leader');
  console.log('Passed loading, the party standing and walking on their sheets, followers keeping their places, choosing Dorian and Kaidan to lead, the far end of the wood, turning round, touch, blur and reset.');
});
