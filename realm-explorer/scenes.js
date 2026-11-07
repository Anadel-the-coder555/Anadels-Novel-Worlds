// Live games on the stage: the party plays together in the scene itself instead of in a pop-up.
// game.js hands the canvas over while a game runs (EmberScenes.update / render) and takes it back on leave.
// The leader is the player; everyone else in the party joins in: racing for berries, fetching from the
// pantry, dancing opposite, riding alongside or coming into the shop as customers.
//
// Pictures: a game shows scenes/<game id>.jpg if it exists (else scenes/<hub key>.jpg, else the place you came
// from), and each helper shows scenes/<their name>.png, standing on the floor, until then a painted stand-in.
// Animals look for scenes/<name>.png too. Any size works: backdrops are cropped to fill the stage.
(() => {
'use strict';
const VW = 960, VH = 540;
const FY0 = 382, FY1 = 524;      // the floor the characters walk on: back edge to front edge (y of their feet)
const reduceMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const weighted = list => { let n = list.reduce((s, i) => s + (i.weight || 1), 0) * Math.random(); for (const i of list) if ((n -= i.weight || 1) < 0) return i; return list[0]; };
const listNames = items => { const n = items.map(o => o.label.toLowerCase()); return n.length < 2 ? n.join('') : `${n.slice(0, -1).join(', ')} and ${n.at(-1)}`; };
const slug = s => s.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');
const scaleAt = y => .72 + clamp((y - FY0) / (FY1 - FY0), 0, 1) * .28;   // further back is a little smaller
const STAND = 1.4;   // people on their feet, sized against the painted rooms (riders and rowers keep their own size)
const EMOJI = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const UI = '"Alegreya Sans",sans-serif', TITLE = '"IM Fell English SC",Georgia,serif';

// ---- sound: tiny synth notes, no files ----
let audio = null;
function tone(freq, dur = .3, type = 'triangle', vol = .14, when = 0) {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const t0 = audio.currentTime + when, o = audio.createOscillator(), v = audio.createGain();
    o.type = type; o.frequency.value = freq;
    v.gain.setValueAtTime(0, t0); v.gain.linearRampToValueAtTime(vol, t0 + .01); v.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    o.connect(v).connect(audio.destination); o.start(t0); o.stop(t0 + dur + .05);
  } catch (_) { /* no sound available */ }
}
const pling = () => tone(1046, .18, 'sine', .08);
const boop = () => tone(180, .2, 'sine', .1);
const tick = () => tone(1800, .05, 'square', .02);
const chime = () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, .5, 'sine', .08, i * .08));
const piano = f => { tone(f, 1, 'triangle', .18); tone(f * 2, .5, 'sine', .04); };

// ---- pictures: try once, use when loaded ----
const pics = {};
function pic(src) {
  if (!src) return null;
  if (!(src in pics)) { pics[src] = null; try { const im = new Image(); im.onload = () => { pics[src] = im; }; im.src = src; } catch (_) {} }
  return pics[src];
}

// ---- the people who aren't in the party (stand-ins until their pictures arrive) ----
const NPC = {
  evelynn: { name: 'Evelynn', img: 'evelynn.png', h: 228 },
  annalise: { name: 'Annalise', colour: '#b3283a', hair: '#2a1d18', h: 228 },
  bramble: { name: 'Old Bramble', colour: '#6d7f4a', hair: '#e8e4da', coat: true },
  marigold: { name: 'Mistress Marigold', colour: '#efe6d2', hair: '#b5552e' },
  aldous: { name: 'Sir Aldous', colour: '#3c4f7a', hair: '#a8a8a8', coat: true },
  tobias: { name: 'Master Tobias', colour: '#8a6a43', hair: '#4a3020', coat: true },
  lorelei: { name: 'Lorelei', colour: '#6f8fbf', hair: '#b5552e', h: 228 },
  eason: { name: 'Eason', colour: '#2f4a86', hair: '#e8dcc0', coat: true, h: 228 },
  leighton: { name: 'Leighton', colour: '#7a4a2a', hair: '#2e2018', coat: true, h: 228 },
  benton: { name: 'Benton', colour: '#6a4028', hair: '#4a3020', coat: true, h: 228 },
  mabel: { name: 'Mabel', colour: '#4f6aa0', hair: '#8b5a2b' },
  fennimore: { name: 'Director Fennimore', colour: '#5a2d4a', hair: '#222', coat: true },
  herald: { name: 'The Herald', colour: '#b0443c', hair: '#e2c56a', coat: true },
  pella: { name: 'Pella', colour: '#7f9a5a', hair: '#5b3a22' },
  rosie: { name: 'Rosie', colour: '#e4a0b5', hair: '#d9b35c' },
  tom: { name: 'Tom the baker', colour: '#c9b48a', hair: '#5a3a1a', coat: true },
  clara: { name: 'Clara', colour: '#8fb1d6', hair: '#3a2a20' },
  hettie: { name: 'Old Hettie', colour: '#9a8aa8', hair: '#ddd' },
  jasper: { name: 'Jasper', colour: '#a35b3c', hair: '#222', coat: true },
  posy: { name: 'Little Posy', colour: '#f2c46b', hair: '#a0522d', h: 140 },
  duchess: { name: 'The Duchess of Fernhill', colour: '#6a4c8c', hair: '#d8d0c0' },
  lord: { name: 'Lord Ashby', colour: '#2f4a3c', hair: '#6b4a2e', coat: true },
};
const npc = key => { const d = NPC[key]; return { ...d, img: d.img || `scenes/${slug(d.name)}.png` }; };

// ---- runtime state ----
let S = null, hub = null, hubKey = '', opts = {}, ctx = null, ui = null;
const inp = { l: 0, r: 0, u: 0, d: 0 };

function makeActor(def, x, y, extra = {}) {
  return Object.assign({ name: def.name, who: def.who, sheet: def.sheet || null, face: def.face || null, img: def.img || null,
    h: def.h || 188, colour: def.colour || '#9d7bb0', hair: def.hair || '#6b4a2e', coat: !!def.coat,
    x, y, tx: null, ty: null, facing: 1, dist: 0, moving: false, speed: 205, carry: [], bubble: null,
    stun: 0, hop: 0, spin: 0, dip: 0, slideT: 0, score: 0, think: rand(0, .4), off: false }, extra);
}
function setupCast(g) {
  const cast = opts.cast || [];
  S.player = makeActor(cast[0] || { name: 'Ember' }, 300, 482, { speed: 275, isPlayer: true });
  S.mates = cast.slice(1).map((c, i) => makeActor(c, 560 + i * 150, i % 2 ? 500 : 440));
  S.mates.forEach(m => { m.facing = -1; });
  const hostKey = g ? g.host : hub.host;
  S.host = hostKey ? makeActor(npc(hostKey), 870, 430, { facing: -1, speed: 160 }) : null;
  S.actors = [S.player, ...S.mates, ...(S.host ? [S.host] : [])];
}
// the walker the game wants opposite the player (Cashamir for the villa), never the player themself
function partnerFor(g) {
  if (typeof g.partner === 'string') { const a = makeActor(npc(g.partner), 740, 488, { facing: -1 }); S.actors.push(a); return a; }
  const p = S.mates.find(m => m.who === (g.partner ?? 2)) || S.mates[0];
  if (p && g.partnerName && p.who === (g.partner ?? 2)) p.name = g.partnerName;
  return p;
}
const voice = () => S.host || S.partner || S.mates[0] || S.player;

// ---- speech bubbles, floating text and sparkles ----
function talk(a, text, dur = 3) {
  if (!a || !text) return;
  a.bubble = { text, t: dur };
  if (ui) ui.live.textContent = `${a.name}: ${text}`;
}
function floatText(x, y, text, colour = '#fff4c2', size = 22) { S.fx.push({ x, y, vx: 0, vy: -46, age: 0, life: .95, text, colour, size }); }
function burst(x, y, colour = '#ffe9a8', n = 8, icon) {
  if (reduceMotion) return;
  for (let i = 0; i < n; i++) { const a = rand(0, Math.PI * 2), v = rand(60, 170); S.fx.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, g: 260, age: 0, life: rand(.5, .9), colour, r: rand(2, 4.5), icon }); }
}
const cheerAll = () => S.actors.forEach(a => { if (!a.off) a.hop = .45 + rand(0, .1); });

// ================= the engines =================
// Each game names a `kind`; its engine sets the scene up, runs it, draws its props and HUD.
// setup(g) · update(g, dt) · draw(g, add) puts props in depth order · back(g)/front(g) paint under/over everyone
// hud(g) · press(g, key) for 'l','r','u','d','act' (true = used) · tap(g, x, y) (true = used)

function nearFeet(a, x, y, rx = 42, ry = 26) { return Math.abs(a.x - x) < rx * scaleAt(a.y) && Math.abs(a.y - y) < ry; }
// up against the back counter, and not stepping away from it (so walking off doesn't grab the next bin along)
const atCounter = a => a.y < FY0 + 22 && !(a.vy > 0);
function goTo(a, x, y) { a.tx = clamp(x, S.bx0, S.bx1); a.ty = clamp(y, S.by0, S.by1); }
function wander(a) { goTo(a, rand(S.bx0 + 20, S.bx1 - 20), rand(S.by0 + 6, S.by1 - 6)); }
function standsAt(a, x, y) { a.x = x; a.y = y; a.tx = a.ty = null; }

// tool stations along the back, like the kitchen bins: the gardening tools, the hay and brushes
function stationsFrom(tools) { return tools.map((tl, i) => ({ ...tl, x: 76 + i * 92, y: FY0 - 4 })); }
const toStation = (a, st) => goTo(a, st.x, FY0 + 6);
function takeTools(people) {
  for (const a of people) for (const st of S.stations) {
    if (a.tool !== st.id && atCounter(a) && Math.abs(a.x - st.x) < 36) {
      a.tool = st.id; a.carry = [st.icon];
      if (a === S.player) { tick(); floatText(a.x, a.y - 210 * STAND * scaleAt(a.y), st.label, '#fff', 16); }
    }
  }
}
function drawStation(st, active) {
  ctx.save();
  ctx.fillStyle = active ? 'rgba(255,236,170,.95)' : 'rgba(246,234,208,.92)'; ctx.strokeStyle = 'rgba(58,42,26,.45)'; ctx.lineWidth = 2;
  rr(st.x - 36, st.y - 60, 72, 56, 10); ctx.fill(); ctx.stroke();
  emoji(st.icon, st.x, st.y - 34, 30);
  label(st.label, st.x, st.y + 12, 12);
  ctx.restore();
}

// --- GATHER: everyone races round the scene for berries, fireflies, falling treats or peeking animals ---
// mode 'ground' things appear on the floor · 'fall' they drop from above (stand under the shadow) ·
// 'float' they drift above the floor · 'peek' animals peep out from bushes. `team` adds everyone's
// catches together instead of a race; `tools` must be carried to the right job (the royal gardens).
const BANTER = ['Mine!', 'Got one!', 'Too slow!', 'Ooh, a good one!', 'Ha! Beat you to it.', 'Over here!', 'Another!'];
const gather = {
  setup(g) {
    S.items = []; S.spawn = .2; S.left = g.time; S.found = new Set(); S.combo = 0; S.comboT = 0; S.hintT = 0;
    S.players = [S.player, ...S.mates.slice(0, g.rivals ?? 3)];
    S.mates.slice(g.rivals ?? 3).forEach(m => { m.off = true; });
    S.players.forEach((a, i) => { if (i) a.speed = (g.mateSpeed || 205) - i * 8; });
    if (g.tools) S.stations = stationsFrom(g.tools);
    if (g.mode === 'peek') S.spots = [[175, 410], [345, 468], [520, 402], [700, 472], [860, 414], [250, 516], [610, 520]]
      .map(([x, y], i) => ({ x, y, bush: (g.cover || ['🌳', '🌲', '🌿'])[i % (g.cover || [0, 0, 0]).length] }));
  },
  spawnItem(g) {
    const it = weighted(g.items), o = { ...it, age: 0, life: g.life || 6, pts: it.points || 1 };
    if (g.mode === 'peek') {
      const free = S.spots.filter(s => !S.items.some(i => i.spot === s && !i.dead));
      if (!free.length) return;
      o.spot = pick(free); o.x = o.spot.x; o.y = o.spot.y - 1;
    } else { o.x = rand(S.bx0 + 30, S.bx1 - 30); o.y = rand(FY0 + 8, FY1 - 6); }
    if (g.mode === 'fall') { o.z = rand(440, 520); o.vz = rand(150, 200) * (1 + (1 - S.left / g.time) * .45); o.life = 99; }
    if (g.mode === 'float') { o.z = rand(60, 130); o.ph = rand(0, 7); o.bx = o.x; o.by = o.y; }
    S.items.push(o);
  },
  update(g, dt) {
    if (S.phase !== 'play') return;
    S.left -= dt; S.hintT -= dt; S.comboT -= dt;
    if (S.left <= 0) return endRace(g);
    S.spawn -= dt;
    if (S.spawn <= 0) { if (S.items.filter(i => !i.dead).length < g.max) gather.spawnItem(g); S.spawn = g.every * rand(.7, 1.3); }
    for (const o of S.items) {
      o.age += dt;
      if (o.dead) { o.fade -= dt; continue; }
      if (g.mode === 'fall') { o.z -= o.vz * dt; if (o.z <= 0) { o.z = 0; o.dead = true; o.fade = .5; } }
      else if (o.age > o.life) { o.dead = true; o.fade = .35; }
      if (g.mode === 'float') { o.x = clamp(o.bx + Math.sin(o.age * 1.2 + o.ph) * 34, S.bx0, S.bx1); o.y = clamp(o.by + Math.cos(o.age * .9 + o.ph) * 16, FY0, FY1); }
    }
    S.items = S.items.filter(o => !o.dead || o.fade > 0);
    if (S.stations) takeTools(S.players);
    for (const a of S.players) {
      if (a.stun > 0) continue;
      for (const o of S.items) {
        if (o.dead || (g.mode === 'fall' && o.z > 120) || (g.mode === 'peek' && o.age < .3)) continue;
        if (nearFeet(a, o.x, o.y, g.mode === 'peek' ? 60 : 44)) gather.touch(g, a, o);
      }
    }
    S.players.forEach((a, i) => { if (i) gather.think(g, a, dt); });
  },
  touch(g, a, o) {
    if (o.tool && a.tool !== o.tool) {
      if (a === S.player && S.hintT <= 0) { talk(voice(), o.hint, 2.6); S.hintT = 3.5; }
      return;
    }
    o.dead = true; o.fade = .25;
    const top = o.y - (o.z || 0) - 70;
    if (o.bad) {
      a.score = Math.max(0, a.score - 1); a.stun = .8; boop();
      floatText(o.x, top, '−1', '#ffb0a0');
      if (a === S.player) { S.combo = 0; if (o.say) talk(voice(), o.say, 2.4); }
      else if (Math.random() < .5) talk(a, pick(['Ow!', 'Eek!', 'Not again!']), 1.4);
      return;
    }
    let pts = o.pts;
    if (a === S.player) {
      S.combo = S.comboT > 0 ? S.combo + 1 : 1; S.comboT = 1.4;
      const m = S.combo >= 6 ? 3 : S.combo >= 3 ? 2 : 1; pts *= m;
      floatText(o.x, top, m > 1 ? `+${pts} ×${m}` : `+${pts}`); pling();
    } else {
      floatText(o.x, top, `+${pts}`, '#d9ecff', 18);
      if (!g.team && Math.random() < .22) talk(a, pick(BANTER), 1.4);
    }
    a.score += pts; a.hop = .45;
    burst(o.x, top + 30, g.night ? '#fff6b0' : '#ffe9a8', 7);
    if (g.journal && !S.found.has(o.label)) { S.found.add(o.label); talk(a === S.player ? voice() : a, `${o.say} New in the journal!`, 2.8); }
    else if (o.say && a === S.player && Math.random() < .45) talk(voice(), o.say, 2.2);
  },
  think(g, a, dt) {
    a.think -= dt;
    if (a.think > 0) return;
    a.think = rand(.3, .65);
    let best = null, bd = 1e9;
    for (const o of S.items) {
      if (o.dead || o.bad) continue;
      let d = Math.hypot(o.x - a.x, (o.y - a.y) * 1.5);
      const time = d / a.speed;
      if (g.mode === 'fall' ? time > o.z / o.vz + .15 : time > o.life - o.age) continue;     // can't get there in time
      if (S.players.some(b => b !== a && b !== S.player && b.goal === o)) d += 320;        // friends spread out
      if (o.tool && a.tool !== o.tool) d += 250;
      if (d < bd) { bd = d; best = o; }
    }
    a.goal = best;
    if (best && best.tool && a.tool !== best.tool) toStation(a, S.stations.find(s => s.id === best.tool));
    else if (best) goTo(a, best.x + rand(-6, 6), best.y);
    else if (a.tx == null && Math.random() < .4) wander(a);
  },
  draw(g, add) {
    if (S.stations) S.stations.forEach(st => add(st.y, () => drawStation(st, S.player.tool === st.id)));
    if (S.spots) S.spots.forEach(s => add(s.y + 3, () => emoji(s.bush, s.x, s.y - 44 * scaleAt(s.y), 96 * scaleAt(s.y))));
    for (const o of S.items) add(o.y - (g.mode === 'peek' ? 1 : 0), () => drawPickup(g, o));
  },
  hud(g) { drawBoard(S.players, g.team ? `Together: ${S.players.reduce((s, a) => s + a.score, 0)}` : null, g.scoreIcon); },
};
function drawPickup(g, o) {
  const k = scaleAt(o.y);
  let alpha = o.dead ? clamp(o.fade / .35, 0, 1) : 1;
  if (!o.dead && g.mode !== 'fall' && o.life - o.age < 1) alpha *= .55 + .45 * Math.abs(Math.sin(o.age * 12));   // blinking: about to go
  ctx.save(); ctx.globalAlpha = alpha;
  if (g.mode === 'fall') {
    const near = 1 - clamp(o.z / 480, 0, 1);
    ctx.fillStyle = `rgba(30,20,10,${.12 + near * .25})`; ctx.beginPath(); ctx.ellipse(o.x, o.y, 10 + near * 16, 4 + near * 4, 0, 0, 7); ctx.fill();
    emoji(o.icon, o.x, o.y - o.z - 24, 34 * k);
  } else if (g.mode === 'float') {
    const y = o.y - o.z, glow = .55 + .45 * Math.sin(o.age * 6 + o.ph);
    if (!o.bad) { const gr = ctx.createRadialGradient(o.x, y, 1, o.x, y, 34); gr.addColorStop(0, `rgba(255,246,170,${.75 * glow})`); gr.addColorStop(1, 'rgba(255,246,170,0)'); ctx.fillStyle = gr; ctx.fillRect(o.x - 34, y - 34, 68, 68); }
    ctx.fillStyle = 'rgba(30,20,10,.12)'; ctx.beginPath(); ctx.ellipse(o.x, o.y, 9, 3, 0, 0, 7); ctx.fill();
    emoji(o.icon, o.x, y, 24 * k);
  } else if (g.mode === 'peek') {
    const up = clamp(o.age / .3, 0, 1) * (o.life - o.age < .3 ? clamp((o.life - o.age) / .3, 0, 1) : 1);
    emoji(o.icon, o.x + Math.sin(o.age * 3) * 6, o.y - (44 + 62 * up) * k, 58 * k);
  } else {
    ctx.fillStyle = 'rgba(30,20,10,.22)'; ctx.beginPath(); ctx.ellipse(o.x, o.y, 16 * k, 5 * k, 0, 0, 7); ctx.fill();
    emoji(o.icon, o.x, o.y - 24 * k - Math.abs(Math.sin(o.age * 3)) * 5, 44 * k);
  }
  ctx.restore();
}
function endRace(g) {
  const total = g.team ? S.players.reduce((s, a) => s + a.score, 0) : S.player.score;
  const ranked = [...S.players].sort((a, b) => b.score - a.score);
  let text = g.doneText(total, S.found);
  if (!g.team && ranked.length > 1) {
    const top = ranked[0];
    if (top === S.player) { text += ' You won the round!'; talk(ranked[1], pick(['Rematch!', 'Next time…', 'No fair, you’re fast!'])); }
    else { text += ` ${top.name} won this one. Rematch?`; talk(top, pick(['I win!', 'Ha! Champion!', 'Again?'])); }
  }
  results({ icon: g.doneIcon, title: g.doneTitle(total), text, stats: ranked.map(a => `${a.name}: ${a.score}`) });
}

