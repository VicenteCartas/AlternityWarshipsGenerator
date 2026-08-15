import { describe, expect, it } from 'vitest';
import {
  calculateCharacterDerivedStats,
  calculateDurability,
  calculateResistanceModifier,
  calculateSkillScore,
  validateAbilityAllocation,
} from './characterCalculationService';
import {
  getAllCharacterSourcePacks,
  getAllProfessions,
  getAllSpecies,
  getCharacterRules,
  getProfessionById,
  getSpeciesById,
} from './characterDataService';
import type { AbilityScores } from '../types/character';

const rules = getCharacterRules();

describe('PHB character data', () => {
  it('defines the seven PHB species options and five professions', () => {
    expect(getAllSpecies().map((entry) => entry.id)).toEqual([
      'human', 'mutant-human', 'fraal', 'mechalus', 'sesheyan', 'tsa', 'weren',
    ]);
    expect(getAllProfessions().map((entry) => entry.id)).toEqual([
      'combat-spec', 'diplomat', 'free-agent', 'tech-op', 'mindwalker',
    ]);
  });

  it('gives every species exactly six free broad skills', () => {
    for (const species of getAllSpecies()) {
      expect(species.freeBroadSkillIds, species.name).toHaveLength(6);
      expect(new Set(species.freeBroadSkillIds).size, species.name).toBe(6);
    }
  });

  it('marks the PHB as required, GMG FX as implemented, and future accessories as planned', () => {
    const packs = getAllCharacterSourcePacks();
    expect(packs.find((pack) => pack.id === 'phb')).toMatchObject({ required: true, status: 'implemented' });
    expect(packs.find((pack) => pack.id === 'gmg-fx')).toMatchObject({ required: false, status: 'implemented', sections: ['fx'] });
    expect(packs.find((pack) => pack.id === 'mindwalking')?.replaces).toContain('phb:psionics');
    expect(packs.filter((pack) => !['phb', 'gmg-fx'].includes(pack.id)).every((pack) => pack.status === 'planned')).toBe(true);
  });
});

describe('ability validation', () => {
  it('accepts the PHB human Free Agent example', () => {
    const scores: AbilityScores = { str: 8, dex: 12, con: 10, int: 12, wil: 9, per: 9 };
    const result = validateAbilityAllocation(
      scores,
      getSpeciesById('human')!,
      getProfessionById('free-agent')!,
      rules,
    );
    expect(result).toEqual({ valid: true, pointsUsed: 60, pointsRemaining: 0, errors: [] });
  });

  it('reports point-pool, species-limit, and profession errors together', () => {
    const scores: AbilityScores = { str: 8, dex: 8, con: 10, int: 10, wil: 10, per: 10 };
    const result = validateAbilityAllocation(
      scores,
      getSpeciesById('weren')!,
      getProfessionById('combat-spec')!,
      rules,
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.stringContaining('total 60'),
      expect.stringContaining('STR must be between 9 and 16'),
      expect.stringContaining('Combat Spec requires STR 11'),
    ]));
  });
});

describe('derived statistics', () => {
  it('calculates the PHB human Free Agent example', () => {
    const scores: AbilityScores = { str: 8, dex: 12, con: 10, int: 12, wil: 9, per: 9 };
    const derived = calculateCharacterDerivedStats(
      scores,
      getSpeciesById('human')!,
      getProfessionById('free-agent')!,
      rules,
    );

    expect(derived.skillBudget).toEqual({
      baseSkillPoints: 55,
      totalSkillPoints: 60,
      maxPurchasedBroadSkills: 7,
    });
    expect(derived.actionCheck).toEqual({
      score: 14, marginal: 15, ordinary: 14, good: 7, amazing: 3, dieStep: 0,
    });
    expect(derived.actionsPerRound).toBe(2);
    expect(derived.movement).toMatchObject({ sprint: 20, run: 12, walk: 4, easySwim: 2, swim: 4 });
    expect(derived.durability).toEqual({ stun: 10, wound: 10, mortal: 5, fatigue: 5 });
    expect(derived.lastResorts).toEqual({ maximum: 2, initial: 1, cost: 3, actionCost: 2 });
    expect(derived.resistanceModifiers).toEqual({ str: 0, dex: 1, con: 0, int: 1, wil: 0, per: null });
    expect(derived.untrainedScores).toEqual({ str: 4, dex: 6, con: 5, int: 6, wil: 4, per: 4 });
    expect(derived.strengthDamageAdjustment).toBe(0);
  });

  it('applies T\'sa action-check and Weren durability abilities', () => {
    const tsaScores: AbilityScores = { str: 9, dex: 14, con: 8, int: 11, wil: 8, per: 10 };
    const tsa = calculateCharacterDerivedStats(tsaScores, getSpeciesById('tsa')!, null, rules);
    expect(tsa.actionCheck.dieStep).toBe(-1);

    const werenScores: AbilityScores = { str: 12, dex: 8, con: 9, int: 10, wil: 10, per: 11 };
    expect(calculateDurability(werenScores, getSpeciesById('weren')!)).toEqual({
      stun: 13, wound: 13, mortal: 7, fatigue: 7,
    });
  });

  it('applies a Free Agent resistance choice without changing other modifiers', () => {
    const scores: AbilityScores = { str: 8, dex: 12, con: 10, int: 12, wil: 9, per: 9 };
    const derived = calculateCharacterDerivedStats(
      scores,
      getSpeciesById('human')!,
      getProfessionById('free-agent')!,
      rules,
      { resistanceBonusAbility: 'dex' },
    );
    expect(derived.resistanceModifiers).toEqual({ str: 0, dex: 2, con: 0, int: 1, wil: 0, per: null });
  });

  it('matches resistance and skill-score threshold rules', () => {
    expect(calculateResistanceModifier(4, rules)).toBe(-2);
    expect(calculateResistanceModifier(10, rules)).toBe(0);
    expect(calculateResistanceModifier(19, rules)).toBe(5);
    expect(calculateSkillScore(12, 3)).toEqual({ ordinary: 15, good: 7, amazing: 3 });
  });
});