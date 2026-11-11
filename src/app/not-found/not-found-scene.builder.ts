export interface AerialTree {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  readonly rotation: number;
  readonly variant: 'pine' | 'spruce' | 'oak' | 'birch';
  readonly transform: string;
}

export interface AerialHouse {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly rotation: number;
  readonly variant: 'gable-terracotta' | 'hip-slate' | 'l-villa' | 'cabin-wood';
  readonly transform: string;
  readonly drivewayPath: string;
}

export interface AerialDock {
  readonly x: number;
  readonly y: number;
  readonly rotation: number;
  readonly transform: string;
}

export interface AerialBridge {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly rotation: number;
  readonly transform: string;
}

export interface CarWaypoint {
  readonly x: number;
  readonly y: number;
  readonly angle: number;
}

export interface AerialCar {
  readonly id: number;
  readonly variant: 'sedan-red' | 'suv-white' | 'coupe-blue' | 'camper-sage';
  readonly waypoints: readonly CarWaypoint[];
  readonly durationSec: number;
  readonly initialOffsetSec: number;
}

export interface AerialSceneData {
  readonly roadNetworkPath: string;
  readonly trees: readonly AerialTree[];
  readonly houses: readonly AerialHouse[];
  readonly docks: readonly AerialDock[];
  readonly bridges: readonly AerialBridge[];
  readonly cars: readonly AerialCar[];
}

/** Distance from point (px, py) to segment (x1, y1)-(x2, y2) */
function distToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/** Smooth northern scenic highway Y coordinate at X */
function getNorthRoadY(x: number): number {
  return 74 + 18 * Math.cos(((x - 995) * Math.PI) / 390) + 6 * Math.sin(x * 0.0025);
}

/** Smooth southern scenic highway Y coordinate at X */
function getSouthRoadY(x: number): number {
  return 684 - 24 * Math.cos(((x - 980) * Math.PI) / 360) + 10 * Math.cos(x * 0.0022);
}

/** Smooth western connector road X coordinate at Y */
function getWestRoadX(y: number): number {
  const y0 = getNorthRoadY(252);
  const y1 = getSouthRoadY(252);
  const t = Math.max(0, Math.min(1, (y - y0) / (y1 - y0)));
  return 252 - 22 * Math.sin(t * Math.PI);
}

/** Smooth eastern connector road X coordinate at Y */
function getEastRoadX(y: number): number {
  const y0 = getNorthRoadY(1684);
  const y1 = getSouthRoadY(1684);
  const t = Math.max(0, Math.min(1, (y - y0) / (y1 - y0)));
  return 1684 + 22 * Math.sin(t * Math.PI);
}

/** Builds smooth SVG path data for the scenic highway network with curved junctions */
function buildRoadNetworkPath(): string {
  const parts: string[] = [];

  for (let x = -40; x <= 1960; x += 40) {
    parts.push(`${x === -40 ? 'M' : 'L'} ${x},${getNorthRoadY(x).toFixed(1)}`);
  }
  for (let x = -40; x <= 1960; x += 40) {
    parts.push(`${x === -40 ? 'M' : 'L'} ${x},${getSouthRoadY(x).toFixed(1)}`);
  }

  const westTopY = getNorthRoadY(252);
  const westBotY = getSouthRoadY(252);
  const westStartY = westTopY + 38;
  const westEndY = westBotY - 38;
  parts.push(
    `M 205,${getNorthRoadY(205).toFixed(1)} Q 248,${westTopY.toFixed(1)} ${getWestRoadX(westStartY).toFixed(1)},${westStartY.toFixed(1)}`,
    `M 298,${getNorthRoadY(298).toFixed(1)} Q 254,${westTopY.toFixed(1)} ${getWestRoadX(westStartY).toFixed(1)},${westStartY.toFixed(1)}`,
  );
  for (let y = westStartY; y <= westEndY; y += 28) {
    parts.push(`L ${getWestRoadX(y).toFixed(1)},${y.toFixed(1)}`);
  }
  parts.push(
    `L ${getWestRoadX(westEndY).toFixed(1)},${westEndY.toFixed(1)}`,
    `M ${getWestRoadX(westEndY).toFixed(1)},${westEndY.toFixed(1)} Q 248,${westBotY.toFixed(1)} 205,${getSouthRoadY(205).toFixed(1)}`,
    `M ${getWestRoadX(westEndY).toFixed(1)},${westEndY.toFixed(1)} Q 254,${westBotY.toFixed(1)} 298,${getSouthRoadY(298).toFixed(1)}`,
  );

  const eastTopY = getNorthRoadY(1684);
  const eastBotY = getSouthRoadY(1684);
  const eastStartY = eastTopY + 38;
  const eastEndY = eastBotY - 38;
  parts.push(
    `M 1638,${getNorthRoadY(1638).toFixed(1)} Q 1682,${eastTopY.toFixed(1)} ${getEastRoadX(eastStartY).toFixed(1)},${eastStartY.toFixed(1)}`,
    `M 1730,${getNorthRoadY(1730).toFixed(1)} Q 1688,${eastTopY.toFixed(1)} ${getEastRoadX(eastStartY).toFixed(1)},${eastStartY.toFixed(1)}`,
  );
  for (let y = eastStartY; y <= eastEndY; y += 28) {
    parts.push(`L ${getEastRoadX(y).toFixed(1)},${y.toFixed(1)}`);
  }
  parts.push(
    `L ${getEastRoadX(eastEndY).toFixed(1)},${eastEndY.toFixed(1)}`,
    `M ${getEastRoadX(eastEndY).toFixed(1)},${eastEndY.toFixed(1)} Q 1682,${eastBotY.toFixed(1)} 1638,${getSouthRoadY(1638).toFixed(1)}`,
    `M ${getEastRoadX(eastEndY).toFixed(1)},${eastEndY.toFixed(1)} Q 1688,${eastBotY.toFixed(1)} 1730,${getSouthRoadY(1730).toFixed(1)}`,
  );

  return parts.join(' ');
}

