import { APP_VERSION } from '@shared/constants/version';
import type {
  AccelerationSource,
  ImportedEngineProfile,
  ImportedTravelShip,
  PhysicalAccelerationUnit,
  SpeedCapUnit,
  TravelDocument,
} from '../types/travelDocument';
import { DEFAULT_TRAVEL_DOCUMENT } from '../types/travelDocument';
import type { AccelerationConversionMethod, DistanceUnitId, TravelProfile, WarshipsScaleId } from './travelCalculationService';
import type { TravelSaveFile } from '../types/travelSaveFile';
import { TRAVEL_FILE_EXTENSION, TRAVEL_SAVE_FILE_VERSION } from '../types/travelSaveFile';

export interface TravelLoadResult {
  success: boolean;
  document?: TravelDocument;
  warnings?: string[];
  errors?: string[];
  createdAt?: string;
}

const DISTANCE_UNITS: DistanceUnitId[] = [
  'km', 'Mm', 'AU', 'light-second', 'light-minute', 'light-hour', 'light-day',
  'light-year', 'parsec', 'hex',
];
const SCALE_IDS: WarshipsScaleId[] = ['pl6', 'pl7plus'];
const ACCELERATION_SOURCES: AccelerationSource[] = ['rating', 'physical', 'ship'];
const CONVERSION_METHODS: AccelerationConversionMethod[] = ['scale-derived', 'warships-published'];
const PHYSICAL_UNITS: PhysicalAccelerationUnit[] = ['g', 'mps2'];
const PROFILES: TravelProfile[] = ['rest-to-rest', 'flyby'];
const SPEED_CAP_UNITS: SpeedCapUnit[] = ['percent-c', 'kmps', 'rating'];

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function nonNegative(value: unknown, fallback: number): number {
  return Math.max(0, finite(value, fallback));
}

function text(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

function enumValue<T extends string>(value: unknown, values: T[], fallback: T): T {
  return typeof value === 'string' && values.includes(value as T) ? value as T : fallback;
}

function readEngine(raw: unknown): ImportedEngineProfile | null {
  if (!raw || typeof raw !== 'object') return null;
  const engine = raw as Record<string, unknown>;
  return {
    engineTypeId: text(engine.engineTypeId, 'unknown-engine'),
    name: text(engine.name, 'Unknown engine'),
    scaleId: enumValue(engine.scaleId, SCALE_IDS, 'pl7plus'),
    engineHullPoints: nonNegative(engine.engineHullPoints, 0),
    accelerationRating: nonNegative(engine.accelerationRating, 0),
    accelerationMps2: nonNegative(engine.accelerationMps2, 0),
    requiresFuel: engine.requiresFuel === true,
    fuelOptional: engine.fuelOptional === true,
    fuelEfficiency: nonNegative(engine.fuelEfficiency, 0),
    fuelTankHullPoints: nonNegative(engine.fuelTankHullPoints, 0),
    fuelEnduranceDays: typeof engine.fuelEnduranceDays === 'number'
      && Number.isFinite(engine.fuelEnduranceDays)
      ? Math.max(0, engine.fuelEnduranceDays)
      : null,
  };
}

function readImportedShip(raw: unknown): ImportedTravelShip | null {
  if (!raw || typeof raw !== 'object') return null;
  const ship = raw as Record<string, unknown>;
  const engines = (Array.isArray(ship.engines) ? ship.engines : [])
    .map(readEngine)
    .filter((engine): engine is ImportedEngineProfile => engine !== null);
  return {
    name: text(ship.name, 'Imported ship'),
    hullName: text(ship.hullName, 'Unknown hull'),
    progressLevel: nonNegative(ship.progressLevel, 7),
    pl6AccelerationRating: nonNegative(ship.pl6AccelerationRating, 0),
    pl7AccelerationRating: nonNegative(ship.pl7AccelerationRating, 0),
    accelerationMps2: nonNegative(ship.accelerationMps2, 0),
    engines,
    hasAccelerationCompensation: ship.hasAccelerationCompensation === true,
    warnings: (Array.isArray(ship.warnings) ? ship.warnings : [])
      .filter((warning): warning is string => typeof warning === 'string'),
  };
}

export function serializeTravelDocument(document: TravelDocument, createdAt?: string): TravelSaveFile {
  const now = new Date().toISOString();
  return {
    version: TRAVEL_SAVE_FILE_VERSION,
    appVersion: APP_VERSION,
    createdAt: createdAt || now,
    modifiedAt: now,
    document,
  };
}

export function travelSaveFileToJson(saveFile: TravelSaveFile): string {
  return JSON.stringify(saveFile, null, 2);
}

export function jsonToTravelSaveFile(json: string): TravelSaveFile | null {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const candidate = parsed as Partial<TravelSaveFile>;
    if (!candidate.document || typeof candidate.document !== 'object') return null;
    return candidate as TravelSaveFile;
  } catch {
    return null;
  }
}

