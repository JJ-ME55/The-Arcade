/**
 * TicketGlyph — ticket-stub silhouette with perforation line.
 * Used in prize counter price tags, TKT chip in the balance lockup,
 * and yield indicators. Per handoff §TicketGlyph.
 *
 * Defaults to ink color. Pass `color="var(--brass-deep)"` for the
 * brass-toned variant used in the TKT chip.
 */

interface Props {
  size?: number;
  color?: string;
}

export function TicketGlyph({ size = 14, color = 'var(--ink)' }: Props) {
  return (
    <svg
      width={size * 1.4}
      height={size}
      viewBox="0 0 28 20"
      style={{ flexShrink: 0 }}
      aria-hidden
    >
      <path
        d="M2 4 H 11 a 2 2 0 0 0 0 12 H 2 Z M14 4 H 26 V 16 H 14 a 2 2 0 0 1 0 -12 Z"
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <line
        x1="12.5"
        y1="6"
        x2="12.5"
        y2="14"
        stroke={color}
        strokeWidth="1.2"
        strokeDasharray="1.5 1.5"
      />
    </svg>
  );
}

export default TicketGlyph;
