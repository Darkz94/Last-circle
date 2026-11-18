// ===== the third pair synergies and the second trio synergies (see 22-synergies.js for the system).
// New mechanics: homing sparks, confusion clouds, meteors at the thickest crowd, ice-crystal turrets,
// a magnetic pull, a frost shield, hit cycling, a growing titan, changing seasons and taunting totems.

// the point with the most enemies around it (optionally only looking near a spot)
function densest(cx, cy, range, rad) {
  let best = null, bn = -1;
  const pool = S.enemies.filter(e => !e.dead && !e.fixed && (range === undefined || Math.hypot(e.x - cx, e.y - cy) < range));
  for (const e of shuffle(pool).slice(0, 40)) {
    let n = 0; for (const o of pool) if (Math.hypot(o.x - e.x, o.y - e.y) < rad) n++;
    if (n > bn) { bn = n; best = e; }
  }
  return best ? { x: best.x, y: best.y, n: bn } : null;
}

// ---- Ember Sparks (Fire + Lightning): burning enemies that die spit out homing sparks
F.sparks.kill = (a, s, e) => {
  if (!(e.burnT > 0)) return;
  for (let i = 0; i < (s ? 4 : 2) && S.sparks.length < 60; i++) { const an = Math.random() * TAU; S.sparks.push({ x: e.x, y: e.y, vx: Math.cos(an) * 220, vy: Math.sin(an) * 220, life: 3, b: s ? 1 : 0, tg: null, hit: new Set([e]) }); }
};
F.sparks.frame = (a, s, dt) => {
  for (const k of S.sparks) {
    k.life -= dt;
    if (!k.tg || k.tg.dead) k.tg = nearest(k.x, k.y, 280, k.hit);
    if (k.tg) { const dx = k.tg.x - k.x, dy = k.tg.y - k.y, d = Math.hypot(dx, dy) || 1; k.vx += (dx / d * 340 - k.vx) * Math.min(1, dt * 6); k.vy += (dy / d * 340 - k.vy) * Math.min(1, dt * 6);
      if (d < k.tg.r + 6) { const t = k.tg; burn(t, burnFrom(S.ab * .8)); bolt(t, .6, { noChain: true, full: true }); k.hit.add(t); k.tg = null; if (k.b-- <= 0) k.life = 0; } }
    k.x += k.vx * dt; k.y += k.vy * dt;
  }
  S.sparks = S.sparks.filter(k => k.life > 0);
};

// ---- Blinding Steam (Fire + Ice): burning a chilled enemy leaves a confusing steam cloud (made in burn())
function steamCloud(e) {
  const s = syn('steam2'); if (s < 0 || S.mists.length > 14 || S.time < (e.mistCd || 0)) return;
  e.mistCd = S.time + 1.5;
  S.mists.push({ x: e.x, y: e.y, r: s ? 72 : 52, life: s ? 5 : 3, max: s ? 5 : 3 });
}
F.steam2.frame = (a, s, dt) => {
  for (const m of S.mists) { m.life -= dt; eachNear(m.x, m.y, m.r, e => { if (!e.boss && !e.fixed) e.confT = .6; }); }
  S.mists = S.mists.filter(m => m.life > 0);
  if (!s) return;
  // major: confused enemies lash out at whoever is next to them
  for (const e of S.enemies) {
    if (e.dead || !(e.confT > 0)) continue;
    if ((e.cfAtk = (e.cfAtk || 0) - dt) > 0) continue;
    const o = nearest(e.x, e.y, e.r + 18, new Set([e]));
    if (o) { e.cfAtk = .9; dmg(o, S.ab * .6, { col: '#d8d0ff' }); }
  }
};

// ---- Starfall (Fire + Earth): falling stars land on the thickest crowds
F.starfall.cd = 6;
F.starfall.fire = (a, s) => {
  const spots = [];
  for (let i = 0; i < 6 && spots.length < (s ? 3 : 1); i++) { const d = densest(undefined, undefined, undefined, 70); if (d && spots.every(q => Math.hypot(q.x - d.x, q.y - d.y) > 90)) spots.push(d); }
  spots.forEach((q, i) => {
    FX({ k: 'ring', x: q.x, y: q.y, r: 75, life: .75, col: FIRE });
    later(.75 + i * .15, () => {
      boom(q.x, q.y, 75, S.ab * 3 + tot.maxHp * .05, FIRE, { src: 'explosion' });
      if (s) pushZone({ k: 'fire', x: q.x, y: q.y, r: 42, life: 3, max: 3, tick: 0, dps: S.ab * .6 });
    });
  });
};