export function deserializeTravelDocument(saveFile: TravelSaveFile): TravelLoadResult {
  if (!saveFile.document || typeof saveFile.document !== 'object') {
    return { success: false, errors: ['The file does not contain a travel document.'] };
  }
  const raw = saveFile.document as unknown as Record<string, unknown>;
  const importedShip = readImportedShip(raw.importedShip);
  let accelerationSource = enumValue(
    raw.accelerationSource,
    ACCELERATION_SOURCES,
    DEFAULT_TRAVEL_DOCUMENT.accelerationSource,
  );
  const warnings: string[] = [];
  if (accelerationSource === 'ship' && !importedShip) {
    accelerationSource = 'rating';
    warnings.push('The saved imported ship was missing, so acceleration now uses a Warships rating.');
  }
  if (saveFile.version && saveFile.version !== TRAVEL_SAVE_FILE_VERSION) {
    warnings.push(`Travel format ${saveFile.version} was migrated to ${TRAVEL_SAVE_FILE_VERSION}.`);
  }

  return {
    success: true,
    createdAt: typeof saveFile.createdAt === 'string' ? saveFile.createdAt : undefined,
    document: {
      name: text(raw.name, DEFAULT_TRAVEL_DOCUMENT.name),
      distance: nonNegative(raw.distance, DEFAULT_TRAVEL_DOCUMENT.distance),
      distanceUnit: enumValue(raw.distanceUnit, DISTANCE_UNITS, DEFAULT_TRAVEL_DOCUMENT.distanceUnit),
      scaleId: enumValue(raw.scaleId, SCALE_IDS, DEFAULT_TRAVEL_DOCUMENT.scaleId),
      accelerationSource,
      accelerationConversionMethod: enumValue(
        raw.accelerationConversionMethod,
        CONVERSION_METHODS,
        DEFAULT_TRAVEL_DOCUMENT.accelerationConversionMethod,
      ),
      accelerationRating: nonNegative(raw.accelerationRating, DEFAULT_TRAVEL_DOCUMENT.accelerationRating),
      physicalAcceleration: nonNegative(raw.physicalAcceleration, DEFAULT_TRAVEL_DOCUMENT.physicalAcceleration),
      physicalAccelerationUnit: enumValue(
        raw.physicalAccelerationUnit,
        PHYSICAL_UNITS,
        DEFAULT_TRAVEL_DOCUMENT.physicalAccelerationUnit,
      ),
      profile: enumValue(raw.profile, PROFILES, DEFAULT_TRAVEL_DOCUMENT.profile),
      speedCapEnabled: raw.speedCapEnabled === true,
      speedCap: nonNegative(raw.speedCap, DEFAULT_TRAVEL_DOCUMENT.speedCap),
      speedCapUnit: enumValue(raw.speedCapUnit, SPEED_CAP_UNITS, DEFAULT_TRAVEL_DOCUMENT.speedCapUnit),
      accelerationCompensated: raw.accelerationCompensated !== false,
      importedShip,
    },
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

export function getDefaultTravelFileName(name: string): string {
  const base = (name || 'New Trip')
    .trim()
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 80) || 'New Trip';
  return `${base}${TRAVEL_FILE_EXTENSION}`;
}
