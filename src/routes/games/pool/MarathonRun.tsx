import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useIsMobile } from './useIsMobile';
import {
    cashOutRun,
    abandonRun,
    recordSetupOutcome,
    getArcadeSession,
    type MarathonRun as RunState,
    type MarathonSetup,
} from './marathonApi';
import './screens.css';

/**
 * Side Pocket Marathon Run — `/play/pool/marathon/run/:runId`.
 *
 * Live trick-shot run state UI. Shows current setup, lives, streak,
 * score, plus action buttons (Manual Complete / Manual Skip / Bank
 * Streak / Abandon).
 *
 * Phase C1 limitation: the actual pool game is NOT yet wired to detect
 * outcomes automatically. Manual buttons let you simulate the loop —
 * server is honest about what happened, ledger credits, leaderboard
 * updates. This proves the full API → DB → UI cycle.
 *
 * Phase C2 (next): replace manual buttons with in-iframe game integration —
 * target-ball overlay, ball-pot event subscription, outcome auto-detect.
 */

export function MarathonRun() {
    const { runId } = useParams<{ runId: string }>();
    const navigate = useNavigate();
    const isMobile = useIsMobile();
    const surface = isMobile ? 'mob' : 'web';

    const [run, setRun] = useState<RunState | null>(null);
    const [setup, setSetup] = useState<MarathonSetup | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastResult, setLastResult] = useState<{
        gold?: number;
        tickets?: number;
        ended?: boolean;
    } | null>(null);

    // Bootstrap from sessionStorage if the entry screen stashed it.
    useEffect(() => {
        if (!runId) return;
        const stashed = sessionStorage.getItem(`marathon_setup_${runId}`);
        if (stashed) {
            try { setSetup(JSON.parse(stashed)); } catch { /* ignore */ }
        }
    }, [runId]);

    if (!runId) {
        navigate('/play/pool/marathon');
        return null;
    }

    const session = getArcadeSession();
    if (!session) {
        return (
            <div className={'mar ' + surface}>
                <div className="grain" />
                <div className="mar-entry">
                    <div className="mar-e-top">
                        <button className="mar-e-back" onClick={() => navigate('/play/pool/marathon')}>‹</button>
                        <span className="mar-e-eyebrow">Marathon · Session Required</span>
                    </div>
                    <div style={{ padding: '60px 40px', textAlign: 'center' }}>
                        <h2 style={{ fontFamily: '"Abril Fatface", serif', fontSize: 36, color: '#F1EAD6' }}>
                            Sign In to Resume
                        </h2>
                        <p style={{ color: '#B7AE92', marginTop: 16 }}>
                            Open Side Pocket from @TheArcadeGG_Bot to continue this run.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const recordOutcome = async (outcome: 'completed' | 'lives_exhausted' | 'skipped', livesUsed = 0) => {
        if (!setup || busy) return;
        setBusy(true);
        setError(null);
        try {
            const r = await recordSetupOutcome(session, runId, {
                setupId: setup.id,
                outcome,
                livesUsedThisRound: livesUsed,
            });
            if (r.ok) {
                if (r.run) setRun(r.run);
                if (r.nextSetup) {
                    setSetup(r.nextSetup);
                    sessionStorage.setItem(`marathon_setup_${runId}`, JSON.stringify(r.nextSetup));
                }
                setLastResult({ gold: r.gold, tickets: r.milestoneTickets, ended: r.runEnded });
                if (r.runEnded) {
                    // Run is over — give the result a beat to land, then bounce
                    setTimeout(() => navigate('/play/pool/marathon'), 3000);
                }
            } else {
                setError(r.error || 'Server error');
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Network error');
        } finally {
            setBusy(false);
        }
    };

    const handleCashOut = async () => {
        if (busy) return;
        setBusy(true);
        setError(null);
        try {
            const r = await cashOutRun(session, runId);
            if (r.ok) {
                if (r.run) setRun(r.run);
                setLastResult({
                    gold: r.run?.earnedGold,
                    tickets: r.run?.earnedTickets,
                    ended: true,
                });
                setTimeout(() => navigate('/play/pool/marathon'), 3000);
            } else {
                setError(r.error || 'Cash-out failed');
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Network error');
        } finally {
            setBusy(false);
        }
    };

    const handleAbandon = async () => {
        if (busy) return;
        if (!window.confirm('Abandon this run? Your unbanked score will be lost.')) return;
        setBusy(true);
        try {
            await abandonRun(session, runId);
        } finally {
            navigate('/play/pool/marathon');
        }
    };

    const livesRemaining = run?.livesRemaining ?? 3;
    const livesTotal = run?.livesAtStart ?? 3;

    return (
        <div className={'mar ' + surface}>
            <div className="grain" />
            <div className="mar-entry">
                <div className="mar-e-top">
                    <button className="mar-e-back" onClick={handleAbandon}>‹</button>
                    <span className="mar-e-eyebrow">Marathon · Run {runId.slice(-6)}</span>
                </div>

                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '20px 40px 40px',
                    gap: 20,
                }}>
                    {/* Live stats bar */}
                    <div style={{
                        display: 'flex',
                        gap: 32,
                        alignItems: 'baseline',
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                    }}>
                        <Stat label="Lives" big>
                            <span className="mar-lives" style={{ verticalAlign: 'middle' }}>
                                {Array.from({ length: livesTotal }).map((_, i) => (
                                    <i key={i} className={'mar-life' + (i < livesRemaining ? '' : ' lost')} />
                                ))}
                            </span>
                        </Stat>
                        <Stat label="Streak" big>
                            <span style={{ color: '#F6E9BE', fontFamily: '"Abril Fatface", serif', fontSize: 42 }}>
                                {run?.currentStreak ?? 0}
                            </span>
                        </Stat>
                        <Stat label="Score">
                            <span style={{ fontFamily: '"Space Mono", monospace', fontSize: 22 }}>
                                {run?.totalScore ?? 0}
                            </span>
                        </Stat>
                        <Stat label="Gold">
                            <span style={{ color: '#9BE067', fontFamily: '"Space Mono", monospace', fontSize: 22 }}>
                                +{run?.earnedGold ?? 0}
                            </span>
                        </Stat>
                        <Stat label="Tickets">
                            <span style={{ color: '#9BE067', fontFamily: '"Space Mono", monospace', fontSize: 22 }}>
                                +{run?.earnedTickets ?? 0}
                            </span>
                        </Stat>
                    </div>

                    {/* Current setup card */}
                    {setup && (
                        <div style={{
                            background: 'rgba(12,22,15,0.7)',
                            border: '1px solid rgba(201,162,74,0.5)',
                            padding: '24px 32px',
                            textAlign: 'center',
                            minWidth: 380,
                            maxWidth: 560,
                        }}>
                            <div style={{
                                fontFamily: '"Space Mono", monospace',
                                fontSize: 10,
                                letterSpacing: '0.3em',
                                textTransform: 'uppercase',
                                color: '#C9A24A',
                            }}>
                                Setup {setup.id} · Tier {setup.tier}
                            </div>
                            <div style={{
                                fontFamily: '"Abril Fatface", serif',
                                fontSize: 36,
                                lineHeight: 1.1,
                                marginTop: 8,
                            }}>
                                {setup.name}
                            </div>
                            {setup.hint && (
                                <div style={{
                                    fontStyle: 'italic',
                                    color: '#B7AE92',
                                    marginTop: 12,
                                    fontSize: 14,
                                }}>
                                    {setup.hint}
                                </div>
                            )}
                            <div style={{
                                fontFamily: '"Space Mono", monospace',
                                color: '#F6E9BE',
                                fontSize: 13,
                                marginTop: 16,
                            }}>
                                +{setup.goldReward} G if you complete
                            </div>
                        </div>
                    )}

                    {/* Last outcome banner */}
                    {lastResult && (
                        <div style={{
                            background: lastResult.gold && lastResult.gold > 0
                                ? 'rgba(155,224,103,0.15)'
                                : 'rgba(229,138,134,0.15)',
                            border: '1px solid ' + (lastResult.gold && lastResult.gold > 0
                                ? 'rgba(155,224,103,0.5)'
                                : 'rgba(229,138,134,0.5)'),
                            padding: '12px 20px',
                            fontFamily: '"Space Mono", monospace',
                            fontSize: 13,
                            color: '#F1EAD6',
                        }}>
                            {lastResult.gold && lastResult.gold > 0 ? '✓ ' : '✗ '}
                            +{lastResult.gold ?? 0} G
                            {lastResult.tickets && lastResult.tickets > 0 && ` · +${lastResult.tickets} TKT milestone`}
                            {lastResult.ended && ' · Run ended — returning to lobby…'}
                        </div>
                    )}

                    {/* Action buttons — Phase C1 manual mode. C2 replaces these
                        with auto-detected outcomes from the game iframe. */}
                    {!lastResult?.ended && (
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                            <ActionButton
                                disabled={busy}
                                onClick={() => recordOutcome('completed', 0)}
                                kind="primary"
                            >
                                ✓ Completed
                            </ActionButton>
                            <ActionButton
                                disabled={busy}
                                onClick={() => recordOutcome('lives_exhausted', 1)}
                                kind="danger"
                            >
                                ✗ Missed (-1 Life)
                            </ActionButton>
                            <ActionButton
                                disabled={busy}
                                onClick={() => recordOutcome('skipped', 0)}
                                kind="ghost"
                            >
                                ↪ Skip
                            </ActionButton>
                            <ActionButton
                                disabled={busy || !run || run.setupsCompleted === 0}
                                onClick={handleCashOut}
                                kind="cashout"
                            >
                                💰 Bank Streak
                            </ActionButton>
                        </div>
                    )}

                    {error && (
                        <div style={{
                            color: '#E58A86',
                            fontFamily: '"Space Mono", monospace',
                            fontSize: 12,
                        }}>
                            {error}
                        </div>
                    )}

                    <div style={{
                        marginTop: 16,
                        fontFamily: '"Space Mono", monospace',
                        fontSize: 10,
                        letterSpacing: '0.16em',
                        textTransform: 'uppercase',
                        color: '#6E6750',
                        textAlign: 'center',
                        maxWidth: 520,
                    }}>
                        V1 manual mode — buttons let you simulate outcomes while we wire the
                        in-iframe game integration. Server records everything for real.
                    </div>
                </div>
            </div>
        </div>
    );
}

function Stat({ label, big, children }: { label: string; big?: boolean; children: React.ReactNode }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div>{children}</div>
            <div style={{
                fontFamily: '"Space Mono", monospace',
                fontSize: big ? 9 : 8,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: '#B7AE92',
            }}>
                {label}
            </div>
        </div>
    );
}

