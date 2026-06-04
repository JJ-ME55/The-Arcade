// @ts-nocheck
import { useEffect, useState } from 'react';
import { RACERS, TRACKS } from './data';
import { ClassIcon } from './icons';

const lilita = (px: number, stroke = 0): React.CSSProperties =>
  ({ fontFamily: "'Lilita One', sans-serif", fontSize: px, textTransform: 'uppercase', WebkitTextStroke: stroke ? `${stroke}px var(--ink)` : undefined, paintOrder: 'stroke fill' } as React.CSSProperties);

const TIPS = [
  'Drift through corners to charge your BOOST meter.',
  'Pop a balloon to roll a random power-up.',
  'A Leaf Shield blocks one incoming hit — save it.',
  'Heavier racers shove lighter ones off the line.',
  'Tap the Homing Bee to chase down the kart ahead.',
  'Boost-pad arrows on the road give a free turbo.',
  'Watch for the ramp before the lake — speed = launch.',
];

/**
 * Pre-race loading curtain. Held by GameCanvas's LoadingManager: the 3-2-1-GO
 * countdown is paused until every GLB has decoded. Renders the chosen track's
 * sky theme, the racer's identity, a rotating tip, an indeterminate progress
 * bar, and a "Loading…" spinner in the bottom-right corner.
 */
export function LoadingScreen({ racerId, trackId, progress }: { racerId: string; trackId: string; progress: number }) {
  const r = RACERS.find((x) => x.id === racerId) ?? RACERS[0];
  const t = TRACKS.find((x) => x.id === trackId) ?? TRACKS[0];
  const [tip, setTip] = useState(0);

  // Tips rotate every 4 seconds.
  useEffect(() => {
    const tipId = window.setInterval(() => setTip((x) => (x + 1) % TIPS.length), 4000);
    return () => window.clearInterval(tipId);
  }, []);

  // Real load progress (0..1 from the LoadingManager), shown as a percentage. Floored at 4%
  // so the bar is always visible, and the CSS width transition smooths the steps.
  const pct = Math.max(4, Math.min(100, Math.round(progress * 100)));

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: `linear-gradient(${t.sky[0]}, ${t.sky[1]})`,
        overflow: 'hidden',
        zIndex: 100,
      }}
    >
      {/* World silhouette — hills clipped from the track's accent colour */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '38%', background: t.accent, clipPath: 'polygon(0 38%, 16% 16%, 34% 44%, 52% 12%, 70% 40%, 86% 18%, 100% 36%, 100% 100%, 0 100%)', opacity: 0.9 }} />
      {/* Bottom vignette */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 90% at 50% 120%, transparent, rgba(8,14,28,.6))' }} />
      {/* Speed-line texture */}
      <div className="speedlines" />
      {/* Checker strip along the very bottom edge */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 22 }} className="checker" />

      <div className="fade-enter" style={{ position: 'absolute', inset: 0, padding: '46px 64px', display: 'flex', flexDirection: 'column' }}>
        <div className="pill" style={{ alignSelf: 'flex-start' }}>Get ready</div>

        {/* Central readout: "NOW ENTERING" + the track name */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 4 }}>
          <div className="tag" style={{ color: 'var(--ink)', opacity: 0.7 }}>NOW ENTERING</div>
          <div style={{ ...lilita(78, 5), color: '#fff', lineHeight: 0.9, filter: 'drop-shadow(0 8px 0 rgba(0,0,0,.22))' } as React.CSSProperties}>{t.name}</div>
          <div style={{ fontFamily: 'Nunito', fontWeight: 800, fontSize: 14, color: 'var(--ink)', letterSpacing: 1, marginTop: 2, textTransform: 'uppercase' }}>{t.laps} LAPS · {t.cc} · {t.tag.toUpperCase()}</div>

          {/* Racer chip */}
          <div className="panel" style={{ marginTop: 22, padding: '10px 18px 10px 12px', display: 'flex', alignItems: 'center', gap: 13 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: `linear-gradient(135deg, ${r.color}, ${r.colorDeep})`, display: 'grid', placeItems: 'center', boxShadow: `0 3px 0 ${r.colorDeep}` }}>
              <ClassIcon classId={r.classId} size={20} color="#fff" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ ...lilita(20), color: '#fff' }}>{r.name}</span>
                <span className="tag" style={{ color: 'var(--accent)', border: '1px solid var(--accent)', padding: '1px 6px', borderRadius: 5 }}>YOU</span>
              </div>
              <div className="tag" style={{ color: 'var(--muted)' }}>{r.className}</div>
            </div>
          </div>
        </div>

        {/* Bottom: tip + progress bar */}
        <div style={{ width: 'min(680px, 100%)', alignSelf: 'center' }}>
          <div className="panel" style={{ padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontFamily: 'Nunito', fontWeight: 800, fontSize: 12, color: 'var(--accent)', minWidth: 56 }}>💡 TIP</span>
            <span key={tip} className="pop" style={{ fontFamily: 'Nunito', fontWeight: 700, fontSize: 13.5, color: 'var(--paper)', flex: 1 }}>{TIPS[tip]}</span>
          </div>
          <div style={{ marginTop: 12, height: 16, borderRadius: 99, background: 'rgba(8,14,28,.45)', overflow: 'hidden', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.18)' }}>
            <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, var(--accent-deep), var(--accent))', boxShadow: '0 0 14px var(--accent)', transition: 'width .14s linear' }} />
          </div>
        </div>
      </div>

      {/* Bottom-right: Loading… + spinner */}
      <div style={{ position: 'absolute', right: 26, bottom: 32, display: 'flex', alignItems: 'center', gap: 11 }}>
        <span style={{ ...lilita(18), color: 'var(--ink)', letterSpacing: 0.5 }}>{pct}%</span>
        <div className="ck-spinner" />
      </div>
    </div>
  );
}
