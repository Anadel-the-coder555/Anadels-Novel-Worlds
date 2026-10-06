(() => {
'use strict';
// ---- stage constants (logical 960x540) ----
const VW = 960, VH = 540;
const TABLE_TOP = 372, BOX_BASE = 402, CLOTH_TOP = 412;
const BOX_W = 118, BOX_H = 100, LIFT = 150, CH_H = 104;
const MAX_TRIES = 3;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const stage = document.getElementById('stage');
const $ = id => document.getElementById(id);
let K = 1;
function resize() {
  const r = canvas.getBoundingClientRect();
  if (!r.width) return;
  K = Math.min(2.5, (r.width / VW) * (window.devicePixelRatio || 1));
  canvas.width = Math.round(VW * K);
  canvas.height = Math.round(VH * K);
}
new ResizeObserver(resize).observe(canvas);

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = u => u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

function loadBest() { try { return +localStorage.getItem('chinchilla-shells-best') || 0; } catch (e) { return 0; } }
function saveBest(v) { try { localStorage.setItem('chinchilla-shells-best', v); } catch (e) {} }

// ---- state ----
let lila, chin, LW = 280, CW = 74;
let mode = 'title';            // title | play | end
let phase = 'idle', phaseT = 0;
let round = 1, found = 0, tries = MAX_TRIES, best = loadBest();
let boxes = [], hiddenIn = 0, swapsLeft = 0, swap = null, swapDur = .5, chosen = -1, hover = -1;
let bounce = 0, parts = [], t = 0;

function slotX(n, i) {
  return n === 3 ? [530, 690, 850][i] : [470, 600, 730, 860][i];
}
function boxInSlot(s) { return boxes.findIndex(b => b.slot === s); }

// ---- sound ----
let ac = null, muted = false;
function audio() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } } if (ac && ac.state === 'suspended') ac.resume(); }
function tone(freqs, dur, type = 'sine', vol = .06, gap = .06) {
  if (!ac || muted) return; const t0 = ac.currentTime;
  freqs.forEach((f, i) => { const o = ac.createOscillator(), g = ac.createGain(), s = t0 + i * gap; o.type = type; o.frequency.value = f; g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(vol, s + .01); g.gain.exponentialRampToValueAtTime(.0001, s + dur); o.connect(g).connect(ac.destination); o.start(s); o.stop(s + dur + .05); });
}
$('mute').addEventListener('click', () => { muted = !muted; $('mute').textContent = muted ? 'Sound off' : 'Sound on'; $('mute').setAttribute('aria-pressed', muted); });

// ---- HUD and speech ----
const pawSvg = on => `<svg viewBox="0 0 24 24" class="${on ? '' : 'out'}" aria-hidden="true"><g fill="#8a5fa8"><ellipse cx="12" cy="15.5" rx="5.5" ry="4.6"/><circle cx="5.5" cy="9.5" r="2.4"/><circle cx="9.5" cy="5.8" r="2.4"/><circle cx="14.5" cy="5.8" r="2.4"/><circle cx="18.5" cy="9.5" r="2.4"/></g></svg>`;
function hud() {
  $('round').textContent = round; $('found').textContent = found; $('best').textContent = best;
  $('tries').innerHTML = Array.from({ length: MAX_TRIES }, (_, i) => pawSvg(i < tries)).join('');
  $('tries').setAttribute('aria-label', `Guesses left: ${tries} of ${MAX_TRIES}`);
}
function say(text) { const b = $('bubble'); b.textContent = text; b.classList.toggle('on', !!text); }

// ---- round flow ----
function startRound() {
  const n = round >= 5 ? 4 : 3;
  boxes = Array.from({ length: n }, (_, i) => ({ slot: i, x: slotX(n, i), off: 0, lift: 0 }));
  hiddenIn = Math.floor(Math.random() * n);
  swapsLeft = Math.min(16, 3 + round + (round >= 5 ? 1 : 0));
  swapDur = Math.max(reduceMotion ? .3 : .17, .56 - (round - 1) * .04);
  chosen = -1; hover = -1; swap = null;
  setPhase('lift');
  say(pick(['Watch closely, it’s about to hide!', 'Here it goes…', 'Ready? Eyes on the chinchilla!']));
  hud();
}
function setPhase(p) { phase = p; phaseT = 0; stage.classList.toggle('picking', p === 'pick'); }

