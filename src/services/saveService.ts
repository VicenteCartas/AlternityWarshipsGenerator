import type { WarshipSaveFile, SavedPowerPlant, SavedFuelTank, SavedEngine, SavedEngineFuelTank, SavedFTLDrive, SavedFTLFuelTank, SavedLifeSupport, SavedAccommodation, SavedStoreSystem, SavedGravitySystem, SavedDefenseSystem, SavedCommandControlSystem, SavedSensor, SavedHangarMiscSystem, SavedWeapon, SavedOrdnanceDesign, SavedLaunchSystem, SavedDamageZone, SavedHitLocationChart } from '../types/saveFile';
import type { Hull } from '../types/hull';
import type { ArmorType, ArmorWeight } from '../types/armor';
import type { InstalledPowerPlant, InstalledFuelTank } from '../types/powerPlant';
import type { InstalledEngine, InstalledEngineFuelTank } from '../types/engine';
import type { InstalledFTLDrive, InstalledFTLFuelTank } from '../types/ftlDrive';
import type { InstalledLifeSupport, InstalledAccommodation, InstalledStoreSystem, InstalledGravitySystem } from '../types/supportSystem';
import type { InstalledDefenseSystem } from '../types/defense';
import type { InstalledCommandControlSystem } from '../types/commandControl';
import type { InstalledSensor } from '../types/sensor';
import type { InstalledHangarMiscSystem } from '../types/hangarMisc';
import type { InstalledWeapon, FiringArc } from '../types/weapon';
import type { OrdnanceDesign, InstalledLaunchSystem, MissileDesign, BombDesign, MineDesign } from '../types/ordnance';
import type { ProgressLevel, TechTrack } from '../types/common';
import type { DamageZone, HitLocationChart, SystemDamageCategory, ZoneCode } from '../types/damageDiagram';
import type { ShipDescription } from '../types/summary';
import { SAVE_FILE_VERSION } from '../types/saveFile';
import { getAllHulls } from './hullService';
import { getAllArmorTypes } from './armorService';
import { getAllPowerPlantTypes, generateFuelTankId } from './powerPlantService';
import { getAllEngineTypes, generateEngineInstallationId, generateEngineFuelTankId } from './engineService';
import { getAllFTLDriveTypes, generateFTLInstallationId, generateFTLFuelTankId } from './ftlDriveService';
import { getAllLifeSupportTypes, getAllAccommodationTypes, getAllStoreSystemTypes, getAllGravitySystemTypes, generateLifeSupportId, generateAccommodationId, generateStoreSystemId, generateGravitySystemId } from './supportSystemService';
import { getAllDefenseSystemTypes, generateDefenseId, calculateDefenseHullPoints, calculateDefensePower, calculateDefenseCost } from './defenseService';
import { getAllCommandControlSystemTypes, calculateCommandControlHullPoints, calculateCommandControlPower, calculateCommandControlCost, calculateFireControlCost, calculateSensorControlCost, generateCommandControlId } from './commandControlService';
import { getAllSensorTypes, generateSensorId, calculateSensorHullPoints, calculateSensorPower, calculateSensorCost, calculateTrackingCapability, type ComputerQuality } from './sensorService';
import { getAllHangarMiscSystemTypes, generateHangarMiscId, calculateHangarMiscHullPoints, calculateHangarMiscPower, calculateHangarMiscCost, calculateHangarMiscCapacity } from './hangarMiscService';
import { getAllBeamWeaponTypes, getAllProjectileWeaponTypes, getAllTorpedoWeaponTypes, getAllSpecialWeaponTypes, createInstalledWeapon } from './weaponService';
import { getLaunchSystems, getPropulsionSystems, getWarheads, getGuidanceSystems, calculateLaunchSystemStats, calculateMissileDesign, calculateBombDesign, calculateMineDesign } from './ordnanceService';

/**
 * State representing the current warship configuration
 */
