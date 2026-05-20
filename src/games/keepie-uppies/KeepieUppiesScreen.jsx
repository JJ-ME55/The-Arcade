import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { createScene } from './scene.js';
import { GameChrome } from '@/components/GameChrome.jsx';

/**
 * KeepieUppiesScreen — mounts the Phaser scene + arcade chrome.
 *
 * JWT capture from `?session=<jwt>` runs silently in the background
 * (no UI surface). When the unified /api/arcade/score endpoint lands,
 * this will be superseded by Privy-auth identity.
 */
export function KeepieUppiesScreen() {
    const phaserHostRef = useRef(null);
    const gameRef = useRef(null);

    useEffect(() => {
        try {
            const session = new URLSearchParams(window.location.search).get('session');
            if (session) sessionStorage.setItem('arcade_session', session);
        } catch (_) { /* no leaderboard for this play; game still works */ }
    }, []);

    useEffect(() => {
        if (!phaserHostRef.current || gameRef.current) return;
        const SceneClass = createScene();
        gameRef.current = new Phaser.Game({
            type: Phaser.AUTO,
            parent: phaserHostRef.current,
            width: 800,
            height: 1200,
            scale: {
                mode: Phaser.Scale.FIT,
                autoCenter: Phaser.Scale.CENTER_BOTH,
            },
            backgroundColor: '#4a7fb3',
            scene: SceneClass,
        });
        return () => {
            if (gameRef.current) {
                gameRef.current.destroy(true);
                gameRef.current = null;
            }
        };
    }, []);

    const handleMute = (next) => {
        if (gameRef.current?.sound) gameRef.current.sound.mute = next;
    };

    return (
        <div style={styles.root}>
            <div ref={phaserHostRef} style={styles.phaserHost} />
            <GameChrome onMute={handleMute} />
        </div>
    );
}

const styles = {
    root: {
        position: 'relative',
        width: '100vw',
        height: '100dvh',
        overflow: 'hidden',
        background: '#0f1c2e',
    },
    phaserHost: {
        width: '100%',
        height: '100%',
    },
};

export default KeepieUppiesScreen;
