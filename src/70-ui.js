// ===== menus. Phone first: every menu is a full-screen sheet with tabs, so nothing needs page scrolling.
const screen = $('screen');
function showScreen(html, key) {
  // re-rendering the same view (buying, rerolling) keeps the scroll position
  const same = key && screen.dataset.key === key && screen.classList.contains('show');
  const old = same ? screen.querySelector('.sbody') : null, st = old ? old.scrollTop : 0;
  screen.innerHTML = html; screen.dataset.key = key || ''; screen.classList.add('show');
  if (same) { const nb = screen.querySelector('.sbody'); if (nb) nb.scrollTop = st; }
}
function hideScreen() { screen.classList.remove('show'); screen.innerHTML = ''; screen.dataset.key = ''; }
function sheet(o) {
  return `<div class="sheet ${o.small ? 'small' : ''}">
    <div class="shead"><div>${o.title}${o.sub ? `<div class="hint">${o.sub}</div>` : ''}</div><div class="hr">${o.right || ''}</div></div>
    ${o.tabs ? `<div class="tabs">${o.tabs.map(([k, l]) => `<button class="tab ${k === o.tab ? 'on' : ''}" data-act="${o.tabAct}:${k}">${l}</button>`).join('')}</div>` : ''}
    <div class="sbody">${o.body}</div>
    ${o.foot ? `<div class="sfoot">${o.foot}</div>` : ''}</div>`;
}
const unit = (v, u) => `${fmt(v)}${u}`;
const coin = n => `<span class="gc">●</span> ${n}`;

