// ===== input, in-app updates, main loop, boot

// ---- in-app updates: the installed app checks GitHub for a newer game and can install it in place
const UPDATE_BASE = 'https://raw.githubusercontent.com/Darkz94/last-circle/main/';
const IS_APP = !!window.Capacitor;
let updateInfo = null, updateChecked = false, updating = false;
function checkUpdate() {
  if (!IS_APP || updateChecked || typeof fetch !== 'function') return;
  updateChecked = true;
  fetch(UPDATE_BASE + 'version.json?t=' + Date.now(), { cache: 'no-store' }).then(r => r.json()).then(v => {
    if (v && v.version > GAME_VERSION) { updateInfo = v; if (!S) renderStart(); }
  }).catch(() => {});
}
async function applyUpdate() {
  if (updating) return;
  updating = true; renderStart();
  try {
    const html = await (await fetch(UPDATE_BASE + 'game.html?t=' + Date.now(), { cache: 'no-store' })).text();
    const m = html.match(/const GAME_VERSION = (\d+);/);
    if (!m || +m[1] <= GAME_VERSION) throw new Error('not newer');
    localStorage.setItem('lcOta', JSON.stringify({ v: +m[1], html }));
    location.reload();
  } catch (e) { updating = false; updateInfo.err = true; renderStart(); }
}

// ---- input
addEventListener('keydown', e => {
  AU.init();
  const k = e.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  keys.add(k);
  if (k === 'm') AU.setOn('music', !AU.on.music);
  if (k === 'n') AU.setOn('sfx', !AU.on.sfx);
  if (!S) return;
  if (k === 'p' || k === 'escape') togglePause();
  if (S.phase === 'levelup' && ['1', '2', '3'].includes(k)) choosePerk(+k - 1);
  if (S.phase === 'levelup' && k === 'r') act('lvreroll');
  if (S.phase === 'shop' && k === 'enter') startWave();
});
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
addEventListener('pointerdown', () => AU.init(), true);
addEventListener('blur', () => { keys.clear(); if (S && S.phase === 'fight' && !paused) togglePause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && S && S.phase === 'fight' && !paused) togglePause(); });
cv.addEventListener('pointerdown', e => { joy.on = true; joy.id = e.pointerId; joy.ox = joy.x = e.clientX; joy.oy = joy.y = e.clientY; cv.setPointerCapture(e.pointerId); });
cv.addEventListener('pointermove', e => { if (joy.on && e.pointerId === joy.id) { joy.x = e.clientX; joy.y = e.clientY; } });
const endJoy = e => { if (e.pointerId === joy.id) joy.on = false; };
cv.addEventListener('pointerup', endJoy); cv.addEventListener('pointercancel', endJoy);
$('pauseBtn').addEventListener('click', () => togglePause());
screen.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b || b.disabled) return;
  AU.init();
  const i = b.dataset.act.indexOf(':');
  if (i < 0) act(b.dataset.act); else act(b.dataset.act.slice(0, i), b.dataset.act.slice(i + 1));
});
addEventListener('resize', resize);

// ---- main loop: the simulation always advances in fixed 1/60s steps, however fast the screen refreshes
let last = performance.now(), acc = 0;
function loop(now) {
  const ft = Math.min(.1, (now - last) / 1000); last = now;
  if (S && S.phase === 'fight' && !paused) {
    acc += ft;
    let n = 0;
    while (acc >= STEP && n < 4) { step(STEP); acc -= STEP; n++; if (!S || S.phase !== 'fight') break; }
    if (n === 4) acc = 0;
  } else acc = 0;
  AU.setMode(musicMode());
  draw();
  updateHud();
  requestAnimationFrame(loop);
}
function TEST_API() {
  return { get S() { return S; }, get pendingRun() { return pendingRun; }, set pendingRun(v) { pendingRun = v; }, tot, UI, AB, ABIL, RELICS, STAT, TYPES, CODEX,
    rollRun, newRun, resumeRun, loadSave, saveRun, step, draw, act, keys, makeWeapon, addWeapon, recalc, triggerEvent, nextMenu, startWave, choosePerk, takeRelic,
    SYN, BOSSES, spawnBoss, bossKeyFor, syn, priceOf, upCost, evoCost, canEvolve, canFuse, lvRerollPrice, E, sv, renderShop, renderStart, renderPause, musicMode, updateHud, nearest, setGold(v) { GOLD_RATE = v; }, setReroll(f) { RRF = f; } };
}
resize();
requestAnimationFrame(loop);
renderStart();
renderSlots();
