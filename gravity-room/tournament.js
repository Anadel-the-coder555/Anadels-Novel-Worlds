/* Tournament rules independent of the room renderer and character physics. */
(() => {
'use strict';
const EVENTS = {
  rings: { name: 'Orbit Rush', duration: 60, marks: [900, 650, 400] },
  parkour: { name: 'Surface Switch', duration: 60, marks: [850, 600, 350] },
  style: { name: 'Air Freestyle', duration: 60, marks: [1100, 750, 450] },
};
class GravityCup {
  constructor() {
    this.active = false; this.best = {};
    try {
      const saved = JSON.parse(localStorage.getItem('gravity-cup-best'));
      if (saved && typeof saved === 'object' && !Array.isArray(saved)) this.best = saved;
    } catch (_) {}
  }
  start(event, tournament = false) {
    this.tournament = tournament; this.round = 0; this.totals = [0, 0, 0, 0]; this.history = [];
    this.begin(event);
  }
  begin(event) {
    this.event = event; this.active = true; this.finished = false; this.paused = false;
    this.time = EVENTS[event].duration; this.countdown = 3; this.score = 0; this.combo = 0; this.comboTime = 0;
    this.targetIndex = 0; this.target = null; this.airSkills = new Set(); this.lastSurface = 'floor'; this.lastAward = '';
  }
  get running() { return this.active && !this.finished && !this.paused && this.countdown === 0; }
  tick(dt) {
    if (!this.active || this.finished || this.paused) return;
    if (this.countdown > 0) { this.countdown = Math.max(0, this.countdown - dt); return; }
    this.time = Math.max(0, this.time - dt); this.comboTime = Math.max(0, this.comboTime - dt);
    if (!this.comboTime) this.combo = 0;
    if (!this.time) this.finish();
  }
  award(points, label) {
    if (!this.running) return;
    this.combo++; this.comboTime = 7;
    const multiplier = Math.min(5, 1 + Math.floor((this.combo - 1) / 3));
    const earned = points * multiplier; this.score += earned; this.lastAward = `${label} +${earned}`;
  }
  skill(name) { if (this.running && this.event === 'style') this.airSkills.add(name); }
  landed(surface) {
    if (!this.running || this.event !== 'style') return;
    if (this.airSkills.has('jump') && surface !== this.lastSurface) {
      this.award(100 + 60 * (this.airSkills.size - 1), `${this.airSkills.size > 1 ? 'Gravity combo' : 'Surface transfer'}`);
    }
    this.lastSurface = surface; this.airSkills.clear();
  }
  finish() {
    if (this.finished) return;
    this.finished = true;
    const marks = EVENTS[this.event].marks;
    this.rank = 1 + marks.filter(mark => mark > this.score).length;
    this.medal = ['Gold', 'Silver', 'Bronze', 'Challenger'][this.rank - 1];
    this.best[this.event] = Math.max(Number(this.best[this.event]) || 0, this.score);
    try { localStorage.setItem('gravity-cup-best', JSON.stringify(this.best)); } catch (_) {}
    [this.score, ...marks].forEach((score, i) => this.totals[i] += score);
    this.history.push({ event: this.event, score: this.score, medal: this.medal });
  }
  next() {
    if (!this.tournament || !this.finished || this.round >= 2) return false;
    this.round++; this.begin(['rings', 'parkour', 'style'][this.round]); return true;
  }
}
globalThis.GravityCup = GravityCup;
globalThis.GRAVITY_EVENTS = EVENTS;
})();
