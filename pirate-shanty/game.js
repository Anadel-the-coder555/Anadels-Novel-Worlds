(() => {
'use strict';
// ---- stage constants (logical 960x540) ----
const VW = 960, VH = 540, BG_H = 600, BG_YOFF = -60;
const GY = 512, H = 190;                          // dancers' feet line and height
const HW_X = 480, HW_W = 300, LANE_W = HW_W / 4;  // the note highway
const TOP_Y = 70, HIT_Y = 430, LEAD = 1.7;        // notes fall from TOP_Y to HIT_Y over LEAD seconds
const PERFECT = .07, GOOD = .14;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const P = {
  ruby:        { name: 'Captain Ruby', short: 'Ruby', img: 'ruby.png', size: 1, face: [.42, .1, .14], he: 'her', his: 'her',
                 walk: { img: 'ruby-walk.png', frames: 8, fw: 250, fh: 420, ax: 106 } },
  cutlass:     { name: 'Captain Cutlass', short: 'Cutlass', img: 'cutlass.png', size: 1.02, face: [.46, .085, .13], he: 'him', his: 'his',
                 walk: { img: 'cutlass-walk.png', frames: 8, fw: 238, fh: 420, ax: 120 } },
  bones:       { img: 'bones.png', size: .84, walk: { img: 'bones-walk.png', frames: 8, fw: 250, fh: 420, ax: 112 } },
  absalom:     { img: 'absalom.png', size: .94 },
  scarlett:    { img: 'scarlett.png', size: .96 },
  crispin:     { img: 'crispin.png', size: 1 },
  jade:        { img: 'jade.png', size: 1, walk: { img: 'jade-walk.png', frames: 8, fw: 246, fh: 420, ax: 129 } },
  monsoon:     { img: 'monsoon.png', size: 1, walk: { img: 'monsoon-walk.png', frames: 7, fw: 277, fh: 420, ax: 138 } },
  stormcaller: { img: 'stormcaller.png', size: 1, walk: { img: 'stormcaller-walk.png', frames: 8, fw: 246, fh: 420, ax: 108 } },
  marietta:    { img: 'marietta.png', size: .97, walk: { img: 'marietta-walk.png', frames: 8, fw: 254, fh: 420, ax: 120 } },
};
const CREWS = { ruby: ['ruby', 'marietta', 'jade', 'bones', 'scarlett'], cutlass: ['cutlass', 'monsoon', 'stormcaller', 'absalom', 'crispin'] };
const DIFFS = [
  { key: 'chill', name: 'Chill', bpm: 100, onBeatOnly: true, rival: .8 },
  { key: 'pirate', name: 'Pirate', bpm: 112, onBeatOnly: false, rival: .86 },
  { key: 'legend', name: 'Legendary', bpm: 132, onBeatOnly: false, rival: .92 },
];

// ---- the tune: "Drunken Sailor" (traditional). Each line is 8 beats: [note, beats]. ----
const NOTE = { C: 60, D: 62, E: 64, F: 65, G: 67, A: 69 };
const TUNE = {
  vA: [['A', 1], ['A', .5], ['A', .5], ['A', 1], ['A', .5], ['A', .5], ['A', 1], ['D', 1], ['F', 1], ['A', 1]],
  vG: [['G', 1], ['G', .5], ['G', .5], ['G', 1], ['G', .5], ['G', .5], ['G', 1], ['C', 1], ['E', 1], ['G', 1]],
  end: [['A', 1], ['G', 1], ['E', 1], ['D', 1], ['D', 2], [null, 2]],
  cA: [['A', 2], ['A', 1], ['A', .5], ['A', .5], ['A', 1], ['D', 1], ['F', 1], ['A', 1]],
  cG: [['G', 2], ['G', 1], ['G', .5], ['G', .5], ['G', 1], ['C', 1], ['E', 1], ['G', 1]],
};
const CHORD = { vA: 'D', cA: 'D', vG: 'C', cG: 'C', end: 'D' };   // bass root under each line
// sections: who sings, which tune lines, and the words ({R} = rival captain, {Y} = your captain)
function sections(Y, R) {
  const r = P[R], y = P[Y];
  return [
    { who: 'you', lines: ['vA', 'vG', 'vA', 'end'], words: [`What shall we do with Captain ${r.short}?`, `What shall we do with Captain ${r.short}?`, `What shall we do with Captain ${r.short}?`, 'Early in the morning!'] },
    { who: 'rival', lines: ['vA', 'vG', 'vA', 'end'], words: [`What shall we do with Captain ${y.short}?`, `What shall we do with Captain ${y.short}?`, `What shall we do with Captain ${y.short}?`, 'Early in the morning!'] },
    { who: 'you', lines: ['vA', 'vG', 'vA', 'end'], words: [`Dunk ${r.he} in the bath with a rubber duckie`, `Dunk ${r.he} in the bath with a rubber duckie`, `Dunk ${r.he} in the bath with a rubber duckie`, 'Early in the morning!'] },
    { who: 'rival', lines: ['vA', 'vG', 'vA', 'end'], words: [`Make ${y.he} scrub the deck with a toothbrush`, `Make ${y.he} scrub the deck with a toothbrush`, `Make ${y.he} scrub the deck with a toothbrush`, 'Early in the morning!'] },
    { who: 'you', lines: ['vA', 'vG', 'vA', 'end'], words: [`Feed ${r.his} hat to a hungry seagull`, `Feed ${r.his} hat to a hungry seagull`, `Feed ${r.his} hat to a hungry seagull`, 'Early in the morning!'] },
    { who: 'you', lines: ['cA', 'cG', 'cA', 'end'], words: ['Way hay and up she rises!', 'Way hay and up she rises!', 'Way hay and up she rises!', 'Early in the morning!'] },
  ];
}

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

// ---- state ----
let deck, team = 'ruby', diff = DIFFS[1], mode = 'title';
let spb = .5, songStart = 0, notes = [], lines = [], endTime = 0;
let score = 0, combo = 0, best = 0, yourTotal = 0, yourPts = 0, rivalTotal = 0, rivalPts = 0;
let dancers = [], pops = [], laneFlash = [0, 0, 0, 0], sparks = [];
let schedUpTo = 0;

// ---- sound: an accordion-ish lead, oom-pah backing, and a honk for misses ----
let ac = null, muted = false, master = null;
function audio() {
  if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = .9; master.connect(ac.destination); } catch (e) { ac = null; } }
  if (ac && ac.state === 'suspended') ac.resume();
}
const hz = m => 440 * Math.pow(2, (m - 69) / 12);
function voice(midi, when, dur, vol = .09) {
  if (!ac || muted) return;
  const g = ac.createGain(), f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2200; f.Q.value = 2;
  g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(vol, when + .02); g.gain.setValueAtTime(vol * .8, when + dur * .7); g.gain.exponentialRampToValueAtTime(.0001, when + dur);
  [-6, 6, 1200].forEach((det, i) => { const o = ac.createOscillator(); o.type = i === 2 ? 'square' : 'sawtooth'; o.frequency.value = hz(midi); o.detune.value = det; const og = ac.createGain(); og.gain.value = i === 2 ? .25 : .5; o.connect(og).connect(f); o.start(when); o.stop(when + dur + .05); });
  f.connect(g).connect(master);
}
function bass(midi, when, dur) {
  if (!ac || muted) return; const o = ac.createOscillator(), g = ac.createGain(); o.type = 'triangle'; o.frequency.value = hz(midi);
  g.gain.setValueAtTime(.16, when); g.gain.exponentialRampToValueAtTime(.0001, when + dur); o.connect(g).connect(master); o.start(when); o.stop(when + dur + .05);
}
function stab(root, when) { const third = root === 62 ? 65 : 64; [root + 12, third + 12, root + 19].forEach(m => voice(m, when, spb * .35, .025)); }
function thump(when, vol = .25) {
  if (!ac || muted) return; const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(140, when); o.frequency.exponentialRampToValueAtTime(50, when + .12);
  g.gain.setValueAtTime(vol, when); g.gain.exponentialRampToValueAtTime(.0001, when + .15); o.connect(g).connect(master); o.start(when); o.stop(when + .2);
}
function honk() {
  if (!ac || muted) return; const t0 = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(220, t0); o.frequency.linearRampToValueAtTime(150, t0 + .25); g.gain.setValueAtTime(.08, t0); g.gain.exponentialRampToValueAtTime(.0001, t0 + .3);
  o.connect(g).connect(master); o.start(t0); o.stop(t0 + .32);
}
$('mute').addEventListener('click', () => { muted = !muted; $('mute').textContent = muted ? 'Sound off' : 'Sound on'; $('mute').setAttribute('aria-pressed', muted); });
const now = () => ac ? ac.currentTime : performance.now() / 1000;

