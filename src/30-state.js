// ===== state: one run lives in S. Totals (tot) are derived from weapons, sets, relics and level-ups by recalc().
let S = null, paused = false, pendingRun = null;
const tot = {};
const UI = { tab: 'shop', stab: 'play', ptab: 'menu' };
const CODEX = LS.get('lcCodex', { ab: {}, rel: {} });
if (!CODEX.syn) CODEX.syn = {};
function codexSee(kind, id) { if (!CODEX[kind][id]) { CODEX[kind][id] = 1; LS.set('lcCodex', CODEX); return true; } return false; }
const bestWave = () => +LS.get('lastCircleBest3', 0) || 0;
function saveBest() { if (S.wave > bestWave()) LS.set('lastCircleBest3', S.wave); }

// weighted stat rolls: a weapon type's favoured stats are 3x as likely (swords have no favourites)
function rollStats(type, n) {
  const fav = (type && TYPES[type].fav) || [], pool = STAT_KEYS.map(k => [k, fav.includes(k) ? 3 : 1]), out = [];
  while (out.length < n && pool.length) { let r = Math.random() * pool.reduce((a, p) => a + p[1], 0), i = 0; while ((r -= pool[i][1]) > 0) i++; out.push(pool[i][0]); pool.splice(i, 1); }
  return out;
}
const rollAffixes = type => rollStats(type, 2);
const makeWeapon = (type, el, tier) => ({ type, el, tier, afx: rollAffixes(type) });
function rollRun() {
  const sets = {}, tsets = {};
  for (const c of ORDER) sets[c] = shuffle([...ABIL[c]]).slice(0, 3);
  for (const t of TYPE_KEYS) tsets[t] = rollStats(t, 3);
  const types = shuffle([...TYPE_KEYS]);
  return { sets, tsets, syn: rollSyn(), bosses: rollBosses(), starters: ORDER.map((c, i) => makeWeapon(types[i], c, 0)) };
}

const WAVE_LISTS = ['haz', 'eorbs', 'vents', 'enemies', 'golems', 'projs', 'flames', 'pillars', 'zones', 'rings', 'orbs', 'rods', 'sprites', 'spirits', 'wizards', 'walls', 'evs', 'tele', 'later', 'fx', 'pt', 'texts', 'drops', 'dying'];
function freshState(sets, tsets, synRoll, bossOrder) {
  const s = {
    rs: { dealt: 0, src: {}, wt: {}, big: 0, bigSrc: '', crits: 0, taken: 0, healed: 0, low: 1, elites: 0, bosses: 0, gold: 0, rerolls: 0, bought: 0, time: 0, strikes: 0, execs: 0, stacks: 0 },
    synRoll, bossOrder, synId: null, synS: 0, synNote: null, arenaR: R, shrink: false, silence: 0, lastBossKey: null,
    p: { x: 0, y: 0, hp: 100, inv: 0, shield: 0, face: 0 },
    st: { maxHp: 100, flat: 0, dmgPct: 0, crit: 5, critDmg: 50, atkSpd: 0, speed: 0, armor: 0, regen: 0, range: 0, pen: 0, pickup: 0 },
    ep: { red: {}, yellow: {}, blue: {}, green: {} },
    runSets: sets, typeSets: tsets, counts: {}, tcounts: {}, on: {}, mods: [], hk: {}, relics: [], relicOn: {},
    pendingRelic: 0, relicOffer: null,
    level: 1, xp: 0, pendingLv: 0, gold: 0, wave: 0, kills: 0, weapons: [],
    colossus: null, colT: 1, surge: { n: 0, t: 0 }, avg: 1, buff: null, beam: null, beamT: 0, sched: [], evClock: 0,
    toSpawn: 0, spawnT: 0, bossPending: false, bossT: 0, time: 0, shake: 0, punch: 0, hitstop: 0, lastStop: -9, banner: null, phase: 'fight',
    offers: [], rerolls: 0, rerollCost: 0, uid: 1, timers: {}, staticCd: 0, novaCd: 0, spreadT: 0, trailT: 0,
    phoenixUsed: false, windUsed: false, blood: 0, hitN: 0, moving: false,
    collectT: null, lastLost: null, lvRerollBuys: 0, lvRerolls: 1, lockedCards: [], perkOffer: null,
    shopLocked: false, lockedOffers: null, shopWave: -1,
  };
  for (const k of WAVE_LISTS) s[k] = [];
  return s;
}
function showHud(on) { for (const id of ['hud', 'slots']) $(id).classList.toggle('hidden', !on); }
function newRun(starter) {
  S = freshState(pendingRun.sets, pendingRun.tsets, pendingRun.syn, pendingRun.bosses);
  addWeapon(starter);
  startWave();
  showHud(true);
}
function addWeapon(w) { S.weapons.push({ ...w, id: S.uid++, cd: rnd(0, .3), sumT: 1, anim: 0, dir: 0 }); recalc(); }