/** Resamples a polyline at uniform arc-length intervals and computes smooth tangent angles */
function buildUniformWaypoints(
  rawPoints: readonly { x: number; y: number }[],
  closedLoop: boolean,
): readonly CarWaypoint[] {
  const pts = closedLoop ? [...rawPoints, rawPoints[0]] : rawPoints;
  const sampled: { x: number; y: number }[] = [pts[0]];
  const step = 8;

  for (let i = 1; i < pts.length; i++) {
    const prev = sampled[sampled.length - 1];
    const curr = pts[i];
    const dist = Math.hypot(curr.x - prev.x, curr.y - prev.y);
    if (dist >= step) {
      const count = Math.floor(dist / step);
      for (let k = 1; k <= count; k++) {
        const f = (k * step) / dist;
        sampled.push({ x: prev.x + (curr.x - prev.x) * f, y: prev.y + (curr.y - prev.y) * f });
      }
    }
  }

  const n = sampled.length;
  return sampled.map((pt, i) => {
    const prevIdx = closedLoop ? (i - 1 + n) % n : Math.max(0, i - 1);
    const nextIdx = closedLoop ? (i + 1) % n : Math.min(n - 1, i + 1);
    const dx = sampled[nextIdx].x - sampled[prevIdx].x;
    const dy = sampled[nextIdx].y - sampled[prevIdx].y;
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    return { x: pt.x, y: pt.y, angle };
  });
}

/** Samples quadratic Bezier points between p0 and p2 with control point p1 */
function pushQuadCurve(
  out: { x: number; y: number }[],
  x0: number,
  y0: number,
  cx: number,
  cy: number,
  x2: number,
  y2: number,
): void {
  for (let i = 1; i <= 8; i++) {
    const t = i / 8;
    const mt = 1 - t;
    out.push({
      x: mt * mt * x0 + 2 * mt * t * cx + t * t * x2,
      y: mt * mt * y0 + 2 * mt * t * cy + t * t * y2,
    });
  }
}

