import { describe, expect, it } from 'vitest';
import { createEmptyCharacter } from '../constants/characterDefaults';
import {
  characterSaveFileToJson,
  deserializeCharacter,
  getDefaultCharacterFileName,
  jsonToCharacterSaveFile,
  serializeCharacter,
} from './characterSaveService';
import { CHARACTER_SAVE_FILE_VERSION } from '../types/characterSaveFile';
import type { CharacterSaveFile } from '../types/characterSaveFile';

function sampleCharacter() {
  const character = createEmptyCharacter();
  character.identity.heroName = 'Jordan Kade';
  character.identity.career = 'Scout';
  character.identity.motivation = 'Discover the unknown';
  character.identity.moralAttitude = 'Ethical';
  character.identity.characterTraits = ['Curious', 'Methodical'];
  character.identity.gamemaster = 'Alex';
  character.identity.allegiance = 'Concord';
  character.identity.socialStatus = 'Citizen';
  character.identity.contacts = 'Captain Vale';
  character.identity.enemies = 'The Orion League';
  character.identity.notes = 'Carries a survey license.';
  character.professionId = 'free-agent';
  character.abilityScores = { str: 8, dex: 12, con: 10, int: 12, wil: 9, per: 9 };
  character.startingFundsDieRolls = [8, 7, 6, 5, 4];
  character.skillPlan.purchasedBroadSkillIds = ['stealth'];
  character.skillPlan.nativeLanguage = 'Galactic Standard';
  return character;
}

