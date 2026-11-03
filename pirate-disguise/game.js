(() => {
'use strict';
// ---- stage constants (logical 960x540) ----
const VW = 960, VH = 540, BG_H = 600, BG_YOFF = -60;
const FLOOR_Y = 518, GUEST_Y = 488, ADULT = 270, GUEST_SCALE = .9;
const GLIDE = 120, STOMP = 250, HEAR = 170, LISTEN_SECS = 3, BOSS_SECS = 4.5;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Cutlass's boys (they all have walk sheets), and the guests at the ball.
// face = [x, y, size] of the head as fractions of the portrait (y from the top, size as a share of the height).
const P = {
  cutlass:     { name: 'Cutlass', lady: 'Lady Cutlassina', img: 'cutlass.png', size: 1.02, face: [.46, .085, .13], walk: { img: 'cutlass-walk.png', frames: 8, fw: 238, fh: 420, ax: 120, cycle: 130 },
                 // the boy already in each gown (side view, ax on his neck); these replace the painted-on gown
                 gown: { img: k => `cutlass-gown-${k}.png`, frames: 8, fw: 270, fh: 420, ax: 149, cycle: 150, wigDrop: 1.5 } },
  bones:       { name: 'Bones', lady: 'Lady Bonnie', img: 'bones.png', size: .84, face: [.5, .09, .14], walk: { img: 'bones-walk.png', frames: 8, fw: 250, fh: 420, ax: 112, cycle: 148 },
                 gown: { img: k => `bones-gown-${k}.png`, frames: 8, fw: 255, fh: 420, ax: 141, cycle: 150, wigDrop: 1.5 } },
  jade:        { name: 'Jade', lady: 'Lady Jadeline', img: 'jade.png', size: 1, face: [.5, .075, .13], walk: { img: 'jade-walk.png', frames: 8, fw: 246, fh: 420, ax: 129, cycle: 156 },
                 gown: { img: k => `jade-gown-${k}.png`, frames: 8, fw: 270, fh: 420, ax: 149, cycle: 150, wigDrop: 1.5 } },  // his head on Cutlass's gowns
  monsoon:     { name: 'Monsoon', lady: 'Lady Monique', img: 'monsoon.png', size: 1, face: [.5, .085, .13], walk: { img: 'monsoon-walk.png', frames: 7, fw: 277, fh: 420, ax: 138, cycle: 163 },
                 gown: { img: k => `monsoon-gown-${k}.png`, frames: 8, fw: 281, fh: 420, ax: 131, cycle: 160, wigDrop: 1.5 } },
  stormcaller: { name: 'Stormcaller', lady: 'Lady Stormella', img: 'stormcaller.png', size: 1, face: [.5, .075, .13], walk: { img: 'stormcaller-walk.png', frames: 8, fw: 246, fh: 420, ax: 108, cycle: 157 },
                 gown: { img: k => `stormcaller-gown-${k}.png`, frames: 8, fw: 281, fh: 420, ax: 131, cycle: 160, wigDrop: 1.5 } },  // his head on Monsoon's gowns
  // guests (the royals only have walk sheets; frame 0 is used when they stand)
  blue:    { name: 'The Icy-Blue Prince', size: 1, walk: { img: 'blue-prince.png', frames: 8, fw: 253, fh: 420, ax: 123 } },
  ivory:   { name: 'The Ivory & Gold Prince', size: 1.01, walk: { img: 'ivory-prince.png', frames: 8, fw: 231, fh: 420, ax: 113 } },
  ember:   { name: 'Ember', size: .93, walk: { img: 'ember.png', frames: 4, fw: 291, fh: 357, ax: 155 } },
  lila:    { name: 'Lila-Bella', size: .77, walk: { img: 'lila-bella.png', frames: 4, fw: 282, fh: 356, ax: 152 } },
  clement: { name: 'Goldtooth', img: 'clement.png', size: 1.03 },
};
const BOYS = ['cutlass', 'bones', 'jade', 'monsoon', 'stormcaller'];
const WIGS = [
  { key: 'tower', name: 'Powdered tower', col: '#f1ebe0', img: 'wig-powdered.png' },
  { key: 'ringlets', name: 'Golden ringlets', col: '#e6bd52', img: 'wig-golden.png' },
  { key: 'bun', name: 'Raven bun', col: '#2f2422' },
  { key: 'curls', name: 'Ginger curls', col: '#c9622b', img: 'wig-ginger.png' },
];
const GOWNS = [
  { key: 'rose', name: 'Rose', col: '#e98aa6' },
  { key: 'lavender', name: 'Lavender', col: '#b49ad8' },
  { key: 'mint', name: 'Mint', col: '#86cfb0' },
  { key: 'canary', name: 'Canary', col: '#f2d05a' },
];
// painted wigs, fitted offline to each boy's gown sheets: [scale, x-stretch, then the wig's top-left (x, y) in each of the 8 frames]
const WIG_FITS = {
  tower: {
    cutlass: [0.1953, 1.3, 102, -27, 101, -25, 101, -25, 101, -26, 100, -25, 100, -26, 101, -24, 100, -24],
    bones: [0.2658, 1.1, 87, -32, 78, -28, 85, -33, 86, -35, 80, -26, 79, -26, 88, -34, 79, -27],
    jade: [0.2078, 1.3, 100, -30, 98, -28, 97, -26, 98, -28, 96, -25, 94, -27, 97, -26, 95, -24],
    monsoon: [0.1785, 1.3, 95, -24, 94, -23, 96, -24, 94, -22, 93, -22, 94, -23, 96, -24, 94, -21],
    stormcaller: [0.1785, 1.3, 94, -23, 92, -23, 93, -21, 93, -23, 90, -20, 92, -23, 94, -22, 91, -20],
  },
  ringlets: {
    cutlass: [0.1607, 1, 119, -8, 118, -6, 118, -6, 118, -7, 117, -6, 117, -7, 118, -5, 117, -5],
    bones: [0.2037, 1, 101, -2, 92, 2, 99, -3, 100, -5, 94, 4, 93, 4, 102, -4, 93, 3],
    jade: [0.1911, 1, 112, -12, 110, -10, 109, -8, 110, -10, 108, -7, 106, -9, 109, -8, 107, -6],
    monsoon: [0.1584, 1, 106, -9, 105, -8, 107, -9, 105, -7, 104, -7, 105, -8, 107, -9, 105, -6],
    stormcaller: [0.1635, 1, 105, -11, 103, -11, 104, -9, 104, -11, 101, -8, 103, -11, 105, -10, 102, -8],
  },
  curls: {
    cutlass: [0.1557, 1, 122, -7, 121, -5, 121, -5, 121, -6, 120, -5, 120, -6, 121, -4, 120, -4],
    bones: [0.1968, 1, 102, -2, 93, 2, 100, -3, 101, -5, 95, 4, 94, 4, 103, -4, 94, 3],
    jade: [0.1745, 1, 117, -11, 115, -9, 114, -7, 115, -9, 113, -6, 111, -8, 114, -7, 112, -5],
    monsoon: [0.1534, 1, 108, -7, 107, -6, 109, -7, 107, -5, 106, -5, 107, -6, 109, -7, 107, -4],
    stormcaller: [0.1635, 1, 105, -10, 103, -10, 104, -8, 104, -10, 101, -7, 103, -10, 105, -9, 102, -7],
  },
};
const EXTRAS = [
  { key: 'pearls', name: 'Pearls' },
  { key: 'boa', name: 'Feather boa' },
  { key: 'mark', name: 'Beauty mark' },
  { key: 'bow', name: 'Giant bow' },
];

// Who's talking, where (fraction of the salon's width), the chatter you overhear, and the secret it gives up.
const SPOTS = [
  { id: 'reef', x: .17, guests: [['ember', -44, 1], ['lila', 40, -1]],
    chatter: ['Did you see the prince’s shoes?', 'Buckles the size of dinner plates!', 'Hush, someone’s coming.'],
    secret: 'A ship with black sails dropped anchor behind the reef at sunset.' },
  { id: 'paid', x: .39, guests: [['blue', 0, 1]],
    chatter: ['*practising a bow* No… too low.', 'Midnight. Keep her dancing until midnight.', 'Why did I agree to this?'],
    secret: 'A man with a gold tooth paid the Icy-Blue Prince to keep Captain Ruby dancing until midnight.' },
  { id: 'cabin', x: .61, guests: [['ivory', 0, -1]],
    chatter: ['Lovely evening. Strange guests.', 'He asked me where her cabin is.', 'At a ball! The nerve.'],
    secret: 'The gold-toothed man kept asking where Captain Ruby’s cabin is.' },
  { id: 'plan', x: .85, guests: [['clement', 0, -1]], boss: true,
    chatter: ['At midnight the boats row over.', 'While she dances, we take the maps.', 'Every treasure route she’s ever charted.'],
    secret: 'Goldtooth’s plan: while Ruby dances at midnight, his men row over and steal her maps.' },
];
const CHECKS = {
  curtsy: { key: 'c', verb: 'CURTSY', lines: ['Will you dance, fair lady?', 'Charmed to meet you, my lady.', 'How do you do, my lady?'],
            good: ['How delightful!', 'What exquisite manners.', 'Enchanting.'],
            oops: ['Aye aye, mate!', '*salutes* …I mean, hello.', '*bows like a sailor*'] },
  fan:    { key: 'f', verb: 'FLUTTER YOUR FAN', lines: ['Goodness, is that… stubble?', 'Have we met? You look so familiar…', 'My lady, your jaw is very… square.'],
            good: ['Oh! How mysterious.', 'Forgive me, the candlelight.', 'My mistake, my lady.'],
            oops: ['*scratches chin loudly*', 'Er… it’s a beauty mark.', '*coughs in a deep voice*'] },
  wig:    { key: 'w', verb: 'FIX YOUR WIG', lines: [], good: ['*pats curls into place*'], oops: [] },
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
const lerp = (a, b, t) => a + (b - a) * t;
const pick = a => a[Math.floor(Math.random() * a.length)];

// ---- state ----
let bg, W = 1800, camX = 0, t = 0, mode = 'title';
let me = 'cutlass', look = { wig: WIGS[0], gown: GOWNS[0], extra: EXTRAS[0] };
let pl, guests, spots, suspicion = 0, peak = 0, found = [], check = null, nextCheck = 0, sparks = [], endT = 0, won = false;
const keys = { left: false, right: false, listen: false, stomp: false };

function reset() {
  pl = { k: me, x: .05 * W, facing: 1, moving: false, phase: 0, curtsy: 0, fan: 0, wigTilt: 0, wigOff: 0, say: '', sayT: 0, stompT: 0 };
  guests = {}; spots = SPOTS.map(s => ({ ...s, heard: 0, done: false, talk: Math.random() * 6, line: 0 }));
  spots.forEach(s => s.guests.forEach(([k, dx, facing]) => { guests[k] = { k, x: s.x * W + dx, facing, say: '', sayT: 0, spot: s, turn: 0 }; }));
  suspicion = peak = 0; found = []; check = null; nextCheck = 5; sparks = []; camX = 0; won = false;
  hud();
}

// ---- sound ----
let ac = null, muted = false;
function audio() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } } if (ac && ac.state === 'suspended') ac.resume(); }
function tone(freqs, dur = .12, type = 'triangle', vol = .05, gap = .07) {
  if (!ac || muted) return;
  freqs.forEach((f, i) => { const t0 = ac.currentTime + i * gap, o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur); o.connect(g).connect(ac.destination); o.start(t0); o.stop(t0 + dur + .02); });
}
$('mute').addEventListener('click', () => { muted = !muted; $('mute').textContent = muted ? 'Sound off' : 'Sound on'; $('mute').setAttribute('aria-pressed', muted); });

