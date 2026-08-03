import type {
  ClimateSeverity,
  GeneratedEnvironment,
  GeneratedLifeSeries,
  GeneratedMoon,
  GeneratedPlanet,
  GeneratedStar,
  GeneratedStarSystem,
  LandformProfile,
  LifeSeriesId,
  MoonType,
  OceanExtent,
  OrbitTrackId,
  PlanetTemperature,
  PlanetType,
} from '../types/worldbuilding';

type RandomSource = () => number;

interface DiceExpression {
  count: number;
  sides: number;
  modifier: number;
}

interface SystemTableRow {
  min: number;
  max: number;
  primary: string[];
  secondary?: string[];
  planets: DiceExpression;
  orbitTrack: OrbitTrackId;
}

interface PlanetTypeResult {
  type: PlanetType;
  temperature: PlanetTemperature;
  moons: DiceExpression | null;
  moonModifier: number;
}

interface EnvironmentRow {
  min: number;
  max: number;
  environmentClass: 1 | 2 | 3 | 4 | 5;
  gravity: number;
  radiation: number;
  atmosphere: number;
  pressure: number;
  heat: number;
  life: LifeSeriesId[];
  oceanRange: [number, number] | null;
}

const SINGLE_STAR_ROWS: SystemTableRow[] = [
  { min: 1, max: 1, primary: ['O', 'B'], planets: { count: 1, sides: 12, modifier: -8 }, orbitTrack: 'I' },
  { min: 2, max: 2, primary: ['A'], planets: { count: 1, sides: 12, modifier: -6 }, orbitTrack: 'I' },
  { min: 3, max: 6, primary: ['F'], planets: { count: 1, sides: 12, modifier: -3 }, orbitTrack: 'II' },
  { min: 7, max: 10, primary: ['G'], planets: { count: 1, sides: 12, modifier: -2 }, orbitTrack: 'II' },
  { min: 11, max: 14, primary: ['K'], planets: { count: 1, sides: 12, modifier: -4 }, orbitTrack: 'II' },
  { min: 15, max: 19, primary: ['M'], planets: { count: 1, sides: 8, modifier: -2 }, orbitTrack: 'III' },
];

const NON_MAIN_SEQUENCE_ROWS: SystemTableRow[] = [
  { min: 1, max: 1, primary: ['Black hole'], planets: { count: 1, sides: 12, modifier: -9 }, orbitTrack: 'V' },
  { min: 2, max: 3, primary: ['Neutron star'], planets: { count: 1, sides: 12, modifier: -7 }, orbitTrack: 'V' },
  { min: 4, max: 7, primary: ['White dwarf'], planets: { count: 1, sides: 12, modifier: -8 }, orbitTrack: 'V' },
  { min: 8, max: 10, primary: ['Black dwarf'], planets: { count: 1, sides: 8, modifier: -2 }, orbitTrack: 'V' },
  { min: 11, max: 18, primary: ['Brown dwarf'], planets: { count: 1, sides: 8, modifier: -3 }, orbitTrack: 'III' },
  { min: 19, max: 20, primary: ['Red supergiant'], planets: { count: 1, sides: 8, modifier: -1 }, orbitTrack: 'IV' },
];

