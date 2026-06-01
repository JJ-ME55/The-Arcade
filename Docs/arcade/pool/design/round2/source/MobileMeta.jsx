// MobileMeta.jsx — landscape meta screens: Tournaments (scrollable bracket),
// Profile, Cue Locker, Leaderboards, Settings.

function MCue() {
  return (
    <div className="mcue">
      <span className="seg bumper"></span><span className="seg butt"></span><span className="seg wrap"></span>
      <span className="seg forearm"></span><span className="seg joint"></span><span className="seg shaft"></span>
      <span className="seg ferrule"></span><span className="seg tip"></span>
    </div>
  );
}

function MobileTournaments() {
  const QF = [
    { a: { nm: "jjk_55", sd: "5", sc: "2", win: true, you: true }, b: { nm: "Sidewinder", sd: "4", sc: "0" } },
    { a: { nm: "Velvet Q", sd: "8", sc: "2", win: true }, b: { nm: "Chalkdust", sd: "1", sc: "1" } },
    { a: { nm: "Deadstroke", sd: "2", sc: "2", win: true }, b: { nm: "BankShot", sd: "7", sc: "1" } },
    { a: { nm: "KissShot", sd: "3", sc: "2", win: true }, b: { nm: "RailRunner", sd: "6", sc: "0" } },
  ];
  const SF = [
    { a: { nm: "jjk_55", sd: "5", you: true }, b: { nm: "Velvet Q", sd: "8" }, state: "now" },
    { a: { nm: "Deadstroke", sd: "2" }, b: { nm: "KissShot", sd: "3" }, state: "soon" },
  ];
  const FN = [{ a: { nm: "Winner SF1", tbd: true }, b: { nm: "Winner SF2", tbd: true }, state: "locked" }];
  const Side = ({ p }) => (
    <div className={"mtn-s" + (p.win ? " win" : "") + (p.you ? " you" : "") + (p.tbd ? " tbd" : "")}>
      <span className="sd">{p.tbd ? "·" : p.sd}</span><span className="nm">{p.nm}</span>{p.sc != null && <span className="sc">{p.sc}</span>}
    </div>
  );
  const M = ({ m, n, r }) => (
    <div className="mtn-m">
      <div className={"mtn-card" + (m.state ? " " + m.state : "")}>
        <span className="mtn-tag">{r === "qf" ? "QF" + n : r === "sf" ? "SF" + n : "Final"}</span>
        <Side p={m.a} /><div className="mtn-div"></div><Side p={m.b} />
        {m.state === "now" && <span className="mtn-now">Play Now ›</span>}
        {m.state === "soon" && <span className="mtn-meta">starts 1:12:00</span>}
        {m.state === "locked" && <span className="mtn-meta">Awaiting semis</span>}
      </div>
    </div>
  );
  return (
    <div className="spm">
      <div className="spm-bg"></div><div className="spm-grain"></div>
      <div className="mm-tn">
        <div className="mtn-band">
          <div><div className="kick">Daily · In Progress</div><div className="nm">The Velvet Cup</div></div>
          <div className="meta">
            <div><span className="k">Format</span><span className="v">Single Elim · 8</span></div>
            <div><span className="k">Status</span><span className="v gold">Semifinalist</span></div>
            <div><span className="k">Next</span><span className="v">in 4:30</span></div>
          </div>
          <button className="m-gold">Continue ›</button>
        </div>
        <div className="mtn-bracket">
          <div className="mtn-round qf"><div className="mtn-rh">Quarterfinals</div><div className="mtn-ms">{QF.map((m, i) => <M key={i} m={m} n={i + 1} r="qf" />)}</div></div>
          <div className="mtn-round sf"><div className="mtn-rh">Semifinals</div><div className="mtn-ms">{SF.map((m, i) => <M key={i} m={m} n={i + 1} r="sf" />)}</div></div>
          <div className="mtn-round fn"><div className="mtn-rh">The Final</div><div className="mtn-ms">{FN.map((m, i) => <M key={i} m={m} n={i + 1} r="fn" />)}</div></div>
          <div className="mtn-round champ"><div className="mtn-rh">Champion</div><div className="mtn-ms"><div className="mtn-champ"><span className="cr">♔</span><span className="ct">The Crown</span><span className="cs">Title · Elo · Cue</span></div></div></div>
        </div>
      </div>
    </div>
  );
}

