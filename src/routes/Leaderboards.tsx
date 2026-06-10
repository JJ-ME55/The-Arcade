// @ts-nocheck — JSX-heavy route. Phase 7 leaderboard per ed-leaderboard.jsx.
import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useArcadeAuth } from '@/wallet/useAuth';
import { useLeaderboardData } from '@/hooks/useLeaderboardData';
import { useMyStanding, type MyStanding } from '@/hooks/useMyStanding';
import { Section } from '@/components/brand';
import {
  LEADERBOARD_STANDINGS,
  FRIENDS_BOARD,
  PRIZE_TIERS,
  CABINET_TABS,
  TIME_WINDOWS,
  LEADERBOARD_HEADER_STATS,
  YOUR_STANDING,
  type StandingRow,
} from '@/data/leaderboard-fixtures';

const TONE_TO_COLOR = {
  brass: 'var(--brass-deep)',
  ink: 'var(--ink)',
  'ink-70': 'var(--ink-70)',
} as const;

/**
 * Leaderboards — `/leaderboard` (singular per Phase 2 IA flip).
 *
 * Per handoff ed-leaderboard.jsx. Hero · filters · podium · full
 * standings · right rail (Your Standing / Friends / Prize Structure).
 *
 * Data is placeholder per JJ for design fidelity. Real wiring to
 * /api/games/<slug>/leaderboard happens after server adds time-
 * window + prize + delta columns.
 */
export function Leaderboards() {
  const { game: gameParam } = useParams<{ game?: string }>();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const auth = useArcadeAuth();

  const [activeCabinet, setActiveCabinet] = useState(gameParam || 'overall');
  const [activeWindow, setActiveWindow] = useState<'24h' | '7d' | 'all'>('all');

  // Real data when a specific cabinet is selected + window=all (server
  // only supports all-time). Placeholder otherwise.
  const activeCabinetDef = CABINET_TABS.find((c) => c.id === activeCabinet);
  const live = useLeaderboardData({
    api: activeCabinetDef?.api,
    window: activeWindow,
    myName: auth.callsign,
    limit: 10,
  });

  const myStandingResult = useMyStanding({ api: activeCabinetDef?.api });

  const rows: StandingRow[] = live.rows ?? LEADERBOARD_STANDINGS;
  const top3 = useMemo(() => rows.slice(0, 3), [rows]);
  const usingPlaceholder = live.placeholder;

  return (
    <main
      style={{
        padding: isMobile ? '20px 14px 32px' : '0 32px 40px',
        maxWidth: 1440,
        margin: '0 auto',
        width: '100%',
      }}
    >
      <LeaderboardHero
        isMobile={isMobile}
        totalPlayers={live.totalPlayers}
        cabinetLabel={activeCabinetDef?.label}
      />
      <Filters
        isMobile={isMobile}
        activeCabinet={activeCabinet}
        activeWindow={activeWindow}
        onCabinet={(id) => {
          setActiveCabinet(id);
          navigate(id === 'overall' ? '/leaderboard' : `/leaderboard/${id}`);
        }}
        onWindow={setActiveWindow}
      />
      {/* Cross-sell: when viewing the Free Kicks board, tell the player
          it pays — this board IS the competition entry. Closes the loop
          between the leaderboard and the 1 SOL prize. */}
      {activeCabinet === 'free-kicks' && (
        <button
          type="button"
          onClick={() => navigate('/competitions')}
          style={{
            appearance: 'none',
            textAlign: 'left',
            cursor: 'pointer',
            width: '100%',
            marginTop: 16,
            background: 'var(--ink-deep)',
            color: 'var(--paper)',
            border: '1.5px solid var(--ink)',
            borderLeft: '4px solid var(--brass)',
            padding: isMobile ? '11px 14px' : '12px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: isMobile ? 14 : 16,
              textTransform: 'uppercase',
              letterSpacing: '0.01em',
              color: 'var(--brass-glint)',
              whiteSpace: 'nowrap',
            }}
          >
            This board pays 1 SOL
          </span>
          <span
            style={{
              flex: 1,
              minWidth: 0,
              fontFamily: 'var(--font-body)',
              fontSize: isMobile ? 12.5 : 13.5,
              color: 'rgba(251,252,254,0.75)',
            }}
          >
            Hold the top score when the competition closes to win.
          </span>
          <span
            style={{
              flexShrink: 0,
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--brass)',
            }}
          >
            Details →
          </span>
        </button>
      )}
      {live.loading && (
        <div
          style={{
            padding: '20px 0',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.18em',
            color: 'var(--ink-45)',
            textTransform: 'uppercase',
            fontWeight: 700,
          }}
        >
          · Loading standings ·
        </div>
      )}
      {!live.loading && rows.length >= 3 && <Podium top3={top3} isMobile={isMobile} />}

      <div
        style={{
          marginTop: 36,
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 320px',
          columnGap: 32,
          rowGap: 28,
        }}
      >
        <Standings rows={rows} placeholder={usingPlaceholder} cabinetLabel={activeCabinetDef?.label} window={activeWindow} />
        <Rail myStanding={myStandingResult.standing} cabinetLabel={activeCabinetDef?.label} />
      </div>
    </main>
  );
}

