(() => {
'use strict';
// ---- stage constants (logical 960x540) ----
const VW = 960, VH = 540, BG_H = 600;
const START_X = 250, IT_X = 770, TAG_DIST = 70, LANE_GAP = 75;   // walkers start in a loose line, LANE_GAP apart
const GRACE = .14;                       // seconds after "it" faces you before movement counts
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Walk-cycle sheets (side view, facing right). lifted = frames with one foot off the ground.
const C = {
  ember: { name: 'Ember', img: 'ember.png', frames: 4, fw: 291, fh: 357, ax: 155, h: 196, cycle: 120, speed: 118, delay: .02,
           caught: 'Oh, fiddlesticks!' },
  lila:  { name: 'Lila-Bella', img: 'lila-bella.png', frames: 4, fw: 282, fh: 356, ax: 152, h: 160, cycle: 110, speed: 104, delay: .32,
           caught: 'But I was being SO quiet!' },
  blue:  { name: 'Icy-Blue Prince', img: 'blue-prince.png', frames: 8, fw: 253, fh: 420, ax: 123, h: 212, cycle: 210, speed: 124, delay: .05, lifted: [2, 6],
           caught: 'A prince never wobbles! …Usually.' },
  ivory: { name: 'Ivory & Gold Prince', img: 'ivory-prince.png', frames: 8, fw: 231, fh: 420, ax: 113, h: 214, cycle: 185, speed: 124, delay: .05, lifted: [2, 6],
           caught: 'I was merely… admiring the view.' },
};
const ROUNDS = [
  { place: 'Castle Valley', img: 'castle-valley.jpg', camX: 820, yoff: -24, ground: 506, it: 'blue', walkers: ['ember', 'lila', 'ivory'],
    beat: () => .5, look: () => 1.7, tricks: false, squeak: false },
  { place: 'Lavender Fields', img: 'lavender-fields.jpg', camX: 830, yoff: -56, ground: 494, it: 'ivory', walkers: ['ember', 'lila', 'blue'],
    beat: () => .22 + Math.random() * .5, look: () => 1.3 + Math.random() * 1.2, tricks: false, squeak: true },
  { place: 'Aspen Meadow', img: 'aspen-meadow.jpg', camX: 660, yoff: -36, ground: 502, it: 'ember', walkers: ['lila', 'blue', 'ivory'],
    beat: () => .18 + Math.random() * .55, look: () => 1.2 + Math.random() * 1.6, tricks: true, squeak: true },
];
const CHANT = ['Grand-', 'mo-', 'ther’s', 'foot-', 'STEPS!'];
const NOTES = [392, 330, 440, 392, 523];
const SPOT = ['I see you, {n}!', '{n}! Back to the start!', 'Ha! {n}, I saw that!', 'Caught you, {n}!'];
const LANES = [{ dy: -44, s: .82 }, { dy: -16, s: .91 }, { dy: 14, s: 1 }];

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
let mode = 'title', round = 0, R = ROUNDS[0], t = 0, clock = 0, caught = 0, totalCaught = 0, totalTime = 0;
let hold = false, walkers = [];
const it = { phase: 'chant', syl: -1, timer: 0, dur: .5, flip: 1, say: '', sayT: 0, early: false };
let chantShown = [], squeak = null, tagged = null, confetti = [];

// ---- sound ----
let ac = null, muted = false;
function audio() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } } if (ac && ac.state === 'suspended') ac.resume(); }
function tone(freqs, dur, type = 'triangle', vol = .05, gap = .06) {
  if (!ac || muted) return; const t0 = ac.currentTime;
  freqs.forEach((f, i) => { const o = ac.createOscillator(), g = ac.createGain(), s = t0 + i * gap; o.type = type; o.frequency.value = f; g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(vol, s + .01); g.gain.exponentialRampToValueAtTime(.0001, s + dur); o.connect(g).connect(ac.destination); o.start(s); o.stop(s + dur + .05); });
}
function swoosh() { if (!ac || muted) return; const o = ac.createOscillator(), g = ac.createGain(), s = ac.currentTime; o.type = 'sine'; o.frequency.setValueAtTime(300, s); o.frequency.exponentialRampToValueAtTime(1200, s + .18); g.gain.setValueAtTime(.05, s); g.gain.exponentialRampToValueAtTime(.0001, s + .22); o.connect(g).connect(ac.destination); o.start(s); o.stop(s + .25); }
$('mute').addEventListener('click', () => { muted = !muted; $('mute').textContent = muted ? 'Sound off' : 'Sound on'; $('mute').setAttribute('aria-pressed', muted); });

