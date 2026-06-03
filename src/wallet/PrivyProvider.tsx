import type { ReactNode } from 'react';
import { PrivyProvider } from '@privy-io/react-auth';
import { defaultSolanaRpcsPlugin } from '@privy-io/react-auth/solana';

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID;

interface Props {
  children: ReactNode;
}

/**
 * Wraps the app in the shared SolShot Privy app. Same `appId`, just a
 * new allowed origin in the Privy dashboard. Callsigns carry across
 * both sites because Privy keys identity off the user's wallet/email,
 * not the origin.
 *
 * If VITE_PRIVY_APP_ID is unset (initial Vercel deploy before JJ
 * configures env vars), this renders children directly so the build
 * succeeds and the cabinet landing is reachable.
 *
 * Privy SDK 3.x config notes:
 * - `embeddedWallets` is per-chain (was flat in 2.x).
 * - Solana RPC config comes via `defaultSolanaRpcsPlugin()` plugin
 *   (was `solanaClusters` top-level in earlier versions). The plugin
 *   uses Privy's default endpoints for SDK-internal calls; for app-
 *   level transaction broadcasting, use your own Connection with
 *   VITE_SOLANA_RPC (matches SolShot's pattern where the embedded
 *   Solana RPC is unreliable, so they broadcast through clusterApiUrl).
 */
export function ArcadePrivyProvider({ children }: Props) {
  if (!PRIVY_APP_ID) {
    if (import.meta.env.DEV) {
      console.warn(
        '[PrivyProvider] VITE_PRIVY_APP_ID not set — Privy is disabled. ' +
          'Set it in .env to enable sign-in.'
      );
    }
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        // TG first — the bot is our primary distribution funnel, and
        // users arriving from the arcade bot already have an active TG
        // session. One-tap claim. Email + Google + wallet are alternate
        // methods that bind into the same Privy account.
        loginMethods: ['telegram', 'email', 'google', 'wallet'],
        appearance: {
          // Light theme matches the v2 cream-paper editorial register.
          // Dark would clash with every surface around it.
          theme: 'light',
          // --blue from tokens.css. The v1 fire-yellow (#FFD23A) was
          // superseded by v2.
          accentColor: '#3866C8',
          // The brass logo variant reads ceremonial — right register
          // for the sign-in moment. Brand pack §Logo.
          logo: '/assets/brand/arcade-logo-blue.png',
          landingHeader: 'The Arcade',
          loginMessage: 'Telegram preferred — your scores carry instantly.',
          walletList: ['detected_wallets', 'phantom', 'solflare', 'backpack'],
        },
        embeddedWallets: {
          solana: { createOnLogin: 'users-without-wallets' },
        },
        plugins: [defaultSolanaRpcsPlugin()],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