export interface WarshipState {
  name: string;
  shipDescription: ShipDescription;
  hull: Hull | null;
  armorWeight: ArmorWeight | null;
  armorType: ArmorType | null;
  powerPlants: InstalledPowerPlant[];
  fuelTanks: InstalledFuelTank[];
  engines: InstalledEngine[];
  engineFuelTanks: InstalledEngineFuelTank[];
  ftlDrive: InstalledFTLDrive | null;
  ftlFuelTanks: InstalledFTLFuelTank[];
  lifeSupport: InstalledLifeSupport[];
  accommodations: InstalledAccommodation[];
  storeSystems: InstalledStoreSystem[];
  gravitySystems: InstalledGravitySystem[];
  defenses: InstalledDefenseSystem[];
  commandControl: InstalledCommandControlSystem[];
  sensors: InstalledSensor[];
  hangarMisc: InstalledHangarMiscSystem[];
  weapons: InstalledWeapon[];
  ordnanceDesigns: OrdnanceDesign[];
  launchSystems: InstalledLaunchSystem[];
  damageDiagramZones: DamageZone[];
  hitLocationChart: HitLocationChart | null;
  designProgressLevel: ProgressLevel;
  designTechTracks: TechTrack[];
}

/**
 * Result of loading a save file
 */
export interface LoadResult {
  success: boolean;
  state?: WarshipState;
  errors?: string[];
  warnings?: string[];
}

/**
 * Serialize the current warship state to a save file format
 */
export function serializeWarship(state: WarshipState): WarshipSaveFile {
  const now = new Date().toISOString();
  
  return {
    version: SAVE_FILE_VERSION,
    name: state.name,
    createdAt: now,
    modifiedAt: now,
    lore: state.shipDescription.lore || undefined,
    imageData: state.shipDescription.imageData,
    imageMimeType: state.shipDescription.imageMimeType,
    hull: state.hull ? { id: state.hull.id } : null,
    armor: state.armorType ? { id: state.armorType.id } : null,
    designProgressLevel: state.designProgressLevel,
    designTechTracks: state.designTechTracks,
    powerPlants: (state.powerPlants || []).map((pp): SavedPowerPlant => ({
      id: pp.id,
      typeId: pp.type.id,
      hullPoints: pp.hullPoints,
    })),
    fuelTanks: (state.fuelTanks || []).map((ft): SavedFuelTank => ({
      id: ft.id,
      forPowerPlantTypeId: ft.forPowerPlantType.id,
      hullPoints: ft.hullPoints,
    })),
    engines: (state.engines || []).map((eng): SavedEngine => ({
      id: eng.id,
      typeId: eng.type.id,
      hullPoints: eng.hullPoints,
    })),
    engineFuelTanks: (state.engineFuelTanks || []).map((ft): SavedEngineFuelTank => ({
      id: ft.id,
      forEngineTypeId: ft.forEngineType.id,
      hullPoints: ft.hullPoints,
    })),
    ftlDrive: state.ftlDrive ? {
      id: state.ftlDrive.id,
      typeId: state.ftlDrive.type.id,
      hullPoints: state.ftlDrive.hullPoints,
    } as SavedFTLDrive : null,
    ftlFuelTanks: (state.ftlFuelTanks || []).map((ft): SavedFTLFuelTank => ({
      id: ft.id,
      forFTLDriveTypeId: ft.forFTLDriveType.id,
      hullPoints: ft.hullPoints,
    })),
    lifeSupport: (state.lifeSupport || []).map((ls): SavedLifeSupport => ({
      id: ls.id,
      typeId: ls.type.id,
      quantity: ls.quantity,
    })),
    accommodations: (state.accommodations || []).map((acc): SavedAccommodation => ({
      id: acc.id,
      typeId: acc.type.id,
      quantity: acc.quantity,
    })),
    storeSystems: (state.storeSystems || []).map((ss): SavedStoreSystem => ({
      id: ss.id,
      typeId: ss.type.id,
      quantity: ss.quantity,
    })),
    gravitySystems: (state.gravitySystems || []).map((gs): SavedGravitySystem => ({
      id: gs.id,
      typeId: gs.type.id,
      hullPoints: gs.hullPoints,
    })),
    defenses: (state.defenses || []).map((def): SavedDefenseSystem => ({
      id: def.id,
      typeId: def.type.id,
      quantity: def.quantity,
    })),
    commandControl: (state.commandControl || []).map((cc): SavedCommandControlSystem => ({
      id: cc.id,
      typeId: cc.type.id,
      quantity: cc.quantity,
      linkedWeaponBatteryKey: cc.linkedWeaponBatteryKey,
      linkedSensorId: cc.linkedSensorId,
    })),
    sensors: (state.sensors || []).map((s): SavedSensor => ({
      id: s.id,
      typeId: s.type.id,
      quantity: s.quantity,
    })),
    hangarMisc: (state.hangarMisc || []).map((hm): SavedHangarMiscSystem => ({
      id: hm.id,
      typeId: hm.type.id,
      quantity: hm.quantity,
    })),
    weapons: (state.weapons || []).map((w): SavedWeapon => ({
      id: w.id,
      typeId: w.weaponType.id,
      category: w.category,
      mountType: w.mountType,
      gunConfiguration: w.gunConfiguration,
      concealed: w.concealed,
      quantity: w.quantity,
      arcs: w.arcs,
    })),
    ordnanceDesigns: (state.ordnanceDesigns || []).map((d): SavedOrdnanceDesign => {
      const base = {
        id: d.id,
        name: d.name,
        category: d.category,
        size: d.size,
        warheadId: d.warheadId,
      };
      if (d.category === 'missile') {
        return {
          ...base,
          propulsionId: (d as MissileDesign).propulsionId,
          guidanceId: (d as MissileDesign).guidanceId,
        };
      } else if (d.category === 'mine') {
        return {
          ...base,
          guidanceId: (d as MineDesign).guidanceId,
        };
      }
      return base;
    }),
    launchSystems: (state.launchSystems || []).map((ls): SavedLaunchSystem => ({
      id: ls.id,
      typeId: ls.launchSystemType,
      quantity: ls.quantity,
      extraHp: ls.extraHp,
      loadout: ls.loadout || [],
    })),
    damageDiagramZones: (state.damageDiagramZones || []).map((zone): SavedDamageZone => ({
      code: zone.code,
      systems: zone.systems.map((sys) => ({
        id: sys.id,
        systemType: sys.systemType,
        name: sys.name,
        hullPoints: sys.hullPoints,
        installedSystemId: sys.installedSystemId,
        firepowerOrder: sys.firepowerOrder,
      })),
      totalHullPoints: zone.totalHullPoints,
      maxHullPoints: zone.maxHullPoints,
    })),
    hitLocationChart: state.hitLocationChart ? {
      hitDie: state.hitLocationChart.hitDie,
      columns: state.hitLocationChart.columns.map((col) => ({
        direction: col.direction,
        entries: col.entries.map((e) => ({
          minRoll: e.minRoll,
          maxRoll: e.maxRoll,
          zone: e.zone,
        })),
      })),
    } as SavedHitLocationChart : null,
    systems: [],
  };
}

