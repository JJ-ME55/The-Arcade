import { useEffect } from 'react';
import { useArcadeAuth } from './useAuth';

const API_BASE = import.meta.env.VITE_SOLSHOT_API_BASE;
const REGISTERED_FLAG = 'arcade_registered';

/**
 * useArcadeRegister — fires once per session on the first authenticated
 * page-load. Calls POST /api/arcade/register with the user's Privy
 * access token. The server upserts a User doc keyed on the Privy DID.
 *
 * Closes the orphan-arcade-user gap: users who sign in via Privy on
 * the arcade hub but never touched SolShot would otherwise have no
 * User doc at all. With register seeded, when they later link their
 * Telegram (via SolShot's /link command), the linkage targets their
 * existing doc rather than creating an orphan.
 *
 * No-op if:
 * - Privy not configured (no app ID)
 * - Not authenticated yet
 * - Already registered this session (sessionStorage flag)
 *
 * Mount this once in a high-level component (RequireAuth) so it runs
 * on the first authed route visit.
 */
export function useArcadeRegister() {
    const auth = useArcadeAuth();

    useEffect(() => {
        if (!auth.ready || !auth.authenticated || !API_BASE) return;

        try {
            if (sessionStorage.getItem(REGISTERED_FLAG) === '1') return;
        } catch {
            return; // sessionStorage unavailable
        }

        let cancelled = false;

        (async () => {
            try {
                const token = await auth.getAccessToken();
                if (!token || cancelled) return;

                const resp = await fetch(`${API_BASE}/api/arcade/register`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });
                if (cancelled) return;

                if (resp.ok) {
                    try {
                        sessionStorage.setItem(REGISTERED_FLAG, '1');
                    } catch {
                        /* sessionStorage write failed — will retry next page-load, not fatal */
                    }
                }
            } catch {
                /* network/parse failure — will retry next session */
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [auth.ready, auth.authenticated]);
}

export default useArcadeRegister;
