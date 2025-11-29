// TEST PLAN (Lighting Setup)
// 1. Walk through each zone and verify visibility:
//    - Zone 1 (breach): Should be visible with ambient + point light
//    - Zone 2 (processing yard): Should be visible with ambient + point light
//    - Zone 3 (conduit hall): Should be visible with ambient + point light
//    - Zone 4 (core chamber): Should have dramatic red/orange lighting
// 2. Enemies should be visible from ~10 meters:
//    - Crawler: Red/orange emissive core should be clearly visible
//    - Shambler: Red/orange emissive core should be clearly visible
// 3. Zone 4 should have dramatic red lighting:
//    - Red/orange point light should create atmospheric glow
//    - Core chamber should feel distinct from other zones

import { Suspense, useState, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Environment, PerformanceMonitor } from '@react-three/drei';
import { Player } from './Player';
import { LevelLayout, PLAYER_SPAWN_POSITION } from './LevelLayout';
import { TriggerVolume } from './Interactables/TriggerVolume';
// import { HackingTerminal } from './Interactables/HackingTerminal'; // Unused - terminals are in LevelLayout
import { Door } from './Interactables/Door';
// import { EnemyCrawler } from './Enemies/EnemyCrawler'; // Replaced with SimpleCrawler
// import { TestCrawler } from './Enemies/TestCrawler'; // Kept for future debugging, not used
import { SimpleCrawler } from './Enemies/SimpleCrawler';
import { SimpleDrone } from './Enemies/SimpleDrone';
import { SimpleShambler } from './Enemies/SimpleShambler';
// import { EnemyShambler } from './Enemies/EnemyShambler';
// TODO: Deprecated - EnemySentinel replaced by Simple enemy architecture
// import { EnemySentinel } from './Enemies/EnemySentinel';
import { ScreenFade } from './Effects/ScreenFade';
import { LootCrate } from './Interactables/LootCrate';
import { EnergyCell } from './Pickups/EnergyCell';
// Source code pickups now come from hacking terminals only
// import { SourceCodePickup } from './Pickups/SourceCodePickup';
import { ZoneAudioController } from './audio/ZoneAudioController';
import { BackgroundAtmosphere } from './audio/BackgroundAtmosphere';
import { useGameState } from '../state/gameState';
import { getAllEnemies } from './Enemies/enemyRegistry';
import { enemyRespawnManager } from './Enemies/EnemyRespawnManager';
import * as THREE from 'three';

// Exit Portal position (at the far end of Zone 4) - adjusted for expanded zone
const EXIT_PORTAL_POSITION: [number, number, number] = [55, 0, 0];

// DEBUG: Toggle world debug helpers visibility
const DEBUG_SHOW_WORLD_HELPERS = true;

// Loot and pickup positions (easily adjustable for future GLB integration)
const LOOT_CRATE_ZONE2_POSITION: [number, number, number] = [2, 0, -3]; // Zone 2 (Processing Yard)

// Energy Cell pickup positions - exactly 3 pickups near enemy encounter areas
const ENERGY_CELL_POSITIONS: [number, number, number][] = [
  [-2, 0.3, 1],    // Zone 2 - near Crawler/Drone area
  [25, 0.3, 0],    // Zone 3 - near Shambler area (adjusted for expanded zone)
  [45, 0.3, -3],   // Zone 4 - near future boss area (adjusted for expanded zone)
];


// Source code pickups now come from hacking terminals only
// Old world pickup positions removed - these were the cyan/blue glowing spheres
// const SOURCE_CODE_POSITIONS: [number, number, number][] = [
//   [-12, 0.5, 2],    // Zone 1 - near spawn
//   [-14, 0.5, -2],   // Zone 1 - opposite corner
//   [-2, 0.5, 3],     // Zone 2 - near entrance
//   [4, 0.5, -4],     // Zone 2 - far corner
//   [0, 0.5, 0],      // Zone 2 - center
//   [14, 0.5, 2],     // Zone 3 - near entrance
// ];

