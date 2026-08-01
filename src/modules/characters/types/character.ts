export const ABILITY_IDS = ['str', 'dex', 'con', 'int', 'wil', 'per'] as const;

export type AbilityId = typeof ABILITY_IDS[number];
export type AbilityScores = Record<AbilityId, number>;
export type ResistanceAbilityId = Exclude<AbilityId, 'per'>;

export interface AbilityRange {
  min: number;
  max: number;
}

export interface SpeciesDefinition {
  id: string;
  name: string;
  sourcePackId: string;
  abilityLimits: Record<AbilityId, AbilityRange>;
  freeBroadSkillIds: string[];
  startingSkillPointBonus: number;
  broadSkillLimitBonus: number;
  durabilityMultiplier: number;
  actionCheckDieStep: number;
  specialAbilityIds: string[];
  requiresMutations?: boolean;
  description?: string;
  /** Runtime source tag for user mods. */
  _source?: string;
}

export interface SpeciesNaturalArmor {
  lowImpact: string;
  highImpact: string;
  energy: string;
}

export interface SpeciesNaturalWeapon {
  skillId: string;
  damageType: string;
  damage: string;
}

export interface SpeciesBenefitResult {
  valid: boolean;
  errors: string[];
  skillPointCost: number;
  grantedSpecialtyRanks: Record<string, number>;
  skillSituationStepBonuses: Record<string, number>;
  technologyUseStepPenalty: number;
  naturalArmor: SpeciesNaturalArmor | null;
  naturalWeapon: SpeciesNaturalWeapon | null;
  summaries: string[];
}

export interface ProfessionDefinition {
  id: string;
  name: string;
  sourcePackId: string;
  optional: boolean;
  requirements: Partial<AbilityScores>;
  actionCheckBonus: number;
  resistanceModifierChoiceBonus: number;
  lastResortMaximumBonus: number;
  lastResortActionCost: number;
  additionalSkillDiscountProfessionCount: number;
  benefitEffectIds: string[];
  description?: string;
  /** Runtime source tag for user mods. */
  _source?: string;
}

export type SkillKind = 'broad' | 'specialty';

export interface SkillRankBenefit {
  name: string;
  ranks: number[];
  description: string;
}

export interface SkillDefinition {
  id: string;
  name: string;
  sourcePackId: string;
  ability: AbilityId;
  kind: SkillKind;
  listedCost: number;
  professionIds: string[];
  canUseUntrained: boolean;
  parentSkillId?: string;
  requiresSpecialization?: boolean;
  rankBenefits?: SkillRankBenefit[];
}

export interface SpecialtySkillPurchase {
  skillId: string;
  rank: number;
  specialization?: string;
}

export interface SkillPurchasePlan {
  nativeLanguage: string;
  cashedInFreeBroadSkillIds: string[];
  purchasedBroadSkillIds: string[];
  specialtySkills: SpecialtySkillPurchase[];
  additionalDiscountProfessionIds: string[];
  skillPointAdjustment?: number;
}

export interface SkillPurchaseCost {
  skillId: string;
  name: string;
  kind: SkillKind;
  cost: number;
  rank?: number;
  specialization?: string;
}

export interface SkillPurchaseResult {
  valid: boolean;
  errors: string[];
  baseSkillPoints: number;
  speciesSkillPointBonus: number;
  cashedInSkillPoints: number;
  availableSkillPoints: number;
  spentSkillPoints: number;
  remainingSkillPoints: number;
  purchasedBroadSkillCount: number;
  maxPurchasedBroadSkills: number;
  retainedFreeBroadSkillIds: string[];
  trainedBroadSkillIds: string[];
  skillDiscountProfessionIds: string[];
  nativeLanguage: string;
  nativeLanguageRank: 3;
  costs: SkillPurchaseCost[];
}

export type PsionicAccessPath = 'none' | 'mindwalker' | 'talent' | 'diplomat-mindwalker';
export type PsionicCheckOutcome = 'criticalFailure' | 'failure' | 'ordinary' | 'good' | 'amazing';

export interface PsionicSkillDefinition {
  id: string;
  name: string;
  sourcePackId: string;
  ability: AbilityId;
  kind: SkillKind;
  listedCost: number;
  canUseUntrained: boolean;
  parentSkillId?: string;
}

export interface PsionicRules {
  talentBroadSkillLimit: number;
  talentSpecialtySkillLimit: number;
  talentHighRankSpecialtyLimit: number;
  talentHighRankThreshold: number;
  talentMaximumSpecialtyRank: number;
  talentCostSurcharge: number;
  broadSkillEnergyCost: number;
  specialtySkillEnergyCost: number;
  criticalFailureEnergyCost: number;
  extendedDurationEnergyCost: number;
  fullRecoveryRestHours: number;
  hourlyRecovery: Record<PsionicCheckOutcome, number>;
}

export interface PsionicPurchasePlan {
  accessPath: PsionicAccessPath;
  purchasedBroadSkillIds: string[];
  specialtySkills: SpecialtySkillPurchase[];
  favoredBroadSkillId?: string;
}

