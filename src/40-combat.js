// ===== combat core: damage, status effects, explosions, lightning, thorns, loot
const NO = {};
function emit(n, a1, a2, a3) { const hs = S.hk[n]; if (hs) for (const h of hs) h.a[n](h.a, h.s, a1, a2, a3); }
const later = (t, f) => S.later.push({ t, f });
function FX(o) { o.t = 0; if (S.fx.length < 420) S.fx.push(o); }
function puff(x, y, col, n, spd, life) {
  for (let i = 0; i < n && S.pt.length < 520; i++) { const a = Math.random() * TAU, v = spd * rnd(.3, 1); S.pt.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: life * rnd(.6, 1), col, sz: rnd(1.5, 3.5) }); }
}
function banner(text, small) { S.banner = { text, t: small ? .2 : 0, small }; }
function hitstop(t) { if (S.time - S.lastStop > .45) { S.hitstop = t; S.lastStop = S.time; } }
function heal(v) { S.p.hp = Math.min(tot.maxHp, S.p.hp + v); }
function addText(x, y, v, col, crit) {
  if (S.texts.length > 46) S.texts.shift();
  S.texts.push({ x, y, s: String(Math.max(1, Math.round(v))) + (crit ? '!' : ''), col, crit, t: 0, big: v > S.avg * 4 });
}
// damage numbers are merged per enemy so a busy fight stays readable
function flushDn(e) { if (e.dnAcc > 0) { addText(e.x + rnd(-5, 5), e.y - e.r - 5, e.dnAcc, e.dnCol, e.dnCrit); e.dnAcc = 0; e.dnCrit = false; } }

// o: { col, crit, src, pierce (ignore armor), tr (true damage: ignore everything) }
function dmg(e, amt, o) {
  if (e.dead) return 0;
  o = o || NO;
  let d = amt;
  if (!o.tr) {
    let m = 1;
    if (e.burnT > 0) m *= 1 + E('red', 'vsBurn') / 100;
    if (isCold(e)) m *= 1 + E('blue', 'vsChill') / 100;
    const hs = S.hk.mult; if (hs) for (const h of hs) m *= h.a.mult(h.a, h.s, e);
    d *= m;
    if (!o.pierce) d = Math.max(1, d - Math.max(0, e.armor - tot.pen));
  }
  e.hp -= d; e.hitT = .12;
  e.dnAcc += d; if (e.dnT <= 0) e.dnT = .14; e.dnCol = o.col || '#ffffff'; if (o.crit) e.dnCrit = true;
  if (e.hp <= .001) { e.dead = true; e.killer = o.src; flushDn(e); S.dying.push(e); }
  return d;
}
const isCold = e => e.chill > 0 || e.frozen > 0 || (e.burnT > 0 && rel('frostfire'));
const burnFrom = hit => hit * .38 * E('red', 'burn') / 100;
function burn(e, dps, dur) {
  if (e.dead) return;
  if (e.burnT <= 0) sfx('burn');
  e.burnT = Math.max(e.burnT, dur || E('red', 'burnDur'));
  e.burnDps = Math.max(e.burnDps, dps);
}
function freeze(e) {
  if (e.dead || e.type === 'altar') return;
  e.chill = 0;
  e.frozen = E('blue', 'freezeDur') * (e.boss || e.elite ? .35 : 1);
  sfx('freeze');
  FX({ k: 'ring', x: e.x, y: e.y, r: e.r + 14, life: .3, col: ICE });
  puff(e.x, e.y, '#e8f8ff', 5, 70, .4);
}
function chill(e, n) {
  if (e.dead || e.frozen > 0) return;
  e.chill += n; e.chillT = 2.6;
  if (e.chill >= 4) freeze(e);
}
function stun(e, t) { if (e.dead) return; t *= E('blue', 'ccDur') / 100; e.stun = Math.max(e.stun, e.boss || e.elite ? t * .35 : t); }
function knock(e, ang, f) { if (e.dead || e.boss || e.type === 'altar') return; if (e.type === 'brute' || e.elite) f *= .45; e.kx += Math.cos(ang) * f; e.ky += Math.sin(ang) * f; }
const boomR = r => r * E('red', 'boomR') / 100;
function eachNear(x, y, r, fn) { grid.near(x, y, r + 64, e => { if (!e.dead && Math.hypot(e.x - x, e.y - y) < r + e.r) fn(e); }); }
function boom(x, y, rad, amt, col, o) {
  o = o || NO;
  FX({ k: 'boom', x, y, r: rad, life: .35, col });
  if (!o.small) { S.shake = Math.min(5, S.shake + 1.2); puff(x, y, col, 8, rad * 2.2, .4); if (rad > 80) hitstop(.035); }
  if (!o.quiet) sfx('boom', o.small ? .5 : 1);
  eachNear(x, y, rad, e => {
    dmg(e, amt, { col, pierce: o.pierce, src: o.src });
    if (o.ignite) burn(e, burnFrom(amt));
    if (o.chill) chill(e, o.chill);
    if (o.freezeCh && Math.random() * 100 < o.freezeCh) freeze(e);
    if (o.stun) stun(e, o.stun);
  });
}
function nearest(x, y, range, exclude, fromEdge) {
  let best = null, bd = Infinity;
  for (const e of S.enemies) {
    if (e.dead || (exclude && exclude.has(e))) continue;
    const dx = e.x - x, dy = e.y - y;
    if (e.x * e.x + e.y * e.y > (SPAWN_R + 10) * (SPAWN_R + 10)) continue;
    const d = Math.sqrt(dx * dx + dy * dy) - (fromEdge ? e.r : 0);
    if (d <= range && d < bd) { bd = d; best = e; }
  }
  return best;
}
const inArena = () => S.enemies.filter(e => !e.dead && e.x * e.x + e.y * e.y < (R + 25) * (R + 25));
function aim() { const t = nearest(S.p.x, S.p.y, 600); return t ? Math.atan2(t.y - S.p.y, t.x - S.p.x) : S.p.face; }
function inCone(e, x, y, dir, half, range) {
  const dx = e.x - x, dy = e.y - y, d = Math.hypot(dx, dy);
  if (d - e.r > range) return false;
  return Math.abs(angDiff(Math.atan2(dy, dx), dir)) <= half + Math.atan2(e.r, Math.max(d, 1));
}
function addPillar(x, y, life, r) { if (S.pillars.length >= 6) S.pillars.shift(); S.pillars.push({ x, y, life, tick: 0, r }); sfx('freeze'); FX({ k: 'ring', x, y, r, life: .4, col: ICE }); }

