import * as THREE from "three";

export type Aabb = {
  min: [number, number, number];
  max: [number, number, number];
  debugId?: string; // optional label for debugging
};

const manualWallColliders: Aabb[] = [
  // Zone 1 - Breach wall segments (position [-15, 2, -8], size [12, 4, 0.5])
  // Wall spans x=-21 to x=-9, with breach gap at x=-17 to x=-13
  // Left segment (before breach gap)
  { 
    min: [-21, 0, -8.25], 
    max: [-17, 2.5, -7.75],
    debugId: "zone1-breach-wall-left"
  },
  // Right segment (after breach gap)
  { 
    min: [-13, 0, -8.25], 
    max: [-9, 2.5, -7.75],
    debugId: "zone1-breach-wall-right"
  },
  
  // Zone 3 - Corridor walls (critical zone transition)
  // Left corridor wall (position [20, 2, -6], size [30, 4, 0.5])
  // Adjusted to start at x=12 (door position) to allow entry from Zone 2
  { 
    min: [12, 0, -6.25], 
    max: [35, 2.5, -5.75],
    debugId: "zone3-corridor-wall-left-manual"
  },
  // Right corridor wall (position [20, 2, 6], size [30, 4, 0.5])
  // Adjusted to start at x=12 (door position) to allow entry from Zone 2
  { 
    min: [12, 0, 5.75], 
    max: [35, 2.5, 6.25],
    debugId: "zone3-corridor-wall-right-manual"
  },
];

const dynamicWallColliders: Aabb[] = [];

export function getAllWallColliders(): Aabb[] {
  return [...manualWallColliders, ...dynamicWallColliders];
}

export function registerWallColliderFromObject(object: THREE.Object3D, debugId?: string) {
  if (!object) return;

  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) return;

  const height = box.max.y - box.min.y;

  // Ignore tiny or purely overhead geometry:
  const MIN_HEIGHT = 0.5;  // too small to be a wall
  const FLOOR_BAND_TOP = 2.5; // approx player height

  // If the entire object is above the player's head, ignore it.
  if (box.min.y > FLOOR_BAND_TOP) {
    return;
  }

  // If it's extremely small vertically, also ignore (little junk props).
  if (height < MIN_HEIGHT) {
    return;
  }

  // Clamp the collider to a ground-level band so we don't get floating boxes.
  const clampedMinY = 0;
  const clampedMaxY = FLOOR_BAND_TOP;

  dynamicWallColliders.push({
    min: [box.min.x, clampedMinY, box.min.z],
    max: [box.max.x, clampedMaxY, box.max.z],
    debugId,
  });
}
