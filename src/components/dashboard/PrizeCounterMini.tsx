// @ts-nocheck — placeholder.
import { Section, Vitrine } from '@/components/brand';
import { TicketGlyph } from '@/components/brand/TicketGlyph';
import { PRIZES_MINI } from '@/data/games-fixtures';

/**
 * PrizeCounterMini — right column · 4 prizes in a single vitrine,
 * compressed for the right-column width. Per handoff dashboard
 * §Prize Counter.
 *
 * Full prize counter (with hang-tags, multiple shelves, etc.) lives
 * on the dedicated /prizes route — built in Phase 5.
 */
export function PrizeCounterMini() {
  return (
    <Section title="Prize Counter" sub="Featured">
      <Vitrine caseLabel="· SOLSHOT · DISPLAY ·" padding="20px 14px 16px">
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {PRIZES_MINI.map((p, i) => (
            <li
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 10,
                alignItems: 'baseline',
                padding: '7px 0',
                borderBottom: i < PRIZES_MINI.length - 1 ? '1px dotted var(--hair)' : 'none',
                opacity: p.soon ? 0.5 : 1,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--ink)',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {p.name}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 8.5,
                    color: 'var(--ink-45)',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    marginTop: 2,
                    fontWeight: 700,
                  }}
                >
                  {p.rarity}
                  {p.soon ? ' · Soon' : ''}
                </div>
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--brass-deep)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <TicketGlyph size={11} color="var(--brass-deep)" />
                {p.price.toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      </Vitrine>
    </Section>
  );
}

export default PrizeCounterMini;
