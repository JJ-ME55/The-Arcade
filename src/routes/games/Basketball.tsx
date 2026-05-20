// @ts-nocheck — BasketballScreen is plain JS, lifted from arcade/basketball
// branch on the SolShot repo. Strict TS not yet applied to lifted game code.
import { BasketballScreen } from '@/games/basketball/BasketballScreen.js';

/**
 * Mounts the Basketball Phaser scene at /play/basketball. The lifted
 * BasketballScreen handles its own Phaser game lifecycle (mount on
 * effect, destroy on unmount) and captures `?session=<jwt>` from the
 * URL for arcade-bot launches.
 */
export function Basketball() {
  return <BasketballScreen />;
}