describe('character save files', () => {
  it('serializes version, source packs, mods, and timestamps', () => {
    const file = serializeCharacter(sampleCharacter(), [{
      manifest: { name: 'Test Characters', author: 'Tester', version: '1.2', description: '', module: 'warships' },
      folderName: 'test-characters',
      enabled: true,
      priority: 1,
      files: [],
    }], '2026-07-30T00:00:00.000Z');
    expect(CHARACTER_SAVE_FILE_VERSION).toBe('1.3');
    expect(file.version).toBe('1.3');
    expect(file.createdAt).toBe('2026-07-30T00:00:00.000Z');
    expect(file.sourcePacks).toEqual([{ id: 'phb', version: '1.0' }]);
    expect(file.activeMods).toEqual([{ name: 'Test Characters', version: '1.2' }]);
  });

  it('round-trips a complete plain-data state', () => {
    const original = sampleCharacter();
    const parsed = jsonToCharacterSaveFile(characterSaveFileToJson(serializeCharacter(original)));
    expect(parsed).not.toBeNull();
    const result = deserializeCharacter(parsed!);
    expect(result.success).toBe(true);
    expect(result.character).toEqual(original);
  });

  it('round-trips multiple subjects of the same specialty skill', () => {
    const original = sampleCharacter();
    original.skillPlan.specialtySkills = [
      { skillId: 'language', rank: 2, specialization: 'English' },
      { skillId: 'language', rank: 1, specialization: 'Spanish' },
    ];

    const parsed = jsonToCharacterSaveFile(characterSaveFileToJson(serializeCharacter(original)));
    const result = deserializeCharacter(parsed!);
    expect(result.character?.skillPlan.specialtySkills).toEqual(original.skillPlan.specialtySkills);
  });

  it('round-trips official optional skill rules', () => {
    const original = sampleCharacter();
    original.skillRules = {
      startingSkillAllocation: 'optional-2ab',
      specialtySkillCosts: 'optional-2c',
    };

    const parsed = jsonToCharacterSaveFile(characterSaveFileToJson(serializeCharacter(original)));
    const result = deserializeCharacter(parsed!);

    expect(result.character?.skillRules).toEqual(original.skillRules);
  });

  it('round-trips GMG FX designs and purchases', () => {
    const original = sampleCharacter();
    original.selectedSourcePackIds.push('gmg-fx');
    original.fxPlan = {
      campaignTone: 'heroic',
      broadSkill: 'faith',
      designs: [],
      abilityPurchases: [],
      faithPurchases: [{ quality: 'good', rank: 2 }],
    };

    const parsed = jsonToCharacterSaveFile(characterSaveFileToJson(serializeCharacter(original)));
    const result = deserializeCharacter(parsed!);

    expect(result.character?.fxPlan).toEqual(original.fxPlan);
  });

  it('skips malformed nested FX records without making the character unloadable', () => {
    const file = serializeCharacter(sampleCharacter());
    file.character.fxPlan = {
      campaignTone: 'heroic',
      broadSkill: 'arcane',
      designs: [{} as never],
      abilityPurchases: [{ designId: 'missing', rank: Number.NaN }],
      faithPurchases: [{ quality: 'wrong' as never, rank: 1 }],
    };

    const result = deserializeCharacter(file);

    expect(result.success).toBe(true);
    expect(result.character?.fxPlan.designs).toEqual([]);
    expect(result.character?.fxPlan.abilityPurchases).toEqual([]);
    expect(result.character?.fxPlan.faithPurchases).toEqual([]);
    expect(result.warnings).toContain('Invalid FX designs or purchases were skipped while loading.');
  });

  it('round-trips target level and advancement transactions', () => {
    const original = sampleCharacter();
    original.level = 3;
    original.advancementPlan.levels = [
      {
        level: 2,
        broadSkills: [],
        specialtySkills: [{ domain: 'core', skillId: 'sneak' }],
        benefits: [],
        lastResortPointsSpent: 0,
        lastResortPointsPurchased: 0,
        creditsAwarded: 500,
        acquisitions: [{ kind: 'equipment', itemId: 'bedroll', method: 'granted', quantity: 1 }],
        notes: 'First advancement',
      },
    ];

    const parsed = jsonToCharacterSaveFile(characterSaveFileToJson(serializeCharacter(original)));
    const result = deserializeCharacter(parsed!);
    expect(result.character?.level).toBe(3);
    expect(result.character?.advancementPlan).toEqual(original.advancementPlan);
  });

  it('defaults missing fields and reports migration warnings', () => {
    const partial = {
      version: '0.5',
      appVersion: '0.0.0',
      createdAt: '',
      modifiedAt: '',
      sourcePacks: [],
      character: {
        identity: { heroName: 'Legacy Hero' },
        speciesId: 'human',
        abilityScores: { str: 9 },
      },
    } as unknown as CharacterSaveFile;
    const result = deserializeCharacter(partial);
    expect(result.success).toBe(true);
    expect(result.character?.identity.heroName).toBe('Legacy Hero');
    expect(result.character?.abilityScores).toEqual({ str: 9, dex: 10, con: 10, int: 10, wil: 10, per: 10 });
    expect(result.character?.selectedSourcePackIds).toEqual(['phb']);
    expect(result.character?.level).toBe(1);
    expect(result.character?.advancementPlan).toEqual({ levels: [] });
    expect(result.character?.skillRules).toEqual({
      startingSkillAllocation: 'standard',
      specialtySkillCosts: 'standard',
    });
    expect(result.character?.skillPlan.nativeLanguage).toBe('');
    expect(result.character?.identity).toMatchObject({
      gamemaster: '', allegiance: '', socialStatus: '', contacts: '', enemies: '', notes: '',
    });
    expect(result.warnings).toEqual(expect.arrayContaining([
      expect.stringContaining('saved in format 0.5'),
      'The file had no source-pack selection, so the PHB was enabled.',
      'The file had no skill-rule selection, so standard PHB skill rules were used.',
    ]));
  });

  it('rejects invalid JSON and creates safe filenames', () => {
    expect(jsonToCharacterSaveFile('not json')).toBeNull();
    expect(jsonToCharacterSaveFile('{"version":"1.0"}')).toBeNull();
    expect(getDefaultCharacterFileName('  Jor:dan / Kade  ')).toBe('Jordan Kade.character.json');
  });
});