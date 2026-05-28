// @ts-nocheck — JSX-heavy section, placeholder tile art.
import { useNavigate } from 'react-router-dom';
import { Section } from '@/components/brand';
import { SolanaPortal } from '@/components/brand/SolanaPortal';
import { TicketGlyph } from '@/components/brand/TicketGlyph';
import { PORTAL_GAMES, type ArcadeGame } from '@/data/games-fixtures';

/**
 * TheFloor — 4-column grid of cabinet tiles per handoff dashboard §The Floor.
 *
 * Each tile:
 *   - title row: name + HOT/NEW/TOP tag
 *   - 16:10 art area with 2px ink border (placeholder wash)
 *   - live player count pill bottom-right of art
 *   - stake info row: FROM X SOL + Y TKT yield
 *   - Play button (full-width, ink fill, paper text)
 *
 * On mobile: 2-column grid. On tablet: 3. Desktop: 4.
 *
 * Featured tile (currently auto-cycling in FeaturedCabinet) is dimmed
 * to 55% to avoid duplication.
 */

const TAG_PALETTE: Record<string, { bg: string; fg: string }> = {
  FEATURED: { bg: 'var(--ink)',   fg: 'var(--paper)' },
  HOT:      { bg: 'var(--lose)',  fg: 'var(--paper)' },
  NEW:      { bg: 'var(--blue)',  fg: 'var(--paper)' },
  TOP:      { bg: 'var(--brass)', fg: 'var(--ink-deep)' },
};

function CabinetTile({ game }: { game: ArcadeGame }) {
  const navigate = useNavigate();
  const tagStyle = game.tag && TAG_PALETTE[game.tag];
  const isFeatured = game.tag === 'FEATURED';

  return (
    <article
      style={{
        position: 'relative',
        background: 'var(--paper)',
        border: '1.5px solid var(--ink)',
        borderBottom: '3px solid var(--ink)',
        padding: '12px 12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        opacity: isFeatured ? 0.55 : 1,
        transition: 'opacity 200ms ease',
      }}
    >
      {/* title row */}
      <header
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <h3
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: 15,
            letterSpacing: '0.015em',
            textTransform: 'uppercase',
            color: 'var(--ink)',
            lineHeight: 1,
          }}
        >
          {game.name}
        </h3>
        {tagStyle && (
          <span
            style={{
              padding: '3px 7px',
              background: tagStyle.bg,
              color: tagStyle.fg,
              fontFamily: 'var(--font-mono)',
              fontSize: 8.5,
              letterSpacing: '0.18em',
              fontWeight: 700,
              textTransform: 'uppercase',
            }}
          >
            {game.tag}
          </span>
        )}
      </header>

      {/* art area — 16:10, placeholder wash */}
      <div
        style={{
          position: 'relative',
          paddingTop: '62.5%',
          background:
            'linear-gradient(135deg, var(--ink-deep) 0%, var(--ink-rich) 100%)',
          border: '2px solid var(--ink)',
        }}
      >
        {/* game-name watermark in art area until real art lands */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1rem, 3vw, 1.5rem)',
            color: 'rgba(251,252,254,0.18)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            textAlign: 'center',
            padding: '0 12px',
          }}
        >
          {game.name}
        </div>

        {/* live player count pill */}
        <div
          style={{
            position: 'absolute',
            bottom: 6,
            right: 6,
            padding: '2px 7px',
            background: 'rgba(14,26,46,0.85)',
            color: 'var(--paper)',
            fontFamily: 'var(--font-mono)',
            fontSize: 8.5,
            letterSpacing: '0.12em',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: 'var(--win)',
            }}
          />
          {game.players}
        </div>
      </div>

      {/* stake info */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 8,
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.02em',
        }}
      >
        <span style={{ color: 'var(--ink-70)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <SolanaPortal size={10} gradId={`tile-${game.slug}`} />
          FROM {game.stake}
        </span>
        <span style={{ color: 'var(--brass-deep)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <TicketGlyph size={10} color="var(--brass-deep)" />
          +{game.yield} TKT
        </span>
      </div>

      {/* play button */}
      <button
        type="button"
        onClick={() => navigate(`/play/${game.slug}`)}
        style={{
          padding: '8px 0',
          background: 'var(--ink)',
          color: 'var(--paper)',
          border: 'none',
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.18em',
          fontWeight: 700,
          textTransform: 'uppercase',
          cursor: 'pointer',
          width: '100%',
        }}
      >
        Play
      </button>
    </article>
  );
}

export function TheFloor() {
  return (
    <Section title="The Floor" sub={`${PORTAL_GAMES.length} cabinets`}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 16,
        }}
      >
        {PORTAL_GAMES.map((g) => (
          <CabinetTile key={g.slug} game={g} />
        ))}
      </div>
    </Section>
  );
}

export default TheFloor;
