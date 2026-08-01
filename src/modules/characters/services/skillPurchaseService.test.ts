import { describe, expect, it } from 'vitest';
import {
  getAllProfessions,
  getAllSkills,
  getCharacterRules,
  getProfessionById,
  getSkillById,
  getSkillRankBenefits,
  getAllSpecies,
  getSpeciesById,
  getSpecialtySkillsForBroadSkill,
} from './characterDataService';
import { evaluateSkillPurchasePlan } from './skillPurchaseService';
import type { AbilityScores, SkillPurchasePlan } from '../types/character';

const rules = getCharacterRules();
const skills = getAllSkills();
const professions = getAllProfessions();
const humanFreeAgentScores: AbilityScores = { str: 8, dex: 12, con: 10, int: 12, wil: 9, per: 9 };

function emptyPlan(overrides: Partial<SkillPurchasePlan> = {}): SkillPurchasePlan {
  return {
    nativeLanguage: 'English',
    cashedInFreeBroadSkillIds: [],
    purchasedBroadSkillIds: [],
    specialtySkills: [],
    additionalDiscountProfessionIds: [],
    ...overrides,
  };
}

describe('PHB core skill catalogue', () => {
  it('contains all 40 broad and 125 specialty skills from Table P19', () => {
    expect(skills.filter((skill) => skill.kind === 'broad')).toHaveLength(40);
    expect(skills.filter((skill) => skill.kind === 'specialty')).toHaveLength(125);
    expect(new Set(skills.map((skill) => skill.id)).size).toBe(skills.length);
    expect(
      Object.fromEntries(['str', 'dex', 'con', 'int', 'wil', 'per'].map((ability) => [
        ability,
        {
          broad: skills.filter((skill) => skill.ability === ability && skill.kind === 'broad').length,
          specialty: skills.filter((skill) => skill.ability === ability && skill.kind === 'specialty').length,
        },
      ])),
    ).toEqual({
      str: { broad: 5, specialty: 13 },
      dex: { broad: 6, specialty: 24 },
      con: { broad: 3, specialty: 6 },
      int: { broad: 13, specialty: 49 },
      wil: { broad: 8, specialty: 15 },
      per: { broad: 5, specialty: 18 },
    });
  });

  it('gives every specialty a matching broad-skill parent', () => {
    for (const specialty of skills.filter((skill) => skill.kind === 'specialty')) {
      const parent = getSkillById(specialty.parentSkillId!);
      expect(parent, specialty.name).toBeDefined();
      expect(parent?.kind, specialty.name).toBe('broad');
      expect(parent?.ability, specialty.name).toBe(specialty.ability);
    }
  });

  it('preserves profession prices, untrained restrictions, and specific subjects', () => {
    expect(getSkillById('armor-operation')).toMatchObject({ listedCost: 7, professionIds: ['combat-spec'] });
    expect(getSkillById('powered-armor')?.canUseUntrained).toBe(false);
    expect(getSkillById('etiquette')).toMatchObject({
      listedCost: 2,
      professionIds: ['diplomat'],
      canUseUntrained: false,
      requiresSpecialization: true,
    });
    expect(getSkillById('musical-instrument')?.requiresSpecialization).toBe(true);
    expect(getSpecialtySkillsForBroadSkill('interaction')).toHaveLength(6);
  });

  it('marks every PHB specialty purchased separately by subject or type', () => {
    expect(skills.filter((skill) => skill.requiresSpecialization).map((skill) => skill.id)).toEqual([
      'athletics-specific',
      'survival-training',
      'acrobatics-specific',
      'air-vehicle',
      'land-vehicle',
      'space-vehicle',
      'water-vehicle',
      'language',
      'knowledge-specific',
      'law-specific',
      'xenomedicine',
      'animal-training',
      'creativity-specific',
      'street-knowledge',
      'teach-specific',
      'etiquette',
      'gamble',
      'musical-instrument',
    ]);
  });

  it('inherits shared rank benefits without assigning them to unrelated skills', () => {
    expect(getSkillRankBenefits(getSkillById('combat-armor')!)).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Improved operation', ranks: [1, 4, 7, 10] }),
      expect.objectContaining({ name: 'Shaking off stuns', ranks: [2, 4, 6, 8, 10, 12] }),
    ]));
    expect(getSkillRankBenefits(getSkillById('powered-armor')!)).toHaveLength(2);
    expect(getSkillRankBenefits(getSkillById('climb')!)).toEqual([]);
  });

  it('defines valid rank-benefit milestones for all affected PHB specialties', () => {
    const affectedSpecialties = skills.filter((skill) => (
      skill.kind === 'specialty' && getSkillRankBenefits(skill).length > 0
    ));
    expect(Object.fromEntries(['str', 'dex', 'con', 'int', 'wil', 'per'].map((ability) => [
      ability,
      affectedSpecialties.filter((skill) => skill.ability === ability).length,
    ]))).toEqual({ str: 8, dex: 19, con: 2, int: 29, wil: 3, per: 7 });

    expect(skills.filter((skill) => (skill.rankBenefits || []).length > 0)).toHaveLength(50);
    for (const skill of skills) {
      for (const benefit of skill.rankBenefits || []) {
        expect(benefit.name.trim(), skill.name).not.toBe('');
        expect(benefit.description.trim(), skill.name).not.toBe('');
        expect(benefit.ranks, skill.name).toEqual(
          [...new Set(benefit.ranks)].sort((left, right) => left - right),
        );
        expect(benefit.ranks.every((rank) => Number.isInteger(rank) && rank >= 1 && rank <= 12), skill.name).toBe(true);
      }
    }
  });

  it('uses valid profession and species free-skill references', () => {
    const professionIds = new Set(professions.map((profession) => profession.id));
    for (const skill of skills) {
      expect(skill.professionIds.every((professionId) => professionIds.has(professionId)), skill.name).toBe(true);
    }

    const skillIds = new Set(skills.map((skill) => skill.id));
    const unresolvedFreeSkillIds = getAllSpecies().flatMap((species) =>
      species.freeBroadSkillIds.filter((skillId) => !skillIds.has(skillId)),
    );
    expect(unresolvedFreeSkillIds).toEqual(['telepathy']);
  });
});

