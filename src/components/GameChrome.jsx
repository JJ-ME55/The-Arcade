import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * GameChrome — overlay buttons rendered on top of any game scene
 * (basketball / keepie-uppies / free-kicks). v2 brand restyled —
 * paper buttons with ink labels, no emoji.
 *
 *   ← Arcade   (top-left, navigates to /play — the dashboard)
 *   Audio toggle (top-right, calls onMute callback)
 *
 * The mute callback is supplied by the parent because the audio
 * interface differs per engine (Phaser uses `game.sound.mute`,
 * Three.js doesn't have a built-in audio context).
 */
export function GameChrome({ onMute, initialMuted = false }) {
  const navigate = useNavigate();
  const [muted, setMuted] = useState(initialMuted);

  const handleForfeit = () => {
    navigate('/play');
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
        {muted ? 'AUDIO · OFF' : 'AUDIO · ON'}
      </button>
    </>
  );
}

const baseButton = {
  position: 'absolute',
  top: 'max(env(safe-area-inset-top, 0px), 10px)',
  padding: '8px 12px',
  background: 'var(--paper)',
  border: '1.5px solid var(--ink)',
  color: 'var(--ink)',
  fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  zIndex: 10,
  WebkitTapHighlightColor: 'transparent',
  userSelect: 'none',
  lineHeight: 1,
};

const styles = {
  forfeit: {
    ...baseButton,
    left: 'max(env(safe-area-inset-left, 0px), 10px)',
  },
  mute: {
    ...baseButton,
    right: 'max(env(safe-area-inset-right, 0px), 10px)',
  },
};

export default GameChrome;
