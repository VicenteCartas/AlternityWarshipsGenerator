import type {
  LaunchSystem,
  PropulsionSystem,
  Warhead,
  GuidanceSystem,
  MissileDesign,
  BombDesign,
  MineDesign,
  OrdnanceDesign,
  InstalledLaunchSystem,
  OrdnanceStats,
  OrdnanceSize,
  OrdnanceCategory,
} from '../types/ordnance';
import type { ProgressLevel, TechTrack } from '../types/common';
import { ORDNANCE_SIZE_CAPACITY } from '../types/ordnance';
import {
  getLaunchSystemsData,
  getPropulsionSystemsData,
  getWarheadsData,
  getGuidanceSystemsData,
} from './dataLoader';
import { generateId, filterByDesignConstraints } from './utilities';

// ============== Data Getters ==============

export function getLaunchSystems(): LaunchSystem[] {
  return getLaunchSystemsData();
}

export function getPropulsionSystems(): PropulsionSystem[] {
  return getPropulsionSystemsData();
}

export function getWarheads(): Warhead[] {
  return getWarheadsData();
}

export function getGuidanceSystems(): GuidanceSystem[] {
  return getGuidanceSystemsData();
}

/**
 * Find the propulsion system for a given ordnance category and size.
 * Used for bombs and mines which have a fixed propulsion per category+size.
 */
export function findPropulsionByCategory(
  category: OrdnanceCategory,
  size: OrdnanceSize
): PropulsionSystem | undefined {
  const numericSize = ORDNANCE_SIZE_CAPACITY[size];
  return getPropulsionSystems().find(
    (p) => p.applicableTo.includes(category) && p.size === numericSize
  );
}

// ============== Filtering ==============

export function filterLaunchSystemsByConstraints(
  launchSystems: LaunchSystem[],
  designProgressLevel: ProgressLevel,
  designTechTracks: TechTrack[]
): LaunchSystem[] {
  return filterByDesignConstraints(launchSystems, designProgressLevel, designTechTracks);
}

export function filterPropulsionByConstraints(
  propulsionSystems: PropulsionSystem[],
  designProgressLevel: ProgressLevel,
  designTechTracks: TechTrack[],
  category: OrdnanceCategory
): PropulsionSystem[] {
  return filterByDesignConstraints(propulsionSystems, designProgressLevel, designTechTracks)
    .filter((ps) => ps.applicableTo.includes(category));
}

export function filterWarheadsByConstraints(
  warheads: Warhead[],
  designProgressLevel: ProgressLevel,
  designTechTracks: TechTrack[],
  maxWarheadSize: number
): Warhead[] {
  return filterByDesignConstraints(warheads, designProgressLevel, designTechTracks)
    .filter((wh) => wh.size <= maxWarheadSize);
}

export function filterGuidanceByConstraints(
  guidanceSystems: GuidanceSystem[],
  designProgressLevel: ProgressLevel,
  designTechTracks: TechTrack[],
  category: OrdnanceCategory
): GuidanceSystem[] {
  return filterByDesignConstraints(guidanceSystems, designProgressLevel, designTechTracks)
    .filter((gs) => gs.applicableTo.includes(category));
}

// ============== Design Calculations ==============

/**
 * Calculate ordnance design stats from its components.
 * Sums accuracy and cost from all components; capacity comes from propulsion size.
 */
function calculateOrdnanceComponents(
  ...components: { accuracyModifier: number; cost: number }[]
): { totalAccuracy: number; totalCost: number } {
  let totalAccuracy = 0;
  let totalCost = 0;
  for (const c of components) {
    totalAccuracy += c.accuracyModifier;
    totalCost += c.cost;
  }
  return { totalAccuracy, totalCost };
}

export function calculateMissileDesign(
  propulsion: PropulsionSystem,
  guidance: GuidanceSystem,
  warhead: Warhead
): { totalAccuracy: number; totalCost: number; capacityRequired: number } {
  return { ...calculateOrdnanceComponents(propulsion, guidance, warhead), capacityRequired: propulsion.size };
}

export function calculateBombDesign(
  propulsion: PropulsionSystem,
  warhead: Warhead
): { totalAccuracy: number; totalCost: number; capacityRequired: number } {
  return { ...calculateOrdnanceComponents(propulsion, warhead), capacityRequired: propulsion.size };
}

export function calculateMineDesign(
  propulsion: PropulsionSystem,
  guidance: GuidanceSystem,
  warhead: Warhead
): { totalAccuracy: number; totalCost: number; capacityRequired: number } {
  return { ...calculateOrdnanceComponents(propulsion, guidance, warhead), capacityRequired: propulsion.size };
}

// ============== Launch System Calculations ==============

