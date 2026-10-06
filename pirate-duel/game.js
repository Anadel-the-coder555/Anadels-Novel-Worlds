(() => {
'use strict';
// ---- stage constants (logical 960x540) ----
const VW = 960, VH = 540, GROUND = 506, BASE_H = 270;
const CAM_X = 520, BG_H = 600, BG_YOFF = -60;    // which slice of the deck painting is on screen
const MID = 480, STEP = 62, GAP = 105, EDGE = 3;  // duel line moves STEP px per won exchange; EDGE wins
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Each insult has exactly one comeback that beats it.
const LINES = [
  { i: 'You fight like a seasick goat!', c: 'How fitting. You smell like one.' },
  { i: 'My grandmother swings a sword faster than you!', c: 'I know. She gave me lessons after she beat you.' },
  { i: 'I’ve got a cannonball with your name on it!', c: 'Spelled wrong, I bet.' },
  { i: 'Your sword is as dull as your jokes!', c: 'And still sharper than your wits.' },
  { i: 'I’ve beaten pirates twice your size!', c: 'Was that before or after their nap?' },
  { i: 'Every time you talk, a seagull falls asleep!', c: 'Lucky seagulls. I’ve had to stay awake for all of yours.' },
  { i: 'You couldn’t find treasure with a map and a shovel!', c: 'I found you, didn’t I? Clearly I’m not picky.' },
  { i: 'Your boots squeak like a frightened mouse!', c: 'At least they’re walking toward the fight.' },
  { i: 'I’ll make you walk the plank!', c: 'Again? You still owe me a towel from last time.' },
  { i: 'Your hat looks like a soggy pancake!', c: 'And yours looks like the plate it came on.' },
  { i: 'Your brain could fit in a thimble!', c: 'Lucky. Yours wouldn’t even fill one.' },
  { i: 'My cutlass is famous in seven seas!', c: 'Famous for being dropped in all of them.' },
];
const SILLY = ['Oh yeah?', 'I’m rubber, you’re glue!', 'I know you are, but what am I?'];
const OPP_FLUBS = ['Uh… no, YOU are!', 'That’s… that’s not very nice.', 'I’m telling the cook!', 'Oh yeah? Well… boats!', 'I had a good one a minute ago…'];
const CROWD_WIN = ['Ooooh!', 'BURN!', 'Ha! Good one!', 'Fetch the ice!', 'Somebody write that down!'];
const CROWD_MISS = ['Ouch…', 'That was weak, Captain!', 'Boooo!', 'Yikes.', 'Even I knew that one!'];

const P = {
  ruby:        { name: 'Captain Ruby', img: 'ruby.png', size: 1, face: [.42, .1, .14], walk: { img: 'ruby-walk.png', frames: 8, fw: 250, fh: 420, ax: 106, cycle: 110 } },
  cutlass:     { name: 'Captain Cutlass', img: 'cutlass.png', size: 1.02, face: [.46, .085, .13], walk: { img: 'cutlass-walk.png', frames: 8, fw: 238, fh: 420, ax: 120, cycle: 110 } },
  bones:       { name: 'Bones', img: 'bones.png', size: .84, face: [.5, .09, .14], ins: [0, 2, 7, 9, 10], skill: .3, tier: 1, lose: 'I wasn’t ready! I want a do-over!' },
  scarlett:    { name: 'Scarlett', img: 'scarlett.png', size: .96, face: [.48, .085, .14], ins: [1, 3, 5, 8, 11], skill: .4, tier: 1, lose: 'Fine! The water was calling me anyway.' },
  absalom:     { name: 'Absalom', img: 'absalom.png', size: .94, face: [.5, .1, .14], ins: [0, 4, 6, 9, 10], skill: .45, tier: 2, lose: 'Not the hat! Save the haaaat!' },
  crispin:     { name: 'Crispin', img: 'crispin.png', size: 1, face: [.5, .075, .13], ins: [2, 3, 6, 7, 11], skill: .5, tier: 2, lose: 'I meant to do that!' },
  monsoon:     { name: 'Monsoon', img: 'monsoon.png', size: 1, face: [.5, .085, .13], ins: [0, 3, 6, 9, 11], skill: .55, tier: 2, lose: 'Tell the cannon I loved it!' },
  jade:        { name: 'Jade', img: 'jade.png', size: 1, face: [.5, .075, .13], ins: [1, 4, 5, 8, 10], skill: .6, tier: 3, lose: 'You got lucky, Captain. Very lucky.' },
  stormcaller: { name: 'Stormcaller', img: 'stormcaller.png', size: 1, face: [.5, .075, .13], ins: [2, 4, 5, 7, 8], skill: .65, tier: 3, lose: 'I predicted this. I did not prepare for it.' },
};
const CREW = ['bones', 'scarlett', 'absalom', 'crispin', 'monsoon', 'jade', 'stormcaller'];
// Harder rivals give you more comebacks to choose between and less time to answer.
const TIERS = { 1: { opts: 3, secs: 14 }, 2: { opts: 4, secs: 10 }, 3: { opts: 5, secs: 8 }, boss: { opts: 6, secs: 7, skill: .75 } };
const isBoss = k => k === 'ruby' || k === 'cutlass';
const tierOf = k => isBoss(k) ? TIERS.boss : TIERS[P[k].tier];

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

// ---- saved progress (per browser) ----
function load() { try { return JSON.parse(localStorage.getItem('pirate-duel')) || null; } catch (e) { return null; } }
function save() { try { localStorage.setItem('pirate-duel', JSON.stringify({ ins: [...known.ins], com: [...known.com], beaten: [...beaten], champ })); } catch (e) {} }
const saved = load();
const known = { ins: new Set(saved?.ins || [0, 1]), com: new Set(saved?.com || [0, 1]) };
const beaten = new Set(saved?.beaten || []);
let champ = !!saved?.champ;

// ---- state ----
let deck, me = null, foe = null, t = 0;
let L = 0;                       // duel line: + pushes the foe back, - pushes me back
let duelId = 0;
const fighters = {};             // key -> { x, tx, phase, fly, rot, vy, vx, gone }
const bubbles = [];              // { who, text, until, kind }
let clash = 0, sparks = [], splash = null, crowdSay = null;

// ---- sound ----
let ac = null, muted = false;
function audio() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } } if (ac && ac.state === 'suspended') ac.resume(); }
function tone(freqs, dur, type = 'triangle', vol = .05, gap = .06) {
  if (!ac || muted) return; const t0 = ac.currentTime;
  freqs.forEach((f, i) => { const o = ac.createOscillator(), g = ac.createGain(), s = t0 + i * gap; o.type = type; o.frequency.value = f; g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(vol, s + .01); g.gain.exponentialRampToValueAtTime(.0001, s + dur); o.connect(g).connect(ac.destination); o.start(s); o.stop(s + dur + .05); });
}
function clang() { tone([1760, 2349, 1320], .25, 'square', .025, .015); }
function splashSound() {
  if (!ac || muted) return; const n = ac.sampleRate * .7, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); f.type = 'lowpass'; f.frequency.value = 900; g.gain.value = .35;
  s.buffer = b; s.connect(f).connect(g).connect(ac.destination); s.start();
}
$('mute').addEventListener('click', () => { muted = !muted; $('mute').textContent = muted ? 'Sound off' : 'Sound on'; $('mute').setAttribute('aria-pressed', muted); });

