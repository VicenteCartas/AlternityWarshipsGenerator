import type {
  AbilityId,
  CybergearDefinition,
  CybergearResult,
  CybergearSelection,
  DurabilityStats,
  SpeciesDefinition,
} from '../types/character';

function effectBonus(effectIds: string[], prefix: string): number {
  return effectIds.reduce((sum, effectId) => {
    const match = new RegExp(`^${prefix}-plus-(\\d)$`).exec(effectId);
    return sum + (match ? Number(match[1]) : 0);
  }, 0);
}

export function calculateCyberTolerance(constitution: number, species: SpeciesDefinition): number {
  return constitution + (species.id === 'mechalus' ? 4 : 0);
}

export function evaluateCybergear(
  selections: CybergearSelection[],
  constitution: number,
  species: SpeciesDefinition,
  definitions: CybergearDefinition[],
  trainingSkillPointCost: number,
  cybertechEnabled: boolean,
  maximumProgressLevel = Number.POSITIVE_INFINITY,
): CybergearResult {
  const errors: string[] = [];
  const definitionById = new Map(definitions.map((definition) => [definition.id, definition]));
  const selectedIds = new Set<string>();
  const selectedGearIds = new Set(selections.map((selection) => selection.gearId));
  const hasNanocomputer = species.id === 'mechalus' || selectedGearIds.has('nanocomputer');
  const effectIds: string[] = [];
  const durabilityBonuses: DurabilityStats = { stun: 0, wound: 0, mortal: 0, fatigue: 0 };
  const abilityAdjustments: Partial<Record<AbilityId, number>> = {};
  let usedTolerance = 0;
  let equipmentCost = 0;
  let totalMass = 0;
  let requiresTraining = false;

  if (!cybertechEnabled && selections.length > 0) {
    errors.push('Cybertech must be enabled to install cybergear.');
  }

  for (const selection of selections) {
    const definition = definitionById.get(selection.gearId);
    if (!definition) {
      errors.push(`Unknown cybergear ${selection.gearId}.`);
      continue;
    }
    if (selectedIds.has(definition.id)) {
      errors.push(`${definition.name} is selected more than once; use quantity instead.`);
      continue;
    }
    selectedIds.add(definition.id);

    if (!Number.isInteger(selection.quantity) || selection.quantity < 1) {
      errors.push(`${definition.name} quantity must be a positive whole number.`);
      continue;
    }
    if (definition.progressLevel > maximumProgressLevel) {
      errors.push(`${definition.name} requires Progress Level ${definition.progressLevel}.`);
    }
    const quality = definition.qualities.find((entry) => entry.quality === selection.quality);
    if (!quality) {
      errors.push(`${definition.name} is not available at ${selection.quality} quality.`);
      continue;
    }
    if (definition.requiresNanocomputer && !hasNanocomputer) {
      errors.push(`${definition.name} requires a nanocomputer.`);
    }

    usedTolerance += quality.size * selection.quantity;
    equipmentCost += quality.cost * selection.quantity;
    totalMass += (quality.mass || 0) * selection.quantity;
    requiresTraining ||= !definition.freeSkillPointTraining;
    effectIds.push(...definition.effectIds, ...quality.effectIds);
  }

  if (effectIds.includes('requires-exoskeleton') && !selectedGearIds.has('exoskeleton')) {
    errors.push('The selected cybergear requires an Exoskeleton.');
  }
  if (effectIds.includes('requires-cyberlimb') && !selectedGearIds.has('cyberlimb')) {
    errors.push('The selected cybergear requires a Cyberlimb.');
  }

  const cyberTolerance = calculateCyberTolerance(constitution, species);
  if (usedTolerance > cyberTolerance) {
    errors.push(`Cybergear uses ${usedTolerance} tolerance, exceeding the limit of ${cyberTolerance}.`);
  }

  durabilityBonuses.stun = effectBonus(effectIds, 'stun');
  durabilityBonuses.wound = effectBonus(effectIds, 'wound');
  durabilityBonuses.mortal = effectBonus(effectIds, 'mortal');
  const dexterityPenalty = effectIds.reduce((sum, effectId) => {
    const match = /^ability-dex-minus-(\d)$/.exec(effectId);
    return sum + (match ? Number(match[1]) : 0);
  }, 0);
  if (dexterityPenalty > 0) abilityAdjustments.dex = -dexterityPenalty;

  return {
    valid: errors.length === 0,
    errors,
    cyberTolerance,
    usedTolerance,
    remainingTolerance: cyberTolerance - usedTolerance,
    requiresAcceptanceCheck: species.id !== 'mechalus' && usedTolerance > Math.floor(cyberTolerance / 2),
    trainingSkillPointCost: requiresTraining ? trainingSkillPointCost : 0,
    equipmentCost,
    totalMass,
    durabilityBonuses,
    abilityAdjustments,
    effectIds,
  };
}