import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CabinetLanding } from '@/routes/CabinetLanding';
import { Dashboard } from '@/routes/Dashboard';
import { Leaderboards } from '@/routes/Leaderboards';
import { Prizes } from '@/routes/Prizes';
import { Competitions } from '@/routes/Competitions';
import { Wallet } from '@/routes/Wallet';
import { SolShotDetail } from '@/routes/SolShotDetail';
import { Privacy } from '@/routes/Privacy';
import { Terms } from '@/routes/Terms';
import { NotFound } from '@/routes/NotFound';
import { Me } from '@/routes/Me';
import { Status } from '@/routes/Status';
import { RequireAuth } from '@/routes/RequireAuth';
import { AppShell } from '@/components/chrome/AppShell';
import { GameDetail } from '@/routes/games/GameDetail';

// Game-engine routes are lazy-loaded. Each pulls in a heavy runtime —
// Phaser (basketball, keepie-uppies), Three.js (free-kicks, critter-kart,
// shootout), socket.io — that a visitor browsing the floor never needs.
// Before this they were static imports bundled into the single 3.4 MB
// entry chunk; now each engine ships only when its /launch route is hit.
const KeepieUppies = lazy(() => import('@/routes/games/KeepieUppies').then((m) => ({ default: m.KeepieUppies })));
const Basketball = lazy(() => import('@/routes/games/Basketball').then((m) => ({ default: m.Basketball })));
const FreeKicks = lazy(() => import('@/routes/games/FreeKicks').then((m) => ({ default: m.FreeKicks })));
const CritterKart = lazy(() => import('@/routes/games/CritterKart').then((m) => ({ default: m.CritterKart })));
const Shootout = lazy(() => import('@/routes/games/Shootout').then((m) => ({ default: m.Shootout })));
// Pool screens (designer JSX + pool canvas) — also lazy.
const PoolLobby = lazy(() => import('@/routes/games/pool/Lobby').then((m) => ({ default: m.PoolLobby })));
const MatchHUD = lazy(() => import('@/routes/games/pool/MatchHUD').then((m) => ({ default: m.MatchHUD })));
const Marathon = lazy(() => import('@/routes/games/pool/Marathon').then((m) => ({ default: m.Marathon })));
const MarathonRun = lazy(() => import('@/routes/games/pool/MarathonRun').then((m) => ({ default: m.MarathonRun })));
const Tournament = lazy(() => import('@/routes/games/pool/Tournament').then((m) => ({ default: m.Tournament })));
const Wager = lazy(() => import('@/routes/games/pool/Wager').then((m) => ({ default: m.Wager })));
const PoolAsync = lazy(() => import('@/routes/games/pool/Async').then((m) => ({ default: m.Async })));
const PoolSettings = lazy(() => import('@/routes/games/pool/Settings').then((m) => ({ default: m.Settings })));
const PoolSplash = lazy(() => import('@/routes/games/pool/Splash').then((m) => ({ default: m.Splash })));

/** Full-screen brand loading state while a game chunk streams in. */
function GameLoading() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        letterSpacing: '0.28em',
        textTransform: 'uppercase',
        fontWeight: 700,
        color: 'var(--ink-45)',
      }}
    >
      · Loading cabinet ·
    </div>
  );
}

export function App() {
  return (
    <Suspense fallback={<GameLoading />}>
    <Routes>
      {/* Pre-auth — cabinet landing, no chrome */}
      <Route path="/" element={<CabinetLanding />} />

      {/* Auth-required surfaces */}
      <Route element={<RequireAuth />}>
        {/* Game LAUNCH routes — Phaser/Three.js scenes mount full-screen,
            no AppShell chrome. Game's own GameChrome overlay (forfeit +
            mute) handles in-game UI. Bot's GAMES array links here
            directly so bot users skip game-detail. */}
        <Route path="/play/keepie-uppies/launch" element={<KeepieUppies />} />
        <Route path="/play/basketball/launch" element={<Basketball />} />
        <Route path="/play/free-kicks/launch" element={<FreeKicks />} />
        <Route path="/play/critter-kart/launch" element={<CritterKart />} />
        {/* Shootout — chromeless iframe wrapping the standalone Three.js FPS
            at fps-staking-game.vercel.app. See src/games/shootout/README.md
            for why this is iframed instead of ported into src/games/. */}
        <Route path="/play/shootout/launch" element={<Shootout />} />
        {/* Match HUD wraps the pool iframe with brass HUD bar + power
            shelf (Round 2 DesktopMatch port). MatchHUD replaces the
            chromeless Pool wrapper; the iframe receives ?hud=parent so
            its in-iframe DOM widgets stand down. */}
        <Route path="/play/pool/launch" element={<MatchHUD />} />
        {/* Side Pocket Lobby — chromeless. Designer's MainMenuClub variant
            (Round 2 handoff). Sits at /play/pool ahead of the generic
            GameDetail catch-all below. */}
        <Route path="/play/pool" element={<PoolLobby />} />
        {/* Side Pocket sub-screens — all chromeless, all ported from Round 2
            designer JSX. Mock data for V1 visual ship; backend wiring is a
            follow-up slice per screen. */}
        <Route path="/play/pool/splash" element={<PoolSplash />} />
        <Route path="/play/pool/marathon" element={<Marathon />} />
        <Route path="/play/pool/marathon/run/:runId" element={<MarathonRun />} />
        <Route path="/play/pool/tournament" element={<Tournament />} />
        <Route path="/play/pool/wager" element={<Wager />} />
        <Route path="/play/pool/async" element={<PoolAsync />} />
        <Route path="/play/pool/settings" element={<PoolSettings />} />
        {/* SolShot editorial detail page — replaces the old raw redirect.
            Mounts inside AppShell below so the v2 brand chrome wraps it. */}

        {/* Everything else wraps in the v2 brand chrome
            (Masthead, FloorStats, Ticker, MobileTabBar). */}
        <Route element={<AppShell />}>
          <Route path="/play" element={<Dashboard />} />
          {/* SolShot has its own editorial detail (K/D + W% scorecard +
              session-handoff CTA) since the canvas lives off-site. Must
              come before the generic /play/:slug catch-all. */}
          <Route path="/play/solshot" element={<SolShotDetail />} />
          <Route path="/play/:slug" element={<GameDetail />} />
          <Route path="/leaderboard" element={<Leaderboards />} />
          <Route path="/leaderboard/:game" element={<Leaderboards />} />
          <Route path="/prizes" element={<Prizes />} />
          <Route path="/competitions" element={<Competitions />} />
          <Route path="/wallet" element={<Wallet />} />
        </Route>

        {/* Legacy URL redirects — preserve any shared links (Twitter,
            bot deep-links, this codebase's old comms entries). */}
        <Route path="/dashboard" element={<Navigate to="/play" replace />} />
        <Route path="/leaderboards" element={<Navigate to="/leaderboard" replace />} />
        <Route path="/leaderboards/:game" element={<Navigate to="/leaderboard" replace />} />
        <Route path="/wager" element={<Navigate to="/wallet" replace />} />
        <Route path="/me" element={<Me />} />
        <Route path="/profile/:callsign" element={<Navigate to="/play" replace />} />
        <Route path="/about" element={<Navigate to="/" replace />} />
      </Route>

      {/* Public legal + ops — no auth, no chrome (own editorial layout). */}
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/status" element={<Status />} />

      {/* Catch-all → branded 404 instead of silent redirect-to-landing.
          Surface broken links honestly + give a path back. */}
      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
  );
}
