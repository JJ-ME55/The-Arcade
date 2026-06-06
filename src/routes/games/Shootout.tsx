// @ts-nocheck — ShootoutScreen is the iframe wrapper of the standalone game.
import { ShootoutScreen } from '@/games/shootout/ShootoutScreen';

/**
 * Mounts Shootout at /play/shootout/launch. The screen iframes the standalone
 * Three.js + Vite app deployed at fps-staking-game.vercel.app. See
 * `src/games/shootout/README.md` for the iframe-vs-port rationale.
 */
export function Shootout() {
  return <ShootoutScreen />;
}
