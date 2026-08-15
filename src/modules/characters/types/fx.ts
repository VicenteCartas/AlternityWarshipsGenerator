import type { AbilityId, SpecialtySkillCostRule } from './character';

export type FxDiscipline = 'arcane' | 'faith' | 'super-power';
export type FxQuality = 'ordinary' | 'good' | 'amazing';
export type FxCampaignTone = 'realistic' | 'heroic' | 'super-heroic';
export type FxCheckOutcome = 'criticalFailure' | 'failure' | FxQuality;
export type FxComplexity = 'simple' | FxQuality;
export type FxArcaneCategory = 'augur' | 'conjure' | 'summon' | 'transform';
export type FxSuperPowerCategory = 'enchanted-relic' | 'extreme-ability' | 'overscience-gadget';
export type FxAbilityCategory = FxArcaneCategory | FxSuperPowerCategory;

export interface FxBroadSkillDefinition {
  discipline: FxDiscipline;
  name: string;
  sourcePackId: string;
  cost: number;
}

export interface FxFaithSpecialtyDefinition {
  quality: FxQuality;
  name: string;
  sourcePackId: string;
  cost: number;
}

export interface FxCampaignToneDefinition {
  id: FxCampaignTone;
  name: string;
  startingEnergy: number;
  maximumEnergy: number;
  skillPointCostPerEnergy: number;
}

export interface FxCharacteristicChoiceDefinition {
  id: string;
  label: string;
  cost: number;
}

export interface FxCharacteristicDefinition {
  id: string;
  label: string;
  choices: FxCharacteristicChoiceDefinition[];
}

export interface FxEnergyCostDefinition {
  criticalFailure: number;
  failure: number;
  ordinary: number;
  good: number;
  amazing: number;
}

export interface FxRules {
  broadSkills: FxBroadSkillDefinition[];
  faithSpecialties: FxFaithSpecialtyDefinition[];
  campaignTones: FxCampaignToneDefinition[];
  characteristics: FxCharacteristicDefinition[];
  energyCosts: Record<FxDiscipline, FxEnergyCostDefinition>;
}

export interface FxCharacteristicSelection {
  characteristicId: string;
  choiceId: string;
  notes?: string;
}

export interface FxAbilityTrappings {
  complexRitual?: boolean;
  ritual?: string;
  component?: string;
  componentComplexity?: FxComplexity;
  focus?: string;
  limitation?: string;
  trigger?: string;
}

export interface FxAbilityDesign {
  id: string;
  name: string;
  discipline: Exclude<FxDiscipline, 'faith'>;
  category: FxAbilityCategory;
  ability: AbilityId;
  description: string;
  characteristics: FxCharacteristicSelection[];
  trappings: FxAbilityTrappings;
}

export interface FxAbilityDesignResult {
  valid: boolean;
  errors: string[];
  effectCost: number;
  trappingReduction: number;
  purchaseCost: number;
  quality: FxQuality | null;
}

export interface FxAbilityPurchase {
  designId: string;
  rank: number;
}

export interface FxFaithPurchase {
  quality: FxQuality;
  rank: number;
}

export interface FxPlan {
  campaignTone: FxCampaignTone | null;
  broadSkill: FxDiscipline | null;
  faithFocus?: string;
  designs: FxAbilityDesign[];
  abilityPurchases: FxAbilityPurchase[];
  faithPurchases: FxFaithPurchase[];
}

export interface FxPurchaseCost {
  key: string;
  name: string;
  kind: 'broad' | 'specialty';
  rank?: number;
  cost: number;
}

export interface FxPurchaseResult {
  valid: boolean;
  errors: string[];
  costs: FxPurchaseCost[];
  spentSkillPoints: number;
  remainingSkillPoints: number;
  purchasedBroadSkillCount: number;
  startingEnergy: number;
  maximumEnergy: number;
  currentMaximumEnergy: number;
  designResults: Array<FxAbilityDesignResult & { designId: string }>;
}

export interface FxSkillBudgetContext {
  remainingSkillPoints: number;
  purchasedBroadSkillCount: number;
  maxPurchasedBroadSkills: number;
}

export interface FxRankCostInput {
  baseCost: number;
  currentRank: number;
  specialtySkillCostRule: SpecialtySkillCostRule;
}

export interface FxAbilityExportFile {
  version: string;
  sourcePackId: 'gmg-fx';
  designs: FxAbilityDesign[];
}

export interface FxAbilityImportResult {
  designs: FxAbilityDesign[];
  warnings: string[];
}