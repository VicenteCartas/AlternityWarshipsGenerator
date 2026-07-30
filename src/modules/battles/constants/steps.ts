import type { BattleStepDef, BattleStepId } from '../types/battle';

/**
 * All wizard steps for the battle resolution flow.
 * Steps are identified by id; never by numeric index.
 */
export const ALL_BATTLE_STEPS: BattleStepDef[] = [
  { id: 'scenario', label: 'Scenario', required: true },
  { id: 'forcesA', label: 'Side A Forces', required: true },
  { id: 'forcesB', label: 'Side B Forces', required: true },
  { id: 'resolve', label: 'Resolve', required: true },
];

/** Full display names for each battle step. */
export const BATTLE_STEP_FULL_NAMES: Record<BattleStepId, string> = {
  scenario: 'Scenario',
  forcesA: 'Side A Forces',
  forcesB: 'Side B Forces',
  resolve: 'Resolve Battle',
};
