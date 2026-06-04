import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { createScene } from './scene.js';
import { GameChrome } from '@/components/GameChrome.jsx';
import { TelegramLinkBanner } from '@/components/TelegramLinkBanner.jsx';
import { ClaimScoreOverlay } from '@/components/ClaimScoreOverlay';
import { useArcadeSessionMint } from '@/wallet/useArcadeSessionMint.js';

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

    // Bot users — JWT via URL. Web users — JWT minted by Privy auth.
    // SECURITY: strip ?session=<jwt> from URL after capture so the
    // token isn't visible in the address bar / browser history / any
    // share. history.replaceState avoids a navigation event.
    useEffect(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            const session = params.get('session');
            if (session) {
                sessionStorage.setItem('arcade_session', session);
                params.delete('session');
                const q = params.toString();
                const cleanUrl = window.location.pathname + (q ? `?${q}` : '') + window.location.hash;
                window.history.replaceState({}, '', cleanUrl);
            }
        } catch (_) { /* no leaderboard for this play; game still works */ }
    }, []);
    const { status: sessionStatus } = useArcadeSessionMint('keepieuppies');

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
            {sessionStatus === 'tg_not_linked' && <TelegramLinkBanner />}
            <ClaimScoreOverlay game="keepie-uppies" />
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
