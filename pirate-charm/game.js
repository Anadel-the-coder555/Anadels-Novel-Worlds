(() => {
'use strict';
// ---- stage constants (logical 960x540) ----
const VW = 960, VH = 540, BG_H = 600, BG_YOFF = -60;
const GY = 520, ADULT = 330, BOY_X = 330, LADY_X = 640, WIN = 80, ROUNDS = 5, SECS = 10;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const P = {
  cutlass:     { name: 'Captain Cutlass', short: 'Cutlass', img: 'cutlass.png', size: 1.02, face: [.46, .085, .13] },
  jade:        { name: 'Jade', short: 'Jade', img: 'jade.png', size: 1, face: [.5, .075, .13] },
  monsoon:     { name: 'Monsoon', short: 'Monsoon', img: 'monsoon.png', size: 1, face: [.5, .085, .13] },
  stormcaller: { name: 'Stormcaller', short: 'Stormcaller', img: 'stormcaller.png', size: 1, face: [.5, .075, .13] },
  crispin:     { name: 'Crispin', short: 'Crispin', img: 'crispin.png', size: 1, face: [.5, .075, .13] },
  absalom:     { name: 'Absalom', short: 'Absalom', img: 'absalom.png', size: .94, face: [.5, .1, .14] },
  scarlett:    { name: 'Scarlett', short: 'Scarlett', img: 'scarlett.png', size: .96, face: [.48, .085, .14] },
  marietta:    { name: 'Marietta', short: 'Marietta', img: 'marietta.png', size: .97, face: [.5, .085, .14] },
  arabella:    { name: 'Arabella', short: 'Arabella', img: 'arabella.png', size: .96, face: [.455, .09, .14] },
  odessa:      { name: 'Odessa', short: 'Odessa', img: 'odessa.png', size: .97, face: [.45, .093, .14] },
  ruby:        { name: 'Captain Ruby', short: 'Ruby', img: 'ruby.png', size: 1, face: [.42, .1, .14] },
};
const BOYS = ['cutlass', 'jade', 'monsoon', 'stormcaller', 'crispin', 'absalom'];

// Each lady scores a choice by its tags. The hint on her card is all the player gets to go on.
const LADIES = {
  scarlett: { hint: 'Fearless and quick with a mop. Loves courage and a good laugh. Can’t stand a show-off.', start: 25,
    likes: { bold: 22, funny: 20, honest: 12, helpful: 8, clean: 8, respect: 8, sweet: 6, food: 6, poetic: -6, brag: -18, rum: -10, gross: -22 },
    love: ['Ha! Now THAT’s a pirate.', 'You’re braver than you look.', 'Alright, you made me laugh.'], like: ['Not bad, sailor.', 'Heh. Go on.'], meh: ['Is that it?', 'Mm-hm.'],
    no: ['Ugh. Really?', 'Try again, barnacle.'], disaster: ['*SPLASH* That’s what the bucket is for.'] },
  marietta: { hint: 'Ruby’s right hand. Practical and honest. Values a helping hand. Hates flattery and boasting.', start: 25,
    likes: { helpful: 24, honest: 20, respect: 14, clean: 10, funny: 6, food: 6, bold: 4, sweet: 2, poetic: -6, brag: -20, rum: -14, gross: -24 },
    love: ['Well. That’s actually very kind.', 'You mean that? …Thank you.', 'Finally, someone useful.'], like: ['That’s sensible.', 'Hm. I appreciate that.'], meh: ['Right.', 'If you say so.'],
    no: ['Flattery won’t mop the deck.', 'I have barrels to count.'], disaster: ['*SPLASH* I’ll be telling the captain.'] },
  arabella: { hint: 'The lookout, always up in the crow’s nest. A dreamer who loves adventure and poetry.', start: 25,
    likes: { poetic: 24, bold: 18, sweet: 12, funny: 8, honest: 8, respect: 6, helpful: 4, clean: 4, food: 2, brag: -10, rum: -10, gross: -24 },
    love: ['Oh! Say that again, slowly.', 'You sound like a sea shanty.', '*sighs dreamily*'], like: ['How lovely.', 'You’re sweeter than you look.'], meh: ['Hmm? Sorry, I was watching a gull.', 'Oh. Okay.'],
    no: ['That’s not very romantic.', 'I’d rather be up the mast.'], disaster: ['*SPLASH* From the crow’s nest, too.'] },
  odessa:   { hint: 'The ship’s cook. Feed her compliments about her cooking and she’s yours. Never be gross in her galley.', start: 25,
    likes: { food: 26, sweet: 18, helpful: 12, honest: 10, funny: 8, clean: 8, respect: 8, poetic: 6, bold: 2, brag: -14, rum: -12, gross: -26 },
    love: ['You liked my stew? Really?', 'Oh, you sweet thing. Have a biscuit.', 'Come by the galley anytime.'], like: ['Aw. That’s nice.', 'You can stay for supper.'], meh: ['Mm. The bread’s burning.', 'Sure, sure.'],
    no: ['Out of my galley.', 'Not with those hands.'], disaster: ['*SPLASH* And no pudding for you.'] },
  ruby:     { hint: 'The captain. Respect her ship, wash behind your ears, and never, ever mention rum.', start: 15,
    likes: { respect: 22, clean: 22, honest: 14, helpful: 12, bold: 6, food: 4, funny: 2, sweet: 2, poetic: 0, brag: -20, gross: -28, rum: -30 },
    love: ['…That was unexpectedly decent.', 'Hm. You may stay on my ship.', 'Careful. I might start to like you.'], like: ['Acceptable.', 'Better than I expected.'], meh: ['And?', 'I’m waiting.'],
    no: ['Do you WANT to swab the deck?', 'Absolutely not.'], disaster: ['*SPLASH* Wash. Now.'] },
};
const LADY_KEYS = Object.keys(LADIES);

// rounds: two chats, a gift, another chat, then the big question
const PLAN = ['chat', 'chat', 'gift', 'chat', 'ask'];
const CHAT = [
  { text: 'I’d sail into any storm if you were at the helm.', tags: ['bold', 'sweet'] },
  { text: 'Race you to the top of the rigging?', tags: ['bold', 'funny'] },
  { text: 'I saw you in the ambush. You fight like a hurricane.', tags: ['bold', 'honest'] },
  { text: 'Are you a cannonball? Because you just blew a hole in my heart.', tags: ['funny'] },
  { text: 'I’d tell you a joke about the sea, but it’s too deep.', tags: ['funny'] },
  { text: 'My crew bet me I couldn’t make you smile. Help a pirate out?', tags: ['funny', 'honest'] },
  { text: 'Your smile is brighter than a lighthouse.', tags: ['sweet'] },
  { text: 'You have lovely eyes. Both of them. Equally.', tags: ['sweet', 'funny'] },
  { text: 'The sea is wide, the stars are bright, but none of them shine like you tonight.', tags: ['poetic'] },
  { text: 'If I were a map, every road would lead to you.', tags: ['poetic', 'sweet'] },
  { text: 'Need a hand with those barrels?', tags: ['helpful'] },
  { text: 'I’ll take your night watch so you can sleep.', tags: ['helpful', 'sweet'] },
  { text: 'I patched that torn sail you were worried about.', tags: ['helpful'] },
  { text: 'Honestly? I’m terrible at this. But I wanted to talk to you.', tags: ['honest'] },
  { text: 'I practised this line all morning and now I’ve forgotten it.', tags: ['honest', 'funny'] },
  { text: 'I once wrestled a shark. Two sharks. Fairly small sharks.', tags: ['brag'] },
  { text: 'Have you seen my sword? It’s very big and very shiny.', tags: ['brag'] },
  { text: 'I’m the most handsome pirate on this ship. Ask anyone. Ask me.', tags: ['brag', 'funny'] },
  { text: 'I haven’t washed in nine days. I was saving the water for you.', tags: ['gross'] },
  { text: '*burps* Pardon. That’s a compliment where I’m from.', tags: ['gross'] },
  { text: 'Fancy a sip of rum? I smuggled a little aboard.', tags: ['rum'] },
  { text: 'Your captain runs the finest ship I’ve ever seen.', tags: ['respect'] },
  { text: 'I washed. With soap. Behind the ears and everything.', tags: ['clean', 'funny'] },
  { text: 'I scrubbed under my fingernails for you. It took an hour.', tags: ['clean'] },
  { text: 'That stew last night was the best thing I’ve eaten in months.', tags: ['food', 'sweet'] },
  { text: 'Could you teach me to bake bread like yours?', tags: ['food', 'helpful'] },
];
const GIFTS = [
  { text: 'A perfect pink seashell', tags: ['sweet'] },
  { text: 'A rubber duck named Admiral Quackers', tags: ['funny'] },
  { text: 'A fresh fish (still wiggling)', tags: ['food', 'gross'] },
  { text: 'A hand-drawn map to a secret cove', tags: ['poetic', 'bold'] },
  { text: 'A bottle of rum with a bow on it', tags: ['rum'] },
  { text: 'A bar of lavender soap', tags: ['clean'] },
  { text: 'A polished brass compass', tags: ['respect', 'helpful'] },
  { text: 'A love poem (it rhymes “heart” with “fart”)', tags: ['poetic', 'gross', 'funny'] },
  { text: 'His lucky sock, unwashed for luck', tags: ['gross'] },
  { text: 'A jar of island honey for the galley', tags: ['food', 'sweet'] },
];
const ASKS = [
  { text: 'Will you dance with me at the ball?', tags: ['sweet', 'bold'] },
  { text: 'Watch the sunset with me from the crow’s nest?', tags: ['poetic', 'bold'] },
  { text: 'Can I help you scrub the deck tomorrow?', tags: ['helpful', 'funny'] },
  { text: 'Have supper with me? I’ll do the washing up.', tags: ['food', 'helpful'] },
  { text: 'Arm-wrestle me. Loser swabs the deck.', tags: ['bold', 'funny'] },
  { text: 'Share my rum ration?', tags: ['rum'] },
  { text: 'Will you tell your captain I’m not as bad as she thinks?', tags: ['respect', 'honest'] },
  { text: 'Marry me? …Too soon? Too soon.', tags: ['brag', 'funny'] },
];

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const $ = id => document.getElementById(id);
let K = 1;
function resize() {
  const r = canvas.getBoundingClientRect();
  if (!r.width) return;
  K = Math.min(2.5, (r.width / VW) * (window.devicePixelRatio || 1));
  canvas.width = Math.round(VW * K); canvas.height = Math.round(VH * K);
}
new ResizeObserver(resize).observe(canvas);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const wait = ms => new Promise(r => setTimeout(r, ms));

// ---- state ----
let deck, t = 0, me = 'cutlass', lady = null, heart = 0, shown = 0, round = 0, runId = 0;
let bubbles = [], hearts = [], drops = [], hop = { boy: 0, lady: 0 }, shake = 0, soaked = 0;
function loadCharmed() { try { return new Set(JSON.parse(localStorage.getItem('pirate-charm')) || []); } catch (e) { return new Set(); } }
const charmed = loadCharmed();
function saveCharmed() { try { localStorage.setItem('pirate-charm', JSON.stringify([...charmed])); } catch (e) {} }

// ---- sound ----
let ac = null, muted = false;
function audio() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } } if (ac && ac.state === 'suspended') ac.resume(); }
function tone(freqs, dur = .15, type = 'triangle', vol = .05, gap = .08) {
  if (!ac || muted) return;
  freqs.forEach((f, i) => { const t0 = ac.currentTime + i * gap, o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur); o.connect(g).connect(ac.destination); o.start(t0); o.stop(t0 + dur + .02); });
}
function splashSound() {
  if (!ac || muted) return; const n = ac.sampleRate * .5, buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); f.type = 'lowpass'; f.frequency.value = 1400; g.gain.value = .35;
  s.buffer = buf; s.connect(f).connect(g).connect(ac.destination); s.start();
}
$('mute').addEventListener('click', () => { muted = !muted; $('mute').textContent = muted ? 'Sound off' : 'Sound on'; $('mute').setAttribute('aria-pressed', muted); });

