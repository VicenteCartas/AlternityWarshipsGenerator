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
import { isEnginePowerGenerationAllowed } from '../services/engineService';
import { getWeaponBatteries, batteryHasFireControl, getOrphanedFireControls, getOrphanedSensorControls, sensorHasSensorControl } from '../services/commandControlService';
import { computeDesignSnapshot } from '../services/designSnapshotService';

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

    // ---- Single authoritative computation ----
    const snapshot = computeDesignSnapshot({
      hull,
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
    });

    const usedHullPointsBeforePowerPlants = snapshot.hpBreakdown.armor;
    const usedHullPointsBeforeEngines = snapshot.hpBreakdown.armor + snapshot.hpBreakdown.powerPlants;

    // ---- Power consumption with scenario gating ----
    let totalPowerConsumed = 0;
    if (powerScenario.engines) totalPowerConsumed += snapshot.powerBreakdown.engines;
    if (powerScenario.ftlDrive) totalPowerConsumed += snapshot.powerBreakdown.ftlDrive;
    if (powerScenario.supportSystems) totalPowerConsumed += snapshot.powerBreakdown.supportSystems;
    if (powerScenario.weapons) totalPowerConsumed += snapshot.powerBreakdown.weapons;
    if (powerScenario.defenses) totalPowerConsumed += snapshot.powerBreakdown.defenses;
    if (powerScenario.commandControl) totalPowerConsumed += snapshot.powerBreakdown.commandControl;
    if (powerScenario.sensors) totalPowerConsumed += snapshot.powerBreakdown.sensors;
    if (powerScenario.hangarMisc) totalPowerConsumed += snapshot.powerBreakdown.hangarMisc;

    // ---- Summary validation state ----
    let summaryValidationState: 'valid' | 'error' | 'warning' = 'valid';

    // Errors
    if (snapshot.remainingHP < 0) {
      summaryValidationState = 'error';
    } else if (installedPowerPlants.length === 0 && !isEnginePowerGenerationAllowed()) {
      summaryValidationState = 'error';
    } else {
      const enginesRequired = steps.some(s => s.id === 'engines' && s.required);
      if (enginesRequired && installedEngines.length === 0) {
        summaryValidationState = 'error';
      }
    }

    // Warnings (only check if no errors)
    if (summaryValidationState !== 'error') {
      const ftlPower = snapshot.powerBreakdown.ftlDrive;
      const powerConsumedWithoutFTL = totalPowerConsumed - ftlPower;
      if (powerConsumedWithoutFTL > snapshot.powerGenerated) {
        summaryValidationState = 'warning';
      } else if (snapshot.supportStats.crewCapacity < hull.crew) {
        summaryValidationState = 'warning';
      } else if (!surfaceProvidesLifeSupport && snapshot.supportStats.totalCoverage < hull.hullPoints) {
        summaryValidationState = 'warning';
      } else if (snapshot.hangarMiscStats.totalEvacCapacity < hull.crew + snapshot.supportStats.troopCapacity) {
        summaryValidationState = 'warning';
      } else if (installedLaunchSystems.filter(ls => !ls.loadout || ls.loadout.length === 0).length > 0) {
        summaryValidationState = 'warning';
      } else if (!snapshot.sensorStats.hasBasicSensors && installedSensors.length > 0) {
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
            (!surfaceProvidesLifeSupport && snapshot.supportStats.totalCoverage === 0 && installedLifeSupport.length === 0 && installedAccommodations.length === 0)
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
      snapshot.supportStats.passengerCapacity + snapshot.supportStats.suspendedCapacity + snapshot.supportStats.troopCapacity;

    return {
      usedHullPointsBeforePowerPlants,
      usedHullPointsBeforeEngines,
      remainingHullPoints: snapshot.remainingHP,
      totalHullPoints: snapshot.totalHP,
      totalPower: snapshot.powerGenerated,
      totalPowerConsumed,
      enginePowerGenerated: snapshot.enginePowerGenerated,
      totalCost: snapshot.totalCost,
      powerBreakdown: snapshot.powerBreakdown,
      hpBreakdown: snapshot.hpBreakdown,
      costBreakdown: snapshot.costBreakdown,
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
