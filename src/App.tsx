import { Routes, Route, Navigate } from 'react-router-dom';
import { CabinetLanding } from '@/routes/CabinetLanding';
import { Dashboard } from '@/routes/Dashboard';
import { Leaderboards } from '@/routes/Leaderboards';
import { Prizes } from '@/routes/Prizes';
import { Wallet } from '@/routes/Wallet';
import { SolShotRedirect } from '@/routes/SolShotRedirect';
import { RequireAuth } from '@/routes/RequireAuth';
import { AppShell } from '@/components/chrome/AppShell';
import { GameDetail } from '@/routes/games/GameDetail';
import { KeepieUppies } from '@/routes/games/KeepieUppies';
import { Basketball } from '@/routes/games/Basketball';
import { FreeKicks } from '@/routes/games/FreeKicks';
// Pool (legacy chromeless iframe wrapper) replaced by MatchHUD below.
import { PoolLobby } from '@/routes/games/pool/Lobby';
import { MatchHUD } from '@/routes/games/pool/MatchHUD';
import { Marathon } from '@/routes/games/pool/Marathon';
import { MarathonRun } from '@/routes/games/pool/MarathonRun';
import { Tournament } from '@/routes/games/pool/Tournament';
import { Wager } from '@/routes/games/pool/Wager';
import { Async as PoolAsync } from '@/routes/games/pool/Async';
import { Settings as PoolSettings } from '@/routes/games/pool/Settings';
import { Splash as PoolSplash } from '@/routes/games/pool/Splash';

export function App() {
  return (
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
        <Route path="/play/solshot" element={<SolShotRedirect />} />

        {/* Everything else wraps in the v2 brand chrome
            (Masthead, FloorStats, Ticker, MobileTabBar). */}
        <Route element={<AppShell />}>
          <Route path="/play" element={<Dashboard />} />
          <Route path="/play/:slug" element={<GameDetail />} />
          <Route path="/leaderboard" element={<Leaderboards />} />
          <Route path="/leaderboard/:game" element={<Leaderboards />} />
          <Route path="/prizes" element={<Prizes />} />
          <Route path="/wallet" element={<Wallet />} />
        </Route>

        {/* Legacy URL redirects — preserve any shared links (Twitter,
            bot deep-links, this codebase's old comms entries). */}
        <Route path="/dashboard" element={<Navigate to="/play" replace />} />
        <Route path="/leaderboards" element={<Navigate to="/leaderboard" replace />} />
        <Route path="/leaderboards/:game" element={<Navigate to="/leaderboard" replace />} />
        <Route path="/wager" element={<Navigate to="/wallet" replace />} />
        <Route path="/me" element={<Navigate to="/play" replace />} />
        <Route path="/profile/:callsign" element={<Navigate to="/play" replace />} />
        <Route path="/about" element={<Navigate to="/" replace />} />
      </Route>

      {/* Catch-all → cabinet landing */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
