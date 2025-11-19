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

interface EnemyCrawlerProps {
  initialPosition: [number, number, number];
  playerPosition: [number, number, number];
}

export function EnemyCrawler({ initialPosition, playerPosition }: EnemyCrawlerProps) {
  const prevStateRef = useRef<EnemyState | null>(null);
  const attackCooldownRef = useRef<number>(0);
  const ATTACK_COOLDOWN = 0.8; // seconds
  const ATTACK_DAMAGE = 5;

  // Zone 2 (Processing Yard) patrol points - hardcoded positions
  // These form a small patrol loop in the processing yard area
  const patrolPoints: [number, number, number][] = [
    [-3, 0, 2],   // Near machinery block
    [3, 0, -2],   // Near another machinery block
    [0, 0, -6],   // Near terminal area
  ];

  // Crawler-specific stats: fast, low health
  const detectionRadius = 8; // meters
  const attackRange = 2; // meters
  const moveSpeed = 5; // Fast movement speed
  const patrolSpeed = 3; // Slightly slower patrol speed

  const handleStateChange = (newState: EnemyState, _oldState: EnemyState) => {
    // Log state transitions
    console.log(`Crawler: state -> ${newState}`);
    
    // Log attack action
    if (newState === 'attack') {
      console.log('Crawler: ATTACK');
    }
  };

  const { enemyRef, currentState } = useEnemyFSM({
    initialPosition,
    patrolPoints,
    detectionRadius,
    attackRange,
    playerPosition,
    moveSpeed,
    patrolSpeed,
    onStateChange: handleStateChange,
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

  // Handle attack damage with cooldown
  useFrame((_state, delta) => {
    // Update cooldown timer
    if (attackCooldownRef.current > 0) {
      attackCooldownRef.current -= delta;
    }

    // Apply damage when in attack state and cooldown is ready
    if (currentState === 'attack' && attackCooldownRef.current <= 0) {
      applyDamageToPlayer(ATTACK_DAMAGE, 'Crawler');
      attackCooldownRef.current = ATTACK_COOLDOWN;
    }

    // Reset cooldown when leaving attack state
    if (prevStateRef.current === 'attack' && currentState !== 'attack') {
      attackCooldownRef.current = 0;
    }
  });

  return (
    <group ref={enemyRef} position={initialPosition}>
      {/* TODO: Replace this placeholder with crawlerZombot.glb model */}
      {/* Low-profile mesh: scaled box/sphere combo for Crawler Zombot */}
      {/* Main body - low, wide box */}
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[0.8, 0.4, 1.2]} />
        <meshStandardMaterial 
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

