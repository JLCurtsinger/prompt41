import { useEffect, useRef, useState } from "react";

import { Group } from "three";

import { useFrame } from "@react-three/fiber";

import * as THREE from "three";

import { applyDamageToPlayer } from "./enemyDamage";

import { registerEnemy, unregisterEnemy } from "./enemyRegistry";

import { useGameState } from "../../state/gameState";

import { EnemyDeathFragments } from "../Effects/EnemyDeathFragments";

const DRONE_ATTACK_WARMUP_MS = 2000;
const DRONE_ATTACK_COOLDOWN = 1.0;

type SimpleDroneProps = {
  id?: string;

  // Movement/combat tuning
  maxHealth?: number;
  attackRange?: number;
  attackDamage?: number;
  deathDuration?: number;
  followHeight?: number;   // Y height to hover at (for idle orbit)
  followRadius?: number;   // Orbit radius around orbitCenter
  orbitSpeed?: number;     // How fast it orbits around the center
  orbitCenter?: [number, number, number]; // Fixed world-space center for idle orbit
  aggroRadius?: number;    // Distance to player that triggers attack mode
  attackSpeed?: number;    // Speed when moving toward player in attack mode
  color?: string;
  enemyName?: string;
};

export function SimpleDrone({
  id,
  maxHealth = 100,
  attackRange = 2.5,
  attackDamage = 10,
  deathDuration = 0.5,
  followHeight = 3,
  followRadius = 4,
  orbitSpeed = 0.8,
  orbitCenter = [0, 3, 0],
  aggroRadius = 6,
  attackSpeed = 1.5,
  color = "cyan",
  enemyName = "Drone",
}: SimpleDroneProps) {
  const enemyRef = useRef<Group>(null);

  const orbitAngleRef = useRef(0);
  const modeRef = useRef<'idle' | 'attack'>('idle');

  // Health and combat refs
  const healthRef = useRef(maxHealth);
  const attackCooldownRef = useRef(0);
  const spawnedAtRef = useRef(Date.now());
  const isDyingRef = useRef(false);
  const hasFinishedDeathRef = useRef(false);
  
  // Death fragment effect state
  const [showDeathFragments, setShowDeathFragments] = useState(false);
  const [deathPosition, setDeathPosition] = useState<[number, number, number]>([0, 0, 0]);

  // Generate enemy ID if not provided
  const enemyId = id || `drone-${Math.random().toString(36).slice(2, 8)}`;

  const { incrementEnemiesKilled, checkWinCondition, playerPosition } = useGameState();

  // Initialize position at orbit center
  useEffect(() => {
    if (enemyRef.current) {
      const orbitHeight = orbitCenter[1] + followHeight;
      enemyRef.current.position.set(
        orbitCenter[0] + followRadius, // Start at one point on the orbit circle
        orbitHeight,
        orbitCenter[2]
      );
    }
  }, []); // Only run once on mount

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
        
        // Capture death position and trigger fragment effect
        const worldPos = new THREE.Vector3();
        root.getWorldPosition(worldPos);
        setDeathPosition([worldPos.x, worldPos.y, worldPos.z]);
        setShowDeathFragments(true);
        
        // Hide enemy mesh immediately
        root.visible = false;
        
        console.log("[Drone]", enemyId, "death sequence started");
      }

      if (!hasFinishedDeathRef.current) {
        hasFinishedDeathRef.current = true;
        unregisterEnemy(enemyId);
        incrementEnemiesKilled();
        checkWinCondition();
        console.log("[Drone]", enemyId, "unregistered after death");
      }

      return;
    }

    // Compute distance to player once per frame
    const enemyWorldPos = new THREE.Vector3();
    root.getWorldPosition(enemyWorldPos);

    const playerPosVec = new THREE.Vector3(
      playerPosition.x,
      playerPosition.y,
      playerPosition.z
    );

    const distanceToPlayer = enemyWorldPos.distanceTo(playerPosVec);

    // Mode transitions based on distance
    if (modeRef.current === 'idle' && distanceToPlayer <= aggroRadius) {
      modeRef.current = 'attack';
      console.log(`[Drone] mode idle → attack (distance: ${distanceToPlayer.toFixed(2)})`);
    } else if (modeRef.current === 'attack' && distanceToPlayer > aggroRadius * 1.3) {
      modeRef.current = 'idle';
      console.log(`[Drone] mode attack → idle (distance: ${distanceToPlayer.toFixed(2)})`);
    }

    // Movement based on mode
    const currentPos = root.position;
    let targetPos: THREE.Vector3;

    if (modeRef.current === 'idle') {
      // Idle orbit mode: orbit around fixed orbitCenter
      orbitAngleRef.current += orbitSpeed * delta;
      
      // Height is orbitCenter.y plus followHeight offset
      const orbitHeight = orbitCenter[1] + followHeight;
      const targetX = orbitCenter[0] + Math.cos(orbitAngleRef.current) * followRadius;
      const targetZ = orbitCenter[2] + Math.sin(orbitAngleRef.current) * followRadius;
      const targetY = orbitHeight;
      
      targetPos = new THREE.Vector3(targetX, targetY, targetZ);
      
      // Lerp towards orbit target (use orbitSpeed for smoothness)
      currentPos.lerp(targetPos, Math.min(orbitSpeed * delta * 2, 1));
    } else {
      // Attack mode: move toward player, swooping down slightly
      const attackTargetY = playerPosition.y + 1.5; // Swoop down lower than idle
      targetPos = new THREE.Vector3(
        playerPosition.x,
        attackTargetY,
        playerPosition.z
      );
      
      // Lerp toward player using attackSpeed
      currentPos.lerp(targetPos, Math.min(attackSpeed * delta, 1));
    }

    // Update attack cooldown
    attackCooldownRef.current = Math.max(attackCooldownRef.current - delta, 0);

    // Check if drone has finished warmup period
    const now = Date.now();
    const timeSinceSpawn = now - spawnedAtRef.current;
    const canAttackByTime = timeSinceSpawn >= DRONE_ATTACK_WARMUP_MS;

    // Check attack conditions
    const cooldownReady = attackCooldownRef.current <= 0;
    const inRange = distanceToPlayer <= attackRange;

    if (canAttackByTime && cooldownReady && inRange) {
      console.log(
        "[ATTACK]",
        enemyName,
        enemyId,
        "distanceToPlayer =",
        distanceToPlayer.toFixed(2),
        "attackRange =",
        attackRange,
        "timeSinceSpawn =",
        Math.round(timeSinceSpawn),
        "ms"
      );

      applyDamageToPlayer(attackDamage, enemyName);
      attackCooldownRef.current = DRONE_ATTACK_COOLDOWN;
    }
  });

  return (
    <>
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
      
      {/* Death fragment effect */}
      {showDeathFragments && (
        <EnemyDeathFragments
          position={deathPosition}
          color={color}
          onComplete={() => setShowDeathFragments(false)}
        />
      )}
    </>
  );
}

