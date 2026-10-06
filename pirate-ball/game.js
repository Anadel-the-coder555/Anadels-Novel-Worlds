(() => {
'use strict';
// ---- stage constants (logical 960x540) ----
const VW = 960, VH = 540, BG_H = 600, BG_YOFF = -60;
const FRONT_Y = 522, BACK_Y = 458;     // feet lines: front of the floor (you, Ruby, props) and the dance floor behind
const ADULT = 290, BACK_SCALE = .82;
const WALK = 175, BALL_SECS = 150, WATCH = 300, REACH = 72;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// people. walk sheets are side views facing right; cycle = px of travel per loop of the sheet at full size.
const P = {
  ruby:        { name: 'Captain Ruby', img: 'ruby.png', size: 1, face: [.42, .1, .14], walk: { img: 'ruby-walk.png', frames: 8, fw: 250, fh: 420, ax: 106, cycle: 130 } },
  cutlass:     { name: 'Captain Cutlass', img: 'cutlass.png', size: 1.02 },
  bones:       { name: 'Bones', img: 'bones.png', size: .84, face: [.5, .09, .14], walk: { img: 'bones-walk.png', frames: 8, fw: 250, fh: 420, ax: 112, cycle: 148 } },
  jade:        { name: 'Jade', img: 'jade.png', size: 1, face: [.5, .075, .13], walk: { img: 'jade-walk.png', frames: 8, fw: 246, fh: 420, ax: 129, cycle: 156 } },
  monsoon:     { name: 'Monsoon', img: 'monsoon.png', size: 1, face: [.5, .085, .13], walk: { img: 'monsoon-walk.png', frames: 7, fw: 277, fh: 420, ax: 138, cycle: 163 } },
  stormcaller: { name: 'Stormcaller', img: 'stormcaller.png', size: 1, face: [.5, .075, .13], walk: { img: 'stormcaller-walk.png', frames: 8, fw: 246, fh: 420, ax: 108, cycle: 157 } },
  marietta:    { name: 'Marietta', img: 'marietta.png', size: .97, face: [.5, .085, .14], walk: { img: 'marietta-walk.png', frames: 8, fw: 254, fh: 420, ax: 120, cycle: 150 } },
  // the royal guests (walk sheets only)
  blue:   { name: 'Icy-Blue Prince', size: 1, walk: { img: 'blue-prince.png', frames: 8, fw: 253, fh: 420, ax: 123, cycle: 231 } },
  ivory:  { name: 'Ivory & Gold Prince', size: 1.01, walk: { img: 'ivory-prince.png', frames: 8, fw: 231, fh: 420, ax: 113, cycle: 204 } },
  ember:  { name: 'Ember', size: .93, walk: { img: 'ember.png', frames: 4, fw: 291, fh: 357, ax: 155, cycle: 133 } },
  lila:   { name: 'Lila-Bella', size: .77, walk: { img: 'lila-bella.png', frames: 4, fw: 282, fh: 356, ax: 152, cycle: 110 } },
};
const CREW = ['jade', 'marietta', 'monsoon', 'stormcaller', 'bones'];

// where things are (fraction of the salon's width)
const AT = { bucket: .045, punch: .22, chandelier: .45, cake: .64, gramophone: .76, basket: .91, door: .1 };
const TASKS = [
  { id: 'punch', label: 'Spike the punch with seawater' },
  { id: 'record', label: 'Swap the waltz for a sea shanty' },
  { id: 'chin', label: 'Let the chinchilla loose' },
  { id: 'laces', label: 'Untie a prince’s laces mid-dance' },
  { id: 'crab', label: 'Hide a crab in the cake' },
  { id: 'swing', label: 'Swing from the chandelier' },
];

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
let bg, chinImg, W = 1800, camX = 0, t = 0, mode = 'title', me = 'jade', clock = BALL_SECS;
let pl, ruby, cutlass, dancers, pairs, chin, crab, done, music = 'waltz', sparks = [], runId = 0;
const keys = { left: false, right: false };

function reset() {
  pl = { k: me, x: AT.door * W, facing: 1, moving: false, phase: 0, carry: null, swing: null, say: '', sayT: 0 };
  ruby = { k: 'ruby', x: .5 * W, facing: -1, moving: false, phase: 0, mode: 'walk', target: .3 * W, timer: 0, busy: false, say: '', sayT: 0, hop: 0 };
  cutlass = { k: 'cutlass', x: .27 * W, facing: -1, say: '', sayT: 0, hop: 0 };
  pairs = [{ cx: .38 * W, ph: 0, a: 'blue', b: 'ember' }, { cx: .55 * W, ph: 2.1, a: 'ivory', b: 'lila' }];
  dancers = {};
  pairs.forEach(p => { [p.a, p.b].forEach((k, i) => { dancers[k] = { k, x: p.cx + (i ? 46 : -46), facing: i ? -1 : 1, phase: Math.random() * 100, flop: 0, hop: 0, chasing: false, pair: p, side: i ? 1 : -1, say: '', sayT: 0 }; }); });
  chin = { active: false, x: AT.basket * W, dir: -1, t: 0 };
  crab = { state: 'bucket', x: AT.bucket * W, y: 0, vy: 0 };
  done = {}; music = 'waltz'; clock = BALL_SECS; sparks = []; camX = 0;
  hud();
}

// ---- sound: a little palm-court band that can be bullied into playing a shanty ----
let ac = null, muted = false, master = null, nextBeat = 0, beatN = 0;
function audio() {
  if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = .8; master.connect(ac.destination); } catch (e) { ac = null; } }
  if (ac && ac.state === 'suspended') ac.resume();
}
const hz = m => 440 * Math.pow(2, (m - 69) / 12);
function note(m, when, dur, vol = .05, type = 'triangle', cut = 2600) {
  if (!ac || muted) return; const o = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cut;
  o.type = type; o.frequency.value = hz(m); g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(vol, when + .015); g.gain.exponentialRampToValueAtTime(.0001, when + dur);
  o.connect(f).connect(g).connect(master); o.start(when); o.stop(when + dur + .05);
}
function sfx(freqs, dur, type = 'triangle', vol = .05, gap = .06) { if (!ac || muted) return; const t0 = ac.currentTime; freqs.forEach((f, i) => note(f, t0 + i * gap, dur, vol, type, 4000)); }
function noise(dur, freq, vol = .3) {
  if (!ac || muted) return; const n = ac.sampleRate * dur, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); f.type = 'lowpass'; f.frequency.value = freq; g.gain.value = vol;
  s.buffer = b; s.connect(f).connect(g).connect(master); s.start();
}
$('mute').addEventListener('click', () => { muted = !muted; $('mute').textContent = muted ? 'Sound off' : 'Sound on'; $('mute').setAttribute('aria-pressed', muted); });
// the waltz: 3/4, D major, oom-pah-pah with a lilting tune on top
const WALTZ = { spb: .42, bars: [['D', [74, null, 78]], ['D', [81, null, 78]], ['A', [76, null, 73]], ['A', [69, null, 73]], ['A', [76, 78, 79]], ['A', [81, null, 79]], ['D', [78, null, 74]], ['D', [74, null, null]]] };
const ROOT = { D: 50, A: 45, G: 43, C: 48 };
const TRIAD = { D: [62, 66, 69], A: [61, 64, 69], C: [60, 64, 67] };
// the shanty: "Drunken Sailor" (traditional), 2/4, one tune note per eighth
const SHANTY = { spb: .23, notes: [69, 69, 69, 69, 69, 69, 69, 0, 62, 0, 65, 0, 69, 0, 0, 0, 67, 67, 67, 67, 67, 67, 67, 0, 60, 0, 64, 0, 67, 0, 0, 0, 69, 69, 69, 69, 69, 69, 69, 0, 62, 0, 65, 0, 69, 0, 0, 0, 69, 0, 67, 0, 64, 0, 62, 0, 62, 0, 0, 0, 0, 0, 0, 0] };
function scheduleMusic() {
  if (!ac || mode === 'title') return;
  const horizon = ac.currentTime + .2;
  if (nextBeat < ac.currentTime) nextBeat = ac.currentTime + .05;
  while (nextBeat < horizon) {
    if (music === 'waltz') {
      const bar = WALTZ.bars[Math.floor(beatN / 3) % WALTZ.bars.length], b = beatN % 3, ch = bar[0];
      if (b === 0) note(ROOT[ch], nextBeat, WALTZ.spb * 1.2, .09, 'triangle', 800); else TRIAD[ch].forEach(m => note(m, nextBeat, WALTZ.spb * .5, .018, 'sine', 3000));
      if (bar[1][b]) note(bar[1][b], nextBeat, WALTZ.spb * (bar[1][b + 1] === null ? 1.8 : .9), .045, 'triangle', 3200);
      nextBeat += WALTZ.spb;
    } else {
      const i = beatN % SHANTY.notes.length, m = SHANTY.notes[i], line = Math.floor(i / 16), ch = line === 1 ? 'C' : 'D';
      if (i % 4 === 0) note(ROOT[ch], nextBeat, SHANTY.spb * 1.6, .1, 'triangle', 800);
      if (i % 4 === 2) TRIAD[ch].forEach(x => note(x, nextBeat, SHANTY.spb * .6, .02, 'square', 1800));
      if (m) note(m, nextBeat, SHANTY.spb * .9, .05, 'sawtooth', 2200);
      nextBeat += SHANTY.spb;
    }
    beatN++;
  }
}

