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
export function getNorthRoadY(x: number): number {
  return 74 + 18 * Math.cos(((x - 995) * Math.PI) / 390) + 6 * Math.sin(x * 0.0025);
}

/** Smooth southern scenic highway Y coordinate at X */
export function getSouthRoadY(x: number): number {
  return 684 - 24 * Math.cos(((x - 980) * Math.PI) / 360) + 10 * Math.cos(x * 0.0022);
}

/** Smooth western connector road X coordinate at Y */
export function getWestRoadX(y: number): number {
  const y0 = getNorthRoadY(252);
  const y1 = getSouthRoadY(252);
  const t = Math.max(0, Math.min(1, (y - y0) / (y1 - y0)));
  return 252 - 22 * Math.sin(t * Math.PI);
}

/** Smooth eastern connector road X coordinate at Y */
export function getEastRoadX(y: number): number {
  const y0 = getNorthRoadY(1684);
  const y1 = getSouthRoadY(1684);
  const t = Math.max(0, Math.min(1, (y - y0) / (y1 - y0)));
  return 1684 + 22 * Math.sin(t * Math.PI);
}

/** Builds smooth SVG path data for the scenic highway network with curved junctions */
export function buildRoadNetworkPath(): string {
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

/** Distance from (px, py) to any of the '4-0-4' lake water channels or feeder rivers */
export function distanceToLakeWater(px: number, py: number): number {
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
export function distanceToRoads(px: number, py: number): number {
  const northDist = Math.abs(py - getNorthRoadY(px));
  const southDist = Math.abs(py - getSouthRoadY(px));
  const inWestSpan = py >= getNorthRoadY(252) - 15 && py <= getSouthRoadY(252) + 15;
  const westDist = inWestSpan ? Math.abs(px - getWestRoadX(py)) : 999;
  const inEastSpan = py >= getNorthRoadY(1684) - 15 && py <= getSouthRoadY(1684) + 15;
  const eastDist = inEastSpan ? Math.abs(px - getEastRoadX(py)) : 999;
  return Math.min(northDist, southDist, westDist, eastDist);
}
