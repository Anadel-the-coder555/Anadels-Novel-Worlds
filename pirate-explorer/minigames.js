// Playable mini-games inside the treasure hunt's episodes. An episode beat { game: 'wagon' } runs one of these.
// Each game is create(k) -> { update(dt), draw() }, and calls k.end({ won, score, text }) when it's over.
// The kit `k` gives a 960x420 canvas, input (keys, edge presses, pointer), and drawing helpers that use the crew's art.
(() => {
'use strict';
const W = 960, H = 420;            // the game's own playfield
const FRAME_H = 540, OFF = (FRAME_H - H) / 2;   // it sits in the middle of the 16:9 stage
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

// ---------------- the kit ----------------
function makeKit(canvas, api, done) {
  // games draw into an offscreen 960x420 field, which is then shown on the stage canvas
  const field = document.createElement('canvas');
  const g = field.getContext('2d');
  const keys = { left: false, right: false, up: false, down: false, act: false };
  let pressed = new Set();
  const pointer = { x: W / 2, y: H / 2, down: false, clicked: false, moved: false };
  const KEYMAP = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ArrowUp: 'up', w: 'up', W: 'up',
                   ArrowDown: 'down', s: 'down', S: 'down', ' ': 'act', Enter: 'act', e: 'act', E: 'act' };
  const onDown = e => {
    const k = KEYMAP[e.key];
    if (/^[1-9]$/.test(e.key)) pressed.add('n' + e.key);
    if (!k) return;
    e.preventDefault(); e.stopPropagation();
    if (!keys[k]) pressed.add(k);
    keys[k] = true;
  };
  const onUp = e => { const k = KEYMAP[e.key]; if (k) keys[k] = false; };
  const toLogical = e => { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * FRAME_H - OFF]; };
  const pMove = e => { [pointer.x, pointer.y] = toLogical(e); pointer.moved = true; };
  const pDown = e => { pMove(e); pointer.down = true; pointer.clicked = true; e.preventDefault(); };
  const pUp = () => { pointer.down = false; };
  addEventListener('keydown', onDown, true); addEventListener('keyup', onUp, true);
  canvas.addEventListener('pointermove', pMove); canvas.addEventListener('pointerdown', pDown); addEventListener('pointerup', pUp);

  // touch buttons under the canvas
  const pad = document.getElementById('gamePad');
  const holdBtn = (btn, k) => {
    btn.onpointerdown = e => { e.preventDefault(); btn.setPointerCapture?.(e.pointerId); if (!keys[k]) pressed.add(k); keys[k] = true; btn.classList.add('held'); };
    btn.onpointerup = btn.onpointercancel = btn.onlostpointercapture = () => { keys[k] = false; btn.classList.remove('held'); };
  };
  pad.querySelectorAll('button[data-k]').forEach(b => holdBtn(b, b.dataset.k));

  const imgCache = {};
  const image = src => { if (!imgCache[src]) { const i = new Image(); i.src = src; imgCache[src] = i; } return imgCache[src]; };

  const k = {
    W, H, g, field, keys, pointer, rand, clamp, pick, reduceMotion, t: 0,
    hit: name => pressed.has(name),
    clicked: () => pointer.clicked,
    setControls(list, label) {
      pad.hidden = false;
      pad.querySelectorAll('button[data-k]').forEach(b => { b.hidden = !list.includes(b.dataset.k); });
      pad.querySelector('[data-k="act"]').textContent = label || 'Action';
    },
    // full-length crew art, standing on footY, h px tall
    sprite(key, x, footY, h, flip = false, alpha = 1, rot = 0) {
      const p = api.pirate(key); if (!p?.img_) return 0;
      const img = p.img_, [sx, sy, sw, sh] = p.portrait || [0, 0, img.width, img.height], w = sw * h / sh;
      g.save(); g.globalAlpha = alpha; g.translate(x, footY); if (rot) g.rotate(rot); if (flip) g.scale(-1, 1);
      g.drawImage(img, sx, sy, sw, sh, -w / 2, -h, w, h); g.restore();
      return w;
    },
    // a round face token
    face(key, x, y, r, ring = '#f3e6cc') {
      const p = api.pirate(key); if (!p?.img_) return;
      const img = p.img_, s = p.face[2] * img.height, cx = p.face[0] * img.width, cy = p.face[1] * img.height;
      g.save(); g.beginPath(); g.arc(x, y, r, 0, 7); g.closePath();
      g.fillStyle = '#2c3e4a'; g.fill(); g.clip();
      g.drawImage(img, cx - s / 2, cy - s / 2, s, s, x - r, y - r, r * 2, r * 2); g.restore();
      g.strokeStyle = ring; g.lineWidth = 3; g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke();
    },
    // a stand-in figure for people without art (goons, girl pirates, the Pirate King)
    figure(x, footY, h, { coat = '#5a3b5e', skin = '#e0b48a', hat = '#2a1c14', sash = null, flip = false, hair = null, alpha = 1, squash = 0 } = {}) {
      g.save(); g.globalAlpha = alpha; g.translate(x, footY); if (flip) g.scale(-1, 1); g.scale(1 + squash, 1 - squash);
      const u = h / 100;
      g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(0, 0, 22 * u, 5 * u, 0, 0, 7); g.fill();
      g.fillStyle = '#3a2816'; g.fillRect(-12 * u, -38 * u, 9 * u, 38 * u); g.fillRect(3 * u, -38 * u, 9 * u, 38 * u);
      g.fillStyle = coat; k.rr(-18 * u, -78 * u, 36 * u, 46 * u, 8 * u); g.fill();
      if (sash) { g.fillStyle = sash; g.fillRect(-18 * u, -48 * u, 36 * u, 7 * u); }
      if (hair) { g.fillStyle = hair; g.beginPath(); g.ellipse(0, -84 * u, 14 * u, 18 * u, 0, 0, 7); g.fill(); }
      g.fillStyle = skin; g.beginPath(); g.arc(0, -88 * u, 11 * u, 0, 7); g.fill();
      g.fillStyle = '#2a1c14'; g.beginPath(); g.arc(4 * u, -89 * u, 1.6 * u, 0, 7); g.fill();
      if (hat) { g.fillStyle = hat; g.beginPath(); g.ellipse(0, -97 * u, 19 * u, 5 * u, 0, 0, 7); g.fill(); k.rr(-10 * u, -108 * u, 20 * u, 11 * u, 4 * u); g.fill(); }
      g.restore();
    },
    rr(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); },
    text(str, x, y, { size = 20, color = '#fff8ea', align = 'center', font = 'ui', stroke = 'rgba(30,18,8,.8)', weight = 700 } = {}) {
      const fam = font === 'display' ? '"Pirata One", Georgia, serif' : font === 'story' ? '"IM Fell English", Georgia, serif' : '"Alegreya Sans", sans-serif';
      g.font = `${font === 'ui' ? weight : 400} ${size}px ${fam}`; g.textAlign = align; g.textBaseline = 'middle';
      if (stroke) { g.strokeStyle = stroke; g.lineWidth = Math.max(3, size / 6); g.lineJoin = 'round'; g.strokeText(str, x, y); }
      g.fillStyle = color; g.fillText(str, x, y);
    },
    bar(x, y, w, h, frac, color, label) {
      g.fillStyle = 'rgba(20,12,6,.6)'; k.rr(x, y, w, h, h / 2); g.fill();
      g.fillStyle = color; k.rr(x + 2, y + 2, Math.max(0, (w - 4) * clamp(frac, 0, 1)), h - 4, (h - 4) / 2); g.fill();
      if (label) k.text(label, x + w / 2, y + h / 2, { size: h * .62 });
    },
    // backdrop: a ship room painting or one of the theme gradients
    backdrop(name) {
      const src = api.roomImg(name);
      if (src) {
        const img = image(src);
        if (img.complete && img.width) { const s = Math.max(W / img.width, H / img.height); g.drawImage(img, (W - img.width * s) / 2, (H - img.height * s) / 2, img.width * s, img.height * s); return; }
      }
      const themes = {
        ballroom: ['#f6d98a', '#4a2c17'], town: ['#9fc6e0', '#c9a97a'], jungle: ['#5f9b62', '#1c3a22'], sea: ['#3fa2a8', '#0a2a3c'],
        night: ['#0d1730', '#26365c'], rival: ['#e7a7b8', '#5b3a2a'], chapel: ['#fff3dc', '#7a4a33'], eastern: ['#f0b46a', '#12283c'], temple: ['#d9e3d0', '#463a2b'],
      };
      const [a, b] = themes[name] || ['#7fb3d9', '#2c3e4a'];
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    },
    image,
    // a room's painting once it has loaded (null until then, or if the room has none)
    roomImage(name) { const src = api.roomImg(name), img = src && image(src); return img && img.complete && img.width ? img : null; },
    shake: 0,
    end(result) { cleanup(); done(result); },
  };
  function cleanup() {
    removeEventListener('keydown', onDown, true); removeEventListener('keyup', onUp, true);
    canvas.removeEventListener('pointermove', pMove); canvas.removeEventListener('pointerdown', pDown); removeEventListener('pointerup', pUp);
    pad.hidden = true;
  }
  k.endFrame = () => { pressed = new Set(); pointer.clicked = false; };
  k.cleanup = cleanup;
  return k;
}

// Runs a game in the canvas. Returns a stop() function. onEnd({ won, score, text }).
window.runSoulmatesGame = (name, canvas, api, onEnd) => {
  const make = GAMES[name];
  let finished = false, raf = 0, last = performance.now();
  const k = makeKit(canvas, api, result => { finished = true; cancelAnimationFrame(raf); setTimeout(() => onEnd(result), 700); });
  const out = canvas.getContext('2d');
  const resize = () => {
    const r = canvas.getBoundingClientRect(); const K = Math.min(2.5, (r.width / W) * (devicePixelRatio || 1)) || 1;
    canvas.width = Math.round(W * K); canvas.height = Math.round(FRAME_H * K); k.field.width = Math.round(W * K); k.field.height = Math.round(H * K); k.scale = K;
  };
  resize();
  const game = make(k);
  const frame = now => {
    const dt = Math.min(.05, (now - last) / 1000); last = now; k.t += dt;
    if (canvas.width !== Math.round(W * k.scale)) resize();
    game.update(dt);
    if (finished) { draw(); return; }
    draw(); k.endFrame();
    raf = requestAnimationFrame(frame);
  };
  const draw = () => {
    const g = k.g; g.setTransform(k.scale, 0, 0, k.scale, 0, 0);
    if (k.shake > 0 && !reduceMotion) { g.translate(rand(-1, 1) * k.shake * 8, rand(-1, 1) * k.shake * 6); k.shake = Math.max(0, k.shake - .05); }
    game.draw();
        const cw = canvas.width, ch = canvas.height;
    out.setTransform(1, 0, 0, 1, 0, 0);
    // the bands above and below continue the field's top and bottom edges (one pixel row stretched), slightly dimmed
    const fh = k.field.height, band = OFF * k.scale;
    out.drawImage(k.field, 0, 0, cw, 2, 0, 0, cw, band);
    out.drawImage(k.field, 0, fh - 2, cw, 2, 0, ch - band, cw, band);
    out.fillStyle = 'rgba(8,10,14,.25)'; out.fillRect(0, 0, cw, band); out.fillRect(0, ch - band, cw, band);
    out.drawImage(k.field, 0, band, cw, H * k.scale);
  };
  raf = requestAnimationFrame(frame);
  return () => { cancelAnimationFrame(raf); k.cleanup(); };
};

// little floating messages ("+1", "SPLAT!") many games use
function popups(k) {
  const list = [];
  return {
    add(text, x, y, color = '#fff8ea', size = 24) { list.push({ text, x, y, color, size, t: 0 }); },
    update(dt) { list.forEach(p => { p.t += dt; p.y -= 40 * dt; }); for (let i = list.length - 1; i >= 0; i--) if (list[i].t > 1.1) list.splice(i, 1); },
    draw() { list.forEach(p => { k.g.globalAlpha = clamp(1.4 - p.t * 1.3, 0, 1); k.text(p.text, p.x, p.y, { size: p.size, color: p.color }); k.g.globalAlpha = 1; }); },
  };
}
function timerText(k, secs, x = W - 20, y = 26) { k.text(`${Math.max(0, Math.ceil(secs))}s`, x, y, { size: 24, align: 'right' }); }