// Zone transition marker positions (tied to trigger positions for easy GLB migration)
// These are temporary guidance markers that will move with the future GLB environment
const ZONE_TRANSITION_1_TO_2: [number, number, number] = [-5, -0.05, 0]; // Between Zone 1 and Zone 2
const ZONE_TRANSITION_2_TO_3: [number, number, number] = [10, -0.05, 0]; // Between Zone 2 and Zone 3
const ZONE_TRANSITION_3_TO_4: [number, number, number] = [37, -0.05, 0]; // Between Zone 3 and Zone 4

// Enemy difficulty tuning - centralized configuration
const ENEMY_TUNING = {
  crawler: { maxHealth: 150, speed: 0.35, attackDamage: 6, attackCooldown: 1.0, attackRange: 2.2 },
  drone:   { maxHealth: 100, moveSpeed: 0.45, attackDamage: 4, attackCooldown: 1.1, attackRange: 2.6 }
};

// Exit Portal component - glowing portal that becomes interactable when objective is complete
function ExitPortal({ position }: { position: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null);
  const [isInRange, setIsInRange] = useState(false);
  
  const objectiveComplete = useGameState((state) => state.objectiveComplete);
  const setHasWon = useGameState((state) => state.setHasWon);
  const showInteractionPrompt = useGameState((state) => state.showInteractionPrompt);
  const clearInteractionPrompt = useGameState((state) => state.clearInteractionPrompt);
  const playerPosition = useGameState((state) => state.playerPosition);
  const isPaused = useGameState((state) => state.isPaused);
  const isDead = useGameState((state) => state.isDead);
  
  const INTERACTION_RANGE = 3.0;
  const PULSE_SPEED = 2.0;
  
  // Handle E key press for exit interaction
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'e' && isInRange && objectiveComplete && !isPaused && !isDead) {
        setHasWon(true);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isInRange, objectiveComplete, isPaused, isDead, setHasWon]);
  
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    
    // Animate glow intensity with pulsing effect
    const pulse = Math.sin(Date.now() * 0.001 * PULSE_SPEED * Math.PI) * 0.5 + 0.5;
    groupRef.current.children.forEach((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        // Pulse emissive intensity based on objective state
        const baseIntensity = objectiveComplete ? 2.0 : 0.3;
        child.material.emissiveIntensity = baseIntensity + pulse * (objectiveComplete ? 1.0 : 0.2);
      }
    });
    
    // Slowly rotate the portal
    groupRef.current.rotation.y += delta * 0.5;
    
    // Check player distance
    const playerPos = new THREE.Vector3(playerPosition.x, playerPosition.y, playerPosition.z);
    const portalPos = new THREE.Vector3(position[0], position[1], position[2]);
    const distance = playerPos.distanceTo(portalPos);
    
    const wasInRange = isInRange;
    const nowInRange = distance <= INTERACTION_RANGE;
    setIsInRange(nowInRange);
    
    // Update interaction prompt
    if (nowInRange && !wasInRange && objectiveComplete) {
      showInteractionPrompt({
        message: 'Exit',
        actionKey: 'E',
        sourceId: 'exit-portal',
      });
    } else if (!nowInRange && wasInRange) {
      clearInteractionPrompt('exit-portal');
    } else if (nowInRange && !objectiveComplete && wasInRange) {
      // In range but objective not complete - show locked message briefly
      // Don't show continuous message, just clear any existing
      clearInteractionPrompt('exit-portal');
    }
  });
  
  // Colors based on objective state
  const portalColor = objectiveComplete ? '#00ff88' : '#555555';
  const glowColor = objectiveComplete ? '#00ff88' : '#333333';
  
  return (
    <group ref={groupRef} position={position}>
      {/* Portal frame - outer ring */}
      <mesh position={[0, 2.5, 0]} rotation={[0, 0, 0]}>
        <torusGeometry args={[2.2, 0.15, 16, 32]} />
        <meshStandardMaterial
          color="#1a1a1a"
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      
      {/* Portal frame - inner glow ring */}
      <mesh position={[0, 2.5, 0]} rotation={[0, 0, 0]}>
        <torusGeometry args={[2.0, 0.08, 16, 32]} />
        <meshStandardMaterial
          color={portalColor}
          emissive={portalColor}
          emissiveIntensity={objectiveComplete ? 1.5 : 0.2}
        />
      </mesh>
      
      {/* Portal surface - glowing plane */}
      <mesh position={[0, 2.5, 0]} rotation={[0, 0, 0]}>
        <circleGeometry args={[1.9, 32]} />
        <meshStandardMaterial
          color={glowColor}
          emissive={glowColor}
          emissiveIntensity={objectiveComplete ? 2.0 : 0.3}
          transparent
          opacity={objectiveComplete ? 0.8 : 0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Portal base pedestal */}
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[2.5, 2.8, 0.5, 16]} />
        <meshStandardMaterial
          color="#2a2a2a"
          metalness={0.5}
          roughness={0.5}
        />
      </mesh>
      
      {/* Point light for local glow */}
      <pointLight
        position={[0, 2.5, 0]}
        color={portalColor}
        intensity={objectiveComplete ? 2.0 : 0.3}
        distance={8}
        decay={2}
      />
      
      {/* Status indicator lights on base */}
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={i}
          position={[
            Math.cos((i * Math.PI) / 2) * 2.3,
            0.55,
            Math.sin((i * Math.PI) / 2) * 2.3,
          ]}
        >
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshStandardMaterial
            color={portalColor}
            emissive={portalColor}
            emissiveIntensity={objectiveComplete ? 2.0 : 0.2}
          />
        </mesh>
      ))}
    </group>
  );
}

