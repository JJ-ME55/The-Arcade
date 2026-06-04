import { useEffect, useRef } from 'react';
import { GameChrome } from '@/components/GameChrome.jsx';
import { TelegramLinkBanner } from '@/components/TelegramLinkBanner.jsx';
import { ClaimScoreOverlay } from '@/components/ClaimScoreOverlay';
import { HowToPlayIntro } from '@/components/HowToPlayIntro';
import { bootFreeKicks } from './boot.js';
import { useArcadeSessionMint } from '@/wallet/useArcadeSessionMint.js';

/**
 * FreeKicksScreen — mounts the Three.js scene + HUD + arcade chrome.
 *
 * Unlike the Phaser games (Basketball, Keepie Uppies), this scene is
 * vanilla Three.js. It needs sibling DOM elements with specific IDs
 * (#hud-lives, #hud-score, etc.) so we render them inline and call
 * bootFreeKicks() in useEffect to wire them.
 *
 * Mute via GameChrome is a no-op on Three.js scenes today (the lifted
 * scene doesn't have audio sources). Kept the button for UX consistency
 * — toggling does nothing visible. When audio lands, wire it through
 * the mute callback.
 */
export function FreeKicksScreen() {
    const gameRef = useRef(null);
    const teardownRef = useRef(null);

    // Web-user score submission via Privy → server-minted JWT.
    // Bot users get their JWT from ?session= in the URL (handled inside
    // bootFreeKicks). Hook is no-op if a session JWT already exists.
    const { status: sessionStatus } = useArcadeSessionMint('freekicks');

    useEffect(() => {
        if (!gameRef.current) return;
        teardownRef.current = bootFreeKicks(gameRef.current);
        return () => {
            if (typeof teardownRef.current === 'function') {
                teardownRef.current();
                teardownRef.current = null;
            }
        };
    }, []);

    const handleMute = (_next) => {
        // No audio in the lifted scene yet — no-op. When audio lands,
        // hook a global Three.js AudioContext suspend/resume here.
    };

    return (
        <div style={styles.root}>
            <div ref={gameRef} id="game" style={styles.game} />
            <div id="hud" style={styles.hud}>
                <div id="hud-lives" style={styles.hudLives}>❤️❤️❤️❤️❤️</div>
                <div id="hud-score" style={styles.hudScore}>0 pts</div>
                <div id="hud-scenario" style={styles.hudScenario}>12m • 0° • 3-man wall</div>
                <div id="hud-hint" style={styles.hudHint}>Swipe up to shoot. Curve to bend.</div>
                <div id="popup" style={styles.popup}></div>
                <div id="run-over-info" style={styles.runOverInfo}></div>
                {/* Safari escape hatch kept in DOM but hidden — relevant only
                    on TG WebView, which doesn't apply on the arcade web hub. */}
                <a
                    id="safari-hatch"
                    href="#"
                    target="_blank"
                    rel="noopener"
                    style={{ ...styles.safariHatch, display: 'none' }}
                >
                    Open in Safari ↗
                </a>
                <button id="replay" style={styles.replay}>Tap to play again</button>
            </div>
            <GameChrome onMute={handleMute} />
            <HowToPlayIntro slug="free-kicks" gameName="Free Kicks" />
            {sessionStatus === 'tg_not_linked' && <TelegramLinkBanner />}
            <ClaimScoreOverlay game="free-kicks" />
        </div>
    );
}

const styles = {
    root: {
        position: 'fixed',
        inset: 0,
        background: '#0a0a14',
        color: '#fff',
        overflow: 'hidden',
        touchAction: 'none',
        WebkitTapHighlightColor: 'transparent',
        WebkitUserSelect: 'none',
        userSelect: 'none',
    },
    game: {
        position: 'fixed',
        inset: 0,
    },
    hud: {
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 10,
    },
    hudLives: {
        position: 'absolute',
        top: 20,
        left: 60,
        fontSize: 24,
        textShadow: '0 2px 4px rgba(0,0,0,0.7)',
        letterSpacing: 2,
    },
    hudScore: {
        position: 'absolute',
        top: 22,
        right: 60,
        fontSize: 22,
        fontWeight: 'bold',
        textShadow: '0 2px 4px rgba(0,0,0,0.7)',
    },
    hudScenario: {
        position: 'absolute',
        top: 60,
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: 14,
        color: '#cfd8dc',
        textShadow: '0 2px 4px rgba(0,0,0,0.7)',
        whiteSpace: 'nowrap',
    },
    hudHint: {
        position: 'absolute',
        bottom: 18,
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: 13,
        color: 'rgba(180,195,255,0.85)',
        textShadow: '0 2px 4px rgba(0,0,0,0.7)',
        whiteSpace: 'nowrap',
    },
    popup: {
        position: 'absolute',
        top: '42%',
        left: '50%',
        transform: 'translate(-50%,-50%)',
        fontSize: 56,
        fontWeight: 900,
        color: '#ffe680',
        textShadow: '0 4px 12px rgba(0,0,0,0.8), 0 0 30px rgba(0,0,0,0.4)',
        opacity: 0,
        transition: 'opacity 0.5s ease, transform 0.4s ease',
        textAlign: 'center',
        whiteSpace: 'pre-wrap',
        pointerEvents: 'none',
    },
    replay: {
        position: 'absolute',
        bottom: '30%',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.6)',
        color: 'white',
        border: '2px solid rgba(255,255,255,0.4)',
        padding: '14px 28px',
        fontSize: 18,
        borderRadius: 12,
        display: 'none',
        pointerEvents: 'auto',
        cursor: 'pointer',
        fontFamily: 'inherit',
    },
    runOverInfo: {
        position: 'absolute',
        top: '56%',
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: 14,
        color: '#cfd8dc',
        textShadow: '0 2px 4px rgba(0,0,0,0.7)',
        textAlign: 'center',
        display: 'none',
        pointerEvents: 'none',
        whiteSpace: 'pre-wrap',
    },
    safariHatch: {
        position: 'absolute',
        bottom: '22%',
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: 13,
        color: 'rgba(180,195,255,0.9)',
        textDecoration: 'underline',
        textShadow: '0 2px 4px rgba(0,0,0,0.7)',
        pointerEvents: 'auto',
        whiteSpace: 'nowrap',
    },
};

export default FreeKicksScreen;
