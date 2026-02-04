import type { ProgressLevel, TechTrack, Firepower } from '../types/common';
import { FIREPOWER_ORDER } from '../types/common';
import type { ShipClass } from '../types/hull';
import { generateId, filterByDesignConstraints as filterByConstraints } from './utilities';
import type {
  BeamWeaponType,
  ProjectileWeaponType,
  TorpedoWeaponType,
  SpecialWeaponType,
  WeaponType,
  InstalledWeapon,
  WeaponStats,
  MountType,
  GunConfiguration,
  WeaponCategory,
  FiringArc,
  StandardArc,
  ZeroArc,
  MountModifier,
  GunConfigModifier,
} from '../types/weapon';
import { ALL_ZERO_ARCS } from '../types/weapon';
import {
  getBeamWeaponsData,
  getProjectileWeaponsData,
  getTorpedoWeaponsData,
  getSpecialWeaponsData,
  getMountModifiersData,
  getGunConfigurationsData,
} from './dataLoader';

let beamWeapons: BeamWeaponType[] | null = null;
let projectileWeapons: ProjectileWeaponType[] | null = null;
let torpedoWeapons: TorpedoWeaponType[] | null = null;
let specialWeapons: SpecialWeaponType[] | null = null;
let mountModifiers: Record<MountType, MountModifier> | null = null;
let gunConfigurations: Record<GunConfiguration, GunConfigModifier> | null = null;

/**
 * Weapons data type for initialization
 */
interface WeaponsDataInput {
  beamWeapons: BeamWeaponType[];
  projectileWeapons?: ProjectileWeaponType[];
  torpedoWeapons?: TorpedoWeaponType[];
  specialWeapons?: SpecialWeaponType[];
  mountModifiers?: Record<MountType, MountModifier>;
  gunConfigurations?: Record<GunConfiguration, GunConfigModifier>;
}

/**
 * Initialize weapons data from JSON (called by dataLoader)
 */
export function initializeWeaponsData(data: WeaponsDataInput): void {
  beamWeapons = data.beamWeapons;
  projectileWeapons = data.projectileWeapons || [];
  torpedoWeapons = data.torpedoWeapons || [];
  specialWeapons = data.specialWeapons || [];
  mountModifiers = data.mountModifiers || null;
  gunConfigurations = data.gunConfigurations || null;
}

/**
 * Get all beam weapon types
 */
export function getAllBeamWeaponTypes(): BeamWeaponType[] {
  // Use cached data if initialized, otherwise get from dataLoader
  return beamWeapons || getBeamWeaponsData();
}

/**
 * Get all projectile weapon types
 */
export function getAllProjectileWeaponTypes(): ProjectileWeaponType[] {
  return projectileWeapons || getProjectileWeaponsData();
}

/**
 * Get all torpedo weapon types
 */
export function getAllTorpedoWeaponTypes(): TorpedoWeaponType[] {
  return torpedoWeapons || getTorpedoWeaponsData();
}

/**
 * Get all special weapon types
 */
export function getAllSpecialWeaponTypes(): SpecialWeaponType[] {
  return specialWeapons || getSpecialWeaponsData();
}

/**
 * Filter weapon types by design constraints (Progress Level and Tech Tracks)
 * Re-exported from utilities for backwards compatibility
 */
export function filterByDesignConstraints<T extends WeaponType>(
  weapons: T[],
  designPL: ProgressLevel,
  designTechTracks: TechTrack[]
): T[] {
  return filterByConstraints(weapons, designPL, designTechTracks, false);
}

/**
 * Sort weapons by Progress Level, Firepower, Accuracy, Range, HP, Power, Cost
 * This provides a consistent ordering for weapon tables
 */