// Component to set up fog in the scene
function FogSetup() {
  const { scene } = useThree();
  
  useEffect(() => {
    scene.fog = new THREE.FogExp2(0x000000, 0.03);
    return () => {
      scene.fog = null;
    };
  }, [scene]);
  
  return null;
}

// Component to track player position and provide it to enemies
function PlayerPositionTracker({ onPositionUpdate }: { onPositionUpdate: (pos: [number, number, number]) => void }) {
  const { scene } = useThree();
  
  useFrame(() => {
    // Find player in scene by searching for the Player group (same pattern as TriggerVolume)
    scene.traverse((object) => {
      if (object instanceof THREE.Group) {
        // Check if this group contains a capsule geometry (player placeholder)
        let hasCapsule = false;
        object.traverse((child) => {
          if (child instanceof THREE.Mesh && child.geometry instanceof THREE.CapsuleGeometry) {
            hasCapsule = true;
          }
        });
        if (hasCapsule) {
          const pos = object.position;
          onPositionUpdate([pos.x, pos.y, pos.z]);
        }
      }
    });
  });
  
  return null;
}

// Component to handle enemy respawns - must be rendered inside Canvas
function EnemyRespawnController({ 
  onSpawnEnemies 
}: { 
  onSpawnEnemies: (enemies: Array<{ id: string; type: 'crawler' | 'drone' | 'shambler'; zoneId: string; position: [number, number, number] }>) => void 
}) {
  useFrame(() => {
    const readyRespawns = enemyRespawnManager.getReadyRespawns();
    if (readyRespawns.length > 0) {
      const newEnemies = readyRespawns.map((respawn) => {
        const enemyId = enemyRespawnManager.generateEnemyId(respawn.zoneId, respawn.enemyType);
        return {
          id: enemyId,
          type: respawn.enemyType,
          zoneId: respawn.zoneId,
          position: respawn.spawnPosition,
        };
      });
      onSpawnEnemies(newEnemies);
    }
  });
  
  return null;
}

