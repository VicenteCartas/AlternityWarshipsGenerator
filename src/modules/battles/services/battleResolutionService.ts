/**
 * Battle resolution service — abstract combat from "The Externals" pp. 64-73.
 *
 * Pure functions; no React or IO. All round application is functional and returns
 * a new state, leaving the caller responsible for hooking it up to history/undo.
 *
 * Rules tables (tactical advantage, loss percentages, cross-domain factors,
 * system defense conversion) come from battleRules.json so they can be modded.
 */

import type {
  BattleDomain,
  BattleRules,
  BattleState,
  BattleUnitType,
  CheckResult,
  RoundResult,
  Side,
  SideId,
  Theatre,
  TheatreKind,
  UnitSpecialization,
  UnitStack,
} from '../types/battle';
import { THEATRE_DOMAIN, THEATRE_TACTICS_SKILL } from '../types/battle';

// ============== Effective strength ==============

/**
 * Effectiveness multiplier for a stack fighting in the given domain, or null
 * when the unit cannot engage that domain at all.
 *
 * A construction-time specialization overrides the unit's normal factors:
 * a designated bomber trades space effectiveness for full ground effectiveness,
 * and a designated planetary defense battery does the reverse.
 */
export function effectiveFactor(
  stack: UnitStack,
  domain: BattleDomain,
  rules: BattleRules,
): number | null {
  const cross = rules.crossDomain;

  if (stack.specialization === 'bomber') {
    return domain === 'space' ? cross.designatedBomberSpaceFactor : cross.designatedBomberGroundFactor;
  }
  if (stack.specialization === 'planetaryDefenseBattery') {
    return domain === 'space'
      ? cross.planetaryDefenseBatterySpaceFactor
      : cross.planetaryDefenseBatteryGroundFactor;
  }
  return stack.domain === domain ? 1 : stack.crossDomainFactor;
}

/** Current combat strength a stack contributes when fighting in the given domain. */
export function effectiveStrength(
  stack: UnitStack,
  domain: BattleDomain,
  rules: BattleRules,
): number {
  const factor = effectiveFactor(stack, domain, rules);
  if (factor === null) return 0;
  return Math.max(0, stack.currentStrength) * factor;
}

/** Starting combat strength a stack contributes when fighting in the given domain. */
export function startingEffectiveStrength(
  stack: UnitStack,
  domain: BattleDomain,
  rules: BattleRules,
): number {
  const factor = effectiveFactor(stack, domain, rules);
  if (factor === null) return 0;
  return stack.combatStrengthPerUnit * stack.initialQuantity * factor;
}

/** Stacks a side has committed to a theatre. */
export function stacksInTheatre(side: Side, theatreId: string): UnitStack[] {
  return side.stacks.filter((s) => s.theatreId === theatreId);
}

/** Total effective combat strength a side currently fields in a theatre. */
export function computeForceStrength(side: Side, theatre: Theatre, rules: BattleRules): number {
  const domain = THEATRE_DOMAIN[theatre.kind];
  return stacksInTheatre(side, theatre.id)
    .reduce((sum, s) => sum + effectiveStrength(s, domain, rules), 0);
}

/** Total effective combat strength a side started the theatre with. */
export function computeStartingForceStrength(side: Side, theatre: Theatre, rules: BattleRules): number {
  const domain = THEATRE_DOMAIN[theatre.kind];
  return stacksInTheatre(side, theatre.id)
    .reduce((sum, s) => sum + startingEffectiveStrength(s, domain, rules), 0);
}

/** Total native combat strength across every theatre, for at-a-glance totals. */
export function computeTotalStrength(side: Side): number {
  return side.stacks.reduce((sum, s) => sum + Math.max(0, s.currentStrength), 0);
}

// ============== Rules tables ==============

/** Determine attacker/defender by force strength. Ties default A as attacker. */
export function determineRoles(
  fsA: number,
  fsB: number,
): { attacker: SideId; defender: SideId } {
  if (fsB > fsA) return { attacker: 'B', defender: 'A' };
  return { attacker: 'A', defender: 'B' };
}

/**
 * Tactical Advantage bonus (Externals p. 65).
 *
 * The source table prints +1 through +5 under "Offensive Advantage", but in
 * Alternity a positive step is a penalty. Applying those signs literally makes
 * a larger force less likely to succeed. Treat the table entries as advantage
 * magnitudes and return negative steps for the attacker's Tactics check.
 */
