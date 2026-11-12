// ===== audio: all sound is synthesised with WebAudio, no files
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const AU = {
  ctx: null, on: { music: true, sfx: true }, last: {}, mode: null, step: 0, nextT: 0, voices: 0, wave: 1,
  load() { try { const s = JSON.parse(localStorage.getItem('lcAudio') || 'null'); if (s) this.on = s; } catch (e) {} },
  save() { try { localStorage.setItem('lcAudio', JSON.stringify(this.on)); } catch (e) {} },
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    const c = this.ctx = new C();
    this.comp = c.createDynamicsCompressor(); this.comp.threshold.value = -14; this.comp.ratio.value = 6; this.comp.connect(c.destination);
    this.master = c.createGain(); this.master.gain.value = .85; this.master.connect(this.comp);
    this.sfx = c.createGain(); this.sfx.gain.value = this.on.sfx ? .6 : 0; this.sfx.connect(this.master);
    this.mus = c.createGain(); this.mus.gain.value = this.on.music ? .32 : 0; this.mus.connect(this.master);
    const b = c.createBuffer(1, c.sampleRate, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = b;
    this.delay = c.createDelay(1); this.delay.delayTime.value = .33;
    const fb = c.createGain(); fb.gain.value = .35; this.delay.connect(fb); fb.connect(this.delay);
    const wet = c.createGain(); wet.gain.value = .4; this.delay.connect(wet); wet.connect(this.mus);
    this.nextT = c.currentTime + .1;
    setInterval(() => this.schedule(), 25);
  },
  setOn(k, v) {
    this.on[k] = v; this.save();
    if (this.ctx) (k === 'music' ? this.mus : this.sfx).gain.setTargetAtTime(v ? (k === 'music' ? .32 : .6) : 0, this.ctx.currentTime, .05);
  },
  // --- primitives
  tone(f, dur, o = {}) {
    const c = this.ctx, t = o.at || c.currentTime;
    const osc = c.createOscillator(), g = c.createGain();
    osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t + dur);
    if (o.detune) osc.detune.value = o.detune;
    const v = o.vol || .2, a = o.a || .004;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
    let node = osc;
    if (o.lp) { const f2 = c.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = o.lp; f2.Q.value = o.q || 1; node.connect(f2); node = f2; }
    node.connect(g); g.connect(o.dest || this.sfx);
    if (o.send) g.connect(this.delay);
    osc.start(t); osc.stop(t + dur + .02);
  },
  noise(dur, o = {}) {
    const c = this.ctx, t = o.at || c.currentTime;
    const src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const f = c.createBiquadFilter(); f.type = o.ft || 'lowpass'; f.frequency.setValueAtTime(o.f || 1000, t); f.Q.value = o.q || 1;
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    const g = c.createGain(), v = o.vol || .2;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + (o.a || .003)); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
    src.connect(f); f.connect(g); g.connect(o.dest || this.sfx);
    src.start(t, Math.random() * .5); src.stop(t + dur + .02);
  },
  // --- sound effects (throttled so hundreds of hits don't turn into mush)
  play(name, p = 1) {
    if (!this.ctx || !this.on.sfx) return;
    const now = this.ctx.currentTime, gap = { swing: .07, hit_red: .05, hit_blue: .05, hit_yellow: .05, hit_green: .05, boom: .06, zap: .05, freeze: .08, coin: .06, xp: .045, thorn: .07, rumble: .08, pop: .04, summon: .12, burn: .25 }[name] || 0;
    if (gap && now - (this.last[name] || 0) < gap) return;
    this.last[name] = now;
    const T = this.tone.bind(this), N = this.noise.bind(this);
    switch (name) {
      case 'swing': N(.08, { ft: 'bandpass', f: 1400, to: 500, q: 1.5, vol: .05 }); break;
      case 'hit_red': N(.08, { f: 900, vol: .1 }); T(150, .07, { vol: .08, to: 80 }); break;
      case 'hit_blue': T(1800 + Math.random() * 400, .06, { type: 'triangle', vol: .05 }); T(2700, .04, { vol: .03 }); break;
      case 'hit_yellow': T(1000, .05, { type: 'square', to: 300, vol: .03 }); break;
      case 'hit_green': T(330, .08, { type: 'triangle', vol: .06, to: 260 }); break;
      case 'boom': N(.35 * p, { f: 700, to: 90, vol: .22 * p }); T(110, .3 * p, { vol: .28 * p, to: 35 }); break;
      case 'zap': T(1300 + Math.random() * 500, .12, { type: 'sawtooth', to: 180, vol: .05, lp: 4000 }); N(.06, { ft: 'highpass', f: 3000, vol: .08 }); break;
      case 'freeze': [0, .03, .06].forEach((d, i) => T(1500 + i * 520, .14, { type: 'triangle', vol: .04, at: this.ctx.currentTime + d })); break;
      case 'rumble': N(.5 * p, { f: 260, to: 70, vol: .2 * Math.min(1.5, p) }); T(62, .45 * p, { vol: .22 * Math.min(1.5, p), to: 38 }); break;
      case 'thorn': T(1500, .05, { type: 'square', vol: .025, to: 700 }); N(.05, { ft: 'highpass', f: 4000, vol: .05 }); break;
      case 'event': T(660, .12, { type: 'triangle', vol: .06 }); T(990, .2, { type: 'triangle', vol: .05, at: now + .1, send: true }); break;
      case 'xp': T(900 + Math.random() * 300, .05, { type: 'triangle', vol: .025 }); break;
      case 'coin': T(1320, .05, { vol: .035 }); T(1760, .06, { vol: .03, at: now + .045 }); break;
      case 'pop': T(420, .06, { vol: .04, to: 110 }); break;
      case 'burn': N(.25, { f: 2500, ft: 'bandpass', vol: .04 }); break;
      case 'summon': T(480, .09, { vol: .05, to: 900, type: 'triangle' }); break;
      case 'hurt': T(170, .16, { type: 'square', to: 60, vol: .12, lp: 900 }); N(.1, { f: 600, vol: .12 }); break;
      case 'level': [69, 72, 76, 81].forEach((m, i) => T(mtof(m), .18, { type: 'triangle', vol: .08, at: now + i * .07, send: true })); break;
      case 'buy': T(880, .06, { vol: .06 }); T(1320, .1, { vol: .05, at: now + .06 }); break;
      case 'click': T(700, .03, { vol: .04 }); break;
      case 'whoosh': N(.3, { ft: 'bandpass', f: 300, to: 1600, q: 2, vol: .1 }); break;
      case 'flame': N(.9, { f: 1600, to: 600, vol: .09, a: .05 }); break;
      case 'gust': N(.45, { ft: 'bandpass', f: 700, to: 2600, q: 1.2, vol: .1, a: .05 }); break;
      case 'snap': N(.5, { ft: 'highpass', f: 2000, vol: .1 }); [88, 91, 95].forEach((m, i) => T(mtof(m), .4, { type: 'triangle', vol: .04, at: now + i * .02 })); break;
      case 'revive': T(200, .7, { type: 'sawtooth', to: 900, vol: .1, lp: 2500 }); N(.6, { f: 600, to: 3000, vol: .08 }); break;
      case 'wave': T(110, .7, { type: 'sawtooth', vol: .07, lp: 700, a: .05 }); T(165, .7, { type: 'sawtooth', vol: .05, lp: 700, a: .05 }); break;
      case 'boss': [55, 58].forEach(m => T(mtof(m - 12), 1.6, { type: 'sawtooth', vol: .12, lp: 500, a: .1 })); N(1.4, { f: 200, to: 1200, vol: .1, a: .3 }); break;
      case 'endless': T(mtof(33), 2.2, { type: 'sawtooth', vol: .1, lp: 300, a: .3 }); T(mtof(34), 2.2, { type: 'sawtooth', vol: .1, lp: 300, a: .3 }); N(2, { ft: 'bandpass', f: 4000, to: 300, vol: .06, a: .8 }); break;
      case 'crit': T(1900, .05, { type: 'triangle', vol: .04 }); T(2600, .07, { vol: .03, at: now + .03 }); break;
      case 'relic': [57, 64, 69, 76].forEach((m, i) => T(mtof(m), .5, { type: 'triangle', vol: .08, at: now + i * .09, send: true })); break;
      case 'evolve': T(110, .9, { type: 'sawtooth', to: 880, vol: .1, lp: 3000 }); [72, 76, 79, 84].forEach((m, i) => T(mtof(m), .4, { type: 'triangle', vol: .07, at: now + .5 + i * .06, send: true })); break;
      case 'tele': T(300, .25, { type: 'square', vol: .04, to: 600, lp: 1500 }); break;
      case 'death': T(220, 1.4, { type: 'sawtooth', to: 40, vol: .12, lp: 1200 }); N(1, { f: 400, to: 60, vol: .1 }); break;
    }
  },
  // --- music
  setMode(m) {
    if (m === this.mode) return;
    this.mode = m; this.step = 0;
    if (this.ctx) this.nextT = Math.max(this.nextT, this.ctx.currentTime + .05);
  },
  bpm() { return { calm: 76, fight: 112, boss: 142, endless: Math.min(150, 98 + (this.wave - 21) * 4) }[this.mode] || 100; },
  schedule() {
    if (!this.ctx || !this.mode) return;
    while (this.nextT < this.ctx.currentTime + .15) {
      if (this.on.music) this.playStep(this.step, this.nextT);
      this.nextT += 60 / this.bpm() / 4; this.step++;
    }
  },
  kick(t, v = .5) { this.tone(150, .22, { to: 40, vol: v, at: t, dest: this.mus }); },
  snare(t, v = .18) { this.noise(.14, { ft: 'bandpass', f: 1800, q: .8, vol: v, at: t, dest: this.mus }); this.tone(220, .08, { vol: v * .5, at: t, dest: this.mus, to: 140 }); },
  hat(t, v = .05) { this.noise(.04, { ft: 'highpass', f: 7000, vol: v, at: t, dest: this.mus }); },
  playStep(s, t) {
    const M = this.mus, b = s % 16, bar = Math.floor(s / 16), T = this.tone.bind(this);
    if (this.mode === 'calm') {
      const prog = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]][bar % 4];
      if (b === 0) prog.forEach(m => T(mtof(m - 12), 3.4, { type: 'triangle', vol: .05, a: .8, at: t, dest: M, lp: 1200 }));
      if (b % 2 === 0 && Math.random() < .55) T(mtof(pick(prog) + 12), .5, { vol: .035, at: t, dest: M, send: true });
    } else if (this.mode === 'fight') {
      const root = [45, 41, 43, 40][bar % 4], chord = [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]][bar % 4];
      if (b === 0 || b === 8 || (b === 10 && bar % 2)) this.kick(t, .45);
      if (b === 4 || b === 12) this.snare(t);
      if (b % 2 === 1) this.hat(t);
      if ([0, 3, 6, 8, 11, 14].includes(b)) T(mtof(root - 12), .2, { type: 'sawtooth', vol: .1, at: t, dest: M, lp: 500, q: 4 });
      if (b % 2 === 0) T(mtof(chord[(b / 2) % 3] + 12), .14, { type: 'square', vol: .02, at: t, dest: M, lp: 2200, send: true });
      if (b === 0) chord.forEach(m => T(mtof(m), 2, { type: 'triangle', vol: .025, a: .4, at: t, dest: M }));
    } else if (this.mode === 'boss') {
      const root = [45, 46, 45, 40][bar % 4];
      if (b % 4 === 0) this.kick(t, .55);
      if (b === 4 || b === 12) this.snare(t, .22);
      this.hat(t, b % 2 ? .05 : .03);
      T(mtof(root - 12 + (b % 2 ? 12 : 0)), .12, { type: 'square', vol: .07, at: t, dest: M, lp: 900, q: 6 });
      if (b === 0 || b === 6 || b === 10) [0, 3, 7].forEach(i => T(mtof(root + 12 + i), .16, { type: 'sawtooth', vol: .035, at: t, dest: M, lp: 2500 }));
      if (b === 0 && bar % 4 === 3) this.noise(1.6, { ft: 'bandpass', f: 400, to: 5000, vol: .07, a: 1.4, at: t, dest: M });
    } else if (this.mode === 'endless') {
      const n = this.wave - 20;
      // heartbeat
      if (b === 0) this.kick(t, .6);
      if (b === 2) this.kick(t, .4);
      if (n >= 3 && (b === 8)) this.kick(t, .5);
      if (n >= 3 && (b === 10)) this.kick(t, .3);
      // clock tick
      if (b % 4 === 0) T(3200, .02, { type: 'square', vol: .02, at: t, dest: M });
      if (n >= 2 && b % 2 === 1) this.hat(t, .03);
      if (n >= 5) this.hat(t, .02);
      // dissonant drone every bar
      if (b === 0) { T(mtof(33), 2.6, { type: 'sawtooth', vol: .06, a: .6, at: t, dest: M, lp: 260 }); T(mtof(34), 2.6, { type: 'sawtooth', vol: .05, a: .6, at: t, dest: M, lp: 260 }); }
      // tritone pulse
      if (b % 8 === 0) T(mtof(b === 0 ? 45 : 51) - 0, .4, { type: 'square', vol: .05, at: t, dest: M, lp: 700, q: 8 });
      // glassy diminished notes, echoed
      if (b % 2 === 0 && Math.random() < .2 + Math.min(.3, n * .03)) T(mtof(pick([81, 84, 87, 90, 93])), .7, { vol: .03, at: t, dest: M, send: true });
      if (b === 0 && bar % 4 === 3) this.noise(2.2, { ft: 'bandpass', f: 200, to: 6000, vol: .06, a: 2, at: t, dest: M });
    }
  },
};
AU.load();
const sfx = (n, p) => AU.play(n, p);