// --- CHASE: catch the fox, who flees and dives into leaf piles; search the piles to find him ---
const chase = {
  setup(g) {
    S.left = g.time;
    S.players = [S.player, ...S.mates.slice(0, g.rivals ?? 1)];
    S.mates.slice(g.rivals ?? 1).forEach(m => { m.off = true; });
    S.players.forEach((a, i) => { if (i) a.speed = 215; });
    S.piles = [[170, 410], [360, 502], [520, 404], [700, 492], [855, 420]].map(([x, y]) => ({ x, y, tx: x, ty: y, shake: 0, cool: 0 }));
    S.fox = { x: 640, y: 450, facing: -1, hidden: null, hideT: 0, sneak: rand(4, 7), run: 0 };
  },
  update(g, dt) {
    for (const p of S.piles) { p.x = lerp(p.x, p.tx, Math.min(1, dt * 3)); p.y = lerp(p.y, p.ty, Math.min(1, dt * 3)); p.shake = Math.max(0, p.shake - dt); p.cool = Math.max(0, p.cool - dt); }
    if (S.phase !== 'play') return;
    S.left -= dt;
    if (S.left <= 0) return endRace(g);
    const f = S.fox;
    if (f.hidden) {
      f.hideT -= dt;
      if (Math.random() < dt * 1.1) f.hidden.shake = .3;   // the pile he's in rustles now and then
      if (f.hideT <= 0) { f.x = f.hidden.x; f.y = f.hidden.y; f.hidden = null; leaves(f.x, f.y); f.sneak = rand(4, 8); }
    } else {
      let vx = Math.cos(S.t * .8) * .5, vy = Math.sin(S.t * 1.3) * .5;
      for (const a of S.players) {
        const dx = f.x - a.x, dy = (f.y - a.y) * 1.6, d = Math.hypot(dx, dy) || 1;
        if (d < 290) { const w = (290 - d) / 290 * 2.2; vx += dx / d * w; vy += dy / d * w; }
      }
      if (f.x < 140) vx += 1.6; if (f.x > 820) vx -= 1.6; if (f.y < FY0 + 24) vy += 1.4; if (f.y > FY1 - 18) vy -= 1.4;
      const m = Math.hypot(vx, vy) || 1;
      f.run += dt;
      const sp = g.foxSpeed * (f.run % 3 < 2.3 ? 1 : .55);   // he tires for a moment every few seconds
      f.x = clamp(f.x + vx / m * sp * dt, 50, 910); f.y = clamp(f.y + vy / m * sp * .62 * dt, FY0, FY1);
      if (Math.abs(vx) > .15) f.facing = Math.sign(vx);
      f.sneak -= dt;
      if (f.sneak <= 0) {
        const p = S.piles.reduce((b, q) => Math.hypot(q.x - f.x, q.y - f.y) < Math.hypot(b.x - f.x, b.y - f.y) ? q : b);
        if (Math.hypot(p.x - f.x, p.y - f.y) < 170) { f.hidden = p; f.hideT = rand(2.5, 4.5); leaves(p.x, p.y); } else f.sneak = .4;
      }
      for (const a of S.players) if (a.stun <= 0 && nearFeet(a, f.x, f.y, 44, 26)) { chase.caught(a, 1, 'Tag!'); break; }
    }
    for (const a of S.players) for (const p of S.piles) {
      if (p.cool > 0 || !nearFeet(a, p.x, p.y, 46, 24)) continue;
      p.cool = 1.2; p.shake = .4; leaves(p.x, p.y);
      if (f.hidden === p) chase.caught(a, 2, 'Found him!');
      else if (a === S.player && Math.random() < .5) talk(a, 'Just leaves!', 1.2);
    }
    S.players.forEach((a, i) => { if (i) chase.think(a, dt); });
  },
  caught(a, pts, shout) {
    const f = S.fox;
    a.score += pts; a.hop = .45; floatText(f.x, f.y - 90, `+${pts} ${shout}`); burst(f.x, f.y - 30, '#ffcf8a', 10);
    a === S.player ? pling() : talk(a, shout, 1.4);
    f.hidden = pick(S.piles); f.hideT = rand(2, 3.5); f.sneak = rand(4, 7);
    const spots = shuffle(S.piles.map(p => [p.tx, p.ty]));
    S.piles.forEach((p, i) => { [p.tx, p.ty] = spots[i]; });   // the piles shuffle about
  },
  think(a, dt) {
    a.think -= dt; if (a.think > 0) return;
    a.think = rand(.25, .5);
    const f = S.fox;
    if (!f.hidden) goTo(a, f.x + f.facing * 40, f.y);
    else { const rustling = S.piles.find(p => p.shake > 0); goTo(a, ...(rustling && Math.random() < .45 ? [rustling.x, rustling.y] : (p => [p.x, p.y])(pick(S.piles)))); }
  },
  draw(g, add) {
    S.piles.forEach(p => add(p.y, () => {
      const k = scaleAt(p.y), s = p.shake > 0 ? Math.sin(S.t * 50) * 4 : 0;
      emoji('🍂', p.x - 26 * k + s, p.y - 22 * k, 52 * k); emoji('🍂', p.x + 24 * k - s, p.y - 20 * k, 50 * k); emoji('🍁', p.x + s, p.y - 44 * k, 52 * k);
    }));
    const f = S.fox;
    if (!f.hidden) add(f.y, () => {
      const k = scaleAt(f.y);
      ctx.fillStyle = 'rgba(30,20,10,.25)'; ctx.beginPath(); ctx.ellipse(f.x, f.y, 26 * k, 6 * k, 0, 0, 7); ctx.fill();
      emoji('🦊', f.x, f.y - 26 * k - Math.abs(Math.sin(S.t * 14)) * 6, 56 * k, f.facing > 0);
    });
  },
  hud() { drawBoard(S.players, null, '🦊'); },
};
function leaves(x, y) { burst(x, y - 20, '#d98a3a', 9); }

// --- COOK: a recipe made together. Fetch from the bins on the back counter, carry it to the bowl;
// mash Space (or tap the bowl) to stir; stop the oven needle in the gold. A friend fetches some things too.
const cook = {
  setup(g) {
    S.dishes = shuffle(g.dishes); S.di = 0; S.step = 0; S.clock = 0; S.slips = 0; S.wait = 0; S.adds = 0; S.bowlIn = []; S.hintT = 0;
    const n = g.pantry.length;
    S.bins = g.pantry.map(([id, icon, label], i) => ({ id, icon, label, x: lerp(66, 894, i / (n - 1)), y: FY0 - 4 }));
    S.bowl = { x: 410, y: 500 }; S.oven = { x: 690, y: 492 };
    S.by0 = FY0 + 6;
    standsAt(S.player, 300, 470);
    S.mates.forEach((m, i) => standsAt(m, 500 + i * 70, 440 + i * 30));
    if (S.host) standsAt(S.host, 885, 470);
    cook.begin(g);
  },
  dish: () => S.dishes[S.di],
  stepNow: () => S.dishes[S.di].steps[S.step] || {},
  begin(g) {
    const s = cook.stepNow();
    S.count = 0; S.needle = 0; S.helper = null; S.stepT = 0; S.stirT = 0;
    S.mates.forEach(m => { m.holding = null; m.carry = []; });
    talk(voice(), s.say || s.text, 3);
    if (s.add) {
      S.adds++;
      if (S.mates.length && S.adds % 3 === 0) {   // every third thing, a friend dashes to fetch it
        const h = S.mates[(S.adds / 3) % S.mates.length | 0], bin = S.bins.find(b => b.id === s.add);
        S.helper = h; goTo(h, bin.x, FY0 + 8);
        talk(h, `I'll get the ${bin.label.toLowerCase()}!`, 2);
      }
    }
  },
  update(g, dt) {
    if (S.phase !== 'play') return;
    S.clock += dt; S.stepT += dt; S.hintT -= dt;
    if (S.wait > 0) { S.wait -= dt; if (S.wait <= 0) cook.next(g); return; }
    const s = cook.stepNow(), people = [S.player, ...S.mates];
    for (const a of people) {           // standing at the back counter picks up whatever's in front of you
      if (!atCounter(a)) continue;
      const bin = S.bins.find(b => Math.abs(b.x - a.x) < 30);
      if (bin && a.holding !== bin && (a === S.player || bin.id === s.add)) { a.holding = bin; a.carry = [bin.icon]; if (a === S.player) tick(); }
    }
    for (const a of people) {           // and walking up to the bowl tips it in
      if (!a.holding || Math.hypot(a.x - S.bowl.x, (a.y - S.bowl.y) * 1.5) > 80) continue;
      const b = a.holding; a.holding = null; a.carry = [];
      if (s.add === b.id) {
        S.bowlIn.push(b.icon); pling(); burst(S.bowl.x, S.bowl.y - 50, '#fff2c8', 6);
        if (a === S.player) talk(voice(), pick(g.praise), 1.4); else talk(a, pick(['Here you go!', 'In it goes!', 'Got it!']), 1.4);
        return cook.advance(g);
      }
      if (a === S.player) { boop(); S.slips++; talk(voice(), `Not the ${b.label.toLowerCase()} just yet. We need the ${S.bins.find(x => x.id === s.add)?.label.toLowerCase() || 'next thing'}!`, 2.6); }
    }
    if (s.add && S.helper && S.helper.tx == null) goTo(S.helper, ...(S.helper.holding ? [S.bowl.x + 60, S.bowl.y - 16] : [S.bins.find(b => b.id === s.add).x, FY0 + 8]));
    if (s.do) {   // friends crowd round the bowl and help stir, a little slower than you
      S.mates.forEach((m, i) => { if (m.tx == null && Math.hypot(m.x - S.bowl.x, m.y - S.bowl.y) > 110) goTo(m, S.bowl.x + (i ? -90 : 90), S.bowl.y - 26); });
      S.stirT += dt;
      if (S.stirT > 1.1 && S.mates.some(m => Math.hypot(m.x - S.bowl.x, m.y - S.bowl.y) < 130)) { S.stirT = 0; cook.stir(g, S.mates[0]); }
    }
    if (s.time) S.needle += dt;
    if (S.stepT > 7 && S.hintT <= 0 && s.add) { talk(voice(), `The ${S.bins.find(b => b.id === s.add).label.toLowerCase()} is in the glowing bin.`, 2.4); S.hintT = 6; }
    for (const m of S.mates) if (m !== S.helper && !s.do && m.tx == null && Math.random() < dt * .25) goTo(m, rand(200, 800), rand(FY0 + 40, FY1 - 10));
  },
  stir(g, who) {
    const s = cook.stepNow();
    if (!s.do || S.count >= s.n || S.wait > 0) return;
    S.count++; tone(330 + S.count * 30, .12, 'sine', .07); S.bowlWob = .2;
    if (who) who.dip = .4;
    if (S.count >= s.n) { talk(voice(), pick(g.praise), 1.4); cook.advance(g); }
  },
  bake(g) {
    const s = cook.stepNow(), v = needleAt();
    const grade = v < .38 ? 'early' : v > .62 ? 'late' : 'good';
    if (grade === 'good') { chime(); burst(S.oven.x, S.oven.y - 80, '#ffd36b', 12); } else boop();
    if (grade !== 'good') S.slips++;
    talk(voice(), s[grade] || OVEN[grade], 2.8);
    cook.advance(g);
  },
  advance(g) {
    const d = cook.dish();
    S.step++;
    if (S.step < d.steps.length) { S.wait = .55; return; }
    S.wait = 2.8; chime(); cheerAll();
    talk(voice(), d.done, 3.2);
    burst(S.bowl.x, S.bowl.y - 70, '#fff4c2', 14);
  },
  next(g) {
    if (S.step >= cook.dish().steps.length) {
      if (S.di + 1 >= S.dishes.length) return cook.end(g);
      S.di++; S.step = 0; S.bowlIn = [];
    }
    cook.begin(g);
  },
  end(g) {
    const steps = S.dishes.reduce((n, d) => n + d.steps.length, 0), par = steps * 4.8;
    const stars = S.clock < par && S.slips <= 1 ? 3 : S.clock < par * 1.5 && S.slips <= 3 ? 2 : 1;
    results({ icon: g.doneIcon, title: `${S.dishes.length} ${g.made} made! ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}`,
      text: g.doneText, stats: [`Time: ${clock(S.clock)}`, `Slips: ${S.slips}`, S.dishes.map(d => d.icon + ' ' + d.name).join(' · ')] });
  },
  press(g, k) {
    if (k !== 'act' || S.phase !== 'play') return false;
    const s = cook.stepNow();
    if (S.wait > 0) return true;
    if (s.do) { if (Math.hypot(S.player.x - S.bowl.x, S.player.y - S.bowl.y) < 140) cook.stir(g, S.player); else floatText(S.player.x, S.player.y - 220 * STAND * scaleAt(S.player.y), 'Go to the bowl!', '#fff', 16); }
    else if (s.time) { if (Math.hypot(S.player.x - S.oven.x, S.player.y - S.oven.y) < 140) cook.bake(g); else floatText(S.player.x, S.player.y - 220 * STAND * scaleAt(S.player.y), `Go to the ${g.ovenName}!`, '#fff', 16); }
    return true;
  },
  tap(g, x, y) {
    const s = cook.stepNow();
    if (S.phase !== 'play' || S.wait > 0) return false;
    const near = p => Math.hypot(S.player.x - p.x, S.player.y - p.y) < 140, on = p => Math.abs(x - p.x) < 80 && y > p.y - 120 && y < p.y + 20;
    if (s.do && on(S.bowl) && near(S.bowl)) { cook.stir(g, S.player); return true; }
    if (s.time && on(S.oven) && near(S.oven)) { cook.bake(g); return true; }
    const bin = S.bins.find(b => Math.abs(x - b.x) < 30 && y < FY0 + 10 && y > FY0 - 70);
    if (bin) { goTo(S.player, bin.x, FY0 + 6); return true; }
    return false;
  },
  back(g) {
    ctx.fillStyle = 'rgba(92,62,36,.82)'; ctx.fillRect(0, FY0 - 70, VW, 12);              // the back shelf
    ctx.fillStyle = 'rgba(122,84,50,.75)'; ctx.fillRect(0, FY0 - 4, VW, 10);
  },
  draw(g, add) {
    const s = cook.stepNow();
    S.bins.forEach(b => add(FY0 - 4, () => {
      const glow = s.add === b.id && S.stepT > 7 && S.wait <= 0;
      ctx.fillStyle = glow ? `rgba(255,226,140,${.6 + .3 * Math.sin(S.t * 6)})` : 'rgba(246,234,208,.9)';
      ctx.strokeStyle = 'rgba(58,42,26,.45)'; ctx.lineWidth = 2;
      rr(b.x - 26, b.y - 60, 52, 54, 8); ctx.fill(); ctx.stroke();
      emoji(b.icon, b.x, b.y - 34, 28); label(b.label, b.x, b.y + 12, 11);
    }));
    add(S.bowl.y, () => {
      const w = S.bowlWob > 0 ? Math.sin(S.t * 40) * 3 : 0;
      ctx.fillStyle = 'rgba(120,80,46,.95)'; rr(S.bowl.x - 92, S.bowl.y - 52, 184, 22, 6); ctx.fill();
      ctx.fillRect(S.bowl.x - 82, S.bowl.y - 32, 10, 32); ctx.fillRect(S.bowl.x + 72, S.bowl.y - 32, 10, 32);
      emoji(cook.dish().vessel || g.vessel, S.bowl.x + w, S.bowl.y - 76, 52);
      S.bowlIn.slice(-5).forEach((ic, i) => emoji(ic, S.bowl.x - 34 + i * 17, S.bowl.y - 104, 18));
      if (s.do && S.wait <= 0) meter(S.bowl.x, S.bowl.y - 140, S.count / s.n, `${s.icon || '🥄'} ${s.do}`);
    });
    add(S.oven.y, () => {
      ctx.fillStyle = 'rgba(70,56,50,.95)'; rr(S.oven.x - 52, S.oven.y - 96, 104, 96, 10); ctx.fill();
      ctx.fillStyle = s.time ? `rgba(255,${150 + 60 * Math.sin(S.t * 8)},60,.9)` : 'rgba(40,30,26,.9)'; rr(S.oven.x - 38, S.oven.y - 70, 76, 46, 6); ctx.fill();
      emoji(g.ovenIcon, S.oven.x, S.oven.y - 46, 28);
      label(g.ovenName, S.oven.x, S.oven.y + 14, 12);
      if (s.time && S.wait <= 0) needle(S.oven.x, S.oven.y - 132, needleAt(), s.time);
    });
  },
  hud(g) {
    const d = cook.dish();
    card(14, 14, 250, 34 + d.steps.length * 20, () => {
      label(`${d.icon} ${d.name}`, 28, 38, 18, '#3a2a1a', 'left', 700, false);
      d.steps.forEach((st, i) => label(`${i < S.step ? '✓' : i === S.step ? '▸' : '·'} ${st.text}`, 30, 60 + i * 20, 14, i === S.step ? '#8a4e12' : i < S.step ? '#7d8b6a' : '#5c4a36', 'left', i === S.step ? 700 : 500, false));
    });
    label(`Dish ${Math.min(S.di + 1, S.dishes.length)} of ${S.dishes.length} · ${clock(S.clock)}`, VW / 2, 34, 18);
  },
};
const OVEN = { good: 'Perfectly golden!', early: 'A little pale, but soft and sweet. Still delicious!', late: 'A touch toasty at the edges. Those are the best bits.' };
const needleAt = () => (1 - Math.cos(S.needle * 2.4)) / 2;
function meter(x, y, f, text) {
  ctx.fillStyle = 'rgba(30,22,12,.6)'; rr(x - 80, y - 8, 160, 16, 8); ctx.fill();
  ctx.fillStyle = '#ffd36b'; rr(x - 78, y - 6, 156 * clamp(f, 0, 1), 12, 6); ctx.fill();
  label(text, x, y - 16, 14); label('Space / tap', x, y + 26, 12, '#fff3d0');
}
function needle(x, y, v, text) {
  ctx.fillStyle = 'rgba(30,22,12,.65)'; rr(x - 90, y - 10, 180, 20, 10); ctx.fill();
  ctx.fillStyle = 'rgba(255,200,80,.95)'; ctx.fillRect(x - 90 + 180 * .38, y - 10, 180 * .24, 20);
  ctx.fillStyle = '#fff'; ctx.fillRect(x - 90 + 180 * v - 2, y - 15, 4, 30);
  label(text, x, y - 20, 14); label('Space / tap in the gold', x, y + 30, 12, '#fff3d0');
}

// --- SERVE: run the shop or the party. Customers (your friends among them) come in with orders;
// fetch from the shelves (two in your hands at once) and bring them over before they lose patience.
const serve = {
  setup(g) {
    S.left = g.time; S.coins = 0; S.served = 0; S.lost = 0; S.helpT = 12;
    const n = g.stock.length;
    S.shelves = g.stock.map((it, i) => ({ ...it, x: lerp(64, 560, n > 1 ? i / (n - 1) : .5), y: FY0 - 4 }));
    S.spots = [{ x: 680, y: 462 }, { x: 800, y: 510 }, { x: 900, y: 446 }].map(p => ({ ...p, who: null }));
    S.by0 = FY0 + 6;
    S.pool = shuffle([...S.mates, ...g.customers.map(k => makeActor(npc(k), 0, 0))]);
    S.pool.forEach(c => { c.off = true; if (!S.actors.includes(c)) S.actors.push(c); });
    S.next = .8;
    standsAt(S.player, 330, 470);
    if (S.host) standsAt(S.host, 600, FY0 + 12);
  },
  update(g, dt) {
    if (S.phase !== 'play') return;
    S.left -= dt;
    if (S.left <= 0) return serve.end(g);
    S.next -= dt;
    const free = S.spots.filter(p => !p.who), ready = S.pool.filter(c => c.off);
    if (S.next <= 0 && free.length && ready.length) { serve.call(g, pick(free), pick(ready)); S.next = rand(3.5, 6.5) * (S.left < g.time / 2 ? .75 : 1); }
    const p = S.player;
    if (atCounter(p)) {
      const sh = S.shelves.find(s => Math.abs(s.x - p.x) < 30);
      if (sh && !p.carry.includes(sh.icon)) { p.carry = [...p.carry, sh.icon].slice(-2); p.hands = [...(p.hands || []), sh].slice(-2); tick(); }
    }
    for (const c of S.pool) {
      if (c.off) continue;
      if (c.state === 'in' && c.tx == null) { c.state = 'wait'; c.facing = -1; talk(c, g.ask(c.order), 3); }
      if (c.state === 'wait') {
        c.patience -= dt;
        if (nearFeet(p, c.x, c.y, 70, 34) && p.hands?.length) {
          for (const item of c.order) {
            const k = !item.done && p.hands.findIndex(h => h.id === item.id);
            if (k === false || k < 0) continue;
            item.done = true; p.hands.splice(k, 1); p.carry.splice(k, 1); pling();
            floatText(c.x, c.y - 220 * STAND * scaleAt(c.y), '✓', '#c8f2b0');
          }
          if (c.order.every(i => i.done)) serve.happy(g, c);
        }
        if (c.state === 'wait' && c.patience <= 0) serve.leave(c, false, g);
      }
      if (c.state === 'out' && c.tx == null) { c.off = true; c.spot.who = null; }
    }
    S.helpT -= dt;
    if (S.helpT <= 0 && S.host) {   // the shopkeeper lends a hand with the most impatient customer
      S.helpT = rand(11, 15);
      const c = S.pool.filter(c => !c.off && c.state === 'wait').sort((a, b) => a.patience - b.patience)[0];
      const item = c && c.order.find(i => !i.done);
      if (item) { item.done = true; talk(S.host, g.helps(item), 2.2); S.host.hop = .45; if (c.order.every(i => i.done)) serve.happy(g, c); }
    }
  },
  call(g, spot, c) {
    const big = S.left < g.time * .55 ? 3 : 2;
    c.order = shuffle(S.shelves).slice(0, Math.ceil(rand(0, big)) || 1).map(s => ({ id: s.id, icon: s.icon, label: s.label, done: false }));
    c.patience = c.max = g.patience + c.order.length * 4;
    c.off = false; c.state = 'in'; c.spot = spot; spot.who = c;
    standsAt(c, 1010, spot.y); c.facing = -1; c.speed = 230;
    goTo(c, spot.x, spot.y);
  },
  happy(g, c) {
    const tip = Math.round(5 * c.patience / c.max);
    S.coins += 10 + tip; S.served++; chime(); c.hop = .5;
    floatText(c.x, c.y - 240 * STAND * scaleAt(c.y), `+${10 + tip} 🪙`, '#ffe08a');
    serve.leave(c, true, g);
  },
  leave(c, glad, g) {
    c.state = 'out'; talk(c, glad ? pick(g.thanks) : pick(['Oh dear, I must dash…', 'I’ll come back later.', 'Never mind!']), 2);
    if (!glad) { S.lost++; boop(); }
    c.tx = 1020; c.ty = c.y; c.facing = 1;
  },
  end(g) {
    const stars = S.served >= g.goal * 1.4 ? 3 : S.served >= g.goal ? 2 : 1;
    results({ icon: g.doneIcon, title: `${S.served} ${g.servedName} ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}`, text: g.doneText(S.served, stars),
      stats: [`Coins: ${S.coins} 🪙`, `Left waiting: ${S.lost}`] });
  },
  tap(g, x, y) {
    const sh = S.shelves.find(s => Math.abs(x - s.x) < 32 && y < FY0 + 10 && y > FY0 - 74);
    if (sh) { goTo(S.player, sh.x, FY0 + 6); return true; }
    return false;
  },
  back() { ctx.fillStyle = 'rgba(92,62,36,.82)'; ctx.fillRect(0, FY0 - 74, 600, 12); ctx.fillStyle = 'rgba(122,84,50,.75)'; ctx.fillRect(0, FY0 - 4, 600, 10); },
  draw(g, add) {
    S.shelves.forEach(s => add(FY0 - 4, () => {
      ctx.fillStyle = 'rgba(246,234,208,.92)'; ctx.strokeStyle = 'rgba(58,42,26,.45)'; ctx.lineWidth = 2;
      rr(s.x - 28, s.y - 64, 56, 58, 8); ctx.fill(); ctx.stroke();
      emoji(s.icon, s.x, s.y - 36, 30); label(s.label, s.x, s.y + 12, 11);
    }));
    for (const c of S.pool) if (!c.off && c.state === 'wait') add(c.y + .1, () => orderCard(c));
  },
  hud(g) {
    card(14, 14, 210, 58, () => { label(`${g.servedName}: ${S.served}`, 28, 38, 17, '#3a2a1a', 'left', 700, false); label(`${S.coins} 🪙 · goal ${g.goal}`, 28, 60, 14, '#5c4a36', 'left', 500, false); });
    const carry = S.player.hands?.length ? `Holding: ${S.player.hands.map(h => h.icon).join(' ')}` : 'Hands free (carry two at a time)';
    label(carry, VW / 2, VH - 12, 14, '#fff3d0');
  },
};
function orderCard(c) {
  const k = scaleAt(c.y), top = (c.top ?? c.y - (c.h || 200) * k * STAND) - 46, w = c.order.length * 36 + 18, x = clamp(c.x - w / 2, 6, VW - w - 6);
  ctx.fillStyle = 'rgba(255,250,240,.95)'; ctx.strokeStyle = 'rgba(58,42,26,.4)'; ctx.lineWidth = 1.5;
  rr(x, top - 34, w, 40, 10); ctx.fill(); ctx.stroke();
  c.order.forEach((it, i) => emoji(it.done ? '✅' : it.icon, x + 27 + i * 36, top - 14, 24, false, it.done ? .6 : 1));
  const f = clamp(c.patience / c.max, 0, 1);
  ctx.fillStyle = 'rgba(30,22,12,.3)'; ctx.fillRect(x + 8, top + 2, w - 16, 5);
  ctx.fillStyle = f > .5 ? '#7ac36a' : f > .25 ? '#e8b64a' : '#e0634f'; ctx.fillRect(x + 8, top + 2, (w - 16) * f, 5);
}

