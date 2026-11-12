// ===== weapons (melee, auto-attacking) and golems
const wName = w => `${w.evo ? EVO[w.el] : ADJ[w.el]} ${TYPES[w.type].n}`;
function weaponDmg(w) {
  let d = (TYPES[w.type].dmg * TM[w.tier] * (w.evo ? 1.5 : 1) + tot.flat) * (1 + tot.dmgPct / 100);
  if (w.el === 'yellow') d *= YEL_DMG;
  if (S.buff && S.buff.dmg) d *= 1 + S.buff.dmg;
  return d;
}
const avgDmg = () => S.weapons.reduce((s, w) => s + weaponDmg(w), 0) / Math.max(1, S.weapons.length);
const surgeM = () => 1 + S.surge.n * sv('surge') / 100;
function atkSpeed(w) {
  let m = (1 + tot.atkSpd / 100) * surgeM() * (1 + ((S.buff && S.buff.atk) || 0)) * (1 + (rel('blood') ? S.blood / 100 : 0));
  if (w.el === 'yellow') m *= YEL_SPD + (E('yellow', 'lspd') + sv('current')) / 100;
  return m;
}
function weaponAttack(w) {
  const T = TYPES[w.type], p = S.p, range = T.range * tot.rangeM;
  const tg = nearest(p.x, p.y, range, null, true);
  if (!tg) return false;
  const dir = Math.atan2(tg.y - p.y, tg.x - p.x);
  w.anim = 1; w.dir = dir;
  let targets;
  if (T.kind === 'stab') targets = [tg];
  else {
    targets = [];
    const cs = Math.cos(dir), sn = Math.sin(dir), half = (T.arc || 0) / 2 * Math.PI / 180;
    grid.near(p.x, p.y, range + 64, e => {
      if (e.dead) return;
      if (T.kind === 'arc') { if (inCone(e, p.x, p.y, dir, half, range)) targets.push(e); }
      else { const dx = e.x - p.x, dy = e.y - p.y, along = dx * cs + dy * sn, perp = Math.abs(-dx * sn + dy * cs); if (along > -e.r && along < range + e.r && perp < 11 + e.r) targets.push(e); }
    });
    if (!targets.length) targets = [tg];
  }
  FX({ k: T.kind === 'arc' ? 'swing' : 'thrust', x: p.x, y: p.y, dir, arc: (T.arc || 0) * Math.PI / 180, r: range, col: COL[w.el], life: T.kind === 'arc' ? .18 : .13, evo: w.evo });
  sfx('swing'); sfx('hit_' + w.el);
  for (const e of targets) strike(w, e, dir);
  return true;
}
function strike(w, e, dir) {
  let d = weaponDmg(w);
  const ti = sv('titan'); if (ti) d += tot.maxHp * ti / 100;
  if (w.evo && w.el === 'green') d += tot.maxHp * .03;
  S.hitN++;
  const tenth = rel('tenth') && S.hitN % 10 === 0;
  const crit = tenth || Math.random() * 100 < tot.crit;
  if (crit) { d *= tot.critMult + (tenth ? 1 : 0); S.punch = Math.min(1, S.punch + .3); sfx('crit'); puff(e.x, e.y, '#ffffff', 3, 120, .25); }
  const dealt = dmg(e, d, { col: COL[w.el], crit });
  if (tot.leech) heal(dealt * tot.leech / 100);
  if (Math.random() * 100 < tot.stun) stun(e, .6);
  knock(e, dir, TYPES[w.type].knock || Math.random() * 100 < tot.knock ? 30 : 3);
  // the element's own small effect
  if (w.el === 'red') {
    if (w.evo || Math.random() * 100 < E('red', 'ign')) burn(e, burnFrom(d));
    if (w.evo && Math.random() < .25) boom(e.x, e.y, boomR(55), d * .8, FIRE, { ignite: true, small: true });
  } else if (w.el === 'yellow') {
    if (Math.random() * 100 < E('yellow', 'arcCh')) chainFrom(e, .8, E('yellow', 'jumps') + sv('chain'));
    if (w.evo && Math.random() < .35) bolt(e, 1);
  } else if (w.el === 'blue') {
    if (Math.random() * 100 < E('blue', 'chillCh')) chill(e, (w.tier >= 2 ? 2 : 1) + (w.evo ? 1 : 0));
    if (w.evo && Math.random() < .12) freeze(e);
  }
  const hs = S.hk.hit;
  if (hs) for (const h of hs) { if (e.thralled) break; if (h.a.elHit && h.a.el !== w.el) continue; h.a.hit(h.a, h.s, w, e, d, dir); }
}
function updWeapons(dt) {
  const p = S.p;
  for (const w of S.weapons) {
    w.anim = Math.max(0, w.anim - dt * 6);
    w.cd -= dt * atkSpeed(w);
    if (w.cd <= 0) w.cd = weaponAttack(w) ? TYPES[w.type].cd * rnd(.95, 1.05) : .05;
    if (w.el === 'green') {
      w.sumT -= dt * E('green', 'srate') / 100;
      if (w.sumT <= 0) { w.sumT = SUM_CD; summonGolems(w.tier + (w.evo ? 1 : 0), p.x, p.y, 1 + sv('brood') + (rel('twin') ? 1 : 0)); }
    }
  }
}