// ---- shared pieces
function elemLine(w) {
  const g = (c, k) => S ? E(c, k) : EDEF[c][k].base, t = w.tier;
  if (w.el === 'red') return w.evo ? 'Always ignites · 25% chance to explode' : `${fmt(g('red', 'ign'))}% chance to ignite`;
  if (w.el === 'yellow') return `Attacks 40% faster · ${fmt(g('yellow', 'strikeCh'))}% to call a strike for ${fmt(g('yellow', 'strike'))}% of current HP${w.evo ? ' · 35% extra strike chance' : ''}`;
  if (w.el === 'blue') return `${fmt(g('blue', 'chillCh'))}% chance to chill (+${(t >= 2 ? 2 : 1) + (w.evo ? 1 : 0)}); 4 freezes${w.evo ? ' · 12% instant freeze' : ''}`;
  return `Golem every ${SUM_CD}s · +${THF[t] * (w.evo ? 2 : 1)} thorns · +${EHP[t] * (w.evo ? 2 : 1)} max HP${w.evo ? ' · hits add 3% of max HP' : ''}`;
}
function weaponCard(w, act, foot) {
  const T = TYPES[w.type], d = Math.round(T.dmg * TM[w.tier] * (w.evo ? 1.5 : 1) * (w.el === 'yellow' ? YEL_DMG : 1));
  return `<button class="card ${act ? '' : 'off'}" style="--c:${COL[w.el]}" ${act ? `data-act="${act}"` : 'disabled'}>
    <div class="t"><span class="ic">${svg(w.type, COL[w.el])}<span>${wName(w)}</span></span><b style="color:${COL[w.el]}">${w.evo ? '★' : ROMAN[w.tier]}</b></div>
    <div class="ln"><b style="color:var(--gold)">${T.role}</b> · ${d} dmg · ${T.how}</div><div class="ln hint">${T.trait}</div><div class="ln">${elemLine(w)}</div>
    ${w.afx.map(k => `<div class="ln af">◆ ${statText(k, afxVal(k, w))}</div>`).join('')}${foot || ''}</button>`;
}
function elemSetsHtml(sets, counts) {
  return ORDER.map(c => {
    const n = (counts && counts[c]) || 0;
    return `<div class="rs ${counts && n ? 'own' : ''}" style="--c:${COL[c]}"><div class="h"><span>${ELEM[c]}</span><span>${counts ? n + ' / 6' : ''}</span></div>
      ${sets[c].map((a, i) => `<div class="e ${n >= ETHRESH[i] ? 'on' : ''}"><span class="pips">${'◆'.repeat(i + 1)}${'◇'.repeat(2 - i)}</span><b>(${ETHRESH[i]}) ${a.name}</b><br>${a.d(a, i)}</div>`).join('')}</div>`;
  }).join('');
}
// synergy list: hidden until discovered (in any run). Shows this run's version of each pair.
function synHtml(roll, counts) {
  const row = (a, label, s) => {
    const known = CODEX.syn[a.id], on = S && S.synId === a.id;
    const cols = a.els.map(c => COL[c]), lbl = a.els.map(c => `<b style="color:${COL[c]}">${ELEM[c]}</b>`).join(' + ');
    if (!known) return `<div class="cx" style="--c:${cols[0]};border-left:3px solid;border-image:linear-gradient(${cols.join(',')}) 1">${lbl}: <b>???</b><br><span class="hint">${label}</span></div>`;
    return `<div class="cx ${on ? '' : ''}" style="--c:${cols[0]};${on ? 'background:linear-gradient(90deg,' + rgba(cols[0], .16) + ',' + rgba(cols[cols.length - 1], .1) + ');border-color:' + rgba(cols[0], .6) : ''}">${lbl} · <b>${a.name}</b>${on ? ` <span class="rare" style="background:var(--green)">${a.els.length === 3 ? 'ACTIVE' : s ? 'MAJOR' : 'MINOR'}</span>` : ''}<br>${a.els.length === 3 ? a.major : `${a.minor}.<br><span class="hint">Major (4+2):</span> ${a.major}`}</div>`;
  };
  let h = PAIRS.map(([x, y]) => { const k = pairKey(x, y); return row(SYN_PAIRS[k][roll[k]], 'Own 2 of each to reveal', S && S.synId === SYN_PAIRS[k][roll[k]].id ? S.synS : 0); }).join('');
  h += '<h3>Trios <span>· own 2 each of three elements</span></h3>' + TRIOS.map(t => row(SYN_TRIOS[t.join('+')], 'Own 2 of each of these three to reveal', 1)).join('');
  return h;
}
function typeSetsHtml(tsets, counts) {
  return `<div class="cols">${TYPE_KEYS.map(t => {
    const n = (counts && counts[t]) || 0, own = counts && n > 0, c = own ? COL.gold : COL.steel;
    return `<div class="rs ${own ? 'own' : ''}" style="--c:${c}"><div class="h"><span>${svg(t, c)}${TYPES[t].n}</span><span>${counts ? n + ' / 6' : ''}</span></div>
      ${tsets[t].map((k, i) => `<div class="e ${n >= TTHRESH[i] ? 'on' : ''}"><b>(${TTHRESH[i]})</b> ${statText(k, STAT[k].set)}</div>`).join('')}</div>`;
  }).join('')}</div>`;
}
function countChips() {
  const el = ORDER.filter(c => S.counts[c]).map(c => `<span class="chip" style="--c:${COL[c]}"><b>${ELEM[c]}</b> ${S.counts[c]}/6</span>`).join('')
    + (S.synId ? `<span class="chip" style="--c:var(--green)"><b>⚡ ${CODEX.syn[S.synId] ? SYN[S.synId].name : '???'}</b></span>` : '');
  const ty = TYPE_KEYS.filter(t => S.tcounts[t]).map(t => `<span class="chip" style="--c:${COL.gold}">${TYPES[t].n} ${S.tcounts[t]}</span>`).join('');
  return `<div class="chips" style="margin-bottom:10px">${el}${ty}</div>`;
}
function statsHtml() {
  const row = (l, v) => `<span>${l} <b>${v}</b></span>`;
  const passives = ORDER.map(c => { const ch = EPASS[c].filter(d => S.ep[c][d.k]).map(d => `${d.t} <b>${unit(E(c, d.k), d.u)}</b>`); return ch.map(x => `<span class="chip" style="--c:${COL[c]};white-space:normal">${x}</span>`).join(''); }).join('');
  const relics = S.relics.map(id => `<div class="cx" style="--c:${RELIC[id].col}"><b>${RELIC[id].name}</b><br>${RELIC[id].d}</div>`).join('');
  return `<div class="stats">
    ${row('Max HP', Math.round(tot.maxHp))}${row('Ability power', Math.round(S.ab || 0))}${row('Damage', '+' + fmt(tot.dmgPct) + '%')}${row('Flat damage', '+' + fmt(tot.flat))}${row('Attack speed', '+' + fmt(tot.atkSpd) + '%')}
    ${row('Crit chance', fmt(tot.crit) + '%')}${row('Crit damage', Math.round(tot.critMult * 100) + '%')}${row('Armor', fmt(tot.armor))}${row('Penetration', fmt(tot.pen))}
    ${row('HP regen', fmt(tot.regen) + '/s')}${row('Life steal', fmt(tot.leech) + '%')}${row('Move speed', '+' + fmt(tot.speed) + '%')}${row('Attack range', '+' + fmt(tot.range) + '%')}
    ${row('Stun chance', fmt(tot.stun) + '%')}${row('Knockback', fmt(tot.knock) + '%')}${row('Pickup range', '+' + fmt(tot.pickup) + '%')}${row('Thorns', tot.thornFlat > 0 ? `${Math.round(tot.thornFlat * tot.thornPct / 100)} (pen ${fmt(tot.thornPen)})` : '—')}
  </div>
  ${relics ? `<h3>Relics</h3>${relics}` : ''}
  ${passives ? `<h3>Element upgrades</h3><div class="chips">${passives}</div>` : ''}`;
}
function audioBtns() { return `<button class="btn sm ${AU.on.music ? 'on' : ''}" data-act="audio:music">♪ Music ${AU.on.music ? 'on' : 'off'}</button><button class="btn sm ${AU.on.sfx ? 'on' : ''}" data-act="audio:sfx">Sound ${AU.on.sfx ? 'on' : 'off'}</button>`; }

