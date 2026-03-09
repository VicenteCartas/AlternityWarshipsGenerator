import type { Hull } from '../types/hull';
import type { ShipArmor } from '../types/armor';
import type { InstalledPowerPlant, InstalledFuelTank } from '../types/powerPlant';
import type { InstalledEngine, InstalledEngineFuelTank } from '../types/engine';
import type { InstalledFTLDrive, InstalledFTLFuelTank } from '../types/ftlDrive';
import type { InstalledLifeSupport, InstalledAccommodation, InstalledStoreSystem, InstalledGravitySystem, SupportSystemsStats } from '../types/supportSystem';
import type { InstalledWeapon } from '../types/weapon';
import type { OrdnanceDesign, InstalledLaunchSystem, OrdnanceStats } from '../types/ordnance';
import type { InstalledDefenseSystem } from '../types/defense';
import type { InstalledCommandControlSystem } from '../types/commandControl';
import type { InstalledSensor } from '../types/sensor';
import type { InstalledHangarMiscSystem, HangarMiscStats } from '../types/hangarMisc';
import type { SensorStats } from '../types/sensor';
import type { ProgressLevel, TechTrack } from '../types/common';
import { calculateHullStats } from './hullService';
import { calculateMultiLayerArmorHP, calculateMultiLayerArmorCost } from './armorService';
import { calculateTotalPowerPlantStats } from './powerPlantService';
import { calculateTotalEngineStats } from './engineService';
import { calculateTotalFTLStats, calculateTotalFTLFuelTankStats } from './ftlDriveService';
import { calculateSupportSystemsStats } from './supportSystemService';
import { calculateWeaponStats, calculateWeaponMagazineWarheadCost } from './weaponService';
import { calculateOrdnanceStats } from './ordnanceService';
import { calculateDefenseStats } from './defenseService';
import { calculateCommandControlStats, calculateCommandControlLifeSupportCoverageHp } from './commandControlService';
import { calculateSensorStats } from './sensorService';
import { calculateHangarMiscStats } from './hangarMiscService';
import { calculateEmbarkedCraftStats } from './embarkedCraftService';

// ============ INPUT ============

export interface DesignSnapshotInput {
  hull: Hull;
  armorLayers: ShipArmor[];
  installedPowerPlants: InstalledPowerPlant[];
  installedFuelTanks: InstalledFuelTank[];
  installedEngines: InstalledEngine[];
  installedEngineFuelTanks: InstalledEngineFuelTank[];
  installedFTLDrive: InstalledFTLDrive | null;
  installedFTLFuelTanks: InstalledFTLFuelTank[];
  installedLifeSupport: InstalledLifeSupport[];
  installedAccommodations: InstalledAccommodation[];
  installedStoreSystems: InstalledStoreSystem[];
  installedGravitySystems: InstalledGravitySystem[];
  installedWeapons: InstalledWeapon[];
  ordnanceDesigns: OrdnanceDesign[];
  installedLaunchSystems: InstalledLaunchSystem[];
  installedDefenses: InstalledDefenseSystem[];
  installedCommandControl: InstalledCommandControlSystem[];
  installedSensors: InstalledSensor[];
  installedHangarMisc: InstalledHangarMiscSystem[];
  designProgressLevel: ProgressLevel;
  designTechTracks: TechTrack[];
}

// ============ OUTPUT ============

export interface DesignSnapshot {
  totalHP: number;
  usedHP: number;
  remainingHP: number;
  powerGenerated: number;
  enginePowerGenerated: number;
  totalCost: number;
  totalAcceleration: number;

  hpBreakdown: {
    armor: number;
    powerPlants: number;
    engines: number;
    ftlDrive: number;
    supportSystems: number;
    weapons: number;
    defenses: number;
    commandControl: number;
    sensors: number;
    hangarMisc: number;
  };

  powerBreakdown: {
    engines: number;
    ftlDrive: number;
    supportSystems: number;
    weapons: number;
    defenses: number;
    commandControl: number;
    sensors: number;
    hangarMisc: number;
  };

  costBreakdown: {
    hull: number;
    armor: number;
    powerPlants: number;
    engines: number;
    ftlDrive: number;
    supportSystems: number;
    weapons: number;
    defenses: number;
    commandControl: number;
    sensors: number;
    hangarMisc: number;
    embarkedCraft: number;
  };

