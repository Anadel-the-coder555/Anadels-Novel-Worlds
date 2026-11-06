// The treasure hunt engine: decides when the next episode happens, shows crewmates' invitations, plays episodes
// (narration, dialogue and choices), and keeps the treasures found. The story itself lives in quest.js.
// game.js creates it with window.createSoulmatesQuest(api) once the ship has loaded.
(() => {
'use strict';
const Q = window.SOULMATES_QUEST;
const SAVE_KEY = 'soulmates-quest-v1';
const FIRST_WAIT = 25, GAP = [40, 60], LATER = 30;   // seconds of exploring before the first event, between events, after "later"
const ALIAS = { goldtooth: 'clement', 'clement “goldtooth”': 'clement' };
const BGS = ['ballroom', 'town', 'jungle', 'river', 'sea', 'night', 'rival', 'chapel', 'eastern', 'temple'];
const $ = id => document.getElementById(id);
const byId = Object.fromEntries(Q.events.map(e => [e.id, e]));

window.createSoulmatesQuest = api => {
  let save = load();
  let clock = 0, nextAt = FIRST_WAIT, hook = null, heading = null, ep = null, active = false;
  const later = {};   // id -> clock time it was put off

  function load() {
    try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && Array.isArray(s.done)) return { done: s.done, items: s.items || [], pending: s.pending || null, lastKind: s.lastKind || 'plot' }; } catch (e) {}
    return { done: [], items: [], pending: null, lastKind: 'plot' };
  }
  function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }
  const done = id => save.done.includes(id);
  const level = () => save.items.length;
  const isLocked = key => Q.events.some(e => e.unlock === key && !done(e.id));

  // ---- what happens next ----
  function eligible(e) {
    if (e.level !== level() || done(e.id)) return false;
    if (!(e.requires || []).every(done)) return false;
    if (e.from && isLocked(e.from)) return false;
    if (e.final && Q.events.some(x => x.level === e.level && x !== e && !done(x.id))) return false;
    return true;
  }
  function pickNext() {
    const mine = Q.events.filter(e => e.level === level());
    const heart = mine.find(e => e.kind === 'heart' && eligible(e));
    if (heart) return heart;
    const firstPlot = mine.find(e => e.kind === 'plot' && !done(e.id));   // plot events happen in order
    const plot = firstPlot && eligible(firstPlot) ? firstPlot : null;
    const crew = mine.filter(e => e.kind === 'crew' && eligible(e)).sort((a, b) => (later[a.id] ?? -1) - (later[b.id] ?? -1));
    if (save.lastKind === 'plot' && crew.length) return crew[0];
    return plot || crew[0] || null;
  }
  function tick(dt) {
    if (!active || ep) return;
    if (heading) { if (api.room() === heading.goto) startEpisode(heading); return; }
    if (hook) return;
    clock += dt;
    if (clock >= nextAt) { const e = pickNext(); if (e) showHook(e); else nextAt = clock + 15; }
  }
  function lookForTrouble() {
    if (ep || hook) return;
    if (heading) { api.caption(heading.gotoHint || `Head to ${api.roomName(heading.goto)}.`, 4); return; }
    const e = pickNext();
    if (e) showHook(e); else api.caption('All quiet on deck… for now.', 3);
  }

  // ---- the invitation card on the stage ----
  function showHook(e) {
    hook = e;
    const card = $('questHook'), face = $('hookFace');
    const who = e.kind === 'crew' ? e.from : null;
    face.hidden = !who;
    if (who) face.setAttribute('style', api.face(who, 52));
    $('hookKind').textContent = e.kind === 'crew' ? `${api.name(who)} has an idea` : e.kind === 'heart' ? 'Someone new' : 'The plot thickens';
    $('hookTitle').textContent = e.title;
    $('hookText').textContent = e.hook;
    $('hookGo').textContent = e.accept || (e.kind === 'crew' ? 'Let’s do it!' : 'Find out');
    card.dataset.kind = e.kind;
    card.hidden = false;
    $('hookGo').focus({ preventScroll: true });
    updateLog();
  }
  function acceptHook() {
    const e = hook; if (!e) return;
    hook = null; $('questHook').hidden = true;
    if (e.goto && api.room() !== e.goto) {
      heading = e;
      api.caption(e.gotoHint || `Head to ${api.roomName(e.goto)}.`, 6);
      updateLog();
    } else startEpisode(e);
  }
  function postpone() {
    const e = hook; if (!e) return;
    hook = null; $('questHook').hidden = true;
    later[e.id] = clock; nextAt = clock + LATER;
    if (e.kind === 'crew') { save.lastKind = 'crew'; persist(); }   // give the plot a turn
    updateLog();
  }

  // ---- playing an episode ----
  function parse(line) {
    const m = /^([^:“]{1,40}):\s*“([\s\S]*)”$/.exec(line);
    return m ? { speaker: m[1].trim(), text: '“' + m[2] + '”' } : { speaker: '', text: line };
  }
  function speakerKey(name) {
    const n = name.replace(/\s*\(.*\)$/, '').trim().toLowerCase();
    if (ALIAS[n]) return ALIAS[n];
    return api.keys().find(k => k === n || api.name(k).toLowerCase() === n || api.name(k).toLowerCase() === 'captain ' + n) || null;
  }
  function startEpisode(e) {
    heading = null; hook = null; $('questHook').hidden = true;
    ep = { e, beat: 0, line: 0, phase: 'lines', score: 0, queue: [] };
    const box = $('episode');
    box.hidden = false;
    const bg = $('epScene');
    bg.className = 'ep-scene';
    bg.style.backgroundImage = '';
    if (BGS.includes(e.bg)) bg.classList.add('bg-' + e.bg);
    else if (e.bg === 'island' || api.roomImg(e.bg)) bg.style.backgroundImage = `url('${api.roomImg(e.bg)}')`;
    $('epKind').textContent = e.kind === 'crew' ? `${api.name(e.from)}’s idea` : e.kind === 'heart' ? 'Someone new' : 'The story';
    $('epTitle').textContent = e.title;
    api.pause(true);
    queueBeat();
    draw();
    setTimeout(() => $('epActions').querySelector('button')?.focus({ preventScroll: true }), 30);
  }
  function queueBeat() {
    const b = ep.e.beats[ep.beat];
    ep.text = b.text || '';
    ep.queue = (b.lines || []).map(parse);
    ep.line = 0;
    ep.phase = ep.queue.length ? 'lines' : (b.choices ? 'choose' : 'lines');
    ep.cast = b.cast || ep.e.cast || [];
  }
  function cast(speaking) {
    const row = $('epCast'); row.replaceChildren();
    ep.cast.filter(k => api.keys().includes(k) && (!api.isLocked(k) || k === ep.e.unlock)).forEach(k => {
      const fig = document.createElement('div');
      fig.className = 'ep-figure' + (k === speaking ? ' speaking' : '');
      fig.title = api.name(k);
      fig.setAttribute('style', api.figure(k, 260));
      row.appendChild(fig);
    });
  }
  function button(label, fn, cls) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = label;
    if (cls) b.className = cls;
    b.addEventListener('click', fn); $('epActions').appendChild(b); return b;
  }
  function draw() {
    const b = ep.e.beats[ep.beat];
    $('epText').textContent = ep.text;
    $('epActions').replaceChildren();
    $('epScore').hidden = true;
    const line = ep.phase === 'lines' || ep.phase === 'reply' ? ep.queue[ep.line] : null;
    const key = line?.speaker ? speakerKey(line.speaker) : null;
    $('epSpeaker').textContent = line?.speaker || '';
    $('epLine').textContent = line?.text || '';
    $('epSpeech').hidden = !line;
    $('epSpeech').classList.toggle('narration', !!line && !line.speaker);
    cast(key);
    if (ep.phase === 'lines' || ep.phase === 'reply') {
      if (!line) { advance(); return; }
      button('Next →', advance, 'primary');
    } else if (ep.phase === 'choose') {
      $('epPrompt').textContent = 'What do you do?';
      b.choices.forEach((c, i) => button(`${i + 1}. ${c.label}`, () => choose(c), 'choice'));
    } else if (ep.phase === 'end') drawEnd();
    $('epPrompt').hidden = ep.phase !== 'choose';
  }
  function advance() {
    if (ep.line < ep.queue.length - 1) { ep.line++; draw(); return; }
    const b = ep.e.beats[ep.beat];
    if (ep.phase === 'lines' && b.choices) { ep.phase = 'choose'; ep.queue = []; draw(); return; }
    nextBeat();
  }
  function choose(c) {
    ep.score += c.score || 0;
    ep.queue = (c.reply || []).map(parse); ep.line = 0; ep.phase = 'reply';
    if (!ep.queue.length) nextBeat(); else draw();
  }
  function nextBeat() {
    if (ep.beat < ep.e.beats.length - 1) { ep.beat++; queueBeat(); draw(); return; }
    ep.phase = 'end'; draw();
  }
  function drawEnd() {
    const e = ep.e;
    $('epSpeech').hidden = true;
    cast(null);
    if (e.pass && ep.score < e.pass) {
      $('epText').textContent = e.failText || 'Not quite. Try again!';
      button('Try again', () => { ep.beat = 0; ep.score = 0; queueBeat(); draw(); }, 'primary');
      button('Back to the ship (try later)', () => close(false));
      return;
    }
    const end = (e.ends || [[0, '']]).filter(([min]) => ep.score >= min).pop();
    $('epText').textContent = end[1];
    if (e.play) {
      button(e.play.label + ' →', () => { finish(e, true); location.href = e.play.href; }, 'primary');
      button('Skip the game, back to the ship', () => { finish(e); close(true); });
      return;
    }
    if (e.item !== undefined) {
      const tr = Q.treasures[e.item];
      $('epScore').hidden = false;
      $('epScore').innerHTML = '';
      const icon = document.createElement('span'); icon.className = 'ep-treasure-icon'; icon.textContent = tr.icon;
      const words = document.createElement('span');
      words.innerHTML = '<small>Treasure found!</small>';
      const name = document.createElement('b'); name.textContent = tr.name;
      const desc = document.createElement('em'); desc.textContent = tr.text;
      words.append(name, desc);
      $('epScore').append(icon, words);
    }
    finish(e);
    button(e.id === 'finale' ? 'Sail on' : 'Back to the ship', () => close(true), 'primary');
  }
  // `playing`: leaving for a mini-game page; the event is marked done now, and the return caption shows when the ship reloads
  function finish(e, playing) {
    if (done(e.id)) return;
    save.done.push(e.id);
    if (e.item !== undefined && !save.items.includes(e.item)) save.items.push(e.item);
    if (playing) save.pending = e.id;
    save.lastKind = e.kind === 'crew' ? 'crew' : 'plot';
    persist();
    nextAt = clock + GAP[0] + Math.random() * (GAP[1] - GAP[0]);
    if (e.unlock) api.unlock(e.unlock);
    if (e.item !== undefined) nextAt = clock + 20;   // the next villain's rumour arrives soon after
    updateHud();
  }
  function close(completed) {
    const e = ep?.e;
    ep = null; $('episode').hidden = true; api.pause(false);
    if (!completed && e) { later[e.id] = clock; nextAt = clock + LATER; }
    if (completed && e?.unlock) api.caption(`${api.name(e.unlock)} has joined the ship! Find them and invite them to walk with you.`, 6);
    else if (completed && e?.item !== undefined && level() < 3) api.caption(`${Q.treasures[e.item].name} is safe aboard. ${Q.rumours[level()]}`, 8);
    updateLog();
  }

  // ---- the HUD pill and the ship's log ----
  function updateHud() {
    const slots = $('treasureSlots'); slots.replaceChildren();
    Q.treasures.forEach((tr, i) => {
      const s = document.createElement('span');
      const found = save.items.includes(i);
      s.className = 'slot' + (found ? ' found' : '');
      s.textContent = found ? tr.icon : '?';
      s.title = found ? tr.name : 'Not found yet';
      slots.appendChild(s);
    });
    $('treasureCount').textContent = save.items.length;
    const list = $('treasureList'); list.replaceChildren();
    save.items.forEach(i => {
      const li = document.createElement('li'); const tr = Q.treasures[i];
      const b = document.createElement('b'); b.textContent = `${tr.icon} ${tr.name}`;
      li.append(b, ' ', tr.text); list.appendChild(li);
    });
    $('treasureEmpty').hidden = save.items.length > 0;
    updateLog();
  }
  function updateLog() {
    let text;
    if (heading) text = heading.gotoHint || `Head to ${api.roomName(heading.goto)}.`;
    else if (hook) text = hook.hook;
    else if (done('finale')) text = 'All three treasures are found. The two captains sail on together.';
    else text = Q.rumours[Math.min(level(), Q.rumours.length - 1)];
    $('questLog').textContent = text;
    $('questNow').textContent = heading ? 'Where was I going?' : 'Look for trouble';
    $('questNow').disabled = !!hook || done('finale');
  }

  // ---- keyboard inside the episode: Space/Enter for the main button, number keys for choices ----
  addEventListener('keydown', e => {
    if (!ep) return;
    if (e.key === 'Escape') return;
    if (/^[1-9]$/.test(e.key) && ep.phase === 'choose') {
      const c = ep.e.beats[ep.beat].choices[+e.key - 1]; if (c) { e.preventDefault(); choose(c); }
    } else if ((e.key === ' ' || e.key === 'Enter') && !e.target.closest?.('button')) {
      const b = $('epActions').querySelector('button.primary'); if (b) { e.preventDefault(); b.click(); }
    }
  });
  $('hookGo').addEventListener('click', acceptHook);
  $('hookLater').addEventListener('click', postpone);
  $('questNow').addEventListener('click', lookForTrouble);
  $('questReset').addEventListener('click', () => {
    if (!confirm('Start the treasure hunt over from the beginning? Treasures and new crewmates will be lost.')) return;
    save = { done: [], items: [], pending: null, lastKind: 'plot' }; persist();
    hook = heading = null; $('questHook').hidden = true; clock = 0; nextAt = FIRST_WAIT;
    api.restart();
  });

  // returning from a mini-game page
  function welcomeBack() {
    if (!save.pending) return;
    const e = byId[save.pending]; save.pending = null; persist();
    if (e?.back) api.caption(e.back, 7);
    nextAt = Math.min(nextAt, clock + 20);
  }

  updateHud();
  return {
    tick, isLocked, lookForTrouble,
    busy: () => !!ep,
    // the hunt runs only while exploring freely (not during the intro)
    setActive(on) {
      active = on;
      $('treasurePill').hidden = !on; $('questPanel').hidden = !on;
      if (!on) { hook = heading = null; $('questHook').hidden = true; }
      if (on) { welcomeBack(); updateLog(); }
    },
  };
};
})();