// ---- input ----
const sneakBtn = $('sneak');
function setHold(v) { if (mode !== 'play') v = false; hold = v; sneakBtn.classList.toggle('held', v); }
addEventListener('keydown', e => {
  if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
    if (e.target.closest && e.target.closest('button') && mode !== 'play') return;
    e.preventDefault(); audio(); setHold(true);
  }
});
addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') setHold(false); });
addEventListener('blur', () => setHold(false));
sneakBtn.addEventListener('pointerdown', e => { e.preventDefault(); audio(); sneakBtn.setPointerCapture?.(e.pointerId); setHold(true); });
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => sneakBtn.addEventListener(ev, () => setHold(false)));

// ---- rounds ----
function startRound(i) {
  round = i; R = ROUNDS[i]; clock = 0; caught = 0; tagged = null; confetti = []; squeak = null;
  walkers = R.walkers.map((k, lane) => ({ k, x: START_X - lane * LANE_GAP, phase: lane * 23, moving: false, coast: 0, wobble: 0, back: false, lane, say: '', sayT: 0 }));
  Object.assign(it, { phase: 'turnback', timer: 0, dur: .6, flip: -1, say: '', sayT: 0 });
  chantShown = [];
  $('placeName').textContent = R.place; $('roundNum').textContent = `Round ${i + 1} of ${ROUNDS.length}`;
  $('caught').textContent = 0;
  mode = 'play';
  ['titleCard', 'roundCard'].forEach(c => $(c).hidden = true);
  sneakBtn.focus({ preventScroll: true });
}
$('startBtn').addEventListener('click', () => { audio(); totalCaught = 0; totalTime = 0; startRound(0); });
$('nextBtn').addEventListener('click', () => {
  if (round + 1 < ROUNDS.length) startRound(round + 1);
  else { totalCaught = 0; totalTime = 0; startRound(0); }
});

function nextBeat() {
  it.syl++;
  if (it.syl >= CHANT.length) { it.phase = 'turn'; it.timer = 0; it.dur = .2; swoosh(); return; }
  chantShown.push(CHANT[it.syl]); tone([NOTES[it.syl]], .3, 'sine', .05);
  it.timer = 0; it.dur = R.beat();
  // round 3: sometimes a sneaky early turn after "ther's"
  if (R.tricks && it.syl === 2 && Math.random() < .22) { it.early = true; it.dur = .25; }
  // round 3: sometimes a long dramatic pause
  else if (R.tricks && Math.random() < .15) it.dur += .9;
}

function spin(early) {
  it.phase = 'turn'; it.timer = 0; it.dur = .2; swoosh();
  if (early) it.say = pick(['Ha! Tricked you!', 'Bet you didn’t expect that!', 'Sneaky me!']), it.sayT = 1.4;
}

function look() {
  walkers.forEach(w => {
    if (w.back || w.out) return;   // already caught this time round
    const moving = w.moving || w.wobble > 0;
    if (moving) {
      w.back = true; caught++; totalCaught++; $('caught').textContent = caught;
      w.say = C[w.k].caught; w.sayT = 2;
      it.say = pick(SPOT).replace('{n}', C[w.k].name); it.sayT = 1.6;
      tone([330, 262, 196], .3, 'triangle', .06, .1);
    }
  });
}

