import type {
  CharacterRuleSection,
  CharacterSourcePackDefinition,
  CharacterSourcePackResolution,
} from '../types/sourcePack';

function parseReplacement(reference: string): { sourcePackId: string; section: CharacterRuleSection } | null {
  const separatorIndex = reference.indexOf(':');
  if (separatorIndex <= 0 || separatorIndex === reference.length - 1) return null;
  return {
    sourcePackId: reference.slice(0, separatorIndex),
    section: reference.slice(separatorIndex + 1) as CharacterRuleSection,
  };
}

export function resolveCharacterSourcePacks(
  selectedSourcePackIds: string[],
  sourcePacks: CharacterSourcePackDefinition[],
): CharacterSourcePackResolution {
  const errors: string[] = [];
  const sourcePackById = new Map(sourcePacks.map((sourcePack) => [sourcePack.id, sourcePack]));
  const selectedIds: string[] = [];
  const selectedIdSet = new Set<string>();

  for (const sourcePackId of selectedSourcePackIds) {
    if (selectedIdSet.has(sourcePackId)) {
      errors.push(`Source pack ${sourcePackId} is selected more than once.`);
      continue;
    }
    selectedIdSet.add(sourcePackId);

    const sourcePack = sourcePackById.get(sourcePackId);
    if (!sourcePack) {
      errors.push(`Unknown source pack ${sourcePackId}.`);
      continue;
    }
    selectedIds.push(sourcePackId);
    if (sourcePack.status !== 'implemented') {
      errors.push(`${sourcePack.name} is not implemented yet.`);
    }
  }

  for (const sourcePack of sourcePacks) {
    if (sourcePack.required && !selectedIdSet.has(sourcePack.id)) {
      errors.push(`${sourcePack.name} is required.`);
    }
  }

  const selectedPacks = selectedIds.map((sourcePackId) => sourcePackById.get(sourcePackId)!);
  for (const sourcePack of selectedPacks) {
    for (const dependencyId of sourcePack.dependsOn) {
      if (!selectedIdSet.has(dependencyId)) {
        const dependencyName = sourcePackById.get(dependencyId)?.name || dependencyId;
        errors.push(`${sourcePack.name} requires ${dependencyName}.`);
      }
    }
  }

  const activeSourcePackIdsBySection: Partial<Record<CharacterRuleSection, string[]>> = {};
  for (const sourcePack of selectedPacks) {
    for (const section of sourcePack.sections) {
      const providers = activeSourcePackIdsBySection[section] || [];
      activeSourcePackIdsBySection[section] = [...providers, sourcePack.id];
    }
  }

  for (const sourcePack of selectedPacks) {
    for (const reference of sourcePack.replaces) {
      const replacement = parseReplacement(reference);
      if (!replacement) {
        errors.push(`${sourcePack.name} has an invalid replacement reference: ${reference}.`);
        continue;
      }
      if (!sourcePack.sections.includes(replacement.section)) {
        errors.push(`${sourcePack.name} cannot replace ${reference} without providing that section.`);
        continue;
      }
      const providers = activeSourcePackIdsBySection[replacement.section] || [];
      activeSourcePackIdsBySection[replacement.section] = providers
        .filter((sourcePackId) => sourcePackId !== replacement.sourcePackId);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    selectedSourcePackIds: selectedIds,
    activeSourcePackIdsBySection,
  };
}