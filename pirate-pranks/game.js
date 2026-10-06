(() => {
'use strict';
// ---- stage constants (logical 960x540) ----
const VW = 960, VH = 540, BG_H = 600, BG_YOFF = -60;
const GY = 505;                 // where feet touch the deck
const BASE_H = 235;             // drawn height of a grown-up
const SNEAK = 150, VIEW = 380, PRANK_TIME = 2.2, MOPS = 3;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const P = {
  ruby:        { name: 'Captain Ruby', img: 'ruby.png', size: 1, face: [.42, .1, .14],
                 walk: { img: 'ruby-walk.png', frames: 8, fw: 250, fh: 420, ax: 106, cycle: 110 } },
  cutlass:     { name: 'Captain Cutlass', img: 'cutlass.png', size: 1.02, face: [.46, .085, .13],
                 walk: { img: 'cutlass-walk.png', frames: 8, fw: 238, fh: 420, ax: 120, cycle: 110 } },
  bones:       { name: 'Bones', img: 'bones.png', size: .84, face: [.5, .09, .14],
                 walk: { img: 'bones-walk.png', frames: 8, fw: 250, fh: 420, ax: 112, cycle: 125 } },
  absalom:     { name: 'Absalom', img: 'absalom.png', size: .94, face: [.5, .1, .14] },
  scarlett:    { name: 'Scarlett', img: 'scarlett.png', size: .96, face: [.48, .085, .14] },
  crispin:     { name: 'Crispin', img: 'crispin.png', size: 1, face: [.5, .075, .13] },
  jade:        { name: 'Jade', img: 'jade.png', size: 1, face: [.5, .075, .13],
                 walk: { img: 'jade-walk.png', frames: 8, fw: 246, fh: 420, ax: 129, cycle: 132 } },
  monsoon:     { name: 'Monsoon', img: 'monsoon.png', size: 1, face: [.5, .085, .13],
                 walk: { img: 'monsoon-walk.png', frames: 7, fw: 277, fh: 420, ax: 138, cycle: 138 } },
  stormcaller: { name: 'Stormcaller', img: 'stormcaller.png', size: 1, face: [.5, .075, .13],
                 walk: { img: 'stormcaller-walk.png', frames: 8, fw: 246, fh: 420, ax: 108, cycle: 133 } },
  marietta:    { name: 'Marietta', img: 'marietta.png', size: .97, face: [.5, .085, .14],
                 walk: { img: 'marietta-walk.png', frames: 8, fw: 254, fh: 420, ax: 120, cycle: 127 } },
};
const PRANKSTERS = ['jade', 'marietta', 'monsoon', 'stormcaller', 'bones'];

// Prank spots (fraction of the deck), in the order the captain walks into them in the finale.
const PRANKS = [
  { id: 'cosy', x: .06, label: 'Swap his bandana for a tea cosy' },
  { id: 'soap', x: .22, label: 'Soap the deck by the stairs' },
  { id: 'bucket', x: .40, label: 'Rig a bucket of seawater on the mast' },
  { id: 'confetti', x: .61, label: 'Stuff the cargo hatch with confetti' },
  { id: 'chicken', x: .82, label: 'Load a rubber chicken into the cannon' },
];
const BARRELS = [.14, .31, .5, .71, .93];
const PATROL = [.1, .9];

const LINES = {
  patrol: ['Shipshape. As always.', 'I am an excellent captain.', 'Nobody tells me anything.', 'Why is it so quiet?', 'I can smell mischief.'],
  paranoid: ['Is that… glitter?', 'Someone’s up to something.', 'I KNOW you’re out there.', 'Why does the deck smell like soap?'],
  glance: ['Hmm?', '…', 'Huh?'],
  sus: ['Who’s there?', 'I see you…', 'Show yourself!'],
  relax: ['Must’ve been the wind.', 'Probably a seagull.', 'I’m imagining things.'],
  caught: ['YOU. Mop. Now.', 'I KNEW it was you.', 'Explain. Quickly. Actually, don’t.', 'The deck needs scrubbing. All of it.'],
  done: ['Perfect.', 'He’ll never see it coming.', 'This is art.', 'Chef’s kiss.', 'Flawless.'],
  laugh: ['HAHAHA', 'I can’t breathe', 'Somebody get a painter', 'Best day ever', 'He’s gonna explode', 'LEGENDARY'],
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
const wait = ms => new Promise(r => setTimeout(r, ms));

// ---- state ----
let deck, W = 1800, camX = 0, t = 0, mode = 'title', me = 'jade';
let pl, cap, pranks, mops, caughtCount, startT, sparks = [], watchers = [];
const keys = { left: false, right: false, down: false, act: false };

function reset() {
  pl = { x: .97 * W, facing: -1, phase: 0, moving: false, hidden: false, pranking: null, say: '', sayT: 0, alpha: 1 };
  cap = { x: .45 * W, facing: -1, phase: 0, moving: false, mode: 'walk', target: .12 * W, timer: 0, sus: 0, say: '', sayT: 0, rot: 0, dy: 0, cosy: false, wet: 0, seenX: 0 };
  pranks = PRANKS.map(p => ({ ...p, done: false, prog: 0 }));
  mops = MOPS; caughtCount = 0; startT = performance.now(); sparks = [];
  const others = ['ruby', ...PRANKSTERS.filter(k => k !== me), 'absalom', 'scarlett', 'crispin'];
  watchers = others.map((k, i) => ({ k, x: (.05 + i * .118) * W, say: '', sayT: 0 }));
  hud();
}

// ---- sound ----
let ac = null, muted = false;
function audio() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } } if (ac && ac.state === 'suspended') ac.resume(); }
function tone(freqs, dur, type = 'triangle', vol = .05, gap = .06) {
  if (!ac || muted) return; const t0 = ac.currentTime;
  freqs.forEach((f, i) => { const o = ac.createOscillator(), g = ac.createGain(), s = t0 + i * gap; o.type = type; o.frequency.value = f; g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(vol, s + .01); g.gain.exponentialRampToValueAtTime(.0001, s + dur); o.connect(g).connect(ac.destination); o.start(s); o.stop(s + dur + .05); });
}
function noise(dur, freq, vol = .3) {
  if (!ac || muted) return; const n = ac.sampleRate * dur, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); f.type = 'lowpass'; f.frequency.value = freq; g.gain.value = vol;
  s.buffer = b; s.connect(f).connect(g).connect(ac.destination); s.start();
}
function slide() { if (!ac || muted) return; const o = ac.createOscillator(), g = ac.createGain(), s = ac.currentTime; o.type = 'sine'; o.frequency.setValueAtTime(900, s); o.frequency.exponentialRampToValueAtTime(180, s + .8); g.gain.setValueAtTime(.06, s); g.gain.exponentialRampToValueAtTime(.0001, s + .85); o.connect(g).connect(ac.destination); o.start(s); o.stop(s + .9); }
function bawk() { tone([880, 1320, 700], .12, 'square', .04, .09); }
$('mute').addEventListener('click', () => { muted = !muted; $('mute').textContent = muted ? 'Sound off' : 'Sound on'; $('mute').setAttribute('aria-pressed', muted); });