// ---- update ----
function update(dt) {
  t += dt;
  if (mode !== 'play') { tickFx(dt); return; }
  clock += dt; $('time').textContent = clock.toFixed(1);

  // "it"
  it.timer += dt; it.sayT = Math.max(0, it.sayT - dt);
  if (it.phase === 'chant') {
    if (it.timer >= it.dur) {
      if (it.early) { it.early = false; spin(true); }
      else nextBeat();
    }
    // the chinchilla squeaks... and "it" hears it
    if (R.squeak && !squeak && it.syl >= 0 && it.syl < 3 && Math.random() < dt * .12) {
      const lila = walkers.find(w => w.k === 'lila');
      if (lila && !lila.back) { squeak = { w: lila, t: 0 }; tone([1800, 2200], .12, 'square', .02, .06); lila.say = 'Squeak!'; lila.sayT = .9; }
    }
  } else if (it.phase === 'turn') {
    it.flip = 1 - 2 * Math.min(1, it.timer / it.dur);       // 1 = facing away, -1 = facing you
    if (it.timer >= it.dur) { it.phase = 'look'; it.timer = 0; it.dur = R.look(); it.checked = false; chantShown = []; }
  } else if (it.phase === 'look') {
    it.flip = -1;
    if (!it.checked && it.timer >= GRACE) { it.checked = true; look(); }
    else if (it.checked) look();                             // keep watching the whole time
    if (it.timer >= it.dur) { it.phase = 'turnback'; it.timer = 0; it.dur = .3; walkers.forEach(w => w.out = false); }
  } else if (it.phase === 'turnback') {
    it.flip = -1 + 2 * Math.min(1, it.timer / it.dur);
    if (it.timer >= it.dur) { it.phase = 'chant'; it.syl = -1; it.timer = 0; it.dur = .45; it.flip = 1; }
  }
  if (squeak) {
    squeak.t += dt;
    if (squeak.t > .75 && it.phase === 'chant') { it.say = 'What was that?!'; it.sayT = 1.4; spin(false); squeak = null; }
    else if (squeak.t > .75) squeak = null;
  }

  // walkers
  walkers.forEach(w => {
    const c = C[w.k];
    w.sayT = Math.max(0, w.sayT - dt);
    if (w.back) {                                            // trudge back to the start
      w.moving = true; w.wobble = 0;
      const d = (START_X - w.lane * LANE_GAP) - w.x;
      w.x += Math.max(d, -330 * dt); w.phase += Math.min(330 * dt, -d);
      if (Math.abs(d) < 2) { w.back = false; w.moving = false; w.out = true; }
      return;
    }
    if (w.out) { w.moving = false; w.wobble = 0; w.coast = 0; return; }
    if (hold) w.coast = c.delay; else w.coast = Math.max(0, w.coast - dt);
    const go = hold || w.coast > 0;
    if (go) {
      const step = c.speed * dt * (w.k === 'lila' && !hold ? 1.15 : 1);
      w.x += step; w.phase += step; w.moving = true; w.wobble = 0;
    } else {
      if (w.moving && c.lifted) {                           // froze with a foot in the air
        const fr = Math.floor(w.phase / (c.cycle / c.frames)) % c.frames;
        if (c.lifted.includes(fr)) w.wobble = .75;
      }
      w.moving = false; w.wobble = Math.max(0, w.wobble - dt);
    }
    if (!tagged && w.x >= IT_X - TAG_DIST) tag(w);
  });
  tickFx(dt);
}

