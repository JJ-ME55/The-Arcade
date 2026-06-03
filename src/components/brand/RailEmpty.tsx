/**
 * RailEmpty — shared empty-state for sidebar rails when a fixture is
 * intentionally empty (Live Wagers V1, Friends graph V2, Inventory V3
 * etc.). Keeps the brand register without dropping mocked liquidity.
 *
 * Centred mono caps in ink-45 with brand "· text ·" rhythm.
 */
interface Props {
  /** Empty-state copy. Component wraps it with bullet rhythm. */
  text: string;
  /** Vertical padding override (default 20px). */
  pad?: number;
}

export function RailEmpty({ text, pad = 20 }: Props) {
  return (
    <div
      style={{
        padding: `${pad}px 8px`,
        textAlign: 'center',
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        letterSpacing: '0.18em',
        color: 'var(--ink-45)',
        textTransform: 'uppercase',
        fontWeight: 700,
      }}
    >
      {text}
    </div>
  );
}

export default RailEmpty;
