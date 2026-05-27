/**
 * Lightweight procedural sound effects via the Web Audio API — no asset files,
 * so nothing to license (important for a commercial game). Each weapon class gets
 * a distinct synthesized profile: a filtered noise "crack" plus a low "body"
 * thump, shaped by a fast-decay envelope, tuned per gun (boomy shotgun, sharp
 * sniper, fast SMG, etc.). Real samples can be swapped in later if desired.
 */

// Per-weapon-class sound profiles. Keyed by the FP visual name.
const SHOOT_PROFILES = {
  // crack = high-freq noise burst; body = low sine thump.
  rifle:    { lpStart: 7000, lpEnd: 1200, crackDur: 0.16, crackGain: 1.0, bodyHz: 120, bodyEnd: 50, bodyDur: 0.12, bodyGain: 0.7 },
  bullpup:  { lpStart: 9000, lpEnd: 2000, crackDur: 0.12, crackGain: 0.95, bodyHz: 140, bodyEnd: 60, bodyDur: 0.10, bodyGain: 0.6 },
  smg:      { lpStart: 8000, lpEnd: 2600, crackDur: 0.09, crackGain: 0.8, bodyHz: 170, bodyEnd: 80, bodyDur: 0.07, bodyGain: 0.45 },
  shotgun:  { lpStart: 4500, lpEnd: 500,  crackDur: 0.30, crackGain: 1.0, bodyHz: 90,  bodyEnd: 32, bodyDur: 0.30, bodyGain: 1.0 },
  sniper:   { lpStart: 9500, lpEnd: 800,  crackDur: 0.38, crackGain: 1.0, bodyHz: 100, bodyEnd: 38, bodyDur: 0.32, bodyGain: 0.85 },
  pistol:   { lpStart: 7000, lpEnd: 1500, crackDur: 0.11, crackGain: 0.8, bodyHz: 150, bodyEnd: 60, bodyDur: 0.09, bodyGain: 0.5 },
  revolver: { lpStart: 6000, lpEnd: 1000, crackDur: 0.22, crackGain: 1.0, bodyHz: 110, bodyEnd: 45, bodyDur: 0.18, bodyGain: 0.8 },
};

export class SoundFX {
  constructor() {
    this.ctx = null;
    this.master = null;
    this._noiseBuf = null;
    // Real-sample support: weapon name -> candidate file URLs. If a sample loads,
    // it's played instead of the synth. Drop files in visual/sounds/ (see README).
    this._samplePaths = null;
    this._buffers = {};       // name -> decoded AudioBuffer
    this._samplesLoaded = false;
  }

  /**
   * Register weapon -> sound-file paths. Each value is a list of candidate URLs
   * (e.g. ['sounds/rifle.mp3','sounds/rifle.wav']); the first that loads wins.
   */
  registerSamples(map) {
    this._samplePaths = map;
    if (this.ctx) this._loadSamples();
  }

  async _loadSamples() {
    if (this._samplesLoaded || !this._samplePaths || !this.ctx) return;
    this._samplesLoaded = true;
    for (const [name, urls] of Object.entries(this._samplePaths)) {
      for (const url of urls) {
        try {
          const res = await fetch(url);
          if (!res.ok) continue;
          const arr = await res.arrayBuffer();
          this._buffers[name] = await this.ctx.decodeAudioData(arr);
          console.log(`[audio] loaded sample: ${name} (${url})`);
          break;
        } catch (e) { /* missing/unsupported — try next, else synth fallback */ }
      }
    }
  }

  _ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return true;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    const len = Math.floor(this.ctx.sampleRate);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this._noiseBuf = buf;
    this._loadSamples(); // kick off sample loading now that ctx exists
    return true;
  }

  /** Resume the audio context (call from a user-gesture handler). */
  resume() { this._ensure(); }

  _playBuffer(buffer, volume) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const g = ctx.createGain();
    g.gain.value = Math.max(0.001, volume);
    src.connect(g); g.connect(this.master);
    src.start(ctx.currentTime);
  }

  /**
   * Play a weapon's shot sound: real sample if one is loaded, else synth.
   * @param {string} weaponName - FP visual name (rifle/smg/shotgun/...)
   * @param {number} volume - 0..1 loudness
   */
  shoot(weaponName, volume = 1.0) {
    if (!this._ensure()) return;
    if (this._buffers[weaponName]) { this._playBuffer(this._buffers[weaponName], volume); return; }
    const p = SHOOT_PROFILES[weaponName] || SHOOT_PROFILES.rifle;
    this._report(p, volume);
  }

  /** Backwards-compatible generic gunshot (rifle profile). */
  gunshot(volume = 1.0) { this.shoot('rifle', volume); }

  _report(p, volume) {
    if (!this._ensure()) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const v = Math.max(0.001, volume);

    // Crack: filtered noise, fast exponential decay.
    const src = ctx.createBufferSource();
    src.buffer = this._noiseBuf;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 300;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(p.lpStart, t);
    lp.frequency.exponentialRampToValueAtTime(p.lpEnd, t + p.crackDur * 0.8);
    const g = ctx.createGain();
    g.gain.setValueAtTime(v * p.crackGain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + p.crackDur);
    src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + p.crackDur + 0.02);

    // Body: low sine thump for weight.
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(p.bodyHz, t);
    osc.frequency.exponentialRampToValueAtTime(p.bodyEnd, t + p.bodyDur);
    const og = ctx.createGain();
    og.gain.setValueAtTime(v * p.bodyGain, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + p.bodyDur);
    osc.connect(og); og.connect(this.master);
    osc.start(t); osc.stop(t + p.bodyDur + 0.02);
  }

  /** Knife swing: short upward-sweeping filtered-noise whoosh (no body thump). */
  swing(volume = 0.7) {
    if (!this._ensure()) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const v = Math.max(0.001, volume);
    const src = ctx.createBufferSource();
    src.buffer = this._noiseBuf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(800, t);
    bp.frequency.exponentialRampToValueAtTime(3500, t + 0.18);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    src.connect(bp); bp.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + 0.24);
  }
}