  // Per-section stats for consumers that need details (PDF, Summary)
  armor: { hp: number; cost: number };
  powerPlants: { hp: number; power: number; cost: number };
  engines: { hp: number; power: number; powerGen: number; cost: number };
  ftl: { hp: number; power: number; cost: number } | null;
  support: { hp: number; power: number; cost: number };
  weapons: { hp: number; power: number; cost: number };
  ordnance: { cost: number };
  defenses: { hp: number; power: number; cost: number };
  commandControl: { hp: number; power: number; cost: number };
  sensors: { hp: number; power: number; cost: number };
  hangarMisc: { hp: number; power: number; cost: number };
  embarkedCraft: { cost: number; invalidFileCount: number };

  // Full subsystem stats needed by validation and PDF detail sections
  supportStats: SupportSystemsStats;
  ordnanceStats: OrdnanceStats;
  sensorStats: SensorStats;
  hangarMiscStats: HangarMiscStats;
}

// ============ COMPUTATION ============

/**
 * Single authoritative computation of all derived design values.
 *
 * Every consumer that needs ship totals (app bar, summary tab, PDF export,
 * clipboard export) must use this function's output to ensure consistency.
 */
export function computeDesignSnapshot(input: DesignSnapshotInput): DesignSnapshot {
  const { hull } = input;
  const totalHP = calculateHullStats(hull).totalHullPoints;

  // ---- Subsystem stats ----
  const armorHP = calculateMultiLayerArmorHP(hull, input.armorLayers);
  const armorCost = calculateMultiLayerArmorCost(hull, input.armorLayers);
  const powerPlantStats = calculateTotalPowerPlantStats(input.installedPowerPlants, input.installedFuelTanks);
  const engineStats = calculateTotalEngineStats(input.installedEngines, input.installedEngineFuelTanks, hull);
  const ftlStats = input.installedFTLDrive
    ? calculateTotalFTLStats(input.installedFTLDrive, hull)
    : { totalHullPoints: 0, totalPowerRequired: 0, totalCost: 0 };
  const ftlFuelStats = calculateTotalFTLFuelTankStats(input.installedFTLFuelTanks);
  const cockpitLifeSupportCoverageHp = calculateCommandControlLifeSupportCoverageHp(input.installedCommandControl);
  const supportStats = calculateSupportSystemsStats(
    input.installedLifeSupport, input.installedAccommodations, input.installedStoreSystems,
    input.installedGravitySystems, input.designProgressLevel, input.designTechTracks,
    cockpitLifeSupportCoverageHp,
  );
  const weaponStats = calculateWeaponStats(input.installedWeapons);
  const weaponMagazineWarheadCost = calculateWeaponMagazineWarheadCost(input.installedWeapons);
  const ordnanceStats = calculateOrdnanceStats(input.installedLaunchSystems, input.ordnanceDesigns);
  const defenseStats = calculateDefenseStats(input.installedDefenses);
  const ccStats = calculateCommandControlStats(input.installedCommandControl, hull.hullPoints);
  const sensorStats = calculateSensorStats(input.installedSensors);
  const hangarMiscStats = calculateHangarMiscStats(input.installedHangarMisc);
  const embarkedCraftStats = calculateEmbarkedCraftStats(input.installedHangarMisc);

  // ---- HP breakdown ----
  const hpBreakdown = {
    armor: armorHP,
    powerPlants: powerPlantStats.totalHullPoints,
    engines: engineStats.totalHullPoints,
    ftlDrive: ftlStats.totalHullPoints + ftlFuelStats.totalHullPoints,
    supportSystems: supportStats.totalHullPoints,
    weapons: weaponStats.totalHullPoints + ordnanceStats.totalLauncherHullPoints,
    defenses: defenseStats.totalHullPoints,
    commandControl: ccStats.totalHullPoints,
    sensors: sensorStats.totalHullPoints,
    hangarMisc: hangarMiscStats.totalHullPoints,
  };

  const usedHP = armorHP
    + powerPlantStats.totalHullPoints
    + engineStats.totalHullPoints
    + ftlStats.totalHullPoints
    + ftlFuelStats.totalHullPoints
    + supportStats.totalHullPoints
    + weaponStats.totalHullPoints
    + ordnanceStats.totalLauncherHullPoints
    + defenseStats.totalHullPoints
    + ccStats.totalHullPoints
    + sensorStats.totalHullPoints
    + hangarMiscStats.totalHullPoints;

  // ---- Power breakdown ----
  const powerBreakdown = {
    engines: engineStats.totalPowerRequired,
    ftlDrive: ftlStats.totalPowerRequired,
    supportSystems: supportStats.totalPowerRequired,
    weapons: weaponStats.totalPowerRequired + ordnanceStats.totalLauncherPower,
    defenses: defenseStats.totalPowerRequired,
    commandControl: ccStats.totalPowerRequired,
    sensors: sensorStats.totalPowerRequired,
    hangarMisc: hangarMiscStats.totalPowerRequired,
  };

  const powerGenerated = powerPlantStats.totalPowerGenerated + engineStats.totalPowerGenerated;

  // ---- Cost breakdown ----
  const costBreakdown = {
    hull: hull.cost,
    armor: armorCost,
    powerPlants: powerPlantStats.totalCost,
    engines: engineStats.totalCost,
    ftlDrive: ftlStats.totalCost + ftlFuelStats.totalCost,
    supportSystems: supportStats.totalCost,
    weapons: weaponStats.totalCost + ordnanceStats.totalCost + weaponMagazineWarheadCost,
    defenses: defenseStats.totalCost,
    commandControl: ccStats.totalCost,
    sensors: sensorStats.totalCost,
    hangarMisc: hangarMiscStats.totalCost,
    embarkedCraft: embarkedCraftStats.totalEmbarkedCost,
  };

  const totalCost = hull.cost + armorCost
    + powerPlantStats.totalCost + engineStats.totalCost
    + ftlStats.totalCost + ftlFuelStats.totalCost
    + supportStats.totalCost
    + weaponStats.totalCost + ordnanceStats.totalCost + weaponMagazineWarheadCost
    + defenseStats.totalCost + ccStats.totalCost
    + sensorStats.totalCost + hangarMiscStats.totalCost
    + embarkedCraftStats.totalEmbarkedCost;

  return {
    totalHP,
    usedHP,
    remainingHP: totalHP - usedHP,
    powerGenerated,
    enginePowerGenerated: engineStats.totalPowerGenerated,
    totalCost,
    totalAcceleration: engineStats.totalAcceleration,

    hpBreakdown,
    powerBreakdown,
    costBreakdown,

    armor: { hp: armorHP, cost: armorCost },
    powerPlants: { hp: powerPlantStats.totalHullPoints, power: powerPlantStats.totalPowerGenerated, cost: powerPlantStats.totalCost },
    engines: { hp: engineStats.totalHullPoints, power: engineStats.totalPowerRequired, powerGen: engineStats.totalPowerGenerated, cost: engineStats.totalCost },
    ftl: input.installedFTLDrive ? {
      hp: ftlStats.totalHullPoints + ftlFuelStats.totalHullPoints,
      power: ftlStats.totalPowerRequired,
      cost: ftlStats.totalCost + ftlFuelStats.totalCost,
    } : null,
    support: { hp: supportStats.totalHullPoints, power: supportStats.totalPowerRequired, cost: supportStats.totalCost },
    weapons: {
      hp: weaponStats.totalHullPoints + ordnanceStats.totalLauncherHullPoints,
      power: weaponStats.totalPowerRequired + ordnanceStats.totalLauncherPower,
      cost: weaponStats.totalCost + ordnanceStats.totalCost + weaponMagazineWarheadCost,
    },
    ordnance: { cost: ordnanceStats.totalOrdnanceCost },
    defenses: { hp: defenseStats.totalHullPoints, power: defenseStats.totalPowerRequired, cost: defenseStats.totalCost },
    commandControl: { hp: ccStats.totalHullPoints, power: ccStats.totalPowerRequired, cost: ccStats.totalCost },
    sensors: { hp: sensorStats.totalHullPoints, power: sensorStats.totalPowerRequired, cost: sensorStats.totalCost },
    hangarMisc: { hp: hangarMiscStats.totalHullPoints, power: hangarMiscStats.totalPowerRequired, cost: hangarMiscStats.totalCost },
    embarkedCraft: { cost: embarkedCraftStats.totalEmbarkedCost, invalidFileCount: embarkedCraftStats.invalidFileCount },

    supportStats,
    ordnanceStats,
    sensorStats,
    hangarMiscStats,
  };
}
