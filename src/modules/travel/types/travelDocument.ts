import type {
  AccelerationConversionMethod,
  DistanceUnitId,
  TravelProfile,
  WarshipsScaleId,
} from '../services/travelCalculationService';

export type AccelerationSource = 'rating' | 'physical' | 'ship';
export type PhysicalAccelerationUnit = 'g' | 'mps2';
export type SpeedCapUnit = 'percent-c' | 'kmps' | 'rating';

export interface ImportedEngineProfile {
  engineTypeId: string;
  name: string;
  scaleId: WarshipsScaleId;
  engineHullPoints: number;
  accelerationRating: number;
  accelerationMps2: number;
  requiresFuel: boolean;
  fuelOptional: boolean;
  fuelEfficiency: number;
  fuelTankHullPoints: number;
  fuelEnduranceDays: number | null;
}

export interface ImportedTravelShip {
  name: string;
  hullName: string;
  progressLevel: number;
  pl6AccelerationRating: number;
  pl7AccelerationRating: number;
  accelerationMps2: number;
  engines: ImportedEngineProfile[];
  hasAccelerationCompensation: boolean;
  warnings: string[];
}

export interface EngineFuelAssessment extends ImportedEngineProfile {
  requiredFuelHullPoints: number;
  remainingFuelHullPoints: number;
  hasEnoughFuel: boolean;
}

export interface TravelDocument {
  name: string;
  distance: number;
  distanceUnit: DistanceUnitId;
  scaleId: WarshipsScaleId;
  accelerationSource: AccelerationSource;
  accelerationConversionMethod: AccelerationConversionMethod;
  accelerationRating: number;
  physicalAcceleration: number;
  physicalAccelerationUnit: PhysicalAccelerationUnit;
  profile: TravelProfile;
  speedCapEnabled: boolean;
  speedCap: number;
  speedCapUnit: SpeedCapUnit;
  accelerationCompensated: boolean;
  importedShip: ImportedTravelShip | null;
}

export const DEFAULT_TRAVEL_DOCUMENT: TravelDocument = {
  name: 'New Trip',
  distance: 25,
  distanceUnit: 'AU',
  scaleId: 'pl7plus',
  accelerationSource: 'rating',
  accelerationConversionMethod: 'scale-derived',
  accelerationRating: 1,
  physicalAcceleration: 1,
  physicalAccelerationUnit: 'g',
  profile: 'rest-to-rest',
  speedCapEnabled: false,
  speedCap: 1,
  speedCapUnit: 'percent-c',
  accelerationCompensated: true,
  importedShip: null,
};
