// ===== rendering. World units are scaled to fit the screen; the arena floor is painted once and reused.
const cv = $('cv'), cx = cv.getContext('2d');
let VW = 0, VH = 0, DPR = 1, SC = 1, floorC = null;
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  VW = innerWidth; VH = innerHeight;
  cv.width = VW * DPR; cv.height = VH * DPR;
  cv.style.width = VW + 'px'; cv.style.height = VH + 'px';
  SC = Math.min(VW / (2 * (R + (VW < 700 ? 12 : 60))), (VH - 130) / (2 * (R + 12)));
}
function makeFloor() {
  if (typeof document.createElement !== 'function') return null;
  const c = document.createElement('canvas'), q = 1.5, half = R + 14, s = half * 2 * q;
  c.width = c.height = s;
  const g = c.getContext('2d'); if (!g) return null;
  g.translate(s / 2, s / 2); g.scale(q, q);
  const gr = g.createRadialGradient(0, 0, 20, 0, 0, R);
  gr.addColorStop(0, '#242031'); gr.addColorStop(.65, '#1a1724'); gr.addColorStop(1, '#100e17');
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
  // rings of worn flagstones
  let r0 = 26;
  [70, 122, 176, 232, R].forEach((r1, ri) => {
    const n = 7 + ri * 5, off = ri * .41;
    for (let i = 0; i < n; i++) {
      const a0 = off + i / n * TAU + .012, a1 = off + (i + 1) / n * TAU - .012, l = Math.random();
      g.fillStyle = `rgba(${l > .5 ? '255,255,255' : '0,0,0'},${.012 + Math.abs(l - .5) * .07})`;
      g.beginPath(); g.arc(0, 0, r1 - 1.6, a0, a1); g.arc(0, 0, r0 + 1.6, a1, a0, true); g.closePath(); g.fill();
    }
    r0 = r1;
  });
  // grit and cracks
  for (let i = 0; i < 520; i++) { const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * R; g.fillStyle = Math.random() < .5 ? 'rgba(0,0,0,.22)' : 'rgba(255,255,255,.05)'; g.fillRect(Math.cos(a) * r, Math.sin(a) * r, 1.4, 1.4); }
  g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 1.2;
  for (let i = 0; i < 9; i++) { let a = Math.random() * TAU, r = rnd(40, R - 30), x = Math.cos(a) * r, y = Math.sin(a) * r; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 5; j++) { x += rnd(-16, 16); y += rnd(-16, 16); g.lineTo(x, y); } g.stroke(); }
  // centre sigil: the four elements
  g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, 26, 0, TAU); g.stroke();
  ORDER.forEach((el, i) => { const a = i / 4 * TAU - Math.PI / 4, x = Math.cos(a) * 15, y = Math.sin(a) * 15; g.fillStyle = rgba(COL[el], .28); g.beginPath(); g.moveTo(x, y - 5); g.lineTo(x + 5, y); g.lineTo(x, y + 5); g.lineTo(x - 5, y); g.closePath(); g.fill(); });
  // inner shadow at the rim
  const rim = g.createRadialGradient(0, 0, R - 46, 0, 0, R); rim.addColorStop(0, 'rgba(0,0,0,0)'); rim.addColorStop(1, 'rgba(0,0,0,.45)');
  g.fillStyle = rim; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
  return c;
}

