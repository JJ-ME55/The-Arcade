/**
 * Per-game data for the Game Detail page (/play/:slug).
 * Placeholder for v1 per JJ. Real per-game how-to-play / payout
 * tables / user history wire in once endpoints exist.
 *
 * Lifted from ed-game.jsx rules + payouts.
 */

import type { ArcadeGame } from './games-fixtures';

export interface HowToStep {
  n: string;
  title: string;
  desc: string;
}

// V1-honest copy. Was full of wagering references ("2.4× your wager",
// "Beat the daily median to win 2.0× your wager", "Cash out anytime
// — or risk it for the 3.0× tier") — none of which apply because
// wagering is V2. Rewritten for the free-play-only state: tells the
// user what to do, what the scoring rule is, how to climb the board.
export const HOW_TO_PLAY: Record<ArcadeGame['slug'], HowToStep[]> = {
  solshot: [
    { n: '01', title: 'Aim',      desc: 'Drag to set angle. Watch the wind indicator at the top.' },
    { n: '02', title: 'Power',    desc: 'Tap or hold to charge. Release at the right moment.' },
    { n: '03', title: 'Climb',    desc: 'Win matches, earn gold, prestige up. K/D ratio ranks you on the board.' },
  ],
  basketball: [
    { n: '01', title: 'Tap to shoot', desc: '30 seconds on the clock. Sink as many as you can.' },
    { n: '02', title: 'Hot zone',     desc: 'Three made in a row enters Hot Zone — bonus points stack.' },
    { n: '03', title: 'Climb',        desc: 'Beat your best, climb the all-time board. Sign in to save scores.' },
  ],
  'free-kicks': [
    { n: '01', title: 'Curl',  desc: 'Swipe to set the curve. The wall reacts.' },
    { n: '02', title: 'Aim',   desc: 'Top corners reward highest. Targets and bonus boards add multipliers.' },
    { n: '03', title: 'Climb', desc: 'Lives drop when you miss; finish runs with the highest total.' },
  ],
  'keepie-uppies': [
    { n: '01', title: 'Tap',   desc: 'One tap per touch. Rhythm matters — late taps cost height.' },
    { n: '02', title: 'Combo', desc: 'Each 10 keep-ups stacks the streak. Drop the ball = run over.' },
    { n: '03', title: 'Climb', desc: 'Sign in to track your best. Beat @saudweb3 at 208 if you can.' },
  ],
  pool: [
    { n: '01', title: 'Aim',           desc: 'Drag the cue. Sink your colour (stripes or solids), then the 8-ball.' },
    { n: '02', title: 'Ready & shoot', desc: 'Think as long as you want, then tap READY — 45 seconds to commit.' },
    { n: '03', title: 'Async turns',   desc: '12 hours to take your turn. Play across days. ELO climbs with every win.' },
  ],
  'critter-kart': [
    { n: '01', title: 'Race',     desc: '6 karts on the grid. Pick a critter, find the line. Touch + tilt or arrow keys.' },
    { n: '02', title: 'Position', desc: 'Higher finish = more points. Grand Prix style: 1st pays 15, 2nd pays 12, down to 4.' },
    { n: '03', title: 'Climb',    desc: 'Points stack across races. Best lap tracked separately for the speedrun board.' },
  ],
  shootout: [
    { n: '01', title: 'Fight', desc: 'WASD + mouse-look. Red vs Blue rounds — first team to 3 takes the match.' },
    { n: '02', title: 'Buy',   desc: 'Kills and round wins pay cash. Spend it between rounds: rifles, SMGs, armour, helmet.' },
    { n: '03', title: 'Climb', desc: 'Wins rank you on the board. Quick Play 1v1, custom 2v2 lobbies, or solo vs bots.' },
  ],
};

// Removed 2026-06-10: PAYOUT_TABLE / RECENT_PLAYS / RECENT_PLAYS_NET /
// WAGER_CHIPS were fictional wager data (a "2.4× Bullseye" house-edge
// payout table + fake recent plays with SOL amounts). Their only
// consumers were the dead PayoutTable / YourHistory / WagerSlip
// components in GameDetail, now deleted. Real payout structure ships
// with the wager economy, sourced from the server.