function MobileProfile() {
  const tiers = ["Bronze", "Silver", "Gold", "Plat", "Diamond"];
  const form = ["W", "W", "L", "W", "W", "W", "L", "W", "W", "W"];
  const stats = [{ v: "1,250", k: "Elo", gold: true }, { v: "68%", k: "Win Rate" }, { v: "312", k: "Frames" }, { v: "4", k: "Best Run" }];
  return (
    <div className="spm">
      <div className="spm-bg"></div><div className="spm-grain"></div>
      <div className="mm-pf">
        <MTop eyebrow="Members Club ·" bold="Your Standing" right={<button className="m-ghost" style={{ minHeight: 40, padding: "0 16px", fontSize: 11 }}>Cue Locker</button>} />
        <div className="mpf-main">
          <aside className="mpf-side">
            <div className="av">J</div><div className="nm">jjk_55</div><div className="hd">Member No. 142 · since '24</div>
            <div className="tier"><span className="badge">Gold III</span><span className="elo">1,250 <span>Elo</span></span></div>
            <div className="bar"><div className="lbl"><span>Gold III</span><span>Gold IV</span></div><div className="tr"><i style={{ width: "62%" }}></i></div></div>
          </aside>
          <div className="mpf-content">
            <div className="mpf-stats">{stats.map((s) => <div className="mpf-stat" key={s.k}><div className={"v" + (s.gold ? " gold" : "")}>{s.v}</div><div className="k">{s.k}</div></div>)}</div>
            <div className="mpf-sec"><div className="h"><span className="t">Prestige Ladder</span><span className="s">Bronze → Diamond</span></div><div className="mpf-ladder">{tiers.map((t, i) => <div key={t} className={"mpf-tier " + (i < 2 ? "done" : i === 2 ? "now" : "locked")}>{t}</div>)}</div></div>
            <div className="mpf-sec"><div className="h"><span className="t">Recent Form</span><span className="s">8 W – 2 L</span></div><div className="mpf-form">{form.map((f, i) => <span key={i} className={"f " + f.toLowerCase()}>{f}</span>)}</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileLocker() {
  const cues = [
    { n: "House Cue", u: "Starter", c1: "#8a5a2a", c2: "#c89a5e", st: "equipped", d: "The club's standard maple cue." },
    { n: "The Brass", u: "10 wins", c1: "#7a5e1e", c2: "#e0c060", st: "owned", d: "Brass-collared, earned at ten frames." },
    { n: "Green Baize", u: "Reach Silver", c1: "#1e5a3e", c2: "#3e9e6e", st: "owned", d: "Deep billiard-green lacquer." },
    { n: "Velvet Night", u: "Reach Gold", c1: "#3e2060", c2: "#9c5ed8", st: "able", d: "Violet pearl inlay. Unlocked at Gold." },
    { n: "The Gilded", u: "Reach Platinum", c1: "#7a5e10", c2: "#f0d070", st: "locked", d: "Full gold-leaf shaft." },
    { n: "Diamond Ivory", u: "Reach Diamond", c1: "#aab4c0", c2: "#eef4f8", st: "locked", d: "Ivory and white gold." },
    { n: "Crimson Run", u: "Win 50", c1: "#7a1e22", c2: "#d8484e", st: "locked", d: "Blood-red lacquer." },
    { n: "The Century", u: "100-win club", c1: "#1a1a22", c2: "#5a5a72", st: "locked", d: "Gunmetal, for the immortals." },
    { n: "Champion's", u: "Win a Cup", c1: "#6a4a10", c2: "#f6e9be", st: "locked", d: "Tournament champions only." },
  ];
  const [s, setS] = React.useState(3);
  const cur = cues[s];
  return (
    <div className="spm">
      <div className="spm-bg"></div><div className="spm-grain"></div>
      <div className="mm-lk">
        <MTop eyebrow="Members Club ·" bold="Cue Locker" right={<MSignet />} />
        <div className="mlk-main">
          <div className="mlk-list">
            <div className="mlk-h"><span className="t">The Rack</span><span className="s">Earned by skill, never bought</span></div>
            <div className="mlk-grid">
              {cues.map((c, i) => (
                <div key={c.n} className={"mlk-cue" + (i === s ? " sel" : "") + (c.st === "locked" ? " locked" : "")} style={{ "--cue1": c.c1, "--cue2": c.c2 }} onClick={() => setS(i)}>
                  {c.st === "equipped" && <span className="eq">Equipped</span>}
                  <div className="mlk-cuewrap"><MCue /></div>
                  <div><div className="cn">{c.n}</div><div className="cu">{c.st === "locked" ? "🔒 " + c.u : c.st === "equipped" ? "In play" : "Unlocked · " + c.u}</div></div>
                </div>
              ))}
            </div>
          </div>
          <aside className="mlk-prev" style={{ "--cue1": cur.c1, "--cue2": cur.c2 }}>
            <div className="pk">{cur.st === "locked" ? "Locked" : cur.st === "equipped" ? "In Play" : "In the Locker"}</div>
            <div className="pn">{cur.n}</div>
            <div className="mlk-big"><MCue /></div>
            <div className="pd">{cur.d}</div>
            <div className="pf">{cur.st === "able" ? <button className="m-gold">Equip Cue</button> : <div className="note">{cur.st === "equipped" ? "Currently in play" : "🔒 " + cur.u}</div>}</div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function MobileLeaderboard() {
  const rows = [
    { rk: "1", nm: "Deadstroke", pr: "Diamond", el: "2,104", wr: "82%", c: "#8c2230" },
    { rk: "2", nm: "KissShot", pr: "Diamond", el: "2,051", wr: "79%", c: "#5e2c7a" },
    { rk: "3", nm: "The Mechanic", pr: "Diamond", el: "1,998", wr: "77%", c: "#1e3a6e" },
    { rk: "4", nm: "BankShotBea", pr: "Platinum", el: "1,902", wr: "74%", c: "#8a6a1e" },
    { rk: "5", nm: "Sidewinder", pr: "Platinum", el: "1,855", wr: "73%", c: "#1f6f5c" },
    { rk: "6", nm: "Chalkdust", pr: "Platinum", el: "1,790", wr: "71%", c: "#b5631a" },
  ];
  const tabs = ["Global", "Friends", "Season"];
  const [t, setT] = React.useState(0);
  return (
    <div className="spm">
      <div className="spm-bg"></div><div className="spm-grain"></div>
      <div className="mm-lb">
        <MTop eyebrow="Members Club ·" bold="The House Ladder" right={<MSignet />} />
        <div className="mlb-main">
          <div className="mlb-listwrap">
            <div className="mlb-tabs">{tabs.map((x, i) => <button key={x} className={"mlb-tab" + (i === t ? " on" : "")} onClick={() => setT(i)}>{x}</button>)}</div>
            <div className="mlb-list">
              {rows.map((r) => (
                <div key={r.rk} className={"mlb-row" + (+r.rk <= 3 ? " top" : "")}>
                  <span className="rk">{r.rk}</span>
                  <span className="who"><span className="av" style={{ background: `radial-gradient(circle at 38% 30%, ${r.c}, #0c1812 88%)` }}>{r.nm[0]}</span><span><span className="nm">{r.nm}</span> <span className="pr">{r.pr}</span></span></span>
                  <span className="el">{r.el}</span><span className="wr">{r.wr}</span>
                </div>
              ))}
              <div className="mlb-row me">
                <span className="rk">142</span>
                <span className="who"><span className="av" style={{ background: "radial-gradient(circle at 38% 30%, #2a6b4f, #143b2c 88%)" }}>J</span><span><span className="nm">jjk_55 (You)</span> <span className="pr">Gold III</span></span></span>
                <span className="el">1,250</span><span className="wr">68%</span>
              </div>
            </div>
          </div>
          <aside className="mlb-aside">
            <div className="mlb-rank"><div className="k">Your Rank</div><div className="big">#142</div><div className="of">of 8,204 ranked</div><div className="delta">▲ up 18 this week</div></div>
            <div className="mlb-note">Pure <b>skill</b> — Elo and win-rate only. No coins, no shortcuts.</div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function MobileSettings() {
  const [sound, setSound] = React.useState(true);
  const [music, setMusic] = React.useState(false);
  const [guides, setGuides] = React.useState(true);
  const [hand, setHand] = React.useState(1);
  const [speed, setSpeed] = React.useState(1);
  return (
    <div className="spm">
      <div className="spm-bg"></div><div className="spm-grain"></div>
      <div className="mm-st">
        <MTop eyebrow="Members Club ·" bold="Settings" />
        <div className="mst-main">
          <div className="mst-sec">
            <div className="sh">Table</div>
            <div className="mst-row"><span className="lab">Aim guides<span className="d">Projected cue line</span></span><span className={"mst-toggle" + (guides ? " on" : "")} onClick={() => setGuides(!guides)}></span></div>
            <div className="mst-row"><span className="lab">Shot speed</span><span className="mst-seg">{["Calm", "Normal", "Quick"].map((s, i) => <button key={s} className={i === speed ? "on" : ""} onClick={() => setSpeed(i)}>{s}</button>)}</span></div>
            <div className="mst-row"><span className="lab">Cue hand<span className="d">Side the power slider sits</span></span><span className="mst-seg">{["Left", "Right"].map((s, i) => <button key={s} className={i === hand ? "on" : ""} onClick={() => setHand(i)}>{s}</button>)}</span></div>
          </div>
          <div className="mst-sec">
            <div className="sh">Sound</div>
            <div className="mst-row"><span className="lab">Sound effects<span className="d">Cue, pocket, break</span></span><span className={"mst-toggle" + (sound ? " on" : "")} onClick={() => setSound(!sound)}></span></div>
            <div className="mst-row"><span className="lab">Room ambience<span className="d">After-hours bed</span></span><span className={"mst-toggle" + (music ? " on" : "")} onClick={() => setMusic(!music)}></span></div>
            <div className="mst-row"><span className="lab">Master volume</span><span className="mst-slider"><i style={{ width: "70%" }}></i><span className="knob" style={{ left: "70%" }}></span></span></div>
          </div>
          <div className="mst-sec" style={{ gridColumn: "1 / -1" }}>
            <div className="sh">Account</div>
            <div className="mst-row"><span className="lab">jjk_55<span className="d">Member No. 142 · Gold III · 1,250 Elo</span></span><div className="mst-foot" style={{ marginTop: 0 }}><button className="m-ghost">Edit Profile</button><button className="m-ghost">Sign Out</button><button className="m-ghost danger">Reset Stats</button></div></div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { MobileTournaments, MobileProfile, MobileLocker, MobileLeaderboard, MobileSettings });