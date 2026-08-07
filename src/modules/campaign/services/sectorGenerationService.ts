import { createSeededRandom } from './scienceStarSystemService';
import type {
  SectorDocument,
  SectorFaction,
  SectorFeature,
  SectorFeatureKind,
  SectorGenerationSettings,
  SectorHexClaim,
  SectorRoute,
  SectorScaleDefinition,
  SectorScaleId,
  SectorSettlementDensity,
  SectorSystem,
  SectorSystemRole,
} from '../types/sector';

export const SECTOR_SCALES: Record<SectorScaleId, SectorScaleDefinition> = {
  province: { id: 'province', name: 'Province', diameterLy: 10, gmgEstimatedStars: 50, mapScaleLyPerHex: 1 },
  cluster: { id: 'cluster', name: 'Cluster', diameterLy: 100, gmgEstimatedStars: 5_000, mapScaleLyPerHex: 5 },
  region: { id: 'region', name: 'Region', diameterLy: 1_000, gmgEstimatedStars: 500_000, mapScaleLyPerHex: 50 },
  arm: { id: 'arm', name: 'Arm', diameterLy: 10_000, gmgEstimatedStars: 50_000_000, mapScaleLyPerHex: 500 },
  galaxy: { id: 'galaxy', name: 'Galaxy', diameterLy: 100_000, gmgEstimatedStars: 5_000_000_000, mapScaleLyPerHex: 5_000 },
};

export const DEFAULT_SECTOR_SETTINGS: SectorGenerationSettings = {
  seed: 'Frontier Cluster',
  model: 'gmg',
  scaleId: 'cluster',
  mappedSystemCount: 24,
  highlightedSiteCount: 8,
  factionCount: 3,
  settlementDensity: 'frontier',
  routeRangeLy: 20,
  featureCount: 4,
};

export const SECTOR_MAP_WIDTH = 1_000;
export const SECTOR_MAP_HEIGHT = 700;

export interface SectorMapGeometry {
  columns: number;
  rows: number;
  hexRadius: number;
  gridWidth: number;
  gridHeight: number;
  gridOffsetX: number;
  gridOffsetY: number;
}

export interface SectorMapPoint {
  x: number;
  y: number;
}

export interface SectorHexCoordinates {
  column: number;
  row: number;
}

type SectorTerritory = Pick<SectorDocument, 'diameterLy' | 'mapScaleLyPerHex' | 'systems' | 'factions'>;

