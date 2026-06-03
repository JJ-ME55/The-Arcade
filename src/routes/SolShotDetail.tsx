// @ts-nocheck — JSX-heavy editorial detail page for SolShot.
import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useIsMobile } from '@/hooks/useIsMobile';
import { Section } from '@/components/brand';
import { PORTAL_GAMES } from '@/data/games-fixtures';
import { HOW_TO_PLAY } from '@/data/game-detail-fixtures';

const SOLSHOT_URL = import.meta.env.VITE_SOLSHOT_WEB_URL ?? 'https://solshot.gg';
const API_BASE = import.meta.env.VITE_SOLSHOT_API_BASE;

interface SolShotRow {
  rank: number;
  displayName: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  kills: number;
  deaths: number;
  kdRatio: number;
  totalDamage: number;
}

/**
 * SolShotDetail — `/play/solshot`. Editorial detail page for SolShot
 * inside the Arcade brand chrome.
 *
 * Replaces the previous SolShotRedirect which dumped users on
 * solshot.gg with no editorial moment. SolShot is the flagship cabinet
 * and the only one whose canvas lives off-site — the detail page is
 * how we hold the brand before handing off.
 *
 * Differs from the generic GameDetail (basketball / free-kicks / keepie)
 * in two structural ways:
 *
 *   1. The stats strip + leaderboard preview render the K/D + Win%
 *      scorecard model. SolShot has no single "best score" — match
 *      record is the ranking surface (see Q12.2.2 in the canonical doc
 *      + careerCardProps.js on the server).
 *
 *   2. The Wager / Free Play CTAs both deep-link out to solshot.gg
 *      (where the actual artillery canvas lives). When the
 *      `/api/arcade/session-handoff` JWT flow lands, the redirect URL
 *      carries a `?arcade_token=...` so the SolShot client provisions
 *      Privy without re-auth.
 */
export function SolShotDetail() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const game = PORTAL_GAMES.find((g) => g.slug === 'solshot');

  const [top, setTop] = useState<SolShotRow[]>([]);
  const [loadingTop, setLoadingTop] = useState(false);

  useEffect(() => {
    if (!API_BASE) return;
    let cancelled = false;
    setLoadingTop(true);
    fetch(`${API_BASE}/api/games/solshot/leaderboard?limit=5`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data?.ok) return;
        setTop(Array.isArray(data.leaderboard) ? data.leaderboard : []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingTop(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!game) {
    navigate('/play', { replace: true });
    return null;
  }

  const openSolShot = () => {
    window.location.href = SOLSHOT_URL;
  };

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
        <Main game={game} isMobile={isMobile} top={top} loadingTop={loadingTop} />
        <Rail openSolShot={openSolShot} isMobile={isMobile} />
      </div>
    </main>
  );
}

/* ============================================================
   BREADCRUMB
   ============================================================ */
function Breadcrumb({ game }: any) {
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
      <span style={{ color: 'var(--brass-deep)' }}>Flagship Cabinet</span>
    </div>
  );
}

/* ============================================================
   MARQUEE — wide hero with K/D scorecard stats strip
   ============================================================ */
function Marquee({ game, isMobile }: any) {
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
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(90deg, var(--ink) 0%, rgba(21,32,58,0.85) 35%, rgba(21,32,58,0.35) 70%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
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
            Artillery · Flagship · PvP
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
              On-chain artillery duels. Wager SOL, take aim, win the
              pot. The flagship cabinet — lives on its own site, your
              callsign carries with you.
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: isMobile ? 16 : 28,
            flexWrap: 'wrap',
          }}
        >
          <MarqueeStat label="Players Now" value={String(game.players)} accent="var(--win)" />
          <MarqueeStat label="Top K/D" value="—" accent="var(--brass)" />
          <MarqueeStat label="Match Rake" value="3%" accent="var(--paper)" />
          {!isMobile && (
            <MarqueeStat label="Your K/D" value="—" accent="var(--paper)" />
          )}
        </div>
      </div>

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
        ◉ ON-CHAIN
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
   MAIN — How To Play · Top Operatives (K/D LB)
   ============================================================ */
function Main({ game, isMobile, top, loadingTop }: any) {
  const rules = HOW_TO_PLAY[game.slug] || [];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, minWidth: 0 }}>
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
                  fontSize: 42,
                  color: 'var(--brass)',
                  lineHeight: 0.92,
                  letterSpacing: '0.01em',
                  marginBottom: 6,
                }}
              >
                {r.n}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 18,
                  color: 'var(--ink)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.02em',
                  marginBottom: 6,
                }}
              >
                {r.title}
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-70)', lineHeight: 1.5 }}>
                {r.desc}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <TopOperatives top={top} loading={loadingTop} isMobile={isMobile} />
    </div>
  );
}

/* ============================================================
   TOP OPERATIVES — K/D + W% scorecard preview
   ============================================================ */