function hud() {
  const s = Math.round(suspicion);
  $('sus').textContent = s + '%'; $('susBar').style.width = s + '%';
  $('secrets').textContent = found.length; $('secretTotal').textContent = SPOTS.length;
}
let toastTimer = 0;
function toast(text, secs = 3) { const el = $('toast'); el.textContent = text; el.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('on'), secs * 1000); }
function say(o, text, secs = 2.2) { o.say = text; o.sayT = secs; }
function suspect(n) { suspicion = clamp(suspicion + n, 0, 100); peak = Math.max(peak, suspicion); hud(); if (suspicion >= 100 && mode === 'play') unmasked(); }

// ---- the dressing room ----
function faceStyle(key, size) {
  const p = P[key], img = p.img_, s = size / (p.face[2] * img.height);
  return `background-image:url('${p.img}');background-size:${img.width * s}px ${img.height * s}px;background-position:${-(p.face[0] * img.width * s - size / 2)}px ${-(p.face[1] * img.height * s - size / 2)}px`;
}
function optionRow(id, list, field, swatch) {
  list.forEach(o => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.dataset.k = o.key;
    b.innerHTML = (swatch ? `<i style="background:${o.col}"></i>` : '') + o.name;
    b.addEventListener('click', () => { look[field] = o; menuState(); });
    $(id).appendChild(b);
  });
}
function buildMenus() {
  BOYS.forEach(k => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'who'; b.dataset.k = k;
    b.innerHTML = `<span class="face" style="${faceStyle(k, 48)}"></span><b>${P[k].name}</b>`;
    b.addEventListener('click', () => { me = k; menuState(); });
    $('pick').appendChild(b);
  });
  optionRow('wigs', WIGS, 'wig', true); optionRow('gowns', GOWNS, 'gown', true); optionRow('extras', EXTRAS, 'extra', false);
  menuState();
}
function menuState() {
  document.querySelectorAll('#pick .who').forEach(b => b.setAttribute('aria-pressed', b.dataset.k === me));
  [['wigs', 'wig'], ['gowns', 'gown'], ['extras', 'extra']].forEach(([id, f]) => document.querySelectorAll(`#${id} .opt`).forEach(b => b.setAttribute('aria-pressed', b.dataset.k === look[f].key)));
  $('alias').textContent = `Introducing ${P[me].lady}`;
}
function start() {
  audio(); reset(); mode = 'play';
  $('titleCard').hidden = true; $('endCard').hidden = true;
  toast(`${P[me].lady} has arrived. Find out what Goldtooth is up to.`, 4);
  tone([523, 659, 784], .2, 'triangle', .04, .1);
}
$('startBtn').addEventListener('click', start);
$('againBtn').addEventListener('click', () => { $('endCard').hidden = true; $('titleCard').hidden = false; mode = 'title'; $('startBtn').focus(); });

