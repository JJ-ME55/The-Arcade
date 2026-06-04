// @ts-nocheck — JSX-heavy, lightweight typing.
import { useEffect, useState, useRef, useCallback } from 'react';
import { useArcadeAuth } from '@/wallet/useAuth';
import { useArcadeSessionMint } from '@/wallet/useArcadeSessionMint';

const API_BASE = import.meta.env.VITE_SOLSHOT_API_BASE;
const SOLSHOT_BOT_URL = 'https://t.me/SolShotGG_bot?start=link';

/**
 * Map game slug (the one we use in PORTAL_GAMES) to the server-side
 * endpoint slug (which strips hyphens for the bot-command-friendly
 * convention used by `/api/games/<slug>/score`).
 */
const SLUG_TO_ENDPOINT: Record<string, 'basketball' | 'keepieuppies' | 'freekicks'> = {
  basketball: 'basketball',
  'keepie-uppies': 'keepieuppies',
  'free-kicks': 'freekicks',
};

interface ClaimableScore {
  game: string;
  score: number;
  ts: number;
}

const CLAIM_KEY = 'claimable_score';
const CLAIM_TTL_MS = 30 * 60 * 1000; // 30 min — past this, stop offering claim

interface Props {
  /** PORTAL_GAMES slug — controls which game's claim is honoured here. */
  game: 'basketball' | 'keepie-uppies' | 'free-kicks';
}

/**
 * ClaimScoreOverlay — shared end-of-game banner for the three standalone
 * games. Renders when a guest played without auth, their score got
 * stashed in `sessionStorage.claimable_score` by the scene, and the
 * user hasn't yet signed in to claim it.
 *
 * Flow:
 *   1. Scene's game-over with no JWT → stash + this banner appears
 *      with "Sign in to claim · NN →"
 *   2. Tap → Privy modal opens (TG preferred per the SDK config)
 *   3. After auth, useArcadeSessionMint runs in the background and
 *      mints a per-game JWT via /api/arcade/mint-session
 *   4. Once the JWT lands in sessionStorage, this overlay auto-fires
 *      the score submission with the buffered claim
 *   5. On success: "Saved · Rank #X of Y" — banner stays visible for
 *      a beat, then dismisses
 *
 * If the user signs in via email/Google (no TG link), the mint returns
 * 412 → status `tg_not_linked` → we switch the CTA to "Link Telegram
 * to save" pointing at the SolShot bot.
 *
 * Mobile + desktop responsive: sticks to the bottom with safe-area
 * padding, full-width on phones, max-width 520px on desktop.
 */
