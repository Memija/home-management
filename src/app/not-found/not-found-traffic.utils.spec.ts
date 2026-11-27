import { describe, expect, it } from 'vitest';
import { AerialCar } from './not-found-scene.models';
import { buildAerialCars, getCarTransformsAtTime } from './not-found-traffic.utils';

describe('not-found-traffic.utils', () => {
  it('should build 10 cars across all 4 variants with populated uniform waypoints', () => {
    const cars = buildAerialCars();
    expect(cars).toHaveLength(10);

    const variants = new Set(cars.map((c) => c.variant));
    expect(variants).toEqual(new Set(['sedan-red', 'suv-white', 'coupe-blue', 'camper-sage']));

    for (const car of cars) {
      expect(car.waypoints.length).toBeGreaterThan(50);
      expect(car.durationSec).toBeGreaterThan(0);
    }
  });

  it('should interpolate position and normalize +/-180 degree angle wrap-around smoothly', () => {
    const syntheticCar: AerialCar = {
      id: 0,
      variant: 'sedan-red',
      durationSec: 10,
      initialOffsetSec: 0,
      waypoints: [
        { x: 0, y: 0, angle: 170 },
        { x: 100, y: 0, angle: -170 },
      ],
    };

    // Midpoint (t = 5s -> progress = 0.5): shortest angular delta from 170 to -170 is +20 -> 180 deg
    const [midTransform] = getCarTransformsAtTime([syntheticCar], 5);
    expect(midTransform).toBe('translate(50.0, 0.0) rotate(180.0)');

    // Reverse wrap (-170 to 170 -> delta -20 -> -180 deg)
    const reverseCar: AerialCar = {
      ...syntheticCar,
      waypoints: [
        { x: 0, y: 10, angle: -170 },
        { x: 100, y: 10, angle: 170 },
      ],
    };
    const [revTransform] = getCarTransformsAtTime([reverseCar], 5);
    expect(revTransform).toBe('translate(50.0, 10.0) rotate(-180.0)');
  });
});
