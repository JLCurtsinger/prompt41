import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { EnemyHealthBar } from './EnemyHealthBar';
import { applyDamageToPlayer } from './enemyDamage';
import { registerEnemy, unregisterEnemy } from './enemyRegistry';
import { useGameState } from '../../state/gameState';

type SimpleCrawlerProps = {
  id: string;
  start: [number, number, number];
  end: [number, number, number];
  playerPosition: [number, number, number];
};

const MAX_HEALTH = 50;
const MOVE_SPEED = 1.5; // units per second
const ATTACK_RANGE = 2;
const ATTACK_DAMAGE = 5;
const ATTACK_COOLDOWN = 0.8; // seconds
const DEATH_DURATION = 0.5; // seconds

export function SimpleCrawler({
  id,
  start,
  end,
  playerPosition,
}: SimpleCrawlerProps) {
  const enemyRef = useRef<THREE.Group>(null);
  const healthRef = useRef(MAX_HEALTH);
  const isDyingRef = useRef(false);
  const hasFinishedDeathRef = useRef(false);

  // Movement state
  const dirRef = useRef<1 | -1>(1);
  const startVec = new THREE.Vector3(...start);
  const endVec = new THREE.Vector3(...end);
  const tmpDir = new THREE.Vector3();

  // Attack state
  const attackCooldownRef = useRef(0);

  // Death animation
  const deathTimerRef = useRef(0);

  // Logging
  const lastLogTimeRef = useRef(0);

  const { incrementEnemiesKilled, checkWinCondition } = useGameState();

  // Register enemy on mount
  useEffect(() => {
    const instance = {
      id,
      getPosition: () => enemyRef.current?.position.clone() ?? new THREE.Vector3(),
      takeDamage: (amount: number) => {
        const before = healthRef.current;
        healthRef.current = Math.max(0, before - amount);
        console.log(
          '[Combat] Baton hit Crawler',
          id,
          'for',
          amount,
          '=> hp:',
          healthRef.current,
          '/',
          MAX_HEALTH,
        );
      },
      isDead: () => healthRef.current <= 0,
      getHealth: () => healthRef.current,
      getMaxHealth: () => MAX_HEALTH,
      getEnemyName: () => 'Crawler',
    };

    registerEnemy(id, instance);

    // Set initial position
    if (enemyRef.current) {
      enemyRef.current.position.set(...start);
    }

    return () => {
      unregisterEnemy(id);
    };
  }, [id, start]);

  // Main update loop
  useFrame((_, delta) => {
    if (!enemyRef.current || hasFinishedDeathRef.current) return;

    // Death handling
    if (healthRef.current <= 0) {
      if (!isDyingRef.current) {
        isDyingRef.current = true;
        deathTimerRef.current = 0;
        console.log('[SimpleCrawler]', id, 'death sequence started');
      }

      deathTimerRef.current += delta;
      const t = Math.min(deathTimerRef.current / DEATH_DURATION, 1);

      // Shrink and sink
      const scale = 1 - t;
      enemyRef.current.scale.set(scale, scale, scale);
      enemyRef.current.position.y = startVec.y - t * 0.5;

      if (t >= 1 && !hasFinishedDeathRef.current) {
        hasFinishedDeathRef.current = true;
        unregisterEnemy(id);
        incrementEnemiesKilled();
        checkWinCondition();
        console.log('[SimpleCrawler]', id, 'unregistered after death');
      }

      return;
    }

    // Movement: ping-pong between start and end
    const target = dirRef.current === 1 ? endVec : startVec;
    tmpDir.copy(target).sub(enemyRef.current.position);
    const dist = tmpDir.length();

    if (dist < 0.1) {
      // Reached target, reverse direction
      dirRef.current = dirRef.current === 1 ? -1 : 1;
    } else {
      // Move toward target
      tmpDir.normalize();
      enemyRef.current.position.addScaledVector(tmpDir, MOVE_SPEED * delta);
    }

    // Compute player distance
    const enemyPos = enemyRef.current.position.clone();
    const playerPos = new THREE.Vector3(...playerPosition);
    const distanceToPlayer = enemyPos.distanceTo(playerPos);

    // Attack cooldown timer
    if (attackCooldownRef.current > 0) {
      attackCooldownRef.current -= delta;
    }

    // Attack logic: simple proximity-based damage
    if (distanceToPlayer < ATTACK_RANGE && attackCooldownRef.current <= 0) {
      console.log('[SimpleCrawler]', id, 'ATTACK - dealing', ATTACK_DAMAGE, 'damage');
      applyDamageToPlayer(ATTACK_DAMAGE, 'Crawler');
      attackCooldownRef.current = ATTACK_COOLDOWN;
    }

    // Throttled logging (every 1 second)
    const now = performance.now() / 1000;
    if (now - lastLogTimeRef.current >= 1.0) {
      lastLogTimeRef.current = now;
      const worldPos = new THREE.Vector3();
      enemyRef.current.getWorldPosition(worldPos);
      console.log(
        `[SimpleCrawler] ${id} pos=(${worldPos.x.toFixed(2)}, ${worldPos.y.toFixed(2)}, ${worldPos.z.toFixed(2)}) dist=${distanceToPlayer.toFixed(2)} health=${healthRef.current}`,
      );
    }
  });

  return (
    <group ref={enemyRef}>
      <EnemyHealthBar
        health={healthRef.current}
        maxHealth={MAX_HEALTH}
        getHealth={() => healthRef.current}
      />

      {/* Simple enemy shape */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1, 0.6, 1]} />
        <meshStandardMaterial color="red" />
      </mesh>
    </group>
  );
}

