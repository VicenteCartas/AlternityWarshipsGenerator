import { describe, expect, it } from 'vitest';
import { getAllCharacterSourcePacks } from './characterDataService';
import { resolveCharacterSourcePacks } from './characterSourcePackService';

const sourcePacks = getAllCharacterSourcePacks();

describe('character source-pack resolution', () => {
  it('uses the PHB as the active provider for every PHB section', () => {
    const result = resolveCharacterSourcePacks(['phb'], sourcePacks);
    expect(result.valid).toBe(true);
    expect(result.activeSourcePackIdsBySection).toEqual({
      core: ['phb'],
      mutations: ['phb'],
      psionics: ['phb'],
      cybertech: ['phb'],
    });
  });

  it('replaces only PHB psionics when Mindwalking is selected', () => {
    const result = resolveCharacterSourcePacks(['phb', 'mindwalking'], sourcePacks);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Mindwalking: A Guide to Psionics is not implemented yet.');
    expect(result.activeSourcePackIdsBySection.psionics).toEqual(['mindwalking']);
    expect(result.activeSourcePackIdsBySection.core).toEqual(['phb']);
    expect(result.activeSourcePackIdsBySection.mutations).toEqual(['phb']);
  });

  it('keeps additive providers together when a pack does not replace a section', () => {
    const result = resolveCharacterSourcePacks(['phb', 'dataware'], sourcePacks);
    expect(result.activeSourcePackIdsBySection.cybertech).toEqual(['phb', 'dataware']);
    expect(result.activeSourcePackIdsBySection.grid).toEqual(['dataware']);
    expect(result.activeSourcePackIdsBySection.robots).toEqual(['dataware']);
  });

  it('reports missing requirements, duplicate selections, and unknown packs', () => {
    const result = resolveCharacterSourcePacks(['mindwalking', 'mindwalking', 'unknown'], sourcePacks);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "Player's Handbook is required.",
      "Mindwalking: A Guide to Psionics requires Player's Handbook.",
      'Source pack mindwalking is selected more than once.',
      'Unknown source pack unknown.',
    ]));
  });
});