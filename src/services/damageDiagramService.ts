import type { Hull } from '../types/hull';
import { FIREPOWER_ORDER } from '../types/common';
import type {
  ZoneCode,
  ZoneCount,
  ShipClassZoneConfig,
  DamageZone,
  ZoneSystemReference,
  SystemDamageCategory,
  DamageDiagram,
  DamageDiagramStats,
  HitLocationChart,
  HitLocationColumn,
  AttackDirection,
  DamageDiagramData,
} from '../types/damageDiagram';
import { getDamageDiagramDataGetter } from './dataLoader';

// ============== Data Access ==============

function getDamageDiagramData(): DamageDiagramData {
  const data = getDamageDiagramDataGetter();
  if (!data) {
    throw new Error('Damage diagram data not loaded');
  }
  return data;
}

// ============== Zone Configuration ==============

/**
 * Get the zone configuration for a given hull
 */
export function getZoneConfigForHull(hull: Hull): ShipClassZoneConfig {
  const data = getDamageDiagramData();

  const shipClass = hull.shipClass;
  const hullPoints = hull.hullPoints;

  let zones: ZoneCode[];
  let hitDie: 6 | 8 | 12 | 20;
  let zoneCount: ZoneCount;

  if (shipClass === 'small-craft') {
    // Small craft have variable zone count based on HP
    if (hullPoints <= 20) {
      zones = data.zoneConfigurations['small-craft']['2-zone'].zones;
      hitDie = data.zoneConfigurations['small-craft']['2-zone'].hitDie;
      zoneCount = 2;
    } else {
      zones = data.zoneConfigurations['small-craft']['4-zone'].zones;
      hitDie = data.zoneConfigurations['small-craft']['4-zone'].hitDie;
      zoneCount = 4;
    }
  } else {
    const config = data.zoneConfigurations[shipClass];
    zones = config.zones;
    hitDie = config.hitDie;
    zoneCount = zones.length as ZoneCount;
  }

  return {
    shipClass,
    zoneCount,
    zones,
    hitDie,
  };
}

/**
 * Get the zone limit (max HP per zone) for a given hull type
 */
export function getZoneLimitForHull(hullTypeId: string): number {
  const data = getDamageDiagramData();

  const limitData = data.zoneLimits.hulls[hullTypeId];
  if (!limitData) {
    // Default fallback: estimate based on hull points / zone count
    console.warn(`No zone limit data for hull type: ${hullTypeId}`);
    return 100; // Reasonable default
  }

  return limitData.zoneLimit;
}

/**
 * Get the number of zones for a hull type
 */
export function getZoneCountForHull(hullTypeId: string): ZoneCount {
  const data = getDamageDiagramData();

  const limitData = data.zoneLimits.hulls[hullTypeId];
  if (!limitData) {
    return 6; // Default to light ship zones
  }

  return limitData.zoneCount as ZoneCount;
}

// ============== Zone Initialization ==============

/**
 * Create empty zones for a ship based on its hull configuration
 */
export function createEmptyZones(hull: Hull): DamageZone[] {
  const config = getZoneConfigForHull(hull);
  const zoneLimit = getZoneLimitForHull(hull.id);

  return config.zones.map((code) => ({
    code,
    systems: [],
    totalHullPoints: 0,
    maxHullPoints: zoneLimit,
  }));
}

// ============== ID Generation ==============

let zoneRefCounter = 0;

export function generateZoneSystemRefId(): string {
  return `zsr-${Date.now()}-${++zoneRefCounter}`;
}

// ============== System Categorization ==============

/**
 * Get the damage category for a system type
 */
export function getSystemDamageCategory(systemType: string): SystemDamageCategory {
  // Map system types to damage categories
  const categoryMap: Record<string, SystemDamageCategory> = {
    // Weapons
    'beam': 'weapon',
    'projectile': 'weapon',
    'torpedo': 'weapon',
    'special': 'weapon',
    'ordnance': 'weapon',
    'launchSystem': 'weapon',
    
    // Defenses
    'defense': 'defense',
    'shield': 'defense',
    'screen': 'defense',
    'ecm': 'defense',
    
    // Sensors
    'sensor': 'sensor',
    'active': 'sensor',
    'passive': 'sensor',
    
    // Communications
    'communication': 'communication',
    'transceiver': 'communication',
    
    // Fuel
    'fuel': 'fuel',
    'engineFuel': 'fuel',
    'ftlFuel': 'fuel',
    
    // Hangars/Cargo
    'hangar': 'hangar',
    'cargo': 'hangar',
    
    // Accommodations
    'accommodation': 'accommodation',
    'lifeSupport': 'support',
    'stores': 'accommodation',
    
    // Miscellaneous
    'miscellaneous': 'miscellaneous',
    'misc': 'miscellaneous',
    
    // Support
    'support': 'support',
    'recycler': 'support',
    'gravity': 'support',
    
    // Engines
    'engine': 'engine',
    
    // Power Plant
    'powerPlant': 'powerPlant',
    'reactor': 'powerPlant',
    
    // FTL
    'ftlDrive': 'ftlDrive',
    'stardrive': 'ftlDrive',
    
    // Command
    'command': 'command',
    'computer': 'command',
    'cockpit': 'command',
    'commandDeck': 'command',
  };

  return categoryMap[systemType] || 'miscellaneous';
}

