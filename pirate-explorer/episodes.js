// The treasure hunt engine: decides when the next episode happens, shows crewmates' invitations, plays episodes
// (narration, dialogue and choices), and keeps the treasures found. The story itself lives in quest.js.
// game.js creates it with window.createSoulmatesQuest(api) once the ship has loaded.
(() => {
'use strict';
const Q = window.SOULMATES_QUEST;
const SAVE_KEY = 'soulmates-quest-v1';
const FIRST_WAIT = 25, GAP = 40, LATER = 30;   // seconds of exploring before the first event, between events, after "later"
const $ = id => document.getElementById(id);
const VILLAIN = ['Goldtooth', 'Evangeline', 'the Pirate King'];   // whose trail the clues in each level follow
const byId = Object.fromEntries(Q.events.map(e => [e.id, e]));

window.createSoulmatesQuest = api => {
  let save = load();
  let clock = 0, nextAt = FIRST_WAIT, hook = null, heading = null, ep = null, active = false, testRun = false;
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
    if (e.after && Q.events.filter(x => x.level === e.level && x !== e && done(x.id)).length < e.after) return false;   // happens later on
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
  // Every event arrives through the crew: a crewmate walks up with their idea, or someone brings a clue about the plot.
  function showHook(e, teller) {
    hook = e;
    const card = $('questHook'), face = $('hookFace');
    const who = e.kind === 'crew' ? e.from : teller || api.messenger();
    face.hidden = !who;
    if (who) face.setAttribute('style', api.face(who, 52));
    $('hookKind').textContent = e.kind === 'crew' ? `${api.name(who)} has an idea` : who ? `${api.name(who)} heard something` : e.kind === 'heart' ? 'Someone new' : 'The plot thickens';
    $('hookTitle').textContent = e.title;
    $('hookText').textContent = e.hook;
    $('hookGo').textContent = e.accept || (e.kind === 'crew' ? 'Let’s do it!' : 'Find out');
    card.dataset.kind = e.kind;
    card.hidden = false;
    if (who) api.approach(who, e.kind === 'crew' ? e.hook : e.clue || e.hook);
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

  // ---- playing an episode, live on the stage ----
  // Each beat in quest.js becomes a stage scene. Where it happens: the episode's `room` (or one picked from its `bg`),
  // shown under a place name (`label`) when it's somewhere off the ship. Beats can add `room`, `label`, `cast`,
  // `place` ({ key: x fraction }) and `approach` (walk Ruby up to someone first, with `goal` as the instruction).
  const STAGE = {
    hall: ['hall'], ballroom: ['ballroom', 'The Royal Ball'], gallery: ['gallery', 'The Royal Ball'], island: ['island'], dining: ['dining'], galley: ['galley'], deck: ['deck'],
    town: ['town'], chapel: ['goldtooth'], study: ['study'], rival: ['evangeline'],
    sea: ['deck'], river: ['island', 'The Jungle River'], temple: ['island', 'The Old Master’s Hill'],
    eastern: ['deck', 'Facing the Pirate King’s Fleet'], night: ['study', 'The Captain’s Study, at Night'],
  };
  function layout(keys, fixed = {}, party) {
    const rest = keys.filter(k => !party.includes(k) && fixed[k] === undefined && api.keys().includes(k));
    const cast = {};
    rest.forEach((k, i) => { cast[k] = [rest.length === 1 ? .62 : .46 + i * (.44 / Math.max(1, rest.length - 1)), undefined, -1]; });
    Object.entries(fixed).forEach(([k, fx]) => { cast[k] = [fx, undefined, -1]; });
    return cast;
  }
  function buildScenes(e) {
    const [room0, label0] = STAGE[e.room || e.bg] || ['deck'];
    const party = ['ruby', ...((e.cast || []).includes('cutlass') ? ['cutlass'] : [])];
    let shown = [];
    return e.beats.map((b, i) => {
      const sc = { title: e.title, text: b.text || '', dialogue: (b.lines || []).join('\n'), choices: b.choices, game: b.game, how: b.how, mustWin: b.mustWin, party };
      if (i === 0 || b.room) { sc.room = b.room || room0; sc.at = b.at ?? .16; sc.label = b.label || e.label || label0; }
      const list = b.cast || (i === 0 ? e.cast || [] : null);
      if (list || b.place) {
        const cast = layout(list || shown, b.place || {}, party);
        shown.filter(k => !cast[k] && !party.includes(k)).forEach(k => { cast[k] = null; });   // leave the scene
        shown = Object.keys(cast).filter(k => cast[k]);
        sc.cast = cast;
      }
      if (b.approach) {
        const target = sc.cast?.[b.approach]?.[0] ?? .62;
        sc.walk = target - .09; sc.goal = b.goal || `Walk over to ${api.name(b.approach)}.`;
      }
      return sc;
    });
  }
  function startEpisode(e) {
    heading = null; hook = null; $('questHook').hidden = true;
    ep = { e };
    api.playScenes(buildScenes(e), { onEnd: score => endScenes(e, score), onClose: r => close(e, r.completed) });
  }
  // the closing scene: the ending, a treasure, a mini-game page to open, or a retry
  function endScenes(e, score) {
    if (e.pass && score < e.pass) return [{ title: e.title, text: e.failText || 'Not quite. Try again!', actions: [
      { label: 'Try again', fn: () => startEpisode(e) },
      { label: 'Back to the ship (try later)', fn: () => api.closeScenes({ completed: false }) }] }];
    const end = (e.ends || [[0, '']]).filter(([min]) => score >= min).pop()[1];
    if (e.play) return [{ title: e.title, text: end, actions: [
      { label: e.play.label + ' →', fn: () => { finish(e, true); location.href = e.play.href; } },
      { label: 'Skip the game, back to the ship', fn: () => { finish(e); api.closeScenes({ completed: true }); } }] }];
    finish(e);
    const tr = e.item !== undefined ? Q.treasures[e.item] : null;
    const found = e.lead ? ` 🔎 A clue for the ship’s log: ${e.lead}` : '';
    return [{ title: tr ? `Treasure found: ${tr.icon} ${tr.name}` : e.title, text: (tr ? `${end} ${tr.text}` : end) + found,
      actions: [{ label: e.id === 'finale' ? 'Sail on' : 'Back to exploring', fn: () => api.closeScenes({ completed: true }) }] }];
  }
  function finish(e, playing) {
    if (done(e.id) || ep?.debug) return;
    save.done.push(e.id);
    if (e.item !== undefined && !save.items.includes(e.item)) save.items.push(e.item);
    if (playing) save.pending = e.id;
    save.lastKind = e.kind === 'crew' ? 'crew' : 'plot';
    persist();
    nextAt = clock + GAP;
    if (e.item !== undefined) nextAt = clock + 20;   // the next villain's rumour arrives soon after
    if (e.lead) $('logBtn').classList.add('news');
    updateHud();
  }
  function close(e, completed) {
    const debug = ep?.debug;
    ep = null;
    if (!completed) { later[e.id] = clock; nextAt = clock + LATER; }
    else if (debug) api.caption('That was a test run (?episode=…), so nothing was saved.', 5);
    else if (e.unlock) api.caption(`${api.name(e.unlock)} has joined the ship! You’ll bump into them somewhere aboard.${e.lead ? ' 🔎 New clue in the ship’s log.' : ''}`, 7);
    else if (e.lead) api.caption(`🔎 New clue in the ship’s log: ${e.lead}`, 9);
    else if (e.item !== undefined && level() < 3) api.caption(`${Q.treasures[e.item].name} is safe aboard. ${Q.rumours[level()]}`, 8);
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
    updateClues();
    updateLog();
  }
  // the clues found so far on the current villain's trail, oldest first
  function updateClues() {
    const lv = Math.min(level(), VILLAIN.length - 1), all = done('finale');
    const found = save.done.map(id => byId[id]).filter(e => e && e.lead && e.level === lv);
    $('clueTitle').textContent = all ? 'Clues' : `Clues: on ${VILLAIN[lv]}’s trail`;
    const list = $('clueList'); list.replaceChildren();
    found.forEach((e, i) => { const li = document.createElement('li'); li.textContent = e.lead; if (i === found.length - 1) li.className = 'fresh'; list.appendChild(li); });
    $('clueEmpty').hidden = found.length > 0 || all;
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

  // the ship's log opens over the stage from the 📜 button in the corner
  function showLog(open) {
    $('questPanel').hidden = !open; $('logBtn').setAttribute('aria-expanded', String(open));
    if (open) { $('logBtn').classList.remove('news'); $('logClose').focus({ preventScroll: true }); }
  }
  $('logBtn').addEventListener('click', () => showLog($('questPanel').hidden));
  $('logClose').addEventListener('click', () => { showLog(false); $('logBtn').focus({ preventScroll: true }); });
  $('questPanel').addEventListener('keydown', ev => { if (ev.key === 'Escape') { ev.stopPropagation(); showLog(false); $('logBtn').focus({ preventScroll: true }); } });
  $('questNow').addEventListener('click', () => showLog(false));
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
    if (e?.back) api.caption(e.back + (e.lead ? ' 🔎 New clue in the ship’s log.' : ''), 8);
    nextAt = Math.min(nextAt, clock + 20);
  }

  updateHud();
  return {
    tick, isLocked, lookForTrouble,
    // what a crewmate could bring up when the captain stops to talk (game.js picks one at random):
    // their own game idea, a clue to the next plot event, or a nudge toward whoever has an idea
    topics(key) {
      if (!active || ep || hook) return {};
      if (heading) return { remind: heading.gotoHint || `Weren’t we heading to ${api.roomName(heading.goto)}?` };
      const idea = Q.events.find(e => e.kind === 'crew' && e.from === key && eligible(e)) || null;
      const next = pickNext();
      const other = Q.events.find(e => e.kind === 'crew' && e.from !== key && eligible(e));
      return { idea, clue: next && next.kind !== 'crew' ? next : null,
        pointer: other ? `${api.name(other.from)} has been muttering about some idea. Might be worth asking.` : null };
    },
    offer(e, key) { if (!hook && !ep) showHook(e, key); },
    busy: () => !!ep,
    // the hunt runs only while exploring freely (not during the intro)
    setActive(on) {
      active = on;
      $('treasurePill').hidden = $('logBtn').hidden = !on; if (!on) showLog(false);
      if (!on) { hook = heading = null; $('questHook').hidden = true; }
      if (on) { welcomeBack(); updateLog(); }
      // for testing: index.html?episode=wagon opens that episode once, without saving anything
      const want = on && !testRun && new URLSearchParams(location.search).get('episode');
      if (want && byId[want] && !ep) { testRun = true; setTimeout(() => { startEpisode(byId[want]); ep.debug = true; }, 300); }
      // index.html?game=wagon goes straight to that mini-game, in its episode's place and company
      const game = on && !testRun && new URLSearchParams(location.search).get('game');
      const home = game && Q.events.find(x => x.beats.some(b => b.game === game));
      if (home && !ep) {
        testRun = true;
        const only = { ...home, beats: [{ ...home.beats.find(b => b.game === game), cast: home.cast }] };
        setTimeout(() => { startEpisode(only); ep.debug = true; }, 300);
      }
    },
  };
};
})();
