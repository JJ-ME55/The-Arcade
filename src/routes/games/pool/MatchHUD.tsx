import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import './match.css';

/**
 * Side Pocket Match HUD — `/play/pool/launch`.
 *
 * Port of the designer's DesktopMatch component from Round2Match.jsx +
 * sp_game.css (Round 2 handoff). The .spg three-row layout: brass HUD
 * bar (both players + score racks + room/timer) · cobalt iframe board ·
 * action shelf (tools + power + shoot).
 *
 * Architecture note:
 *   The actual game canvas lives in an iframe at /games/pool/index.html.
 *   This component wraps that iframe with the Side Pocket brand HUD.
 *   The iframe receives ?hud=parent so its own in-canvas "PLAYER 1" / "00"
 *   labels and DOM #powerHud/#spinHud are suppressed — the React HUD
 *   takes over.
 *
 * V1 — mock data, no backend wiring:
 *   - Player 1 (you): jjk_55, Gold III, score 2, solids potted 3
 *   - Player 2 (opp): Velvet Q, Gold II, score 1, stripes potted 2
 *   - Room: "The Velvet Room · Ranked · Best of 3"
 *   - Timer: 0:42
 *   - Power bar: 64% (visual only — iframe still drives real gameplay)
 *   - Shoot button: visual only — click the canvas to shoot for now
 *
 * Wiring backlog (separate session):
 *   - Read match state from server socket (player names, scores, turn)
 *   - postMessage between React Shoot button + iframe shoot action
 *   - Live timer countdown
 *   - Score updates as balls pot
 */

type RackKind = 'solids' | 'stripes';

function SpgRack({ kind, potted = 0 }: { kind: RackKind; potted?: number }) {
    return (
        <span className="rack">
            {[1, 2, 3, 4, 5, 6, 7].map((b, i) => {
                const c = `var(--ball-${b})`;
                const bg = kind === 'stripes'
                    ? `linear-gradient(180deg,#fbfaf5 0 28%, ${c} 28% 72%, #fbfaf5 72%)`
                    : c;
                return <i key={b} className={i < potted ? '' : 'rem'} style={{ background: bg }} />;
            })}
        </span>
    );
}

export function MatchHUD() {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const iframeRef = useRef<HTMLIFrameElement | null>(null);

    // Stash arcade-bot session JWT (parent-side). The iframe also reads
    // it from its own URL query — double-write so either side works.
    useEffect(() => {
        const session = params.get('session');
        if (session) {
            try {
                sessionStorage.setItem('arcade_session', session);
            } catch {
                /* sessionStorage unavailable */
            }
        }
    }, [params]);

    // Forward session + hud=parent to the iframe URL. The hud=parent flag
    // tells the pool client to hide its in-iframe labels + DOM HUDs.
    const session = params.get('session');
    const iframeSrc = session
        ? `/games/pool/index.html?session=${encodeURIComponent(session)}&hud=parent`
        : '/games/pool/index.html?hud=parent';

    // V1 mock state — whose turn is it. Toggle to test the "opp" view by
    // appending ?turn=opp to the URL.
    const you = params.get('turn') !== 'opp';

    return (
        <div className={'spg' + (you ? '' : ' opp')}>
            <div className="spg-grain" />

            {/* ============= TOP HUD BAR ============= */}
            <header className="spg-bar">
                {/* Left player — you */}
                <div className={'spg-p' + (you ? ' active' : ' idle')}>
                    <div className="avw">
                        <div className="ring" style={{ ['--deg' as any]: you ? '300deg' : '0deg' }} />
                        <div className="av" style={{ background: 'radial-gradient(circle at 38% 30%, #2a6b4f, #143b2c 78%)' }}>J</div>
                    </div>
                    <div className="col">
                        <div className="nmrow">
                            <span className="nm">jjk_55</span>
                            <span className="tier">Gold III</span>
                        </div>
                        <SpgRack kind="solids" potted={3} />
                    </div>
                    <span className="sc">2</span>
                </div>

                {/* Middle — room name / timer / turn indicator */}
                <div className="spg-mid">
                    <span className="room">The Velvet Room · Ranked · Best of 3</span>
                    <div className="tm">
                        <span className="ring2" />
                        <span className="t">0:42</span>
                    </div>
                    <span className="turn">{you ? 'Your Shot' : "Opponent's Turn"}</span>
                </div>

                {/* Right player — opponent */}
                <div className={'spg-p right' + (you ? ' idle' : ' active')}>
                    <div className="avw">
                        <div className="ring" style={{ ['--deg' as any]: you ? '0deg' : '300deg' }} />
                        <div className="av" style={{ background: 'radial-gradient(circle at 38% 30%, #7a3aa0, #2c1140 80%)' }}>V</div>
                    </div>
                    <div className="col">
                        <div className="nmrow">
                            <span className="tier">Gold II</span>
                            <span className="nm">Velvet Q</span>
                        </div>
                        <SpgRack kind="stripes" potted={2} />
                    </div>
                    <span className="sc">1</span>
                </div>
            </header>

            {/* ============= STAGE — iframe game canvas ============= */}
            <main className="spg-stage">
                <div className="spg-board">
                    <iframe
                        ref={iframeRef}
                        src={iframeSrc}
                        title="8-Ball Pool"
                        loading="eager"
                        allow="fullscreen"
                        className="spg-iframe"
                    />
                </div>
                <div className="spg-spin">
                    <span className="dot" />
                    <span className="lab">Spin</span>
                </div>
            </main>

            {/* ============= ACTION SHELF — power + shoot ============= */}
            <footer className="spg-shelf">
                <div className="spg-tools">
                    <button
                        className="spg-tool"
                        title="Forfeit match"
                        onClick={() => navigate('/play/pool')}
                    >
                        ⚑
                    </button>
                    <button className="spg-tool" title="Menu">≡</button>
                </div>

                <div className="spg-power">
                    <span className="lbl">POWER</span>
                    <div className="barwrap">
                        <span className="mark" style={{ left: '64%' }} />
                        <div className="bar">
                            <span className="fill" style={{ width: 'calc(64% - 4px)' }} />
                        </div>
                    </div>
                    <span className="pct">64%</span>
                </div>

                {you
                    ? (
                        <button
                            className="spg-shoot"
                            onClick={() => {
                                // Same-origin iframe → contentWindow exposes the
                                // __SIDE_POCKET_FORCE_SHOOT global set by the pool
                                // client when ?hud=parent. Fires regardless of the
                                // canvas click-to-aim state, so the React button is
                                // a real shoot trigger, not decoration.
                                const win = iframeRef.current?.contentWindow as { __SIDE_POCKET_FORCE_SHOOT?: () => void } | null;
                                win?.__SIDE_POCKET_FORCE_SHOOT?.();
                            }}
                        >
                            Shoot
                        </button>
                    )
                    : <button className="spg-shoot wait">Waiting…</button>
                }
            </footer>
        </div>
    );
}
