import { describe, expect, it } from 'vitest';
import { getFxRules } from './characterDataService';
import {
  calculateFxAbilityDesign,
  evaluateFxPlan,
  getFxAttemptEnergyCost,
  importFxAbilityDesigns,
  serializeFxAbilityDesigns,
} from './fxService';
import type { FxAbilityDesign } from '../types/fx';

const rules = getFxRules();

function design(overrides: Partial<FxAbilityDesign>): FxAbilityDesign {
  return {
    id: 'test-fx',
    name: 'Test FX',
    discipline: 'arcane',
    category: 'conjure',
    ability: 'wil',
    description: 'A complete test effect.',
    characteristics: [],
    trappings: {},
    ...overrides,
  };
}

describe('GMG FX construction', () => {
  it('reproduces Bolt of Lightning and determines quality before trappings', () => {
    const result = calculateFxAbilityDesign(design({
      name: 'Bolt of Lightning',
      characteristics: [
        { characteristicId: 'attack-type', choiceId: 'energy' },
        { characteristicId: 'damage-quality', choiceId: 'ordinary' },
        { characteristicId: 'stun-damage', choiceId: '1-5' },
        { characteristicId: 'wound-damage', choiceId: '1-5' },
        { characteristicId: 'range', choiceId: '2-4-6-m' },
      ],
      trappings: { complexRitual: true, component: 'Wood shaving from a lightning-struck tree' },
    }), rules);

    expect(result).toMatchObject({
      valid: true,
      effectCost: 8,
      quality: 'good',
      trappingReduction: 3,
      purchaseCost: 5,
    });
  });

  it.each([
    ['Fate Casting', design({
      category: 'augur',
      characteristics: [
        { characteristicId: 'duration', choiceId: '3-units', notes: 'Next 24 hours' },
        { characteristicId: 'knowledge', choiceId: 'cost-3' },
      ],
      trappings: { complexRitual: true, component: 'Runestones' },
    }), { effectCost: 9, quality: 'good', trappingReduction: 3, purchaseCost: 6 }],
    ['Fly', design({
      category: 'summon',
      characteristics: [
        { characteristicId: 'special-movement', choiceId: 'enabled', notes: 'Flight' },
        { characteristicId: 'duration', choiceId: '2-units', notes: '2 minutes' },
      ],
      trappings: { component: 'Soap bubbles' },
    }), { effectCost: 10, quality: 'good', trappingReduction: 1, purchaseCost: 9 }],
    ['Enchant Weapon', design({
      category: 'transform',
      ability: 'per',
      characteristics: [
        { characteristicId: 'bonus-damage', choiceId: 'plus-3' },
        { characteristicId: 'duration', choiceId: '3-units', notes: '3 minutes' },
      ],
      trappings: { component: 'Silver dust' },
    }), { effectCost: 12, quality: 'amazing', trappingReduction: 1, purchaseCost: 11 }],
    ['Cloak of Invisibility', design({
      discipline: 'super-power',
      category: 'enchanted-relic',
      ability: 'dex',
      characteristics: [
        { characteristicId: 'bonus-steps', choiceId: 'minus-3', notes: 'Stealth checks' },
        { characteristicId: 'penalty-steps', choiceId: 'plus-2', notes: 'Resistance modifiers to visual attacks' },
      ],
    }), { effectCost: 12, quality: 'amazing', trappingReduction: 0, purchaseCost: 12 }],
    ['Strength of the Behemoth', design({
      discipline: 'super-power',
      category: 'extreme-ability',
      ability: 'con',
      characteristics: [{ characteristicId: 'ability-score-boost', choiceId: 'plus-3' }],
      trappings: { limitation: 'Cold causes a +1 penalty' },
    }), { effectCost: 10, quality: 'good', trappingReduction: 1, purchaseCost: 9 }],
    ['Web Spinneret', design({
      discipline: 'super-power',
      category: 'overscience-gadget',
      ability: 'dex',
      characteristics: [{ characteristicId: 'range', choiceId: '10-20-30-m' }],
      trappings: { component: 'Web cartridges', componentComplexity: 'good' },
    }), { effectCost: 4, quality: 'ordinary', trappingReduction: 2, purchaseCost: 2 }],
  ])('reproduces the published %s design', (_name, ability, expected) => {
    expect(calculateFxAbilityDesign(ability, rules)).toMatchObject({ valid: true, ...expected });
  });

  it('uses the discipline and result-specific FX energy costs', () => {
    expect(getFxAttemptEnergyCost('arcane', 'amazing', 'ordinary', rules)).toBe(3);
    expect(getFxAttemptEnergyCost('arcane', 'good', 'failure', rules)).toBe(3);
    expect(getFxAttemptEnergyCost('faith', 'good', 'ordinary', rules)).toBe(4);
    expect(getFxAttemptEnergyCost('super-power', 'amazing', 'ordinary', rules)).toBe(1);
  });

  it('spends the shared skill budget without double-counting the FX broad skill', () => {
    const bolt = design({
      id: 'bolt',
      name: 'Bolt of Lightning',
      characteristics: [
        { characteristicId: 'attack-type', choiceId: 'energy' },
        { characteristicId: 'stun-damage', choiceId: '1-5' },
        { characteristicId: 'wound-damage', choiceId: '1-5' },
        { characteristicId: 'range', choiceId: '2-4-6-m' },
      ],
      trappings: { complexRitual: true, component: 'Wood shaving' },
    });
    const result = evaluateFxPlan({
      campaignTone: 'heroic',
      broadSkill: 'arcane',
      designs: [bolt],
      abilityPurchases: [{ designId: 'bolt', rank: 2 }],
      faithPurchases: [],
    }, {
      remainingSkillPoints: 60,
      purchasedBroadSkillCount: 2,
      maxPurchasedBroadSkills: 5,
    }, rules, 3, 'standard', true);

    expect(result.valid).toBe(true);
    expect(result.spentSkillPoints).toBe(26);
    expect(result.remainingSkillPoints).toBe(34);
    expect(result.purchasedBroadSkillCount).toBe(3);
    expect(result.currentMaximumEnergy).toBe(10);
  });

  it('exports full authored designs and imports valid unpurchased copies', () => {
    const original = design({
      id: 'original',
      name: 'Fly',
      category: 'summon',
      characteristics: [
        { characteristicId: 'special-movement', choiceId: 'enabled', notes: 'Flight' },
        { characteristicId: 'duration', choiceId: '2-units', notes: '2 minutes' },
      ],
      trappings: { component: 'Soap bubbles' },
    });

    const imported = importFxAbilityDesigns(serializeFxAbilityDesigns([original]), [original], rules);

    expect(imported.warnings).toEqual([]);
    expect(imported.designs).toHaveLength(1);
    expect(imported.designs[0]).toMatchObject({
      name: 'Fly (imported)',
      category: 'summon',
      characteristics: original.characteristics,
      trappings: original.trappings,
    });
    expect(imported.designs[0].id).not.toBe(original.id);
  });

  it('skips malformed or mechanically invalid imported designs with warnings', () => {
    expect(importFxAbilityDesigns('not json', [], rules).warnings).toEqual(['Invalid JSON file.']);
    const result = importFxAbilityDesigns(JSON.stringify({
      designs: [{
        name: 'Impossible', discipline: 'arcane', category: 'augur', ability: 'wil', description: 'No.',
        characteristics: [{ characteristicId: 'travel', choiceId: '100-km' }, { characteristicId: 'ability-score-boost', choiceId: 'plus-5' }],
        trappings: {},
      }],
    }), [], rules);
    expect(result.designs).toEqual([]);
    expect(result.warnings[0]).toContain('exceeds the maximum of 15');
  });
});