// ---- lookups
const sv = (id, k = 'v') => { const s = S.on[id]; return s === undefined ? 0 : AB[id][k][s]; };
const rel = id => S.relicOn[id] === 1;
function E(c, k) { const d = EDEF[c][k]; const b = typeof d.base === 'function' ? d.base() : d.base; return Math.min(d.cap, b + (S.ep[c][k] || 0)); }
const xpNeed = () => Math.round(6 + (S.level - 1) * 5 + (S.level - 1) * (S.level - 1) * .14);

function recalc() {
  S.counts = {}; S.tcounts = {};
  for (const w of S.weapons) { S.counts[w.el] = (S.counts[w.el] || 0) + 1; S.tcounts[w.type] = (S.tcounts[w.type] || 0) + 1; }
  // which abilities and relics are live, and which hooks they listen to
  S.on = {}; S.mods = []; S.relicOn = {};
  for (const c of ORDER) S.runSets[c].forEach((a, i) => { if ((S.counts[c] || 0) >= ETHRESH[i]) { S.on[a.id] = i; S.mods.push({ a, s: i }); codexSee('ab', a.id); } });
  for (const id of S.relics) { S.relicOn[id] = 1; S.mods.push({ a: RELIC[id], s: 0 }); }
  const sy = findSynergy(S.counts);
  S.synId = sy ? sy.a.id : null; S.synS = sy ? sy.s : 0;
  S.synExtra = {};
  if (sy) {
    S.mods.push(sy); if (codexSee('syn', sy.a.id)) S.synNote = sy.a.id;
    if (sy.a.els.length === 3) { const e3 = sy.a.els; for (const [x, z] of [[e3[0], e3[1]], [e3[0], e3[2]], [e3[1], e3[2]]]) { const k = pairKey(x, z), p = SYN_PAIRS[k][S.synRoll[k]]; S.mods.push({ a: p, s: 0 }); S.synExtra[p.id] = 0; codexSee('syn', p.id); } }
  }
  S.hk = {};
  for (const m of S.mods) for (const h of HOOKS) if (m.a[h]) (S.hk[h] || (S.hk[h] = [])).push(m);

  const st = S.st;
  const t = { range: st.range, atkSpd: st.atkSpd, critDmg: st.critDmg, crit: st.crit, knock: 0, maxHp: st.maxHp, flat: st.flat, pen: st.pen, armor: st.armor,
    regen: st.regen, dmgPct: st.dmgPct, speed: st.speed, stun: 0, leech: 0, pickup: st.pickup, hpMul: 1,
    thornFlat: S.weapons.reduce((n, w) => n + (w.el === 'green' ? THF[w.tier] * (w.evo ? 2 : 1) : 0), 0) + E('green', 'thornFlat'), thornPct: E('green', 'thornPct') };
  for (const ty of TYPE_KEYS) { const n = S.tcounts[ty] || 0; S.typeSets[ty].forEach((k, i) => { if (n >= TTHRESH[i]) t[k] += STAT[k].set; }); }
  for (const w of S.weapons) for (const k of w.afx) t[k] += afxVal(k, w);
  for (const w of S.weapons) if (w.el === 'green') t.maxHp += EHP[w.tier] * (w.evo ? 2 : 1);
  t.armor += 2 * (S.tcounts.shield || 0);   // Guard: every shield adds armor
  const lv = Math.max(0, S.level - 1);        // every level: a little of everything, so focused builds don't neglect defence
  t.maxHp += 3 * lv; t.dmgPct += 1.5 * lv; t.atkSpd += .75 * lv; t.armor += .4 * lv; t.regen += .08 * lv;
  if (S.hk.stats) { for (const m of S.hk.stats) if (!m.a.late) m.a.stats(m.a, m.s, t); for (const m of S.hk.stats) if (m.a.late) m.a.stats(m.a, m.s, t); }
  for (const k in tot) delete tot[k];
  Object.assign(tot, t);
  tot.maxHp = Math.round(t.maxHp * t.hpMul);
  tot.critMult = 1 + tot.critDmg / 100;
  tot.baseSpeed = 175 * (1 + tot.speed / 100);
  tot.rangeM = 1 + tot.range / 100;
  tot.pickR = 48 * (1 + tot.pickup / 100);
  tot.bond = E('green', 'bond') / 100;
  tot.thornPen = E('green', 'thornPen');
  S.p.hp = Math.min(S.p.hp, tot.maxHp);
  renderSlots();
}

