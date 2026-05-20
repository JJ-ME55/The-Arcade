import { useEffect, useState } from 'react';
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
 * Returns { status } so the caller can render UI based on outcome:
 *   - 'idle'           — pre-Privy, pre-mount, or skipped
 *   - 'has_session'    — sessionStorage already has a JWT (bot user)
 *   - 'minting'        — fetch in flight
 *   - 'ok'             — session minted, scores will submit
 *   - 'tg_not_linked'  — 412 from server, user needs to link TG (free-play)
 *   - 'error'          — network/server failure (free-play)
 *
 * @param {'basketball'|'keepieuppies'|'freekicks'} gameSlug
 * @returns {{ status: 'idle' | 'has_session' | 'minting' | 'ok' | 'tg_not_linked' | 'error' }}
 */
export function useArcadeSessionMint(gameSlug) {
    const auth = useArcadeAuth();
    const [status, setStatus] = useState('idle');

    useEffect(() => {
        if (!auth.ready || !auth.authenticated || !API_BASE || !gameSlug) return;

        // Bot users already have a JWT from the URL — don't overwrite.
        try {
            if (
                sessionStorage.getItem('arcade_session') ||
                sessionStorage.getItem('arcadeSession')
            ) {
                setStatus('has_session');
                return;
            }
        } catch {
            return; // sessionStorage unavailable
        }

        let cancelled = false;
        setStatus('minting');

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
                    setStatus('tg_not_linked');
                    return;
                }
                if (!resp.ok) {
                    setStatus('error');
                    return;
                }

                const data = await resp.json();
                if (!data?.session) {
                    setStatus('error');
                    return;
                }

                try {
                    sessionStorage.setItem('arcade_session', data.session);
                    sessionStorage.setItem('arcadeSession', data.session);
                    setStatus('ok');
                } catch {
                    setStatus('error');
                }
            } catch {
                if (!cancelled) setStatus('error');
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [auth.ready, auth.authenticated, gameSlug]);

    return { status };
}

export default useArcadeSessionMint;
