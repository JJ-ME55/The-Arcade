import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * GameChrome — overlay buttons rendered on top of any game scene.
 *
 *   ← Arcade   (top-left, navigates to /dashboard)
 *   🔊 / 🔇    (top-right, toggles mute via onMute callback)
 *
 * The mute callback is supplied by the parent because the audio
 * interface differs per engine (Phaser uses `game.sound.mute`,
 * Three.js doesn't have a built-in audio context, etc.). The chrome
 * just owns the toggle state + UI.
 *
 * Pass `initialMuted` if you want to seed the visual state to match
 * persisted user preference. We don't persist by default — fresh load,
 * sound on.
 */
export function GameChrome({ onMute, initialMuted = false }) {
  const navigate = useNavigate();
  const [muted, setMuted] = useState(initialMuted);

  const handleForfeit = () => {
    navigate('/dashboard');
  };

  const handleMuteToggle = () => {
    const next = !muted;
    setMuted(next);
    if (typeof onMute === 'function') onMute(next);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleForfeit}
        style={styles.forfeit}
        aria-label="Back to The Arcade"
      >
        ← Arcade
      </button>
      <button
        type="button"
        onClick={handleMuteToggle}
        style={styles.mute}
        aria-label={muted ? 'Unmute' : 'Mute'}
        aria-pressed={muted}
      >
        {muted ? '🔇' : '🔊'}
      </button>
    </>
  );
}

const baseButton = {
  position: 'absolute',
  top: 'max(env(safe-area-inset-top, 0px), 8px)',
  padding: '8px 12px',
  borderRadius: 6,
  background: 'rgba(0, 0, 0, 0.6)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: 0.5,
  cursor: 'pointer',
  zIndex: 10,
  WebkitTapHighlightColor: 'transparent',
  userSelect: 'none',
};

const styles = {
  forfeit: {
    ...baseButton,
    left: 'max(env(safe-area-inset-left, 0px), 8px)',
    color: '#FFD23A',
    borderColor: 'rgba(255, 210, 58, 0.45)',
  },
  mute: {
    ...baseButton,
    right: 'max(env(safe-area-inset-right, 0px), 8px)',
    color: '#ffffff',
    fontSize: 16,
    padding: '6px 10px',
    minWidth: 36,
    textAlign: 'center',
  },
};

export default GameChrome;