const MULTIPLE_STAR_ROWS: SystemTableRow[] = [
  { min: 1, max: 1, primary: ['O', 'B'], secondary: ['White dwarf'], planets: { count: 1, sides: 12, modifier: -9 }, orbitTrack: 'I' },
  { min: 2, max: 2, primary: ['B', 'A'], secondary: ['M'], planets: { count: 1, sides: 12, modifier: -9 }, orbitTrack: 'I' },
  { min: 3, max: 3, primary: ['F'], secondary: ['G'], planets: { count: 1, sides: 12, modifier: -8 }, orbitTrack: 'IV' },
  { min: 4, max: 5, primary: ['F'], secondary: ['K', 'M'], planets: { count: 1, sides: 12, modifier: -7 }, orbitTrack: 'II' },
  { min: 6, max: 7, primary: ['F'], secondary: ['Brown dwarf'], planets: { count: 1, sides: 12, modifier: -7 }, orbitTrack: 'II' },
  { min: 8, max: 11, primary: ['G'], secondary: ['G'], planets: { count: 1, sides: 12, modifier: -7 }, orbitTrack: 'IV' },
  { min: 12, max: 15, primary: ['G'], secondary: ['K', 'M'], planets: { count: 1, sides: 12, modifier: -6 }, orbitTrack: 'II' },
  { min: 16, max: 17, primary: ['G'], secondary: ['Brown dwarf'], planets: { count: 1, sides: 12, modifier: -7 }, orbitTrack: 'II' },
  { min: 18, max: 19, primary: ['K'], secondary: ['K', 'M'], planets: { count: 1, sides: 12, modifier: -8 }, orbitTrack: 'III' },
  { min: 20, max: 20, primary: ['K'], secondary: ['Brown dwarf'], planets: { count: 1, sides: 12, modifier: -7 }, orbitTrack: 'III' },
];

const ORBIT_TRACKS: Record<OrbitTrackId, Array<number | null>> = {
  I: [0.7, 1, 1.5, 2, 3, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55],
  II: [0.3, 0.4, 0.7, 1, 1.5, 2, 3, 5, 10, 15, 20, 25, 30, 35, 40, 45],
  III: [null, null, null, null, null, 0.1, 0.2, 0.3, 0.4, 0.7, 1, 1.5, 2, 3, 5, 10],
  IV: [1.5, 2, 3, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, null, null],
  V: [null, null, null, null, null, null, 1.5, 2, 3, 5, 10, 15, 20, 30, 40, 50],
};

const PLANET_ROLLS: DiceExpression[] = [
  { count: 1, sides: 6, modifier: -3 }, { count: 1, sides: 4, modifier: -1 },
  { count: 1, sides: 4, modifier: 0 }, { count: 1, sides: 4, modifier: 3 },
  { count: 1, sides: 4, modifier: 4 }, { count: 1, sides: 6, modifier: 4 },
  { count: 2, sides: 6, modifier: 6 }, { count: 2, sides: 6, modifier: 6 },
  { count: 2, sides: 4, modifier: 10 }, { count: 2, sides: 4, modifier: 10 },
  { count: 1, sides: 8, modifier: 10 }, { count: 1, sides: 8, modifier: 10 },
  { count: 1, sides: 6, modifier: 12 }, { count: 1, sides: 6, modifier: 12 },
  { count: 1, sides: 8, modifier: 12 }, { count: 1, sides: 8, modifier: 12 },
];

const LIFE_SERIES: Record<LifeSeriesId, { base: string; breathes: string; odds: number }> = {
  I: { base: 'Carbon', breathes: 'Oxygen', odds: 5 },
  II: { base: 'Hydrocarbons', breathes: 'Hydrogen', odds: 3 },
  III: { base: 'Carbon', breathes: 'Chlorine', odds: 3 },
  IV: { base: 'Carbon', breathes: 'Sulfur trioxide', odds: 2 },
  V: { base: 'Silicon', breathes: 'Oxygen', odds: 3 },
  VI: { base: 'Fluorosilicones', breathes: 'Sulfur dioxide', odds: 1 },
};

