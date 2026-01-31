import type { WarshipSaveFile, SavedPowerPlant, SavedFuelTank, SavedEngine, SavedEngineFuelTank, SavedFTLDrive, SavedFTLFuelTank, SavedLifeSupport, SavedAccommodation, SavedStoreSystem, SavedGravitySystem, SavedDefenseSystem, SavedCommandControlSystem, SavedSensor, SavedHangarMiscSystem, SavedWeapon, SavedOrdnanceDesign, SavedLaunchSystem } from '../types/saveFile';
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
import { SAVE_FILE_VERSION } from '../types/saveFile';
import { getAllHulls } from './hullService';
import { getAllArmorTypes } from './armorService';
import { getAllPowerPlantTypes, generateFuelTankId } from './powerPlantService';
import { getAllEngineTypes, generateEngineInstallationId, generateEngineFuelTankId } from './engineService';
import { getAllFTLDriveTypes, generateFTLInstallationId, generateFTLFuelTankId } from './ftlDriveService';
import { getAllLifeSupportTypes, getAllAccommodationTypes, getAllStoreSystemTypes, getAllGravitySystemTypes, generateLifeSupportId, generateAccommodationId, generateStoreSystemId, generateGravitySystemId } from './supportSystemService';
import { getAllDefenseSystemTypes, generateDefenseId, calculateDefenseHullPoints, calculateDefensePower, calculateDefenseCost } from './defenseService';
import { getAllCommandControlSystemTypes, calculateCommandControlHullPoints, calculateCommandControlPower, calculateCommandControlCost } from './commandControlService';
import { getAllSensorTypes, generateSensorId, calculateSensorHullPoints, calculateSensorPower, calculateSensorCost, calculateTrackingCapability, type ComputerQuality } from './sensorService';
import { getAllHangarMiscSystemTypes, generateHangarMiscId, calculateHangarMiscHullPoints, calculateHangarMiscPower, calculateHangarMiscCost, calculateHangarMiscCapacity } from './hangarMiscService';
import { getAllBeamWeaponTypes, getAllProjectileWeaponTypes, getAllTorpedoWeaponTypes, getAllSpecialWeaponTypes, createInstalledWeapon } from './weaponService';
import { getLaunchSystems, getPropulsionSystems, getWarheads, getGuidanceSystems, calculateLaunchSystemStats, calculateMissileDesign, calculateBombDesign, calculateMineDesign } from './ordnanceService';

/**
 * State representing the current warship configuration
 */
export interface WarshipState {
  name: string;
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
    hull: state.hull ? { id: state.hull.id } : null,
    armor: state.armorType ? { id: state.armorType.id } : null,
    designProgressLevel: state.designProgressLevel,
    designTechTracks: state.designTechTracks,
    powerPlants: (state.powerPlants || []).map((pp): SavedPowerPlant => ({
      typeId: pp.type.id,
      hullPoints: pp.hullPoints,
    })),
    fuelTanks: (state.fuelTanks || []).map((ft): SavedFuelTank => ({
      forPowerPlantTypeId: ft.forPowerPlantType.id,
      hullPoints: ft.hullPoints,
    })),
    engines: (state.engines || []).map((eng): SavedEngine => ({
      typeId: eng.type.id,
      hullPoints: eng.hullPoints,
    })),
    engineFuelTanks: (state.engineFuelTanks || []).map((ft): SavedEngineFuelTank => ({
      forEngineTypeId: ft.forEngineType.id,
      hullPoints: ft.hullPoints,
    })),
    ftlDrive: state.ftlDrive ? {
      typeId: state.ftlDrive.type.id,
      hullPoints: state.ftlDrive.hullPoints,
    } as SavedFTLDrive : null,
    ftlFuelTanks: (state.ftlFuelTanks || []).map((ft): SavedFTLFuelTank => ({
      forFTLDriveTypeId: ft.forFTLDriveType.id,
      hullPoints: ft.hullPoints,
    })),
    lifeSupport: (state.lifeSupport || []).map((ls): SavedLifeSupport => ({
      typeId: ls.type.id,
      quantity: ls.quantity,
    })),
    accommodations: (state.accommodations || []).map((acc): SavedAccommodation => ({
      typeId: acc.type.id,
      quantity: acc.quantity,
    })),
    storeSystems: (state.storeSystems || []).map((ss): SavedStoreSystem => ({
      typeId: ss.type.id,
      quantity: ss.quantity,
    })),
    gravitySystems: (state.gravitySystems || []).map((gs): SavedGravitySystem => ({
      typeId: gs.type.id,
      hullPoints: gs.hullPoints,
    })),
    defenses: (state.defenses || []).map((def): SavedDefenseSystem => ({
      typeId: def.type.id,
      quantity: def.quantity,
    })),
    commandControl: (state.commandControl || []).map((cc): SavedCommandControlSystem => ({
      id: cc.id,
      typeId: cc.type.id,
      quantity: cc.quantity,
    })),
    sensors: (state.sensors || []).map((s): SavedSensor => ({
      typeId: s.type.id,
      quantity: s.quantity,
      assignedSensorControlId: s.assignedSensorControlId,
    })),
    hangarMisc: (state.hangarMisc || []).map((hm): SavedHangarMiscSystem => ({
      typeId: hm.type.id,
      quantity: hm.quantity,
    })),
    weapons: (state.weapons || []).map((w): SavedWeapon => ({
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
      extraCapacity: ls.extraCapacity,
      loadout: ls.loadout || [],
    })),
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
  
