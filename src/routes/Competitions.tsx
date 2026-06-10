// @ts-nocheck — JSX-heavy route, Competitions surface.
import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useIsMobile } from '@/hooks/useIsMobile';
import { Section, SolanaPortal } from '@/components/brand';
import { useLeaderboardData } from '@/hooks/useLeaderboardData';
import { COMPETITIONS, type Competition } from '@/data/competitions-fixtures';
import { PORTAL_GAMES } from '@/data/games-fixtures';

/**
 * Competitions — `/competitions`. The money page; the whole funnel
 * points here. Each card leads with the two things that drive entries:
 * the PRIZE (big, brass) and the CLOSING COUNTDOWN (big, ticking), then
 * the live "score to beat" + entrant count pulled from the real
 * leaderboard so a visitor knows exactly what they're up against.
 */

// Comp game slug (hyphenated) → leaderboard API slug (no hyphen).
const GAME_TO_API: Record<string, 'basketball' | 'keepieuppies' | 'freekicks'> = {
  'free-kicks': 'freekicks',
  basketball: 'basketball',
  'keepie-uppies': 'keepieuppies',
};

export function Competitions() {
  const isMobile = useIsMobile();
  const liveCount = COMPETITIONS.filter((c) => c.status === 'live').length;

  return (
    <main
      style={{
        padding: isMobile ? '20px 14px 60px' : '28px 36px 60px',
        maxWidth: 1100,
        margin: '0 auto',
        width: '100%',
      }}
    >
      <CompetitionsHero isMobile={isMobile} />
      <Section title="Live Competitions" sub={`${liveCount} open`}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(460px, 1fr))',
            gap: 20,
          }}
        >
          {COMPETITIONS.map((c) => (
            <CompetitionCard key={c.id} comp={c} isMobile={isMobile} />
          ))}
        </div>
      </Section>
      <PayoutNote isMobile={isMobile} />
    </main>
  );
}

/* ============================================================
   HERO
   ============================================================ */
function CompetitionsHero({ isMobile }: { isMobile: boolean }) {
  return (
    <header
      style={{
        marginBottom: 28,
        padding: isMobile ? '20px 18px' : '24px 28px',
        background: 'var(--paper)',
        border: '1.5px solid var(--ink)',
        borderTop: '4px solid var(--brass)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9.5,
          letterSpacing: '0.22em',
          color: 'var(--brass-deep)',
          textTransform: 'uppercase',
          fontWeight: 700,
          marginBottom: 6,
        }}
      >
        Real prizes · The Floor
      </div>
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: isMobile ? 26 : 34,
          fontWeight: 400,
          letterSpacing: '0.015em',
          textTransform: 'uppercase',
          color: 'var(--ink)',
          margin: 0,
          lineHeight: 1.05,
        }}
      >
        Top a leaderboard. Win SOL.
      </h1>
      <p
        style={{
          margin: '12px 0 0',
          fontFamily: 'var(--font-body)',
          fontSize: isMobile ? 14 : 15,
          lineHeight: 1.55,
          color: 'var(--ink-70)',
          maxWidth: 620,
        }}
      >
        Competitions run on individual cabinets. Hold the high score when
        the clock hits zero and we pay the prize straight to your wallet.
        Free to enter — every score you submit is automatically an entry.
      </p>
    </header>
  );
}

/* ============================================================
   CARD
   ============================================================ */
