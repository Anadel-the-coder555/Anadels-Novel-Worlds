(() => {
'use strict';
const W = 960, H = 540, GAP = 105, STEP = 3;
const $ = id => document.getElementById(id);
const canvas = $('game'), ctx = canvas.getContext('2d');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const ACTORS = [
  { id: 'girl', image: 'girl-walk.png', fw: 277, fh: 420, ax: 132, height: 196, cycle: 165 },
  { id: 'guy', image: 'guy-walk.png', fw: 255, fh: 420, ax: 114, height: 212, cycle: 185 },
];
const BRIELLE_OUTFITS = [ACTORS[0],
  { image: 'brielle-dress-walk.png', fw: 272, fh: 420, ax: 138, height: 196, cycle: 165 },
];
// Grayson, Brielle's older brother, works in the workshop. His sheet is 8 frames facing right; frame 0 is
// him standing still. He potters between spots along the benches and stops to greet whoever comes close.
const GRAYSON = { image: 'grayson-walk.webp', fw: 248, fh: 420, ax: 122, height: 220, cycle: 190,
  speed: 80, spots: [.36, .5, .62, .44, .56, .3], notice: 175 };
const GRAYSON_LINES = [
  [ // Brielle leads
    'Brielle! There’s my little sister. Come to see what your big brother’s been building?',
    'Careful by the bench — the arm gets fussy when anyone but me touches the crystals.',
    'Every ring on that shelf hums a different note. Go on, hold one up to your ear.',
    'Off you go, then. Come back and tell me everything you find out there.',
  ],
  [ // Zendayo leads
    'Zendayo! Good to see you. Keeping Brielle out of trouble, or helping her into it?',
    'Pull up the stool if you like. I’m tuning a compass that points to whatever you’ve lost.',
    'Those rings? Each one’s set with a crystal from the hills. Took me all winter.',
    'Look after my sister out there. And tell her to visit more often.',
  ],
];
// Each place is one painting drawn 600 tall and lifted by `yoff`; `ground` is where feet go and `scale`
// sizes the party to the room. Doors are spots where ↑ takes them somewhere else, arriving at `arrive`
// (a fraction of the next place's width). Landmarks sit at fractions of the place's width too.
const PLACES = {
  promenade: { id: 'promenade', name: 'Green City Promenade', image: 'promenade.jpg', ground: 510, scale: 1, start: 270,
    landmarks: [
      [.09, 'Trees and flowers soften the glass storefronts.'],
      [.28, 'A quiet bench rests beneath a hanging garden.'],
      [.45, 'White towers rise above the green terraces.'],
      [.56, 'An arched passage opens between the garden buildings.'],
      [.74, 'Sunlight glints on the curved shop windows.'],
      [.92, 'The promenade stretches past another tree-lined terrace.'],
    ],
    doors: [{ at: .56, label: 'Into Grayson’s workshop', to: 'workshop', arrive: .09, facing: 1 }] },
  workshop: { id: 'workshop', name: 'Grayson’s Workshop', image: 'workshop.jpg', ground: 528, scale: 1.5, start: 160,
    landmarks: [
      [.05, 'A round window looks out over the white domes of the city.'],
      [.13, 'Blueprints glow across a glass screen on the drafting desk.'],
      [.27, 'A jointed brass arm rests over the bench, waiting for work.'],
      [.45, 'Tongs, files and glowing tools hang in neat rows on the wall.'],
      [.55, 'Crystals glow softly under glass domes along the bench.'],
      [.77, 'Rows of finished rings shine in the lit cabinet.'],
      [.92, 'A brass armillary sphere turns slowly around a point of blue light.'],
    ],
    doors: [{ at: .04, label: 'Back out to the promenade', to: 'promenade', arrive: .56, facing: 1 }] },
};
const states = ACTORS.map(() => ({ x: 0, distance: 0, facing: 1, moving: false }));
const grayson = { x: 0, distance: 0, facing: -1, moving: false, spot: 0, rest: 2, greeting: false };
let outfit = 0;
try { if (localStorage.getItem('forgotten-brielle-outfit') === '1') outfit = 1; } catch (_) {}
const keys = { left: false, right: false, hurry: false };
let ready = false, place = PLACES.promenade, worldWidth = 1800, lead = 0, together = true;
let x = 270, facing = 1, camera = 0, trail = [], scale = 1, last = 0;
let fade = 0, travelling = null, talk = null;
const S = () => place.scale;
const gap = () => GAP * S();
function resize() {
  const width = canvas.getBoundingClientRect().width;
  scale = Math.min(2.5, (width || W) / W * (window.devicePixelRatio || 1));
  canvas.width = Math.round(W * scale); canvas.height = Math.round(H * scale);
}
new ResizeObserver(resize).observe(canvas);
function clearKeys() { keys.left = keys.right = keys.hurry = false; }
function resetTrail() {
  trail = [];
  for (let i = Math.ceil(gap() / STEP) + 2; i >= 0; i--) trail.push({ x: x - facing * i * STEP, facing });
}
function arrive(id, at, dir) {
  place = PLACES[id]; worldWidth = Math.max(W, place.img.width * 600 / place.img.height);
  x = clamp(at, 32, worldWidth - 32); facing = dir; resetTrail();
  states.forEach((state, i) => Object.assign(state, { x: x - (i === lead ? 0 : facing * gap()), facing, moving: false }));
  camera = clamp(x - W / 2 + facing * 65, 0, Math.max(0, worldWidth - W));
  if (id === 'workshop') Object.assign(grayson, { x: GRAYSON.spots[0] * worldWidth, facing: -1, moving: false, spot: 0, rest: 2.5, greeting: false });
  $('place').textContent = place.name;
  $('stage').dataset.place = id;
  closeTalk();
}
function reset() {
  if (!ready) return;
  clearKeys(); travelling = null; fade = 0;
  arrive('promenade', PLACES.promenade.start, 1); camera = 0;
  states.forEach(state => state.distance = 0);
  update(0); render();
}
function choose(i) {
  if (!ready || i === lead) return;
  states[i].distance = states[lead].distance; lead = i;
  ACTORS.forEach((a, j) => $(a.id).setAttribute('aria-pressed', String(j === lead)));
  resetTrail(); states[lead].x = x; states[1 - lead].x = x - facing * gap();
  if (talk) showLine();
}
const doorHere = () => travelling ? null : place.doors.find(d => Math.abs(x - d.at * worldWidth) < 110);
function useDoor() {
  const door = doorHere();
  if (!door || talk) return false;
  clearKeys();
  if (reduced) { arrive(door.to, door.arrive * worldWidthOf(door.to), door.facing); return true; }
  travelling = { door, phase: 'out' };
  return true;
}
const worldWidthOf = id => Math.max(W, PLACES[id].img.width * 600 / PLACES[id].img.height);
const graysonNear = () => place.id === 'workshop' && Math.abs(x - grayson.x) < GRAYSON.notice;
function updateGrayson(dt) {
  if (place !== PLACES.workshop) return;
  grayson.greeting = graysonNear() || !!talk;
  if (grayson.greeting) {   // he puts down his work and turns to whoever is nearest
    grayson.moving = false; grayson.facing = Math.sign(x - grayson.x) || grayson.facing; grayson.rest = 1.5; return;
  }
  const target = GRAYSON.spots[grayson.spot] * worldWidth, d = target - grayson.x;
  if (Math.abs(d) < 1) {
    grayson.moving = false;
    grayson.rest -= dt;
    if (grayson.rest <= 0) { grayson.spot = (grayson.spot + 1) % GRAYSON.spots.length; grayson.rest = 2.5 + (grayson.spot % 3); }
    return;
  }
  const step = Math.min(Math.abs(d), GRAYSON.speed * dt);
  grayson.x += Math.sign(d) * step; grayson.distance += step; grayson.facing = Math.sign(d); grayson.moving = true;
}
function update(dt) {
  if (travelling) {
    fade = clamp(fade + (travelling.phase === 'out' ? 1 : -1) * dt * 4, 0, 1);
    if (travelling.phase === 'out' && fade >= 1) {
      const { door } = travelling; arrive(door.to, door.arrive * worldWidthOf(door.to), door.facing); travelling.phase = 'in';
    } else if (travelling.phase === 'in' && fade <= 0) travelling = null;
  }
  const dir = travelling || talk ? 0 : Number(keys.right) - Number(keys.left);
  const old = x;
  x = clamp(x + dir * (keys.hurry ? 335 : 205) * (.55 + .45 * S()) * dt, 32, worldWidth - 32);
  if (x !== old) {
    facing = dir;
    let previous = trail[trail.length - 1];
    while (Math.abs(x - previous.x) >= STEP) {
      previous = { x: previous.x + Math.sign(x - previous.x) * STEP, facing }; trail.push(previous);
    }
    if (trail.length > 160) trail.splice(0, trail.length - 160);
  }
  const follower = trail[Math.max(0, trail.length - 1 - Math.round(gap() / STEP))];
  states.forEach((state, i) => {
    const next = i === lead ? x : clamp(follower.x, 32, worldWidth - 32);
    const delta = next - state.x;
    state.moving = Math.abs(delta) > .01 && Math.abs(delta) < 40;
    if (state.moving) { state.distance += Math.abs(delta) / S(); state.facing = Math.sign(delta); }
    if (i === lead) state.facing = facing;
    state.x = next;
  });
  updateGrayson(dt);
  const target = clamp(x - W / 2 + facing * 65, 0, Math.max(0, worldWidth - W));
  camera += (target - camera) * Math.min(1, dt * (reduced ? 20 : 5));
  const progress = (x - 32) / (worldWidth - 64);
  $('distance').textContent = place.id === 'workshop'
    ? (progress < .12 ? 'By the door' : progress > .68 ? 'By the ring cabinet' : 'At the workbench')
    : progress < .06 ? 'West entrance' : progress > .94 ? 'East terrace' : `${Math.round(progress * 100)}% along the promenade`;
  const door = doorHere();
  $('door').hidden = !door || !!talk; if (door) $('doorLabel').textContent = door.label;
  const near = graysonNear() && !travelling;
  $('talk').hidden = !near || !!talk;
  let nearest = null, distance = 130;
  if (near) nearest = lead === 0 ? 'Grayson looks up from the bench and grins at his sister.' : 'Grayson looks up from the bench and waves you over.';
  else place.landmarks.forEach(([position, text]) => { const d = Math.abs(x - position * worldWidth); if (d < distance) { nearest = text; distance = d; } });
  if (talk || travelling) nearest = null;
  $('caption').hidden = !nearest; if (nearest) $('caption').textContent = nearest;
}
function drawSprite(sheet, state, feet, height, shadow) {
  const k = height * S() / sheet.fh, screenX = state.x - camera;
  if (screenX < -250 || screenX > W + 250) return;
  const frame = state.moving ? Math.floor(state.distance / (sheet.cycle / 8)) % 8 : 0;
  ctx.fillStyle = shadow; ctx.beginPath(); ctx.ellipse(screenX, feet, 40 * S(), 6 * S(), 0, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(screenX, feet); ctx.scale(state.facing, 1);
  ctx.drawImage(sheet.img, frame * sheet.fw, 0, sheet.fw, sheet.fh, -sheet.ax * k, -(sheet.fh - 4) * k, sheet.fw * k, sheet.fh * k);
  ctx.restore();
}
function drawActor(i) {
  const actor = i === 0 ? BRIELLE_OUTFITS[outfit] : ACTORS[i];
  drawSprite(actor, states[i], place.ground - (i === lead ? 0 : 5), actor.height, 'rgba(45,69,58,.2)');
}
function render() {
  ctx.setTransform(scale, 0, 0, scale, 0, 0); ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(place.img, -camera, -35, worldWidth, 600);
  if (place.id === 'workshop') drawSprite(GRAYSON, grayson, place.ground - 10, GRAYSON.height, 'rgba(70,55,35,.22)');
  if (together) drawActor(1 - lead); drawActor(lead);
  if (fade > 0) { ctx.fillStyle = `rgba(20,26,22,${fade})`; ctx.fillRect(0, 0, W, H); }
}
function showLine() {
  const lines = GRAYSON_LINES[lead];
  talk.line = Math.min(talk.line, lines.length - 1);
  $('talkLine').textContent = lines[talk.line];
  $('talkNext').textContent = talk.line === lines.length - 1 ? 'Goodbye' : 'Next ›';
}
function openTalk() {
  if (!ready || talk || !graysonNear() || travelling) return;
  clearKeys(); talk = { line: 0 }; $('talkCard').hidden = false; showLine();
  $('talkNext').focus({ preventScroll: true });
}
function nextLine() {
  if (!talk) return;
  if (talk.line >= GRAYSON_LINES[lead].length - 1) { closeTalk(); canvas.focus({ preventScroll: true }); return; }
  talk.line++; showLine();
}
function closeTalk() { talk = null; $('talkCard').hidden = true; }
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000 || 0); last = now;
  update(dt); render(); requestAnimationFrame(frame);
}
addEventListener('keydown', event => {
  if (!ready) return;
  if (talk && event.key === 'Escape') { closeTalk(); canvas.focus({ preventScroll: true }); event.preventDefault(); return; }
  if (event.target.closest?.('input,button,a,select')) return;
  if (['ArrowLeft', 'a', 'A'].includes(event.key)) keys.left = true;
  else if (['ArrowRight', 'd', 'D'].includes(event.key)) keys.right = true;
  else if (event.key === 'Shift') keys.hurry = true;
  else if (['ArrowUp', 'w', 'W'].includes(event.key)) { if (!useDoor()) return; }
  else if ((event.key === 'e' || event.key === 'E' || event.key === 'Enter') && !event.repeat) { if (!graysonNear() || talk) return; openTalk(); }
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
const refocus = () => canvas.focus({ preventScroll: true });
ACTORS.forEach((actor, i) => $(actor.id).addEventListener('click', () => { choose(i); refocus(); }));
$('together').addEventListener('change', event => { together = event.target.checked; refocus(); });
$('reset').addEventListener('click', () => { reset(); refocus(); });
$('door').addEventListener('click', () => { useDoor(); refocus(); });
$('talk').addEventListener('click', () => openTalk());
$('talkNext').addEventListener('click', () => nextLine());
$('talkClose').addEventListener('click', () => { closeTalk(); refocus(); });
function updateOutfitLabel() {
  canvas.setAttribute('aria-label', `Brielle in ${outfit ? 'a white-and-black dress' : 'blue trousers'} and Zendayo in a cream suit exploring the green city`);
}
$('brielleOutfit').value = String(outfit); updateOutfitLabel();
$('brielleOutfit').addEventListener('change', event => {
  outfit = Number(event.target.value) === 1 ? 1 : 0;
  try { localStorage.setItem('forgotten-brielle-outfit', String(outfit)); } catch (_) {}
  updateOutfitLabel(); refocus();
});
function load(src) { return new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error(`Could not load ${src}`)); image.src = src; }); }
(async () => {
  resize();
  try {
    // the workshop and Grayson load with everything else, so stepping inside is instant
    const images = await Promise.all([load('promenade.jpg'), ...ACTORS.map(a => load(a.image)), load(BRIELLE_OUTFITS[1].image),
      load(PLACES.workshop.image), load(GRAYSON.image)]);
    PLACES.promenade.img = images[0]; ACTORS.forEach((a, i) => a.img = images[i + 1]);
    BRIELLE_OUTFITS[1].img = images[3]; PLACES.workshop.img = images[4]; GRAYSON.img = images[5];
    ready = true; reset(); $('loading').hidden = true;
    ['girl', 'guy', 'reset', 'brielleOutfit'].forEach(id => $(id).disabled = false);
    requestAnimationFrame(now => { last = now; requestAnimationFrame(frame); });
  } catch (error) { $('loading').textContent = `${error.message}. Refresh to try again.`; }
})();
})();
