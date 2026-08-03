export type OrbitTrackId = 'I' | 'II' | 'III' | 'IV' | 'V';
export type StarSystemGenerationModel = 'gmg' | 'science';
export type ScienceSystemDensity = 'sparse' | 'typical' | 'crowded';
export type SciencePlanetOccurrence = 'conservative' | 'observed' | 'optimistic';
export type ScienceLifeFrequency = 'none' | 'rare' | 'common';

export interface ScienceGenerationSettings {
  systemDensity: ScienceSystemDensity;
  planetOccurrence: SciencePlanetOccurrence;
  lifeFrequency: ScienceLifeFrequency;
}
export type PlanetTemperature = 'hot' | 'temperate' | 'cold' | 'none';
export type PlanetType =
  | 'Ring system'
  | 'Sub-Terran, hot'
  | 'Super-Terran, hot'
  | 'Terran, hot'
  | 'Terran, temperate'
  | 'Sub-Terran, temperate'
  | 'Super-Terran, temperate'
  | 'Asteroid belt'
  | 'Gas giant, large'
  | 'Gas giant, small'
  | 'Super-Terran, cold'
  | 'Terran, cold'
  | 'Sub-Terran, cold'
  | 'Comet belt'
  | 'Rocky world, hot'
  | 'Rocky world, temperate'
  | 'Rocky world, cold'
  | 'Ocean world'
  | 'Ice giant'
  | 'Gas giant'
  | 'Dwarf planet';

export type MoonType = 'Tiny' | 'Small' | 'Ring system' | 'Sub-Terran' | 'Terran' | 'Super-Terran';
export type OceanExtent = 'Sparse' | 'Moderate' | 'Abundant' | 'Complete';
export type ClimateSeverity = 'Calm' | 'Active' | 'Turbulent' | 'Violent';
export type LandformProfile = 'Smooth' | 'Varied' | 'Rugged' | 'Perilous';
export type LifeSeriesId = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI';

export interface GeneratedStar {
  id: string;
  group: number;
  role: 'Primary' | 'Companion';
  classification: string;
  color: string;
  science?: ScientificStarProperties;
}

export interface ScientificStarProperties {
  massSolar: number;
  radiusSolar: number;
  luminositySolar: number;
  temperatureK: number;
  ageGyr: number;
  metallicityDex: number;
  separationAu: number | null;
}

export interface GeneratedMoon {
  roll: number;
  type: MoonType;
  science?: ScientificMoonProperties;
}

export interface ScientificMoonProperties {
  massEarth: number;
  radiusEarth: number;
  orbitalDistancePlanetRadii: number;
  orbitalPeriodDays: number;
}

export interface GeneratedLifeSeries {
  series: LifeSeriesId;
  base: string;
  breathes: string;
  odds: number;
  roll: number;
  present: boolean;
}

export interface GeneratedEnvironment {
  roll: number;
  environmentClass: 1 | 2 | 3 | 4 | 5;
  gravity: number;
  radiation: number;
  atmosphere: number;
  pressure: number;
  heat: number;
  life: GeneratedLifeSeries[];
  oceanRoll: number | null;
  oceanExtent: OceanExtent | null;
  climateRoll: number | null;
  climate: ClimateSeverity | null;
  landformRoll: number | null;
  landforms: LandformProfile | null;
}

export interface GeneratedPlanet {
  id: string;
  ring: number;
  distanceAu: number;
  typeRoll: number;
  type: PlanetType;
  temperature: PlanetTemperature;
  moonCountRoll: number | null;
  moons: GeneratedMoon[];
  environment: GeneratedEnvironment | null;
  science?: ScientificPlanetProperties;
  gmgTranslation?: GmgPlanetTranslation;
}

export interface GmgPlanetTranslation {
  planetType: PlanetType;
  temperature: Exclude<PlanetTemperature, 'none'>;
  environmentClass: 1 | 2 | 3 | 4 | 5;
  gravity: number;
  radiation: number;
  atmosphere: number;
  pressure: number;
  heat: number;
  estimatedSurfaceTempK: number;
  incidentFluxEarth: number;
  oceanExtent: OceanExtent | null;
  climate: ClimateSeverity | null;
  landforms: LandformProfile | null;
  lifeSeries: LifeSeriesId[];
  assumptions: string[];
}

