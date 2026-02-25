import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ArmorType, ArmorWeightConfig, ShipArmor } from '../types/armor';
import type { Hull } from '../types/hull';

// Mock the dataLoader module
vi.mock('./dataLoader', () => ({
  getArmorTypesData: vi.fn(),
  getArmorWeightsData: vi.fn(),
  getArmorAllowMultipleLayers: vi.fn(),
}));

import {
  getArmorWeights,
  getAllArmorTypes,
  getArmorTypesForShipClass,
  getArmorTypesByWeight,
  getArmorWeightsForShipClass,
  calculateArmorHullPoints,
  calculateArmorCostHullPoints,
  calculateArmorCost,
  isMultipleArmorLayersAllowed,
  calculateMultiLayerArmorHP,
  calculateMultiLayerArmorCost,
  buildShipArmor,
  sortArmorLayers,
} from './armorService';
import { getArmorTypesData, getArmorWeightsData, getArmorAllowMultipleLayers } from './dataLoader';

// ============== Test Data ==============

const MOCK_ARMOR_WEIGHTS: ArmorWeightConfig[] = [
  { id: 'light', name: 'Light Armor', hullPercentage: 0, costHullPercentage: 2.5, description: 'Light armor', minShipClass: 'small-craft' },
  { id: 'medium', name: 'Medium Armor', hullPercentage: 5, costHullPercentage: 5, description: 'Medium armor', minShipClass: 'small-craft' },
  { id: 'heavy', name: 'Heavy Armor', hullPercentage: 10, costHullPercentage: 10, description: 'Heavy armor', minShipClass: 'light' },
  { id: 'super-heavy', name: 'Super-Heavy Armor', hullPercentage: 20, costHullPercentage: 20, description: 'Super-heavy armor', minShipClass: 'medium' },
];

const MOCK_ARMOR_TYPES: ArmorType[] = [
  { id: 'polymeric-light', name: 'Polymeric', armorWeight: 'light', progressLevel: 6, techTracks: [], protectionLI: 'd4-1', protectionHI: 'd4-1', protectionEn: 'd4-2', costPerHullPoint: 50000, description: '' },
  { id: 'cerametal-medium', name: 'Cerametal', armorWeight: 'medium', progressLevel: 6, techTracks: [], protectionLI: 'd6', protectionHI: 'd6', protectionEn: 'd4', costPerHullPoint: 75000, description: '' },
  { id: 'cerametal-heavy', name: 'Cerametal', armorWeight: 'heavy', progressLevel: 6, techTracks: [], protectionLI: 'd8', protectionHI: 'd8', protectionEn: 'd6', costPerHullPoint: 100000, description: '' },
  { id: 'neutronite-super-heavy', name: 'Neutronite', armorWeight: 'super-heavy', progressLevel: 8, techTracks: ['G'], protectionLI: 'd12+2', protectionHI: 'd12+2', protectionEn: 'd12', costPerHullPoint: 200000, description: '' },
];

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

// ============== Setup ==============

beforeEach(() => {
  vi.mocked(getArmorWeightsData).mockReturnValue(MOCK_ARMOR_WEIGHTS);
  vi.mocked(getArmorTypesData).mockReturnValue(MOCK_ARMOR_TYPES);
  vi.mocked(getArmorAllowMultipleLayers).mockReturnValue(false);
});

// ============== Tests ==============

describe('getArmorWeights', () => {
  it('returns all armor weight configs from dataLoader', () => {
    expect(getArmorWeights()).toEqual(MOCK_ARMOR_WEIGHTS);
    expect(getArmorWeights()).toHaveLength(4);
  });
});

describe('getAllArmorTypes', () => {
  it('returns all armor types from dataLoader', () => {
    expect(getAllArmorTypes()).toEqual(MOCK_ARMOR_TYPES);
    expect(getAllArmorTypes()).toHaveLength(4);
  });
});

describe('getArmorTypesForShipClass', () => {
  it('returns all armor types for medium ship class (light, medium, heavy, super-heavy)', () => {
    const types = getArmorTypesForShipClass('medium');
    expect(types).toHaveLength(4);
  });

  it('excludes heavy and super-heavy armor for small-craft', () => {
    const types = getArmorTypesForShipClass('small-craft');
    expect(types).toHaveLength(2); // light + medium only
    expect(types.every(t => t.armorWeight === 'light' || t.armorWeight === 'medium')).toBe(true);
  });

  it('excludes super-heavy armor for light ships', () => {
    const types = getArmorTypesForShipClass('light');
    expect(types).toHaveLength(3); // light + medium + heavy
    expect(types.find(t => t.armorWeight === 'super-heavy')).toBeUndefined();
  });

  it('returns all types for super-heavy ships', () => {
    const types = getArmorTypesForShipClass('super-heavy');
    expect(types).toHaveLength(4);
  });
});

