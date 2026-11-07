// Ember realm activities: the little games played at places around Celedonia and Byzantine.
// game.js opens a hub with `EmberActivities.open(key, { duck, onClose })` when the party uses a "play" door.
// Each hub lists games; every game is one of a few engines (recipe, design, care, pop, catcher, simon,
// theatre, shell) fed with its own data. Everything is gentle: there is no losing, only doing better.
(() => {
'use strict';
const reduceMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

function h(tag, props = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) n.append(kid);
  return n;
}

// ---- saved things: baked treats, dresses made, animals spotted ----
const STORE = 'ember-activities';
let saved = {};
try { saved = JSON.parse(localStorage.getItem(STORE)) || {}; } catch (_) { saved = {}; }
const store = {
  get: (k, d) => saved[k] ?? d,
  set(k, v) { saved[k] = v; try { localStorage.setItem(STORE, JSON.stringify(saved)); } catch (_) {} },
  push(k, v, max = 12) { store.set(k, [...store.get(k, []), v].slice(-max)); },
};

// ---- sound: small synth notes, so there is nothing extra to download ----
let actx = null;
function tone(freq, dur = .35, type = 'triangle', vol = .16, when = 0) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    const t0 = actx.currentTime + when, o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + .012); g.gain.exponentialRampToValueAtTime(.001, t0 + dur);
    o.connect(g); g.connect(actx.destination); o.start(t0); o.stop(t0 + dur + .05);
  } catch (_) { /* sound is a nicety */ }
}
const piano = (f, when = 0) => { tone(f, 1.1, 'triangle', .2, when); tone(f * 2, .6, 'sine', .05, when); };
const chime = () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, .5, 'sine', .1, i * .08));
const pling = () => tone(1046, .2, 'sine', .1);
const boop = () => tone(196, .2, 'sine', .1);

// ---- the dialog ----
let dlg, body, titleEl, subEl, backBtn, hub = null, current = null, opts = {};
const cleanups = [];
// put new content in the dialog body, skipping anything left out (null)
const fill = (...kids) => body.replaceChildren(...kids.flat().filter(k => k != null && k !== false));
function stop() { cleanups.splice(0).forEach(f => { try { f(); } catch (_) {} }); }
const every = (ms, f) => { const id = setInterval(f, ms); cleanups.push(() => clearInterval(id)); return id; };
const later = (ms, f) => { const id = setTimeout(f, ms); cleanups.push(() => clearTimeout(id)); return id; };
function frames(f) {
  let last = performance.now(), id = 0, live = true;
  const tick = now => { if (!live) return; const dt = Math.min(.05, (now - last) / 1000); last = now; if (f(dt) === false) live = false; else id = requestAnimationFrame(tick); };
  id = requestAnimationFrame(tick);
  const cancel = () => { live = false; cancelAnimationFrame(id); };
  cleanups.push(cancel); return cancel;
}
function listen(target, type, f) { target.addEventListener(type, f); cleanups.push(() => target.removeEventListener(type, f)); }
const duck = on => { try { opts.duck?.(on); } catch (_) {} };

function build() {
  if (dlg) return;
  titleEl = h('h2', { id: 'playTitle' });
  subEl = h('p', { class: 'play-sub' });
  backBtn = h('button', { type: 'button', class: 'play-back', onclick: () => showHub() }, '← All games');
  const close = h('button', { type: 'button', class: 'play-close', 'aria-label': 'Close and go back to exploring', onclick: () => dlg.close() }, '×');
  body = h('div', { class: 'play-body' });
  dlg = h('dialog', { class: 'play', id: 'playDialog', 'aria-labelledby': 'playTitle' },
    h('div', { class: 'play-head' }, backBtn, h('div', { class: 'play-titles' }, titleEl, subEl), close), body);
  dlg.addEventListener('close', () => { stop(); duck(false); hub = null; opts.onClose?.(); });
  document.body.append(dlg);
}
function open(key, o = {}) {
  if (!HUBS[key]) return false;
  build(); stop(); opts = o; hub = HUBS[key];
  if (!dlg.open) dlg.showModal();
  if (hub.games.length === 1) startGame(hub.games[0]); else showHub();
  return true;
}
const isOpen = () => !!(dlg && dlg.open);
function showHub() {
  stop(); duck(false);
  titleEl.textContent = hub.title; subEl.textContent = hub.sub; backBtn.hidden = true;
  fill(h('div', { class: 'play-grid' }, hub.games.map(g =>
    h('button', { type: 'button', class: 'play-card', onclick: () => startGame(g) },
      h('span', { class: 'play-icon', 'aria-hidden': 'true' }, g.icon), h('b', {}, g.name), h('span', {}, g.blurb)))));
  body.querySelector('button').focus();
}
function startGame(g) {
  stop(); duck(!!g.sound);
  current = g;
  titleEl.textContent = g.name; subEl.textContent = g.blurb;
  backBtn.hidden = hub.games.length === 1;
  fill();
  g.run(g);
  body.scrollTop = 0;
}

// ---- shared pieces ----
// who: { name, icon } or { name, img } for a painted portrait
function host(who) {
  const text = h('p', { class: 'say-text', 'aria-live': 'polite' });
  const face = who.img ? h('span', { class: 'say-face img', 'aria-hidden': 'true', style: `background-image:url('${who.img}')` })
    : h('span', { class: 'say-face', 'aria-hidden': 'true' }, who.icon);
  const bar = h('div', { class: 'say' }, face, h('div', {}, h('b', {}, who.name), text));
  return { bar, say(t) { text.textContent = t; text.classList.remove('speak'); void text.offsetWidth; text.classList.add('speak'); } };
}
function finish({ icon, art, title, text, extra }) {
  stop(); duck(false);
  const again = h('button', { type: 'button', class: 'done', onclick: () => startGame(current) }, current.again || 'Play again');
  fill(h('div', { class: 'play-result' },
    art ? h('div', { class: 'result-art', html: art }) : h('div', { class: 'result-icon', 'aria-hidden': 'true' }, icon || '✨'),
    h('h3', {}, title), h('p', {}, text), extra || null,
    h('div', { class: 'result-actions' }, again,
      hub.games.length > 1 ? h('button', { type: 'button', class: 'place', onclick: showHub }, 'Choose another game') : null,
      h('button', { type: 'button', class: 'place', onclick: () => dlg.close() }, 'Back to exploring'))));
  chime(); again.focus();
}
// a "press start" cover, so timed games wait until the player is ready
function ready(scene, label, go) {
  const b = h('button', { type: 'button', class: 'done' }, label);
  const cover = h('div', { class: 'ready' }, b);
  b.addEventListener('click', () => { cover.remove(); go(); });
  scene.append(cover); later(0, () => b.focus());
}
function hud(...items) { return h('div', { class: 'play-hud' }, items); }
function floatText(parent, x, y, text) {
  if (reduceMotion) return;
  const f = h('span', { class: 'float', style: `left:${x}%;top:${y}%` }, text);
  parent.append(f); setTimeout(() => f.remove(), 900);
}

// ================= engines =================

// RECIPE: follow a recipe card with a friendly host. Steps: { add: pantryId } picks an ingredient,
// { do: 'Stir', n } presses a button n times, { time: 'Take it out!' } stops a moving needle in the golden zone.
function recipe(cfg) {
  const hb = host(cfg.host);
  const menu = h('div', { class: 'play-grid' }, cfg.dishes.map(d =>
    h('button', { type: 'button', class: 'play-card', onclick: () => make(d) },
      h('span', { class: 'play-icon', 'aria-hidden': 'true' }, d.icon), h('b', {}, d.name), h('span', {}, d.blurb))));
  fill(hb.bar, menu);
  hb.say(cfg.hello);
  menu.querySelector('button').focus();
  const pantry = Object.fromEntries(cfg.pantry.map(([id, icon, label]) => [id, { id, icon, label }]));

  function make(d) {
    let step = 0, stopStep = null;
    const steps = h('ol', { class: 'recipe-steps' }, d.steps.map(s => h('li', {}, s.text)));
    const bowlIn = h('div', { class: 'bowl-in' });
    const bowl = h('div', { class: 'bowl' }, h('span', { class: 'bowl-icon', 'aria-hidden': 'true' }, d.vessel || cfg.vessel || '🥣'), bowlIn);
    const work = h('div', { class: 'work' });
    fill(hb.bar, h('div', { class: `recipe play-scene scene-${cfg.scene}` },
      h('div', { class: 'recipe-card' }, h('h3', {}, `${d.icon} ${d.name}`), steps), h('div', { class: 'recipe-main' }, bowl, work)));
    next();
    function next() {
      stopStep?.(); stopStep = null;
      [...steps.children].forEach((li, i) => { li.className = i < step ? 'done' : i === step ? 'now' : ''; });
      if (step >= d.steps.length) {
        if (cfg.store) store.push(cfg.store, { name: d.name, icon: d.icon }, 16);
        return finish({ icon: d.icon, title: `${d.name}!`, text: d.done + (cfg.store === 'basket' ? ' It has gone into your picnic basket.' : '') });
      }
      const s = d.steps[step];
      hb.say(s.say || s.text);
      work.replaceChildren();
      if (s.add) addStep(s); else if (s.do) doStep(s); else timeStep(s);
    }
    const advance = () => { step++; later(450, next); };
    function addStep(s) {
      const need = pantry[s.add];
      const grid = h('div', { class: 'pantry', role: 'group', 'aria-label': cfg.pantryLabel || 'The pantry' });
      cfg.pantry.forEach(([id, icon, label]) => {
        const b = h('button', { type: 'button', class: 'ingredient' }, h('span', { 'aria-hidden': 'true' }, icon), label);
        b.addEventListener('click', () => {
          if (id === s.add) {
            pling(); bowlIn.append(h('span', { class: 'in' }, icon));
            grid.querySelectorAll('button').forEach(x => { x.disabled = true; });
            hb.say(pick(cfg.praise));
            advance();
          } else {
            boop(); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake');
            hb.say(`Not the ${label.toLowerCase()} just yet. We need the ${need.label.toLowerCase()}.`);
          }
        });
        grid.append(b);
      });
      work.append(grid);
      grid.querySelector('button').focus();
    }
    function doStep(s) {
      let n = 0;
      const bar = h('div', { class: 'meter big' }, h('i', { style: 'width:0%' }));
      const b = h('button', { type: 'button', class: 'done big-action' }, `${s.icon || '🥄'} ${s.do}`);
      b.addEventListener('click', () => {
        if (n >= s.n) return;
        n++; tone(330 + n * 30, .12, 'sine', .07);
        bar.firstChild.style.width = `${n / s.n * 100}%`;
        bowl.classList.toggle('wobble');
        if (n >= s.n) { b.disabled = true; hb.say(pick(cfg.praise)); advance(); }
      });
      work.append(b, bar, h('p', { class: 'hint' }, 'Click, or press Space or Enter, again and again.'));
      b.focus();
    }
    function timeStep(s) {
      let x = 0, dir = 1;
      const zone = [.58, .8];
      const needle = h('i', { class: 'needle' });
      const gauge = h('div', { class: 'gauge', 'aria-hidden': 'true' },
        h('span', { class: 'zone', style: `left:${zone[0] * 100}%;width:${(zone[1] - zone[0]) * 100}%` }), needle);
      const b = h('button', { type: 'button', class: 'done big-action' }, `${s.icon || '⏲️'} ${s.time}`);
      work.append(h('p', { class: 'hint' }, s.hint || 'Press when the needle is in the golden part.'), gauge, b);
      b.focus();
      stopStep = frames(dt => {
        x += dir * dt * (reduceMotion ? .3 : .55);
        if (x > 1) { x = 1; dir = -1; } if (x < 0) { x = 0; dir = 1; }
        needle.style.left = `${x * 100}%`;
      });
      b.addEventListener('click', () => {
        stopStep(); b.disabled = true;
        const good = x >= zone[0] && x <= zone[1];
        if (good) chime();
        hb.say(good ? s.good : x < zone[0] ? s.early : s.late);
        step++; later(1300, next);
      }, { once: true });
    }
  }
}