// ---- build the chart ----
function build() {
  spb = 60 / diff.bpm;
  const Y = team, R = team === 'ruby' ? 'cutlass' : 'ruby';
  notes = []; lines = [];
  let beat = 0, prevMidi = null, prevLane = 3;
  sections(Y, R).forEach((sec, si) => {
    sec.lines.forEach((ln, li) => {
      lines.push({ start: beat * spb, end: (beat + 8) * spb, text: sec.words[li], who: sec.who, chord: CHORD[ln], sec: si });
      let b = beat;
      TUNE[ln].forEach(([n, len]) => {
        if (n) {
          const midi = NOTE[n], base = { 60: 0, 62: 0, 64: 1, 65: 1, 67: 2, 69: 3 }[midi], alt = base === 0 ? 1 : base - 1;
          const lane = midi === prevMidi ? (prevLane === base ? alt : base) : base;
          const onBeat = Math.abs(b - Math.round(b)) < 1e-6;
          if (!diff.onBeatOnly || onBeat) notes.push({ t: b * spb, midi, dur: len * spb, lane, who: sec.who, state: 'wait' });
          prevMidi = midi; prevLane = lane;
        }
        b += len;
      });
      beat += 8;
    });
  });
  endTime = beat * spb;
  yourTotal = notes.filter(n => n.who === 'you').length;
  rivalTotal = notes.filter(n => n.who === 'rival').length;
}
function lineAt(st) { return lines.find(l => st >= l.start && st < l.end) || lines[lines.length - 1]; }