function draw() {
  const c = cx;
  c.setTransform(DPR, 0, 0, DPR, 0, 0);
  c.fillStyle = '#07080b'; c.fillRect(0, 0, VW, VH);
  const sh = S ? Math.min(3.5, S.shake * .35) : 0, zoom = SC * (1 + (S ? S.punch : 0) * .012);
  c.setTransform(DPR * zoom, 0, 0, DPR * zoom, (VW / 2 + rnd(-1, 1) * sh) * DPR, (VH / 2 + 14 + rnd(-1, 1) * sh) * DPR);
  const T = S ? S.time : performance.now() / 1000;
  const endless = S && S.wave > 20, bossOn = S && S.enemies.some(e => e.boss);

  // ---- arena
  if (floorC === null) floorC = makeFloor() || false;
  if (floorC) c.drawImage(floorC, -(R + 14), -(R + 14), (R + 14) * 2, (R + 14) * 2);
  else { c.fillStyle = '#1a1724'; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill(); }
  if (endless || bossOn) { c.fillStyle = endless ? 'rgba(130,10,24,.16)' : 'rgba(120,20,60,.10)'; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill(); }
  const flick = endless && Math.random() < .04 ? .3 : 0, pulse = Math.sin(T * (endless ? 6 : 2));
  c.lineWidth = 10; c.strokeStyle = `rgba(255,90,60,${.10 + (endless ? .1 : 0) + pulse * .03})`; c.beginPath(); c.arc(0, 0, R + 3, 0, TAU); c.stroke();
  c.lineWidth = 3; c.strokeStyle = `rgba(255,128,88,${.7 + pulse * .15 - flick})`; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.stroke();
  // rune ticks drifting round the rim
  c.save(); c.rotate(T * (endless ? -.12 : .04)); c.fillStyle = 'rgba(255,150,110,.5)';
  for (let i = 0; i < 24; i++) { c.rotate(TAU / 24); c.fillRect(R + 6, -1, i % 3 ? 4 : 9, 2); }
  c.restore();
  if (!S) return;
  const p = S.p;

  // ---- ground layer: zones, auras, events, enemy attack warnings
  for (const z of S.zones) {
    const a = Math.min(1, z.life * 2);
    if (z.k === 'fire') { c.fillStyle = `rgba(255,${90 + (Math.random() * 60 | 0)},40,${.2 * a})`; c.beginPath(); c.arc(z.x, z.y, z.r, 0, TAU); c.fill(); }
    else if (z.k === 'storm') { c.fillStyle = `rgba(52,50,84,${.4 * a})`; c.beginPath(); c.arc(z.x, z.y, z.r, 0, TAU); c.fill(); c.strokeStyle = `rgba(255,220,90,${.4 * a})`; c.lineWidth = 1.5; c.setLineDash([6, 6]); c.lineDashOffset = T * 30; c.stroke(); c.setLineDash([]); }
    else { c.fillStyle = `rgba(190,230,255,${.1 * a})`; c.beginPath(); c.arc(z.x, z.y, z.r, 0, TAU); c.fill(); c.strokeStyle = `rgba(220,245,255,${.4 * a})`; c.lineWidth = 1.5; c.setLineDash([2, 6]); c.stroke(); c.setLineDash([]); }
  }
  for (const pi of S.pillars) { const a = Math.min(1, pi.life); c.fillStyle = `rgba(120,200,255,${.07 * a})`; c.beginPath(); c.arc(pi.x, pi.y, pi.r, 0, TAU); c.fill(); c.strokeStyle = `rgba(190,234,255,${.3 * a})`; c.lineWidth = 1.5; c.setLineDash([3, 5]); c.stroke(); c.setLineDash([]); }
  const halo = sv('halo'); if (halo) { c.strokeStyle = 'rgba(160,220,255,.3)'; c.lineWidth = 2; c.setLineDash([2, 7]); c.lineDashOffset = T * 10; c.beginPath(); c.arc(p.x, p.y, halo, 0, TAU); c.stroke(); c.setLineDash([]); }
  const aura = sv('inferno'); if (aura) { c.strokeStyle = 'rgba(255,110,50,.28)'; c.lineWidth = 2; c.setLineDash([4, 6]); c.lineDashOffset = -T * 14; c.beginPath(); c.arc(p.x, p.y, aura, 0, TAU); c.stroke(); c.setLineDash([]); }
  for (const ev of S.evs) drawEvent(c, ev, T);
  for (const t of S.tele) { const k = t.t / t.life; c.fillStyle = `rgba(255,40,60,${.1 + k * .22})`; c.beginPath(); c.arc(t.x, t.y, t.r, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,60,80,.28)'; c.beginPath(); c.arc(t.x, t.y, t.r * k, 0, TAU); c.fill(); c.strokeStyle = '#ff4d5e'; c.lineWidth = 3; c.beginPath(); c.arc(t.x, t.y, t.r, 0, TAU); c.stroke(); }
  for (const e of S.enemies) if (e.mode === 'wind') { c.strokeStyle = `rgba(255,60,80,${.35 + Math.sin(T * 40) * .2})`; c.lineWidth = e.r * 1.2; c.lineCap = 'butt'; c.beginPath(); c.moveTo(e.x, e.y); c.lineTo(e.x + e.dx * 170, e.y + e.dy * 170); c.stroke(); }

  // ---- loot
  const blink = S.collectT !== null && S.collectT < 1.2 && Math.floor(S.collectT * 10) % 2 === 0;
  if (!blink) for (const d of S.drops) {
    const b = 1 + Math.sin(T * 6 + d.ph) * .15, y = d.y - d.z;
    c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(d.x, d.y + 3, 4, 1.8, 0, 0, TAU); c.fill();
    if (d.k === 'gold') {
      c.fillStyle = 'rgba(242,193,78,.2)'; c.beginPath(); c.arc(d.x, y, 9 * b, 0, TAU); c.fill();
      c.fillStyle = '#f2c14e'; c.beginPath(); c.arc(d.x, y, 4.6, 0, TAU); c.fill();
      c.fillStyle = '#fff2c4'; c.beginPath(); c.arc(d.x - 1.3, y - 1.3, 1.5, 0, TAU); c.fill();
    } else {
      const s2 = 5.2 * b * (d.v >= 4 ? 1.35 : 1);
      c.fillStyle = 'rgba(155,140,255,.2)'; c.beginPath(); c.arc(d.x, y, s2 * 1.9, 0, TAU); c.fill();
      c.fillStyle = '#b4a8ff'; c.beginPath(); c.moveTo(d.x, y - s2); c.lineTo(d.x + s2 * .8, y); c.lineTo(d.x, y + s2); c.lineTo(d.x - s2 * .8, y); c.closePath(); c.fill();
      c.fillStyle = '#e6e0ff'; c.beginPath(); c.moveTo(d.x, y - s2); c.lineTo(d.x + s2 * .8, y); c.lineTo(d.x, y); c.closePath(); c.fill();
    }
  }

  // ---- enemies and structures
  for (const e of S.enemies) drawEnemy(c, e, T);
  for (const pi of S.pillars) { c.globalAlpha = Math.min(1, pi.life); drawCrystal(c, pi.x, pi.y, 22, 9); c.globalAlpha = 1; }
  for (const b of S.walls) { c.globalAlpha = Math.min(1, b.life * 2); drawCrystal(c, b.x, b.y, 15 + b.seed * 6, b.r); c.globalAlpha = 1; }
  for (const rd of S.rods) {
    c.globalAlpha = Math.min(1, rd.life);
    c.strokeStyle = '#8a7a3a'; c.lineWidth = 3; c.beginPath(); c.moveTo(rd.x, rd.y + 6); c.lineTo(rd.x, rd.y - 22); c.stroke();
    c.fillStyle = '#fff6c0'; c.beginPath(); c.arc(rd.x, rd.y - 24, 4 + Math.sin(T * 20) * 1.2, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(255,220,90,.14)'; c.lineWidth = 1; c.beginPath(); c.arc(rd.x, rd.y, 110, 0, TAU); c.stroke();
    c.globalAlpha = 1;
  }

  // ---- your side: golems, thralls, sprites, spirits, wizards
  for (const g of S.golems) {
    c.globalAlpha = g.life < 1 ? Math.max(0, g.life) : 1;
    if (g.thrall) { const f = g.e || (g.e = { shape: g.shape, r: g.r, col: '#a9dcf5', hitT: 0, frozen: 0, wob: 0, mode: 'walk', burnT: 0, chill: 0, stun: 0, hp: 1, maxHp: 1, dx: 0, dy: 0, thr: true }); f.x = g.x; f.y = g.y; f.wob = T * 6; drawEnemy(c, f, T); hpArc(c, g, g.r + 4, ICE); }
    else drawGolem(c, g, g.big ? 1.9 : 1, T);
    c.globalAlpha = 1;
  }
  if (S.colossus) drawGolem(c, S.colossus, 2.6, T);
  for (const sp of S.sprites) drawSprite(c, sp, T);
  for (const sp of S.spirits) drawSpirit(c, sp, T);
  for (const w of S.wizards) drawWizard(c, w, T);
  for (const f of S.projs) {
    if (f.k === 'boulder') { c.save(); c.translate(f.x, f.y); c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(0, 12, 14, 5, 0, 0, TAU); c.fill(); c.rotate(f.rot); rockPath(c, 15, 8, 1.1); c.fillStyle = '#7a6446'; c.fill(); c.strokeStyle = '#4a3c28'; c.lineWidth = 2; c.stroke(); c.fillStyle = '#5a4832'; c.beginPath(); c.arc(-4, -3, 3, 0, TAU); c.arc(5, 4, 2.4, 0, TAU); c.fill(); c.restore(); }
    else if (f.k === 'stone') { c.fillStyle = '#a88a5c'; c.strokeStyle = '#5a4832'; c.lineWidth = 1; c.beginPath(); c.arc(f.x, f.y, 4.5, 0, TAU); c.fill(); c.stroke(); }
  }

  // ---- glowing effects (additive). Dimmed when the screen is crowded so enemies stay readable.
  c.globalCompositeOperation = 'lighter';
  const fa = S.enemies.length > 70 ? .6 : 1;
  for (const f of S.projs) {
    if (f.k === 'fireball') { c.fillStyle = 'rgba(255,90,40,.35)'; c.beginPath(); c.arc(f.x, f.y, 14, 0, TAU); c.fill(); c.fillStyle = '#ffd080'; c.beginPath(); c.arc(f.x, f.y, 6, 0, TAU); c.fill(); }
    else if (f.k === 'shard') { const l = Math.hypot(f.vx, f.vy); c.strokeStyle = '#d8f4ff'; c.lineWidth = 2.5; c.lineCap = 'round'; c.beginPath(); c.moveTo(f.x - f.vx / l * 10, f.y - f.vy / l * 10); c.lineTo(f.x, f.y); c.stroke(); }
  }
  if (S.beam && !S.beam.dead) {
    const b = S.beam; c.beginPath(); c.moveTo(p.x, p.y);
    for (let i = 1; i < 6; i++) { const k = i / 6; c.lineTo(p.x + (b.x - p.x) * k + rnd(-5, 5), p.y + (b.y - p.y) * k + rnd(-5, 5)); }
    c.lineTo(b.x, b.y);
    c.strokeStyle = 'rgba(190,120,255,.55)'; c.lineWidth = 6; c.stroke(); c.strokeStyle = 'rgba(255,240,255,.95)'; c.lineWidth = 1.8; c.stroke();
  }
  for (const o of S.orbs) { const a = Math.min(1, o.life); c.fillStyle = `rgba(255,220,90,${.16 * a})`; c.beginPath(); c.arc(o.x, o.y, 75, 0, TAU); c.fill(); c.fillStyle = `rgba(255,240,170,${a})`; c.beginPath(); c.arc(o.x, o.y, 7 + Math.sin(T * 30) * 1.5, 0, TAU); c.fill(); }
  for (const rg of S.rings) { const a = 1 - rg.r / rg.max; c.strokeStyle = `rgba(255,120,40,${a})`; c.lineWidth = 9; c.beginPath(); c.arc(rg.x, rg.y, rg.r, 0, TAU); c.stroke(); c.strokeStyle = `rgba(255,220,120,${a})`; c.lineWidth = 2; c.stroke(); }
  for (const f of S.fx) drawFx(c, f, fa);
  for (const q of S.pt) { const a = (1 - q.t / q.life) * fa; c.fillStyle = rgba(q.col, a); c.fillRect(q.x - q.sz / 2, q.y - q.sz / 2, q.sz, q.sz); }
  c.globalCompositeOperation = 'source-over';

  if (sv('storm')) {
    const sx = p.x + Math.cos(T) * 20, sy = p.y - 40;
    c.fillStyle = 'rgba(64,66,90,.9)'; for (const [ox, oy, r2] of [[-10, 0, 9], [0, -4, 11], [11, 0, 8]]) { c.beginPath(); c.arc(sx + ox, sy + oy, r2, 0, TAU); c.fill(); }
    if (Math.random() < .05) { c.fillStyle = 'rgba(255,230,120,.8)'; c.beginPath(); c.arc(sx, sy, 6, 0, TAU); c.fill(); }
  }
  drawPlayer(c, T);

  // ---- damage numbers
  c.textAlign = 'center'; c.textBaseline = 'middle';
  for (const t of S.texts) {
    const k = t.t / .8, a = k < .7 ? 1 : 1 - (k - .7) / .3, pop = t.t < .1 ? 1 + (1 - t.t / .1) * .5 : 1;
    c.font = `700 ${Math.round((t.crit ? 18 : t.big ? 15 : 12) * pop)}px "Chakra Petch", sans-serif`;
    c.fillStyle = `rgba(0,0,0,${a * .7})`; c.fillText(t.s, t.x + 1, t.y + 1.5);
    c.fillStyle = rgba(t.crit ? '#fff3b0' : t.col, a); c.fillText(t.s, t.x, t.y);
  }
  drawOverlay(c, T, endless, bossOn);
}

function drawOverlay(c, T, endless, bossOn) {
  const p = S.p;
  c.setTransform(DPR, 0, 0, DPR, 0, 0);
  // tension vignette: heartbeat past wave 20, slow pulse for bosses, red when hurt or low on HP
  const lowHp = S.phase === 'fight' && p.hp / tot.maxHp < .3;
  let a = 0;
  if (endless) { const bpm = Math.min(150, 98 + (S.wave - 21) * 4), ph = (T * bpm / 60) % 1; a = .22 + Math.max(0, 1 - ph * 5) * .25 + Math.max(0, 1 - Math.abs(ph - .15) * 6) * .15; }
  else if (bossOn) a = .18 + Math.sin(T * 4.7) * .06;
  if (lowHp) a = Math.max(a, .28 + Math.sin(T * 9) * .12);
  if (S.hurtFlash > 0) a = Math.max(a, S.hurtFlash * 2.2);
  if (a > 0) {
    const vg = c.createRadialGradient(VW / 2, VH / 2, Math.min(VW, VH) * .3, VW / 2, VH / 2, Math.max(VW, VH) * .7);
    vg.addColorStop(0, 'rgba(130,0,12,0)'); vg.addColorStop(1, `rgba(130,0,12,${clamp(a, 0, .7)})`);
    c.fillStyle = vg; c.fillRect(0, 0, VW, VH);
  }
  c.textAlign = 'center'; c.textBaseline = 'middle';
  const boss = S.enemies.find(e => e.boss);
  if (boss) {
    const w = Math.min(420, VW - 40), x = (VW - w) / 2, y = VH - 84;
    c.fillStyle = 'rgba(10,10,14,.8)'; c.fillRect(x - 2, y - 2, w + 4, 14);
    c.fillStyle = '#c8436a'; c.fillRect(x, y, w * Math.max(0, boss.hp / boss.maxHp), 10);
    c.font = '700 12px "Chakra Petch"'; c.fillStyle = '#e6e3da'; c.fillText('THE HOLLOW KING', VW / 2, y - 11);
  }
  if (S.buff && S.phase === 'fight') { c.font = '700 12px "Chakra Petch"'; c.fillStyle = S.buff.col; c.fillText(`${S.buff.name.toUpperCase()} · ${S.buff.desc}`, VW / 2, 70); }
  if (S.collectT !== null && S.collectT > 0 && S.phase === 'fight') { c.font = `700 ${Math.min(28, VW / 16)}px "Chakra Petch"`; c.fillStyle = '#f2c14e'; c.fillText(`COLLECT · ${S.collectT.toFixed(1)}s`, VW / 2, VH * .2); }
  if (S.banner) {
    const b = S.banner, al = b.t < .3 ? b.t / .3 : b.t > 1.9 ? (2.4 - b.t) / .5 : 1;
    c.font = `700 ${b.small ? Math.min(22, VW / 20) : Math.min(44, VW / 11)}px "Chakra Petch"`;
    const y = VH * (b.small ? .27 : .31);
    c.fillStyle = `rgba(0,0,0,${al * .6})`; c.fillText(b.text.toUpperCase(), VW / 2 + 2, y + 2, VW - 20);
    c.fillStyle = S.wave > 20 && !b.small ? `rgba(255,110,90,${al})` : `rgba(244,241,234,${al})`; c.fillText(b.text.toUpperCase(), VW / 2, y, VW - 20);
  }
  if (joy.on && S.phase === 'fight') {
    c.strokeStyle = 'rgba(255,255,255,.22)'; c.lineWidth = 2; c.beginPath(); c.arc(joy.ox, joy.oy, 50, 0, TAU); c.stroke();
    const jx = joy.x - joy.ox, jy = joy.y - joy.oy, jl = Math.hypot(jx, jy), m = Math.min(1, 50 / (jl || 1));
    c.fillStyle = 'rgba(255,255,255,.28)'; c.beginPath(); c.arc(joy.ox + jx * m, joy.oy + jy * m, 20, 0, TAU); c.fill();
  }
}

// ---------------------------------------------------------------- pieces
function rockPath(c, r, n, seed) { c.beginPath(); for (let i = 0; i < n; i++) { const a = i / n * TAU + seed, r2 = r * (.82 + .18 * Math.sin(i * 2.7 + seed * 5)); c.lineTo(Math.cos(a) * r2, Math.sin(a) * r2); } c.closePath(); }
function hpArc(c, g, r, col) { c.strokeStyle = col; c.lineWidth = 1.8; c.beginPath(); c.arc(g.x, g.y, r, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(g.hp / g.maxHp, 0, 1)); c.stroke(); }
function drawCrystal(c, x, y, h, w) {
  c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(x, y + w * .8, w * 1.1, w * .4, 0, 0, TAU); c.fill();
  c.fillStyle = '#bfe6fb'; c.strokeStyle = '#ffffff'; c.lineWidth = 1.2;
  c.beginPath(); c.moveTo(x, y - h); c.lineTo(x + w, y - h * .3); c.lineTo(x + w * .75, y + w * .7); c.lineTo(x - w * .75, y + w * .7); c.lineTo(x - w, y - h * .3); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.moveTo(x, y - h); c.lineTo(x - w, y - h * .3); c.lineTo(x - w * .2, y - h * .2); c.closePath(); c.fill();
}
function eyes(c, r, ang, n, col) {
  const cx0 = Math.cos(ang) * r * .38, cy0 = Math.sin(ang) * r * .38, px = -Math.sin(ang), py = Math.cos(ang), s = Math.max(1.6, r * .15);
  c.fillStyle = col;
  if (n === 1) { c.beginPath(); c.arc(cx0, cy0, s * 1.2, 0, TAU); c.fill(); return; }
  c.beginPath(); c.arc(cx0 + px * r * .3, cy0 + py * r * .3, s, 0, TAU); c.arc(cx0 - px * r * .3, cy0 - py * r * .3, s, 0, TAU); c.fill();
}
function drawEnemy(c, e, T) {
  const r = e.r, hit = e.hitT > 0, fr = e.frozen > 0 || e.thr;
  const base = hit ? '#ffffff' : fr ? '#a9dcf5' : e.col, dark = hit ? '#e8e8e8' : fr ? '#5a9cc0' : shade(e.col, .5), lite = fr ? '#e2f6ff' : shade(e.col, 1.4);
  const eye = hit ? '#ffffff' : fr ? '#1a3a4a' : e.mode === 'wind' ? '#ff4d4d' : '#ffe6f2';
  const ang = Math.atan2(S.p.y - e.y, S.p.x - e.x);
  c.save(); c.translate(e.x, e.y);
  c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(0, r * .78, r * .95, r * .36, 0, 0, TAU); c.fill();
  if (e.mode === 'wind') c.translate(rnd(-1.5, 1.5), rnd(-1.5, 1.5));
  const sq = hit ? 1.14 : 1 + Math.sin(e.wob) * .035;
  c.scale(sq, 2 - sq);                       // squash and stretch
  c.lineWidth = 2; c.lineJoin = 'round'; c.strokeStyle = dark; c.fillStyle = base;
  switch (e.shape) {
    case 'grunt':
      c.fillStyle = dark; for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx * r * .4, -r * .7); c.lineTo(sx * r * 1.0, -r * 1.35); c.lineTo(sx * r * .85, -r * .4); c.closePath(); c.fill(); }
      c.fillStyle = base; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = lite; c.globalAlpha *= .3; c.beginPath(); c.arc(-r * .32, -r * .36, r * .32, 0, TAU); c.fill(); c.globalAlpha /= .3;
      eyes(c, r, ang, 2, eye); break;
    case 'runner':
      c.rotate(ang);
      c.strokeStyle = rgba(e.col, .35); c.lineWidth = 1.5; c.beginPath(); c.moveTo(-r * 1.2, r * .5); c.lineTo(-r * 2.4, r * .5); c.moveTo(-r * 1.2, -r * .5); c.lineTo(-r * 2.1, -r * .5); c.stroke();
      c.strokeStyle = dark; c.lineWidth = 2;
      c.beginPath(); c.moveTo(r * 1.55, 0); c.lineTo(-r, r * .95); c.lineTo(-r * .45, 0); c.lineTo(-r, -r * .95); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = eye; c.beginPath(); c.arc(r * .45, 0, Math.max(1.6, r * .2), 0, TAU); c.fill(); break;
    case 'swarm': {
      const fl = Math.abs(Math.sin(e.wob * 2.5));
      c.fillStyle = 'rgba(230,220,255,.35)'; for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(sx * r * .9, -r * .5, r * .9, r * (.2 + fl * .4), sx * .5, 0, TAU); c.fill(); }
      c.fillStyle = base; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill(); c.stroke();
      eyes(c, r, ang, 1, eye); break; }
    case 'brute':
      c.lineWidth = 3;
      c.beginPath(); c.moveTo(-r * .8, -r); c.lineTo(r * .8, -r); c.lineTo(r, -r * .7); c.lineTo(r, r * .8); c.lineTo(r * .7, r); c.lineTo(-r * .7, r); c.lineTo(-r, r * .8); c.lineTo(-r, -r * .7); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = dark; c.fillRect(-r * 1.12, -r * 1.05, r * .62, r * .5); c.fillRect(r * .5, -r * 1.05, r * .62, r * .5);
      c.fillStyle = lite; c.globalAlpha *= .22; c.fillRect(-r * .7, -r * .8, r * 1.4, r * .35); c.globalAlpha /= .22;
      eyes(c, r, ang, 2, eye);
      c.strokeStyle = dark; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-r * .55, -r * .28 + Math.sin(ang) * r * .38); c.lineTo(r * .55, -r * .28 + Math.sin(ang) * r * .38); c.stroke(); break;
    case 'charger': {
      const a2 = e.mode === 'dash' || e.mode === 'wind' ? Math.atan2(e.dy, e.dx) : ang;
      c.rotate(a2);
      c.beginPath(); c.moveTo(r * 1.5, 0); c.lineTo(0, r * .9); c.lineTo(-r * 1.05, 0); c.lineTo(0, -r * .9); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = lite; c.beginPath(); c.moveTo(r * 1.9, 0); c.lineTo(r * .9, r * .3); c.lineTo(r * .9, -r * .3); c.closePath(); c.fill();
      c.fillStyle = eye; c.beginPath(); c.arc(r * .25, 0, r * .2, 0, TAU); c.fill(); break; }
    case 'boss': {
      if (e.enraged) { c.fillStyle = `rgba(255,40,60,${.18 + Math.sin(T * 9) * .08})`; c.beginPath(); c.arc(0, 0, r * 1.45, 0, TAU); c.fill(); }
      c.fillStyle = '#f2c14e'; for (const sx of [-1, 0, 1]) { c.beginPath(); c.moveTo(sx * r * .45 - r * .2, -r * .8); c.lineTo(sx * r * .45, -r * (sx ? 1.3 : 1.5)); c.lineTo(sx * r * .45 + r * .2, -r * .8); c.closePath(); c.fill(); }
      c.fillStyle = base; c.lineWidth = 3;
      c.beginPath(); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + T * .4, rr = i % 2 ? r * .8 : r * 1.06; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); c.fill(); c.stroke();
      c.fillStyle = hit ? '#ffffff' : '#2a0c18'; c.beginPath(); c.arc(0, 0, r * .55, 0, TAU); c.fill();
      c.fillStyle = hit ? '#ffffff' : `rgba(255,90,120,${.7 + Math.sin(T * 5) * .3})`; c.beginPath(); c.arc(0, 0, r * (.2 + Math.sin(T * 5) * .03), 0, TAU); c.fill();
      eyes(c, r * 1.1, ang, 2, '#ffd0dc'); break; }
    case 'goblin':
      c.fillStyle = '#7a5520'; c.beginPath(); c.arc(-Math.cos(ang) * -r * .9, -Math.sin(ang) * -r * .9 + r * .2, r * .75, 0, TAU); c.fill();
      c.fillStyle = base; for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx * r * .7, -r * .3); c.lineTo(sx * r * 1.6, -r * .8); c.lineTo(sx * r * .85, r * .2); c.closePath(); c.fill(); c.stroke(); }
      c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill(); c.stroke();
      eyes(c, r, ang + Math.PI, 2, '#3a2a08'); break;
    case 'altar':
      c.beginPath(); c.moveTo(-r * .6, r); c.lineTo(-r * .38, -r * 1.1); c.lineTo(0, -r * 1.5); c.lineTo(r * .38, -r * 1.1); c.lineTo(r * .6, r); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = `rgba(230,130,255,${.65 + Math.sin(T * 5) * .3})`; c.beginPath(); c.arc(0, -r * .35, 4, 0, TAU); c.fill(); break;
  }
  c.restore();
  if (e.thr) return;
  // status marks
  c.save(); c.translate(e.x, e.y);
  if (e.type === 'altar') { c.strokeStyle = 'rgba(200,100,255,.3)'; c.lineWidth = 1.5; c.beginPath(); c.arc(0, 0, r + 14 + Math.sin(T * 3) * 4, 0, TAU); c.stroke(); }
  if (e.type === 'goblin') { c.fillStyle = '#ffe9a8'; c.font = '700 11px "Chakra Petch"'; c.textAlign = 'center'; c.fillText(Math.max(0, e.escT).toFixed(0), 0, -r - 10); }
  if (e.elite) { c.strokeStyle = `rgba(242,193,78,${.65 + Math.sin(T * 6) * .3})`; c.lineWidth = 2.5; c.beginPath(); c.arc(0, 0, r + 5, 0, TAU); c.stroke(); c.fillStyle = '#f2c14e'; c.beginPath(); c.moveTo(-6, -r - 7); c.lineTo(-6, -r - 14); c.lineTo(-3, -r - 10); c.lineTo(0, -r - 15); c.lineTo(3, -r - 10); c.lineTo(6, -r - 14); c.lineTo(6, -r - 7); c.closePath(); c.fill(); }
  if (e.burnT > 0) { c.strokeStyle = 'rgba(255,130,40,.9)'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, r + 3, 0, TAU); c.stroke(); }
  if (e.chill > 0 && e.frozen <= 0) { c.strokeStyle = 'rgba(120,210,255,.95)'; c.lineWidth = 2; c.setLineDash([3, 3]); c.beginPath(); c.arc(0, 0, r + 6, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, e.chill / 4)); c.stroke(); c.setLineDash([]); }
  if (e.frozen > 0) { c.fillStyle = 'rgba(200,238,255,.3)'; c.strokeStyle = '#eefaff'; c.lineWidth = 1.5; c.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + .5; c.lineTo(Math.cos(a) * (r + 6), Math.sin(a) * (r + 6)); } c.closePath(); c.fill(); c.stroke(); }
  if (e.stun > 0) { c.fillStyle = '#ffd23f'; for (let i = 0; i < 3; i++) { const a = T * 6 + i * TAU / 3; c.fillRect(Math.cos(a) * r * .9 - 1.5, -r - 7 + Math.sin(a) * 3, 3, 3); } }
  if (e.hp < e.maxHp && !e.boss) { c.fillStyle = 'rgba(0,0,0,.65)'; c.fillRect(-r - 1, r + 5, r * 2 + 2, 4); c.fillStyle = e.elite ? '#f2c14e' : '#e5484d'; c.fillRect(-r, r + 6, r * 2 * Math.max(0, e.hp / e.maxHp), 2); }
  c.restore();
}
function drawGolem(c, g, k, T) {
  const bob = Math.sin(T * 8 + g.seed * 3) * 1.2 * k;
  c.save(); c.translate(g.x, g.y);
  c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(0, 6 * k, 7 * k, 2.6 * k, 0, 0, TAU); c.fill();
  c.translate(0, bob);
  if (k > 1.5) { c.fillStyle = '#6f7a62'; for (const sx of [-1, 1]) { c.beginPath(); c.arc(sx * 8 * k, 1 * k, 3.6 * k, 0, TAU); c.fill(); } }   // big ones get fists
  rockPath(c, 7 * k, 7, g.seed); c.fillStyle = k > 2.2 ? '#7d8a6c' : '#98a487'; c.fill(); c.strokeStyle = '#4c5642'; c.lineWidth = 1.6; c.stroke();
  c.fillStyle = '#5fc46a'; c.beginPath(); c.arc(-2 * k, -5 * k, 2.6 * k, Math.PI, 0); c.fill();                                                     // moss
  c.fillStyle = '#c8ffd0'; c.fillRect(-3.4 * k, -1.6 * k, 2 * k, 1.8 * k); c.fillRect(1.4 * k, -1.6 * k, 2 * k, 1.8 * k);                          // eyes
  c.restore();
  hpArc(c, g, 9.5 * k, COL.green);
}
function drawSprite(c, sp, T) {
  const fl = 1 + Math.sin(T * 20 + sp.a * 9) * .15, hop = sp.state === 'walk' ? Math.abs(Math.sin(T * 9 + sp.a)) * 3 : 0, y = sp.y - hop;
  c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(sp.x, sp.y + 7, 6, 2.2, 0, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,120,40,.3)'; c.beginPath(); c.arc(sp.x, y, 11 * fl, 0, TAU); c.fill();
  c.fillStyle = '#ff8a3c'; c.beginPath(); c.moveTo(sp.x, y - 12 * fl); c.quadraticCurveTo(sp.x + 8, y - 1, sp.x, y + 6); c.quadraticCurveTo(sp.x - 8, y - 1, sp.x, y - 12 * fl); c.fill();
  c.fillStyle = '#ffd98a'; c.beginPath(); c.moveTo(sp.x, y - 6 * fl); c.quadraticCurveTo(sp.x + 4, y, sp.x, y + 4); c.quadraticCurveTo(sp.x - 4, y, sp.x, y - 6 * fl); c.fill();
  c.fillStyle = '#3a1406'; c.fillRect(sp.x - 3, y - 2, 2, 2.4); c.fillRect(sp.x + 1, y - 2, 2, 2.4);
}
function drawSpirit(c, sp, T) {
  const a = sp.state === 'cast' ? Math.min(1, sp.life * 3) : 1, y = sp.y + Math.sin(T * 5) * 2;
  c.fillStyle = `rgba(255,230,120,${.22 * a})`; c.beginPath(); c.arc(sp.x, y, 15, 0, TAU); c.fill();
  c.strokeStyle = `rgba(255,220,90,${a})`; c.lineWidth = 1.5; for (let i = 0; i < 3; i++) { const an = T * 7 + i * 2.1; c.beginPath(); c.moveTo(sp.x + Math.cos(an) * 7, y + Math.sin(an) * 7); c.lineTo(sp.x + Math.cos(an) * 14, y + Math.sin(an) * 14); c.stroke(); }
  c.fillStyle = `rgba(255,248,205,${a})`; c.beginPath(); c.arc(sp.x, y, 6.5 + Math.sin(T * 25) * 1.2, 0, TAU); c.fill();
  c.fillStyle = `rgba(90,70,10,${a})`; c.fillRect(sp.x - 3, y - 1.5, 1.8, 2.2); c.fillRect(sp.x + 1.2, y - 1.5, 1.8, 2.2);
}
function drawWizard(c, w, T) {
  c.globalAlpha = Math.min(1, w.life);
  c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(w.x, w.y + 9, 7, 2.5, 0, 0, TAU); c.fill();
  c.fillStyle = '#3f7fb8'; c.beginPath(); c.moveTo(w.x - 7, w.y + 9); c.lineTo(w.x - 4, w.y - 2); c.lineTo(w.x + 4, w.y - 2); c.lineTo(w.x + 7, w.y + 9); c.closePath(); c.fill();   // robe
  c.fillStyle = '#e6f6ff'; c.beginPath(); c.arc(w.x, w.y - 5, 4.6, 0, TAU); c.fill();                                                                                   // face
  c.fillStyle = '#2f6aa0'; c.beginPath(); c.moveTo(w.x - 8, w.y - 7); c.lineTo(w.x + 8, w.y - 7); c.lineTo(w.x + 1.5, w.y - 21); c.closePath(); c.fill();              // hat
  c.strokeStyle = '#bfeaff'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(w.x + 9, w.y + 8); c.lineTo(w.x + 9, w.y - 12); c.stroke();
  c.fillStyle = '#ffffff'; c.beginPath(); c.arc(w.x + 9, w.y - 14, 2.4 + Math.sin(T * 6) * .5, 0, TAU); c.fill();
  c.globalAlpha = 1;
}
function drawEvent(c, ev, T) {
  c.globalAlpha = Math.min(1, ev.life);
  if (ev.k === 'shrine') {
    const col = ev.buff.col;
    c.fillStyle = rgba(col, .12 + Math.sin(T * 4) * .04); c.beginPath(); c.arc(ev.x, ev.y, 34, 0, TAU); c.fill();
    c.strokeStyle = rgba(col, .75); c.lineWidth = 2; c.setLineDash([5, 5]); c.lineDashOffset = -T * 20; c.stroke(); c.setLineDash([]);
    if (ev.prog > 0) { c.strokeStyle = col; c.lineWidth = 5; c.beginPath(); c.arc(ev.x, ev.y, 40, -Math.PI / 2, -Math.PI / 2 + TAU * ev.prog / 2.5); c.stroke(); }
    c.fillStyle = '#3a3646'; c.fillRect(ev.x - 9, ev.y + 4, 18, 5);
    c.fillStyle = col; c.beginPath(); c.moveTo(ev.x, ev.y - 15 + Math.sin(T * 3) * 2); c.lineTo(ev.x + 7, ev.y - 4); c.lineTo(ev.x, ev.y + 3); c.lineTo(ev.x - 7, ev.y - 4); c.closePath(); c.fill();
  } else if (ev.k === 'spring') {
    c.fillStyle = 'rgba(90,220,200,.15)'; c.beginPath(); c.arc(ev.x, ev.y, ev.r, 0, TAU); c.fill();
    for (let i = 0; i < 3; i++) { const k = (T * .6 + i / 3) % 1; c.strokeStyle = `rgba(120,240,220,${.55 * (1 - k)})`; c.lineWidth = 1.5; c.beginPath(); c.arc(ev.x, ev.y, ev.r * k, 0, TAU); c.stroke(); }
    c.fillStyle = '#9ff5e2'; c.fillRect(ev.x - 1.5, ev.y - 7, 3, 14); c.fillRect(ev.x - 7, ev.y - 1.5, 14, 3);
  } else {
    c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(ev.x, ev.y + 10, 14, 4, 0, 0, TAU); c.fill();
    c.fillStyle = '#8a5a2a'; c.fillRect(ev.x - 12, ev.y - 8, 24, 17); c.fillStyle = '#6b431c'; c.fillRect(ev.x - 12, ev.y - 8, 24, 5);
    c.fillStyle = '#f2c14e'; c.fillRect(ev.x - 12, ev.y - 3, 24, 2.5); c.fillRect(ev.x - 2.5, ev.y - 5, 5, 6);
    c.strokeStyle = `rgba(242,193,78,${.4 + Math.sin(T * 6) * .3})`; c.lineWidth = 2; c.beginPath(); c.arc(ev.x, ev.y, 22, 0, TAU); c.stroke();
  }
  c.globalAlpha = 1;
}
function drawWeapon(c, type, col, s, evo) {
  c.strokeStyle = col; c.fillStyle = col; c.lineCap = 'round'; c.lineWidth = 2.4;
  c.shadowColor = col; c.shadowBlur = evo ? 14 : 6;
  c.beginPath();
  if (type === 'dagger') { c.moveTo(-3, 0); c.lineTo(9 * s, 0); c.moveTo(0, -3.5); c.lineTo(0, 3.5); }
  else if (type === 'sword') { c.moveTo(-4, 0); c.lineTo(15 * s, 0); c.moveTo(1, -4.5); c.lineTo(1, 4.5); }
  else if (type === 'axe') { c.moveTo(-5, 0); c.lineTo(12 * s, 0); c.stroke(); c.beginPath(); c.moveTo(8 * s, 0); c.arc(9 * s, 0, 6 * s, -Math.PI * .9, -Math.PI * .1); c.closePath(); c.fill(); }
  else if (type === 'spear') { c.moveTo(-6, 0); c.lineTo(20 * s, 0); c.stroke(); c.beginPath(); c.moveTo(25 * s, 0); c.lineTo(19 * s, -3.5); c.lineTo(19 * s, 3.5); c.closePath(); c.fill(); }
  else { c.arc(-2, 0, 8 * s, -1.1, 1.1); c.lineWidth = 3.8; }
  c.stroke();
  c.shadowBlur = 0;
  if (type !== 'shield') { c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 1; c.beginPath(); c.moveTo(1, 0); c.lineTo((type === 'spear' ? 18 : type === 'sword' ? 13 : type === 'axe' ? 8 : 7) * s, 0); c.stroke(); }
}
function drawPlayer(c, T) {
  const p = S.p, n = S.weapons.length;
  let dom = 'red', dn = 0; for (const el of ORDER) if ((S.counts[el] || 0) > dn) { dn = S.counts[el]; dom = el; }
  c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(p.x, p.y + PR * .8, PR, PR * .4, 0, 0, TAU); c.fill();
  S.weapons.forEach((w, i) => {
    const a = w.anim > 0 ? w.dir : T * .9 + i * TAU / n, reach = 20 + w.anim * 15;
    c.save(); c.translate(p.x + Math.cos(a) * reach, p.y + Math.sin(a) * reach); c.rotate(a);
    drawWeapon(c, w.type, COL[w.el], 1 + w.tier * .12 + (w.evo ? .2 : 0), w.evo);
    c.restore();
  });
  if (p.shield > 0) { c.strokeStyle = `rgba(255,220,90,${.55 + Math.sin(T * 20) * .3})`; c.lineWidth = 2.5; c.beginPath(); c.arc(p.x, p.y, PR + 9, 0, TAU); c.stroke(); }
  if (S.surge.n > 0) { c.strokeStyle = `rgba(255,220,90,${.15 + S.surge.n * .04})`; c.lineWidth = 1.5; c.beginPath(); c.arc(p.x, p.y, PR + 4 + Math.sin(T * 25) * 2, 0, TAU); c.stroke(); }
  if (tot.thornFlat > 0) { c.fillStyle = '#a8946a'; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + T * .5; c.beginPath(); c.moveTo(p.x + Math.cos(a - .14) * PR, p.y + Math.sin(a - .14) * PR); c.lineTo(p.x + Math.cos(a) * (PR + 5), p.y + Math.sin(a) * (PR + 5)); c.lineTo(p.x + Math.cos(a + .14) * PR, p.y + Math.sin(a + .14) * PR); c.closePath(); c.fill(); } }
  const flash = p.inv > 0 && p.shield <= 0 && S.phase === 'fight' && Math.floor(p.inv * 20) % 2 === 0;
  c.fillStyle = S.phase === 'dead' ? '#e5484d' : flash ? '#ff9a9a' : '#ece8de';
  c.strokeStyle = COL[dom]; c.lineWidth = 2.2;
  c.beginPath(); c.arc(p.x, p.y, PR, 0, TAU); c.fill(); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.arc(p.x - PR * .3, p.y - PR * .35, PR * .3, 0, TAU); c.fill();
  c.strokeStyle = '#14151c'; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.arc(p.x, p.y, PR * .5, p.face - .85, p.face + .85); c.stroke();      // visor
  c.strokeStyle = COL[dom]; c.lineWidth = 1.6; c.beginPath(); c.arc(p.x, p.y, PR * .5, p.face - .5, p.face + .5); c.stroke();
}
function drawFx(c, f, fa) {
  const k = f.t / f.life, a = (1 - k) * fa;
  switch (f.k) {
    case 'bolt':
      c.strokeStyle = `rgba(255,220,90,${a})`; c.lineWidth = 4; c.lineJoin = 'round';
      c.beginPath(); f.pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke();
      c.strokeStyle = `rgba(255,255,235,${a})`; c.lineWidth = 1.4; c.stroke(); break;
    case 'swing': {
      const a0 = f.dir - f.arc / 2, sweep = clamp(k * 1.5, 0, 1), a1 = a0 + f.arc * sweep;
      c.fillStyle = rgba(f.col, .2 * a); c.beginPath(); c.arc(f.x, f.y, f.r, a0, a1); c.arc(f.x, f.y, f.r * .45, a1, a0, true); c.closePath(); c.fill();
      c.strokeStyle = rgba(f.col, a); c.lineWidth = f.evo ? 6 : 4; c.lineCap = 'round'; c.beginPath(); c.arc(f.x, f.y, f.r - 2, Math.max(a0, a1 - .9), a1); c.stroke();
      c.strokeStyle = `rgba(255,255,255,${a})`; c.lineWidth = 1.4; c.beginPath(); c.arc(f.x, f.y, f.r - 2, Math.max(a0, a1 - .5), a1); c.stroke(); break; }
    case 'thrust': {
      const len = f.r * (.4 + .6 * Math.min(1, k * 2.5)), x1 = f.x + Math.cos(f.dir) * 14, y1 = f.y + Math.sin(f.dir) * 14, x2 = f.x + Math.cos(f.dir) * len, y2 = f.y + Math.sin(f.dir) * len;
      c.strokeStyle = rgba(f.col, a); c.lineWidth = f.evo ? 7 : 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
      c.strokeStyle = `rgba(255,255,255,${a})`; c.lineWidth = 1.5; c.stroke(); break; }
    case 'boom':
      c.fillStyle = rgba(f.col, .26 * a); c.beginPath(); c.arc(f.x, f.y, f.r * (.4 + k * .6), 0, TAU); c.fill();
      c.strokeStyle = rgba(f.col, a); c.lineWidth = 3; c.beginPath(); c.arc(f.x, f.y, f.r * (.5 + k * .5), 0, TAU); c.stroke();
      if (k < .25) { c.fillStyle = `rgba(255,255,255,${(.25 - k) * 2.4 * fa})`; c.beginPath(); c.arc(f.x, f.y, f.r * .45, 0, TAU); c.fill(); } break;
    case 'ring': case 'pop':
      c.strokeStyle = rgba(f.col, a * .9); c.lineWidth = 2; c.beginPath(); c.arc(f.x, f.y, f.r * (f.k === 'pop' ? 1 + k : .6 + k * .5), 0, TAU); c.stroke(); break;
    case 'gust': {
      const rr = f.r * (.3 + .7 * k);
      c.fillStyle = rgba(ICE, .18 * a); c.beginPath(); c.moveTo(f.x, f.y); c.arc(f.x, f.y, rr, f.dir - f.arc / 2, f.dir + f.arc / 2); c.closePath(); c.fill();
      c.strokeStyle = rgba(ICE, .8 * a); c.lineWidth = 2; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(f.x, f.y, rr * (.6 + i * .2), f.dir - f.arc / 2 + .1, f.dir + f.arc / 2 - .1); c.stroke(); } break; }
    case 'warn':
      c.strokeStyle = rgba(f.col, .4 + .5 * k); c.lineWidth = 2; c.beginPath(); c.arc(f.x, f.y, f.r, 0, TAU); c.stroke();
      c.fillStyle = rgba(f.col, .15 * k); c.beginPath(); c.arc(f.x, f.y, f.r * k, 0, TAU); c.fill(); break;
    case 'meteor': {
      c.strokeStyle = rgba(FIRE, .4 + .5 * k); c.lineWidth = 2; c.beginPath(); c.arc(f.x, f.y, f.r, 0, TAU); c.stroke();
      const mx = f.x + (1 - k) * 90, my = f.y - (1 - k) * 260;
      c.strokeStyle = 'rgba(255,150,60,.7)'; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(mx + 14, my - 40); c.lineTo(mx, my); c.stroke();
      c.fillStyle = '#ffd98a'; c.beginPath(); c.arc(mx, my, 7, 0, TAU); c.fill(); break; }
    case 'spike': {
      const h = 24 * Math.min(1, k * 4) * (1 - k);
      c.fillStyle = `rgba(210,240,255,${a})`; c.beginPath(); c.moveTo(f.x - 6, f.y + 4); c.lineTo(f.x, f.y - h); c.lineTo(f.x + 6, f.y + 4); c.closePath(); c.fill(); break; }
    case 'crack':
      c.strokeStyle = `rgba(201,162,90,${a * .85})`; c.lineWidth = 2.5; c.lineCap = 'round';
      c.beginPath(); c.moveTo(f.x1, f.y1); c.lineTo((f.x1 + f.x2) / 2 + 3, (f.y1 + f.y2) / 2 - 3); c.lineTo(f.x2, f.y2); c.stroke(); break;
    case 'spikes':
      c.fillStyle = `rgba(230,200,130,${a})`;
      for (let i = -2; i <= 2; i++) { const an = f.dir + i * .35, r1 = PR + 2, r2 = PR + 11 + 6 * (1 - Math.abs(i) / 3); c.beginPath(); c.moveTo(f.x + Math.cos(an - .12) * r1, f.y + Math.sin(an - .12) * r1); c.lineTo(f.x + Math.cos(an) * r2, f.y + Math.sin(an) * r2); c.lineTo(f.x + Math.cos(an + .12) * r1, f.y + Math.sin(an + .12) * r1); c.closePath(); c.fill(); } break;
    case 'icebeam':
      c.strokeStyle = `rgba(190,234,255,${a})`; c.lineWidth = 2.5; c.beginPath(); c.moveTo(f.x1, f.y1); c.lineTo(f.x2, f.y2); c.stroke(); break;
  }
}
