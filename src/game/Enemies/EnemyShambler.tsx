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
import { EnemyHealthBar } from './EnemyHealthBar';
import { useGameState } from '../../state/gameState';
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
}

export function EnemyShambler({ initialPosition, playerPosition, isActivated }: EnemyShamblerProps) {
  const prevStateRef = useRef<EnemyState | null>(null);
  const attackWindUpTimer = useRef<number>(0);
  const hasLoggedAttack = useRef<boolean>(false);
  const attackCooldownRef = useRef<number>(0);
  const wasHitRef = useRef<boolean>(false);
  const hitFlashTimer = useRef<number>(0);
  const materialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  
  // Death animation state
  const deathTimer = useRef<number>(0);
  const isDying = useRef<boolean>(false);
  const hasUnregistered = useRef<boolean>(false);
  const DEATH_DURATION = 0.6; // seconds
  
  // Animation state for bob/lean
  const animationTime = useRef<number>(0);
  const attackLungeTimer = useRef<number>(0);
  
  const { incrementEnemiesKilled, checkWinCondition } = useGameState();

  // Zone 3 (Conduit Hall) patrol points - hardcoded positions
  // These form a small patrol in the corridor area
  const patrolPoints: [number, number, number][] = [
    [15, 0, -2],   // Left side of corridor
    [20, 0, 0],   // Center of corridor
    [15, 0, 2],   // Right side of corridor
  ];

  // Shambler-specific stats: slow, heavy, jerky
  // Movement speeds - slower than Crawler but still clearly visible
  const SHAMBLER_PATROL_SPEED = 1.0; // units/sec - deliberate, slow
  const SHAMBLER_CHASE_SPEED = 2.0; // units/sec - threatening but not fast
  const SHAMBLER_ATTACK_RANGE = 2.5; // meters (slightly longer for heavy swing)
  
  const detectionRadius = 6; // meters (smaller than Crawler)
  const attackRange = SHAMBLER_ATTACK_RANGE;
  const moveSpeed = SHAMBLER_CHASE_SPEED;
  const patrolSpeed = SHAMBLER_PATROL_SPEED;
  const ATTACK_WIND_UP_TIME = 0.5; // seconds before attack logs
  const ATTACK_COOLDOWN = 1.2; // seconds between attacks
  const ATTACK_DAMAGE = 15; // Heavy damage

  const handleStateChange = (newState: EnemyState, oldState: EnemyState) => {
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
  
  const { enemyRef, getCurrentState, health, maxHealth, isDead, takeDamage, getHealth } = useEnemyFSM({
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
      getEnemyName: () => 'Shambler', // Enemy name for HUD
    };
    
    registerEnemy(enemyId, instance);
    
    return () => {
      unregisterEnemy(enemyId);
    };
  }, [enemyId, isDead, getHealth, maxHealth]);

  // Handle attack wind-up and damage
  // NOTE: Movement during chase/patrol is handled by the base FSM (EnemyBase.tsx)
  useFrame((_state, delta) => {
    if (!enemyRef.current || !isActivated) return;
    
    // Handle death animation
    if (isDead && !hasUnregistered.current) {
      if (!isDying.current) {
        isDying.current = true;
        deathTimer.current = 0;
        console.log('[Shambler]', enemyId, 'death sequence started');
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
        console.log('[Shambler]', enemyId, 'unregistered');
      }
      return; // Stop all other behavior during death
    }
    
    // Stop all behavior if dead (after death animation)
    if (isDead) return;

    // Get current state (reactive)
    const currentState = getCurrentState();
    
    // Update registry (re-register with current position) - this ensures isDead closure is fresh
    const instance = {
      id: enemyId,
      getPosition: () => enemyRef.current?.position.clone() ?? new THREE.Vector3(),
      takeDamage: (amount: number) => wrappedTakeDamage.current(amount),
      isDead: () => isDead, // Fresh closure every frame ensures current value
      getHealth: () => getHealth(), // Get current health
      getMaxHealth: () => maxHealth, // Get max health
      getEnemyName: () => 'Shambler', // Enemy name for HUD
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
          materialRef.current.emissiveIntensity = 0.2;
        }
      } else if (materialRef.current) {
        // Flash white/red briefly
        materialRef.current.emissiveIntensity = 0.8;
      }
    }

    // Log state changes for debugging (concise)
    if (prevStateRef.current !== currentState) {
      const distanceToPlayer = enemyRef.current.position.distanceTo(new THREE.Vector3(...playerPosition));
      console.log('[Shambler]', enemyId, 'state ->', currentState, 'distance:', distanceToPlayer.toFixed(1));
    }
    
    // Visual animations only - movement comes from EnemyBase FSM
    // INTENTIONAL: We only adjust position.y for bob and rotation for visual feedback
    // We do NOT write to position.x or position.z - those are controlled by EnemyBase
    if (enemyRef.current) {
      const baseGroundY = initialPosition[1];
      
      if (currentState === 'patrol') {
        // Patrol: slight vertical bob only (no X/Z movement)
        const bobAmount = 0.06;
        const bobSpeed = 2.0;
        const bob = Math.sin(animationTime.current * bobSpeed) * bobAmount;
        enemyRef.current.position.y = baseGroundY + bob;
        
        // Tiny sway (rotation only)
        const swayAmount = 0.03;
        const swaySpeed = 1.5;
        enemyRef.current.rotation.z = Math.sin(animationTime.current * swaySpeed) * swayAmount;
        enemyRef.current.rotation.x = 0;
      } else if (currentState === 'chase') {
        // Chase: vertical bob + forward lean (rotation only, no position changes)
        const bobAmount = 0.1;
        const bobSpeed = 3.0;
        const bob = Math.sin(animationTime.current * bobSpeed) * bobAmount;
        enemyRef.current.position.y = baseGroundY + bob;
        
        // Lean forward (rotation only - additive, doesn't reset transform)
        enemyRef.current.rotation.x = -0.15; // More lean than Crawler
        enemyRef.current.rotation.z = 0;
      } else if (currentState === 'attack') {
        // Attack: REMOVED position.copy() and lunge movement
        // Now only visual feedback: stronger forward lean or shake (rotation only)
        // Position is NOT modified - EnemyBase FSM controls all movement
        const bobAmount = 0.08;
        const bobSpeed = 4.0;
        const bob = Math.sin(animationTime.current * bobSpeed) * bobAmount;
        enemyRef.current.position.y = baseGroundY + bob;
        
        // Stronger forward lean or brief shake (rotation only)
        const shakeAmount = 0.08;
        const shakeSpeed = 8.0;
        enemyRef.current.rotation.x = -0.2 + Math.sin(animationTime.current * shakeSpeed) * shakeAmount;
        enemyRef.current.rotation.z = Math.sin(animationTime.current * shakeSpeed * 1.3) * shakeAmount * 0.5;
      } else {
        // Idle: reset to base position and rotation
        enemyRef.current.position.y = baseGroundY;
        enemyRef.current.rotation.x = 0;
        enemyRef.current.rotation.z = 0;
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
        hasLoggedAttack.current = true;
        console.log('[Shambler] HEAVY ATTACK');
      }
      
      // Apply damage when wind-up completes and cooldown allows
      if (attackWindUpTimer.current >= ATTACK_WIND_UP_TIME && attackCooldownRef.current <= 0) {
        const distanceToPlayer = enemyRef.current.position.distanceTo(new THREE.Vector3(...playerPosition));
        console.log('[Shambler] attackTriggered: distance=', distanceToPlayer.toFixed(2), 'range=', attackRange);
        
        if (distanceToPlayer <= attackRange) {
          applyDamageToPlayer(ATTACK_DAMAGE, 'Shambler');
          attackCooldownRef.current = ATTACK_COOLDOWN;
          attackLungeTimer.current = 0; // Start lunge animation
          console.log('[Shambler] Applied damage:', ATTACK_DAMAGE);
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


  return (
    <group ref={enemyRef}>
      {/* Health bar above enemy */}
      <EnemyHealthBar health={health} maxHealth={maxHealth} getHealth={getHealth} />
      
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

