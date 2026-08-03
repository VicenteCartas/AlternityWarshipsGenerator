import { describe, expect, it } from 'vitest';
import {
  getAllProfessions,
  getAllPsionicSkills,
  getAllSkills,
  getCharacterRules,
  getProfessionById,
  getPsionicRules,
  getPsionicSkillById,
  getSpeciesById,
} from './characterDataService';
import { evaluateSkillPurchasePlan } from './skillPurchaseService';
import {
  calculateExtendedPsionicEnergyCost,
  calculateMaximumPsionicEnergy,
  calculatePsionicBaseSituationStep,
  evaluatePsionicPurchasePlan,
  recoverPsionicEnergyAfterRest,
  resolveHourlyPsionicEnergyRecovery,
  resolvePsionicEnergyUse,
} from './psionicService';
import type { AbilityScores, PsionicPurchasePlan, SkillPurchasePlan } from '../types/character';

const characterRules = getCharacterRules();
const psionicRules = getPsionicRules();
const psionicSkills = getAllPsionicSkills();

function coreBudget(
  scores: AbilityScores,
  speciesId: string,
  professionId: string,
  plan: Partial<SkillPurchasePlan> = {},
) {
  return evaluateSkillPurchasePlan(
    {
      nativeLanguage: 'Galactic Standard',
      cashedInFreeBroadSkillIds: [],
      purchasedBroadSkillIds: [],
      specialtySkills: [],
      additionalDiscountProfessionIds: [],
      ...plan,
    },
    scores,
    getSpeciesById(speciesId)!,
    getProfessionById(professionId)!,
    getAllSkills(),
    getAllProfessions(),
    characterRules,
  );
}

function psionicPlan(overrides: Partial<PsionicPurchasePlan>): PsionicPurchasePlan {
  return {
    accessPath: 'none',
    purchasedBroadSkillIds: [],
    specialtySkills: [],
    ...overrides,
  };
}

describe('PHB psionic catalogue', () => {
  it('contains four broad skills and all 28 specialty skills from Table P52', () => {
    expect(psionicSkills.filter((skill) => skill.kind === 'broad')).toHaveLength(4);
    expect(psionicSkills.filter((skill) => skill.kind === 'specialty')).toHaveLength(28);
    expect(new Set(psionicSkills.map((skill) => skill.id)).size).toBe(32);
    expect(
      Object.fromEntries(['con', 'int', 'wil', 'per'].map((ability) => [
        ability,
        psionicSkills.filter((skill) => skill.ability === ability && skill.kind === 'specialty').length,
      ])),
    ).toEqual({ con: 6, int: 9, wil: 6, per: 7 });
  });

  it('gives every specialty a same-ability broad parent and preserves trained-only skills', () => {
    for (const specialty of psionicSkills.filter((skill) => skill.kind === 'specialty')) {
      const parent = getPsionicSkillById(specialty.parentSkillId!);
      expect(parent, specialty.name).toBeDefined();
      expect(parent?.kind, specialty.name).toBe('broad');
      expect(parent?.ability, specialty.name).toBe(specialty.ability);
    }
    expect(psionicSkills.filter((skill) => skill.kind === 'broad').every((skill) => !skill.canUseUntrained)).toBe(true);
    expect(psionicSkills.filter((skill) => skill.kind === 'specialty' && !skill.canUseUntrained)).toHaveLength(8);
  });
});