/* ============================================================
   HERO
   ============================================================ */
function LeaderboardHero({
  isMobile,
  totalPlayers,
  cabinetLabel,
}: {
  isMobile: boolean;
  totalPlayers: number | null;
  cabinetLabel?: string;
}) {
  // `totalPlayers` is live data from the server. Show `—` while loading
  // (was falling back to the 412 fixture placeholder, which caused a
  // jarring flash from 412 → real count). Prize Pot + Resets In stay
  // as `—` for V1 — they need the economy ruled in (prize ledger) and
  // a decision on whether all-time boards reset at all.
  const playersValue =
    typeof totalPlayers === 'number' ? totalPlayers.toLocaleString() : '—';
  const eyebrow = cabinetLabel
    ? `Standings · The Floor · ${cabinetLabel}`
    : 'Standings · The Floor';
  return (
    <div
      style={{
        padding: '32px 0 22px',
        borderBottom: '1.5px solid var(--ink)',
        marginBottom: 18,
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr auto auto auto',
        gap: isMobile ? 16 : 28,
        alignItems: 'baseline',
      }}
    >
      <div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.22em',
            color: 'var(--brass-deep)',
            textTransform: 'uppercase',
            fontWeight: 700,
            marginBottom: 10,
          }}
        >
          {eyebrow}
        </div>
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: isMobile ? 'clamp(2.5rem, 12vw, 4rem)' : 88,
            lineHeight: 0.86,
            color: 'var(--ink)',
            letterSpacing: '0.01em',
            textTransform: 'uppercase',
          }}
        >
          Leaderboard
        </h1>
      </div>

      {!isMobile && (
        <>
          <HeaderStat label="Players" value={playersValue} tone="var(--ink)" />
          <HeaderStat label="Prize Pot" value="—" tone="var(--ink-45)" />
          <HeaderStat label="Resets In" value="—" tone="var(--ink-45)" />
        </>
      )}

      {isMobile && (
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
          <HeaderStat label="Players" value={playersValue} tone="var(--ink)" small />
          <HeaderStat label="Prize Pot" value="—" tone="var(--ink-45)" small />
          <HeaderStat label="Resets In" value="—" tone="var(--ink-45)" small />
        </div>
      )}
    </div>
  );
}

