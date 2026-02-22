import type {
  CommandControlSystemType,
  InstalledCommandControlSystem,
  CommandControlStats,
  WeaponBatteryKey,
} from '../types/commandControl';
import type { InstalledWeapon } from '../types/weapon';
import type { InstalledSensor } from '../types/sensor';
import type { InstalledLaunchSystem } from '../types/ordnance';
import { generateId } from './utilities';
import { getLaunchSystemsData, getCommandControlSystemsData } from './dataLoader';

// ============== Getters ==============

export function getAllCommandControlSystemTypes(): CommandControlSystemType[] {
  return getCommandControlSystemsData();
}

export function getCommandControlSystemTypeById(id: string): CommandControlSystemType | undefined {
  return getAllCommandControlSystemTypes().find((t) => t.id === id);
}

// ============== Filtering ==============

/**
 * Filter command systems based on ship hull points
 * - Cockpit: only for ships <= 50 HP
 * - Command Deck: for all ships
 */
export function filterCommandSystemsByShipSize(
  items: CommandControlSystemType[],
  shipHullPoints: number
): CommandControlSystemType[] {
  return items.filter((item) => {
    if (item.category !== 'command') {
      return true;
    }
    // Check max ship hull points (for cockpit)
    if (item.maxShipHullPoints && shipHullPoints > item.maxShipHullPoints) {
      return false;
    }
    return true;
  });
}

// ============== ID Generation ==============

export function generateCommandControlId(): string {
  return generateId('cc');
}

// ============== Weapon Battery Functions ==============

/**
 * Create a weapon battery key from weapon type ID and mount type
 * Format: "weaponTypeId:mountType"
 */
export function createWeaponBatteryKey(weaponTypeId: string, mountType: string): WeaponBatteryKey {
  return `${weaponTypeId}:${mountType}`;
}

/**
 * Parse a weapon battery key back into components
 */
export function parseWeaponBatteryKey(key: WeaponBatteryKey): { weaponTypeId: string; mountType: string } {
  const [weaponTypeId, mountType] = key.split(':');
  return { weaponTypeId, mountType };
}

/**
 * Get a display name for a weapon battery
 */
export function getWeaponBatteryDisplayName(key: WeaponBatteryKey, weapons: InstalledWeapon[], launchSystems?: InstalledLaunchSystem[]): string {
  const { weaponTypeId, mountType } = parseWeaponBatteryKey(key);
  
  // Check if it's a launch system (mountType will be 'launcher')
  if (mountType === 'launcher' && launchSystems) {
    const ls = launchSystems.find(l => l.launchSystemType === weaponTypeId);
    if (ls) {
      const lsData = getLaunchSystemsData().find(d => d.id === ls.launchSystemType);
      return lsData ? `${lsData.name} Launcher` : key;
    }
  }
  
  const weapon = weapons.find(w => w.weaponType.id === weaponTypeId && w.mountType === mountType);
  if (!weapon) return key;
  const mountLabel = mountType.charAt(0).toUpperCase() + mountType.slice(1);
  return `${weapon.weaponType.name} ${mountLabel}`;
}

/**
 * Get all unique weapon batteries from installed weapons and launch systems
 * A battery = all weapons of the same type AND mount type
 * Launch systems are treated as a special mount type 'launcher'
 */
export function getWeaponBatteries(weapons: InstalledWeapon[], launchSystems?: InstalledLaunchSystem[]): Array<{
  key: WeaponBatteryKey;
  weaponTypeId: string;
  weaponTypeName: string;
  mountType: string;
  totalHullPoints: number;
  weaponCount: number;
}> {
  const batteryMap = new Map<WeaponBatteryKey, {
    weaponTypeId: string;
    weaponTypeName: string;
    mountType: string;
    totalHullPoints: number;
    weaponCount: number;
  }>();

  // Add regular weapons
  for (const weapon of weapons) {
    const key = createWeaponBatteryKey(weapon.weaponType.id, weapon.mountType);
    const existing = batteryMap.get(key);
    if (existing) {
      existing.totalHullPoints += weapon.hullPoints * weapon.quantity;
      existing.weaponCount += weapon.quantity;
    } else {
      batteryMap.set(key, {
        weaponTypeId: weapon.weaponType.id,
        weaponTypeName: weapon.weaponType.name,
        mountType: weapon.mountType,
        totalHullPoints: weapon.hullPoints * weapon.quantity,
        weaponCount: weapon.quantity,
      });
    }
  }

  // Add launch systems as a special 'launcher' mount type
  if (launchSystems) {
    const launchSystemDefs = getLaunchSystemsData();
    for (const ls of launchSystems) {
      const lsDef = launchSystemDefs.find(d => d.id === ls.launchSystemType);
      const key = createWeaponBatteryKey(ls.launchSystemType, 'launcher');
      const existing = batteryMap.get(key);
      if (existing) {
        existing.totalHullPoints += ls.hullPoints;
        existing.weaponCount += ls.quantity;
      } else {
        batteryMap.set(key, {
          weaponTypeId: ls.launchSystemType,
          weaponTypeName: lsDef?.name ?? ls.launchSystemType,
          mountType: 'launcher',
          totalHullPoints: ls.hullPoints,
          weaponCount: ls.quantity,
        });
      }
    }
  }

  return Array.from(batteryMap.entries()).map(([key, data]) => ({ key, ...data }));
}

