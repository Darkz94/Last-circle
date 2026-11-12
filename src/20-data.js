// ===== data: weapons, stats, element passives, enemies, shrine buffs. Content lives here, not in the game logic.

// ---- weapon types (attack shape only; their set bonuses are rolled per run)
const TYPES = {
  dagger: { n: 'Dagger', cd: .42, range: 54,  dmg: 5,  kind: 'stab', how: 'quick stab' },
  sword:  { n: 'Sword',  cd: .8,  range: 70,  dmg: 9,  kind: 'arc', arc: 110, how: 'slash' },
  axe:    { n: 'Axe',    cd: 1.2, range: 74,  dmg: 14, kind: 'arc', arc: 220, how: 'wide cleave' },
  spear:  { n: 'Spear',  cd: 1.0, range: 118, dmg: 10, kind: 'line', how: 'long thrust' },
  shield: { n: 'Shield', cd: 1.0, range: 52,  dmg: 6,  kind: 'arc', arc: 150, knock: true, how: 'bash + knockback' },
};
const TYPE_KEYS = Object.keys(TYPES);
const ICON = {
  dagger: '<path d="M19 3l-8 8 2 2 8-8V3z"/><path d="M8 11l5 5"/><path d="M10 14l-5 5"/>',
  sword:  '<path d="M20 4L9 15"/><path d="M20 4h-4M20 4v4"/><path d="M7 12l5 5"/><path d="M9 15l-5 5"/>',
  axe:    '<path d="M5 20L15 10"/><path d="M13 4c4 0 7 3 7 7l-3 1-5-5z"/>',
  spear:  '<path d="M4 20L16 8"/><path d="M14 4h6v6l-4-2z"/>',
  shield: '<path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z"/>',
};
const svg = (t, c) => `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON[t]}</svg>`;

// ---- shared stat pool: weapon-type sets (fixed value) and per-weapon stats (scale with tier)
const STAT = {
  range:   { set: 22,  afx: 6,   u: '%', t: 'attack range' },
  atkSpd:  { set: 22,  afx: 6,   u: '%', t: 'attack speed' },
  critDmg: { set: 60,  afx: 15,  u: '%', t: 'crit damage' },
  crit:    { set: 12,  afx: 3,   u: '%', t: 'crit chance' },
  knock:   { set: 30,  afx: 8,   u: '%', t: 'knockback chance' },
  maxHp:   { set: 45,  afx: 10,  u: '',  t: 'max HP' },
  flat:    { set: 6,   afx: 2,   u: '',  t: 'flat damage' },
  pen:     { set: 8,   afx: 2,   u: '',  t: 'armor penetration' },
  armor:   { set: 6,   afx: 1,   u: '',  t: 'armor' },
  regen:   { set: 2.2, afx: .4,  u: '',  t: 'HP regen / sec' },
  dmgPct:  { set: 18,  afx: 5,   u: '%', t: 'damage' },
  speed:   { set: 14,  afx: 4,   u: '%', t: 'move speed' },
  stun:    { set: 12,  afx: 3,   u: '%', t: 'stun chance on hit' },
  leech:   { set: 4,   afx: 1,   u: '%', t: 'life steal' },
  pickup:  { set: 50,  afx: 15,  u: '%', t: 'pickup range' },
};
const STAT_KEYS = Object.keys(STAT);
const AFX_SCALE = [1, 1.5, 2.2, 3.6];
const statText = (k, v) => `+${fmt(v)}${STAT[k].u} ${STAT[k].t}`;
function afxVal(k, w) { const v = STAT[k].afx * AFX_SCALE[w.tier] * (w.evo ? 1.25 : 1); return STAT[k].afx < 1 ? Math.round(v * 10) / 10 : Math.round(v); }

// ---- level-up bonus stats
const PRIM = [
  { k: 'dmgPct',  v: 10,  t: v => `+${v}% damage` },
  { k: 'flat',    v: 2,   t: v => `+${v} flat damage` },
  { k: 'crit',    v: 4,   t: v => `+${v}% crit chance` },
  { k: 'critDmg', v: 20,  t: v => `+${v}% crit damage` },
  { k: 'maxHp',   v: 15,  t: v => `+${v} max HP` },
  { k: 'armor',   v: 2,   t: v => `+${v} armor` },
  { k: 'pen',     v: 2,   t: v => `+${v} armor penetration` },
  { k: 'atkSpd',  v: 10,  t: v => `+${v}% attack speed` },
  { k: 'speed',   v: 8,   t: v => `+${v}% move speed` },
  { k: 'regen',   v: .6,  t: v => `+${v} HP regen / sec` },
  { k: 'range',   v: 10,  t: v => `+${v}% attack range` },
  { k: 'pickup',  v: 30,  t: v => `+${v}% pickup range` },
];

