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
  { id: 'praelia', name: 'Praelia', image: 'praelia.png', height: 270, standFlip: true,
    walk: { image: 'praelia-walk.png', frames: 8, fw: 205, fh: 420, ax: 107, cycle: 220 } },
  { id: 'dorian', name: 'Dorian', image: 'dorian.png', height: 292, standFlip: false,
    walk: { image: 'dorian-walk.png', frames: 8, fw: 241, fh: 420, ax: 116, cycle: 240 } },
  { id: 'kaidan', name: 'Kaidan', image: 'kaidan.png', height: 286, standFlip: false,
    walk: { image: 'kaidan-walk.png', frames: 8, fw: 223, fh: 420, ax: 105, cycle: 240 } },
  { id: 'thalion', name: 'Thalion', image: 'thalion.png', height: 292, standFlip: false,
    walk: { image: 'thalion-walk.png', frames: 8, fw: 258, fh: 420, ax: 131, cycle: 240 } },
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
const keys = { left: false, right: false, hurry: false };
let ready = false, background, worldWidth = 1800, camera = 0, scale = 1, last = 0, lead = 0;
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
function reset() {
  if (!ready) return;
  clearKeys(); camera = 0;
  Object.assign(leader(), { x: START, facing: 1, moving: false, distance: 0 });
  followers().forEach((p, r) => Object.assign(p, { x: spot(r), facing: 1, moving: false, distance: 0 }));
  update(0); render();
}
function choose(index) {
  if (!ready || index === lead || !PARTY[index]) return;
  lead = index;   // the new leader steps up where they are, and the others fall in behind
  PARTY.forEach((p, i) => { const b = $(`pick-${p.id}`); b.setAttribute('aria-pressed', String(i === lead)); });
  $('leaderName').textContent = leader().name;
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
  let text = null, best = 140;
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
  ctx.drawImage(background, -camera, -35, worldWidth, 600);
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
PARTY.forEach((p, i) => $(`pick-${p.id}`).addEventListener('click', () => { choose(i); canvas.focus({ preventScroll: true }); }));
$('reset').addEventListener('click', () => { reset(); canvas.focus({ preventScroll: true }); });
function load(src) { return new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error(`Could not load ${src}`)); image.src = src; }); }
(async () => {
  resize();
  try {
    const images = await Promise.all([load('forest.jpg'), ...PARTY.flatMap(p => [load(p.image), load(p.walk.image)])]);
    background = images[0];
    PARTY.forEach((p, i) => { p.img = images[1 + i * 2]; p.walk.img = images[2 + i * 2]; });
    worldWidth = Math.max(W, background.width * 600 / background.height);
    ready = true; reset(); $('reset').disabled = false;
    PARTY.forEach(p => { $(`pick-${p.id}`).disabled = false; });
    requestAnimationFrame(now => { last = now; requestAnimationFrame(frame); });
  } catch (error) { $('caption').hidden = false; $('caption').textContent = `${error.message}. Refresh to try again.`; }
})();
})();
