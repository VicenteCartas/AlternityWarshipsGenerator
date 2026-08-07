import { describe, expect, it } from 'vitest';
import { DEFAULT_TRAVEL_DOCUMENT } from '../types/travelDocument';
import {
  deserializeTravelDocument,
  getDefaultTravelFileName,
  jsonToTravelSaveFile,
  serializeTravelDocument,
  travelSaveFileToJson,
} from './travelSaveService';

describe('travelSaveService', () => {
  it('round-trips calculator inputs and an imported ship profile', () => {
    const document = {
      ...DEFAULT_TRAVEL_DOCUMENT,
      name: 'Tendril Run',
      accelerationSource: 'ship' as const,
      importedShip: {
        name: 'Fast Courier',
        hullName: 'Cutter',
        progressLevel: 7,
        pl6AccelerationRating: 0,
        pl7AccelerationRating: 3,
        accelerationMps2: 100,
        hasAccelerationCompensation: true,
        warnings: ['Test warning'],
        engines: [{
          engineTypeId: 'fusion-engine',
          name: 'Fusion engine',
          scaleId: 'pl7plus' as const,
          engineHullPoints: 2,
          accelerationRating: 3,
          accelerationMps2: 100,
          requiresFuel: true,
          fuelOptional: false,
          fuelEfficiency: 30,
          fuelTankHullPoints: 4,
          fuelEnduranceDays: 60,
        }],
      },
    };

    const parsed = jsonToTravelSaveFile(travelSaveFileToJson(serializeTravelDocument(document)));
    const loaded = parsed ? deserializeTravelDocument(parsed) : null;

    expect(loaded?.success).toBe(true);
    expect(loaded?.document).toEqual(document);
  });

  it('falls back defensively and does not leave a missing ship selected', () => {
    const saveFile = serializeTravelDocument(DEFAULT_TRAVEL_DOCUMENT);
    const loaded = deserializeTravelDocument({
      ...saveFile,
      version: '0.9',
      document: {
        ...DEFAULT_TRAVEL_DOCUMENT,
        distance: Number.NaN,
        distanceUnit: 'invalid' as never,
        accelerationSource: 'ship',
        importedShip: null,
      },
    });

    expect(loaded.document).toMatchObject({
      distance: 25,
      distanceUnit: 'AU',
      accelerationSource: 'rating',
      importedShip: null,
    });
    expect(loaded.warnings).toHaveLength(2);
  });

  it('rejects malformed JSON and creates a safe default filename', () => {
    expect(jsonToTravelSaveFile('not json')).toBeNull();
    expect(jsonToTravelSaveFile('{"version":"1.0"}')).toBeNull();
    expect(getDefaultTravelFileName('Tendril: Run?/')).toBe('Tendril Run.travel.json');
  });
});
