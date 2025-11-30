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

function positionBlockedByWalls(pos: THREE.Vector3): boolean {
  const x = pos.x;
  const z = pos.z;
  for (const box of WALL_COLLIDERS) {
    if (pointInsideAabb2D(x, z, box, PLAYER_RADIUS)) {
      return true;
    }
  }
  return false;
}

export function applyWallCollisions(
  prevPos: THREE.Vector3,
  proposedPos: THREE.Vector3
): THREE.Vector3 {
  // If the fully proposed move is not blocked, just accept it.
  if (!positionBlockedByWalls(proposedPos)) {
    return proposedPos;
  }

  // Compute the attempted movement on each axis.
  const dx = proposedPos.x - prevPos.x;
  const dz = proposedPos.z - prevPos.z;

  // Candidate positions for sliding along walls:
  // 1. Move only along X, keep Z from previous position.
  const slideX = new THREE.Vector3(prevPos.x + dx, proposedPos.y, prevPos.z);
  // 2. Move only along Z, keep X from previous position.
  const slideZ = new THREE.Vector3(prevPos.x, proposedPos.y, prevPos.z + dz);

  const canMoveX = !positionBlockedByWalls(slideX);
  const canMoveZ = !positionBlockedByWalls(slideZ);

  // Prefer a valid slide over reverting all movement.
  if (canMoveX && !canMoveZ) {
    return slideX;
  }
  if (!canMoveX && canMoveZ) {
    return slideZ;
  }
  if (canMoveX && canMoveZ) {
    // If both are valid, choose the direction with the larger component
    // so it feels more natural (slide in the main direction of travel).
    if (Math.abs(dx) >= Math.abs(dz)) {
      return slideX;
    } else {
      return slideZ;
    }
  }

  // If both slide attempts are blocked, stay in the previous position.
  return prevPos;
}