/** Builds arc-length-uniform waypoint tracks for all 4 valley traffic routes */
function buildTrafficTracks(): readonly (readonly CarWaypoint[])[] {
  const lane = 3.8;
  const westTopY = getNorthRoadY(252);
  const westBotY = getSouthRoadY(252);
  const westStartY = westTopY + 38;
  const westEndY = westBotY - 38;
  const eastTopY = getNorthRoadY(1684);
  const eastBotY = getSouthRoadY(1684);
  const eastStartY = eastTopY + 38;
  const eastEndY = eastBotY - 38;

  // 1. Clockwise scenic loop (inner lane)
  const cw: { x: number; y: number }[] = [];
  for (let x = 298; x <= 1638; x += 24) {
    cw.push({ x, y: getNorthRoadY(x) + lane });
  }
  pushQuadCurve(
    cw,
    1638,
    getNorthRoadY(1638) + lane,
    1682 - lane,
    eastTopY + lane,
    getEastRoadX(eastStartY) - lane,
    eastStartY,
  );
  for (let y = eastStartY + 20; y <= eastEndY; y += 20) {
    cw.push({ x: getEastRoadX(y) - lane, y });
  }
  pushQuadCurve(
    cw,
    getEastRoadX(eastEndY) - lane,
    eastEndY,
    1682 - lane,
    eastBotY - lane,
    1638,
    getSouthRoadY(1638) - lane,
  );
  for (let x = 1638 - 24; x >= 298; x -= 24) {
    cw.push({ x, y: getSouthRoadY(x) - lane });
  }
  pushQuadCurve(
    cw,
    298,
    getSouthRoadY(298) - lane,
    254 + lane,
    westBotY - lane,
    getWestRoadX(westEndY) + lane,
    westEndY,
  );
  for (let y = westEndY - 20; y >= westStartY; y -= 20) {
    cw.push({ x: getWestRoadX(y) + lane, y });
  }
  pushQuadCurve(
    cw,
    getWestRoadX(westStartY) + lane,
    westStartY,
    254 + lane,
    westTopY + lane,
    298,
    getNorthRoadY(298) + lane,
  );

  // 2. Counter-clockwise scenic loop (outer lane)
  const ccw: { x: number; y: number }[] = [];
  for (let x = 1638; x >= 298; x -= 24) {
    ccw.push({ x, y: getNorthRoadY(x) - lane });
  }
  pushQuadCurve(
    ccw,
    298,
    getNorthRoadY(298) - lane,
    254 - lane,
    westTopY - lane,
    getWestRoadX(westStartY) - lane,
    westStartY,
  );
  for (let y = westStartY + 20; y <= westEndY; y += 20) {
    ccw.push({ x: getWestRoadX(y) - lane, y });
  }
  pushQuadCurve(
    ccw,
    getWestRoadX(westEndY) - lane,
    westEndY,
    254 - lane,
    westBotY + lane,
    298,
    getSouthRoadY(298) + lane,
  );
  for (let x = 298 + 24; x <= 1638; x += 24) {
    ccw.push({ x, y: getSouthRoadY(x) + lane });
  }
  pushQuadCurve(
    ccw,
    1638,
    getSouthRoadY(1638) + lane,
    1682 + lane,
    eastBotY + lane,
    getEastRoadX(eastEndY) + lane,
    eastEndY,
  );
  for (let y = eastEndY - 20; y >= eastStartY; y -= 20) {
    ccw.push({ x: getEastRoadX(y) + lane, y });
  }
  pushQuadCurve(
    ccw,
    getEastRoadX(eastStartY) + lane,
    eastStartY,
    1682 + lane,
    eastTopY - lane,
    1638,
    getNorthRoadY(1638) - lane,
  );

  // 3. North highway eastbound through-traffic
  const northEast: { x: number; y: number }[] = [];
  for (let x = -40; x <= 1960; x += 20) {
    northEast.push({ x, y: getNorthRoadY(x) + lane });
  }

  // 4. South highway westbound through-traffic
  const southWest: { x: number; y: number }[] = [];
  for (let x = 1960; x >= -40; x -= 20) {
    southWest.push({ x, y: getSouthRoadY(x) - lane });
  }

  return [
    buildUniformWaypoints(cw, true),
    buildUniformWaypoints(ccw, true),
    buildUniformWaypoints(northEast, false),
    buildUniformWaypoints(southWest, false),
  ];
}

/** Evaluates SVG `translate(x, y) rotate(angle)` strings for all cars at `timeSec` */
export function getCarTransformsAtTime(
  cars: readonly AerialCar[],
  timeSec: number,
): readonly string[] {
  return cars.map((car) => {
    const pts = car.waypoints;
    const n = pts.length;
    const elapsed = (timeSec + car.initialOffsetSec) / car.durationSec;
    const progress = elapsed - Math.floor(elapsed);
    const exactIdx = progress * (n - 1);
    const i0 = Math.floor(exactIdx);
    const i1 = Math.min(n - 1, i0 + 1);
    const f = exactIdx - i0;

    const p0 = pts[i0];
    const p1 = pts[i1];
    const x = p0.x + (p1.x - p0.x) * f;
    const y = p0.y + (p1.y - p0.y) * f;

    let dAngle = p1.angle - p0.angle;
    if (dAngle > 180) dAngle -= 360;
    if (dAngle < -180) dAngle += 360;
    const angle = p0.angle + dAngle * f;

    return `translate(${x.toFixed(1)}, ${y.toFixed(1)}) rotate(${angle.toFixed(1)})`;
  });
}

