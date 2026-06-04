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
const LB_API: Record<string, 'basketball' | 'keepieuppies' | 'freekicks' | undefined> = {
  basketball: 'basketball',
  'keepie-uppies': 'keepieuppies',
  'free-kicks': 'freekicks',
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
        V1 · Free Play · Wager V2
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
            value={
              typeof livePlayerCount === 'number'
                ? String(livePlayerCount)
                : apiSlug
                ? '—'
                : 'V2'
            }
            accent="var(--win)"
          />
          <MarqueeStat
            label="Hi Score"
            value={liveTopScore ?? (apiSlug ? '—' : 'V2')}
            accent="var(--paper)"
          />
        </div>
      </div>

      {/* "V2 · Wager Mode Coming" pill top-right — honest about state */}
      <div
        style={{
          position: 'absolute',
          top: 18,
          right: 24,
          padding: '6px 12px',
          border: '1.5px solid var(--brass)',
          color: 'var(--brass)',
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.22em',
        }}
      >
        WAGER · V2
      </div>
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
      <WagerModeStub isMobile={isMobile} />
    </div>
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

function PayoutTable({ isMobile }: { isMobile: boolean }) {
  return (
    <Section
      title="Payout Table"
      sub="House edge 4.2%"
      trailing={
        !isMobile && (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9.5,
              color: 'var(--brass-deep)',
              letterSpacing: '0.16em',
              fontWeight: 700,
              textTransform: 'uppercase',
            }}
          >
            Provably Fair · On-chain RNG
          </span>
        )
      }
    >
      <div
        style={{
          border: '1.5px solid var(--ink)',
          borderTop: '4px solid var(--brass)',
          background: 'var(--paper)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '110px 1fr 70px 60px' : '160px 1fr 100px 90px',
            padding: '10px 16px',
            background: 'var(--ink)',
            color: 'var(--paper)',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            fontWeight: 700,
          }}
        >
          <span>Tier</span>
          <span>Description</span>
          <span style={{ textAlign: 'right' }}>Payout</span>
          <span style={{ textAlign: 'right' }}>Odds</span>
        </div>
        {PAYOUT_TABLE.map((r, i) => (
          <div
            key={r.tier}
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '110px 1fr 70px 60px' : '160px 1fr 100px 90px',
              padding: '12px 16px',
              alignItems: 'baseline',
              borderBottom: i < PAYOUT_TABLE.length - 1 ? '1px dotted var(--hair)' : 'none',
              background: i % 2 === 0 ? 'var(--paper)' : 'rgba(21,32,58,0.025)',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 14,
                color: 'var(--ink)',
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
              }}
            >
              {r.tier}
            </span>
            <span
              style={{
                fontSize: 13,
                color: 'var(--ink-70)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {r.desc}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 16,
                fontWeight: 700,
                color:
                  r.mult === '0.0×'
                    ? 'var(--lose)'
                    : r.mult === '2.4×'
                    ? 'var(--win)'
                    : 'var(--ink)',
                textAlign: 'right',
              }}
            >
              {r.mult}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: 'var(--ink-45)',
                textAlign: 'right',
              }}
            >
              {r.odds}
            </span>
          </div>
        ))}
      </div>
    </Section>
  );
}

function YourHistory({ isMobile }: { isMobile: boolean }) {
  return (
    <Section
      title="Your Recent Plays"
      sub="Last 6 rounds"
      trailing={
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9.5,
            color: 'var(--win)',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          Net {RECENT_PLAYS_NET}
        </span>
      }
    >
      <div>
        {RECENT_PLAYS.map((p, i) => {
          const win = p.payout.startsWith('+');
          return (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile
                  ? '50px 80px 1fr 70px'
                  : '64px 110px 1fr 90px 90px 30px',
                gap: 12,
                alignItems: 'center',
                padding: '10px 0',
                borderBottom: i < RECENT_PLAYS.length - 1 ? '1px dotted var(--hair)' : 'none',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--ink-45)',
                  letterSpacing: '0.06em',
                }}
              >
                {p.ago} ago
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 13,
                  color: win ? 'var(--win)' : 'var(--lose)',
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase',
                }}
              >
                {p.result}
              </span>
              {!isMobile && (
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: 'var(--ink-70)',
                  }}
                >
                  score {p.score}
                </span>
              )}
              {isMobile && (
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: 'var(--ink-70)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {p.score}
                </span>
              )}
              {!isMobile && (
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: 'var(--ink-45)',
                    textAlign: 'right',
                  }}
                >
                  stake {p.stake}
                </span>
              )}
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  fontWeight: 700,
                  color: win ? 'var(--win)' : 'var(--lose)',
                  textAlign: 'right',
                }}
              >
                {p.payout}
              </span>
              {!isMobile && (
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 14,
                    color: 'var(--ink-45)',
                    textAlign: 'right',
                  }}
                >
                  →
                </span>
              )}
            </div>
          );
        })}
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

