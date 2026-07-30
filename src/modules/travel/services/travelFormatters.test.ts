import { describe, expect, it } from 'vitest';
import {
  formatAcceleration,
  formatDistance,
  formatDuration,
  formatDurationTotal,
  formatRounds,
  formatVelocity,
} from './travelFormatters';
import { AU_METERS, SPEED_OF_LIGHT_MPS, STANDARD_GRAVITY_MPS2 } from './travelCalculationService';

describe('travel formatters', () => {
  it('formats durations at useful scales', () => {
    expect(formatDuration(45)).toBe('45 sec');
    expect(formatDuration(90)).toBe('1 min 30 sec');
    expect(formatDuration(3_900)).toBe('1 hr 5 min');
    expect(formatDuration(90_000)).toBe('1 day 1 hr');
    expect(formatDuration(365.25 * 86_400)).toBe('1 year');
  });

  it('keeps symmetric long phases visibly additive', () => {
    const phaseSeconds = 2_594_598.830013778;
    expect(formatDuration(phaseSeconds)).toBe('30 days 43 min 19 sec');
    expect(formatDurationTotal([phaseSeconds, phaseSeconds])).toBe('60 days 1 hr 26 min 38 sec');
  });

  it('reconciles a total with its independently rounded phase values', () => {
    const phaseSeconds = 58_351.17173616169;
    expect(formatDuration(phaseSeconds)).toBe('16 hr 12 min 31 sec');
    expect(formatDurationTotal([phaseSeconds, phaseSeconds])).toBe('1 day 8 hr 25 min 2 sec');
  });

  it('formats acceleration in SI and g', () => {
    expect(formatAcceleration(STANDARD_GRAVITY_MPS2)).toContain('1 g');
  });

  it('formats low and relativistic velocities', () => {
    expect(formatVelocity(2_000)).toBe('2 km/s');
    expect(formatVelocity(SPEED_OF_LIGHT_MPS * 0.5)).toBe('50% c');
  });

  it('formats distances and rounds', () => {
    expect(formatDistance(AU_METERS)).toBe('1 AU');
    expect(formatDistance(2_000_000)).toBe('2 Mm');
    expect(formatRounds(12.25)).toBe('12.3');
  });

  it('handles invalid values', () => {
    expect(formatDuration(Number.NaN)).toBe('N/A');
    expect(formatDistance(-1)).toBe('N/A');
    expect(formatRounds(-1)).toBe('N/A');
  });
});