export function ClaimScoreOverlay({ game }: Props) {
  const auth = useArcadeAuth();
  const sessionMint = useArcadeSessionMint(SLUG_TO_ENDPOINT[game]);
  const [claim, setClaim] = useState<ClaimableScore | null>(null);
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'saved' | 'error'>('idle');
  const [result, setResult] = useState<{ rank?: number; totalPlayers?: number; newBest?: boolean } | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const lastTriedRef = useRef<number>(0);

  // Read claim from sessionStorage on mount + poll for updates. No
  // native storage events fire for same-tab writes, so we poll cheap.
  useEffect(() => {
    const read = () => {
      try {
        const raw = sessionStorage.getItem(CLAIM_KEY);
        if (!raw) {
          setClaim((prev) => (prev !== null ? null : prev));
          return;
        }
        const parsed = JSON.parse(raw) as ClaimableScore;
        if (parsed?.game !== game) return; // not this game's claim
        if (!Number.isFinite(parsed.ts) || Date.now() - parsed.ts > CLAIM_TTL_MS) {
          // Stale — drop it
          try { sessionStorage.removeItem(CLAIM_KEY); } catch {}
          setClaim(null);
          return;
        }
        setClaim((prev) => (prev?.ts !== parsed.ts ? parsed : prev));
      } catch {
        /* sessionStorage unavailable — overlay stays hidden */
      }
    };
    read();
    const id = setInterval(read, 600);
    return () => clearInterval(id);
  }, [game]);

  // Auto-submit when a JWT becomes available after sign-in. Guards
  // against multi-fire by tracking lastTried timestamp.
  const tryAutoSubmit = useCallback(async () => {
    if (!claim || submitState !== 'idle') return;
    if (Date.now() - lastTriedRef.current < 1500) return;
    if (!API_BASE) return;
    // Need either a JWT in sessionStorage (mint completed) or the bot
    // user's pre-existing arcade_session
    let session: string | null = null;
    try {
      session = sessionStorage.getItem('arcade_session') || sessionStorage.getItem('arcadeSession');
    } catch { return; }
    if (!session) return;

    lastTriedRef.current = Date.now();
    setSubmitState('submitting');
    try {
      const endpointSlug = SLUG_TO_ENDPOINT[claim.game];
      const resp = await fetch(`${API_BASE}/api/games/${endpointSlug}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: claim.score, session }),
      });
      if (!resp.ok) {
        // 401 = JWT expired, 403 = TG not linked, others = network/server
        setSubmitState('error');
        return;
      }
      const data = await resp.json();
      if (!data?.ok) {
        setSubmitState('error');
        return;
      }
      setSubmitState('saved');
      setResult({ rank: data.rank, totalPlayers: data.totalPlayers, newBest: data.newBest });
      try { sessionStorage.removeItem(CLAIM_KEY); } catch {}
    } catch {
      setSubmitState('error');
    }
  }, [claim, submitState]);

  useEffect(() => {
    if (sessionMint.status === 'ok' || sessionMint.status === 'has_session') {
      void tryAutoSubmit();
    }
  }, [sessionMint.status, claim, tryAutoSubmit]);

  // Dismissable on success after a delay so the user reads the rank.
  useEffect(() => {
    if (submitState === 'saved') {
      const t = setTimeout(() => setDismissed(true), 6000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [submitState]);

  if (!claim || dismissed) return null;

  // Determine the right CTA based on auth + mint state
  const isAuthenticated = auth.authenticated;
  const isTgUnlinked = sessionMint.status === 'tg_not_linked';
  const isMinting = sessionMint.status === 'minting' || submitState === 'submitting';

  let title = '· UNCLAIMED SCORE ·';
  let body = `Sign in to claim your ${claim.score} and rank on the board.`;
  let ctaText = 'Sign in to claim ▸';
  let ctaHandler: (() => void) | null = () => auth.login();
  let ctaHref: string | null = null;

  if (submitState === 'saved' && result) {
    title = result.newBest ? '· NEW BEST · CLAIMED ·' : '· SCORE CLAIMED ·';
    body =
      result.rank && result.totalPlayers
        ? `Rank #${result.rank} of ${result.totalPlayers}.`
        : 'Saved.';
    ctaText = 'Dismiss';
    ctaHandler = () => setDismissed(true);
  } else if (submitState === 'error') {
    title = '· COULD NOT SAVE ·';
    body = 'Network blip — try again or just play another round.';
    ctaText = 'Retry ▸';
    ctaHandler = () => {
      setSubmitState('idle');
      lastTriedRef.current = 0;
      void tryAutoSubmit();
    };
  } else if (isAuthenticated && isTgUnlinked) {
    title = '· LINK TELEGRAM TO SAVE ·';
    body = `Your ${claim.score} is held — link your Telegram so it counts.`;
    ctaText = '▸ Link Telegram';
    ctaHref = SOLSHOT_BOT_URL;
    ctaHandler = null;
  } else if (isAuthenticated && isMinting) {
    title = '· SAVING ·';
    body = `Claiming your ${claim.score}…`;
    ctaText = '…';
    ctaHandler = null;
  }

  return (
    <div role="status" style={styles.root}>
      <div style={styles.body}>
        <div style={styles.title}>{title}</div>
        <div style={styles.message}>{body}</div>
      </div>
      {ctaHref ? (
        <a href={ctaHref} target="_blank" rel="noopener noreferrer" style={styles.cta}>
          {ctaText}
        </a>
      ) : (
        <button
          type="button"
          onClick={ctaHandler ?? undefined}
          disabled={ctaHandler == null}
          style={{
            ...styles.cta,
            ...(ctaHandler == null ? styles.ctaDisabled : null),
          }}
        >
          {ctaText}
        </button>
      )}
      {submitState !== 'submitting' && submitState !== 'saved' && (
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          style={styles.dismiss}
        >
          ×
        </button>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    position: 'absolute',
    left: 'max(env(safe-area-inset-left, 0px), 12px)',
    right: 'max(env(safe-area-inset-right, 0px), 12px)',
    bottom: 'max(env(safe-area-inset-bottom, 0px), 12px)',
    maxWidth: 520,
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 14px',
    background: 'var(--paper)',
    border: '1.5px solid var(--ink)',
    borderTop: '3px solid var(--brass)',
    color: 'var(--ink)',
    fontFamily: '"DM Sans", Inter, system-ui, sans-serif',
    zIndex: 25,
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
    padding: '10px 16px',
    minHeight: 36,
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
    border: '1.5px solid var(--ink)',
    cursor: 'pointer',
  },
  ctaDisabled: {
    opacity: 0.6,
    cursor: 'default',
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

export default ClaimScoreOverlay;
