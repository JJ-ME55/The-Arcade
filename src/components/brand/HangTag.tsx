import type { ReactNode } from 'react';
import { BrassTack } from './BrassTack';

/**
 * HangTag — paper card dangling on a string from a brass pin.
 * Used for prize-counter price tags. Per handoff §Hang Tag.
 *
 * Anatomy:
 *   - Brass pin (small tack, 6px) on the shelf line above
 *   - 1px ink string, 10–22px long
 *   - Paper card with 1.5px ink border, 4–6px padding
 *   - Punch hole (4–5px ink disc at top of card where string meets)
 *   - Rotation: -3° default, -2° if `soon` flag set
 *   - Shadow: 2px 2px 0 rgba(21,32,58,0.08)
 */

interface Props {
  children: ReactNode;
  /** String length in px. */
  stringLength?: number;
  /** Subtle rotation tweak — `-2°` for non-soon items, `-3°` default. */
  soon?: boolean;
  /** Horizontal offset of the pin from the parent's left edge (default centered via 50%). */
  pinLeft?: number | string;
  /** Absolute position from the shelf top. Required for layout. */
  top?: number;
}

export function HangTag({
  children,
  stringLength = 14,
  soon = false,
  pinLeft = '50%',
  top = 0,
}: Props) {
  const rotation = soon ? -2 : -3;
  return (
    <div
      style={{
        position: 'absolute',
        top,
        left: pinLeft,
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pointerEvents: 'none',
      }}
      aria-hidden
    >
      {/* pin on the shelf */}
      <BrassTack size={6} />

      {/* string */}
      <div
        style={{
          width: 1,
          height: stringLength,
          background: 'var(--ink)',
        }}
      />

      {/* tag with punch hole */}
      <div
        style={{
          position: 'relative',
          background: 'var(--paper)',
          border: '1.5px solid var(--ink)',
          padding: '4px 6px',
          transform: `rotate(${rotation}deg)`,
          boxShadow: '2px 2px 0 rgba(21, 32, 58, 0.08)',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--ink)',
          pointerEvents: 'auto',
          whiteSpace: 'nowrap',
        }}
      >
        {/* punch hole */}
        <div
          style={{
            position: 'absolute',
            top: -3,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 4,
            height: 4,
            borderRadius: '50%',
            background: 'var(--ink)',
          }}
        />
        {children}
      </div>
    </div>
  );
}

export default HangTag;
