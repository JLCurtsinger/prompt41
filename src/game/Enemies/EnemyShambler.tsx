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

// Animation mapping for future GLTF animations
type ShamblerState = 'idle' | 'patrol' | 'chase' | 'attack';

const animationByState: Record<ShamblerState, string> = {
  idle: 'Idle',
  patrol: 'Walk',
  chase: 'Run',
  attack: 'Attack',
};

// Animation hook for future GLTF integration
function playShamblerAnimation(
  state: ShamblerState,
  previousState: ShamblerState | null,
  // TODO: Add GLTF mixer parameter once Colton's model is imported
  // mixer: THREE.AnimationMixer | null
) {
  if (state === previousState) return; // Only play animation on state change
  
  const animationName = animationByState[state];
  // TODO: Wire this into GLTF animation mixer once model is imported
  // if (mixer) {
  //   const action = mixer.clipAction(animationName);
  //   action.reset().play();
  // }
  
  // Debug log for now
  if (previousState !== null) {
    console.log(`Shambler animation: ${animationByState[previousState]} -> ${animationName}`);
  }
}

export function EnemyShambler({ initialPosition, playerPosition, isActivated }: EnemyShamblerProps) {
  const prevStateRef = useRef<EnemyState | null>(null);
  const attackWindUpTimer = useRef<number>(0);
  const hasLoggedAttack = useRef<boolean>(false);
  const attackCooldownRef = useRef<number>(0);

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

  const handleStateChange = (newState: EnemyState, oldState: EnemyState) => {
    // Log state transitions
    console.log(`Shambler: state -> ${newState}`);
    
    // Play animation on state change
    playShamblerAnimation(newState as ShamblerState, oldState as ShamblerState | null);
    
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

  // Handle attack wind-up and damage
  // NOTE: Movement during chase/patrol is handled by the base FSM (EnemyBase.tsx)
  // This hook only handles attack logic - no position changes that would conflict with base movement
  useFrame((_state, delta) => {
    if (!enemyRef.current || !isActivated) return;

    // Handle attack wind-up delay and damage
    // IMPORTANT: In attack state, enemy should NOT move (base FSM already stops movement)
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
    
    // Update previous state for tracking
    prevStateRef.current = currentState;
  });

  // Track state changes (prevStateRef is now updated in useFrame)
  // This effect is kept for compatibility but state tracking is done in useFrame

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

