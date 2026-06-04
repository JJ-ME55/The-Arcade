// @ts-nocheck
import type { ReactNode } from 'react';
import { tint, shade } from './icons';

export function Wordmark({ variant = 'speed', scale = 1, accent = '#ffb22e' }: { variant?: string; scale?: number; accent?: string }) {
  const base: React.CSSProperties = {
    fontFamily: "'Lilita One', sans-serif",
    textTransform: 'uppercase',
    lineHeight: 0.82,
    WebkitTextStroke: `${9 * scale}px var(--ink)`,
    paintOrder: 'stroke fill',
    color: accent,
    filter: 'drop-shadow(0 10px 0 rgba(0,0,0,.25))',
    display: 'inline-block',
  } as React.CSSProperties;
  const skew = variant === 'speed' ? 'skewX(-8deg)' : 'none';
  const l1 = 96 * scale;
  const l2 = 132 * scale;

  if (variant === 'bubbly') {
    return (
      <div style={{ textAlign: 'center', transform: skew }}>
        <div style={{ ...base, fontSize: l1, color: accent, letterSpacing: 2 }}>Critter</div>
        <div style={{ ...base, fontSize: l2, color: '#fff', WebkitTextStroke: `${10 * scale}px var(--ink)`, marginTop: -10 * scale }}>Kart</div>
      </div>
    );
  }
  return (
    <div style={{ textAlign: 'center', position: 'relative', transform: skew }}>
      <div style={{ ...base, fontSize: l1, letterSpacing: 3 }}>Critter</div>
      <div style={{ ...base, fontSize: l2, marginTop: -14 * scale, letterSpacing: 1 }}>Kart</div>
      {variant === 'speed' && (
        <div style={{ position: 'absolute', left: -46 * scale, top: '30%', display: 'grid', gap: 7 * scale }}>
          {[34, 26, 18].map((w, i) => (
            <div key={i} style={{ width: w * scale, height: 8 * scale, borderRadius: 99, background: 'var(--ink)', opacity: 0.85 }} />
          ))}
        </div>
      )}
    </div>
  );
}

export function Balloon({ color, size = 44, x, y, delay = 0 }: { color: string; size?: number; x: number; y: number; delay?: number }) {
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: size, animation: `floaty 4s ease-in-out ${delay}s infinite` }}>
      <div style={{ width: size, height: size * 1.12, borderRadius: '50%', background: `radial-gradient(120% 120% at 32% 26%, ${tint(color, 0.45)}, ${color} 60%, ${shade(color, 0.2)})`, boxShadow: 'inset 0 0 0 2px rgba(255,255,255,.2), 0 8px 18px rgba(0,0,0,.22)' }} />
      <div style={{ width: 2, height: size * 0.7, background: 'rgba(255,255,255,.5)', margin: '0 auto' }} />
    </div>
  );
}

export function StripePlaceholder({ label, color = '#9fb3d1', radius = 16, style = {} }: { label: string; color?: string; radius?: number; style?: React.CSSProperties }) {
  return (
    <div style={{ position: 'relative', borderRadius: radius, overflow: 'hidden', background: `repeating-linear-gradient(45deg, ${color}22 0 10px, ${color}11 10px 20px)`, border: `2px dashed ${color}66`, display: 'grid', placeItems: 'center', ...style }}>
      <span style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11, letterSpacing: 0.5, color, opacity: 0.9, textAlign: 'center', padding: '4px 8px' }}>{label}</span>
    </div>
  );
}

export function StatBar({ label, value, color = 'var(--accent)' }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr', alignItems: 'center', gap: 10 }}>
      <span style={{ fontFamily: 'Nunito', fontWeight: 800, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase', color: 'var(--muted)' }}>{label}</span>
      <div style={{ display: 'flex', gap: 4 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <div key={n} style={{ flex: 1, height: 9, borderRadius: 3, background: n <= value ? color : 'rgba(255,255,255,.13)', boxShadow: n <= value ? `0 0 8px ${color}66` : 'none', transition: 'background .25s' }} />
        ))}
      </div>
    </div>
  );
}

export function Medal({ pos, size = 46 }: { pos: number; size?: number }) {
  const colors: Record<number, [string, string]> = { 1: ['#ffd75e', '#e8a200'], 2: ['#d6dde6', '#9aa6b4'], 3: ['#e09a5a', '#b06a2c'] };
  const [a, b] = colors[pos] || ['#5b6e8c', '#3a4a64'];
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', display: 'grid', placeItems: 'center', background: `radial-gradient(120% 120% at 32% 26%, ${a}, ${b})`, boxShadow: `inset 0 0 0 3px rgba(255,255,255,.25), 0 4px 0 ${b}`, fontFamily: "'Lilita One', sans-serif", fontSize: size * 0.46, color: '#fff', WebkitTextStroke: '2px rgba(0,0,0,.25)', paintOrder: 'stroke fill' } as React.CSSProperties}>{pos}</div>
  );
}

export function KeyCap({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <span style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: 13, color: 'var(--paper)', minWidth: wide ? 'auto' : 26, padding: wide ? '5px 10px' : '5px 0', textAlign: 'center', display: 'inline-grid', placeItems: 'center', background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.22)', borderRadius: 7, boxShadow: '0 2px 0 rgba(0,0,0,.35)' }}>{children}</span>
  );
}