const LFLOOR = .65;
// ---- lightning: every hit takes a % of the target's CURRENT HP (bosses and elites take a quarter of it),
// reduced by armor unless you have lightning penetration. Your damage stats don't touch it.
function lightningDmg(e, mult) {
  let p = E('yellow', 'strike') * mult;
  const cd = sv('conductor');
  if (cd && (e.stun > 0 || isCold(e))) p *= 1 + cd / 100;
  if (e.boss || e.elite) p *= .25;
  // lightning softens enemies up but can't finish them: it stops at LFLOOR of their max HP, and your weapons do the rest
  const room = e.hp - e.maxHp * LFLOOR;
  if (room <= 0) return 1;
  return Math.max(1, Math.min(room, e.hp * p / 100 - Math.max(0, e.armor - E('yellow', 'lpen'))));
}
function bolt(e, mult, o) {
  if (!e || e.dead) return;
  o = o || NO;
  if (!o.silent) { FX(o.from ? makeBolt(o.from.x, o.from.y, e.x, e.y) : makeBolt(e.x + rnd(-30, 30), e.y - 260, e.x, e.y)); sfx('zap'); }
  const d = lightningDmg(e, mult);
  dmg(e, d, { col: COL.yellow, src: 'lightning', pierce: true });
  if (Math.random() * 100 < E('yellow', 'lstun')) stun(e, .6);
  if (o.silent) return;
  const ov = sv('overload');
  if (ov) boom(e.x, e.y, sv('overload', 'r'), d * ov / 100, '#ffe066', { small: true, src: 'lightning', quiet: true });
  if (!o.again && Math.random() * 100 < sv('twice')) later(.14, () => bolt(e, mult, { again: true, noChain: true }));
  if (!o.noChain) chainFrom(e, mult * .8, (o.jumps || 0) + sv('chain'));
}
function chainFrom(e, mult, n) {
  const hit = new Set([e]);
  let cur = e;
  for (let i = 0; i < n; i++) {
    const nx = nearest(cur.x, cur.y, 140, hit);
    if (!nx) break;
    hit.add(nx);
    bolt(nx, mult, { from: cur, noChain: true });
    cur = nx;
  }
}
function makeBolt(x1, y1, x2, y2) {
  const pts = [[x1, y1]], n = 6, dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  for (let i = 1; i < n; i++) { const t = i / n, j = rnd(-1, 1) * Math.min(14, L * .12); pts.push([x1 + dx * t + nx * j, y1 + dy * t + ny * j]); }
  pts.push([x2, y2]);
  return { k: 'bolt', pts, life: .16 };
}