export interface PsionicSkillBudgetContext {
  remainingSkillPoints: number;
  purchasedBroadSkillCount: number;
  maxPurchasedBroadSkills: number;
  retainedFreeBroadSkillIds: string[];
  skillDiscountProfessionIds: string[];
}

export interface PsionicPurchaseCost {
  skillId: string;
  name: string;
  kind: SkillKind;
  cost: number;
  rank?: number;
}

export interface PsionicPurchaseResult {
  valid: boolean;
  errors: string[];
  accessPath: PsionicAccessPath;
  maximumEnergyPoints: number;
  spentSkillPoints: number;
  remainingSkillPoints: number;
  purchasedBroadSkillCount: number;
  trainedBroadSkillIds: string[];
  costs: PsionicPurchaseCost[];
}

export interface PsionicEnergyUseResult {
  canAttempt: boolean;
  requiredEnergyPoints: number;
  spentEnergyPoints: number;
  remainingEnergyPoints: number;
  fatigueDamage: number;
}

export interface PsionicEnergyRecoveryResult {
  recoveredEnergyPoints: number;
  remainingEnergyPoints: number;
  fatigueDamage: number;
}

export type CharacterOptionKind = 'perk' | 'flaw';
export type CharacterOptionActivation = 'active' | 'conscious' | 'special';

export interface CharacterOptionChoice {
  id: string;
  name: string;
  value: number;
  effectId?: string;
}

export interface CharacterOptionDefinition {
  id: string;
  name: string;
  sourcePackId: string;
  kind: CharacterOptionKind;
  ability: AbilityId | null;
  activation?: CharacterOptionActivation;
  values: number[];
  choices?: CharacterOptionChoice[];
  effectIds: string[];
  requiresPsionics?: boolean;
  requiresTargetAbility?: boolean;
  requiresNotes?: boolean;
}

export interface CharacterOptionSelection {
  optionId: string;
  value?: number;
  choiceIds?: string[];
  targetAbility?: AbilityId;
  notes?: string;
}

export interface CharacterOptionResult {
  valid: boolean;
  errors: string[];
  perkCount: number;
  flawCount: number;
  spentPerkPoints: number;
  gainedFlawPoints: number;
  skillPointAdjustment: number;
  effectiveAbilityScores: AbilityScores;
  resistanceModifierBonuses: Partial<Record<ResistanceAbilityId, number>>;
  durabilityBonuses: DurabilityStats;
  wealthOptionId: 'filthy-rich' | 'dirt-poor' | null;
  effectIds: string[];
}

export type MutationKind = 'advantage' | 'drawback';
export type MutationTier = 'ordinary' | 'good' | 'amazing' | 'slight' | 'moderate' | 'extreme';

export interface MutationDefinition {
  id: string;
  name: string;
  sourcePackId: string;
  kind: MutationKind;
  tier: MutationTier;
  cost: number;
  ability: AbilityId | null;
  familyId?: string;
  effectIds: string[];
  requiresNotes?: boolean;
  requiresTargetAbility?: boolean;
  requiresLinkedMutation?: boolean;
}

export interface MutationSelection {
  mutationId: string;
  targetAbility?: AbilityId;
  linkedMutationId?: string;
  notes?: string;
}

export interface MutationPlan {
  origin: 'engineered' | 'natural' | 'directed';
  scope: 'community' | 'individual';
  advantagePointBudget: number;
  drawbackPointBudget: number;
  selections: MutationSelection[];
}

export interface MutationResult {
  valid: boolean;
  errors: string[];
  spentAdvantagePoints: number;
  spentDrawbackPoints: number;
  effectiveAbilityScores: AbilityScores;
  durabilityBonuses: DurabilityStats;
  actionCheckModifier: number;
  effectIds: string[];
}

export type EquipmentQuality = 'ordinary' | 'good' | 'amazing';
export type ItemQuality = 'marginal' | EquipmentQuality;

export interface CybergearQualityDefinition {
  quality: EquipmentQuality;
  mass: number | null;
  size: number;
  cost: number;
  effectIds: string[];
}

export interface CybergearDefinition {
  id: string;
  name: string;
  sourcePackId: string;
  progressLevel: number;
  requiresNanocomputer: boolean;
  freeSkillPointTraining: boolean;
  qualities: CybergearQualityDefinition[];
  effectIds: string[];
  _source?: string;
}

export interface CybergearSelection {
  gearId: string;
  quality: EquipmentQuality;
  quantity: number;
  notes?: string;
}

export interface CybergearResult {
  valid: boolean;
  errors: string[];
  cyberTolerance: number;
  usedTolerance: number;
  remainingTolerance: number;
  requiresAcceptanceCheck: boolean;
  trainingSkillPointCost: number;
  equipmentCost: number;
  totalMass: number;
  durabilityBonuses: DurabilityStats;
  abilityAdjustments: Partial<Record<AbilityId, number>>;
  effectIds: string[];
}

