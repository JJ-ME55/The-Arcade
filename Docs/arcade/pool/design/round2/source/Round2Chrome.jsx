// Round2Chrome.jsx — #27 TG launch cue, #28 splash, #29 empty/error states,
// #30 onboarding. Errors + onboarding reuse the .wf modal; splash/TG use .ch.

function Splash({ surface = "web" }) {
  return (
    <div className={"ch " + surface}>
      <div className="grain"></div>
      <div className="ch-splash">
        <span className="ch-est">Members Club · Est. 1952</span>
        <h1 className="ch-wm">Side<br /><em>Pocket</em></h1>
        <div className="ch-load"><i></i></div>
        <span className="ch-loadt">Racking the table…</span>
      </div>
    </div>
  );
}

function TGLaunch({ surface = "web" }) {
  return (
    <div className={"ch " + surface}>
      <div className="grain"></div>
      <div className="ch-tg">
        <div className="ch-tgbar">
          <span className="back">‹ Back to chat</span>
          <span className="who"><span className="av">J</span><span className="nm">jjk_55</span><span className="ch-tgico">✈</span></span>
        </div>
        <span className="ch-tgchip">✈ Launched from Telegram</span>
        <div className="ch-tgnote">Opened from the Side Pocket bot. A <b>Telegram mark</b> sits by your name, and <b>Back</b> returns you to the chat (not the arcade hub). Session is carried by the bot's signed link — no separate login.</div>
      </div>
    </div>
  );
}

// #29 — empty / error states (reuse .wf modal)
function StateModal({ kind = "no-tourney" }) {
  const M = {
    "no-tourney": { eb: "Tournaments", ti: "None Live Right Now", body: "Next tournament starts in 30:00. Want a quick match while you wait?", cta: "Quick Match", ghost: "Notify Me" },
    "no-opp": { eb: "Matchmaking", ti: "No One's Around", body: "Couldn't seat an opponent in your skill band. Switch to a practice match vs the computer?", cta: "Play VS Computer", ghost: "Keep Waiting" },
    "deposit": { eb: "Wagered · Deposit", ti: "Deposit Didn't Confirm", body: "Your SOL deposit didn't settle. Retry, or cancel and keep your balance.", cta: "Retry Deposit", ghost: "Cancel", danger: true },
    "settle": { eb: "Wagered · Settling", ti: "Settling Your Win", body: "Your payout is being settled on-chain. It'll appear within 60s — refresh if it doesn't.", cta: "Refresh", ghost: "Back to Lobby" },
  }[kind];
  return (
    <React.Fragment>
      <div className="behind"></div><div className="grain"></div>
      <div className="wf-modal">
        <div className="wf-head"><div><div className="wf-eyebrow">{M.eb}</div><div className="wf-title">{M.ti}</div></div></div>
        <div className="wf-body">
          <div className="wf-cap" style={{ textAlign: "left", fontSize: "calc(13px * var(--u))", color: "var(--c-cream)" }}>{M.body}</div>
          <div className="wf-ctarow">
            <button className="wf-cta ghost" style={{ flex: "0 0 40%" }}>{M.ghost}</button>
            <button className={"wf-cta" + (M.danger ? " danger" : "")} style={{ flex: 1 }}>{M.cta}</button>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}

// #30 — onboarding (4-step), reuse .wf modal
function Onboarding({ surface = "web", step = 0 }) {
  const steps = [
    { t: "Aim", d: "Drag the felt to point the cue. The dashed line shows where the cue ball goes; the ghost ball marks contact." },
    { t: "Power", d: "Pull the rail slider to load power — the yellow pill shows how hard you'll strike." },
    { t: "Spin", d: "Tap the cue-ball node and place the contact dot to add english." },
    { t: "Shoot", d: "Release (or tap Shoot) to take the stroke. That's it — pure skill." },
  ];
  const s = steps[step];
  const illus = step === 0
    ? <React.Fragment><div className="ob-aim"></div><div className="ob-cue"></div><div className="ob-ghost"></div></React.Fragment>
    : step === 1 ? <div className="ob-bar"><div className="f"></div><div className="pill"></div></div>
    : step === 2 ? <div className="ob-cue"><div className="dot"></div></div>
    : <div className="ob-stick"></div>;
  return (
    <React.Fragment>
      <div className="behind"></div><div className="grain"></div>
      <div className="wf-modal">
        <div className="wf-head"><div><div className="wf-eyebrow">How to Play</div><div className="wf-title">{s.t}</div></div><button className="wf-cancel" style={{ display: "block" }}>Skip</button></div>
        <div className="wf-body">
          <div className="ob-illus">{illus}</div>
          <span className="ob-step">Step {step + 1} of 4</span>
          <div className="wf-cap" style={{ textAlign: "center", fontSize: "calc(13px * var(--u))", color: "var(--c-cream)" }}>{s.d}</div>
          <div className="ob-dots">{steps.map((_, i) => <i key={i} className={i === step ? "on" : ""}></i>)}</div>
          <button className="wf-cta">{step === 3 ? "Break!" : "Next"}</button>
        </div>
      </div>
    </React.Fragment>
  );
}

Object.assign(window, { Splash, TGLaunch, StateModal, Onboarding });