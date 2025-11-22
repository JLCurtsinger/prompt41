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
  patrolPoints?: [number, number, number][];
}

export function EnemyCrawler({
  initialPosition,
  playerPosition,
  patrolPoints = [],
}: EnemyCrawlerProps) {
  const enemyId = `crawler-${initialPosition.join('-')}`;

  const prevStateRef = useRef<EnemyState | null>(null);
  const attackCooldownRef = useRef(0);
  const wasHitRef = useRef(false);
  const hitFlashTimer = useRef(0);
  const materialRef = useRef<THREE.MeshStandardMaterial | null>(null);

  // simple death handling
  const deathTimer = useRef(0);
  const hasStartedDying = useRef(false);
  const hasFinishedDeath = useRef(false);
  const DEATH_DURATION = 0.5;

  const animationTime = useRef(0);

  const { incrementEnemiesKilled, checkWinCondition } = useGameState();

  // Crawler stats
  const ATTACK_COOLDOWN = 0.8;
  const ATTACK_DAMAGE = 5;

  const CRAWLER_PATROL_SPEED = 1.5;
  const CRAWLER_CHASE_SPEED = 3.0;
  const CRAWLER_ATTACK_RANGE = 2.0;
  const DETECTION_RADIUS = 8;

  const handleStateChange = (newState: EnemyState, oldState: EnemyState) => {
    if (newState !== oldState) {
      console.log('[Crawler]', enemyId, 'state ->', newState);
    }
  };

  // NOTE: we now ONLY use EnemyBase for FSM + movement.
  const {
    enemyRef,
    getCurrentState,
    getHealth,
    health,
    maxHealth,
    takeDamage,
    updateFSM,
  } = useEnemyFSM({
    initialPosition,
    patrolPoints,
    detectionRadius: DETECTION_RADIUS,
    attackRange: CRAWLER_ATTACK_RANGE,
    playerPosition,
    moveSpeed: CRAWLER_CHASE_SPEED,
    patrolSpeed: CRAWLER_PATROL_SPEED,
    onStateChange: handleStateChange,
    maxHealth: 50,
    enemyId,
  });

  // Wrap takeDamage to trigger hit flash + logging
  const wrappedTakeDamageRef = useRef<(amount: number) => void>(() => {});

  useEffect(() => {
    wrappedTakeDamageRef.current = (amount: number) => {
      const healthAfter = takeDamage(amount);
      wasHitRef.current = true;
      hitFlashTimer.current = 0;
      console.log(
        '[Combat] Baton hit enemy',
        enemyId,
        'for',
        amount,
        '=> hp:',
        healthAfter,
        '/',
        maxHealth,
      );
    };
  }, [takeDamage, enemyId, maxHealth]);

  // Register enemy once for melee hit detection
  useEffect(() => {
    if (!enemyRef.current) return;

    const instance = {
      id: enemyId,
      getPosition: () => enemyRef.current?.position.clone() ?? new THREE.Vector3(),
      takeDamage: (amount: number) => wrappedTakeDamageRef.current(amount),
      isDead: () => getHealth() <= 0,
      getHealth: () => getHealth(),
      getMaxHealth: () => maxHealth,
      getEnemyName: () => 'Crawler',
    };

    registerEnemy(enemyId, instance);

    return () => {
      unregisterEnemy(enemyId);
    };
  }, [enemyId, enemyRef, getHealth, maxHealth]);

  // Ensure initial position
  useEffect(() => {
    if (enemyRef.current) {
      enemyRef.current.position.set(...initialPosition);
    }
  }, [initialPosition, enemyRef]);

  useFrame((_state, delta) => {
    if (!enemyRef.current || hasFinishedDeath.current) return;

    // Run shared FSM: handles PATROL / CHASE / ATTACK movement
    updateFSM(delta);

    const currentState = getCurrentState();
    const currentHealth = getHealth();
    const isDead = currentHealth <= 0;

    // --- Death animation + cleanup ---
    if (isDead) {
      if (!hasStartedDying.current) {
        hasStartedDying.current = true;
        deathTimer.current = 0;
        console.log('[Crawler]', enemyId, 'death sequence started');
      }

      deathTimer.current += delta;
      const t = Math.min(deathTimer.current / DEATH_DURATION, 1);
      const scale = 1 - t;

      enemyRef.current.scale.set(scale, scale, scale);
      enemyRef.current.position.y = initialPosition[1] - t * 0.5;

      if (t >= 1 && !hasFinishedDeath.current) {
        hasFinishedDeath.current = true;
        unregisterEnemy(enemyId);
        incrementEnemiesKilled();
        checkWinCondition();
        console.log('[Crawler]', enemyId, 'unregistered after death');
      }

      return;
    }

    // Track state transitions purely for logs
    if (prevStateRef.current !== currentState) {
      prevStateRef.current = currentState;
    }

    // --- Attack damage with cooldown ---
    if (attackCooldownRef.current > 0) {
      attackCooldownRef.current -= delta;
    }

    if (currentState === 'attack' && attackCooldownRef.current <= 0) {
      applyDamageToPlayer(ATTACK_DAMAGE, 'Crawler');
      attackCooldownRef.current = ATTACK_COOLDOWN;
    }

    // --- Visual animation only (bob/lean) ---
    animationTime.current += delta;
    const baseY = initialPosition[1];

    if (enemyRef.current) {
      const t = animationTime.current;

      if (currentState === 'patrol') {
        const bob = Math.sin(t * 3.0) * 0.05;
        enemyRef.current.position.y = baseY + bob;
        enemyRef.current.rotation.x = 0;
        enemyRef.current.rotation.z = Math.sin(t * 2.0) * 0.02;
      } else if (currentState === 'chase') {
        const bob = Math.sin(t * 4.0) * 0.08;
        enemyRef.current.position.y = baseY + bob;
        enemyRef.current.rotation.x = -0.1;
        enemyRef.current.rotation.z = 0;
      } else if (currentState === 'attack') {
        const bob = Math.sin(t * 5.0) * 0.06;
        const shake = Math.sin(t * 10.0) * 0.05;
        enemyRef.current.position.y = baseY + bob;
        enemyRef.current.rotation.x = -0.15 + shake;
        enemyRef.current.rotation.z = Math.sin(t * 13.0) * 0.025;
      } else {
        enemyRef.current.position.y = baseY;
        enemyRef.current.rotation.x = 0;
        enemyRef.current.rotation.z = 0;
      }
    }

    // --- Hit flash emissive pulse ---
    if (wasHitRef.current) {
      hitFlashTimer.current += delta;
      if (hitFlashTimer.current > 0.1) {
        wasHitRef.current = false;
        hitFlashTimer.current = 0;
        if (materialRef.current) {
          materialRef.current.emissiveIntensity = 0.3;
        }
      } else if (materialRef.current) {
        materialRef.current.emissiveIntensity = 0.8;
      }
    }
  });

  return (
    <group ref={enemyRef}>
      <EnemyHealthBar health={health} maxHealth={maxHealth} getHealth={getHealth} />

      {/* Body */}
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[0.8, 0.4, 1.2]} />
        <meshStandardMaterial
          ref={materialRef}
          color="#2a2a2a"
          emissive="#ff4444"
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Core / head */}
      <mesh position={[0, 0.4, 0.5]} castShadow>
        <sphereGeometry args={[0.25, 8, 8]} />
        <meshStandardMaterial
          color="#1a1a1a"
          emissive="#ff4400"
          emissiveIntensity={1.2}
        />
      </mesh>

      {/* Legs */}
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