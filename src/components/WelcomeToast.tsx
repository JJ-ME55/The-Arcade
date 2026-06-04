// @ts-nocheck — JSX-heavy toast.
import { useEffect, useState } from 'react';
import { useArcadeAuth } from '@/wallet/useAuth';

const STORAGE_KEY = 'arcade_welcomed_v1';
const SHOW_DELAY_MS = 400; // small delay so the modal close → toast feels intentional
const AUTO_DISMISS_MS = 6000;

/**
 * WelcomeToast — one-time toast on the user's first authenticated mount.
 * Shows "Welcome, <callsign>" + a small "what now" sub-line for ~6s
 * then auto-dismisses. Persists dismissal in localStorage so it never
 * shows again for that browser-account combo.
 *
 * Mounts inside the AppShell so it appears on /play (where users land
 * after sign-in). Lazy-attaches when auth flips from unauth → auth.
 */
export function WelcomeToast() {
  const auth = useArcadeAuth();
  const [shown, setShown] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Watch auth state — show toast when user becomes authenticated
  // for the first time on this browser.
  useEffect(() => {
    if (!auth.authenticated) return;
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') return; // already shown before
    } catch {
      return; // localStorage unavailable
    }
    const t = setTimeout(() => setShown(true), SHOW_DELAY_MS);
    return () => clearTimeout(t);
  }, [auth.authenticated]);

  // Auto-dismiss
  useEffect(() => {
    if (!shown || dismissed) return;
    const t = setTimeout(handleDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [shown, dismissed]);

  const handleDismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch {}
  };

  if (!shown || dismissed || !auth.authenticated) return null;

  const callsign = auth.callsign || 'arcade member';
  const message = auth.hasTelegram
    ? 'Your scores will save automatically.'
    : 'Link Telegram in your account to save scores.';

  return (
    <div role="status" aria-live="polite" style={styles.root}>
      <div style={styles.body}>
        <div style={styles.title}>· Welcome ·</div>
        <div style={styles.callsign}>{callsign}</div>
        <div style={styles.message}>{message}</div>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss welcome"
        style={styles.dismiss}
      >
        ×
      </button>
    </div>
  );
}

const styles = {
  root: {
    position: 'fixed',
    top: 'max(env(safe-area-inset-top, 0px), 12px)',
    left: 'max(env(safe-area-inset-left, 0px), 12px)',
    right: 'max(env(safe-area-inset-right, 0px), 12px)',
    maxWidth: 420,
    margin: '0 auto',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: '14px 16px',
    background: 'var(--paper)',
    border: '1.5px solid var(--ink)',
    borderTop: '5px solid var(--brass)',
    color: 'var(--ink)',
    fontFamily: '"DM Sans", Inter, system-ui, sans-serif',
    zIndex: 40,
    pointerEvents: 'auto',
    boxShadow: '0 4px 12px rgba(21, 32, 58, 0.08)',
    animation: 'arcadeWelcomeSlide 220ms ease-out',
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
  callsign: {
    fontFamily: '"Krona One", "Big Shoulders Display", sans-serif',
    fontSize: 22,
    color: 'var(--ink)',
    letterSpacing: '0.01em',
    textTransform: 'uppercase',
    lineHeight: 1,
    marginBottom: 6,
  },
  message: {
    fontSize: 12.5,
    color: 'var(--ink-70)',
    lineHeight: 1.4,
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

export default WelcomeToast;
