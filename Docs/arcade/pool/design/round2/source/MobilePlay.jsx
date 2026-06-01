// MobilePlay.jsx — landscape PLAY flow: Main Menu, Room Select (swipe),
// Difficulty, Invite, Matchmaking, Reveal, Result. Reuses MTop/MSignet/MSol.

function MobileMenu() {
  return (
    <div className="spm">
      <div className="mm-club">
        <div className="mm-plate"></div>
        <div className="scrim"></div>
        <div className="topwrap"><MSol /><MSignet /><button className="m-ico">⚙</button></div>
        <div className="mm-hero">
          <div className="kick">Members Club · Est. 1952</div>
          <h1>Side<br /><em>Pocket</em></h1>
          <div className="tag">Skill only. No luck.</div>
          <div className="online"><span className="m-live"></span><b>2,317</b>&nbsp;players online</div>
          <div className="mm-cta">
            <button className="m-gold mm-play">
              <span className="pico"><svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2.3"></circle><circle cx="8.6" cy="11" r="2.3"></circle><circle cx="15.4" cy="11" r="2.3"></circle><circle cx="5.2" cy="17" r="2.3"></circle><circle cx="12" cy="17" r="2.3"></circle><circle cx="18.8" cy="17" r="2.3"></circle></svg></span>
              <span className="txt"><span className="t">Play 1v1</span><span className="s">Classic 8-Ball</span></span>
            </button>
            <button className="mm-tour">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9a6 6 0 0 0 12 0V3H6z"></path><path d="M6 4H3v2a3 3 0 0 0 3 3"></path><path d="M18 4h3v2a3 3 0 0 1-3 3"></path><path d="M12 15v4"></path><path d="M8 21h8"></path></svg>
              <span className="tt"><span className="t">Tournaments</span><span className="s">Daily Free · 12:34</span></span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileRooms() {
  const ROOMS = [
    { name: "The Break Room", tag: "Warm up. Skill only.", tier: "Bronze+", players: "1,240", c1: "#1f6f5c", c2: "#0b241d", accent: "#4FD6B0", n: "8", id: "m-break", hint: "Pub backroom" },
    { name: "Hustler's Alley", tag: "Reputations get made.", tier: "Silver+", players: "612", c1: "#b5631a", c2: "#2f1908", accent: "#F2A24A", n: "5", id: "m-hustler", hint: "Dim bar, neon" },
    { name: "The Velvet Room", tag: "Smooth operators.", tier: "Gold+", players: "318", c1: "#5e2c7a", c2: "#220e30", accent: "#C77BE8", n: "4", id: "m-velvet", hint: "Velvet booths" },
    { name: "The Gold Lounge", tag: "A steady hand.", tier: "Platinum+", players: "146", c1: "#8a6a1e", c2: "#2a2008", accent: "#F2D27A", n: "1", id: "m-gold", locked: true, hint: "Gilded room" },
    { name: "Sharks' Den", tag: "The big fish.", tier: "Diamond", players: "58", c1: "#8c2230", c2: "#2a0a10", accent: "#F26B7A", n: "3", id: "m-sharks", locked: true, hint: "Smoky den" },
    { name: "The Penthouse", tag: "Invitation only.", tier: "Invitation", players: "12", c1: "#1e3a6e", c2: "#0a1426", accent: "#6FA8FF", n: "2", id: "m-pent", locked: true, hint: "Skyline suite" },
  ];
  const [a, setA] = React.useState(2);
  const CARD = 316;
  return (
    <div className="spm">
      <div className="spm-bg"></div><div className="spm-grain"></div>
      <div className="mm-rooms">
        <MTop eyebrow="Play ·" bold="Pick Your Room" right={<MSignet />} />
        <div className="mr-stage">
          <button className="mr-nav prev" onClick={() => setA((v) => Math.max(0, v - 1))}>‹</button>
          <div className="mr-track" style={{ transform: `translate(calc(-50% - ${(a - (ROOMS.length - 1) / 2) * CARD}px), -50%)` }}>
            {ROOMS.map((r, i) => (
              <div key={r.id} className={"mr-card" + (i === a ? " on" : "")} style={{ "--c1": r.c1, "--c2": r.c2, "--accent": r.accent }} onClick={() => setA(i)}>
                <div className="bg"><image-slot id={r.id} placeholder={r.hint}></image-slot></div>
                <div className="sc"></div>
                <div className="ghost"><span>{r.n}</span></div>
                <div className="mr-top"><span className="ball">{r.n}</span><span className="tier">{r.locked ? "🔒 " : ""}{r.tier}</span></div>
                <div className="mr-excl"><span className="l">Exclusivity</span><span className="pips">{ROOMS.map((_, j) => <i key={j} className={j <= i ? "on" : ""}></i>)}</span></div>
                <div className="nm">{r.name}</div>
                <div className="tg">{r.tag}</div>
                <div className="meta"><span>{r.tier}</span><span><span className="m-live"></span> {r.players} playing</span></div>
                <button className={"m-gold enter" + (r.locked ? " locked" : "")}>{r.locked ? "Reach " + r.tier : "Find Match ›"}</button>
              </div>
            ))}
          </div>
          <button className="mr-nav next" onClick={() => setA((v) => Math.min(ROOMS.length - 1, v + 1))}>›</button>
        </div>
        <div className="mr-dots">{ROOMS.map((r, i) => <i key={r.id} className={i === a ? "on" : ""} onClick={() => setA(i)}></i>)}</div>
      </div>
    </div>
  );
}

function MobileDifficulty() {
  const L = [
    { g: "Level 1", n: "Easy", pe: "The Regular", de: "Forgiving angles, plenty of time to think.", acc: "55% pots", accent: "#4FD6B0", b: "8" },
    { g: "Level 2", n: "Medium", pe: "The Local", de: "Punishes loose safeties, takes your chances.", acc: "70% pots", accent: "#F2A24A", b: "5" },
    { g: "Level 3", n: "Hard", pe: "The Shark", de: "Reads two shots ahead. Leaves you nothing.", acc: "84% pots", accent: "#C77BE8", b: "3" },
    { g: "Level 4", n: "Insane", pe: "The Hustler", de: "Near-perfect cue control and safety play.", acc: "96% pots", accent: "#F26B7A", b: "1" },
  ];
  const [s, setS] = React.useState(1);
  return (
    <div className="spm">
      <div className="spm-bg"></div><div className="spm-grain"></div>
      <div className="mm-diff">
        <MTop eyebrow="Play the House ·" bold="Choose Opponent" right={<MSignet />} />
        <div className="md-row">
          {L.map((l, i) => (
            <div key={l.n} className={"md-card" + (i === s ? " on" : "")} style={{ "--accent": l.accent }} onClick={() => setS(i)}>
              <span className="ball">{l.b}</span>
              <span className="gr">{l.g}</span>
              <span className="nm">{l.n}</span>
              <span className="pe">{l.pe}</span>
              <span className="de">{l.de}</span>
              <span className="acc">{l.acc}</span>
            </div>
          ))}
        </div>
        <div className="md-foot">
          <span className="note">No <b>Elo</b> or <b>prestige</b> at stake — play freely.</span>
          <button className="m-gold">Break Off · {L[s].n}</button>
        </div>
      </div>
    </div>
  );
}

function MobileInvite() {
  return (
    <div className="spm">
      <div className="spm-bg"></div><div className="spm-grain"></div>
      <MTop eyebrow="Play 1v1 ·" bold="Private Table" right={<MSignet />} />
      <div className="mstage">
        <div className="kick">Your Private Table</div>
        <h1 className="mi-h1">Invite a Challenger</h1>
        <div className="mi-sub">Send the link — first to open it sits across from you.</div>
        <div className="mi-seats">
          <div className="mi-seat"><div className="ring">J</div><div className="nm">jjk_55</div><div className="el">1,250 · Gold III</div></div>
          <div className="mi-vs">vs</div>
          <div className="mi-seat empty"><div className="ring">?</div><div className="nm">Waiting…</div><div className="el">seat open</div></div>
        </div>
        <div className="mi-link"><span className="url">sidepocket.club/t/JJK-7F2K-9QX</span><button className="m-gold">Copy</button></div>
        <div className="mi-opts"><button className="m-ghost">Best of 3</button><button className="m-ghost">Share</button><button className="m-ghost">QR</button></div>
      </div>
    </div>
  );
}

function MobileMatchmaking() {
  const faces = [{ m: "V", c: "#5e2c7a" }, { m: "D", c: "#8c2230" }, { m: "S", c: "#1e3a6e" }, { m: "C", c: "#1f6f5c" }, { m: "M", c: "#b5631a" }, { m: "R", c: "#2a5440" }];
  const FACE = 84;
  const loop = [...faces, ...faces];
  return (
    <div className="spm mm-match">
      <div className="mbg"></div><div className="mveil"></div>
      <MTop eyebrow="The Velvet Room ·" bold="Ranked" />
      <div className="mstage">
        <div className="kick">Members Club</div>
        <h1 style={{ fontSize: 32 }}>Seating a challenger</h1>
        <div className="sub">Reading the register · ELO 1,250 ± 80</div>
        <div className="mmatch-duel">
          <div className="md-duelist you"><div className="md-ring">J</div><div className="nm">jjk_55</div><div className="el">1,250 · Gold III</div></div>
          <div className="mmatch-vs">vs</div>
          <div className="md-duelist"><div className="md-ring"><div className="opp-spin"><div className="trk" style={{ "--dist": "-" + faces.length * FACE + "px" }}>{loop.map((f, i) => <div className="face" key={i} style={{ background: `radial-gradient(circle at 38% 30%, ${f.c}, #0c1812 88%)` }}>{f.m}</div>)}</div></div></div><div className="nm">searching…</div><div className="el">matching by skill</div></div>
        </div>
        <div className="mmatch-status"><span className="m-live"></span>318 in the room · checked 1,284</div>
        <button className="m-ghost mmatch-cancel">Cancel Search</button>
      </div>
    </div>
  );
}

function MobileReveal() {
  return (
    <div className="spm mm-reveal">
      <div className="mbg"></div><div className="mveil"></div>
      <MTop eyebrow="The Velvet Room ·" bold="Best of 3" />
      <div className="mstage">
        <div className="kick">Your Challenger</div>
        <div className="mrev-cards">
          <div className="mrev-f you"><div className="pr">J</div><div className="fh">jjk_55</div><div className="ch"><span className="p2">Gold III</span><span className="e2">1,250</span></div></div>
          <div className="mrev-vs">VS</div>
          <div className="mrev-f opp"><div className="pr">V</div><div className="fh">Velvet Q</div><div className="ch"><span className="p2">Gold II</span><span className="e2">1,238</span></div></div>
        </div>
        <div className="mrev-tape">
          {[{ l: "ELO", a: "1,250", b: "1,238", aw: 1 }, { l: "Win Rate", a: "68%", b: "71%", bw: 1 }, { l: "Tier", a: "Gold III", b: "Gold II", aw: 1 }, { l: "Frames", a: "312", b: "488", bw: 1 }].map((r) => (
            <div className="col" key={r.l}><span className="v"><b style={r.aw ? {} : { color: "var(--c-cream-d)" }}>{r.a}</b> <span>/</span> <b style={r.bw ? {} : { color: "var(--c-cream-d)" }}>{r.b}</b></span><span className="l">{r.l}</span></div>
          ))}
        </div>
        <button className="m-gold mrev-go"><span className="t">Take the Break</span><span className="s">Best of 3 · 45s turns</span></button>
      </div>
    </div>
  );
}

function MobileResult({ win = true }) {
  return (
    <div className="spm mm-reveal">
      <div className="mbg"></div><div className="mveil"></div>
      <MTop eyebrow="The Velvet Room ·" bold="Best of 3" />
      <div className="mstage">
        <div className="kick mres-kick">{win ? "The Frame is Yours" : "Rack 'Em Again"}</div>
        <h1 className={"mres-stamp" + (win ? "" : " lose")}>{win ? "Victory" : "Defeat"}</h1>
        <div className="mres-score">
          <div className={"mres-pl" + (win ? " win" : "")}><div className="pp" style={{ background: "radial-gradient(circle at 38% 30%, #2a6b4f, #143b2c 78%)" }}>J</div><div className="pn">jjk_55</div><div className="tg">{win ? "Winner" : "Defeated"}</div></div>
          <div className="mres-vs">{win ? "3" : "1"}<span className="d">—</span>{win ? "1" : "3"}</div>
          <div className={"mres-pl" + (win ? "" : " win")}><div className="pp" style={{ background: "radial-gradient(circle at 38% 30%, #7a3aa0, #2c1140 80%)" }}>V</div><div className="pn">Velvet Q</div><div className="tg">{win ? "Defeated" : "Winner"}</div></div>
        </div>
        <div className="mres-rwd">
          <div className="r"><span className="rl">Rating</span><span className={"rv " + (win ? "up" : "down")}>{win ? "+22" : "−18"}</span></div>
          <div className="r"><span className="rl">Now</span><span className="rv">{win ? "1,272" : "1,232"}</span></div>
          <div className="r"><span className="rl">Best Run</span><span className="rv">{win ? "4 balls" : "2 balls"}</span></div>
        </div>
        <div className="mres-cta"><button className="m-gold">Rematch</button><button className="m-ghost">Back to Room</button></div>
      </div>
    </div>
  );
}

Object.assign(window, { MobileMenu, MobileRooms, MobileDifficulty, MobileInvite, MobileMatchmaking, MobileReveal, MobileResult });