// ---- dancers ----
function setupDancers() {
  const R = team === 'ruby' ? 'cutlass' : 'ruby';
  const place = (keys, side) => keys.map((k, i) => ({ k, side, x: side === 'you' ? 70 + i * 62 : VW - 70 - i * 62, front: i === 0, flop: 0, facing: side === 'you' ? 1 : -1 }));
  dancers = [...place(CREWS[team], 'you'), ...place(CREWS[R], 'rival')];
  // captains stand at the front of each group, nearest the middle
  dancers.forEach(d => { if (d.front) d.x = d.side === 'you' ? 270 : VW - 270; });
}
function flop(side) { const pool = dancers.filter(d => d.side === side && d.flop <= 0); if (pool.length) pick(pool).flop = 1.1; }

// ---- flow ----
function faceStyle(key, size) {
  const p = P[key], img = p.img_, s = size / (p.face[2] * img.height);
  return `background-image:url('${p.img}');background-size:${img.width * s}px ${img.height * s}px;background-position:${-(p.face[0] * img.width * s - size / 2)}px ${-(p.face[1] * img.height * s - size / 2)}px`;
}
function buildMenus() {
  ['ruby', 'cutlass'].forEach(k => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'who'; b.dataset.k = k;
    b.innerHTML = `<span class="face" style="${faceStyle(k, 64)}"></span><b>${P[k].name}</b><span class="tier">${CREWS[k].length - 1} crewmates</span>`;
    b.addEventListener('click', () => { team = k; menuState(); });
    $('pick').appendChild(b);
  });
  DIFFS.forEach(d => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.dataset.k = d.key; b.textContent = d.name;
    b.addEventListener('click', () => { diff = d; menuState(); });
    $('diff').appendChild(b);
  });
  menuState();
}
function menuState() {
  document.querySelectorAll('#pick .who').forEach(b => b.setAttribute('aria-pressed', b.dataset.k === team));
  document.querySelectorAll('#diff .opt').forEach(b => b.setAttribute('aria-pressed', b.dataset.k === diff.key));
}
function start() {
  audio(); build(); setupDancers();
  score = combo = best = yourPts = rivalPts = 0; pops = []; sparks = [];
  hud();
  songStart = now() + 4 * spb + .3;                                     // a two-bar count-in
  for (let i = 0; i < 4; i++) thump(songStart - (4 - i) * spb, i === 0 ? .35 : .22);
  schedUpTo = songStart;
  mode = 'play';
  $('titleCard').hidden = true; $('endCard').hidden = true;
}
$('startBtn').addEventListener('click', start);
$('againBtn').addEventListener('click', () => { $('endCard').hidden = true; $('titleCard').hidden = false; mode = 'title'; });
function hud() { $('score').textContent = score; $('combo').textContent = combo; }