describe('getArmorTypesByWeight', () => {
  it('returns all types when weight is "all"', () => {
    const types = getArmorTypesByWeight('medium', 'all');
    expect(types).toHaveLength(4);
  });

  it('filters by specific weight', () => {
    const types = getArmorTypesByWeight('medium', 'light');
    expect(types).toHaveLength(1);
    expect(types[0].id).toBe('polymeric-light');
  });

  it('returns empty array when no types match the weight for that ship class', () => {
    const types = getArmorTypesByWeight('small-craft', 'heavy');
    expect(types).toHaveLength(0);
  });
});

describe('getArmorWeightsForShipClass', () => {
  it('returns all weights for heavy ships', () => {
    const weights = getArmorWeightsForShipClass('heavy');
    expect(weights).toHaveLength(4);
  });

  it('returns only light and medium for small-craft', () => {
    const weights = getArmorWeightsForShipClass('small-craft');
    expect(weights).toHaveLength(2);
    expect(weights.map(w => w.id)).toEqual(['light', 'medium']);
  });

  it('excludes super-heavy for light ships', () => {
    const weights = getArmorWeightsForShipClass('light');
    expect(weights).toHaveLength(3);
    expect(weights.find(w => w.id === 'super-heavy')).toBeUndefined();
  });
});

describe('calculateArmorHullPoints', () => {
  it('returns 0 for light armor (0% hull cost)', () => {
    const hull = makeHull({ hullPoints: 100 });
    expect(calculateArmorHullPoints(hull, 'light')).toBe(0);
  });

  it('returns ceil(hullPoints * 0.05) for medium armor', () => {
    const hull = makeHull({ hullPoints: 100 });
    expect(calculateArmorHullPoints(hull, 'medium')).toBe(5);
  });

  it('returns ceil(hullPoints * 0.1) for heavy armor', () => {
    const hull = makeHull({ hullPoints: 100 });
    expect(calculateArmorHullPoints(hull, 'heavy')).toBe(10);
  });

  it('returns ceil(hullPoints * 0.2) for super-heavy armor', () => {
    const hull = makeHull({ hullPoints: 100 });
    expect(calculateArmorHullPoints(hull, 'super-heavy')).toBe(20);
  });

  it('rounds up non-integer values', () => {
    const hull = makeHull({ hullPoints: 11 });
    expect(calculateArmorHullPoints(hull, 'medium')).toBe(1); // ceil(11 * 0.05) = ceil(0.55) = 1
    expect(calculateArmorHullPoints(hull, 'heavy')).toBe(2);  // ceil(11 * 0.1) = ceil(1.1) = 2
  });

  it('returns 0 for unknown weight', () => {
    const hull = makeHull({ hullPoints: 100 });
    expect(calculateArmorHullPoints(hull, 'nonexistent')).toBe(0);
  });
});

describe('calculateArmorCostHullPoints', () => {
  it('returns ceil(hullPoints * costHullPercentage/100) with minimum 1 for light armor', () => {
    const hull = makeHull({ hullPoints: 100 });
    expect(calculateArmorCostHullPoints(hull, 'light')).toBe(3); // max(1, ceil(100 * 0.025)) = 3
  });

  it('returns minimum 1 for very small hulls', () => {
    const hull = makeHull({ hullPoints: 1 });
    expect(calculateArmorCostHullPoints(hull, 'light')).toBe(1); // max(1, ceil(1 * 0.025)) = max(1, 1) = 1
  });

  it('returns same as calculateArmorHullPoints for medium (costHullPercentage = hullPercentage)', () => {
    const hull = makeHull({ hullPoints: 100 });
    expect(calculateArmorCostHullPoints(hull, 'medium')).toBe(5);
  });

  it('returns 0 for unknown weight', () => {
    const hull = makeHull({ hullPoints: 100 });
    expect(calculateArmorCostHullPoints(hull, 'nonexistent')).toBe(0);
  });
});

describe('calculateArmorCost', () => {
  it('multiplies costHullPoints by costPerHullPoint', () => {
    const hull = makeHull({ hullPoints: 100 });
    const armorType = MOCK_ARMOR_TYPES[0]; // polymeric-light, costPerHullPoint 50000
    // costHullPoints for light = max(1, ceil(100 * 0.025)) = 3
    expect(calculateArmorCost(hull, 'light', armorType)).toBe(3 * 50000);
  });

  it('calculates correctly for medium armor', () => {
    const hull = makeHull({ hullPoints: 200 });
    const armorType = MOCK_ARMOR_TYPES[1]; // cerametal-medium, costPerHullPoint 75000
    // costHullPoints for medium = ceil(200 * 0.05) = 10
    expect(calculateArmorCost(hull, 'medium', armorType)).toBe(10 * 75000);
  });
});

