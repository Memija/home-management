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
