// Round2Marathon.jsx — Marathon trick-shot lives mode. Reuses PoolTable, the
// .spg/.gboard table styling, the .spg-power/.gpower shelf, and the result
// language for run-end. 3 lives; complete setups for streak + Gold; bank to exit.
// Merged into round2_canvas.jsx so PoolTable (same script) is available.

function Lives({ remaining = 3, total = 3, cls = "mar-life" }) {
  return <span className={cls === "mar-life" ? "mar-lives" : "mar-mlives"}>
    {Array.from({ length: total }).map((_, i) => <i key={i} className={cls + (i < remaining ? "" : " lost")}></i>)}
  </span>;
}

// #7 — Mode Entry
function MarathonEntry({ surface = "web", banner = false }) {
  const lb = [{ rk: "1", nm: "Deadstroke", sc: "412" }, { rk: "2", nm: "KissShot", sc: "388" }, { rk: "14", nm: "jjk_55 (You)", sc: "142", me: true }];
  const floors = ["Easy", "Medium", "Hard", "Insane"];
  return (
    <div className={"mar " + surface}>
      <div className="grain"></div>
      <div className="mar-entry">
        <div className="mar-e-top"><button className="mar-e-back">‹</button><span className="mar-e-eyebrow">Solo · Trick Shots</span></div>
        <div className="mar-e-main">
          <div className="mar-hero">
            <span className="mar-kick">Marathon</span>
            <span className="mar-wm">Trick Shots</span>
            <span className="mar-tag">Three lives. Curated setups. How far can you run?</span>
            <div className="mar-pb">
              <div className="s"><span className="v gold">23</span><span className="k">Best Streak</span></div>
              <div className="s"><span className="v">186</span><span className="k">Setups Done</span></div>
              <div className="s"><span className="v">412</span><span className="k">Best Score</span></div>
            </div>
            <div className="mar-floor">
              <span className="lab">Difficulty floor</span>
              <div className="mar-seg">{floors.map((f, i) => <button key={f} className={i === 1 ? "on" : ""}>{f}</button>)}</div>
            </div>
            {banner && <div className="mar-banner"><span>★</span><span>You set a <b>new streak record</b> last run — share it?</span></div>}
            <button className="mar-start">Start Run ›</button>
          </div>
          <div className="mar-aside">
            <div className="mar-card">
              <div className="ch"><span className="ct">This Week</span><span className="cs">Top Runs</span></div>
              {lb.map((r) => <div key={r.rk} className={"mar-lb" + (r.me ? " me" : "")}><span className="rk">{r.rk}</span><span className="nm">{r.nm}</span><span className="sc">{r.sc}</span></div>)}
            </div>
            <div className="mar-card">
              <div className="ch"><span className="ct">Rewards</span><span className="cs">Per Setup</span></div>
              <div className="mar-reward">Each completed setup earns <b>G</b>. Milestone bonuses at streaks of <b>5</b>, <b>10</b>, <b>20</b>. Bank any time to lock your score.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// #8 — Setup Preview / Intro
function SetupPreview({ surface = "web" }) {
  return (
    <div className={"mar " + surface}>
      <div className="grain"></div>
      <div className="mar-prev">
        <span className="step">Setup 8 of run · Tier 3</span>
        <span className="name">Three-Rail Bank</span>
        <span className="mar-pips"><i className="on"></i><i className="on"></i><i className="on"></i><i></i></span>
        <span className="mar-cond">Pot the 8-ball legally in the highlighted corner pocket — off three cushions.</span>
        <span className="rwd">+18 G if you complete</span>
        <button className="go">Start Shot ›</button>
        <span className="auto">Auto-advances in 3s</span>
      </div>
    </div>
  );
}

// #9/#10/#11 — In-Setup HUD. stamp: null | 'success' | 'fail'
function MarathonHUD({ surface = "web", stamp = null, remaining = 3 }) {
  if (surface === "mob") {
    return (
      <div className="gplay mar-mob">
        <div className="gstage"><div className="gboard"><PoolTable ballStyle="american" cueAt={{ x: 470, y: 300 }} showRack showAim showStick pullback={26} /></div>
          <div className="mar-ring" style={{ top: "22%", right: "20%", width: 38, height: 38 }}><span className="lbl">Target</span></div>
        </div>
        <div className="mar-mbar">
          <div className="setup">Three-Rail Bank<span>Tier 3</span></div>
          <div className="mid"><div className="streak">STREAK 7</div><div className="score">Score 142</div></div>
          <div className="right"><Lives remaining={remaining} cls="mlife" /><button className="mar-mbank">Bank</button></div>
        </div>
        <div className="gpower"><div className="gtrack"><span className="fill" style={{ height: "64%" }}></span><span className="gmark" style={{ bottom: "64%" }}></span></div><span className="gpct">64%</span></div>
        <div className="gspin"><span className="dot"></span><span className="lab">Spin</span></div>
        {stamp && <MarStamp stamp={stamp} />}
        {stamp === "fail" && <div className="mar-fail-cta"><button className="mar-retry">Retry</button><button className="mar-skip">Skip</button></div>}
      </div>
    );
  }
  return (
    <div className="spg mar-web">
      <div className="mar-bar">
        <div className="setup"><span className="nm">Three-Rail Bank</span><span className="pips"><i className="on"></i><i className="on"></i><i className="on"></i><i></i></span></div>
        <div className="mid"><div className="streak">STREAK 7</div><div className="score">Score 142</div></div>
        <div className="right"><Lives remaining={remaining} /><button className="mar-bank">Bank Streak</button></div>
      </div>
      <div className="mar-stage">
        <div className="spg-board"><PoolTable ballStyle="american" cueAt={{ x: 470, y: 300 }} showRack showAim showStick pullback={28} /></div>
        <div className="mar-ring" style={{ top: "26%", right: "17%" }}><span className="lbl">Target Pocket</span></div>
      </div>
      <div className="mar-shelf">
        <div className="spg-tools"><button className="spg-tool">⚑</button><button className="spg-tool">≡</button></div>
        <div className="spg-power"><span className="lbl">POWER</span><div className="barwrap"><span className="mark" style={{ left: "64%" }}></span><div className="bar"><span className="fill" style={{ width: "calc(64% - 4px)" }}></span></div></div><span className="pct">64%</span></div>
        <button className="spg-shoot">Shoot</button>
      </div>
      <div className="spg-spin"><span className="dot"></span><span className="lab">Spin</span></div>
      {stamp && <MarStamp stamp={stamp} />}
      {stamp === "fail" && <div className="mar-fail-cta"><button className="mar-retry">Retry Setup</button><button className="mar-skip">Skip · No Points</button></div>}
    </div>
  );
}

function MarStamp({ stamp }) {
  const ok = stamp === "success";
  return (
    <div className="mar-stamp">
      <span className={"word " + (ok ? "ok" : "miss")}>{ok ? "Completed" : "Missed"}</span>
      <span className={"sub " + (ok ? "g" : "life")}>{ok ? "+18 G" : "−1 Life"}</span>
    </div>
  );
}

// #12 — Run End (reuses the result-screen language)
function RunEnd({ surface = "web", banked = false }) {
  const headWeb = banked ? "Banked" : "Run Ended";
  if (surface === "mob") {
    return (
      <div className="spm mm-reveal">
        <div className="mbg"></div><div className="mveil"></div>
        <header className="m-top"><span className="m-eyebrow">Marathon · <b>{banked ? "Banked" : "Run Ended"}</b></span></header>
        <div className="mstage">
          <div className="kick mres-kick">{banked ? "You Locked It In" : "Out of Lives"}</div>
          <h1 className="mres-stamp">{banked ? "Banked" : "Run Ended"}</h1>
          <div className="mar-mstats">
            <div className="seg"><span className="v gold">7</span><span className="k">Streak</span></div>
            <div className="seg"><span className="v">142</span><span className="k">Score</span></div>
            <div className="seg"><span className="v gold">+126</span><span className="k">Gold</span></div>
            <div className="seg"><span className="v">T3</span><span className="k">Top Tier</span></div>
          </div>
          <div className="mar-mplace">12th this week · 6 of 8 setups cleared</div>
          <div className="mres-cta"><button className="m-gold">New Run</button><button className="m-ghost">Share</button></div>
        </div>
      </div>
    );
  }
  return (
    <div className="sp-result">
      <div className="res-bg"></div><div className="res-veil"></div>
      <header className="res-top"><span className="rmtag">Marathon · <b>Trick Shots</b> · Tier floor Medium</span></header>
      <div className="res-stage">
        <div className="res-kick">{banked ? "You Locked It In" : "Out of Lives"}</div>
        <h1 className="res-stamp">{headWeb}</h1>
        <div className="mar-pbest">{banked ? "" : "New Personal Best!"}</div>
        <div className="mar-runstats">
          <div className="seg"><span className="k">Final Streak</span><span className="v gold">7</span></div>
          <div className="seg"><span className="k">Setups Cleared</span><span className="v">6 / 8</span></div>
          <div className="seg"><span className="k">Total Score</span><span className="v">142</span></div>
          <div className="seg"><span className="k">Gold Earned</span><span className="v gold">+126</span></div>
          <div className="seg"><span className="k">Top Tier</span><span className="v">Tier 3</span></div>
        </div>
        <div className="mar-place">You finished 12th this week</div>
        <div className="res-cta"><button className="res-rematch">New Run</button><button className="res-lobby">Share</button></div>
      </div>
    </div>
  );
}

Object.assign(window, { MarathonEntry, SetupPreview, MarathonHUD, RunEnd });