const NAME_START = ['Al', 'Ar', 'Bel', 'Cael', 'Dor', 'Eri', 'Fort', 'Gla', 'Hel', 'Iri', 'Jan', 'Kor', 'Lys', 'Mer', 'Nov', 'Or', 'Pra', 'Quin', 'Rho', 'Ser', 'Tal', 'Ulm', 'Var', 'White', 'Xan', 'Ymir', 'Zeta'];
const NAME_END = ['ara', 'axis', 'ea', 'ion', 'is', 'on', 'ora', 'os', 'Prime', 'Reach', 'Station', 'us', 'vale', 'ward'];
const FACTION_START = ['Aster', 'Concord', 'Helix', 'Meridian', 'Orion', 'Pioneer', 'Solar', 'Unity', 'Vanguard', 'Zenith'];
const FACTION_END = ['Alliance', 'Compact', 'Consortium', 'Directorate', 'Dominion', 'League', 'Republic', 'Union'];
const FACTION_COLORS = ['#d84a4a', '#3d7bd9', '#3a9b68', '#c48a2c', '#8a5bc2', '#2a9ca6'];
const GOVERNMENTS = ['federal republic', 'trade compact', 'military directorate', 'dynastic council', 'cooperative league', 'corporate consortium'];
const FACTION_GOALS = ['secure the frontier', 'control interstellar trade', 'contain alien threats', 'recover precursor technology', 'expand settlement', 'protect independent systems'];
const FEATURE_NAMES: Record<SectorFeatureKind, string[]> = {
  nebula: ['Azure Veil', 'Ember Cloud', 'Ghostlight Nebula', 'Shrouded Nursery'],
  rift: ['Black Rift', 'Old Star Gap', 'Silent Expanse', 'Void Channel'],
  ruins: ['Precursor Graveyard', 'Broken Array', 'Dead Beacon Field', 'Lost Construct'],
  anomaly: ['Fold Scar', 'Gravity Lens', 'Echo Zone', 'Temporal Wake'],
};
const FEATURE_DESCRIPTIONS: Record<SectorFeatureKind, string> = {
  nebula: 'A cloud of gas and dust that obscures sensors and may contain young stars.',
  rift: 'A sparse region with few mapped systems, creating a natural political boundary.',
  ruins: 'A broad field of ancient artificial remains and uncertain hazards.',
  anomaly: 'An unexplained region where ordinary navigation or physical laws become unreliable.',
};
const SITE_HOOKS = [
  'A dormant beacon begins transmitting a route to an uncharted system.',
  'Two factions claim the same newly habitable world.',
  'A survey team vanished after reporting impossible sensor readings.',
  'A strategic fuel source has become inaccessible without explanation.',
  'A failed colony sends a distress call decades after its evacuation.',
  'An isolated polity offers access in exchange for covert assistance.',
  'A derelict warship arrives without crew or flight history.',
  'A route once considered impassable has reopened.',
  'Evidence suggests a local star was deliberately altered.',
  'Pirates have discovered a shortcut that bypasses established defenses.',
];
const ROLE_TAGS: Record<SectorSystemRole, string[]> = {
  capital: ['government', 'trade', 'high population'],
  colony: ['settled', 'civilian'],
  outpost: ['frontier', 'support'],
  'resource-site': ['resources', 'industry'],
  'naval-base': ['military', 'strategic'],
  ruin: ['precursor', 'archaeology'],
  anomaly: ['mystery', 'hazard'],
  unexplored: ['uncharted', 'survey'],
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function rounded(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function getSectorMapGeometry(sector: Pick<SectorDocument, 'diameterLy' | 'mapScaleLyPerHex'>): SectorMapGeometry {
  const columns = Math.max(1, Math.round(sector.diameterLy / sector.mapScaleLyPerHex));
  const rows = Math.max(1, Math.round(columns * 0.7));
  const hexRadius = Math.min(
    SECTOR_MAP_WIDTH / (columns * 1.5 + 0.5),
    SECTOR_MAP_HEIGHT / ((rows + 0.5) * Math.sqrt(3)),
  );
  const gridWidth = (columns * 1.5 + 0.5) * hexRadius;
  const gridHeight = (rows + 0.5) * Math.sqrt(3) * hexRadius;
  return {
    columns,
    rows,
    hexRadius,
    gridWidth,
    gridHeight,
    gridOffsetX: (SECTOR_MAP_WIDTH - gridWidth) / 2 + hexRadius,
    gridOffsetY: (SECTOR_MAP_HEIGHT - gridHeight) / 2 + hexRadius,
  };
}

export function getSectorMapPoint(
  sector: Pick<SectorDocument, 'diameterLy'>,
  geometry: SectorMapGeometry,
  xLy: number,
  yLy: number,
): SectorMapPoint {
  return {
    x: SECTOR_MAP_WIDTH / 2 + xLy / sector.diameterLy * (geometry.gridWidth - geometry.hexRadius * 2),
    y: SECTOR_MAP_HEIGHT / 2 - yLy / (sector.diameterLy * 0.7) * (geometry.gridHeight - geometry.hexRadius * 2),
  };
}

export function getSectorHexCenter(
  geometry: SectorMapGeometry,
  column: number,
  row: number,
): SectorMapPoint {
  return {
    x: geometry.gridOffsetX + column * geometry.hexRadius * 1.5,
    y: geometry.gridOffsetY + (row + (column % 2 ? 0.5 : 0)) * geometry.hexRadius * Math.sqrt(3),
  };
}

export function getSectorHexPoints(centerX: number, centerY: number, radius: number): string {
  return Array.from({ length: 6 }, (_value, index) => {
    const angle = 60 * index * Math.PI / 180;
    return `${centerX + radius * Math.cos(angle)},${centerY + radius * Math.sin(angle)}`;
  }).join(' ');
}

function findSectorHexAtMapPoint(
  geometry: SectorMapGeometry,
  point: SectorMapPoint,
): SectorHexCoordinates | null {
  const approximateColumn = Math.round(
    (point.x - geometry.gridOffsetX) / (geometry.hexRadius * 1.5),
  );
  let closest: { coordinates: SectorHexCoordinates; distance: number } | null = null;
  for (let column = approximateColumn - 1; column <= approximateColumn + 1; column += 1) {
    if (column < 0 || column >= geometry.columns) continue;
    const rowOffset = column % 2 ? 0.5 : 0;
    const approximateRow = Math.round(
      (point.y - geometry.gridOffsetY) / (geometry.hexRadius * Math.sqrt(3)) - rowOffset,
    );
    for (let row = approximateRow - 1; row <= approximateRow + 1; row += 1) {
      if (row < 0 || row >= geometry.rows) continue;
      const center = getSectorHexCenter(geometry, column, row);
      const deltaX = Math.abs(point.x - center.x);
      const deltaY = Math.abs(point.y - center.y);
      const inside = deltaX <= geometry.hexRadius + 0.000_001
        && deltaY <= geometry.hexRadius * Math.sqrt(3) / 2 + 0.000_001
        && Math.sqrt(3) * deltaX + deltaY <= Math.sqrt(3) * geometry.hexRadius + 0.000_001;
      if (!inside) continue;
      const distance = Math.hypot(deltaX, deltaY);
      if (!closest || distance < closest.distance) {
        closest = { coordinates: { column, row }, distance };
      }
    }
  }
  return closest?.coordinates ?? null;
}

export function findSectorHexAtPosition(
  sector: Pick<SectorDocument, 'diameterLy' | 'mapScaleLyPerHex'>,
  xLy: number,
  yLy: number,
): SectorHexCoordinates | null {
  const geometry = getSectorMapGeometry(sector);
  const point = getSectorMapPoint(sector, geometry, xLy, yLy);
  return findSectorHexAtMapPoint(geometry, point);
}

function claimKey(column: number, row: number): string {
  return `${column}:${row}`;
}

function calculateBaseSectorClaimMap(document: SectorTerritory): Map<string, string> {
  const geometry = getSectorMapGeometry(document);
  const systemById = new Map(document.systems.map((system) => [system.id, system]));
  const claims = new Map<string, string>();
  const mapWidthLy = geometry.gridWidth - geometry.hexRadius * 2;
  const mapHeightLy = geometry.gridHeight - geometry.hexRadius * 2;
  for (let column = 0; column < geometry.columns; column += 1) {
    for (let row = 0; row < geometry.rows; row += 1) {
      const center = getSectorHexCenter(geometry, column, row);
      const xLy = mapWidthLy === 0
        ? 0
        : (center.x - SECTOR_MAP_WIDTH / 2) * document.diameterLy / mapWidthLy;
      const yLy = mapHeightLy === 0
        ? 0
        : -(center.y - SECTOR_MAP_HEIGHT / 2) * document.diameterLy * 0.7 / mapHeightLy;
      let closest: { factionId: string; distance: number } | null = null;
      for (const faction of document.factions) {
        const capital = systemById.get(faction.capitalSystemId);
        if (!capital) continue;
        const distance = Math.hypot(xLy - capital.xLy, yLy - capital.yLy);
        if (distance <= faction.influenceRadiusLy && (!closest || distance < closest.distance)) {
          closest = { factionId: faction.id, distance };
        }
      }
      if (closest) claims.set(claimKey(column, row), closest.factionId);
    }
  }
  return claims;
}

function normal(rng: () => number): number {
  const first = Math.max(Number.EPSILON, rng());
  return Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * rng());
}

function randomEntry<T>(entries: T[], rng: () => number): T {
  return entries[Math.floor(rng() * entries.length) % entries.length];
}

function systemName(index: number, rng: () => number): string {
  const start = randomEntry(NAME_START, rng);
  const end = randomEntry(NAME_END, rng);
  return `${start}${end}${index % 7 === 0 ? ` ${index + 1}` : ''}`;
}

function uniqueSystemName(index: number, rng: () => number, usedNames: Set<string>): string {
  let candidate = systemName(index, rng);
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const key = candidate.toLocaleLowerCase();
    if (!usedNames.has(key)) {
      usedNames.add(key);
      return candidate;
    }
    candidate = systemName(index, rng);
  }

  const base = candidate;
  let suffix = 2;
  while (usedNames.has(`${base} ${suffix}`.toLocaleLowerCase())) suffix += 1;
  candidate = `${base} ${suffix}`;
  usedNames.add(candidate.toLocaleLowerCase());
  return candidate;
}

