import type { ProgressLevel, TechTrack, QualityLevel, InstalledSystemBase, PowerConsumingStats } from './common';
import type { StandardArc } from './weapon';

// ============== Computer Quality ==============

/**
 * Computer quality levels for tracking calculations
 * 'none' means no computer core is assigned
 */
export type ComputerQuality = 'none' | QualityLevel;

/**
 * Tracking table configuration loaded from JSON
 * Maps PL -> ComputerQuality -> tracking value (-1 = unlimited)
 */
export type TrackingTable = Record<string, Record<ComputerQuality, number>>;

// ============== Sensor Categories ==============

export type SensorCategory =
  | 'active'    // Radar, Ladar, Mass Radar - emit energy to detect targets
  | 'passive'   // EM Detector, IR Detector, CE Passive Array - listen for emissions
  | 'remote'    // Probes, Remote Networks - deployed sensor platforms
  | 'special';  // Drive Detection Array, Spectroanalyzer, Omniscience Sphere

// ============== Sensor Type ==============

export interface SensorType {
  id: string;
  name: string;
  progressLevel: ProgressLevel;
  techTracks: TechTrack[];
  category: SensorCategory;
  /** Hull points per unit */
  hullPoints: number;
  /** Power required per unit */
  powerRequired: number;
  /** Cost per unit */
  cost: number;
  /** Short/Medium/Long range in Mm (megameters), or special range description */
  rangeShort: number;
  rangeMedium: number;
  rangeLong: number;
  /** Special range text (e.g., "50 light-years" for drive detection array) */
  rangeSpecial?: string;
  /** Number of arcs covered by one unit (1, 2, or 4) */
  arcsCovered: number;
  /** Base tracking capability (contacts that can be tracked) */
  trackingCapability: number;
  /** Accuracy modifier (step penalty/bonus to sensor checks) */
  accuracyModifier: number;
  /** Accuracy modifier description (e.g., "+3 step penalty", "Normal") */
  accuracyDescription: string;
  /** Special bonuses (e.g., "-2 step bonus vs active targets") */
  specialBonus?: string;
  /** Effect description for display */
  effect: string;
  /** Detailed description */
  description: string;
  /** Whether this is a dedicated control computer for sensors */
  isDedicatedControl?: boolean;
  /** For probes: capacity (number of probes per bay) */
  probeCapacity?: number;
  /** For probes: replacement cost per probe */
  probeReplacementCost?: number;
  /** For remote networks: which sensor type it enhances */
  enhancesSensor?: string;
}

// ============== Installed Sensor ==============

export interface InstalledSensor extends InstalledSystemBase<SensorType> {
  /** Specific firing arcs this sensor covers */
  arcs: StandardArc[];
  /** Total tracking capability (derived from PL, computer quality, and quantity) */
  trackingCapability: number;
}

// ============== Stats ==============

export interface SensorStats extends PowerConsumingStats {
  /** Total tracking capability across all sensors */
  totalTrackingCapability: number;
  /** Whether ship has at least basic sensors (air/space radar) */
  hasBasicSensors: boolean;
  /** List of sensor types installed */
  installedSensorTypes: string[];
}
