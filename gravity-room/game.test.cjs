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
// fixed randomness so wandering characters never jump mid-assertion
const fixedMath = Object.assign(Object.create(Math), { random: () => .5 });
const sandbox = { console, Math: fixedMath, Number, String, Promise, Error, Set,
  localStorage: { getItem: k => k === 'gravity-story-on' ? '1' : undefined, setItem() {} },   // these tests play the shard adventure
  setTimeout() {}, clearTimeout() {},
  matchMedia: () => ({ matches: false }), ResizeObserver: class { observe() {} },
  document: { getElementById: get, querySelectorAll: q => q === '[data-event]' ? eventButtons : [], fonts: { load: async () => {} } },
  window: { devicePixelRatio: 1 },
  Image: class { set src(v) { this.width = 1620; this.height = 540; this.onload(); } },
  addEventListener: (k, f) => handlers[k] = f,
  requestAnimationFrame: f => frames.push(f),
};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'tournament.js'), 'utf8'), sandbox);
vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'adventure.js'), 'utf8'), sandbox);
let source = fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8');
source = source.replace(/\}\)\(\);\s*$/, `globalThis.testGame = {
  cup, boys, startMatch, setupMatch, updateMatchTarget, update, render, jump, land,
  flip, toggleZero, exitMatch, swap, goThrough, bodyCenter, adv, nextLine, updateStars,
  getTalk: () => talk, getStars: () => stars, isFleeing: () => fleeing, getOrb: () => orb, arriveIn: k => { pendingTo = k; arrive(); },
  getRoom: () => roomK, getControl: () => ctrl.arrows
}; })();`);
vm.runInNewContext(source, sandbox);
setImmediate(() => {
  const g = sandbox.testGame;
  assert.equal(get('cupStart').disabled, false);
  // the adventure opens with a scene that holds the world still
  assert.ok(g.getTalk(), 'intro scene plays'); g.swap(); assert.equal(g.getControl(), 'arduan', 'no swapping mid-scene');
  const readAll = () => { for (let n = 0; g.getTalk() && n < 99; n++) g.nextLine(); };
  readAll(); assert.equal(g.getTalk(), null);
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
  // ---- story: shards, locked doors, the street chase and catching the cat ----
  const grab = () => {
    const me = g.boys.arduan;
    g.getStars().filter(s => s.shard !== undefined && !s.got).forEach(s => {
      const c = g.bodyCenter(me); me.p[0] += s.x - c[0]; me.p[1] += s.y - c[1]; g.updateStars(0);
    });
    readAll();
  };
  g.arriveIn('arduan'); readAll(); assert.equal(g.adv.i, 0);
  assert.match(g.adv.lock('arduan', 'living'), /shard/, 'bedroom door waits for the first shard');
  grab(); assert.equal(g.adv.i, 1); assert.equal(g.adv.lock('arduan', 'living'), null);
  g.arriveIn('living'); readAll(); assert.equal(g.adv.step.type, 'shards'); assert.equal(g.getStars().length, 2);
  g.boys.lilith.p = [g.getStars()[0].x, g.getStars()[0].y + 126]; g.updateStars(0);
  assert.equal(g.getStars()[0].got, false, 'wanderers cannot take story shards');
  grab(); assert.equal(g.adv.step.type, 'go'); assert.equal(g.adv.found, 3);
  g.arriveIn('street'); readAll(); assert.ok(g.getOrb(), 'the purple streak waits on the street');
  for (let n = 0; n < 400 && g.getOrb(); n++) {
    const o = g.getOrb(), me = g.boys.arduan, c = g.bodyCenter(me); me.p[0] += o.x - c[0]; me.p[1] += o.y - c[1]; g.update(.04);
    if (g.getTalk()) readAll();
  }
  assert.equal(g.getOrb(), null); assert.equal(g.adv.step.type, 'shards', 'the streak drops a shard');
  assert.ok(g.adv.lock('street', 'school'));
  grab(); g.arriveIn('school'); readAll(); grab(); assert.equal(g.adv.step.to, 'atrium');
  g.arriveIn('atrium'); readAll(); assert.equal(g.isFleeing(), true, 'the cat runs');
  get('catBtn').click(); assert.notEqual(g.getControl(), 'cat', 'the fleeing cat cannot be taken over');
  for (let n = 0; n < 3; n++) {
    const cat = g.boys.cat, me = g.boys[g.getControl()], cc = g.bodyCenter(cat), mc = g.bodyCenter(me);
    me.p[0] += cc[0] - mc[0]; me.p[1] += cc[1] - mc[1]; g.update(.04); readAll(); g.update(2.1);
  }
  assert.equal(g.adv.done, true, 'three catches end the story'); assert.equal(g.adv.found, g.adv.total);
  assert.equal(g.getStars().every(s => s.shard === undefined), true, 'stars return for free roam');
  g.render();
  console.log('Adventure passed: intro scene, shard pickups, door locks, wanderer guard, street chase, cat finale and free roam.');
  console.log('Game integration passed: character selection, countdown, targets, pause, all three rounds, trick physics hooks, standings, rendering and free-roam return.');
  console.log('Cat passed: direct selection, size, animation rendering, ring pickups, parkour landings, freestyle tricks and character-cycle wrap.');
});
