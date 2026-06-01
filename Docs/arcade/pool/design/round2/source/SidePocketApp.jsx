// SidePocketApp.jsx — the spec-driven pool app in the After-hours language.
// Phase A begins with the anchor: Main Menu ("The Room"). Shared chrome here
// (Masthead, CurrencyChips, ModeButton) is reused by every later screen.

// SOL · TKT · G — the always-present wallet. (Per POOL_DESIGNER_SPEC §2 / §8.1.)
function CurrencyChips({ sol = "0.42", tkt = "1,840", g = "1,247" }) {
  return (
    <div className="cur-chips">
      <span className="cur"><span className="ci ci-sol">◎</span>{sol} <span className="cu">SOL</span></span>
      <span className="cur"><span className="ci ci-tkt">T</span>{tkt} <span className="cu">TKT</span></span>
      <span className="cur"><span className="ci ci-g">G</span>{g} <span className="cu">G</span></span>
    </div>
  );
}

function Masthead({ mode = "The Room" }) {
  return (
    <header className="sp-bar menu-bar">
      <div className="mb-left">
        <button className="mb-icon" title="Back to The Arcade">‹</button>
        <span className="sp-brandsmall">Side Pocket</span>
        <span className="mb-mode">{mode}</span>
      </div>
      <div className="mb-right">
        <div className="signet">
          <div className="av">J</div>
          <div className="meta">
            <div className="h">jjk_55</div>
            <div className="e"><span className="prestige">Gold III</span><span className="elo">1,250 ELO</span></div>
          </div>
        </div>
        <CurrencyChips />
        <button className="mb-icon" title="Menu">≡</button>
      </div>
    </header>
  );
}

function ModeButton({ primary, hero, title, sub, live }) {
  return (
    <button className={"mode" + (primary ? " mode--primary" : "") + (hero ? " mode--hero" : "")}>
      <span className="mbody">
        <span className="mt">{title}</span>
        <span className="ms">{sub}</span>
      </span>
      {live && <span className="live">{live}</span>}
      <span className="chev">›</span>
    </button>
  );
}

function ModePill({ title, live }) {
  return (
    <button className="mpill">
      {live && <span className="ldot" title="Live now"></span>}
      {title}
    </button>
  );
}

function MainMenuDesktop() {
  return (
    <div className="sp sp-night">
      <Masthead mode="The Room" />

      <main className="menu-main">
        {/* left — the player + the modes radiating out */}
        <div className="menu-left">
          <div className="player-card">
            <div className="av">J</div>
            <div className="pc-meta">
              <div className="pc-h">jjk_55</div>
              <div className="pc-sub"><span className="prestige">Gold III</span><span className="elo">1,250 ELO · Top 8%</span></div>
            </div>
          </div>

          <div className="mode-list">
            <ModeButton primary hero title="Play" sub="Ranked or Private · find a match" />
            <div className="mode-pills">
              <ModePill title="Tournaments" live />
              <ModePill title="VS Computer" />
              <ModePill title="Marathon" />
              <ModePill title="Practice" />
            </div>
          </div>

          <div className="side-links">
            <a>Cue Locker</a><span className="sep">·</span>
            <a>Pool Shop</a><span className="sep">·</span>
            <a>Profile</a>
          </div>
        </div>

        {/* right — the room: neon sign over the lit table + today's challenge */}
        <section className="menu-room">
          <h1 className="neon-wm">Side <em>Pocket</em></h1>
          <div className="neon-sub">Members Only · Est. 1952</div>
          <div className="lamp"><span className="cord"></span><span className="shade"></span><span className="cone"></span></div>
          <div className="night-table"><BilliardTable /></div>

          <div className="daily">
            <div className="dleft">
              <div className="dk">Daily Challenge</div>
              <div className="dt">Run four balls in a single turn</div>
              <div className="dd">Reward <b>+50 G</b> · <b>+1 TKT</b> · resets in 8h 12m</div>
            </div>
            <button className="lbtn-primary">Take the Shot</button>
          </div>
        </section>
      </main>
    </div>
  );
}

