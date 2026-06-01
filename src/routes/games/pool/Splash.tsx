import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useIsMobile } from './useIsMobile';
import './screens.css';

/**
 * Side Pocket Splash — `/play/pool/splash`.
 *
 * Port of designer's Splash from Round2Chrome.jsx + sp_chrome.css.
 * Auto-redirects to /play/pool after 1.6 seconds (a brief brand wipe).
 * Useful as a wedge between the hub Cabinet landing and the Lobby for
 * Telegram-launched users.
 */
export function Splash() {
    const navigate = useNavigate();
    const isMobile = useIsMobile();
    const surface = isMobile ? 'mob' : 'web';

    useEffect(() => {
        const t = setTimeout(() => navigate('/play/pool'), 1600);
        return () => clearTimeout(t);
    }, [navigate]);

    return (
        <div className={'ch ' + surface}>
            <div className="grain" />
            <div className="ch-splash">
                <span className="ch-est">Members Club · Est. 1952</span>
                <h1 className="ch-wm">Side<br /><em>Pocket</em></h1>
                <div className="ch-load"><i /></div>
                <span className="ch-loadt">Racking the table…</span>
            </div>
        </div>
    );
}