// ---- menus ----
function faceStyle(key, size) {
  const p = P[key], img = p.img_, s = size / (p.face[2] * img.height);
  return `background-image:url('${p.img}');background-size:${img.width * s}px ${img.height * s}px;background-position:${-(p.face[0] * img.width * s - size / 2)}px ${-(p.face[1] * img.height * s - size / 2)}px`;
}
function show(id) { ['boyCard', 'ladyCard', 'endCard'].forEach(c => $(c).hidden = c !== id); }
function buildMenus() {
  BOYS.forEach(k => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'who'; b.dataset.k = k;
    b.innerHTML = `<span class="face" style="${faceStyle(k, 60)}"></span><b>${P[k].short}</b>`;
    b.addEventListener('click', () => { me = k; audio(); ladyMenu(); });
    $('boyPick').appendChild(b);
  });
  $('backBtn').addEventListener('click', () => { show('boyCard'); idle('Choose your charmer to begin.'); });
}
function ladyMenu() {
  lady = null; bubbles = []; soaked = 0;
  $('ladyTitle').textContent = `Who will ${P[me].short} try to charm?`;
  const box = $('ladyPick'); box.innerHTML = '';
  LADY_KEYS.forEach(k => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'who' + (charmed.has(k) ? ' charmed' : ''); b.dataset.k = k;
    b.innerHTML = `<span class="face" style="${faceStyle(k, 56)}"></span><b>${P[k].short}</b><span class="tier">${k === 'ruby' ? 'very hard' : 'a lady of the crew'}</span><span class="likes">${LADIES[k].hint}</span>`;
    b.addEventListener('click', () => begin(k));
    box.appendChild(b);
  });
  $('vsPill').textContent = `${P[me].short} is feeling brave`; $('roundPill').hidden = true;
  show('ladyCard'); idle('Pick a lady to charm.');
}
$('againBtn').addEventListener('click', ladyMenu);