// ---- HUD ----
const mopSvg = on => `<svg viewBox="0 0 24 24" class="${on ? '' : 'gone'}" aria-hidden="true"><rect x="11" y="1" width="2.4" height="14" rx="1" fill="#7a5130"/><path d="M5 15h14l1.5 7H3.5z" fill="#d8cfb8"/><path d="M5 15h14l.5 2H4.5z" fill="#9b7230"/></svg>`;
function hud() {
  $('done').textContent = pranks ? pranks.filter(p => p.done).length : 0;
  $('total').textContent = PRANKS.length;
  $('lives').innerHTML = `<b>${mops ?? MOPS}</b>`;
  $('livesPill').setAttribute('aria-label', `${mops} of ${MOPS} chances left`);
}
let toastT = 0;
function toast(text, ms = 2600) { const el = $('toast'); el.textContent = text; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), ms); }
function say(o, text, s = 2) { o.say = text; o.sayT = s; }

// ---- input ----
const KEY = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ArrowDown: 'down', s: 'down', S: 'down', e: 'act', E: 'act', ' ': 'act' };
addEventListener('keydown', e => {
  const k = KEY[e.key]; if (!k) return;
  if (e.target.closest && e.target.closest('button') && mode !== 'play') return;
  e.preventDefault(); audio(); keys[k] = true;
});
addEventListener('keyup', e => { const k = KEY[e.key]; if (k) keys[k] = false; });
addEventListener('blur', () => Object.keys(keys).forEach(k => keys[k] = false));
function hold(id, k) {
  const el = $(id);
  el.addEventListener('pointerdown', e => { e.preventDefault(); audio(); el.setPointerCapture?.(e.pointerId); el.classList.add('held'); keys[k] = true; });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => el.addEventListener(ev, () => { el.classList.remove('held'); keys[k] = false; }));
}
hold('tLeft', 'left'); hold('tRight', 'right'); hold('tHide', 'down'); hold('tPrank', 'act');

