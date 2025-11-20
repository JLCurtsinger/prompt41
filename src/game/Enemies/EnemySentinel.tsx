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
  const moveSpeed = 1.0; // Slow movement
  const patrolSpeed = 0.8;
  const ATTACK_WIND_UP_TIME = 1.3; // seconds before attack
  const ATTACK_COOLDOWN = 2.0; // seconds between attacks
  const ATTACK_DAMAGE = 40; // High damage
  
  const handleStateChange = (newState: EnemyState, oldState: EnemyState) => {
    // Log state transitions
    console.log(`Sentinel: state -> ${newState}`);
    
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
  
  const { enemyRef, getCurrentState, health, maxHealth, isDead, takeDamage } = useEnemyFSM({
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
  
  // Wrap takeDamage to add hit flash and check for death
  const wrappedTakeDamage = useRef((amount: number) => {
    takeDamage(amount);
    wasHitRef.current = true;
    hitFlashTimer.current = 0;
  });
  
  // Update wrapped function when takeDamage changes
  useEffect(() => {
    wrappedTakeDamage.current = (amount: number) => {
      takeDamage(amount);
      wasHitRef.current = true;
      hitFlashTimer.current = 0;
    };
  }, [takeDamage]);
  
  // Register enemy with registry for hit detection
  useEffect(() => {
    if (!enemyRef.current) return;
    
    const instance = {
      id: enemyId,
      getPosition: () => enemyRef.current?.position.clone() ?? new THREE.Vector3(),
      takeDamage: (amount: number) => wrappedTakeDamage.current(amount),
      isDead: () => isDead,
    };
    
    registerEnemy(enemyId, instance);
    
    return () => {
      unregisterEnemy(enemyId);
    };
  }, [enemyId, isDead]);
  
  // Handle death
  useEffect(() => {
    if (isDead) {
      console.log('[Sentinel] defeated');
      setSentinelDefeated(true);
    }
  }, [isDead, setSentinelDefeated]);
  
  // Handle attack wind-up and damage
  useFrame((_state, delta) => {
    if (!enemyRef.current || !isActivated) return;
    
    // Stop all behavior if dead
    if (isDead) return;
    
    // Get current state (reactive)
    const currentState = getCurrentState();
    
    // Update registry (re-register with current position)
    const instance = {
      id: enemyId,
      getPosition: () => enemyRef.current?.position.clone() ?? new THREE.Vector3(),
      takeDamage: (amount: number) => wrappedTakeDamage.current(amount),
      isDead: () => isDead,
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
        console.log('Sentinel: ATTACK');
        hasLoggedAttack.current = true;
        
        // Apply damage if cooldown is ready
        if (attackCooldownRef.current <= 0) {
          applyDamageToPlayer(ATTACK_DAMAGE, 'Sentinel');
          attackCooldownRef.current = ATTACK_COOLDOWN;
        }
      }
    }
    
    // Reset cooldown when leaving attack state
    if (prevStateRef.current === 'attack' && currentState !== 'attack') {
      attackCooldownRef.current = 0;
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
  
  // Log spawn when activated
  useEffect(() => {
    if (isActivated) {
      console.log('Sentinel: spawned');
    }
  }, [isActivated]);
  
  // Don't render if dead
  if (isDead) {
    return null;
  }
  
  return (
    <group ref={enemyRef} position={initialPosition}>
      {/* TODO: Replace this placeholder with sentinelZombot.glb model */}
      {/* Sentinel: Larger than Shambler, amber/red core */}
      
      {/* Main body - large, taller box */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <boxGeometry args={[0.8, 2, 0.7]} />
        <meshStandardMaterial 
          ref={materialRef}
          color="#2a2a2a" 
          emissive="#ffaa00" 
          emissiveIntensity={0.3}
        />
      </mesh>
      
      {/* Core/chest - large amber/red glowing core */}
      <mesh position={[0, 1.5, 0.4]} castShadow>
        <sphereGeometry args={[0.3, 12, 12]} />
        <meshStandardMaterial 
          color="#1a1a1a" 
          emissive="#ff8800" 
          emissiveIntensity={1.2}
        />
      </mesh>
      
      {/* Head - medium box on top */}
      <mesh position={[0, 2.8, 0]} castShadow>
        <boxGeometry args={[0.5, 0.4, 0.5]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      
      {/* Arms - wider stance */}
      <mesh position={[-0.5, 1.3, 0]} castShadow>
        <boxGeometry args={[0.2, 1.0, 0.2]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[0.5, 1.3, 0]} castShadow>
        <boxGeometry args={[0.2, 1.0, 0.2]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      
      {/* Legs - wider stance */}
      <mesh position={[-0.3, 0.6, 0]} castShadow>
        <boxGeometry args={[0.25, 1.2, 0.25]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[0.3, 0.6, 0]} castShadow>
        <boxGeometry args={[0.25, 1.2, 0.25]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      
    </group>
  );
}

