import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
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

type Group = 'solids' | 'stripes';

/**
 * Pot tray — shows a player's group balls, vivid = potted, dimmed =
 * still on the table. Before group assignment (open table) the tray
 * shows seven neutral slots.
 */
function SpgRack({ group, pottedIds }: { group: Group | null; pottedIds: number[] }) {
    const ids = group === 'stripes'
        ? [9, 10, 11, 12, 13, 14, 15]
        : [1, 2, 3, 4, 5, 6, 7];
    return (
        <span className="rack">
            {ids.map((id) => {
                if (group === null) {
                    // Open table — neutral slots until the first pot
                    // locks the groups in.
                    return <i key={id} className="rem" style={{ background: '#56503f' }} />;
                }
                const colorIdx = id > 8 ? id - 8 : id;
                const c = `var(--ball-${colorIdx})`;
                const bg = group === 'stripes'
                    ? `linear-gradient(180deg,#fbfaf5 0 28%, ${c} 28% 72%, #fbfaf5 72%)`
                    : c;
                const potted = pottedIds.includes(id);
                return <i key={id} className={potted ? '' : 'rem'} style={{ background: bg }} />;
            })}
        </span>
    );
}

export function MatchHUD() {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const iframeRef = useRef<HTMLIFrameElement | null>(null);

    // ── Live match state, fed by the iframe's 'side-pocket-match'
    // postMessage bridge (game-world.ts postMatch). Names/avatars stay
    // mock until server matches land; pots/groups/turns/wins are real.
    const [groups, setGroups] = useState<{ p0: Group | null; p1: Group | null }>({ p0: null, p1: null });
    const [pottedIds, setPottedIds] = useState<number[]>([]);
    const [current, setCurrent] = useState(0);
    const [banner, setBanner] = useState<string | null>(null);
    const [wins, setWins] = useState<[number, number]>([0, 0]);

    useEffect(() => {
        let bannerTimer: number | undefined;
        const flashBanner = (text: string, ms: number) => {
            setBanner(text);
            window.clearTimeout(bannerTimer);
            bannerTimer = window.setTimeout(() => setBanner(null), ms);
        };
        const onMsg = (e: MessageEvent) => {
            const d = e.data as { type?: string; kind?: string; [k: string]: unknown };
            if (!d || d.type !== 'side-pocket-match') return;
            switch (d.kind) {
                case 'pot': {
                    const id = d.ballId as number;
                    // Object balls only — cue (0) and the 8 don't sit in
                    // either tray.
                    if (id >= 1 && id <= 15 && id !== 8) {
                        setPottedIds(prev => (prev.includes(id) ? prev : [...prev, id]));
                    }
                    break;
                }
                case 'groups': {
                    const p0 = d.p0 as Group;
                    const p1 = d.p1 as Group;
                    setGroups({ p0, p1 });
                    // JJ 2026-06-10: "when the first pot is in, a message
                    // should say 'You're Stripes' so it's clear what the
                    // player is aiming for."
                    flashBanner(p0 === 'stripes' ? "You're Stripes" : "You're Solids", 2400);
                    break;
                }
                case 'turn':
                    setCurrent(d.current as number);
                    break;
                case 'gameover': {
                    const w = d.winner as number;
                    setWins(prev => (w === 0 ? [prev[0] + 1, prev[1]] : [prev[0], prev[1] + 1]));
                    flashBanner(w === 0 ? 'You win the rack!' : 'Velvet Q takes the rack', 2600);
                    break;
                }
                case 'reset':
                    setGroups({ p0: null, p1: null });
                    setPottedIds([]);
                    setCurrent(0);
                    break;
            }
        };
        window.addEventListener('message', onMsg);
        return () => {
            window.removeEventListener('message', onMsg);
            window.clearTimeout(bannerTimer);
        };
    }, []);

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

    // Turn state is live (game-world posts 'turn' on every pass);
    // player 0 is always the human in the current vs-AI match shape.
    const you = current === 0;

    const p0Potted = pottedIds.filter(id => (groups.p0 === 'stripes' ? id > 8 : id < 8));
    const p1Potted = pottedIds.filter(id => (groups.p1 === 'stripes' ? id > 8 : id < 8));

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
                        <SpgRack group={groups.p0} pottedIds={p0Potted} />
                    </div>
                    <span className="sc">{wins[0]}</span>
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
                        <SpgRack group={groups.p1} pottedIds={p1Potted} />
                    </div>
                    <span className="sc">{wins[1]}</span>
                </div>
            </header>

            {/* ============= STAGE — iframe game canvas ============= */}
            <main className="spg-stage">
                <div className="spg-board">
                    {/* Group-assignment / rack-result banner — flashes
                        over the board ("You're Stripes", "You win the
                        rack!") then fades. key remounts the element so
                        the CSS animation replays for each message. */}
                    {banner && <div className="spg-banner" key={banner}>{banner}</div>}
                    <iframe
                        ref={iframeRef}
                        src={iframeSrc}
                        title="8-Ball Pool"
                        loading="eager"
                        allow="fullscreen"
                        className="spg-iframe"
                    />
                </div>
                {/* Spin widget removed from here in Phase B_pool_v5 — it
                    was a static decoration overlapping the iframe and
                    competing with the iframe's real spin widget (now
                    hidden via hud=parent). A working React spin widget
                    that drives __SIDE_POCKET_SET_SPIN can return as a
                    separate slice. */}
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

                <PowerBar iframeRef={iframeRef} />

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

/**
 * Functional power bar — drag the BAR ITSELF (not a separate slider
 * knob below) to set power. Writes through to the iframe game via
 * __SIDE_POCKET_SET_POWER(pct).
 *
 * Previous implementation used an <input type=range> overlay; that
 * worked but the native thumb rendered at the wrapper's vertical
 * centre, which was UNDER the visible bar — JJ 2026-06: "the knob to
 * move it is UNDER the bar." This replaces it with a pure pointer-drag
 * handler bound to the barwrap itself. The visible .mark element IS
 * the knob; click anywhere on the bar to set, drag to scrub.
 */
function PowerBar({ iframeRef }: { iframeRef: React.RefObject<HTMLIFrameElement> }) {
    const [pct, setPct] = useState(50);
    const barRef = useRef<HTMLDivElement | null>(null);

    const apply = (next: number) => {
        const clamped = Math.max(0, Math.min(100, next));
        setPct(clamped);
        const win = iframeRef.current?.contentWindow as { __SIDE_POCKET_SET_POWER?: (p: number) => void } | null;
        win?.__SIDE_POCKET_SET_POWER?.(clamped);
    };

    const setFromClientX = (clientX: number) => {
        const el = barRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const x = clientX - rect.left;
        apply((x / rect.width) * 100);
    };

    useEffect(() => {
        let dragging = false;
        const onMove = (e: PointerEvent) => {
            if (!dragging) return;
            setFromClientX(e.clientX);
        };
        const onUp = () => {
            dragging = false;
        };
        const el = barRef.current;
        if (!el) return;
        const onDown = (e: PointerEvent) => {
            dragging = true;
            setFromClientX(e.clientX);
            (e.target as Element)?.setPointerCapture?.(e.pointerId);
        };
        el.addEventListener('pointerdown', onDown);
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
        document.addEventListener('pointercancel', onUp);

        // Listen for iframe → parent power messages — fires when the
        // player presses W/S inside the iframe and the iframe's
        // PowerHud.value setter posts up the new percentage. JJ
        // 2026-06: "the power slider moves as they use the W."
        const onMessage = (e: MessageEvent) => {
            if (e.data && typeof e.data === 'object' &&
                (e.data as { type?: string }).type === 'side-pocket-power' &&
                typeof (e.data as { pct?: number }).pct === 'number') {
                const newPct = Math.max(0, Math.min(100, (e.data as { pct: number }).pct));
                // Don't echo back — only update React display state.
                setPct(newPct);
            }
        };
        window.addEventListener('message', onMessage);

        // Send the initial slider value to the iframe so the iframe's
        // PowerHud matches the React display from the start. If the
        // iframe's init() hasn't run yet (asset load), this call is
        // captured by the stub buffer in index.html and replayed.
        apply(pct);

        return () => {
            el.removeEventListener('pointerdown', onDown);
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onUp);
            document.removeEventListener('pointercancel', onUp);
            window.removeEventListener('message', onMessage);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="spg-power">
            <span className="lbl">POWER</span>
            <div
                ref={barRef}
                className="barwrap"
                style={{ position: 'relative', flex: 1, cursor: 'pointer', touchAction: 'none' }}
                role="slider"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(pct)}
                aria-label="Shot power"
            >
                <div className="bar">
                    <span className="fill" style={{ width: `calc(${pct}% - 4px)` }} />
                </div>
                <span className="mark" style={{ left: pct + '%' }} />
            </div>
            <span className="pct">{Math.round(pct)}%</span>
        </div>
    );
}
