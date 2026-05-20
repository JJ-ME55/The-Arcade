// @ts-nocheck — JSX-heavy route, keeping types loose until brand pass.
import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useArcadeAuth } from '@/wallet/useAuth';

const API_BASE = import.meta.env.VITE_SOLSHOT_API_BASE;

const GAMES = [
  { slug: 'basketball', label: 'Basketball', emoji: '🏀', api: 'basketball', unit: 'pts' },
  { slug: 'keepie-uppies', label: 'Keepie Uppies', emoji: '⚽', api: 'keepieuppies', unit: '' },
  { slug: 'free-kicks', label: 'Free Kicks', emoji: '🥅', api: 'freekicks', unit: 'pts' },
];

function findGame(slug) {
  return GAMES.find((g) => g.slug === slug) || GAMES[0];
}

export function Leaderboards() {
  const { game: gameParam } = useParams();
  const navigate = useNavigate();
  const auth = useArcadeAuth();
  const active = useMemo(() => findGame(gameParam), [gameParam]);

  const [state, setState] = useState({ loading: true, rows: [], error: null });

  useEffect(() => {
    if (!API_BASE) {
      setState({ loading: false, rows: [], error: 'No API base configured' });
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    fetch(`${API_BASE}/api/games/${active.api}/leaderboard?limit=50`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.ok && Array.isArray(data.leaderboard)) {
          setState({ loading: false, rows: data.leaderboard, error: null });
        } else {
          setState({
            loading: false,
            rows: [],
            error: data?.error || 'Failed to fetch leaderboard',
          });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setState({ loading: false, rows: [], error: err?.message || 'Network error' });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [active]);

  const myName = auth.callsign || null;

  return (
    <main style={styles.root}>
      <header style={styles.header}>
        <h1 style={styles.title}>Leaderboards</h1>
        <p style={styles.subtitle}>All-time best scores · top 50</p>
      </header>

      <nav style={styles.tabs} aria-label="Game tabs">
        {GAMES.map((g) => (
          <button
            key={g.slug}
            type="button"
            onClick={() =>
              navigate(g.slug === GAMES[0].slug ? '/leaderboards' : `/leaderboards/${g.slug}`)
            }
            style={{
              ...styles.tab,
              ...(g.slug === active.slug ? styles.tabActive : null),
            }}
            aria-pressed={g.slug === active.slug}
          >
            <span style={styles.tabEmoji}>{g.emoji}</span>
            <span>{g.label}</span>
          </button>
        ))}
      </nav>

      <section style={styles.boardWrap}>
        {state.loading && <p style={styles.message}>Loading…</p>}
        {!state.loading && state.error && (
          <p style={{ ...styles.message, color: 'var(--accent-live)' }}>{state.error}</p>
        )}
        {!state.loading && !state.error && state.rows.length === 0 && (
          <p style={styles.message}>No scores yet. Be the first.</p>
        )}
        {!state.loading && state.rows.length > 0 && (
          <ol style={styles.list}>
            {state.rows.map((row) => {
              const name =
                row.displayName || row.telegramUsername || row.firstName || 'anon';
              const isMe = myName && name.toLowerCase() === myName.toLowerCase();
              return (
                <li
                  key={`${row.rank}-${row.telegramUserId || name}`}
                  style={{
                    ...styles.row,
                    ...(isMe ? styles.rowMe : null),
                  }}
                >
                  <span style={styles.rank}>#{row.rank}</span>
                  <span style={styles.name}>{name}</span>
                  <span style={styles.score}>
                    {row.bestScore}
                    {active.unit ? ` ${active.unit}` : ''}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <footer style={styles.footer}>
        <button type="button" onClick={() => navigate('/dashboard')} style={styles.backButton}>
          ← Back to The Arcade
        </button>
      </footer>
    </main>
  );
}

const styles = {
  root: {
    minHeight: '100dvh',
    padding: 'var(--space-6) var(--space-4)',
    maxWidth: 720,
    margin: '0 auto',
    paddingBottom: 'calc(var(--space-12) + env(safe-area-inset-bottom, 0px))',
  },
  header: {
    textAlign: 'center',
    marginBottom: 'var(--space-6)',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: 'clamp(1.5rem, 5vw, 2.25rem)',
    background: 'var(--fire-gradient)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    letterSpacing: '0.06em',
    marginBottom: 'var(--space-2)',
  },
  subtitle: {
    margin: 0,
    fontSize: '0.875rem',
    color: 'var(--paper-warm)',
    opacity: 0.55,
    letterSpacing: '0.04em',
  },
  tabs: {
    display: 'flex',
    gap: 'var(--space-2)',
    marginBottom: 'var(--space-6)',
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
    paddingBottom: 4,
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    background: 'transparent',
    border: '1px solid rgba(245, 230, 204, 0.18)',
    borderRadius: 6,
    color: 'var(--paper-warm)',
    fontFamily: 'var(--font-body)',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'background-color 120ms ease, border-color 120ms ease, color 120ms ease',
    WebkitTapHighlightColor: 'transparent',
  },
  tabActive: {
    background: 'rgba(255, 210, 58, 0.12)',
    borderColor: 'var(--accent)',
    color: 'var(--accent)',
  },
  tabEmoji: {
    fontSize: 16,
  },
  boardWrap: {
    minHeight: 200,
  },
  message: {
    textAlign: 'center',
    color: 'var(--paper-warm)',
    opacity: 0.7,
    padding: 'var(--space-8) 0',
  },
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '60px 1fr auto',
    alignItems: 'center',
    padding: '10px 14px',
    background: 'rgba(245, 230, 204, 0.04)',
    border: '1px solid rgba(245, 230, 204, 0.08)',
    borderRadius: 4,
    fontFamily: 'var(--font-body)',
    fontSize: 14,
  },
  rowMe: {
    background:
      'linear-gradient(90deg, rgba(255, 210, 58, 0.18) 0%, rgba(255, 138, 31, 0.08) 100%)',
    borderColor: 'var(--accent)',
    color: 'var(--accent)',
    fontWeight: 700,
  },
  rank: {
    fontFamily: 'var(--font-display)',
    fontSize: 13,
    letterSpacing: '0.04em',
    opacity: 0.75,
  },
  name: {
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  score: {
    fontFamily: 'var(--font-display)',
    fontSize: 14,
    letterSpacing: '0.04em',
  },
  footer: {
    marginTop: 'var(--space-8)',
    textAlign: 'center',
  },
  backButton: {
    padding: '8px 14px',
    background: 'transparent',
    border: '1px solid rgba(255, 210, 58, 0.45)',
    borderRadius: 6,
    color: 'var(--accent)',
    fontFamily: 'var(--font-display)',
    fontSize: 12,
    letterSpacing: '0.06em',
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
  },
};

export default Leaderboards;