export function tacticalAdvantageStep(
  defenderFS: number,
  attackerFS: number,
  rules: BattleRules,
): number {
  const table = rules.tacticalAdvantage;
  const last = table[table.length - 1];
  if (attackerFS <= 0) return -(last?.stepModifier ?? 1);
  const ratio = defenderFS / attackerFS;
  for (const row of table) {
    if (row.maxRatio === null || ratio < row.maxRatio) return -Math.abs(row.stepModifier);
  }
  return -Math.abs(last?.stepModifier ?? 1);
}

/** Loss percentages for attacker and defender by check result. */
export function lossesForResult(
  result: CheckResult,
  rules: BattleRules,
): { attackerLossPct: number; defenderLossPct: number } {
  const row = rules.combatResults.find((r) => r.result === result);
  if (!row) return { attackerLossPct: 0, defenderLossPct: 0 };
  return { attackerLossPct: row.attackerLossPct, defenderLossPct: row.defenderLossPct };
}

/**
 * Combat strength of a system's standing defenses from its STAR*DRIVE
 * defense rating: rating squared, times 1,000 (Externals p. 68).
 */
export function systemDefenseCombatStrength(rating: number, rules: BattleRules): number {
  const clamped = Math.max(0, Math.min(rules.systemDefenses.maxRating, Math.floor(rating)));
  return clamped * clamped * rules.systemDefenses.combatStrengthPerRatingSquared;
}

/** Which tactics score the commander uses in a theatre. */
export function tacticsScoreFor(side: Side, kind: TheatreKind): number {
  return THEATRE_TACTICS_SKILL[kind] === 'space' ? side.tacticsSpaceScore : side.tacticsGroundScore;
}

// ============== Round resolution ==============

/** Reduce every stack a side has in a theatre by the given loss fraction. */
function applyLossFraction(side: Side, theatreId: string, lossPct: number): Side {
  if (lossPct <= 0) return side;
  const survivorFraction = Math.max(0, 1 - lossPct);
  return {
    ...side,
    stacks: side.stacks.map((s) =>
      s.theatreId === theatreId
        ? { ...s, currentStrength: Math.max(0, s.currentStrength * survivorFraction) }
        : s,
    ),
  };
}

/**
 * Resolve one round in a theatre given an explicit tactics check result.
 * Returns the new state and the recorded round.
 */
export function applyRound(
  state: BattleState,
  theatreId: string,
  result: CheckResult,
  rules: BattleRules,
): { state: BattleState; round: RoundResult | null } {
  const theatre = state.theatres.find((t) => t.id === theatreId);
  if (!theatre) return { state, round: null };

  const fsA = computeForceStrength(state.sideA, theatre, rules);
  const fsB = computeForceStrength(state.sideB, theatre, rules);
  const { attacker, defender } = determineRoles(fsA, fsB);
  const atkFS = attacker === 'A' ? fsA : fsB;
  const defFS = defender === 'A' ? fsA : fsB;

  const stepModifier = tacticalAdvantageStep(defFS, atkFS, rules);
  const { attackerLossPct, defenderLossPct } = lossesForResult(result, rules);

  const lossBySide: Record<SideId, number> = {
    A: attacker === 'A' ? attackerLossPct : defenderLossPct,
    B: attacker === 'B' ? attackerLossPct : defenderLossPct,
  };

  const sideA = applyLossFraction(state.sideA, theatreId, lossBySide.A);
  const sideB = applyLossFraction(state.sideB, theatreId, lossBySide.B);

  const round: RoundResult = {
    round: theatre.rounds.length + 1,
    attackerSide: attacker,
    defenderSide: defender,
    attackerStrengthBefore: atkFS,
    defenderStrengthBefore: defFS,
    ratio: atkFS > 0 ? defFS / atkFS : 0,
    stepModifier,
    checkResult: result,
    attackerLossPct,
    defenderLossPct,
    attackerStrengthAfter: computeForceStrength(attacker === 'A' ? sideA : sideB, theatre, rules),
    defenderStrengthAfter: computeForceStrength(defender === 'A' ? sideA : sideB, theatre, rules),
  };

  return {
    state: {
      ...state,
      sideA,
      sideB,
      theatres: state.theatres.map((t) =>
        t.id === theatreId ? { ...t, rounds: [...t.rounds, round] } : t,
      ),
    },
    round,
  };
}

