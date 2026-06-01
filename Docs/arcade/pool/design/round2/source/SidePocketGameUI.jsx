// SidePocketGameUI.jsx — desktop (web) match view. Three-row design-system
// layout in the Side Pocket brand: brass HUD (both players) · centred cobalt
// PoolTable · action shelf (power + Shoot). Reconciled with the mobile build:
// correct potted-ball colours, ball numbers scaled, small yellow power marker,
// no silly hint text. Renders PoolTable (merged into this file at build).

function SpgRack({ kind, potted = 0 }) {
  return (
    <span className="rack">
      {[1, 2, 3, 4, 5, 6, 7].map((b, i) => {
        const c = "var(--ball-" + b + ")";
        const bg = kind === "stripes" ? "linear-gradient(180deg,#fbfaf5 0 28%," + c + " 28% 72%,#fbfaf5 72%)" : c;
        return <i key={b} className={i < potted ? "" : "rem"} style={{ background: bg }}></i>;
      })}
    </span>
  );
}

function DesktopMatch({ turn = "you" }) {
  const you = turn === "you";
  return (
    <div className={"spg" + (you ? "" : " opp")}>
      <div className="spg-grain"></div>

      <header className="spg-bar">
        <div className={"spg-p" + (you ? " active" : " idle")}>
          <div className="avw"><div className="ring" style={{ "--deg": you ? "300deg" : "0deg" }}></div><div className="av" style={{ background: "radial-gradient(circle at 38% 30%, #2a6b4f, #143b2c 78%)" }}>J</div></div>
          <div className="col">
            <div className="nmrow"><span className="nm">jjk_55</span><span className="tier">Gold III</span></div>
            <SpgRack kind="solids" potted={3} />
          </div>
          <span className="sc">2</span>
        </div>

        <div className="spg-mid">
          <span className="room">The Velvet Room · Ranked · Best of 3</span>
          <div className="tm"><span className="ring2"></span><span className="t">0:42</span></div>
          <span className="turn">{you ? "Your Shot" : "Opponent's Turn"}</span>
        </div>

        <div className={"spg-p right" + (you ? " idle" : " active")}>
          <div className="avw"><div className="ring" style={{ "--deg": you ? "0deg" : "300deg" }}></div><div className="av" style={{ background: "radial-gradient(circle at 38% 30%, #7a3aa0, #2c1140 80%)" }}>V</div></div>
          <div className="col">
            <div className="nmrow"><span className="tier">Gold II</span><span className="nm">Velvet Q</span></div>
            <SpgRack kind="stripes" potted={2} />
          </div>
          <span className="sc">1</span>
        </div>
      </header>

      <main className="spg-stage">
        <div className="spg-board">
          <PoolTable ballStyle="american" cueAt={{ x: 413, y: 413 }} showRack showAim={you} showStick={you} pullback={you ? 28 : 0} />
        </div>
        <div className="spg-spin"><span className="dot"></span><span className="lab">Spin</span></div>
      </main>

      <footer className="spg-shelf">
        <div className="spg-tools"><button className="spg-tool">⚑</button><button className="spg-tool">≡</button></div>
        <div className="spg-power">
          <span className="lbl">POWER</span>
          <div className="barwrap">
            <span className="mark" style={{ left: "64%" }}></span>
            <div className="bar"><span className="fill" style={{ width: "calc(64% - 4px)" }}></span></div>
          </div>
          <span className="pct">64%</span>
        </div>
        {you
          ? <button className="spg-shoot">Shoot</button>
          : <button className="spg-shoot wait">Waiting…</button>}
      </footer>
    </div>
  );
}

Object.assign(window, { DesktopMatch, SpgRack });