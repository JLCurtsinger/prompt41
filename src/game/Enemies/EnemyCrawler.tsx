// TEST PLAN (Crawler Zombot - Standalone Version)
// 1. Spawn:
//    - Spawns at initialPosition in Zone 2
// 2. Patrol:
//    - Moves between provided patrolPoints in Zone 2
//    - Logs state transitions in console
// 3. Detection:
//    - When player enters detection radius, logs "state -> chase" and moves toward player
// 4. Attack:
//    - When within attack range, logs "ATTACK" and applies 5 damage with 0.8s cooldown
// 5. Return to Patrol:
//    - When player leaves detection radius, returns to patrol and resumes waypoint loop

import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { EnemyHealthBar } from './EnemyHealthBar';
import { applyDamageToPlayer } from './enemyDamage';
import { registerEnemy, unregisterEnemy } from './enemyRegistry';
import { useGameState } from '../../state/gameState';

// DEBUG: Toggle crawler debug helpers visibility
const DEBUG_SHOW_CRAWLER_HELPERS = true;
// DEBUG: Exaggerate movement speed for testing (multiplies PATROL_SPEED and CHASE_SPEED)
const DEBUG_EXAGGERATE_CRAWLER_SPEED = false;

type CrawlerState = 'idle' | 'patrol' | 'chase' | 'attack';

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
  const enemyRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial | null>(null);

  const stateRef = useRef<CrawlerState>('idle');
  const patrolIndexRef = useRef(0);

  const attackCooldownRef = useRef(0);
  const prevStateRef = useRef<CrawlerState>('idle');

  const healthRef = useRef(50);
  const maxHealth = 50;
  const deathTimerRef = useRef(0);
  const isDyingRef = useRef(false);
  const hasFinishedDeathRef = useRef(false);

  const animationTimeRef = useRef(0);
  const wasHitRef = useRef(false);
  const hitFlashTimerRef = useRef(0);
  // DEBUG: Throttled logging timer
  const logTimerRef = useRef(0);
  // DEBUG: Chase target position for visualization
  const chaseTargetRef = useRef<THREE.Vector3 | null>(null);

  const enemyId = `crawler-${initialPosition.join('-')}`;

  const { incrementEnemiesKilled, checkWinCondition } = useGameState();

  // Constants tuned for visibility
  const DETECTION_RADIUS = 8;
  const ATTACK_RANGE = 2;
  const PATROL_SPEED = DEBUG_EXAGGERATE_CRAWLER_SPEED ? 1.5 * 3 : 1.5;
  const CHASE_SPEED = DEBUG_EXAGGERATE_CRAWLER_SPEED ? 3.0 * 3 : 3.0;
  const ATTACK_COOLDOWN = 0.8;
  const ATTACK_DAMAGE = 5;
  const PATROL_PAUSE_DURATION = 1.5;
  const DEATH_DURATION = 0.5;

  const patrolPauseTimerRef = useRef(0);
  const isPausedAtWaypointRef = useRef(false);

  // Initial state based on whether patrol points exist
  useEffect(() => {
    if (patrolPoints.length > 0) {
      stateRef.current = 'patrol';
      patrolIndexRef.current = 0;
      console.log('[Crawler]', enemyId, 'state -> patrol (init)');
    } else {
      stateRef.current = 'idle';
      console.log('[Crawler]', enemyId, 'state -> idle (no patrol points)');
    }
  }, [enemyId, patrolPoints.length]);

  // DEBUG: Initial position is set once in useEffect; do not reset each frame
  // Set initial position (only runs on mount or when initialPosition prop changes)
  useEffect(() => {
    if (enemyRef.current) {
      enemyRef.current.position.set(...initialPosition);
    }
  }, [initialPosition]);

  // Register with enemyRegistry for baton hits / HUD
  useEffect(() => {
    const instance = {
      id: enemyId,
      getPosition: () => enemyRef.current?.position.clone() ?? new THREE.Vector3(),
      takeDamage: (amount: number) => {
        const before = healthRef.current;
        healthRef.current = Math.max(0, before - amount);
        wasHitRef.current = true;
        hitFlashTimerRef.current = 0;
        console.log(
          '[Combat] Baton hit Crawler',
          enemyId,
          'for',
          amount,
          '=> hp:',
          healthRef.current,
          '/',
          maxHealth,
        );
      },
      isDead: () => healthRef.current <= 0,
      getHealth: () => healthRef.current,
      getMaxHealth: () => maxHealth,
      getEnemyName: () => 'Crawler',
    };

    registerEnemy(enemyId, instance);

    return () => {
      unregisterEnemy(enemyId);
    };
  }, [enemyId, maxHealth]);

  // State transition helper with logging
  const setState = (nextState: CrawlerState, debugInfo?: string) => {
    const prev = stateRef.current;
    if (prev === nextState) return;
    stateRef.current = nextState;
    console.log(
      '[Crawler]',
      enemyId,
      'state ->',
      nextState,
      debugInfo ? `(${debugInfo})` : '',
    );
  };

  // Main behavior loop
  useFrame((_state, delta) => {
    if (!enemyRef.current || hasFinishedDeathRef.current) return;

    // Death handling
    if (healthRef.current <= 0) {
      if (!isDyingRef.current) {
        isDyingRef.current = true;
        deathTimerRef.current = 0;
        console.log('[Crawler]', enemyId, 'death sequence started');
      }

      deathTimerRef.current += delta;
      const t = Math.min(deathTimerRef.current / DEATH_DURATION, 1);

      const scale = 1 - t;
      enemyRef.current.scale.set(scale, scale, scale);
      enemyRef.current.position.y = initialPosition[1] - t * 0.5;

      if (t >= 1 && !hasFinishedDeathRef.current) {
        hasFinishedDeathRef.current = true;
        unregisterEnemy(enemyId);
        incrementEnemiesKilled();
        checkWinCondition();
        console.log('[Crawler]', enemyId, 'unregistered after death');
      }

      return;
    }

    // Compute positions
    const enemyPos = enemyRef.current.position.clone();
    const playerPos = new THREE.Vector3(...playerPosition);
    const distanceToPlayer = enemyPos.distanceTo(playerPos);

    const currentState = stateRef.current;

    // DEBUG: Update chase target for visualization (only show when chasing)
    if (DEBUG_SHOW_CRAWLER_HELPERS) {
      if (currentState === 'chase') {
        chaseTargetRef.current = playerPos.clone();
      } else {
        chaseTargetRef.current = null;
      }
    }

    // DEBUG: Throttled logging (once per 0.5 seconds)
    if (DEBUG_SHOW_CRAWLER_HELPERS) {
      logTimerRef.current += delta;
      if (logTimerRef.current >= 0.5) {
        logTimerRef.current = 0;
        const pos = enemyRef.current.position;
        console.log(
          '[Crawler DEBUG]',
          enemyId,
          '| state =',
          currentState,
          '| pos =',
          `(${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})`,
          '| playerDist =',
          distanceToPlayer.toFixed(2),
        );
      }
    }

    // FSM transitions + movement
    if (currentState === 'patrol') {
      if (distanceToPlayer <= DETECTION_RADIUS) {
        setState('chase', `distance: ${distanceToPlayer.toFixed(2)}`);
      } else if (patrolPoints.length > 0 && !isPausedAtWaypointRef.current) {
        const target = new THREE.Vector3(...patrolPoints[patrolIndexRef.current]);
        const dir = target.clone().sub(enemyPos);
        dir.y = 0;
        const dist = dir.length();

        if (dist < 0.5) {
          // Reached waypoint
          patrolPauseTimerRef.current = 0;
          isPausedAtWaypointRef.current = true;
          patrolIndexRef.current = (patrolIndexRef.current + 1) % patrolPoints.length;
          console.log(
            '[Crawler]',
            enemyId,
            'reached waypoint, next index =',
            patrolIndexRef.current,
          );
        } else if (dist > 0.01) {
          dir.normalize();
          const movement = dir.multiplyScalar(PATROL_SPEED * delta);
          enemyRef.current.position.add(movement);
        }
      }
    } else if (currentState === 'chase') {
      if (distanceToPlayer <= ATTACK_RANGE) {
        setState('attack', `distance: ${distanceToPlayer.toFixed(2)}`);
      } else if (distanceToPlayer > DETECTION_RADIUS * 1.5) {
        if (patrolPoints.length > 0) {
          // Return to nearest patrol point
          let nearestIndex = 0;
          let nearestDist = Infinity;
          patrolPoints.forEach((p, i) => {
            const d = enemyPos.distanceTo(new THREE.Vector3(...p));
            if (d < nearestDist) {
              nearestDist = d;
              nearestIndex = i;
            }
          });
          patrolIndexRef.current = nearestIndex;
          setState('patrol', 'player lost, returning to patrol');
        } else {
          setState('idle', 'player lost, no patrol');
        }
      } else {
        // Move toward player
        const dir = playerPos.clone().sub(enemyPos);
        dir.y = 0;
        const dist = dir.length();
        if (dist > 0.01) {
          dir.normalize();
          const movement = dir.multiplyScalar(CHASE_SPEED * delta);
          enemyRef.current.position.add(movement);
        }
      }
    } else if (currentState === 'attack') {
      if (distanceToPlayer > ATTACK_RANGE) {
        if (distanceToPlayer <= DETECTION_RADIUS) {
          setState('chase', `distance: ${distanceToPlayer.toFixed(2)}`);
        } else if (patrolPoints.length > 0) {
          setState('patrol', 'player left detection, back to patrol');
        } else {
          setState('idle', 'player left detection, idle');
        }
      }
    } else if (currentState === 'idle') {
      if (patrolPoints.length > 0) {
        setState('patrol', 'patrol points available');
      } else if (distanceToPlayer <= DETECTION_RADIUS) {
        setState('chase', `idle->chase distance: ${distanceToPlayer.toFixed(2)}`);
      }
    }

    // Patrol pause timer
    if (isPausedAtWaypointRef.current) {
      patrolPauseTimerRef.current += delta;
      if (patrolPauseTimerRef.current >= PATROL_PAUSE_DURATION) {
        isPausedAtWaypointRef.current = false;
        patrolPauseTimerRef.current = 0;
      }
    }

    // Hit flash
    if (wasHitRef.current) {
      hitFlashTimerRef.current += delta;
      if (hitFlashTimerRef.current > 0.1) {
        wasHitRef.current = false;
        hitFlashTimerRef.current = 0;
        if (materialRef.current) {
          materialRef.current.emissiveIntensity = 0.3;
        }
      } else if (materialRef.current) {
        materialRef.current.emissiveIntensity = 0.8;
      }
    }

    // Simple visual animation based on state
    animationTimeRef.current += delta;
    const baseY = initialPosition[1];

    if (currentState === 'patrol') {
      const bob = Math.sin(animationTimeRef.current * 3) * 0.05;
      enemyRef.current.position.y = baseY + bob;
      enemyRef.current.rotation.z = Math.sin(animationTimeRef.current * 2) * 0.02;
      enemyRef.current.rotation.x = 0;
    } else if (currentState === 'chase') {
      const bob = Math.sin(animationTimeRef.current * 4) * 0.08;
      enemyRef.current.position.y = baseY + bob;
      enemyRef.current.rotation.x = -0.1;
      enemyRef.current.rotation.z = 0;
    } else if (currentState === 'attack') {
      const bob = Math.sin(animationTimeRef.current * 5) * 0.06;
      const shake = Math.sin(animationTimeRef.current * 10) * 0.05;
      enemyRef.current.position.y = baseY + bob;
      enemyRef.current.rotation.x = -0.15 + shake;
      enemyRef.current.rotation.z = shake * 0.5;
    } else {
      enemyRef.current.position.y = baseY;
      enemyRef.current.rotation.x = 0;
      enemyRef.current.rotation.z = 0;
    }

    // Attack cooldown
    if (attackCooldownRef.current > 0) {
      attackCooldownRef.current -= delta;
    }

    if (stateRef.current === 'attack' && attackCooldownRef.current <= 0) {
      console.log('[Crawler]', enemyId, 'ATTACK');
      applyDamageToPlayer(ATTACK_DAMAGE, 'Crawler');
      attackCooldownRef.current = ATTACK_COOLDOWN;
    }

    // Track previous state to reset cooldown if needed later
    prevStateRef.current = stateRef.current;
  });

  return (
    <>
      <group ref={enemyRef}>
        {/* DEBUG: Root position marker - shows the logical position we are moving */}
        {DEBUG_SHOW_CRAWLER_HELPERS && (
          <mesh position={[0, 1, 0]}>
            <sphereGeometry args={[0.15, 8, 8]} />
            <meshStandardMaterial
              color="#00ff00"
              emissive="#00ff00"
              emissiveIntensity={1.5}
            />
          </mesh>
        )}

        <EnemyHealthBar
          health={healthRef.current}
          maxHealth={maxHealth}
          getHealth={() => healthRef.current}
        />

      {/* Placeholder crawler body */}
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[0.8, 0.4, 1.2]} />
        <meshStandardMaterial
          ref={materialRef}
          color="#2a2a2a"
          emissive="#ff4444"
          emissiveIntensity={0.3}
        />
      </mesh>

      <mesh position={[0, 0.4, 0.5]} castShadow>
        <sphereGeometry args={[0.25, 8, 8]} />
        <meshStandardMaterial
          color="#1a1a1a"
          emissive="#ff4400"
          emissiveIntensity={1.2}
        />
      </mesh>

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

      {/* DEBUG: Patrol waypoint markers */}
      {DEBUG_SHOW_CRAWLER_HELPERS &&
        patrolPoints.map((p, i) => (
          <mesh key={`crawler-waypoint-${i}`} position={p}>
            <cylinderGeometry args={[0.15, 0.15, 0.5, 8]} />
            <meshStandardMaterial
              color="#00ff88"
              emissive="#00ff88"
              emissiveIntensity={0.6}
            />
          </mesh>
        ))}

      {/* DEBUG: Chase target marker */}
      {DEBUG_SHOW_CRAWLER_HELPERS && chaseTargetRef.current && (
        <mesh position={chaseTargetRef.current}>
          <boxGeometry args={[0.2, 0.2, 0.2]} />
          <meshStandardMaterial
            color="#ffff00"
            emissive="#ffff00"
            emissiveIntensity={0.8}
          />
        </mesh>
      )}
    </>
  );
}