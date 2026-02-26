import { useMemo } from 'react';
import type { Hull } from '../types/hull';
import type { ShipArmor } from '../types/armor';
import type { InstalledPowerPlant, InstalledFuelTank } from '../types/powerPlant';
import type { InstalledEngine, InstalledEngineFuelTank } from '../types/engine';
import type { InstalledFTLDrive, InstalledFTLFuelTank } from '../types/ftlDrive';
import type { InstalledLifeSupport, InstalledAccommodation, InstalledStoreSystem, InstalledGravitySystem } from '../types/supportSystem';
import type { InstalledWeapon } from '../types/weapon';
import type { OrdnanceDesign, InstalledLaunchSystem } from '../types/ordnance';
import type { InstalledDefenseSystem } from '../types/defense';
import type { InstalledCommandControlSystem } from '../types/commandControl';
import type { InstalledSensor } from '../types/sensor';
import type { InstalledHangarMiscSystem } from '../types/hangarMisc';
import type { ProgressLevel, TechTrack, StepDef } from '../types/common';
import { calculateHullStats } from '../services/hullService';
import { calculateMultiLayerArmorHP, calculateMultiLayerArmorCost } from '../services/armorService';
import { calculateTotalPowerPlantStats } from '../services/powerPlantService';
import { calculateTotalEngineStats } from '../services/engineService';
import { calculateTotalFTLStats, calculateTotalFTLFuelTankStats } from '../services/ftlDriveService';
import { calculateSupportSystemsStats } from '../services/supportSystemService';
import { calculateWeaponStats } from '../services/weaponService';
import { calculateOrdnanceStats } from '../services/ordnanceService';
import { calculateDefenseStats } from '../services/defenseService';
import { calculateCommandControlStats, getWeaponBatteries, batteryHasFireControl, getOrphanedFireControls, getOrphanedSensorControls, sensorHasSensorControl } from '../services/commandControlService';
import { calculateSensorStats } from '../services/sensorService';
import { calculateHangarMiscStats } from '../services/hangarMiscService';

export interface PowerScenario {
  engines: boolean;
  ftlDrive: boolean;
  supportSystems: boolean;
  weapons: boolean;
  defenses: boolean;
  commandControl: boolean;
  sensors: boolean;
  hangarMisc: boolean;
}

export interface DesignCalculationsInput {
  selectedHull: Hull | null;
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
  powerScenario: PowerScenario;
  steps: StepDef[];
  surfaceProvidesLifeSupport: boolean;
}

const EMPTY_POWER = { engines: 0, ftlDrive: 0, supportSystems: 0, weapons: 0, defenses: 0, commandControl: 0, sensors: 0, hangarMisc: 0 };
const EMPTY_HP = { armor: 0, powerPlants: 0, engines: 0, ftlDrive: 0, supportSystems: 0, weapons: 0, defenses: 0, commandControl: 0, sensors: 0, hangarMisc: 0 };
const EMPTY_COST = { hull: 0, armor: 0, powerPlants: 0, engines: 0, ftlDrive: 0, supportSystems: 0, weapons: 0, defenses: 0, commandControl: 0, sensors: 0, hangarMisc: 0 };

/**
 * Computes all derived design values (HP usage, power budget, cost breakdown,
 * summary validation, tech tracks) from the current warship state.
 *
 * Returns a single memoized object that recalculates only when inputs change.
 */