// DESIGN: choose from rows of options with a live preview, then finish (and optionally lay things out).
// step: { key, label, options: [{ id, label, icon?, color? }] | () => options, multi?: n, optional? }
function design(cfg) {
  const hb = host(cfg.host);
  const steps = cfg.steps.map(s => ({ ...s, options: typeof s.options === 'function' ? s.options() : s.options }));
  const choice = {};
  const resolve = ids => Object.fromEntries(steps.map(s => [s.key, s.multi ? (ids[s.key] || []).map(id => s.options.find(o => o.id === id)).filter(Boolean) : s.options.find(o => o.id === ids[s.key])]));
  const preview = h('div', { class: 'design-preview', 'aria-live': 'polite' });
  const finishBtn = h('button', { type: 'button', class: 'done', onclick: complete }, cfg.finishLabel || 'All finished!');
  const rows = steps.map(s => {
    const box = h('div', { class: 'opts' });
    s.options.forEach(o => {
      const b = h('button', { type: 'button', class: 'opt', 'aria-pressed': 'false', 'data-id': o.id },
        o.color ? h('span', { class: 'swatch', style: `background:${o.color}`, 'aria-hidden': 'true' }) : null,
        o.icon ? h('span', { class: 'opt-icon', 'aria-hidden': 'true' }, o.icon) : null, o.label);
      b.addEventListener('click', () => choose(s, o));
      box.append(b);
    });
    return h('fieldset', { class: 'opt-row' }, h('legend', {}, s.label, s.multi ? h('small', {}, ` choose up to ${s.multi}`) : null), box);
  });
  fill(hb.bar, h('div', { class: 'design' },
    h('div', { class: `design-stage play-scene scene-${cfg.scene}` }, preview),
    h('div', { class: 'design-opts' }, rows,
      h('div', { class: 'result-actions' }, h('button', { type: 'button', class: 'place', onclick: surprise }, 'Surprise me'), finishBtn))));
  hb.say(cfg.hello);
  update();
  rows[0].querySelector('button').focus();

  function choose(s, o, quiet) {
    if (s.multi) {
      const list = choice[s.key] = choice[s.key] || [];
      const at = list.indexOf(o.id);
      if (at >= 0) list.splice(at, 1); else { list.push(o.id); if (list.length > s.multi) list.shift(); }
    } else choice[s.key] = o.id;
    if (!quiet) { pling(); hb.say(o.say || `${pick(cfg.praise)} ${o.label}.`); }
    update();
  }
  function surprise() {
    steps.forEach(s => {
      if (s.multi) choice[s.key] = shuffle(s.options).slice(0, Math.min(s.multi, s.options.length)).map(o => o.id);
      else choice[s.key] = pick(s.options).id;
    });
    pling(); hb.say(cfg.surprise || 'Oh, what a lovely mix!'); update();
  }
  function update() {
    rows.forEach((row, i) => {
      const s = steps[i], on = s.multi ? choice[s.key] || [] : [choice[s.key]];
      row.querySelectorAll('.opt').forEach(b => b.setAttribute('aria-pressed', String(on.includes(b.dataset.id))));
    });
    preview.innerHTML = cfg.preview(resolve(choice));
    finishBtn.disabled = !steps.every(s => s.optional || (s.multi ? (choice[s.key] || []).length : choice[s.key]));
  }
  function complete() {
    const c = resolve(choice), text = cfg.finale(c);
    if (cfg.store) store.push(cfg.store, JSON.parse(JSON.stringify(choice)), 6);
    if (cfg.arrange) return arrange(cfg, c, text, hb);
    let extra = null;
    if (cfg.store && cfg.gallery) {
      const past = store.get(cfg.store, []).slice(0, -1).slice(-4);
      if (past.length) extra = h('div', { class: 'gallery' }, h('h4', {}, cfg.gallery), h('div', { class: 'gallery-row' }, past.map(ids => h('div', { class: 'tile', html: cfg.preview(resolve(ids)) }))));
    }
    finish({ art: cfg.preview(c), title: cfg.doneTitle(c), text, extra });
  }
}
// lay the chosen things out on a blanket (or a table): pick an item, then a square
function arrange(cfg, c, text, hb) {
  const items = cfg.arrange(c).map((it, i) => ({ ...it, i, at: -1 }));
  let sel = 0;
  const cells = Array.from({ length: 12 }, (_, k) => h('button', { type: 'button', class: 'cell', 'aria-label': `Square ${k + 1}, empty` }));
  const blanket = h('div', { class: 'blanket', style: `--blanket:${cfg.blanketColor(c)}` }, cells);
  const tray = h('div', { class: 'tray', role: 'group', 'aria-label': 'Things to lay out' });
  fill(hb.bar, h('div', { class: `arrange play-scene scene-${cfg.scene}` }, blanket), tray,
    h('p', { class: 'hint' }, 'Choose something from the basket, then a spot on the blanket. Click a placed thing to pick it back up.'));
  hb.say(cfg.arrangeHello);
  const draw = () => {
    tray.replaceChildren(...items.map(it => {
      const b = h('button', { type: 'button', class: 'opt', 'aria-pressed': String(it.i === sel), disabled: it.at >= 0 }, h('span', { class: 'opt-icon', 'aria-hidden': 'true' }, it.icon), it.label);
      b.addEventListener('click', () => { sel = it.i; draw(); cells.find(x => !x.textContent)?.focus(); });
      return b;
    }));
    cells.forEach((cell, k) => {
      const it = items.find(x => x.at === k);
      cell.textContent = it ? it.icon : '';
      cell.setAttribute('aria-label', it ? `Square ${k + 1}: ${it.label}` : `Square ${k + 1}, empty`);
    });
  };
  cells.forEach((cell, k) => cell.addEventListener('click', () => {
    const here = items.find(x => x.at === k);
    if (here) { here.at = -1; sel = here.i; boop(); draw(); return; }
    const it = items[sel];
    if (!it || it.at >= 0) return;
    it.at = k; pling();
    const left = items.filter(x => x.at < 0);
    if (!left.length) {
      draw(); hb.say(cfg.arrangeDone);
      const art = `<div class="blanket done-blanket" style="--blanket:${cfg.blanketColor(c)}">${cells.map(x => `<span class="cell">${x.textContent}</span>`).join('')}</div>`;
      return later(900, () => finish({ art, title: cfg.doneTitle(c), text }));
    }
    sel = left[0].i; hb.say(pick(cfg.praise)); draw();
  }));
  draw();
  tray.querySelector('button:not([disabled])').focus();
}

// CARE: keep every animal fed, watered, brushed and loved. Needs fade slowly; fill them all to finish.
function care(cfg) {
  const hb = host(cfg.host);
  let tool = cfg.tools[0];
  const animals = cfg.animals.map(a => ({ ...a, need: Object.fromEntries(cfg.tools.map(t => [t.id, rand(20, 55)])) }));
  const toolBtns = cfg.tools.map((t, i) => h('button', { type: 'button', class: 'opt tool', 'aria-pressed': String(i === 0), onclick: () => setTool(t) },
    h('span', { class: 'opt-icon', 'aria-hidden': 'true' }, t.icon), t.label, h('kbd', {}, String(i + 1))));
  const pen = h('div', { class: `pen play-scene scene-${cfg.scene}` });
  const cards = animals.map(a => {
    const meters = cfg.tools.map(t => h('div', { class: 'need', title: t.label }, h('span', { 'aria-hidden': 'true' }, t.icon), h('div', { class: 'meter' }, h('i'))));
    const mood = h('span', { class: 'mood', 'aria-hidden': 'true' });
    const card = h('button', { type: 'button', class: 'animal' }, h('span', { class: 'animal-icon', 'aria-hidden': 'true' }, a.icon), h('b', {}, a.name), mood, h('div', { class: 'needs' }, meters));
    card.addEventListener('click', () => tend(a, card));
    a.card = card; a.meters = meters; a.mood = mood;
    return card;
  });
  pen.append(...cards);
  fill(hb.bar, h('div', { class: 'tools', role: 'group', 'aria-label': 'What to use' }, toolBtns), pen,
    h('p', { class: 'hint' }, 'Choose what to use (or press 1–4), then click an animal. Fill every bar to make them all happy.'));
  hb.say(cfg.hello);
  function setTool(t) { tool = t; toolBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(cfg.tools[i] === t))); }
  function tend(a, card) {
    const was = a.need[tool.id];
    a.need[tool.id] = Math.min(100, was + 38);
    if (was > 92) { hb.say(`${a.name} has had plenty of that. Try something else!`); boop(); return; }
    pling(); hb.say(`${a.name} ${pick(tool.react)}`);
    floatText(card, 50, 20, tool.icon);
    paint(); check();
  }
  function paint() {
    animals.forEach(a => {
      cfg.tools.forEach((t, i) => {
        const v = a.need[t.id];
        a.meters[i].querySelector('i').style.width = `${v}%`;
        a.meters[i].classList.toggle('low', v < 35);
      });
      const avg = Object.values(a.need).reduce((x, y) => x + y, 0) / cfg.tools.length;
      a.mood.textContent = avg > 80 ? '💖' : avg > 55 ? '🙂' : '…';
      a.card.setAttribute('aria-label', `${a.name}: ${cfg.tools.map(t => `${t.label} ${Math.round(a.need[t.id])}%`).join(', ')}`);
    });
  }
  function check() {
    if (animals.every(a => cfg.tools.every(t => a.need[t.id] >= 70))) later(600, () => finish({ icon: cfg.doneIcon, title: cfg.doneTitle, text: cfg.doneText }));
  }
  listen(dlg, 'keydown', e => { const n = +e.key; if (n >= 1 && n <= cfg.tools.length) { setTool(cfg.tools[n - 1]); e.preventDefault(); } });
  every(500, () => { animals.forEach(a => cfg.tools.forEach(t => { a.need[t.id] = Math.max(0, a.need[t.id] - rand(.2, .9)); })); paint(); });
  paint();
  toolBtns[0].focus();
}

// POP: things appear around a scene; click them before they slip away.
// item: { icon, label, points?, tool?, hint?, bad?, say?, weight? }
function pop(cfg) {
  const hb = host(cfg.host);
  let score = 0, left = cfg.time, tool = cfg.tools?.[0], running = false;
  const found = new Map();
  const timeEl = h('b'), scoreEl = h('b');
  const field = h('div', { class: `pop-field play-scene scene-${cfg.scene}` });
  const toolBtns = (cfg.tools || []).map((t, i) => h('button', { type: 'button', class: 'opt tool', 'aria-pressed': String(i === 0), onclick: () => setTool(t) },
    h('span', { class: 'opt-icon', 'aria-hidden': 'true' }, t.icon), t.label, h('kbd', {}, String(i + 1))));
  fill(hb.bar, hud(h('span', {}, '⏳ ', timeEl, ' s'), h('span', {}, `${cfg.scoreIcon} `, scoreEl)),
    toolBtns.length ? h('div', { class: 'tools', role: 'group', 'aria-label': 'What to use' }, toolBtns) : null, field,
    h('p', { class: 'hint' }, cfg.hint));
  hb.say(cfg.hello);
  const show = () => { timeEl.textContent = Math.ceil(left); scoreEl.textContent = score; };
  show();
  function setTool(t) { tool = t; toolBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(cfg.tools[i] === t))); }
  if (toolBtns.length) listen(dlg, 'keydown', e => { const n = +e.key; if (n >= 1 && n <= cfg.tools.length) { setTool(cfg.tools[n - 1]); e.preventDefault(); } });
  const weighted = cfg.items.flatMap(it => Array(it.weight || 1).fill(it));
  function spawn() {
    if (!running || field.querySelectorAll('.pop').length >= (cfg.max || 5)) return;
    const it = pick(weighted), x = rand(6, 90), y = rand(14, 82);
    const b = h('button', { type: 'button', class: 'pop', style: `left:${x}%;top:${y}%`, 'aria-label': it.label }, it.icon);
    const gone = setTimeout(() => { b.classList.add('away'); setTimeout(() => b.remove(), 300); }, rand(cfg.life * .7, cfg.life * 1.3) * 1000);
    cleanups.push(() => clearTimeout(gone));
    b.addEventListener('click', () => {
      if (!running) return;
      if (it.tool && tool?.id !== it.tool) { boop(); hb.say(it.hint); return; }
      clearTimeout(gone); b.disabled = true; b.classList.add('got');
      setTimeout(() => b.remove(), 260);
      if (it.bad) { boop(); score = Math.max(0, score - 1); hb.say(it.say); floatText(field, x, y, '−1'); show(); return; }
      const pts = it.points || 1;
      score += pts; pling(); floatText(field, x, y, `+${pts}`);
      if (!found.has(it.label)) { found.set(it.label, it.icon); if (it.say) hb.say(it.say); }
      show();
    });
    field.append(b);
  }
  ready(field, cfg.start || 'Start', () => {
    running = true; spawn();
    every((cfg.every || .8) * 1000, spawn);
    every(100, () => {
      left = Math.max(0, left - .1); show();
      if (left <= 0) {
        running = false;
        let extra = null;
        if (cfg.journal) {
          const seen = new Set([...store.get(cfg.journal, []), ...found.keys()]);
          store.set(cfg.journal, [...seen]);
          const all = cfg.items.filter(it => !it.bad && !it.tool);
          extra = h('div', { class: 'gallery' }, h('h4', {}, cfg.journalTitle),
            h('ul', { class: 'journal' }, all.map(it => h('li', { class: seen.has(it.label) ? 'seen' : '' }, h('span', { 'aria-hidden': 'true' }, seen.has(it.label) ? it.icon : '?'), seen.has(it.label) ? it.label : 'not spotted yet'))));
        }
        finish({ icon: cfg.doneIcon, title: cfg.doneTitle(score), text: cfg.doneText(score, found), extra });
      }
    });
  });
}

