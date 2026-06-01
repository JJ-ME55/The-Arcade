import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from './useIsMobile';
import './screens.css';

/**
 * Side Pocket Wager — `/play/pool/wager`.
 *
 * Port of designer's ModeSelect + StakeSelector from Round2Wager.jsx +
 * sp_wager.css. Wagered 1v1 entry flow.
 *
 * Per the user's earlier scope-clarification: SOL wagering IS in scope
 * for v1 (not deferred). This screen routes Free or Wagered + format
 * (BO1/3/5) + stake amount. Confirm + escrow happens server-side via
 * the escrow service (POL Escrow program).
 */

const STAKES = [
    { s: '0.01', usd: '$2.30' },
    { s: '0.05', usd: '$11.50' },
    { s: '0.1', usd: '$23.00' },
    { s: '0.5', usd: '$115' },
    { s: '1', usd: '$230' },
    { s: '5', usd: '$1,150' },
];

const winOf = (s: string): string => {
    const n = parseFloat(s) * 1.8;
    return n < 0.1 ? n.toFixed(3) : n < 1 ? n.toFixed(2) : n.toString();
};

export function Wager() {
    const navigate = useNavigate();
    const isMobile = useIsMobile();
    const surface = isMobile ? 'mob' : 'web';

    const [tab, setTab] = useState<'free' | 'wager'>('wager');
    const [fmt, setFmt] = useState(1);  // 0=BO1, 1=BO3, 2=BO5
    const [stakeIdx, setStakeIdx] = useState(1);  // index into STAKES
    const [step, setStep] = useState<'mode' | 'stake'>('mode');

    const wager = tab === 'wager';
    const formats = ['BO1', 'BO3', 'BO5'];

    return (
        <div className={'wf ' + surface}>
            <div className="behind" />
            <div className="grain" />
            <div className={'wf-modal' + (step === 'stake' ? ' wide' : '')}>
                <div className="wf-head">
                    <div>
                        <div className="wf-eyebrow">
                            {step === 'stake' ? 'Wagered · Pick Your Stake' : 'Play 1v1'}
                        </div>
                        <div className="wf-title">
                            {step === 'stake' ? "What's On The Table" : 'Choose Your Game'}
                        </div>
                    </div>
                    <div className="wf-bal">
                        <span className="ball">◎</span>
                        <span className="v"><b>0.42</b><u>SOL</u></span>
                    </div>
                </div>

                {step === 'mode' ? (
                    <div className="wf-body">
                        <div className="wf-tabs">
                            <button
                                className={'wf-tab free' + (!wager ? ' on' : '')}
                                onClick={() => setTab('free')}
                            >
                                Free<span className="sub">Ranked · Elo only</span>
                            </button>
                            <button
                                className={'wf-tab wager' + (wager ? ' on' : '')}
                                onClick={() => setTab('wager')}
                            >
                                Wagered<span className="sub">Real SOL stakes</span>
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(7px * var(--u))' }}>
                            <span className="wf-seg-label">Match format</span>
                            <div className="wf-seg">
                                {formats.map((f, i) => (
                                    <button key={f} className={i === fmt ? 'on' : ''} onClick={() => setFmt(i)}>
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {wager && <div className="wf-cap">10% rake on the pot · skill decides the winner · no rebuy fees</div>}
                        <button
                            className="wf-cta"
                            onClick={() => wager ? setStep('stake') : navigate('/play/pool/launch')}
                        >
                            {wager ? 'Choose Stake' : 'Find Match'}
                        </button>
                    </div>
                ) : (
                    <div className="wf-body">
                        <div className="wf-stakes">
                            {STAKES.map((t, i) => (
                                <div
                                    key={t.s}
                                    className={'wf-stake' + (i === stakeIdx ? ' on' : '')}
                                    onClick={() => setStakeIdx(i)}
                                >
                                    <div className="amt"><b>{t.s}</b><span>SOL</span></div>
                                    <div className="usd">≈ {t.usd}</div>
                                    <div className="win">
                                        <span className="winlbl">If you win</span>
                                        {winOf(t.s)} SOL
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="wf-cap">
                            Winner takes 1.8× the stake (2× pot, less 10% rake). Live SOL/USD rate from server.
                        </div>
                        <button className="wf-cta" onClick={() => navigate('/play/pool/launch')}>
                            Stake &amp; Find Match · {STAKES[stakeIdx].s} SOL
                        </button>
                        <button className="wf-cancel" onClick={() => setStep('mode')}>
                            Back to mode
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
