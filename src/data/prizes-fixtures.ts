/**
 * Full prize-counter catalog per design handoff ed-prize-counter.jsx.
 * Placeholder for v1 — no backend.
 */

import type { PrizeKind } from '@/components/brand/PrizeIcon';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'legend';

export interface ShopPrize {
  kind: PrizeKind;
  name: string;
  price: number;
  rarity: Rarity;
  stock?: number;
  glow?: boolean;
  soon?: boolean;
}

export interface ShopShelf {
  cabinet: string;
  soon?: boolean;
  items: ShopPrize[];
}

export const SHOP: ShopShelf[] = [
  {
    cabinet: 'SolShot',
    items: [
      { kind: 'hull', name: 'Tank Hull · Bramble',       price: 480,  rarity: 'common',   stock: 12 },
      { kind: 'hull', name: 'Tank Hull · Sandstorm',     price: 720,  rarity: 'common',   stock: 8 },
      { kind: 'hull', name: 'Tank Hull · Carbon',        price: 1200, rarity: 'uncommon', stock: 4 },
      { kind: 'hull', name: 'Tank Hull · Crimson Ridge', price: 4800, rarity: 'legend',   stock: 1, glow: true },
    ],
  },
  {
    cabinet: 'Basketball',
    items: [
      { kind: 'ball', name: 'Basketball · Sunset',      price: 960,  rarity: 'uncommon', stock: 6 },
      { kind: 'ball', name: 'Basketball · Streetlight', price: 1280, rarity: 'uncommon', stock: 5 },
      { kind: 'ball', name: 'Basketball · Holographic', price: 2400, rarity: 'rare',     stock: 2 },
      { kind: 'ball', name: 'Basketball · Pure Gold',   price: 6400, rarity: 'legend',   stock: 1, glow: true },
    ],
  },
  {
    cabinet: 'Free Kicks · Coming Soon',
    soon: true,
    items: [
      { kind: 'cue', name: 'Boot · Volt',        price: 600,  rarity: 'common', soon: true },
      { kind: 'cue', name: 'Boot · Mahogany',    price: 1800, rarity: 'rare',   soon: true },
      { kind: 'cue', name: 'Boot · Lightning',   price: 3200, rarity: 'rare',   soon: true },
      { kind: 'cue', name: 'Boot · Solana Mint', price: 5400, rarity: 'legend', soon: true },
    ],
  },
];

export const RARITY_COLOR: Record<Rarity, string> = {
  common:   'var(--win)',
  uncommon: 'var(--blue)',
  rare:     'var(--brass-deep)',
  legend:   'var(--lose)',
};

export interface PrizeFilterTab {
  id: string;
  label: string;
  count: number;
  soon?: boolean;
}

export const PRIZE_FILTER_TABS: PrizeFilterTab[] = [
  { id: 'all',   label: 'All',         count: 12 },
  { id: 'hulls', label: 'Tank Hulls',  count: 4 },
  { id: 'balls', label: 'Basketballs', count: 4 },
  { id: 'boots', label: 'Boots',       count: 4, soon: true },
  { id: 'cues',  label: 'Cues',        count: 0, soon: true },
  { id: 'avs',   label: 'Avatars',     count: 0, soon: true },
];

export interface RarityChip {
  label: string;
  color: string;
}

export const RARITY_CHIPS: RarityChip[] = [
  { label: 'All',      color: 'var(--ink)' },
  { label: 'Common',   color: 'var(--win)' },
  { label: 'Uncommon', color: 'var(--blue)' },
  { label: 'Rare',     color: 'var(--brass-deep)' },
  { label: 'Legend',   color: 'var(--lose)' },
];

// Guest defaults — honest "no Tickets yet, economy V3" reading.
// When the V3 Ticket emission ledger lands, these wire to real
// per-user balances via the server. Until then the voucher reads
// "— · V3 economy" so we don't show fake balances.
export const VOUCHER = {
  current: '—',
  weeklyDelta: 'V3',
  lifetimeEarned: '—',
  lifetimeSpent: '—',
};
