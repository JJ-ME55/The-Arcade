// Round2Tour.jsx — #24 pre-round waiting room, #25 round result, #26 champion.
// #25/#26 reuse the .sp-result / .mm-reveal result language (Abril stamp). The
// pre-round stage + mini bracket are .t2-*. Merged into round2_canvas.

function MiniBracket({ u = "web" }) {
  return (
    <div className="t2-br">
      <div className="t2-col"><span className="t2-rl">Semis</span>
        <div className="t2-m now"><div className="r you"><span>jjk_55</span><span className="s">—</span></div><div className="r"><span>Velvet Q</span><span className="s">—</span></div></div>
        <div className="t2-m"><div className="r"><span>Deadstroke</span><span className="s">—</span></div><div className="r"><span>KissShot</span><span className="s">—</span></div></div>
      </div>
      <div className="t2-col"><span className="t2-rl">Final</span>
        <div className="t2-m"><div className="r tbd"><span>Winner SF1</span></div><div className="r tbd"><span>Winner SF2</span></div></div>
      </div>
      <div className="t2-col"><span className="t2-rl">Cup</span>
        <div className="t2-champ-node"><span className="cr">♔</span></div>
      </div>
    </div>
  );
}

// #24 — pre-round waiting room
function PreRound({ surface = "web" }) {
  return (
    <div className={"t2 " + surface}>
      <div className="grain"></div>
      <div className="t2-pr">
        <span className="t2-kick">The Velvet Cup · Semifinal</span>
        <div className="t2-start">Starts in <b>1:23</b></div>
        <div className="t2-vs">
          <div className="t2-f"><div className="av" style={{ background: "radial-gradient(circle at 38% 30%, #2a6b4f, #143b2c 78%)" }}>J</div><div className="nm">jjk_55</div><div className="el">1,250 Elo</div></div>
          <div className="med">VS</div>
          <div className="t2-f"><div className="av" style={{ background: "radial-gradient(circle at 38% 30%, #7a3aa0, #2c1140 80%)" }}>V</div><div className="nm">Velvet Q</div><div className="el">1,238 Elo</div></div>
        </div>
        <div className="t2-h2h">Head-to-head <b>3–2</b> · you lead</div>
        <MiniBracket />
        <button className="t2-ready">Ready Up</button>
      </div>
    </div>
  );
}

// #25 — round result (won / lost a round, not the final)
function RoundResult({ surface = "web", win = true }) {
  if (surface === "mob") {
    return (
      <div className="spm mm-reveal">
        <div className="mbg"></div><div className="mveil"></div>
        <header className="m-top"><span className="m-eyebrow">Velvet Cup · <b>Semifinal</b></span></header>
        <div className="mstage">
          <div className="kick mres-kick">{win ? "Into the Final" : "Your Cup Ends Here"}</div>
          <h1 className={"mres-stamp" + (win ? "" : " lose")}>{win ? "Won" : "Out"}</h1>
          <div className="mar-mstats">
            <div className="seg"><span className="v">{win ? "5–3" : "3–5"}</span><span className="k">vs Velvet Q</span></div>
            <div className="seg"><span className="v gold">{win ? "25" : "12"}</span><span className="k">TKT {win ? "finalist" : "3rd place"}</span></div>
          </div>
          <div className="mres-cta">{win ? <button className="m-gold">Next Match</button> : <button className="m-gold">Back to Bracket</button>}<button className="m-ghost">Bracket</button></div>
        </div>
      </div>
    );
  }
  return (
    <div className="sp-result">
      <div className="res-bg"></div><div className="res-veil"></div>
      <header className="res-top"><span className="rmtag">The Velvet Cup · <b>Semifinal</b></span></header>
      <div className="res-stage">
        <div className="res-kick">{win ? "Into the Final" : "Your Cup Ends Here"}</div>
        <h1 className={"res-stamp" + (win ? "" : " lose")}>{win ? "Semifinal Won" : "Eliminated"}</h1>
        <div className="t2-prize">
          <div className="seg"><span className="k">Final Score</span><span className="v">{win ? "5 — 3" : "3 — 5"} vs Velvet Q</span></div>
          <div className="seg"><span className="k">Prize Tier</span><span className="v up">{win ? "Now guaranteed: 25 TKT (finalist)" : "3rd place: 12 TKT"}</span></div>
        </div>
        <div className="res-cta">{win ? <button className="res-rematch">Next Match</button> : <button className="res-rematch">Back to Bracket</button>}<button className="res-lobby">View Bracket</button></div>
      </div>
    </div>
  );
}

// #26 — champion card (bigger than a normal victory)
function Champion({ surface = "web" }) {
  if (surface === "mob") {
    return (
      <div className="spm mm-reveal">
        <div className="mbg"></div><div className="mveil"></div>
        <header className="m-top"><span className="m-eyebrow">The Velvet Cup</span></header>
        <div className="mstage">
          <div className="t2-crown" style={{ fontSize: 40 }}>♔</div>
          <h1 className="mres-stamp">Champion</h1>
          <div className="t2-badge">Velvet Cup · Winner</div>
          <div className="mar-mstats"><div className="seg"><span className="v gold">120 TKT</span><span className="k">Prize</span></div><div className="seg"><span className="v">7</span><span className="k">Beaten</span></div></div>
          <div className="mres-cta"><button className="m-gold">Share</button><button className="m-ghost">Lobby</button></div>
        </div>
      </div>
    );
  }
  return (
    <div className="sp-result">
      <div className="res-bg"></div><div className="res-veil"></div>
      <header className="res-top"><span className="rmtag">The Velvet Cup · <b>The Final</b></span></header>
      <div className="res-stage">
        <div className="t2-crown">♔</div>
        <h1 className="res-stamp">Champion</h1>
        <div className="t2-badge">Velvet Cup · Winner · Est. tonight</div>
        <div className="t2-prize">
          <div className="seg"><span className="k">Cup Prize</span><span className="t2-prizebig">120 TKT</span></div>
          <div className="seg"><span className="k">Players Beaten</span><span className="v">7 of 8 · bracket cleared</span></div>
          <div className="seg"><span className="k">Title</span><span className="v up">Velvet Cup Champion</span></div>
        </div>
        <div className="res-cta"><button className="res-rematch">Share Win</button><button className="res-lobby">Back to Lobby</button></div>
      </div>
    </div>
  );
}

Object.assign(window, { PreRound, RoundResult, Champion });