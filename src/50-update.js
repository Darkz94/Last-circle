// ===== the run loop: waves, one fixed-size simulation step, and the flow between fights and menus
const keys = new Set();
const joy = { on: false, ox: 0, oy: 0, x: 0, y: 0, id: null };

function startWave() {
  S.lockedOffers = S.shopLocked ? S.offers.slice() : null;
  S.wave++;
  S.phase = 'fight';
  const p = S.p;
  p.x = 0; p.y = 0; p.hp = tot.maxHp; p.inv = 1; p.shield = 0;
  for (const k of WAVE_LISTS) S[k] = [];
  S.timers = {}; S.colossus = null; S.colT = 1; S.surge = { n: 0, t: 0 }; S.beam = null;
  S.phoenixUsed = false; S.windUsed = false; S.blood = 0; S.collectT = null; S.hitstop = 0; S.hurtFlash = 0;
  for (const w of S.weapons) { w.sumT = 1; w.cd = rnd(0, .3); }
  const boss = S.wave % 10 === 0;
  S.toSpawn = Math.round(waveCount(S.wave) * (boss ? .55 : 1));
  S.spawnT = 1.2; S.bossPending = boss; S.bossT = 2.5;
  scheduleEvents();
  banner(boss ? `Wave ${S.wave} — The Hollow King` : S.wave === 21 ? 'Wave 21 — beyond the circle' : `Wave ${S.wave}`);
  AU.wave = S.wave;
  sfx(boss ? 'boss' : S.wave > 20 ? 'endless' : 'wave');
  hideScreen();
  saveRun();
}

function updPlayer(dt) {
  const p = S.p;
  let mx = 0, my = 0;
  if (keys.has('w') || keys.has('arrowup')) my--;
  if (keys.has('s') || keys.has('arrowdown')) my++;
  if (keys.has('a') || keys.has('arrowleft')) mx--;
  if (keys.has('d') || keys.has('arrowright')) mx++;
  if (joy.on) { const jx = joy.x - joy.ox, jy = joy.y - joy.oy, jl = Math.hypot(jx, jy); if (jl > 6) { mx = jx / Math.max(jl, 50); my = jy / Math.max(jl, 50); } }
  const ml = Math.hypot(mx, my); if (ml > 1) { mx /= ml; my /= ml; }
  S.moving = ml > .1;
  if (S.moving) p.face = Math.atan2(my, mx);
  const spd = tot.baseSpeed * surgeM() * (1 + ((S.buff && S.buff.spd) || 0));
  p.x += mx * spd * dt; p.y += my * spd * dt;
  const pl2 = Math.hypot(p.x, p.y); if (pl2 > R - PR) { p.x *= (R - PR) / pl2; p.y *= (R - PR) / pl2; }
  p.inv -= dt; p.shield = Math.max(0, p.shield - dt);
  S.staticCd -= dt; S.novaCd -= dt;
  heal((tot.regen + ((S.buff && S.buff.regen) || 0)) * dt);
  if (S.surge.t > 0) { S.surge.t -= dt; if (S.surge.t <= 0) S.surge.n = 0; }
}
function updMods(dt) {
  S.beam = null;
  const hs = S.hk.fire, rate = rel('clock') ? 1.25 : 1, echo = rel('echo');
  if (hs) for (const h of hs) {
    const a = h.a, cd = a.cd || a.v[h.s];
    let t = S.timers[a.id]; if (t === undefined) t = cd * .5;
    t -= dt * rate;
    if (t <= 0) { t = cd; a.fire(a, h.s); if (echo && !a.cd && Math.random() < .2) later(.3, () => a.fire(a, h.s)); }
    S.timers[a.id] = t;
  }
  const fs = S.hk.frame; if (fs) for (const h of fs) h.a.frame(h.a, h.s, dt);
}
function updFx(dt) {
  for (const f of S.fx) f.t += dt;
  S.fx = S.fx.filter(f => f.t < f.life);
  for (const q of S.pt) { q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 1 - dt * 2; q.vy *= 1 - dt * 2; }
  S.pt = S.pt.filter(q => q.t < q.life);
  for (const t of S.texts) { t.t += dt; t.y -= 34 * dt; }
  S.texts = S.texts.filter(t => t.t < .8);
  S.shake = Math.max(0, S.shake - dt * 30);
  S.punch = Math.max(0, S.punch - dt * 5);
  S.hurtFlash = Math.max(0, (S.hurtFlash || 0) - dt);
  if (S.banner) { S.banner.t += dt; if (S.banner.t > 2.4) S.banner = null; }
}

function step(dt) {
  if (S.hitstop > 0) { S.hitstop -= dt; updFx(dt * .2); return; }   // freeze-frame on heavy impacts
  S.time += dt;
  S.avg = avgDmg();
  grid.build(S.enemies);
  updPlayer(dt);
  updSpawner(dt);
  for (const l of S.later) { l.t -= dt; if (l.t <= 0 && !l.done) { l.done = true; l.f(); } }
  S.later = S.later.filter(l => !l.done);
  updWeapons(dt);
  updMods(dt);
  updProjectiles(dt);
  updSummons(dt);
  updEvents(dt);
  updEnemies(dt);
  if (S.phase !== 'fight') return;
  updGolems(dt);
  processDeaths();
  updDrops(dt);
  updFx(dt);
  if (S.toSpawn <= 0 && !S.bossPending && S.enemies.length === 0) {
    // short window to grab what's on the floor; the rest is lost
    if (S.collectT === null) S.collectT = S.drops.length ? 3 : 0;
    S.collectT -= dt;
    if (S.collectT <= 0 || S.drops.length === 0) endWave();
  }
}

