const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const elements = new Map(), events = {}, draws = [];
let savedOutfit = null;
const context = new Proxy({ drawImage: (...a) => draws.push(a) }, { get: (o, k) => o[k] || (() => {}) });
function get(id) {
  if (!elements.has(id)) elements.set(id, { id, classList: { add() {}, remove() {} },
    setAttribute(k, v) { this[k] = v; }, addEventListener(k, f) { this[k] = f; }, focus() {},
    getBoundingClientRect: () => ({ width: 960 }), getContext: () => context,
    setPointerCapture() {}, closest: () => null });
  return elements.get(id);
}
const sandbox = { Math, Number, String, Promise, Error,
  localStorage: { getItem: () => savedOutfit, setItem: (_, value) => savedOutfit = value },
  document: { getElementById: get, addEventListener(k, f) { events[k] = f; } },
  window: { devicePixelRatio: 1 }, matchMedia: () => ({ matches: false }),
  ResizeObserver: class { observe() {} }, Image: class { set src(v) { this.source = v; this.width = 2172; this.height = 724; this.onload(); } },
  addEventListener: (k, f) => events[k] = f, requestAnimationFrame() {},
};
let source = fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8');
source = source.replace(/\}\)\(\);\s*$/, `globalThis.gameTest = { update, render, choose, reset, keys, states,
  state: () => ({ x, lead, camera, worldWidth, together }) }; })();`);
vm.runInNewContext(source, sandbox);
setImmediate(() => {
  const g = sandbox.gameTest;
  const walk = (direction, seconds) => { g.keys[direction] = true; for (let i = 0; i < seconds * 20; i++) g.update(.05); g.keys[direction] = false; };
  assert.equal(get('loading').hidden, true); assert.equal(get('girl').disabled, false);
  g.render(); assert.equal(draws.at(-1)[0].source, 'girl-walk.png');
  const initial = g.state().x; walk('right', 1); assert.equal(g.state().x, initial + 205);
  assert(g.states[0].distance > 0 && g.states[1].distance > 0);
  g.render(); assert(draws.at(-1)[1] > 0, 'walking advances sprite frame');
  g.keys.hurry = true; const before = g.state().x; walk('right', 1);
  assert.equal(g.state().x, before + 335); g.keys.hurry = false;
  walk('left', 1); assert.equal(g.states[0].facing, -1);
  events.keydown({ key: '2', target: get('game'), preventDefault() {} });
  assert.equal(g.state().lead, 1); assert.equal(get('guy')['aria-pressed'], 'true');
  assert.equal(g.states[1].x, g.state().x, 'leader selection preserves world position');
  g.render(); assert.equal(draws.at(-1)[0].source, 'guy-walk.png');
  get('together').change({ target: { checked: false } });
  draws.length = 0; g.render(); assert.equal(draws.length, 2, 'solo draws background and leader');
  events.keydown({ key: 'T', target: get('game'), preventDefault() {} }); assert.equal(g.state().together, true);
  walk('right', 20); assert.equal(g.state().x, g.state().worldWidth - 32);
  assert(g.state().camera > 0); assert.equal(get('distance').textContent, 'East terrace');
  walk('left', 20); assert.equal(g.state().x, 32);
  get('right').pointerdown({ preventDefault() {}, pointerId: 1 }); assert.equal(g.keys.right, true);
  get('right').pointercancel(); assert.equal(g.keys.right, false);
  g.keys.left = true; events.blur(); assert.equal(g.keys.left, false);
  get('reset').click(); assert.equal(g.state().x, 270); assert.equal(g.state().camera, 0);
  const position = g.state().x;
  get('brielleOutfit').change({ target: { value: '1' } });
  assert.equal(savedOutfit, '1'); assert.equal(g.state().x, position);
  draws.length = 0; g.render(); assert(draws.some(d => d[0].source === 'brielle-dress-walk.png'), 'Brielle wears dress while following');
  g.choose(0); walk('right', 1); g.render();
  assert.equal(draws.at(-1)[0].source, 'brielle-dress-walk.png'); assert.equal(draws.at(-1)[3], 272);
  assert.equal(draws.at(-1)[4], 420);
  get('reset').click(); g.render(); assert.equal(draws.at(-1)[0].source, 'brielle-dress-walk.png');
  get('brielleOutfit').change({ target: { value: '0' } }); g.render();
  assert.equal(draws.at(-1)[0].source, 'girl-walk.png'); assert.equal(savedOutfit, '0');
  console.log('Passed loading, both characters, walking animation, follower trail, hurry, direction changes, lead selection, solo/together, camera, boundaries, touch cancellation, blur and reset.');
  console.log('Passed Brielle outfit switching, saved choice, dress while leading/following, matching frame dimensions, retained position and reset.');
});
