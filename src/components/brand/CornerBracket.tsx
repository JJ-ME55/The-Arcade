/**
 * CornerBracket — L-shaped brass bracket applied at the 4 corners
 * of any "display" surface (vitrines, banking slips, ceremonial
 * panels). Lifted from the design handoff `portal-dashboard-v3.jsx`.
 *
 * Per handoff §Brass Corner Bracket:
 * - Core L stroke: 2.2–2.6px brass-deep, rounded line caps
 * - Glint highlight: 0.7–0.9px brass-glint, offset for sheen
 * - Two brass screw heads at the two ends of the L
 */

export type CornerPos = 'tl' | 'tr' | 'br' | 'bl';

interface Props {
  pos: CornerPos;
  size?: number;
}

const POSITIONS: Record<CornerPos, React.CSSProperties> = {
  tl: { top: -1.5, left: -1.5 },
  tr: { top: -1.5, right: -1.5 },
  bl: { bottom: -1.5, left: -1.5 },
  br: { bottom: -1.5, right: -1.5 },
};

const ROTATIONS: Record<CornerPos, number> = { tl: 0, tr: 90, br: 180, bl: 270 };

export function CornerBracket({ pos, size = 16 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      style={{
        position: 'absolute',
        ...POSITIONS[pos],
        transform: `rotate(${ROTATIONS[pos]}deg)`,
        zIndex: 3,
        pointerEvents: 'none',
      }}
      aria-hidden
    >
      {/* core brass L */}
      <path
        d="M 1.5 13 L 1.5 1.5 L 13 1.5"
        stroke="var(--brass-deep)"
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
      />
      {/* glint highlight */}
      <path
        d="M 2.5 13 L 2.5 2.5 L 13 2.5"
        stroke="var(--brass-glint)"
        strokeWidth="0.7"
        fill="none"
        strokeLinecap="round"
      />
      {/* screw heads */}
      <circle cx="1.5" cy="13" r="1.6" fill="var(--brass)" stroke="var(--brass-deep)" strokeWidth="0.5" />
      <circle cx="13" cy="1.5" r="1.6" fill="var(--brass)" stroke="var(--brass-deep)" strokeWidth="0.5" />
    </svg>
  );
}

export default CornerBracket;
