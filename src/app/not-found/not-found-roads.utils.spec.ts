import { describe, expect, it } from 'vitest';
import {
  buildRoadNetworkPath,
  distanceToLakeWater,
  distanceToRoads,
  getEastRoadX,
  getNorthRoadY,
  getSouthRoadY,
  getWestRoadX,
} from './not-found-roads.utils';

describe('not-found-roads.utils', () => {
  it('should compute smooth road coordinates within valley bounds', () => {
    expect(getNorthRoadY(960)).toBeGreaterThan(40);
    expect(getNorthRoadY(960)).toBeLessThan(110);

    expect(getSouthRoadY(960)).toBeGreaterThan(640);
    expect(getSouthRoadY(960)).toBeLessThan(720);

    expect(getWestRoadX(350)).toBeGreaterThan(220);
    expect(getWestRoadX(350)).toBeLessThan(260);

    expect(getEastRoadX(450)).toBeGreaterThan(1680);
    expect(getEastRoadX(450)).toBeLessThan(1720);
  });

  it('should build a continuous SVG path with move, line, and quadratic junction commands', () => {
    const path = buildRoadNetworkPath();
    expect(path).toContain('M -40,');
    expect(path).toContain('Q 248,');
    expect(path).toContain('Q 1682,');
    expect(path.length).toBeGreaterThan(500);
  });

  it('should return near-zero distance directly on the 4-0-4 lake channels and positive distance far away', () => {
    // Directly on left '4' vertical stem (x=635, y=300)
    expect(distanceToLakeWater(635, 300)).toBeCloseTo(0, 5);
    // Directly on right '4' horizontal bar (x=1300, y=430)
    expect(distanceToLakeWater(1300, 430)).toBeCloseTo(0, 5);
    // On center '0' ellipse top (x=960, y=170)
    expect(distanceToLakeWater(960, 170)).toBeCloseTo(0, 5);
    // Far corner in upland forest
    expect(distanceToLakeWater(100, 100)).toBeGreaterThan(150);
  });

  it('should return zero distance directly on roads and large distance away from roads', () => {
    const northY = getNorthRoadY(800);
    expect(distanceToRoads(800, northY)).toBeCloseTo(0, 5);

    const westX = getWestRoadX(350);
    expect(distanceToRoads(westX, 350)).toBeCloseTo(0, 5);

    expect(distanceToRoads(960, 365)).toBeGreaterThan(200);
  });
});