function HeaderStat({ label, value, tone, small }: any) {
  return (
    <div style={{ textAlign: small ? 'left' : 'right' }}>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          letterSpacing: '0.22em',
          color: 'var(--ink-45)',
          textTransform: 'uppercase',
          fontWeight: 700,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: small ? 20 : 30,
          color: tone,
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
   FILTERS
   ============================================================ */
function Filters({ isMobile, activeCabinet, activeWindow, onCabinet, onWindow }: any) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        padding: '6px 0 12px',
        borderBottom: '1.5px solid var(--ink)',
        gap: 24,
        flexWrap: 'wrap',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: isMobile ? 14 : 20,
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {CABINET_TABS.map((c) => {
          const active = activeCabinet === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onCabinet(c.id)}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '0 0 2px',
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                fontWeight: 700,
                color: active ? 'var(--ink)' : 'var(--ink-70)',
                borderBottom: active ? '2px solid var(--brass)' : '2px solid transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 0,
          border: '1.5px solid var(--ink)',
        }}
      >
        {TIME_WINDOWS.map((w, i) => {
          const active = activeWindow === w.id;
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => onWindow(w.id)}
              style={{
                padding: '6px 12px',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                fontWeight: 700,
                color: active ? 'var(--paper)' : 'var(--ink)',
                background: active ? 'var(--ink)' : 'transparent',
                border: 'none',
                borderRight: i < TIME_WINDOWS.length - 1 ? '1px solid var(--ink)' : 'none',
                cursor: 'pointer',
              }}
            >
              {w.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   PODIUM — stepped olympic-style platforms (gold / silver / bronze)
   ============================================================ */

/**
 * Per-rank platform chrome. The three platforms align to the bottom
 * (`alignItems: 'flex-end'`) so the height differential creates the
 * stepped olympic-podium silhouette: gold tallest in the centre,
 * silver mid on the left, bronze shortest on the right.
 *
 * Mobile collapses the stack: #01 full-width on top, #02 + #03 side-
 * by-side below — same data hierarchy, single-column friendly.
 */
function Podium({ top3, isMobile }: { top3: StandingRow[]; isMobile: boolean }) {
  if (top3.length < 3) return null;

  if (isMobile) {
    return (
      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <PodiumPlatform rank={1} row={top3[0]} height={260} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <PodiumPlatform rank={2} row={top3[1]} height={220} />
          <PodiumPlatform rank={3} row={top3[2]} height={200} />
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: 28,
        display: 'grid',
        gridTemplateColumns: '1fr 1.1fr 1fr',
        gap: 14,
        alignItems: 'end',
      }}
    >
      <PodiumPlatform rank={2} row={top3[1]} height={300} />
      <PodiumPlatform rank={1} row={top3[0]} height={380} />
      <PodiumPlatform rank={3} row={top3[2]} height={260} />
    </div>
  );
}

/** Brass laurel branch — used flanking the champion's #01 rank number.
 *  `side` = 'left' renders pointing outward to the left; 'right' mirrors.
 *  Small + decorative; brand-toned. Not a real wreath, just a flourish. */
function LaurelBranch({ side }: { side: 'left' | 'right' }) {
  return (
    <svg
      width={48}
      height={88}
      viewBox="0 0 48 88"
      style={{
        transform: side === 'left' ? 'scaleX(-1)' : 'none',
        flexShrink: 0,
      }}
      aria-hidden
    >
      <path
        d="M 6 6 Q 30 30 30 80"
        stroke="var(--brass-deep)"
        strokeWidth={1.8}
        strokeLinecap="round"
        fill="none"
      />
      <ellipse cx={18} cy={16} rx={6} ry={2.8} fill="var(--brass)" transform="rotate(-35 18 16)" />
      <ellipse cx={24} cy={28} rx={6.5} ry={2.8} fill="var(--brass-glint)" transform="rotate(-50 24 28)" />
      <ellipse cx={28} cy={42} rx={6.5} ry={2.8} fill="var(--brass)" transform="rotate(-65 28 42)" />
      <ellipse cx={30} cy={56} rx={6} ry={2.8} fill="var(--brass-glint)" transform="rotate(-80 30 56)" />
      <ellipse cx={31} cy={70} rx={5.5} ry={2.6} fill="var(--brass)" transform="rotate(-90 31 70)" />
    </svg>
  );
}

/** Stepped podium platform — single column with the rank chrome.
 *  Heights are passed by parent so the stepped silhouette comes from
 *  the layout, not from the slot itself.
 *
 *  Each platform draws three vertical zones:
 *    1. Label band at the top (CHAMPION / RANK 02 / RANK 03)
 *    2. Hero rank number flanked by laurels (only on #01)
 *    3. Player block (handle disc + name + score + meta)
 *
 *  Colour scheme:
 *    rank 1 → paper bg → brass-glint vertical gradient, brass-deep top rule, 5px brass underline
 *    rank 2 → paper bg → cool grey top rule (ink), 3px ink underline
 *    rank 3 → paper bg → warm bronze top rule (brass-deep), 3px brass-deep underline
 */
function PodiumPlatform({
  rank,
  row,
  height,
}: {
  rank: number;
  row: StandingRow;
  height: number;
}) {
  const isChamp = rank === 1;
  const isSilver = rank === 2;

  const accent = isChamp
    ? 'var(--brass)'
    : isSilver
    ? 'var(--ink)'
    : 'var(--brass-deep)';
  const accentSoft = isChamp
    ? 'var(--brass-glint)'
    : isSilver
    ? 'var(--ink-70)'
    : 'var(--brass)';
  const labelColor = isChamp ? 'var(--brass-deep)' : 'var(--ink-45)';
  const labelText = isChamp ? 'CHAMPION' : `RANK ${String(rank).padStart(2, '0')}`;

  const isKdRow = typeof row.kdRatio === 'number';

  return (
    <div
      style={{
        position: 'relative',
        height,
        background: isChamp
          ? 'linear-gradient(180deg, rgba(232,200,121,0.18) 0%, var(--paper) 55%, var(--paper) 100%)'
          : isSilver
          ? 'linear-gradient(180deg, rgba(21,32,58,0.06) 0%, var(--paper) 55%, var(--paper) 100%)'
          : 'linear-gradient(180deg, rgba(200,160,99,0.16) 0%, var(--paper) 55%, var(--paper) 100%)',
        border: '1.5px solid var(--ink)',
        borderTop: `${isChamp ? 4 : 2}px solid ${accent}`,
        borderBottom: `${isChamp ? 6 : 4}px solid ${accent}`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Champion banner — only renders on #01 platform */}
      {isChamp && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '3px 14px',
            background: 'var(--brass-deep)',
            color: 'var(--paper)',
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            letterSpacing: '0.28em',
            fontWeight: 700,
            textTransform: 'uppercase',
          }}
        >
          Champion
        </div>
      )}

      {/* Label band */}
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9.5,
          letterSpacing: '0.22em',
          color: labelColor,
          textTransform: 'uppercase',
          fontWeight: 700,
          textAlign: 'center',
          paddingTop: isChamp ? 32 : 16,
          paddingBottom: 8,
        }}
      >
        {labelText}
      </div>

      {/* Hero rank number — flanked by laurels for the champion */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: isChamp ? 6 : 0,
          padding: isChamp ? '4px 0 14px' : '6px 0 12px',
        }}
      >
        {isChamp && <LaurelBranch side="left" />}
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: isChamp ? 132 : 96,
            color: accent,
            lineHeight: 0.82,
            letterSpacing: '0.01em',
          }}
        >
          {String(rank).padStart(2, '0')}
        </span>
        {isChamp && <LaurelBranch side="right" />}
      </div>

      {/* Player block — handle disc + name */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '0 12px',
          marginBottom: 4,
        }}
      >
        <div
          style={{
            width: isChamp ? 26 : 22,
            height: isChamp ? 26 : 22,
            borderRadius: '50%',
            background: row.color,
            border: `1.5px solid ${accentSoft}`,
            color: 'var(--paper)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-display)',
            fontSize: isChamp ? 12 : 10,
            flexShrink: 0,
          }}
        >
          {row.handle}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: isChamp ? 18 : 15,
            fontWeight: 700,
            color: 'var(--ink)',
            lineHeight: 1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            minWidth: 0,
            maxWidth: '85%',
          }}
        >
          {row.name}
        </div>
      </div>

      {/* Score — large mono number */}
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: isChamp ? 30 : 24,
          fontWeight: 700,
          color: 'var(--ink)',
          letterSpacing: '0.01em',
          textAlign: 'center',
          marginTop: 2,
          marginBottom: 4,
        }}
      >
        {row.score}
        {isKdRow && (
          <span
            style={{
              fontSize: isChamp ? 14 : 11,
              color: 'var(--ink-45)',
              marginLeft: 6,
              letterSpacing: '0.06em',
            }}
          >
            K/D
          </span>
        )}
      </div>

      {/* Meta — plays · prize (or matches · W% on SolShot) */}
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--ink-45)',
          letterSpacing: '0.06em',
          textAlign: 'center',
          paddingBottom: 12,
        }}
      >
        {isKdRow ? (
          <>
            {row.matchesPlayed ?? row.plays} matches ·{' '}
            <span
              style={{
                color: (row.winRate ?? 0) >= 50 ? 'var(--win)' : 'var(--brass-deep)',
                fontWeight: 700,
              }}
            >
              {row.winRate ?? '—'}% W
            </span>
          </>
        ) : (
          <>
            {row.plays} plays ·{' '}
            <span style={{ color: 'var(--win)', fontWeight: 700 }}>{row.prize}</span>
          </>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   STANDINGS
   ============================================================ */
function Standings({ rows, placeholder, cabinetLabel, window: timeWindow }: any) {
  const isMobile = useIsMobile();
  const windowLabel =
    timeWindow === '24h' ? '24h' : timeWindow === '7d' ? '7d' : 'all-time';
  // SolShot rows arrive with kdRatio populated — that's how the Standings
  // component detects the K/D + W% column mode without a parent prop.
  const isSolShotMode = !placeholder && rows.length > 0 && typeof rows[0]?.kdRatio === 'number';

  // Empty state — no live data + no fallback fixture (V1 honesty pass
  // emptied LEADERBOARD_STANDINGS so Overall placeholder mode no longer
  // shows fake rows). Honest prompt instead.
  if (rows.length === 0) {
    return (
      <Section title="Standings" sub={cabinetLabel || 'Overall'}>
        <div
          style={{
            background: 'var(--paper)',
            border: '1.5px solid var(--ink)',
            padding: '36px 16px',
            textAlign: 'center',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.18em',
            color: 'var(--ink-45)',
            textTransform: 'uppercase',
            fontWeight: 700,
          }}
        >
          · Pick a cabinet to see live rankings ·
        </div>
      </Section>
    );
  }

  const sub = placeholder
    ? `${rows.length} ranked · ${cabinetLabel || 'Overall'}`
    : `${rows.length} ranked · ${cabinetLabel} · ${windowLabel}`;
  // Column header labels swap by cabinet:
  //   Overall   → score column = "Plays" (value is plays-across-cabinets)
  //   SolShot   → score = "K/D",  prize = "W %" (PvP scorecard)
  //   per-game  → score = "Score", prize = "Prize" (default)
  const scoreColumnLabel = isSolShotMode
    ? 'K/D'
    : cabinetLabel === 'Overall' && !placeholder
    ? 'Plays'
    : 'Score';
  const secondColumnLabel = isSolShotMode ? 'W %' : 'Prize';
  return (
    <Section title="Standings" sub={sub}>
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
            gridTemplateColumns: isMobile
              ? '36px 1fr 64px 50px'
              : '48px 1fr 80px 100px 100px 70px',
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
          <span>Player</span>
          {!isMobile && <span style={{ textAlign: 'right' }}>Plays</span>}
          <span style={{ textAlign: 'right' }}>{scoreColumnLabel}</span>
          {!isMobile && <span style={{ textAlign: 'right' }}>{secondColumnLabel}</span>}
          <span style={{ textAlign: 'right' }}>Δ</span>
        </div>
        {rows.map((r, i) => (
          <StandingsRow
            key={r.rank}
            row={r}
            isLast={i === rows.length - 1}
            isMobile={isMobile}
            isSolShotMode={isSolShotMode}
          />
        ))}
      </div>
    </Section>
  );
}

function StandingsRow({ row, isLast, isMobile, isSolShotMode }: any) {
  const deltaColor =
    row.delta.startsWith('+')
      ? 'var(--win)'
      : row.delta.startsWith('-')
      ? 'var(--lose)'
      : 'var(--ink-45)';
  // For the SolShot mode the "prize" column becomes the W% value styled
  // brass-deep to read as a percentage, not as a money value.
  const secondCellValue = isSolShotMode
    ? typeof row.winRate === 'number'
      ? `${row.winRate}%`
      : '—'
    : row.prize;
  const secondCellColor = isSolShotMode
    ? typeof row.winRate === 'number'
      ? row.winRate >= 50
        ? 'var(--win)'
        : 'var(--brass-deep)'
      : 'var(--ink-45)'
    : row.prize === '—'
    ? 'var(--ink-45)'
    : 'var(--win)';

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: isMobile
          ? '36px 1fr 64px 50px'
          : '48px 1fr 80px 100px 100px 70px',
        padding: '11px 16px',
        alignItems: 'center',
        borderBottom: isLast ? 'none' : '1px dotted var(--hair)',
        background: row.you ? 'rgba(184,147,96,0.10)' : 'transparent',
        position: 'relative',
      }}
    >
      {row.you && (
        <div
          style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: 4, background: 'var(--brass)',
          }}
        />
      )}
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 16,
          color: row.rank <= 3 ? 'var(--brass-deep)' : 'var(--ink)',
          letterSpacing: '0.02em', lineHeight: 1,
        }}
      >
        {String(row.rank).padStart(2, '0')}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <div
          style={{
            width: 24, height: 24, borderRadius: '50%',
            background: row.color, border: '1.5px solid var(--ink)',
            color: 'var(--paper)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)',
            fontSize: 11, flexShrink: 0,
          }}
        >
          {row.handle}
        </div>
        <span
          style={{
            fontSize: 13, color: 'var(--ink)',
            fontWeight: row.you ? 700 : 600,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            minWidth: 0,
          }}
        >
          {row.name}
          {row.you && (
            <span
              style={{
                marginLeft: 8,
                fontFamily: 'var(--font-mono)',
                fontSize: 8, letterSpacing: '0.2em', fontWeight: 700,
                color: 'var(--brass-deep)',
                border: '1px solid var(--brass)',
                padding: '1px 5px',
                verticalAlign: 'middle',
              }}
            >
              YOU
            </span>
          )}
        </span>
      </div>
      {/* Plays column — count of attempts / matches. Lives between
          Player and Score per the v2 spec, was previously surfaced as
          an inline meta on the player name. */}
      {!isMobile && (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--ink-70)',
            textAlign: 'right',
            letterSpacing: '0.02em',
          }}
        >
          {isSolShotMode ? row.matchesPlayed ?? row.plays : row.plays}
        </span>
      )}
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 14, fontWeight: 700, color: 'var(--ink)',
          textAlign: 'right', letterSpacing: '0.01em',
        }}
      >
        {row.score}
      </span>
      {!isMobile && (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12, fontWeight: 700,
            color: secondCellColor,
            textAlign: 'right',
          }}
        >
          {secondCellValue}
        </span>
      )}
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11, fontWeight: 700, color: deltaColor,
          textAlign: 'right',
        }}
      >
        {row.delta}
      </span>
    </div>
  );
}

