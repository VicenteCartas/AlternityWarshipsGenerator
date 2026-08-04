import type {
  BattleRules,
  BattleState,
  BattleUnitCategory,
  Side,
  SideId,
  Theatre,
  TheatreConclusion,
  UnitStack,
  VictoryCondition,
  VictoryConditionKind,
} from '../types/battle';
import { shouldWithdraw } from './battleResolutionService';

export interface VictoryConditionEvaluation {
  condition: VictoryCondition;
  available: boolean;
  currentlySatisfied: boolean;
  achieved: boolean;
  progress: number;
  detail: string;
}

export const VICTORY_CONDITION_LABELS: Record<VictoryConditionKind, string> = {
  opponentWithdraws: 'Opponent withdraws',
  allUnitsDestroyed: 'All opposing units destroyed',
  priorityAssetsDestroyed: 'All priority assets destroyed',
  categoriesDestroyed: 'Selected categories destroyed',
  stacksDestroyed: 'Selected named units destroyed',
  categoryStrengthBelow: 'Selected categories below strength',
  preserveStacks: 'Preserve selected units',
};

let conditionCounter = 0;

export function createVictoryCondition(
  beneficiarySideId: SideId,
  theatreId: string | null,
  kind: VictoryConditionKind = 'priorityAssetsDestroyed',
): VictoryCondition {
  conditionCounter += 1;
  return {
    id: `objective-${Date.now().toString(36)}-${conditionCounter}`,
    name: VICTORY_CONDITION_LABELS[kind],
    beneficiarySideId,
    targetSideId: beneficiarySideId === 'A' ? 'B' : 'A',
    theatreId,
    kind,
    categories: [],
    stackIds: [],
    thresholdPct: 0.25,
    minimumSurvivingQuantity: 1,
  };
}

function sideById(state: BattleState, sideId: SideId): Side {
  return sideId === 'A' ? state.sideA : state.sideB;
}

function scopedStacks(side: Side, condition: VictoryCondition): UnitStack[] {
  return side.stacks.filter((stack) => condition.theatreId === null || stack.theatreId === condition.theatreId);
}

function scopeTheatres(state: BattleState, condition: VictoryCondition): Theatre[] {
  return condition.theatreId === null
    ? state.theatres
    : state.theatres.filter((theatre) => theatre.id === condition.theatreId);
}

function scopeConcluded(state: BattleState, condition: VictoryCondition): boolean {
  const theatres = scopeTheatres(state, condition);
  return theatres.length > 0 && theatres.every((theatre) => !!theatre.conclusion);
}

function quantitySurviving(currentStrength: number, combatStrengthPerUnit: number): number {
  if (currentStrength <= 0 || combatStrengthPerUnit <= 0) return 0;
  return Math.ceil(currentStrength / combatStrengthPerUnit - 1e-8);
}

function destroyedEvaluation(
  stacks: UnitStack[],
  label: string,
): Omit<VictoryConditionEvaluation, 'condition'> {
  const available = stacks.length > 0;
  const destroyed = stacks.filter((stack) => stack.currentStrength <= 1e-8).length;
  const progress = available ? destroyed / stacks.length : 0;
  const satisfied = available && destroyed === stacks.length;
  return {
    available,
    currentlySatisfied: satisfied,
    achieved: satisfied,
    progress,
    detail: available
      ? `${destroyed}/${stacks.length} ${label} destroyed.`
      : `No ${label} match this objective.`,
  };
}

