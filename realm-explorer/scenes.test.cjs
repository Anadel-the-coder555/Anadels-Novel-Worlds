// Plays every live game start to finish with a simple bot, checking each one runs, scores and ends.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const drawing = new Proxy({ measureText: t => ({ width: t.length * 7 }), createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }) },
  { get: (o, k) => o[k] || (() => {}) });
function element() {
  return { style: {}, dataset: {}, hidden: false, classList: { add() {}, remove() {}, toggle() {} }, append() {}, setAttribute() {}, addEventListener() {}, focus() {},
    querySelector: () => element(), querySelectorAll: () => [], getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 540 }) };
}
const handlers = {};
const sheet = { img_: { width: 1164, height: 357 }, frames: 4, fw: 291, fh: 357, ax: 155, h: 200 };
const sandbox = { Math, Number, String, Object, Array, Set, JSON,
  matchMedia: () => ({ matches: false }), Image: class { set src(v) { this.source = v; } },   // no scene pictures yet: everything uses stand-ins
  document: { getElementById: element, createElement: element }, addEventListener: (k, f) => { handlers[k] = f; } };
sandbox.window = sandbox;
vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'scenes.js'), 'utf8'), sandbox);
const E = sandbox.EmberScenes, T = E._test;
const cast = ['Ember', 'Lila-Bella', 'Icy-Blue Prince', 'Ivory & Gold Prince'].map((name, who) => ({ name, who, sheet, face: { sheet, box: [176, 44, 76] } }));

const near = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function bot(S, g) {
  const p = S.player, aim = (x, y) => { p.tx = x; p.ty = Math.max(y, S.by0); };
  if (g.kind === 'gather') {
    if (g.tools && S.items.length) { const o = S.items.find(i => !i.dead && !i.bad); if (o && p.tool !== o.tool) { const st = S.stations.find(s => s.id === o.tool); return aim(st.x, S.by0); } }
    const o = S.items.filter(i => !i.dead && !i.bad && (!g.tools || i.tool === p.tool)).sort((a, b) => near(p, a) - near(p, b))[0];
    if (o) aim(o.x, o.y);
  } else if (g.kind === 'chase') {
    const f = S.fox; if (!f.hidden) aim(f.x, f.y); else aim(f.hidden.x, f.hidden.y);
  } else if (g.kind === 'cook') {
    const s = S.dishes[S.di].steps[S.step] || {};
    if (S.wait > 0) return;
    if (s.add) { if (p.holding?.id === s.add) aim(S.bowl.x, S.bowl.y - 20); else aim(S.bins.find(b => b.id === s.add).x, S.by0); }
    else if (s.do) { aim(S.bowl.x - 60, S.bowl.y - 10); if (near(p, S.bowl) < 140) T.press('act'); }
    else if (s.time) { aim(S.oven.x - 40, S.oven.y - 10); const v = (1 - Math.cos(S.needle * 2.4)) / 2; if (near(p, S.oven) < 140 && v > .45 && v < .55) T.press('act'); }
  } else if (g.kind === 'serve') {
    const c = S.pool.filter(c => !c.off && c.state === 'wait').sort((a, b) => a.patience - b.patience)[0];
    if (!c) return;
    const need = c.order.find(i => !i.done && !(p.hands || []).some(h => h.id === i.id));
    const useful = (p.hands || []).some(h => c.order.some(i => !i.done && i.id === h.id));
    if (need && ((p.hands || []).length < 2 || !useful)) aim(S.shelves.find(s => s.id === need.id).x, S.by0); else aim(c.x - 30, c.y);
  } else if (g.kind === 'care') {
    const an = S.animals.filter(a => a.need).sort((a, b) => a.needT - b.needT)[0];
    if (!an) return;
    if (p.tool !== an.need.id) { const st = S.stations.find(s => s.id === an.need.id); aim(st.x, S.by0); } else aim(an.x - 30, an.y);
  } else if (g.kind === 'rhythm') {
    for (const n of S.notes) if (!n.done && Math.abs(n.t - S.song) < .03) T.press(['l', 'u', 'd', 'r'][n.lane]);
  } else if (g.kind === 'riddle') {
    if (S.reader?.state !== 'wait' || S.solved || S.cands.length > 1) return;
    const b = S.cands[0]; if (p.tx == null && Math.abs(p.x - b.x) < 6 && p.y < S.by0 + 4) T.press('act'); else aim(b.x, S.by0);
  } else if (g.kind === 'pairs') {
    const shut = S.boxes.filter(b => !b.gone && !b.open && !b.move && b.shoe);
    const t = p.opened.length ? shut.find(b => b.shoe === p.opened[0].shoe) : shut.find(b => shut.some(o => o !== b && o.shoe === b.shoe));
    if (!t || p.flipT > 0) return;
    const sx = t.x + (p.x < t.x ? -54 : 54);
    if (p.tx == null && Math.abs(p.x - sx) < 6 && Math.abs(p.y - t.y - 4) < 8) T.press('act'); else aim(sx, t.y + 4);
  } else if (g.kind === 'herd') {
    const t = S.toys.filter(o => !o.packed).sort((a, b) => near(p, a) - near(p, b))[0]; if (!t) return;
    const dx = t.x - S.chest.x, dy = (t.y - S.chest.y) * 1.6, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
    const bx = t.x + ux * 72, by = t.y + uy * 72 / 1.6, ahead = (p.x - t.x) * ux + (p.y - t.y) * 1.6 * uy;
    if (ahead > 25 && Math.hypot(p.x - bx, (p.y - by) * 1.6) < 70) aim(S.chest.x, S.chest.y); else if (ahead < 25) aim(bx - uy * 90, by + ux * 90 / 1.6); else aim(bx, by);
  } else if (g.kind === 'buttons') {
    if (S.reader?.state !== 'wait' || S.solved) return;
    const b = S.target; if (near(p, b) < 6) T.press('act'); else aim(b.x, b.y);
  } else if (g.kind === 'trace') {
    if (S.path && !S.done) { const q = S.path[Math.min(S.path.length - 1, S.at + 4)]; aim(q[0], q[1]); }
  } else if (g.kind === 'runner') {
    const ahead = S.items.filter(o => o.x > 230 && o.x < 420);
    if (g.mode === 'boat') {
      const bad = new Set(ahead.filter(o => o.bad).map(o => o.lane)), good = ahead.find(o => !o.bad && !bad.has(o.lane));
      const want = good ? good.lane : [0, 1, 2].find(l => !bad.has(l));
      if (want != null && want !== S.lane) T.press(want < S.lane ? 'u' : 'd');
    } else if (ahead.some(o => o.bad && o.x < 340) && !S.z) T.press('act');
  }
}