// --- CARE: animals wander and call for food, water, a brush or a cuddle. Take the right thing from
// the left wall and bring it over; your friends and the keeper look after some of them too.
const care = {
  setup(g) {
    S.left = g.time; S.cared = 0; S.grumps = 0; S.callT = 1;
    S.stations = stationsFrom(g.tools);
    S.carers = [S.player, ...S.mates, ...(S.host ? [S.host] : [])];
    S.carers.forEach((a, i) => { if (i) a.speed = 150; });
    if (S.host) standsAt(S.host, 520, FY0 + 14);
    S.animals = g.animals.map((an, i) => ({ ...an, img: `scenes/${slug(an.name)}.png`, x: lerp(200, 860, g.animals.length > 1 ? i / (g.animals.length - 1) : .5), y: rand(FY0 + 20, FY1 - 10),
      tx: null, ty: null, facing: pick([-1, 1]), need: null, needT: 0, hop: 0, rest: rand(1, 3) }));
  },
  update(g, dt) {
    for (const an of S.animals) {
      an.hop = Math.max(0, an.hop - dt);
      if (!an.need && (an.tx == null || Math.random() < dt * .2)) { an.tx = rand(S.bx0 + 60, S.bx1 - 30); an.ty = rand(FY0 + 34, FY1 - 6); }
      if (an.tx != null && !an.need) {
        const dx = an.tx - an.x, dy = an.ty - an.y, d = Math.hypot(dx, dy);
        if (d < 4) an.tx = null; else { an.x += dx / d * 42 * dt; an.y += dy / d * 42 * dt; if (Math.abs(dx) > 2) an.facing = Math.sign(dx); }
      }
    }
    if (S.phase !== 'play') return;
    S.left -= dt;
    if (S.left <= 0) return care.end(g);
    S.callT -= dt;
    const calm = S.animals.filter(a => !a.need);
    if (S.callT <= 0 && calm.length && S.animals.length - calm.length < 3) {
      const an = pick(calm); an.need = pick(g.tools); an.needT = g.patience; an.wait = 0;
      S.callT = rand(1.6, 3.4);
    }
    for (const an of S.animals) if (an.need) {
      an.needT -= dt; an.wait += dt;
      if (an.needT <= 0) { S.grumps++; an.needT = g.patience * .6; boop(); talk(voice(), `${an.name} is getting cross! ${an.icon}`, 2); }
    }
    takeTools(S.carers);
    for (const a of S.carers) for (const an of S.animals) {
      if (!an.need || a.tool !== an.need.id || !nearFeet(a, an.x, an.y, 70, 32)) continue;
      S.cared++; an.hop = .5; an.need = null; an.claim = null;
      floatText(an.x, an.y - 110, `${an.name} ${pick(an.react || g.tools.find(t => t.id === a.tool).react)}`, '#fff', 15);
      burst(an.x, an.y - 60, '#ff9ec4', 8);
      if (a === S.player) { a.score++; pling(); } else { a.score++; if (Math.random() < .3) talk(a, pick(['There you go!', 'Good girl!', 'All better.', 'Shh, there there.']), 1.4); }
    }
    for (const a of S.carers.slice(1)) {
      a.think -= dt; if (a.think > 0) continue;
      a.think = rand(.4, .8);
      let goal = a.goal && a.goal.need && a.goal.claim === a ? a.goal : null;
      if (!goal) {
        goal = S.animals.filter(an => an.need && !an.claim && an.wait > 2.2).sort((x, y) => x.needT - y.needT)[0] || null;   // they leave the newest ones for you
        if (goal) goal.claim = a;
      }
      a.goal = goal;
      if (!goal) { if (a.tx == null && Math.random() < .3) wander(a); continue; }
      if (a.tool !== goal.need.id) toStation(a, S.stations.find(s => s.id === goal.need.id));
      else goTo(a, goal.x - 40 * Math.sign(goal.x - a.x || 1), goal.y);
    }
  },
  end(g) {
    const stars = S.grumps === 0 && S.cared >= 12 ? 3 : S.grumps <= 2 ? 2 : 1;
    results({ icon: g.doneIcon, title: `${g.doneTitle} ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}`, text: g.doneText,
      stats: [`Looked after: ${S.cared}`, `You: ${S.player.score}`, ...S.carers.slice(1).map(a => `${a.name}: ${a.score}`), `Got cross: ${S.grumps}`] });
  },
  draw(g, add) {
    S.stations.forEach(st => add(st.y, () => drawStation(st, S.player.tool === st.id)));
    for (const an of S.animals) add(an.y, () => {
      const k = scaleAt(an.y) * (an.size || 1), hopY = an.hop > 0 ? Math.sin(an.hop / .5 * Math.PI) * 18 : 0, im = pic(an.img);
      ctx.fillStyle = 'rgba(30,20,10,.25)'; ctx.beginPath(); ctx.ellipse(an.x, an.y, 34 * k, 7 * k, 0, 0, 7); ctx.fill();
      if (im) { const H = 120 * k, W = im.width * H / im.height; ctx.save(); ctx.translate(an.x, an.y - hopY); if (an.facing > 0) ctx.scale(-1, 1); ctx.drawImage(im, -W / 2, -H, W, H); ctx.restore(); }
      else emoji(an.icon, an.x, an.y - 40 * k - hopY, 80 * k, an.facing > 0);
      label(an.name, an.x, an.y + 16, 12);
      if (an.need) {
        const y = an.y - 100 * k - hopY, f = clamp(an.needT / g.patience, 0, 1);
        ctx.fillStyle = 'rgba(255,250,240,.96)'; ctx.beginPath(); ctx.arc(an.x, y, 22, 0, 7); ctx.fill();
        ctx.strokeStyle = f > .5 ? '#7ac36a' : f > .25 ? '#e8b64a' : '#e0634f'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(an.x, y, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f); ctx.stroke();
        emoji(an.need.icon, an.x, y + 1, 24);
      }
    });
  },
  hud() { card(14, 14, 200, 34, () => label(`Looked after: ${S.cared}`, 28, 38, 17, '#3a2a1a', 'left', 700, false)); },
};

// --- RHYTHM: dance, play or act opposite a partner. Notes fall to the line; hit them with the arrows
// (or tap the lane). Your partner moves on every beat, you move on every hit; the others cheer at the back.
const LANES = [{ k: 'l', label: '←', colour: '#f2a7c4' }, { k: 'u', label: '↑', colour: '#a7d8f2' }, { k: 'd', label: '↓', colour: '#bfe8a7' }, { k: 'r', label: '→', colour: '#f2d7a7' }];
const LANE_X = i => 375 + i * 70, HIT_Y = 470, TOP_Y = 70, TRAVEL = 1.55;
const rhythm = {
  setup(g) {
    S.lock = true;
    S.partner = partnerFor(g);
    standsAt(S.player, 210, 488); S.player.facing = 1;
    if (S.partner) { standsAt(S.partner, 750, 488); S.partner.facing = -1; }
    S.watchers = S.mates.filter(m => m !== S.partner);
    S.watchers.forEach((m, i) => { standsAt(m, [80, 880, 160, 800][i % 4], FY0 + 2); m.facing = i % 2 ? -1 : 1; });
    if (S.host) standsAt(S.host, g.lanes === 'stage' ? 890 : 470, FY0 - 2);
    S.bpm = g.bpm; S.beatLen = 60 / g.bpm;
    S.notes = g.chart(g).map(n => ({ ...n, t: n.beat * S.beatLen }));
    S.song = -TRAVEL - .4; S.nextBeat = 0; S.end = S.notes.at(-1).t + 1.6;
    S.hits = { perfect: 0, good: 0, miss: 0 }; S.combo = 0; S.best = 0; S.points = 0; S.flash = [0, 0, 0, 0];
    if (g.lanes === 'stage') { S.play = pick(g.plays); S.section = -1; S.sectionHits = 0; S.sectionNotes = 0; }
  },
  update(g, dt) {
    S.flash = S.flash.map(f => Math.max(0, f - dt));
    if (S.phase !== 'play') return;
    S.song += dt;
    while (S.nextBeat * S.beatLen <= S.song && S.nextBeat * S.beatLen <= S.end - 1) { if (S.song - S.nextBeat * S.beatLen < .1) g.beat?.(S.nextBeat); S.nextBeat++; }
    for (const n of S.notes) {
      if (!n.moved && S.song >= n.t) { n.moved = true; if (S.partner) danceMove(S.partner, n.lane); }
      if (!n.done && S.song > n.t + .17) {
        n.done = true; S.hits.miss++; S.combo = 0; S.player.stun = .3;
        floatText(LANE_X(n.lane), HIT_Y - 44, 'Miss', '#ffb3a7', 18);
        if (Math.random() < .2) talk(S.partner, pick(g.oops), 1.4);
      }
    }
    if (S.play) rhythm.stage(g);
    if (S.song > S.end) rhythm.end(g);
  },
  stage(g) {   // the play: a cue at the start of each section, then your line, said well or… not
    const per = S.notes.length / S.play.scenes.length, sec = Math.floor(S.notes.filter(n => n.t <= S.song + TRAVEL).length / per);
    if (sec !== S.section && sec < S.play.scenes.length) {
      if (S.section >= 0) rhythm.line(g);
      S.section = sec; S.sectionHits = S.hits.perfect + S.hits.good; S.sectionMiss = S.hits.miss;
      talk(S.partner, S.play.scenes[sec].cue, 4.2);
    }
  },
  line(g) {
    const sc = S.play.scenes[S.section], hits = S.hits.perfect + S.hits.good - S.sectionHits, miss = S.hits.miss - S.sectionMiss;
    const good = hits / Math.max(1, hits + miss) >= .65;
    talk(S.player, `“${good ? sc.lines[0] : pick(sc.lines.slice(1))}”`, 3.4);
    if (good) { for (let i = 0; i < 4; i++) floatText(rand(120, 840), VH - 30, '🌹', '#fff', 26); cheerAll(); }
    else { floatText(480, VH - 40, '😂 The audience giggles', '#fff', 18); }
  },
  hit(g, lane) {
    S.flash[lane] = .15;
    let best = null;
    for (const n of S.notes) if (!n.done && n.lane === lane && Math.abs(n.t - S.song) < .17 && (!best || Math.abs(n.t - S.song) < Math.abs(best.t - S.song))) best = n;
    if (!best) { S.combo = 0; tone(150, .08, 'sine', .05); return; }   // stray presses break the combo
    const perfect = Math.abs(best.t - S.song) < .065;
    best.done = true; S.hits[perfect ? 'perfect' : 'good']++; S.combo++; S.best = Math.max(S.best, S.combo);
    S.points += Math.round((perfect ? 100 : 60) * (1 + Math.min(S.combo, 30) / 30));
    g.sound(best, lane);
    danceMove(S.player, lane);
    floatText(LANE_X(lane), HIT_Y - 44, perfect ? 'Perfect!' : 'Good', perfect ? '#fff4a8' : '#d9ecff', 18);
    if (S.combo % 10 === 0) { talk(S.partner, pick(g.praise), 1.6); S.watchers.forEach(w => { w.hop = .45; }); burst(480, 260, '#ffd1e8', 14); }
  },
  end(g) {
    if (S.play && S.section >= 0) rhythm.line(g);
    const total = S.notes.length, acc = (S.hits.perfect + S.hits.good * .7) / total;
    const grade = acc > .92 ? 'S' : acc > .8 ? 'A' : acc > .62 ? 'B' : acc > .4 ? 'C' : 'D';
    results({ icon: g.doneIcon, title: `${g.doneTitle} · ${grade}`, text: S.play ? `${S.play.title}: ${S.play.ending}` : g.doneText(grade),
      stats: [`Score: ${S.points}`, `Perfect ${S.hits.perfect} · Good ${S.hits.good} · Missed ${S.hits.miss}`, `Best combo: ${S.best}`] });
  },
  press(g, k) {
    const lane = LANES.findIndex(l => l.k === k);
    if (lane < 0) return false;
    if (S.phase === 'play') rhythm.hit(g, lane);
    return true;
  },
  tap(g, x, y) {
    if (y < 300 || x < 330 || x > 630) return false;
    rhythm.hit(g, clamp(Math.floor((x - 340) / 70), 0, 3));
    return true;
  },
  front(g) {
    ctx.save();
    ctx.fillStyle = 'rgba(20,16,30,.45)'; rr(LANE_X(0) - 38, TOP_Y - 20, 4 * 70 + 6, HIT_Y - TOP_Y + 50, 14); ctx.fill();
    LANES.forEach((l, i) => {
      const x = LANE_X(i);
      ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, TOP_Y - 10); ctx.lineTo(x, HIT_Y); ctx.stroke();
      ctx.fillStyle = S.flash[i] > 0 ? l.colour : 'rgba(255,255,255,.18)';
      ctx.beginPath(); ctx.arc(x, HIT_Y, 26, 0, 7); ctx.fill();
      ctx.strokeStyle = l.colour; ctx.lineWidth = 3; ctx.stroke();
      label(g.laneNames ? g.laneNames[i] : l.label, x, HIT_Y + 7, g.laneNames ? 13 : 20, '#fff');
    });
    for (const n of S.notes) {
      const f = 1 - (n.t - S.song) / TRAVEL;
      if (f < 0 || f > 1.15 || n.done) continue;
      const x = LANE_X(n.lane), y = lerp(TOP_Y, HIT_Y, f);
      ctx.fillStyle = LANES[n.lane].colour; ctx.beginPath(); ctx.arc(x, y, 20, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2.5; ctx.stroke();
      label(g.noteIcon || LANES[n.lane].label, x, y + 6, g.noteIcon ? 16 : 18, '#3a2a1a', 'center', 800, false);
    }
    if (S.combo >= 3) label(`${S.combo} combo`, 480, TOP_Y - 30, 20, '#ffe08a');
    ctx.restore();
    if (g.lanes === 'stage') { const heads = ['👩', '👨', '👵', '👦', '👧', '🧔', '👴', '👩‍🦰', '🧒', '👱‍♀️']; heads.forEach((hd, i) => emoji(hd, 50 + i * 96, VH - 6 - Math.abs(Math.sin(S.t * 3 + i)) * (S.combo > 5 ? 10 : 2), 44)); }
  },
  back(g) { if (g.prop === 'piano') drawPiano(S.partner ? S.partner.x : 750); if (g.lanes === 'stage') drawCurtains(); },
  hud(g) {
    card(14, 14, 190, 58, () => { label(`Score ${S.points}`, 28, 38, 18, '#3a2a1a', 'left', 700, false); label(`Best combo ${S.best}`, 28, 60, 14, '#5c4a36', 'left', 500, false); });
    const left = Math.max(0, S.end - S.song);
    label(clock(left), VW / 2, 34, 18);
  },
};
function danceMove(a, lane) {
  if (lane === 0) a.slideT = .32; else if (lane === 1) a.hop = .45; else if (lane === 2) a.dip = .4; else a.spin = .6;
}
function drawPiano(x) {
  ctx.save(); ctx.translate(x + 20, FY1 - 46);
  ctx.fillStyle = '#1c1612'; rr(-120, -110, 240, 80, 10); ctx.fill();
  ctx.fillStyle = '#f7f2e6'; ctx.fillRect(-110, -48, 220, 18);
  ctx.fillStyle = '#1c1612'; for (let i = 0; i < 14; i++) if ([1, 2, 4, 5, 6].includes(i % 7)) ctx.fillRect(-110 + i * 15.7 + 10, -48, 8, 11);
  ctx.fillStyle = '#1c1612'; ctx.fillRect(-110, -30, 8, 40); ctx.fillRect(102, -30, 8, 40);
  ctx.restore();
}
function drawCurtains() {
  ctx.save();
  for (const side of [-1, 1]) {
    const gr = ctx.createLinearGradient(0, 0, 120, 0); gr.addColorStop(0, '#6b1420'); gr.addColorStop(1, '#a8283a');
    ctx.fillStyle = gr; ctx.save(); if (side > 0) { ctx.translate(VW, 0); ctx.scale(-1, 1); }
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(140, 0); ctx.quadraticCurveTo(70, 200, 46, VH); ctx.lineTo(0, VH); ctx.fill(); ctx.restore();
  }
  ctx.fillStyle = '#8a1e2c'; ctx.fillRect(0, 0, VW, 26);
  ctx.restore();
}
function beatChart(beats, eighths = .3) {
  const notes = []; let last = -1;
  for (let b = 0; b < beats; b++) {
    if (b % 8 === 7) continue;     // a breath every two bars
    const add = beat => { let lane = Math.floor(Math.random() * 4); if (lane === last && Math.random() < .6) lane = (lane + 1 + Math.floor(Math.random() * 3)) % 4; last = lane; notes.push({ beat, lane }); };
    add(b);
    if (b > beats * .35 && Math.random() < eighths) add(b + .5);
  }
  return notes;
}
const NOTES = [261.63, 293.66, 329.63, 349.23, 392, 440, 493.88, 523.25];
const MELODY = [[4, 1], [2, 1], [4, 1], [7, 2], [6, 1], [5, 1], [4, 2], [5, 1], [4, 1], [2, 1], [3, 1], [2, 1], [0, 3],
  [2, 1], [4, 1], [5, 1], [7, 2], [6, 1], [4, 1], [5, 2], [3, 1], [2, 1], [1, 1], [0, 3]];
function melodyChart() {   // Cashamir's “Lake at Dusk”, twice through, the second time with a few more notes
  const notes = []; let b = 0;
  for (const pass of [0, 1]) for (const [ni, dur] of MELODY) {
    notes.push({ beat: b, lane: [0, 0, 1, 1, 2, 2, 3, 3][ni], freq: NOTES[ni] });
    if (pass && dur >= 2) notes.push({ beat: b + 1, lane: [3, 3, 2, 2, 1, 1, 0, 0][ni], freq: NOTES[ni] * 1.5 });
    b += dur;
  }
  return notes;
}
const drum = n => { tone(n % 4 ? 110 : 75, .12, 'sine', n % 4 ? .1 : .2); if (n % 2) tone(5200, .03, 'square', .012); };
const pluck = (n, lane) => tone([392, 440, 523.25, 587.33][lane], .25, 'triangle', .1);

