import { useEffect, useRef } from "react";

import { Group, Vector3 } from "three";

import { useFrame, useThree } from "@react-three/fiber";

import * as THREE from "three";

import { applyDamageToPlayer } from "./enemyDamage";

import { registerEnemy, unregisterEnemy } from "./enemyRegistry";

import { useGameState } from "../../state/gameState";

// Attack constants - ensure melee range is tight and reasonable
const CRAWLER_MELEE_RANGE = 1.25; // Tighter melee range - must be very close for melee hit
const CRAWLER_ATTACK_COOLDOWN = 1.0; // seconds between attacks
const CRAWLER_ATTACK_WARMUP_MS = 2000; // ms after spawn before crawler can attack

type SimpleCrawlerProps = {

  id?: string;

  start: [number, number, number];

  end: [number, number, number];

  maxHealth?: number;

  attackRange?: number;

  attackCooldown?: number;

  attackDamage?: number;

  deathDuration?: number;

  speed?: number;

  color?: string;

  enemyName?: string;

};

export function SimpleCrawler({

  id,

  start,

  end,

  maxHealth = 50,

  attackRange: _attackRange = 2, // Keep for interface compatibility, but use CRAWLER_MELEE_RANGE instead

  attackCooldown: _attackCooldown = 0.8, // Keep for interface compatibility, but use CRAWLER_ATTACK_COOLDOWN instead

  attackDamage = 5,

  deathDuration = 0.5,

  speed = 0.35,

  color = "red",

  enemyName = "Crawler",

}: SimpleCrawlerProps) {

  const enemyRef = useRef<Group>(null);

  const startVec = useRef(new Vector3(...start));

  const endVec = useRef(new Vector3(...end));

  const tRef = useRef(0);

  const dirRef = useRef<1 | -1>(1);

  // Health and combat refs

  const healthRef = useRef(maxHealth);

  const attackCooldownRef = useRef(0); // in seconds
  const spawnedAtRef = useRef(Date.now()); // Track when crawler spawned

  const deathTimerRef = useRef(0);

  const isDyingRef = useRef(false);

  const hasFinishedDeathRef = useRef(false);

  // Generate enemy ID if not provided

  const enemyId = id || `crawler-${start.join("-")}-${end.join("-")}`;

  const { scene } = useThree();

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

        console.log("[Crawler]", enemyId, "death sequence started");

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

        console.log("[Crawler]", enemyId, "unregistered after death");

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

    // Find player position from scene

    let playerPos: THREE.Vector3 | null = null;

    scene.traverse((object) => {

      if (object instanceof THREE.Group) {

        let hasCapsule = false;

        object.traverse((child) => {

          if (child instanceof THREE.Mesh && child.geometry instanceof THREE.CapsuleGeometry) {

            hasCapsule = true;

          }

        });

        if (hasCapsule) {

          playerPos = object.position.clone();

        }

      }

    });

    if (playerPos) {

      const enemyWorldPos = new THREE.Vector3();

      root.getWorldPosition(enemyWorldPos);

      const distanceToPlayer = enemyWorldPos.distanceTo(playerPos);

      // Update attack cooldown (delta is in seconds)
      attackCooldownRef.current = Math.max(attackCooldownRef.current - delta, 0);

      // Check if crawler has finished warmup period
      const now = Date.now();
      const timeSinceSpawn = now - spawnedAtRef.current;
      const canAttackByTime = timeSinceSpawn >= CRAWLER_ATTACK_WARMUP_MS;

      // Check attack conditions
      const distanceOk = distanceToPlayer <= CRAWLER_MELEE_RANGE;
      const cooldownReady = attackCooldownRef.current <= 0;
      const canAttackByState = true; // SimpleCrawler doesn't have state machine, always ready

      if (canAttackByTime && canAttackByState && distanceOk && cooldownReady) {
        console.log(
          "[CRAWLER-ATTACK]",
          {
            enemyName,
            enemyId,
            distanceToPlayer: distanceToPlayer.toFixed(2),
            meleeRange: CRAWLER_MELEE_RANGE,
            attackCooldown: attackCooldownRef.current.toFixed(2),
            timeSinceSpawn: Math.round(timeSinceSpawn),
            attackDamage
          }
        );

        applyDamageToPlayer(attackDamage, 'SimpleCrawler-bite');

        attackCooldownRef.current = CRAWLER_ATTACK_COOLDOWN;

      }

    }

  });

  return (

    <group ref={enemyRef}>

      <mesh>

        <boxGeometry args={[1, 0.6, 1]} />

        <meshStandardMaterial color={color} />

      </mesh>

    </group>

  );

}
