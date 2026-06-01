import { useNavigate } from 'react-router-dom';
import './lobby.css';

/**
 * Side Pocket Lobby — `/play/pool`.
 *
 * Port of the designer's MainMenuClub variant from Round 2
 * (SidePocketApp.jsx + sp_club.css). Photoreal-render direction with
 * a swappable room plate and crisp UI overlaid — no left nav, no
 * bottom room cards.
 *
 * Designer-locked palette:
 *   --c-cream:   #F1EAD6   warm paper foreground
 *   --c-brass:   #C9A24A   keylines + brass marks
 *   --c-gold1/2/3 — gradient stops for the foil "Side Pocket" wordmark
 *
 * Background plate (.club-plate) defaults to a CSS gradient that
 * approximates the dark-green pool room mood from the mockup. Drop the
 * designer's photoreal render into /public/assets/pool/rack-green.png
 * to replace the placeholder.
 *
 * Currency chips (SOL / TKT / G) show MOCK VALUES for v1 visual ship.
 * Wire real balances from the wallet/escrow services in a follow-up.
 *
 * Routes wired:
 *   Play 1v1     →  /play/pool/launch  (iframe match)
 *   Tournaments  →  /play/pool/launch  (placeholder — tournament flow TBD)
 *   Settings ⚙   →  hub /wallet         (closest analogue for now)
 *   Back chevron (top-left of designer's wordmark) — not present in
 *     Club variant per spec; back-to-arcade lives in the gear button
 *     for now.
 */
export function PoolLobby() {
  const navigate = useNavigate();

  return (
    <div className="sp-club">
      <div className="club-plate" />
      <div className="club-scrim" />

      <div className="club-top">
        <div className="club-wm">
          {/* Wordmark is rendered in the hero — keep top-left empty for breathing room */}
        </div>

        <div className="club-wallet">
          {/* SOL balance chip — glossy resin ball + mono readout */}
          <div className="club-sol" title="SOL balance">
            <span className="solball">◎</span>
            <span className="solval"><b>0.42</b><u>SOL</u></span>
          </div>

          {/* Player signet — avatar + name + prestige + ELO */}
          <div className="csignet">
            <span className="av">J</span>
            <span className="cval">
              <b>jjk_55</b>
              <span className="tiers">
                <span className="prestige">Gold III</span>
                <span className="elo">1,250 Elo</span>
              </span>
            </span>
          </div>

          <button
            className="club-gear"
            title="Settings"
            onClick={() => navigate('/play/pool/settings')}
            aria-label="Settings"
          >
            ⚙
          </button>
        </div>
      </div>

      <div className="club-hero">
        <div className="club-kick">Members Club · Est. 1952</div>
        <h1 className="club-head">Side<br /><em>Pocket</em></h1>
        <div className="club-tagline">Skill only. No luck.</div>

        <div className="club-online">
          <i />
          <b>2,317</b>&nbsp;<span>players online</span>
        </div>

        <div className="club-cta">
          {/* PLAY — primary brushed-gold CTA */}
          <button
            className="club-play"
            onClick={() => navigate('/play/pool/launch')}
          >
            <span className="pico">
              {/* Pool rack triangle — 6 balls stacked */}
              <svg viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12"   cy="5"  r="2.3" />
                <circle cx="8.6"  cy="11" r="2.3" />
                <circle cx="15.4" cy="11" r="2.3" />
                <circle cx="5.2"  cy="17" r="2.3" />
                <circle cx="12"   cy="17" r="2.3" />
                <circle cx="18.8" cy="17" r="2.3" />
              </svg>
            </span>
            <span className="ptxt">
              <span className="t">Play 1v1</span>
              <span className="s">Classic 8-Ball</span>
            </span>
            <span className="parr">›</span>
          </button>

          {/* Tournaments — secondary emerald-glass CTA */}
          <button
            className="club-tour"
            onClick={() => navigate('/play/pool/tournament')}
          >
            <span className="tico">
              {/* Trophy icon */}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9a6 6 0 0 0 12 0V3H6z" />
                <path d="M6 4H3v2a3 3 0 0 0 3 3" />
                <path d="M18 4h3v2a3 3 0 0 1-3 3" />
                <path d="M12 15v4" />
                <path d="M8 21h8" />
                <path d="M9 21v-2h6v2" />
              </svg>
            </span>
            <span className="ttxt">
              <span className="t">Tournaments</span>
              <span className="s">Daily Free · starts 12:34</span>
            </span>
            <span className="tarr">›</span>
          </button>
        </div>
      </div>
    </div>
  );
}