// ---- HUD ----
function book() { $('insCount').textContent = known.ins.size; $('comCount').textContent = known.com.size; }
let learnedT = 0;
function learn(kind, id) {
  const set = kind === 'ins' ? known.ins : known.com;
  if (set.has(id)) return;
  set.add(id); save(); book();
  const el = $('learned'); el.textContent = kind === 'ins' ? 'New insult learned!' : 'New comeback learned!'; el.classList.add('on');
  clearTimeout(learnedT); learnedT = setTimeout(() => el.classList.remove('on'), 1800);
}
function faceStyle(key, size) {
  const p = P[key], img = p.img_, s = size / (p.face[2] * img.height);
  return `background-image:url('${p.img}');background-size:${img.width * s}px ${img.height * s}px;background-position:${-(p.face[0] * img.width * s - size / 2)}px ${-(p.face[1] * img.height * s - size / 2)}px`;
}

// ---- line picker ----
let resolveChoice = null;
let askTimer = 0;
function ask(prompt, options, secs) {
  $('prompt').innerHTML = prompt;
  const box = $('lines'); box.innerHTML = '';
  options.forEach((o, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'line' + (o.silly ? ' silly' : '');
    b.innerHTML = `<kbd>${i + 1}</kbd><span></span>${o.heard ? '<em>heard it</em>' : ''}`; b.children[1].textContent = o.text;
    b.addEventListener('click', () => choose(i));
    box.appendChild(b);
  });
  const bar = $('timer'); bar.hidden = !secs;
  if (secs) { const fill = bar.firstElementChild; fill.style.animation = 'none'; void fill.offsetWidth; fill.style.animation = `drain ${secs}s linear forwards`; }
  return new Promise(r => {
    resolveChoice = v => r(v === -1 ? { text: 'Uhh… um… erm…', id: -1, silly: true } : options[v]);
    clearTimeout(askTimer);
    if (secs) askTimer = setTimeout(() => { if (resolveChoice) { tone([220], .3, 'square', .03); choose(-1); } }, secs * 1000);
  });
}
function choose(i) {
  if (!resolveChoice) return;
  const r = resolveChoice; resolveChoice = null; clearTimeout(askTimer); $('timer').hidden = true;
  document.querySelectorAll('.line').forEach(b => b.disabled = true);
  audio(); r(i);
}
function idle(text) { $('prompt').innerHTML = text; $('lines').innerHTML = ''; resolveChoice = null; clearTimeout(askTimer); $('timer').hidden = true; }
addEventListener('keydown', e => {
  const n = parseInt(e.key, 10);
  if (resolveChoice && n >= 1 && n <= $('lines').children.length) { e.preventDefault(); choose(n - 1); }
});

