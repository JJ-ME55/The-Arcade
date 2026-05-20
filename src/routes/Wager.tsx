// @ts-nocheck — JSX-heavy route, keeping types loose until brand pass.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useArcadeAuth } from '@/wallet/useAuth';

const API_BASE = import.meta.env.VITE_SOLSHOT_API_BASE;

export function Wager() {
  const auth = useArcadeAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle' | 'submitting' | 'success' | 'already' | 'error'
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !API_BASE) return;
    setStatus('submitting');
    setErrorMsg('');
    try {
      const resp = await fetch(`${API_BASE}/api/wager-waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          callsign: auth.callsign || null,
          source: 'thearcade.web',
        }),
      });
      const data = await resp.json().catch(() => null);
      if (resp.ok && data?.ok) {
        setStatus(data.alreadySignedUp ? 'already' : 'success');
      } else {
        setStatus('error');
        setErrorMsg(data?.error || 'Failed to join waitlist');
      }
    } catch (err) {
      setStatus('error');
      setErrorMsg(err?.message || 'Network error');
    }
  };

  return (
    <main style={styles.root}>
      <section style={styles.hero}>
        <p style={styles.pill}>Coming Soon</p>
        <h1 style={styles.title}>Wager Mode</h1>
        <p style={styles.lede}>
          Multi-game time-windowed wagers. Pick the games, set the window,
          top score wins the pot. Smart-contract escrow, automatic on-chain payout.
        </p>
      </section>

      <section style={styles.steps}>
        {[
          { n: '01', title: 'Host picks the games', desc: 'Any combination of arcade titles.' },
          { n: '02', title: 'Set a window', desc: '1, 2, 4 or 7 days.' },
          { n: '03', title: 'Top score wins the pot', desc: 'Play, post your scores, payout on-chain.' },
        ].map((step) => (
          <div key={step.n} style={styles.step}>
            <span style={styles.stepNumber}>{step.n}</span>
            <div>
              <h3 style={styles.stepTitle}>{step.title}</h3>
              <p style={styles.stepDesc}>{step.desc}</p>
            </div>
          </div>
        ))}
      </section>

      <section style={styles.formCard}>
        {(status === 'success' || status === 'already') ? (
          <div style={styles.successBlock}>
            <p style={styles.successTitle}>
              {status === 'success' ? "You're on the list." : "Already on the list."}
            </p>
            <p style={styles.successBody}>
              We'll email <strong style={{ color: 'var(--accent)' }}>{email}</strong> when Wager
              Mode opens for beta. In the meantime, hit a high score on the leaderboards —
              waitlist users with top ranks get first access.
            </p>
            <button
              type="button"
              onClick={() => navigate('/leaderboards')}
              style={styles.successCta}
            >
              See leaderboards →
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={styles.form}>
            <label htmlFor="wager-email" style={styles.label}>
              Get beta access
            </label>
            <p style={styles.formNote}>
              Wager-Mode invites go out first to waitlist members. No spam, one email when it opens.
            </p>
            <div style={styles.inputRow}>
              <input
                id="wager-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@somewhere.gg"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status === 'submitting'}
                required
                style={styles.input}
              />
              <button
                type="submit"
                disabled={status === 'submitting' || !email.trim()}
                style={styles.submit}
              >
                {status === 'submitting' ? '…' : 'Join'}
              </button>
            </div>
            {status === 'error' && (
              <p style={styles.error}>
                {errorMsg === 'invalid_email'
                  ? "That doesn't look like a valid email."
                  : `Something went wrong (${errorMsg}). Try again.`}
              </p>
            )}
          </form>
        )}
      </section>

      <section style={styles.faq}>
        <h2 style={styles.faqTitle}>FAQ</h2>
        <details style={styles.faqItem}>
          <summary style={styles.faqQ}>When does Wager Mode launch?</summary>
          <p style={styles.faqA}>Target window: Q4 2026. See the roadmap.</p>
        </details>
        <details style={styles.faqItem}>
          <summary style={styles.faqQ}>What's the wager currency?</summary>
          <p style={styles.faqA}>SOL at launch. $TOKENS rewards layer comes in v2.</p>
        </details>
        <details style={styles.faqItem}>
          <summary style={styles.faqQ}>How does payout work?</summary>
          <p style={styles.faqA}>
            Pots sit in a Solana smart-contract escrow during the wager window. When the window
            closes, the contract sends the pot to the top scorer's wallet. No custodian.
          </p>
        </details>
        <details style={styles.faqItem}>
          <summary style={styles.faqQ}>Is this skill-based?</summary>
          <p style={styles.faqA}>
            Yes — outcomes depend entirely on game performance against other players within the
            window. No house edge, no chance-of-the-draw games.
          </p>
        </details>
      </section>

      <footer style={styles.footer}>
        <button type="button" onClick={() => navigate('/dashboard')} style={styles.backButton}>
          ← Back to The Arcade
        </button>
      </footer>
    </main>
  );
}

const styles = {
  root: {
    minHeight: '100dvh',
    padding: 'var(--space-6) var(--space-4)',
    maxWidth: 640,
    margin: '0 auto',
    paddingBottom: 'calc(var(--space-12) + env(safe-area-inset-bottom, 0px))',
  },
  hero: {
    textAlign: 'center',
    marginBottom: 'var(--space-8)',
  },
  pill: {
    display: 'inline-block',
    padding: '4px 10px',
    margin: '0 0 var(--space-4) 0',
    background: 'rgba(255, 210, 58, 0.16)',
    border: '1px solid var(--accent)',
    borderRadius: 99,
    color: 'var(--accent)',
    fontFamily: 'var(--font-display)',
    fontSize: 10,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: 'clamp(2rem, 8vw, 3.5rem)',
    letterSpacing: '0.06em',
    background: 'var(--fire-gradient)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    marginBottom: 'var(--space-4)',
  },
  lede: {
    margin: 0,
    fontSize: '0.95rem',
    color: 'var(--paper-warm)',
    opacity: 0.85,
    lineHeight: 1.55,
  },
  steps: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: 'var(--space-3)',
    marginBottom: 'var(--space-8)',
  },
  step: {
    display: 'flex',
    gap: 'var(--space-4)',
    alignItems: 'flex-start',
    padding: 'var(--space-4)',
    background: 'rgba(245, 230, 204, 0.04)',
    border: '1px solid rgba(245, 230, 204, 0.08)',
    borderRadius: 6,
  },
  stepNumber: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.25rem',
    color: 'var(--accent)',
    letterSpacing: '0.06em',
    minWidth: 36,
  },
  stepTitle: {
    margin: '0 0 4px 0',
    fontSize: '1rem',
    color: 'var(--paper-warm)',
    fontWeight: 700,
  },
  stepDesc: {
    margin: 0,
    fontSize: '0.875rem',
    color: 'var(--paper-warm)',
    opacity: 0.7,
    lineHeight: 1.5,
  },
  formCard: {
    padding: 'var(--space-6)',
    background: 'rgba(255, 210, 58, 0.04)',
    border: '1px solid rgba(255, 210, 58, 0.25)',
    borderRadius: 8,
    marginBottom: 'var(--space-8)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontFamily: 'var(--font-display)',
    fontSize: 13,
    letterSpacing: '0.1em',
    color: 'var(--accent)',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  formNote: {
    margin: '0 0 var(--space-4) 0',
    fontSize: '0.8rem',
    color: 'var(--paper-warm)',
    opacity: 0.7,
    lineHeight: 1.45,
  },
  inputRow: {
    display: 'flex',
    gap: 8,
  },
  input: {
    flex: 1,
    padding: '10px 12px',
    background: 'rgba(10, 6, 6, 0.5)',
    border: '1px solid rgba(245, 230, 204, 0.2)',
    borderRadius: 4,
    color: 'var(--paper-warm)',
    fontFamily: 'var(--font-body)',
    fontSize: 14,
    minWidth: 0,
  },
  submit: {
    padding: '10px 18px',
    background: 'var(--fire-gradient)',
    color: 'var(--arcade-black)',
    border: 'none',
    borderRadius: 4,
    fontFamily: 'var(--font-display)',
    fontSize: 12,
    letterSpacing: '0.08em',
    fontWeight: 700,
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
  },
  error: {
    marginTop: 8,
    fontSize: '0.8rem',
    color: 'var(--accent-live)',
  },
  successBlock: {
    textAlign: 'center',
  },
  successTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: 18,
    color: 'var(--accent)',
    letterSpacing: '0.06em',
    margin: '0 0 var(--space-3) 0',
  },
  successBody: {
    margin: '0 0 var(--space-4) 0',
    fontSize: '0.9rem',
    color: 'var(--paper-warm)',
    opacity: 0.85,
    lineHeight: 1.55,
  },
  successCta: {
    padding: '8px 16px',
    background: 'transparent',
    border: '1px solid var(--accent)',
    color: 'var(--accent)',
    borderRadius: 4,
    fontFamily: 'var(--font-display)',
    fontSize: 12,
    letterSpacing: '0.06em',
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
  },
  faq: {
    marginBottom: 'var(--space-8)',
  },
  faqTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: 16,
    letterSpacing: '0.1em',
    color: 'var(--accent)',
    margin: '0 0 var(--space-3) 0',
    textTransform: 'uppercase',
  },
  faqItem: {
    padding: 'var(--space-3)',
    background: 'rgba(245, 230, 204, 0.03)',
    border: '1px solid rgba(245, 230, 204, 0.08)',
    borderRadius: 4,
    marginBottom: 8,
  },
  faqQ: {
    cursor: 'pointer',
    fontSize: 14,
    color: 'var(--paper-warm)',
    fontWeight: 600,
    listStyle: 'none',
  },
  faqA: {
    margin: '8px 0 0 0',
    fontSize: 13,
    color: 'var(--paper-warm)',
    opacity: 0.75,
    lineHeight: 1.55,
  },
  footer: {
    textAlign: 'center',
  },
  backButton: {
    padding: '8px 14px',
    background: 'transparent',
    border: '1px solid rgba(255, 210, 58, 0.45)',
    borderRadius: 6,
    color: 'var(--accent)',
    fontFamily: 'var(--font-display)',
    fontSize: 12,
    letterSpacing: '0.06em',
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
  },
};

export default Wager;
