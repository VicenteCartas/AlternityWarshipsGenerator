import { describe, it, expect } from 'vitest';
import { calculateStepCompletion, hasAnyInstalledComponents } from './stepCompletionService';
import type { WarshipState } from '../types/warshipState';
import type { StepDef } from '../types/common';

// Minimal empty state for testing
function makeEmptyState(overrides: Partial<WarshipState> = {}): WarshipState {
  return {
    name: 'Test',
    shipDescription: { lore: '', imageData: null, imageMimeType: null, faction: '', role: '', commissioningDate: '', classification: '', manufacturer: '' },
    designType: 'warship',
    stationType: null,
    surfaceProvidesLifeSupport: false,
    surfaceProvidesGravity: false,
    hull: null,
    armorLayers: [],
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
    designProgressLevel: 9,
    designTechTracks: [],
    activeMods: [],
    ...overrides,
  };
}

const ALL_STEPS: StepDef[] = [
  { id: 'hull', label: 'Hull', required: true },
  { id: 'armor', label: 'Armor', required: false },
  { id: 'power', label: 'Power', required: true },
  { id: 'engines', label: 'Engines', required: true },
  { id: 'ftl', label: 'FTL', required: false },
  { id: 'support', label: 'Support', required: false },
  { id: 'weapons', label: 'Weapons', required: false },
  { id: 'defenses', label: 'Defenses', required: false },
  { id: 'sensors', label: 'Sensors', required: true },
  { id: 'c4', label: 'C4', required: true },
  { id: 'hangars', label: 'Misc', required: false },
  { id: 'damage', label: 'Zones', required: true },
  { id: 'summary', label: 'Summary', required: false },
];

// Minimal stubs for installed items
const stubHull = { name: 'Test Hull', hullPoints: 50 } as WarshipState['hull'];
const stubPowerPlant = { id: 1, type: { name: 'Reactor' } } as unknown as WarshipState['powerPlants'][0];
const stubEngine = { id: 1, type: { name: 'Thruster' } } as unknown as WarshipState['engines'][0];
const stubFTL = { id: 1, type: { name: 'Star Drive' } } as unknown as NonNullable<WarshipState['ftlDrive']>;
const stubLifeSupport = { id: 1, type: { name: 'LS' } } as unknown as WarshipState['lifeSupport'][0];
const stubAccommodation = { id: 1, type: { name: 'Quarters' } } as unknown as WarshipState['accommodations'][0];
const stubStoreSystem = { id: 1, type: { name: 'Store' } } as unknown as WarshipState['storeSystems'][0];
const stubWeapon = { id: 1, type: { name: 'Laser' } } as unknown as WarshipState['weapons'][0];
const stubDefense = { id: 1, type: { name: 'Shield' } } as unknown as WarshipState['defenses'][0];
const stubSensor = { id: 1, type: { name: 'Radar' } } as unknown as WarshipState['sensors'][0];
const stubC4Required = { id: 1, type: { name: 'Bridge', isRequired: true } } as unknown as WarshipState['commandControl'][0];
const stubC4Optional = { id: 1, type: { name: 'Aux', isRequired: false } } as unknown as WarshipState['commandControl'][0];
const stubHangarMisc = { id: 1, type: { name: 'Bay' } } as unknown as WarshipState['hangarMisc'][0];
const stubArmorLayer = { weight: 'light', type: { name: 'Plate' } } as unknown as WarshipState['armorLayers'][0];