export function evaluateVictoryCondition(
  state: BattleState,
  condition: VictoryCondition,
  rules: BattleRules,
): VictoryConditionEvaluation {
  const target = sideById(state, condition.targetSideId);
  const beneficiary = sideById(state, condition.beneficiarySideId);
  const targetStacks = scopedStacks(target, condition);

  if (condition.kind === 'opponentWithdraws') {
    const theatres = scopeTheatres(state, condition).filter((theatre) => (
      target.stacks.some((stack) => stack.theatreId === theatre.id)
    ));
    const withdrawing = theatres.filter((theatre) => shouldWithdraw(target, theatre, rules));
    const satisfied = theatres.length > 0 && withdrawing.length === theatres.length;
    return {
      condition,
      available: theatres.length > 0,
      currentlySatisfied: satisfied,
      achieved: satisfied,
      progress: theatres.length > 0 ? withdrawing.length / theatres.length : 0,
      detail: theatres.length > 0
        ? `${withdrawing.length}/${theatres.length} scoped theatre(s) crossed the withdrawal threshold.`
        : 'The target side has no forces in scope.',
    };
  }

  if (condition.kind === 'allUnitsDestroyed') {
    return { condition, ...destroyedEvaluation(targetStacks, 'unit stack(s)') };
  }

  if (condition.kind === 'priorityAssetsDestroyed') {
    return {
      condition,
      ...destroyedEvaluation(targetStacks.filter((stack) => stack.priorityAsset), 'priority asset(s)'),
    };
  }

  if (condition.kind === 'categoriesDestroyed') {
    const categories = new Set(condition.categories);
    return {
      condition,
      ...destroyedEvaluation(targetStacks.filter((stack) => categories.has(stack.category)), 'selected-category stack(s)'),
    };
  }

  if (condition.kind === 'stacksDestroyed') {
    const ids = new Set(condition.stackIds);
    return {
      condition,
      ...destroyedEvaluation(targetStacks.filter((stack) => ids.has(stack.id)), 'selected stack(s)'),
    };
  }

  if (condition.kind === 'categoryStrengthBelow') {
    const categories = new Set(condition.categories);
    const stacks = targetStacks.filter((stack) => categories.has(stack.category));
    const starting = stacks.reduce((sum, stack) => sum + stack.combatStrengthPerUnit * stack.initialQuantity, 0);
    const current = stacks.reduce((sum, stack) => sum + Math.max(0, stack.currentStrength), 0);
    const remainingFraction = starting > 0 ? current / starting : 1;
    const satisfied = starting > 0 && remainingFraction <= condition.thresholdPct;
    return {
      condition,
      available: starting > 0,
      currentlySatisfied: satisfied,
      achieved: satisfied,
      progress: starting > 0
        ? Math.min(1, (1 - remainingFraction) / Math.max(0.0001, 1 - condition.thresholdPct))
        : 0,
      detail: starting > 0
        ? `${(remainingFraction * 100).toFixed(1)}% remains; objective requires ${(condition.thresholdPct * 100).toFixed(1)}% or less.`
        : 'No selected-category forces match this objective.',
    };
  }

  const ids = new Set(condition.stackIds);
  const stacks = scopedStacks(beneficiary, condition).filter((stack) => ids.has(stack.id));
  const surviving = stacks.reduce(
    (sum, stack) => sum + quantitySurviving(stack.currentStrength, stack.combatStrengthPerUnit),
    0,
  );
  const satisfied = stacks.length > 0 && surviving >= Math.max(1, condition.minimumSurvivingQuantity);
  return {
    condition,
    available: stacks.length > 0,
    currentlySatisfied: satisfied,
    achieved: satisfied && scopeConcluded(state, condition),
    progress: Math.min(1, surviving / Math.max(1, condition.minimumSurvivingQuantity)),
    detail: stacks.length > 0
      ? `${surviving} selected unit(s) still survive; ${Math.max(1, condition.minimumSurvivingQuantity)} required when the battle concludes.`
      : 'No selected friendly units match this objective.',
  };
}

export function evaluateVictoryConditions(
  state: BattleState,
  rules: BattleRules,
): VictoryConditionEvaluation[] {
  return (state.victoryConditions || []).map((condition) => evaluateVictoryCondition(state, condition, rules));
}

export function concludeTheatre(
  state: BattleState,
  theatreId: string,
  winnerSideId: SideId | null,
  reason: TheatreConclusion['reason'],
  conditionId?: string,
): BattleState {
  return {
    ...state,
    theatres: state.theatres.map((theatre) => theatre.id === theatreId
      ? {
          ...theatre,
          conclusion: {
            winnerSideId,
            reason,
            ...(conditionId ? { conditionId } : {}),
            round: theatre.rounds.length,
          },
        }
      : theatre),
  };
}

export function reopenTheatre(state: BattleState, theatreId: string): BattleState {
  return {
    ...state,
    theatres: state.theatres.map((theatre) => theatre.id === theatreId
      ? { ...theatre, conclusion: undefined }
      : theatre),
  };
}

export function conditionUsesCategories(kind: VictoryConditionKind): boolean {
  return kind === 'categoriesDestroyed' || kind === 'categoryStrengthBelow';
}

export function categoriesPresent(state: BattleState, sideId: SideId): BattleUnitCategory[] {
  return [...new Set(sideById(state, sideId).stacks.map((stack) => stack.category))];
}
