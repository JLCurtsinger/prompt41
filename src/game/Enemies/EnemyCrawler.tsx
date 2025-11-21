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
import { useGameState } from '../../state/gameState';
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
  
  // Death animation state
  const deathTimer = useRef<number>(0);
  const isDying = useRef<boolean>(false);
  const hasUnregistered = useRef<boolean>(false);
  const DEATH_DURATION = 0.5; // seconds
  
  // Animation state for bob/lean
  const animationTime = useRef<number>(0);
  
  const { incrementEnemiesKilled, checkWinCondition } = useGameState();
  
  // Patrol pause state - tracks when we reach a waypoint and need to pause
  const patrolPauseTimer = useRef<number>(0);
  const isPausedAtWaypoint = useRef<boolean>(false);
  const lastWaypointIndex = useRef<number>(-1);
  const PATROL_PAUSE_DURATION = 1.5; // seconds to pause at each waypoint

  // Crawler-specific stats: fast, low health
  // Movement speeds - tuned for visible movement in small level
  const CRAWLER_PATROL_SPEED = 1.5; // units/sec - visible but not too fast
  const CRAWLER_CHASE_SPEED = 3.0; // units/sec - clearly closes distance
  const CRAWLER_ATTACK_RANGE = 2.0; // meters
  
  const detectionRadius = 8; // meters
  const attackRange = CRAWLER_ATTACK_RANGE;
  const moveSpeed = CRAWLER_CHASE_SPEED;
  const patrolSpeed = CRAWLER_PATROL_SPEED;

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
    
    // Handle death animation
    if (isDead && !hasUnregistered.current) {
      if (!isDying.current) {
        isDying.current = true;
        deathTimer.current = 0;
        console.log('[Crawler]', enemyId, 'death sequence started');
      }
      
      deathTimer.current += delta;
      const deathProgress = Math.min(deathTimer.current / DEATH_DURATION, 1);
      
      // Scale down and sink into floor
      const scale = 1 - deathProgress;
      enemyRef.current.scale.set(scale, scale, scale);
      enemyRef.current.position.y = initialPosition[1] - deathProgress * 0.5; // Sink into floor
      
      if (deathProgress >= 1 && !hasUnregistered.current) {
        // Death animation complete - unregister and increment kill count
        unregisterEnemy(enemyId);
        incrementEnemiesKilled();
        checkWinCondition();
        hasUnregistered.current = true;
        console.log('[Crawler]', enemyId, 'unregistered');
      }
      return; // Stop all other behavior during death
    }
    
    // Stop all behavior if dead (after death animation)
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
    
    // Update animation time for bob/lean effects
    animationTime.current += delta;
    
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
    
    // Visual animations only - movement comes from EnemyBase FSM
    // INTENTIONAL: We only adjust position.y for bob and rotation for visual feedback
    // We do NOT write to position.x or position.z - those are controlled by EnemyBase
    if (enemyRef.current) {
      const baseGroundY = initialPosition[1];
      
      if (currentState === 'patrol') {
        // Patrol: slight vertical bob only (no X/Z movement)
        const bobAmount = 0.05;
        const bobSpeed = 3.0;
        const bob = Math.sin(animationTime.current * bobSpeed) * bobAmount;
        enemyRef.current.position.y = baseGroundY + bob;
        
        // Tiny sway (rotation only)
        const swayAmount = 0.02;
        const swaySpeed = 2.0;
        enemyRef.current.rotation.z = Math.sin(animationTime.current * swaySpeed) * swayAmount;
        enemyRef.current.rotation.x = 0;
      } else if (currentState === 'chase') {
        // Chase: vertical bob + forward lean (rotation only, no position changes)
        const bobAmount = 0.08;
        const bobSpeed = 4.0;
        const bob = Math.sin(animationTime.current * bobSpeed) * bobAmount;
        enemyRef.current.position.y = baseGroundY + bob;
        
        // Lean forward (rotation only - additive, doesn't reset transform)
        enemyRef.current.rotation.x = -0.1; // Lean forward
        enemyRef.current.rotation.z = 0;
      } else if (currentState === 'attack') {
        // Attack: REMOVED position.copy() and lunge movement
        // Now only visual feedback: stronger forward lean or shake (rotation only)
        // Position is NOT modified - EnemyBase FSM controls all movement
        const bobAmount = 0.06;
        const bobSpeed = 5.0;
        const bob = Math.sin(animationTime.current * bobSpeed) * bobAmount;
        enemyRef.current.position.y = baseGroundY + bob;
        
        // Stronger forward lean or brief shake (rotation only)
        const shakeAmount = 0.05;
        const shakeSpeed = 10.0;
        enemyRef.current.rotation.x = -0.15 + Math.sin(animationTime.current * shakeSpeed) * shakeAmount;
        enemyRef.current.rotation.z = Math.sin(animationTime.current * shakeSpeed * 1.3) * shakeAmount * 0.5;
      } else {
        // Idle: reset to base position and rotation
        enemyRef.current.position.y = baseGroundY;
        enemyRef.current.rotation.x = 0;
        enemyRef.current.rotation.z = 0;
      }
    }
    
    // Handle patrol pause logic (only for crawlers with patrol points)
    // This uses EnemyBase's position to detect waypoint proximity, but does NOT move the enemy
    if (currentState === 'patrol' && effectivePatrolPoints.length > 0 && enemyRef.current) {
      // Check if we've reached a waypoint (using the same threshold as EnemyBase)
      const waypointThreshold = 0.5;
      let currentWaypointIndex = -1;
      let minDistance = Infinity;
      
      effectivePatrolPoints.forEach((point, index) => {
        const waypointPos = new THREE.Vector3(...point);
        const distance = enemyRef.current!.position.distanceTo(waypointPos);
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
      attackLungeTimer.current = 0; // Start lunge animation
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
    <group ref={enemyRef}>
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

