(() => {
'use strict';
// ---- stage constants (logical 960x540) ----
const VW = 960, VH = 540;
// The room is a box drawn over the painting: floor, right wall, ceiling, left wall.
const FY = 522, CY = 20, LX = 16;            // RX is set once the painting's width is known
let RX = 1600, worldW = 1620;
const H = 252;                               // drawn height of everyone (a grown teen against the room)
const WALK = 190, JUMP = 600, G = 900, ZERO_PUSH = 360, OBJ_G = 700;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Walk sheets: Arduan and Lucio loop one clean step (4 frames); Day, Lilith and Brayden cover a full cycle.
// `cycle` = px walked per loop of the sheet, matched to the stride at height H.
const BOYS = {
  arduan: { name: 'Arduan', img: 'arduan-walk.png', frames: 4, fw: 226, fh: 420, ax: 97, cycle: 128 },
  lucio:  { name: 'Lucio',  img: 'lucio-walk.png',  frames: 4, fw: 236, fh: 420, ax: 97, cycle: 120 },
  lilith: { name: 'Lilith', img: 'lilith-walk.png', frames: 8, fw: 259, fh: 420, ax: 120, cycle: 274 },   // full 8-frame cycle
  brayden: { name: 'Brayden', img: 'brayden-walk.png', frames: 8, fw: 279, fh: 420, ax: 135, cycle: 291 },   // Lilith's twin
  day:    { name: 'Day',    img: 'day-walk.png',    frames: 4, fw: 230, fh: 420, ax: 104, cycle: 236 },   // Arduan and Lucio's brother; 4 frames span both steps
  cat:    { name: 'Cat', img: 'cat-walk.png', frames: 8, fw: 250, fh: 160, ax: 128, cycle: 130, h: 100 },
};
const CAST = ['arduan', 'lucio', 'day', 'lilith', 'brayden', 'cat'];
// Surfaces, in the order you meet them walking "forward" round the room.
const SURF = {
  floor: { down: [0, 1], ang: 0, t: [1, 0] },
  right: { down: [1, 0], ang: -Math.PI / 2, t: [0, -1] },
  ceil:  { down: [0, -1], ang: Math.PI, t: [-1, 0] },
  left:  { down: [-1, 0], ang: Math.PI / 2, t: [0, 1] },
};
const ORDER = ['floor', 'right', 'ceil', 'left'];
const DIRS = { down: [0, 1], right: [1, 0], up: [0, -1], left: [-1, 0] };
const surfFor = d => d[1] > 0 ? 'floor' : d[1] < 0 ? 'ceil' : d[0] > 0 ? 'right' : 'left';
const ARROW = { floor: '↓', ceil: '↑', left: '←', right: '→' };

const QUIPS = {
  flip: ['Not again!', 'Whoooa!', 'Best. Room. Ever.', 'My socks!', 'Who did that?!', 'I was eating!'],
  zero: ['I’m flyiiing!', 'Weeee!', 'Grab the pillow!', 'Swimming in the air!'],
  zeroOff: ['Uh oh.', 'Incoming!', 'Here comes the floor!'],
  ceil: ['I live up here now.', 'Hey, the lamps are upside down.', 'Look, no hands!', 'My hair’s doing a thing.'],
  wall: ['Wall walking!', 'This is totally normal.', 'Sideways is my new favourite way.'],
  star: ['Got one!', 'Shiny!', 'Mine!'],
};

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const $ = id => document.getElementById(id);
let K = 1;
function resize() {
  const r = canvas.getBoundingClientRect();
  if (!r.width) return;
  K = Math.min(2.5, (r.width / VW) * (window.devicePixelRatio || 1));
  canvas.width = Math.round(VW * K); canvas.height = Math.round(VH * K);
}
new ResizeObserver(resize).observe(canvas);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = a => a[Math.floor(Math.random() * a.length)];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
function angTo(a, b, k) { let d = ((b - a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; return a + d * k; }

// ---- state ----
let room, t = 0, camX = 0, shake = 0, tilt = 0;
// Places and the doors between them. Each door: x (fraction of the picture) and the place it leads to.
// Arriving, everyone appears at the door in the new place that leads back where they came from.
const ROOMS = {
  arduan: { name: 'Arduan’s Room', img: 'room.jpg', doors: [{ x: .035, to: 'living' }] },
  lucio:  { name: 'Lucio’s Room', img: 'room-lucio.jpg', doors: [{ x: .035, to: 'living' }] },
  day:    { name: 'Day’s Room', img: 'room-day.jpg', doors: [{ x: .035, to: 'living' }] },
  living: { name: 'The Living Room', img: 'room-living.jpg',
            doors: [{ x: .04, to: 'arduan' }, { x: .3, to: 'lucio' }, { x: .55, to: 'street', label: 'Out the front door' }, { x: .94, to: 'day' }] },
  street: { name: 'The Villa Street', img: 'street.jpg',
            doors: [{ x: .44, to: 'living', label: 'Home' }, { x: .95, to: 'school', label: 'Up the road to the Academy' }] },
  school: { name: 'The Academy Hall', img: 'academy-hall.jpg',
            doors: [{ x: .13, to: 'street', label: 'Out to the street' }, { x: .52, to: 'atrium', label: 'Through to the atrium' }] },
  atrium: { name: 'The Academy Atrium', img: 'academy-atrium.jpg', doors: [{ x: .9, to: 'school', label: 'Back to the main hall' }] },
};
let roomK = 'arduan', doorNear = null, pendingTo = null, fade = 0, fadeDir = 0;
const doorLabel = d => d.label || 'Through the door to ' + ROOMS[d.to].name;
let viewRot = 0;                             // the whole room turns over when the followed boy is upside down
let RG = [0, 1], zeroG = false;               // room gravity for loose objects
const boys = {};
let objects = [], stars = [], got = 0, sparkles = [];
const keyState = { arrows: { up: 0, down: 0, left: 0, right: 0 }, wasd: { up: 0, down: 0, left: 0, right: 0 } };
let ctrl = { arrows: 'arduan', wasd: 'lucio' };
const cup = new GravityCup();
let cupPlayer = 'arduan', resultShown = false;

// ---- sound ----
let ac = null, muted = false;
function audio() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } } if (ac && ac.state === 'suspended') ac.resume(); }
function tone(freqs, dur, type = 'sine', vol = .05, gap = .06) {
  if (!ac || muted) return; const t0 = ac.currentTime;
  freqs.forEach((f, i) => { const o = ac.createOscillator(), g = ac.createGain(), s = t0 + i * gap; o.type = type; o.frequency.value = f; g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(vol, s + .01); g.gain.exponentialRampToValueAtTime(.0001, s + dur); o.connect(g).connect(ac.destination); o.start(s); o.stop(s + dur + .05); });
}
function whoosh(up) { if (!ac || muted) return; const o = ac.createOscillator(), g = ac.createGain(), s = ac.currentTime; o.type = 'triangle'; o.frequency.setValueAtTime(up ? 200 : 700, s); o.frequency.exponentialRampToValueAtTime(up ? 900 : 120, s + .5); g.gain.setValueAtTime(.06, s); g.gain.exponentialRampToValueAtTime(.0001, s + .55); o.connect(g).connect(ac.destination); o.start(s); o.stop(s + .6); }
$('mute').addEventListener('click', () => { muted = !muted; $('mute').textContent = muted ? 'Sound off' : 'Sound on'; $('mute').setAttribute('aria-pressed', muted); });

// ---- banner + speech ----
let bannerT = 0;
function banner(text) { const b = $('banner'); b.textContent = text; b.classList.add('on'); clearTimeout(bannerT); bannerT = setTimeout(() => b.classList.remove('on'), 1600); }
function say(b, list, chance = 1) { if (Math.random() < chance) { b.say = pick(list); b.sayT = 2; } }

// ---- boys ----
function makeBoy(k, x) { return { k, mode: 'surf', surf: 'floor', p: [x, FY], v: [0, 0], g: 'floor', ang: 0, spin: 0, facing: 1, phase: 0, carry: 0, moving: false, idle: 99, ai: 0, aiDir: 0, say: '', sayT: 0, seen: {} }; }
function heldVec(src) { const s = keyState[src]; return [(s.right ? 1 : 0) - (s.left ? 1 : 0), (s.down ? 1 : 0) - (s.up ? 1 : 0)]; }
function corner(b, dir) {
  const i = ORDER.indexOf(b.surf), next = ORDER[(i + (dir > 0 ? 1 : 3)) % 4];
  const cx = (b.surf === 'right' || next === 'right') ? RX : (b.surf === 'left' || next === 'left') ? LX : b.p[0];
  const cy = (b.surf === 'floor' || next === 'floor') ? FY : (b.surf === 'ceil' || next === 'ceil') ? CY : b.p[1];
  const t2 = SURF[next].t;
  b.surf = next; b.p = [cx + t2[0] * dir * 10, cy + t2[1] * dir * 10];
  if (!b.seen[next] && next !== 'floor') { b.seen[next] = 1; say(b, next === 'ceil' ? QUIPS.ceil : QUIPS.wall); }
}
function jump(b, kick) {
  if (b.k === cupPlayer && cup.running) { cup.lastSurface = b.surf; cup.skill('jump'); }
  const s = SURF[b.surf];
  b.mode = 'air'; b.g = b.surf;
  b.v = [-s.down[0] * JUMP + s.t[0] * kick, -s.down[1] * JUMP + s.t[1] * kick];
  tone([440, 660], .15, 'sine', .03, .04);
}
function land(b, surf) {
  if (b.k === cupPlayer) cup.landed(surf);
  b.mode = 'surf'; b.surf = surf; b.v = [0, 0]; b.carry = 0;
  if (surf === 'floor') b.p[1] = FY; if (surf === 'ceil') b.p[1] = CY; if (surf === 'left') b.p[0] = LX; if (surf === 'right') b.p[0] = RX;
  b.p[0] = clamp(b.p[0], LX + 1, RX - 1); b.p[1] = clamp(b.p[1], CY + 1, FY - 1);
  if (surf === 'floor') b.p[1] = FY; if (surf === 'ceil') b.p[1] = CY; if (surf === 'left') b.p[0] = LX; if (surf === 'right') b.p[0] = RX;
  tone([180], .12, 'sine', .06);
  if (!b.seen[surf] && surf !== 'floor') { b.seen[surf] = 1; say(b, surf === 'ceil' ? QUIPS.ceil : QUIPS.wall); }
}
const characterHeight = b => BOYS[b.k].h || H;
function bodyCenter(b) { const h = characterHeight(b); return [b.p[0] + Math.sin(b.ang) * h * .5, b.p[1] - Math.cos(b.ang) * h * .5]; }

function updateBoy(b, k, pressed, dt) {
  const c = BOYS[b.k];
  b.sayT = Math.max(0, b.sayT - dt);
  const any = k[0] || k[1];
  if (b.mode === 'surf') {
    const s = SURF[b.surf];
    if (zeroG) { b.mode = 'air'; b.v = [-s.down[0] * 70 + (Math.random() - .5) * 40, -s.down[1] * 70 + (Math.random() - .5) * 40]; b.spin = (Math.random() - .5) * 1.6; return; }
    const along = dot(k, s.t), away = -dot(k, s.down);
    if (away > 0 && pressed) { jump(b, along * WALK); b.moving = false; return; }
    let dir = along ? Math.sign(along) : (any && b.carry ? b.carry : 0);
    if (!any) b.carry = 0;
    b.moving = !!dir;
    if (dir) {
      b.carry = dir; b.facing = dir;
      const step = WALK * dt;
      b.p[0] += s.t[0] * dir * step; b.p[1] += s.t[1] * dir * step; b.phase += step;
      if (b.p[0] > RX || b.p[0] < LX || b.p[1] > FY || b.p[1] < CY) corner(b, dir);
    }
    b.ang = angTo(b.ang, SURF[b.surf].ang, Math.min(1, dt * 14));
    return;
  }
  // in the air
  b.moving = false;
  if (zeroG) {
    if (any) { b.v[0] += k[0] * ZERO_PUSH * dt; b.v[1] += k[1] * ZERO_PUSH * dt; }
    b.v[0] *= .995; b.v[1] *= .995;
    b.ang += b.spin * dt;
  } else {
    if (pressed && any) {                            // pick which way to fall
      const d = Math.abs(k[0]) >= Math.abs(k[1]) ? [Math.sign(k[0]), 0] : [0, Math.sign(k[1])];
      b.g = surfFor(d); whoosh(d[1] < 0);
      if (b.k === cupPlayer) cup.skill('redirect');
    }
    const gd = SURF[b.g].down;
    b.v[0] += gd[0] * G * dt; b.v[1] += gd[1] * G * dt;
    b.ang = angTo(b.ang, SURF[b.g].ang, Math.min(1, dt * 6));
  }
  const sp = Math.hypot(b.v[0], b.v[1]); if (sp > 900) { b.v[0] *= 900 / sp; b.v[1] *= 900 / sp; }
  b.p[0] += b.v[0] * dt; b.p[1] += b.v[1] * dt;
  // touch a surface
  const m = zeroG ? 60 : 0;
  const hits = [];
  if (b.p[1] >= FY - m && b.v[1] > 0) hits.push('floor');
  if (b.p[1] <= CY + m && b.v[1] < 0) hits.push('ceil');
  if (b.p[0] >= RX - m && b.v[0] > 0) hits.push('right');
  if (b.p[0] <= LX + m && b.v[0] < 0) hits.push('left');
  if (!hits.length) return;
  if (zeroG) {
    hits.forEach(h => { if (h === 'floor' || h === 'ceil') b.v[1] *= -.7; else b.v[0] *= -.7; });
    b.p[0] = clamp(b.p[0], LX + m, RX - m); b.p[1] = clamp(b.p[1], CY + m, FY - m);
    b.spin = clamp(b.spin + (Math.random() - .5) * 1.5, -3, 3);
  } else {
    const h = hits.includes(b.g) ? b.g : hits[0];
    land(b, h);
  }
}

// autopilot for whoever is left alone
function autopilot(b, dt) {
  b.ai -= dt;
  const k = [0, 0]; let pressed = false;
  if (b.mode === 'surf') {
    if (b.ai <= 0) { b.aiDir = pick([-1, 1, 1, 0]); b.ai = 1 + Math.random() * 2.5; if (Math.random() < .3) b.aiJump = true; }
    const s = SURF[b.surf];
    if (b.aiJump) { b.aiJump = false; k[0] = -s.down[0]; k[1] = -s.down[1]; pressed = true; }
    else if (b.aiDir) { k[0] = s.t[0] * b.aiDir; k[1] = s.t[1] * b.aiDir; }
  } else if (!zeroG && b.ai > -5 && !b.picked) {
    b.picked = true; const d = pick(Object.values(DIRS)); k[0] = d[0]; k[1] = d[1]; pressed = true;
  }
  if (b.mode === 'surf') b.picked = false;
  return [k, pressed];
}

// ---- input ----
const MAP = { ArrowUp: ['arrows', 'up'], ArrowDown: ['arrows', 'down'], ArrowLeft: ['arrows', 'left'], ArrowRight: ['arrows', 'right'],
  w: ['wasd', 'up'], s: ['wasd', 'down'], a: ['wasd', 'left'], d: ['wasd', 'right'], W: ['wasd', 'up'], S: ['wasd', 'down'], A: ['wasd', 'left'], D: ['wasd', 'right'] };
const fresh = { arrows: false, wasd: false };
addEventListener('keydown', e => {
  if (e.key === 'Escape' && cup.active) { e.preventDefault(); pauseMatch(); return; }
  const m = MAP[e.key];
  if (m) { e.preventDefault(); audio(); if (!keyState[m[0]][m[1]]) fresh[m[0]] = true; keyState[m[0]][m[1]] = 1; return; }
  if (e.key === 'f' || e.key === 'F') { if (!e.repeat) flip(); }
  else if (e.key === 'z' || e.key === 'Z') { if (!e.repeat) toggleZero(); }
  else if (e.key === 'Tab' && !e.target.closest?.('button,input,select')) { e.preventDefault(); swap(); }
  else if (e.key === 'e' || e.key === 'E' || e.key === 'Enter') { if (!e.target.closest?.('button')) { e.preventDefault(); goThrough(); } }
});
addEventListener('keyup', e => { const m = MAP[e.key]; if (m) keyState[m[0]][m[1]] = 0; });
addEventListener('blur', () => { clearKeys(); if (cup.active && !cup.finished) { cup.paused = true; syncMatch(); } });
document.querySelectorAll('.tbtn').forEach(el => {
  const k = el.dataset.k;
  el.addEventListener('pointerdown', e => { e.preventDefault(); audio(); el.setPointerCapture?.(e.pointerId); el.classList.add('held'); if (!keyState.arrows[k]) fresh.arrows = true; keyState.arrows[k] = 1; });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => el.addEventListener(ev, () => { el.classList.remove('held'); keyState.arrows[k] = 0; }));
});
$('flipBtn').addEventListener('click', () => { audio(); flip(); });
$('zeroBtn').addEventListener('click', () => { audio(); toggleZero(); });
$('swapBtn').addEventListener('click', () => { audio(); swap(); });
$('catBtn').addEventListener('click', () => { audio(); selectCharacter('cat'); });
$('doorBtn').addEventListener('click', () => { audio(); goThrough(); });
function swap() {
  if (!room || cup.active) return;
  const i = (CAST.indexOf(ctrl.arrows) + 1) % CAST.length;
  selectCharacter(CAST[i]);
}
function selectCharacter(character) {
  if (!room || cup.active) return;
  const i = CAST.indexOf(character);
  ctrl = { arrows: CAST[i], wasd: CAST[(i + 1) % CAST.length] };
  clearKeys();
  boys[ctrl.arrows].idle = 0; boys[ctrl.wasd].idle = 0;
  $('swapLabel').textContent = `Arrows: ${BOYS[ctrl.arrows].name}`; banner(`Arrows: ${BOYS[ctrl.arrows].name} · WASD: ${BOYS[ctrl.wasd].name}`);
}