// ---- acting like a lady ----
function act(kind) {
  if (mode !== 'play') return;
  audio();
  if (kind === 'curtsy') { pl.curtsy = .7; tone([660, 880], .1, 'sine', .04); }
  if (kind === 'fan') { pl.fan = 1.2; tone([1200, 1500, 1200], .05, 'sine', .02, .05); }
  if (kind === 'wig') { pl.wigTilt = 0; tone([440, 520], .08, 'sine', .03); }
  if (!check) return;
  if (check.type === kind) {
    const g = check.who && guests[check.who];
    if (g) say(g, pick(CHECKS[kind].good)); else say(pl, pick(CHECKS[kind].good), 1.6);
    suspect(-8); check = null; nextCheck = lerp(6, 10, Math.random());
    sparkle(pl.x, FLOOR_Y - 200, '#ffd6e4');
  } else {
    say(pl, pick(['Tee-hee?', '*curtsies at nothing*', 'Oh! I mean… oh.']), 1.6);
    suspect(10);
  }
}
function newCheck() {
  // whoever is closest notices you; sometimes the wig just slips on its own
  const near = Object.values(guests).sort((a, b) => Math.abs(a.x - pl.x) - Math.abs(b.x - pl.x))[0];
  const bossNear = near.k === 'clement' && Math.abs(near.x - pl.x) < 300;
  const type = Math.random() < .28 ? 'wig' : pick(['curtsy', 'fan']);
  const limit = bossNear ? 1.9 : 2.5;
  check = { type, who: type === 'wig' ? null : near.k, t: 0, limit };
  if (type === 'wig') { toast('Your wig is slipping! Press W.', 2.4); return; }
  near.turn = 1.5; near.facing = Math.sign(pl.x - near.x) || 1;
  const line = pick(CHECKS[type].lines);
  say(near, line, limit + .3);
  toast(`${P[near.k].name}: “${line}” ${CHECKS[type].verb}!`, limit);
}
function failCheck() {
  const c = check; check = null; nextCheck = lerp(5, 9, Math.random());
  tone([220, 160], .25, 'sawtooth', .05, .12);
  if (c.type === 'wig') {
    pl.wigOff = 1.6; pl.wigTilt = 0; say(pl, 'MY HAIR!', 1.6);
    Object.values(guests).forEach(g => { if (Math.abs(g.x - pl.x) < 500) say(g, pick(['Is that a WIG?', 'Gasp!', 'Her hair fell off!']), 1.8); });
    suspect(35); return;
  }
  say(pl, pick(CHECKS[c.type].oops), 1.8);
  const g = guests[c.who]; if (g) setTimeout(() => say(g, pick(['…mate?', 'How very odd.', 'Hmm.']), 1.6), 900);
  suspect(30);
}