// CATCHER: move along the bottom to gather the good things drifting down (boat on the lake, basket at the fair).
function catcher(cfg) {
  const hb = host(cfg.host);
  const canvas = h('canvas', { class: 'play-canvas', width: 960, height: 540, 'aria-label': cfg.aria });
  const g = canvas.getContext('2d');
  const timeEl = h('b'), scoreEl = h('b');
  const tl = h('button', { type: 'button', class: 'tbtn', 'aria-label': 'Move left' }, '◀');
  const tr = h('button', { type: 'button', class: 'tbtn', 'aria-label': 'Move right' }, '▶');
  const scene = h('div', { class: 'catch-scene play-scene' }, canvas, h('div', { class: 'catch-touch' }, tl, tr));
  fill(hb.bar, hud(h('span', {}, '⏳ ', timeEl, ' s'), h('span', {}, `${cfg.scoreIcon} `, scoreEl)), scene,
    h('p', { class: 'hint' }, cfg.hint));
  hb.say(cfg.hello);
  let px = 480, target = null, score = 0, left = cfg.time, scroll = 0, spawnT = 0, items = [], floats = [], shake = 0, running = false;
  const key = { l: false, r: false };
  const show = () => { timeEl.textContent = Math.ceil(left); scoreEl.textContent = score; };
  listen(dlg, 'keydown', e => {
    if (['ArrowLeft', 'a', 'A'].includes(e.key)) { key.l = true; target = null; e.preventDefault(); }
    if (['ArrowRight', 'd', 'D'].includes(e.key)) { key.r = true; target = null; e.preventDefault(); }
  });
  listen(dlg, 'keyup', e => {
    if (['ArrowLeft', 'a', 'A'].includes(e.key)) key.l = false;
    if (['ArrowRight', 'd', 'D'].includes(e.key)) key.r = false;
  });
  const aim = e => { const r = canvas.getBoundingClientRect(); if (r.width) target = (e.clientX - r.left) / r.width * 960; };
  canvas.addEventListener('pointerdown', aim);
  canvas.addEventListener('pointermove', e => { if (e.buttons || e.pointerType === 'mouse') aim(e); });
  [[tl, 'l'], [tr, 'r']].forEach(([b, k]) => {
    b.addEventListener('pointerdown', e => { e.preventDefault(); key[k] = true; target = null; });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, () => { key[k] = false; }));
  });
  const weighted = cfg.items.flatMap(it => Array(it.weight || 1).fill(it));
  function draw() {
    cfg.backdrop(g, scroll);
    items.forEach(it => { g.font = `${it.size}px ${EMOJI_FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(it.icon, it.x, it.y); });
    const sx = shake > 0 ? Math.sin(shake * 60) * 6 : 0;
    g.font = `76px ${EMOJI_FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.save(); g.translate(px + sx, 470); if (cfg.flip) g.scale(-1, 1); g.fillText(cfg.player, 0, 0); g.restore();
    floats.forEach(f => {
      g.globalAlpha = Math.max(0, 1 - f.age); g.font = '700 26px "Alegreya Sans",sans-serif'; g.fillStyle = f.good ? '#fff6df' : '#ffd0c8';
      g.strokeStyle = 'rgba(40,30,20,.7)'; g.lineWidth = 4; g.strokeText(f.text, f.x, f.y); g.fillText(f.text, f.x, f.y); g.globalAlpha = 1;
    });
  }
  show(); draw();
  ready(scene, cfg.start || 'Start', () => {
    running = true;
    frames(dt => {
      if (!running) return false;
      scroll += dt * cfg.speed; left = Math.max(0, left - dt); shake = Math.max(0, shake - dt);
      const mv = (key.r ? 1 : 0) - (key.l ? 1 : 0);
      if (mv) px += mv * 560 * dt;
      else if (target != null) px += clamp(target - px, -620 * dt, 620 * dt);
      px = clamp(px, 70, 890);
      spawnT -= dt;
      if (spawnT <= 0) { spawnT = rand(.45, .8) * cfg.rate; const it = pick(weighted); items.push({ ...it, x: rand(80, 880), y: -30, vy: cfg.speed * rand(.85, 1.25), size: it.size || 46, wob: rand(0, 6) }); }
      items.forEach(it => {
        it.y += it.vy * dt; it.x += Math.sin(scroll / 40 + it.wob) * 20 * dt;
        if (!it.done && it.y > 430 && it.y < 500 && Math.abs(it.x - px) < 56) {
          it.done = true;
          if (it.bad) { score = Math.max(0, score - 2); shake = .35; boop(); floats.push({ x: it.x, y: 410, text: '−2', age: 0 }); if (it.say) hb.say(it.say); }
          else { score += it.points || 1; pling(); floats.push({ x: it.x, y: 410, text: `+${it.points || 1}`, age: 0, good: true }); if (it.say && Math.random() < .5) hb.say(it.say); }
        }
      });
      items = items.filter(it => !it.done && it.y < 580);
      floats.forEach(f => { f.age += dt * 1.2; f.y -= 40 * dt; }); floats = floats.filter(f => f.age < 1);
      show(); draw();
      if (left <= 0) { running = false; later(300, () => finish({ icon: cfg.doneIcon, title: cfg.doneTitle(score), text: cfg.doneText(score) })); return false; }
    });
  });
}
const sky = (g, top, bottom) => { const gr = g.createLinearGradient(0, 0, 0, 540); gr.addColorStop(0, top); gr.addColorStop(1, bottom); g.fillStyle = gr; g.fillRect(0, 0, 960, 540); };
const BACKDROPS = {
  lake(g, s) {
    sky(g, '#5fa6c9', '#2f6f99');
    g.fillStyle = '#6f9a5a'; g.fillRect(0, 0, 60, 540); g.fillRect(900, 0, 60, 540);
    g.fillStyle = '#88b56c';
    for (let y = -60; y < 600; y += 60) { const yy = (y + s) % 600 - 30; g.beginPath(); g.ellipse(60, yy, 26, 34, 0, 0, 7); g.ellipse(900, yy + 30, 26, 34, 0, 0, 7); g.fill(); }
    g.strokeStyle = 'rgba(255,255,255,.28)'; g.lineWidth = 2;
    for (let i = 0; i < 14; i++) { const y = (i * 47 + s * .9) % 560 - 10, x = 120 + (i * 173) % 700; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 20, y - 6, x + 40, y); g.quadraticCurveTo(x + 60, y + 6, x + 80, y); g.stroke(); }
  },
  fair(g, s) {
    sky(g, '#f7d9b4', '#d8c3e6');
    g.fillStyle = '#8f78b8'; g.fillRect(0, 500, 960, 40);
    for (let x = 0; x < 960; x += 16) { g.fillStyle = x % 32 ? '#a58bd0' : '#7d64a8'; g.fillRect(x, 494 + Math.sin(x + s / 30) * 3, 6, 18); }
    ['#e57f9c', '#f2c14e', '#8fc7e8', '#9ccf8f'].forEach((c, k) => {
      g.fillStyle = c;
      for (let x = k * 30; x < 960; x += 120) { g.beginPath(); g.moveTo(x, 26 + Math.sin(x / 120) * 10); g.lineTo(x + 24, 26 + Math.sin(x / 120) * 10); g.lineTo(x + 12, 56); g.fill(); }
    });
    g.strokeStyle = '#7a5b3a'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 26); for (let x = 0; x <= 960; x += 40) g.lineTo(x, 26 + Math.sin(x / 120) * 10); g.stroke();
  },
  path(g, s) {
    sky(g, '#9fd0e8', '#b9d98f');
    g.fillStyle = '#a58bd0';
    for (let i = 0; i < 40; i++) { const y = (i * 37 + s) % 600 - 30, x = i % 2 ? 40 + (i * 53) % 160 : 760 + (i * 41) % 170; g.beginPath(); g.ellipse(x, y, 10, 22, 0, 0, 7); g.fill(); }
    g.fillStyle = '#d9c39a'; g.beginPath(); g.moveTo(260, 0); g.lineTo(700, 0); g.lineTo(780, 540); g.lineTo(180, 540); g.fill();
    g.strokeStyle = 'rgba(120,90,50,.25)'; g.lineWidth = 3;
    for (let i = 0; i < 12; i++) { const y = (i * 50 + s) % 600 - 30; g.beginPath(); g.moveTo(420, y); g.lineTo(440, y + 14); g.stroke(); g.beginPath(); g.moveTo(540, y + 20); g.lineTo(520, y + 34); g.stroke(); }
  },
};

// SIMON: watch and repeat. Pads are piano keys or dance steps; a performer can also play a whole melody to listen to.
function simon(cfg) {
  const hb = host(cfg.host);
  let busy = false, seq = [], at = 0, round = 0, tries = 0, playing = false;
  const sound = i => cfg.voice === 'piano' ? piano(cfg.pads[i].freq) : (tone(cfg.pads[i].freq, .35, 'triangle', .16), tone(cfg.pads[i].freq / 2, .15, 'sine', .14));
  const pads = cfg.pads.map((p, i) => h('button', { type: 'button', class: `pad ${cfg.padClass}`, 'aria-label': p.name || p.label, onclick: () => press(i) },
    h('span', { 'aria-hidden': 'true' }, p.label), p.key ? h('kbd', {}, p.keyLabel || p.key.toUpperCase()) : null));
  const performer = h('div', { class: 'performer' }, cfg.performer ? h('span', { class: 'performer-img', style: cfg.performer.style, 'aria-hidden': 'true' }) : null);
  const roundEl = h('b', {}, '–');
  const listenBtn = cfg.melody ? h('button', { type: 'button', class: 'place', onclick: performance }, cfg.listenLabel) : null;
  const playBtn = h('button', { type: 'button', class: 'done', onclick: begin }, cfg.playLabel);
  fill(hb.bar, hud(h('span', {}, `${cfg.roundIcon} Round `, roundEl, ` of ${cfg.rounds}`)),
    h('div', { class: `simon play-scene scene-${cfg.scene}` }, performer, h('div', { class: `pads ${cfg.padClass}s` }, pads)),
    h('div', { class: 'result-actions' }, listenBtn, playBtn), h('p', { class: 'hint' }, cfg.hint));
  hb.say(cfg.hello);
  (listenBtn || playBtn).focus();
  const light = (i, ms = 320) => { pads[i].classList.add('lit'); sound(i); setTimeout(() => pads[i].classList.remove('lit'), ms); };
  listen(dlg, 'keydown', e => {
    if (e.repeat) return;
    const i = cfg.pads.findIndex(p => p.key === e.key || p.key === e.key.toLowerCase());
    if (i >= 0) { e.preventDefault(); press(i); }
  });
  function performance() {
    if (busy) return;
    busy = playing = true; performer.classList.add('playing'); hb.say(cfg.listenSay);
    let t = 0;
    cfg.melody.forEach(([i, beats]) => { later(t, () => light(i, Math.min(500, beats * cfg.beat - 40))); t += beats * cfg.beat; });
    later(t + 300, () => { busy = playing = false; performer.classList.remove('playing'); hb.say(cfg.afterListen); playBtn.focus(); });
  }
  function begin() { if (busy) return; round = 0; seq = []; for (let k = 0; k < 2; k++) seq.push(Math.floor(Math.random() * cfg.pads.length)); nextRound(); }
  function nextRound() {
    round++; roundEl.textContent = round;
    seq.push(Math.floor(Math.random() * cfg.pads.length)); tries = 0;
    demo();
  }
  function demo() {
    busy = true; at = 0; performer.classList.add('playing');
    hb.say(round === 1 && !tries ? cfg.watchSay : pick(cfg.watchMore));
    seq.forEach((i, k) => later(700 + k * cfg.gap, () => light(i)));
    later(700 + seq.length * cfg.gap, () => { busy = false; performer.classList.remove('playing'); hb.say(cfg.yourTurn); });
  }
  function press(i) {
    if (busy) return;
    light(i, 220);
    if (!seq.length || playing) return;
    if (i === seq[at]) {
      at++;
      if (at === seq.length) {
        busy = true;
        if (round >= cfg.rounds) later(700, () => finish({ icon: cfg.doneIcon, title: cfg.doneTitle, text: cfg.doneText }));
        else { hb.say(pick(cfg.praise)); later(1100, nextRound); }
      }
    } else {
      tries++; busy = true; hb.say(tries > 2 ? cfg.easier : cfg.oops);
      if (tries > 2 && seq.length > 3) seq.pop();
      later(1200, demo);
    }
  }
}

// THEATRE: a village play. Choose your line in each scene; the prompter whispers if you forget.
function theatre(cfg) {
  const hb = host(cfg.host);
  fill(hb.bar, h('div', { class: 'play-grid' }, cfg.plays.map(p =>
    h('button', { type: 'button', class: 'play-card', onclick: () => perform(p) }, h('span', { class: 'play-icon', 'aria-hidden': 'true' }, p.icon), h('b', {}, p.title), h('span', {}, `You play ${p.role}.`)))));
  hb.say(cfg.hello);
  body.querySelector('.play-card').focus();
  function perform(p) {
    let scene = 0, cheers = 0;
    const story = h('p', { class: 'story-line', 'aria-live': 'polite' });
    const lines = h('div', { class: 'lines' });
    const cheer = h('b', {}, '0');
    fill(hb.bar, hud(h('span', {}, '🌹 Roses from the audience: ', cheer)),
      h('div', { class: 'theatre play-scene scene-stage' }, h('span', { class: 'curtain l', 'aria-hidden': 'true' }), h('span', { class: 'curtain r', 'aria-hidden': 'true' }), h('div', { class: 'boards' }, h('h3', {}, p.title), story)), lines);
    hb.say(`Places, everyone! You are ${p.role}.`);
    show();
    function show() {
      if (scene >= p.scenes.length) {
        return finish({ icon: '🎭', title: 'Curtain call!', text: `${p.ending} The audience throws ${cheers} ${cheers === 1 ? 'rose' : 'roses'} onto the stage${cheers >= p.scenes.length ? ' and calls for an encore!' : '.'}` });
      }
      const s = p.scenes[scene];
      story.textContent = s.cue;
      lines.replaceChildren(...shuffle(s.lines.map((l, k) => ({ l, k }))).map(({ l, k }) => {
        const b = h('button', { type: 'button', class: 'opt line' }, `“${l}”`);
        b.addEventListener('click', () => {
          lines.querySelectorAll('button').forEach(x => { x.disabled = true; });
          if (k === 0) { cheers++; cheer.textContent = cheers; chime(); b.classList.add('right'); hb.say(pick(cfg.praise)); }
          else { boop(); hb.say(`The prompter whispers: “${s.lines[0]}” You say it beautifully.`); [...lines.children].find(x => x.textContent === `“${s.lines[0]}”`)?.classList.add('right'); }
          scene++; later(1700, show);
        });
        return b;
      }));
      lines.querySelector('button').focus();
    }
  }
}

// SHELL: an animal hides under one pile; watch the piles swap, then find it.
function shell(cfg) {
  const hb = host(cfg.host);
  let round = 0, found = 0, n = 3, slots = [], hidden = 0, busy = true;
  const field = h('div', { class: `shell-field play-scene scene-${cfg.scene}` });
  const roundEl = h('b', {}, '0'), foundEl = h('b', {}, '0');
  fill(hb.bar, hud(h('span', {}, 'Round ', roundEl, ` of ${cfg.rounds}`), h('span', {}, `${cfg.animal} found: `, foundEl)), field, h('p', { class: 'hint' }, cfg.hint));
  hb.say(cfg.hello);
  let piles = [];
  function setup() {
    round++; roundEl.textContent = round; busy = true;
    n = round > 2 ? 4 : 3;
    slots = Array.from({ length: n }, (_, i) => i);
    hidden = Math.floor(Math.random() * n);
    field.replaceChildren();
    piles = slots.map(i => {
      const b = h('button', { type: 'button', class: 'pile', 'aria-label': `${cfg.pileName} ${i + 1}` }, h('span', { class: 'cover', 'aria-hidden': 'true' }, cfg.pile), h('span', { class: 'peek', 'aria-hidden': 'true' }, i === hidden ? cfg.animal : ''));
      b.addEventListener('click', () => guess(i));
      field.append(b); return b;
    });
    place();
    piles[hidden].classList.add('show');
    hb.say(cfg.peekSay);
    later(1400, () => { piles[hidden].classList.remove('show'); later(500, swaps); });
  }
  function place() { piles.forEach((b, i) => { b.style.left = `${(slots[i] + .5) / n * 100}%`; b.setAttribute('aria-label', `${cfg.pileName} ${slots[i] + 1}`); }); }
  function swaps() {
    const count = 3 + round * 2, gap = Math.max(260, 620 - round * 70);
    field.style.setProperty('--swap', `${gap * .85}ms`);
    for (let k = 0; k < count; k++) later(k * gap, () => {
      const a = Math.floor(Math.random() * n); let b = Math.floor(Math.random() * (n - 1)); if (b >= a) b++;
      const sa = slots.indexOf(a), sb = slots.indexOf(b);
      [slots[sa], slots[sb]] = [slots[sb], slots[sa]]; place(); tone(500 + k * 20, .08, 'sine', .05);
    });
    later(count * gap + 200, () => {
      busy = false; hb.say(cfg.askSay);
      // keep keyboard order matching what's on screen, left to right
      field.append(...[...piles].sort((x, y) => slots[piles.indexOf(x)] - slots[piles.indexOf(y)]));
      field.querySelector('.pile').focus();
    });
  }
  function guess(i) {
    if (busy) return;
    busy = true;
    const clicked = piles[i], right = i === hidden;
    piles[hidden].classList.add('show');
    if (right) { found++; foundEl.textContent = found; chime(); hb.say(pick(cfg.praise)); }
    else { boop(); clicked.classList.add('empty'); hb.say(cfg.missSay); }
    later(1500, () => round >= cfg.rounds ? finish({ icon: cfg.animal, title: `You found ${cfg.animalName} ${found} ${found === 1 ? 'time' : 'times'}!`, text: cfg.doneText(found) }) : setup());
  }
  ready(field, 'Start', setup);
}

