(() => {
'use strict';
// ---- world constants (logical 960x540 stage) ----
const VW = 960, VH = 540;
const WORLD = 5300, FINISH = 5030;
const ROAD_Y = 444, BASE = 452, GROUND = 494;
const FW = 291, FH = 357, AX = 155, PS = 0.52;     // princess sheet: 4 frames, torso anchor x
const SPEED = 235, HOP_V = 560, GRAV = 1500, DAY = 80;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isTouch = matchMedia('(pointer: coarse)').matches;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let K = 1;
function resize() {
  const r = canvas.getBoundingClientRect();
  if (!r.width) return;
  K = Math.min(2.5, (r.width / VW) * (window.devicePixelRatio || 1));
  canvas.width = Math.round(VW * K);
  canvas.height = Math.round(VH * K);
}
new ResizeObserver(resize).observe(canvas);

// ---- helpers ----
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function off(w, h, draw, scale = 2) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w * scale); c.height = Math.ceil(h * scale);
  const g = c.getContext('2d'); g.scale(scale, scale); draw(g);
  return c;
}
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function arch(g, x, y, w, h) { g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + w / 2); g.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); g.lineTo(x + w, y + h); g.closePath(); }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const BEAM = '#4a3020', FRAME = '#3d281a';

// ---- prop painters (pre-rendered once at 2x) ----
function makeHouse(o) {
  const R = rng(o.seed), ov = 18, L = ov + 6, w = o.w, wallH = o.wallH, roofH = o.roofH;
  const rightPad = o.sign ? 80 : ov + 6;
  const W = L + w + rightPad, H = wallH + roofH + 44;
  const x0 = L, x1 = L + w, wy = H - wallH, ry = wy - roofH, fh = 22;
  const bl = x0 - ov, br = x1 + ov, by = wy + 8, hip = o.hip ?? 26, tl = x0 + hip, tr = x1 - hip;
  const glows = []; let chim = null;
  const img = off(W, H, g => {
    if (o.chimney != null) {
      const cx = x0 + o.chimney, top = ry - 28;
      g.fillStyle = '#7d4f3c'; g.fillRect(cx, top, 22, roofH * 0.7 + 28);
      g.fillStyle = 'rgba(40,20,10,.3)';
      for (let y = top + 6, i = 0; y < ry + roofH * 0.7; y += 6, i++) { g.fillRect(cx, y, 22, 1); g.fillRect(cx + (i % 2 ? 7 : 15), y - 6, 1, 6); }
      g.fillStyle = 'rgba(255,230,200,.18)'; g.fillRect(cx, top, 6, roofH * 0.7 + 28);
      g.fillStyle = '#4f3328'; g.fillRect(cx - 3, top - 5, 28, 7);
      chim = [cx + 11, top - 5];
    }
    // plaster wall
    g.fillStyle = o.wall; g.fillRect(x0, wy, w, wallH);
    let gr = g.createLinearGradient(0, wy, 0, H); gr.addColorStop(0, 'rgba(255,255,255,.14)'); gr.addColorStop(1, 'rgba(90,60,30,.14)');
    g.fillStyle = gr; g.fillRect(x0, wy, w, wallH);
    for (let i = 0; i < w * wallH / 26; i++) {
      g.fillStyle = R() < .6 ? `rgba(110,80,50,${.04 + R() * .07})` : `rgba(255,255,255,${.05 + R() * .08})`;
      g.fillRect(x0 + R() * w, wy + R() * wallH, 1 + R() * 2.5, 1 + R() * 1.5);
    }
    // stone footing
    g.fillStyle = '#7d766b'; g.fillRect(x0 - 2, H - fh, w + 4, fh);
    for (let y = H - fh + 1; y < H; y += 7) {
      let x = x0 - 2 - R() * 10;
      while (x < x1 + 2) { const sw = 10 + R() * 14; g.fillStyle = ['#9c958a', '#a8a194', '#8f877b', '#b1aa9c'][R() * 4 | 0]; rr(g, Math.max(x, x0 - 2), y, Math.min(sw, x1 + 2 - x) - 2, 5.5, 2.2); g.fill(); x += sw; }
    }
    // timber frame
    if (o.timber) {
      g.fillStyle = BEAM;
      g.fillRect(x0, wy, 7, wallH - fh); g.fillRect(x1 - 7, wy, 7, wallH - fh);
      g.fillRect(x0, wy, w, 8); g.fillRect(x0, H - fh - 7, w, 7);
      if (o.floor) {
        const fy = wy + o.floor; g.fillRect(x0, fy, w, 7);
        (o.posts || []).forEach(p => g.fillRect(x0 + p - 3, wy, 7, o.floor));
        g.strokeStyle = BEAM; g.lineWidth = 6;
        [[x0 + 7, fy, x0 + 44, wy + 8], [x1 - 7, fy, x1 - 44, wy + 8]].forEach(([a, b, c, d]) => { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); });
      }
      (o.braces || []).forEach(([a, b, c, d]) => { g.strokeStyle = BEAM; g.lineWidth = 6; g.beginPath(); g.moveTo(x0 + a, wy + b); g.lineTo(x0 + c, wy + d); g.stroke(); });
    }
    // shadow under the eaves
    gr = g.createLinearGradient(0, wy, 0, wy + 28); gr.addColorStop(0, 'rgba(30,20,10,.4)'); gr.addColorStop(1, 'rgba(30,20,10,0)');
    g.fillStyle = gr; g.fillRect(x0, wy, w, 28);
    // door
    if (o.door) {
      const d = o.door, dw = d.w || 48, dh = d.h || 92, dx = x0 + d.x, dy = H - dh;
      g.fillStyle = '#a2998b'; arch(g, dx - 6, dy - 6, dw + 12, dh + 6); g.fill();
      g.fillStyle = d.color || '#6a4328'; arch(g, dx, dy, dw, dh); g.fill();
      g.save(); arch(g, dx, dy, dw, dh); g.clip();
      g.strokeStyle = 'rgba(30,15,5,.45)'; g.lineWidth = 1.5;
      for (let x = dx + dw / 5; x < dx + dw - 1; x += dw / 5) { g.beginPath(); g.moveTo(x, dy); g.lineTo(x, H); g.stroke(); }
      g.fillStyle = 'rgba(20,10,5,.45)'; g.fillRect(dx, dy + dh * .32, dw, 3); g.fillRect(dx, dy + dh * .74, dw, 3);
      g.fillStyle = 'rgba(255,230,190,.12)'; g.fillRect(dx, dy, dw * .3, dh);
      g.restore();
      g.fillStyle = '#d8b25a'; g.beginPath(); g.arc(dx + dw - 10, dy + dh * .58, 2.8, 0, 7); g.fill();
      g.fillStyle = '#9a9286'; g.fillRect(dx - 8, H - 5, dw + 16, 5);
    }
    // windows with shutters and flower boxes
    (o.windows || []).forEach(([cx, cy]) => {
      const ww = o.winW || 34, wh = o.winH || 42, X = x0 + cx - ww / 2, Y = wy + cy - wh / 2;
      g.fillStyle = o.shutter; g.fillRect(X - 16, Y, 13, wh); g.fillRect(X + ww + 3, Y, 13, wh);
      g.fillStyle = 'rgba(0,0,0,.22)';
      [X - 16, X + ww + 3].forEach(sx => { g.fillRect(sx + 4, Y + 2, 1, wh - 4); g.fillRect(sx + 8.5, Y + 2, 1, wh - 4); });
      g.fillStyle = FRAME; g.fillRect(X - 3, Y - 3, ww + 6, wh + 6);
      const gl = g.createLinearGradient(X, Y, X + ww, Y + wh); gl.addColorStop(0, '#6a90a0'); gl.addColorStop(1, '#25394a');
      g.fillStyle = gl; g.fillRect(X, Y, ww, wh);
      g.fillStyle = 'rgba(255,255,255,.22)'; g.beginPath(); g.moveTo(X + 3, Y + wh * .55); g.lineTo(X + ww * .55, Y + 2); g.lineTo(X + ww * .75, Y + 2); g.lineTo(X + 3, Y + wh * .8); g.fill();
      g.fillStyle = FRAME; g.fillRect(X + ww / 2 - 1.5, Y, 3, wh); g.fillRect(X, Y + wh / 2 - 1.5, ww, 3);
      g.fillStyle = '#6b4428'; g.fillRect(X - 6, Y + wh + 3, ww + 12, 9);
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(X - 6, Y + wh + 9, ww + 12, 3);
      for (let i = 0; i < 10; i++) { g.fillStyle = ['#3f6b2f', '#5d8a3a', '#4d7a33'][i % 3]; g.beginPath(); g.arc(X - 4 + i * (ww + 8) / 9, Y + wh + 2 + R() * 2, 3.6, 0, 7); g.fill(); }
      for (let i = 0; i < 8; i++) { g.fillStyle = o.blooms[i % o.blooms.length]; g.beginPath(); g.arc(X - 3 + R() * (ww + 6), Y + wh - 1 + R() * 4, 2.6, 0, 7); g.fill(); }
      glows.push([X, Y, ww, wh]);
    });
    // roof
    const roofPath = () => { g.beginPath(); g.moveTo(bl, by); g.lineTo(tl, ry); g.lineTo(tr, ry); g.lineTo(br, by); g.closePath(); };
    g.save(); roofPath(); g.fillStyle = o.roof; g.fill(); g.clip();
    if (o.thatch) {
      for (let i = 0; i < (br - bl) * (by - ry) / 9; i++) {
        const x = bl + R() * (br - bl), y = ry + R() * (by - ry);
        g.strokeStyle = ['#a57b3a', '#d8b46a', '#8c6530', '#e6c983'][R() * 4 | 0]; g.lineWidth = 1.3;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + (x - (bl + br) / 2) * .05, y + 8 + R() * 7); g.stroke();
      }
    } else {
      for (let y = ry + 4, row = 0; y < by + 12; y += 10, row++) {
        g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(bl, y, br - bl, 1.6);
        g.fillStyle = 'rgba(255,255,255,.09)'; g.fillRect(bl, y + 1.6, br - bl, 1.2);
        for (let x = bl + (row % 2 ? 9 : 0); x < br; x += 18) { g.fillStyle = 'rgba(0,0,0,.16)'; g.fillRect(x, y - 8.4, 1.4, 8.4); }
        for (let k = 0; k < (br - bl) / 30; k++) { g.fillStyle = `rgba(${R() < .5 ? '255,255,255' : '0,0,0'},${.04 + R() * .05})`; g.fillRect(bl + R() * (br - bl), y - 8.4, 17, 8.4); }
      }
    }
    gr = g.createLinearGradient(bl, 0, br, 0); gr.addColorStop(0, 'rgba(255,240,200,.2)'); gr.addColorStop(.55, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(20,15,40,.3)');
    g.fillStyle = gr; g.fillRect(bl, ry, br - bl, by - ry);
    g.restore();
    g.fillStyle = o.thatch ? '#94692f' : 'rgba(20,16,30,.45)'; rr(g, bl - 1, by - 3, br - bl + 2, o.thatch ? 7 : 5, 2.5); g.fill();
    g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(tl, ry - 2, tr - tl, 4);
    if (o.dormer) {
      const cx = (x0 + x1) / 2 + (o.dormerX || 0), dw = 42, dy = ry + roofH * .3;
      g.fillStyle = o.wall; g.fillRect(cx - dw / 2, dy, dw, roofH * .55);
      g.fillStyle = FRAME; g.fillRect(cx - 12, dy + 9, 24, 27);
      g.fillStyle = '#3a5566'; g.fillRect(cx - 9, dy + 12, 18, 21);
      g.fillStyle = FRAME; g.fillRect(cx - 1, dy + 12, 2, 21);
      glows.push([cx - 9, dy + 12, 18, 21]);
      g.fillStyle = o.roof; g.beginPath(); g.moveTo(cx - dw / 2 - 7, dy + 3); g.lineTo(cx, dy - 20); g.lineTo(cx + dw / 2 + 7, dy + 3); g.closePath(); g.fill();
      g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.moveTo(cx, dy - 20); g.lineTo(cx + dw / 2 + 7, dy + 3); g.lineTo(cx + dw / 2 + 2, dy + 3); g.closePath(); g.fill();
    }
    if (o.sign) {
      const bx = x1, sy0 = wy + 34;
      g.strokeStyle = '#2b2420'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(bx, sy0); g.lineTo(bx + 70, sy0); g.stroke();
      g.beginPath(); g.moveTo(bx, sy0 + 18); g.quadraticCurveTo(bx + 10, sy0, bx + 28, sy0); g.stroke();
      g.fillStyle = '#2b2420'; g.beginPath(); g.arc(bx + 70, sy0, 3, 0, 7); g.fill();
      const lines = o.sign, bw = 66, bh = lines.length > 1 ? 38 : 26, sx = bx + 4, sy = sy0 + 10;
      g.lineWidth = 1.2; g.beginPath(); g.moveTo(sx + 9, sy0); g.lineTo(sx + 9, sy); g.moveTo(sx + bw - 9, sy0); g.lineTo(sx + bw - 9, sy); g.stroke();
      g.fillStyle = '#6b4428'; rr(g, sx - 2, sy - 2, bw + 4, bh + 4, 4); g.fill();
      g.fillStyle = '#ead9b1'; rr(g, sx, sy, bw, bh, 3); g.fill();
      g.fillStyle = '#4a3020'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '13px "IM Fell English SC", Georgia, serif';
      const mw = Math.max(...lines.map(t => g.measureText(t).width));
      g.font = `${Math.min(13, 13 * (bw - 10) / mw).toFixed(1)}px "IM Fell English SC", Georgia, serif`;
      lines.forEach((t, i) => g.fillText(t, sx + bw / 2, sy + bh / 2 + 1 + (i - (lines.length - 1) / 2) * 14));
    }
    // sun from the upper left, contact shadow at the base
    g.globalCompositeOperation = 'source-atop';
    gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, 'rgba(255,236,190,.10)'); gr.addColorStop(1, 'rgba(40,30,70,.16)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    gr = g.createLinearGradient(0, H - 50, 0, H); gr.addColorStop(0, 'rgba(20,15,10,0)'); gr.addColorStop(1, 'rgba(20,15,10,.28)');
    g.fillStyle = gr; g.fillRect(0, H - 50, W, 50);
    g.globalCompositeOperation = 'source-over';
  });
  return { img, w: W, h: H, glows, chim, eaves: [[bl + 4, by], [br - 4, by]] };
}

