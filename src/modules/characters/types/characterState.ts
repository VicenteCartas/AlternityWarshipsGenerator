import type {
  AbilityScores,
  AbilityValidationResult,
  CharacterDerivedStats,
  CharacterOptionResult,
  CharacterOptionSelection,
  CombatGearResult,
  CybergearResult,
  CybergearSelection,
  EquipmentPurchaseResult,
  EquipmentSelection,
  FundsDegree,
  MutationPlan,
  MutationResult,
  PsionicPurchasePlan,
  PsionicPurchaseResult,
  ResistanceAbilityId,
  ArmorSelection,
  AdvancementPlan,
  AdvancementResult,
  CharacterSkillRules,
  SkillPurchasePlan,
  SkillPurchaseResult,
  SpeciesBenefitResult,
  StartingFundsResult,
  WeaponSelection,
} from './character';
import type { CharacterSourcePackResolution } from './sourcePack';
import type { FxPlan, FxPurchaseResult } from './fx';

export const CHARACTER_STEP_IDS = [
  'identity',
  'species',
  'profession',
  'abilities',
  'skills',
  'options',
  'psionics',
  'fx',
  'mutations',
  'cybergear',
  'equipment',
  'advancement',
  'summary',
] as const;

export type CharacterStepId = typeof CHARACTER_STEP_IDS[number];

export interface CharacterIdentity {
  heroName: string;
  playerName: string;
  campaign: string;
  gamemaster: string;
  career: string;
  gender: string;
  age: string;
  height: string;
  weight: string;
  hair: string;
  eyes: string;
  appearance: string;
  background: string;
  allegiance: string;
  socialStatus: string;
  contacts: string;
  enemies: string;
  notes: string;
  motivation: string;
  moralAttitude: string;
  characterTraits: string[];
}

export interface ProfessionBenefitChoices {
  combatSpecSpecialtySkillId?: string;
  diplomatBenefit?: 'contacts' | 'resources';
}

export interface CharacterState {
  level: number;
  progressLevel: number;
  selectedSourcePackIds: string[];
  skillRules: CharacterSkillRules;
  identity: CharacterIdentity;
  speciesId: string;
  professionId: string | null;
  professionBenefits: ProfessionBenefitChoices;
  speciesOptionIds: string[];
  abilityScores: AbilityScores;
  resistanceBonusAbility?: ResistanceAbilityId;
  skillPlan: SkillPurchasePlan;
  optionSelections: CharacterOptionSelection[];
  psionicPlan: PsionicPurchasePlan;
  fxPlan: FxPlan;
  mutationPlan: MutationPlan;
  cybergearSelections: CybergearSelection[];
  startingFundsDieRolls: number[];
  wealthDegree?: FundsDegree;
  equipmentSelections: EquipmentSelection[];
  weaponSelections: WeaponSelection[];
  armorSelections: ArmorSelection[];
  advancementPlan: AdvancementPlan;
}

export interface CharacterValidationResult {
  valid: boolean;
  errors: string[];
  effectiveAbilityScores: AbilityScores;
  sourcePacks: CharacterSourcePackResolution;
  speciesBenefits: SpeciesBenefitResult;
  professionErrors: string[];
  abilities: AbilityValidationResult;
  mutations: MutationResult;
  options: CharacterOptionResult;
  skills: SkillPurchaseResult;
  psionics: PsionicPurchaseResult;
  fx: FxPurchaseResult;
  cybergear: CybergearResult;
  startingFunds: StartingFundsResult;
  equipment: EquipmentPurchaseResult;
  combatGear: CombatGearResult;
  advancement: AdvancementResult;
  derived: CharacterDerivedStats;
  remainingSkillPoints: number;
  remainingFunds: number;
}