/* ============================================================
   RAIL
   ============================================================ */
function Rail({
  myStanding,
  cabinetLabel,
}: {
  myStanding: MyStanding | null;
  cabinetLabel?: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <YouCard myStanding={myStanding} cabinetLabel={cabinetLabel} />
      <FriendsBoard />
      <PrizeStructure />
    </div>
  );
}

function YouCard({
  myStanding,
  cabinetLabel,
}: {
  myStanding: MyStanding | null;
  cabinetLabel?: string;
}) {
  // Live data wins; placeholder is the V1 fallback for direct web visitors
  // (no TG session JWT → no identity yet). Once Privy comes back the
  // hook will pull identity from the auth context instead.
  const isLive = myStanding !== null;
  const rankDisplay = isLive
    ? String(myStanding!.rank).padStart(2, '0')
    : YOUR_STANDING.rank;
  const scoreLabel = cabinetLabel === 'Overall' ? 'plays' : 'best';
  const body = isLive
    ? `${myStanding!.totalSubmissions.toLocaleString()} ${scoreLabel} on ${cabinetLabel || 'this cabinet'}.`
    : YOUR_STANDING.body;
  const bonus = isLive ? '' : YOUR_STANDING.bonus;
  const trend = isLive
    ? `${cabinetLabel?.toUpperCase() || 'STANDING'}`
    : YOUR_STANDING.trend;
  return (
    <div
      style={{
        background: 'var(--paper)',
        border: '1.5px solid var(--ink)',
        borderTop: '5px solid var(--brass)',
        padding: '14px 16px',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9, letterSpacing: '0.22em',
          color: 'var(--ink-45)', textTransform: 'uppercase',
          fontWeight: 700, marginBottom: 2,
        }}
      >
        Your Standing
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 56, color: 'var(--brass)',
            lineHeight: 1, letterSpacing: '0.01em',
          }}
        >
          {rankDisplay}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11, fontWeight: 700,
            color: 'var(--win)', letterSpacing: '0.06em',
          }}
        >
          {trend}
        </span>
      </div>
      <div
        style={{
          fontSize: 12.5, color: 'var(--ink-70)',
          lineHeight: 1.5, marginBottom: 12,
        }}
      >
        {body}
        {bonus && (
          <>
            {' '}
            <b style={{ color: 'var(--brass-deep)' }}>{bonus}</b>
          </>
        )}
      </div>
      <button
        type="button"
        style={{
          width: '100%', padding: '10px 12px',
          background: 'var(--ink)', color: 'var(--paper)',
          border: '1.5px solid var(--ink)',
          fontFamily: 'var(--font-mono)',
          fontSize: 11, fontWeight: 700, letterSpacing: '0.14em',
          textTransform: 'uppercase', cursor: 'pointer',
        }}
      >
        {isLive ? '▸ Defend Lead' : '▸ Defend Lead'}
      </button>
    </div>
  );
}