// ---- HUD ----
function hud() {
  $('chaos').textContent = done ? Object.keys(done).length : 0; $('total').textContent = TASKS.length;
  const s = Math.max(0, Math.ceil(clock)); $('clock').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
let toastT = 0;
function toast(text, ms = 2600) { const el = $('toast'); el.textContent = text; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), ms); }
function say(o, text, s = 2) { o.say = text; o.sayT = s; }

// ---- input ----
const KEY = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' };
addEventListener('keydown', e => {
  if (KEY[e.key]) { if (mode === 'play') e.preventDefault(); keys[KEY[e.key]] = true; return; }
  if ((e.key === 'e' || e.key === 'E' || e.key === ' ' || e.key === 'Enter') && mode === 'play' && !(e.target.closest && e.target.closest('button'))) { e.preventDefault(); act(); }
});
addEventListener('keyup', e => { if (KEY[e.key]) keys[KEY[e.key]] = false; });
addEventListener('blur', () => { keys.left = keys.right = false; });
function hold(id, k) {
  const el = $(id);
  el.addEventListener('pointerdown', e => { e.preventDefault(); audio(); el.setPointerCapture?.(e.pointerId); el.classList.add('held'); keys[k] = true; });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => el.addEventListener(ev, () => { el.classList.remove('held'); keys[k] = false; }));
}
hold('tLeft', 'left'); hold('tRight', 'right');
$('tAct').addEventListener('click', () => { audio(); if (mode === 'play') act(); });

