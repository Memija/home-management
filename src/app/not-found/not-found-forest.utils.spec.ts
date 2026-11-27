import { describe, expect, it } from 'vitest';
import { buildAerialForest } from './not-found-forest.utils';
import { distanceToRoads } from './not-found-roads.utils';
import { buildAerialHouses } from './not-found-structures.utils';

describe('not-found-forest.utils', () => {
  const createDeterministicRand = () => {
    let seed = 90404;
    return (): number => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
  };

  it('should generate valley, island, and northern/southern portrait forest bands sorted by Y', () => {
    const houses = buildAerialHouses();
    const trees = buildAerialForest(createDeterministicRand(), houses);

    expect(trees.length).toBeGreaterThan(500);

    // Includes northern (< 0) and southern (> 1080) portrait extension trees
    expect(trees.some((t) => t.y < -100)).toBe(true);
    expect(trees.some((t) => t.y > 1200)).toBe(true);

    // Sorted back-to-front by Y coordinate
    for (let i = 1; i < trees.length; i++) {
      expect(trees[i].y).toBeGreaterThanOrEqual(trees[i - 1].y);
    }

    // Main valley grid trees (0..1080, excluding intentional island trees) keep clearance from roads & houses
    const islandCoords = new Set([
      '556,318',
      '525,356',
      '568,362',
      '952,282',
      '974,312',
      '938,332',
      '946,412',
      '972,432',
      '1336,318',
      '1305,356',
      '1348,362',
    ]);
    const valleyTrees = trees.filter(
      (t) => t.y >= 0 && t.y <= 1080 && !islandCoords.has(`${t.x},${t.y}`),
    );
    for (const tree of valleyTrees) {
      expect(distanceToRoads(tree.x, tree.y)).toBeGreaterThanOrEqual(36);
      for (const house of houses) {
        expect(Math.hypot(tree.x - house.x, tree.y - house.y)).toBeGreaterThanOrEqual(46);
      }
    }
  });
});
