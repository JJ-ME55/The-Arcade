// @ts-nocheck — JSX-heavy. Phase 4 editorial game detail per ed-game.jsx.
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useIsMobile } from '@/hooks/useIsMobile';
import { Section } from '@/components/brand';
import { PORTAL_GAMES, type ArcadeGame } from '@/data/games-fixtures';
import { HOW_TO_PLAY } from '@/data/game-detail-fixtures';
import { useLeaderboardData } from '@/hooks/useLeaderboardData';

/**
 * Map PORTAL_GAMES slug to the LB API slug for `useLeaderboardData`.
 * Pool isn't wired to a LB endpoint yet (V2 work — backend exists but
 * Arcade-side wrapper pending). SolShot has its own detail page so
 * skipped here.
 */
// NB: critter-kart's endpoint keeps the hyphen (/api/games/critter-kart/)
// unlike the others, so its api value is hyphenated too.
const LB_API: Record<string, 'basketball' | 'keepieuppies' | 'freekicks' | 'critter-kart' | undefined> = {
  basketball: 'basketball',
  'keepie-uppies': 'keepieuppies',
  'free-kicks': 'freekicks',
  'critter-kart': 'critter-kart',
};

/**
 * GameDetail — `/play/:slug`. Editorial game-detail page per ed-game.jsx.
 *
 *   Breadcrumb · Marquee (340px ink-bg hero with game name)
 *   Two-col main + rail:
 *     Main: How To Play (3-step grid) · Payout Table · Your Recent Plays
 *     Rail: Wager Slip (UI only) · Free Play · Live Activity
 *
 * Wager slip is UI-only per JJ — Place Wager button shows "Coming
 * Soon" alert. Real escrow wiring is v2 work.
 */
export function GameDetail() {
  const { slug = '' } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const game = PORTAL_GAMES.find((g) => g.slug === slug);

  if (!game) {
    navigate('/play', { replace: true });
    return null;
  }

  return (
    <main
      style={{
        padding: isMobile ? '0 14px 32px' : '0 32px 32px',
        maxWidth: 1440,
        margin: '0 auto',
        width: '100%',
      }}
    >
      <Breadcrumb game={game} />
      <Marquee game={game} isMobile={isMobile} />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 320px',
          columnGap: 32,
          rowGap: 32,
          marginTop: 32,
        }}
      >
        <Main game={game} isMobile={isMobile} />
        <Rail game={game} />
      </div>
    </main>
  );
}

/* ============================================================
   BREADCRUMB
   ============================================================ */
function Breadcrumb({ game }: { game: ArcadeGame }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '14px 0 18px',
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        letterSpacing: '0.18em',
        color: 'var(--ink-45)',
        textTransform: 'uppercase',
        fontWeight: 700,
      }}
    >
      <Link to="/play" style={{ color: 'var(--ink-70)', cursor: 'pointer' }}>
        Home
      </Link>
      <span>›</span>
      <span style={{ color: 'var(--ink-70)' }}>{game.genre}</span>
      <span>›</span>
      <span style={{ color: 'var(--ink)' }}>{game.name}</span>
      <span style={{ flex: 1 }} />
      <span style={{ color: 'var(--brass-deep)' }}>
        {game.slug === 'free-kicks'
          ? 'Free Play · 1 SOL Comp'
          : game.slug === 'solshot'
          ? 'Free Play · Wager 1v1'
          : 'Free to Play'}
      </span>
    </div>
  );
}

/* ============================================================
   MARQUEE
   ============================================================ */