// ---- prices
const priceOf = t => Math.round([18, 42, 85, 160][t] * (1 + (S.wave - 1) * .06));
const upCost = t => Math.round(priceOf(t + 1) * 1.05);
const evoCost = () => Math.round(priceOf(3) * 1.6);
const sellVal = w => Math.round(priceOf(w.tier) * .4 * (w.evo ? 2 : w.fused ? 1.7 : 1));
let RRF = [5, 1.5, 2];   // reroll: (base + wave*step) * growth^rerollsThisShop
const rerollPrice = () => rel('rush') && S.rerolls === 0 ? 0 : Math.round((RRF[0] + S.wave * RRF[1]) * Math.pow(RRF[2], S.rerolls));
const lvRerollPrice = () => Math.round(60 * Math.pow(2.5, S.lvRerollBuys || 0) * (1 + S.wave * .04));
const canEvolve = w => w.tier === 3 && !w.evo && (S.counts[w.el] || 0) >= 6;
// Fusion: mixed builds can't evolve, so a tier IV weapon of an element you own fewer than 6 of can fuse instead
const canFuse = w => w.tier === 3 && !w.evo && !w.fused && (S.counts[w.el] || 0) < 6;
const tierMark = w => w.evo ? '★' : w.fused ? 'IV◆' : ROMAN[w.tier];
function rollTier() {
  const w = S.wave, r = Math.random();
  if (w >= 11 && r < .12 + Math.min(.3, Math.max(0, w - 20) * .03)) return 3;
  if (w >= 6 && r < .32) return 2;
  if (w >= 2 && r < .58) return 1;
  return 0;
}
const rollOffers = () => [0, 1, 2, 3].map(() => makeWeapon(pick(TYPE_KEYS), pick(ORDER), rollTier()));

