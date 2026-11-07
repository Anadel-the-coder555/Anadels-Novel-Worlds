const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const elements = new Map(), events = {}, draws = [];
const context = new Proxy({ drawImage: (...a) => draws.push(a) }, { get: (o, k) => o[k] || (() => {}) });
function get(id) {
  if (!elements.has(id)) elements.set(id, { id, dataset: {}, hidden: false, textContent: '', classList: { add() {}, remove() {} },
    setAttribute(k, v) { this[k] = v; }, addEventListener(k, f) { this[k] = f; }, focus() {},
    getBoundingClientRect: () => ({ width: 960 }), getContext: () => context, setPointerCapture() {}, closest: () => null });
  return elements.get(id);
}
const sizes = { 'forest.jpg': [2172, 724], 'boy-walk.png': [1968, 420], 'fern.png': [209, 640], 'fern-walk.png': [1744, 420] };
const sandbox = { Math, Number, String, Promise, Error,
  document: { getElementById: get, addEventListener(k, f) { events[k] = f; } },
  window: { devicePixelRatio: 1 }, matchMedia: () => ({ matches: false }), ResizeObserver: class { observe() {} },
  Image: class { set src(v) { this.source = v; [this.width, this.height] = sizes[v]; this.onload(); } },
  addEventListener: (k, f) => events[k] = f, requestAnimationFrame() {},
};
let source = fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8');
source = source.replace(/\}\)\(\);\s*$/, `globalThis.gameTest = { update, render, reset, keys, state: () => ({ x, facing, camera, worldWidth, met, chat, fx, fernMoving, fernFacing }) }; })();`);
vm.runInNewContext(source, sandbox);
setImmediate(() => {
  const g = sandbox.gameTest, key = k => events.keydown({ key: k, target: get('game'), preventDefault() {} });
  const walk = (direction, seconds) => { g.keys[direction] = true; for (let i = 0; i < seconds * 20; i++) g.update(.05); g.keys[direction] = false; g.update(.05); };
  assert.equal(get('loading').hidden, true); assert.equal(get('reset').disabled, false);
  assert.equal(get('fernCard').dataset.met, 'false');
  draws.length = 0; g.render(); assert.equal(draws.at(-1)[0].source, 'boy-walk.png', 'the boy is drawn last, in front');
  const x0 = g.state().x; walk('right', 1); assert.equal(g.state().x, x0 + 205);
  g.keys.right = true; g.update(.05); g.update(.05); draws.length = 0; g.render(); g.keys.right = false; g.update(.05);
  assert(draws.at(-1)[1] > 0, 'walking advances his frame');
  assert.equal(get('hello').hidden, true, 'no hello far from Fern');
  key('Enter'); assert.equal(g.state().met, false, 'hello does nothing away from Fern');
  const fernX = .58 * g.state().worldWidth;
  while (g.state().x < fernX - 60) walk('right', .2);
  assert.equal(get('hello').hidden, false); assert.match(get('caption').textContent, /red curls/);
  draws.length = 0; g.render(); assert(draws.some(d => d[0].source === 'fern.png'), 'Fern is in view');
  key('ArrowUp'); assert.equal(g.state().met, true); assert.equal(get('fernCard').dataset.met, 'true');
  assert.match(get('caption').textContent, /smiles/);
  get('hello').click(); assert.match(get('caption').textContent, /frond/);
  // after hello, Fern walks with him using her walk sheet, a step behind
  g.keys.right = true; for (let i = 0; i < 30; i++) g.update(.05);
  assert.equal(g.state().fernMoving, true, 'Fern walks along'); assert.equal(g.state().fernFacing, 1);
  draws.length = 0; g.render(); assert(draws.some(d => d[0].source === 'fern-walk.png'), 'she is drawn with her walk sheet');
  assert.equal(draws.at(-1)[0].source, 'boy-walk.png', 'the boy is still in front');
  g.keys.right = false;
  walk('right', 20); assert.equal(g.state().x, g.state().worldWidth - 40); assert.equal(get('distance').textContent, 'The far meadow');
  for (let i = 0; i < 40; i++) g.update(.05);
  assert(Math.abs(g.state().x - 105 - g.state().fx) < 2, 'she catches up and stops a step behind');
  assert.equal(g.state().fernMoving, false);
  draws.length = 0; g.render(); assert(draws.some(d => d[0].source === 'fern.png'), 'standing still, she holds her frond');
  assert.equal(get('hello').hidden, false, 'you can talk to her as you walk'); assert(g.state().camera > 0);
  key('Enter'); assert.match(get('caption').textContent, /walk|woodpecker|moss|humming/i, 'walking-together lines');
  walk('left', 1); assert.equal(g.state().facing, -1);
  get('right').pointerdown({ preventDefault() {}, pointerId: 1 }); assert.equal(g.keys.right, true);
  get('right').pointercancel(); assert.equal(g.keys.right, false);
  g.keys.left = true; events.blur(); assert.equal(g.keys.left, false);
  get('reset').click(); assert.equal(g.state().x, 140); assert.equal(get('distance').textContent, 'Forest edge');
  assert.equal(g.state().met, true, 'meeting Fern is remembered after going back');
  assert(g.state().fx < g.state().x, 'Fern comes back with him');
  console.log('Passed loading, walking and his animation, meeting Fern (only up close), her lines, Fern walking with him on her walk sheet and standing when they stop, the far meadow, camera, touch, blur and reset.');
});
