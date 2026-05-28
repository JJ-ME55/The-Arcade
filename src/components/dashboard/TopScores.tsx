// @ts-nocheck — rows are JSX-heavy; props typed loosely to keep Dashboard
// composition simple while real LB data lands.
import { Section } from '@/components/brand';
import { TOP_SCORES, type ArcadeGame } from '@/data/games-fixtures';
import { useLeaderboardData } from '@/hooks/useLeaderboardData';

/**
 * TopScores — right column · live top-5 of whichever cabinet is
 * currently featured (auto-cycles with FeaturedCabinet).
 *
 * Wires to GET /api/games/<slug>/leaderboard?limit=5 on the SolShot
 * server. Falls back to static fixtures when:
 *   - SolShot is featured (no LB endpoint in this shape yet — the
 *     artillery game uses gold/prestige, different data model)
 *   - Fetch is loading (~200ms flash on each cabinet cycle)
 *   - Network/server error
 */

const SLUG_TO_API = {
  solshot: null,
  basketball: 'basketball',
  'free-kicks': 'freekicks',
  'keepie-uppies': 'keepieuppies',
} as const;

interface TopScoresProps {
  /** Currently-featured game (synced with FeaturedCabinet). */
  activeGame?: ArcadeGame;
}

export function TopScores({ activeGame }: TopScoresProps) {
  const api = activeGame ? SLUG_TO_API[activeGame.slug] : null;
  const live = useLeaderboardData({
    api: api || undefined,
    window: 'all',
    limit: 5,
  });

  // Hook returns hydrated StandingRow shape (rank/name/score/delta + more).
  // We only render the 4 columns this widget shows. Fallback to static
  // SolShot fixtures when nothing live is available.
  const liveRows =
    live.rows && live.rows.length > 0
      ? live.rows.map((r) => ({
          rank: r.rank,
          name: r.name,
          score: r.score,
          delta: r.delta,
        }))
      : null;

  const rows = liveRows ?? TOP_SCORES;
  const isLive = liveRows !== null;
  const subText = activeGame
    ? `${activeGame.name} · ${isLive ? 'All-time' : 'Hi Scores'}`
    : 'SolShot · Hi Scores';

  return (
    <Section title="Top Scores" sub={subText}>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {rows.map((s, i) => (
          <li
            key={`${s.rank}-${s.name}`}
            style={{
              display: 'grid',
              gridTemplateColumns: '18px 1fr auto auto',
              gap: 8,
              alignItems: 'baseline',
              padding: '7px 0',
              borderBottom: i < rows.length - 1 ? '1px dotted var(--hair)' : 'none',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
            }}
          >
            <span
              style={{
                color: 'var(--ink-45)',
                fontWeight: 700,
                letterSpacing: '0.04em',
              }}
            >
              #{s.rank}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 12.5,
                fontWeight: 600,
                color: 'var(--ink)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                minWidth: 0,
              }}
            >
              {s.name}
            </span>
            <span style={{ fontWeight: 700, color: 'var(--ink)', letterSpacing: '0.02em' }}>
              {s.score}
            </span>
            <span
              style={{
                color:
                  s.delta.startsWith('+')
                    ? 'var(--win)'
                    : s.delta.startsWith('-')
                    ? 'var(--lose)'
                    : 'var(--ink-45)',
                fontSize: 10,
                fontWeight: 700,
                minWidth: 22,
                textAlign: 'right',
              }}
            >
              {s.delta}
            </span>
          </li>
        ))}
      </ol>
    </Section>
  );
}

export default TopScores;