// ---- thorns (Earth only): every enemy attack is punished, even ones you're invulnerable to.
// flat thorns x thorn multiplier (+ Retribution's share of the hit), minus enemy armor reduced by thorn penetration.
function thorns(e) {
  if (e.dead) return;
  const rt = sv('retri');
  if (tot.thornFlat <= 0 && !rt) return;
  const raw = tot.thornFlat * tot.thornPct / 100 + e.dmg * rt / 100;
  dmg(e, Math.max(1, raw - Math.max(0, e.armor - tot.thornPen)), { col: '#e6c882', pierce: true });
  sfx('thorn');
  FX({ k: 'spikes', x: S.p.x, y: S.p.y, dir: Math.atan2(e.y - S.p.y, e.x - S.p.x), life: .25 });
}
function hurt(d, src) {
  const p = S.p;
  if (p.inv > 0) return;
  d = Math.max(1, d - tot.armor - ((S.buff && S.buff.armor) || 0));
  if (rel('hide')) d *= .85;
  p.hp -= d; p.inv = .4; S.shake = Math.min(7, S.shake + 4); S.hurtFlash = .25;
  sfx('hurt'); hitstop(.045);
  addText(p.x, p.y - 20, d, '#ff6b6b', false);
  emit('hurt', src);
  if (p.hp <= 0) {
    const hs = S.hk.death; let saved = false;
    if (hs) for (const h of hs) if (h.a.death(h.a, h.s)) { saved = true; break; }
    if (!saved) gameOver();
  }
}

// ---- loot: enemies drop gold and XP that you have to pick up
function dropLoot(e) {
  const gm = (1 + ((S.buff && S.buff.greed) || 0)) * (rel('rush') ? 1.5 : 1);
  if (e.type === 'goblin') { const g = (20 + S.wave * 8) * gm; for (let i = 0; i < 10; i++) addDrop('gold', g / 10, e.x, e.y); }
  const gold = e.gold * gm, n = gold > 0 ? Math.min(3, Math.max(1, Math.round(gold / 2))) : 0;
  for (let i = 0; i < n; i++) addDrop('gold', gold / n, e.x, e.y);
  if (e.xp > 0) addDrop('xp', e.xp, e.x, e.y);
}
function addDrop(k, v, x, y) {
  if (S.drops.length > 260) { const o = S.drops.find(d => d.k === k && !d.mag); if (o) { o.v += v; return; } }
  const l = Math.hypot(x, y); if (l > R - 12) { x *= (R - 12) / l; y *= (R - 12) / l; }
  const a = Math.random() * TAU, sp = rnd(40, 120);
  S.drops.push({ k, v, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, z: 0, vz: rnd(120, 220), mag: false, ph: Math.random() * TAU });
}
function updDrops(dt) {
  const p = S.p, collecting = S.collectT !== null;
  const pr = tot.pickR * (collecting ? 1.6 : 1) * (1 + ((S.buff && S.buff.pick) || 0));
  for (const d of S.drops) {
    // pop up, bounce once, settle
    if (d.z > 0 || d.vz > 0) { d.z += d.vz * dt; d.vz -= 700 * dt; if (d.z <= 0) { d.z = 0; d.vz = d.vz < -90 ? -d.vz * .35 : 0; } }
    d.x += d.vx * dt; d.y += d.vy * dt; d.vx *= Math.max(0, 1 - dt * 5); d.vy *= Math.max(0, 1 - dt * 5);
    const dx = p.x - d.x, dy = p.y - d.y, dist = Math.hypot(dx, dy) || 1;
    if (dist < pr) d.mag = true;
    if (d.mag) { const sp = 440 + (collecting ? 300 : 0); d.x += dx / dist * sp * dt; d.y += dy / dist * sp * dt; }
    if (dist < PR + 7) {
      d.got = true;
      if (d.k === 'gold') { S.gold += d.v; sfx('coin'); } else { gainXp(d.v * (rel('scholar') ? 1.3 : 1)); sfx('xp'); }
      if (rel('magnet')) heal(1);
    }
  }
  S.drops = S.drops.filter(d => !d.got);
}
function gainXp(n) {
  S.xp += n;
  while (S.xp >= xpNeed()) { S.xp -= xpNeed(); S.level++; S.pendingLv++; sfx('level'); if (S.phase === 'fight') FX({ k: 'ring', x: S.p.x, y: S.p.y, r: 46, life: .5, col: COL.xp }); }
}
function processDeaths() {
  let guard = 0;
  while (S.dying.length && guard++ < 800) {
    const e = S.dying.shift();
    S.kills++;
    sfx('pop');
    dropLoot(e);
    FX({ k: 'pop', x: e.x, y: e.y, r: e.r, life: .25, col: e.col });
    puff(e.x, e.y, e.col, e.boss ? 40 : Math.min(9, 3 + e.r / 3 | 0), 150, .45);
    emit('kill', e);
    if (e.killer === 'golem') emit('gKill', e);
    if (e.boss) { S.shake = 14; hitstop(.12); FX({ k: 'boom', x: e.x, y: e.y, r: 130, life: .7, col: e.col }); sfx('boom', 1.5); }
  }
  S.enemies = S.enemies.filter(e => !e.dead);
}