// ================= pictures for the design games =================
const svg = (vb, inner) => `<svg viewBox="${vb}" role="img" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
const shadeDefs = id => `<defs><linearGradient id="${id}" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".18"/><stop offset=".45" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient></defs>`;
function patternDefs(id, kind, color) {
  if (kind === 'dots') return `<pattern id="${id}" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="${color}"/><circle cx="7" cy="7" r="2.2" fill="#fff" opacity=".55"/></pattern>`;
  if (kind === 'stripes') return `<pattern id="${id}" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="${color}"/><rect width="4" height="12" fill="#fff" opacity=".3"/></pattern>`;
  if (kind === 'floral') return `<pattern id="${id}" width="26" height="26" patternUnits="userSpaceOnUse"><rect width="26" height="26" fill="${color}"/><g fill="#fff" opacity=".5"><circle cx="8" cy="8" r="2.5"/><circle cx="5" cy="8" r="1.6"/><circle cx="11" cy="8" r="1.6"/><circle cx="8" cy="5" r="1.6"/><circle cx="8" cy="11" r="1.6"/></g><circle cx="20" cy="20" r="1.8" fill="#fff" opacity=".45"/></pattern>`;
  return `<pattern id="${id}" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="${color}"/></pattern>`;
}
function dressArt(c) {
  const col = c.color?.color || '#e9e1d3', trim = c.trim?.id, skirt = c.skirt?.id || 'ballgown', sleeves = c.sleeves?.id, fab = c.fabric?.id || 'plain';
  const skirts = {
    ballgown: 'M86 118 C70 150 40 196 26 244 Q100 262 174 244 C160 196 130 150 114 118 Z',
    aline: 'M86 118 C78 160 62 206 54 244 Q100 256 146 244 C138 206 122 160 114 118 Z',
    mermaid: 'M86 118 C84 160 88 190 84 206 C70 222 56 236 48 248 Q100 260 152 248 C144 236 130 222 116 206 C112 190 116 160 114 118 Z',
    tiered: 'M86 118 C76 140 62 160 56 172 Q100 182 144 172 C138 160 124 140 114 118 Z M58 168 C50 190 40 214 34 236 Q100 254 166 236 C160 214 150 190 142 168 Q100 180 58 168 Z',
  };
  const sl = {
    puff: '<ellipse cx="74" cy="66" rx="13" ry="11" fill="url(#fab)"/><ellipse cx="126" cy="66" rx="13" ry="11" fill="url(#fab)"/><ellipse cx="74" cy="66" rx="13" ry="11" fill="url(#sh)"/><ellipse cx="126" cy="66" rx="13" ry="11" fill="url(#sh)"/>',
    long: '<path d="M78 60 L60 70 L50 140 L60 142 L74 84 Z M122 60 L140 70 L150 140 L140 142 L126 84 Z" fill="url(#fab)"/><path d="M78 60 L60 70 L50 140 L60 142 L74 84 Z M122 60 L140 70 L150 140 L140 142 L126 84 Z" fill="url(#sh)"/>',
    cape: '<path d="M78 58 Q60 64 52 120 Q100 108 148 120 Q140 64 122 58 Z" fill="url(#fab)" opacity=".75"/>',
    straps: '<path d="M82 60 L86 46 M118 60 L114 46" stroke="#cdbfa8" stroke-width="3"/>',
  };
  let deco = '';
  if (trim === 'lace') deco = Array.from({ length: 15 }, (_, i) => `<circle cx="${30 + i * 10}" cy="${246 - Math.abs(7 - i) * .3}" r="5" fill="#fffaf0" opacity=".9"/>`).join('');
  if (trim === 'sash') deco = `<rect x="84" y="110" width="32" height="10" rx="3" fill="#fff6df"/><path d="M100 115 L84 106 L84 126 Z M100 115 L116 106 L116 126 Z" fill="#fff6df"/><path d="M98 120 L90 150 L96 150 L100 124 L104 150 L110 150 L102 120 Z" fill="#fff6df"/>`;
  if (trim === 'sparkle') deco = [[60, 200], [140, 210], [100, 170], [80, 230], [124, 160], [70, 160], [130, 236], [100, 220], [92, 90], [110, 74]].map(([x, y]) => `<path d="M${x} ${y - 5} Q${x} ${y} ${x + 5} ${y} Q${x} ${y} ${x} ${y + 5} Q${x} ${y} ${x - 5} ${y} Q${x} ${y} ${x} ${y - 5}Z" fill="#fff8d8"/>`).join('');
  if (trim === 'roses') deco = [[82, 62], [100, 60], [118, 62], [44, 236], [72, 246], [100, 250], [128, 246], [156, 236]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6" fill="#f2a5b8"/><circle cx="${x}" cy="${y}" r="2.5" fill="#d9718d"/>`).join('');
  return svg('0 0 200 270', `<defs>${patternDefs('fab', fab, col)}</defs>${shadeDefs('sh')}
    <rect x="96" y="20" width="8" height="34" fill="#b9a383"/><ellipse cx="100" cy="20" rx="12" ry="8" fill="#cdbb98"/>
    ${sl[sleeves] && sleeves === 'cape' ? sl.cape : ''}
    <path d="${skirts[skirt] || skirts.ballgown}" fill="url(#fab)"/><path d="${skirts[skirt] || skirts.ballgown}" fill="url(#sh)"/>
    <path d="M78 58 Q100 66 122 58 L116 118 Q100 124 84 118 Z" fill="url(#fab)"/><path d="M78 58 Q100 66 122 58 L116 118 Q100 124 84 118 Z" fill="url(#sh)"/>
    ${sleeves !== 'cape' && sl[sleeves] ? sl[sleeves] : ''}${deco}`);
}
function hatArt(c) {
  const col = c.color?.color || '#c9b28f', rib = c.ribbon?.color || '#d9718d', style = c.style?.id || 'bonnet', deco = c.deco?.id;
  const shapes = {
    bonnet: `<path d="M40 130 Q40 50 110 46 Q170 50 168 120 Q150 92 104 92 Q62 94 40 130 Z" fill="${col}"/><path d="M60 118 Q100 100 150 112" stroke="${rib}" stroke-width="10" fill="none"/><path d="M60 122 Q50 160 40 190 M68 124 Q72 160 70 194" stroke="${rib}" stroke-width="6" fill="none"/>`,
    brim: `<ellipse cx="100" cy="130" rx="92" ry="26" fill="${col}"/><path d="M58 128 Q60 70 100 66 Q140 70 142 128 Z" fill="${col}"/><path d="M58 112 Q100 122 142 112 L142 126 Q100 136 58 126 Z" fill="${rib}"/>`,
    tophat: `<ellipse cx="100" cy="150" rx="70" ry="16" fill="${col}"/><rect x="62" y="56" width="76" height="94" rx="6" fill="${col}"/><ellipse cx="100" cy="56" rx="38" ry="9" fill="${col}"/><rect x="62" y="122" width="76" height="16" fill="${rib}"/>`,
    beret: `<ellipse cx="100" cy="104" rx="80" ry="40" fill="${col}"/><path d="M40 118 Q100 150 160 118 L160 128 Q100 160 40 128 Z" fill="${rib}"/><circle cx="100" cy="64" r="6" fill="${col}"/>`,
  };
  const decos = {
    feather: '<path d="M150 110 Q190 40 160 10 Q150 60 140 108 Z" fill="#fff6df" stroke="#d6c7a8"/><path d="M146 106 Q160 60 160 14" stroke="#cdbb98" fill="none"/>',
    flowers: '<g><circle cx="140" cy="112" r="9" fill="#f2a5b8"/><circle cx="140" cy="112" r="3.5" fill="#f2c14e"/><circle cx="156" cy="104" r="8" fill="#c9a7e8"/><circle cx="156" cy="104" r="3" fill="#f2c14e"/><circle cx="126" cy="106" r="7" fill="#fffaf0"/><circle cx="126" cy="106" r="3" fill="#f2c14e"/></g>',
    bow: `<path d="M100 120 L76 104 L76 136 Z M100 120 L124 104 L124 136 Z" fill="${rib}" stroke="rgba(0,0,0,.15)"/><circle cx="100" cy="120" r="6" fill="${rib}"/>`,
    pearls: Array.from({ length: 9 }, (_, i) => `<circle cx="${64 + i * 9}" cy="${118 + Math.sin(i / 8 * Math.PI) * 6}" r="3.6" fill="#fffaf0" stroke="#d6c7a8" stroke-width=".6"/>`).join(''),
  };
  return svg('0 0 200 200', `${shapes[style]}${decos[deco] || ''}<path d="M30 180 Q100 190 170 180" stroke="rgba(0,0,0,.08)" stroke-width="6" fill="none"/>`);
}
function shoeArt(c) {
  const col = c.color?.color || '#c99a7a', style = c.style?.id || 'slipper', deco = c.deco?.id;
  const shapes = {
    slipper: `<path d="M24 140 Q20 118 44 114 Q90 112 130 104 Q170 100 178 124 Q182 146 150 148 L40 150 Q24 150 24 140 Z" fill="${col}"/><path d="M70 116 Q110 100 140 110" stroke="rgba(0,0,0,.2)" stroke-width="3" fill="none"/>`,
    heel: `<path d="M30 112 Q60 74 92 110 Q120 128 160 122 Q182 120 180 138 Q176 150 150 150 L80 150 Q60 128 44 134 L40 172 L32 172 Z" fill="${col}"/><rect x="30" y="134" width="12" height="38" rx="3" fill="${col}"/>`,
    boot: `<path d="M44 40 L96 40 L100 108 Q140 108 168 120 Q184 128 180 144 Q176 152 156 152 L44 152 Z" fill="${col}"/><path d="M50 52 L92 52 M50 66 L92 66 M50 80 L92 80" stroke="rgba(255,255,255,.4)" stroke-width="3"/><rect x="44" y="140" width="136" height="12" rx="4" fill="rgba(0,0,0,.25)"/>`,
    mary: `<path d="M24 140 Q20 118 44 114 Q90 112 130 104 Q170 100 178 124 Q182 146 150 148 L40 150 Q24 150 24 140 Z" fill="${col}"/><path d="M66 112 L98 96" stroke="${col}" stroke-width="8"/><circle cx="98" cy="96" r="4" fill="#f2c14e"/>`,
  };
  const decos = {
    bow: '<path d="M140 112 L124 102 L124 122 Z M140 112 L156 102 L156 122 Z" fill="#fff6df"/><circle cx="140" cy="112" r="4" fill="#fff6df"/>',
    buckle: '<rect x="128" y="104" width="22" height="16" rx="3" fill="none" stroke="#f2c14e" stroke-width="4"/>',
    gem: '<path d="M140 100 L150 110 L140 122 L130 110 Z" fill="#8fd3f0" stroke="#fff" stroke-width="1.5"/>',
    flower: '<g><circle cx="140" cy="110" r="5" fill="#fff6df"/><circle cx="132" cy="110" r="5" fill="#f2a5b8"/><circle cx="148" cy="110" r="5" fill="#f2a5b8"/><circle cx="140" cy="102" r="5" fill="#f2a5b8"/><circle cx="140" cy="118" r="5" fill="#f2a5b8"/><circle cx="140" cy="110" r="3" fill="#f2c14e"/></g>',
  };
  return svg('0 0 200 200', `${shapes[style]}${decos[deco] || ''}<ellipse cx="102" cy="176" rx="80" ry="7" fill="rgba(0,0,0,.12)"/>`);
}
function giftArt(c) {
  const paper = c.paper?.color || '#e8d5b0', rib = c.ribbon?.color || '#d9718d';
  return svg('0 0 220 200', `<rect x="40" y="96" width="120" height="84" rx="6" fill="${paper}"/><rect x="34" y="80" width="132" height="22" rx="5" fill="${paper}"/><rect x="34" y="80" width="132" height="22" rx="5" fill="rgba(0,0,0,.08)"/>
    <rect x="92" y="80" width="16" height="100" fill="${rib}"/><path d="M100 80 Q70 50 80 70 Q86 84 100 80 Q130 50 120 70 Q114 84 100 80" fill="${rib}"/>
    <text x="170" y="74" font-size="56" text-anchor="middle" dominant-baseline="middle">${c.toy?.icon || ''}</text>
    ${c.who ? `<rect x="140" y="140" width="72" height="26" rx="4" fill="#fffaf0" stroke="#cdbb98"/><text x="176" y="157" font-size="11" text-anchor="middle" fill="#3a2a1a" font-family="Alegreya Sans, sans-serif">For ${c.who.label}</text>` : ''}`);
}
function bookTitle(c) {
  if (!c.mood || !c.setting) return 'A New Story';
  const first = { adventure: 'The Voyage', mystery: 'The Secret', romance: 'The Promise', cosy: 'A Winter' }[c.mood.id];
  const place = { sea: 'the Silver Sea', castle: 'the Glass Castle', forest: 'the Whispering Wood', stars: 'the Falling Stars' }[c.setting.id];
  return c.mood.id === 'cosy' ? `${first} in ${place}` : `${first} of ${place}`;
}
function bookArt(c) {
  const col = c.cover?.color || '#6b5236', words = bookTitle(c).split(' ');
  const lines = []; let cur = '';
  words.forEach(w => { if ((cur + ' ' + w).trim().length > 13) { lines.push(cur.trim()); cur = w; } else cur += ' ' + w; }); lines.push(cur.trim());
  return svg('0 0 170 220', `<rect x="20" y="10" width="130" height="196" rx="6" fill="${col}"/><rect x="20" y="10" width="14" height="196" fill="rgba(0,0,0,.2)"/>
    <rect x="42" y="24" width="96" height="168" rx="3" fill="none" stroke="#f2c14e" stroke-width="2"/>
    ${lines.map((l, i) => `<text x="90" y="${74 + i * 22}" font-size="16" text-anchor="middle" fill="#fff6df" font-family="IM Fell English SC, Georgia, serif">${l}</text>`).join('')}
    <text x="90" y="166" font-size="30" text-anchor="middle" dominant-baseline="middle">${c.hero?.icon || ''}</text>`);
}
// an emoji scene: rows of chosen things over a coloured stage
function emojiScene(c, rows, label) {
  return `<div class="emoji-scene">${label ? `<p class="scene-label">${label}</p>` : ''}${rows.map(r => {
    const list = (Array.isArray(r) ? r : [r]).filter(Boolean);
    return `<div class="emoji-row">${list.map(o => `<span title="${o.label}">${o.icon}</span>`).join('')}</div>`;
  }).join('')}</div>`;
}
function crownArt(c) {
  const flowers = c.flowers?.length ? c.flowers : [];
  const rib = c.ribbon?.color || '#c9a7e8';
  const n = 12, pts = Array.from({ length: n }, (_, i) => { const a = Math.PI + i / (n - 1) * Math.PI; return [100 + Math.cos(a) * 70, 100 + Math.sin(a) * 34]; });
  return svg('0 0 200 200', `<ellipse cx="100" cy="100" rx="70" ry="34" fill="none" stroke="#6f8f4e" stroke-width="5"/>
    <path d="M40 112 Q30 160 44 190 M50 114 Q56 156 52 194" stroke="${rib}" stroke-width="7" fill="none" stroke-linecap="round"/>
    ${flowers.length ? pts.map(([x, y], i) => `<text x="${x}" y="${y}" font-size="24" text-anchor="middle" dominant-baseline="middle">${flowers[i % flowers.length].icon}</text>`).join('') : ''}
    ${flowers.length ? Array.from({ length: 7 }, (_, i) => { const a = i / 6 * Math.PI; return `<text x="${100 + Math.cos(a) * 70}" y="${100 + Math.sin(a) * 34}" font-size="18" text-anchor="middle" dominant-baseline="middle" opacity=".8">${flowers[(i + 1) % flowers.length].icon}</text>`; }).join('') : ''}`);
}
function bouquetArt(c) {
  const flowers = c.flowers || [], vase = c.vase?.color || '#e9e1d3', rib = c.ribbon?.color || '#d9718d';
  const spots = [[100, 52], [72, 64], [128, 64], [86, 84], [114, 84], [58, 92], [142, 92], [100, 76], [100, 100]];
  return svg('0 0 200 220', `<path d="M70 120 L130 120 L122 200 Q100 210 78 200 Z" fill="${vase}"/><path d="M70 120 L130 120 L122 200 Q100 210 78 200 Z" fill="url(#vs)"/>${shadeDefs('vs')}
    <path d="M100 120 L90 70 M100 120 L110 70 M100 120 L76 80 M100 120 L124 80" stroke="#6f8f4e" stroke-width="3"/>
    <rect x="70" y="128" width="60" height="10" fill="${rib}"/>
    ${flowers.length ? spots.map(([x, y], i) => `<text x="${x}" y="${y}" font-size="30" text-anchor="middle" dominant-baseline="middle">${flowers[i % flowers.length].icon}</text>`).join('') : ''}`);
}