const TEMPERATE_ENVIRONMENTS: EnvironmentRow[] = [
  env(1, 2, 4, 1, 4, 0, 0, 0), env(3, 3, 3, 1, 2, 3, 1, 4, ['III'], [1, 2]),
  env(4, 4, 3, 1, 2, 4, 2, 3, ['V'], [1, 3]), env(5, 5, 3, 1, 2, 3, 2, 1, ['IV'], [1, 4]),
  env(6, 6, 3, 1, 2, 1, 2, 1, ['II'], [1, 5]), env(7, 7, 2, 1, 1, 2, 2, 3, ['I'], [1, 5]),
  env(8, 8, 2, 2, 1, 2, 2, 1, ['I'], [1, 6]), env(9, 9, 1, 2, 1, 2, 3, 3, ['I'], [1, 7]),
  env(10, 10, 1, 2, 1, 2, 3, 1, ['I'], [1, 7]), env(11, 11, 1, 2, 1, 2, 3, 2, ['I'], [1, 6]),
  env(12, 12, 1, 2, 1, 2, 4, 2, ['I'], [1, 7]), env(13, 14, 1, 2, 1, 2, 3, 2, ['I', 'III'], [1, 7]),
  env(15, 15, 1, 2, 1, 1, 3, 2, ['I'], [1, 7]), env(16, 16, 2, 3, 1, 2, 4, 3, ['I'], [1, 6]),
  env(17, 17, 2, 3, 2, 2, 4, 1, ['I'], [1, 7]), env(18, 18, 3, 3, 2, 4, 4, 2, ['V'], [1, 6]),
  env(19, 19, 3, 4, 3, 4, 4, 4, ['V'], [1, 6]), env(20, 20, 3, 4, 0, 1, 4, 1, ['II'], [1, 5]),
];

const HOT_ENVIRONMENTS: EnvironmentRow[] = [
  env(1, 3, 4, 1, 3, 0, 0, 5), env(4, 5, 3, 1, 3, 3, 1, 5, ['VI'], [1, 1]),
  env(6, 7, 3, 1, 2, 3, 2, 4, ['VI'], [1, 2]), env(8, 8, 2, 1, 3, 3, 2, 4, ['III'], [1, 3]),
  env(9, 9, 2, 2, 2, 3, 3, 3, ['III'], [1, 4]), env(10, 10, 1, 2, 3, 2, 2, 3, ['I'], [1, 4]),
  env(11, 11, 1, 2, 2, 2, 3, 2, ['I'], [1, 5]), env(12, 12, 1, 2, 1, 2, 4, 4, ['I'], [1, 5]),
  env(13, 14, 2, 3, 1, 3, 4, 4, ['III'], [1, 5]), env(15, 16, 3, 3, 2, 4, 4, 5, ['V'], [1, 3]),
  env(17, 99, 5, 4, 1, 4, 5, 5),
];

const COLD_ENVIRONMENTS: EnvironmentRow[] = [
  env(1, 5, 4, 1, 3, 0, 0, 0), env(6, 8, 3, 1, 2, 3, 1, 0, ['IV'], [1, 2]),
  env(9, 9, 2, 1, 2, 1, 1, 0, ['II'], [1, 2]), env(10, 10, 2, 2, 1, 1, 2, 1, ['I', 'II'], [1, 3]),
  env(11, 11, 2, 2, 1, 2, 3, 1, ['I'], [1, 4]), env(12, 12, 1, 2, 1, 2, 3, 2, ['I'], [1, 5]),
  env(13, 13, 2, 2, 1, 2, 4, 1, ['I'], [1, 6]), env(14, 15, 2, 3, 1, 1, 4, 1, ['I', 'II'], [1, 5]),
  env(16, 17, 2, 3, 1, 1, 4, 0, ['II'], [1, 4]), env(18, 18, 3, 4, 1, 1, 4, 0, ['II'], [1, 3]),
  env(19, 20, 3, 4, 1, 3, 4, 0, ['II', 'IV'], [1, 3]),
];

const GAS_GIANT_ENVIRONMENTS: EnvironmentRow[] = [
  env(1, 16, 5, 5, 3, 1, 5, 0), env(17, 17, 5, 4, 1, 1, 5, 0),
  env(18, 18, 3, 4, 1, 1, 4, 0, ['II']), env(19, 19, 3, 4, 1, 2, 4, 0, ['II']),
  env(20, 20, 3, 4, 1, 2, 4, 1, ['I', 'II']),
];