describe('calculateStepCompletion', () => {
  it('returns all false for empty state', () => {
    const { stepCompletion, completedStepCount } = calculateStepCompletion(ALL_STEPS, makeEmptyState(), 'error');
    expect(completedStepCount).toBe(0);
    for (const step of ALL_STEPS) {
      expect(stepCompletion.get(step.id)).toBe(false);
    }
  });

  it('marks hull complete when hull is selected', () => {
    const state = makeEmptyState({ hull: stubHull });
    const { stepCompletion } = calculateStepCompletion(ALL_STEPS, state, 'error');
    expect(stepCompletion.get('hull')).toBe(true);
  });

  it('marks armor complete when armor layers exist', () => {
    const state = makeEmptyState({ armorLayers: [stubArmorLayer] });
    const { stepCompletion } = calculateStepCompletion(ALL_STEPS, state, 'error');
    expect(stepCompletion.get('armor')).toBe(true);
  });

  it('marks power complete when power plants installed', () => {
    const state = makeEmptyState({ powerPlants: [stubPowerPlant] });
    const { stepCompletion } = calculateStepCompletion(ALL_STEPS, state, 'error');
    expect(stepCompletion.get('power')).toBe(true);
  });

  it('marks engines complete when engines installed', () => {
    const state = makeEmptyState({ engines: [stubEngine] });
    const { stepCompletion } = calculateStepCompletion(ALL_STEPS, state, 'error');
    expect(stepCompletion.get('engines')).toBe(true);
  });

  it('marks ftl complete when FTL drive installed', () => {
    const state = makeEmptyState({ ftlDrive: stubFTL });
    const { stepCompletion } = calculateStepCompletion(ALL_STEPS, state, 'error');
    expect(stepCompletion.get('ftl')).toBe(true);
  });

  it('marks support complete when life support installed', () => {
    const state = makeEmptyState({ lifeSupport: [stubLifeSupport] });
    const { stepCompletion } = calculateStepCompletion(ALL_STEPS, state, 'error');
    expect(stepCompletion.get('support')).toBe(true);
  });

  it('marks support complete when accommodations installed', () => {
    const state = makeEmptyState({ accommodations: [stubAccommodation] });
    const { stepCompletion } = calculateStepCompletion(ALL_STEPS, state, 'error');
    expect(stepCompletion.get('support')).toBe(true);
  });

  it('marks support complete when store systems installed', () => {
    const state = makeEmptyState({ storeSystems: [stubStoreSystem] });
    const { stepCompletion } = calculateStepCompletion(ALL_STEPS, state, 'error');
    expect(stepCompletion.get('support')).toBe(true);
  });

  it('marks weapons complete when weapons installed', () => {
    const state = makeEmptyState({ weapons: [stubWeapon] });
    const { stepCompletion } = calculateStepCompletion(ALL_STEPS, state, 'error');
    expect(stepCompletion.get('weapons')).toBe(true);
  });

  it('marks defenses complete when defenses installed', () => {
    const state = makeEmptyState({ defenses: [stubDefense] });
    const { stepCompletion } = calculateStepCompletion(ALL_STEPS, state, 'error');
    expect(stepCompletion.get('defenses')).toBe(true);
  });

  it('marks sensors complete when sensors installed', () => {
    const state = makeEmptyState({ sensors: [stubSensor] });
    const { stepCompletion } = calculateStepCompletion(ALL_STEPS, state, 'error');
    expect(stepCompletion.get('sensors')).toBe(true);
  });

  it('marks c4 complete when required C4 system installed', () => {
    const state = makeEmptyState({ commandControl: [stubC4Required] });
    const { stepCompletion } = calculateStepCompletion(ALL_STEPS, state, 'error');
    expect(stepCompletion.get('c4')).toBe(true);
  });

  it('does not mark c4 complete with only optional C4 systems', () => {
    const state = makeEmptyState({ commandControl: [stubC4Optional] });
    const { stepCompletion } = calculateStepCompletion(ALL_STEPS, state, 'error');
    expect(stepCompletion.get('c4')).toBe(false);
  });

  it('marks hangars complete when hangar/misc installed', () => {
    const state = makeEmptyState({ hangarMisc: [stubHangarMisc] });
    const { stepCompletion } = calculateStepCompletion(ALL_STEPS, state, 'error');
    expect(stepCompletion.get('hangars')).toBe(true);
  });

  describe('damage step', () => {
    it('returns false when no zones exist', () => {
      const state = makeEmptyState({ powerPlants: [stubPowerPlant] });
      const { stepCompletion } = calculateStepCompletion(ALL_STEPS, state, 'error');
      expect(stepCompletion.get('damage')).toBe(false);
    });

    it('returns false when zones exist but no systems installed', () => {
      const state = makeEmptyState({
        damageDiagramZones: [{ id: 1, name: 'Zone A', systems: [] }] as unknown as WarshipState['damageDiagramZones'],
      });
      const { stepCompletion } = calculateStepCompletion(ALL_STEPS, state, 'error');
      expect(stepCompletion.get('damage')).toBe(false);
    });

    it('returns true when all systems are assigned to zones', () => {
      const state = makeEmptyState({
        powerPlants: [stubPowerPlant],
        sensors: [stubSensor],
        damageDiagramZones: [{
          id: 1, name: 'Zone A',
          systems: [{ id: 1 }, { id: 2 }],
        }] as unknown as WarshipState['damageDiagramZones'],
      });
      const { stepCompletion } = calculateStepCompletion(ALL_STEPS, state, 'error');
      expect(stepCompletion.get('damage')).toBe(true);
    });

    it('returns false when not all systems are assigned', () => {
      const state = makeEmptyState({
        powerPlants: [stubPowerPlant],
        sensors: [stubSensor],
        damageDiagramZones: [{
          id: 1, name: 'Zone A',
          systems: [{ id: 1 }],  // only 1 of 2 assigned
        }] as unknown as WarshipState['damageDiagramZones'],
      });
      const { stepCompletion } = calculateStepCompletion(ALL_STEPS, state, 'error');
      expect(stepCompletion.get('damage')).toBe(false);
    });
  });

  describe('summary step', () => {
    it('returns true when summaryValidationState is valid', () => {
      const { stepCompletion } = calculateStepCompletion(ALL_STEPS, makeEmptyState(), 'valid');
      expect(stepCompletion.get('summary')).toBe(true);
    });

    it('returns false when summaryValidationState is error', () => {
      const { stepCompletion } = calculateStepCompletion(ALL_STEPS, makeEmptyState(), 'error');
      expect(stepCompletion.get('summary')).toBe(false);
    });

    it('returns false when summaryValidationState is warning', () => {
      const { stepCompletion } = calculateStepCompletion(ALL_STEPS, makeEmptyState(), 'warning');
      expect(stepCompletion.get('summary')).toBe(false);
    });
  });

  it('only includes steps present in the step list', () => {
    const subsetSteps: StepDef[] = [
      { id: 'hull', label: 'Hull', required: true },
      { id: 'power', label: 'Power', required: true },
    ];
    const state = makeEmptyState({ hull: stubHull, powerPlants: [stubPowerPlant] });
    const { stepCompletion, completedStepCount } = calculateStepCompletion(subsetSteps, state, 'error');
    expect(completedStepCount).toBe(2);
    expect(stepCompletion.size).toBe(2);
    expect(stepCompletion.has('armor')).toBe(false);
  });

  it('counts completed steps correctly', () => {
    const state = makeEmptyState({
      hull: stubHull,
      powerPlants: [stubPowerPlant],
      engines: [stubEngine],
    });
    const { completedStepCount } = calculateStepCompletion(ALL_STEPS, state, 'error');
    expect(completedStepCount).toBe(3);
  });
});