// ---- flow ----
function faceStyle(key, size) {
  const p = P[key], img = p.img_, s = size / (p.face[2] * img.height);
  return `background-image:url('${p.img}');background-size:${img.width * s}px ${img.height * s}px;background-position:${-(p.face[0] * img.width * s - size / 2)}px ${-(p.face[1] * img.height * s - size / 2)}px`;
}
function buildPick() {
  CREW.forEach(k => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'who';
    b.innerHTML = `<span class="face" style="${faceStyle(k, 64)}"></span><b>${P[k].name}</b>`;
    b.addEventListener('click', () => { audio(); me = k; start(); });
    $('pick').appendChild(b);
  });
}
function start() {
  runId++; reset(); mode = 'play'; beatN = 0; nextBeat = 0;
  $('titleCard').hidden = true; $('endCard').hidden = true;
  toast('The ball has begun. Your to-do list is in the corner. Mind Captain Ruby.', 3200);
}
$('againBtn').addEventListener('click', () => { $('endCard').hidden = true; $('titleCard').hidden = false; mode = 'title'; });

// ---- what's within reach, and is Ruby looking? ----
const rubyWatching = () => !ruby.busy && Math.abs(pl.x - ruby.x) < WATCH && Math.sign(pl.x - ruby.x) === ruby.facing;
function reachable() {
  if (pl.swing) return null;
  const near = f => Math.abs(pl.x - f * W) < REACH;
  if (!done.crab && crab.state === 'bucket' && !pl.carry && near(AT.bucket)) return { id: 'grabCrab', hint: 'Grab a crab from the bait bucket' };
  if (!done.crab && pl.carry === 'crab' && near(AT.cake)) return { id: 'crab', hint: 'Hide the crab in the cake' };
  if (!done.punch && near(AT.punch)) return { id: 'punch', hint: 'Pour seawater in the punch' };
  if (!done.record && near(AT.gramophone)) return { id: 'record', hint: 'Swap the record for a sea shanty' };
  if (!done.chin && near(AT.basket)) return { id: 'chin', hint: 'Open the chinchilla’s basket' };
  if (!done.swing && near(AT.chandelier)) return { id: 'swing', hint: 'Grab the chandelier rope' };
  if (!done.laces) { const p = ['blue', 'ivory'].map(k => dancers[k]).find(d => d.flop <= 0 && Math.abs(d.x - pl.x) < 58); if (p) return { id: 'laces', hint: `Untie the ${P[p.k].name}’s laces`, who: p }; }
  return null;
}

function act() {
  const r = reachable(); if (!r) return;
  if (rubyWatching()) return caught();
  const run = runId;
  switch (r.id) {
    case 'grabCrab': pl.carry = 'crab'; crab.state = 'carried'; say(pl, 'Hello, little guy.', 1.4); sfx([1200, 1500], .08, 'square', .02); toast('Got a crab. Now take it to the cake.'); break;
    case 'crab': pl.carry = null; crab.state = 'cake'; complete('crab'); crabFinale(run); break;
    case 'punch': complete('punch'); punchFinale(run); break;
    case 'record': complete('record'); music = 'shanty'; beatN = 0; sfx([300, 200], .2, 'sawtooth', .05, .1); say(ruby, 'That is NOT the waltz.', 2.4); setTimeout(() => { if (run === runId) say(dancers.ember, 'Oh, I LOVE this one!', 2.2); }, 1300); break;
    case 'chin': complete('chin'); chin.active = true; chin.t = 0; dancers.lila.chasing = true; say(dancers.lila, 'SQUEAK! Come BACK!', 2); sfx([1800, 2200, 1900], .08, 'square', .02, .07); setTimeout(() => { if (run === runId) say(dancers.ivory, '…How many chinchillas do you HAVE?', 2.4); }, 1500); break;
    case 'laces': complete('laces'); { const d = r.who, partner = dancers[d.pair.a === d.k ? d.pair.b : d.pair.a]; d.flop = 1.6; say(d, 'WHOA—', 1); noise(.25, 500, .35);
      setTimeout(() => { if (run === runId) say(partner, 'Are you alright?!', 1.8); }, 700); setTimeout(() => { if (run === runId) say(d, 'Who tied my laces together?!', 2.2); }, 1900); } break;
    case 'swing': complete('swing'); pl.swing = { t: 0, from: pl.x, to: AT.cake * W - 90 }; say(pl, 'WAHOOOO!', 1.4); noise(.4, 1800, .15); setTimeout(() => { if (run === runId) { say(dancers.blue, 'Was that… allowed?', 1.8); say(cutlass, 'Show-off.', 1.8); } }, 1200); break;
  }
}