function env(
  min: number,
  max: number,
  environmentClass: 1 | 2 | 3 | 4 | 5,
  gravity: number,
  radiation: number,
  atmosphere: number,
  pressure: number,
  heat: number,
  life: LifeSeriesId[] = [],
  oceanRange: [number, number] | null = null,
): EnvironmentRow {
  return { min, max, environmentClass, gravity, radiation, atmosphere, pressure, heat, life, oceanRange };
}

function rollDie(sides: number, rng: RandomSource): number {
  return Math.floor(rng() * sides) + 1;
}

function rollExpression(expression: DiceExpression, rng: RandomSource): number {
  let total = expression.modifier;
  for (let index = 0; index < expression.count; index += 1) total += rollDie(expression.sides, rng);
  return total;
}

export function rollPlanetTypeForRing(ring: number, rng: RandomSource = Math.random): number {
  const expression = PLANET_ROLLS[ring - 1];
  if (!expression) throw new Error('Orbit ring must be between 1 and 16.');
  return rollExpression(expression, rng);
}

function choose<T>(values: T[], rng: RandomSource): T {
  return values[Math.min(values.length - 1, Math.floor(rng() * values.length))]!;
}

function tableRow<T extends { min: number; max: number }>(rows: T[], roll: number): T {
  return rows.find((row) => roll >= row.min && roll <= row.max) ?? rows[rows.length - 1]!;
}

function stellarColor(classification: string): string {
  if (classification === 'O' || classification === 'B') return 'Blue-white';
  if (classification === 'A') return 'Blue';
  if (classification === 'F') return 'Green';
  if (classification === 'G') return 'Yellow';
  if (classification === 'K') return 'Orange';
  if (classification === 'M' || classification === 'Red supergiant') return 'Red';
  if (classification === 'White dwarf') return 'White';
  if (classification === 'Brown dwarf') return 'Brown';
  return 'Dark';
}

export function starCountFromRoll(roll: number): number {
  if (roll <= 10) return 1;
  if (roll <= 16) return 2;
  if (roll <= 18) return 3;
  if (roll === 19) return 4;
  return 5;
}

export function planetTypeFromRoll(roll: number): PlanetTypeResult {
  if (roll <= 0) return { type: 'Ring system', temperature: 'none', moons: null, moonModifier: 0 };
  if (roll === 1) return { type: 'Super-Terran, hot', temperature: 'hot', moons: { count: 1, sides: 6, modifier: -3 }, moonModifier: -1 };
  if (roll <= 3) return { type: 'Sub-Terran, hot', temperature: 'hot', moons: { count: 1, sides: 4, modifier: -3 }, moonModifier: -5 };
  if (roll === 4) return { type: 'Terran, hot', temperature: 'hot', moons: { count: 1, sides: 6, modifier: -4 }, moonModifier: -3 };
  if (roll === 5) return { type: 'Terran, temperate', temperature: 'temperate', moons: { count: 1, sides: 6, modifier: -2 }, moonModifier: -3 };
  if (roll === 6) return { type: 'Sub-Terran, temperate', temperature: 'temperate', moons: { count: 1, sides: 6, modifier: -3 }, moonModifier: -5 };
  if (roll === 7) return { type: 'Super-Terran, temperate', temperature: 'temperate', moons: { count: 1, sides: 8, modifier: -3 }, moonModifier: -1 };
  if (roll <= 9) return { type: 'Asteroid belt', temperature: 'none', moons: null, moonModifier: 0 };
  if (roll <= 11) return { type: 'Gas giant, large', temperature: 'cold', moons: { count: 2, sides: 12, modifier: 0 }, moonModifier: 0 };
  if (roll <= 14) return { type: 'Gas giant, small', temperature: 'cold', moons: { count: 1, sides: 12, modifier: 0 }, moonModifier: 0 };
  if (roll === 15) return { type: 'Super-Terran, cold', temperature: 'cold', moons: { count: 1, sides: 6, modifier: 0 }, moonModifier: -1 };
  if (roll === 16) return { type: 'Terran, cold', temperature: 'cold', moons: { count: 1, sides: 4, modifier: 0 }, moonModifier: -3 };
  if (roll === 17) return { type: 'Sub-Terran, cold', temperature: 'cold', moons: { count: 1, sides: 3, modifier: 0 }, moonModifier: -5 };
  return { type: 'Comet belt', temperature: 'none', moons: null, moonModifier: 0 };
}