// ---- speech ----
function say(who, text, ms = 2200, kind = '') { const b = { who, text, until: t + ms / 1000, kind }; for (let i = bubbles.length - 1; i >= 0; i--) if (bubbles[i].who === who) bubbles.splice(i, 1); bubbles.push(b); }
function crowd(lines) {
  const watchers = CREW.filter(k => k !== foe);
  crowdSay = { who: pick(watchers), text: pick(lines), until: t + 1.6 };
}

// ---- flow ----
function show(id) { ['captainCard', 'rosterCard', 'resultCard'].forEach(c => $(c).hidden = c !== id); }
function buildCaptainPick() {
  ['ruby', 'cutlass'].forEach(k => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'who';
    b.innerHTML = `<span class="face" style="${faceStyle(k, 72)}"></span><b>${P[k].name}</b>`;
    b.addEventListener('click', () => { audio(); me = k; roster(); });
    $('captainPick').appendChild(b);
  });
}
function roster() {
  const rival = me === 'ruby' ? 'cutlass' : 'ruby';
  const unlocked = beaten.size >= 3;
  $('rosterNote').textContent = unlocked
    ? `${P[rival].name} will see you now. They almost never miss a comeback, and you get six choices and seven seconds to answer theirs.`
    : `Beat three of the crew to earn a duel with ${P[rival].name}. (${beaten.size} of 3 so far)`;
  const box = $('roster'); box.innerHTML = '';
  [...CREW, rival].forEach(k => {
    const boss = k === rival, b = document.createElement('button');
    b.type = 'button'; b.className = 'who' + (beaten.has(k) ? ' beaten' : '') + (boss ? ' boss' : '');
    b.innerHTML = `<span class="face" style="${faceStyle(k, 60)}"></span><b>${P[k].name}</b><span class="tier">${boss ? 'THE CAPTAIN' : '⚔'.repeat(P[k].tier)}</span>`;
    if (boss && !unlocked) b.disabled = true;
    b.addEventListener('click', () => startDuel(k));
    box.appendChild(b);
  });
  $('vsPill').textContent = P[me].name;
  idle('Pick someone to duel.');
  layoutIdle();
  show('rosterCard');
}