// ---- start screen
function renderStart() {
  if (!pendingRun) pendingRun = rollRun();
  checkUpdate();
  const b = bestWave(), sv2 = loadSave(), seen = Object.keys(CODEX.ab).length + Object.keys(CODEX.rel).length + Object.keys(CODEX.syn).length, total = AB_COUNT + RELICS.length + SYN_COUNT;
  let body = '';
  if (UI.stab === 'play') {
    if (updateInfo) body += `<div class="note green split"><span><b>Update available</b> (v${updateInfo.version})${updateInfo.notes ? `<br><span class="hint">${updateInfo.notes}</span>` : ''}${updateInfo.err ? '<br><span style="color:var(--hp)">Download failed. Check your connection and try again.</span>' : ''}</span>
      <button class="btn ok" data-act="update" ${updating ? 'disabled' : ''}>${updating ? 'Updating…' : 'Update now'}</button></div>`;
    if (sv2) body += `<div class="note split"><span><b>Saved run</b> · wave ${sv2.phase === 'fight' ? sv2.wave : sv2.wave + 1}${sv2.wave >= 20 ? ' (endless)' : ''} · level ${sv2.level}<br><span class="hint">Starting a new run replaces it.</span></span><button class="btn go" data-act="continue">Continue ▶</button></div>`;
    body += `<h3>Choose your first weapon</h3><div class="grid2">${pendingRun.starters.map((w, i) => weaponCard(w, `start:${i}`)).join('')}</div>
      <div class="row" style="margin-top:12px"><button class="btn" data-act="reroll-run">Roll a different run</button>${audioBtns()}</div>
      <p class="hint" style="margin-top:12px">Every run rolls new bonuses: check the <b>Elements</b> and <b>Weapons</b> tabs before you pick. Move with the stick (drag anywhere) or WASD. Weapons attack on their own.</p>`;
  } else if (UI.stab === 'elements') body = `<h3>This run's element bonuses <span>· own 2 / 4 / 6 weapons of a colour</span></h3>${elemSetsHtml(pendingRun.sets)}<h3>Synergies <span>· mix elements: 2+2 minor, 4+2 major, 2+2+2 trio</span></h3>${synHtml(pendingRun.syn)}`;
  else if (UI.stab === 'types') body = `<h3>This run's weapon type bonuses <span>· own 1 / 3 / 6 of a type</span></h3>${typeSetsHtml(pendingRun.tsets)}`;
  else body = codexHtml();
  showScreen(sheet({ title: '<h1>Last <em>Circle</em></h1>', sub: `Hold the circle. ${b ? 'Best: wave ' + b + ' · ' : ''}v${GAME_VERSION}`,
    tabs: [['play', 'Play'], ['elements', 'Elements'], ['types', 'Weapons'], ['codex', `Codex ${seen}/${total}`]], tab: UI.stab, tabAct: 'stab', body }), 'start:' + UI.stab);
}
function codexHtml() {
  let h = '<p class="hint" style="margin-top:0">Abilities are added here when you unlock them in a run; relics when you take them.</p>';
  for (const c of ORDER) h += `<h3 style="color:${COL[c]}">${ELEM[c]} · ${ABIL[c].filter(a => CODEX.ab[a.id]).length}/${ABIL[c].length}</h3>` + ABIL[c].map(a => CODEX.ab[a.id] ? `<div class="cx" style="--c:${COL[c]}"><b>${a.name}</b><br>${a.d(a, 0)}</div>` : `<div class="cx un"><b>???</b></div>`).join('');
  const allSyn = Object.values(SYN);
  h += `<h3>Synergies · ${allSyn.filter(a => CODEX.syn[a.id]).length}/${SYN_COUNT}</h3>` + allSyn.map(a => CODEX.syn[a.id] ? `<div class="cx" style="--c:${COL[a.els[0]]}"><b>${a.name}</b> <span class="hint">${a.els.map(c => ELEM[c]).join(' + ')}</span><br>${synText(a, 1)}</div>` : `<div class="cx un"><b>???</b> <span class="hint">${a.els.map(c => ELEM[c]).join(' + ')}</span></div>`).join('');
  h += `<h3>Boss relics · ${RELICS.filter(r => CODEX.rel[r.id]).length}/${RELICS.length}</h3>` + RELICS.map(r => CODEX.rel[r.id] ? `<div class="cx" style="--c:${r.col}"><b>${r.name}</b><br>${r.d}</div>` : `<div class="cx un"><b>???</b></div>`).join('');
  return h;
}