export function sortWeapons<T extends WeaponType>(weapons: T[]): T[] {
  return [...weapons].sort((a, b) => {
    // Sort by PL first
    if (a.progressLevel !== b.progressLevel) return a.progressLevel - b.progressLevel;
    // Then by Firepower (using order: S, A, B, C, D, E, F, G)
    const fpA = FIREPOWER_ORDER[a.firepower as Firepower] ?? 99;
    const fpB = FIREPOWER_ORDER[b.firepower as Firepower] ?? 99;
    if (fpA !== fpB) return fpA - fpB;
    // Then by Accuracy (negative to positive, so lower/better first)
    if (a.accuracyModifier !== b.accuracyModifier) return a.accuracyModifier - b.accuracyModifier;
    // Then by ranges (short, medium, long)
    if (a.rangeShort !== b.rangeShort) return a.rangeShort - b.rangeShort;
    if (a.rangeMedium !== b.rangeMedium) return a.rangeMedium - b.rangeMedium;
    if (a.rangeLong !== b.rangeLong) return a.rangeLong - b.rangeLong;
    // Then by HP
    if (a.hullPoints !== b.hullPoints) return a.hullPoints - b.hullPoints;
    // Then by Power
    if (a.powerRequired !== b.powerRequired) return a.powerRequired - b.powerRequired;
    // Finally by Cost
    return a.cost - b.cost;
  });
}

/**
 * Check if a mount type is available for a weapon
 */
export function isMountTypeAvailable(
  weapon: WeaponType,
  mountType: MountType,
  category: WeaponCategory
): boolean {
  // Bank mounts are only available for PL8+ beam weapons
  if (mountType === 'bank') {
    if (category !== 'beam') return false;
    if (weapon.progressLevel < 8) return false;
  }
  
  return true;
}

/**
 * Get mount type modifiers
 * Per Warships rules:
 * - Turret: +25% to both HP and cost per gun
 * - Sponson: +25% cost only, no HP increase
 * - Bank: +25% cost only, no HP increase
 * - Fixed: -25% to both HP and cost
 */
export function getMountModifiers(mountType: MountType): MountModifier {
  // Fallback defaults in case JSON not loaded
  const defaults: Record<MountType, MountModifier> = {
    standard: { costMultiplier: 1, hpMultiplier: 1 },
    fixed: { costMultiplier: 0.75, hpMultiplier: 0.75 },
    turret: { costMultiplier: 1.25, hpMultiplier: 1.25 },
    sponson: { costMultiplier: 1.25, hpMultiplier: 1 },
    bank: { costMultiplier: 1.25, hpMultiplier: 1 },
  };
  // Try cache first, then dataLoader, then hardcoded defaults
  const modifiers = mountModifiers || getMountModifiersData();
  return modifiers?.[mountType] || defaults[mountType];
}

/**
 * Get gun configuration modifiers
 * Per Warships rules: "Twin Mounts require 1.5 times the space and cost of a single weapon"
 * "Triple Mounts require twice the space and money of a single weapon"
 * Power is NOT affected - it scales with actual gun count.
 * These multipliers represent how many "effective guns" you pay for in HP/cost.
 */
export function getGunConfigurationModifiers(config: GunConfiguration): GunConfigModifier {
  // Fallback defaults in case JSON not loaded
  const defaults: Record<GunConfiguration, GunConfigModifier> = {
    single: { effectiveGunCount: 1, actualGunCount: 1 },
    twin: { effectiveGunCount: 1.5, actualGunCount: 2 },
    triple: { effectiveGunCount: 2, actualGunCount: 3 },
    quadruple: { effectiveGunCount: 2.5, actualGunCount: 4 },
  };
  // Try cache first, then dataLoader, then hardcoded defaults
  const configs = gunConfigurations || getGunConfigurationsData();
  return configs?.[config] || defaults[config];
}

/**
 * Generate unique ID for an installed weapon
 */
export function generateWeaponId(): string {
  return generateId('weapon');
}

/**
 * Calculate hull points for a weapon installation
 * Formula: (baseHP × mountMultiplier) × effectiveGunCount × concealmentMultiplier
 * Per Warships rules: mount modifier applies per gun, then gun config determines effective count
 */