// ---- backing band, scheduled a little ahead ----
function schedule() {
  if (!ac) return;
  const horizon = now() + .25;
  while (schedUpTo < horizon && schedUpTo < songStart + endTime) {
    const st = schedUpTo - songStart, beatI = Math.round(st / spb), l = lineAt(st), root = l.chord === 'D' ? 50 : 48;
    if (beatI % 2 === 0) { bass(root, schedUpTo, spb * .9); thump(schedUpTo, .18); } else { bass(root + 7, schedUpTo, spb * .6); stab(root + 12, schedUpTo); }
    schedUpTo += spb;
  }
}

// ---- judging ----
const LANE_KEYS = { ArrowLeft: 0, ArrowDown: 1, ArrowUp: 2, ArrowRight: 3, d: 0, D: 0, f: 1, F: 1, j: 2, J: 2, k: 3, K: 3 };
addEventListener('keydown', e => {
  if (mode !== 'play') return;
  const lane = LANE_KEYS[e.key]; if (lane === undefined || e.repeat) return;
  e.preventDefault(); hit(lane);
});
canvas.addEventListener('pointerdown', e => {
  if (mode !== 'play') return;
  const r = canvas.getBoundingClientRect(); hit(clamp(Math.floor((e.clientX - r.left) / r.width * 4), 0, 3));
});
function hit(lane) {
  audio(); laneFlash[lane] = 1;
  const st = now() - songStart;
  let best_ = null, bd = 1e9;
  notes.forEach(n => { if (n.who === 'you' && n.state === 'wait' && n.lane === lane) { const d = Math.abs(n.t - st); if (d < bd) { bd = d; best_ = n; } } });
  if (!best_ || bd > GOOD) return;                                   // pressing in empty air does nothing
  const perfect = bd <= PERFECT;
  best_.state = 'hit'; voice(best_.midi, now(), Math.max(.12, best_.dur * .9));
  combo++; best = Math.max(best, combo);
  const mult = 1 + Math.floor(combo / 10);
  score += (perfect ? 100 : 60) * mult; yourPts += perfect ? 1 : .6;
  pop(lane, perfect ? 'PERFECT' : 'NICE', perfect ? '#ffe08a' : '#bfe8ff');
  if (combo > 0 && combo % 10 === 0) { pop(lane, `${combo} COMBO!`, '#ff9f68', true); confetti(); }
  hud();
}
function miss(n) {
  n.state = 'miss'; honk(); flop('you');
  if (combo >= 10) pop(n.lane, 'COMBO BROKEN', '#ff6b6b', true); else pop(n.lane, pick(['BONK', 'OOF', 'YIKES', 'NOPE']), '#ff8a8a');
  combo = 0; hud();
}
function pop(lane, text, col, big) { pops.push({ x: HW_X - HW_W / 2 + LANE_W * (lane + .5), y: HIT_Y - 30, text, col, big, life: 0 }); }
function confetti() { for (let i = 0; i < 40; i++) { const a = -Math.PI / 2 + (Math.random() - .5) * 2, v = 200 + Math.random() * 260; sparks.push({ x: HW_X, y: HIT_Y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, col: pick(['#e85d75', '#f2c14e', '#5bc0eb', '#9bc53d', '#c879ff']) }); } }

// ---- update ----
function update(dt) {
  dancers.forEach(d => d.flop = Math.max(0, d.flop - dt));
  laneFlash = laneFlash.map(v => Math.max(0, v - dt * 5));
  pops.forEach(p => { p.life += dt; p.y -= 40 * dt; }); pops = pops.filter(p => p.life < .7);
  sparks.forEach(s => { s.life += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 500 * dt; s.rot = (s.rot || 0) + dt * 8; }); sparks = sparks.filter(s => s.life < 1.6);
  if (mode !== 'play') return;
  schedule();
  const st = now() - songStart;
  notes.forEach(n => {
    if (n.state !== 'wait') return;
    if (n.who === 'rival') {
      // the other crew plays its own part, and fumbles now and then
      if (st >= n.t) { if (Math.random() < diff.rival) { n.state = 'hit'; rivalPts++; voice(n.midi, songStart + n.t, Math.max(.12, n.dur * .9), .07); } else { n.state = 'miss'; honk(); flop('rival'); } }
    } else if (st > n.t + GOOD) miss(n);
  });
  if (st > endTime + .8) finish();
}

