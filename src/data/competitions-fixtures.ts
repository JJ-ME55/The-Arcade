/**
 * Competitions — promo events where a single high score on a cabinet
 * wins a SOL prize at close. Replaces the placeholder Prizes surface
 * for now: a real, fundable thing the user can chase TODAY.
 *
 * 2026-06-05 launch: one live comp (Free Kicks · 1 SOL · 30 Jun).
 * Append entries here as we run more.
 *
 * Status semantics:
 *   live    — open for submissions; closes at `closes`
 *   ended   — past `closes`; show winner if known
 *   soon    — announced but not yet open
 *
 * Prize is denominated in plain text ("1 SOL", "0.5 SOL · split") so we
 * don't lock the schema before we know all the formats we'll run.
 *
 * Funding note: prize SOL is funded out of the SolShot operations vault
 * (5zLEYTj8…) per JJ. Paid to the winning entrant's Privy-linked wallet
 * within 48h of close.
 */

import type { ArcadeGame } from './games-fixtures';

export type CompetitionStatus = 'live' | 'ended' | 'soon';

export interface Competition {
  /** Stable id — used as React key + as a future server-side handle. */
  id: string;
  /** Which cabinet this comp is tied to. Drives the launch link. */
  game: ArcadeGame['slug'];
  /** Display title — short, action-clear. */
  title: string;
  /** Prize copy — plain text. e.g. "1 SOL". */
  prize: string;
  status: CompetitionStatus;
  /** ISO 8601 close timestamp. Used for the live countdown. */
  closes: string;
  /** What the user is competing for — 1-2 sentences. */
  rule: string;
  /** How to enter — 1-2 sentences. Plain, actionable. */
  howToEnter: string;
  /** Where the Play button takes them. */
  launchPath: string;
  /** Where the See Leaderboard button takes them. */
  leaderboardPath: string;
}

export const COMPETITIONS: Competition[] = [
  {
    id: 'fk-jun-2026-top-score',
    game: 'free-kicks',
    title: 'Free Kicks · Top Score · June',
    prize: '1 SOL',
    status: 'live',
    closes: '2026-06-30T23:59:00Z',
    rule:
      'Hold the highest Free Kicks score on the all-time leaderboard at close. Any score submitted before 30 June 23:59 UTC counts; only your best run is kept.',
    howToEnter:
      'Sign in, launch Free Kicks, and play. Every score you submit is automatically an entry — replay as much as you want, only your best counts.',
    launchPath: '/play/free-kicks/launch',
    leaderboardPath: '/leaderboard/free-kicks',
  },
];

/** Convenience: live comps only (for the nav badge + dashboard widget). */
export const LIVE_COMPETITIONS = COMPETITIONS.filter((c) => c.status === 'live');
