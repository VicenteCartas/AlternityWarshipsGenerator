import { calculateCharacterDerivedStats, validateAbilityAllocation } from './characterCalculationService';
import {
  getAllCharacterOptions,
  getAllCharacterSourcePacks,
  getAllArmor,
  getAllCybergear,
  getAllEquipment,
  getAllMutations,
  getAllProfessions,
  getAllPsionicSkills,
  getAllSkills,
  getAllWeapons,
  getCharacterRules,
  getCybergearTrainingSkillPointCost,
  getProfessionById,
  getPsionicRules,
  getSpeciesById,
} from './characterDataService';
import { evaluateCharacterOptions } from './characterOptionService';
import { evaluateCombatGear } from './combatGearService';
import { resolveCharacterSourcePacks } from './characterSourcePackService';
import { evaluateCybergear } from './cybergearService';
import { calculateStartingFunds, evaluateEquipmentPurchases } from './equipmentService';
import { evaluateMutationPlan } from './mutationService';
import { evaluatePsionicPurchasePlan } from './psionicService';
import { evaluateSpeciesBenefits } from './speciesAbilityService';
import { evaluateSkillPurchasePlan } from './skillPurchaseService';
import type {
  AbilityId,
  AbilityScores,
  CharacterDerivedStats,
  MutationResult,
  SpeciesDefinition,
} from '../types/character';
import type { CharacterState, CharacterValidationResult } from '../types/characterState';

function unchangedMutationResult(scores: AbilityScores): MutationResult {
  return {
    valid: true,
    errors: [],
    spentAdvantagePoints: 0,
    spentDrawbackPoints: 0,
    effectiveAbilityScores: { ...scores },
    durabilityBonuses: { stun: 0, wound: 0, mortal: 0, fatigue: 0 },
    actionCheckModifier: 0,
    effectIds: [],
  };
}

function unavailableSpecies(): SpeciesDefinition {
  return {
    id: 'unknown',
    name: 'Unknown Species',
    sourcePackId: 'phb',
    abilityLimits: Object.fromEntries(
      ['str', 'dex', 'con', 'int', 'wil', 'per'].map((ability) => [ability, { min: 0, max: 0 }]),
    ) as SpeciesDefinition['abilityLimits'],
    freeBroadSkillIds: [],
    startingSkillPointBonus: 0,
    broadSkillLimitBonus: 0,
    durabilityMultiplier: 1,
    actionCheckDieStep: 0,
    specialAbilityIds: [],
  };
}

function applyAbilityAdjustments(
  scores: AbilityScores,
  adjustments: Partial<Record<AbilityId, number>>,
): AbilityScores {
  return Object.fromEntries(
    Object.entries(scores).map(([ability, score]) => [
      ability,
      score + (adjustments[ability as AbilityId] || 0),
    ]),
  ) as AbilityScores;
}

function combineDerivedBonuses(
  derived: CharacterDerivedStats,
  mutation: MutationResult,
  options: CharacterValidationResult['options'],
  cybergear: CharacterValidationResult['cybergear'],
  armorActionCheckPenalty: number,
): CharacterDerivedStats {
  const durability = { ...derived.durability };
  for (const pool of ['stun', 'wound', 'mortal', 'fatigue'] as const) {
    durability[pool] += mutation.durabilityBonuses[pool]
      + options.durabilityBonuses[pool]
      + cybergear.durabilityBonuses[pool];
  }

  const resistanceModifiers = { ...derived.resistanceModifiers };
  for (const [ability, bonus] of Object.entries(options.resistanceModifierBonuses)) {
    const abilityId = ability as AbilityId;
    const current = resistanceModifiers[abilityId];
    if (current !== null && current !== undefined) {
      resistanceModifiers[abilityId] = current + (bonus || 0);
    }
  }
  const dexResistance = resistanceModifiers.dex;
  if (dexResistance !== null) resistanceModifiers.dex = dexResistance - armorActionCheckPenalty;

  return {
    ...derived,
    durability,
    resistanceModifiers,
    actionCheck: {
      ...derived.actionCheck,
      dieStep: derived.actionCheck.dieStep + mutation.actionCheckModifier + armorActionCheckPenalty,
    },
  };
}

