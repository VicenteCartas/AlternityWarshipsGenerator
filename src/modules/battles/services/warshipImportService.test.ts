import { describe, it, expect } from 'vitest';
import { deriveCombatProfile, createStackFromWarshipProfile } from './warshipImportService';
import type { BattleRules } from '../types/battle';
import type { WarshipSaveFile } from '@warships/types/saveFile';
import rulesJson from '../data/battleRules.json';

const rules = rulesJson as BattleRules;

/** Minimal but valid design save file. */
function design(overrides: Partial<WarshipSaveFile> = {}): WarshipSaveFile {
  return {
    version: '1.2',
    name: 'Test Design',
    createdAt: '2026-01-01T00:00:00.000Z',
    modifiedAt: '2026-01-01T00:00:00.000Z',
    hull: { id: 'heavy-cruiser' },
    armor: null,
    designProgressLevel: 6,
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

/** `count` standard-mount lasers, 1 hull point each. */
function lasers(count: number) {
  return [{
    id: 'w1',
    typeId: 'laser',
    category: 'beam' as const,
    mountType: 'standard',
    gunConfiguration: 'single',
    concealed: false,
    quantity: count,
    arcs: ['forward'],
  }];
}

describe('deriveCombatProfile', () => {
  it('returns null when the design has no hull', () => {
    expect(deriveCombatProfile(design({ hull: null }), rules)).toBeNull();
  });

  it('reads the hull size from the design', () => {
    // heavy-cruiser: 400 hull points + 80 bonus
    const profile = deriveCombatProfile(design(), rules)!;
    expect(profile.totalHullPoints).toBe(480);
    expect(profile.hullName).toBe('Heavy Cruiser');
    expect(profile.name).toBe('Test Design');
  });

  it('rates an unarmed design at the firepower floor', () => {
    const profile = deriveCombatProfile(design(), rules)!;
    expect(profile.combatShare).toBe(0);
    expect(profile.firepowerFactor).toBe(rules.warshipImport.minFirepowerFactor);
    expect(profile.combatStrength).toBe(Math.round(480 * 0.05));
    expect(profile.warnings.some((w) => w.includes('no weapons or defenses'))).toBe(true);
  });

  it('lands near the hull size when a quarter of the hull is weaponry', () => {
    // 120 of 480 hull points = the reference 25% share, so the factor is 1.
    const profile = deriveCombatProfile(design({ weapons: lasers(120) }), rules)!;
    expect(profile.weaponHullPoints).toBe(120);
    expect(profile.combatShare).toBeCloseTo(0.25);
    expect(profile.firepowerFactor).toBeCloseTo(1);
    expect(profile.combatStrength).toBe(480);
    expect(profile.warnings).toHaveLength(0);
  });

  it('scales below the hull size for a lightly armed design', () => {
    const profile = deriveCombatProfile(design({ weapons: lasers(60) }), rules)!;
    expect(profile.firepowerFactor).toBeCloseTo(0.5);
    expect(profile.combatStrength).toBe(240);
  });

  it('caps the firepower factor for an overwhelmingly armed design', () => {
    const profile = deriveCombatProfile(design({ weapons: lasers(400) }), rules)!;
    expect(profile.firepowerFactor).toBe(rules.warshipImport.maxFirepowerFactor);
    expect(profile.combatStrength).toBe(480 * rules.warshipImport.maxFirepowerFactor);
  });

  it('never drops below a combat strength of 1', () => {
    const profile = deriveCombatProfile(design({ hull: { id: 'fighter' } }), rules)!;
    expect(profile.totalHullPoints).toBe(10);
    expect(profile.combatStrength).toBeGreaterThanOrEqual(1);
  });

  it('raises the strength of an armored design', () => {
    const bare = deriveCombatProfile(design({ weapons: lasers(120) }), rules)!;
    const armored = deriveCombatProfile(
      design({ weapons: lasers(120), armorLayers: [{ id: 'cerametal-medium' }] }),
      rules,
    )!;
    expect(armored.armorHullPoints).toBeGreaterThan(0);
    expect(armored.armorFactor).toBeGreaterThan(1);
    expect(armored.combatStrength).toBeGreaterThan(bare.combatStrength);
  });
});

describe('createStackFromWarshipProfile', () => {
  it('builds a space stack that can bombard at the standard factor', () => {
    const profile = deriveCombatProfile(design({ weapons: lasers(120) }), rules)!;
    const stack = createStackFromWarshipProfile({
      profile,
      combatStrength: profile.combatStrength,
      quantity: 3,
      theatreId: 'sp',
      rules,
    });
    expect(stack.source).toBe('warshipDesign');
    expect(stack.domain).toBe('space');
    expect(stack.combatStrengthPerUnit).toBe(480);
    expect(stack.currentStrength).toBe(1440);
    expect(stack.crossDomainFactor).toBe(rules.crossDomain.shipBombardmentFactor);
    expect(stack.notes).toContain('Heavy Cruiser');
  });

  it('honours a combat strength the Gamemaster overrode', () => {
    const profile = deriveCombatProfile(design({ weapons: lasers(120) }), rules)!;
    const stack = createStackFromWarshipProfile({
      profile, combatStrength: 250, quantity: 1, theatreId: 'sp', rules,
    });
    expect(stack.combatStrengthPerUnit).toBe(250);
  });
});