const GAMES = {};

// ===================== THE ISLAND: catch supper, then the stars =====================
GAMES.island = k => {
  k.setControls(['left', 'right', 'act'], 'Star');
  const pop = popups(k);
  let phase = 'fish', time = 25, x = W / 2, caught = 0, stun = 0, items = [], spawn = 0, flip = false;
  // a heart of stars, joined in order
  const STARS = [[480, 330], [400, 260], [360, 180], [400, 120], [460, 140], [480, 180], [500, 140], [560, 120], [600, 180], [560, 260]];
  let next = 0, starTime = 22, lines = [];
  return {
    update(dt) {
      pop.update(dt);
      if (phase === 'fish') {
        time -= dt;
        if (stun > 0) stun -= dt;
        else { const dx = (k.keys.right ? 1 : 0) - (k.keys.left ? 1 : 0); x = clamp(x + dx * 420 * dt, 60, W - 60); if (dx) flip = dx < 0; }
        if (k.pointer.down) { const d = k.pointer.x - x; if (stun <= 0) x = clamp(x + Math.sign(d) * Math.min(Math.abs(d), 420 * dt), 60, W - 60); }
        spawn -= dt;
        if (spawn <= 0) { spawn = rand(.45, .8); const r = Math.random(); items.push({ x: rand(60, W - 60), y: -20, vy: rand(150, 230), kind: r < .55 ? 'fish' : r < .78 ? 'coconut' : 'crab', spin: rand(-3, 3) }); }
        items.forEach(it => { it.y += it.vy * dt; it.r = (it.r || 0) + it.spin * dt;
          if (!it.gone && it.y > 300 && it.y < 350 && Math.abs(it.x - x) < 60) {
            it.gone = true;
            if (it.kind === 'crab') { stun = .9; caught = Math.max(0, caught - 1); pop.add('Pinched! −1', x, 230, '#ff9c8a'); }
            else { caught++; pop.add(it.kind === 'fish' ? '+1 fish' : '+1 coconut', x, 230, '#fff2a8'); }
          } });
        items = items.filter(it => !it.gone && it.y < H + 30);
        if (time <= 0) { phase = 'stars'; items = []; }
      } else {
        starTime -= dt;
        let chosen = -1;
        if (k.clicked()) STARS.forEach(([sx, sy], i) => { if (Math.hypot(k.pointer.x - sx, k.pointer.y - sy) < 34) chosen = i; });
        if (k.hit('act')) chosen = next;
        if (chosen === next) { if (next > 0) lines.push([STARS[next - 1], STARS[next]]); next++; pop.add('✦', STARS[chosen][0], STARS[chosen][1] - 20, '#fff2a8'); }
        else if (chosen >= 0) pop.add('Not that one', STARS[chosen][0], STARS[chosen][1] - 20, '#bcd');
        if (next === STARS.length) { lines.push([STARS[STARS.length - 1], STARS[0]]); next++; }
        if (next > STARS.length || starTime <= 0) {
          const stars = next > STARS.length;
          const score = Math.min(3, Math.floor(caught / 5)) + (stars ? 3 : 0);
          k.end({ won: true, score, text: `${caught} things caught for supper${stars ? ', and a whole heart of stars drawn across the sky.' : '. The stars can wait for another night.'}` });
        }
      }
    },
    draw() {
      const g = k.g;
      if (phase === 'fish') {
        k.backdrop('island');
        g.fillStyle = 'rgba(255,240,210,.15)'; g.fillRect(0, 0, W, H);
        items.forEach(it => {
          g.save(); g.translate(it.x, it.y); g.rotate(it.r);
          if (it.kind === 'fish') { g.fillStyle = '#7fc2d6'; g.beginPath(); g.ellipse(0, 0, 22, 11, 0, 0, 7); g.fill(); g.beginPath(); g.moveTo(-18, 0); g.lineTo(-32, -11); g.lineTo(-32, 11); g.fill(); g.fillStyle = '#123'; g.beginPath(); g.arc(11, -3, 2.5, 0, 7); g.fill(); }
          else if (it.kind === 'coconut') { g.fillStyle = '#6b4423'; g.beginPath(); g.arc(0, 0, 16, 0, 7); g.fill(); g.fillStyle = '#3a2412'; [[-5, -4], [4, -5], [0, 3]].forEach(([a, b]) => { g.beginPath(); g.arc(a, b, 2.5, 0, 7); g.fill(); }); }
          else { g.fillStyle = '#d9533b'; g.beginPath(); g.ellipse(0, 0, 18, 12, 0, 0, 7); g.fill(); g.strokeStyle = '#d9533b'; g.lineWidth = 4; g.beginPath(); g.moveTo(-14, -6); g.lineTo(-26, -16); g.moveTo(14, -6); g.lineTo(26, -16); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(-5, -10, 3, 0, 7); g.arc(5, -10, 3, 0, 7); g.fill(); }
          g.restore();
        });
        k.sprite('ruby', 110, 395, 175, false, .95);
        k.sprite('cutlass', x, 400, 190, flip, 1, stun > 0 ? Math.sin(k.t * 30) * .06 : 0);
        g.fillStyle = '#a7764a'; k.rr(x - 44, 300, 88, 26, 8); g.fill(); g.fillStyle = '#7a5230'; g.fillRect(x - 40, 304, 80, 4);
        k.text('Romantic game: catch supper', 20, 26, { align: 'left', size: 22, font: 'display' });
        k.text(`Caught: ${caught}`, 20, 54, { align: 'left', size: 18 });
        k.text('Catch fish and coconuts. Dodge the crabs!', W / 2, H - 16, { size: 16 });
        timerText(k, time);
      } else {
        k.backdrop('night');
        for (let i = 0; i < 70; i++) { const sx = (i * 137) % W, sy = (i * 71) % 260; g.fillStyle = `rgba(255,255,255,${.25 + .25 * Math.sin(k.t * 2 + i)})`; g.fillRect(sx, sy, 2, 2); }
        g.strokeStyle = 'rgba(255,240,180,.85)'; g.lineWidth = 3; lines.forEach(([a, b]) => { g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); });
        STARS.forEach(([sx, sy], i) => {
          const lit = i < next, isNext = i === next, r = isNext ? 9 + Math.sin(k.t * 6) * 3 : lit ? 8 : 5;
          g.fillStyle = lit ? '#fff2a8' : isNext ? '#ffffff' : 'rgba(255,255,255,.6)'; g.beginPath(); g.arc(sx, sy, r, 0, 7); g.fill();
          if (isNext) { g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 2; g.beginPath(); g.arc(sx, sy, 20, 0, 7); g.stroke(); }
        });
        g.fillStyle = '#1b1410'; g.fillRect(0, 372, W, 48);
        k.sprite('ruby', 760, 410, 150, true, .9); k.sprite('cutlass', 820, 410, 160, true, .9);
        k.text('Romantic game: name the stars together', 20, 26, { align: 'left', size: 22, font: 'display' });
        k.text('Tap the glowing star (or press Space) to join them up', W / 2, H - 20, { size: 16 });
        timerText(k, starTime);
      }
      pop.draw();
    },
  };
};

