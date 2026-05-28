import { Outlet } from 'react-router-dom';

/**
 * RequireAuth — route guard.
 *
 * Privy login is currently DISABLED. All routes pass through; no
 * auth check, no register hook fires. To re-enable Privy gating,
 * restore the prior version (uses useArcadeAuth + useArcadeRegister
 * + Navigate-to-/ on unauthenticated).
 */
export function RequireAuth() {
  return <Outlet />;
}