// ---- flow ----
function faceStyle(key, size) {
  const p = P[key], img = p.img_, s = size / (p.face[2] * img.height);
  return `background-image:url('${p.img}');background-size:${img.width * s}px ${img.height * s}px;background-position:${-(p.face[0] * img.width * s - size / 2)}px ${-(p.face[1] * img.height * s - size / 2)}px`;
}
function buildPick() {
  PRANKSTERS.forEach(k => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'who';
    b.innerHTML = `<span class="face" style="${faceStyle(k, 64)}"></span><b>${P[k].name}</b>`;
    b.addEventListener('click', () => { audio(); me = k; start(); });
    $('pick').appendChild(b);
  });
}
function start() {
  reset(); mode = 'play';
  $('titleCard').hidden = true; $('endCard').hidden = true;
  toast(`Captain Cutlass is on patrol. Five pranks. Don’t get caught.`, 3200);
}
$('againBtn').addEventListener('click', () => { $('endCard').hidden = true; $('titleCard').hidden = false; mode = 'title'; });

const doneCount = () => pranks.filter(p => p.done).length;
const capSpeed = () => 68 + doneCount() * 13;

// ---- update ----
function update(dt) {
  t += dt;
  sparks.forEach(s => { s.life += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += (s.g ?? 500) * dt; s.vx *= .99; s.rot = (s.rot || 0) + dt * 6; });
  sparks = sparks.filter(s => s.life < s.max);
  [pl, cap, ...watchers].forEach(o => { if (o && o.sayT > 0) o.sayT -= dt; });
  if (cap) cap.wet = Math.max(0, cap.wet - dt * .05);
  if (mode !== 'play') { if (mode === 'finale' || mode === 'caught') follow(dt, mode === 'finale' ? cap.x : pl.x); return; }

  // player
  const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  const atBarrel = BARRELS.find(b => Math.abs(pl.x - b * W) < 46);
  const spot = pranks.find(p => !p.done && Math.abs(pl.x - p.x * W) < 60);
  pl.hidden = !!(keys.down && atBarrel != null && !dir);
  if (pl.hidden) pl.x = lerp(pl.x, atBarrel * W, Math.min(1, dt * 12));
  pl.pranking = (!pl.hidden && keys.act && spot && !dir) ? spot : null;
  pl.moving = !!dir && !pl.hidden;
  if (pl.moving) { pl.facing = dir; pl.x = clamp(pl.x + dir * SNEAK * dt, 40, W - 40); pl.phase += SNEAK * dt; }
  if (pl.pranking) {
    const s = pl.pranking; s.prog = Math.min(1, s.prog + dt / PRANK_TIME);
    if (Math.random() < dt * 3) tone([300 + Math.random() * 200], .05, 'square', .015);
    if (s.prog >= 1) prankDone(s);
  }
  pl.alpha = lerp(pl.alpha, pl.hidden ? .45 : 1, Math.min(1, dt * 10));

  updateCaptain(dt);
  follow(dt, pl.x);
}
function follow(dt, x) { camX += (clamp(x - VW / 2, 0, W - VW) - camX) * Math.min(1, dt * (reduceMotion ? 20 : 4)); }

function prankDone(s) {
  s.done = true; s.prog = 1; hud();
  tone([660, 880, 1175], .25, 'triangle', .05, .06);
  say(pl, pick(LINES.done), 1.6);
  for (let i = 0; i < 18; i++) { const a = Math.random() * 7, v = 60 + Math.random() * 120; sparks.push({ x: s.x * W, y: GY - 40, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, life: 0, max: .7, col: '#ffe08a', g: 200 }); }
  const n = doneCount();
  if (n === PRANKS.length) return finale();
  toast(n === 1 ? 'One down. He’s a little more on edge now.' : n === PRANKS.length - 1 ? 'One prank left. He’s VERY suspicious.' : `${n} pranks set. He’s getting twitchy.`);
}