function layoutIdle() {
  foe = null; L = 0; splash = null;
  fighters[me] = { x: MID - 200, tx: MID - 200, phase: 0 };
}

async function startDuel(k) {
  audio();
  const id = ++duelId;
  foe = k; L = 0; splash = null; sparks = []; bubbles.length = 0;
  if (!P[foe].ins) P[foe].ins = LINES.map((_, i) => i);             // the rival captain uses everything
  const tier = tierOf(foe), skill = tier.skill ?? P[foe].skill;
  fighters[me] = { x: -120, tx: MID - GAP, phase: 0 };
  fighters[foe] = { x: VW + 120, tx: MID + GAP, phase: 0 };
  show(null);
  $('vsPill').textContent = `${P[me].name} vs ${P[foe].name}`;
  idle(`${P[foe].name} steps up…`);
  await wait(1100); if (id !== duelId) return;
  say(foe, foe === 'ruby' || foe === 'cutlass' ? 'So. It comes to this.' : pick(['En garde, Captain!', 'Prepare to get soggy!', 'I’ve been practising!']), 1600);
  clang(); clash = .3;
  await wait(1500); if (id !== duelId) return;
  let myTurn = false;                           // turns alternate; the challenger starts
  while (Math.abs(L) < EDGE) {
    if (myTurn) {
      const opts = [...known.ins].sort((a, b) => a - b).map(i => ({ text: LINES[i].i, id: i }));
      const choice = await ask('Your turn. <i>Pick an insult:</i>', opts, 0); if (id !== duelId) return;
      say(me, choice.text, 2400);
      await wait(1500); if (id !== duelId) return;
      if (Math.random() < skill) {
        say(foe, LINES[choice.id].c, 2600); learn('com', choice.id);
        await exchange(false);
      } else {
        say(foe, pick(OPP_FLUBS), 2200);
        await exchange(true);
      }
    } else {
      const ins = pick(P[foe].ins);
      say(foe, LINES[ins].i, 2600); learn('ins', ins);
      await wait(900); if (id !== duelId) return;
      // the right comeback is always among the choices; the rest are other comebacks, shuffled
      const others = LINES.map((_, i) => i).filter(i => i !== ins).sort(() => Math.random() - .5).slice(0, tier.opts - 1);
      const opts = [ins, ...others].sort(() => Math.random() - .5).map(c => ({ text: LINES[c].c, id: c, heard: known.com.has(c) }));
      opts.push({ text: pick(SILLY), id: -1, silly: true });
      const choice = await ask(`${P[foe].name}: <i>“${LINES[ins].i}”</i> &nbsp;Quick, your comeback!`, opts, tier.secs); if (id !== duelId) return;
      say(me, choice.text, 2400);
      await wait(1300); if (id !== duelId) return;
      const won = choice.id === ins;
      if (won) learn('com', ins);
      else {                                       // a friend on the rail shouts the answer you needed
        const helper = pick(CREW.filter(k => k !== foe));
        await exchange(false); if (id !== duelId) return;
        crowdSay = { who: helper, text: `Psst! It’s “${LINES[ins].c}”`, until: t + 3 };
        learn('com', ins);
        await wait(900);
      }
      if (won) await exchange(true);
    }
    if (id !== duelId) return;
    myTurn = !myTurn;
    idle('…');
    await wait(500); if (id !== duelId) return;
  }
  await finish(L > 0, id);
}

async function exchange(iWon) {
  clash = .35; clang();
  for (let k = 0; k < 14; k++) { const a = Math.random() * 7, s = 80 + Math.random() * 160; sparks.push({ x: MID + L * STEP, y: GROUND - 160, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, life: 0 }); }
  L += iWon ? 1 : -1;
  fighters[me].tx = MID + L * STEP - GAP; fighters[foe].tx = MID + L * STEP + GAP;
  crowd(iWon ? CROWD_WIN : CROWD_MISS);
  tone(iWon ? [660, 880] : [330, 247], .25, 'triangle', .04, .08);
  await wait(1100);
}