function setRoom(k) {
  roomK = k; const R = ROOMS[k]; room = R.img_;
  worldW = room.width * VH / room.height; RX = worldW - 16;
}
function goThrough() {
  if (cup.active) return;
  if (!doorNear || fadeDir) return;
  pendingTo = doorNear.to; fadeDir = 1; tone([330, 440, 660], .3, 'sine', .04, .07);
}
function arrive() {
  const from = roomK; setRoom(pendingTo);
  const back = ROOMS[roomK].doors.find(d => d.to === from) || ROOMS[roomK].doors[0];
  const dx = back.x * worldW, dir = back.x > .5 ? -1 : 1;
  CAST.forEach((k, i) => {
    const b = boys[k]; Object.assign(b, { mode: 'surf', surf: 'floor', p: [clamp(dx + dir * (140 + i * 170), LX + 40, RX - 40), FY], v: [0, 0], g: 'floor', ang: 0, moving: false, facing: dir });
  });
  viewRot = 0; camX = clamp(dx - 120, 0, worldW - VW);
  spawnObjects(); spawnStars();
  banner(ROOMS[roomK].name);
}
function flip() {
  if (!room) return;
  if (cup.active && !cup.running) return;
  if (cup.running && cup.event === 'rings') { banner('Orbit Rush stays in Zero-G — steer with the arrows!'); return; }
  if (boys[cupPlayer]?.mode === 'air') cup.skill('flip');
  RG = [-RG[1], RG[0]];                           // a quarter turn
  const s = surfFor(RG);
  $('gravArrow').textContent = ARROW[s];
  shake = .45; tilt = .12;
  whoosh(true); tone([196, 147], .4, 'sawtooth', .03, .12);
  if (!zeroG) Object.values(boys).forEach(b => {
    if (b.mode === 'surf' && b.surf === s) return;
    const d = SURF[b.mode === 'surf' ? b.surf : b.g].down;
    if (b.mode === 'surf') { b.mode = 'air'; b.v = [-d[0] * 160, -d[1] * 160]; }
    b.g = s;
  });
  objects.forEach(o => { o.va += (Math.random() - .5) * 6; });
  banner(pick(['Room flipped!', 'Whoops, gravity!', 'Everything’s sideways!', 'Upside-down time!']));
  say(pick(Object.values(boys)), QUIPS.flip);
}
function toggleZero() {
  if (!room) return;
  if (cup.active && (!cup.running || cup.event === 'rings')) return;
  if (boys[cupPlayer]?.mode === 'air') cup.skill('zero-g');
  zeroG = !zeroG;
  $('zeroBtn').setAttribute('aria-pressed', zeroG);
  if (zeroG) {
    objects.forEach(o => { o.vx += (Math.random() - .5) * 120; o.vy -= 60 + Math.random() * 120; o.va += (Math.random() - .5) * 3; });
    banner('Zero-G!'); tone([523, 659, 784, 1047], .5, 'sine', .04, .08);
    say(pick(Object.values(boys)), QUIPS.zero);
  } else {
    Object.values(boys).forEach(b => { if (b.mode === 'air') b.g = surfFor(RG); });
    banner('Gravity’s back!'); tone([784, 523, 392], .4, 'sine', .04, .08);
    say(pick(Object.values(boys)), QUIPS.zeroOff);
  }
}

