/**
 * Eerie radio transmissions that surface as you descend — the underused atmosphere from
 * the original Motherload, amplified. Triggered when your deepest point first crosses each
 * threshold. Data-driven: add a line and it appears at that depth.
 */
export interface Transmission {
  depth: number;
  from: string;
  text: string;
  /** tint for the comms panel accent. */
  color: number;
}

export const TRANSMISSIONS: Transmission[] = [
  { depth: 60, from: 'OUTPOST', color: 0x6bd66b, text: 'Good dig, miner. Fill that cargo and keep the company happy.' },
  { depth: 200, from: 'OUTPOST', color: 0x6bd66b, text: 'Readings are clean down to the rock line. Proceed as contracted.' },
  { depth: 380, from: 'POD 3422', color: 0x7df2ff, text: '…anyone receiving? I’m out of fuel at four hundred. Send a tow. Please.' },
  { depth: 560, from: 'OUTPOST', color: 0xffb347, text: 'Disregard unregistered signals on the deep band. They are… echoes.' },
  { depth: 760, from: 'UNKNOWN', color: 0x7df2ff, text: 'they don’t tell you the deep ones never came back up. they just stop logging.' },
  { depth: 1000, from: 'POD 3422', color: 0xff6b8a, text: 'if you read this, turn around. it wants the motherlode. it has always wanted it.' },
  { depth: 1300, from: 'UNKNOWN', color: 0xff7a2a, text: 'the heat is not the planet. the heat is something breathing.' },
  { depth: 1650, from: 'UNKNOWN', color: 0xb6f0ff, text: 'the cold down here doesn’t kill you. it keeps you. for later.' },
  { depth: 1950, from: 'OUTPOST', color: 0xff6b8a, text: '[CORRUPTED] …do NOT proceed below two thousand. recall the pod. RECALL—' },
  { depth: 2150, from: 'THE CORE', color: 0xffe14d, text: 'You found it. Now you understand why no one returns from here rich AND alive.' },
  { depth: 2600, from: '???', color: 0xffe14d, text: 'deeper. always deeper. there is no bottom — only want.' },
  { depth: 3200, from: '???', color: 0xff4d4d, text: 'you are not mining anymore. you are being swallowed. and you are smiling.' },
];

export function nextTransmission(depth: number, idx: number): { t: Transmission; idx: number } | null {
  if (idx >= TRANSMISSIONS.length) return null;
  const t = TRANSMISSIONS[idx];
  if (depth >= t.depth) return { t, idx: idx + 1 };
  return null;
}
