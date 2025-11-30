// TEST PLAN (Sentinel Miniboss)
// 1. Activation:
//    - Sentinel spawns idle in Zone 4 at [40, 0, 0]
//    - Walk into Zone 4 (around x=35) to trigger activation
//    - Console should log: "Sentinel: spawned" and "Sentinel: state -> patrol"
// 2. Phase 1 Behavior:
//    - Should patrol in small circle around spawn point
//    - Detection radius: 10m - when player enters, should log: "Sentinel: state -> chase"
//    - Attack range: 4m - when in range, should log: "Sentinel: state -> attack"
//    - Should apply 25 damage with 1.5s cooldown
//    - Console should show: "Damage: -25 from Sentinel -> current HP: XX"
// 3. Phase Transition:
//    - When health drops below 40%, should log: "Sentinel: PHASE 2 ACTIVATED"
//    - Movement speed should increase
//    - Attacks should log "Sentinel: SWEEP ATTACK" instead of normal attack
// 4. Defeat:
//    - When health reaches 0, should log: "Sentinel: DEFEATED"
//    - sentinelDefeated should become true in gameState
//    - Terminal zone4-final should become accessible
//    - Sentinel should disappear or become non-interactive
// 5. Damage Detection:
//    - When player is within 2.5m and isSwinging is true, Sentinel takes 10 damage
//    - Health bar should decrease (visible in console logs)

import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useEnemyFSM, type EnemyState } from './EnemyBase';
import { applyDamageToPlayer } from './enemyDamage';
import { useGameState } from '../../state/gameState';
import { registerEnemy, unregisterEnemy } from './enemyRegistry';
import { EnemyHealthBar } from './EnemyHealthBar';
import { SentinelMiniBossModel } from '../models/SentinelMiniBossModel';
import * as THREE from 'three';

interface EnemySentinelProps {
  initialPosition: [number, number, number];
  playerPosition: [number, number, number];
  isActivated: boolean;
}