function finish() {
  mode = 'end';
  const you = yourTotal ? yourPts / yourTotal : 0, rival = rivalTotal ? rivalPts / rivalTotal : 0;
  const Y = P[team], R = P[team === 'ruby' ? 'cutlass' : 'ruby'], win = you > rival;
  const title = you >= .95 ? 'Legend of the Seven Seas' : you >= .85 ? 'Shanty Star' : you >= .7 ? 'Deck Crooner' : you >= .5 ? 'Off-Key Deckhand' : 'Tone-Deaf Barnacle';
  $('endEyebrow').textContent = win ? `${Y.short}’s crew wins!` : `${R.short}’s crew wins`;
  $('endTitle').textContent = title;
  $('endText').textContent = `Your crew hit ${Math.round(you * 100)}% of the notes, theirs hit ${Math.round(rival * 100)}%. Score ${score}, best combo ${best}. ` +
    (win ? `${R.name} demands a rematch and is pretending not to be upset.` : `${R.name} will not stop humming it. Try ${diff.key === 'chill' ? 'again' : 'a gentler difficulty, or again'}.`);
  $('endCard').hidden = false; $('againBtn').focus();
}

// ---- drawing ----
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function drawDancer(d, st, singing) {
  const p = P[d.k], h = H * p.size * (d.front ? 1.12 : 1), beat = st / spb;
  const hop = singing && !reduceMotion ? Math.abs(Math.sin(beat * Math.PI)) * 10 : 0;
  const rot = d.flop > 0 ? Math.min(1, (1.1 - d.flop) * 6) * 1.45 * (d.flop > .25 ? 1 : d.flop / .25) : 0;
  ctx.save(); ctx.translate(d.x, GY);
  ctx.fillStyle = 'rgba(40,25,10,.26)'; ctx.beginPath(); ctx.ellipse(0, 0, h * .2, 6, 0, 0, 7); ctx.fill();
  ctx.rotate(rot * d.facing);
  if (p.walk && singing && d.flop <= 0) {
    // marching on the spot, one step per beat
    const wk = p.walk, wh = h * wk.fh / (wk.fh - 4), ww = wk.fw * wh / wk.fh, fr = Math.floor(beat * 2) % wk.frames;
    if (d.facing < 0) ctx.scale(-1, 1);
    ctx.drawImage(p.walkImg, ((fr % wk.frames) + wk.frames) % wk.frames * wk.fw, 0, wk.fw, wk.fh, -wk.ax * wh / wk.fh, -wh + 4 * wh / wk.fh - hop, ww, wh);
  } else {
    const img = p.img_, w = img.width * h / img.height;
    ctx.drawImage(img, -w / 2, -h - hop, w, h);
  }
  ctx.restore();
}
function render() {
  ctx.setTransform(K, 0, 0, K, 0, 0);
  ctx.imageSmoothingQuality = 'high';
  const bw = deck.width * BG_H / deck.height;
  ctx.drawImage(deck, -(bw - VW) * .45, BG_YOFF, bw, BG_H);
  if (mode === 'title') return;
  const st = now() - songStart, l = lineAt(Math.max(0, st)), singing = st >= 0 && st < endTime ? l.who : null;

  // the crews
  [...dancers].sort((a, b) => (a.front ? 1 : 0) - (b.front ? 1 : 0)).forEach(d => drawDancer(d, st, singing === d.side));

  // highway
  const hx = HW_X - HW_W / 2;
  ctx.fillStyle = 'rgba(15,26,34,.55)'; rr(hx - 8, TOP_Y - 20, HW_W + 16, HIT_Y - TOP_Y + 60, 12); ctx.fill();
  for (let i = 0; i < 4; i++) {
    if (laneFlash[i] > 0) { ctx.fillStyle = `rgba(255,224,138,${laneFlash[i] * .25})`; ctx.fillRect(hx + i * LANE_W, TOP_Y - 12, LANE_W, HIT_Y - TOP_Y + 44); }
    if (i) { ctx.fillStyle = 'rgba(243,230,204,.12)'; ctx.fillRect(hx + i * LANE_W - 1, TOP_Y - 12, 2, HIT_Y - TOP_Y + 44); }
  }
  ctx.strokeStyle = singing === 'you' ? '#ffe08a' : 'rgba(243,230,204,.45)'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(hx, HIT_Y); ctx.lineTo(hx + HW_W, HIT_Y); ctx.stroke();
  const ARR = ['◀', '▼', '▲', '▶'];
  ctx.font = '700 18px "Alegreya Sans", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let i = 0; i < 4; i++) { ctx.fillStyle = 'rgba(243,230,204,.5)'; ctx.fillText(ARR[i], hx + LANE_W * (i + .5), HIT_Y + 22); }

  // notes
  notes.forEach(n => {
    if (n.state === 'hit') return;
    const dtn = n.t - st; if (dtn > LEAD || dtn < -.4) return;
    const y = HIT_Y - dtn / LEAD * (HIT_Y - TOP_Y), x = hx + LANE_W * (n.lane + .5), mine = n.who === 'you';
    ctx.globalAlpha = n.state === 'miss' ? .3 : mine ? 1 : .45;
    if (n.dur >= spb * 1.5) { ctx.fillStyle = mine ? 'rgba(255,224,138,.35)' : 'rgba(200,200,200,.25)'; const tail = n.dur / LEAD * (HIT_Y - TOP_Y); rr(x - 7, y - tail, 14, tail, 7); ctx.fill(); }
    const g = ctx.createRadialGradient(x - 5, y - 5, 2, x, y, 20); g.addColorStop(0, mine ? '#fff3c4' : '#e6e6e6'); g.addColorStop(1, mine ? '#d2a24c' : '#7d8a93');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 18, 0, 7); ctx.fill();
    ctx.strokeStyle = mine ? '#7a5520' : '#4a555c'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = mine ? '#3a2816' : '#2a3338'; ctx.font = '700 15px "Alegreya Sans", sans-serif'; ctx.fillText(ARR[n.lane], x, y + 1);
    ctx.globalAlpha = 1;
  });

  // who's singing + the words
  if (st < 0) {
    const n = Math.ceil(-st / spb);
    ctx.font = '64px "Pirata One", Georgia, serif'; ctx.fillStyle = '#fff3c4'; ctx.strokeStyle = 'rgba(40,20,10,.8)'; ctx.lineWidth = 7;
    ctx.strokeText(n > 4 ? '' : String(n), HW_X, 250); ctx.fillText(n > 4 ? '' : String(n), HW_X, 250);
  } else if (st < endTime) {
    const label = l.who === 'you' ? `YOUR CREW, SING!` : `${P[team === 'ruby' ? 'cutlass' : 'ruby'].short.toUpperCase()}’S CREW`;
    ctx.font = '700 13px "Alegreya Sans", sans-serif'; ctx.fillStyle = l.who === 'you' ? '#ffe08a' : 'rgba(243,230,204,.7)'; ctx.fillText(label, HW_X, TOP_Y - 6);
    ctx.font = '24px "IM Fell English", Georgia, serif';
    const w = Math.min(VW - 40, ctx.measureText(l.text).width + 40);
    ctx.fillStyle = 'rgba(243,230,204,.94)'; rr(HW_X - w / 2, 14, w, 40, 6); ctx.fill();
    const prog = clamp((st - l.start) / (l.end - l.start), 0, 1);
    ctx.fillStyle = 'rgba(210,162,76,.35)'; rr(HW_X - w / 2, 14, w * prog, 40, 6); ctx.fill();
    ctx.fillStyle = '#3a2816'; ctx.fillText(l.text, HW_X, 35);
  }

  pops.forEach(p => { ctx.globalAlpha = 1 - p.life / .7; ctx.font = `${p.big ? 30 : 22}px "Pirata One", Georgia, serif`; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(30,15,5,.8)'; ctx.fillStyle = p.col; ctx.strokeText(p.text, p.x, p.y); ctx.fillText(p.text, p.x, p.y); });
  ctx.globalAlpha = 1;
  sparks.forEach(s => { ctx.save(); ctx.globalAlpha = 1 - s.life / 1.6; ctx.translate(s.x, s.y); ctx.rotate(s.rot); ctx.fillStyle = s.col; ctx.fillRect(-4, -2.5, 8, 5); ctx.restore(); });
}

// ---- loop ----
let last = 0;
function frame(nowMs) { const dt = Math.min(.05, (nowMs - last) / 1000 || 0); last = nowMs; update(dt); render(); requestAnimationFrame(frame); }
function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Could not load ' + src)); i.src = src; }); }

(async () => {
  resize();
  try { await Promise.race([document.fonts.load('24px "IM Fell English"'), document.fonts.load('30px "Pirata One"'), new Promise(r => setTimeout(r, 1500))]); } catch (e) {}
  [deck] = await Promise.all([loadImg('ship-deck.jpg'), ...Object.values(P).map(async p => { p.img_ = await loadImg(p.img); if (p.walk) p.walkImg = await loadImg(p.walk.img); })]);
  buildMenus();
  requestAnimationFrame(t0 => { last = t0; requestAnimationFrame(frame); });
})();
})();
