// Round2Async.jsx — #15 async waiting, #16 match-expired, #17 invite link,
// #18 waiting for opponent. Modals reuse the .wf shell; #15 uses a frozen table.
// Merged into round2_canvas.jsx so PoolTable is in scope.

function AsyncWait({ surface = "web", notif = true }) {
  return (
    <div className={"aw " + surface}>
      <div className="frozen"><div className="gboard"><PoolTable ballStyle="american" cueAt={{ x: 520, y: 360 }} showRack showAim={false} showStick={false} /></div></div>
      <div className="veil"></div>
      <div className="aw-panel">
        <span className="aw-kick">Async Match · Their Turn</span>
        <div className="aw-opp"><span className="av">V</span><span className="nm">Velvet Q</span></div>
        <div className="aw-cd">11h 23m</div>
        <span className="aw-cdl">left for @VelvetQ's turn</span>
        <div className="aw-toggle"><span className={"aw-sw" + (notif ? "" : " off")}></span><span>Notify me when they shoot</span></div>
        <div className="aw-cta"><button className="b ghost">Watch More Pool</button><button className="b gold">Back to Lobby</button></div>
      </div>
    </div>
  );
}

function MatchExpired({ surface = "web", kind = "turn" }) {
  const msg = kind === "wall" ? "72-hour match clock ran out — you win by forfeit."
    : kind === "draw" ? "Neither player finished in time. The frame is a draw."
      : "Opponent took too long on their turn — you win by forfeit.";
  return (
    <React.Fragment>
      <div className="behind"></div><div className="grain"></div>
      <div className="wf-modal">
        <div className="wf-head"><div><div className="wf-eyebrow">{kind === "draw" ? "Match Expired" : "Forfeit"}</div><div className="wf-title">{kind === "draw" ? "Time's Up" : "Match Expired"}</div></div></div>
        <div className="wf-body">
          <div className="wf-cap" style={{ textAlign: "left", fontSize: "calc(13px * var(--u))", color: "var(--c-cream)" }}>{msg}</div>
          <button className={"wf-cta" + (kind === "draw" ? " ghost" : "")}>{kind === "draw" ? "Back to Lobby" : "Claim Win"}</button>
        </div>
      </div>
    </React.Fragment>
  );
}

function InviteLink({ surface = "web", state = "generated" }) {
  return (
    <React.Fragment>
      <div className="behind"></div><div className="grain"></div>
      <div className="wf-modal">
        <div className="wf-head"><div><div className="wf-eyebrow">Private 1v1</div><div className="wf-title">Challenge a Friend</div></div></div>
        <div className="wf-body">
          <div className="wf-cap" style={{ textAlign: "left" }}>Generate a one-time link. First friend to open it sits across from you — no stakes.</div>
          <div className="aw-code"><span className="u">{state === "generating" ? "generating link…" : "sp.gg/r/ABC123"}</span><button className="copy">{state === "copied" ? "Copied" : "Copy"}</button></div>
          <div className="aw-share">
            <span className="s tg">✈ Telegram</span>
            <span className="s">Copy Link</span>
            {surface === "mob" && <span className="s">QR</span>}
          </div>
          {surface === "web" && <div className="aw-qr">{[1,0,1,0,1, 0,1,1,1,0, 1,1,0,1,1, 0,1,1,0,1, 1,0,1,0,1].map((b, i) => <i key={i} className={b ? "" : "o"}></i>)}</div>}
          <div className="aw-ttl">{state === "expired" ? "Link expired · regenerate" : "Link expires in 30 minutes"}</div>
        </div>
      </div>
    </React.Fragment>
  );
}

function WaitingOpponent({ surface = "web" }) {
  return (
    <React.Fragment>
      <div className="behind"></div><div className="grain"></div>
      <div className="wf-modal">
        <div className="wf-head"><div><div className="wf-eyebrow">Private 1v1</div><div className="wf-title">Waiting for Friend<span className="aw-wait-dots"></span></div></div></div>
        <div className="wf-body">
          <div className="aw-seats">
            <div className="aw-seat"><div className="ring">J</div><div className="nm">jjk_55</div></div>
            <div className="aw-vs">vs</div>
            <div className="aw-seat empty"><div className="ring">?</div><div className="nm">Joining…</div></div>
          </div>
          <div className="aw-code"><span className="u">sp.gg/r/ABC123</span><button className="copy">Re-share</button></div>
          <button className="wf-cancel">Cancel table</button>
        </div>
      </div>
    </React.Fragment>
  );
}

Object.assign(window, { AsyncWait, MatchExpired, InviteLink, WaitingOpponent });