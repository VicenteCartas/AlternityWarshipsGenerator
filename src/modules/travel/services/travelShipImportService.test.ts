import { describe, expect, it } from 'vitest';
import type { WarshipSaveFile } from '@warships/types/saveFile';
import {
  assessEngineFuel,
  deriveTravelShipProfile,
} from './travelShipImportService';
import { accelerationRatingToMps2 } from './travelCalculationService';

function design(overrides: Partial<WarshipSaveFile> = {}): WarshipSaveFile {
  return {
    version: '1.2',
    name: 'Test Courier',
    createdAt: '2026-01-01T00:00:00.000Z',
    modifiedAt: '2026-01-01T00:00:00.000Z',
    hull: { id: 'heavy-cruiser' },
    armor: null,
    designProgressLevel: 7,
    designTechTracks: [],
    powerPlants: [],
    fuelTanks: [],
    engines: [],
    engineFuelTanks: [],
    ftlDrive: null,
    ftlFuelTanks: [],
    lifeSupport: [],
    accommodations: [],
    storeSystems: [],
    gravitySystems: [],
    defenses: [],
    commandControl: [],
    sensors: [],
    hangarMisc: [],
    weapons: [],
    ordnanceDesigns: [],
    launchSystems: [],
    damageDiagramZones: [],
    hitLocationChart: null,
    systems: [],
    ...overrides,
  } as WarshipSaveFile;
}

describe('deriveTravelShipProfile', () => {
  it('returns null for a design without a hull', () => {
    expect(deriveTravelShipProfile(design({ hull: null }))).toBeNull();
  });

  it('warns when a design has no engines', () => {
    const profile = deriveTravelShipProfile(design())!;
    expect(profile.accelerationMps2).toBe(0);
    expect(profile.warnings).toContain('This design has no installed engines.');
  });

  it('imports a PL6 fusion torch and its fuel endurance', () => {
    const profile = deriveTravelShipProfile(design({
      designProgressLevel: 6,
      engines: [{ id: 'e1', typeId: 'fusion-torch', hullPoints: 40 }],
      engineFuelTanks: [{ id: 'f1', forEngineTypeId: 'fusion-torch', hullPoints: 40 }],
    }))!;

    expect(profile.pl6AccelerationRating).toBeCloseTo(1, 10);
    expect(profile.pl7AccelerationRating).toBe(0);
    expect(profile.accelerationMps2).toBeCloseTo(accelerationRatingToMps2(1, 'pl6'), 10);
    expect(profile.engines[0].fuelEnduranceDays).toBeCloseTo(200, 10);
    expect(profile.hasAccelerationCompensation).toBe(false);
    expect(profile.warnings.some((warning) => warning.includes('dimensionally consistent'))).toBe(true);
  });

  it('groups same-type engine HP before using a non-linear acceleration table', () => {
    // Heavy cruiser base hull is 400 HP. Two 20-HP inertial flux installations
    // combine to 10% hull and Acceleration 3, rather than two separate Acc 2 blocks.
    const profile = deriveTravelShipProfile(design({
      designProgressLevel: 8,
      engines: [
        { id: 'e1', typeId: 'inertial-flux', hullPoints: 20 },
        { id: 'e2', typeId: 'inertial-flux', hullPoints: 20 },
      ],
    }))!;

    expect(profile.engines).toHaveLength(1);
    expect(profile.engines[0].engineHullPoints).toBe(40);
    expect(profile.engines[0].accelerationRating).toBeCloseTo(3, 10);
  });

  it('combines mixed scales only after converting each to physical acceleration', () => {
    const profile = deriveTravelShipProfile(design({
      engines: [
        { id: 'e1', typeId: 'fusion-torch', hullPoints: 40 },
        { id: 'e2', typeId: 'induction-engine', hullPoints: 40 },
      ],
    }))!;

    expect(profile.pl6AccelerationRating).toBeCloseTo(1, 10);
    expect(profile.pl7AccelerationRating).toBeCloseTo(2, 10);
    expect(profile.accelerationMps2).toBeCloseTo(
      accelerationRatingToMps2(1, 'pl6') + accelerationRatingToMps2(2, 'pl7plus'),
      8,
    );
    expect(profile.warnings.some((warning) => warning.includes('mixes PL6 and PL7+'))).toBe(true);
  });

  it('recognizes acceleration compensation on an all-PL7+ drive package', () => {
    const profile = deriveTravelShipProfile(design({
      engines: [{ id: 'e1', typeId: 'induction-engine', hullPoints: 40 }],
    }))!;
    expect(profile.hasAccelerationCompensation).toBe(true);
  });

  it('warns that photon-sail acceleration is not constant', () => {
    const profile = deriveTravelShipProfile(design({
      designProgressLevel: 6,
      engines: [{ id: 'e1', typeId: 'photon-sail', hullPoints: 160 }],
    }))!;
    expect(profile.warnings.some((warning) => warning.includes('varies with distance'))).toBe(true);
  });
});

describe('assessEngineFuel', () => {
  const fueledShip = deriveTravelShipProfile(design({
    designProgressLevel: 6,
    engines: [{ id: 'e1', typeId: 'fusion-torch', hullPoints: 40 }],
    engineFuelTanks: [{ id: 'f1', forEngineTypeId: 'fusion-torch', hullPoints: 40 }],
  }))!;

  it('calculates required fuel HP from shipboard thrust-days', () => {
    const [assessment] = assessEngineFuel(fueledShip, 100 * 86_400);
    expect(assessment.requiredFuelHullPoints).toBeCloseTo(20, 10);
    expect(assessment.remainingFuelHullPoints).toBeCloseTo(20, 10);
    expect(assessment.hasEnoughFuel).toBe(true);
  });

  it('reports insufficient installed fuel', () => {
    const [assessment] = assessEngineFuel(fueledShip, 300 * 86_400);
    expect(assessment.requiredFuelHullPoints).toBeCloseTo(60, 10);
    expect(assessment.remainingFuelHullPoints).toBeCloseTo(-20, 10);
    expect(assessment.hasEnoughFuel).toBe(false);
  });

  it('does not require propellant from a fuel-free engine', () => {
    const ship = deriveTravelShipProfile(design({
      engines: [{ id: 'e1', typeId: 'induction-engine', hullPoints: 40 }],
    }))!;
    const [assessment] = assessEngineFuel(ship, 10_000 * 86_400);
    expect(assessment.requiredFuelHullPoints).toBe(0);
    expect(assessment.hasEnoughFuel).toBe(true);
  });

  it('allows a fuel-optional planetary thruster to operate from power', () => {
    const ship = deriveTravelShipProfile(design({
      designProgressLevel: 6,
      engines: [{ id: 'e1', typeId: 'planetary-thruster', hullPoints: 40 }],
    }))!;
    const [assessment] = assessEngineFuel(ship, 10 * 86_400);
    expect(assessment.fuelOptional).toBe(true);
    expect(assessment.hasEnoughFuel).toBe(true);
  });
});
