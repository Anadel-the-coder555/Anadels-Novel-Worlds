(() => {
'use strict';
const W = 960, H = 540, GROUND = 500;
const $ = id => document.getElementById(id);
const canvas = $('game'), ctx = canvas.getContext('2d');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
// She walks with her 8-frame walk sheet (painted facing right, anchored on her head) and stands in her
// painting when she stops; the standing painting turns left, so it is mirrored when she faces right.
const LADY = { image: 'lady.png', height: 270,
  walk: { image: 'lady-walk.png', frames: 8, fw: 205, fh: 420, ax: 107, cycle: 220 } };
const LANDMARKS = [
  [.05, 'Golden light falls between the tall beech trunks.'],
  [.2, 'A mossy boulder rests beside the path.'],
  [.4, 'Fallen leaves crunch softly under her velvet hem.'],
  [.6, 'A great beech blazes red overhead.'],
  [.78, 'Ferns curl along the edge of the path.'],
  [.95, 'The path winds on, deeper into the golden wood.'],
];
const keys = { left: false, right: false, hurry: false };
let ready = false, background, worldWidth = 1800, x = 140, facing = 1, distance = 0, moving = false, camera = 0, scale = 1, last = 0;
function resize() {
  const width = canvas.getBoundingClientRect().width;
  scale = Math.min(2.5, (width || W) / W * (window.devicePixelRatio || 1));
  canvas.width = Math.round(W * scale); canvas.height = Math.round(H * scale);
}
new ResizeObserver(resize).observe(canvas);
function clearKeys() { keys.left = keys.right = keys.hurry = false; }
function reset() {
  if (!ready) return;
  clearKeys(); x = 140; facing = 1; distance = 0; camera = 0;
  update(0); render();
}
function update(dt) {
  const dir = Number(keys.right) - Number(keys.left), old = x;
  x = clamp(x + dir * (keys.hurry ? 320 : 190) * dt, 40, worldWidth - 40);
  moving = x !== old;
  if (moving) { facing = dir; distance += Math.abs(x - old); }
  const target = clamp(x - W / 2 + facing * 65, 0, Math.max(0, worldWidth - W));
  camera += (target - camera) * Math.min(1, dt * (reduced ? 20 : 5));
  const progress = (x - 40) / (worldWidth - 80);
  $('distance').textContent = progress < .07 ? 'The wood’s edge' : progress > .95 ? 'Deep in the wood' : `${Math.round(progress * 100)}% into the wood`;
  let text = null, best = 140;
  LANDMARKS.forEach(([at, line]) => { const d = Math.abs(x - at * worldWidth); if (d < best) { best = d; text = line; } });
  $('caption').hidden = !text; if (text) $('caption').textContent = text;
}
function render() {
  ctx.setTransform(scale, 0, 0, scale, 0, 0); ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(background, -camera, -35, worldWidth, 600);
  const sx = x - camera;
  ctx.fillStyle = 'rgba(60,40,15,.26)'; ctx.beginPath(); ctx.ellipse(sx, GROUND, 70, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(sx, GROUND);
  if (moving) {
    const wk = LADY.walk, k = LADY.height / (wk.fh - 4), f = Math.floor(distance / (wk.cycle / wk.frames)) % wk.frames;
    ctx.scale(facing, 1);
    ctx.drawImage(wk.img, f * wk.fw, 0, wk.fw, wk.fh, -wk.ax * k, -(wk.fh - 4) * k, wk.fw * k, wk.fh * k);
  } else {
    const img = LADY.img, k = LADY.height / img.height;
    ctx.scale(-facing, 1);
    ctx.drawImage(img, -img.width * k / 2, -LADY.height, img.width * k, LADY.height);
  }
  ctx.restore();
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
$('reset').addEventListener('click', () => { reset(); canvas.focus({ preventScroll: true }); });
function load(src) { return new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error(`Could not load ${src}`)); image.src = src; }); }
(async () => {
  resize();
  try {
    [background, LADY.img, LADY.walk.img] = await Promise.all([load('forest.jpg'), load(LADY.image), load(LADY.walk.image)]);
    worldWidth = Math.max(W, background.width * 600 / background.height);
    ready = true; reset(); $('reset').disabled = false;
    requestAnimationFrame(now => { last = now; requestAnimationFrame(frame); });
  } catch (error) { $('caption').hidden = false; $('caption').textContent = `${error.message}. Refresh to try again.`; }
})();
})();
