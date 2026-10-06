(() => {
'use strict';
const W = 960, H = 540, BG_H = 600;
const SPRITE = { fw: 224, fh: 420, ax: 104, frames: 8, height: 205, stride: 150 };
const LANDMARKS = [
  [.12, 'Golden arches frame the shops on the west terrace.'],
  [.29, 'White blossoms spill over the balconies above the promenade.'],
  [.38, 'Waterfalls tumble beneath bridges that link the skycity towers.'],
  [.51, 'Slender towers rise above the gardens into the clear blue sky.'],
  [.69, 'A little café overlooks the terraces and distant waterfalls.'],
  [.87, 'Sunlight shines through the tall windows on the east terrace.'],
];
const PLACES = [
  { name: 'Skycity Promenade', image: 'skycity.jpg', ground: 507, height: 205, landmarks: LANDMARKS,
    doors: [[.94, 1, .12, 'Visit Nyx’s mansion']] },
  { name: 'Mansion Gardens', image: 'mansion.jpg', ground: 518, height: 205,
    landmarks: [[.25, 'Waterfalls and flowering trees surround Nyx’s mansion.'], [.5, 'The grand central steps lead into the mansion.'], [.8, 'Glass balconies look out over the skycity.']],
    doors: [[.12, 0, .94, 'Return to the skycity'], [.5, 2, .5, 'Enter the mansion']] },
  { name: 'Mansion Entrance', image: 'mansion-entrance.jpg', ground: 520, height: 235,
    landmarks: [[.12, 'Bookshelves fill a quiet alcove beside the entrance.'], [.5, 'A golden chandelier hangs above the gleaming marble floor.'], [.88, 'Sunlight fills the sitting room beyond the archway.']],
    doors: [[.5, 1, .5, 'Go outside to the gardens'], [.7, 3, .63, 'Go upstairs to Nyx’s bedroom']] },
  { name: 'Nyx’s Bedroom', image: 'bedroom.jpg', ground: 524, height: 285,
    landmarks: [[.18, 'Nyx’s writing desk looks over the city.'], [.38, 'A cushioned window seat catches the afternoon sun.'], [.53, 'A golden mirror stands above the dressing table.'], [.82, 'Ivory bedding and gold cushions cover Nyx’s bed.']],
    doors: [[.63, 2, .7, 'Return downstairs to the entrance']] },
];
let place = 0, nearDoor = null;
function enterPlace(index, position) {
  if (!ready) return;
  clearKeys(); place = index; background = PLACES[place].background;
  worldWidth = Math.max(W, background.width * BG_H / background.height);
  x = position * worldWidth; camera = clamp(x - W / 2, 0, worldWidth - W);
  $('placeName').textContent = PLACES[place].name;
  PLACES.forEach((_, i) => $('place-' + i).setAttribute('aria-pressed', String(i === place)));
  update(0); render();
}
function useDoor() { if (nearDoor) enterPlace(nearDoor[1], nearDoor[2]); }
const $ = id => document.getElementById(id);
const canvas = $('game'), ctx = canvas.getContext('2d');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
let ready = false, background, sprite, worldWidth = 1800, scale = 1;
let x = 235, camera = 0, facing = 1, distance = 0, moving = false, last = 0;
const keys = { left: false, right: false, hurry: false };
function resize() {
  scale = Math.min(2.5, (canvas.getBoundingClientRect().width || W) / W * (window.devicePixelRatio || 1));
  canvas.width = Math.round(W * scale); canvas.height = Math.round(H * scale);
}
new ResizeObserver(resize).observe(canvas);
function clearKeys() { keys.left = keys.right = keys.hurry = false; moving = false; }
function reset() {
  if (!ready) return;
  facing = 1; distance = 0; enterPlace(0, 235 / Math.max(W, PLACES[0].background.width * BG_H / PLACES[0].background.height)); x = 235; camera = 0; update(0); render();
}
function update(dt) {
  const dir = Number(keys.right) - Number(keys.left), previous = x;
  x = clamp(x + dir * (keys.hurry ? 330 : 200) * dt, 55, worldWidth - 55);
  moving = x !== previous;
  if (moving) { facing = dir; distance += Math.abs(x - previous); }
  const target = clamp(x - W / 2 + facing * 90, 0, worldWidth - W);
  camera += (target - camera) * Math.min(1, dt * (reduced ? 24 : 5));
  $('distance').textContent = place ? (x < worldWidth * .2 ? 'West side' : x > worldWidth * .8 ? 'East side' : 'Inside the grounds') : x < worldWidth * .2 ? 'West terrace' : x > worldWidth * .8 ? 'East terrace' : 'Above the waterfalls';
  let nearby = null, nearest = 140;
  for (const [position, text] of PLACES[place].landmarks) {
    const d = Math.abs(x - position * worldWidth);
    if (d < nearest) { nearest = d; nearby = text; }
  }
  nearDoor = PLACES[place].doors.find(door => Math.abs(x - door[0] * worldWidth) < 80) || null;
  $('doorBtn').hidden = !nearDoor;
  if (nearDoor) $('doorBtn').textContent = nearDoor[3] + ' ↑';
  $('caption').hidden = !nearby; $('caption').textContent = nearby || '';
}
function render() {
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(background, -camera, -42, worldWidth, BG_H);
  const frame = moving && !reduced ? Math.floor(distance / SPRITE.stride * SPRITE.frames) % SPRITE.frames : 0;
  const height = PLACES[place].height, k = height / SPRITE.fh;
  ctx.save(); ctx.translate(x - camera, PLACES[place].ground); ctx.scale(facing, 1);
  ctx.drawImage(sprite, frame * SPRITE.fw, 0, SPRITE.fw, SPRITE.fh,
    -SPRITE.ax * k, -height, SPRITE.fw * k, height);
  ctx.restore();
}
addEventListener('keydown', event => {
  if (!ready || event.target.closest?.('input,select,textarea,button,a')) return;
  if (['ArrowLeft', 'a', 'A'].includes(event.key)) keys.left = true;
  else if (['ArrowRight', 'd', 'D'].includes(event.key)) keys.right = true;
  else if (['ArrowUp', 'w', 'W', 'Enter'].includes(event.key)) { if (!event.repeat) useDoor(); event.preventDefault(); return; }
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
for (const direction of ['left', 'right']) {
  const button = $(direction);
  button.addEventListener('pointerdown', event => {
    if (!ready) return;
    event.preventDefault(); button.setPointerCapture?.(event.pointerId);
    keys[direction] = true; button.classList.add('held');
  });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    button.addEventListener(event, () => { keys[direction] = false; button.classList.remove('held'); });
  }
}
PLACES.forEach((_, i) => $('place-' + i).addEventListener('click', () => enterPlace(i, i === 3 ? .63 : .5)));
$('doorBtn').addEventListener('click', useDoor);
$('reset').addEventListener('click', reset);
function load(src) {
  return new Promise((resolve, reject) => {
    const img = new Image(); img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`)); img.src = src;
  });
}
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000 || 0); last = now;
  update(dt); render(); requestAnimationFrame(frame);
}
(async () => {
  resize();
  try { await Promise.all([load('nyx-walk.png').then(image => sprite = image), ...PLACES.map(async p => { p.background = await load(p.image); })]); background = PLACES[0].background; }
  catch (error) { $('loading').textContent = `${error.message}. Refresh to try again.`; return; }
  worldWidth = Math.max(W, background.width * BG_H / background.height);
  ready = true; $('loading').hidden = true; $('reset').disabled = false;
  PLACES.forEach((_, i) => $('place-' + i).disabled = false);
  reset(); requestAnimationFrame(frame);
})();
})();