/**
 * Convert save file to JSON string with pretty formatting
 */
export function saveFileToJson(saveFile: WarshipSaveFile): string {
  return JSON.stringify(saveFile, null, 2);
}

/**
 * Parse JSON string to save file
 */
export function jsonToSaveFile(json: string): WarshipSaveFile | null {
  try {
    return JSON.parse(json) as WarshipSaveFile;
  } catch {
    return null;
  }
}

/**
 * Deserialize a save file back to warship state
 */
export function deserializeWarship(saveFile: WarshipSaveFile): LoadResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check version
  if (!saveFile.version) {
    errors.push('Save file is missing version information');
    return { success: false, errors };
  }
  
  const [major, minor] = saveFile.version.split('.').map(Number);
  const [currentMajor, currentMinor] = SAVE_FILE_VERSION.split('.').map(Number);
  if (major !== currentMajor) {
    errors.push(`Incompatible save file version: ${saveFile.version} (current: ${SAVE_FILE_VERSION})`);
    return { success: false, errors };
  }
  
  // Warn if minor version differs
  if (minor !== currentMinor) {
    warnings.push(`Save file was created with a different version (${saveFile.version}, current: ${SAVE_FILE_VERSION}). Some features may behave differently.`);
  }
  
  // Load hull
  let hull: Hull | null = null;
  if (saveFile.hull?.id) {
    const allHulls = getAllHulls();
    hull = allHulls.find(h => h.id === saveFile.hull!.id) ?? null;
    if (!hull) {
      errors.push(`Hull type not found: ${saveFile.hull.id}`);
    }
  }
  
  // Load armor
  let armorType: ArmorType | null = null;
  let armorWeight: ArmorWeight | null = null;
  if (saveFile.armor?.id) {
    const allArmors = getAllArmorTypes();
    armorType = allArmors.find(a => a.id === saveFile.armor!.id) ?? null;
    if (armorType) {
      armorWeight = armorType.armorWeight;
    } else {
      warnings.push(`Armor type not found: ${saveFile.armor.id}`);
    }
  }
  
  // Load power plants
  const powerPlants: InstalledPowerPlant[] = [];
  const allPowerPlantTypes = getAllPowerPlantTypes();
  
  for (const savedPP of (saveFile.powerPlants || [])) {
    const ppType = allPowerPlantTypes.find(t => t.id === savedPP.typeId);
    if (ppType) {
      powerPlants.push({
        id: savedPP.id || crypto.randomUUID(),
        type: ppType,
        hullPoints: savedPP.hullPoints,
      });
    } else {
      warnings.push(`Power plant type not found: ${savedPP.typeId}`);
    }
  }
  
  // Load fuel tanks
  const fuelTanks: InstalledFuelTank[] = [];
  
  for (const savedFT of (saveFile.fuelTanks || [])) {
    const ppType = allPowerPlantTypes.find(t => t.id === savedFT.forPowerPlantTypeId);
    if (ppType) {
      fuelTanks.push({
        id: savedFT.id || generateFuelTankId(),
        forPowerPlantType: ppType,
        hullPoints: savedFT.hullPoints,
      });
    } else {
      warnings.push(`Power plant type not found for fuel tank: ${savedFT.forPowerPlantTypeId}`);
    }
  }
  
  // Load engines
  const engines: InstalledEngine[] = [];
  const allEngineTypes = getAllEngineTypes();
  
  for (const savedEngine of (saveFile.engines || [])) {
    const engineType = allEngineTypes.find(t => t.id === savedEngine.typeId);
    if (engineType) {
      engines.push({
        id: savedEngine.id || generateEngineInstallationId(),
        type: engineType,
        hullPoints: savedEngine.hullPoints,
      });
    } else {
      warnings.push(`Engine type not found: ${savedEngine.typeId}`);
    }
  }
  
  // Load engine fuel tanks
  const engineFuelTanks: InstalledEngineFuelTank[] = [];
  
  for (const savedFT of (saveFile.engineFuelTanks || [])) {
    const engineType = allEngineTypes.find(t => t.id === savedFT.forEngineTypeId);
    if (engineType) {
      engineFuelTanks.push({
        id: savedFT.id || generateEngineFuelTankId(),
        forEngineType: engineType,
        hullPoints: savedFT.hullPoints,
      });
    } else {
      warnings.push(`Engine type not found for fuel tank: ${savedFT.forEngineTypeId}`);
    }
  }
  
  // Load FTL drive
  let ftlDrive: InstalledFTLDrive | null = null;
  const allFTLTypes = getAllFTLDriveTypes();
  if (saveFile.ftlDrive) {
    const ftlType = allFTLTypes.find(t => t.id === saveFile.ftlDrive!.typeId);
    if (ftlType) {
      ftlDrive = {
        id: saveFile.ftlDrive.id || generateFTLInstallationId(),
        type: ftlType,
        hullPoints: saveFile.ftlDrive.hullPoints,
      };
    } else {
      warnings.push(`FTL drive type not found: ${saveFile.ftlDrive.typeId}`);
    }
  }
  
  // Load FTL fuel tanks
  const ftlFuelTanks: InstalledFTLFuelTank[] = [];
  
  for (const savedFT of (saveFile.ftlFuelTanks || [])) {
    const ftlType = allFTLTypes.find(t => t.id === savedFT.forFTLDriveTypeId);
    if (ftlType) {
      ftlFuelTanks.push({
        id: savedFT.id || generateFTLFuelTankId(),
        forFTLDriveType: ftlType,
        hullPoints: savedFT.hullPoints,
      });
    } else {
      warnings.push(`FTL drive type not found for fuel tank: ${savedFT.forFTLDriveTypeId}`);
    }
  }
  
  // Load life support
  const lifeSupport: InstalledLifeSupport[] = [];
  const allLifeSupportTypes = getAllLifeSupportTypes();
  
  for (const savedLS of (saveFile.lifeSupport || [])) {
    const lsType = allLifeSupportTypes.find(t => t.id === savedLS.typeId);
    if (lsType) {
      lifeSupport.push({
        id: savedLS.id || generateLifeSupportId(),
        type: lsType,
        quantity: savedLS.quantity,
      });
    } else {
      warnings.push(`Life support type not found: ${savedLS.typeId}`);
    }
  }
  
  // Load accommodations
  const accommodations: InstalledAccommodation[] = [];
  const allAccommodationTypes = getAllAccommodationTypes();
  
  for (const savedAcc of (saveFile.accommodations || [])) {
    const accType = allAccommodationTypes.find(t => t.id === savedAcc.typeId);
    if (accType) {
      accommodations.push({
        id: savedAcc.id || generateAccommodationId(),
        type: accType,
        quantity: savedAcc.quantity,
      });
    } else {
      warnings.push(`Accommodation type not found: ${savedAcc.typeId}`);
    }
  }
  
  // Load store systems
  const storeSystems: InstalledStoreSystem[] = [];
  const allStoreSystemTypes = getAllStoreSystemTypes();
  
  for (const savedSS of (saveFile.storeSystems || [])) {
    const ssType = allStoreSystemTypes.find(t => t.id === savedSS.typeId);
    if (ssType) {
      storeSystems.push({
        id: savedSS.id || generateStoreSystemId(),
        type: ssType,
        quantity: savedSS.quantity,
      });
    } else {
      warnings.push(`Store system type not found: ${savedSS.typeId}`);
    }
  }
  
  // Load gravity systems
  const gravitySystems: InstalledGravitySystem[] = [];
  const allGravitySystemTypes = getAllGravitySystemTypes();
  
  for (const savedGS of (saveFile.gravitySystems || [])) {
    const gsType = allGravitySystemTypes.find(t => t.id === savedGS.typeId);
    if (gsType) {
      gravitySystems.push({
        id: savedGS.id || generateGravitySystemId(),
        type: gsType,
        hullPoints: savedGS.hullPoints,
        cost: savedGS.hullPoints * gsType.costPerHullPoint,
      });
    } else {
      warnings.push(`Gravity system type not found: ${savedGS.typeId}`);
    }
  }
  
  // Load defense systems
  const defenses: InstalledDefenseSystem[] = [];
  const allDefenseTypes = getAllDefenseSystemTypes();
  const shipHullPoints = hull?.hullPoints || 100; // Default for calculation purposes
  
  for (const savedDef of (saveFile.defenses || [])) {
    const defType = allDefenseTypes.find(t => t.id === savedDef.typeId);
    if (defType) {
      const hullPts = calculateDefenseHullPoints(defType, shipHullPoints, savedDef.quantity);
      const power = calculateDefensePower(defType, shipHullPoints, savedDef.quantity);
      const cost = calculateDefenseCost(defType, shipHullPoints, savedDef.quantity);
      defenses.push({
        id: savedDef.id || generateDefenseId(),
        type: defType,
        quantity: savedDef.quantity,
        hullPoints: hullPts,
        powerRequired: power,
        cost,
      });
    } else {
      warnings.push(`Defense system type not found: ${savedDef.typeId}`);
    }
  }
  
  // Load command & control systems
  // Note: Fire Control and Sensor Control costs will be recalculated after weapons/sensors are loaded
  const commandControl: InstalledCommandControlSystem[] = [];
  const allCCTypes = getAllCommandControlSystemTypes();
  
  for (const savedCC of (saveFile.commandControl || [])) {
    const ccType = allCCTypes.find(t => t.id === savedCC.typeId);
    if (ccType) {
      const hullPts = calculateCommandControlHullPoints(ccType, shipHullPoints, savedCC.quantity);
      const power = calculateCommandControlPower(ccType, savedCC.quantity);
      // For linked systems (Fire Control, Sensor Control), cost will be recalculated later
      const cost = calculateCommandControlCost(ccType, shipHullPoints, savedCC.quantity);
      commandControl.push({
        id: savedCC.id || generateCommandControlId(),
        type: ccType,
        quantity: savedCC.quantity,
        hullPoints: hullPts,
        powerRequired: power,
        cost,
        linkedWeaponBatteryKey: savedCC.linkedWeaponBatteryKey,
        linkedSensorId: savedCC.linkedSensorId,
      });
    } else {
      warnings.push(`Command & control system type not found: ${savedCC.typeId}`);
    }
  }
  
  // Load sensors
  const sensors: InstalledSensor[] = [];
  const allSensorTypes = getAllSensorTypes();
  const designPL = saveFile.designProgressLevel || 7;
  
  for (const savedSensor of (saveFile.sensors || [])) {
    const sensorType = allSensorTypes.find(t => t.id === savedSensor.typeId);
    if (sensorType) {
      const hullPts = calculateSensorHullPoints(sensorType, savedSensor.quantity);
      const power = calculateSensorPower(sensorType, savedSensor.quantity);
      const cost = calculateSensorCost(sensorType, savedSensor.quantity);
      
      // Get the sensor control assigned to this sensor (if any) to calculate tracking
      const sensorId = savedSensor.id || generateSensorId();
      const assignedControl = commandControl.find(cc => cc.linkedSensorId === sensorId);
      const computerQuality: ComputerQuality = assignedControl?.type.quality as ComputerQuality || 'none';
      
      sensors.push({
        id: sensorId,
        type: sensorType,
        quantity: savedSensor.quantity,
        hullPoints: hullPts,
        powerRequired: power,
        cost,
        arcsCovered: Math.min(savedSensor.quantity * sensorType.arcsCovered, 4),
        trackingCapability: calculateTrackingCapability(designPL, computerQuality, savedSensor.quantity),
      });
    } else {
      warnings.push(`Sensor system type not found: ${savedSensor.typeId}`);
    }
  }
  
  // Load hangar & miscellaneous systems
  const hangarMisc: InstalledHangarMiscSystem[] = [];
  const allHangarMiscTypes = getAllHangarMiscSystemTypes();
  
  for (const savedHM of (saveFile.hangarMisc || [])) {
    const hmType = allHangarMiscTypes.find(t => t.id === savedHM.typeId);
    if (hmType) {
      const hullPts = calculateHangarMiscHullPoints(hmType, shipHullPoints, savedHM.quantity);
      const power = calculateHangarMiscPower(hmType, shipHullPoints, savedHM.quantity);
      const cost = calculateHangarMiscCost(hmType, shipHullPoints, savedHM.quantity);
      const capacity = calculateHangarMiscCapacity(hmType, shipHullPoints, savedHM.quantity);
      hangarMisc.push({
        id: savedHM.id || generateHangarMiscId(),
        type: hmType,
        quantity: savedHM.quantity,
        hullPoints: hullPts,
        powerRequired: power,
        cost,
        capacity: capacity > 0 ? capacity : undefined,
      });
    } else {
      warnings.push(`Hangar/misc system type not found: ${savedHM.typeId}`);
    }
  }
  
  // Load weapons
  const weapons: InstalledWeapon[] = [];
  const allBeamWeapons = getAllBeamWeaponTypes();
  const allProjectileWeapons = getAllProjectileWeaponTypes();
  const allTorpedoWeapons = getAllTorpedoWeaponTypes();
  const allSpecialWeapons = getAllSpecialWeaponTypes();
  
  for (const savedWeapon of (saveFile.weapons || [])) {
    if (savedWeapon.category === 'beam') {
      const weaponType = allBeamWeapons.find(w => w.id === savedWeapon.typeId);
      if (weaponType) {
        const weapon = createInstalledWeapon(
          weaponType,
          savedWeapon.category,
          savedWeapon.mountType,
          savedWeapon.gunConfiguration,
          savedWeapon.concealed,
          savedWeapon.quantity,
          savedWeapon.arcs as FiringArc[]
        );
        if (savedWeapon.id) weapon.id = savedWeapon.id;
        weapons.push(weapon);
      } else {
        warnings.push(`Weapon type not found: ${savedWeapon.typeId}`);
      }
    } else if (savedWeapon.category === 'projectile') {
      const weaponType = allProjectileWeapons.find(w => w.id === savedWeapon.typeId);
      if (weaponType) {
        const weapon = createInstalledWeapon(
          weaponType,
          savedWeapon.category,
          savedWeapon.mountType,
          savedWeapon.gunConfiguration,
          savedWeapon.concealed,
          savedWeapon.quantity,
          savedWeapon.arcs as FiringArc[]
        );
        if (savedWeapon.id) weapon.id = savedWeapon.id;
        weapons.push(weapon);
      } else {
        warnings.push(`Weapon type not found: ${savedWeapon.typeId}`);
      }
    } else if (savedWeapon.category === 'torpedo') {
      const weaponType = allTorpedoWeapons.find(w => w.id === savedWeapon.typeId);
      if (weaponType) {
        const weapon = createInstalledWeapon(
          weaponType,
          savedWeapon.category,
          savedWeapon.mountType,
          savedWeapon.gunConfiguration,
          savedWeapon.concealed,
          savedWeapon.quantity,
          savedWeapon.arcs as FiringArc[]
        );
        if (savedWeapon.id) weapon.id = savedWeapon.id;
        weapons.push(weapon);
      } else {
        warnings.push(`Weapon type not found: ${savedWeapon.typeId}`);
      }
    } else if (savedWeapon.category === 'special') {
      const weaponType = allSpecialWeapons.find(w => w.id === savedWeapon.typeId);
      if (weaponType) {
        const weapon = createInstalledWeapon(
          weaponType,
          savedWeapon.category,
          savedWeapon.mountType,
          savedWeapon.gunConfiguration,
          savedWeapon.concealed,
          savedWeapon.quantity,
          savedWeapon.arcs as FiringArc[]
        );
        if (savedWeapon.id) weapon.id = savedWeapon.id;
        weapons.push(weapon);
      } else {
        warnings.push(`Weapon type not found: ${savedWeapon.typeId}`);
      }
    } else {
      warnings.push(`Weapon category not yet supported: ${savedWeapon.category}`);
    }
  }
  
  // Load ordnance designs
  const ordnanceDesigns: OrdnanceDesign[] = [];
  const allPropulsion = getPropulsionSystems();
  const allGuidance = getGuidanceSystems();
  const allWarheads = getWarheads();
  
  for (const savedDesign of (saveFile.ordnanceDesigns || [])) {
    const warhead = allWarheads.find(w => w.id === savedDesign.warheadId);
    if (!warhead) {
      warnings.push(`Warhead not found: ${savedDesign.warheadId}`);
      continue;
    }
    
    if (savedDesign.category === 'missile') {
      const propulsion = allPropulsion.find(p => p.id === savedDesign.propulsionId);
      const guidance = allGuidance.find(g => g.id === savedDesign.guidanceId);
      if (!propulsion) {
        warnings.push(`Propulsion system not found: ${savedDesign.propulsionId}`);
        continue;
      }
      if (!guidance) {
        warnings.push(`Guidance system not found: ${savedDesign.guidanceId}`);
        continue;
      }
      const stats = calculateMissileDesign(propulsion, guidance, warhead);
      ordnanceDesigns.push({
        id: savedDesign.id,
        name: savedDesign.name,
        category: 'missile',
        size: savedDesign.size,
        propulsionId: savedDesign.propulsionId!,
        guidanceId: savedDesign.guidanceId!,
        warheadId: savedDesign.warheadId,
        totalAccuracy: stats.totalAccuracy,
        totalCost: stats.totalCost,
        capacityRequired: stats.capacityRequired,
      } as MissileDesign);
    } else if (savedDesign.category === 'bomb') {
      const propulsion = allPropulsion.find(p => p.id === `bomb-${savedDesign.size}`);
      if (!propulsion) {
        warnings.push(`Bomb casing not found for size: ${savedDesign.size}`);
        continue;
      }
      const stats = calculateBombDesign(propulsion, warhead);
      ordnanceDesigns.push({
        id: savedDesign.id,
        name: savedDesign.name,
        category: 'bomb',
        size: savedDesign.size,
        warheadId: savedDesign.warheadId,
        totalAccuracy: stats.totalAccuracy,
        totalCost: stats.totalCost,
        capacityRequired: stats.capacityRequired,
      } as BombDesign);
    } else if (savedDesign.category === 'mine') {
      const propulsion = allPropulsion.find(p => p.id === `mine-${savedDesign.size}`);
      const guidance = allGuidance.find(g => g.id === savedDesign.guidanceId);
      if (!propulsion) {
        warnings.push(`Mine casing not found for size: ${savedDesign.size}`);
        continue;
      }
      if (!guidance) {
        warnings.push(`Guidance system not found: ${savedDesign.guidanceId}`);
        continue;
      }
      const stats = calculateMineDesign(propulsion, guidance, warhead);
      ordnanceDesigns.push({
        id: savedDesign.id,
        name: savedDesign.name,
        category: 'mine',
        size: savedDesign.size,
        guidanceId: savedDesign.guidanceId!,
        warheadId: savedDesign.warheadId,
        totalAccuracy: stats.totalAccuracy,
        totalCost: stats.totalCost,
        capacityRequired: stats.capacityRequired,
      } as MineDesign);
    }
  }
  
  // Load launch systems
  const launchSystemsList: InstalledLaunchSystem[] = [];
  const allLaunchSystems = getLaunchSystems();
  
  for (const savedLS of (saveFile.launchSystems || [])) {
    const launchSystem = allLaunchSystems.find(ls => ls.id === savedLS.typeId);
    if (launchSystem) {
      // Support both old (extraCapacity) and new (extraHp) save format
      const extraHp = savedLS.extraHp ?? (savedLS as { extraCapacity?: number }).extraCapacity ?? 0;
      const stats = calculateLaunchSystemStats(launchSystem, savedLS.quantity, extraHp);
      launchSystemsList.push({
        id: savedLS.id,
        launchSystemType: launchSystem.id,
        quantity: savedLS.quantity,
        extraHp: extraHp,
        loadout: savedLS.loadout || [],
        hullPoints: stats.hullPoints,
        powerRequired: stats.powerRequired,
        cost: stats.cost,
        totalCapacity: stats.totalCapacity,
      });
    } else {
      warnings.push(`Launch system type not found: ${savedLS.typeId}`);
    }
  }
  
  // Load damage diagram zones
  const damageDiagramZones: DamageZone[] = [];
  for (const savedZone of (saveFile.damageDiagramZones || [])) {
    damageDiagramZones.push({
      code: savedZone.code as ZoneCode,
      systems: savedZone.systems.map((sys) => ({
        id: sys.id,
        systemType: sys.systemType as SystemDamageCategory,
        name: sys.name,
        hullPoints: sys.hullPoints,
        installedSystemId: sys.installedSystemId,
        firepowerOrder: sys.firepowerOrder,
      })),
      totalHullPoints: savedZone.totalHullPoints,
      maxHullPoints: savedZone.maxHullPoints,
    });
  }
  
  // Load hit location chart
  let hitLocationChart: HitLocationChart | null = null;
  if (saveFile.hitLocationChart) {
    hitLocationChart = {
      hitDie: saveFile.hitLocationChart.hitDie,
      columns: saveFile.hitLocationChart.columns.map((col) => ({
        direction: col.direction,
        entries: col.entries.map((e) => ({
          minRoll: e.minRoll,
          maxRoll: e.maxRoll,
          zone: e.zone as ZoneCode,
        })),
      })),
    };
  }
  
  // If we have critical errors (no hull found when one was specified), fail
  if (errors.length > 0) {
    return { success: false, errors, warnings };
  }
  
  // Recalculate Fire Control and Sensor Control costs based on loaded weapons/sensors
  for (const cc of commandControl) {
    if (cc.type.linkedSystemType === 'weapon' && cc.linkedWeaponBatteryKey) {
      cc.cost = calculateFireControlCost(cc.type, cc.linkedWeaponBatteryKey, weapons);
    } else if (cc.type.linkedSystemType === 'sensor' && cc.linkedSensorId) {
      cc.cost = calculateSensorControlCost(cc.type, cc.linkedSensorId, sensors);
    }
  }
  
  return {
    success: true,
    state: {
      name: saveFile.name || 'Unnamed Warship',
      shipDescription: {
        lore: saveFile.lore || '',
        imageData: saveFile.imageData ?? null,
        imageMimeType: saveFile.imageMimeType ?? null,
      },
      hull,
      armorWeight,
      armorType,
      powerPlants,
      fuelTanks,
      engines,
      engineFuelTanks,
      ftlDrive,
      ftlFuelTanks,
      lifeSupport,
      accommodations,
      storeSystems,
      gravitySystems,
      defenses,
      commandControl,
      sensors,
      hangarMisc,
      weapons,
      ordnanceDesigns,
      launchSystems: launchSystemsList,
      damageDiagramZones,
      hitLocationChart,
      designProgressLevel: saveFile.designProgressLevel || 7,
      designTechTracks: saveFile.designTechTracks || [],
    },
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Get default file name for a warship
 */
export function getDefaultFileName(state: WarshipState): string {
  // Sanitize the name for use as a filename
  const sanitizeName = (name: string) => name.replace(/[<>:"/\\|?*]/g, '').trim();
  
  if (state.name && state.name.trim()) {
    return `${sanitizeName(state.name)}.warship.json`;
  }
  return 'New Ship.warship.json';
}
