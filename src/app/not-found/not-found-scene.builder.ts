import { AerialSceneData } from './not-found-scene.models';
import { buildRoadNetworkPath } from './not-found-roads.utils';
import { buildAerialCars, getCarTransformsAtTime } from './not-found-traffic.utils';
import {
  buildAerialBridges,
  buildAerialDocks,
  buildAerialHouses,
} from './not-found-structures.utils';
import { buildAerialForest } from './not-found-forest.utils';

export type {
  AerialBridge,
  AerialCar,
  AerialDock,
  AerialHouse,
  AerialSceneData,
  AerialTree,
  CarWaypoint,
} from './not-found-scene.models';
export { getCarTransformsAtTime };

export const DEFAULT_AERIAL_VIEWBOX = '0 0 1920 1080';

/**
 * Computes an aspect-aware SVG viewBox so portrait mobile/tablet screens frame the entire
 * '4-0-4' lake chain and both highway bridges in the upper-middle viewport above the HUD card,
 * while landscape and desktop screens keep the standard 1920x1080 widescreen framing.
 */
export function computeAerialViewBox(viewportWidth: number, viewportHeight: number): string {
  if (
    !Number.isFinite(viewportWidth) ||
    !Number.isFinite(viewportHeight) ||
    viewportWidth <= 0 ||
    viewportHeight <= 0 ||
    viewportWidth > viewportHeight
  ) {
    return DEFAULT_AERIAL_VIEWBOX;
  }

  const vbWidth = 1520;
  const minX = 960 - vbWidth / 2; // 200..1720 covers both '4' lakes and West/East bridges
  const vbHeight = Math.max(vbWidth, Math.round(vbWidth * (viewportHeight / viewportWidth)));
  const minY = Math.round(365 - vbHeight * 0.34);

  return `${minX} ${minY} ${vbWidth} ${vbHeight}`;
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
  const cars = buildAerialCars();
  const houses = buildAerialHouses();
  const docks = buildAerialDocks();
  const bridges = buildAerialBridges();
  const trees = buildAerialForest(rand, houses);

  cachedScene = { roadNetworkPath, trees, houses, docks, bridges, cars };
  return cachedScene;
}