// ---- secrets ----
function spotNear() { return spots.find(s => !s.done && Math.abs(s.x * W - pl.x) < HEAR); }
function talking(s) { return (s.talk % 7.5) < 5; }
function bossLocked(s) { return s.boss && found.length < SPOTS.length - 1; }
function learn(s) {
  s.done = true; found.push(s.secret); hud();
  tone([784, 988, 1175], .18, 'triangle', .05, .1); sparkle(pl.x, FLOOR_Y - 230, '#f2c14e');
  toast(`Secret overheard: ${s.secret}`, 5);
  if (s.boss) { check = null; setTimeout(() => { if (mode === "play") victory(); }, 1400); }
  else if (found.length === SPOTS.length - 1) setTimeout(() => toast('That’s everything the guests know. Now get close to Goldtooth himself.', 4), 5200);
}
function sparkle(x, y, col) { for (let i = 0; i < 18; i++) { const a = Math.random() * 7, v = 60 + Math.random() * 120; sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, life: 0, max: .9, col }); } }

function unmasked() {
  mode = 'end'; won = false; check = null; endT = 0; pl.wigOff = 99;
  tone([392, 330, 262, 196], .3, 'sawtooth', .05, .16);
  Object.values(guests).forEach(g => say(g, pick(['It’s a PIRATE!', 'Seize that… lady?', 'Guards!', 'I KNEW that jaw was suspicious!']), 4));
  setTimeout(() => {
    $('endEyebrow').textContent = 'Unmasked!';
    $('endTitle').textContent = `${P[me].lady} is thrown out of the ball`;
    $('endText').textContent = `${P[me].name} was chased up on deck with ${look.gown.name.toLowerCase()} skirts flapping. ${found.length ? `You did overhear ${found.length} of the ${SPOTS.length} secrets.` : 'Not a single secret overheard.'} Cutlass’s crew will never let ${P[me].name} forget this.`;
    $('againBtn').textContent = 'Back to the dressing room';
    $('endCard').hidden = false; $('againBtn').focus();
  }, 2200);
}
function victory() {
  mode = 'end'; won = true; check = null;
  const title = peak < 35 ? 'The Belle of the Ball' : peak < 65 ? 'A Mostly Convincing Lady' : 'The Hairiest Debutante';
  $('endEyebrow').textContent = 'Plot uncovered!';
  $('endTitle').textContent = title;
  $('endText').textContent = `At midnight, while Ruby dances, Goldtooth’s men plan to steal her maps. ${P[me].lady} slips out to warn the captain. Ruby: “You actually did it. And honestly? The ${look.wig.name.toLowerCase()} suits you.”`;
  $('againBtn').textContent = 'Try another disguise';
  $('endCard').hidden = false; $('againBtn').focus();
}

// ---- input ----
const KEYMAP = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', e: 'listen', E: 'listen', ' ': 'listen', Shift: 'stomp' };
const ACTS = { c: 'curtsy', C: 'curtsy', f: 'fan', F: 'fan', w: 'wig', W: 'wig' };
addEventListener('keydown', e => {
  if (mode !== 'play') return;
  if (KEYMAP[e.key]) { keys[KEYMAP[e.key]] = true; e.preventDefault(); }
  else if (ACTS[e.key] && !e.repeat) { act(ACTS[e.key]); e.preventDefault(); }
});
addEventListener('keyup', e => { if (KEYMAP[e.key]) keys[KEYMAP[e.key]] = false; });
addEventListener('blur', () => Object.keys(keys).forEach(k => keys[k] = false));
function hold(id, k) {
  const b = $(id), on = e => { e.preventDefault(); keys[k] = true; b.classList.add('held'); }, off = () => { keys[k] = false; b.classList.remove('held'); };
  b.addEventListener('pointerdown', on); ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => b.addEventListener(ev, off));
}
hold('tLeft', 'left'); hold('tRight', 'right'); hold('tListen', 'listen');
[['tCurtsy', 'curtsy'], ['tFan', 'fan'], ['tWig', 'wig']].forEach(([id, a]) => $(id).addEventListener('pointerdown', e => { e.preventDefault(); act(a); }));

// ---- update ----
function update(dt) {
  t += dt;
  sparks.forEach(s => { s.life += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 160 * dt; }); sparks = sparks.filter(s => s.life < s.max);
  if (!pl) return;
  [pl, ...Object.values(guests)].forEach(o => { o.sayT = Math.max(0, o.sayT - dt); });
  pl.curtsy = Math.max(0, pl.curtsy - dt); pl.fan = Math.max(0, pl.fan - dt); pl.wigOff = Math.max(0, pl.wigOff - dt);
  Object.values(guests).forEach(g => { g.turn = Math.max(0, g.turn - dt); });
  if (mode === 'play') {
    const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0), stomping = keys.stomp && dir !== 0;
    pl.moving = dir !== 0 && pl.curtsy <= 0;
    if (pl.moving) {
      const sp = (stomping ? STOMP : GLIDE) * dt;
      pl.facing = dir; pl.x = clamp(pl.x + dir * sp, 60, W - 60); pl.phase += sp;
      if (stomping) { suspect(16 * dt); pl.stompT -= dt; if (pl.stompT <= 0) { pl.stompT = 1.6; say(pl, pick(['*CLOMP CLOMP CLOMP*', '*thunderous heels*', 'Coming through, ladies!']), 1.2); } }
    }
    // gossip only travels while people are talking, and only while you hold still and listen
    spots.forEach(s => { s.talk += dt; });
    const s = spotNear();
    if (s && keys.listen && !pl.moving) {
      if (bossLocked(s)) {
        if (!s.warned) { s.warned = true; say(guests.clement, 'Run along, my dear. Grown-ups are talking.', 2.4); toast(`Goldtooth won’t talk in front of strangers yet. Overhear the other guests first (${found.length}/${SPOTS.length - 1}).`, 4); }
      } else if (talking(s)) {
        s.heard += dt;
        if (s.heard >= (s.boss ? BOSS_SECS : LISTEN_SECS)) learn(s);
      }
    }
    // the slipping wig creeps sideways until it's fixed
    if (check?.type === 'wig') pl.wigTilt = Math.min(.55, pl.wigTilt + dt * .25);
    if (check) { check.t += dt; if (check.t >= check.limit) failCheck(); }
    else { nextCheck -= dt * (s && keys.listen ? 1.5 : 1); if (nextCheck <= 0) newCheck(); }
    suspicion = Math.max(0, suspicion - dt * 1.5); hud();
  } else pl.moving = false;
  camX += (clamp(pl.x - VW / 2, 0, W - VW) - camX) * Math.min(1, dt * (reduceMotion ? 20 : 4));
}

