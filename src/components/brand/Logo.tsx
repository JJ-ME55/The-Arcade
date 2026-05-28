/**
 * Logo — the canonical Arcade lockup.
 *
 * Per design handoff: do not redraw as SVG without designer review.
 * Image lockup at native pixel ratio. Aspect ratio ≈ 5.18:1.
 *
 *   <Logo variant="blue"    height={52} />   default — cream paper marquee
 *   <Logo variant="allblue" height={52} />   on navy / dark backgrounds
 *   <Logo variant="mono"    height={52} />   on cream when blue is too loud
 *   <Logo variant="brass"   height={52} />   ceremonial — certificates, sign-in
 */

export type LogoVariant = 'blue' | 'allblue' | 'mono' | 'brass';

interface LogoProps {
  variant?: LogoVariant;
  height?: number;
  ariaLabel?: string;
}

export function Logo({ variant = 'blue', height = 52, ariaLabel = 'The Arcade' }: LogoProps) {
  return (
    <img
      src={`/assets/brand/arcade-logo-${variant}.png`}
      alt={ariaLabel}
      style={{
        height,
        width: 'auto',
        display: 'block',
        imageRendering: 'auto',
      }}
    />
  );
}

export default Logo;
