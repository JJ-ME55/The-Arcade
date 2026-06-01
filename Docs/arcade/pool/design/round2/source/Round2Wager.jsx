// Round2Wager.jsx — Wagered 1v1 flow (chrome modals/cards). One component tree;
// the host wrapper <div class="wf web|mob"> sets the scale. Reuses brand tokens
// from sp_wager.css. Free = gold/lime; Wagered = brass+ink "real money" weight.

const STAKES = [
  { s: "0.01", usd: "$2.30" }, { s: "0.05", usd: "$11.50" }, { s: "0.1", usd: "$23.00" },
  { s: "0.5", usd: "$115" }, { s: "1", usd: "$230" }, { s: "5", usd: "$1,150" },
];
const winOf = (s) => { const n = parseFloat(s) * 1.8; return (n < 0.1 ? n.toFixed(3) : n < 1 ? n.toFixed(2) : n.toString()); };

function Behind() { return <React.Fragment><div className="behind"></div><div className="grain"></div></React.Fragment>; }
function SolBal({ v = "0.42" }) {
  return <div className="wf-bal"><span className="ball">◎</span><span className="v"><b>{v}</b><u>SOL</u></span></div>;
}

// #1 — Mode Select (Free / Wagered) + format + FIND MATCH
function ModeSelect({ tab = "wager", provisional = false, fmt = 1 }) {
  const wager = tab === "wager";
  const formats = ["BO1", "BO3", "BO5"];
  return (
    <React.Fragment>
      <Behind />
      <div className="wf-modal">
        <div className="wf-head">
          <div><div className="wf-eyebrow">Play 1v1</div><div className="wf-title">Choose Your Game</div></div>
          <SolBal />
        </div>
        <div className="wf-body">
          <div className="wf-tabs">
            <button className={"wf-tab free" + (!wager ? " on" : "")}>Free<span className="sub">Ranked · Elo only</span></button>
            <button className={"wf-tab wager" + (wager ? " on" : "")}>Wagered<span className="sub">{wager ? "Stake real SOL" : "Real SOL stakes"}</span></button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "calc(7px * var(--u))" }}>
            <span className="wf-seg-label">Match format</span>
            <div className="wf-seg">{formats.map((f, i) => <button key={f} className={i === fmt ? "on" : ""}>{f}</button>)}</div>
          </div>

          {wager && provisional ? (
            <React.Fragment>
              <div className="wf-note"><span className="ic">!</span><span>Wagered play unlocks after <b>25 ranked matches</b>. You've played 12 — keep climbing to stake real SOL.</span></div>
              <button className="wf-cta ghost">Play a Ranked Match</button>
            </React.Fragment>
          ) : (
            <React.Fragment>
              {wager && <div className="wf-cap">10% rake on the pot · skill decides the winner · no rebuy fees</div>}
              <button className="wf-cta">{wager ? "Find Match" : "Find Match"}</button>
            </React.Fragment>
          )}
        </div>
      </div>
    </React.Fragment>
  );
}

// #2 — Stake selector
function StakeSelector({ sel = 4, insufficient = false }) {
  return (
    <React.Fragment>
      <Behind />
      <div className="wf-modal wide">
        <div className="wf-head">
          <div><div className="wf-eyebrow">Wagered · Pick Your Stake</div><div className="wf-title">What's On The Table</div></div>
          <SolBal v="0.42" />
        </div>
        <div className="wf-body">
          <div className="wf-stakes">
            {STAKES.map((t, i) => (
              <div key={t.s} className={"wf-stake" + (i === sel ? " on" : "")}>
                <div className="amt"><b>{t.s}</b><span>SOL</span></div>
                <div className="usd">≈ {t.usd}</div>
                <div className="win"><span className="winlbl">If you win</span>{winOf(t.s)} SOL</div>
              </div>
            ))}
          </div>
          <div className="wf-cap">Winner takes 1.8× the stake (2× pot, less 10% rake). Live SOL/USD rate from server.</div>
          {insufficient
            ? <button className="wf-cta danger">Top Up to Play · need {STAKES[sel].s} SOL</button>
            : <button className="wf-cta">Stake &amp; Find Match · {STAKES[sel].s} SOL</button>}
        </div>
      </div>
    </React.Fragment>
  );
}

// #3 — Top up SOL
function TopUp() {
  return (
    <React.Fragment>
      <Behind />
      <div className="wf-modal">
        <div className="wf-head">
          <div><div className="wf-eyebrow">Wallet</div><div className="wf-title">Top Up SOL</div></div>
          <SolBal v="0.04" />
        </div>
        <div className="wf-body">
          <div className="wf-cap" style={{ textAlign: "left" }}>Add SOL to your in-game wallet to stake. Settles in seconds.</div>
          <div className="wf-opt"><span className="oic"></span><span><span className="ot">Apple&nbsp;Pay</span><span className="os">Instant · via Privy</span></span><span className="arr">›</span></div>
          <div className="wf-opt"><span className="oic">▭</span><span><span className="ot">Debit / Credit Card</span><span className="os">Instant · via Privy</span></span><span className="arr">›</span></div>
          <div className="wf-opt"><span className="oic">◎</span><span><span className="ot">Paste SOL from another wallet</span><span className="os">Send to your deposit address</span></span><span className="arr">›</span></div>
          <button className="wf-cancel">Back to stakes</button>
        </div>
      </div>
    </React.Fragment>
  );
}

