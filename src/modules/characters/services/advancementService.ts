import {
  getAdvancementRules,
  getAllArmor,
  getAllCharacterOptions,
  getAllCybergear,
  getAllEquipment,
  getAllPsionicSkills,
  getAllSkills,
  getAllWeapons,
  getCharacterRules,
  getCybergearTrainingSkillPointCost,
  getFxRules,
  getProfessionById,
  getPsionicRules,
  getSpeciesById,
} from './characterDataService';
import { calculateLastResorts } from './characterCalculationService';
import { calculateSkillListCost } from './skillPurchaseService';
import { calculateFxAbilityDesign, calculateFxRankCost } from './fxService';
import type {
  AbilityId,
  AdvancementBenefitPurchase,
  AdvancementBenefitRule,
  AdvancementEquipmentAcquisition,
  AdvancementLevelPlan,
  AdvancementPlan,
  AdvancementProfessionRule,
  AdvancementResult,
  AdvancementSkillDomain,
  ArmorSelection,
  CharacterOptionSelection,
  CybergearSelection,
  EquipmentSelection,
  ItemQuality,
  SpecialtySkillPurchase,
  WeaponSelection,
} from '../types/character';
import type { CharacterState } from '../types/characterState';
import type { FxAbilityPurchase, FxDiscipline, FxFaithPurchase, FxQuality } from '../types/fx';

export interface AdvancementBaseContext {
  effectiveAbilityScores: Record<AbilityId, number>;
  coreBroadSkillIds: string[];
  coreSpecialtySkills: SpecialtySkillPurchase[];
  psionicBroadSkillIds: string[];
  psionicSpecialtySkills: SpecialtySkillPurchase[];
  skillDiscountProfessionIds: string[];
  remainingSkillPoints: number;
  remainingCredits: number;
  currentLastResortPoints: number;
  maximumLastResortPoints: number;
  lastResortPointCost: number | null;
}

export interface AdvancementBenefitChoice {
  key: string;
  label: string;
  type: AdvancementBenefitPurchase['type'];
  cost: number | number[];
  minimumLevel: number;
  ability?: AbilityId;
  optionId?: string;
  flawId?: string;
}

export function createEmptyAdvancementLevel(level: number): AdvancementLevelPlan {
  return {
    level,
    broadSkills: [],
    specialtySkills: [],
    benefits: [],
    lastResortPointsSpent: 0,
    lastResortPointsPurchased: 0,
    fxEnergyPointsPurchased: 0,
    creditsAwarded: 0,
    acquisitions: [],
    notes: '',
  };
}

export function achievementPointsForLevel(level: number): number {
  return level <= 1 ? 0 : ((level - 1) * (level + 10)) / 2;
}

export function skillPointsEarnedAtLevel(level: number): number {
  return level <= 1 ? 0 : level + 4;
}

function normalizedSpecialization(value: string | undefined): string {
  return (value || '').trim().toLocaleLowerCase();
}

function specialtyKey(domain: AdvancementSkillDomain, skillId: string, specialization?: string): string {
  return `${domain}:${skillId}:${normalizedSpecialization(specialization)}`;
}

function optionValue(selection: CharacterOptionSelection): number {
  const definition = getAllCharacterOptions().find((entry) => entry.id === selection.optionId);
  if (!definition) return 0;
  if (definition.choices) {
    return (selection.choiceIds || []).reduce(
      (sum, choiceId) => sum + (definition.choices?.find((choice) => choice.id === choiceId)?.value || 0),
      0,
    );
  }
  return selection.value ?? definition.values[0] ?? 0;
}

function professionRule(
  benefit: Pick<AdvancementBenefitRule, 'professionRules'>,
  professionId: string,
): AdvancementProfessionRule | undefined {
  return benefit.professionRules[professionId];
}

function selectedRuleCost(rule: AdvancementProfessionRule, selection?: CharacterOptionSelection): number {
  if (!Array.isArray(rule.cost)) return rule.cost;
  const definition = selection
    ? getAllCharacterOptions().find((entry) => entry.id === selection.optionId)
    : undefined;
  const valueIndex = definition && selection
    ? Math.max(0, definition.values.indexOf(selection.value ?? definition.values[0]))
    : 0;
  return rule.cost[Math.min(valueIndex, rule.cost.length - 1)] || rule.cost[0] || 0;
}