export function calculateWeaponHullPoints(
  weapon: WeaponType,
  mountType: MountType,
  gunConfig: GunConfiguration,
  concealed: boolean
): number {
  const mountMod = getMountModifiers(mountType);
  const gunMod = getGunConfigurationModifiers(gunConfig);
  
  // HP per gun with mount modifier
  const hpPerGun = weapon.hullPoints * mountMod.hpMultiplier;
  
  // Total HP = HP per gun × effective gun count (e.g., triple = 2)
  let totalHp = hpPerGun * gunMod.effectiveGunCount;
  
  if (concealed) {
    totalHp *= 1.5; // Concealment multiplier
  }
  
  return Math.ceil(totalHp);
}

/**
 * Calculate power required for a weapon installation
 * Power scales with ACTUAL gun count (not effective count)
 * Power is NOT affected by mount type or concealment
 */
export function calculateWeaponPower(weapon: WeaponType, gunConfig: GunConfiguration): number {
  const gunMod = getGunConfigurationModifiers(gunConfig);
  return weapon.powerRequired * gunMod.actualGunCount;
}

/**
 * Calculate cost for a weapon installation
 * Formula: (baseCost × mountMultiplier) × effectiveGunCount × concealmentMultiplier
 * Per Warships rules: mount modifier applies per gun, then gun config determines effective count
 */
export function calculateWeaponCost(
  weapon: WeaponType,
  mountType: MountType,
  gunConfig: GunConfiguration,
  concealed: boolean
): number {
  const mountMod = getMountModifiers(mountType);
  const gunMod = getGunConfigurationModifiers(gunConfig);
  
  // Cost per gun with mount modifier
  const costPerGun = weapon.cost * mountMod.costMultiplier;
  
  // Total cost = cost per gun × effective gun count (e.g., triple = 2)
  let totalCost = costPerGun * gunMod.effectiveGunCount;
  
  if (concealed) {
    totalCost *= 1.5; // Concealment multiplier
  }
  
  return Math.ceil(totalCost);
}

/**
 * Create an installed weapon from a weapon type
 */
export function createInstalledWeapon(
  weapon: WeaponType,
  category: WeaponCategory,
  mountType: MountType,
  gunConfig: GunConfiguration,
  concealed: boolean,
  quantity: number = 1,
  arcs: FiringArc[] = ['forward']
): InstalledWeapon {
  return {
    id: generateWeaponId(),
    weaponType: weapon,
    category,
    mountType,
    gunConfiguration: gunConfig,
    concealed,
    quantity,
    arcs,
    hullPoints: calculateWeaponHullPoints(weapon, mountType, gunConfig, concealed),
    powerRequired: calculateWeaponPower(weapon, gunConfig),
    cost: calculateWeaponCost(weapon, mountType, gunConfig, concealed),
  };
}

/**
 * Update an installed weapon with new configuration
 */
export function updateInstalledWeapon(
  installed: InstalledWeapon,
  mountType: MountType,
  gunConfig: GunConfiguration,
  concealed: boolean,
  quantity: number = 1,
  arcs: FiringArc[] = installed.arcs
): InstalledWeapon {
  return {
    ...installed,
    mountType,
    gunConfiguration: gunConfig,
    concealed,
    quantity,
    arcs,
    hullPoints: calculateWeaponHullPoints(installed.weaponType, mountType, gunConfig, concealed),
    powerRequired: calculateWeaponPower(installed.weaponType, gunConfig),
    cost: calculateWeaponCost(installed.weaponType, mountType, gunConfig, concealed),
  };
}

/**
 * Calculate total weapon stats from all installed weapons
 */
