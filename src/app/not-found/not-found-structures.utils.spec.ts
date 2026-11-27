import { describe, expect, it } from 'vitest';
import { getEastRoadX, getWestRoadX } from './not-found-roads.utils';
import {
  buildAerialBridges,
  buildAerialDocks,
  buildAerialHouses,
} from './not-found-structures.utils';

describe('not-found-structures.utils', () => {
  it('should build 17 houses with curved driveways for road-connected lots and none for the center island house', () => {
    const houses = buildAerialHouses();
    expect(houses).toHaveLength(17);

    const islandHouse = houses.find((h) => h.x === 960 && h.y === 365);
    expect(islandHouse).toBeDefined();
    expect(islandHouse?.drivewayPath).toBe('');

    const connectedHouses = houses.filter((h) => h !== islandHouse);
    for (const house of connectedHouses) {
      expect(house.drivewayPath).toMatch(/^M \d+,\d+ Q /);
      expect(house.transform).toContain(`translate(${house.x}, ${house.y})`);
    }
  });

  it('should build 6 lakeside wooden docks', () => {
    const docks = buildAerialDocks();
    expect(docks).toHaveLength(6);
    for (const dock of docks) {
      expect(dock.transform).toBe(`translate(${dock.x}, ${dock.y}) rotate(${dock.rotation})`);
    }
  });

  it('should align the 2 highway bridges with the West and East connector roads', () => {
    const bridges = buildAerialBridges();
    expect(bridges).toHaveLength(2);
    expect(bridges[0].x).toBe(Math.round(getWestRoadX(348)));
    expect(bridges[1].x).toBe(Math.round(getEastRoadX(468)));
  });
});
