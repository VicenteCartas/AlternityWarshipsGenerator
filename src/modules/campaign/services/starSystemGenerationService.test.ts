import { describe, expect, it } from 'vitest';
import {
  environmentFromRoll,
  generateStarSystem,
  moonTypeFromRoll,
  nearestGmgEnvironmentClass,
  planetTypeFromRoll,
  rollPlanetTypeForRing,
  starCountFromRoll,
} from './starSystemGenerationService';

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function sequenceRandom(values: number[], fallback = 0.1): () => number {
  let index = 0;
  return () => values[index++] ?? fallback;
}

describe('GMG star-system tables', () => {
  it('maps every G58 star-count boundary', () => {
    expect([1, 10, 11, 16, 17, 18, 19, 20].map(starCountFromRoll)).toEqual([1, 1, 2, 2, 3, 3, 4, 5]);
  });

  it('maps the G62 planet-type boundaries', () => {
    expect(planetTypeFromRoll(0).type).toBe('Ring system');
    expect(planetTypeFromRoll(1).type).toBe('Super-Terran, hot');
    expect(planetTypeFromRoll(2).type).toBe('Sub-Terran, hot');
    expect(planetTypeFromRoll(7).type).toBe('Super-Terran, temperate');
    expect(planetTypeFromRoll(8).type).toBe('Asteroid belt');
    expect(planetTypeFromRoll(10).type).toBe('Gas giant, large');
    expect(planetTypeFromRoll(17).type).toBe('Sub-Terran, cold');
    expect(planetTypeFromRoll(18).type).toBe('Comet belt');
    expect(rollPlanetTypeForRing(8, () => 0)).toBe(8);
  });

  it('uses d8-3 for a G59 brown dwarf planet count', () => {
    const system = generateStarSystem({
      starCount: 1,
      rng: sequenceRandom([0.99, 0.5, 0.99, 0.1]),
    });
    expect(system.stars[0].classification).toBe('Brown dwarf');
    expect(system.potentialPlanetCount).toBe(6);
  });

  it('maps moon and environment table boundaries', () => {
    expect([2, 4, 7, 8, 10, 12].map(moonTypeFromRoll)).toEqual([
      'Tiny', 'Small', 'Ring system', 'Sub-Terran', 'Terran', 'Super-Terran',
    ]);
    expect(environmentFromRoll('temperate', 1).environmentClass).toBe(4);
    expect(environmentFromRoll('temperate', 13).life).toEqual(['I', 'III']);
    expect(environmentFromRoll('temperate', 19)).toMatchObject({
      environmentClass: 3, gravity: 4, radiation: 3, atmosphere: 4, pressure: 4, heat: 4, life: ['V'], oceanRange: [1, 6],
    });
    expect(environmentFromRoll('hot', 17).environmentClass).toBe(5);
    expect(environmentFromRoll('hot', 11)).toMatchObject({ radiation: 2, atmosphere: 2, pressure: 3, heat: 2 });
    expect(environmentFromRoll('cold', 12)).toMatchObject({ environmentClass: 1, atmosphere: 2, oceanRange: [1, 5] });
    expect(environmentFromRoll('cold', 20).life).toEqual(['II', 'IV']);
    expect(environmentFromRoll('cold', 18, true)).toMatchObject({ environmentClass: 3, life: ['II'] });
    expect(nearestGmgEnvironmentClass('temperate', {
      gravity: 2, radiation: 1, atmosphere: 2, pressure: 3, heat: 2,
    })).toBe(1);
  });

  it('generates internally consistent systems from a deterministic random source', () => {
    const system = generateStarSystem({ starCount: 3, rng: seededRandom(42) });
    expect(system.stars).toHaveLength(3);
    expect(system.starCount).toBe(3);
    expect(['I', 'II', 'III', 'IV', 'V']).toContain(system.orbitTrack);
    expect(system.planets.length + system.unusedPotentialPlanets).toBe(system.potentialPlanetCount);
    expect(system.planets.every((planet) => planet.ring >= 1 && planet.ring <= 16)).toBe(true);
    expect(system.planets.every((planet) => planet.distanceAu > 0)).toBe(true);
    expect(system.planets.every((planet) => planet.moons.length === Math.max(0, planet.moonCountRoll ?? 0))).toBe(true);
  });

  it('stops assigning outer orbits when a comet belt is generated', () => {
    const system = generateStarSystem({
      starCount: 1,
      rng: sequenceRandom([
        0.4, 0.9,
        0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9,
        0.1, 0.99, 0.99,
      ]),
    });
    expect(system.potentialPlanetCount).toBe(9);
    expect(system.planets).toHaveLength(1);
    expect(system.planets[0].type).toBe('Comet belt');
    expect(system.unusedPotentialPlanets).toBe(8);
  });
});