// ---- tuning numbers
const SUMHP = [22, 42, 74, 140];      // golem base HP by Earth weapon tier
const SUM_CD = 4;                     // seconds between golem summons per Earth weapon
const THF = [5, 9, 14, 23];           // flat thorn damage per Earth weapon, by tier
const EHP = [10, 16, 24, 38];        // max HP per Earth weapon, by tier
const YEL_SPD = 1.4, YEL_DMG = .75;   // Lightning weapons: faster, softer
const GOLD_TO_XP = .5;

// ---- element passives: the main level-up choice. Small, capped, and leave the pool once maxed.
//      v = per pick, base = starting value, cap = maximum, req = only offered if the run has one of these abilities
const BOOMERS = ['blast', 'fireball', 'bombs', 'meteor', 'pyre', 'sprite'];
const EPASS = {
  red: [
    { k: 'ign',     v: 8,   base: 14,  cap: 100, u: '%', t: 'ignite chance on Fire hits' },
    { k: 'spread',  v: 8,   base: 5,   cap: 100, u: '%', t: 'chance burning enemies spread fire on touch' },
    { k: 'vsBurn',  v: 10,  base: 0,   cap: 100, u: '%', t: 'damage to burning enemies' },
    { k: 'burn',    v: 20,  base: 100, cap: 400, u: '%', t: 'burn damage' },
    { k: 'burnDur', v: .5,  base: 3,   cap: 7,   u: 's', t: 'burn duration' },
    { k: 'boomR',   v: 10,  base: 100, cap: 200, u: '%', t: 'explosion size', req: BOOMERS },
  ],
  blue: [
    { k: 'chillCh',   v: 8,   base: 30,  cap: 100, u: '%', t: 'chance to chill on Frost hits' },
    { k: 'slow',      v: 5,   base: 35,  cap: 80,  u: '%', t: 'chill slow' },
    { k: 'ccDur',     v: 10,  base: 100, cap: 200, u: '%', t: 'stun & root duration' },
    { k: 'freezeDur', v: .15, base: 1.1, cap: 3,   u: 's', t: 'freeze duration' },
    { k: 'vsChill',   v: 10,  base: 0,   cap: 100, u: '%', t: 'damage to chilled & frozen enemies' },
    { k: 'shatterPct',v: 3,   base: () => { const i = S.runSets.blue.findIndex(a => a.id === 'shatter'); return i < 0 ? 0 : AB.shatter.v[i]; }, cap: 30, u: '%', t: 'shatter damage (of max HP)', req: ['shatter'] },
    { k: 'shatterR',  v: 10,  base: 60,  cap: 120, u: '',  t: 'shatter radius', req: ['shatter'] },
  ],
  yellow: [
    { k: 'strike', v: 2,  base: 10,  cap: 30,  u: '%', t: "lightning damage (% of the target's current HP, down to 65% of its max HP)" },
    { k: 'lpen',   v: 3,  base: 0,   cap: 40,  u: '',  t: 'lightning armor penetration' },
    { k: 'arcCh',  v: 8,  base: 15,  cap: 100, u: '%', t: 'chance to arc on Lightning hits' },
    { k: 'jumps',  v: 1,  base: 2,   cap: 7,   u: '',  t: 'arc jumps' },
    { k: 'lspd',   v: 8,  base: 0,   cap: 100, u: '%', t: 'Lightning weapon attack speed' },
    { k: 'lstun',  v: 4,  base: 0,   cap: 40,  u: '%', t: 'chance for lightning to stun' },
  ],
  green: [
    { k: 'shp',       v: 15, base: 100, cap: 400, u: '%', t: 'golem HP' },
    { k: 'sspd',      v: 10, base: 100, cap: 200, u: '%', t: 'golem speed' },
    { k: 'srate',     v: 10, base: 100, cap: 250, u: '%', t: 'summon rate' },
    { k: 'slife',     v: 15, base: 100, cap: 300, u: '%', t: 'golem lifetime' },
    { k: 'scap',      v: 5,  base: 30,  cap: 70,  u: '',  t: 'max golems at once' },
    { k: 'bond',      v: 10, base: 60,  cap: 150, u: '%', t: 'of your damage & crit inherited by golems' },
    { k: 'thornFlat', v: 6,  base: 0,   cap: 600, u: '',  t: 'thorn damage' },
    { k: 'thornPct',  v: 20, base: 100, cap: 600, u: '%', t: 'thorn damage multiplier' },
    { k: 'thornPen',  v: 4,  base: 0,   cap: 80,  u: '',  t: 'thorn armor penetration' },
  ],
};
const EDEF = {}; for (const c of ORDER) { EDEF[c] = {}; for (const d of EPASS[c]) EDEF[c][d.k] = d; }

