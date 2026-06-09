/** Procedural WebAudio SFX — fully synthesized, no audio files. */
import { App } from '../core/state';

class AudioSys {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private thrustOsc: OscillatorNode | null = null;
  private thrustGain: GainNode | null = null;
  private amb: { o1: OscillatorNode; o2: OscillatorNode; gain: GainNode; filt: BiquadFilterNode } | null = null;

  private ensure(): boolean {
    if (!this.ctx) {
      try {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new Ctx();
        this.master = this.ctx.createGain();
        this.master.connect(this.ctx.destination);
      } catch {
        return false;
      }
    }
    if (this.ctx!.state === 'suspended') void this.ctx!.resume();
    if (this.master) this.master.gain.value = App.meta.settings.sfxVolume;
    return true;
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number, slideTo?: number, delay = 0): void {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  private noise(dur: number, gain: number, filterFreq = 1200): void {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(filt);
    filt.connect(g);
    g.connect(this.master);
    src.start(t0);
  }

  dig(variance = 0): void {
    if (!this.ensure()) return;
    this.tone(120 + variance * 60, 0.07, 'square', 0.08, 90 + variance * 40);
    this.noise(0.06, 0.05, 800);
  }

  collect(tier = 0): void {
    if (!this.ensure()) return;
    const base = 520 + tier * 80;
    this.tone(base, 0.08, 'triangle', 0.14);
    this.tone(base * 1.5, 0.1, 'triangle', 0.1, undefined, 0.05);
  }

  jackpot(): void {
    if (!this.ensure()) return;
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.16, undefined, i * 0.06));
  }

  sell(): void {
    if (!this.ensure()) return;
    this.tone(880, 0.08, 'square', 0.12);
    this.tone(1320, 0.12, 'square', 0.1, undefined, 0.06);
  }

  upgrade(): void {
    if (!this.ensure()) return;
    [392, 523, 659].forEach((f, i) => this.tone(f, 0.16, 'sawtooth', 0.1, undefined, i * 0.05));
  }

  damage(): void {
    if (!this.ensure()) return;
    this.tone(180, 0.18, 'sawtooth', 0.18, 60);
    this.noise(0.12, 0.12, 600);
  }

  explosion(): void {
    if (!this.ensure()) return;
    this.tone(90, 0.3, 'sawtooth', 0.22, 30);
    this.noise(0.35, 0.25, 900);
  }

  warn(): void {
    if (!this.ensure()) return;
    this.tone(440, 0.1, 'square', 0.08);
  }

  milestone(): void {
    if (!this.ensure()) return;
    [659, 988].forEach((f, i) => this.tone(f, 0.2, 'triangle', 0.14, undefined, i * 0.08));
  }

  click(): void {
    if (!this.ensure()) return;
    this.tone(660, 0.04, 'square', 0.06);
  }

  /** static-y comms blip for incoming transmissions. */
  comms(): void {
    if (!this.ensure()) return;
    this.noise(0.08, 0.05, 1600);
    this.tone(1200, 0.05, 'square', 0.05);
    this.tone(900, 0.05, 'square', 0.05, undefined, 0.08);
  }

  // ---- depth-reactive ambient drone (so you know how deep you are with eyes closed) ----
  startAmbience(): void {
    if (!this.ensure() || !this.ctx || !this.master || this.amb) return;
    const o1 = this.ctx.createOscillator();
    const o2 = this.ctx.createOscillator();
    const filt = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    o1.type = 'sine';
    o2.type = 'triangle';
    o1.frequency.value = 55;
    o2.frequency.value = 82;
    filt.type = 'lowpass';
    filt.frequency.value = 600;
    gain.gain.value = 0.0001;
    o1.connect(filt);
    o2.connect(filt);
    filt.connect(gain);
    gain.connect(this.ctx.destination);
    o1.start();
    o2.start();
    gain.gain.linearRampToValueAtTime(App.meta.settings.musicVolume * 0.09, this.ctx.currentTime + 1.5);
    this.amb = { o1, o2, gain, filt };
  }

  /** Shift the drone by biome (deeper = lower & more muffled; hot = tense detune). */
  setAmbience(biomeIndex: number, hot: boolean): void {
    if (!this.amb || !this.ctx) return;
    const t = this.ctx.currentTime;
    const base = 58 - biomeIndex * 4;
    this.amb.o1.frequency.linearRampToValueAtTime(base, t + 1.2);
    this.amb.o2.frequency.linearRampToValueAtTime(base * (hot ? 1.49 : 1.5), t + 1.2);
    this.amb.filt.frequency.linearRampToValueAtTime(700 - biomeIndex * 70, t + 1.2);
    this.amb.gain.gain.linearRampToValueAtTime(App.meta.settings.musicVolume * (0.07 + biomeIndex * 0.006), t + 1.2);
  }

  stopAmbience(): void {
    if (!this.amb || !this.ctx) return;
    const a = this.amb;
    a.gain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.4);
    window.setTimeout(() => {
      a.o1.stop();
      a.o2.stop();
    }, 500);
    this.amb = null;
  }

  setThrust(on: boolean): void {
    if (!this.ensure() || !this.ctx || !this.master) return;
    if (on && !this.thrustOsc) {
      this.thrustOsc = this.ctx.createOscillator();
      this.thrustGain = this.ctx.createGain();
      this.thrustOsc.type = 'sawtooth';
      this.thrustOsc.frequency.value = 72;
      this.thrustGain.gain.value = 0.0001;
      this.thrustOsc.connect(this.thrustGain);
      this.thrustGain.connect(this.master);
      this.thrustOsc.start();
      this.thrustGain.gain.linearRampToValueAtTime(0.05, this.ctx.currentTime + 0.08);
    } else if (!on && this.thrustOsc && this.thrustGain) {
      this.thrustGain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.1);
      const osc = this.thrustOsc;
      window.setTimeout(() => osc.stop(), 150);
      this.thrustOsc = null;
      this.thrustGain = null;
    }
  }
}

export const Sound = new AudioSys();
