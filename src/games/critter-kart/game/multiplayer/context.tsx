// @ts-nocheck
import { createContext, useContext, type ReactNode } from 'react';
import type { Member } from '../../net/protocol';
import type { NetClient } from '../../net/client';

/**
 * Multiplayer race context. The race screen reads this to decide whether it's
 * running a single-player race (no provider → null) or a network race (provider
 * present → all the joined humans + slot assignments + the server-driven
 * `startAtMs` that synchronises the 3-2-1 countdown across clients).
 *
 * GameCanvas hooks into this in a later pass:
 *   - `selfSlot` decides which states[i] consumes the keyboard
 *   - `startAtMs` replaces `elapsed = -COUNTDOWN` so beeps land in unison
 *   - `members` defines who's a human (interpolated remote kart) vs a bot slot
 *   - `net` is used to emit race:state @ 20Hz and to subscribe to incoming events
 */
export interface MultiplayerRace {
  roomId: string;
  selfSlot: number;          // which slot the local kart occupies (0..3)
  startAtMs: number;         // wall-clock the server picked for race start
  members: Member[];         // all human participants; bots fill the rest
  net: NetClient;
}

const Ctx = createContext<MultiplayerRace | null>(null);

export function MultiplayerProvider({ value, children }: { value: MultiplayerRace; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Returns the active multiplayer race info, or null in single-player. */
export function useMultiplayerRace(): MultiplayerRace | null {
  return useContext(Ctx);
}
