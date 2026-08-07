import { APP_VERSION } from '@shared/constants/version';
import {
  CIVILIZATION_FILE_EXTENSION,
  CIVILIZATION_SAVE_FILE_VERSION,
  SYSTEM_FILE_EXTENSION,
  SYSTEM_SAVE_FILE_VERSION,
  type CivilizationSaveFile,
  type ArtifactSaveFile,
  type SectorSaveFile,
  type StarSystemDocument,
  type StarSystemSaveFile,
} from '../types/campaignSaveFile';
import type {
  CityTownLocation,
  CivilizationDesign,
  GeneratedEnvironment,
  GeneratedLifeSeries,
  GeneratedMoon,
  GeneratedPlanet,
  GeneratedStar,
  GeneratedStarSystem,
  GmgPlanetTranslation,
  InstallationLocation,
  LifeSeriesId,
  OrbitTrackId,
  ScienceGenerationSettings,
  ScientificPlanetProperties,
  ScientificSystemProperties,
  SocietyOrigin,
} from '../types/worldbuilding';
import {
  DEFAULT_CIVILIZATION_DESIGN,
  createCityTown,
  createInstallation,
} from './civilizationDesignService';
import { translateSciencePlanetToGmg } from './gmgScienceTranslationService';

export interface CampaignLoadResult<T> {
  success: boolean;
  value?: T;
  createdAt?: string;
  errors?: string[];
  warnings?: string[];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function num(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function bool(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

function safeName(value: string, fallback: string): string {
  const base = (value || fallback).trim().replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').slice(0, 80);
  return base || fallback;
}

function versionError(version: unknown, expected: string): string | null {
  if (typeof version !== 'string' || !version) return null;
  return version.split('.')[0] === expected.split('.')[0]
    ? null
    : `File format ${version} is not supported by format ${expected}.`;
}

function timestamp(value: unknown): string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : new Date().toISOString();
}

export function serializeStarSystem(document: StarSystemDocument, createdAt?: string): StarSystemSaveFile {
  const now = new Date().toISOString();
  return {
    version: SYSTEM_SAVE_FILE_VERSION,
    appVersion: APP_VERSION,
    createdAt: createdAt || now,
    modifiedAt: now,
    document,
  };
}

export function serializeCivilization(civilization: CivilizationDesign, createdAt?: string): CivilizationSaveFile {
  const now = new Date().toISOString();
  return {
    version: CIVILIZATION_SAVE_FILE_VERSION,
    appVersion: APP_VERSION,
    createdAt: createdAt || now,
    modifiedAt: now,
    civilization,
  };
}

export function campaignSaveFileToJson(saveFile: StarSystemSaveFile | CivilizationSaveFile | ArtifactSaveFile | SectorSaveFile): string {
  return JSON.stringify(saveFile, null, 2);
}

export function jsonToStarSystemSaveFile(json: string): StarSystemSaveFile | null {
  try {
    const parsed = JSON.parse(json) as unknown;
    return isObject(parsed) && isObject(parsed.document) ? parsed as unknown as StarSystemSaveFile : null;
  } catch {
    return null;
  }
}

export function jsonToCivilizationSaveFile(json: string): CivilizationSaveFile | null {
  try {
    const parsed = JSON.parse(json) as unknown;
    return isObject(parsed) && isObject(parsed.civilization) ? parsed as unknown as CivilizationSaveFile : null;
  } catch {
    return null;
  }
}

function readLife(raw: unknown): GeneratedLifeSeries[] {
  if (!Array.isArray(raw)) return [];
  const validSeries: LifeSeriesId[] = ['I', 'II', 'III', 'IV', 'V', 'VI'];
  return raw.filter(isObject).map((entry) => ({
    series: validSeries.includes(entry.series as LifeSeriesId) ? entry.series as LifeSeriesId : 'I',
    base: str(entry.base, 'Carbon'),
    breathes: str(entry.breathes, 'Oxygen'),
    odds: num(entry.odds),
    roll: num(entry.roll),
    present: bool(entry.present),
  }));
}

function readEnvironment(raw: unknown): GeneratedEnvironment | null {
  if (!isObject(raw)) return null;
  const environmentClass = Math.max(1, Math.min(5, Math.trunc(num(raw.environmentClass, 5)))) as 1 | 2 | 3 | 4 | 5;
  return {
    roll: num(raw.roll),
    environmentClass,
    gravity: num(raw.gravity),
    radiation: num(raw.radiation),
    atmosphere: num(raw.atmosphere),
    pressure: num(raw.pressure),
    heat: num(raw.heat),
    life: readLife(raw.life),
    oceanRoll: typeof raw.oceanRoll === 'number' ? raw.oceanRoll : null,
    oceanExtent: ['Sparse', 'Moderate', 'Abundant', 'Complete'].includes(String(raw.oceanExtent))
      ? raw.oceanExtent as GeneratedEnvironment['oceanExtent'] : null,
    climateRoll: typeof raw.climateRoll === 'number' ? raw.climateRoll : null,
    climate: ['Calm', 'Active', 'Turbulent', 'Violent'].includes(String(raw.climate))
      ? raw.climate as GeneratedEnvironment['climate'] : null,
    landformRoll: typeof raw.landformRoll === 'number' ? raw.landformRoll : null,
    landforms: ['Smooth', 'Varied', 'Rugged', 'Perilous'].includes(String(raw.landforms))
      ? raw.landforms as GeneratedEnvironment['landforms'] : null,
  };
}

function readMoons(raw: unknown): GeneratedMoon[] {
  if (!Array.isArray(raw)) return [];
  const types: GeneratedMoon['type'][] = ['Tiny', 'Small', 'Ring system', 'Sub-Terran', 'Terran', 'Super-Terran'];
  return raw.filter(isObject).map((entry) => {
    const science = isObject(entry.science) ? entry.science : null;
    return {
      roll: num(entry.roll),
      type: types.includes(entry.type as GeneratedMoon['type']) ? entry.type as GeneratedMoon['type'] : 'Tiny',
      ...(science ? {
        science: {
          massEarth: Math.max(0, num(science.massEarth)),
          radiusEarth: Math.max(0, num(science.radiusEarth)),
          orbitalDistancePlanetRadii: Math.max(0, num(science.orbitalDistancePlanetRadii)),
          orbitalPeriodDays: Math.max(0, num(science.orbitalPeriodDays)),
        },
      } : {}),
    };
  });
}

function readPlanetScience(raw: unknown): ScientificPlanetProperties | undefined {
  if (!isObject(raw)) return undefined;
  const compositions: ScientificPlanetProperties['composition'][] = ['rocky', 'ocean', 'ice', 'gas', 'dwarf'];
  const zonePositions: ScientificPlanetProperties['habitableZonePosition'][] = ['inner', 'within', 'outer'];
  const habitabilities: ScientificPlanetProperties['habitability'][] = ['unlikely', 'marginal', 'potentially habitable'];
  const lifeValues: ScientificPlanetProperties['life'][] = ['none', 'microbial', 'complex'];
  return {
    composition: compositions.includes(raw.composition as never) ? raw.composition as ScientificPlanetProperties['composition'] : 'rocky',
    massEarth: Math.max(0, num(raw.massEarth)),
    radiusEarth: Math.max(0, num(raw.radiusEarth)),
    densityGcm3: Math.max(0, num(raw.densityGcm3)),
    gravityEarth: Math.max(0, num(raw.gravityEarth)),
    orbitalPeriodDays: Math.max(0, num(raw.orbitalPeriodDays)),
    eccentricity: Math.max(0, num(raw.eccentricity)),
    equilibriumTempK: Math.max(0, num(raw.equilibriumTempK)),
    albedo: Math.max(0, num(raw.albedo)),
    habitableZonePosition: zonePositions.includes(raw.habitableZonePosition as never)
      ? raw.habitableZonePosition as ScientificPlanetProperties['habitableZonePosition'] : 'outer',
    rotationHours: Math.max(0, num(raw.rotationHours)),
    tidallyLocked: bool(raw.tidallyLocked),
    atmosphere: str(raw.atmosphere, 'Unknown'),
    surfacePressureAtm: Math.max(0, num(raw.surfacePressureAtm)),
    water: str(raw.water, 'Unknown'),
    habitability: habitabilities.includes(raw.habitability as never)
      ? raw.habitability as ScientificPlanetProperties['habitability'] : 'unlikely',
    life: lifeValues.includes(raw.life as never) ? raw.life as ScientificPlanetProperties['life'] : 'none',
  };
}

function readGmgTranslation(raw: unknown): GmgPlanetTranslation | undefined {
  if (!isObject(raw)) return undefined;
  const temperature = raw.temperature === 'hot' || raw.temperature === 'cold' ? raw.temperature : 'temperate';
  const environmentClass = Math.max(1, Math.min(5, Math.trunc(num(raw.environmentClass, 5)))) as 1 | 2 | 3 | 4 | 5;
  const oceanValues: GmgPlanetTranslation['oceanExtent'][] = ['Sparse', 'Moderate', 'Abundant', 'Complete', null];
  const climateValues: GmgPlanetTranslation['climate'][] = ['Calm', 'Active', 'Turbulent', 'Violent', null];
  const landformValues: GmgPlanetTranslation['landforms'][] = ['Smooth', 'Varied', 'Rugged', 'Perilous', null];
  const lifeSeries = ['I', 'II', 'III', 'IV', 'V', 'VI'];
  const rating = (value: unknown) => Math.max(0, Math.min(5, Math.trunc(num(value))));
  return {
    planetType: str(raw.planetType, 'Terran, temperate') as GmgPlanetTranslation['planetType'],
    temperature,
    environmentClass,
    gravity: rating(raw.gravity),
    radiation: rating(raw.radiation),
    atmosphere: rating(raw.atmosphere),
    pressure: rating(raw.pressure),
    heat: rating(raw.heat),
    estimatedSurfaceTempK: Math.max(0, num(raw.estimatedSurfaceTempK)),
    incidentFluxEarth: Math.max(0, num(raw.incidentFluxEarth)),
    oceanExtent: oceanValues.includes(raw.oceanExtent as never) ? raw.oceanExtent as GmgPlanetTranslation['oceanExtent'] : null,
    climate: climateValues.includes(raw.climate as never) ? raw.climate as GmgPlanetTranslation['climate'] : null,
    landforms: landformValues.includes(raw.landforms as never) ? raw.landforms as GmgPlanetTranslation['landforms'] : null,
    lifeSeries: stringArray(raw.lifeSeries).filter((series) => lifeSeries.includes(series)) as GmgPlanetTranslation['lifeSeries'],
    assumptions: stringArray(raw.assumptions),
  };
}

function readPlanets(raw: unknown): GeneratedPlanet[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isObject).map((entry, index) => {
    const science = readPlanetScience(entry.science);
    const gmgTranslation = readGmgTranslation(entry.gmgTranslation);
    return {
      id: str(entry.id, `ring-${index + 1}`),
      ring: Math.max(1, Math.trunc(num(entry.ring, index + 1))),
      distanceAu: Math.max(0, num(entry.distanceAu)),
      typeRoll: num(entry.typeRoll),
      type: str(entry.type, 'Asteroid belt') as GeneratedPlanet['type'],
      temperature: ['hot', 'temperate', 'cold', 'none'].includes(String(entry.temperature))
        ? entry.temperature as GeneratedPlanet['temperature'] : 'none',
      moonCountRoll: typeof entry.moonCountRoll === 'number' ? entry.moonCountRoll : null,
      moons: readMoons(entry.moons),
      environment: readEnvironment(entry.environment),
      ...(science ? { science } : {}),
      ...(gmgTranslation ? { gmgTranslation } : {}),
    };
  });
}

function readStars(raw: unknown): GeneratedStar[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isObject).map((entry, index) => {
    const science = isObject(entry.science) ? entry.science : null;
    return {
      id: str(entry.id, `star-${index + 1}`),
      group: Math.max(1, Math.trunc(num(entry.group, 1))),
      role: entry.role === 'Companion' ? 'Companion' : 'Primary',
      classification: str(entry.classification, 'G'),
      color: str(entry.color, 'Yellow'),
      ...(science ? {
        science: {
          massSolar: Math.max(0, num(science.massSolar)),
          radiusSolar: Math.max(0, num(science.radiusSolar)),
          luminositySolar: Math.max(0, num(science.luminositySolar)),
          temperatureK: Math.max(0, num(science.temperatureK)),
          ageGyr: Math.max(0, num(science.ageGyr)),
          metallicityDex: num(science.metallicityDex),
          separationAu: typeof science.separationAu === 'number' ? Math.max(0, science.separationAu) : null,
        },
      } : {}),
    };
  });
}

