// @ts-nocheck
/**
 * Background music. Two layers:
 *  - startup: the title/menu loop, plays everywhere outside a race.
 *  - race: a randomly chosen racing track, started on "GO" and stopped when the
 *    race screen unmounts.
 *
 * Browsers block audio until the first user gesture, so nothing can play on a
 * truly untouched page — the earliest legal moment is the first click/keypress
 * (the title's "Press Start"). We preload eagerly so that first play is instant
 * rather than lagging while the mp3 downloads.
 */
const DIR = '/critter-kart/Sounds and music/';
const url = (file: string) => encodeURI(DIR + file);

function track(file: string): HTMLAudioElement {
  const a = new Audio(url(file));
  a.loop = true;
  a.volume = 0.5;
  a.preload = 'auto'; // start buffering on page load so first play is instant
  return a;
}

// Drop a "Racing background music 3.mp3" in the folder and add it here to include it.
const RACE_TRACKS = [
  'Racing background music 0.mp3',
  'Racing background music 1.mp3',
  'Racing background music 2.mp3',
];

const startup = track('Start up screen music.mp3'); // eager: buffering begins immediately
let race: HTMLAudioElement | null = null;

export function playStartup(): void {
  stopRace();
  void startup.play().catch(() => {}); // rejected before the first gesture — that's fine
}

export function stopStartup(): void {
  startup.pause();
}

/** Pick + buffer a race track (call when the race screen mounts, during the countdown). */
export function prepareRace(): void {
  stopStartup();
  const pick = RACE_TRACKS[Math.floor(Math.random() * RACE_TRACKS.length)];
  if (!race) race = track(pick);
  else {
    race.src = url(pick);
    race.load();
  }
  race.currentTime = 0;
}

/** Start the prepared race track (call on GO). */
export function playRace(): void {
  if (!race) prepareRace();
  void race!.play().catch(() => {});
}

export function stopRace(): void {
  race?.pause();
}

// =============================================================================
// Countdown SFX — synthesised live with Web Audio so we don't ship extra .mp3s.
// Three warm beeps for 3/2/1, then a fanfare GO chord with a pitch swoop.
// =============================================================================

let sfxCtx: AudioContext | null = null;

function ensureSfxCtx(): AudioContext | null {
  // Lazy-create + auto-resume. Browsers gate AudioContext creation/resume on a
  // user gesture; by the time the countdown runs the player has clicked through
  // several menus, so this resolves on the first call.
  if (sfxCtx === null) {
    const Ctor = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
      ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try { sfxCtx = new Ctor(); } catch { return null; }
  }
  if (sfxCtx.state === 'suspended') void sfxCtx.resume();
  return sfxCtx;
}

/** Schedule one note: oscillator + ADSR-shaped gain envelope. */
function scheduleNote(
  ctx: AudioContext,
  startAt: number,
  freq: number,
  duration: number,
  opts: { type?: OscillatorType; peak?: number; swoopFrom?: number } = {},
): void {
  const { type = 'triangle', peak = 0.22, swoopFrom } = opts;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;

  if (swoopFrom !== undefined) {
    osc.frequency.setValueAtTime(swoopFrom, startAt);
    osc.frequency.exponentialRampToValueAtTime(freq, startAt + 0.05);
  } else {
    osc.frequency.setValueAtTime(freq, startAt);
  }

  // Quick attack so the beep feels punchy, exponential decay so it doesn't click off.
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(peak, startAt + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  osc.connect(gain).connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.02);
}

/**
 * Play the per-beat countdown sound. `isGo` swaps the short warm beep for the
 * GO fanfare — a perfect-fifth chord (A5 + E6) with a quick upward pitch swoop,
 * so the start of the race lands with energy instead of just another bleep.
 */
export function playCountdownBeep(isGo: boolean): void {
  const ctx = ensureSfxCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  if (isGo) {
    // GO! — major-ish chord, longer, swooping up into pitch for a "punch" feel
    scheduleNote(ctx, now, 880,  0.55, { type: 'triangle', peak: 0.26, swoopFrom: 780 }); // A5
    scheduleNote(ctx, now, 1320, 0.55, { type: 'triangle', peak: 0.18, swoopFrom: 1180 }); // E6 (perfect fifth above)
  } else {
    // 3 / 2 / 1 — short warm beep, mid pitch, light double-osc for a fuller tone
    scheduleNote(ctx, now, 660, 0.18, { type: 'triangle', peak: 0.26 }); // E5
    scheduleNote(ctx, now, 990, 0.18, { type: 'sine',     peak: 0.10 }); // soft sine harmonic
  }
}
