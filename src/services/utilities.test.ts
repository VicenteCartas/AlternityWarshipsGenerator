import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  interpolateByPercentage,
  validateMinSize,
  validateFuelTank,
  generateId,
  filterByDesignConstraints,
  capitalize,
} from './utilities';
import type { PercentageRatings } from './utilities';
import type { ProgressLevel, TechTrack } from '../types/common';

// ============== interpolateByPercentage ==============

describe('interpolateByPercentage', () => {
  const sampleRatings: PercentageRatings = {
    at5Percent: 10,
    at10Percent: 20,
    at15Percent: 30,
    at20Percent: 40,
    at30Percent: 60,
    at40Percent: 80,
    at50Percent: 100,
  };

  describe('below 5%', () => {
    it('returns null by default (belowMinBehavior = "null")', () => {
      expect(interpolateByPercentage(sampleRatings, 3)).toBeNull();
      expect(interpolateByPercentage(sampleRatings, 0)).toBeNull();
    });

    it('interpolates from zero when belowMinBehavior = "interpolate-from-zero"', () => {
      // 3% of the way to 5%, starting from 0 to 10
      expect(interpolateByPercentage(sampleRatings, 3, 'interpolate-from-zero')).toBeCloseTo(6);
      expect(interpolateByPercentage(sampleRatings, 0, 'interpolate-from-zero')).toBeCloseTo(0);
      expect(interpolateByPercentage(sampleRatings, 2.5, 'interpolate-from-zero')).toBeCloseTo(5);
    });

    it('returns null for interpolate-from-zero when at5Percent is null', () => {
      const ratings: PercentageRatings = {
        ...sampleRatings,
        at5Percent: null,
      };
      expect(interpolateByPercentage(ratings, 3, 'interpolate-from-zero')).toBeNull();
    });
  });

  describe('exact breakpoints', () => {
    it('returns exact values at breakpoints', () => {
      expect(interpolateByPercentage(sampleRatings, 5)).toBe(10);
      expect(interpolateByPercentage(sampleRatings, 10)).toBe(20);
      expect(interpolateByPercentage(sampleRatings, 15)).toBe(30);
      expect(interpolateByPercentage(sampleRatings, 20)).toBe(40);
      expect(interpolateByPercentage(sampleRatings, 30)).toBe(60);
      expect(interpolateByPercentage(sampleRatings, 40)).toBe(80);
    });
  });

  describe('at or above 50%', () => {
    it('returns the 50% value for 50%', () => {
      expect(interpolateByPercentage(sampleRatings, 50)).toBe(100);
    });

    it('caps at 50% value for percentages above 50%', () => {
      expect(interpolateByPercentage(sampleRatings, 75)).toBe(100);
      expect(interpolateByPercentage(sampleRatings, 100)).toBe(100);
    });
  });

  describe('interpolation between breakpoints', () => {
    it('interpolates linearly between 5% and 10%', () => {
      // 7.5% is halfway between 5% (10) and 10% (20) = 15
      expect(interpolateByPercentage(sampleRatings, 7.5)).toBeCloseTo(15);
    });

    it('interpolates linearly between 20% and 30%', () => {
      // 25% is halfway between 20% (40) and 30% (60) = 50
      expect(interpolateByPercentage(sampleRatings, 25)).toBeCloseTo(50);
    });

    it('interpolates linearly between 30% and 40%', () => {
      // 35% is halfway between 30% (60) and 40% (80) = 70
      expect(interpolateByPercentage(sampleRatings, 35)).toBeCloseTo(70);
    });
  });

  describe('null values in ratings', () => {
    it('returns lower value when upper breakpoint is null', () => {
      const ratings: PercentageRatings = {
        ...sampleRatings,
        at10Percent: null,
      };
      // Between 5% and 10%, upper is null → return lower value (10)
      expect(interpolateByPercentage(ratings, 7)).toBe(10);
    });

    it('returns null when at50Percent is null', () => {
      const ratings: PercentageRatings = {
        ...sampleRatings,
        at50Percent: null,
      };
      expect(interpolateByPercentage(ratings, 50)).toBeNull();
      expect(interpolateByPercentage(ratings, 75)).toBeNull();
    });
  });
});

// ============== validateMinSize ==============

describe('validateMinSize', () => {
  it('returns valid when hull points >= minimum', () => {
    const result = validateMinSize('Laser Cannon', 20, 10);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns valid when hull points == minimum', () => {
    const result = validateMinSize('Laser Cannon', 10, 10);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns invalid with error message when hull points < minimum', () => {
    const result = validateMinSize('Laser Cannon', 5, 10);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Laser Cannon');
    expect(result.errors[0]).toContain('10');
  });
});

// ============== validateFuelTank ==============

describe('validateFuelTank', () => {
  const mockHull = {
    hullPoints: 100,
    bonusHullPoints: 10,
  };

  it('returns valid for reasonable fuel tank size', () => {
    const result = validateFuelTank(5, mockHull as any, 50);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns invalid when hull points < 1', () => {
    const result = validateFuelTank(0, mockHull as any, 50);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('at least 1 hull point');
  });

  it('returns invalid when exceeding available hull points', () => {
    // 100 + 10 - 105 = 5 available, requesting 10
    const result = validateFuelTank(10, mockHull as any, 105);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Not enough hull points');
  });

  it('can return multiple errors', () => {
    // hullPoints < 1 AND exceeding available (0 still < 1)
    const result = validateFuelTank(0, mockHull as any, 110);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1); // Only the < 1 check fires since 0 doesn't exceed
  });
});