let games = 0;
for (const [key, hub] of Object.entries(E.HUBS)) {
  E.start(key, { cast, backdrop: { img: { width: 2172, height: 724 }, at: .5 } });
  assert(E.active(), `${key} starts`);
  if (hub.greet) {   // a shop: say hello first, then the owner greets you and offers the game
    assert.equal(T.state().phase, 'greet', `${key} waits for a hello`);
    T.sayHello();
    assert.equal(T.state().player.bubble.text, `Hello, ${T.state().host.name}!`);
    for (let t = 0; t < 2; t += 1 / 30) E.update(1 / 30);
    assert.equal(T.state().phase, 'offer', `${key}: the owner offers the game`);
    assert.equal(T.state().host.bubble.text, hub.greet);
  } else if (hub.games.length > 1) assert.equal(T.state().phase, 'menu', `${key} offers a choice`);
  for (const g of hub.games) {
    T.choose(g);
    const S = T.state();
    assert.equal(S.phase, 'intro');
    assert.equal(S.player.name, 'Ember', 'the leader plays');
    let t = 0;
    while (T.state().phase !== 'done' && t < 240) { bot(T.state(), g); E.update(1 / 30); E.render(drawing); t += 1 / 30; }
    const end = T.state();
    assert.equal(end.phase, 'done', `${g.id} finishes (ran ${t.toFixed(0)}s)`);
    const score = { gather: () => end.player.score, chase: () => end.player.score, cook: () => end.di + 1, serve: () => end.served, care: () => end.cared,
      rhythm: () => end.hits.perfect + end.hits.good, runner: () => end.points,
      riddle: () => end.player.score, pairs: () => end.player.score, herd: () => end.packed, buttons: () => end.player.score, trace: () => Math.round(end.cuts.reduce((s, c) => s + c.score, 0) / end.cuts.length) }[g.kind]();
    assert(score > 0, `${g.id} can be scored (${score})`);
    if (g.kind === 'rhythm') assert(end.hits.perfect > end.notes.length * .8, `${g.id}: perfect timing scores perfects`);
    const others = end.actors.filter(a => a !== end.player && a.score > 0);
    console.log(`  ${key} › ${g.id} (${g.kind}): ${score} in ${t.toFixed(0)}s${others.length ? `, friends scored too: ${others.map(a => `${a.name} ${a.score}`).join(', ')}` : ''}`);
    games++;
  }
  handlers.keydown({ key: 'Escape', preventDefault() {} });
  assert(!E.active(), `${key}: Esc leaves`);
}
// the leader can be anyone: a prince leading the villa dance gets Ember opposite him
E.start('villa-dance', { cast: [cast[2], cast[0], cast[1], cast[3]] });
assert.equal(T.state().player.name, 'Icy-Blue Prince'); assert.equal(T.state().partner.name, 'Ember');
E.close();
E.start('villa-dance', { cast });
assert.equal(T.state().partner.name, 'Cashamir');
E.close();
console.log(`Passed all ${games} live games across ${Object.keys(E.HUBS).length} hubs: each starts, plays with the party, scores and ends; Esc leaves.`);
