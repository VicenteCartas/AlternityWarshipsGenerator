/**
 * Tests for pdfExportService.ts
 *
 * Layer 1: Pure logic functions (formatArcsShort, enrichSystemDisplayName, computeShipStats)
 * Layer 2: Option toggling (includeCombat, includeDamageDiagram, includeDetailedSystems)
 * Layer 3: Mock-based rendering section verification
 * Layer 4: Snapshot test for full exportShipToPDF output
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ShipData } from './pdfExportService';
import type { Hull } from '../types/hull';
import type { InstalledWeapon, FiringArc } from '../types/weapon';
import type { InstalledDefenseSystem } from '../types/defense';
import type { InstalledCommandControlSystem } from '../types/commandControl';
import type { InstalledSensor } from '../types/sensor';
import type { InstalledHangarMiscSystem } from '../types/hangarMisc';
import type { DamageZone } from '../types/damageDiagram';
import type { ShipDescription } from '../types/summary';

// ---- Mock all data-loading dependencies ----

vi.mock('./dataLoader', () => {
  const emptyFn = () => vi.fn(() => []);
  const nullFn = () => vi.fn(() => null);
  return {
    getHullsData: emptyFn(),
    getStationHullsData: emptyFn(),
    getArmorTypesData: emptyFn(),
    getArmorWeightsData: emptyFn(),
    getArmorAllowMultipleLayers: vi.fn(() => false),
    getPowerPlantsData: emptyFn(),
    getFuelTankData: nullFn(),
    getEnginesData: emptyFn(),
    getEngineAllowPowerGeneration: vi.fn(() => false),
    getFTLDrivesData: emptyFn(),
    getLifeSupportData: emptyFn(),
    getAccommodationsData: emptyFn(),
    getStoreSystemsData: emptyFn(),
    getGravitySystemsData: emptyFn(),
    getArtificialGravityRulesData: emptyFn(),
    getBeamWeaponsData: emptyFn(),
    getProjectileWeaponsData: emptyFn(),
    getTorpedoWeaponsData: emptyFn(),
    getSpecialWeaponsData: emptyFn(),
    getMountModifiersData: nullFn(),
    getGunConfigurationsData: nullFn(),
    getConcealmentModifierData: nullFn(),
    getDefenseSystemsData: emptyFn(),
    getCommandControlSystemsData: emptyFn(),
    getSensorsData: emptyFn(),
    getHangarMiscSystemsData: emptyFn(),
    getLaunchSystemsData: emptyFn(),
    getPropulsionSystemsData: emptyFn(),
    getWarheadsData: emptyFn(),
    getGuidanceSystemsData: emptyFn(),
    getTechTracksData: emptyFn(),
    getDamageDiagramDataGetter: nullFn(),
    getTrackingTableData: nullFn(),
    getActiveMods: vi.fn(() => []),
    isDataLoaded: vi.fn(() => true),
  };
});

vi.mock('./ordnanceService', () => ({
  getWarheads: vi.fn(() => []),
  getPropulsionSystems: vi.fn(() => []),
  getLaunchSystems: vi.fn(() => []),
  calculateOrdnanceStats: vi.fn(() => ({
    totalLauncherHullPoints: 0,
    totalLauncherPower: 0,
    totalCost: 0,
    totalOrdnanceCost: 0,
    totalHullPoints: 0,
    totalPowerRequired: 0,
    totalLauncherCost: 0,
  })),
}));

vi.mock('./embarkedCraftService', () => ({
  getAllLoadedCraft: vi.fn(() => []),
  calculateEmbarkedCraftStats: vi.fn(() => ({ totalEmbarkedCost: 0, invalidFileCount: 0 })),
}));

vi.mock('./damageDiagramService', () => ({
  getZoneConfigForHull: vi.fn(() => ({
    zones: ['F', 'A'],
    hitDie: 6,
  })),
  createDefaultHitLocationChart: vi.fn(() => ({
    hitDie: 6 as const,
    columns: [
      { direction: 'forward', entries: [{ minRoll: 1, maxRoll: 3, zone: 'F' }, { minRoll: 4, maxRoll: 6, zone: 'A' }] },
      { direction: 'port', entries: [{ minRoll: 1, maxRoll: 3, zone: 'F' }, { minRoll: 4, maxRoll: 6, zone: 'A' }] },
      { direction: 'starboard', entries: [{ minRoll: 1, maxRoll: 3, zone: 'F' }, { minRoll: 4, maxRoll: 6, zone: 'A' }] },
      { direction: 'aft', entries: [{ minRoll: 1, maxRoll: 3, zone: 'A' }, { minRoll: 4, maxRoll: 6, zone: 'F' }] },
    ],
  })),
  getSystemDamageCategory: vi.fn(),
  getDamageCategoryOrder: vi.fn(),
  getFirepowerOrder: vi.fn(),
  sortSystemsByDamagePriority: vi.fn(),
}));

// Import after mocks
import {
  formatArcsShort,
  enrichSystemDisplayName,
  computeShipStats,
  exportShipToPDF,
  defaultExportOptions,
} from './pdfExportService';
import { getWarheads } from './ordnanceService';

// ============ TEST FIXTURES ============

function makeHull(overrides: Partial<Hull> = {}): Hull {
  return {
    id: 'frigate',
    name: 'Frigate',
    shipClass: 'light',
    category: 'military',
    hullPoints: 20,
    bonusHullPoints: 0,
    toughness: 'Light',
    targetModifier: 1,
    maneuverability: 2,
    damageTrack: { stun: 5, wound: 10, mortal: 5, critical: 5 },
    crew: 15,
    cost: 5000000,
    description: 'A light frigate',
    ...overrides,
  };
}

function makeShipDescription(overrides: Partial<ShipDescription> = {}): ShipDescription {
  return {
    lore: '',
    imageData: null,
    imageMimeType: null,
    faction: '',
    role: '',
    commissioningDate: '',
    classification: '',
    manufacturer: '',
    ...overrides,
  };
}

function makeInstalledWeapon(overrides: Partial<InstalledWeapon> = {}): InstalledWeapon {
  return {
    id: 'wpn-1',
    weaponType: {
      id: 'laser-cannon',
      name: 'Laser Cannon',
      progressLevel: 7,
      techTracks: [],
      hullPoints: 2,
      powerRequired: 2,
      cost: 500000,
      accuracyModifier: 0,
      rangeShort: 3,
      rangeMedium: 10,
      rangeLong: 30,
      damageType: 'En',
      firepower: 'L' as const,
      damage: 'd8w',
      fireModes: ['F' as const],
      description: 'A standard laser cannon',
    },
    category: 'beam',
    mountType: 'standard',
    gunConfiguration: 'single',
    concealed: false,
    quantity: 1,
    arcs: ['forward'] as FiringArc[],
    hullPoints: 2,
    powerRequired: 2,
    cost: 500000,
    ...overrides,
  };
}

function makeInstalledSensor(overrides: Partial<InstalledSensor> = {}): InstalledSensor {
  return {
    id: 'sensor-1',
    type: {
      id: 'active-radar',
      name: 'Active Radar',
      progressLevel: 6,
      techTracks: [],
      category: 'active',
      hullPoints: 1,
      powerRequired: 1,
      cost: 100000,
      rangeShort: 5,
      rangeMedium: 15,
      rangeLong: 40,
      arcsCovered: 4,
      trackingCapability: 2,
      accuracyModifier: 0,
      accuracyDescription: '+0',
      effect: 'Standard detection',
      description: 'A basic active radar',
    },
    quantity: 1,
    arcs: ['forward'],
    trackingCapability: 2,
    hullPoints: 1,
    powerRequired: 1,
    cost: 100000,
    ...overrides,
  };
}

function makeInstalledDefense(overrides: Partial<InstalledDefenseSystem> = {}): InstalledDefenseSystem {
  return {
    id: 'def-1',
    type: {
      id: 'ecm-suite',
      name: 'ECM Suite',
      progressLevel: 6,
      techTracks: [],
      category: 'countermeasure',
      hullPoints: 1,
      hullPercentage: 0,
      powerRequired: 1,
      powerPer: 'unit',
      cost: 200000,
      costPer: 'unit',
      coverage: 1,
      effect: '+1 step penalty to enemy attacks',
      damageCheckBonus: 0,
      description: 'Electronic countermeasures',
    },
    quantity: 1,
    hullPoints: 1,
    powerRequired: 1,
    cost: 200000,
    ...overrides,
  };
}

function makeInstalledCC(overrides: Partial<InstalledCommandControlSystem> = {}): InstalledCommandControlSystem {
  return {
    id: 'cc-1',
    type: {
      id: 'computer-core',
      name: 'Computer Core',
      progressLevel: 6,
      techTracks: [],
      category: 'computer',
      hullPoints: 1,
      powerRequired: 1,
      cost: 300000,
      costPer: 'unit',
      description: 'Main computer core',
    },
    quantity: 1,
    hullPoints: 1,
    powerRequired: 1,
    cost: 300000,
    ...overrides,
  };
}

function makeDamageZone(overrides: Partial<DamageZone> = {}): DamageZone {
  return {
    code: 'F',
    systems: [{
      id: 'sys-1',
      systemType: 'weapon',
      name: 'Laser Cannon',
      hullPoints: 2,
      installedSystemId: 'wpn-1',
    }],
    totalHullPoints: 2,
    maxHullPoints: 10,
    ...overrides,
  };
}

function makeMinimalShipData(overrides: Partial<ShipData> = {}): ShipData {
  return {
    warshipName: 'Test Ship',
    hull: makeHull(),
    shipDescription: makeShipDescription(),
    armorLayers: [],
    installedPowerPlants: [],
    installedFuelTanks: [],
    installedEngines: [],
    installedEngineFuelTanks: [],
    installedFTLDrive: null,
    installedFTLFuelTanks: [],
    installedLifeSupport: [],
    installedAccommodations: [],
    installedStoreSystems: [],
    installedGravitySystems: [],
    installedWeapons: [],
    installedLaunchSystems: [],
    ordnanceDesigns: [],
    installedDefenses: [],
    installedCommandControl: [],
    installedSensors: [],
    installedHangarMisc: [],
    damageDiagramZones: [],
    hitLocationChart: null,
    designProgressLevel: 7,
    designTechTracks: [],
    designType: 'warship',
    stationType: null,
    ...overrides,
  };
}

// ============ MOCK jsPDF ============

/**
 * Create a mock jsPDF instance that records all method calls.
 * Each method is a vi.fn() that returns a suitable default.
 */
