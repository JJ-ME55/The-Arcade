// @ts-nocheck — placeholder cabinet art until designer ships per-game heroes.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PORTAL_GAMES } from '@/data/games-fixtures';

const CYCLE_MS = 4500;

/**
 * FeaturedCabinet — 380px-tall hero, auto-cycles through PORTAL_GAMES
 * every 4.5s. Per handoff dashboard §Featured Cabinet.
 *
 * Left 58% of the card holds the editorial: genre label, Krona One
 * game name (82px), tagline, two CTAs (WAGER filled-blue + FREE PLAY
 * outline-paper). Right side reserved for game art (designer ships
 * per-game hero assets later — currently a neutral wash).
 *
 * Top-right has a brass-dashed "CABINET 0X" stamp rotated -7°.
 * Bottom 5px blue accent rule.
 */
export function FeaturedCabinet() {
  const [index, setIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % PORTAL_GAMES.length);
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, []);

  const featured = PORTAL_GAMES[index];
  const cabinetNum = String(index + 1).padStart(2, '0');

  return (
    <article
      style={{
        position: 'relative',
        height: 380,
        background: 'var(--ink)',
        color: 'var(--paper)',
        overflow: 'hidden',
        border: '1.5px solid var(--ink)',
        borderBottom: '5px solid var(--blue)',
      }}
    >
      {/* studio hero art fills the cabinet */}
      <img
        src={featured.heroSrc}
        alt={`${featured.name} hero`}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: featured.heroFocus || 'center',
          display: 'block',
        }}
      />

      {/* left-to-right ink-to-transparent gradient so the editorial
          content panel (left 58%) reads cleanly over the studio art */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(90deg, var(--ink) 0%, rgba(21,32,58,0.85) 35%, rgba(21,32,58,0.35) 65%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* CABINET stamp */}
      <div
        style={{
          position: 'absolute',
          top: 18,
          right: 22,
          padding: '4px 10px',
          border: '1px dashed var(--brass)',
          color: 'var(--brass-glint)',
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          letterSpacing: '0.22em',
          fontWeight: 700,
          textTransform: 'uppercase',
          transform: 'rotate(-7deg)',
        }}
      >
        Cabinet {cabinetNum}
      </div>

      {/* editorial content panel — left 58% */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          width: '58%',
          height: '100%',
          padding: '32px 36px 28px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.22em',
            color: 'var(--blue-bright)',
            textTransform: 'uppercase',
            fontWeight: 700,
            margin: '0 0 16px 0',
          }}
        >
          {featured.genre}
        </p>

        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.5rem, 6vw, 5rem)',
            letterSpacing: '0.005em',
            lineHeight: 0.92,
            textTransform: 'uppercase',
            color: 'var(--paper)',
            margin: 0,
          }}
        >
          {featured.name}
        </h2>

        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 15,
            lineHeight: 1.5,
            color: 'rgba(251,252,254,0.7)',
            margin: '14px 0 0 0',
            maxWidth: 360,
          }}
        >
          {featured.tagline}
        </p>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => navigate(`/play/${featured.slug}`)}
            style={{
              padding: '12px 22px',
              background: 'var(--blue)',
              color: 'var(--paper)',
              border: 'none',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Wager
          </button>
          <button
            type="button"
            onClick={() =>
              navigate(
                featured.slug === 'solshot'
                  ? '/play/solshot'
                  : `/play/${featured.slug}/launch`
              )
            }
            style={{
              padding: '12px 22px',
              background: 'transparent',
              color: 'var(--paper)',
              border: '1.5px solid var(--paper)',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Free Play
          </button>
        </div>
      </div>

      {/* HI score top-right (below the stamp) */}
      <div
        style={{
          position: 'absolute',
          bottom: 18,
          right: 22,
          textAlign: 'right',
          zIndex: 2,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            letterSpacing: '0.22em',
            color: 'rgba(251,252,254,0.55)',
            textTransform: 'uppercase',
            fontWeight: 700,
          }}
        >
          HI · Top Score
        </div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--brass-glint)',
            letterSpacing: '0.02em',
            marginTop: 4,
          }}
        >
          {featured.hi}
        </div>
      </div>

      {/* tiny dot indicators bottom-left */}
      <div
        style={{
          position: 'absolute',
          bottom: 18,
          left: 36,
          display: 'flex',
          gap: 6,
          zIndex: 2,
        }}
      >
        {PORTAL_GAMES.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Show cabinet ${i + 1}`}
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: i === index ? 'var(--brass-glint)' : 'rgba(251,252,254,0.3)',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          />
        ))}
      </div>
    </article>
  );
}

export default FeaturedCabinet;
