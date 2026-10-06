const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
async function run(reduced) {
  const nodes = new Map(), handlers = {}, draws = [];
  const ctx = new Proxy({ drawImage: (...args) => draws.push(args) }, { get: (obj, key) => obj[key] || (() => {}) });
  function get(id) {
    if (!nodes.has(id)) nodes.set(id, { hidden: false, handlers: {}, classList: { add() {}, remove() {} },
      setAttribute(key, value) { this[key] = value; },
      addEventListener(type, fn) { this.handlers[type] = fn; }, getContext: () => ctx,
      getBoundingClientRect: () => ({ width: 960 }) });
    return nodes.get(id);
  }
  const sandbox = { document: { getElementById: get, addEventListener() {} },
    window: { devicePixelRatio: 1 }, matchMedia: () => ({ matches: reduced }),
    ResizeObserver: class { observe() {} }, addEventListener: (type, fn) => handlers[type] = fn,
    requestAnimationFrame() {}, Image: class {
      set src(value) { this.source = value; this.width = value === 'skycity.jpg' ? 2172 : 1792;
        this.height = value === 'skycity.jpg' ? 724 : 420; this.onload(); }
    } };
  const source = fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8').replace(/\}\)\(\);\s*$/, `
    globalThis.game = { update, render, enterPlace, state: () => ({ x, camera, facing, distance, worldWidth, moving, place }) }; })();`);
  vm.runInNewContext(source, sandbox);
  await new Promise(resolve => setImmediate(resolve));
  const g = sandbox.game, key = (value, up = false) => handlers[up ? 'keyup' : 'keydown']({ key: value, target: {}, preventDefault() {} });
  assert.equal(get('loading').hidden, true); assert.equal(get('reset').disabled, false);
  assert.equal(g.state().worldWidth, 1800);
  g.render(); assert.equal(draws.at(-1)[0].source, 'nyx-walk.png');
  key('ArrowRight'); g.update(.1); assert.equal(g.state().x, 255);
  g.render(); assert.equal(draws.at(-1)[1], reduced ? 0 : 224);
  key('Shift'); g.update(.1); assert.equal(g.state().x, 288);
  key('Shift', true); key('ArrowRight', true);
  key('ArrowLeft'); g.update(.1); assert.equal(g.state().facing, -1); assert.equal(g.state().x, 268);
  handlers.blur(); g.update(.1); assert.equal(g.state().x, 268);
  get('right').handlers.pointerdown({ preventDefault() {} });
  for (let i = 0; i < 200; i++) g.update(.05);
  assert.equal(g.state().x, 1745); assert(g.state().camera > 839 && g.state().camera <= 840);
  assert.equal(get('distance').textContent, 'East terrace');
  get('right').handlers.pointercancel(); g.update(.1); assert.equal(g.state().moving, false);
  get('reset').handlers.click(); assert.equal(g.state().x, 235); assert.equal(g.state().camera, 0);
  assert(get('caption').textContent.includes('Golden arches'));
  key('a'); for (let i = 0; i < 100; i++) g.update(.05);
  assert.equal(g.state().x, 55); assert(g.state().camera >= 0);
  key('a', true);
  function doorAt(scene, position, destination, artwork) {
    g.enterPlace(scene, position);
    assert.equal(get('doorBtn').hidden, false);
    key('ArrowUp'); assert.equal(g.state().place, destination);
    g.render(); assert.equal(draws.at(-2)[0].source, artwork);
  }
  doorAt(0, .94, 1, 'mansion.jpg');
  doorAt(1, .5, 2, 'mansion-entrance.jpg');
  doorAt(2, .7, 3, 'bedroom.jpg');
  doorAt(3, .63, 2, 'mansion-entrance.jpg');
  doorAt(2, .5, 1, 'mansion.jpg');
  doorAt(1, .12, 0, 'skycity.jpg');
  get('place-3').handlers.click(); assert.equal(g.state().place, 3);
  get('doorBtn').handlers.click(); assert.equal(g.state().place, 2);
  get('reset').handlers.click(); assert.equal(g.state().place, 0);
  g.enterPlace(1, .8); assert.equal(get('doorBtn').hidden, true);
  key('ArrowUp'); assert.equal(g.state().place, 1);
  console.log('Passed mansion, atrium, bedroom, all return doors, place buttons and reset.');
  console.log(`Passed Nyx loading, animation, movement, hurry, bounds, scrolling, touch, captions and reset${reduced ? ' with reduced motion' : ''}.`);
}
(async () => { await run(false); await run(true); })().catch(error => { console.error(error); process.exitCode = 1; });
