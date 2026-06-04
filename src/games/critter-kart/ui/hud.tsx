// @ts-nocheck
import type { RefObject } from 'react';
import { Frame } from './Stage';
import { ItemIcon } from './icons';
import { KeyCap } from './shared';
import { ITEMS, RACERS, ACCENT, type Screen } from './data';
import { TouchControls } from './TouchControls';
import { isTouchDevice } from '../game/input/touch';

const ORD = ['1ST', '2ND', '3RD', '4TH', '5TH', '6TH'];
const TOUCH = isTouchDevice(); // decided once: phones/tablets get on-screen controls

export interface HudState {
  lap: number;
  position: number;
  heldItem: number | null; // game item index 0-5 or null
  countdown: number | null; // 3/2/1/0(GO) during countdown, null while racing
  order: { racerId: string; pos: number }[];
  /** True while assets (GLBs, textures) are still being fetched + decoded. The countdown
   *  is paused until this clears, so the race doesn't go GO! over a half-rendered scene. */
  loading: boolean;
  /** 0..1 fraction of race assets fetched+decoded — drives the loading bar. */
  loadProgress: number;
  /** Transient "LAP 2" / "FINAL LAP" banner shown for a couple seconds when the player
   *  starts a new lap; null the rest of the time. */
  lapBanner: string | null;
  /** True while the player is driving against the track direction — flashes a WRONG WAY warning. */
  wrongWay: boolean;
  /** True while the player is boosting (turbo/pad/rocket/draft) — shows speed lines + a warm rush. */
  boosting: boolean;
  /** Shots remaining for the held item (Acorn = 3); shown as a ×N badge when > 1. */
  heldItemCount: number;
}

interface RaceHudProps extends HudState {
  racerId: string;
  timeRef: RefObject<HTMLDivElement>;
  boostRef: RefObject<HTMLDivElement>;
  miniRef: RefObject<HTMLCanvasElement>;
  onQuit: () => void;
}