export function calculateWeaponStats(weapons: InstalledWeapon[]): WeaponStats {
  return weapons.reduce(
    (stats, weapon) => ({
      totalHullPoints: stats.totalHullPoints + (weapon.hullPoints * weapon.quantity),
      totalPowerRequired: stats.totalPowerRequired + (weapon.powerRequired * weapon.quantity),
      totalCost: stats.totalCost + (weapon.cost * weapon.quantity),
      beamCount: stats.beamCount + (weapon.category === 'beam' ? weapon.quantity : 0),
      projectileCount: stats.projectileCount + (weapon.category === 'projectile' ? weapon.quantity : 0),
      torpedoCount: stats.torpedoCount + (weapon.category === 'torpedo' ? weapon.quantity : 0),
      specialCount: stats.specialCount + (weapon.category === 'special' ? weapon.quantity : 0),
      ordnanceCount: stats.ordnanceCount + (weapon.category === 'ordnance' ? weapon.quantity : 0),
    }),
    {
      totalHullPoints: 0,
      totalPowerRequired: 0,
      totalCost: 0,
      beamCount: 0,
      projectileCount: 0,
      torpedoCount: 0,
      specialCount: 0,
      ordnanceCount: 0,
    }
  );
}

/**
 * Check if bank mount is available for a weapon
 * Bank mounts are only available for PL8+ beam weapons
 */
export function isBankMountAvailable(weapon: WeaponType, category: WeaponCategory): boolean {
  return category === 'beam' && weapon.progressLevel >= 8;
}

/**
 * Get mount type display name
 */
export function getMountTypeName(mountType: MountType): string {
  const names: Record<MountType, string> = {
    standard: 'Standard',
    fixed: 'Fixed',
    turret: 'Turret',
    sponson: 'Sponson',
    bank: 'Bank',
  };
  return names[mountType];
}

/**
 * Get gun configuration display name
 */
export function getGunConfigurationName(config: GunConfiguration): string {
  const names: Record<GunConfiguration, string> = {
    single: 'Single',
    twin: 'Twin',
    triple: 'Triple',
    quadruple: 'Quadruple',
  };
  return names[config];
}

// ============== Firing Arc Functions ==============

/**
 * Get the number of free arcs based on mount type and ship class
 * Rules:
 * - Fixed: 1 arc only (no zero arc)
 * - Standard on light+: 1 zero arc + 1 standard arc
 * - Sponson on light+: 1 zero arc + 2 standard arcs
 * - Turret/Bank on light+: 1 zero arc + 3 standard arcs
 * - Small craft: all zero arcs free + normal mount arcs
 */
export function getFreeArcCount(mountType: MountType, shipClass: ShipClass): { zeroArcs: number; standardArcs: number } {
  const isSmallCraft = shipClass === 'small-craft';
  
  if (mountType === 'fixed') {
    // Fixed mounts only have 1 arc, no zero arc option
    return { zeroArcs: 0, standardArcs: 1 };
  }
  
  if (isSmallCraft) {
    // Small craft get all zero arcs for free
    // Plus their normal mount arcs
    if (mountType === 'turret' || mountType === 'bank') {
      return { zeroArcs: 4, standardArcs: 3 }; // All zero + 3 standard
    } else if (mountType === 'sponson') {
      return { zeroArcs: 4, standardArcs: 2 }; // All zero + 2 standard
    } else {
      return { zeroArcs: 4, standardArcs: 1 }; // All zero + 1 standard
    }
  }
  
  // Light or larger ships
  if (mountType === 'turret' || mountType === 'bank') {
    return { zeroArcs: 1, standardArcs: 3 }; // 1 zero + 3 standard
  } else if (mountType === 'sponson') {
    return { zeroArcs: 1, standardArcs: 2 }; // 1 zero + 2 standard
  } else {
    // standard
    return { zeroArcs: 1, standardArcs: 1 }; // 1 zero + 1 standard
  }
}

/**
 * Check if a weapon can use zero arcs
 * Only Small (S), Light (L), and Good (Gd) firepower weapons can bear on zero arcs
 */
export function canUseZeroArcs(weapon: WeaponType): boolean {
  return weapon.firepower === 'S' || weapon.firepower === 'L' || weapon.firepower === 'Gd';
}

/**
 * Get the default arcs for a weapon based on mount type and ship class
 */