function makeStall(o) {
  const R = rng(o.seed), w = 160, H = 160, W = w + 24, x0 = 12;
  const img = off(W, H, g => {
    const cy = H - 60;
    g.fillStyle = '#5a3a24'; g.fillRect(x0 + 6, 40, 7, H - 40); g.fillRect(x0 + w - 13, 40, 7, H - 40);
    g.fillStyle = 'rgba(30,20,10,.25)'; g.fillRect(x0 + 13, 50, w - 26, cy - 50);
    if (o.kind === 'ribbons') {
      const cols = ['#c86a7c', '#3f63a0', '#e2b04a', '#9a77c0', '#f1e3c3', '#5b8a4a'];
      g.fillStyle = '#5a3a24'; g.fillRect(x0 + 10, 56, w - 20, 4);
      for (let i = 0; i < 11; i++) {
        const x = x0 + 22 + i * 11.5, len = 26 + R() * 22;
        g.strokeStyle = cols[i % cols.length]; g.lineWidth = 5; g.beginPath(); g.moveTo(x, 58);
        g.bezierCurveTo(x + 5, 58 + len * .35, x - 5, 58 + len * .7, x + 2, 58 + len); g.stroke();
      }
      for (let i = 0; i < 6; i++) { const x = x0 + 22 + i * 24; g.fillStyle = cols[i]; g.fillRect(x, cy - 16, 16, 16); g.fillStyle = '#c9a97a'; g.fillRect(x - 2, cy - 18, 20, 3); g.fillRect(x - 2, cy - 2, 20, 3); }
    }
    if (o.kind === 'apples') {
      for (let c = 0; c < 3; c++) {
        const x = x0 + 12 + c * 48;
        for (let i = 0; i < 9; i++) { const ax = x + 6 + (i % 4) * 9 + (i > 3 ? 4 : 0), ay = cy - 22 - (i > 3 ? 7 : 0) - (i > 7 ? 7 : 0); g.fillStyle = c === 1 ? ['#c6a23a', '#b78f2c'][i % 2] : ['#c8382f', '#a92a26', '#d9603a'][i % 3]; g.beginPath(); g.arc(ax + (i > 7 ? 8 : 0), ay, 6, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(ax - 2 + (i > 7 ? 8 : 0), ay - 2, 1.8, 0, 7); g.fill(); }
        g.fillStyle = '#a8763f'; g.fillRect(x, cy - 20, 44, 20);
        g.fillStyle = 'rgba(60,35,15,.4)'; g.fillRect(x, cy - 13, 44, 1.5); g.fillRect(x, cy - 6, 44, 1.5); g.fillRect(x + 21, cy - 20, 1.5, 20);
      }
    }
    if (o.kind === 'cheese') {
      for (let i = 0; i < 3; i++) {
        const x = x0 + 18 + i * 44, hh = 18;
        g.fillStyle = '#d9a63a'; rr(g, x, cy - hh - (i === 1 ? 18 : 0), 38, hh, 6); g.fill();
        g.fillStyle = '#efcd6a'; rr(g, x + 2, cy - hh + 2 - (i === 1 ? 18 : 0), 34, 6, 3); g.fill();
        if (i === 1) { g.fillStyle = '#d9a63a'; rr(g, x - 4, cy - hh, 46, hh, 6); g.fill(); g.fillStyle = '#efcd6a'; rr(g, x - 2, cy - hh + 2, 42, 6, 3); g.fill(); }
      }
      g.fillStyle = '#f2d77c'; g.beginPath(); g.moveTo(x0 + w - 30, cy); g.lineTo(x0 + w - 10, cy); g.lineTo(x0 + w - 10, cy - 14); g.closePath(); g.fill();
      for (let i = 0; i < 4; i++) { g.fillStyle = '#8a5a36'; g.fillRect(x0 + 24 + i * 34, 60, 2, 14); g.fillStyle = '#d9a63a'; g.beginPath(); g.ellipse(x0 + 25 + i * 34, 80, 7, 9, 0, 0, 7); g.fill(); }
    }
    // counter
    g.fillStyle = '#8a5a36'; g.fillRect(x0, cy, w, 60);
    g.fillStyle = '#6d4429'; g.fillRect(x0, cy, w, 6);
    g.fillStyle = 'rgba(40,20,5,.35)'; for (let y = cy + 18; y < H; y += 12) g.fillRect(x0, y, w, 1.5);
    for (let x = x0 + 30; x < x0 + w; x += 38) g.fillRect(x, cy + 6, 1.5, 54);
    // awning
    const ay = 20, ah = 32, stripes = 8, sw = (w + 16) / stripes;
    g.save(); g.beginPath(); g.moveTo(x0 + 4, ay); g.lineTo(x0 + w - 4, ay); g.lineTo(x0 + w + 8, ay + ah); g.lineTo(x0 - 8, ay + ah); g.closePath(); g.clip();
    for (let i = 0; i < stripes; i++) { g.fillStyle = o.awn[i % 2]; g.fillRect(x0 - 8 + i * sw, ay, sw + .5, ah); }
    const ag = g.createLinearGradient(0, ay, 0, ay + ah); ag.addColorStop(0, 'rgba(255,255,255,.18)'); ag.addColorStop(1, 'rgba(0,0,0,.12)'); g.fillStyle = ag; g.fillRect(x0 - 8, ay, w + 16, ah);
    g.restore();
    for (let i = 0; i < stripes; i++) { g.fillStyle = o.awn[i % 2]; g.beginPath(); g.arc(x0 - 8 + i * sw + sw / 2, ay + ah, sw / 2, 0, Math.PI); g.fill(); }
    g.fillStyle = 'rgba(0,0,0,.12)'; for (let i = 0; i < stripes; i++) { g.beginPath(); g.arc(x0 - 8 + i * sw + sw / 2, ay + ah, sw / 2, 0, Math.PI); g.fill(); }
    g.fillStyle = '#5a3a24'; g.fillRect(x0 + 2, ay - 4, w - 4, 5);
    // label
    g.fillStyle = '#6b4428'; rr(g, x0 + w / 2 - 36, cy + 16, 72, 26, 3); g.fill();
    g.fillStyle = '#ead9b1'; rr(g, x0 + w / 2 - 34, cy + 18, 68, 22, 3); g.fill();
    g.fillStyle = '#4a3020'; g.font = '14px "IM Fell English SC", Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(o.label, x0 + w / 2, cy + 30);
    g.globalCompositeOperation = 'source-atop';
    const gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, 'rgba(255,236,190,.08)'); gr.addColorStop(1, 'rgba(40,30,70,.16)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  });
  return { img, w: W, h: H, glows: [], chim: null };
}

function makeWell() {
  const W = 120, H = 160;
  const img = off(W, H, g => {
    g.fillStyle = '#5a3a24'; g.fillRect(20, 40, 8, H - 80); g.fillRect(92, 40, 8, H - 80);
    g.fillStyle = '#4a3020'; g.fillRect(24, 64, 72, 5);
    g.strokeStyle = '#c9b48a'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(60, 68); g.lineTo(60, 92); g.stroke();
    g.fillStyle = '#7a5130'; g.fillRect(52, 92, 16, 14); g.fillStyle = '#3b3a3a'; g.fillRect(51, 95, 18, 2); g.fillRect(51, 102, 18, 2);
    // stone drum
    g.fillStyle = '#8f877b'; g.fillRect(14, H - 58, 92, 58);
    const R = rng(77);
    for (let y = H - 56; y < H; y += 10) { let x = 14 - R() * 12; while (x < 106) { const sw = 14 + R() * 12; g.fillStyle = ['#a39b8e', '#b3ab9d', '#968e81', '#bdb5a6'][R() * 4 | 0]; rr(g, Math.max(x, 14), y, Math.min(sw, 106 - Math.max(x, 14)) - 2, 8, 3); g.fill(); x += sw; } }
    g.fillStyle = '#b8b0a2'; g.beginPath(); g.ellipse(60, H - 58, 47, 8, 0, 0, 7); g.fill();
    g.fillStyle = '#2e3a40'; g.beginPath(); g.ellipse(60, H - 58, 38, 5, 0, 0, 7); g.fill();
    // little roof
    g.fillStyle = '#3e5288'; g.beginPath(); g.moveTo(4, 44); g.lineTo(60, 6); g.lineTo(116, 44); g.closePath(); g.fill();
    g.save(); g.clip(); g.fillStyle = 'rgba(0,0,0,.2)'; for (let y = 12; y < 46; y += 8) g.fillRect(0, y, W, 1.5); g.fillStyle = 'rgba(20,15,40,.25)'; g.fillRect(60, 0, 60, 50); g.restore();
    g.fillStyle = '#2f3d6a'; g.fillRect(2, 42, 116, 4);
    g.globalCompositeOperation = 'source-atop';
    const gr = g.createLinearGradient(0, H - 40, 0, H); gr.addColorStop(0, 'rgba(20,15,10,0)'); gr.addColorStop(1, 'rgba(20,15,10,.3)'); g.fillStyle = gr; g.fillRect(0, H - 40, W, 40);
  });
  return { img, w: W, h: H, glows: [], chim: null };
}

function makeTree(seed, s = 1) {
  const R = rng(seed), W = 170 * s, H = 250 * s;
  const img = off(W, H, g => {
    g.scale(s, s);
    const tg = g.createLinearGradient(70, 0, 100, 0); tg.addColorStop(0, '#7a5638'); tg.addColorStop(1, '#4a3222');
    g.fillStyle = tg; g.beginPath(); g.moveTo(72, 250); g.bezierCurveTo(78, 200, 76, 160, 80, 110); g.lineTo(92, 110); g.bezierCurveTo(94, 160, 92, 200, 102, 250); g.closePath(); g.fill();
    const layers = [['#2f5426', 0, 1.0], ['#44702f', -4, .9], ['#5f8c3a', -8, .75], ['#86ab47', -12, .55], ['#b7c95e', -15, .3]];
    const blobs = []; for (let i = 0; i < 26; i++) { const a = R() * Math.PI * 2, r = Math.sqrt(R()); blobs.push([85 + Math.cos(a) * r * 58, 92 + Math.sin(a) * r * 62, 18 + R() * 16]); }
    layers.forEach(([col, off, k]) => {
      g.fillStyle = col;
      blobs.forEach(([x, y, r], i) => { if (i / blobs.length > k + .05 && k < 1) return; g.beginPath(); g.arc(x + off, y + off * 1.2, r * (0.55 + 0.45 * k), 0, 7); g.fill(); });
    });
  });
  return { img, w: W, h: H, glows: [], chim: null };
}

function makeLantern() {
  const W = 44, H = 170;
  const img = off(W, H, g => {
    g.fillStyle = '#2a2522'; g.fillRect(19, 30, 6, H - 30); g.fillRect(14, H - 8, 16, 8); g.fillRect(16, 32, 12, 4);
    g.fillStyle = '#2a2522'; g.beginPath(); g.moveTo(10, 10); g.lineTo(22, 0); g.lineTo(34, 10); g.closePath(); g.fill();
    g.fillRect(12, 10, 20, 3); g.fillRect(12, 28, 20, 3);
    g.fillStyle = '#e8d49a'; g.fillRect(14, 13, 16, 15);
    g.fillStyle = '#2a2522'; g.fillRect(21, 13, 2, 15);
  });
  return { img, w: W, h: H, glows: [], chim: null, lamp: [22, 20] };
}

function makeClump(seed) {
  const R = rng(seed), W = 110, H = 60;
  return off(W, H, g => {
    for (let i = 0; i < 40; i++) {
      const x = 10 + R() * 90, h = 18 + R() * 38, lean = (R() - .5) * 26;
      g.strokeStyle = ['#2d5223', '#3e6a2c', '#56843a', '#6f9a44'][R() * 4 | 0]; g.lineWidth = 2 + R() * 2;
      g.beginPath(); g.moveTo(x, H); g.quadraticCurveTo(x + lean * .3, H - h * .6, x + lean, H - h); g.stroke();
    }
    for (let i = 0; i < 5; i++) {
      const x = 15 + R() * 80, y = H - 20 - R() * 30, c = ['#f4efe2', '#f0b6c4', '#e9c54f', '#b69ad6'][R() * 4 | 0];
      g.fillStyle = c; for (let p = 0; p < 5; p++) { const a = p / 5 * Math.PI * 2; g.beginPath(); g.arc(x + Math.cos(a) * 3, y + Math.sin(a) * 3, 2.6, 0, 7); g.fill(); }
      g.fillStyle = '#e0a52e'; g.beginPath(); g.arc(x, y, 1.8, 0, 7); g.fill();
    }
  });
}

function makeRoad() {
  const W = 640, H = VH - ROAD_Y + 12, top = 12, R = rng(9);
  return off(W, H, g => {
    let gr = g.createLinearGradient(0, top, 0, H); gr.addColorStop(0, '#b9a079'); gr.addColorStop(1, '#9c8260');
    g.fillStyle = gr; g.fillRect(0, top, W, H - top);
    const stones = ['#c7af88', '#b49b74', '#cfb993', '#a88f6a', '#bda784'];
    for (let y = top + 3, row = 0; y < top + 66; row++) {
      const rh = 6 + (y - top) / 66 * 8; let x = -(R() * 20);
      while (x < W) {
        const sw = rh * (1.4 + R() * .8);
        [x, x - W, x + W].forEach(xx => {
          if (xx + sw < -2 || xx > W + 2) return;
          g.fillStyle = 'rgba(70,50,30,.35)'; g.beginPath(); g.ellipse(xx + sw / 2, y + rh / 2 + .8, sw / 2, rh / 2, 0, 0, 7); g.fill();
          g.fillStyle = stones[R() * stones.length | 0]; g.beginPath(); g.ellipse(xx + sw / 2, y + rh / 2, sw / 2 - .8, rh / 2 - .6, 0, 0, 7); g.fill();
          g.fillStyle = 'rgba(255,245,220,.25)'; g.beginPath(); g.ellipse(xx + sw / 2 - sw * .12, y + rh * .35, sw * .22, rh * .16, 0, 0, 7); g.fill();
        });
        x += sw + 1.5;
      }
      y += rh + 1.2;
    }
    // grassy verge in front
    gr = g.createLinearGradient(0, top + 66, 0, H); gr.addColorStop(0, '#5f8a3a'); gr.addColorStop(1, '#3a6128');
    g.fillStyle = gr; g.fillRect(0, top + 68, W, H - top - 68);
    const blade = (x, base, h, col) => { g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.moveTo(x, base); g.quadraticCurveTo(x + 2, base - h * .6, x + (R() - .5) * 8, base - h); g.stroke(); };
    for (let x = 0; x < W; x += 3) blade(x, top + 72, 6 + R() * 10, ['#4d7a33', '#6f9a44', '#3e6a2c'][R() * 3 | 0]);
    // fringe where the road meets the painted meadow
    for (let x = 0; x < W; x += 2.5) blade(x, top + 4, 4 + R() * 12, ['#58843a', '#7ea24a', '#46702f'][R() * 3 | 0]);
    for (let i = 0; i < 26; i++) { const x = R() * W; g.fillStyle = ['#f4efe2', '#f0b6c4', '#e9c54f'][R() * 3 | 0]; g.beginPath(); g.arc(x, top - 2 + R() * 6, 1.8, 0, 7); g.fill(); }
  });
}

// ---- world layout ----
const BLOOMS_A = ['#e0607a', '#f2c14e', '#f7f1e3'], BLOOMS_B = ['#b779c9', '#f7f1e3', '#f08aa0'], BLOOMS_C = ['#e85d4a', '#f2c14e'];
const LAYOUT = [
  ['tree', 20, { seed: 1, s: 1.1 }],
  ['house', 150, { seed: 11, w: 210, wallH: 140, roofH: 96, wall: '#efe1c2', roof: '#3e5288', shutter: '#4f6f8f', timber: true, windows: [[52, 58], [164, 58]], door: { x: 84, w: 46, h: 90 }, chimney: 150, blooms: BLOOMS_A,
    greet: 'Old Maren leans out of her window. <i>“Good morning, Your Highness! Mind the cobbles, they’re slick with dew.”</i>' }],
  ['stall', 470, { seed: 3, kind: 'apples', awn: ['#b8443b', '#f1e3c3'], label: 'Apples',
    greet: 'The apple seller tips his cap. <i>“First of the autumn reds, Princess!”</i>' }],
  ['tree', 690, { seed: 5, s: .95 }],
  ['house', 820, { seed: 12, w: 230, wallH: 150, roofH: 100, wall: '#ecd1c6', roof: '#a8553a', shutter: '#7b9a6a', timber: true, windows: [[44, 62], [186, 62]], door: { x: 92, w: 50, h: 94, color: '#5d3b25' }, chimney: 30, dormer: true, sign: ['Bakery'], blooms: BLOOMS_C,
    greet: 'The baker waves a floury hand. <i>“Honey loaves are just out of the oven!”</i>' }],
  ['well', 1200, {
    greet: 'Children at the well call out. <i>“Make a wish, Princess!”</i>' }],
  ['house', 1380, { seed: 13, w: 200, wallH: 130, roofH: 104, wall: '#d9ddd2', roof: '#c49a52', thatch: true, shutter: '#8a5a36', windows: [[48, 56], [154, 56]], door: { x: 76, w: 46, h: 88 }, chimney: 140, blooms: BLOOMS_B,
    greet: 'A shepherd’s dog barks hello from the doorway.' }],
  ['lantern', 1660],
  ['stall', 1730, { seed: 4, kind: 'ribbons', awn: ['#3f63a0', '#f1e3c3'], label: 'Ribbons',
    greet: 'The ribbon-maker holds up a gold ribbon. <i>“To tie your bouquet!”</i>' }],
  ['tree', 1920, { seed: 6, s: 1.05 }],
  ['house', 2080, { seed: 14, w: 300, wallH: 222, roofH: 112, wall: '#efe1c2', roof: '#3e5288', shutter: '#9b4d45', timber: true, floor: 104, posts: [100, 200], windows: [[52, 54], [150, 54], [248, 54], [52, 158], [248, 158]], door: { x: 124, w: 54, h: 100 }, chimney: 230, sign: ['Gilded', 'Goose'], blooms: BLOOMS_A,
    greet: 'Laughter spills from the Gilded Goose, and someone raises a cup to you.' }],
  ['lantern', 2520],
  ['tree', 2560, { seed: 7, s: .9 }],
  ['house', 2700, { seed: 15, w: 210, wallH: 140, roofH: 96, wall: '#f1e6cc', roof: '#a8553a', shutter: '#b56b7d', timber: true, windows: [[50, 58], [162, 58]], door: { x: 82, w: 46, h: 90, color: '#4f6f8f' }, chimney: 160, sign: ['Florist'], blooms: BLOOMS_B,
    greet: 'The florist beams. <i>“Every bloom in the valley is out for you today.”</i>' }],
  ['stall', 3040, { seed: 8, kind: 'cheese', awn: ['#5b7d3a', '#f1e3c3'], label: 'Cheese',
    greet: '<i>“A wheel for the castle kitchens?”</i> the cheesemonger asks hopefully.' }],
  ['tree', 3250, { seed: 9, s: 1.1 }],
  ['house', 3380, { seed: 16, w: 200, wallH: 136, roofH: 100, wall: '#ecd1c6', roof: '#3e5288', shutter: '#4f6f8f', timber: true, windows: [[100, 56]], door: { x: 22, w: 44, h: 88 }, chimney: 40, dormer: true, dormerX: 30, blooms: BLOOMS_C,
    greet: 'A cat on the windowsill blinks slowly at you.' }],
  ['lantern', 3680],
  ['house', 3780, { seed: 17, w: 220, wallH: 146, roofH: 98, wall: '#d9ddd2', roof: '#3e5288', shutter: '#5b7d3a', timber: true, windows: [[48, 60], [172, 60]], door: { x: 86, w: 48, h: 92, color: '#5b7d3a' }, chimney: 170, sign: ['Apothecary'], blooms: BLOOMS_B,
    greet: 'The apothecary nods. <i>“Lavender for calm, rosemary for remembrance.”</i>' }],
  ['tree', 4160, { seed: 10, s: 1 }],
  ['tree', 4290, { seed: 2, s: .82 }],
  ['lantern', 4520],
];

const FLOWER_SPOTS = [[430, 0], [700, 1], [990, 0], [1330, 1], [1580, 0], [1880, 0], [2250, 1], [2470, 0], [2790, 1], [3090, 0], [3390, 1], [3710, 0], [4030, 1], [4400, 0]];
const FLOWER_COLS = [['#e06b84', '#f6c3cf'], ['#9f7ad0', '#d9c8f0'], ['#f2c14e', '#fbe6a6'], ['#f4efe2', '#ffffff'], ['#e8664f', '#f7b9a6']];
document.getElementById('total').textContent = FLOWER_SPOTS.length;

// ---- state ----
let props = [], clumps = [], road = null, bg = null, sprite = null, bunting = [];
let mode = 'title';
let px = 200, hop = 0, vy = 0, facing = 1, dist = 0, t = 0, camX = 0, bouquet = 0, invuln = 0, endTimer = 0;
let flowers = [], barrels = [], smoke = [], sparks = [], greeted = new Set(), nextBarrel = 2.5, firstBarrel = true;
const keys = { left: false, right: false };
let hopQueued = false;

function resetWorld(d = {}) {
  mode = d.mode === 'play' ? 'play' : 'title';
  px = d.px ?? 200; hop = 0; vy = 0; facing = d.facing ?? 1; dist = 0; t = d.t ?? 0;
  camX = clamp(px - VW * .38, 0, WORLD - VW); bouquet = d.bouquet ?? 0; invuln = 0; endTimer = 0;
  flowers = FLOWER_SPOTS.map(([x, high], i) => ({ x, y: high ? 236 : 468, taken: d.taken ? !!d.taken[i] : false, col: FLOWER_COLS[i % FLOWER_COLS.length], ph: i * 1.7 }));
  barrels = []; smoke = []; sparks = []; greeted = new Set(d.greeted || []); nextBarrel = 2.5; firstBarrel = d.firstBarrel ?? true;
  hud(true);
}

// ---- HUD / toasts ----
const $ = id => document.getElementById(id);
let lastHud = '';
function timeName(p) { return p < .22 ? 'Morning' : p < .45 ? 'Midday' : p < .72 ? 'Afternoon' : p < 1 ? 'Golden hour' : 'Sunset'; }
function hud(force) {
  const p = Math.min(1, t / DAY), name = timeName(p), key = bouquet + name + Math.round(p * 40);
  if (!force && key === lastHud) return; lastHud = key;
  $('bouquet').textContent = bouquet; $('tod').textContent = name;
  const a = Math.PI * (1 - p); $('sunDot').setAttribute('cx', (20 + Math.cos(a) * 17).toFixed(1)); $('sunDot').setAttribute('cy', (21 - Math.sin(a) * 17).toFixed(1));
}
const toastQ = []; let toastT = 0;
function toast(html, urgent) { if (urgent) toastQ.unshift(html); else toastQ.push(html); if (toastQ.length > 3) toastQ.length = 3; if (urgent) toastT = 0; }
function tickToast(dt) {
  toastT -= dt;
  if (toastT <= 0) {
    const el = $('toast');
    if (toastQ.length) { el.innerHTML = toastQ.shift(); el.classList.add('on'); toastT = 3.8; }
    else el.classList.remove('on');
  }
}

// ---- sound (starts on first click) ----
let ac = null, muted = false;
function audio() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } } if (ac && ac.state === 'suspended') ac.resume(); }
function tone(freqs, dur, type = 'sine', vol = .07, gap = .07) {
  if (!ac || muted) return; const t0 = ac.currentTime;
  freqs.forEach((f, i) => { const o = ac.createOscillator(), g = ac.createGain(), s = t0 + i * gap; o.type = type; o.frequency.value = f; g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(vol, s + .012); g.gain.exponentialRampToValueAtTime(.0001, s + dur); o.connect(g).connect(ac.destination); o.start(s); o.stop(s + dur + .05); });
}
$('mute').addEventListener('click', () => { muted = !muted; $('mute').textContent = muted ? 'Sound off' : 'Sound on'; $('mute').setAttribute('aria-pressed', muted); });

