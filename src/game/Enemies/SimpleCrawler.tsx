import { useEffect, useRef, useState } from "react";

import { Group, Vector3 } from "three";

import { useFrame } from "@react-three/fiber";

import * as THREE from "three";

import { applyDamageToPlayer } from "./enemyDamage";

import { registerEnemy, unregisterEnemy } from "./enemyRegistry";

import { useGameState } from "../../state/gameState";

import { enemyRespawnManager } from "./EnemyRespawnManager";

import { EnemyDeathFragments } from "../Effects/EnemyDeathFragments";

import { AudioManager } from "../audio/AudioManager";

// Attack constants - ensure melee range is tight and reasonable
const CRAWLER_MELEE_RANGE = 1.25; // Tighter melee range - must be very close for melee hit
const CRAWLER_ATTACK_COOLDOWN = 1.0; // seconds between attacks
const CRAWLER_ATTACK_WARMUP_MS = 2000; // ms after spawn before crawler can attack
const CRAWLER_COMBAT_ENGAGEMENT_RANGE = 4.0; // Range at which crawler enters combat (larger than attack range)
const DEBUG_CRAWLER_LOGS = false;

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

  zoneId?: 'zone2' | 'zone3' | 'zone4'; // Zone identifier for respawn system

};

export function SimpleCrawler({

  id,

  start,

  end,

  maxHealth = 150,

  attackRange: _attackRange = 2, // Keep for interface compatibility, but use CRAWLER_MELEE_RANGE instead

  attackCooldown: _attackCooldown = 0.8, // Keep for interface compatibility, but use CRAWLER_ATTACK_COOLDOWN instead

  attackDamage = 5,

  speed = 0.35,

  color = "red",

  enemyName = "Crawler",

  zoneId,

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

  const isDyingRef = useRef(false);

  const hasFinishedDeathRef = useRef(false);
  
  // Track if crawler voice has been played for current engagement
  const hasPlayedVoiceRef = useRef(false);
  
  // Death fragment effect state
  const [showDeathFragments, setShowDeathFragments] = useState(false);
  const [deathPosition, setDeathPosition] = useState<[number, number, number]>([0, 0, 0]);

  // Generate enemy ID if not provided

  const enemyId = id || `crawler-${start.join("-")}-${end.join("-")}`;
  
  // Determine zone from position if not provided
  const determinedZoneId = zoneId || (start[0] < 5 ? 'zone2' : start[0] < 35 ? 'zone3' : 'zone4') as 'zone2' | 'zone3' | 'zone4';

  const { incrementEnemiesKilled, checkWinCondition, playerPosition } = useGameState();

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
    
    // Register with respawn manager
    enemyRespawnManager.registerEnemy(determinedZoneId, enemyId);

    return () => {

      unregisterEnemy(enemyId);

    };

  }, [enemyId, maxHealth, enemyName, determinedZoneId]);

  useFrame((_state, delta) => {

    const root = enemyRef.current;

    if (!root || hasFinishedDeathRef.current) return;

    // Death handling

    if (healthRef.current <= 0) {

      if (!isDyingRef.current) {

        isDyingRef.current = true;

        // Play death sound effect
        AudioManager.playSFX('EnemyDying');

        // Capture death position and trigger fragment effect
        const worldPos = new THREE.Vector3();
        root.getWorldPosition(worldPos);
        setDeathPosition([worldPos.x, worldPos.y + 0.3, worldPos.z]);
        setShowDeathFragments(true);

        // Hide enemy mesh immediately
        root.visible = false;

        console.log("[Crawler]", enemyId, "death sequence started");

      }

      if (!hasFinishedDeathRef.current) {

        hasFinishedDeathRef.current = true;

        unregisterEnemy(enemyId);
        
        // Notify respawn manager
        enemyRespawnManager.unregisterEnemy(determinedZoneId, enemyId);

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

    // Compute enemy and player world positions
    const enemyWorldPos = new THREE.Vector3();
    root.getWorldPosition(enemyWorldPos);

    const playerWorldPos = new THREE.Vector3(
      playerPosition.x,
      playerPosition.y,
      playerPosition.z
    );

    const distanceToPlayer = enemyWorldPos.distanceTo(playerWorldPos);

    // Debug logging of positions and distance
    if (import.meta.env.DEV && DEBUG_CRAWLER_LOGS) {
      console.log('[CRAWLER-DISTANCE-DEBUG]', {
        enemyId,
        enemyName,
        enemyWorldPos: {
          x: enemyWorldPos.x,
          y: enemyWorldPos.y,
          z: enemyWorldPos.z,
        },
        playerWorldPos: {
          x: playerWorldPos.x,
          y: playerWorldPos.y,
          z: playerWorldPos.z,
        },
        distanceToPlayer,
      });
    }

    // Combat engagement detection - play voice when first entering combat range
    const isInCombatRange = distanceToPlayer <= CRAWLER_COMBAT_ENGAGEMENT_RANGE;
    
    if (isInCombatRange && !hasPlayedVoiceRef.current) {
      // First time entering combat range - play voice
      hasPlayedVoiceRef.current = true;
      AudioManager.playSFX('CrawlerVoice');
    } else if (!isInCombatRange && hasPlayedVoiceRef.current) {
      // Player left combat range - reset flag for next engagement
      hasPlayedVoiceRef.current = false;
    }

    // Update attack cooldown (delta is in seconds)
    attackCooldownRef.current = Math.max(attackCooldownRef.current - delta, 0);

    // Warmup / cooldown / range checks
    const now = Date.now();
    const timeSinceSpawn = now - spawnedAtRef.current;
    const canAttackByTime = timeSinceSpawn >= CRAWLER_ATTACK_WARMUP_MS;
    const distanceOk = distanceToPlayer <= CRAWLER_MELEE_RANGE;
    const cooldownReady = attackCooldownRef.current <= 0;
    const canAttackByState = true; // future hook for stun, etc

    if (canAttackByTime && canAttackByState && distanceOk && cooldownReady) {
      if (import.meta.env.DEV && DEBUG_CRAWLER_LOGS) {
        console.log('[CRAWLER-ATTACK]', {
          enemyName,
          enemyId,
          distanceToPlayer: distanceToPlayer.toFixed(2),
          meleeRange: CRAWLER_MELEE_RANGE,
          attackCooldown: attackCooldownRef.current.toFixed(2),
        });
      }

      applyDamageToPlayer(attackDamage, 'SimpleCrawler-bite');

      attackCooldownRef.current = CRAWLER_ATTACK_COOLDOWN;
    }

  });

  return (
    <>
      <group ref={enemyRef}>

        <mesh>

          <boxGeometry args={[1, 0.6, 1]} />

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