// ---- loose objects ----
const OBJ_TYPES = [
  { type: 'pillow', r: 30, col: '#8fae7a' }, { type: 'pillow', r: 30, col: '#eef0e6' }, { type: 'pillow', r: 26, col: '#b9cfa8' },
  { type: 'book', r: 18, col: '#3f6fa0' }, { type: 'book', r: 18, col: '#c45a4a' }, { type: 'book', r: 18, col: '#d8a446' }, { type: 'book', r: 18, col: '#5f7d52' },
  { type: 'globe', r: 22 }, { type: 'orb', r: 20 }, { type: 'orb', r: 16 },
  { type: 'duck', r: 16 }, { type: 'plane', r: 16 }, { type: 'plane', r: 16 }, { type: 'sock', r: 14, col: '#d9707f' }, { type: 'sock', r: 14, col: '#7aa3c9' },
  { type: 'ball', r: 18 },
];
function spawnObjects() {
  objects = OBJ_TYPES.map((o, i) => ({ ...o, x: 120 + (i / OBJ_TYPES.length) * (worldW - 240) + Math.random() * 40, y: FY - o.r - Math.random() * 200, vx: 0, vy: 0, a: Math.random() * 6, va: 0 }));
}
function updateObjects(dt) {
  objects.forEach(o => {
    if (zeroG) { o.vx *= .997; o.vy *= .997; }
    else { o.vx += RG[0] * OBJ_G * dt; o.vy += RG[1] * OBJ_G * dt; }
    o.x += o.vx * dt; o.y += o.vy * dt; o.a += o.va * dt;
    const e = zeroG ? .9 : .45;
    if (o.y > FY - o.r) { o.y = FY - o.r; if (o.vy > 0) o.vy *= -e; o.vx *= .9; o.va = o.vx / o.r; }
    if (o.y < CY + o.r) { o.y = CY + o.r; if (o.vy < 0) o.vy *= -e; o.vx *= .9; o.va = -o.vx / o.r; }
    if (o.x > RX - o.r) { o.x = RX - o.r; if (o.vx > 0) o.vx *= -e; o.vy *= .9; o.va = -o.vy / o.r; }
    if (o.x < LX + o.r) { o.x = LX + o.r; if (o.vx < 0) o.vx *= -e; o.vy *= .9; o.va = o.vy / o.r; }
    // the boys bump into things
    Object.values(boys).forEach(b => {
      const c = bodyCenter(b), dx = o.x - c[0], dy = o.y - c[1], d = Math.hypot(dx, dy), r = o.r + characterHeight(b) * .25;
      if (d < r && d > 0) { const n = [dx / d, dy / d], push = (r - d) * 9; o.vx += n[0] * push; o.vy += n[1] * push; o.va += (Math.random() - .5) * 2; }
    });
  });
  for (let i = 0; i < objects.length; i++) for (let j = i + 1; j < objects.length; j++) {
    const a = objects[i], b = objects[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), r = a.r + b.r;
    if (d < r && d > 0) { const n = [dx / d, dy / d], o = (r - d) / 2; a.x -= n[0] * o; a.y -= n[1] * o; b.x += n[0] * o; b.y += n[1] * o;
      const rv = (b.vx - a.vx) * n[0] + (b.vy - a.vy) * n[1]; if (rv < 0) { a.vx += n[0] * rv * .5; a.vy += n[1] * rv * .5; b.vx -= n[0] * rv * .5; b.vy -= n[1] * rv * .5; } }
  }
}
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function drawObject(o) {
  const x = o.x - camX, y = o.y; if (x < -60 || x > VW + 60) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.a);
  if (o.type === 'pillow') { ctx.fillStyle = o.col; rr(-o.r * 1.3, -o.r * .7, o.r * 2.6, o.r * 1.4, o.r * .6); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-o.r * .9, 0); ctx.quadraticCurveTo(0, o.r * .25, o.r * .9, 0); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.3)'; rr(-o.r * 1.1, -o.r * .55, o.r * 1.2, o.r * .4, o.r * .2); ctx.fill(); }
  else if (o.type === 'book') { ctx.fillStyle = o.col; rr(-16, -21, 32, 42, 3); ctx.fill(); ctx.fillStyle = '#f6f1e2'; ctx.fillRect(12, -18, 4, 36); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(-11, -12, 18, 3); ctx.fillRect(-11, -6, 12, 2); }
  else if (o.type === 'globe') { ctx.fillStyle = '#6aa6d8'; ctx.beginPath(); ctx.arc(0, 0, o.r, 0, 7); ctx.fill(); ctx.fillStyle = '#86b46a'; ctx.beginPath(); ctx.ellipse(-6, -4, 9, 6, .4, 0, 7); ctx.ellipse(8, 7, 7, 5, -.3, 0, 7); ctx.fill(); ctx.strokeStyle = '#c9a44c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, o.r + 4, -2.2, 1.2); ctx.stroke(); }
  else if (o.type === 'orb') { const g = ctx.createRadialGradient(-4, -4, 2, 0, 0, o.r * 2.4); g.addColorStop(0, 'rgba(255,240,200,.9)'); g.addColorStop(.4, 'rgba(255,220,150,.35)'); g.addColorStop(1, 'rgba(255,220,150,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, o.r * 2.4, 0, 7); ctx.fill(); ctx.fillStyle = '#fff6df'; ctx.beginPath(); ctx.arc(0, 0, o.r, 0, 7); ctx.fill(); }
  else if (o.type === 'duck') { ctx.fillStyle = '#f5cd3c'; ctx.beginPath(); ctx.ellipse(0, 4, 16, 11, 0, 0, 7); ctx.arc(9, -8, 8, 0, 7); ctx.fill(); ctx.fillStyle = '#e8862c'; ctx.beginPath(); ctx.moveTo(16, -8); ctx.lineTo(23, -6); ctx.lineTo(16, -4); ctx.fill(); ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(11, -10, 1.6, 0, 7); ctx.fill(); }
  else if (o.type === 'plane') { ctx.fillStyle = '#fbfbf6'; ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-16, -10); ctx.lineTo(-8, 0); ctx.lineTo(-16, 10); ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.15)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-8, 0); ctx.stroke(); }
  else if (o.type === 'sock') { ctx.fillStyle = o.col; rr(-6, -16, 12, 22, 5); ctx.fill(); rr(-6, 0, 20, 11, 5); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(-6, -16, 12, 4); }
  else if (o.type === 'ball') { ctx.fillStyle = '#e8613c'; ctx.beginPath(); ctx.arc(0, 0, o.r, 0, 7); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, o.r, -.6, .6); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, o.r, 2.5, 3.8); ctx.stroke(); }
  ctx.restore();
}

