// @ts-nocheck — JSX-heavy route, Competitions surface.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/useIsMobile';
import { Section, SolanaPortal } from '@/components/brand';
import { COMPETITIONS, type Competition } from '@/data/competitions-fixtures';
import { PORTAL_GAMES } from '@/data/games-fixtures';

/**
 * Competitions — `/competitions`.
 *
 * Replaces the placeholder Prizes surface as the live SOL-earning page.
 * One card per competition; cards stack on mobile, 2-up on desktop when
 * we add more. For now there's one entry (Free Kicks · 1 SOL · June).
 *
 * Cards are mostly editorial: title + game art + prize + closing
 * countdown + rule + how-to-enter + launch CTA. No live leaderboard
 * embedded — that lives on /leaderboard/<game>; we link to it.
 */
export function Competitions() {
  const isMobile = useIsMobile();

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
      <Section title="Live Competitions" sub={`${COMPETITIONS.filter((c) => c.status === 'live').length} open`}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(420px, 1fr))',
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
   HERO — what is a competition, where does the prize come from
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
        New · The Floor
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
        Competitions run on individual cabinets. Hold the high score at
        close and we pay the prize to the wallet linked to your account.
        Free to enter — every score you submit is automatically an entry.
      </p>
    </header>
  );
}

/* ============================================================
   CARD — the actual unit
   ============================================================ */
function CompetitionCard({ comp, isMobile }: { comp: Competition; isMobile: boolean }) {
  const navigate = useNavigate();
  const game = PORTAL_GAMES.find((g) => g.slug === comp.game);
  const remaining = useCountdown(comp.closes);
  const closed = comp.status === 'ended' || remaining === 'CLOSED';
  const live = comp.status === 'live' && !closed;

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
          paddingTop: '38%',
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
        {/* Status pill */}
        <span
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
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
          {live ? '● Live' : 'Closed'}
        </span>
        {/* Prize chip */}
        <span
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            padding: '4px 10px',
            background: 'var(--brass)',
            color: 'var(--ink-deep)',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.16em',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <SolanaPortal size={11} gradId={`comp-${comp.id}`} />
          {comp.prize}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: isMobile ? '18px 18px 20px' : '20px 22px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <h3
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: 19,
              fontWeight: 400,
              letterSpacing: '0.01em',
              textTransform: 'uppercase',
              color: 'var(--ink)',
              lineHeight: 1.1,
            }}
          >
            {comp.title}
          </h3>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              letterSpacing: '0.18em',
              color: 'var(--ink-70)',
              fontWeight: 700,
              textTransform: 'uppercase',
            }}
          >
            {live ? `Closes in ${remaining}` : 'Closed'}
          </span>
        </header>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: 10,
          }}
        >
          <LabelRow label="Rule"     value={comp.rule} />
          <LabelRow label="How to enter" value={comp.howToEnter} />
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => navigate(comp.launchPath)}
            disabled={!live}
            style={{
              padding: '10px 18px',
              background: live ? 'var(--ink)' : 'var(--ink-45)',
              color: 'var(--paper)',
              border: 'none',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.20em',
              fontWeight: 700,
              textTransform: 'uppercase',
              cursor: live ? 'pointer' : 'not-allowed',
            }}
          >
            Play to enter
          </button>
          <button
            type="button"
            onClick={() => navigate(comp.leaderboardPath)}
            style={{
              padding: '10px 18px',
              background: 'transparent',
              color: 'var(--ink)',
              border: '1.5px solid var(--ink)',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.20em',
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
        lineHeight: 1.55,
      }}
    >
      <strong style={{ color: 'var(--ink)', letterSpacing: '0.16em' }}>Payouts:</strong>{' '}
      prize SOL is paid to the wallet linked to your account within 48
      hours of close. Funded from the SolShot operations vault. One
      winner per competition (the high-score holder at close); ties
      broken by earliest submission timestamp.
    </div>
  );
}

/* ============================================================
   Live countdown — refreshes every second. Returns "2d 4h",
   "13h 22m", "47m", or "CLOSED" when past `closes`.
   ============================================================ */
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