export function useDesignCalculations(input: DesignCalculationsInput) {
  const {
    selectedHull,
    armorLayers,
    installedPowerPlants,
    installedFuelTanks,
    installedEngines,
    installedEngineFuelTanks,
    installedFTLDrive,
    installedFTLFuelTanks,
    installedLifeSupport,
    installedAccommodations,
    installedStoreSystems,
    installedGravitySystems,
    installedWeapons,
    ordnanceDesigns,
    installedLaunchSystems,
    installedDefenses,
    installedCommandControl,
    installedSensors,
    installedHangarMisc,
    designProgressLevel,
    designTechTracks,
    powerScenario,
    steps,
    surfaceProvidesLifeSupport,
  } = input;

  return useMemo(() => {
    if (!selectedHull) {
      return {
        usedHullPointsBeforePowerPlants: 0,
        usedHullPointsBeforeEngines: 0,
        remainingHullPoints: 0,
        totalHullPoints: 0,
        totalPower: 0,
        totalPowerConsumed: 0,
        totalCost: 0,
        powerBreakdown: EMPTY_POWER,
        hpBreakdown: EMPTY_HP,
        costBreakdown: EMPTY_COST,
        summaryValidationState: 'error' as const,
        uniqueTechTracks: [] as TechTrack[],
        totalPassengersAndSuspended: 0,
      };
    }

    const hull = selectedHull;
    const totalHullPoints = calculateHullStats(hull).totalHullPoints;

    // ---- Subsystem stats (computed once, reused across breakdowns) ----
    const armorHP = calculateMultiLayerArmorHP(hull, armorLayers);
    const armorCost = calculateMultiLayerArmorCost(hull, armorLayers);
    const powerPlantStats = calculateTotalPowerPlantStats(installedPowerPlants, installedFuelTanks);
    const engineStats = calculateTotalEngineStats(installedEngines, installedEngineFuelTanks, hull);
    const ftlStats = installedFTLDrive
      ? calculateTotalFTLStats(installedFTLDrive, hull)
      : { totalHullPoints: 0, totalPowerRequired: 0, totalCost: 0 };
    const ftlFuelStats = calculateTotalFTLFuelTankStats(installedFTLFuelTanks);
    const supportStats = calculateSupportSystemsStats(
      installedLifeSupport, installedAccommodations, installedStoreSystems,
      installedGravitySystems, designProgressLevel, designTechTracks,
    );
    const weaponStats = calculateWeaponStats(installedWeapons);
    const ordnanceStats = calculateOrdnanceStats(installedLaunchSystems, ordnanceDesigns);
    const defenseStats = calculateDefenseStats(installedDefenses);
    const ccStats = calculateCommandControlStats(installedCommandControl, hull.hullPoints);
    const sensorStats = calculateSensorStats(installedSensors);
    const hangarMiscStats = calculateHangarMiscStats(installedHangarMisc);

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

    const usedHullPointsBeforePowerPlants = armorHP;
    const usedHullPointsBeforeEngines = armorHP + powerPlantStats.totalHullPoints;

    const remainingHullPoints = totalHullPoints
      - armorHP
      - powerPlantStats.totalHullPoints
      - engineStats.totalHullPoints
      - ftlStats.totalHullPoints
      - ftlFuelStats.totalHullPoints
      - supportStats.totalHullPoints
      - weaponStats.totalHullPoints
      - ordnanceStats.totalLauncherHullPoints
      - defenseStats.totalHullPoints
      - ccStats.totalHullPoints
      - sensorStats.totalHullPoints
      - hangarMiscStats.totalHullPoints;

    // ---- Power breakdown ----
    const totalPower = powerPlantStats.totalPowerGenerated;

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

    let totalPowerConsumed = 0;
    if (powerScenario.engines) totalPowerConsumed += powerBreakdown.engines;
    if (powerScenario.ftlDrive) totalPowerConsumed += powerBreakdown.ftlDrive;
    if (powerScenario.supportSystems) totalPowerConsumed += powerBreakdown.supportSystems;
    if (powerScenario.weapons) totalPowerConsumed += powerBreakdown.weapons;
    if (powerScenario.defenses) totalPowerConsumed += powerBreakdown.defenses;
    if (powerScenario.commandControl) totalPowerConsumed += powerBreakdown.commandControl;
    if (powerScenario.sensors) totalPowerConsumed += powerBreakdown.sensors;
    if (powerScenario.hangarMisc) totalPowerConsumed += powerBreakdown.hangarMisc;

    // ---- Cost breakdown ----
    const costBreakdown = {
      hull: hull.cost,
      armor: armorCost,
      powerPlants: powerPlantStats.totalCost,
      engines: engineStats.totalCost,
      ftlDrive: ftlStats.totalCost + ftlFuelStats.totalCost,
      supportSystems: supportStats.totalCost,
      weapons: weaponStats.totalCost + ordnanceStats.totalCost,
      defenses: defenseStats.totalCost,
      commandControl: ccStats.totalCost,
      sensors: sensorStats.totalCost,
      hangarMisc: hangarMiscStats.totalCost,
    };

    const totalCost = hull.cost + armorCost
      + powerPlantStats.totalCost + engineStats.totalCost
      + ftlStats.totalCost + ftlFuelStats.totalCost
      + supportStats.totalCost
      + weaponStats.totalCost + ordnanceStats.totalCost
      + defenseStats.totalCost + ccStats.totalCost
      + sensorStats.totalCost + hangarMiscStats.totalCost;

    // ---- Summary validation state ----
    let summaryValidationState: 'valid' | 'error' | 'warning' = 'valid';

    // Errors
    if (remainingHullPoints < 0) {
      summaryValidationState = 'error';
    } else if (installedPowerPlants.length === 0) {
      summaryValidationState = 'error';
    } else {
      const enginesRequired = steps.some(s => s.id === 'engines' && s.required);
      if (enginesRequired && installedEngines.length === 0) {
        summaryValidationState = 'error';
      }
    }

    // Warnings (only check if no errors)
    if (summaryValidationState !== 'error') {
      const ftlPower = ftlStats.totalPowerRequired;
      const powerConsumedWithoutFTL = totalPowerConsumed - ftlPower;
      if (powerConsumedWithoutFTL > totalPower) {
        summaryValidationState = 'warning';
      } else if (supportStats.crewCapacity < hull.crew) {
        summaryValidationState = 'warning';
      } else if (!surfaceProvidesLifeSupport && supportStats.totalCoverage < hull.hullPoints) {
        summaryValidationState = 'warning';
      } else if (hangarMiscStats.totalEvacCapacity < hull.crew + supportStats.troopCapacity) {
        summaryValidationState = 'warning';
      } else if (installedLaunchSystems.filter(ls => !ls.loadout || ls.loadout.length === 0).length > 0) {
        summaryValidationState = 'warning';
      } else if (!sensorStats.hasBasicSensors && installedSensors.length > 0) {
        summaryValidationState = 'warning';
      } else {
        // Fire control / sensor control linking checks
        const batteries = getWeaponBatteries(installedWeapons, installedLaunchSystems);
        const hasUnlinkedBatteries = batteries.some(b => !batteryHasFireControl(b.key, installedCommandControl));
        const hasOrphanedFC = getOrphanedFireControls(installedCommandControl, installedWeapons, installedLaunchSystems).length > 0;
        const hasUnlinkedSensors = installedSensors.some(s => !sensorHasSensorControl(s.id, installedCommandControl));
        const hasOrphanedSC = getOrphanedSensorControls(installedCommandControl, installedSensors).length > 0;

        if (hasUnlinkedBatteries || hasOrphanedFC || hasUnlinkedSensors || hasOrphanedSC) {
          summaryValidationState = 'warning';
        } else {
          const hasFtlStep = steps.some(s => s.id === 'ftl');
          if (
            armorLayers.length === 0 ||
            (hasFtlStep && !installedFTLDrive) ||
            installedDefenses.length === 0 ||
            installedCommandControl.length === 0 ||
            installedSensors.length === 0 ||
            (installedWeapons.length === 0 && installedLaunchSystems.length === 0) ||
            (!surfaceProvidesLifeSupport && installedLifeSupport.length === 0 && installedAccommodations.length === 0)
          ) {
            summaryValidationState = 'warning';
          }
        }
      }
    }

    // ---- Unique tech tracks across all installed components ----
    const tracks = new Set<TechTrack>();
    armorLayers.forEach(layer => layer.type.techTracks.forEach(t => tracks.add(t)));
    installedPowerPlants.forEach(pp => pp.type.techTracks.forEach(t => tracks.add(t)));
    installedEngines.forEach(eng => eng.type.techTracks.forEach(t => tracks.add(t)));
    if (installedFTLDrive) installedFTLDrive.type.techTracks.forEach(t => tracks.add(t));
    installedLifeSupport.forEach(ls => ls.type.techTracks.forEach(t => tracks.add(t)));
    installedAccommodations.forEach(acc => acc.type.techTracks.forEach(t => tracks.add(t)));
    installedStoreSystems.forEach(ss => ss.type.techTracks.forEach(t => tracks.add(t)));
    installedDefenses.forEach(def => def.type.techTracks.forEach(t => tracks.add(t)));
    installedCommandControl.forEach(cc => cc.type.techTracks.forEach(t => tracks.add(t)));
    installedSensors.forEach(sensor => sensor.type.techTracks.forEach(t => tracks.add(t)));
    installedHangarMisc.forEach(hm => hm.type.techTracks.forEach(t => tracks.add(t)));
    const uniqueTechTracks = Array.from(tracks).sort();

    // ---- Passengers & suspended for HangarMiscSelection ----
    const totalPassengersAndSuspended =
      supportStats.passengerCapacity + supportStats.suspendedCapacity + supportStats.troopCapacity;

    return {
      usedHullPointsBeforePowerPlants,
      usedHullPointsBeforeEngines,
      remainingHullPoints,
      totalHullPoints,
      totalPower,
      totalPowerConsumed,
      totalCost,
      powerBreakdown,
      hpBreakdown,
      costBreakdown,
      summaryValidationState,
      uniqueTechTracks,
      totalPassengersAndSuspended,
    };
  }, [
    selectedHull, armorLayers, installedPowerPlants, installedFuelTanks,
    installedEngines, installedEngineFuelTanks, installedFTLDrive, installedFTLFuelTanks,
    installedLifeSupport, installedAccommodations, installedStoreSystems, installedGravitySystems,
    installedWeapons, ordnanceDesigns, installedLaunchSystems,
    installedDefenses, installedCommandControl, installedSensors, installedHangarMisc,
    designProgressLevel, designTechTracks,
    powerScenario, steps, surfaceProvidesLifeSupport,
  ]);
}
