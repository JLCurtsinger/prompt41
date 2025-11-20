// TEST PLAN (EnemyBase FSM)
// 1. Idle State:
//    - Enemy should remain stationary when no patrol points are provided
//    - Should transition to patrol if patrol points are provided
// 2. Patrol State:
//    - Enemy should smoothly lerp between patrol points
//    - Should cycle through all patrol points in order
//    - Should transition to chase when player enters detection radius
// 3. Chase State:
//    - Enemy should move directly toward player position
//    - Should transition to attack when player is within attack range
//    - Should transition back to patrol if player leaves detection radius
// 4. Attack State:
//    - Enemy should log "ATTACK" to console
//    - Should transition back to chase if player moves out of attack range
//    - Should transition to patrol if player leaves detection radius

import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export type EnemyState = 'idle' | 'patrol' | 'chase' | 'attack';

export interface EnemyBaseProps {
  initialPosition: [number, number, number];
  patrolPoints?: [number, number, number][];
  detectionRadius: number;
  attackRange: number;
  playerPosition: [number, number, number];
  moveSpeed?: number;
  patrolSpeed?: number;
  onStateChange?: (newState: EnemyState, oldState: EnemyState) => void;
}

export function useEnemyFSM({
  initialPosition: _initialPosition,
  patrolPoints = [],
  detectionRadius,
  attackRange,
  playerPosition,
  moveSpeed = 3,
  patrolSpeed = 2,
  onStateChange,
}: EnemyBaseProps) {
  const enemyRef = useRef<THREE.Group>(null);
  const currentState = useRef<EnemyState>('idle');
  const patrolIndex = useRef(0);
  const patrolTarget = useRef<THREE.Vector3 | null>(null);
  const patrolThreshold = useRef(0.5); // Distance threshold to consider patrol point reached

  // Initialize state based on patrol points
  useEffect(() => {
    if (patrolPoints.length > 0) {
      currentState.current = 'patrol';
      patrolIndex.current = 0;
      patrolTarget.current = new THREE.Vector3(...patrolPoints[0]);
    } else {
      currentState.current = 'idle';
    }
  }, [patrolPoints]);

  // Calculate distance to player
  const getDistanceToPlayer = (): number => {
    if (!enemyRef.current) return Infinity;
    const enemyPos = enemyRef.current.position;
    const playerPos = new THREE.Vector3(...playerPosition);
    return enemyPos.distanceTo(playerPos);
  };

  // State transition logic
  useFrame((_state, delta) => {
    if (!enemyRef.current) return;

    const distanceToPlayer = getDistanceToPlayer();
    const oldState = currentState.current;
    let newState: EnemyState = currentState.current;

    // State machine logic
    switch (currentState.current) {
      case 'idle':
        // Idle enemies don't move
        // Can transition to patrol if patrol points are added
        if (patrolPoints.length > 0) {
          newState = 'patrol';
          patrolIndex.current = 0;
          patrolTarget.current = new THREE.Vector3(...patrolPoints[0]);
        }
        break;

      case 'patrol':
        // Check if player is within detection radius
        if (distanceToPlayer <= detectionRadius) {
          newState = 'chase';
        } else {
          // Continue patrolling
          if (patrolPoints.length > 0 && patrolTarget.current) {
            const enemyPos = enemyRef.current.position;
            const distanceToPatrolPoint = enemyPos.distanceTo(patrolTarget.current);

            if (distanceToPatrolPoint < patrolThreshold.current) {
              // Reached current patrol point, move to next
              patrolIndex.current = (patrolIndex.current + 1) % patrolPoints.length;
              patrolTarget.current = new THREE.Vector3(...patrolPoints[patrolIndex.current]);
            } else {
              // Move toward current patrol point
              const direction = patrolTarget.current.clone().sub(enemyPos).normalize();
              const movement = direction.multiplyScalar(patrolSpeed * delta);
              enemyRef.current.position.add(movement);
            }
          }
        }
        break;

      case 'chase':
        // Check if player is within attack range (with small buffer for hysteresis)
        // Use slightly smaller threshold when entering attack to prevent rapid bouncing
        const attackThreshold = attackRange * 0.95; // 5% buffer
        if (distanceToPlayer <= attackThreshold) {
          newState = 'attack';
        } else if (distanceToPlayer > detectionRadius) {
          // Player left detection radius, return to patrol
          if (patrolPoints.length > 0) {
            newState = 'patrol';
            // Find nearest patrol point
            const enemyPos = enemyRef.current.position;
            let nearestIndex = 0;
            let nearestDistance = Infinity;
            patrolPoints.forEach((point, index) => {
              const dist = enemyPos.distanceTo(new THREE.Vector3(...point));
              if (dist < nearestDistance) {
                nearestDistance = dist;
                nearestIndex = index;
              }
            });
            patrolIndex.current = nearestIndex;
            patrolTarget.current = new THREE.Vector3(...patrolPoints[nearestIndex]);
          } else {
            newState = 'idle';
          }
        } else {
          // Continue chasing - move toward player
          const enemyPos = enemyRef.current.position;
          const playerPos = new THREE.Vector3(...playerPosition);
          // Project onto XZ plane (no vertical movement)
          const direction = playerPos.clone().sub(enemyPos);
          direction.y = 0; // Lock Y movement
          const distance = direction.length();
          if (distance > 0.01) { // Avoid division by zero
            direction.normalize();
            const movement = direction.multiplyScalar(moveSpeed * delta);
            enemyRef.current.position.add(movement);
          }
        }
        break;

      case 'attack':
        // Check if player moved out of attack range (use full range when leaving to prevent rapid re-entry)
        if (distanceToPlayer > attackRange) {
          if (distanceToPlayer <= detectionRadius) {
            newState = 'chase';
          } else {
            // Player left detection radius
            if (patrolPoints.length > 0) {
              newState = 'patrol';
              // Find nearest patrol point
              const enemyPos = enemyRef.current.position;
              let nearestIndex = 0;
              let nearestDistance = Infinity;
              patrolPoints.forEach((point, index) => {
                const dist = enemyPos.distanceTo(new THREE.Vector3(...point));
                if (dist < nearestDistance) {
                  nearestDistance = dist;
                  nearestIndex = index;
                }
              });
              patrolIndex.current = nearestIndex;
              patrolTarget.current = new THREE.Vector3(...patrolPoints[nearestIndex]);
            } else {
              newState = 'idle';
            }
          }
        }
        // In attack state, enemy doesn't move (movement is handled by attack logic)
        break;
    }

    // Update state if it changed
    if (newState !== oldState) {
      currentState.current = newState;
      if (onStateChange) {
        onStateChange(newState, oldState);
      }
    }
  });

  return {
    enemyRef,
    currentState: currentState.current,
  };
}

