const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const elements = new Map(), events = {}, draws = [];
const context = new Proxy({ drawImage: (...a) => draws.push(a) }, { get: (o, k) => o[k] || (() => {}) });
function get(id) {
  if (!elements.has(id)) elements.set(id, { id, dataset: {}, hidden: false, textContent: '', classList: { add() {}, remove() {} },
    addEventListener(k, f) { this[k] = f; }, focus() {}, getBoundingClientRect: () => ({ width: 960 }), getContext: () => context, setPointerCapture() {} });
  return elements.get(id);
}
const sizes = { 'forest.jpg': [2172, 724], 'lady.png': [472, 720], 'lady-walk.png': [1640, 420] };
const sandbox = { Math, Number, String, Promise, Error,
  document: { getElementById: get, addEventListener(k, f) { events[k] = f; } },
  window: { devicePixelRatio: 1 }, matchMedia: () => ({ matches: false }), ResizeObserver: class { observe() {} },
  Image: class { set src(v) { this.source = v; [this.width, this.height] = sizes[v]; this.onload(); } },
  addEventListener: (k, f) => events[k] = f, requestAnimationFrame() {},
};
let source = fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8');
source = source.replace(/\}\)\(\);\s*$/, `globalThis.gameTest = { update, render, keys, state: () => ({ x, facing, camera, worldWidth, moving }) }; })();`);
vm.runInNewContext(source, sandbox);
setImmediate(() => {
  const g = sandbox.gameTest;
  const walk = (direction, seconds) => { g.keys[direction] = true; for (let i = 0; i < seconds * 20; i++) g.update(.05); g.keys[direction] = false; g.update(.05); };
  assert.equal(get('reset').disabled, false, 'loaded');
  assert.match(get('caption').textContent, /beech/, 'first landmark at the edge');
  draws.length = 0; g.render(); assert.equal(draws.at(-1)[0].source, 'lady.png', 'she is drawn over the forest');
  const x0 = g.state().x; walk('right', 1); assert.equal(g.state().x, x0 + 190);
  g.keys.right = true; g.update(.05); g.update(.05); draws.length = 0; g.render();
  assert.equal(draws.at(-1)[0].source, 'lady-walk.png', 'walking, she uses her walk sheet'); assert(draws.at(-1)[1] > 0, 'and her frame advances');
  g.keys.right = false; g.update(.05); draws.length = 0; g.render(); assert.equal(draws.at(-1)[0].source, 'lady.png', 'she stands when she stops');
  walk('right', 20); assert.equal(g.state().x, g.state().worldWidth - 40);
  assert.equal(get('distance').textContent, 'Deep in the wood'); assert(g.state().camera > 0);
  walk('left', 1); assert.equal(g.state().facing, -1);
  get('right').pointerdown({ preventDefault() {}, pointerId: 1 }); assert.equal(g.keys.right, true);
  get('right').pointercancel(); assert.equal(g.keys.right, false);
  g.keys.left = true; events.blur(); assert.equal(g.keys.left, false);
  get('reset').click(); assert.equal(g.state().x, 140); assert.equal(get('distance').textContent, 'The wood’s edge');
  console.log('Passed loading, walking on her walk sheet and standing, landmarks, the far end of the wood, camera, touch, blur and reset.');
});
