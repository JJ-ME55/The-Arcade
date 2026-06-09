/** The score model. Every run resolves to one honest integer (Principle #4). */
import type { RunState, ScoreBreakdown } from '../core/types';
import { SCORE } from '../config/gameplay';
import { BIOMES } from '../config/biomes';

const CORE_DEPTH = BIOMES[BIOMES.length - 1].depthStart;

export function computeScore(run: RunState): ScoreBreakdown {
  const cashScore = Math.round(run.cashBanked * SCORE.cashWeight);
  const depthScore = Math.round(run.depthMax * SCORE.depthWeight);
  const fossilScore = run.fossilsFound.length * SCORE.fossilWeight;
  const variety = Object.keys(run.oresCollected).length;
  const collectionScore = variety * SCORE.oreVarietyBonus;
  const bonusScore = run.depthMax >= CORE_DEPTH ? SCORE.coreReachedBonus : 0;

  const total = cashScore + depthScore + fossilScore + collectionScore + bonusScore;
  return { cashScore, depthScore, collectionScore, fossilScore, bonusScore, total };
}
