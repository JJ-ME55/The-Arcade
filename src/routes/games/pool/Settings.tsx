import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from './useIsMobile';
import './screens.css';

/**
 * Side Pocket Settings — `/play/pool/settings`.
 *
 * Port of designer's GameSettings from Round2Meta2.jsx + sp_tour2.css
 * (.gs-* styles). Aiming guideline · english physics · table theme ·
 * sound. Cosmetic toggles only — none affect skill / Elo per the
 * "skill only, no luck" design rule.
 *
 * V1 — UI state local, no persistence. Wire to user-prefs API later.
 */

export function Settings() {
    const navigate = useNavigate();
    const isMobile = useIsMobile();
    const surface = isMobile ? 'mob' : 'web';

    const [aim, setAim] = useState<'on' | 'short' | 'off'>('on');
    const [english, setEnglish] = useState(true);
    const [sfx, setSfx] = useState(true);
    const [ambience, setAmbience] = useState(false);
    const [theme, setTheme] = useState(0);
    const [volume] = useState(70);

    return (
        <div className={'t2 ' + surface}>
            <div className="grain" />
            <div className="gs-card">
                <div className="gs-head">
                    <div className="eb">Settings</div>
                    <div className="ti">Game</div>
                </div>
                <div className="gs-body">
                    <div className="gs-sh">Aiming</div>

                    <div className="gs-row">
                        <span className="gs-lab">
                            Aim guideline
                            <span className="d">Projected cue line + ghost ball</span>
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 'calc(10px * var(--u))' }}>
                            <span className="gs-prev">
                                <span className="ln" />
                                <span className="gh" />
                            </span>
                            <span className="gs-seg">
                                <button className={aim === 'on' ? 'on' : ''} onClick={() => setAim('on')}>On</button>
                                <button className={aim === 'short' ? 'on' : ''} onClick={() => setAim('short')}>Short</button>
                                <button className={aim === 'off' ? 'on' : ''} onClick={() => setAim('off')}>Off</button>
                            </span>
                        </span>
                    </div>

                    <div className="gs-row">
                        <span className="gs-lab">
                            English physics
                            <span className="d">Full spin · off reduces to display-only</span>
                        </span>
                        <span className={'gs-tog' + (english ? '' : ' off')} onClick={() => setEnglish(!english)} />
                    </div>

                    <div className="gs-sh">Table</div>

                    <div className="gs-row">
                        <span className="gs-lab">
                            Cue &amp; felt theme
                            <span className="d">Cosmetic · more coming</span>
                        </span>
                        <span className="gs-theme">
                            {['#1E5FA8', '#1b5a3e', '#5e2c7a'].map((c, i) => (
                                <i
                                    key={i}
                                    style={{
                                        background: c,
                                        boxShadow: i === theme ? '0 0 0 2px var(--c-brass)' : undefined,
                                        cursor: 'pointer',
                                    }}
                                    onClick={() => setTheme(i)}
                                />
                            ))}
                        </span>
                    </div>

                    <div className="gs-sh">Sound</div>

                    <div className="gs-row">
                        <span className="gs-lab">
                            Match sound effects
                            <span className="d">Cue, pocket, break</span>
                        </span>
                        <span className={'gs-tog' + (sfx ? '' : ' off')} onClick={() => setSfx(!sfx)} />
                    </div>

                    <div className="gs-row">
                        <span className="gs-lab">
                            Pub ambience
                            <span className="d">Low after-hours loop</span>
                        </span>
                        <span className={'gs-tog' + (ambience ? '' : ' off')} onClick={() => setAmbience(!ambience)} />
                    </div>

                    <div className="gs-row">
                        <span className="gs-lab">Master volume</span>
                        <span className="gs-sl">
                            <i style={{ width: volume + '%' }} />
                            <span className="k" style={{ left: volume + '%' }} />
                        </span>
                    </div>

                    <div className="gs-sh">Account</div>

                    <div className="gs-row">
                        <span className="gs-lab">
                            Back to lobby
                            <span className="d">Return to the Side Pocket main menu</span>
                        </span>
                        <button
                            style={{
                                background: 'rgba(255,255,255,0.04)',
                                padding: '10px 18px',
                                border: '1px solid var(--c-line-2)',
                                color: 'var(--c-cream)',
                                fontFamily: '"Bitter", Georgia, serif',
                                fontWeight: 700,
                                fontSize: 12,
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                cursor: 'pointer',
                                borderRadius: 0,
                            }}
                            onClick={() => navigate('/play/pool')}
                        >
                            Exit
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