export function GameScene() {
  // Detect mobile once at startup
  const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  
  const [currentDpr, setCurrentDpr] = useState(isMobile ? 1.0 : 1.25);
  const hasAdjustedDprRef = useRef(false);
  const [_playerPosition, setPlayerPosition] = useState<[number, number, number]>(PLAYER_SPAWN_POSITION);
  const [_isSentinelActivated, _setIsSentinelActivated] = useState(false);
  const [zone1Entered, setZone1Entered] = useState(false);
  const [zone2Entered, setZone2Entered] = useState(false);
  const [zone3Entered, setZone3Entered] = useState(false);
  const [zone4Entered, setZone4Entered] = useState(false);
  const [spawnedEnemies, setSpawnedEnemies] = useState<Array<{ id: string; type: 'crawler' | 'drone' | 'shambler'; zoneId: string; position: [number, number, number]; props?: any }>>([]);
  
  const playHostLine = useGameState((state) => state.playHostLine);
  const setCurrentZone = useGameState((state) => state.setCurrentZone);
  const setTotalEnemiesForLevelStart = useGameState((state) => state.setTotalEnemiesForLevelStart);
  const resetPlayer = useGameState((state) => state.resetPlayer);
  
  // Initialize player state on game start
  useEffect(() => {
    resetPlayer();
    // Reset respawn manager
    enemyRespawnManager.reset();
    // Clear spawned enemies
    setSpawnedEnemies([]);
  }, [resetPlayer]);
  
  // Callback to handle enemy spawns from EnemyRespawnController
  const handleSpawnEnemies = (newEnemies: Array<{ id: string; type: 'crawler' | 'drone' | 'shambler'; zoneId: string; position: [number, number, number] }>) => {
    setSpawnedEnemies((prev) => [...prev, ...newEnemies]);
  };
  
  // Count enemies after they spawn and set total for win condition
  useEffect(() => {
    // Wait a frame for all enemies to register
    const timeoutId = setTimeout(() => {
      const allEnemies = getAllEnemies();
      const totalCount = allEnemies.length;
      setTotalEnemiesForLevelStart(totalCount);
      console.log(`[GameScene] Counted ${totalCount} active enemies at level start`);
    }, 100); // Small delay to ensure all enemies have registered
    
    return () => clearTimeout(timeoutId);
  }, [setTotalEnemiesForLevelStart]);
  
  // Ensure DPR stays within mobile/desktop bounds
  useEffect(() => {
    const minDpr = isMobile ? 0.7 : 0.8;
    const maxDpr = isMobile ? 1.0 : 1.25;
    setCurrentDpr((prev) => Math.max(minDpr, Math.min(maxDpr, prev)));
  }, [isMobile]);
  
  return (
    <>
      <ZoneAudioController />
      <BackgroundAtmosphere />
      <ScreenFade />
      <Canvas
      style={{ width: '100%', height: '100%', display: 'block' }}
      gl={{ antialias: false, powerPreference: 'high-performance', alpha: false }}
      dpr={currentDpr}
      shadows={!isMobile}
    >
      <Suspense fallback={null}>
        <PerformanceMonitor
          onChange={({ factor }) => {
            // If we've already adjusted DPR once, do nothing.
            if (hasAdjustedDprRef.current) return;

            // Only react if performance is clearly poor.
            if (factor < 0.7) {
              setCurrentDpr((prev) => {
                // Use the existing mobile-aware ranges.
                const minDpr = isMobile ? 0.7 : 0.8;
                const maxDpr = isMobile ? 1.0 : 1.25;

                // Reduce DPR a bit, but clamp to min/max.
                let next = prev - 0.25;
                if (next < minDpr) next = minDpr;
                if (next > maxDpr) next = maxDpr;

                // If nothing effectively changed, don't mark as adjusted.
                if (next === prev) {
                  return prev;
                }

                // Mark that we've adjusted once and lock in.
                hasAdjustedDprRef.current = true;
                return next;
              });
            }
          }}
        >
        {/* HDR Environment - provides both lighting and background */}
        <Environment
          files="/models/Environment.hdr"
          background
        />
        
        {/* Fog setup - atmospheric distance fog */}
        <FogSetup />
        
        {/* Lighting Setup */}
        {/* Global ambient light - very low intensity for base visibility */}
        <ambientLight intensity={0.2} />
        
        {/* Main directional light - soft shadows, ceiling lamp angle */}
        <directionalLight 
          position={[0, 8, 5]} 
          intensity={1.2} 
          castShadow={!isMobile}
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={50}
          shadow-camera-left={-20}
          shadow-camera-right={20}
          shadow-camera-top={20}
          shadow-camera-bottom={-20}
          shadow-bias={-0.0001}
        />
        
        {/* Zone 1 (Breach) - Large point light */}
        <pointLight 
          position={[-15, 4, 0]} 
          intensity={1.5} 
          distance={15}
          decay={2}
          castShadow={!isMobile}
        />
        
        {/* Zone 2 (Processing Yard) - Large point light */}
        <pointLight 
          position={[0, 5, 0]} 
          intensity={1.8} 
          distance={18}
          decay={2}
          castShadow={!isMobile}
        />
        
        {/* Zone 3 (Conduit Hall) - Large point light */}
        <pointLight 
          position={[15, 4, 0]} 
          intensity={1.5} 
          distance={15}
          decay={2}
          castShadow={!isMobile}
        />
        
        {/* Zone 4 (Core Chamber) - Dramatic red/orange point light */}
        <pointLight 
          position={[40, 6, 0]} 
          intensity={2.5} 
          distance={20}
          decay={2}
          color="#ff4400"
          castShadow={!isMobile}
        />
        
        {/* Camera is controlled by Player component's useFrame hook */}
        <PerspectiveCamera makeDefault position={[0, 2, 5]} fov={75} />
        
        {/* DEBUG: World origin marker */}
        {DEBUG_SHOW_WORLD_HELPERS && (
          <group name="debug_world_origin">
            <axesHelper args={[2]} />
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[0.2, 0.2, 0.2]} />
              <meshStandardMaterial
                color="#ff00ff"
                emissive="#ff00ff"
                emissiveIntensity={1}
              />
            </mesh>
          </group>
        )}
        
        {/* Level layout with all four zones */}
        <LevelLayout isMobile={isMobile} />
        
        {/* Player component - camera rig is handled inside Player */}
        {/* Player spawns at Zone 1 position defined in LevelLayout */}
        <Player initialPosition={PLAYER_SPAWN_POSITION} />
        
        {/* Track player position for enemies */}
        <PlayerPositionTracker onPositionUpdate={setPlayerPosition} />
        
        {/* Handle enemy respawns - must be inside Canvas */}
        <EnemyRespawnController onSpawnEnemies={handleSpawnEnemies} />
        
        {/* Enemy: Crawler Zombot in Zone 2 (Processing Yard) */}
        {/* TODO: This should be the first Crawler encounter from the design doc - add reveal micro-cutscene */}
        {/* Replaced EnemyCrawler with SimpleCrawler for reliable movement */}
        <SimpleCrawler
          {...ENEMY_TUNING.crawler}
          id="crawler-zone2-0"
          start={[-3, 0, 2]}
          end={[3, 0, -2]}
          deathDuration={0.5}
          color="red"
          enemyName="Crawler"
          zoneId="zone2"
        />
        
        <SimpleDrone
          {...ENEMY_TUNING.drone}
          id="drone-zone2-0"
          deathDuration={0.5}
          followHeight={3}
          followRadius={4}
          orbitSpeed={0.8}
          orbitCenter={[0, 4, -2]}
          aggroRadius={6}
          attackSpeed={1.5}
          color="cyan"
          enemyName="Drone"
          zoneId="zone2"
        />
        
        {/* SimpleShambler prototype in Zone 3 */}
        {/* <SimpleShambler
          id="shambler-prototype-0"
          start={[18, 0, 0]}
          end={[25, 0, -3]}
          maxHealth={120}
          attackRange={2.8}
          attackCooldown={1.4}
          attackDamage={15}
          deathDuration={0.6}
          speed={0.15}
          color="purple"
          enemyName="Shambler"
        /> */}
        
        {/* Enemy: Shambler Zombot in Zone 3 (Conduit Hall) */}
        {/* Shambler is always active from level start (like Crawler and Drone) */}
        {/* DEBUG: Shambler spawn coordinates confirmed:
            - Zone 3 ground plane is at x=20, spans x=5 to x=35
            - start=[23, 1.4, 0] is inside Zone 3 corridor, Y=1.4 places capsule bottom at ground
            - end=[27, 1.4, 0] patrols along corridor center */}
        <SimpleShambler
          id="shambler-zone3-0"
          start={[23, 1.4, 0]}
          end={[27, 1.4, 0]}
          zoneId="zone3"
        />
        
        {/* Spawned enemies from respawn system */}
        {spawnedEnemies.map((enemy) => {
          if (enemy.type === 'crawler') {
            const endPos: [number, number, number] = [
              enemy.position[0] + (Math.random() - 0.5) * 4,
              enemy.position[1],
              enemy.position[2] + (Math.random() - 0.5) * 4,
            ];
            return (
              <SimpleCrawler
                key={enemy.id}
                {...ENEMY_TUNING.crawler}
                id={enemy.id}
                start={enemy.position}
                end={endPos}
                deathDuration={0.5}
                color="red"
                enemyName="Crawler"
                zoneId={enemy.zoneId as 'zone2' | 'zone3' | 'zone4'}
              />
            );
          } else if (enemy.type === 'drone') {
            return (
              <SimpleDrone
                key={enemy.id}
                {...ENEMY_TUNING.drone}
                id={enemy.id}
                deathDuration={0.5}
                followHeight={3}
                followRadius={4}
                orbitSpeed={0.8}
                orbitCenter={[enemy.position[0], enemy.position[1] + 3, enemy.position[2]]}
                aggroRadius={6}
                attackSpeed={1.5}
                color="cyan"
                enemyName="Drone"
                zoneId={enemy.zoneId as 'zone2' | 'zone3' | 'zone4'}
              />
            );
          } else if (enemy.type === 'shambler') {
            const endPos: [number, number, number] = [
              enemy.position[0] + 4,
              enemy.position[1],
              enemy.position[2],
            ];
            return (
              <SimpleShambler
                key={enemy.id}
                id={enemy.id}
                start={enemy.position}
                end={endPos}
                zoneId={enemy.zoneId as 'zone2' | 'zone3' | 'zone4'}
              />
            );
          }
          return null;
        })}
        
        {/* Sentinel is now in LevelLayout.tsx */}
        
        {/* Trigger volumes for zone detection and scripted events */}
        {/* Zone 1 perimeter trigger - fires when player enters the breach area */}
        <TriggerVolume
          position={[-15, 1, 0]}
          size={[8, 4, 8]}
          onEnter={() => {
            console.log('Entered Zone 1 perimeter trigger');
            if (!zone1Entered) {
              setZone1Entered(true);
              setCurrentZone('zone1');
              playHostLine('zoneEntry', { zoneId: 'zone1' });
            }
          }}
          name="Zone1_PerimeterTrigger"
        />
        
        {/* Zone 2 entry trigger */}
        <TriggerVolume
          position={[-5, 1, 0]}
          size={[4, 4, 4]}
          onEnter={() => {
            if (!zone2Entered) {
              setZone2Entered(true);
              setCurrentZone('zone2');
              playHostLine('zoneEntry', { zoneId: 'zone2' });
            }
          }}
          name="Zone2_Entry"
        />
        
        {/* Zone 3 entry trigger - adjusted position */}
        <TriggerVolume
          position={[12, 1, 0]}
          size={[4, 4, 4]}
          onEnter={() => {
            if (!zone3Entered) {
              setZone3Entered(true);
              setCurrentZone('zone3');
              playHostLine('zoneEntry', { zoneId: 'zone3' });
            }
          }}
          name="Zone3_Entry"
        />
        
        {/* Zone 4 entry trigger - adjusted position */}
        <TriggerVolume
          position={[37, 1, 0]}
          size={[4, 4, 4]}
          onEnter={() => {
            if (!zone4Entered) {
              setZone4Entered(true);
              setCurrentZone('zone4');
              playHostLine('zoneEntry', { zoneId: 'zone4' });
            }
          }}
          name="Zone4_Entry"
        />
        
        {/* Zone 3 Shambler activation trigger - fires when player enters Zone 3 (Conduit Hall) */}
        {/* This is the "Shambler intro moment" - activates the Shambler Zombot */}
        <TriggerVolume
          position={[12, 1, 0]}
          size={[4, 4, 6]}
          onEnter={() => {
            console.log('Zone 3 Shambler activation trigger fired');
          }}
          name="Zone3_ShamblerActivation"
        />
        
        {/* Sentinel activation and final terminal are now in LevelLayout.tsx */}
        
        {/* Hacking Terminal in Zone 2 is now in LevelLayout.tsx */}
        
        {/* Door between Zone 1 and Zone 2 */}
        <Door id="zone1-zone2-main" position={[-7, 0, 0]} />
        
        {/* Loot Crate in Zone 2 (Processing Yard) */}
        <LootCrate id="crate-zone2-1" position={LOOT_CRATE_ZONE2_POSITION} />
        
        {/* Energy Cell pickups - exactly 3 near enemy encounter areas */}
        {ENERGY_CELL_POSITIONS.map((pos, index) => (
          <EnergyCell key={`energy-cell-${index}`} position={pos} />
        ))}
        
        {/* Source code pickups now come from hacking terminals only */}
        {/* Old SourceCodePickup world pickups removed - these were the cyan/blue glowing spheres */}
        
        {/* Exit Portal at the end of Zone 4 */}
        <ExitPortal position={EXIT_PORTAL_POSITION} />
        
        {/* Zone transition markers - subtle floor strips for guidance */}
        {/* These markers are temporary and will be replaced/moved with the future GLB environment */}
        {/* Zone 1 → Zone 2 transition marker (dim teal) */}
        <mesh
          position={ZONE_TRANSITION_1_TO_2}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[6, 0.1]} />
          <meshStandardMaterial
            color="#00ffff"
            emissive="#00ffff"
            emissiveIntensity={0.15}
            transparent
            opacity={0.4}
          />
        </mesh>
        
        {/* Zone 2 → Zone 3 transition marker (dim amber) */}
        <mesh
          position={ZONE_TRANSITION_2_TO_3}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[6, 0.1]} />
          <meshStandardMaterial
            color="#ffaa00"
            emissive="#ffaa00"
            emissiveIntensity={0.15}
            transparent
            opacity={0.4}
          />
        </mesh>
        
        {/* Zone 3 → Zone 4 transition marker (dim red) */}
        <mesh
          position={ZONE_TRANSITION_3_TO_4}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[6, 0.1]} />
          <meshStandardMaterial
            color="#ff4400"
            emissive="#ff4400"
            emissiveIntensity={0.15}
            transparent
            opacity={0.4}
          />
        </mesh>
        
        {/* Simple ground plane for reference - hidden, FloorModel now provides visual floor */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow visible={false}>
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial 
            color="#2a2a2a" 
            roughness={0.7}
            metalness={0.1}
          />
        </mesh>
        
        {/* Simple grid helper for reference */}
        <gridHelper args={[100, 50, '#333', '#222']} />
        
        {/* DEBUG: Zone 2 patrol area visualization */}
        {DEBUG_SHOW_WORLD_HELPERS && (
          <group name="debug_zone2_patrol_area">
            {/* Zone 2 approximate bounds (roughly -10 to 10 on X, -10 to 5 on Z) */}
            <mesh
              position={[0, 0.01, -2]}
              rotation={[-Math.PI / 2, 0, 0]}
              receiveShadow={false}
            >
              <planeGeometry args={[20, 15]} />
              <meshStandardMaterial
                color="#00ff00"
                emissive="#00ff00"
                emissiveIntensity={0.1}
                transparent
                opacity={0.2}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        )}
        </PerformanceMonitor>
      </Suspense>
    </Canvas>
    </>
  );
}

