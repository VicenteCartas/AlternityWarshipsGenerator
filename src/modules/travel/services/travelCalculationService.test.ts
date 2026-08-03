import { describe, expect, it } from 'vitest';
import {
  AU_METERS,
  SPEED_OF_LIGHT_MPS,
  STANDARD_GRAVITY_MPS2,
  accelerationRatingToG,
  accelerationRatingToMps2,
  calculateTravel,
  distanceToMeters,
  getCrewAccelerationEffects,
  metersToDistance,
  mps2ToAccelerationRating,
  mpsToSpeedRating,
  speedRatingToMps,
} from './travelCalculationService';

describe('Warships scale conversions', () => {
  it('converts PL6 acceleration from 50 km hexes and 300-second rounds', () => {
    expect(accelerationRatingToMps2(1, 'pl6')).toBeCloseTo(0.555555556, 8);
    expect(accelerationRatingToG(1, 'pl6')).toBeCloseTo(0.05665, 4);
  });

  it('keeps the scale-derived conversion as the default', () => {
    expect(accelerationRatingToG(1, 'pl6')).toBeLessThan(0.1);
    expect(accelerationRatingToG(1, 'pl6')).not.toBeCloseTo(17, 0);
  });

  it('reproduces the published Warships acceleration interpretation', () => {
    expect(accelerationRatingToG(1, 'pl6', 'warships-published')).toBeCloseTo(17, 0);
    expect(accelerationRatingToG(1, 'pl7plus', 'warships-published')).toBeCloseTo(3399, 0);
    expect(mps2ToAccelerationRating(
      accelerationRatingToMps2(2.5, 'pl6', 'warships-published'),
      'pl6',
      'warships-published',
    )).toBeCloseTo(2.5, 12);
  });

  it('converts PL7+ acceleration from 1,000 km hexes and 30-second rounds', () => {
    expect(accelerationRatingToMps2(1, 'pl7plus')).toBeCloseTo(1111.111111, 6);
    expect(accelerationRatingToG(1, 'pl7plus')).toBeCloseTo(113.3, 1);
  });

  it('round-trips physical acceleration and ratings', () => {
    const acceleration = accelerationRatingToMps2(3.75, 'pl7plus');
    expect(mps2ToAccelerationRating(acceleration, 'pl7plus')).toBeCloseTo(3.75, 12);
  });

  it('converts speed ratings in both scales', () => {
    expect(speedRatingToMps(1, 'pl6')).toBeCloseTo(166.666667, 6);
    expect(speedRatingToMps(1, 'pl7plus')).toBeCloseTo(33333.333333, 6);
    expect(mpsToSpeedRating(speedRatingToMps(1250, 'pl7plus'), 'pl7plus')).toBeCloseTo(1250, 10);
  });
});

describe('distance conversions', () => {
  it('uses the exact astronomical unit', () => {
    expect(distanceToMeters(1, 'AU', 'pl7plus')).toBe(AU_METERS);
    expect(metersToDistance(AU_METERS * 25, 'AU', 'pl7plus')).toBe(25);
  });

  it('uses scale-specific hex lengths', () => {
    expect(distanceToMeters(10, 'hex', 'pl6')).toBe(500_000);
    expect(distanceToMeters(10, 'hex', 'pl7plus')).toBe(10_000_000);
  });

  it('converts light-time units', () => {
    expect(distanceToMeters(1, 'light-second', 'pl7plus')).toBe(SPEED_OF_LIGHT_MPS);
    expect(distanceToMeters(1, 'light-hour', 'pl7plus')).toBe(SPEED_OF_LIGHT_MPS * 3600);
  });
});

describe('calculateTravel', () => {
  it('matches the PL7+ A1, 25 AU rest-to-rest benchmark', () => {
    const acceleration = accelerationRatingToMps2(1, 'pl7plus');
    const result = calculateTravel({
      distanceMeters: 25 * AU_METERS,
      accelerationMps2: acceleration,
      profile: 'rest-to-rest',
    });

    expect(result.classicalElapsedSeconds / 3600).toBeCloseTo(32.23157, 4);
    expect(result.externalElapsedSeconds / 3600).toBeCloseTo(32.41732, 4);
    expect(result.shipElapsedSeconds / 3600).toBeCloseTo(32.16980, 4);
    expect(result.peakFractionC * 100).toBeCloseTo(21.13784, 4);
    expect(result.peakGamma).toBeCloseTo(1.023118, 6);
    expect(result.externalBurnSeconds).toBe(result.externalElapsedSeconds);
    expect(result.coastDistanceMeters).toBe(0);
  });

  it('takes half as many acceleration phases for a flyby', () => {
    const acceleration = STANDARD_GRAVITY_MPS2;
    const stopped = calculateTravel({
      distanceMeters: AU_METERS,
      accelerationMps2: acceleration,
      profile: 'rest-to-rest',
    });
    const flyby = calculateTravel({
      distanceMeters: AU_METERS,
      accelerationMps2: acceleration,
      profile: 'flyby',
    });

    expect(flyby.externalElapsedSeconds).toBeLessThan(stopped.externalElapsedSeconds);
    expect(flyby.peakSpeedMps).toBeGreaterThan(stopped.peakSpeedMps);
  });

  it('accelerates, coasts, and brakes when a cruise cap is reached', () => {
    const speedCap = SPEED_OF_LIGHT_MPS * 0.0001;
    const result = calculateTravel({
      distanceMeters: AU_METERS,
      accelerationMps2: STANDARD_GRAVITY_MPS2,
      profile: 'rest-to-rest',
      speedCapMps: speedCap,
    });

    expect(result.speedCapReached).toBe(true);
    expect(result.peakSpeedMps).toBeCloseTo(speedCap, 2);
    expect(result.coastDistanceMeters).toBeGreaterThan(0);
    expect(result.externalCoastSeconds).toBeGreaterThan(0);
    expect(result.externalBurnSeconds).toBeLessThan(result.externalElapsedSeconds);
  });

  it('ignores a cap above the naturally reached peak speed', () => {
    const result = calculateTravel({
      distanceMeters: 1_000_000,
      accelerationMps2: STANDARD_GRAVITY_MPS2,
      profile: 'rest-to-rest',
      speedCapMps: SPEED_OF_LIGHT_MPS * 0.5,
    });
    expect(result.speedCapReached).toBe(false);
    expect(result.coastDistanceMeters).toBe(0);
  });

  it('rejects non-positive distance and acceleration', () => {
    expect(() => calculateTravel({
      distanceMeters: 0,
      accelerationMps2: 1,
      profile: 'rest-to-rest',
    })).toThrow('Distance must be greater than zero');
    expect(() => calculateTravel({
      distanceMeters: 1,
      accelerationMps2: 0,
      profile: 'rest-to-rest',
    })).toThrow('Acceleration must be greater than zero');
  });
});

describe('crew acceleration effects', () => {
  it('classifies normal gravity as G2', () => {
    expect(getCrewAccelerationEffects(1).graphBand).toBe('G2');
  });

  it('uses the Warships 10-25 G effects', () => {
    const effects = getCrewAccelerationEffects(17);
    expect(effects.protected).toContain('No penalty');
    expect(effects.unprotected).toContain('No actions');
  });

  it('marks acceleration over 90 G as fatal without compensation', () => {
    const effects = getCrewAccelerationEffects(100);
    expect(effects.protected).toContain('Fatal');
    expect(effects.unprotected).toContain('Fatal');
  });
});