function TopOperatives({ top, loading, isMobile }: any) {
  const sub = loading
    ? 'Loading'
    : top.length > 0
    ? `Top ${top.length} · K/D ranked · min 10 matches`
    : 'No qualified operatives yet';
  return (
    <Section title="Top Operatives" sub={sub}>
      <div
        style={{
          background: 'var(--paper)',
          border: '1.5px solid var(--ink)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '36px 1fr 64px 50px' : '48px 1fr 90px 90px 100px',
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
          <span>#</span>
          <span>Callsign</span>
          <span style={{ textAlign: 'right' }}>K/D</span>
          {!isMobile && <span style={{ textAlign: 'right' }}>W %</span>}
          <span style={{ textAlign: 'right' }}>W-L</span>
        </div>
        {top.length === 0 && !loading && (
          <div style={{ padding: 18, color: 'var(--ink-45)', fontSize: 13 }}>
            No operatives have hit the 10-match threshold yet. Be the first.
          </div>
        )}
        {top.map((r, i) => (
          <div
            key={r.rank}
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '36px 1fr 64px 50px' : '48px 1fr 90px 90px 100px',
              padding: '11px 16px',
              alignItems: 'center',
              borderBottom: i === top.length - 1 ? 'none' : '1px dotted var(--hair)',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 16,
                color: r.rank <= 3 ? 'var(--brass-deep)' : 'var(--ink)',
                letterSpacing: '0.02em',
                lineHeight: 1,
              }}
            >
              {String(r.rank).padStart(2, '0')}
            </span>
            <span
              style={{
                fontSize: 13,
                color: 'var(--ink)',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {r.displayName}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--ink)',
                textAlign: 'right',
              }}
            >
              {r.kdRatio.toFixed(2)}
            </span>
            {!isMobile && (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  fontWeight: 700,
                  color: r.winRate >= 50 ? 'var(--win)' : 'var(--brass-deep)',
                  textAlign: 'right',
                }}
              >
                {r.winRate}%
              </span>
            )}
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--ink-45)',
                textAlign: 'right',
                letterSpacing: '0.04em',
              }}
            >
              {r.wins}-{r.losses}
            </span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, textAlign: 'right' }}>
        <Link
          to="/leaderboard/solshot"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--blue)',
            textDecoration: 'none',
          }}
        >
          View full leaderboard →
        </Link>
      </div>
    </Section>
  );
}

/* ============================================================
   RAIL — Open SolShot CTA + secondary actions
   ============================================================ */
function Rail({ openSolShot, isMobile }: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div
        style={{
          background: 'var(--paper)',
          border: '1.5px solid var(--ink)',
          borderTop: '5px solid var(--brass)',
          padding: '20px 22px',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            letterSpacing: '0.22em',
            color: 'var(--ink-45)',
            textTransform: 'uppercase',
            fontWeight: 700,
            marginBottom: 8,
          }}
        >
          Flagship cabinet · External
        </div>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 32,
            color: 'var(--ink)',
            margin: '0 0 10px 0',
            letterSpacing: '0.01em',
            textTransform: 'uppercase',
            lineHeight: 0.92,
          }}
        >
          Open SolShot
        </h2>
        <p
          style={{
            fontSize: 13,
            color: 'var(--ink-70)',
            lineHeight: 1.5,
            margin: '0 0 16px 0',
          }}
        >
          SolShot lives on its own site for now — your callsign + wallet
          carry over via session handoff. No re-auth.
        </p>
        <button
          type="button"
          onClick={openSolShot}
          style={{
            width: '100%',
            padding: '13px 14px',
            background: 'var(--blue)',
            color: 'var(--paper)',
            border: 'none',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            marginBottom: 10,
          }}
        >
          ▸ Open SolShot ↗
        </button>
        <button
          type="button"
          onClick={openSolShot}
          style={{
            width: '100%',
            padding: '11px 12px',
            background: 'transparent',
            color: 'var(--ink)',
            border: '1.5px solid var(--ink)',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          Free Play ↗
        </button>
      </div>

      {!isMobile && (
        <div
          style={{
            border: '1.5px solid var(--ink)',
            padding: '14px 16px',
            background: 'var(--paper)',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              letterSpacing: '0.22em',
              color: 'var(--ink-45)',
              textTransform: 'uppercase',
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            Settlement
          </div>
          <ul
            style={{
              margin: 0,
              padding: 0,
              listStyle: 'none',
              fontSize: 12.5,
              color: 'var(--ink-70)',
              lineHeight: 1.6,
            }}
          >
            <li>· 90% to winner</li>
            <li>· 7% to treasury</li>
            <li>· 3% to ops</li>
            <li
              style={{
                marginTop: 10,
                fontFamily: 'var(--font-mono)',
                fontSize: 9.5,
                letterSpacing: '0.2em',
                color: 'var(--brass-deep)',
                textTransform: 'uppercase',
                fontWeight: 700,
              }}
            >
              Mainnet · Devnet · 90/7/3
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

export default SolShotDetail;
