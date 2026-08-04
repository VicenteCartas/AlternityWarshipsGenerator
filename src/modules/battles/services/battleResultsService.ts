import type {
  BattleRules,
  BattleState,
  BattleUnitCategory,
  Side,
  SideId,
  Theatre,
  UnitStack,
  VictoryCondition,
} from '../types/battle';
import {
  computeForceStrength,
  computeStartingForceStrength,
  pendingCasualtiesForTheatre,
  shouldWithdraw,
} from './battleResolutionService';
import {
  evaluateVictoryCondition,
  type VictoryConditionEvaluation,
} from './battleOutcomeService';

const EPSILON = 1e-8;

export type ObjectiveResultStatus = 'achieved' | 'failed' | 'satisfied' | 'inProgress' | 'unavailable';
export type TheatreResultStatus = 'concluded' | 'forcesEliminated' | 'unresolved';

export interface StackResultSummary {
  stackId: string;
  name: string;
  category: BattleUnitCategory;
  priorityAsset: boolean;
  initialQuantity: number;
  survivingQuantity: number | null;
  damagedQuantity: number | null;
  destroyedQuantity: number | null;
  startingStrength: number;
  remainingStrength: number;
}

export interface CategoryResultSummary {
  category: BattleUnitCategory;
  initialQuantity: number;
  survivingQuantity: number | null;
  damagedQuantity: number | null;
  destroyedQuantity: number | null;
  startingStrength: number;
  remainingStrength: number;
}

export interface SideTheatreResult {
  sideId: SideId;
  startingForceStrength: number;
  remainingForceStrength: number;
  lossFraction: number;
  shouldWithdraw: boolean;
  stacks: StackResultSummary[];
  categories: CategoryResultSummary[];
}

export interface ObjectiveResultSummary {
  condition: VictoryCondition;
  evaluation: VictoryConditionEvaluation;
  status: ObjectiveResultStatus;
}

export interface TheatreResultSummary {
  theatre: Theatre;
  status: TheatreResultStatus;
  winnerSideId: SideId | null;
  sideA: SideTheatreResult;
  sideB: SideTheatreResult;
  objectives: ObjectiveResultSummary[];
  casualtiesPending: boolean;
}

export interface BattleResultSummary {
  theatres: TheatreResultSummary[];
  objectiveResults: ObjectiveResultSummary[];
  winnerSideId: SideId | null;
  winsBySide: Record<SideId, number>;
  unresolvedTheatres: number;
  neutralConclusions: number;
  overallLabel: string;
  casualtiesAllocated: boolean;
  casualtiesPending: boolean;
}

function clampCurrentStrength(stack: UnitStack): number {
  const starting = Math.max(0, stack.combatStrengthPerUnit * stack.initialQuantity);
  return Math.max(0, Math.min(starting, stack.currentStrength));
}

function stackSummary(stack: UnitStack, casualtiesAllocated: boolean): StackResultSummary {
  const remainingStrength = clampCurrentStrength(stack);
  const startingStrength = Math.max(0, stack.combatStrengthPerUnit * stack.initialQuantity);
  if (!casualtiesAllocated || stack.combatStrengthPerUnit <= 0) {
    return {
      stackId: stack.id,
      name: stack.name,
      category: stack.category,
      priorityAsset: !!stack.priorityAsset,
      initialQuantity: stack.initialQuantity,
      survivingQuantity: null,
      damagedQuantity: null,
      destroyedQuantity: null,
      startingStrength,
      remainingStrength,
    };
  }

  const survivingQuantity = remainingStrength <= EPSILON
    ? 0
    : Math.min(
        stack.initialQuantity,
        Math.ceil(remainingStrength / stack.combatStrengthPerUnit - EPSILON),
      );
  const destroyedQuantity = Math.max(0, stack.initialQuantity - survivingQuantity);
  const fullUnitEquivalent = remainingStrength / stack.combatStrengthPerUnit;
  const damagedQuantity = remainingStrength > EPSILON
    && Math.abs(fullUnitEquivalent - Math.round(fullUnitEquivalent)) > EPSILON
    ? 1
    : 0;

  return {
    stackId: stack.id,
    name: stack.name,
    category: stack.category,
    priorityAsset: !!stack.priorityAsset,
    initialQuantity: stack.initialQuantity,
    survivingQuantity,
    damagedQuantity,
    destroyedQuantity,
    startingStrength,
    remainingStrength,
  };
}

function categorySummaries(stacks: StackResultSummary[]): CategoryResultSummary[] {
  const grouped = new Map<BattleUnitCategory, CategoryResultSummary>();
  for (const stack of stacks) {
    const current = grouped.get(stack.category) ?? {
      category: stack.category,
      initialQuantity: 0,
      survivingQuantity: stack.survivingQuantity === null ? null : 0,
      damagedQuantity: stack.damagedQuantity === null ? null : 0,
      destroyedQuantity: stack.destroyedQuantity === null ? null : 0,
      startingStrength: 0,
      remainingStrength: 0,
    };
    current.initialQuantity += stack.initialQuantity;
    current.startingStrength += stack.startingStrength;
    current.remainingStrength += stack.remainingStrength;
    if (current.survivingQuantity !== null && stack.survivingQuantity !== null) {
      current.survivingQuantity += stack.survivingQuantity;
    }
    if (current.damagedQuantity !== null && stack.damagedQuantity !== null) {
      current.damagedQuantity += stack.damagedQuantity;
    }
    if (current.destroyedQuantity !== null && stack.destroyedQuantity !== null) {
      current.destroyedQuantity += stack.destroyedQuantity;
    }
    grouped.set(stack.category, current);
  }
  return [...grouped.values()];
}