// ---- level up
function renderLevelUp() {
  saveRun();
  const cards = S.perkOffer.map((c, i) => {
    let main;
    if (c.el) { const { c: el, d } = c.el, cur = E(el, d.k), next = Math.min(d.cap, cur + d.v); main = `<div class="el">${ELEM[el]}</div><div class="big">+${unit(d.v, d.u)} ${d.t}</div><div class="hint">${unit(cur, d.u)} → ${unit(next, d.u)}${next >= d.cap ? ' · MAXED' : ` · max ${unit(d.cap, d.u)}`}</div>`; }
    else main = `<div class="el" style="color:var(--dim)">Stat</div><div class="big">${c.pr.t(c.pv)}</div>`;
    return `<div class="card flat ${c.locked ? 'kept' : ''}" style="--c:${c.el ? COL[c.el.c] : '#666'}">${main}
      ${c.el ? `<div class="sec"><small>Bonus stat ${c.rare ? '<span class="rare">RARE</span>' : ''}</small>${c.pr.t(c.pv)}</div>` : ''}
      <div class="row" style="margin-top:auto"><button class="btn go wide" data-act="perk:${i}">Take</button><button class="btn ${c.locked ? 'on' : ''}" data-act="lvlock:${i}">${c.locked ? '🔒 Kept' : 'Keep'}</button></div></div>`;
  }).join('');
  showScreen(sheet({ small: true, title: `<h2 style="color:var(--xp)">Level up</h2>`, sub: S.pendingLv > 1 ? `${S.pendingLv} level-ups to spend` : 'Choose one upgrade',
    right: `<button class="btn" data-act="lvreroll" ${S.lvRerolls > 0 ? '' : 'disabled'}>Reroll (${S.lvRerolls})</button>`,
    body: `<div class="grid3">${cards}</div><p class="hint" style="margin:10px 0 0">“Keep” holds a card for your next level-up. Upgrades lean towards the elements you use and leave the pool once maxed.</p>` }), 'levelup');
}
function renderRelic() {
  saveRun();
  const cards = S.relicOffer.map(id => { const r = RELIC[id]; return `<div class="card flat" style="--c:${r.col}"><div class="el">Relic</div><div class="big">${r.name}</div><div class="ln" style="font-size:13px">${r.d}</div><button class="btn go" style="margin-top:auto" data-act="relic:${id}">Take</button></div>`; }).join('');
  showScreen(sheet({ small: true, title: `<h2 style="color:var(--gold)">The king falls</h2>`, sub: 'Choose a relic. It lasts for the rest of the run.', body: `<div class="grid3">${cards}</div>` }), 'relic');
}

