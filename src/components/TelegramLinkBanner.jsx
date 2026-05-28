import { useState } from 'react';

const SOLSHOT_BOT_URL = 'https://t.me/SolShotGG_bot?start=link';
const DISMISS_KEY = 'arcade_tg_link_banner_dismissed';

/**
 * TelegramLinkBanner — shown when useArcadeSessionMint returns
 * `tg_not_linked`. v2 brand restyled — paper card with ink border
 * and brass top accent, IBM Plex Mono CTA.
 */
export function TelegramLinkBanner() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* sessionStorage unavailable — dismiss only for component lifetime */
    }
  };

  return (
    <div role="status" style={styles.root}>
      <div style={styles.body}>
        <div style={styles.title}>· FREE PLAY MODE ·</div>
        <div style={styles.message}>
          Link your Telegram to track scores on the leaderboard.
        </div>
      </div>
      <a
        href={SOLSHOT_BOT_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={styles.cta}
      >
        ▸ Link Telegram
      </a>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss"
        style={styles.dismiss}
      >
        ×
      </button>
    </div>
  );
}

const styles = {
  root: {
    position: 'absolute',
    left: 'max(env(safe-area-inset-left, 0px), 12px)',
    right: 'max(env(safe-area-inset-right, 0px), 12px)',
    bottom: 'max(env(safe-area-inset-bottom, 0px), 12px)',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 14px',
    background: 'var(--paper)',
    border: '1.5px solid var(--ink)',
    borderTop: '3px solid var(--brass)',
    color: 'var(--ink)',
    fontFamily: '"DM Sans", Inter, system-ui, sans-serif',
    zIndex: 20,
    pointerEvents: 'auto',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
    fontSize: 9,
    letterSpacing: '0.22em',
    color: 'var(--brass-deep)',
    textTransform: 'uppercase',
    fontWeight: 700,
    marginBottom: 3,
  },
  message: {
    fontSize: 12.5,
    color: 'var(--ink-70)',
    lineHeight: 1.4,
  },
  cta: {
    padding: '8px 14px',
    background: 'var(--ink)',
    color: 'var(--paper)',
    textDecoration: 'none',
    fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    WebkitTapHighlightColor: 'transparent',
  },
  dismiss: {
    background: 'transparent',
    border: 'none',
    color: 'var(--ink-45)',
    fontSize: 20,
    lineHeight: 1,
    padding: '0 4px',
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
  },
};

export default TelegramLinkBanner;