// ---- stars to collect: on the ceiling, on the walls and in mid-air ----
function spawnStars() {
  const W = RX - LX;
  stars = [
    [LX + W * .2, CY + 120], [LX + W * .5, CY + 120], [LX + W * .78, CY + 120],      // ceiling
    [LX + 125, VH * .45], [RX - 125, VH * .4],                                      // walls
    [LX + W * .35, VH * .45], [LX + W * .62, VH * .5],                            // mid-air
    [LX + W * .12, FY - 125], [LX + W * .9, FY - 125], [LX + W * .45, CY + 200],
  ].map(([x, y], i) => ({ x, y, ph: i, got: false }));
  got = 0; $('stars').textContent = 0; $('starTotal').textContent = stars.length;
}
function updateStars(dt) {
  if (cup.active) return;
  stars.forEach(s => {
    if (s.got) return;
    Object.values(boys).forEach(b => {
      const c = bodyCenter(b);
      if (!s.got && Math.hypot(c[0] - s.x, c[1] - s.y) < 95) {
        s.got = true; got++; $('stars').textContent = got;
        tone([880, 1175, 1568], .3, 'triangle', .05, .05); say(b, QUIPS.star, .5);
        for (let i = 0; i < 16; i++) { const a = Math.random() * 7, v = 60 + Math.random() * 140; sparkles.push({ x: s.x, y: s.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0 }); }
        if (got === stars.length) { banner('All the stars! New ones incoming…'); tone([523, 659, 784, 1047, 1319], .6, 'triangle', .05, .1); setTimeout(() => { if (!cup.active) spawnStars(); }, 2500); }
      }
    });
  });
  sparkles.forEach(p => { p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .97; p.vy *= .97; });
  sparkles = sparkles.filter(p => p.life < .8);
}
function starPath(x, y, r, rot) { ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = rot + i * Math.PI / 5 - Math.PI / 2, q = i % 2 ? r * .45 : r; ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } ctx.closePath(); }

