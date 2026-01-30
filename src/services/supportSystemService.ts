import type { ProgressLevel, TechTrack } from '../types/common';
import type {
  LifeSupportType,
  AccommodationType,
  StoreSystemType,
  GravitySystemType,
  InstalledLifeSupport,
  InstalledAccommodation,
  InstalledStoreSystem,
  InstalledGravitySystem,
  SupportSystemsStats,
} from '../types/supportSystem';

// ============== Data Loading ==============

let lifeSupportTypes: LifeSupportType[] = [];
let accommodationTypes: AccommodationType[] = [];
let storeSystemTypes: StoreSystemType[] = [];
let gravitySystemTypes: GravitySystemType[] = [];

export function loadSupportSystemsData(data: {
  lifeSupport: LifeSupportType[];
  accommodations: AccommodationType[];
  storeSystems: StoreSystemType[];
  gravitySystems?: GravitySystemType[];
}): void {
  lifeSupportTypes = data.lifeSupport;
  accommodationTypes = data.accommodations;
  storeSystemTypes = data.storeSystems;
  gravitySystemTypes = data.gravitySystems || [];
}

// ============== Getters ==============

export function getAllLifeSupportTypes(): LifeSupportType[] {
  return lifeSupportTypes;
}

export function getAllAccommodationTypes(): AccommodationType[] {
  return accommodationTypes;
}

export function getAllStoreSystemTypes(): StoreSystemType[] {
  return storeSystemTypes;
}

export function getAllGravitySystemTypes(): GravitySystemType[] {
  return gravitySystemTypes;
}

export function getLifeSupportTypeById(id: string): LifeSupportType | undefined {
  return lifeSupportTypes.find((t) => t.id === id);
}

export function getAccommodationTypeById(id: string): AccommodationType | undefined {
  return accommodationTypes.find((t) => t.id === id);
}

export function getStoreSystemTypeById(id: string): StoreSystemType | undefined {
  return storeSystemTypes.find((t) => t.id === id);
}

export function getGravitySystemTypeById(id: string): GravitySystemType | undefined {
  return gravitySystemTypes.find((t) => t.id === id);
}

// ============== Filtering ==============

