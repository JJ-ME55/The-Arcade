// @ts-nocheck — placeholder route until Phase 6 (Wallet / Banking Slip) lands.
import { Section, CornerBracket } from '@/components/brand';

/**
 * Wallet — temporary placeholder so the mobile tab bar + bot-route
 * targets resolve. Phase 6 rebuilds this surface per ed-wallet.jsx
 * with the full banking-slip hero + paper ledger transactions.
 */
export function Wallet() {
  return (
    <main style={{ padding: '28px 36px 36px', maxWidth: 720, margin: '0 auto' }}>
      <Section title="Wallet" sub="Coming soon">
        <div
          style={{
            position: 'relative',
            background: 'var(--paper)',
            border: '1.5px solid var(--ink)',
            borderBottom: '3px solid var(--ink)',
            padding: '48px 32px',
            textAlign: 'center',
          }}
        >
          <CornerBracket pos="tl" />
          <CornerBracket pos="tr" />
          <CornerBracket pos="bl" />
          <CornerBracket pos="br" />
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.14em',
              color: 'var(--ink-45)',
              textTransform: 'uppercase',
              margin: 0,
            }}
          >
            Banking slip + transaction ledger landing in Phase 6.
          </p>
        </div>
      </Section>
    </main>
  );
}

export default Wallet;