function factionName(index: number, rng: () => number): string {
  return `${randomEntry(FACTION_START, rng)} ${randomEntry(FACTION_END, rng)}${index > 4 ? ` ${index + 1}` : ''}`;
}

function spectralClass(model: SectorGenerationSettings['model'], rng: () => number): { classification: string; color: string } {
  const value = rng();
  if (model === 'science') {
    if (value < 0.70) return { classification: 'M V', color: '#e36b45' };
    if (value < 0.83) return { classification: 'K V', color: '#eaa45b' };
    if (value < 0.91) return { classification: 'G V', color: '#f4d35e' };
    if (value < 0.96) return { classification: 'F V', color: '#fff1bd' };
    if (value < 0.98) return { classification: 'A V', color: '#dcecff' };
    if (value < 0.99) return { classification: 'B V', color: '#9fc7ff' };
    return { classification: 'White dwarf', color: '#d6f0ff' };
  }
  if (value < 0.05) return { classification: 'O/B', color: '#78a8ff' };
  if (value < 0.10) return { classification: 'A', color: '#dcecff' };
  if (value < 0.30) return { classification: 'F', color: '#fff1bd' };
  if (value < 0.50) return { classification: 'G', color: '#f4d35e' };
  if (value < 0.70) return { classification: 'K', color: '#eaa45b' };
  if (value < 0.95) return { classification: 'M', color: '#e36b45' };
  return { classification: 'Non-main sequence', color: '#b8d7df' };
}

