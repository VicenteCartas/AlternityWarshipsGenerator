import type { CharacterSourcePackDefinition } from '../types/sourcePack';

export interface CharacterDefinitionSource {
  key: string;
  label: string;
  kind: 'Book' | 'Mod';
}

interface SourceTaggedDefinition {
  sourcePackId: string;
  _source?: string;
}

export function getCharacterDefinitionSource(
  definition: SourceTaggedDefinition,
  sourcePacks: CharacterSourcePackDefinition[],
): CharacterDefinitionSource {
  if (definition._source && definition._source !== 'base') {
    return { key: `mod:${definition._source}`, label: definition._source, kind: 'Mod' };
  }
  const sourcePack = sourcePacks.find((pack) => pack.id === definition.sourcePackId);
  return {
    key: `book:${definition.sourcePackId}`,
    label: sourcePack?.name || definition.sourcePackId,
    kind: 'Book',
  };
}

export function getCharacterDefinitionSources(
  definitions: SourceTaggedDefinition[],
  sourcePacks: CharacterSourcePackDefinition[],
): CharacterDefinitionSource[] {
  const sources = new Map<string, CharacterDefinitionSource>();
  for (const definition of definitions) {
    const source = getCharacterDefinitionSource(definition, sourcePacks);
    sources.set(source.key, source);
  }
  return Array.from(sources.values()).sort((left, right) => {
    if (left.kind !== right.kind) return left.kind === 'Book' ? -1 : 1;
    return left.label.localeCompare(right.label);
  });
}