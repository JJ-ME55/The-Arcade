// @ts-nocheck
// Front-end UI data model (racers are color-first identities; mascots come later).

export type Screen =
  | 'title' | 'menu' | 'select' | 'track' | 'race' | 'results' | 'howto'
  // Multiplayer routes — quick-match queue, the custom-lobby browser/creator,
  // and the shared ready-up lobby reached from either path.
  | 'mp-menu' | 'mp-matching' | 'mp-lobby' | 'mp-custom-browse' | 'mp-custom-create';
export interface ResultRow {
  pos: number;
  racerId: string;
  time: string;
  best: string;
  delta: string | null;
}
export const ACCENT = '#ffb22e';
export const ACCENT_DEEP = '#f59017';

export interface Racer {
  id: string;
  name: string;
  color: string;
  colorDeep: string;
  classId: 'all' | 'heavy' | 'light' | 'tank';
  className: string;
  blurb: string;
  stats: { speed: number; accel: number; weight: number; handling: number };
  /** Optional GLB shown as the character-select 3D portrait. */
  characterModel?: string;
}

export interface Item {
  id: string;
  name: string;
  color: string;
  type: string;
  badge: 'atk' | 'def' | null;
  desc: string;
}

export interface Track {
  id: string;
  name: string;
  status: 'open' | 'soon';
  cc: string;
  tag: string;
  laps: number;
  desc: string;
  sky: [string, string];
  accent: string;
}

export const RACERS: Racer[] = [
  { id: 'rusty', name: 'Rusty', color: '#c92f23', colorDeep: '#9b1d14', classId: 'all', className: 'All-Rounder', blurb: 'Hot-headed and cocky. No glaring weakness — wins on confidence.', stats: { speed: 3, accel: 3, weight: 3, handling: 3 }, characterModel: '/critter-kart/models/characters/New Fox standing.glb' },
  { id: 'shelly', name: 'Shelly', color: '#2f9e44', colorDeep: '#1e7330', classId: 'heavy', className: 'Cruiser', blurb: 'Calm and unbothered. Sky-high top speed, takes a while to wind up.', stats: { speed: 5, accel: 1, weight: 4, handling: 2 }, characterModel: '/critter-kart/models/characters/Turtle standing.glb' },
  { id: 'pip', name: 'Pip', color: '#1c9bd6', colorDeep: '#13719e', classId: 'light', className: 'Sprinter', blurb: 'Hyper and chirpy. Darts off the line and corners on a dime.', stats: { speed: 2, accel: 5, weight: 1, handling: 5 }, characterModel: '/critter-kart/models/characters/Sparrow standing.glb' },
  { id: 'bruno', name: 'Bruno', color: '#9c6b3f', colorDeep: '#6f4a28', classId: 'tank', className: 'Bruiser', blurb: 'Gentle giant — until contact. Bumps rivals clean off the racing line.', stats: { speed: 3, accel: 2, weight: 5, handling: 2 }, characterModel: '/critter-kart/models/characters/Bear standing.glb' },
  // Founders — currently selectable; will be unlockables later. Bots never pick them.
  { id: 'jj', name: 'JJ', color: '#e8a82e', colorDeep: '#a87418', classId: 'all', className: 'Co-Founder', blurb: 'Builds fast, races faster. Drift through the deal.', stats: { speed: 4, accel: 3, weight: 3, handling: 4 }, characterModel: '/critter-kart/models/characters/Founder JJ standing.glb' },
  { id: 'fish', name: 'Fish', color: '#8e4cd9', colorDeep: '#5b2e94', classId: 'light', className: 'Co-Founder', blurb: 'Hooks every apex like an apex predator. Hates losing.', stats: { speed: 3, accel: 4, weight: 2, handling: 5 }, characterModel: '/critter-kart/models/characters/Founder Fish standing.glb' },
];

export const ITEMS: Item[] = [
  { id: 'berry', name: 'Turbo Berry', color: '#ff4136', type: 'boost', badge: null, desc: 'Instant speed boost.' },
  { id: 'acorn', name: 'Acorn Cannon', color: '#ff851b', type: 'attack', badge: 'atk', desc: 'Fires an acorn forward — spins out whoever it hits.' },
  { id: 'bee', name: 'Homing Bee', color: '#ffdc00', type: 'attack', badge: 'atk', desc: 'Chases down the racer just ahead of you.' },
  { id: 'mud', name: 'Mud Puddle', color: '#8a5a2b', type: 'trap', badge: 'atk', desc: 'Dropped behind you. Drive through it and spin out.' },
  { id: 'leaf', name: 'Leaf Shield', color: '#2ecc40', type: 'defense', badge: 'def', desc: 'Orbits your kart and blocks one incoming hit.' },
  { id: 'storm', name: 'Storm Cloud', color: '#0074d9', type: 'attack', badge: 'atk', desc: 'Rains on everyone ahead and slows them down.' },
];

export const TRACKS: Track[] = [
  { id: 'meadow', name: 'Sunny Meadow', status: 'open', cc: '50cc', tag: 'Beginner', laps: 3, desc: 'A grassy circuit at golden hour. Wide, friendly, flower-lined.', sky: ['#9cc6ee', '#bfe0a8'], accent: '#5fae46' },
  { id: 'cove', name: 'Coconut Cove', status: 'soon', cc: '100cc', tag: 'Coming soon', laps: 3, desc: 'Sandy beach and wooden boardwalk. Palms, crabs, a long pier.', sky: ['#7fd0e8', '#f2dca0'], accent: '#e8b65a' },
  { id: 'hollow', name: 'Mushroom Hollow', status: 'soon', cc: '100cc', tag: 'Coming soon', laps: 3, desc: 'A dark forest lit by glowing mushrooms. Fog and a hollow-log tunnel.', sky: ['#2a2350', '#5b4a8a'], accent: '#8a6fd0' },
  { id: 'peak', name: 'Frosty Peak', status: 'soon', cc: '150cc', tag: 'Coming soon', laps: 3, desc: 'A snowy mountain into an ice cavern. Slippery, with falling icicles.', sky: ['#bfe4f2', '#e8f4fa'], accent: '#7fc4e0' },
];

export const STAT_LABELS: Record<string, string> = { speed: 'Speed', accel: 'Accel', weight: 'Weight', handling: 'Handling' };

/** Map our in-game item ids to the UI's item ids (same order as logic/items.ts ITEM). */
export const GAME_ITEM_IDS = ['berry', 'acorn', 'bee', 'mud', 'leaf', 'storm'];
