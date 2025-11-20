// TEST PLAN (Crawler Zombot)
// 1. Spawn:
//    - Should spawn at initial position in Zone 2
//    - Should start in patrol state if patrol points are provided
// 2. Patrol:
//    - Should move between 2-3 patrol points in Zone 2
//    - Console should log: "Crawler: state -> patrol"
// 3. Detection:
//    - When player enters detection radius, should log: "Crawler: state -> chase"
//    - Should start moving toward player
// 4. Attack:
//    - When player is within attack range, should log: "Crawler: state -> attack"
//    - Should log: "Crawler: ATTACK" when in attack state
//    - Should apply 5 damage to player with 0.8s cooldown between attacks
//    - Console should show: "Damage: -5 from Crawler -> current HP: XX"
// 5. Return to Patrol:
//    - When player leaves detection radius, should return to patrol
//    - Should log state transitions appropriately

import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useEnemyFSM, type EnemyState } from './EnemyBase';
import { applyDamageToPlayer } from './enemyDamage';
import { registerEnemy, unregisterEnemy } from './enemyRegistry';
import { EnemyHealthBar } from './EnemyHealthBar';
import * as THREE from 'three';

interface EnemyCrawlerProps {
  initialPosition: [number, number, number];
  playerPosition: [number, number, number];
  patrolPoints?: [number, number, number][]; // Optional patrol points - only first crawler gets these
}