function Marquee({ game, isMobile }: { game: ArcadeGame; isMobile: boolean }) {
  // Real LB data — Hi Score + Players Now pulled from the live count,
  // not from PORTAL_GAMES fixtures (which were v1 placeholder numbers).
  const apiSlug = LB_API[game.slug];
  const live = useLeaderboardData({
    api: apiSlug,
    window: 'all',
    limit: 1,
  });
  const liveTopScore =
    live.rows && live.rows.length > 0 ? live.rows[0].score : null;
  const livePlayerCount = live.totalPlayers;

  return (
    <section
      style={{
        position: 'relative',
        height: isMobile ? 260 : 340,
        background: 'var(--ink)',
        overflow: 'hidden',
        borderTop: '1.5px solid var(--ink)',
        borderBottom: '4px solid var(--brass)',
      }}
    >
      {/* studio hero art fills the marquee */}
      <img
        src={game.heroSrc}
        alt={`${game.name} marquee`}
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
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(90deg, var(--ink) 0%, rgba(21,32,58,0.85) 35%, rgba(21,32,58,0.35) 70%, transparent 100%)',
          pointerEvents: 'none',
        }}
        aria-hidden
      />

      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          padding: isMobile ? '20px 22px' : '28px 36px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          color: 'var(--paper)',
          maxWidth: 620,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.22em',
              fontWeight: 700,
              color: 'var(--brass)',
              textTransform: 'uppercase',
              marginBottom: 10,
            }}
          >
            {game.genre} · {apiSlug ? 'Free Play · V1' : 'Coming Soon'}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: isMobile ? 'clamp(2.5rem, 11vw, 4rem)' : 84,
              lineHeight: 0.86,
              textTransform: 'uppercase',
              color: 'var(--paper)',
              letterSpacing: '0.005em',
              marginBottom: 14,
            }}
          >
            {game.name}
          </div>
          {!isMobile && (
            <div
              style={{
                fontSize: 15,
                color: 'rgba(251,252,254,0.82)',
                lineHeight: 1.4,
                maxWidth: 460,
              }}
            >
              {game.tagline} Free play to climb the leaderboard. Wager mode ships in V2.
            </div>
          )}
        </div>

        {/* Honest stats only — `Hi Score` from real LB (or `—` while
            loading / when game has no wired LB). Players count likewise.
            Removed: fake `Best Payout`, fake `Your Best`. */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: isMobile ? 16 : 28,
            flexWrap: 'wrap',
          }}
        >
          <MarqueeStat
            label="Players"
            value={typeof livePlayerCount === 'number' ? String(livePlayerCount) : '—'}
            accent="var(--win)"
          />
          <MarqueeStat
            label="Hi Score"
            value={liveTopScore ?? '—'}
            accent="var(--paper)"
          />
        </div>
      </div>

      {/* Top-right flag — only on the cabinet with a live prize. Brass =
          money. Other games get no pill (was a generic "WAGER · V2" on
          every page, which is jargon for a feature that isn't live). */}
      {game.slug === 'free-kicks' && (
        <div
          style={{
            position: 'absolute',
            top: 18,
            right: 24,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            padding: '6px 12px',
            background: 'var(--brass)',
            color: 'var(--ink-deep)',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.18em',
          }}
        >
          <span className="blink" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ink-deep)' }} />
          1 SOL COMP
        </div>
      )}
    </section>
  );
}

function MarqueeStat({ label, value, accent }: any) {
  return (
    <div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 8.5,
          letterSpacing: '0.2em',
          color: 'rgba(251,252,254,0.55)',
          textTransform: 'uppercase',
          fontWeight: 700,
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 22,
          color: accent,
          lineHeight: 1,
          letterSpacing: '0.02em',
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* ============================================================
   MAIN — How To Play · Payout Table · Recent Plays
   ============================================================ */
function Main({ game, isMobile }: { game: ArcadeGame; isMobile: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, minWidth: 0 }}>
      <HowToPlay game={game} isMobile={isMobile} />
      {/* Free Kicks has a live 1 SOL prize — sell that instead of the
          generic "wager mode coming" roadmap stub. */}
      {game.slug === 'free-kicks' ? (
        <CompCrossSell isMobile={isMobile} />
      ) : (
        <WagerModeStub isMobile={isMobile} />
      )}
    </div>
  );
}

/**
 * CompCrossSell — on the Free Kicks detail page, point at the live 1 SOL
 * competition. This board IS the entry, so close the loop here.
 */
function CompCrossSell({ isMobile }: { isMobile: boolean }) {
  const navigate = useNavigate();
  return (
    <Section title="Live Competition" sub="1 SOL · Free Kicks">
      <button
        type="button"
        onClick={() => navigate('/competitions')}
        style={{
          appearance: 'none',
          textAlign: 'left',
          cursor: 'pointer',
          width: '100%',
          border: '1.5px solid var(--ink)',
          borderTop: '4px solid var(--brass)',
          background: 'var(--ink-deep)',
          color: 'var(--paper)',
          padding: isMobile ? '20px 18px' : '24px 26px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 9,
            fontFamily: 'var(--font-display)',
            fontSize: isMobile ? 22 : 28,
            textTransform: 'uppercase',
            letterSpacing: '0.01em',
            color: 'var(--brass-glint)',
            lineHeight: 1,
          }}
        >
          Win 1 SOL
        </span>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: isMobile ? 14 : 15, lineHeight: 1.5, color: 'rgba(251,252,254,0.8)', maxWidth: 520 }}>
          Top the Free Kicks leaderboard when the competition closes and we
          pay 1 SOL straight to your wallet. Every score you submit is an
          entry — free to play.
        </span>
        <span
          style={{
            marginTop: 4,
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--brass)',
          }}
        >
          See the competition →
        </span>
      </button>
    </Section>
  );
}

