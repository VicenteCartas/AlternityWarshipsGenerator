import { describe, expect, it } from 'vitest';
import { generateStarSystem } from './starSystemGenerationService';
import { generateScienceStarSystem } from './scienceStarSystemService';
import {
  campaignSaveFileToJson,
  deserializeCivilization,
  deserializeStarSystem,
  getDefaultCivilizationFileName,
  getDefaultSystemFileName,
  jsonToCivilizationSaveFile,
  jsonToStarSystemSaveFile,
  serializeCivilization,
  serializeStarSystem,
} from './campaignSaveService';
import { DEFAULT_CIVILIZATION_DESIGN, createCityTown, createInstallation } from './civilizationDesignService';
import type { CivilizationSaveFile } from '../types/campaignSaveFile';

function deterministicSystem() {
  return generateStarSystem({ starCount: 1, rng: () => 0.2 });
}

describe('campaign save service', () => {
  it('round-trips a named star system', () => {
    const original = { name: 'Horizon', system: deterministicSystem() };
    const parsed = jsonToStarSystemSaveFile(campaignSaveFileToJson(serializeStarSystem(original)));
    expect(parsed).not.toBeNull();
    const loaded = deserializeStarSystem(parsed!);
    expect(loaded.success).toBe(true);
    expect(loaded.value).toEqual(original);
  });

  it('round-trips science generation metadata and physical properties', () => {
    const original = { name: 'Kepler', system: generateScienceStarSystem({ seed: 'Kepler', starCount: 1 }) };
    const parsed = jsonToStarSystemSaveFile(campaignSaveFileToJson(serializeStarSystem(original)));
    const loaded = deserializeStarSystem(parsed!);
    expect(loaded.value).toEqual(original);
  });

  it('recreates missing GMG translations in older science files', () => {
    const original = { name: 'Legacy Science', system: generateScienceStarSystem({ seed: 'Legacy', starCount: 1 }) };
    const saveFile = serializeStarSystem(original);
    saveFile.document.system.planets = saveFile.document.system.planets.map(({ gmgTranslation: _translation, ...planet }) => planet);
    const loaded = deserializeStarSystem(saveFile);
    expect(loaded.value?.system.planets.every((planet) => planet.gmgTranslation)).toBe(true);
    expect(loaded.warnings?.[0]).toContain('Generated GMG game translations');
  });

  it('round-trips a civilization with repeated locations', () => {
    const civilization = {
      ...DEFAULT_CIVILIZATION_DESIGN,
      name: 'Helios Compact',
      cities: [{ ...createCityTown('city-1'), name: 'Port Meridian' }],
      installations: [{ ...createInstallation('station-1'), name: 'Gateway', facilityIds: ['power'] }],
    };
    const parsed = jsonToCivilizationSaveFile(campaignSaveFileToJson(serializeCivilization(civilization)));
    const loaded = deserializeCivilization(parsed!);
    expect(loaded.success).toBe(true);
    expect(loaded.value).toEqual(civilization);
  });

  it('migrates the earlier single-location civilization draft', () => {
    const legacy = {
      version: '', appVersion: '2.0.0-beta.1', createdAt: '', modifiedAt: '',
      civilization: {
        ...DEFAULT_CIVILIZATION_DESIGN,
        cities: undefined,
        installations: undefined,
        cityLayout: 'Radial districts',
        lodging: 'Dockside hostels',
        installationPurpose: 'Research station',
        installationFacilityIds: ['power', 'communications'],
      },
    } as unknown as CivilizationSaveFile;
    const loaded = deserializeCivilization(legacy);
    expect(loaded.success).toBe(true);
    expect(loaded.value?.cities[0]).toMatchObject({ layout: 'Radial districts', lodging: 'Dockside hostels' });
    expect(loaded.value?.installations[0]).toMatchObject({ purpose: 'Research station', facilityIds: ['power', 'communications'] });
    expect(loaded.warnings).toHaveLength(3);
  });

  it('rejects unsupported major versions and malformed JSON', () => {
    expect(deserializeCivilization({ ...serializeCivilization(DEFAULT_CIVILIZATION_DESIGN), version: '2.0' }).success).toBe(false);
    expect(jsonToCivilizationSaveFile('{bad')).toBeNull();
    expect(jsonToStarSystemSaveFile('{}')).toBeNull();
  });

  it('creates safe default file names', () => {
    expect(getDefaultSystemFileName('Alpha: Test')).toBe('Alpha Test.system.json');
    expect(getDefaultCivilizationFileName('')).toBe('Civilization.civilization.json');
  });
});
