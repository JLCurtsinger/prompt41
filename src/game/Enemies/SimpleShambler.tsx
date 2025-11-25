import { useEffect, useRef } from "react";

import { Vector3 } from "three";

import { useFrame } from "@react-three/fiber";

import * as THREE from "three";

import { applyDamageToPlayer } from "./enemyDamage";

import { registerEnemy, unregisterEnemy } from "./enemyRegistry";

import { useGameState } from "../../state/gameState";

// Attack constants - ensure melee range is tight and reasonable
const SHAMBLER_MELEE_ATTACK_RANGE = 2.5; // Tight melee range - must be very close
const SHAMBLER_ATTACK_WARMUP_MS = 2000;
const SHAMBLER_ATTACK_COOLDOWN = 1.3;

type SimpleShamblerProps = {

  id?: string;

  start: [number, number, number];

  end: [number, number, number];

  isActivated?: boolean;

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

  isActivated,

  maxHealth = 100,

  attackRange: _attackRange = 2.5, // Keep for interface compatibility, but use SHAMBLER_MELEE_ATTACK_RANGE instead

  attackDamage = 18,

  deathDuration = 0.6,

  speed = 0.18,

  color = "purple",

  enemyName = "Shambler",

}: SimpleShamblerProps) {

  const enemyRef = useRef<THREE.Group | THREE.Object3D | null>(null);

  const startVec = useRef(new Vector3(...start));

  const endVec = useRef(new Vector3(...end));

  const tRef = useRef(0);

  const dirRef = useRef<1 | -1>(1);

  // Health and combat refs

  const healthRef = useRef(maxHealth);

  const attackCooldownRef = useRef(0);
  const spawnedAtRef = useRef(Date.now());

  const deathTimerRef = useRef(0);

  const isDyingRef = useRef(false);

  const hasFinishedDeathRef = useRef(false);

  const isActivatedRef = useRef(isActivated ?? false);

  useEffect(() => {

    isActivatedRef.current = isActivated ?? false;

  }, [isActivated]);

  // Set initial position on mount so the Shambler spawns at the correct location
  useEffect(() => {
    const root = enemyRef.current;
    if (!root) return;

    root.position.set(startVec.current.x, startVec.current.y, startVec.current.z);

    if (process.env.NODE_ENV === "development") {
      console.log("[SimpleShambler] initial position", {
        enemyId,
        start: {
          x: startVec.current.x,
          y: startVec.current.y,
          z: startVec.current.z,
        },
      });
    }
  }, []);

  // Generate enemy ID if not provided

  const enemyId = id || `shambler-${start.join("-")}-${end.join("-")}`;

  const { incrementEnemiesKilled, checkWinCondition, playerPosition } = useGameState();

  // Register with enemyRegistry for baton hits / HUD
  // Only register when activated
  useEffect(() => {
    if (!isActivatedRef.current) {
      // Unregister if not activated
      unregisterEnemy(enemyId);
      return;
    }

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
      isActive: () => isActivatedRef.current, // Only active when activated
      getHealth: () => healthRef.current,
      getMaxHealth: () => maxHealth,
      getEnemyName: () => enemyName,
    };

    registerEnemy(enemyId, instance);

    return () => {
      unregisterEnemy(enemyId);
    };
  }, [enemyId, maxHealth, enemyName, isActivated]);

  useFrame((_state, delta) => {

    const root = enemyRef.current;

    if (!root || hasFinishedDeathRef.current) return;

    if (!isActivatedRef.current) {

      return;

    }

    // Death handling

    if (healthRef.current <= 0) {

      if (!isDyingRef.current) {

        isDyingRef.current = true;

        deathTimerRef.current = 0;

        console.log("[Shambler]", enemyId, "death sequence started");

      }

      deathTimerRef.current += delta;

      const t = Math.min(deathTimerRef.current / deathDuration, 1);

      const scale = 1 - t;

      root.scale.set(scale, scale, scale);

      root.position.y = startVec.current.y - t * 0.5;

      if (t >= 1 && !hasFinishedDeathRef.current) {

        hasFinishedDeathRef.current = true;

        root.visible = false;

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

    // Update registry instance when active (keep position fresh)
    if (isActivatedRef.current) {
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
        isActive: () => isActivatedRef.current,
        getHealth: () => healthRef.current,
        getMaxHealth: () => maxHealth,
        getEnemyName: () => enemyName,
      };
      registerEnemy(enemyId, instance);
    }

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

        applyDamageToPlayer(attackDamage, 'SimpleShambler-attack');

        attackCooldownRef.current = SHAMBLER_ATTACK_COOLDOWN;
      }
  });

  return (

    <group ref={enemyRef}>

      <mesh castShadow receiveShadow>

        <capsuleGeometry args={[0.6, 1.6, 8, 16]} />

        <meshStandardMaterial color={color} />

      </mesh>

    </group>

  );

}

