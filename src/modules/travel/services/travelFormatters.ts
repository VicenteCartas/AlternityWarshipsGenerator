import {
  AU_METERS,
  LIGHT_YEAR_METERS,
  SPEED_OF_LIGHT_MPS,
  STANDARD_GRAVITY_MPS2,
} from './travelCalculationService';

function formatNumber(value: number, maximumFractionDigits = 2): string {
  return value.toLocaleString(undefined, { maximumFractionDigits });
}

/** Compact elapsed-time display using natural units down to whole seconds. */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return 'N/A';
  if (seconds < 365.25 * 86_400) return formatWholeSeconds(Math.round(seconds));
  const years = seconds / (365.25 * 86_400);
  const label = Math.abs(years - 1) < 1e-9 ? 'year' : 'years';
  return `${formatNumber(years, years < 100 ? 2 : 1)} ${label}`;
}

function formatWholeSeconds(totalSeconds: number): string {
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];

  if (days > 0) parts.push(`${days} day${days === 1 ? '' : 's'}`);
  if (hours > 0) parts.push(`${hours} hr`);
  if (minutes > 0) parts.push(`${minutes} min`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds} sec`);

  return parts.join(' ');
}

/**
 * Format a total as the sum of its independently displayed phases.
 * This prevents a one-unit rounding difference between phase rows and total.
 */
export function formatDurationTotal(partsSeconds: number[]): string {
  if (partsSeconds.some((seconds) => !Number.isFinite(seconds) || seconds < 0)) return 'N/A';
  const displayedSeconds = partsSeconds.reduce((sum, seconds) => sum + Math.round(seconds), 0);
  return formatDuration(displayedSeconds);
}

export function formatAcceleration(accelerationMps2: number): string {
  const accelerationG = accelerationMps2 / STANDARD_GRAVITY_MPS2;
  return `${formatNumber(accelerationMps2, 3)} m/s^2 (${formatNumber(accelerationG, 3)} g)`;
}

export function formatVelocity(speedMps: number): string {
  const fractionC = speedMps / SPEED_OF_LIGHT_MPS;
  if (fractionC >= 0.001) {
    return `${formatNumber(fractionC * 100, 4)}% c`;
  }
  if (speedMps >= 1_000) return `${formatNumber(speedMps / 1_000, 2)} km/s`;
  return `${formatNumber(speedMps, 2)} m/s`;
}

export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return 'N/A';
  if (meters >= LIGHT_YEAR_METERS * 0.1) {
    return `${formatNumber(meters / LIGHT_YEAR_METERS, 4)} ly`;
  }
  if (meters >= AU_METERS * 0.01) {
    return `${formatNumber(meters / AU_METERS, 4)} AU`;
  }
  if (meters >= 1_000_000) return `${formatNumber(meters / 1_000_000, 2)} Mm`;
  return `${formatNumber(meters / 1_000, 2)} km`;
}

export function formatRounds(rounds: number): string {
  if (!Number.isFinite(rounds) || rounds < 0) return 'N/A';
  return formatNumber(rounds, rounds < 100 ? 1 : 0);
}