describe('isMultipleArmorLayersAllowed', () => {
  it('returns false by default', () => {
    expect(isMultipleArmorLayersAllowed()).toBe(false);
  });

  it('returns true when dataLoader says so', () => {
    vi.mocked(getArmorAllowMultipleLayers).mockReturnValue(true);
    expect(isMultipleArmorLayersAllowed()).toBe(true);
  });
});

describe('calculateMultiLayerArmorHP', () => {
  it('returns 0 for empty layers', () => {
    const hull = makeHull({ hullPoints: 100 });
    expect(calculateMultiLayerArmorHP(hull, [])).toBe(0);
  });

  it('sums HP for multiple layers', () => {
    const hull = makeHull({ hullPoints: 100 });
    const layers: ShipArmor[] = [
      { weight: 'light', type: MOCK_ARMOR_TYPES[0], hullPointsUsed: 0, cost: 0 },
      { weight: 'medium', type: MOCK_ARMOR_TYPES[1], hullPointsUsed: 5, cost: 0 },
    ];
    // light = 0 HP, medium = 5 HP
    expect(calculateMultiLayerArmorHP(hull, layers)).toBe(0 + 5);
  });
});

describe('calculateMultiLayerArmorCost', () => {
  it('returns 0 for empty layers', () => {
    const hull = makeHull({ hullPoints: 100 });
    expect(calculateMultiLayerArmorCost(hull, [])).toBe(0);
  });

  it('sums costs for multiple layers', () => {
    const hull = makeHull({ hullPoints: 100 });
    const layers: ShipArmor[] = [
      { weight: 'light', type: MOCK_ARMOR_TYPES[0], hullPointsUsed: 0, cost: 0 },
      { weight: 'heavy', type: MOCK_ARMOR_TYPES[2], hullPointsUsed: 10, cost: 0 },
    ];
    // light cost = 3 * 50000 = 150000, heavy cost = 10 * 100000 = 1000000
    expect(calculateMultiLayerArmorCost(hull, layers)).toBe(150000 + 1000000);
  });
});

describe('buildShipArmor', () => {
  it('builds a ShipArmor with correct fields', () => {
    const hull = makeHull({ hullPoints: 100 });
    const armorType = MOCK_ARMOR_TYPES[1]; // cerametal-medium
    const result = buildShipArmor(hull, armorType);
    expect(result.weight).toBe('medium');
    expect(result.type).toBe(armorType);
    expect(result.hullPointsUsed).toBe(5);   // ceil(100 * 0.05) = 5
    expect(result.cost).toBe(5 * 75000);     // 5 * 75000 = 375000
  });

  it('builds correctly for light armor', () => {
    const hull = makeHull({ hullPoints: 100 });
    const armorType = MOCK_ARMOR_TYPES[0]; // polymeric-light
    const result = buildShipArmor(hull, armorType);
    expect(result.weight).toBe('light');
    expect(result.hullPointsUsed).toBe(0);
    expect(result.cost).toBe(3 * 50000);     // costHullPoints=3
  });
});

describe('sortArmorLayers', () => {
  it('sorts layers by weight: light → medium → heavy → super-heavy', () => {
    const layers: ShipArmor[] = [
      { weight: 'super-heavy', type: MOCK_ARMOR_TYPES[3], hullPointsUsed: 20, cost: 0 },
      { weight: 'light', type: MOCK_ARMOR_TYPES[0], hullPointsUsed: 0, cost: 0 },
      { weight: 'heavy', type: MOCK_ARMOR_TYPES[2], hullPointsUsed: 10, cost: 0 },
      { weight: 'medium', type: MOCK_ARMOR_TYPES[1], hullPointsUsed: 5, cost: 0 },
    ];
    const sorted = sortArmorLayers(layers);
    expect(sorted.map(l => l.weight)).toEqual(['light', 'medium', 'heavy', 'super-heavy']);
  });

  it('returns empty array for empty input', () => {
    expect(sortArmorLayers([])).toEqual([]);
  });

  it('does not mutate the original array', () => {
    const layers: ShipArmor[] = [
      { weight: 'heavy', type: MOCK_ARMOR_TYPES[2], hullPointsUsed: 10, cost: 0 },
      { weight: 'light', type: MOCK_ARMOR_TYPES[0], hullPointsUsed: 0, cost: 0 },
    ];
    const original = [...layers];
    sortArmorLayers(layers);
    expect(layers).toEqual(original);
  });
});