function updateCaptain(dt) {
  const c = cap;
  c.timer -= dt;
  // what can he see?
  const d = Math.abs(pl.x - c.x), ahead = Math.sign(pl.x - c.x) === c.facing;
  const seen = !pl.hidden && ahead && d < VIEW && c.mode !== 'glanceWarn';
  if (seen) { c.sus += dt * (.6 + 1.0 * (1 - d / VIEW)) * (pl.pranking ? 1.4 : 1); c.seenX = pl.x; }
  else c.sus = Math.max(0, c.sus - dt * .3);
  if (c.sus >= 1) return caught();

  if (c.sus > .4 && c.mode !== 'sus') { c.mode = 'sus'; c.timer = 2.2; c.moving = false; c.facing = Math.sign(c.seenX - c.x) || c.facing; say(c, pick(LINES.sus), 1.6); tone([392, 466], .2, 'square', .03, .1); }
  switch (c.mode) {
    case 'walk': {
      const dx = c.target - c.x;
      if (Math.abs(dx) < 4) { c.mode = 'pause'; c.timer = .8 + Math.random() * 1.4; c.moving = false; if (Math.random() < .35) say(c, pick(doneCount() ? LINES.paranoid : LINES.patrol), 2.2); break; }
      c.facing = Math.sign(dx); c.moving = true;
      const step = Math.min(Math.abs(dx), capSpeed() * dt); c.x += c.facing * step; c.phase += step;
      if (Math.random() < dt * (.14 + doneCount() * .07)) { c.mode = 'glanceWarn'; c.timer = .55; c.moving = false; say(c, pick(LINES.glance), .8); }
      break;
    }
    case 'glanceWarn': if (c.timer <= 0) { c.facing *= -1; c.mode = 'glance'; c.timer = 1.1 + doneCount() * .15; } break;
    case 'glance': if (c.timer <= 0) { c.facing *= -1; c.mode = 'walk'; } break;
    case 'pause':
      if (c.timer <= 0) {
        c.target = lerp(PATROL[0], PATROL[1], Math.random()) * W;
        if (Math.abs(c.target - c.x) < 200) c.target = c.x > W / 2 ? PATROL[0] * W : PATROL[1] * W;
        c.mode = 'walk';
      }
      break;
    case 'sus':
      c.moving = false;
      if (c.sus < .15) { c.mode = 'walk'; say(c, pick(LINES.relax), 1.6); }
      else if (c.timer <= 0 && c.sus < .5) { c.mode = 'walk'; }
      break;
  }
}

async function caught() {
  mode = 'caught'; mops--; caughtCount++; hud();
  cap.moving = false; cap.facing = Math.sign(pl.x - cap.x) || 1; cap.sus = 0;
  say(cap, pick(LINES.caught), 2.2);
  tone([523, 392, 262], .35, 'sawtooth', .04, .12);
  if (pl.pranking) pl.pranking.prog = 0;
  await wait(1600);
  if (mops <= 0) return lose();
  toast(`Caught! That’s mop duty. ${mops} chance${mops === 1 ? '' : 's'} left.`, 2600);
  pl.x = .97 * W; pl.facing = -1; pl.hidden = false; pl.pranking = null;
  cap.mode = 'walk'; cap.target = PATROL[0] * W; cap.x = clamp(cap.x, PATROL[0] * W, .8 * W);
  mode = 'play';
}

function lose() {
  mode = 'end';
  $('endEyebrow').textContent = 'Busted';
  $('endTitle').textContent = 'Sentenced to scrub the whole ship';
  $('endText').textContent = `You got ${doneCount()} of ${PRANKS.length} pranks set before Captain Cutlass ran out of patience. Try a different route, and remember: he always says “Hmm?” before he turns round.`;
  $('endCard').hidden = false; $('againBtn').focus();
}