// ===================== ODESSA'S COOKING SHOW =====================
GAMES.cooking = k => {
  k.setControls(['act', 'down'], 'Into the pot');
  const pop = popups(k);
  const GOOD = [['fish', '🐟'], ['onion', '🧅'], ['carrot', '🥕'], ['potato', '🥔'], ['pepper', '🌶️'], ['bread', '🥖']];
  const BAD = [['boot', '🥾'], ['sock', '🧦'], ['rum', '🍾']];
  const recipes = [['fish', 'onion', 'carrot', 'potato'], ['pepper', 'bread', 'fish', 'onion']];
  let rIdx = 0, need = [...recipes[0]], crowd = .6, items = [], spawn = 0, time = 50, boil = 0, boilWarn = 0, nextBoil = rand(6, 10), made = 0, fixes = 0;
  const POT = 480;
  return {
    update(dt) {
      pop.update(dt); time -= dt;
      spawn -= dt;
      if (spawn <= 0) {
        spawn = rand(.7, 1.1);
        const wantNeeded = Math.random() < .55 && need.length;
        const want = pick(need), [name, icon] = wantNeeded ? GOOD.find(gd => gd[0] === want) : Math.random() < .5 ? pick(GOOD) : pick(BAD);
        items.push({ name, icon, x: -30, y: 200, vx: rand(170, 230), ph: rand(0, 6) });
      }
      items.forEach(it => { it.x += it.vx * dt; it.y = 205 + Math.sin(k.t * 4 + it.ph) * 14; });
      const throwIt = it => {
        it.gone = true;
        const good = GOOD.some(gd => gd[0] === it.name);
        if (good && need.includes(it.name)) { need.splice(need.indexOf(it.name), 1); crowd += .07; pop.add('Delicious! +', POT, 230, '#c8f5a0'); }
        else if (good) { crowd -= .03; pop.add('Not in this recipe', POT, 230, '#ffd9a8'); }
        else { crowd -= it.name === 'rum' ? .2 : .12; pop.add(it.name === 'rum' ? 'NO RUM ON THIS SHIP!' : `A ${it.name}?!`, POT, 230, '#ff9c8a'); k.shake = .5; }
        if (!need.length) { made++; pop.add('Dish served!', POT, 160, '#fff2a8', 32); crowd += .1; rIdx++; need = [...(recipes[rIdx] || pick(recipes))]; }
      };
      if (k.clicked()) { const it = items.find(it => !it.gone && Math.hypot(k.pointer.x - it.x, k.pointer.y - it.y) < 40); if (it) throwIt(it); else if (Math.abs(k.pointer.x - POT) < 90 && k.pointer.y > 260 && boil > 0) { boil = 0; fixes++; crowd += .06; pop.add('Stirred!', POT, 280, '#c8f5a0'); } }
      if (k.hit('act')) { const it = items.filter(it => !it.gone && Math.abs(it.x - POT) < 70)[0]; if (it) throwIt(it); else pop.add('Wait till it’s over the pot', POT, 150, '#ffd9a8', 18); }
      items = items.filter(it => !it.gone && it.x < W + 40);
      // the stew boils over now and then
      nextBoil -= dt;
      if (nextBoil <= 0 && boil <= 0) { boil = 2.2; nextBoil = rand(7, 11); }
      if (boil > 0) {
        if (k.hit('down')) { boil = 0; fixes++; crowd += .06; pop.add('Stirred!', POT, 280, '#c8f5a0'); }
        else { boil -= dt; if (boil <= 0) { crowd -= .15; pop.add('It boiled over!', POT, 280, '#ff9c8a'); k.shake = .6; } }
      }
      crowd = clamp(crowd - .006 * dt, 0, 1);
      if (time <= 0 || crowd <= 0) {
        const won = crowd > .35;
        k.end({ won, score: Math.round(crowd * 5), text: won ? `${made} dish${made === 1 ? '' : 'es'} served and the audience is ${crowd > .7 ? 'on its feet' : 'happy'}.` : 'The audience wandered off to find Odessa’s secret snack stash.' });
      }
    },
    draw() {
      const g = k.g; k.backdrop('galley'); g.fillStyle = 'rgba(30,18,8,.35)'; g.fillRect(0, 0, W, H);
      k.sprite('odessa', 150, 400, 230);
      k.sprite('ruby', 820, 400, 225, true);
      // counter and pot
      g.fillStyle = '#6b4a2b'; g.fillRect(0, 330, W, 90); g.fillStyle = '#87613b'; g.fillRect(0, 322, W, 12);
      g.fillStyle = '#2b2b30'; k.rr(POT - 70, 260, 140, 80, 18); g.fill(); g.fillStyle = '#c9783b'; g.beginPath(); g.ellipse(POT, 266, 66, 14, 0, 0, 7); g.fill();
      if (boil > 0) { for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(255,230,190,.8)'; g.beginPath(); g.arc(POT - 50 + i * 20, 258 - Math.abs(Math.sin(k.t * 9 + i)) * 26, 8, 0, 7); g.fill(); } k.text('STIR! (↓ or tap the pot)', POT, 240, { size: 22, color: '#ffd27a' }); }
      g.strokeStyle = 'rgba(255,255,255,.18)'; g.setLineDash([6, 6]); g.strokeRect(POT - 70, 150, 140, 105); g.setLineDash([]);
      g.font = '40px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      items.forEach(it => g.fillText(it.icon, it.x, it.y));
      // recipe card
      g.fillStyle = 'rgba(243,230,204,.95)'; k.rr(16, 14, 250, 92, 8); g.fill();
      k.text('Recipe: still needed', 30, 32, { align: 'left', size: 15, color: '#3a2816', stroke: null });
      g.font = '30px serif'; g.textAlign = 'left'; need.forEach((n, i) => g.fillText(GOOD.find(gd => gd[0] === n)[1], 30 + i * 52, 72));
      k.bar(W - 300, 18, 220, 22, crowd, crowd > .5 ? '#7fc97f' : crowd > .3 ? '#e6c25a' : '#e0705a', 'Audience');
      timerText(k, time);
      k.text('Tap an ingredient, or press Space when it’s over the pot', W / 2, H - 16, { size: 16 });
      pop.draw();
    },
  };
};

// ===================== THE WET DOG CHASE =====================
GAMES.wagon = k => {
  k.setControls(['up', 'down'], '');
  const pop = popups(k);
  const LANES = [250, 318, 386];
  let lane = 1, ly = LANES[1], gap = 1, time = 55, obs = [], spawn = 1, speed = 380, slow = 0, oranges = 0, hits = 0, scroll = 0;
  return {
    update(dt) {
      pop.update(dt); time -= dt;
      if (k.hit('up')) lane = Math.max(0, lane - 1);
      if (k.hit('down')) lane = Math.min(2, lane + 1);
      if (k.clicked()) lane = k.pointer.y < ly - 20 ? Math.max(0, lane - 1) : k.pointer.y > ly + 20 ? Math.min(2, lane + 1) : lane;
      ly += (LANES[lane] - ly) * Math.min(1, dt * 12);
      const v = slow > 0 ? speed * .45 : speed;
      slow = Math.max(0, slow - dt); scroll += v * dt;
      gap = clamp(gap - (slow > 0 ? -0.02 : 0.026) * dt, 0, 1);
      spawn -= dt;
      if (spawn <= 0) {
        spawn = rand(.55, .95);
        const free = rand(0, 3) | 0;
        [0, 1, 2].filter(l => l !== free && Math.random() < .45).forEach(l => obs.push({ lane: l, x: W + 60, kind: pick(['fruit', 'laundry', 'barrel', 'chickens']) }));
        if (Math.random() < .5) obs.push({ lane: free, x: W + 60, kind: 'orange' });
      }
      obs.forEach(o => { o.x -= v * dt;
        if (!o.done && Math.abs(o.x - 200) < 60 && o.lane === lane) {
          o.done = true;
          if (o.kind === 'orange') { oranges++; gap = Math.max(0, gap - .03); pop.add('Free orange!', 200, ly - 90, '#ffc25a'); }
          else { hits++; slow = 1; k.shake = .6; pop.add({ fruit: 'Fruit everywhere!', laundry: 'Bloomers on Hazel’s head!', barrel: 'BONK!', chickens: 'Chickens!' }[o.kind], 200, ly - 90, '#ff9c8a'); }
        } });
      obs = obs.filter(o => o.x > -80 && !(o.done && o.kind === 'orange'));
      if (gap <= 0) k.end({ won: true, score: clamp(5 - hits, 2, 5), text: `Caught them! ${hits ? `Only ${hits} crash${hits === 1 ? '' : 'es'}` : 'Not a single crash'} and ${oranges} oranges for the road.` });
      else if (time <= 0) k.end({ won: false, score: 1, text: 'Goldtooth’s men got away down the hill. The dog is very disappointed.' });
    },
    draw() {
      const g = k.g, street = k.roomImage('town');
      // the town scrolling behind: the painted street (every other copy mirrored, so the joins match), or simple houses
      if (street) {   // a plain strip of sky on top, so the bands above the field don't smear the rooftops
        g.fillStyle = '#a9cfe6'; g.fillRect(0, 0, W, 12);
        const h = 206, w = street.width * h / street.height, off = (scroll * .3) % (w * 2);
        for (let i = 0, x = -off; x < W; i++, x += w) { g.save(); if (i % 2) { g.translate(x + w, 0); g.scale(-1, 1); g.drawImage(street, 0, 10, w, h); } else g.drawImage(street, x, 10, w, h); g.restore(); }
      } else k.backdrop('town');
      if (!street) for (let i = -1; i < 7; i++) { const x = ((i * 170 - scroll * .3) % (170 * 7) + 170 * 7) % (170 * 7) - 170; g.fillStyle = ['#d8b48a', '#c99f7a', '#e3caa0'][(i + 7) % 3]; g.fillRect(x, 70, 150, 150); g.fillStyle = '#8a4b3a'; g.beginPath(); g.moveTo(x - 10, 70); g.lineTo(x + 75, 20); g.lineTo(x + 160, 70); g.fill(); g.fillStyle = '#5d7d9a'; g.fillRect(x + 25, 110, 30, 34); g.fillRect(x + 95, 110, 30, 34); }
      g.fillStyle = '#b89b72'; g.fillRect(0, 214, W, H); g.fillStyle = 'rgba(0,0,0,.08)'; LANES.forEach(y => g.fillRect(0, y + 28, W, 3));
      for (let i = 0; i < 20; i++) { g.fillStyle = 'rgba(90,70,40,.25)'; g.fillRect(((i * 97 - scroll) % W + W) % W, 240 + (i * 53) % 170, 18, 6); }
      // the getaway cart, ahead
      const ex = 300 + gap * 560;
      k.figure(ex + 30, LANES[1] + 26, 80, { coat: '#3b3b4f', flip: false, sash: '#b88a2a' });
      g.fillStyle = '#5b3d22'; g.fillRect(ex - 60, LANES[1] - 20, 70, 40); g.fillStyle = '#8a6a3a'; g.fillRect(ex - 56, LANES[1] - 34, 28, 16); g.fillRect(ex - 26, LANES[1] - 34, 28, 16);
      obs.slice().sort((a, b) => a.lane - b.lane).forEach(o => {
        const y = LANES[o.lane]; g.save(); g.translate(o.x, y);
        if (o.kind === 'fruit') { g.fillStyle = '#7a5230'; g.fillRect(-40, -10, 80, 30); g.fillStyle = '#d94f3b'; g.fillRect(-46, -40, 92, 12); g.fillStyle = '#f0f0f0'; g.fillRect(-46, -40, 15, 12); g.fillRect(-16, -40, 15, 12); g.fillRect(14, -40, 15, 12); ['#e65', '#fa3', '#9c4'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(-24 + i * 24, -16, 9, 0, 7); g.fill(); }); }
        else if (o.kind === 'laundry') { g.strokeStyle = '#6b4a2b'; g.lineWidth = 4; g.beginPath(); g.moveTo(-40, 20); g.lineTo(-40, -60); g.moveTo(40, 20); g.lineTo(40, -60); g.stroke(); g.lineWidth = 2; g.beginPath(); g.moveTo(-40, -56); g.lineTo(40, -56); g.stroke(); ['#f4f4f4', '#ffb6c8', '#a8d4ff'].forEach((c, i) => { g.fillStyle = c; g.fillRect(-34 + i * 24, -56, 20, 30); }); }
        else if (o.kind === 'barrel') { g.fillStyle = '#7a5230'; k.rr(-24, -34, 48, 56, 10); g.fill(); g.fillStyle = '#4a3020'; g.fillRect(-24, -22, 48, 5); g.fillRect(-24, 6, 48, 5); }
        else if (o.kind === 'chickens') { for (let i = 0; i < 3; i++) { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(-24 + i * 24, -6 - Math.abs(Math.sin(k.t * 10 + i)) * 8, 11, 9, 0, 0, 7); g.fill(); g.fillStyle = '#e33'; g.fillRect(-22 + i * 24, -18 - Math.abs(Math.sin(k.t * 10 + i)) * 8, 5, 5); } }
        else { g.fillStyle = '#ff9a2a'; g.beginPath(); g.arc(0, -6, 12, 0, 7); g.fill(); g.fillStyle = '#3a7a2a'; g.fillRect(-2, -20, 4, 6); }
        g.restore();
      });
      // our wagon: horse, Absalom driving, friends and a wet dog in the back
      const bob = Math.abs(Math.sin(k.t * 12)) * 3, x = 200, y = ly, cart = k.image('wagon.png');
      if (cart.complete && cart.width) { const h = 116, w = cart.width * h / cart.height; g.drawImage(cart, x - 100, y + 28 - h - bob, w, h); }
      else {
      g.fillStyle = '#8a5a34'; g.beginPath(); g.ellipse(x + 120, y - 18 - bob, 40, 20, 0, 0, 7); g.fill(); g.fillRect(x + 145, y - 60 - bob, 16, 44); g.beginPath(); g.ellipse(x + 162, y - 62 - bob, 18, 10, .3, 0, 7); g.fill();
      g.fillStyle = '#5a3a24'; [x + 95, x + 140].forEach((lx, i) => g.fillRect(lx, y - 2, 8, 26 - (i ? bob : -bob)));
      g.fillStyle = '#7a5230'; g.fillRect(x - 80, y - 30, 160, 34); g.fillStyle = '#5b3d22'; g.fillRect(x - 84, y - 34, 168, 8);
      ['arabella', 'hazel', 'monsoon', 'jade', 'bones'].forEach((key, i) => k.face(key, x - 64 + i * 28, y - 48 - bob - (i % 2) * 6, 15));
      k.face('absalom', x + 70, y - 58 - bob, 18, '#ffd27a');
      g.fillStyle = '#9a8a72'; g.beginPath(); g.ellipse(x - 62, y - 40 - bob, 14, 10, 0, 0, 7); g.fill(); g.beginPath(); g.arc(x - 76, y - 48 - bob, 8, 0, 7); g.fill();
      g.fillStyle = 'rgba(160,210,255,.8)'; for (let i = 0; i < 3; i++) g.fillRect(x - 70 + i * 6, y - 30 - ((k.t * 60 + i * 9) % 20), 2, 4);
      g.fillStyle = '#2b1a10'; [x - 50, x + 50].forEach(wx => { g.beginPath(); g.arc(wx, y + 8, 18, 0, 7); g.fill(); });
      }
      k.text('Catch Goldtooth’s men!', 20, 26, { align: 'left', size: 24, font: 'display' });
      k.bar(250, 14, 300, 22, 1 - gap, '#ffc25a', 'Closing in');
      timerText(k, time);
      k.text('↑ ↓ to change lanes (or tap above / below the wagon)', W / 2, H - 14, { size: 15 });
      pop.draw();
    },
  };
};

