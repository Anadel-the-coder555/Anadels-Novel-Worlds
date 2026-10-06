(() => {
'use strict';
// ---- stage constants (logical 960x540) ----
const VW = 960, VH = 540, FLOOR = 534, EH = 270;   // Ember's drawn height, feet on FLOOR
const MAX_GLOW = 3;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
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
const rand = (a, b) => a + Math.random() * (b - a);

// ---- best score (per browser) ----
function loadBest() { try { return +localStorage.getItem('ember-starfall-best') || 0; } catch (e) { return 0; } }
function saveBest(v) { try { localStorage.setItem('ember-starfall-best', v); } catch (e) {} }

// ---- state ----
let bg, ember, EW = 180;
let mode = 'title';
let score = 0, caught = 0, streak = 0, combo = 1, glow = MAX_GLOW, best = loadBest();
let ex = VW / 2, evx = 0, pointerX = null, t = 0, elapsed = 0, spawnT = 1, flash = 0, hurt = 0;
let items = [], parts = [], popups = [];
const keys = { left: false, right: false };

// sky stars, fixed for the session
const skyStars = Array.from({ length: 150 }, () => ({ x: Math.random() * VW, y: Math.random() * VH * .5, r: Math.random() < .12 ? 1.6 : .5 + Math.random() * .8, ph: Math.random() * 7, sp: .8 + Math.random() * 2 }));

// ---- sound ----
let ac = null, muted = false;
function audio() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } } if (ac && ac.state === 'suspended') ac.resume(); }
function tone(freqs, dur, type = 'sine', vol = .06, gap = .06) {
  if (!ac || muted) return; const t0 = ac.currentTime;
  freqs.forEach((f, i) => { const o = ac.createOscillator(), g = ac.createGain(), s = t0 + i * gap; o.type = type; o.frequency.value = f; g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(vol, s + .01); g.gain.exponentialRampToValueAtTime(.0001, s + dur); o.connect(g).connect(ac.destination); o.start(s); o.stop(s + dur + .05); });
}
$('mute').addEventListener('click', () => { muted = !muted; $('mute').textContent = muted ? 'Sound off' : 'Sound on'; $('mute').setAttribute('aria-pressed', muted); });

// ---- HUD ----
const flameSvg = on => `<svg viewBox="0 0 20 26" class="${on ? '' : 'out'}" aria-hidden="true"><path fill="#e3a43a" d="M10 1c1 5 7 8 7 15a7 7 0 0 1-14 0c0-4 2-6 4-8 0 3 1 4 2 5 1-4 0-8 1-12z"/><path fill="#fbe3a0" d="M10 13c.6 2.5 3 3.5 3 6.2a3 3 0 0 1-6 0c0-2 1.6-3.4 3-6.2z"/></svg>`;
function hud() {
  $('score').textContent = score;
  $('combo').textContent = '×' + combo;
  $('comboPill').classList.toggle('hot', combo > 1);
  $('glows').innerHTML = Array.from({ length: MAX_GLOW }, (_, i) => flameSvg(i < glow)).join('');
  $('glows').setAttribute('aria-label', `Glow remaining: ${glow} of ${MAX_GLOW}`);
  $('best').textContent = best;
}

// ---- input ----
addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
  else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
  else return;
  pointerX = null;
  if (mode === 'play') e.preventDefault();
});
addEventListener('keyup', e => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
});
addEventListener('blur', () => { keys.left = keys.right = false; });
function toStageX(e) { const r = canvas.getBoundingClientRect(); return (e.clientX - r.left) / r.width * VW; }
const stage = $('stage');
stage.addEventListener('pointermove', e => { if (mode === 'play' && (e.pointerType === 'mouse' || e.buttons)) pointerX = toStageX(e); });
stage.addEventListener('pointerdown', e => { if (mode === 'play') { pointerX = toStageX(e); } });

