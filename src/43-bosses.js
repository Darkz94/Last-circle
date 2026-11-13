// ===== bosses. Five, shuffled into a new order each run (wave 10, 20, 30...).
// Every boss: phase 2 at half health. Endless bosses (wave 30+) also fake their death and rise for a secret phase 3.
// Big attacks are always telegraphed in red first. Each boss favours some relics in the reward choice.
//   ai(e, dt, p)  runs every step while the boss isn't frozen/stunned (return a {vx, vy, sp} move, or null to stand)
//   p2(e) / p3(e) run once when that phase starts. draw(c, e, T, ang, base, dark, lite, hit) draws the body.
const BOSSES = {
  king: {
    name: 'The Hollow King', col: '#c8436a', hpM: 1, r: 44, spd: 1, relics: ['slayer', 'hide', 'tenth'],
    p2msg: 'is enraged!', p3msg: 'splits apart!',
    p2(e) { e.spd *= 1.3; e.dmg *= 1.2; },
    p3(e) {
      // splits into three smaller kings that all slam
      const part = e.maxHp * .4;
      e.r = 32; e.hp = e.maxHp = part; e.spd *= 1.15;
      for (let i = 0; i < 2; i++) {
        const a = i * Math.PI + rnd(0, 1), m = spawnBoss('king', e.x + Math.cos(a) * 50, e.y + Math.sin(a) * 50);
        m.mini = true; m.risen = true; m.phase = 3; m.r = 32; m.hp = m.maxHp = part; m.spd = e.spd; m.dmg = e.dmg; m.slamT = 1 + i;
      }
    },
    ai(e, dt, p) {
      e.summonT -= dt;
      if (e.summonT <= 0 && !e.mini) { e.summonT = e.phase > 1 ? 4 : 5; for (let i = 0; i < 3; i++) spawnEnemy(e.phase > 1 && i === 0 ? 'brute' : 'grunt', e.x + rnd(-30, 30), e.y + rnd(-30, 30)); }
      e.slamT -= dt;
      if (e.slamT <= 0 && Math.hypot(e.x, e.y) < R) {
        e.slamT = e.phase === 3 ? 4 : e.phase === 2 ? 3.5 : 5.5;
        teleCircle(e.x, e.y, e.mini ? 95 : 125, 1, e.dmg * .8);
        if (e.phase > 1) teleCircle(p.x, p.y, 65, 1.2, e.dmg * .6);
      }
      return chase(e, p);
    },
  },

  brood: {
    name: 'The Broodmother', col: '#7a3f9a', hpM: 1.2, r: 48, spd: .6, relics: ['blood', 'echo', 'rush'],
    p2msg: 'begins laying eggs!', p3msg: 'bursts open!',
    p2(e) { e.eggT = 1; },
    p3(e) {
      // the circle floods with tiny spiders
      for (let i = 0; i < 45; i++) { const a = Math.random() * TAU, r = rnd(20, 120); const s = spawnEnemy('swarm', e.x + Math.cos(a) * r, e.y + Math.sin(a) * r); s.hp = s.maxHp = s.hp * .6; s.r = 6; }
      e.spd *= 1.6; e.birthT = 1;
    },
    ai(e, dt, p) {
      e.birthT = (e.birthT || 2) - dt;
      if (e.birthT <= 0 && S.enemies.length < 170) {
        e.birthT = e.phase === 3 ? 2 : 3;
        for (let i = 0; i < (e.phase === 3 ? 7 : 5); i++) spawnEnemy('swarm', e.x + rnd(-30, 30), e.y + rnd(-30, 30));
        puff(e.x, e.y, '#c9a3e6', 8, 90, .4);
      }
      if (e.phase >= 2) {
        e.eggT -= dt;
        if (e.eggT <= 0) {
          e.eggT = e.phase === 3 ? 4 : 5;
          for (let i = 0; i < 2; i++) { const s = arenaSpot(70); const g = spawnEnemy('egg', s.x * .8 + e.x * .2, s.y * .8 + e.y * .2); g.hatchT = 4.5; }
          sfx('summon');
        }
      }
      return chase(e, p);
    },
  },

  blade: {
    name: 'The Bladedancer', col: '#43c7b8', hpM: .8, r: 28, spd: 1.8, relics: ['combust', 'wind', 'vamp'],
    p2msg: 'moves faster than the eye!', p3msg: 'becomes a blur!',
    p2(e) { e.spd *= 1.15; },
    p3(e) { e.blinkT = 1.2; e.spd *= 1.1; },
    ai(e, dt, p) {
      // dash: a red line warns where it will go, then it tears across leaving a burning trail
      if (e.mode === 'dash') {
        e.modeT -= dt;
        e.trailT = (e.trailT || 0) - dt;
        if (e.trailT <= 0) { e.trailT = .03; if (S.haz.length < 120) S.haz.push({ x: e.x, y: e.y, r: 14, life: 1.8, max: 1.8, dmg: e.dmg * .3 }); }
        if (e.modeT <= 0) {
          e.mode = 'walk';
          if (e.chain > 0) { e.chain--; aimDash(e, p, .42); }     // phase 2+: three dashes in a row
          else e.dashCd = e.phase === 1 ? 3.5 : 3;
        }
        return { vx: e.dx, vy: e.dy, sp: 900 };
      }
      if (e.mode === 'aim') return null;
      e.dashCd = (e.dashCd === undefined ? 2 : e.dashCd) - dt;
      if (e.dashCd <= 0) { e.chain = e.phase > 1 ? 2 : 0; aimDash(e, p, .7); return null; }
      if (e.phase === 3) {
        e.blinkT -= dt;
        if (e.blinkT <= 0) {
          // appears right next to you and strikes
          e.blinkT = 1.6;
          const tx = p.x, ty = p.y;
          e.mode = 'aim';
          teleCircle(tx, ty, 58, .65, e.dmg * .9, () => { if (e.dead) return; puff(e.x, e.y, e.col, 10, 120, .4); e.x = tx; e.y = ty; e.mode = 'walk'; puff(tx, ty, e.col, 12, 160, .4); sfx('whoosh'); });
          return null;
        }
      }
      return chase(e, p);
    },
  },

  warden: {
    name: 'The Warden', col: '#9aa3b8', hpM: .95, r: 46, spd: .65, relics: ['bulwark', 'glass', 'slayer'],
    p2msg: 'spins faster!', p3msg: 'closes the circle!',
    p2(e) { e.arms = 3; e.armSpd = .95; e.turn = 1.4; },
    p3(e) { S.shrink = true; e.armSpd = 1.15; },
    init(e) { e.face = Math.atan2(-e.y, -e.x); e.arms = 2; e.armSpd = .7; e.armA = 0; e.armIn = 0; e.turn = 1; },
    ai(e, dt, p) {
      // a shield on its front blocks most damage: get round the side. It turns slowly to face you.
      const want = Math.atan2(p.y - e.y, p.x - e.x);
      e.face += clamp(angDiff(want, e.face), -e.turn * dt, e.turn * dt);
      e.armIn = Math.min(1, e.armIn + dt / 1.2);
      e.armA += e.armSpd * dt;
      if (e.armIn >= 1) for (let i = 0; i < e.arms; i++) {
        const a = e.armA + i / e.arms * TAU, len = WARDEN_ARM, in0 = e.r + ARM_GAP;
        if (segDist(p.x, p.y, e.x + Math.cos(a) * in0, e.y + Math.sin(a) * in0, e.x + Math.cos(a) * len, e.y + Math.sin(a) * len) < PR + 6) hurt(e.dmg * .35, null);
      }
      return { vx: Math.cos(e.face), vy: Math.sin(e.face), sp: e.spd * .9 };
    },
  },

  void: {
    name: 'The Voidcaller', col: '#8a4fe0', hpM: .9, r: 36, spd: .9, relics: ['magnet', 'scholar', 'echo'],
    p2msg: 'tears the air open!', p3msg: 'starts to pull you in!',
    p2(e) { e.ringT = 1.5; },
    p3(e) { e.spiralT = 0; e.spA = 0; },
    init(e) { e.oa = Math.atan2(e.y, e.x); e.fireT = 2; e.ringT = 99; },
    ai(e, dt, p) {
      // keeps to the edge of the circle and fires slow orbs. Orbs glow before they're fired.
      e.oa += dt * (e.phase === 1 ? .22 : .32);
      const tx = Math.cos(e.oa) * (R - 40), ty = Math.sin(e.oa) * (R - 40);
      e.fireT -= dt;
      if (e.fireT <= .6 && !e.charging) { e.charging = true; sfx('tele'); }
      if (e.fireT <= 0) {
        e.fireT = e.phase === 1 ? 2.4 : 2; e.charging = false;
        const base = Math.atan2(p.y - e.y, p.x - e.x), n = e.phase === 1 ? 3 : 5;
        for (let i = 0; i < n; i++) orb(e, base + (i - (n - 1) / 2) * .22, 125);
      }
      if (e.phase >= 2) {
        e.ringT -= dt;
        if (e.ringT <= 0) { e.ringT = 4.5; const off = Math.random() * TAU; for (let i = 0; i < 14; i++) orb(e, off + i / 14 * TAU, 95); }
      }
      if (e.phase === 3) {
        // drags you towards it while a spiral of orbs pours out
        const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1;
        p.x += dx / d * 58 * dt; p.y += dy / d * 58 * dt;
        e.spiralT -= dt;
        if (e.spiralT <= 0) { e.spiralT = .13; e.spA += .5; orb(e, e.spA, 115); orb(e, e.spA + Math.PI, 115); }
      }
      const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy) || 1;
      return d > 4 ? { vx: dx / d, vy: dy / d, sp: Math.min(e.spd * 1.6, d * 4) } : null;
    },
  },
};
const BOSS_KEYS = Object.keys(BOSSES);
const WARDEN_ARM = 190, ARM_GAP = 42;   // the arms start a step away from the Warden: hug it to be safe from them
const rollBosses = () => shuffle([...BOSS_KEYS]);
const bossFor = w => BOSSES[S.bossOrder[(Math.floor(w / 10) - 1) % BOSS_KEYS.length]];
const bossKeyFor = w => S.bossOrder[(Math.floor(w / 10) - 1) % BOSS_KEYS.length];