/**
 * Get the total hull points for a weapon battery
 */
export function getWeaponBatteryHullPoints(batteryKey: WeaponBatteryKey, weapons: InstalledWeapon[], launchSystems?: InstalledLaunchSystem[]): number {
  const { weaponTypeId, mountType } = parseWeaponBatteryKey(batteryKey);
  
  // Check if it's a launch system
  if (mountType === 'launcher' && launchSystems) {
    return launchSystems
      .filter(ls => ls.launchSystemType === weaponTypeId)
      .reduce((total, ls) => total + ls.hullPoints, 0);
  }
  
  return weapons
    .filter(w => w.weaponType.id === weaponTypeId && w.mountType === mountType)
    .reduce((total, w) => total + (w.hullPoints * w.quantity), 0);
}

// ============== Calculations ==============

/**
 * Calculate hull points for systems that scale with ship size based on coverage.
 * 
 * Formula: baseHullPoints + ceil(shipHullPoints / coveragePerHullPoint)
 * Examples:
 *   - Command deck (base 2, coverage 100, max 10): 400 HP ship → 2 + ceil(400/100) = 6 HP
 *   - Computer core (base 0, coverage 200, no max): 400 HP ship → 0 + ceil(400/200) = 2 HP
 * 
 * @param shipHullPoints - Total hull points of the ship
 * @param type - System type with coverage properties (hullPoints, coveragePerHullPoint, maxHullPoints)
 * @returns Calculated hull points required for the system
 */
export function calculateCoverageBasedHullPoints(
  shipHullPoints: number,
  type: { hullPoints: number; coveragePerHullPoint?: number; maxHullPoints?: number }
): number {
  const baseHullPoints = type.hullPoints;
  const coveragePerHullPoint = type.coveragePerHullPoint;
  
  // If no coverage defined, return base hull points
  if (!coveragePerHullPoint) {
    return baseHullPoints;
  }
  
  // HP based on ship size
  const coverageHullPoints = Math.ceil(shipHullPoints / coveragePerHullPoint);
  const totalHullPoints = baseHullPoints + coverageHullPoints;
  
  // Apply max if defined
  return type.maxHullPoints ? Math.min(totalHullPoints, type.maxHullPoints) : totalHullPoints;
}

/**
 * Get the coverage per hull point for computer cores from the JSON data.
 * Falls back to 200 if no computer core type is found.
 */
function getComputerCoreCoverage(): number {
  const computerCore = getAllCommandControlSystemTypes().find(t => t.isCore);
  return computerCore?.coveragePerHullPoint ?? 200;
}

/**
 * Calculate required computer core hull points based on ship size.
 * Uses the coveragePerHullPoint from the computer core type in the data.
 */
export function calculateRequiredComputerCoreHullPoints(shipHullPoints: number): number {
  const coverage = getComputerCoreCoverage();
  return Math.ceil(shipHullPoints / coverage);
}

/**
 * Calculate hull points required for a C&C system
 */
export function calculateCommandControlHullPoints(
  type: CommandControlSystemType,
  shipHullPoints: number,
  quantity: number
): number {
  // Systems with coverage-based sizing (command deck, computer cores)
  // Formula: (baseHP + ceil(shipHP/coverage)) × quantity, with optional max per system
  if (type.coveragePerHullPoint) {
    const hpPerSystem = calculateCoverageBasedHullPoints(shipHullPoints, type);
    return hpPerSystem * quantity;
  }
  // Standard calculation (hullPoints * quantity)
  return type.hullPoints * quantity;
}

/**
 * Calculate power required for a C&C system
 */
export function calculateCommandControlPower(
  type: CommandControlSystemType,
  quantity: number
): number {
  return type.powerRequired * quantity;
}

/**
 * Calculate cost for a C&C system (without linked system consideration)
 * For Fire Control and Sensor Control, use calculateLinkedControlCost instead
 */