function CompetitionCard({ comp, isMobile }: { comp: Competition; isMobile: boolean }) {
  const navigate = useNavigate();
  const game = PORTAL_GAMES.find((g) => g.slug === comp.game);
  const remaining = useCountdown(comp.closes);
  const closed = comp.status === 'ended' || remaining === 'CLOSED';
  const live = comp.status === 'live' && !closed;

  // Live "score to beat" + entrant count from the real leaderboard.
  const api = GAME_TO_API[comp.game];
  const { rows, totalPlayers } = useLeaderboardData({ api, limit: 1 });
  const leader = rows && rows[0];

  return (
    <article
      style={{
        position: 'relative',
        background: 'var(--paper)',
        border: '1.5px solid var(--ink)',
        borderBottom: '3px solid var(--ink)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Art header */}
      <div
        style={{
          position: 'relative',
          paddingTop: '34%',
          background: 'var(--ink-deep)',
          borderBottom: '2px solid var(--ink)',
        }}
      >
        {game && (
          <img
            src={game.heroSrc}
            alt={`${game.name} art`}
            loading="lazy"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: game.heroFocus || 'center',
              display: 'block',
            }}
          />
        )}
        <span
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 9px',
            background: live ? 'var(--win)' : 'var(--ink)',
            color: 'var(--paper)',
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            letterSpacing: '0.20em',
            fontWeight: 700,
            textTransform: 'uppercase',
          }}
        >
          {live && (
            <span className="blink" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--paper)' }} />
          )}
          {live ? 'Live' : 'Closed'}
        </span>
      </div>

      {/* PRIZE + COUNTDOWN — the two heroes, side by side on an ink band */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          background: 'var(--ink-deep)',
          color: 'var(--paper)',
          borderBottom: '2px solid var(--ink)',
        }}
      >
        <div style={{ padding: isMobile ? '14px 16px' : '16px 20px', borderRight: '1px solid rgba(251,252,254,0.12)' }}>
          <div style={heroLabel}>Prize</div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: 'var(--font-display)',
              fontSize: isMobile ? 26 : 32,
              lineHeight: 1,
              color: 'var(--brass-glint)',
              marginTop: 6,
            }}
          >
            <SolanaPortal size={isMobile ? 20 : 24} gradId={`comp-${comp.id}`} />
            {comp.prize}
          </div>
        </div>
        <div style={{ padding: isMobile ? '14px 16px' : '16px 20px' }}>
          <div style={heroLabel}>{live ? 'Closes in' : 'Status'}</div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: isMobile ? 26 : 32,
              lineHeight: 1,
              color: 'var(--paper)',
              marginTop: 6,
            }}
          >
            {live ? remaining : 'Closed'}
          </div>
        </div>
      </div>

      {/* Score to beat + entrants — real leaderboard data */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: isMobile ? '12px 16px' : '12px 20px',
          background: 'var(--cream)',
          borderBottom: '1.5px solid var(--ink)',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={statLabel}>Score to beat</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginTop: 3 }}>
            {leader ? (
              <>
                {leader.score}{' '}
                <span style={{ color: 'var(--ink-45)', fontWeight: 700 }}>· {leader.name}</span>
              </>
            ) : (
              <span style={{ color: 'var(--ink-45)' }}>Be the first →</span>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={statLabel}>Entrants</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginTop: 3 }}>
            {typeof totalPlayers === 'number' ? totalPlayers : '—'}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: isMobile ? '16px 16px 18px' : '18px 20px 20px', display: 'flex', flexDirection: 'column', gap: 13 }}>
        <h3
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: 17,
            fontWeight: 400,
            letterSpacing: '0.01em',
            textTransform: 'uppercase',
            color: 'var(--ink)',
            lineHeight: 1.1,
          }}
        >
          {comp.title}
        </h3>

        <LabelRow label="Rule" value={comp.rule} />
        <LabelRow label="How to enter" value={comp.howToEnter} />

        <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => navigate(comp.launchPath)}
            disabled={!live}
            style={{
              flex: 1,
              minWidth: 150,
              padding: '12px 18px',
              background: live ? 'var(--brass)' : 'var(--ink-45)',
              color: 'var(--ink-deep)',
              border: 'none',
              fontFamily: 'var(--font-mono)',
              fontSize: 10.5,
              letterSpacing: '0.18em',
              fontWeight: 700,
              textTransform: 'uppercase',
              cursor: live ? 'pointer' : 'not-allowed',
            }}
          >
            ▸ Play to enter
          </button>
          <button
            type="button"
            onClick={() => navigate(comp.leaderboardPath)}
            style={{
              padding: '12px 18px',
              background: 'transparent',
              color: 'var(--ink)',
              border: '1.5px solid var(--ink)',
              fontFamily: 'var(--font-mono)',
              fontSize: 10.5,
              letterSpacing: '0.18em',
              fontWeight: 700,
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Leaderboard
          </button>
        </div>
      </div>
    </article>
  );
}

const heroLabel = {
  fontFamily: 'var(--font-mono)',
  fontSize: 8.5,
  letterSpacing: '0.22em',
  fontWeight: 700,
  textTransform: 'uppercase',
  color: 'rgba(251,252,254,0.5)',
};

const statLabel = {
  fontFamily: 'var(--font-mono)',
  fontSize: 8,
  letterSpacing: '0.20em',
  fontWeight: 700,
  textTransform: 'uppercase',
  color: 'var(--ink-45)',
};

function LabelRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 8.5,
          letterSpacing: '0.20em',
          fontWeight: 700,
          textTransform: 'uppercase',
          color: 'var(--ink-45)',
          display: 'block',
          marginBottom: 3,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 13.5,
          lineHeight: 1.45,
          color: 'var(--ink)',
        }}
      >
        {value}
      </span>
    </div>
  );
}

function PayoutNote({ isMobile }: { isMobile: boolean }) {
  return (
    <div
      style={{
        marginTop: 28,
        padding: isMobile ? '14px 16px' : '14px 20px',
        background: 'transparent',
        border: '1.5px dashed var(--ink-45)',
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        letterSpacing: '0.06em',
        color: 'var(--ink-70)',
        lineHeight: 1.6,
      }}
    >
      <strong style={{ color: 'var(--ink)', letterSpacing: '0.16em' }}>Payouts:</strong>{' '}
      the prize is paid to the wallet linked to your account within 48
      hours of close. One winner per competition — the top-score holder
      when the clock hits zero; ties broken by earliest submission.{' '}
      <Link to="/terms" style={{ color: 'var(--blue)', textDecoration: 'none', fontWeight: 700 }}>
        Full terms ↗
      </Link>
    </div>
  );
}

/* Live countdown — "2d 4h" / "13h 22m" / "47m" / "CLOSED". */
function useCountdown(iso: string): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const targetMs = Date.parse(iso);
  if (Number.isNaN(targetMs)) return '—';
  const delta = targetMs - now;
  if (delta <= 0) return 'CLOSED';
  const s = Math.floor(delta / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default Competitions;