function endWave() {
  const lost = { gold: 0, xp: 0 };
  for (const d of S.drops) lost[d.k] += d.v;
  S.lastLost = lost.gold >= 1 || lost.xp >= 1 ? { gold: Math.floor(lost.gold), xp: Math.floor(lost.xp) } : null;
  S.drops = []; S.golems = []; S.colossus = null;
  S.gold += 4 + S.wave * 2;
  if (S.wave % 10 === 0) S.pendingRelic++;
  saveBest();
  nextMenu();
}
// after a wave: relic (after bosses) -> level-ups -> shop
function nextMenu() {
  const resumed = S.resumed; S.resumed = null;
  if (S.pendingRelic > 0) {
    S.phase = 'relic';
    if (!S.relicOffer) { const pool = shuffle(RELICS.filter(r => !S.relicOn[r.id])).slice(0, 3); S.relicOffer = pool.map(r => r.id); }
    if (S.relicOffer.length) { renderRelic(); return; }
    S.pendingRelic = 0; S.relicOffer = null;
  }
  if (S.pendingLv > 0) {
    S.phase = 'levelup';
    if (!(resumed === 'levelup' && S.perkOffer)) { S.perkOffer = rollLevelCards(); S.lvRerolls = 1 + S.lvRerollBuys; }
    renderLevelUp(); return;
  }
  S.phase = 'shop';
  if (S.shopWave !== S.wave) {
    S.shopWave = S.wave; S.rerolls = 0; UI.tab = 'shop';
    if (S.lockedOffers) { S.offers = S.lockedOffers; S.lockedOffers = null; } else S.offers = rollOffers();
    S.shopLocked = false;
  }
  S.rerollCost = rerollPrice();
  renderShop();
}

// ---- level-up cards: an element upgrade (main) plus a basic stat (bonus)
function eligible(c) { return EPASS[c].filter(d => (!d.req || S.runSets[c].some(a => d.req.includes(a.id))) && E(c, d.k) < d.cap - 1e-9); }
function statCard(pr) {
  const rare = Math.random() < .18;
  let pv = pr.v * (rare ? 1.6 : 1);
  if (pr.k === 'flat') pv = Math.round((pr.v + Math.floor(S.wave / 5)) * (rare ? 1.5 : 1));
  else if (pr.k === 'regen') pv = Math.round(pv * 10) / 10;
  else pv = Math.round(pv);
  return { pr, pv, rare };
}
function rollLevelCards() {
  const cards = [], used = new Set();
  for (const lc of S.lockedCards) if (cards.length < 3) { cards.push({ ...lc, locked: true }); if (lc.el) used.add(lc.el.c + lc.el.d.k); }
  S.lockedCards = [];
  const stats = shuffle([...PRIM]);
  while (cards.length < 3) {
    const free = c => eligible(c).filter(d => !used.has(c + d.k));
    const opts = ORDER.filter(c => free(c).length).map(c => [c, (S.counts[c] || 0) * 1.5 + .5]);
    let el = null;
    if (opts.length) { const c = pickW(opts), d = pick(free(c)); used.add(c + d.k); el = { c, d }; }
    cards.push({ el, ...statCard(stats[cards.length]) });
  }
  return cards;
}
function choosePerk(i) {
  const c = S.perkOffer && S.perkOffer[i];
  if (!c) return;
  sfx('click');
  S.st[c.pr.k] += c.pv;
  if (c.el) S.ep[c.el.c][c.el.d.k] = (S.ep[c.el.c][c.el.d.k] || 0) + c.el.d.v;
  S.lockedCards = S.perkOffer.filter((x, j) => j !== i && x.locked).map(x => ({ ...x, locked: false }));
  S.perkOffer = null;
  S.pendingLv--;
  recalc();
  if (c.pr.k === 'maxHp') S.p.hp = tot.maxHp;
  nextMenu();
}
function takeRelic(id) {
  if (!S.relicOffer || !S.relicOffer.includes(id)) return;
  S.relics.push(id); codexSee('rel', id);
  S.pendingRelic--; S.relicOffer = null;
  sfx('relic');
  recalc(); S.p.hp = tot.maxHp;
  nextMenu();
}
function gameOver() {
  S.phase = 'dead'; S.p.hp = 0;
  saveBest(); clearSave();
  sfx('death');
  renderDead();
}
function musicMode() {
  if (!S) return 'calm';
  if (S.phase === 'dead') return null;
  if (S.phase !== 'fight') return 'calm';
  if (S.bossPending || S.enemies.some(e => e.boss)) return 'boss';
  return S.wave > 20 ? 'endless' : 'fight';
}
