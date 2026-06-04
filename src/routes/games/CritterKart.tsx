// @ts-nocheck — CritterKartScreen is plain JSX wrapping the ported
// React + Three.js game (BillionaireBonkClub/critter-kart). Strict TS not applied
// to the lifted game folder; see src/games/critter-kart/README.md.
import { CritterKartScreen } from '@/games/critter-kart/CritterKartScreen.jsx';

/**
 * Mounts the Critter Kart game at /play/critter-kart/launch. The screen renders
 * the game's own full-bleed React app + arcade chrome + score-submit pipeline.
 */
export function CritterKart() {
  return <CritterKartScreen />;
}