function createMockPdf() {
  const calls: { method: string; args: unknown[] }[] = [];
  const trackCall = (method: string) => (...args: unknown[]) => {
    calls.push({ method, args });
  };

  const mockPdf = {
    internal: {
      pageSize: {
        getWidth: () => 210,
        getHeight: () => 297,
      },
    },
    setFontSize: vi.fn(trackCall('setFontSize')),
    setFont: vi.fn(trackCall('setFont')),
    setFillColor: vi.fn(trackCall('setFillColor')),
    setTextColor: vi.fn(trackCall('setTextColor')),
    setDrawColor: vi.fn(trackCall('setDrawColor')),
    setLineWidth: vi.fn(trackCall('setLineWidth')),
    text: vi.fn(trackCall('text')),
    rect: vi.fn(trackCall('rect')),
    line: vi.fn(trackCall('line')),
    addPage: vi.fn(trackCall('addPage')),
    addImage: vi.fn(trackCall('addImage')),
    getTextWidth: vi.fn(() => 20),
    splitTextToSize: vi.fn((text: string) => [text]),
    getImageProperties: vi.fn(() => ({ width: 100, height: 100 })),
    getNumberOfPages: vi.fn(() => 3),
    setPage: vi.fn(trackCall('setPage')),
    output: vi.fn(() => 'data:application/pdf;base64,MOCK_BASE64'),
    save: vi.fn(),
    calls,
  };

  return mockPdf;
}

