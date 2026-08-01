import { describe, expect, it } from 'vitest';
import { getAllMutations, getSpeciesById } from './characterDataService';
import { evaluateMutationPlan } from './mutationService';
import type { AbilityScores, MutationPlan } from '../types/character';

const mutations = getAllMutations();
const scores: AbilityScores = { str: 10, dex: 10, con: 10, int: 10, wil: 10, per: 10 };

function plan(overrides: Partial<MutationPlan>): MutationPlan {
  return {
    origin: 'directed',
    scope: 'individual',
    advantagePointBudget: 4,
    drawbackPointBudget: 4,
    selections: [],
    ...overrides,
  };
}

describe('PHB mutations', () => {
  it('contains every entry in tables P49 and P50', () => {
    expect(mutations.filter((mutation) => mutation.kind === 'advantage')).toHaveLength(60);
    expect(mutations.filter((mutation) => mutation.kind === 'drawback')).toHaveLength(24);
    expect(new Set(mutations.map((mutation) => mutation.id)).size).toBe(84);
    expect(mutations.filter((mutation) => mutation.tier === 'ordinary')).toHaveLength(20);
    expect(mutations.filter((mutation) => mutation.tier === 'good')).toHaveLength(20);
    expect(mutations.filter((mutation) => mutation.tier === 'amazing')).toHaveLength(20);
  });

  it('balances points and applies permanent ability and Action Check effects', () => {
    const result = evaluateMutationPlan(plan({
      selections: [
        { mutationId: 'enhanced-int' },
        { mutationId: 'improved-reflexes' },
        { mutationId: 'improved-durability' },
        { mutationId: 'reduced-ability-moderate', linkedMutationId: 'enhanced-int' },
        { mutationId: 'slow-reflexes' },
      ],
    }), scores, getSpeciesById('mutant-human')!, mutations);

    expect(result.valid).toBe(true);
    expect(result.effectiveAbilityScores).toMatchObject({ int: 12, per: 8 });
    expect(result.durabilityBonuses.stun).toBe(3);
    expect(result.actionCheckModifier).toBe(0);
  });

  it('applies built-in ability tradeoffs for Flight and Dermal Plating', () => {
    const result = evaluateMutationPlan(plan({
      advantagePointBudget: 8,
      drawbackPointBudget: 8,
      selections: [
        { mutationId: 'flight-mutation' },
        { mutationId: 'dermal-plating' },
        { mutationId: 'weak-metabolism' },
        { mutationId: 'wild-mutation', linkedMutationId: 'flight-mutation' },
      ],
    }), scores, getSpeciesById('mutant-human')!, mutations);

    expect(result.valid).toBe(false);
    expect(result.effectiveAbilityScores).toMatchObject({ str: 9, con: 8, dex: 10 });
    expect(result.errors).toContain('A mutant may have at most 1 amazing advantageous mutation.');
  });

  it('reports species, point, family, detail, and linkage errors together', () => {
    const result = evaluateMutationPlan(plan({
      advantagePointBudget: 3,
      drawbackPointBudget: 2,
      selections: [
        { mutationId: 'improved-con' },
        { mutationId: 'enhanced-con' },
        { mutationId: 'adaptation-environment' },
        { mutationId: 'reduced-ability-moderate' },
      ],
    }), scores, getSpeciesById('human')!, mutations);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      'Only a Mutant Human may select a PHB mutation package.',
      'Enhanced Constitution conflicts with Improved Constitution.',
      'Adaptation, Environment requires a specific form or target.',
      'Reduced Ability Score, Moderate requires a linked advantageous mutation.',
      'Advantage mutations spend 4 of 3 points.',
      'Reduced Ability Score, Moderate must link to a selected mutation with an associated Ability.',
    ]));
  });
});