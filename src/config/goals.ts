/**
 * Goal ladder — the "next carrot". Always exactly one next goal showing on the menu;
 * completed goals auto-claim at run end with core + ticket rewards. Pure data.
 */
export interface GoalDef {
  id: string;
  desc: string;
  metric: 'bestDepth' | 'bestScore' | 'totalCash' | 'runsPlayed' | 'collection';
  target: number;
  cores: number;
  tickets: number;
}

export const GOALS: GoalDef[] = [
  { id: 'd100', desc: 'Reach 100 m', metric: 'bestDepth', target: 100, cores: 2, tickets: 5 },
  { id: 'r5', desc: 'Finish 5 runs', metric: 'runsPlayed', target: 5, cores: 2, tickets: 5 },
  { id: 'd250', desc: 'Reach 250 m', metric: 'bestDepth', target: 250, cores: 3, tickets: 8 },
  { id: 'c25k', desc: 'Bank $25,000 lifetime', metric: 'totalCash', target: 25_000, cores: 2, tickets: 5 },
  { id: 'd500', desc: 'Reach 500 m', metric: 'bestDepth', target: 500, cores: 4, tickets: 10 },
  { id: 's100k', desc: 'Score 100,000 in one run', metric: 'bestScore', target: 100_000, cores: 3, tickets: 8 },
  { id: 'col10', desc: 'Discover 10 museum entries', metric: 'collection', target: 10, cores: 3, tickets: 8 },
  { id: 'd800', desc: 'Reach 800 m', metric: 'bestDepth', target: 800, cores: 5, tickets: 12 },
  { id: 'c250k', desc: 'Bank $250,000 lifetime', metric: 'totalCash', target: 250_000, cores: 4, tickets: 10 },
  { id: 'r20', desc: 'Finish 20 runs', metric: 'runsPlayed', target: 20, cores: 4, tickets: 10 },
  { id: 'd1200', desc: 'Reach 1,200 m', metric: 'bestDepth', target: 1200, cores: 6, tickets: 15 },
  { id: 's500k', desc: 'Score 500,000 in one run', metric: 'bestScore', target: 500_000, cores: 6, tickets: 15 },
  { id: 'col20', desc: 'Discover 20 museum entries', metric: 'collection', target: 20, cores: 6, tickets: 15 },
  { id: 'd1600', desc: 'Reach 1,600 m', metric: 'bestDepth', target: 1600, cores: 8, tickets: 20 },
  { id: 'c2m', desc: 'Bank $2,000,000 lifetime', metric: 'totalCash', target: 2_000_000, cores: 8, tickets: 20 },
  { id: 'd2150', desc: 'Reach the Core', metric: 'bestDepth', target: 2150, cores: 12, tickets: 30 },
];
