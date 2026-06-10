// @ts-nocheck — JSX-heavy promo strip.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/useIsMobile';
import { LIVE_COMPETITIONS } from '@/data/competitions-fixtures';
import { SolanaPortal } from '@/components/brand/SolanaPortal';

/**
 * CompetitionBanner — the live-prize hook, pinned to the top of the
 * dashboard. Before this, the only signal that a real 1 SOL competition
 * was running lived in the scrolling ticker (visible ~10% of the time)
 * and a nav item — so trailer/X traffic landing on /play missed it
 * entirely. This makes it the first thing on the floor.
 *
 * Renders nothing when no competition is live (data-driven off
 * LIVE_COMPETITIONS), so it self-removes when the comp closes.
 *
 * Brand: ink-deep marquee (it's a headline moment), brass for the prize
 * (money = brass rule), green LIVE tick, cobalt-bright CTA. The whole
 * strip is clickable → /competitions.
 */
export function CompetitionBanner() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const comp = LIVE_COMPETITIONS[0];
  const remaining = useCountdown(comp?.closes);

  if (!comp) return null;

  return (
    <button
      type="button"
      onClick={() => navigate('/competitions')}
      style={{
        appearance: 'none',
        textAlign: 'left',
        cursor: 'pointer',
        width: '100%',
        background: 'linear-gradient(90deg, var(--ink-deep) 0%, var(--ink) 60%, var(--ink-rich) 100%)',
        color: 'var(--paper)',
        border: '1.5px solid var(--ink)',
        borderLeft: '4px solid var(--brass)',
        padding: isMobile ? '12px 14px' : '14px 22px',
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? 10 : 18,
        flexWrap: 'wrap',
      }}
    >
      {/* LIVE tick */}
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.20em',
          color: 'var(--win)',
          flexShrink: 0,
        }}
      >
        <span
          className="blink"
          style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--win)' }}
        />
        LIVE
      </span>

      {/* Prize + what */}
      <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 10, flex: 1, minWidth: 0, flexWrap: 'wrap' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            fontFamily: 'var(--font-display)',
            fontSize: isMobile ? 17 : 20,
            letterSpacing: '0.01em',
            textTransform: 'uppercase',
            color: 'var(--brass-glint)',
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}
        >
          <SolanaPortal size={isMobile ? 15 : 17} gradId="comp-banner-sol" />
          Win {comp.prize}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: isMobile ? 12.5 : 14,
            color: 'rgba(251,252,254,0.78)',
            whiteSpace: 'nowrap',
          }}
        >
          Top the Free Kicks board
        </span>
      </span>

      {/* Countdown */}
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontFamily: 'var(--font-mono)',
          fontSize: isMobile ? 10 : 11,
          fontWeight: 700,
          letterSpacing: '0.10em',
          color: 'rgba(251,252,254,0.62)',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 8.5, letterSpacing: '0.18em', color: 'var(--ink-45)' }}>CLOSES</span>
        <span style={{ color: 'var(--paper)' }}>{remaining}</span>
      </span>

      {/* CTA */}
      <span
        style={{
          flexShrink: 0,
          padding: isMobile ? '7px 14px' : '9px 18px',
          background: 'var(--brass)',
          color: 'var(--ink-deep)',
          fontFamily: 'var(--font-mono)',
          fontSize: isMobile ? 9.5 : 10,
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
        }}
      >
        Enter →
      </span>
    </button>
  );
}

/* Live countdown — "19d 4h" / "13h 22m" / "47m" / "Closing" near zero. */
function useCountdown(iso?: string): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!iso) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [iso]);
  if (!iso) return '—';
  const targetMs = Date.parse(iso);
  if (Number.isNaN(targetMs)) return '—';
  const delta = targetMs - now;
  if (delta <= 0) return 'Closing';
  const s = Math.floor(delta / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default CompetitionBanner;
