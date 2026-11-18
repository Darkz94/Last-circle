// ===== weapons (melee, auto-attacking) and golems
const wName = w => `${w.evo ? EVO[w.el] : ADJ[w.el]} ${TYPES[w.type].n}`;
// Earth weapons borrow a share of your thorn stats: 25%, or more with Thornblades (never 100%)
const thornShare = w => w.el === 'green' && tot.thornFlat > 0 ? (sv('brood') || 25) / 100 : 0;
function weaponDmg(w) {
  let d = (TYPES[w.type].dmg * TM[w.tier] * (w.evo ? 1.5 : w.fused ? 1.35 : 1) + tot.flat + tot.thornFlat * thornShare(w)) * (1 + tot.dmgPct / 100);
  if (w.el === 'yellow') d *= YEL_DMG;
  if (S.buff && S.buff.dmg) d *= 1 + S.buff.dmg;
  return d;
}
const avgDmg = () => S.weapons.reduce((s, w) => s + weaponDmg(w), 0) / Math.max(1, S.weapons.length);
const surgeM = () => 1 + S.surge.n * sv('surge') / 100;
function atkSpeed(w) {
  let m = (1 + tot.atkSpd / 100) * surgeM() * (1 + ((S.buff && S.buff.atk) || 0)) * (1 + (rel('blood') ? S.blood / 100 : 0)) * (S.ot || 1);   // Overtime speeds you up too
  if (w.el === 'yellow') m *= YEL_SPD + (E('yellow', 'lspd') + sv('current')) / 100;
  return m;
}
function weaponAttack(w) {
  const T = TYPES[w.type], p = S.p, range = T.range * tot.rangeM;
  const tg = nearest(p.x, p.y, range, null, true);
  if (!tg) return false;
  let dir = Math.atan2(tg.y - p.y, tg.x - p.x);
  // swords alternate: a stab at the nearest enemy, then a slash aimed at the biggest group in reach
  let kind = T.kind;
  if (w.type === 'sword') {
    w.alt = !w.alt;
    if (w.alt) kind = 'stab';
    else { let best = tg, bn = -1; grid.near(p.x, p.y, range + 40, e => { if (e.dead || Math.hypot(e.x - p.x, e.y - p.y) > range + e.r) return; let n = 0; grid.near(e.x, e.y, 70, o => { if (!o.dead && Math.hypot(o.x - e.x, o.y - e.y) < 60) n++; }); if (n > bn) { bn = n; best = e; } }); dir = Math.atan2(best.y - p.y, best.x - p.x); }
  }
  w.anim = 1; w.dir = dir;
  let targets;
  if (kind === 'stab') targets = [tg];
  else {
    targets = [];
    const cs = Math.cos(dir), sn = Math.sin(dir), half = (T.arc || 0) / 2 * Math.PI / 180;
    grid.near(p.x, p.y, range + 64, e => {
      if (e.dead) return;
      if (kind === 'arc') { if (inCone(e, p.x, p.y, dir, half, range)) targets.push(e); }
      else { const dx = e.x - p.x, dy = e.y - p.y, along = dx * cs + dy * sn, perp = Math.abs(-dx * sn + dy * cs); if (along > -e.r && along < range + e.r && perp < 11 + e.r) targets.push(e); }
    });
    if (!targets.length) targets = [tg];
  }
  FX({ k: kind === 'arc' ? 'swing' : 'thrust', x: p.x, y: p.y, dir, arc: (T.arc || 0) * Math.PI / 180, r: range, col: COL[w.el], life: kind === 'arc' ? .18 : .13, evo: w.evo });
  sfx('swing'); sfx('hit_' + w.el);
  // spears: the first enemy in the line takes 130%, each one behind it 40% less than the last
  if (w.type === 'spear' && targets.length > 1) targets.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
  const area = targets.length > 1 || kind === 'arc';   // counts as area damage for enemy resistances
  targets.forEach((e, i) => strike(w, e, dir, w.type === 'spear' ? 1.3 * Math.pow(.6, i) : 1, area && !(w.type === 'spear' && i === 0)));
  return true;
}
function strike(w, e, dir, mult, aoe) {
  let d = weaponDmg(w) * (mult || 1);
  const ty = w.type, spreadM = ty === 'axe' ? 1.5 : 1;   // Status spreader: axes apply their element 50% more often
  if (ty === 'spear' && Math.hypot(e.x - S.p.x, e.y - S.p.y) - e.r > TYPES.spear.range * tot.rangeM * .55) d *= 1.25;   // Reach
  if (ty === 'sword') d *= 1.15;   // Balanced
  const ti = sv('titan'); if (ti) d += tot.maxHp * ti / 100;
  if (w.evo && w.el === 'green') d += tot.maxHp * .03;
  S.hitN++;
  const tenth = rel('tenth') && S.hitN % 10 === 0;
  const tk = thornShare(w);
  const crit = tenth || Math.random() * 100 < tot.crit + tot.thornCrit * tk;
  if (crit) { d *= tot.critMult + (tot.thornCritM - 1) * tk + (tenth ? 1 : 0); S.punch = Math.min(1, S.punch + .3); sfx('crit'); puff(e.x, e.y, '#ffffff', 3, 120, .25); }
  const dealt = dmg(e, d, { col: COL[w.el], crit, src: 'weapon', pen: tot.thornPen * tk, aoe });
  S.rs.wt[ty] = (S.rs.wt[ty] || 0) + dealt; if (crit) S.rs.crits++;
  if (tot.leech) heal(dealt * tot.leech / 100);
  if (ty === 'dagger' && !e.dead) {
    // Bleed: every 5th dagger stab on the same enemy deals 30% of the last 5 stabs again, instantly
    const b = e.dg || (e.dg = { n: 0, sum: 0 }); b.n++; b.sum += dealt;
    if (b.n >= 5) { const bd = b.sum * .3; b.n = 0; b.sum = 0; dmg(e, bd, { tr: true, col: '#d0213f', src: 'bleed' }); puff(e.x, e.y, '#b0102c', 5, 110, .35); }
  }
  if (Math.random() * 100 < tot.stun) stun(e, .6);
  knock(e, dir, TYPES[w.type].knock || Math.random() * 100 < tot.knock ? 30 : 3);
  // the element's own small effect
  if (w.el === 'red') {
    if (w.evo || Math.random() * 100 < E('red', 'ign') * spreadM) burn(e, burnFrom(dealt));
    if (w.evo && Math.random() < .25) boom(e.x, e.y, boomR(55), d * .8, FIRE, { small: true });
  } else if (w.el === 'yellow') {
    if (Math.random() * 100 < E('yellow', 'strikeCh') * spreadM) bolt(e, 1, { pct: true });
    if (w.evo && Math.random() < .35) bolt(e, 1, { pct: true });
  } else if (w.el === 'blue') {
    if (Math.random() * 100 < E('blue', 'chillCh') * spreadM) chill(e, (w.tier >= 2 ? 2 : 1) + (w.evo ? 1 : 0));
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
  }
}

// ---- golems: little copies of you with only an HP pool. They ram enemies and trade HP one-for-one (true damage);
// your inherited damage and crit make each point of their HP hit harder.
const bestEarthTier = () => S.weapons.reduce((m, w) => w.el === 'green' ? Math.max(m, w.tier + (w.evo ? 1 : 0)) : m, 0);
function golemHp(tier, mult) {
  const base = tier > 3 ? SUMHP[3] * 1.5 : SUMHP[tier];
  return (base * (1 + S.wave * .045) + tot.maxHp * .1 * tot.bond) * (E('green', 'shp') + sv('bark')) / 100 * (mult || 1) * (syn('livingstorm') >= 0 ? 2 : 1);
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
  // bosses and elites shrug off part of a golem's charge (the golem still spends its full HP)
  const tough = e.boss ? .4 : e.elite ? .6 : 1;
  const d = Math.min(g.hp * eff * tough, e.hp);
  dmg(e, d, { col: g.thrall ? ICE : COL.green, tr: true, src: 'golem', crit });
  g.hp -= d / eff / tough;
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
  const p = S.p, spd = 210 * E('green', 'sspd') / 100 * (syn('livingstorm') >= 0 ? 1.3 : 1);
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
