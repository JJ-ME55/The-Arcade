// @ts-nocheck — JSX-heavy route composing the v2 dashboard sections.
import { useState } from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { PORTAL_GAMES } from '@/data/games-fixtures';
import { FeaturedCabinet } from '@/components/dashboard/FeaturedCabinet';
import { TheFloor } from '@/components/dashboard/TheFloor';
import { TopScores } from '@/components/dashboard/TopScores';
import { LiveWagers } from '@/components/dashboard/LiveWagers';
import { PrizeCounterMini } from '@/components/dashboard/PrizeCounterMini';
import { Browse } from '@/components/dashboard/Browse';
import { WhosPlaying } from '@/components/dashboard/WhosPlaying';
import { ComingUp } from '@/components/dashboard/ComingUp';

/**
 * Dashboard — `/play`.
 *
 * Desktop 3-col grid:  180px (left rail) | 1fr (center) | 268px (right)
 * Mobile single-col, sections stacked.
 *
 * Per handoff dashboard §1.
 *
 * Cabinet rotation state is owned here so FeaturedCabinet + TopScores
 * stay synced — Top Scores shows the live leaderboard for whichever
 * game is currently in the hero.
 *
 * Continue Playing section deferred — needs server endpoint
 * (recent games per user). Surface this in a follow-up when the
 * /api/arcade/continue-playing/:uid endpoint lands.
 */
export function Dashboard() {
  const isMobile = useIsMobile();
  const [activeIndex, setActiveIndex] = useState(0);
  const activeGame = PORTAL_GAMES[activeIndex];

  if (isMobile) {
    return (
      <main style={styles.mobileRoot}>
        <FeaturedCabinet activeIndex={activeIndex} setActiveIndex={setActiveIndex} />
        <div style={{ padding: '16px 14px 0' }}>
          <TheFloor />
          <TopScores activeGame={activeGame} />
          <PrizeCounterMini />
          <LiveWagers />
          <Browse />
          <WhosPlaying />
          <ComingUp />
        </div>
      </main>
    );
  }

  return (
    <main style={styles.desktopRoot}>
      <aside style={styles.leftRail}>
        <Browse />
        <WhosPlaying />
      </aside>
      <section style={styles.center}>
        <FeaturedCabinet activeIndex={activeIndex} setActiveIndex={setActiveIndex} />
        <TheFloor />
        <ComingUp />
      </section>
      <aside style={styles.rightColumn}>
        <TopScores activeGame={activeGame} />
        <PrizeCounterMini />
        <LiveWagers />
      </aside>
    </main>
  );
}

const styles = {
  desktopRoot: {
    display: 'grid',
    gridTemplateColumns: '180px 1fr 268px',
    columnGap: 32,
    padding: '28px 36px 36px',
    maxWidth: 1440,
    margin: '0 auto',
    width: '100%',
  },
  leftRail: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  center: {
    display: 'flex',
    flexDirection: 'column',
    gap: 28,
    minWidth: 0,
  },
  rightColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  mobileRoot: {
    paddingBottom: 24,
  },
};

export default Dashboard;