export function getDefaultArcs(
  mountType: MountType,
  shipClass: ShipClass,
  canUseZero: boolean
): FiringArc[] {
  const arcs: FiringArc[] = [];
  const isSmallCraft = shipClass === 'small-craft';
  
  if (mountType === 'fixed') {
    // Fixed mount: only forward arc
    return ['forward'];
  }
  
  if (isSmallCraft && canUseZero) {
    // Small craft get all zero arcs free
    arcs.push(...ALL_ZERO_ARCS);
  } else if (canUseZero) {
    // Light+ ships: default to zero-forward
    arcs.push('zero-forward');
  }
  
  // Add default standard arc
  arcs.push('forward');
  
  // Sponsons get 2 standard arcs
  if (mountType === 'sponson') {
    arcs.push('starboard');
  }
  
  // Turrets get 3 standard arcs
  if (mountType === 'turret') {
    arcs.push('starboard', 'port');
  }
  
  return arcs;
}

/**
 * Validate arc selection
 * Returns error message if invalid, empty string if valid
 */
export function validateArcs(
  arcs: FiringArc[],
  mountType: MountType,
  shipClass: ShipClass,
  canUseZero: boolean
): string {
  if (arcs.length === 0) {
    return 'At least one arc must be selected';
  }
  
  const zeroArcs = arcs.filter(a => a.startsWith('zero-')) as ZeroArc[];
  const standardArcs = arcs.filter(a => !a.startsWith('zero-')) as StandardArc[];
  
  const freeArcs = getFreeArcCount(mountType, shipClass);
  
  // Check zero arc restrictions
  if (zeroArcs.length > 0 && !canUseZero) {
    return 'Only Small and Light firepower weapons can use zero arcs';
  }
  
  // Fixed mounts can only have 1 standard arc
  if (mountType === 'fixed') {
    if (standardArcs.length !== 1) {
      return 'Fixed mounts must have exactly 1 arc';
    }
    if (zeroArcs.length > 0) {
      return 'Fixed mounts cannot use zero arcs';
    }
    return '';
  }
  
  // Validate against free arc limits
  // Small craft get all zero arcs for free
  const isSmallCraft = shipClass === 'small-craft';
  const maxFreeZeroArcs = canUseZero ? freeArcs.zeroArcs : 0;
  const maxFreeStandardArcs = freeArcs.standardArcs;
  
  if (!isSmallCraft && zeroArcs.length > maxFreeZeroArcs) {
    return `Maximum ${maxFreeZeroArcs} zero arc(s) allowed for this mount type`;
  }
  
  if (standardArcs.length > maxFreeStandardArcs) {
    return `Maximum ${maxFreeStandardArcs} standard arc(s) allowed for this mount type`;
  }
  
  return '';
}

/**
 * Get display name for a firing arc (short version for compass display)
 */
export function getArcDisplayName(arc: FiringArc): string {
  const names: Record<FiringArc, string> = {
    'forward': 'Fwd',
    'starboard': 'Stbd',
    'port': 'Port',
    'aft': 'Aft',
    'zero-forward': 'Fwd',
    'zero-starboard': 'Stbd',
    'zero-port': 'Port',
    'zero-aft': 'Aft',
  };
  return names[arc];
}

/**
 * Format arcs for display in weapon lists (includes Zero- prefix for clarity)
 */
export function formatArcs(arcs: FiringArc[]): string {
  if (arcs.length === 0) return 'None';
  
  // Check if all zero arcs are selected
  const zeroArcs = arcs.filter(a => a.startsWith('zero-'));
  const standardArcs = arcs.filter(a => !a.startsWith('zero-'));
  
  const parts: string[] = [];
  
  // If all 4 zero arcs, show as "All Zero"
  if (zeroArcs.length === 4) {
    parts.push('All Zero');
  } else {
    // Add Zero- prefix for zero arcs in list view
    parts.push(...zeroArcs.map(arc => 'Zero-' + getArcDisplayName(arc)));
  }
  
  parts.push(...standardArcs.map(getArcDisplayName));
  
  return parts.join(', ');
}