// ---- main update ----
function update(dt) {
  if (cup.active) {
    cup.tick(dt); syncMatch();
    if (!cup.running) { clearKeys(); return; }
  }
  if (fadeDir) {
    fade = clamp(fade + fadeDir * dt / .35, 0, 1);
    if (fadeDir === 1 && fade === 1) { arrive(); fadeDir = -1; }
    else if (fadeDir === -1 && fade === 0) fadeDir = 0;
  }
  {
    const a = boys[ctrl.arrows]; doorNear = null;
    if (!cup.active && !zeroG && a.mode === 'surf' && a.surf === 'floor')
      ROOMS[roomK].doors.forEach(d => { if (Math.abs(a.p[0] - d.x * worldW) < 110) doorNear = d; });
  }
  t += dt; shake = Math.max(0, shake - dt); tilt *= Math.pow(.02, dt);
  ['arrows', 'wasd'].forEach(src => {
    const b = boys[ctrl[src]], k = heldVec(src), any = k[0] || k[1];
    if (Math.abs(viewRot) > Math.PI / 2) { k[0] = -k[0]; k[1] = -k[1]; }   // screen-left stays left when the room is flipped
    if (any) b.idle = 0; else b.idle += dt;
    if (b.idle > 6 && !(cup.active && src === 'arrows')) { const [ak, ap] = autopilot(b, dt); updateBoy(b, ak, ap, dt); }
    else updateBoy(b, k, fresh[src], dt);
    fresh[src] = false;
  });
  // whoever has no keys wanders about on their own
  CAST.filter(k => k !== ctrl.arrows && k !== ctrl.wasd).forEach(k => { const b = boys[k]; b.idle = 99; const [ak, ap] = autopilot(b, dt); updateBoy(b, ak, ap, dt); });
  updateObjects(dt); updateStars(dt);
  if (cup.running) updateMatchTarget();
  const a = boys[ctrl.arrows], b = boys[ctrl.wasd];
  const focus = !cup.active && Math.abs(a.p[0] - b.p[0]) < 700 && b.idle < 6 ? (a.p[0] + b.p[0]) / 2 : a.p[0];
  camX += (clamp(focus - VW / 2, 0, worldW - VW) - camX) * Math.min(1, dt * (reduceMotion ? 20 : 4));
  // turn the room over when the boy the arrows move is on (or falling to) the ceiling
  const upside = a.mode === 'surf' ? a.surf === 'ceil' : (!zeroG && a.g === 'ceil');
  const target = cup.active ? 0 : zeroG ? (Math.abs(viewRot) > Math.PI / 2 ? Math.PI : 0) : (upside ? Math.PI : 0);
  const before = Math.abs(viewRot) > Math.PI / 2;
  viewRot = reduceMotion ? target : angTo(viewRot, target, Math.min(1, dt * 3.2));
  if (Math.abs(viewRot - target) < .002) viewRot = target;
  if (before !== Math.abs(viewRot) > Math.PI / 2) { whoosh(!before); $('gravArrow').style.transform = Math.abs(viewRot) > Math.PI / 2 ? 'rotate(180deg)' : ''; }
}
function toScreen(wx, wy) {
  const ac = Math.abs(Math.cos(viewRot)), an = Math.abs(Math.sin(viewRot)), z = Math.max((VW * ac + VH * an) / VW, (VW * an + VH * ac) / VH);
  const dx = (wx - camX - VW / 2) * z, dy = (wy - VH / 2) * z, c = Math.cos(viewRot), s = Math.sin(viewRot);
  return [dx * c - dy * s + VW / 2, dx * s + dy * c + VH / 2];
}

