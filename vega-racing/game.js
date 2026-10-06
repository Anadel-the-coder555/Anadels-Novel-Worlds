(() => {
'use strict';
// ---- stage (logical 960x540) ----
const VW = 960, VH = 540;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
// The cars are painted facing left (their VEGA lettering would read backwards mirrored), so the race runs right
// to left: distance `d` grows leftwards on screen, and holding ← drives.
const PX_PER_M = 8, TRACK = 4000 * PX_PER_M;     // a 4 km race
const PLAYER_X = 640;                             // where the player's car sits on screen, leaving road ahead in view
const LANES = [{ y: 380, k: .82 }, { y: 446, k: .91 }, { y: 512, k: 1 }];   // back lane to front lane: feet line, size
const CAR_W = 262, CAR_LEN = 235;                 // drawn width in the front lane; length used for bumps and pickups
const ROAD_TOP = 336, ROAD_BOTTOM = 524;
// Car sheets (prep.py): 4 frames of turning wheels. top/accel in world px/s, grip = lanes per second (x3.2).
const CARS = {
  roadster: { name: 'VEGA 07 Roadster', img: 'car-roadster.png', fw: 520, fh: 206, top: 720, accel: 370, grip: 1.3,
              blurb: 'Open cockpit and the quickest off the line.' },
  gold:     { name: 'VEGA Gold Edition', img: 'car-gold.png', fw: 520, fh: 181, top: 752, accel: 325, grip: 1.15,
              blurb: 'Balanced and fast, in a gleaming gold body.' },
  hyper:    { name: 'VEGA Hypercar', img: 'car-hyper.png', fw: 520, fh: 201, top: 790, accel: 285, grip: 1,
              blurb: 'The highest top speed, once it winds up.' },
};
const ORDER = ['roadster', 'gold', 'hyper'];
// pace scales the rivals' top speed. They also take boost arrows and nitro, so Normal sits a little under the
// player's cars and is won by clean driving; Hard needs boosts and nitro too.
const DIFFICULTY = { easy: { pace: .8, look: 420, miss: .35 }, normal: { pace: .9, look: 620, miss: .12 }, hard: { pace: .98, look: 820, miss: 0 } };
const PLACE = ['1st', '2nd', '3rd'];

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
const store = { get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (_) {} } };
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };   // fixed scenery per tile

// ---- state ----
let mode = 'menu';            // menu | countdown | race | done
let choice = store.get('vega-car') in CARS ? store.get('vega-car') : 'roadster';
let difficulty = DIFFICULTY[store.get('vega-diff')] ? store.get('vega-diff') : 'normal';
let racers = [], items = [], sparks = [];
let t = 0, raceT = 0, countT = 0, camD = -120, shake = 0, paused = false, finishCount = 0, doneT = 0;
const keys = { drive: false, brake: false };
const player = () => racers.find(r => !r.ai);

function laneAt(p) { const i = clamp(Math.floor(p), 0, 1), f = clamp(p - i, 0, 1); return { y: lerp(LANES[i].y, LANES[i + 1].y, f), k: lerp(LANES[i].k, LANES[i + 1].k, f) }; }
const screenX = d => PLAYER_X - (d - camD);

// ---- race setup ----
function newRacer(key, lane, ai) {
  return { key, car: CARS[key], ai, d: 0, v: 0, lane, lanePos: lane, wobble: 0, spin: 0, nitro: ai ? 0 : 1, nitroT: 0,
           finished: false, time: 0, place: 0, think: 0, hits: new Set() };
}
function gridUp() {
  // the player starts in the middle lane, rivals either side
  const rivals = ORDER.filter(k => k !== choice);
  racers = [newRacer(rivals[0], 0, true), newRacer(choice, 1, false), newRacer(rivals[1], 2, true)];
  racers[0].d = racers[2].d = -30;
  camD = -120; finishCount = 0; raceT = 0;
}
function buildTrack(seed) {
  // cones, oil and gold boost arrows, never closing all three lanes at once
  const r = rng(seed); items = [];
  const lane = () => Math.floor(r() * 3);
  for (let d = 2600; d < TRACK - 1800; d += 620 + r() * 700) {
    const roll = r(), a = lane(), b = (a + 1 + Math.floor(r() * 2)) % 3;
    if (roll < .28) items.push({ d, lane: a, kind: 'cone' });
    else if (roll < .44) { items.push({ d, lane: a, kind: 'cone' }, { d: d + 40, lane: b, kind: 'cone' }); }
    else if (roll < .64) items.push({ d, lane: a, kind: 'oil' });
    else if (roll < .84) items.push({ d, lane: a, kind: 'boost' });
    else items.push({ d, lane: a, kind: 'cone' }, { d: d - 30, lane: b, kind: 'boost' });
  }
  items.forEach(it => { it.hit = new Set(); it.fly = null; });
}
function startRace() {
  audioInit();
  gridUp(); buildTrack((Math.random() * 1e9) | 0);
  mode = 'countdown'; countT = 0; paused = false; sparks = [];
  $('menu').hidden = true; $('results').hidden = true;
  $('hud').hidden = $('hudLow').hidden = false;
  $('touch').hidden = !matchMedia('(pointer: coarse)').matches;
  buildTrackLine(); updateHud();
  canvas.focus?.();
}
function toMenu() {
  mode = 'menu'; gridUp(); items = []; sparks = [];
  $('menu').hidden = false; $('results').hidden = true;
  $('hud').hidden = $('hudLow').hidden = $('touch').hidden = true; banner('');
}