export function calculateLaunchSystemStats(
  launchSystem: LaunchSystem,
  quantity: number,
  extraHp: number
): { hullPoints: number; powerRequired: number; cost: number; totalCapacity: number } {
  let hullPoints = launchSystem.hullPoints * quantity;
  let cost = launchSystem.cost * quantity;
  let totalCapacity = launchSystem.capacity * quantity;

  // Add extra HP for expansion if expandable
  if (launchSystem.expandable && extraHp > 0) {
    const extraCapacity = extraHp * (launchSystem.expansionValuePerHp || 0);
    const extraCost = extraHp * (launchSystem.expansionCostPerHp || 0);
    hullPoints += extraHp;
    cost += extraCost;
    totalCapacity += extraCapacity;
  }

  const powerRequired = launchSystem.powerRequired * quantity;

  return { hullPoints, powerRequired, cost, totalCapacity };
}

export function getUsedCapacity(
  loadout: { designId: string; quantity: number }[],
  designs: OrdnanceDesign[]
): number {
  return loadout.reduce((sum, item) => {
    const design = designs.find((d) => d.id === item.designId);
    if (!design) return sum;
    return sum + design.capacityRequired * item.quantity;
  }, 0);
}

export function getRemainingCapacity(
  totalCapacity: number,
  loadout: { designId: string; quantity: number }[],
  designs: OrdnanceDesign[]
): number {
  return totalCapacity - getUsedCapacity(loadout, designs);
}

// ============== Ordnance Stats ==============

export function calculateOrdnanceStats(
  installedLaunchSystems: InstalledLaunchSystem[],
  designs: OrdnanceDesign[]
): OrdnanceStats {
  const launchSystems = getLaunchSystems();

  let totalLauncherHullPoints = 0;
  let totalLauncherPower = 0;
  let totalLauncherCost = 0;
  let totalOrdnanceCost = 0;

  for (const installed of installedLaunchSystems) {
    const launchSystem = launchSystems.find(
      (ls) => ls.id === installed.launchSystemType
    );
    if (!launchSystem) continue;

    const stats = calculateLaunchSystemStats(
      launchSystem,
      installed.quantity,
      installed.extraHp
    );

    totalLauncherHullPoints += stats.hullPoints;
    totalLauncherPower += stats.powerRequired;
    totalLauncherCost += stats.cost;

    // Calculate ordnance cost
    for (const loadedItem of installed.loadout || []) {
      const design = designs.find((d) => d.id === loadedItem.designId);
      if (design) {
        totalOrdnanceCost += design.totalCost * loadedItem.quantity;
      }
    }
  }

  return {
    totalLauncherHullPoints,
    totalLauncherPower,
    totalLauncherCost,
    totalOrdnanceCost,
    totalCost: totalLauncherCost + totalOrdnanceCost,
    missileDesignCount: designs.filter((d) => d.category === 'missile').length,
    bombDesignCount: designs.filter((d) => d.category === 'bomb').length,
    mineDesignCount: designs.filter((d) => d.category === 'mine').length,
    launchSystemCount: installedLaunchSystems.reduce(
      (sum, ls) => sum + ls.quantity,
      0
    ),
  };
}

// ============== ID Generation ==============

export function generateOrdnanceDesignId(): string {
  return generateId('ordnance-design');
}

export function generateLaunchSystemId(): string {
  return generateId('launch-system');
}

// ============== Design Creation Helpers ==============

export function createMissileDesign(
  name: string,
  size: OrdnanceSize,
  propulsionId: string,
  guidanceId: string,
  warheadId: string
): MissileDesign | null {
  const propulsion = getPropulsionSystems().find((p) => p.id === propulsionId);
  const guidance = getGuidanceSystems().find((g) => g.id === guidanceId);
  const warhead = getWarheads().find((w) => w.id === warheadId);

  if (!propulsion || !guidance || !warhead) return null;

  const { totalAccuracy, totalCost, capacityRequired } = calculateMissileDesign(
    propulsion,
    guidance,
    warhead
  );

  return {
    id: generateOrdnanceDesignId(),
    name,
    category: 'missile',
    size,
    propulsionId,
    guidanceId,
    warheadId,
    totalAccuracy,
    totalCost,
    capacityRequired,
  };
}

export function createBombDesign(
  name: string,
  size: OrdnanceSize,
  warheadId: string
): BombDesign | null {
  // Find the matching bomb casing propulsion
  const propulsion = findPropulsionByCategory('bomb', size);
  const warhead = getWarheads().find((w) => w.id === warheadId);

  if (!propulsion || !warhead) return null;

  const { totalAccuracy, totalCost, capacityRequired } = calculateBombDesign(
    propulsion,
    warhead
  );

  return {
    id: generateOrdnanceDesignId(),
    name,
    category: 'bomb',
    size,
    warheadId,
    totalAccuracy,
    totalCost,
    capacityRequired,
  };
}