export function calculateCommandControlCost(
  type: CommandControlSystemType,
  shipHullPoints: number,
  quantity: number
): number {
  // Systems with coverage-based sizing AND costPer systemHp: cost per system's calculated HP
  // (e.g., command deck, computer cores)
  if (type.coveragePerHullPoint && type.costPer === 'systemHp') {
    const hpPerSystem = calculateCoverageBasedHullPoints(shipHullPoints, type);
    return type.cost * hpPerSystem * quantity;
  }
  // Linked systems (fire/sensor control): Return 0 here - actual cost calculated separately
  if (type.linkedSystemType) {
    return 0;
  }
  // Standard per-quantity systems
  return type.cost * quantity;
}

/**
 * Calculate cost for Fire Control based on linked weapon battery
 * Cost = Fire Control base cost × total HP of all weapons in the battery
 * (Per errata: ALL fire controls cost per hull, including Amazing)
 */
export function calculateFireControlCost(
  fireControlType: CommandControlSystemType,
  batteryKey: WeaponBatteryKey | undefined,
  weapons: InstalledWeapon[],
  launchSystems?: InstalledLaunchSystem[]
): number {
  if (!batteryKey) return 0;
  
  const batteryHP = getWeaponBatteryHullPoints(batteryKey, weapons, launchSystems);
  return fireControlType.cost * batteryHP;
}

/**
 * Calculate cost for Sensor Control based on linked sensor
 * Cost = Sensor Control base cost × HP of the linked sensor
 * (Per errata: ALL sensor controls cost per hull, including Amazing)
 */
export function calculateSensorControlCost(
  sensorControlType: CommandControlSystemType,
  linkedSensorId: string | undefined,
  sensors: InstalledSensor[]
): number {
  if (!linkedSensorId) return 0;
  
  const sensor = sensors.find(s => s.id === linkedSensorId);
  if (!sensor) return 0;
  
  return sensorControlType.cost * sensor.hullPoints;
}

// ============== Stats Calculation ==============

export function calculateCommandControlStats(
  installedSystems: InstalledCommandControlSystem[],
  shipHullPoints: number
): CommandControlStats {
  let totalHullPoints = 0;
  let totalPowerRequired = 0;
  let totalCost = 0;
  let commandSystemName: string | null = null;
  let commandStations = 0;
  let computerCoreQuality: 'Ordinary' | 'Good' | 'Amazing' | null = null;
  let installedComputerCoreHullPoints = 0;
  let attackBonus = 0;
  const installedTransceivers: string[] = [];

  for (const system of installedSystems) {
    totalHullPoints += system.hullPoints;
    totalPowerRequired += system.powerRequired;
    totalCost += system.cost;

    const type = system.type;

    // Track command systems
    if (type.category === 'command') {
      if (type.isRequired) {
        commandSystemName = type.name;
        commandStations = system.quantity;
      }
    }

    // Track transceivers
    if (type.category === 'communication') {
      installedTransceivers.push(type.name);
    }

    // Track computer cores
    if (type.quality && type.isCore) {
      computerCoreQuality = type.quality;
      installedComputerCoreHullPoints = system.quantity; // quantity represents HP for computer cores
    }

    // Track attack computer bonus
    if (type.id === 'attack-computer' && type.stepBonus) {
      attackBonus = type.stepBonus;
    }
  }

  const requiredComputerCoreHullPoints = calculateRequiredComputerCoreHullPoints(shipHullPoints);

  return {
    totalHullPoints,
    totalPowerRequired,
    totalCost,
    hasCommandSystem: commandSystemName !== null,
    commandSystemName,
    commandStations,
    hasComputerCore: computerCoreQuality !== null,
    computerCoreQuality,
    requiredComputerCoreHullPoints,
    installedComputerCoreHullPoints,
    attackBonus,
    installedTransceivers,
  };
}

// ============== Helpers ==============

/**
 * Check if a command system is already installed
 */
export function hasCommandSystemInstalled(
  installedSystems: InstalledCommandControlSystem[]
): boolean {
  return installedSystems.some(
    (s) => s.type.category === 'command' && s.type.isRequired
  );
}

/**
 * Check if a computer core is already installed
 */
export function hasComputerCoreInstalled(
  installedSystems: InstalledCommandControlSystem[]
): boolean {
  return installedSystems.some((s) => s.type.isCore);
}

/**
 * Get the best installed computer core quality (if any)
 * Returns the highest quality among all installed cores
 */
