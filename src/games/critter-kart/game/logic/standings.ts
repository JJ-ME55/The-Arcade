// @ts-nocheck
/**
 * Race standings: rank karts by laps completed, then progress around the
 * current lap. Pure + framework-free. Used for live position (1st..Nth).
 */
export interface RacerProgress {
  id: number;
  lap: number;
  progress: number; // 0..1 around the current lap
}

/** Racer ids ordered from 1st to last. */
export function rankRacers(racers: RacerProgress[]): number[] {
  return [...racers]
    .sort((a, b) => b.lap - a.lap || b.progress - a.progress)
    .map((r) => r.id);
}

/** 1-based position of a given racer. */
export function positionOf(id: number, racers: RacerProgress[]): number {
  return rankRacers(racers).indexOf(id) + 1;
}