export function listAdvancementBenefitChoices(
  state: CharacterState,
  level: number,
): AdvancementBenefitChoice[] {
  const professionId = state.professionId || '';
  const rules = getAdvancementRules();
  const choices: AdvancementBenefitChoice[] = [];
  for (const benefit of rules.benefits) {
    const rule = professionRule(benefit, professionId);
    const levelEligible = benefit.type !== 'monetary-award' || (level >= 3 && level % 3 === 0);
    if (rule && level >= rule.level && levelEligible) {
      choices.push({ key: benefit.id, label: benefit.name, type: benefit.type, cost: rule.cost, minimumLevel: rule.level });
    }
  }
  for (const abilityRule of rules.abilityScoreIncreases) {
    const rule = abilityRule.professionRules[professionId]?.first;
    if (rule && level >= rule.level) {
      choices.push({
        key: `ability-score-increase:${abilityRule.ability}`,
        label: `Ability Score Increase: ${abilityRule.ability.toUpperCase()}`,
        type: 'ability-score-increase',
        cost: rule.cost,
        minimumLevel: rule.level,
        ability: abilityRule.ability,
      });
    }
  }
  for (const perkRule of rules.perks) {
    const rule = perkRule.professionRules[professionId];
    const option = getAllCharacterOptions().find((entry) => entry.id === perkRule.optionId);
    if (rule && option && level >= rule.level) {
      choices.push({
        key: `new-perk:${perkRule.optionId}`,
        label: `New Perk: ${option.name}`,
        type: 'new-perk',
        cost: rule.cost,
        minimumLevel: rule.level,
        optionId: perkRule.optionId,
      });
    }
  }
  const removeRule = professionRule(rules.removeFlaw, professionId);
  if (removeRule && level >= removeRule.level) {
    for (const selection of state.optionSelections) {
      const option = getAllCharacterOptions().find((entry) => entry.id === selection.optionId && entry.kind === 'flaw');
      if (option) {
        choices.push({
          key: `remove-flaw:${option.id}`,
          label: `Remove Flaw: ${option.name}`,
          type: 'remove-flaw',
          cost: optionValue(selection) * 2,
          minimumLevel: removeRule.level,
          flawId: option.id,
        });
      }
    }
  }
  const contactRule = professionRule(rules.acquireContact, professionId);
  if (contactRule && level >= contactRule.level) {
    choices.push({
      key: 'acquire-contact',
      label: 'Acquire Contact',
      type: 'acquire-contact',
      cost: contactRule.cost,
      minimumLevel: contactRule.level,
    });
  }
  return choices;
}

function resolveEquipmentCost(
  acquisition: AdvancementEquipmentAcquisition,
  errors: string[],
): { name: string; cost: number } {
  if (!Number.isInteger(acquisition.quantity) || acquisition.quantity < 1) {
    errors.push('Advancement equipment quantities must be positive whole numbers.');
    return { name: acquisition.itemId, cost: 0 };
  }
  const selectedDefinition = acquisition.kind === 'equipment'
    ? getAllEquipment().find((entry) => entry.id === acquisition.itemId)
    : acquisition.kind === 'weapon'
      ? getAllWeapons().find((entry) => entry.id === acquisition.itemId)
      : acquisition.kind === 'armor'
        ? getAllArmor().find((entry) => entry.id === acquisition.itemId)
        : getAllCybergear().find((entry) => entry.id === acquisition.itemId);
  if (!selectedDefinition) {
    errors.push(`Unknown advancement ${acquisition.kind} ${acquisition.itemId}.`);
    return { name: acquisition.itemId, cost: 0 };
  }
  if (acquisition.method === 'granted') {
    return { name: selectedDefinition.name, cost: 0 };
  }

  if (acquisition.kind === 'equipment') {
    const definition = getAllEquipment().find((entry) => entry.id === acquisition.itemId);
    if (!definition) {
      errors.push(`Unknown advancement equipment ${acquisition.itemId}.`);
      return { name: acquisition.itemId, cost: 0 };
    }
    let unitCost = acquisition.unitCostOverride;
    if (unitCost === undefined && definition.qualityCosts && acquisition.quality) {
      unitCost = definition.qualityCosts[acquisition.quality as ItemQuality];
    }
    if (unitCost === undefined) unitCost = definition.cost ?? undefined;
    if (unitCost === undefined || unitCost < 0) {
      errors.push(`${definition.name} requires an actual purchase price for advancement.`);
      return { name: definition.name, cost: 0 };
    }
    return { name: definition.name, cost: unitCost * acquisition.quantity };
  }
  if (acquisition.kind === 'weapon') {
    const definition = getAllWeapons().find((entry) => entry.id === acquisition.itemId);
    if (!definition) {
      errors.push(`Unknown advancement weapon ${acquisition.itemId}.`);
      return { name: acquisition.itemId, cost: 0 };
    }
    const unitCost = acquisition.unitCostOverride ?? definition.cost;
    if (unitCost === null || unitCost === undefined) {
      errors.push(`${definition.name} requires an actual purchase price for advancement.`);
      return { name: definition.name, cost: 0 };
    }
    const spareClips = acquisition.spareClips || 0;
    if (!Number.isInteger(spareClips) || spareClips < 0) errors.push(`${definition.name} spare clips must be a nonnegative whole number.`);
    if (spareClips > 0 && definition.clipCost === null) errors.push(`${definition.name} has no separately priced ammunition clip.`);
    return {
      name: definition.name,
      cost: unitCost * acquisition.quantity + (definition.clipCost || 0) * Math.max(0, spareClips),
    };
  }
  if (acquisition.kind === 'armor') {
    const definition = getAllArmor().find((entry) => entry.id === acquisition.itemId);
    if (!definition) {
      errors.push(`Unknown advancement armor ${acquisition.itemId}.`);
      return { name: acquisition.itemId, cost: 0 };
    }
    return {
      name: definition.name,
      cost: (acquisition.unitCostOverride ?? definition.cost) * acquisition.quantity,
    };
  }
  const definition = getAllCybergear().find((entry) => entry.id === acquisition.itemId);
  if (!definition) {
    errors.push(`Unknown advancement cybergear ${acquisition.itemId}.`);
    return { name: acquisition.itemId, cost: 0 };
  }
  const quality = definition.qualities.find((entry) => entry.quality === acquisition.quality);
  if (!quality) {
    errors.push(`${definition.name} requires a valid quality.`);
    return { name: definition.name, cost: 0 };
  }
  return {
    name: definition.name,
    cost: (acquisition.unitCostOverride ?? quality.cost) * acquisition.quantity,
  };
}

