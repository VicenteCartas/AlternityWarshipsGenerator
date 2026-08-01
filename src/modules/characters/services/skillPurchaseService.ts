import { calculateSkillBudget } from './characterCalculationService';
import type {
  AbilityScores,
  CharacterRules,
  ProfessionDefinition,
  SkillDefinition,
  SkillPurchaseCost,
  SkillPurchasePlan,
  SkillPurchaseResult,
  SpeciesDefinition,
} from '../types/character';

function normalizedSpecialization(value: string | undefined): string {
  return (value || '').trim().toLocaleLowerCase();
}

export function calculateSkillListCost(skill: SkillDefinition, discountProfessionIds: Set<string>): number {
  const receivesDiscount = skill.professionIds.some((id) => discountProfessionIds.has(id));
  return Math.max(1, skill.listedCost - (receivesDiscount ? 1 : 0));
}

export function calculateSpecialtyPurchaseCost(
  skill: SkillDefinition,
  rank: number,
  discountProfessionIds: Set<string>,
): number {
  const rankOneCost = calculateSkillListCost(skill, discountProfessionIds);
  let total = 0;
  for (let currentRank = 0; currentRank < rank; currentRank += 1) {
    total += rankOneCost + currentRank;
  }
  return total;
}

export function evaluateSkillPurchasePlan(
  plan: SkillPurchasePlan,
  scores: AbilityScores,
  species: SpeciesDefinition,
  profession: ProfessionDefinition | null,
  skills: SkillDefinition[],
  professions: ProfessionDefinition[],
  rules: CharacterRules,
): SkillPurchaseResult {
  const errors: string[] = [];
  const costs: SkillPurchaseCost[] = [];
  const skillById = new Map(skills.map((skill) => [skill.id, skill]));
  const professionById = new Map(professions.map((entry) => [entry.id, entry]));
  const nativeLanguage = plan.nativeLanguage.trim();
  const normalizedNativeLanguage = normalizedSpecialization(nativeLanguage);
  if (!nativeLanguage) errors.push('A native language is required; it is granted at rank 3 for free.');
  const freeBroadSkillIds = new Set(species.freeBroadSkillIds || []);
  const cashedInIds = new Set<string>();

  for (const skillId of plan.cashedInFreeBroadSkillIds || []) {
    if (cashedInIds.has(skillId)) {
      errors.push(`Free broad skill ${skillId} is surrendered more than once.`);
      continue;
    }
    if (!freeBroadSkillIds.has(skillId)) {
      errors.push(`${skillId} is not a free broad skill for ${species.name}.`);
      continue;
    }
    cashedInIds.add(skillId);
  }

  const retainedFreeBroadSkillIds = (species.freeBroadSkillIds || [])
    .filter((skillId) => !cashedInIds.has(skillId));
  const trainedBroadSkillIds = new Set(retainedFreeBroadSkillIds);
  const discountProfessionIds = new Set<string>();
  if (profession) discountProfessionIds.add(profession.id);

  const additionalDiscountIds: string[] = [];
  for (const professionId of new Set(plan.additionalDiscountProfessionIds || [])) {
    if (!professionById.has(professionId)) {
      errors.push(`Unknown additional profession ${professionId}.`);
      continue;
    }
    if (professionId === profession?.id) {
      errors.push(`${profession.name} is already the hero's primary profession.`);
      continue;
    }
    additionalDiscountIds.push(professionId);
  }

  const allowedAdditionalProfessions = profession?.additionalSkillDiscountProfessionCount ?? 0;
  if (additionalDiscountIds.length > allowedAdditionalProfessions) {
    errors.push(
      `${profession?.name || 'This profession'} allows ${allowedAdditionalProfessions} additional skill-discount profession${allowedAdditionalProfessions === 1 ? '' : 's'}.`,
    );
  }
  for (const professionId of additionalDiscountIds.slice(0, allowedAdditionalProfessions)) {
    discountProfessionIds.add(professionId);
  }

  const purchasedBroadIds = new Set<string>();
  for (const skillId of plan.purchasedBroadSkillIds || []) {
    if (purchasedBroadIds.has(skillId)) {
      errors.push(`Broad skill ${skillId} is purchased more than once.`);
      continue;
    }
    purchasedBroadIds.add(skillId);

    const skill = skillById.get(skillId);
    if (!skill) {
      errors.push(`Unknown broad skill ${skillId}.`);
      continue;
    }
    if (skill.kind !== 'broad') {
      errors.push(`${skill.name} is a specialty skill, not a broad skill.`);
      continue;
    }
    if (retainedFreeBroadSkillIds.includes(skillId)) {
      errors.push(`${skill.name} is already retained as a free broad skill.`);
      continue;
    }

    trainedBroadSkillIds.add(skillId);
    costs.push({
      skillId,
      name: skill.name,
      kind: 'broad',
      cost: calculateSkillListCost(skill, discountProfessionIds),
    });
  }

  const skillBudget = calculateSkillBudget(scores.int, species, rules);
  const purchasedBroadSkillCount = costs.filter((entry) => entry.kind === 'broad').length;
  if (purchasedBroadSkillCount > skillBudget.maxPurchasedBroadSkills) {
    errors.push(
      `Purchased broad skills exceed the limit of ${skillBudget.maxPurchasedBroadSkills} by ${purchasedBroadSkillCount - skillBudget.maxPurchasedBroadSkills}.`,
    );
  }

  const specialtyKeys = new Set<string>();
  for (const purchase of plan.specialtySkills || []) {
    const skill = skillById.get(purchase.skillId);
    if (!skill) {
      errors.push(`Unknown specialty skill ${purchase.skillId}.`);
      continue;
    }
    if (skill.kind !== 'specialty') {
      errors.push(`${skill.name} is a broad skill, not a specialty skill.`);
      continue;
    }

    const specialization = normalizedSpecialization(purchase.specialization);
    if (skill.id === 'language' && specialization && specialization === normalizedNativeLanguage) {
      errors.push(`Language (${purchase.specialization?.trim()}) is already granted as the native language at rank 3.`);
      continue;
    }
    const purchaseKey = skill.requiresSpecialization
      ? `${purchase.skillId}:${specialization}`
      : purchase.skillId;
    if (specialtyKeys.has(purchaseKey)) {
      const specializationLabel = skill.requiresSpecialization && specialization
        ? ` (${purchase.specialization?.trim()})`
        : '';
      errors.push(`${skill.name}${specializationLabel} is purchased more than once.`);
      continue;
    }
    specialtyKeys.add(purchaseKey);

    if (!Number.isInteger(purchase.rank) || purchase.rank < 1) {
      errors.push(`${skill.name} must have a positive whole-number rank.`);
      continue;
    }
    if (purchase.rank > rules.startingSpecialtyRankLimit) {
      errors.push(`${skill.name} exceeds the starting rank limit of ${rules.startingSpecialtyRankLimit}.`);
    }
    if (purchase.rank > rules.maximumSpecialtyRank) {
      errors.push(`${skill.name} exceeds the maximum rank of ${rules.maximumSpecialtyRank}.`);
    }
    if (!skill.parentSkillId || !trainedBroadSkillIds.has(skill.parentSkillId)) {
      const parentName = skill.parentSkillId
        ? skillById.get(skill.parentSkillId)?.name || skill.parentSkillId
        : 'its broad skill';
      errors.push(`${skill.name} requires the ${parentName} broad skill.`);
    }
    if (skill.requiresSpecialization && !specialization) {
      errors.push(`${skill.name} requires a specific subject.`);
    }

    costs.push({
      skillId: skill.id,
      name: skill.name,
      kind: 'specialty',
      rank: purchase.rank,
      specialization: purchase.specialization?.trim() || undefined,
      cost: calculateSpecialtyPurchaseCost(skill, purchase.rank, discountProfessionIds),
    });
  }

  const cashedInSkillPoints = cashedInIds.size * rules.freeBroadSkillCashInValue;
  const availableSkillPoints = skillBudget.totalSkillPoints
    + cashedInSkillPoints
    + (plan.skillPointAdjustment ?? 0);
  const spentSkillPoints = costs.reduce((sum, entry) => sum + entry.cost, 0);
  const remainingSkillPoints = availableSkillPoints - spentSkillPoints;
  if (remainingSkillPoints < 0) {
    errors.push(`Skill purchases exceed the available points by ${Math.abs(remainingSkillPoints)}.`);
  }

  return {
    valid: errors.length === 0,
    errors,
    baseSkillPoints: skillBudget.baseSkillPoints,
    speciesSkillPointBonus: species.startingSkillPointBonus,
    cashedInSkillPoints,
    availableSkillPoints,
    spentSkillPoints,
    remainingSkillPoints,
    purchasedBroadSkillCount,
    maxPurchasedBroadSkills: skillBudget.maxPurchasedBroadSkills,
    retainedFreeBroadSkillIds,
    trainedBroadSkillIds: Array.from(trainedBroadSkillIds),
    skillDiscountProfessionIds: Array.from(discountProfessionIds),
    nativeLanguage,
    nativeLanguageRank: 3,
    costs,
  };
}