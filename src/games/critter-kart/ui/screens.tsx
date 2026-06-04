// @ts-nocheck
import { Frame } from './Stage';
import { Wordmark, Balloon, StripePlaceholder, StatBar, Medal } from './shared';
import { RacerPortrait } from './RacerPortrait';
import { ClassIcon, shade } from './icons';
import { RACERS, TRACKS, STAT_LABELS, ACCENT, type Screen, type ResultRow } from './data';

type Go = (s: Screen) => void;
const lilita = (px: number, stroke = 0): React.CSSProperties =>
  ({ fontFamily: "'Lilita One', sans-serif", fontSize: px, textTransform: 'uppercase', WebkitTextStroke: stroke ? `${stroke}px var(--ink)` : undefined, paintOrder: 'stroke fill' } as React.CSSProperties);

function MeadowBackdrop({ dim = 0 }: { dim?: number }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(#9fcbf0 0%, #bfe0f2 38%, #cfe7b0 56%, #7fbf52 100%)' }}>
      <div style={{ position: 'absolute', top: '14%', left: '50%', transform: 'translateX(-50%)', width: '40vh', height: '40vh', borderRadius: '50%', background: 'radial-gradient(circle, #fff3c4 0%, #ffe79a55 40%, transparent 70%)' }} />
      <div className="speedlines" />
      {dim > 0 && <div style={{ position: 'absolute', inset: 0, background: `rgba(8,14,28,${dim})` }} />}
    </div>
  );
}
function NavyBackdrop({ checker = false }: { checker?: boolean }) {
  return (
    <div className={checker ? 'checker' : undefined} style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 100% at 50% 0%, #1b2c4c, #0c1626 70%)' }}>
      {!checker && <div className="speedlines" />}
    </div>
  );
}

export function TitleScreen({ go }: { go: Go }) {
  const balloons = [
    { c: 'var(--berry)', x: 120, y: 120, s: 50, d: 0 },
    { c: 'var(--storm)', x: 1050, y: 95, s: 58, d: 0.6 },
    { c: 'var(--leaf)', x: 195, y: 470, s: 44, d: 1.1 },
    { c: 'var(--bee)', x: 1090, y: 430, s: 46, d: 0.3 },
    { c: 'var(--acorn)', x: 60, y: 300, s: 38, d: 1.6 },
  ];
  return (
    <Frame background={<MeadowBackdrop />}>
      {balloons.map((b, i) => <Balloon key={i} color={b.c} x={b.x} y={b.y} size={b.s} delay={b.d} />)}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 26 }} className="checker" />
      <div className="fade-enter" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <div style={{ marginTop: -40 }}><Wordmark variant="speed" accent={ACCENT} /></div>
        <div style={{ marginTop: 10, fontFamily: 'Nunito', fontWeight: 800, letterSpacing: 4, fontSize: 15, color: 'var(--ink)', opacity: 0.7, textTransform: 'uppercase' }}>Low-poly arcade kart racing</div>
        <button className="ck-btn" style={{ marginTop: 34 }} onClick={() => go('menu')}>Press Start</button>
      </div>
      <div style={{ position: 'absolute', left: 22, bottom: 34, fontFamily: 'Nunito', fontWeight: 700, fontSize: 12, color: 'var(--ink)', opacity: 0.55 }}>v0.4 · 6 racers · 6 items</div>
      <div style={{ position: 'absolute', right: 22, bottom: 34, fontFamily: 'Nunito', fontWeight: 700, fontSize: 12, color: 'var(--ink)', opacity: 0.55 }}>hosted on The Arcade</div>
    </Frame>
  );
}

