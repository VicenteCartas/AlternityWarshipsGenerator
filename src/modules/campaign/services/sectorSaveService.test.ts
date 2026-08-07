import { describe, expect, it } from 'vitest';
import { DEFAULT_SECTOR_SETTINGS, generateSector } from './sectorGenerationService';
import {
  deserializeSector,
  getDefaultSectorFileName,
  jsonToSectorSaveFile,
  serializeSector,
} from './sectorSaveService';

describe('sectorSaveService', () => {
  it('round-trips systems, factions, borders inputs, features, and routes', () => {
    const sector = { ...generateSector(DEFAULT_SECTOR_SETTINGS), name: 'Orion Reach' };
    const parsed = jsonToSectorSaveFile(JSON.stringify(serializeSector(sector)));
    const loaded = parsed ? deserializeSector(parsed) : null;

    expect(loaded?.success).toBe(true);
    expect(loaded?.value).toEqual(sector);
    expect(getDefaultSectorFileName('Orion: Reach?/')).toBe('Orion Reach.sector.json');
  });

  it('removes routes and faction links that reference missing systems', () => {
    const sector = generateSector(DEFAULT_SECTOR_SETTINGS);
    const saveFile = serializeSector({
      ...sector,
      systems: sector.systems.slice(0, 1),
      factions: [{ ...sector.factions[0], capitalSystemId: 'missing' }],
      routes: [{ id: 'bad', fromSystemId: sector.systems[0].id, toSystemId: 'missing', distanceLy: 5, type: 'standard' }],
    });
    const loaded = deserializeSector(saveFile);

    expect(loaded.value?.factions).toEqual([]);
    expect(loaded.value?.routes).toEqual([]);
    expect(loaded.value?.systems[0].factionId).toBeNull();
  });

  it('regenerates missing mapped systems and rejects incompatible formats', () => {
    const sector = generateSector(DEFAULT_SECTOR_SETTINGS);
    const empty = deserializeSector(serializeSector({ ...sector, systems: [] }));
    expect(empty.value?.systems.length).toBeGreaterThan(0);
    expect(empty.warnings).toHaveLength(1);

    const incompatible = deserializeSector({ ...serializeSector(sector), version: '2.0' });
    expect(incompatible.success).toBe(false);
    expect(jsonToSectorSaveFile('not json')).toBeNull();
  });
});