// ===================== WRECK A WEDDING =====================
GAMES.wedding = k => {
  k.setControls(['left', 'right', 'act'], 'Set up gag');
  const pop = popups(k);
  const GAGS = [{ x: 140, name: 'Let the wet dog loose', done: 0 }, { x: 330, name: 'Swap the cake for a fish', done: 0 }, { x: 560, name: 'Soap the wedding carpet', done: 0 }, { x: 740, name: 'Swap the bell for a frying pan', done: 0 }];
  let x = 60, flip = false, patience = 1, state = 'away', stateT = rand(2.5, 4), caughtT = 0, tomatoes = [], walkPh = 0;
  return {
    update(dt) {
      pop.update(dt);
      stateT -= dt;
      if (stateT <= 0) {
        if (state === 'away') { state = 'turning'; stateT = .8; }
        else if (state === 'turning') { state = 'watching'; stateT = rand(1.4, 2.4); }
        else { state = 'away'; stateT = rand(2.2, 4); }
      }
      if (caughtT > 0) caughtT -= dt;
      const dx = (k.keys.right ? 1 : 0) - (k.keys.left ? 1 : 0) || (k.pointer.down && !near() ? Math.sign(k.pointer.x - x) * (Math.abs(k.pointer.x - x) > 10) : 0);
      if (caughtT <= 0) { x = clamp(x + dx * 230 * dt, 40, 820); if (dx) { flip = dx < 0; walkPh += dt; } }
      const gag = near();
      const working = caughtT <= 0 && gag && !gag.finished && (k.keys.act || (k.pointer.down && Math.abs(k.pointer.x - gag.x) < 70));
      if (working) gag.done = Math.min(1, gag.done + dt / 1.4);
      if (gag && gag.done >= 1 && !gag.finished) { gag.finished = true; patience = Math.min(1, patience + .25); pop.add('The crew giggles!', gag.x, 150, '#c8f5a0'); }
      if (state === 'watching' && caughtT <= 0 && (working || dx)) {
        caughtT = 1.2; patience -= .22; k.shake = .5;
        if (gag && !gag.finished) gag.done = Math.max(0, gag.done - .5);
        pop.add('Goldtooth sees you! “Boring!”', x, 120, '#ff9c8a');
        for (let i = 0; i < 4; i++) tomatoes.push({ x: rand(0, W), y: -20, tx: x + rand(-20, 20), ty: 250 + rand(-20, 20), t: 0, d: rand(.5, .8), fish: Math.random() < .4 });
      }
      patience -= .035 * dt;
      tomatoes.forEach(t => t.t += dt); tomatoes = tomatoes.filter(t => t.t < t.d + .6);
      const all = GAGS.every(g => g.finished);
      if (all) k.end({ won: true, score: Math.round(patience * 5) + 3, text: 'Every gag is set. The wedding is about to fall apart in the funniest way possible.' });
      else if (patience <= 0) k.end({ won: false, score: 0, text: 'Not funny enough! Tomatoes and fish rain down from the rigging.' });
      function near() { return GAGS.find(g => Math.abs(g.x - x) < 55); }
    },
    draw() {
      const g = k.g; k.backdrop('goldtooth');
      g.fillStyle = '#b8323a'; g.fillRect(200, 300, 620, 30); // carpet
      g.fillStyle = 'rgba(80,50,30,.25)'; for (let i = 0; i < 6; i++) { k.rr(60 + i * 140, 250, 100, 40, 10); g.fill(); }
      // rigging with the crew peeking down
      g.strokeStyle = 'rgba(90,60,30,.6)'; g.lineWidth = 3; for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(i * 120, 0); g.lineTo(i * 120 + 60, 70); g.stroke(); }
      ['bones', 'hazel', 'odessa', 'tempest', 'crispin', 'jade'].forEach((key, i) => k.face(key, 90 + i * 150, 46 + Math.sin(k.t * 2 + i) * 3, 20));
      GAGS.forEach(gg => {
        g.fillStyle = gg.finished ? 'rgba(140,220,120,.9)' : 'rgba(255,240,200,.85)'; k.rr(gg.x - 58, 336, 116, 40, 8); g.fill();
        k.text(gg.finished ? '✓ done' : gg.name, gg.x, 356, { size: 12, color: '#3a2816', stroke: null });
        if (!gg.finished && gg.done > 0) k.bar(gg.x - 50, 316, 100, 14, gg.done, '#ffd27a');
        g.font = '34px serif'; g.textAlign = 'center'; g.fillText(['🐕', '🎂', '🧼', '🔔'][GAGS.indexOf(gg)], gg.x, 290);
      });
      k.sprite('ruby', 880, 330, 190, true);
      const facing = state === 'watching';
      k.sprite('clement', 920, 335, 205, facing, 1, state === 'turning' ? Math.sin(k.t * 20) * .03 : 0);
      if (state === 'turning') k.text('!', 900, 110, { size: 48, color: '#ffd27a' });
      if (facing) { g.fillStyle = 'rgba(255,80,60,.12)'; g.beginPath(); g.moveTo(900, 180); g.lineTo(0, 120); g.lineTo(0, 380); g.closePath(); g.fill(); k.text('👁', 900, 105, { size: 36, stroke: null }); }
      k.sprite('cutlass', x, 330, 170, flip, 1, caughtT > 0 ? Math.sin(k.t * 25) * .05 : Math.sin(walkPh * 12) * .02);
      tomatoes.forEach(t => { const p = Math.min(1, t.t / t.d), tx = t.x + (t.tx - t.x) * p, ty = t.y + (t.ty - t.y) * p - Math.sin(p * Math.PI) * 120;
        if (p < 1) { g.font = '26px serif'; g.fillText(t.fish ? '🐟' : '🍅', tx, ty); } else k.text('SPLAT', t.tx, t.ty, { size: 18, color: '#ff6a5a' }); });
      k.bar(20, 90, 220, 22, patience, patience > .4 ? '#7fc97f' : '#e0705a', 'Crew’s patience');
      k.text('Set up the gags while Goldtooth isn’t looking', 20, 26, { align: 'left', size: 22, font: 'display' });
      k.text('Hold Space at a gag. Freeze when he turns around!', W / 2, H - 14, { size: 15 });
      pop.draw();
    },
  };
};

// ===================== CRISPINLOCK HOLMES: search the study =====================
GAMES.mystery = k => {
  k.setControls(['left', 'right', 'up', 'down', 'act'], 'Inspect');
  const pop = popups(k);
  const CLUES = [
    { x: 760, y: 120, name: 'The window latch', note: 'Opened from the inside. The thief was already aboard.' },
    { x: 470, y: 250, name: 'The desk', note: 'It smells of rosewater. Expensive perfume.' },
    { x: 230, y: 370, name: 'The floor', note: 'Small, wet, bare footprints, heading for the rail.' },
    { x: 880, y: 350, name: 'Under the chair', note: 'A pearl hairpin, with a mermaid carved on it.' },
  ];
  let mx = W / 2, my = H / 2, found = [], showNote = null, noteT = 0, done = 0, usePointer = false;
  return {
    update(dt) {
      pop.update(dt);
      const dx = (k.keys.right ? 1 : 0) - (k.keys.left ? 1 : 0), dy = (k.keys.down ? 1 : 0) - (k.keys.up ? 1 : 0);
      if (dx || dy) { usePointer = false; mx = clamp(mx + dx * 330 * dt, 20, W - 20); my = clamp(my + dy * 330 * dt, 20, H - 20); }
      if (k.pointer.moved && !(dx || dy)) { usePointer = true; }
      if (usePointer) { mx = k.pointer.x; my = k.pointer.y; }
      if (noteT > 0) noteT -= dt;
      if (k.hit('act') || k.clicked()) {
        const c = CLUES.find(c => !found.includes(c) && Math.hypot(c.x - mx, c.y - my) < 55);
        if (c) { found.push(c); showNote = c; noteT = 3.2; pop.add('Clue found!', c.x, c.y - 40, '#fff2a8'); }
        else pop.add(pick(['Nothing here.', 'Just dust.', 'Jade, stop sniffing that.', 'Hmm. No.']), mx, my - 40, '#dde', 18);
      }
      if (found.length === CLUES.length) { done += dt; if (done > 1.6) k.end({ won: true, score: 0, text: 'Four clues: a latch opened from inside, rosewater on the desk, small wet bare footprints, and a mermaid hairpin.' }); }
    },
    draw() {
      const g = k.g; k.backdrop('study'); g.fillStyle = 'rgba(10,8,6,.45)'; g.fillRect(0, 0, W, H);
      // the magnifying glass shows the room brighter
      g.save(); g.beginPath(); g.arc(mx, my, 70, 0, 7); g.clip(); k.backdrop('study');
      CLUES.forEach(c => { const d = Math.hypot(c.x - mx, c.y - my); if (!found.includes(c) && d < 110) { g.fillStyle = `rgba(255,240,170,${.8 - d / 140})`; g.beginPath(); g.arc(c.x, c.y, 6 + Math.sin(k.t * 8) * 2, 0, 7); g.fill(); } });
      g.restore();
      g.strokeStyle = '#d2a24c'; g.lineWidth = 8; g.beginPath(); g.arc(mx, my, 70, 0, 7); g.stroke();
      g.strokeStyle = '#6b4a2b'; g.lineWidth = 14; g.beginPath(); g.moveTo(mx + 50, my + 50); g.lineTo(mx + 95, my + 95); g.stroke();
      found.forEach(c => { g.fillStyle = '#7fc97f'; g.beginPath(); g.arc(c.x, c.y, 8, 0, 7); g.fill(); });
      k.sprite('crispin', 70, 420, 200, false, .95); k.sprite('monsoon', 160, 420, 185, false, .9); k.sprite('jade', 870, 420, 185, true, .9);
      g.fillStyle = 'rgba(243,230,204,.95)'; k.rr(W - 250, 12, 236, 30 + found.length * 18, 8); g.fill();
      k.text(`Notebook: ${found.length} / ${CLUES.length} clues`, W - 236, 28, { align: 'left', size: 15, color: '#3a2816', stroke: null });
      found.forEach((c, i) => k.text('• ' + c.name, W - 236, 48 + i * 18, { align: 'left', size: 14, color: '#3a2816', stroke: null, weight: 500 }));
      if (showNote && noteT > 0) { g.fillStyle = 'rgba(255,248,234,.96)'; k.rr(W / 2 - 300, H - 90, 600, 60, 10); g.fill(); k.text(`${showNote.name}: ${showNote.note}`, W / 2, H - 60, { size: 17, color: '#3a2816', stroke: null, font: 'story' }); }
      else k.text('Move the magnifying glass and inspect anything that glints', W / 2, H - 16, { size: 15 });
      pop.draw();
    },
  };
};

