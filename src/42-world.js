// ===== the world: enemies, projectiles, zones, elemental summons, arena events
function spawnEnemy(type, x, y) {
  const d = ETYPES[type], w = S.wave;
  const hp = type === 'boss' ? BOSS_HP * hpMult(w) : d.hp * hpMult(w);   // boss = about 3x an elite brute
  if (x === undefined) { const a = Math.random() * TAU; x = Math.cos(a) * SPAWN_R; y = Math.sin(a) * SPAWN_R; }
  const e = {
    id: S.uid++, type, x, y, r: d.r, hp, maxHp: hp, armor: armorAt(w) * (d.arm || 1),
    spd: d.spd * spdMult(w) * rnd(.9, 1.1), dmg: d.dmg * dmgMult(w), gold: d.gold * (1 + w * .04), xp: d.xp,
    col: d.col, shape: d.shape, boss: type === 'boss', special: !!d.special, fixed: !!d.fixed, elite: false,
    atkCd: 0, hitT: 0, burnT: 0, burnDps: 0, burnTick: 0, chill: 0, chillT: 0, frozen: 0, stun: 0,
    summonT: 4, slamT: 5, wob: Math.random() * TAU, dead: false, mode: 'walk', modeT: 0, dashCd: rnd(1, 3), dx: 0, dy: 0, kx: 0, ky: 0, escT: 10,
    dnAcc: 0, dnT: 0, dnCol: '#fff', dnCrit: false,
  };
  S.enemies.push(e);
  return e;
}
function updSpawner(dt) {
  if (S.bossPending) { S.bossT -= dt; if (S.bossT <= 0) { S.bossPending = false; S.lastBossKey = bossKeyFor(S.wave); spawnBoss(S.lastBossKey); S.shake = 6; } }
  if (S.toSpawn <= 0) return;
  S.spawnT -= dt;
  if (S.spawnT > 0 || S.enemies.length >= (S.wave > 20 ? 150 : 110)) return;
  S.spawnT = Math.max(S.wave > 20 ? .07 : .12, 1.05 - S.wave * .045);
  const a = Math.random() * TAU, type = pickW(enemyPool(S.wave));
  const grp = Math.min(S.toSpawn, type === 'swarm' ? irnd(4, 6) : irnd(1, 2 + Math.floor(S.wave / 5)));
  for (let i = 0; i < grp; i++) { const aa = a + rnd(-.18, .18), rr = SPAWN_R + rnd(0, 30); spawnEnemy(type, Math.cos(aa) * rr, Math.sin(aa) * rr); }
  S.toSpawn -= grp;
}
function updEnemies(dt) {
  const p = S.p, slow = E('blue', 'slow') / 100, ff = rel('frostfire');
  const altarOn = S.enemies.some(e => e.type === 'altar' && !e.dead);
  for (const e of S.enemies) {
    if (e.dead) continue;
    e.hitT -= dt; e.atkCd -= dt; e.stun -= dt; e.frozen -= dt; e.wob += dt * 6;
    if (e.dnAcc > 0 && (e.dnT -= dt) <= 0) flushDn(e);
    if (e.chillT > 0) { e.chillT -= dt; if (e.chillT <= 0) e.chill = 0; }
    if (e.burnT > 0) {
      e.burnT -= dt; e.burnTick -= dt;
      if (e.burnTick <= 0) { e.burnTick = .5; const fx2 = syn('frostfire2') >= 0 && isCold(e) ? (syn('frostfire2') ? 2.5 : 1.5) : 1; dmg(e, e.burnDps * .5 * fx2, { col: '#ff8a4a', pierce: true, dot: true }); }
      if (Math.random() < .2 && S.pt.length < 400) S.pt.push({ x: e.x + rnd(-e.r, e.r), y: e.y + rnd(-e.r, e.r * .3), vx: rnd(-10, 10), vy: rnd(-55, -25), t: 0, life: .4, col: Math.random() < .5 ? '#ff7a2a' : '#ffc14a', sz: 2.5 });
      if (e.burnT <= 0) e.burnDps = 0;
      if (e.dead) continue;
    }
    const held = e.frozen > 0 || e.stun > 0;
    const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
    let vx = dx / d, vy = dy / d;
    let sm = (e.chill > 0 ? 1 - slow : 1) * ((ff || syn('frostfire2') >= 0) && e.burnT > 0 ? .7 : 1);
    let sp = held ? 0 : e.spd * sm * (altarOn && !e.special ? 1.35 : 1);
    if (e.fixed) {   // altars and eggs never move
      sp = 0; e.kx = e.ky = 0; if (e.ax === undefined) { e.ax = e.x; e.ay = e.y; } e.x = e.ax; e.y = e.ay;
      if (e.type === 'egg' && (e.hatchT -= dt) <= 0) { e.dead = true; puff(e.x, e.y, '#d9c7a0', 12, 120, .4); sfx('pop'); for (let i = 0; i < 5; i++) spawnEnemy('swarm', e.x + rnd(-14, 14), e.y + rnd(-14, 14)); spawnEnemy('runner', e.x, e.y); continue; }
    }
    else if (e.type === 'goblin') {
      // runs away from you around the inside of the circle, then escapes
      e.escT -= dt;
      const cl = Math.hypot(e.x, e.y) || 1;
      vx = -vx; vy = -vy;
      if (cl > R - 45) { vx -= e.x / cl * 1.2; vy -= e.y / cl * 1.2; const l = Math.hypot(vx, vy) || 1; vx /= l; vy /= l; }
      if (e.escT <= 0) { e.dead = true; banner('The goblin escaped!', true); puff(e.x, e.y, '#e0b84a', 10, 120, .5); continue; }
    } else if (e.type === 'charger') {
      e.dashCd -= dt;
      if (held) e.mode = 'walk';
      else if (e.mode === 'walk' && e.dashCd <= 0 && d < 240 && Math.hypot(e.x, e.y) < R + 10) { e.mode = 'wind'; e.modeT = .5; }
      else if (e.mode === 'wind') { sp = 0; e.modeT -= dt; e.dx = vx; e.dy = vy; if (e.modeT <= 0) { e.mode = 'dash'; e.modeT = .4; } }
      else if (e.mode === 'dash') { vx = e.dx; vy = e.dy; sp = 430 * sm; e.modeT -= dt; if (e.modeT <= 0) { e.mode = 'walk'; e.dashCd = rnd(2.2, 3.2); } }
    } else if (e.boss) {
      const mv = bossStep(e, dt, p, held);
      if (mv) { vx = mv.vx; vy = mv.vy; sp = mv.sp * sm; } else sp = 0;
    }
    e.x += vx * sp * dt + e.kx * Math.min(1, dt * 12); e.y += vy * sp * dt + e.ky * Math.min(1, dt * 12);
    e.kx *= Math.max(0, 1 - dt * 12); e.ky *= Math.max(0, 1 - dt * 12);
    const far = Math.hypot(e.x, e.y); if (far > SPAWN_R + 40) { e.x *= (SPAWN_R + 40) / far; e.y *= (SPAWN_R + 40) / far; }   // nothing gets lost outside
    if (!e.boss && !e.fixed) for (const b of S.walls) {
      const bx = e.x - b.x, by = e.y - b.y, bd = Math.hypot(bx, by) || 1, mn = e.r + b.r;
      if (bd < mn) { e.x = b.x + bx / bd * mn; e.y = b.y + by / bd * mn; }
    }
    if (!held && !(e.reviveT > 0) && e.dmg > 0 && d < e.r + PR && e.atkCd <= 0) { e.atkCd = .9; thorns(e); hurt(e.dmg, e); if (S.phase !== 'fight') return; }
  }
  // keep enemies from stacking, and let fire jump between touching enemies
  S.spreadT -= dt;
  const doSpread = S.spreadT <= 0, spreadCh = E('red', 'spread');
  if (doSpread) S.spreadT = .3;
  for (const a of S.enemies) {
    if (a.dead) continue;
    grid.near(a.x, a.y, a.r + 70, b => {
      if (b.id <= a.id || b.dead) return;
      const dx = b.x - a.x, dy = b.y - a.y, min = a.r + b.r;
      if (dx > min + 6 || dx < -min - 6 || dy > min + 6 || dy < -min - 6) return;
      const d = Math.hypot(dx, dy);
      if (doSpread && d < min + 6 && (a.burnT > 0) !== (b.burnT > 0) && Math.random() * 100 < spreadCh) { const src = a.burnT > 0 ? a : b, dst = src === a ? b : a; burn(dst, src.burnDps); puff(dst.x, dst.y, '#ffb347', 2, 60, .3); }
      if (d > 0 && d < min) { const k = (min - d) / d * .25, wa = a.fixed ? 0 : a.boss ? .05 : 1, wb = b.fixed ? 0 : b.boss ? .05 : 1; a.x -= dx * k * wa; a.y -= dy * k * wa; b.x += dx * k * wb; b.y += dy * k * wb; }
    });
  }
  // telegraphed enemy attacks
  for (const t of S.tele) {
    t.t += dt;
    if (t.t < t.life || t.done) continue;
    t.done = true;
    if (!t.line) { FX({ k: 'boom', x: t.x, y: t.y, r: t.r, life: .4, col: '#ff3b4e' }); S.shake = Math.min(12, S.shake + 4); sfx('boom', 1.2); }
    if (t.dmg > 0 && !t.line && Math.hypot(p.x - t.x, p.y - t.y) < t.r + PR) hurt(t.dmg, null);
    if (t.done2) t.done2();
    if (S.phase !== 'fight') return;
  }
  updBossHazards(dt);
  S.tele = S.tele.filter(t => !t.done);
}