// ---- the choice picker under the stage ----
let resolveChoice = null, askTimer = 0;
function ask(prompt, options, secs) {
  $('prompt').innerHTML = prompt;
  const box = $('lines'); box.innerHTML = '';
  options.forEach((o, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'line';
    b.innerHTML = `<kbd>${i + 1}</kbd><span></span>`; b.children[1].textContent = o.text;
    b.addEventListener('click', () => choose(i));
    box.appendChild(b);
  });
  const bar = $('timer'); bar.hidden = !secs;
  if (secs) { const fill = bar.firstElementChild; fill.style.animation = 'none'; void fill.offsetWidth; fill.style.animation = `drain ${secs}s linear forwards`; }
  return new Promise(r => {
    resolveChoice = v => r(v === -1 ? { text: 'Uh… nice… weather… we’re having… on the sea.', tags: ['dull'] } : options[v]);
    clearTimeout(askTimer);
    if (secs) askTimer = setTimeout(() => { if (resolveChoice) choose(-1); }, secs * 1000);
  });
}
function choose(i) {
  if (!resolveChoice) return;
  const r = resolveChoice; resolveChoice = null; clearTimeout(askTimer); $('timer').hidden = true;
  document.querySelectorAll('.line').forEach(b => b.disabled = true);
  audio(); r(i);
}
function idle(text) { $('prompt').innerHTML = text; $('lines').innerHTML = ''; resolveChoice = null; clearTimeout(askTimer); $('timer').hidden = true; }
addEventListener('keydown', e => {
  const n = parseInt(e.key, 10);
  if (resolveChoice && n >= 1 && n <= $('lines').children.length) { e.preventDefault(); choose(n - 1); }
});