Object.assign(window, { CurrencyChips, Masthead, ModeButton, ModePill, MainMenuDesktop });

// ── Craft pass: same menu, rebuilt as physical objects (see sp_craft.css) ──
function CraftMode({ title, live }) {
  return (
    <button className="craft-mode">
      {live && <span className="ldot" title="Live now"></span>}
      {title}
    </button>
  );
}

function MainMenuCraft() {
  return (
    <div className="sp sp-night sp-craft">
      <Masthead mode="The Room" />

      <main className="menu-main">
        <div className="menu-left">
          <div className="craft-plate">
            <div className="av">J</div>
            <div className="pc-meta">
              <div className="pc-h">jjk_55</div>
              <div className="pc-sub"><span className="prestige">Gold III</span><span className="elo">1,250 ELO · Top 8%</span></div>
            </div>
          </div>

          <button className="craft-play">
            <span>
              <span className="pt">PLAY</span>
              <span className="ps">Ranked or Private · find a match</span>
            </span>
            <span className="pchev">›</span>
          </button>

          <div className="craft-modes">
            <CraftMode title="Tournaments" live />
            <CraftMode title="VS Computer" />
            <CraftMode title="Marathon" />
            <CraftMode title="Practice" />
          </div>

          <div className="craft-links">
            <a>Cue Locker</a>
            <a>Pool Shop</a>
            <a>Profile</a>
          </div>
        </div>

        <section className="menu-room">
          <h1 className="neon-wm">Side <em>Pocket</em></h1>
          <div className="neon-sub">Members Only · Est. 1952</div>
          <div className="lamp"><span className="cord"></span><span className="shade"></span><span className="cone"></span></div>
          <div className="night-table"><BilliardTable /></div>

          <div className="craft-daily">
            <div className="dleft">
              <div className="dk">Daily Challenge</div>
              <div className="dt">Run four balls in a single turn</div>
              <div className="dd">Reward <b>+50 G</b> · <b>+1 TKT</b> · resets in 8h 12m</div>
            </div>
            <button className="craft-cta">Take the Shot</button>
          </div>
        </section>
      </main>
    </div>
  );
}

Object.assign(window, { CraftMode, MainMenuCraft });

// ── Editorial pass: restraint, one material (felt), confident type ──
function MainMenuEditorial() {
  const modes = [
    { n: "Tournaments", m: "Daily Free · 12:34", live: true },
    { n: "VS Computer", m: "4 bots · Easy–Insane" },
    { n: "Marathon", m: "Solo run" },
    { n: "Practice", m: "No clock" },
  ];
  return (
    <div className="sp-ed">
      <header className="ed-bar">
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <span className="ed-brand">Side <em>Pocket</em></span>
          <span className="ed-room">The Room</span>
        </div>
        <div className="ed-wallet">
          <span className="w sol"><b>◎ 0.42</b><u>SOL</u></span><span className="dot"></span>
          <span className="w tkt"><b>1,840</b><u>TKT</u></span><span className="dot"></span>
          <span className="w g"><b>1,247</b><u>G</u></span>
          <span className="ed-signet">
            <span className="av">J</span>
            <span><span className="h">jjk_55</span><div className="e">GOLD III · 1,250</div></span>
          </span>
        </div>
      </header>

      <main className="ed-main">
        <div className="ed-left">
          <div className="ed-kicker">Member No. 142</div>
          <div className="ed-player"><span className="nm">jjk_55</span><span className="rk">1,250 ELO · Top 8%</span></div>

          <button className="ed-play">
            <span><span className="pt">PLAY</span><span className="ps">Ranked or Private</span></span>
            <span className="pchev">›</span>
          </button>

          <div className="ed-modes">
            {modes.map((x) => (
              <button className="ed-mode" key={x.n}>
                <span className="mn">{x.n}</span>
                <span className={"mm" + (x.live ? " live" : "")}>{x.m}</span>
              </button>
            ))}
          </div>

          <div className="ed-links"><a>Cue Locker</a><a>Pool Shop</a><a>Profile</a></div>
        </div>

        <section className="ed-room">
          <h1 className="ed-foil">Side <em>Pocket</em></h1>
          <div className="ed-foilsub">Members Only · Est. 1952</div>
          <div className="ed-table"><BilliardTable /></div>
          <div className="ed-daily">
            <div>
              <div className="dk">Daily Challenge</div>
              <div className="dt">Run four balls in one turn</div>
              <div className="dd">Reward <b>+50 G · +1 TKT</b> · resets 8h 12m</div>
            </div>
            <button className="ed-take">Take the Shot</button>
          </div>
        </section>
      </main>
    </div>
  );
}