describe('level-one skill purchasing', () => {
  it('prices profession discounts and cumulative specialty ranks', () => {
    const plan = emptyPlan({
      purchasedBroadSkillIds: ['acrobatics', 'stealth'],
      specialtySkills: [
        { skillId: 'dodge', rank: 1 },
        { skillId: 'fall', rank: 3 },
        { skillId: 'sneak', rank: 2 },
        { skillId: 'language', rank: 1, specialization: 'Galactic Standard' },
      ],
    });
    const result = evaluateSkillPurchasePlan(
      plan,
      humanFreeAgentScores,
      getSpeciesById('human')!,
      getProfessionById('free-agent')!,
      skills,
      professions,
      rules,
    );

    expect(result.valid).toBe(true);
    expect(result.availableSkillPoints).toBe(60);
    expect(result.spentSkillPoints).toBe(34);
    expect(result.remainingSkillPoints).toBe(26);
    expect(result.costs.map(({ skillId, cost }) => [skillId, cost])).toEqual([
      ['acrobatics', 6],
      ['stealth', 6],
      ['dodge', 3],
      ['fall', 9],
      ['sneak', 9],
      ['language', 1],
    ]);
  });

  it('allows a surrendered free broad skill to be repurchased at list price', () => {
    const scores: AbilityScores = { str: 12, dex: 8, con: 9, int: 10, wil: 10, per: 11 };
    const result = evaluateSkillPurchasePlan(
      emptyPlan({
        cashedInFreeBroadSkillIds: ['athletics'],
        purchasedBroadSkillIds: ['athletics'],
        specialtySkills: [{ skillId: 'climb', rank: 1 }],
      }),
      scores,
      getSpeciesById('weren')!,
      getProfessionById('combat-spec')!,
      skills,
      professions,
      rules,
    );

    expect(result.valid).toBe(true);
    expect(result.cashedInSkillPoints).toBe(3);
    expect(result.availableSkillPoints).toBe(48);
    expect(result.spentSkillPoints).toBe(5);
    expect(result.purchasedBroadSkillCount).toBe(1);
    expect(result.retainedFreeBroadSkillIds).not.toContain('athletics');
    expect(result.trainedBroadSkillIds).toContain('athletics');
  });

  it('applies a Diplomat secondary profession to skill prices', () => {
    const scores: AbilityScores = { str: 8, dex: 9, con: 9, int: 12, wil: 11, per: 11 };
    const result = evaluateSkillPurchasePlan(
      emptyPlan({
        purchasedBroadSkillIds: ['business', 'computer-science'],
        specialtySkills: [{ skillId: 'hacking', rank: 1 }],
        additionalDiscountProfessionIds: ['tech-op'],
      }),
      scores,
      getSpeciesById('human')!,
      getProfessionById('diplomat')!,
      skills,
      professions,
      rules,
    );

    expect(result.valid).toBe(true);
    expect(result.spentSkillPoints).toBe(13);
    expect(result.costs.map(({ skillId, cost }) => [skillId, cost])).toEqual([
      ['business', 3],
      ['computer-science', 6],
      ['hacking', 4],
    ]);
  });

  it('reports prerequisites, rank limits, custom subjects, and profession-choice errors together', () => {
    const result = evaluateSkillPurchasePlan(
      emptyPlan({
        purchasedBroadSkillIds: ['pistol'],
        specialtySkills: [
          { skillId: 'sneak', rank: 4 },
          { skillId: 'language', rank: 1 },
        ],
        additionalDiscountProfessionIds: ['tech-op'],
      }),
      humanFreeAgentScores,
      getSpeciesById('human')!,
      getProfessionById('free-agent')!,
      skills,
      professions,
      rules,
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.stringContaining('Pistol is a specialty skill'),
      expect.stringContaining('allows 0 additional'),
      expect.stringContaining('Sneak exceeds the starting rank limit'),
      expect.stringContaining('Sneak requires the Stealth broad skill'),
      expect.stringContaining('Language requires a specific subject'),
    ]));
  });

  it('does not treat labels as separate purchases for a fixed-name specialty', () => {
    const result = evaluateSkillPurchasePlan(
      emptyPlan({
        purchasedBroadSkillIds: ['stealth'],
        specialtySkills: [
          { skillId: 'sneak', rank: 1, specialization: 'Urban' },
          { skillId: 'sneak', rank: 1, specialization: 'Wilderness' },
        ],
      }),
      humanFreeAgentScores,
      getSpeciesById('human')!,
      getProfessionById('free-agent')!,
      skills,
      professions,
      rules,
    );

    expect(result.errors).toContain('Sneak is purchased more than once.');
  });

  it('prices different subjects of a specialized skill as separate purchases', () => {
    const result = evaluateSkillPurchasePlan(
      emptyPlan({
        nativeLanguage: 'French',
        specialtySkills: [
          { skillId: 'language', rank: 1, specialization: 'English' },
          { skillId: 'language', rank: 2, specialization: 'Spanish' },
        ],
      }),
      humanFreeAgentScores,
      getSpeciesById('human')!,
      getProfessionById('free-agent')!,
      skills,
      professions,
      rules,
    );

    expect(result.valid).toBe(true);
    expect(result.costs.filter(({ skillId }) => skillId === 'language')).toMatchObject([
      { rank: 1, specialization: 'English', cost: 1 },
      { rank: 2, specialization: 'Spanish', cost: 3 },
    ]);
  });

  it('grants one required native language at rank 3 without spending skill points', () => {
    const granted = evaluateSkillPurchasePlan(
      emptyPlan({ nativeLanguage: 'English' }),
      humanFreeAgentScores,
      getSpeciesById('human')!,
      getProfessionById('free-agent')!,
      skills,
      professions,
      rules,
    );
    expect(granted.nativeLanguage).toBe('English');
    expect(granted.nativeLanguageRank).toBe(3);
    expect(granted.spentSkillPoints).toBe(0);
    expect(granted.costs).toEqual([]);

    const duplicate = evaluateSkillPurchasePlan(
      emptyPlan({
        nativeLanguage: 'English',
        specialtySkills: [{ skillId: 'language', rank: 1, specialization: ' english ' }],
      }),
      humanFreeAgentScores,
      getSpeciesById('human')!,
      getProfessionById('free-agent')!,
      skills,
      professions,
      rules,
    );
    expect(duplicate.errors).toContain('Language (english) is already granted as the native language at rank 3.');

    const missing = evaluateSkillPurchasePlan(
      emptyPlan({ nativeLanguage: '' }),
      humanFreeAgentScores,
      getSpeciesById('human')!,
      getProfessionById('free-agent')!,
      skills,
      professions,
      rules,
    );
    expect(missing.errors).toContain('A native language is required; it is granted at rank 3 for free.');
  });

  it('rejects the same specialized subject more than once regardless of casing', () => {
    const result = evaluateSkillPurchasePlan(
      emptyPlan({
        nativeLanguage: 'French',
        specialtySkills: [
          { skillId: 'language', rank: 1, specialization: 'English' },
          { skillId: 'language', rank: 1, specialization: ' english ' },
        ],
      }),
      humanFreeAgentScores,
      getSpeciesById('human')!,
      getProfessionById('free-agent')!,
      skills,
      professions,
      rules,
    );

    expect(result.errors).toContain('Language (english) is purchased more than once.');
  });

  it('enforces the Intelligence-based purchased broad-skill limit', () => {
    const scores: AbilityScores = { str: 10, dex: 10, con: 10, int: 5, wil: 11, per: 14 };
    const result = evaluateSkillPurchasePlan(
      emptyPlan({
        purchasedBroadSkillIds: ['acrobatics', 'stealth', 'business', 'computer-science'],
      }),
      scores,
      getSpeciesById('human')!,
      getProfessionById('diplomat')!,
      skills,
      professions,
      rules,
    );

    expect(result.maxPurchasedBroadSkills).toBe(3);
    expect(result.purchasedBroadSkillCount).toBe(4);
    expect(result.errors).toContain('Purchased broad skills exceed the limit of 3 by 1.');
  });
});