// @ts-nocheck — placeholder data, JSX-heavy.
import { Section } from '@/components/brand';
import { TOP_SCORES } from '@/data/games-fixtures';

/**
 * TopScores — right column · SolShot 24h leaderboard, 5 rows.
 * Per handoff dashboard §Top Scores. Rows: rank · name · score · delta.
 */
export function TopScores() {
  return (
    <Section title="Top Scores" sub="SolShot · 24h">
      <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {TOP_SCORES.map((s, i) => (
          <li
            key={s.rank}
            style={{
              display: 'grid',
              gridTemplateColumns: '18px 1fr auto auto',
              gap: 8,
              alignItems: 'baseline',
              padding: '7px 0',
              borderBottom: i < TOP_SCORES.length - 1 ? '1px dotted var(--hair)' : 'none',
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
