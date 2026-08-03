import type {
  GeneratedMoon,
  GeneratedPlanet,
  GeneratedStar,
  GeneratedStarSystem,
  HabitableZonePosition,
  MoonType,
  ScienceGenerationSettings,
  ScientificComposition,
  ScientificLife,
  ScientificPlanetProperties,
} from '../types/worldbuilding';
import { translateSciencePlanetToGmg } from './gmgScienceTranslationService';

export const DEFAULT_SCIENCE_SETTINGS: ScienceGenerationSettings = {
  systemDensity: 'typical',
  planetOccurrence: 'observed',
  lifeFrequency: 'rare',
};

export interface ScienceSystemOptions {
  seed: string;
  starCount?: number;
  settings?: ScienceGenerationSettings;
}

const EARTH_MASSES_PER_SOLAR = 332_946;
const EARTH_RADIUS_METERS = 6_371_000;
const EARTH_MASS_KG = 5.9722e24;
const GRAVITATIONAL_CONSTANT = 6.6743e-11;
const SECONDS_PER_GYR = 3.15576e16;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function rounded(value: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function seedHash(seed: string): number {
  let hash = 2166136261;
  for (const character of seed || 'alternity') {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createSeededRandom(seed: string): () => number {
  let state = seedHash(seed);
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function normal(rng: () => number): number {
  const first = Math.max(Number.EPSILON, rng());
  const second = rng();
  return Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * second);
}

function logUniform(minimum: number, maximum: number, rng: () => number): number {
  return Math.exp(Math.log(minimum) + rng() * Math.log(maximum / minimum));
}

function samplePrimaryMass(rng: () => number): number {
  const roll = rng();
  if (roll < 0.70) return logUniform(0.08, 0.6, rng);
  if (roll < 0.85) return 0.6 + rng() * 0.3;
  if (roll < 0.94) return 0.9 + rng() * 0.2;
  if (roll < 0.98) return 1.1 + rng() * 0.3;
  if (roll < 0.995) return 1.4 + rng() * 0.7;
  return 2.1 + rng() * 5.9;
}

function stellarLuminosity(massSolar: number): number {
  if (massSolar < 0.43) return 0.23 * massSolar ** 2.3;
  if (massSolar < 2) return massSolar ** 4;
  return 1.5 * massSolar ** 3.5;
}

function stellarRadius(massSolar: number): number {
  return massSolar < 1 ? massSolar ** 0.8 : massSolar ** 0.57;
}

function spectralClass(temperatureK: number): string {
  if (temperatureK >= 30_000) return 'O V';
  if (temperatureK >= 10_000) return 'B V';
  if (temperatureK >= 7_500) return 'A V';
  if (temperatureK >= 6_000) return 'F V';
  if (temperatureK >= 5_200) return 'G V';
  if (temperatureK >= 3_700) return 'K V';
  return 'M V';
}

function stellarColor(classification: string): string {
  if (classification.startsWith('O') || classification.startsWith('B')) return 'Blue-white';
  if (classification.startsWith('A')) return 'White';
  if (classification.startsWith('F')) return 'Yellow-white';
  if (classification.startsWith('G')) return 'Yellow';
  if (classification.startsWith('K')) return 'Orange';
  return 'Red';
}

function makeScientificStar(
  massSolar: number,
  ageGyr: number,
  metallicityDex: number,
  separationAu: number | null,
  index: number,
): GeneratedStar {
  const luminositySolar = stellarLuminosity(massSolar);
  const radiusSolar = stellarRadius(massSolar);
  const temperatureK = 5_772 * (luminositySolar / radiusSolar ** 2) ** 0.25;
  const classification = spectralClass(temperatureK);
  return {
    id: `star-${index}`,
    group: 1,
    role: index === 1 ? 'Primary' : 'Companion',
    classification,
    color: stellarColor(classification),
    science: {
      massSolar: rounded(massSolar, 4),
      radiusSolar: rounded(radiusSolar, 4),
      luminositySolar: rounded(luminositySolar, 5),
      temperatureK: Math.round(temperatureK),
      ageGyr: rounded(ageGyr, 3),
      metallicityDex: rounded(metallicityDex, 3),
      separationAu: separationAu === null ? null : rounded(separationAu, 3),
    },
  };
}

function multiplicityCount(primaryMass: number, rng: () => number): number {
  const probability = primaryMass < 0.6 ? 0.25 : primaryMass < 1.2 ? 0.44 : primaryMass < 2 ? 0.6 : 0.75;
  if (rng() >= probability) return 1;
  return rng() < probability * 0.2 ? 3 : 2;
}

interface PlanetMassSample {
  composition: ScientificComposition;
  massEarth: number;
}

function samplePlanetMass(
  distanceAu: number,
  snowLineAu: number,
  metallicityDex: number,
  rng: () => number,
): PlanetMassSample {
  const beyondSnowLine = distanceAu >= snowLineAu;
  const roll = clamp(rng() - metallicityDex * 0.05, 0, 1);
  if (!beyondSnowLine) {
    if (roll < 0.68) return { composition: 'rocky', massEarth: logUniform(0.15, 5, rng) };
    if (roll < 0.88) return { composition: 'ocean', massEarth: logUniform(0.5, 6, rng) };
    if (roll < 0.96) return { composition: 'ice', massEarth: logUniform(5, 25, rng) };
    return { composition: 'gas', massEarth: logUniform(30, 300, rng) };
  }
  if (roll < 0.25) {
    const massEarth = logUniform(0.03, 3, rng);
    return { composition: massEarth < 0.15 ? 'dwarf' : 'rocky', massEarth };
  }
  if (roll < 0.6) return { composition: 'ice', massEarth: logUniform(2, 35, rng) };
  return { composition: 'gas', massEarth: logUniform(30, 1_000, rng) };
}

function planetRadiusEarth(massEarth: number, composition: ScientificComposition): number {
  if (composition === 'gas') return 10.5 * (massEarth / 318) ** -0.04;
  if (composition === 'ice') return 3 * (massEarth / 10) ** 0.25;
  if (composition === 'ocean') return 1.15 * massEarth ** 0.28;
  return massEarth ** 0.28;
}

export function mutualHillSpacing(
  innerDistanceAu: number,
  outerDistanceAu: number,
  innerMassEarth: number,
  outerMassEarth: number,
  centralMassSolar: number,
): number {
  const mutualHillRadius = ((innerMassEarth + outerMassEarth) / (3 * centralMassSolar * EARTH_MASSES_PER_SOLAR)) ** (1 / 3)
    * (innerDistanceAu + outerDistanceAu) / 2;
  return (outerDistanceAu - innerDistanceAu) / mutualHillRadius;
}

function isTidallyLocked(
  distanceAu: number,
  orbitalPeriodDays: number,
  massEarth: number,
  radiusEarth: number,
  composition: ScientificComposition,
  centralMassSolar: number,
  ageGyr: number,
  initialRotationHours: number,
): boolean {
  const semiMajorAxisMeters = distanceAu * 149_597_870_700;
  const planetMassKg = massEarth * EARTH_MASS_KG;
  const planetRadiusMeters = radiusEarth * EARTH_RADIUS_METERS;
  const starMassKg = centralMassSolar * 1.98847e30;
  const momentOfInertia = 0.33 * planetMassKg * planetRadiusMeters ** 2;
  const tidalQuality = composition === 'gas' ? 100_000 : composition === 'ice' ? 10_000 : 100;
  const initialAngularVelocity = 2 * Math.PI / (initialRotationHours * 3_600);
  const lockingSeconds = initialAngularVelocity * semiMajorAxisMeters ** 6 * momentOfInertia * tidalQuality
    / (3 * GRAVITATIONAL_CONSTANT * starMassKg ** 2 * 0.3 * planetRadiusMeters ** 5);
  return lockingSeconds < ageGyr * SECONDS_PER_GYR && orbitalPeriodDays > 0;
}

function atmosphereForPlanet(
  composition: ScientificComposition,
  massEarth: number,
  radiusEarth: number,
  temperatureK: number,
  rng: () => number,
): { atmosphere: string; pressureAtm: number } {
  if (composition === 'gas') return { atmosphere: 'Hydrogen and helium', pressureAtm: 1_000 };
  if (composition === 'ice') return { atmosphere: 'Hydrogen, helium, and methane', pressureAtm: rounded(50 + rng() * 450, 1) };
  const retention = Math.sqrt(massEarth / radiusEarth) / Math.sqrt(Math.max(50, temperatureK) / 288);
  if (retention < 0.45) return { atmosphere: 'Airless or trace exosphere', pressureAtm: 0 };
  if (temperatureK > 800) return { atmosphere: 'Metal and silicate vapor', pressureAtm: rounded(0.01 + rng() * 0.2, 2) };
  if (retention < 0.75) return { atmosphere: 'Thin carbon dioxide', pressureAtm: rounded(0.02 + rng() * 0.13, 2) };
  const pressureAtm = clamp(massEarth ** 0.7 * (0.5 + rng() * 1.5), 0.15, 20);
  return {
    atmosphere: temperatureK > 340 ? 'Carbon dioxide rich' : 'Nitrogen rich',
    pressureAtm: rounded(pressureAtm, 2),
  };
}

function waterForPlanet(
  composition: ScientificComposition,
  distanceAu: number,
  snowLineAu: number,
  habitableZonePosition: HabitableZonePosition,
  rng: () => number,
): string {
  if (composition === 'gas') return 'No accessible surface';
  if (composition === 'ocean') return 'Global or extensive surface oceans';
  if (composition === 'ice') return 'Deep ice mantle with possible subsurface ocean';
  if (distanceAu >= snowLineAu) return 'Ice rich';
  if (habitableZonePosition === 'within') return rng() < 0.6 ? 'Surface water plausible' : 'Dry or limited surface water';
  return habitableZonePosition === 'inner' ? 'Likely dry' : 'Surface ice';
}

function lifeForPlanet(
  habitability: ScientificPlanetProperties['habitability'],
  frequency: ScienceGenerationSettings['lifeFrequency'],
  ageGyr: number,
  rng: () => number,
): ScientificLife {
  if (frequency === 'none' || habitability === 'unlikely') return 'none';
  const chance = habitability === 'potentially habitable'
    ? frequency === 'common' ? 0.55 : 0.08
    : frequency === 'common' ? 0.12 : 0.01;
  if (rng() >= chance) return 'none';
  return habitability === 'potentially habitable' && ageGyr > 2 && rng() < 0.25 ? 'complex' : 'microbial';
}

function moonType(radiusEarth: number): MoonType {
  if (radiusEarth < 0.2) return 'Tiny';
  if (radiusEarth < 0.5) return 'Small';
  if (radiusEarth < 0.8) return 'Sub-Terran';
  if (radiusEarth < 1.2) return 'Terran';
  return 'Super-Terran';
}

function generateMoons(
  composition: ScientificComposition,
  planetMassEarth: number,
  planetRadiusEarthValue: number,
  rng: () => number,
): GeneratedMoon[] {
  const count = composition === 'gas'
    ? 2 + Math.floor(rng() * 6)
    : composition === 'ice'
      ? 1 + Math.floor(rng() * 4)
      : rng() < clamp(planetMassEarth * 0.25, 0.05, 0.65) ? 1 + (rng() < 0.15 ? 1 : 0) : 0;
  const distances = Array.from({ length: count }, () => 5 + rng() * 55).sort((left, right) => left - right);
  return distances.map((orbitalDistancePlanetRadii) => {
    const maximumMassFraction = composition === 'gas' || composition === 'ice' ? 0.002 : 0.02;
    const massEarth = clamp(logUniform(0.00001, Math.max(0.00002, planetMassEarth * maximumMassFraction), rng), 0.00001, planetMassEarth * 0.05);
    const radiusEarth = massEarth ** 0.28;
    const distanceMeters = orbitalDistancePlanetRadii * planetRadiusEarthValue * EARTH_RADIUS_METERS;
    const periodSeconds = 2 * Math.PI * Math.sqrt(distanceMeters ** 3 / (GRAVITATIONAL_CONSTANT * planetMassEarth * EARTH_MASS_KG));
    return {
      roll: 0,
      type: moonType(radiusEarth),
      science: {
        massEarth: rounded(massEarth, 6),
        radiusEarth: rounded(radiusEarth, 4),
        orbitalDistancePlanetRadii: rounded(orbitalDistancePlanetRadii, 2),
        orbitalPeriodDays: rounded(periodSeconds / 86_400, 3),
      },
    };
  });
}

function planetType(
  composition: ScientificComposition,
  temperatureK: number,
  massEarth: number,
): GeneratedPlanet['type'] {
  if (composition === 'gas') return 'Gas giant';
  if (composition === 'ice') return massEarth >= 5 ? 'Ice giant' : 'Dwarf planet';
  if (composition === 'dwarf') return 'Dwarf planet';
  if (composition === 'ocean') return 'Ocean world';
  if (temperatureK > 320) return 'Rocky world, hot';
  if (temperatureK >= 200) return 'Rocky world, temperate';
  return 'Rocky world, cold';
}

function generatePlanet(
  ring: number,
  distanceAu: number,
  centralMassSolar: number,
  luminositySolar: number,
  ageGyr: number,
  habitableZoneInnerAu: number,
  habitableZoneOuterAu: number,
  snowLineAu: number,
  massSample: PlanetMassSample,
  settings: ScienceGenerationSettings,
  rng: () => number,
): GeneratedPlanet {
  const radiusEarth = planetRadiusEarth(massSample.massEarth, massSample.composition);
  const albedoRange = massSample.composition === 'ice' ? [0.45, 0.75]
    : massSample.composition === 'gas' ? [0.3, 0.55]
      : [0.15, 0.4];
  const albedo = albedoRange[0] + rng() * (albedoRange[1] - albedoRange[0]);
  const equilibriumTempK = 278.5 * luminositySolar ** 0.25 / Math.sqrt(distanceAu) * ((1 - albedo) / 0.7) ** 0.25;
  const orbitalPeriodDays = 365.25 * Math.sqrt(distanceAu ** 3 / centralMassSolar);
  const habitableZonePosition: HabitableZonePosition = distanceAu < habitableZoneInnerAu
    ? 'inner'
    : distanceAu <= habitableZoneOuterAu ? 'within' : 'outer';
  const atmosphere = atmosphereForPlanet(massSample.composition, massSample.massEarth, radiusEarth, equilibriumTempK, rng);
  const initiallyRotatingHours = massSample.composition === 'gas' ? 6 + rng() * 12 : 8 + rng() * 32;
  const tidallyLocked = isTidallyLocked(
    distanceAu,
    orbitalPeriodDays,
    massSample.massEarth,
    radiusEarth,
    massSample.composition,
    centralMassSolar,
    ageGyr,
    initiallyRotatingHours,
  );
  const compositionCanSupportSurface = ['rocky', 'ocean'].includes(massSample.composition);
  const potentiallyHabitable = compositionCanSupportSurface
    && habitableZonePosition === 'within'
    && massSample.massEarth >= 0.5
    && massSample.massEarth <= 5
    && atmosphere.pressureAtm >= 0.2
    && atmosphere.pressureAtm <= 5
    && equilibriumTempK >= 180
    && equilibriumTempK <= 310;
  const marginal = compositionCanSupportSurface
    && distanceAu >= habitableZoneInnerAu * 0.8
    && distanceAu <= habitableZoneOuterAu * 1.2
    && atmosphere.pressureAtm < 15;
  const habitability: ScientificPlanetProperties['habitability'] = potentiallyHabitable
    ? 'potentially habitable'
    : marginal ? 'marginal' : 'unlikely';
  const life = lifeForPlanet(habitability, settings.lifeFrequency, ageGyr, rng);
  const science: ScientificPlanetProperties = {
    composition: massSample.composition,
    massEarth: rounded(massSample.massEarth, 4),
    radiusEarth: rounded(radiusEarth, 4),
    densityGcm3: rounded(5.514 * massSample.massEarth / radiusEarth ** 3, 3),
    gravityEarth: rounded(massSample.massEarth / radiusEarth ** 2, 3),
    orbitalPeriodDays: rounded(orbitalPeriodDays, 3),
    eccentricity: rounded(rng() ** 2 * 0.3, 3),
    equilibriumTempK: Math.round(equilibriumTempK),
    albedo: rounded(albedo, 3),
    habitableZonePosition,
    rotationHours: rounded(tidallyLocked ? orbitalPeriodDays * 24 : initiallyRotatingHours, 2),
    tidallyLocked,
    atmosphere: atmosphere.atmosphere,
    surfacePressureAtm: atmosphere.pressureAtm,
    water: waterForPlanet(massSample.composition, distanceAu, snowLineAu, habitableZonePosition, rng),
    habitability,
    life,
  };
  const temperature = equilibriumTempK > 320 ? 'hot' : equilibriumTempK >= 200 ? 'temperate' : 'cold';
  return {
    id: `planet-${ring}`,
    ring,
    distanceAu: rounded(distanceAu, 4),
    typeRoll: 0,
    type: planetType(massSample.composition, equilibriumTempK, massSample.massEarth),
    temperature,
    moonCountRoll: null,
    moons: generateMoons(massSample.composition, massSample.massEarth, radiusEarth, rng),
    environment: null,
    science,
  };
}

export function generateScienceStarSystem(options: ScienceSystemOptions): GeneratedStarSystem {
  const seed = options.seed.trim() || 'alternity';
  const settings = options.settings ?? DEFAULT_SCIENCE_SETTINGS;
  const rng = createSeededRandom(seed);
  const primaryMass = samplePrimaryMass(rng);
  const maximumAgeGyr = clamp(10 * primaryMass ** -2.5 * 0.85, 0.03, 12);
  const ageGyr = 0.02 + rng() * Math.max(0.01, maximumAgeGyr - 0.02);
  const metallicityDex = clamp(-0.05 + normal(rng) * 0.22, -1, 0.5);
  const starCount = options.starCount
    ? Math.max(1, Math.min(3, Math.trunc(options.starCount)))
    : multiplicityCount(primaryMass, rng);
  const companionSeparations: number[] = [];
  if (starCount >= 2) companionSeparations.push(logUniform(0.05, 300, rng));
  if (starCount >= 3) companionSeparations.push(logUniform(Math.max(20, companionSeparations[0] * 8), 1_000, rng));
  const masses = [primaryMass];
  for (let index = 1; index < starCount; index += 1) masses.push(primaryMass * (0.15 + rng() * 0.85));
  const stars = masses.map((mass, index) => makeScientificStar(
    mass,
    ageGyr,
    metallicityDex,
    index === 0 ? null : companionSeparations[index - 1],
    index + 1,
  ));

  const closestSeparation = companionSeparations[0] ?? Number.POSITIVE_INFINITY;
  const architecture = starCount === 1 ? 'single-star' : closestSeparation < 1.5 ? 'circumbinary' : 'circumprimary';
  const centralMassSolar = architecture === 'circumbinary' ? masses[0] + masses[1] : masses[0];
  const effectiveLuminositySolar = architecture === 'circumbinary'
    ? stars[0].science!.luminositySolar + stars[1].science!.luminositySolar
    : stars[0].science!.luminositySolar;
  const outerCompanionLimit = companionSeparations.length > 1 ? companionSeparations[1] * 0.2 : 100;
  const stableInnerAu = architecture === 'circumbinary'
    ? Math.max(0.04, closestSeparation * 3.5)
    : Math.max(0.02, 0.03 * Math.sqrt(effectiveLuminositySolar));
  const stableOuterAu = architecture === 'circumprimary'
    ? Math.min(100, closestSeparation * 0.2, outerCompanionLimit)
    : Math.min(100, outerCompanionLimit);
  const habitableZoneInnerAu = 0.95 * Math.sqrt(effectiveLuminositySolar);
  const habitableZoneOuterAu = 1.67 * Math.sqrt(effectiveLuminositySolar);
  const snowLineAu = 2.7 * Math.sqrt(effectiveLuminositySolar);

  const densityFactor = settings.systemDensity === 'sparse' ? 0.65 : settings.systemDensity === 'crowded' ? 1.35 : 1;
  const occurrenceFactor = settings.planetOccurrence === 'conservative' ? 0.7 : settings.planetOccurrence === 'optimistic' ? 1.25 : 1;
  const availableRangeFactor = stableOuterAu > stableInnerAu
    ? clamp(Math.log10(stableOuterAu / stableInnerAu) / 3, 0.25, 1.25)
    : 0;
  const targetCount = Math.max(0, Math.min(12, Math.round(
    (3 + rng() * 6) * densityFactor * occurrenceFactor * availableRangeFactor * clamp(1 + metallicityDex * 0.35, 0.7, 1.2),
  )));

  const planets: GeneratedPlanet[] = [];
  let distanceAu = stableInnerAu * (1.15 + rng() * 0.55);
  for (let ring = 1; ring <= targetCount && distanceAu < stableOuterAu; ring += 1) {
    if (ring > 1) distanceAu = planets[planets.length - 1].distanceAu * (1.3 + rng() * 0.7);
    const massSample = samplePlanetMass(distanceAu, snowLineAu, metallicityDex, rng);
    if (planets.length > 0) {
      const previous = planets[planets.length - 1];
      while (
        distanceAu < stableOuterAu
        && mutualHillSpacing(previous.distanceAu, distanceAu, previous.science!.massEarth, massSample.massEarth, centralMassSolar) < 9
      ) distanceAu *= 1.08;
    }
    if (distanceAu >= stableOuterAu) break;
    planets.push(generatePlanet(
      ring,
      distanceAu,
      centralMassSolar,
      effectiveLuminositySolar,
      ageGyr,
      habitableZoneInnerAu,
      habitableZoneOuterAu,
      snowLineAu,
      massSample,
      settings,
      rng,
    ));
  }

  const translatedPlanets = planets.map((planet) => ({
    ...planet,
    gmgTranslation: translateSciencePlanetToGmg(planet, {
      primaryStar: stars[0],
      effectiveLuminositySolar,
      systemAgeGyr: ageGyr,
    }),
  }));

  return {
    generationModel: 'science',
    seed,
    scienceSettings: settings,
    science: {
      ageGyr: rounded(ageGyr, 3),
      metallicityDex: rounded(metallicityDex, 3),
      architecture,
      centralMassSolar: rounded(centralMassSolar, 4),
      effectiveLuminositySolar: rounded(effectiveLuminositySolar, 5),
      stableInnerAu: rounded(stableInnerAu, 4),
      stableOuterAu: rounded(stableOuterAu, 3),
      habitableZoneInnerAu: rounded(habitableZoneInnerAu, 4),
      habitableZoneOuterAu: rounded(habitableZoneOuterAu, 4),
      snowLineAu: rounded(snowLineAu, 4),
    },
    starCountRoll: null,
    starCount,
    starCountLabel: String(starCount),
    stars,
    orbitTrack: 'II',
    potentialPlanetCount: targetCount,
    planets: translatedPlanets,
    unusedPotentialPlanets: Math.max(0, targetCount - translatedPlanets.length),
  };
}
