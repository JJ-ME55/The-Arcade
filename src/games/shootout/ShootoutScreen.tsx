// @ts-nocheck — thin iframe wrapper, no internal game state.

/**
 * Standalone Shootout deployment. The Three.js + Vite app lives at
 * BillionaireBonkClub/shootout and ships as its own Vercel project; we just
 * frame it in. When that URL changes (subdomain switch, env split), swap it
 * here; eventually lift to import.meta.env.VITE_SHOOTOUT_URL.
 */
const SHOOTOUT_GAME_URL = 'https://fps-staking-game.vercel.app/';

/**
 * Full-bleed iframe of the Shootout game. Mounted at /play/shootout/launch
 * outside the AppShell chrome (mirrors the legacy chromeless Pool wrapper).
 *
 * The `allow` attribute grants the iframe pointer-lock + fullscreen + gamepad,
 * which the FPS needs for mouse-look + scope + future controller support. The
 * empty sandbox is omitted on purpose — the standalone game owns its own
 * domain and we trust its scripts.
 */
export function ShootoutScreen() {
  return (
    <iframe
      title="Shootout"
      src={SHOOTOUT_GAME_URL}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        border: 0,
        background: '#000',
      }}
      allow="fullscreen; pointer-lock; gamepad; autoplay"
      allowFullScreen
    />
  );
}
