import { APP_VERSION } from '@shared/constants/version';
import type { CampaignLoadResult } from './campaignSaveService';
import {
  SECTOR_FILE_EXTENSION,
  SECTOR_SAVE_FILE_VERSION,
  type SectorSaveFile,
} from '../types/campaignSaveFile';
import type {
  SectorDocument,
  SectorFaction,
  SectorFeature,
  SectorFeatureKind,
  SectorGenerationModel,
  SectorGenerationSettings,
  SectorRoute,
  SectorRouteType,
  SectorScaleId,
  SectorSettlementDensity,
  SectorSystem,
  SectorSystemRole,
} from '../types/sector';
import { DEFAULT_SECTOR_SETTINGS, SECTOR_SCALES, generateSector } from './sectorGenerationService';

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function number(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function integer(value: unknown, fallback = 0): number {
  return Math.trunc(number(value, fallback));
}

function enumValue<T extends string>(value: unknown, values: T[], fallback: T): T {
  return typeof value === 'string' && values.includes(value as T) ? value as T : fallback;
}

function readSettings(raw: unknown): SectorGenerationSettings {
  const settings = isObject(raw) ? raw : {};
  return {
    seed: text(settings.seed, DEFAULT_SECTOR_SETTINGS.seed),
    model: enumValue(settings.model, ['gmg', 'science'] as SectorGenerationModel[], 'gmg'),
    scaleId: enumValue(settings.scaleId, Object.keys(SECTOR_SCALES) as SectorScaleId[], 'cluster'),
    mappedSystemCount: Math.max(5, Math.min(50, integer(settings.mappedSystemCount, 24))),
    highlightedSiteCount: Math.max(1, Math.min(20, integer(settings.highlightedSiteCount, 8))),
    factionCount: Math.max(0, Math.min(6, integer(settings.factionCount, 3))),
    settlementDensity: enumValue(
      settings.settlementDensity,
      ['sparse', 'frontier', 'settled'] as SectorSettlementDensity[],
      'frontier',
    ),
    routeRangeLy: Math.max(0.1, number(settings.routeRangeLy, 20)),
    featureCount: Math.max(0, Math.min(10, integer(settings.featureCount, 4))),
  };
}

function readSystem(raw: unknown, index: number): SectorSystem | null {
  if (!isObject(raw)) return null;
  const roles: SectorSystemRole[] = ['capital', 'colony', 'outpost', 'resource-site', 'naval-base', 'ruin', 'anomaly', 'unexplored'];
  return {
    id: text(raw.id, `system-${index + 1}`),
    name: text(raw.name, `System ${index + 1}`),
    xLy: number(raw.xLy),
    yLy: number(raw.yLy),
    zLy: number(raw.zLy),
    spectralClass: text(raw.spectralClass, 'M V'),
    color: text(raw.color, '#e36b45'),
    multiplicity: Math.max(1, integer(raw.multiplicity, 1)),
    role: enumValue(raw.role, roles, 'unexplored'),
    importance: Math.max(1, Math.min(5, integer(raw.importance, 1))),
    factionId: typeof raw.factionId === 'string' ? raw.factionId : null,
    tags: (Array.isArray(raw.tags) ? raw.tags : []).filter((entry): entry is string => typeof entry === 'string'),
    hook: text(raw.hook),
    notes: text(raw.notes),
    locked: raw.locked === true,
    developedSystem: isObject(raw.developedSystem) ? raw.developedSystem as unknown as SectorSystem['developedSystem'] : null,
  };
}

function readFaction(raw: unknown, index: number): SectorFaction | null {
  if (!isObject(raw)) return null;
  return {
    id: text(raw.id, `faction-${index + 1}`),
    name: text(raw.name, `Faction ${index + 1}`),
    color: text(raw.color, '#3d7bd9'),
    capitalSystemId: text(raw.capitalSystemId),
    government: text(raw.government),
    goal: text(raw.goal),
    influenceRadiusLy: Math.max(0, number(raw.influenceRadiusLy)),
    notes: text(raw.notes),
    locked: raw.locked === true,
  };
}

function readFeature(raw: unknown, index: number): SectorFeature | null {
  if (!isObject(raw)) return null;
  return {
    id: text(raw.id, `feature-${index + 1}`),
    name: text(raw.name, `Feature ${index + 1}`),
    kind: enumValue(raw.kind, ['nebula', 'rift', 'ruins', 'anomaly'] as SectorFeatureKind[], 'anomaly'),
    xLy: number(raw.xLy),
    yLy: number(raw.yLy),
    zLy: number(raw.zLy),
    radiusLy: Math.max(0, number(raw.radiusLy)),
    description: text(raw.description),
    locked: raw.locked === true,
  };
}

function readRoute(raw: unknown, index: number): SectorRoute | null {
  if (!isObject(raw)) return null;
  return {
    id: text(raw.id, `route-${index + 1}`),
    fromSystemId: text(raw.fromSystemId),
    toSystemId: text(raw.toSystemId),
    distanceLy: Math.max(0, number(raw.distanceLy)),
    type: enumValue(raw.type, ['major', 'standard', 'frontier'] as SectorRouteType[], 'standard'),
  };
}

export function serializeSector(sector: SectorDocument, createdAt?: string): SectorSaveFile {
  const now = new Date().toISOString();
  return {
    version: SECTOR_SAVE_FILE_VERSION,
    appVersion: APP_VERSION,
    createdAt: createdAt || now,
    modifiedAt: now,
    sector,
  };
}

export function jsonToSectorSaveFile(json: string): SectorSaveFile | null {
  try {
    const parsed = JSON.parse(json) as unknown;
    return isObject(parsed) && isObject(parsed.sector) ? parsed as unknown as SectorSaveFile : null;
  } catch {
    return null;
  }
}

export function deserializeSector(saveFile: SectorSaveFile): CampaignLoadResult<SectorDocument> {
  if (!isObject(saveFile.sector)) return { success: false, errors: ['The file does not contain a star sector.'] };
  if (saveFile.version && saveFile.version.split('.')[0] !== SECTOR_SAVE_FILE_VERSION.split('.')[0]) {
    return { success: false, errors: [`Sector format ${saveFile.version} is not supported by ${SECTOR_SAVE_FILE_VERSION}.`] };
  }
  const raw = saveFile.sector as unknown as Record<string, unknown>;
  const settings = readSettings(raw.settings);
  const fallback = generateSector(settings);
  const systems = (Array.isArray(raw.systems) ? raw.systems : []).map(readSystem).filter((entry): entry is SectorSystem => entry !== null);
  const systemIds = new Set(systems.map((system) => system.id));
  const factions = (Array.isArray(raw.factions) ? raw.factions : []).map(readFaction).filter((entry): entry is SectorFaction => (
    entry !== null && systemIds.has(entry.capitalSystemId)
  ));
  const factionIds = new Set(factions.map((faction) => faction.id));
  const normalizedSystems = systems.map((system) => ({
    ...system,
    factionId: system.factionId && factionIds.has(system.factionId) ? system.factionId : null,
  }));
  const features = (Array.isArray(raw.features) ? raw.features : []).map(readFeature).filter((entry): entry is SectorFeature => entry !== null);
  const routes = (Array.isArray(raw.routes) ? raw.routes : []).map(readRoute).filter((entry): entry is SectorRoute => (
    entry !== null && systemIds.has(entry.fromSystemId) && systemIds.has(entry.toSystemId)
  ));
  const warnings: string[] = [];
  if (normalizedSystems.length === 0) warnings.push('The file had no valid mapped systems, so a new sector was generated.');

  return {
    success: true,
    createdAt: typeof saveFile.createdAt === 'string' ? saveFile.createdAt : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
    value: {
      name: text(raw.name, 'Unnamed Sector'),
      settings,
      diameterLy: number(raw.diameterLy, fallback.diameterLy),
      mapScaleLyPerHex: number(raw.mapScaleLyPerHex, fallback.mapScaleLyPerHex),
      backgroundStarCount: Math.max(0, integer(raw.backgroundStarCount, fallback.backgroundStarCount)),
      backgroundEstimateLabel: text(raw.backgroundEstimateLabel, fallback.backgroundEstimateLabel),
      systems: normalizedSystems.length > 0 ? normalizedSystems : fallback.systems,
      factions: normalizedSystems.length > 0 ? factions : fallback.factions,
      features: normalizedSystems.length > 0 ? features : fallback.features,
      routes: normalizedSystems.length > 0 ? routes : fallback.routes,
      overview: text(raw.overview),
      history: text(raw.history),
      currentConflicts: text(raw.currentConflicts),
      campaignHooks: text(raw.campaignHooks),
      notes: text(raw.notes),
    },
  };
}

export function getDefaultSectorFileName(name: string): string {
  const base = (name || 'Unnamed Sector')
    .trim()
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 80) || 'Unnamed Sector';
  return `${base}${SECTOR_FILE_EXTENSION}`;
}