function multiplicity(model: SectorGenerationSettings['model'], rng: () => number): number {
  const value = rng();
  if (model === 'science') {
    if (value < 0.56) return 1;
    if (value < 0.90) return 2;
    if (value < 0.98) return 3;
    return 4;
  }
  if (value < 0.5) return 1;
  if (value < 0.8) return 2;
  if (value < 0.9) return 3;
  if (value < 0.95) return 4;
  return 5;
}

function settlementProbability(density: SectorSettlementDensity): number {
  return density === 'sparse' ? 0.18 : density === 'settled' ? 0.72 : 0.42;
}

function roleForSystem(index: number, settings: SectorGenerationSettings, rng: () => number): SectorSystemRole {
  if (rng() > settlementProbability(settings.settlementDensity)) {
    return randomEntry<SectorSystemRole>(['unexplored', 'ruin', 'anomaly'], rng);
  }
  if (index % 9 === 0) return 'naval-base';
  return randomEntry<SectorSystemRole>(['colony', 'outpost', 'resource-site'], rng);
}

function estimateScienceBackgroundStars(diameterLy: number): number {
  const radius = diameterLy / 2;
  const effectiveDepth = Math.min(diameterLy, 1_000);
  const volume = diameterLy <= 1_000
    ? 4 / 3 * Math.PI * radius ** 3
    : Math.PI * radius ** 2 * effectiveDepth;
  return Math.max(1, Math.round(volume * 0.004));
}

export function sectorDistance(first: SectorSystem, second: SectorSystem): number {
  return Math.sqrt(
    (first.xLy - second.xLy) ** 2
    + (first.yLy - second.yLy) ** 2
    + (first.zLy - second.zLy) ** 2,
  );
}

export function scaleSectorRouteRange(
  currentScaleId: SectorScaleId,
  nextScaleId: SectorScaleId,
  routeRangeLy: number,
): number {
  const currentDiameter = SECTOR_SCALES[currentScaleId].diameterLy;
  const nextDiameter = SECTOR_SCALES[nextScaleId].diameterLy;
  return rounded(Math.max(0.1, routeRangeLy * nextDiameter / currentDiameter));
}

function clusterCenters(count: number, diameterLy: number, rng: () => number): Array<{ x: number; y: number }> {
  const centerCount = clamp(Math.round(count / 10), 2, 5);
  return Array.from({ length: centerCount }, () => ({
    x: (rng() - 0.5) * diameterLy * 0.7,
    y: (rng() - 0.5) * diameterLy * 0.5,
  }));
}

