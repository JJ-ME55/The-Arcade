import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from './useIsMobile';
import './screens.css';

/**
 * Side Pocket Async — `/play/pool/async`.
 *
 * Port of designer's AsyncWait + InviteLink from Round2Async.jsx +
 * sp_async.css. The async match flow (waiting for opponent's turn,
 * private match invite link).
 *
 * V1 — mock data. Two views toggled via the URL param `?view=wait`
 * (default) or `?view=invite`.
 */

export function Async() {
    const navigate = useNavigate();
    const isMobile = useIsMobile();
    const surface = isMobile ? 'mob' : 'web';

    const [notif, setNotif] = useState(true);

    return (
        <div className={'aw ' + surface}>
            <div className="frozen">
                {/* Static dimmed felt placeholder — designer uses PoolTable here.
                    For v1 we use a CSS gradient to imply the table beneath. */}
                <div style={{
                    width: '70%',
                    height: '70%',
                    background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(40,120,80,0.45) 0%, transparent 70%)',
                    borderRadius: 12,
                }} />
            </div>
            <div className="veil" />

            <div className="aw-panel">
                <span className="aw-kick">Async Match · Their Turn</span>
                <div className="aw-opp">
                    <span className="av">V</span>
                    <span className="nm">Velvet Q</span>
                </div>
                <div className="aw-cd">11h 23m</div>
                <span className="aw-cdl">left for @VelvetQ's turn</span>

                <div className="aw-toggle">
                    <span
                        className={'aw-sw' + (notif ? '' : ' off')}
                        onClick={() => setNotif(!notif)}
                        style={{ cursor: 'pointer' }}
                    />
                    <span>Notify me when they shoot</span>
                </div>

                <div className="aw-cta">
                    <button className="b ghost" onClick={() => navigate('/play')}>Watch More Pool</button>
                    <button className="b gold" onClick={() => navigate('/play/pool')}>Back to Lobby</button>
                </div>
            </div>
        </div>
    );
}