// ---- golems: little copies of you with only an HP pool. They ram enemies and trade HP one-for-one (true damage);
// your inherited damage and crit make each point of their HP hit harder.
const bestEarthTier = () => S.weapons.reduce((m, w) => w.el === 'green' ? Math.max(m, w.tier + (w.evo ? 1 : 0)) : m, 0);
function golemHp(tier, mult) {
  const base = tier > 3 ? SUMHP[3] * 1.5 : SUMHP[tier];
  return (base * (1 + S.wave * .07) + tot.maxHp * .1 * tot.bond) * (E('green', 'shp') + sv('bark')) / 100 * (mult || 1);
}
function summonGolems(tier, x, y, n, mult) {
  const hp = golemHp(tier, mult), life = 8 * E('green', 'slife') / 100 * (mult > 1 ? 2 : 1), cap = E('green', 'scap');
  for (let i = 0; i < n; i++) {
    if (S.golems.length >= cap) break;
    const a = Math.random() * TAU;
    S.golems.push({ x: x + Math.cos(a) * 10, y: y + Math.sin(a) * 10, hp, maxHp: hp, life, vx: 0, vy: 0, a, hitCd: 0, big: mult > 1, seed: Math.random() * TAU });
  }
  sfx('summon');
  FX({ k: 'ring', x, y, r: mult > 1 ? 30 : 16, life: .3, col: COL.green });
}
function enthrall(e) {
  // the enemy defects: it becomes an ice thrall that rams its old friends
  e.dead = true; e.thralled = true;
  sfx('freeze');
  FX({ k: 'ring', x: e.x, y: e.y, r: e.r + 16, life: .5, col: ICE });
  if (S.golems.length < 70) S.golems.push({ x: e.x, y: e.y, hp: Math.max(5, e.hp), maxHp: Math.max(5, e.maxHp * .6), life: 12, vx: 0, vy: 0, a: 0, hitCd: .3, thrall: true, shape: e.shape, r: e.r, seed: 0 });
}
function golemContact(g, e) {
  const b = g.thrall ? 0 : tot.bond;
  let eff = 1 + b * tot.dmgPct / 100 + b * tot.flat / 20;
  const crit = Math.random() * 100 < tot.crit * b;
  if (crit) eff *= 1 + b * (tot.critMult - 1);
  const d = Math.min(g.hp * eff, e.hp);
  dmg(e, d, { col: g.thrall ? ICE : COL.green, tr: true, src: 'golem', crit });
  g.hp -= d / eff;
  sfx(g.thrall ? 'hit_blue' : 'hit_green');
  FX({ k: 'ring', x: g.x, y: g.y, r: g.big ? 18 : 10, life: .2, col: g.thrall ? ICE : COL.green });
  if (!g.thrall) emit('gHit', g, e, d);
}
function golemDied(g) {
  if (g.thrall) { FX({ k: 'pop', x: g.x, y: g.y, r: g.r, life: .3, col: ICE }); puff(g.x, g.y, '#e8f8ff', 6, 90, .4); return; }
  puff(g.x, g.y, '#8fae7a', 5, 80, .4);
  emit('gDie', g);
}
function moveGolem(g, dt, spd, tx, ty) {
  const dx = tx - g.x, dy = ty - g.y, d = Math.hypot(dx, dy) || 1;
  g.vx += (dx / d * spd - g.vx) * Math.min(1, dt * 7); g.vy += (dy / d * spd - g.vy) * Math.min(1, dt * 7);
  g.x += g.vx * dt; g.y += g.vy * dt;
}
function tryGolemHit(g, reach, cd) {
  if (g.hitCd > 0) return;
  let done = false;
  grid.near(g.x, g.y, reach + 64, e => {
    if (done || e.dead || g.hp <= 0) return;
    if (Math.hypot(e.x - g.x, e.y - g.y) < e.r + reach) { golemContact(g, e); g.hitCd = cd; done = true; }
  });
}
function updGolems(dt) {
  const p = S.p, spd = 210 * E('green', 'sspd') / 100;
  for (const g of S.golems) {
    g.life -= dt; g.hitCd -= dt;
    const tg = nearest(g.x, g.y, 600);
    if (tg) moveGolem(g, dt, g.thrall ? 150 : spd * (g.big ? .7 : 1), tg.x, tg.y);
    else { g.a += dt * 2; moveGolem(g, dt, spd, p.x + Math.cos(g.a) * 45, p.y + Math.sin(g.a) * 45); }
    tryGolemHit(g, g.thrall ? g.r : g.big ? 12 : 7, g.thrall ? .3 : .08);
  }
  const alive = [];
  for (const g of S.golems) { if (g.life > 0 && g.hp > .01) alive.push(g); else golemDied(g); }
  S.golems = alive;
  const c = S.colossus;
  if (c) {
    c.hitCd -= dt; c.hp = Math.min(c.maxHp, c.hp + c.maxHp * .08 * dt);
    const tg = nearest(p.x, p.y, 140);
    if (tg) moveGolem(c, dt, 160, tg.x, tg.y); else { c.a += dt * 1.2; moveGolem(c, dt, 160, p.x + Math.cos(c.a) * 40, p.y + Math.sin(c.a) * 40); }
    tryGolemHit(c, 16, .15);
    if (c.hp <= .01) { golemDied(c); S.colossus = null; S.colT = sv('treant') || 10; }
  }
}