function complete(id) {
  done[id] = true; hud();
  sfx([660, 880, 1175], .25, 'triangle', .05, .06);
  const n = Object.keys(done).length;
  if (n === TASKS.length) setTimeout(() => finish(), 7000);   // let the last gag play out first
}

async function punchFinale(run) {
  await wait(1200); if (run !== runId) return;
  say(cutlass, 'Ooh, punch.', 1.2); await wait(1300); if (run !== runId) return;
  noise(.35, 2500, .25);
  for (let i = 0; i < 40; i++) sparks.push({ x: cutlass.x - 22, y: FRONT_Y - ADULT * .83, vx: -80 - Math.random() * 220, vy: -60 + Math.random() * 120, life: 0, max: .9, col: 'rgba(230,80,110,.9)', g: 420 });
  cutlass.hop = .6; say(cutlass, 'BLEURGH! That’s SEAWATER!', 2.4);
  await wait(1200); if (run !== runId) return; say(dancers.ember, 'Ew!', 1.2);
}
async function crabFinale(run) {
  await wait(1500); if (run !== runId) return;
  ruby.busy = true; ruby.mode = 'cake'; say(ruby, 'Time for the cake!', 1.8);
  while (Math.abs(ruby.x - (AT.cake * W + 60)) > 4) { if (run !== runId) return; await wait(50); }
  ruby.facing = -1; await wait(700); if (run !== runId) return;
  crab.state = 'loose'; crab.x = AT.cake * W; crab.y = -40; crab.vy = -420; sfx([1500, 1900], .08, 'square', .03);
  await wait(500); if (run !== runId) return;
  ruby.hop = .7; say(ruby, 'OWWW! IT PINCHED ME!', 2.2); noise(.2, 900, .3);
  await wait(1600); if (run !== runId) return;
  say(cutlass, 'Is that… part of the cake?', 2); await wait(1200);
  ruby.busy = false; ruby.mode = 'walk'; ruby.target = .3 * W;
}

async function caught() {
  if (mode !== 'play') return;
  mode = 'caught'; const run = runId;
  ruby.facing = Math.sign(pl.x - ruby.x) || 1; ruby.moving = false;
  say(ruby, pick(['Not at MY ball.', 'Absolutely not. Out.', 'I saw that.', 'Door. Now.']), 2);
  sfx([523, 392, 262], .3, 'sawtooth', .04, .12);
  if (pl.carry === 'crab') { pl.carry = null; crab.state = 'bucket'; }
  await wait(1400); if (run !== runId) return;
  pl.x = AT.door * W; pl.facing = 1; clock = Math.max(0, clock - 10); hud();
  toast('Marched back to the door. That cost you 10 seconds.'); mode = 'play';
}

function finish() {
  if (mode === 'end') return;
  mode = 'end'; runId++;
  const n = Object.keys(done).length;
  const title = n === 6 ? 'Ball Destroyer Supreme' : n >= 4 ? 'Certified Menace' : n >= 2 ? 'Mild Nuisance' : 'Suspiciously Polite Guest';
  const list = TASKS.filter(x => done[x.id]).map(x => x.label.toLowerCase());
  $('endEyebrow').textContent = n === 6 ? 'Every single thing on the list' : `The music stops`;
  $('endTitle').textContent = title;
  $('endText').textContent = (n ? `You managed to ${list.slice(0, -1).join(', ')}${list.length > 1 ? ' and ' : ''}${list[list.length - 1]}. ` : 'You didn’t ruin anything. Captain Ruby is delighted. Your crewmates are disappointed. ') +
    (n >= 4 ? 'The royals say it was the best ball they’ve ever been to. Captain Ruby is pretending she planned it.' : n ? 'Captain Ruby is still trying to work out who did it.' : '');
  $('endCard').hidden = false; $('againBtn').focus();
}