// ================= the content =================
const PRAISE = ['Lovely!', 'Just right!', 'Perfect.', 'Beautiful choice!', 'Oh, well done!', 'Wonderful!'];
const COLOURS = [
  { id: 'rose', label: 'Rose pink', color: '#e7a3b6' }, { id: 'icy', label: 'Icy blue', color: '#a9d4ea' },
  { id: 'lilac', label: 'Lilac', color: '#c4a8e0' }, { id: 'sage', label: 'Sage green', color: '#a9c49a' },
  { id: 'gold', label: 'Golden', color: '#e6c06a' }, { id: 'ivory', label: 'Ivory', color: '#f1e9d8' },
  { id: 'ruby', label: 'Ruby', color: '#b8384f' }, { id: 'midnight', label: 'Midnight blue', color: '#2f3f78' },
];
const EVELYNN = { name: 'Evelynn', img: 'evelynn.png' };
const FRIENDS = [
  { id: 'lila', label: 'Lila-Bella', icon: '👧' }, { id: 'cashamir', label: 'Cashamir', icon: '🤴' },
  { id: 'ivory', label: 'the Ivory & Gold Prince', icon: '👑' }, { id: 'evelynn', label: 'Evelynn', icon: '👩‍🍳' },
  { id: 'hendrix', label: 'Hendrix', icon: '📚' }, { id: 'annalise', label: 'Annalise', icon: '🐴' },
];

// -- Evelynn's kitchen: bake, cook, and plan a beautiful picnic --
const KITCHEN_PANTRY = [['flour', '🌾', 'Flour'], ['butter', '🧈', 'Butter'], ['egg', '🥚', 'Eggs'], ['honey', '🍯', 'Honey'], ['milk', '🥛', 'Milk'],
  ['berries', '🫐', 'Berries'], ['lemon', '🍋', 'Lemons'], ['lavender', '🪻', 'Lavender'], ['bread', '🍞', 'Bread'], ['cucumber', '🥒', 'Cucumber'],
  ['cheese', '🧀', 'Cheese'], ['herbs', '🌿', 'Herbs'], ['apple', '🍎', 'Apples'], ['sugar', '🧂', 'Sugar']];
const OVEN = { time: 'Take it out of the oven', icon: '🔥', good: 'Perfectly golden! Evelynn claps her hands.', early: 'A little pale, but soft and sweet. Still delicious!', late: 'A touch toasty at the edges. Evelynn says those are the best bits.' };
const BAKES = [
  { name: 'Honey Cakes', icon: '🧁', blurb: 'Little golden cakes with a drizzle of honey.', done: 'Warm honey cakes fill the treehouse with a sweet smell.',
    steps: [{ add: 'flour', text: 'Sift in the flour.' }, { add: 'butter', text: 'Add the soft butter.' }, { add: 'egg', text: 'Crack in two eggs.' }, { add: 'honey', text: 'Pour in the honey.' },
      { do: 'Stir the batter', n: 8, text: 'Stir until smooth.' }, { ...OVEN, text: 'Bake until golden.' }] },
  { name: 'Berry Tart', icon: '🥧', blurb: 'Buttery pastry heaped with berries.', done: 'The berry tart shines like a jewel box.',
    steps: [{ add: 'flour', text: 'Tip the flour into the bowl.' }, { add: 'butter', text: 'Rub in the butter.' }, { do: 'Roll the pastry', icon: '🫓', n: 6, text: 'Roll out the pastry.' },
      { add: 'berries', text: 'Fill it with berries.' }, { add: 'sugar', text: 'Sprinkle a little sugar.' }, { ...OVEN, text: 'Bake until the pastry is golden.' }] },
  { name: 'Lavender Shortbread', icon: '🍪', blurb: 'Crumbly biscuits with lavender from the fields.', done: 'The shortbread smells of butter and summer lavender.',
    steps: [{ add: 'butter', text: 'Start with the butter.' }, { add: 'sugar', text: 'Cream in the sugar.' }, { add: 'lavender', text: 'Add a pinch of lavender.' }, { add: 'flour', text: 'Fold in the flour.' },
      { do: 'Press the shapes', icon: '⭐', n: 6, text: 'Cut out star shapes.' }, { ...OVEN, text: 'Bake until pale gold.' }] },
];
const COOKS = [
  { name: 'Cucumber Sandwiches', icon: '🥪', vessel: '🍽️', blurb: 'Dainty sandwiches for a picnic.', done: 'A neat stack of little sandwiches, crusts and all.',
    steps: [{ add: 'bread', text: 'Lay out the bread.' }, { add: 'butter', text: 'Spread the butter thinly.' }, { do: 'Slice the cucumber', icon: '🔪', n: 7, text: 'Slice the cucumber.' },
      { add: 'cucumber', text: 'Layer the cucumber.' }, { add: 'herbs', text: 'Scatter a few herbs.' }, { do: 'Cut into triangles', icon: '🔺', n: 4, text: 'Cut into triangles.' }] },
  { name: 'Cheese & Herb Scones', icon: '🥯', blurb: 'Savoury scones, still warm.', done: 'Fluffy scones, golden and cheesy.',
    steps: [{ add: 'flour', text: 'Flour first.' }, { add: 'butter', text: 'Rub in the butter.' }, { add: 'cheese', text: 'Grate in the cheese.' }, { add: 'herbs', text: 'Chop in the herbs.' },
      { add: 'milk', text: 'Splash of milk.' }, { do: 'Pat the dough', icon: '👐', n: 6, text: 'Pat the dough round.' }, { ...OVEN, text: 'Bake until risen and golden.' }] },
  { name: 'Pink Lemonade', icon: '🍹', vessel: '🫙', blurb: 'Fizzy and fresh, for a sunny afternoon.', done: 'A big jar of pink lemonade, clinking with ice.',
    steps: [{ do: 'Squeeze the lemons', icon: '🍋', n: 8, text: 'Squeeze the lemons.' }, { add: 'lemon', text: 'Pour in the lemon juice.' }, { add: 'sugar', text: 'Stir in the sugar.' },
      { add: 'berries', text: 'Add berries for the pink.' }, { do: 'Stir it round', n: 6, text: 'Give it a good stir.' }] },
];
const an = w => /^[aeiou]/i.test(w) ? 'An' : 'A';
const cap = t => t.charAt(0).toUpperCase() + t.slice(1);
const listNames = list => { const n = list.map(o => o.label); return n.length < 2 ? n.join('') : `${n.slice(0, -1).join(', ')} and ${n.at(-1)}`; };

// -- around the treehouse: parties, berries, wild animals, woodland games --
const BERRY_ITEMS = [{ icon: '🍓', label: 'Strawberry', weight: 4 }, { icon: '🫐', label: 'Blueberries', weight: 4 }, { icon: '🍒', label: 'Cherries', points: 2, weight: 2 },
  { icon: '🍇', label: 'Wild grapes', points: 2, weight: 1 }, { icon: '🐝', label: 'A busy bee', bad: true, say: 'Oops, a bee! Let it buzz away.', weight: 2 }];
const WILD = [{ icon: '🦊', label: 'Fox', say: 'A fox, with a fluffy tail!' }, { icon: '🦌', label: 'Deer', say: 'A deer, stepping softly.' }, { icon: '🐇', label: 'Rabbit', say: 'A rabbit hops by.', weight: 2 },
  { icon: '🦉', label: 'Owl', say: 'An owl blinks at you from a branch.' }, { icon: '🐿️', label: 'Squirrel', say: 'A squirrel with an acorn!', weight: 2 }, { icon: '🦔', label: 'Hedgehog', say: 'A tiny hedgehog snuffles past.' },
  { icon: '🐦', label: 'Bluebird', say: 'A bluebird sings.', weight: 2 }, { icon: '🦡', label: 'Badger', say: 'A badger! They’re ever so shy.' }, { icon: '🦢', label: 'Swan', say: 'A swan glides on the lake.' },
  { icon: '🐻', label: 'Bear cub', say: 'A little bear cub, far off. Best to watch quietly.' }];
const PARTY = {
  host: { name: 'Lila-Bella', icon: '👧' }, scene: 'treehouse', store: 'parties',
  hello: 'A party in the treehouse! Let’s make it magical.', praise: PRAISE,
  steps: [
    { key: 'theme', label: 'Party theme', options: [{ id: 'fairy', label: 'Fairy garden', icon: '🧚' }, { id: 'star', label: 'Starlight', icon: '🌟' }, { id: 'tea', label: 'Teddy-bear tea', icon: '🧸' }, { id: 'forest', label: 'Woodland friends', icon: '🦊' }] },
    { key: 'decor', label: 'Decorations', multi: 3, options: [{ id: 'lights', label: 'Fairy lights', icon: '✨' }, { id: 'balloons', label: 'Balloons', icon: '🎈' }, { id: 'flowers', label: 'Flower garlands', icon: '🌸' }, { id: 'lanterns', label: 'Paper lanterns', icon: '🏮' }, { id: 'ribbons', label: 'Ribbons', icon: '🎀' }] },
    { key: 'treats', label: 'Treats', multi: 3, options: [{ id: 'cake', label: 'Party cake', icon: '🎂' }, { id: 'cookies', label: 'Cookies', icon: '🍪' }, { id: 'cocoa', label: 'Hot cocoa', icon: '☕' }, { id: 'fruit', label: 'Fruit skewers', icon: '🍓' }, { id: 'buns', label: 'Iced buns', icon: '🧁' }] },
    { key: 'fun', label: 'Party game', options: [{ id: 'dance', label: 'Dancing', icon: '💃' }, { id: 'stories', label: 'Story circle', icon: '📖' }, { id: 'music', label: 'Musical cushions', icon: '🎶' }, { id: 'hunt', label: 'Treasure hunt', icon: '🗝️' }] },
    { key: 'friends', label: 'Guests', multi: 4, options: FRIENDS },
  ],
  preview: c => emojiScene(c, [c.decor, [c.theme, c.fun], c.treats, c.friends], c.theme ? `${c.theme.label} party` : 'Your treehouse party'),
  doneTitle: c => `${an(c.theme.label)} ${c.theme.label.toLowerCase()} party!`,
  finale: c => `The treehouse glows with ${listNames(c.decor).toLowerCase()}. ${listNames(c.friends)} ${c.friends.length === 1 ? 'climbs' : 'climb'} the spiral stair for ${listNames(c.treats).toLowerCase()}, and the ${c.fun.label.toLowerCase()} goes on until the stars come out.`,
};

// -- the castle: royal gardens, kitchens, royal events --
const GARDEN_ITEMS = [{ icon: '🥀', label: 'A thirsty rose', tool: 'water', hint: 'That rose needs water. Choose the watering can.', weight: 3, points: 1 },
  { icon: '🌿', label: 'A weed', tool: 'pull', hint: 'Pull weeds with your gardening gloves.', weight: 3 },
  { icon: '🌹', label: 'A rose for the vases', tool: 'snip', hint: 'Snip roses with the shears.', weight: 2, points: 2 },
  { icon: '🌷', label: 'A tulip bud', tool: 'water', hint: 'Water the tulip bud so it opens.', weight: 2 }];
