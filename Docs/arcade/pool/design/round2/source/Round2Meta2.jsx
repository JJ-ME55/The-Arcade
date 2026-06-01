// Round2Meta2.jsx — #21 Game settings section, #22 cue Equip modal, #23 wagered
// room badge. Settings/badge use the .t2 shell; equip reuses the .wf modal.

function GameSettings({ surface = "web" }) {
  return (
    <div className={"t2 " + surface}>
      <div className="grain"></div>
      <div className="gs-card">
        <div className="gs-head"><div className="eb">Settings</div><div className="ti">Game</div></div>
        <div className="gs-body">
          <div className="gs-sh">Aiming</div>
          <div className="gs-row">
            <span className="gs-lab">Aim guideline<span className="d">Projected cue line + ghost ball</span></span>
            <span style={{ display: "flex", alignItems: "center", gap: "calc(10px * var(--u))" }}>
              <span className="gs-prev"><span className="ln"></span><span className="gh"></span></span>
              <span className="gs-seg"><button className="on">On</button><button>Short</button><button>Off</button></span>
            </span>
          </div>
          <div className="gs-row">
            <span className="gs-lab">English physics<span className="d">Full spin · off reduces to display-only</span></span>
            <span className="gs-tog"></span>
          </div>
          {surface === "mob" && <div className="gs-row"><span className="gs-lab">Aim-assist sensitivity<span className="d">Tap-aim + hold-to-refine</span></span><span className="gs-sl"><i style={{ width: "60%" }}></i><span className="k" style={{ left: "60%" }}></span></span></div>}
          <div className="gs-sh">Table</div>
          <div className="gs-row"><span className="gs-lab">Cue &amp; felt theme<span className="d">Cosmetic · more coming</span></span><span className="gs-theme"><i style={{ background: "#1E5FA8" }}></i><i style={{ background: "#1b5a3e" }}></i><i style={{ background: "#5e2c7a" }}></i></span></div>
          <div className="gs-sh">Sound</div>
          <div className="gs-row"><span className="gs-lab">Match sound effects<span className="d">Cue, pocket, break</span></span><span className="gs-tog"></span></div>
          <div className="gs-row"><span className="gs-lab">Pub ambience<span className="d">Low after-hours loop</span></span><span className="gs-tog off"></span></div>
          <div className="gs-row"><span className="gs-lab">Master volume</span><span className="gs-sl"><i style={{ width: "70%" }}></i><span className="k" style={{ left: "70%" }}></span></span></div>
        </div>
      </div>
    </div>
  );
}

function CueEquip({ surface = "web", equipped = false }) {
  return (
    <React.Fragment>
      <div className="behind"></div><div className="grain"></div>
      <div className="wf-modal">
        <div className="wf-head"><div><div className="wf-eyebrow">Cue Locker</div><div className="wf-title">{equipped ? "Equipped" : "Equip Cue?"}</div></div></div>
        <div className="wf-body">
          <div className="ce-cuewrap"><span className="ce-cue"></span></div>
          {equipped
            ? <React.Fragment><div className="ce-equipped">Velvet Night — Equipped</div><button className="wf-cta ghost">Back to Locker</button></React.Fragment>
            : <React.Fragment>
                <div className="wf-cap" style={{ textAlign: "center" }}>Equip <b style={{ color: "var(--c-cream)" }}>Velvet Night</b>? Cosmetic only — never affects play.</div>
                <div className="wf-ctarow"><button className="wf-cta ghost" style={{ flex: "0 0 38%" }}>Cancel</button><button className="wf-cta" style={{ flex: 1 }}>Equip</button></div>
              </React.Fragment>}
        </div>
      </div>
    </React.Fragment>
  );
}

function RoomBadge({ surface = "web" }) {
  return (
    <div className={"t2 " + surface}>
      <div className="grain"></div>
      <div className="rb">
        <div className="rb-room" style={{ "--rc1": "#1f6f5c", "--rc2": "#0b241d" }}>
          <div className="rn">The Break Room</div>
          <div className="rt">Warm up. Skill only.</div>
          <div className="rm">Free · Open to all</div>
        </div>
        <div className="rb-room" style={{ "--rc1": "#5e2c7a", "--rc2": "#220e30" }}>
          <div className="rb-badge"><span className="bl">◎</span>Wagered tables</div>
          <div className="rn">The Velvet Room</div>
          <div className="rt">Smooth operators.</div>
          <div className="rm">Free + Wagered · Gold+</div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { GameSettings, CueEquip, RoomBadge });