function tag(w) {
  tagged = w; mode = 'tagged'; setHold(false);
  it.say = pick(['Aww! You got me!', 'Tagged! No fair!', 'How did I not hear you?!']); it.sayT = 2.5;
  w.say = 'TAG!'; w.sayT = 2.5;
  tone([523, 659, 784, 1047], .5, 'triangle', .06, .1);
  for (let i = 0; i < 60; i++) confetti.push({ x: IT_X - 30, y: R.ground - 180, vx: (Math.random() - .5) * 420, vy: -150 - Math.random() * 320, r: Math.random() * 7, c: pick(['#d9707f', '#d8a446', '#9fc7e8', '#b79ad6', '#fff6dc']), life: 0 });
  totalTime += clock;
  setTimeout(() => {
    mode = 'card';
    const stars = caught === 0 ? 3 : caught <= 2 ? 2 : 1;
    const last = round + 1 >= ROUNDS.length;
    $('roundEyebrow').textContent = last ? 'All three rounds done' : 'Tag!';
    $('roundTitle').textContent = `${C[w.k].name} tagged ${C[R.it].name}!`;
    $('roundText').textContent = last
      ? `Total time ${totalTime.toFixed(1)} seconds, with ${totalCaught} trip${totalCaught === 1 ? '' : 's'} back to the start. ${totalCaught === 0 ? 'Not a single wobble. Perfect statues!' : 'Play again for a perfect game?'}`
      : `${clock.toFixed(1)} seconds, caught ${caught} time${caught === 1 ? '' : 's'}. Next up: ${ROUNDS[round + 1].place}, where ${C[ROUNDS[round + 1].it].name} is “it”.`;
    const star = on => `<svg viewBox="0 0 24 24" class="${on ? '' : 'off'}" aria-hidden="true"><path fill="currentColor" d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 20.9l1.6-7L2 9.2l7.1-.6z"/></svg>`;
    $('stars').innerHTML = [0, 1, 2].map(i => star(i < stars)).join('');
    $('stars').setAttribute('aria-label', `${stars} of 3 stars`);
    $('nextBtn').textContent = last ? 'Play again' : 'Next round';
    $('roundCard').hidden = false; $('nextBtn').focus();
  }, 2200);
}
function tickFx(dt) { confetti.forEach(p => { p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 520 * dt; p.vx *= .99; }); confetti = confetti.filter(p => p.life < 2.5); }

// ---- drawing ----
function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function bubble(x, y, text, big) {
  ctx.font = (big ? '22px' : '18px') + ' "IM Fell English", Georgia, serif';
  const w = ctx.measureText(text).width + 26, h = big ? 36 : 30, bx = clamp(x - w / 2, 8, VW - w - 8), by = Math.max(46, y - h - 14), tip = clamp(x, bx + 14, bx + w - 14);
  ctx.fillStyle = 'rgba(0,0,0,.18)'; roundRect(bx + 2, by + 3, w, h, 12); ctx.fill();
  ctx.fillStyle = '#fffaf0'; roundRect(bx, by, w, h, 12); ctx.fill();
  ctx.beginPath(); ctx.moveTo(tip - 8, by + h - 1); ctx.lineTo(tip, by + h + 10); ctx.lineTo(tip + 8, by + h - 1); ctx.fill();
  ctx.fillStyle = '#3a2a1a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, bx + w / 2, by + h / 2 + 1);
}
function drawChar(k, x, ground, scale, facing, frame, rot) {
  const c = C[k], h = c.h * scale, wh = h * c.fh / (c.fh - 4), ww = c.fw * wh / c.fh;
  ctx.fillStyle = 'rgba(30,25,15,.25)'; ctx.beginPath(); ctx.ellipse(x, ground, ww * .3, 7 * scale, 0, 0, 7); ctx.fill();
  ctx.save(); ctx.translate(x, ground); if (rot) ctx.rotate(rot); ctx.scale(facing, 1);
  ctx.drawImage(c.img_, frame * c.fw, 0, c.fw, c.fh, -c.ax * wh / c.fh, -wh + 4 * wh / c.fh, ww, wh);
  ctx.restore();
  return ground - h;
}