// ===================== CHARM AN ENEMY, CAUSE HAVOC (two parts) =====================
GAMES.charm = k => {
  k.setControls([], '');
  const pop = popups(k);
  const COLORS = ['#b04459', '#5a3b8e', '#2f6d7a', '#a8662f', '#3f7a3a'];
  const girls = COLORS.map((c, i) => ({ x: 130 + i * 175, interest: rand(.6, .9), coat: c, hair: ['#2a1a10', '#8a4a20', '#e0c070', '#1a1a1a', '#b05030'][i], want: pick(['💐', '🎵', '⚔️']), t: rand(2, 5) }));
  let time = 28, suspicion = 0, sel = 0, charms = 0;
  return {
    update(dt) {
      pop.update(dt); time -= dt;
      for (let i = 1; i <= 5; i++) if (k.hit('n' + i)) charm(girls[i - 1]);
      if (k.clicked()) { const gl = girls.find(gl => Math.abs(gl.x - k.pointer.x) < 70); if (gl) charm(gl); }
      girls.forEach(gl => {
        gl.interest -= (.09 + (28 - time) * .004) * dt;
        gl.t -= dt; if (gl.t <= 0) { gl.want = pick(['💐', '🎵', '⚔️']); gl.t = rand(3, 5); }
        if (gl.interest <= 0) { gl.interest = .5; suspicion++; pop.add('“Wait… what are they up to?”', gl.x, 120, '#ff9c8a', 18); k.shake = .4; }
      });
      if (time <= 0 || suspicion >= 4) k.end({ won: suspicion < 4, score: clamp(3 - suspicion, 0, 3), text: suspicion < 4 ? `Evangeline’s girls are having the time of their lives. Nobody is watching the ship…` : 'The girls are getting suspicious. The boys retreat before anyone draws a sword.' });
      function charm(gl) { gl.interest = Math.min(1, gl.interest + .35); charms++; pop.add(pick(['“What a lovely blade!”', '“May I have this dance?”', '“Is that a new hat?”', '“You sing like a siren!”']), gl.x, 130, '#ffd0de', 16); }
    },
    draw() {
      const g = k.g; k.backdrop('evangeline');
      for (let i = 0; i < 8; i++) { g.fillStyle = ['#ffd27a', '#ff9ac0', '#9ad7ff'][i % 3]; g.beginPath(); g.arc(60 + i * 120, 40 + Math.sin(k.t * 2 + i) * 6, 7, 0, 7); g.fill(); }
      girls.forEach((gl, i) => {
        k.figure(gl.x, 360, 190, { coat: gl.coat, hair: gl.hair, hat: i % 2 ? '#2a1c14' : null, sash: '#f3e6cc', squash: Math.sin(k.t * 5 + i) * .015 });
        k.bar(gl.x - 55, 130, 110, 16, gl.interest, gl.interest > .4 ? '#ff8fb5' : '#e0705a');
        k.text(`${i + 1}`, gl.x, 108, { size: 20 });
      });
      ['jade', 'absalom', 'stormcaller'].forEach((key, i) => k.sprite(key, 200 + i * 280, 410, 130, i === 2, .95));
      k.text('Part one: charm Evangeline’s crew', 20, 26, { align: 'left', size: 22, font: 'display' });
      k.text(`Suspicion: ${'●'.repeat(suspicion)}${'○'.repeat(4 - suspicion)}`, W / 2, 26, { size: 18 });
      timerText(k, time);
      k.text('Tap a girl pirate (or press her number) before her heart meter runs out', W / 2, H - 14, { size: 15 });
      pop.draw();
    },
  };
};
GAMES.sneak = k => {
  k.setControls(['left', 'right', 'down', 'act'], 'Light it!');
  const pop = popups(k);
  const LEN = 2600;
  const barrels = [420, 780, 1150, 1500, 1880, 2250];
  const guards = [{ x: 650, a: 520, b: 1000, dir: 1, v: 90 }, { x: 1400, a: 1250, b: 1750, dir: -1, v: 110 }, { x: 2050, a: 1950, b: 2380, dir: 1, v: 130 }];
  let x = 80, flip = false, hidden = false, caught = 0, cam = 0, cp = 80, flash = 0, lit = false, boom = 0;
  return {
    update(dt) {
      pop.update(dt);
      if (boom > 0) { boom += dt; if (boom > 2) k.end({ won: true, score: clamp(3 - caught, 0, 3), text: 'BOOM! Pink and green fireworks fill the sky, and Evangeline’s crew scatters in every direction.' }); return; }
      const nearBarrel = barrels.some(b => Math.abs(b - x) < 45);
      hidden = (k.keys.down || (k.pointer.down && k.pointer.y > 330)) && nearBarrel;
      const dx = hidden ? 0 : (k.keys.right ? 1 : 0) - (k.keys.left ? 1 : 0) || (k.pointer.down && k.pointer.y <= 330 ? Math.sign(k.pointer.x + cam - x) * (Math.abs(k.pointer.x + cam - x) > 10) : 0);
      x = clamp(x + dx * 210 * dt, 40, LEN - 40); if (dx) flip = dx < 0;
      if (flash > 0) flash -= dt;
      guards.forEach(gd => {
        gd.x += gd.dir * gd.v * dt; if (gd.x > gd.b) gd.dir = -1; if (gd.x < gd.a) gd.dir = 1;
        const ahead = (x - gd.x) * gd.dir;
        if (!hidden && flash <= 0 && ahead > 0 && ahead < 300) { caught++; flash = 1.5; x = cp; k.shake = .5; pop.add('Spotted! Back to the last hiding place', W / 2, 120, '#ff9c8a', 20); }
      });
      barrels.forEach(b => { if (hidden && Math.abs(b - x) < 45) cp = Math.max(cp, b); });
      cam = clamp(x - W / 2, 0, LEN - W);
      if (x > LEN - 140) { if (k.hit('act') || k.clicked()) { lit = true; boom = .01; k.shake = 1.2; } }
    },
    draw() {
      const g = k.g; g.fillStyle = '#2a1c18'; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 30; i++) { const lx = i * 110 - cam * 1; g.fillStyle = '#3a2820'; g.fillRect(lx, 0, 14, H); }
      g.fillStyle = '#4a3428'; g.fillRect(0, 360, W, 60);
      g.save(); g.translate(-cam, 0);
      for (let i = 0; i < 12; i++) { const lx = 200 + i * 220; g.fillStyle = 'rgba(255,200,110,.18)'; g.beginPath(); g.arc(lx, 90, 70, 0, 7); g.fill(); g.fillStyle = '#ffcf6a'; g.fillRect(lx - 6, 80, 12, 18); }
      guards.forEach(gd => {
        g.fillStyle = 'rgba(255,230,150,.2)'; g.beginPath(); g.moveTo(gd.x, 280); g.lineTo(gd.x + gd.dir * 300, 230); g.lineTo(gd.x + gd.dir * 300, 370); g.closePath(); g.fill();
        k.figure(gd.x, 365, 150, { coat: '#7a3a5a', hair: '#2a1a10', hat: null, sash: '#f3e6cc', flip: gd.dir < 0 });
      });
      barrels.forEach(b => { g.fillStyle = '#7a5230'; k.rr(b - 34, 300, 68, 68, 12); g.fill(); g.fillStyle = '#4a3020'; g.fillRect(b - 34, 318, 68, 6); g.fillRect(b - 34, 346, 68, 6); });
      g.fillStyle = '#5a2a2a'; g.fillRect(LEN - 120, 250, 90, 115); k.text('POWDER', LEN - 75, 270, { size: 14 }); g.font = '30px serif'; g.textAlign = 'center'; g.fillText('🎆', LEN - 75, 320);
      if (hidden) k.sprite('ruby', x, 350, 110, flip, .6); else k.sprite('ruby', x, 368, 160, flip, flash > 0 ? .5 + Math.sin(k.t * 30) * .3 : 1);
      g.restore();
      if (boom > 0) { for (let i = 0; i < 40; i++) { const a = i / 40 * 7, r = boom * 260; g.fillStyle = i % 2 ? '#ff7ab6' : '#7aff9c'; g.beginPath(); g.arc(W / 2 + Math.cos(a) * r, H / 2 + Math.sin(a) * r * .6, 6, 0, 7); g.fill(); } }
      k.text('Part two: sneak below decks to the powder room', 20, 26, { align: 'left', size: 22, font: 'display' });
      k.text(`Spotted: ${caught}`, W - 20, 26, { align: 'right', size: 18 });
      k.bar(20, 44, 240, 12, x / LEN, '#ffd27a');
      k.text(x > LEN - 140 ? 'Press Space (or tap) to light the fireworks!' : 'Walk with ← →. Hold ↓ behind a barrel to hide from the lanterns.', W / 2, H - 14, { size: 15 });
      pop.draw();
    },
  };
};

// ===================== CREW PLAYS =====================
GAMES.plays = k => {
  k.setControls([], '');
  const pop = popups(k);
  const ACTORS = ['marietta', 'arabella', 'bones', 'scarlett', 'jade', 'monsoon'];
  const MISHAPS = [['Forgot the line!', '📜'], ['The boys storm the stage!', '🏴‍☠️'], ['Leaving in a huff!', '💢'], ['Arguing mid-scene!', '🗯️'], ['The painted sea fell over!', '🌊'], ['Costume malfunction!', '👗']];
  let time = 40, chaos = 0, fixes = 0, events = [], spawn = 1.5, scene = 0;
  const pos = i => 120 + i * 145;
  return {
    update(dt) {
      pop.update(dt); time -= dt; spawn -= dt; scene += dt;
      if (spawn <= 0) {
        spawn = rand(1, 2.2) * (time > 20 ? 1 : .7);
        const free = ACTORS.map((_, i) => i).filter(i => !events.some(e => e.i === i));
        if (free.length) { const i = pick(free); const [label, icon] = pick(MISHAPS); events.push({ i, label, icon, t: 3.2 }); }
      }
      const fix = e => { events.splice(events.indexOf(e), 1); fixes++; pop.add(pick(['Saved it!', 'The show goes on!', 'Nobody noticed!', 'Improvised!']), pos(e.i), 130, '#c8f5a0', 18); };
      for (let n = 1; n <= 6; n++) if (k.hit('n' + n)) { const e = events.find(e => e.i === n - 1); if (e) fix(e); }
      if (k.clicked()) { const e = events.find(e => Math.abs(pos(e.i) - k.pointer.x) < 70); if (e) fix(e); }
      events.forEach(e => { e.t -= dt; if (e.t <= 0) { e.gone = true; chaos = Math.min(1, chaos + .12); pop.add(e.label.replace('!', '… oops'), pos(e.i), 150, '#ff9c8a', 16); k.shake = .3; } });
      events = events.filter(e => !e.gone);
      if (time <= 0) k.end({ won: true, score: clamp(Math.round(fixes / 4), 0, 4), text: chaos >= .8 ? `Total chaos. ${fixes} disasters saved, and many, many more that weren’t.` : `${fixes} disasters saved! It was still a mess, of course. It always is.` });
    },
    draw() {
      const g = k.g; k.backdrop('deck'); g.fillStyle = 'rgba(20,10,5,.4)'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#7a1f2a'; g.fillRect(0, 0, 70, H); g.fillRect(W - 70, 0, 70, H); g.fillRect(0, 0, W, 34);
      g.fillStyle = '#5b3d22'; g.fillRect(0, 340, W, 80);
      ACTORS.forEach((key, i) => {
        const e = events.find(e => e.i === i), wob = e ? Math.sin(k.t * 14) * .05 : Math.sin(k.t * 1.5 + i) * .01;
        k.sprite(key, pos(i), 350, 200, i % 2 === 1, 1, wob);
        k.text(`${i + 1}`, pos(i), 360 + 22, { size: 16 });
        if (e) { g.fillStyle = 'rgba(255,248,234,.95)'; k.rr(pos(i) - 66, 96, 132, 52, 10); g.fill(); k.text(`${e.icon} ${e.label}`, pos(i), 114, { size: 12, color: '#3a2816', stroke: null }); k.bar(pos(i) - 50, 128, 100, 12, e.t / 3.2, '#e0705a'); }
      });
      k.text('“The Princess and the Sea Captain”', W / 2, 17, { size: 20, font: 'display' });
      k.bar(20, 48, 220, 20, chaos, '#e0705a', 'Chaos');
      timerText(k, time, W - 90, 60);
      k.text('Tap an actor (or press their number) to save the scene', W / 2, H - 14, { size: 15 });
      pop.draw();
    },
  };
};

// ===================== WALK THE PLANK =====================
GAMES.plank = k => {
  k.setControls(['left', 'right', 'act'], 'Parry');
  const pop = popups(k);
  let tilt = 0, vel = 0, hits = 0, parries = 0, attack = null, wait = 1.6, boss = false, fallT = 0, swing = 0;
  const NEED = 6, BOSS_NEED = 4;
  return {
    update(dt) {
      pop.update(dt);
      if (fallT > 0) { fallT += dt; if (fallT > 1.4) k.end({ won: false, score: 0, text: 'SPLASH! Cutlass goes into the sea.' }); return; }
      // balance: the plank wobbles, and you lean against it
      const lean = (k.keys.right ? 1 : 0) - (k.keys.left ? 1 : 0) || (k.pointer.down && k.pointer.y < 300 ? Math.sign(k.pointer.x - W / 2) : 0);
      const calm = Math.min(1, k.t / 2.5);   // a moment to find your feet
      vel += (Math.sin(k.t * 1.7) * .5 + Math.sin(k.t * 3.1 + 1) * .35 + tilt * .45) * dt * (boss ? 1.25 : 1) * calm;
      vel += lean * 2.2 * dt; vel *= .97; tilt += vel * dt;
      if (Math.abs(tilt) > 1) { fallT = .01; pop.add('Whoa—!', 560, 140, '#ff9c8a'); return; }
      swing = Math.max(0, swing - dt);
      if (!attack) { wait -= dt; if (wait <= 0) attack = { t: 0, wind: boss ? rand(.55, .8) : rand(.75, 1.1) }; }
      else {
        attack.t += dt;
        const window = attack.t > attack.wind - .38 && attack.t < attack.wind + .08;
        if (k.hit('act') || (k.clicked() && k.pointer.y >= 300)) {
          if (window) { parries++; swing = .3; attack = null; wait = rand(.6, 1.3); pop.add(pick(['Parried!', 'Clang!', 'Too slow!']), 560, 150, '#c8f5a0'); vel *= .5;
            if (!boss && parries >= NEED) { boss = true; parries = 0; wait = 1.8; pop.add('Evangeline steps up!', W / 2, 90, '#ffd0de', 28); }
            else if (boss && parries >= BOSS_NEED) { k.end({ won: true, score: clamp(5 - hits, 2, 5), text: 'Cutlass flips her sword into the sea and swings back aboard. The girl pirates gasp.' }); }
          } else { pop.add('Too early!', 560, 150, '#ffd9a8'); }
        } else if (attack.t > attack.wind + .1) { hits++; attack = null; wait = rand(.8, 1.4); vel += (Math.random() < .5 ? -1 : 1) * 1.2; k.shake = .5; pop.add('Ouch!', 560, 150, '#ff9c8a');
          if (hits >= 4) { fallT = .01; } }
      }
    },
    draw() {
      const g = k.g; k.backdrop('sea'); g.fillStyle = '#1a5a74'; g.fillRect(0, 330, W, 90);
      for (let i = 0; i < 6; i++) { g.fillStyle = '#2a2f36'; g.beginPath(); const fx = (i * 190 + k.t * 40) % (W + 100) - 50; g.moveTo(fx, 345); g.lineTo(fx + 14, 318); g.lineTo(fx + 28, 345); g.fill(); }
      // ship deck on the left, plank sticking out over the water
      g.fillStyle = '#5b3d22'; g.fillRect(0, 200, 330, 230); g.fillStyle = '#7a5230'; g.fillRect(0, 190, 340, 14);
      g.save(); g.translate(330, 205); g.rotate(tilt * .12); g.fillStyle = '#9a7048'; g.fillRect(0, -6, 420, 14); g.restore();
      const px = 560, py = 205 + Math.sin(tilt * .12) * 230;
      // the attacker on deck
      const att = attack ? clamp(attack.t / attack.wind, 0, 1) : 0;
      if (boss) k.figure(250 + att * 60, 190, 190, { coat: '#3a1f4a', hair: '#1a0f1a', hat: '#1a0f1a', sash: '#d2a24c' });
      else k.figure(250 + att * 60, 190, 165, { coat: '#7a3a5a', hair: '#8a4a20', hat: null, sash: '#f3e6cc' });
      g.strokeStyle = '#d8dde3'; g.lineWidth = 5; g.beginPath(); g.moveTo(285 + att * 60, 120); g.lineTo(285 + att * 60 + 60 + att * 120, 112 - att * 10); g.stroke();
      if (attack && attack.t > attack.wind - .38) k.text('!', 330, 70, { size: 44, color: '#ffd27a' });
      k.sprite('cutlass', px, py, 175, true, 1, tilt * .5 + (swing > 0 ? -.15 : 0));
      if (fallT > 0) { g.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 12; i++) { g.beginPath(); g.arc(px + rand(-60, 60), 340 - fallT * 60 + rand(-10, 10), 8, 0, 7); g.fill(); } }
      k.sprite('ruby', 110, 200, 170, false);
      // balance meter
      g.fillStyle = 'rgba(20,12,6,.6)'; k.rr(W / 2 - 160, 50, 320, 20, 10); g.fill(); g.fillStyle = '#7fc97f'; g.fillRect(W / 2 - 60, 52, 120, 16);
      g.fillStyle = '#fff8ea'; g.beginPath(); g.arc(W / 2 + tilt * 150, 60, 11, 0, 7); g.fill();
      k.text('Balance', W / 2, 84, { size: 14 });
      k.text(boss ? `Evangeline: parry ${BOSS_NEED - parries} more!` : `Parry ${NEED - parries} more attacks`, 20, 26, { align: 'left', size: 22, font: 'display' });
      k.text(`Hits: ${hits} / 4`, W - 20, 26, { align: 'right', size: 18 });
      k.text('← → to keep your balance. Space (or tap low) to parry when you see “!”', W / 2, H - 14, { size: 15 });
      pop.draw();
    },
  };
};

