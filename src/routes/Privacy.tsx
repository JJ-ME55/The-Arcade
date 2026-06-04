// @ts-nocheck — copy-heavy editorial page.
import { Link } from 'react-router-dom';

/**
 * Privacy Policy — V1 scaffold. Reflects what we actually collect
 * today: TG identity (via session JWT or Privy OAuth), score history
 * keyed on TG user id, optional wallet binding for SolShot wagering.
 *
 * IMPORTANT: this is a scaffold. Before any paid acquisition push
 * (Cryo, Kairos, X amp), a real privacy review needs to vet the copy
 * against GDPR + UK ICO requirements. Placeholder text reads truthful
 * but a lawyer should sign it off before it's load-bearing.
 */
export function Privacy() {
  return (
    <main style={styles.root}>
      <div style={styles.container}>
        <p style={styles.eyebrow}>· The Arcade · Privacy ·</p>
        <h1 style={styles.h1}>Privacy</h1>
        <p style={styles.meta}>Last updated: 2026-06-03 · V1 scaffold</p>

        <section style={styles.section}>
          <h2 style={styles.h2}>What we collect</h2>
          <p style={styles.p}>
            When you play through the Telegram bot, we collect your
            Telegram user id, username, and first name so we can credit
            your scores to your account. When you sign in to the web hub
            via Privy, we collect whichever identity method you choose
            (Telegram OAuth, email, Google, or wallet address). Game
            scores and gameplay metadata (match counts, best scores,
            achievement timestamps) are stored against that identity.
          </p>
          <p style={styles.p}>
            We do not collect: real-name identity (unless you give it
            voluntarily via Telegram), location, contacts, or
            advertising IDs.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>Why we collect it</h2>
          <p style={styles.p}>
            To credit you on leaderboards. To restore your scores when
            you sign in from a new device. To compute your standing.
            To send you Telegram messages about your match outcomes if
            you're a bot user. That's it.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>Who we share it with</h2>
          <p style={styles.p}>
            Telegram (your bot interactions go through their platform).
            Privy (our authentication provider — they handle your login
            credentials and your embedded Solana wallet). MongoDB Atlas
            (our database host — your account data sits there).
            Solana (your wagering transactions are on-chain and
            publicly visible by design).
          </p>
          <p style={styles.p}>
            We do not sell your data. We do not run advertising
            networks against it. There are no third-party trackers on
            this site.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>How long we keep it</h2>
          <p style={styles.p}>
            Score and gameplay data persists for the lifetime of your
            account. If you delete your account (email us — automated
            delete UI is V2 work), we remove your account record and
            score history within 30 days. Telegram-side data is
            governed by Telegram's own retention policies.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>Your rights</h2>
          <p style={styles.p}>
            You can request a copy of your data, ask us to correct it,
            or ask us to delete it. Email jj@thearcade.gg with the
            Telegram username or wallet address tied to the request.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>Cookies + storage</h2>
          <p style={styles.p}>
            We use browser sessionStorage to hold your active sign-in
            session and any unclaimed scores you've played as a guest.
            We use localStorage to retry score submissions that
            failed due to network blips. We use Privy's own cookies
            (managed by them) to keep you signed in across sessions.
            No advertising cookies, no analytics cookies beyond
            Vercel's first-party request logs.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>Age</h2>
          <p style={styles.p}>
            The Arcade is for users aged 18 and above. We don't
            knowingly serve users under 18. If we learn that we have,
            we delete the account.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>Contact</h2>
          <p style={styles.p}>
            Email: jj@thearcade.gg<br />
            Operator: The Arcade.
          </p>
        </section>

        <p style={styles.footer}>
          <Link to="/terms" style={styles.footerLink}>Terms of Service</Link>
          {' · '}
          <Link to="/play" style={styles.footerLink}>Return to the floor</Link>
        </p>
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
    fontSize: 'clamp(2.5rem, 8vw, 4.5rem)',
    margin: '0 0 8px',
    lineHeight: 0.92,
    letterSpacing: '0.01em',
    textTransform: 'uppercase',
  },
  meta: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    letterSpacing: '0.18em',
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
    fontSize: 22,
    margin: '0 0 12px',
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
  },
  p: {
    fontSize: 14.5,
    lineHeight: 1.6,
    color: 'var(--ink-70)',
    margin: '0 0 14px',
  },
  footer: {
    marginTop: 56,
    paddingTop: 24,
    borderTop: '1.5px solid var(--ink)',
    fontFamily: 'var(--font-mono)',
    fontSize: 10.5,
    letterSpacing: '0.18em',
    color: 'var(--ink-45)',
    textTransform: 'uppercase',
    fontWeight: 700,
    textAlign: 'center',
  },
  footerLink: {
    color: 'var(--ink-70)',
    textDecoration: 'none',
  },
};

export default Privacy;