// ---- input ----
const KL = ['ArrowLeft', 'a', 'A'], KR = ['ArrowRight', 'd', 'D'], KH = [' ', 'ArrowUp', 'w', 'W'];
addEventListener('keydown', e => {
  if (KL.includes(e.key)) keys.left = true;
  else if (KR.includes(e.key)) keys.right = true;
  else if (KH.includes(e.key)) { if (mode === 'play') hopQueued = true; }
  else if (e.key === 'Enter' && mode !== 'play' && !e.target.closest?.('button')) { begin(); }
  else return;
  if (mode === 'play' || KH.includes(e.key) || e.key.startsWith('Arrow')) { if (!e.target.closest?.('button') || mode === 'play') e.preventDefault(); }
});
addEventListener('keyup', e => { if (KL.includes(e.key)) keys.left = false; if (KR.includes(e.key)) keys.right = false; });
addEventListener('blur', () => { keys.left = keys.right = false; });
function hold(id, on, offFn) {
  const el = $(id);
  el.addEventListener('pointerdown', e => { e.preventDefault(); el.setPointerCapture?.(e.pointerId); el.classList.add('held'); on(); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => el.addEventListener(ev, () => { el.classList.remove('held'); offFn && offFn(); }));
}
hold('tLeft', () => keys.left = true, () => keys.left = false);
hold('tRight', () => keys.right = true, () => keys.right = false);
hold('tHop', () => { if (mode === 'play') hopQueued = true; });

function begin() {
  audio(); resetWorld({ mode: 'play' }); mode = 'play';
  $('titleCard').hidden = true; $('endCard').hidden = true; canvas.focus?.();
  toast('Wildflowers grow all along the lane. Walk right toward the castle.');
}
$('startBtn').addEventListener('click', begin);
$('againBtn').addEventListener('click', begin);

// ---- update ----
function update(dt) {
  if (mode === 'play' || mode === 'ending') {
    t += dt;
    let dir = mode === 'ending' ? 1 : (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    const sp = mode === 'ending' ? SPEED * .6 : SPEED;
    if (dir) { facing = dir; const nx = clamp(px + dir * sp * dt, 60, WORLD - 60); dist += Math.abs(nx - px); px = nx; }
    if (hopQueued && hop === 0 && mode === 'play') { vy = HOP_V; tone([523, 784], .16, 'sine', .035, .05); }
    hopQueued = false;
    if (hop > 0 || vy > 0) { hop += vy * dt; vy -= GRAV * dt; if (hop <= 0) { hop = 0; vy = 0; } }
    invuln = Math.max(0, invuln - dt);

    // flowers
    const top = GROUND - hop - FH * PS + 6, bottom = GROUND - hop;
    flowers.forEach(f => {
      if (f.taken || mode !== 'play') return;
      const fy = f.y + Math.sin(t * 2 + f.ph) * 4;
      if (Math.abs(f.x - px) < 42 && fy > top - 12 && fy < bottom + 10) {
        f.taken = true; bouquet++;
        for (let i = 0; i < 18; i++) { const a = Math.random() * 7, s = 60 + Math.random() * 140; sparks.push({ x: f.x, y: fy, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, life: 0, max: .6 + Math.random() * .4, col: Math.random() < .5 ? f.col[0] : '#fff3c4' }); }
        tone([880, 1175, 1568], .35, 'triangle', .05);
        if (bouquet === 1) toast('One for the bouquet. Some blooms float higher up. Hop to reach those.');
      }
    });

    // loose barrels from the cooper's cart
    if (mode === 'play' && px > 650 && px < 4600) {
      nextBarrel -= dt;
      if (nextBarrel <= 0) {
        barrels.push({ x: camX + VW + 40, v: 150 + Math.random() * 70, rot: 0 });
        nextBarrel = 2.6 + Math.random() * 2.2;
        if (firstBarrel) { firstBarrel = false; toast(`A barrel has rolled loose from the cooper’s cart. ${isTouch ? 'Tap Hop' : 'Press Space'} to hop over it.`, true); }
      }
    }
    barrels.forEach(b => {
      b.x -= b.v * dt; b.rot -= b.v * dt / 22;
      if (!b.hit && mode === 'play' && invuln === 0 && Math.abs(b.x - px) < 38 && hop < 38) {
        b.hit = true; invuln = 1.3; tone([150, 98], .3, 'sine', .12, .08);
        if (bouquet > 0) {
          bouquet--;
          for (let i = 0; i < 14; i++) { const a = -Math.random() * Math.PI, s = 80 + Math.random() * 120; sparks.push({ x: px, y: GROUND - 90 - hop, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: .8, col: '#e06b84', petal: true }); }
          toast('Oof! The barrel knocked a flower out of your bouquet.', true);
        }
      }
    });
    barrels = barrels.filter(b => b.x > camX - 120);

    // greetings
    props.forEach(p => {
      if (!p.greet || greeted.has(p.id)) return;
      if (Math.abs(px - (p.x + p.w / 2)) < 90) { greeted.add(p.id); toast(p.greet); }
    });

    if (mode === 'play' && px >= FINISH) { mode = 'ending'; endTimer = 1.4; tone([523, 659, 784, 1047], .7, 'triangle', .06, .12); }
    if (mode === 'ending') { endTimer -= dt; if (endTimer <= 0) finish(); }
  }

  const target = clamp(px - VW * .38, 0, WORLD - VW);
  camX += (target - camX) * Math.min(1, dt * (reduceMotion ? 20 : 6));

  // chimney smoke
  if (!reduceMotion) props.forEach(p => {
    if (!p.chim) return; const sx = p.x + p.chim[0] / 2;
    if (sx < camX - 100 || sx > camX + VW + 100) return;
    p.smokeT = (p.smokeT || 0) - dt;
    if (p.smokeT <= 0) { p.smokeT = .22; smoke.push({ x: p.x + p.chim[0], y: BASE - p.h + p.chim[1], vx: 8 + Math.random() * 8, vy: -16 - Math.random() * 10, life: 0, max: 3.5 + Math.random() }); }
  });
  smoke.forEach(s => { s.life += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vx += 3 * dt; });
  smoke = smoke.filter(s => s.life < s.max);
  sparks.forEach(s => { s.life += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += (s.petal ? 260 : 120) * dt; s.vx *= .98; });
  sparks = sparks.filter(s => s.life < s.max);
  tickToast(dt); hud();
}

function finish() {
  mode = 'end';
  const n = bouquet, total = FLOWER_SPOTS.length, p = Math.min(1, t / DAY);
  const stars = n >= total ? 3 : n >= Math.ceil(total * .65) ? 2 : n >= 4 ? 1 : 0;
  $('endTitle').textContent = n >= total ? 'A perfect bouquet' : n >= 10 ? 'A lovely bouquet' : n >= 5 ? 'A modest posy' : n > 0 ? 'A handful of blooms' : 'Home, empty-handed';
  const when = timeName(p).toLowerCase();
  $('endText').textContent = `You reached the castle gate ${when === 'sunset' ? 'just after sunset' : 'in the ' + (when === 'midday' ? 'middle of the day' : when)}, carrying ${n} of ${total} wildflowers.${n < total ? ' A few more are still waiting along the lane.' : ' Every flower in the village made it home.'}`;
  const star = on => `<svg viewBox="0 0 24 24" class="${on ? '' : 'off'}" aria-hidden="true"><path fill="currentColor" d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 20.9l1.6-7L2 9.2l7.1-.6z"/></svg>`;
  $('stars').innerHTML = [0, 1, 2].map(i => star(i < stars)).join('');
  $('stars').setAttribute('aria-label', `${stars} of 3 stars`);
  $('endCard').hidden = false; $('againBtn').focus();
}

// ---- render ----
function drawFlower(x, y, col, s = 1, glow = 1) {
  ctx.save(); ctx.translate(x, y);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 30 * s); g.addColorStop(0, `rgba(255,244,200,${.55 * glow})`); g.addColorStop(1, 'rgba(255,244,200,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 30 * s, 0, 7); ctx.fill();
  ctx.strokeStyle = '#4d7a33'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 4); ctx.quadraticCurveTo(-3, 14, 1, 22 * s); ctx.stroke();
  ctx.fillStyle = '#5d8a3a'; ctx.beginPath(); ctx.ellipse(-5, 14, 5, 2.4, -.5, 0, 7); ctx.fill();
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 - Math.PI / 2; ctx.fillStyle = col[0]; ctx.beginPath(); ctx.ellipse(Math.cos(a) * 6 * s, Math.sin(a) * 6 * s, 5.4 * s, 4 * s, a, 0, 7); ctx.fill(); ctx.fillStyle = col[1]; ctx.beginPath(); ctx.ellipse(Math.cos(a) * 5 * s, Math.sin(a) * 5 * s, 2.2 * s, 1.5 * s, a, 0, 7); ctx.fill(); }
  ctx.fillStyle = '#e0a52e'; ctx.beginPath(); ctx.arc(0, 0, 3.4 * s, 0, 7); ctx.fill();
  ctx.restore();
}
function drawBarrel(b) {
  const x = b.x - camX, y = GROUND - 23;
  ctx.fillStyle = 'rgba(30,20,10,.25)'; ctx.beginPath(); ctx.ellipse(x, GROUND + 1, 24, 5, 0, 0, 7); ctx.fill();
  ctx.save(); ctx.translate(x, y); ctx.rotate(b.rot);
  ctx.fillStyle = '#8a5a36'; ctx.beginPath(); ctx.arc(0, 0, 23, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(50,28,12,.6)'; ctx.lineWidth = 1.5;
  for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 7, -Math.sqrt(400 - i * i * 49)); ctx.lineTo(i * 7, Math.sqrt(400 - i * i * 49)); ctx.stroke(); }
  ctx.strokeStyle = '#3b3a3a'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(0, 0, 21, 0, 7); ctx.stroke();
  ctx.fillStyle = '#5a3a24'; ctx.beginPath(); ctx.arc(9, -6, 2.4, 0, 7); ctx.fill();
  ctx.restore();
  ctx.fillStyle = 'rgba(255,240,210,.18)'; ctx.beginPath(); ctx.arc(x - 6, y - 7, 10, 0, 7); ctx.fill();
}
function drawBunting(a, b) {
  const x0 = a[0] - camX, y0 = a[1], x1 = b[0] - camX, y1 = b[1];
  if (Math.max(x0, x1) < -20 || Math.min(x0, x1) > VW + 20) return;
  const mx = (x0 + x1) / 2, my = Math.max(y0, y1) + 46;
  ctx.strokeStyle = '#4a3a2a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(mx, my, x1, y1); ctx.stroke();
  const cols = ['#c86a7c', '#e2b04a', '#3f63a0', '#f1e3c3', '#5b8a4a'];
  const n = Math.floor(Math.hypot(x1 - x0, y1 - y0) / 24);
  const q = (u) => [(1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * mx + u * u * x1, (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * my + u * u * y1];
  for (let i = 1; i < n; i++) {
    const [ax, ay] = q((i - .3) / n), [bx, by] = q((i + .3) / n), sway = reduceMotion ? 0 : Math.sin(t * 2.4 + i * .8) * 2;
    ctx.fillStyle = cols[i % cols.length]; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo((ax + bx) / 2 + sway, (ay + by) / 2 + 15); ctx.closePath(); ctx.fill();
  }
}
function drawBanner(x, phase) {
  const sx = x - camX; if (sx < -60 || sx > VW + 60) return;
  ctx.fillStyle = '#3a2e26'; ctx.fillRect(sx - 3, BASE - 210, 6, 214);
  ctx.fillStyle = '#d8a446'; ctx.beginPath(); ctx.arc(sx, BASE - 213, 5, 0, 7); ctx.fill();
  const top = BASE - 200, len = 92;
  ctx.fillStyle = '#34508f'; ctx.beginPath(); ctx.moveTo(sx + 3, top);
  for (let i = 0; i <= 10; i++) { const u = i / 10; ctx.lineTo(sx + 3 + u * 40 + Math.sin(t * 3 + u * 4 + phase) * 3 * u, top + 2 * u); }
  const tipW = Math.sin(t * 3 + 4 + phase) * 3;
  ctx.lineTo(sx + 43 + tipW, top + len); ctx.lineTo(sx + 23 + tipW * .6, top + len - 18); ctx.lineTo(sx + 3, top + len); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#e2b04a'; ctx.beginPath(); ctx.moveTo(sx + 23, top + 26); ctx.lineTo(sx + 30, top + 40); ctx.lineTo(sx + 23, top + 54); ctx.lineTo(sx + 16, top + 40); ctx.closePath(); ctx.fill();
}

function render() {
  ctx.setTransform(K, 0, 0, K, 0, 0);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  const phase = Math.min(1, t / DAY);

  // painted valley: scrolls slowly so the castle comes into view by the end of the lane
  const bgW = bg.width * VH / bg.height, bgX = -(camX / (WORLD - VW)) * (bgW - VW);
  ctx.drawImage(bg, bgX, 0, bgW, VH);

  // birds over the far valley
  if (!reduceMotion) for (let i = 0; i < 4; i++) {
    const bx = ((i * 330 + t * (18 + i * 4) - camX * .25) % (VW + 200) + VW + 200) % (VW + 200) - 100, by = 70 + i * 26 + Math.sin(t * .7 + i) * 8, f = Math.sin(t * 7 + i * 2) * 4;
    ctx.strokeStyle = 'rgba(50,60,80,.55)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(bx - 7, by - f); ctx.quadraticCurveTo(bx - 3, by - 3, bx, by); ctx.quadraticCurveTo(bx + 3, by - 3, bx + 7, by - f); ctx.stroke();
  }

  // village
  props.forEach(p => {
    const sx = p.x - camX; if (sx > VW + 10 || sx + p.w < -10) return;
    ctx.drawImage(p.img, sx, BASE - p.h + (p.type === 'tree' ? 8 : 0), p.w, p.h);
  });
  bunting.forEach(([a, b]) => drawBunting(a, b));
  smoke.forEach(s => { const k = s.life / s.max; ctx.fillStyle = `rgba(236,234,238,${.32 * (1 - k) * Math.min(1, s.life * 3)})`; ctx.beginPath(); ctx.arc(s.x - camX, s.y, 5 + s.life * 6, 0, 7); ctx.fill(); });
  drawBanner(FINISH - 30, 0); drawBanner(FINISH + 150, 1.7);

  // road
  const rw = road.width / 2, ro = -((camX % rw) + rw) % rw;
  for (let x = ro; x < VW; x += rw) ctx.drawImage(road, x, ROAD_Y - 12, rw, road.height / 2);

  // signpost at the gate
  { const sx = FINISH - 90 - camX; if (sx > -80 && sx < VW + 80) {
    ctx.fillStyle = '#5a3a24'; ctx.fillRect(sx - 3, ROAD_Y - 70, 6, 76);
    ctx.fillStyle = '#ead9b1'; ctx.beginPath(); ctx.moveTo(sx - 30, ROAD_Y - 66); ctx.lineTo(sx + 40, ROAD_Y - 66); ctx.lineTo(sx + 52, ROAD_Y - 55); ctx.lineTo(sx + 40, ROAD_Y - 44); ctx.lineTo(sx - 30, ROAD_Y - 44); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#6b4428'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#4a3020'; ctx.font = '13px "IM Fell English SC", Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('Castle Gate', sx + 9, ROAD_Y - 54);
  } }

  // flowers
  flowers.forEach(f => {
    if (f.taken) return; const sx = f.x - camX; if (sx < -40 || sx > VW + 40) return;
    const fy = f.y + Math.sin(t * 2 + f.ph) * 4;
    drawFlower(sx, fy, f.col, 1, .7 + Math.sin(t * 3 + f.ph) * .3);
    const tw = (Math.sin(t * 4 + f.ph * 3) + 1) / 2; ctx.fillStyle = `rgba(255,250,220,${tw * .9})`; ctx.save(); ctx.translate(sx + 10, fy - 12); ctx.rotate(t); ctx.fillRect(-4, -.8, 8, 1.6); ctx.fillRect(-.8, -4, 1.6, 8); ctx.restore();
  });
  barrels.forEach(drawBarrel);

  // princess
  const sx = px - camX, moving = (mode === 'play' && (keys.left !== keys.right)) || mode === 'ending';
  const frame = hop > 0 ? 2 : moving ? Math.floor(dist / 34) % 4 : 0;
  ctx.fillStyle = `rgba(30,20,10,${.28 * (1 - Math.min(hop, 120) / 200)})`; ctx.beginPath(); ctx.ellipse(sx + 4, GROUND, 62 * (1 - hop / 400), 9, 0, 0, 7); ctx.fill();
  ctx.save(); ctx.translate(sx, GROUND - hop); if (facing < 0) ctx.scale(-1, 1);
  if (invuln > 0 && Math.floor(invuln * 12) % 2) ctx.globalAlpha = .45;
  ctx.drawImage(sprite, frame * FW, 0, FW, FH, -AX * PS, -(FH - 2) * PS, FW * PS, FH * PS);
  ctx.restore();

  // grass at the front edge
  clumps.forEach(c => { const cx = c.x - camX * 1.25; const wrap = ((cx % (WORLD * 1.25)) + WORLD * 1.25) % (WORLD * 1.25); if (wrap > VW + 10 || wrap < -120) return; ctx.drawImage(c.img, wrap, VH - 52 + c.dy, 110, 60); });

  // the day turns to golden hour
  if (phase > 0) {
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = `rgb(255,${Math.round(lerp(255, 196, phase))},${Math.round(lerp(255, 150, phase))})`; ctx.fillRect(0, 0, VW, VH);
    ctx.globalCompositeOperation = 'source-over';
    const sky = ctx.createLinearGradient(0, 0, 0, VH * .6); sky.addColorStop(0, `rgba(255,150,90,${.16 * phase})`); sky.addColorStop(1, 'rgba(255,150,90,0)');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, VW, VH * .6);
  }
  // windows and lanterns light up late in the day
  const glow = smooth(.55, 1, phase);
  if (glow > 0) {
    ctx.globalCompositeOperation = 'lighter';
    props.forEach(p => {
      const ox = p.x - camX, oy = BASE - p.h; if (ox > VW || ox + p.w < 0) return;
      p.glows.forEach(([x, y, w, h]) => {
        ctx.fillStyle = `rgba(255,170,60,${.55 * glow})`; ctx.fillRect(ox + x, oy + y, w, h);
        const r = ctx.createRadialGradient(ox + x + w / 2, oy + y + h / 2, 2, ox + x + w / 2, oy + y + h / 2, 46); r.addColorStop(0, `rgba(255,170,80,${.22 * glow})`); r.addColorStop(1, 'rgba(255,170,80,0)');
        ctx.fillStyle = r; ctx.fillRect(ox + x - 46, oy + y - 46, w + 92, h + 92);
      });
      if (p.lamp) { const lx = ox + p.lamp[0], ly = oy + p.lamp[1], fl = .85 + Math.sin(t * 9 + p.x) * .08; const r = ctx.createRadialGradient(lx, ly, 1, lx, ly, 70); r.addColorStop(0, `rgba(255,200,110,${.7 * glow * fl})`); r.addColorStop(.25, `rgba(255,170,70,${.25 * glow * fl})`); r.addColorStop(1, 'rgba(255,160,60,0)'); ctx.fillStyle = r; ctx.fillRect(lx - 70, ly - 70, 140, 140); }
    });
    ctx.globalCompositeOperation = 'source-over';
  }
  sparks.forEach(s => { const k = 1 - s.life / s.max; ctx.fillStyle = s.col; ctx.globalAlpha = k; ctx.beginPath(); if (s.petal) ctx.ellipse(s.x - camX, s.y, 4, 2.4, s.life * 6, 0, 7); else ctx.arc(s.x - camX, s.y, 2.2, 0, 7); ctx.fill(); });
  ctx.globalAlpha = 1;
}

// ---- loop ----
let last = 0;
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000 || 0); last = now;
  update(dt); render();
  requestAnimationFrame(frame);
}

