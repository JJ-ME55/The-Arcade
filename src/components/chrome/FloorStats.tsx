import { FLOOR_STATS, FLOOR_STATS_MOBILE, type FloorStat } from '@/data/chrome-fixtures';

const TONE_TO_COLOR: Record<FloorStat['tone'], string> = {
  ink: 'var(--ink)',
  blue: 'var(--blue)',
  brass: 'var(--brass-deep)',
  win: 'var(--win)',
};

/**
 * FloorStats — desktop strip below the masthead. 32px tall, cream
 * paper, hairline bottom border. Per handoff §Floor Stats Strip.
 *
 * Tone colors: blue for live state, brass for money, win for wins,
 * ink for primary stats. Mono 9/700 uppercase label + 11/700
 * colored value.
 */
export function FloorStats() {
  return (
    <div
      style={{
        background: 'var(--paper)',
        borderBottom: '1px solid var(--hair)',
        height: 32,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        padding: '0 36px',
        gap: 28,
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          letterSpacing: '0.22em',
          color: 'var(--ink-45)',
          fontWeight: 700,
          textTransform: 'uppercase',
        }}
      >
        The Floor · Now
      </span>
      <div style={{ width: 1, height: 14, background: 'var(--hair)' }} />
      {FLOOR_STATS.map((s) => (
        <span
          key={s.label}
          style={{
            display: 'inline-flex',
            alignItems: 'baseline',
            gap: 6,
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
          }}
        >
          <span
            style={{
              fontSize: 9,
              color: 'var(--ink-45)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              fontWeight: 700,
            }}
          >
            {s.label}
          </span>
          <span
            style={{
              fontWeight: 700,
              color: TONE_TO_COLOR[s.tone],
              letterSpacing: '0.02em',
            }}
          >
            {s.value}
          </span>
        </span>
      ))}
    </div>
  );
}

/**
 * FloorStatsMobile — 24px scrollable mobile variant. 4 stats visible.
 */
export function FloorStatsMobile() {
  return (
    <div
      style={{
        background: 'var(--paper)',
        borderBottom: '1px solid var(--hair)',
        height: 24,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        padding: '0 14px',
        gap: 14,
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {FLOOR_STATS_MOBILE.map((s) => (
        <span
          key={s.label}
          style={{
            display: 'inline-flex',
            alignItems: 'baseline',
            gap: 5,
            fontFamily: 'var(--font-mono)',
            fontSize: 9.5,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 8,
              color: 'var(--ink-45)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              fontWeight: 700,
            }}
          >
            {s.label}
          </span>
          <span
            style={{
              fontWeight: 700,
              color: TONE_TO_COLOR[s.tone],
              letterSpacing: '0.02em',
            }}
          >
            {s.value}
          </span>
        </span>
      ))}
    </div>
  );
}