/**
 * Get the order index for a damage category (lower = hit first)
 */
export function getDamageCategoryOrder(category: SystemDamageCategory): number {
  const order: SystemDamageCategory[] = [
    'weapon',
    'defense',
    'sensor',
    'communication',
    'fuel',
    'hangar',
    'accommodation',
    'miscellaneous',
    'support',
    'engine',
    'powerPlant',
    'ftlDrive',
    'command',
  ];
  return order.indexOf(category);
}

// ============== Firepower Ordering ==============

export function getFirepowerOrder(firepower: string): number {
  return FIREPOWER_ORDER[firepower] ?? 99;
}

// ============== System Sorting ==============

/**
 * Sort systems within a zone by damage priority
 * Surface (weapons) to core (command)
 * Within weapons: lightest to heaviest
 * Within other categories: largest to smallest HP
 */
export function sortSystemsByDamagePriority(systems: ZoneSystemReference[]): ZoneSystemReference[] {
  return [...systems].sort((a, b) => {
    // First by damage category order
    const categoryOrderA = getDamageCategoryOrder(a.systemType);
    const categoryOrderB = getDamageCategoryOrder(b.systemType);
    if (categoryOrderA !== categoryOrderB) {
      return categoryOrderA - categoryOrderB;
    }

    // Within weapons: sort by firepower (lighter first)
    if (a.systemType === 'weapon' && b.systemType === 'weapon') {
      const fpA = a.firepowerOrder ?? 99;
      const fpB = b.firepowerOrder ?? 99;
      if (fpA !== fpB) {
        return fpA - fpB;
      }
    }

    // Within other categories: sort by HP (larger first)
    return b.hullPoints - a.hullPoints;
  });
}

// ============== Zone Validation ==============

/**
 * Check if a weapon can be placed in a zone based on its arcs
 * Note: Currently zone rules are the same for all ship classes
 */
export function canWeaponBeInZone(
  arcs: string[],
  zoneCode: ZoneCode
): boolean {
  // Define which zones are valid for each arc
  const arcZoneMap: Record<string, ZoneCode[]> = {
    forward: ['F', 'FC', 'FP', 'FS', 'FFP', 'FFC', 'FFS', 'CF'],
    aft: ['A', 'AC', 'AP', 'AS', 'AAP', 'AAC', 'AAS', 'CA'],
    port: ['P', 'FP', 'AP', 'FFP', 'AAP', 'PC'],
    starboard: ['S', 'FS', 'AS', 'FFS', 'AAS', 'SC'],
    // Zero arcs and high/low can go in center zones
    'zero-port': ['F', 'FC', 'AC', 'A', 'FFC', 'AAC', 'CF', 'CA'],
    'zero-starboard': ['F', 'FC', 'AC', 'A', 'FFC', 'AAC', 'CF', 'CA'],
    high: ['F', 'FC', 'AC', 'A', 'FFC', 'AAC', 'CF', 'CA', 'P', 'S'],
    low: ['F', 'FC', 'AC', 'A', 'FFC', 'AAC', 'CF', 'CA', 'P', 'S'],
  };

  // Weapon can be placed if ANY of its arcs are compatible with the zone
  for (const arc of arcs) {
    const validZones = arcZoneMap[arc] || [];
    if (validZones.includes(zoneCode)) {
      return true;
    }
  }

  return false;
}

/**
 * Validate a zone's configuration
 */
export function validateZone(zone: DamageZone): string[] {
  const errors: string[] = [];

  // Check HP limit
  if (zone.totalHullPoints > zone.maxHullPoints) {
    errors.push(`Zone ${zone.code} exceeds HP limit: ${zone.totalHullPoints}/${zone.maxHullPoints} HP`);
  }

  // Warning for empty zones
  if (zone.systems.length === 0) {
    errors.push(`Zone ${zone.code} has no systems assigned (risky in combat)`);
  }

  return errors;
}

// ============== Damage Diagram Stats ==============

/**
 * Calculate statistics for the damage diagram
 */
export function calculateDamageDiagramStats(
  zones: DamageZone[],
  totalShipSystems: number
): DamageDiagramStats {
  let zonesWithSystems = 0;
  let zonesOverLimit = 0;
  let emptyZones = 0;
  let totalSystemsAssigned = 0;
  let totalHullPointsAssigned = 0;

  for (const zone of zones) {
    if (zone.systems.length > 0) {
      zonesWithSystems++;
    } else {
      emptyZones++;
    }

    if (zone.totalHullPoints > zone.maxHullPoints) {
      zonesOverLimit++;
    }

    totalSystemsAssigned += zone.systems.length;
    totalHullPointsAssigned += zone.totalHullPoints;
  }

  return {
    zoneCount: zones.length,
    zonesWithSystems,
    zonesOverLimit,
    emptyZones,
    totalSystemsAssigned,
    totalHullPointsAssigned,
    unassignedSystems: totalShipSystems - totalSystemsAssigned,
  };
}

