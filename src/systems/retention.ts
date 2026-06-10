/**
 * Comeback systems: daily streak (escalating ticket reward for playing each day) and the
 * goal ladder (auto-claimed milestones). Both run off the persistent meta-save.
 */
import { App } from '../core/state';
import { GOALS, type GoalDef } from '../config/goals';

function metricValue(metric: GoalDef['metric']): number {
  const m = App.meta;
  switch (metric) {
    case 'bestDepth':
      return m.bestDepth;
    case 'bestScore':
      return m.bestScore;
    case 'totalCash':
      return m.totalCash;
    case 'runsPlayed':
      return m.runsPlayed;
    case 'collection':
      return (
        Object.keys(m.collection.ores).length +
        m.collection.fossils.length +
        m.collection.artifacts.length
      );
  }
}

/** The next unclaimed goal — the carrot shown on the menu. */
export function nextGoal(): GoalDef | null {
  for (const g of GOALS) if (!App.meta.goalsClaimed.includes(g.id)) return g;
  return null;
}

/** Claim every completed-but-unclaimed goal. Returns what was just claimed (for toasts). */
export function claimCompletedGoals(): GoalDef[] {
  const m = App.meta;
  const out: GoalDef[] = [];
  for (const g of GOALS) {
    if (m.goalsClaimed.includes(g.id)) continue;
    if (metricValue(g.metric) >= g.target) {
      m.goalsClaimed.push(g.id);
      m.cores += g.cores;
      m.tickets += g.tickets;
      out.push(g);
    }
  }
  return out;
}

function dayStr(d = new Date()): string {
  return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
}

export function playedToday(): boolean {
  return App.meta.streak.lastDay === dayStr();
}

/**
 * Count today's play toward the streak (call when a real run ends). First run of the day
 * pays tickets that escalate with consecutive days (5/day, capped at 30).
 */
export function tickStreak(): { count: number; ticketsAwarded: number } {
  const m = App.meta;
  const today = dayStr();
  if (m.streak.lastDay === today) return { count: m.streak.count, ticketsAwarded: 0 };
  const y = new Date();
  y.setUTCDate(y.getUTCDate() - 1);
  m.streak.count = m.streak.lastDay === dayStr(y) ? m.streak.count + 1 : 1;
  m.streak.lastDay = today;
  const tickets = Math.min(5 * m.streak.count, 30);
  m.tickets += tickets;
  return { count: m.streak.count, ticketsAwarded: tickets };
}
