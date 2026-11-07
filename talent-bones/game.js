(() => {
'use strict';
const W = 960, H = 540, GROUND = 512;
const $ = id => document.getElementById(id);
const canvas = $('game'), ctx = canvas.getContext('2d');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const BOY = { image: 'boy-walk.png', frames: 8, fw: 246, fh: 420, ax: 117, height: 210, cycle: 175 };
// Fern waits in the forest at FERN.at of the way along. Once you've said hello she walks with the boy,
// a step behind him (FERN.gap), using her walk sheet; when they stop she stands holding her fern frond.
const FERN = { image: 'fern.png', at: .58, height: 204, gap: 105,
  walk: { image: 'fern-walk.png', frames: 8, fw: 218, fh: 420, ax: 107, cycle: 165 } };
const LANDMARKS = [
  [.06, 'Sunlight spills between the white birch trunks.'],
  [.22, 'Ferns crowd the path, still damp with dew.'],
  [.38, 'Mossy stones lie half hidden in the grass.'],
  [.78, 'Purple wildflowers sway in a little clearing.'],
  [.94, 'The birches thin out towards a brighter meadow.'],
];
const FERN_LINES = ['Fern looks up from the ferns and smiles.', 'She holds out a curled fern frond for you to see.', 'Fern tucks a curl behind her ear. “Shall we keep walking?”'];
// once she walks with you
const WALK_LINES = ['Fern falls into step beside you, humming.', '“Listen, a woodpecker!” Fern points up into the birches.', 'Fern stops to touch a mossy stone, then hurries to catch up.', '“I could walk this forest all day,” Fern says.'];
const ALL_LINES = [...FERN_LINES, ...WALK_LINES];
const LINE_TIME = 4;   // seconds a line stays up while you walk together
const keys = { left: false, right: false, hurry: false };
let ready = false, background, worldWidth = 1800, x = 140, facing = 1, distance = 0, moving = false, camera = 0, scale = 1, last = 0;
let met = false, chat = -1, chatT = 0;
let fx = 0, fernFacing = -1, fernMoving = false, fernDistance = 0;   // where Fern is, which way she faces, her walk
function resize() {
  const width = canvas.getBoundingClientRect().width;
  scale = Math.min(2.5, (width || W) / W * (window.devicePixelRatio || 1));
  canvas.width = Math.round(W * scale); canvas.height = Math.round(H * scale);
}
new ResizeObserver(resize).observe(canvas);
function clearKeys() { keys.left = keys.right = keys.hurry = false; }
const fernX = () => fx;
const nearFern = () => Math.abs(x - fernX()) < 150;
// she stands a step behind the boy, on the side he's coming from
const fernSpot = () => clamp(x - facing * FERN.gap, 40, worldWidth - 40);
function reset() {
  if (!ready) return;
  clearKeys(); x = 140; facing = 1; distance = 0; camera = 0; chat = -1; chatT = 0;
  fx = met ? fernSpot() : FERN.at * worldWidth; fernFacing = met ? 1 : -1; fernMoving = false;
  update(0); render();
}
function sayHello() {
  if (!ready || !nearFern()) return;
  // her greetings first, then the walking-together lines, round and round
  chat = chat + 1 >= ALL_LINES.length ? FERN_LINES.length : chat + 1;
  chatT = LINE_TIME;
  if (!met) { met = true; $('fernCard').dataset.met = 'true'; $('fernNote').textContent = 'walking with you'; }
  update(0);
}
function update(dt) {
  const dir = Number(keys.right) - Number(keys.left), old = x;
  x = clamp(x + dir * (keys.hurry ? 335 : 205) * dt, 40, worldWidth - 40);
  moving = x !== old;
  if (moving) { facing = dir; distance += Math.abs(x - old); }
  const target = clamp(x - W / 2 + facing * 65, 0, Math.max(0, worldWidth - W));
  camera += (target - camera) * Math.min(1, dt * (reduced ? 20 : 5));
  // Fern walks to her spot behind the boy, a little slower to start and quicker to catch up
  if (met) {
    const d = fernSpot() - fx, step = Math.min(Math.abs(d), (Math.abs(d) > 160 ? 360 : keys.hurry ? 335 : 215) * dt);
    fernMoving = step > .4;
    if (fernMoving) { fx += Math.sign(d) * step; fernDistance += step; fernFacing = Math.sign(d); }
    else if (Math.abs(x - fx) > 1) fernFacing = Math.sign(x - fx);
  }
  chatT = Math.max(0, chatT - dt);
  const progress = (x - 40) / (worldWidth - 80);
  $('distance').textContent = progress < .06 ? 'Forest edge' : progress > .94 ? 'The far meadow' : `${Math.round(progress * 100)}% into the forest`;
  const close = nearFern();
  if (!close && !met) chat = -1;
  $('hello').hidden = !close;
  const line = chat < 0 ? null : ALL_LINES[chat];
  let text = null;
  if (close && !met) text = 'A girl with red curls is standing among the ferns. Say hello?';
  else if (close && line && (chatT > 0 || !moving)) text = line;
  else if (close && !moving && !line) text = 'Fern is here. Say hello again?';
  if (!text) {
    let best = 130;
    LANDMARKS.forEach(([at, line]) => { const d = Math.abs(x - at * worldWidth); if (d < best) { best = d; text = line; } });
  }
  $('caption').hidden = !text; if (text) $('caption').textContent = text;
}
function render() {
  ctx.setTransform(scale, 0, 0, scale, 0, 0); ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(background, -camera, -35, worldWidth, 600);
  // Fern, a little further back on the path: walking with her walk sheet, or standing holding her frond
  const fsx = fernX() - camera, fy = GROUND - 14;
  if (fsx > -150 && fsx < W + 150) {
    ctx.fillStyle = 'rgba(40,58,28,.22)'; ctx.beginPath(); ctx.ellipse(fsx, fy, 34, 6, 0, 0, Math.PI * 2); ctx.fill();
    if (fernMoving) {
      const wk = FERN.walk, k = FERN.height / (wk.fh - 4), f = Math.floor(fernDistance / (wk.cycle / wk.frames)) % wk.frames;
      ctx.save(); ctx.translate(fsx, fy); ctx.scale(fernFacing, 1);
      ctx.drawImage(wk.img, f * wk.fw, 0, wk.fw, wk.fh, -wk.ax * k, -(wk.fh - 4) * k, wk.fw * k, wk.fh * k);
      ctx.restore();
    } else {
      const fk = FERN.height / FERN.img.height;
      ctx.drawImage(FERN.img, fsx - FERN.img.width * fk / 2, fy - FERN.height, FERN.img.width * fk, FERN.height);
    }
  }
  const k = BOY.height / BOY.fh, frame = moving ? Math.floor(distance / (BOY.cycle / BOY.frames)) % BOY.frames : 0, sx = x - camera;
  ctx.fillStyle = 'rgba(40,58,28,.24)'; ctx.beginPath(); ctx.ellipse(sx, GROUND, 40, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(sx, GROUND); ctx.scale(facing, 1);
  ctx.drawImage(BOY.img, frame * BOY.fw, 0, BOY.fw, BOY.fh, -BOY.ax * k, -(BOY.fh - 4) * k, BOY.fw * k, BOY.fh * k);
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
  else if (['ArrowUp', 'Enter', 'w', 'W'].includes(event.key) && !event.repeat && nearFern()) sayHello();
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
$('hello').addEventListener('click', () => { sayHello(); canvas.focus({ preventScroll: true }); });
$('reset').addEventListener('click', () => { reset(); canvas.focus({ preventScroll: true }); });
$('fernCard').dataset.met = 'false';
function load(src) { return new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error(`Could not load ${src}`)); image.src = src; }); }
(async () => {
  resize();
  try {
    [background, BOY.img, FERN.img, FERN.walk.img] = await Promise.all([load('forest.jpg'), load(BOY.image), load(FERN.image), load(FERN.walk.image)]);
    worldWidth = Math.max(W, background.width * 600 / background.height);
    ready = true; reset(); $('loading').hidden = true; $('reset').disabled = false;
    requestAnimationFrame(now => { last = now; requestAnimationFrame(frame); });
  } catch (error) { $('loading').textContent = `${error.message}. Refresh to try again.`; }
})();
})();
