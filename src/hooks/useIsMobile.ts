import { useEffect, useState } from 'react';

const MOBILE_BREAKPOINT = 768;

/**
 * useIsMobile — true when viewport <= 768px wide.
 *
 * The chrome (Masthead, FloorStats, Ticker) ships as TWO distinct
 * component trees per the design handoff — different padding,
 * different sizes, different ticker height, different nav layout.
 * This hook picks which tree to render.
 *
 * SSR-safe: defaults to `false` during initial render, syncs on mount.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}

export default useIsMobile;
