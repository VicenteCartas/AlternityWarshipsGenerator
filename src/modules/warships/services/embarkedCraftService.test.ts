import { describe, expect, it } from 'vitest';
import type { InstalledHangarMiscSystem } from '../types/hangarMisc';
import {
  getEmbarkedCraftHullPoints,
  getSystemUsedCapacity,
  validateCraftForSystem,
} from './embarkedCraftService';

function makeSystem(berthing: 'hangar' | 'docking', capacity: number): InstalledHangarMiscSystem {
  return {
    id: `${berthing}-1`,
    type: {
      id: berthing,
      name: berthing === 'hangar' ? 'Hangar' : 'Docking Clamps',
      progressLevel: 6,
      techTracks: [],
      category: 'hangar',
      hullPoints: 1,
      powerRequired: 0,
      cost: 0,
      costPer: 'unit',
      ...(berthing === 'hangar' ? { hangarCapacity: capacity } : { dockCapacity: capacity }),
      description: '',
    },
    quantity: 1,
    hullPoints: 1,
    powerRequired: 0,
    cost: 0,
    capacity,
  };
}

describe('embarked craft capacity', () => {
  it('uses base hull points and ignores economy-of-scale bonus hull', () => {
    expect(getEmbarkedCraftHullPoints({ hullPoints: 80, bonusHullPoints: 24 })).toBe(80);
  });

  it('allows a bonus-hull craft to fill an 80 HP hangar using its 80 HP base hull', () => {
    const system = makeSystem('hangar', 80);
    const hullHp = getEmbarkedCraftHullPoints({ hullPoints: 80, bonusHullPoints: 24 });
    expect(validateCraftForSystem(hullHp, 'Escort', 1, system, 800)).toBeNull();
  });

  it('uses the same base hull snapshot for docking clamp limits and used capacity', () => {
    const system = makeSystem('docking', 80);
    const hullHp = getEmbarkedCraftHullPoints({ hullPoints: 80, bonusHullPoints: 24 });
    expect(validateCraftForSystem(hullHp, 'Escort', 1, system, 800)).toBeNull();
    system.loadout = [{
      id: 'craft-1',
      filePath: 'escort.warship.json',
      name: 'Escort',
      hullHp,
      hullName: 'Escort Hull',
      quantity: 1,
      designCost: 1,
      fileValid: true,
    }];
    expect(getSystemUsedCapacity(system)).toBe(80);
  });
});