describe('hasAnyInstalledComponents', () => {
  it('returns false for empty state', () => {
    expect(hasAnyInstalledComponents(makeEmptyState())).toBe(false);
  });

  it('returns true when armor layers exist', () => {
    expect(hasAnyInstalledComponents(makeEmptyState({ armorLayers: [stubArmorLayer] }))).toBe(true);
  });

  it('returns true when power plants exist', () => {
    expect(hasAnyInstalledComponents(makeEmptyState({ powerPlants: [stubPowerPlant] }))).toBe(true);
  });

  it('returns true when engines exist', () => {
    expect(hasAnyInstalledComponents(makeEmptyState({ engines: [stubEngine] }))).toBe(true);
  });

  it('returns true when FTL drive exists', () => {
    expect(hasAnyInstalledComponents(makeEmptyState({ ftlDrive: stubFTL }))).toBe(true);
  });

  it('returns true when weapons exist', () => {
    expect(hasAnyInstalledComponents(makeEmptyState({ weapons: [stubWeapon] }))).toBe(true);
  });

  it('returns true when defenses exist', () => {
    expect(hasAnyInstalledComponents(makeEmptyState({ defenses: [stubDefense] }))).toBe(true);
  });

  it('returns true when sensors exist', () => {
    expect(hasAnyInstalledComponents(makeEmptyState({ sensors: [stubSensor] }))).toBe(true);
  });

  it('returns true when command control exists', () => {
    expect(hasAnyInstalledComponents(makeEmptyState({ commandControl: [stubC4Required] }))).toBe(true);
  });

  it('returns true when hangar/misc exists', () => {
    expect(hasAnyInstalledComponents(makeEmptyState({ hangarMisc: [stubHangarMisc] }))).toBe(true);
  });

  it('returns true when damage zones exist', () => {
    expect(hasAnyInstalledComponents(makeEmptyState({
      damageDiagramZones: [{ id: 1, name: 'Z', systems: [] }] as unknown as WarshipState['damageDiagramZones'],
    }))).toBe(true);
  });

  it('returns false when only hull is set (no components)', () => {
    expect(hasAnyInstalledComponents(makeEmptyState({ hull: stubHull }))).toBe(false);
  });
});
