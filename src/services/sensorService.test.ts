import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SensorType, InstalledSensor, TrackingTable } from '../types/sensor';

// Mock the dataLoader module
vi.mock('./dataLoader', () => ({
  getSensorsData: vi.fn(),
  getTrackingTableData: vi.fn(),
}));

import {
  getAllSensorTypes,
  getSensorTypeById,
  generateSensorId,
  calculateSensorHullPoints,
  calculateSensorPower,
  calculateSensorCost,
  calculateArcsCovered,
  calculateTrackingCapability,
  calculateUnitsForFullCoverage,
  calculateSensorStats,
  createInstalledSensor,
  updateInstalledSensor,
} from './sensorService';

import { getSensorsData, getTrackingTableData } from './dataLoader';

const mockGetSensorsData = vi.mocked(getSensorsData);
const mockGetTrackingTableData = vi.mocked(getTrackingTableData);

// ============== Test Data ==============

const makeTrackingTable = (): TrackingTable => ({
  '6': { none: 5, Ordinary: 10, Good: 20, Amazing: 40 },
  '7': { none: 10, Ordinary: 20, Good: 40, Amazing: -1 },
  '8': { none: 20, Ordinary: 40, Good: 80, Amazing: -1 },
});

const makeActiveSensor = (overrides?: Partial<SensorType>): SensorType => ({
  id: 'air-space-radar',
  name: 'Air/Space Radar',
  progressLevel: 6,
  techTracks: [],
  category: 'active',
  hullPoints: 1,
  powerRequired: 2,
  cost: 5000,
  rangeShort: 100,
  rangeMedium: 200,
  rangeLong: 400,
  arcsCovered: 1,
  trackingCapability: 10,
  accuracyModifier: 3,
  accuracyDescription: '+3 step penalty',
  effect: 'Basic detection',
  description: 'Basic active sensor',
  ...overrides,
});

const makePassiveSensor = (overrides?: Partial<SensorType>): SensorType => ({
  id: 'em-detector',
  name: 'EM Detector',
  progressLevel: 6,
  techTracks: [],
  category: 'passive',
  hullPoints: 1,
  powerRequired: 1,
  cost: 3000,
  rangeShort: 50,
  rangeMedium: 100,
  rangeLong: 200,
  arcsCovered: 2,
  trackingCapability: 5,
  accuracyModifier: 0,
  accuracyDescription: 'Normal',
  effect: 'Passive detection',
  description: 'Passive EM sensor',
  ...overrides,
});

const makeFullCoverageSensor = (overrides?: Partial<SensorType>): SensorType => ({
  ...makeActiveSensor(),
  id: 'mass-radar',
  name: 'Mass Radar',
  arcsCovered: 4,
  ...overrides,
});

// ============== Tests ==============