function spawnBoss(k, x, y) {
  const b = BOSSES[k], e = spawnEnemy('boss', x, y);
  e.bk = k; e.col = b.col; e.r = b.r; e.phase = 1;
  e.hp = e.maxHp = e.maxHp * b.hpM;
  e.spd *= b.spd;
  if (b.init) b.init(e);
  return e;
}
function chase(e, p) { const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1; return { vx: dx / d, vy: dy / d, sp: e.spd }; }
function teleCircle(x, y, r, life, d, done) { S.tele.push({ x, y, r, t: 0, life, dmg: d, done2: done }); sfx('tele'); }
function aimDash(e, p, wind) {
  const a = Math.atan2(p.y - e.y, p.x - e.x), dx = Math.cos(a), dy = Math.sin(a);
  // stop short of the circle's edge
  const b = e.x * dx + e.y * dy, c = e.x * e.x + e.y * e.y - (R - 30) * (R - 30), toEdge = -b + Math.sqrt(Math.max(0, b * b - c));
  const len = clamp(Math.min(380, toEdge), 60, 380);
  e.mode = 'aim'; e.dx = dx; e.dy = dy;
  S.tele.push({ line: true, x: e.x, y: e.y, ang: a, len, w: e.r * 1.4, t: 0, life: wind, dmg: 0, done2: () => { if (e.dead) return; e.mode = 'dash'; e.modeT = len / 900; sfx('whoosh'); } });
  sfx('tele');
}
function orb(e, a, sp) { if (S.eorbs.length < 160) S.eorbs.push({ x: e.x + Math.cos(a) * e.r, y: e.y + Math.sin(a) * e.r, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 8, life: 7, dmg: e.dmg * .45 }); }
function segDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy || 1, t = clamp(((px - x1) * dx + (py - y1) * dy) / l2, 0, 1);
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
}