function generatedPosition(
  settings: SectorGenerationSettings,
  centers: Array<{ x: number; y: number }>,
  existing: SectorSystem[],
  rng: () => number,
): { xLy: number; yLy: number; zLy: number } {
  const scale = SECTOR_SCALES[settings.scaleId];
  const half = scale.diameterLy / 2;
  const minimumSeparation = scale.diameterLy * 0.015;
  const candidate = { xLy: 0, yLy: 0, zLy: 0 };
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (rng() < 0.72) {
      const center = randomEntry(centers, rng);
      candidate.xLy = clamp(center.x + normal(rng) * scale.diameterLy * 0.11, -half, half);
      candidate.yLy = clamp(center.y + normal(rng) * scale.diameterLy * 0.09, -half * 0.7, half * 0.7);
    } else {
      candidate.xLy = (rng() - 0.5) * scale.diameterLy;
      candidate.yLy = (rng() - 0.5) * scale.diameterLy * 0.7;
    }
    const zLimit = settings.model === 'science'
      ? Math.min(scale.diameterLy * 0.18, 500)
      : scale.diameterLy * 0.16;
    candidate.zLy = (rng() - 0.5) * zLimit * 2;
    if (existing.every((entry) => Math.hypot(entry.xLy - candidate.xLy, entry.yLy - candidate.yLy) >= minimumSeparation)) break;
  }
  return { xLy: rounded(candidate.xLy), yLy: rounded(candidate.yLy), zLy: rounded(candidate.zLy) };
}

function generateSystems(settings: SectorGenerationSettings, current: SectorDocument | undefined, rng: () => number): SectorSystem[] {
  const scale = SECTOR_SCALES[settings.scaleId];
  const count = clamp(Math.round(settings.mappedSystemCount), 5, 50);
  const centers = clusterCenters(count, scale.diameterLy, rng);
  const systems: SectorSystem[] = [];
  const usedNames = new Set<string>();
  for (let index = 0; index < count; index += 1) {
    const existing = current?.systems[index];
    if (existing?.locked) {
      systems.push(existing);
      usedNames.add(existing.name.toLocaleLowerCase());
      continue;
    }
    const star = spectralClass(settings.model, rng);
    const role = roleForSystem(index, settings, rng);
    systems.push({
      id: existing?.id ?? `system-${index + 1}`,
      name: uniqueSystemName(index, rng, usedNames),
      ...generatedPosition(settings, centers, systems, rng),
      spectralClass: star.classification,
      color: star.color,
      multiplicity: multiplicity(settings.model, rng),
      role,
      importance: 1 + Math.floor(rng() * 5),
      factionId: null,
      tags: [...ROLE_TAGS[role]],
      hook: '',
      notes: '',
      locked: false,
      developedSystem: null,
    });
  }
  const highlightedCount = clamp(Math.round(settings.highlightedSiteCount), 1, systems.length);
  [...systems]
    .sort((first, second) => second.importance - first.importance)
    .slice(0, highlightedCount)
    .forEach((system, index) => {
      if (!system.hook) system.hook = SITE_HOOKS[index % SITE_HOOKS.length];
      system.importance = Math.max(system.importance, 4);
    });
  return systems;
}

function generateFeatures(settings: SectorGenerationSettings, current: SectorDocument | undefined, rng: () => number): SectorFeature[] {
  const scale = SECTOR_SCALES[settings.scaleId];
  const kinds: SectorFeatureKind[] = ['nebula', 'rift', 'ruins', 'anomaly'];
  return Array.from({ length: clamp(Math.round(settings.featureCount), 0, 10) }, (_value, index) => {
    const existing = current?.features[index];
    if (existing?.locked) return existing;
    const kind = kinds[index % kinds.length];
    return {
      id: existing?.id ?? `feature-${index + 1}`,
      name: randomEntry(FEATURE_NAMES[kind], rng),
      kind,
      xLy: rounded((rng() - 0.5) * scale.diameterLy * 0.85),
      yLy: rounded((rng() - 0.5) * scale.diameterLy * 0.55),
      zLy: rounded((rng() - 0.5) * scale.diameterLy * 0.18),
      radiusLy: rounded(Math.max(scale.mapScaleLyPerHex, scale.diameterLy * (0.04 + rng() * 0.08))),
      description: FEATURE_DESCRIPTIONS[kind],
      locked: false,
    };
  });
}

function separatedCapitals(systems: SectorSystem[], count: number): SectorSystem[] {
  const candidates = [...systems]
    .filter((system) => !['unexplored', 'ruin', 'anomaly'].includes(system.role))
    .sort((first, second) => second.importance - first.importance);
  const selected: SectorSystem[] = [];
  for (const candidate of candidates) {
    if (selected.length >= count) break;
    if (selected.length === 0 || selected.every((entry) => sectorDistance(entry, candidate) > 0)) selected.push(candidate);
  }
  return selected;
}

