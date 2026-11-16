// ===== element synergies: mixing elements forms a hidden synergy.
// Each pair of elements has three possible synergies and each trio two; one of each is rolled per run.
// Every synergy carries theme tags. Pairs roll first, then each trio picks the option whose themes best
// match the three pairs inside it, so a golem-y run gets the golem trio.
//   2 + 2      -> the pair's synergy, minor (s = 0)
//   4 + 2      -> the pair's synergy, major (s = 1)
//   2 + 2 + 2  -> the trio's synergy (s = 1), plus the minor of each pair inside it.
// Synergies use the same hooks as abilities (fire / frame / hurt / gHit / gKill / gDie / kill).
// A few reach into the combat core and are checked there with syn('id').
const PAIRS = [['red', 'yellow'], ['red', 'blue'], ['red', 'green'], ['yellow', 'blue'], ['yellow', 'green'], ['blue', 'green']];
const TRIOS = [['red', 'yellow', 'blue'], ['red', 'yellow', 'green'], ['red', 'blue', 'green'], ['yellow', 'blue', 'green']];
const pairKey = (a, b) => ORDER.filter(c => c === a || c === b).join('+');
const SYN = {};
function synDef(els, list) { for (const a of list) { a.els = els; a.syn = true; SYN[a.id] = a; } return list; }
const SYN_PAIRS = {
  'red+yellow': synDef(['red', 'yellow'], [
    { id: 'plasma', name: 'Plasma', tags: ['strikes', 'burn'], minor: 'Lightning sets enemies on fire', major: 'Burning enemies take double lightning damage' },
    { id: 'overheat', name: 'Overheat', tags: ['explosions', 'strikes'], minor: 'Fire explosions fire a bolt at a nearby enemy', major: 'Explosions fire 3 chaining bolts' },
    { id: 'sparks', name: 'Ember Sparks', tags: ['burn', 'strikes'], minor: 'Burning enemies that die release 2 homing sparks that ignite and strike new targets', major: '4 sparks, and each one bounces to a second target' },
  ]),
  'red+blue': synDef(['red', 'blue'], [
    { id: 'thermal', name: 'Thermal Shock', tags: ['explosions', 'control'], minor: 'Fire hitting a frozen enemy bursts it in a steam explosion', major: 'The steam freezes enemies around it' },
    { id: 'frostfire2', name: 'Frostfire', tags: ['burn', 'control'], minor: 'Burning slows enemies, and chilled enemies take +50% burn damage', major: 'Chilled enemies take +150% burn damage instead' },
    { id: 'steam2', name: 'Blinding Steam', tags: ['control', 'burn'], minor: 'Burning a chilled enemy leaves a steam cloud: enemies inside wander confused and take 15% more damage', major: 'Bigger, longer clouds, and confused enemies attack each other' },
  ]),
  'red+green': synDef(['red', 'green'], [
    { id: 'magma', name: 'Magma', tags: ['golems', 'burn'], minor: 'Golems leave pools of lava as they walk', major: 'Golems erupt in fire when they crumble' },
    { id: 'molten', name: 'Molten Thorns', tags: ['thorns', 'burn'], minor: 'Thorns set attackers on fire', major: 'Thorns deal double damage to burning enemies' },
    { id: 'meteor', name: 'Meteor Shower', tags: ['explosions', 'burn'], minor: 'Every 6s a meteor slams into the thickest crowd of enemies', major: '3 meteors, each leaving a pool of lava' },
  ]),
  'yellow+blue': synDef(['yellow', 'blue'], [
    { id: 'supercon', name: 'Superconductor', tags: ['strikes', 'control'], minor: 'Lightning jumps further and 2 more times through chilled enemies', major: 'Lightning strikes on frozen enemies always crit' },
    { id: 'staticice', name: 'Static Ice', tags: ['strikes', 'turrets'], minor: 'Frozen enemies zap a nearby enemy every second', major: 'Frozen enemies release a chain of bolts when they die' },
    { id: 'crystal', name: 'Storm Crystals', tags: ['turrets', 'strikes'], minor: 'Frozen enemies that die leave an ice crystal that zaps nearby enemies for 4s', major: 'Crystals last 8s and their zaps chill' },
  ]),
  'yellow+green': synDef(['yellow', 'green'], [
    { id: 'magnetite', name: 'Magnetite', tags: ['golems', 'strikes'], minor: 'Golems are lightning rods: each one strikes a nearby enemy every 1.5s', major: 'Golems call down 3 strikes when they crumble' },
    { id: 'grounded', name: 'Grounded', tags: ['thorns', 'strikes', 'defense'], minor: 'When you are hit, a bolt strikes the attacker', major: 'That bolt also deals 3x your armor, ignoring armor' },
    { id: 'lodestone', name: 'Lodestone', tags: ['control', 'strikes'], minor: 'Every 5s a magnetic pulse drags nearby enemies into a clump, then lightning hits the clump', major: 'A wider pull, and the clump is stunned' },
  ]),
  'blue+green': synDef(['blue', 'green'], [
    { id: 'permafrost', name: 'Permafrost', tags: ['thorns', 'golems', 'control'], minor: 'Thorns chill attackers and golems chill what they hit', major: 'Golem hits have 25% chance to freeze' },
    { id: 'glacier', name: 'Glacier Golems', tags: ['golems', 'control'], minor: 'Golems become ice giants that chill everything near them', major: 'Golems shatter on death for 15% of your max HP' },
    { id: 'barrier', name: 'Frost Barrier', tags: ['defense', 'control'], minor: 'A frost shield absorbs damage (10% of max HP) and recharges after 5s without being hit', major: 'A 20% shield that bursts into freezing shards when it breaks' },
  ]),
};
const SYN_TRIO_OPTS = {
  'red+yellow+blue': synDef(['red', 'yellow', 'blue'], [
    { id: 'cataclysm', name: 'Cataclysm', tags: ['explosions', 'control', 'strikes'], minor: '', major: 'Every 7.5s a huge storm of fire, ice and lightning hits every enemy in the circle' },
    { id: 'cycle', name: 'Elemental Cycle', tags: ['burn', 'strikes', 'control'], minor: '', major: 'Weapon hits cycle Fire, Lightning, Ice on each enemy; every full cycle unleashes a nova that burns, strikes and freezes' },
  ]),
  'red+yellow+green': synDef(['red', 'yellow', 'green'], [
    { id: 'volcano', name: 'Volcano', tags: ['explosions', 'burn'], minor: '', major: 'Every 6s a vent erupts near you, raining burning, electrified rocks on enemies' },
    { id: 'forge', name: 'Forge Titan', tags: ['golems', 'burn', 'strikes'], minor: '', major: 'A molten titan fights for you, growing with every kill and throwing sparks; when it falls it erupts and reforms' },
  ]),
  'red+blue+green': synDef(['red', 'blue', 'green'], [
    { id: 'tectonic', name: 'Tectonic', tags: ['explosions', 'control', 'burn'], minor: '', major: 'Every 2.3s a quake ripples out from you, alternately igniting and freezing' },
    { id: 'seasons', name: 'Seasons', tags: ['burn', 'control', 'defense'], minor: '', major: 'The arena turns summer and winter every 10s: summer doubles burns and scorches enemies, winter chills everything and freezes far more' },
  ]),
  'yellow+blue+green': synDef(['yellow', 'blue', 'green'], [
    { id: 'livingstorm', name: 'Living Storm', tags: ['golems', 'strikes', 'control'], minor: '', major: 'Golems become storm elementals: double HP, 30% faster, +2 golems per summon, and every hit chills, can freeze and calls a full-power strike' },
    { id: 'totems', name: 'Storm Totems', tags: ['turrets', 'control', 'strikes', 'defense'], minor: '', major: 'Every 8s you plant a storm totem (up to 3) that draws enemies onto itself and pulses chill and lightning' },
  ]),
};
// the trio a run uses: chosen when the run is rolled (key 't:<trio>' in the roll)
const trioOf = (k, roll) => SYN_TRIO_OPTS[k][(roll && roll['t:' + k]) || 0];

