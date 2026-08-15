import { ABILITY_IDS } from '../types/character';
import type {
  FxAbilityDesign,
  FxAbilityDesignResult,
  FxAbilityExportFile,
  FxAbilityImportResult,
  FxCheckOutcome,
  FxDiscipline,
  FxPlan,
  FxPurchaseCost,
  FxPurchaseResult,
  FxQuality,
  FxRankCostInput,
  FxRules,
  FxSkillBudgetContext,
} from '../types/fx';

const ARCANE_CATEGORIES = new Set(['augur', 'conjure', 'summon', 'transform']);
const SUPER_POWER_CATEGORIES = new Set(['enchanted-relic', 'extreme-ability', 'overscience-gadget']);
const QUALITY_REDUCTION: Record<FxQuality, number> = { ordinary: 1, good: 2, amazing: 3 };
export const FX_ABILITY_EXPORT_VERSION = '1.0';

export function generateFxAbilityDesignId(): string {
  return globalThis.crypto?.randomUUID?.() || `fx-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getFxQuality(effectCost: number): FxQuality | null {
  if (effectCost < 0 || effectCost > 15) return null;
  if (effectCost <= 5) return 'ordinary';
  if (effectCost <= 10) return 'good';
  return 'amazing';
}

export function calculateFxRankCost({
  baseCost,
  currentRank,
  specialtySkillCostRule,
}: FxRankCostInput): number {
  return baseCost + (specialtySkillCostRule === 'optional-2c' ? 0 : currentRank);
}

export function getFxAttemptEnergyCost(
  discipline: FxDiscipline,
  quality: FxQuality,
  outcome: FxCheckOutcome,
  rules: FxRules,
): number {
  const costs = rules.energyCosts[discipline];
  return outcome === 'criticalFailure' || outcome === 'failure'
    ? costs[outcome]
    : costs[quality];
}

function calculateTrappingReduction(design: FxAbilityDesign, quality: FxQuality): number {
  const trappings = design.trappings;
  if (design.discipline === 'arcane') {
    return (trappings.complexRitual ? QUALITY_REDUCTION[quality] : 0)
      + (trappings.component?.trim() ? 1 : 0)
      + (trappings.focus?.trim() ? 1 : 0);
  }

  const componentReduction = trappings.component?.trim()
    ? trappings.componentComplexity && trappings.componentComplexity !== 'simple'
      ? QUALITY_REDUCTION[trappings.componentComplexity]
      : 1
    : 0;
  return componentReduction
    + (trappings.limitation?.trim() ? 1 : 0)
    + (trappings.trigger?.trim() ? 1 : 0);
}

export function calculateFxAbilityDesign(
  design: FxAbilityDesign,
  rules: FxRules,
): FxAbilityDesignResult {
  const errors: string[] = [];
  if (!design.name.trim()) errors.push('FX ability name is required.');
  if (!design.description.trim()) errors.push('FX ability description is required.');
  if (!ABILITY_IDS.includes(design.ability)) errors.push('FX ability must use a valid associated Ability.');

  const validCategory = design.discipline === 'arcane'
    ? ARCANE_CATEGORIES.has(design.category)
    : SUPER_POWER_CATEGORIES.has(design.category);
  if (!validCategory) errors.push(`${design.category} is not valid for ${design.discipline}.`);
  if (design.characteristics.length === 0) errors.push('At least one FX characteristic is required.');

  const characteristicById = new Map(rules.characteristics.map((entry) => [entry.id, entry]));
  let effectCost = 0;
  for (const selection of design.characteristics) {
    const characteristic = characteristicById.get(selection.characteristicId);
    if (!characteristic) {
      errors.push(`Unknown FX characteristic ${selection.characteristicId}.`);
      continue;
    }
    const choice = characteristic.choices.find((entry) => entry.id === selection.choiceId);
    if (!choice) {
      errors.push(`Unknown choice ${selection.choiceId} for ${characteristic.label}.`);
      continue;
    }
    effectCost += choice.cost;
  }

  const quality = getFxQuality(effectCost);
  if (!quality) errors.push(`FX effect cost ${effectCost} exceeds the maximum of 15.`);

  const trappings = design.trappings;
  if (design.discipline === 'arcane') {
    if (trappings.limitation?.trim() || trappings.trigger?.trim() || trappings.componentComplexity) {
      errors.push('Arcane Magic may use a complex ritual, component, and focus only.');
    }
  } else {
    if (trappings.complexRitual || trappings.focus?.trim()) {
      errors.push('Super Power FX may use a limitation, trigger, and component only.');
    }
    if (trappings.componentComplexity && !trappings.component?.trim()) {
      errors.push('Component complexity requires a component description.');
    }
  }

  const trappingReduction = quality ? calculateTrappingReduction(design, quality) : 0;
  const purchaseCost = Math.max(1, effectCost - trappingReduction);
  return {
    valid: errors.length === 0,
    errors,
    effectCost,
    trappingReduction,
    purchaseCost,
    quality,
  };
}

function calculateRanksCost(baseCost: number, rank: number, costRule: FxRankCostInput['specialtySkillCostRule']): number {
  let total = 0;
  for (let currentRank = 0; currentRank < rank; currentRank += 1) {
    total += calculateFxRankCost({ baseCost, currentRank, specialtySkillCostRule: costRule });
  }
  return total;
}

export function evaluateFxPlan(
  plan: FxPlan,
  skillBudget: FxSkillBudgetContext,
  rules: FxRules,
  startingSpecialtyRankLimit: number,
  specialtySkillCostRule: FxRankCostInput['specialtySkillCostRule'],
  enabled: boolean,
): FxPurchaseResult {
  const errors: string[] = [];
  const costs: FxPurchaseCost[] = [];
  const designResults = plan.designs.map((design) => ({
    designId: design.id,
    ...calculateFxAbilityDesign(design, rules),
  }));
  const hasFxData = plan.campaignTone !== null
    || plan.broadSkill !== null
    || Boolean(plan.faithFocus?.trim())
    || plan.designs.length > 0
    || plan.abilityPurchases.length > 0
    || plan.faithPurchases.length > 0;

  if (!enabled && hasFxData) errors.push('GMG FX rules must be enabled to purchase or design FX abilities.');
  errors.push(...designResults.flatMap((result) => result.errors));

  const designIds = new Set<string>();
  for (const design of plan.designs) {
    if (designIds.has(design.id)) errors.push(`FX design ID ${design.id} appears more than once.`);
    designIds.add(design.id);
  }

  const broadDefinition = plan.broadSkill
    ? rules.broadSkills.find((entry) => entry.discipline === plan.broadSkill)
    : undefined;
  let purchasedBroadSkillCount = skillBudget.purchasedBroadSkillCount;
  if (plan.broadSkill) {
    if (!broadDefinition) errors.push(`Unknown FX broad skill ${plan.broadSkill}.`);
    else {
      costs.push({
        key: `broad:${broadDefinition.discipline}`,
        name: broadDefinition.name,
        kind: 'broad',
        cost: broadDefinition.cost,
      });
      purchasedBroadSkillCount += 1;
    }
    if (!plan.campaignTone) errors.push('Campaign tone is required when an FX broad skill is purchased.');
  } else if (plan.abilityPurchases.length > 0 || plan.faithPurchases.length > 0) {
    errors.push('An FX broad skill is required before purchasing FX specialty skills.');
  }

  if (purchasedBroadSkillCount > skillBudget.maxPurchasedBroadSkills) {
    errors.push(
      `Core, psionic, and FX broad skills exceed the limit of ${skillBudget.maxPurchasedBroadSkills} by ${purchasedBroadSkillCount - skillBudget.maxPurchasedBroadSkills}.`,
    );
  }

  if (plan.broadSkill === 'faith') {
    if (plan.designs.length > 0 || plan.abilityPurchases.length > 0) {
      errors.push('Faith uses fixed miracle specialties rather than designed FX abilities.');
    }
  } else if (plan.faithPurchases.length > 0) {
    errors.push('Miracle specialties require the Faith FX broad skill.');
  }

  const purchasedDesignIds = new Set<string>();
  for (const purchase of plan.abilityPurchases) {
    if (purchasedDesignIds.has(purchase.designId)) {
      errors.push(`FX design ${purchase.designId} is purchased more than once.`);
      continue;
    }
    purchasedDesignIds.add(purchase.designId);
    const design = plan.designs.find((entry) => entry.id === purchase.designId);
    const result = designResults.find((entry) => entry.designId === purchase.designId);
    if (!design || !result) {
      errors.push(`Unknown FX design ${purchase.designId}.`);
      continue;
    }
    if (design.discipline !== plan.broadSkill) {
      errors.push(`${design.name} requires the ${design.discipline} FX broad skill.`);
    }
    if (!Number.isInteger(purchase.rank) || purchase.rank < 1 || purchase.rank > startingSpecialtyRankLimit) {
      errors.push(`${design.name} starting rank must be from 1 to ${startingSpecialtyRankLimit}.`);
      continue;
    }
    if (!result.valid) continue;
    costs.push({
      key: `design:${design.id}`,
      name: design.name,
      kind: 'specialty',
      rank: purchase.rank,
      cost: calculateRanksCost(result.purchaseCost, purchase.rank, specialtySkillCostRule),
    });
  }

  const faithQualities = new Set<string>();
  for (const purchase of plan.faithPurchases) {
    if (faithQualities.has(purchase.quality)) {
      errors.push(`${purchase.quality} miracles are purchased more than once.`);
      continue;
    }
    faithQualities.add(purchase.quality);
    const definition = rules.faithSpecialties.find((entry) => entry.quality === purchase.quality);
    if (!definition) {
      errors.push(`Unknown Faith specialty ${purchase.quality}.`);
      continue;
    }
    if (!Number.isInteger(purchase.rank) || purchase.rank < 1 || purchase.rank > startingSpecialtyRankLimit) {
      errors.push(`${definition.name} starting rank must be from 1 to ${startingSpecialtyRankLimit}.`);
      continue;
    }
    costs.push({
      key: `faith:${definition.quality}`,
      name: definition.name,
      kind: 'specialty',
      rank: purchase.rank,
      cost: calculateRanksCost(definition.cost, purchase.rank, specialtySkillCostRule),
    });
  }

  const tone = plan.campaignTone
    ? rules.campaignTones.find((entry) => entry.id === plan.campaignTone)
    : undefined;
  if (plan.campaignTone && !tone) errors.push(`Unknown FX campaign tone ${plan.campaignTone}.`);

  const spentSkillPoints = costs.reduce((sum, entry) => sum + entry.cost, 0);
  const remainingSkillPoints = skillBudget.remainingSkillPoints - spentSkillPoints;
  if (remainingSkillPoints < 0) {
    errors.push(`FX purchases exceed the remaining skill points by ${Math.abs(remainingSkillPoints)}.`);
  }

  return {
    valid: errors.length === 0,
    errors,
    costs,
    spentSkillPoints,
    remainingSkillPoints,
    purchasedBroadSkillCount,
    startingEnergy: plan.broadSkill ? tone?.startingEnergy || 0 : 0,
    maximumEnergy: plan.broadSkill ? tone?.maximumEnergy || 0 : 0,
    currentMaximumEnergy: plan.broadSkill ? tone?.startingEnergy || 0 : 0,
    designResults,
  };
}

export function serializeFxAbilityDesigns(designs: FxAbilityDesign[]): string {
  const exportFile: FxAbilityExportFile = {
    version: FX_ABILITY_EXPORT_VERSION,
    sourcePackId: 'gmg-fx',
    designs,
  };
  return JSON.stringify(exportFile, null, 2);
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function readImportedDesign(value: unknown): FxAbilityDesign | null {
  const raw = record(value);
  const discipline = raw.discipline === 'arcane' || raw.discipline === 'super-power'
    ? raw.discipline
    : null;
  if (
    typeof raw.name !== 'string'
    || !discipline
    || typeof raw.category !== 'string'
    || !ABILITY_IDS.includes(raw.ability as FxAbilityDesign['ability'])
    || typeof raw.description !== 'string'
    || !Array.isArray(raw.characteristics)
  ) return null;

  const trappings = record(raw.trappings);
  return {
    id: generateFxAbilityDesignId(),
    name: raw.name,
    discipline,
    category: raw.category as FxAbilityDesign['category'],
    ability: raw.ability as FxAbilityDesign['ability'],
    description: raw.description,
    characteristics: raw.characteristics.map((entry) => record(entry)).filter((entry) => (
      typeof entry.characteristicId === 'string' && typeof entry.choiceId === 'string'
    )).map((entry) => ({
      characteristicId: entry.characteristicId as string,
      choiceId: entry.choiceId as string,
      ...(typeof entry.notes === 'string' ? { notes: entry.notes } : {}),
    })),
    trappings: {
      ...(trappings.complexRitual === true ? { complexRitual: true } : {}),
      ...(typeof trappings.ritual === 'string' ? { ritual: trappings.ritual } : {}),
      ...(typeof trappings.component === 'string' ? { component: trappings.component } : {}),
      ...(['simple', 'ordinary', 'good', 'amazing'].includes(trappings.componentComplexity as string)
        ? { componentComplexity: trappings.componentComplexity as FxAbilityDesign['trappings']['componentComplexity'] }
        : {}),
      ...(typeof trappings.focus === 'string' ? { focus: trappings.focus } : {}),
      ...(typeof trappings.limitation === 'string' ? { limitation: trappings.limitation } : {}),
      ...(typeof trappings.trigger === 'string' ? { trigger: trappings.trigger } : {}),
    },
  };
}

export function importFxAbilityDesigns(
  json: string,
  existingDesigns: FxAbilityDesign[],
  rules: FxRules,
): FxAbilityImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { designs: [], warnings: ['Invalid JSON file.'] };
  }

  const exportFile = record(parsed);
  if (!Array.isArray(exportFile.designs)) {
    return { designs: [], warnings: ['Invalid FX ability export format.'] };
  }

  const designs: FxAbilityDesign[] = [];
  const warnings: string[] = [];
  const names = new Set(existingDesigns.map((design) => design.name.trim().toLocaleLowerCase()));
  for (const rawDesign of exportFile.designs) {
    const design = readImportedDesign(rawDesign);
    const sourceName = record(rawDesign).name;
    if (!design) {
      warnings.push(`Skipped invalid FX design${typeof sourceName === 'string' ? ` "${sourceName}"` : ''}.`);
      continue;
    }
    const result = calculateFxAbilityDesign(design, rules);
    if (!result.valid) {
      warnings.push(`Skipped "${design.name}": ${result.errors.join(' ')}`);
      continue;
    }

    const originalName = design.name.trim();
    let name = originalName;
    let suffix = 1;
    while (names.has(name.toLocaleLowerCase())) {
      suffix += 1;
      name = suffix === 2 ? `${originalName} (imported)` : `${originalName} (imported ${suffix})`;
    }
    names.add(name.toLocaleLowerCase());
    designs.push({ ...design, name });
  }
  return { designs, warnings };
}