import type {
  AbilityScores,
  ProfessionDefinition,
  PsionicAccessPath,
  PsionicCheckOutcome,
  PsionicEnergyRecoveryResult,
  PsionicEnergyUseResult,
  PsionicPurchaseCost,
  PsionicPurchasePlan,
  PsionicPurchaseResult,
  PsionicRules,
  PsionicSkillBudgetContext,
  PsionicSkillDefinition,
  SkillKind,
  SpecialtySkillCostRule,
  SpeciesDefinition,
} from '../types/character';

function psionicListCost(
  skill: PsionicSkillDefinition,
  accessPath: PsionicAccessPath,
  rules: PsionicRules,
): number {
  if (accessPath === 'talent') return skill.listedCost + rules.talentCostSurcharge;
  if (accessPath === 'diplomat-mindwalker') return Math.max(1, skill.listedCost - 1);
  return skill.listedCost;
}

function psionicSpecialtyCost(
  skill: PsionicSkillDefinition,
  rank: number,
  accessPath: PsionicAccessPath,
  rules: PsionicRules,
  costRule: SpecialtySkillCostRule,
): number {
  const rankOneCost = psionicListCost(skill, accessPath, rules);
  let total = 0;
  for (let currentRank = 0; currentRank < rank; currentRank += 1) {
    total += rankOneCost + (costRule === 'optional-2c' ? 0 : currentRank);
  }
  return total;
}

function validateAccessPath(
  accessPath: PsionicAccessPath,
  profession: ProfessionDefinition | null,
  errors: string[],
): void {
  if (accessPath === 'mindwalker' && profession?.id !== 'mindwalker') {
    errors.push('The Mindwalker path requires the Mindwalker profession.');
  }
  if (accessPath === 'diplomat-mindwalker' && profession?.id !== 'diplomat') {
    errors.push('The Diplomat/Mindwalker path requires the Diplomat profession.');
  }
  if (accessPath === 'talent' && profession?.id === 'mindwalker') {
    errors.push('A Mindwalker uses the Mindwalker path rather than the talent path.');
  }
}

export function calculateMaximumPsionicEnergy(
  scores: AbilityScores,
  species: SpeciesDefinition,
  accessPath: PsionicAccessPath,
): number {
  if (accessPath === 'none') return 0;

  if (species.id === 'fraal') {
    return accessPath === 'mindwalker'
      ? Math.ceil(scores.wil * 1.5)
      : scores.wil;
  }

  return accessPath === 'mindwalker'
    ? scores.wil
    : Math.ceil(scores.wil / 2);
}

export function calculatePsionicBaseSituationStep(
  skill: PsionicSkillDefinition,
  favoredBroadSkillId?: string,
): number {
  const baseStep = skill.kind === 'broad' ? 1 : 0;
  const receivesBonus = skill.id === favoredBroadSkillId || skill.parentSkillId === favoredBroadSkillId;
  return baseStep - (receivesBonus ? 1 : 0);
}