// ---- the date ----
const scoreOf = (o, k) => o.tags.reduce((a, tag) => a + (LADIES[k].likes[tag] ?? (tag === 'dull' ? -8 : 0)), 0);
function offer(pool, k) {
  // four choices: at least one she'll like, at least one disaster for comedy, the rest at random
  const sh = shuffle(pool), good = sh.find(o => scoreOf(o, k) >= 14), bad = sh.find(o => scoreOf(o, k) <= -14 && o !== good);
  const rest = sh.filter(o => o !== good && o !== bad).slice(0, 4 - [good, bad].filter(Boolean).length);
  return shuffle([good, bad, ...rest].filter(Boolean));
}
function say(who, text, ms = 2600) { bubbles = bubbles.filter(b => b.who !== who); bubbles.push({ who, text, until: t + ms / 1000 }); }
function burst(n, col = '#e84a6f') { for (let i = 0; i < n; i++) hearts.push({ x: LADY_X + (Math.random() - .5) * 80, y: GY - ADULT * .8, vx: (Math.random() - .5) * 90, vy: -60 - Math.random() * 90, life: 0, col }); }
function splash() { soaked = 4; splashSound(); for (let i = 0; i < 46; i++) drops.push({ x: BOY_X + (Math.random() - .5) * 120, y: GY - ADULT * 1.15 - Math.random() * 40, vx: (Math.random() - .5) * 120, vy: 40 + Math.random() * 160, life: 0 }); }

