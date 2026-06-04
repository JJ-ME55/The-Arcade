// @ts-nocheck
import type { Item } from './data';

const W = '#fff';

export function ItemGlyph({ id }: { id: string }) {
  switch (id) {
    case 'berry':
      return (
        <g>
          <circle cx="19" cy="30" r="10.5" fill={W} />
          <circle cx="30" cy="31" r="8.5" fill={W} />
          <path d="M22 16 q6 -7 13 -5 q-2 7 -9 8 z" fill={W} />
          <rect x="21" y="13" width="3" height="7" rx="1.5" fill={W} transform="rotate(18 22 16)" />
        </g>
      );
    case 'acorn':
      return (
        <g>
          <path d="M14 24 q0 16 10 16 q10 0 10 -16 z" fill={W} />
          <path d="M12 24 q12 -9 24 0 q0 -7 -12 -7 q-12 0 -12 7 z" fill={W} />
          <rect x="22.5" y="7" width="3" height="7" rx="1.5" fill={W} />
        </g>
      );
    case 'bee':
      return (
        <g>
          <ellipse cx="26" cy="27" rx="13" ry="9.5" fill={W} />
          <rect x="20" y="18.5" width="3.4" height="17.5" rx="1.5" fill="#b88f00" transform="rotate(-12 21.7 27)" />
          <rect x="28" y="18.5" width="3.4" height="17.5" rx="1.5" fill="#b88f00" transform="rotate(-12 29.7 27)" />
          <ellipse cx="15" cy="17" rx="6" ry="4" fill={W} transform="rotate(-28 15 17)" opacity="0.92" />
          <ellipse cx="23" cy="14" rx="5" ry="3.4" fill={W} transform="rotate(-12 23 14)" opacity="0.92" />
        </g>
      );
    case 'mud':
      return (
        <g>
          <ellipse cx="24" cy="32" rx="17" ry="8" fill={W} />
          <circle cx="14" cy="20" r="4" fill={W} />
          <circle cx="33" cy="17" r="5.5" fill={W} />
          <circle cx="24" cy="24" r="3" fill={W} />
        </g>
      );
    case 'leaf':
      return (
        <g>
          <path d="M24 7 L40 13 V26 q0 13 -16 15 q-16 -2 -16 -15 V13 z" fill={W} />
          <path d="M24 13 V35" stroke="#1f8f2e" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M24 20 L31 16 M24 26 L31 22 M24 20 L17 16 M24 26 L17 22" stroke="#1f8f2e" strokeWidth="2.1" strokeLinecap="round" />
        </g>
      );
    case 'storm':
      return (
        <g>
          <path d="M14 28 a8 8 0 0 1 1 -16 a9 9 0 0 1 17 -1 a7 7 0 0 1 2 17 z" fill={W} />
          <path d="M16 33 l-2 7 M24 33 l-2 7 M32 33 l-2 7" stroke={W} strokeWidth="3" strokeLinecap="round" />
        </g>
      );
    default:
      return <circle cx="24" cy="24" r="12" fill={W} />;
  }
}

export function TypeBadge({ kind, size = 20 }: { kind: 'atk' | 'def'; size?: number }) {
  const isAtk = kind === 'atk';
  return (
    <div style={{ width: size, height: size, borderRadius: 999, display: 'grid', placeItems: 'center', background: isAtk ? '#ffd400' : '#2bd4ff', boxShadow: '0 0 0 2.5px var(--panel-solid), 0 2px 4px rgba(0,0,0,.4)' }}>
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24">
        {isAtk ? <path d="M13 2 L4 14 h6 l-2 8 9 -12 h-6 z" fill="#7a4b00" /> : <path d="M12 2 L20 5 v7 q0 7 -8 10 q-8 -3 -8 -10 V5 z" fill="#055e7a" />}
      </svg>
    </div>
  );
}

export function ItemIcon({ item, size = 64, badge = true, glow = false }: { item: Item; size?: number; badge?: boolean; glow?: boolean }) {
  const pad = size * 0.16;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '28%',
          background: `radial-gradient(120% 120% at 30% 22%, ${tint(item.color, 0.35)} 0%, ${item.color} 55%, ${shade(item.color, 0.22)} 100%)`,
          display: 'grid',
          placeItems: 'center',
          boxShadow: glow
            ? `0 0 0 2px rgba(255,255,255,.25) inset, 0 6px 0 ${shade(item.color, 0.35)}, 0 0 26px ${item.color}aa`
            : `0 0 0 2px rgba(255,255,255,.25) inset, 0 5px 0 ${shade(item.color, 0.35)}`,
        }}
      >
        <svg width={size - pad * 2} height={size - pad * 2} viewBox="0 0 48 48" style={{ filter: 'drop-shadow(0 1.5px 0 rgba(0,0,0,.25))' }}>
          <ItemGlyph id={item.id} />
        </svg>
      </div>
      {badge && item.badge && (
        <div style={{ position: 'absolute', right: -size * 0.05, bottom: -size * 0.05 }}>
          <TypeBadge kind={item.badge} size={size * 0.34} />
        </div>
      )}
    </div>
  );
}

export function ClassIcon({ classId, size = 22, color = '#fff' }: { classId: string; size?: number; color?: string }) {
  const shapes: Record<string, JSX.Element> = {
    all: <circle cx="12" cy="12" r="8" fill="none" stroke={color} strokeWidth="2.6" />,
    heavy: <path d="M12 3 L21 12 L12 21 L3 12 Z" fill="none" stroke={color} strokeWidth="2.6" strokeLinejoin="round" />,
    light: <path d="M12 4 L20 19 L4 19 Z" fill="none" stroke={color} strokeWidth="2.6" strokeLinejoin="round" />,
    tank: <path d="M8 4 H16 L21 12 L16 20 H8 L3 12 Z" fill="none" stroke={color} strokeWidth="2.6" strokeLinejoin="round" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24">{shapes[classId] || shapes.all}</svg>;
}

function hexToRgb(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function tint(hex: string, amt: number): string {
  const [r, g, b] = hexToRgb(hex);
  const m = (v: number) => Math.round(v + (255 - v) * amt);
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}
export function shade(hex: string, amt: number): string {
  const [r, g, b] = hexToRgb(hex);
  const m = (v: number) => Math.round(v * (1 - amt));
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}
