import { BrassTack } from './BrassTack';

/**
 * PaperShelf — the cream-paper edge with a brass tack at each end.
 * Used inside Vitrines to "rest" prizes / cabinets on a horizontal
 * line. Per handoff §Paper Shelf + Brass Tacks.
 *
 *   - 3px paper strip with 1px ink-solid top border
 *   - Soft drop shadow
 *   - Brass tack extending slightly past each end
 *
 * Render this AS A POSITIONED CHILD of a relative parent (the
 * shelf needs to extend past the parent's padding via `left/right`
 * negatives). Items sit ABOVE the shelf via positive z-index.
 */

interface Props {
  /** Distance from the parent's bottom edge to the shelf line. */
  bottom?: number;
  /** How far the shelf overhangs past the parent (negative inset). */
  overhang?: number;
}

export function PaperShelf({ bottom = 40, overhang = 4 }: Props) {
  return (
    <div
      style={{
        position: 'absolute',
        left: -overhang,
        right: -overhang,
        bottom,
        height: 3,
        background: 'var(--paper)',
        borderTop: '1px solid var(--ink)',
        boxShadow:
          '0 1px 0 rgba(21, 32, 58, 0.18), 0 4px 6px -2px rgba(21, 32, 58, 0.10)',
        zIndex: 1,
      }}
      aria-hidden
    >
      <BrassTack
        size={9}
        style={{ position: 'absolute', left: -3, top: -3 }}
      />
      <BrassTack
        size={9}
        style={{ position: 'absolute', right: -3, top: -3 }}
      />
    </div>
  );
}

export default PaperShelf;
