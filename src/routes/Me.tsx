// @ts-nocheck — JSX-heavy editorial profile page.
import { useNavigate } from 'react-router-dom';
import { useArcadeAuth } from '@/wallet/useAuth';

const SOLSHOT_BOT_URL = 'https://t.me/SolShotGG_bot?start=link';

/**
 * /me — stub profile page. Provides the minimum accountability surface
 * a signed-in user needs:
 *   - Who am I (callsign + tier)
 *   - Which auth methods are bound (TG, email, Google, wallet)
 *   - "Link Telegram" CTA if email-only (V1 needs TG to save scores)
 *   - Sign out
 *
 * Editorial detail page (avatar customisation, achievements, match
 * history, settings) is V2 work. For V1 launch, this surface
 * answers "wait, am I actually signed in?" and "how do I sign out?".
 */
export function Me() {
  const auth = useArcadeAuth();
  const navigate = useNavigate();

  // Not signed in → prompt to sign in (lazy-auth model from canonical
  // doc §12.2.5 — don't hard-gate, surface the CTA).
  if (!auth.authenticated) {
    return (
      <main style={styles.signedOutRoot}>
        <div style={styles.signedOutCard}>
          <p style={styles.eyebrow}>· The Arcade · Your Account ·</p>
          <h1 style={styles.h1}>Sign in</h1>
          <p style={styles.signedOutBody}>
            You're playing as a guest. Sign in to save scores, climb the
            leaderboards, and (V3) collect Tickets.
          </p>
          <button
            type="button"
            onClick={() => auth.login()}
            style={styles.primaryCta}
          >
            ▸ Insert Coin · Sign In
          </button>
          <button
            type="button"
            onClick={() => navigate('/play')}
            style={styles.secondaryCta}
          >
            Return to the Floor
          </button>
        </div>
      </main>
    );
  }

  const callsign = auth.callsign || 'arcade member';
  const initial = (auth.initial || callsign[0] || 'A').toUpperCase();
  const tier = auth.hasTelegram ? 'Floor Member' : 'Link Telegram';

  return (
    <main style={styles.root}>
      <div style={styles.container}>
        <p style={styles.eyebrow}>· The Arcade · Your Account ·</p>
        <h1 style={styles.h1}>{callsign}</h1>
        <p style={styles.tier}>
          · Tier 01 · {tier} ·
        </p>

        {/* Identity / linked accounts */}
        <section style={styles.section}>
          <h2 style={styles.h2}>Sign-in methods</h2>
          <p style={styles.sectionMeta}>
            Bound to your account. Sign in with any of them.
          </p>

          <ul style={styles.methodList}>
            <li style={styles.methodRow}>
              <span style={styles.methodLabel}>Telegram</span>
              <span style={auth.hasTelegram ? styles.methodOn : styles.methodOff}>
                {auth.hasTelegram ? '✓ LINKED' : '— NOT LINKED'}
              </span>
            </li>
            <li style={styles.methodRow}>
              <span style={styles.methodLabel}>Email · Google · Wallet</span>
              <span style={styles.methodOn}>✓ SIGNED IN VIA PRIVY</span>
            </li>
          </ul>

          {!auth.hasTelegram && (
            <div style={styles.alertBox}>
              <p style={styles.alertEyebrow}>· Link Telegram to save scores ·</p>
              <p style={styles.alertBody}>
                You're signed in but Telegram isn't linked. Score
                submissions need a Telegram identity. Link via the
                SolShot bot.
              </p>
              <a
                href={SOLSHOT_BOT_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.alertCta}
              >
                ▸ Link Telegram
              </a>
            </div>
          )}
        </section>

        {/* Coming soon — V2 stuff so users see the path */}
        <section style={styles.section}>
          <h2 style={styles.h2}>Coming in V2</h2>
          <ul style={styles.somelist}>
            <li>· Edit callsign + avatar</li>
            <li>· Match history + stats</li>
            <li>· Achievements + trophy case</li>
            <li>· Notification preferences</li>
            <li>· Tickets balance + prize claims (V3)</li>
          </ul>
        </section>

        {/* Account controls */}
        <section style={styles.section}>
          <h2 style={styles.h2}>Controls</h2>
          <div style={styles.buttonRow}>
            <button
              type="button"
              onClick={() => navigate('/wallet')}
              style={styles.secondaryCta}
            >
              Wallet
            </button>
            <button
              type="button"
              onClick={async () => {
                await auth.logout();
                navigate('/', { replace: true });
              }}
              style={{ ...styles.secondaryCta, color: 'var(--lose)', borderColor: 'var(--lose)' }}
            >
              Sign Out
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

const styles = {
  root: {
    minHeight: '100dvh',
    background: 'var(--bg)',
    color: 'var(--ink)',
    padding: '40px 16px 80px',
  },
  signedOutRoot: {
    minHeight: '100dvh',
    background: 'var(--bg)',
    color: 'var(--ink)',
    padding: '40px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signedOutCard: {
    maxWidth: 480,
    width: '100%',
    background: 'var(--paper)',
    border: '1.5px solid var(--ink)',
    borderTop: '5px solid var(--brass)',
    padding: '32px 28px',
    textAlign: 'center',
  },
  container: {
    maxWidth: 720,
    margin: '0 auto',
  },
  eyebrow: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    letterSpacing: '0.22em',
    color: 'var(--brass-deep)',
    textTransform: 'uppercase',
    fontWeight: 700,
    margin: '0 0 12px',
  },
  h1: {
    fontFamily: 'var(--font-display)',
    fontSize: 'clamp(2.5rem, 8vw, 4rem)',
    margin: '0 0 8px',
    lineHeight: 0.92,
    letterSpacing: '0.01em',
    textTransform: 'uppercase',
  },
  tier: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    letterSpacing: '0.22em',
    color: 'var(--ink-45)',
    textTransform: 'uppercase',
    fontWeight: 700,
    margin: '0 0 32px',
  },
  section: {
    paddingTop: 24,
    borderTop: '1px solid var(--hair)',
    marginTop: 24,
  },
  h2: {
    fontFamily: 'var(--font-display)',
    fontSize: 18,
    margin: '0 0 8px',
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
  },
  sectionMeta: {
    fontFamily: 'var(--font-mono)',
    fontSize: 9.5,
    letterSpacing: '0.18em',
    color: 'var(--ink-45)',
    textTransform: 'uppercase',
    fontWeight: 700,
    margin: '0 0 16px',
  },
  methodList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    border: '1.5px solid var(--ink)',
    background: 'var(--paper)',
  },
  methodRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px dotted var(--hair)',
    fontSize: 13.5,
  },
  methodLabel: {
    color: 'var(--ink)',
    fontWeight: 600,
  },
  methodOn: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.14em',
    color: 'var(--win)',
  },
  methodOff: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.14em',
    color: 'var(--ink-45)',
  },
  alertBox: {
    marginTop: 16,
    padding: '14px 16px',
    background: 'var(--paper)',
    border: '1.5px solid var(--ink)',
    borderTop: '3px solid var(--brass)',
  },
  alertEyebrow: {
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    letterSpacing: '0.22em',
    color: 'var(--brass-deep)',
    textTransform: 'uppercase',
    fontWeight: 700,
    margin: '0 0 6px',
  },
  alertBody: {
    fontSize: 13,
    color: 'var(--ink-70)',
    lineHeight: 1.5,
    margin: '0 0 12px',
  },
  alertCta: {
    display: 'inline-block',
    padding: '10px 18px',
    background: 'var(--ink)',
    color: 'var(--paper)',
    textDecoration: 'none',
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
  },
  somelist: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    fontFamily: 'var(--font-mono)',
    fontSize: 11.5,
    letterSpacing: '0.06em',
    color: 'var(--ink-70)',
    lineHeight: 2,
  },
  buttonRow: {
    display: 'flex',
    gap: 12,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  primaryCta: {
    padding: '14px 28px',
    background: 'var(--ink)',
    color: 'var(--paper)',
    border: '1.5px solid var(--ink)',
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    letterSpacing: '0.22em',
    fontWeight: 700,
    textTransform: 'uppercase',
    cursor: 'pointer',
    marginTop: 20,
    marginBottom: 12,
    width: '100%',
  },
  signedOutBody: {
    fontSize: 14,
    color: 'var(--ink-70)',
    lineHeight: 1.5,
    margin: '12px 0 8px',
  },
  secondaryCta: {
    padding: '12px 22px',
    background: 'transparent',
    color: 'var(--ink)',
    border: '1.5px solid var(--ink)',
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    letterSpacing: '0.18em',
    fontWeight: 700,
    textTransform: 'uppercase',
    cursor: 'pointer',
  },
};

export default Me;
