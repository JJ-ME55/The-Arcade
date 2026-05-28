/**
 * PrizeIcon — small SVG glyph for prize-counter items. Three kinds:
 *
 *   hull — tank hull (SolShot prizes)
 *   ball — basketball
 *   cue  — billiard cue OR football boot (placeholder for both)
 *
 * Lifted from portal-desktop.jsx PrizeIcon — same paths. Color is
 * the rarity dot color (win/blue/brass-deep/lose for common/uncommon/
 * rare/legend).
 */

export type PrizeKind = 'hull' | 'ball' | 'cue';

interface Props {
  kind: PrizeKind;
  color?: string;
  size?: number;
}

export function PrizeIcon({ kind, color = 'var(--ink)', size = 22 }: Props) {
  const view = 24;
  if (kind === 'hull') {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${view} ${view}`} aria-hidden>
        <rect x="3" y="11" width="18" height="6" rx="1" fill={color} stroke="var(--ink)" strokeWidth="1.5" />
        <path d="M7 11 V 7 H 17 V 11" stroke="var(--ink)" strokeWidth="1.5" fill={color} strokeLinejoin="round" />
        <path d="M17 9 L 22 9" stroke="var(--ink)" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="7" cy="18" r="1.5" fill="var(--ink)" />
        <circle cx="12" cy="18" r="1.5" fill="var(--ink)" />
        <circle cx="17" cy="18" r="1.5" fill="var(--ink)" />
      </svg>
    );
  }
  if (kind === 'ball') {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${view} ${view}`} aria-hidden>
        <circle cx="12" cy="12" r="8" fill={color} stroke="var(--ink)" strokeWidth="1.5" />
        <path
          d="M4 12 Q 12 8 20 12 M4 12 Q 12 16 20 12 M12 4 Q 8 12 12 20 M12 4 Q 16 12 12 20"
          stroke="var(--ink)"
          strokeWidth="1"
          fill="none"
        />
      </svg>
    );
  }
  // cue / boot
  return (
    <svg width={size} height={size} viewBox={`0 0 ${view} ${view}`} aria-hidden>
      <path d="M3 21 L 18 6" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <path d="M3 21 L 18 6" stroke="var(--ink)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <circle cx="19" cy="5" r="2.5" fill="var(--paper)" stroke="var(--ink)" strokeWidth="1.5" />
    </svg>
  );
}

export default PrizeIcon;
