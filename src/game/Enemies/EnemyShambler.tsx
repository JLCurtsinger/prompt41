// TEST PLAN (Shambler Zombot)
// 1. Spawn:
//    - Spawn in Zone 1 at [-15, 0, 0]
//    - Walk forward (W key) through Zone 2 (you'll see Crawler logs)
//    - Continue forward into Zone 3 (around x=10-12)
//    - Console should log: "Shambler: spawned" when trigger is crossed
// 2. Activation:
//    - Shambler starts idle until player crosses trigger volume near Zone 3 entrance
//    - After trigger, should log: "Shambler: state -> patrol"
// 3. Patrol:
//    - Should move with jerky, unpredictable motion between patrol points
//    - Console should log: "Shambler: state -> patrol"
// 4. Detection:
//    - When player enters detection radius (6m), should log: "Shambler: state -> chase"
//    - Should move toward player with jerky motion
// 5. Attack:
//    - When player is within attack range (2.5m), should log: "Shambler: state -> attack"
//    - After ~0.5s wind-up delay, should log: "Shambler: HEAVY ATTACK"
//    - Should apply 15 damage to player with 1.2s cooldown between attacks
//    - Console should show: "Damage: -15 from Shambler -> current HP: XX"
// 6. Return to Patrol:
//    - When player leaves detection radius, should return to patrol
//    - Should log state transitions appropriately

import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useEnemyFSM, type EnemyState } from './EnemyBase';
import { applyDamageToPlayer } from './enemyDamage';
import * as THREE from 'three';

interface EnemyShamblerProps {
  initialPosition: [number, number, number];
  playerPosition: [number, number, number];
  isActivated: boolean;
}

