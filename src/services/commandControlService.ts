import type { ProgressLevel, TechTrack } from '../types/common';
import type {
  CommandControlSystemType,
  InstalledCommandControlSystem,
  CommandControlStats,
} from '../types/commandControl';

// ============== Data Loading ==============

let commandControlSystemTypes: CommandControlSystemType[] = [];

export function loadCommandControlSystemsData(data: {
  commandSystems: CommandControlSystemType[];
}): void {
  commandControlSystemTypes = data.commandSystems;
}

// ============== Getters ==============

export function getAllCommandControlSystemTypes(): CommandControlSystemType[] {
  return commandControlSystemTypes;
}

export function getCommandControlSystemTypeById(id: string): CommandControlSystemType | undefined {
  return commandControlSystemTypes.find((t) => t.id === id);
}

// ============== Filtering ==============

export function filterByDesignConstraints(
  items: CommandControlSystemType[],
  designProgressLevel: ProgressLevel,
  designTechTracks: TechTrack[]
): CommandControlSystemType[] {
  return items.filter((item) => {
    // Filter by progress level
    if (item.progressLevel > designProgressLevel) {
      return false;
    }
    // Filter by tech tracks (if any are selected)
    if (designTechTracks.length > 0 && item.techTracks.length > 0) {
      // Item needs at least one of its tech tracks to be available
      const hasAllowedTech = item.techTracks.some((track) =>
        designTechTracks.includes(track)
      );
      if (!hasAllowedTech) {
        return false;
      }
    }
    return true;
  }).sort((a, b) => a.progressLevel - b.progressLevel);
}

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

let ccCounter = 0;

export function generateCommandControlId(): string {
  return `cc-${Date.now()}-${++ccCounter}`;
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
 * Calculate required computer core hull points based on ship size
 * @deprecated Use calculateCoverageBasedHullPoints instead
 */
export function calculateRequiredComputerCoreHullPoints(shipHullPoints: number): number {
  return Math.ceil(shipHullPoints / 200);
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
  // Systems with coverage (e.g., computer cores) need power per installed hull point
  if (type.coveragePerHullPoint) {
    // Power scales with quantity (which represents installed HP)
    return type.powerRequired * quantity;
  }
  return type.powerRequired * quantity;
}

/**
 * Calculate cost for a C&C system
 */
export function calculateCommandControlCost(
  type: CommandControlSystemType,
  shipHullPoints: number,
  quantity: number
): number {
  // Systems with coverage-based sizing AND costPerHull: cost per system's calculated HP
  // (e.g., command deck, computer cores)
  if (type.coveragePerHullPoint && type.costPerHull) {
    const hpPerSystem = calculateCoverageBasedHullPoints(shipHullPoints, type);
    return type.cost * hpPerSystem * quantity;
  }
  // Linked systems (fire/sensor control): cost × linked system HP
  // TODO: When weapons/sensors are implemented, pass linked system HP
  // For now, just use base cost × quantity
  if (type.linkedSystemType) {
    return type.cost * quantity;
  }
  // Standard per-quantity systems
  return type.cost * quantity;
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
    if (type.quality && (type.id.startsWith('computer-core'))) {
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
  return installedSystems.some((s) => s.type.id.startsWith('computer-core'));
}

/**
 * Get the installed computer core quality (if any)
 */
export function getInstalledComputerCoreQuality(
  installedSystems: InstalledCommandControlSystem[]
): 'Ordinary' | 'Good' | 'Amazing' | null {
  const core = installedSystems.find((s) => s.type.id.startsWith('computer-core'));
  return core?.type.quality ?? null;
}

/**
 * Get the max quality of control computer allowed based on installed core
 */
export function getMaxControlQualityForCore(
  coreQuality: 'Ordinary' | 'Good' | 'Amazing' | null
): 'Ordinary' | 'Good' | 'Amazing' {
  return coreQuality ?? 'Ordinary';
}