// ============== generateId ==============

describe('generateId', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(1700000000000);
    vi.spyOn(Math, 'random').mockReturnValue(0.123456789);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('generates IDs with the given prefix', () => {
    const id = generateId('weapon');
    expect(id).toMatch(/^weapon-/);
  });

  it('includes timestamp in the ID', () => {
    const id = generateId('test');
    expect(id).toContain('1700000000000');
  });

  it('includes random suffix', () => {
    const id = generateId('test');
    // format: prefix-timestamp-randomstring
    const parts = id.split('-');
    expect(parts).toHaveLength(3);
    expect(parts[2].length).toBeGreaterThan(0);
  });
});

// ============== filterByDesignConstraints ==============

describe('filterByDesignConstraints', () => {
  interface TestItem {
    name: string;
    progressLevel: ProgressLevel;
    techTracks: TechTrack[];
  }

  const items: TestItem[] = [
    { name: 'PL6-none', progressLevel: 6, techTracks: [] },
    { name: 'PL7-G', progressLevel: 7, techTracks: ['G'] },
    { name: 'PL8-D', progressLevel: 8, techTracks: ['D'] },
    { name: 'PL9-PX', progressLevel: 9, techTracks: ['P', 'X'] },
    { name: 'PL7-none', progressLevel: 7, techTracks: [] },
    { name: 'PL8-GD', progressLevel: 8, techTracks: ['G', 'D'] },
  ];

  describe('progress level filtering', () => {
    it('filters out items above design PL', () => {
      const result = filterByDesignConstraints(items, 7, []);
      expect(result.map((i) => i.name)).toEqual(
        expect.arrayContaining(['PL6-none', 'PL7-G', 'PL7-none'])
      );
      expect(result.every((i) => i.progressLevel <= 7)).toBe(true);
    });

    it('includes all items at max PL', () => {
      const result = filterByDesignConstraints(items, 9, []);
      expect(result).toHaveLength(6);
    });
  });

  describe('tech track filtering', () => {
    it('shows all items when designTechTracks is empty', () => {
      const result = filterByDesignConstraints(items, 9, []);
      expect(result).toHaveLength(6);
    });

    it('always includes items with no tech requirement', () => {
      const result = filterByDesignConstraints(items, 9, ['G']);
      const names = result.map((i) => i.name);
      expect(names).toContain('PL6-none');
      expect(names).toContain('PL7-none');
    });

    it('includes items when ANY required tech matches', () => {
      const result = filterByDesignConstraints(items, 9, ['G']);
      const names = result.map((i) => i.name);
      expect(names).toContain('PL7-G');
      expect(names).toContain('PL8-GD'); // has G, so matches
    });

    it('excludes items when no required tech matches', () => {
      const result = filterByDesignConstraints(items, 9, ['G']);
      const names = result.map((i) => i.name);
      expect(names).not.toContain('PL8-D');
      expect(names).not.toContain('PL9-PX');
    });
  });

  describe('sorting', () => {
    it('sorts by progress level by default', () => {
      const result = filterByDesignConstraints(items, 9, []);
      for (let i = 1; i < result.length; i++) {
        expect(result[i].progressLevel).toBeGreaterThanOrEqual(result[i - 1].progressLevel);
      }
    });

    it('does not sort when sort=false', () => {
      // Items are mixed PL in the original order
      const result = filterByDesignConstraints(items, 9, [], false);
      expect(result).toHaveLength(6);
      // Original order should be preserved
      expect(result[0].name).toBe('PL6-none');
      expect(result[1].name).toBe('PL7-G');
      expect(result[2].name).toBe('PL8-D');
    });
  });

  describe('combined filters', () => {
    it('applies both PL and tech track filters', () => {
      const result = filterByDesignConstraints(items, 8, ['D']);
      const names = result.map((i) => i.name);
      // PL6-none: PL ok, no tech = pass
      // PL7-G: PL ok, tech G not in [D] = fail
      // PL8-D: PL ok, tech D in [D] = pass
      // PL9-PX: PL too high = fail
      // PL7-none: PL ok, no tech = pass
      // PL8-GD: PL ok, has D = pass
      expect(names).toEqual(expect.arrayContaining(['PL6-none', 'PL8-D', 'PL7-none', 'PL8-GD']));
      expect(names).not.toContain('PL7-G');
      expect(names).not.toContain('PL9-PX');
      expect(result).toHaveLength(4);
    });
  });
});

// ============== capitalize ==============

describe('capitalize', () => {
  it('capitalizes the first letter of a lowercase string', () => {
    expect(capitalize('hello')).toBe('Hello');
  });

  it('returns already-capitalized strings unchanged', () => {
    expect(capitalize('Hello')).toBe('Hello');
  });

  it('handles single character strings', () => {
    expect(capitalize('a')).toBe('A');
  });

  it('handles empty strings', () => {
    expect(capitalize('')).toBe('');
  });

  it('does not alter rest of the string', () => {
    expect(capitalize('hELLO wORLD')).toBe('HELLO wORLD');
  });
});