/** Distance from (px, py) to any of the '4-0-4' lake water channels or feeder rivers */
function distanceToLakeWater(px: number, py: number): number {
  const left4 = Math.min(
    distToSegment(px, py, 635, 150, 635, 575),
    distToSegment(px, py, 355, 430, 725, 430),
    distToSegment(px, py, 635, 150, 355, 430),
  );

  const right4 = Math.min(
    distToSegment(px, py, 1415, 150, 1415, 575),
    distToSegment(px, py, 1135, 430, 1505, 430),
    distToSegment(px, py, 1415, 150, 1135, 430),
  );

  const normX = (px - 960) / 125;
  const normY = (py - 365) / 195;
  const center0 = Math.abs(Math.hypot(normX, normY) - 1) * 145;

  const rivers = Math.min(
    distToSegment(px, py, -40, 295, 231, 348),
    distToSegment(px, py, 231, 348, 355, 430),
    distToSegment(px, py, 725, 430, 835, 410),
    distToSegment(px, py, 1085, 410, 1135, 430),
    distToSegment(px, py, 1505, 430, 1703, 468),
    distToSegment(px, py, 1703, 468, 1960, 535),
  );

  return Math.min(left4, right4, center0, Math.max(0, rivers + 14));
}

/** Minimum distance from (px, py) to the scenic road network */
function distanceToRoads(px: number, py: number): number {
  const northDist = Math.abs(py - getNorthRoadY(px));
  const southDist = Math.abs(py - getSouthRoadY(px));
  const inWestSpan = py >= getNorthRoadY(252) - 15 && py <= getSouthRoadY(252) + 15;
  const westDist = inWestSpan ? Math.abs(px - getWestRoadX(py)) : 999;
  const inEastSpan = py >= getNorthRoadY(1684) - 15 && py <= getSouthRoadY(1684) + 15;
  const eastDist = inEastSpan ? Math.abs(px - getEastRoadX(py)) : 999;
  return Math.min(northDist, southDist, westDist, eastDist);
}

let cachedScene: AerialSceneData | null = null;

/**
 * Deterministically builds the realistic aerial forest, lakeside village houses,
 * smooth highway network, wooden docks, bridges, and animated cars around the '404' lakes.
 */
