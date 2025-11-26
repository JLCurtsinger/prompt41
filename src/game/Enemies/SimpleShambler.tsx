import { useEffect, useRef, useState } from "react";

import { Group, Vector3 } from "three";

import { useFrame } from "@react-three/fiber";

import * as THREE from "three";

import { applyDamageToPlayer } from "./enemyDamage";

import { registerEnemy, unregisterEnemy } from "./enemyRegistry";

import { useGameState } from "../../state/gameState";

import { EnemyDeathFragments } from "../Effects/EnemyDeathFragments";

// Attack constants - ensure melee range is tight and reasonable
const SHAMBLER_MELEE_ATTACK_RANGE = 2.5; // Tight melee range - must be very close
const SHAMBLER_ATTACK_WARMUP_MS = 2000;
const SHAMBLER_ATTACK_COOLDOWN = 1.3;
const DEBUG_SHAMBLER_LOGS = false;

type SimpleShamblerProps = { 

  id?: string;

  start: [number, number, number];

  end: [number, number, number];

  maxHealth?: number;

  attackRange?: number;

  attackDamage?: number;

  deathDuration?: number;

  speed?: number;

  color?: string;

  enemyName?: string;

};

export function SimpleShambler({

  id,

  start,

  end,

  maxHealth = 200,

  attackRange: _attackRange = 2.5, // Keep for interface compatibility, but use SHAMBLER_MELEE_ATTACK_RANGE instead

  attackDamage = 18,

  deathDuration = 0.6,

  speed = 0.18,

  color = "purple",

  enemyName = "Shambler",

}: SimpleShamblerProps) {

  const enemyRef = useRef<Group>(null);

  const startVec = useRef(new Vector3(...start));

  const endVec = useRef(new Vector3(...end));

  const tRef = useRef(0);

  const dirRef = useRef<1 | -1>(1);

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

  const enemyId = id || `shambler-${start.join("-")}-${end.join("-")}`;

  const { incrementEnemiesKilled, checkWinCondition, playerPosition } = useGameState();

  // Set initial position on mount so the Shambler spawns at the correct location
  useEffect(() => {
    const root = enemyRef.current;
    if (!root) return;

    root.position.set(startVec.current.x, startVec.current.y, startVec.current.z);

    if (import.meta.env.DEV && DEBUG_SHAMBLER_LOGS) {
      console.log("[SimpleShambler] initial position", {
        enemyId,
        start: {
          x: startVec.current.x,
          y: startVec.current.y,
          z: startVec.current.z,
        },
      });
    }
  }, [enemyId]);

  // Register with enemyRegistry for baton hits / HUD
  // Always register on mount (like SimpleCrawler)
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
          "[Combat] Baton hit Shambler",
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
        setDeathPosition([worldPos.x, worldPos.y + 0.8, worldPos.z]);
        setShowDeathFragments(true);

        // Hide enemy mesh immediately
        root.visible = false;

        console.log("[Shambler]", enemyId, "death sequence started");

      }

      if (!hasFinishedDeathRef.current) {

        hasFinishedDeathRef.current = true;

        unregisterEnemy(enemyId);

        incrementEnemiesKilled();

        checkWinCondition();

        console.log("[Shambler]", enemyId, "unregistered after death");

      }

      return;

    }

    // Movement code (keep exactly as-is)

    tRef.current += dirRef.current * speed * delta;

    if (tRef.current >= 1) {

      tRef.current = 1;

      dirRef.current = -1;

    } else if (tRef.current <= 0) {

      tRef.current = 0;

      dirRef.current = 1;

    }

    root.position.lerpVectors(startVec.current, endVec.current, tRef.current);

    // Combat logic (after movement)

    // Update attack cooldown
    attackCooldownRef.current = Math.max(attackCooldownRef.current - delta, 0);

    // Compute enemy and player world positions (same pattern as SimpleCrawler)
    const enemyWorldPos = new THREE.Vector3();
    root.getWorldPosition(enemyWorldPos);

    const playerWorldPos = new THREE.Vector3(
      playerPosition.x,
      playerPosition.y,
      playerPosition.z
    );

    const distanceToPlayer = enemyWorldPos.distanceTo(playerWorldPos);

    // Check if shambler has finished warmup period
    const now = Date.now();
    const timeSinceSpawn = now - spawnedAtRef.current;
    const canAttackByTime = timeSinceSpawn >= SHAMBLER_ATTACK_WARMUP_MS;

    // Check attack conditions
    const isInMeleeRange = distanceToPlayer <= SHAMBLER_MELEE_ATTACK_RANGE;
    const cooldownReady = attackCooldownRef.current <= 0;

    if (canAttackByTime && cooldownReady && isInMeleeRange) {
      if (import.meta.env.DEV && DEBUG_SHAMBLER_LOGS) {
        console.log(
          "[SHAMBLER-ATTACK]",
          {
            enemyName,
            enemyId,
            distanceToPlayer: distanceToPlayer.toFixed(2),
            meleeRange: SHAMBLER_MELEE_ATTACK_RANGE,
            attackCooldown: attackCooldownRef.current.toFixed(2),
            timeSinceSpawn: Math.round(timeSinceSpawn),
            attackDamage
          }
        );
      }

      applyDamageToPlayer(attackDamage, 'SimpleShambler-attack');

      attackCooldownRef.current = SHAMBLER_ATTACK_COOLDOWN;
    }
  });

  return (
    <>
      <group ref={enemyRef}>

        <mesh castShadow receiveShadow>

          <capsuleGeometry args={[0.6, 1.6, 8, 16]} />

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

