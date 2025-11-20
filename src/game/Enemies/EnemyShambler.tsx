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
import { registerEnemy, unregisterEnemy } from './enemyRegistry';
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
// NOTE: This handles GLTF-based visual animations (walk/run/idle/attack clips), NOT movement logic.
// Movement is handled separately by the state machine and useFrame hooks.
function playShamblerAnimation(
  state: ShamblerState,
  previousState: ShamblerState | null,
  // TODO: Load GLTF model and create AnimationMixer:
  // 1. Import shamblerZombot.glb using useGLTF or GLTFLoader
  // 2. Create mixer: const mixer = new THREE.AnimationMixer(model)
  // 3. Store clips: const clips = animations.map(clip => clip.name)
  // 4. Pass mixer to this function
  // mixer: THREE.AnimationMixer | null
) {
  if (state === previousState) return; // Only play animation on state change
  
  const animationName = animationByState[state];
  // TODO: Once GLTF model and mixer are available, wire this up:
  // if (mixer) {
  //   const clips = mixer.getRoot().animations || [];
  //   const clip = clips.find(c => c.name === animationName);
  //   if (clip) {
  //     const action = mixer.clipAction(clip);
  //     action.reset().fadeIn(0.2).play();
  //   }
  // }
  
  // Debug log for now (only logs on actual state changes, not every frame)
  if (previousState !== null) {
    console.log(`Shambler animation: ${animationByState[previousState]} -> ${animationName}`);
  }
}

export function EnemyShambler({ initialPosition, playerPosition, isActivated }: EnemyShamblerProps) {
  const prevStateRef = useRef<EnemyState | null>(null);
  const attackWindUpTimer = useRef<number>(0);
  const hasLoggedAttack = useRef<boolean>(false);
  const attackCooldownRef = useRef<number>(0);
  const wasHitRef = useRef<boolean>(false);
  const hitFlashTimer = useRef<number>(0);
  const materialRef = useRef<THREE.MeshStandardMaterial | null>(null);

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

  const enemyId = `shambler-${initialPosition.join('-')}`;
  
  const { enemyRef, getCurrentState, health, maxHealth, isDead, takeDamage } = useEnemyFSM({
    initialPosition,
    patrolPoints: isActivated ? patrolPoints : [], // Only patrol if activated
    detectionRadius,
    attackRange,
    playerPosition, // Base player position
    moveSpeed,
    patrolSpeed,
    onStateChange: handleStateChange,
    maxHealth: 100, // Shambler has 100 HP
    enemyId,
  });
  
  // Wrap takeDamage to add hit flash
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

  // Handle attack wind-up and damage, plus fallback movement for chase state
  // NOTE: Movement during chase/patrol is primarily handled by the base FSM (EnemyBase.tsx)
  // This hook handles attack logic and provides fallback movement to ensure Shambler moves
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
          materialRef.current.emissiveIntensity = 0.2;
        }
      } else if (materialRef.current) {
        // Flash white/red briefly
        materialRef.current.emissiveIntensity = 0.8;
      }
    }

    // Fallback movement in chase state (ensures movement even if base FSM has issues)
    if (currentState === 'chase') {
      const enemyPos = enemyRef.current.position;
      const playerPos = new THREE.Vector3(...playerPosition);
      
      // Calculate direction to player (XZ plane only, no vertical movement)
      const direction = playerPos.clone().sub(enemyPos);
      direction.y = 0; // Lock Y movement
      const distance = direction.length();
      
      if (distance > 0.01) { // Avoid division by zero and don't move if already very close
        direction.normalize();
        
        // Apply movement: frame-rate independent
        const movement = direction.multiplyScalar(moveSpeed * delta);
        enemyRef.current.position.add(movement);
        
        // Debug: log position occasionally (only every ~60 frames to avoid spam)
        // Commented out by default, uncomment for debugging if needed
        // if (Math.random() < 0.016) { // ~1% chance per frame = ~once per second at 60fps
        //   console.log('Shambler chase pos:', enemyRef.current.position.toArray());
        // }
      }
    }

    // Handle attack wind-up delay and damage
    // IMPORTANT: In attack state, enemy should NOT move (base FSM already stops movement)
    // Only attack if not dead
    if (currentState === 'attack' && !isDead) {
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

  // Set initial position via ref (NOT via position prop - that would override manual updates)
  useEffect(() => {
    if (enemyRef.current) {
      enemyRef.current.position.set(...initialPosition);
    }
  }, [initialPosition]);

  // Log spawn when activated
  useEffect(() => {
    if (isActivated) {
      console.log('Shambler: spawned');
    }
  }, [isActivated]);

  return (
    <group ref={enemyRef}>
      {/* TODO: Replace this placeholder with shamblerZombot.glb model */}
      {/* Taller, humanoid silhouette for Shambler Zombot */}
      
      {/* Main torso - taller box */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <boxGeometry args={[0.6, 1.4, 0.5]} />
        <meshStandardMaterial 
          ref={materialRef}
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