async function begin(k) {
  const id = ++runId; lady = k; heart = shown = LADIES[k].start; round = 0; bubbles = []; soaked = 0;
  if (me === 'cutlass' && k === 'ruby') heart = shown = 10;   // she has not forgotten the ambush
  show(null); $('roundPill').hidden = false;
  $('vsPill').textContent = `${P[me].short} ♥ ${P[k].short}?`;
  say('lady', pick(['What do YOU want?', 'Oh. It’s one of Cutlass’s boys.', 'Make it quick, I’m busy.', 'Hmm?']), 2400);
  await wait(1800); if (id !== runId) return;
  for (round = 1; round <= ROUNDS; round++) {
    $('round').textContent = round;
    const kind = PLAN[round - 1];
    const prompt = kind === 'gift' ? `What will ${P[me].short} give <i>${P[k].short}</i>?` : kind === 'ask' ? `The big question. What will ${P[me].short} ask her?` : `What will ${P[me].short} say to <i>${P[k].short}</i>?`;
    const choice = await ask(prompt, offer(kind === 'gift' ? GIFTS : kind === 'ask' ? ASKS : CHAT, k), SECS);
    if (id !== runId) return;
    hop.boy = .4; say('boy', kind === 'gift' ? `For you: ${choice.text.charAt(0).toLowerCase() + choice.text.slice(1)}.` : choice.text, 2600);
    idle(`${P[k].short} is thinking…`);
    await wait(1700); if (id !== runId) return;
    react(choice, kind);
    await wait(2300); if (id !== runId) return;
    if (heart >= 100 || heart <= 0) break;
  }
  finish();
}
function react(choice, kind) {
  const L = LADIES[lady], d = scoreOf(choice, lady) * (kind === 'ask' ? 1.3 : 1) + Math.round((Math.random() - .5) * 6);
  heart = clamp(heart + d, 0, 100);
  if (d >= 15) { say('lady', pick(L.love)); burst(16); hop.lady = .5; tone([659, 784, 988, 1319], .18, 'sine', .05); }
  else if (d >= 5) { say('lady', pick(L.like)); burst(5); tone([587, 740], .15, 'sine', .04); }
  else if (d > -5) { say('lady', pick(L.meh)); tone([440, 415], .2, 'triangle', .03); }
  else if (d > -20) { say('lady', pick(L.no)); shake = .4; tone([330, 247], .25, 'square', .03); }
  else { say('lady', pick(L.disaster)); splash(); shake = .5; }
}
function finish() {
  idle('');
  const won = heart >= WIN, k = lady, L = P[k].short, B = P[me].short;
  if (won) { charmed.add(k); saveCharmed(); burst(30); tone([523, 659, 784, 1047, 1319], .25, 'sine', .05, .12); }
  $('endEyebrow').textContent = won ? 'Charmed!' : heart >= 50 ? 'Maybe…' : 'Rejected';
  $('endTitle').textContent = won ? `${L} said yes!` : heart >= 50 ? `${L} will think about it` : `${L} said no`;
  const special = me === 'cutlass' && k === 'ruby'
    ? (won ? 'Ruby: “Don’t let it go to your head, Captain.” She is smiling, though. Everyone saw it.' : 'Ruby: “Nice try, Captain. Go and wash.”')
    : won ? `${B} is strutting around the deck like he just found treasure.` : heart >= 50 ? `${L} didn’t say no. ${B} is counting that as a win.` : `${B} squelches off to tell the boys it went great.`;
  $('endText').textContent = `Her heart: ${Math.round(heart)} out of 100. ${special}`;
  show('endCard'); $('againBtn').focus();
  $('vsPill').textContent = `${charmed.size} of ${LADY_KEYS.length} ladies charmed`;
}