export function createMineDesign(
  name: string,
  size: OrdnanceSize,
  guidanceId: string,
  warheadId: string
): MineDesign | null {
  // Find the matching mine casing propulsion
  const propulsion = findPropulsionByCategory('mine', size);
  const guidance = getGuidanceSystems().find((g) => g.id === guidanceId);
  const warhead = getWarheads().find((w) => w.id === warheadId);

  if (!propulsion || !guidance || !warhead) return null;

  const { totalAccuracy, totalCost, capacityRequired } = calculateMineDesign(
    propulsion,
    guidance,
    warhead
  );

  return {
    id: generateOrdnanceDesignId(),
    name,
    category: 'mine',
    size,
    guidanceId,
    warheadId,
    totalAccuracy,
    totalCost,
    capacityRequired,
  };
}

// ============== Installed Launch System Helpers ==============

export function createInstalledLaunchSystem(
  launchSystemType: string,
  quantity: number,
  extraHp: number = 0
): InstalledLaunchSystem | null {
  const launchSystem = getLaunchSystems().find(
    (ls) => ls.id === launchSystemType
  );
  if (!launchSystem) return null;

  const stats = calculateLaunchSystemStats(launchSystem, quantity, extraHp);

  return {
    id: generateLaunchSystemId(),
    launchSystemType: launchSystem.id,
    quantity,
    extraHp,
    loadout: [],
    hullPoints: stats.hullPoints,
    powerRequired: stats.powerRequired,
    cost: stats.cost,
    totalCapacity: stats.totalCapacity,
  };
}

// ============== Loadout Helpers ==============

export function canLoadOrdnance(
  launchSystem: InstalledLaunchSystem,
  design: OrdnanceDesign,
  quantity: number,
  allDesigns: OrdnanceDesign[]
): boolean {
  const launchSystemDef = getLaunchSystems().find(
    (ls) => ls.id === launchSystem.launchSystemType
  );
  if (!launchSystemDef) return false;

  // Check if this launch system can carry this ordnance type
  if (!launchSystemDef.ordnanceTypes.includes(design.category)) {
    return false;
  }

  // Check capacity
  const remainingCapacity = getRemainingCapacity(
    launchSystem.totalCapacity,
    launchSystem.loadout,
    allDesigns
  );

  return design.capacityRequired * quantity <= remainingCapacity;
}

export function addOrdnanceToLoadout(
  launchSystem: InstalledLaunchSystem,
  designId: string,
  quantity: number
): InstalledLaunchSystem {
  const existingItem = launchSystem.loadout.find(
    (item) => item.designId === designId
  );

  if (existingItem) {
    return {
      ...launchSystem,
      loadout: launchSystem.loadout.map((item) =>
        item.designId === designId
          ? { ...item, quantity: item.quantity + quantity }
          : item
      ),
    };
  } else {
    return {
      ...launchSystem,
      loadout: [...launchSystem.loadout, { designId, quantity }],
    };
  }
}

export function removeOrdnanceFromLoadout(
  launchSystem: InstalledLaunchSystem,
  designId: string,
  quantity?: number
): InstalledLaunchSystem {
  if (quantity === undefined) {
    // Remove all of this design
    return {
      ...launchSystem,
      loadout: launchSystem.loadout.filter(
        (item) => item.designId !== designId
      ),
    };
  }

  const existingItem = launchSystem.loadout.find(
    (item) => item.designId === designId
  );
  if (!existingItem) return launchSystem;

  const newQuantity = existingItem.quantity - quantity;
  if (newQuantity <= 0) {
    return {
      ...launchSystem,
      loadout: launchSystem.loadout.filter(
        (item) => item.designId !== designId
      ),
    };
  }

  return {
    ...launchSystem,
    loadout: launchSystem.loadout.map((item) =>
      item.designId === designId ? { ...item, quantity: newQuantity } : item
    ),
  };
}

// ============== Design Lookup Helpers ==============

export function getDesignById(
  designs: OrdnanceDesign[],
  id: string
): OrdnanceDesign | undefined {
  return designs.find((d) => d.id === id);
}

export function getDesignDisplayName(design: OrdnanceDesign): string {
  return design.name;
}

export function getDesignSummary(design: OrdnanceDesign): string {
  const warheads = getWarheads();
  const guidanceSystems = getGuidanceSystems();
  const propulsionSystems = getPropulsionSystems();

  const warhead = warheads.find((w) => w.id === design.warheadId);

  if (design.category === 'missile') {
    const propulsion = propulsionSystems.find(
      (p) => p.id === (design as MissileDesign).propulsionId
    );
    const guidance = guidanceSystems.find(
      (g) => g.id === (design as MissileDesign).guidanceId
    );
    return `${propulsion?.name || '?'} / ${guidance?.name || '?'} / ${warhead?.name || '?'}`;
  } else if (design.category === 'bomb') {
    return `${design.size} bomb / ${warhead?.name || '?'}`;
  } else {
    const guidance = guidanceSystems.find(
      (g) => g.id === (design as MineDesign).guidanceId
    );
    return `${design.size} mine / ${guidance?.name || '?'} / ${warhead?.name || '?'}`;
  }
}