function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }

async function start(data) {
  resize();
  try { await Promise.race([document.fonts.load('13px "IM Fell English SC"'), new Promise(r => setTimeout(r, 1500))]); } catch (e) {}
  [bg, sprite] = await Promise.all([loadImg('castle.jpg'), loadImg('princess.png')]);
  road = makeRoad();
  let id = 0;
  props = LAYOUT.map(([type, x, o = {}]) => {
    const made = type === 'house' ? makeHouse(o) : type === 'stall' ? makeStall(o) : type === 'well' ? makeWell() : type === 'tree' ? makeTree(o.seed, o.s) : makeLantern();
    return { ...made, type, x, id: id++, greet: o.greet };
  });
  // lanterns and well sit at the road's back edge, in front of buildings
  props.sort((a, b) => (a.type === 'tree' ? 0 : a.type === 'lantern' ? 2 : 1) - (b.type === 'tree' ? 0 : b.type === 'lantern' ? 2 : 1));
  const houses = props.filter(p => p.type === 'house').sort((a, b) => a.x - b.x);
  bunting = [];
  for (let i = 0; i < houses.length - 1; i++) {
    const a = houses[i], b = houses[i + 1];
    const pa = [a.x + a.eaves[1][0], BASE - a.h + a.eaves[1][1]], pb = [b.x + b.eaves[0][0], BASE - b.h + b.eaves[0][1]];
    if (pb[0] - pa[0] < 560) bunting.push([pa, pb]);
  }
  const R = rng(42); clumps = [];
  for (let x = 0; x < WORLD * 1.25; x += 90 + R() * 160) clumps.push({ x, img: makeClump(R() * 1e6 | 0), dy: R() * 10 });

  resetWorld(data || {});
  if (mode === 'play') { $('titleCard').hidden = true; }
  window.claude?.hot?.snapshot?.(() => ({ mode: mode === 'play' ? 'play' : 'title', px, t, facing, bouquet, taken: flowers.map(f => f.taken), greeted: [...greeted], firstBarrel }));
  requestAnimationFrame(now => { last = now; requestAnimationFrame(frame); });
}

window.claude?.hot?.ready ? window.claude.hot.ready(start) : start(window.claude?.hot?.data ?? {});
})();