async function finish(iWon, id) {
  const loser = iWon ? foe : me, f = fighters[loser];
  if (iWon) say(foe, P[foe].lose || 'Nooooo! Not the water!', 1800);
  else say(me, 'Not like thiiiis!', 1800);
  await wait(600); if (id !== duelId) return;
  const dir = iWon ? 1 : -1;
  f.fly = true; f.vx = dir * 520; f.vy = -520; f.rot = 0;
  tone([523, 392, 262, 196], .5, 'sine', .05, .09);
  await wait(1100); if (id !== duelId) return;
  splash = { x: dir > 0 ? VW - 40 : 40, life: 0 }; splashSound();
  crowd(['MAN OVERBOARD!', 'Splaaash!', 'Someone throw a rope! …Eventually.']);
  await wait(1700); if (id !== duelId) return;
  const rival = me === 'ruby' ? 'cutlass' : 'ruby';
  if (iWon) {
    beaten.add(foe);
    if (foe === rival) { champ = true; save();
      $('resultEyebrow').textContent = 'Captain of captains';
      $('resultTitle').textContent = `${P[foe].name} takes a swim!`;
      $('resultText').textContent = `Not a single comeback missed. The whole crew agrees: ${P[me].name} has the sharpest tongue on the seven seas.`;
    } else { save();
      $('resultEyebrow').textContent = 'Splash!';
      $('resultTitle').textContent = `${P[foe].name} goes over the side`;
      $('resultText').textContent = beaten.size >= 3 && !beaten.has(rival) ? `That’s ${beaten.size} of the crew beaten. ${P[rival].name} is ready for you.` : `${P[foe].name} climbs back aboard, dripping and grumbling.`;
    }
    $('resultBtn').textContent = 'Pick a challenger';
  } else {
    $('resultEyebrow').textContent = 'Splash!';
    $('resultTitle').textContent = `${P[me].name} takes a swim`;
    $('resultText').textContent = `You know ${known.ins.size} insults and ${known.com.size} comebacks now. Every line used on you is yours to keep. Try again!`;
    $('resultBtn').textContent = 'Back to the deck';
  }
  idle('');
  show('resultCard'); $('resultBtn').focus();
}
$('resultBtn').addEventListener('click', roster);

// ---- update ----
function update(dt) {
  t += dt; clash = Math.max(0, clash - dt);
  Object.entries(fighters).forEach(([k, f]) => {
    if (f.fly) { f.x += f.vx * dt; f.vy += 1300 * dt; f.y = (f.y || 0) + f.vy * dt; f.rot += dt * 9 * Math.sign(f.vx); return; }
    const d = f.tx - f.x, step = clamp(d, -240 * dt, 240 * dt);
    f.moving = Math.abs(d) > 1; f.x += step; f.phase += step;
  });
  sparks.forEach(s => { s.life += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 500 * dt; });
  sparks = sparks.filter(s => s.life < .6);
  if (splash) splash.life += dt;
  for (let i = bubbles.length - 1; i >= 0; i--) if (bubbles[i].until < t) bubbles.splice(i, 1);
  if (crowdSay && crowdSay.until < t) crowdSay = null;
}

// ---- drawing ----
function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function wrap(text, max) { const out = []; let line = ''; text.split(' ').forEach(w => { const tl = line ? line + ' ' + w : w; if (ctx.measureText(tl).width > max && line) { out.push(line); line = w; } else line = tl; }); if (line) out.push(line); return out; }
function bubble(x, y, text, name, small) {
  ctx.font = (small ? '16px' : '19px') + ' "IM Fell English", Georgia, serif';
  const lines = wrap(text, small ? 170 : 260), w = Math.min(small ? 200 : 300, Math.max(...lines.map(l => ctx.measureText(l).width)) + 28);
  const lh = small ? 19 : 23, h = 14 + lines.length * lh, bx = clamp(x - w / 2, 8, VW - w - 8), by = Math.max(40, y - h - 16), tip = clamp(x, bx + 16, bx + w - 16);
  ctx.fillStyle = 'rgba(0,0,0,.2)'; roundRect(bx + 2, by + 4, w, h, 12); ctx.fill();
  ctx.fillStyle = '#fff8ea'; roundRect(bx, by, w, h, 12); ctx.fill();
  ctx.beginPath(); ctx.moveTo(tip - 8, by + h - 1); ctx.lineTo(tip, by + h + 11); ctx.lineTo(tip + 8, by + h - 1); ctx.fill();
  ctx.fillStyle = '#3a2816'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  lines.forEach((l, i) => ctx.fillText(l, bx + w / 2, by + 8 + lh / 2 + i * lh));
  if (name) { ctx.font = '700 12px "Alegreya Sans", sans-serif'; ctx.fillStyle = '#fff8ea'; ctx.strokeStyle = 'rgba(40,25,10,.8)'; ctx.lineWidth = 3; ctx.strokeText(name.toUpperCase(), bx + w / 2, by - 9); ctx.fillText(name.toUpperCase(), bx + w / 2, by - 9); }
}
function heights(k, scale = 1) { return BASE_H * P[k].size * scale; }