function updProjectiles(dt) {
  const p = S.p;
  for (const f of S.projs) {
    f.x += f.vx * dt; f.y += f.vy * dt; f.life -= dt;
    if (f.k === 'fireball') {
      if (S.pt.length < 400) S.pt.push({ x: f.x, y: f.y, vx: rnd(-25, 25), vy: rnd(-25, 25), t: 0, life: .3, col: '#ff9a3c', sz: 3 });
      let hit = false; grid.near(f.x, f.y, 72, e => { if (!hit && !e.dead && Math.hypot(e.x - f.x, e.y - f.y) < e.r + 8) hit = true; });
      if (hit) { f.life = 0; boom(f.x, f.y, f.rad, f.dmg, FIRE, { ignite: true }); }
    } else if (f.k === 'boulder') {
      f.rot += dt * 8;
      if (Math.random() < .4) puff(f.x, f.y, '#8a7350', 1, 40, .4);
      grid.near(f.x, f.y, 80, e => {
        if (e.dead || f.hit.has(e) || Math.hypot(e.x - f.x, e.y - f.y) >= e.r + 15) return;
        f.hit.add(e); dmg(e, f.dmg, { col: ROCK }); stun(e, .3); knock(e, Math.atan2(f.vy, f.vx) + (Math.random() < .5 ? 1.57 : -1.57), 20);
      });
    } else {
      const ice = f.k === 'shard';
      grid.near(f.x, f.y, 70, e => {
        if (f.life <= 0 || e.dead || f.hit.has(e) || Math.hypot(e.x - f.x, e.y - f.y) >= e.r + 5) return;
        f.hit.add(e); dmg(e, f.dmg, { col: ice ? ICE : ROCK });
        if (ice) chill(e, 1); else if (f.pierce-- <= 0) f.life = 0;
      });
    }
  }
  S.projs = S.projs.filter(f => f.life > 0);
  for (const fl of S.flames) {
    fl.t += dt; fl.tick -= dt;
    const tg = nearest(p.x, p.y, fl.rg + 40);
    if (tg) fl.dir += clamp(angDiff(Math.atan2(tg.y - p.y, tg.x - p.x), fl.dir), -3 * dt, 3 * dt);
    for (let i = 0; i < 3 && S.pt.length < 480; i++) { const a = fl.dir + rnd(-.5, .5), sp = rnd(180, 320); S.pt.push({ x: p.x + Math.cos(a) * 14, y: p.y + Math.sin(a) * 14, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0, life: fl.rg / 320, col: pick(['#ff7a2a', '#ffb347', '#ff5a3c']), sz: rnd(3, 6) }); }
    if (fl.tick <= 0) { fl.tick = .15; eachNear(p.x, p.y, fl.rg, e => { if (inCone(e, p.x, p.y, fl.dir, .55, fl.rg)) { dmg(e, fl.dmg, { col: COL.red }); burn(e, burnFrom(fl.dmg * 3)); } }); }
  }
  S.flames = S.flames.filter(f => f.t < f.dur);
  for (const rg of S.rings) {
    rg.r += rg.spd * dt;
    grid.near(rg.x, rg.y, rg.r + 80, e => { if (e.dead || rg.hit.has(e)) return; if (Math.abs(Math.hypot(e.x - rg.x, e.y - rg.y) - rg.r) < 12 + e.r) { rg.hit.add(e); dmg(e, rg.dmg, { col: COL.red }); burn(e, burnFrom(rg.dmg)); } });
  }
  S.rings = S.rings.filter(rg => rg.r < rg.max);
  for (const z of S.zones) {
    z.life -= dt; z.tick -= dt;
    if (z.k === 'snow' && Math.random() < .6 && S.pt.length < 480) S.pt.push({ x: z.x + rnd(-z.r, z.r), y: z.y + rnd(-z.r, z.r), vx: rnd(-60, -20), vy: rnd(20, 60), t: 0, life: .5, col: '#e8f8ff', sz: 2 });
    if (z.tick > 0) continue;
    z.tick = .3;
    if (z.k === 'storm') { z.tick = z.int; const inside = []; eachNear(z.x, z.y, z.r, e => inside.push(e)); if (inside.length) bolt(pick(inside), 1, { noChain: true }); }
    else if (z.k === 'fire') eachNear(z.x, z.y, z.r, e => { dmg(e, z.dps * .3, { col: COL.red, pierce: true }); burn(e, burnFrom(z.dps)); });
    else eachNear(z.x, z.y, z.r, e => { dmg(e, z.dps * .3, { col: COL.blue }); chill(e, 1); });
  }
  S.zones = S.zones.filter(z => z.life > 0);
  for (const pi of S.pillars) { pi.life -= dt; pi.tick -= dt; if (pi.tick <= 0) { pi.tick = .4; eachNear(pi.x, pi.y, pi.r, e => { chill(e, 1); dmg(e, S.avg * .1, { col: COL.blue }); }); } }
  S.pillars = S.pillars.filter(pi => pi.life > 0);
  for (const o of S.orbs) {
    o.life -= dt; o.tick -= dt;
    const tg = nearest(o.x, o.y, 500);
    if (tg) { const a = Math.atan2(tg.y - o.y, tg.x - o.x); o.x += Math.cos(a) * 85 * dt; o.y += Math.sin(a) * 85 * dt; }
    if (o.tick <= 0) { o.tick = .3; const hit = new Set(); for (let i = 0; i < 3; i++) { const e = nearest(o.x, o.y, 75, hit); if (!e) break; hit.add(e); bolt(e, o.mult, { from: o, noChain: true }); } }
  }
  S.orbs = S.orbs.filter(o => o.life > 0);
  for (const rd of S.rods) { rd.life -= dt; rd.tick -= dt; if (rd.tick <= 0) { rd.tick = rd.int; const e = nearest(rd.x, rd.y, 110); if (e) bolt(e, 1, { from: { x: rd.x, y: rd.y - 22 } }); } }
  S.rods = S.rods.filter(rd => rd.life > 0);
}

