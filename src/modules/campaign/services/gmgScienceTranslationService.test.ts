import { describe, expect, it } from 'vitest';
import type { GeneratedPlanet, ScientificPlanetProperties } from '../types/worldbuilding';
import {
  formatGraphCode,
  gravityToGmgRating,
  pressureToGmgRating,
  temperatureToGmgRating,
  translateSciencePlanetToGmg,
} from './gmgScienceTranslationService';

const baseScience: ScientificPlanetProperties = {
  composition: 'rocky',
  massEarth: 1,
  radiusEarth: 1,
  densityGcm3: 5.514,
  gravityEarth: 1,
  orbitalPeriodDays: 365.25,
  eccentricity: 0.017,
  equilibriumTempK: 255,
  albedo: 0.3,
  habitableZonePosition: 'within',
  rotationHours: 24,
  tidallyLocked: false,
  atmosphere: 'Nitrogen rich',
  surfacePressureAtm: 1,
  water: 'Surface water plausible',
  habitability: 'potentially habitable',
  life: 'complex',
};

function planet(science: Partial<ScientificPlanetProperties> = {}): GeneratedPlanet {
  return {
    id: 'planet-1', ring: 1, distanceAu: 1, typeRoll: 0, type: 'Rocky world, temperate', temperature: 'temperate',
    moonCountRoll: null, moons: [], environment: null, science: { ...baseScience, ...science },
  };
}

const context = {
  primaryStar: {
    id: 'star-1', group: 1, role: 'Primary' as const, classification: 'G V', color: 'Yellow',
    science: { massSolar: 1, radiusSolar: 1, luminositySolar: 1, temperatureK: 5772, ageGyr: 4.6, metallicityDex: 0, separationAu: null },
  },
  effectiveLuminositySolar: 1,
  systemAgeGyr: 4.6,
};

describe('science-to-GMG translation', () => {
  it('maps exact physical GRAPH boundaries', () => {
    expect([0.1, 0.5, 1, 1.5, 3, 5].map(gravityToGmgRating)).toEqual([0, 1, 2, 3, 4, 5]);
    expect([0, 0.3, 0.6, 1, 10, 30].map(pressureToGmgRating)).toEqual([0, 1, 2, 3, 4, 5]);
    expect([50, 200, 273.15, 350, 700, 900].map(temperatureToGmgRating)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('maps an Earth-like world to a usable Terran GMG profile', () => {
    const translation = translateSciencePlanetToGmg(planet(), context);
    expect(translation).toMatchObject({
      planetType: 'Terran, temperate',
      gravity: 2,
      atmosphere: 2,
      pressure: 3,
      heat: 2,
      oceanExtent: 'Moderate',
      climate: 'Active',
      lifeSeries: ['I'],
    });
    expect([1, 2]).toContain(translation.radiation);
    expect([1, 2]).toContain(translation.environmentClass);
    expect(formatGraphCode(translation)).toMatch(/^G2\/R[12]\/A2\/P3\/H2$/);
  });

  it('maps airless low-gravity worlds to hostile GMG ratings', () => {
    const translation = translateSciencePlanetToGmg(planet({
      massEarth: 0.1,
      radiusEarth: 0.55,
      gravityEarth: 0.33,
      equilibriumTempK: 170,
      atmosphere: 'Airless or trace exosphere',
      surfacePressureAtm: 0,
      water: 'Surface ice',
      habitability: 'unlikely',
      life: 'none',
    }), context);
    expect(translation.planetType).toBe('Sub-Terran, cold');
    expect(translation).toMatchObject({ gravity: 1, atmosphere: 0, pressure: 0, heat: 1, oceanExtent: 'Sparse' });
    expect(translation.environmentClass).toBeGreaterThanOrEqual(3);
  });

  it('maps giant worlds to gas-giant game profiles', () => {
    const giant = planet({
      composition: 'gas', massEarth: 318, radiusEarth: 11, gravityEarth: 2.63,
      atmosphere: 'Hydrogen and helium', surfacePressureAtm: 1_000,
      equilibriumTempK: 130, water: 'No accessible surface', habitability: 'unlikely', life: 'none',
    });
    const translation = translateSciencePlanetToGmg(giant, context);
    expect(translation).toMatchObject({ planetType: 'Gas giant, large', gravity: 5, atmosphere: 1, pressure: 5 });
    expect(translation.environmentClass).toBe(5);
    expect(translation.assumptions.some((note) => note.includes('no solid surface'))).toBe(true);
  });

  it('documents inferred atmosphere and radiation assumptions', () => {
    const translation = translateSciencePlanetToGmg(planet(), context);
    expect(translation.assumptions.some((note) => note.includes('oxygen abundance'))).toBe(true);
    expect(translation.assumptions.some((note) => note.startsWith('R rating'))).toBe(true);
  });
});
