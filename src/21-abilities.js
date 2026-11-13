// ===== element set abilities. Three are rolled per element each run; the slot (2 / 4 / 6 weapons) picks the stage s = 0..2.
// Each entry is self-contained: numbers, description and behaviour. Hooks an ability can define:
//   fire(a,s)            timed: runs every a.v[s] seconds (or every a.cd seconds)
//   frame(a,s,dt)        runs every step
//   hit(a,s,w,e,d,dir)   a weapon hit an enemy (elHit: only weapons of this ability's element)
//   kill(a,s,e)          an enemy died        hurt(a,s,src)   the player was hit
//   mult(a,s,e)          damage multiplier against enemy e
//   stats(a,s,t)         change the player's stat totals (late: after everything else)
//   gHit / gKill / gDie  golem hit an enemy / killed one / crumbled
//   death(a,s)           the player would die; return true to prevent it
const AB = {};
function defs(el, list) { for (const a of list) { a.el = el; AB[a.id] = a; } return list; }
const pct = x => Math.round(x * 100);

const ABIL = {
  // ------------------------------------------------------------------ FIRE: burning, damage over time, explosions
  red: defs('red', [
    { id: 'blast', name: 'Blast Strikes', v: [10, 18, 30], r: [50, 60, 75], d: (a, s) => `Fire weapon hits have ${a.v[s]}% chance to explode`,
      elHit: true, hit(a, s, w, e, d) { if (Math.random() * 100 < a.v[s]) boom(e.x, e.y, boomR(a.r[s]), d * .9, FIRE, { ignite: true, small: true }); } },
    { id: 'fireball', name: 'Fireball', v: [3, 2.2, 1.5], r: [55, 70, 90], m: [1.5, 2, 3], d: (a, s) => `Every ${a.v[s]}s hurl a fireball that explodes on the first enemy it hits`,
      fire(a, s) { const an = aim(), p = S.p; sfx('whoosh'); S.projs.push({ k: 'fireball', x: p.x, y: p.y, vx: Math.cos(an) * 400, vy: Math.sin(an) * 400, life: 1.6, rad: boomR(a.r[s]), dmg: S.avg * a.m[s] }); } },
    { id: 'bombs', name: 'Bomb Line', v: [5, 4, 3], n: [10, 14, 20], m: [1, 1.3, 1.8], d: (a, s) => `Every ${a.v[s]}s a line of ${a.n[s]} bombs blows up everything in one direction, right across the arena`,
      fire(a, s) { const an = aim(), ox = S.p.x, oy = S.p.y, dm = S.avg * a.m[s]; for (let i = 0; i < a.n[s]; i++) { const d = 30 + i * 620 / (a.n[s] - 1); later(i * .05, () => boom(ox + Math.cos(an) * d, oy + Math.sin(an) * d, boomR(36), dm, FIRE, { ignite: true, small: true })); } } },
    { id: 'flame', name: 'Flamethrower', v: [4.5, 3.5, 2.5], rg: [120, 150, 185], m: [.2, .3, .45], d: (a, s) => `Every ${a.v[s]}s breathe a cone of fire (${a.rg[s]} range) that ignites all it touches`,
      fire(a, s) { sfx('flame'); S.flames.push({ t: 0, dur: 1, dir: aim(), rg: a.rg[s], dmg: S.avg * a.m[s], tick: 0 }); } },
    { id: 'pyre', name: 'Pyre', v: [20, 35, 60], d: (a, s) => `Burning enemies explode on death for ${a.v[s]}% of their max HP`,
      kill(a, s, e) { if (e.burnT > 0) boom(e.x, e.y, boomR(60), e.maxHp * a.v[s] / 100, FIRE, { pierce: true }); } },
    { id: 'kindle', name: 'Kindling', v: [20, 40, 75], d: (a, s) => `Burning enemies take +${a.v[s]}% damage`,
      mult(a, s, e) { return e.burnT > 0 ? 1 + a.v[s] / 100 : 1; } },
    { id: 'meteor', name: 'Meteor Shower', v: [8, 6, 4], n: [3, 5, 8], m: [1.5, 2, 2.6], d: (a, s) => `Every ${a.v[s]}s ${a.n[s]} meteors crash down on enemies`,
      fire(a, s) { const dm = S.avg * a.m[s], rr = boomR(55); shuffle(inArena()).slice(0, a.n[s]).forEach((e, i) => { const x = e.x, y = e.y; later(i * .12, () => FX({ k: 'meteor', x, y, r: rr, life: .6 })); later(i * .12 + .6, () => { boom(x, y, rr, dm, FIRE, { ignite: true }); puff(x, y, '#ffb347', 10, 160, .45); }); }); } },
    { id: 'trail', name: 'Firewalker', v: [1.5, 2.5, 3.5], m: [.25, .4, .6], d: (a, s) => `You leave a trail of fire that burns for ${a.v[s]}s`,
      frame(a, s, dt) { S.trailT -= dt; if (S.trailT <= 0 && S.moving) { S.trailT = .12; if (S.zones.length < 90) S.zones.push({ k: 'fire', x: S.p.x, y: S.p.y, r: 18, life: a.v[s], max: a.v[s], tick: 0, dps: S.avg * a.m[s] }); } } },
    { id: 'ring', name: 'Ring of Fire', v: [6, 5, 4], rg: [120, 160, 220], m: [.8, 1.1, 1.5], d: (a, s) => `Every ${a.v[s]}s a ring of flame bursts out from you (${a.rg[s]} range)`,
      fire(a, s) { sfx('whoosh'); S.rings.push({ x: S.p.x, y: S.p.y, r: 10, max: a.rg[s], spd: 320, hit: new Set(), dmg: S.avg * a.m[s] }); } },
    { id: 'inferno', name: 'Inferno Aura', v: [25, 50, 75], r: [70, 90, 115], cd: .25, d: (a, s) => `Every 2s, enemies within ${a.r[s]} range of you burn for ${a.v[s]}% of your total weapon damage (its own burn, not a stack)`,
      fire(a, s) { const tot2 = S.weapons.reduce((n, w) => n + weaponDmg(w), 0) * a.v[s] / 100; eachNear(S.p.x, S.p.y, a.r[s], e => { if (S.time < (e.auraN || 0)) return; e.auraN = S.time + 2; burn(e, burnFrom(tot2), { aura: true }); }); } },
    { id: 'phoenix', name: 'Phoenix', v: [30, 50, 80], d: (a, s) => `Once per wave, when you would die, explode and revive with ${a.v[s]}% HP`,
      death(a, s) { if (S.phoenixUsed) return false; S.phoenixUsed = true; S.p.hp = tot.maxHp * a.v[s] / 100; S.p.inv = 2; sfx('revive'); boom(S.p.x, S.p.y, 160, S.avg * 4, '#ffb347', { ignite: true }); banner('Phoenix'); return true; } },
    { id: 'sprite', name: 'Fire Sprites', v: [8, 6, 4], r: [60, 75, 95], m: [2, 2.6, 3.4], d: (a, s) => `Every ${a.v[s]}s a fire sprite waddles out and hurls itself at the nearest enemy, exploding and setting it ablaze`,
      fire(a, s) { sfx('summon'); S.sprites.push({ x: S.p.x, y: S.p.y, life: 12, state: 'walk', vx: 0, vy: 0, lt: 0, r: boomR(a.r[s]), dmg: S.avg * a.m[s], a: Math.random() * TAU }); } },
  ]),

  // ------------------------------------------------------------------ FROST: control the fight; damage comes from the cold itself
  blue: defs('blue', [
    { id: 'shatter', name: 'Shatter', v: [8, 12, 18], d: (a, s) => `Frozen enemies shatter on death for ${a.v[s]}% of their max HP (level-ups take it to 30%)`,
      kill(a, s, e) { if (e.frozen > 0) boom(e.x, e.y, E('blue', 'shatterR'), e.maxHp * E('blue', 'shatterPct') / 100, ICE, { chill: 1, pierce: true, src: 'shatter' }); } },
    { id: 'gust', name: 'Frost Gust', v: [5, 4, 3], n: [2, 3, 4], rg: [160, 200, 240], d: (a, s) => `Every ${a.v[s]}s a freezing gust blasts enemies back with ${a.n[s]} chill across a wide cone`,
      fire(a, s) { const p = S.p, an = aim(); sfx('gust'); FX({ k: 'gust', x: p.x, y: p.y, dir: an, arc: Math.PI / 2, r: a.rg[s], life: .45 }); eachNear(p.x, p.y, a.rg[s], e => { if (!inCone(e, p.x, p.y, an, Math.PI / 4, a.rg[s])) return; dmg(e, S.avg * .5, { col: COL.blue }); chill(e, a.n[s]); knock(e, an, 30); }); } },
    { id: 'pillar', name: 'Ice Pillar', v: [7, 6, 4.5], life: [5, 7, 9], d: (a, s) => `Every ${a.v[s]}s raise an ice pillar among the enemies that chills and frost-burns everything near it for ${a.life[s]}s`,
      fire(a, s) { const tg = pick(inArena()), x = tg ? tg.x : rnd(-R / 2, R / 2), y = tg ? tg.y : rnd(-R / 2, R / 2); addPillar(x, y, a.life[s], 75); } },
    { id: 'flash', name: 'Flash Freeze', v: [8, 15, 25], d: (a, s) => `Frost weapon hits have ${a.v[s]}% chance to freeze instantly`,
      elHit: true, hit(a, s, w, e) { if (Math.random() * 100 < a.v[s]) freeze(e); } },
    { id: 'brittle', name: 'Brittle', v: [30, 60, 100], d: (a, s) => `Frozen enemies take +${a.v[s]}% damage`,
      mult(a, s, e) { return e.frozen > 0 ? 1 + a.v[s] / 100 : 1; } },
    { id: 'nova', name: 'Frost Nova', v: [90, 120, 160], n: [2, 3, 4], d: (a, s) => `When you're hit, a nova blasts enemies back with ${a.n[s]} chill in a ${a.v[s]} radius`,
      hurt(a, s) { if (S.novaCd > 0) return; S.novaCd = 1; sfx('snap'); const p = S.p; FX({ k: 'boom', x: p.x, y: p.y, r: a.v[s], life: .45, col: '#9fe0ff' }); eachNear(p.x, p.y, a.v[s], e => { dmg(e, S.avg * .5, { col: COL.blue }); chill(e, a.n[s]); knock(e, Math.atan2(e.y - p.y, e.x - p.x), 25); }); } },
    { id: 'blizzard', name: 'Blizzard', v: [9, 7, 5], r: [70, 90, 120], d: (a, s) => `Every ${a.v[s]}s a blizzard rages over the enemies for 4s, chilling and frost-burning everything inside`,
      fire(a, s) { const tg = pick(inArena()); if (tg) { sfx('gust'); S.zones.push({ k: 'snow', x: tg.x, y: tg.y, r: a.r[s], life: 4, max: 4, tick: 0, dps: S.avg * .5 }); } } },
    { id: 'shards', name: 'Ice Shards', v: [15, 25, 40], n: [3, 4, 6], d: (a, s) => `Frost weapon hits have ${a.v[s]}% chance to spray ${a.n[s]} piercing, chilling ice shards`,
      elHit: true, hit(a, s, w, e, d, dir) { if (Math.random() * 100 >= a.v[s]) return; const n = a.n[s]; for (let i = 0; i < n; i++) { const an = dir + (i - (n - 1) / 2) * .22; S.projs.push({ k: 'shard', x: S.p.x, y: S.p.y, vx: Math.cos(an) * 430, vy: Math.sin(an) * 430, life: .5, dmg: d * .3, hit: new Set() }); } } },
    { id: 'farmor', name: 'Frost Armor', v: [25, 50, 100], d: (a, s) => `Enemies that hit you have ${a.v[s]}% chance to freeze solid`,
      hurt(a, s, src) { if (src && Math.random() * 100 < a.v[s]) freeze(src); } },
    { id: 'glacier', name: 'Glacial Spikes', v: [5, 4, 3], f: [30, 50, 80], d: (a, s) => `Every ${a.v[s]}s a line of ice spikes erupts; ${a.f[s]}% chance to freeze what it hits`,
      fire(a, s) { const an = aim(), ox = S.p.x, oy = S.p.y; sfx('snap'); for (let i = 0; i < 7; i++) { const d = 28 + i * 26; later(i * .05, () => { const x = ox + Math.cos(an) * d, y = oy + Math.sin(an) * d; FX({ k: 'spike', x, y, life: .5 }); boom(x, y, 26, S.avg * .6, ICE, { chill: 2, freezeCh: a.f[s], small: true, quiet: true }); }); } } },
    { id: 'coldsnap', name: 'Cold Snap', v: [10, 8, 6], r: [100, 140, 200], d: (a, s) => `Every ${a.v[s]}s instantly freeze every enemy within ${a.r[s]} of you`,
      fire(a, s) { const p = S.p; sfx('snap'); FX({ k: 'boom', x: p.x, y: p.y, r: a.r[s], life: .5, col: '#d8f4ff' }); eachNear(p.x, p.y, a.r[s], e => freeze(e)); } },
    { id: 'wall', name: 'Ice Wall', v: [9, 7, 5], n: [5, 7, 9], life: [3, 4, 6], d: (a, s) => `Every ${a.v[s]}s raise a wall of ${a.n[s]} ice blocks that shoves enemies away, holds them back for ${a.life[s]}s and frost-burns anything touching it`,
      fire(a, s) { const p = S.p, an = aim(), n = a.n[s]; sfx('snap'); for (let i = 0; i < n; i++) { const t = an + (i - (n - 1) / 2) * .3; S.walls.push({ x: p.x + Math.cos(t) * 64, y: p.y + Math.sin(t) * 64, r: 12, life: a.life[s], max: a.life[s], tick: 0, seed: Math.random() }); } eachNear(p.x, p.y, 110, e => { if (!inCone(e, p.x, p.y, an, n * .15 + .3, 110)) return; dmg(e, S.avg * .4, { col: COL.blue }); chill(e, 1); knock(e, Math.atan2(e.y - p.y, e.x - p.x), 55); }); } },
    { id: 'halo', name: 'Frost Halo', v: [70, 90, 120], cd: .5, d: (a, s) => `Enemies that come within ${a.v[s]} of you are constantly chilled and frost-burned`,
      fire(a, s) { eachNear(S.p.x, S.p.y, a.v[s], e => { chill(e, 1); dmg(e, S.avg * .12, { col: COL.blue }); }); } },
    { id: 'thrall', name: 'Frozen Thrall', v: [2, 4, 7], d: (a, s) => `Frost weapon hits have ${a.v[s]}% chance to enslave an enemy, turning it into an ice thrall that fights for you`,
      elHit: true, hit(a, s, w, e) { if (!e.dead && !e.boss && !e.elite && !e.special && Math.random() * 100 < a.v[s]) enthrall(e); } },
    { id: 'wizard', name: 'Frost Wizards', v: [10, 8, 6], life: [10, 12, 15], d: (a, s) => `Every ${a.v[s]}s a frost wizard joins you for ${a.life[s]}s, chilling groups of enemies and raising ice pillars`,
      fire(a, s) { if (S.wizards.length >= 3) return; sfx('freeze'); S.wizards.push({ x: S.p.x, y: S.p.y, life: a.life[s], tick: .6, ptick: 2, a: Math.random() * TAU }); } },
  ]),

  // ------------------------------------------------------------------ LIGHTNING: speed. Hits take a % of the enemy's current HP.
  yellow: defs('yellow', [
    { id: 'clap', name: 'Thunderclap', v: [6, 4, 2.5], n: [1, 2, 4], d: (a, s) => `Every ${a.v[s]}s lightning strikes ${pl(a.n[s], 'random enemy', 'random enemies')} for 150% of your average weapon hit`,
      fire(a, s) { shuffle(inArena()).slice(0, a.n[s]).forEach(e => bolt(e, 1.5)); } },
    { id: 'call', name: 'Storm Call', v: [15, 25, 40], d: (a, s) => `Every lightning strike has ${a.v[s]}% chance to call another strike on a random enemy` },
    { id: 'smite', name: 'Execute', v: [5, 10, 20], d: (a, s) => `Lightning strikes execute non-boss enemies below ${a.v[s]}% HP (no on-kill effects)` },
    { id: 'twice', name: 'Strikes Twice', v: [25, 50, 90], d: (a, s) => `All lightning has ${a.v[s]}% chance to hit again` },
    { id: 'chain', name: 'Bounce', v: [1, 2, 4], d: (a, s) => `Strikes and arcs bounce to +${pl(a.v[s], 'more enemy', 'more enemies')}` },
    { id: 'overload', name: 'Overload', v: [40, 60, 100], r: [40, 55, 75], d: (a, s) => `Lightning hits explode for ${a.v[s]}% of their damage around the target` },
    { id: 'static', name: 'Static Shield', v: [.8, 1.4, 2.2], d: (a, s) => `When hit, become invulnerable for ${a.v[s]}s (every 5s)`,
      hurt(a, s) { if (S.staticCd > 0) return; S.p.inv = a.v[s]; S.p.shield = a.v[s]; S.staticCd = 5; sfx('zap'); FX({ k: 'ring', x: S.p.x, y: S.p.y, r: 30, life: .4, col: COL.yellow }); } },
    { id: 'ball', name: 'Ball Lightning', v: [6, 5, 3.5], m: [.3, .4, .55], d: (a, s) => `Every ${a.v[s]}s release a crackling orb that drifts into enemies, zapping everything near it`,
      fire(a, s) { sfx('zap'); S.orbs.push({ x: S.p.x, y: S.p.y, life: 4, tick: 0, mult: a.m[s] }); } },
    { id: 'rod', name: 'Lightning Rod', v: [8, 6, 4], i: [1, .75, .5], d: (a, s) => `Every ${a.v[s]}s plant a rod that strikes nearby enemies every ${a.i[s]}s`,
      fire(a, s) { const tg = pick(inArena()), x = tg ? tg.x : rnd(-R / 2, R / 2), y = tg ? tg.y : rnd(-R / 2, R / 2); if (S.rods.length >= 4) S.rods.shift(); S.rods.push({ x, y, life: 5, tick: .2, int: a.i[s] }); } },
    { id: 'surge', name: 'Surge', v: [3, 5, 8], d: (a, s) => `Lightning kills give +${a.v[s]}% move & attack speed for 3s (stacks to 10)`,
      kill(a, s, e) { if (e.killer === 'lightning') { S.surge.n = Math.min(10, S.surge.n + 1); S.surge.t = 3; } } },
    { id: 'conductor', name: 'Conductor', v: [30, 60, 100], d: (a, s) => `Lightning deals +${a.v[s]}% damage to stunned, chilled or frozen enemies` },
    { id: 'storm', name: 'Storm Cloud', v: [1.2, .8, .5], m: [.6, .8, 1], d: (a, s) => `A storm cloud follows you, striking a nearby enemy every ${a.v[s]}s`,
      fire(a, s) { const p = S.p, tg = nearest(p.x, p.y, 170); if (tg) bolt(tg, a.m[s], { from: { x: p.x + Math.cos(S.time) * 20, y: p.y - 40 } }); } },
    { id: 'current', name: 'Live Current', v: [15, 30, 50], d: (a, s) => `Lightning weapons attack ${a.v[s]}% faster` },
    { id: 'plasma', name: 'Plasma Beam', v: [.15, .22, .3], rg: [130, 160, 200], d: (a, s) => `A plasma beam locks onto the nearest enemy within ${a.rg[s]}, zapping it for ${pct(a.v[s])}% of your average weapon hit 10 times a second`,
      frame(a, s, dt) { const tg = nearest(S.p.x, S.p.y, a.rg[s]); S.beam = tg; if (!tg) return; S.beamT -= dt; if (S.beamT <= 0) { S.beamT = .1; bolt(tg, a.v[s], { silent: true }); } } },
    { id: 'tempest', name: 'Lightning Storm', v: [8, 6, 4], i: [.4, .3, .2], d: (a, s) => `Every ${a.v[s]}s a storm settles over the enemies for 4s, striking inside it every ${a.i[s]}s`,
      fire(a, s) { const tg = pick(inArena()); if (tg) { sfx('gust'); S.zones.push({ k: 'storm', x: tg.x, y: tg.y, r: 85, life: 4, max: 4, tick: 0, int: a.i[s] }); } } },
    { id: 'spirit', name: 'Storm Spirit', v: [9, 7, 5], n: [4, 5, 7], d: (a, s) => `Every ${a.v[s]}s a storm spirit drifts towards the enemies and calls down ${a.n[s]} rapid strikes before fading`,
      fire(a, s) { sfx('summon'); S.spirits.push({ x: S.p.x, y: S.p.y, life: 14, state: 'walk', n: a.n[s] }); } },
  ]),

  // ------------------------------------------------------------------ EARTH: the tank. Golems, thorns, and defence turned into damage.
  green: defs('green', [
    { id: 'bark', name: 'Granite Hide', v: [30, 60, 120], php: [15, 30, 60], d: (a, s) => `Golems get +${a.v[s]}% HP; you get +${a.php[s]} max HP`,
      stats(a, s, t) { t.maxHp += a.php[s]; } },
    { id: 'over', name: 'Rubble Born', v: [1, 2, 3], d: (a, s) => `When a golem kills an enemy, ${pl(a.v[s], 'new golem forms', 'new golems form')} from the rubble`,
      gKill(a, s, e) { summonGolems(bestEarthTier(), e.x, e.y, a.v[s]); } },
    { id: 'brood', name: 'Quarry', v: [1, 2, 3], d: (a, s) => `Every summon brings +${pl(a.v[s], 'extra golem', 'extra golems')}` },
    { id: 'thorn', name: 'Rock Burst', v: [50, 100, 200], d: (a, s) => `Golems burst when they crumble, dealing ${a.v[s]}% of their max HP around them`,
      gDie(a, s, g) { boom(g.x, g.y, g.big ? 80 : 50, g.maxHp * a.v[s] / 100, COL.green, { pierce: true, small: true }); } },
    { id: 'ancient', name: 'Ancients', v: [9, 7, 5], m: [4, 6, 9], d: (a, s) => `Every ${a.v[s]}s raise an Ancient: a big golem with ${a.m[s]}× HP`,
      fire(a, s) { summonGolems(bestEarthTier(), S.p.x, S.p.y, 1, a.m[s]); } },
    { id: 'leech', name: 'Lifestone', v: [3, 6, 10], d: (a, s) => `Damage dealt by golems heals you for ${a.v[s]}%`,
      gHit(a, s, g, e, d) { heal(d * a.v[s] / 100); } },
    { id: 'vines', name: 'Grasping Earth', v: [.6, 1, 1.6], d: (a, s) => `Golems root enemies they hit in place for ${a.v[s]}s`,
      gHit(a, s, g, e) { if (!e.dead) stun(e, a.v[s]); } },
    { id: 'bloom', name: 'Mending Earth', v: [10, 7, 5], h: [6, 9, 14], d: (a, s) => `Every ${a.v[s]}s the ground heals you for ${a.h[s]}% of your max HP`,
      fire(a, s) { heal(tot.maxHp * a.h[s] / 100); sfx('level'); FX({ k: 'boom', x: S.p.x, y: S.p.y, r: 50, life: .6, col: COL.green }); } },
    { id: 'treant', name: 'Colossus', v: [15, 10, 6], m: [8, 12, 18], d: (a, s) => `A Colossus with ${a.m[s]}× golem HP guards you and reforms ${a.v[s]}s after falling`,
      frame(a, s, dt) { if (S.colossus) return; S.colT -= dt; if (S.colT > 0) return; const hp = golemHp(bestEarthTier(), a.m[s]); S.colossus = { x: S.p.x, y: S.p.y, hp, maxHp: hp, vx: 0, vy: 0, a: 0, hitCd: 0, big: true, col: true, seed: 1.3 }; sfx('rumble'); FX({ k: 'ring', x: S.p.x, y: S.p.y, r: 40, life: .4, col: COL.green }); } },
    { id: 'pollen', name: 'Geode Core', v: [25, 50, 100], d: (a, s) => `Golem hits have ${a.v[s]}% chance to burn, chill or shock the enemy`,
      gHit(a, s, g, e) { if (e.dead || Math.random() * 100 >= a.v[s]) return; const r = Math.random(); if (r < .34) burn(e, burnFrom(S.avg)); else if (r < .67) chill(e, 2); else bolt(e, .6, { noChain: true }); } },
    { id: 'boulder', name: 'Boulder Roll', v: [5, 4, 3], m: [.4, .55, .8], d: (a, s) => `Every ${a.v[s]}s roll a boulder that crushes a line of enemies for ${pct(a.m[s])}% of your max HP`,
      fire(a, s) { const an = aim(), p = S.p; sfx('rumble'); S.projs.push({ k: 'boulder', x: p.x, y: p.y, vx: Math.cos(an) * 270, vy: Math.sin(an) * 270, life: 2.4, dmg: tot.maxHp * a.m[s], hit: new Set(), rot: 0 }); } },
    { id: 'barrage', name: 'Rock Barrage', v: [5, 4, 3], n: [8, 12, 16], m: [.12, .16, .22], d: (a, s) => `Every ${a.v[s]}s fire ${a.n[s]} stones outward, each dealing ${pct(a.m[s])}% of your max HP`,
      fire(a, s) { const n = a.n[s], off = Math.random() * TAU, p = S.p; sfx('rumble', .5); for (let i = 0; i < n; i++) { const an = off + i / n * TAU; S.projs.push({ k: 'stone', x: p.x, y: p.y, vx: Math.cos(an) * 380, vy: Math.sin(an) * 380, life: .75, dmg: tot.maxHp * a.m[s], hit: new Set(), pierce: 1 }); } } },
    { id: 'quake', name: 'Earthquake', v: [8, 6, 4.5], r: [110, 140, 180], st: [.6, .9, 1.2], m: [.25, .35, .5], d: (a, s) => `Every ${a.v[s]}s slam the ground for ${pct(a.m[s])}% of your max HP, stunning everything within ${a.r[s]}`,
      fire(a, s) { const p = S.p, r = a.r[s]; sfx('rumble', 1.4); S.shake = Math.min(12, S.shake + 8); hitstop(.05); FX({ k: 'boom', x: p.x, y: p.y, r, life: .5, col: ROCK }); for (let i = 0; i < 10; i++) { const an = i / 10 * TAU + rnd(-.2, .2), l = r * rnd(.6, 1); FX({ k: 'crack', x1: p.x, y1: p.y, x2: p.x + Math.cos(an) * l, y2: p.y + Math.sin(an) * l, life: .7 }); } eachNear(p.x, p.y, r, e => { dmg(e, tot.maxHp * a.m[s], { col: ROCK }); stun(e, a.st[s]); }); } },
    { id: 'fissure', name: 'Fissure', v: [6, 5, 4], n: [14, 18, 22], d: (a, s) => `Every ${a.v[s]}s the ground cracks open towards the enemy, rooting and hitting everything along it`,
      fire(a, s) { const an = aim(), ox = S.p.x, oy = S.p.y; sfx('rumble'); for (let i = 0; i < a.n[s]; i++) { const d1 = 20 + i * 620 / (a.n[s] - 1); later(i * .035, () => { const x = ox + Math.cos(an) * d1, y = oy + Math.sin(an) * d1; FX({ k: 'crack', x1: x, y1: y, x2: x + Math.cos(an) * (620 / (a.n[s] - 1) + 4) + rnd(-6, 6), y2: y + Math.sin(an) * (620 / (a.n[s] - 1) + 4) + rnd(-6, 6), life: 1.2 }); boom(x, y, 24, tot.maxHp * .15, ROCK, { stun: 1, small: true, quiet: true }); }); } } },
    { id: 'stoneskin', name: 'Stone Skin', v: [3, 6, 10], hp: [8, 15, 25], d: (a, s) => `+${a.v[s]} armor and +${a.hp[s]}% max HP`,
      stats(a, s, t) { t.armor += a.v[s]; t.hpMul *= 1 + a.hp[s] / 100; } },
    { id: 'rockfall', name: 'Rockfall', v: [4, 3, 2], n: [2, 3, 5], m: [.25, .32, .42], d: (a, s) => `Every ${a.v[s]}s ${a.n[s]} rocks fall on enemies, stunning them`,
      fire(a, s) { const dm = tot.maxHp * a.m[s]; shuffle(inArena()).slice(0, a.n[s]).forEach((e, i) => { const x = e.x, y = e.y; later(i * .1, () => FX({ k: 'warn', x, y, r: 30, life: .35, col: ROCK })); later(i * .1 + .35, () => { boom(x, y, 30, dm, ROCK, { stun: .5, small: true }); puff(x, y, '#8a7350', 6, 110, .4); }); }); } },
    { id: 'thornskin', name: 'Thorn Skin', v: [12, 26, 50], p: [30, 60, 120], d: (a, s) => `+${a.v[s]} thorn damage and +${a.p[s]}% thorn damage multiplier`,
      stats(a, s, t) { t.thornFlat += a.v[s]; t.thornPct += a.p[s]; } },
    { id: 'retri', name: 'Retribution', v: [50, 100, 200], d: (a, s) => `Thorns also hurl back ${a.v[s]}% of the damage each hit would deal` },
    { id: 'titan', name: "Titan's Grip", v: [1, 2, 3.5], d: (a, s) => `Weapon hits deal bonus damage equal to ${a.v[s]}% of your max HP` },
    { id: 'jugger', name: 'Juggernaut', v: [50, 100, 200], late: true, d: (a, s) => `Gain flat weapon damage equal to ${a.v[s]}% of your armor`,
      stats(a, s, t) { t.flat += t.armor * a.v[s] / 100; } },
  ]),
};
const AB_COUNT = Object.keys(AB).length;