Object.assign(window, { MainMenuEditorial });

// ── Hero menu: stripped to the real 8-ball shape — hero + a few buttons ──
function MainMenuHero() {
  return (
    <div className="sp-mh">
      <div className="mh-scene">
        <div className="mh-lamp"></div>
        <div className="mh-felt"></div>
        <div className="mh-cue"></div>
        <div className="mh-cueball"></div>
        <div className="mh-vignette"></div>
      </div>

      <div className="mh-top">
        <div className="mh-wallet">
          <span className="w sol"><b>◎ 0.42</b><u>SOL</u></span><span className="dot"></span>
          <span className="w tkt"><b>1,840</b><u>TKT</u></span><span className="dot"></span>
          <span className="w g"><b>1,247</b><u>G</u></span>
        </div>
        <div className="mh-sig">
          <span className="av">J</span>
          <span><span className="h">jjk_55</span><div className="e">GOLD III</div></span>
        </div>
        <button className="mh-ico" title="Settings">⚙</button>
      </div>

      <div className="mh-body">
        <div className="mh-est">Members Only · Est. 1952</div>
        <h1 className="mh-wm">Side <em>Pocket</em></h1>

        <div className="mh-cta">
          <button className="mh-play">
            <span className="t">PLAY</span>
            <span className="chev">›</span>
          </button>
          <button className="mh-btn">VS Computer</button>
          <button className="mh-btn">Tournaments<span className="tag">Daily Free · 12:34</span></button>
          <div className="mh-more"><a>Practice</a><a>Cue Locker</a><a>Pool Shop</a></div>
        </div>
      </div>

      <div className="mh-foot">Skill only · No luck · 45-second turns</div>
    </div>
  );
}

Object.assign(window, { MainMenuHero });

// ── Blend: hero mood + warm PLAY, with the real table + daily back ──
function MainMenuBlend() {
  return (
    <div className="sp-bl">
      <div className="bl-room"><div className="bl-lamp"></div><div className="bl-vignette"></div></div>

      <div className="bl-top">
        <div className="bl-wallet">
          <span className="w sol"><b>◎ 0.42</b><u>SOL</u></span><span className="dot"></span>
          <span className="w tkt"><b>1,840</b><u>TKT</u></span><span className="dot"></span>
          <span className="w g"><b>1,247</b><u>G</u></span>
        </div>
        <div className="bl-sig"><span className="av">J</span><span><span className="h">jjk_55</span><div className="e">GOLD III</div></span></div>
        <button className="bl-ico" title="Settings">⚙</button>
      </div>

      <main className="bl-main">
        <div className="bl-left">
          <div className="bl-est">Members Only · Est. 1952</div>
          <h1 className="bl-wm">Side <em>Pocket</em></h1>
          <div className="bl-cta">
            <button className="bl-play"><span className="t">PLAY</span><span className="chev">›</span></button>
            <button className="bl-btn">VS Computer</button>
            <button className="bl-btn">Tournaments<span className="tag">Daily Free · 12:34</span></button>
            <div className="bl-more"><a>Practice</a><a>Cue Locker</a><a>Pool Shop</a></div>
          </div>
        </div>

        <section className="bl-right">
          <div className="bl-table"><BilliardTable /></div>
          <div className="bl-daily">
            <div>
              <div className="dk">Daily Challenge</div>
              <div className="dt">Run four balls in one turn</div>
              <div className="dd">Reward <b>+50 G · +1 TKT</b> · resets 8h 12m</div>
            </div>
            <button className="bl-take">Take the Shot</button>
          </div>
        </section>
      </main>
    </div>
  );
}