// ---- drawing ----
function bubble(x, y, text) {
  ctx.font = '600 17px "Fredoka", sans-serif';
  const w = ctx.measureText(text).width + 24, h = 30, bx = clamp(x - w / 2, 8, VW - w - 8), by = clamp(y - h - 12, 8, VH - h - 8), tip = clamp(x, bx + 14, bx + w - 14);
  ctx.fillStyle = 'rgba(30,50,40,.18)'; rr(bx + 2, by + 3, w, h, 14); ctx.fill();
  ctx.fillStyle = '#fff'; rr(bx, by, w, h, 14); ctx.fill();
  ctx.beginPath(); ctx.moveTo(tip - 7, by + h - 1); ctx.lineTo(tip, by + h + 9); ctx.lineTo(tip + 7, by + h - 1); ctx.fill();
  ctx.fillStyle = '#2a332d'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, bx + w / 2, by + h / 2 + 1);
}
function drawBoy(b) {
  const c = BOYS[b.k], s = characterHeight(b) / (c.fh - 8), x = b.p[0] - camX, y = b.p[1];
  const frame = b.moving ? Math.floor(b.phase / (c.cycle / c.frames)) % c.frames : (b.mode === 'air' ? 2 : 0);
  // soft shadow on the surface under them
  if (b.mode === 'surf') { ctx.save(); ctx.translate(x, y); ctx.rotate(b.ang); ctx.fillStyle = 'rgba(40,60,45,.22)'; ctx.beginPath(); ctx.ellipse(0, 0, c.fw * s * .4, 9, 0, 0, 7); ctx.fill(); ctx.restore(); }
  ctx.save(); ctx.translate(x, y); ctx.rotate(b.ang); ctx.scale(b.facing, 1);
  ctx.drawImage(c.img_, frame * c.fw, 0, c.fw, c.fh, -c.ax * s, -(c.fh - 4) * s, c.fw * s, c.fh * s);
  ctx.restore();
}
// name tags and speech, drawn after the room is turned so they always read the right way up
function labelPos(b) {
  const cen = toScreen(...bodyCenter(b));
  const h = characterHeight(b);
  const head = toScreen(b.p[0] + Math.sin(b.ang) * h, b.p[1] - Math.cos(b.ang) * h), feet = toScreen(b.p[0], b.p[1]);
  return { x: cen[0], y: Math.max(22, Math.min(head[1], feet[1], cen[1] - 60) - 8) };
}
function drawLabels() {
  // place tags, then push apart any that overlap so close friends stay readable
  ctx.font = '700 12px "Nunito Sans", sans-serif';
  const tags = Object.values(boys).map(b => {
    const label = BOYS[b.k].name + (cup.active && b.k === cupPlayer ? ' · competing' : b.idle > 6 ? ' · wandering' : ''), w = ctx.measureText(label).width + 14, p = labelPos(b);
    return { b, label, w, x: p.x, y: p.y };
  }).filter(g => g.x > -60 && g.x < VW + 60).sort((a, b) => a.x - b.x);
  // keep each tag over its person; if it would overlap one already placed, lift it a row
  const placed = [];
  tags.forEach(g => {
    g.x = clamp(g.x, g.w / 2 + 6, VW - g.w / 2 - 6);
    for (let n = 0; n < 6 && placed.some(p => Math.abs(p.y - g.y) < 20 && Math.abs(p.x - g.x) < (p.w + g.w) / 2 + 4); n++) g.y -= 21;
    placed.push(g);
  });
  tags.forEach(g => {
    g.x = clamp(g.x, g.w / 2 + 6, VW - g.w / 2 - 6);
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(255,255,255,.88)'; rr(g.x - g.w / 2, g.y - 14, g.w, 18, 9); ctx.fill();
    ctx.fillStyle = '#2a332d'; ctx.fillText(g.label, g.x, g.y - 1);
    if (g.b.sayT > 0) bubble(g.x, g.y - 16, g.b.say);
  });
}