// ---- elemental summons: fire sprites, storm spirits, frost wizards, ice walls
function updSummons(dt) {
  const p = S.p;
  for (const sp of S.sprites) {
    sp.life -= dt;
    if (sp.state === 'walk') {
      const tg = nearest(sp.x, sp.y, 700);
      let tx = p.x + Math.cos(sp.a) * 40, ty = p.y + Math.sin(sp.a) * 40; sp.a += dt;
      if (tg) { tx = tg.x; ty = tg.y; }
      const dx = tx - sp.x, dy = ty - sp.y, d = Math.hypot(dx, dy) || 1;
      sp.x += dx / d * 75 * dt; sp.y += dy / d * 75 * dt;
      if (tg && d < 110) { sp.state = 'leap'; sp.vx = dx / d * 430; sp.vy = dy / d * 430; sp.lt = .45; sfx('whoosh'); }
    } else {
      sp.x += sp.vx * dt; sp.y += sp.vy * dt; sp.lt -= dt;
      if (S.pt.length < 480) S.pt.push({ x: sp.x, y: sp.y, vx: rnd(-30, 30), vy: rnd(-30, 30), t: 0, life: .3, col: '#ffb347', sz: 3 });
      let hit = sp.lt <= 0; if (!hit) grid.near(sp.x, sp.y, 72, e => { if (!e.dead && Math.hypot(e.x - sp.x, e.y - sp.y) < e.r + 7) hit = true; });
      if (hit) { boom(sp.x, sp.y, sp.r, sp.dmg, FIRE, { ignite: true }); sp.life = 0; }
    }
  }
  S.sprites = S.sprites.filter(sp => sp.life > 0);
  for (const sp of S.spirits) {
    sp.life -= dt;
    if (sp.state !== 'walk') continue;
    const tg = nearest(sp.x, sp.y, 700);
    if (!tg) continue;
    const dx = tg.x - sp.x, dy = tg.y - sp.y, d = Math.hypot(dx, dy) || 1;
    sp.x += dx / d * 90 * dt; sp.y += dy / d * 90 * dt;
    if (d < 130) {
      sp.state = 'cast'; sp.life = sp.n * .13 + .35;
      for (let i = 0; i < sp.n; i++) later(i * .13, () => { const t = nearest(sp.x, sp.y, 170); if (t) bolt(t, 1, { from: { x: sp.x, y: sp.y - 12 } }); });
    }
  }
  S.spirits = S.spirits.filter(sp => sp.life > 0);
  for (const w of S.wizards) {
    w.life -= dt; w.tick -= dt; w.ptick -= dt; w.a += dt * .8;
    w.x += (p.x + Math.cos(w.a) * 55 - w.x) * Math.min(1, dt * 4); w.y += (p.y + Math.sin(w.a) * 55 - w.y) * Math.min(1, dt * 4);
    if (w.tick > 0) continue;
    w.tick = 1.2;
    const tg = nearest(w.x, w.y, 230);
    if (!tg) continue;
    FX({ k: 'icebeam', x1: w.x, y1: w.y - 14, x2: tg.x, y2: tg.y, life: .25 });
    FX({ k: 'ring', x: tg.x, y: tg.y, r: 60, life: .35, col: ICE });
    sfx('hit_blue');
    eachNear(tg.x, tg.y, 60, e => { chill(e, 2); dmg(e, S.avg * .3, { col: COL.blue }); });
    if (w.ptick <= 0) { w.ptick = 4; addPillar(tg.x, tg.y, 4, 55); }
  }
  S.wizards = S.wizards.filter(w => w.life > 0);
  for (const b of S.walls) { b.life -= dt; b.tick -= dt; if (b.tick <= 0) { b.tick = .4; eachNear(b.x, b.y, b.r + 10, e => { chill(e, 1); dmg(e, S.avg * .2, { col: COL.blue }); }); } }
  S.walls = S.walls.filter(b => b.life > 0);
}

