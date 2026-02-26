import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FTLDriveType, InstalledFTLDrive, InstalledFTLFuelTank, FTLRatings } from '../types/ftlDrive';
import type { Hull } from '../types/hull';

// Mock the dataLoader module
vi.mock('./dataLoader', () => ({
  getFTLDrivesData: vi.fn(),
}));

import {
  getAllFTLDriveTypes,
  calculateFTLHullPercentage,
  getFTLRatingForPercentage,
  calculateFTLPowerRequired,
  calculateFTLCost,
  isFixedSizeDrive,
  calculateFixedSizeHullPoints,
  calculateMinHullPointsForDrive,
  calculateTotalFTLStats,
  validateFTLInstallation,
  generateFTLDriveId,
  generateFTLFuelTankId,
  calculateMinFuelTankHP,
  calculateFTLFuelTankCost,
  getTotalFTLFuelTankHP,
  calculateTotalFTLFuelTankStats,
  calculateJumpDriveMaxDistance,
} from './ftlDriveService';

import { getFTLDrivesData } from './dataLoader';

const mockGetFTLDrivesData = vi.mocked(getFTLDrivesData);

// ============== Test Data ==============

const standardRatings: FTLRatings = {
  at5Percent: 1,
  at10Percent: 2,
  at15Percent: 3,
  at20Percent: 4,
  at30Percent: 6,
  at40Percent: 8,
  at50Percent: 10,
};

const nullRatings: FTLRatings = {
  at5Percent: null,
  at10Percent: null,
  at15Percent: null,
  at20Percent: null,
  at30Percent: null,
  at40Percent: null,
  at50Percent: null,
};

const makeStarDrive = (overrides?: Partial<FTLDriveType>): FTLDriveType => ({
  id: 'stardrive',
  name: 'Stardrive',
  progressLevel: 7,
  techTracks: [],
  powerPerHullPoint: 0.5,
  minSize: 5,
  isFixedSize: false,
  hullPercentage: 10,
  baseCost: 1000,
  costPerHullPoint: 100,
  ftlRatings: standardRatings,
  performanceUnit: 'LY/day',
  description: 'A standard stardrive',
  ...overrides,
});

const makeFixedDrive = (overrides?: Partial<FTLDriveType>): FTLDriveType => ({
  id: 'fixed-drive',
  name: 'Fixed Drive',
  progressLevel: 6,
  techTracks: ['G'],
  powerPerHullPoint: 1.0,
  minSize: 3,
  isFixedSize: true,
  hullPercentage: 15,
  baseCost: 500,
  costPerHullPoint: 50,
  performanceUnit: 'LY/jump',
  description: 'A fixed-size drive',
  requiresFuel: true,
  fuelCostPerHullPoint: 10,
  minFuelHullPercentage: 5,
  ftlRatings: standardRatings,
  ...overrides,
});

const makeHull = (overrides?: Partial<Hull>): Hull => ({
  id: 'medium-hull',
  name: 'Medium Cruiser',
  shipClass: 'medium',
  progressLevel: 7,
  techTracks: [],
  hullPoints: 100,
  bonusHullPoints: 0,
  cost: 50000,
  toughness: 10,
  targetModifier: 0,
  maneuverability: 2,
  requiredCrew: 20,
  description: 'A medium cruiser hull',
  ...overrides,
});

// ============== Tests ==============

