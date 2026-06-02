import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from './useIsMobile';
import {
    getMarathonLeaderboard,
    getArcadeSession,
    startRun,
    type MarathonLeaderboardEntry,
} from './marathonApi';
import './screens.css';

/**
 * Side Pocket Marathon Entry — `/play/pool/marathon`.
 *
 * Port of designer's MarathonEntry from Round2Marathon.jsx + sp_marathon.css.
 * V1 backend-wired (Phase C1):
 *   - Weekly leaderboard fetched from /api/games/pool/marathon/leaderboard
 *   - Start Run calls POST /start, redirects to /run/<runId> on success
 *   - Personal-best stats still mock until we add a per-user history endpoint
 *
 * No-session fallback: if the user isn't signed in (no arcade_session
 * JWT in sessionStorage), the Start Run button shows a sign-in nudge
 * instead. Leaderboard still renders (public).
 */

const FALLBACK_LB: MarathonLeaderboardEntry[] = [
    { rank: 1, displayName: 'Deadstroke', totalScore: 412, longestStreak: 23, perfectRun: true, endedAt: '' },
    { rank: 2, displayName: 'KissShot', totalScore: 388, longestStreak: 19, perfectRun: false, endedAt: '' },
    { rank: 3, displayName: 'Be the first to run', totalScore: 0, longestStreak: 0, perfectRun: false, endedAt: '' },
];

export function Marathon() {
    const navigate = useNavigate();
    const isMobile = useIsMobile();
    const surfaceClass = isMobile ? 'mob' : 'web';

    const [lb, setLb] = useState<MarathonLeaderboardEntry[]>([]);
    const [lbLoaded, setLbLoaded] = useState(false);
    const [starting, setStarting] = useState(false);
    const [startError, setStartError] = useState<string | null>(null);

    // Fetch the weekly leaderboard on mount. Fails silent → falls back to
    // the FALLBACK_LB array so the screen never shows an empty rail.
    useEffect(() => {
        let cancelled = false;
        getMarathonLeaderboard('weekly', 10).then((r) => {
            if (cancelled) return;
            if (r.ok && r.leaderboard && r.leaderboard.length > 0) {
                setLb(r.leaderboard);
            } else {
                setLb(FALLBACK_LB);
            }
            setLbLoaded(true);
        }).catch(() => {
            if (cancelled) return;
            setLb(FALLBACK_LB);
            setLbLoaded(true);
        });
        return () => { cancelled = true; };
    }, []);

    const handleStartRun = async () => {
        setStartError(null);
        const session = getArcadeSession();
        if (!session) {
            setStartError('Sign in via Telegram bot first — open Side Pocket from @TheArcadeGG_Bot.');
            return;
        }
        setStarting(true);
        try {
            const r = await startRun(session);
            if (r.ok && r.runId) {
                // Stash the first setup in sessionStorage so the run page
                // doesn't have to re-fetch it
                if (r.firstSetup) {
                    sessionStorage.setItem(
                        `marathon_setup_${r.runId}`,
                        JSON.stringify(r.firstSetup),
                    );
                }
                navigate(`/play/pool/marathon/run/${r.runId}`);
            } else {
                setStartError(r.error || 'Could not start run. Try again?');
            }
        } catch (e) {
            setStartError(e instanceof Error ? e.message : 'Network error. Try again?');
        } finally {
            setStarting(false);
        }
    };

    // Highlight the signed-in player in the leaderboard (cosmetic only —
    // we'd need a per-user me-flag from server to know for sure)
    const isMe = (name: string) => {
        const session = getArcadeSession();
        if (!session) return false;
        // The session JWT has a tgUsername claim — but we'd have to decode
        // it to know. For V1 just light up entries containing "(You)".
        return name.includes('(You)');
    };

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
                            <div className="s"><span className="v gold">—</span><span className="k">Best Streak</span></div>
                            <div className="s"><span className="v">—</span><span className="k">Setups Done</span></div>
                            <div className="s"><span className="v">—</span><span className="k">Best Score</span></div>
                        </div>

                        <button
                            className="mar-start"
                            onClick={handleStartRun}
                            disabled={starting}
                            style={starting ? { opacity: 0.6, cursor: 'wait' } : undefined}
                        >
                            {starting ? 'Starting…' : 'Start Run ›'}
                        </button>

                        {startError && (
                            <div style={{
                                marginTop: 12,
                                padding: '10px 14px',
                                background: 'rgba(229,138,134,0.12)',
                                border: '1px solid rgba(229,138,134,0.45)',
                                color: '#E58A86',
                                fontFamily: '"Space Mono", monospace',
                                fontSize: 11,
                                letterSpacing: '0.04em',
                            }}>
                                {startError}
                            </div>
                        )}
                    </div>

                    <div className="mar-aside">
                        <div className="mar-card">
                            <div className="mc-h">
                                <span className="ct">This Week</span>
                                <span className="cs">Top Runs</span>
                            </div>
                            {!lbLoaded ? (
                                <div className="mar-reward" style={{ padding: '14px 0' }}>Loading…</div>
                            ) : lb.length === 0 ? (
                                <div className="mar-reward" style={{ padding: '14px 0' }}>
                                    No runs yet this week. Be the first.
                                </div>
                            ) : (
                                lb.slice(0, 5).map((r) => (
                                    <div key={`${r.rank}-${r.displayName}`} className={'mar-lb' + (isMe(r.displayName) ? ' me' : '')}>
                                        <span className="rk">{r.rank}</span>
                                        <span className="nm">
                                            {r.displayName}
                                            {r.perfectRun && <span style={{ marginLeft: 6, color: 'var(--c-gold1)' }}>★</span>}
                                        </span>
                                        <span className="sc">{r.totalScore}</span>
                                    </div>
                                ))
                            )}
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
