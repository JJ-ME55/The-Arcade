/**
 * SolanaPortal — 3-bar Solana logomark with the canonical
 * purple→teal gradient. Used in balance chips, "on Solana"
 * cues, and the Solana column in vitrines/games-served-here labels.
 *
 * Lifted from the design handoff `portal.jsx`.
 */

interface Props {
  size?: number;
  /** Unique id suffix in case multiple SolanaPortals render on the same page. */
  gradId?: string;
}

export function SolanaPortal({ size = 12, gradId = 'sol' }: Props) {
  const id = `solGrad-${gradId}`;
  return (
    <svg
      width={size * 1.15}
      height={size}
      viewBox="0 0 23 20"
      style={{ flexShrink: 0 }}
      aria-hidden
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9945FF" />
          <stop offset="1" stopColor="#14F195" />
        </linearGradient>
      </defs>
      <path d="M4,4 L19,4 L21,2 L6,2 Z" fill={`url(#${id})`} />
      <path d="M4,11 L19,11 L21,9 L6,9 Z" fill={`url(#${id})`} />
      <path d="M4,18 L19,18 L21,16 L6,16 Z" fill={`url(#${id})`} />
    </svg>
  );
}

export default SolanaPortal;