// ---- shop
function renderShop() {
  saveRun();
  const g = Math.floor(S.gold), full = S.weapons.length >= 6, endless = S.wave >= 20;
  let body = '';
  if (UI.tab === 'shop') {
    if (S.synNote) { const a = SYN[S.synNote]; body += `<div class="note green"><b>Synergy discovered: ${a.name}!</b><br>${synText(a, S.synS)}</div>`; }
    if (S.wave === 20) body += `<div class="note red"><b>Endless begins next wave.</b> The shop stays open, and you can now trade gold for XP below.</div>`;
    if (S.lastLost) body += `<div class="note">Left on the floor last wave: ${[S.lastLost.gold ? S.lastLost.gold + ' gold' : '', S.lastLost.xp ? S.lastLost.xp + ' XP' : ''].filter(Boolean).join(' and ')}. Grab loot before the collect timer ends.</div>`;
    body += countChips();
    body += `<div class="grid2">${S.offers.map((o, i) => {
      if (!o) return `<div class="card off" style="--c:#333;justify-content:center;align-items:center;min-height:110px"><span class="hint">Sold</span></div>`;
      const pr = priceOf(o.tier);
      return weaponCard(o, g >= pr && !full ? `buy:${i}` : '', `<div class="price">● ${pr}${full ? ' <span class="hint">slots full</span>' : ''}</div>`);
    }).join('')}</div>
    <div class="row" style="margin-top:10px">
      <button class="btn" data-act="reroll" ${g < S.rerollCost ? 'disabled' : ''}>Reroll ${S.rerollCost ? coin(S.rerollCost) : '<span class="gc">free</span>'}</button>
      <button class="btn ${S.shopLocked ? 'on' : ''}" data-act="lock">${S.shopLocked ? '🔒 Locked' : 'Lock shop'}</button>
      <button class="btn" data-act="buylvr" ${g < lvRerollPrice() ? 'disabled' : ''}>+1 level-up reroll ${coin(lvRerollPrice())}</button>
    </div>
    <p class="hint" style="margin:6px 0 0">${S.shopLocked ? 'Locked: what’s left here carries into the next shop.' : `Level-up rerolls: ${1 + S.lvRerollBuys} each.`}</p>`;
    if (endless) body += `<div class="note red" style="margin-top:12px"><b>Trade gold for XP</b> <span class="hint">2 gold = 1 XP</span><div class="row" style="margin-top:8px">${[[.25, '25%'], [.5, '50%'], [1, 'All']].map(([f, l]) => `<button class="btn sm" data-act="xp:${f}" ${g < 2 ? 'disabled' : ''}>${l} → ${Math.floor(Math.floor(g * f) * GOLD_TO_XP)} XP</button>`).join('')}</div></div>`;
  } else if (UI.tab === 'weapons') {
    body = S.weapons.map(w => {
      const uc = upCost(w.tier), ec = evoCost();
      const up = w.evo ? `<span class="hint">EVOLVED</span>` : w.tier < 3 ? `<button class="btn sm" data-act="up:${w.id}" ${g < uc ? 'disabled' : ''}>Upgrade ${coin(uc)}</button>`
        : canEvolve(w) ? `<button class="btn sm ok" data-act="evo:${w.id}" ${g < ec ? 'disabled' : ''}>Evolve ${ec}</button>` : `<span class="hint">MAX</span>`;
      return `<div class="wrow" style="--c:${COL[w.el]}">${svg(w.type, COL[w.el])}<span class="n">${wName(w)} <span style="color:${COL[w.el]}">${w.evo ? '★' : ROMAN[w.tier]}</span><small>${w.afx.map(k => statText(k, afxVal(k, w))).join(' · ')}</small></span>
        <span class="acts">${up}<button class="btn sm" data-act="sell:${w.id}" ${S.weapons.length <= 1 ? 'disabled' : ''}>Sell +${sellVal(w)}</button></span></div>`;
    }).join('') + Array(Math.max(0, 6 - S.weapons.length)).fill('<div class="wrow empty">Empty slot</div>').join('')
      + `<p class="hint">Upgrading a weapon also strengthens its own two stats. With all 6 weapons of one element, a tier IV weapon of that element can <b style="color:var(--green)">evolve</b> into a legendary.</p>`;
  } else if (UI.tab === 'bonus') {
    body = `<h3>Elements <span>· own 2 / 4 / 6 of a colour</span></h3>${elemSetsHtml(S.runSets, S.counts)}<h3>Synergies <span>· 2+2 minor, 4+2 major, 2+2+2 trio</span></h3>${synHtml(S.synRoll, S.counts)}<h3>Weapon types <span>· own 1 / 3 / 6 of a type</span></h3>${typeSetsHtml(S.typeSets, S.tcounts)}`;
  } else body = statsHtml();
  const nw = S.wave + 1;
  showScreen(sheet({ title: '<h2>Shop</h2>', sub: `Wave ${S.wave} cleared`, right: `<div class="goldbox">${g}</div>`,
    tabs: [['shop', 'Shop'], ['weapons', `Weapons ${S.weapons.length}/6`], ['bonus', 'Bonuses'], ['stats', 'Stats']], tab: UI.tab, tabAct: 'tab', body,
    foot: `<button class="btn go wide" data-act="next">Wave ${nw}${nw % 10 === 0 ? ' · Boss' : nw === 21 ? ' · Endless' : ''} ▶</button>` }), 'shop:' + UI.tab);
}

