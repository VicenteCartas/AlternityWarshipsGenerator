import type { ShipClass } from '../types/hull';
import type { TechTrack, DesignType, StationType, ProgressLevel } from '../types/common';
import type { AreaEffect } from '../types/weapon';

/**
 * Shared formatting utility functions
 */

/**
 * All available tech track codes for iteration
 */
export const ALL_TECH_TRACK_CODES: TechTrack[] = ['G', 'D', 'A', 'M', 'F', 'Q', 'T', 'S', 'P', 'X', 'C'];

/**
 * Format a cost number for display
 * @param cost - Cost in credits
 * @returns Formatted string like "$350 K", "$1.5 M", "$2 B"
 */
export function formatCost(cost: number): string {
  if (cost === 0) {
    return '-';
  }
  if (cost >= 1_000_000_000) {
    const value = cost / 1_000_000_000;
    // Use decimal only if needed
    return value % 1 === 0 ? `$${value} B` : `$${value.toFixed(1)} B`;
  } else if (cost >= 1_000_000) {
    const value = cost / 1_000_000;
    return value % 1 === 0 ? `$${value} M` : `$${value.toFixed(1)} M`;
  } else if (cost >= 1_000) {
    const value = cost / 1_000;
    return value % 1 === 0 ? `$${value} K` : `$${value.toFixed(1)} K`;
  }
  return `$${cost}`;
}

/**
 * Format accuracy modifier number as display string (for weapons)
 * @param modifier - The accuracy modifier value (positive = easier to hit, negative = harder)
 * @returns Formatted string like "+3", "-1", "0"
 */
export function formatAccuracyModifier(modifier: number): string {
  if (modifier === 0) {
    return '0';
  }
  const sign = modifier > 0 ? '+' : '';
  return `${sign}${modifier}`;
}

/**
 * Format target modifier number as display string (for hulls - enemy's difficulty to hit)
 * @param modifier - The target modifier value (positive = easier to hit, negative = harder)
 * @returns Formatted string like "+3 steps", "-1 step", "0"
 */
export function formatTargetModifier(modifier: number): string {
  if (modifier === 0) {
    return '0';
  }
  const sign = modifier > 0 ? '+' : '';
  const stepWord = Math.abs(modifier) === 1 ? 'step' : 'steps';
  return `${sign}${modifier} ${stepWord}`;
}

/**
 * Get tech track display name
 */
export function getTechTrackName(track: TechTrack): string {
  const names: Record<TechTrack, string> = {
    '-': 'None',
    'G': 'Gravity Manipulation',
    'D': 'Dark Matter Tech',
    'A': 'Antimatter Tech',
    'M': 'Matter Coding',
    'F': 'Fusion Tech',
    'Q': 'Quantum Manipulation',
    'T': 'Matter Transmission',
    'S': 'Super-Materials',
    'P': 'Psi-tech',
    'X': 'Energy Transformation',
    'C': 'Computer Tech',
  };
  return names[track];
}

/**
 * Get display name for a ship class
 */
export function getShipClassDisplayName(shipClass: ShipClass): string {
  const names: Record<ShipClass, string> = {
    'small-craft': 'Small Craft',
    light: 'Light Ships',
    medium: 'Medium Ships',
    heavy: 'Heavy Ships',
    'super-heavy': 'Super-Heavy Ships',
  };
  return names[shipClass];
}

/**
 * Format acceleration for display
 */
export function formatAcceleration(acceleration: number, usesPL6Scale: boolean): string {
  if (acceleration === 0) return '-';
  // Cap at 2 decimal places, removing trailing zeros
  const formatted = Number(acceleration.toFixed(2)).toString();
  if (usesPL6Scale) {
    return `${formatted} (PL6)`;
  }
  return `${formatted} Mpp`;
}

/**
 * Format command control system cost for table display
 * Shows unit cost with indicator for per-station, per-HP, or per-linked-system costs
 */
export function formatCommandControlCost(system: {
  cost: number;
  maxQuantity?: number;
  costPer: string;
  coveragePerHullPoint?: number;
  linkedSystemType?: 'weapon' | 'sensor';
}): string {
  const baseCost = formatCost(system.cost);
  
  // Cockpit and similar per-station systems
  if (system.maxQuantity && system.maxQuantity > 1) {
    return `${baseCost}/station`;
  }
  
  // Coverage-based systems with costPer systemHp - cost per HP of the system itself
  if (system.coveragePerHullPoint && system.costPer === 'systemHp') {
    return `${baseCost}/HP`;
  }
  
  // Linked systems - cost per HP of the linked weapon/sensor
  if (system.linkedSystemType) {
    return `${baseCost}/${system.linkedSystemType} HP`;
  }
  
  return baseCost;
}