// Mock jsPDF constructor — must return mock instance when called with `new`
let activeMockPdf: ReturnType<typeof createMockPdf> | null = null;

vi.mock('jspdf', () => {
  return {
    jsPDF: vi.fn(function (this: unknown) {
      if (activeMockPdf) {
        Object.assign(this as Record<string, unknown>, activeMockPdf);
      }
      return this;
    }),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ==========================================================================
// LAYER 1: Pure logic functions
// ==========================================================================

describe('formatArcsShort', () => {
  it('returns dash for empty arcs', () => {
    expect(formatArcsShort([])).toBe('-');
  });

  it('formats standard arcs as single letters', () => {
    expect(formatArcsShort(['forward', 'aft'])).toBe('F A');
  });

  it('formats all four standard arcs', () => {
    expect(formatArcsShort(['forward', 'starboard', 'aft', 'port'])).toBe('F S A P');
  });

  it('formats zero-range arcs with Z prefix', () => {
    expect(formatArcsShort(['zero-forward', 'zero-aft'])).toBe('ZF ZA');
  });

  it('formats mixed standard and zero arcs in canonical order', () => {
    expect(formatArcsShort(['forward', 'zero-starboard', 'aft'])).toBe('F A ZS');
  });

  it('formats single arc', () => {
    expect(formatArcsShort(['port'])).toBe('P');
  });
});

describe('enrichSystemDisplayName', () => {
  it('returns original name when no matching system is found', () => {
    const data = makeMinimalShipData();
    expect(enrichSystemDisplayName('Laser Cannon', 'wpn-999', data)).toBe('Laser Cannon');
  });

  it('returns original name for unknown prefix', () => {
    const data = makeMinimalShipData();
    expect(enrichSystemDisplayName('Some System', 'other-1', data)).toBe('Some System');
  });

  it('enriches launch system with loaded ordnance', () => {
    const data = makeMinimalShipData({
      installedLaunchSystems: [{
        id: 'ls-1',
        launchSystemType: 'missile-rack',
        quantity: 1,
        extraHp: 0,
        loadout: [{ designId: 'ord-1', quantity: 4 }],
        totalCapacity: 8,
        hullPoints: 2,
        powerRequired: 0,
        cost: 100000,
      }],
      ordnanceDesigns: [{
        id: 'ord-1',
        name: 'Fire Arrow',
        category: 'missile',
        size: 'light',
        propulsionId: 'prop-1',
        guidanceId: 'guid-1',
        warheadId: 'wh-1',
        totalAccuracy: 0,
        totalCost: 5000,
        capacityRequired: 1,
      }],
    });
    const result = enrichSystemDisplayName('Missile Rack', 'launch-ls-1', data);
    expect(result).toBe('Missile Rack (4xFA)');
  });

  it('enriches weapon with loaded magazine warheads', () => {
    vi.mocked(getWarheads).mockReturnValue([
      { id: 'wh-1', name: 'Kinetic Penetrator', damageType: 'LI', firepower: 'M', damage: 'd12w', cost: 1000, progressLevel: 6, techTracks: [], size: 'medium', capacityRequired: 1, description: '', accuracy: 0 },
    ] as never);
    const data = makeMinimalShipData({
      installedWeapons: [makeInstalledWeapon({
        id: 'wpn-1',
        magazineLoadout: [{ designId: 'wh-1', quantity: 10 }],
      })],
    });
    const result = enrichSystemDisplayName('Mass Cannon', 'wpn-wpn-1', data);
    expect(result).toBe('Mass Cannon (10xKP)');
  });

  it('enriches hangar with loaded craft', () => {
    const data = makeMinimalShipData({
      installedHangarMisc: [{
        id: 'hm-1',
        type: {
          id: 'hangar-bay', name: 'Hangar Bay', progressLevel: 7, techTracks: [],
          category: 'hangar', hullPoints: 4, powerRequired: 0, cost: 1000000, costPer: 'unit',
          description: 'A hangar bay',
        },
        quantity: 1,
        hullPoints: 4,
        powerRequired: 0,
        cost: 1000000,
        loadout: [{ id: 'lc-1', filePath: '', name: 'Strike Fighter', hullName: 'Light Hull', quantity: 2, designCost: 500000, hullHp: 5, fileValid: true }],
      }] as InstalledHangarMiscSystem[],
    });
    const result = enrichSystemDisplayName('Hangar Bay', 'hm-hm-1', data);
    expect(result).toBe('Hangar Bay (2xSF)');
  });

  it('enriches hangar magazine with loaded ordnance', () => {
    const data = makeMinimalShipData({
      installedHangarMisc: [{
        id: 'hm-2',
        type: {
          id: 'magazine', name: 'Magazine', progressLevel: 7, techTracks: [],
          category: 'utility', hullPoints: 2, powerRequired: 0, cost: 200000, costPer: 'unit',
          description: 'An ordnance magazine', ordnanceCapacity: 10,
        },
        quantity: 1,
        hullPoints: 2,
        powerRequired: 0,
        cost: 200000,
        loadout: [],
        ordnanceLoadout: [{ designId: 'ord-1', quantity: 5 }],
      }] as InstalledHangarMiscSystem[],
      ordnanceDesigns: [{
        id: 'ord-1',
        name: 'Heavy Torpedo',
        category: 'missile',
        size: 'heavy',
        propulsionId: 'prop-1',
        guidanceId: 'guid-1',
        warheadId: 'wh-1',
        totalAccuracy: 0,
        totalCost: 10000,
        capacityRequired: 3,
      }],
    });
    const result = enrichSystemDisplayName('Magazine', 'hm-hm-2', data);
    expect(result).toBe('Magazine (5xHT)');
  });

  it('returns original name when launch system has empty loadout', () => {
    const data = makeMinimalShipData({
      installedLaunchSystems: [{
        id: 'ls-1',
        launchSystemType: 'missile-rack',
        quantity: 1,
        extraHp: 0,
        loadout: [],
        totalCapacity: 8,
        hullPoints: 2,
        powerRequired: 0,
        cost: 100000,
      }],
    });
    const result = enrichSystemDisplayName('Missile Rack', 'launch-ls-1', data);
    expect(result).toBe('Missile Rack');
  });

  it('strips parentheses from craft names in abbreviations', () => {
    const data = makeMinimalShipData({
      installedHangarMisc: [{
        id: 'hm-1',
        type: {
          id: 'hangar-bay', name: 'Hangar Bay', progressLevel: 7, techTracks: [],
          category: 'hangar', hullPoints: 4, powerRequired: 0, cost: 1000000, costPer: 'unit',
          description: 'A hangar bay',
        },
        quantity: 1,
        hullPoints: 4,
        powerRequired: 0,
        cost: 1000000,
        loadout: [{ id: 'lc-1', filePath: '', name: 'Fighter (Light)', hullName: 'Light Hull', quantity: 3, designCost: 500000, hullHp: 5, fileValid: true }],
      }] as InstalledHangarMiscSystem[],
    });
    const result = enrichSystemDisplayName('Hangar Bay', 'hm-hm-1', data);
    expect(result).toBe('Hangar Bay (3xFL)');
  });
});

describe('computeShipStats', () => {
  it('returns stats for a minimal ship with just a hull', () => {
    const data = makeMinimalShipData();
    const stats = computeShipStats(data);

    expect(stats.totalHP).toBe(20);
    expect(stats.usedHP).toBe(0);
    expect(stats.remainingHP).toBe(20);
    expect(stats.powerGenerated).toBe(0);
    expect(stats.powerConsumed).toBe(0);
    expect(stats.powerBalance).toBe(0);
    expect(stats.totalCost).toBe(5000000); // hull cost
    expect(stats.totalAcceleration).toBe(0);
    expect(stats.armor).toEqual({ hp: 0, cost: 0 });
    expect(stats.ftl).toBeNull();
  });

  it('includes supportStats in output', () => {
    const data = makeMinimalShipData();
    const stats = computeShipStats(data);

    expect(stats.supportStats).toBeDefined();
    expect(typeof stats.supportStats.totalHullPoints).toBe('number');
    expect(typeof stats.supportStats.totalPowerRequired).toBe('number');
  });

  it('does not produce NaN when engines generate power', async () => {
    const { getEngineAllowPowerGeneration } = await import('./dataLoader') as unknown as { getEngineAllowPowerGeneration: ReturnType<typeof vi.fn> };
    getEngineAllowPowerGeneration.mockReturnValue(true);

    const data = makeMinimalShipData({
      installedEngines: [{
        id: 'eng-1',
        type: {
          id: 'fusion-drive',
          name: 'Fusion Drive',
          progressLevel: 7,
          techTracks: [],
          powerPerHullPoint: 1.0,
          powerGeneratedPerHullPoint: 0.5,
          minSize: 1,
          baseCost: 200000,
          costPerHullPoint: 50000,
          accelerationRatings: { at5Percent: 0.1, at10Percent: 0.25, at15Percent: 0.5, at20Percent: 0.75, at30Percent: 1.0, at40Percent: 1.5, at50Percent: 2.0 },
          usesPL6Scale: false,
          requiresFuel: false,
          fuelEfficiency: 0,
          fuelCostPerHullPoint: 0,
          atmosphereSafe: false,
          description: 'Test engine',
        },
        hullPoints: 4,
      }],
    });

    const stats = computeShipStats(data);
    expect(stats.powerGenerated).not.toBeNaN();
    expect(stats.powerConsumed).not.toBeNaN();
    expect(stats.powerBalance).not.toBeNaN();
    expect(stats.engines.power).not.toBeNaN();
    expect(stats.engines.powerGen).not.toBeNaN();
    expect(stats.engines.cost).not.toBeNaN();
    expect(stats.totalCost).not.toBeNaN();

    // Verify correct values
    expect(stats.engines.powerGen).toBe(2); // ceil(0.5 * 4)
    expect(stats.powerGenerated).toBe(2);   // from engines only

    getEngineAllowPowerGeneration.mockReturnValue(false);
  });
});

// ==========================================================================
// LAYER 2: Option toggling
// ==========================================================================

describe('exportShipToPDF — option toggling', () => {
  let mockPdf: ReturnType<typeof createMockPdf>;

  beforeEach(() => {
    mockPdf = createMockPdf();
    activeMockPdf = mockPdf;
    // Prevent actual file save by mocking electronAPI away
    (globalThis as Record<string, unknown>).window = { electronAPI: undefined };
  });

  function getTextCalls(): string[] {
    return mockPdf.text.mock.calls.map((call: unknown[]) => String(call[0]));
  }

  it('includes combat section when includeCombat is true', async () => {
    const data = makeMinimalShipData({
      installedWeapons: [makeInstalledWeapon()],
      installedSensors: [makeInstalledSensor()],
    });
    await exportShipToPDF(data, { includeCombat: true, includeDamageDiagram: false, includeDetailedSystems: false });

    const texts = getTextCalls();
    expect(texts).toContain('COMBAT SHEET');
  });

  it('excludes combat section when includeCombat is false', async () => {
    const data = makeMinimalShipData({
      installedWeapons: [makeInstalledWeapon()],
      installedSensors: [makeInstalledSensor()],
    });
    await exportShipToPDF(data, { includeCombat: false, includeDamageDiagram: false, includeDetailedSystems: false });

    const texts = getTextCalls();
    expect(texts).not.toContain('COMBAT SHEET');
  });

  it('includes damage diagram section when includeDamageDiagram is true', async () => {
    const data = makeMinimalShipData({
      damageDiagramZones: [
        makeDamageZone({ code: 'F' }),
        makeDamageZone({ code: 'A', systems: [] }),
      ],
    });
    await exportShipToPDF(data, { includeCombat: false, includeDamageDiagram: true, includeDetailedSystems: false });

    const texts = getTextCalls();
    expect(texts).toContain('DAMAGE DIAGRAM');
  });

  it('excludes damage diagram section when includeDamageDiagram is false', async () => {
    const data = makeMinimalShipData({
      damageDiagramZones: [
        makeDamageZone({ code: 'F' }),
        makeDamageZone({ code: 'A', systems: [] }),
      ],
    });
    await exportShipToPDF(data, { includeCombat: false, includeDamageDiagram: false, includeDetailedSystems: false });

    const texts = getTextCalls();
    expect(texts).not.toContain('DAMAGE DIAGRAM');
  });

  it('includes detailed systems rows when includeDetailedSystems is true', async () => {
    const data = makeMinimalShipData({
      armorLayers: [{
        weight: 'light',
        type: {
          id: 'ceramic', name: 'Ceramic', armorWeight: 'light',
          progressLevel: 6, techTracks: [],
          protectionLI: 'd4+1', protectionHI: 'd4', protectionEn: 'd4-1',
          costPerHullPoint: 10000, description: 'Ceramic armor',
        },
        hullPointsUsed: 2,
        cost: 20000,
      }],
    });
    await exportShipToPDF(data, { includeCombat: false, includeDamageDiagram: false, includeDetailedSystems: true });

    const texts = getTextCalls();
    // When detailed systems is enabled, individual armor layer names should appear
    expect(texts.some(t => t.includes('Ceramic'))).toBe(true);
  });

  it('does not produce NaN text when engines generate power', async () => {
    const { getEngineAllowPowerGeneration } = await import('./dataLoader') as unknown as { getEngineAllowPowerGeneration: ReturnType<typeof vi.fn> };
    getEngineAllowPowerGeneration.mockReturnValue(true);

    const data = makeMinimalShipData({
      installedEngines: [{
        id: 'eng-1',
        type: {
          id: 'fusion-drive',
          name: 'Fusion Drive',
          progressLevel: 7,
          techTracks: [],
          powerPerHullPoint: 1.0,
          powerGeneratedPerHullPoint: 0.5,
          minSize: 1,
          baseCost: 200000,
          costPerHullPoint: 50000,
          accelerationRatings: { at5Percent: 0.1, at10Percent: 0.25, at15Percent: 0.5, at20Percent: 0.75, at30Percent: 1.0, at40Percent: 1.5, at50Percent: 2.0 },
          usesPL6Scale: false,
          requiresFuel: false,
          fuelEfficiency: 0,
          fuelCostPerHullPoint: 0,
          atmosphereSafe: false,
          description: 'Test engine',
        },
        hullPoints: 4,
      }],
    });

    await exportShipToPDF(data, { includeCombat: false, includeDamageDiagram: false, includeDetailedSystems: true });

    const texts = getTextCalls();
    const nanTexts = texts.filter(t => t.includes('NaN'));
    expect(nanTexts).toEqual([]);

    getEngineAllowPowerGeneration.mockReturnValue(false);
  });
});

// ==========================================================================
// LAYER 3: Mock-based rendering section verification
// ==========================================================================

describe('exportShipToPDF — section content', () => {
  let mockPdf: ReturnType<typeof createMockPdf>;

  beforeEach(() => {
    mockPdf = createMockPdf();
    activeMockPdf = mockPdf;
    (globalThis as Record<string, unknown>).window = { electronAPI: undefined };
  });

  function getTextCalls(): string[] {
    return mockPdf.text.mock.calls.map((call: unknown[]) => String(call[0]));
  }

  describe('Lore section', () => {
    it('renders ship name as title', async () => {
      const data = makeMinimalShipData({ warshipName: 'USS Enterprise' });
      await exportShipToPDF(data, { includeCombat: false, includeDamageDiagram: false, includeDetailedSystems: false });

      const texts = getTextCalls();
      expect(texts).toContain('USS Enterprise');
    });

    it('renders hull name when warship name is empty', async () => {
      const data = makeMinimalShipData({ warshipName: '' });
      await exportShipToPDF(data, { includeCombat: false, includeDamageDiagram: false, includeDetailedSystems: false });

      const texts = getTextCalls();
      expect(texts).toContain('Frigate');
    });

    it('renders station subtitle for station designs', async () => {
      const data = makeMinimalShipData({
        warshipName: 'Starbase Alpha',
        designType: 'station',
        stationType: 'space-station',
      });
      await exportShipToPDF(data, { includeCombat: false, includeDamageDiagram: false, includeDetailedSystems: false });

      const texts = getTextCalls();
      expect(texts.some(t => t.includes('Space Station'))).toBe(true);
    });

    it('renders ship class subtitle for warship designs', async () => {
      const data = makeMinimalShipData({
        warshipName: 'Test Ship',
        designType: 'warship',
      });
      await exportShipToPDF(data, { includeCombat: false, includeDamageDiagram: false, includeDetailedSystems: false });

      const texts = getTextCalls();
      expect(texts.some(t => t.includes('Light Class'))).toBe(true);
    });

    it('renders lore text when provided', async () => {
      const data = makeMinimalShipData({
        shipDescription: makeShipDescription({ lore: 'A mighty warship' }),
      });
      await exportShipToPDF(data, { includeCombat: false, includeDamageDiagram: false, includeDetailedSystems: false });

      const texts = getTextCalls();
      expect(texts.some(t => t.includes('A mighty warship'))).toBe(true);
    });

    it('renders metadata fields when provided', async () => {
      const data = makeMinimalShipData({
        shipDescription: makeShipDescription({
          faction: 'Galactic Empire',
          role: 'Patrol',
        }),
      });
      await exportShipToPDF(data, { includeCombat: false, includeDamageDiagram: false, includeDetailedSystems: false });

      const texts = getTextCalls();
      expect(texts.some(t => t.includes('Galactic Empire'))).toBe(true);
      expect(texts.some(t => t.includes('Patrol'))).toBe(true);
    });
  });

  describe('Systems Detail section', () => {
    it('renders section title', async () => {
      const data = makeMinimalShipData();
      await exportShipToPDF(data, { includeCombat: false, includeDamageDiagram: false, includeDetailedSystems: false });

      const texts = getTextCalls();
      expect(texts).toContain('SHIP OVERVIEW');
    });

    it('renders station overview for station designs', async () => {
      const data = makeMinimalShipData({ designType: 'station', stationType: 'space-station' });
      await exportShipToPDF(data, { includeCombat: false, includeDamageDiagram: false, includeDetailedSystems: false });

      const texts = getTextCalls();
      expect(texts).toContain('STATION OVERVIEW');
    });

    it('renders systems summary section title', async () => {
      const data = makeMinimalShipData();
      await exportShipToPDF(data, { includeCombat: false, includeDamageDiagram: false, includeDetailedSystems: false });

      const texts = getTextCalls();
      expect(texts).toContain('SYSTEMS SUMMARY');
    });

    it('renders armor as None when no armor installed', async () => {
      const data = makeMinimalShipData({ armorLayers: [] });
      await exportShipToPDF(data, { includeCombat: false, includeDamageDiagram: false, includeDetailedSystems: false });

      const texts = getTextCalls();
      // Armor label with value  "None" should appear
      expect(texts).toContain('None');
    });
  });

  describe('Combat section', () => {
    it('renders sensor table with correct headers', async () => {
      const data = makeMinimalShipData({
        installedSensors: [makeInstalledSensor()],
      });
      await exportShipToPDF(data, { includeCombat: true, includeDamageDiagram: false, includeDetailedSystems: false });

      const texts = getTextCalls();
      expect(texts).toContain('SENSORS');
      expect(texts).toContain('Name');
      expect(texts).toContain('Range S/M/L');
      expect(texts).toContain('Tracking');
    });

    it('renders weapon table with correct headers', async () => {
      const data = makeMinimalShipData({
        installedWeapons: [makeInstalledWeapon()],
      });
      await exportShipToPDF(data, { includeCombat: true, includeDamageDiagram: false, includeDetailedSystems: false });

      const texts = getTextCalls();
      expect(texts).toContain('WEAPONS');
      expect(texts).toContain('Damage');
      expect(texts).toContain('Type/FP');
    });

    it('renders weapon data correctly', async () => {
      const data = makeMinimalShipData({
        installedWeapons: [makeInstalledWeapon()],
      });
      await exportShipToPDF(data, { includeCombat: true, includeDamageDiagram: false, includeDetailedSystems: false });

      const texts = getTextCalls();
      expect(texts.some(t => t.includes('Laser Cannon'))).toBe(true);
      expect(texts).toContain('d8w');
      expect(texts).toContain('En/L');
      expect(texts).toContain('3/10/30');
    });

    it('renders defense section with toughness', async () => {
      const data = makeMinimalShipData({
        installedDefenses: [makeInstalledDefense()],
      });
      await exportShipToPDF(data, { includeCombat: true, includeDamageDiagram: false, includeDetailedSystems: false });

      const texts = getTextCalls();
      expect(texts).toContain('DEFENSES');
      expect(texts).toContain('Light'); // toughness
    });

    it('renders damage track section', async () => {
      const data = makeMinimalShipData();
      await exportShipToPDF(data, { includeCombat: true, includeDamageDiagram: false, includeDetailedSystems: false });

      const texts = getTextCalls();
      expect(texts).toContain('DAMAGE TRACK');
      expect(texts.some(t => t.includes('Stun'))).toBe(true);
      expect(texts.some(t => t.includes('Wound'))).toBe(true);
      expect(texts.some(t => t.includes('Mortal'))).toBe(true);
      expect(texts.some(t => t.includes('Critical'))).toBe(true);
    });

    it('renders active defense effects', async () => {
      const data = makeMinimalShipData({
        installedDefenses: [makeInstalledDefense()],
      });
      await exportShipToPDF(data, { includeCombat: true, includeDamageDiagram: false, includeDetailedSystems: false });

      const texts = getTextCalls();
      expect(texts.some(t => t.includes('ECM Suite'))).toBe(true);
      expect(texts.some(t => t.includes('+1 step penalty'))).toBe(true);
    });

    it('renders ordnance designs section when ordnance exists', async () => {
      const data = makeMinimalShipData({
        ordnanceDesigns: [{
          id: 'ord-1',
          name: 'Fire Arrow',
          category: 'missile',
          size: 'light',
          propulsionId: 'prop-1',
          guidanceId: 'guid-1',
          warheadId: 'wh-1',
          totalAccuracy: 1,
          totalCost: 5000,
          capacityRequired: 1,
        }],
      });
      await exportShipToPDF(data, { includeCombat: true, includeDamageDiagram: false, includeDetailedSystems: false });

      const texts = getTextCalls();
      expect(texts).toContain('ORDNANCE');
      expect(texts.some(t => t.includes('Fire Arrow'))).toBe(true);
      expect(texts).toContain('Missile'); // capitalized category
    });
  });

  describe('Damage diagram section', () => {
    it('renders hit location table', async () => {
      const data = makeMinimalShipData({
        damageDiagramZones: [
          makeDamageZone({ code: 'F' }),
          makeDamageZone({ code: 'A', systems: [] }),
        ],
      });
      await exportShipToPDF(data, { includeCombat: false, includeDamageDiagram: true, includeDetailedSystems: false });

      const texts = getTextCalls();
      expect(texts).toContain('DAMAGE DIAGRAM');
      expect(texts).toContain('HIT LOCATION TABLE');
      expect(texts).toContain('Forward');
      expect(texts).toContain('Port');
      expect(texts).toContain('Starboard');
      expect(texts).toContain('Aft');
    });

    it('renders damage zones heading', async () => {
      const data = makeMinimalShipData({
        damageDiagramZones: [
          makeDamageZone({ code: 'F' }),
          makeDamageZone({ code: 'A', systems: [] }),
        ],
      });
      await exportShipToPDF(data, { includeCombat: false, includeDamageDiagram: true, includeDetailedSystems: false });

      const texts = getTextCalls();
      expect(texts).toContain('DAMAGE ZONES');
    });

    it('skips damage diagram when zones are empty', async () => {
      const data = makeMinimalShipData({ damageDiagramZones: [] });
      await exportShipToPDF(data, { includeCombat: false, includeDamageDiagram: true, includeDetailedSystems: false });

      const texts = getTextCalls();
      expect(texts).not.toContain('DAMAGE DIAGRAM');
    });
  });

  describe('Footer', () => {
    it('renders footer on all pages', async () => {
      const data = makeMinimalShipData();
      await exportShipToPDF(data, defaultExportOptions);

      // setPage should be called for each page (mocked getNumberOfPages returns 3)
      expect(mockPdf.setPage).toHaveBeenCalledWith(1);
      expect(mockPdf.setPage).toHaveBeenCalledWith(2);
      expect(mockPdf.setPage).toHaveBeenCalledWith(3);

      const texts = getTextCalls();
      expect(texts.some(t => t.includes('Alternity Warship Generator'))).toBe(true);
    });
  });

  describe('Page management', () => {
    it('starts new pages for systems detail and combat sections', async () => {
      const data = makeMinimalShipData({
        installedWeapons: [makeInstalledWeapon()],
      });
      await exportShipToPDF(data, { includeCombat: true, includeDamageDiagram: false, includeDetailedSystems: false });

      // At minimum: systems detail page + combat page
      expect(mockPdf.addPage.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });
});

// ==========================================================================
// LAYER 4: Snapshot test
// ==========================================================================

describe('exportShipToPDF — snapshot', () => {
  let mockPdf: ReturnType<typeof createMockPdf>;

  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2025-01-15T12:00:00Z') });
    mockPdf = createMockPdf();
    activeMockPdf = mockPdf;
    (globalThis as Record<string, unknown>).window = { electronAPI: undefined };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('produces a stable sequence of PDF text calls for a standard ship', async () => {
    const data = makeMinimalShipData({
      warshipName: 'Snapshot Frigate',
      armorLayers: [{
        weight: 'light',
        type: {
          id: 'ceramic', name: 'Ceramic', armorWeight: 'light',
          progressLevel: 6, techTracks: [],
          protectionLI: 'd4+1', protectionHI: 'd4', protectionEn: 'd4-1',
          costPerHullPoint: 10000, description: 'Ceramic armor',
        },
        hullPointsUsed: 2,
        cost: 20000,
      }],
      installedWeapons: [makeInstalledWeapon()],
      installedSensors: [makeInstalledSensor()],
      installedDefenses: [makeInstalledDefense()],
      installedCommandControl: [makeInstalledCC()],
      damageDiagramZones: [
        makeDamageZone({ code: 'F' }),
        makeDamageZone({ code: 'A', systems: [] }),
      ],
    });

    await exportShipToPDF(data, {
      includeCombat: true,
      includeDamageDiagram: true,
      includeDetailedSystems: false,
    });

    // Capture all text calls as the snapshot subject
    const textCalls = mockPdf.text.mock.calls.map((call: unknown[]) => ({
      text: call[0],
      x: call[1],
      // Omit y position since it varies with layout shifts — we care about content, not exact placement
    }));

    expect(textCalls).toMatchSnapshot();
  });

  it('produces a stable snapshot with detailed systems enabled', async () => {
    const data = makeMinimalShipData({
      warshipName: 'Detailed Frigate',
      armorLayers: [{
        weight: 'light',
        type: {
          id: 'ceramic', name: 'Ceramic', armorWeight: 'light',
          progressLevel: 6, techTracks: [],
          protectionLI: 'd4+1', protectionHI: 'd4', protectionEn: 'd4-1',
          costPerHullPoint: 10000, description: 'Ceramic armor',
        },
        hullPointsUsed: 2,
        cost: 20000,
      }],
      installedWeapons: [makeInstalledWeapon()],
      installedSensors: [makeInstalledSensor()],
      installedDefenses: [makeInstalledDefense()],
      installedCommandControl: [makeInstalledCC()],
    });

    await exportShipToPDF(data, {
      includeCombat: true,
      includeDamageDiagram: false,
      includeDetailedSystems: true,
    });

    const textCalls = mockPdf.text.mock.calls.map((call: unknown[]) => ({
      text: call[0],
      x: call[1],
    }));

    expect(textCalls).toMatchSnapshot();
  });
});