// ---- pause / game over
function togglePause() {
  if (!S || S.phase !== 'fight') return;
  paused = !paused;
  if (paused) renderPause(); else hideScreen();
}
function renderPause() {
  let body;
  if (UI.ptab === 'menu') body = `<div class="row"><button class="btn go wide" data-act="resume">Resume</button></div><div class="row" style="margin-top:10px">${audioBtns()}</div>
    <div class="row" style="margin-top:10px"><button class="btn wide" data-act="quit">Save &amp; quit to menu</button></div>
    <p class="hint">Your run is saved at the start of every wave. Quitting now brings you back to the start of wave ${S.wave}.</p>`;
  else if (UI.ptab === 'bonus') body = countChips() + elemSetsHtml(S.runSets, S.counts) + '<h3>Synergies</h3>' + synHtml(S.synRoll, S.counts) + typeSetsHtml(S.typeSets, S.tcounts);
  else body = statsHtml();
  showScreen(sheet({ title: '<h2>Paused</h2>', sub: `Wave ${S.wave} · level ${S.level}`, tabs: [['menu', 'Menu'], ['bonus', 'Bonuses'], ['stats', 'Stats']], tab: UI.ptab, tabAct: 'ptab', body }), 'pause:' + UI.ptab);
}
function renderDead() {
  showScreen(sheet({ small: true, title: `<h2 style="color:var(--hp)">Fallen</h2>`, sub: `The circle broke on wave ${S.wave}${S.wave > 20 ? ', deep in the endless waves' : ''}`,
    body: `<p style="margin:0 0 8px">Level ${S.level} · ${S.kills} kills · best wave ${bestWave()}</p>
      <div class="chips">${S.weapons.map(w => `<span class="chip" style="--c:${COL[w.el]}">${wName(w)} ${w.evo ? '★' : ROMAN[w.tier]}</span>`).join('')}${S.relics.map(id => `<span class="chip" style="--c:${RELIC[id].col}">${RELIC[id].name}</span>`).join('')}</div>`,
    foot: `<button class="btn wide" data-act="runstats" style="margin-bottom:8px">Run stats</button><button class="btn go wide" data-act="restart">New run</button>` }), 'dead');
}
const SRC_NAME = { weapon: 'Weapon hits', burn: 'Burn', lightning: 'Lightning', explosion: 'Explosions', thorns: 'Thorns', bleed: 'Bleed', execute: 'Executes', golem: 'Golems', shatter: 'Shatter', steam: 'Steam bursts', ability: 'Other abilities' };
const SRC_COL = { weapon: '#e8e6f0', burn: '#ff8a4a', lightning: '#ffd23f', explosion: '#ff5a3c', thorns: '#e6c882', bleed: '#d0213f', execute: '#ffffff', golem: '#5ee08a', shatter: '#4fc3ff', steam: '#c9e8ff', ability: '#9b8cff' };
const big = n => n >= 1e6 ? fmt(Math.round(n / 1e5) / 10) + 'M' : n >= 1e4 ? fmt(Math.round(n / 100) / 10) + 'k' : fmt(Math.round(n));
function barList(entries, total, nameOf, colOf) {
  return entries.filter(([, v]) => v >= 1).sort((a, b) => b[1] - a[1]).map(([k, v]) => { const p = v / Math.max(1, total) * 100;
    return `<div class="bar"><div class="bl"><span>${nameOf(k)}</span><b>${big(v)} <span class="hint">${p < 1 ? '<1' : Math.round(p)}%</span></b></div><div class="bt"><i style="width:${Math.max(1.5, p)}%;background:${colOf(k)}"></i></div></div>`; }).join('');
}
function renderRunStats() {
  const r = S.rs, tab = UI.rtab || 'high';
  const mm = Math.floor(r.time / 60), ss = Math.floor(r.time % 60);
  const tile = (l, v, sub) => `<div class="tile"><span>${l}</span><b>${v}</b>${sub ? `<em>${sub}</em>` : ''}</div>`;
  let body;
  if (tab === 'high') {
    body = `<div class="tiles">
      ${tile('Wave reached', S.wave, S.wave > 20 ? 'endless' : '')}${tile('Time in combat', `${mm}:${String(ss).padStart(2, '0')}`)}
      ${tile('Damage dealt', big(r.dealt))}${tile('Biggest hit', big(r.big), SRC_NAME[r.bigSrc] || '')}
      ${tile('Kills', S.kills, `${r.elites} elite${r.elites === 1 ? '' : 's'} · ${r.bosses} boss${r.bosses === 1 ? '' : 'es'}`)}${tile('Crits', big(r.crits))}
      ${tile('Damage taken', big(r.taken))}${tile('Healed', big(r.healed))}
      ${tile('Closest call', Math.round(r.low * 100) + '% HP')}${tile('Gold collected', big(r.gold), `${r.bought} bought · ${r.rerolls} rerolls`)}
      ${r.strikes ? tile('Lightning strikes', big(r.strikes), r.execs ? r.execs + ' executes' : '') : ''}${r.stacks > 1 ? tile('Most burn stacks', r.stacks, 'on one enemy') : ''}
    </div>
    <h3>Damage by source</h3>${barList(Object.entries(r.src), r.dealt, k => SRC_NAME[k] || k, k => SRC_COL[k] || '#aaa')}
    ${Object.keys(r.wt).length ? `<h3>Weapon hits by type</h3>${barList(Object.entries(r.wt), Object.values(r.wt).reduce((a, b) => a + b, 0), k => TYPES[k].n, () => COL.gold)}` : ''}`;
  } else {
    const ab = ORDER.flatMap(c => S.runSets[c].map((a, i) => S.on[a.id] === i ? `<div class="cx" style="--c:${COL[c]}"><b>${a.name}</b> <span class="hint">${(S.counts[c] || 0)} ${ELEM[c]}</span><br>${a.d(a, i)}</div>` : '')).join('');
    const sy = S.synId ? SYN[S.synId] : null;
    const fought = []; for (let w = 10; w <= S.wave; w += 10) fought.push(`<span class="chip" style="--c:${BOSSES[bossKeyFor(w)].col}">W${w} ${BOSSES[bossKeyFor(w)].name}</span>`);
    body = countChips() + `<h3>Weapons</h3><div class="grid3">${S.weapons.map(w => weaponCard(w, null)).join('')}</div>
      ${ab ? `<h3>Active abilities</h3>${ab}` : ''}
      ${sy ? `<h3>Synergy</h3><div class="cx" style="--c:var(--green)"><b>${sy.name}</b> <span class="hint">${S.synS ? 'major' : 'minor'}</span><br>${synText(sy, S.synS)}</div>` : ''}
      ${fought.length ? `<h3>Bosses faced</h3><div class="chips">${fought.join('')}</div>` : ''}
      <h3>Final stats</h3>${statsHtml()}<h3>Weapon type bonuses</h3>${typeSetsHtml(S.typeSets, S.tcounts)}`;
  }
  showScreen(sheet({ title: '<h2>Run stats</h2>', sub: `Wave ${S.wave} · level ${S.level}`, tabs: [['high', 'Highlights'], ['build', 'Build']], tab, tabAct: 'runstats', body,
    foot: `<button class="btn wide" data-act="deadback">Back</button>` }), 'runstats:' + tab);
}

