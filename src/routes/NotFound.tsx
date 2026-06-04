// @ts-nocheck — JSX-heavy.
import { useNavigate } from 'react-router-dom';
import { Logo } from '@/components/brand';

/**
 * NotFound — branded 404. Replaces the implicit redirect-to-cabinet
 * that used to swallow every unmatched URL. Reads as "cabinet out of
 * order" rather than "we lost you" — keeps the brand vocabulary.
 *
 * Mobile + desktop responsive; no chrome (the cabinet landing pattern).
 */
export function NotFound() {
  const navigate = useNavigate();
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
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(155,122,74,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 480 }}>
        <Logo variant="blue" height={64} />

        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.32em',
            color: 'var(--brass-deep)',
            textTransform: 'uppercase',
            fontWeight: 700,
            margin: '32px 0 12px',
          }}
        >
          · Cabinet 404 · Out of Order ·
        </p>

        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.5rem, 8vw, 4.5rem)',
            margin: '0 0 16px',
            lineHeight: 0.92,
            color: 'var(--ink)',
            textTransform: 'uppercase',
            letterSpacing: '0.005em',
          }}
        >
          The screen
          <br />
          flickers
        </h1>

        <p
          style={{
            fontSize: 14,
            color: 'var(--ink-70)',
            lineHeight: 1.5,
            margin: '0 0 32px',
          }}
        >
          Nothing plays here. The cabinet you tapped doesn't exist —
          maybe it's been moved, retired, or never wired in.
        </p>

        <button
          type="button"
          onClick={() => navigate('/play')}
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
          }}
        >
          ▸ Return to the Floor
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
          · The Arcade · Floor 1 · 404 ·
        </p>
      </div>
    </main>
  );
}

export default NotFound;
