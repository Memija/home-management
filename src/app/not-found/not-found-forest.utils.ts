import { AerialHouse, AerialTree } from './not-found-scene.models';
import { distanceToLakeWater, distanceToRoads } from './not-found-roads.utils';

const TREE_VARIANTS: readonly AerialTree['variant'][] = ['pine', 'spruce', 'oak', 'birch'];

const ISLAND_TREES: readonly {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  readonly rot: number;
  readonly variant: AerialTree['variant'];
}[] = [
  { x: 556, y: 318, scale: 0.78, rot: 40, variant: 'pine' },
  { x: 525, y: 356, scale: 0.82, rot: 115, variant: 'spruce' },
  { x: 568, y: 362, scale: 0.8, rot: 25, variant: 'oak' },
  { x: 952, y: 282, scale: 1.05, rot: 15, variant: 'pine' },
  { x: 974, y: 312, scale: 0.92, rot: 110, variant: 'oak' },
  { x: 938, y: 332, scale: 0.88, rot: 210, variant: 'spruce' },
  { x: 946, y: 412, scale: 0.96, rot: 45, variant: 'pine' },
  { x: 972, y: 432, scale: 0.86, rot: 175, variant: 'birch' },
  { x: 1336, y: 318, scale: 0.78, rot: 195, variant: 'spruce' },
  { x: 1305, y: 356, scale: 0.82, rot: 250, variant: 'pine' },
  { x: 1348, y: 362, scale: 0.8, rot: 65, variant: 'oak' },
];

function appendPortraitForestBands(trees: AerialTree[], rand: () => number, startId: number): void {
  let nextId = startId;
  const bandRanges: readonly [number, number][] = [
    [-920, -20],
    [1090, 2520],
  ];
  const bandCols = 22;
  const bandMinX = 160;
  const bandSpanX = 1600;

  for (const [yStart, yEnd] of bandRanges) {
    for (let baseY = yStart; baseY <= yEnd; baseY += 72) {
      for (let c = 0; c < bandCols; c++) {
        const x = Math.round(bandMinX + ((c + 0.15 + rand() * 0.7) * bandSpanX) / bandCols);
        const y = Math.round(baseY + (rand() - 0.5) * 44);
        if (Math.sin(x * 0.011) * Math.cos(y * 0.011) > 0.58) continue;

        const scale = Number((0.82 + rand() * 0.64).toFixed(2));
        const rotation = Math.round(rand() * 360);
        const variant = TREE_VARIANTS[Math.floor(rand() * TREE_VARIANTS.length)];
        trees.push({
          id: nextId++,
          x,
          y,
          scale,
          rotation,
          variant,
          transform: `translate(${x}, ${y}) rotate(${rotation}) scale(${scale})`,
        });
      }
    }
  }
}

export function buildAerialForest(
  rand: () => number,
  houses: readonly AerialHouse[],
): AerialTree[] {
  const trees: AerialTree[] = [];
  const cols = 34;
  const rows = 19;
  const cellW = 1920 / cols;
  const cellH = 1080 / rows;
  let treeId = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = Math.round((c + 0.15 + rand() * 0.7) * cellW);
      const y = Math.round((r + 0.15 + rand() * 0.7) * cellH);

      const waterDist = distanceToLakeWater(x, y);
      const roadDist = distanceToRoads(x, y);
      if (waterDist < 54 || roadDist < 36) continue;
      if (houses.some((h) => Math.hypot(x - h.x, y - h.y) < 46)) continue;

      const clearingNoise = Math.sin(x * 0.012) * Math.cos(y * 0.012);
      if (clearingNoise > 0.62 && waterDist > 110) continue;

      const scale = Number((0.72 + rand() * 0.62).toFixed(2));
      const rotation = Math.round(rand() * 360);
      const variant = TREE_VARIANTS[Math.floor(rand() * TREE_VARIANTS.length)];

      trees.push({
        id: treeId++,
        x,
        y,
        scale,
        rotation,
        variant,
        transform: `translate(${x}, ${y}) rotate(${rotation}) scale(${scale})`,
      });
    }
  }

  for (const it of ISLAND_TREES) {
    trees.push({
      id: treeId++,
      x: it.x,
      y: it.y,
      scale: it.scale,
      rotation: it.rot,
      variant: it.variant,
      transform: `translate(${it.x}, ${it.y}) rotate(${it.rot}) scale(${it.scale})`,
    });
  }

  appendPortraitForestBands(trees, rand, treeId);
  trees.sort((a, b) => a.y - b.y);
  return trees;
}
