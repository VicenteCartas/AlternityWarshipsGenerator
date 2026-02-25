import { describe, it, expect } from 'vitest';
import {
  formatCost,
  formatAccuracyModifier,
  formatTargetModifier,
  getTechTrackName,
  getShipClassDisplayName,
  formatAcceleration,
  formatCommandControlCost,
  formatSensorRange,
  formatSensorAccuracyModifier,
  formatAreaEffect,
  getAreaEffectTooltip,
  getDesignTypeDisplayName,
  getStationTypeDisplayName,
  getFriendlyFileName,
  ALL_TECH_TRACK_CODES,
} from './formatters';
import type { AreaEffect } from '../types/weapon';

// ============== formatCost ==============

describe('formatCost', () => {
  it('returns "-" for zero', () => {
    expect(formatCost(0)).toBe('-');
  });

  it('formats values under 1,000 with dollar sign', () => {
    expect(formatCost(500)).toBe('$500');
    expect(formatCost(1)).toBe('$1');
    expect(formatCost(999)).toBe('$999');
  });

  it('formats thousands as K', () => {
    expect(formatCost(1_000)).toBe('$1 K');
    expect(formatCost(5_000)).toBe('$5 K');
    expect(formatCost(350_000)).toBe('$350 K');
  });

  it('formats fractional thousands with one decimal', () => {
    expect(formatCost(1_500)).toBe('$1.5 K');
    expect(formatCost(2_300)).toBe('$2.3 K');
  });

  it('formats millions as M', () => {
    expect(formatCost(1_000_000)).toBe('$1 M');
    expect(formatCost(50_000_000)).toBe('$50 M');
  });

  it('formats fractional millions with one decimal', () => {
    expect(formatCost(1_500_000)).toBe('$1.5 M');
    expect(formatCost(2_700_000)).toBe('$2.7 M');
  });

  it('formats billions as B', () => {
    expect(formatCost(1_000_000_000)).toBe('$1 B');
    expect(formatCost(5_000_000_000)).toBe('$5 B');
  });

  it('formats fractional billions with one decimal', () => {
    expect(formatCost(1_500_000_000)).toBe('$1.5 B');
    expect(formatCost(2_300_000_000)).toBe('$2.3 B');
  });
});

// ============== formatAccuracyModifier ==============

describe('formatAccuracyModifier', () => {
  it('returns "0" for zero', () => {
    expect(formatAccuracyModifier(0)).toBe('0');
  });

  it('returns positive values with plus sign', () => {
    expect(formatAccuracyModifier(3)).toBe('+3');
    expect(formatAccuracyModifier(1)).toBe('+1');
  });

  it('returns negative values with minus sign', () => {
    expect(formatAccuracyModifier(-1)).toBe('-1');
    expect(formatAccuracyModifier(-5)).toBe('-5');
  });
});

// ============== formatTargetModifier ==============

describe('formatTargetModifier', () => {
  it('returns "0" for zero', () => {
    expect(formatTargetModifier(0)).toBe('0');
  });

  it('uses singular "step" for abs(1)', () => {
    expect(formatTargetModifier(1)).toBe('+1 step');
    expect(formatTargetModifier(-1)).toBe('-1 step');
  });

  it('uses plural "steps" for other values', () => {
    expect(formatTargetModifier(2)).toBe('+2 steps');
    expect(formatTargetModifier(-3)).toBe('-3 steps');
  });
});

// ============== getTechTrackName ==============

describe('getTechTrackName', () => {
  it('returns "None" for "-"', () => {
    expect(getTechTrackName('-')).toBe('None');
  });

  it('returns correct names for all tech track codes', () => {
    expect(getTechTrackName('G')).toBe('Gravity Manipulation');
    expect(getTechTrackName('D')).toBe('Dark Matter Tech');
    expect(getTechTrackName('A')).toBe('Antimatter Tech');
    expect(getTechTrackName('M')).toBe('Matter Coding');
    expect(getTechTrackName('F')).toBe('Fusion Tech');
    expect(getTechTrackName('Q')).toBe('Quantum Manipulation');
    expect(getTechTrackName('T')).toBe('Matter Transmission');
    expect(getTechTrackName('S')).toBe('Super-Materials');
    expect(getTechTrackName('P')).toBe('Psi-tech');
    expect(getTechTrackName('X')).toBe('Energy Transformation');
    expect(getTechTrackName('C')).toBe('Computer Tech');
  });
});