function readScienceSettings(raw: unknown): ScienceGenerationSettings | null {
  if (!isObject(raw)) return null;
  return {
    systemDensity: raw.systemDensity === 'sparse' || raw.systemDensity === 'crowded' ? raw.systemDensity : 'typical',
    planetOccurrence: raw.planetOccurrence === 'conservative' || raw.planetOccurrence === 'optimistic'
      ? raw.planetOccurrence : 'observed',
    lifeFrequency: raw.lifeFrequency === 'none' || raw.lifeFrequency === 'common' ? raw.lifeFrequency : 'rare',
  };
}

function readStarSystem(raw: unknown, warnings: string[]): GeneratedStarSystem | null {
  if (!isObject(raw)) return null;
  const stars = readStars(raw.stars);
  const planets = readPlanets(raw.planets);
  if (stars.length === 0) warnings.push('The file had no valid stars.');
  const orbitTracks: OrbitTrackId[] = ['I', 'II', 'III', 'IV', 'V'];
  const potentialPlanetCount = Math.max(planets.length, Math.trunc(num(raw.potentialPlanetCount, planets.length)));
  const model = raw.generationModel === 'science' ? 'science' : 'gmg';
  const scienceRaw = isObject(raw.science) ? raw.science : null;
  const science: ScientificSystemProperties | null = model === 'science' && scienceRaw ? {
    ageGyr: Math.max(0, num(scienceRaw.ageGyr)),
    metallicityDex: num(scienceRaw.metallicityDex),
    architecture: scienceRaw.architecture === 'circumbinary' || scienceRaw.architecture === 'circumprimary'
      ? scienceRaw.architecture : 'single-star',
    centralMassSolar: Math.max(0, num(scienceRaw.centralMassSolar)),
    effectiveLuminositySolar: Math.max(0, num(scienceRaw.effectiveLuminositySolar)),
    stableInnerAu: Math.max(0, num(scienceRaw.stableInnerAu)),
    stableOuterAu: Math.max(0, num(scienceRaw.stableOuterAu)),
    habitableZoneInnerAu: Math.max(0, num(scienceRaw.habitableZoneInnerAu)),
    habitableZoneOuterAu: Math.max(0, num(scienceRaw.habitableZoneOuterAu)),
    snowLineAu: Math.max(0, num(scienceRaw.snowLineAu)),
  } : null;
  const restored: GeneratedStarSystem = {
    generationModel: model,
    seed: model === 'science' ? str(raw.seed, 'alternity') : null,
    scienceSettings: model === 'science' ? readScienceSettings(raw.scienceSettings) : null,
    science,
    starCountRoll: typeof raw.starCountRoll === 'number' ? raw.starCountRoll : null,
    starCount: Math.max(stars.length, Math.trunc(num(raw.starCount, stars.length))),
    starCountLabel: str(raw.starCountLabel, String(stars.length)),
    stars,
    orbitTrack: orbitTracks.includes(raw.orbitTrack as OrbitTrackId) ? raw.orbitTrack as OrbitTrackId : 'II',
    potentialPlanetCount,
    planets,
    unusedPotentialPlanets: Math.max(0, Math.trunc(num(raw.unusedPotentialPlanets, potentialPlanetCount - planets.length))),
  };
  if (model === 'science' && science && stars[0]) {
    let regenerated = false;
    restored.planets = planets.map((planet) => {
      if (!planet.science || planet.gmgTranslation) return planet;
      regenerated = true;
      return {
        ...planet,
        gmgTranslation: translateSciencePlanetToGmg(planet, {
          primaryStar: stars[0],
          effectiveLuminositySolar: science.effectiveLuminositySolar,
          systemAgeGyr: science.ageGyr,
        }),
      };
    });
    if (regenerated) warnings.push('Generated GMG game translations for an older science-informed system file.');
  }
  return restored;
}

