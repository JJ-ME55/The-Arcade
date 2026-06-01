// SidePocketScreens2.jsx — screen pack 2 (skill-only): Difficulty Select,
// Profile/Prestige, Cue Locker, Invite 1v1, Leaderboards, Settings.

// ── vs Computer · Difficulty Select ──
function DifficultySelect() {
  const levels = [
    { g: "Level 1", n: "Easy", persona: "The Regular", desc: "A friendly frame down the local. Forgiving angles, plenty of time to think.", acc: "55% pots", accent: "#4FD6B0", n8: "8", sel: false },
    { g: "Level 2", n: "Medium", persona: "The Local", desc: "Knows the table. Punishes loose safeties, takes the chances you leave.", acc: "70% pots", accent: "#F2A24A", n8: "5", sel: true },
    { g: "Level 3", n: "Hard", persona: "The Shark", desc: "Reads position two shots ahead. Leaves you nothing. Bring your A-game.", acc: "84% pots", accent: "#C77BE8", n8: "3", sel: false },
    { g: "Level 4", n: "Insane", persona: "The Hustler", desc: "Near-perfect cue control and safety play. Almost nobody runs the table on them.", acc: "96% pots", accent: "#F26B7A", n8: "1", sel: false },
  ];
  const [sel, setSel] = React.useState(1);
  return (
    <div className="sp-diff sx-grain">
      <header className="sx-top">
        <button className="sx-back">‹</button>
        <span className="sx-eyebrow">Play the House · <b>Choose Your Opponent</b></span>
        <span className="sx-spacer"></span>
        <span className="sx-signet"><span className="av">J</span><span className="prestige">Gold III</span><span className="elo">1,250 Elo</span></span>
      </header>

      <div className="diff-head">
        <h1 className="sx-title">Play the House</h1>
        <div className="sx-sub">Solo practice · no rating at stake · pick your level</div>
      </div>

      <div className="diff-stack">
        {levels.map((l, i) => (
          <button key={l.n} className={"diff-row" + (i === sel ? " is-sel" : "")} style={{ "--accent": l.accent }} onClick={() => setSel(i)}>
            <span className="ball">{l.n8}</span>
            <span className="dmain">
              <span className="dtop"><span className="grade">{l.g}</span><span className="dn">{l.n}</span><span className="dpersona">{l.persona}</span></span>
              <span className="ddesc">{l.desc}</span>
            </span>
            <span className="dright">
              <span className="acc">{l.acc}</span>
              <span className="acclab">Accuracy</span>
            </span>
            <span className="dpick">{i === sel ? "✓" : ""}</span>
          </button>
        ))}
      </div>

      <div className="diff-foot">
        <div className="note">Practice frames don't affect your <b>Elo</b> or <b>prestige</b> — play freely.</div>
        <button className="sx-gold">Break Off · {levels[sel].n}</button>
      </div>
    </div>
  );
}