// ============== ALL_TECH_TRACK_CODES ==============

describe('ALL_TECH_TRACK_CODES', () => {
  it('contains exactly 11 codes (excludes "-")', () => {
    expect(ALL_TECH_TRACK_CODES).toHaveLength(11);
    expect(ALL_TECH_TRACK_CODES).not.toContain('-');
  });

  it('contains all expected codes', () => {
    expect(ALL_TECH_TRACK_CODES).toEqual(['G', 'D', 'A', 'M', 'F', 'Q', 'T', 'S', 'P', 'X', 'C']);
  });
});

// ============== getShipClassDisplayName ==============

describe('getShipClassDisplayName', () => {
  it('formats all ship classes correctly', () => {
    expect(getShipClassDisplayName('small-craft')).toBe('Small Craft');
    expect(getShipClassDisplayName('light')).toBe('Light Ships');
    expect(getShipClassDisplayName('medium')).toBe('Medium Ships');
    expect(getShipClassDisplayName('heavy')).toBe('Heavy Ships');
    expect(getShipClassDisplayName('super-heavy')).toBe('Super-Heavy Ships');
  });
});

// ============== formatAcceleration ==============

describe('formatAcceleration', () => {
  it('returns "-" for zero', () => {
    expect(formatAcceleration(0, false)).toBe('-');
    expect(formatAcceleration(0, true)).toBe('-');
  });

  it('formats normal acceleration with Mpp suffix', () => {
    expect(formatAcceleration(5, false)).toBe('5 Mpp');
    expect(formatAcceleration(1.5, false)).toBe('1.5 Mpp');
  });

  it('formats PL6 scale with (PL6) suffix', () => {
    expect(formatAcceleration(10, true)).toBe('10 (PL6)');
    expect(formatAcceleration(2.75, true)).toBe('2.75 (PL6)');
  });

  it('caps decimal places at 2, removing trailing zeros', () => {
    expect(formatAcceleration(1.123, false)).toBe('1.12 Mpp');
    expect(formatAcceleration(1.10, false)).toBe('1.1 Mpp');
    expect(formatAcceleration(3.00, false)).toBe('3 Mpp');
  });
});

// ============== formatCommandControlCost ==============

describe('formatCommandControlCost', () => {
  it('formats basic cost when no special properties', () => {
    expect(formatCommandControlCost({
      cost: 100_000,
      costPer: 'flat',
    })).toBe('$100 K');
  });

  it('adds "/station" when maxQuantity > 1', () => {
    expect(formatCommandControlCost({
      cost: 50_000,
      maxQuantity: 4,
      costPer: 'flat',
    })).toBe('$50 K/station');
  });

  it('adds "/HP" for coverage-based systems with costPer systemHp', () => {
    expect(formatCommandControlCost({
      cost: 10_000,
      costPer: 'systemHp',
      coveragePerHullPoint: 5,
    })).toBe('$10 K/HP');
  });

  it('adds "/weapon HP" for weapon-linked systems', () => {
    expect(formatCommandControlCost({
      cost: 5_000,
      costPer: 'linkedHp',
      linkedSystemType: 'weapon',
    })).toBe('$5 K/weapon HP');
  });

  it('adds "/sensor HP" for sensor-linked systems', () => {
    expect(formatCommandControlCost({
      cost: 5_000,
      costPer: 'linkedHp',
      linkedSystemType: 'sensor',
    })).toBe('$5 K/sensor HP');
  });
});

// ============== formatSensorRange ==============

describe('formatSensorRange', () => {
  it('formats standard short/medium/long ranges', () => {
    expect(formatSensorRange({
      rangeShort: 5,
      rangeMedium: 10,
      rangeLong: 20,
    })).toBe('5/10/20 Mm');
  });

  it('returns special range text when present', () => {
    expect(formatSensorRange({
      rangeShort: 0,
      rangeMedium: 0,
      rangeLong: 0,
      rangeSpecial: 'Ship only',
    })).toBe('Ship only');
  });
});

// ============== formatSensorAccuracyModifier ==============

