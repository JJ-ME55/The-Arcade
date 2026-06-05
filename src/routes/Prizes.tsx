// @ts-nocheck — JSX-heavy route, coming-soon panel for Prizes.
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/useIsMobile';
import { Section, PrizeIcon, TicketGlyph } from '@/components/brand';

/**
 * Prizes — `/prizes`.
 *
 * 2026-06-05: gated to Coming Soon per JJ + Fish. The full prize-counter
 * (vitrines, shelves, voucher) shipped earlier as a design preview but
 * there's no real economy behind it yet — Tickets are V3 and the
 * cosmetic NFT mints aren't drafted. Surfacing it now sets a redemption
 * expectation we can't honour, so we hold the surface back until V3.
 *
 * Old design code lives at routes/Prizes.tsx in git history (last good
 * commit before 2026-06-05). Restore by reverting this file and the
 * fixture imports stay intact at data/prizes-fixtures.ts.
 *
 * In the meantime: Competitions (/competitions) is the live SOL-earning
 * surface — that's where users with prize energy should land.
 */
export function Prizes() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  return (
    <main
      style={{
        padding: isMobile ? '20px 14px 60px' : '28px 36px 60px',
        maxWidth: 1100,
        margin: '0 auto',
        width: '100%',
      }}
    >
      <Section title="Prize Counter" sub="Coming soon">
        <div
          style={{
            background: 'var(--paper)',
            border: '1.5px solid var(--ink)',
            borderTop: '4px solid var(--brass)',
            padding: isMobile ? '28px 22px' : '40px 44px',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? 28 : 44,
            alignItems: isMobile ? 'flex-start' : 'center',
          }}
        >
          {/* Brass icon block */}
          <div
            style={{
              flexShrink: 0,
              width: isMobile ? '100%' : 160,
              display: 'flex',
              justifyContent: isMobile ? 'flex-start' : 'center',
            }}
          >
            <div
              style={{
                width: 132,
                height: 132,
                border: '2px solid var(--brass)',
                background: 'var(--paper)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              <PrizeIcon kind="ball" size={64} color="var(--brass-deep)" />
              <span
                style={{
                  position: 'absolute',
                  bottom: -10,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  padding: '3px 10px',
                  background: 'var(--brass)',
                  color: 'var(--ink-deep)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                }}
              >
                V3
              </span>
            </div>
          </div>

          {/* Copy + CTA */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9.5,
                letterSpacing: '0.22em',
                color: 'var(--brass-deep)',
                textTransform: 'uppercase',
                fontWeight: 700,
                marginBottom: 6,
              }}
            >
              Coming with V3
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: isMobile ? 26 : 34,
                fontWeight: 400,
                letterSpacing: '0.015em',
                textTransform: 'uppercase',
                color: 'var(--ink)',
                margin: 0,
                lineHeight: 1.05,
              }}
            >
              The Prize Counter is being stocked
            </h1>
            <p
              style={{
                margin: '14px 0 0',
                fontFamily: 'var(--font-body)',
                fontSize: isMobile ? 14 : 15,
                lineHeight: 1.6,
                color: 'var(--ink-70)',
                maxWidth: 620,
              }}
            >
              Cosmetic upgrades, hulls, balls, cues — the things you'll
              redeem with{' '}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, verticalAlign: 'baseline' }}>
                <TicketGlyph size={11} color="var(--brass-deep)" />
                <span style={{ color: 'var(--brass-deep)', fontWeight: 700 }}>Tickets</span>
              </span>{' '}
              land with V3 of the economy. Until then we don't want to
              surface vitrines you can't actually empty.
            </p>
            <p
              style={{
                margin: '14px 0 0',
                fontFamily: 'var(--font-body)',
                fontSize: isMobile ? 14 : 15,
                lineHeight: 1.6,
                color: 'var(--ink-70)',
                maxWidth: 620,
              }}
            >
              In the meantime — <strong style={{ color: 'var(--ink)' }}>Competitions</strong>{' '}
              are live. Top a leaderboard, win SOL paid to your wallet.
            </p>

            <div
              style={{
                display: 'flex',
                gap: 12,
                marginTop: 22,
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                onClick={() => navigate('/competitions')}
                style={{
                  padding: '11px 22px',
                  background: 'var(--ink)',
                  color: 'var(--paper)',
                  border: 'none',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  letterSpacing: '0.20em',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                See competitions →
              </button>
              <button
                type="button"
                onClick={() => navigate('/play')}
                style={{
                  padding: '11px 22px',
                  background: 'transparent',
                  color: 'var(--ink)',
                  border: '1.5px solid var(--ink)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  letterSpacing: '0.20em',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                Back to the floor
              </button>
            </div>
          </div>
        </div>
      </Section>
    </main>
  );
}

export default Prizes;
