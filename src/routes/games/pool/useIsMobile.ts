import { useEffect, useState } from 'react';

/**
 * useIsMobile — tracks viewport width and returns true when below the
 * Side Pocket mobile breakpoint (700px). The Round 2 designer scales
 * each screen via a --u CSS variable controlled by a `mob` / `web`
 * class on the screen root; this hook drives that class.
 */
export function useIsMobile(breakpoint = 700): boolean {
    const [isMobile, setIsMobile] = useState(() =>
        typeof window !== 'undefined' && window.innerWidth < breakpoint
    );

    useEffect(() => {
        const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, [breakpoint]);

    return isMobile;
}