const SYN_COUNT = 18 + 8;
const TRIO_NOTE = 'Also switches on the minor synergy of each pair inside it';
const synText = (a, s) => a.els.length === 3 ? `${a.major}. ${TRIO_NOTE}` : s ? `${a.minor}. ${a.major}` : a.minor;
function rollSyn() {
  const r = Object.fromEntries(PAIRS.map(([a, b]) => [pairKey(a, b), Math.floor(Math.random() * 3)]));
  // themes: each trio takes the option sharing the most tags with the three pairs inside it (ties: random)
  for (const t of TRIOS) {
    const k = t.join('+'), inner = [[t[0], t[1]], [t[0], t[2]], [t[1], t[2]]].map(([a, b]) => SYN_PAIRS[pairKey(a, b)][r[pairKey(a, b)]]);
    const score = o => inner.reduce((n, p) => n + p.tags.filter(g => o.tags.includes(g)).length, 0) + Math.random() * .5;
    const opts = SYN_TRIO_OPTS[k], sc = opts.map(score);
    r['t:' + k] = sc[1] > sc[0] ? 1 : 0;
  }
  return r;
}
// active synergy strength: -1 off, 0 minor, 1 major. A trio also switches on the minor of each pair inside it.
const syn = id => S.synId === id ? S.synS : S.synExtra && S.synExtra[id] !== undefined ? S.synExtra[id] : -1;
const golemsOf = () => S.golems.concat(S.colossus ? [S.colossus] : [], S.titan ? [S.titan] : []);

