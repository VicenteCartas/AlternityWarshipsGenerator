import { describe, expect, it } from 'vitest';
import { DEFAULT_SECTOR_SETTINGS, generateSector } from './sectorGenerationService';
import {
  developSectorSystem,
  exportDetailedSystem,
  importDetailedSystem,
} from './sectorSystemIntegrationService';
import { generateStarSystem } from './starSystemGenerationService';

describe('sector system integration', () => {
  it.each(['gmg', 'science'] as const)('develops a deterministic %s system snapshot', (model) => {
    const sector = generateSector({ ...DEFAULT_SECTOR_SETTINGS, model, seed: `${model} sector` });
    const systemId = sector.systems[0].id;
    const first = developSectorSystem(sector, systemId);
    const second = developSectorSystem(sector, systemId);

    expect(first.systems[0].developedSystem).toEqual(second.systems[0].developedSystem);
    expect(first.systems[0].developedSystem?.generationModel).toBe(model);
  });

  it('imports and exports a standalone star-system document', () => {
    const sector = generateSector(DEFAULT_SECTOR_SETTINGS);
    const systemId = sector.systems[1].id;
    const imported = { name: 'Imported Horizon', system: generateStarSystem({ starCount: 2, rng: () => 0.2 }) };
    const updated = importDetailedSystem(sector, systemId, imported);

    expect(updated.systems[1]).toMatchObject({ name: 'Imported Horizon', multiplicity: 2 });
    expect(exportDetailedSystem(updated, systemId)).toEqual(imported);
  });

  it('does not export an undeveloped system', () => {
    const sector = generateSector(DEFAULT_SECTOR_SETTINGS);
    expect(exportDetailedSystem(sector, sector.systems[0].id)).toBeNull();
  });
});
