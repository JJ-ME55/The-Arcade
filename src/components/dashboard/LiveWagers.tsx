// @ts-nocheck — placeholder data.
import { Section } from '@/components/brand';
import { LIVE_WAGERS } from '@/data/games-fixtures';

/**
 * LiveWagers — right column · last 5 wagers with win/loss-colored
 * payouts. Per handoff dashboard §Live Wagers.
 */
export function LiveWagers() {
  return (
    <Section title="Live Wagers" sub="Last 5">
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {LIVE_WAGERS.map((w, i) => (
          <li
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: 10,
              alignItems: 'center',
              padding: '8px 0',
              borderBottom: i < LIVE_WAGERS.length - 1 ? '1px dotted var(--hair)' : 'none',
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--ink)',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {w.name}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  color: 'var(--ink-45)',
                  letterSpacing: '0.05em',
                  marginTop: 2,
                }}
              >
                {w.stake} → {w.payout} · {w.ago}
              </div>
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                fontWeight: 700,
                color: w.outcome === 'win' ? 'var(--win)' : 'var(--lose)',
              }}
            >
              {w.payout}
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export default LiveWagers;
