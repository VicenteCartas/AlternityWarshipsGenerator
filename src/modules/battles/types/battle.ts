/**
 * Battle Resolution types — abstract combat system from "The Externals" pp. 64-73.
 *
 * Covers space engagements, ground engagements, orbital bombardment, and mixed
 * engagements where forces are split across simultaneous theatres.
 */

/** The physical arena a unit natively fights in. */
export type BattleDomain = 'space' | 'ground';

/**
 * A theatre is one of the simultaneous engagements a battle is split into.
 * - space:        fleet vs. fleet (and anything shooting into orbit)
 * - bombardment:  spacecraft firing on planetary targets
 * - ground:       surface forces engaging each other
 */
export type TheatreKind = 'space' | 'bombardment' | 'ground';

/** Which domain's effectiveness values a theatre uses. */
export const THEATRE_DOMAIN: Record<TheatreKind, BattleDomain> = {
  space: 'space',
  bombardment: 'ground',
  ground: 'ground',
};

/** Which tactics skill the attacking commander rolls in a theatre. */
export const THEATRE_TACTICS_SKILL: Record<TheatreKind, 'space' | 'ground'> = {
  space: 'space',
  bombardment: 'space',
  ground: 'ground',
};

export type SpaceUnitCategory =
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
  | 'systemDefense';

export type GroundUnitCategory = 'infantry' | 'armor' | 'artillery' | 'fortification';

export type BattleUnitCategory = SpaceUnitCategory | GroundUnitCategory | 'custom';
export type CasualtyMode = 'abstract' | 'tracked';

export interface StackCasualtyAllocation {
  stackId: string;
  /** Native combat strength removed from this stack. */
  strengthLoss: number;
}

export interface PendingCasualtyAllocation {
  theatreId: string;
  round: number;
  targetEffectiveLoss: Record<SideId, number>;
  allocations: Record<SideId, StackCasualtyAllocation[]>;
}

export type VictoryConditionKind =
  | 'opponentWithdraws'
  | 'allUnitsDestroyed'
  | 'priorityAssetsDestroyed'
  | 'categoriesDestroyed'
  | 'stacksDestroyed'
  | 'categoryStrengthBelow'
  | 'preserveStacks';

export interface VictoryCondition {
  id: string;
  name: string;
  /** Side that achieves this objective. */
  beneficiarySideId: SideId;
  /** Side whose losses/status are tested (normally the opponent). */
  targetSideId: SideId;
  /** Null applies across the whole battle; otherwise one theatre. */
  theatreId: string | null;
  kind: VictoryConditionKind;
  categories: BattleUnitCategory[];
  stackIds: string[];
  /** Fraction remaining for categoryStrengthBelow (0.25 = 25%). */
  thresholdPct: number;
  /** Required survivors for preserveStacks. */
  minimumSurvivingQuantity: number;
}

export interface TheatreConclusion {
  winnerSideId: SideId | null;
  reason: 'objective' | 'withdrawal' | 'destruction' | 'manual';
  conditionId?: string;
  round: number;
}

/**
 * A unit may be designated at construction as a specialist. The designation
 * trades effectiveness in one domain for effectiveness in the other.
 */
export type UnitSpecialization = 'none' | 'bomber' | 'planetaryDefenseBattery';

/** A catalogue entry loaded from the battles data files (or a mod). */
export interface BattleUnitType {
  id: string;
  name: string;
  category: BattleUnitCategory;
  /** Human-readable description shown in the catalogue. */
  role: string;
  /** Combat strength in the unit's native domain. */
  combatStrength: number;
  /**
   * Effectiveness against targets in the other domain, as a multiplier of
   * combatStrength. Undefined means the unit cannot engage the other domain
   * at all (e.g. infantry cannot fire on orbiting craft).
   */
  spaceFactor?: number;
  groundFactor?: number;
  /** Artillery that may be designated a planetary defense battery. */
  canBePlanetaryDefenseBattery?: boolean;
  /** Fighters carried but NOT counted in combatStrength (informational). */
  fighterComplement?: number;
  /** Other carried craft not counted in combatStrength (informational). */
  carriedCombatStrength?: number;
  /** Mod provenance tag applied at load time. */
  _source?: string;
}

