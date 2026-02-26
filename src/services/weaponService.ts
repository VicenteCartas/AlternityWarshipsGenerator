import { FIREPOWER_ORDER } from '../types/common';
import type { ShipClass } from '../types/hull';
import { generateId } from './utilities';
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
  FirepowerRating,
} from '../types/weapon';
import { ALL_ZERO_ARCS } from '../types/weapon';
import {
  getBeamWeaponsData,
  getProjectileWeaponsData,
  getTorpedoWeaponsData,
  getSpecialWeaponsData,
  getMountModifiersData,
  getGunConfigurationsData,
  getConcealmentModifierData,
} from './dataLoader';

/**
 * Get all beam weapon types
 */
export function getAllBeamWeaponTypes(): BeamWeaponType[] {
  return getBeamWeaponsData();
}

/**
 * Get all projectile weapon types
 */
export function getAllProjectileWeaponTypes(): ProjectileWeaponType[] {
  return getProjectileWeaponsData();
}

/**
 * Get all torpedo weapon types
 */
export function getAllTorpedoWeaponTypes(): TorpedoWeaponType[] {
  return getTorpedoWeaponsData();
}

/**
 * Get all special weapon types
 */
export function getAllSpecialWeaponTypes(): SpecialWeaponType[] {
  return getSpecialWeaponsData();
}

/**
 * Sort weapons by Progress Level, Firepower, Accuracy, Range, HP, Power, Cost
 * This provides a consistent ordering for weapon tables
 */
export function sortWeapons<T extends WeaponType>(weapons: T[]): T[] {
  return [...weapons].sort((a, b) => {
    // Sort by PL first
    if (a.progressLevel !== b.progressLevel) return a.progressLevel - b.progressLevel;
    // Then by Firepower (using order: Gd, S, L, M, H, SH)
    const fpA = FIREPOWER_ORDER[a.firepower as FirepowerRating] ?? 99;
    const fpB = FIREPOWER_ORDER[b.firepower as FirepowerRating] ?? 99;
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
  const mountMod = getMountModifiers(mountType);
  
  if (mountMod.allowedCategories && !mountMod.allowedCategories.includes(category)) {
    return false;
  }
  
  if (mountMod.minProgressLevel && weapon.progressLevel < mountMod.minProgressLevel) {
    return false;
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
  const modifiers = getMountModifiersData();
  if (!modifiers) {
    throw new Error('[weaponService] Mount modifiers data not loaded. Ensure game data is initialized before calling getMountModifiers().');
  }
  const result = modifiers[mountType];
  if (!result) {
    throw new Error(`[weaponService] Unknown mount type: ${mountType}`);
  }
  return result;
}

/**
 * Get gun configuration modifiers
 * Per Warships rules: "Twin Mounts require 1.5 times the space and cost of a single weapon"
 * "Triple Mounts require twice the space and money of a single weapon"
 * Power is NOT affected - it scales with actual gun count.
 * These multipliers represent how many "effective guns" you pay for in HP/cost.
 */
export function getGunConfigurationModifiers(config: GunConfiguration): GunConfigModifier {
  const configs = getGunConfigurationsData();
  if (!configs) {
    throw new Error('[weaponService] Gun configuration data not loaded. Ensure game data is initialized before calling getGunConfigurationModifiers().');
  }
  const result = configs[config];
  if (!result) {
    throw new Error(`[weaponService] Unknown gun configuration: ${config}`);
  }
  return result;
}

/**
 * Get concealment modifier
 * Concealed weapons take extra space and cost more
 */
export function getConcealmentModifier(): MountModifier {
  const mod = getConcealmentModifierData();
  if (!mod) {
    throw new Error('[weaponService] Concealment modifier data not loaded. Ensure game data is initialized before calling getConcealmentModifier().');
  }
  return mod;
}

/**
 * Generate unique ID for an installed weapon
 */
export function generateWeaponId(): string {
  return generateId('weapon');
}

/**
 * Round a value to the nearest 0.5, with ties (x.25, x.75) rounding down.
 * Examples: 1.25 → 1.0, 1.26 → 1.5, 2.5 → 2.5, 3.75 → 3.5
 */
function roundToHalf(value: number): number {
  return Math.ceil(value * 2 - 0.5) / 2;
}

/**
 * Calculate hull points for a weapon installation
 * Formula: (baseHP × mountMultiplier) × effectiveGunCount × concealmentMultiplier
 * Per Warships rules: mount modifier applies per gun, then gun config determines effective count
 * Result is rounded to nearest 0.5 (ties round down)
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
    totalHp *= getConcealmentModifier().hpMultiplier;
  }
  
  return roundToHalf(totalHp);
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
 * Result is rounded to nearest 0.5 (ties round down)
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
    totalCost *= getConcealmentModifier().costMultiplier;
  }
  
  return roundToHalf(totalCost);
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
 * Get mount type display name
 */
export function getMountTypeName(mountType: MountType): string {
  return mountType.charAt(0).toUpperCase() + mountType.slice(1);
}

/**
 * Get gun configuration display name
 */
export function getGunConfigurationName(config: GunConfiguration): string {
  const names: Record<string, string> = {
    single: 'Single',
    twin: 'Twin',
    triple: 'Triple',
    quadruple: 'Quadruple',
  };
  return names[config] || config.charAt(0).toUpperCase() + config.slice(1);
}

// ============== Firing Arc Functions ==============

/**
 * Get the number of free arcs based on mount type and ship class
 */
export function getFreeArcCount(mountType: MountType, shipClass: ShipClass): { zeroArcs: number; standardArcs: number } {
  const isSmallCraft = shipClass === 'small-craft';
  const mountMod = getMountModifiers(mountType);
  
  if (!mountMod.allowsZeroArc) {
    return { zeroArcs: 0, standardArcs: mountMod.standardArcs ?? 1 };
  }
  
  if (isSmallCraft) {
    return { zeroArcs: 4, standardArcs: mountMod.standardArcs ?? 1 };
  }
  
  return { zeroArcs: 1, standardArcs: mountMod.standardArcs ?? 1 };
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
  const mountMod = getMountModifiers(mountType);
  
  if (!mountMod.allowsZeroArc) {
    return ['forward'];
  }
  
  if (isSmallCraft && canUseZero) {
    arcs.push(...ALL_ZERO_ARCS);
  } else if (canUseZero) {
    arcs.push('zero-forward');
  }
  
  arcs.push('forward');
  
  const standardArcs = mountMod.standardArcs ?? 1;
  if (standardArcs >= 2) arcs.push('starboard');
  if (standardArcs >= 3) arcs.push('port');
  if (standardArcs >= 4) arcs.push('aft');
  
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
  
  const mountMod = getMountModifiers(mountType);
  const freeArcs = getFreeArcCount(mountType, shipClass);
  
  // Check zero arc restrictions
  if (zeroArcs.length > 0 && !canUseZero) {
    return 'Only Small and Light firepower weapons can use zero arcs';
  }
  
  if (!mountMod.allowsZeroArc) {
    if (standardArcs.length !== (mountMod.standardArcs ?? 1)) {
      return `${getMountTypeName(mountType)} mounts must have exactly ${mountMod.standardArcs ?? 1} arc(s)`;
    }
    if (zeroArcs.length > 0) {
      return `${getMountTypeName(mountType)} mounts cannot use zero arcs`;
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