// ---- Storm Crystals (Lightning + Ice): frozen enemies leave ice crystals that zap
F.crystal.kill = (a, s, e) => { if (e.frozen > 0 && S.crystals.length < 12) S.crystals.push({ x: e.x, y: e.y, life: s ? 8 : 4, max: s ? 8 : 4, t: Math.random() * .5 }); };
F.crystal.frame = (a, s, dt) => {
  for (const k of S.crystals) {
    k.life -= dt; k.t -= dt;
    if (k.t <= 0) { k.t = .5; const tg = nearest(k.x, k.y, 130); if (tg) { bolt(tg, .6, { from: k, noChain: true, full: true }); if (s) chill(tg, 1.5); } }
  }
  S.crystals = S.crystals.filter(k => k.life > 0);
};

// ---- Lodestone (Lightning + Earth): yank a crowd together, then strike it
F.lodestone.cd = 5;
F.lodestone.fire = (a, s) => {
  const c = densest(S.p.x, S.p.y, 260, 90); if (!c) return;
  const r = s ? 170 : 120;
  FX({ k: 'ring', x: c.x, y: c.y, r, life: .35, col: COL.yellow });
  eachNear(c.x, c.y, r, e => { if (e.boss || e.fixed) return; e.kx += (c.x - e.x) * .85; e.ky += (c.y - e.y) * .85; });
  later(.35, () => {
    FX(makeBolt(c.x, c.y - 260, c.x, c.y)); sfx('zap');
    boom(c.x, c.y, 70, S.ab * 2.2, COL.yellow, { src: 'lightning' });
    if (s) eachNear(c.x, c.y, 75, e => stun(e, 1));
  });
};

// ---- Frost Barrier (Ice + Earth): a recharging shield (absorbing happens in hurt())
F.barrier.frame = (a, s, dt) => {
  S.shieldMax = tot.maxHp * (s ? .2 : .1);
  S.shieldT = (S.shieldT || 0) - dt;
  if (S.shieldT <= 0 && (S.shield || 0) < S.shieldMax) { if (!S.shield) FX({ k: 'ring', x: S.p.x, y: S.p.y, r: 26, life: .3, col: ICE }); S.shield = S.shieldMax; }
};
function barrierAbsorb(d) {
  S.shieldT = 5;
  const s = syn('barrier'); if (s < 0 || !(S.shield > 0)) return d;
  const take = Math.min(S.shield, d); S.shield -= take;
  if (S.shield <= 0) {
    S.shield = 0; puff(S.p.x, S.p.y, '#cfefff', 14, 180, .5); sfx('freeze');
    if (s) { FX({ k: 'boom', x: S.p.x, y: S.p.y, r: 120, life: .4, col: ICE }); eachNear(S.p.x, S.p.y, 120, e => { freeze(e); dmg(e, S.ab * 1.5, { col: ICE }); }); }
  }
  return d - take;
}

// ---- Elemental Cycle (Fire + Lightning + Ice): hits cycle elements; each full cycle makes a nova
F.cycle.hit = (a, s, w, e, d) => {
  if (e.dead) return;
  const st = e.cyc = ((e.cyc || 0) + 1) % 3;
  if (st === 1) burn(e, burnFrom(d * .25));
  else if (st === 2) bolt(e, .5, { noChain: true, full: true });
  else {
    chill(e, 2);
    if (S.time < (e.novaCd || 0)) return;
    e.novaCd = S.time + 2;
    boom(e.x, e.y, 80, S.ab * 1.6, '#ffffff', { chill: 1, fire: true, src: 'explosion' });
    if (!e.dead && !e.boss && Math.random() < .5) freeze(e);
    shuffle(S.enemies.filter(o => !o.dead && Math.hypot(o.x - e.x, o.y - e.y) < 140)).slice(0, 3).forEach(o => bolt(o, .8, { noChain: true, full: true }));
  }
};

