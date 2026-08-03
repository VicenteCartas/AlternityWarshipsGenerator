import type {
  GeneratedPlanet,
  GeneratedStar,
  GmgPlanetTranslation,
  OceanExtent,
  PlanetType,
  ScientificPlanetProperties,
} from '../types/worldbuilding';
import { nearestGmgEnvironmentClass } from './starSystemGenerationService';

export interface GmgTranslationContext {
  primaryStar: GeneratedStar;
  effectiveLuminositySolar: number;
  systemAgeGyr: number;
}

export const GRAPH_LABELS = {
  gravity: ['Zero', 'Low', 'Moderate', 'High', 'Very High', 'Super High'],
  radiation: ['Zero', 'Low', 'Moderate', 'High', 'Extreme', 'Lethal'],
  atmosphere: ['Vacuum', 'Inert', 'Moderate', 'Toxic', 'Corrosive', 'Super Corrosive'],
  pressure: ['Vacuum', 'Very Thin', 'Thin', 'Moderate', 'Dense', 'Crushing'],
  heat: ['Absolute Zero', 'Frigid', 'Temperate', 'Torrid', 'Super Torrid', 'Inferno'],
} as const;

function clampRating(value: number): number {
  return Math.max(0, Math.min(5, Math.trunc(value)));
}

export function gravityToGmgRating(gravityEarth: number): number {
  if (gravityEarth < 0.2) return 0;
  if (gravityEarth < 0.8) return 1;
  if (gravityEarth < 1.2) return 2;
  if (gravityEarth <= 2) return 3;
  if (gravityEarth <= 4) return 4;
  return 5;
}

export function pressureToGmgRating(pressureAtm: number): number {
  if (pressureAtm <= 0) return 0;
  if (pressureAtm < 0.5) return 1;
  if (pressureAtm < 0.8) return 2;
  if (pressureAtm <= 4) return 3;
  if (pressureAtm <= 20) return 4;
  return 5;
}

export function temperatureToGmgRating(surfaceTemperatureK: number): number {
  const celsius = surfaceTemperatureK - 273.15;
  if (celsius <= -200) return 0;
  if (celsius < -50) return 1;
  if (celsius <= 50) return 2;
  if (celsius <= 100) return 3;
  if (celsius <= 500) return 4;
  return 5;
}

function estimatedSurfaceTemperature(science: ScientificPlanetProperties): number {
  const pressure = science.surfacePressureAtm;
  if (pressure <= 0 || science.composition === 'gas' || science.composition === 'ice') return science.equilibriumTempK;
  const atmosphere = science.atmosphere.toLocaleLowerCase();
  if (atmosphere.includes('carbon dioxide')) {
    return science.equilibriumTempK + 8 + 42 * Math.log1p(pressure);
  }
  if (atmosphere.includes('nitrogen')) {
    return science.equilibriumTempK + 18 * Math.sqrt(Math.min(pressure, 4));
  }
  return science.equilibriumTempK + 5 * Math.sqrt(Math.min(pressure, 4));
}

function atmosphereToGmgRating(science: ScientificPlanetProperties, heat: number): { rating: number; assumption?: string } {
  const atmosphere = science.atmosphere.toLocaleLowerCase();
  if (science.surfacePressureAtm <= 0 || atmosphere.includes('airless') || atmosphere.includes('vacuum')) return { rating: 0 };
  if (atmosphere.includes('metal') || atmosphere.includes('silicate')) return { rating: heat >= 5 ? 5 : 4 };
  if (atmosphere.includes('carbon dioxide')) return { rating: 3 };
  if (atmosphere.includes('hydrogen') || atmosphere.includes('helium') || atmosphere.includes('methane')) return { rating: 1 };
  if (atmosphere.includes('nitrogen')) {
    if (science.habitability === 'potentially habitable' || science.life === 'complex') {
      return {
        rating: 2,
        assumption: 'A2 assumes an oxygen-bearing nitrogen atmosphere because the physical model marks the world potentially habitable; oxygen abundance is not directly modeled.',
      };
    }
    return {
      rating: 1,
      assumption: 'A1 treats the nitrogen-rich atmosphere as inert because oxygen abundance is not directly modeled.',
    };
  }
  return { rating: 3, assumption: 'Unknown atmospheric chemistry is treated as toxic for game use.' };
}

function radiationToGmgRating(
  planet: GeneratedPlanet,
  context: GmgTranslationContext,
): { rating: number; incidentFluxEarth: number } {
  const science = planet.science!;
  const incidentFluxEarth = context.effectiveLuminositySolar / Math.max(0.0001, planet.distanceAu ** 2);
  const classification = context.primaryStar.classification;
  const activity = classification.startsWith('M')
    ? context.systemAgeGyr < 1 ? 8 : context.systemAgeGyr < 3 ? 4 : 2
    : classification.startsWith('O') || classification.startsWith('B') || classification.startsWith('A')
      ? 5
      : classification.startsWith('F') ? 2 : context.systemAgeGyr < 1 ? 2 : 1;
  const atmosphericShielding = science.surfacePressureAtm >= 0.8 ? 0.55
    : science.surfacePressureAtm >= 0.2 ? 0.8 : 1.25;
  const magneticProxy = !science.tidallyLocked
    && science.massEarth >= 0.5
    && science.massEarth <= 5
    && science.rotationHours <= 100
    ? 0.6 : 1;
  const giantBeltFactor = science.composition === 'gas' || science.composition === 'ice' ? 2 : 1;
  const riskScore = Math.sqrt(Math.max(0.01, incidentFluxEarth)) * activity * atmosphericShielding * magneticProxy * giantBeltFactor;
  const rating = riskScore <= 0.75 ? 1
    : riskScore <= 3 ? 2
      : riskScore <= 12 ? 3
        : riskScore <= 50 ? 4 : 5;
  return { rating, incidentFluxEarth };
}

