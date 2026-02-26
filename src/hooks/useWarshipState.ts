import { useState, useCallback, useRef, useEffect } from 'react';
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
import type { ProgressLevel, TechTrack, DesignType, StationType, AppMode } from '../types/common';
import type { DamageZone, HitLocationChart } from '../types/damageDiagram';
import type { ShipDescription } from '../types/summary';
import { useUndoHistory } from './useUndoHistory';
import type { WarshipState } from '../services/saveService';

/**
 * Manages all warship design state: the 27+ design variables, undo/redo history,
 * state assembly/application, and dirty-change tracking.
 *
 * @param mode Current app mode — dirty-check only triggers when mode is 'builder'
 */
export function useWarshipState(mode: AppMode) {
  // ---- Design type ----
  const [designType, setDesignType] = useState<DesignType>('warship');
  const [stationType, setStationType] = useState<StationType | null>(null);
  const [surfaceProvidesLifeSupport, setSurfaceProvidesLifeSupport] = useState(false);
  const [surfaceProvidesGravity, setSurfaceProvidesGravity] = useState(false);

  // ---- Core systems ----
  const [selectedHull, setSelectedHull] = useState<Hull | null>(null);
  const [armorLayers, setArmorLayers] = useState<ShipArmor[]>([]);
  const [installedPowerPlants, setInstalledPowerPlants] = useState<InstalledPowerPlant[]>([]);
  const [installedFuelTanks, setInstalledFuelTanks] = useState<InstalledFuelTank[]>([]);
  const [installedEngines, setInstalledEngines] = useState<InstalledEngine[]>([]);
  const [installedEngineFuelTanks, setInstalledEngineFuelTanks] = useState<InstalledEngineFuelTank[]>([]);
  const [installedFTLDrive, setInstalledFTLDrive] = useState<InstalledFTLDrive | null>(null);
  const [installedFTLFuelTanks, setInstalledFTLFuelTanks] = useState<InstalledFTLFuelTank[]>([]);
  const [installedLifeSupport, setInstalledLifeSupport] = useState<InstalledLifeSupport[]>([]);
  const [installedAccommodations, setInstalledAccommodations] = useState<InstalledAccommodation[]>([]);
  const [installedStoreSystems, setInstalledStoreSystems] = useState<InstalledStoreSystem[]>([]);
  const [installedGravitySystems, setInstalledGravitySystems] = useState<InstalledGravitySystem[]>([]);
  const [installedWeapons, setInstalledWeapons] = useState<InstalledWeapon[]>([]);
  const [ordnanceDesigns, setOrdnanceDesigns] = useState<OrdnanceDesign[]>([]);
  const [installedLaunchSystems, setInstalledLaunchSystems] = useState<InstalledLaunchSystem[]>([]);
  const [installedDefenses, setInstalledDefenses] = useState<InstalledDefenseSystem[]>([]);
  const [installedCommandControl, setInstalledCommandControl] = useState<InstalledCommandControlSystem[]>([]);
  const [installedSensors, setInstalledSensors] = useState<InstalledSensor[]>([]);
  const [installedHangarMisc, setInstalledHangarMisc] = useState<InstalledHangarMiscSystem[]>([]);

  // ---- Damage diagram ----
  const [damageDiagramZones, setDamageDiagramZones] = useState<DamageZone[]>([]);
  const [hitLocationChart, setHitLocationChart] = useState<HitLocationChart | null>(null);

  // ---- Description / name ----
  const [shipDescription, setShipDescription] = useState<ShipDescription>({
    lore: '',
    imageData: null,
    imageMimeType: null,
    faction: '',
    role: '',
    commissioningDate: '',
    classification: '',
    manufacturer: '',
  });
  const [warshipName, setWarshipName] = useState<string>('New Ship');

  // ---- Design constraints ----
  const [designProgressLevel, setDesignProgressLevel] = useState<ProgressLevel>(9);
  const [designTechTracks, setDesignTechTracks] = useState<TechTrack[]>([]);

  // ---- Unsaved changes tracking ----
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const skipDirtyCheck = useRef(true);

  // ---- Undo / redo history ----
  const undoHistory = useUndoHistory<WarshipState>(50);

  /**
   * Assemble the current design state from all individual useState values.
   * Used for saving, undo snapshots, and duplication.
   */
  const buildCurrentState = useCallback((): WarshipState => ({
    name: warshipName,
    shipDescription,
    designType,
    stationType,
    surfaceProvidesLifeSupport,
    surfaceProvidesGravity,
    hull: selectedHull,
    armorLayers,
    powerPlants: installedPowerPlants,
    fuelTanks: installedFuelTanks,
    engines: installedEngines,
    engineFuelTanks: installedEngineFuelTanks,
    ftlDrive: installedFTLDrive,
    ftlFuelTanks: installedFTLFuelTanks,
    lifeSupport: installedLifeSupport,
    accommodations: installedAccommodations,
    storeSystems: installedStoreSystems,
    gravitySystems: installedGravitySystems,
    defenses: installedDefenses,
    commandControl: installedCommandControl,
    sensors: installedSensors,
    hangarMisc: installedHangarMisc,
    weapons: installedWeapons,
    ordnanceDesigns,
    launchSystems: installedLaunchSystems,
    damageDiagramZones,
    hitLocationChart,
    designProgressLevel,
    designTechTracks,
  }), [warshipName, shipDescription, designType, stationType, surfaceProvidesLifeSupport, surfaceProvidesGravity, selectedHull, armorLayers, installedPowerPlants, installedFuelTanks, installedEngines, installedEngineFuelTanks, installedFTLDrive, installedFTLFuelTanks, installedLifeSupport, installedAccommodations, installedStoreSystems, installedGravitySystems, installedDefenses, installedCommandControl, installedSensors, installedHangarMisc, installedWeapons, ordnanceDesigns, installedLaunchSystems, damageDiagramZones, hitLocationChart, designProgressLevel, designTechTracks]);

  /**
   * Apply a WarshipState snapshot to all individual setters.
   * Used for undo/redo restore, loading from file, and duplication.
   */
  const applyState = useCallback((state: WarshipState) => {
    setDesignType(state.designType);
    setStationType(state.stationType);
    setSurfaceProvidesLifeSupport(state.surfaceProvidesLifeSupport);
    setSurfaceProvidesGravity(state.surfaceProvidesGravity);
    setSelectedHull(state.hull);
    setArmorLayers(state.armorLayers);
    setInstalledPowerPlants(state.powerPlants);
    setInstalledFuelTanks(state.fuelTanks);
    setInstalledEngines(state.engines);
    setInstalledEngineFuelTanks(state.engineFuelTanks);
    setInstalledFTLDrive(state.ftlDrive);
    setInstalledFTLFuelTanks(state.ftlFuelTanks);
    setInstalledLifeSupport(state.lifeSupport);
    setInstalledAccommodations(state.accommodations);
    setInstalledStoreSystems(state.storeSystems);
    setInstalledGravitySystems(state.gravitySystems);
    setInstalledWeapons(state.weapons);
    setOrdnanceDesigns(state.ordnanceDesigns);
    setInstalledLaunchSystems(state.launchSystems);
    setInstalledDefenses(state.defenses);
    setInstalledCommandControl(state.commandControl);
    setInstalledSensors(state.sensors);
    setInstalledHangarMisc(state.hangarMisc);
    setDamageDiagramZones(state.damageDiagramZones);
    setHitLocationChart(state.hitLocationChart);
    setShipDescription(state.shipDescription);
    setWarshipName(state.name);
    setDesignProgressLevel(state.designProgressLevel);
    setDesignTechTracks(state.designTechTracks);
  }, []);

  const handleUndo = useCallback(() => {
    const state = undoHistory.undo();
    if (state) applyState(state);
  }, [undoHistory.undo, applyState]);

  const handleRedo = useCallback(() => {
    const state = undoHistory.redo();
    if (state) applyState(state);
  }, [undoHistory.redo, applyState]);

  // Track design state changes to detect unsaved modifications + push to undo history
  useEffect(() => {
    if (skipDirtyCheck.current) {
      skipDirtyCheck.current = false;
      return;
    }
    if (mode === 'builder') {
      setHasUnsavedChanges(true);
      // Push to undo history (debounced; skipped during undo/redo restore)
      if (!undoHistory.isRestoring.current) {
        undoHistory.pushState(buildCurrentState());
      } else {
        undoHistory.isRestoring.current = false;
      }
    }
  }, [selectedHull, armorLayers, installedPowerPlants, installedFuelTanks,
    installedEngines, installedEngineFuelTanks, installedFTLDrive, installedFTLFuelTanks,
    installedLifeSupport, installedAccommodations, installedStoreSystems, installedGravitySystems,
    installedWeapons, ordnanceDesigns, installedLaunchSystems,
    installedDefenses, installedCommandControl, installedSensors, installedHangarMisc,
    damageDiagramZones, hitLocationChart, warshipName, shipDescription,
    designProgressLevel, designTechTracks, mode, buildCurrentState]);

  return {
    // State values
    designType, stationType, surfaceProvidesLifeSupport, surfaceProvidesGravity,
    selectedHull, armorLayers,
    installedPowerPlants, installedFuelTanks,
    installedEngines, installedEngineFuelTanks,
    installedFTLDrive, installedFTLFuelTanks,
    installedLifeSupport, installedAccommodations, installedStoreSystems, installedGravitySystems,
    installedWeapons, ordnanceDesigns, installedLaunchSystems,
    installedDefenses, installedCommandControl, installedSensors, installedHangarMisc,
    damageDiagramZones, hitLocationChart,
    shipDescription, warshipName,
    designProgressLevel, designTechTracks,
    // Setters
    setDesignType, setStationType, setSurfaceProvidesLifeSupport, setSurfaceProvidesGravity,
    setSelectedHull, setArmorLayers,
    setInstalledPowerPlants, setInstalledFuelTanks,
    setInstalledEngines, setInstalledEngineFuelTanks,
    setInstalledFTLDrive, setInstalledFTLFuelTanks,
    setInstalledLifeSupport, setInstalledAccommodations, setInstalledStoreSystems, setInstalledGravitySystems,
    setInstalledWeapons, setOrdnanceDesigns, setInstalledLaunchSystems,
    setInstalledDefenses, setInstalledCommandControl, setInstalledSensors, setInstalledHangarMisc,
    setDamageDiagramZones, setHitLocationChart,
    setShipDescription, setWarshipName,
    setDesignProgressLevel, setDesignTechTracks,
    // Helpers
    buildCurrentState, applyState,
    handleUndo, handleRedo, undoHistory,
    hasUnsavedChanges, setHasUnsavedChanges, skipDirtyCheck,
  };
}