export function RaceHud({ lap, position, heldItem, countdown, order, lapBanner, wrongWay, boosting, heldItemCount, racerId, timeRef, boostRef, miniRef, onQuit }: RaceHudProps) {
  const held = heldItem != null ? ITEMS[heldItem] : null;
  return (
    <div className="screen" style={{ pointerEvents: 'none' }}>
      {/* boost rush — warm vignette + speed lines while boosting, sells the speed */}
      {boosting && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1, background: 'radial-gradient(ellipse at center, transparent 42%, rgba(255,150,40,0.16) 100%)' }}>
          <div className="speedlines" style={{ opacity: 0.45 }} />
        </div>
      )}
      {/* top-left: lap / position / time */}
      <div style={{ position: 'absolute', top: TOUCH ? 8 : 22, left: TOUCH ? 96 : 22, display: 'flex', flexDirection: 'column', gap: 12,
        ...(TOUCH ? { transform: 'scale(0.72)', transformOrigin: 'top left' } : {}) }}>
        <div className="panel" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: "'Lilita One',sans-serif", fontSize: 30, color: '#fff', lineHeight: 0.9 }}>{lap}<span style={{ fontSize: 16, color: 'var(--muted)' }}>/3</span></div>
            <div className="tag" style={{ fontSize: 10 }}>LAP</div>
          </div>
          <div style={{ width: 1, height: 34, background: 'var(--panel-line)' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: "'Lilita One',sans-serif", fontSize: 30, color: ACCENT, lineHeight: 0.9 }}>{ORD[position - 1] || `${position}TH`}</div>
            <div className="tag" style={{ fontSize: 10 }}>POSITION</div>
          </div>
          <div style={{ width: 1, height: 34, background: 'var(--panel-line)' }} />
          <div style={{ textAlign: 'center' }}>
            <div ref={timeRef} style={{ fontFamily: "'Lilita One',sans-serif", fontSize: 26, color: '#fff', lineHeight: 0.9, fontVariantNumeric: 'tabular-nums' }}>0:00.00</div>
            <div className="tag" style={{ fontSize: 10 }}>TIME</div>
          </div>
        </div>
        {/* held item slot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="panel" style={{ width: 96, height: 96, display: 'grid', placeItems: 'center', borderRadius: 20, position: 'relative', background: held ? `radial-gradient(120% 120% at 50% 30%, ${held.color}33, var(--panel))` : 'var(--panel)' }}>
            {held ? <div className="pop"><ItemIcon item={held} size={62} glow /></div> : <span style={{ fontFamily: "'Lilita One',sans-serif", color: 'var(--muted)', fontSize: 30 }}>?</span>}
            <span className="tag" style={{ position: 'absolute', top: 7, left: 10, fontSize: 9 }}>ITEM</span>
            {held && heldItemCount > 1 && (
              <span style={{ position: 'absolute', bottom: 6, right: 9, fontFamily: "'Lilita One',sans-serif", fontSize: 22, color: '#fff', textShadow: '0 2px 0 rgba(0,0,0,.4)' }}>×{heldItemCount}</span>
            )}
          </div>
          {held && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontFamily: "'Lilita One',sans-serif", fontSize: 18, color: '#fff', textTransform: 'uppercase' }}>{held.name}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><KeyCap>E</KeyCap><span style={{ fontFamily: 'Nunito', fontWeight: 700, fontSize: 12, color: 'var(--muted)' }}>to use</span></div>
            </div>
          )}
        </div>
      </div>

      {/* minimap top-right */}
      <div className="panel" style={{ position: 'absolute', top: 22, right: 22, padding: 12, width: 174 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span className="tag" style={{ color: 'var(--accent)' }}>SUNNY MEADOW</span>
          <span className="tag">LAP {lap}/3</span>
        </div>
        <canvas ref={miniRef} width={150} height={117} style={{ display: 'block', width: 150, height: 117 }} />
      </div>

      {/* race order strip */}
      <div className="panel" style={{ position: 'absolute', top: 200, right: 22, padding: '10px 12px', width: 174, display: 'grid', gap: 7 }}>
        <span className="tag" style={{ color: 'var(--accent)' }}>RACE ORDER</span>
        {order.map((o, i) => {
          const r = RACERS.find((x) => x.id === o.racerId)!;
          const me = o.racerId === racerId;
          return (
            <div key={o.racerId} style={{ display: 'flex', alignItems: 'center', gap: 9, opacity: me ? 1 : 0.82 }}>
              <span style={{ fontFamily: "'Lilita One',sans-serif", fontSize: 14, color: me ? ACCENT : 'var(--muted)', width: 14 }}>{i + 1}</span>
              <div style={{ width: 11, height: 11, borderRadius: 4, background: r.color }} />
              <span style={{ fontFamily: 'Nunito', fontWeight: me ? 900 : 700, fontSize: 13, color: me ? '#fff' : 'var(--paper)' }}>{r.name}</span>
            </div>
          );
        })}
      </div>

      {/* boost meter bottom-right */}
      <div className="panel" style={{ position: 'absolute', bottom: 22, right: 22, padding: '10px 14px', width: 196 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span className="tag" style={{ color: 'var(--accent)' }}>BOOST</span>
          <span className="tag">DRIFT TO FILL</span>
        </div>
        <div style={{ height: 12, borderRadius: 99, background: 'rgba(255,255,255,.12)', overflow: 'hidden' }}>
          <div ref={boostRef} style={{ width: '0%', height: '100%', borderRadius: 99, background: `linear-gradient(90deg, var(--gold-deep), var(--gold))`, boxShadow: `0 0 12px ${ACCENT}` }} />
        </div>
      </div>

      {/* on-screen touch controls (phones/tablets) — otherwise the keyboard hint */}
      {TOUCH ? <TouchControls /> : (
        <div className="panel" style={{ position: 'absolute', bottom: 22, left: 22, padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 16 }}>
          {([['W', 'gas'], ['S', 'brake'], ['A D', 'steer'], ['SPACE', 'drift', true], ['E', 'item']] as [string, string, boolean?][]).map(([k, lbl, wide], i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <KeyCap wide={wide}>{k}</KeyCap>
              <span style={{ fontFamily: 'Nunito', fontWeight: 700, fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.4 }}>{lbl}</span>
            </div>
          ))}
        </div>
      )}

      {/* quit */}
      <button className="ck-btn ghost sm" onClick={onQuit}
        style={{ position: 'absolute', pointerEvents: 'auto', top: TOUCH ? 12 : 200, left: TOUCH ? 12 : 22,
          ...(TOUCH ? { padding: '4px 10px', fontSize: 12 } : {}) }}>‹ Quit</button>

      {/* race-start countdown overlay */}
      {countdown != null && <RaceCountdown beat={countdown} />}

      {/* lap-change banner ("LAP 2" / "FINAL LAP") */}
      {lapBanner && <LapBanner text={lapBanner} />}

      {/* wrong-way warning — flashes while driving against the track */}
      {wrongWay && (
        <div className="screen" style={{ display: 'grid', placeItems: 'center', paddingBottom: '8vh', alignContent: 'end', pointerEvents: 'none', zIndex: 21 }}>
          <div style={{
            fontFamily: "'Lilita One',sans-serif", fontSize: 64, color: '#ff3b30',
            WebkitTextStroke: '7px var(--ink)', paintOrder: 'stroke fill', letterSpacing: 2,
            textTransform: 'uppercase', animation: 'ckflash 0.5s steps(2, jump-none) infinite',
            filter: 'drop-shadow(0 8px 0 rgba(0,0,0,.3))',
          } as React.CSSProperties}>⚠ Wrong Way</div>
        </div>
      )}
    </div>
  );
}

/**
 * Transient lap announcement, same punchy style as the start countdown but smaller and
 * up near the top so it doesn't cover the road. Re-keys on the text so each new lap
 * replays the pop-in animation. "FINAL LAP" gets the gold accent for extra drama.
 */
function LapBanner({ text }: { text: string }) {
  const isFinal = text.toUpperCase().includes('FINAL');
  return (
    <div className="screen" style={{ display: 'grid', placeItems: 'start center', paddingTop: '14vh', pointerEvents: 'none', zIndex: 19 }}>
      <div
        key={text}
        style={{
          fontFamily: "'Lilita One',sans-serif",
          fontSize: 96,
          color: isFinal ? ACCENT : '#fff',
          WebkitTextStroke: '8px var(--ink)',
          paintOrder: 'stroke fill',
          filter: 'drop-shadow(0 12px 0 rgba(0,0,0,.28))',
          animation: 'ckgo 1700ms cubic-bezier(.2,1.3,.4,1) both',
          textTransform: 'uppercase',
          letterSpacing: 1,
        } as React.CSSProperties}
      >{text}</div>
    </div>
  );
}

/**
 * 3 · 2 · 1 · GO! overlay. Each beat replays the punch-in/scale-out animation
 * (ckcount for digits, ckgo for the green "GO!") with an expanding ring flash
 * behind it. Driven by the `beat` prop from race state: 3/2/1 → digits,
 * 0 → "GO!", null → unmounts. Doesn't capture pointer events so the HUD beneath
 * stays responsive (the race itself is gated by input lock, not this overlay).
 */
function RaceCountdown({ beat }: { beat: number }) {
  const isGo = beat === 0;
  const col = isGo ? '#3ad65a' : ACCENT;
  return (
    <div className="screen" style={{ display: 'grid', placeItems: 'center', background: 'rgba(8,14,28,.32)', pointerEvents: 'none', zIndex: 20 }}>
      {/* expanding ring flash, retriggered each beat by the key */}
      <div key={`r-${beat}`} style={{ position: 'absolute', width: 240, height: 240, borderRadius: '50%', border: `7px solid ${col}`, animation: 'ckcount .78s ease-out both' }} />
      <div
        key={beat}
        style={{
          fontFamily: "'Lilita One',sans-serif",
          fontSize: isGo ? 196 : 240,
          color: col,
          WebkitTextStroke: '12px var(--ink)',
          paintOrder: 'stroke fill',
          filter: 'drop-shadow(0 16px 0 rgba(0,0,0,.3))',
          animation: `${isGo ? 'ckgo' : 'ckcount'} ${isGo ? 760 : 780}ms cubic-bezier(.2,1.3,.4,1) both`,
          textTransform: 'uppercase',
        } as React.CSSProperties}
      >{isGo ? 'GO!' : beat}</div>
    </div>
  );
}

export function HowToPlay({ go }: { go: (s: Screen) => void }) {
  return (
    <Frame background={<div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 100% at 50% 0%, #1b2c4c, #0c1626 70%)' }}><div className="speedlines" /></div>}>
      <div className="fade-enter" style={{ position: 'absolute', inset: 0, padding: '34px 56px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="pill">How to play</div>
          <button className="ck-btn ghost sm" onClick={() => go('menu')}>‹ Back</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.55fr', gap: 24, marginTop: 22, flex: 1, minHeight: 0 }}>
          <div className="panel" style={{ padding: 22 }}>
            <span className="tag" style={{ color: 'var(--accent)' }}>CONTROLS</span>
            <div style={{ display: 'grid', gap: 14, marginTop: 16 }}>
              {([['W', 'Throttle'], ['S', 'Brake / reverse'], ['A  D', 'Steer'], ['SPACE', 'Drift', true], ['E', 'Use item']] as [string, string, boolean?][]).map(([k, lbl, wide], i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}><KeyCap wide={wide}>{k}</KeyCap><span style={{ fontFamily: 'Nunito', fontWeight: 800, fontSize: 16, color: '#fff' }}>{lbl}</span></div>
              ))}
            </div>
            <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--panel-line)' }}>
              <span className="tag" style={{ color: 'var(--accent)' }}>HOW A RACE GOES</span>
              <p style={{ fontFamily: 'Nunito', fontWeight: 600, fontSize: 14, color: 'var(--paper)', opacity: 0.85, lineHeight: 1.6, marginTop: 10 }}>6 karts, 3 laps. Drift through corners. Grab a balloon to roll an item — attack the racers ahead or defend your line. First across the finish wins.</p>
            </div>
          </div>
          <div className="panel" style={{ padding: 22, overflow: 'auto' }}>
            <span className="tag" style={{ color: 'var(--accent)' }}>POWER-UPS · {ITEMS.length}</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 16 }}>
              {ITEMS.map((it) => (
                <div key={it.id} style={{ display: 'flex', gap: 13, alignItems: 'center', padding: '10px 12px', borderRadius: 14, background: `linear-gradient(120deg, ${it.color}1f, transparent)`, border: '1px solid var(--panel-line)' }}>
                  <ItemIcon item={it} size={48} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ fontFamily: "'Lilita One',sans-serif", fontSize: 15, color: '#fff', textTransform: 'uppercase' }}>{it.name}</span>
                      <span className="tag" style={{ fontSize: 9, color: it.badge === 'def' ? '#2bd4ff' : it.badge === 'atk' ? '#ffd400' : 'var(--muted)' }}>{it.type}</span>
                    </div>
                    <p style={{ fontFamily: 'Nunito', fontWeight: 600, fontSize: 11.5, color: 'var(--muted)', margin: '3px 0 0', lineHeight: 1.4 }}>{it.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Frame>
  );
}