export function evaluatePsionicPurchasePlan(
  plan: PsionicPurchasePlan,
  scores: AbilityScores,
  species: SpeciesDefinition,
  profession: ProfessionDefinition | null,
  skillBudget: PsionicSkillBudgetContext,
  skills: PsionicSkillDefinition[],
  rules: PsionicRules,
  startingSpecialtyRankLimit: number,
  specialtySkillCostRule: SpecialtySkillCostRule = 'standard',
): PsionicPurchaseResult {
  const errors: string[] = [];
  const costs: PsionicPurchaseCost[] = [];
  const skillById = new Map(skills.map((skill) => [skill.id, skill]));
  const retainedFreeBroadSkillIds = skillBudget.retainedFreeBroadSkillIds
    .filter((skillId) => skillById.get(skillId)?.kind === 'broad');
  const trainedBroadSkillIds = new Set(retainedFreeBroadSkillIds);
  const purchasedBroadSkillIds = new Set<string>();

  validateAccessPath(plan.accessPath, profession, errors);
  if (
    plan.accessPath === 'diplomat-mindwalker'
    && !skillBudget.skillDiscountProfessionIds.includes('mindwalker')
  ) {
    errors.push('The Diplomat must select Mindwalker as the secondary profession.');
  }

  if (plan.accessPath === 'none') {
    if ((plan.purchasedBroadSkillIds || []).length > 0 || (plan.specialtySkills || []).length > 0) {
      errors.push('A hero without a psionic path cannot purchase psionic skills.');
    }
    if (plan.favoredBroadSkillId) {
      errors.push('Only a Mindwalker may select a favored psionic broad skill.');
    }
  }

  for (const skillId of plan.purchasedBroadSkillIds || []) {
    if (purchasedBroadSkillIds.has(skillId)) {
      errors.push(`Psionic broad skill ${skillId} is purchased more than once.`);
      continue;
    }
    purchasedBroadSkillIds.add(skillId);

    const skill = skillById.get(skillId);
    if (!skill) {
      errors.push(`Unknown psionic broad skill ${skillId}.`);
      continue;
    }
    if (skill.kind !== 'broad') {
      errors.push(`${skill.name} is a psionic specialty skill, not a broad skill.`);
      continue;
    }
    if (trainedBroadSkillIds.has(skillId)) {
      errors.push(`${skill.name} is already retained as a free broad skill.`);
      continue;
    }

    trainedBroadSkillIds.add(skillId);
    costs.push({
      skillId,
      name: skill.name,
      kind: 'broad',
      cost: psionicListCost(skill, plan.accessPath, rules),
    });
  }

  const purchasedPsionicBroadSkillCount = costs.filter((cost) => cost.kind === 'broad').length;
  if (plan.accessPath === 'talent') {
    if (trainedBroadSkillIds.size > rules.talentBroadSkillLimit) {
      errors.push(`A talent may have at most ${rules.talentBroadSkillLimit} psionic broad skill.`);
    }
    if (species.id === 'fraal' && Array.from(trainedBroadSkillIds).some((id) => id !== 'telepathy')) {
      errors.push('A Fraal talent must use Telepathy as the talent broad skill.');
    }
  } else if (plan.accessPath === 'mindwalker' || plan.accessPath === 'diplomat-mindwalker') {
    const combinedBroadSkillCount = skillBudget.purchasedBroadSkillCount + purchasedPsionicBroadSkillCount;
    if (combinedBroadSkillCount > skillBudget.maxPurchasedBroadSkills) {
      errors.push(
        `Core and psionic broad skills exceed the limit of ${skillBudget.maxPurchasedBroadSkills} by ${combinedBroadSkillCount - skillBudget.maxPurchasedBroadSkills}.`,
      );
    }
  }

  const specialtySkillIds = new Set<string>();
  let highRankSpecialtyCount = 0;
  for (const purchase of plan.specialtySkills || []) {
    const skill = skillById.get(purchase.skillId);
    if (!skill) {
      errors.push(`Unknown psionic specialty skill ${purchase.skillId}.`);
      continue;
    }
    if (skill.kind !== 'specialty') {
      errors.push(`${skill.name} is a psionic broad skill, not a specialty skill.`);
      continue;
    }
    if (specialtySkillIds.has(skill.id)) {
      errors.push(`${skill.name} is purchased more than once.`);
      continue;
    }
    specialtySkillIds.add(skill.id);

    if (!Number.isInteger(purchase.rank) || purchase.rank < 1) {
      errors.push(`${skill.name} must have a positive whole-number rank.`);
      continue;
    }
    if (!skill.parentSkillId || !trainedBroadSkillIds.has(skill.parentSkillId)) {
      const parentName = skill.parentSkillId
        ? skillById.get(skill.parentSkillId)?.name || skill.parentSkillId
        : 'its broad skill';
      errors.push(`${skill.name} requires the ${parentName} psionic broad skill.`);
    }

    if (plan.accessPath === 'talent') {
      if (purchase.rank > rules.talentMaximumSpecialtyRank) {
        errors.push(`${skill.name} exceeds the talent rank limit of ${rules.talentMaximumSpecialtyRank}.`);
      }
      if (purchase.rank > rules.talentHighRankThreshold) highRankSpecialtyCount += 1;
    } else if (purchase.rank > startingSpecialtyRankLimit) {
      errors.push(`${skill.name} exceeds the starting rank limit of ${startingSpecialtyRankLimit}.`);
    }

    costs.push({
      skillId: skill.id,
      name: skill.name,
      kind: 'specialty',
      rank: purchase.rank,
      cost: psionicSpecialtyCost(
        skill,
        purchase.rank,
        plan.accessPath,
        rules,
        specialtySkillCostRule,
      ),
    });
  }

  if (plan.accessPath === 'talent') {
    if (specialtySkillIds.size > rules.talentSpecialtySkillLimit) {
      errors.push(`A talent may have at most ${rules.talentSpecialtySkillLimit} psionic specialty skills.`);
    }
    if (highRankSpecialtyCount > rules.talentHighRankSpecialtyLimit) {
      errors.push(
        `Only ${rules.talentHighRankSpecialtyLimit} talent specialty skill may exceed rank ${rules.talentHighRankThreshold}.`,
      );
    }
  }

  if (plan.accessPath === 'mindwalker') {
    const favoredSkill = plan.favoredBroadSkillId
      ? skillById.get(plan.favoredBroadSkillId)
      : undefined;
    if (!favoredSkill || favoredSkill.kind !== 'broad') {
      errors.push('A Mindwalker must select one psionic broad skill for the situation-die bonus.');
    }
  } else if (plan.favoredBroadSkillId) {
    errors.push('Only a primary Mindwalker may select a favored psionic broad skill.');
  }

  const spentSkillPoints = costs.reduce((sum, cost) => sum + cost.cost, 0);
  const remainingSkillPoints = skillBudget.remainingSkillPoints - spentSkillPoints;
  if (remainingSkillPoints < 0) {
    errors.push(`Psionic skill purchases exceed the remaining skill points by ${Math.abs(remainingSkillPoints)}.`);
  }

  return {
    valid: errors.length === 0,
    errors,
    accessPath: plan.accessPath,
    maximumEnergyPoints: calculateMaximumPsionicEnergy(scores, species, plan.accessPath),
    spentSkillPoints,
    remainingSkillPoints,
    purchasedBroadSkillCount: purchasedPsionicBroadSkillCount,
    trainedBroadSkillIds: Array.from(trainedBroadSkillIds),
    costs,
  };
}

