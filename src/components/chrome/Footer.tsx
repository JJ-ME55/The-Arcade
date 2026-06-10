// @ts-nocheck — JSX-heavy chrome.
import { Link } from 'react-router-dom';

/**
 * Footer — slim site footer rendered at the bottom of the scrollable
 * content area (inside AppShell's <main>, after the route Outlet). Was
 * entirely absent: /terms, /privacy, /status were orphan pages only
 * cross-linked to each other, and there was no support path or social
 * link anywhere. Table stakes for a site that handles real money.
 *
 * Only real destinations: the Telegram bot, the support email, the
 * SolShot flagship site, plus the internal legal/ops pages. No invented
 * X/Discord links (none exist yet — better absent than dead).
 */
const NAV = [
  { label: 'Play', to: '/play' },
  { label: 'Competitions', to: '/competitions' },
  { label: 'Leaderboard', to: '/leaderboard' },
  { label: 'Status', to: '/status' },
  { label: 'Terms', to: '/terms' },
  { label: 'Privacy', to: '/privacy' },
];

const EXTERNAL = [
  { label: 'Telegram', href: 'https://t.me/TheArcadeGG_Bot' },
  { label: 'SolShot', href: 'https://www.solshot.gg' },
  { label: 'Support', href: 'mailto:jj@thearcade.gg' },
];

const linkStyle = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10.5,
  letterSpacing: '0.12em',
  fontWeight: 700,
  textTransform: 'uppercase',
  color: 'var(--ink-70)',
  textDecoration: 'none',
};

export function Footer() {
  return (
    <footer
      style={{
        background: 'var(--paper)',
        borderTop: '1.5px solid var(--ink)',
        padding: '22px 24px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px 22px',
          alignItems: 'center',
        }}
      >
        {NAV.map((l) => (
          <Link key={l.to} to={l.to} style={linkStyle}>
            {l.label}
          </Link>
        ))}
        <span style={{ width: 1, height: 12, background: 'var(--hair)' }} />
        {EXTERNAL.map((l) => (
          <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" style={linkStyle}>
            {l.label} ↗
          </a>
        ))}
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          flexWrap: 'wrap',
          gap: 8,
          borderTop: '1px solid var(--hair)',
          paddingTop: 14,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 13,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'var(--ink)',
          }}
        >
          The Arcade
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            letterSpacing: '0.14em',
            color: 'var(--ink-45)',
            textTransform: 'uppercase',
            fontWeight: 700,
          }}
        >
          A skill arcade on Solana · Play responsibly
        </span>
      </div>
    </footer>
  );
}

export default Footer;
