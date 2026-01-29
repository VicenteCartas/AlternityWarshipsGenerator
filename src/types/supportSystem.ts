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
  /** Days of stores included per person (0 for suspended animation) */
  storesDaysPerPerson: number;
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

// ============== Gravity Systems Types ==============

export interface GravitySystemType {
  id: string;
  name: string;
  progressLevel: ProgressLevel;
  techTracks: TechTrack[];
  /** Percentage of hull required for this system */
  hullPercentage: number;
  /** Whether the size is fixed (true) or scales with hull (false) */
  isFixedSize: boolean;
  /** Cost per hull point of the system */
  costPerHullPoint: number;
  powerRequired: number;
  description: string;
}

export interface InstalledGravitySystem {
  id: string;
  type: GravitySystemType;
  /** Calculated hull points based on hull size and hullPercentage */
  hullPoints: number;
  /** Calculated cost based on hull points and costPerHullPoint */
  cost: number;
}

// ============== Combined Support Systems State ==============

export interface SupportSystemsState {
  lifeSupport: InstalledLifeSupport[];
  accommodations: InstalledAccommodation[];
  storeSystems: InstalledStoreSystem[];
  gravitySystems: InstalledGravitySystem[];
}

// ============== Calculated Stats ==============

export interface SupportSystemsStats {
  // Hull points
  lifeSupportHP: number;
  accommodationsHP: number;
  storeSystemsHP: number;
  gravitySystemsHP: number;
  totalHullPoints: number;
  
  // Power
  lifeSupportPower: number;
  accommodationsPower: number;
  storeSystemsPower: number;
  gravitySystemsPower: number;
  totalPowerRequired: number;
  
  // Cost
  lifeSupportCost: number;
  accommodationsCost: number;
  storeSystemsCost: number;
  gravitySystemsCost: number;
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
  /** Number of people-equivalents saved by 'feeds' systems (e.g., hydroponics) */
  feedsReduction: number;
  recyclingCapacity: number;
  /** Number of people-equivalents saved by 'reduces-consumption' systems (e.g., recyclers) */
  recyclingReduction: number;
  additionalStoresDays: number;
  /** Base store days from accommodations (weighted by person and their storesDaysPerPerson) */
  baseStoreDays: number;
  
  // Gravity
  /** Whether artificial gravity is available based on PL and tech */
  hasArtificialGravity: boolean;
  /** Whether at least one gravity system is installed */
  hasGravitySystemInstalled: boolean;
}