describe('ftlDriveService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllFTLDriveTypes', () => {
    it('returns data from the data loader', () => {
      const drives = [makeStarDrive(), makeFixedDrive()];
      mockGetFTLDrivesData.mockReturnValue(drives);
      expect(getAllFTLDriveTypes()).toEqual(drives);
    });
  });

  describe('calculateFTLHullPercentage', () => {
    it('calculates percentage based on hull points', () => {
      const hull = makeHull({ hullPoints: 100 });
      expect(calculateFTLHullPercentage(hull, 10)).toBe(10);
      expect(calculateFTLHullPercentage(hull, 25)).toBe(25);
      expect(calculateFTLHullPercentage(hull, 50)).toBe(50);
    });

    it('handles fractional percentages', () => {
      const hull = makeHull({ hullPoints: 200 });
      expect(calculateFTLHullPercentage(hull, 15)).toBe(7.5);
    });
  });

  describe('getFTLRatingForPercentage', () => {
    it('returns null below 5%', () => {
      const drive = makeStarDrive();
      expect(getFTLRatingForPercentage(drive, 0)).toBeNull();
      expect(getFTLRatingForPercentage(drive, 4)).toBeNull();
    });

    it('returns exact values at breakpoints', () => {
      const drive = makeStarDrive();
      expect(getFTLRatingForPercentage(drive, 5)).toBe(1);
      expect(getFTLRatingForPercentage(drive, 10)).toBe(2);
      expect(getFTLRatingForPercentage(drive, 20)).toBe(4);
    });

    it('caps at 50% value for percentages >= 50', () => {
      const drive = makeStarDrive();
      expect(getFTLRatingForPercentage(drive, 50)).toBe(10);
      expect(getFTLRatingForPercentage(drive, 80)).toBe(10);
    });

    it('interpolates between breakpoints', () => {
      const drive = makeStarDrive();
      // Between 5% (1) and 10% (2), at 7.5% => 1.5
      expect(getFTLRatingForPercentage(drive, 7.5)).toBe(1.5);
    });

    it('returns null when drive has no ftlRatings', () => {
      const drive = makeStarDrive({ ftlRatings: undefined });
      expect(getFTLRatingForPercentage(drive, 10)).toBeNull();
    });

    it('returns null when ratings are all null', () => {
      const drive = makeStarDrive({ ftlRatings: nullRatings });
      expect(getFTLRatingForPercentage(drive, 5)).toBeNull();
    });
  });

  describe('calculateFTLPowerRequired', () => {
    it('calculates power based on power per hull point', () => {
      const drive = makeStarDrive({ powerPerHullPoint: 0.5 });
      expect(calculateFTLPowerRequired(drive, 10)).toBe(5);
    });

    it('ceiling-rounds the result', () => {
      const drive = makeStarDrive({ powerPerHullPoint: 0.3 });
      // 0.3 * 7 = 2.1, ceil = 3
      expect(calculateFTLPowerRequired(drive, 7)).toBe(3);
    });

    it('returns 0 for 0 hull points', () => {
      const drive = makeStarDrive({ powerPerHullPoint: 0.5 });
      expect(calculateFTLPowerRequired(drive, 0)).toBe(0);
    });
  });

  describe('calculateFTLCost', () => {
    it('calculates baseCost + costPerHullPoint * hullPoints', () => {
      const drive = makeStarDrive({ baseCost: 1000, costPerHullPoint: 100 });
      expect(calculateFTLCost(drive, 10)).toBe(2000);
    });

    it('returns just base cost for 0 hull points', () => {
      const drive = makeStarDrive({ baseCost: 1000, costPerHullPoint: 100 });
      expect(calculateFTLCost(drive, 0)).toBe(1000);
    });
  });

  describe('isFixedSizeDrive', () => {
    it('returns true for fixed-size drives', () => {
      expect(isFixedSizeDrive(makeFixedDrive())).toBe(true);
    });

    it('returns false for variable-size drives', () => {
      expect(isFixedSizeDrive(makeStarDrive())).toBe(false);
    });
  });

  describe('calculateFixedSizeHullPoints', () => {
    it('calculates hull points from percentage', () => {
      const drive = makeFixedDrive({ hullPercentage: 15, minSize: 3 });
      const hull = makeHull({ hullPoints: 100 });
      // 15% of 100 = 15, max(3, 15) = 15
      expect(calculateFixedSizeHullPoints(drive, hull)).toBe(15);
    });

    it('uses minSize when percentage result is smaller', () => {
      const drive = makeFixedDrive({ hullPercentage: 1, minSize: 5 });
      const hull = makeHull({ hullPoints: 100 });
      // 1% of 100 = 1, max(5, 1) = 5
      expect(calculateFixedSizeHullPoints(drive, hull)).toBe(5);
    });

    it('ceiling-rounds the percentage calculation', () => {
      const drive = makeFixedDrive({ hullPercentage: 15, minSize: 3 });
      const hull = makeHull({ hullPoints: 77 });
      // 15% of 77 = 11.55, ceil = 12
      expect(calculateFixedSizeHullPoints(drive, hull)).toBe(12);
    });
  });

  describe('calculateMinHullPointsForDrive', () => {
    it('calculates minimum HP from hull percentage', () => {
      const drive = makeStarDrive({ hullPercentage: 10, minSize: 5 });
      const hull = makeHull({ hullPoints: 100 });
      expect(calculateMinHullPointsForDrive(drive, hull)).toBe(10);
    });

    it('uses minSize when percentage is lower', () => {
      const drive = makeStarDrive({ hullPercentage: 2, minSize: 5 });
      const hull = makeHull({ hullPoints: 100 });
      expect(calculateMinHullPointsForDrive(drive, hull)).toBe(5);
    });
  });

  describe('calculateTotalFTLStats', () => {
    it('returns zeros for null drive', () => {
      const hull = makeHull();
      const result = calculateTotalFTLStats(null, hull);
      expect(result).toEqual({
        totalHullPoints: 0,
        totalPowerRequired: 0,
        totalCost: 0,
        ftlRating: null,
        hullPercentage: 0,
      });
    });

    it('calculates stats for an installed drive', () => {
      const drive = makeStarDrive({ powerPerHullPoint: 0.5, baseCost: 1000, costPerHullPoint: 100 });
      const hull = makeHull({ hullPoints: 100 });
      const installed: InstalledFTLDrive = {
        id: 'ftl-1',
        type: drive,
        hullPoints: 20,
      };
      const result = calculateTotalFTLStats(installed, hull);
      expect(result.totalHullPoints).toBe(20);
      expect(result.totalPowerRequired).toBe(10); // ceil(0.5 * 20)
      expect(result.totalCost).toBe(3000); // 1000 + 100*20
      expect(result.hullPercentage).toBe(20); // 20/100*100
      expect(result.ftlRating).toBe(4); // rating at 20%
    });
  });

  describe('validateFTLInstallation', () => {
    it('returns valid for sufficient hull points', () => {
      const drive = makeStarDrive({ hullPercentage: 10, minSize: 5 });
      const hull = makeHull({ hullPoints: 100 });
      const result = validateFTLInstallation(drive, 15, hull);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('returns errors for insufficient hull points', () => {
      const drive = makeStarDrive({ hullPercentage: 10, minSize: 5 });
      const hull = makeHull({ hullPoints: 100 });
      const result = validateFTLInstallation(drive, 3, hull);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('shows percentage in error message for fixed-size drives', () => {
      const drive = makeFixedDrive({ hullPercentage: 15, minSize: 3 });
      const hull = makeHull({ hullPoints: 100 });
      const result = validateFTLInstallation(drive, 5, hull);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('15%');
    });
  });

  describe('generateFTLDriveId', () => {
    it('generates unique IDs with ftl prefix', () => {
      const id1 = generateFTLDriveId();
      const id2 = generateFTLDriveId();
      expect(id1).toContain('ftl');
      expect(id1).not.toBe(id2);
    });
  });

  describe('generateFTLFuelTankId', () => {
    it('generates unique IDs with ftl-fuel prefix', () => {
      const id1 = generateFTLFuelTankId();
      const id2 = generateFTLFuelTankId();
      expect(id1).toContain('ftl-fuel');
      expect(id1).not.toBe(id2);
    });
  });

  describe('calculateMinFuelTankHP', () => {
    it('calculates from minFuelHullPercentage', () => {
      const drive = makeFixedDrive({ minFuelHullPercentage: 5 });
      const hull = makeHull({ hullPoints: 100 });
      expect(calculateMinFuelTankHP(drive, hull)).toBe(5);
    });

    it('returns 1 when no minFuelHullPercentage', () => {
      const drive = makeStarDrive({ minFuelHullPercentage: undefined });
      const hull = makeHull({ hullPoints: 100 });
      expect(calculateMinFuelTankHP(drive, hull)).toBe(1);
    });

    it('enforces minimum of 1', () => {
      const drive = makeFixedDrive({ minFuelHullPercentage: 0.1 });
      const hull = makeHull({ hullPoints: 10 });
      // 0.1% of 10 = 0.01, ceil = 1, max(1,1)=1
      expect(calculateMinFuelTankHP(drive, hull)).toBe(1);
    });
  });

  describe('calculateFTLFuelTankCost', () => {
    it('calculates from fuelCostPerHullPoint', () => {
      const drive = makeFixedDrive({ fuelCostPerHullPoint: 10 });
      expect(calculateFTLFuelTankCost(drive, 5)).toBe(50);
    });

    it('returns 0 when no fuelCostPerHullPoint', () => {
      const drive = makeStarDrive({ fuelCostPerHullPoint: undefined });
      expect(calculateFTLFuelTankCost(drive, 5)).toBe(0);
    });
  });

  describe('getTotalFTLFuelTankHP', () => {
    it('sums HP for tanks matching a drive type', () => {
      const drive = makeStarDrive();
      const tanks: InstalledFTLFuelTank[] = [
        { id: 't1', forFTLDriveType: drive, hullPoints: 5 },
        { id: 't2', forFTLDriveType: drive, hullPoints: 8 },
      ];
      expect(getTotalFTLFuelTankHP(tanks, 'stardrive')).toBe(13);
    });

    it('filters out tanks for different drive types', () => {
      const drive1 = makeStarDrive();
      const drive2 = makeFixedDrive();
      const tanks: InstalledFTLFuelTank[] = [
        { id: 't1', forFTLDriveType: drive1, hullPoints: 5 },
        { id: 't2', forFTLDriveType: drive2, hullPoints: 8 },
      ];
      expect(getTotalFTLFuelTankHP(tanks, 'stardrive')).toBe(5);
    });

    it('returns 0 for empty array', () => {
      expect(getTotalFTLFuelTankHP([], 'stardrive')).toBe(0);
    });
  });

  describe('calculateTotalFTLFuelTankStats', () => {
    it('calculates totals for multiple fuel tanks', () => {
      const drive = makeFixedDrive({ fuelCostPerHullPoint: 10 });
      const tanks: InstalledFTLFuelTank[] = [
        { id: 't1', forFTLDriveType: drive, hullPoints: 5 },
        { id: 't2', forFTLDriveType: drive, hullPoints: 3 },
      ];
      const result = calculateTotalFTLFuelTankStats(tanks);
      expect(result.totalHullPoints).toBe(8);
      expect(result.totalCost).toBe(80); // 10 * (5 + 3)
    });

    it('returns zeros for empty tanks', () => {
      const result = calculateTotalFTLFuelTankStats([]);
      expect(result.totalHullPoints).toBe(0);
      expect(result.totalCost).toBe(0);
    });
  });

  describe('calculateJumpDriveMaxDistance', () => {
    it('returns null for drives that do not require fuel', () => {
      const drive = makeStarDrive({ requiresFuel: false });
      expect(calculateJumpDriveMaxDistance(drive, 10, 100)).toBeNull();
    });

    it('returns null for drives without ftlRatings', () => {
      const drive = makeFixedDrive({ ftlRatings: undefined });
      expect(calculateJumpDriveMaxDistance(drive, 10, 100)).toBeNull();
    });

    it('returns 0 for 0 fuel tank HP', () => {
      const drive = makeFixedDrive();
      expect(calculateJumpDriveMaxDistance(drive, 0, 100)).toBe(0);
    });

    it('returns 0 for 0 hull HP', () => {
      const drive = makeFixedDrive();
      expect(calculateJumpDriveMaxDistance(drive, 10, 0)).toBe(0);
    });

    it('calculates distance based on fuel percentage of hull', () => {
      const drive = makeFixedDrive();
      // 10 fuel / 100 hull = 10%, rating at 10% = 2
      expect(calculateJumpDriveMaxDistance(drive, 10, 100)).toBe(2);
    });

    it('interpolates for in-between fuel percentages', () => {
      const drive = makeFixedDrive();
      // 15 fuel / 100 hull = 15%, rating at 15% = 3
      expect(calculateJumpDriveMaxDistance(drive, 15, 100)).toBe(3);
    });
  });
});
