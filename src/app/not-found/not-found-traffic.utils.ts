import { AerialCar, CarWaypoint } from './not-found-scene.models';
import { getEastRoadX, getNorthRoadY, getSouthRoadY, getWestRoadX } from './not-found-roads.utils';

/** Resamples a polyline at uniform arc-length intervals and computes smooth tangent angles */
function buildUniformWaypoints(
  rawPoints: readonly { x: number; y: number }[],
  closedLoop: boolean,
): readonly CarWaypoint[] {
  const pts = closedLoop ? [...rawPoints, rawPoints[0]] : rawPoints;
  const sampled: { x: number; y: number }[] = [pts[0]];
  const step = 8;

  for (let i = 1; i < pts.length; i++) {
    const prev = sampled.at(-1) ?? pts[0];
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

function buildClockwiseLoop(lane: number): { x: number; y: number }[] {
  const westTopY = getNorthRoadY(252);
  const westBotY = getSouthRoadY(252);
  const westStartY = westTopY + 38;
  const westEndY = westBotY - 38;
  const eastTopY = getNorthRoadY(1684);
  const eastBotY = getSouthRoadY(1684);
  const eastStartY = eastTopY + 38;
  const eastEndY = eastBotY - 38;

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
  return cw;
}

function buildCounterClockwiseLoop(lane: number): { x: number; y: number }[] {
  const westTopY = getNorthRoadY(252);
  const westBotY = getSouthRoadY(252);
  const westStartY = westTopY + 38;
  const westEndY = westBotY - 38;
  const eastTopY = getNorthRoadY(1684);
  const eastBotY = getSouthRoadY(1684);
  const eastStartY = eastTopY + 38;
  const eastEndY = eastBotY - 38;

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
  return ccw;
}

/** Builds arc-length-uniform waypoint tracks for all 4 valley traffic routes */
function buildTrafficTracks(): readonly (readonly CarWaypoint[])[] {
  const lane = 3.8;
  const northEast: { x: number; y: number }[] = [];
  for (let x = -40; x <= 1960; x += 20) {
    northEast.push({ x, y: getNorthRoadY(x) + lane });
  }

  const southWest: { x: number; y: number }[] = [];
  for (let x = 1960; x >= -40; x -= 20) {
    southWest.push({ x, y: getSouthRoadY(x) - lane });
  }

  return [
    buildUniformWaypoints(buildClockwiseLoop(lane), true),
    buildUniformWaypoints(buildCounterClockwiseLoop(lane), true),
    buildUniformWaypoints(northEast, false),
    buildUniformWaypoints(southWest, false),
  ];
}

export function buildAerialCars(): AerialCar[] {
  const [cwTrack, ccwTrack, northEastTrack, southWestTrack] = buildTrafficTracks();
  return [
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