// ---- drawing ----
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function wrap(text, max) { const out = []; let line = ''; text.split(' ').forEach(w => { const tl = line ? line + ' ' + w : w; if (ctx.measureText(tl).width > max && line) { out.push(line); line = w; } else line = tl; }); if (line) out.push(line); return out; }
function bubble(x, y, text, name) {
  ctx.font = '17px "IM Fell English", Georgia, serif';
  const lines = wrap(text, 230), w = Math.min(260, Math.max(...lines.map(l => ctx.measureText(l).width), name ? ctx.measureText(name).width : 0) + 26);
  const lh = 21, h = 12 + lines.length * lh + (name ? 16 : 0), bx = clamp(x - w / 2, 8, VW - w - 8), by = clamp(y - h - 14, 50, VH - h - 8), tip = clamp(x, bx + 14, bx + w - 14);
  ctx.fillStyle = 'rgba(0,0,0,.2)'; rr(bx + 2, by + 3, w, h, 10); ctx.fill();
  ctx.fillStyle = '#fff8ea'; rr(bx, by, w, h, 10); ctx.fill();
  ctx.beginPath(); ctx.moveTo(tip - 7, by + h - 1); ctx.lineTo(tip, by + h + 9); ctx.lineTo(tip + 7, by + h - 1); ctx.fill();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (name) { ctx.font = '700 12px "Alegreya Sans", sans-serif'; ctx.fillStyle = '#9b7230'; ctx.fillText(name.toUpperCase(), bx + w / 2, by + 13); ctx.font = '17px "IM Fell English", Georgia, serif'; }
  ctx.fillStyle = '#3a2816'; lines.forEach((l, i) => ctx.fillText(l, bx + w / 2, by + 7 + (name ? 16 : 0) + lh / 2 + i * lh));
}
function shade(hex, k) { const n = parseInt(hex.slice(1), 16), f = c => clamp(Math.round(c * k), 0, 255); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; }

// a guest, standing in their first walk frame (or portrait); returns the top of their head
function drawGuest(g) {
  const p = P[g.k], h = ADULT * p.size * GUEST_SCALE, sx = g.x - camX;
  if (sx < -220 || sx > VW + 220) return GUEST_Y - h;
  const sway = reduceMotion ? 0 : Math.sin(t * 1.6 + g.x) * .015;
  ctx.fillStyle = 'rgba(40,20,5,.25)'; ctx.beginPath(); ctx.ellipse(sx, GUEST_Y, h * .18, 6, 0, 0, 7); ctx.fill();
  ctx.save(); ctx.translate(sx, GUEST_Y); ctx.rotate(sway);
  if (p.walk) {
    const wk = p.walk, wh = h * wk.fh / (wk.fh - 4), ww = wk.fw * wh / wk.fh;
    if (g.facing < 0) ctx.scale(-1, 1);
    ctx.drawImage(p.walkImg, 0, 0, wk.fw, wk.fh, -wk.ax * wh / wk.fh, -wh + 4 * wh / wk.fh, ww, wh);
  } else { const img = p.img_, w = img.width * h / img.height; ctx.drawImage(img, -w / 2, -h, w, h); }
  ctx.restore();
  return GUEST_Y - h;
}