function begin() {
  audio();
  mode = 'play'; score = 0; caught = 0; streak = 0; combo = 1; glow = MAX_GLOW; elapsed = 0; spawnT = .8;
  ex = VW / 2; evx = 0; pointerX = null; items = []; parts = []; popups = []; hurt = 0;
  $('titleCard').hidden = true; $('endCard').hidden = true;
  hud();
}
$('startBtn').addEventListener('click', begin);
$('againBtn').addEventListener('click', begin);

function endNight() {
  mode = 'end';
  const isBest = score > best;
  if (isBest) { best = score; saveBest(best); }
  $('endTitle').textContent = score >= 150 ? 'A sky full of wishes' : score >= 60 ? 'A bright night' : score >= 20 ? 'A handful of starlight' : 'A cloudy night';
  $('endText').textContent = `Ember caught ${caught} star${caught === 1 ? '' : 's'} for ${score} points.` + (isBest ? ' That’s a new best!' : ` Your best is ${best}.`);
  tone([392, 330, 262], .6, 'triangle', .06, .14);
  hud();
  setTimeout(() => { $('endCard').hidden = false; $('againBtn').focus(); }, 900);
}

// ---- falling things ----
function spawn() {
  const d = clamp(elapsed / 90, 0, 1), r = Math.random();
  if (r < .1 + .14 * d) {
    items.push({ type: 'wisp', x: rand(60, VW - 60), y: -30, vx: 0, vy: rand(90, 140) + d * 100, r: 20, ph: rand(0, 7) });
  } else if (r < .17 + .14 * d) {
    const fromLeft = Math.random() < .5;
    items.push({ type: 'shoot', x: fromLeft ? -30 : VW + 30, y: rand(40, 150), vx: (fromLeft ? 1 : -1) * rand(230, 300), vy: rand(130, 170), r: 12 });
  } else {
    items.push({ type: 'star', x: rand(40, VW - 40), y: -20, vx: rand(-15, 15), vy: rand(105, 160) + d * 130, r: 13, rot: rand(0, 7), spin: rand(-2, 2) });
  }
  spawnT = lerp(.78, .34, d) * rand(.7, 1.3);
}

function burst(x, y, col, n, speed = 160) {
  for (let i = 0; i < n; i++) { const a = rand(0, Math.PI * 2), s = rand(.3, 1) * speed; parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30, life: 0, max: rand(.5, .9), col }); }
}

// ---- update ----
function update(dt) {
  t += dt;
  flash = Math.max(0, flash - dt * 3); hurt = Math.max(0, hurt - dt);
  if (mode === 'play') {
    elapsed += dt;
    // movement: keys accelerate, pointer steers toward its x
    let target = 0;
    if (keys.left !== keys.right) target = keys.left ? -560 : 560;
    else if (pointerX != null) target = clamp((pointerX - ex) * 9, -720, 720);
    evx = lerp(evx, target, Math.min(1, dt * 12));
    ex = clamp(ex + evx * dt, EW * .32, VW - EW * .32);

    spawnT -= dt; if (spawnT <= 0) spawn();

    const cx = ex, cy = FLOOR - EH * .6, rx = 64, ry = 100;
    items.forEach(it => {
      it.x += it.vx * dt; it.y += it.vy * dt; if (it.rot != null) it.rot += it.spin * dt;
      if (it.type === 'wisp') it.x += Math.sin(t * 2 + it.ph) * 40 * dt;
      const dx = (it.x - cx) / (rx + it.r), dy = (it.y - cy) / (ry + it.r);
      if (dx * dx + dy * dy < 1) {
        it.dead = true;
        if (it.type === 'wisp') {
          glow--; streak = 0; combo = 1; hurt = 1;
          burst(it.x, it.y, '#5b4a7a', 22, 200);
          tone([196, 147], .35, 'sawtooth', .04, .1);
          if (glow <= 0) endNight();
        } else {
          const pts = (it.type === 'shoot' ? 5 : 1) * combo;
          score += pts; caught++; streak += it.type === 'shoot' ? 2 : 1;
          combo = Math.min(5, 1 + Math.floor(streak / 5));
          flash = 1;
          burst(it.x, it.y, it.type === 'shoot' ? '#fff6d8' : '#f3c45a', it.type === 'shoot' ? 26 : 14);
          popups.push({ x: it.x, y: it.y - 10, text: '+' + pts, life: 0 });
          tone(it.type === 'shoot' ? [988, 1319, 1568, 1976] : [784 + combo * 60, 1175 + combo * 90], .3, 'triangle', .045, .05);
        }
        hud();
      } else if (it.y > VH + 30 || it.x < -60 || it.x > VW + 60) {
        it.dead = true;
        if (it.type === 'star' && it.y > VH) { if (streak) { streak = 0; combo = 1; hud(); } }
      }
    });
    items = items.filter(it => !it.dead);
  } else if (mode === 'end') {
    items.forEach(it => { it.y += it.vy * dt * .4; it.x += it.vx * dt * .4; });
  }
  parts.forEach(p => { p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 140 * dt; });
  parts = parts.filter(p => p.life < p.max);
  popups.forEach(p => { p.life += dt; p.y -= 40 * dt; });
  popups = popups.filter(p => p.life < .9);
}