// ---- offline save: written at the start of every wave and on every menu
const SAVE_KEY = 'lastCircleSave2';
const packCard = c => ({ el: c.el ? { c: c.el.c, k: c.el.d.k } : null, pk: c.pr.k, pv: c.pv, rare: c.rare, locked: !!c.locked });
function unpackCard(c) {
  const pr = c && PRIM.find(x => x.k === c.pk); if (!pr) return null;
  const el = c.el && EDEF[c.el.c] && EDEF[c.el.c][c.el.k] ? { c: c.el.c, d: EDEF[c.el.c][c.el.k] } : null;
  return { el, pr, pv: c.pv, rare: c.rare, locked: c.locked };
}
const packW = w => w && ({ type: w.type, el: w.el, tier: w.tier, afx: w.afx, evo: !!w.evo, fused: !!w.fused });
function saveRun() {
  if (!S || S.phase === 'dead') return;
  LS.set(SAVE_KEY, {
    v: 2, st: S.st, ep: S.ep, tsets: S.typeSets, sets: Object.fromEntries(ORDER.map(c => [c, S.runSets[c].map(a => a.id)])),
    level: S.level, xp: S.xp, pendingLv: S.pendingLv, gold: S.gold, wave: S.wave, kills: S.kills,
    weapons: S.weapons.map(packW), relics: S.relics, syn: S.synRoll, bosses: S.bossOrder, pendingRelic: S.pendingRelic, relicOffer: S.relicOffer,
    rs: S.rs, phase: S.phase, offers: S.offers.map(packW), rerolls: S.rerolls, lastLost: S.lastLost,
    lvRerollBuys: S.lvRerollBuys, lvRerolls: S.lvRerolls, shopLocked: S.shopLocked, lockedOffers: S.lockedOffers && S.lockedOffers.map(packW), shopWave: S.shopWave,
    perkOffer: S.phase === 'levelup' && S.perkOffer ? S.perkOffer.map(packCard) : null, lockedCards: S.lockedCards.map(packCard),
  });
}
function loadSave() { const d = LS.get(SAVE_KEY, null); return d && d.v === 2 && d.sets && d.weapons && d.weapons.length ? d : null; }
const clearSave = () => LS.del(SAVE_KEY);
function resumeRun(d) {
  const okStat = k => STAT[k] ? k : pick(STAT_KEYS);
  const fixW = w => w && ({ ...w, afx: w.afx.map(okStat) });
  const sets = Object.fromEntries(ORDER.map(c => {
    const list = d.sets[c].map(id => AB[id] && AB[id].el === c ? AB[id] : null);
    for (let i = 0; i < 3; i++) if (!list[i]) list[i] = shuffle(ABIL[c].filter(a => !list.includes(a)))[0];
    return [c, list];
  }));
  const tsets = Object.fromEntries(TYPE_KEYS.map(t => [t, (d.tsets[t] || rollAffixes().concat('crit')).map(okStat)]));
  const okSyn = d.syn && PAIRS.every(([a, b]) => d.syn[pairKey(a, b)] === 0 || d.syn[pairKey(a, b)] === 1);
  const okBoss = d.bosses && d.bosses.length === BOSS_KEYS.length && d.bosses.every(k => BOSSES[k]);
  S = freshState(sets, tsets, okSyn ? d.syn : rollSyn(), okBoss ? d.bosses : rollBosses());
  Object.assign(S.st, d.st); S.ep = d.ep; if (d.rs) Object.assign(S.rs, d.rs);
  for (const k of ['level', 'xp', 'pendingLv', 'gold', 'wave', 'kills', 'lastLost', 'lvRerollBuys', 'lvRerolls', 'shopLocked', 'shopWave', 'pendingRelic', 'rerolls']) if (d[k] !== undefined) S[k] = d[k];
  S.relics = (d.relics || []).filter(id => RELIC[id]);
  S.relicOffer = d.relicOffer && d.relicOffer.every(id => RELIC[id]) ? d.relicOffer : null;
  S.lockedCards = (d.lockedCards || []).map(unpackCard).filter(Boolean);
  S.lockedOffers = d.lockedOffers ? d.lockedOffers.map(fixW) : null;
  for (const w of d.weapons) S.weapons.push({ ...fixW(w), id: S.uid++, cd: 0, sumT: 1, anim: 0, dir: 0 });
  recalc(); S.p.hp = tot.maxHp;
  showHud(true);
  if (d.phase === 'fight') { S.wave = d.wave - 1; S.shopLocked = false; startWave(); return; }
  S.offers = (d.offers || []).map(fixW);
  if (d.phase === 'levelup' && d.perkOffer) { const cards = d.perkOffer.map(unpackCard); if (cards.length === 3 && cards.every(Boolean)) S.perkOffer = cards; }
  S.resumed = d.phase;
  nextMenu();
}
