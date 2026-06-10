// @ts-nocheck — JSX-heavy section, placeholder tile art.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Section } from '@/components/brand';
import { SolanaPortal } from '@/components/brand/SolanaPortal';
import { TicketGlyph } from '@/components/brand/TicketGlyph';
import { PORTAL_GAMES, type ArcadeGame } from '@/data/games-fixtures';
import { useIsMobile } from '@/hooks/useIsMobile';

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

// Top-left art-area pill copy. Tells the player at a glance whether
// they can play this cabinet on the device they're on right now
// (per JJ 2026-06-07 — "what it's built for"). 'mobile' = TG-webview-
// first, 'desktop' = keyboard-only or large-canvas, 'both' = responsive.
const PLATFORM_LABEL: Record<'mobile' | 'desktop' | 'both', string> = {
  mobile:  'MOBILE',
  desktop: 'DESKTOP',
  both:    'MOBILE + DESKTOP',
};

function CabinetTile({ game, hoverEnabled }: { game: ArcadeGame; hoverEnabled: boolean }) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const tagStyle = game.tag && TAG_PALETTE[game.tag];
  const isFeatured = game.tag === 'FEATURED';
  const lifted = hoverEnabled && hovered;

  return (
    <article
      onMouseEnter={hoverEnabled ? () => setHovered(true) : undefined}
      onMouseLeave={hoverEnabled ? () => setHovered(false) : undefined}
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
        // Lift on hover — scale + shadow + z-index so the tile pops over
        // neighbours without bumping the grid layout. Subtle; the
        // expanding tagline drawer below is the louder cue.
        transform: lifted ? 'scale(1.035)' : 'scale(1)',
        boxShadow: lifted ? '0 10px 24px -6px rgba(14,26,46,0.28)' : '0 0 0 0 rgba(0,0,0,0)',
        zIndex: lifted ? 3 : 1,
        transition:
          'opacity 200ms ease, transform 220ms cubic-bezier(.2,.7,.2,1), box-shadow 220ms ease',
        cursor: hoverEnabled ? 'pointer' : 'default',
      }}
      onClick={hoverEnabled ? () => navigate(`/play/${game.slug}`) : undefined}
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

      {/* art area — 16:10 cabinet screen */}
      <div
        style={{
          position: 'relative',
          paddingTop: '62.5%',
          background: 'var(--ink-deep)',
          border: '2px solid var(--ink)',
          overflow: 'hidden',
        }}
      >
        {/* studio art fills the screen area — prefer tile crop when the
            game has shipped one, fall back to the hero with object-fit
            cover for games still on a single asset */}
        <img
          src={game.tileSrc ?? game.heroSrc}
          alt={`${game.name} cabinet art`}
          loading="lazy"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: game.heroFocus || 'center',
            display: 'block',
          }}
        />

        {/* platform pill — top-left of art area. Mirrors the player-count
            pill at bottom-right; tells the user whether the cabinet is
            built for their current device before they tap. Hidden on
            hover (the tagline drawer reads cleaner without it). */}
        <div
          style={{
            position: 'absolute',
            top: 6,
            left: 6,
            padding: '2px 7px',
            background: 'rgba(251,252,254,0.92)',
            color: 'var(--ink)',
            fontFamily: 'var(--font-mono)',
            fontSize: 8.5,
            letterSpacing: '0.14em',
            fontWeight: 700,
            border: '1px solid var(--ink)',
            whiteSpace: 'nowrap',
            opacity: lifted ? 0 : 1,
            transition: 'opacity 180ms ease',
          }}
        >
          {PLATFORM_LABEL[game.platform]}
        </div>

        {/* live player count pill — hidden when tagline drawer is up */}
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
            opacity: lifted ? 0 : 1,
            transition: 'opacity 180ms ease',
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

        {/* Tagline drawer — peeks up from the bottom of the art on hover.
            Overlay (not layout) so the grid doesn't jitter when neighbouring
            tiles change height. Genre + tagline give the user the "what is
            this" they were asking for at a glance. */}
        <div
          aria-hidden={!lifted}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            padding: '12px 12px 14px',
            background: 'linear-gradient(180deg, rgba(245,238,221,0) 0%, rgba(245,238,221,0.96) 38%, var(--paper) 100%)',
            color: 'var(--ink)',
            transform: lifted ? 'translateY(0)' : 'translateY(20%)',
            opacity: lifted ? 1 : 0,
            transition: 'transform 220ms cubic-bezier(.2,.7,.2,1), opacity 200ms ease',
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 8.5,
              letterSpacing: '0.20em',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: 'var(--ink-70)',
            }}
          >
            {game.genre}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 13,
              fontWeight: 400,
              letterSpacing: '0.01em',
              lineHeight: 1.25,
              color: 'var(--ink)',
            }}
          >
            {game.tagline}
          </span>
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
  // Hover-lift is desktop-only. On touch devices :hover sticks until the
  // next tap elsewhere, which makes the tagline drawer feel broken. Mobile
  // users get the tagline on the game-detail page instead.
  const isMobile = useIsMobile();
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
          <CabinetTile key={g.slug} game={g} hoverEnabled={!isMobile} />
        ))}
      </div>
    </Section>
  );
}

export default TheFloor;
