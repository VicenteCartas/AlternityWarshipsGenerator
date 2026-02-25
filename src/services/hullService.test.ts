import { describe, it, expect } from 'vitest';
import { calculateHullStats } from './hullService';
import type { Hull } from '../types/hull';

/**
 * Helper to build a minimal Hull object for testing.
 * Only hullPoints, bonusHullPoints, and id are relevant to calculateHullStats.
 */
function makeHull(overrides: Partial<Hull> = {}): Hull {
  return {
    id: 'test-hull',
    name: 'Test Hull',
    shipClass: 'medium',
    category: 'military',
    hullPoints: 100,
    bonusHullPoints: 0,
    toughness: 'Medium',
    targetModifier: 0,
    maneuverability: 2,
    damageTrack: { stun: 10, wound: 10, mortal: 5, critical: 3 },
    crew: 50,
    cost: 1000000,
    description: 'Test hull',
    ...overrides,
  };
}

describe('calculateHullStats', () => {
  it('calculates totalHullPoints as base + bonus', () => {
    const hull = makeHull({ hullPoints: 100, bonusHullPoints: 20 });
    const stats = calculateHullStats(hull);
    expect(stats.totalHullPoints).toBe(120);
  });

  it('returns 0 totalHullPoints for a hull with 0 base and 0 bonus', () => {
    const hull = makeHull({ hullPoints: 0, bonusHullPoints: 0 });
    const stats = calculateHullStats(hull);
    expect(stats.totalHullPoints).toBe(0);
  });

  it('always returns 0 for lightArmorCost', () => {
    const hull = makeHull({ hullPoints: 200 });
    expect(calculateHullStats(hull).lightArmorCost).toBe(0);
  });

  it('calculates mediumArmorCost as ceil(hullPoints * 0.05)', () => {
    const hull = makeHull({ hullPoints: 100 });
    expect(calculateHullStats(hull).mediumArmorCost).toBe(5); // 100 * 0.05 = 5
  });

  it('calculates heavyArmorCost as ceil(hullPoints * 0.1)', () => {
    const hull = makeHull({ hullPoints: 100 });
    expect(calculateHullStats(hull).heavyArmorCost).toBe(10); // 100 * 0.1 = 10
  });

  it('calculates superHeavyArmorCost as ceil(hullPoints * 0.2)', () => {
    const hull = makeHull({ hullPoints: 100 });
    expect(calculateHullStats(hull).superHeavyArmorCost).toBe(20); // 100 * 0.2 = 20
  });

  it('rounds armor costs up with Math.ceil for non-integer results', () => {
    const hull = makeHull({ hullPoints: 11 }); // 11 * 0.05 = 0.55 → 1, 11 * 0.1 = 1.1 → 2, 11 * 0.2 = 2.2 → 3
    const stats = calculateHullStats(hull);
    expect(stats.mediumArmorCost).toBe(1);
    expect(stats.heavyArmorCost).toBe(2);
    expect(stats.superHeavyArmorCost).toBe(3);
  });

  it('uses only base hullPoints (not bonus) for armor cost calculations', () => {
    const hull = makeHull({ hullPoints: 50, bonusHullPoints: 50 });
    const stats = calculateHullStats(hull);
    // Armor costs should be based on 50 (base), not 100 (total)
    expect(stats.totalHullPoints).toBe(100);
    expect(stats.mediumArmorCost).toBe(3);   // ceil(50 * 0.05) = 3
    expect(stats.heavyArmorCost).toBe(5);    // ceil(50 * 0.1) = 5
    expect(stats.superHeavyArmorCost).toBe(10); // ceil(50 * 0.2) = 10
  });

  it('matches expected values for a Fighter hull (10 HP, 0 bonus)', () => {
    const hull = makeHull({ hullPoints: 10, bonusHullPoints: 0 });
    const stats = calculateHullStats(hull);
    expect(stats.totalHullPoints).toBe(10);
    expect(stats.lightArmorCost).toBe(0);
    expect(stats.mediumArmorCost).toBe(1);   // ceil(10 * 0.05) = 1
    expect(stats.heavyArmorCost).toBe(1);    // ceil(10 * 0.1) = 1
    expect(stats.superHeavyArmorCost).toBe(2); // ceil(10 * 0.2) = 2
  });

  it('matches expected values for a large hull (500 HP, 50 bonus)', () => {
    const hull = makeHull({ hullPoints: 500, bonusHullPoints: 50 });
    const stats = calculateHullStats(hull);
    expect(stats.totalHullPoints).toBe(550);
    expect(stats.mediumArmorCost).toBe(25);  // ceil(500 * 0.05) = 25
    expect(stats.heavyArmorCost).toBe(50);   // ceil(500 * 0.1) = 50
    expect(stats.superHeavyArmorCost).toBe(100); // ceil(500 * 0.2) = 100
  });
});
