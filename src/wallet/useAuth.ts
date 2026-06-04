import { usePrivy, getAccessToken as privyGetAccessToken } from '@privy-io/react-auth';

const PRIVY_ENABLED = Boolean(import.meta.env.VITE_PRIVY_APP_ID);

export interface ArcadeAuth {
  ready: boolean;
  authenticated: boolean;
  /** Human display name — Telegram username preferred, then email
   *  localpart, then wallet tail, else null. */
  callsign: string | null;
  /** Initial used by the masthead signet panel. */
  initial: string | null;
  /** Telegram user id if the account is linked to TG (either via the
   *  initial OAuth login or a later `linkTelegram()` call). null if
   *  Privy account exists but no TG link yet. */
  telegramUserId: number | null;
  /** True if the user signed in via Telegram OAuth OR later linked TG.
   *  False if email/Google/wallet-only — they need to link TG to save
   *  scores in V1 (per the canonical doc §12.2.5 lazy-auth model). */
  hasTelegram: boolean;
  login: () => void;
  logout: () => Promise<void>;
  /** Privy SDK's `linkTelegram()` — opens the TG OAuth flow inline so
   *  email-first users can bind their TG without a full re-sign-in. */
  linkTelegram: () => Promise<void>;
  /**
   * Fetch a fresh Privy access token for server-side auth. Returns null
   * if Privy isn't configured OR the user isn't authenticated.
   */
  getAccessToken: () => Promise<string | null>;
}

/**
 * Convenience auth hook. Wraps Privy with safe defaults for the
 * "Privy not yet configured" case so the cabinet landing renders
 * before JJ fills in env vars on Vercel.
 *
 * Identity resolution:
 * - `telegramUserId` lifted from `privy.user.linkedAccounts[]` (the
 *   array of OAuth providers the user has bound). TG OAuth sign-in
 *   adds an entry; later `linkTelegram()` calls add one too.
 * - `callsign` prefers TG username (the gaming-native handle), then
 *   email localpart, then wallet tail.
 *
 * Score writes happen under the resolved `telegramUserId`. Email-only
 * users (no TG link) can sign in but can't save scores until they
 * link Telegram — surfaced via "Link Telegram to save" inline error
 * on the game-over card.
 */
export function useArcadeAuth(): ArcadeAuth {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const privy = PRIVY_ENABLED ? usePrivy() : null;

  if (!privy) {
    return {
      ready: true,
      authenticated: false,
      callsign: null,
      initial: null,
      telegramUserId: null,
      hasTelegram: false,
      login: () => {
        // eslint-disable-next-line no-console
        console.warn('[useArcadeAuth] Privy not configured — VITE_PRIVY_APP_ID missing.');
      },
      logout: async () => {},
      linkTelegram: async () => {},
      getAccessToken: async () => null,
    };
  }

  // linkedAccounts is Privy's array of bound OAuth providers + wallets.
  // The TG entry has shape { type: 'telegram', telegramUserId, username, firstName, ... }.
  const linkedAccounts = (privy.user?.linkedAccounts ?? []) as Array<{
    type?: string;
    telegramUserId?: number | string;
    username?: string;
    firstName?: string;
    address?: string;
  }>;
  const tgAccount = linkedAccounts.find((a) => a?.type === 'telegram');
  const telegramUserId = tgAccount?.telegramUserId
    ? Number(tgAccount.telegramUserId)
    : null;
  const hasTelegram = telegramUserId !== null;

  // Callsign: prefer TG username (most gaming-native), then email
  // localpart, then a short wallet tail, else null.
  const walletAddress = linkedAccounts.find((a) => a?.type === 'wallet')?.address;
  const callsign =
    (privy.user?.customMetadata?.callsign as string | undefined) ??
    tgAccount?.username ??
    tgAccount?.firstName ??
    privy.user?.email?.address?.split('@')[0] ??
    (walletAddress ? walletAddress.slice(0, 4) + '…' + walletAddress.slice(-4) : null);

  const initial = callsign ? callsign[0].toUpperCase() : null;

  return {
    ready: privy.ready,
    authenticated: privy.authenticated,
    callsign,
    initial,
    telegramUserId,
    hasTelegram,
    login: privy.login,
    logout: privy.logout,
    linkTelegram: async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fn = (privy as any).linkTelegram;
        if (typeof fn === 'function') await fn();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[useArcadeAuth] linkTelegram failed:', e);
      }
    },
    getAccessToken: async () => {
      try {
        const token = await privyGetAccessToken();
        return token ?? null;
      } catch {
        return null;
      }
    },
  };
}