// ---- the disguise, drawn over a boy (feet at the origin, height h) ----
function drawWig(style, col, hx, hy, r, face = true, fdx = 0) {
  // keep the face clear: everything is drawn outside an oval around the eyes, nose and mouth
  ctx.save();
  if (face) { ctx.beginPath(); ctx.rect(hx - 6 * r, hy - 6 * r, 12 * r, 12 * r); ctx.ellipse(hx + fdx, hy + .22 * r, .74 * r, .98 * r, 0, 0, 7); ctx.clip('evenodd'); }
  const dark = shade(col, .72), circ = (x, y, rad) => { ctx.beginPath(); ctx.arc(x, y, rad, 0, 7); ctx.fill(); ctx.stroke(); };
  ctx.fillStyle = col; ctx.strokeStyle = dark; ctx.lineWidth = 1.5;
  if (style === 'tower') {
    [[0, -3.1, .75], [0, -2.25, .95], [0, -1.25, 1.18]].forEach(([x, y, s]) => circ(hx + x * r, hy + y * r, s * r));
    [-1, 1].forEach(sd => { circ(hx + sd * 1.08 * r, hy - .25 * r, .5 * r); circ(hx + sd * 1.12 * r, hy + .55 * r, .42 * r); });
  } else if (style === 'ringlets') {
    circ(hx, hy - .75 * r, 1.2 * r);
    [-1, 1].forEach(sd => { for (let i = 0; i < 5; i++) circ(hx + sd * (1.12 + (i % 2) * .12) * r, hy - .2 * r + i * .62 * r, .38 * r); });
  } else if (style === 'bun') {
    circ(hx, hy - 1.95 * r, .72 * r); circ(hx, hy - .7 * r, 1.15 * r);
    [-1, 1].forEach(sd => circ(hx + sd * 1.0 * r, hy - .05 * r, .42 * r));
    ctx.fillStyle = '#f5f0f4'; ctx.strokeStyle = '#c9a0b4'; [0, 1.3, 2.6, 3.9, 5.2].forEach(a => circ(hx + .55 * r + Math.cos(a) * .22 * r, hy - 1.55 * r + Math.sin(a) * .22 * r, .16 * r));
  } else {
    circ(hx, hy - .7 * r, 1.15 * r);
    for (let i = 0; i <= 8; i++) { const a = Math.PI * (1.05 + i * .9 / 8 * 1); circ(hx + Math.cos(a) * 1.25 * r, hy - .5 * r + Math.sin(a) * 1.25 * r, .45 * r); }
    [-1, 1].forEach(sd => { circ(hx + sd * 1.25 * r, hy + .2 * r, .42 * r); circ(hx + sd * 1.15 * r, hy + .85 * r, .36 * r); });
  }
  // a few curl strokes for texture
  ctx.strokeStyle = dark; ctx.lineWidth = 1.2;
  for (let i = 0; i < 6; i++) { const a = i * 1.1; ctx.beginPath(); ctx.arc(hx + Math.cos(a) * .6 * r, hy - 1.2 * r + Math.sin(a) * .35 * r, .18 * r, 0, 4); ctx.stroke(); }
  ctx.restore();
}
function drawBow(x, y, s, col) {
  ctx.fillStyle = col; ctx.strokeStyle = shade(col, .7); ctx.lineWidth = 1.5;
  [-1, 1].forEach(sd => { ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + sd * s * 1.4, y - s * 1.1, x + sd * s * 1.3, y + s * .2); ctx.quadraticCurveTo(x + sd * s * .9, y + s * .5, x, y); ctx.fill(); ctx.stroke(); });
  ctx.beginPath(); ctx.arc(x, y, s * .28, 0, 7); ctx.fill(); ctx.stroke();
}
function drawLady(o, sx, footY, h, opts = {}) {
  const p = P[o.k], moving = !!opts.moving, gownImg = p.gown && p.gown.imgs[look.gown.key];
  const side = gownImg || (moving && p.walk), wk = gownImg ? p.gown : p.walk;
  const squash = o.curtsy > 0 ? 1 - Math.sin((1 - o.curtsy / .7) * Math.PI) * .12 : 1;
  ctx.fillStyle = 'rgba(40,20,5,.25)'; ctx.beginPath(); ctx.ellipse(sx, footY, h * .27, 7, 0, 0, 7); ctx.fill();
  ctx.save(); ctx.translate(sx, footY); ctx.scale(1, squash);
  if (o.facing < 0) ctx.scale(-1, 1);
  // the boy himself (already gowned, if he has a sheet for this gown; standing still is the first frame)
  const fr = side && moving ? Math.floor(o.phase / (wk.cycle / wk.frames)) % wk.frames : 0;
  if (side) {
    const wh = h * wk.fh / (wk.fh - 4), ww = wk.fw * wh / wk.fh;
    ctx.drawImage(gownImg || p.walkImg, fr * wk.fw, 0, wk.fw, wk.fh, -wk.ax * wh / wk.fh, -wh + 4 * wh / wk.fh, ww, wh);
  } else { const img = p.img_, w = img.width * h / img.height; ctx.drawImage(img, -w / 2, -h, w, h); }
  const col = look.gown.col, r = p.face[2] * h * .52;
  let hx = (p.face[0] - .5) * (p.img_.width * h / p.img_.height), hy = -h * (1 - p.face[1]);
  if (side) { const k = h / (wk.fh - 4); hx = (wk.head[0] - wk.ax) * k; hy = -h + wk.head[1] * k + r * (wk.wigDrop || 1.05); }
  const bTop = -h * .79;
  if (!gownImg) {
    // gown: a big bell skirt with lace at the hem
    const sway = moving && !reduceMotion ? Math.sin(o.phase * .06) * h * .025 : 0, wide = 1 + (o.curtsy > 0 ? .12 : 0);
    const waist = -h * .5, top = h * .085, hem = -h * .015, flare = h * .27 * wide;
    const g = ctx.createLinearGradient(-flare, 0, flare, 0); g.addColorStop(0, shade(col, .72)); g.addColorStop(.45, shade(col, 1.08)); g.addColorStop(1, shade(col, .78));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-top, waist);
    ctx.bezierCurveTo(-top * 1.5, waist + h * .2, -flare * .95 + sway, hem - h * .14, -flare + sway, hem);
    ctx.lineTo(flare + sway, hem); ctx.bezierCurveTo(flare * .95 + sway, hem - h * .14, top * 1.5, waist + h * .2, top, waist); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2;
    [.38, .68].forEach(k => { const y = lerp(waist, hem, k), wx = lerp(top * 1.3, flare, k * k); ctx.beginPath(); ctx.moveTo(-wx + sway * k, y); ctx.quadraticCurveTo(sway * k, y + h * .03, wx + sway * k, y); ctx.stroke(); });
    ctx.fillStyle = '#fffaf2'; for (let x = -flare; x <= flare; x += h * .04) { ctx.beginPath(); ctx.arc(x + sway, hem, h * .022, 0, Math.PI, true); ctx.fill(); }
    // bodice and lace collar
    const bw = h * .085;
    ctx.fillStyle = shade(col, .95); ctx.beginPath(); ctx.moveTo(-bw, bTop); ctx.lineTo(bw, bTop); ctx.lineTo(top * .95, waist + 2); ctx.lineTo(0, waist + h * .04); ctx.lineTo(-top * .95, waist + 2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = shade(col, .7); ctx.lineWidth = 1.2; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * bw * .3, bTop + 4); ctx.lineTo(i * bw * .18, waist); ctx.stroke(); }
    ctx.fillStyle = '#fffaf2'; for (let x = -bw; x <= bw + 1; x += bw / 3) { ctx.beginPath(); ctx.arc(x, bTop, h * .016, 0, Math.PI); ctx.fill(); }
    drawBow(0, waist + 2, h * .035, shade(col, .8));
  }
  if (look.extra.key === 'boa') { ctx.fillStyle = '#ff9ccf'; for (let i = 0; i <= 14; i++) { const k = i / 14, x = lerp(-h * .12, h * .12, k), y = bTop - h * .01 + Math.sin(k * Math.PI) * h * .05; ctx.beginPath(); ctx.arc(x + Math.sin(i * 7) * 2, y + Math.cos(i * 5) * 2, h * .018, 0, 7); ctx.fill(); } }
  // wig (it slips when it's slipping, and goes missing when it falls)
  if (o.wigOff <= 0) {
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(o.wigTilt); ctx.translate(o.wigTilt * r * 1.6, -o.wigTilt * r * .4);
    const fit = gownImg && look.wig.img_ && WIG_FITS[look.wig.key]?.[o.k];
    if (fit) {
      // the painted wig, where it was fitted on this frame of his gown sheet
      const k = h / (wk.fh - 4), img = look.wig.img_, [s, sx] = fit, x = fit[2 + fr * 2], y = fit[3 + fr * 2];
      ctx.drawImage(img, (x - wk.ax) * k - hx, -h + y * k - hy, img.width * s * sx * k, img.height * s * k);
    } else drawWig(look.wig.key, look.wig.col, 0, 0, r, true, side ? r * .45 : 0);
    if (look.extra.key === 'bow') drawBow(r * .5, -r * 2.1, r * .7, '#e0446b');
    ctx.restore();
  }
  if (!side) {
    // rouge, a little lipstick, and the finishing touch
    ctx.fillStyle = 'rgba(235,90,120,.28)'; [-1, 1].forEach(sd => { ctx.beginPath(); ctx.arc(hx + sd * r * .45, hy + r * .3, r * .2, 0, 7); ctx.fill(); });
    ctx.fillStyle = 'rgba(200,30,60,.55)'; ctx.beginPath(); ctx.ellipse(hx, hy + r * .62, r * .14, r * .07, 0, 0, 7); ctx.fill();
    if (look.extra.key === 'mark') { ctx.fillStyle = '#2a1a14'; ctx.beginPath(); ctx.arc(hx + r * .38, hy + r * .5, Math.max(1.6, r * .06), 0, 7); ctx.fill(); }
    if (look.extra.key === 'pearls') { ctx.fillStyle = '#fbf8f0'; ctx.strokeStyle = 'rgba(120,110,90,.6)'; ctx.lineWidth = .8; for (let i = 0; i <= 10; i++) { const k = i / 10, x = hx + lerp(-r * .8, r * .8, k), y = hy + r * 1.45 + Math.sin(k * Math.PI) * r * .45; ctx.beginPath(); ctx.arc(x, y, r * .1, 0, 7); ctx.fill(); ctx.stroke(); } }
  }
  // the fan, fluttering in front of the face
  if (o.fan > 0) {
    const fx = hx + r * .2, fy = hy + r * 1.3, fr = r * 1.5, flap = reduceMotion ? 0 : Math.sin(t * 22) * .12;
    ctx.save(); ctx.translate(fx, fy); ctx.rotate(flap);
    for (let i = 0; i < 9; i++) { const a0 = Math.PI * (1.05 + i * .1), a1 = a0 + Math.PI * .1; ctx.fillStyle = i % 2 ? shade(col, 1.1) : '#fff6fa'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, fr, a0, a1); ctx.closePath(); ctx.fill(); }
    ctx.strokeStyle = shade(col, .6); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, fr, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
  return { x: sx, y: footY - h * squash - (o.wigOff > 0 ? 0 : r * 2.2) };
}

