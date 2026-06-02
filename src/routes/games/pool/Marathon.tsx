import { useNavigate } from 'react-router-dom';
import { useIsMobile } from './useIsMobile';
import './screens.css';

/**
 * Side Pocket Marathon Entry — `/play/pool/marathon`.
 *
 * Port of designer's MarathonEntry from Round2Marathon.jsx + sp_marathon.css.
 * Solo trick-shot lives mode entry screen.
 *
 * Per DECISIONS_2026-06-01 §5 — no Easy/Hard difficulty floor in v1
 * (single entry mode with auto-ladder), but the designer's mockup kept
 * the difficulty segment. We render it disabled for visual fidelity and
 * grey it out — the START RUN button bypasses any selection.
 *
 * Mock data for V1:
 *   - Leaderboard: Deadstroke 412 · KissShot 388 · jjk_55 #14 142
 *   - Personal best: Best Streak 23, Setups Done 186, Best Score 412
 */

/**
 * Lives glyphs live in the in-match MarathonHUD (not the entry screen).
 * Will land alongside that port; the .mar-life styles stay in screens.css
 * ready for use.
 */

export function Marathon() {
    const navigate = useNavigate();
    const isMobile = useIsMobile();
    const surfaceClass = isMobile ? 'mob' : 'web';

    const lb = [
        { rk: '1', nm: 'Deadstroke', sc: '412', me: false },
        { rk: '2', nm: 'KissShot', sc: '388', me: false },
        { rk: '14', nm: 'jjk_55 (You)', sc: '142', me: true },
    ];
    const floors = ['Easy', 'Medium', 'Hard', 'Insane'];

    return (
        <div className={'mar ' + surfaceClass}>
            <div className="grain" />
            <div className="mar-entry">
                <div className="mar-e-top">
                    <button className="mar-e-back" onClick={() => navigate('/play/pool')}>‹</button>
                    <span className="mar-e-eyebrow">Solo · Trick Shots</span>
                </div>

                <div className="mar-e-main">
                    <div className="mar-hero">
                        <span className="mar-kick">Marathon</span>
                        <span className="mar-wm">Trick Shots</span>
                        <span className="mar-tag">Three lives. Curated setups. How far can you run?</span>

                        <div className="mar-pb">
                            <div className="s"><span className="v gold">23</span><span className="k">Best Streak</span></div>
                            <div className="s"><span className="v">186</span><span className="k">Setups Done</span></div>
                            <div className="s"><span className="v">412</span><span className="k">Best Score</span></div>
                        </div>

                        <div className="mar-floor">
                            <span className="lab">Difficulty floor</span>
                            <div className="mar-seg">
                                {floors.map((f, i) => (
                                    <button key={f} className={i === 1 ? 'on' : ''}>{f}</button>
                                ))}
                            </div>
                        </div>

                        <button className="mar-start">Start Run ›</button>
                    </div>

                    <div className="mar-aside">
                        <div className="mar-card">
                            <div className="mc-h">
                                <span className="ct">This Week</span>
                                <span className="cs">Top Runs</span>
                            </div>
                            {lb.map((r) => (
                                <div key={r.rk} className={'mar-lb' + (r.me ? ' me' : '')}>
                                    <span className="rk">{r.rk}</span>
                                    <span className="nm">{r.nm}</span>
                                    <span className="sc">{r.sc}</span>
                                </div>
                            ))}
                        </div>

                        <div className="mar-card">
                            <div className="mc-h">
                                <span className="ct">Rewards</span>
                                <span className="cs">Per Setup</span>
                            </div>
                            <div className="mar-reward">
                                Each completed setup earns <b>G</b>. Milestone bonuses at streaks of <b>5</b>, <b>10</b>, <b>20</b>. Bank any time to lock your score.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