// ---- update ----
function update(dt) {
  t += dt;
  scheduleMusic();
  sparks.forEach(s => { s.life += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += (s.g ?? 400) * dt; }); sparks = sparks.filter(s => s.life < s.max);
  if (mode === 'title' || !pl) return;
  [pl, ruby, cutlass, ...Object.values(dancers)].forEach(o => { if (o.sayT > 0) o.sayT -= dt; if (o.hop > 0) o.hop -= dt; });

  // the dancing
  const shanty = music === 'shanty', speed = shanty ? 2.6 : 1;
  pairs.forEach(p => {
    p.ph += dt * speed * 1.4;
    const target = p.base ?? (p.base = p.cx);
    const nx = target + Math.sin(p.ph * .55) * 80;
    [p.a, p.b].forEach(k => {
      const d = dancers[k]; if (d.chasing) return;
      d.flop = Math.max(0, d.flop - dt);
      const want = nx + d.side * 46, dx = want - d.x;
      d.x += dx; d.phase += Math.abs(dx) + (shanty ? dt * 120 : dt * 30);
      d.facing = -d.side;
    });
  });
  if (shanty) Object.values(dancers).forEach(d => { if (d.hop <= 0 && Math.random() < dt * 1.5) d.hop = .35; });

  // the chinchilla runs riot, Lila-Bella chases it
  if (chin.active) {
    chin.t += dt; chin.x += chin.dir * 240 * dt;
    if (chin.x < .15 * W) chin.dir = 1; if (chin.x > .88 * W) chin.dir = -1;
    if (Math.random() < dt * .6) chin.dir *= -1;
    const L = dancers.lila; L.x += clamp(chin.x - 60 * chin.dir - L.x, -200 * dt, 200 * dt); L.facing = Math.sign(chin.x - L.x) || 1; L.phase += 200 * dt;
    Object.values(dancers).forEach(d => { if (d !== L && Math.abs(d.x - chin.x) < 40 && d.hop <= 0) { d.hop = .4; if (Math.random() < .5) say(d, pick(['EEK!', 'Something touched my foot!', 'Is that a RAT?!']), 1.2); } });
    if (Math.random() < dt * .25) say(L, pick(['Squeak, NO!', 'Somebody grab him!', 'Pip, help me catch your brother!', 'He’s so fast!']), 1.6);
  }
  // a loose crab scuttles away
  if (crab.state === 'loose') { crab.vy += 900 * dt; crab.y = Math.min(0, crab.y + crab.vy * dt); crab.x += 160 * dt; }

  if (mode === 'play') {
    clock -= dt; if (clock <= 0) { hud(); return finish(); }
    if (Math.floor(clock + dt) !== Math.floor(clock)) hud();
    if (pl.swing) {
      const s = pl.swing; s.t += dt / 1.7; pl.x = lerp(s.from, s.to, s.t); pl.facing = 1; pl.moving = false;
      if (s.t >= 1) { pl.swing = null; noise(.2, 400, .3); }
    } else {
      const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
      pl.moving = !!dir;
      if (dir) { pl.facing = dir; const nx = clamp(pl.x + dir * WALK * dt, 30, W - 30); pl.phase += Math.abs(nx - pl.x); pl.x = nx; }
    }
  } else { pl.moving = false; }

  // Captain Ruby makes the rounds
  if (ruby.mode === 'cake') {
    const tx = AT.cake * W + 60, dx = tx - ruby.x; ruby.moving = Math.abs(dx) > 4;
    if (ruby.moving) { ruby.facing = Math.sign(dx); const st = Math.min(Math.abs(dx), 90 * dt); ruby.x += ruby.facing * st; ruby.phase += st; }
  } else if (mode === 'play') {
    ruby.timer -= dt;
    if (ruby.mode === 'walk') {
      const dx = ruby.target - ruby.x;
      if (Math.abs(dx) < 4) { ruby.mode = 'pause'; ruby.timer = 1 + Math.random() * 2; ruby.moving = false; if (Math.random() < .4) say(ruby, pick(['Lovely to see you, Your Highness.', 'Isn’t this elegant?', 'Nobody touch the cake.', 'Where is my crew?', 'Everything is perfect.']), 2.2); }
      else { ruby.facing = Math.sign(dx); ruby.moving = true; const st = Math.min(Math.abs(dx), 70 * dt); ruby.x += ruby.facing * st; ruby.phase += st; }
    } else if (ruby.mode === 'pause') {
      if (Math.random() < dt * .5) ruby.facing *= -1;
      if (ruby.timer <= 0) { ruby.target = lerp(.12, .88, Math.random()) * W; ruby.mode = 'walk'; }
    }
  }
  const followX = mode === 'end' ? ruby.x : pl.x;
  camX += (clamp(followX - VW / 2, 0, W - VW) - camX) * Math.min(1, dt * (reduceMotion ? 20 : 4));
}

