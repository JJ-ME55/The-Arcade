// @ts-nocheck — FreeKicksScreen is plain JSX, lifted from
// JJ-ME55/solshot-free-kicks (32bb99e). Strict TS not yet applied.
import { FreeKicksScreen } from '@/games/free-kicks/FreeKicksScreen.jsx';

/**
 * Mounts the Free Kicks Three.js scene at /play/free-kicks. The lifted
 * FreeKicksScreen renders the required HUD DOM IDs and calls
 * bootFreeKicks() in useEffect to instantiate the scene.
 */
export function FreeKicks() {
  return <FreeKicksScreen />;
}