function choose(i) {
  if (mode !== 'play' || phase !== 'pick' || i < 0 || i >= boxes.length) return;
  chosen = i; hover = -1;
  const right = i === hiddenIn;
  if (right) {
    found++; bounce = 1;
    const x = boxes[i].x;
    for (let k = 0; k < 30; k++) parts.push({ x, y: BOX_BASE - 60, vx: (Math.random() - .5) * 320, vy: -120 - Math.random() * 220, life: 0, max: 1.2 + Math.random() * .5, col: pick(['#b79ad6', '#e6b3c8', '#f2d27a', '#fffaf0']), rot: Math.random() * 6 });
    tone([659, 880, 1047, 1319], .4, 'triangle', .05, .07);
    say(pick(['Found it! Clever you.', 'There it is! You have sharp eyes.', 'Yes! That’s the one.', 'You found it again!']));
  } else {
    tries--;
    tone([294, 220], .35, 'sine', .08, .12);
    say(tries > 0 ? 'Not that one! It was over here.' : 'Oh no, it was over here all along.');
  }
  hud();
  setPhase('reveal');
}

function nextAfterReveal() {
  const right = chosen === hiddenIn;
  if (tries <= 0) return endGame();
  if (right) round++;
  startRound();
}

function endGame() {
  mode = 'end'; setPhase('idle');
  const isBest = found > best;
  if (isBest) { best = found; saveBest(best); }
  $('endTitle').textContent = found >= 8 ? 'Nothing escapes you' : found >= 4 ? 'A sharp eye' : found >= 1 ? 'A keen eye' : 'The chinchilla wins this time';
  $('endText').textContent = `You found the chinchilla ${found} time${found === 1 ? '' : 's'} and reached round ${round}.` + (isBest ? ' That’s a new best!' : ` Your best is ${best}.`);
  hud();
  setTimeout(() => { $('endCard').hidden = false; $('againBtn').focus(); say(''); }, 300);
}

function begin() {
  audio();
  mode = 'play'; round = 1; found = 0; tries = MAX_TRIES; parts = [];
  $('titleCard').hidden = true; $('endCard').hidden = true;
  startRound();
}
$('startBtn').addEventListener('click', begin);
$('againBtn').addEventListener('click', begin);

// ---- input ----
function stagePoint(e) { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * VW, (e.clientY - r.top) / r.height * VH]; }
function boxAt(x, y) {
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    if (Math.abs(x - b.x) < BOX_W * .56 && y > BOX_BASE - BOX_H - 30 && y < BOX_BASE + 16) return i;
  }
  return -1;
}
canvas.addEventListener('pointermove', e => { if (phase === 'pick') { const [x, y] = stagePoint(e); hover = boxAt(x, y); } });
canvas.addEventListener('pointerleave', () => { hover = -1; });
canvas.addEventListener('pointerdown', e => { if (phase === 'pick') { const [x, y] = stagePoint(e); choose(boxAt(x, y)); } });
addEventListener('keydown', e => {
  if (mode !== 'play') return;
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= boxes.length) { e.preventDefault(); choose(boxInSlot(n - 1)); }
});

