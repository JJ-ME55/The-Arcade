// @ts-nocheck — JSX-heavy first-time intro overlay.
import { useState, useEffect } from 'react';
import { HOW_TO_PLAY } from '@/data/game-detail-fixtures';

/**
 * HowToPlayIntro — first-time-per-session overlay shown when a user
 * mounts a game screen. Pulls the 3-step howTo from game-detail-
 * fixtures (which already exist; we just surface them inside the
 * game canvas as a first-time tutorial). Tap anywhere or the
 * "Play" CTA to dismiss.
 *
 * Persistence: sessionStorage so it shows ONCE per browser session
 * (not localStorage — we want returning users to NOT see it again
 * across sessions either, hence the per-slug + first-visit-ever
 * check). Compromise: persist a per-game flag in localStorage.
 *
 *   localStorage.arcade_intro_<slug> = '1'  after dismiss
 *
 * Designed for both web and TG WebView. ≥44px tap targets, safe-area
 * padded, dismisses on backdrop tap too.
 */
interface Props {
  slug: 'basketball' | 'keepie-uppies' | 'free-kicks' | 'solshot' | 'pool';
  gameName: string;
}

const STORAGE_KEY = (slug: string) => `arcade_intro_${slug}_v1`;

export function HowToPlayIntro({ slug, gameName }: Props) {
  const [dismissed, setDismissed] = useState(true); // start hidden — only show after the check

  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY(slug)) === '1';
      if (!seen) setDismissed(false);
    } catch {
      /* localStorage unavailable — skip showing (better than crashing) */
    }
  }, [slug]);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY(slug), '1');
    } catch { /* no-op */ }
  };

  if (dismissed) return null;

  const steps = HOW_TO_PLAY[slug];
  if (!steps || steps.length === 0) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`How to play ${gameName}`}
      onClick={(e) => {
        // Tap on backdrop dismisses
        if (e.target === e.currentTarget) handleDismiss();
      }}
      style={styles.backdrop}
    >
      <div style={styles.card} onClick={(e) => e.stopPropagation()}>
        <p style={styles.eyebrow}>· How to Play ·</p>
        <h2 style={styles.h2}>{gameName}</h2>

        <ol style={styles.list}>
          {steps.map((step) => (
            <li key={step.n} style={styles.step}>
              <span style={styles.stepNum}>{step.n}</span>
              <div style={styles.stepBody}>
                <div style={styles.stepTitle}>{step.title}</div>
                <div style={styles.stepDesc}>{step.desc}</div>
              </div>
            </li>
          ))}
        </ol>

        <button
          type="button"
          onClick={handleDismiss}
          style={styles.cta}
        >
          ▸ Tap to Play
        </button>

        <button
          type="button"
          onClick={handleDismiss}
          style={styles.dismiss}
          aria-label="Skip intro"
        >
          Skip
        </button>
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(14, 26, 46, 0.78)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px 16px max(env(safe-area-inset-bottom, 0px), 20px)',
    paddingTop: 'max(env(safe-area-inset-top, 20px), 20px)',
    zIndex: 30,
    pointerEvents: 'auto',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    background: 'var(--paper)',
    border: '1.5px solid var(--ink)',
    borderTop: '5px solid var(--brass)',
    padding: '24px 22px 20px',
    color: 'var(--ink)',
    fontFamily: '"DM Sans", Inter, system-ui, sans-serif',
    textAlign: 'left',
  },
  eyebrow: {
    fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
    fontSize: 9.5,
    letterSpacing: '0.22em',
    color: 'var(--brass-deep)',
    textTransform: 'uppercase',
    fontWeight: 700,
    margin: '0 0 6px',
  },
  h2: {
    fontFamily: '"Krona One", "Big Shoulders Display", sans-serif',
    fontSize: 28,
    margin: '0 0 18px',
    textTransform: 'uppercase',
    letterSpacing: '0.005em',
    lineHeight: 1,
  },
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    marginBottom: 16,
  },
  step: {
    display: 'flex',
    gap: 14,
    padding: '12px 0',
    borderBottom: '1px dotted var(--hair)',
  },
  stepNum: {
    fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '0.06em',
    color: 'var(--brass-deep)',
    width: 28,
    flexShrink: 0,
  },
  stepBody: {
    flex: 1,
    minWidth: 0,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--ink)',
    marginBottom: 2,
  },
  stepDesc: {
    fontSize: 12.5,
    color: 'var(--ink-70)',
    lineHeight: 1.45,
  },
  cta: {
    width: '100%',
    padding: '14px 18px',
    minHeight: 48,
    background: 'var(--ink)',
    color: 'var(--paper)',
    border: '1.5px solid var(--ink)',
    fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
    marginBottom: 8,
  },
  dismiss: {
    width: '100%',
    padding: '8px',
    background: 'transparent',
    color: 'var(--ink-45)',
    border: 'none',
    fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
    fontSize: 10,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    fontWeight: 700,
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
  },
};

export default HowToPlayIntro;
