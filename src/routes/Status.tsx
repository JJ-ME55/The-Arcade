// @ts-nocheck — JSX-heavy editorial status page.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_SOLSHOT_API_BASE;
const POLL_MS = 30 * 1000; // refresh every 30s

interface Check {
  ok: boolean;
  latencyMs?: number;
  error?: string;
}

interface StatusResponse {
  ok: boolean;
  checks: Record<string, Check>;
  elapsedMs: number;
  serverTime: string;
}

const LABELS: Record<string, string> = {
  mongo: 'Database',
  basketball_lb: 'Basketball · Leaderboard',
  keepieuppies_lb: 'Keepie Uppies · Leaderboard',
  freekicks_lb: 'Free Kicks · Leaderboard',
};

/**
 * /status — pings /api/arcade/status and renders per-surface up/down.
 * Honest about what's running and what isn't. Polls every 30s for
 * fresh state. Pre-launch trust signal: users can see whether the
 * floor is really open before signing up.
 */
export function Status() {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;
    const probe = async () => {
      if (cancelled) return;
      if (!API_BASE) {
        setError('API base not configured');
        setLoading(false);
        return;
      }
      try {
        const resp = await fetch(`${API_BASE}/api/arcade/status`, { method: 'GET' });
        const json: StatusResponse = await resp.json();
        if (cancelled) return;
        setData(json);
        setLastChecked(new Date());
        setError(null);
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message || 'fetch_failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    probe();
    const id = setInterval(probe, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const overallOk = data?.ok ?? null;
  const overallText =
    loading && !data
      ? 'Probing…'
      : error
      ? 'Status check failed'
      : overallOk
      ? 'All systems · Floor open'
      : 'Degraded · Some cabinets offline';

  return (
    <main style={styles.root}>
      <div style={styles.container}>
        <p style={styles.eyebrow}>· The Arcade · Status ·</p>
        <h1 style={styles.h1}>{overallText}</h1>
        <p style={styles.meta}>
          {lastChecked
            ? `Last checked ${lastChecked.toLocaleTimeString()} · refreshes every 30s`
            : 'Initial probe in flight'}
        </p>

        {error && (
          <div style={styles.errorBox}>
            <p style={styles.errorTitle}>· Could not reach the server ·</p>
            <p style={styles.errorBody}>{error}</p>
          </div>
        )}

        {data && (
          <section style={styles.section}>
            <h2 style={styles.h2}>Per-surface state</h2>
            <ul style={styles.list}>
              {Object.entries(data.checks).map(([key, check]) => (
                <li key={key} style={styles.row}>
                  <span style={styles.rowLabel}>{LABELS[key] ?? key}</span>
                  <span style={check.ok ? styles.dotOk : styles.dotBad}>●</span>
                  <span style={styles.rowState}>
                    {check.ok
                      ? `Online · ${check.latencyMs}ms`
                      : `Down · ${check.error || 'no detail'}`}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section style={styles.section}>
          <h2 style={styles.h2}>What this page does</h2>
          <p style={styles.p}>
            Live probe of the SolShot server, the Mongo database, and
            each per-game leaderboard endpoint. If any item is red,
            that specific surface is down — other cabinets keep
            working. The page polls every 30 seconds; refresh manually
            for a fresh check.
          </p>
        </section>

        <p style={styles.footer}>
          <Link to="/play" style={styles.footerLink}>Return to the floor</Link>
        </p>
      </div>
    </main>
  );
}

const styles = {
  root: {
    minHeight: '100dvh',
    background: 'var(--bg)',
    color: 'var(--ink)',
    padding: '40px 16px 80px',
  },
  container: {
    maxWidth: 720,
    margin: '0 auto',
  },
  eyebrow: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    letterSpacing: '0.22em',
    color: 'var(--brass-deep)',
    textTransform: 'uppercase',
    fontWeight: 700,
    margin: '0 0 12px',
  },
  h1: {
    fontFamily: 'var(--font-display)',
    fontSize: 'clamp(2rem, 6vw, 3.5rem)',
    margin: '0 0 8px',
    lineHeight: 0.95,
    letterSpacing: '0.01em',
    textTransform: 'uppercase',
  },
  meta: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    letterSpacing: '0.16em',
    color: 'var(--ink-45)',
    textTransform: 'uppercase',
    fontWeight: 700,
    margin: '0 0 32px',
  },
  errorBox: {
    margin: '16px 0',
    padding: '14px 16px',
    background: 'var(--paper)',
    border: '1.5px solid var(--lose)',
    borderTop: '3px solid var(--lose)',
  },
  errorTitle: {
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    letterSpacing: '0.22em',
    color: 'var(--lose)',
    textTransform: 'uppercase',
    fontWeight: 700,
    margin: '0 0 6px',
  },
  errorBody: {
    fontSize: 13,
    color: 'var(--ink-70)',
    margin: 0,
  },
  section: {
    paddingTop: 24,
    borderTop: '1px solid var(--hair)',
    marginTop: 24,
  },
  h2: {
    fontFamily: 'var(--font-display)',
    fontSize: 18,
    margin: '0 0 14px',
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
  },
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    border: '1.5px solid var(--ink)',
    background: 'var(--paper)',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 18px auto',
    gap: 12,
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px dotted var(--hair)',
    fontSize: 13.5,
  },
  rowLabel: {
    color: 'var(--ink)',
    fontWeight: 600,
  },
  dotOk: {
    color: 'var(--win)',
    fontSize: 18,
    lineHeight: 1,
    textAlign: 'center' as const,
  },
  dotBad: {
    color: 'var(--lose)',
    fontSize: 18,
    lineHeight: 1,
    textAlign: 'center' as const,
  },
  rowState: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: 'var(--ink-70)',
    textAlign: 'right' as const,
  },
  p: {
    fontSize: 14,
    lineHeight: 1.6,
    color: 'var(--ink-70)',
    margin: 0,
  },
  footer: {
    marginTop: 56,
    paddingTop: 24,
    borderTop: '1.5px solid var(--ink)',
    fontFamily: 'var(--font-mono)',
    fontSize: 10.5,
    letterSpacing: '0.18em',
    color: 'var(--ink-45)',
    textTransform: 'uppercase',
    fontWeight: 700,
    textAlign: 'center' as const,
  },
  footerLink: {
    color: 'var(--ink-70)',
    textDecoration: 'none',
  },
};

export default Status;
