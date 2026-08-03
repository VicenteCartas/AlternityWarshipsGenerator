import { describe, expect, it } from 'vitest';
import { createEmptyCharacter } from '../constants/characterDefaults';
import { achievementPointsForLevel, evaluateAdvancementPlan, listAdvancementBenefitChoices } from './advancementService';
import type { AdvancementBaseContext } from './advancementService';

function baseContext(): AdvancementBaseContext {
  return {
    effectiveAbilityScores: { str: 8, dex: 12, con: 10, int: 12, wil: 9, per: 9 },
    coreBroadSkillIds: ['stealth'],
    coreSpecialtySkills: [{ skillId: 'sneak', rank: 1 }],
    psionicBroadSkillIds: [],
    psionicSpecialtySkills: [],
    skillDiscountProfessionIds: ['free-agent'],
    remainingSkillPoints: 0,
    remainingCredits: 100,
    currentLastResortPoints: 1,
    maximumLastResortPoints: 2,
    lastResortPointCost: 3,
  };
}

describe('character advancement', () => {
  it('applies Optional Rule 2C to later specialty rank improvements', () => {
    const state = createEmptyCharacter();
    state.level = 2;
    state.professionId = 'free-agent';
    state.skillRules.specialtySkillCosts = 'optional-2c';
    state.advancementPlan.levels = [{
      level: 2,
      broadSkills: [],
      specialtySkills: [{ domain: 'core', skillId: 'sneak' }],
      benefits: [],
      lastResortPointsSpent: 0,
      lastResortPointsPurchased: 0,
      creditsAwarded: 0,
      acquisitions: [],
      notes: '',
    }];
    const context = baseContext();
    context.coreSpecialtySkills = [{ skillId: 'sneak', rank: 4 }];

    const result = evaluateAdvancementPlan(state, context);

    expect(result.levelResults[0].costs).toContainEqual(
      expect.objectContaining({ type: 'specialty-rank', name: 'Sneak rank 5', cost: 4 }),
    );
  });

  it('calculates PHB achievement thresholds and resolves levels sequentially', () => {
    const state = createEmptyCharacter();
    state.level = 4;
    state.professionId = 'free-agent';
    state.advancementPlan.levels = [
      {
        level: 2,
        broadSkills: [],
        specialtySkills: [{ domain: 'core', skillId: 'sneak' }],
        benefits: [],
        lastResortPointsSpent: 0,
        lastResortPointsPurchased: 0,
        creditsAwarded: 0,
        acquisitions: [],
        notes: '',
      },
      {
        level: 3,
        broadSkills: [],
        specialtySkills: [],
        benefits: [{ type: 'action-check-increase' }],
        lastResortPointsSpent: 0,
        lastResortPointsPurchased: 0,
        creditsAwarded: 1000,
        acquisitions: [{ kind: 'equipment', itemId: 'bedroll', method: 'purchased', quantity: 1 }],
        notes: '',
      },
      {
        level: 4,
        broadSkills: [],
        specialtySkills: [{ domain: 'core', skillId: 'sneak' }],
        benefits: [{ type: 'extra-action' }],
        lastResortPointsSpent: 0,
        lastResortPointsPurchased: 0,
        creditsAwarded: 0,
        acquisitions: [],
        notes: '',
      },
    ];

    const result = evaluateAdvancementPlan(state, baseContext());
    expect(achievementPointsForLevel(4)).toBe(21);
    expect(result.valid).toBe(true);
    expect(result.achievementPoints).toBe(21);
    expect(result.totalSkillPointsEarned).toBe(21);
    expect(result.totalSkillPointsSpent).toBe(19);
    expect(result.remainingSkillPoints).toBe(2);
    expect(result.levelResults.map(({ skillPointsEarned }) => skillPointsEarned)).toEqual([6, 7, 8]);
    expect(result.finalCoreSpecialtySkills).toContainEqual({ skillId: 'sneak', rank: 3, specialization: undefined });
    expect(result.actionCheckScoreIncreases).toBe(1);
    expect(result.extraActions).toBe(1);
    expect(result.remainingCredits).toBe(1075);
    expect(result.finalEquipmentSelections).toContainEqual(expect.objectContaining({ equipmentId: 'bedroll', quantity: 1 }));
  });

  it('rejects two ranks in one level and benefits before their profession level', () => {
    const state = createEmptyCharacter();
    state.level = 2;
    state.professionId = 'free-agent';
    state.advancementPlan.levels = [{
      level: 2,
      broadSkills: [],
      specialtySkills: [
        { domain: 'core', skillId: 'sneak' },
        { domain: 'core', skillId: 'sneak' },
      ],
      benefits: [{ type: 'action-check-increase' }],
      lastResortPointsSpent: 0,
      lastResortPointsPurchased: 0,
      creditsAwarded: 0,
      acquisitions: [],
      notes: '',
    }];

    const result = evaluateAdvancementPlan(state, baseContext());
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.stringContaining('only one rank may be gained at a time'),
      expect.stringContaining('unavailable at level 2'),
    ]));
  });

  it('applies profession-specific ability benefits and species limits', () => {
    const state = createEmptyCharacter();
    state.level = 3;
    state.professionId = 'free-agent';
    state.abilityScores.dex = 13;
    state.advancementPlan.levels = [
      { level: 2, broadSkills: [], specialtySkills: [], benefits: [], lastResortPointsSpent: 0, lastResortPointsPurchased: 0, creditsAwarded: 0, acquisitions: [], notes: '' },
      { level: 3, broadSkills: [], specialtySkills: [], benefits: [{ type: 'ability-score-increase', ability: 'dex' }], lastResortPointsSpent: 0, lastResortPointsPurchased: 0, creditsAwarded: 0, acquisitions: [], notes: '' },
    ];
    const context = baseContext();
    context.effectiveAbilityScores.dex = 13;

    let result = evaluateAdvancementPlan(state, context);
    expect(result.valid).toBe(true);
    expect(result.abilityScoreBonuses.dex).toBe(1);
    expect(result.totalSkillPointsSpent).toBe(10);
  context.effectiveAbilityScores.dex = 14;
  result = evaluateAdvancementPlan(state, context);
  expect(result.errors).toContain('DEX cannot exceed the Human maximum.');
  });

  it('prices new perks, flaw removal, and Last Resort replenishment', () => {
    const state = createEmptyCharacter();
    state.level = 6;
    state.professionId = 'free-agent';
    state.optionSelections = [{ optionId: 'bad-luck', value: 6 }];
    state.advancementPlan.levels = [
      { level: 2, broadSkills: [], specialtySkills: [], benefits: [], lastResortPointsSpent: 1, lastResortPointsPurchased: 1, creditsAwarded: 0, acquisitions: [], notes: '' },
      { level: 3, broadSkills: [], specialtySkills: [], benefits: [{ type: 'new-perk', optionSelection: { optionId: 'reflexes', value: 4 } }], lastResortPointsSpent: 0, lastResortPointsPurchased: 0, creditsAwarded: 0, acquisitions: [], notes: '' },
      { level: 4, broadSkills: [], specialtySkills: [], benefits: [], lastResortPointsSpent: 0, lastResortPointsPurchased: 0, creditsAwarded: 0, acquisitions: [], notes: '' },
      { level: 5, broadSkills: [], specialtySkills: [], benefits: [], lastResortPointsSpent: 0, lastResortPointsPurchased: 0, creditsAwarded: 0, acquisitions: [], notes: '' },
      { level: 6, broadSkills: [], specialtySkills: [], benefits: [{ type: 'remove-flaw', flawId: 'bad-luck' }], lastResortPointsSpent: 0, lastResortPointsPurchased: 0, creditsAwarded: 0, acquisitions: [], notes: '' },
    ];

    const result = evaluateAdvancementPlan(state, baseContext());
    expect(result.valid).toBe(true);
    expect(result.addedPerks).toEqual([{ optionId: 'reflexes', value: 4 }]);
    expect(result.removedFlawIds).toEqual(['bad-luck']);
    expect(result.currentLastResortPoints).toBe(1);
    expect(result.levelResults[0].costs).toContainEqual(expect.objectContaining({ type: 'last-resort', cost: 3 }));
    expect(result.levelResults.at(-1)?.costs).toContainEqual(expect.objectContaining({ name: 'Remove Flaw: Bad Luck', cost: 12 }));
  });

  it('offers Monetary Award only at every third level', () => {
    const state = createEmptyCharacter();
    state.professionId = 'free-agent';
    expect(listAdvancementBenefitChoices(state, 4).some(({ type }) => type === 'monetary-award')).toBe(false);
    expect(listAdvancementBenefitChoices(state, 6).some(({ type }) => type === 'monetary-award')).toBe(true);
  });
});