  const [major] = saveFile.version.split('.');
  const [currentMajor] = SAVE_FILE_VERSION.split('.');
  if (major !== currentMajor) {
    errors.push(`Incompatible save file version: ${saveFile.version} (current: ${SAVE_FILE_VERSION})`);
    return { success: false, errors };
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
        id: crypto.randomUUID(),
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
        id: generateFuelTankId(),
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
        id: generateEngineInstallationId(),
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
        id: generateEngineFuelTankId(),
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
        id: generateFTLInstallationId(),
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
        id: generateFTLFuelTankId(),
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
        id: generateLifeSupportId(),
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
        id: generateAccommodationId(),
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
        id: generateStoreSystemId(),
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
        id: generateGravitySystemId(),
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
        id: generateDefenseId(),
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
  const commandControl: InstalledCommandControlSystem[] = [];
  const allCCTypes = getAllCommandControlSystemTypes();
  
  for (const savedCC of (saveFile.commandControl || [])) {
    const ccType = allCCTypes.find(t => t.id === savedCC.typeId);
    if (ccType) {
      const hullPts = calculateCommandControlHullPoints(ccType, shipHullPoints, savedCC.quantity);
      const power = calculateCommandControlPower(ccType, savedCC.quantity);
      const cost = calculateCommandControlCost(ccType, shipHullPoints, savedCC.quantity);
      commandControl.push({
        id: savedCC.id,
        type: ccType,
        quantity: savedCC.quantity,
        hullPoints: hullPts,
        powerRequired: power,
        cost,
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
      
      // Determine computer quality from assigned sensor control
      let computerQuality: ComputerQuality = 'none';
      if (savedSensor.assignedSensorControlId) {
        const assignedControl = commandControl.find(cc => cc.id === savedSensor.assignedSensorControlId);
        if (assignedControl?.type.quality) {
          computerQuality = assignedControl.type.quality as ComputerQuality;
        }
      }
      
      sensors.push({
        id: generateSensorId(),
        type: sensorType,
        quantity: savedSensor.quantity,
        hullPoints: hullPts,
        powerRequired: power,
        cost,
        arcsCovered: Math.min(savedSensor.quantity * sensorType.arcsCovered, 4),
        trackingCapability: calculateTrackingCapability(designPL, computerQuality, savedSensor.quantity),
        assignedSensorControlId: savedSensor.assignedSensorControlId,
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
        id: generateHangarMiscId(),
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
      const stats = calculateLaunchSystemStats(launchSystem, savedLS.quantity, savedLS.extraCapacity);
      launchSystemsList.push({
        id: savedLS.id,
        launchSystemType: launchSystem.id,
        quantity: savedLS.quantity,
        extraCapacity: savedLS.extraCapacity,
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
  
  // If we have critical errors (no hull found when one was specified), fail
  if (errors.length > 0) {
    return { success: false, errors, warnings };
  }
  
  return {
    success: true,
    state: {
      name: saveFile.name || 'Unnamed Warship',
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
