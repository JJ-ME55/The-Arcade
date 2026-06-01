// HUD.jsx — out-of-canvas DOM chrome that surrounds the table.

function PlayerBlock({ name, initials, elo, group, active, score = 0, side = "left", timer, tier = 4, avatarColors = ["#3a8fd4", "#1e5fa8"] }) {
  // 7 pocketed-ball slots (one per ball in the group).
  // Filled slots show the player's group color.
  // Potted balls shown in their real resin colours (per-ball, not one group colour).
  const ballBg = (i) => {
    if (group === "red") return "var(--ball-3)";
    if (group === "yellow") return "var(--ball-1)";
    const c = `var(--ball-${i + 1})`;
    if (group === "stripes") return `linear-gradient(180deg,#fbfaf5 0 28%,${c} 28% 72%,#fbfaf5 72%)`;
    return c; // solids 1..7
  };
  const filled = Math.min(7, score);

  return (
    <div className={"player-block" + (active ? " is-active" : "")} data-side={side}>
      {side === "left" && (
        <div className="avatar-wrap">
          <div className="avatar" style={{ background: `linear-gradient(135deg, ${avatarColors[0]}, ${avatarColors[1]})` }}>
            {initials}
          </div>
        </div>
      )}
      <div className="info">
        <div className="name-row">
          {side === "left" ? (
            <>
              <span className="tier-badge"><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z"/></svg>{tier}</span>
              <span className="name">{name}</span>
            </>
          ) : (
            <>
              <span className="name">{name}</span>
              <span className="tier-badge"><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z"/></svg>{tier}</span>
            </>
          )}
        </div>
        <div className="slots">
          {[0,1,2,3,4,5,6].map(i => (
            <div key={i} className={"slot" + (i < filled ? " filled" : "")}
              style={i < filled ? { background: ballBg(i), borderColor: "transparent" } : {}}
            />
          ))}
        </div>
      </div>
      {side === "right" && (
        <div className="avatar-wrap">
          <div className="avatar" style={{ background: `linear-gradient(135deg, ${avatarColors[0]}, ${avatarColors[1]})` }}>
            {initials}
          </div>
        </div>
      )}
    </div>
  );
}

function PowerHUD({ value = 0, onChange }) {
  const pct = Math.round(value);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14, padding: "10px 18px",
      background: "linear-gradient(180deg, var(--slate-hi), var(--slate))",
      border: "1px solid var(--slate-edge)", borderRadius: 10,
      boxShadow: "var(--shadow-inset-up), var(--shadow-md)",
      width: "min(70vw, 520px)",
    }}>
      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: 13, letterSpacing: "0.10em", color: "#fff" }}>POWER</span>
      <div style={{ flex: 1, position: "relative" }}>
        {/* small yellow level marker — sits above the bar */}
        <div style={{ position: "absolute", top: -9, left: `${pct}%`, transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "8px solid #F5C842", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.55))", transition: "left 120ms var(--ease-soft)" }}></div>
        <div style={{ position: "relative", height: 14, background: "var(--slate-lo)", borderRadius: 999, boxShadow: "inset 0 1px 2px rgba(0,0,0,0.6)", overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 2, top: 2, bottom: 2, right: "auto", width: `calc(${pct}% - 4px)`, borderRadius: 999, background: "linear-gradient(90deg, var(--action-dim), var(--action), var(--hot))", boxShadow: pct > 0 ? "0 0 14px rgba(255,107,53,0.55)" : "none" }}></div>
          <input type="range" min="0" max="100" value={pct} onChange={(e) => onChange && onChange(+e.target.value)}
            style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", cursor: "pointer" }}/>
        </div>
      </div>
      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: 14, color: "#fff", width: 46, textAlign: "right" }}>{pct}%</span>
    </div>
  );
}

function MatchTopBar({ turnTimer = "0:42", turnNum = 12, turnTotal = 60, timerPct = 1.0 }) {
  // Compute a circular-progress ring around the timer.
  // timerPct: 1.0 = full, 0.0 = empty
  const R = 17;
  const C = 2 * Math.PI * R;
  const dash = C * timerPct;
  // Color the ring based on remaining
  const ringColor =
    timerPct > 0.5 ? "var(--active)" :
    timerPct > 0.25 ? "var(--hot)" : "var(--danger)";
  const panelMod =
    timerPct > 0.5 ? "" :
    timerPct > 0.25 ? " is-warn" : " is-urgent";

  return (
    <div className={"turn-panel" + panelMod}>
      <span className="turn-label">TURN {turnNum} / {turnTotal}</span>
      <div className="turn-time-row">
        <div className="timer-ring">
          <svg width="38" height="38" viewBox="0 0 38 38">
            <circle cx="19" cy="19" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3"/>
            <circle cx="19" cy="19" r={R} fill="none" stroke={ringColor} strokeWidth="3"
              strokeDasharray={`${dash} ${C - dash}`} strokeLinecap="round"
              style={{ transition: "stroke-dasharray 240ms var(--ease-soft), stroke 240ms var(--ease-soft)" }}
            />
          </svg>
        </div>
        <span className="turn-digits">{turnTimer}</span>
      </div>
    </div>
  );
}

function ResultOverlay({ won, reason, onAgain, onMenu }) {
  return (
    <div className="result-overlay">
      <span style={{
        fontFamily: "var(--font-stamp)", fontSize: 96, lineHeight: 1,
        padding: "18px 48px", borderRadius: 18, textTransform: "uppercase",
        transform: "skewX(-6deg)",
        color: "#fff",
        background: won ? "linear-gradient(180deg, var(--action-bright), var(--hot))" : "linear-gradient(180deg, #5a1820, #2a0c10)",
        boxShadow: won ? "var(--shadow-glow-action), 0 8px 0 rgba(0,0,0,0.5)" : "inset 0 0 0 2px var(--danger), 0 8px 0 rgba(0,0,0,0.5)",
        WebkitTextStroke: "3px var(--slate-deep)",
        textShadow: "0 6px 0 rgba(0,0,0,0.55)",
      }}>{won ? "VICTORY!" : "DEFEAT"}</span>
      <span className="sub">{reason || (won ? "BLACK BALL DOWN · LEGAL POCKET" : "OPPONENT POTTED THE 8")}</span>
      <div style={{ display: "flex", gap: 14, marginTop: 12 }}>
        <Button kind="primary" onClick={onAgain}>REMATCH</Button>
        <Button kind="ghost" onClick={onMenu}>MAIN MENU</Button>
      </div>
    </div>
  );
}

Object.assign(window, { PlayerBlock, PowerHUD, MatchTopBar, ResultOverlay });