// ---- the finale: the captain walks into every prank ----
async function walkCap(x, speed = 110) {
  cap.facing = Math.sign(x - cap.x) || cap.facing; cap.moving = true;
  while (Math.abs(x - cap.x) > 3) { const step = Math.min(Math.abs(x - cap.x), speed / 60); cap.x += cap.facing * step; cap.phase += step; await wait(16); }
  cap.moving = false;
}
function crowd(n = 3) { for (let i = 0; i < n; i++) { const w = pick(watchers); say(w, pick(LINES.laugh), 1.8); } }
async function finale() {
  mode = 'finale'; cap.sus = 0; pl.hidden = true;
  toast('All five set. Now act natural…', 2200);
  await wait(1600);
  cap.x = .03 * W; cap.facing = 1; cap.moving = false;
  // 1. tea cosy
  cap.cosy = true; say(cap, 'Right. Morning inspection.', 2); await wait(1800);
  crowd(2); say(cap, 'Why is everyone staring?', 2); tone([523, 659], .2); await wait(1900);
  // 2. soap
  await walkCap(.21 * W);
  slide(); say(cap, 'WHOOOAAA—', 1.4);
  for (let i = 0; i < 50; i++) { cap.x += 6; cap.rot = Math.min(1.45, cap.rot + .04); await wait(16); }
  noise(.3, 400, .4); crowd(3); await wait(900);
  for (let i = 0; i < 20; i++) { cap.rot = Math.max(0, cap.rot - .075); await wait(16); }
  say(cap, 'I meant to do that.', 1.8); await wait(1200);
  // 3. bucket
  await walkCap(.40 * W);
  noise(.6, 1400, .35);
  for (let i = 0; i < 70; i++) sparks.push({ x: cap.x + (Math.random() - .5) * 60, y: GY - 300 - Math.random() * 60, vx: (Math.random() - .5) * 80, vy: 60 + Math.random() * 120, life: 0, max: 1.1, col: 'rgba(170,215,255,.9)', g: 900, drop: true });
  cap.wet = 1; await wait(700); say(cap, '……', 1.5); crowd(3); await wait(1700);
  // 4. confetti
  await walkCap(.60 * W);
  say(cap, 'What’s in the hatch?', 1.4); await wait(1100);
  noise(.4, 3000, .25); tone([784, 988, 1175, 1568], .4, 'triangle', .05, .05);
  for (let i = 0; i < 140; i++) { const a = -Math.PI / 2 + (Math.random() - .5) * 1.6, v = 250 + Math.random() * 380; sparks.push({ x: .61 * W, y: GY - 10, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: 2.4, col: pick(['#e85d75', '#f2c14e', '#5bc0eb', '#9bc53d', '#c879ff', '#fff']), g: 380, conf: true }); }
  await wait(900); say(cap, 'WHO. DID. THIS.', 2); crowd(3); await wait(2100);
  // 5. rubber chicken
  await walkCap(.78 * W);
  cap.facing = 1; say(cap, 'Fine. A warning shot. That’ll scare them.', 2.2); await wait(2200);
  noise(.5, 600, .6); bawk();
  sparks.push({ x: .84 * W, y: GY - 80, vx: 520, vy: -620, life: 0, max: 2.6, g: 520, chicken: true });
  for (let i = 0; i < 20; i++) { const a = Math.random() * 7; sparks.push({ x: .86 * W, y: GY - 80, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90, life: 0, max: .8, col: 'rgba(230,230,230,.8)', g: -40, smoke: true }); }
  await wait(900); bawk(); await wait(700);
  say(cap, '…was that a chicken?', 2.2); crowd(4); await wait(2600);
  win();
}
function win() {
  mode = 'end';
  const secs = Math.round((performance.now() - startT) / 1000);
  $('endEyebrow').textContent = 'Prank complete';
  $('endTitle').textContent = caughtCount === 0 ? 'Legendary Prankster' : caughtCount === 1 ? 'Master of Mischief' : 'Professional Menace';
  $('endText').textContent = `Five pranks in ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}, caught ${caughtCount} time${caughtCount === 1 ? '' : 's'}. Captain Cutlass is still picking confetti out of his tea cosy. ${caughtCount === 0 ? 'He has no idea it was you.' : 'He definitely knows it was you.'}`;
  $('endCard').hidden = false; $('againBtn').focus();
}

