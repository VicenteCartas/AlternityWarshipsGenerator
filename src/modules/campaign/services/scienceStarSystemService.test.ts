import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SCIENCE_SETTINGS,
  generateScienceStarSystem,
  mutualHillSpacing,
} from './scienceStarSystemService';

const settings = { ...DEFAULT_SCIENCE_SETTINGS, lifeFrequency: 'common' as const };

describe('science-informed star-system generation', () => {
  it('is reproducible from the same seed and settings', () => {
    const first = generateScienceStarSystem({ seed: 'Kepler-62', starCount: 1, settings });
    const second = generateScienceStarSystem({ seed: 'Kepler-62', starCount: 1, settings });
    const different = generateScienceStarSystem({ seed: 'TRAPPIST-1', starCount: 1, settings });
    expect(second).toEqual(first);
    expect(different).not.toEqual(first);
    expect(first.generationModel).toBe('science');
    expect(first.seed).toBe('Kepler-62');
  });

  it('produces positive stellar properties and ordered physical boundaries', () => {
    const system = generateScienceStarSystem({ seed: 'Horizon', settings });
    expect(system.science).not.toBeNull();
    expect(system.science!.habitableZoneInnerAu).toBeLessThan(system.science!.habitableZoneOuterAu);
    expect(system.science!.stableInnerAu).toBeLessThan(system.science!.stableOuterAu);
    expect(system.science!.snowLineAu).toBeGreaterThan(system.science!.habitableZoneInnerAu);
    for (const star of system.stars) {
      expect(star.science!.massSolar).toBeGreaterThan(0);
      expect(star.science!.radiusSolar).toBeGreaterThan(0);
      expect(star.science!.luminositySolar).toBeGreaterThan(0);
      expect(star.science!.temperatureK).toBeGreaterThan(1_500);
    }
  });

  it('uses Kepler periods and stable mutual-Hill spacing', () => {
    const system = generateScienceStarSystem({
      seed: 'Stable Architecture',
      starCount: 1,
      settings: { ...settings, systemDensity: 'crowded', planetOccurrence: 'optimistic' },
    });
    expect(system.planets.length).toBeGreaterThan(1);
    for (const planet of system.planets) {
      const expectedPeriod = 365.25 * Math.sqrt(planet.distanceAu ** 3 / system.science!.centralMassSolar);
      expect(planet.science!.orbitalPeriodDays).toBeCloseTo(expectedPeriod, 0);
      expect(planet.science!.massEarth).toBeGreaterThan(0);
      expect(planet.science!.radiusEarth).toBeGreaterThan(0);
      expect(planet.science!.densityGcm3).toBeGreaterThan(0);
      expect(planet.science!.gravityEarth).toBeGreaterThan(0);
      expect(planet.gmgTranslation).toBeDefined();
      expect(planet.gmgTranslation!.environmentClass).toBeGreaterThanOrEqual(1);
      expect(planet.gmgTranslation!.environmentClass).toBeLessThanOrEqual(5);
    }
    for (let index = 1; index < system.planets.length; index += 1) {
      const inner = system.planets[index - 1];
      const outer = system.planets[index];
      expect(mutualHillSpacing(
        inner.distanceAu,
        outer.distanceAu,
        inner.science!.massEarth,
        outer.science!.massEarth,
        system.science!.centralMassSolar,
      )).toBeGreaterThanOrEqual(8.9);
    }
  });

  it('respects the life-frequency switch', () => {
    const system = generateScienceStarSystem({
      seed: 'No Biosphere',
      settings: { ...DEFAULT_SCIENCE_SETTINGS, lifeFrequency: 'none' },
    });
    expect(system.planets.every((planet) => planet.science!.life === 'none')).toBe(true);
  });

  it('limits fixed multiple-star systems to a stable hierarchy', () => {
    const system = generateScienceStarSystem({ seed: 'Triple', starCount: 3, settings });
    expect(system.stars).toHaveLength(3);
    expect(system.stars[1].science!.separationAu).toBeGreaterThan(0);
    expect(system.stars[2].science!.separationAu).toBeGreaterThan(system.stars[1].science!.separationAu! * 7.9);
  });
});
