import type { GeneratedStarSystem } from './worldbuilding';

export type SectorGenerationModel = 'gmg' | 'science';
export type SectorScaleId = 'province' | 'cluster' | 'region' | 'arm' | 'galaxy';
export type SectorSettlementDensity = 'sparse' | 'frontier' | 'settled';
export type SectorFeatureKind = 'nebula' | 'rift' | 'ruins' | 'anomaly';
export type SectorSystemRole =
  | 'capital'
  | 'colony'
  | 'outpost'
  | 'resource-site'
  | 'naval-base'
  | 'ruin'
  | 'anomaly'
  | 'unexplored';
export type SectorRouteType = 'major' | 'standard' | 'frontier';

export interface SectorScaleDefinition {
  id: SectorScaleId;
  name: string;
  diameterLy: number;
  gmgEstimatedStars: number;
  mapScaleLyPerHex: number;
}

export interface SectorGenerationSettings {
  seed: string;
  model: SectorGenerationModel;
  scaleId: SectorScaleId;
  mappedSystemCount: number;
  highlightedSiteCount: number;
  factionCount: number;
  settlementDensity: SectorSettlementDensity;
  routeRangeLy: number;
  featureCount: number;
}

export interface SectorSystem {
  id: string;
  name: string;
  xLy: number;
  yLy: number;
  zLy: number;
  spectralClass: string;
  color: string;
  multiplicity: number;
  role: SectorSystemRole;
  importance: number;
  factionId: string | null;
  tags: string[];
  hook: string;
  notes: string;
  locked: boolean;
  developedSystem: GeneratedStarSystem | null;
}

export interface SectorFaction {
  id: string;
  name: string;
  color: string;
  capitalSystemId: string;
  government: string;
  goal: string;
  influenceRadiusLy: number;
  notes: string;
  locked: boolean;
}

export interface SectorFeature {
  id: string;
  name: string;
  kind: SectorFeatureKind;
  xLy: number;
  yLy: number;
  zLy: number;
  radiusLy: number;
  description: string;
  locked: boolean;
}

export interface SectorRoute {
  id: string;
  fromSystemId: string;
  toSystemId: string;
  distanceLy: number;
  type: SectorRouteType;
}

export interface SectorDocument {
  name: string;
  settings: SectorGenerationSettings;
  diameterLy: number;
  mapScaleLyPerHex: number;
  backgroundStarCount: number;
  backgroundEstimateLabel: string;
  systems: SectorSystem[];
  factions: SectorFaction[];
  features: SectorFeature[];
  routes: SectorRoute[];
  overview: string;
  history: string;
  currentConflicts: string;
  campaignHooks: string;
  notes: string;
}

export interface SectorHexClaim {
  column: number;
  row: number;
  factionId: string;
}