export function moonTypeFromRoll(roll: number): MoonType {
  if (roll <= 3) return 'Tiny';
  if (roll <= 6) return 'Small';
  if (roll === 7) return 'Ring system';
  if (roll <= 9) return 'Sub-Terran';
  if (roll <= 11) return 'Terran';
  return 'Super-Terran';
}

export function environmentFromRoll(
  temperature: Exclude<PlanetTemperature, 'none'>,
  roll: number,
  gasGiant = false,
): EnvironmentRow {
  const rows = gasGiant
    ? GAS_GIANT_ENVIRONMENTS
    : temperature === 'hot'
      ? HOT_ENVIRONMENTS
      : temperature === 'cold'
        ? COLD_ENVIRONMENTS
        : TEMPERATE_ENVIRONMENTS;
  return tableRow(rows, roll);
}

export function nearestGmgEnvironmentClass(
  temperature: Exclude<PlanetTemperature, 'none'>,
  ratings: { gravity: number; radiation: number; atmosphere: number; pressure: number; heat: number },
  gasGiant = false,
): 1 | 2 | 3 | 4 | 5 {
  const rows = gasGiant
    ? GAS_GIANT_ENVIRONMENTS
    : temperature === 'hot'
      ? HOT_ENVIRONMENTS
      : temperature === 'cold'
        ? COLD_ENVIRONMENTS
        : TEMPERATE_ENVIRONMENTS;
  let best = rows[0];
  let bestScore = Number.POSITIVE_INFINITY;
  for (const row of rows) {
    const score = (row.gravity - ratings.gravity) ** 2
      + (row.radiation - ratings.radiation) ** 2
      + (row.atmosphere - ratings.atmosphere) ** 2
      + (row.pressure - ratings.pressure) ** 2
      + (row.heat - ratings.heat) ** 2;
    if (score < bestScore || (score === bestScore && row.environmentClass > best.environmentClass)) {
      best = row;
      bestScore = score;
    }
  }
  return best.environmentClass;
}

function oceanExtent(environmentClass: 1 | 2 | 3 | 4 | 5, roll: number): OceanExtent | null {
  if (environmentClass > 3) return null;
  if (environmentClass === 1) return roll === 1 ? 'Sparse' : roll <= 3 ? 'Moderate' : roll <= 6 ? 'Abundant' : 'Complete';
  if (environmentClass === 2) return roll <= 2 ? 'Sparse' : roll <= 5 ? 'Moderate' : roll <= 7 ? 'Abundant' : 'Complete';
  return roll <= 4 ? 'Sparse' : roll <= 6 ? 'Moderate' : roll === 7 ? 'Abundant' : 'Complete';
}

function climateSeverity(environmentClass: 1 | 2 | 3, roll: number): ClimateSeverity {
  if (environmentClass === 1) return roll === 1 ? 'Calm' : roll <= 4 ? 'Active' : roll <= 7 ? 'Turbulent' : 'Violent';
  if (environmentClass === 2) return roll === 1 ? 'Calm' : roll <= 3 ? 'Active' : roll <= 6 ? 'Turbulent' : 'Violent';
  return roll === 1 ? 'Calm' : roll === 2 ? 'Active' : roll <= 5 ? 'Turbulent' : 'Violent';
}

