import type {
  AbilityScores,
  CharacterOptionDefinition,
  CharacterOptionResult,
  CharacterOptionSelection,
  DurabilityStats,
  ResistanceAbilityId,
  SpeciesDefinition,
} from '../types/character';

function selectedOptionValue(
  definition: CharacterOptionDefinition,
  selection: CharacterOptionSelection,
  errors: string[],
): { value: number; effectIds: string[] } {
  if (definition.choices) {
    const selectedChoiceIds = selection.choiceIds || [];
    if (selectedChoiceIds.length === 0) {
      errors.push(`${definition.name} requires at least one benefit choice.`);
      return { value: 0, effectIds: [] };
    }
    const duplicateChoice = selectedChoiceIds.find(
      (choiceId, index) => selectedChoiceIds.indexOf(choiceId) !== index,
    );
    if (duplicateChoice) errors.push(`${definition.name} choice ${duplicateChoice} is selected more than once.`);

    const choices = selectedChoiceIds.map((choiceId) => definition.choices!.find((choice) => choice.id === choiceId));
    for (let index = 0; index < choices.length; index += 1) {
      if (!choices[index]) errors.push(`Unknown ${definition.name} choice ${selectedChoiceIds[index]}.`);
    }
    return {
      value: choices.reduce((sum, choice) => sum + (choice?.value || 0), 0),
      effectIds: choices.flatMap((choice) => choice?.effectId ? [choice.effectId] : []),
    };
  }

  const value = selection.value ?? (definition.values.length === 1 ? definition.values[0] : undefined);
  if (value === undefined || !definition.values.includes(value)) {
    errors.push(`${definition.name} requires one of these values: ${definition.values.join(', ')}.`);
    return { value: 0, effectIds: definition.effectIds };
  }
  return { value, effectIds: definition.effectIds };
}

function tierPenalty(value: number): number {
  return value === 2 ? 1 : value === 4 ? 2 : 3;
}

export function evaluateCharacterOptions(
  selections: CharacterOptionSelection[],
  baseScores: AbilityScores,
  species: SpeciesDefinition,
  definitions: CharacterOptionDefinition[],
  psionicsEnabled: boolean,
): CharacterOptionResult {
  const errors: string[] = [];
  const definitionById = new Map(definitions.map((definition) => [definition.id, definition]));
  const selectedIds = new Set<string>();
  const effectiveAbilityScores = { ...baseScores };
  const resistanceModifierBonuses: Partial<Record<ResistanceAbilityId, number>> = {};
  const durabilityBonuses: DurabilityStats = { stun: 0, wound: 0, mortal: 0, fatigue: 0 };
  const effectIds: string[] = [];
  let perkCount = 0;
  let flawCount = 0;
  let spentPerkPoints = 0;
  let gainedFlawPoints = 0;
  let wealthOptionId: CharacterOptionResult['wealthOptionId'] = null;

  for (const selection of selections) {
    const definition = definitionById.get(selection.optionId);
    if (!definition) {
      errors.push(`Unknown character option ${selection.optionId}.`);
      continue;
    }
    if (selectedIds.has(definition.id)) {
      errors.push(`${definition.name} is selected more than once.`);
      continue;
    }
    selectedIds.add(definition.id);

    if (definition.kind === 'perk') perkCount += 1;
    else flawCount += 1;

    if (definition.requiresPsionics && !psionicsEnabled) {
      errors.push(`${definition.name} requires psionics to be enabled.`);
    }
    if (definition.requiresNotes && !(selection.notes || '').trim()) {
      errors.push(`${definition.name} requires a short description.`);
    }
    if (definition.requiresTargetAbility && !selection.targetAbility) {
      errors.push(`${definition.name} requires an Ability choice.`);
    }

    const selected = selectedOptionValue(definition, selection, errors);
    effectIds.push(...selected.effectIds);
    if (definition.kind === 'perk') spentPerkPoints += selected.value;
    else gainedFlawPoints += selected.value;

    if (definition.id === 'heightened-ability' && selection.targetAbility) {
      const targetAbility = selection.targetAbility;
      if (baseScores[targetAbility] >= species.abilityLimits[targetAbility].max) {
        errors.push(`Heightened Ability cannot raise ${targetAbility.toUpperCase()} above the ${species.name} maximum.`);
      } else {
        effectiveAbilityScores[targetAbility] += 1;
      }
    }
    if (definition.id === 'reflexes') resistanceModifierBonuses.dex = 1;
    if (definition.id === 'tough-as-nails') resistanceModifierBonuses.str = 1;
    if (definition.id === 'willpower') resistanceModifierBonuses.wil = 1;
    if (definition.id === 'spineless') resistanceModifierBonuses.wil = -tierPenalty(selected.value);

    if (selected.effectIds.includes('stun-plus-one')) durabilityBonuses.stun += 1;
    if (selected.effectIds.includes('wound-plus-one')) durabilityBonuses.wound += 1;
    if (selected.effectIds.includes('mortal-fatigue-plus-one')) {
      durabilityBonuses.mortal += 1;
      durabilityBonuses.fatigue += 1;
    }
    if (definition.id === 'filthy-rich') wealthOptionId = 'filthy-rich';
    if (definition.id === 'dirt-poor') wealthOptionId = 'dirt-poor';
  }

  if (perkCount > 3) errors.push(`A starting hero may have at most 3 perks; ${perkCount} were selected.`);
  if (flawCount > 3) errors.push(`A starting hero may have at most 3 flaws; ${flawCount} were selected.`);
  if (selectedIds.has('filthy-rich') && selectedIds.has('dirt-poor')) {
    errors.push('Filthy Rich and Dirt Poor cannot both be selected.');
  }

  return {
    valid: errors.length === 0,
    errors,
    perkCount,
    flawCount,
    spentPerkPoints,
    gainedFlawPoints,
    skillPointAdjustment: gainedFlawPoints - spentPerkPoints,
    effectiveAbilityScores,
    resistanceModifierBonuses,
    durabilityBonuses,
    wealthOptionId,
    effectIds,
  };
}