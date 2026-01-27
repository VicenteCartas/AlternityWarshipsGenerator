import type { ProgressLevel, TechTrack } from '../types/common';
import type {
  LifeSupportType,
  AccommodationType,
  StoreSystemType,
  InstalledLifeSupport,
  InstalledAccommodation,
  InstalledStoreSystem,
  SupportSystemsStats,
} from '../types/supportSystem';

// ============== Data Loading ==============

let lifeSupportTypes: LifeSupportType[] = [];
let accommodationTypes: AccommodationType[] = [];
let storeSystemTypes: StoreSystemType[] = [];

export function loadSupportSystemsData(data: {
  lifeSupport: LifeSupportType[];
  accommodations: AccommodationType[];
  storeSystems: StoreSystemType[];
}): void {
  lifeSupportTypes = data.lifeSupport;
  accommodationTypes = data.accommodations;
  storeSystemTypes = data.storeSystems;
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

export function getLifeSupportTypeById(id: string): LifeSupportType | undefined {
  return lifeSupportTypes.find((t) => t.id === id);
}

export function getAccommodationTypeById(id: string): AccommodationType | undefined {
  return accommodationTypes.find((t) => t.id === id);
}

export function getStoreSystemTypeById(id: string): StoreSystemType | undefined {
  return storeSystemTypes.find((t) => t.id === id);
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

export function generateLifeSupportId(): string {
  return `ls-${Date.now()}-${++lifeSupportCounter}`;
}

export function generateAccommodationId(): string {
  return `acc-${Date.now()}-${++accommodationCounter}`;
}

export function generateStoreSystemId(): string {
  return `store-${Date.now()}-${++storeSystemCounter}`;
}

// ============== Calculations ==============

export function calculateSupportSystemsStats(
  lifeSupport: InstalledLifeSupport[],
  accommodations: InstalledAccommodation[],
  storeSystems: InstalledStoreSystem[],
  designProgressLevel: ProgressLevel,
  designTechTracks: TechTrack[]
): SupportSystemsStats {
  // Life Support stats
  let lifeSupportHP = 0;
  let lifeSupportPower = 0;
  let lifeSupportCost = 0;
  let totalHullPointsCovered = 0;
  let recyclingFromLifeSupport = 0;

  for (const ls of lifeSupport) {
    lifeSupportHP += ls.type.hullPoints * ls.quantity;
    lifeSupportPower += ls.type.powerRequired * ls.quantity;
    lifeSupportCost += ls.type.cost * ls.quantity;
    totalHullPointsCovered += ls.type.hullPointsCovered * ls.quantity;
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

  for (const acc of accommodations) {
    accommodationsHP += acc.type.hullPoints * acc.quantity;
    accommodationsPower += acc.type.powerRequired * acc.quantity;
    accommodationsCost += acc.type.cost * acc.quantity;
    
    const capacity = acc.type.capacity * acc.quantity;
    switch (acc.type.category) {
      case 'crew':
        crewCapacity += capacity;
        break;
      case 'passenger':
        passengerCapacity += capacity;
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
  let recyclingFromStores = 0;
  let additionalStoresDays = 0;

  for (const store of storeSystems) {
    storeSystemsHP += store.type.hullPoints * store.quantity;
    storeSystemsPower += store.type.powerRequired * store.quantity;
    storeSystemsCost += store.type.cost * store.quantity;
    
    switch (store.type.effect) {
      case 'feeds':
        peopleFed += store.type.effectValue * store.quantity;
        break;
      case 'reduces-consumption':
        // Recycling capacity is cumulative
        recyclingFromStores += (store.type.affectedPeople || 0) * store.quantity;
        break;
      case 'adds-stores':
        additionalStoresDays += store.type.effectValue * store.quantity;
        break;
    }
  }

  // Artificial gravity: available at PL7+ with G-tech, or PL8+ with X-tech
  const hasGravityTech = designTechTracks.length === 0 || designTechTracks.includes('G');
  const hasEnergyTech = designTechTracks.length === 0 || designTechTracks.includes('X');
  const hasArtificialGravity = 
    (designProgressLevel >= 7 && hasGravityTech) ||
    (designProgressLevel >= 8 && hasEnergyTech);

  return {
    lifeSupportHP,
    accommodationsHP,
    storeSystemsHP,
    totalHullPoints: lifeSupportHP + accommodationsHP + storeSystemsHP,
    
    lifeSupportPower,
    accommodationsPower,
    storeSystemsPower,
    totalPowerRequired: lifeSupportPower + accommodationsPower + storeSystemsPower,
    
    lifeSupportCost,
    accommodationsCost,
    storeSystemsCost,
    totalCost: lifeSupportCost + accommodationsCost + storeSystemsCost,
    
    totalHullPointsCovered,
    
    crewCapacity,
    passengerCapacity,
    suspendedCapacity,
    totalCapacity: crewCapacity + passengerCapacity + suspendedCapacity,
    freeAirlocks,
    
    peopleFed,
    recyclingCapacity: recyclingFromLifeSupport + recyclingFromStores,
    additionalStoresDays,
    
    hasArtificialGravity,
  };
}
