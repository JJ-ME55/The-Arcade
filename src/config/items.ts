/** Consumables / the deep-dig kit. "Stuck = dead" becomes "stuck = spend a resource". */
import type { ItemId } from '../core/types';

export interface ItemDef {
  id: ItemId;
  name: string;
  blurb: string;
  cost: number;
  color: number;
  maxStack: number;
  hotkey: string;
  /** explosion radius in tiles (3 => 3x3). */
  blastRadius?: number;
  /** hull restored. */
  heal?: number;
  /** fuel restored. */
  fuel?: number;
  /** vertical blink distance in tiles (teleporter). */
  blinkUp?: number;
  /** teleport straight to surface. */
  toSurface?: boolean;
}

export const ITEMS: ItemDef[] = [
  { id: 'c4', name: 'Plastic Explosive', blurb: 'Blast a 5×5 — clears tough clusters.', cost: 4800, color: 0xffcf3a, maxStack: 99, hotkey: '1', blastRadius: 2 },
  { id: 'teleporter', name: 'Teleporter', blurb: 'Blink straight up — escape a cave-in.', cost: 2000, color: 0x7df2ff, maxStack: 99, hotkey: '2', blinkUp: 6 },
  { id: 'transmitter', name: 'Matter Transmitter', blurb: 'Instantly return to the surface.', cost: 9000, color: 0xc792ff, maxStack: 99, hotkey: '3', toSurface: true },
  { id: 'nanobots', name: 'Repair Nanobots', blurb: 'Restore 40 hull on the spot.', cost: 3000, color: 0x6bff9d, maxStack: 99, hotkey: '4', heal: 40 },
  { id: 'reserveFuel', name: 'Reserve Fuel', blurb: 'Top up 60 fuel anywhere.', cost: 700, color: 0xffe14d, maxStack: 99, hotkey: '5', fuel: 60 },
];

export const ITEM_BY_ID: Record<ItemId, ItemDef> = Object.fromEntries(
  ITEMS.map((i) => [i.id, i]),
) as Record<ItemId, ItemDef>;