function FriendsBoard() {
  if (FRIENDS_BOARD.length === 0) {
    return (
      <Section title="Friends Only" sub="V2">
        <div
          style={{
            padding: '20px 0',
            textAlign: 'center',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.18em',
            color: 'var(--ink-45)',
            textTransform: 'uppercase',
            fontWeight: 700,
          }}
        >
          · Friends graph · V2 ·
        </div>
      </Section>
    );
  }
  return (
    <Section title="Friends Only" sub={`${FRIENDS_BOARD.length} playing`}>
      <div>
        {FRIENDS_BOARD.map((r, i) => (
          <div
            key={r.rank}
            style={{
              display: 'grid', gridTemplateColumns: '30px 24px 1fr auto',
              gap: 8, alignItems: 'center',
              padding: '8px 0',
              borderBottom: i < FRIENDS_BOARD.length - 1 ? '1px dotted var(--hair)' : 'none',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 13, color: 'var(--ink-45)',
                letterSpacing: '0.02em',
              }}
            >
              {String(r.rank).padStart(2, '0')}
            </span>
            <div
              style={{
                width: 22, height: 22, borderRadius: '50%',
                background: r.color, border: '1.5px solid var(--ink)',
                color: 'var(--paper)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)',
                fontSize: 10,
              }}
            >
              {r.handle}
            </div>
            <span
              style={{
                fontSize: 12, color: 'var(--ink)',
                fontWeight: r.you ? 700 : 600,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}
            >
              {r.name}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11, fontWeight: 700, color: 'var(--ink)',
              }}
            >
              {r.score}
            </span>
          </div>
        ))}
      </div>
    </Section>
  );
}

function PrizeStructure() {
  if (PRIZE_TIERS.length === 0) {
    return (
      <Section title="Prize Pot" sub="V3 economy">
        <div
          style={{
            padding: '20px 0',
            textAlign: 'center',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.18em',
            color: 'var(--ink-45)',
            textTransform: 'uppercase',
            fontWeight: 700,
          }}
        >
          · Prize ladder · V3 ·
        </div>
      </Section>
    );
  }
  return (
    <Section title="Prize Pot" sub="3.84 SOL · 24h">
      <div>
        {PRIZE_TIERS.map((t, i) => (
          <div
            key={t.range}
            style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '7px 0',
              borderBottom: i < PRIZE_TIERS.length - 1 ? '1px dotted var(--hair)' : 'none',
              fontFamily: 'var(--font-mono)',
              fontSize: 11.5, letterSpacing: '0.06em',
            }}
          >
            <span style={{ color: 'var(--ink-70)' }}>RANK · {t.range}</span>
            <span style={{ color: TONE_TO_COLOR[t.tone], fontWeight: 700 }}>{t.prize}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}

export default Leaderboards;
