import type { ProgressLevel, TechTrack } from '../types/common';
import type {
  SensorType,
  InstalledSensor,
  SensorStats,
} from '../types/sensor';

// ============== Types ==============

export type ComputerQuality = 'none' | 'Ordinary' | 'Good' | 'Amazing';

// ============== Data Loading ==============

let sensorTypes: SensorType[] = [];

export function loadSensorsData(data: {
  sensors: SensorType[];
}): void {
  sensorTypes = data.sensors;
}

// ============== Getters ==============

export function getAllSensorTypes(): SensorType[] {
  return sensorTypes;
}

export function getSensorTypeById(id: string): SensorType | undefined {
  return sensorTypes.find((t) => t.id === id);
}

// ============== Filtering ==============

export function filterByDesignConstraints(
  items: SensorType[],
  designProgressLevel: ProgressLevel,
  designTechTracks: TechTrack[]
): SensorType[] {
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

// ============== ID Generation ==============

let sensorCounter = 0;

export function generateSensorId(): string {
  return `sensor-${Date.now()}-${++sensorCounter}`;
}

// ============== Calculations ==============

/**
 * Calculate hull points for a sensor installation
 */
export function calculateSensorHullPoints(
  type: SensorType,
  quantity: number
): number {
  return type.hullPoints * quantity;
}

/**
 * Calculate power required for a sensor installation
 */
export function calculateSensorPower(
  type: SensorType,
  quantity: number
): number {
  return type.powerRequired * quantity;
}

/**
 * Calculate cost for a sensor installation
 */
export function calculateSensorCost(
  type: SensorType,
  quantity: number
): number {
  return type.cost * quantity;
}

/**
 * Calculate arcs covered by a sensor installation
 */
export function calculateArcsCovered(
  type: SensorType,
  quantity: number
): number {
  // Each unit covers arcsCovered arcs, max 4 (full coverage)
  return Math.min(type.arcsCovered * quantity, 4);
}

/**
 * Calculate tracking capability for a sensor installation
 * Based on ship PL, computer quality, and quantity
 * 
 * Tracking table:
 * - PL6: 5/10/20/40 (none/ordinary/good/amazing)
 * - PL7: 10/20/40/unlimited (none/ordinary/good/amazing)
 * - PL8+: 20/40/80/unlimited (none/ordinary/good/amazing)
 * 
 * @param designPL - The ship's progress level
 * @param computerQuality - Quality of assigned sensor control computer ('none', 'Ordinary', 'Good', 'Amazing')
 * @param quantity - Number of sensor units installed
 * @returns Tracking capability (contacts that can be tracked), -1 means unlimited
 */
export function calculateTrackingCapability(
  designPL: ProgressLevel,
  computerQuality: ComputerQuality,
  quantity: number
): number {
  // Base tracking per sensor unit based on PL and computer quality
  // -1 represents unlimited
  const trackingTable: Record<ProgressLevel, Record<ComputerQuality, number>> = {
    6: { none: 5, Ordinary: 10, Good: 20, Amazing: 40 },
    7: { none: 10, Ordinary: 20, Good: 40, Amazing: -1 },
    8: { none: 20, Ordinary: 40, Good: 80, Amazing: -1 },
    9: { none: 20, Ordinary: 40, Good: 80, Amazing: -1 }, // Same as PL8
  };

  const baseTracking = trackingTable[designPL][computerQuality];
  
  // Unlimited tracking stays unlimited regardless of quantity
  if (baseTracking === -1) {
    return -1;
  }
  
  return baseTracking * quantity;
}

/**
 * Calculate how many units needed for full arc coverage (all 4 arcs)
 */
export function calculateUnitsForFullCoverage(type: SensorType): number {
  if (type.arcsCovered >= 4) {
    return 1;
  }
  return Math.ceil(4 / type.arcsCovered);
}

// ============== Stats Calculation ==============

export function calculateSensorStats(
  installedSensors: InstalledSensor[]
): SensorStats {
  let totalHullPoints = 0;
  let totalPowerRequired = 0;
  let totalCost = 0;
  let totalTrackingCapability = 0;
  let hasUnlimitedTracking = false;
  let hasBasicSensors = false;
  const installedSensorTypes: string[] = [];

  for (const sensor of installedSensors) {
    totalHullPoints += sensor.hullPoints;
    totalPowerRequired += sensor.powerRequired;
    totalCost += sensor.cost;
    
    // -1 means unlimited tracking
    if (sensor.trackingCapability === -1) {
      hasUnlimitedTracking = true;
    } else {
      totalTrackingCapability += sensor.trackingCapability;
    }
    
    // Check for basic sensors (air/space radar or better active sensor)
    if (sensor.type.category === 'active') {
      hasBasicSensors = true;
    }
    
    if (!installedSensorTypes.includes(sensor.type.name)) {
      installedSensorTypes.push(sensor.type.name);
    }
  }

  return {
    totalHullPoints,
    totalPowerRequired,
    totalCost,
    // If any sensor has unlimited tracking, total is unlimited (-1)
    totalTrackingCapability: hasUnlimitedTracking ? -1 : totalTrackingCapability,
    hasBasicSensors,
    installedSensorTypes,
  };
}

// ============== Installation Helpers ==============

/**
 * Create an installed sensor from a type, quantity, and PL
 */
export function createInstalledSensor(
  type: SensorType,
  quantity: number,
  designPL: ProgressLevel,
  computerQuality: ComputerQuality = 'none'
): InstalledSensor {
  return {
    id: generateSensorId(),
    type,
    quantity,
    hullPoints: calculateSensorHullPoints(type, quantity),
    powerRequired: calculateSensorPower(type, quantity),
    cost: calculateSensorCost(type, quantity),
    arcsCovered: calculateArcsCovered(type, quantity),
    trackingCapability: calculateTrackingCapability(designPL, computerQuality, quantity),
  };
}

/**
 * Update an existing installed sensor with new quantity
 */
export function updateInstalledSensor(
  sensor: InstalledSensor,
  quantity: number,
  designPL: ProgressLevel,
  computerQuality: ComputerQuality = 'none'
): InstalledSensor {
  return {
    ...sensor,
    quantity,
    hullPoints: calculateSensorHullPoints(sensor.type, quantity),
    powerRequired: calculateSensorPower(sensor.type, quantity),
    cost: calculateSensorCost(sensor.type, quantity),
    arcsCovered: calculateArcsCovered(sensor.type, quantity),
    trackingCapability: calculateTrackingCapability(designPL, computerQuality, quantity),
  };
}