// ===================== MERMAID DIVE =====================
GAMES.mermaid = k => {
  k.setControls(['left', 'right', 'up', 'down', 'act'], 'Tickle');
  const pop = popups(k);
  const WW = 2600;
  let x = 140, y = 120, vx = 0, vy = 0, flip = false, air = 1, cam = 0, shells = 0, tickles = 0, stun = 0, opened = 0;
  const clues = [{ x: 650, y: 330 }, { x: 1200, y: 120 }, { x: 1750, y: 300 }].map(c => ({ ...c, got: false }));
  const bubbles = Array.from({ length: 14 }, (_, i) => ({ x: 300 + i * 160, y: rand(150, 400), r: rand(10, 16) }));
  const jellies = Array.from({ length: 9 }, (_, i) => ({ x: 450 + i * 220, y: rand(80, 340), ph: rand(0, 6), amp: rand(50, 110) }));
  const OCTO = { x: 2380, y: 300 };
  return {
    update(dt) {
      pop.update(dt);
      if (opened > 0) { opened += dt; if (opened > 1.8) k.end({ won: true, score: clamp(2 + shells, 2, 5), text: 'The chest creaks open. Inside, glowing like moonlight, is the Siren’s Pearl!' }); return; }
      let ax = (k.keys.right ? 1 : 0) - (k.keys.left ? 1 : 0), ay = (k.keys.down ? 1 : 0) - (k.keys.up ? 1 : 0);
      if (k.pointer.down) { const dx = k.pointer.x + cam - x, dy = k.pointer.y - y, d = Math.hypot(dx, dy); if (d > 20) { ax = dx / d; ay = dy / d; } }
      if (stun > 0) { stun -= dt; ax = ay = 0; }
      vx = (vx + ax * 900 * dt) * .93; vy = (vy + ay * 900 * dt) * .93;
      x = clamp(x + vx * dt, 40, WW - 40); y = clamp(y + vy * dt, 40, H - 40); if (ax) flip = ax < 0;
      air -= dt / 32;
      bubbles.forEach(b => { b.y -= 30 * dt; if (b.y < 30) b.y = H - 10; if (!b.got && Math.hypot(b.x - x, b.y - y) < 40) { b.got = true; air = Math.min(1, air + .2); pop.add('+air', b.x - cam, b.y, '#bff'); setTimeout(() => { b.got = false; b.y = H - 10; }, 6000); } });
      jellies.forEach(j => { j.cy = j.y + Math.sin(k.t * 1.2 + j.ph) * j.amp; if (stun <= 0 && Math.hypot(j.x - x, j.cy - y) < 38) { stun = 1; air -= .1; k.shake = .4; pop.add('Zap!', x - cam, y - 40, '#ff9cf0'); vx = -vx * 2; vy = -vy * 2; } });
      clues.forEach(c => { if (!c.got && Math.hypot(c.x - x, c.y - y) < 45) { c.got = true; shells++; pop.add(`Clue ${shells} / 3: a trail toward the wreck`, x - cam, y - 50, '#fff2a8', 18); } });
      if (Math.hypot(OCTO.x - x, OCTO.y - y) < 160 && (k.hit('act') || (k.clicked()))) { tickles++; pop.add(pick(['Hee!', 'Hoo hoo!', 'Tee hee!']), OCTO.x - cam + rand(-40, 40), OCTO.y - 120, '#ffd0de'); if (tickles >= 10) opened = .01; }
      cam = clamp(x - W / 2, 0, WW - W);
      if (air <= 0) k.end({ won: false, score: 0, text: 'Out of air! Everyone swims back up, gasping. The Pearl is still down there.' });
    },
    draw() {
      const g = k.g; const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#3fa2a8'); gr.addColorStop(1, '#0a2a3c'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 8; i++) { g.fillStyle = 'rgba(255,255,255,.05)'; g.beginPath(); g.moveTo(i * 140 - cam * .2 % 140, 0); g.lineTo(i * 140 + 60 - cam * .2 % 140, 0); g.lineTo(i * 140 + 160 - cam * .2 % 140, H); g.lineTo(i * 140 + 100 - cam * .2 % 140, H); g.fill(); }
      g.save(); g.translate(-cam, 0);
      g.fillStyle = '#c9b48a'; g.fillRect(0, 395, WW, 30);
      for (let i = 0; i < 40; i++) { g.strokeStyle = '#2f7a4a'; g.lineWidth = 6; g.beginPath(); const kx = i * 67 + 20; g.moveTo(kx, 400); g.quadraticCurveTo(kx + Math.sin(k.t + i) * 20, 330, kx + Math.sin(k.t * 1.3 + i) * 10, 280 + (i % 3) * 20); g.stroke(); }
      // the wreck and the chest
      g.fillStyle = '#4a3020'; g.beginPath(); g.moveTo(2150, 400); g.lineTo(2220, 260); g.lineTo(2560, 250); g.lineTo(2600, 400); g.fill();
      g.fillStyle = '#7a5230'; k.rr(2470, 340, 80, 55, 6); g.fill(); g.fillStyle = '#d2a24c'; g.fillRect(2470, 360, 80, 6);
      if (opened > 0) { g.fillStyle = `rgba(255,255,240,${.5 + Math.sin(k.t * 6) * .3})`; g.beginPath(); g.arc(2510, 340, 30 + opened * 30, 0, 7); g.fill(); }
      // octopus
      g.fillStyle = opened > 0 ? 'rgba(200,90,140,.5)' : '#c85a8c';
      for (let a = 0; a < 8; a++) { g.beginPath(); g.ellipse(OCTO.x - 70 + a * 20, OCTO.y + 30, 8, 40 + Math.sin(k.t * 3 + a) * 10, Math.sin(k.t * 2 + a) * .4, 0, 7); g.fill(); }
      g.beginPath(); g.ellipse(OCTO.x, OCTO.y - 20, 70, 60, 0, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(OCTO.x - 22, OCTO.y - 30, 12, 0, 7); g.arc(OCTO.x + 22, OCTO.y - 30, 12, 0, 7); g.fill();
      g.fillStyle = '#222'; g.beginPath(); g.arc(OCTO.x - 22 + (x < OCTO.x ? -4 : 4), OCTO.y - 28, 5, 0, 7); g.arc(OCTO.x + 22 + (x < OCTO.x ? -4 : 4), OCTO.y - 28, 5, 0, 7); g.fill();
      if (tickles) k.bar(OCTO.x - 60, OCTO.y - 110, 120, 14, tickles / 10, '#ffd0de');
      bubbles.forEach(b => { if (b.got) return; g.strokeStyle = 'rgba(220,255,255,.9)'; g.lineWidth = 2; g.beginPath(); g.arc(b.x, b.y, b.r, 0, 7); g.stroke(); });
      jellies.forEach(j => { g.fillStyle = 'rgba(255,150,240,.7)'; g.beginPath(); g.arc(j.x, j.cy, 22, Math.PI, 0); g.fill(); g.strokeStyle = 'rgba(255,150,240,.6)'; g.lineWidth = 2; for (let t = -2; t <= 2; t++) { g.beginPath(); g.moveTo(j.x + t * 7, j.cy); g.quadraticCurveTo(j.x + t * 7 + Math.sin(k.t * 4 + t) * 6, j.cy + 20, j.x + t * 7, j.cy + 40); g.stroke(); } });
      clues.forEach(c => { if (c.got) return; g.font = '30px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🐚', c.x, c.y + Math.sin(k.t * 3) * 4); });
      // the merfolk: Ruby leads, the mermen follow
      [['bones', -150, 30], ['jade', -100, -30], ['monsoon', -60, 25], ['cutlass', -30, -12]].forEach(([key, ox, oy]) => { const fx = x + (flip ? -ox : ox), fy = y + oy + Math.sin(k.t * 3 + ox) * 6; g.fillStyle = key === 'cutlass' ? '#3a7aa0' : '#3a8a7a'; g.beginPath(); g.ellipse(fx + (flip ? 22 : -22), fy + 10, 26, 9, Math.sin(k.t * 6 + ox) * .3, 0, 7); g.fill(); k.face(key, fx, fy, 15); });
      g.fillStyle = '#c0304a'; g.beginPath(); g.ellipse(x + (flip ? 26 : -26), y + 12, 32, 11, Math.sin(k.t * 6) * .3, 0, 7); g.fill();
      k.face('ruby', x, y, 20, stun > 0 ? '#ff9cf0' : '#ffd27a');
      g.restore();
      k.bar(20, 44, 220, 18, air, air > .3 ? '#8fe3ff' : '#e0705a', 'Air');
      k.text('Find the clues and the sunken Pearl', 20, 22, { align: 'left', size: 22, font: 'display' });
      k.text(`Clues ${shells} / 3`, W - 20, 26, { align: 'right', size: 18 });
      k.text(Math.hypot(OCTO.x - x, OCTO.y - y) < 160 ? 'Press Space (or tap) again and again to tickle the octopus!' : 'Swim with the arrows (or hold the screen). Grab bubbles for air, avoid jellyfish.', W / 2, H - 14, { size: 15 });
      pop.draw();
    },
  };
};

