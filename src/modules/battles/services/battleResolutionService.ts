/**
 * Battle resolution service — abstract space combat from "The Externals" pp. 64-65.
 *
 * Pure functions; no React or IO. All round application is functional and returns
 * a new state, leaving the caller responsible for hooking it up to history/undo.
 */

import type {
  BattleState,
  CheckResult,
  RoundResult,
  Side,
  SideId,
  UnitStack,
} from '../types/battle';

/** Total combat strength of a side, summed over its stacks. */
export function computeForceStrength(side: Side): number {
  return side.stacks.reduce((sum, s) => sum + Math.max(0, s.currentStrength), 0);
}

/** Determine attacker/defender by force strength. Ties default A as attacker. */
export function determineRoles(
  fsA: number,
  fsB: number,
): { attacker: SideId; defender: SideId } {
  if (fsB > fsA) return { attacker: 'B', defender: 'A' };
  return { attacker: 'A', defender: 'B' };
}

/** Tactical Advantage step modifier from the rulebook (page 65). */
export function tacticalAdvantageStep(defenderFS: number, attackerFS: number): number {
  if (attackerFS <= 0) return 1;
  const ratio = defenderFS / attackerFS;
  if (ratio < 0.2) return 5;
  if (ratio < 0.4) return 4;
  if (ratio < 0.6) return 3;
  if (ratio < 0.8) return 2;
  return 1;
}

/** Loss percentages for attacker and defender by check result. */
export function lossesForResult(result: CheckResult): {
  attackerLossPct: number;
  defenderLossPct: number;
} {
  switch (result) {
    case 'criticalFailure': return { attackerLossPct: 0.25, defenderLossPct: 0.05 };
    case 'failure':         return { attackerLossPct: 0.20, defenderLossPct: 0.10 };
    case 'ordinary':        return { attackerLossPct: 0.15, defenderLossPct: 0.15 };
    case 'good':            return { attackerLossPct: 0.10, defenderLossPct: 0.20 };
    case 'amazing':         return { attackerLossPct: 0.05, defenderLossPct: 0.25 };
  }
}

/**
 * Distribute a total CS-loss amount across the stacks of a side proportionally to
 * each stack's current strength. Stacks are reduced toward zero; never negative.
 */
function applyLossesToStacks(stacks: UnitStack[], totalLoss: number): UnitStack[] {
  const totalCS = stacks.reduce((s, st) => s + Math.max(0, st.currentStrength), 0);
  if (totalCS <= 0 || totalLoss <= 0) return stacks;
  const cap = Math.min(totalLoss, totalCS);
  return stacks.map((st) => {
    const share = (Math.max(0, st.currentStrength) / totalCS) * cap;
    const next = Math.max(0, st.currentStrength - share);
    return { ...st, currentStrength: next };
  });
}

/** Resolve a single round given an explicit check result; returns the new state and a RoundResult. */
export function applyRound(state: BattleState, result: CheckResult): {
  state: BattleState;
  round: RoundResult;
} {
  const fsA = computeForceStrength(state.sideA);
  const fsB = computeForceStrength(state.sideB);
  const { attacker, defender } = determineRoles(fsA, fsB);
  const atkSide = attacker === 'A' ? state.sideA : state.sideB;
  const defSide = defender === 'A' ? state.sideA : state.sideB;
  const atkFS = attacker === 'A' ? fsA : fsB;
  const defFS = defender === 'A' ? fsA : fsB;

  const stepModifier = tacticalAdvantageStep(defFS, atkFS);
  const { attackerLossPct, defenderLossPct } = lossesForResult(result);

  const atkLoss = atkFS * attackerLossPct;
  const defLoss = defFS * defenderLossPct;

  const newAtk: Side = { ...atkSide, stacks: applyLossesToStacks(atkSide.stacks, atkLoss) };
  const newDef: Side = { ...defSide, stacks: applyLossesToStacks(defSide.stacks, defLoss) };

  const sideA = attacker === 'A' ? newAtk : newDef;
  const sideB = attacker === 'B' ? newAtk : newDef;

  const round: RoundResult = {
    round: state.rounds.length + 1,
    attackerSide: attacker,
    defenderSide: defender,
    attackerStrengthBefore: atkFS,
    defenderStrengthBefore: defFS,
    ratio: atkFS > 0 ? defFS / atkFS : 0,
    stepModifier,
    checkResult: result,
    attackerLossPct,
    defenderLossPct,
    attackerStrengthAfter: computeForceStrength(newAtk),
    defenderStrengthAfter: computeForceStrength(newDef),
  };

  return {
    state: { ...state, sideA, sideB, rounds: [...state.rounds, round] },
    round,
  };
}

/** Whether a side has crossed its withdraw threshold (lost >= threshold of initial FS). */
export function shouldWithdraw(side: Side): boolean {
  if (side.initialForceStrength <= 0) return false;
  const lost = 1 - computeForceStrength(side) / side.initialForceStrength;
  return lost >= side.withdrawThreshold;
}