function generateFactions(
  settings: SectorGenerationSettings,
  systems: SectorSystem[],
  current: SectorDocument | undefined,
  rng: () => number,
): SectorFaction[] {
  const count = clamp(Math.round(settings.factionCount), 0, Math.min(6, systems.length));
  const capitals = separatedCapitals(systems, count);
  const scale = SECTOR_SCALES[settings.scaleId];
  return Array.from({ length: count }, (_value, index) => {
    const existing = current?.factions[index];
    if (existing?.locked && systems.some((system) => system.id === existing.capitalSystemId)) return existing;
    const capital = capitals[index] ?? systems[index];
    capital.role = 'capital';
    capital.importance = 5;
    return {
      id: existing?.id ?? `faction-${index + 1}`,
      name: factionName(index, rng),
      color: FACTION_COLORS[index % FACTION_COLORS.length],
      capitalSystemId: capital.id,
      government: randomEntry(GOVERNMENTS, rng),
      goal: randomEntry(FACTION_GOALS, rng),
      influenceRadiusLy: rounded(scale.diameterLy * (0.18 + rng() * 0.12)),
      notes: '',
      locked: false,
    };
  });
}

function assignFactions(
  systems: SectorSystem[],
  factions: SectorFaction[],
  diameterLy: number,
  mapScaleLyPerHex: number,
): SectorSystem[] {
  const territory = { diameterLy, mapScaleLyPerHex, systems, factions };
  const geometry = getSectorMapGeometry(territory);
  const claimByHex = calculateBaseSectorClaimMap(territory);
  return systems.map((system) => {
    const capitalFaction = factions.find((faction) => faction.capitalSystemId === system.id);
    if (capitalFaction) return { ...system, factionId: capitalFaction.id, role: 'capital' as const };
    const role = system.role === 'capital' ? 'colony' : system.role;
    if (['unexplored', 'ruin', 'anomaly'].includes(role)) return { ...system, role, factionId: null };
    const point = getSectorMapPoint(territory, geometry, system.xLy, system.yLy);
    const hex = findSectorHexAtMapPoint(geometry, point);
    return { ...system, role, factionId: hex ? claimByHex.get(claimKey(hex.column, hex.row)) ?? null : null };
  });
}

function routeId(firstId: string, secondId: string): string {
  return [firstId, secondId].sort().join('--');
}

function generateRoutes(systems: SectorSystem[], factions: SectorFaction[], settings: SectorGenerationSettings, rng: () => number): SectorRoute[] {
  if (systems.length < 2) return [];
  const routes = new Map<string, SectorRoute>();
  const visited = new Set([systems[0].id]);
  while (visited.size < systems.length) {
    let best: { first: SectorSystem; second: SectorSystem; distance: number } | null = null;
    for (const first of systems.filter((system) => visited.has(system.id))) {
      for (const second of systems.filter((system) => !visited.has(system.id))) {
        const distance = sectorDistance(first, second);
        if (!best || distance < best.distance) best = { first, second, distance };
      }
    }
    if (!best) break;
    visited.add(best.second.id);
    const id = routeId(best.first.id, best.second.id);
    routes.set(id, {
      id,
      fromSystemId: best.first.id,
      toSystemId: best.second.id,
      distanceLy: rounded(best.distance),
      type: best.distance > settings.routeRangeLy ? 'frontier' : 'standard',
    });
  }
  for (let firstIndex = 0; firstIndex < systems.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < systems.length; secondIndex += 1) {
      const first = systems[firstIndex];
      const second = systems[secondIndex];
      const distance = sectorDistance(first, second);
      if (distance > settings.routeRangeLy || rng() > 0.25) continue;
      const id = routeId(first.id, second.id);
      const isMajor = first.importance >= 4 && second.importance >= 4
        || factions.some((faction) => faction.capitalSystemId === first.id || faction.capitalSystemId === second.id);
      routes.set(id, {
        id,
        fromSystemId: first.id,
        toSystemId: second.id,
        distanceLy: rounded(distance),
        type: isMajor ? 'major' : 'standard',
      });
    }
  }
  return [...routes.values()];
}