export function EnemySentinel({ initialPosition, playerPosition, isActivated }: EnemySentinelProps) {
  const prevStateRef = useRef<EnemyState | null>(null);
  const attackCooldownRef = useRef<number>(0);
  const attackWindUpTimer = useRef<number>(0);
  const hasLoggedAttack = useRef<boolean>(false);
  const wasHitRef = useRef<boolean>(false);
  const hitFlashTimer = useRef<number>(0);
  const materialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  
  // Animation state for visual cues
  const animationTime = useRef<number>(0);
  const stateLogTimer = useRef<number>(0); // Timer for logging state once per second
  
  const setSentinelDefeated = useGameState((state) => state.setSentinelDefeated);
  
  const enemyId = `sentinel-${initialPosition.join('-')}`;
  
  // Zone 4 (Core Chamber) patrol points - small circle around center
  const patrolPoints: [number, number, number][] = [
    [38, 0, 2],   // North
    [42, 0, 0],   // East
    [40, 0, -2],  // South
    [38, 0, 0],   // West
  ];
  
  // Sentinel-specific stats
  const detectionRadius = 10; // meters
  const attackRange = 2.5; // meters
  const moveSpeed = 3.0; // TEMPORARILY increased for visibility
  const patrolSpeed = 2.0; // TEMPORARILY increased for visibility
  const ATTACK_WIND_UP_TIME = 1.3; // seconds before attack
  const ATTACK_COOLDOWN = 2.0; // seconds between attacks
  const ATTACK_DAMAGE = 40; // High damage
  
  const handleStateChange = (newState: EnemyState, oldState: EnemyState) => {
    // Reset attack timer when entering attack state
    if (newState === 'attack') {
      attackWindUpTimer.current = 0;
      hasLoggedAttack.current = false;
    } else {
      // Reset attack state when leaving attack
      attackWindUpTimer.current = 0;
      hasLoggedAttack.current = false;
    }
  };
  
  const { enemyRef, getCurrentState, health, maxHealth, isDead, takeDamage, getHealth, updateFSM } = useEnemyFSM({
    initialPosition,
    patrolPoints: isActivated ? patrolPoints : [], // Only patrol if activated
    detectionRadius,
    attackRange,
    playerPosition,
    moveSpeed,
    patrolSpeed,
    onStateChange: handleStateChange,
    maxHealth: 350, // Sentinel has 350 HP
    enemyId,
  });
  
  // Wrap takeDamage to add hit flash, logging, and check for death
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
    };
    
    registerEnemy(enemyId, instance);
    
    return () => {
      unregisterEnemy(enemyId);
    };
  }, [enemyId, isDead]);
  
  // Log isActivated changes
  useEffect(() => {
    console.log('[Sentinel]', enemyId, 'isActivated changed to:', isActivated);
  }, [isActivated, enemyId]);

  // Handle death
  useEffect(() => {
    if (isDead) {
      setSentinelDefeated(true);
    }
  }, [isDead, setSentinelDefeated]);
  
  // Handle attack wind-up and damage
  useFrame((_state, delta) => {
    if (!enemyRef.current || !isActivated) return;
    
    // Update FSM and movement - this drives patrol/chase/attack state transitions and movement
    updateFSM(delta);
    
    // Stop all behavior if dead
    if (isDead) return;
    
    // Get current state (reactive)
    const currentState = getCurrentState();
    
    // Log FSM state and distance to player once per second
    stateLogTimer.current += delta;
    if (stateLogTimer.current >= 1.0) {
      const distanceToPlayer = enemyRef.current.position.distanceTo(new THREE.Vector3(...playerPosition));
      console.log('[Sentinel]', enemyId, 'state:', currentState, 'distance:', distanceToPlayer.toFixed(1));
      stateLogTimer.current = 0;
    }
    
    // Update animation time for visual cues
    animationTime.current += delta;
    
    // Update registry (re-register with current position) - this ensures isDead closure is fresh
    const instance = {
      id: enemyId,
      getPosition: () => enemyRef.current?.position.clone() ?? new THREE.Vector3(),
      takeDamage: (amount: number) => wrappedTakeDamage.current(amount),
      isDead: () => isDead, // Fresh closure every frame ensures current value
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
    
    // Handle attack wind-up delay and damage
    if (currentState === 'attack' && !isDead) {
      attackWindUpTimer.current += delta;
      
      // Update attack cooldown
      if (attackCooldownRef.current > 0) {
        attackCooldownRef.current -= delta;
      }
      
      if (attackWindUpTimer.current >= ATTACK_WIND_UP_TIME && !hasLoggedAttack.current) {
        hasLoggedAttack.current = true;
      }
      
      // Apply damage when wind-up completes and cooldown allows
      if (attackWindUpTimer.current >= ATTACK_WIND_UP_TIME && attackCooldownRef.current <= 0) {
        applyDamageToPlayer(ATTACK_DAMAGE, 'Sentinel');
        attackCooldownRef.current = ATTACK_COOLDOWN;
      }
    }
    
    // Reset cooldown when leaving attack state
    if (prevStateRef.current === 'attack' && currentState !== 'attack') {
      attackCooldownRef.current = 0;
    }
    
    // Visual cues: simple forward lean and bob during chase (rotation and Y only)
    if (enemyRef.current && currentState === 'chase') {
      const baseGroundY = initialPosition[1];
      // Small vertical bob
      const bobAmount = 0.05;
      const bobSpeed = 3.0;
      const bob = Math.sin(animationTime.current * bobSpeed) * bobAmount;
      enemyRef.current.position.y = baseGroundY + bob;
      
      // Small forward lean (rotation only)
      enemyRef.current.rotation.x = -0.08;
    } else if (enemyRef.current) {
      // Reset rotation when not chasing
      enemyRef.current.rotation.x = 0;
      if (currentState !== 'chase') {
        enemyRef.current.position.y = initialPosition[1];
      }
    }
    
    // Update previous state for tracking
    prevStateRef.current = currentState;
  });
  
  // Set initial position
  useEffect(() => {
    if (enemyRef.current) {
      enemyRef.current.position.set(...initialPosition);
    }
  }, [initialPosition]);
  
  
  // Don't render if dead
  if (isDead) {
    return null;
  }
  
  return (
    <group ref={enemyRef}>
      {/* Health bar above enemy */}
      <EnemyHealthBar health={health} maxHealth={maxHealth} getHealth={getHealth} />
      
      {/* Sentinel Mini-Boss GLB model */}
      <SentinelMiniBossModel scale={[1, 1, 1]} />
      
    </group>
  );
}