// ===== boss relics: after every boss you pick 1 of 3. Rule-benders that last the whole run. Same hooks as abilities.
const RELICS = [
  { id: 'exec', name: "Executioner's Mark", col: '#e5484d', d: 'Weapon hits instantly kill normal enemies below 15% HP',
    hit(a, s, w, e) { if (!e.dead && !e.boss && !e.elite && !e.special && e.hp < e.maxHp * .15) dmg(e, e.hp + 1, { tr: true, col: '#ffffff', src: 'execute' }); } },
  { id: 'tenth', name: 'Tenth Strike', col: '#ffd23f', d: 'Every 10th weapon hit is a guaranteed crit with +100% crit damage' },
  { id: 'frostfire', name: 'Frostfire Brand', col: '#c08bff', d: 'Burning enemies are slowed by 30% and count as chilled for damage bonuses' },
  { id: 'magnet', name: 'Lodestone Heart', col: '#f2c14e', d: '+200% pickup range; every pickup heals 1 HP', stats(a, s, t) { t.pickup += 200; } },
  { id: 'wind', name: 'Second Wind', col: '#5ee08a', d: 'Once per wave, when you would die, recover to 50% HP',
    death() { if (S.windUsed) return false; S.windUsed = true; S.p.hp = tot.maxHp * .5; S.p.inv = 2; sfx('revive'); banner('Second Wind'); FX({ k: 'boom', x: S.p.x, y: S.p.y, r: 90, life: .6, col: COL.green }); return true; } },
  { id: 'glass', name: 'Glass Edge', col: '#ff5a3c', late: true, d: '+40% damage, but −25% max HP', stats(a, s, t) { t.dmgPct += 40; t.hpMul *= .75; } },
  { id: 'bulwark', name: 'Bulwark', col: '#c9cbd6', d: '+10 armor, but −10% move speed', stats(a, s, t) { t.armor += 10; t.speed -= 10; } },
  { id: 'blood', name: 'Bloodlust', col: '#e5484d', d: 'Each kill gives +1% attack speed for the rest of the wave (max +50%)', kill() { S.blood = Math.min(50, S.blood + 1); } },
  { id: 'twin', name: 'Twin Souls', col: '#5ee08a', d: 'Every golem summon brings one more golem' },
  { id: 'echo', name: 'Echo Chamber', col: '#4fc3ff', d: 'Timed abilities have 20% chance to fire twice' },
  { id: 'rush', name: 'Gold Rush', col: '#f2c14e', d: '+50% gold, and your first shop reroll each wave is free' },
  { id: 'scholar', name: "Scholar's Lens", col: '#9b8cff', d: '+30% XP' },
  { id: 'clock', name: 'Overclock', col: '#ffd23f', d: 'All timed abilities recharge 25% faster' },
  { id: 'hide', name: 'Thick Hide', col: '#c9a25a', d: 'Take 15% less damage from every hit' },
  { id: 'slayer', name: 'Giant Slayer', col: '#ff5a3c', d: '+60% damage to bosses and elites', mult(a, s, e) { return e.boss || e.elite ? 1.6 : 1; } },
  { id: 'combust', name: 'Combustion', col: '#ff8a2a', d: 'Every new ignite instantly sets off all the burn already on that enemy, then starts a fresh burn' },
  { id: 'vamp', name: 'Vampiric Sigil', col: '#e5484d', d: '+4% life steal', stats(a, s, t) { t.leech += 4; } },
];
const RELIC = {}; for (const r of RELICS) RELIC[r.id] = r;
const HOOKS = ['fire', 'frame', 'hit', 'kill', 'hurt', 'mult', 'stats', 'gHit', 'gKill', 'gDie', 'death'];