export function generateSector(
  settings: SectorGenerationSettings = DEFAULT_SECTOR_SETTINGS,
  current?: SectorDocument,
): SectorDocument {
  const normalizedSettings: SectorGenerationSettings = {
    ...settings,
    mappedSystemCount: clamp(Math.round(settings.mappedSystemCount), 5, 50),
    highlightedSiteCount: clamp(Math.round(settings.highlightedSiteCount), 1, 20),
    factionCount: clamp(Math.round(settings.factionCount), 0, 6),
    featureCount: clamp(Math.round(settings.featureCount), 0, 10),
    routeRangeLy: Math.max(0.1, settings.routeRangeLy),
  };
  const rng = createSeededRandom(`${normalizedSettings.seed}|${normalizedSettings.model}|${normalizedSettings.scaleId}`);
  const scale = SECTOR_SCALES[normalizedSettings.scaleId];
  let systems = generateSystems(normalizedSettings, current, rng);
  const features = generateFeatures(normalizedSettings, current, rng);
  const factions = generateFactions(normalizedSettings, systems, current, rng);
  systems = assignFactions(systems, factions, scale.diameterLy, scale.mapScaleLyPerHex);
  const routes = generateRoutes(systems, factions, normalizedSettings, rng);
  const backgroundStarCount = normalizedSettings.model === 'gmg'
    ? scale.gmgEstimatedStars
    : estimateScienceBackgroundStars(scale.diameterLy);
  return {
    name: current?.name ?? 'Unnamed Sector',
    settings: normalizedSettings,
    diameterLy: scale.diameterLy,
    mapScaleLyPerHex: scale.mapScaleLyPerHex,
    backgroundStarCount,
    backgroundEstimateLabel: normalizedSettings.model === 'gmg'
      ? 'GMG Table G57 background population'
      : 'Science-informed stellar-density estimate',
    systems,
    factions,
    features,
    routes,
    overview: current?.overview ?? '',
    history: current?.history ?? '',
    currentConflicts: current?.currentConflicts ?? '',
    campaignHooks: current?.campaignHooks ?? '',
    notes: current?.notes ?? '',
  };
}

export function regenerateSectorSystem(document: SectorDocument, systemId: string): SectorDocument {
  const rng = createSeededRandom(`${document.settings.seed}|reroll|${systemId}|${document.systems.find((entry) => entry.id === systemId)?.name ?? ''}`);
  const index = document.systems.findIndex((system) => system.id === systemId);
  if (index < 0 || document.systems[index].locked) return document;
  const current = document.systems[index];
  const star = spectralClass(document.settings.model, rng);
  const role = roleForSystem(index, document.settings, rng);
  const usedNames = new Set(document.systems
    .filter((system) => system.id !== systemId)
    .map((system) => system.name.toLocaleLowerCase()));
  usedNames.add(current.name.toLocaleLowerCase());
  const nextSystem: SectorSystem = {
    ...current,
    name: uniqueSystemName(index, rng, usedNames),
    spectralClass: star.classification,
    color: star.color,
    multiplicity: multiplicity(document.settings.model, rng),
    role,
    importance: 1 + Math.floor(rng() * 5),
    factionId: null,
    tags: [...ROLE_TAGS[role]],
    hook: randomEntry(SITE_HOOKS, rng),
    developedSystem: null,
  };
  let systems = document.systems.map((system) => system.id === systemId ? nextSystem : system);
  systems = assignFactions(systems, document.factions, document.diameterLy, document.mapScaleLyPerHex);
  return {
    ...document,
    systems,
    routes: generateRoutes(systems, document.factions, document.settings, rng),
  };
}

export function rebuildSectorNetwork(document: SectorDocument): SectorDocument {
  const rng = createSeededRandom(`${document.settings.seed}|network|${document.systems.map((system) => `${system.id}:${system.xLy}:${system.yLy}:${system.zLy}`).join('|')}`);
  const systems = assignFactions(document.systems, document.factions, document.diameterLy, document.mapScaleLyPerHex);
  return {
    ...document,
    systems,
    routes: generateRoutes(systems, document.factions, document.settings, rng),
  };
}

export function regenerateSectorFactions(document: SectorDocument): SectorDocument {
  const rng = createSeededRandom(`${document.settings.seed}|factions|${document.factions.map((faction) => faction.name).join('|')}`);
  const factions = generateFactions(document.settings, document.systems, document, rng);
  const systems = assignFactions(document.systems, factions, document.diameterLy, document.mapScaleLyPerHex);
  return {
    ...document,
    factions,
    systems,
    routes: generateRoutes(systems, factions, document.settings, rng),
  };
}

