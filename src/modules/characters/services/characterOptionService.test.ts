import { describe, expect, it } from 'vitest';
import { getAllCharacterOptions, getSpeciesById } from './characterDataService';
import { evaluateCharacterOptions } from './characterOptionService';
import type { AbilityScores, CharacterOptionSelection } from '../types/character';

const definitions = getAllCharacterOptions();
const scores: AbilityScores = { str: 8, dex: 12, con: 10, int: 12, wil: 9, per: 9 };

describe('PHB character options', () => {
  it('contains every perk and flaw in tables P26 and P27', () => {
    expect(definitions.filter((definition) => definition.kind === 'perk')).toHaveLength(22);
    expect(definitions.filter((definition) => definition.kind === 'flaw')).toHaveLength(20);
    expect(new Set(definitions.map((definition) => definition.id)).size).toBe(42);
  });

  it('balances perk costs and flaw bonuses in the shared skill-point budget', () => {
    const selections: CharacterOptionSelection[] = [
      { optionId: 'reflexes' },
      { optionId: 'vigor', choiceIds: ['stun', 'mortal-fatigue'] },
      { optionId: 'clueless', value: 4, notes: 'Navigation' },
      { optionId: 'old-injury', value: 2, notes: 'Left knee' },
    ];
    const result = evaluateCharacterOptions(selections, scores, getSpeciesById('human')!, definitions, true);

    expect(result.valid).toBe(true);
    expect(result.spentPerkPoints).toBe(10);
    expect(result.gainedFlawPoints).toBe(6);
    expect(result.skillPointAdjustment).toBe(-4);
    expect(result.resistanceModifierBonuses).toEqual({ dex: 1 });
    expect(result.durabilityBonuses).toEqual({ stun: 1, wound: 0, mortal: 1, fatigue: 1 });
  });

  it('applies Heightened Ability and records the wealth option', () => {
    const result = evaluateCharacterOptions([
      { optionId: 'heightened-ability', targetAbility: 'int' },
      { optionId: 'filthy-rich' },
    ], scores, getSpeciesById('human')!, definitions, true);

    expect(result.valid).toBe(true);
    expect(result.effectiveAbilityScores.int).toBe(13);
    expect(result.wealthOptionId).toBe('filthy-rich');
  });

  it('validates creation limits, required details, psionics, and species maximums', () => {
    const maxIntScores = { ...scores, int: 14 };
    const result = evaluateCharacterOptions([
      { optionId: 'heightened-ability', targetAbility: 'int' },
      { optionId: 'psionic-awareness' },
      { optionId: 'faith' },
      { optionId: 'powerful-ally' },
      { optionId: 'phobia', value: 5 },
      { optionId: 'temper', value: 2 },
      { optionId: 'obsessed', value: 2 },
      { optionId: 'old-injury', value: 2 },
    ], maxIntScores, getSpeciesById('human')!, definitions, false);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      'Heightened Ability cannot raise INT above the Human maximum.',
      'Psionic Awareness requires psionics to be enabled.',
      'Faith requires a short description.',
      'Powerful Ally requires a short description.',
      'Phobia requires one of these values: 2, 4, 6.',
      'A starting hero may have at most 3 perks; 4 were selected.',
      'A starting hero may have at most 3 flaws; 4 were selected.',
    ]));
  });
});