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
   PODIUM
   ============================================================ */
function Podium({ top3, isMobile }: { top3: StandingRow[]; isMobile: boolean }) {
  if (top3.length < 3) return null;

  if (isMobile) {
    return (
      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <PodiumSlot rank={1} row={top3[0]} size="lg" winner />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <PodiumSlot rank={2} row={top3[1]} size="sm" />
          <PodiumSlot rank={3} row={top3[2]} size="sm" />
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: 28,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 24,
        alignItems: 'end',
      }}
    >
      <PodiumSlot rank={2} row={top3[1]} size="md" />
      <PodiumSlot rank={1} row={top3[0]} size="lg" winner />
      <PodiumSlot rank={3} row={top3[2]} size="sm" />
    </div>
  );
}

function PodiumSlot({ rank, row, size, winner }: any) {
  const sizes = {
    sm: { num: 96, name: 24, score: 22 },
    md: { num: 128, name: 28, score: 26 },
    lg: { num: 180, name: 38, score: 32 },
  }[size];
  const lineColor = winner ? 'var(--brass)' : 'var(--ink)';
  return (
    <div
      style={{
        position: 'relative',
        paddingTop: 14,
        borderTop: `${winner ? 4 : 2}px solid ${lineColor}`,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9.5,
          letterSpacing: '0.22em',
          color: winner ? 'var(--brass-deep)' : 'var(--ink-45)',
          textTransform: 'uppercase',
          fontWeight: 700,
          marginBottom: 4,
        }}
      >
        {winner ? 'Champion' : `Rank ${String(rank).padStart(2, '0')}`}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: sizes.num,
            color: winner ? 'var(--brass)' : 'var(--ink)',
            lineHeight: 0.86,
            letterSpacing: '0.01em',
          }}
        >
          {String(rank).padStart(2, '0')}
        </span>
        <div style={{ flex: 1, minWidth: 0, paddingTop: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div
              style={{
                width: 26, height: 26, borderRadius: '50%',
                background: row.color,
                border: '1.5px solid var(--ink)',
                color: 'var(--paper)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)',
                fontSize: 12,
                flexShrink: 0,
              }}
            >
              {row.handle}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: sizes.name,
                color: 'var(--ink)',
                lineHeight: 1,
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                minWidth: 0,
              }}
            >
              {row.name}
            </div>
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: sizes.score, fontWeight: 700,
              color: 'var(--ink)',
              letterSpacing: '0.01em',
              marginBottom: 4,
            }}
          >
            {row.score}
            {typeof row.kdRatio === 'number' && (
              <span
                style={{
                  fontSize: sizes.score * 0.55,
                  color: 'var(--ink-45)',
                  marginLeft: 8,
                  letterSpacing: '0.04em',
                }}
              >
                K/D
              </span>
            )}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10, color: 'var(--ink-45)',
              letterSpacing: '0.06em',
            }}
          >
            {typeof row.kdRatio === 'number' ? (
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
  const sub = placeholder
    ? `${rows.length} ranked · ${cabinetLabel || 'Overall'} — placeholder data`
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
            gridTemplateColumns: isMobile ? '36px 1fr 80px 50px' : '48px 1fr 110px 110px 80px',
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
  // SolShot: the plays-meta label changes from "X plays" to "X matches"
  // and we lean on the structured fields (matchesPlayed, winRate) instead
  // of the formatted strings.
  const metaLabel = isSolShotMode
    ? `· ${row.matchesPlayed ?? row.plays} matches`
    : `· ${row.plays} plays`;
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
        gridTemplateColumns: isMobile ? '36px 1fr 80px 50px' : '48px 1fr 110px 110px 80px',
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
        {!isMobile && (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10, color: 'var(--ink-45)',
              letterSpacing: '0.04em',
              marginLeft: 'auto', flexShrink: 0,
            }}
          >
            {metaLabel}
          </span>
        )}
      </div>
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