// ---- drawing ----
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function bubble(x, y, text) {
  ctx.font = '18px "IM Fell English", Georgia, serif';
  const w = ctx.measureText(text).width + 26, h = 32, bx = clamp(x - w / 2, 8, VW - w - 8), by = clamp(y - h - 14, 50, VH - h - 8), tip = clamp(x, bx + 14, bx + w - 14);
  ctx.fillStyle = 'rgba(0,0,0,.2)'; rr(bx + 2, by + 3, w, h, 12); ctx.fill();
  ctx.fillStyle = '#fff8ea'; rr(bx, by, w, h, 12); ctx.fill();
  ctx.beginPath(); ctx.moveTo(tip - 7, by + h - 1); ctx.lineTo(tip, by + h + 9); ctx.lineTo(tip + 7, by + h - 1); ctx.fill();
  ctx.fillStyle = '#3a2816'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, bx + w / 2, by + h / 2 + 1);
}
// draws a person; walking uses the side-view sheet, standing uses the portrait (or frame 0 for guests)
function person(o, footY, scale, opts = {}) {
  const p = P[o.k], h = ADULT * p.size * scale, sx = o.x - camX;
  if (sx < -220 || sx > VW + 220) return { x: sx, y: footY - h };
  const hop = o.hop > 0 ? Math.sin(Math.min(1, o.hop / .4) * Math.PI) * 18 : 0;
  ctx.fillStyle = 'rgba(40,20,5,.25)'; ctx.beginPath(); ctx.ellipse(sx, footY, h * .19, 6, 0, 0, 7); ctx.fill();
  ctx.save(); ctx.translate(sx, footY - hop - (opts.lift || 0));
  if (opts.rot) ctx.rotate(opts.rot);
  if (p.walk && (opts.moving || !p.img)) {
    const wk = p.walk, wh = h * wk.fh / (wk.fh - 4), ww = wk.fw * wh / wk.fh, fr = opts.moving ? Math.floor(o.phase / (wk.cycle * scale / wk.frames)) % wk.frames : 0;
    if (o.facing < 0) ctx.scale(-1, 1);
    ctx.drawImage(p.walkImg, ((fr % wk.frames) + wk.frames) % wk.frames * wk.fw, 0, wk.fw, wk.fh, -wk.ax * wh / wk.fh, -wh + 4 * wh / wk.fh, ww, wh);
  } else {
    const img = p.img_, w = img.width * h / img.height;
    ctx.drawImage(img, -w / 2, -h, w, h);
  }
  ctx.restore();
  return { x: sx, y: footY - h - hop - (opts.lift || 0) };
}
function table(x, w, h, cloth = '#f3ead8') {
  const sx = x - camX; ctx.fillStyle = 'rgba(40,20,5,.28)'; ctx.beginPath(); ctx.ellipse(sx, FRONT_Y + 2, w * .55, 8, 0, 0, 7); ctx.fill();
  ctx.fillStyle = cloth; ctx.beginPath(); ctx.moveTo(sx - w / 2, FRONT_Y - h); ctx.lineTo(sx + w / 2, FRONT_Y - h); ctx.lineTo(sx + w / 2 + 8, FRONT_Y); ctx.lineTo(sx - w / 2 - 8, FRONT_Y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.08)'; for (let i = -2; i <= 2; i++) ctx.fillRect(sx + i * w / 5 - 1, FRONT_Y - h + 6, 2, h - 6);
  ctx.fillStyle = '#d2a24c'; ctx.fillRect(sx - w / 2, FRONT_Y - h, w, 4);
  return { x: sx, top: FRONT_Y - h };
}
function drawProps() {
  // bait bucket of crabs, by the door
  { const sx = AT.bucket * W - camX; ctx.fillStyle = '#7d8790'; ctx.beginPath(); ctx.moveTo(sx - 26, FRONT_Y - 50); ctx.lineTo(sx + 26, FRONT_Y - 50); ctx.lineTo(sx + 20, FRONT_Y); ctx.lineTo(sx - 20, FRONT_Y); ctx.fill();
    ctx.fillStyle = '#5c666e'; ctx.fillRect(sx - 26, FRONT_Y - 52, 52, 6); if (crab.state === 'bucket' || done.crab) { drawCrab(sx - 8, FRONT_Y - 54, .6); drawCrab(sx + 10, FRONT_Y - 52, .5); } }
  // the punch bowl
  { const tb = table(AT.punch * W, 110, 80); ctx.fillStyle = 'rgba(220,240,255,.75)'; ctx.beginPath(); ctx.ellipse(tb.x, tb.top - 8, 34, 14, 0, 0, Math.PI); ctx.fill();
    ctx.fillStyle = done.punch ? '#5aa9b8' : '#d64b6d'; ctx.beginPath(); ctx.ellipse(tb.x, tb.top - 10, 30, 6, 0, 0, 7); ctx.fill();
    for (let i = 0; i < 4; i++) { ctx.fillStyle = 'rgba(230,240,255,.8)'; ctx.fillRect(tb.x - 46 + i * 9 + (i > 1 ? 66 : 0), tb.top - 16, 7, 14); } }
  // the cake
  { const tb = table(AT.cake * W, 120, 80, '#efe3f2'); const tiers = [[60, 30], [44, 26], [28, 22]]; let y = tb.top;
    tiers.forEach(([w, h], i) => { ctx.fillStyle = ['#f6d4e0', '#f9e4ec', '#fff2f6'][i]; rr(tb.x - w / 2, y - h, w, h, 5); ctx.fill(); ctx.fillStyle = '#e57aa0'; for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.arc(tb.x - w / 2 + 4 + k * (w - 8) / 5, y - h, 3, 0, 7); ctx.fill(); } y -= h; });
    if (crab.state === 'cake') { const peek = Math.sin(t * 3) > .6 ? 4 : 0; drawCrab(tb.x + 18, tb.top - 28 - peek, .45); } }
  // the gramophone
  { const sx = AT.gramophone * W - camX; ctx.fillStyle = '#5a3620'; rr(sx - 40, FRONT_Y - 120, 80, 120, 4); ctx.fill(); ctx.fillStyle = '#7a4a2a'; rr(sx - 34, FRONT_Y - 168, 68, 48, 4); ctx.fill();
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.ellipse(sx, FRONT_Y - 170, 28, 6, 0, 0, 7); ctx.fill();
    const hornG = ctx.createLinearGradient(sx, FRONT_Y - 260, sx + 80, FRONT_Y - 180); hornG.addColorStop(0, '#f2cf6b'); hornG.addColorStop(1, '#a97b25');
    ctx.fillStyle = hornG; ctx.beginPath(); ctx.moveTo(sx + 6, FRONT_Y - 176); ctx.lineTo(sx + 26, FRONT_Y - 196); ctx.quadraticCurveTo(sx + 40, FRONT_Y - 260, sx + 96, FRONT_Y - 262); ctx.quadraticCurveTo(sx + 104, FRONT_Y - 214, sx + 60, FRONT_Y - 186); ctx.lineTo(sx + 14, FRONT_Y - 172); ctx.closePath(); ctx.fill();
    if (!reduceMotion) { ctx.fillStyle = '#3a2816'; ctx.font = '20px serif'; ctx.textAlign = 'center'; ['♪', '♫'].forEach((n, i) => { const k = (t * .7 + i * .5) % 1; ctx.globalAlpha = 1 - k; ctx.fillText(n, sx + 90 + k * 30, FRONT_Y - 270 - k * 50); }); ctx.globalAlpha = 1; } }
  // the chinchilla's basket
  { const sx = AT.basket * W - camX; ctx.fillStyle = '#c69456'; rr(sx - 38, FRONT_Y - 46, 76, 46, 10); ctx.fill(); ctx.strokeStyle = 'rgba(90,55,20,.5)'; ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(sx - 38, FRONT_Y - 38 + i * 10); ctx.lineTo(sx + 38, FRONT_Y - 38 + i * 10); ctx.stroke(); }
    ctx.strokeStyle = '#a2703f'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(sx, FRONT_Y - 46, 30, Math.PI, 0); ctx.stroke();
    if (!chin.active) { const ih = 42, iw = chinImg.width * ih / chinImg.height; ctx.drawImage(chinImg, sx - iw / 2, FRONT_Y - 46 - ih * .7, iw, ih); } }
}
function drawCrab(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#e0533d'; ctx.beginPath(); ctx.ellipse(0, 0, 22, 14, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = '#c13d29'; ctx.lineWidth = 4; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(-14, 4 + i * 4); ctx.lineTo(-28, 12 + i * 6); ctx.moveTo(14, 4 + i * 4); ctx.lineTo(28, 12 + i * 6); ctx.stroke(); }
  ctx.fillStyle = '#e0533d'; ctx.beginPath(); ctx.arc(-26, -14, 9, 0, 7); ctx.arc(26, -14, 9, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-6, -14, 5, 0, 7); ctx.arc(6, -14, 5, 0, 7); ctx.fill(); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(-6, -14, 2.4, 0, 7); ctx.arc(6, -14, 2.4, 0, 7); ctx.fill();
  ctx.restore();
}
function drawList() {
  const x = 14, y = 58, w = 236, h = 30 + TASKS.length * 22;
  ctx.fillStyle = 'rgba(243,230,204,.94)'; rr(x, y, w, h, 6); ctx.fill();
  ctx.fillStyle = '#3a2816'; ctx.font = '18px "Pirata One", Georgia, serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('To do', x + 12, y + 16);
  ctx.font = '14px "IM Fell English", Georgia, serif';
  TASKS.forEach((task, i) => {
    const ty = y + 38 + i * 22, d = done[task.id];
    ctx.fillStyle = d ? 'rgba(58,40,22,.45)' : '#3a2816'; ctx.fillText(task.label, x + 30, ty);
    ctx.strokeStyle = '#9b7230'; ctx.lineWidth = 1.5; ctx.strokeRect(x + 12, ty - 6, 12, 12);
    if (d) { ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 28, ty); ctx.lineTo(x + 30 + ctx.measureText(task.label).width, ty); ctx.stroke();
      ctx.strokeStyle = '#2e7d32'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x + 13, ty); ctx.lineTo(x + 17, ty + 5); ctx.lineTo(x + 25, ty - 8); ctx.stroke(); }
  });
}