/**
 * Format sensor range for display
 * Shows short/medium/long ranges in Mm, or special range text
 */
export function formatSensorRange(sensor: {
  rangeShort: number;
  rangeMedium: number;
  rangeLong: number;
  rangeSpecial?: string;
}): string {
  if (sensor.rangeSpecial) {
    return sensor.rangeSpecial;
  }
  return `${sensor.rangeShort}/${sensor.rangeMedium}/${sensor.rangeLong} Mm`;
}

/**
 * Format step modifier for display (for sensors)
 * @param modifier - The accuracy modifier (positive = penalty, negative = bonus)
 * @returns Formatted string like "+2 step penalty", "-1 step bonus", "Normal"
 */
export function formatSensorAccuracyModifier(modifier: number): string {
  if (modifier === 0) {
    return 'Normal';
  }
  const stepWord = Math.abs(modifier) === 1 ? 'step' : 'steps';
  if (modifier > 0) {
    return `+${modifier} ${stepWord} penalty`;
  }
  return `${modifier} ${stepWord} bonus`;
}

/**
 * Format area effect for display
 * @param area - The area effect object (optional)
 * @returns Formatted string like "200m/300m/400m (TA)" or "-" if no area
 */
export function formatAreaEffect(area?: AreaEffect): string {
  if (!area) {
    return '-';
  }
  const ranges = `${area.rangeAmazing}/${area.rangeGood}/${area.rangeOrdinary}`;
  if (area.notes) {
    return `${ranges} (${area.notes})`;
  }
  return ranges;
}

/**
 * Get area effect tooltip text
 * @param area - The area effect object (optional)
 * @returns Detailed tooltip text or empty string
 */
export function getAreaEffectTooltip(area?: AreaEffect): string {
  if (!area) {
    return '';
  }
  let tooltip = `Area Effect:\nAmazing: ${area.rangeAmazing}\nGood: ${area.rangeGood}\nOrdinary: ${area.rangeOrdinary}`;
  if (area.notes) {
    tooltip += `\nNotes: ${area.notes}`;
  }
  return tooltip;
}

/**
 * Get display name for a design type
 */
export function getDesignTypeDisplayName(designType: DesignType): string {
  switch (designType) {
    case 'warship': return 'Warship';
    case 'station': return 'Station';
    default: return designType;
  }
}

/**
 * Get display name for a station type
 */
export function getStationTypeDisplayName(stationType: StationType): string {
  switch (stationType) {
    case 'ground-base': return 'Ground Base';
    case 'outpost': return 'Outpost';
    case 'space-station': return 'Space Station';
    default: return stationType;
  }
}

/**
 * Map of data file names to user-friendly display names.
 */
const FRIENDLY_FILE_NAMES: Record<string, string> = {
  'hulls.json': 'Hulls',
  'armor.json': 'Armor',
  'powerPlants.json': 'Power Plants',
  'engines.json': 'Engines',
  'fuelTank.json': 'Fuel Tank',
  'ftlDrives.json': 'FTL Drives',
  'supportSystems.json': 'Support Systems',
  'weapons.json': 'Weapons',
  'ordnance.json': 'Ordnance',
  'defenses.json': 'Defenses',
  'sensors.json': 'Sensors',
  'commandControl.json': 'Command & Control',
  'hangarMisc.json': 'Hangars & Misc',
  'damageDiagram.json': 'Damage Diagram',
};

/**
 * Get a user-friendly display name for a data file.
 */
export function getFriendlyFileName(fileName: string): string {
  return FRIENDLY_FILE_NAMES[fileName] ?? fileName.replace('.json', '');
}

/**
 * Format FTL rating for display
 */
export function formatFTLRating(rating: number | null, unit: string): string {
  if (rating === null) return 'Variable';
  // Round to 1 decimal place if needed
  const displayRating = Number.isInteger(rating) ? rating : rating.toFixed(1);
  return `${displayRating} ${unit}`;
}

/**
 * Progress level display names
 */
export const PL_NAMES: Record<ProgressLevel, string> = {
  6: 'PL6 - Fusion Age',
  7: 'PL7 - Gravity Age',
  8: 'PL8 - Energy Age',
  9: 'PL9 - Matter Age',
};
