import { describe, expect, it } from 'vitest';
import {
  buildAerialScene,
  computeAerialViewBox,
  DEFAULT_AERIAL_VIEWBOX,
  getCarTransformsAtTime,
} from './not-found-scene.builder';

describe('not-found-scene.builder', () => {
  describe('computeAerialViewBox', () => {
    it('should return DEFAULT_AERIAL_VIEWBOX for landscape viewports', () => {
      expect(computeAerialViewBox(1920, 1080)).toBe(DEFAULT_AERIAL_VIEWBOX);
      expect(computeAerialViewBox(1280, 720)).toBe(DEFAULT_AERIAL_VIEWBOX);
      expect(computeAerialViewBox(844, 390)).toBe(DEFAULT_AERIAL_VIEWBOX);
    });

    it('should return DEFAULT_AERIAL_VIEWBOX for zero, negative, or non-finite dimensions', () => {
      expect(computeAerialViewBox(0, 844)).toBe(DEFAULT_AERIAL_VIEWBOX);
      expect(computeAerialViewBox(390, 0)).toBe(DEFAULT_AERIAL_VIEWBOX);
      expect(computeAerialViewBox(-390, 844)).toBe(DEFAULT_AERIAL_VIEWBOX);
      expect(computeAerialViewBox(Number.NaN, 844)).toBe(DEFAULT_AERIAL_VIEWBOX);
      expect(computeAerialViewBox(390, Number.POSITIVE_INFINITY)).toBe(DEFAULT_AERIAL_VIEWBOX);
    });

    it('should compute an aspect-matched portrait viewBox framing X=200..1720 for portrait and square viewports', () => {
      const mobileBox = computeAerialViewBox(390, 844);
      const [minX, minY, width, height] = mobileBox.split(' ').map(Number);

      expect(minX).toBe(200);
      expect(width).toBe(1520);
      expect(height).toBe(Math.round(1520 * (844 / 390)));
      expect(minY).toBe(Math.round(365 - height * 0.34));

      const squareBox = computeAerialViewBox(800, 800);
      expect(squareBox).toBe(`200 ${Math.round(365 - 1520 * 0.34)} 1520 1520`);
    });
  });

  describe('buildAerialScene', () => {
    it('should assemble road network, houses, docks, bridges, cars, and Y-sorted forest trees', () => {
      const scene = buildAerialScene();

      expect(scene.roadNetworkPath.length).toBeGreaterThan(500);
      expect(scene.houses).toHaveLength(17);
      expect(scene.docks).toHaveLength(6);
      expect(scene.bridges).toHaveLength(2);
      expect(scene.cars).toHaveLength(10);
      expect(scene.trees.length).toBeGreaterThan(500);

      for (let i = 1; i < scene.trees.length; i++) {
        expect(scene.trees[i].y).toBeGreaterThanOrEqual(scene.trees[i - 1].y);
      }
    });

    it('should memoize and return the identical scene reference on subsequent calls', () => {
      const first = buildAerialScene();
      const second = buildAerialScene();
      expect(second).toBe(first);
    });

    it('should re-export getCarTransformsAtTime for scene cars', () => {
      const scene = buildAerialScene();
      const transforms = getCarTransformsAtTime(scene.cars, 2.5);
      expect(transforms).toHaveLength(scene.cars.length);
      expect(transforms[0]).toMatch(/^translate\([-\d.]+, [-\d.]+\) rotate\([-\d.]+\)$/);
    });
  });
});
