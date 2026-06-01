// MobileFrame.jsx — landscape device bezel + shared mobile chrome atoms.
// Everything is sized for a short, wide viewport with ≥44px touch targets.

// Landscape device frame. `tablet` swaps to a thinner bezel with no island.
function MobileDevice({ w, h, tablet, portrait, children }) {
  return (
    <div className={"mdevice" + (tablet ? " tablet" : "") + (portrait ? " portrait" : "")}>
      <div className="mscreen" style={{ width: w, height: h }}>
        {children}
      </div>
      {!tablet && <div className="island"></div>}
      <div className="homebar"></div>
    </div>
  );
}

// compact identity + wallet used across menus
function MSignet() {
  return (
    <span className="m-signet">
      <span className="av">J</span>
      <span className="prestige">Gold III</span>
      <span className="elo">1,250</span>
    </span>
  );
}
function MSol() {
  return (
    <span className="m-sol">
      <span className="ball">◎</span>
      <span className="v"><b>0.42</b><u>SOL</u></span>
    </span>
  );
}

// Top bar for sub-screens: back + eyebrow + (optional) right slot
function MTop({ eyebrow, bold, right }) {
  return (
    <header className="m-top">
      <button className="m-back">‹</button>
      <span className="m-eyebrow">{eyebrow} {bold && <b>{bold}</b>}</span>
      <span className="m-spacer"></span>
      {right}
    </header>
  );
}

// Branded rotate-to-landscape prompt (shown when held portrait)
function RotateScreen() {
  return (
    <div className="spm">
      <div className="spm-bg"></div>
      <div className="spm-grain"></div>
      <div className="spm-rotate">
        <div className="wm">Side Pocket</div>
        <div className="phone"><span className="ball">8</span></div>
        <div className="rk">Members Club</div>
        <h1>Turn to Play</h1>
        <p>Side Pocket plays in landscape. Rotate your device to take your shot.</p>
      </div>
    </div>
  );
}

Object.assign(window, { MobileDevice, MSignet, MSol, MTop, RotateScreen });