function render() {
  ctx.setTransform(K, 0, 0, K, 0, 0);
  ctx.imageSmoothingQuality = 'high';
  const bw = R.bg.width * BG_H / R.bg.height;
  ctx.drawImage(R.bg, -R.camX, R.yoff, bw, BG_H);

  // "it", turning on the spot (squash through the middle of the turn)
  const fx = Math.abs(it.flip) < .08 ? .08 * Math.sign(it.flip || 1) : it.flip;
  const itHead = drawChar(R.it, IT_X, R.ground - 12, .96, fx, 0, 0);

  // the sneaks, back lane first
  const heads = [];
  [...walkers].sort((a, b) => a.lane - b.lane).forEach(w => {
    const c = C[w.k], L = LANES[w.lane];
    const fr = ((Math.floor(w.phase / (c.cycle / c.frames)) % c.frames) + c.frames) % c.frames;
    const rot = w.wobble > 0 ? Math.sin(t * 26) * .05 * (w.wobble / .75 + .3) : 0;
    const head = drawChar(w.k, w.x, R.ground + L.dy, L.s, w.back ? -1 : 1, fr, rot);
    heads.push({ w, x: w.x, y: head });
  });

  confetti.forEach(p => { ctx.save(); ctx.globalAlpha = Math.max(0, 1 - p.life / 2.5); ctx.translate(p.x, p.y); ctx.rotate(p.life * 8 + p.r); ctx.fillStyle = p.c; ctx.fillRect(-4, -2.5, 8, 5); ctx.restore(); });

  // the chant, big across the top so you can feel the rhythm
  if (mode === 'play' || mode === 'tagged') {
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    if (it.phase === 'chant' && chantShown.length) {
      ctx.font = '40px "IM Fell English SC", Georgia, serif';
      const text = chantShown.join(' ').replace(/- /g, '');
      ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(40,30,15,.55)'; ctx.fillStyle = '#fffaf0';
      ctx.strokeText(text, VW / 2, 92); ctx.fillText(text, VW / 2, 92);
    } else if (it.phase === 'look' || it.phase === 'turn') {
      ctx.font = '46px "IM Fell English SC", Georgia, serif';
      ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(80,20,20,.6)'; ctx.fillStyle = '#ffd9d9';
      ctx.strokeText('FREEZE!', VW / 2, 96); ctx.fillText('FREEZE!', VW / 2, 96);
    }
  }
  if (it.sayT > 0 && it.say) bubble(IT_X, itHead - 6, it.say, true);
  // stack bubbles by lane so several shouts at once stay readable
  const topHead = Math.min(...heads.map(h => h.y));
  heads.forEach(h => { if (h.w.sayT > 0 && h.w.say) bubble(h.x, Math.min(h.y, topHead) - 4 - (2 - h.w.lane) * 40, h.w.say); });

  // tag line
  ctx.strokeStyle = 'rgba(255,250,235,.5)'; ctx.setLineDash([6, 8]); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(IT_X - TAG_DIST, R.ground - 40); ctx.lineTo(IT_X - TAG_DIST - 20, R.ground + 26); ctx.stroke(); ctx.setLineDash([]);
}

// ---- loop ----
let last = 0;
function frame(now) { const dt = Math.min(.05, (now - last) / 1000 || 0); last = now; update(dt); render(); requestAnimationFrame(frame); }
function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Could not load ' + src)); i.src = src; }); }

(async () => {
  resize();
  try { await Promise.race([document.fonts.load('40px "IM Fell English SC"'), document.fonts.load('18px "IM Fell English"'), new Promise(r => setTimeout(r, 1500))]); } catch (e) {}
  await Promise.all([...Object.values(C).map(async c => { c.img_ = await loadImg(c.img); }), ...ROUNDS.map(async r => { r.bg = await loadImg(r.img); })]);
  // resting scene behind the title card
  walkers = R.walkers.map((k, lane) => ({ k, x: START_X + 40 - lane * LANE_GAP, phase: lane * 23, moving: false, coast: 0, wobble: 0, back: false, lane, say: '', sayT: 0 }));
  requestAnimationFrame(now => { last = now; requestAnimationFrame(frame); });
})();
})();