const ROYAL_KITCHEN = {
  host: { name: 'Mistress Marigold, the royal cook', icon: '👩‍🍳' }, scene: 'castle-kitchen', vessel: '🍲', store: 'royal-dishes',
  hello: 'Welcome to the royal kitchens, Your Highness! We’ve a banquet to prepare. Which dish will you help with?',
  praise: ['Splendid!', 'Fit for a queen!', 'Just so!', 'Marvellous!'],
  pantry: [['flour', '🌾', 'Flour'], ['butter', '🧈', 'Butter'], ['egg', '🥚', 'Eggs'], ['cream', '🥛', 'Cream'], ['sugar', '🧂', 'Sugar'], ['berries', '🍓', 'Strawberries'],
    ['pear', '🍐', 'Pears'], ['honey', '🍯', 'Honey'], ['carrot', '🥕', 'Carrots'], ['potato', '🥔', 'Potatoes'], ['herbs', '🌿', 'Herbs'], ['chocolate', '🍫', 'Chocolate']],
  dishes: [
    { name: 'Royal Trifle', icon: '🍨', blurb: 'Layers of sponge, berries and cream.', done: 'The trifle is carried in on a silver stand.',
      steps: [{ add: 'flour', text: 'Flour for the sponge.' }, { add: 'egg', text: 'Eggs, beaten light.' }, { ...OVEN, text: 'Bake the sponge.' }, { add: 'berries', text: 'Layer the strawberries.' }, { add: 'cream', text: 'Spoon on the cream.' }, { do: 'Pipe the rosettes', icon: '🌸', n: 6, text: 'Pipe cream rosettes on top.' }] },
    { name: 'Golden Garden Soup', icon: '🥣', blurb: 'Warming soup from the castle garden.', done: 'A golden tureen of soup steams on the banquet table.',
      steps: [{ do: 'Chop the vegetables', icon: '🔪', n: 8, text: 'Chop the vegetables.' }, { add: 'carrot', text: 'Carrots in the pot.' }, { add: 'potato', text: 'Then the potatoes.' }, { add: 'herbs', text: 'A bundle of herbs.' }, { do: 'Stir the pot', n: 7, text: 'Stir as it bubbles.' }, { add: 'cream', text: 'Finish with a swirl of cream.' }] },
    { name: 'Honey-Poached Pears', icon: '🍐', blurb: 'Glossy pears, a royal favourite.', done: 'The pears glisten like amber.',
      steps: [{ add: 'pear', text: 'Peel the pears.' }, { add: 'honey', text: 'Honey in the pan.' }, { add: 'sugar', text: 'A spoon of sugar.' }, { do: 'Baste the pears', icon: '🥄', n: 6, text: 'Spoon the syrup over.' }, { add: 'chocolate', text: 'Drizzle with chocolate.' }] },
  ],
};
const ROYAL_EVENT = {
  host: { name: 'Sir Aldous, the royal steward', icon: '🎩' }, scene: 'ballroom', store: 'royal-events',
  hello: 'Your Highness, the ballroom is yours to command. What shall we celebrate?', praise: ['Excellent.', 'Most elegant.', 'A royal choice.', 'Splendid.'],
  steps: [
    { key: 'occasion', label: 'The occasion', options: [{ id: 'ball', label: 'A grand ball', icon: '💃' }, { id: 'tea', label: 'A garden tea party', icon: '🫖' }, { id: 'birthday', label: 'A royal birthday', icon: '🎂' }, { id: 'midsummer', label: 'A midsummer feast', icon: '☀️' }, { id: 'winter', label: 'A winter masquerade', icon: '🎭' }] },
    { key: 'decor', label: 'The ballroom', multi: 3, options: [{ id: 'candles', label: 'Candlelight', icon: '🕯️' }, { id: 'roses', label: 'Roses from the garden', icon: '🌹' }, { id: 'banners', label: 'Dove banners', icon: '🕊️' }, { id: 'crystal', label: 'Crystal and silver', icon: '💎' }, { id: 'ribbons', label: 'Silk ribbons', icon: '🎀' }] },
    { key: 'menu', label: 'The banquet', multi: 3, options: [{ id: 'trifle', label: 'Royal trifle', icon: '🍨' }, { id: 'soup', label: 'Golden soup', icon: '🥣' }, { id: 'cake', label: 'Tiered cake', icon: '🎂' }, { id: 'tarts', label: 'Fruit tarts', icon: '🥧' }, { id: 'punch', label: 'Sparkling punch', icon: '🥂' }] },
    { key: 'music', label: 'Music', options: [{ id: 'piano', label: 'Cashamir at the piano', icon: '🎹' }, { id: 'strings', label: 'A string quartet', icon: '🎻' }, { id: 'harp', label: 'A harpist', icon: '🪕' }, { id: 'trumpets', label: 'Royal trumpets', icon: '🎺' }] },
    { key: 'guests', label: 'Guests of honour', multi: 3, options: FRIENDS },
  ],
  preview: c => emojiScene(c, [c.decor, [c.occasion, c.music], c.menu, c.guests], c.occasion ? c.occasion.label : 'Your royal event'),
  doneTitle: c => `${c.occasion.label.replace(/^A /, 'The ')} is a triumph!`,
  finale: c => `${cap(listNames(c.decor).toLowerCase())} ${c.decor.length === 1 ? 'fills' : 'fill'} the ballroom. ${c.music.label} sets everyone dancing, the banquet of ${listNames(c.menu).toLowerCase()} is admired by all, and ${listNames(c.guests)} ${c.guests.length === 1 ? 'says' : 'say'} it is the finest event Celedonia has seen.`,
};
const BOUQUET = {
  host: { name: 'Old Bramble, the royal gardener', icon: '👨‍🌾' }, scene: 'garden', store: 'bouquets',
  hello: 'Every room in the castle wants fresh flowers. Shall we make a bouquet?', praise: PRAISE,
  steps: [
    { key: 'flowers', label: 'Flowers', multi: 3, options: [{ id: 'rose', label: 'Roses', icon: '🌹' }, { id: 'tulip', label: 'Tulips', icon: '🌷' }, { id: 'lavender', label: 'Lavender', icon: '🪻' }, { id: 'sunflower', label: 'Sunflowers', icon: '🌻' }, { id: 'blossom', label: 'Cherry blossom', icon: '🌸' }, { id: 'daisy', label: 'Daisies', icon: '🌼' }] },
    { key: 'vase', label: 'Vase', options: COLOURS.slice(0, 6) },
    { key: 'ribbon', label: 'Ribbon', options: COLOURS },
    { key: 'room', label: 'For which room?', options: [{ id: 'hall', label: 'The castle hall', icon: '🏰' }, { id: 'library', label: 'The library', icon: '📚' }, { id: 'nursery', label: 'The nursery', icon: '🧸' }, { id: 'ballroom', label: 'The ballroom', icon: '💃' }] },
  ],
  preview: bouquetArt, gallery: 'Your earlier bouquets',
  doneTitle: () => 'A royal bouquet', finale: c => `Old Bramble carries your ${listNames(c.flowers).toLowerCase()} to ${c.room.label.toLowerCase()}, where they brighten the whole room.`,
};

