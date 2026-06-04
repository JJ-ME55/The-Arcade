// @ts-nocheck — JSX-heavy keyframe animation.
import { useEffect, useState } from 'react';

/**
 * Celebration burst — confetti + audio + haptic on new-best moments.
 *
 * Fires when any code dispatches:
 *   window.dispatchEvent(new CustomEvent('arcade:celebrate'))
 *
 * Each game's scene fires the event when its bridge state flips to
 * `arcadeNewBest === true`. Mounted globally in main.tsx so any route
 * gets the effect.
 *
 * What plays:
 *   1. CSS confetti — 24 pieces in brand colours fall from above
 *      the centre with randomised drift + rotation
 *   2. Audio — plays /sounds/new-best.mp3 if the file exists. Graceful
 *      degrade: if the asset is missing, the play() rejects silently
 *      and the animation still runs. Drop the asset whenever.
 *   3. Haptic — navigator.vibrate(200) on mobile. Quiet on desktop.
 *
 * Auto-dismisses after 2.4s — slightly longer than the confetti fall.
 *
 * Throttled: max one burst per 3s so a rapid new-best stream doesn't
 * chain-fire forever.
 */
const PALETTE = [
  '#C8A063', // brass
  '#9B7A4A', // brass-deep
  '#E8C879', // brass-glint
  '#3866C8', // blue
  '#5B86E0', // blue-bright
  '#3F7D38', // win
  '#15203A', // ink (anchors the brightness range)
];

const NUM_PIECES = 28;
const DURATION_MS = 2400;
const THROTTLE_MS = 3000;

export function CelebrationBurst() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    let lastFiredAt = 0;
    const handler = () => {
      const now = Date.now();
      if (now - lastFiredAt < THROTTLE_MS) return;
      lastFiredAt = now;

      setActive(true);

      // Haptic — quiet failure on desktop and platforms without vibrate.
      try { navigator.vibrate?.(180); } catch { /* no-op */ }

      // Audio — graceful: silently fail if file missing or play() blocked.
      try {
        const audio = new Audio('/sounds/new-best.mp3');
        audio.volume = 0.6;
        audio.play().catch(() => { /* asset missing or autoplay blocked */ });
      } catch { /* no-op */ }

      // Auto-dismiss after the animation completes
      setTimeout(() => setActive(false), DURATION_MS);
    };

    window.addEventListener('arcade:celebrate', handler);
    return () => window.removeEventListener('arcade:celebrate', handler);
  }, []);

  if (!active) return null;

  return (
    <>
      <style>{keyframes}</style>
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 9999,
          overflow: 'hidden',
        }}
      >
        {Array.from({ length: NUM_PIECES }).map((_, i) => {
          // Pseudo-random distribution biased to the centre
          const xStart = 50 + (Math.random() - 0.5) * 20; // % from left
          const xEnd = xStart + (Math.random() - 0.5) * 60;
          const delay = Math.random() * 200;
          const duration = 1400 + Math.random() * 700;
          const rotate = Math.random() * 720 - 360;
          const size = 8 + Math.random() * 10;
          const color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
          const shape = i % 3 === 0 ? '50%' : '2px'; // mix circles + rectangles
          return (
            <span
              key={i}
              style={{
                position: 'absolute',
                top: '-20px',
                left: `${xStart}%`,
                width: size,
                height: size * (i % 2 === 0 ? 1 : 1.4),
                background: color,
                borderRadius: shape,
                animation: `arcadeConfettiFall ${duration}ms cubic-bezier(0.3, 0.6, 0.5, 1.0) ${delay}ms forwards`,
                // CSS custom properties so the keyframe can read end-X + rotate
                ['--ax' as any]: `${xEnd - xStart}vw`,
                ['--ar' as any]: `${rotate}deg`,
              }}
            />
          );
        })}
      </div>
    </>
  );
}

const keyframes = `
  @keyframes arcadeConfettiFall {
    0%   { transform: translate(0, 0) rotate(0deg); opacity: 1; }
    80%  { opacity: 1; }
    100% {
      transform: translate(var(--ax, 0), 110vh) rotate(var(--ar, 0deg));
      opacity: 0;
    }
  }
`;

export default CelebrationBurst;
