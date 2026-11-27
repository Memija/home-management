import { AerialBridge, AerialDock, AerialHouse } from './not-found-scene.models';
import { getEastRoadX, getNorthRoadY, getSouthRoadY, getWestRoadX } from './not-found-roads.utils';

interface HouseSpot {
  readonly x: number;
  readonly y: number;
  readonly rot: number;
  readonly connectTo: 'north' | 'south' | 'west' | 'east' | 'none';
}

const HOUSE_VARIANTS: readonly AerialHouse['variant'][] = [
  'gable-terracotta',
  'hip-slate',
  'l-villa',
  'cabin-wood',
];

const HOUSE_SPOTS: readonly HouseSpot[] = [
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

function computeDrivewayPath(spot: HouseSpot, idx: number): string {
  if (spot.connectTo === 'north' || spot.connectTo === 'south') {
    const roadX = spot.x + (idx % 2 === 0 ? -22 : 22);
    const roadY = spot.connectTo === 'north' ? getNorthRoadY(roadX) : getSouthRoadY(roadX);
    const ctrlY = (spot.y + roadY) / 2;
    return `M ${spot.x},${spot.y} Q ${spot.x},${ctrlY.toFixed(1)} ${roadX},${roadY.toFixed(1)}`;
  }

  if (spot.connectTo === 'west' || spot.connectTo === 'east') {
    const roadY = spot.y + (idx % 2 === 0 ? -18 : 18);
    const roadX = spot.connectTo === 'west' ? getWestRoadX(roadY) : getEastRoadX(roadY);
    const ctrlX = (spot.x + roadX) / 2;
    return `M ${spot.x},${spot.y} Q ${ctrlX.toFixed(1)},${spot.y} ${roadX.toFixed(1)},${roadY}`;
  }

  return '';
}

export function buildAerialHouses(): AerialHouse[] {
  return HOUSE_SPOTS.map((spot, idx) => ({
    id: idx,
    x: spot.x,
    y: spot.y,
    rotation: spot.rot,
    variant: HOUSE_VARIANTS[idx % HOUSE_VARIANTS.length],
    transform: `translate(${spot.x}, ${spot.y}) rotate(${spot.rot})`,
    drivewayPath: computeDrivewayPath(spot, idx),
  }));
}

export function buildAerialDocks(): AerialDock[] {
  return [
    { x: 418, y: 368, rotation: -45, transform: 'translate(418, 368) rotate(-45)' },
    { x: 662, y: 295, rotation: 0, transform: 'translate(662, 295) rotate(0)' },
    { x: 886, y: 345, rotation: 180, transform: 'translate(886, 345) rotate(180)' },
    { x: 1034, y: 405, rotation: 0, transform: 'translate(1034, 405) rotate(0)' },
    { x: 1198, y: 368, rotation: -45, transform: 'translate(1198, 368) rotate(-45)' },
    { x: 1442, y: 285, rotation: 0, transform: 'translate(1442, 285) rotate(0)' },
  ];
}

export function buildAerialBridges(): AerialBridge[] {
  const westBridgeX = Math.round(getWestRoadX(348));
  const eastBridgeX = Math.round(getEastRoadX(468));
  return [
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
}
