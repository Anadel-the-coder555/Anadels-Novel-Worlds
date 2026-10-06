// Timed sword combat for Ruby's story encounter. No saved progress is required.
// Both duellists are drawn from their duel sheets (idle, advance, block, strike, hurt, defeat): pose(key)
// says which sheet, frame and step-back offset to show for 'ruby' or 'cutlass'; game.js draws it.
// They can stand either way round. rivalName names him in messages; rivalFalls: false leaves him staggered,
// not on the deck, when Ruby wins (in the story he is "too solid to topple").
window.createSwordDuel = ({ ruby, cutlass, onChange, onFinish, random = Math.random, rivalName = 'Cutlass', rivalFalls = true }) => {
  const he = rivalName, He = rivalName[0].toUpperCase() + rivalName.slice(1);
  const dir = Math.sign(cutlass.x - ruby.x) || 1;   // which way Ruby faces him
  let health = 5, rivalHealth = 6, phase = 'approach', remaining = .9;
  let defense = '', defenseTime = 0, cooldown = 0, flash = 0, ended = false, finishIn = 0, won = false;
  let message = `Ruby and ${he} close in, blades raised.`;
  const ADVANCE = 40, CYCLE = 130;             // px each closes in at the start; px of deck per advance cycle
  const STRIKE_F = .08, DEFEAT_F = .3;         // seconds per frame
  const TELL = .55;                            // he raises and draws back his sword this long before he strikes
  const anims = { ruby: { name: 'advance', t: 0 }, cutlass: { name: 'advance', t: 0 } };
  let walked = 0;
  const publish = () => onChange({ health, rivalHealth, phase, message });
  const play = (who, name) => { anims[who].name = name; anims[who].t = 0; };
  function finish(result, delay) { ended = true; won = result; finishIn = delay; }
  function act(move) {
    if (ended || cooldown > 0 || phase === 'approach') return;
    if (move === 'strike') {
      cooldown = .4; play('ruby', 'strike');
      if (phase === 'recovery') {
        rivalHealth--; flash = .25; message = 'Your blade gets through his guard!';
        play('cutlass', rivalHealth <= 0 && rivalFalls ? 'defeat' : 'hurt');
        if (rivalHealth <= 0) { publish(); finish(true, rivalFalls ? DEFEAT_F * 5 + .6 : .8); return; }
      } else { play('cutlass', 'block'); message = `${He} blocks your strike. Wait for an opening!`; }
    } else {
      defense = move; defenseTime = move === 'parry' ? .55 : .7;
      cooldown = move === 'parry' ? .3 : .55;
      play('ruby', move === 'parry' ? 'guard' : 'dodge');
      message = move === 'parry' ? 'Ruby raises her guard.' : 'Ruby steps out of the blade’s path.';
    }
    publish();
  }
  function update(dt) {
    anims.ruby.t += dt; anims.cutlass.t += dt;
    if (ended) {
      if (finishIn > 0 && (finishIn -= dt) <= 0) onFinish(won);
      return;
    }
    if (phase === 'approach') {
      const step = Math.min(ADVANCE - walked, ADVANCE / .9 * dt);
      ruby.x += step * dir; cutlass.x -= step * dir; walked += step;
      if (walked >= ADVANCE) {
        phase = 'windup'; remaining = 1.2; play('ruby', 'idle'); play('cutlass', 'idle');
        message = `${He} raises his blade. Time a parry or dodge before he strikes!`; publish();
      }
      return;
    }
    cooldown = Math.max(0, cooldown - dt); defenseTime = Math.max(0, defenseTime - dt);
    flash = Math.max(0, flash - dt); remaining -= dt;
    if (remaining > 0) return;
    if (phase === 'windup') {
      phase = 'recovery'; remaining = 1.05; flash = .25; play('cutlass', 'lunge');
      if (defenseTime > 0) {
        if (defense === 'parry') play('ruby', 'parried');
        message = defense === 'parry' ? 'CLANG! You parried. Strike while his guard is open!' : 'His blade misses! Strike before he recovers!';
      } else {
        health--; message = `${He} scores a hit! Watch his raised sword and time your defense.`;
        play('ruby', health <= 0 ? 'defeat' : 'hurt');
      }
      defenseTime = 0;
      if (health <= 0) { publish(); finish(false, DEFEAT_F * 5 + .6); return; }
    } else { phase = 'windup'; remaining = .9 + random() * .6; message = `${He} draws back his sword. Prepare to defend!`; }
    publish();
  }
  // pose(key): { anim: sheet name, frame, dx: px stepped back (towards their own side) }
  const BREATHE = [0, 1, 2, 3, 2, 1];
  function pose(key) {
    const a = anims[key];
    if (!a) return null;
    const t = a.t, f = n => Math.floor(t / n);
    switch (a.name) {
      case 'advance': return { anim: 'advance', frame: Math.floor(walked / (CYCLE / 6)) % 6, dx: 0 };
      case 'strike': if (t < STRIKE_F * 5) return { anim: 'strike', frame: f(STRIKE_F), dx: 0 }; break;
      case 'lunge': if (t < .45) return { anim: 'strike', frame: 2 + Math.min(2, f(.15)), dx: 0 }; break;   // his blow lands, then recovers
      case 'guard': if (defenseTime > 0) return { anim: 'block', frame: 0, dx: 0 }; break;
      case 'parried': if (t < .35) return { anim: 'block', frame: 1, dx: 0 }; break;
      case 'block': if (t < .4) return { anim: 'block', frame: t < .15 ? 0 : 1, dx: 0 }; break;
      case 'dodge': if (t < .7) {   // a quick step back and in again: the advance played backwards
        const p = t / .7;
        return { anim: 'advance', frame: 5 - Math.floor(p * 6) % 6, dx: -45 * Math.sin(p * Math.PI) };
      } break;
      case 'hurt': if (t < .58) return { anim: 'hurt', frame: t < .28 ? 0 : 1, dx: -16 * Math.max(0, 1 - t / .28) }; break;
      case 'defeat': return { anim: 'defeat', frame: Math.min(4, f(DEFEAT_F)), dx: 0 };
    }
    a.name = 'idle';
    // Cutlass's tell: sword raised, then drawn back, just before he strikes
    if (key === 'cutlass' && phase === 'windup' && !ended && remaining < TELL)
      return { anim: 'strike', frame: remaining > .2 ? 0 : 1, dx: 0 };
    return { anim: 'idle', frame: BREATHE[Math.floor(t * 5) % BREATHE.length], dx: 0 };
  }
  function render(ctx, camera) {
    if (flash > 0) { ctx.fillStyle = '#fff4b5'; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.fillRect((ruby.x + cutlass.x) / 2 - camera + Math.cos(a) * 24, ruby.y - 125 + Math.sin(a) * 24, 4, 4); } }
  }
  publish(); return { act, update, render, pose };
};
