/** Seasonal progression: award points, unlock track rewards, pod skins. */
import type { ItemId, RunState } from '../core/types';
import { App } from '../core/state';
import { SEASONS, SEASON_BY_ID, getActiveSeason, type SeasonReward } from '../config/seasons';

export { getActiveSeason };

/** Award season points (during a run) and apply any newly-unlocked track rewards. */
export function awardSeasonPoints(run: RunState, seasonId: string, points: number): SeasonReward[] {
  const m = App.meta;
  const season = SEASON_BY_ID[seasonId];
  if (!season) return [];
  m.seasonPoints[seasonId] = (m.seasonPoints[seasonId] ?? 0) + points;
  const total = m.seasonPoints[seasonId];
  const newly: SeasonReward[] = [];
  for (const r of season.track) {
    const key = seasonId + ':' + r.id;
    if (total >= r.points && !m.seasonUnlocks.includes(key)) {
      m.seasonUnlocks.push(key);
      if (r.kind === 'cores') m.cores += r.count ?? 0;
      else if (r.kind === 'pod') {
        if (!m.unlockedPods.includes(r.id)) m.unlockedPods.push(r.id);
      } else if (r.kind === 'title') {
        if (!m.achievements.includes(r.id)) m.achievements.push(r.id);
      } else if (r.kind === 'item') {
        run.items[r.id as ItemId] = (run.items[r.id as ItemId] ?? 0) + (r.count ?? 0);
      }
      newly.push(r);
    }
  }
  App.save();
  return newly;
}

/** Tint colour for a pod skin id (cosmetic). 0xffffff = no tint (stock). */
export function podTint(podId: string): number {
  if (podId === 'default') return 0xffffff;
  for (const s of SEASONS) for (const r of s.track) if (r.kind === 'pod' && r.id === podId && r.tint) return r.tint;
  return 0xffffff;
}

export function podName(podId: string): string {
  if (podId === 'default') return 'Standard Pod';
  for (const s of SEASONS) for (const r of s.track) if (r.kind === 'pod' && r.id === podId) return r.name;
  return 'Pod';
}