/**
 * WagerModeStub — replaces the fictional Payout Table + Recent Plays
 * sections from v1. Honest about what V1 ships (free-play leaderboards)
 * and what comes in V2 (SOL wagering with on-chain settlement).
 */
function WagerModeStub({ isMobile }: { isMobile: boolean }) {
  return (
    <Section title="Wager Mode" sub="V2 · Coming Q3">
      <div
        style={{
          border: '1.5px solid var(--ink)',
          borderTop: '4px solid var(--brass)',
          background: 'var(--paper)',
          padding: isMobile ? '20px 16px' : '28px 24px',
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: isMobile ? 18 : 28,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9.5,
              letterSpacing: '0.22em',
              color: 'var(--brass-deep)',
              textTransform: 'uppercase',
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            · V1 · Now ·
          </div>
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 18,
              margin: '0 0 10px',
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
            }}
          >
            Free Play
          </h3>
          <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink-70)', lineHeight: 1.5 }}>
            Tap Free Play. Climb the leaderboard. Scores save when you
            sign in. No SOL at risk yet — wagering ships in V2.
          </p>
        </div>
        <div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9.5,
              letterSpacing: '0.22em',
              color: 'var(--brass-deep)',
              textTransform: 'uppercase',
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            · V2 · Coming Q3 ·
          </div>
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 18,
              margin: '0 0 10px',
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
            }}
          >
            Wager Slip
          </h3>
          <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink-70)', lineHeight: 1.5 }}>
            Stake SOL on each round. On-chain escrow settles in seconds.
            90% to winner, 7% to treasury, 3% to ops. Same skill bar as
            free play — no pay-to-win.
          </p>
        </div>
      </div>
    </Section>
  );
}

function HowToPlay({ game, isMobile }: any) {
  const rules = HOW_TO_PLAY[game.slug] || [];
  return (
    <Section title="How To Play" sub="3 steps">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: 0,
          rowGap: isMobile ? 20 : 0,
        }}
      >
        {rules.map((r, i) => (
          <div
            key={r.n}
            style={{
              padding: '6px 18px 6px 0',
              borderLeft: !isMobile && i > 0 ? '1px solid var(--hair)' : 'none',
              paddingLeft: !isMobile && i > 0 ? 18 : 0,
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 36,
                color: 'var(--brass)',
                lineHeight: 1,
                marginBottom: 8,
                letterSpacing: '0.02em',
              }}
            >
              {r.n}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 14,
                color: 'var(--ink)',
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
                marginBottom: 6,
                lineHeight: 1,
              }}
            >
              {r.title}
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-70)', lineHeight: 1.45 }}>
              {r.desc}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ============================================================
   RAIL — Free Play (primary) · V2 Wager Slip preview (deferred)
   ============================================================ */
function Rail({ game }: { game: ArcadeGame }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* V1: Free Play is the primary CTA. Wager Slip moved to V2 stub
          in the main column — the rail used to hold a fictional Place
          Wager slip with calculated payouts, which made V2 features
          look live. Cleaned up to surface only what works today. */}
      <FreePlayCard game={game} />
    </div>
  );
}

function FreePlayCard({ game }: { game: ArcadeGame }) {
  const navigate = useNavigate();
  return (
    <div
      style={{
        padding: '14px 16px',
        background: 'transparent',
        border: '1.5px dashed var(--ink)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          letterSpacing: '0.22em',
          color: 'var(--brass-deep)',
          textTransform: 'uppercase',
          fontWeight: 700,
          marginBottom: 4,
        }}
      >
        Or · No Wager
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 16,
          color: 'var(--ink)',
          textTransform: 'uppercase',
          letterSpacing: '0.02em',
          marginBottom: 6,
          lineHeight: 1,
        }}
      >
        Free Play
      </div>
      <div
        style={{
          fontSize: 12,
          color: 'var(--ink-70)',
          marginBottom: 12,
          lineHeight: 1.4,
        }}
      >
        Play to earn Tickets toward the prize counter. No SOL at risk.
      </div>
      <button
        type="button"
        onClick={() =>
          navigate(game.slug === 'solshot' ? '/play/solshot' : `/play/${game.slug}/launch`)
        }
        style={{
          width: '100%',
          padding: '10px 12px',
          background: 'var(--ink)',
          color: 'var(--paper)',
          border: '1.5px solid var(--ink)',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          cursor: 'pointer',
        }}
      >
        ▸ Free Play
      </button>
    </div>
  );
}

export default GameDetail;