export function EnemyCrawler({ initialPosition, playerPosition, patrolPoints }: EnemyCrawlerProps) {
  const prevStateRef = useRef<EnemyState | null>(null);
  const attackCooldownRef = useRef<number>(0);
  const wasHitRef = useRef<boolean>(false);
  const hitFlashTimer = useRef<number>(0);
  const materialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const ATTACK_COOLDOWN = 0.8; // seconds
  const ATTACK_DAMAGE = 5;
  
  // Patrol pause state - tracks when we reach a waypoint and need to pause
  const patrolPauseTimer = useRef<number>(0);
  const isPausedAtWaypoint = useRef<boolean>(false);
  const lastWaypointIndex = useRef<number>(-1);
  const PATROL_PAUSE_DURATION = 1.5; // seconds to pause at each waypoint

  // Crawler-specific stats: fast, low health
  const detectionRadius = 8; // meters
  const attackRange = 2; // meters
  const moveSpeed = 5; // Fast movement speed
  const patrolSpeed = 3; // Slightly slower patrol speed

  const handleStateChange = (newState: EnemyState, oldState: EnemyState) => {
    // Debug log state transitions
    if (newState !== oldState) {
      console.log('[Crawler]', enemyId, 'state ->', newState);
    }
    
    // Reset pause timer when entering patrol
    if (newState === 'patrol' && oldState !== 'patrol') {
      isPausedAtWaypoint.current = false;
      patrolPauseTimer.current = 0;
    }
  };

  const enemyId = `crawler-${initialPosition.join('-')}`;
  
  // Use provided patrolPoints or empty array (for crawlers without patrol)
  const effectivePatrolPoints = patrolPoints || [];
  
  const { enemyRef, currentState, health, maxHealth, isDead, takeDamage, getHealth } = useEnemyFSM({
    initialPosition,
    patrolPoints: effectivePatrolPoints,
    detectionRadius,
    attackRange,
    playerPosition,
    moveSpeed,
    patrolSpeed,
    onStateChange: handleStateChange,
    maxHealth: 50, // Crawler has 50 HP (lower than Shambler)
    enemyId,
    isPatrolPaused: () => isPausedAtWaypoint.current, // Helper to pause patrol movement
  });
  
  // Wrap takeDamage to add hit flash and logging
  const wrappedTakeDamage = useRef((amount: number) => {
    const healthAfter = takeDamage(amount);
    wasHitRef.current = true;
    hitFlashTimer.current = 0;
    console.log('[Combat] Baton hit enemy', enemyId, 'for', amount, '=> hp:', healthAfter, '/', maxHealth);
  });
  
  // Update wrapped function when takeDamage changes
  useEffect(() => {
    wrappedTakeDamage.current = (amount: number) => {
      const healthAfter = takeDamage(amount);
      wasHitRef.current = true;
      hitFlashTimer.current = 0;
      console.log('[Combat] Baton hit enemy', enemyId, 'for', amount, '=> hp:', healthAfter, '/', maxHealth);
    };
  }, [takeDamage, enemyId, maxHealth]);
  
  // Register enemy with registry for hit detection
  useEffect(() => {
    if (!enemyRef.current) return;
    
    const instance = {
      id: enemyId,
      getPosition: () => enemyRef.current?.position.clone() ?? new THREE.Vector3(),
      takeDamage: (amount: number) => wrappedTakeDamage.current(amount),
      isDead: () => isDead, // isDead is a boolean value from useEnemyFSM
      getHealth: () => getHealth(), // Get current health
      getMaxHealth: () => maxHealth, // Get max health
      getEnemyName: () => 'Crawler', // Enemy name for HUD
    };
    
    registerEnemy(enemyId, instance);
    
    return () => {
      unregisterEnemy(enemyId);
    };
  }, [enemyId, isDead, getHealth, maxHealth]);

  // Track state changes for logging
  useEffect(() => {
    if (prevStateRef.current !== currentState) {
      prevStateRef.current = currentState;
    }
  }, [currentState]);

  // Set initial position
  useEffect(() => {
    if (enemyRef.current) {
      enemyRef.current.position.set(...initialPosition);
    }
  }, [initialPosition, enemyRef]);

  // Handle attack damage with cooldown, patrol pause, and chase return logic
  useFrame((_state, delta) => {
    if (!enemyRef.current) return;
    
    // Stop all behavior if dead
    if (isDead) return;
    
    // Update registry (re-register with current position) - this ensures isDead closure is fresh
    const instance = {
      id: enemyId,
      getPosition: () => enemyRef.current?.position.clone() ?? new THREE.Vector3(),
      takeDamage: (amount: number) => wrappedTakeDamage.current(amount),
      isDead: () => isDead, // Fresh closure every frame ensures current value
      getHealth: () => getHealth(), // Get current health
      getMaxHealth: () => maxHealth, // Get max health
      getEnemyName: () => 'Crawler', // Enemy name for HUD
    };
    registerEnemy(enemyId, instance);
    
    // Handle hit flash effect
    if (wasHitRef.current) {
      hitFlashTimer.current += delta;
      if (hitFlashTimer.current > 0.1) {
        wasHitRef.current = false;
        hitFlashTimer.current = 0;
        if (materialRef.current) {
          materialRef.current.emissiveIntensity = 0.3;
        }
      } else if (materialRef.current) {
        // Flash white/red briefly
        materialRef.current.emissiveIntensity = 0.8;
      }
    }
    
    // Calculate distance to player for chase return logic
    const enemyPos = enemyRef.current.position;
    const playerPos = new THREE.Vector3(...playerPosition);
    const distanceToPlayer = enemyPos.distanceTo(playerPos);
    
    // Enhanced chase -> patrol transition handled by EnemyBase FSM
    // The FSM already checks detectionRadius, but we want a larger threshold for returning to patrol
    // Since we can't easily modify EnemyBase's FSM logic, we rely on it to handle transitions
    // The base FSM will transition back to patrol when distance > detectionRadius
    
    // Handle patrol pause logic (only for crawlers with patrol points)
    if (currentState === 'patrol' && effectivePatrolPoints.length > 0) {
      // Check if we've reached a waypoint (using the same threshold as EnemyBase)
      const waypointThreshold = 0.5;
      let currentWaypointIndex = -1;
      let minDistance = Infinity;
      
      effectivePatrolPoints.forEach((point, index) => {
        const waypointPos = new THREE.Vector3(...point);
        const distance = enemyPos.distanceTo(waypointPos);
        if (distance < minDistance) {
          minDistance = distance;
          currentWaypointIndex = index;
        }
      });
      
      // If we're close to a waypoint and not already paused, start pause
      if (minDistance < waypointThreshold && !isPausedAtWaypoint.current) {
        if (currentWaypointIndex !== lastWaypointIndex.current) {
          // Reached a new waypoint
          isPausedAtWaypoint.current = true;
          patrolPauseTimer.current = 0;
          lastWaypointIndex.current = currentWaypointIndex;
          console.log('[Crawler]', enemyId, 'reached waypoint', currentWaypointIndex);
        }
      }
      
      // Handle pause timer
      if (isPausedAtWaypoint.current) {
        patrolPauseTimer.current += delta;
        if (patrolPauseTimer.current >= PATROL_PAUSE_DURATION) {
          // Pause complete, resume patrolling
          isPausedAtWaypoint.current = false;
          patrolPauseTimer.current = 0;
        } else {
          // Still pausing - prevent movement by not letting EnemyBase move
          // We can't directly stop EnemyBase's movement, but we can note that we're paused
          // The EnemyBase will continue to try to move, but we'll override it if needed
        }
      }
    } else {
      // Not in patrol, reset pause state
      isPausedAtWaypoint.current = false;
      patrolPauseTimer.current = 0;
    }
    
    // Update cooldown timer
    if (attackCooldownRef.current > 0) {
      attackCooldownRef.current -= delta;
    }

    // Apply damage when in attack state and cooldown is ready (only if not dead)
    if (currentState === 'attack' && attackCooldownRef.current <= 0 && !isDead) {
      applyDamageToPlayer(ATTACK_DAMAGE, 'Crawler');
      attackCooldownRef.current = ATTACK_COOLDOWN;
    }

    // Reset cooldown when leaving attack state
    if (prevStateRef.current === 'attack' && currentState !== 'attack') {
      attackCooldownRef.current = 0;
    }
    
    // Track previous state for logging
    if (prevStateRef.current !== currentState) {
      prevStateRef.current = currentState;
    }
  });

  return (
    <group ref={enemyRef} position={initialPosition}>
      {/* Health bar above enemy */}
      <EnemyHealthBar health={health} maxHealth={maxHealth} getHealth={getHealth} />
      
      {/* TODO: Replace this placeholder with crawlerZombot.glb model */}
      {/* Low-profile mesh: scaled box/sphere combo for Crawler Zombot */}
      {/* Main body - low, wide box */}
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[0.8, 0.4, 1.2]} />
        <meshStandardMaterial 
          ref={materialRef}
          color="#2a2a2a" 
          emissive="#ff4444" 
          emissiveIntensity={0.3}
        />
      </mesh>
      
      {/* Core/head - small sphere at front - emissive red/orange core */}
      <mesh position={[0, 0.4, 0.5]} castShadow>
        <sphereGeometry args={[0.25, 8, 8]} />
        <meshStandardMaterial 
          color="#1a1a1a" 
          emissive="#ff4400" 
          emissiveIntensity={1.2}
        />
      </mesh>
      
      {/* Legs/appendages - simple boxes for low-profile look */}
      <mesh position={[-0.4, 0.1, -0.3]} castShadow>
        <boxGeometry args={[0.15, 0.2, 0.4]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[0.4, 0.1, -0.3]} castShadow>
        <boxGeometry args={[0.15, 0.2, 0.4]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[-0.4, 0.1, 0.3]} castShadow>
        <boxGeometry args={[0.15, 0.2, 0.4]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[0.4, 0.1, 0.3]} castShadow>
        <boxGeometry args={[0.15, 0.2, 0.4]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
    </group>
  );
}