export function EnemyShambler({ initialPosition, playerPosition, isActivated }: EnemyShamblerProps) {
  const prevStateRef = useRef<EnemyState | null>(null);
  const attackWindUpTimer = useRef<number>(0);
  const hasLoggedAttack = useRef<boolean>(false);
  const attackCooldownRef = useRef<number>(0);
  const lastJerkyUpdate = useRef<number>(0);
  const jerkyDirection = useRef(new THREE.Vector3(0, 0, 0));

  // Zone 3 (Conduit Hall) patrol points - hardcoded positions
  // These form a small patrol in the corridor area
  const patrolPoints: [number, number, number][] = [
    [15, 0, -2],   // Left side of corridor
    [20, 0, 0],   // Center of corridor
    [15, 0, 2],   // Right side of corridor
  ];

  // Shambler-specific stats: slow, heavy, jerky
  const detectionRadius = 6; // meters (smaller than Crawler)
  const attackRange = 2.5; // meters (slightly longer for heavy swing)
  const moveSpeed = 1.8; // Slow movement speed
  const patrolSpeed = 1.5; // Even slower patrol speed
  const ATTACK_WIND_UP_TIME = 0.5; // seconds before attack logs
  const ATTACK_COOLDOWN = 1.2; // seconds between attacks
  const ATTACK_DAMAGE = 15; // Heavy damage
  const JERKY_UPDATE_INTERVAL = 0.15; // seconds between jerky direction changes

  const handleStateChange = (newState: EnemyState, _oldState: EnemyState) => {
    // Log state transitions
    console.log(`Shambler: state -> ${newState}`);
    
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

  const { enemyRef, currentState } = useEnemyFSM({
    initialPosition,
    patrolPoints: isActivated ? patrolPoints : [], // Only patrol if activated
    detectionRadius,
    attackRange,
    playerPosition, // Base player position
    moveSpeed,
    patrolSpeed,
    onStateChange: handleStateChange,
  });

  // Apply jerky movement and handle attack wind-up
  useFrame((_state, delta) => {
    if (!enemyRef.current || !isActivated) return;

    const now = performance.now() / 1000;

    // Update jerky direction periodically for unpredictable motion
    if (now - lastJerkyUpdate.current > JERKY_UPDATE_INTERVAL) {
      // Randomize direction slightly (small angle variation)
      const angleVariation = (Math.random() - 0.5) * 0.4; // ±0.2 radians
      jerkyDirection.current.set(
        Math.cos(angleVariation),
        0,
        Math.sin(angleVariation)
      );
      lastJerkyUpdate.current = now;
    }

    // Apply jerky movement during patrol and chase
    if (currentState === 'patrol' || currentState === 'chase') {
      // Add small random offset to position for jerky feel
      const jerkyAmount = 0.03; // Small position offset per frame
      const offsetX = (Math.random() - 0.5) * jerkyAmount;
      const offsetZ = (Math.random() - 0.5) * jerkyAmount;
      enemyRef.current.position.x += offsetX;
      enemyRef.current.position.z += offsetZ;
      
      // Also slightly modify movement direction in chase
      if (currentState === 'chase') {
        const enemyPos = enemyRef.current.position;
        const playerPos = new THREE.Vector3(...playerPosition);
        const baseDirection = playerPos.clone().sub(enemyPos).normalize();
        
        // Add jerky direction component
        baseDirection.add(jerkyDirection.current.clone().multiplyScalar(0.15));
        baseDirection.normalize();
        
        // Apply additional movement with jerky variation
        const speedVariation = 0.95 + Math.random() * 0.1; // 0.95x to 1.05x
        const additionalMovement = baseDirection.multiplyScalar(moveSpeed * speedVariation * delta * 0.3);
        enemyRef.current.position.add(additionalMovement);
      }
    }

    // Handle attack wind-up delay and damage
    if (currentState === 'attack') {
      attackWindUpTimer.current += delta;
      
      // Update attack cooldown
      if (attackCooldownRef.current > 0) {
        attackCooldownRef.current -= delta;
      }
      
      if (attackWindUpTimer.current >= ATTACK_WIND_UP_TIME && !hasLoggedAttack.current) {
        console.log('Shambler: HEAVY ATTACK');
        hasLoggedAttack.current = true;
        
        // Apply damage if cooldown is ready
        if (attackCooldownRef.current <= 0) {
          applyDamageToPlayer(ATTACK_DAMAGE, 'Shambler');
          attackCooldownRef.current = ATTACK_COOLDOWN;
        }
      }
    }

    // Reset cooldown when leaving attack state
    if (prevStateRef.current === 'attack' && currentState !== 'attack') {
      attackCooldownRef.current = 0;
    }
  });

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

  // Log spawn when activated
  useEffect(() => {
    if (isActivated) {
      console.log('Shambler: spawned');
    }
  }, [isActivated]);

  return (
    <group ref={enemyRef} position={initialPosition}>
      {/* TODO: Replace this placeholder with shamblerZombot.glb model */}
      {/* Taller, humanoid silhouette for Shambler Zombot */}
      
      {/* Main torso - taller box */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <boxGeometry args={[0.6, 1.4, 0.5]} />
        <meshStandardMaterial 
          color="#2a2a2a" 
          emissive="#ff6600" 
          emissiveIntensity={0.2}
        />
      </mesh>
      
      {/* Core/chest - red/orange glowing core in chest */}
      <mesh position={[0, 1.3, 0.3]} castShadow>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshStandardMaterial 
          color="#1a1a1a" 
          emissive="#ff4400" 
          emissiveIntensity={1.2}
        />
      </mesh>
      
      {/* Head - small box on top */}
      <mesh position={[0, 2.1, 0]} castShadow>
        <boxGeometry args={[0.4, 0.3, 0.4]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      
      {/* Arms - hanging down */}
      <mesh position={[-0.4, 0.8, 0]} castShadow>
        <boxGeometry args={[0.15, 0.8, 0.15]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[0.4, 0.8, 0]} castShadow>
        <boxGeometry args={[0.15, 0.8, 0.15]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      
      {/* Legs - wider stance */}
      <mesh position={[-0.25, 0.4, 0]} castShadow>
        <boxGeometry args={[0.2, 0.8, 0.2]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[0.25, 0.4, 0]} castShadow>
        <boxGeometry args={[0.2, 0.8, 0.2]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
    </group>
  );
}

