// @ts-nocheck — KeepieUppiesScreen is plain JS, lifted from
// arcade/keepie-uppies on the SolShot repo. Strict TS not yet applied.
import { KeepieUppiesScreen } from '@/games/keepie-uppies/KeepieUppiesScreen.jsx';

/**
 * Mounts the Keepie Uppies Phaser scene at /play/keepie-uppies. The
 * lifted KeepieUppiesScreen handles its own Phaser game lifecycle and
 * captures `?session=<jwt>` from the URL for arcade-bot launches.
 */
export function KeepieUppies() {
  return <KeepieUppiesScreen />;
}