// ============== Hit Location Chart ==============

/**
 * Find the JSON hit location table key for a given hitDie and zone count.
 * Keys in JSON: "6-die", "8-die-4zone", "8-die-6zone", "12-die-8zone", etc.
 */
function getHitLocationTableKey(hitDie: number, zoneCount: number): string {
  // Try specific key first (die + zone count)
  const specificKey = `${hitDie}-die-${zoneCount}zone`;
  // For 2-zone d6, JSON uses just "6-die"
  const simpleKey = `${hitDie}-die`;
  return zoneCount <= 2 ? simpleKey : specificKey;
}

/**
 * Create default hit location chart for a ship, using JSON data when available.
 */
export function createDefaultHitLocationChart(
  zones: ZoneCode[],
  hitDie: 6 | 8 | 12 | 20
): HitLocationChart {
  const directions: AttackDirection[] = ['forward', 'port', 'starboard', 'aft'];

  // Try to load from JSON data first
  const data = getDamageDiagramData();
  const tables = data.hitLocationTables;
  if (tables) {
    const key = getHitLocationTableKey(hitDie, zones.length);
    const table = tables[key];
    if (table) {
      const columns: HitLocationColumn[] = directions.map((direction) => {
        const jsonEntries = table[direction] || [];
        const entries = jsonEntries.map((e) => ({
          minRoll: e.roll[0],
          maxRoll: e.roll.length > 1 ? e.roll[e.roll.length - 1] : e.roll[0],
          zone: e.zone as ZoneCode,
        }));
        return { direction, entries };
      });
      return { hitDie, columns };
    }
  }

  // Fallback: distribute die rolls evenly among zones (integer-only)
  const columns: HitLocationColumn[] = [];
  const zoneCount = zones.length;
  const baseRolls = Math.floor(hitDie / zoneCount);
  const extraRolls = hitDie % zoneCount;

  for (const direction of directions) {
    const orderedZones = reorderZonesForDirection(zones, direction);

    let currentRoll = 1;
    const entries = orderedZones.map((zone, idx) => {
      // First 'extraRolls' zones get one extra roll value
      const rollCount = baseRolls + (idx < extraRolls ? 1 : 0);
      const entry = {
        minRoll: currentRoll,
        maxRoll: currentRoll + rollCount - 1,
        zone,
      };
      currentRoll = entry.maxRoll + 1;
      return entry;
    });

    columns.push({ direction, entries });
  }

  return { hitDie, columns };
}

/**
 * Reorder zones to favor the attack direction
 * (Attacks from forward hit forward zones first)
 */
function reorderZonesForDirection(zones: ZoneCode[], direction: AttackDirection): ZoneCode[] {
  // Zone priorities for each direction (front of array = hit first)
  const priorityMap: Record<AttackDirection, ZoneCode[]> = {
    forward: ['F', 'FFP', 'FFC', 'FFS', 'FC', 'FP', 'FS', 'CF', 'P', 'S', 'PC', 'SC', 'AC', 'AP', 'AS', 'CA', 'AAP', 'AAC', 'AAS', 'A'],
    aft: ['A', 'AAP', 'AAC', 'AAS', 'AC', 'AP', 'AS', 'CA', 'P', 'S', 'PC', 'SC', 'FC', 'FP', 'FS', 'CF', 'FFP', 'FFC', 'FFS', 'F'],
    port: ['P', 'FP', 'AP', 'FFP', 'AAP', 'PC', 'FC', 'AC', 'F', 'A', 'S', 'SC'],
    starboard: ['S', 'FS', 'AS', 'FFS', 'AAS', 'SC', 'FC', 'AC', 'F', 'A', 'P', 'PC'],
    high: zones, // Default order for high/low
    low: zones,
  };

  const priority = priorityMap[direction];
  return [...zones].sort((a, b) => {
    const indexA = priority.indexOf(a);
    const indexB = priority.indexOf(b);
    // Zones not in priority list go to the end
    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
  });
}

// ============== Complete Diagram Validation ==============

/**
 * Validate the complete damage diagram
 */
export function validateDamageDiagram(diagram: DamageDiagram): string[] {
  const errors: string[] = [];

  // Validate each zone
  for (const zone of diagram.zones) {
    errors.push(...validateZone(zone));
  }

  // Check that all zones have at least one system
  const emptyZones = diagram.zones.filter((z) => z.systems.length === 0);
  if (emptyZones.length > 0) {
    errors.push(`Warning: ${emptyZones.length} zone(s) have no systems assigned`);
  }

  return errors;
}

/**
 * Check if the damage diagram is complete
 */
export function isDamageDiagramComplete(
  zones: DamageZone[],
  unassignedSystems: number
): boolean {
  // All systems must be assigned
  if (unassignedSystems > 0) {
    return false;
  }

  // All zones must have at least one system
  if (zones.some((z) => z.systems.length === 0)) {
    return false;
  }

  // No zones can exceed their HP limit
  if (zones.some((z) => z.totalHullPoints > z.maxHullPoints)) {
    return false;
  }

  return true;
}