// ---- update ----
function update(dt) {
  t += dt; phaseT += dt;
  bounce = Math.max(0, bounce - dt * 1.6);
  switch (phase) {
    case 'lift': { const u = clamp(phaseT / .4, 0, 1); boxes.forEach(b => b.lift = ease(u) * LIFT); if (u >= 1) setPhase('hold'); break; }
    case 'hold': if (phaseT > 1.15) setPhase('lower'); break;
    case 'lower': { const u = clamp(phaseT / .38, 0, 1); boxes.forEach(b => b.lift = (1 - ease(u)) * LIFT); if (u >= 1) { tone([392], .12, 'sine', .04); setPhase('shuffle'); say(pick(['Keep your eye on it…', 'Round and round they go…', 'Don’t blink!'])); } break; }
    case 'shuffle': {
      if (!swap) {
        if (swapsLeft <= 0) { setPhase('pick'); say(pick(['Which hatbox is it under?', 'Where did it go?', 'Which one do you think?'])); break; }
        const n = boxes.length; let s1 = Math.floor(Math.random() * n), s2;
        do { s2 = Math.floor(Math.random() * n); } while (s2 === s1);
        swap = { a: boxInSlot(s1), b: boxInSlot(s2), s1, s2, u: 0 };
        tone([520 + Math.random() * 80], .08, 'triangle', .02);
      }
      swap.u = Math.min(1, swap.u + dt / swapDur);
      const e = ease(swap.u), arc = Math.sin(Math.PI * swap.u), n = boxes.length;
      const A = boxes[swap.a], B = boxes[swap.b];
      A.x = lerp(slotX(n, swap.s1), slotX(n, swap.s2), e); A.off = -arc * 24;   // passes behind
      B.x = lerp(slotX(n, swap.s2), slotX(n, swap.s1), e); B.off = arc * 14;    // passes in front
      if (swap.u >= 1) { A.slot = swap.s2; B.slot = swap.s1; A.off = B.off = 0; swap = null; swapsLeft--; }
      break;
    }
    case 'reveal': {
      const u = clamp(phaseT / .4, 0, 1);
      boxes[chosen].lift = ease(u) * LIFT;
      if (chosen !== hiddenIn) boxes[hiddenIn].lift = ease(clamp((phaseT - .45) / .4, 0, 1)) * LIFT;
      if (phaseT > 2.1) nextAfterReveal();
      break;
    }
  }
  parts.forEach(p => { p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 420 * dt; p.vx *= .99; p.rot += dt * 5; });
  parts = parts.filter(p => p.life < p.max);
}