function ActionButton({
    onClick,
    disabled,
    kind,
    children,
}: {
    onClick: () => void;
    disabled?: boolean;
    kind: 'primary' | 'danger' | 'ghost' | 'cashout';
    children: React.ReactNode;
}) {
    const styles: Record<string, React.CSSProperties> = {
        primary: {
            background: 'linear-gradient(180deg, #F4E2A6, #DCB85F 48%, #BD9038)',
            color: '#1A1206',
            border: 'none',
        },
        danger: {
            background: 'linear-gradient(180deg, rgba(229,138,134,0.2), rgba(122,36,32,0.4))',
            color: '#E58A86',
            border: '1px solid rgba(229,138,134,0.5)',
        },
        ghost: {
            background: 'rgba(255,255,255,0.04)',
            color: '#F1EAD6',
            border: '1px solid rgba(201,162,74,0.5)',
        },
        cashout: {
            background: 'linear-gradient(180deg, #EFFAD8, #9BE067 60%, #6fae3e)',
            color: '#0F1B14',
            border: 'none',
        },
    };
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            style={{
                padding: '14px 22px',
                fontFamily: '"Bitter", serif',
                fontWeight: 800,
                fontSize: 14,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
                ...styles[kind],
            }}
        >
            {children}
        </button>
    );
}