// ===================== RIVER RAFTING IN THE JUNGLE =====================
GAMES.rafting = k => {
  k.setControls(['left', 'right', 'act'], 'Grab the vine');
  const pop = popups(k);
  let x = W / 2, hearts = 3, dist = 0, obs = [], spawn = 1, inv = 0, phase = 'river', vine = 0, vineT = 0, result = null;
  const LEN = 3000, SPEED = 95;
  const bank = y => 180 + Math.sin((y + dist) / 140) * 60;
  return {
    update(dt) {
      pop.update(dt);
      const dx = (k.keys.right ? 1 : 0) - (k.keys.left ? 1 : 0) || (k.pointer.down ? Math.sign(k.pointer.x - x) * (Math.abs(k.pointer.x - x) > 12) : 0);
      if (phase === 'river') {
        dist += 90 * dt; x = clamp(x + dx * 320 * dt, bank(320) + 40, W - bank(320) + 40 - 80);
        inv = Math.max(0, inv - dt);
        spawn -= dt;
        if (spawn <= 0) { spawn = rand(.6, 1.1); const kind = pick(['rock', 'rock', 'log', 'croc', 'whirl']); obs.push({ kind, x: rand(260, W - 260), y: -40, vx: kind === 'croc' ? pick([-80, 80]) : 0 }); }
        obs.forEach(o => { o.y += SPEED * 4 * dt; o.x += o.vx * dt; if (o.kind === 'croc' && (o.x < 220 || o.x > W - 220)) o.vx *= -1;
          const w = o.kind === 'log' ? 150 : o.kind === 'croc' ? 70 : 40;
          if (inv <= 0 && !o.hit && Math.abs(o.y - 330) < 30 && Math.abs(o.x - x) < w) { o.hit = true; hearts--; inv = 1.2; k.shake = .6; pop.add({ rock: 'Bonk!', log: 'Cutlass didn’t duck!', croc: 'Chomp!', whirl: 'Round and round!' }[o.kind], x, 280, '#ff9c8a'); } });
        obs = obs.filter(o => o.y < H + 60);
        if (hearts <= 0) k.end({ won: false, score: 0, text: 'The river wins this time. Ruby and Cutlass wash up downstream, soggy and arguing.' });
        if (dist >= LEN) { phase = 'falls'; obs = []; vineT = 0; }
      } else if (!result) {
        vineT += dt; vine = Math.sin(vineT * 2.4) * 260;
        x = clamp(x + dx * 320 * dt, 250, W - 250);
        if (k.hit('act') || k.clicked()) {
          if (Math.abs(W / 2 + vine - x) < 55) { result = 'grab'; pop.add('Got it!', x, 160, '#c8f5a0'); setTimeout(() => k.end({ won: true, score: hearts + 2, text: 'Ruby grabs the vine, Cutlass grabs Ruby, and they swing to the bank as the raft goes over the falls.' }), 900); }
          else pop.add('Missed!', x, 160, '#ffd9a8');
        }
        if (vineT > 9) { result = 'over'; k.end({ won: false, score: 0, text: 'Over the waterfall they go! “I regret everything!”' }); }
      }
    },
    draw() {
      const g = k.g; g.fillStyle = '#1f6a5a'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#2f8aa0'; g.beginPath(); g.moveTo(bank(0), 0);
      for (let y = 0; y <= H; y += 20) g.lineTo(bank(y), y);
      for (let y = H; y >= 0; y -= 20) g.lineTo(W - bank(y) + 40, y);
      g.fill();
      for (let i = 0; i < 26; i++) { const yy = ((i * 61 + dist * 1.2) % (H + 40)) - 20; g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(bank(yy) + 40 + (i * 89) % 380, yy, 30, 3); }
      for (let i = 0; i < 14; i++) { const yy = ((i * 97 + dist) % (H + 80)) - 40; g.fillStyle = '#2f5d34'; g.beginPath(); g.arc(bank(yy) - 50, yy, 50, 0, 7); g.arc(W - bank(yy) + 90, yy, 50, 0, 7); g.fill(); }
      obs.forEach(o => { g.save(); g.translate(o.x, o.y);
        if (o.kind === 'rock') { g.fillStyle = '#6a6a72'; g.beginPath(); g.ellipse(0, 0, 40, 26, 0, 0, 7); g.fill(); }
        else if (o.kind === 'log') { g.fillStyle = '#6b4a2b'; k.rr(-150, -14, 300, 28, 14); g.fill(); g.fillStyle = '#4a3020'; g.beginPath(); g.ellipse(150, 0, 10, 14, 0, 0, 7); g.fill(); }
        else if (o.kind === 'croc') { g.fillStyle = '#4a7a3a'; g.beginPath(); g.ellipse(0, 0, 70, 16, 0, 0, 7); g.fill(); g.fillStyle = '#ff5'; g.beginPath(); g.arc(o.vx > 0 ? 50 : -50, -10, 5, 0, 7); g.fill(); }
        else { g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 3; g.beginPath(); for (let a = 0; a < 18; a += .3) g.lineTo(Math.cos(a + k.t * 4) * a * 2.2, Math.sin(a + k.t * 4) * a * 1.3); g.stroke(); }
        g.restore(); });
      if (phase === 'falls') {
        g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(0, H - 40, W, 40); k.text('WATERFALL', W / 2, H - 20, { size: 20, color: '#2f8aa0', stroke: null });
        g.strokeStyle = '#3f7a2a'; g.lineWidth = 6; g.beginPath(); g.moveTo(W / 2, 0); g.lineTo(W / 2 + vine, 230); g.stroke(); g.fillStyle = '#3f7a2a'; g.beginPath(); g.arc(W / 2 + vine, 234, 10, 0, 7); g.fill();
      }
      const bob = Math.sin(k.t * 5) * 3, a = inv > 0 && Math.sin(k.t * 30) > 0 ? .5 : 1;
      g.globalAlpha = a; g.fillStyle = '#c9a25a'; for (let i = 0; i < 5; i++) { k.rr(x - 60 + i * 24, 300 + bob, 22, 70, 6); g.fill(); }
      g.globalAlpha = 1; k.face('ruby', x - 24, 320 + bob, 20); k.face('cutlass', x + 24, 330 + bob, 20);
      k.text('River rafting in the jungle', 20, 24, { align: 'left', size: 22, font: 'display' });
      k.text('♥'.repeat(hearts) + '♡'.repeat(3 - hearts), W - 20, 26, { align: 'right', size: 26, color: '#ff8fa0' });
      k.bar(20, 44, 220, 12, Math.min(1, dist / LEN), '#ffd27a');
      k.text(phase === 'falls' ? 'Press Space (or tap) when the vine is right over the raft!' : 'Steer with ← → (or hold the screen). Dodge rocks, logs, crocodiles and whirlpools.', W / 2, phase === 'falls' ? H - 56 : H - 14, { size: 15 });
      pop.draw();
    },
  };
};

// ===================== THE OLD MASTER'S GAME (capture Go, 7x7) =====================
GAMES.boardgame = k => {
  k.setControls(['left', 'right', 'up', 'down', 'act'], 'Place stone');
  const pop = popups(k);
  const N = 7, CELL = 48, OX = W / 2 - (N - 1) * CELL / 2, OY = 60;
  const board = Array.from({ length: N }, () => Array(N).fill(0));   // 1 = you (black), 2 = the master (white)
  let cx = 3, cy = 3, turn = 1, aiWait = 0, over = null, overT = 0, says = 'The first to capture a stone wins. You play black.';
  const nbrs = (x, y) => [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].filter(([a, b]) => a >= 0 && b >= 0 && a < N && b < N);
  function group(b, x, y) {
    const c = b[y][x], seen = new Set([x + ',' + y]), stack = [[x, y]], libs = new Set();
    while (stack.length) { const [a, bb] = stack.pop(); nbrs(a, bb).forEach(([p, q]) => { const v = b[q][p]; if (!v) libs.add(p + ',' + q); else if (v === c && !seen.has(p + ',' + q)) { seen.add(p + ',' + q); stack.push([p, q]); } }); }
    return { stones: [...seen], libs: libs.size };
  }
  // place a stone; returns 'capture', 'ok', or null (illegal: suicide)
  function play(b, x, y, c) {
    if (b[y][x]) return null;
    b[y][x] = c;
    const caps = nbrs(x, y).filter(([p, q]) => b[q][p] === 3 - c && group(b, p, q).libs === 0);
    if (caps.length) return 'capture';
    if (group(b, x, y).libs === 0) { b[y][x] = 0; return null; }
    return 'ok';
  }
  const copy = b => b.map(r => r.slice());
  function aiMove() {
    const moves = [];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!board[y][x]) moves.push([x, y]);
    let best = null, bestScore = -1e9;
    moves.forEach(([x, y]) => {
      const b = copy(board), r = play(b, x, y, 2); if (!r) return;
      let s = r === 'capture' ? 1e6 : 0;
      const mine = group(b, x, y).libs; s += mine * 10; if (mine === 1) s -= 5000;
      // does it save a white group in atari, or put black in atari?
      nbrs(x, y).forEach(([p, q]) => { if (b[q][p] === 1) { const lb = group(b, p, q).libs; if (lb === 1) s += 300; s += (4 - lb) * 15; } });
      // can black capture next turn?
      let danger = false; for (let yy = 0; yy < N && !danger; yy++) for (let xx = 0; xx < N && !danger; xx++) if (!b[yy][xx]) { const b2 = copy(b); if (play(b2, xx, yy, 1) === 'capture') danger = true; }
      if (danger) s -= 20000;
      s += Math.random() * 12 - Math.abs(x - 3) - Math.abs(y - 3);
      if (s > bestScore) { bestScore = s; best = [x, y]; }
    });
    if (!best) { over = 'you'; return; }
    const r = play(board, best[0], best[1], 2);
    if (r === 'capture') { over = 'master'; says = '“A capture. Patience, young captain.”'; }
    else says = pick(['“Hm.”', '“You chase too quickly.”', '“Good. You build.”', '“Strength comes from connection.”', '“The Pirate King never gives up a single stone.”']);
    turn = 1;
  }
  return {
    update(dt) {
      pop.update(dt);
      if (over) { overT += dt; if (overT > 2) k.end(over === 'you' ? { won: true, score: 5, text: 'You captured the master’s stone! He laughs and bows deeply.' } : { won: false, score: 2, text: 'The old master captures your stone. “You play with a good heart, all the same.”' }); return; }
      if (turn === 2) { aiWait -= dt; if (aiWait <= 0) aiMove(); return; }
      if (k.hit('left')) cx = Math.max(0, cx - 1); if (k.hit('right')) cx = Math.min(N - 1, cx + 1);
      if (k.hit('up')) cy = Math.max(0, cy - 1); if (k.hit('down')) cy = Math.min(N - 1, cy + 1);
      let place = k.hit('act');
      if (k.clicked()) { const px = Math.round((k.pointer.x - OX) / CELL), py = Math.round((k.pointer.y - OY) / CELL); if (px >= 0 && py >= 0 && px < N && py < N) { cx = px; cy = py; place = true; } }
      if (place) {
        const r = play(board, cx, cy, 1);
        if (!r) pop.add(board[cy][cx] ? 'Taken' : 'That stone would have no breath', OX + cx * CELL, OY + cy * CELL - 30, '#ffd9a8', 16);
        else if (r === 'capture') { over = 'you'; says = '“Ah! Well played.”'; }
        else { turn = 2; aiWait = .7; }
      }
    },
    draw() {
      const g = k.g; k.backdrop('temple');
      g.fillStyle = '#d8b06a'; k.rr(OX - 34, OY - 34, (N - 1) * CELL + 68, (N - 1) * CELL + 68, 8); g.fill();
      g.strokeStyle = '#3a2816'; g.lineWidth = 1.5;
      for (let i = 0; i < N; i++) { g.beginPath(); g.moveTo(OX, OY + i * CELL); g.lineTo(OX + (N - 1) * CELL, OY + i * CELL); g.stroke(); g.beginPath(); g.moveTo(OX + i * CELL, OY); g.lineTo(OX + i * CELL, OY + (N - 1) * CELL); g.stroke(); }
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (board[y][x]) {
        g.fillStyle = board[y][x] === 1 ? '#1a1a1a' : '#f4f1e8'; g.beginPath(); g.arc(OX + x * CELL, OY + y * CELL, 20, 0, 7); g.fill();
        g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1; g.stroke();
      }
      if (!over && turn === 1) { g.strokeStyle = '#c0304a'; g.lineWidth = 3; g.beginPath(); g.arc(OX + cx * CELL, OY + cy * CELL, 22, 0, 7); g.stroke(); }
      k.sprite('ruby', 140, 410, 220); k.sprite('cutlass', 70, 410, 225, false, .85);
      k.figure(840, 400, 200, { coat: '#6a5a4a', hat: null, hair: '#e8e8e8', sash: '#3a5a3a', flip: true });
      g.fillStyle = 'rgba(255,248,234,.95)'; k.rr(W - 320, 40, 300, 70, 10); g.fill();
      k.text('The old master', W - 306, 56, { align: 'left', size: 13, color: '#9b7230', stroke: null });
      k.text(says, W - 306, 84, { align: 'left', size: 15, color: '#3a2816', stroke: null, font: 'story' });
      k.text(turn === 2 && !over ? 'The master is thinking…' : 'Tap a point (or arrows + Space). First capture wins: surround a white stone.', W / 2, H - 14, { size: 15 });
      pop.draw();
    },
  };
};

