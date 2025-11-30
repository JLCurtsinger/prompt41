import type { Aabb } from "./wallColliders";
import { WALL_COLLIDERS } from "./wallColliders";
import * as THREE from "three";

export const PLAYER_RADIUS = 0.5;

function pointInsideAabb2D(
  x: number,
  z: number,
  box: Aabb,
  radius: number
): boolean {
  const [minX, , minZ] = box.min;
  const [maxX, , maxZ] = box.max;
  const expandedMinX = minX - radius;
  const expandedMaxX = maxX + radius;
  const expandedMinZ = minZ - radius;
  const expandedMaxZ = maxZ + radius;
  return (
    x >= expandedMinX &&
    x <= expandedMaxX &&
    z >= expandedMinZ &&
    z <= expandedMaxZ
  );
}

export function applyWallCollisions(
  prevPos: THREE.Vector3,
  proposedPos: THREE.Vector3
): THREE.Vector3 {
  const x = proposedPos.x;
  const z = proposedPos.z;
  for (const box of WALL_COLLIDERS) {
    if (pointInsideAabb2D(x, z, box, PLAYER_RADIUS)) {
      return prevPos.clone();
    }
  }
  return proposedPos;
}

