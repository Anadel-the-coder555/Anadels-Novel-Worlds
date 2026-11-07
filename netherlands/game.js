(() => {
'use strict';
const W = 960, H = 540, BG_H = 600;
const $ = id => document.getElementById(id);
const canvas = $('game'), ctx = canvas.getContext('2d');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
// The four walk Netherlands together. Whoever leads is steered with the keys; the others follow a step
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
const GAP = 140;
// Each place is one or more paintings laid end to end (`mirror` flips every other copy so the joins match),
// drawn BG_H tall and lifted by `yoff`. `ground` is where feet go, `scale` sizes the party to the buildings,
// `walk` is the stretch of the painting they can walk (as fractions of its width), and `doors` are spots
// where ↑ takes them somewhere else, arriving at `arrive` (a fraction of the next place's width).
// Landmark lines sit at fractions of the place's width too.
const PLACES = [
  { id: 'wood', name: 'The Autumn Wood', tiles: ['forest.jpg', 'forest.jpg', 'forest.jpg'], mirror: true,
    yoff: -35, ground: 500, scale: 1, walk: [0, 1], start: .05,
    landmarks: [
      [.02, 'Golden light falls between the tall beech trunks.'],
      [.07, 'A mossy boulder rests beside the path.'],
      [.13, 'Fallen leaves crunch softly underfoot.'],
      [.2, 'A great beech blazes red overhead.'],
      [.26, 'Ferns curl along the edge of the path.'],
      [.45, 'The path winds on, deeper into the golden wood.'],
      [.8, 'Through the trees, you glimpse rooftops ahead.'],
    ],
    doors: [{ at: .985, label: 'Walk on to the village', to: 'village', arrive: .09, facing: 1 }] },
  { id: 'village', name: 'The Village', tiles: ['village.jpg'],
    yoff: -42, ground: 512, scale: .58, walk: [0, 1], start: .05,
    landmarks: [
      [.15, 'A little shop under a cream awning, its shelves full of jars and cheeses.'],
      [.29, 'A tall dark house with a curling gable and white window boxes.'],
      [.41, 'A market stall piled high with apples and pumpkins.'],
      [.5, 'The old tree drops golden leaves across the cobbles.'],
      [.6, 'A wooden bench waits beneath the window boxes.'],
      [.66, 'Another little shop, its baskets heaped with apples.'],
    ],
    doors: [
      { at: .015, label: 'Back to the wood', to: 'wood', arrive: .94, facing: -1 },
      { at: .91, label: 'Through the archway to Praelia’s estate', to: 'estate', arrive: .5, facing: 1 },
    ] },
  { id: 'estate', name: 'Praelia’s Estate', tiles: ['estate.jpg'],
    yoff: -62, ground: 510, scale: .62, walk: [.36, .64], start: .5,
    landmarks: [
      [.45, 'Praelia’s home: the iron gates stand open across the moat.'],
      [.56, 'Clipped hedges and late roses fill the gardens either side of the drive.'],
    ],
    doors: [{ at: .38, label: 'Back to the village', to: 'village', arrive: .9, facing: -1 }] },
];
const placeById = id => PLACES.find(p => p.id === id);
// The carriage adventure, in the wood: it rattles off ahead of the party, a little faster than walking, so
// you hurry to catch it. It slows to wait when you fall far behind and pulls up at the end of the path, so
// it can always be caught (even on a phone without Shift). Its sheet is 4 frames across and 2 down, facing
// right, with x at its rear wheel and `ground` at the wheels' foot.
const CARRIAGE = { image: 'carriage.webp', frames: 8, fw: 838, fh: 360, ground: 352, height: 300, cycle: 420,
  speed: 245, wait: 120, far: 650, start: 160 };
const keys = { left: false, right: false, hurry: false };
let ready = false, place = PLACES[0], worldWidth = 1800, camera = 0, scale = 1, last = 0, lead = 0;
let chase = null;   // { x, speed, distance, caught, stopped } while the carriage is out
let travelling = null;   // the place being loaded on the way there
PARTY.forEach(p => Object.assign(p, { x: 0, facing: 1, moving: false, distance: 0 }));
const leader = () => PARTY[lead];
const followers = () => PARTY.filter((_, i) => i !== lead);
const S = () => place.scale;
const gap = () => GAP * S();
const bounds = () => [Math.max(40, place.walk[0] * worldWidth + 30), Math.min(worldWidth - 40, place.walk[1] * worldWidth - 30)];
const START = () => clamp(place.start * worldWidth + gap() * (PARTY.length - 1), ...bounds());
function resize() {
  const width = canvas.getBoundingClientRect().width;
  scale = Math.min(2.5, (width || W) / W * (window.devicePixelRatio || 1));
  canvas.width = Math.round(W * scale); canvas.height = Math.round(H * scale);
}
new ResizeObserver(resize).observe(canvas);
function clearKeys() { keys.left = keys.right = keys.hurry = false; }
// each follower keeps their place in line, a step further behind the leader on the side they came from
const spot = rank => clamp(leader().x - leader().facing * gap() * (rank + 1), ...bounds());
const tileWidth = img => img.width * BG_H / img.height;
const widthOf = p => p.imgs.reduce((w, img) => w + tileWidth(img), 0);
// put the party in a place: the leader at x facing `facing`, the others lined up behind, camera on them
function arrive(next, x, facing) {
  place = next; worldWidth = widthOf(place);
  if (place.id !== 'wood') chase = null;
  Object.assign(leader(), { x: clamp(x, ...bounds()), facing, moving: false, distance: 0 });
  followers().forEach((p, r) => Object.assign(p, { x: spot(r), facing, moving: false, distance: 0 }));
  camera = cameraTarget(); chaseButton();
  if ($('placeName')) $('placeName').textContent = place.name;
  PLACES.forEach(p => $(`go-${p.id}`)?.setAttribute('aria-pressed', String(p === place)));
  update(0);
}
const loaded = {};   // painting file -> its loading image
function loadPlace(p) {
  if (p.imgs) return Promise.resolve(p);
  return Promise.all(p.tiles.map(src => loaded[src] || (loaded[src] = load(src)))).then(imgs => { p.imgs = imgs; return p; });
}
// travel to a place by id, arriving at `at` (a fraction of its width); it waits for the painting if needed
function travel(id, at, facing = 1) {
  const next = placeById(id);
  if (!ready || !next || travelling) return Promise.resolve();
  clearKeys();
  if (!next.imgs) { travelling = next; $('caption').hidden = false; $('caption').textContent = `Walking to ${next.name}…`; }
  return loadPlace(next).then(() => {
    travelling = null;
    arrive(next, (at ?? next.start) * widthOf(next), facing);
  }, error => { travelling = null; $('caption').textContent = `${error.message}. Try again.`; });
}
function reset() {
  if (!ready || travelling) return;
  clearKeys(); chase = null;
  place = PLACES[0]; worldWidth = widthOf(place);
  arrive(place, START(), 1);
  camera = 0;
}
const carriageWidth = () => CARRIAGE.fw * CARRIAGE.height / CARRIAGE.ground;
function chaseButton() { const b = $('chase'); if (b) b.textContent = chase ? 'Chase it again' : 'Chase the carriage'; }
// the party goes back to the wood's edge and the carriage sets off just ahead of the leader
function startChase() {
  if (!ready || travelling) return;
  reset();
  chase = { x: leader().x + CARRIAGE.start, speed: 0, distance: 0, caught: false, stopped: false };
  chaseButton(); update(0);
}
function updateChase(dt, L) {
  if (!chase) return null;
  const ahead = chase.x - L.x, end = worldWidth - carriageWidth() - 30;
  // caught when the leader draws level with the coachman's seat, a little over halfway along
  if (!chase.caught && L.x >= chase.x + carriageWidth() * .55) { chase.caught = true; chase.stopped = true; clearKeys(); }   // everyone stops beside it
  if (!chase.stopped && chase.x >= end) chase.stopped = true;
  const want = chase.stopped ? 0 : ahead > CARRIAGE.far ? CARRIAGE.wait : CARRIAGE.speed;
  chase.speed += (want - chase.speed) * Math.min(1, dt * 3);   // the horse eases up and away
  if (chase.stopped && chase.speed < 4) chase.speed = 0;
  const step = Math.min(chase.speed * dt, Math.max(0, end - chase.x));
  chase.x += step; chase.distance += step;
  if (chase.caught) return `${L.name} catches up with the carriage! The coachman reins in and tips his hat.`;
  if (chase.stopped) return 'The carriage has pulled up at the end of the path. Catch up!';
  if (ahead > CARRIAGE.far) return 'The carriage is pulling away! Hold Shift to hurry.';
  return ahead > 250 ? 'Hurry after the carriage!' : 'You’re gaining on it!';
}
function choose(index) {
  if (!ready || index === lead || !PARTY[index]) return;
  lead = index;   // the new leader steps up where they are, and the others fall in behind
  PARTY.forEach((p, i) => $(`pick-${p.id}`)?.setAttribute('aria-pressed', String(i === lead)));
  if ($('leaderName')) $('leaderName').textContent = leader().name;
  update(0);
}
// the door the leader is standing at, if any
const doorHere = () => place.doors.find(d => Math.abs(leader().x - d.at * worldWidth) < 110 * Math.max(.7, S()));
function useDoor() {
  const d = doorHere();
  return d ? travel(d.to, d.arrive, d.facing) : Promise.resolve();
}
// the camera keeps the whole line in view: the leader a little ahead of centre, the last follower well inside
const cameraTarget = () => clamp(leader().x - W / 2 - leader().facing * (gap() * (PARTY.length - 1) / 2 - 65 * S()), 0, Math.max(0, worldWidth - W));
function update(dt) {
  const L = leader(), dir = travelling ? 0 : Number(keys.right) - Number(keys.left), old = L.x;
  const pace = .55 + .45 * S();   // smaller figures cover fewer pixels per step
  L.x = clamp(L.x + dir * (keys.hurry ? 320 : 190) * pace * dt, ...bounds());
  L.moving = L.x !== old;
  if (L.moving) { L.facing = dir; L.distance += Math.abs(L.x - old) / S(); }
  // followers walk to their places, a little slower to start and quicker to catch up when left behind
  followers().forEach((p, r) => {
    const d = spot(r) - p.x, step = Math.min(Math.abs(d), (Math.abs(d) > 160 * S() ? 360 : keys.hurry ? 320 : 200) * pace * dt);
    p.moving = step > .4;
    if (p.moving) { p.x += Math.sign(d) * step; p.distance += step / S(); p.facing = Math.sign(d); }
    else if (Math.abs(L.x - p.x) > 1) p.facing = Math.sign(L.x - p.x);
  });
  camera += (cameraTarget() - camera) * Math.min(1, dt * (reduced ? 20 : 5));
  if (place.id === 'wood') {
    const lo = START(), hi = worldWidth - 40, progress = Math.max(0, (L.x - lo) / (hi - lo));
    $('distance').textContent = progress < .03 ? 'The wood’s edge' : progress > .95 ? 'The far edge of the wood' : `${Math.round(progress * 100)}% through the wood`;
  } else $('distance').textContent = place.id === 'village' ? 'Along the village street' : 'Before the gates';
  const door = doorHere();
  if ($('door')) { $('door').hidden = !door || !!travelling; if (door) $('doorLabel').textContent = door.label; }
  if (travelling) return;
  let text = updateChase(dt, L), best = text ? 0 : 140 * Math.max(.7, S());
  place.landmarks.forEach(([at, line]) => { const d = Math.abs(L.x - at * worldWidth); if (d < best) { best = d; text = line; } });
  $('caption').hidden = !text; if (text) $('caption').textContent = text;
}
function draw(p, y) {
  const sx = p.x - camera, s = S();
  if (sx < -200 || sx > W + 200) return;
  ctx.fillStyle = 'rgba(60,40,15,.24)'; ctx.beginPath(); ctx.ellipse(sx, y, 62 * s, 7 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(sx, y);
  if (p.moving) {
    const wk = p.walk, k = p.height * s / (wk.fh - 4), f = Math.floor(p.distance / (wk.cycle / wk.frames)) % wk.frames;
    ctx.scale(p.facing, 1);
    ctx.drawImage(wk.img, f * wk.fw, 0, wk.fw, wk.fh, -wk.ax * k, -(wk.fh - 4) * k, wk.fw * k, wk.fh * k);
  } else {
    const img = p.img, h = p.height * s, k = h / img.height;
    if (p.standFlip) ctx.scale(-p.facing, 1);
    ctx.drawImage(img, -img.width * k / 2, -h, img.width * k, h);
  }
  ctx.restore();
}
function render() {
  ctx.setTransform(scale, 0, 0, scale, 0, 0); ctx.imageSmoothingQuality = 'high';
  let x0 = -camera;
  place.imgs.forEach((img, i) => {
    const tw = tileWidth(img);
    if (x0 < W && x0 + tw > 0) {
      ctx.save(); ctx.translate(x0, 0);
      if (place.mirror && i % 2) { ctx.translate(tw, 0); ctx.scale(-1, 1); }
      ctx.drawImage(img, 0, place.yoff, tw, BG_H); ctx.restore();
    }
    x0 += tw;
  });
  // the carriage runs a little further up the path, behind the party
  if (chase) {
    const c = CARRIAGE, k = c.height / c.ground, sx = chase.x - camera, y = place.ground - 22;
    const f = chase.speed > 0 ? Math.floor(chase.distance / (c.cycle / c.frames)) % c.frames : 0;
    if (sx < W + 50 && sx + carriageWidth() > -50)
      ctx.drawImage(c.img, (f % 4) * c.fw, Math.floor(f / 4) * c.fh, c.fw, c.fh, sx, y - c.ground * k, c.fw * k, c.fh * k);
  }
  // the furthest back is drawn first, a touch further up the path, so the leader is always in front
  followers().map((p, r) => [p, r]).reverse().forEach(([p, r]) => draw(p, place.ground - 8 * S() * (r + 1)));
  draw(leader(), place.ground);
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
  else if (['ArrowUp', 'w', 'W', 'Enter'].includes(event.key)) { if (!event.repeat) useDoor(); }
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
const refocus = () => canvas.focus({ preventScroll: true });
// a button can be missing if the browser still has an older copy of the page; the game carries on without it
PARTY.forEach((p, i) => $(`pick-${p.id}`)?.addEventListener('click', () => { choose(i); refocus(); }));
PLACES.forEach(p => $(`go-${p.id}`)?.addEventListener('click', () => { if (p !== place) travel(p.id); refocus(); }));
$('door')?.addEventListener('click', () => { useDoor(); refocus(); });
$('chase')?.addEventListener('click', () => { startChase(); refocus(); });
$('reset').addEventListener('click', () => { reset(); refocus(); });
function load(src) { return new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error(`Could not load ${src}`)); image.src = src; }); }
(async () => {
  resize();
  try {
    // count the pictures in as they arrive, so a slow connection shows it is still working
    const sources = ['forest.jpg', ...PARTY.flatMap(p => [p.image, p.walk.image]), CARRIAGE.image];
    let done = 0;
    const images = await Promise.all(sources.map(src => (loaded[src] = load(src)).then(image => {
      $('caption').textContent = `Opening the wood… ${++done} of ${sources.length}`; return image;
    })));
    PARTY.forEach((p, i) => { p.img = images[1 + i * 2]; p.walk.img = images[2 + i * 2]; });
    CARRIAGE.img = images.at(-1);
    await loadPlace(PLACES[0]);
    ready = true; reset();
    ['reset', 'chase', ...PLACES.map(p => `go-${p.id}`)].forEach(id => { if ($(id)) $(id).disabled = false; });
    PARTY.forEach(p => { const b = $(`pick-${p.id}`); if (b) b.disabled = false; });
    requestAnimationFrame(now => { last = now; requestAnimationFrame(frame); });
    // the village and the estate come in quietly behind, so walking there later is instant
    PLACES.slice(1).forEach(p => loadPlace(p).catch(() => {}));
  } catch (error) { $('caption').hidden = false; $('caption').textContent = `${error.message}. Refresh to try again.`; }
})();
})();