export type ScientificComposition = 'rocky' | 'ocean' | 'ice' | 'gas' | 'dwarf';
export type HabitableZonePosition = 'inner' | 'within' | 'outer';
export type ScientificLife = 'none' | 'microbial' | 'complex';

export interface ScientificPlanetProperties {
  composition: ScientificComposition;
  massEarth: number;
  radiusEarth: number;
  densityGcm3: number;
  gravityEarth: number;
  orbitalPeriodDays: number;
  eccentricity: number;
  equilibriumTempK: number;
  albedo: number;
  habitableZonePosition: HabitableZonePosition;
  rotationHours: number;
  tidallyLocked: boolean;
  atmosphere: string;
  surfacePressureAtm: number;
  water: string;
  habitability: 'unlikely' | 'marginal' | 'potentially habitable';
  life: ScientificLife;
}

export interface ScientificSystemProperties {
  ageGyr: number;
  metallicityDex: number;
  architecture: 'single-star' | 'circumprimary' | 'circumbinary';
  centralMassSolar: number;
  effectiveLuminositySolar: number;
  stableInnerAu: number;
  stableOuterAu: number;
  habitableZoneInnerAu: number;
  habitableZoneOuterAu: number;
  snowLineAu: number;
}

export interface GeneratedStarSystem {
  generationModel: StarSystemGenerationModel;
  seed: string | null;
  scienceSettings: ScienceGenerationSettings | null;
  science: ScientificSystemProperties | null;
  starCountRoll: number | null;
  starCount: number;
  starCountLabel: string;
  stars: GeneratedStar[];
  orbitTrack: OrbitTrackId;
  potentialPlanetCount: number;
  planets: GeneratedPlanet[];
  unusedPotentialPlanets: number;
}

export type SocietyOrigin = 'human' | 'alien' | 'mixed';

export interface TradeCommodityDefinition {
  id: string;
  name: string;
  value: 'Low' | 'Moderate' | 'High' | 'Very High' | 'Varies';
  bulk: 'Low' | 'Medium' | 'High' | 'Very High';
  restricted: boolean;
}

export interface InstallationFacilityDefinition {
  id: string;
  name: string;
}

export interface CityTownLocation {
  id: string;
  name: string;
  kind: 'city' | 'town';
  population: string;
  overview: string;
  layout: string;
  lodging: string;
  foodAndDrink: string;
  equipmentAccess: string;
  criminalUnderworld: string;
  lawEnforcement: string;
  specialFacilities: string;
  campaignRole: string;
  notes: string;
}

export interface InstallationLocation {
  id: string;
  name: string;
  kind: 'station' | 'installation';
  purpose: string;
  location: string;
  occupants: string;
  isolation: string;
  facilityIds: string[];
  layout: string;
  contacts: string;
  rivals: string;
  campaignRole: string;
  notes: string;
}

export interface CivilizationDesign {
  name: string;
  origin: SocietyOrigin;
  progressLevel: number;
  civilizationLevel: number;
  alienCivilizationLevel: number;
  lawLevel: number;
  hostileWorld: boolean;
  population: string;
  government: string;
  homeland: string;
  foodAndShelter: string;
  industries: string;
  externalContact: string;
  leisureAndArt: string;
  values: string;
  rivals: string;
  enemies: string;
  heroes: string;
  currency: string;
  resources: string;
  imports: string;
  exports: string;
  shortages: string;
  tradeImportIds: string[];
  tradeExportIds: string[];
  settlements: string;
  cities: CityTownLocation[];
  installations: InstallationLocation[];
  alienGoals: string;
  alienOrganization: string;
  alienAppearance: string;
  campaignRole: string;
  notes: string;
}

export interface CivilizationLevelDefinition {
  level: number;
  name: string;
  scale: string;
  population: string;
  resourceModifier: number | null;
  minimumProgressLevel?: number;
}

export interface LawLevelDefinition {
  level: number;
  name: string;
  description: string;
  lawModifier: number;
}