// ===================== THE MOP WAR =====================
GAMES.mopwar = k => {
  k.setControls(['left', 'right', 'up', 'down', 'act'], 'Mop!');
  const pop = popups(k);
  const WW = 1800;
  let x = 900, flip = false, hp = 6, inv = 0, swing = 0, cam = 0, enemies = [], spawn = 1.5, defeated = 0, boss = null, bossDone = false, barrels = [], freeing = 0;
  const prisoners = [{ x: 250, freed: false, prog: 0 }, { x: 1000, freed: false, prog: 0 }, { x: 1600, freed: false, prog: 0 }];
  const barrelSpots = [500, 1300];
  const allies = [];
  const GROUND = 360;
  return {
    update(dt) {
      pop.update(dt);
      const dx = (k.keys.right ? 1 : 0) - (k.keys.left ? 1 : 0) || (k.pointer.down && k.pointer.y < 300 ? Math.sign(k.pointer.x + cam - x) * (Math.abs(k.pointer.x + cam - x) > 16) : 0);
      x = clamp(x + dx * 260 * dt, 40, WW - 40); if (dx) flip = dx < 0;
      inv = Math.max(0, inv - dt); swing = Math.max(0, swing - dt);
      const attack = k.hit('act') || (k.clicked() && k.pointer.y >= 300);
      if (attack && swing <= 0) swing = .3;
      // roll a barrel (↑ near a barrel stack)
      if (k.hit('up')) { const spot = barrelSpots.find(s => Math.abs(s - x) < 70); if (spot) { barrels.push({ x, dir: flip ? -1 : 1 }); pop.add('Barrel!', x - cam, 230, '#ffd27a'); } }
      barrels.forEach(b => { b.x += b.dir * 520 * dt; enemies.forEach(e => { if (!e.down && Math.abs(e.x - b.x) < 40) { e.down = true; e.vx = b.dir * 400; defeated++; } }); if (boss && Math.abs(boss.x - b.x) < 60 && !boss.hitByBarrel) { boss.hitByBarrel = true; boss.hp--; } });
      barrels = barrels.filter(b => b.x > -50 && b.x < WW + 50);
      // free prisoners (hold ↓)
      const pr = prisoners.find(p => !p.freed && Math.abs(p.x - x) < 60);
      if (pr && (k.keys.down || (k.pointer.down && k.pointer.y >= 300 && Math.abs(k.pointer.x + cam - pr.x) < 60))) { pr.prog += dt / 1.3; if (pr.prog >= 1) { pr.freed = true; allies.push({ x: pr.x, cd: 1, flip: false }); pop.add('Free! They grab a mop!', pr.x - cam, 200, '#c8f5a0', 22); } }
      // enemies
      const needBoss = prisoners.every(p => p.freed) && defeated >= 14;
      if (!needBoss) {
        spawn -= dt;
        if (spawn <= 0 && enemies.filter(e => !e.down).length < 5) { spawn = rand(.9, 1.6); const side = Math.random() < .5 ? cam - 40 : cam + W + 40; enemies.push({ x: clamp(side, 20, WW - 20), hp: 2, vx: 0, down: false, stun: 0, coat: pick(['#2a3a5a', '#3a2a4a', '#2a4a3a']) }); }
      } else if (!boss && !bossDone) { boss = { x: x + (x > WW / 2 ? -500 : 500), hp: 8, lunge: 0, cd: 2, stun: 0 }; pop.add('The Pirate King himself!', W / 2, 120, '#ffd27a', 30); k.shake = .8; }
      enemies.forEach(e => {
        if (e.down) { e.x += e.vx * dt; e.vx *= .95; e.fade = (e.fade || 0) + dt; return; }
        if (e.stun > 0) { e.stun -= dt; e.x += e.vx * dt; e.vx *= .9; return; }
        e.x += Math.sign(x - e.x) * 95 * dt;
        if (Math.abs(e.x - x) < 40 && inv <= 0) { hp--; inv = 1; k.shake = .5; pop.add('Oof!', x - cam, 230, '#ff9c8a'); x -= Math.sign(e.x - x) * 50; }
      });
      if (swing > .2) {
        const reach = x + (flip ? -1 : 1) * 60;
        enemies.forEach(e => { if (!e.down && e.stun <= 0 && Math.abs(e.x - reach) < 60) { e.hp--; e.stun = .5; e.vx = (flip ? -1 : 1) * 300; if (e.hp <= 0) { e.down = true; defeated++; pop.add(pick(['Mopped!', 'Splosh!', 'Squeaky clean!']), e.x - cam, 220, '#bff'); } } });
        if (boss && boss.stun <= 0 && Math.abs(boss.x - reach) < 70) { boss.hp--; boss.stun = .6; boss.x += (flip ? -1 : 1) * 60; pop.add('Mop to the face!', boss.x - cam, 150, '#bff'); }
      }
      allies.forEach(a => { a.cd -= dt; const tgt = enemies.find(e => !e.down && Math.abs(e.x - a.x) < 300); if (tgt) { a.x += Math.sign(tgt.x - a.x) * 120 * dt; a.flip = tgt.x < a.x; if (a.cd <= 0 && Math.abs(tgt.x - a.x) < 60) { a.cd = 1.2; tgt.hp--; tgt.stun = .5; tgt.vx = (a.flip ? -1 : 1) * 250; if (tgt.hp <= 0) { tgt.down = true; defeated++; } } } });
      enemies = enemies.filter(e => !(e.down && e.fade > 1.2));
      if (boss) {
        boss.stun = Math.max(0, boss.stun - dt);
        if (boss.lunge > 0) { boss.lunge -= dt; boss.x += boss.dir * 520 * dt; if (Math.abs(boss.x - x) < 50 && inv <= 0) { hp -= 2; inv = 1.2; k.shake = .8; pop.add('BAM!', x - cam, 220, '#ff9c8a'); } }
        else if (boss.stun <= 0) { boss.x += Math.sign(x - boss.x) * 60 * dt; boss.cd -= dt; if (boss.cd <= 0) { boss.cd = rand(1.8, 2.8); boss.windup = .7; } }
        if (boss.windup > 0) { boss.windup -= dt; if (boss.windup <= 0) { boss.lunge = .45; boss.dir = Math.sign(x - boss.x) || 1; } }
        boss.x = clamp(boss.x, 40, WW - 40);
        if (boss.hp <= 0) { bossDone = true; k.end({ won: true, score: clamp(hp, 2, 5), text: 'The Pirate King goes down under a pile of mops, and the Dragon Seal rolls across the deck to Ruby’s feet.' }); boss = null; }
      }
      cam = clamp(x - W / 2, 0, WW - W);
      if (hp <= 0) k.end({ won: false, score: 0, text: 'The Pirate King’s crews push you back!' });
    },
    draw() {
      const g = k.g; k.backdrop('eastern');
      g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(0, 0, W, H);
      g.save(); g.translate(-cam, 0);
      g.fillStyle = '#6b4a2b'; g.fillRect(0, GROUND, WW, 80); g.fillStyle = '#87613b'; for (let i = 0; i < WW; i += 60) g.fillRect(i, GROUND, 2, 80);
      g.fillStyle = '#4a3020'; [300, 900, 1500].forEach(mx => { g.fillRect(mx - 8, 0, 16, GROUND); g.fillStyle = '#b8323a'; g.fillRect(mx + 8, 40, 90, 60); g.fillStyle = '#4a3020'; });
      barrelSpots.forEach(s => { for (let i = 0; i < 3; i++) { g.fillStyle = '#7a5230'; k.rr(s - 50 + i * 34, GROUND - 52, 32, 50, 8); g.fill(); } });
      barrels.forEach(b => { g.save(); g.translate(b.x, GROUND - 24); g.rotate(b.x / 24); g.fillStyle = '#7a5230'; g.beginPath(); g.arc(0, 0, 24, 0, 7); g.fill(); g.fillStyle = '#4a3020'; g.fillRect(-24, -3, 48, 6); g.restore(); });
      prisoners.forEach(p => {
        if (p.freed) return;
        k.figure(p.x, GROUND, 130, { coat: '#8a7a6a', hat: null, hair: '#2a1a10', alpha: .9 });
        g.strokeStyle = '#999'; g.lineWidth = 4; g.beginPath(); g.moveTo(p.x - 20, GROUND - 60); g.lineTo(p.x + 20, GROUND - 60); g.stroke();
        if (p.prog > 0) k.bar(p.x - 40, GROUND - 160, 80, 12, p.prog, '#c8f5a0'); else k.text('⛓', p.x, GROUND - 150, { size: 22 });
      });
      allies.forEach(a => { k.figure(a.x, GROUND, 130, { coat: '#8a7a6a', hat: null, hair: '#2a1a10', flip: a.flip, sash: '#7fc97f' }); g.strokeStyle = '#c9a25a'; g.lineWidth = 4; g.beginPath(); g.moveTo(a.x, GROUND - 70); g.lineTo(a.x + (a.flip ? -40 : 40), GROUND - 20); g.stroke(); });
      enemies.forEach(e => k.figure(e.x, GROUND, 150, { coat: e.coat, sash: '#b8323a', hat: '#1a1a1a', flip: e.x > x, alpha: e.down ? Math.max(0, 1 - (e.fade || 0)) : 1, squash: e.stun > 0 ? .08 : 0 }));
      if (boss) { k.figure(boss.x, GROUND, 210, { coat: '#5a1a1a', sash: '#d2a24c', hat: '#d2a24c', flip: boss.x > x, squash: boss.stun > 0 ? .06 : 0 }); if (boss.windup > 0) k.text('!', boss.x, GROUND - 240, { size: 46, color: '#ffd27a' }); k.bar(boss.x - 60, GROUND - 260, 120, 12, boss.hp / 8, '#e0705a'); }
      ['cutlass', 'oro'].forEach((key, i) => k.sprite(key, clamp(x + (i ? 140 : -140), 40, WW - 40), GROUND + 4, 150, i === 0 ? false : true, .9));
      k.sprite('ruby', x, GROUND + 4, 170, flip, inv > 0 && Math.sin(k.t * 30) > 0 ? .5 : 1);
      const a = swing > 0 ? (1 - swing / .3) * 2.4 - 1.2 : -1.2;
      g.save(); g.translate(x + (flip ? -18 : 18), GROUND - 100); g.scale(flip ? -1 : 1, 1); g.rotate(a); g.strokeStyle = '#c9a25a'; g.lineWidth = 6; g.beginPath(); g.moveTo(0, 0); g.lineTo(70, 0); g.stroke(); g.fillStyle = '#eee8d8'; g.beginPath(); g.ellipse(80, 0, 16, 10, 0, 0, 7); g.fill(); g.restore();
      g.restore();
      k.text('The Mop War!', 20, 24, { align: 'left', size: 24, font: 'display' });
      k.text('♥'.repeat(Math.max(0, hp)) + '♡'.repeat(Math.max(0, 6 - hp)), 20, 52, { align: 'left', size: 22, color: '#ff8fa0' });
      k.text(`Freed ${prisoners.filter(p => p.freed).length} / 3 · Mopped ${defeated}`, W - 20, 26, { align: 'right', size: 18 });
      k.text('← → move · Space mop · ↑ at the barrels to roll one · hold ↓ by the chained sailors to free them', W / 2, H - 14, { size: 14 });
      pop.draw();
    },
  };
};

window.SOULMATES_GAMES = Object.keys(GAMES);
})();