function MenuCard({ title, sub, color, onClick, soon, big }: { title: string; sub: string; color: string; onClick?: () => void; soon?: boolean; big?: boolean }) {
  return (
    <button onClick={soon ? undefined : onClick} disabled={soon} className="panel" style={{ textAlign: 'left', cursor: soon ? 'not-allowed' : 'pointer', position: 'relative', overflow: 'hidden', padding: big ? '30px 32px' : '20px 24px', border: 'none', background: big ? `linear-gradient(120deg, ${color} 0%, ${shade(color, 0.28)} 100%)` : 'var(--panel)', boxShadow: big ? `0 10px 0 ${shade(color, 0.4)}, 0 18px 36px rgba(0,0,0,.35)` : '0 6px 0 rgba(0,0,0,.3), inset 0 0 0 1px var(--panel-line)', opacity: soon ? 0.55 : 1, backdropFilter: 'var(--panel-blur)', flex: big ? 'none' : 1 }}>
      {big && <div className="speedlines" />}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ ...lilita(big ? 46 : 24, big ? 4 : 0), color: '#fff', lineHeight: 0.95 }}>{title}</div>
          <div style={{ fontFamily: 'Nunito', fontWeight: 700, fontSize: big ? 15 : 13, color: big ? 'rgba(255,255,255,.92)' : 'var(--muted)', marginTop: 6 }}>{sub}</div>
        </div>
        {soon ? <span className="tag" style={{ background: 'rgba(255,255,255,.12)', padding: '5px 10px', borderRadius: 8, color: '#fff' }}>SOON</span> : <span style={{ fontFamily: "'Lilita One',sans-serif", fontSize: big ? 40 : 22, color: '#fff', opacity: 0.9 }}>›</span>}
      </div>
    </button>
  );
}

export function MainMenu({ go }: { go: Go }) {
  return (
    <Frame background={<MeadowBackdrop dim={0.18} />}>
      <div className="fade-enter" style={{ position: 'absolute', inset: 0, padding: '46px 64px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ transform: 'scale(.4)', transformOrigin: 'left center', height: 90 }}><Wordmark variant="speed" accent={ACCENT} /></div>
          <button className="ck-btn ghost sm" onClick={() => go('title')}>‹ Back</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 20, marginTop: 28, flex: 1 }}>
          <MenuCard big title="Quick Race" sub="One race · 6 karts · 3 laps · Sunny Meadow" color={ACCENT} onClick={() => go('select')} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <MenuCard title="Multiplayer" sub="Race for real, test your skill" color={ACCENT} onClick={() => go('mp-menu')} />
            <MenuCard title="Grand Prix" sub="Put your SOL on the line, winner takes all" color={ACCENT} soon />
            <MenuCard title="How to Play" sub="Controls & power-up codex" color={ACCENT} onClick={() => go('howto')} />
          </div>
        </div>
      </div>
    </Frame>
  );
}

function RacerChip({ r, active, onClick }: { r: (typeof RACERS)[number]; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'relative', cursor: 'pointer', border: 'none', padding: 0, borderRadius: 18, overflow: 'hidden',
        height: 100, background: `linear-gradient(135deg, ${r.color}, ${r.colorDeep})`,
        boxShadow: active
          ? `0 0 0 4px var(--accent), 0 0 0 7px var(--ink), 0 12px 24px rgba(0,0,0,.45)`
          : `0 5px 0 ${r.colorDeep}, inset 0 0 0 1px rgba(255,255,255,.15)`,
        animation: active ? 'ckwiggle .5s cubic-bezier(.3,1.4,.5,1) both' : 'none',
        transform: active ? 'translateY(-3px)' : 'none', transition: 'box-shadow .12s',
      }}
    >
      {/* diagonal stripe texture */}
      <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(45deg, rgba(255,255,255,.07) 0 8px, transparent 8px 16px)' }} />
      {/* big watermark initial bottom-right */}
      <div style={{ position: 'absolute', right: -6, bottom: -28, ...lilita(96), color: 'rgba(255,255,255,.13)', lineHeight: 1 }}>{r.name[0]}</div>
      {/* light sweep on activation */}
      {active && (
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(100deg, transparent 40%, rgba(255,255,255,.35) 50%, transparent 60%)', animation: 'cksweep 1.1s ease-out' }} />
      )}
      {/* name bottom-left */}
      <div style={{ position: 'absolute', left: 12, bottom: 8, ...lilita(22, 2.5), color: '#fff' } as React.CSSProperties}>{r.name}</div>
      {/* class glyph top-right */}
      <div style={{ position: 'absolute', right: 10, top: 10 }}><ClassIcon classId={r.classId} size={22} color="rgba(255,255,255,.85)" /></div>
      {/* ✓ badge top-left when selected */}
      {active && (
        <div style={{ position: 'absolute', left: 10, top: 9, width: 16, height: 16, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 0 2px var(--ink)', display: 'grid', placeItems: 'center', ...lilita(11), color: 'var(--ink)' } as React.CSSProperties}>✓</div>
      )}
    </button>
  );
}