// ---- arena events
function scheduleEvents() {
  S.sched = []; S.buff = null; S.evClock = 0;
  if (S.wave < 3) return;
  const n = (Math.random() < .75 ? 1 : 0) + (S.wave >= 8 && Math.random() < .45 ? 1 : 0) + (S.wave >= 16 && Math.random() < .35 ? 1 : 0);
  const pool = [['shrine', 3], ['goblin', 2], ['spring', 1.4], ['cache', 2]];
  if (S.wave >= 7) pool.push(['elite', 1.5]);
  if (S.wave >= 6) pool.push(['altar', 1.2]);
  for (let i = 0; i < n; i++) S.sched.push({ t: rnd(4, 14) + i * 5, type: pickW(pool) });
}
function arenaSpot(minD) {
  for (let i = 0; i < 30; i++) { const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * R * .72, x = Math.cos(a) * r, y = Math.sin(a) * r; if (Math.hypot(x - S.p.x, y - S.p.y) > minD) return { x, y }; }
  return { x: -S.p.x * .6, y: -S.p.y * .6 };
}
function triggerEvent(type) {
  let msg = '';
  if (type === 'shrine') { const b = pick(BUFFS); S.evs.push({ k: 'shrine', ...arenaSpot(90), life: 12, prog: 0, buff: b }); msg = `A shrine of ${b.name} appears — stand in it`; }
  else if (type === 'spring') { S.evs.push({ k: 'spring', ...arenaSpot(60), life: 9, r: 42 }); msg = 'A healing spring bubbles up'; }
  else if (type === 'cache') { S.evs.push({ k: 'cache', ...arenaSpot(90), life: 15 }); msg = 'A supply cache crashed down!'; }
  else if (type === 'goblin') { const a = Math.random() * TAU; spawnEnemy('goblin', Math.cos(a) * (R - 30), Math.sin(a) * (R - 30)); msg = 'A treasure goblin! Catch it before it escapes'; }
  else if (type === 'elite') {
    const e = spawnEnemy(pick(S.wave >= 7 ? ['grunt', 'brute', 'charger', 'runner'] : ['grunt', 'brute', 'runner']));
    e.elite = true; e.hp *= 4; e.maxHp *= 4; e.dmg *= 1.25; e.r *= 1.4; e.armor += 2; e.xp *= 8; e.gold *= 5;
    msg = 'An elite enemy has entered the circle';
  } else if (type === 'altar') { const sp = arenaSpot(110); spawnEnemy('altar', sp.x, sp.y); msg = 'A cursed altar hastens the horde — destroy it!'; }
  banner(msg, true);
  sfx('event');
}
function updEvents(dt) {
  const p = S.p;
  S.evClock += dt;
  if (S.toSpawn > 0 || S.enemies.length > 0) for (const ev of S.sched) if (!ev.done && S.evClock >= ev.t) { ev.done = true; triggerEvent(ev.type); }
  for (const ev of S.evs) {
    ev.life -= dt;
    const d = Math.hypot(ev.x - p.x, ev.y - p.y);
    if (ev.k === 'shrine') {
      if (d < 34) { ev.prog += dt; if (ev.prog >= 2.5) { S.buff = ev.buff; ev.life = 0; sfx('level'); banner(`${ev.buff.name}: ${ev.buff.desc}`, true); FX({ k: 'boom', x: ev.x, y: ev.y, r: 60, life: .5, col: ev.buff.col }); } }
      else ev.prog = Math.max(0, ev.prog - dt * .5);
    } else if (ev.k === 'spring') { if (d < ev.r) heal(tot.maxHp * .12 * dt); }
    else if (ev.k === 'cache' && d < 26) {
      ev.life = 0; sfx('buy');
      const g = (10 + S.wave * 4) * GOLD_RATE * (1 + ((S.buff && S.buff.greed) || 0));
      for (let i = 0; i < 8; i++) addDrop('gold', g / 8, ev.x, ev.y);
      for (let i = 0; i < 4; i++) addDrop('xp', (5 + S.wave) / 4, ev.x, ev.y);
    }
  }
  S.evs = S.evs.filter(ev => ev.life > 0);
}