function WagerSlip({ game }: { game: ArcadeGame }) {
  const [stake, setStake] = useState(0.05);
  const multiplier = 2.4;
  const maxPayout = (stake * multiplier).toFixed(3);

  return (
    <div
      style={{
        position: 'relative',
        background: 'var(--paper)',
        border: '1.5px solid var(--ink)',
        borderTop: '5px solid var(--brass)',
        padding: '14px 16px 16px',
      }}
    >
      {/* corner stamp */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          padding: '3px 7px',
          border: '1.5px solid var(--brass)',
          color: 'var(--brass-deep)',
          fontFamily: 'var(--font-mono)',
          fontSize: 8,
          fontWeight: 700,
          letterSpacing: '0.16em',
          transform: 'rotate(2deg)',
        }}
      >
        SOL · MAINNET
      </div>

      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          letterSpacing: '0.22em',
          color: 'var(--ink-45)',
          textTransform: 'uppercase',
          fontWeight: 700,
          marginBottom: 2,
        }}
      >
        The Arcade · Wager Slip
      </div>
      <h2
        style={{
          margin: 0,
          fontFamily: 'var(--font-display)',
          fontSize: 22,
          color: 'var(--ink)',
          letterSpacing: '0.02em',
          textTransform: 'uppercase',
          marginBottom: 14,
          lineHeight: 1,
        }}
      >
        Place Wager
      </h2>

      <label
        style={{
          display: 'block',
          fontFamily: 'var(--font-mono)',
          fontSize: 9.5,
          letterSpacing: '0.18em',
          color: 'var(--ink-70)',
          textTransform: 'uppercase',
          fontWeight: 700,
          marginBottom: 6,
        }}
      >
        Stake · SOL
      </label>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          borderBottom: '2px solid var(--ink)',
          paddingBottom: 6,
          marginBottom: 12,
        }}
      >
        <button onClick={() => setStake((s) => Math.max(0.01, +(s - 0.01).toFixed(2)))} style={btnTiny()}>
          −
        </button>
        <SolanaPortal size={16} gradId="wager" />
        <input
          value={stake.toFixed(2)}
          onChange={(e) => setStake(parseFloat(e.target.value) || 0)}
          style={{
            flex: 1,
            minWidth: 0,
            padding: '4px 8px',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontFamily: 'var(--font-mono)',
            fontSize: 28,
            fontWeight: 700,
            color: 'var(--ink)',
            letterSpacing: '0.01em',
          }}
        />
        <button onClick={() => setStake((s) => +(s + 0.01).toFixed(2))} style={btnTiny()}>
          +
        </button>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {WAGER_CHIPS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setStake(c)}
            style={{
              flex: 1,
              padding: '6px 0',
              background: stake === c ? 'var(--ink)' : 'transparent',
              color: stake === c ? 'var(--paper)' : 'var(--ink)',
              border: '1px solid var(--ink)',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.06em',
              cursor: 'pointer',
            }}
          >
            {c.toFixed(2)}
          </button>
        ))}
      </div>

      <div
        style={{
          padding: '10px 0',
          borderTop: '1px dashed var(--hair)',
          borderBottom: '1px dashed var(--hair)',
          marginBottom: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <SlipLine label="At Bullseye 2.4×" value={`+${maxPayout} SOL`} color="var(--win)" />
        <SlipLine
          label="At Splash 1.2×"
          value={`+${(stake * 1.2).toFixed(3)} SOL`}
          color="var(--ink-70)"
        />
        <SlipLine
          label="At Miss 0.0×"
          value={`-${stake.toFixed(3)} SOL`}
          color="var(--lose)"
          dim
        />
      </div>

      <button
        type="button"
        onClick={() => alert('Wager Mode — Coming Soon. UI only for v1.')}
        style={{
          width: '100%',
          padding: '14px 12px',
          background: 'var(--brass)',
          color: 'var(--ink)',
          border: '1.5px solid var(--ink)',
          fontFamily: 'var(--font-display)',
          fontSize: 16,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          lineHeight: 1,
        }}
      >
        ▸ Place Wager · {stake.toFixed(2)} SOL
      </button>

      <div
        style={{
          marginTop: 8,
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: 'var(--ink-45)',
          letterSpacing: '0.06em',
          textAlign: 'center',
        }}
      >
        Coming Soon · UI Only · v2 ships on-chain
      </div>
    </div>
  );
}

function SlipLine({ label, value, color, dim }: any) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        opacity: dim ? 0.7 : 1,
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--ink-70)',
          letterSpacing: '0.06em',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          fontWeight: 700,
          color,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function btnTiny(): React.CSSProperties {
  return {
    width: 28,
    height: 28,
    background: 'transparent',
    color: 'var(--ink)',
    border: '1.5px solid var(--ink)',
    fontFamily: 'var(--font-display)',
    fontSize: 14,
    cursor: 'pointer',
    lineHeight: 1,
    marginRight: 8,
    flexShrink: 0,
  };
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