function render() {
  ctx.setTransform(K, 0, 0, K, 0, 0);
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#e9eee6'; ctx.fillRect(0, 0, VW, VH);
  ctx.save();
  if (!reduceMotion && (shake > 0 || Math.abs(tilt) > .001)) {
    ctx.translate(VW / 2, VH / 2); ctx.rotate(Math.sin(t * 30) * tilt); ctx.translate(-VW / 2, -VH / 2);
    ctx.translate((Math.random() - .5) * shake * 14, (Math.random() - .5) * shake * 14);
  }
  if (viewRot) {
    // zoom just enough while turning that the painting always covers the stage
    const c = Math.abs(Math.cos(viewRot)), n = Math.abs(Math.sin(viewRot));
    const z = Math.max((VW * c + VH * n) / VW, (VW * n + VH * c) / VH);
    ctx.translate(VW / 2, VH / 2); ctx.rotate(viewRot); ctx.scale(z, z); ctx.translate(-VW / 2, -VH / 2);
  }
  ctx.drawImage(room, -camX, 0, worldW, VH);
  if (cup.active) drawMatchTarget();
  if (zeroG) { ctx.fillStyle = `rgba(170,200,255,${.08 + .04 * Math.sin(t * 2)})`; ctx.fillRect(0, 0, VW, VH); }

  (cup.active ? [] : stars).forEach(s => {
    if (s.got) return; const x = s.x - camX, y = s.y + Math.sin(t * 2 + s.ph) * 6; if (x < -40 || x > VW + 40) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, 38); g.addColorStop(0, 'rgba(255,230,140,.7)'); g.addColorStop(1, 'rgba(255,230,140,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 38, y - 38, 76, 76);
    starPath(x, y, 16, t * 1.5 + s.ph); ctx.fillStyle = '#ffd25e'; ctx.fill(); ctx.strokeStyle = '#e8a52c'; ctx.lineWidth = 2; ctx.stroke();
  });
  objects.forEach(drawObject);
  Object.values(boys).forEach(drawBoy);
  sparkles.forEach(p => { ctx.globalAlpha = 1 - p.life / .8; ctx.fillStyle = '#ffe28a'; ctx.fillRect(p.x - camX - 2, p.y - 2, 4, 4); });
  ctx.globalAlpha = 1;
  ctx.restore();
  drawLabels();
  if (cup.active && !cup.running && !cup.finished) {
    ctx.fillStyle = 'rgba(18,20,48,.55)'; ctx.fillRect(0, 0, VW, VH);
    ctx.font = '600 52px Fredoka, sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.fillText(cup.paused ? 'Paused' : String(Math.ceil(cup.countdown)), VW / 2, VH / 2);
  }
  if (doorNear && !fadeDir) doorSign(doorNear.x * worldW, doorLabel(doorNear));
  if (fade > 0) { ctx.fillStyle = `rgba(240,244,236,${fade})`; ctx.fillRect(0, 0, VW, VH); }
}
function doorSign(wx, to) {
  const p = toScreen(wx, FY - H - 40), label = '▲ ' + to, hint = isTouch() ? 'tap Go through the door' : 'press E';
  ctx.font = '600 18px "Fredoka", sans-serif';
  const w = ctx.measureText(label).width + 30, bx = clamp(p[0] - w / 2, 10, VW - w - 10), by = clamp(p[1] - 40, 50, VH - 70);
  ctx.fillStyle = 'rgba(30,50,40,.2)'; rr(bx + 2, by + 3, w, 48, 14); ctx.fill();
  ctx.fillStyle = '#fff'; rr(bx, by, w, 48, 14); ctx.fill();
  ctx.fillStyle = '#2a332d'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, bx + w / 2, by + 18);
  ctx.font = '800 11px "Nunito Sans", sans-serif'; ctx.fillStyle = '#5f7d52'; ctx.fillText(hint.toUpperCase(), bx + w / 2, by + 36);
}
const isTouch = () => matchMedia('(pointer: coarse)').matches;