// ---- update & draw ----
function update(dt) {
  t += dt;
  shown += (heart - shown) * Math.min(1, dt * 4);
  hop.boy = Math.max(0, hop.boy - dt); hop.lady = Math.max(0, hop.lady - dt); shake = Math.max(0, shake - dt); soaked = Math.max(0, soaked - dt);
  hearts.forEach(h => { h.life += dt; h.x += h.vx * dt; h.y += h.vy * dt; h.vy += 30 * dt; }); hearts = hearts.filter(h => h.life < 1.8);
  drops.forEach(d => { d.life += dt; d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 600 * dt; }); drops = drops.filter(d => d.life < 1.2 && d.y < GY + 10);
  bubbles = bubbles.filter(b => b.until > t);
}
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function wrap(text, max) { const out = []; let line = ''; text.split(' ').forEach(w => { const tl = line ? line + ' ' + w : w; if (ctx.measureText(tl).width > max && line) { out.push(line); line = w; } else line = tl; }); if (line) out.push(line); return out; }
function bubble(x, y, text, name) {
  ctx.font = '19px "IM Fell English", Georgia, serif';
  const lines = wrap(text, 270), w = Math.min(310, Math.max(...lines.map(l => ctx.measureText(l).width)) + 30);
  const lh = 23, h = 30 + lines.length * lh, bx = clamp(x - w / 2, 8, VW - w - 8), by = Math.max(8, y - h - 16), tip = clamp(x, bx + 16, bx + w - 16);
  ctx.fillStyle = 'rgba(0,0,0,.2)'; rr(bx + 2, by + 3, w, h, 10); ctx.fill();
  ctx.fillStyle = '#fff8ea'; rr(bx, by, w, h, 10); ctx.fill();
  ctx.beginPath(); ctx.moveTo(tip - 8, by + h - 1); ctx.lineTo(tip, by + h + 11); ctx.lineTo(tip + 8, by + h - 1); ctx.fill();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '700 12px "Alegreya Sans", sans-serif'; ctx.fillStyle = '#9b7230'; ctx.fillText(name.toUpperCase(), bx + w / 2, by + 13);
  ctx.font = '19px "IM Fell English", Georgia, serif'; ctx.fillStyle = '#3a2816'; lines.forEach((l, i) => ctx.fillText(l, bx + w / 2, by + 24 + lh / 2 + i * lh));
}
function heartPath(x, y, s) { ctx.beginPath(); ctx.moveTo(x, y + s * .35); ctx.bezierCurveTo(x - s * 1.1, y - s * .45, x - s * .45, y - s * 1.05, x, y - s * .45); ctx.bezierCurveTo(x + s * .45, y - s * 1.05, x + s * 1.1, y - s * .45, x, y + s * .35); ctx.closePath(); }
function figure(k, x, opts = {}) {
  const p = P[k], img = p.img_, h = ADULT * p.size, w = img.width * h / img.height;
  const up = opts.hop > 0 && !reduceMotion ? Math.sin(Math.min(1, opts.hop / .4) * Math.PI) * 16 : 0, sx = opts.shake > 0 && !reduceMotion ? Math.sin(t * 60) * 5 * opts.shake : 0;
  ctx.fillStyle = 'rgba(40,25,10,.28)'; ctx.beginPath(); ctx.ellipse(x, GY, h * .2, 7, 0, 0, 7); ctx.fill();
  ctx.save(); ctx.translate(x + sx, GY - up); if (opts.flip) ctx.scale(-1, 1);
  ctx.drawImage(img, -w / 2, -h, w, h);
  if (opts.wet) { ctx.globalAlpha = Math.min(1, opts.wet) * .5; ctx.drawImage(wetImg(k), -w / 2, -h, w, h); ctx.globalAlpha = 1; }
  ctx.restore();
  return GY - h - up;
}
// a soaked, blue-tinted copy of someone (made once, then reused)
function wetImg(k) {
  const p = P[k]; if (p.wet) return p.wet;
  const c = document.createElement('canvas'); c.width = p.img_.width; c.height = p.img_.height;
  const g = c.getContext('2d'); g.drawImage(p.img_, 0, 0); g.globalCompositeOperation = 'source-atop';
  const gr = g.createLinearGradient(0, 0, 0, c.height); gr.addColorStop(0, '#3f86c4'); gr.addColorStop(.65, '#5b9bd0'); gr.addColorStop(.75, 'rgba(91,155,208,0)');
  g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
  return (p.wet = c);
}
function render() {
  ctx.setTransform(K, 0, 0, K, 0, 0);
  ctx.imageSmoothingQuality = 'high';
  const bw = deck.width * BG_H / deck.height;
  ctx.drawImage(deck, -(bw - VW) * .35, BG_YOFF, bw, BG_H);
  if (!lady) return;
  // a warm sunset glow for romance
  const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, 'rgba(255,150,120,.18)'); g.addColorStop(1, 'rgba(255,200,150,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  const boyTop = figure(me, BOY_X, { hop: hop.boy, wet: soaked }), ladyTop = figure(lady, LADY_X, { hop: hop.lady, shake });
  drops.forEach(d => { ctx.globalAlpha = 1 - d.life / 1.2; ctx.fillStyle = '#9fd3f5'; ctx.beginPath(); ctx.ellipse(d.x, d.y, 3, 6, 0, 0, 7); ctx.fill(); });
  ctx.globalAlpha = 1;
  if (soaked > 0) { ctx.save(); ctx.translate(BOY_X - 10, boyTop - 30 - Math.max(0, soaked - 3) * 80); ctx.rotate(Math.PI * .85); ctx.fillStyle = '#8a8f95'; ctx.beginPath(); ctx.moveTo(-26, -20); ctx.lineTo(26, -20); ctx.lineTo(20, 22); ctx.lineTo(-20, 22); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#6b7178'; ctx.fillRect(-28, -24, 56, 6); ctx.restore(); }
  hearts.forEach(h => { ctx.globalAlpha = 1 - h.life / 1.8; ctx.fillStyle = h.col; heartPath(h.x, h.y, 10); ctx.fill(); });
  ctx.globalAlpha = 1;
  // her heart meter
  const mx = VW - 56, my = 110, mh = 280;
  ctx.fillStyle = 'rgba(15,26,34,.55)'; rr(mx - 20, my - 14, 40, mh + 64, 20); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.15)'; rr(mx - 9, my, 18, mh, 9); ctx.fill();
  const fill = mh * clamp(shown, 0, 100) / 100;
  const hg = ctx.createLinearGradient(0, my + mh, 0, my); hg.addColorStop(0, '#9b3b5a'); hg.addColorStop(1, '#ff7aa2');
  ctx.fillStyle = hg; rr(mx - 9, my + mh - fill, 18, Math.max(0, fill), 9); ctx.fill();
  const wy = my + mh * (1 - WIN / 100); ctx.strokeStyle = '#ffe08a'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(mx - 15, wy); ctx.lineTo(mx + 15, wy); ctx.stroke(); ctx.setLineDash([]);
  const pulse = 1 + (reduceMotion ? 0 : Math.sin(t * 5) * .06 * shown / 100);
  ctx.fillStyle = '#e84a6f'; heartPath(mx, my + mh + 28, 17 * pulse); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '700 12px "Alegreya Sans", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(Math.round(shown), mx, my + mh + 24);
  bubbles.forEach(b => b.who === 'boy' ? bubble(BOY_X, boyTop - 6, b.text, P[me].short) : bubble(LADY_X, ladyTop - 6, b.text, P[lady].short));
}

// ---- loop ----
let last = 0;
function frame(now) { const dt = Math.min(.05, (now - last) / 1000 || 0); last = now; update(dt); render(); requestAnimationFrame(frame); }
function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Could not load ' + src)); i.src = src; }); }

(async () => {
  resize();
  try { await Promise.race([document.fonts.load('19px "IM Fell English"'), document.fonts.load('18px "Pirata One"'), new Promise(r => setTimeout(r, 1500))]); } catch (e) {}
  [deck] = await Promise.all([loadImg('ship-deck.jpg'), ...Object.values(P).map(async p => { p.img_ = await loadImg(p.img); })]);
  buildMenus();
  requestAnimationFrame(now => { last = now; requestAnimationFrame(frame); });
})();
})();