// ---- HUD
function renderSlots() {
  $('slots').innerHTML = Array.from({ length: 6 }, (_, i) => {
    const w = S && S.weapons[i];
    return w ? `<div class="slot ${w.evo ? 'evo' : ''}" style="border-color:${COL[w.el]}88;--c:${COL[w.el]}55">${svg(w.type, COL[w.el])}<b>${w.evo ? '★' : ROMAN[w.tier]}</b></div>` : `<div class="slot"></div>`;
  }).join('');
}
const hudCache = {};
function setText(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } }
function setWidth(id, f) { const v = Math.round(clamp(f, 0, 1) * 200) / 2 + '%'; if (hudCache[id + 'w'] !== v) { hudCache[id + 'w'] = v; $(id).style.width = v; } }
function updateHud() {
  if (!S) return;
  setWidth('hpB', S.p.hp / tot.maxHp); setText('hpT', `${Math.ceil(Math.max(0, S.p.hp))} / ${Math.round(tot.maxHp)}`);
  setWidth('xpB', S.xp / xpNeed()); setText('xpT', `LV ${S.level}${S.pendingLv ? '  +' + S.pendingLv : ''}`);
  setText('waveT', S.wave > 20 ? `Wave ${S.wave} · Endless` : `Wave ${S.wave}`);
  if (hudCache.endless !== S.wave > 20) { hudCache.endless = S.wave > 20; $('waveBox').classList.toggle('endless', S.wave > 20); }
  setText("leftT", `${S.toSpawn + S.enemies.length + (S.bossPending ? 1 : 0)} left`);
  setText('goldT', String(Math.floor(S.gold)));
}