// ---- Academy tournaments ----
function clearKeys() {
  Object.values(keyState).forEach(s => Object.keys(s).forEach(k => s[k] = 0));
  fresh.arrows = fresh.wasd = false;
}
function setupMatch() {
  clearKeys(); resultShown = false; fade = fadeDir = 0; pendingTo = doorNear = null;
  setRoom('atrium'); viewRot = 0; RG = [0, 1]; zeroG = cup.event === 'rings';
  $('gravArrow').textContent = '↓'; $('gravArrow').style.transform = '';
  $('zeroBtn').setAttribute('aria-pressed', zeroG);
  CAST.forEach((k, i) => { boys[k] = makeBoy(k, clamp(280 + i * 160, LX + 100, RX - 100)); });
  const player = boys[cupPlayer]; player.p = [worldW * .35, FY]; player.idle = 0;
  if (zeroG) { player.mode = 'air'; player.p[1] = 390; player.ang = 0; player.spin = 0; }
  camX = clamp(player.p[0] - VW / 2, 0, Math.max(0, worldW - VW));
  spawnObjects(); stars = []; sparkles = [];
  $('competition').hidden = false; $('matchResults').hidden = true; $('matchNext').hidden = true;
  $('cupMenu').hidden = true;
  $('starPill').hidden = true;
  $('doorBtn').disabled = $('swapBtn').disabled = $('catBtn').disabled = true;
  $('stars').textContent = '—'; $('starTotal').textContent = '—';
  newMatchTarget(); syncMatch();
  canvas.setAttribute('tabindex', '0'); canvas.focus({ preventScroll: true });
}
function startMatch(event, tournament) {
  if (!room || fadeDir) return;
  cupPlayer = ctrl.arrows; cup.start(event, tournament); setupMatch();
}
function newMatchTarget() {
  const i = cup.targetIndex, b = boys[cupPlayer], span = RX - LX;
  if (cup.event === 'rings') {
    // Alternate climb/dive and side changes; each ring is within one camera view.
    const x = clamp(b.p[0] + (i % 4 < 2 ? 220 : -220), LX + 140, RX - 140);
    cup.target = { x, y: [170, 350, 220, 390][i % 4], r: 48 };
  } else if (cup.event === 'parkour') {
    const surface = ['ceil', 'right', 'floor', 'left', 'ceil', 'floor'][i % 6];
    const fraction = i % 2 ? .65 : .35;
    cup.target = { surface, x: surface === 'left' ? LX : surface === 'right' ? RX : LX + span * fraction,
      y: surface === 'floor' ? FY : surface === 'ceil' ? CY : 280, r: 95 };
  } else cup.target = null;
}
function updateMatchTarget() {
  const target = cup.target; if (!target) return;
  const b = boys[cupPlayer];
  const center = cup.event === 'rings' ? bodyCenter(b) : b.p;
  const reached = Math.hypot(center[0] - target.x, center[1] - target.y) < target.r;
  if (reached && (cup.event === 'rings' || (!zeroG && b.mode === 'surf' && b.surf === target.surface))) {
    cup.award(cup.event === 'rings' ? 80 : 120, cup.event === 'rings' ? 'Ring chain' : 'Zone landed');
    cup.targetIndex++; tone([660, 880, 1320], .2, 'triangle', .04); newMatchTarget(); syncMatch();
  }
}
function syncMatch() {
  if (!cup.active) return;
  $('matchTitle').textContent = `${cup.tournament ? `Cup ${cup.round + 1}/3` : 'Practice'} · ${GRAVITY_EVENTS[cup.event].name} · ${BOYS[cupPlayer].name}`;
  $('matchTime').textContent = Math.ceil(cup.time);
  $('matchScore').textContent = cup.score;
  $('matchCombo').textContent = `Combo ×${Math.min(5, 1 + Math.floor(Math.max(0, cup.combo - 1) / 3))}`;
  $('matchPause').textContent = cup.paused ? 'Resume' : 'Pause';
  const instructions = cup.event === 'rings' ? 'Arrows steer in Zero-G. Pass through the numbered ring. Keep chaining within 7 seconds.' : cup.event === 'parkour' ? `Land in the ${cup.target?.surface === 'ceil' ? 'ceiling' : cup.target?.surface} zone. Jump away from a surface, release, then press a direction to redirect gravity.` : 'Jump away from your surface, redirect in mid-air, then land on a DIFFERENT surface. Add F or Z for a bigger combo. Repeated toggles count once per landing.';
  $('matchGoal').textContent = cup.paused ? 'Paused — resume when ready. Escape also pauses.' : `${instructions}${cup.lastAward ? ' · ' + cup.lastAward : ''}`;
  if (cup.finished && !resultShown) showMatchResults();
}
function showMatchResults() {
  resultShown = true; clearKeys();
  const final = cup.tournament && cup.round === 2;
  const values = final ? cup.totals : [cup.score, ...GRAVITY_EVENTS[cup.event].marks];
  const names = [BOYS[cupPlayer].name + ' (you)', 'Nova · rival mark', 'Flux · rival mark', 'Orbit · rival mark'];
  const rows = values.map((score, i) => ({ score, name: names[i], player: i === 0 })).sort((a, b) => b.score - a.score || Number(b.player) - Number(a.player));
  const rank = rows.findIndex(r => r.player) + 1;
  $('matchResults').innerHTML = `<b>${final ? `Cup complete · ${['Champion', 'Runner-up', 'Third place', 'Challenger'][rank - 1]}` : `${cup.medal} · ${cup.score} points`}</b><br>Personal best for ${GRAVITY_EVENTS[cup.event].name}: ${cup.best[cup.event]}<table><thead><tr><th>Place</th><th>Competitor</th><th>Points</th></tr></thead><tbody>${rows.map((r, i) => `<tr><td>${i + 1}</td><td>${r.name}</td><td>${r.score}</td></tr>`).join('')}</tbody></table>${final ? `<p>${cup.history.map(h => `${GRAVITY_EVENTS[h.event].name}: ${h.score} (${h.medal})`).join(' · ')}</p>` : ''}`;
  $('matchResults').hidden = false; $('matchNext').hidden = false; $('matchPause').disabled = true;
  $('matchNext').textContent = cup.tournament && !final ? 'Next event' : cup.tournament ? 'Play cup again' : 'Retry event';
  $('matchNext').focus({ preventScroll: true });
}
function pauseMatch() { if (!cup.active || cup.finished) return; cup.paused = !cup.paused; clearKeys(); syncMatch(); }
function exitMatch() {
  cup.active = false; clearKeys(); $('competition').hidden = true;
  $('cupMenu').hidden = false;
  $('starPill').hidden = false;
  $('doorBtn').disabled = $('swapBtn').disabled = $('catBtn').disabled = false; $('matchPause').disabled = false;
  zeroG = false; RG = [0, 1]; $('zeroBtn').setAttribute('aria-pressed', false); $('gravArrow').textContent = '↓';
  CAST.forEach((k, i) => { boys[k] = makeBoy(k, clamp(320 + i * 160, LX + 40, RX - 40)); });
  viewRot = 0; spawnObjects(); spawnStars(); banner('Free roam · Academy Atrium');
}
function drawMatchTarget() {
  const target = cup.target; if (!target) return;
  const x = target.x - camX, y = target.y;
  const color = cup.event === 'rings' ? '#81fff0' : '#dfb2ff';
  ctx.strokeStyle = color; ctx.fillStyle = 'rgba(24,16,58,.65)'; ctx.lineWidth = 5;
  if (cup.event === 'rings') { ctx.beginPath(); ctx.arc(x, y, target.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  else {
    ctx.beginPath();
    if (target.surface === 'floor' || target.surface === 'ceil') { ctx.moveTo(x - 90, y); ctx.lineTo(x + 90, y); }
    else { ctx.moveTo(x, y - 90); ctx.lineTo(x, y + 90); }
    ctx.stroke();
  }
  ctx.font = '600 22px Fredoka,sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = color;
  ctx.fillText(String(cup.targetIndex + 1), clamp(x, 28, VW - 28), clamp(y, 60, VH - 45));
  // A screen-edge guide keeps off-camera landing zones discoverable.
  if (x < 0 || x > VW) ctx.fillText(x < 0 ? '◀ TARGET' : 'TARGET ▶', x < 0 ? 85 : VW - 85, 100);
}
$('cupStart').addEventListener('click', () => { audio(); $('matchPause').disabled = false; startMatch('rings', true); });
document.querySelectorAll('[data-event]').forEach(b => b.addEventListener('click', () => { audio(); $('matchPause').disabled = false; startMatch(b.dataset.event, false); }));
$('matchPause').addEventListener('click', pauseMatch);
$('matchExit').addEventListener('click', exitMatch);
$('matchNext').addEventListener('click', () => {
  $('matchPause').disabled = false;
  if (!cup.next()) cup.start(cup.tournament ? 'rings' : cup.event, cup.tournament);
  setupMatch();
});

// ---- loop ----
let last = 0;
function frame(now) { const dt = Math.min(.04, (now - last) / 1000 || 0); last = now; update(dt); render(); requestAnimationFrame(frame); }
function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Could not load ' + src)); i.src = src; }); }

(async () => {
  resize();
  try { await Promise.race([document.fonts.load('600 17px "Fredoka"'), new Promise(r => setTimeout(r, 1500))]); } catch (e) {}
  try {
    await Promise.all([...Object.values(ROOMS).map(async r => { r.img_ = await loadImg(r.img); }), ...Object.values(BOYS).map(async c => { c.img_ = await loadImg(c.img); })]);
  } catch (error) {
    banner(`${error.message} — refresh to try again.`); return;
  }
  setRoom('arduan');
  boys.arduan = makeBoy('arduan', 320); boys.lucio = makeBoy('lucio', 560); boys.lucio.facing = -1; boys.lilith = makeBoy('lilith', 900); boys.brayden = makeBoy('brayden', 1160); boys.brayden.facing = -1; boys.day = makeBoy('day', 440);
  boys.cat = makeBoy('cat', 740);
  boys.arduan.idle = 0; boys.lucio.idle = 0;
  spawnObjects(); spawnStars();
  $('cupStart').disabled = false;
  $('catBtn').disabled = false;
  document.querySelectorAll('[data-event]').forEach(b => b.disabled = false);
  requestAnimationFrame(now => { last = now; requestAnimationFrame(frame); });
})();
})();
