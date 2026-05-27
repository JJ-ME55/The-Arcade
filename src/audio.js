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
    // Voice-over clips (round announcements, kill calls, win/lose). Same model as
    // weapon samples: drop files in visual/sounds/voice/, else speech-synth fallback.
    this._voicePaths = null;
    this._voiceBuffers = {};
    this._fireLoop = null;      // looping auto-fire source (gated by the trigger)
    this._fireLoopName = null;
  }

  /** Register voice-clip name -> candidate file URLs (first that loads wins). */
  registerVoice(map) {
    this._voicePaths = map;
    if (this.ctx) this._loadSamples();
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
    if (!this.ctx) return;
    const load = async (paths, dest, label) => {
      if (!paths) return;
      for (const [name, urls] of Object.entries(paths)) {
        if (dest[name]) continue;
        for (const url of urls) {
          try {
            const res = await fetch(url);
            if (!res.ok) continue;
            const arr = await res.arrayBuffer();
            dest[name] = await this.ctx.decodeAudioData(arr);
            console.log(`[audio] loaded ${label}: ${name} (${url})`);
            break;
          } catch (e) { /* missing/unsupported — try next, else synth fallback */ }
        }
      }
    };
    if (!this._samplesLoaded) { this._samplesLoaded = true; await load(this._samplePaths, this._buffers, 'sample'); }
    await load(this._voicePaths, this._voiceBuffers, 'voice');
  }

  /**
   * Play a voice line: a loaded VO clip for `key` if present, else speak
   * `fallbackText` via the synth (deep/military-ish).
   */
  voice(key, fallbackText) {
    this._ensure();
    if (this._voiceBuffers[key]) { this._playBuffer(this._voiceBuffers[key], 1.0); return; }
    if (fallbackText) this.say(fallbackText);
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

  _playBuffer(buffer, volume, duration) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const g = ctx.createGain();
    g.gain.value = Math.max(0.001, volume);
    src.connect(g); g.connect(this.master);
    if (duration && duration < buffer.duration) {
      // Play only the first `duration` seconds, with a tiny fade so it doesn't click.
      const t = ctx.currentTime;
      g.gain.setValueAtTime(Math.max(0.001, volume), t + duration - 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, t + duration);
      src.start(t, 0, duration);
    } else {
      src.start(ctx.currentTime);
    }
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

  /** Play a weapon's reload sound (sample '<weapon>_reload'), capped to `maxDur`. */
  reloadSound(weaponName, volume = 0.9, maxDur = 2.0) {
    if (!this._ensure()) return;
    const buf = this._buffers[weaponName + '_reload'];
    if (buf) this._playBuffer(buf, volume, maxDur);
  }

  /** Play an arbitrary loaded sample by key (e.g. 'shotgun_pump'). */
  playClip(key, volume = 0.9) {
    if (!this._ensure()) return;
    const buf = this._buffers[key];
    if (buf) this._playBuffer(buf, volume);
  }

  /** Is a firing sample loaded for this weapon? */
  hasSample(weaponName) { return !!this._buffers[weaponName]; }

  /**
   * Start a looping firing sound for an auto weapon (call while the trigger is
   * held + rounds are going out). Idempotent for the same weapon. The clip loops
   * so it plays continuously and stops cleanly on stopFire().
   */
  startFire(weaponName, volume = 0.9) {
    if (!this._ensure()) return;
    if (this._fireLoop && this._fireLoopName === weaponName) return;
    this.stopFire();
    const buf = this._buffers[weaponName];
    if (!buf) { this._fireLoopName = null; return; } // no sample — caller uses per-shot synth
    const src = this.ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const g = this.ctx.createGain(); g.gain.value = Math.max(0.001, volume);
    src.connect(g); g.connect(this.master);
    src.start();
    this._fireLoop = src; this._fireLoopName = weaponName;
  }

  /** Stop the looping firing sound (call when the trigger is released / empty). */
  stopFire() {
    if (this._fireLoop) { try { this._fireLoop.stop(); } catch (e) { /* already stopped */ } }
    this._fireLoop = null; this._fireLoopName = null;
  }

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

  /** Short countdown beep (square-ish tone). */
  beep(freq = 880, dur = 0.12, volume = 0.5) {
    if (!this._ensure()) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(this.master);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  /**
   * Speak a phrase with a deep, military-ish voice via the Web Speech API.
   * Picks a low-pitched male English voice when available. Swap for recorded
   * VO later if desired.
   */
  say(text, { pitch = 0.5, rate = 0.95, volume = 1.0 } = {}) {
    const synth = window.speechSynthesis;
    if (!synth) return;
    try {
      synth.cancel(); // don't queue announcements on top of each other
      const u = new SpeechSynthesisUtterance(text);
      u.pitch = pitch; u.rate = rate; u.volume = volume;
      const voices = synth.getVoices();
      // Prefer a deep/male English voice for the "commander" feel.
      const pref = voices.find(v => /en/i.test(v.lang) && /(David|Daniel|Google UK English Male|male)/i.test(v.name))
        || voices.find(v => /en/i.test(v.lang));
      if (pref) u.voice = pref;
      synth.speak(u);
    } catch (e) { /* speech not available — silent */ }
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