export function resolvePsionicEnergyUse(
  currentEnergyPoints: number,
  skillKind: SkillKind,
  outcome: PsionicCheckOutcome,
  rules: PsionicRules,
): PsionicEnergyUseResult {
  const normalCost = skillKind === 'broad'
    ? rules.broadSkillEnergyCost
    : rules.specialtySkillEnergyCost;
  const requiredEnergyPoints = outcome === 'criticalFailure'
    ? rules.criticalFailureEnergyCost
    : normalCost;
  const canAttempt = currentEnergyPoints >= normalCost;
  if (!canAttempt) {
    return {
      canAttempt: false,
      requiredEnergyPoints,
      spentEnergyPoints: 0,
      remainingEnergyPoints: Math.max(0, currentEnergyPoints),
      fatigueDamage: 0,
    };
  }

  return {
    canAttempt: true,
    requiredEnergyPoints,
    spentEnergyPoints: Math.min(currentEnergyPoints, requiredEnergyPoints),
    remainingEnergyPoints: Math.max(0, currentEnergyPoints - requiredEnergyPoints),
    fatigueDamage: Math.max(0, requiredEnergyPoints - currentEnergyPoints),
  };
}

export function calculateExtendedPsionicEnergyCost(durationUnits: number, rules: PsionicRules): number {
  return Math.max(0, Math.floor(durationUnits)) * rules.extendedDurationEnergyCost;
}

export function resolveHourlyPsionicEnergyRecovery(
  currentEnergyPoints: number,
  maximumEnergyPoints: number,
  outcome: PsionicCheckOutcome,
  rules: PsionicRules,
): PsionicEnergyRecoveryResult {
  const recovery = rules.hourlyRecovery[outcome];
  const nextEnergyPoints = Math.min(maximumEnergyPoints, Math.max(0, currentEnergyPoints + recovery));
  return {
    recoveredEnergyPoints: Math.max(0, nextEnergyPoints - currentEnergyPoints),
    remainingEnergyPoints: nextEnergyPoints,
    fatigueDamage: recovery < 0 && currentEnergyPoints <= 0 ? 1 : 0,
  };
}

export function recoverPsionicEnergyAfterRest(
  currentEnergyPoints: number,
  maximumEnergyPoints: number,
  restHours: number,
  usedPsionicSkillDuringRest: boolean,
  rules: PsionicRules,
): number {
  if (usedPsionicSkillDuringRest || restHours < rules.fullRecoveryRestHours) {
    return currentEnergyPoints;
  }
  return maximumEnergyPoints;
}