// ---- Forge Titan (Fire + Lightning + Earth): one molten titan that grows with every kill
F.forge.frame = (a, s, dt) => {
  if (S.phase !== 'fight') return;
  let t = S.titan;
  if (!t) {
    S.forgeCd = (S.forgeCd || 0) - dt; if (S.forgeCd > 0) return;
    const hp = tot.maxHp * 1.5 + S.ab * 20;
    t = S.titan = { x: S.p.x, y: S.p.y, vx: 0, vy: 0, a: 0, hp, maxHp: hp, lv: S.forgeLv || 0, hitCd: 0, spT: 1, big: true, life: 1e9, seed: Math.random() * TAU };
    FX({ k: 'boom', x: t.x, y: t.y, r: 60, life: .4, col: FIRE }); sfx('summon');
  }
  const pow = 1 + t.lv * .06;
  t.hp = Math.min(t.maxHp, t.hp + t.maxHp * .03 * dt); t.hitCd -= dt; t.spT -= dt;
  const tg = nearest(t.x, t.y, 600);
  if (tg) moveGolem(t, dt, 150, tg.x, tg.y); else { t.a += dt; moveGolem(t, dt, 150, S.p.x + Math.cos(t.a) * 50, S.p.y + Math.sin(t.a) * 50); }
  const rr = 22 + Math.min(18, t.lv * .4);
  if (tg && t.hitCd <= 0 && Math.hypot(tg.x - t.x, tg.y - t.y) < tg.r + rr) {
    t.hitCd = .5;
    dmg(tg, S.ab * 1.4 * pow, { col: FIRE, src: 'golem' }); burn(tg, burnFrom(S.ab * .6 * pow));
    FX({ k: 'ring', x: t.x, y: t.y, r: rr, life: .2, col: FIRE }); sfx('hit_green');
    t.hp -= tg.dmg * .5;
    if (tg.dead) { t.lv++; t.maxHp *= 1.02; t.hp = Math.min(t.maxHp, t.hp + t.maxHp * .05); }
  }
  if (t.spT <= 0) { t.spT = 1; const e2 = nearest(t.x, t.y, 170); if (e2) bolt(e2, .7 * pow, { from: t, noChain: true, full: true }); }
  if (t.hp <= 0) {
    boom(t.x, t.y, 110, t.maxHp * .6, FIRE, { pierce: true, src: 'golem' });
    S.forgeLv = Math.floor(t.lv / 2); S.titan = null; S.forgeCd = 4;
  }
};

// ---- Seasons (Fire + Ice + Earth): summer doubles burns and scorches, winter chills and freezes
F.seasons.frame = (a, s, dt) => {
  if (S.summer === undefined) { S.summer = true; S.seasonT = 10; }
  S.seasonT -= dt;
  if (S.seasonT <= 0) { S.seasonT = 10; S.summer = !S.summer; banner(S.summer ? 'Summer' : 'Winter'); }
  S.scT = (S.scT || 0) - dt; if (S.scT > 0) return;
  if (S.summer) { S.scT = 1.5; eachNear(S.p.x, S.p.y, 230, e => burn(e, burnFrom(S.ab * .8))); }
  else { S.scT = 1; eachNear(S.p.x, S.p.y, 230, e => { chill(e, 1.5); if (!e.boss && Math.random() < .15) freeze(e); }); }
};
const summerBurn = () => syn('seasons') >= 0 && S.summer ? 2 : 1;