export function CharacterSelect({ go, selected, setSelected }: { go: Go; selected: string; setSelected: (id: string) => void }) {
  const r = RACERS.find((x) => x.id === selected) || RACERS[0];
  return (
    <Frame background={<NavyBackdrop />}>
      <div className="fade-enter" style={{ position: 'absolute', inset: 0, padding: '34px 56px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="pill">Select your racer</div>
          <button className="ck-btn ghost sm" onClick={() => go('menu')}>‹ Back</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 28, marginTop: 22, flex: 1, minHeight: 0 }}>
          {/* Featured racer panel — keyed on r.id so all the entry animations replay on switch */}
          <div key={r.id} className="panel pop" style={{ position: 'relative', overflow: 'hidden', padding: 18, display: 'flex', flexDirection: 'column', background: `linear-gradient(150deg, ${r.color}2e, var(--panel) 60%)`, boxShadow: `inset 0 0 0 1px var(--panel-line), 0 0 60px ${r.color}40` }}>
            {/* giant faint watermark initial */}
            <div style={{ position: 'absolute', right: -40, top: -70, ...lilita(360), color: `${r.color}14`, lineHeight: 1, pointerEvents: 'none', userSelect: 'none' } as React.CSSProperties}>{r.name[0]}</div>
            {/* HERO — the character art is the focal point, filling most of the panel. The rotating
                sunburst/ring/spotlight sit behind a large bobbing portrait; the name, class and blurb
                sit over a bottom scrim so the artwork stays the star (playtest: make the art bigger). */}
            <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'grid', placeItems: 'center', borderRadius: 18, overflow: 'hidden', border: `1px solid ${r.color}44`, background: `radial-gradient(circle at 50% 42%, ${r.color}22, transparent 72%)` }}>
              {/* soft pulsing radial spotlight (no spinning rings — just a gentle glow) */}
              <div style={{ position: 'absolute', width: '66%', aspectRatio: '1 / 1', maxWidth: 430, borderRadius: '50%', background: `radial-gradient(circle, ${r.color}30, transparent 65%)`, animation: 'ckpulse 2.6s ease-in-out infinite' }} />
              {/* big bobbing portrait — dominates the panel */}
              <div style={{ animation: 'ckbob 3.2s ease-in-out infinite', position: 'absolute', inset: '4% 6% 2%' }}>
                {r.characterModel ? (
                  <RacerPortrait modelPath={r.characterModel} accentColor={r.color} style={{ background: 'transparent', borderRadius: 0 }} />
                ) : (
                  <StripePlaceholder
                    label={`${r.name.toLowerCase()}\nkart render`}
                    color={r.color === '#ffdc00' ? '#caa' : '#dbe6f5'}
                    style={{ height: '100%', background: `repeating-linear-gradient(45deg, ${r.color}3a 0 12px, ${r.color}1c 12px 24px)`, borderColor: `${r.color}aa`, whiteSpace: 'pre-line' } as React.CSSProperties}
                  />
                )}
              </div>
              {/* "P1 READY" stamp — replays on each racer change because of the keyed parent */}
              <div style={{ position: 'absolute', top: 14, left: 14, animation: 'ckstamp .5s cubic-bezier(.3,1.5,.5,1) both', ...lilita(17), color: '#fff', background: 'var(--accent)', padding: '4px 12px 5px', borderRadius: 8, boxShadow: '0 4px 0 var(--accent-deep)', WebkitTextStroke: '0', letterSpacing: 1 } as React.CSSProperties}>P1 Ready</div>
              {/* name + class + blurb over a bottom scrim */}
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '64px 26px 20px', background: 'linear-gradient(transparent, rgba(8,13,26,.86) 60%)', pointerEvents: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ ...lilita(48, 2), color: '#fff', lineHeight: 0.82 } as React.CSSProperties}>{r.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 7, background: r.color, display: 'grid', placeItems: 'center', boxShadow: `0 3px 0 ${r.colorDeep}` }}><ClassIcon classId={r.classId} size={16} color="#fff" /></div>
                    <span style={{ ...lilita(15), color: r.color, letterSpacing: 0.5 }}>{r.className}</span>
                  </div>
                </div>
                <p style={{ fontFamily: 'Nunito', fontWeight: 600, fontSize: 13.5, color: 'var(--paper)', opacity: 0.9, margin: '7px 0 0', lineHeight: 1.45, maxWidth: 540 }}>{r.blurb}</p>
              </div>
            </div>
            {/* stats footer — kept below the art so the bars stay readable */}
            <div style={{ display: 'grid', gap: 8, marginTop: 14, position: 'relative' }}>
              {Object.keys(r.stats).map((k) => <StatBar key={k} label={STAT_LABELS[k]} value={(r.stats as Record<string, number>)[k]} color={r.color} />)}
            </div>
          </div>
          {/* Picker grid — 2 cols × 3 rows so Fish and JJ both fit alongside the four core racers */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, flex: 1 }}>
              {RACERS.map((x) => <RacerChip key={x.id} r={x} active={x.id === selected} onClick={() => setSelected(x.id)} />)}
            </div>
            <button className="ck-btn" style={{ marginTop: 18, width: '100%' }} onClick={() => go('track')}>Confirm · {r.name}</button>
          </div>
        </div>
      </div>
    </Frame>
  );
}

