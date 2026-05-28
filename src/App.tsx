import { Routes, Route, Navigate } from 'react-router-dom';
import { CabinetLanding } from '@/routes/CabinetLanding';
import { Dashboard } from '@/routes/Dashboard';
import { Leaderboards } from '@/routes/Leaderboards';
import { Wager } from '@/routes/Wager';
import { Profile } from '@/routes/Profile';
import { Me } from '@/routes/Me';
import { About } from '@/routes/About';
import { SolShotRedirect } from '@/routes/SolShotRedirect';
import { RequireAuth } from '@/routes/RequireAuth';
import { AppShell } from '@/components/chrome/AppShell';
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
        {/* Game scenes mount full-screen WITHOUT the chrome — they own
            their own canvas + GameChrome overlay (forfeit + mute). */}
        <Route path="/play/keepie-uppies" element={<KeepieUppies />} />
        <Route path="/play/basketball" element={<Basketball />} />
        <Route path="/play/free-kicks" element={<FreeKicks />} />
        <Route path="/play/solshot" element={<SolShotRedirect />} />

        {/* Everything else gets wrapped in the v2 brand chrome
            (Masthead, FloorStats, Ticker, MobileTabBar). */}
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/leaderboards" element={<Leaderboards />} />
          <Route path="/leaderboards/:game" element={<Leaderboards />} />
          <Route path="/profile/:callsign" element={<Profile />} />
          <Route path="/me" element={<Me />} />
          <Route path="/wager" element={<Wager />} />
        </Route>
      </Route>

      <Route path="/about" element={<About />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