// ---- drawing ----
let room = null;
function paintRoom() {
  const c = document.createElement('canvas'); c.width = VW * 2; c.height = VH * 2;
  const g = c.getContext('2d'); g.scale(2, 2);
  // striped wallpaper with a small gold sprig
  g.fillStyle = '#e8dcf1'; g.fillRect(0, 0, VW, TABLE_TOP);
  for (let x = 0; x < VW; x += 36) { g.fillStyle = '#ddcdea'; g.fillRect(x, 0, 14, TABLE_TOP); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x + 14, 0, 1.2, TABLE_TOP); }
  for (let x = 25, r = 0; x < VW; x += 72) for (let y = 30 + (r++ % 2) * 40; y < 250; y += 80) {
    g.fillStyle = 'rgba(200,160,80,.45)'; g.beginPath(); g.ellipse(x - 4, y, 4, 2, -.6, 0, 7); g.ellipse(x + 4, y, 4, 2, .6, 0, 7); g.fill();
    g.fillStyle = 'rgba(180,120,170,.55)'; g.beginPath(); g.arc(x, y - 3, 2.6, 0, 7); g.fill();
  }
  // wainscot
  g.fillStyle = '#c7b1da'; g.fillRect(0, 262, VW, TABLE_TOP - 262);
  g.fillStyle = '#ad93c6'; g.fillRect(0, 258, VW, 7);
  for (let x = 20; x < VW; x += 130) { g.strokeStyle = 'rgba(120,90,150,.45)'; g.lineWidth = 2; g.strokeRect(x, 280, 110, 70); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1; g.strokeRect(x + 2, 282, 110, 70); }
  // arched window with a far-off castle
  const wx = 690, wy = 40, ww = 190, wh = 190;
  g.fillStyle = '#f2e7d0'; g.beginPath(); g.moveTo(wx - 10, wy + wh + 10); g.lineTo(wx - 10, wy + ww / 2); g.arc(wx + ww / 2, wy + ww / 2, ww / 2 + 10, Math.PI, 0); g.lineTo(wx + ww + 10, wy + wh + 10); g.closePath(); g.fill();
  g.save(); g.beginPath(); g.moveTo(wx, wy + wh); g.lineTo(wx, wy + ww / 2); g.arc(wx + ww / 2, wy + ww / 2, ww / 2, Math.PI, 0); g.lineTo(wx + ww, wy + wh); g.closePath(); g.clip();
  let gr = g.createLinearGradient(0, wy, 0, wy + wh); gr.addColorStop(0, '#8fb9e3'); gr.addColorStop(1, '#e9e2d3'); g.fillStyle = gr; g.fillRect(wx, wy, ww, wh);
  g.fillStyle = 'rgba(255,255,255,.85)'; [[wx + 40, wy + 70, 22], [wx + 62, wy + 64, 16], [wx + 140, wy + 92, 18], [wx + 158, wy + 88, 12]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); });
  g.fillStyle = '#9fb3a0'; g.beginPath(); g.moveTo(wx, wy + 170); g.quadraticCurveTo(wx + 60, wy + 130, wx + 120, wy + 150); g.quadraticCurveTo(wx + 160, wy + 160, wx + ww, wy + 140); g.lineTo(wx + ww, wy + wh); g.lineTo(wx, wy + wh); g.fill();
  g.fillStyle = '#7f93b8';
  [[wx + 100, 18, 42], [wx + 116, 12, 58], [wx + 130, 16, 46], [wx + 86, 12, 34]].forEach(([x, w, h]) => { const by = wy + 150; g.fillRect(x, by - h, w, h); g.beginPath(); g.moveTo(x - 2, by - h); g.lineTo(x + w / 2, by - h - 16); g.lineTo(x + w + 2, by - h); g.fill(); });
  g.restore();
  g.fillStyle = '#f2e7d0'; g.fillRect(wx + ww / 2 - 3, wy, 6, wh); g.fillRect(wx, wy + 110, ww, 6);
  // curtains
  [[wx - 34, 1], [wx + ww + 34, -1]].forEach(([cx, dir]) => {
    g.fillStyle = '#a77cc5'; g.beginPath(); g.moveTo(cx - 26, 20); g.lineTo(cx + 26, 20); g.quadraticCurveTo(cx + 10 * dir, 150, cx + 30 * dir, 250); g.lineTo(cx - 20 * dir, 250); g.quadraticCurveTo(cx - 30 * dir, 150, cx - 26, 20); g.fill();
    g.strokeStyle = 'rgba(80,40,110,.25)'; g.lineWidth = 2; for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(cx + k * 12, 24); g.quadraticCurveTo(cx + k * 6 + 6 * dir, 150, cx + k * 8 + 10 * dir, 248); g.stroke(); }
    g.fillStyle = '#d8a446'; g.fillRect(cx - 18, 150, 36, 7);
  });
  g.fillStyle = '#8a6a3a'; g.fillRect(wx - 70, 16, ww + 140, 6);
  // table top
  gr = g.createLinearGradient(0, TABLE_TOP, 0, CLOTH_TOP); gr.addColorStop(0, '#efe3cb'); gr.addColorStop(1, '#f8efdc');
  g.fillStyle = gr; g.fillRect(0, TABLE_TOP, VW, CLOTH_TOP - TABLE_TOP);
  g.fillStyle = 'rgba(120,90,60,.15)'; g.fillRect(0, TABLE_TOP, VW, 3);
  return c;
}
function paintCloth() {
  const c = document.createElement('canvas'); c.width = VW * 2; c.height = (VH - CLOTH_TOP) * 2;
  const g = c.getContext('2d'); g.scale(2, 2);
  const h = VH - CLOTH_TOP;
  let gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#f7eddb'); gr.addColorStop(1, '#e6d6ba');
  g.fillStyle = gr; g.fillRect(0, 0, VW, h);
  for (let x = 0; x < VW; x += 48) { gr = g.createLinearGradient(x, 0, x + 48, 0); gr.addColorStop(0, 'rgba(255,255,255,.18)'); gr.addColorStop(.5, 'rgba(150,120,80,.1)'); gr.addColorStop(1, 'rgba(255,255,255,.18)'); g.fillStyle = gr; g.fillRect(x, 0, 48, h); }
  g.fillStyle = 'rgba(120,90,60,.18)'; g.fillRect(0, 0, VW, 4);
  // lace band
  const ly = h - 46;
  g.fillStyle = '#fffaf0'; g.fillRect(0, ly, VW, 22);
  for (let x = 0; x < VW + 20; x += 20) { g.beginPath(); g.arc(x + 10, ly + 22, 10, 0, Math.PI); g.fill(); }
  g.fillStyle = 'rgba(183,154,214,.55)';
  for (let x = 0; x < VW + 20; x += 20) { g.beginPath(); g.arc(x + 10, ly + 11, 3, 0, 7); g.fill(); g.beginPath(); g.arc(x + 10, ly + 26, 2, 0, 7); g.fill(); }
  g.fillStyle = '#5b4568'; g.fillRect(0, h - 14, VW, 14);
  return c;
}