describe('formatSensorAccuracyModifier', () => {
  it('returns "Normal" for zero', () => {
    expect(formatSensorAccuracyModifier(0)).toBe('Normal');
  });

  it('formats positive values as penalty', () => {
    expect(formatSensorAccuracyModifier(1)).toBe('+1 step penalty');
    expect(formatSensorAccuracyModifier(2)).toBe('+2 steps penalty');
  });

  it('formats negative values as bonus', () => {
    expect(formatSensorAccuracyModifier(-1)).toBe('-1 step bonus');
    expect(formatSensorAccuracyModifier(-2)).toBe('-2 steps bonus');
  });
});

// ============== formatAreaEffect ==============

describe('formatAreaEffect', () => {
  it('returns "-" for undefined', () => {
    expect(formatAreaEffect(undefined)).toBe('-');
  });

  it('formats area effect ranges', () => {
    const area: AreaEffect = {
      rangeAmazing: '200m',
      rangeGood: '300m',
      rangeOrdinary: '400m',
    };
    expect(formatAreaEffect(area)).toBe('200m/300m/400m');
  });

  it('appends notes in parentheses when present', () => {
    const area: AreaEffect = {
      rangeAmazing: '200m',
      rangeGood: '300m',
      rangeOrdinary: '400m',
      notes: 'TA',
    };
    expect(formatAreaEffect(area)).toBe('200m/300m/400m (TA)');
  });
});

// ============== getAreaEffectTooltip ==============

describe('getAreaEffectTooltip', () => {
  it('returns empty string for undefined', () => {
    expect(getAreaEffectTooltip(undefined)).toBe('');
  });

  it('returns formatted tooltip without notes', () => {
    const area: AreaEffect = {
      rangeAmazing: '200m',
      rangeGood: '300m',
      rangeOrdinary: '400m',
    };
    const result = getAreaEffectTooltip(area);
    expect(result).toContain('Area Effect:');
    expect(result).toContain('Amazing: 200m');
    expect(result).toContain('Good: 300m');
    expect(result).toContain('Ordinary: 400m');
    expect(result).not.toContain('Notes:');
  });

  it('includes notes line when present', () => {
    const area: AreaEffect = {
      rangeAmazing: '200m',
      rangeGood: '300m',
      rangeOrdinary: '400m',
      notes: 'SA',
    };
    const result = getAreaEffectTooltip(area);
    expect(result).toContain('Notes: SA');
  });
});

// ============== getDesignTypeDisplayName ==============

describe('getDesignTypeDisplayName', () => {
  it('returns "Warship" for warship', () => {
    expect(getDesignTypeDisplayName('warship')).toBe('Warship');
  });

  it('returns "Station" for station', () => {
    expect(getDesignTypeDisplayName('station')).toBe('Station');
  });
});

// ============== getStationTypeDisplayName ==============

describe('getStationTypeDisplayName', () => {
  it('returns correct display names', () => {
    expect(getStationTypeDisplayName('ground-base')).toBe('Ground Base');
    expect(getStationTypeDisplayName('outpost')).toBe('Outpost');
    expect(getStationTypeDisplayName('space-station')).toBe('Space Station');
  });
});

// ============== getFriendlyFileName ==============

describe('getFriendlyFileName', () => {
  it('returns mapped friendly names for known files', () => {
    expect(getFriendlyFileName('hulls.json')).toBe('Hulls');
    expect(getFriendlyFileName('armor.json')).toBe('Armor');
    expect(getFriendlyFileName('powerPlants.json')).toBe('Power Plants');
    expect(getFriendlyFileName('engines.json')).toBe('Engines');
    expect(getFriendlyFileName('fuelTank.json')).toBe('Fuel Tank');
    expect(getFriendlyFileName('ftlDrives.json')).toBe('FTL Drives');
    expect(getFriendlyFileName('supportSystems.json')).toBe('Support Systems');
    expect(getFriendlyFileName('weapons.json')).toBe('Weapons');
    expect(getFriendlyFileName('ordnance.json')).toBe('Ordnance');
    expect(getFriendlyFileName('defenses.json')).toBe('Defenses');
    expect(getFriendlyFileName('sensors.json')).toBe('Sensors');
    expect(getFriendlyFileName('commandControl.json')).toBe('Command & Control');
    expect(getFriendlyFileName('hangarMisc.json')).toBe('Hangars & Misc');
    expect(getFriendlyFileName('damageDiagram.json')).toBe('Damage Diagram');
  });

  it('strips .json extension for unknown files', () => {
    expect(getFriendlyFileName('custom.json')).toBe('custom');
    expect(getFriendlyFileName('unknown.json')).toBe('unknown');
  });
});