// ---- enemies (all melee). arm = armor multiplier, special = not a normal fighter
const ETYPES = {
  grunt:   { r: 13, hp: 16,   spd: 62,  dmg: 8,  gold: 2,  xp: 1,  col: '#8a6fa8', shape: 'grunt' },
  runner:  { r: 9,  hp: 8,    spd: 125, dmg: 5,  gold: 1,  xp: 1,  col: '#c2a3e6', shape: 'runner' },
  swarm:   { r: 7,  hp: 5,    spd: 100, dmg: 4,  gold: 1,  xp: .5, col: '#a590c8', shape: 'swarm' },
  brute:   { r: 22, hp: 75,   spd: 42,  dmg: 16, gold: 5,  xp: 4,  col: '#5d4a72', shape: 'brute', arm: 2 },
  charger: { r: 14, hp: 30,   spd: 55,  dmg: 14, gold: 3,  xp: 2,  col: '#b75fc4', shape: 'charger' },
  boss:    { r: 44, hp: 1300, spd: 50,  dmg: 28, gold: 120, xp: 60, col: '#c8436a', shape: 'boss', arm: 2.5 },
  goblin:  { r: 11, hp: 45,   spd: 150, dmg: 0,  gold: 0,  xp: 4,  col: '#e0b84a', shape: 'goblin', special: true },
  altar:   { r: 18, hp: 90,   spd: 0,   dmg: 0,  gold: 8,  xp: 6,  col: '#6a2c7e', shape: 'altar', special: true },
};

// ---- shrine buffs (arena event)
const BUFFS = [
  { name: 'Fury',      col: '#ff5a3c', dmg: .4,            desc: '+40% weapon damage' },
  { name: 'Haste',     col: '#ffd23f', atk: .4,            desc: '+40% attack speed' },
  { name: 'Fortitude', col: '#5ee08a', armor: 8, regen: 3, desc: '+8 armor, +3 HP regen' },
  { name: 'Swiftness', col: '#4fc3ff', spd: .3, pick: 1,   desc: '+30% move speed, double pickup range' },
  { name: 'Greed',     col: '#f2c14e', greed: 1,           desc: 'double gold' },
];

// ---- difficulty curve: steady to wave 20, brutal after
// from wave 6 enemies toughen on a curve, so un-upgraded weapons fall behind well before 20
const BOSS_HP = 800;   // x hpMult(wave)
function hpMult(w) { const k = Math.max(0, Math.min(w, 20) - 6); let m = 1 + (w - 1) * .6 + k * k * .12; if (w > 20) m *= Math.pow(1.31, w - 20); return m; }
function dmgMult(w) { const k = Math.max(0, Math.min(w, 20) - 8); let m = 1 + (w - 1) * .16 + k * k * .025; if (w > 20) m *= Math.pow(1.16, w - 20); return m; }
function spdMult(w) { return (1 + Math.min(.4, w * .012)) * (w > 20 ? Math.min(2.4, 1 + (w - 20) * .07) : 1); }
function armorAt(w) { let a = Math.floor(Math.max(0, w - 4) * .45); if (w > 20) { const n = w - 20; a += Math.floor(1.5 * n + .18 * n * n); } return a; }
function waveCount(w) { return Math.round(14 + w * 6 + (w > 20 ? (w - 20) * 12 : 0)); }
function enemyPool(w) {
  const l = [['grunt', 5]];
  if (w >= 2) l.push(['runner', 2.5 + w * .1]);
  if (w >= 3) l.push(['swarm', 1.2]);
  if (w >= 4) l.push(['brute', .8 + w * .12]);
  if (w >= 7) l.push(['charger', 1 + w * .06]);
  return l;
}