// #4 — Confirm stake (escrow) modal
function ConfirmStake({ stake = "0.05" }) {
  return (
    <React.Fragment>
      <Behind />
      <div className="wf-modal">
        <div className="wf-head"><div><div className="wf-eyebrow">Wagered · Confirm</div><div className="wf-title">Lock It In</div></div></div>
        <div className="wf-body">
          <div className="wf-rows">
            <div className="wf-row big"><span className="k">Your stake</span><span className="vv">{stake} SOL</span></div>
            <div className="wf-row big"><span className="k">If you win</span><span className="vv up">{winOf(stake)} SOL</span></div>
            <div className="wf-row fine"><span className="k">Treasury cut (7%)</span><span className="vv">{(parseFloat(stake) * 2 * 0.07).toFixed(4)} SOL</span></div>
            <div className="wf-row fine"><span className="k">Ops cut (3%)</span><span className="vv">{(parseFloat(stake) * 2 * 0.03).toFixed(4)} SOL</span></div>
          </div>
          <div className="wf-cap" style={{ textAlign: "left" }}>Your stake is held in escrow until the frame settles. Skill decides — no house edge on the play.</div>
          <div className="wf-ctarow">
            <button className="wf-cta ghost" style={{ flex: "0 0 38%" }}>Cancel</button>
            <button className="wf-cta" style={{ flex: 1 }}>Confirm &amp; Escrow</button>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}

// #6 — Wagered Pool Card. SAME screen as the Round 1 Match Result (sp-result /
// mm-reveal), with the rewards row swapped for a SOL payout breakdown. One package.
function WagerPayout({ win = true, stake = "0.05", surface = "web" }) {
  const pot = (parseFloat(stake) * 2).toFixed(2);
  const pay = win ? "+" + (parseFloat(stake) * 1.8).toFixed(2) : "−" + stake;
  const bal = win ? "0.47" : "0.37";
  const treasury = (parseFloat(stake) * 2 * 0.07).toFixed(4);
  const ops = (parseFloat(stake) * 2 * 0.03).toFixed(4);
  const L = win ? "5" : "3", R = win ? "3" : "5";

  if (surface === "mob") {
    return (
      <div className="spm mm-reveal">
        <div className="mbg"></div><div className="mveil"></div>
        <header className="m-top"><span className="m-eyebrow">Wagered · <b>{stake} SOL</b></span></header>
        <div className="mstage">
          <div className="kick mres-kick">{win ? "You Take The Pot" : "The House Keeps It"}</div>
          <h1 className={"mres-stamp" + (win ? "" : " lose")}>{win ? "Victory" : "Defeat"}</h1>
          <div className="mres-score">
            <div className={"mres-pl" + (win ? " win" : "")}><div className="pp" style={{ background: "radial-gradient(circle at 38% 30%, #2a6b4f, #143b2c 78%)" }}>J</div><div className="pn">jjk_55</div></div>
            <div className="mres-vs">{L}<span className="d">—</span>{R}</div>
            <div className={"mres-pl" + (win ? "" : " win")}><div className="pp" style={{ background: "radial-gradient(circle at 38% 30%, #7a3aa0, #2c1140 80%)" }}>V</div><div className="pn">Velvet Q</div></div>
          </div>
          <div className="mres-payout">
            <div className="seg"><span className="pl2">Payout</span><span className={"pv " + (win ? "up" : "down")}>{pay} SOL</span></div>
            <div className="seg"><span className="pl2">Balance</span><span className="pv">{bal}</span></div>
            <div className="seg"><span className="pl2">TX</span><span className="tx">Solscan ↗</span></div>
          </div>
          <div className="mres-fine">Pot {pot} SOL · treasury {treasury} · ops {ops}</div>
          <div className="mres-cta"><button className="m-gold">Rematch</button><button className="m-ghost">New Match</button></div>
        </div>
      </div>
    );
  }

  return (
    <div className="sp-result">
      <div className="res-bg"></div><div className="res-veil"></div>
      <header className="res-top"><span className="rmtag"><b>Wagered</b> · Ranked · {stake} SOL on the table</span></header>
      <div className="res-stage">
        <div className="res-kick">{win ? "You Take The Pot" : "The House Keeps It"}</div>
        <h1 className={"res-stamp" + (win ? "" : " lose")}>{win ? "Victory" : "Defeat"}</h1>
        <div className="res-score">
          <div className={"res-pl " + (win ? "win" : "lose")}><div className="pp">J</div><div className="pn">jjk_55</div><div className="tag">{win ? "Winner" : "Defeated"}</div></div>
          <div className="res-vs">{L}<span className="dash">—</span>{R}</div>
          <div className={"res-pl " + (win ? "lose" : "win")}><div className="pp">V</div><div className="pn">Velvet Q</div><div className="tag">{win ? "Defeated" : "Winner"}</div></div>
        </div>
        <div className="res-payout">
          <div className="seg"><span className="pl2">Payout</span><span className={"pv " + (win ? "up" : "down")}>{pay} SOL</span><span className="fine">→ {bal} SOL balance</span></div>
          <div className="seg"><span className="pl2">The Pot</span><span className="pv">{pot} SOL</span><span className="fine">{stake} staked · 1.8× to win</span></div>
          <div className="seg"><span className="pl2">Settlement</span><span className="fine">Treasury {treasury} · Ops {ops}</span><span className="tx">View on Solscan ↗</span></div>
        </div>
        <div className="res-cta"><button className="res-rematch">Rematch</button><button className="res-lobby">New Match</button></div>
      </div>
    </div>
  );
}

Object.assign(window, { ModeSelect, StakeSelector, TopUp, ConfirmStake, WagerPayout });