// work out which synergy (if any) the current weapons form
function findSynergy(counts) {
  const els = ORDER.filter(c => (counts[c] || 0) >= 2);
  if (els.length === 3) return { a: trioOf(els.join('+'), S.synRoll), s: 1 };
  if (els.length === 2) {
    const k = els.join('+'), pick2 = SYN_PAIRS[k][S.synRoll[k]];
    return { a: pick2, s: Math.max(counts[els[0]], counts[els[1]]) >= 4 ? 1 : 0 };
  }
  return null;
}

// ---- behaviour (hooks). s: 0 minor, 1 major
const F = SYN;
F.overheat.cd = .15;   // used as a limiter, see boom()
F.magma.frame = (a, s, dt) => {
  S.magmaT = (S.magmaT || 0) - dt; if (S.magmaT > 0) return; S.magmaT = .45;
  for (const g of S.golems) if (!g.thrall && S.zones.length < 90 && Math.hypot(g.vx, g.vy) > 40) pushZone({ k: 'fire', x: g.x, y: g.y, r: 16, life: 2, max: 2, tick: 0, dps: S.ab * .35 });
};
F.magma.gDie = (a, s, g) => { if (s) boom(g.x, g.y, g.big ? 90 : 60, g.maxHp * .8, FIRE, { ignite: true, small: true, pierce: true }); };
F.staticice.frame = (a, s, dt) => {
  S.zapT = (S.zapT || 0) - dt; if (S.zapT > 0) return; S.zapT = 1;
  let n = 0;
  for (const e of S.enemies) { if (e.dead || e.frozen <= 0 || n > 8) continue; const t = nearest(e.x, e.y, 110, new Set([e])); if (t) { bolt(t, .5, { from: e, noChain: true }); n++; } }
};
F.staticice.kill = (a, s, e) => { if (s && e.frozen > 0) chainFrom(e, .8, 4); };
F.magnetite.frame = (a, s, dt) => {
  for (const g of golemsOf()) {
    if (g.thrall) continue;
    g.rodT = (g.rodT === undefined ? Math.random() * 1.5 : g.rodT) - dt;
    if (g.rodT <= 0) { g.rodT = 1.5; const t = nearest(g.x, g.y, 120); if (t) bolt(t, .6, { from: g, noChain: true }); }
  }
};
F.magnetite.gDie = (a, s, g) => { if (s) shuffle(S.enemies.filter(e => !e.dead && Math.hypot(e.x - g.x, e.y - g.y) < 180)).slice(0, 3).forEach(e => bolt(e, 1)); };
F.grounded.hurt = (a, s, src) => { if (!src || src.dead) return; bolt(src, 1.5, { from: S.p, noChain: true }); if (s && !src.dead) dmg(src, tot.armor * 3, { col: COL.yellow, pierce: true }); };
F.permafrost.gHit = (a, s, g, e) => { if (e.dead) return; chill(e, 1); if (s && Math.random() < .25) freeze(e); };
F.glacier.frame = (a, s, dt) => {
  S.glacT = (S.glacT || 0) - dt; if (S.glacT > 0) return; S.glacT = .5;
  for (const g of golemsOf()) if (!g.thrall) eachNear(g.x, g.y, g.big ? 70 : 45, e => chill(e, 1));
};
F.glacier.gDie = (a, s, g) => { if (s) boom(g.x, g.y, 60, tot.maxHp * .15, ICE, { chill: 2, pierce: true, small: true }); };
F.cataclysm.cd = 7.5;
F.cataclysm.fire = () => {
  sfx('boss'); S.shake = Math.min(6, S.shake + 4); hitstop(.05);
  FX({ k: 'boom', x: 0, y: 0, r: R, life: .7, col: '#ffffff' });
  const list = inArena();
  for (const e of list) { dmg(e, S.ab * 3, { col: '#ffffff' }); burn(e, burnFrom(S.ab * 3)); chill(e, 2.5); }
  shuffle(list).slice(0, 20).forEach((e, i) => later(i * .05, () => bolt(e, 1.5, { noChain: true, full: true })));
};
F.volcano.cd = 6;
F.volcano.fire = () => {
  const a = Math.random() * TAU, x = S.p.x + Math.cos(a) * 60, y = S.p.y + Math.sin(a) * 60;
  sfx('rumble', 1.2);
  S.vents.push({ x, y, life: 5, tick: .3 });
};
F.volcano.frame = (a, s, dt) => {
  for (const v of S.vents) {
    v.life -= dt; v.tick -= dt;
    if (S.pt.length < 460) S.pt.push({ x: v.x + rnd(-6, 6), y: v.y, vx: rnd(-30, 30), vy: rnd(-120, -60), t: 0, life: .5, col: pick(['#ff7a2a', '#ffd23f', '#8a7350']), sz: 3 });
    if (v.tick > 0) continue;
    v.tick = .28;
    const t = pick(S.enemies.filter(e => !e.dead && Math.hypot(e.x - v.x, e.y - v.y) < 240));
    if (!t) continue;
    const x = t.x, y = t.y;
    FX({ k: 'warn', x, y, r: 34, life: .3, col: FIRE });
    later(.3, () => { boom(x, y, 40, S.ab * 1.6 + tot.maxHp * .08, FIRE, { ignite: true, small: true, quiet: true }); const e2 = nearest(x, y, 44); if (e2) bolt(e2, .9, { silent: true, full: true }); });
  }
  S.vents = S.vents.filter(v => v.life > 0);
};
F.tectonic.cd = 2.3;
F.tectonic.fire = () => {
  const p = S.p, hot = (S.tecN = (S.tecN || 0) + 1) % 2 === 1, col = hot ? FIRE : ICE;
  sfx('rumble', .8);
  FX({ k: 'boom', x: p.x, y: p.y, r: 165, life: .5, col });
  for (let i = 0; i < 8; i++) { const an = i / 8 * TAU + rnd(-.2, .2), l = rnd(90, 140); FX({ k: 'crack', x1: p.x, y1: p.y, x2: p.x + Math.cos(an) * l, y2: p.y + Math.sin(an) * l, life: .6 }); }
  eachNear(p.x, p.y, 165, e => { dmg(e, S.ab * 1.6 + tot.maxHp * .12, { col }); if (hot) burn(e, burnFrom(S.ab * 2)); else { chill(e, 2.5); if (Math.random() < .4) freeze(e); } });
};
F.livingstorm.gHit = (a, s, g, e) => { if (e.dead) return; chill(e, 2.5); if (Math.random() < .2) freeze(e); bolt(e, 1.5, { noChain: true, full: true }); };