// -- the village shops --
const CARPENTER = {
  host: { name: 'Master Tobias, the carpenter', icon: '🧔' }, scene: 'workshop', vessel: '🪚', store: 'carpentry', pantryLabel: 'Tools and timber',
  hello: 'Mind the shavings! Pick something to make and I’ll show you how.', praise: ['Good and true!', 'Steady hands!', 'That’s the way.', 'Fine work.'],
  pantry: [['oak', '🪵', 'Oak plank'], ['pine', '🌲', 'Pine board'], ['saw', '🪚', 'Saw'], ['hammer', '🔨', 'Hammer'], ['nails', '📌', 'Nails'], ['glue', '🧴', 'Glue'],
    ['paint', '🎨', 'Paint'], ['ruler', '📏', 'Ruler'], ['string', '🧵', 'String'], ['brush', '🖌️', 'Brush']],
  dishes: [
    { name: 'A Birdhouse', icon: '🏠', blurb: 'A snug home for the bluebirds.', done: 'You hang the birdhouse on the oak, and a bluebird peeks in straight away.',
      steps: [{ add: 'ruler', text: 'Measure the boards.' }, { add: 'pine', text: 'Take a pine board.' }, { do: 'Saw the pieces', icon: '🪚', n: 7, text: 'Saw the walls and roof.' }, { add: 'nails', text: 'Nails ready.' }, { do: 'Hammer it together', icon: '🔨', n: 6, text: 'Hammer it together.' }, { add: 'paint', text: 'Paint it bright.' }] },
    { name: 'A Toy Sailboat', icon: '⛵', blurb: 'To float on the village fountain.', done: 'Your little sailboat bobs across the fountain to cheers from the village children.',
      steps: [{ add: 'oak', text: 'Choose an oak plank.' }, { do: 'Carve the hull', icon: '🔪', n: 7, text: 'Carve the hull.' }, { do: 'Sand it smooth', icon: '🧽', n: 5, text: 'Sand it smooth.' }, { add: 'glue', text: 'Glue in the mast.' }, { add: 'string', text: 'Rig the sail with string.' }, { add: 'brush', text: 'Varnish with the brush.' }] },
    { name: 'A Jewellery Box', icon: '🎁', blurb: 'With a lid that clicks shut.', done: 'The jewellery box clicks shut. Inside, it smells of oak and polish.',
      steps: [{ add: 'oak', text: 'Fine oak for a fine box.' }, { add: 'saw', text: 'Fetch the saw.' }, { do: 'Cut the sides', icon: '🪚', n: 6, text: 'Cut four sides and a lid.' }, { add: 'glue', text: 'Glue the corners.' }, { add: 'paint', text: 'Paint little flowers on the lid.' }, { time: 'Polish until it gleams', icon: '✨', hint: 'Stop polishing when the needle is in the golden part.', good: 'It gleams like honey!', early: 'A soft sheen. Lovely.', late: 'Polished to a mirror. Tobias laughs.' }] },
  ],
};
const DRESS_SHOP = {
  host: { name: 'Madame Rosalind, the dressmaker', icon: '🪡' }, scene: 'boutique', store: 'dresses', gallery: 'Dresses you’ve made before',
  hello: 'Ah, Ember! Come in, come in. Let’s make you something wonderful.', praise: ['Exquisite!', 'Divine!', 'Oh, very chic.', 'Perfection.'],
  steps: [
    { key: 'skirt', label: 'Skirt', options: [{ id: 'ballgown', label: 'Ballgown' }, { id: 'aline', label: 'A-line' }, { id: 'mermaid', label: 'Mermaid' }, { id: 'tiered', label: 'Tiered ruffles' }] },
    { key: 'sleeves', label: 'Sleeves', options: [{ id: 'straps', label: 'Thin straps' }, { id: 'puff', label: 'Puff sleeves' }, { id: 'long', label: 'Long sleeves' }, { id: 'cape', label: 'Little cape' }] },
    { key: 'color', label: 'Colour', options: COLOURS },
    { key: 'fabric', label: 'Fabric', options: [{ id: 'plain', label: 'Silk' }, { id: 'dots', label: 'Polka dots' }, { id: 'stripes', label: 'Stripes' }, { id: 'floral', label: 'Flowers' }] },
    { key: 'trim', label: 'Finishing touch', options: [{ id: 'lace', label: 'Lace hem', icon: '🤍' }, { id: 'sash', label: 'Satin sash', icon: '🎀' }, { id: 'sparkle', label: 'Sparkles', icon: '✨' }, { id: 'roses', label: 'Silk roses', icon: '🌹' }] },
  ],
  preview: dressArt,
  doneTitle: c => `${an(c.color.label)} ${c.color.label.toLowerCase()} ${c.skirt.label.toLowerCase()} gown`,
  finale: c => `Madame Rosalind pins the last ${c.trim.label.toLowerCase()} and steps back. “Ember, it is you. Wear it to the next royal ball.”`,
};
const HABERDASHERY = {
  host: { name: 'Mr Penrose, the haberdasher', icon: '🎩' }, scene: 'boutique', store: 'hats', gallery: 'Hats you’ve trimmed before',
  hello: 'Ribbons, buttons, feathers and lace! Let’s trim you a hat.', praise: ['Dashing!', 'Most becoming.', 'Very fine.', 'Oh, charming!'],
  steps: [
    { key: 'style', label: 'Hat', options: [{ id: 'bonnet', label: 'Bonnet' }, { id: 'brim', label: 'Wide brim' }, { id: 'tophat', label: 'Little top hat' }, { id: 'beret', label: 'Beret' }] },
    { key: 'color', label: 'Felt or straw', options: [{ id: 'straw', label: 'Straw', color: '#e3c98f' }, ...COLOURS.slice(0, 7)] },
    { key: 'ribbon', label: 'Ribbon', options: COLOURS },
    { key: 'deco', label: 'Trimming', options: [{ id: 'feather', label: 'A feather', icon: '🪶' }, { id: 'flowers', label: 'Silk flowers', icon: '🌼' }, { id: 'bow', label: 'A big bow', icon: '🎀' }, { id: 'pearls', label: 'Pearl buttons', icon: '⚪' }] },
  ],
  preview: hatArt, doneTitle: c => `${an(c.style.label)} ${c.style.label.toLowerCase()} with ${c.deco.label.toLowerCase()}`,
  finale: () => 'Mr Penrose wraps it in tissue and a striped hatbox. “Perfect for festival day.”',
};
const SHOE_SHOP = {
  host: { name: 'Wren, the shoemaker', icon: '👞' }, scene: 'boutique', store: 'shoes', gallery: 'Shoes you’ve made before',
  hello: 'Every princess needs good shoes, for dancing and for walking the lanes. What shall we make?', praise: PRAISE,
  steps: [
    { key: 'style', label: 'Shoe', options: [{ id: 'slipper', label: 'Ballet slippers' }, { id: 'mary', label: 'Strap shoes' }, { id: 'heel', label: 'Dancing heels' }, { id: 'boot', label: 'Lace-up boots' }] },
    { key: 'color', label: 'Leather or satin', options: [{ id: 'tan', label: 'Tan leather', color: '#b07a4f' }, ...COLOURS] },
    { key: 'deco', label: 'Decoration', options: [{ id: 'bow', label: 'Bow', icon: '🎀' }, { id: 'buckle', label: 'Gold buckle', icon: '🟨' }, { id: 'gem', label: 'A crystal', icon: '💎' }, { id: 'flower', label: 'A flower', icon: '🌸' }] },
  ],
  preview: shoeArt, doneTitle: c => `${c.color.label} ${c.style.label.toLowerCase()}`,
  finale: c => c.style.id === 'boot' ? 'Sturdy and smart: perfect for walking to the treehouse.' : 'They fit perfectly. Ember twirls across the shop floor.',
};
const TOY_SHOP = {
  host: { name: 'Mrs Pip, the toymaker', icon: '🧸' }, scene: 'toyshop', store: 'gifts',
  hello: 'Hello, dear! Choose a toy and I’ll help you wrap it as a present.', praise: PRAISE,
  steps: [
    { key: 'toy', label: 'Toy', options: [{ id: 'bear', label: 'Teddy bear', icon: '🧸' }, { id: 'carousel', label: 'Music-box carousel', icon: '🎠' }, { id: 'kite', label: 'Kite', icon: '🪁' }, { id: 'doll', label: 'Set of nesting dolls', icon: '🪆' }, { id: 'puzzle', label: 'Puzzle', icon: '🧩' }, { id: 'boat', label: 'Toy boat', icon: '⛵' }, { id: 'yoyo', label: 'Yo-yo', icon: '🪀' }] },
    { key: 'paper', label: 'Wrapping paper', options: COLOURS },
    { key: 'ribbon', label: 'Ribbon', options: COLOURS },
    { key: 'who', label: 'Who is it for?', options: [{ id: 'nursery', label: 'the royal nursery', icon: '🏰' }, ...FRIENDS.map(f => ({ ...f }))] },
  ],
  preview: giftArt, doneTitle: c => `${an(c.toy.label)} ${c.toy.label.toLowerCase()} for ${c.who.label}`,
  finale: c => c.who.id === 'nursery' ? 'You leave it in the playroom, and the next morning the royal children squeal with joy.' : `${c.who.label} unwraps it and gives you the biggest hug.`,
};
const BOOKSHOP = {
  host: { name: 'Mabel, the bookseller', icon: '📚' }, scene: 'bookshop', store: 'books', gallery: 'Your bookshelf',
  hello: 'Tell me what you love, and I’ll find you the perfect book.', praise: ['Ooh!', 'Good taste.', 'I know just the shelf.', 'Mm-hm!'],
  steps: [
    { key: 'mood', label: 'What kind of story?', options: [{ id: 'adventure', label: 'Adventure', icon: '🗺️' }, { id: 'mystery', label: 'Mystery', icon: '🔍' }, { id: 'romance', label: 'Romance', icon: '💌' }, { id: 'cosy', label: 'Something cosy', icon: '🫖' }] },
    { key: 'setting', label: 'Where should it happen?', options: [{ id: 'sea', label: 'At sea', icon: '🌊' }, { id: 'castle', label: 'In a castle', icon: '🏰' }, { id: 'forest', label: 'In an enchanted forest', icon: '🌲' }, { id: 'stars', label: 'Among the stars', icon: '✨' }] },
    { key: 'hero', label: 'Who is it about?', options: [{ id: 'princess', label: 'A brave princess', icon: '👸' }, { id: 'fox', label: 'A clever fox', icon: '🦊' }, { id: 'prince', label: 'A wandering prince', icon: '🤴' }, { id: 'sisters', label: 'Two sisters', icon: '👭' }] },
    { key: 'cover', label: 'Cover', options: COLOURS },
  ],
  preview: bookArt, doneTitle: c => bookTitle(c),
  finale: c => `Mabel wraps it in brown paper. You read the first line on the way out: “${{ princess: 'The princess had never once been told she could not', fox: 'Nobody in the wood could outwit the fox, though plenty tried', prince: 'The prince had walked so far his boots had forgotten home', sisters: 'The sisters had a secret, and the secret had a map' }[c.hero.id]}…”`,
};
const PLAYS = {
  host: { name: 'Director Fennimore', icon: '🎭' }, praise: ['Bravo!', 'Magnificent!', 'The audience gasps!', 'What delivery!'],
  hello: 'The players need a leading lady tonight. Will you take the stage?',
  plays: [
    { title: 'The Lost Slipper', icon: '👠', role: 'the Princess', ending: 'The slipper is found under the fountain, and the whole village dances.',
      scenes: [
        { cue: 'The Herald bows: “Princess, your glass slipper is missing!”', lines: ['Then we must search the whole village!', 'I would rather have a sandwich.', 'Slippers are for sleeping.'] },
        { cue: 'The Baker shrugs: “I saw a magpie fly off with something shiny.”', lines: ['A magpie! Let us follow it to the bell tower.', 'Pass me a bun, then.', 'I do not believe in magpies.'] },
        { cue: 'At the tower, the magpie guards its nest of treasures.', lines: ['Dear magpie, I will trade you my ribbon for my slipper.', 'Shoo, you silly bird!', 'I will simply wait here forever.'] },
        { cue: 'The magpie takes the ribbon and drops the slipper into the fountain below.', lines: ['Then into the fountain I go, for a happy ending!', 'Oh well, I have other shoes.', 'Somebody else can fetch it.'] },
      ] },
    { title: 'The Dragon Who Was Lonely', icon: '🐉', role: 'the Brave Knight', ending: 'The dragon is invited to every festival from that day on.',
      scenes: [
        { cue: 'The Mayor wrings his hands: “A dragon sits on the hill, sighing smoke!”', lines: ['I shall go and find out what troubles it.', 'Let us all run away!', 'Dragons are not real.'] },
        { cue: 'The dragon lifts its great head: “Nobody ever visits me.”', lines: ['Then I shall be your first visitor, and your friend.', 'That is because you are scary.', 'I am only here for the gold.'] },
        { cue: 'The dragon sniffles: “But the villagers fear me.”', lines: ['Come to the festival, and show them how gentle you are.', 'Stay up here, then.', 'Have you tried being smaller?'] },
      ] },
  ],
};
const FESTIVAL_CATCH = {
  host: { name: 'Annalise', icon: '🌾' }, scoreIcon: '🧺', aria: 'Catching treats at the lavender festival', player: '🧺', time: 40, speed: 170, rate: 1,
  hello: 'Lavender sprigs and sweets are tumbling from the festival bunting! Catch them in your basket.',
  hint: 'Move with ← → (or A and D), drag on the picture, or hold the buttons. Watch out for bees!',
  backdrop: BACKDROPS.fair,
  items: [{ icon: '🪻', label: 'Lavender', weight: 4, say: 'Lavender for the crowns!' }, { icon: '🍬', label: 'A sweet', weight: 2 }, { icon: '🎀', label: 'A ribbon', points: 2, weight: 2, say: 'A ribbon for your hair!' },
    { icon: '🌼', label: 'A daisy', weight: 2 }, { icon: '🍭', label: 'A lollipop', points: 3, weight: 1, say: 'A swirly lollipop!' }, { icon: '🐝', label: 'A bee', bad: true, weight: 2, say: 'Oops! A bee. It buzzes off, unbothered.' }],
  doneIcon: '🪻', doneTitle: s => `${s} festival treasures!`,
  doneText: s => s >= 30 ? 'Your basket is overflowing. You win the prize rosette for the fullest basket!' : s >= 15 ? 'A lovely full basket. Annalise weaves the lavender into crowns for everyone.' : 'A few sweet treasures. The festival goes on all evening, so there’s always another go!',
};
const FLOWER_CROWN = {
  host: { name: 'Annalise', icon: '🌾' }, scene: 'fields', store: 'crowns', gallery: 'Crowns you’ve woven before',
  hello: 'Every festival-goer wears a flower crown. Let’s weave yours!', praise: PRAISE,
  steps: [
    { key: 'flowers', label: 'Flowers', multi: 3, options: [{ id: 'lavender', label: 'Lavender', icon: '🪻' }, { id: 'daisy', label: 'Daisies', icon: '🌼' }, { id: 'rose', label: 'Roses', icon: '🌹' }, { id: 'blossom', label: 'Blossom', icon: '🌸' }, { id: 'hibiscus', label: 'Hibiscus', icon: '🌺' }, { id: 'sunflower', label: 'Sunflowers', icon: '🌻' }] },
    { key: 'ribbon', label: 'Ribbon tails', options: COLOURS },
  ],
  preview: crownArt, doneTitle: () => 'Your festival crown',
  finale: c => `You wear your crown of ${listNames(c.flowers).toLowerCase()} to the maypole, and the ribbons flutter as you dance.`,
};
const HORSES = {
  host: { name: 'Annalise', icon: '🌾' }, scene: 'stable', doneIcon: '🐴',
  hello: 'Welcome to my paddock! Clover, Duchess and Moonbeam would love some help today.',
  tools: [{ id: 'hay', icon: '🌾', label: 'Hay', react: ['munches the hay happily.', 'crunches away.', 'swishes a tail and eats.'] },
    { id: 'water', icon: '🪣', label: 'Water', react: ['takes a long drink.', 'slurps and snorts.'] },
    { id: 'brush', icon: '🪮', label: 'Brush', react: ['leans into the brush. Their coat shines!', 'loves a good brushing.'] },
    { id: 'apple', icon: '🍎', label: 'Apple', react: ['nuzzles your hand for the apple.', 'whinnies with delight.'] }],
  animals: [{ name: 'Clover', icon: '🐴' }, { name: 'Duchess', icon: '🐎' }, { name: 'Moonbeam', icon: '🦄' }],
  doneTitle: 'The horses are happy!', doneText: 'Clover, Duchess and Moonbeam gleam in the sunshine. Annalise says you can ride Moonbeam along the lavender path any time.',
};
const RIDE = {
  host: { name: 'Annalise', icon: '🌾' }, scoreIcon: '🍎', aria: 'Riding along the lavender path', player: '🏇', flip: false, time: 40, speed: 190, rate: .9,
  hello: 'Let’s ride along the lavender path! Gather apples and flowers for the horses, and steer round the puddles.',
  hint: 'Move with ← → (or A and D), drag on the picture, or hold the buttons.', backdrop: BACKDROPS.path,
  items: [{ icon: '🍎', label: 'Apple', weight: 4 }, { icon: '🥕', label: 'Carrot', weight: 3, say: 'A carrot! Moonbeam’s favourite.' }, { icon: '🌼', label: 'Daisy', weight: 2 }, { icon: '🍀', label: 'Lucky clover', points: 3, weight: 1, say: 'A four-leaf clover. Lucky!' },
    { icon: '💧', label: 'Puddle', bad: true, weight: 2, say: 'Splash! A muddy puddle.' }],
  doneIcon: '🏇', doneTitle: s => `${s} treats gathered!`,
  doneText: s => s >= 25 ? 'The horses will be spoiled for a week. What a ride!' : 'A lovely ride through the lavender. The horses toss their manes happily.',
};

// -- Byzantine: the villa on the lake --
const CASHAMIR_STYLE = (() => { const k = 236 / 420; return `background-image:url('blue-prince.png');background-size:${2024 * k}px ${420 * k}px;background-position:0 0;width:${253 * k}px;height:236px`; })();
const CASHAMIR = { name: 'Cashamir', icon: '🤴' };
const NOTES = [261.63, 293.66, 329.63, 349.23, 392, 440, 493.88, 523.25];
const PIANO = {
  host: CASHAMIR, scene: 'music', voice: 'piano', padClass: 'key', performer: { style: CASHAMIR_STYLE }, roundIcon: '🎹', rounds: 6, gap: 520, beat: 420,
  pads: ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C'].map((n, i) => ({ label: n, name: `${n} key`, freq: NOTES[i], key: 'asdfghjk'[i] })),
  hello: 'Cashamir looks up from the piano with a quiet smile. “Would you like to hear something? Or play with me?”',
  listenLabel: '🎵 Listen to Cashamir play', playLabel: 'Play along with him',
  listenSay: 'Cashamir’s icy-blue sleeves glint as his hands move across the keys…',
  afterListen: '“That one is called Lake at Dusk. I wrote it here, by the window.”',
  melody: [[4, 1], [2, 1], [4, 1], [7, 2], [6, 1], [5, 1], [4, 2], [5, 1], [4, 1], [2, 1], [3, 1], [2, 1], [0, 3],
    [2, 1], [4, 1], [5, 1], [7, 2], [6, 1], [4, 1], [5, 2], [3, 1], [2, 1], [1, 1], [0, 3]],
  watchSay: '“Watch my hands, then play it back.”', watchMore: ['“A little longer now…”', '“Here’s the next part.”', '“Listen closely…”'],
  yourTurn: '“Your turn.”', praise: ['“Beautiful.”', '“You have a gift.”', '“Just like that.”', '“Lovely touch.”'],
  oops: '“Not quite. Here it is again.”', easier: '“Let’s make that phrase a little shorter.”',
  hint: 'Click the keys, or play them with A S D F G H J K.',
  doneIcon: '🎹', doneTitle: 'A duet with Cashamir', doneText: 'The last note hangs over the lake. Cashamir laughs softly. “We should play at the next royal ball.”',
};
const DANCE = {
  host: CASHAMIR, scene: 'courtyard', voice: 'drum', padClass: 'step', performer: { style: CASHAMIR_STYLE }, roundIcon: '💃', rounds: 6, gap: 560,
  pads: [{ label: '←', name: 'Step left', key: 'ArrowLeft', keyLabel: '←', freq: 392 }, { label: '↑', name: 'Step forward', key: 'ArrowUp', keyLabel: '↑', freq: 523.25 },
    { label: '↓', name: 'Step back', key: 'ArrowDown', keyLabel: '↓', freq: 329.63 }, { label: '→', name: 'Step right', key: 'ArrowRight', keyLabel: '→', freq: 440 }],
  hello: 'The musicians strike up in the courtyard. Cashamir offers his hand. “May I have this dance?”', playLabel: 'Take his hand and dance',
  watchSay: '“Follow my steps.”', watchMore: ['“And a little more…”', '“Now with a turn…”', '“Faster now!”'],
  yourTurn: '“Your turn!”', praise: ['“Wonderful!”', '“You dance like a breeze.”', '“Perfect!”'], oops: '“Oops! Let me show you again.”', easier: '“Let’s slow it down.”',
  hint: 'Repeat his steps with the arrow keys, or click the steps.',
  doneIcon: '💃', doneTitle: 'You danced beautifully!', doneText: 'You whirl to a stop beneath the lanterns. Everyone in the courtyard applauds, and Cashamir bows.',
};
const BOATING = {
  host: CASHAMIR, scoreIcon: '🪷', aria: 'Boating on the villa lake', player: '⛵', time: 45, speed: 150, rate: 1,
  hello: 'Cashamir unties the little sailboat. “Steer us round the rocks, and we’ll gather water lilies.”',
  hint: 'Steer with ← → (or A and D), drag on the water, or hold the buttons.', backdrop: BACKDROPS.lake,
  items: [{ icon: '🪷', label: 'Water lily', weight: 4 }, { icon: '🦢', label: 'Swan', points: 2, weight: 1, say: 'A swan glides alongside the boat.' }, { icon: '🦆', label: 'Duckling', points: 2, weight: 1, say: 'A row of ducklings paddles by!' },
    { icon: '🐟', label: 'Fish', weight: 2, say: 'A silver fish leaps!' }, { icon: '🪨', label: 'Rock', bad: true, weight: 2, say: 'Bump! Careful of the rocks.' }, { icon: '🪵', label: 'Log', bad: true, weight: 1, say: 'Whoops, a floating log!' }],
  doneIcon: '⛵', doneTitle: s => `${s} water lilies and friends!`,
  doneText: s => s >= 30 ? 'The boat is full of lilies. Cashamir weaves one into your hair as you drift back to the villa.' : 'You drift back to the villa dock as the sun turns the water to gold.',
};
const VILLA_ANIMALS = {
  host: { name: 'Pella, the villa keeper', icon: '👩‍🌾' }, scene: 'villa-farm', doneIcon: '🦚',
  hello: 'The villa animals are waiting for breakfast! Can you help me look after them?',
  tools: [{ id: 'food', icon: '🌽', label: 'Food', react: ['gobbles it up.', 'nibbles happily.', 'eats every crumb.'] },
    { id: 'water', icon: '💧', label: 'Water', react: ['drinks deeply.', 'splashes a little.'] },
    { id: 'clean', icon: '🧽', label: 'Clean', react: ['looks spotless now.', 'shakes off happily.'] },
    { id: 'love', icon: '💕', label: 'Cuddle', react: ['snuggles close.', 'nuzzles you back.', 'looks very content.'] }],
  animals: [{ name: 'Peony the peacock', icon: '🦚' }, { name: 'Bramble the goat', icon: '🐐' }, { name: 'Pip the duckling', icon: '🦆' }, { name: 'Snowdrop the lamb', icon: '🐑' }, { name: 'Clementine the bunny', icon: '🐇' }],
  doneTitle: 'Every animal is content!', doneText: 'Peony fans out her tail in thanks. The villa farm is calm and happy in the morning sun.',
};

