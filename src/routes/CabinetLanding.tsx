import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useArcadeAuth } from '@/wallet/useAuth';
import { Logo } from '@/components/brand';

/**
 * CabinetLanding — pre-auth `/` route.
 *
 * v2 brand: paper-cream surface with the locked logo as the visual
 * anchor. Sign-in opens Privy modal. On successful auth, redirects
 * to /play.
 *
 * Replaces the old fire-gradient placeholder with the editorial brand.
 */
export function CabinetLanding() {
  const auth = useArcadeAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (auth.ready && auth.authenticated) {
      navigate('/play', { replace: true });
    }
  }, [auth.ready, auth.authenticated, navigate]);

  return (
    <main
      style={{
        minHeight: '100dvh',
        background: 'var(--bg)',
        color: 'var(--ink)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-8)',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* subtle radial glow behind the logo for depth */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(91,134,224,0.10) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <Logo variant="blue" height={92} />

        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            letterSpacing: '0.32em',
            color: 'var(--brass-deep)',
            textTransform: 'uppercase',
            fontWeight: 700,
            margin: '32px 0 8px',
          }}
        >
          · Play · Wager · Win · On Solana ·
        </p>

        <p
          style={{
            margin: '8px 0 var(--space-12)',
            fontSize: 14,
            color: 'var(--ink-70)',
            maxWidth: 420,
            lineHeight: 1.5,
          }}
        >
          A games-first arcade on Solana rails. Cabinets, wagers, tickets, and prizes —
          all on-chain, all paper-light.
        </p>

        <button
          type="button"
          onClick={auth.login}
          style={{
            padding: '14px 32px',
            background: 'var(--ink)',
            color: 'var(--paper)',
            border: '1.5px solid var(--ink)',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            letterSpacing: '0.22em',
            fontWeight: 700,
            textTransform: 'uppercase',
            cursor: 'pointer',
            transition: 'background-color 120ms ease, transform 100ms ease',
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'translateY(1px)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          ▸ Insert Coin
        </button>

        <p
          style={{
            marginTop: 36,
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            letterSpacing: '0.22em',
            color: 'var(--ink-45)',
            textTransform: 'uppercase',
            fontWeight: 700,
          }}
        >
          · The Arcade · Floor 1 · Now Open ·
        </p>
      </div>
    </main>
  );
}
