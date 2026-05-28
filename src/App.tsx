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