function TrackCard({ t, active, onClick }: { t: (typeof TRACKS)[number]; active: boolean; onClick: () => void }) {
  const soon = t.status === 'soon';
  return (
    <button onClick={soon ? undefined : onClick} disabled={soon} style={{ position: 'relative', border: 'none', padding: 0, borderRadius: 20, overflow: 'hidden', cursor: soon ? 'not-allowed' : 'pointer', textAlign: 'left', height: '100%', boxShadow: active ? `0 0 0 4px var(--accent), 0 0 0 7px var(--ink), 0 12px 26px rgba(0,0,0,.45)` : '0 7px 0 rgba(0,0,0,.35)', transform: active ? 'translateY(-3px)' : 'none', transition: 'transform .12s, box-shadow .12s' }}>
      <div style={{ height: '58%', background: `linear-gradient(${t.sky[0]}, ${t.sky[1]})`, position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0 }} className="speedlines" />
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '34%', background: t.accent, clipPath: 'polygon(0 40%, 22% 20%, 48% 46%, 72% 18%, 100% 40%, 100% 100%, 0 100%)' }} />
        {soon && <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,14,28,.55)', display: 'grid', placeItems: 'center', fontFamily: "'Lilita One',sans-serif", color: '#fff', fontSize: 18, letterSpacing: 1 }}>🔒 COMING SOON</div>}
      </div>
      <div style={{ height: '42%', background: 'var(--panel-solid)', padding: '12px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ ...lilita(22), color: '#fff' }}>{t.name}</span>
          <span className="tag" style={{ color: 'var(--accent)' }}>{t.cc}</span>
        </div>
        <p style={{ fontFamily: 'Nunito', fontWeight: 600, fontSize: 12, color: 'var(--muted)', margin: '6px 0 0', lineHeight: 1.4 }}>{t.desc}</p>
      </div>
    </button>
  );
}

