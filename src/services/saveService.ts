import type { WarshipSaveFile, SavedPowerPlant } from '../types/saveFile';
import type { Hull } from '../types/hull';
import type { ArmorType, ArmorWeight } from '../types/armor';
import type { InstalledPowerPlant } from '../types/powerPlant';
import { SAVE_FILE_VERSION } from '../types/saveFile';
import { getAllHulls } from './hullService';
import { getAllArmorTypes } from './armorService';
import { getAllPowerPlantTypes } from './powerPlantService';

/**
 * State representing the current warship configuration
 */
export interface WarshipState {
  name: string;
  hull: Hull | null;
  armorWeight: ArmorWeight | null;
  armorType: ArmorType | null;
  powerPlants: InstalledPowerPlant[];
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
    powerPlants: state.powerPlants.map((pp): SavedPowerPlant => ({
      typeId: pp.type.id,
      hullPoints: pp.hullPoints,
      fuelHullPoints: pp.fuelHullPoints,
    })),
    engines: [],
    ftlDrive: null,
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
  
  for (const savedPP of saveFile.powerPlants) {
    const ppType = allPowerPlantTypes.find(t => t.id === savedPP.typeId);
    if (ppType) {
      powerPlants.push({
        installationId: crypto.randomUUID(),
        type: ppType,
        hullPoints: savedPP.hullPoints,
        fuelHullPoints: savedPP.fuelHullPoints,
      });
    } else {
      warnings.push(`Power plant type not found: ${savedPP.typeId}`);
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
