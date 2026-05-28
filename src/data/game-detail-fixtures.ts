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

export const HOW_TO_PLAY: Record<ArcadeGame['slug'], HowToStep[]> = {
  solshot: [
    { n: '01', title: 'Aim',      desc: 'Drag to set angle. Watch the wind indicator at the top.' },
    { n: '02', title: 'Power',    desc: 'Tap or hold to charge. Release at the right moment.' },
    { n: '03', title: 'Detonate', desc: 'Direct hit pays 2.4× your wager. Splash pays 1.2×.' },
  ],
  basketball: [
    { n: '01', title: 'Tap to shoot', desc: '30 seconds on the clock. Every made bucket is on-chain.' },
    { n: '02', title: 'Hot zone',     desc: 'Three made in a row enters Hot Zone — 1.6× multiplier.' },
    { n: '03', title: 'Payout',       desc: 'Beat the daily median to win 2.0× your wager.' },
  ],
  'free-kicks': [
    { n: '01', title: 'Curl',  desc: 'Swipe to set the curve. The wall reacts.' },
    { n: '02', title: 'Aim',   desc: 'Top corners pay highest. Bottom safe but lower yield.' },
    { n: '03', title: 'Score', desc: 'Score in 5 tries to win 1.8× your wager.' },
  ],
  'keepie-uppies': [
    { n: '01', title: 'Tap',      desc: 'One tap per touch. Rhythm matters.' },
    { n: '02', title: 'Combo',    desc: 'Each 10 kups raises your payout tier.' },
    { n: '03', title: 'Cash out', desc: "Cash out anytime — or risk it for the 3.0× tier." },
  ],
};

export interface PayoutRow {
  tier: string;
  desc: string;
  mult: string;
  odds: string;
}

export const PAYOUT_TABLE: PayoutRow[] = [
  { tier: 'Bullseye', desc: 'Direct hit on target', mult: '2.4×', odds: '~8%' },
  { tier: 'Splash',   desc: 'Splash damage hit',    mult: '1.2×', odds: '~22%' },
  { tier: 'Edge',     desc: 'Glancing blow',        mult: '0.8×', odds: '~14%' },
  { tier: 'Miss',     desc: 'No connection',        mult: '0.0×', odds: '~56%' },
];

export interface RecentPlay {
  ago: string;
  result: 'Bullseye' | 'Splash' | 'Edge' | 'Miss';
  stake: string;
  payout: string;
  score: string;
}

export const RECENT_PLAYS: RecentPlay[] = [
  { ago: '12m', result: 'Bullseye', stake: '0.05', payout: '+0.12',  score: '142,089' },
  { ago: '24m', result: 'Splash',   stake: '0.05', payout: '+0.06',  score: '118,440' },
  { ago: '38m', result: 'Miss',     stake: '0.02', payout: '-0.02',  score: '94,200'  },
  { ago: '52m', result: 'Bullseye', stake: '0.05', payout: '+0.12',  score: '139,118' },
  { ago: '1h',  result: 'Edge',     stake: '0.02', payout: '+0.016', score: '102,805' },
  { ago: '2h',  result: 'Splash',   stake: '0.04', payout: '+0.048', score: '129,720' },
];

export const RECENT_PLAYS_NET = '+0.292 SOL ▲';
export const WAGER_CHIPS = [0.01, 0.05, 0.10, 0.25];
