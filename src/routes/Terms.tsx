// @ts-nocheck — copy-heavy editorial page.
import { Link } from 'react-router-dom';

/**
 * Terms of Service — V1 scaffold. Same warning as the Privacy page:
 * this is a starting point for a legal review before any paid
 * acquisition push. Placeholder language is honest about what The
 * Arcade is and isn't, but a lawyer should sign it off before it
 * carries any real legal weight.
 */
export function Terms() {
  return (
    <main style={styles.root}>
      <div style={styles.container}>
        <p style={styles.eyebrow}>· The Arcade · Terms ·</p>
        <h1 style={styles.h1}>Terms of Service</h1>
        <p style={styles.meta}>Last updated: 2026-06-03 · V1 scaffold</p>

        <section style={styles.section}>
          <h2 style={styles.h2}>What this is</h2>
          <p style={styles.p}>
            The Arcade is a games-first arcade on Solana rails. You can
            play skill-based games, climb leaderboards, and (in V2)
            wager on outcomes against other players. By using the site
            you agree to these terms.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>Eligibility</h2>
          <p style={styles.p}>
            You must be at least 18 years old to use The Arcade. If
            you're accessing the site from a jurisdiction where any
            element of what we provide is restricted (e.g. real-money
            gaming), you're responsible for complying with local law.
            We may geo-restrict features at our discretion.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>Your account</h2>
          <p style={styles.p}>
            You're responsible for your account credentials (Telegram
            identity, Privy session, wallet keys). You cannot transfer
            your account to another person. You cannot create
            multiple accounts to manipulate leaderboards or game
            outcomes. Bot, macro, and automation use is prohibited.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>Skill-based gameplay</h2>
          <p style={styles.p}>
            All games on The Arcade are skill-based. Outcomes are
            determined by your play, not chance. We do not offer
            games of pure chance.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>Wagering (V2)</h2>
          <p style={styles.p}>
            Wagering features are not yet live. When they ship, wagers
            are peer-to-peer transfers settled on Solana via on-chain
            escrow. We take a service rake (currently 7-10% per
            settled match). Wagering carries financial risk. Only
            wager what you can afford to lose. You're responsible for
            tax implications in your jurisdiction.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>In-game currency + Tickets (V3)</h2>
          <p style={styles.p}>
            In-game currencies and "Tickets" are closed, non-tradable
            digital balances. They have no real-world cash value
            outside the redemption surfaces we operate (the V3 prize
            counter). They cannot be sold, transferred, or withdrawn.
            We can suspend or reset them at our discretion to defend
            the economy against abuse.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>Acceptable use</h2>
          <p style={styles.p}>
            Don't cheat. Don't run bots. Don't exploit bugs. Don't
            abuse other players. Don't try to break the site. Don't
            attempt to access systems you're not authorised for. We
            can suspend accounts for any of the above with or without
            notice.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>What we promise (and don't)</h2>
          <p style={styles.p}>
            We provide the site on a best-effort basis. Games may go
            down for maintenance. Leaderboards may reset. We may
            change features. We don't guarantee uptime, data
            persistence, or feature continuity. Use at your own risk.
          </p>
          <p style={styles.p}>
            To the extent permitted by law, we exclude liability for
            indirect damages, lost profits, lost in-game progress,
            lost wagering positions, or any consequential loss from
            using the site.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>Changes</h2>
          <p style={styles.p}>
            We may update these terms. Material changes will be
            announced via the site banner or Telegram bot. Continued
            use after a change means you accept the new terms.
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
          <Link to="/privacy" style={styles.footerLink}>Privacy Policy</Link>
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

export default Terms;
