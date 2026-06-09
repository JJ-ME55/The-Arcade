/** Suspend/resume an in-progress run (critical for mobile — players get interrupted). */
import { kvGet, kvSet, kvDel } from '../core/save';
import type { RunState } from '../core/types';

export interface RunSave {
  v: number;
  run: RunState;
  podX: number;
  podY: number;
  seasonId: string | null;
  savedAt: number;
}

const KEY = 'run';
const VERSION = 1;

export async function saveRun(run: RunState, podX: number, podY: number, seasonId: string | null): Promise<void> {
  const blob: RunSave = { v: VERSION, run, podX, podY, seasonId, savedAt: Date.now() };
  await kvSet(KEY, blob);
}

export async function loadRun(): Promise<RunSave | null> {
  const blob = await kvGet<RunSave>(KEY);
  if (!blob || blob.v !== VERSION) return null;
  return blob;
}

export async function clearRun(): Promise<void> {
  await kvDel(KEY);
}