function render() {
  ctx.setTransform(K, 0, 0, K, 0, 0);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bg, -camX, BG_YOFF, W, BG_H);
  if (!pl) return;
  // the chandelier sways if someone's swinging on it
  const chX = AT.chandelier * W - camX, sw = pl.swing ? Math.sin(pl.swing.t * Math.PI * 2) * .25 : 0;
  if (pl.swing) { ctx.strokeStyle = '#3d2a1a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(chX, 40); const px = pl.x - camX, py = FRONT_Y - ADULT * P[me].size - 120 * Math.sin(pl.swing.t * Math.PI); ctx.lineTo(px, py); ctx.stroke(); }
  else if (!done.swing) { ctx.strokeStyle = 'rgba(61,42,26,.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(chX + 30, 100); ctx.quadraticCurveTo(chX + 40 + Math.sin(t) * 4, 250, chX + 34, FRONT_Y - 150); ctx.stroke(); }

  // dance floor (back row)
  const heads = [];
  Object.values(dancers).sort((a, b) => a.x - b.x).forEach(d => heads.push([d, person(d, BACK_Y, BACK_SCALE, { moving: d.flop <= 0, rot: d.flop > 0 ? -Math.min(1, (1.6 - d.flop) * 5) * 1.35 * Math.min(1, d.flop * 3) * d.facing : 0 })]));
  if (chin.active) { const ih = 46, iw = chinImg.width * ih / chinImg.height, sx = chin.x - camX, bob = Math.abs(Math.sin(t * 18)) * 6;
    ctx.save(); ctx.translate(sx, BACK_Y - bob); if (chin.dir < 0) ctx.scale(-1, 1); ctx.drawImage(chinImg, -iw / 2, -ih, iw, ih); ctx.restore(); }

  drawProps();
  // the front of the floor
  heads.push([cutlass, person(cutlass, FRONT_Y, 1)]);
  heads.push([ruby, person(ruby, FRONT_Y, 1, { moving: ruby.moving })]);
  const lift = pl.swing ? Math.sin(pl.swing.t * Math.PI) * 120 : 0;
  const me_ = person(pl, FRONT_Y, 1, { moving: pl.moving, lift, rot: pl.swing ? sw : 0 }); heads.push([pl, me_]);
  if (pl.carry === 'crab') drawCrab(me_.x, me_.y - 16, .55);
  if (crab.state === 'loose') drawCrab(crab.x - camX, FRONT_Y - 12 + crab.y, .7);

  sparks.forEach(s => { ctx.globalAlpha = 1 - s.life / s.max; ctx.fillStyle = s.col; ctx.beginPath(); ctx.arc(s.x - camX, s.y, 3, 0, 7); ctx.fill(); });
  ctx.globalAlpha = 1;

  // Ruby's eye when she's watching you
  if (mode === 'play') {
    const rh = heads.find(h => h[0] === ruby)[1];
    if (rubyWatching()) {
      const ex = rh.x, ey = rh.y - 22; ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.beginPath(); ctx.ellipse(ex, ey, 20, 12, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = '#b3261e'; ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = '#b3261e'; ctx.beginPath(); ctx.arc(ex + Math.sign(pl.x - ruby.x) * 5, ey, 6, 0, 7); ctx.fill();
    }
  }
  drawList();
  heads.forEach(([o, h]) => { if (o.sayT > 0) bubble(h.x, h.y - 4, o.say); });
  // what you can do here
  if (mode === 'play') {
    const r = reachable();
    if (r) {
      const watched = rubyWatching(), text = watched ? `${r.hint}: Ruby’s watching!` : `${r.hint}: press E`;
      ctx.font = '700 14px "Alegreya Sans", sans-serif'; const w = ctx.measureText(text).width + 24, x = clamp(me_.x - w / 2, 8, VW - w - 8);
      ctx.fillStyle = watched ? 'rgba(160,30,30,.9)' : 'rgba(20,30,40,.85)'; rr(x, FRONT_Y - 4, w, 24, 12); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x + w / 2, FRONT_Y + 8);
    }
  }
}

// ---- loop ----
let last = 0;
function frame(now) { const dt = Math.min(.05, (now - last) / 1000 || 0); last = now; update(dt); render(); requestAnimationFrame(frame); }
function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Could not load ' + src)); i.src = src; }); }

(async () => {
  resize();
  try { await Promise.race([document.fonts.load('18px "IM Fell English"'), document.fonts.load('18px "Pirata One"'), new Promise(r => setTimeout(r, 1500))]); } catch (e) {}
  [bg, chinImg] = await Promise.all([loadImg('ship-dining.jpg'), loadImg('chinchilla.png'),
    ...Object.values(P).map(async p => { if (p.img) p.img_ = await loadImg(p.img); if (p.walk) p.walkImg = await loadImg(p.walk.img); })]);
  W = bg.width * BG_H / bg.height;
  buildPick();
  requestAnimationFrame(now => { last = now; requestAnimationFrame(frame); });
})();
})();