function landformProfile(environmentClass: 1 | 2 | 3 | 4 | 5, roll: number): LandformProfile {
  if (environmentClass === 1) return roll <= 2 ? 'Smooth' : roll <= 5 ? 'Varied' : roll <= 7 ? 'Rugged' : 'Perilous';
  if (environmentClass === 2) return roll === 1 ? 'Smooth' : roll <= 3 ? 'Varied' : roll <= 6 ? 'Rugged' : 'Perilous';
  if (environmentClass === 3) return roll <= 3 ? 'Smooth' : roll <= 6 ? 'Varied' : roll === 7 ? 'Rugged' : 'Perilous';
  if (environmentClass === 4) return roll === 1 ? 'Smooth' : roll <= 3 ? 'Varied' : roll <= 5 ? 'Rugged' : 'Perilous';
  return roll <= 6 ? 'Smooth' : 'Varied';
}

function createEnvironment(
  planet: PlanetTypeResult,
  moonCount: number,
  rng: RandomSource,
): GeneratedEnvironment | null {
  if (planet.temperature === 'none') return null;
  const gasGiant = planet.type.startsWith('Gas giant');
  const environmentRoll = planet.type.startsWith('Sub-Terran')
    ? rollDie(12, rng)
    : planet.type.startsWith('Super-Terran')
      ? rollDie(12, rng) + 8
      : planet.type === 'Gas giant, large'
        ? rollDie(12, rng) + 5
        : rollDie(20, rng);
  const row = environmentFromRoll(planet.temperature, environmentRoll, gasGiant);
  const life: GeneratedLifeSeries[] = row.life.map((series) => {
    const definition = LIFE_SERIES[series];
    const roll = rollDie(8, rng);
    return { series, ...definition, roll, present: roll <= definition.odds };
  });
  const oceanRoll = row.oceanRange ? rollDie(8, rng) : null;
  const hasOcean = oceanRoll !== null && oceanRoll >= row.oceanRange![0] && oceanRoll <= row.oceanRange![1];
  const extent = hasOcean ? oceanExtent(row.environmentClass, rollDie(8, rng)) : null;
  const climateRoll = row.environmentClass <= 3
    ? Math.min(8, rollDie(8, rng) + (extent === 'Sparse' || extent === null ? 1 : 0) + (gasGiant ? 3 : 0))
    : null;
  let landformRoll: number | null = null;
  if (!gasGiant) {
    let modifier = moonCount > 0 ? 1 : 0;
    if (extent === 'Complete') modifier += 1;
    if (planet.type.startsWith('Sub-Terran')) modifier += 1;
    if (planet.type.startsWith('Super-Terran')) modifier -= 1;
    if (row.atmosphere >= 4) modifier -= 1;
    landformRoll = Math.max(1, Math.min(8, rollDie(8, rng) + modifier));
  }
  return {
    roll: environmentRoll,
    environmentClass: row.environmentClass,
    gravity: row.gravity,
    radiation: row.radiation,
    atmosphere: row.atmosphere,
    pressure: row.pressure,
    heat: row.heat,
    life,
    oceanRoll,
    oceanExtent: extent,
    climateRoll,
    climate: climateRoll === null ? null : climateSeverity(row.environmentClass as 1 | 2 | 3, climateRoll),
    landformRoll,
    landforms: landformRoll === null ? null : landformProfile(row.environmentClass, landformRoll),
  };
}

function rollPotentialPlanets(expression: DiceExpression, rng: RandomSource): number {
  const first = rollDie(expression.sides, rng);
  const explosion = first === expression.sides ? rollDie(expression.sides, rng) : 0;
  return Math.max(0, first + explosion + expression.modifier);
}

function makeStar(classification: string, group: number, role: 'Primary' | 'Companion', index: number): GeneratedStar {
  return { id: `star-${index}`, group, role, classification, color: stellarColor(classification) };
}

