import { useEffect } from 'react';
import { useArcadeAuth } from './useAuth';

const API_BASE = import.meta.env.VITE_SOLSHOT_API_BASE;

/**
 * useArcadeSessionMint — for Privy-authed web users, mints a per-game
 * session JWT via the SolShot server (POST /api/arcade/mint-session)
 * and stashes it in sessionStorage so the existing game submit logic
 * picks it up.
 *
 * The lifted games read sessionStorage on game-over to submit scores
 * to /api/games/<slug>/score. Bot users get their JWT from the URL
 * (?session=...). Web users get theirs from this hook.
 *
 * Two storage keys set to cover both naming conventions in the lifted
 * games:
 *   - 'arcade_session'  (basketball, keepie-uppies)
 *   - 'arcadeSession'   (free-kicks)
 *
 * Limitations:
 * - Requires user to have linked their Telegram (server returns 412
 *   tg_not_linked otherwise). Users without linked TG play in free-mode
 *   — game still works, scores aren't submitted.
 * - Skips if sessionStorage already has a JWT (bot users keep theirs).
 *
 * @param {'basketball'|'keepieuppies'|'freekicks'} gameSlug
 */
export function useArcadeSessionMint(gameSlug) {
    const auth = useArcadeAuth();

    useEffect(() => {
        if (!auth.ready || !auth.authenticated || !API_BASE || !gameSlug) return;

        // Bot users already have a JWT from the URL — don't overwrite.
        try {
            if (
                sessionStorage.getItem('arcade_session') ||
                sessionStorage.getItem('arcadeSession')
            ) {
                return;
            }
        } catch {
            return; // sessionStorage unavailable
        }

        let cancelled = false;

        (async () => {
            try {
                const token = await auth.getAccessToken();
                if (!token || cancelled) return;

                const resp = await fetch(
                    `${API_BASE}/api/arcade/mint-session?game=${encodeURIComponent(gameSlug)}`,
                    {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}` },
                    }
                );
                if (cancelled) return;

                if (resp.status === 412) {
                    // tg_not_linked — free-play mode, no submit. Game still works.
                    return;
                }
                if (!resp.ok) return;

                const data = await resp.json();
                if (!data?.session) return;

                try {
                    sessionStorage.setItem('arcade_session', data.session);
                    sessionStorage.setItem('arcadeSession', data.session);
                } catch {
                    /* sessionStorage write failed — silent */
                }
            } catch {
                /* network/parse failure — free-play mode */
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [auth.ready, auth.authenticated, gameSlug]);
}

export default useArcadeSessionMint;
