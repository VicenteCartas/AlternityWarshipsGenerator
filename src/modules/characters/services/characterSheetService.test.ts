import { describe, expect, it } from 'vitest';
import { createEmptyCharacter } from '../constants/characterDefaults';
import { validateCharacter } from './characterValidationService';
import { buildCharacterSheetModel } from './characterSheetService';

describe('character sheet model', () => {
  it('resolves the same core, skill, attack, and gear values used by screen and PDF output', () => {
    const state = createEmptyCharacter();
    state.identity.heroName = 'Jordan Kade';
    state.identity.career = 'Scout';
    state.identity.motivation = 'Discovery';
    state.identity.moralAttitude = 'Ethical';
    state.identity.characterTraits = ['Curious'];
    state.identity.allegiance = 'Concord';
    state.professionId = 'free-agent';
    state.resistanceBonusAbility = 'dex';
    state.abilityScores = { str: 8, dex: 12, con: 10, int: 12, wil: 9, per: 9 };
    state.skillPlan.nativeLanguage = 'English';
    state.skillPlan.purchasedBroadSkillIds = ['stealth'];
    state.skillPlan.specialtySkills = [{ skillId: 'sneak', rank: 1 }];
    state.startingFundsDieRolls = [8, 7, 6, 5, 4];
    state.weaponSelections = [{ weaponId: 'combat-knife', quantity: 1, spareClips: 0 }];
    state.armorSelections = [{ armorId: 'battle-jacket', quantity: 1 }];

    const model = buildCharacterSheetModel(state, validateCharacter(state));
    expect(model.heroName).toBe('Jordan Kade');
    expect(model.allegiance).toBe('Concord');
    expect(model.abilities.find(({ id }) => id === 'dex')).toMatchObject({ score: 12, untrained: 6, resistance: 1 });
    expect(model.skills).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Language (English)', rank: 3, source: 'Native', ordinary: 15 }),
      expect.objectContaining({ name: 'Sneak', rank: 1, ordinary: 13 }),
    ]));
    expect(model.attacks).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Combat knife', quantity: 1 }),
    ]));
    expect(model.armor).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Battle jacket', actionCheckPenalty: 1 }),
    ]));
    expect(model.startingFunds).toBe(3000);
    expect(model.remainingFunds).toBe(1465);
    expect(model.professionBenefits[0]).toContain('+1 DEX resistance');
  });

  it('presents intrinsic Mechalus cybertech without treating it as purchased mass', () => {
    const state = createEmptyCharacter();
    state.speciesId = 'mechalus';
    state.skillPlan.nativeLanguage = 'Galactic Standard';

    const model = buildCharacterSheetModel(state, validateCharacter(state));
    expect(model.cybergear).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Nanocomputer', quantity: 1, details: expect.stringContaining('Good'), mass: 0 }),
      expect.objectContaining({ name: 'Neural data slot', quantity: 2, mass: 0 }),
      expect.objectContaining({ name: 'Reflex device circuitry', quantity: 1, mass: 0 }),
    ]));
    expect(model.totalCarriedMass).toBe(0);
  });

  it('presents species-granted specialty ranks without duplicating purchased skills', () => {
    const state = createEmptyCharacter();
    state.speciesId = 'sesheyan';
    state.skillPlan.nativeLanguage = 'Sesheyan';

    let model = buildCharacterSheetModel(state, validateCharacter(state));
    expect(model.skills).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Zero-g training', rank: 1, source: 'Species', ordinary: 11 }),
    ]));

    state.skillPlan.specialtySkills = [{ skillId: 'zero-g-training', rank: 1 }];
    model = buildCharacterSheetModel(state, validateCharacter(state));
    expect(model.skills.filter(({ name }) => name === 'Zero-g training')).toEqual([
      expect.objectContaining({ rank: 1, source: 'Purchased' }),
    ]);
  });
});