// called from the enemy loop for each boss
function bossStep(e, dt, p, held) {
  const b = BOSSES[e.bk];
  if (e.reviveT > 0) {
    // fake death: it lies still, then rises for the secret phase
    e.reviveT -= dt;
    if (e.reviveT <= 0) {
      e.phase = 3; e.hp = e.maxHp; S.shake = Math.min(7, S.shake + 5); hitstop(.08);
      FX({ k: 'boom', x: e.x, y: e.y, r: 150, life: .7, col: '#ff2244' }); puff(e.x, e.y, '#ff4466', 30, 220, .6);
      banner(`${b.name} ${b.p3msg}`); sfx('boss');
      b.p3(e);
    }
    return null;
  }
  if (e.phase === 1 && e.hp < e.maxHp * .5) {
    e.phase = 2;
    banner(`${b.name} ${b.p2msg}`, true); sfx('boss'); S.shake = Math.min(7, S.shake + 4);
    FX({ k: 'boom', x: e.x, y: e.y, r: 90, life: .6, col: '#ff3b4e' });
    b.p2(e);
  }
  if (held) return null;
  return b.ai(e, dt, p);
}
// endless bosses don't die the first time
function bossTryRevive(e) {
  if (!e.boss || e.mini || e.risen || S.wave <= 20) return false;
  e.dead = false; e.risen = true; e.hp = 1; e.maxHp *= .6; e.reviveT = 2.4;
  e.burnT = 0; e.bs = []; e.chill = 0; e.frozen = 0; e.stun = 0;
  S.silence = 2.4;
  S.tele = []; S.eorbs = [];
  banner('...');
  puff(e.x, e.y, e.col, 24, 140, .6); sfx('death');
  return true;
}

