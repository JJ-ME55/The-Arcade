import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '@/components/brand';
import { useArcadeAuth } from '@/wallet/useAuth';

/**
 * CabinetLanding — pre-auth `/` route.
 *
 * "Insert Coin" opens the Privy modal. Telegram is the primary login
 * method (matches our distribution funnel — bot is the entry point and
 * users already have TG sessions). Email/Google/wallet are alternates
 * that bind into the same Privy account.
 *
 * Lazy-auth model (canonical doc §12.2.5): no hard gate. Users who
 * skip sign-in can browse /play and play any game; sign-in is prompted
 * only when they want to claim a score, view a wallet, or spend tickets
 * (V3). Sign-in on the cabinet landing is the recommended path though
 * — same one-step claim, no mid-flow interruption.
 *
 * After successful auth, route to /play. If the user is already
 * authenticated when they hit `/`, skip the landing entirely.
 */
export function CabinetLanding() {
  const navigate = useNavigate();
  const auth = useArcadeAuth();

  // Already signed in → straight to dashboard.
  useEffect(() => {
    if (auth.authenticated) navigate('/play', { replace: true });
  }, [auth.authenticated, navigate]);

  const handleEnter = () => {
    if (auth.authenticated) {
      navigate('/play');
    } else if (auth.ready) {
      auth.login();
    }
    // If Privy isn't ready yet (initial mount), the click is a no-op;
    // user can re-tap once the SDK boots (~200ms typical).
  };

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
          onClick={handleEnter}
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
