import { TICKER_ITEMS } from '@/data/chrome-fixtures';

/**
 * Ticker — scrolling LIVE feed strip on dark navy. Per handoff §Ticker.
 *
 * Desktop: 28px tall, 60s scroll loop.
 * Mobile: 22px tall, 50s scroll loop, slimmer LIVE pill.
 *
 * LIVE pill on the left: red background, white text, blinking dot.
 * Items duplicated in the DOM so the scroll loop never shows a gap.
 *
 * Keyframes `portalTickerScroll` + class `.blink` live in tokens.css.
 */

interface Props {
  variant?: 'desktop' | 'mobile';
}

export function Ticker({ variant = 'desktop' }: Props) {
  const isMobile = variant === 'mobile';
  const height = isMobile ? 22 : 28;
  const animationDuration = isMobile ? '50s' : '60s';
  const pillFontSize = isMobile ? 8.5 : 10.5;
  const pillPad = isMobile ? '0 9px' : '0 14px';
  const itemFontSize = isMobile ? 9.5 : 11;
  const itemGap = isMobile ? 24 : 32;
  const dotSize = isMobile ? 5 : 7;

  return (
    <div
      style={{
        background: 'var(--ink-deep)',
        color: 'var(--paper)',
        height,
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {/* LIVE pill */}
      <div
        style={{
          background: 'var(--lose)',
          color: 'var(--paper)',
          padding: pillPad,
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontFamily: 'var(--font-mono)',
          fontSize: pillFontSize,
          fontWeight: 700,
          letterSpacing: '0.18em',
          flexShrink: 0,
        }}
      >
        <span
          className="blink"
          style={{
            width: dotSize,
            height: dotSize,
            borderRadius: '50%',
            background: 'var(--paper)',
          }}
        />
        LIVE
      </div>

      {/* scrolling content */}
      <div style={{ flex: 1, height: '100%', overflow: 'hidden', position: 'relative' }}>
        <div
          style={{
            display: 'flex',
            gap: itemGap,
            height: '100%',
            alignItems: 'center',
            fontFamily: 'var(--font-mono)',
            fontSize: itemFontSize,
            paddingLeft: 16,
            whiteSpace: 'nowrap',
            animation: `portalTickerScroll ${animationDuration} linear infinite`,
            width: 'max-content',
          }}
        >
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span
              key={i}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: item.dot,
                  flexShrink: 0,
                }}
              />
              {item.text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Ticker;