function drawNotebook() {
  const x = 14, y = 58, w = 300;
  ctx.font = '13px "IM Fell English", Georgia, serif';
  const rows = SPOTS.map((s, i) => found.includes(s.secret) ? wrap(s.secret, w - 40) : [s.boss ? '??? (Goldtooth himself)' : '???']);
  const h = 30 + rows.reduce((a, r) => a + r.length * 16 + 6, 0);
  ctx.fillStyle = 'rgba(243,230,204,.92)'; rr(x, y, w, h, 6); ctx.fill();
  ctx.fillStyle = '#3a2816'; ctx.font = '18px "Pirata One", Georgia, serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('Overheard', x + 12, y + 16);
  ctx.font = '13px "IM Fell English", Georgia, serif'; let ty = y + 36;
  rows.forEach((lines, i) => { ctx.fillStyle = '#9b7230'; ctx.fillText(`${i + 1}.`, x + 12, ty); ctx.fillStyle = found.includes(SPOTS[i].secret) ? '#3a2816' : 'rgba(58,40,22,.45)'; lines.forEach((l, j) => ctx.fillText(l, x + 28, ty + j * 16)); ty += lines.length * 16 + 6; });
}
function drawCheck() {
  if (!check) return;
  const c = CHECKS[check.type], label = `${c.verb}!  Press ${c.key.toUpperCase()}`, left = 1 - check.t / check.limit;
  ctx.font = '26px "Pirata One", Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const w = ctx.measureText(label).width + 48, x = VW / 2 - w / 2, y = 14;
  ctx.fillStyle = 'rgba(138,59,82,.94)'; rr(x, y, w, 44, 8); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.25)'; rr(x + 6, y + 36, (w - 12), 4, 2); ctx.fill();
  ctx.fillStyle = '#ffe08a'; rr(x + 6, y + 36, (w - 12) * left, 4, 2); ctx.fill();
  ctx.fillStyle = '#fff3c4'; ctx.fillText(label, VW / 2, y + 19);
}

function drawDressingRoom() {
  ctx.drawImage(bg, -(W - VW) * .02, BG_YOFF, W, BG_H);
  ctx.fillStyle = 'rgba(20,10,20,.35)'; ctx.fillRect(0, 0, VW, VH);
  // a tall gilded mirror behind the lady-to-be
  const mx = 255; ctx.fillStyle = '#c99a3c'; rr(mx - 150, 40, 300, 470, 140); ctx.fill(); ctx.fillStyle = 'rgba(200,225,240,.35)'; rr(mx - 134, 56, 268, 440, 128); ctx.fill();
  const o = { k: me, facing: 1, phase: 0, curtsy: 0, fan: 0, wigTilt: 0, wigOff: 0 };
  drawLady(o, mx, 505, 380 * P[me].size);
}