function rollSingleSystem(rng: RandomSource): SystemTableRow {
  const roll = rollDie(20, rng);
  return roll === 20
    ? tableRow(NON_MAIN_SEQUENCE_ROWS, rollDie(20, rng))
    : tableRow(SINGLE_STAR_ROWS, roll);
}

function buildStars(starCount: number, mainRow: SystemTableRow, rng: RandomSource): GeneratedStar[] {
  const stars: GeneratedStar[] = [];
  const addPair = (row: SystemTableRow, group: number) => {
    stars.push(makeStar(choose(row.primary, rng), group, 'Primary', stars.length + 1));
    stars.push(makeStar(choose(row.secondary!, rng), group, 'Companion', stars.length + 1));
  };
  if (starCount === 1) {
    stars.push(makeStar(choose(mainRow.primary, rng), 1, 'Primary', 1));
    return stars;
  }
  addPair(mainRow, 1);
  let remaining = starCount - 2;
  let group = 2;
  while (remaining >= 2) {
    addPair(tableRow(MULTIPLE_STAR_ROWS, rollDie(20, rng)), group);
    remaining -= 2;
    group += 1;
  }
  if (remaining === 1) {
    const row = rollSingleSystem(rng);
    stars.push(makeStar(choose(row.primary, rng), group, 'Companion', stars.length + 1));
  }
  return stars;
}

function generatePlanet(ring: number, distanceAu: number, rng: RandomSource): GeneratedPlanet {
  const typeRoll = rollPlanetTypeForRing(ring, rng);
  const planetType = planetTypeFromRoll(typeRoll);
  const moonCountRoll = planetType.moons ? rollExpression(planetType.moons, rng) : null;
  const moonCount = Math.max(0, moonCountRoll ?? 0);
  const moons: GeneratedMoon[] = Array.from({ length: moonCount }, () => {
    const roll = rollDie(6, rng) + rollDie(6, rng) + planetType.moonModifier;
    return { roll, type: moonTypeFromRoll(roll) };
  });
  return {
    id: `ring-${ring}`,
    ring,
    distanceAu,
    typeRoll,
    type: planetType.type,
    temperature: planetType.temperature,
    moonCountRoll,
    moons,
    environment: createEnvironment(planetType, moonCount, rng),
  };
}

export function generateStarSystem(options: { starCount?: number; rng?: RandomSource } = {}): GeneratedStarSystem {
  const rng = options.rng ?? Math.random;
  const starCountRoll = options.starCount ? null : rollDie(20, rng);
  const starCount = options.starCount
    ? Math.max(1, Math.min(6, Math.trunc(options.starCount)))
    : starCountFromRoll(starCountRoll!);
  const mainRow = starCount === 1
    ? rollSingleSystem(rng)
    : tableRow(MULTIPLE_STAR_ROWS, rollDie(20, rng));
  const potentialPlanetCount = rollPotentialPlanets(mainRow.planets, rng);
  const planets: GeneratedPlanet[] = [];
  for (const [index, distanceAu] of ORBIT_TRACKS[mainRow.orbitTrack].entries()) {
    if (planets.length >= potentialPlanetCount) break;
    if (distanceAu !== null && rollDie(2, rng) === 1) {
      const planet = generatePlanet(index + 1, distanceAu, rng);
      planets.push(planet);
      if (planet.type === 'Comet belt') break;
    }
  }
  return {
    generationModel: 'gmg',
    seed: null,
    scienceSettings: null,
    science: null,
    starCountRoll,
    starCount,
    starCountLabel: starCountRoll === 20 ? '5 or more' : String(starCount),
    stars: buildStars(starCount, mainRow, rng),
    orbitTrack: mainRow.orbitTrack,
    potentialPlanetCount,
    planets,
    unusedPotentialPlanets: Math.max(0, potentialPlanetCount - planets.length),
  };
}