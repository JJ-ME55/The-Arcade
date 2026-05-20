import { useState } from 'react';

const SOLSHOT_BOT_URL = 'https://t.me/SolShotGG_bot?start=link';
const DISMISS_KEY = 'arcade_tg_link_banner_dismissed';

/**
 * TelegramLinkBanner — shown when useArcadeSessionMint returns
 * `tg_not_linked`. The user is signed in to Privy but hasn't linked
 * their Telegram — so the server can't issue a session JWT, and
 * scores from this play session won't land on the leaderboard.
 *
 * CTA opens @SolShotGG_bot with `/start link` for the existing link
 * flow. Banner is dismissable for the session.
 *
 * Rendered at the BOTTOM of the screen so it doesn't fight the game
 * canvas. Pointer-events: auto so dismiss + CTA work over the game.
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
            <span style={styles.icon} aria-hidden>📲</span>
            <span style={styles.message}>
                <strong style={styles.title}>Free-play mode.</strong>{' '}
                Link your Telegram to track scores on the leaderboard.
            </span>
            <a
                href={SOLSHOT_BOT_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.cta}
            >
                Link Telegram ↗
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
        gap: 10,
        padding: '10px 14px',
        background: 'rgba(10, 6, 6, 0.92)',
        border: '1px solid rgba(255, 210, 58, 0.45)',
        borderRadius: 8,
        color: '#F5E6CC',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        fontSize: 13,
        lineHeight: 1.35,
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.5)',
        zIndex: 20,
        pointerEvents: 'auto',
        WebkitBackdropFilter: 'blur(4px)',
        backdropFilter: 'blur(4px)',
    },
    icon: {
        fontSize: 18,
        flexShrink: 0,
    },
    message: {
        flex: 1,
        minWidth: 0,
    },
    title: {
        color: '#FFD23A',
        fontWeight: 700,
    },
    cta: {
        display: 'inline-block',
        padding: '6px 12px',
        background: 'linear-gradient(180deg, #FFD23A 0%, #FF8A1F 100%)',
        color: '#0A0606',
        textDecoration: 'none',
        borderRadius: 5,
        fontWeight: 800,
        fontSize: 12,
        letterSpacing: 0.4,
        whiteSpace: 'nowrap',
        WebkitTapHighlightColor: 'transparent',
    },
    dismiss: {
        background: 'transparent',
        border: 'none',
        color: '#F5E6CC',
        fontSize: 22,
        lineHeight: 1,
        padding: '0 4px',
        cursor: 'pointer',
        opacity: 0.7,
        WebkitTapHighlightColor: 'transparent',
    },
};

export default TelegramLinkBanner;