// ---- input ----
const DRIVE = ['ArrowLeft', 'a', 'A'], BRAKE = ['ArrowRight', 'd', 'D'];
addEventListener('keydown', e => {
  const onButton = e.target.closest?.('button');
  if (e.key === 'm' || e.key === 'M') { setMuted(!muted); return; }
  if (e.key === 'Enter' && !onButton && (mode === 'menu' || mode === 'done')) { e.preventDefault(); startRace(); return; }
  if (mode !== 'race' && mode !== 'countdown') return;
  if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') { if (!e.repeat) setPaused(!paused); return; }
  if (DRIVE.includes(e.key)) keys.drive = true;
  else if (BRAKE.includes(e.key)) keys.brake = true;
  else if (['ArrowUp', 'w', 'W'].includes(e.key)) { if (!e.repeat) steer(-1); }
  else if (['ArrowDown', 's', 'S'].includes(e.key)) { if (!e.repeat) steer(1); }
  else if (e.key === ' ' || e.key === 'Shift' || e.key === 'n' || e.key === 'N') { if (!e.repeat) fireNitro(player()); }
  else return;
  e.preventDefault();
});
addEventListener('keyup', e => {
  if (DRIVE.includes(e.key)) keys.drive = false;
  if (BRAKE.includes(e.key)) keys.brake = false;
});
addEventListener('blur', () => { keys.drive = keys.brake = false; if (mode === 'race') setPaused(true); });
document.addEventListener('visibilitychange', () => { if (document.hidden && mode === 'race') setPaused(true); });
function hold(id, on, off) {
  const el = $(id);
  el.addEventListener('pointerdown', e => { e.preventDefault(); el.setPointerCapture?.(e.pointerId); el.classList.add('held'); on(); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => el.addEventListener(ev, () => { el.classList.remove('held'); off?.(); }));
}
hold('tDrive', () => keys.drive = true, () => keys.drive = false);
hold('tBrake', () => keys.brake = true, () => keys.brake = false);
hold('tUp', () => steer(-1)); hold('tDown', () => steer(1));
hold('tNitro', () => fireNitro(player()));
function steer(dir) { const p = player(); if (p && mode === 'race' && !paused && p.spin <= 0) p.lane = clamp(p.lane + dir, 0, 2); }
function fireNitro(r) {
  if (!r || mode !== 'race' || paused || r.finished || r.nitro <= 0 || r.nitroT > 0) return;
  r.nitro--; r.nitroT = 2.2;
  if (!r.ai) { whoosh(); updateHud(); }
}
function setPaused(p) { paused = p; $('paused').hidden = !p; if (p) keys.drive = keys.brake = false; }

// ---- update ----
function update(dt) {
  t += dt;
  if (paused) { engine(player()); return; }
  shake = Math.max(0, shake - dt * 2.5);
  if (mode === 'countdown') {
    const before = countT; countT += dt;
    // three red lights a second apart, then green
    for (const [at, text, f] of [[0, '3', 440], [1, '2', 440], [2, '1', 440], [3, 'GO!', 880]]) if (before <= at && countT > at) { banner(text); beep(f, at === 3 ? .45 : .2); }
    if (countT >= 3) mode = 'race';
  }
  if (mode === 'race' || mode === 'done') {
    raceT += mode === 'race' ? dt : 0;
    racers.forEach(r => drive(r, dt));
    bumps();
    pickups();
    racers.forEach(r => {
      if (!r.finished && r.d >= TRACK) {
        r.finished = true; r.time = raceT; r.place = ++finishCount;
        if (!r.ai) finish();
      }
    });
    if (mode === 'done') {   // results once everyone is home, or after 5 s for whoever is still out there
      doneT += dt;
      if (doneT > 5 && racers.some(r => !r.finished)) settleRest();
      else if (doneT > 1.6 && racers.every(r => r.finished)) showResults();
    }
    if (mode === 'race') banner(countT < 3.9 ? 'GO!' : '');
    countT += dt;
  }
  const p = player();
  const target = mode === 'menu' ? -120 : p.d;
  camD += (target - camD) * Math.min(1, dt * (mode === 'menu' ? 2 : 9));
  sparks.forEach(s => { s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 900 * dt; });
  sparks = sparks.filter(s => s.t < s.life);
  items.forEach(it => { if (it.fly) { it.fly.t += dt; } });
  if (mode !== 'menu') updateHud();
  engine(p);
}
function drive(r, dt) {
  const D = DIFFICULTY[difficulty];
  let pace = 1;
  if (r.ai) {
    pace = D.pace;
    const gap = player().d - r.d;                           // keep the race close: a little help from behind
    if (gap > 900) pace += .07; else if (gap < -1100) pace -= .05;
    think(r, dt, D);
  }
  r.nitroT = Math.max(0, r.nitroT - dt); r.wobble = Math.max(0, r.wobble - dt); r.spin = Math.max(0, r.spin - dt);
  const top = r.car.top * pace * (r.nitroT > 0 ? 1.3 : 1) * (r.wobble > 0 ? .85 : 1);
  const accel = r.car.accel * (r.nitroT > 0 ? 1.7 : 1);
  const go = r.finished ? false : r.ai ? true : keys.drive;
  const brake = !r.ai && !r.finished && keys.brake;
  if (go && r.spin <= 0) {
    if (r.v < top) r.v = Math.min(top, r.v + accel * Math.max(.12, 1 - (r.v / top) ** 2) * dt);
    else r.v = Math.max(top, r.v - 260 * dt);               // easing back down after a boost or nitro
  } else if (brake) r.v = Math.max(0, r.v - 1100 * dt);
  else r.v = Math.max(r.finished ? 160 : 0, r.v - (r.finished ? 420 : 130) * dt);
  if (r.spin > 0) r.v = Math.max(0, r.v - 260 * dt);
  r.d += r.v * dt;
  r.lanePos += clamp(r.lane - r.lanePos, -r.car.grip * 3.2 * dt, r.car.grip * 3.2 * dt);
}
function think(r, dt, D) {
  // rivals look down the road, steer round cones and oil, aim for boost arrows, and use nitro late on
  r.think -= dt;
  if (r.think <= 0 && r.spin <= 0 && !r.finished) {
    r.think = .25;
    let best = r.lane, bestScore = -1e9;
    for (const lane of [r.lane, r.lane - 1, r.lane + 1]) {
      if (lane < 0 || lane > 2) continue;
      let score = lane === r.lane ? 6 : 0;
      for (const it of items) {
        const ahead = it.d - r.d;
        if (it.lane !== lane || ahead < -40 || ahead > D.look || it.hit.has(r)) continue;
        const near = 1 - ahead / D.look;
        if (it.kind === 'boost') score += 25 * near; else score -= 120 * near;
      }
      for (const o of racers) if (o !== r && Math.round(o.lanePos) === lane && o.d - r.d > 0 && o.d - r.d < 380 && o.v < r.v) score -= 30;
      if (score > bestScore) { bestScore = score; best = lane; }
    }
    if (best !== r.lane && Math.random() > D.miss) r.lane = best;
    if (r.nitro > 0 && r.nitroT <= 0 && (r.d > TRACK * .7 || Math.random() < .03)) fireNitro(r);
  }
}
function bumps() {
  // two cars in the same lane can't overlap: the one behind is held back
  const sorted = [...racers].sort((a, b) => a.d - b.d);
  for (let i = 0; i < sorted.length; i++) for (let j = i + 1; j < sorted.length; j++) {
    const a = sorted[i], b = sorted[j];
    if (Math.abs(a.lanePos - b.lanePos) < .55 && b.d - a.d < CAR_LEN * .82) {
      a.d = b.d - CAR_LEN * .82; a.v = Math.min(a.v, b.v * .97);
    }
  }
}
function pickups() {
  for (const it of items) for (const r of racers) {
    if (it.hit.has(r) || Math.abs(it.d - r.d) > CAR_LEN * .42 || Math.abs(r.lanePos - it.lane) > .42) continue;
    it.hit.add(r);
    if (it.kind === 'cone') {
      if (it.fly) continue;
      r.v *= .6; r.wobble = .7;
      it.fly = { t: 0, vx: -(r.v * .4 + 120), spin: (Math.random() - .5) * 14 };
      if (!r.ai) { shake = .6; thud(); }
    } else if (it.kind === 'oil') {
      r.v *= .72; r.spin = .9;
      if (!r.ai) { shake = .4; skid(); }
    } else {
      r.v = Math.min(r.v + 240, r.car.top * 1.32);
      r.nitro = Math.min(3, r.nitro + 1);
      if (!r.ai) { whoosh(); burst(screenX(r.d), laneAt(r.lanePos).y - 20); }
    }
  }
}
function finish() {
  mode = 'done'; doneT = 0; keys.drive = keys.brake = false;
  const p = player();
  banner(p.place === 1 ? 'You win!' : `${PLACE[p.place - 1]} place`);
  if (p.place === 1) for (let i = 0; i < 60; i++) burst(PLAYER_X + (Math.random() - .5) * 600, 120 + Math.random() * 120, true);
  fanfare(p.place);
}
function settleRest() {
  // anyone still racing gets the time their current pace would bring them home in
  racers.filter(r => !r.finished).sort((a, b) => b.d - a.d).forEach(r => {
    r.finished = true; r.place = ++finishCount; r.time = raceT + (TRACK - r.d) / Math.max(200, r.v);
  });
  showResults();
}
function showResults() {
  if (mode !== 'done' || !$('results').hidden) return;
  if (racers.some(r => !r.finished)) return;     // wait for settleRest
  const p = player();
  const key = `vega-best-${choice}`, prev = Number(store.get(key)) || 0;
  const best = !prev || p.time < prev;
  if (best) store.set(key, p.time.toFixed(2));
  $('resultsTitle').textContent = p.place === 1 ? 'Victory!' : `You finished ${PLACE[p.place - 1]}`;
  $('standings').replaceChildren(...[...racers].sort((a, b) => a.place - b.place).map(r => {
    const li = document.createElement('li'); if (!r.ai) li.className = 'you';
    li.innerHTML = `<span class="place">${PLACE[r.place - 1]}</span><span class="who">${r.car.name}<small>${r.ai ? 'VEGA team rival' : 'You'}</small></span><span>${fmt(r.time)}</span>`;
    return li;
  }));
  $('bestNote').textContent = best ? (prev ? `New best for the ${CARS[choice].name}, ${fmt(prev - p.time)} quicker than before.` : `Your first time in the ${CARS[choice].name}. Now beat it!`)
                                   : `Your best in the ${CARS[choice].name}: ${fmt(prev)}.`;
  $('results').hidden = false; $('hudLow').hidden = $('touch').hidden = true;
  $('again').focus({ preventScroll: true });
  buildCars();
}
const fmt = s => `${Math.floor(s / 60)}:${(s % 60).toFixed(2).padStart(5, '0')}`;

// ---- HUD ----
function buildTrackLine() {
  $('trackLine').replaceChildren(...racers.map(r => {
    const i = document.createElement('i'); i.className = r.ai ? '' : 'you';
    i.style.background = { roadster: '#f2efe6', gold: '#e8b84a', hyper: '#9aa4b8' }[r.key];
    return i;
  }));
}
let lastPos = '';
function updateHud() {
  const p = player(); if (!p) return;
  const order = [...racers].sort((a, b) => (a.finished && b.finished) ? a.place - b.place : b.d - a.d);
  const pos = PLACE[order.indexOf(p)];
  if (pos !== lastPos) { $('pos').textContent = pos; lastPos = pos; }
  $('time').textContent = fmt(raceT);
  $('speed').textContent = Math.round(p.v / PX_PER_M * 3.6);
  [...$('nitro').children].forEach((pip, i) => pip.classList.toggle('on', i < p.nitro));
  // progress runs right to left, like the race: start on the right, finish flag on the left
  [...$('trackLine').children].forEach((dot, i) => { dot.style.left = `${100 - clamp(racers[i].d / TRACK, 0, 1) * 100}%`; });
}
let bannerText = '';
function banner(text) {
  if (text === bannerText) return; bannerText = text;
  const el = $('banner'); el.textContent = text;
  el.classList.remove('pop'); void el.offsetWidth; if (text) el.classList.add('pop');
}

// ---- drawing ----
const sheets = {};
function render() {
  ctx.setTransform(K, 0, 0, K, 0, 0);
  ctx.imageSmoothingQuality = 'high';
  ctx.save();
  if (shake > 0 && !reduceMotion) ctx.translate((Math.random() - .5) * 10 * shake, (Math.random() - .5) * 6 * shake);
  drawSky(); drawMountains(); drawSkyline(); drawStands(); drawBarrier(); drawRoad();
  const p = player();
  // items and cars, back lane first; within a lane, items under the cars
  for (let lane = 0; lane < 3; lane++) {
    items.filter(it => it.lane === lane).forEach(drawItem);
    racers.filter(r => Math.round(r.lanePos) === lane).sort((a, b) => a.d - b.d).forEach(drawCar);
  }
  drawGantries();
  drawForeground();
  if (p && p.v > 520 && !reduceMotion && mode !== 'menu') speedLines(p.v);
  sparks.forEach(drawSpark);
  ctx.restore();
}
function drawSky() {
  const g = ctx.createLinearGradient(0, 0, 0, 300);
  g.addColorStop(0, '#2c3566'); g.addColorStop(.45, '#a65a6e'); g.addColorStop(.78, '#f0a35c'); g.addColorStop(1, '#ffd994');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  const sx = 760, sy = 196;   // the sun stays put; everything else slides under it
  const glow = ctx.createRadialGradient(sx, sy, 10, sx, sy, 260);
  glow.addColorStop(0, 'rgba(255,240,200,.95)'); glow.addColorStop(.12, 'rgba(255,214,140,.7)'); glow.addColorStop(1, 'rgba(255,170,90,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, VW, 320);
  ctx.fillStyle = '#fff4d6'; ctx.beginPath(); ctx.arc(sx, sy, 34, 0, 7); ctx.fill();
}
// a scrolling layer: `f` is how fast it moves against the track (1 = with the road), tiles of width w
function layer(f, w, drawTile) {
  const off = camD * f;
  const first = Math.floor((off - (VW - PLAYER_X) - w) / w), last = Math.ceil((off + PLAYER_X + w) / w);
  for (let i = first; i <= last; i++) drawTile(PLAYER_X - (i * w - off) - w, i);
}
function ridge(f, base, amp, color, seed) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, VH);
  for (let x = 0; x <= VW; x += 12) {
    const u = (camD * f - x + PLAYER_X) / 100 + seed;
    ctx.lineTo(x, base - amp * (.55 * Math.sin(u * .9) + .3 * Math.sin(u * 2.3 + 1.7) + .15 * Math.sin(u * 5.1 + 4)));
  }
  ctx.lineTo(VW, VH); ctx.closePath(); ctx.fill();
}
function drawMountains() { ridge(.03, 236, 60, '#8c6a8e', 3); ridge(.06, 258, 46, '#a9787f', 11); }
function drawSkyline() {
  // a golden city on the far shore, windows catching the sun
  layer(.14, 70, (x, i) => {
    const h = 30 + hash(i) * 70, w = 26 + hash(i + 50) * 30, base = 272;
    ctx.fillStyle = '#7b5a5c'; ctx.fillRect(x, base - h, w, h);
    if (hash(i + 9) > .55) { ctx.beginPath(); ctx.moveTo(x + w / 2 - 2, base - h); ctx.lineTo(x + w / 2, base - h - 24); ctx.lineTo(x + w / 2 + 2, base - h); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,214,140,.55)';
    for (let wy = base - h + 6; wy < base - 6; wy += 9) for (let wx = x + 4; wx < x + w - 4; wx += 7) if (hash(wx * 3.1 + wy) > .6) ctx.fillRect(wx, wy, 3, 4);
  });
  ctx.fillStyle = '#c98a5f'; ctx.fillRect(0, 270, VW, 6);   // the shore
}
function drawStands() {
  layer(.62, 560, (x, i) => {
    if (hash(i + 3) < .28) {   // a gap with trees between stands
      for (let k = 0; k < 4; k++) { const tx = x + 60 + k * 120 + hash(i * 7 + k) * 40; ctx.fillStyle = '#3e5a3c'; ctx.beginPath(); ctx.ellipse(tx, 266, 34, 30, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#4c3828'; ctx.fillRect(tx - 3, 280, 6, 22); }
      return;
    }
    const top = 212;
    ctx.fillStyle = '#262a33'; ctx.fillRect(x + 20, top, 520, 92);                 // stand
    ctx.fillStyle = '#e8b84a'; ctx.fillRect(x + 10, top - 14, 540, 10);            // gold roof edge
    ctx.fillStyle = '#14161b'; ctx.fillRect(x + 10, top - 22, 540, 8);
    for (let row = 0; row < 6; row++) for (let c = 0; c < 44; c++) {               // the crowd
      const n = i * 997 + row * 61 + c;
      ctx.fillStyle = ['#f2efe6', '#e8b84a', '#e2463a', '#5b7bd5', '#1b1d22', '#f0a35c'][Math.floor(hash(n) * 6)];
      const bob = reduceMotion ? 0 : Math.max(0, Math.sin(t * 6 + hash(n + 1) * 20)) * (mode === 'race' ? 2 : .6);
      ctx.fillRect(x + 30 + c * 11.6, top + 8 + row * 14 - bob, 7, 8);
    }
    ctx.fillStyle = '#14161b'; ctx.fillRect(x + 200, top - 52, 160, 30);           // big screen
    ctx.fillStyle = '#e8b84a'; ctx.font = '800 20px "Saira Condensed", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('VEGA RACING', x + 280, top - 37);
  });
}
function drawBarrier() {
  ctx.fillStyle = '#d9d4c8'; ctx.fillRect(0, 300, VW, 34);
  layer(1, 640, x => {
    ctx.fillStyle = '#121418'; ctx.fillRect(x + 40, 304, 250, 26);
    ctx.fillStyle = '#e8b84a'; ctx.font = '800 20px "Saira Condensed", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('VEGA', x + 165, 318);
    ctx.fillStyle = '#e2463a'; ctx.fillRect(x + 360, 304, 220, 26);
    ctx.fillStyle = '#fff'; ctx.fillText('GOLDEN HOUR GP', x + 470, 318);
    ctx.fillStyle = '#3a3e47'; ctx.fillRect(x + 320, 160, 6, 144);                // light pole
    ctx.fillStyle = '#fff1c8'; ctx.fillRect(x + 306, 154, 34, 10);
  });
}
function drawRoad() {
  const g = ctx.createLinearGradient(0, ROAD_TOP, 0, ROAD_BOTTOM);
  g.addColorStop(0, '#3b3d44'); g.addColorStop(1, '#2a2c31');
  ctx.fillStyle = g; ctx.fillRect(0, ROAD_TOP, VW, ROAD_BOTTOM - ROAD_TOP);
  const kerb = (y, h) => layer(1, 64, (x, i) => { ctx.fillStyle = i % 2 ? '#f2efe6' : '#e2463a'; ctx.fillRect(x, y, 64, h); });
  kerb(ROAD_TOP - 4, 8); kerb(ROAD_BOTTOM, 10);
  ctx.fillStyle = 'rgba(242,239,230,.7)';
  for (const y of [(LANES[0].y + LANES[1].y) / 2 - 8, (LANES[1].y + LANES[2].y) / 2 - 8]) layer(1, 120, x => ctx.fillRect(x + 20, y, 60, 4));
  // start and finish lines across the road
  for (const d of [0, TRACK]) {
    const x = screenX(d);
    if (x < -60 || x > VW + 60) continue;
    for (let row = 0; row < 11; row++) for (let c = 0; c < 3; c++) {
      ctx.fillStyle = (row + c) % 2 ? '#111' : '#f5f2ea';
      ctx.fillRect(x + c * 12 - 18 + (row - 5) * 1.5, ROAD_TOP + row * 16, 12, 16);
    }
  }
}
function drawGantries() {
  // start lights at the start line, a chequered tower at the finish
  const sx = screenX(0) - 30;
  if (sx > -80 && sx < VW + 80) {
    ctx.fillStyle = '#1b1d22'; ctx.fillRect(sx - 4, 120, 8, ROAD_TOP - 120);
    ctx.fillRect(sx - 70, 110, 140, 44);
    for (let k = 0; k < 4; k++) {
      const lit = mode === 'countdown' ? countT >= k && k < 3 : false;
      const green = (mode === 'race' || mode === 'done') && k === 3;
      ctx.fillStyle = green ? '#3ee07a' : lit ? '#ff3b2f' : '#3a3d45';
      ctx.beginPath(); ctx.arc(sx - 48 + k * 32, 132, 11, 0, 7); ctx.fill();
    }
  }
  const fx = screenX(TRACK) - 30;
  if (fx > -120 && fx < VW + 120) {
    ctx.fillStyle = '#1b1d22'; ctx.fillRect(fx - 4, 100, 8, ROAD_TOP - 100);
    for (let row = 0; row < 3; row++) for (let c = 0; c < 10; c++) { ctx.fillStyle = (row + c) % 2 ? '#111' : '#f5f2ea'; ctx.fillRect(fx - 80 + c * 16, 70 + row * 14, 16, 14); }
    ctx.fillStyle = '#e8b84a'; ctx.fillRect(fx - 80, 112, 160, 26);
    ctx.fillStyle = '#111'; ctx.font = '800 20px "Saira Condensed", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('FINISH', fx, 126);
  }
}
function drawItem(it) {
  const x = screenX(it.d), L = LANES[it.lane];
  if (x < -120 || x > VW + 120) return;
  const k = L.k, y = L.y - 4;
  if (it.kind === 'boost') {
    // gold chevrons pointing the way (left)
    for (let c = 0; c < 3; c++) {
      const cx = x - 40 * k + c * 30 * k, a = .55 + .45 * Math.sin(t * 8 - c);
      ctx.fillStyle = `rgba(255,${200 + c * 15},90,${a})`;
      ctx.beginPath(); ctx.moveTo(cx, y - 6 * k); ctx.lineTo(cx + 20 * k, y - 18 * k); ctx.lineTo(cx + 28 * k, y - 18 * k); ctx.lineTo(cx + 8 * k, y - 6 * k);
      ctx.lineTo(cx + 28 * k, y + 6 * k); ctx.lineTo(cx + 20 * k, y + 6 * k); ctx.closePath(); ctx.fill();
    }
  } else if (it.kind === 'oil') {
    ctx.fillStyle = 'rgba(10,10,14,.85)'; ctx.beginPath(); ctx.ellipse(x, y - 4, 52 * k, 11 * k, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(120,90,200,.35)'; ctx.beginPath(); ctx.ellipse(x - 10 * k, y - 7 * k, 22 * k, 4 * k, 0, 0, 7); ctx.fill();
  } else {
    let cx = x, cy = y, rot = 0;
    if (it.fly) { const f = it.fly; cx = x + f.vx * f.t * .6; cy = y - 260 * f.t + 700 * f.t * f.t; rot = f.spin * f.t; if (cy > y + 40) return; }
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(k, k);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; if (!it.fly) { ctx.beginPath(); ctx.ellipse(0, 2, 22, 5, 0, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#ff7a1f'; ctx.beginPath(); ctx.moveTo(-15, 0); ctx.lineTo(-5, -40); ctx.lineTo(5, -40); ctx.lineTo(15, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(-10, -24, 20, 6);
    ctx.fillStyle = '#d4601a'; ctx.fillRect(-18, -2, 36, 5);
    ctx.restore();
  }
}
function drawCar(r) {
  const c = r.car, img = sheets[r.key]; if (!img) return;
  const x = screenX(r.d); if (x < -260 || x > VW + 260) return;
  const L = laneAt(r.lanePos), w = CAR_W * L.k, h = w * c.fh / c.fw;
  const frame = Math.floor(Math.abs(r.d) / 26) % 4;
  const bob = reduceMotion ? 0 : (r.v > 50 ? Math.sin(t * 40 + r.d * .01) * .8 : 0) + (r.wobble > 0 ? Math.sin(t * 50) * 2 : 0);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(x, L.y - 2, w * .46, 9 * L.k, 0, 0, 7); ctx.fill();
  if (r.nitroT > 0) {   // exhaust flame from the tail, on the right
    const len = (70 + Math.random() * 40) * L.k, ex = x + w * .47, ey = L.y - h * .32;
    const g = ctx.createLinearGradient(ex, 0, ex + len, 0);
    g.addColorStop(0, 'rgba(255,255,230,.95)'); g.addColorStop(.3, 'rgba(255,170,60,.85)'); g.addColorStop(1, 'rgba(255,80,40,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(ex, ey - 9 * L.k); ctx.lineTo(ex + len, ey); ctx.lineTo(ex, ey + 9 * L.k); ctx.closePath(); ctx.fill();
  }
  ctx.save(); ctx.translate(x, L.y + bob);
  if (r.spin > 0 && !reduceMotion) ctx.rotate(Math.sin(r.spin * 22) * .07);
  ctx.drawImage(img, frame * c.fw, 0, c.fw, c.fh, -w / 2, -h + 4 * L.k, w, h);
  ctx.restore();
  if (!r.ai && mode !== 'menu') {   // a small marker over the player's car
    ctx.fillStyle = '#e8b84a'; const my = L.y - h - 10;
    ctx.beginPath(); ctx.moveTo(x - 8, my - 10); ctx.lineTo(x + 8, my - 10); ctx.lineTo(x, my); ctx.closePath(); ctx.fill();
  }
}
function drawForeground() {
  ctx.fillStyle = '#5e7a3c'; ctx.fillRect(0, ROAD_BOTTOM + 10, VW, VH);
  layer(1.35, 300, (x, i) => {
    ctx.fillStyle = '#4c6830'; for (let k = 0; k < 6; k++) ctx.fillRect(x + hash(i * 5 + k) * 300, ROAD_BOTTOM + 14 + hash(i * 3 + k) * 12, 22, 3);
    ctx.fillStyle = '#c8c3b6'; ctx.fillRect(x + 140, ROAD_BOTTOM + 8, 10, 30);    // marker posts
    ctx.fillStyle = '#e2463a'; ctx.fillRect(x + 140, ROAD_BOTTOM + 8, 10, 6);
  });
}
function speedLines(v) {
  const n = Math.floor((v - 520) / 30);
  ctx.strokeStyle = 'rgba(255,245,220,.35)'; ctx.lineWidth = 2;
  for (let i = 0; i < n; i++) {
    const y = 40 + hash(i * 13.7 + Math.floor(t * 20)) * 280, x = hash(i * 7.1 + Math.floor(t * 20)) * VW;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 60 + v * .08, y); ctx.stroke();
  }
}
function burst(x, y, confetti) {
  if (reduceMotion) return;
  for (let i = 0; i < (confetti ? 1 : 18); i++) sparks.push({ x, y, vx: (Math.random() - .5) * (confetti ? 200 : 420), vy: -Math.random() * (confetti ? 120 : 380), t: 0,
    life: confetti ? 2.4 : .7, col: confetti ? ['#e8b84a', '#f2efe6', '#e2463a', '#5b7bd5'][Math.floor(Math.random() * 4)] : '#ffd36b', sz: confetti ? 6 : 3 });
}
function drawSpark(s) { ctx.globalAlpha = 1 - s.t / s.life; ctx.fillStyle = s.col; ctx.fillRect(s.x, s.y, s.sz, s.sz * (s.sz > 4 ? .6 : 1)); ctx.globalAlpha = 1; }

// ---- sound: an engine note that follows your speed, start beeps, boosts. M mutes (remembered). ----
let ac = null, eng = null, muted = store.get('vega-muted') === '1';
function audioInit() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  try {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    const o1 = ac.createOscillator(), o2 = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
    o1.type = 'sawtooth'; o2.type = 'square'; f.type = 'lowpass'; f.frequency.value = 700; g.gain.value = 0;
    o1.connect(f); o2.connect(f); f.connect(g); g.connect(ac.destination); o1.start(); o2.start();
    eng = { o1, o2, f, g };
  } catch (_) { ac = null; }
}
function engine(p) {
  if (!eng) return;
  const on = !muted && !paused && p && (mode === 'race' || mode === 'countdown' || (mode === 'done' && $('results').hidden));
  const hz = 38 + (p ? p.v : 0) * .17 + (keys.drive ? 12 : 0) + (p && p.nitroT > 0 ? 20 : 0);
  eng.o1.frequency.setTargetAtTime(hz, ac.currentTime, .05); eng.o2.frequency.setTargetAtTime(hz * 1.5, ac.currentTime, .05);
  eng.f.frequency.setTargetAtTime(400 + (p ? p.v : 0) * 1.4, ac.currentTime, .05);
  eng.g.gain.setTargetAtTime(on ? .035 : 0, ac.currentTime, .08);
}
function tone(freq, dur, type = 'sine', vol = .12) {
  if (!ac || muted) return;
  const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(vol, ac.currentTime); g.gain.exponentialRampToValueAtTime(.0001, ac.currentTime + dur);
  o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + dur);
}
function noise(dur, from, to, vol = .2) {
  if (!ac || muted) return;
  const b = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = b; f.type = 'bandpass'; f.frequency.setValueAtTime(from, ac.currentTime); f.frequency.exponentialRampToValueAtTime(to, ac.currentTime + dur);
  g.gain.setValueAtTime(vol, ac.currentTime); g.gain.exponentialRampToValueAtTime(.0001, ac.currentTime + dur);
  s.connect(f); f.connect(g); g.connect(ac.destination); s.start();
}
const beep = (f, d) => tone(f, d, 'square', .08);
const whoosh = () => noise(.6, 300, 2400, .25);
const thud = () => { tone(90, .25, 'sine', .3); noise(.15, 800, 200, .2); };
const skid = () => noise(.7, 2600, 900, .15);
function fanfare(place) { const notes = place === 1 ? [523, 659, 784, 1047] : [440, 523, 659]; notes.forEach((n, i) => setTimeout(() => tone(n, .35, 'triangle', .12), i * 140)); }
function setMuted(m) { muted = m; store.set('vega-muted', m ? '1' : '0'); }

// ---- menu ----
function buildCars() {
  const tops = ORDER.map(k => CARS[k].top), accs = ORDER.map(k => CARS[k].accel), grips = ORDER.map(k => CARS[k].grip);
  const pct = (v, list) => 45 + 55 * (v - Math.min(...list)) / (Math.max(...list) - Math.min(...list));
  $('cars').replaceChildren(...ORDER.map(key => {
    const c = CARS[key], b = document.createElement('button'), best = Number(store.get(`vega-best-${key}`));
    b.type = 'button'; b.className = 'car'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(key === choice));
    b.innerHTML = `<span class="thumb" style="background-image:url('${c.img}')" aria-hidden="true"></span><b>${c.name}</b><span class="blurb">${c.blurb}</span>`
      + [['Top speed', pct(c.top, tops)], ['Acceleration', pct(c.accel, accs)], ['Handling', pct(c.grip, grips)]].map(([n, v]) => `<span class="stat"><span>${n}</span><span class="bar"><i style="width:${v}%"></i></span></span>`).join('')
      + `<span class="bestline">${best ? `Best time ${fmt(best)}` : 'No time set yet'}</span>`;
    b.addEventListener('click', () => { choice = key; store.set('vega-car', key); buildCars(); if (mode === 'menu') gridUp(); });
    return b;
  }));
  document.querySelectorAll('#diff button').forEach(b => b.setAttribute('aria-checked', String(b.dataset.diff === difficulty)));
}
document.querySelectorAll('#diff button').forEach(b => b.addEventListener('click', () => { difficulty = b.dataset.diff; store.set('vega-diff', difficulty); buildCars(); }));
$('start').addEventListener('click', startRace);
$('again').addEventListener('click', startRace);
$('change').addEventListener('click', toMenu);

// ---- loop ----
let last = 0;
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000 || 0); last = now;
  update(dt); render();
  requestAnimationFrame(frame);
}
function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Could not load ' + src)); i.src = src; }); }
(async () => {
  resize();
  buildCars();
  try { await Promise.race([document.fonts.load('800 20px "Saira Condensed"'), new Promise(r => setTimeout(r, 1500))]); } catch (_) {}
  await Promise.all(ORDER.map(async k => { sheets[k] = await loadImg(CARS[k].img); }));
  gridUp();
  $('start').disabled = false;
  requestAnimationFrame(n => { last = n; requestAnimationFrame(frame); });
})();
})();
