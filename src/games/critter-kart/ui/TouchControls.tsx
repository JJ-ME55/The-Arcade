// @ts-nocheck
import { useEffect, useRef, useState } from 'react';
import { touchInput, resetTouchInput } from '../game/input/touch';

/**
 * Mobile on-screen controls: an analog thumbstick on the LEFT (steer; pull down to brake) and
 * DRIFT + ITEM buttons on the RIGHT. The kart AUTO-ACCELERATES while these are shown (standard for
 * touch kart games) so you only have to steer + drift + fire. Writes straight into `touchInput`,
 * which the keyboard reader merges, so the game loop needs no changes.
 */
const R = 58; // joystick radius (px)

export function TouchControls() {
  useEffect(() => {
    touchInput.throttle = 1; // auto-gas while mounted (only mounted during a race on touch devices)
    return () => resetTouchInput();
  }, []);

  const baseRef = useRef<HTMLDivElement>(null);
  const padId = useRef<number | null>(null);
  const [thumb, setThumb] = useState({ x: 0, y: 0 });
  const [driftOn, setDriftOn] = useState(false);
  const [itemOn, setItemOn] = useState(false);

  const apply = (e: React.PointerEvent) => {
    const b = baseRef.current!.getBoundingClientRect();
    const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
    let dx = e.clientX - cx, dy = e.clientY - cy;
    const d = Math.hypot(dx, dy) || 1;
    if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R; }
    setThumb({ x: dx, y: dy });
    // DriveInput.steer is "left-positive", so negate: push the stick right → steer right.
    touchInput.steer = Math.max(-1, Math.min(1, -dx / R));
    if (dy > 0.4 * R) { touchInput.throttle = 0; touchInput.brake = 1; } // pull down = brake
    else { touchInput.throttle = 1; touchInput.brake = 0; }
  };
  const padDown = (e: React.PointerEvent) => {
    padId.current = e.pointerId;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    apply(e);
  };
  const padMove = (e: React.PointerEvent) => { if (e.pointerId === padId.current) apply(e); };
  const padUp = (e: React.PointerEvent) => {
    if (e.pointerId !== padId.current) return;
    padId.current = null;
    setThumb({ x: 0, y: 0 });
    touchInput.steer = 0; touchInput.brake = 0; touchInput.throttle = 1;
  };

  const hold = (set: (v: boolean) => void, ui: (v: boolean) => void) => ({
    onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); set(true); ui(true); },
    onPointerUp: () => { set(false); ui(false); },
    onPointerCancel: () => { set(false); ui(false); },
    onLostPointerCapture: () => { set(false); ui(false); },
  });

  const btn = (color: string, active: boolean): React.CSSProperties => ({
    position: 'absolute', width: 92, height: 92, borderRadius: '50%', border: '3px solid rgba(255,255,255,.35)',
    color: '#fff', fontFamily: "'Lilita One', sans-serif", fontSize: 17, letterSpacing: 1,
    background: color, opacity: active ? 1 : 0.82, transform: active ? 'scale(0.92)' : 'none',
    boxShadow: '0 5px 12px rgba(0,0,0,.45)', pointerEvents: 'auto', touchAction: 'none', userSelect: 'none',
    display: 'grid', placeItems: 'center',
  });

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', touchAction: 'none', zIndex: 6 }}>
      {/* analog thumbstick — bottom-left */}
      <div
        ref={baseRef}
        onPointerDown={padDown} onPointerMove={padMove} onPointerUp={padUp} onPointerCancel={padUp}
        style={{
          position: 'absolute', left: 26, bottom: 26, width: R * 2, height: R * 2, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(20,30,50,.5), rgba(20,30,50,.32))',
          border: '2px solid rgba(255,255,255,.3)', pointerEvents: 'auto', touchAction: 'none', userSelect: 'none',
        }}
      >
        <div style={{
          position: 'absolute', left: '50%', top: '50%', width: 58, height: 58, marginLeft: -29, marginTop: -29,
          borderRadius: '50%', background: 'rgba(255,210,63,.9)', boxShadow: '0 3px 8px rgba(0,0,0,.45)',
          transform: `translate(${thumb.x}px, ${thumb.y}px)`,
        }} />
      </div>

      {/* DRIFT + ITEM — bottom-right, above the boost meter */}
      <button {...hold((v) => (touchInput.drift = v), setDriftOn)} style={{ ...btn('rgba(47,143,208,.85)', driftOn), right: 132, bottom: 120 }}>DRIFT</button>
      <button {...hold((v) => (touchInput.use = v), setItemOn)} style={{ ...btn('rgba(214,58,43,.9)', itemOn), right: 26, bottom: 132 }}>ITEM</button>
    </div>
  );
}
