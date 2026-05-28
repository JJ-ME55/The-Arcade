import type { ReactNode } from 'react';
import { CornerBracket } from './CornerBracket';

/**
 * Vitrine — display case for prize-counter shelves and any other
 * "encased" surface. Per handoff §Vitrine.
 *
 * Outer: 1.5px ink border, 3px ink bottom border (weighted base),
 * paper bg. Inset glass shadow + 36px top glass sheen.
 *
 * `caseLabel` shows centered at the top inner edge in tiny mono:
 *   · SOLSHOT · DISPLAY ·
 */

interface Props {
  children: ReactNode;
  caseLabel?: string;
  padding?: string;
}

export function Vitrine({
  children,
  caseLabel,
  padding = '24px 24px 20px',
}: Props) {
  return (
    <div
      style={{
        position: 'relative',
        background: 'var(--paper)',
        border: '1.5px solid var(--ink)',
        borderBottom: '3px solid var(--ink)',
        padding,
        boxShadow:
          'inset 0 12px 16px -12px rgba(21, 32, 58, 0.16), 0 2px 4px rgba(21, 32, 58, 0.05)',
      }}
    >
      {/* glass sheen */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 1,
          left: 1,
          right: 1,
          height: 36,
          background:
            'linear-gradient(180deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0) 100%)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {caseLabel && (
        <div
          style={{
            position: 'absolute',
            top: 4,
            left: '50%',
            transform: 'translateX(-50%)',
            fontFamily: 'var(--font-mono)',
            fontSize: 8,
            letterSpacing: '0.32em',
            color: 'var(--ink-45)',
            fontWeight: 700,
            zIndex: 2,
            whiteSpace: 'nowrap',
          }}
        >
          {caseLabel}
        </div>
      )}

      <CornerBracket pos="tl" />
      <CornerBracket pos="tr" />
      <CornerBracket pos="bl" />
      <CornerBracket pos="br" />

      <div style={{ position: 'relative', zIndex: 2 }}>{children}</div>
    </div>
  );
}

export default Vitrine;