describe('sensorService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTrackingTableData.mockReturnValue(makeTrackingTable());
  });

  describe('getAllSensorTypes', () => {
    it('returns data from the data loader', () => {
      const sensors = [makeActiveSensor(), makePassiveSensor()];
      mockGetSensorsData.mockReturnValue(sensors);
      expect(getAllSensorTypes()).toEqual(sensors);
    });
  });

  describe('getSensorTypeById', () => {
    it('finds sensor by ID', () => {
      const sensors = [makeActiveSensor(), makePassiveSensor()];
      mockGetSensorsData.mockReturnValue(sensors);
      expect(getSensorTypeById('em-detector')?.name).toBe('EM Detector');
    });

    it('returns undefined for unknown ID', () => {
      mockGetSensorsData.mockReturnValue([makeActiveSensor()]);
      expect(getSensorTypeById('nonexistent')).toBeUndefined();
    });
  });

  describe('generateSensorId', () => {
    it('generates unique IDs with sensor prefix', () => {
      const id1 = generateSensorId();
      const id2 = generateSensorId();
      expect(id1).toContain('sensor');
      expect(id1).not.toBe(id2);
    });
  });

  describe('calculateSensorHullPoints', () => {
    it('multiplies type HP by quantity', () => {
      const type = makeActiveSensor({ hullPoints: 3 });
      expect(calculateSensorHullPoints(type, 2)).toBe(6);
    });

    it('returns 0 for quantity 0', () => {
      const type = makeActiveSensor({ hullPoints: 3 });
      expect(calculateSensorHullPoints(type, 0)).toBe(0);
    });
  });

  describe('calculateSensorPower', () => {
    it('multiplies type power by quantity', () => {
      const type = makeActiveSensor({ powerRequired: 4 });
      expect(calculateSensorPower(type, 3)).toBe(12);
    });
  });

  describe('calculateSensorCost', () => {
    it('multiplies type cost by quantity', () => {
      const type = makeActiveSensor({ cost: 5000 });
      expect(calculateSensorCost(type, 2)).toBe(10000);
    });
  });

  describe('calculateArcsCovered', () => {
    it('multiplies arcs by quantity', () => {
      const type = makeActiveSensor({ arcsCovered: 1 });
      expect(calculateArcsCovered(type, 2)).toBe(2);
    });

    it('caps at 4 arcs (full coverage)', () => {
      const type = makeActiveSensor({ arcsCovered: 2 });
      expect(calculateArcsCovered(type, 3)).toBe(4);
    });

    it('returns 4 for full-coverage sensor with quantity 1', () => {
      const type = makeFullCoverageSensor({ arcsCovered: 4 });
      expect(calculateArcsCovered(type, 1)).toBe(4);
    });
  });

  describe('calculateTrackingCapability', () => {
    it('looks up base tracking from PL and computer quality', () => {
      // PL 6, none = 5, quantity 1
      expect(calculateTrackingCapability(6, 'none', 1)).toBe(5);
    });

    it('multiplies by quantity', () => {
      // PL 6, Ordinary = 10, quantity 3
      expect(calculateTrackingCapability(6, 'Ordinary', 3)).toBe(30);
    });

    it('returns -1 (unlimited) regardless of quantity', () => {
      // PL 7, Amazing = -1 (unlimited)
      expect(calculateTrackingCapability(7, 'Amazing', 5)).toBe(-1);
    });

    it('uses PL 8 entry for higher PLs', () => {
      // PL 8, none = 20
      expect(calculateTrackingCapability(8, 'none', 1)).toBe(20);
    });

    it('throws when tracking table is not loaded', () => {
      mockGetTrackingTableData.mockReturnValue(null);
      expect(() => calculateTrackingCapability(6, 'none', 1)).toThrow('Tracking table data not loaded');
    });

    it('throws for unknown PL', () => {
      expect(() => calculateTrackingCapability(5 as any, 'none', 1)).toThrow('No tracking data for progress level');
    });

    it('throws for unknown computer quality', () => {
      expect(() => calculateTrackingCapability(6, 'Legendary' as any, 1)).toThrow('No tracking data for computer quality');
    });
  });

  describe('calculateUnitsForFullCoverage', () => {
    it('returns 1 for sensors that cover all 4 arcs', () => {
      expect(calculateUnitsForFullCoverage(makeFullCoverageSensor())).toBe(1);
    });

    it('returns 2 for sensors that cover 2 arcs', () => {
      expect(calculateUnitsForFullCoverage(makePassiveSensor({ arcsCovered: 2 }))).toBe(2);
    });

    it('returns 4 for sensors that cover 1 arc', () => {
      expect(calculateUnitsForFullCoverage(makeActiveSensor({ arcsCovered: 1 }))).toBe(4);
    });
  });

  describe('calculateSensorStats', () => {
    it('returns zeros for empty array', () => {
      const result = calculateSensorStats([]);
      expect(result.totalHullPoints).toBe(0);
      expect(result.totalPowerRequired).toBe(0);
      expect(result.totalCost).toBe(0);
      expect(result.totalTrackingCapability).toBe(0);
      expect(result.hasBasicSensors).toBe(false);
      expect(result.installedSensorTypes).toHaveLength(0);
    });

    it('sums stats across multiple sensors', () => {
      const sensors: InstalledSensor[] = [
        {
          id: 's1',
          type: makeActiveSensor(),
          quantity: 2,
          hullPoints: 2,
          powerRequired: 4,
          cost: 10000,
          arcsCovered: 2,
          trackingCapability: 20,
        },
        {
          id: 's2',
          type: makePassiveSensor(),
          quantity: 1,
          hullPoints: 1,
          powerRequired: 1,
          cost: 3000,
          arcsCovered: 2,
          trackingCapability: 5,
        },
      ];
      const result = calculateSensorStats(sensors);
      expect(result.totalHullPoints).toBe(3);
      expect(result.totalPowerRequired).toBe(5);
      expect(result.totalCost).toBe(13000);
      expect(result.totalTrackingCapability).toBe(25);
    });

    it('detects basic (active) sensors', () => {
      const sensors: InstalledSensor[] = [
        {
          id: 's1',
          type: makeActiveSensor(),
          quantity: 1,
          hullPoints: 1,
          powerRequired: 2,
          cost: 5000,
          arcsCovered: 1,
          trackingCapability: 10,
        },
      ];
      expect(calculateSensorStats(sensors).hasBasicSensors).toBe(true);
    });

    it('reports no basic sensors for passive-only installs', () => {
      const sensors: InstalledSensor[] = [
        {
          id: 's1',
          type: makePassiveSensor(),
          quantity: 1,
          hullPoints: 1,
          powerRequired: 1,
          cost: 3000,
          arcsCovered: 2,
          trackingCapability: 5,
        },
      ];
      expect(calculateSensorStats(sensors).hasBasicSensors).toBe(false);
    });

    it('handles unlimited tracking (-1)', () => {
      const sensors: InstalledSensor[] = [
        {
          id: 's1',
          type: makeActiveSensor(),
          quantity: 1,
          hullPoints: 1,
          powerRequired: 2,
          cost: 5000,
          arcsCovered: 1,
          trackingCapability: -1,
        },
        {
          id: 's2',
          type: makePassiveSensor(),
          quantity: 1,
          hullPoints: 1,
          powerRequired: 1,
          cost: 3000,
          arcsCovered: 2,
          trackingCapability: 10,
        },
      ];
      expect(calculateSensorStats(sensors).totalTrackingCapability).toBe(-1);
    });

    it('collects unique sensor type names', () => {
      const sensors: InstalledSensor[] = [
        {
          id: 's1',
          type: makeActiveSensor({ name: 'Radar A' }),
          quantity: 1,
          hullPoints: 1,
          powerRequired: 2,
          cost: 5000,
          arcsCovered: 1,
          trackingCapability: 10,
        },
        {
          id: 's2',
          type: makeActiveSensor({ name: 'Radar A' }),
          quantity: 1,
          hullPoints: 1,
          powerRequired: 2,
          cost: 5000,
          arcsCovered: 1,
          trackingCapability: 10,
        },
      ];
      expect(calculateSensorStats(sensors).installedSensorTypes).toEqual(['Radar A']);
    });
  });

  describe('createInstalledSensor', () => {
    it('creates an installed sensor with calculated values', () => {
      const type = makeActiveSensor({ hullPoints: 2, powerRequired: 3, cost: 5000, arcsCovered: 1 });
      const result = createInstalledSensor(type, 2, 6, 'Ordinary');
      expect(result.type).toBe(type);
      expect(result.quantity).toBe(2);
      expect(result.hullPoints).toBe(4);
      expect(result.powerRequired).toBe(6);
      expect(result.cost).toBe(10000);
      expect(result.arcsCovered).toBe(2);
      // PL 6, Ordinary = 10, * 2 = 20
      expect(result.trackingCapability).toBe(20);
      expect(result.id).toContain('sensor');
    });

    it('defaults to none computer quality', () => {
      const type = makeActiveSensor();
      const result = createInstalledSensor(type, 1, 6);
      // PL 6, none = 5, * 1 = 5
      expect(result.trackingCapability).toBe(5);
    });
  });

  describe('updateInstalledSensor', () => {
    it('updates quantity and recalculates', () => {
      const type = makeActiveSensor({ hullPoints: 2, powerRequired: 3, cost: 5000, arcsCovered: 1 });
      const original: InstalledSensor = {
        id: 'existing-sensor',
        type,
        quantity: 1,
        hullPoints: 2,
        powerRequired: 3,
        cost: 5000,
        arcsCovered: 1,
        trackingCapability: 5,
      };
      const result = updateInstalledSensor(original, 3, 7, 'Good');
      expect(result.id).toBe('existing-sensor');
      expect(result.quantity).toBe(3);
      expect(result.hullPoints).toBe(6);
      expect(result.powerRequired).toBe(9);
      expect(result.cost).toBe(15000);
      expect(result.arcsCovered).toBe(3);
      // PL 7, Good = 40, * 3 = 120
      expect(result.trackingCapability).toBe(120);
    });
  });
});