// ---- drawing ----
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function bubble(x, y, text, small) {
  ctx.font = (small ? '15px' : '18px') + ' "IM Fell English", Georgia, serif';
  const w = ctx.measureText(text).width + 26, h = small ? 26 : 32, bx = clamp(x - w / 2, 8, VW - w - 8), by = Math.max(46, y - h - 14), tip = clamp(x, bx + 14, bx + w - 14);
  ctx.fillStyle = 'rgba(0,0,0,.2)'; rr(bx + 2, by + 3, w, h, 12); ctx.fill();
  ctx.fillStyle = '#fff8ea'; rr(bx, by, w, h, 12); ctx.fill();
  ctx.beginPath(); ctx.moveTo(tip - 7, by + h - 1); ctx.lineTo(tip, by + h + 9); ctx.lineTo(tip + 7, by + h - 1); ctx.fill();
  ctx.fillStyle = '#3a2816'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, bx + w / 2, by + h / 2 + 1);
}
// draws a character; returns screen x of head and head y
function drawChar(k, x, facing, moving, phase, o = {}) {
  const p = P[k], h = BASE_H * p.size * (o.scale || 1), sx = x - camX, y = GY + (o.dy || 0);
  if (sx < -200 || sx > VW + 200) return { x: sx, y: y - h };
  ctx.save(); ctx.globalAlpha = o.alpha ?? 1;
  ctx.fillStyle = 'rgba(40,25,10,.26)'; ctx.beginPath(); ctx.ellipse(sx, y, h * .2, 7, 0, 0, 7); ctx.fill();
  ctx.translate(sx, y); if (o.rot) ctx.rotate(-o.rot * facing);
  if (p.walk && moving) {
    const wk = p.walk, wh = h * wk.fh / (wk.fh - 4), ww = wk.fw * wh / wk.fh;
    const fr = Math.floor(phase / (wk.cycle * (h / BASE_H) / wk.frames)) % wk.frames;
    if (facing < 0) ctx.scale(-1, 1);
    ctx.drawImage(p.walkImg, fr * wk.fw, 0, wk.fw, wk.fh, -wk.ax * wh / wk.fh, -wh + 4 * wh / wk.fh, ww, wh);
  } else {
    const img = p.img_, w = img.width * h / img.height, bob = reduceMotion ? 0 : Math.sin(t * 2 + x) * 1.2;
    ctx.drawImage(img, -w / 2, -h + bob, w, h);
  }
  ctx.restore();
  return { x: sx, y: y - h };
}
function drawBarrel(x) {
  const sx = x - camX; if (sx < -80 || sx > VW + 80) return;
  const y = GY + 4, w = 74, h = 104;
  ctx.fillStyle = 'rgba(40,25,10,.3)'; ctx.beginPath(); ctx.ellipse(sx, y, w * .55, 8, 0, 0, 7); ctx.fill();
  const g = ctx.createLinearGradient(sx - w / 2, 0, sx + w / 2, 0); g.addColorStop(0, '#6b4226'); g.addColorStop(.4, '#a2703f'); g.addColorStop(1, '#5a3620');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(sx - w * .42, y); ctx.quadraticCurveTo(sx - w * .56, y - h / 2, sx - w * .42, y - h); ctx.lineTo(sx + w * .42, y - h); ctx.quadraticCurveTo(sx + w * .56, y - h / 2, sx + w * .42, y); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(40,20,8,.35)'; ctx.lineWidth = 1.2;
  for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(sx + i * w * .17, y); ctx.quadraticCurveTo(sx + i * w * .21, y - h / 2, sx + i * w * .17, y - h); ctx.stroke(); }
  ctx.strokeStyle = '#3d3a37'; ctx.lineWidth = 4;
  [.18, .82].forEach(f => { ctx.beginPath(); ctx.moveTo(sx - w * .49, y - h * f); ctx.lineTo(sx + w * .49, y - h * f); ctx.stroke(); });
  ctx.fillStyle = '#4a2c18'; ctx.beginPath(); ctx.ellipse(sx, y - h, w * .42, 7, 0, 0, 7); ctx.fill();
}
function drawCosy(x, y) {
  ctx.save(); ctx.translate(x, y + 6);
  ctx.fillStyle = '#e57aa0'; ctx.beginPath(); ctx.ellipse(0, 0, 30, 26, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2;
  for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 10, 0); ctx.quadraticCurveTo(i * 9, -14, i * 5, -24); ctx.stroke(); }
  ctx.fillStyle = '#f6d55c'; ctx.fillRect(-31, -4, 62, 6);
  ctx.fillStyle = '#fff3c4'; ctx.beginPath(); ctx.arc(0, -27, 7, 0, 7); ctx.fill();
  ctx.restore();
}
function drawChicken(x, y, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.fillStyle = '#fff6e0'; ctx.beginPath(); ctx.ellipse(0, 0, 22, 12, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(18, -10, 9, 0, 7); ctx.fill();
  ctx.fillStyle = '#e63946'; ctx.beginPath(); ctx.arc(17, -20, 4, 0, 7); ctx.arc(22, -18, 3.5, 0, 7); ctx.fill();
  ctx.fillStyle = '#f4a261'; ctx.beginPath(); ctx.moveTo(26, -11); ctx.lineTo(34, -8); ctx.lineTo(26, -6); ctx.fill();
  ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(21, -12, 1.6, 0, 7); ctx.fill();
  ctx.restore();
}
function spotIcon(id, x, y) {
  ctx.save(); ctx.translate(x, y);
  if (id === 'cosy') drawCosy(0, 8);
  else if (id === 'soap') { ctx.fillStyle = '#bfe3ff'; rr(-16, -9, 32, 18, 6); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.8)'; [[-20, -14, 6], [18, -16, 5], [4, -20, 4]].forEach(([a, b, r]) => { ctx.beginPath(); ctx.arc(a, b, r, 0, 7); ctx.fill(); }); }
  else if (id === 'bucket') { ctx.fillStyle = '#8a8f96'; ctx.beginPath(); ctx.moveTo(-14, -14); ctx.lineTo(14, -14); ctx.lineTo(10, 12); ctx.lineTo(-10, 12); ctx.fill(); ctx.fillStyle = '#5bc0eb'; ctx.fillRect(-13, -14, 26, 5); }
  else if (id === 'confetti') { for (let i = 0; i < 9; i++) { ctx.fillStyle = ['#e85d75', '#f2c14e', '#5bc0eb', '#9bc53d', '#c879ff'][i % 5]; ctx.fillRect(Math.cos(i * 2.1) * 14 - 3, Math.sin(i * 2.1) * 12 - 2, 6, 4); } }
  else if (id === 'chicken') drawChicken(-6, 4, -.3);
  ctx.restore();
}

function render() {
  ctx.setTransform(K, 0, 0, K, 0, 0);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(deck, -camX, BG_YOFF, W, BG_H);
  if (!pl) return;

  // the crew, watching from the rail (they know what's going on)
  watchers.forEach(w => { const p = P[w.k], h = BASE_H * p.size * .6, img = p.img_, iw = img.width * h / img.height, sx = w.x - camX; if (sx < -60 || sx > VW + 60) return;
    const hop = w.sayT > 0 ? Math.abs(Math.sin(t * 12)) * 6 : 0; ctx.drawImage(img, sx - iw / 2, 432 - h - hop, iw, h); w.head = { x: sx, y: 432 - h - hop }; });

  // prank spots
  pranks.forEach(s => {
    const sx = s.x * W - camX; if (sx < -60 || sx > VW + 60) return;
    if (s.done) { ctx.fillStyle = 'rgba(155,197,61,.85)'; ctx.beginPath(); ctx.arc(sx, GY - 12, 11, 0, 7); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx - 5, GY - 12); ctx.lineTo(sx - 1, GY - 7); ctx.lineTo(sx + 6, GY - 17); ctx.stroke(); return; }
    const pulse = .5 + .5 * Math.sin(t * 4);
    ctx.strokeStyle = `rgba(255,224,138,${.5 + pulse * .4})`; ctx.setLineDash([6, 6]); ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(sx, GY - 2, 46, 11, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    spotIcon(s.id, sx, GY - 150 - pulse * 4);
    if (s.prog > 0) { ctx.strokeStyle = '#ffe08a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(sx, GY - 150, 30, -Math.PI / 2, -Math.PI / 2 + s.prog * Math.PI * 2); ctx.stroke(); }
  });

  // what the captain can see
  if (mode === 'play') {
    const cx = cap.x - camX, eyeY = GY - BASE_H * .85, f = cap.facing, red = clamp(cap.sus, 0, 1);
    if (cap.mode !== 'glanceWarn') {
      const g = ctx.createLinearGradient(cx, 0, cx + f * VIEW, 0);
      g.addColorStop(0, `rgba(255,${Math.round(230 - red * 180)},${Math.round(150 - red * 120)},${.28 + red * .2})`); g.addColorStop(1, 'rgba(255,230,150,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx + f * 10, eyeY); ctx.lineTo(cx + f * VIEW, GY - 250); ctx.lineTo(cx + f * VIEW, GY + 14); ctx.lineTo(cx + f * 10, GY + 4); ctx.closePath(); ctx.fill();
    }
  }

  // people, then the barrels in front of anyone hiding
  const c = drawChar('cutlass', cap.x, cap.facing, cap.moving, cap.phase, { rot: cap.rot });
  if (cap.cosy) drawCosy(c.x + (cap.moving ? cap.facing * 6 : -4), c.y + 18 + cap.rot * 40);
  if (cap.wet > .05) { for (let i = 0; i < 4; i++) { const dy = ((t * 120 + i * 60) % 200); ctx.fillStyle = `rgba(170,215,255,${cap.wet})`; ctx.beginPath(); ctx.ellipse(c.x - 30 + i * 20, c.y + 40 + dy, 3, 6, 0, 0, 7); ctx.fill(); } }
  const me_ = drawChar(me, pl.x, pl.facing, pl.moving, pl.phase, { alpha: pl.alpha, scale: pl.hidden ? .82 : 1, dy: pl.hidden ? 14 : 0 });
  BARRELS.forEach(b => drawBarrel(b * W));

  // particles
  sparks.forEach(s => {
    const sx = s.x - camX, a = 1 - s.life / s.max;
    if (s.chicken) { drawChicken(sx, s.y, s.life * 9); return; }
    ctx.globalAlpha = s.conf ? Math.min(1, a * 2) : a; ctx.fillStyle = s.col;
    if (s.conf) { ctx.save(); ctx.translate(sx, s.y); ctx.rotate(s.rot); ctx.fillRect(-4, -2.5, 8, 5); ctx.restore(); }
    else if (s.drop) { ctx.beginPath(); ctx.ellipse(sx, s.y, 3, 7, 0, 0, 7); ctx.fill(); }
    else if (s.smoke) { ctx.beginPath(); ctx.arc(sx, s.y, 8 + s.life * 30, 0, 7); ctx.fill(); }
    else { ctx.beginPath(); ctx.arc(sx, s.y, 2.5, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
  });

  // suspicion over the captain's head
  if (mode === 'play' && cap.sus > .02) {
    const s = cap.sus, x = c.x, y = c.y - 34;
    ctx.font = `${Math.round(30 + s * 22)}px "Pirata One", Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(40,20,10,.8)'; ctx.fillStyle = s > .7 ? '#ff5a4f' : '#ffd166';
    const m = s > .7 ? '!' : '?'; ctx.strokeText(m, x, y); ctx.fillText(m, x, y);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; rr(x - 32, y + 22, 64, 7, 3); ctx.fill(); ctx.fillStyle = s > .7 ? '#ff5a4f' : '#ffd166'; rr(x - 32, y + 22, 64 * s, 7, 3); ctx.fill();
  }

  // the captain is off-screen: show which way
  if (mode === 'play' && (c.x < 0 || c.x > VW)) {
    const left = c.x < 0, ex = left ? 26 : VW - 26, ey = 300;
    ctx.fillStyle = 'rgba(243,230,204,.92)'; rr(ex - (left ? 8 : 92), ey - 22, 100, 44, 8); ctx.fill();
    ctx.fillStyle = '#3a2816'; ctx.font = '700 12px "Alegreya Sans", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText((left ? '◀ ' : '') + 'CAPTAIN' + (left ? '' : ' ▶'), ex + (left ? 42 : -42), ey - 6);
    ctx.fillText(cap.facing === (left ? 1 : -1) ? 'looking this way' : 'looking away', ex + (left ? 42 : -42), ey + 10);
  }

  // speech
  if (cap.sayT > 0) bubble(c.x, c.y - (mode === 'play' && cap.sus > .02 ? 70 : 6), cap.say);
  if (pl.sayT > 0) bubble(me_.x, me_.y - 6, pl.say);
  watchers.forEach(w => { if (w.sayT > 0 && w.head) bubble(w.head.x, w.head.y, w.say, true); });

  // hints near the player
  if (mode === 'play') {
    const near = pranks.find(s => !s.done && Math.abs(pl.x - s.x * W) < 60), barrel = BARRELS.some(b => Math.abs(pl.x - b * W) < 46);
    const hint = pl.hidden ? 'Hidden' : near ? `${near.label}: hold E` : barrel ? 'Hold ↓ to hide in the barrel' : '';
    if (hint) { ctx.font = '700 14px "Alegreya Sans", sans-serif'; const w = ctx.measureText(hint).width + 22, x = clamp(me_.x - w / 2, 8, VW - w - 8);
      ctx.fillStyle = pl.hidden ? 'rgba(40,70,40,.85)' : 'rgba(20,30,40,.82)'; rr(x, GY + 10, w, 24, 12); ctx.fill(); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(hint, x + w / 2, GY + 22); }
  }
}

// ---- loop ----
let last = 0;
function frame(now) { const dt = Math.min(.05, (now - last) / 1000 || 0); last = now; update(dt); render(); requestAnimationFrame(frame); }
function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Could not load ' + src)); i.src = src; }); }

(async () => {
  resize();
  try { await Promise.race([document.fonts.load('18px "IM Fell English"'), document.fonts.load('30px "Pirata One"'), new Promise(r => setTimeout(r, 1500))]); } catch (e) {}
  [deck] = await Promise.all([loadImg('ship-deck.jpg'), ...Object.values(P).map(async p => { p.img_ = await loadImg(p.img); if (p.walk) p.walkImg = await loadImg(p.walk.img); })]);
  W = deck.width * BG_H / deck.height;
  buildPick(); hud();
  requestAnimationFrame(now => { last = now; requestAnimationFrame(frame); });
})();
})();
