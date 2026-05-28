// @ts-nocheck — placeholder for Phase 4 (full editorial game detail page).
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Section, CornerBracket } from '@/components/brand';

/**
 * GameDetail — placeholder for `/play/:slug` per the Phase 2 IA flip.
 *
 * The designer's spec (ed-game.jsx) has this as the editorial game-detail
 * page with the wager slip dominant on the right rail. Phase 4 builds
 * the real version. For now it's a typographic stub with a single
 * "FREE PLAY" CTA that lands the user on /play/:slug/launch where the
 * actual Phaser/Three.js scene mounts.
 *
 * Bot users skip this screen — the bot's GAMES array on the SolShot
 * server links directly to /play/:slug/launch.
 */

const SLUG_TO_NAME: Record<string, { name: string; genre: string }> = {
  basketball: { name: 'Basketball', genre: 'Skill · Free-throw' },
  'keepie-uppies': { name: 'Keepie Uppies', genre: 'Skill · Endurance' },
  'free-kicks': { name: 'Free Kicks', genre: 'Sports · Precision' },
};

export function GameDetail() {
  const { slug = '' } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const game = SLUG_TO_NAME[slug];

  // Unknown slug → bounce home
  if (!game) {
    navigate('/play', { replace: true });
    return null;
  }

  return (
    <main style={{ padding: '32px 36px 48px', maxWidth: 960, margin: '0 auto' }}>
      <nav
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.18em',
          color: 'var(--ink-45)',
          textTransform: 'uppercase',
          marginBottom: 18,
        }}
      >
        <Link to="/play" style={{ color: 'var(--ink-70)' }}>
          The Floor
        </Link>{' '}
        ·{' '}
        <span style={{ color: 'var(--ink)' }}>{game.name}</span>
      </nav>

      <header style={{ marginBottom: 32 }}>
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--blue)',
            margin: '0 0 12px 0',
            fontWeight: 700,
          }}
        >
          {game.genre}
        </p>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.5rem, 8vw, 4.5rem)',
            color: 'var(--ink)',
            letterSpacing: '0.01em',
            lineHeight: 0.95,
            textTransform: 'uppercase',
            margin: 0,
          }}
        >
          {game.name}
        </h1>
      </header>

      <Section title="Play" sub="Free play · No wager">
        <div
          style={{
            position: 'relative',
            background: 'var(--paper)',
            border: '1.5px solid var(--ink)',
            borderBottom: '3px solid var(--ink)',
            padding: '32px',
            textAlign: 'center',
          }}
        >
          <CornerBracket pos="tl" />
          <CornerBracket pos="tr" />
          <CornerBracket pos="bl" />
          <CornerBracket pos="br" />
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.14em',
              color: 'var(--ink-45)',
              textTransform: 'uppercase',
              margin: '0 0 20px 0',
            }}
          >
            Wager slip · How to play · Payout table — Phase 4
          </p>
          <button
            type="button"
            onClick={() => navigate(`/play/${slug}/launch`)}
            style={{
              padding: '14px 32px',
              background: 'var(--ink)',
              color: 'var(--paper)',
              border: 'none',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              letterSpacing: '0.18em',
              fontWeight: 700,
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            FREE PLAY →
          </button>
        </div>
      </Section>
    </main>
  );
}

export default GameDetail;
