import { Outlet } from 'react-router-dom';
import { useIsMobile } from '@/hooks/useIsMobile';
import { MastheadDesktop } from './MastheadDesktop';
import { MastheadMobile } from './MastheadMobile';
import { FloorStats, FloorStatsMobile } from './FloorStats';
import { Ticker } from './Ticker';
import { MobileTabBar } from './MobileTabBar';
import { Footer } from './Footer';
import { WelcomeToast } from '@/components/WelcomeToast';

/**
 * AppShell — wraps every authed route in the v2 brand chrome.
 *
 * Desktop: [Masthead 80px] [FloorStats 32px] [Ticker 28px] [body] (no bottom nav)
 * Mobile:  [statusbar 48px gap] [Masthead] [FloorStats 24px] [Ticker 22px] [body] [TabBar bottom]
 *
 * The route's content renders via <Outlet/>. Body is scrollable;
 * chrome stays pinned via flexbox layout (flexShrink: 0 on chrome,
 * flex: 1 + overflowY: auto on body).
 */
export function AppShell() {
  const isMobile = useIsMobile();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg)',
        paddingTop: isMobile ? 'env(safe-area-inset-top, 0px)' : 0,
      }}
    >
      {isMobile ? (
        <>
          <MastheadMobile />
          <FloorStatsMobile />
          <Ticker variant="mobile" />
          <main
            style={{
              flex: 1,
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <Outlet />
            <Footer />
          </main>
          <MobileTabBar />
        </>
      ) : (
        <>
          <MastheadDesktop />
          <FloorStats />
          <Ticker variant="desktop" />
          <main
            style={{
              flex: 1,
              overflowY: 'auto',
            }}
          >
            <Outlet />
            <Footer />
          </main>
        </>
      )}
      {/* Welcome toast — one-time, on first authenticated mount.
          Mounts above all chrome (high z-index). Auto-dismisses
          after ~6s; persists dismissal in localStorage. */}
      <WelcomeToast />
    </div>
  );
}

export default AppShell;
