import { useNavigate } from 'react-router-dom';
import { useIsMobile } from './useIsMobile';
import './screens.css';

/**
 * Side Pocket Tournament — `/play/pool/tournament`.
 *
 * Port of designer's PreRound + MiniBracket from Round2Tour.jsx + sp_tour2.css.
 * Pre-round waiting room with mini bracket showing your path through the
 * cup. V1 — mock semifinal vs Velvet Q.
 */

function MiniBracket() {
    return (
        <div className="t2-br">
            <div className="t2-col">
                <span className="t2-rl">Semis</span>
                <div className="t2-m now">
                    <div className="r you"><span>jjk_55</span><span className="s">—</span></div>
                    <div className="r"><span>Velvet Q</span><span className="s">—</span></div>
                </div>
                <div className="t2-m">
                    <div className="r"><span>Deadstroke</span><span className="s">—</span></div>
                    <div className="r"><span>KissShot</span><span className="s">—</span></div>
                </div>
            </div>
            <div className="t2-col">
                <span className="t2-rl">Final</span>
                <div className="t2-m">
                    <div className="r tbd"><span>Winner SF1</span></div>
                    <div className="r tbd"><span>Winner SF2</span></div>
                </div>
            </div>
            <div className="t2-col">
                <span className="t2-rl">Cup</span>
                <div className="t2-champ-node"><span className="cr">♔</span></div>
            </div>
        </div>
    );
}

export function Tournament() {
    const navigate = useNavigate();
    const isMobile = useIsMobile();
    const surface = isMobile ? 'mob' : 'web';

    return (
        <div className={'t2 ' + surface}>
            <div className="grain" />
            <div className="t2-pr">
                <span className="t2-kick">The Velvet Cup · Semifinal</span>
                <div className="t2-start">Starts in <b>1:23</b></div>

                <div className="t2-vs">
                    <div className="t2-f">
                        <div className="av" style={{ background: 'radial-gradient(circle at 38% 30%, #2a6b4f, #143b2c 78%)' }}>J</div>
                        <div className="nm">jjk_55</div>
                        <div className="el">1,250 Elo</div>
                    </div>
                    <div className="med">VS</div>
                    <div className="t2-f">
                        <div className="av" style={{ background: 'radial-gradient(circle at 38% 30%, #7a3aa0, #2c1140 80%)' }}>V</div>
                        <div className="nm">Velvet Q</div>
                        <div className="el">1,238 Elo</div>
                    </div>
                </div>

                <div className="t2-h2h">Head-to-head <b>3–2</b> · you lead</div>

                <MiniBracket />

                <button className="t2-ready" onClick={() => navigate('/play/pool/launch')}>
                    Ready Up
                </button>
            </div>
        </div>
    );
}
