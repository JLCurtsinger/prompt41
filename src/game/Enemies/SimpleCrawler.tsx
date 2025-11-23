import { useEffect, useRef } from "react";

import { Group, Vector3 } from "three";

import { useFrame, useThree } from "@react-three/fiber";

import * as THREE from "three";

import { applyDamageToPlayer } from "./enemyDamage";

import { registerEnemy, unregisterEnemy } from "./enemyRegistry";

import { useGameState } from "../../state/gameState";

type SimpleCrawlerProps = {

  id?: string;

  start: [number, number, number];

  end: [number, number, number];

};

export function SimpleCrawler({ id, start, end }: SimpleCrawlerProps) {

  const enemyRef = useRef<Group>(null);

  const startVec = useRef(new Vector3(...start));

  const endVec = useRef(new Vector3(...end));

  const tRef = useRef(0);

  const dirRef = useRef<1 | -1>(1);

  // Health and combat refs

  const healthRef = useRef(50);

  const maxHealth = 50;

  const attackCooldownRef = useRef(0);

  const deathTimerRef = useRef(0);

  const isDyingRef = useRef(false);

  const hasFinishedDeathRef = useRef(false);

  // Generate enemy ID if not provided

  const enemyId = id || `crawler-${start.join("-")}-${end.join("-")}`;

  const { scene } = useThree();

  const { incrementEnemiesKilled, checkWinCondition } = useGameState();

  // Combat constants (matching EnemyCrawler)

  const ATTACK_RANGE = 2;

  const ATTACK_COOLDOWN = 0.8;

  const ATTACK_DAMAGE = 5;

  const DEATH_DURATION = 0.5;

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

          "[Combat] Baton hit Crawler",

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

      getEnemyName: () => "Crawler",

    };

    registerEnemy(enemyId, instance);

    return () => {

      unregisterEnemy(enemyId);

    };

  }, [enemyId, maxHealth]);

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

      const t = Math.min(deathTimerRef.current / DEATH_DURATION, 1);

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

    const speed = 0.35;

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

      // Attack cooldown

      if (attackCooldownRef.current > 0) {

        attackCooldownRef.current -= delta;

      }

      // Attack if in range and cooldown is ready

      if (distanceToPlayer <= ATTACK_RANGE && attackCooldownRef.current <= 0) {

        console.log("[Crawler]", enemyId, "ATTACK");

        applyDamageToPlayer(ATTACK_DAMAGE, "Crawler");

        attackCooldownRef.current = ATTACK_COOLDOWN;

      }

    }

  });

  return (

    <group ref={enemyRef}>

      <mesh>

        <boxGeometry args={[1, 0.6, 1]} />

        <meshStandardMaterial color="red" />

      </mesh>

    </group>

  );

}