// ---- render ----
function starPath(x, y, r, rot) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = rot + i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? r * .45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.closePath();
}
function glowDot(x, y, r, col) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(255,220,140,0)');
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

function render() {
  ctx.setTransform(K, 0, 0, K, 0, 0);
  ctx.imageSmoothingQuality = 'high';
  // painted valley, castle in view, graded to night
  const bw = bg.width * VH / bg.height;
  ctx.drawImage(bg, VW - bw, 0, bw, VH);
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = '#3a4782'; ctx.fillRect(0, 0, VW, VH);
  ctx.globalCompositeOperation = 'source-over';
  let g = ctx.createLinearGradient(0, 0, 0, VH * .62);
  g.addColorStop(0, 'rgba(8,12,34,.75)'); g.addColorStop(1, 'rgba(8,12,34,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH * .62);

  // moon and sky stars
  ctx.globalCompositeOperation = 'lighter';
  glowDot(150, 92, 110, 'rgba(190,200,255,.22)');
  skyStars.forEach(s => { const a = reduceMotion ? .7 : .45 + .45 * Math.sin(t * s.sp + s.ph); ctx.fillStyle = `rgba(255,248,225,${a})`; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill(); });
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#f3eed8'; ctx.beginPath(); ctx.arc(150, 92, 30, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(160,160,190,.25)'; [[140, 84, 7], [160, 100, 5], [154, 80, 3]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); });

  // warm windows in the castle
  ctx.globalCompositeOperation = 'lighter';
  [[566, 152], [604, 190], [640, 128], [682, 176], [546, 214], [622, 230], [702, 222], [742, 318]].forEach(([x, y], i) => {
    const f = .7 + .3 * Math.sin(t * 3 + i * 1.7);
    glowDot(x, y, 12, `rgba(255,190,90,${.55 * f})`);
    ctx.fillStyle = `rgba(255,214,140,${.8 * f})`; ctx.fillRect(x - 1.2, y - 2, 2.4, 4);
  });
  ctx.globalCompositeOperation = 'source-over';

  // Ember's glow
  const gx = ex, gy = FLOOR - EH * .55, gr = 150 * (.55 + .45 * glow / MAX_GLOW) + flash * 40;
  ctx.globalCompositeOperation = 'lighter';
  g = ctx.createRadialGradient(gx, gy, 10, gx, gy, gr);
  g.addColorStop(0, `rgba(255,200,110,${.32 + flash * .25})`); g.addColorStop(.6, 'rgba(255,170,80,.1)'); g.addColorStop(1, 'rgba(255,160,60,0)');
  ctx.fillStyle = g; ctx.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
  ctx.globalCompositeOperation = 'source-over';

  // Ember
  ctx.save();
  ctx.translate(ex, FLOOR);
  ctx.rotate(clamp(evx / 720, -1, 1) * .07);
  if (hurt > 0 && Math.floor(hurt * 14) % 2) ctx.globalAlpha = .5;
  ctx.drawImage(ember, -EW / 2, -EH, EW, EH);
  ctx.restore();

  // falling things
  items.forEach(it => {
    if (it.type === 'star') {
      ctx.globalCompositeOperation = 'lighter'; glowDot(it.x, it.y, 34, 'rgba(255,214,120,.45)'); ctx.globalCompositeOperation = 'source-over';
      starPath(it.x, it.y, it.r, it.rot);
      const sg = ctx.createRadialGradient(it.x - 3, it.y - 3, 1, it.x, it.y, it.r); sg.addColorStop(0, '#fff6d0'); sg.addColorStop(1, '#e9a93a');
      ctx.fillStyle = sg; ctx.fill();
    } else if (it.type === 'shoot') {
      const len = 90, n = Math.hypot(it.vx, it.vy), tx = it.x - it.vx / n * len, ty = it.y - it.vy / n * len;
      const tg = ctx.createLinearGradient(it.x, it.y, tx, ty); tg.addColorStop(0, 'rgba(255,250,230,.9)'); tg.addColorStop(1, 'rgba(255,220,150,0)');
      ctx.strokeStyle = tg; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(it.x, it.y); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.globalCompositeOperation = 'lighter'; glowDot(it.x, it.y, 40, 'rgba(255,250,220,.7)'); ctx.globalCompositeOperation = 'source-over';
      starPath(it.x, it.y, it.r, t * 6); ctx.fillStyle = '#fffbe8'; ctx.fill();
    } else {
      // storm wisp: a knot of dark cloud with a violet edge
      for (let i = 0; i < 6; i++) {
        const a = t * 2.2 + i * 1.05 + it.ph, rr = it.r * (.55 + .2 * Math.sin(t * 3 + i));
        ctx.fillStyle = i % 2 ? 'rgba(48,40,72,.85)' : 'rgba(70,56,104,.8)';
        ctx.beginPath(); ctx.arc(it.x + Math.cos(a) * it.r * .45, it.y + Math.sin(a) * it.r * .35, rr, 0, 7); ctx.fill();
      }
      ctx.strokeStyle = 'rgba(170,140,230,.55)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(it.x, it.y, it.r * 1.05, t * 3, t * 3 + 4); ctx.stroke();
      if (Math.sin(t * 13 + it.ph * 5) > .93) { ctx.strokeStyle = 'rgba(220,210,255,.9)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(it.x - 3, it.y - 4); ctx.lineTo(it.x + 3, it.y + 2); ctx.lineTo(it.x - 1, it.y + 3); ctx.lineTo(it.x + 4, it.y + 12); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,230,160,.8)'; ctx.beginPath(); ctx.arc(it.x - 5, it.y - 2, 1.6, 0, 7); ctx.arc(it.x + 5, it.y - 2, 1.6, 0, 7); ctx.fill();
    }
  });

  parts.forEach(p => { ctx.globalAlpha = 1 - p.life / p.max; ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, 2.2, 0, 7); ctx.fill(); });
  ctx.globalAlpha = 1;
  ctx.font = '700 20px "Alegreya Sans", sans-serif'; ctx.textAlign = 'center';
  popups.forEach(p => { ctx.globalAlpha = 1 - p.life / .9; ctx.fillStyle = '#fff3c9'; ctx.fillText(p.text, p.x, p.y); });
  ctx.globalAlpha = 1;

  if (hurt > 0) { ctx.fillStyle = `rgba(60,30,90,${hurt * .25})`; ctx.fillRect(0, 0, VW, VH); }
}

// ---- loop ----
let last = 0;
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000 || 0); last = now;
  update(dt); render();
  requestAnimationFrame(frame);
}
function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }

(async () => {
  resize();
  [bg, ember] = await Promise.all([loadImg('valley.jpg'), loadImg('ember.png')]);
  EW = ember.width * EH / ember.height;
  hud();
  requestAnimationFrame(now => { last = now; requestAnimationFrame(frame); });
})();
})();