export function filterByDesignConstraints<T extends { progressLevel: ProgressLevel; techTracks: TechTrack[] }>(
  items: T[],
  designProgressLevel: ProgressLevel,
  designTechTracks: TechTrack[]
): T[] {
  return items.filter((item) => {
    // Filter by progress level
    if (item.progressLevel > designProgressLevel) {
      return false;
    }
    // Filter by tech tracks (if any are selected)
    if (designTechTracks.length > 0 && item.techTracks.length > 0) {
      const hasAllowedTech = item.techTracks.every((track) =>
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

let lifeSupportCounter = 0;
let accommodationCounter = 0;
let storeSystemCounter = 0;
let gravitySystemCounter = 0;

export function generateLifeSupportId(): string {
  return `ls-${Date.now()}-${++lifeSupportCounter}`;
}

export function generateAccommodationId(): string {
  return `acc-${Date.now()}-${++accommodationCounter}`;
}

export function generateStoreSystemId(): string {
  return `store-${Date.now()}-${++storeSystemCounter}`;
}

export function generateGravitySystemId(): string {
  return `grav-${Date.now()}-${++gravitySystemCounter}`;
}

// ============== Gravity System Calculations ==============

export function calculateGravitySystemHullPoints(
  gravityType: GravitySystemType,
  totalHullPoints: number
): number {
  return Math.ceil(totalHullPoints * (gravityType.hullPercentage / 100));
}

export function calculateGravitySystemCost(
  gravityType: GravitySystemType,
  hullPoints: number
): number {
  return hullPoints * gravityType.costPerHullPoint;
}

// ============== Calculations ==============

export function calculateSupportSystemsStats(
  lifeSupport: InstalledLifeSupport[],
  accommodations: InstalledAccommodation[],
  storeSystems: InstalledStoreSystem[],
  gravitySystems: InstalledGravitySystem[],
  designProgressLevel: ProgressLevel,
  designTechTracks: TechTrack[]
): SupportSystemsStats {
  // Life Support stats
  let lifeSupportHP = 0;
  let lifeSupportPower = 0;
  let lifeSupportCost = 0;
  let totalCoverage = 0;
  let recyclingFromLifeSupport = 0;

  for (const ls of lifeSupport) {
    lifeSupportHP += ls.type.hullPoints * ls.quantity;
    lifeSupportPower += ls.type.powerRequired * ls.quantity;
    lifeSupportCost += ls.type.cost * ls.quantity;
    totalCoverage += ls.type.coveragePerHullPoint * ls.quantity;
    if (ls.type.recyclingCapacity) {
      recyclingFromLifeSupport += ls.type.recyclingCapacity * ls.quantity;
    }
  }

  // Accommodation stats
  let accommodationsHP = 0;
  let accommodationsPower = 0;
  let accommodationsCost = 0;
  let crewCapacity = 0;
  let passengerCapacity = 0;
  let suspendedCapacity = 0;
  let freeAirlocks = 0;
  let baseStoreDays = 0;

  for (const acc of accommodations) {
    accommodationsHP += acc.type.hullPoints * acc.quantity;
    accommodationsPower += acc.type.powerRequired * acc.quantity;
    accommodationsCost += acc.type.cost * acc.quantity;
    
    const capacity = acc.type.capacity * acc.quantity;
    switch (acc.type.category) {
      case 'crew':
        crewCapacity += capacity;
        // Only crew and passengers count for stores (not suspended/cryo)
        baseStoreDays += capacity * acc.type.storesDaysPerPerson;
        break;
      case 'passenger':
        passengerCapacity += capacity;
        // Only crew and passengers count for stores (not suspended/cryo)
        baseStoreDays += capacity * acc.type.storesDaysPerPerson;
        break;
      case 'suspended':
        suspendedCapacity += capacity;
        break;
    }
    
    if (acc.type.includesAirlock) {
      freeAirlocks += acc.quantity;
    }
  }

  // Store System stats
  let storeSystemsHP = 0;
  let storeSystemsPower = 0;
  let storeSystemsCost = 0;
  let peopleFed = 0;
  let feedsReduction = 0;
  let recyclingCapacity = 0;
  let recyclingReduction = 0;
  let additionalStoresDays = 0;

  for (const store of storeSystems) {
    storeSystemsHP += store.type.hullPoints * store.quantity;
    storeSystemsPower += store.type.powerRequired * store.quantity;
    storeSystemsCost += store.type.cost * store.quantity;
    
    switch (store.type.effect) {
      case 'feeds': {
        // effectValue people are considered as 1 for stores calculation
        // So if effectValue=10 and quantity=2, 20 people are fed but count as 2 for stores
        // Reduction = peopleFed - (peopleFed / effectValue) = peopleFed * (effectValue - 1) / effectValue
        const fed = store.type.effectValue * store.quantity;
        peopleFed += fed;
        feedsReduction += fed - (fed / store.type.effectValue);
        break;
      }
      case 'reduces-consumption': {
        // effectValue is the % consumption rate (e.g., 10 = 10% consumption)
        // affectedPeople is how many people each unit affects
        // Example: 15 recyclers * 20 affectedPeople = 300 people at 10% consumption
        // Those 300 people consume like 30 people, saving 270 person-equivalents
        const affected = (store.type.affectedPeople || 0) * store.quantity;
        const reductionRate = 1 - (store.type.effectValue / 100);
        recyclingCapacity += affected;
        recyclingReduction += affected * reductionRate;
        break;
      }
      case 'adds-stores':
        additionalStoresDays += store.type.effectValue * store.quantity;
        break;
    }
  }

  // Gravity System stats
  let gravitySystemsHP = 0;
  let gravitySystemsPower = 0;
  let gravitySystemsCost = 0;

  for (const grav of gravitySystems) {
    gravitySystemsHP += grav.hullPoints;
    gravitySystemsPower += grav.type.powerRequired;
    gravitySystemsCost += grav.cost;
  }

  // Gravity system check
  const hasGravitySystemInstalled = gravitySystems.length > 0;
  
  // Artificial gravity: available at PL7+ with G-tech, or PL8+ with X-tech, or via spin system
  const hasGravityTech = designTechTracks.length === 0 || designTechTracks.includes('G');
  const hasEnergyTech = designTechTracks.length === 0 || designTechTracks.includes('X');
  const hasArtificialGravity = 
    (designProgressLevel >= 7 && hasGravityTech) ||
    (designProgressLevel >= 8 && hasEnergyTech);

  return {
    lifeSupportHP,
    accommodationsHP,
    storeSystemsHP,
    gravitySystemsHP,
    totalHullPoints: lifeSupportHP + accommodationsHP + storeSystemsHP + gravitySystemsHP,
    
    lifeSupportPower,
    accommodationsPower,
    storeSystemsPower,
    gravitySystemsPower,
    totalPowerRequired: lifeSupportPower + accommodationsPower + storeSystemsPower + gravitySystemsPower,
    
    lifeSupportCost,
    accommodationsCost,
    storeSystemsCost,
    gravitySystemsCost,
    totalCost: lifeSupportCost + accommodationsCost + storeSystemsCost + gravitySystemsCost,
    
    totalCoverage,
    
    crewCapacity,
    passengerCapacity,
    suspendedCapacity,
    totalCapacity: crewCapacity + passengerCapacity + suspendedCapacity,
    freeAirlocks,
    
    peopleFed,
    feedsReduction,
    recyclingCapacity: recyclingFromLifeSupport + recyclingCapacity,
    recyclingReduction,
    additionalStoresDays,
    baseStoreDays,
    
    hasArtificialGravity,
    hasGravitySystemInstalled,
  };
}
