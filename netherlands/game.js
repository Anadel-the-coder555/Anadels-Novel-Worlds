(() => {
'use strict';
const W = 960, H = 540, GROUND = 500;
const $ = id => document.getElementById(id);
const canvas = $('game'), ctx = canvas.getContext('2d');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
// The four walk the wood together. Whoever leads is steered with the keys; the others follow a step
// behind (GAP each), walking on their own walk sheets and standing in their paintings when they stop.
// Walk sheets are painted facing right and anchored on the head. Praelia's standing painting turns left,
// so it is mirrored when she faces right (standFlip); the boys face front and are never mirrored.
const PARTY = [
  { id: 'praelia', name: 'Praelia', image: 'praelia.webp', height: 270, standFlip: true,
    walk: { image: 'praelia-walk.webp', frames: 8, fw: 205, fh: 420, ax: 107, cycle: 220 } },
  { id: 'dorian', name: 'Dorian', image: 'dorian.webp', height: 292, standFlip: false,
    walk: { image: 'dorian-walk.webp', frames: 8, fw: 241, fh: 420, ax: 116, cycle: 240 } },
  { id: 'kaidan', name: 'Kaidan', image: 'kaidan.webp', height: 286, standFlip: false,
    walk: { image: 'kaidan-walk.webp', frames: 8, fw: 223, fh: 420, ax: 105, cycle: 240 } },
  { id: 'thalion', name: 'Thalion', image: 'thalion.webp', height: 292, standFlip: false,
    walk: { image: 'thalion-walk.webp', frames: 8, fw: 258, fh: 420, ax: 131, cycle: 240 } },
];
const GAP = 140, START = 100 + GAP * (PARTY.length - 1);   // the leader starts far enough in for the others behind
const LANDMARKS = [
  [.05, 'Golden light falls between the tall beech trunks.'],
  [.2, 'A mossy boulder rests beside the path.'],
  [.4, 'Fallen leaves crunch softly underfoot.'],
  [.6, 'A great beech blazes red overhead.'],
  [.78, 'Ferns curl along the edge of the path.'],
  [.95, 'The path winds on, deeper into the golden wood.'],
];
// The carriage adventure: it rattles off ahead of the party, a little faster than walking, so you hurry to
// catch it. It slows to wait when you fall far behind and pulls up at the end of the path, so it can always
// be caught (even on a phone without Shift). Its sheet is 4 frames across and 2 down, facing right, with x
// at its rear wheel and GROUND at the wheels' foot (ground).
const CARRIAGE = { image: 'carriage.webp', frames: 8, fw: 838, fh: 360, ground: 352, height: 300, cycle: 420,
  speed: 245, wait: 120, far: 650, start: 160 };
const COPIES = 3;   // the forest is laid end to end, every other copy mirrored so the joins match
const keys = { left: false, right: false, hurry: false };
let ready = false, background, tileWidth = 1800, worldWidth = 1800, camera = 0, scale = 1, last = 0, lead = 0;
let chase = null;   // { x, speed, distance, caught, stopped } while the carriage is out
PARTY.forEach(p => Object.assign(p, { x: 0, facing: 1, moving: false, distance: 0 }));
const leader = () => PARTY[lead];
const followers = () => PARTY.filter((_, i) => i !== lead);
function resize() {
  const width = canvas.getBoundingClientRect().width;
  scale = Math.min(2.5, (width || W) / W * (window.devicePixelRatio || 1));
  canvas.width = Math.round(W * scale); canvas.height = Math.round(H * scale);
}
new ResizeObserver(resize).observe(canvas);
function clearKeys() { keys.left = keys.right = keys.hurry = false; }
// each follower keeps their place in line, a step further behind the leader on the side they came from
const spot = rank => clamp(leader().x - leader().facing * GAP * (rank + 1), 40, worldWidth - 40);
const carriageWidth = () => CARRIAGE.fw * CARRIAGE.height / CARRIAGE.ground;
function reset() {
  if (!ready) return;
  clearKeys(); camera = 0; chase = null; chaseButton();
  Object.assign(leader(), { x: START, facing: 1, moving: false, distance: 0 });
  followers().forEach((p, r) => Object.assign(p, { x: spot(r), facing: 1, moving: false, distance: 0 }));
  update(0); render();
}
function chaseButton() { const b = $('chase'); if (b) b.textContent = chase ? 'Chase it again' : 'Chase the carriage'; }
// the party goes back to the wood's edge and the carriage sets off just ahead of the leader
function startChase() {
  if (!ready) return;
  reset();
  chase = { x: leader().x + CARRIAGE.start, speed: 0, distance: 0, caught: false, stopped: false };
  chaseButton(); update(0);
}
function updateChase(dt, L) {
  if (!chase) return null;
  const gap = chase.x - L.x, end = worldWidth - carriageWidth() - 30;
  // caught when the leader draws level with the coachman's seat, a little over halfway along
  if (!chase.caught && L.x >= chase.x + carriageWidth() * .55) { chase.caught = true; chase.stopped = true; clearKeys(); }   // everyone stops beside it
  if (!chase.stopped && chase.x >= end) chase.stopped = true;
  const want = chase.stopped ? 0 : gap > CARRIAGE.far ? CARRIAGE.wait : CARRIAGE.speed;
  chase.speed += (want - chase.speed) * Math.min(1, dt * 3);   // the horse eases up and away
  if (chase.stopped && chase.speed < 4) chase.speed = 0;
  const step = Math.min(chase.speed * dt, Math.max(0, end - chase.x));
  chase.x += step; chase.distance += step;
  if (chase.caught) return `${L.name} catches up with the carriage! The coachman reins in and tips his hat.`;
  if (chase.stopped) return 'The carriage has pulled up at the end of the path. Catch up!';
  if (gap > CARRIAGE.far) return 'The carriage is pulling away! Hold Shift to hurry.';
  return gap > 250 ? 'Hurry after the carriage!' : 'You’re gaining on it!';
}
function choose(index) {
  if (!ready || index === lead || !PARTY[index]) return;
  lead = index;   // the new leader steps up where they are, and the others fall in behind
  PARTY.forEach((p, i) => $(`pick-${p.id}`)?.setAttribute('aria-pressed', String(i === lead)));
  if ($('leaderName')) $('leaderName').textContent = leader().name;
  update(0);
}
function update(dt) {
  const L = leader(), dir = Number(keys.right) - Number(keys.left), old = L.x;
  L.x = clamp(L.x + dir * (keys.hurry ? 320 : 190) * dt, 40, worldWidth - 40);
  L.moving = L.x !== old;
  if (L.moving) { L.facing = dir; L.distance += Math.abs(L.x - old); }
  // followers walk to their places, a little slower to start and quicker to catch up when left behind
  followers().forEach((p, r) => {
    const d = spot(r) - p.x, step = Math.min(Math.abs(d), (Math.abs(d) > 160 ? 360 : keys.hurry ? 320 : 200) * dt);
    p.moving = step > .4;
    if (p.moving) { p.x += Math.sign(d) * step; p.distance += step; p.facing = Math.sign(d); }
    else if (Math.abs(L.x - p.x) > 1) p.facing = Math.sign(L.x - p.x);
  });
  // the camera keeps the whole line in view: the leader a little ahead of centre, the last follower well inside
  const target = clamp(L.x - W / 2 - L.facing * (GAP * (PARTY.length - 1) / 2 - 65), 0, Math.max(0, worldWidth - W));
  camera += (target - camera) * Math.min(1, dt * (reduced ? 20 : 5));
  const progress = Math.max(0, (L.x - START) / (worldWidth - 40 - START));
  $('distance').textContent = progress < .07 ? 'The wood’s edge' : progress > .95 ? 'Deep in the wood' : `${Math.round(progress * 100)}% into the wood`;
  let text = updateChase(dt, L), best = text ? 0 : 140;
  LANDMARKS.forEach(([at, line]) => { const d = Math.abs(L.x - at * worldWidth); if (d < best) { best = d; text = line; } });
  $('caption').hidden = !text; if (text) $('caption').textContent = text;
}
function draw(p, y) {
  const sx = p.x - camera;
  if (sx < -200 || sx > W + 200) return;
  ctx.fillStyle = 'rgba(60,40,15,.24)'; ctx.beginPath(); ctx.ellipse(sx, y, 62, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(sx, y);
  if (p.moving) {
    const wk = p.walk, k = p.height / (wk.fh - 4), f = Math.floor(p.distance / (wk.cycle / wk.frames)) % wk.frames;
    ctx.scale(p.facing, 1);
    ctx.drawImage(wk.img, f * wk.fw, 0, wk.fw, wk.fh, -wk.ax * k, -(wk.fh - 4) * k, wk.fw * k, wk.fh * k);
  } else {
    const img = p.img, k = p.height / img.height;
    if (p.standFlip) ctx.scale(-p.facing, 1);
    ctx.drawImage(img, -img.width * k / 2, -p.height, img.width * k, p.height);
  }
  ctx.restore();
}
function render() {
  ctx.setTransform(scale, 0, 0, scale, 0, 0); ctx.imageSmoothingQuality = 'high';
  for (let i = 0; i < COPIES; i++) {
    const x0 = i * tileWidth - camera;
    if (x0 > W || x0 + tileWidth < 0) continue;
    ctx.save(); ctx.translate(x0, 0);
    if (i % 2) { ctx.translate(tileWidth, 0); ctx.scale(-1, 1); }
    ctx.drawImage(background, 0, -35, tileWidth, 600); ctx.restore();
  }
  // the carriage runs a little further up the path, behind the party
  if (chase) {
    const c = CARRIAGE, k = c.height / c.ground, sx = chase.x - camera, y = GROUND - 22;
    const f = chase.speed > 0 ? Math.floor(chase.distance / (c.cycle / c.frames)) % c.frames : 0;
    if (sx < W + 50 && sx + carriageWidth() > -50)
      ctx.drawImage(c.img, (f % 4) * c.fw, Math.floor(f / 4) * c.fh, c.fw, c.fh, sx, y - c.ground * k, c.fw * k, c.fh * k);
  }
  // the furthest back is drawn first, a touch further up the path, so the leader is always in front
  followers().map((p, r) => [p, r]).reverse().forEach(([p, r]) => draw(p, GROUND - 8 * (r + 1)));
  draw(leader(), GROUND);
}
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000 || 0); last = now;
  update(dt); render(); requestAnimationFrame(frame);
}
addEventListener('keydown', event => {
  if (!ready || event.target.closest?.('input,button,a,select')) return;
  if (['ArrowLeft', 'a', 'A'].includes(event.key)) keys.left = true;
  else if (['ArrowRight', 'd', 'D'].includes(event.key)) keys.right = true;
  else if (event.key === 'Shift') keys.hurry = true;
  else if (['1', '2', '3', '4'].includes(event.key)) choose(Number(event.key) - 1);
  else if (['c', 'C'].includes(event.key)) startChase();
  else return;
  event.preventDefault();
});
addEventListener('keyup', event => {
  if (['ArrowLeft', 'a', 'A'].includes(event.key)) keys.left = false;
  if (['ArrowRight', 'd', 'D'].includes(event.key)) keys.right = false;
  if (event.key === 'Shift') keys.hurry = false;
});
addEventListener('blur', clearKeys);
document.addEventListener('visibilitychange', () => { if (document.hidden) clearKeys(); });
['left', 'right'].forEach(direction => {
  const button = $(direction);
  button.addEventListener('pointerdown', event => { if (!ready) return; event.preventDefault(); button.setPointerCapture?.(event.pointerId); keys[direction] = true; button.classList.add('held'); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(name => button.addEventListener(name, () => { keys[direction] = false; button.classList.remove('held'); }));
});
// a button can be missing if the browser still has an older copy of the page; the game carries on without it
PARTY.forEach((p, i) => $(`pick-${p.id}`)?.addEventListener('click', () => { choose(i); canvas.focus({ preventScroll: true }); }));
$('chase')?.addEventListener('click', () => { startChase(); canvas.focus({ preventScroll: true }); });
$('reset').addEventListener('click', () => { reset(); canvas.focus({ preventScroll: true }); });
function load(src) { return new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error(`Could not load ${src}`)); image.src = src; }); }
(async () => {
  resize();
  try {
    // count the pictures in as they arrive, so a slow connection shows it is still working
    const sources = ['forest.jpg', ...PARTY.flatMap(p => [p.image, p.walk.image]), CARRIAGE.image];
    let done = 0;
    const images = await Promise.all(sources.map(src => load(src).then(image => {
      $('caption').textContent = `Opening the wood… ${++done} of ${sources.length}`; return image;
    })));
    background = images[0];
    PARTY.forEach((p, i) => { p.img = images[1 + i * 2]; p.walk.img = images[2 + i * 2]; });
    CARRIAGE.img = images.at(-1);
    tileWidth = Math.max(W, background.width * 600 / background.height); worldWidth = tileWidth * COPIES;
    ready = true; reset(); $('reset').disabled = false; if ($('chase')) $('chase').disabled = false;
    PARTY.forEach(p => { const b = $(`pick-${p.id}`); if (b) b.disabled = false; });
    requestAnimationFrame(now => { last = now; requestAnimationFrame(frame); });
  } catch (error) { $('caption').hidden = false; $('caption').textContent = `${error.message}. Refresh to try again.`; }
})();
})();
