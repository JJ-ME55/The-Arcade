// @ts-nocheck — placeholder route until Phase 5 (Prize Counter) builds the real screen.
import { Section, Vitrine } from '@/components/brand';

/**
 * Prizes — temporary placeholder so the mobile tab bar + bot-route
 * targets resolve. Phase 5 rebuilds this surface per ed-prize-counter.jsx
 * with the full vitrine + hang-tag treatment.
 */
export function Prizes() {
  return (
    <main style={{ padding: '28px 36px 36px', maxWidth: 1200, margin: '0 auto' }}>
      <Section title="Prize Counter" sub="Coming soon">
        <Vitrine caseLabel="· DISPLAY · PRIZE COUNTER ·" padding="48px 32px">
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.14em',
              color: 'var(--ink-45)',
              textAlign: 'center',
              textTransform: 'uppercase',
              margin: 0,
            }}
          >
            Tickets in, prizes out. Real shelves landing in Phase 5.
          </p>
        </Vitrine>
      </Section>
    </main>
  );
}

export default Prizes;
