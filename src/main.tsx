import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ArcadePrivyProvider } from '@/wallet/PrivyProvider';
import { App } from '@/App';
import { initSentry, Sentry } from '@/lib/sentry';
import '@/styles/tokens.css';
import '@/styles/global.css';

// Boot Sentry before any other code so init errors get captured.
// No-ops when VITE_SENTRY_DSN is unset (initial deploy before JJ
// configures the env var) — see lib/sentry.ts.
initSentry();

const container = document.getElementById('root');
if (!container) throw new Error('No #root element in index.html');

createRoot(container).render(
  <StrictMode>
    <Sentry.ErrorBoundary
      fallback={({ resetError }) => (
        <main
          style={{
            minHeight: '100dvh',
            background: 'var(--bg)',
            color: 'var(--ink)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.22em',
              color: 'var(--brass-deep)',
              textTransform: 'uppercase',
              fontWeight: 700,
              marginBottom: 16,
            }}
          >
            · Cabinet Glitch · Reset Required ·
          </p>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 7vw, 3.5rem)',
              margin: '0 0 16px',
              textTransform: 'uppercase',
              letterSpacing: '0.01em',
            }}
          >
            Something snapped
          </h1>
          <p style={{ color: 'var(--ink-70)', maxWidth: 420, lineHeight: 1.5, marginBottom: 24 }}>
            Sorry — we hit an error and the arcade froze. The crash has been
            reported. Reset to keep playing.
          </p>
          <button
            type="button"
            onClick={resetError}
            style={{
              padding: '12px 28px',
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
            ▸ Reset Cabinet
          </button>
        </main>
      )}
    >
      <BrowserRouter>
        <ArcadePrivyProvider>
          <App />
        </ArcadePrivyProvider>
      </BrowserRouter>
    </Sentry.ErrorBoundary>
  </StrictMode>
);