export function getInstalledComputerCoreQuality(
  installedSystems: InstalledCommandControlSystem[]
): 'Ordinary' | 'Good' | 'Amazing' | null {
  const cores = installedSystems.filter((s) => s.type.isCore);
  if (cores.length === 0) return null;
  
  // Return the best quality (Amazing > Good > Ordinary)
  const qualityOrder = ['Ordinary', 'Good', 'Amazing'] as const;
  let bestIndex = -1;
  for (const core of cores) {
    const idx = qualityOrder.indexOf(core.type.quality as typeof qualityOrder[number]);
    if (idx > bestIndex) bestIndex = idx;
  }
  return bestIndex >= 0 ? qualityOrder[bestIndex] : null;
}

/**
 * Get the max quality of control computer allowed based on installed core
 */
export function getMaxControlQualityForCore(
  coreQuality: 'Ordinary' | 'Good' | 'Amazing' | null
): 'Ordinary' | 'Good' | 'Amazing' {
  return coreQuality ?? 'Ordinary';
}

// ============== Fire Control / Sensor Control Helpers ==============

/**
 * Get all Fire Control systems that are assigned to a specific weapon battery
 */
export function getFireControlsForBattery(
  batteryKey: WeaponBatteryKey,
  installedSystems: InstalledCommandControlSystem[]
): InstalledCommandControlSystem[] {
  return installedSystems.filter(
    s => s.type.linkedSystemType === 'weapon' && s.linkedWeaponBatteryKey === batteryKey
  );
}

/**
 * Get the Sensor Control assigned to a specific sensor (if any)
 */
export function getSensorControlForSensor(
  sensorId: string,
  installedSystems: InstalledCommandControlSystem[]
): InstalledCommandControlSystem | undefined {
  return installedSystems.find(
    s => s.type.linkedSystemType === 'sensor' && s.linkedSensorId === sensorId
  );
}

/**
 * Get all unassigned Fire Controls (linked to battery that no longer exists)
 */
export function getOrphanedFireControls(
  installedSystems: InstalledCommandControlSystem[],
  weapons: InstalledWeapon[],
  launchSystems?: InstalledLaunchSystem[]
): InstalledCommandControlSystem[] {
  const batteries = getWeaponBatteries(weapons, launchSystems);
  const batteryKeys = new Set(batteries.map(b => b.key));
  
  return installedSystems.filter(s => {
    if (s.type.linkedSystemType !== 'weapon') return false;
    if (!s.linkedWeaponBatteryKey) return true; // Never assigned
    return !batteryKeys.has(s.linkedWeaponBatteryKey); // Battery no longer exists
  });
}

/**
 * Get all unassigned Sensor Controls (linked to sensor that no longer exists)
 */
export function getOrphanedSensorControls(
  installedSystems: InstalledCommandControlSystem[],
  sensors: InstalledSensor[]
): InstalledCommandControlSystem[] {
  const sensorIds = new Set(sensors.map(s => s.id));
  
  return installedSystems.filter(s => {
    if (s.type.linkedSystemType !== 'sensor') return false;
    if (!s.linkedSensorId) return true; // Never assigned
    return !sensorIds.has(s.linkedSensorId); // Sensor no longer exists
  });
}

/**
 * Check if a weapon battery already has a Fire Control assigned
 */
export function batteryHasFireControl(
  batteryKey: WeaponBatteryKey,
  installedSystems: InstalledCommandControlSystem[]
): boolean {
  return installedSystems.some(
    s => s.type.linkedSystemType === 'weapon' && s.linkedWeaponBatteryKey === batteryKey
  );
}

/**
 * Check if a sensor already has a Sensor Control assigned
 */
export function sensorHasSensorControl(
  sensorId: string,
  installedSystems: InstalledCommandControlSystem[]
): boolean {
  return installedSystems.some(
    s => s.type.linkedSystemType === 'sensor' && s.linkedSensorId === sensorId
  );
}

/**
 * Get the sensor control bonus for a specific sensor
 */
export function getSensorControlBonus(
  sensorId: string,
  installedSystems: InstalledCommandControlSystem[]
): number {
  const control = getSensorControlForSensor(sensorId, installedSystems);
  return control?.type.stepBonus ?? 0;
}

/**
 * Get the fire control bonus for a specific weapon battery
 */
export function getFireControlBonus(
  batteryKey: WeaponBatteryKey,
  installedSystems: InstalledCommandControlSystem[]
): number {
  const controls = getFireControlsForBattery(batteryKey, installedSystems);
  if (controls.length === 0) return 0;
  // Return the best bonus (most negative = best)
  return Math.min(...controls.map(c => c.type.stepBonus ?? 0));
}