export function validateCharacter(state: CharacterState): CharacterValidationResult {
  const rules = getCharacterRules();
  const sourcePacks = resolveCharacterSourcePacks(state.selectedSourcePackIds, getAllCharacterSourcePacks());
  const resolvedSpecies = getSpeciesById(state.speciesId);
  const species = resolvedSpecies || unavailableSpecies();
  const profession = state.professionId ? getProfessionById(state.professionId) || null : null;
  const identityErrors: string[] = [];
  if (!state.identity.heroName.trim()) identityErrors.push('Hero name is required.');
  if (!state.identity.career.trim()) identityErrors.push('Career is required.');
  if (!state.identity.motivation.trim()) identityErrors.push('Motivation is required.');
  if (!state.identity.moralAttitude.trim()) identityErrors.push('Moral attitude is required.');
  if (state.identity.characterTraits.length === 0) identityErrors.push('At least one character trait is required.');
  if (state.identity.characterTraits.length > 2) identityErrors.push('A starting hero may have at most 2 character traits.');
  if (!resolvedSpecies) identityErrors.push(`Unknown species ${state.speciesId}.`);
  if (!profession) identityErrors.push('Profession is required.');
  if (state.progressLevel < 4 || state.progressLevel > 9) {
    identityErrors.push('Progress Level must be between 4 and 9.');
  }

  const professionErrors: string[] = [];
  const secondaryProfessionIds = state.skillPlan.additionalDiscountProfessionIds;
  if (profession?.id === 'combat-spec') {
    const allowedBroadSkillIds = new Set([
      'armor-operation', 'unarmed-attack', 'heavy-weapons',
      'modern-ranged-weapons', 'melee-weapons', 'primitive-ranged-weapons',
    ]);
    const specialty = getAllSkills().find((skill) => skill.id === state.professionBenefits.combatSpecSpecialtySkillId);
    if (!specialty || specialty.kind !== 'specialty' || !specialty.parentSkillId || !allowedBroadSkillIds.has(specialty.parentSkillId)) {
      professionErrors.push('Combat Spec requires one favored combat specialty skill.');
    }
  }
  if (profession?.id === 'diplomat') {
    if (!state.professionBenefits.diplomatBenefit) {
      professionErrors.push('Diplomat requires either Contacts or Resources.');
    }
    if (secondaryProfessionIds.length !== 1) {
      professionErrors.push('Diplomat requires exactly one secondary profession.');
    }
    const secondaryIsMindwalker = secondaryProfessionIds[0] === 'mindwalker';
    if (secondaryIsMindwalker && state.psionicPlan.accessPath !== 'diplomat-mindwalker') {
      professionErrors.push('A Diplomat with Mindwalker as the secondary profession must use the Diplomat / Mindwalker psionic path.');
    }
    if (!secondaryIsMindwalker && state.psionicPlan.accessPath === 'diplomat-mindwalker') {
      professionErrors.push('The Diplomat / Mindwalker psionic path requires Mindwalker as the secondary profession.');
    }
  }
  if (profession?.id === 'free-agent' && !state.resistanceBonusAbility) {
    professionErrors.push('Free Agent requires a resistance bonus Ability.');
  }
  if (profession?.id === 'mindwalker' && state.psionicPlan.accessPath !== 'mindwalker') {
    professionErrors.push('Mindwalker profession requires the Mindwalker psionic path.');
  }

  const abilities = validateAbilityAllocation(state.abilityScores, species, profession, rules);
  const speciesBenefits = evaluateSpeciesBenefits(
    species,
    state.speciesOptionIds,
    state.skillPlan.specialtySkills,
  );
  const shouldEvaluateMutations = species.id === 'mutant-human' || state.mutationPlan.selections.length > 0;
  const mutations = shouldEvaluateMutations
    ? evaluateMutationPlan(state.mutationPlan, state.abilityScores, species, getAllMutations())
    : unchangedMutationResult(state.abilityScores);
  const options = evaluateCharacterOptions(
    state.optionSelections,
    mutations.effectiveAbilityScores,
    species,
    getAllCharacterOptions(),
    state.psionicPlan.accessPath !== 'none',
  );
  const skills = evaluateSkillPurchasePlan(
    {
      ...state.skillPlan,
      skillPointAdjustment: options.skillPointAdjustment - speciesBenefits.skillPointCost,
    },
    options.effectiveAbilityScores,
    species,
    profession,
    getAllSkills(),
    getAllProfessions(),
    rules,
  );
  const psionics = evaluatePsionicPurchasePlan(
    state.psionicPlan,
    options.effectiveAbilityScores,
    species,
    profession,
    skills,
    getAllPsionicSkills(),
    getPsionicRules(),
    rules.startingSpecialtyRankLimit,
  );
  const cybertechEnabled = (sourcePacks.activeSourcePackIdsBySection.cybertech || []).length > 0;
  const cybergear = evaluateCybergear(
    state.cybergearSelections,
    options.effectiveAbilityScores.con,
    species,
    getAllCybergear(),
    getCybergearTrainingSkillPointCost(),
    cybertechEnabled,
    state.progressLevel,
  );
  const effectiveAbilityScores = applyAbilityAdjustments(
    options.effectiveAbilityScores,
    cybergear.abilityAdjustments,
  );
  const remainingSkillPoints = psionics.remainingSkillPoints - cybergear.trainingSkillPointCost;
  const skillIntegrationErrors = remainingSkillPoints < 0
    ? [`Cybergear training exceeds the remaining skill points by ${Math.abs(remainingSkillPoints)}.`]
    : [];

  const startingFunds = profession
    ? calculateStartingFunds(
      profession,
      state.startingFundsDieRolls,
      options.wealthOptionId,
      state.wealthDegree,
    )
    : {
      valid: false,
      errors: ['Profession is required before calculating starting funds.'],
      dieCount: 5,
      dieSize: 0,
      baseFunds: 0,
      wealthMultiplier: 1,
      totalFunds: 0,
    };
  const fundsAfterCybergear = startingFunds.totalFunds - cybergear.equipmentCost;
  const cybergearFundsErrors = startingFunds.valid && fundsAfterCybergear < 0
    ? [`Cybergear exceeds starting funds by ${Math.abs(fundsAfterCybergear)}.`]
    : [];
  const equipment = evaluateEquipmentPurchases(
    state.equipmentSelections,
    getAllEquipment(),
    Math.max(0, fundsAfterCybergear),
    state.progressLevel,
    startingFunds.valid,
  );
  const combatGear = evaluateCombatGear(
    state.weaponSelections,
    state.armorSelections,
    getAllWeapons(),
    getAllArmor(),
    equipment.remainingFunds,
    state.progressLevel,
    skills.trainedBroadSkillIds,
    state.skillPlan.specialtySkills,
    startingFunds.valid,
  );
  const remainingFunds = startingFunds.valid ? combatGear.remainingFunds : 0;
  const baseDerived = calculateCharacterDerivedStats(
    effectiveAbilityScores,
    species,
    profession,
    rules,
    { resistanceBonusAbility: state.resistanceBonusAbility },
  );
  const derived = combineDerivedBonuses(
    baseDerived,
    mutations,
    options,
    cybergear,
    combatGear.armorActionCheckPenalty,
  );
  const errors = [
    ...identityErrors,
    ...professionErrors,
    ...sourcePacks.errors,
    ...speciesBenefits.errors,
    ...abilities.errors,
    ...mutations.errors,
    ...options.errors,
    ...skills.errors,
    ...psionics.errors,
    ...cybergear.errors,
    ...skillIntegrationErrors,
    ...startingFunds.errors,
    ...cybergearFundsErrors,
    ...equipment.errors,
    ...combatGear.errors,
  ];

  return {
    valid: errors.length === 0,
    errors,
    effectiveAbilityScores,
    sourcePacks,
    speciesBenefits,
    professionErrors,
    abilities,
    mutations,
    options,
    skills,
    psionics,
    cybergear,
    startingFunds,
    equipment,
    combatGear,
    derived,
    remainingSkillPoints,
    remainingFunds,
  };
}