/**
 * Lightweight procedural sound effects via the Web Audio API — no asset files.
 * A gunshot is a filtered noise "crack" plus a short low "body" thump, shaped by
 * a fast-decay envelope. The AudioContext is created lazily and resumed on demand
 * (browsers require a user gesture; the click-to-lock satisfies that).
 */
export class SoundFX {
  constructor() {
    this.ctx = null;
    this.master = null;
    this._noiseBuf = null;
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
    // 1s of white noise, reused for every shot.
    const len = Math.floor(this.ctx.sampleRate);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this._noiseBuf = buf;
    return true;
  }

  /** Resume the audio context (call from a user-gesture handler). */
  resume() { this._ensure(); }

  /**
   * Play a gunshot.
   * @param {number} volume - 0..1 loudness
   */
  gunshot(volume = 1.0) {
    if (!this._ensure()) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const v = Math.max(0.001, volume);

    // High-frequency crack: filtered noise with a fast exponential decay.
    const src = ctx.createBufferSource();
    src.buffer = this._noiseBuf;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 350;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(7000, t);
    lp.frequency.exponentialRampToValueAtTime(1200, t + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + 0.18);

    // Low body thump for weight.
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.1);
    const og = ctx.createGain();
    og.gain.setValueAtTime(v * 0.7, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(og); og.connect(this.master);
    osc.start(t); osc.stop(t + 0.13);
  }
}