function gmgPlanetType(planet: GeneratedPlanet, temperature: GmgPlanetTranslation['temperature']): PlanetType {
  const science = planet.science!;
  if (science.composition === 'gas') return science.massEarth >= 100 ? 'Gas giant, large' : 'Gas giant, small';
  if (science.composition === 'ice') return 'Gas giant, small';
  const size = science.radiusEarth < 0.8 ? 'Sub-Terran' : science.radiusEarth <= 1.25 ? 'Terran' : 'Super-Terran';
  return `${size}, ${temperature}` as PlanetType;
}

function oceanExtent(science: ScientificPlanetProperties): OceanExtent | null {
  const water = science.water.toLocaleLowerCase();
  if (water.includes('global') || water.includes('extensive')) return 'Complete';
  if (water.includes('surface water plausible')) return 'Moderate';
  if (water.includes('limited') || water.includes('ice rich') || water.includes('surface ice')) return 'Sparse';
  return null;
}

function climate(science: ScientificPlanetProperties, pressure: number, heat: number): GmgPlanetTranslation['climate'] {
  if (science.composition === 'gas' || science.composition === 'ice' || pressure >= 5 || heat >= 5) return 'Violent';
  if (pressure === 0) return null;
  if (science.tidallyLocked || pressure === 4 || heat >= 3) return 'Turbulent';
  if (pressure <= 2) return 'Calm';
  return 'Active';
}

function landforms(science: ScientificPlanetProperties, moons: number, ocean: OceanExtent | null): GmgPlanetTranslation['landforms'] {
  if (science.composition === 'gas' || science.composition === 'ice') return null;
  if (ocean === 'Complete') return 'Smooth';
  if (science.composition === 'dwarf' || science.surfacePressureAtm === 0) return 'Rugged';
  if (science.massEarth > 2.5) return 'Rugged';
  return moons > 0 ? 'Varied' : 'Smooth';
}

export function translateSciencePlanetToGmg(
  planet: GeneratedPlanet,
  context: GmgTranslationContext,
): GmgPlanetTranslation {
  if (!planet.science) throw new Error('A science-generated planet is required for GMG translation.');
  const science = planet.science;
  const estimatedSurfaceTempK = estimatedSurfaceTemperature(science);
  const temperature: GmgPlanetTranslation['temperature'] = estimatedSurfaceTempK > 323.15
    ? 'hot'
    : estimatedSurfaceTempK < 223.15 ? 'cold' : 'temperate';
  const gasGiant = science.composition === 'gas' || science.composition === 'ice';
  const gravity = gasGiant
    ? science.massEarth >= 100 ? 5 : 4
    : gravityToGmgRating(science.gravityEarth);
  const pressure = pressureToGmgRating(science.surfacePressureAtm);
  const heat = temperatureToGmgRating(estimatedSurfaceTempK);
  const atmosphere = atmosphereToGmgRating(science, heat);
  const radiation = radiationToGmgRating(planet, context);
  const ratings = {
    gravity: clampRating(gravity),
    radiation: clampRating(radiation.rating),
    atmosphere: clampRating(atmosphere.rating),
    pressure: clampRating(pressure),
    heat: clampRating(heat),
  };
  const ocean = oceanExtent(science);
  const assumptions = [
    'Environment Class is the nearest official G64 profile to the translated G/R/A/P/H ratings.',
    'R rating estimates stellar activity and incident flux, with atmospheric shielding and a mass/rotation magnetic-field proxy.',
    'H rating uses an estimated surface temperature from equilibrium temperature, pressure, and broad atmospheric composition.',
  ];
  if (atmosphere.assumption) assumptions.push(atmosphere.assumption);
  if (science.composition === 'gas' || science.composition === 'ice') {
    assumptions.push('Gas and ice giants use their observable atmosphere level; they have no solid surface for ordinary characters.');
  }
  return {
    planetType: gmgPlanetType(planet, temperature),
    temperature,
    environmentClass: nearestGmgEnvironmentClass(temperature, ratings, gasGiant),
    ...ratings,
    estimatedSurfaceTempK: Math.round(estimatedSurfaceTempK),
    incidentFluxEarth: Math.round(radiation.incidentFluxEarth * 1_000) / 1_000,
    oceanExtent: ocean,
    climate: climate(science, pressure, heat),
    landforms: landforms(science, planet.moons.length, ocean),
    lifeSeries: science.life === 'none' ? [] : ['I'],
    assumptions,
  };
}

export function formatGraphCode(translation: GmgPlanetTranslation): string {
  return `G${translation.gravity}/R${translation.radiation}/A${translation.atmosphere}/P${translation.pressure}/H${translation.heat}`;
}