// ── Profile / Prestige ──
function ProfileScreen() {
  const tiers = ["Bronze", "Silver", "Gold", "Platinum", "Diamond"];
  const nowTier = 2;
  const form = ["W", "W", "L", "W", "W", "W", "L", "W", "W", "W"];
  const stats = [
    { v: "1,250", k: "Elo Rating", gold: true },
    { v: "68%", k: "Win Rate" },
    { v: "312", k: "Frames Won" },
    { v: "4", k: "Best Run" },
  ];
  return (
    <div className="sp-profile sx-grain">
      <header className="sx-top">
        <button className="sx-back">‹</button>
        <span className="sx-eyebrow">Members Club · <b>Your Standing</b></span>
        <span className="sx-spacer"></span>
        <button className="sx-ghost" style={{ padding: "11px 20px", fontSize: "12px" }}>Cue Locker</button>
      </header>

      <div className="pf-main">
        <aside className="pf-side">
          <div className="pf-av">J</div>
          <div className="pf-name">jjk_55</div>
          <div className="pf-handle">Member No. 142 · since 2024</div>
          <div className="pf-tierbig">
            <span className="badge">Gold III</span>
            <span className="elo">1,250 <span>Elo</span></span>
          </div>
          <div className="pf-bar">
            <div className="lbl"><span>Gold III</span><span>Gold IV</span></div>
            <div className="track"><i style={{ width: "62%" }}></i></div>
          </div>
          <div className="pf-bar">
            <div className="lbl"><span>4 wins to promote</span><span>62%</span></div>
          </div>
        </aside>

        <div className="pf-content">
          <div className="pf-stats">
            {stats.map((s) => (
              <div className="pf-stat" key={s.k}><div className={"v" + (s.gold ? " gold" : "")}>{s.v}</div><div className="k">{s.k}</div></div>
            ))}
          </div>

          <div className="pf-sec">
            <div className="h"><span className="t">Prestige Ladder</span><span className="s">Climb by skill · Bronze → Diamond</span></div>
            <div className="pf-ladder">
              {tiers.map((t, i) => (
                <div key={t} className={"pf-tier " + (i < nowTier ? "done" : i === nowTier ? "now" : "locked")}>{t}</div>
              ))}
            </div>
          </div>

          <div className="pf-sec">
            <div className="h"><span className="t">Recent Form</span><span className="s">Last 10 ranked · 8 W – 2 L</span></div>
            <div className="pf-form">
              {form.map((f, i) => <span key={i} className={"f " + f.toLowerCase()}>{f}</span>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Cue Locker (cosmetic, skill-gated) ──
function Cue() {
  return (
    <div className="cue">
      <span className="seg bumper"></span>
      <span className="seg butt"></span>
      <span className="seg wrap"></span>
      <span className="seg forearm"></span>
      <span className="seg joint"></span>
      <span className="seg shaft"></span>
      <span className="seg ferrule"></span>
      <span className="seg tip"></span>
    </div>
  );
}
function CueLocker() {
  const cues = [
    { n: "House Cue", u: "Starter", cue1: "#8a5a2a", cue2: "#c89a5e", state: "equipped", desc: "The club's standard maple cue. Honest and true." },
    { n: "The Brass", u: "10 wins", cue1: "#7a5e1e", cue2: "#e0c060", state: "owned", desc: "A brass-collared cue earned at ten frames won." },
    { n: "Green Baize", u: "Reach Silver", cue1: "#1e5a3e", cue2: "#3e9e6e", state: "owned", desc: "Deep billiard-green lacquer. A Silver-tier reward." },
    { n: "Velvet Night", u: "Reach Gold", cue1: "#3e2060", cue2: "#9c5ed8", state: "equipped-able", desc: "Violet pearl inlay. Unlocked at Gold tier." },
    { n: "The Gilded", u: "Reach Platinum", cue1: "#7a5e10", cue2: "#f0d070", state: "locked", desc: "Full gold-leaf shaft. Platinum members only." },
    { n: "Diamond Ivory", u: "Reach Diamond", cue1: "#aab4c0", cue2: "#eef4f8", state: "locked", desc: "Ivory and white gold. The mark of the very best." },
    { n: "Crimson Run", u: "Win 50 frames", cue1: "#7a1e22", cue2: "#d8484e", state: "locked", desc: "Earned by running fifty frames. Blood-red lacquer." },
    { n: "The Century", u: "100-win streak club", cue1: "#1a1a22", cue2: "#5a5a72", state: "locked", desc: "Gunmetal. For the hundred-win immortals." },
    { n: "Champion's Cue", u: "Win a Cup", cue1: "#6a4a10", cue2: "#f6e9be", state: "locked", desc: "Awarded only to tournament champions." },
  ];
  const [sel, setSel] = React.useState(3);
  const cur = cues[sel];
  return (
    <div className="sp-locker sx-grain">
      <header className="sx-top">
        <button className="sx-back">‹</button>
        <span className="sx-eyebrow">Members Club · <b>Cue Locker</b></span>
        <span className="sx-spacer"></span>
        <span className="sx-signet"><span className="av">J</span><span className="prestige">Gold III</span><span className="elo">3 of 9 unlocked</span></span>
      </header>

      <div className="lk-main">
        <div className="lk-grid-wrap">
          <div className="lk-gridhead"><span className="t">The Rack</span><span className="s">Cosmetic only · earned by skill, never bought</span></div>
          <div className="lk-grid">
            {cues.map((c, i) => (
              <div key={c.n} className={"lk-cue" + (i === sel ? " sel" : "") + (c.state === "locked" ? " locked" : "")}
                style={{ "--cue1": c.cue1, "--cue2": c.cue2 }} onClick={() => setSel(i)}>
                {c.state === "equipped" && <span className="eq">Equipped</span>}
                <div className="cuewrap"><Cue /></div>
                <div><div className="cn">{c.n}</div>
                  {c.state === "locked"
                    ? <div className="lockrow">🔒 {c.u}</div>
                    : <div className="cu">{c.state === "equipped" ? "In play" : "Unlocked · " + c.u}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="lk-preview" style={{ "--cue1": cur.cue1, "--cue2": cur.cue2 }}>
          <div className="pkick">{cur.state === "locked" ? "Locked" : cur.state === "equipped" ? "In Play" : "In the Locker"}</div>
          <div className="pname">{cur.n}</div>
          <div className="lk-bigcue"><Cue /></div>
          <div className="pdesc">{cur.desc}</div>
          <div className="pfoot">
            {cur.state === "equipped"
              ? <div className="equipped-note">Currently in play</div>
              : cur.state === "locked"
                ? <div className="equipped-note" style={{ color: "var(--c-brass)", borderColor: "var(--c-line)" }}>🔒 {cur.u}</div>
                : <button className="sx-gold">Equip Cue</button>}
          </div>
        </aside>
      </div>
    </div>
  );
}

// ── Invite-link 1v1 lobby ──
function InviteLobby() {
  return (
    <div className="sp-invite sx-grain">
      <header className="sx-top">
        <button className="sx-back">‹</button>
        <span className="sx-eyebrow">Play 1v1 · <b>Private Table</b></span>
        <span className="sx-spacer"></span>
        <span className="sx-signet"><span className="av">J</span><span className="prestige">Gold III</span><span className="elo">1,250 Elo</span></span>
      </header>

      <div className="iv-stage">
        <div className="iv-kick">Your Private Table</div>
        <h1 className="iv-title">Invite a Challenger</h1>
        <div className="iv-sub">Send the link. First to open it sits across from you — no rating at stake.</div>

        <div className="iv-seats">
          <div className="iv-seat">
            <div className="ring">J</div>
            <div className="nm">jjk_55</div>
            <div className="el">1,250 Elo · Gold III</div>
          </div>
          <div className="iv-vs">vs</div>
          <div className="iv-seat empty">
            <div className="ring">?</div>
            <div className="nm">Waiting…</div>
            <div className="el">seat open</div>
          </div>
        </div>

        <div className="iv-linkbox">
          <div className="url">sidepocket.club/t/JJK-7F2K-9QX</div>
          <button className="iv-copy sx-gold">Copy Link</button>
        </div>
        <div className="iv-opts">
          <button className="sx-ghost">Best of 3</button>
          <button className="sx-ghost">Share</button>
          <button className="sx-ghost">QR Code</button>
        </div>
        <button className="iv-cancel">Cancel table</button>
      </div>
    </div>
  );
}

// ── Leaderboards (skill ladder) ──
function Leaderboards() {
  const rows = [
    { rk: "1", nm: "Deadstroke", pr: "Diamond", el: "2,104", wr: "82%", c: "#8c2230" },
    { rk: "2", nm: "KissShot", pr: "Diamond", el: "2,051", wr: "79%", c: "#5e2c7a" },
    { rk: "3", nm: "The Mechanic", pr: "Diamond", el: "1,998", wr: "77%", c: "#1e3a6e" },
    { rk: "4", nm: "BankShotBea", pr: "Platinum", el: "1,902", wr: "74%", c: "#8a6a1e" },
    { rk: "5", nm: "Sidewinder", pr: "Platinum", el: "1,855", wr: "73%", c: "#1f6f5c" },
    { rk: "6", nm: "Chalkdust", pr: "Platinum", el: "1,790", wr: "71%", c: "#b5631a" },
    { rk: "7", nm: "RailRunner", pr: "Gold", el: "1,612", wr: "69%", c: "#2a5440" },
    { rk: "8", nm: "VelvetQ", pr: "Gold", el: "1,540", wr: "70%", c: "#6b2d4a" },
  ];
  const tabs = ["Global", "Friends", "This Season"];
  const [tab, setTab] = React.useState(0);
  return (
    <div className="sp-board sx-grain">
      <header className="sx-top">
        <button className="sx-back">‹</button>
        <span className="sx-eyebrow">Members Club · <b>The House Ladder</b></span>
        <span className="sx-spacer"></span>
        <span className="sx-signet"><span className="av">J</span><span className="prestige">Gold III</span><span className="elo">1,250 Elo</span></span>
      </header>

      <div className="lb-main">
        <div>
          <div className="lb-tabs">
            {tabs.map((t, i) => <button key={t} className={"lb-tab" + (i === tab ? " on" : "")} onClick={() => setTab(i)}>{t}</button>)}
          </div>
          <div className="lb-list">
            {rows.map((r) => (
              <div key={r.rk} className={"lb-row" + (+r.rk <= 3 ? " top" : "")}>
                <span className="rk">{r.rk}</span>
                <span className="who"><span className="av" style={{ background: `radial-gradient(circle at 38% 30%, ${r.c}, #0c1812 88%)` }}>{r.nm[0]}</span>
                  <span><span className="nm">{r.nm}</span><span className="pr">{r.pr}</span></span></span>
                <span className="el">{r.el}</span>
                <span className="wr">{r.wr}</span>
              </div>
            ))}
            <div className="lb-row me">
              <span className="rk">142</span>
              <span className="who"><span className="av" style={{ background: "radial-gradient(circle at 38% 30%, #2a6b4f, #143b2c 88%)" }}>J</span>
                <span><span className="nm">jjk_55 (You)</span><span className="pr">Gold III</span></span></span>
              <span className="el">1,250</span>
              <span className="wr">68%</span>
            </div>
          </div>
        </div>

        <aside className="lb-aside">
          <div className="lb-rankcard">
            <div className="k">Your Rank</div>
            <div className="big">#142</div>
            <div className="of">of 8,204 ranked members</div>
            <div className="delta">▲ up 18 this week</div>
          </div>
          <div className="lb-note">Ranking is pure <b>skill</b> — Elo and win-rate only. No coins, no shortcuts. Win frames against ranked members to climb.</div>
        </aside>
      </div>
    </div>
  );
}

// ── Settings ──
function SettingsScreen() {
  const [sound, setSound] = React.useState(true);
  const [music, setMusic] = React.useState(false);
  const [guides, setGuides] = React.useState(true);
  const [hand, setHand] = React.useState(1);
  const [speed, setSpeed] = React.useState(2);
  return (
    <div className="sp-settings sx-grain">
      <header className="sx-top">
        <button className="sx-back">‹</button>
        <span className="sx-eyebrow">Members Club · <b>Settings</b></span>
      </header>

      <div className="st-main">
        <div className="st-sec">
          <div className="sh">Table</div>
          <div className="st-row">
            <span className="lab">Aim guides<span className="d">Show the projected cue line while aiming</span></span>
            <span className={"st-toggle" + (guides ? " on" : "")} onClick={() => setGuides(!guides)}></span>
          </div>
          <div className="st-row">
            <span className="lab">Shot speed<span className="d">How fast balls settle after a strike</span></span>
            <span className="st-seg">{["Calm", "Normal", "Quick"].map((s, i) => <button key={s} className={i === speed - 1 ? "on" : ""} onClick={() => setSpeed(i + 1)}>{s}</button>)}</span>
          </div>
          <div className="st-row">
            <span className="lab">Cue hand<span className="d">Which side the power slider sits</span></span>
            <span className="st-seg">{["Left", "Right"].map((s, i) => <button key={s} className={i === hand ? "on" : ""} onClick={() => setHand(i)}>{s}</button>)}</span>
          </div>
        </div>

        <div className="st-sec">
          <div className="sh">Sound</div>
          <div className="st-row">
            <span className="lab">Sound effects<span className="d">Cue strike, pocket drop, rack break</span></span>
            <span className={"st-toggle" + (sound ? " on" : "")} onClick={() => setSound(!sound)}></span>
          </div>
          <div className="st-row">
            <span className="lab">Room ambience<span className="d">Low after-hours music bed</span></span>
            <span className={"st-toggle" + (music ? " on" : "")} onClick={() => setMusic(!music)}></span>
          </div>
          <div className="st-row">
            <span className="lab">Master volume</span>
            <span className="st-slider"><i style={{ width: "70%" }}></i><span className="knob" style={{ left: "70%" }}></span></span>
          </div>
        </div>

        <div className="st-sec">
          <div className="sh">Account</div>
          <div className="st-row">
            <span className="lab">jjk_55<span className="d">Member No. 142 · Gold III · 1,250 Elo</span></span>
            <button className="sx-ghost" style={{ padding: "11px 20px", fontSize: "12px" }}>Edit Profile</button>
          </div>
          <div className="st-foot">
            <button className="sx-ghost">Sign Out</button>
            <button className="sx-ghost danger">Reset Stats</button>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { DifficultySelect, ProfileScreen, CueLocker, InviteLobby, Leaderboards, SettingsScreen });
