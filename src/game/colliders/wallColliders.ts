import * as THREE from "three";

export type Aabb = {
  min: [number, number, number];
  max: [number, number, number];
  debugId?: string; // optional label for debugging
};

const manualWallColliders: Aabb[] = [];

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