// ---- one click handler for every button in every menu
function act(a, arg) {
  if (a === 'stab') { UI.stab = arg; renderStart(); return; }
  if (a === 'audio') { AU.setOn(arg, !AU.on[arg]); if (S && paused) renderPause(); else renderStart(); return; }
  if (a === 'start') { const st = pendingRun.starters[+arg]; newRun(st); pendingRun = null; return; }
  if (a === 'reroll-run') { sfx('click'); pendingRun = rollRun(); renderStart(); return; }
  if (a === 'continue') { const d = loadSave(); if (d) { pendingRun = null; resumeRun(d); } return; }
  if (a === 'update') { applyUpdate(); return; }
  if (a === 'restart' || a === 'quit') { paused = false; S = null; showHud(false); UI.stab = 'play'; renderStart(); return; }
  if (!S) return;
  if (a === 'ptab') { UI.ptab = arg; renderPause(); return; }
  if (a === 'runstats') { sfx('click'); UI.rtab = arg || 'high'; renderRunStats(); return; }
  if (a === 'deadback') { sfx('click'); renderDead(); return; }
  if (a === 'resume') { togglePause(); return; }
  if (a === 'tab') { UI.tab = arg; renderShop(); return; }
  if (a === 'perk') { choosePerk(+arg); return; }
  if (a === 'relic') { takeRelic(arg); return; }
  if (a === 'lvreroll') { if (S.lvRerolls > 0) { S.lvRerolls--; sfx('click'); S.lockedCards = S.perkOffer.filter(c => c.locked).map(c => ({ ...c, locked: false })); S.perkOffer = rollLevelCards(); renderLevelUp(); } return; }
  if (a === 'lvlock') { const c = S.perkOffer[+arg]; if (c) { c.locked = !c.locked; sfx('click'); renderLevelUp(); } return; }
  if (S.phase !== 'shop') return;
  const g = S.gold;
  if (a === 'next') { startWave(); return; }
  if (a === 'reroll') { if (g < S.rerollCost) return; sfx('click'); S.gold -= S.rerollCost; S.rerolls++; S.rs.rerolls++; S.rerollCost = rerollPrice(); S.offers = rollOffers(); S.shopLocked = false; }
  else if (a === 'lock') { S.shopLocked = !S.shopLocked; sfx('click'); }
  else if (a === 'buylvr') { const pr = lvRerollPrice(); if (g < pr) return; S.gold -= pr; S.lvRerollBuys++; sfx('buy'); }
  else if (a === 'xp') { const amt = Math.floor(Math.floor(g) * +arg); if (amt < 2) return; S.gold -= amt; gainXp(amt * GOLD_TO_XP); sfx('level'); if (S.pendingLv > 0) { nextMenu(); return; } }
  else if (a === 'buy') { const o = S.offers[+arg]; if (!o || S.weapons.length >= 6 || g < priceOf(o.tier)) return; sfx('buy'); S.gold -= priceOf(o.tier); S.offers[+arg] = null; S.rs.bought++; addWeapon(o); }
  else {
    const w = S.weapons.find(w => w.id === +arg); if (!w) return;
    if (a === 'up') { if (w.tier >= 3 || g < upCost(w.tier)) return; sfx('buy'); S.gold -= upCost(w.tier); w.tier++; recalc(); }
    else if (a === 'evo') { if (!canEvolve(w) || g < evoCost()) return; S.gold -= evoCost(); w.evo = true; sfx('evolve'); recalc(); }
    else if (a === 'sell') { if (S.weapons.length <= 1) return; sfx('coin'); S.gold += sellVal(w); S.weapons = S.weapons.filter(x => x !== w); recalc(); }
    else return;
  }
  renderShop();
}