export type EquipmentCategory = 'sensor' | 'miscellaneous' | 'survival' | 'service' | 'computer';
export type CostMode = 'fixed' | 'variable' | 'formula';

export interface EquipmentDefinition {
  id: string;
  name: string;
  sourcePackId: string;
  category: EquipmentCategory;
  progressLevel: number;
  mass: number | null;
  costMode: CostMode;
  cost: number | null;
  costText?: string;
  costUnit?: string;
  activeMemory?: Partial<Record<ItemQuality, number | null>>;
  qualityCosts?: Partial<Record<ItemQuality, number>>;
  effectIds: string[];
  _source?: string;
}

export interface EquipmentSelection {
  equipmentId: string;
  quantity: number;
  quality?: ItemQuality;
  unitCostOverride?: number;
  granted?: boolean;
  notes?: string;
}

export interface EquipmentPurchaseResult {
  valid: boolean;
  errors: string[];
  totalCost: number;
  totalMass: number;
  remainingFunds: number;
  grantedValue: number;
}

export type WeaponCategory = 'melee' | 'ranged' | 'heavy';
export type EquipmentAvailability = 'any' | 'common' | 'controlled' | 'military' | 'restricted';

export interface WeaponDefinition {
  id: string;
  name: string;
  sourcePackId: string;
  category: WeaponCategory;
  progressLevel: number;
  skillId: string;
  accuracy: number;
  mode: string | null;
  range: string;
  damageType: string;
  damage: string;
  actions: number | null;
  clipSize: string | null;
  clipCost: number | null;
  concealment: string | null;
  mass: number | null;
  availability: EquipmentAvailability | null;
  cost: number | null;
  _source?: string;
}

export interface ArmorDefinition {
  id: string;
  name: string;
  sourcePackId: string;
  progressLevel: number;
  skillId: string | null;
  actionCheckPenalty: number;
  toughness: 'ordinary' | 'good';
  lowImpact: string;
  highImpact: string;
  energy: string;
  concealment: string | null;
  mass: number;
  availability: EquipmentAvailability;
  cost: number;
  _source?: string;
}

export interface WeaponSelection {
  weaponId: string;
  quantity: number;
  spareClips: number;
}

export interface ArmorSelection {
  armorId: string;
  quantity: number;
}

export interface CombatGearResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  weaponCost: number;
  ammunitionCost: number;
  armorCost: number;
  totalCost: number;
  totalMass: number;
  armorActionCheckPenalty: number;
  remainingFunds: number;
}

export type FundsDegree = 'marginal' | 'ordinary' | 'good' | 'amazing';

export interface StartingFundsResult {
  valid: boolean;
  errors: string[];
  dieCount: number;
  dieSize: number;
  baseFunds: number;
  wealthMultiplier: number;
  totalFunds: number;
}

export interface NumericBand {
  min?: number;
  max?: number;
  value: number;
}

export interface SkillBudgetBand {
  intelligence: number;
  skillPoints: number;
  maxBroadSkills: number;
}

export interface LastResortBand {
  min?: number;
  max?: number;
  maximum: number;
  cost: number | null;
}

export interface CombatMovementBand {
  min?: number;
  max?: number;
  sprint: number;
  run: number;
  walk: number;
  easySwim: number;
  swim: number;
  glide: number;
  fly: number;
}

export interface CharacterRules {
  abilityPointPool: number;
  freeBroadSkillCashInValue: number;
  startingSpecialtyRankLimit: number;
  maximumSpecialtyRank: number;
  resistanceModifiers: NumericBand[];
  startingSkillPoints: SkillBudgetBand[];
  lastResorts: LastResortBand[];
  actionsPerRound: NumericBand[];
  combatMovement: CombatMovementBand[];
  strengthDamageAdjustment: NumericBand[];
}

export interface AbilityValidationResult {
  valid: boolean;
  pointsUsed: number;
  pointsRemaining: number;
  errors: string[];
}

export interface SkillBudget {
  baseSkillPoints: number;
  totalSkillPoints: number;
  maxPurchasedBroadSkills: number;
}

export interface LastResortStats {
  maximum: number;
  initial: number;
  cost: number | null;
  actionCost: number;
}

export interface CharacterCalculationOptions {
  resistanceBonusAbility?: ResistanceAbilityId;
}

export interface ActionCheckStats {
  score: number;
  marginal: number;
  ordinary: number;
  good: number;
  amazing: number;
  dieStep: number;
}

export interface DurabilityStats {
  stun: number;
  wound: number;
  mortal: number;
  fatigue: number;
}

export interface SkillScore {
  ordinary: number;
  good: number;
  amazing: number;
}

export interface CharacterDerivedStats {
  untrainedScores: Record<AbilityId, number>;
  resistanceModifiers: Record<AbilityId, number | null>;
  skillBudget: SkillBudget;
  lastResorts: LastResortStats;
  actionCheck: ActionCheckStats;
  actionsPerRound: number;
  movement: CombatMovementBand;
  durability: DurabilityStats;
  strengthDamageAdjustment: number;
}