export function buildAerialScene(): AerialSceneData {
  if (cachedScene) {
    return cachedScene;
  }

  let seed = 90404;
  const rand = (): number => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const roadNetworkPath = buildRoadNetworkPath();
  const [cwTrack, ccwTrack, northEastTrack, southWestTrack] = buildTrafficTracks();

  const cars: AerialCar[] = [
    { id: 0, variant: 'sedan-red', waypoints: cwTrack, durationSec: 36, initialOffsetSec: 3 },
    { id: 1, variant: 'suv-white', waypoints: cwTrack, durationSec: 40, initialOffsetSec: 17 },
    { id: 2, variant: 'coupe-blue', waypoints: cwTrack, durationSec: 34, initialOffsetSec: 27 },
    { id: 3, variant: 'camper-sage', waypoints: ccwTrack, durationSec: 42, initialOffsetSec: 6 },
    { id: 4, variant: 'sedan-red', waypoints: ccwTrack, durationSec: 38, initialOffsetSec: 21 },
    { id: 5, variant: 'suv-white', waypoints: ccwTrack, durationSec: 40, initialOffsetSec: 32 },
    {
      id: 6,
      variant: 'coupe-blue',
      waypoints: northEastTrack,
      durationSec: 20,
      initialOffsetSec: 4,
    },
    {
      id: 7,
      variant: 'camper-sage',
      waypoints: northEastTrack,
      durationSec: 24,
      initialOffsetSec: 15,
    },
    {
      id: 8,
      variant: 'sedan-red',
      waypoints: southWestTrack,
      durationSec: 21,
      initialOffsetSec: 8,
    },
    {
      id: 9,
      variant: 'suv-white',
      waypoints: southWestTrack,
      durationSec: 25,
      initialOffsetSec: 19,
    },
  ];

  const houses: AerialHouse[] = [];
  const houseVariants: readonly AerialHouse['variant'][] = [
    'gable-terracotta',
    'hip-slate',
    'l-villa',
    'cabin-wood',
  ];

  const houseSpots: readonly {
    x: number;
    y: number;
    rot: number;
    connectTo: 'north' | 'south' | 'west' | 'east' | 'none';
  }[] = [
    { x: 355, y: 165, rot: -12, connectTo: 'north' },
    { x: 475, y: 152, rot: 8, connectTo: 'north' },
    { x: 765, y: 162, rot: -6, connectTo: 'north' },
    { x: 1145, y: 165, rot: 14, connectTo: 'north' },
    { x: 1245, y: 152, rot: -10, connectTo: 'north' },
    { x: 1545, y: 164, rot: 18, connectTo: 'north' },
    { x: 312, y: 265, rot: 16, connectTo: 'west' },
    { x: 345, y: 545, rot: -15, connectTo: 'south' },
    { x: 515, y: 565, rot: 6, connectTo: 'south' },
    { x: 745, y: 562, rot: -14, connectTo: 'south' },
    { x: 1125, y: 558, rot: 12, connectTo: 'south' },
    { x: 1285, y: 568, rot: -8, connectTo: 'south' },
    { x: 1555, y: 555, rot: 15, connectTo: 'south' },
    { x: 1595, y: 315, rot: -18, connectTo: 'east' },
    { x: 960, y: 365, rot: 4, connectTo: 'none' },
    { x: 148, y: 475, rot: 12, connectTo: 'west' },
    { x: 1785, y: 385, rot: -14, connectTo: 'east' },
  ];

  houseSpots.forEach((spot, idx) => {
    const variant = houseVariants[idx % houseVariants.length];
    let drivewayPath = '';

    if (spot.connectTo === 'north' || spot.connectTo === 'south') {
      const roadX = spot.x + (idx % 2 === 0 ? -22 : 22);
      const roadY = spot.connectTo === 'north' ? getNorthRoadY(roadX) : getSouthRoadY(roadX);
      const ctrlY = (spot.y + roadY) / 2;
      drivewayPath = `M ${spot.x},${spot.y} Q ${spot.x},${ctrlY.toFixed(1)} ${roadX},${roadY.toFixed(1)}`;
    } else if (spot.connectTo === 'west' || spot.connectTo === 'east') {
      const roadY = spot.y + (idx % 2 === 0 ? -18 : 18);
      const roadX = spot.connectTo === 'west' ? getWestRoadX(roadY) : getEastRoadX(roadY);
      const ctrlX = (spot.x + roadX) / 2;
      drivewayPath = `M ${spot.x},${spot.y} Q ${ctrlX.toFixed(1)},${spot.y} ${roadX.toFixed(1)},${roadY}`;
    }

    houses.push({
      id: idx,
      x: spot.x,
      y: spot.y,
      rotation: spot.rot,
      variant,
      transform: `translate(${spot.x}, ${spot.y}) rotate(${spot.rot})`,
      drivewayPath,
    });
  });

  const docks: AerialDock[] = [
    { x: 418, y: 368, rotation: -45, transform: 'translate(418, 368) rotate(-45)' },
    { x: 662, y: 295, rotation: 0, transform: 'translate(662, 295) rotate(0)' },
    { x: 886, y: 345, rotation: 180, transform: 'translate(886, 345) rotate(180)' },
    { x: 1034, y: 405, rotation: 0, transform: 'translate(1034, 405) rotate(0)' },
    { x: 1198, y: 368, rotation: -45, transform: 'translate(1198, 368) rotate(-45)' },
    { x: 1442, y: 285, rotation: 0, transform: 'translate(1442, 285) rotate(0)' },
  ];

  const westBridgeX = Math.round(getWestRoadX(348));
  const eastBridgeX = Math.round(getEastRoadX(468));
  const bridges: AerialBridge[] = [
    {
      id: 0,
      x: westBridgeX,
      y: 348,
      rotation: -2,
      transform: `translate(${westBridgeX}, 348) rotate(-2)`,
    },
    {
      id: 1,
      x: eastBridgeX,
      y: 468,
      rotation: 4,
      transform: `translate(${eastBridgeX}, 468) rotate(4)`,
    },
  ];

  const trees: AerialTree[] = [];
  const treeVariants: readonly AerialTree['variant'][] = ['pine', 'spruce', 'oak', 'birch'];
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
      const variant = treeVariants[Math.floor(rand() * treeVariants.length)];

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

  const islandTrees: readonly {
    x: number;
    y: number;
    scale: number;
    rot: number;
    variant: AerialTree['variant'];
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

  for (const it of islandTrees) {
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

  trees.sort((a, b) => a.y - b.y);

  cachedScene = { roadNetworkPath, trees, houses, docks, bridges, cars };
  return cachedScene;
}