describe('PHB psionic skill purchasing', () => {
  it('applies Optional Rule 2C to psionic specialty ranks', () => {
    const scores: AbilityScores = { str: 8, dex: 8, con: 9, int: 10, wil: 13, per: 12 };
    const result = evaluatePsionicPurchasePlan(
      psionicPlan({
        accessPath: 'mindwalker',
        purchasedBroadSkillIds: ['biokinesis'],
        specialtySkills: [{ skillId: 'heal', rank: 2 }],
        favoredBroadSkillId: 'biokinesis',
      }),
      scores,
      getSpeciesById('human')!,
      getProfessionById('mindwalker')!,
      coreBudget(scores, 'human', 'mindwalker'),
      psionicSkills,
      psionicRules,
      characterRules.startingSpecialtyRankLimit,
      'optional-2c',
    );

    expect(result.valid).toBe(true);
    expect(result.costs.find(({ skillId }) => skillId === 'heal')?.cost).toBe(8);
  });

  it('prices Mindwalker skills with normal cumulative ranks and the shared broad-skill limit', () => {
    const scores: AbilityScores = { str: 8, dex: 8, con: 9, int: 10, wil: 13, per: 12 };
    const budget = coreBudget(scores, 'human', 'mindwalker');
    const result = evaluatePsionicPurchasePlan(
      psionicPlan({
        accessPath: 'mindwalker',
        purchasedBroadSkillIds: ['biokinesis', 'esp'],
        specialtySkills: [
          { skillId: 'heal', rank: 2 },
          { skillId: 'empathy', rank: 3 },
        ],
        favoredBroadSkillId: 'biokinesis',
      }),
      scores,
      getSpeciesById('human')!,
      getProfessionById('mindwalker')!,
      budget,
      psionicSkills,
      psionicRules,
      characterRules.startingSpecialtyRankLimit,
    );

    expect(result.valid).toBe(true);
    expect(result.maximumEnergyPoints).toBe(13);
    expect(result.spentSkillPoints).toBe(26);
    expect(result.remainingSkillPoints).toBe(24);
    expect(result.costs.map(({ skillId, cost }) => [skillId, cost])).toEqual([
      ['biokinesis', 6],
      ['esp', 5],
      ['heal', 9],
      ['empathy', 6],
    ]);
    expect(calculatePsionicBaseSituationStep(getPsionicSkillById('biokinesis')!, 'biokinesis')).toBe(0);
    expect(calculatePsionicBaseSituationStep(getPsionicSkillById('heal')!, 'biokinesis')).toBe(-1);
    expect(calculatePsionicBaseSituationStep(getPsionicSkillById('esp')!, 'biokinesis')).toBe(1);
  });

  it('applies talent prices, limits, and rank-six allowance', () => {
    const scores: AbilityScores = { str: 8, dex: 12, con: 10, int: 12, wil: 9, per: 9 };
    const result = evaluatePsionicPurchasePlan(
      psionicPlan({
        accessPath: 'talent',
        purchasedBroadSkillIds: ['esp'],
        specialtySkills: [
          { skillId: 'empathy', rank: 6 },
          { skillId: 'sensitivity', rank: 3 },
        ],
      }),
      scores,
      getSpeciesById('human')!,
      getProfessionById('free-agent')!,
      coreBudget(scores, 'human', 'free-agent'),
      psionicSkills,
      psionicRules,
      characterRules.startingSpecialtyRankLimit,
    );

    expect(result.valid).toBe(true);
    expect(result.maximumEnergyPoints).toBe(5);
    expect(result.spentSkillPoints).toBe(45);
    expect(result.remainingSkillPoints).toBe(15);
  });

  it('applies the Diplomat secondary-profession discount without the favored-discipline benefit', () => {
    const scores: AbilityScores = { str: 8, dex: 9, con: 9, int: 12, wil: 11, per: 11 };
    const result = evaluatePsionicPurchasePlan(
      psionicPlan({
        accessPath: 'diplomat-mindwalker',
        purchasedBroadSkillIds: ['biokinesis'],
        specialtySkills: [{ skillId: 'heal', rank: 1 }],
      }),
      scores,
      getSpeciesById('human')!,
      getProfessionById('diplomat')!,
      coreBudget(scores, 'human', 'diplomat', { additionalDiscountProfessionIds: ['mindwalker'] }),
      psionicSkills,
      psionicRules,
      characterRules.startingSpecialtyRankLimit,
    );

    expect(result.valid).toBe(true);
    expect(result.maximumEnergyPoints).toBe(6);
    expect(result.costs.map(({ skillId, cost }) => [skillId, cost])).toEqual([
      ['biokinesis', 5],
      ['heal', 3],
    ]);

    const missingSecondaryProfession = evaluatePsionicPurchasePlan(
      psionicPlan({ accessPath: 'diplomat-mindwalker' }),
      scores,
      getSpeciesById('human')!,
      getProfessionById('diplomat')!,
      coreBudget(scores, 'human', 'diplomat'),
      psionicSkills,
      psionicRules,
      characterRules.startingSpecialtyRankLimit,
    );
    expect(missingSecondaryProfession.errors).toContain(
      'The Diplomat must select Mindwalker as the secondary profession.',
    );
  });

  it('applies Fraal Telepathy access and energy multipliers', () => {
    const scores: AbilityScores = { str: 7, dex: 8, con: 8, int: 13, wil: 13, per: 11 };
    const talentBudget = coreBudget(scores, 'fraal', 'free-agent');
    const talent = evaluatePsionicPurchasePlan(
      psionicPlan({
        accessPath: 'talent',
        specialtySkills: [{ skillId: 'contact', rank: 1 }],
      }),
      scores,
      getSpeciesById('fraal')!,
      getProfessionById('free-agent')!,
      talentBudget,
      psionicSkills,
      psionicRules,
      characterRules.startingSpecialtyRankLimit,
    );

    expect(talent.valid).toBe(true);
    expect(talent.trainedBroadSkillIds).toEqual(['telepathy']);
    expect(talent.purchasedBroadSkillCount).toBe(0);
    expect(talent.maximumEnergyPoints).toBe(13);
    expect(talent.spentSkillPoints).toBe(4);
    expect(calculateMaximumPsionicEnergy(scores, getSpeciesById('fraal')!, 'mindwalker')).toBe(20);
    expect(calculateMaximumPsionicEnergy(scores, getSpeciesById('human')!, 'talent')).toBe(7);
  });

  it('reports talent access, specialty, and rank-limit violations together', () => {
    const scores: AbilityScores = { str: 7, dex: 8, con: 8, int: 13, wil: 13, per: 11 };
    const result = evaluatePsionicPurchasePlan(
      psionicPlan({
        accessPath: 'talent',
        purchasedBroadSkillIds: ['esp'],
        specialtySkills: [
          { skillId: 'contact', rank: 7 },
          { skillId: 'mind-shield', rank: 4 },
          { skillId: 'empathy', rank: 4 },
        ],
      }),
      scores,
      getSpeciesById('fraal')!,
      getProfessionById('free-agent')!,
      coreBudget(scores, 'fraal', 'free-agent'),
      psionicSkills,
      psionicRules,
      characterRules.startingSpecialtyRankLimit,
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.stringContaining('at most 1 psionic broad skill'),
      'A Fraal talent must use Telepathy as the talent broad skill.',
      expect.stringContaining('Contact exceeds the talent rank limit of 6'),
      expect.stringContaining('at most 2 psionic specialty skills'),
      expect.stringContaining('Only 1 talent specialty skill may exceed rank 3'),
    ]));
  });

  it('counts Mindwalker broad skills against the normal limit but grants a talent one extra', () => {
    const scores: AbilityScores = { str: 8, dex: 8, con: 9, int: 10, wil: 13, per: 12 };
    const fullBroadSkillBudget = {
      remainingSkillPoints: 50,
      purchasedBroadSkillCount: 6,
      maxPurchasedBroadSkills: 6,
      retainedFreeBroadSkillIds: [],
      skillDiscountProfessionIds: ['mindwalker'],
    };
    const mindwalker = evaluatePsionicPurchasePlan(
      psionicPlan({
        accessPath: 'mindwalker',
        purchasedBroadSkillIds: ['esp'],
        favoredBroadSkillId: 'esp',
      }),
      scores,
      getSpeciesById('human')!,
      getProfessionById('mindwalker')!,
      fullBroadSkillBudget,
      psionicSkills,
      psionicRules,
      characterRules.startingSpecialtyRankLimit,
    );
    expect(mindwalker.errors).toContain('Core and psionic broad skills exceed the limit of 6 by 1.');

    const talent = evaluatePsionicPurchasePlan(
      psionicPlan({ accessPath: 'talent', purchasedBroadSkillIds: ['esp'] }),
      scores,
      getSpeciesById('human')!,
      getProfessionById('free-agent')!,
      { ...fullBroadSkillBudget, skillDiscountProfessionIds: ['free-agent'] },
      psionicSkills,
      psionicRules,
      characterRules.startingSpecialtyRankLimit,
    );
    expect(talent.valid).toBe(true);
  });
});