// --- RUNNER: a ride or a boat trip. The scene scrolls; collect the good things and avoid the rest.
// 'boat': ↑ ↓ change lanes on the lake, Cashamir in the boat behind you. 'ride': Space or ↑ to jump fences.
const runner = {
  setup(g) {
    S.lock = true; S.left = g.time; S.speed = g.speed; S.items = []; S.spawn = 1; S.scroll = 0; S.points = 0; S.slow = 0; S.chat = 5;
    S.partner = partnerFor(g);
    S.actors.forEach(a => { a.off = true; });   // everyone's drawn in the boat or on horseback instead
    if (g.mode === 'boat') { S.lanes = [418, 466, 514]; S.lane = 1; S.ry = S.lanes[1]; S.player.x = 290; if (S.partner) S.partner.x = 186; }
    else { S.ry = 500; S.z = 0; S.vz = 0; S.pz = 0; S.pvz = 0; S.player.x = 254; if (S.partner) S.partner.x = 134; }
  },
  update(g, dt) {
    S.scroll += (S.phase === 'play' ? S.speed : 40) * dt;
    if (g.mode === 'boat') S.ry = lerp(S.ry, S.lanes[S.lane], Math.min(1, dt * 10));
    else {
      S.vz -= 1700 * dt; S.z = Math.max(0, S.z + S.vz * dt); if (!S.z) S.vz = 0;
      S.pvz -= 1700 * dt; S.pz = Math.max(0, S.pz + S.pvz * dt); if (!S.pz) S.pvz = 0;
    }
    if (S.phase !== 'play') return;
    S.left -= dt; S.slow -= dt;
    if (S.left <= 0) return runner.end(g);
    S.speed = g.speed * (1 + (1 - S.left / g.time) * .6) * (S.slow > 0 ? .6 : 1);
    S.spawn -= dt;
    if (S.spawn <= 0) {
      const it = weighted(g.items), o = { ...it, x: 1010 };
      if (g.mode === 'boat') { o.lane = Math.floor(rand(0, 3)); o.y = S.lanes[o.lane]; }
      else { o.y = S.ry; o.z = it.bad ? 0 : pick([0, 0, 80, 140]); }
      S.items.push(o); S.spawn = rand(.45, .95) * g.speed / S.speed;
      if (o.say && Math.random() < .5) talk(S.partner, o.say, 2);
    }
    const px = 260;
    for (const o of S.items) {
      o.x -= S.speed * dt;
      if (o.gone || Math.abs(o.x - px) > 44) continue;
      const hit = g.mode === 'boat' ? Math.abs(o.y - S.ry) < 24 : (o.bad ? S.z < 46 : Math.abs(o.z - S.z) < 62);
      if (!hit) continue;
      o.gone = true;
      if (o.bad) { S.points = Math.max(0, S.points - 2); S.slow = .9; boop(); floatText(px, S.ry - 170, '−2', '#ffb0a0'); talk(S.partner, pick(g.bump), 1.6); }
      else { S.points += o.points || 1; pling(); floatText(px, S.ry - 170 - (S.z || 0), `+${o.points || 1}`); burst(px + 20, S.ry - 80 - (S.z || 0), '#fff2c8', 6); }
    }
    if (g.mode === 'ride' && S.items.some(o => o.bad && !o.gone && o.x > 120 && o.x < 230) && !S.pz) S.pvz = 600;   // Annalise jumps on her own
    S.items = S.items.filter(o => o.x > -60 && !o.gone);
    S.chat -= dt;
    if (S.chat <= 0) { talk(S.partner, pick(g.chatter), 2.6); S.chat = rand(7, 11); }
  },
  end(g) { results({ icon: g.doneIcon, title: g.doneTitle(S.points), text: g.doneText(S.points), stats: [`Distance: ${Math.round(S.scroll / 40)} m`] }); },
  press(g, k) {
    if (S.phase !== 'play') return k === 'u' || k === 'd' || k === 'act';
    if (g.mode === 'boat') { if (k === 'u') S.lane = Math.max(0, S.lane - 1); else if (k === 'd') S.lane = Math.min(2, S.lane + 1); else return false; tick(); return true; }
    if ((k === 'u' || k === 'act') && !S.z) { S.vz = 640; tone(500, .1, 'sine', .05); return true; }
    return k === 'u' || k === 'act';
  },
  tap(g, x, y) {
    if (g.mode === 'boat') runner.press(g, y < S.ry - 30 ? 'u' : 'd'); else runner.press(g, 'act');
    return true;
  },
  back(g) {
    if (g.mode === 'boat') {
      const gr = ctx.createLinearGradient(0, 380, 0, VH); gr.addColorStop(0, 'rgba(70,130,170,.88)'); gr.addColorStop(1, 'rgba(28,70,110,.95)');
      ctx.fillStyle = gr; ctx.fillRect(0, 384, VW, VH - 384);
      ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 2;
      for (let i = 0; i < 26; i++) { const x = ((i * 137 - S.scroll * (1 + (i % 3) * .3)) % 1100 + 1100) % 1100 - 70, y = 396 + (i * 53) % 140; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 14, y - 4, x + 28, y); ctx.stroke(); }
    } else {
      ctx.fillStyle = 'rgba(176,140,98,.92)'; ctx.fillRect(0, 440, VW, VH - 440);
      ctx.fillStyle = 'rgba(140,108,74,.6)';
      for (let i = 0; i < 18; i++) { const x = ((i * 113 - S.scroll) % 1060 + 1060) % 1060 - 50; ctx.fillRect(x, 470 + (i * 37) % 60, 30, 4); }
      for (let i = 0; i < 30; i++) { const x = ((i * 71 - S.scroll * .8) % 1100 + 1100) % 1100 - 70; emoji('🪻', x, 430 + (i % 3) * 6, 24); }
    }
  },
  draw(g, add) {
    for (const o of S.items) add(o.y + (o.bad ? .2 : .1), () => {
      if (g.mode === 'boat') emoji(o.icon, o.x, o.y - 14 + Math.sin(S.t * 3 + o.x * .02) * 3, 36);
      else if (o.icon === 'fence') drawFence(o.x, o.y);
      else emoji(o.icon, o.x, o.y - 24 - o.z, o.bad ? 40 : 34);
    });
    add(S.ry, () => g.mode === 'boat' ? drawBoat(g) : drawRiders(g));
  },
  hud(g) {
    card(14, 14, 190, 34, () => { emoji(g.scoreIcon, 40, 31, 22); label(String(S.points), 60, 38, 18, '#3a2a1a', 'left', 700, false); });
    label(clock(Math.max(0, S.left)), VW / 2, 34, 18);
  },
};
function drawFence(x, y) {
  ctx.fillStyle = '#7a5532'; ctx.fillRect(x - 26, y - 56, 7, 56); ctx.fillRect(x + 19, y - 56, 7, 56);
  ctx.fillStyle = '#9a6d40'; ctx.fillRect(x - 32, y - 48, 64, 9); ctx.fillRect(x - 32, y - 26, 64, 9);
}
// a rider, or a passenger in the boat: just the top of the figure, sitting at (x, y)
function drawSeated(a, x, y, k, part = .56) {
  ctx.save(); ctx.translate(x, y); ctx.scale(a.facing, 1);
  drawFigure(a, k, part);
  ctx.restore();
}
function drawBoat(g) {
  const x = 250, y = S.ry + Math.sin(S.t * 2.2) * 3, k = .9;
  ctx.fillStyle = 'rgba(10,30,50,.3)'; ctx.beginPath(); ctx.ellipse(x, y + 6, 130, 12, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#f4efe2'; ctx.beginPath(); ctx.moveTo(x - 10, y - 30); ctx.lineTo(x - 10, y - 230); ctx.lineTo(x + 92, y - 46); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#6b4a2e'; ctx.fillRect(x - 14, y - 236, 6, 210);
  if (S.partner) { S.partner.facing = 1; drawSeated(S.partner, x - 64, y - 26, k); }
  S.player.facing = 1; drawSeated(S.player, x + 40, y - 26, k);
  ctx.fillStyle = '#8a5a34'; ctx.beginPath(); ctx.moveTo(x - 130, y - 40); ctx.lineTo(x + 130, y - 40); ctx.quadraticCurveTo(x + 112, y + 2, x + 70, y + 4); ctx.lineTo(x - 90, y + 4); ctx.quadraticCurveTo(x - 124, y - 6, x - 130, y - 40); ctx.fill();
  ctx.fillStyle = '#c99a5a'; ctx.fillRect(x - 128, y - 42, 256, 6);
}
function drawRiders(g) {
  const horse = (x, y, z, rider, k) => {
    ctx.fillStyle = 'rgba(30,20,10,.25)'; ctx.beginPath(); ctx.ellipse(x, y, 60 * k, 9 * k, 0, 0, 7); ctx.fill();
    const by = y - z, gait = z ? 0 : Math.abs(Math.sin(S.t * 9)) * 5;
    const im = pic('scenes/horse.png');
    if (im) { const H = 150 * k, W = im.width * H / im.height; ctx.drawImage(im, x - W / 2, by - H - gait, W, H); }
    else emoji('🐎', x, by - 62 * k - gait, 130 * k, true);
    if (rider) { rider.facing = 1; drawSeated(rider, x - 4 * k, by - 72 * k - gait, k * .82); }
  };
  if (S.partner) horse(140, S.ry - 24, S.pz, S.partner, .82);
  horse(260, S.ry, S.z, S.player, 1);
}

// ================= the games =================
const PRAISE = ['Lovely!', 'Just right!', 'Perfect.', 'Beautiful!', 'Oh, well done!', 'Wonderful!'];
const KITCHEN_PANTRY = [['flour', '🌾', 'Flour'], ['butter', '🧈', 'Butter'], ['egg', '🥚', 'Eggs'], ['honey', '🍯', 'Honey'], ['milk', '🥛', 'Milk'],
  ['berries', '🫐', 'Berries'], ['lemon', '🍋', 'Lemons'], ['lavender', '🪻', 'Lavender'], ['bread', '🍞', 'Bread'], ['cucumber', '🥒', 'Cucumber'],
  ['cheese', '🧀', 'Cheese'], ['herbs', '🌿', 'Herbs'], ['sugar', '🧂', 'Sugar']];
const OVEN_STEP = { time: 'Take it out!', text: 'Bake until golden.' };
const BAKES = [
  { name: 'Honey Cakes', icon: '🧁', done: 'Warm honey cakes! The treehouse smells wonderful.',
    steps: [{ add: 'flour', text: 'Sift in the flour.' }, { add: 'butter', text: 'Add the soft butter.' }, { add: 'egg', text: 'Crack in two eggs.' }, { add: 'honey', text: 'Pour in the honey.' },
      { do: 'Stir the batter', n: 10, text: 'Stir until smooth.' }, OVEN_STEP] },
  { name: 'Berry Tart', icon: '🥧', done: 'The berry tart shines like a jewel box.',
    steps: [{ add: 'flour', text: 'Tip in the flour.' }, { add: 'butter', text: 'Rub in the butter.' }, { do: 'Roll the pastry', icon: '🫓', n: 8, text: 'Roll out the pastry.' },
      { add: 'berries', text: 'Heap on the berries.' }, { add: 'sugar', text: 'Sprinkle sugar.' }, { ...OVEN_STEP, text: 'Bake until the pastry is golden.' }] },
  { name: 'Lavender Shortbread', icon: '🍪', done: 'Shortbread that smells of butter and summer lavender.',
    steps: [{ add: 'butter', text: 'Start with the butter.' }, { add: 'sugar', text: 'Cream in the sugar.' }, { add: 'lavender', text: 'A pinch of lavender.' }, { add: 'flour', text: 'Fold in the flour.' },
      { do: 'Press the shapes', icon: '⭐', n: 8, text: 'Cut out stars.' }, { ...OVEN_STEP, text: 'Bake until pale gold.' }] },
];
const COOKS = [
  { name: 'Cucumber Sandwiches', icon: '🥪', vessel: '🍽️', done: 'A neat stack of little sandwiches.',
    steps: [{ add: 'bread', text: 'Lay out the bread.' }, { add: 'butter', text: 'Butter it thinly.' }, { do: 'Slice the cucumber', icon: '🔪', n: 9, text: 'Slice the cucumber.' },
      { add: 'cucumber', text: 'Layer the cucumber.' }, { add: 'herbs', text: 'Scatter herbs.' }, { do: 'Cut into triangles', icon: '🔺', n: 5, text: 'Cut into triangles.' }] },
  { name: 'Cheese & Herb Scones', icon: '🥯', done: 'Fluffy scones, golden and cheesy.',
    steps: [{ add: 'flour', text: 'Flour first.' }, { add: 'cheese', text: 'Grate in the cheese.' }, { add: 'herbs', text: 'Chop in the herbs.' },
      { add: 'milk', text: 'A splash of milk.' }, { do: 'Pat the dough', icon: '👐', n: 7, text: 'Pat the dough round.' }, OVEN_STEP] },
  { name: 'Pink Lemonade', icon: '🍹', vessel: '🫙', done: 'A big jar of pink lemonade, clinking with ice.',
    steps: [{ do: 'Squeeze the lemons', icon: '🍋', n: 10, text: 'Squeeze the lemons.' }, { add: 'lemon', text: 'Pour in the juice.' }, { add: 'sugar', text: 'Stir in sugar.' },
      { add: 'berries', text: 'Berries for the pink.' }, { do: 'Stir it round', n: 7, text: 'Give it a good stir.' }] },
];
const ROYAL_PANTRY = [['flour', '🌾', 'Flour'], ['butter', '🧈', 'Butter'], ['egg', '🥚', 'Eggs'], ['cream', '🥛', 'Cream'], ['sugar', '🧂', 'Sugar'], ['berries', '🍓', 'Strawberries'],
  ['pear', '🍐', 'Pears'], ['honey', '🍯', 'Honey'], ['carrot', '🥕', 'Carrots'], ['potato', '🥔', 'Potatoes'], ['herbs', '🌿', 'Herbs'], ['chocolate', '🍫', 'Chocolate']];
const ROYAL_DISHES = [
  { name: 'Royal Trifle', icon: '🍨', done: 'The trifle goes in on a silver stand.',
    steps: [{ add: 'flour', text: 'Flour for the sponge.' }, { add: 'egg', text: 'Eggs, beaten light.' }, { ...OVEN_STEP, text: 'Bake the sponge.' }, { add: 'berries', text: 'Layer the strawberries.' }, { add: 'cream', text: 'Spoon on the cream.' }, { do: 'Pipe the rosettes', icon: '🌸', n: 8, text: 'Pipe cream rosettes.' }] },
  { name: 'Golden Garden Soup', icon: '🥣', done: 'A golden tureen steams on the banquet table.',
    steps: [{ do: 'Chop the vegetables', icon: '🔪', n: 10, text: 'Chop the vegetables.' }, { add: 'carrot', text: 'Carrots in the pot.' }, { add: 'potato', text: 'Then potatoes.' }, { add: 'herbs', text: 'A bundle of herbs.' }, { do: 'Stir the pot', n: 8, text: 'Stir as it bubbles.' }, { add: 'cream', text: 'A swirl of cream.' }] },
  { name: 'Honey-Poached Pears', icon: '🍐', done: 'The pears glisten like amber.',
    steps: [{ add: 'pear', text: 'Peel the pears.' }, { add: 'honey', text: 'Honey in the pan.' }, { add: 'sugar', text: 'A spoon of sugar.' }, { do: 'Baste the pears', icon: '🥄', n: 8, text: 'Spoon the syrup over.' }, { add: 'chocolate', text: 'Drizzle chocolate.' }] },
];
const WORKSHOP = [['oak', '🪵', 'Oak'], ['pine', '🌲', 'Pine'], ['saw', '🪚', 'Saw'], ['hammer', '🔨', 'Hammer'], ['nails', '📌', 'Nails'], ['glue', '🧴', 'Glue'],
  ['paint', '🎨', 'Paint'], ['ruler', '📏', 'Ruler'], ['string', '🧵', 'String'], ['brush', '🖌️', 'Brush']];
const BUILDS = [
  { name: 'A Birdhouse', icon: '🏠', done: 'A bluebird peeks into the birdhouse straight away.',
    steps: [{ add: 'ruler', text: 'Measure the boards.' }, { add: 'pine', text: 'Fetch a pine board.' }, { do: 'Saw the pieces', icon: '🪚', n: 9, text: 'Saw the walls and roof.' }, { add: 'nails', text: 'Nails ready.' }, { do: 'Hammer it together', icon: '🔨', n: 8, text: 'Hammer it together.' }, { add: 'paint', text: 'Paint it bright.' }] },
  { name: 'A Toy Sailboat', icon: '⛵', done: 'Your sailboat bobs across the fountain to cheers.',
    steps: [{ add: 'oak', text: 'An oak plank.' }, { do: 'Carve the hull', icon: '🔪', n: 9, text: 'Carve the hull.' }, { add: 'glue', text: 'Glue in the mast.' }, { add: 'string', text: 'Rig the sail.' }, { add: 'brush', text: 'Varnish it.' }] },
  { name: 'A Jewellery Box', icon: '🎁', done: 'The lid clicks shut. It smells of oak and polish.',
    steps: [{ add: 'oak', text: 'Fine oak for a fine box.' }, { add: 'saw', text: 'Fetch the saw.' }, { do: 'Cut the sides', icon: '🪚', n: 8, text: 'Cut four sides and a lid.' }, { add: 'glue', text: 'Glue the corners.' },
      { time: 'Stop polishing!', text: 'Polish until it gleams.', good: 'It gleams like honey!', early: 'A soft sheen. Lovely.', late: 'Polished to a mirror!' }] },
];
const asker = (lines) => order => pick(lines).replace('{list}', listNames(order));
const shop = (o) => ({ kind: 'serve', time: 80, patience: 18, goal: 8, servedName: 'Customers served', doneIcon: '🛍️',
  thanks: ['Perfect, thank you!', 'Just what I wanted!', 'You’re a marvel!', 'Wonderful!', 'Thank you ever so much!'],
  helps: item => `I’ll fetch the ${item.label.toLowerCase()}!`,
  doneText: (n, stars) => stars === 3 ? 'The busiest day the shop has ever had, and every customer went home smiling.' : stars === 2 ? 'A good day’s trade. The shop bell hardly stopped ringing.' : 'A quiet day. Tomorrow will be busier!', ...o });
const PLAYS = [
  { title: 'The Lost Slipper', ending: 'The slipper is found in the fountain, and the whole village dances.', scenes: [
    { cue: '“Princess, your glass slipper is missing!”', lines: ['Then we must search the whole village!', 'I would rather have a sandwich.', 'Slippers are for sleeping.'] },
    { cue: '“I saw a magpie fly off with something shiny.”', lines: ['A magpie! To the bell tower!', 'Pass me a bun, then.', 'I do not believe in magpies.'] },
    { cue: 'The magpie guards its nest of treasures…', lines: ['Dear magpie, my ribbon for my slipper.', 'Shoo, you silly bird!', 'I shall wait here forever.'] },
  ] },
  { title: 'The Dragon Who Was Lonely', ending: 'The dragon is invited to every festival from that day on.', scenes: [
    { cue: '“A dragon sits on the hill, sighing smoke!”', lines: ['I shall find out what troubles it.', 'Everybody run!', 'Dragons are not real.'] },
    { cue: '“Nobody ever visits me,” rumbles the dragon.', lines: ['Then I shall be your first friend.', 'That’s because you’re scary.', 'I am only here for the gold.'] },
    { cue: '“But the villagers fear me.”', lines: ['Come to the festival and show them how gentle you are.', 'Stay up here, then.', 'Have you tried being smaller?'] },
  ] },
];
const PEOPLE = ['rosie', 'tom', 'clara', 'hettie', 'jasper', 'posy'];

const HUBS = {
  kitchen: { title: 'Evelynn’s Kitchen', host: 'evelynn', games: [
    { id: 'bake', kind: 'cook', name: 'Bake with Evelynn', icon: '🧁', blurb: 'Race round the pantry: honey cakes, berry tart and shortbread.', host: 'evelynn',
      pantry: KITCHEN_PANTRY, dishes: BAKES, praise: PRAISE, vessel: '🥣', ovenIcon: '🔥', ovenName: 'oven', made: 'bakes', doneIcon: '🧁',
      hello: 'Aprons on! Fetch from the bins at the back, bring it to the bowl. Lila-Bella will help!', doneText: 'Everything’s cooling on the windowsill, and somebody has already sneaked a taste.' },
    { id: 'cook', kind: 'cook', name: 'Cook for the picnic', icon: '🥪', blurb: 'Sandwiches, scones and pink lemonade, made together.', host: 'evelynn',
      pantry: KITCHEN_PANTRY, dishes: COOKS, praise: PRAISE, vessel: '🥣', ovenIcon: '🔥', ovenName: 'oven', made: 'picnic dishes', doneIcon: '🧺',
      hello: 'Let’s fill the picnic basket! Grab what we need and bring it to the table.', doneText: 'The basket is packed and the lemonade is clinking. Picnic time!' },
    shop({ id: 'picnic', name: 'Serve the picnic', icon: '🧺', blurb: 'Everyone’s on the blanket and hungry. Keep the food coming!', host: 'evelynn', time: 70, goal: 7, servedName: 'Friends fed', doneIcon: '🧺',
      stock: [{ id: 'sand', icon: '🥪', label: 'Sandwiches' }, { id: 'scone', icon: '🥯', label: 'A scone' }, { id: 'straw', icon: '🍓', label: 'Strawberries' }, { id: 'lem', icon: '🍹', label: 'Lemonade' },
        { id: 'cake', icon: '🧁', label: 'A honey cake' }, { id: 'apple', icon: '🍎', label: 'An apple' }, { id: 'tea', icon: '☕', label: 'Tea' }],
      customers: ['rosie', 'clara', 'posy'], hello: 'Everyone’s arrived for the picnic! Bring them what they ask for.',
      ask: asker(['Could I have {list}?', 'Ooh, {list}, please!', 'I’m starving! {list}?']), helps: item => `Here’s ${item.label.toLowerCase()}, dear!`,
      doneText: (n, s) => s >= 2 ? 'Nobody can eat another bite. Lila-Bella falls asleep in the sun.' : 'A lovely picnic, even if some had to wait for their scones.' }),
    // not a game on this stage: it leaves the kitchen and lays the picnic on the grass by the lake (game.js, opts.picnic)
    { id: 'lakepicnic', out: 'picnic', name: 'Have a picnic by the lake', icon: '🧺', blurb: 'Take the basket out to Aspen Meadow and lay the picnic on the grass.' },
  ] },
  treehouse: { title: 'Fun at the Treehouse', host: null, games: [
    { id: 'berries', kind: 'gather', mode: 'ground', name: 'Berry race', icon: '🫐', blurb: 'Who can pick the most before they vanish? Mind the bees.', time: 40, life: 2.6, every: .45, max: 7, items: [
      { icon: '🍓', label: 'Strawberry', weight: 4 }, { icon: '🫐', label: 'Blueberries', weight: 4 }, { icon: '🍒', label: 'Cherries', points: 2, weight: 2 }, { icon: '🍇', label: 'Wild grapes', points: 3, weight: 1 },
      { icon: '🐝', label: 'Bee', bad: true, weight: 2, say: 'Bee! Leave it be!' }], scoreIcon: '🫐',
      hello: 'Race you! Whoever picks the most berries gets the first slice of tart.', doneIcon: '🫐', doneTitle: s => `${s} berries!`, doneText: s => s >= 30 ? 'A brimming basket.' : 'A good basketful.' },
    { id: 'hide', kind: 'chase', name: 'Fox tag', icon: '🦊', blurb: 'Catch the fox! He dives into leaf piles, so search them.', time: 45, foxSpeed: 250, rivals: 1,
      hello: 'The fox wants to play tag! Catch him before I do. Watch the leaf piles rustle!', doneIcon: '🦊', doneTitle: s => `${s} points!`, doneText: () => 'The fox flops down in the leaves, panting and grinning.' },
    { id: 'wildlife', kind: 'gather', mode: 'peek', team: true, journal: true, name: 'Spot the wild animals', icon: '🦌', blurb: 'Run to each animal before it ducks back into the woods.', time: 45, life: 1.9, every: .8, max: 3,
      items: [{ icon: '🦊', label: 'Fox', say: 'A fox!' }, { icon: '🦌', label: 'Deer', say: 'A deer!' }, { icon: '🐇', label: 'Rabbit', say: 'A rabbit!', weight: 2 }, { icon: '🦉', label: 'Owl', say: 'An owl!' },
        { icon: '🐿️', label: 'Squirrel', say: 'A squirrel!', weight: 2 }, { icon: '🦔', label: 'Hedgehog', say: 'A hedgehog!', points: 2 }, { icon: '🦡', label: 'Badger', say: 'A badger!', points: 3, weight: .6 }, { icon: '🐻', label: 'Bear cub', say: 'A bear cub!', points: 3, weight: .4 }],
      scoreIcon: '👀', hello: 'Shh… animals are peeking out. Get to them before they hide! Let’s spot them all together.', doneIcon: '📔',
      doneTitle: s => `${s} sightings!`, doneText: (s, found) => `Your journal has ${found.size} kinds of animal in it today.` },
    { id: 'fireflies', kind: 'gather', mode: 'float', night: true, name: 'Firefly race', icon: '✨', blurb: 'Dusk in the woods: who can fill their jar first?', time: 35, life: 2.2, every: .35, max: 9,
      items: [{ icon: '✨', label: 'Firefly', weight: 5 }, { icon: '🌟', label: 'A bright one', points: 3, weight: 1 }, { icon: '🦋', label: 'Moth', bad: true, weight: 1, say: 'That’s a moth! It doesn’t glow.' }], scoreIcon: '🫙',
      hello: 'The fireflies are out! Most in the jar wins. Don’t catch the moths.', doneIcon: '🫙', doneTitle: s => `${s} fireflies!`, doneText: () => 'The jars glow like lanterns. Later, you let them all fly free.' },
    shop({ id: 'party', name: 'Throw a treehouse party', icon: '🎈', blurb: 'Guests keep arriving. Fetch their treats and party things.', time: 75, goal: 8, servedName: 'Guests delighted', doneIcon: '🎈',
      stock: [{ id: 'cake', icon: '🎂', label: 'Party cake' }, { id: 'cookie', icon: '🍪', label: 'A cookie' }, { id: 'cocoa', icon: '☕', label: 'Cocoa' }, { id: 'balloon', icon: '🎈', label: 'A balloon' },
        { id: 'hat', icon: '🥳', label: 'A party hat' }, { id: 'bun', icon: '🧁', label: 'An iced bun' }, { id: 'gift', icon: '🎁', label: 'A party bag' }],
      customers: PEOPLE, hello: 'Party time! Everyone wants something. Quick, quick!', ask: asker(['Can I have {list}?', '{list}, please!', 'Ooh! {list}!']),
      doneText: (n, s) => s >= 2 ? 'The best party the treehouse has ever seen. Nobody wants to go home.' : 'A merry little party, cocoa and all.' }),
  ] },
  garden: { title: 'The Royal Gardens', host: 'bramble', games: [
    { id: 'tend', kind: 'gather', mode: 'ground', team: true, name: 'Tend the gardens together', icon: '🌹', blurb: 'Grab the right tool, then water, weed and snip with your friends.', host: 'bramble', time: 50, life: 5, every: .7, max: 6,
      tools: [{ id: 'water', icon: '🚿', label: 'Watering can' }, { id: 'pull', icon: '🧤', label: 'Gloves' }, { id: 'snip', icon: '✂️', label: 'Shears' }],
      items: [{ icon: '🥀', label: 'Thirsty rose', tool: 'water', hint: 'Thirsty roses need the watering can!', weight: 3 }, { icon: '🌿', label: 'Weed', tool: 'pull', hint: 'Pull weeds with the gloves!', weight: 3 },
        { icon: '🌹', label: 'Rose for the vases', tool: 'snip', hint: 'Snip roses with the shears!', weight: 2, points: 2 }, { icon: '🌷', label: 'Tulip bud', tool: 'water', hint: 'Water the tulip bud!', weight: 2 }],
      scoreIcon: '🌱', hello: 'Plenty to do! The tools are at the back. Everyone pick one and get stuck in.', doneIcon: '🌹',
      doneTitle: s => `${s} garden jobs!`, doneText: s => s >= 45 ? 'The queen herself stops to admire the gardens.' : 'The gardens look fresh and happy. Old Bramble tips his hat.' },
    shop({ id: 'bouquet', name: 'Run the flower stall', icon: '💐', blurb: 'The castle needs flowers for every room. Fill the orders!', host: 'bramble', servedName: 'Bouquets made', doneIcon: '💐',
      stock: [{ id: 'rose', icon: '🌹', label: 'Roses' }, { id: 'tulip', icon: '🌷', label: 'Tulips' }, { id: 'sun', icon: '🌻', label: 'Sunflowers' }, { id: 'daisy', icon: '🌼', label: 'Daisies' },
        { id: 'lav', icon: '🪻', label: 'Lavender' }, { id: 'blossom', icon: '🌸', label: 'Blossom' }, { id: 'fern', icon: '🌿', label: 'Ferns' }],
      customers: ['marigold', 'aldous', 'hettie', 'clara'], hello: 'Orders from all over the castle! Fetch the flowers they ask for.',
      ask: asker(['{list} for the Queen’s sitting room.', 'Could I have {list} for the hall?', '{list}, please, for the ballroom.']), helps: item => `I’ve cut the ${item.label.toLowerCase()}.` }),
  ] },
  'royal-kitchen': { title: 'The Royal Kitchens', host: 'marigold', games: [
    { id: 'royal-cook', kind: 'cook', name: 'The banquet rush', icon: '🍲', blurb: 'Trifle, soup and honey pears, as fast as you can.', host: 'marigold',
      pantry: ROYAL_PANTRY, dishes: ROYAL_DISHES, praise: ['Splendid!', 'Fit for a queen!', 'Just so!', 'Marvellous!'], vessel: '🍲', ovenIcon: '🔥', ovenName: 'oven', made: 'banquet dishes', doneIcon: '🍲',
      hello: 'The banquet’s in an hour, Your Highness! Your friends will help. Quickly now!', doneText: 'Trumpets! The banquet is carried into the great hall.' },
  ] },
  'royal-event': { title: 'The Royal Ballroom', host: 'aldous', games: [
    { id: 'waltz', kind: 'rhythm', name: 'Lead the royal waltz', icon: '👑', blurb: 'Dance opposite the Ivory & Gold Prince. Hit every step.', partner: 3, bpm: 100, chart: () => beatChart(56, .25),
      beat: drum, sound: pluck, praise: ['Splendid!', 'Wonderful!', 'Everyone’s watching!'], oops: ['Steady…', 'Oops!'],
      hello: 'The orchestra is ready. Shall we open the ball?', doneIcon: '👑', doneTitle: 'The royal waltz', doneText: g => 'SAB'.includes(g) ? 'The whole ballroom applauds as the last note rings out.' : 'A few trodden toes, but what a waltz!' },
    shop({ id: 'banquet', name: 'Host the royal banquet', icon: '🍰', blurb: 'Guests arrive hungry. Serve the right dishes quickly.', host: 'aldous', servedName: 'Guests served', doneIcon: '🍰',
      stock: [{ id: 'cake', icon: '🍰', label: 'Cake' }, { id: 'tart', icon: '🥧', label: 'Tart' }, { id: 'straw', icon: '🍓', label: 'Strawberries' }, { id: 'grape', icon: '🍇', label: 'Grapes' },
        { id: 'tea', icon: '🫖', label: 'Tea' }, { id: 'juice', icon: '🥂', label: 'Cordial' }, { id: 'cheese', icon: '🧀', label: 'Cheese' }],
      customers: ['duchess', 'lord', 'hettie', 'jasper'], hello: 'The guests are arriving, Your Highness! Do serve them.',
      ask: asker(['I should adore {list}.', '{list}, if you please.', 'Might I trouble you for {list}?']), helps: item => `${item.label}, at once!` }),
  ] },
  stage: { title: 'The Village Stage', host: 'fennimore', games: [
    { id: 'play', kind: 'rhythm', lanes: 'stage', name: 'Star in the village play', icon: '🎭', blurb: 'Hit the cues on time and you’ll say your lines beautifully.', partner: 'herald', plays: PLAYS,
      bpm: 92, chart: () => beatChart(48, .2), laneNames: ['Bow', 'Gasp', 'Kneel', 'Twirl'], beat: n => n % 2 || tone(90, .1, 'sine', .1), sound: pluck,
      praise: ['Bravo!', 'Magnificent!', 'What delivery!'], oops: ['(psst! your line!)', '(ahem)'],
      hello: 'Curtain up! Strike your poses on the beat, and your lines will come out just right.', doneIcon: '🎭', doneTitle: 'Curtain call' },
  ] },
  festival: { title: 'The Lavender Festival', host: 'annalise', games: [
    { id: 'catch', kind: 'gather', mode: 'fall', name: 'Catch the festival treats', icon: '🧺', blurb: 'Treats tumble from the bunting. Stand under the shadows!', host: 'annalise', time: 40, every: .38, max: 8,
      items: [{ icon: '🪻', label: 'Lavender', weight: 4 }, { icon: '🍬', label: 'A sweet', weight: 2 }, { icon: '🎀', label: 'A ribbon', points: 2, weight: 2 }, { icon: '🍭', label: 'A lollipop', points: 3, weight: 1 },
        { icon: '🐝', label: 'Bee', bad: true, weight: 2, say: 'A bee! Dodge!' }], scoreIcon: '🧺',
      hello: 'Treats are falling from the bunting! Stand under the shadows to catch them. Most wins the rosette!', doneIcon: '🏵️', doneTitle: s => `${s} treasures!`, doneText: s => s >= 30 ? 'Overflowing!' : 'A lovely basket.' },
    shop({ id: 'crown', name: 'The flower-crown stall', icon: '🌼', blurb: 'Festival-goers want crowns. Fetch their flowers!', host: 'annalise', servedName: 'Crowns woven', doneIcon: '🌼',
      stock: [{ id: 'lav', icon: '🪻', label: 'Lavender' }, { id: 'daisy', icon: '🌼', label: 'Daisies' }, { id: 'rose', icon: '🌹', label: 'Roses' }, { id: 'blossom', icon: '🌸', label: 'Blossom' },
        { id: 'hib', icon: '🌺', label: 'Hibiscus' }, { id: 'sun', icon: '🌻', label: 'Sunflowers' }, { id: 'ribbon', icon: '🎀', label: 'Ribbon' }],
      customers: PEOPLE, hello: 'Everyone wants a flower crown for the maypole! Bring me the flowers they choose.',
      ask: asker(['A crown with {list}, please!', 'Could mine have {list}?', '{list} for my crown!']), helps: item => `I’ll weave in the ${item.label.toLowerCase()}.` }),
  ] },
  horses: { title: 'Annalise’s Horses', host: 'annalise', games: [
    { id: 'groom', kind: 'care', name: 'Look after the horses', icon: '🐴', blurb: 'Hay, water, a brush and an apple: work together to keep them happy.', host: 'annalise', time: 60, patience: 12,
      tools: [{ id: 'hay', icon: '🌾', label: 'Hay', react: ['munches happily.', 'crunches away.'] }, { id: 'water', icon: '🪣', label: 'Water', react: ['takes a long drink.', 'slurps and snorts.'] },
        { id: 'brush', icon: '🪮', label: 'Brush', react: ['leans into the brush.', 'gleams!'] }, { id: 'apple', icon: '🍎', label: 'Apple', react: ['whinnies with delight.', 'nuzzles you.'] }],
      animals: [{ name: 'Clover', icon: '🐴', size: 1.5 }, { name: 'Duchess', icon: '🐎', size: 1.6 }, { name: 'Moonbeam', icon: '🦄', size: 1.5 }],
      hello: 'Clover, Duchess and Moonbeam want looking after! Grab what they ask for from the back.', doneIcon: '🐴', doneTitle: 'Happy horses!', doneText: 'The horses gleam in the sunshine. Annalise says you can ride Moonbeam any time.' },
    { id: 'ride', kind: 'runner', mode: 'ride', name: 'Ride with Annalise', icon: '🏇', blurb: 'Gallop the lavender path: jump the fences, grab the apples.', partner: 'annalise', time: 45, speed: 300,
      items: [{ icon: '🍎', label: 'Apple', weight: 4 }, { icon: '🥕', label: 'Carrot', weight: 3 }, { icon: '🍀', label: 'Clover', points: 3, weight: 1, say: 'A four-leaf clover, up high!' },
        { icon: 'fence', label: 'Fence', bad: true, weight: 2.4 }], scoreIcon: '🍎',
      chatter: ['Moonbeam loves this path!', 'Jump with me!', 'Look at the lavender!', 'Faster!'], bump: ['Whoa! Steady!', 'Over the fences!', 'Oof!'],
      hello: 'Let’s ride! Space or ↑ to jump the fences. Grab apples on the way.', doneIcon: '🏇', doneTitle: s => `${s} treats gathered!`, doneText: s => s >= 25 ? 'The horses will be spoiled for a week. What a ride!' : 'A lovely gallop through the lavender.' },
  ] },
  carpenter: { title: 'The Carpenter’s Shop', host: 'tobias', greet: 'Well now, Ember! Welcome to my workshop. Mind the sawdust.', offer: 'I’ve three orders to finish today. Will you lend me a hand at the bench?', games: [
    { id: 'build', kind: 'cook', name: 'Build with Master Tobias', icon: '🪚', blurb: 'Fetch timber and tools, saw, hammer and polish.', host: 'tobias',
      pantry: WORKSHOP, dishes: BUILDS, praise: ['Good and true!', 'Steady hands!', 'That’s the way.', 'Fine work.'], vessel: '🪵', ovenIcon: '✨', ovenName: 'polishing bench', made: 'things', doneIcon: '🪚',
      hello: 'Mind the shavings! Fetch from the racks at the back and bring it to the bench.', doneText: 'Three fine pieces, and sawdust in everyone’s hair.' },
  ] },
  dress: { title: 'Lorelei’s Dress Shop', host: 'lorelei', greet: 'Ember, darling, hello! Come in, come in. Isn’t the new silk lovely?', offer: 'I’m cutting a ball gown this morning. Would you like to hold the scissors?', games: [
    { id: 'silk', kind: 'trace', name: 'Cut the silk for a ball gown', icon: '✂️', blurb: 'Follow Lorelei’s chalk lines with the scissors. The neater you cut, the finer the gown.', host: 'lorelei',
      time: 30, tol: 22, hello: 'The silk is all laid out! Cut along my chalk, and try not to wobble.' },
  ] },
  haberdashery: { title: 'Eason’s Haberdashery', host: 'eason', hostAt: [905, 500], greet: 'Good day, Ember! Ribbons, buttons, hats… welcome to my little shop.', offer: 'I’ve just spilled the whole button tin, and customers are coming. Will you help me find their buttons?', games: [
    { id: 'buttons', kind: 'buttons', name: 'The spilled button tin', icon: '🔘', blurb: 'Customers show the button they’ve lost. Find its exact twin before your friends do.', host: 'eason', rounds: 7,
      hello: 'Oh dear, the button tin! And here come the customers…', doneIcon: '🔘', doneTitle: s => `${s} points for sharp eyes`,
      doneText: s => s >= 14 ? 'Eason says he has never seen sharper eyes.' : 'Every coat is buttoned up at last.' },
  ] },
  shoes: { title: 'Leighton’s Shoe Shop', host: 'leighton', hostAt: [872, 462], greet: 'Hello, Ember! Welcome. Slippers, dancing shoes or boots today?', offer: 'Someone has muddled every box in my stockroom. Will you help me find the pairs?', games: [
    { id: 'stockroom', kind: 'pairs', name: 'The muddled stockroom', icon: '👠', blurb: 'One shoe to a box. Find the pairs before your friends, and keep an eye on the mice!', host: 'leighton', time: 80,
      hello: 'Someone’s muddled every box! Find the pairs, two peeks at a time.', doneIcon: '👠', doneTitle: s => `${s} pairs found`,
      doneText: s => s >= 8 ? 'The stockroom has never been so tidy.' : 'Leighton says the rest can wait till Monday.' },
  ] },
  toys: { title: 'Benton’s Toy Shop', host: 'benton', greet: 'Ember! Hello, hello! Welcome to the toy shop.', offer: 'Oh dear, I’ve wound up all the toys at once and they’re running off! Will you help me catch them?', games: [
    { id: 'windup', kind: 'herd', name: 'The runaway wind-up toys', icon: '🧸', blurb: 'They scuttle away from you! Get behind them and drive them into the toy chest.', host: 'benton', time: 70,
      toys: [['🧸', 'Teddy', 'scurry'], ['🚂', 'Tin train', 'zoom'], ['🐸', 'Wind-up frog', 'hop'], ['🦆', 'Clockwork duck', 'scurry'], ['🐭', 'Clockwork mouse', 'zoom'], ['🤖', 'Tin robot', 'scurry'], ['🐇', 'Hopping bunny', 'hop'], ['🐢', 'Tin tortoise', 'scurry']],
      hello: 'Oh no, I wound them all up at once! Quick, herd them into the chest!' },
  ] },
  books: { title: 'Mabel’s Bookshop', host: 'mabel', greet: 'Hello, Ember, and welcome. Mind the stacks by the door.', offer: 'My readers never remember their titles. Will you help me find the right books for them?', games: [
    { id: 'whichbook', kind: 'riddle', name: 'Which book was it?', icon: '📚', blurb: 'Readers only half remember their book. Work it out from the clues: guess early for more points.', host: 'mabel', rounds: 6, every: 4.5,
      hello: 'Readers who can’t remember titles! My favourite kind. Listen to their clues…', doneIcon: '📚', doneTitle: s => `${s} points`,
      doneText: s => s >= 16 ? 'Mabel wants to hire you on the spot.' : 'Every reader went home with the right book in the end.' },
  ] },
  boating: { title: 'Boating on the Lake', host: null, games: [
    { id: 'boat', kind: 'runner', mode: 'boat', name: 'Sail with Cashamir', icon: '⛵', blurb: 'Steer between lanes: gather lilies, dodge rocks and logs.', partner: 2, partnerName: 'Cashamir', time: 45, speed: 230,
      items: [{ icon: '🪷', label: 'Water lily', weight: 4 }, { icon: '🦢', label: 'Swan', points: 2, weight: 1, say: 'A swan, alongside us!' }, { icon: '🦆', label: 'Duckling', points: 2, weight: 1 },
        { icon: '🪨', label: 'Rock', bad: true, weight: 2 }, { icon: '🪵', label: 'Log', bad: true, weight: 1 }], scoreIcon: '🪷',
      chatter: ['Lilies to the left!', 'You’re a natural sailor.', 'The villa looks lovely from here.', 'Hold steady…'], bump: ['Hold on!', 'Rocks!', 'Careful!'],
      hello: '↑ and ↓ to steer. Gather the lilies; mind the rocks.', doneIcon: '⛵', doneTitle: s => `${s} lilies and friends!`,
      doneText: s => s >= 30 ? 'The boat is full of lilies. Cashamir weaves one into your hair.' : 'You drift back to the dock as the water turns gold.' },
  ] },
  'villa-animals': { title: 'The Villa Farm', host: 'pella', games: [
    { id: 'animals', kind: 'care', name: 'Care for the villa animals', icon: '🦚', blurb: 'Food, water, a wash and a cuddle, with your friends helping.', host: 'pella', time: 60, patience: 12,
      tools: [{ id: 'food', icon: '🌽', label: 'Food', react: ['gobbles it up.', 'nibbles happily.'] }, { id: 'water', icon: '💧', label: 'Water', react: ['drinks deeply.', 'splashes a little.'] },
        { id: 'clean', icon: '🧽', label: 'Wash', react: ['looks spotless.', 'shakes off happily.'] }, { id: 'love', icon: '💕', label: 'Cuddle', react: ['snuggles close.', 'nuzzles back.'] }],
      animals: [{ name: 'Peony', icon: '🦚' }, { name: 'Bramble', icon: '🐐' }, { name: 'Pip', icon: '🦆', size: .7 }, { name: 'Snowdrop', icon: '🐑' }, { name: 'Clementine', icon: '🐇', size: .7 }],
      hello: 'Breakfast time, and everyone’s calling at once! Help me, please!', doneIcon: '🦚', doneTitle: 'Every animal is content!', doneText: 'Peony fans out her tail in thanks.' },
  ] },
  'villa-dance': { title: 'The Villa Ballroom', host: null, games: [
    { id: 'dance', kind: 'rhythm', name: 'Dance with Cashamir', icon: '💃', blurb: 'He leads, you follow: hit the steps as they reach the line.', partner: 2, partnerName: 'Cashamir', bpm: 112, chart: () => beatChart(64, .35),
      beat: drum, sound: pluck, praise: ['You dance like a breeze.', 'Wonderful!', 'Perfect!'], oops: ['Oops!', 'Steady…'],
      hello: 'May I have this dance?', doneIcon: '💃', doneTitle: 'The last dance', doneText: g => 'SAB'.includes(g) ? 'You whirl to a stop under the chandeliers. Everyone applauds, and Cashamir bows.' : 'A few trodden toes, and a lot of laughing.' },
  ] },
  'villa-piano': { title: 'The Music Room', host: null, games: [
    { id: 'piano', kind: 'rhythm', name: 'Play a duet with Cashamir', icon: '🎹', blurb: 'His song “Lake at Dusk”: play the melody as he plays the bass.', partner: 2, partnerName: 'Cashamir', bpm: 96, chart: melodyChart, prop: 'piano', noteIcon: '♪',
      beat: n => n % 2 || tone([130.81, 98, 110, 87.31][(n / 4 | 0) % 4], .9, 'triangle', .12), sound: n => piano(n.freq), praise: ['Beautiful.', 'You have a gift.', 'Just like that.'], oops: ['Not quite…', 'Again?'],
      hello: '“Play with me? I’ll take the low notes.”', doneIcon: '🎹', doneTitle: 'A duet with Cashamir',
      doneText: g => 'SAB'.includes(g) ? 'The last note hangs over the lake. “We should play at the next royal ball.”' : 'You laugh through the wrong notes together. “Again tomorrow?”' },
  ] },
};
// ================= the village shops: a different puzzle behind every door =================
const ri = n => Math.random() * n | 0;
// a customer walks in from the right to be helped, and back out again
function walkIn(key, x, y) {
  const c = makeActor(npc(key), 1010, y, { facing: -1, speed: 230, state: 'in' });
  S.actors.push(c); goTo(c, x, y);
  return c;
}
function walkOut(c) { c.state = 'out'; c.tx = 1040; c.ty = c.y; c.facing = 1; }
// walking the scene's customers in and out; returns true while nobody is being helped
function customerGone(c) {
  if (c.state === 'in' && c.tx == null) { c.state = 'wait'; c.facing = -1; }
  if (c.state === 'out' && c.tx == null) { c.off = true; return true; }
  return false;
}

// --- RIDDLE (the bookshop): a reader only half remembers the book they want. A clue at a time, work out which
// one on the shelf it is and fetch it before your friends do. Guess early for more points; a wrong guess costs one.
const SPINES = [['red', '#b4483c'], ['blue', '#3f64a6'], ['green', '#4f8a4c'], ['gold', '#cf9d36'], ['purple', '#7b52a0']];
const COVERS = [['⚓', 'an anchor', 'anchors'], ['🐉', 'a dragon', 'dragons'], ['👑', 'a crown', 'crowns'], ['🌹', 'a rose', 'roses'], ['⭐', 'a star', 'stars']];
const riddle = {
  setup(g) {
    S.players = [S.player, ...S.mates]; S.found = new Set(); S.round = 0; S.next = 1; S.reader = null; S.shown = []; S.by0 = FY0 + 6;
    S.queue = shuffle(PEOPLE);
    S.mates.forEach((m, i) => { m.speed = 170 - i * 10; m.dare = .08 + i * .06; });
    standsAt(S.player, 300, 470);
    if (S.host) standsAt(S.host, 905, FY0 + 14);
    riddle.shelf();
  },
  shelf() {
    const all = [];
    SPINES.forEach((_, c) => COVERS.forEach((_, m) => all.push({ c, m, tall: Math.random() < .5 })));
    S.books = shuffle(all).slice(0, 12).map((b, i) => ({ ...b, i, x: 62 + i * 70, y: FY0 - 4 }));
  },
  // every true thing the reader could remember about the book
  clues(t) {
    const B = S.books, nb = b => [B[b.i - 1], B[b.i + 1]].filter(Boolean);
    const out = [
      { text: `It’s ${SPINES[t.c][0]}.`, ok: b => b.c === t.c },
      { text: `There’s ${COVERS[t.m][1]} on the cover.`, ok: b => b.m === t.m },
      { text: t.tall ? 'It’s one of the tall ones.' : 'It’s a little short one.', ok: b => b.tall === t.tall },
      { text: `It’s on the ${t.i < 6 ? 'left' : 'right'} half of the shelf.`, ok: b => (b.i < 6) === (t.i < 6) },
    ];
    SPINES.forEach(([n], c) => { if (c !== t.c) out.push({ text: `It isn’t ${n}.`, ok: b => b.c !== c }); });
    COVERS.forEach(([, , n], m) => { if (m !== t.m) out.push({ text: `No ${n} on it.`, ok: b => b.m !== m }); });
    new Set(nb(t).map(b => b.c)).forEach(c => out.push({ text: `It’s right next to a ${SPINES[c][0]} book.`, ok: b => nb(b).some(n => n.c === c) }));
    if (t.i === 0 || t.i === B.length - 1) out.push({ text: 'It’s at one end of the shelf.', ok: b => b.i === 0 || b.i === B.length - 1 });
    return out;
  },
  arrive(g) {
    riddle.shelf();
    S.round++; S.target = pick(S.books); S.pool = shuffle(riddle.clues(S.target)); S.cands = [...S.books]; S.shown = []; S.clueT = 99; S.solved = false; S.roundT = 0;
    S.players.forEach(a => { a.want = null; });
    S.reader = walkIn(S.queue[(S.round - 1) % S.queue.length], 790, 488);
  },
  // the next clue: one that rules out some of what's left, but not too much at once
  clue(g) {
    const left = S.cands.length, opts = S.pool.map(c => ({ c, n: S.cands.filter(c.ok).length })).filter(o => o.n < left);
    if (!opts.length) return;
    const soft = opts.filter(o => o.n >= 2);
    const o = soft.length ? soft.sort((a, b) => Math.abs(a.n - left * .6) - Math.abs(b.n - left * .6))[0] : opts[0];
    S.pool.splice(S.pool.indexOf(o.c), 1); S.shown.push(o.c.text); S.cands = S.cands.filter(o.c.ok);
    talk(S.reader, (S.shown.length === 1 ? pick(['I can’t remember the title, but… ', 'Hmm, let me think. ', '']) : '') + o.c.text, 4);
    S.clueT = g.every;
    S.mates.forEach((m, i) => { m.think = Math.max(m.think, rand(2.2, 4) + i * .6); });   // everyone needs a moment to think it through
  },
  choose(g, a, b) {
    if (S.solved || b.wrong) return;
    a.want = null;
    if (b !== S.target) {
      b.wrong = true; S.cands = S.cands.filter(c => c !== b); a.stun = .7; boop();
      a.score = Math.max(0, a.score - 1); floatText(b.x, b.y - 90, '−1', '#ffb0a0');
      talk(S.reader, pick(['No, not that one…', 'Hmm, no. That isn’t it.', 'Oh! No, mine was different.']), 2);
      S.players.forEach(p => { if (p.want === b) p.want = null; });
      return;
    }
    S.solved = true;
    const pts = Math.max(1, 6 - S.shown.length);
    a.score += pts; a.hop = .5; chime(); burst(b.x, b.y - 40, '#ffe9a8', 10);
    floatText(b.x, b.y - 96, `+${pts}`, '#ffe08a');
    talk(S.reader, a === S.player ? pick(['That’s the one! How did you know?', 'Yes! Oh, thank you!', 'My book! Clever you.']) : `Yes! Thank you, ${a.name}!`, 2.4);
    S.players.forEach(p => { p.want = null; });
    walkOut(S.reader);
  },
  update(g, dt) {
    if (S.phase !== 'play') return;
    if (!S.reader) { if ((S.next -= dt) <= 0) { if (S.round >= g.rounds) return endRace(g); riddle.arrive(g); } return; }
    const r = S.reader, was = r.state;
    if (customerGone(r)) { S.reader = null; S.next = 1; return; }
    if (was === 'in' && r.state === 'wait') S.clueT = 0;
    if (r.state !== 'wait' || S.solved) return;
    S.roundT += dt;
    if ((S.clueT -= dt) <= 0) riddle.clue(g);
    if (S.roundT > 45 && S.host) { talk(S.host, 'Here it is, dear. It’s a tricky one!', 2.4); S.solved = true; walkOut(r); return; }
    for (const a of S.players) if (a.want && Math.abs(a.x - a.want.x) < 16 && atCounter(a)) riddle.choose(g, a, a.want);
    S.mates.forEach(m => riddle.think(g, m, dt));
  },
  // friends work it out too: sure once one book is left, sometimes daring a guess between two or three
  think(g, a, dt) {
    if (a.want || S.solved || (a.think -= dt) > 0) return;
    a.think = rand(.7, 1.2);
    const n = S.cands.length;
    if (n === 1 || (n === 2 && Math.random() < a.dare) || (n === 3 && Math.random() < a.dare / 3)) { a.want = pick(S.cands); goTo(a, a.want.x, FY0 + 6); }
    else if (a.tx == null && Math.random() < .3) goTo(a, rand(80, 760), rand(FY0 + 30, FY1 - 10));
  },
  press(g, k) {
    if (k !== 'act' || S.phase !== 'play' || !S.reader || S.reader.state !== 'wait') return false;
    const p = S.player, b = S.books.filter(b => Math.abs(b.x - p.x) < 36).sort((a, c) => Math.abs(a.x - p.x) - Math.abs(c.x - p.x))[0];
    if (b && p.y < FY0 + 40) riddle.choose(g, p, b); else talk(voice(), 'Walk up to a book on the shelf first.', 1.8);
    return true;
  },
  tap(g, x, y) {
    const b = S.books.find(b => Math.abs(x - b.x) < 28 && y < FY0 + 4 && y > FY0 - 90);
    if (!b) return false;
    S.player.want = b; goTo(S.player, b.x, FY0 + 6);
    return true;
  },
  back() { ctx.fillStyle = 'rgba(92,62,36,.85)'; ctx.fillRect(0, FY0 - 8, 880, 14); },
  draw(g, add) { S.books.forEach(b => add(b.y, () => drawBook(b))); },
  hud(g) {
    drawBoard(S.players, null);
    const lines = S.shown.length ? S.shown : [S.reader ? 'Listen to what they remember…' : 'Someone’s coming in…'];
    card(VW - 330, 66, 316, 44 + lines.length * 20, () => {
      label(`Reader ${Math.max(1, S.round)} of ${g.rounds}${S.shown.length ? ` · worth ${Math.max(1, 6 - S.shown.length)}` : ''}`, VW - 316, 88, 15, '#7a4e12', 'left', 800, false);
      lines.forEach((l, i) => label(S.shown.length ? `“${l}”` : l, VW - 316, 110 + i * 20, 15, '#3a2a1a', 'left', 600, false));
    });
  },
};
function drawBook(b) {
  const h = b.tall ? 76 : 54, w = 44, x = b.x - w / 2, y = b.y - 6 - h;
  ctx.save(); ctx.globalAlpha = b.wrong ? .35 : 1;
  ctx.fillStyle = SPINES[b.c][1]; ctx.strokeStyle = 'rgba(30,20,10,.55)'; ctx.lineWidth = 1.5;
  rr(x, y, w, h, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,240,200,.55)'; ctx.fillRect(x + 4, y + 6, w - 8, 3); ctx.fillRect(x + 4, y + h - 9, w - 8, 3);
  emoji(COVERS[b.m][0], b.x, y + h / 2, 22);
  ctx.restore();
  if (b.wrong) label('✗', b.x, y - 4, 20, '#ffb0a0');
}

// --- PAIRS (the shoe shop): the stockroom is muddled, one shoe to a box. Open two at a time to find pairs,
// racing your friends, and watch what they open too. Mind the mice: one scurries out and bumps two boxes round.
const SHOES = [['👠', 'dancing shoes'], ['🥿', 'slippers'], ['👢', 'riding boots'], ['🩰', 'ballet shoes'], ['👞', 'brogues'], ['👟', 'plimsolls'], ['🥾', 'walking boots'], ['🧦', 'socks'], ['🩴', 'sandals']];
const pairs = {
  setup(g) {
    S.left = g.time; S.players = [S.player, ...S.mates]; S.found = new Set(); S.boards = 0; S.mice = []; S.dealT = 0;
    S.mates.forEach((m, i) => { m.speed = 195 - i * 12; m.mem = new Map(); m.recall = .8 - i * .12; standsAt(m, 860 - i * 30, 440 + i * 34); });
    standsAt(S.player, 60, 462);
    if (S.host) standsAt(S.host, 912, FY0 + 2);
    pairs.deal(g);
  },
  deal(g) {
    S.boards++;
    const kinds = shuffle(SHOES).slice(0, 6), cells = shuffle([...kinds, ...kinds, null, null]);   // null: a mouse
    S.boxes = cells.map((shoe, i) => ({ x: 140 + (i % 7) * 116, y: i < 7 ? 430 : 506, shoe, open: null, gone: false, t: 0 }));
    S.players.forEach(a => { a.opened = []; a.want = null; a.flipT = 0; a.mem?.clear(); });
  },
  // you stand beside a box to open it, so the shoe isn't hidden behind you
  reach: (a, b) => Math.abs(a.x - b.x) < 80 && Math.abs(a.y - b.y - 4) < 34,
  side: (a, b) => b.x + (a.x < b.x ? -54 : 54),
  open(g, a, b) {
    if (b.gone || b.open || b.move || a.opened.length >= 2 || a.flipT > 0) return;
    b.open = a; b.t = 0; tick();
    if (!b.shoe) return pairs.mouse(g, a, b);
    a.opened.push(b);
    S.mates.forEach(m => { if (m === a || Math.random() < m.recall) m.mem.set(b, b.shoe); });
    if (a.opened.length === 2) a.flipT = .9;
  },
  mouse(g, a, b) {
    b.gone = true;
    [0, .1, .2].forEach(w => tone(1500 + w * 900, .07, 'square', .03, w));
    S.mice.push({ x: b.x, y: b.y, dir: b.x < 480 ? -1 : 1, age: 0 });
    a.opened.forEach(o => { o.open = null; }); a.opened = []; a.flipT = 0;
    const shut = shuffle(S.boxes.filter(o => !o.gone && !o.open && !o.move));
    if (shut.length < 2) return;
    const [p, q] = shut;
    p.move = { fx: p.x, fy: p.y, tx: q.x, ty: q.y, t: 0, up: 1 }; q.move = { fx: q.x, fy: q.y, tx: p.x, ty: p.y, t: 0, up: -1 };
    // the friends don't always follow the swap, and remember the shoes where they were
    S.mates.forEach(m => {
      if (Math.random() > .5) return;
      const mp = m.mem.get(p), mq = m.mem.get(q);
      mq ? m.mem.set(p, mq) : m.mem.delete(p); mp ? m.mem.set(q, mp) : m.mem.delete(q);
    });
    talk(voice(), pick(['A mouse! Watch which boxes it bumps!', 'Eek! It’s shuffled two boxes!', 'Mouse! Keep your eye on those two!']), 2.4);
  },
  update(g, dt) {
    if (S.phase !== 'play') return;
    S.left -= dt;
    if (S.left <= 0) return endRace(g);
    for (const b of S.boxes) {
      if (b.open) b.t += dt;
      if (b.move) {
        const m = b.move; m.t = Math.min(1, m.t + dt / 1.1); const e = m.t * m.t * (3 - 2 * m.t);
        b.x = lerp(m.fx, m.tx, e); b.y = lerp(m.fy, m.ty, e) - Math.sin(m.t * Math.PI) * 24 * m.up;
        if (m.t >= 1) { b.x = m.tx; b.y = m.ty; b.move = null; }
      }
    }
    S.mice.forEach(m => { m.age += dt; m.x += m.dir * 420 * dt; m.y += Math.sin(m.age * 30) * 2; });
    S.mice = S.mice.filter(m => m.age < 2);
    if (S.dealT > 0) { if ((S.dealT -= dt) <= 0) pairs.deal(g); return; }
    for (const a of S.players) {
      if (a.flipT > 0 && (a.flipT -= dt) <= 0) {
        const [p, q] = a.opened;
        if (p.shoe === q.shoe) {
          p.gone = q.gone = true; a.score++; a.hop = .5; pling(); burst((p.x + q.x) / 2, Math.min(p.y, q.y) - 60, '#ffe9a8', 10);
          floatText((p.x + q.x) / 2, Math.min(p.y, q.y) - 90, `${p.shoe[0]} +1`, a === S.player ? '#ffe08a' : '#d9ecff');
          if (a !== S.player && Math.random() < .5) talk(a, pick(['A pair!', 'Found them!', `The ${p.shoe[1]}!`]), 1.6);
          S.mates.forEach(m => { m.mem.delete(p); m.mem.delete(q); });
        } else if (a === S.player) boop();
        p.open = q.open = null; a.opened = [];
      }
      if (a.opened.length === 1 && a.opened[0].t > 5) { a.opened[0].open = null; a.opened = []; }   // don't keep one open forever
      const w = a.want;
      if (w && (w.gone || w.open || w.move)) a.want = null;
      else if (w && pairs.reach(a, w) && a.tx == null) { a.want = null; pairs.open(g, a, w); }
    }
    if (S.boxes.every(b => b.gone || !b.shoe)) { chime(); cheerAll(); talk(S.host || voice(), 'All matched! More boxes from the back…', 2.4); S.dealT = 1.6; return; }
    S.mates.forEach(m => pairs.think(g, m, dt));
  },
  think(g, a, dt) {
    if (a.want || a.flipT > 0 || a.opened.length >= 2 || a.stun > 0 || (a.think -= dt) > 0) return;
    a.think = rand(.5, 1);
    const shut = S.boxes.filter(b => !b.gone && !b.open && !b.move && !S.players.some(p => p !== a && p.want === b)), known = b => a.mem.get(b);
    if (!shut.length) return;
    let t = null;
    if (a.opened.length === 1) t = shut.find(b => known(b) === a.opened[0].shoe);
    else t = shut.find(b => known(b) && shut.some(o => o !== b && known(o) === known(b)));
    if (!t) { const unknown = shut.filter(b => !known(b)); t = pick(unknown.length ? unknown : shut); }
    a.want = t; goTo(a, pairs.side(a, t), t.y + 4);
  },
  press(g, k) {
    if (k !== 'act' || S.phase !== 'play') return false;
    const p = S.player, b = S.boxes.filter(b => !b.gone && pairs.reach(p, b)).sort((a, c) => Math.abs(a.x - p.x) - Math.abs(c.x - p.x))[0];
    if (b) pairs.open(g, p, b);
    return true;
  },
  tap(g, x, y) {
    const b = S.boxes.find(b => !b.gone && Math.abs(x - b.x) < 40 && y > b.y - 70 && y < b.y + 8);
    if (!b) return false;
    S.player.want = b; goTo(S.player, pairs.side(S.player, b), b.y + 4);
    return true;
  },
  draw(g, add) {
    S.boxes.forEach(b => { if (!b.gone) add(b.y, () => drawShoebox(b)); });
    S.mice.forEach(m => add(m.y + 1, () => emoji('🐁', m.x, m.y - 12, 30, m.dir > 0)));
  },
  // the shoes in open boxes sit above everyone, so nobody stands in front of them
  front() {
    for (const b of S.boxes) if (b.open && b.shoe && !b.gone) {
      const up = clamp(b.t / .2, 0, 1), y = b.y - 70 - up * 30;
      ctx.save(); ctx.globalAlpha = up; ctx.fillStyle = 'rgba(255,250,240,.95)'; ctx.strokeStyle = b.open === S.player ? '#d9a43a' : 'rgba(58,42,26,.4)'; ctx.lineWidth = 2.5;
      rr(b.x - 27, y - 27, 54, 54, 12); ctx.fill(); ctx.stroke(); emoji(b.shoe[0], b.x, y, 34); ctx.restore();
    }
  },
  hud(g) { drawBoard(S.players, null, '👟'); label(S.player.opened.length === 1 ? 'Now find its twin!' : 'Stand by a box and press Space (or tap it)', VW / 2, VH - 12, 14, '#fff3d0'); },
};
function drawShoebox(b) {
  const k = scaleAt(b.y), w = 70 * k, h = 40 * k, x = b.x - w / 2, y = b.y - h;
  ctx.save();
  ctx.fillStyle = 'rgba(25,20,12,.25)'; ctx.beginPath(); ctx.ellipse(b.x, b.y, w * .6, 7 * k, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#b98a5a'; ctx.strokeStyle = 'rgba(58,36,20,.6)'; ctx.lineWidth = 1.5;
  rr(x, y, w, h, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#f2e6cf'; ctx.fillRect(b.x - 9 * k, y + h * .3, 18 * k, h * .4);
  const lift = b.open ? clamp(b.t / .2, 0, 1) : 0;   // the lid tips back when it's open
  ctx.fillStyle = '#c99a68'; rr(x - 4 * k, y - 10 * k - lift * 22 * k, w + 8 * k, 12 * k, 3); ctx.fill(); ctx.stroke();
  ctx.restore();
}

// --- HERD (the toy shop): Benton's wind-up toys have escaped across the floor. They scuttle away from whoever
// comes close, so get round behind one and drive it into the toy chest. They run down, rest, then they're off again.
const herd = {
  setup(g) {
    S.left = g.time; S.players = [S.player, ...S.mates]; S.found = new Set(); S.packed = 0;
    S.chest = { x: 480, y: 452 };
    S.mates.forEach((m, i) => { m.speed = 200 - i * 10; });
    standsAt(S.player, 480, 515);
    if (S.host) standsAt(S.host, 905, FY0 + 10);
    S.toys = g.toys.map(([icon, label, kind], i) => {
      const x = i % 2 ? rand(90, 330) : rand(630, 870);
      return { icon, label, kind, x, y: rand(FY0 + 10, FY1 - 10), ang: rand(0, 7), wind: rand(.5, 3), rest: 0, turn: 0, hopT: 0, packed: false, by: null, key: 0 };
    });
  },
  update(g, dt) {
    if (S.phase !== 'play') return;
    S.left -= dt;
    if (S.left <= 0) return herd.end(g);
    for (const t of S.toys) {
      if (t.packed) { t.sink = Math.min(1, (t.sink || 0) + dt * 2.5); continue; }
      let vx = 0, vy = 0;
      if (t.wind > 0) {
        t.wind -= dt; t.key += dt * 9;
        let sp = 90;
        if (t.kind === 'zoom') sp = 220;
        else if (t.kind === 'hop') { if ((t.hopT -= dt) <= 0) { t.hopT = .8; t.ang = rand(0, 7); } sp = t.hopT > .55 ? 280 : 0; }
        else if ((t.turn -= dt) <= 0) { t.ang += rand(-1.5, 1.5); t.turn = rand(.5, 1.2); }
        vx = Math.cos(t.ang) * sp; vy = Math.sin(t.ang) * sp * .6;
        if (t.wind <= 0) t.rest = rand(1.6, 3);
      } else if ((t.rest -= dt) <= 0) { t.wind = rand(3, 6); t.ang = rand(0, 7); }
      for (const a of S.players) {
        const dx = t.x - a.x, dy = (t.y - a.y) * 1.6, d = Math.hypot(dx, dy) || 1;
        if (d < 135 && t.wind > 0 && t.kind !== 'zoom') { const f = 150 * (1 - d / 135); vx += dx / d * f; vy += dy / d * f / 1.6; }   // shy of anyone close
        if (d < 50) { t.x = a.x + dx / d * 50; t.y = a.y + dy / d * 50 / 1.6; t.by = a; if (t.kind === 'zoom') t.ang = Math.atan2(dy / 1.6, dx); }   // pushed along
      }
      t.x += vx * dt; t.y += vy * dt;
      if (t.x < S.bx0 + 10 || t.x > S.bx1 - 10) { t.x = clamp(t.x, S.bx0 + 10, S.bx1 - 10); t.ang = Math.PI - t.ang; }
      if (t.y < FY0 + 2 || t.y > FY1 - 2) { t.y = clamp(t.y, FY0 + 2, FY1 - 2); t.ang = -t.ang; }
      if (Math.hypot(t.x - S.chest.x, (t.y - S.chest.y) * 1.6) < 40) herd.pack(g, t);
    }
    if (S.toys.every(t => t.packed)) return herd.end(g);
    S.mates.forEach(m => herd.think(g, m, dt));
  },
  pack(g, t) {
    t.packed = true; S.packed++; chime(); burst(S.chest.x, S.chest.y - 50, '#ffe9a8', 10);
    if (t.by) { t.by.score++; t.by.hop = .5; }
    floatText(S.chest.x, S.chest.y - 90, `${t.icon} in!`, '#ffe08a');
    talk(S.host || voice(), t.by ? (t.by === S.player ? pick([`The ${t.label.toLowerCase()}! Well herded!`, 'In it goes!', 'Got it, clever thing!']) : `${t.by.name} caught the ${t.label.toLowerCase()}!`)
      : `The ${t.label.toLowerCase()} wandered in all by itself!`, 2.2);
  },
  // friends herd too: walk round to the far side of a toy, then drive it home
  think(g, a, dt) {
    if ((a.think -= dt) > 0) return;
    a.think = rand(.18, .3);
    const free = S.toys.filter(t => !t.packed), far = t => Math.hypot(t.x - a.x, t.y - a.y);
    if (!a.goal || a.goal.packed) a.goal = free.filter(t => !S.mates.some(m => m !== a && m.goal === t)).sort((p, q) => far(p) - far(q))[0] || free[0];
    const t = a.goal;
    if (!t) return;
    const dx = t.x - S.chest.x, dy = (t.y - S.chest.y) * 1.6, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
    const bx = t.x + ux * 72, by = t.y + uy * 72 / 1.6, ahead = (a.x - t.x) * ux + (a.y - t.y) * 1.6 * uy;
    if (ahead > 25 && Math.hypot(a.x - bx, (a.y - by) * 1.6) < 70) goTo(a, S.chest.x, S.chest.y);
    else if (ahead < 25) goTo(a, bx - uy * 90, by + ux * 90 / 1.6);    // round the side, not through it
    else goTo(a, bx, by);
  },
  end(g) {
    const n = S.toys.length, stars = S.packed === n && S.left > g.time * .3 ? 3 : S.packed >= n * .75 ? 2 : 1;
    const ranked = [...S.players].sort((a, b) => b.score - a.score);
    results({ icon: '🧸', title: `${S.packed} of ${n} toys back in the chest ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}`,
      text: S.packed === n ? 'Every last toy tucked away, and Benton winds up the music box to celebrate.' : 'Benton laughs: the rest can play on the floor until closing time.',
      stats: ranked.map(a => `${a.name}: ${a.score}`) });
  },
  draw(g, add) {
    add(S.chest.y, () => {
      const { x, y } = S.chest;
      ctx.fillStyle = 'rgba(25,20,12,.3)'; ctx.beginPath(); ctx.ellipse(x, y, 62, 10, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#7a4a2a'; ctx.strokeStyle = 'rgba(40,24,12,.7)'; ctx.lineWidth = 2;
      rr(x - 58, y - 74, 116, 26, 6); ctx.fill(); ctx.stroke();   // the lid, propped open behind
      S.toys.filter(t => t.packed).forEach((t, i) => emoji(t.icon, x - 40 + (i % 5) * 20, y - 40 - (1 - t.sink) * 30, 22));
      ctx.fillStyle = '#9a6034'; rr(x - 54, y - 44, 108, 44, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e0b45a'; ctx.fillRect(x - 54, y - 30, 108, 5); ctx.fillRect(x - 6, y - 36, 12, 14);
    });
    for (const t of S.toys) if (!t.packed) add(t.y, () => {
      const k = scaleAt(t.y), hop = t.kind === 'hop' && t.hopT > .55 ? Math.sin((t.hopT - .55) / .25 * Math.PI) * 16 : 0;
      ctx.fillStyle = 'rgba(25,20,12,.25)'; ctx.beginPath(); ctx.ellipse(t.x, t.y, 18 * k, 5 * k, 0, 0, 7); ctx.fill();
      const wob = t.wind > 0 ? Math.sin(S.t * 22) * .12 : 0;
      ctx.save(); ctx.translate(t.x, t.y - 20 * k - hop); ctx.rotate(wob); emoji(t.icon, 0, 0, 40 * k, Math.cos(t.ang) > 0); ctx.restore();
      ctx.save(); ctx.translate(t.x, t.y - 46 * k - hop); ctx.rotate(t.key); ctx.strokeStyle = '#d9a43a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(7, 0); ctx.stroke(); ctx.restore();
      if (t.wind <= 0) label('z', t.x + 16, t.y - 52 * k, 13, '#fff3d0');
    });
  },
  hud(g) { drawBoard(S.players, `In the chest: ${S.packed} of ${S.toys.length}`, '🧸'); },
};

// --- BUTTONS (the haberdashery): the button tin has spilled across the floor. Each customer shows the button
// off their coat; find its exact twin before your friends do. The near-misses differ by one small thing.
const BTN = { colours: [['red', '#c0473f'], ['navy', '#2f4f86'], ['mustard', '#d9a43a'], ['sage', '#7d9a6a'], ['pink', '#e59ab4'], ['plum', '#6a4a8a']], shapes: ['round', 'square', 'flower', 'heart'] };
const buttons = {
  setup(g) {
    S.players = [S.player, ...S.mates]; S.found = new Set(); S.round = 0; S.next = 1; S.reader = null; S.btns = [];
    S.queue = shuffle(PEOPLE);
    standsAt(S.player, 420, 470);
    if (S.host) standsAt(S.host, 908, FY0 + 2);
  },
  deal(g) {
    S.round++; S.roundT = 0; S.solved = false;
    const any = () => ({ c: ri(6), s: ri(4), h: Math.random() < .5 ? 2 : 4, rim: Math.random() < .5 });
    const key = b => `${b.c}${b.s}${b.h}${b.rim}`;
    const tweak = (b, n) => {
      const o = { ...b };
      shuffle(['c', 's', 'h', 'rim']).slice(0, n).forEach(f => {
        if (f === 'c') o.c = (o.c + 1 + ri(5)) % 6; else if (f === 's') o.s = (o.s + 1 + ri(3)) % 4; else if (f === 'h') o.h = 6 - o.h; else o.rim = !o.rim;
      });
      return o;
    };
    const t = any(), list = [t], seen = new Set([key(t)]), near = Math.min(8, 2 + S.round);   // later customers bring trickier buttons
    for (let n = 0; list.length < 16 && n < 500; n++) { const o = list.length <= near ? tweak(t, 1) : list.length <= near + 4 ? tweak(t, 2) : any(); if (!seen.has(key(o))) { seen.add(key(o)); list.push(o); } }
    const spots = shuffle([...Array(16)].map((_, i) => [96 + (i % 8) * 96 + rand(-16, 16), (i < 8 ? 414 : 490) + rand(-10, 10)]));
    S.btns = list.map((b, i) => ({ ...b, x: spots[i][0], y: spots[i][1], wrong: false }));
    S.target = S.btns[0];
    S.mates.forEach((m, i) => { m.want = null; m.spotT = rand(6, 11) + i * 1.5 - S.round * .4; });
    S.player.want = null;
  },
  // what gives a near-miss away, said the way a customer would
  differ(b) {
    const t = S.target;
    if (b.h !== t.h) return `mine has ${t.h} holes`;
    if (b.rim !== t.rim) return t.rim ? 'mine has a rim round the edge' : 'mine has no rim';
    if (b.s !== t.s) return `mine is ${BTN.shapes[t.s] === 'round' ? 'round' : `a ${BTN.shapes[t.s]}`}`;
    return `mine is ${BTN.colours[t.c][0]}`;
  },
  choose(g, a, b) {
    if (S.solved || b.wrong) return;
    a.want = null;
    if (b !== S.target) {
      b.wrong = true; a.stun = 1; boop();
      talk(S.reader, `Close! But ${buttons.differ(b)}.`, 2.4);
      S.players.forEach(p => { if (p.want === b) p.want = null; });
      return;
    }
    S.solved = true;
    const pts = S.roundT < 6 ? 3 : S.roundT < 12 ? 2 : 1;
    a.score += pts; a.hop = .5; chime(); burst(b.x, b.y - 20, '#ffe9a8', 10); floatText(b.x, b.y - 60, `+${pts}`, '#ffe08a');
    talk(S.reader, a === S.player ? pick(['That’s it exactly!', 'My button! You’ve sharp eyes.', 'Perfect. Now my coat will close!']) : `Oh, well spotted, ${a.name}!`, 2.4);
    walkOut(S.reader);
  },
  update(g, dt) {
    if (S.phase !== 'play') return;
    if (!S.reader) { if ((S.next -= dt) <= 0) { if (S.round >= g.rounds) return endRace(g); buttons.deal(g); S.reader = walkIn(S.queue[(S.round - 1) % S.queue.length], 848, 502); } return; }
    const r = S.reader, was = r.state;
    if (customerGone(r)) { S.reader = null; S.next = .8; S.btns = []; return; }
    if (was === 'in' && r.state === 'wait') talk(r, pick(['I’ve lost a button off my coat. This one!', 'Have you one just like this?', 'I need a twin for this little button.']), 2.6);
    if (r.state !== 'wait' || S.solved) return;
    S.roundT += dt;
    if (S.roundT > 30 && S.host) { talk(S.host, 'Here, I’ve found it. A sneaky one!', 2.4); S.solved = true; walkOut(r); return; }
    for (const a of S.players) if (a.want && nearFeet(a, a.want.x, a.want.y, 22, 14)) buttons.choose(g, a, a.want);
    for (const m of S.mates) {
      if (m.want || m.stun > 0 || (m.spotT -= dt) > 0) continue;
      const decoys = S.btns.filter(b => !b.wrong && b !== S.target);
      m.want = Math.random() < .3 && decoys.length ? pick(decoys) : S.target; goTo(m, m.want.x, m.want.y); m.spotT = rand(2, 4);
    }
  },
  press(g, k) {
    if (k !== 'act' || S.phase !== 'play') return false;
    if (S.reader?.state !== 'wait' || S.solved) return true;
    const p = S.player, b = S.btns.filter(b => nearFeet(p, b.x, b.y, 40, 22)).sort((a, c) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(c.x - p.x, c.y - p.y))[0];
    if (b) buttons.choose(g, p, b); else talk(voice(), 'Stand on a button first.', 1.6);
    return true;
  },
  tap(g, x, y) {
    const b = S.btns.find(b => Math.abs(x - b.x) < 26 && Math.abs(y - b.y) < 20);
    if (!b) return false;
    S.player.want = b; goTo(S.player, b.x, b.y);
    return true;
  },
  draw(g, add) {
    S.btns.forEach(b => add(b.y - 30, () => {   // flat on the floor: drawn under anyone standing near
      const k = scaleAt(b.y);
      ctx.save(); ctx.globalAlpha = b.wrong ? .3 : 1; ctx.translate(b.x, b.y); ctx.scale(1, .62); drawButton(b, 20 * k); ctx.restore();
    }));
  },
  hud(g) {
    drawBoard(S.players, null);
    card(VW - 214, 66, 200, 120, () => {
      label(`Customer ${Math.max(1, S.round)} of ${g.rounds}`, VW - 114, 88, 15, '#7a4e12', 'center', 800, false);
      if (S.reader && S.target) { ctx.save(); ctx.translate(VW - 114, 138); drawButton(S.target, 34); ctx.restore(); }
      else label('…', VW - 114, 142, 20, '#3a2a1a', 'center', 700, false);
    });
  },
};
function drawButton(b, r) {
  const col = BTN.colours[b.c][1], shape = BTN.shapes[b.s];
  ctx.fillStyle = col; ctx.strokeStyle = 'rgba(30,20,10,.55)'; ctx.lineWidth = Math.max(1, r * .07);
  ctx.beginPath();
  if (shape === 'round') ctx.arc(0, 0, r, 0, 7);
  else if (shape === 'square') rr(-r * .9, -r * .9, r * 1.8, r * 1.8, r * .25);
  else if (shape === 'flower') for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; ctx.moveTo(Math.cos(a) * r * .55 + r * .45, Math.sin(a) * r * .55); ctx.arc(Math.cos(a) * r * .55, Math.sin(a) * r * .55, r * .45, 0, 7); }
  else { ctx.moveTo(0, r * .9); ctx.bezierCurveTo(-r * 1.3, -r * .1, -r * .6, -r * 1.1, 0, -r * .4); ctx.bezierCurveTo(r * .6, -r * 1.1, r * 1.3, -r * .1, 0, r * .9); }
  ctx.fill(); ctx.stroke();
  if (b.rim) { ctx.strokeStyle = 'rgba(255,245,220,.85)'; ctx.lineWidth = Math.max(1.5, r * .12); ctx.beginPath(); ctx.arc(0, 0, r * .62, 0, 7); ctx.stroke(); }
  ctx.fillStyle = 'rgba(25,16,8,.8)';
  const holes = b.h === 2 ? [[-.22, 0], [.22, 0]] : [[-.2, -.2], [.2, -.2], [-.2, .2], [.2, .2]];
  holes.forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x * r, y * r, r * .1, 0, 7); ctx.fill(); });
}

// --- TRACE (the dress shop): Lorelei has chalked a pattern on the silk. Walk the scissors along the
// line to cut each piece out while friends hold the corners. The neater the cutting, the finer the gown.
const SILKS = ['#e7a3b6', '#b9a3dc', '#a9d3b8', '#f0d98a'];
const PATTERNS = [
  { name: 'The skirt', pts: () => [...line([.4, .06], [.6, .06]), ...line([.6, .06], [.92, .9]), ...curve(s => [.92 - .84 * s, .9 + .07 * Math.sin(Math.PI * s)]), ...line([.08, .9], [.4, .06])] },
  { name: 'The bodice', pts: () => [[.32, .14], [.41, .03], [.5, .2], [.59, .03], [.68, .14], [.64, .88], [.5, .98], [.36, .88], [.32, .14]].reduce((o, p, i, a) => i ? [...o, ...line(a[i - 1], p)] : o, []) },
  { name: 'A puffed sleeve', pts: () => [...curve(s => { const a = Math.PI * (1 - s), r = .42 + .05 * Math.abs(Math.sin(a * 5)); return [.5 + Math.cos(a) * r * .9, .8 - Math.sin(a) * r * 1.7]; }), ...line([.878, .8], [.66, .97]), ...line([.66, .97], [.34, .97]), ...line([.34, .97], [.122, .8])] },
  { name: 'The sash bow', pts: () => curve(s => { const t = s * Math.PI * 2, q = 1 + Math.sin(t) ** 2; return [.5 + .44 * Math.cos(t) / q, .5 + 1.25 * Math.sin(t) * Math.cos(t) / q]; }) },
];
function line(a, b) { return [0, .25, .5, .75].map(s => [lerp(a[0], b[0], s), lerp(a[1], b[1], s)]); }
function curve(f, n = 40) { return [...Array(n + 1)].map((_, i) => f(i / n)); }
const trace = {
  setup(g) {
    S.cuts = []; S.piece = -1; S.left = 0; S.next = .2;
    S.fab = { x0: 240, x1: 720, y0: FY0 + 8, y1: FY1 - 4 };
    const f = S.fab;
    S.mates.forEach((m, i) => { standsAt(m, [f.x0 - 30, f.x1 + 30, f.x1 + 30][i] ?? f.x0 - 30, [f.y0 + 10, f.y0 + 10, f.y1][i] ?? f.y1); m.facing = i ? -1 : 1; });
    standsAt(S.player, 130, 480);
    if (S.host) standsAt(S.host, 880, FY0 + 20);
    S.player.speed = 150;
  },
  // the chalk line, measured out in even steps along the silk
  begin(g) {
    S.piece++; const f = S.fab, raw = PATTERNS[S.piece].pts().map(([u, v]) => [lerp(f.x0, f.x1, u), lerp(f.y0, f.y1, v)]), P = [raw[0]];
    for (const q of raw.slice(1)) {
      let last = P.at(-1), d = Math.hypot(q[0] - last[0], q[1] - last[1]);
      while (d >= 6) { const t = 6 / d; last = [lerp(last[0], q[0], t), lerp(last[1], q[1], t)]; P.push(last); d = Math.hypot(q[0] - last[0], q[1] - last[1]); }
    }
    S.path = P; S.at = 0; S.started = false; S.offd = 0; S.snips = []; S.left = g.time; S.px = S.player.x; S.py = S.player.y; S.fussT = 0; S.lift = 0;
    talk(S.host || voice(), S.piece ? `Now ${PATTERNS[S.piece].name.toLowerCase()}. Start at the scissors!` : 'Start at the little scissors and follow the chalk all the way round.', 3);
  },
  update(g, dt) {
    if (S.phase !== 'play') return;
    if (S.lift > 0) S.lift = Math.max(0, S.lift - dt);
    if (!S.path || S.done) { if ((S.next -= dt) <= 0) { if (S.piece + 1 >= PATTERNS.length) return trace.end(g); S.done = false; trace.begin(g); } return; }
    const p = S.player, P = S.path;
    let best = -1, bd = 1e9;
    for (let i = S.at; i < Math.min(P.length, S.at + 14); i++) { const d = Math.hypot(P[i][0] - p.x, P[i][1] - p.y); if (d < bd) { bd = d; best = i; } }
    const moved = Math.hypot(p.x - S.px, p.y - S.py); S.px = p.x; S.py = p.y;
    if (bd < g.tol) { if (best > S.at && S.at % 4 === 0) tone(1700 + rand(-80, 80), .03, 'square', .015); S.at = Math.max(S.at, best); S.started = true; }
    else if (S.started && moved > 0) {
      S.offd += moved; S.fussT -= dt;
      if (S.snips.length < 400 && (!S.snips.length || Math.hypot(S.snips.at(-1)[0] - p.x, S.snips.at(-1)[1] - p.y) > 8)) S.snips.push([p.x, p.y]);
      if (S.fussT <= 0 && bd > g.tol * 1.6) { talk(pick(S.mates) || voice(), pick(['Steady…', 'Ooh, back to the line!', 'Careful, the chalk’s over here!']), 1.4); S.fussT = 3; }
    }
    if (S.started) S.left -= dt;
    if (S.at >= P.length - 3 || S.left <= 0) trace.finish(g);
  },
  finish(g) {
    const P = S.path, cut = S.at * 6, got = S.at / (P.length - 1), acc = cut / (cut + S.offd || 1), score = Math.round(100 * acc * Math.min(1, got + .02));
    S.cuts.push({ name: PATTERNS[S.piece].name, score, silk: SILKS[S.piece % SILKS.length], path: P });
    S.done = true; S.next = 1.8; S.lift = 1.4;
    chime(); burst(S.player.x, S.player.y - 40, '#ffe9a8', 12); cheerAll();
    floatText(S.player.x, S.player.y - 220, `${score}%`, '#ffe08a', 28);
    talk(S.host || voice(), got < .95 ? 'I’ll finish that last bit. Not bad at all!' : score >= 90 ? pick(['Beautiful! Not a single wobble.', 'Perfect! Such a clean line.']) : score >= 70 ? 'Very nice. A little wavy, but it will hang beautifully.' : 'A touch jagged… I shall hide it in the seam!', 2.6);
  },
  end(g) {
    const avg = Math.round(S.cuts.reduce((s, c) => s + c.score, 0) / S.cuts.length), stars = avg >= 88 ? 3 : avg >= 70 ? 2 : 1;
    results({ icon: '👗', title: `A gown for the ball ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}`,
      text: stars === 3 ? 'Lorelei sews it up overnight. In the window the next morning, it stops the whole street.' : stars === 2 ? 'Lorelei stitches the pieces together. It twirls beautifully.' : 'With a few clever tucks, Lorelei makes it lovely anyway.',
      stats: S.cuts.map(c => `${c.name}: ${c.score}% neat`) });
  },
  back(g) {
    const f = S.fab, silk = SILKS[Math.max(0, S.piece) % SILKS.length];
    ctx.save();
    ctx.fillStyle = silk; ctx.strokeStyle = 'rgba(60,40,30,.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(f.x0 - 30, f.y0 - 6); ctx.lineTo(f.x1 + 30, f.y0 - 6); ctx.lineTo(f.x1 + 46, f.y1 + 8); ctx.lineTo(f.x0 - 46, f.y1 + 8); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.beginPath(); ctx.moveTo(f.x0 + 60, f.y0 - 6); ctx.lineTo(f.x0 + 150, f.y0 - 6); ctx.lineTo(f.x0 + 70, f.y1 + 8); ctx.lineTo(f.x0 - 20, f.y1 + 8); ctx.closePath(); ctx.fill();
    const P = S.path;
    if (P && !S.done) {
      ctx.lineCap = ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 3; ctx.setLineDash([7, 7]);
      ctx.beginPath(); P.slice(S.at).forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(50,30,30,.85)'; ctx.lineWidth = 3;
      ctx.beginPath(); P.slice(0, S.at + 1).forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
      ctx.fillStyle = 'rgba(200,60,50,.7)'; S.snips.forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 2.5, 0, 7); ctx.fill(); });
      if (!S.started) emoji('✂️', P[0][0], P[0][1] - 14, 26 + Math.sin(S.t * 6) * 3);
      else { const q = P[Math.min(P.length - 1, S.at + 8)]; ctx.fillStyle = 'rgba(255,240,170,.9)'; ctx.beginPath(); ctx.arc(q[0], q[1], 5, 0, 7); ctx.fill(); }
    }
    ctx.restore();
  },
  // the finished piece lifts off the silk
  front(g) {
    const c = S.cuts.at(-1);
    if (!c || S.lift <= 0) return;
    const up = 1 - S.lift / 1.4;
    ctx.save(); ctx.globalAlpha = Math.min(1, S.lift * 1.5); ctx.translate(0, -up * 120);
    ctx.fillStyle = c.silk; ctx.strokeStyle = 'rgba(50,30,30,.7)'; ctx.lineWidth = 2;
    ctx.beginPath(); c.path.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  },
  hud(g) {
    card(14, 14, 250, 62, () => {
      label(S.piece < 0 ? 'Cutting the silk' : `${PATTERNS[S.piece].name} · piece ${S.piece + 1} of ${PATTERNS.length}`, 28, 38, 16, '#3a2a1a', 'left', 800, false);
      const cut = S.at * 6, acc = S.started ? Math.round(100 * cut / (cut + S.offd || 1)) : 100;
      label(S.cuts.length ? `Neatness so far: ${acc}% · last piece ${S.cuts.at(-1).score}%` : `Neatness: ${acc}%`, 28, 62, 14, '#5c4a36', 'left', 500, false);
    });
    if (S.started && !S.done) label(clock(Math.max(0, S.left)), VW / 2, 34, 20);
    label('Follow the chalk with the arrow keys, or drag', VW / 2, VH - 12, 14, '#fff3d0');
  },
};

