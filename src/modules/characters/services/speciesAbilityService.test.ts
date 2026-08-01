import { describe, expect, it } from 'vitest';
import { getSpeciesById } from './characterDataService';
import { evaluateSpeciesBenefits } from './speciesAbilityService';

describe('PHB species benefits', () => {
  it('applies Mechalus and T\'sa skill modifiers and T\'sa armor', () => {
    const mechalus = evaluateSpeciesBenefits(getSpeciesById('mechalus')!, [], []);
    expect(mechalus.skillSituationStepBonuses).toEqual({ 'computer-operation': -1, hacking: -1 });
    expect(mechalus.summaries).toEqual(expect.arrayContaining([
      expect.stringContaining('reflex device'),
    ]));
    const tsa = evaluateSpeciesBenefits(getSpeciesById('tsa')!, [], []);
    expect(tsa.skillSituationStepBonuses.juryrig).toBe(-1);
    expect(tsa.naturalArmor).toEqual({ lowImpact: 'd4+1', highImpact: 'd4', energy: 'd4-1' });
  });

  it('grants Sesheyan natural Zero-G capability and improves a purchased skill', () => {
    const natural = evaluateSpeciesBenefits(getSpeciesById('sesheyan')!, [], []);
    expect(natural.grantedSpecialtyRanks['zero-g-training']).toBe(1);
    expect(natural.skillSituationStepBonuses['zero-g-training']).toBeUndefined();
    const purchased = evaluateSpeciesBenefits(getSpeciesById('sesheyan')!, [], [{ skillId: 'zero-g-training', rank: 1 }]);
    expect(purchased.skillSituationStepBonuses['zero-g-training']).toBe(-1);
  });

  it('prices Weren technology training and records natural claws', () => {
    const basic = evaluateSpeciesBenefits(getSpeciesById('weren')!, [], []);
    expect(basic.technologyUseStepPenalty).toBe(2);
    expect(basic.naturalWeapon).toMatchObject({ skillId: 'brawl', damage: 'd4w/d4+2w/d4m' });
    const trained = evaluateSpeciesBenefits(getSpeciesById('weren')!, ['weren-reduced-technology-penalty'], []);
    expect(trained.skillPointCost).toBe(4);
    expect(trained.technologyUseStepPenalty).toBe(1);
  });
});