Object.assign(window, { MainMenuBlend });

// ── Club: the photoreal-render direction, built with a swappable room plate
//    and crisp UI on top. No left nav, no bottom room cards. ──
function MainMenuClub() {
  return (
    <div className="sp-club">
      <div className="club-plate"></div>
      <div className="club-scrim"></div>

      <div className="club-top">
        <div className="club-wm"></div>
        <div className="club-wallet">
          <div className="club-sol" title="SOL balance">
            <span className="solball">◎</span>
            <span className="solval"><b>0.42</b><u>SOL</u></span>
          </div>
          <div className="csignet">
            <span className="av">J</span>
            <span className="cval">
              <b>jjk_55</b>
              <span className="tiers"><span className="prestige">Gold III</span><span className="elo">1,250 Elo</span></span>
            </span>
          </div>
          <button className="club-gear" title="Settings">⚙</button>
        </div>
      </div>

      <div className="club-hero">
        <div className="club-kick">Members Club · Est. 1952</div>
        <h1 className="club-head">Side<br /><em>Pocket</em></h1>
        <div className="club-tagline">Skill only. No luck.</div>
        <div className="club-online"><i></i><b>2,317</b>&nbsp;<span>players online</span></div>
        <div className="club-cta">
          <button className="club-play">
            <span className="pico">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="2.3"></circle>
                <circle cx="8.6" cy="11" r="2.3"></circle><circle cx="15.4" cy="11" r="2.3"></circle>
                <circle cx="5.2" cy="17" r="2.3"></circle><circle cx="12" cy="17" r="2.3"></circle><circle cx="18.8" cy="17" r="2.3"></circle>
              </svg>
            </span>
            <span className="ptxt"><span className="t">Play 1v1</span><span className="s">Classic 8-Ball</span></span>
            <span className="parr">›</span>
          </button>
          <button className="club-tour">
            <span className="tico">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9a6 6 0 0 0 12 0V3H6z"></path><path d="M6 4H3v2a3 3 0 0 0 3 3"></path>
                <path d="M18 4h3v2a3 3 0 0 1-3 3"></path><path d="M12 15v4"></path><path d="M8 21h8"></path><path d="M9 21v-2h6v2"></path>
              </svg>
            </span>
            <span className="ttxt"><span className="t">Tournaments</span><span className="s">Daily Free · starts 12:34</span></span>
            <span className="tarr">›</span>
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { MainMenuClub });

// ── PLAY flow · Room Picker: 8-ball-style carousel, each room its own vibe ──
function MainPlaySelect() {
  const ROOMS = [
    { name: "The Break Room", tag: "Warm up. Skill only, no stakes.", gate: "Open to all", locked: false, tier: "Bronze+", players: "1,240", c1: "#1f6f5c", c2: "#0b241d", accent: "#4FD6B0", n: "8", id: "break", hint: "Pub backroom · single hanging bulb" },
    { name: "Hustler's Alley", tag: "Where reputations get made.", gate: "Silver+", locked: false, tier: "Silver+", players: "612", c1: "#b5631a", c2: "#2f1908", accent: "#F2A24A", n: "5", id: "hustler", hint: "Dim corner bar · neon sign haze" },
    { name: "The Velvet Room", tag: "Smooth felt, smoother operators.", gate: "Gold+", locked: false, tier: "Gold+", players: "318", c1: "#5e2c7a", c2: "#220e30", accent: "#C77BE8", n: "4", id: "velvet", hint: "Velvet booths · low brass lamps" },
    { name: "The Gold Lounge", tag: "Members with a steady hand.", gate: "Platinum+", locked: true, tier: "Platinum+", players: "146", c1: "#8a6a1e", c2: "#2a2008", accent: "#F2D27A", n: "1", id: "gold", hint: "Gilded private room · gold leaf" },
    { name: "Sharks' Den", tag: "Swim with the big fish.", gate: "Diamond", locked: true, tier: "Diamond", players: "58", c1: "#8c2230", c2: "#2a0a10", accent: "#F26B7A", n: "3", id: "sharks", hint: "Smoky underground den · one spotlit table" },
    { name: "The Penthouse", tag: "Top of the house. Invitation only.", gate: "Invitation", locked: true, tier: "Invitation", players: "12", c1: "#1e3a6e", c2: "#0a1426", accent: "#6FA8FF", n: "2", id: "penthouse", hint: "Skyline suite · after-midnight city glow" },
  ];
  const [active, setActive] = React.useState(1);
  const CARD = 380, GAP = 24, FRAME = 1440;
  const trackStyle = { transform: `translateX(${FRAME / 2 - (active * (CARD + GAP) + CARD / 2)}px)` };

  return (
    <div className="sp-play">
      <header className="play-top">
        <button className="play-back">‹</button>
        <span className="play-eyebrow">Play · <b>Pick Your Room</b></span>
        <span className="spacer"></span>
        <div className="play-wallet">
          <span className="psignet"><span className="av">J</span><span className="prestige">Gold III</span><span className="elo">1,250 Elo</span></span>
        </div>
      </header>

      <div className="play-head">
        <span className="h">Pick Your Room</span>
        <span className="s">Skill-only tables · matched by Elo · climb the house ladder</span>
      </div>

      <div className="carousel">
        <button className="carousel-nav prev" onClick={() => setActive((a) => Math.max(0, a - 1))}>‹</button>
        <div className="carousel-track" style={trackStyle}>
          {ROOMS.map((r, i) => (
            <div key={r.name} className={"rcard" + (i === active ? " is-active" : "") + (r.locked ? " is-locked" : "")}
              style={{ "--c1": r.c1, "--c2": r.c2, "--accent": r.accent }} onClick={() => setActive(i)}>
              <div className="rbg"><image-slot id={"room-" + r.id} placeholder={r.hint}></image-slot></div>
              <div className="rscrim"></div>
              <div className="rghost"><span>{r.n}</span></div>
              <div className="rglow"></div>
              <div className="rtop">
                <div className="rball">{r.n}</div>
                <div className="rtier">{r.locked ? "🔒 " : ""}{r.tier}</div>
              </div>
              <div className="rexcl" title={"House tier " + (i + 1) + " of " + ROOMS.length}>
                <span className="rexcl-lab">Exclusivity</span>
                <span className="rexcl-pips">
                  {ROOMS.map((_, j) => <i key={j} className={j <= i ? "on" : ""}></i>)}
                </span>
              </div>
              <div className="rname">{r.name}</div>
              <div className="rtag">{r.tag}</div>
              <div className="rmeta">
                <span className={"gate" + (r.locked ? " locked" : "")}>{r.gate}</span>
                <span className="pl"><i></i>{r.players} playing</span>
              </div>
              <button className={"renter" + (r.locked ? " is-locked" : "")}>{r.locked ? "Reach " + r.tier : "Find Match"}<span className="arr">›</span></button>
            </div>
          ))}
        </div>
        <button className="carousel-nav next" onClick={() => setActive((a) => Math.min(ROOMS.length - 1, a + 1))}>›</button>
      </div>

      <div className="carousel-dots">
        {ROOMS.map((r, i) => (
          <i key={r.name} className={i === active ? "on" : ""} onClick={() => setActive(i)}></i>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { MainPlaySelect });

// ── PLAY flow · Matchmaking: the club seats a challenger across the felt ──
function MatchmakingScreen() {
  const faces = [
    { m: "V", c: "#5e2c7a" }, { m: "D", c: "#8c2230" }, { m: "S", c: "#1e3a6e" },
    { m: "C", c: "#1f6f5c" }, { m: "M", c: "#b5631a" }, { m: "R", c: "#2a5440" },
    { m: "B", c: "#8a6a1e" }, { m: "K", c: "#6b2d4a" },
  ];
  const FACE = 132;
  const loop = [...faces, ...faces];
  return (
    <div className="sp-match">
      <div className="match-bg"></div>
      <div className="match-veil"></div>

      <header className="match-top">
        <button className="play-back">‹</button>
        <span className="rmtag"><b>The Velvet Room</b> · Ranked · Skill-based</span>
      </header>

      <div className="match-stage">
        <div className="match-kick">Members Club</div>
        <h1 className="match-title">Seating a challenger</h1>
        <div className="match-sub">Reading the register for a fair game · ELO 1,250 ± 80<span className="dots"></span></div>

        <div className="duel">
          <div className="duelist you">
            <div className="duel-ring">J</div>
            <div className="nm">jjk_55</div>
            <div className="el">1,250 ELO · Gold III</div>
          </div>
          <div className="vs">vs</div>
          <div className="duelist opp">
            <div className="duel-ring">
              <div className="opp-track" style={{ "--dist": faces.length * FACE + "px" }}>
                {loop.map((f, i) => (
                  <div className="opp-face" key={i} style={{ background: `radial-gradient(circle at 38% 30%, ${f.c}, #0c1812 88%)` }}>{f.m}</div>
                ))}
              </div>
            </div>
            <div className="nm">searching…</div>
            <div className="el">matching by skill</div>
          </div>
        </div>

        <div className="match-status"><i></i>318 members in the room<span className="sep">·</span>checked 1,284 so far</div>
        <button className="match-cancel">Cancel Search</button>
      </div>
    </div>
  );
}

Object.assign(window, { MatchmakingScreen });

// ── PLAY flow · Opponent Reveal: the two square off before the break ──
function OpponentReveal() {
  const h2h = [
    { l: "1,250", r: "1,238", label: "ELO", lw: true },
    { l: "68%", r: "71%", label: "Win Rate", rw: true },
    { l: "Gold III", r: "Gold II", label: "Tier", lw: true },
    { l: "312", r: "488", label: "Frames Won", rw: true },
  ];
  return (
    <div className="sp-reveal">
      <div className="reveal-bg"></div>
      <div className="reveal-veil"></div>

      <header className="reveal-top">
        <button className="play-back">‹</button>
        <span className="rmtag"><b>The Velvet Room</b> · Ranked · Best of 3</span>
      </header>

      <div className="reveal-stage">
        <div className="reveal-kick">Your Challenger</div>
        <div className="duel-cards">
          <div className="fighter you">
            <div className="portrait">J</div>
            <div className="fh">jjk_55</div>
            <div className="chips"><span className="prestige2">Gold III</span><span className="elo2">1,250 ELO</span></div>
            <div className="rec">68% win · 312 frames</div>
          </div>
          <div className="vs-med">VS</div>
          <div className="fighter opp">
            <div className="portrait">V</div>
            <div className="fh">Velvet Q</div>
            <div className="chips"><span className="prestige2">Gold II</span><span className="elo2">1,238 ELO</span></div>
            <div className="rec">71% win · 488 frames</div>
          </div>
        </div>

        <div className="h2h">
          {h2h.map((row) => (
            <div className="h2h-row" key={row.label}>
              <span className={"hv l" + (row.lw ? " win" : "")}>{row.l}</span>
              <span className="hl">{row.label}</span>
              <span className={"hv r" + (row.rw ? " win" : "")}>{row.r}</span>
            </div>
          ))}
        </div>

        <div className="reveal-ready"><i></i>Table's racked · you break</div>
        <button className="reveal-go"><span className="t">Take the Break</span><span className="s">Best of 3 · 45s turns</span></button>
      </div>
    </div>
  );
}

Object.assign(window, { OpponentReveal });

// ── PLAY flow · Match Result: the payoff (win + defeat variants) ──
function MatchResultBase({ win }) {
  return (
    <div className="sp-result">
      <div className="res-bg"></div>
      <div className="res-veil"></div>

      <header className="res-top">
        <span className="rmtag"><b>The Velvet Room</b> · Ranked · Best of 3</span>
      </header>

      <div className="res-stage">
        <div className="res-kick">{win ? "The Frame is Yours" : "Rack 'Em Again"}</div>
        <h1 className={"res-stamp" + (win ? "" : " lose")}>{win ? "Victory" : "Defeat"}</h1>

        <div className="res-score">
          <div className={"res-pl " + (win ? "win" : "lose")}>
            <div className="pp">J</div>
            <div className="pn">jjk_55</div>
            <div className="tag">{win ? "Winner" : "Defeated"}</div>
          </div>
          <div className="res-vs">{win ? "3" : "1"}<span className="dash">—</span>{win ? "1" : "3"}</div>
          <div className={"res-pl " + (win ? "lose" : "win")}>
            <div className="pp">V</div>
            <div className="pn">Velvet Q</div>
            <div className="tag">{win ? "Defeated" : "Winner"}</div>
          </div>
        </div>

        <div className="res-rewards">
          <div className="rwd">
            <span className="ic elo">±</span>
            <span><span className="rl">Rating</span><span className={"rv " + (win ? "up" : "down")}>{win ? "+22" : "−18"} <span className="sm">→ {win ? "1,272" : "1,232"}</span></span></span>
          </div>
          <div className="rwd">
            <span className="ic prestige">G</span>
            <span><span className="rl">Gold III</span><span className="rv"><span className="sm">{win ? "4 wins to Gold IV" : "win 2 to hold"}</span></span></span>
          </div>
          <div className="rwd">
            <span className="ic stat">◎</span>
            <span><span className="rl">Best Run</span><span className="rv">{win ? "4 balls" : "2 balls"} <span className="sm">· {win ? "78%" : "61%"} pots</span></span></span>
          </div>
        </div>

        <div className="res-cta">
          <button className="res-rematch">Rematch</button>
          <button className="res-lobby">Back to Room</button>
        </div>
      </div>
    </div>
  );
}

function MatchResult() { return <MatchResultBase win={true} />; }
function MatchResultDefeat() { return <MatchResultBase win={false} />; }

Object.assign(window, { MatchResult, MatchResultDefeat });

// ── Tournaments: featured cup + a massive left-to-right bracket tree ──
function TournamentsScreen() {
  // 8-player single-elim: Quarterfinals → Semifinals → Final → Champion.
  const QF = [
    { a: { nm: "jjk_55", seed: "5", sc: "2", win: true, you: true }, b: { nm: "Sidewinder", seed: "4", sc: "0" }, done: true },
    { a: { nm: "Velvet Q", seed: "8", sc: "2", win: true }, b: { nm: "Chalkdust", seed: "1", sc: "1" }, done: true },
    { a: { nm: "Deadstroke", seed: "2", sc: "2", win: true }, b: { nm: "BankShotBea", seed: "7", sc: "1" }, done: true },
    { a: { nm: "KissShot", seed: "3", sc: "2", win: true }, b: { nm: "RailRunner", seed: "6", sc: "0" }, done: true },
  ];
  const SF = [
    { a: { nm: "jjk_55", seed: "5", you: true }, b: { nm: "Velvet Q", seed: "8" }, state: "now" },
    { a: { nm: "Deadstroke", seed: "2" }, b: { nm: "KissShot", seed: "3" }, state: "soon", meta: "starts 1:12:00" },
  ];
  const FINAL = [
    { a: { nm: "Winner · SF1", tbd: true }, b: { nm: "Winner · SF2", tbd: true }, state: "locked" },
  ];
  const upcoming = [
    { d: "20:00", u: "Tonight", name: "Gold Invitational", meta: "Single elim · 8 · Gold+", entry: "Free" },
    { d: "Sat", u: "Weekend", name: "The Masters", meta: "Invite only · 8 · Diamond", entry: "Invite" },
    { d: "Free", u: "Hourly", name: "House Open", meta: "Single elim · 8 · all tiers", entry: "Free" },
  ];

  const Side = ({ p }) => (
    <div className={"bm-side" + (p.win ? " win" : "") + (p.you ? " you" : "") + (p.tbd ? " tbd" : "")}>
      <span className="seed">{p.tbd ? "·" : p.seed}</span>
      <span className="bnm">{p.nm}</span>
      {p.sc != null && <span className="bsc">{p.sc}</span>}
    </div>
  );
  const Match = ({ m, n, round }) => (
    <div className={"bmatch r-" + round + (m.state ? " st-" + m.state : "") + (m.done ? " done" : "")}>
      <span className="bm-tag">{round === "qf" ? "QF" + n : round === "sf" ? "SF" + n : "Final"}</span>
      <Side p={m.a} />
      <div className="bm-div"></div>
      <Side p={m.b} />
      {m.state === "now" && <span className="bm-cta">Play Now ›</span>}
      {m.state === "soon" && <span className="bm-meta">{m.meta}</span>}
      {m.state === "locked" && <span className="bm-meta locked">Awaiting semifinals</span>}
    </div>
  );

  return (
    <div className="sp-tourney">
      <header className="tn-top">
        <button className="play-back">‹</button>
        <span className="tn-eyebrow">Members Club · <b>Tournaments</b></span>
        <span className="spacer"></span>
        <div className="tn-wallet">
          <span className="tn-chip"><span className="ci">J</span><b>Gold III</b><u>1,250 Elo</u></span>
        </div>
      </header>

      <div className="tn-band">
        <div className="tb-left">
          <span className="tb-kick">Daily · In Progress</span>
          <span className="tb-name">The Velvet Cup</span>
        </div>
        <div className="tb-meta">
          <div><span className="k">Format</span><span className="v">Single Elim · 8</span></div>
          <div><span className="k">Your Status</span><span className="v gold">Semifinalist</span></div>
          <div><span className="k">Reward</span><span className="v">Crown · Elo · Cue</span></div>
          <div><span className="k">Next Match</span><span className="v">starts in 4:30</span></div>
        </div>
        <button className="tb-go">Continue · Semifinal</button>
      </div>

      <div className="tn-bracket">
        <div className="round qf">
          <div className="rhead">Quarterfinals</div>
          <div className="matches">
            {QF.map((m, i) => <Match key={i} m={m} n={i + 1} round="qf" />)}
          </div>
        </div>
        <div className="round sf">
          <div className="rhead">Semifinals</div>
          <div className="matches">
            {SF.map((m, i) => <Match key={i} m={m} n={i + 1} round="sf" />)}
          </div>
        </div>
        <div className="round fn">
          <div className="rhead">The Final</div>
          <div className="matches">
            {FINAL.map((m, i) => <Match key={i} m={m} n={i + 1} round="fn" />)}
          </div>
        </div>
        <div className="round champ">
          <div className="rhead">Champion</div>
          <div className="matches">
            <div className="bchamp">
              <span className="crown">♔</span>
              <span className="ct">The Crown</span>
              <span className="cs">Title · +Elo · Cue Unlock</span>
            </div>
          </div>
        </div>
      </div>

      <div className="tn-upcoming">
        <div className="ul">Upcoming</div>
        <div className="tn-cards">
          {upcoming.map((t) => (
            <button className="tcard" key={t.name}>
              <span className="tc-when"><span className="d">{t.d}</span><span className="u">{t.u}</span></span>
              <span className="tc-body"><span className="tc-name">{t.name}</span><span className="tc-meta">{t.meta}</span></span>
              <span className="tc-entry">{t.entry}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { TournamentsScreen });