function drawChinchilla(x) {
  ctx.fillStyle = 'rgba(60,40,50,.22)'; ctx.beginPath(); ctx.ellipse(x, BOX_BASE + 2, CW * .55, 7, 0, 0, 7); ctx.fill();
  ctx.drawImage(chin, x - CW / 2, BOX_BASE - CH_H + 4, CW, CH_H);
}

function drawBox(b, highlight) {
  const s = 1 + b.off * .004, w = BOX_W * s, h = BOX_H * s, ry = 11 * s;
  const x = b.x, bottom = BOX_BASE + b.off * .5 - b.lift, top = bottom - h;
  // shadow on the table
  const sh = clamp(1 - b.lift / 260, .25, 1);
  ctx.fillStyle = `rgba(60,40,70,${.28 * sh})`; ctx.beginPath(); ctx.ellipse(x, BOX_BASE + b.off * .5 + 2, w * .55 * (0.7 + .3 * sh), 9 * s, 0, 0, 7); ctx.fill();
  ctx.save();
  if (highlight) { ctx.shadowColor = 'rgba(232,180,70,.9)'; ctx.shadowBlur = 22; }
  // body
  ctx.beginPath(); ctx.moveTo(x - w / 2, top); ctx.lineTo(x - w / 2, bottom); ctx.ellipse(x, bottom, w / 2, ry, 0, Math.PI, 0, true); ctx.lineTo(x + w / 2, top); ctx.closePath();
  let gr = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  gr.addColorStop(0, '#8e6bb3'); gr.addColorStop(.3, '#e2d2f0'); gr.addColorStop(.55, '#c9b1e2'); gr.addColorStop(1, '#7c5aa2');
  ctx.fillStyle = gr; ctx.fill();
  ctx.shadowBlur = 0;
  ctx.clip();
  for (let k = -8; k <= 8; k++) { const px = x + Math.sin(k / 8 * Math.PI / 2) * w / 2; ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(px - .7, top, 1.4, h + ry); }
  ctx.fillStyle = '#d8a446'; ctx.fillRect(x - 7 * s, top, 14 * s, h + ry);
  ctx.fillStyle = 'rgba(255,240,190,.5)'; ctx.fillRect(x - 5 * s, top, 3 * s, h + ry);
  ctx.restore();
  // lid
  const lw = w * 1.07, lh = 18 * s, lt = top - lh + 4;
  ctx.beginPath(); ctx.moveTo(x - lw / 2, lt); ctx.lineTo(x - lw / 2, lt + lh); ctx.ellipse(x, lt + lh, lw / 2, ry, 0, Math.PI, 0, true); ctx.lineTo(x + lw / 2, lt); ctx.closePath();
  gr = ctx.createLinearGradient(x - lw / 2, 0, x + lw / 2, 0); gr.addColorStop(0, '#6f4f96'); gr.addColorStop(.3, '#b79ad6'); gr.addColorStop(1, '#5f4185');
  ctx.fillStyle = gr; ctx.fill();
  ctx.fillStyle = '#d8a446'; ctx.fillRect(x - 7 * s, lt, 14 * s, lh + ry * .8);
  ctx.fillStyle = '#eadff5'; ctx.beginPath(); ctx.ellipse(x, lt, lw / 2, ry, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#d8a446'; ctx.fillRect(x - 7 * s, lt - ry, 14 * s, ry * 2);
  // bow
  ctx.fillStyle = '#e2b04a';
  ctx.beginPath(); ctx.ellipse(x - 13 * s, lt - 5 * s, 13 * s, 7 * s, -.35, 0, 7); ctx.ellipse(x + 13 * s, lt - 5 * s, 13 * s, 7 * s, .35, 0, 7); ctx.fill();
  ctx.fillStyle = '#b8862e'; ctx.beginPath(); ctx.ellipse(x - 13 * s, lt - 5 * s, 6 * s, 3 * s, -.35, 0, 7); ctx.ellipse(x + 13 * s, lt - 5 * s, 6 * s, 3 * s, .35, 0, 7); ctx.fill();
  ctx.fillStyle = '#d8a446'; ctx.beginPath(); ctx.arc(x, lt - 4 * s, 5 * s, 0, 7); ctx.fill();
}

function render() {
  ctx.setTransform(K, 0, 0, K, 0, 0);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(room, 0, 0, VW, VH);

  // Lila-Bella behind the table, hopping a little when you find it
  const hop = Math.sin(bounce * Math.PI * 3) * 10 * bounce;
  const breathe = reduceMotion ? 0 : Math.sin(t * 1.6) * 1.5;
  const LH = 430;
  ctx.drawImage(lila, 46, CLOTH_TOP + 70 - LH - hop + breathe, LW, LH);

  // table edge overlaps Lila-Bella's waist
  ctx.drawImage(room, 0, TABLE_TOP * 2, VW * 2, (CLOTH_TOP - TABLE_TOP) * 2, 0, TABLE_TOP, VW, CLOTH_TOP - TABLE_TOP);
  ctx.drawImage(cloth, 0, CLOTH_TOP, VW, VH - CLOTH_TOP);

  // slot numbers for keyboard players
  if (mode === 'play') {
    ctx.font = '22px "IM Fell English SC", Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = 0; i < boxes.length; i++) { ctx.fillStyle = phase === 'pick' ? 'rgba(91,69,104,.75)' : 'rgba(91,69,104,.3)'; ctx.fillText(String(i + 1), slotX(boxes.length, i), CLOTH_TOP + 36); }
  }

  // chinchilla is only drawn while a box above it is lifted (or about to be)
  if (boxes.length && phase !== 'shuffle' && phase !== 'pick') drawChinchilla(boxes[hiddenIn].x);
  [...boxes].map((b, i) => [b, i]).sort((p, q) => p[0].off - q[0].off).forEach(([b, i]) => drawBox(b, phase === 'pick' && i === hover));

  parts.forEach(p => { ctx.save(); ctx.globalAlpha = 1 - p.life / p.max; ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.col; ctx.fillRect(-4, -2.5, 8, 5); ctx.restore(); });
}

// ---- loop ----
let last = 0, cloth;
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000 || 0); last = now;
  update(dt); render();
  requestAnimationFrame(frame);
}
function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }

(async () => {
  resize();
  try { await Promise.race([document.fonts.load('22px "IM Fell English SC"'), new Promise(r => setTimeout(r, 1500))]); } catch (e) {}
  [lila, chin] = await Promise.all([loadImg('lila-bella.png'), loadImg('chinchilla.png')]);
  LW = lila.width * 430 / lila.height; CW = chin.width * CH_H / chin.height;
  room = paintRoom(); cloth = paintCloth();
  // resting scene behind the title card: three boxes, chinchilla peeking out
  boxes = [0, 1, 2].map(i => ({ slot: i, x: slotX(3, i), off: 0, lift: i === 1 ? 70 : 0 })); hiddenIn = 1;
  hud();
  requestAnimationFrame(now => { last = now; requestAnimationFrame(frame); });
})();
})();