const ENGINES = { gather, chase, cook, serve, care, rhythm, runner, riddle, pairs, herd, buttons, trace };

// ================= the frame around it: menu, intro, results, leaving =================
function ensureUI() {
  if (ui) return;
  const stage = document.getElementById('stage'), cv = document.getElementById('game');
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };
  ui = { stage, canvas: cv, leave: el('button', 'scene-leave', '✕ Leave'), panel: el('div', 'scene-panel'), live: el('div', 'scene-live'), pad: el('div', 'scene-pad') };
  ui.leave.type = 'button'; ui.leave.setAttribute('aria-label', 'Leave the game and go back to exploring (Esc)');
  ui.leave.addEventListener('click', close);
  ui.live.setAttribute('aria-live', 'polite');
  ui.panel.hidden = ui.leave.hidden = true;
  [['l', '◀'], ['u', '▲'], ['d', '▼'], ['r', '▶'], ['act', '●']].forEach(([k, t]) => {
    const b = el('button', `scene-pad-${k}`, t); b.type = 'button'; b.setAttribute('aria-label', { l: 'Left', u: 'Up', d: 'Down', r: 'Right', act: 'Action' }[k]);
    b.addEventListener('pointerdown', e => { e.preventDefault(); b.setPointerCapture?.(e.pointerId); press(k); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => b.addEventListener(ev, () => release(k)));
    ui.pad.append(b);
  });
  stage.append(ui.leave, ui.panel, ui.live, ui.pad);
  const at = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * VW, (e.clientY - r.top) / r.height * VH]; };
  cv.addEventListener('pointerdown', e => { if (S) { e.preventDefault(); tap(...at(e)); } });
  cv.addEventListener('pointermove', e => { if (S && e.buttons && S.phase === 'play' && !S.lock && S.player.tx != null) goTo(S.player, ...at(e)); });
}
function showPanel(html, focusSel, chat = false) {
  ui.panel.innerHTML = html; ui.panel.hidden = false;
  ui.panel.classList.toggle('scene-chat', chat);   // a conversation sits low, so the shopkeeper stays in view
  ui.panel.querySelector(focusSel || 'button')?.focus({ preventScroll: true });
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function showMenu() {
  S.phase = 'menu';
  showPanel(`<h2>${esc(hub.title)}</h2><p class="scene-sub">Choose a game. Everyone joins in!</p><div class="scene-games">${hub.games.map((g, i) =>
    `<button type="button" class="scene-game" data-i="${i}"><span class="scene-icon" aria-hidden="true">${g.icon}</span><b>${esc(g.name)}</b><span>${esc(g.blurb)}</span></button>`).join('')}</div>
    <button type="button" class="scene-back">Back to exploring</button>`);
  ui.panel.querySelectorAll('.scene-game').forEach(b => b.addEventListener('click', () => choose(hub.games[+b.dataset.i])));
  ui.panel.querySelector('.scene-back').addEventListener('click', close);
}
// walking into a shop: say hello first, then the owner greets you and offers their game
// where everyone stands for the hello: the party comes in from the left and gathers at the front,
// Ember in front, the owner at their counter on the right (a shop's `hostAt` fits its own picture).
// A shop is a close room, so people are drawn a little smaller.
const GREET = { zoom: .82, host: [770, 428], party: [[470, 486], [350, 500], [230, 450], [115, 440]] };
function showGreet() {
  S.phase = 'greet'; S.greetT = 0;
  S.zoom = GREET.zoom; S.bx0 = -200;
  [S.player, ...S.mates].forEach((a, i) => {
    const [x, y] = GREET.party[i] || [520, 430];
    standsAt(a, -70 - i * 90, y); a.facing = 1; goTo(a, x, y);   // they walk in, one behind the other
  });
  standsAt(S.host, ...(hub.hostAt || GREET.host)); S.host.facing = -1;
  showPanel(`<p>${esc(S.host.name)} is behind the counter.</p>
    <div class="scene-actions"><button type="button" class="scene-again scene-hello">👋 Say hello</button><button type="button" class="scene-back">Leave the shop</button></div>`, null, true);
  ui.panel.querySelector('.scene-hello').addEventListener('click', sayHello);
  ui.panel.querySelector('.scene-back').addEventListener('click', close);
}
function sayHello() {
  if (!S || S.phase !== 'greet' || S.greetT) return;
  ui.panel.hidden = true; ui.stage.focus({ preventScroll: true });
  talk(S.player, `Hello, ${S.host.name}!`, 1.8);
  S.player.hop = .4; S.mates.forEach(m => { m.facing = 1; });
  S.greetT = 1.4;   // a moment before the owner answers
}
function showOffer() {
  S.phase = 'offer';
  talk(S.host, hub.greet, 6); S.host.hop = .4; pling();
  const one = hub.games.length === 1;
  showPanel(`<p><b>${esc(S.host.name)}:</b> “${esc(hub.offer)}”</p>
    <div class="scene-actions">${hub.games.map((g, i) => `<button type="button" class="scene-again scene-yes" data-i="${i}">${g.icon} ${one ? 'Yes, let’s play!' : esc(g.name)}</button>`).join('')}<button type="button" class="scene-back">No, thank you</button></div>`, null, true);
  ui.panel.querySelectorAll('.scene-yes').forEach(b => b.addEventListener('click', () => choose(hub.games[+b.dataset.i])));
  ui.panel.querySelector('.scene-back').addEventListener('click', close);
}
function results({ icon, title, text, stats = [] }) {
  S.phase = 'done'; chime(); cheerAll();
  const g = S.g;
  showPanel(`<div class="scene-result-icon" aria-hidden="true">${icon || '✨'}</div><h2>${esc(title)}</h2><p>${esc(text)}</p>
    ${stats.length ? `<ul class="scene-stats">${stats.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}
    <div class="scene-actions"><button type="button" class="scene-again">Play again</button>${hub.games.length > 1 ? '<button type="button" class="scene-other">Other games</button>' : ''}<button type="button" class="scene-back">Back to exploring</button></div>`);
  ui.panel.querySelector('.scene-again').addEventListener('click', () => choose(g));
  ui.panel.querySelector('.scene-other')?.addEventListener('click', () => { begin(null); showMenu(); });
  ui.panel.querySelector('.scene-back').addEventListener('click', close);
  opts.duck?.(false);
}
function begin(g) {
  S = { t: 0, phase: g ? 'intro' : 'menu', introT: 3, g, fx: [], bx0: 40, bx1: 920, by0: FY0, by1: FY1, lock: false };
  setupCast(g);
}
function choose(g) {
  if (g.out) { const go = opts[g.out]; close(); go?.(); return; }   // e.g. the picnic out in the realm itself
  ui.panel.hidden = true; ui.panel.classList.remove('scene-chat');
  begin(g);
  ENGINES[g.kind].setup(g);
  talk(voice(), g.hello, 3.4);
  opts.duck?.(g.kind === 'rhythm');
  ui.stage.focus({ preventScroll: true });
}
function start(key, o = {}) {
  if (!HUBS[key]) return false;
  opts = o; hubKey = key; hub = HUBS[key];
  ensureUI();
  inp.l = inp.r = inp.u = inp.d = 0;
  ui.stage.classList.add('scene-on'); ui.stage.tabIndex = -1; ui.leave.hidden = false;
  begin(null);
  const direct = o.game && hub.games.find(g => g.id === o.game);   // a test link (?game=bake) skips the hello and the menu
  if (direct) choose(direct); else if (hub.greet && S.host) showGreet(); else if (hub.games.length === 1) choose(hub.games[0]); else showMenu();
  return true;
}
function close() {
  if (!S) return;
  S = null;
  ui.panel.hidden = ui.leave.hidden = true; ui.stage.classList.remove('scene-on');
  opts.duck?.(false); opts.onClose?.();
}

// ---- input ----
const KEYMAP = { ArrowLeft: 'l', a: 'l', A: 'l', ArrowRight: 'r', d: 'r', D: 'r', ArrowUp: 'u', w: 'u', W: 'u', ArrowDown: 'd', s: 'd', S: 'd', ' ': 'act', Enter: 'act', 1: 'l', 2: 'u', 3: 'd', 4: 'r' };
function press(k) {
  if (!S) return;
  if (k !== 'act') inp[k] = 1;
  if (S.phase !== 'play' && S.phase !== 'intro') return;
  const eng = S.g && ENGINES[S.g.kind];
  if (eng?.press?.(S.g, k)) { inp[k] = 0; return; }
}
function release(k) { if (k !== 'act') inp[k] = 0; }
function tap(x, y) {
  if (!S || S.phase !== 'play') return;
  const eng = ENGINES[S.g.kind];
  if (eng.tap?.(S.g, x, y)) return;
  if (!S.lock) goTo(S.player, x, Math.max(y, FY0));
}
addEventListener('keydown', e => {
  if (!S) return;
  if (e.key === 'Escape') { e.preventDefault(); close(); return; }
  if (S.phase === 'menu' || S.phase === 'done' || S.phase === 'greet' || S.phase === 'offer') return;   // the panel's buttons have the keys
  const k = KEYMAP[e.key];
  if (!k) return;
  e.preventDefault();
  if (!e.repeat) press(k);
});
addEventListener('keyup', e => { const k = KEYMAP[e.key]; if (k) release(k); });
addEventListener('blur', () => { inp.l = inp.r = inp.u = inp.d = 0; });

// ---- the loop: game.js calls these while a game is running ----
function stepActor(a, dt) {
  a.hop = Math.max(0, a.hop - dt); a.spin = Math.max(0, a.spin - dt); a.dip = Math.max(0, a.dip - dt); a.slideT = Math.max(0, a.slideT - dt);
  if (a.bubble && (a.bubble.t -= dt) <= 0) a.bubble = null;
  if (a.stun > 0) { a.stun -= dt; a.moving = false; return; }
  let dx = 0, dy = 0;
  if (a.isPlayer && S.phase === 'play' && !S.lock) {
    dx = inp.r - inp.l; dy = inp.d - inp.u;
    if (dx || dy) { a.tx = null; const m = Math.hypot(dx, dy); dx /= m; dy /= m * 1.35; }
  }
  if (!dx && !dy && a.tx != null && (S.phase === 'play' || S.phase === 'greet' || !a.isPlayer)) {
    const ex = a.tx - a.x, ey = a.ty - a.y, d = Math.hypot(ex, ey);
    if (d < 4) { a.tx = a.ty = null; } else { dx = ex / d; dy = ey / d; }
  }
  const step = a.speed * dt, ox = a.x, oy = a.y;
  if (dx || dy) {
    a.x = clamp(a.x + dx * step, a.state ? -80 : S.bx0, a.state ? 1040 : S.bx1);
    a.y = clamp(a.y + dy * step, S.by0, S.by1);
    if (a.tx != null && Math.hypot(a.tx - a.x, a.ty - a.y) < step) { a.x = a.tx; a.y = a.ty; }
    if (Math.abs(dx) > .2) a.facing = Math.sign(dx);
  }
  const moved = Math.hypot(a.x - ox, a.y - oy);
  a.vy = a.y - oy;
  a.moving = moved > .05;
  a.dist += moved / scaleAt(a.y);
}
function update(dt) {
  if (!S) return;
  S.t += dt;
  if (S.phase === 'intro' && (S.introT -= dt) <= 0) { S.phase = 'play'; S.goT = .9; }
  if (S.phase === 'greet' && S.greetT && (S.greetT -= dt) <= 0) showOffer();
  S.goT = Math.max(0, (S.goT || 0) - dt);
  const eng = S.g && ENGINES[S.g.kind];
  eng?.update(S.g, dt);
  if (!S) return;
  for (const a of S.actors) if (!a.off) stepActor(a, dt);
  for (const f of S.fx) { f.age += dt; f.x += f.vx * dt; f.y += f.vy * dt; if (f.g) f.vy += f.g * dt; }
  S.fx = S.fx.filter(f => f.age < f.life);
  if (S.bowlWob) S.bowlWob = Math.max(0, S.bowlWob - dt);
}

// ---- drawing ----
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function emoji(ch, x, y, size, flip = false, alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); if (flip) ctx.scale(-1, 1);
  ctx.fillStyle = '#000';   // colour emoji take the fill's alpha, so never draw them in a shadow's translucent colour
  ctx.font = `${Math.round(size)}px ${EMOJI}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ch, 0, 0); ctx.restore();
}
function label(text, x, y, size = 14, colour = '#fffaf0', align = 'center', weight = 700, outline = true) {
  ctx.font = `${weight} ${size}px ${UI}`; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  if (outline) { ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(30,22,12,.78)'; ctx.lineWidth = 3.5; ctx.strokeText(text, x, y); }
  ctx.fillStyle = colour; ctx.fillText(text, x, y);
}
const textW = t => (ctx.measureText(t) || { width: t.length * 7 }).width;
function card(x, y, w, h, inner) {
  ctx.save(); ctx.fillStyle = 'rgba(255,250,240,.93)'; ctx.strokeStyle = 'rgba(58,42,26,.3)'; ctx.lineWidth = 1.5;
  rr(x, y, w, h, 10); ctx.fill(); ctx.stroke(); inner(); ctx.restore();
}
const clock = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function drawBackdrop() {
  const own = (S.g && pic(`scenes/${S.g.id}.jpg`)) || pic(`scenes/${hubKey}.jpg`);
  if (own) { const k = Math.max(VW / own.width, VH / own.height); ctx.drawImage(own, (VW - own.width * k) / 2, (VH - own.height * k) / 2, own.width * k, own.height * k); return; }
  const bg = opts.backdrop?.img;
  if (bg) {   // until the game has its own picture: the place you came from, a little closer
    const H = VH * 1.18, W = bg.width * H / bg.height, at = opts.backdrop.at ?? .5;
    if (S.g?.kind === 'runner') { const x = -((S.scroll * .25) % W); for (let i = 0; i < 3; i++) ctx.drawImage(bg, x + i * W, VH - H, W, H); }
    else ctx.drawImage(bg, clamp(VW / 2 - at * W, VW - W, 0), VH - H, W, H);
  } else { const gr = ctx.createLinearGradient(0, 0, 0, VH); gr.addColorStop(0, '#d8c8a8'); gr.addColorStop(1, '#8a6e4e'); ctx.fillStyle = gr; ctx.fillRect(0, 0, VW, VH); }
  const gr = ctx.createLinearGradient(0, FY0 - 90, 0, VH);   // soften the floor so the play area reads
  gr.addColorStop(0, 'rgba(255,248,230,0)'); gr.addColorStop(1, 'rgba(40,28,16,.28)');
  ctx.fillStyle = gr; ctx.fillRect(0, FY0 - 90, VW, VH);
}
function drawFigure(a, k, part = 1) {
  const s = a.sheet;
  if (s && s.img_) {
    const sc = s.h / s.fh * k, frame = a.moving ? Math.floor(a.dist / ((s.cycle || 120) / s.frames)) % s.frames : 0, sh = s.fh * part;
    ctx.drawImage(s.img_, frame * s.fw, 0, s.fw, sh, -s.ax * sc, -(sh - 2) * sc, s.fw * sc, sh * sc);
    return s.h * k;
  }
  const im = pic(a.img), H = a.h * k;
  if (im) { const W = im.width * H / im.height; ctx.drawImage(im, 0, 0, im.width, im.height * part, -W / 2, -H * part, W, H * part); return H; }
  standIn(a, H, part);
  return H;
}
// a painted stand-in until the character's picture arrives: dress or coat, head and hair
function standIn(a, H, part) {
  ctx.save();
  if (part < 1) { ctx.translate(0, H * (1 - part)); ctx.beginPath(); ctx.rect(-H, -H * 1.1, H * 2, H * (part + .1)); ctx.clip(); }
  const c = a.colour;
  ctx.fillStyle = c;
  if (a.coat) {
    ctx.fillStyle = '#3a3030'; ctx.fillRect(-.07 * H, -.36 * H, .05 * H, .36 * H); ctx.fillRect(.02 * H, -.36 * H, .05 * H, .36 * H);
    ctx.fillStyle = c; rr(-.12 * H, -.76 * H, .24 * H, .46 * H, .04 * H); ctx.fill();
  } else {
    ctx.beginPath(); ctx.moveTo(-.2 * H, 0); ctx.quadraticCurveTo(-.12 * H, -.3 * H, -.07 * H, -.52 * H); ctx.lineTo(.07 * H, -.52 * H); ctx.quadraticCurveTo(.12 * H, -.3 * H, .2 * H, 0); ctx.closePath(); ctx.fill();
    rr(-.08 * H, -.76 * H, .16 * H, .27 * H, .04 * H); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(-.02 * H, -.74 * H, .04 * H, .2 * H);
  ctx.fillStyle = '#f0d2b4'; ctx.beginPath(); ctx.arc(0, -.85 * H, .075 * H, 0, 7); ctx.fill();
  ctx.fillStyle = a.hair; ctx.beginPath(); ctx.arc(0, -.875 * H, .08 * H, Math.PI * 1.02, Math.PI * 1.98); ctx.fill();
  if (!a.coat) ctx.fillRect(-.085 * H, -.88 * H, .03 * H, .12 * H), ctx.fillRect(.055 * H, -.88 * H, .03 * H, .12 * H);
  ctx.restore();
}
function drawActor(a) {
  const k = scaleAt(a.y) * STAND * (S.zoom || 1);
  const hopY = a.hop > 0 ? Math.sin(a.hop / .45 * Math.PI) * 28 * k : 0;
  const slide = a.slideT > 0 ? -Math.sin(a.slideT / .32 * Math.PI) * 30 * a.facing : 0;
  ctx.fillStyle = 'rgba(25,20,12,.28)'; ctx.beginPath(); ctx.ellipse(a.x + slide, a.y, 36 * k, 7 * k, 0, 0, 7); ctx.fill();
  ctx.save(); ctx.translate(a.x + slide, a.y - hopY);
  if (a.stun > 0) ctx.rotate(Math.sin(S.t * 30) * .06);
  let sx = a.facing; if (a.spin > 0) sx *= Math.cos((1 - a.spin / .6) * Math.PI * 2);
  ctx.scale(Math.abs(sx) < .05 ? .05 * Math.sign(sx || 1) : sx, a.dip > 0 ? 1 - Math.sin(a.dip / .4 * Math.PI) * .1 : 1);
  const H = drawFigure(a, k);
  ctx.restore();
  a.top = a.y - hopY - H;
  if (!a.sheet && !(a.img && pics[a.img])) label(a.name, a.x, a.y + 18, 12);   // stand-ins wear a name
  a.carry.forEach((ic, i) => emoji(ic, a.x - (a.carry.length - 1) * 14 + i * 28, a.top - 12, 26));
}
function wrapLines(text, max) {
  const words = text.split(' '), lines = []; let line = '';
  for (const w of words) { const t = line ? line + ' ' + w : w; if (textW(t) > max && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line);
  return lines;
}
function drawBubble(a) {
  const b = a.bubble;
  ctx.save();
  ctx.globalAlpha = clamp(b.t * 3, 0, 1);
  ctx.font = `600 15px ${UI}`;
  const lines = wrapLines(b.text, 230), w = Math.max(80, ...lines.map(textW)) + 22, h = lines.length * 19 + 30;
  const cx = a.x, top = Math.max(8, (a.top ?? a.y - 200) - h - 12), x = clamp(cx - w / 2, 8, VW - w - 8);
  ctx.fillStyle = 'rgba(255,250,240,.96)'; ctx.strokeStyle = 'rgba(58,42,26,.4)'; ctx.lineWidth = 1.5;
  rr(x, top, w, h, 10); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(clamp(cx, x + 14, x + w - 14) - 7, top + h - 1); ctx.lineTo(clamp(cx, x + 14, x + w - 14), top + h + 10); ctx.lineTo(clamp(cx, x + 14, x + w - 14) + 7, top + h - 1); ctx.fill();
  ctx.font = `700 12px ${UI}`; ctx.fillStyle = '#9a6a2a'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillText(a.name.toUpperCase(), x + 11, top + 16);
  ctx.font = `600 15px ${UI}`; ctx.fillStyle = '#2f2418';
  lines.forEach((l, i) => ctx.fillText(l, x + 11, top + 34 + i * 19));
  ctx.restore();
}
// the race scoreboard: a face (or name) and a score for everyone playing
function drawBoard(players, team, icon) {
  const rows = players.length, w = 236, h = 16 + rows * 34 + (team ? 24 : 0);
  card(14, 14, w, h, () => {
    const lead = Math.max(...players.map(p => p.score));
    players.forEach((p, i) => {
      const y = 28 + i * 34;
      const f = p.face;
      if (f && f.sheet?.img_) {
        ctx.save(); ctx.beginPath(); ctx.arc(40, y + 12, 14, 0, 7); ctx.clip();
        ctx.drawImage(f.sheet.img_, f.box[0] - f.box[2] / 2, f.box[1] - f.box[2] / 2, f.box[2], f.box[2], 26, y - 2, 28, 28); ctx.restore();
      } else { ctx.fillStyle = p.colour; ctx.beginPath(); ctx.arc(40, y + 12, 13, 0, 7); ctx.fill(); }
      label(`${p.name}${p === S.player ? ' (you)' : ''}`, 62, y + 17, 14, '#3a2a1a', 'left', p === S.player ? 800 : 600, false);
      label(`${p.score}${p.score === lead && lead > 0 && !team ? ' 👑' : ''}`, w, y + 18, 17, '#3a2a1a', 'right', 800, false);
    });
    if (team) label(team, 28, h + 4, 15, '#7a4e12', 'left', 800, false);
  });
  if (S.left != null) { if (icon) emoji(icon, VW / 2 - 44, 27, 22); label(clock(Math.max(0, S.left)), VW / 2 + 8, 34, 20); }
}
function render(c) {
  if (!S) return;
  ctx = c;
  ctx.save();
  drawBackdrop();
  const g = S.g, eng = g && ENGINES[g.kind];
  if (g?.night) { ctx.fillStyle = 'rgba(16,20,52,.55)'; ctx.fillRect(0, 0, VW, VH); }
  eng?.back?.(g);
  const list = [];
  const add = (y, fn) => list.push([y, fn]);
  eng?.draw?.(g, add);
  for (const a of S.actors) if (!a.off) add(a.y, () => drawActor(a));
  list.sort((p, q) => p[0] - q[0]).forEach(([, fn]) => fn());
  eng?.front?.(g);
  for (const a of S.actors) if (a.bubble && (!a.off || g?.kind === 'runner')) { if (a.off) a.top = (g.mode === 'boat' ? S.ry - 200 : S.ry - 230); drawBubble(a); }
  for (const f of S.fx) {
    const al = 1 - f.age / f.life;
    if (f.text) { ctx.save(); ctx.globalAlpha = al; label(f.text, f.x, f.y, f.size, f.colour); ctx.restore(); }
    else { ctx.fillStyle = f.colour; ctx.globalAlpha = al; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
  }
  if (g && S.phase !== 'menu') eng.hud?.(g);
  if (S.phase === 'intro') {
    ctx.fillStyle = 'rgba(20,14,8,.35)'; ctx.fillRect(0, 0, VW, VH);
    ctx.font = `48px ${TITLE}`; ctx.textAlign = 'center'; ctx.fillStyle = '#fffaf0'; ctx.strokeStyle = 'rgba(30,20,10,.7)'; ctx.lineWidth = 5;
    ctx.strokeText(g.name, VW / 2, 200); ctx.fillText(g.name, VW / 2, 200);
    label(HINTS[g.kind](g), VW / 2, 246, 18, '#fff3d0');
    if (S.introT < 1.6) label(String(Math.ceil(S.introT / .53)), VW / 2, 320, 54, '#ffe08a');
  }
  if (S.goT > 0) { ctx.save(); ctx.globalAlpha = S.goT / .9; label('Go!', VW / 2, 300, 64, '#ffe08a'); ctx.restore(); }
  ctx.restore();
}
const HINTS = {
  gather: g => g.tools ? 'Walk to a tool at the back, then to the plant that needs it' : g.mode === 'fall' ? 'Arrow keys or tap: stand under the shadows' : 'Arrow keys or tap to run. Touch them to grab them!',
  chase: () => 'Arrow keys or tap to run. Touch the fox, or search the rustling piles',
  cook: () => 'Walk to a bin to pick up, to the bowl to tip in · Space or tap to stir and bake',
  serve: () => 'Fetch from the shelves (two at a time), then walk to the customer',
  care: () => 'Take what they need from the back, then walk to the animal',
  rhythm: g => g.laneNames ? 'Hit ← ↑ ↓ → (or tap) as the cues reach the circles' : 'Hit ← ↑ ↓ → (or tap) as the notes reach the circles',
  riddle: () => 'Listen to the clues, then walk to the book and press Space (or tap it)',
  pairs: () => 'Stand by a box and press Space (or tap it) to peek. Two at a time!',
  herd: () => 'Get behind a toy and push it into the chest',
  buttons: () => 'Find the exact twin, stand on it and press Space (or tap it)',
  trace: () => 'Follow the chalk line all the way round: arrow keys, or drag',
  runner: g => g.mode === 'boat' ? '↑ ↓ or tap above/below the boat to steer' : 'Space, ↑ or tap to jump',
};

window.EmberScenes = { start, close, update, render, active: () => !!S, has: key => !!HUBS[key], HUBS,
  // which door a game id (or a door's own key) belongs to, for test links
  hubOf: id => Object.keys(HUBS).find(k => k === id || HUBS[k].games.some(g => g.id === id)),
  _test: { state: () => S, choose, sayHello, press, release, tap, inp } };
})();