const HUBS = {
  kitchen: { title: 'Evelynn’s Kitchen', sub: 'Bake, cook and plan a beautiful picnic with Evelynn.', games: [
    { id: 'bake', name: 'Bake with Evelynn', icon: '🧁', blurb: 'Honey cakes, berry tart or lavender shortbread.', run: () => recipe({ host: EVELYNN, scene: 'kitchen', store: 'basket', pantry: KITCHEN_PANTRY, praise: PRAISE, dishes: BAKES, hello: 'Aprons on! What shall we bake today?' }) },
    { id: 'cook', name: 'Cook with Evelynn', icon: '🥪', blurb: 'Sandwiches, scones and pink lemonade for the basket.', run: () => recipe({ host: EVELYNN, scene: 'kitchen', store: 'basket', pantry: KITCHEN_PANTRY, praise: PRAISE, dishes: COOKS, hello: 'Let’s make something tasty to take along. What would you like?' }) },
    // the picnic happens out in the realm itself (game.js), not in this window: close it and head to the meadow
    { id: 'picnic', name: 'Have a picnic by the lake', icon: '🧺', blurb: 'Take the basket out to Aspen Meadow and lay the picnic on the grass.', run: () => { const go = opts.picnic; dlg.close(); go?.(); } },
  ] },
  treehouse: { title: 'Fun at the Treehouse', sub: 'Little parties, berry picking, wild animals and games in the woods.', games: [
    { id: 'party', name: 'Throw a treehouse party', icon: '🎈', blurb: 'Choose a theme, treats and guests.', run: () => design(PARTY) },
    { id: 'berries', name: 'Berry picking', icon: '🫐', blurb: 'Fill your basket before the birds get them.', run: () => pop({ host: { name: 'Evelynn', img: 'evelynn.png' }, scene: 'berries', scoreIcon: '🧺', time: 35, life: 2.2, every: .55, max: 6, items: BERRY_ITEMS,
      hello: 'The bushes are heavy with berries! Pick as many as you can, but leave the bees be.', hint: 'Click the berries before they disappear back into the leaves.',
      doneIcon: '🫐', doneTitle: s => `${s} berries picked!`, doneText: s => s >= 25 ? 'A brimming basket! Evelynn says there’s enough for a berry tart.' : 'A lovely basketful. Evelynn will make jam.' }) },
    { id: 'wildlife', name: 'Watch for wild animals', icon: '🦊', blurb: 'Spot the shy creatures of the aspen woods.', run: () => pop({ host: { name: 'Lila-Bella', icon: '👧' }, scene: 'woods', scoreIcon: '👀', time: 40, life: 1.7, every: .9, max: 3, items: WILD,
      journal: 'wildlife', journalTitle: 'Your wildlife journal',
      hello: 'Shh… if we stay very still, the animals will come out. Click them when they peek out!', hint: 'Click each animal while it peeks out. New ones go in your journal.',
      doneIcon: '📔', doneTitle: s => `${s} sightings!`, doneText: (s, found) => `Today you spotted ${found.size} kinds of animal.` }) },
    { id: 'hide', name: 'Woodland hide and seek', icon: '🍂', blurb: 'The fox hides under a leaf pile. Can you find him?', run: () => shell({ host: { name: 'Lila-Bella', icon: '👧' }, scene: 'woods', rounds: 5, animal: '🦊', animalName: 'the fox', pile: '🍂', pileName: 'Leaf pile',
      hello: 'The little fox loves hide and seek! Watch which leaf pile he hides under.', hint: 'Watch the piles shuffle, then click the one hiding the fox.',
      peekSay: 'There he is! Now keep your eyes on that pile…', askSay: 'Where’s the fox?', missSay: 'Just leaves! The fox pops out from another pile, giggling.', praise: ['Found him!', 'Sharp eyes!', 'The fox wags his tail.'],
      doneText: f => f >= 4 ? 'The fox flops down beside you, tired out from laughing.' : 'The fox is very good at hiding! He wants to play again.' }) },
    { id: 'fireflies', name: 'Catch fireflies at dusk', icon: '✨', blurb: 'Gather glowing fireflies into a jar to light the treehouse.', run: () => pop({ host: { name: 'Lila-Bella', icon: '👧' }, scene: 'dusk', scoreIcon: '🫙', time: 30, life: 1.4, every: .5, max: 6,
      items: [{ icon: '✨', label: 'Firefly', weight: 5 }, { icon: '🌟', label: 'A bright firefly', points: 3, weight: 1, say: 'A really bright one!' }, { icon: '🦋', label: 'A moth', bad: true, weight: 1, say: 'That’s a moth! Let it flutter off.' }],
      hello: 'The sun’s going down and the fireflies are waking up. Let’s fill a jar, then let them go again!', hint: 'Click the glowing fireflies. Moths don’t glow!',
      doneIcon: '🫙', doneTitle: s => `${s} fireflies!`, doneText: () => 'The jar glows like a lantern on the treehouse balcony. Later, you let them all fly free.' }) },
  ] },
  garden: { title: 'The Royal Gardens', sub: 'Help Old Bramble tend the castle gardens.', games: [
    { id: 'tend', name: 'Tend the royal gardens', icon: '🌹', blurb: 'Water the flowers, pull weeds and snip roses.', run: () => pop({ host: BOUQUET.host, scene: 'garden', scoreIcon: '🌱', time: 45, life: 3, every: .8, max: 5, items: GARDEN_ITEMS,
      tools: [{ id: 'water', icon: '🚿', label: 'Watering can' }, { id: 'pull', icon: '🧤', label: 'Gloves' }, { id: 'snip', icon: '✂️', label: 'Shears' }],
      hello: 'The rose garden needs us! Water thirsty flowers, pull the weeds and snip roses for the castle vases.', hint: 'Choose a tool (or press 1–3), then click the plant that needs it.',
      doneIcon: '🌹', doneTitle: s => `${s} garden jobs done!`, doneText: s => s >= 25 ? 'The gardens have never looked finer. The queen herself stops to admire them.' : 'The gardens look fresh and happy. Old Bramble tips his hat to you.' }) },
    { id: 'bouquet', name: 'Arrange a bouquet', icon: '💐', blurb: 'Choose flowers for a room in the castle.', run: () => design(BOUQUET) },
  ] },
  'royal-kitchen': { title: 'The Royal Kitchens', sub: 'Help the royal cook prepare the banquet.', games: [
    { id: 'royal-cook', name: 'Help in the royal kitchens', icon: '🍲', blurb: 'Trifle, soup or honey pears for the banquet.', run: () => recipe(ROYAL_KITCHEN) },
  ] },
  'royal-event': { title: 'Host a Royal Event', sub: 'Plan a celebration in the ballroom.', games: [
    { id: 'event', name: 'Host a royal event', icon: '👑', blurb: 'Choose the occasion, decorations, banquet, music and guests.', again: 'Host another event', run: () => design(ROYAL_EVENT) },
  ] },
  stage: { title: 'The Village Stage', sub: 'A little stage beside the fountain.', games: [{ id: 'play', name: 'Star in a village play', icon: '🎭', blurb: 'Choose your lines and win the audience’s roses.', again: 'Choose another play', run: () => theatre(PLAYS) }] },
  festival: { title: 'The Lavender Festival', sub: 'Bunting, music and stalls in the lavender fields.', games: [
    { id: 'catch', name: 'Catch the festival treats', icon: '🧺', blurb: 'Lavender, ribbons and sweets tumble from the bunting.', run: () => catcher(FESTIVAL_CATCH) },
    { id: 'crown', name: 'Weave a flower crown', icon: '🌼', blurb: 'Every festival-goer wears one.', run: () => design(FLOWER_CROWN) },
  ] },
  horses: { title: 'Annalise’s Horses', sub: 'Visit Annalise’s paddock at the edge of the fields.', games: [
    { id: 'groom', name: 'Look after the horses', icon: '🐴', blurb: 'Feed, water, brush and spoil Clover, Duchess and Moonbeam.', run: () => care(HORSES) },
    { id: 'ride', name: 'Ride with Annalise', icon: '🏇', blurb: 'Gather apples along the lavender path.', run: () => catcher(RIDE) },
  ] },
  carpenter: { title: 'The Carpenter’s Shop', sub: 'Sawdust, shavings and hand-carved treasures.', games: [{ id: 'build', name: 'Make something with Tobias', icon: '🪚', blurb: 'A birdhouse, a toy boat or a jewellery box.', run: () => recipe(CARPENTER) }] },
  dress: { title: 'Madame Rosalind’s Dress Shop', sub: 'Silks, ruffles and ribbons in every colour.', games: [{ id: 'dress', name: 'Make a dress', icon: '👗', blurb: 'Choose the skirt, sleeves, colour, fabric and trim.', again: 'Make another dress', run: () => design(DRESS_SHOP) }] },
  haberdashery: { title: 'Penrose’s Haberdashery', sub: 'Ribbons, buttons, feathers and hats.', games: [{ id: 'hat', name: 'Trim a hat', icon: '👒', blurb: 'Choose a hat and trim it with ribbon and feathers.', again: 'Trim another hat', run: () => design(HABERDASHERY) }] },
  shoes: { title: 'Wren’s Shoe Shop', sub: 'Slippers, dancing shoes and sturdy boots.', games: [{ id: 'shoes', name: 'Make a pair of shoes', icon: '👠', blurb: 'Pick a style, colour and decoration.', again: 'Make another pair', run: () => design(SHOE_SHOP) }] },
  toys: { title: 'Mrs Pip’s Toy Shop', sub: 'Rocking horses, teddies and music boxes.', games: [{ id: 'gift', name: 'Choose and wrap a toy', icon: '🎁', blurb: 'Pick a toy and wrap it as a present for a friend.', again: 'Wrap another present', run: () => design(TOY_SHOP) }] },
  books: { title: 'Mabel’s Bookshop', sub: 'Tables of books spill out onto the street.', games: [{ id: 'book', name: 'Find the perfect book', icon: '📖', blurb: 'Tell Mabel what you love, and she’ll find a story.', again: 'Find another book', run: () => design(BOOKSHOP) }] },
  boating: { title: 'Boating on the Lake', sub: 'A sailboat waits at the villa dock.', games: [{ id: 'boat', name: 'Go boating with Cashamir', icon: '⛵', blurb: 'Gather water lilies and steer round the rocks.', run: () => catcher(BOATING) }] },
  'villa-animals': { title: 'The Villa Farm', sub: 'Peacocks, goats, ducklings and more.', games: [{ id: 'animals', name: 'Care for the animals', icon: '🦚', blurb: 'Feed, water, clean and cuddle every animal.', run: () => care(VILLA_ANIMALS) }] },
  'villa-dance': { title: 'Dancing in the Courtyard', sub: 'Lanterns, musicians and a marble floor.', games: [{ id: 'dance', name: 'Dance with Cashamir', icon: '💃', blurb: 'Follow his steps as the music grows faster.', sound: true, again: 'Dance again', run: () => simon(DANCE) }] },
  'villa-piano': { title: 'The Music Room', sub: 'Cashamir, the icy-blue prince, at the piano.', games: [{ id: 'piano', name: 'Watch Cashamir play piano', icon: '🎹', blurb: 'Listen to his melody, then play along.', sound: true, run: () => simon(PIANO) }] },
};

window.EmberActivities = { open, isOpen, close: () => dlg?.open && dlg.close(), HUBS, _store: store };
})();
