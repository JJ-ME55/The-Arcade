// @ts-nocheck
/**
 * Lap counting from a kart's progress around the loop (0..1). Counts a lap only
 * when the start/finish line is crossed in the FORWARD direction after passing
 * the far side of the track (so you can't cheat by nudging back and forth over
 * the line). Framework-free + pure so it's unit-tested and shared by all karts.
 */
export interface LapState {
  lap: number; // completed laps (0 at the start line)
  lastProgress: number;
  passedHalf: boolean; // reached the far half of this lap
}

// A lap only counts if the kart passed through the MIDDLE of the track going forward — not
// merely reached high progress. This zone (well away from the start line) can't be entered by
// reversing back across the line at the start, which is what made the lap-skip exploit work.
const MID_LO = 0.35;
const MID_HI = 0.75;

export function initLap(progress: number): LapState {
  return { lap: 0, lastProgress: progress, passedHalf: progress > MID_LO && progress < MID_HI };
}

export function updateLap(s: LapState, progress: number): LapState {
  let { lap, passedHalf } = s;
  if (progress > MID_LO && progress < MID_HI) passedHalf = true; // armed by genuinely reaching mid-track

  const delta = progress - s.lastProgress;
  if (delta < -0.5) {
    // wrapped forward across the start/finish line — only counts if mid-track was passed
    if (passedHalf) {
      lap += 1;
      passedHalf = false;
    }
  } else if (delta > 0.5) {
    // wrapped backward across the line — undo a lap and disarm (must pass mid-track again)
    lap = Math.max(0, lap - 1);
    passedHalf = false;
  }

  return { lap, lastProgress: progress, passedHalf };
}

/** Display lap number (1-based), capped at the total. */
export function currentLap(s: LapState, totalLaps: number): number {
  return Math.min(s.lap + 1, totalLaps);
}

export function isFinished(s: LapState, totalLaps: number): boolean {
  return s.lap >= totalLaps;
}
