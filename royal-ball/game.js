(() => {
'use strict';
// Each guest appears twice. `line` is what a prince says when the pair is found;
// `by` fixes which prince says it (the princes greet each other).
const GUESTS = [
  { id: 'ember', name: 'Ember', img: 'ember.png', tint: '#cfe1ea', line: 'Ember is here! The ball couldn’t start without her.' },
  { id: 'lila', name: 'Lila-Bella', img: 'lila-bella.png', tint: '#e3d6f1', line: 'Lila-Bella, right on time.' },
  { id: 'chin', name: 'The Chinchilla', img: 'chinchilla.png', tint: '#dfe8d3', line: 'The chinchilla has even worn its best coat.' },
  { id: 'ivory', name: 'Ivory & Gold Prince', img: 'prince-ivory.png', tint: '#efe4cf', line: 'There’s my friend in ivory and gold!', by: 'right' },
  { id: 'blue', name: 'Icy-Blue Prince', img: 'prince-blue.png', tint: '#d5e3ee', line: 'And there’s our prince in icy blue.', by: 'left' },
  { id: 'castle', name: 'The Castle', img: 'castle.jpg', tint: '#cfdde9', line: 'Every lantern in the castle is lit tonight.' },
];
const MISS_LINES = ['Not quite a pair.', 'Those two haven’t been introduced yet.', 'Close! Try another.', 'Hmm, not those two.'];
const BEST_KEY = 'royal-ball-best';

const $ = id => document.getElementById(id);
const board = $('board');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const crest = '<svg viewBox="0 0 64 64" aria-hidden="true"><path fill="currentColor" d="M8 22l12 10 12-18 12 18 12-10-5 26H13z"/><rect x="12" y="50" width="40" height="5" rx="1.5" fill="currentColor"/><circle cx="8" cy="20" r="3.5" fill="currentColor"/><circle cx="32" cy="11" r="3.5" fill="currentColor"/><circle cx="56" cy="20" r="3.5" fill="currentColor"/></svg>';

let deck = [], up = [], matched = 0, moves = 0, locked = false, startTime = 0, timer = null, speaker = 'left';

function loadBest() { try { const v = JSON.parse(localStorage.getItem(BEST_KEY)); return v && v.moves ? v : null; } catch (e) { return null; } }
function saveBest(v) { try { localStorage.setItem(BEST_KEY, JSON.stringify(v)); } catch (e) {} }
const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

// ---- speech ----
const speechTimers = {};
function say(side, text, ms = 2600) {
  const el = side === 'left' ? $('speechLeft') : $('speechRight');
  el.textContent = text; el.classList.add('on');
  clearTimeout(speechTimers[side]);
  speechTimers[side] = setTimeout(() => el.classList.remove('on'), ms);
}
function nextSpeaker() { speaker = speaker === 'left' ? 'right' : 'left'; return speaker; }

// ---- sound ----
let ac = null;
function audio() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } } if (ac && ac.state === 'suspended') ac.resume(); }
function tone(freqs, dur, type = 'triangle', vol = .045, gap = .07) {
  if (!ac) return; const t0 = ac.currentTime;
  freqs.forEach((f, i) => { const o = ac.createOscillator(), g = ac.createGain(), s = t0 + i * gap; o.type = type; o.frequency.value = f; g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(vol, s + .01); g.gain.exponentialRampToValueAtTime(.0001, s + dur); o.connect(g).connect(ac.destination); o.start(s); o.stop(s + dur + .05); });
}

// ---- stats ----
function stats() {
  $('pairs').textContent = `${matched} / ${GUESTS.length}`;
  $('moves').textContent = moves;
  $('time').textContent = fmt(startTime ? Math.floor((Date.now() - startTime) / 1000) : 0);
  const b = loadBest(); $('best').textContent = b ? `${b.moves} moves` : '–';
}

// ---- deal ----
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function deal() {
  clearInterval(timer); timer = null; startTime = 0;
  deck = shuffle([...GUESTS, ...GUESTS].map((g, i) => ({ ...g, key: i })));
  up = []; matched = 0; moves = 0; locked = false;
  board.innerHTML = '';
  deck.forEach((c, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'cardbtn'; b.id = 'card-' + i;
    b.setAttribute('aria-label', 'Face-down card');
    b.innerHTML = `<div class="inner"><div class="face back">${crest}</div><div class="face front" style="--tint:${c.tint}"><img src="${c.img}" alt=""><div class="name">${c.name}</div></div></div>`;
    b.addEventListener('click', () => flip(i));
    c.el = b;
    board.appendChild(b);
  });
  $('winCard').hidden = true;
  stats();
  say('left', 'Welcome to the ball!', 3000);
  setTimeout(() => say('right', 'Help us pair up the guests.', 3000), 700);
}

function flip(i) {
  const c = deck[i];
  if (locked || c.matched || up.includes(i)) return;
  audio();
  if (!startTime) { startTime = Date.now(); timer = setInterval(stats, 1000); }
  c.el.classList.add('up'); c.el.setAttribute('aria-label', c.name);
  up.push(i);
  tone([660], .12, 'sine', .03);
  if (up.length < 2) return;

  moves++;
  const [a, b] = up.map(k => deck[k]);
  if (a.id === b.id) {
    [a, b].forEach(card => { card.matched = true; card.el.classList.add('matched'); card.el.setAttribute('aria-disabled', 'true'); card.el.setAttribute('aria-label', card.name + ', matched'); });
    up = []; matched++;
    tone([784, 988, 1175], .35, 'triangle', .045);
    say(a.by || nextSpeaker(), a.line);
    if (matched === GUESTS.length) win();
  } else {
    locked = true;
    if (Math.random() < .45) say(nextSpeaker(), MISS_LINES[Math.floor(Math.random() * MISS_LINES.length)], 1500);
    setTimeout(() => {
      [a, b].forEach(card => card.el.classList.add('miss'));
    }, reduceMotion ? 0 : 450);
    setTimeout(() => {
      [a, b].forEach(card => { card.el.classList.remove('up', 'miss'); card.el.setAttribute('aria-label', 'Face-down card'); });
      up = []; locked = false;
    }, 1100);
  }
  stats();
}

function win() {
  clearInterval(timer); timer = null;
  const secs = Math.floor((Date.now() - startTime) / 1000);
  const prev = loadBest();
  const isBest = !prev || moves < prev.moves || (moves === prev.moves && secs < prev.secs);
  if (isBest) saveBest({ moves, secs });
  stats();
  tone([523, 659, 784, 1047, 1319], .6, 'triangle', .05, .11);
  say('left', 'Splendid! Every guest has a partner.', 4000);
  setTimeout(() => say('right', 'Shall we dance?', 4000), 600);
  $('winText').textContent = `You paired every guest in ${moves} moves and ${fmt(secs)}.` +
    (isBest ? (prev ? ' That’s a new best!' : ' That’s your first best score.') : ` Your best is ${prev.moves} moves.`);
  setTimeout(() => { $('winCard').hidden = false; $('againBtn').focus(); }, 1200);
}

$('resetBtn').addEventListener('click', deal);
$('againBtn').addEventListener('click', deal);
deal();
})();