// ---- Storm Totems (Lightning + Ice + Earth): planted totems draw enemies and pulse chill + lightning
F.totems.cd = 6;
F.totems.fire = () => {
  if (S.totems.length >= 3) S.totems.shift();
  const hp = tot.maxHp * 1.5;
  S.totems.push({ x: S.p.x, y: S.p.y, r: 14, hp, maxHp: hp, t: 0 });
  FX({ k: 'ring', x: S.p.x, y: S.p.y, r: 40, life: .3, col: COL.yellow }); sfx('summon');
};
F.totems.frame = (a, s, dt) => {
  for (const k of S.totems) {
    k.t -= dt;
    if (k.t <= 0) { k.t = 1; FX({ k: 'ring', x: k.x, y: k.y, r: 110, life: .3, col: ICE }); eachNear(k.x, k.y, 110, e => chill(e, 1.5)); const tg = nearest(k.x, k.y, 150); if (tg) bolt(tg, 1.6, { from: k, noChain: true, full: true }); }
  }
  const gone = S.totems.filter(k => k.hp <= 0); for (const k of gone) puff(k.x, k.y, '#bfe6ff', 10, 120, .4);
  S.totems = S.totems.filter(k => k.hp > 0);
};
// the totem an enemy goes for instead of you (nearest within 220), if any
function tauntFor(e) {
  if (e.boss || !S.totems.length || syn('totems') < 0) return null;
  let b = null, bd = 220;
  for (const k of S.totems) { const d = Math.hypot(k.x - e.x, k.y - e.y); if (d < bd) { bd = d; b = k; } }
  return b;
}

// ---- drawing for the new mechanics
function drawSynWorld(c, T) {
  if (syn('seasons') >= 0) { c.fillStyle = S.summer ? 'rgba(255,120,40,.05)' : 'rgba(120,190,255,.06)'; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill(); }
  for (const m of S.mists) { c.globalAlpha = Math.min(1, m.life / .5) * .32; c.fillStyle = '#e6e2ff'; c.beginPath(); c.arc(m.x, m.y, m.r, 0, TAU); c.fill(); }
  c.globalAlpha = 1;
  for (const k of S.crystals) {
    c.globalAlpha = Math.min(1, k.life / .4);
    c.fillStyle = '#bfe9ff'; c.strokeStyle = '#ffe066'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(k.x, k.y - 13); c.lineTo(k.x + 6, k.y); c.lineTo(k.x, k.y + 7); c.lineTo(k.x - 6, k.y); c.closePath(); c.fill(); c.stroke();
  }
  c.globalAlpha = 1;
  for (const k of S.totems) {
    c.fillStyle = '#2b3445'; c.strokeStyle = '#9fd8ff'; c.lineWidth = 2;
    c.fillRect(k.x - 6, k.y - 16, 12, 28); c.strokeRect(k.x - 6, k.y - 16, 12, 28);
    c.fillStyle = '#ffe066'; c.beginPath(); c.arc(k.x, k.y - 20, 4 + Math.sin(T * 6) * 1, 0, TAU); c.fill();
    c.fillStyle = '#3a1e24'; c.fillRect(k.x - 10, k.y + 16, 20, 3); c.fillStyle = '#9fd8ff'; c.fillRect(k.x - 10, k.y + 16, 20 * Math.max(0, k.hp / k.maxHp), 3);
  }
  const t = S.titan;
  if (t) {
    drawGolem(c, t, 2.4 + Math.min(1.2, t.lv * .03), T);
    c.strokeStyle = 'rgba(255,120,40,.8)'; c.lineWidth = 3; c.beginPath(); c.arc(t.x, t.y, 24 + Math.min(18, t.lv * .4), 0, TAU); c.stroke();
  }
  for (const k of S.sparks) { c.fillStyle = '#ffd27a'; c.beginPath(); c.arc(k.x, k.y, 3, 0, TAU); c.fill(); }
  if (S.shield > 0 && syn('barrier') >= 0) { c.strokeStyle = `rgba(160,220,255,${.35 + .5 * S.shield / (S.shieldMax || 1)})`; c.lineWidth = 3; c.beginPath(); c.arc(S.p.x, S.p.y, PR + 8, 0, TAU); c.stroke(); }
}

// ---- golem synergies bring their own golems (Earth is no longer the summoner; summons are spread out)
for (const id of ['magma', 'magnetite', 'permafrost', 'glacier', 'livingstorm']) {
  const old = F[id].frame;
  F[id].frame = (a, s, dt) => {
    S.synSumT = (S.synSumT || 0) - dt;
    if (S.synSumT <= 0 && S.phase === 'fight') { S.synSumT = id === 'livingstorm' ? 4 : 5; summonGolems(Math.max(1, bestEarthTier()), S.p.x, S.p.y, (id === 'livingstorm' ? 4 : 2) + (s && id !== 'livingstorm' ? 1 : 0) + (rel('twin') ? 1 : 0)); }
    if (old) old(a, s, dt);
  };
}
