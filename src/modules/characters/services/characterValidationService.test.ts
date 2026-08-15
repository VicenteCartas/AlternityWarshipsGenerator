import { describe, expect, it } from 'vitest';
import { createEmptyCharacter } from '../constants/characterDefaults';
import { validateCharacter } from './characterValidationService';

function validHumanFreeAgent() {
  const state = createEmptyCharacter();
  state.identity.heroName = 'Jordan Kade';
  state.identity.career = 'Scout';
  state.identity.motivation = 'Discover the unknown';
  state.identity.moralAttitude = 'Ethical';
  state.identity.characterTraits = ['Curious'];
  state.professionId = 'free-agent';
  state.abilityScores = { str: 8, dex: 12, con: 10, int: 12, wil: 9, per: 9 };
  state.resistanceBonusAbility = 'dex';
  state.skillPlan.nativeLanguage = 'English';
  state.startingFundsDieRolls = [8, 7, 6, 5, 4];
  return state;
}

describe('complete character validation', () => {
  it('accepts a complete level-one human Free Agent and calculates shared budgets', () => {
    const result = validateCharacter(validHumanFreeAgent());
    expect(result.valid).toBe(true);
    expect(result.remainingSkillPoints).toBe(60);
    expect(result.startingFunds.totalFunds).toBe(3000);
    expect(result.remainingFunds).toBe(3000);
    expect(result.derived.actionCheck.score).toBe(14);
    expect(result.derived.resistanceModifiers.dex).toBe(2);
  });

  it('applies flaw and perk skill points before core and psionic purchases', () => {
    const state = validHumanFreeAgent();
    state.optionSelections = [
      { optionId: 'ambidextrous', value: 4 },
      { optionId: 'bad-luck', value: 6 },
    ];
    state.skillPlan.purchasedBroadSkillIds = ['stealth'];
    state.psionicPlan = {
      accessPath: 'talent',
      purchasedBroadSkillIds: ['esp'],
      specialtySkills: [{ skillId: 'empathy', rank: 1 }],
    };

    const result = validateCharacter(state);
    expect(result.valid).toBe(true);
    expect(result.skills.availableSkillPoints).toBe(62);
    expect(result.skills.remainingSkillPoints).toBe(56);
    expect(result.psionics.spentSkillPoints).toBe(8);
    expect(result.remainingSkillPoints).toBe(48);
  });

  it('applies GMG FX purchases after psionics in the shared skill budget', () => {
    const state = validHumanFreeAgent();
    state.selectedSourcePackIds.push('gmg-fx');
    state.fxPlan = {
      campaignTone: 'heroic',
      broadSkill: 'arcane',
      designs: [{
        id: 'bolt',
        name: 'Bolt of Lightning',
        discipline: 'arcane',
        category: 'conjure',
        ability: 'wil',
        description: 'A bolt of electrical energy.',
        characteristics: [
          { characteristicId: 'attack-type', choiceId: 'energy' },
          { characteristicId: 'stun-damage', choiceId: '1-5' },
          { characteristicId: 'wound-damage', choiceId: '1-5' },
          { characteristicId: 'range', choiceId: '2-4-6-m' },
        ],
        trappings: { complexRitual: true, component: 'Wood shaving' },
      }],
      abilityPurchases: [{ designId: 'bolt', rank: 1 }],
      faithPurchases: [],
    };

    const result = validateCharacter(state);

    expect(result.fx.valid).toBe(true);
    expect(result.fx.spentSkillPoints).toBe(20);
    expect(result.remainingSkillPoints).toBe(40);
  });

  it('requires identity, profession, funds, and a balanced mutation package when applicable', () => {
    const empty = validateCharacter(createEmptyCharacter());
    expect(empty.valid).toBe(false);
    expect(empty.errors).toEqual(expect.arrayContaining([
      'Hero name is required.',
      'Career is required.',
      'Profession is required.',
      'Profession is required before calculating starting funds.',
    ]));

    const mutant = validHumanFreeAgent();
    mutant.speciesId = 'mutant-human';
    const mutantResult = validateCharacter(mutant);
    expect(mutantResult.errors).toEqual(expect.arrayContaining([
      'A mutant must have at least 1 advantageous point and 1 drawback point.',
    ]));
  });

  it('returns fresh defaults that can be safely serialized and restored', () => {
    const first = createEmptyCharacter();
    const second = createEmptyCharacter();
    first.identity.characterTraits.push('Changed');
    first.skillPlan.purchasedBroadSkillIds.push('stealth');
    expect(second.identity.characterTraits).toEqual([]);
    expect(second.skillPlan.purchasedBroadSkillIds).toEqual([]);
    expect(JSON.parse(JSON.stringify(validHumanFreeAgent()))).toEqual(validHumanFreeAgent());
  });

  it('shares funds with combat gear and applies armor penalties to derived values', () => {
    const state = validHumanFreeAgent();
    state.weaponSelections = [{ weaponId: 'combat-knife', quantity: 1, spareClips: 0 }];
    state.armorSelections = [{ armorId: 'battle-jacket', quantity: 1 }];
    const result = validateCharacter(state);
    expect(result.valid).toBe(true);
    expect(result.combatGear.totalCost).toBe(1535);
    expect(result.remainingFunds).toBe(1465);
    expect(result.derived.actionCheck.dieStep).toBe(1);
    expect(result.derived.resistanceModifiers.dex).toBe(1);
  });

  it('defers purchase budget errors until starting funds are established', () => {
    const state = validHumanFreeAgent();
    state.startingFundsDieRolls = [];
    state.equipmentSelections = [{ equipmentId: 'bedroll', quantity: 1 }];
    state.weaponSelections = [{ weaponId: 'combat-knife', quantity: 1, spareClips: 0 }];
    state.armorSelections = [{ armorId: 'hide-armor', quantity: 1 }];

    const result = validateCharacter(state);
    expect(result.errors).toContain('Starting funds require exactly 5 die results.');
    expect(result.errors.some((error) => /exceed.*fund/i.test(error))).toBe(false);
    expect(result.remainingFunds).toBe(0);
  });

  it('requires profession benefit choices and no more than two traits', () => {
    const state = validHumanFreeAgent();
    state.resistanceBonusAbility = undefined;
    state.identity.characterTraits = ['One', 'Two', 'Three'];
    let result = validateCharacter(state);
    expect(result.errors).toEqual(expect.arrayContaining([
      'Free Agent requires a resistance bonus Ability.',
      'A starting hero may have at most 2 character traits.',
    ]));

    state.professionId = 'diplomat';
    state.abilityScores = { str: 8, dex: 9, con: 9, int: 12, wil: 11, per: 11 };
    result = validateCharacter(state);
    expect(result.professionErrors).toEqual(expect.arrayContaining([
      'Diplomat requires either Contacts or Resources.',
      'Diplomat requires exactly one secondary profession.',
    ]));
  });

  it('applies paid species options to the shared skill-point budget', () => {
    const state = validHumanFreeAgent();
    state.speciesId = 'weren';
    state.abilityScores = { str: 12, dex: 8, con: 9, int: 10, wil: 10, per: 11 };
    state.speciesOptionIds = ['weren-reduced-technology-penalty'];
    const result = validateCharacter(state);
    expect(result.speciesBenefits.skillPointCost).toBe(4);
    expect(result.speciesBenefits.technologyUseStepPenalty).toBe(1);
    expect(result.skills.availableSkillPoints).toBe(41);
  });

  it('applies achievement benefits to final derived statistics', () => {
    const state = validHumanFreeAgent();
    state.level = 4;
    state.advancementPlan.levels = [
      { level: 2, broadSkills: [], specialtySkills: [], benefits: [], lastResortPointsSpent: 0, lastResortPointsPurchased: 0, creditsAwarded: 0, acquisitions: [], notes: '' },
      {
        level: 3,
        broadSkills: [],
        specialtySkills: [],
        benefits: [
          { type: 'ability-score-increase', ability: 'dex' },
          { type: 'action-check-increase' },
          { type: 'stun-rating-increase' },
        ],
        lastResortPointsSpent: 0,
        lastResortPointsPurchased: 0,
        creditsAwarded: 0,
        acquisitions: [],
        notes: '',
      },
      { level: 4, broadSkills: [], specialtySkills: [], benefits: [{ type: 'extra-action' }], lastResortPointsSpent: 0, lastResortPointsPurchased: 0, creditsAwarded: 0, acquisitions: [], notes: '' },
    ];

    const result = validateCharacter(state);
    expect(result.valid).toBe(true);
    expect(result.effectiveAbilityScores.dex).toBe(13);
    expect(result.derived.actionCheck.score).toBe(15);
    expect(result.derived.actionsPerRound).toBe(3);
    expect(result.derived.durability.stun).toBe(11);
    expect(result.advancement.remainingSkillPoints).toBe(59);
  });

  it('applies granted advancement equipment without charging campaign credits', () => {
    const state = validHumanFreeAgent();
    state.level = 2;
    state.advancementPlan.levels = [{
      level: 2,
      broadSkills: [],
      specialtySkills: [],
      benefits: [],
      lastResortPointsSpent: 0,
      lastResortPointsPurchased: 0,
      creditsAwarded: 0,
      acquisitions: [{ kind: 'armor', itemId: 'battle-jacket', method: 'granted', quantity: 1 }],
      notes: '',
    }];

    const result = validateCharacter(state);
    expect(result.valid).toBe(true);
    expect(result.advancement.remainingCredits).toBe(3000);
    expect(result.advancement.finalArmorSelections).toEqual([{ armorId: 'battle-jacket', quantity: 1 }]);
    expect(result.derived.actionCheck.dieStep).toBe(1);
    expect(result.derived.resistanceModifiers.dex).toBe(1);
  });
});