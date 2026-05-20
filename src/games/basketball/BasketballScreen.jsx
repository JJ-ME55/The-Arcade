import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { makeBasketballGameConfig } from './scene.js';
import { BasketballHUD } from './hud.jsx';
import { GameChrome } from '@/components/GameChrome.jsx';
import { TelegramLinkBanner } from '@/components/TelegramLinkBanner.jsx';
import { useArcadeSessionMint } from '@/wallet/useArcadeSessionMint.js';

/**
 * BasketballScreen — mounts the Phaser scene + HUD + arcade chrome.
 *
 * The JWT capture from `?session=<jwt>` runs silently in the background
 * (no UI surface — bot users get their score-submission identity, web
 * users just play without leaderboard write). When the unified arcade
 * /api/arcade/score endpoint lands, this silent capture will be
 * superseded by Privy-auth-based identity from the parent app.
 */
export function BasketballScreen() {
    const phaserHostRef = useRef(null);
    const gameRef = useRef(null);

    // Bot users — JWT comes via the URL (?session=). Web users — JWT
    // gets minted server-side via Privy auth (useArcadeSessionMint).
    // Either way the existing game submit logic reads sessionStorage.
    useEffect(() => {
        try {
            const session = new URLSearchParams(window.location.search).get('session');
            if (session) sessionStorage.setItem('arcade_session', session);
        } catch (_) { /* no leaderboard for this play; game still works */ }
    }, []);
    const { status: sessionStatus } = useArcadeSessionMint('basketball');

    useEffect(() => {
        if (!phaserHostRef.current) return;
        if (gameRef.current) return;
        const config = makeBasketballGameConfig(phaserHostRef.current);
        gameRef.current = new Phaser.Game(config);
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
            <BasketballHUD />
            <GameChrome onMute={handleMute} />
            {sessionStatus === 'tg_not_linked' && <TelegramLinkBanner />}
        </div>
    );
}

const styles = {
    root: {
        position: 'relative',
        width: '100vw',
        height: '100vh',
        background: '#0a0a0a',
        overflow: 'hidden',
    },
    phaserHost: {
        position: 'absolute',
        inset: 0,
    },
};

export default BasketballScreen;
