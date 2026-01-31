import type { ProgressLevel, TechTrack } from '../types/common';
import type { ShipClass } from '../types/hull';
import type {
  BeamWeaponType,
  ProjectileWeaponType,
  WeaponType,
  InstalledWeapon,
  WeaponStats,
  MountType,
  GunConfiguration,
  WeaponCategory,
  FiringArc,
  StandardArc,
  ZeroArc,
  FirepowerRating,
} from '../types/weapon';
import { ALL_ZERO_ARCS, ALL_STANDARD_ARCS } from '../types/weapon';
import weaponsData from '../data/weapons.json';

let beamWeapons: BeamWeaponType[] | null = null;
let projectileWeapons: ProjectileWeaponType[] | null = null;

/**
 * Initialize weapons data from JSON
 */
export function initializeWeaponsData(data: typeof weaponsData): void {
  beamWeapons = data.beamWeapons as BeamWeaponType[];
  projectileWeapons = (data as { projectileWeapons?: ProjectileWeaponType[] }).projectileWeapons as ProjectileWeaponType[] || [];
}

// Initialize with bundled data
initializeWeaponsData(weaponsData);

/**
 * Get all beam weapon types
 */
export function getAllBeamWeaponTypes(): BeamWeaponType[] {
  return beamWeapons || [];
}

/**
 * Get all projectile weapon types
 */
export function getAllProjectileWeaponTypes(): ProjectileWeaponType[] {
  return projectileWeapons || [];
}

/**
 * Filter weapon types by design constraints (Progress Level and Tech Tracks)
 */
export function filterByDesignConstraints<T extends WeaponType>(
  weapons: T[],
  designPL: ProgressLevel,
  designTechTracks: TechTrack[]
): T[] {
  return weapons.filter((weapon) => {
    // Filter by Progress Level
    if (weapon.progressLevel > designPL) return false;
    // Filter by Tech Tracks:
    // - If designTechTracks is empty, show all components (no tech filtering)
    // - If weapon has no tech requirement, always show it
    // - If weapon has tech requirements, only show if all required techs are available
    if (designTechTracks.length > 0 && weapon.techTracks.length > 0) {
      const hasAllTechs = weapon.techTracks.every((tech) => designTechTracks.includes(tech));
      if (!hasAllTechs) return false;
    }
    return true;
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
 */
export function getMountModifiers(mountType: MountType): { costMultiplier: number; hpMultiplier: number } {
  const modifiers: Record<MountType, { costMultiplier: number; hpMultiplier: number }> = {
    standard: { costMultiplier: 1, hpMultiplier: 1 },
    fixed: { costMultiplier: 0.75, hpMultiplier: 0.75 },
    turret: { costMultiplier: 1.5, hpMultiplier: 1.5 },
    sponson: { costMultiplier: 1.25, hpMultiplier: 1 },
    bank: { costMultiplier: 1.25, hpMultiplier: 1 },
  };
  return modifiers[mountType];
}

/**
 * Get gun configuration modifiers
 */
export function getGunConfigurationModifiers(config: GunConfiguration): { costMultiplier: number; hpMultiplier: number; gunCount: number } {
  const modifiers: Record<GunConfiguration, { costMultiplier: number; hpMultiplier: number; gunCount: number }> = {
    single: { costMultiplier: 1, hpMultiplier: 1, gunCount: 1 },
    twin: { costMultiplier: 1.5, hpMultiplier: 1.5, gunCount: 2 },
    triple: { costMultiplier: 1.75, hpMultiplier: 1.75, gunCount: 3 },
    quadruple: { costMultiplier: 2, hpMultiplier: 2, gunCount: 4 },
  };
  return modifiers[config];
}

/**
 * Generate unique ID for an installed weapon
 */
export function generateWeaponId(): string {
  return `weapon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate hull points for a weapon installation
 * HP is affected by: mount type, gun configuration, and concealment
 * Power is NOT affected by these modifiers
 */
export function calculateWeaponHullPoints(
  weapon: WeaponType,
  mountType: MountType,
  gunConfig: GunConfiguration,
  concealed: boolean
): number {
  const mountMod = getMountModifiers(mountType);
  const gunMod = getGunConfigurationModifiers(gunConfig);
  
  let hp = weapon.hullPoints;
  hp *= mountMod.hpMultiplier;
  hp *= gunMod.hpMultiplier;
  
  if (concealed) {
    hp *= 1.5; // Concealment multiplier
  }
  
  return Math.ceil(hp);
}

/**
 * Calculate power required for a weapon installation
 * Power is NOT affected by mount type, gun configuration, or concealment
 */
export function calculateWeaponPower(weapon: WeaponType): number {
  return weapon.powerRequired;
}

/**
 * Calculate cost for a weapon installation
 * Cost is affected by: mount type, gun configuration, and concealment
 */
export function calculateWeaponCost(
  weapon: WeaponType,
  mountType: MountType,
  gunConfig: GunConfiguration,
  concealed: boolean
): number {
  const mountMod = getMountModifiers(mountType);
  const gunMod = getGunConfigurationModifiers(gunConfig);
  
  let cost = weapon.cost;
  cost *= mountMod.costMultiplier;
  cost *= gunMod.costMultiplier;
  
  if (concealed) {
    cost *= 1.5; // Concealment multiplier
  }
  
  return Math.ceil(cost);
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
    powerRequired: calculateWeaponPower(weapon),
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
    powerRequired: calculateWeaponPower(installed.weaponType),
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
      ordnanceCount: stats.ordnanceCount + (weapon.category === 'ordnance' ? weapon.quantity : 0),
    }),
    {
      totalHullPoints: 0,
      totalPowerRequired: 0,
      totalCost: 0,
      beamCount: 0,
      projectileCount: 0,
      torpedoCount: 0,
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
