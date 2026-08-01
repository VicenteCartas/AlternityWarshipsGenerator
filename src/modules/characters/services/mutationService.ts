import type {
  AbilityId,
  AbilityScores,
  DurabilityStats,
  MutationDefinition,
  MutationPlan,
  MutationResult,
  MutationSelection,
  SpeciesDefinition,
} from '../types/character';

const RELATED_ABILITY: Record<AbilityId, AbilityId> = {
  str: 'int',
  dex: 'str',
  con: 'dex',
  int: 'per',
  wil: 'con',
  per: 'wil',
};

const TIER_LIMITS = { ordinary: 3, good: 2, amazing: 1 } as const;

function applyAbilityEffect(effectId: string, scores: AbilityScores): void {
  const match = /^ability-(str|dex|con|int|wil|per)-(plus|minus)-(\d)$/.exec(effectId);
  if (!match) return;
  const ability = match[1] as AbilityId;
  const delta = Number(match[3]) * (match[2] === 'plus' ? 1 : -1);
  scores[ability] += delta;
}

function linkedAbility(
  selection: MutationSelection,
  selectedMutationById: Map<string, MutationDefinition>,
): AbilityId | null {
  if (!selection.linkedMutationId) return null;
  const linked = selectedMutationById.get(selection.linkedMutationId);
  return linked?.ability ? RELATED_ABILITY[linked.ability] : null;
}

export function evaluateMutationPlan(
  plan: MutationPlan,
  baseScores: AbilityScores,
  species: SpeciesDefinition,
  definitions: MutationDefinition[],
): MutationResult {
  const errors: string[] = [];
  const definitionById = new Map(definitions.map((definition) => [definition.id, definition]));
  const selectedIds = new Set<string>();
  const selectedMutationById = new Map<string, MutationDefinition>();
  const selectedFamilies = new Map<string, string>();
  const effectiveAbilityScores = { ...baseScores };
  const durabilityBonuses: DurabilityStats = { stun: 0, wound: 0, mortal: 0, fatigue: 0 };
  const effectIds: string[] = [];
  const advantageTierCounts = { ordinary: 0, good: 0, amazing: 0 };
  let spentAdvantagePoints = 0;
  let spentDrawbackPoints = 0;
  let actionCheckModifier = 0;

  if (species.id !== 'mutant-human') {
    errors.push('Only a Mutant Human may select a PHB mutation package.');
  }
  if (plan.advantagePointBudget < 1 || plan.drawbackPointBudget < 1) {
    errors.push('A mutant must have at least 1 advantageous point and 1 drawback point.');
  }

  for (const selection of plan.selections) {
    const definition = definitionById.get(selection.mutationId);
    if (!definition) {
      errors.push(`Unknown mutation ${selection.mutationId}.`);
      continue;
    }
    if (selectedIds.has(definition.id)) {
      errors.push(`${definition.name} is selected more than once.`);
      continue;
    }
    selectedIds.add(definition.id);
    selectedMutationById.set(definition.id, definition);

    if (definition.familyId) {
      const existing = selectedFamilies.get(definition.familyId);
      if (existing) errors.push(`${definition.name} conflicts with ${existing}.`);
      else selectedFamilies.set(definition.familyId, definition.name);
    }
    if (definition.requiresNotes && !(selection.notes || '').trim()) {
      errors.push(`${definition.name} requires a specific form or target.`);
    }
    if (definition.requiresLinkedMutation && !selection.linkedMutationId) {
      errors.push(`${definition.name} requires a linked advantageous mutation.`);
    }

    if (definition.kind === 'advantage') {
      spentAdvantagePoints += definition.cost;
      advantageTierCounts[definition.tier as keyof typeof advantageTierCounts] += 1;
    } else {
      spentDrawbackPoints += definition.cost;
    }
    effectIds.push(...definition.effectIds);
  }

  if (spentAdvantagePoints !== plan.advantagePointBudget) {
    errors.push(`Advantage mutations spend ${spentAdvantagePoints} of ${plan.advantagePointBudget} points.`);
  }
  if (spentDrawbackPoints !== plan.drawbackPointBudget) {
    errors.push(`Mutation drawbacks spend ${spentDrawbackPoints} of ${plan.drawbackPointBudget} points.`);
  }
  for (const [tier, limit] of Object.entries(TIER_LIMITS)) {
    const count = advantageTierCounts[tier as keyof typeof advantageTierCounts];
    if (count > limit) errors.push(`A mutant may have at most ${limit} ${tier} advantageous mutation${limit === 1 ? '' : 's'}.`);
  }

  for (const selection of plan.selections) {
    const definition = selectedMutationById.get(selection.mutationId);
    if (!definition) continue;
    for (const effectId of definition.effectIds) applyAbilityEffect(effectId, effectiveAbilityScores);

    if (definition.id.startsWith('reduced-ability-')) {
      const ability = linkedAbility(selection, selectedMutationById);
      const amount = definition.tier === 'slight' ? 1 : definition.tier === 'moderate' ? 2 : 3;
      if (!ability) {
        errors.push(`${definition.name} must link to a selected mutation with an associated Ability.`);
      } else {
        effectiveAbilityScores[ability] -= amount;
      }
    }
  }

  for (const ability of Object.keys(effectiveAbilityScores) as AbilityId[]) {
    if (effectiveAbilityScores[ability] < 0) {
      errors.push(`${ability.toUpperCase()} cannot be reduced below 0 by mutations.`);
    }
  }

  if (effectIds.includes('stun-plus-3')) durabilityBonuses.stun += 3;
  if (effectIds.includes('wound-plus-3')) durabilityBonuses.wound += 3;
  if (effectIds.includes('mortal-plus-3')) durabilityBonuses.mortal += 3;
  if (effectIds.includes('action-check-minus-1')) actionCheckModifier -= 1;
  if (effectIds.includes('action-check-minus-2')) actionCheckModifier -= 2;
  if (effectIds.includes('action-check-minus-3')) actionCheckModifier -= 3;
  if (effectIds.includes('action-check-plus-1')) actionCheckModifier += 1;

  return {
    valid: errors.length === 0,
    errors,
    spentAdvantagePoints,
    spentDrawbackPoints,
    effectiveAbilityScores,
    durabilityBonuses,
    actionCheckModifier,
    effectIds,
  };
}