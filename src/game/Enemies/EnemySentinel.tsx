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
import { useFrame, useThree } from '@react-three/fiber';
import { useEnemyFSM, type EnemyState } from './EnemyBase';
import { applyDamageToPlayer } from './enemyDamage';
import { useGameState } from '../../state/gameState';
import { AudioManager } from '../audio/AudioManager';
import * as THREE from 'three';

interface EnemySentinelProps {
  initialPosition: [number, number, number];
  playerPosition: [number, number, number];
  isActivated: boolean;
}

export function EnemySentinel({ initialPosition, playerPosition, isActivated }: EnemySentinelProps) {
  const prevStateRef = useRef<EnemyState | null>(null);
  const attackCooldownRef = useRef<number>(0);
  const healthRef = useRef<number>(100); // Sentinel starts with 100 health
  const maxHealth = 100;
  const phase2Threshold = 40; // Health percentage for phase 2
  const isPhase2Ref = useRef<boolean>(false);
  const lastDamageTime = useRef<number>(0);
  const damageCooldown = 0.5; // Prevent rapid damage spam
  
  const { scene } = useThree();
  const isSwinging = useGameState((state) => state.isSwinging);
  const setSentinelDefeated = useGameState((state) => state.setSentinelDefeated);
  
  // Zone 4 (Core Chamber) patrol points - small circle around center
  const patrolPoints: [number, number, number][] = [
    [38, 0, 2],   // North
    [42, 0, 0],   // East
    [40, 0, -2],  // South
    [38, 0, 0],   // West
  ];
  
  // Sentinel-specific stats
  const detectionRadius = 10; // meters
  const attackRange = 4; // meters
  const phase1MoveSpeed = 2.5; // Slower than Shambler
  const phase2MoveSpeed = 3.5; // Faster in phase 2
  const patrolSpeed = 2.0;
  const ATTACK_COOLDOWN = 1.5; // seconds
  const ATTACK_DAMAGE = 25; // High damage
  const PLAYER_ATTACK_RANGE = 2.5; // meters - player can attack Sentinel within this range
  const PLAYER_ATTACK_DAMAGE = 10; // damage per player swing
  
  // Get current move speed based on phase
  const getMoveSpeed = () => isPhase2Ref.current ? phase2MoveSpeed : phase1MoveSpeed;
  
  const handleStateChange = (newState: EnemyState, _oldState: EnemyState) => {
    // Log state transitions
    console.log(`Sentinel: state -> ${newState}`);
    
    // Log phase 2 activation
    if (!isPhase2Ref.current && healthRef.current <= phase2Threshold) {
      isPhase2Ref.current = true;
      console.log('Sentinel: PHASE 2 ACTIVATED');
    }
  };
  
  const { enemyRef, currentState } = useEnemyFSM({
    initialPosition,
    patrolPoints: isActivated ? patrolPoints : [], // Only patrol if activated
    detectionRadius,
    attackRange,
    playerPosition,
    moveSpeed: getMoveSpeed(), // Will update dynamically
    patrolSpeed,
    onStateChange: handleStateChange,
  });
  
  // Update move speed when phase changes
  useEffect(() => {
    if (isPhase2Ref.current && enemyRef.current) {
      // Phase 2 is active - speed is handled by dynamic getMoveSpeed
    }
  }, [isPhase2Ref.current]);
  
  // Handle attack damage and phase changes
  useFrame((_state, delta) => {
    if (!enemyRef.current || !isActivated) return;
    
    // Check if Sentinel is defeated
    if (healthRef.current <= 0) {
      setSentinelDefeated(true);
      AudioManager.playSFX('enemyDeath');
      // Hide or disable Sentinel (could add death animation here)
      enemyRef.current.visible = false;
      return;
    }
    
    // Update attack cooldown
    if (attackCooldownRef.current > 0) {
      attackCooldownRef.current -= delta;
    }
    
    // Check for phase transition
    const healthPercent = (healthRef.current / maxHealth) * 100;
    if (healthPercent <= phase2Threshold && !isPhase2Ref.current) {
      isPhase2Ref.current = true;
      console.log('Sentinel: PHASE 2 ACTIVATED');
    }
    
    // Handle attack damage
    if (currentState === 'attack' && attackCooldownRef.current <= 0) {
      if (isPhase2Ref.current) {
        // Phase 2: Sweep attack
        console.log('Sentinel: SWEEP ATTACK');
      } else {
        // Phase 1: Normal attack
        console.log('Sentinel: ATTACK');
      }
      
      applyDamageToPlayer(ATTACK_DAMAGE, 'Sentinel');
      attackCooldownRef.current = ATTACK_COOLDOWN;
    }
    
    // Reset cooldown when leaving attack state
    if (prevStateRef.current === 'attack' && currentState !== 'attack') {
      attackCooldownRef.current = 0;
    }
    
    // Check if player is attacking Sentinel
    let playerPosition3D: THREE.Vector3 | null = null;
    
    scene.traverse((object) => {
      if (object instanceof THREE.Group) {
        let hasCapsule = false;
        object.traverse((child) => {
          if (child instanceof THREE.Mesh && child.geometry instanceof THREE.CapsuleGeometry) {
            hasCapsule = true;
          }
        });
        if (hasCapsule) {
          playerPosition3D = object.position.clone();
        }
      }
    });
    
    if (playerPosition3D && isSwinging && healthRef.current > 0) {
      const enemyPos = enemyRef.current.position;
      const distance = enemyPos.distanceTo(playerPosition3D);
      
      if (distance <= PLAYER_ATTACK_RANGE) {
        const now = performance.now() / 1000;
        
        // Prevent damage spam with cooldown
        if (now - lastDamageTime.current >= damageCooldown) {
          healthRef.current = Math.max(0, healthRef.current - PLAYER_ATTACK_DAMAGE);
          lastDamageTime.current = now;
          console.log(`Sentinel: hit! Health: ${healthRef.current}/${maxHealth}`);
          
          if (healthRef.current <= 0) {
            console.log('Sentinel: DEFEATED');
            setSentinelDefeated(true);
            AudioManager.playSFX('enemyDeath');
          }
        }
      }
    }
  });
  
  // Track state changes
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
      console.log('Sentinel: spawned');
      healthRef.current = maxHealth;
      isPhase2Ref.current = false;
    }
  }, [isActivated]);
  
  // Don't render if defeated
  if (healthRef.current <= 0) {
    return null;
  }
  
  const healthPercent = (healthRef.current / maxHealth) * 100;
  const isPhase2 = healthPercent <= phase2Threshold;
  
  return (
    <group ref={enemyRef} position={initialPosition}>
      {/* TODO: Replace this placeholder with sentinelZombot.glb model */}
      {/* Sentinel: Larger than Shambler, amber/red core */}
      
      {/* Main body - large, taller box */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <boxGeometry args={[0.8, 2, 0.7]} />
        <meshStandardMaterial 
          color="#2a2a2a" 
          emissive={isPhase2 ? "#ff6600" : "#ffaa00"} 
          emissiveIntensity={0.3}
        />
      </mesh>
      
      {/* Core/chest - large amber/red glowing core */}
      <mesh position={[0, 1.5, 0.4]} castShadow>
        <sphereGeometry args={[0.3, 12, 12]} />
        <meshStandardMaterial 
          color="#1a1a1a" 
          emissive={isPhase2 ? "#ff4400" : "#ff8800"} 
          emissiveIntensity={isPhase2 ? 1.5 : 1.2}
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
      
      {/* Health bar indicator (simple visual representation) */}
      <mesh position={[0, 3.2, 0]} visible={true}>
        <boxGeometry args={[1, 0.1, 0.01]} />
        <meshStandardMaterial 
          color="#ff0000" 
          emissive="#ff0000" 
          emissiveIntensity={0.5}
        />
      </mesh>
      <mesh position={[0, 3.2, 0.01]} visible={true}>
        <boxGeometry args={[(healthRef.current / maxHealth) * 1, 0.1, 0.01]} />
        <meshStandardMaterial 
          color={isPhase2 ? "#ff8800" : "#00ff00"} 
          emissive={isPhase2 ? "#ff8800" : "#00ff00"} 
          emissiveIntensity={0.8}
        />
      </mesh>
    </group>
  );
}

