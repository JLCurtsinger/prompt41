import { useEffect, useRef } from "react";

import { Vector3 } from "three";

import { useFrame, useThree } from "@react-three/fiber";

import * as THREE from "three";

import { applyDamageToPlayer } from "./enemyDamage";

import { registerEnemy, unregisterEnemy } from "./enemyRegistry";

import { useGameState } from "../../state/gameState";

type SimpleShamblerProps = {

  id?: string;

  start: [number, number, number];

  end: [number, number, number];

  isActivated?: boolean;

  maxHealth?: number;

  attackRange?: number;

  attackCooldown?: number;

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

  attackRange = 2.5,

  attackCooldown = 1.3,

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

  const deathTimerRef = useRef(0);

  const isDyingRef = useRef(false);

  const hasFinishedDeathRef = useRef(false);

  const isActivatedRef = useRef(isActivated ?? false);

  useEffect(() => {

    isActivatedRef.current = isActivated ?? false;

  }, [isActivated]);

  // Generate enemy ID if not provided

  const enemyId = id || `shambler-${start.join("-")}-${end.join("-")}`;

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

    // Combat logic (after movement)

    // Update attack cooldown

    if (attackCooldownRef.current > 0) {

      attackCooldownRef.current -= delta;

    }

    // Find player position from scene

    let playerGroup: THREE.Group | null = null;

    scene.traverse((object) => {

      if (object instanceof THREE.Group) {

        let hasCapsule = false;

        object.traverse((child) => {

          if (child instanceof THREE.Mesh && child.geometry instanceof THREE.CapsuleGeometry) {

            hasCapsule = true;

          }

        });

        if (hasCapsule) {

          playerGroup = object;

        }

      }

    });

    if (playerGroup && enemyRef.current) {

      const currentPlayerGroup: THREE.Group = playerGroup;

      const currentEnemyRef: THREE.Group | THREE.Object3D = enemyRef.current;

      const playerWorldPos = new THREE.Vector3();

      const enemyWorldPos = new THREE.Vector3();

      currentPlayerGroup.getWorldPosition(playerWorldPos);

      currentEnemyRef.getWorldPosition(enemyWorldPos);

      const distanceToPlayer = enemyWorldPos.distanceTo(playerWorldPos);

      if (distanceToPlayer <= attackRange && attackCooldownRef.current <= 0) {

        console.log(

          "[ATTACK] Shambler",

          enemyId,

          "distanceToPlayer =",

          distanceToPlayer.toFixed(2),

          "attackRange =",

          attackRange

        );

        applyDamageToPlayer(attackDamage, enemyName);

        attackCooldownRef.current = attackCooldown;

      }

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

