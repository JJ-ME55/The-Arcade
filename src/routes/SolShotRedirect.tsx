import { useEffect, useState } from 'react';

const SOLSHOT_URL = import.meta.env.VITE_SOLSHOT_WEB_URL ?? 'https://solshot.gg';

/**
 * SolShotRedirect — `/play/solshot`. Interstitial that bounces out to
 * solshot.gg. Eventually mints a session-handoff JWT so the SolShot
 * client picks up the user's Privy identity without re-auth; for now
 * just full-page redirects.
 *
 * v2 brand styling.
 */
export function SolShotRedirect() {
  const [status, setStatus] = useState<'redirecting' | 'error'>('redirecting');

  useEffect(() => {
    let cancelled = false;
    try {
      if (!cancelled) {
        setStatus('redirecting');
        window.location.href = SOLSHOT_URL;
      }
    } catch {
      if (!cancelled) setStatus('error');
    }
    return () => {
      cancelled = true;
    };
  }, []);

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
      }}
    >
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 48,
          color: 'var(--ink)',
          letterSpacing: '0.01em',
          textTransform: 'uppercase',
          marginBottom: 14,
        }}
      >
        SolShot
      </h1>
      <p style={{ color: 'var(--ink-70)', marginBottom: 24, maxWidth: 360, lineHeight: 1.5 }}>
        {status === 'error'
          ? "Couldn't open SolShot — try again."
          : 'Opening SolShot — your callsign comes with you.'}
      </p>
      <a
        href={SOLSHOT_URL}
        style={{
          padding: '10px 22px',
          background: 'var(--ink)',
          color: 'var(--paper)',
          textDecoration: 'none',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          letterSpacing: '0.18em',
          fontWeight: 700,
          textTransform: 'uppercase',
        }}
      >
        Continue Manually →
      </a>
    </main>
  );
}
