export type WarshipsScaleId = 'pl6' | 'pl7plus';
export type TravelProfile = 'rest-to-rest' | 'flyby';
export type DistanceUnitId =
  | 'km'
  | 'Mm'
  | 'AU'
  | 'light-second'
  | 'light-minute'
  | 'light-hour'
  | 'light-day'
  | 'light-year'
  | 'parsec'
  | 'hex';

export interface WarshipsScale {
  id: WarshipsScaleId;
  label: string;
  progressLevel: string;
  hexMeters: number;
  roundSeconds: number;
}

export interface DistanceUnit {
  id: Exclude<DistanceUnitId, 'hex'>;
  label: string;
  shortLabel: string;
  meters: number;
}

export interface TravelInput {
  distanceMeters: number;
  accelerationMps2: number;
  profile: TravelProfile;
  /** Optional coordinate-frame cruise limit. Omit for unrestricted acceleration. */
  speedCapMps?: number;
}

export interface TravelResult {
  distanceMeters: number;
  accelerationMps2: number;
  externalElapsedSeconds: number;
  shipElapsedSeconds: number;
  classicalElapsedSeconds: number;
  externalBurnSeconds: number;
  shipBurnSeconds: number;
  externalCoastSeconds: number;
  shipCoastSeconds: number;
  accelerationDistanceMeters: number;
  coastDistanceMeters: number;
  peakSpeedMps: number;
  peakGamma: number;
  peakFractionC: number;
  speedCapReached: boolean;
}

export interface CrewAccelerationEffects {
  graphBand: 'G0' | 'G1' | 'G2' | 'G3' | 'G4' | 'G5';
  protected: string;
  unprotected: string;
}

export const STANDARD_GRAVITY_MPS2 = 9.80665;
export const SPEED_OF_LIGHT_MPS = 299_792_458;
export const AU_METERS = 149_597_870_700;
export const LIGHT_YEAR_METERS = 9_460_730_472_580_800;
export const PARSEC_METERS = 3.085677581491367e16;

export const WARSHIPS_SCALES: Record<WarshipsScaleId, WarshipsScale> = {
  pl6: {
    id: 'pl6',
    label: 'Fusion Age scale',
    progressLevel: 'PL 6',
    hexMeters: 50_000,
    roundSeconds: 300,
  },
  pl7plus: {
    id: 'pl7plus',
    label: 'Standard scale',
    progressLevel: 'PL 7+',
    hexMeters: 1_000_000,
    roundSeconds: 30,
  },
};

export const DISTANCE_UNITS: DistanceUnit[] = [
  { id: 'km', label: 'Kilometers', shortLabel: 'km', meters: 1_000 },
  { id: 'Mm', label: 'Megameters', shortLabel: 'Mm', meters: 1_000_000 },
  { id: 'AU', label: 'Astronomical units', shortLabel: 'AU', meters: AU_METERS },
  { id: 'light-second', label: 'Light-seconds', shortLabel: 'light-sec', meters: SPEED_OF_LIGHT_MPS },
  { id: 'light-minute', label: 'Light-minutes', shortLabel: 'light-min', meters: SPEED_OF_LIGHT_MPS * 60 },
  { id: 'light-hour', label: 'Light-hours', shortLabel: 'light-hr', meters: SPEED_OF_LIGHT_MPS * 3_600 },
  { id: 'light-day', label: 'Light-days', shortLabel: 'light-day', meters: SPEED_OF_LIGHT_MPS * 86_400 },
  { id: 'light-year', label: 'Light-years', shortLabel: 'ly', meters: LIGHT_YEAR_METERS },
  { id: 'parsec', label: 'Parsecs', shortLabel: 'pc', meters: PARSEC_METERS },
];

