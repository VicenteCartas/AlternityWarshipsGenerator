import type { WarshipSaveFile, SavedPowerPlant, SavedFuelTank, SavedEngine, SavedEngineFuelTank, SavedFTLDrive, SavedLifeSupport, SavedAccommodation, SavedStoreSystem } from '../types/saveFile';
import type { Hull } from '../types/hull';
import type { ArmorType, ArmorWeight } from '../types/armor';
import type { InstalledPowerPlant, InstalledFuelTank } from '../types/powerPlant';
import type { InstalledEngine, InstalledEngineFuelTank } from '../types/engine';
import type { InstalledFTLDrive } from '../types/ftlDrive';
import type { InstalledLifeSupport, InstalledAccommodation, InstalledStoreSystem } from '../types/supportSystem';
import type { ProgressLevel, TechTrack } from '../types/common';
import { SAVE_FILE_VERSION } from '../types/saveFile';
import { getAllHulls } from './hullService';
import { getAllArmorTypes } from './armorService';
import { getAllPowerPlantTypes, generateFuelTankId } from './powerPlantService';
import { getAllEngineTypes, generateEngineInstallationId, generateEngineFuelTankId } from './engineService';
import { getAllFTLDriveTypes, generateFTLInstallationId } from './ftlDriveService';
import { getAllLifeSupportTypes, getAllAccommodationTypes, getAllStoreSystemTypes, generateLifeSupportId, generateAccommodationId, generateStoreSystemId } from './supportSystemService';

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
  lifeSupport: InstalledLifeSupport[];
  accommodations: InstalledAccommodation[];
  storeSystems: InstalledStoreSystem[];
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
  if (saveFile.ftlDrive) {
    const allFTLTypes = getAllFTLDriveTypes();
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
      lifeSupport,
      accommodations,
      storeSystems,
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