function render() {
  ctx.setTransform(K, 0, 0, K, 0, 0);
  ctx.imageSmoothingQuality = 'high';
  document.querySelector('.hud').hidden = mode === 'title';
  document.querySelector('.touch').hidden = mode !== 'play';
  if (mode === 'title' || !pl) { drawDressingRoom(); return; }
  ctx.drawImage(bg, -camX, BG_YOFF, W, BG_H);
  // candlelit warmth
  ctx.fillStyle = 'rgba(255,190,110,.08)'; ctx.fillRect(0, 0, VW, VH);
  const heads = [];
  Object.values(guests).forEach(g => heads.push([g, { x: g.x - camX, y: drawGuest(g) }]));
  const me_ = drawLady(pl, pl.x - camX, FLOOR_Y, ADULT * P[me].size, { moving: pl.moving }); heads.push([pl, me_]);
  // a fallen wig on the floor
  if (pl.wigOff > 0 && mode === 'play') {
    ctx.save(); ctx.translate(me_.x + 60, FLOOR_Y - 8);
    if (look.wig.img_) { const img = look.wig.img_, ih = 46, w = img.width * ih / img.height; ctx.rotate(-1.2); ctx.drawImage(img, -w / 2, -ih / 2, w, ih); }
    else { ctx.scale(1, .6); drawWig(look.wig.key, look.wig.col, 0, 0, 16, false); }
    ctx.restore();
  }
  sparks.forEach(s => { ctx.globalAlpha = 1 - s.life / s.max; ctx.fillStyle = s.col; ctx.beginPath(); ctx.arc(s.x - camX, s.y, 3, 0, 7); ctx.fill(); });
  ctx.globalAlpha = 1;

  // gossip: chatter bubbles and a listening ring
  spots.forEach(s => {
    const gx = s.x * W - camX, gk = s.guests[0][0], top = heads.find(h => h[0] === guests[gk])[1].y;
    if (gx < -200 || gx > VW + 200) return;
    const close = Math.abs(s.x * W - pl.x) < HEAR, locked = bossLocked(s);
    if (!s.done && !locked && talking(s) && !Object.values(guests).some(g => g.spot === s && g.sayT > 0)) {
      if (close && keys.listen) bubble(gx, top - 4, s.chatter[Math.floor(s.talk / 2.5) % s.chatter.length], P[gk].name);
      else { ctx.font = '700 22px "Alegreya Sans", sans-serif'; ctx.fillStyle = 'rgba(255,248,234,.9)'; ctx.textAlign = 'center'; ctx.fillText('…'.repeat(1 + Math.floor(t * 2) % 3), gx, top - 14); }
    }
    if (close && !s.done && mode === 'play') {
      const need = s.boss ? BOSS_SECS : LISTEN_SECS, prog = s.heard / need;
      const text = locked ? 'Goldtooth is guarded: overhear the others first' : talking(s) ? (keys.listen ? 'Listening…' : 'Hold E to listen') : 'They’ve paused. Wait…';
      ctx.font = '700 14px "Alegreya Sans", sans-serif'; const w = ctx.measureText(text).width + 50, x = clamp(me_.x - w / 2, 8, VW - w - 8);
      ctx.fillStyle = 'rgba(20,30,40,.85)'; rr(x, FLOOR_Y - 2, w, 24, 12); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x + 16, FLOOR_Y + 10, 7, 0, 7); ctx.stroke();
      ctx.strokeStyle = '#f2c14e'; ctx.beginPath(); ctx.arc(x + 16, FLOOR_Y + 10, 7, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x + w / 2 + 12, FLOOR_Y + 10);
    }
  });
  heads.forEach(([o, h]) => { if (o.sayT > 0) bubble(h.x, h.y - 4, o.say, o === pl ? P[me].lady : P[o.k].name); });
  drawNotebook();
  drawCheck();
}

// where the top of the head sits in a walk sheet's first frame (so the wig lands on it mid-stride)
function findHead(wk) {
  const c = document.createElement('canvas'); c.width = wk.fw; c.height = wk.fh;
  const g = c.getContext('2d'); g.drawImage(wk.walkImg || P[BOYS.find(k => P[k].walk === wk)].walkImg, 0, 0, wk.fw, wk.fh, 0, 0, wk.fw, wk.fh);
  const d = g.getImageData(0, 0, wk.fw, wk.fh).data; let top = -1, xs = 0, n = 0;
  for (let y = 0; y < wk.fh && (top < 0 || y < top + wk.fh * .06); y++) for (let x = 0; x < wk.fw; x++) if (d[(y * wk.fw + x) * 4 + 3] > 60) { if (top < 0) top = y; xs += x; n++; }
  wk.head = [n ? xs / n : wk.ax, Math.max(0, top)];
}

// ---- loop ----
let last = 0;
function frame(now) { const dt = Math.min(.05, (now - last) / 1000 || 0); last = now; update(dt); render(); requestAnimationFrame(frame); }
function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Could not load ' + src)); i.src = src; }); }

(async () => {
  resize();
  try { await Promise.race([document.fonts.load('18px "IM Fell English"'), document.fonts.load('18px "Pirata One"'), new Promise(r => setTimeout(r, 1500))]); } catch (e) {}
  [bg] = await Promise.all([loadImg('ship-dining.jpg'), ...Object.values(P).map(async p => {
    if (p.img) p.img_ = await loadImg(p.img); if (p.walk) p.walkImg = await loadImg(p.walk.img);
    if (p.gown) { p.gown.imgs = {}; await Promise.all(GOWNS.map(async g => { p.gown.imgs[g.key] = await loadImg(p.gown.img(g.key)); })); p.gown.walkImg = p.gown.imgs[GOWNS[0].key]; }
  }), ...WIGS.filter(w => w.img).map(async w => { w.img_ = await loadImg(w.img); })]);
  W = bg.width * BG_H / bg.height;
  BOYS.forEach(k => { findHead(P[k].walk); if (P[k].gown) findHead(P[k].gown); });
  buildMenus();
  requestAnimationFrame(now => { last = now; requestAnimationFrame(frame); });
})();
})();