function requirePositiveFinite(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be greater than zero.`);
  }
}

export function getWarshipsScale(scaleId: WarshipsScaleId): WarshipsScale {
  return WARSHIPS_SCALES[scaleId];
}

/**
 * Convert a Warships acceleration rating into SI acceleration.
 *
 * A rating of 1 changes velocity by one hex per round over one round, so the
 * dimensionally correct conversion is hex length / round duration squared.
 */
export function accelerationRatingToMps2(rating: number, scaleId: WarshipsScaleId): number {
  if (!Number.isFinite(rating)) return 0;
  const scale = getWarshipsScale(scaleId);
  return rating * scale.hexMeters / (scale.roundSeconds ** 2);
}

export function accelerationRatingToG(rating: number, scaleId: WarshipsScaleId): number {
  return accelerationRatingToMps2(rating, scaleId) / STANDARD_GRAVITY_MPS2;
}

export function mps2ToAccelerationRating(accelerationMps2: number, scaleId: WarshipsScaleId): number {
  if (!Number.isFinite(accelerationMps2)) return 0;
  const scale = getWarshipsScale(scaleId);
  return accelerationMps2 * (scale.roundSeconds ** 2) / scale.hexMeters;
}

export function speedRatingToMps(speedRating: number, scaleId: WarshipsScaleId): number {
  if (!Number.isFinite(speedRating)) return 0;
  const scale = getWarshipsScale(scaleId);
  return speedRating * scale.hexMeters / scale.roundSeconds;
}

export function mpsToSpeedRating(speedMps: number, scaleId: WarshipsScaleId): number {
  if (!Number.isFinite(speedMps)) return 0;
  const scale = getWarshipsScale(scaleId);
  return speedMps * scale.roundSeconds / scale.hexMeters;
}

export function distanceToMeters(
  value: number,
  unitId: DistanceUnitId,
  scaleId: WarshipsScaleId,
): number {
  if (!Number.isFinite(value)) return 0;
  if (unitId === 'hex') return value * getWarshipsScale(scaleId).hexMeters;
  const unit = DISTANCE_UNITS.find((candidate) => candidate.id === unitId);
  return value * (unit?.meters ?? 1);
}

export function metersToDistance(
  meters: number,
  unitId: DistanceUnitId,
  scaleId: WarshipsScaleId,
): number {
  if (!Number.isFinite(meters)) return 0;
  if (unitId === 'hex') return meters / getWarshipsScale(scaleId).hexMeters;
  const unit = DISTANCE_UNITS.find((candidate) => candidate.id === unitId);
  return meters / (unit?.meters ?? 1);
}

interface RelativisticPhase {
  coordinateSeconds: number;
  properSeconds: number;
  finalSpeedMps: number;
  gamma: number;
}

/** Constant proper acceleration from rest across one acceleration segment. */
function relativisticPhase(distanceMeters: number, accelerationMps2: number): RelativisticPhase {
  const gamma = 1 + accelerationMps2 * distanceMeters / (SPEED_OF_LIGHT_MPS ** 2);
  const coordinateSeconds = SPEED_OF_LIGHT_MPS / accelerationMps2 * Math.sqrt(gamma ** 2 - 1);
  const properSeconds = SPEED_OF_LIGHT_MPS / accelerationMps2 * Math.acosh(gamma);
  const finalSpeedMps = SPEED_OF_LIGHT_MPS * Math.sqrt(1 - 1 / (gamma ** 2));
  return { coordinateSeconds, properSeconds, finalSpeedMps, gamma };
}

function classicalElapsedSeconds(
  distanceMeters: number,
  accelerationMps2: number,
  profile: TravelProfile,
  speedCapMps?: number,
): number {
  const phaseCount = profile === 'rest-to-rest' ? 2 : 1;
  const naturalPhaseDistance = distanceMeters / phaseCount;

  if (speedCapMps && speedCapMps > 0) {
    const timeToCap = speedCapMps / accelerationMps2;
    const distanceToCap = 0.5 * accelerationMps2 * timeToCap ** 2;
    const totalAccelerationDistance = distanceToCap * phaseCount;
    if (totalAccelerationDistance < distanceMeters) {
      return timeToCap * phaseCount + (distanceMeters - totalAccelerationDistance) / speedCapMps;
    }
  }

  return phaseCount * Math.sqrt(2 * naturalPhaseDistance / accelerationMps2);
}

/**
 * Calculate a sublight trip under constant proper acceleration.
 *
 * Rest-to-rest trips accelerate for half the distance, turn around, and brake
 * for the other half. Flyby trips accelerate over the whole distance. When a
 * cruise limit is supplied, the remaining distance is coasted at that speed.
 */
export function calculateTravel(input: TravelInput): TravelResult {
  const { distanceMeters, accelerationMps2, profile } = input;
  requirePositiveFinite(distanceMeters, 'Distance');
  requirePositiveFinite(accelerationMps2, 'Acceleration');

  const requestedCap = input.speedCapMps;
  const speedCapMps = requestedCap && Number.isFinite(requestedCap)
    ? Math.min(Math.max(requestedCap, 0), SPEED_OF_LIGHT_MPS * (1 - 1e-12))
    : undefined;
  const phaseCount = profile === 'rest-to-rest' ? 2 : 1;
  const naturalPhaseDistance = distanceMeters / phaseCount;
  const naturalPhase = relativisticPhase(naturalPhaseDistance, accelerationMps2);

  let phase = naturalPhase;
  let accelerationDistanceMeters = naturalPhaseDistance;
  let coastDistanceMeters = 0;
  let externalCoastSeconds = 0;
  let shipCoastSeconds = 0;
  let speedCapReached = false;

  if (speedCapMps && speedCapMps < naturalPhase.finalSpeedMps) {
    const capGamma = 1 / Math.sqrt(1 - (speedCapMps / SPEED_OF_LIGHT_MPS) ** 2);
    accelerationDistanceMeters = SPEED_OF_LIGHT_MPS ** 2 / accelerationMps2 * (capGamma - 1);
    phase = relativisticPhase(accelerationDistanceMeters, accelerationMps2);
    coastDistanceMeters = Math.max(0, distanceMeters - accelerationDistanceMeters * phaseCount);
    externalCoastSeconds = coastDistanceMeters / speedCapMps;
    shipCoastSeconds = externalCoastSeconds / capGamma;
    speedCapReached = true;
  }

  const externalBurnSeconds = phase.coordinateSeconds * phaseCount;
  const shipBurnSeconds = phase.properSeconds * phaseCount;
  const externalElapsedSeconds = externalBurnSeconds + externalCoastSeconds;
  const shipElapsedSeconds = shipBurnSeconds + shipCoastSeconds;

  return {
    distanceMeters,
    accelerationMps2,
    externalElapsedSeconds,
    shipElapsedSeconds,
    classicalElapsedSeconds: classicalElapsedSeconds(
      distanceMeters,
      accelerationMps2,
      profile,
      speedCapMps,
    ),
    externalBurnSeconds,
    shipBurnSeconds,
    externalCoastSeconds,
    shipCoastSeconds,
    accelerationDistanceMeters,
    coastDistanceMeters,
    peakSpeedMps: phase.finalSpeedMps,
    peakGamma: phase.gamma,
    peakFractionC: phase.finalSpeedMps / SPEED_OF_LIGHT_MPS,
    speedCapReached,
  };
}

/** Published Warships character effects, classified by physical acceleration. */
export function getCrewAccelerationEffects(accelerationG: number): CrewAccelerationEffects {
  const g = Math.max(0, accelerationG);
  if (g <= 0.2) {
    return { graphBand: 'G0', protected: 'No acceleration effects.', unprotected: 'No acceleration effects.' };
  }
  if (g < 0.8) {
    return { graphBand: 'G1', protected: 'No acceleration effects.', unprotected: 'No acceleration effects.' };
  }
  if (g <= 1.2) {
    return { graphBand: 'G2', protected: 'Normal Earth-like gravity.', unprotected: 'Normal Earth-like gravity.' };
  }
  if (g <= 2) {
    return { graphBand: 'G3', protected: 'No acceleration effects.', unprotected: 'No acceleration effects.' };
  }
  if (g <= 3) {
    return { graphBand: 'G4', protected: 'No acceleration effects.', unprotected: 'No acceleration effects.' };
  }
  if (g <= 9) {
    return {
      graphBand: 'G5',
      protected: 'No penalty while secured for acceleration.',
      unprotected: '+2 step penalty to all actions; moving requires a Strength check.',
    };
  }
  if (g <= 25) {
    return {
      graphBand: 'G5',
      protected: 'No penalty while secured for acceleration.',
      unprotected: 'No actions; Stamina-endurance check each round or suffer stun damage.',
    };
  }
  if (g <= 40) {
    return {
      graphBand: 'G5',
      protected: '+2 step penalty to all actions, including crew checks.',
      unprotected: 'No actions; endurance checks at +3 steps each round.',
    };
  }
  if (g <= 60) {
    return {
      graphBand: 'G5',
      protected: 'No actions; endurance checks each round; crew checks at +3 steps.',
      unprotected: 'Fatal acceleration.',
    };
  }
  if (g <= 90) {
    return {
      graphBand: 'G5',
      protected: 'No actions; endurance checks at +3 steps; crew checks at +5 steps.',
      unprotected: 'Fatal acceleration.',
    };
  }
  return {
    graphBand: 'G5',
    protected: 'Fatal without acceleration compensation.',
    unprotected: 'Fatal acceleration.',
  };
}
