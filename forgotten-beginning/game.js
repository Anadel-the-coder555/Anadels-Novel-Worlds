(() => {
'use strict';
const W = 960, H = 540, GROUND = 510, GAP = 105, STEP = 3;
const $ = id => document.getElementById(id);
const canvas = $('game'), ctx = canvas.getContext('2d');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const ACTORS = [
  { id: 'girl', image: 'girl-walk.png', fw: 277, fh: 420, ax: 132, height: 196, cycle: 165 },
  { id: 'guy', image: 'guy-walk.png', fw: 255, fh: 420, ax: 114, height: 212, cycle: 185 },
];
const LANDMARKS = [
  [.09, 'Trees and flowers soften the glass storefronts.'],
  [.28, 'A quiet bench rests beneath a hanging garden.'],
  [.45, 'White towers rise above the green terraces.'],
  [.56, 'An arched passage opens between the garden buildings.'],
  [.74, 'Sunlight glints on the curved shop windows.'],
  [.92, 'The promenade stretches past another tree-lined terrace.'],
];
const states = ACTORS.map(() => ({ x: 0, distance: 0, facing: 1, moving: false }));
const BRIELLE_OUTFITS = [ACTORS[0],
  { image: 'brielle-dress-walk.png', fw: 272, fh: 420, ax: 138, height: 196, cycle: 165 },
];
let outfit = 0;
try { if (localStorage.getItem('forgotten-brielle-outfit') === '1') outfit = 1; } catch (_) {}
const keys = { left: false, right: false, hurry: false };
let ready = false, background, worldWidth = 1800, lead = 0, together = true;
let x = 270, facing = 1, camera = 0, trail = [], scale = 1, last = 0;
function resize() {
  const width = canvas.getBoundingClientRect().width;
  scale = Math.min(2.5, (width || W) / W * (window.devicePixelRatio || 1));
  canvas.width = Math.round(W * scale); canvas.height = Math.round(H * scale);
}
new ResizeObserver(resize).observe(canvas);
function clearKeys() { keys.left = keys.right = keys.hurry = false; }
function resetTrail() {
  trail = [];
  for (let i = Math.ceil(GAP / STEP) + 2; i >= 0; i--) trail.push({ x: x - facing * i * STEP, facing });
}
function reset() {
  if (!ready) return;
  clearKeys(); x = 270; facing = 1; camera = 0; resetTrail();
  states.forEach((state, i) => Object.assign(state, { x: x - (i === lead ? 0 : GAP), distance: 0, facing: 1, moving: false }));
  update(0); render();
}
function choose(i) {
  if (!ready || i === lead) return;
  states[i].distance = states[lead].distance; lead = i;
  ACTORS.forEach((a, j) => $(a.id).setAttribute('aria-pressed', String(j === lead)));
  resetTrail(); states[lead].x = x; states[1 - lead].x = x - facing * GAP;
}
function update(dt) {
  const dir = Number(keys.right) - Number(keys.left);
  const old = x;
  x = clamp(x + dir * (keys.hurry ? 335 : 205) * dt, 32, worldWidth - 32);
  if (x !== old) {
    facing = dir;
    let previous = trail[trail.length - 1];
    while (Math.abs(x - previous.x) >= STEP) {
      previous = { x: previous.x + Math.sign(x - previous.x) * STEP, facing }; trail.push(previous);
    }
    if (trail.length > 120) trail.splice(0, trail.length - 120);
  }
  const follower = trail[Math.max(0, trail.length - 1 - Math.round(GAP / STEP))];
  states.forEach((state, i) => {
    const next = i === lead ? x : clamp(follower.x, 32, worldWidth - 32);
    const delta = next - state.x;
    state.moving = Math.abs(delta) > .01 && Math.abs(delta) < 40;
    if (state.moving) { state.distance += Math.abs(delta); state.facing = Math.sign(delta); }
    if (i === lead) state.facing = facing;
    state.x = next;
  });
  const target = clamp(x - W / 2 + facing * 65, 0, Math.max(0, worldWidth - W));
  camera += (target - camera) * Math.min(1, dt * (reduced ? 20 : 5));
  const progress = (x - 32) / (worldWidth - 64);
  $('distance').textContent = progress < .06 ? 'West entrance' : progress > .94 ? 'East terrace' : `${Math.round(progress * 100)}% along the promenade`;
  let nearest = null, distance = 130;
  LANDMARKS.forEach(([position, text]) => { const d = Math.abs(x - position * worldWidth); if (d < distance) { nearest = text; distance = d; } });
  $('caption').hidden = !nearest; if (nearest) $('caption').textContent = nearest;
}
function drawActor(i) {
  const actor = i === 0 ? BRIELLE_OUTFITS[outfit] : ACTORS[i], state = states[i], k = actor.height / actor.fh;
  const frame = state.moving ? Math.floor(state.distance / (actor.cycle / 8)) % 8 : 0;
  const screenX = state.x - camera, feet = GROUND - (i === lead ? 0 : 5);
  if (screenX < -200 || screenX > W + 200) return;
  ctx.fillStyle = 'rgba(45,69,58,.2)'; ctx.beginPath(); ctx.ellipse(screenX, feet, 40, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(screenX, feet); ctx.scale(state.facing, 1);
  ctx.drawImage(actor.img, frame * actor.fw, 0, actor.fw, actor.fh, -actor.ax * k, -(actor.fh - 4) * k, actor.fw * k, actor.fh * k);
  ctx.restore();
}
function render() {
  ctx.setTransform(scale, 0, 0, scale, 0, 0); ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(background, -camera, -35, worldWidth, 600);
  if (together) drawActor(1 - lead); drawActor(lead);
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
  else if (event.key === '1' || event.key === '2') choose(Number(event.key) - 1);
  else if ((event.key === 't' || event.key === 'T') && !event.repeat) { together = !together; $('together').checked = together; }
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
ACTORS.forEach((actor, i) => $(actor.id).addEventListener('click', () => { choose(i); canvas.focus({ preventScroll: true }); }));
$('together').addEventListener('change', event => { together = event.target.checked; canvas.focus({ preventScroll: true }); });
$('reset').addEventListener('click', () => { reset(); canvas.focus({ preventScroll: true }); });
function updateOutfitLabel() {
  canvas.setAttribute('aria-label', `Brielle in ${outfit ? 'a white-and-black dress' : 'blue trousers'} and Zendayo in a cream suit exploring the promenade`);
}
$('brielleOutfit').value = String(outfit); updateOutfitLabel();
$('brielleOutfit').addEventListener('change', event => {
  outfit = Number(event.target.value) === 1 ? 1 : 0;
  try { localStorage.setItem('forgotten-brielle-outfit', String(outfit)); } catch (_) {}
  updateOutfitLabel(); canvas.focus({ preventScroll: true });
});
function load(src) { return new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error(`Could not load ${src}`)); image.src = src; }); }
(async () => {
  resize();
  try {
    const images = await Promise.all([load('promenade.jpg'), ...ACTORS.map(a => load(a.image)), load(BRIELLE_OUTFITS[1].image)]);
    background = images[0]; ACTORS.forEach((a, i) => a.img = images[i + 1]);
    BRIELLE_OUTFITS[1].img = images[3];
    worldWidth = Math.max(W, background.width * 600 / background.height);
    ready = true; reset(); $('loading').hidden = true;
    ['girl', 'guy', 'reset', 'brielleOutfit'].forEach(id => $(id).disabled = false);
    requestAnimationFrame(now => { last = now; requestAnimationFrame(frame); });
  } catch (error) { $('loading').textContent = `${error.message}. Refresh to try again.`; }
})();
})();