function drawFighter(k, facing) {
  const p = P[k], f = fighters[k]; if (!f || f.gone) return;
  const h = heights(k), x = f.x, y = GROUND + (f.y || 0);
  if (x < -300 || x > VW + 300 || y > VH + 400) return;
  ctx.save(); ctx.translate(x, y);
  if (f.fly) ctx.rotate(f.rot);
  ctx.fillStyle = 'rgba(40,25,10,.28)'; if (!f.fly) { ctx.beginPath(); ctx.ellipse(0, 0, 60, 8, 0, 0, 7); ctx.fill(); }
  let handX, handY;
  if (p.walk) {
    const wk = p.walk, wh = h * wk.fh / (wk.fh - 4), ww = wk.fw * wh / wk.fh;
    // walking forward or backward plays the cycle the matching way round
    const fr = f.moving ? ((Math.floor(f.phase * facing / (wk.cycle / wk.frames)) % wk.frames) + wk.frames) % wk.frames : 0;
    ctx.save(); if (facing < 0) ctx.scale(-1, 1);
    ctx.drawImage(p.walkImg, fr * wk.fw, 0, wk.fw, wk.fh, -wk.ax * wh / wk.fh, -wh + 4 * wh / wk.fh, ww, wh);
    ctx.restore();
    handX = facing * h * .2; handY = -h * .46;
  } else {
    const img = p.img_, w = img.width * h / img.height;
    const bob = f.moving ? Math.abs(Math.sin(f.phase / 30 * Math.PI)) * 6 : 0, sway = reduceMotion ? 0 : Math.sin(t * 1.6 + x) * .01;
    ctx.save(); ctx.translate(0, -bob); ctx.rotate(sway); ctx.drawImage(img, -w / 2, -h, w, h); ctx.restore();
    handX = facing * w * .3; handY = -h * .45;
  }
  // a cutlass held out toward the rival; it jabs forward during a clash
  const jab = clash > 0 ? Math.sin((1 - clash / .35) * Math.PI) * 26 : Math.sin(t * 3 + x) * 3;
  const len = h * .42, ang = (-.35 + (clash > 0 ? .25 : 0)) * 1;
  const tx = handX + facing * (len * Math.cos(ang) + jab), ty = handY + len * Math.sin(ang);
  ctx.strokeStyle = '#d9dde2'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(handX, handY); ctx.quadraticCurveTo((handX + tx) / 2, (handY + ty) / 2 - 10, tx, ty); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(handX + facing * 6, handY - 2); ctx.quadraticCurveTo((handX + tx) / 2, (handY + ty) / 2 - 12, tx, ty - 1); ctx.stroke();
  ctx.fillStyle = '#c9952f'; ctx.beginPath(); ctx.ellipse(handX, handY, 7, 4, 0, 0, 7); ctx.fill();
  ctx.restore();
  f.head = { x, y: y - h };
}

