// Exercise tournament integration with the real game functions and a minimal DOM.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const nodes = [], frames = [], handlers = {};
const drawing = new Proxy({
  measureText: text => ({ width: text.length * 8 }),
  createRadialGradient: () => ({ addColorStop() {} }),
}, { get: (o, k) => o[k] || (() => {}) });
function element(id, dataset = {}) {
  const node = { id, dataset, style: {}, classList: { add() {}, remove() {} },
    setAttribute() {}, addEventListener(k, f) { this[k] = f; }, focus() {},
    getBoundingClientRect: () => ({ width: 960 }), getContext: () => drawing };
  nodes.push(node); return node;
}
const get = id => nodes.find(n => n.id === id) || element(id);
const eventButtons = ['rings', 'parkour', 'style'].map(event => element(event, { event }));
const sandbox = { console, Math, Number, String, Promise, Error, Set,
  localStorage: { getItem() {}, setItem() {} },
  setTimeout() {}, clearTimeout() {},
  matchMedia: () => ({ matches: false }), ResizeObserver: class { observe() {} },
  document: { getElementById: get, querySelectorAll: q => q === '[data-event]' ? eventButtons : [], fonts: { load: async () => {} } },
  window: { devicePixelRatio: 1 },
  Image: class { set src(v) { this.width = 1620; this.height = 540; this.onload(); } },
  addEventListener: (k, f) => handlers[k] = f,
  requestAnimationFrame: f => frames.push(f),
};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'tournament.js'), 'utf8'), sandbox);
let source = fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8');
source = source.replace(/\}\)\(\);\s*$/, `globalThis.testGame = {
  cup, boys, startMatch, setupMatch, updateMatchTarget, update, render, jump, land,
  flip, toggleZero, exitMatch, swap, goThrough, bodyCenter,
  getRoom: () => roomK, getControl: () => ctrl.arrows
}; })();`);
vm.runInNewContext(source, sandbox);
setImmediate(() => {
  const g = sandbox.testGame;
  assert.equal(get('cupStart').disabled, false);
  g.swap(); assert.equal(g.getControl(), 'lucio');
  g.startMatch('rings', true); assert.equal(g.getRoom(), 'atrium');
  assert.equal(get('starPill').hidden, true);
  const player = g.boys.lucio, initial = [...player.p];
  g.update(1); assert.deepEqual([...player.p], initial, 'countdown freezes physics');
  g.update(2); assert.equal(g.cup.running, true);
  let c = g.bodyCenter(player), target = g.cup.target;
  player.p[0] += target.x - c[0]; player.p[1] += target.y - c[1];
  g.updateMatchTarget(); assert.equal(g.cup.score, 80);
  g.swap(); assert.equal(g.getControl(), 'lucio', 'competitor locked for round');
  g.goThrough(); assert.equal(g.getRoom(), 'atrium');
  handlers.blur(); assert.equal(g.cup.paused, true);
  const pausedPosition = [...player.p]; g.update(10);
  assert.deepEqual([...player.p], pausedPosition); assert.equal(g.cup.time, 60);
  g.cup.paused = false; g.cup.tick(60); g.update(0);
  assert.equal(get('matchResults').hidden, false);
  get('matchNext').click(); assert.equal(g.cup.event, 'parkour');
  g.cup.tick(3); target = g.cup.target;
  Object.assign(g.boys.lucio, { p: [target.x, target.y], mode: 'surf', surf: target.surface });
  g.updateMatchTarget(); assert.equal(g.cup.score, 120);
  g.cup.tick(60); g.update(0); get('matchNext').click();
  assert.equal(g.cup.event, 'style'); g.cup.tick(3);
  const b = g.boys.lucio;
  g.jump(b, 0); g.flip(); g.land(b, 'ceil'); assert.equal(g.cup.score, 160);
  g.render();
  g.cup.tick(60); g.update(0);
  assert.match(get('matchResults').innerHTML, /Cup complete/);
  g.exitMatch(); assert.equal(g.cup.active, false);
  assert.equal(get('competition').hidden, true); assert.equal(get('doorBtn').disabled, false);
  assert.equal(get('starPill').hidden, false); g.update(.04); g.render();
  get('catBtn').click(); assert.equal(g.getControl(), 'cat');
  assert.equal(g.boys.cat.mode, 'surf');
  const cat = g.boys.cat;
  assert.equal(g.bodyCenter(cat)[1], cat.p[1] - 50, 'cat uses its own height for collision center');
  cat.moving = true; cat.phase = 115; g.render();
  g.startMatch('rings', false); g.cup.tick(3);
  const catCenter = g.bodyCenter(g.boys.cat), ring = g.cup.target;
  g.boys.cat.p[0] += ring.x - catCenter[0]; g.boys.cat.p[1] += ring.y - catCenter[1];
  g.updateMatchTarget(); assert.equal(g.cup.score, 80, 'cat collects tournament rings');
  assert.match(get('matchTitle').textContent, /Cat/);
  assert.equal(get('catBtn').disabled, true);
  g.exitMatch(); g.startMatch('parkour', false); g.cup.tick(3);
  const zone = g.cup.target;
  Object.assign(g.boys.cat, { p: [zone.x, zone.y], mode: 'surf', surf: zone.surface });
  g.updateMatchTarget(); assert.equal(g.cup.score, 120, 'cat lands parkour zones');
  g.exitMatch(); g.startMatch('style', false); g.cup.tick(3);
  g.jump(g.boys.cat, 0); g.flip(); g.land(g.boys.cat, 'ceil');
  assert.equal(g.cup.score, 160, 'cat earns gravity trick combos');
  g.render(); g.exitMatch(); g.swap(); assert.equal(g.getControl(), 'arduan', 'character cycle wraps after cat');
  console.log('Game integration passed: character selection, countdown, targets, pause, all three rounds, trick physics hooks, standings, rendering and free-roam return.');
  console.log('Cat passed: direct selection, size, animation rendering, ring pickups, parkour landings, freestyle tricks and character-cycle wrap.');
});