export function deserializeStarSystem(saveFile: StarSystemSaveFile): CampaignLoadResult<StarSystemDocument> {
  const incompatible = versionError(saveFile.version, SYSTEM_SAVE_FILE_VERSION);
  if (incompatible) return { success: false, errors: [incompatible] };
  const warnings: string[] = [];
  if (saveFile.version !== SYSTEM_SAVE_FILE_VERSION) warnings.push(`Migrated system format ${saveFile.version || 'unversioned'} to ${SYSTEM_SAVE_FILE_VERSION}.`);
  const raw: Record<string, unknown> = isObject(saveFile.document) ? saveFile.document : {};
  const system = readStarSystem(raw.system, warnings);
  if (!system) return { success: false, errors: ['The file does not contain a star system.'] };
  return {
    success: true,
    value: { name: str(raw.name, 'Unnamed System'), system },
    createdAt: timestamp(saveFile.createdAt),
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

function readCity(raw: unknown, index: number): CityTownLocation | null {
  if (!isObject(raw)) return null;
  return {
    id: str(raw.id, `city-${index + 1}`), name: str(raw.name, 'Unnamed City'), kind: raw.kind === 'town' ? 'town' : 'city',
    population: str(raw.population), overview: str(raw.overview), layout: str(raw.layout), lodging: str(raw.lodging),
    foodAndDrink: str(raw.foodAndDrink), equipmentAccess: str(raw.equipmentAccess), criminalUnderworld: str(raw.criminalUnderworld),
    lawEnforcement: str(raw.lawEnforcement), specialFacilities: str(raw.specialFacilities), campaignRole: str(raw.campaignRole), notes: str(raw.notes),
  };
}

function readInstallation(raw: unknown, index: number): InstallationLocation | null {
  if (!isObject(raw)) return null;
  return {
    id: str(raw.id, `installation-${index + 1}`), name: str(raw.name, 'Unnamed Station'),
    kind: raw.kind === 'installation' ? 'installation' : 'station', purpose: str(raw.purpose), location: str(raw.location),
    occupants: str(raw.occupants), isolation: str(raw.isolation), facilityIds: stringArray(raw.facilityIds), layout: str(raw.layout),
    contacts: str(raw.contacts), rivals: str(raw.rivals), campaignRole: str(raw.campaignRole), notes: str(raw.notes),
  };
}

function migrateLegacyLocations(raw: Record<string, unknown>, design: CivilizationDesign, warnings: string[]): void {
  const legacyCityValues = [raw.cityLayout, raw.lodging, raw.foodAndDrink, raw.equipmentAccess, raw.criminalUnderworld, raw.lawEnforcement, raw.specialFacilities];
  if (design.cities.length === 0 && legacyCityValues.some((value) => typeof value === 'string' && value.trim())) {
    design.cities.push({
      ...createCityTown('city-migrated'), name: 'Migrated City', overview: str(raw.settlements), layout: str(raw.cityLayout),
      lodging: str(raw.lodging), foodAndDrink: str(raw.foodAndDrink), equipmentAccess: str(raw.equipmentAccess),
      criminalUnderworld: str(raw.criminalUnderworld), lawEnforcement: str(raw.lawEnforcement),
      specialFacilities: str(raw.specialFacilities), campaignRole: str(raw.campaignRole), notes: str(raw.notes),
    });
    warnings.push('Converted the earlier single city worksheet into a city record.');
  }
  const legacyInstallationValues = [raw.installationPurpose, raw.installationNotes, raw.installationFacilityIds];
  if (design.installations.length === 0 && legacyInstallationValues.some((value) => Array.isArray(value) ? value.length > 0 : typeof value === 'string' && value.trim())) {
    design.installations.push({
      ...createInstallation('installation-migrated'), name: 'Migrated Installation', purpose: str(raw.installationPurpose),
      facilityIds: stringArray(raw.installationFacilityIds), layout: str(raw.installationNotes), notes: str(raw.notes),
    });
    warnings.push('Converted the earlier single installation worksheet into an installation record.');
  }
}

function readCivilization(raw: unknown, warnings: string[]): CivilizationDesign | null {
  if (!isObject(raw)) return null;
  const origin: SocietyOrigin = raw.origin === 'alien' || raw.origin === 'mixed' ? raw.origin : 'human';
  const design: CivilizationDesign = {
    ...DEFAULT_CIVILIZATION_DESIGN,
    name: str(raw.name), origin,
    progressLevel: Math.max(0, Math.min(9, Math.trunc(num(raw.progressLevel, 6)))),
    civilizationLevel: Math.max(0, Math.min(8, Math.trunc(num(raw.civilizationLevel, 4)))),
    alienCivilizationLevel: Math.max(0, Math.min(8, Math.trunc(num(raw.alienCivilizationLevel, 4)))),
    lawLevel: Math.max(0, Math.min(8, Math.trunc(num(raw.lawLevel, 4)))),
    hostileWorld: bool(raw.hostileWorld),
    population: str(raw.population), government: str(raw.government), homeland: str(raw.homeland),
    foodAndShelter: str(raw.foodAndShelter), industries: str(raw.industries), externalContact: str(raw.externalContact),
    leisureAndArt: str(raw.leisureAndArt), values: str(raw.values), rivals: str(raw.rivals), enemies: str(raw.enemies),
    heroes: str(raw.heroes), currency: str(raw.currency), resources: str(raw.resources), imports: str(raw.imports),
    exports: str(raw.exports), shortages: str(raw.shortages), tradeImportIds: stringArray(raw.tradeImportIds),
    tradeExportIds: stringArray(raw.tradeExportIds), settlements: str(raw.settlements),
    cities: Array.isArray(raw.cities) ? raw.cities.map(readCity).filter((entry): entry is CityTownLocation => !!entry) : [],
    installations: Array.isArray(raw.installations)
      ? raw.installations.map(readInstallation).filter((entry): entry is InstallationLocation => !!entry) : [],
    alienGoals: str(raw.alienGoals), alienOrganization: str(raw.alienOrganization), alienAppearance: str(raw.alienAppearance),
    campaignRole: str(raw.campaignRole), notes: str(raw.notes),
  };
  migrateLegacyLocations(raw, design, warnings);
  return design;
}

export function deserializeCivilization(saveFile: CivilizationSaveFile): CampaignLoadResult<CivilizationDesign> {
  const incompatible = versionError(saveFile.version, CIVILIZATION_SAVE_FILE_VERSION);
  if (incompatible) return { success: false, errors: [incompatible] };
  const warnings: string[] = [];
  if (saveFile.version !== CIVILIZATION_SAVE_FILE_VERSION) warnings.push(`Migrated civilization format ${saveFile.version || 'unversioned'} to ${CIVILIZATION_SAVE_FILE_VERSION}.`);
  const civilization = readCivilization(saveFile.civilization, warnings);
  if (!civilization) return { success: false, errors: ['The file does not contain a civilization.'] };
  return {
    success: true,
    value: civilization,
    createdAt: timestamp(saveFile.createdAt),
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

export function getDefaultSystemFileName(name: string): string {
  return `${safeName(name, 'Star System')}${SYSTEM_FILE_EXTENSION}`;
}

export function getDefaultCivilizationFileName(name: string): string {
  return `${safeName(name, 'Civilization')}${CIVILIZATION_FILE_EXTENSION}`;
}