describe('PHB psionic energy', () => {
  it('charges energy by skill type and converts an unpaid critical-failure cost to fatigue', () => {
    expect(resolvePsionicEnergyUse(2, 'broad', 'criticalFailure', psionicRules)).toEqual({
      canAttempt: true,
      requiredEnergyPoints: 3,
      spentEnergyPoints: 2,
      remainingEnergyPoints: 0,
      fatigueDamage: 1,
    });
    expect(resolvePsionicEnergyUse(1, 'broad', 'ordinary', psionicRules).canAttempt).toBe(false);
    expect(resolvePsionicEnergyUse(4, 'specialty', 'failure', psionicRules)).toMatchObject({
      canAttempt: true,
      spentEnergyPoints: 1,
      remainingEnergyPoints: 3,
    });
    expect(calculateExtendedPsionicEnergyCost(3, psionicRules)).toBe(3);
  });

  it('recovers energy from hourly Resolve checks and eight hours of rest', () => {
    expect(resolveHourlyPsionicEnergyRecovery(4, 10, 'good', psionicRules)).toEqual({
      recoveredEnergyPoints: 2,
      remainingEnergyPoints: 6,
      fatigueDamage: 0,
    });
    expect(resolveHourlyPsionicEnergyRecovery(0, 10, 'criticalFailure', psionicRules)).toEqual({
      recoveredEnergyPoints: 0,
      remainingEnergyPoints: 0,
      fatigueDamage: 1,
    });
    expect(resolveHourlyPsionicEnergyRecovery(9, 10, 'amazing', psionicRules).remainingEnergyPoints).toBe(10);
    expect(recoverPsionicEnergyAfterRest(2, 10, 8, false, psionicRules)).toBe(10);
    expect(recoverPsionicEnergyAfterRest(2, 10, 8, true, psionicRules)).toBe(2);
  });
});