/** A line item in a side's order of battle. */
export interface UnitStack {
  /** Stable client-side id for React keys & updates. */
  id: string;
  /** Display name (e.g. "Hornisse" or a custom designation). */
  name: string;
  /** Combat strength of a single unit in its native domain. */
  combatStrengthPerUnit: number;
  /** Number of units in the stack at the start of the battle. */
  initialQuantity: number;
  /** Current effective combat strength in the native domain (decreases with losses). */
  currentStrength: number;
  /** Category for grouping in the catalogue and summary. */
  category: BattleUnitCategory;
  /** Arena this unit natively fights in. */
  domain: BattleDomain;
  /**
   * Effectiveness multiplier when engaging the other domain, or null when the
   * unit cannot engage it at all. Copied from the catalogue when the stack is
   * added so a saved battle stays intact if the catalogue or mods change later.
   */
  crossDomainFactor: number | null;
  /** Whether this unit may be designated a planetary defense battery. */
  canBePlanetaryDefenseBattery?: boolean;
  /** Construction-time designation trading one domain's effectiveness for the other. */
  specialization: UnitSpecialization;
  /** Which theatre this stack is committed to. */
  theatreId: string;
  /** Optional human-readable role/notes. */
  notes?: string;
  /** Origin tag, useful for tracing. */
  source: 'catalogue' | 'custom' | 'systemDefense' | 'warshipDesign';
  /** Scenario-important unit protected by suggested casualty allocations. */
  priorityAsset?: boolean;
}

export type SideId = 'A' | 'B';

export interface Side {
  id: SideId;
  name: string;
  /** Tactics–space tactics score for the commander. */
  tacticsSpaceScore: number;
  /** Tactics–ground tactics score for the commander. */
  tacticsGroundScore: number;
  /** Stacks composing this side's forces, across all theatres. */
  stacks: UnitStack[];
  /** Withdraw threshold as a fraction of starting strength (0.4 human, 0.6 Externals). */
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
  /** Signed Alternity step actually applied to the attacker's Tactics check. */
  stepModifier: number;
  checkResult: CheckResult;
  attackerLossPct: number;
  defenderLossPct: number;
  attackerStrengthAfter: number;
  defenderStrengthAfter: number;
  /** Optional notes — e.g. roll details. */
  notes?: string;
}

export interface Theatre {
  id: string;
  name: string;
  kind: TheatreKind;
  rounds: RoundResult[];
  conclusion?: TheatreConclusion;
  /** Achieved objectives the GM acknowledged without ending this theatre. */
  continuedObjectiveIds?: string[];
}

export interface BattleState {
  scenarioName: string;
  sideA: Side;
  sideB: Side;
  theatres: Theatre[];
  /** Abstract is the sourcebook default; tracked assigns losses to specific stacks. */
  casualtyMode?: CasualtyMode;
  /** Tracked rounds awaiting player-approved stack losses. */
  pendingCasualties?: PendingCasualtyAllocation[];
  victoryConditions?: VictoryCondition[];
}

/** Wizard step identifiers for the battle builder. */
export type BattleStepId = 'scenario' | 'forcesA' | 'forcesB' | 'resolve' | 'results';

export interface BattleStepDef {
  id: BattleStepId;
  label: string;
  required: boolean;
}

// ============== Rules data (battleRules.json) ==============

export interface TacticalAdvantageRow {
  /** Upper bound (exclusive) of the defender/attacker ratio. null = no upper bound. */
  maxRatio: number | null;
  /** Positive sourcebook magnitude, applied by the resolver as a negative bonus step. */
  stepModifier: number;
}

export interface CombatResultRow {
  result: CheckResult;
  attackerLossPct: number;
  defenderLossPct: number;
}

export interface BattleRules {
  tacticalAdvantage: TacticalAdvantageRow[];
  combatResults: CombatResultRow[];
  withdrawThresholds: { human: number; external: number };
  systemDefenses: { maxRating: number; combatStrengthPerRatingSquared: number };
  crossDomain: {
    shipBombardmentFactor: number;
    designatedBomberSpaceFactor: number;
    designatedBomberGroundFactor: number;
    planetaryDefenseBatterySpaceFactor: number;
    planetaryDefenseBatteryGroundFactor: number;
  };
  /**
   * House rule for converting a Warships design into a combat strength.
   * The book gives no conversion, so this is a tunable approximation.
   */
  warshipImport: {
    /** Share of hull points a reference warship devotes to weapons and defenses. */
    referenceCombatShare: number;
    minFirepowerFactor: number;
    maxFirepowerFactor: number;
    maxArmorFactor: number;
  };
}
