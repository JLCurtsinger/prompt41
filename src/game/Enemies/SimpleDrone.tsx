import { useEffect, useRef } from "react";

import { Group, Vector3 } from "three";

import { useFrame } from "@react-three/fiber";

import * as THREE from "three";

import { applyDamageToPlayer } from "./enemyDamage";

import { registerEnemy, unregisterEnemy } from "./enemyRegistry";

import { useGameState } from "../../state/gameState";

type SimpleDroneProps = {
  id?: string;
  // Player position in world space, from GameScene's PlayerPositionTracker
  playerPosition: [number, number, number];

  // Movement/combat tuning
  maxHealth?: number;
  attackRange?: number;
  attackCooldown?: number;
  attackDamage?: number;
  deathDuration?: number;
  followHeight?: number;   // Y height to hover at
  followRadius?: number;   // Distance from player (horizontal)
  moveSpeed?: number;      // How fast the drone moves
  orbitSpeed?: number;     // How fast it orbits around the player
  color?: string;
  enemyName?: string;
};

export function SimpleDrone({
  id,
  playerPosition,
  maxHealth = 60,
  attackRange = 2.5,
  attackCooldown = 1.0,
  attackDamage = 10,
  deathDuration = 0.5,
  followHeight = 3,
  followRadius = 4,
  moveSpeed = 2.0,
  orbitSpeed = 0.8,
  color = "cyan",
  enemyName = "Drone",
}: SimpleDroneProps) {
  const enemyRef = useRef<Group>(null);

  const orbitAngleRef = useRef(0);

  // Health and combat refs
  const healthRef = useRef(maxHealth);
  const attackCooldownRef = useRef(0);
  const deathTimerRef = useRef(0);
  const isDyingRef = useRef(false);
  const hasFinishedDeathRef = useRef(false);

  // Generate enemy ID if not provided
  const enemyId = id || `drone-${Math.random().toString(36).slice(2, 8)}`;

  const { incrementEnemiesKilled, checkWinCondition } = useGameState();

  // Register with enemyRegistry for baton hits / HUD
  useEffect(() => {
    const instance = {
      id: enemyId,
      getPosition: () => {
        const pos = new THREE.Vector3();
        if (enemyRef.current) {
          enemyRef.current.getWorldPosition(pos);
        }
        return pos;
      },
      takeDamage: (amount: number) => {
        const before = healthRef.current;
        healthRef.current = Math.max(0, before - amount);
        console.log(
          "[Combat] Baton hit",
          enemyName,
          enemyId,
          "for",
          amount,
          "=> hp:",
          healthRef.current,
          "/",
          maxHealth,
        );
      },
      isDead: () => healthRef.current <= 0,
      getHealth: () => healthRef.current,
      getMaxHealth: () => maxHealth,
      getEnemyName: () => enemyName,
    };

    registerEnemy(enemyId, instance);

    return () => {
      unregisterEnemy(enemyId);
    };
  }, [enemyId, maxHealth, enemyName]);

  useFrame((_state, delta) => {
    const root = enemyRef.current;

    if (!root || hasFinishedDeathRef.current) return;

    // Death handling
    if (healthRef.current <= 0) {
      if (!isDyingRef.current) {
        isDyingRef.current = true;
        deathTimerRef.current = 0;
        console.log("[Drone]", enemyId, "death sequence started");
      }

      deathTimerRef.current += delta;
      const t = Math.min(deathTimerRef.current / deathDuration, 1);
      const scale = 1 - t;
      root.scale.set(scale, scale, scale);
      root.position.y = followHeight - t * 0.5;

      if (t >= 1 && !hasFinishedDeathRef.current) {
        hasFinishedDeathRef.current = true;
        root.visible = false;
        unregisterEnemy(enemyId);
        incrementEnemiesKilled();
        checkWinCondition();
        console.log("[Drone]", enemyId, "unregistered after death");
      }

      return;
    }

    // Movement: orbit around player at fixed height
    orbitAngleRef.current += orbitSpeed * delta;

    const targetX = playerPosition[0] + Math.cos(orbitAngleRef.current) * followRadius;
    const targetZ = playerPosition[2] + Math.sin(orbitAngleRef.current) * followRadius;
    const targetY = followHeight;

    // Smoothly move towards the target orbit position
    const currentPos = root.position;
    const targetPos = new THREE.Vector3(targetX, targetY, targetZ);

    // Lerp towards target
    currentPos.lerp(targetPos, Math.min(moveSpeed * delta, 1));

    // Combat logic (after movement)
    const enemyWorldPos = new THREE.Vector3();
    root.getWorldPosition(enemyWorldPos);

    const playerPosVec = new THREE.Vector3(
      playerPosition[0],
      playerPosition[1],
      playerPosition[2]
    );

    const distanceToPlayer = enemyWorldPos.distanceTo(playerPosVec);

    // Attack cooldown
    if (attackCooldownRef.current > 0) {
      attackCooldownRef.current -= delta;
    }

    // Attack if in range and cooldown is ready
    if (distanceToPlayer <= attackRange && attackCooldownRef.current <= 0) {
      console.log(
        "[ATTACK]",
        enemyName,
        enemyId,
        "distanceToPlayer =",
        distanceToPlayer.toFixed(2),
        "attackRange =",
        attackRange
      );

      applyDamageToPlayer(attackDamage, enemyName);
      attackCooldownRef.current = attackCooldown;
    }
  });

  return (
    <group ref={enemyRef}>
      <mesh>
        {/* Main body */}
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} />
      </mesh>
      {/* Optional simple ring to suggest rotors */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.2, 0]}>
        <torusGeometry args={[0.7, 0.05, 8, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

