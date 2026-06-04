// @ts-nocheck
import { useEffect, useState, type ReactNode } from 'react';

export const STAGE_W = 1280;
export const STAGE_H = 720;

function useFitScale() {
  const [s, setS] = useState(1);
  useEffect(() => {
    const f = () => setS(Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H));
    f();
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, []);
  return s;
}

/**
 * A screen frame: the `background` fills the whole window, while `children`
 * (the 1280x720 design content) is scaled to FIT and centered — so the page
 * always fills the window AND nothing is ever cropped.
 */
export function Frame({ background, children }: { background: ReactNode; children: ReactNode }) {
  const scale = useFitScale();
  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
      {background}
      <div style={{ position: 'absolute', left: '50%', top: '50%', width: STAGE_W, height: STAGE_H, transform: `translate(-50%,-50%) scale(${scale})`, transformOrigin: 'center center' }}>{children}</div>
    </div>
  );
}

/**
 * Renders a fixed 1280x720 "stage" scaled to fit the viewport (letterboxed),
 * so the pixel-accurate UI design works at any window size. Pass transparent
 * for the in-race HUD overlay (no backdrop, clicks pass through except on
 * interactive children).
 */
export function Stage({ children, transparent = false, mode = 'fit' }: { children: ReactNode; transparent?: boolean; mode?: 'fit' | 'cover' }) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const compute = () => {
      const sx = window.innerWidth / STAGE_W;
      const sy = window.innerHeight / STAGE_H;
      setScale(mode === 'cover' ? Math.max(sx, sy) : Math.min(sx, sy));
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [mode]);
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        background: transparent ? 'transparent' : 'radial-gradient(120% 90% at 50% -10%, #11233f 0%, #07101f 60%, #050a14 100%)',
        pointerEvents: transparent ? 'none' : 'auto',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'relative', width: STAGE_W, height: STAGE_H, transform: `scale(${scale})`, transformOrigin: 'center center' }}>{children}</div>
    </div>
  );
}