export function regenerateSectorFeatures(document: SectorDocument): SectorDocument {
  const rng = createSeededRandom(`${document.settings.seed}|features|${document.features.map((feature) => feature.name).join('|')}`);
  return {
    ...document,
    features: generateFeatures(document.settings, document, rng),
  };
}

export function calculateSectorClaims(document: SectorDocument): SectorHexClaim[] {
  const claimByHex = calculateBaseSectorClaimMap(document);
  const geometry = getSectorMapGeometry(document);
  const factionIds = new Set(document.factions.map((faction) => faction.id));
  const capitalFactionBySystem = new Map(document.factions.map((faction) => [faction.capitalSystemId, faction.id]));
  const systems = [...document.systems].sort((first, second) => (
    Number(capitalFactionBySystem.has(first.id)) - Number(capitalFactionBySystem.has(second.id))
  ));
  systems.forEach((system) => {
    const point = getSectorMapPoint(document, geometry, system.xLy, system.yLy);
    const hex = findSectorHexAtMapPoint(geometry, point);
    if (!hex) return;
    const key = claimKey(hex.column, hex.row);
    const capitalFactionId = capitalFactionBySystem.get(system.id);
    if (capitalFactionId) {
      claimByHex.set(key, capitalFactionId);
    } else if (system.factionId && factionIds.has(system.factionId)) {
      claimByHex.set(key, system.factionId);
    } else if (!['unexplored', 'ruin', 'anomaly'].includes(system.role)) {
      claimByHex.delete(key);
    }
  });
  return [...claimByHex.entries()]
    .map(([key, factionId]) => {
      const [column, row] = key.split(':').map(Number);
      return { column, row, factionId };
    })
    .sort((first, second) => first.column - second.column || first.row - second.row);
}

export function getSectorClaimAtPosition(
  document: SectorDocument,
  xLy: number,
  yLy: number,
): SectorHexClaim | null {
  const hex = findSectorHexAtPosition(document, xLy, yLy);
  if (!hex) return null;
  return calculateSectorClaims(document).find((claim) => (
    claim.column === hex.column && claim.row === hex.row
  )) ?? null;
}

export function setSectorSystemFaction(
  document: SectorDocument,
  systemId: string,
  factionId: string | null,
): SectorDocument {
  const target = document.systems.find((system) => system.id === systemId);
  if (!target || document.factions.some((faction) => faction.capitalSystemId === systemId)) return document;
  const normalizedFactionId = factionId && document.factions.some((faction) => faction.id === factionId)
    ? factionId
    : null;
  const targetHex = findSectorHexAtPosition(document, target.xLy, target.yLy);
  const targetIsSpecial = ['unexplored', 'ruin', 'anomaly'].includes(target.role);
  const capitalIds = new Set(document.factions.map((faction) => faction.capitalSystemId));
  return {
    ...document,
    systems: document.systems.map((system) => {
      if (system.id === target.id) return { ...system, factionId: normalizedFactionId };
      if (!targetHex || capitalIds.has(system.id) || ['unexplored', 'ruin', 'anomaly'].includes(system.role)) return system;
      if (targetIsSpecial && normalizedFactionId === null) return system;
      const hex = findSectorHexAtPosition(document, system.xLy, system.yLy);
      return hex?.column === targetHex.column && hex.row === targetHex.row
        ? { ...system, factionId: normalizedFactionId }
        : system;
    }),
  };
}

export function sectorRoutesAreConnected(document: SectorDocument): boolean {
  if (document.systems.length <= 1) return true;
  const adjacency = new Map<string, string[]>();
  document.systems.forEach((system) => adjacency.set(system.id, []));
  document.routes.forEach((route) => {
    adjacency.get(route.fromSystemId)?.push(route.toSystemId);
    adjacency.get(route.toSystemId)?.push(route.fromSystemId);
  });
  const visited = new Set<string>();
  const queue = [document.systems[0].id];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    adjacency.get(current)?.forEach((neighbor) => {
      if (!visited.has(neighbor)) queue.push(neighbor);
    });
  }
  return visited.size === document.systems.length;
}
