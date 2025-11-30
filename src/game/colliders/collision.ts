import type { Aabb } from "./wallColliders";
import { WALL_COLLIDERS } from "./wallColliders";
import * as THREE from "three";

const DEBUG_COLLISIONS = true; // set to false for production

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

function positionBlockedByWalls(pos: THREE.Vector3): { blocked: boolean; index: number } {
  const x = pos.x;
  const z = pos.z;
  for (let i = 0; i < WALL_COLLIDERS.length; i += 1) {
    const box = WALL_COLLIDERS[i];
    if (pointInsideAabb2D(x, z, box, PLAYER_RADIUS)) {
      if (DEBUG_COLLISIONS) {
        // Keep this lightweight; it only runs when debugging.
        // eslint-disable-next-line no-console
        console.log("Collision blocked at", { x, z, colliderIndex: i, box });
      }
      return { blocked: true, index: i };
    }
  }
  return { blocked: false, index: -1 };
}

export function applyWallCollisions(
  prevPos: THREE.Vector3,
  proposedPos: THREE.Vector3
): THREE.Vector3 {
  // Check full move
  const fullCheck = positionBlockedByWalls(proposedPos);
  if (!fullCheck.blocked) {
    return proposedPos;
  }

  const dx = proposedPos.x - prevPos.x;
  const dz = proposedPos.z - prevPos.z;

  const slideX = new THREE.Vector3(prevPos.x + dx, proposedPos.y, prevPos.z);
  const slideZ = new THREE.Vector3(prevPos.x, proposedPos.y, prevPos.z + dz);

  const checkX = positionBlockedByWalls(slideX);
  const checkZ = positionBlockedByWalls(slideZ);

  const canMoveX = !checkX.blocked;
  const canMoveZ = !checkZ.blocked;

  if (canMoveX && !canMoveZ) {
    return slideX;
  }
  if (!canMoveX && canMoveZ) {
    return slideZ;
  }
  if (canMoveX && canMoveZ) {
    if (Math.abs(dx) >= Math.abs(dz)) {
      return slideX;
    }
    return slideZ;
  }

  // Both directions blocked, stay where we were
  return prevPos;
}