export function TrackSelect({ go, track, setTrack }: { go: Go; track: string; setTrack: (id: string) => void }) {
  return (
    <Frame background={<NavyBackdrop />}>
      <div className="fade-enter" style={{ position: 'absolute', inset: 0, padding: '34px 56px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="pill">Pick a track</div>
          <button className="ck-btn ghost sm" onClick={() => go('select')}>‹ Racer</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginTop: 22, flex: 1, minHeight: 0 }}>
          {TRACKS.map((t) => <TrackCard key={t.id} t={t} active={t.id === track} onClick={() => setTrack(t.id)} />)}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
          <button className="ck-btn" onClick={() => go('race')}>Start race ›</button>
        </div>
      </div>
    </Frame>
  );
}

export function Results({ go, results, playerId }: { go: Go; results: ResultRow[]; playerId: string }) {
  return (
    <Frame background={<NavyBackdrop checker />}>
      <div className="fade-enter" style={{ position: 'absolute', inset: 0, padding: '34px 64px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ ...lilita(62, 5), color: ACCENT, letterSpacing: 2, filter: 'drop-shadow(0 8px 0 rgba(0,0,0,.25))' } as React.CSSProperties}>Finish!</div>
        <div className="tag" style={{ marginTop: 2 }}>Sunny Meadow · 3 laps</div>
        <div style={{ width: 'min(720px, 100%)', marginTop: 22, display: 'grid', gap: 10 }}>
          {results.map((row, i) => {
            const r = RACERS.find((x) => x.id === row.racerId)!;
            const me = row.racerId === playerId;
            return (
              <div key={row.racerId} className="panel pop" style={{ animationDelay: `${i * 0.08}s`, display: 'grid', gridTemplateColumns: '54px 1fr auto auto', alignItems: 'center', gap: 16, padding: '12px 18px', background: row.pos === 1 ? `linear-gradient(100deg, ${ACCENT}33, var(--panel))` : 'var(--panel)', boxShadow: me ? `inset 0 0 0 2px ${r.color}, 0 6px 0 rgba(0,0,0,.3)` : 'inset 0 0 0 1px var(--panel-line), 0 6px 0 rgba(0,0,0,.3)' }}>
                <Medal pos={row.pos} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 16, height: 16, borderRadius: 5, background: r.color, boxShadow: `0 0 10px ${r.color}` }} />
                  <span style={{ ...lilita(26), color: '#fff' }}>{r.name}</span>
                  {me && <span className="tag" style={{ color: ACCENT, border: `1px solid ${ACCENT}`, padding: '2px 7px', borderRadius: 6 }}>YOU</span>}
                  <span className="tag" style={{ color: 'var(--muted)' }}>{r.className}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: 22, color: '#fff' }}>{row.time}</div>
                  <div className="tag" style={{ color: row.delta ? '#ff8a7a' : 'var(--muted)' }}>{row.delta || 'leader'}</div>
                </div>
                <div style={{ textAlign: 'right', minWidth: 92 }}>
                  <div style={{ fontFamily: 'Nunito', fontWeight: 800, fontSize: 14, color: ACCENT }}>{row.best}</div>
                  <div className="tag">best lap</div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 26 }}>
          <button className="ck-btn ghost" onClick={() => go('select')}>Change racer</button>
          <button className="ck-btn" onClick={() => go('race')}>Race again</button>
          <button className="ck-btn ghost" onClick={() => go('menu')}>Menu</button>
        </div>
      </div>
    </Frame>
  );
}
