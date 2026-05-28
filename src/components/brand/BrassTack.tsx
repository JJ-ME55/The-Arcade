/**
 * BrassTack — small brass disc with radial gradient, used at the
 * ends of paper shelves and at the top of hang-tag strings.
 *
 * Per handoff §Paper Shelf + Brass Tacks: radial gradient `30% 30%`
 * from brass-glint → brass → brass-deep, 0.5px brass-deep border,
 * 1px ink drop shadow.
 */

interface Props {
  size?: number;
  style?: React.CSSProperties;
}

export function BrassTack({ size = 7, style }: Props) {
  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background:
          'radial-gradient(circle at 30% 30%, var(--brass-glint) 0%, var(--brass) 55%, var(--brass-deep) 100%)',
        border: '0.5px solid var(--brass-deep)',
        boxShadow: '0 1px 1px rgba(21, 32, 58, 0.25)',
        zIndex: 2,
        ...style,
      }}
    />
  );
}

export default BrassTack;