function render() {
  ctx.setTransform(K, 0, 0, K, 0, 0);
  ctx.imageSmoothingQuality = 'high';
  ctx.save();
  if (!reduceMotion) { ctx.translate(VW / 2, VH); ctx.rotate(Math.sin(t * .55) * .006); ctx.scale(1.03, 1.03); ctx.translate(-VW / 2, -VH + Math.sin(t * .55 + 1) * 2); }
  const bw = deck.width * BG_H / deck.height;
  ctx.drawImage(deck, -CAM_X, BG_YOFF, bw, BG_H);

  // the crew watching from the rail
  const watchers = CREW.filter(k => k !== foe);
  const heads = {};
  watchers.forEach((k, i) => {
    const p = P[k], img = p.img_, h = heights(k, .62), w = img.width * h / img.height;
    const x = 70 + i * (820 / (watchers.length - 1 || 1)), y = 432 + (i % 2) * 6;
    const hop = crowdSay && crowdSay.who === k ? Math.abs(Math.sin(t * 12)) * 8 : 0;
    ctx.fillStyle = 'rgba(40,25,10,.22)'; ctx.beginPath(); ctx.ellipse(x, y, w * .3, 5, 0, 0, 7); ctx.fill();
    ctx.drawImage(img, x - w / 2, y - h - hop, w, h);
    heads[k] = { x, y: y - h - hop };
  });

  if (me) drawFighter(me, 1);
  if (foe) drawFighter(foe, -1);

  sparks.forEach(s => { ctx.globalAlpha = 1 - s.life / .6; ctx.fillStyle = '#fff2b0'; ctx.fillRect(s.x - 2, s.y - 2, 4, 4); });
  ctx.globalAlpha = 1;
  if (clash > .15) { ctx.font = '34px "Pirata One", Georgia, serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff2b0'; ctx.strokeStyle = 'rgba(60,30,10,.8)'; ctx.lineWidth = 5; const cx = MID + L * STEP, cy = GROUND - 210; ctx.strokeText('CLANG!', cx, cy); ctx.fillText('CLANG!', cx, cy); }

  if (splash) {
    const s = splash.life, x = splash.x;
    for (let i = 0; i < 18; i++) { const a = -Math.PI / 2 + (i / 17 - .5) * 1.6, r = s * 420 * (0.6 + (i % 3) * .2); const px = x + Math.cos(a) * r * .5, py = VH + Math.sin(a) * r - s * s * 300 + 40; ctx.fillStyle = `rgba(200,235,255,${Math.max(0, 1 - s)})`; ctx.beginPath(); ctx.arc(px, py, 7, 0, 7); ctx.fill(); }
    if (s < 1.4) { ctx.font = '48px "Pirata One", Georgia, serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#e8f6ff'; ctx.strokeStyle = 'rgba(10,40,70,.8)'; ctx.lineWidth = 6; const tx = clamp(x, 140, VW - 140); ctx.strokeText('SPLASH!', tx, 300 - s * 30); ctx.fillText('SPLASH!', tx, 300 - s * 30); }
  }

  bubbles.forEach(b => { const f = fighters[b.who]; if (f && f.head && !f.fly) bubble(f.head.x, f.head.y, b.text, P[b.who].name); else if (f && f.head) bubble(clamp(f.head.x, 100, VW - 100), 120, b.text, P[b.who].name); });
  if (crowdSay && heads[crowdSay.who]) bubble(heads[crowdSay.who].x, heads[crowdSay.who].y, crowdSay.text, '', true);
  ctx.restore();
}

// ---- loop ----
let last = 0;
function frame(now) { const dt = Math.min(.05, (now - last) / 1000 || 0); last = now; update(dt); render(); requestAnimationFrame(frame); }
function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Could not load ' + src)); i.src = src; }); }

(async () => {
  resize();
  try { await Promise.race([document.fonts.load('19px "IM Fell English"'), document.fonts.load('34px "Pirata One"'), new Promise(r => setTimeout(r, 1500))]); } catch (e) {}
  [deck] = await Promise.all([loadImg('ship-deck.jpg'), ...Object.values(P).map(async p => { p.img_ = await loadImg(p.img); if (p.walk) p.walkImg = await loadImg(p.walk.img); })]);
  book(); buildCaptainPick();
  requestAnimationFrame(now => { last = now; requestAnimationFrame(frame); });
})();
})();
