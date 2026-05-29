import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';

/**
 * Pool launch route — `/play/pool/launch`.
 *
 * Backend is fully wired on the SolShot server (ELO matchmaking,
 * wagered escrow, tournaments, marathon mode, dual Gold + Ticket
 * ledgers — see SolShot main, commits 23c215e..99ef1a6). The
 * playable canvas lives on this repo's arcade/8-ball-pool branch
 * as a Webpack + TS standalone build (henshmi/Classic-8-Ball-Pool
 * TS remake fork). Lift into src/games/pool/ is pending.
 *
 * Until lift, this route shows a "Backend ready" panel so the
 * /pool bot command + arcade dashboard tile both have a working
 * destination. Visiting users see what's online and what's coming.
 *
 * Captures `?session=<jwt>` from the URL same as other game routes;
 * stashes for the lifted canvas to pick up when it lands.
 */
export function Pool() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  // Stash the arcade-bot session JWT so the lifted canvas can read it
  // (matches the basketball / keepies / free-kicks pattern).
  useEffect(() => {
    const session = params.get('session');
    if (session) {
      try {
        sessionStorage.setItem('arcade_session', session);
      } catch {
        /* sessionStorage unavailable — server-side or private mode */
      }
    }
  }, [params]);

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--bg)',
        color: 'var(--ink)',
        fontFamily: 'var(--font-body, "DM Sans", system-ui)',
        padding: '48px 24px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div
          style={{
            fontFamily: 'var(--font-mono, "IBM Plex Mono", monospace)',
            fontSize: 11,
            letterSpacing: '0.16em',
            color: 'var(--ink-45)',
            textTransform: 'uppercase',
            marginBottom: 12,
          }}
        >
          The Arcade · Cabinet
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-display, "Krona One", sans-serif)',
            fontSize: 'clamp(40px, 9vw, 72px)',
            lineHeight: 0.92,
            letterSpacing: '-0.01em',
            margin: '0 0 16px',
            textTransform: 'uppercase',
          }}
        >
          8-Ball Pool
        </h1>

        <p style={{ fontSize: 16, lineHeight: 1.55, color: 'var(--ink-70)', margin: '0 0 32px' }}>
          Skill-based 1v1 pool with asynchronous 12-hour turns,
          server-authoritative physics, ELO matchmaking, and
          server-decided fouls. <em>Canvas lifting in progress.</em>
        </p>

        <Panel title="Backend · Live">
          <Bullet>ELO matchmaking queue + anti-smurf gates</Bullet>
          <Bullet>Wagered escrow (SOL, 90/7/3 split, v2 program)</Bullet>
          <Bullet>Tournament bracket engine (8 / 16 / 32-player)</Bullet>
          <Bullet>Marathon mode (bot ladder + streak + perfect-tables)</Bullet>
          <Bullet>Dual ledger — Pool Gold (Tier 1) + Tickets (Tier 2)</Bullet>
          <Bullet>5 leaderboards: ELO · Tickets · Marathon × 2 · Tournament podiums</Bullet>
        </Panel>

        <Panel title="Canvas · Pending lift">
          <Bullet>TS remake on arcade/8-ball-pool branch — Webpack 5 + TS 5</Bullet>
          <Bullet>Mobile-responsive canvas + touch input ready</Bullet>
          <Bullet>Spin / English physics + UI widget — next work</Bullet>
          <Bullet>Server-authoritative split — follows spin</Bullet>
        </Panel>

        <Panel title="Designer · Brief delivered">
          <Bullet>POOL_DESIGN_TARGET.md — gameplay + locked decisions</Bullet>
          <Bullet>POOL_DESIGNER_SPEC.md — 38 screens, CTAs, currency widgets</Bullet>
          <Bullet>Phase A (V1): 15 screens · Phase B: 5 · Phase C: 18</Bullet>
        </Panel>

        <button
          onClick={() => navigate('/play')}
          style={{
            marginTop: 16,
            padding: '14px 24px',
            background: 'var(--ink-deep)',
            color: 'var(--paper)',
            border: 'none',
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: 12,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          ← Back to the floor
        </button>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      style={{
        background: 'var(--paper)',
        border: '1px solid var(--hair)',
        padding: '20px 24px',
        marginBottom: 16,
      }}
    >
      <h2
        style={{
          fontFamily: 'var(--font-display, "Krona One", sans-serif)',
          fontSize: 14,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          margin: '0 0 12px',
          color: 'var(--ink)',
        }}
      >
        {title}
      </h2>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>{children}</ul>
    </section>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li
      style={{
        fontFamily: 'var(--font-mono, "IBM Plex Mono", monospace)',
        fontSize: 13,
        lineHeight: 1.7,
        color: 'var(--ink-70)',
        paddingLeft: 16,
        position: 'relative',
      }}
    >
      <span
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          color: 'var(--brass-deep)',
        }}
      >
        ·
      </span>
      {children}
    </li>
  );
}