function mergeEquipment(
  base: EquipmentSelection[],
  acquisitions: Array<AdvancementEquipmentAcquisition & { level: number }>,
  errors: string[],
): EquipmentSelection[] {
  const result = base.map((entry) => ({ ...entry }));
  for (const acquisition of acquisitions.filter((entry) => entry.kind === 'equipment')) {
    const current = result.find((entry) => entry.equipmentId === acquisition.itemId);
    if (current) {
      if ((current.quality || '') !== (acquisition.quality || '')) {
        errors.push(`${acquisition.itemId} cannot be held at multiple qualities in one character record.`);
      } else current.quantity += acquisition.quantity;
    } else {
      result.push({
        equipmentId: acquisition.itemId,
        quantity: acquisition.quantity,
        quality: acquisition.quality as ItemQuality | undefined,
        notes: acquisition.notes,
      });
    }
  }
  return result;
}

function mergeWeapons(
  base: WeaponSelection[],
  acquisitions: Array<AdvancementEquipmentAcquisition & { level: number }>,
): WeaponSelection[] {
  const result = base.map((entry) => ({ ...entry }));
  for (const acquisition of acquisitions.filter((entry) => entry.kind === 'weapon')) {
    const current = result.find((entry) => entry.weaponId === acquisition.itemId);
    if (current) {
      current.quantity += acquisition.quantity;
      current.spareClips += acquisition.spareClips || 0;
    } else {
      result.push({ weaponId: acquisition.itemId, quantity: acquisition.quantity, spareClips: acquisition.spareClips || 0 });
    }
  }
  return result;
}

function mergeArmor(
  base: ArmorSelection[],
  acquisitions: Array<AdvancementEquipmentAcquisition & { level: number }>,
): ArmorSelection[] {
  const result = base.map((entry) => ({ ...entry }));
  for (const acquisition of acquisitions.filter((entry) => entry.kind === 'armor')) {
    const current = result.find((entry) => entry.armorId === acquisition.itemId);
    if (current) current.quantity += acquisition.quantity;
    else result.push({ armorId: acquisition.itemId, quantity: acquisition.quantity });
  }
  return result;
}

function mergeCybergear(
  base: CybergearSelection[],
  acquisitions: Array<AdvancementEquipmentAcquisition & { level: number }>,
  errors: string[],
): CybergearSelection[] {
  const result = base.map((entry) => ({ ...entry }));
  for (const acquisition of acquisitions.filter((entry) => entry.kind === 'cybergear')) {
    const current = result.find((entry) => entry.gearId === acquisition.itemId);
    if (current) {
      if (current.quality !== acquisition.quality) errors.push(`${acquisition.itemId} cannot be installed at multiple qualities.`);
      else current.quantity += acquisition.quantity;
    } else if (acquisition.quality === 'ordinary' || acquisition.quality === 'good' || acquisition.quality === 'amazing') {
      result.push({
        gearId: acquisition.itemId,
        quality: acquisition.quality,
        quantity: acquisition.quantity,
        notes: acquisition.notes,
      });
    } else errors.push(`${acquisition.itemId} requires a cybergear quality.`);
  }
  return result;
}