/** Whether a side has crossed its withdraw threshold in a theatre. */
export function shouldWithdraw(side: Side, theatre: Theatre, rules: BattleRules): boolean {
  const starting = computeStartingForceStrength(side, theatre, rules);
  if (starting <= 0) return false;
  const lost = 1 - computeForceStrength(side, theatre, rules) / starting;
  return lost >= side.withdrawThreshold;
}

/** Restore every stack to full strength and clear all resolved rounds. */
export function resetBattle(state: BattleState): BattleState {
  const resetSide = (side: Side): Side => ({
    ...side,
    stacks: side.stacks.map((s) => ({
      ...s,
      currentStrength: s.combatStrengthPerUnit * s.initialQuantity,
    })),
  });
  return {
    ...state,
    sideA: resetSide(state.sideA),
    sideB: resetSide(state.sideB),
    theatres: state.theatres.map((t) => ({ ...t, rounds: [] })),
  };
}

/** Whether any round has been resolved anywhere in the battle. */
export function isBattleStarted(state: BattleState): boolean {
  return state.theatres.some((t) => t.rounds.length > 0);
}

// ============== Stack construction ==============

let stackCounter = 0;

function nextStackId(prefix: string): string {
  stackCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${stackCounter}`;
}

/**
 * Build an order-of-battle stack from a catalogue entry. The unit's
 * cross-domain effectiveness is resolved and copied onto the stack so a saved
 * battle keeps working if the catalogue or its mods change later.
 */
export function createStackFromUnitType(
  unit: BattleUnitType,
  domain: BattleDomain,
  quantity: number,
  theatreId: string,
  rules: BattleRules,
  specialization: UnitSpecialization = 'none',
): UnitStack {
  const declaredCross = domain === 'space' ? unit.groundFactor : unit.spaceFactor;
  const crossDomainFactor =
    declaredCross ?? (domain === 'space' ? rules.crossDomain.shipBombardmentFactor : null);

  const qty = Math.max(1, Math.floor(quantity));
  const notes = [
    unit.role,
    unit.fighterComplement ? `carries ${unit.fighterComplement} fighters (not in CS)` : null,
    unit.carriedCombatStrength ? `carries ${unit.carriedCombatStrength.toLocaleString()} CS of craft` : null,
  ].filter(Boolean).join(' · ');

  return {
    id: nextStackId(unit.id),
    name: unit.name,
    combatStrengthPerUnit: unit.combatStrength,
    initialQuantity: qty,
    currentStrength: unit.combatStrength * qty,
    category: unit.category,
    domain,
    crossDomainFactor,
    canBePlanetaryDefenseBattery: unit.canBePlanetaryDefenseBattery,
    specialization,
    theatreId,
    notes: notes || undefined,
    source: 'catalogue',
  };
}

/** Build a stack for a hand-entered unit. */
export function createCustomStack(params: {
  name: string;
  combatStrength: number;
  quantity: number;
  domain: BattleDomain;
  crossDomainFactor: number | null;
  theatreId: string;
  notes?: string;
}): UnitStack {
  const qty = Math.max(1, Math.floor(params.quantity));
  return {
    id: nextStackId('custom'),
    name: params.name,
    combatStrengthPerUnit: params.combatStrength,
    initialQuantity: qty,
    currentStrength: params.combatStrength * qty,
    category: 'custom',
    domain: params.domain,
    crossDomainFactor: params.crossDomainFactor,
    specialization: 'none',
    theatreId: params.theatreId,
    notes: params.notes,
    source: 'custom',
  };
}

/** Build a stack representing a system's standing defense network. */
export function createSystemDefenseStack(
  systemName: string,
  rating: number,
  theatreId: string,
  rules: BattleRules,
): UnitStack {
  const strength = systemDefenseCombatStrength(rating, rules);
  return {
    id: nextStackId('system-defense'),
    name: `${systemName || 'System'} Defenses`,
    combatStrengthPerUnit: strength,
    initialQuantity: 1,
    currentStrength: strength,
    category: 'systemDefense',
    domain: 'space',
    crossDomainFactor: null,
    specialization: 'none',
    theatreId,
    notes: `Type ${Math.floor(rating)} system defenses`,
    source: 'systemDefense',
  };
}
