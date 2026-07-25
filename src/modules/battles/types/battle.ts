/**
 * Battle Resolution types — abstract space-combat system from "The Externals" pp. 64-72.
 * v1 scope: ship-vs-ship space engagements only.
 */

export type ShipCategory =
  | 'fighter'
  | 'cutter'
  | 'destroyer'
  | 'escort'
  | 'cruiser'
  | 'carrier'
  | 'battleship'
  | 'dreadnought'
  | 'fortress'
  | 'monitor'
  | 'cathedral'
  | 'custom';

export interface ExternalShip {
  id: string;
  name: string;
  category: ShipCategory;
  role: string;
  combatStrength: number;
}

/** A line item in a side's order of battle. */
export interface UnitStack {
  /** Stable client-side id for React keys & updates. */
  id: string;
  /** Display name (e.g. "Hornisse" or a custom designation). */
  name: string;
  /** Combat strength of a single unit. */
  combatStrengthPerUnit: number;
  /** Number of units in the stack at the start of the battle. */
  initialQuantity: number;
  /** Current effective combat strength (decreases with losses). */
  currentStrength: number;
  /** Optional category for grouping in the summary. */
  category: ShipCategory;
  /** Optional human-readable role/notes. */
  notes?: string;
  /** Origin tag, useful for tracing. */
  source: 'external' | 'custom';
}

export type SideId = 'A' | 'B';

export interface Side {
  id: SideId;
  name: string;
  /** Tactics-space skill score for the commander (used by the Alternity roller). */
  tacticsScore: number;
  /** Stacks composing this side's force. */
  stacks: UnitStack[];
  /** Original total force strength (recorded at battle start for withdraw thresholds). */
  initialForceStrength: number;
  /** Withdraw threshold as a fraction of initialForceStrength (e.g. 0.4 humans, 0.6 Externals). */
  withdrawThreshold: number;
}

export type CheckResult =
  | 'criticalFailure'
  | 'failure'
  | 'ordinary'
  | 'good'
  | 'amazing';

export interface RoundResult {
  round: number;
  attackerSide: SideId;
  defenderSide: SideId;
  attackerStrengthBefore: number;
  defenderStrengthBefore: number;
  ratio: number;
  stepModifier: number;
  checkResult: CheckResult;
  attackerLossPct: number;
  defenderLossPct: number;
  attackerStrengthAfter: number;
  defenderStrengthAfter: number;
  /** Optional notes — e.g. "manual entry", roll details. */
  notes?: string;
}

export interface BattleState {
  scenarioName: string;
  sideA: Side;
  sideB: Side;
  rounds: RoundResult[];
}
