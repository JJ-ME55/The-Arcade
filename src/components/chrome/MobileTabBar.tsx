import { useNavigate, useLocation } from 'react-router-dom';

/**
 * MobileTabBar — 5-icon bottom nav per handoff §Mobile Tab Bar.
 *
 * Active tab gets a 2px blue underline and ink color (vs muted
 * ink-45 for inactive). Icons are simple type glyphs for v1 —
 * designer flagged "all glyphs are custom SVG, no emoji" in the
 * NOT-included list, so these are placeholders to be swapped when
 * the icon SVGs ship.
 *
 * Sits at the bottom of any mobile authed route. Parent AppShell
 * accounts for its height in scroll calculations.
 */

interface TabDef {
  id: string;
  label: string;
  icon: string;
  to: string;
}

// 2026-06-10: deduped — 'Home' and 'Play' both pointed at /play and both
// lit active at once. Now four distinct destinations.
// (2026-06-05: Prizes tab swapped for Competitions — the live 1 SOL hook.
// /prizes still resolves via Wallet's "Browse Prizes" + shared links.)
const TABS: TabDef[] = [
  { id: 'play',   label: 'Play',   icon: '▸', to: '/play' },
  { id: 'comps',  label: 'Comps',  icon: '★', to: '/competitions' },
  { id: 'board',  label: 'Board',  icon: '#', to: '/leaderboard' },
  { id: 'wallet', label: 'Wallet', icon: '◫', to: '/wallet' },
];

function isActive(currentPath: string, tabPath: string): boolean {
  if (tabPath === '/play') {
    // /play covers the dashboard + the game-detail surface
    return currentPath === '/play' || currentPath.startsWith('/play/');
  }
  return currentPath.startsWith(tabPath);
}

export function MobileTabBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav
      style={{
        flexShrink: 0,
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        background: 'var(--paper)',
        borderTop: '1.5px solid var(--ink)',
        padding: '6px 0 10px',
        paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
      }}
      aria-label="Primary navigation"
    >
      {TABS.map((t) => {
        const active = isActive(pathname, t.to);
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => navigate(t.to)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              paddingTop: 8,
              marginTop: -6,
              background: 'transparent',
              border: 'none',
              color: active ? 'var(--ink)' : 'var(--ink-45)',
              borderTop: active
                ? '2px solid var(--blue)'
                : '2px solid transparent',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
            aria-current={active ? 'page' : undefined}
          >
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 16,
                fontWeight: 900,
              }}
              aria-hidden
            >
              {t.icon}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 8,
                letterSpacing: '0.16em',
                fontWeight: 700,
                textTransform: 'uppercase',
              }}
            >
              {t.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

export default MobileTabBar;
