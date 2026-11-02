/* The Gravity Thief adventure: story chapters and quest progress, independent of the room renderer.
   Each step happens in a room (or, for "go" steps, ends by reaching one). Shard positions are
   [fx, y]: fx runs from 0 (reachable from the left wall) to 1 (from the right wall), y is in stage pixels. */
(() => {
'use strict';
const STORY = [
  { type: 'shards', room: 'arduan', shards: [[.62, 140]],
    goal: 'Grab the glowing shard on the ceiling. Walk into a corner to climb the wall, then keep walking.',
    say: [
      ['Arduan', 'Okay. Either I’m still dreaming, or my pillow is on the ceiling.'],
      ['Lucio', 'Not dreaming. My whole room just went sideways. Day’s yelling downstairs.'],
      ['Arduan', 'Wait… something’s glowing up there. Like a piece of broken starlight.'],
      ['Lucio', 'Only one way to reach it. Walk up the wall. Obviously.'],
    ] },
  { type: 'go', to: 'living', goal: 'Head to the living room. Stand by the door and press E.',
    say: [
      ['Arduan', 'It’s humming. It’s… warm? It feels like holding gravity in my hand.'],
      ['Lucio', 'It just showed me something. Eight pieces, scattered all over Celedonia.'],
      ['Arduan', 'And someone’s picking them up. Someone’s stealing the city’s gravity.'],
      ['Lucio', 'A Gravity Thief. Cool cool cool. Let’s go find Day.'],
    ] },
  { type: 'shards', room: 'living', shards: [[.3, 150], [.72, 130]],
    goal: 'Two shards are drifting up high. Press Z for Zero-G and swim up to them.',
    say: [
      ['Day', 'Finally! The couch is floating, the fridge is floating, and so are two of those glowy things.'],
      ['Day', 'Every time I jump for them, gravity yanks me back down.'],
      ['Arduan', 'Then let’s turn gravity off. Zero-G, and we swim for it.'],
      ['Brennan', 'Arduan, I came over to borrow your hoverboard, not to chase floating shards. …Okay, I’m in.'],
    ] },
  { type: 'go', to: 'street', goal: 'Out the front door to the street!',
    say: [
      ['Lilith', 'You guys! Brayden and I just saw something zip past the window.'],
      ['Brayden', 'Purple. Fast. Glowing. It went straight up the road toward the Academy.'],
      ['Lilith', 'And it was carrying one of those shards.'],
      ['Day', 'That’s our thief. Out the front door, go go go!'],
    ] },
  { type: 'chase', room: 'street', path: [.6, .7, .8, .9],
    goal: 'Chase the purple streak up the road! Get close and it’ll run.',
    say: [
      ['Brayden', 'There! The purple streak, up the road!'],
      ['Arduan', 'It stops whenever we stop. It’s… waiting for us?'],
    ] },
  { type: 'shards', room: 'street', shards: [[1, 220]],
    goal: 'The thief dropped a shard high on the far wall. Climb up and grab it.',
    say: [
      ['Lilith', 'It dropped one! Way up on that wall.'],
      ['Day', 'Sloppy thief. Or a thief who wants to be followed.'],
    ] },
  { type: 'go', to: 'school', goal: 'Up the road to the Academy!',
    say: [['Lucio', 'It went into the Academy. Of course it did. On a Saturday.']] },
  { type: 'shards', room: 'school', shards: [[.78, 140]],
    goal: 'One shard is stuck to the ceiling. Press F to flip the room until “down” points up, or climb the walls.',
    say: [
      ['Brayden', 'The hall’s total chaos. Look, another shard, stuck to the ceiling.'],
      ['Lilith', 'The atrium door is sealed with a gravity lock. I bet that shard opens it.'],
      ['Arduan', 'Time to flip the whole room. Hold on to something.'],
    ] },
  { type: 'go', to: 'atrium', goal: 'Through to the atrium. The thief is in there.',
    say: [['Lilith', 'The lock is glowing green. Whatever stole the shards is in the atrium.']] },
  { type: 'catch', room: 'atrium', count: 3,
    goal: 'Catch the thief! It runs away from you, so try cutting it off from the other side.',
    say: [
      ['Day', 'There it is… glowing purple… with whiskers?'],
      ['Arduan', 'No. Way. The CAT is the Gravity Thief?!'],
      ['Lucio', 'It’s been batting the shards around like toys. Of course it has.'],
      ['Lilith', 'It’s holding the last three. Catch it! Gently!'],
    ] },
  { type: 'end',
    say: [
      ['Arduan', 'Got you, fluffball. All eight shards.'],
      ['Day', 'Feel that? Gravity’s settling down. The whole city just let out a breath.'],
      ['Brayden', 'So… do we tell the Academy their gravity crisis was a cat?'],
      ['Lucio', 'Absolutely not. We tell them it was a highly dangerous Gravity Thief.'],
      ['Lilith', 'Uh, guys? Why is the cat still floating?'],
      ['Arduan', '…Free roam’s open. Let’s keep the shards safe. And the cat away from them.'],
    ] },
];
// Doors stay shut until the story has reached them.
const LOCKS = [
  { from: 'arduan', to: 'living', until: 1, msg: 'Grab the glowing shard first!' },
  { from: 'living', to: 'street', until: 3, msg: 'Day needs help with those floating shards first.' },
  { from: 'street', to: 'school', until: 6, msg: 'Something’s still glowing out here.' },
  { from: 'school', to: 'atrium', until: 8, msg: 'Sealed by a gravity lock. It needs the ceiling shard.' },
];
const TOTAL = STORY.reduce((n, s) => n + (s.shards ? s.shards.length : 0) + (s.count || 0), 0);

class Adventure {
  constructor() {
    this.i = 0; this.got = [];
    try {
      const saved = JSON.parse(localStorage.getItem('gravity-adventure'));
      if (saved && Number.isInteger(saved.i) && saved.i >= 0 && saved.i < STORY.length) {
        this.i = saved.i; this.got = Array.isArray(saved.got) ? saved.got.filter(Number.isInteger) : [];
      }
    } catch (_) {}
  }
  save() { try { localStorage.setItem('gravity-adventure', JSON.stringify({ i: this.i, got: this.got })); } catch (_) {} }
  get step() { return STORY[this.i]; }
  get done() { return this.step.type === 'end'; }
  get total() { return TOTAL; }
  // shards found so far: every shard in finished steps plus the ones picked up in this step
  get found() {
    return STORY.slice(0, this.i).reduce((n, s) => n + (s.shards ? s.shards.length : 0) + (s.count || 0), 0) + this.got.length;
  }
  shardsIn(room) {
    const s = this.step;
    if (s.type !== 'shards' || s.room !== room) return null;
    return s.shards.map(([fx, y], i) => ({ fx, y, i })).filter(q => !this.got.includes(q.i));
  }
  // returns true when this pickup finishes the step (shards) or the catch count (catch)
  collect(i) {
    const s = this.step;
    if (s.type === 'shards' && !this.got.includes(i) && i < s.shards.length) this.got.push(i);
    else if (s.type === 'catch' && this.got.length < s.count) this.got.push(this.got.length);
    else return false;
    this.save();
    return this.got.length === (s.type === 'catch' ? s.count : s.shards.length);
  }
  lock(from, to) { const l = LOCKS.find(l => l.from === from && l.to === to && this.i < l.until); return l ? l.msg : null; }
  next() { if (this.i < STORY.length - 1) { this.i++; this.got = []; this.save(); } return this.step; }
  reset() { this.i = 0; this.got = []; this.save(); }
}
globalThis.Adventure = Adventure;
globalThis.GRAVITY_STORY = STORY;
})();