// boss-only hazards: trails, orbs, a shrinking circle
function updBossHazards(dt) {
  const p = S.p;
  for (const h of S.haz) { h.life -= dt; if (Math.hypot(p.x - h.x, p.y - h.y) < h.r + PR - 3) hurt(h.dmg, null); }
  S.haz = S.haz.filter(h => h.life > 0);
  for (const o of S.eorbs) {
    o.x += o.vx * dt; o.y += o.vy * dt; o.life -= dt;
    if (Math.hypot(p.x - o.x, p.y - o.y) < o.r + PR - 2) { o.life = 0; hurt(o.dmg, null); puff(o.x, o.y, '#b98cff', 6, 90, .3); }
    if (o.x * o.x + o.y * o.y > (R + 30) * (R + 30)) o.life = 0;
  }
  S.eorbs = S.eorbs.filter(o => o.life > 0);
  const target = S.shrink && S.enemies.some(e => e.boss && !e.dead) ? R * .55 : R;
  S.arenaR += clamp(target - S.arenaR, -dt * 7, dt * 60);
}

// ---- drawing (called from drawEnemy inside its transform)
function drawBoss(c, e, T, ang, base, dark, lite, hit) {
  const r = e.r, rev = e.reviveT > 0;
  if (rev) { c.globalAlpha *= .45 + Math.sin(T * 30) * .2; }
  if (e.phase >= 2 && !rev) { c.fillStyle = `rgba(255,40,60,${.16 + Math.sin(T * 9) * .07})`; c.beginPath(); c.arc(0, 0, r * 1.45, 0, TAU); c.fill(); }
  c.lineWidth = 3; c.strokeStyle = dark; c.fillStyle = base;
  if (e.bk === 'brood') {
    c.strokeStyle = dark; c.lineWidth = 4;
    for (let i = 0; i < 8; i++) { const s = i < 4 ? 1 : -1, j = i % 4, a = (j - 1.5) * .45 + (s > 0 ? 0 : Math.PI), wig = Math.sin(T * 8 + i) * .12; c.beginPath(); c.moveTo(Math.cos(a) * r * .6, Math.sin(a) * r * .6); c.lineTo(Math.cos(a + wig) * r * 1.25, Math.sin(a + wig) * r * 1.25 - r * .2); c.lineTo(Math.cos(a + wig) * r * 1.45, Math.sin(a + wig) * r * 1.45 + r * .15); c.stroke(); }
    c.fillStyle = shade(e.col, .7); c.beginPath(); c.ellipse(-Math.cos(ang) * r * .45, -Math.sin(ang) * r * .45, r * .75, r * .7, 0, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = base; c.beginPath(); c.arc(Math.cos(ang) * r * .25, Math.sin(ang) * r * .25, r * .62, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = hit ? '#fff' : '#ff3b5c';
    for (let i = 0; i < 6; i++) { const a = ang + (i - 2.5) * .28, rr = r * (.55 + (i % 2) * .12); c.beginPath(); c.arc(Math.cos(a) * rr, Math.sin(a) * rr, 2.6 + (i % 2), 0, TAU); c.fill(); }
  } else if (e.bk === 'blade') {
    const spin = e.mode === 'dash' ? T * 30 : T * 4;
    c.save(); c.rotate(spin);
    for (let i = 0; i < 2; i++) { c.rotate(Math.PI); c.fillStyle = hit ? '#fff' : '#e8fffb'; c.beginPath(); c.moveTo(r * .3, -r * .2); c.quadraticCurveTo(r * 1.5, -r * .4, r * 1.7, r * .25); c.quadraticCurveTo(r * 1.2, 0, r * .3, r * .2); c.closePath(); c.fill(); }
    c.restore();
    c.fillStyle = base; c.beginPath(); c.moveTo(Math.cos(ang) * r, Math.sin(ang) * r); for (let i = 1; i < 4; i++) { const a = ang + i * Math.PI / 2; c.lineTo(Math.cos(a) * r * (i === 2 ? .8 : .6), Math.sin(a) * r * (i === 2 ? .8 : .6)); } c.closePath(); c.fill(); c.stroke();
    eyes(c, r * .9, ang, 2, hit ? '#fff' : '#0b2a27');
  } else if (e.bk === 'warden') {
    c.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + Math.PI / 8; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fill(); c.stroke();
    c.fillStyle = dark; c.beginPath(); c.arc(0, 0, r * .45, 0, TAU); c.fill();
    c.fillStyle = hit ? '#fff' : '#ffd36b'; c.beginPath(); c.arc(Math.cos(e.face) * r * .15, Math.sin(e.face) * r * .15, r * .16, 0, TAU); c.fill();
    // the shield
    c.strokeStyle = hit ? '#fff' : '#f2c14e'; c.lineWidth = 9; c.lineCap = 'round';
    c.beginPath(); c.arc(0, 0, r + 8, e.face - 1.13, e.face + 1.13); c.stroke();
    c.strokeStyle = 'rgba(255,240,200,.7)'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, r + 8, e.face - 1.05, e.face + 1.05); c.stroke();
  } else if (e.bk === 'void') {
    const glow = e.charging ? .5 + Math.sin(T * 30) * .3 : .2;
    c.fillStyle = `rgba(150,90,255,${glow})`; c.beginPath(); c.arc(0, 0, r * 1.5, 0, TAU); c.fill();
    c.fillStyle = hit ? '#fff' : '#1b0d2e'; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
    c.strokeStyle = base; c.lineWidth = 3;
    for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(0, 0, r * (1.15 + i * .12), r * (.35 + i * .1), T * (1 + i * .4) + i, 0, TAU); c.stroke(); }
    c.fillStyle = hit ? '#fff' : '#d9b8ff'; c.beginPath(); c.ellipse(Math.cos(ang) * r * .3, Math.sin(ang) * r * .3, r * .32, r * .2, ang, 0, TAU); c.fill();
    c.fillStyle = '#12061f'; c.beginPath(); c.arc(Math.cos(ang) * r * .36, Math.sin(ang) * r * .36, r * .1, 0, TAU); c.fill();
  } else {
    c.fillStyle = '#f2c14e'; for (const sx of [-1, 0, 1]) { c.beginPath(); c.moveTo(sx * r * .45 - r * .2, -r * .8); c.lineTo(sx * r * .45, -r * (sx ? 1.3 : 1.5)); c.lineTo(sx * r * .45 + r * .2, -r * .8); c.closePath(); c.fill(); }
    c.fillStyle = base; c.lineWidth = 3;
    c.beginPath(); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + T * .4, rr = i % 2 ? r * .8 : r * 1.06; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); c.fill(); c.stroke();
    c.fillStyle = hit ? '#ffffff' : '#2a0c18'; c.beginPath(); c.arc(0, 0, r * .55, 0, TAU); c.fill();
    c.fillStyle = hit ? '#ffffff' : `rgba(255,90,120,${.7 + Math.sin(T * 5) * .3})`; c.beginPath(); c.arc(0, 0, r * (.2 + Math.sin(T * 5) * .03), 0, TAU); c.fill();
    eyes(c, r * 1.1, ang, 2, '#ffd0dc');
  }
}
// world-space boss extras: the Warden's spinning arms, hazards, orbs, the shrinking wall
function drawBossWorld(c, T) {
  for (const h of S.haz) { const a = Math.min(1, h.life / h.max * 1.5); c.fillStyle = `rgba(80,230,210,${.22 * a})`; c.beginPath(); c.arc(h.x, h.y, h.r, 0, TAU); c.fill(); c.fillStyle = `rgba(255,60,90,${.25 * a})`; c.beginPath(); c.arc(h.x, h.y, h.r * .55, 0, TAU); c.fill(); }
  for (const e of S.enemies) {
    if (e.bk !== 'warden' || e.dead || e.reviveT > 0) continue;
    for (let i = 0; i < e.arms; i++) {
      const a = e.armA + i / e.arms * TAU, x1 = e.x + Math.cos(a) * (e.r + ARM_GAP), y1 = e.y + Math.sin(a) * (e.r + ARM_GAP), x2 = e.x + Math.cos(a) * WARDEN_ARM, y2 = e.y + Math.sin(a) * WARDEN_ARM;
      c.globalAlpha = e.armIn < 1 ? .3 + Math.sin(T * 25) * .2 : 1;
      c.strokeStyle = '#6f7686'; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
      c.fillStyle = '#ff4d5e';
      for (let k = 1; k <= 6; k++) { const t = k / 6, x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t, n = a + Math.PI / 2; c.beginPath(); c.moveTo(x + Math.cos(n) * 9, y + Math.sin(n) * 9); c.lineTo(x + Math.cos(a) * 4, y + Math.sin(a) * 4); c.lineTo(x - Math.cos(n) * 9, y - Math.sin(n) * 9); c.lineTo(x - Math.cos(a) * 4, y - Math.sin(a) * 4); c.closePath(); c.fill(); }
      c.globalAlpha = 1;
    }
  }
  if (S.arenaR < R - 1) {
    c.strokeStyle = `rgba(255,50,70,${.75 + Math.sin(T * 8) * .2})`; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, S.arenaR, 0, TAU); c.stroke();
    c.fillStyle = 'rgba(30,0,8,.55)'; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.arc(0, 0, S.arenaR, 0, TAU, true); c.fill();
  }
}
function drawOrbs(c, T) {
  for (const o of S.eorbs) {
    c.fillStyle = 'rgba(160,100,255,.25)'; c.beginPath(); c.arc(o.x, o.y, o.r * 1.9, 0, TAU); c.fill();
    c.fillStyle = '#c9a2ff'; c.beginPath(); c.arc(o.x, o.y, o.r, 0, TAU); c.fill();
    c.fillStyle = '#2a1145'; c.beginPath(); c.arc(o.x, o.y, o.r * .5, 0, TAU); c.fill();
  }
}
