import type { ProgressLevel, TechTrack } from './common';

// ============== Life Support Types ==============

export interface LifeSupportType {
  id: string;
  name: string;
  progressLevel: ProgressLevel;
  techTracks: TechTrack[];
  hullPoints: number;
  powerRequired: number;
  cost: number;
  /** Hull points covered by this life support unit */
  hullPointsCovered: number;
  /** Number of people this provides recycling for (optional) */
  recyclingCapacity?: number;
  description: string;
}

export interface InstalledLifeSupport {
  id: string;
  type: LifeSupportType;
  quantity: number;
}

// ============== Accommodation Types ==============

export type AccommodationCategory = 'crew' | 'passenger' | 'suspended';

export interface AccommodationType {
  id: string;
  name: string;
  progressLevel: ProgressLevel;
  techTracks: TechTrack[];
  hullPoints: number;
  powerRequired: number;
  cost: number;
  /** Number of people this accommodation holds */
  capacity: number;
  /** Category of accommodation */
  category: AccommodationCategory;
  /** Whether this accommodation includes a free airlock */
  includesAirlock: boolean;
  description: string;
}

export interface InstalledAccommodation {
  id: string;
  type: AccommodationType;
  quantity: number;
}

// ============== Stores Types ==============

export type StoreSystemEffect = 'feeds' | 'reduces-consumption' | 'adds-stores';

export interface StoreSystemType {
  id: string;
  name: string;
  progressLevel: ProgressLevel;
  techTracks: TechTrack[];
  hullPoints: number;
  powerRequired: number;
  cost: number;
  /** The effect this store system has */
  effect: StoreSystemEffect;
  /** Value associated with the effect (people fed, consumption reduction %, or days added) */
  effectValue: number;
  /** For 'reduces-consumption', how many people it affects */
  affectedPeople?: number;
  description: string;
}

export interface InstalledStoreSystem {
  id: string;
  type: StoreSystemType;
  quantity: number;
}

// ============== Combined Support Systems State ==============

export interface SupportSystemsState {
  lifeSupport: InstalledLifeSupport[];
  accommodations: InstalledAccommodation[];
  storeSystems: InstalledStoreSystem[];
}

// ============== Calculated Stats ==============

export interface SupportSystemsStats {
  // Hull points
  lifeSupportHP: number;
  accommodationsHP: number;
  storeSystemsHP: number;
  totalHullPoints: number;
  
  // Power
  lifeSupportPower: number;
  accommodationsPower: number;
  storeSystemsPower: number;
  totalPowerRequired: number;
  
  // Cost
  lifeSupportCost: number;
  accommodationsCost: number;
  storeSystemsCost: number;
  totalCost: number;
  
  // Life support coverage
  totalHullPointsCovered: number;
  
  // Accommodations
  crewCapacity: number;
  passengerCapacity: number;
  suspendedCapacity: number;
  totalCapacity: number;
  freeAirlocks: number;
  
  // Stores
  peopleFed: number;
  recyclingCapacity: number;
  additionalStoresDays: number;
  
  // Artificial gravity (derived from PL and tech)
  hasArtificialGravity: boolean;
}