export function evaluateAdvancementPlan(
  state: CharacterState,
  context: AdvancementBaseContext,
): AdvancementResult {
  const errors: string[] = [];
  const rules = getAdvancementRules();
  const characterRules = getCharacterRules();
  const psionicRules = getPsionicRules();
  const fxRules = getFxRules();
  const profession = state.professionId ? getProfessionById(state.professionId) : undefined;
  const species = getSpeciesById(state.speciesId);
  const professionId = profession?.id || '';
  const targetLevel = state.level;
  if (!Number.isInteger(targetLevel) || targetLevel < 1 || targetLevel > rules.maximumTargetLevel) {
    errors.push(`Target level must be a whole number from 1 to ${rules.maximumTargetLevel}.`);
  }

  const planByLevel = new Map<number, AdvancementLevelPlan>();
  for (const levelPlan of state.advancementPlan.levels || []) {
    if (planByLevel.has(levelPlan.level)) errors.push(`Level ${levelPlan.level} appears more than once in the advancement plan.`);
    if (levelPlan.level < 2 || levelPlan.level > targetLevel) errors.push(`Level ${levelPlan.level} is outside this character's advancement range.`);
    planByLevel.set(levelPlan.level, levelPlan);
  }

  const coreBroad = new Set(context.coreBroadSkillIds);
  const psionicBroad = new Set(context.psionicBroadSkillIds);
  const coreRanks = new Map<string, SpecialtySkillPurchase>();
  const psionicRanks = new Map<string, SpecialtySkillPurchase>();
  for (const purchase of context.coreSpecialtySkills) {
    coreRanks.set(specialtyKey('core', purchase.skillId, purchase.specialization), { ...purchase });
  }
  for (const purchase of context.psionicSpecialtySkills) {
    psionicRanks.set(specialtyKey('psionic', purchase.skillId, purchase.specialization), { ...purchase });
  }
  let fxBroadSkill: FxDiscipline | null = state.fxPlan.broadSkill;
  const fxAbilityRanks = new Map<string, FxAbilityPurchase>(
    state.fxPlan.abilityPurchases.map((purchase) => [purchase.designId, { ...purchase }]),
  );
  const fxFaithRanks = new Map<FxQuality, FxFaithPurchase>(
    state.fxPlan.faithPurchases.map((purchase) => [purchase.quality, { ...purchase }]),
  );
  const fxDesignById = new Map(state.fxPlan.designs.map((design) => [design.id, design]));
  const fxDesignResultById = new Map(state.fxPlan.designs.map((design) => [
    design.id,
    calculateFxAbilityDesign(design, fxRules),
  ]));
  const fxTone = state.fxPlan.campaignTone
    ? fxRules.campaignTones.find((tone) => tone.id === state.fxPlan.campaignTone)
    : undefined;
  let currentMaximumFxEnergy = fxBroadSkill ? fxTone?.startingEnergy || 0 : 0;

  const discountIds = new Set(context.skillDiscountProfessionIds);
  const genericPurchaseCounts = new Map<string, number>();
  const abilityPurchaseCounts: Partial<Record<AbilityId, number>> = {};
  const abilityScoreBonuses: Partial<Record<AbilityId, number>> = {};
  const addedPerks: CharacterOptionSelection[] = [];
  const removedFlawIds: string[] = [];
  const acquiredContacts: string[] = [];
  const acquisitions: Array<AdvancementEquipmentAcquisition & { level: number; name: string; cost: number }> = [];
  const levelResults: AdvancementResult['levelResults'] = [];
  const durabilityBonuses = { stun: 0, wound: 0, mortal: 0, fatigue: 0 };
  let actionCheckBonusSteps = 0;
  let actionCheckScoreIncreases = 0;
  let extraActions = 0;
  let carriedSkillPoints = Math.max(0, context.remainingSkillPoints);
  let totalSkillPointsEarned = 0;
  let totalSkillPointsSpent = 0;
  let campaignCredits = context.remainingCredits;
  let campaignCreditsAwarded = 0;
  let acquisitionCost = 0;
  let currentLastResortPoints = context.currentLastResortPoints;
  let cyberTrainingPaid = state.cybergearSelections.some((selection) => {
    const definition = getAllCybergear().find((entry) => entry.id === selection.gearId);
    return definition && !definition.freeSkillPointTraining;
  });

  for (let level = 2; level <= Math.max(1, targetLevel); level += 1) {
    const levelPlan = planByLevel.get(level) || createEmptyAdvancementLevel(level);
    const costs: AdvancementResult['levelResults'][number]['costs'] = [];
    const carriedIn = carriedSkillPoints;
    const earned = skillPointsEarnedAtLevel(level);
    totalSkillPointsEarned += earned;
    let levelSpent = 0;
    let levelCreditAward = Number(levelPlan.creditsAwarded) || 0;
    if (levelCreditAward < 0) errors.push(`Level ${level} credit awards cannot be negative.`);
    campaignCredits += Math.max(0, levelCreditAward);
    campaignCreditsAwarded += Math.max(0, levelCreditAward);

    const broadKeys = new Set<string>();
    for (const purchase of levelPlan.broadSkills || []) {
      const key = `${purchase.domain}:${purchase.skillId}`;
      if (broadKeys.has(key)) {
        errors.push(`Level ${level} purchases ${purchase.skillId} more than once.`);
        continue;
      }
      broadKeys.add(key);
      if (purchase.domain === 'core') {
        const definition = getAllSkills().find((entry) => entry.id === purchase.skillId);
        if (!definition || definition.kind !== 'broad') {
          errors.push(`Level ${level} references unknown core broad skill ${purchase.skillId}.`);
          continue;
        }
        if (coreBroad.has(definition.id)) {
          errors.push(`${definition.name} is already trained before level ${level}.`);
          continue;
        }
        const cost = calculateSkillListCost(definition, discountIds);
        coreBroad.add(definition.id);
        costs.push({ type: 'broad-skill', name: definition.name, cost });
        levelSpent += cost;
      } else if (purchase.domain === 'psionic') {
        const definition = getAllPsionicSkills().find((entry) => entry.id === purchase.skillId);
        if (!definition || definition.kind !== 'broad') {
          errors.push(`Level ${level} references unknown psionic broad skill ${purchase.skillId}.`);
          continue;
        }
        if (state.psionicPlan.accessPath === 'none') {
          errors.push(`${definition.name} requires a psionic access path.`);
          continue;
        }
        if (psionicBroad.has(definition.id)) {
          errors.push(`${definition.name} is already trained before level ${level}.`);
          continue;
        }
        const cost = state.psionicPlan.accessPath === 'talent'
          ? definition.listedCost + psionicRules.talentCostSurcharge
          : state.psionicPlan.accessPath === 'diplomat-mindwalker'
            ? Math.max(1, definition.listedCost - 1)
            : definition.listedCost;
        psionicBroad.add(definition.id);
        costs.push({ type: 'broad-skill', name: definition.name, cost });
        levelSpent += cost;
      } else {
        const discipline = purchase.skillId as FxDiscipline;
        const definition = fxRules.broadSkills.find((entry) => entry.discipline === discipline);
        if (!definition) {
          errors.push(`Level ${level} references unknown FX broad skill ${purchase.skillId}.`);
          continue;
        }
        if (fxBroadSkill) {
          errors.push(`A hero can never have more than one FX broad skill; ${fxBroadSkill} is already trained.`);
          continue;
        }
        if (!fxTone) {
          errors.push(`Level ${level} requires an FX campaign tone before purchasing ${definition.name}.`);
          continue;
        }
        fxBroadSkill = discipline;
        currentMaximumFxEnergy = fxTone.startingEnergy;
        costs.push({ type: 'broad-skill', name: definition.name, cost: definition.cost });
        levelSpent += definition.cost;
      }
    }

    const specialtyKeys = new Set<string>();
    for (const purchase of levelPlan.specialtySkills || []) {
      const key = specialtyKey(purchase.domain, purchase.skillId, purchase.specialization);
      if (specialtyKeys.has(key)) {
        errors.push(`Level ${level} improves ${purchase.skillId} more than once; only one rank may be gained at a time.`);
        continue;
      }
      specialtyKeys.add(key);
      if (purchase.domain === 'core') {
        const definition = getAllSkills().find((entry) => entry.id === purchase.skillId);
        if (!definition || definition.kind !== 'specialty') {
          errors.push(`Level ${level} references unknown core specialty ${purchase.skillId}.`);
          continue;
        }
        if (!definition.parentSkillId || !coreBroad.has(definition.parentSkillId)) {
          errors.push(`${definition.name} requires its broad skill before level ${level}.`);
          continue;
        }
        if (definition.requiresSpecialization && !normalizedSpecialization(purchase.specialization)) {
          errors.push(`${definition.name} requires a subject at level ${level}.`);
          continue;
        }
        const current = coreRanks.get(key)?.rank || 0;
        if (current >= characterRules.maximumSpecialtyRank) {
          errors.push(`${definition.name} already has the maximum rank of ${characterRules.maximumSpecialtyRank}.`);
          continue;
        }
        const cost = calculateSkillListCost(definition, discountIds)
          + (state.skillRules.specialtySkillCosts === 'optional-2c' ? 0 : current);
        coreRanks.set(key, { skillId: definition.id, rank: current + 1, specialization: purchase.specialization?.trim() || undefined });
        costs.push({ type: 'specialty-rank', name: `${definition.name} rank ${current + 1}`, cost });
        levelSpent += cost;
      } else if (purchase.domain === 'psionic') {
        const definition = getAllPsionicSkills().find((entry) => entry.id === purchase.skillId);
        if (!definition || definition.kind !== 'specialty') {
          errors.push(`Level ${level} references unknown psionic specialty ${purchase.skillId}.`);
          continue;
        }
        if (!definition.parentSkillId || !psionicBroad.has(definition.parentSkillId)) {
          errors.push(`${definition.name} requires its psionic broad skill before level ${level}.`);
          continue;
        }
        const current = psionicRanks.get(key)?.rank || 0;
        const maximumRank = state.psionicPlan.accessPath === 'talent'
          ? psionicRules.talentMaximumSpecialtyRank
          : characterRules.maximumSpecialtyRank;
        if (current >= maximumRank) {
          errors.push(`${definition.name} already has the maximum rank of ${maximumRank}.`);
          continue;
        }
        const rankOneCost = state.psionicPlan.accessPath === 'talent'
          ? definition.listedCost + psionicRules.talentCostSurcharge
          : state.psionicPlan.accessPath === 'diplomat-mindwalker'
            ? Math.max(1, definition.listedCost - 1)
            : definition.listedCost;
        const cost = rankOneCost
          + (state.skillRules.specialtySkillCosts === 'optional-2c' ? 0 : current);
        psionicRanks.set(key, { skillId: definition.id, rank: current + 1 });
        costs.push({ type: 'specialty-rank', name: `${definition.name} rank ${current + 1}`, cost });
        levelSpent += cost;
      } else if (purchase.skillId.startsWith('faith:')) {
        const quality = purchase.skillId.slice('faith:'.length) as FxQuality;
        const definition = fxRules.faithSpecialties.find((entry) => entry.quality === quality);
        if (!definition) {
          errors.push(`Level ${level} references unknown Faith specialty ${purchase.skillId}.`);
          continue;
        }
        if (fxBroadSkill !== 'faith') {
          errors.push(`${definition.name} requires the Faith FX broad skill.`);
          continue;
        }
        const current = fxFaithRanks.get(quality)?.rank || 0;
        if (current >= characterRules.maximumSpecialtyRank) {
          errors.push(`${definition.name} already has the maximum rank of ${characterRules.maximumSpecialtyRank}.`);
          continue;
        }
        const cost = calculateFxRankCost({
          baseCost: definition.cost,
          currentRank: current,
          specialtySkillCostRule: state.skillRules.specialtySkillCosts,
        });
        fxFaithRanks.set(quality, { quality, rank: current + 1 });
        costs.push({ type: 'specialty-rank', name: `${definition.name} rank ${current + 1}`, cost });
        levelSpent += cost;
      } else {
        const design = fxDesignById.get(purchase.skillId);
        const designResult = fxDesignResultById.get(purchase.skillId);
        if (!design || !designResult) {
          errors.push(`Level ${level} references unknown FX design ${purchase.skillId}.`);
          continue;
        }
        if (!designResult.valid) {
          errors.push(`${design.name} has an invalid FX design.`);
          continue;
        }
        if (fxBroadSkill !== design.discipline) {
          errors.push(`${design.name} requires the ${design.discipline} FX broad skill.`);
          continue;
        }
        const current = fxAbilityRanks.get(design.id)?.rank || 0;
        if (current >= characterRules.maximumSpecialtyRank) {
          errors.push(`${design.name} already has the maximum rank of ${characterRules.maximumSpecialtyRank}.`);
          continue;
        }
        const cost = calculateFxRankCost({
          baseCost: designResult.purchaseCost,
          currentRank: current,
          specialtySkillCostRule: state.skillRules.specialtySkillCosts,
        });
        fxAbilityRanks.set(design.id, { designId: design.id, rank: current + 1 });
        costs.push({ type: 'specialty-rank', name: `${design.name} rank ${current + 1}`, cost });
        levelSpent += cost;
      }
    }

    const fxEnergyPointsPurchased = Number(levelPlan.fxEnergyPointsPurchased) || 0;
    if (!Number.isInteger(fxEnergyPointsPurchased) || fxEnergyPointsPurchased < 0) {
      errors.push(`Level ${level} FX energy purchases must be a nonnegative whole number.`);
    } else if (fxEnergyPointsPurchased > 0) {
      if (!fxBroadSkill || !fxTone) {
        errors.push(`Level ${level} requires an FX broad skill and campaign tone before purchasing FX energy.`);
      } else {
        if (currentMaximumFxEnergy + fxEnergyPointsPurchased > fxTone.maximumEnergy) {
          errors.push(`Level ${level} FX energy exceeds the ${fxTone.name} maximum of ${fxTone.maximumEnergy}.`);
        }
        const cost = fxEnergyPointsPurchased * fxTone.skillPointCostPerEnergy;
        currentMaximumFxEnergy += fxEnergyPointsPurchased;
        costs.push({ type: 'fx-energy', name: `${fxEnergyPointsPurchased} FX energy`, cost });
        levelSpent += cost;
      }
    }

    for (const benefit of levelPlan.benefits || []) {
      let cost = 0;
      let name: string = benefit.type;
      if (benefit.type === 'ability-score-increase') {
        if (!benefit.ability) {
          errors.push(`Level ${level} Ability Score Increase requires an Ability.`);
          continue;
        }
        const count = abilityPurchaseCounts[benefit.ability] || 0;
        const abilityRule = rules.abilityScoreIncreases.find((entry) => entry.ability === benefit.ability);
        const rule = abilityRule?.professionRules[professionId]?.[count === 0 ? 'first' : 'second'];
        if (!rule || count >= 2) {
          errors.push(`${benefit.ability.toUpperCase()} cannot be increased again.`);
          continue;
        }
        if (level < rule.level) {
          errors.push(`${benefit.ability.toUpperCase()} Ability Score Increase is unavailable until level ${rule.level}.`);
          continue;
        }
        const currentScore = context.effectiveAbilityScores[benefit.ability] + (abilityScoreBonuses[benefit.ability] || 0);
        if (!species || currentScore >= species.abilityLimits[benefit.ability].max) {
          errors.push(`${benefit.ability.toUpperCase()} cannot exceed the ${species?.name || 'species'} maximum.`);
          continue;
        }
        cost = rule.cost as number;
        name = `${benefit.ability.toUpperCase()} Ability Score Increase`;
        abilityPurchaseCounts[benefit.ability] = count + 1;
        abilityScoreBonuses[benefit.ability] = (abilityScoreBonuses[benefit.ability] || 0) + 1;
      } else if (benefit.type === 'new-perk') {
        const optionId = benefit.optionSelection?.optionId;
        const perkRule = rules.perks.find((entry) => entry.optionId === optionId);
        const rule = perkRule?.professionRules[professionId];
        const option = getAllCharacterOptions().find((entry) => entry.id === optionId && entry.kind === 'perk');
        const existingPerkIds = new Set([
          ...state.optionSelections.filter((selection) => getAllCharacterOptions().some((entry) => entry.id === selection.optionId && entry.kind === 'perk')).map((selection) => selection.optionId),
          ...addedPerks.map((selection) => selection.optionId),
        ]);
        if (!rule || !option || !benefit.optionSelection) {
          errors.push(`Level ${level} references an unavailable new perk.`);
          continue;
        }
        if (level < rule.level) {
          errors.push(`${option.name} is unavailable until level ${rule.level}.`);
          continue;
        }
        if (existingPerkIds.has(option.id)) {
          errors.push(`${option.name} is already selected.`);
          continue;
        }
        if (existingPerkIds.size >= 3) {
          errors.push('A hero who began with three purchased perks cannot buy another perk through achievement.');
          continue;
        }
        cost = selectedRuleCost(rule, benefit.optionSelection);
        name = `New Perk: ${option.name}`;
        addedPerks.push({ ...benefit.optionSelection });
      } else if (benefit.type === 'remove-flaw') {
        const removeRule = professionRule(rules.removeFlaw, professionId);
        const selection = state.optionSelections.find((entry) => entry.optionId === benefit.flawId);
        const option = getAllCharacterOptions().find((entry) => entry.id === benefit.flawId && entry.kind === 'flaw');
        if (!removeRule || level < removeRule.level || !selection || !option || removedFlawIds.includes(option.id)) {
          errors.push(`Level ${level} cannot remove flaw ${benefit.flawId || 'unknown'}.`);
          continue;
        }
        cost = optionValue(selection) * 2;
        name = `Remove Flaw: ${option.name}`;
        removedFlawIds.push(option.id);
      } else if (benefit.type === 'acquire-contact') {
        const rule = professionRule(rules.acquireContact, professionId);
        if (!rule || level < rule.level || !(benefit.notes || '').trim()) {
          errors.push(`Acquire Contact at level ${level} requires availability and a contact description.`);
          continue;
        }
        cost = rule.cost as number;
        name = 'Acquire Contact';
        acquiredContacts.push(benefit.notes!.trim());
      } else {
        const definition = rules.benefits.find((entry) => entry.type === benefit.type);
        const rule = definition ? professionRule(definition, professionId) : undefined;
        const count = genericPurchaseCounts.get(benefit.type) || 0;
        const monetaryLevelValid = benefit.type !== 'monetary-award' || (level >= 3 && level % 3 === 0);
        if (!definition || !rule || level < rule.level || !monetaryLevelValid) {
          errors.push(`${definition?.name || benefit.type} is unavailable at level ${level}.`);
          continue;
        }
        if (definition.maximumPurchases !== undefined && count >= definition.maximumPurchases) {
          errors.push(`${definition.name} exceeds its purchase limit of ${definition.maximumPurchases}.`);
          continue;
        }
        cost = rule.cost as number;
        name = definition.name;
        genericPurchaseCounts.set(benefit.type, count + 1);
        if (benefit.type === 'action-check-bonus') actionCheckBonusSteps += 1;
        if (benefit.type === 'action-check-increase') actionCheckScoreIncreases += 1;
        if (benefit.type === 'extra-action') extraActions += 1;
        if (benefit.type === 'fatigue-rating-increase') durabilityBonuses.fatigue += 1;
        if (benefit.type === 'mortal-rating-increase') durabilityBonuses.mortal += 1;
        if (benefit.type === 'stun-rating-increase') durabilityBonuses.stun += 1;
        if (benefit.type === 'wound-rating-increase') durabilityBonuses.wound += 1;
        if (benefit.type === 'monetary-award') {
          const credits = Number(benefit.credits) || 0;
          if (credits < 0) errors.push(`Level ${level} Monetary Award credits cannot be negative.`);
          levelCreditAward += Math.max(0, credits);
          campaignCredits += Math.max(0, credits);
          campaignCreditsAwarded += Math.max(0, credits);
        }
      }
      costs.push({ type: 'benefit', name, cost });
      levelSpent += cost;
    }

    const pointsSpent = Math.max(0, Math.floor(levelPlan.lastResortPointsSpent || 0));
    const pointsPurchased = Math.max(0, Math.floor(levelPlan.lastResortPointsPurchased || 0));
    if (pointsSpent !== (levelPlan.lastResortPointsSpent || 0) || pointsPurchased !== (levelPlan.lastResortPointsPurchased || 0)) {
      errors.push(`Level ${level} Last Resort changes must be nonnegative whole numbers.`);
    }
    currentLastResortPoints -= pointsSpent;
    if (currentLastResortPoints < 0) {
      errors.push(`Level ${level} spends more Last Resort points than the hero has.`);
      currentLastResortPoints = 0;
    }
    const currentPersonality = context.effectiveAbilityScores.per + (abilityScoreBonuses.per || 0);
    const currentLastResorts = calculateLastResorts(currentPersonality, characterRules, profession || null);
    if (pointsPurchased > 0 && currentLastResorts.cost === null) {
      errors.push(`The hero cannot purchase Last Resort points at level ${level}.`);
    }
    if (currentLastResortPoints + pointsPurchased > currentLastResorts.maximum) {
      errors.push(`Level ${level} purchases Last Resort points above the maximum of ${currentLastResorts.maximum}.`);
    } else {
      currentLastResortPoints += pointsPurchased;
      if (pointsPurchased > 0) {
        const cost = (currentLastResorts.cost || 0) * pointsPurchased;
        costs.push({ type: 'last-resort', name: `${pointsPurchased} Last Resort point${pointsPurchased === 1 ? '' : 's'}`, cost });
        levelSpent += cost;
      }
    }

    let levelAcquisitionCost = 0;
    for (const acquisition of levelPlan.acquisitions || []) {
      const definition = getAllEquipment().find((entry) => entry.id === acquisition.itemId)
        || getAllWeapons().find((entry) => entry.id === acquisition.itemId)
        || getAllArmor().find((entry) => entry.id === acquisition.itemId)
        || getAllCybergear().find((entry) => entry.id === acquisition.itemId);
      if (definition && 'progressLevel' in definition && definition.progressLevel > state.progressLevel) {
        errors.push(`${definition.name} requires Progress Level ${definition.progressLevel}.`);
      }
      const resolved = resolveEquipmentCost(acquisition, errors);
      levelAcquisitionCost += resolved.cost;
      acquisitions.push({ ...acquisition, level, name: resolved.name, cost: resolved.cost });
      if (acquisition.kind === 'cybergear' && !cyberTrainingPaid) {
        const cyberDefinition = getAllCybergear().find((entry) => entry.id === acquisition.itemId);
        if (cyberDefinition && !cyberDefinition.freeSkillPointTraining) {
          const cost = getCybergearTrainingSkillPointCost();
          costs.push({ type: 'cyber-training', name: 'Cybergear training', cost });
          levelSpent += cost;
          cyberTrainingPaid = true;
        }
      }
    }
    campaignCredits -= levelAcquisitionCost;
    acquisitionCost += levelAcquisitionCost;
    if (campaignCredits < 0) errors.push(`Level ${level} purchases exceed available credits by ${Math.abs(campaignCredits)}.`);

    const available = carriedIn + earned;
    carriedSkillPoints = available - levelSpent;
    totalSkillPointsSpent += levelSpent;
    if (carriedSkillPoints < 0) errors.push(`Level ${level} spends ${Math.abs(carriedSkillPoints)} more skill points than available.`);
    levelResults.push({
      level,
      achievementPointsRequired: achievementPointsForLevel(level),
      skillPointsEarned: earned,
      carriedIn,
      spent: levelSpent,
      remaining: carriedSkillPoints,
      creditsAwarded: levelCreditAward,
      acquisitionCost: levelAcquisitionCost,
      creditsRemaining: campaignCredits,
      costs,
    });
  }

  if (state.psionicPlan.accessPath === 'talent') {
    if (psionicBroad.size > psionicRules.talentBroadSkillLimit) {
      errors.push(`A talent may have at most ${psionicRules.talentBroadSkillLimit} psionic broad skill.`);
    }
    const psionicRanksArray = Array.from(psionicRanks.values());
    if (psionicRanksArray.length > psionicRules.talentSpecialtySkillLimit) {
      errors.push(`A talent may have at most ${psionicRules.talentSpecialtySkillLimit} psionic specialty skills.`);
    }
    if (psionicRanksArray.filter((entry) => entry.rank > psionicRules.talentHighRankThreshold).length > psionicRules.talentHighRankSpecialtyLimit) {
      errors.push(`Only ${psionicRules.talentHighRankSpecialtyLimit} talent specialty skill may exceed rank ${psionicRules.talentHighRankThreshold}.`);
    }
  }

  const acquisitionLevels = acquisitions.map((entry) => ({ ...entry }));
  const finalEquipmentSelections = mergeEquipment(state.equipmentSelections, acquisitionLevels, errors);
  const finalWeaponSelections = mergeWeapons(state.weaponSelections, acquisitionLevels);
  const finalArmorSelections = mergeArmor(state.armorSelections, acquisitionLevels);
  const finalCybergearSelections = mergeCybergear(state.cybergearSelections, acquisitionLevels, errors);
  return {
    valid: errors.length === 0,
    errors,
    targetLevel,
    achievementPoints: achievementPointsForLevel(targetLevel),
    totalSkillPointsEarned,
    totalSkillPointsSpent,
    remainingSkillPoints: carriedSkillPoints,
    levelResults,
    finalCoreBroadSkillIds: Array.from(coreBroad),
    finalCoreSpecialtySkills: Array.from(coreRanks.values()),
    finalPsionicBroadSkillIds: Array.from(psionicBroad),
    finalPsionicSpecialtySkills: Array.from(psionicRanks.values()),
    finalFxBroadSkill: fxBroadSkill,
    finalFxAbilityPurchases: Array.from(fxAbilityRanks.values()),
    finalFxFaithPurchases: Array.from(fxFaithRanks.values()),
    currentMaximumFxEnergy,
    maximumFxEnergy: fxBroadSkill ? fxTone?.maximumEnergy || 0 : 0,
    abilityScoreBonuses,
    actionCheckBonusSteps,
    actionCheckScoreIncreases,
    extraActions,
    durabilityBonuses,
    currentLastResortPoints,
    addedPerks,
    removedFlawIds,
    acquiredContacts,
    campaignCreditsAwarded,
    acquisitionCost,
    remainingCredits: campaignCredits,
    acquisitions,
    finalEquipmentSelections,
    finalWeaponSelections,
    finalArmorSelections,
    finalCybergearSelections,
  };
}

export function normalizeAdvancementPlan(plan: AdvancementPlan, targetLevel: number): AdvancementPlan {
  const existing = new Map((plan.levels || []).map((entry) => [entry.level, entry]));
  return {
    levels: Array.from({ length: Math.max(0, targetLevel - 1) }, (_value, index) => index + 2)
      .map((level) => existing.get(level) || createEmptyAdvancementLevel(level)),
  };
}