function sideTheatreResult(
  side: Side,
  theatre: Theatre,
  rules: BattleRules,
  casualtiesAllocated: boolean,
): SideTheatreResult {
  const startingForceStrength = computeStartingForceStrength(side, theatre, rules);
  const remainingForceStrength = computeForceStrength(side, theatre, rules);
  const stacks = side.stacks
    .filter((stack) => stack.theatreId === theatre.id)
    .map((stack) => stackSummary(stack, casualtiesAllocated));
  return {
    sideId: side.id,
    startingForceStrength,
    remainingForceStrength,
    lossFraction: startingForceStrength > 0
      ? Math.max(0, Math.min(1, 1 - remainingForceStrength / startingForceStrength))
      : 0,
    shouldWithdraw: shouldWithdraw(side, theatre, rules),
    stacks,
    categories: categorySummaries(stacks),
  };
}

function objectiveScopeConcluded(state: BattleState, condition: VictoryCondition): boolean {
  const theatres = condition.theatreId === null
    ? state.theatres
    : state.theatres.filter((theatre) => theatre.id === condition.theatreId);
  return theatres.length > 0 && theatres.every((theatre) => !!theatre.conclusion);
}

function objectiveSummary(
  state: BattleState,
  condition: VictoryCondition,
  rules: BattleRules,
): ObjectiveResultSummary {
  const evaluation = evaluateVictoryCondition(state, condition, rules);
  let status: ObjectiveResultStatus;
  if (evaluation.achieved) status = 'achieved';
  else if (objectiveScopeConcluded(state, condition)) status = 'failed';
  else if (evaluation.currentlySatisfied) status = 'satisfied';
  else if (evaluation.available) status = 'inProgress';
  else status = 'unavailable';
  return { condition, evaluation, status };
}

function theatreWinner(
  theatre: Theatre,
  sideAResult: SideTheatreResult,
  sideBResult: SideTheatreResult,
): { status: TheatreResultStatus; winnerSideId: SideId | null } {
  if (theatre.conclusion) {
    return { status: 'concluded', winnerSideId: theatre.conclusion.winnerSideId };
  }
  const aEliminated = sideAResult.startingForceStrength > 0 && sideAResult.remainingForceStrength <= EPSILON;
  const bEliminated = sideBResult.startingForceStrength > 0 && sideBResult.remainingForceStrength <= EPSILON;
  if (aEliminated || bEliminated) {
    return {
      status: 'forcesEliminated',
      winnerSideId: aEliminated === bEliminated ? null : aEliminated ? 'B' : 'A',
    };
  }
  return { status: 'unresolved', winnerSideId: null };
}

export function summarizeBattleResults(state: BattleState, rules: BattleRules): BattleResultSummary {
  const casualtiesAllocated = state.casualtyMode === 'tracked';
  const allObjectiveResults = (state.victoryConditions || [])
    .map((condition) => objectiveSummary(state, condition, rules));
  const theatres = state.theatres.map((theatre): TheatreResultSummary => {
    const sideAResult = sideTheatreResult(state.sideA, theatre, rules, casualtiesAllocated);
    const sideBResult = sideTheatreResult(state.sideB, theatre, rules, casualtiesAllocated);
    const outcome = theatreWinner(theatre, sideAResult, sideBResult);
    return {
      theatre,
      ...outcome,
      sideA: sideAResult,
      sideB: sideBResult,
      objectives: allObjectiveResults.filter((result) => (
        result.condition.theatreId === null || result.condition.theatreId === theatre.id
      )),
      casualtiesPending: !!pendingCasualtiesForTheatre(state, theatre.id),
    };
  });

  const winsBySide: Record<SideId, number> = { A: 0, B: 0 };
  let unresolvedTheatres = 0;
  let neutralConclusions = 0;
  for (const result of theatres) {
    if (result.status === 'unresolved') unresolvedTheatres += 1;
    else if (result.winnerSideId) winsBySide[result.winnerSideId] += 1;
    else neutralConclusions += 1;
  }

  const winnerSideId = winsBySide.A === winsBySide.B
    ? null
    : winsBySide.A > winsBySide.B ? 'A' : 'B';
  const leaderName = winnerSideId === 'A' ? state.sideA.name : winnerSideId === 'B' ? state.sideB.name : null;
  let overallLabel: string;
  if (winsBySide.A === 0 && winsBySide.B === 0 && unresolvedTheatres > 0) {
    overallLabel = `Overall result unresolved: ${unresolvedTheatres} theatre(s) remain open.`;
  } else if (winnerSideId && unresolvedTheatres === 0) {
    overallLabel = `${leaderName} prevails overall, winning ${winsBySide[winnerSideId]} theatre(s).`;
  } else if (winnerSideId) {
    overallLabel = `${leaderName} leads ${winsBySide.A}-${winsBySide.B}; ${unresolvedTheatres} theatre(s) remain unresolved.`;
  } else {
    overallLabel = `Overall result tied ${winsBySide.A}-${winsBySide.B}; ${unresolvedTheatres} theatre(s) remain unresolved.`;
  }

  return {
    theatres,
    objectiveResults: allObjectiveResults,
    winnerSideId,
    winsBySide,
    unresolvedTheatres,
    neutralConclusions,
    overallLabel,
    casualtiesAllocated,
    casualtiesPending: (state.pendingCasualties || []).length > 0,
  };
}
