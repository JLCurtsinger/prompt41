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

import { Suspense, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { Player } from './Player';
import { LevelLayout, PLAYER_SPAWN_POSITION } from './LevelLayout';
import { TriggerVolume } from './Interactables/TriggerVolume';
import { HackingTerminal } from './Interactables/HackingTerminal';
import { Door } from './Interactables/Door';
import { EnemyCrawler } from './Enemies/EnemyCrawler';
import { EnemyShambler } from './Enemies/EnemyShambler';
import { EnemySentinel } from './Enemies/EnemySentinel';
import { ScreenFade } from './Effects/ScreenFade';
import { LootCrate } from './Interactables/LootCrate';
import { EnergyCell } from './Pickups/EnergyCell';
import { ZoneAudioController } from './audio/ZoneAudioController';
import { useGameState } from '../state/gameState';
import * as THREE from 'three';

// Loot and pickup positions (easily adjustable for future GLB integration)
const LOOT_CRATE_ZONE2_POSITION: [number, number, number] = [2, 0, -3]; // Zone 2 (Processing Yard)
const ENERGY_CELL_ZONE3_POSITION: [number, number, number] = [15, 0.5, -2]; // Zone 3 (Conduit Hall)

// Zone transition marker positions (tied to trigger positions for easy GLB migration)
// These are temporary guidance markers that will move with the future GLB environment
const ZONE_TRANSITION_1_TO_2: [number, number, number] = [-5, -0.05, 0]; // Between Zone 1 and Zone 2
const ZONE_TRANSITION_2_TO_3: [number, number, number] = [10, -0.05, 0]; // Between Zone 2 and Zone 3
const ZONE_TRANSITION_3_TO_4: [number, number, number] = [32, -0.05, 0]; // Between Zone 3 and Zone 4

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

export function GameScene() {
  const [playerPosition, setPlayerPosition] = useState<[number, number, number]>(PLAYER_SPAWN_POSITION);
  const [isShamblerActivated, setIsShamblerActivated] = useState(false);
  const [isSentinelActivated, setIsSentinelActivated] = useState(false);
  const [zone1Entered, setZone1Entered] = useState(false);
  const [zone2Entered, setZone2Entered] = useState(false);
  const [zone3Entered, setZone3Entered] = useState(false);
  const [zone4Entered, setZone4Entered] = useState(false);
  
  const playHostLine = useGameState((state) => state.playHostLine);
  const setCurrentZone = useGameState((state) => state.setCurrentZone);
  
  return (
    <>
      <ZoneAudioController />
      <ScreenFade />
      <Canvas
      style={{ width: '100vw', height: '100vh' }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
      shadows
    >
      <Suspense fallback={null}>
        {/* Lighting Setup */}
        {/* Global ambient light - very low intensity for base visibility */}
        <ambientLight intensity={0.2} />
        
        {/* Main directional light - soft shadows, ceiling lamp angle */}
        <directionalLight 
          position={[0, 8, 5]} 
          intensity={1.2} 
          castShadow
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
          castShadow
        />
        
        {/* Zone 2 (Processing Yard) - Large point light */}
        <pointLight 
          position={[0, 5, 0]} 
          intensity={1.8} 
          distance={18}
          decay={2}
          castShadow
        />
        
        {/* Zone 3 (Conduit Hall) - Large point light */}
        <pointLight 
          position={[15, 4, 0]} 
          intensity={1.5} 
          distance={15}
          decay={2}
          castShadow
        />
        
        {/* Zone 4 (Core Chamber) - Dramatic red/orange point light */}
        <pointLight 
          position={[40, 6, 0]} 
          intensity={2.5} 
          distance={20}
          decay={2}
          color="#ff4400"
          castShadow
        />
        
        {/* Camera is controlled by Player component's useFrame hook */}
        <PerspectiveCamera makeDefault position={[0, 2, 5]} fov={75} />
        
        {/* Level layout with all four zones */}
        <LevelLayout />
        
        {/* Player component - camera rig is handled inside Player */}
        {/* Player spawns at Zone 1 position defined in LevelLayout */}
        <Player initialPosition={PLAYER_SPAWN_POSITION} />
        
        {/* Track player position for enemies */}
        <PlayerPositionTracker onPositionUpdate={setPlayerPosition} />
        
        {/* Enemy: Crawler Zombot in Zone 2 (Processing Yard) */}
        {/* TODO: This should be the first Crawler encounter from the design doc - add reveal micro-cutscene */}
        <EnemyCrawler 
          initialPosition={[0, 0, 0]} 
          playerPosition={playerPosition}
        />
        
        {/* Enemy: Shambler Zombot in Zone 3 (Conduit Hall) */}
        {/* Shambler starts idle until activated by trigger volume */}
        <EnemyShambler
          initialPosition={[18, 0, 0]}
          playerPosition={playerPosition}
          isActivated={isShamblerActivated}
        />
        
        {/* Enemy: Sentinel Miniboss in Zone 4 (Core Chamber) */}
        {/* Sentinel starts idle until activated by trigger volume */}
        <EnemySentinel
          initialPosition={[40, 0, 0]}
          playerPosition={playerPosition}
          isActivated={isSentinelActivated}
        />
        
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
        
        {/* Zone 3 entry trigger */}
        <TriggerVolume
          position={[10, 1, 0]}
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
        
        {/* Zone 4 entry trigger */}
        <TriggerVolume
          position={[32, 1, 0]}
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
            setIsShamblerActivated(true);
          }}
          name="Zone3_ShamblerActivation"
        />
        
        {/* Zone 4 Sentinel activation trigger - fires when player enters Zone 4 (Core Chamber) */}
        {/* This is the "Sentinel intro moment" - activates the Sentinel Miniboss */}
        <TriggerVolume
          position={[35, 1, 0]}
          size={[6, 4, 6]}
          onEnter={() => {
            console.log('Sentinel activation triggered');
            setIsSentinelActivated(true);
            playHostLine('combat:sentinelSpawn');
            // TODO: Hook into Sentinel Zombot boot-up micro-cutscene
            // TODO: Adjust lighting for dramatic reveal
          }}
          name="Zone4_SentinelActivation"
        />
        
        {/* Hacking Terminal in Zone 2 */}
        <HackingTerminal id="terminal-zone2-main" position={[0, 0, -5]} />
        
        {/* Final Hacking Terminal in Zone 4 (Core Chamber) */}
        <HackingTerminal id="terminal-zone4-final" position={[40, 0, -3]} />
        
        {/* Door between Zone 1 and Zone 2 */}
        <Door id="zone1-zone2-main" position={[-7, 0, 0]} />
        
        {/* Loot Crate in Zone 2 (Processing Yard) */}
        <LootCrate id="crate-zone2-1" position={LOOT_CRATE_ZONE2_POSITION} />
        
        {/* Standalone Energy Cell in Zone 3 (Conduit Hall) */}
        <EnergyCell position={ENERGY_CELL_ZONE3_POSITION} />
        
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
        
        {/* Simple ground plane for reference (can be removed once level geometry is complete) */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial 
            color="#2a2a2a" 
            roughness={0.7}
            metalness={0.1}
          />
        </mesh>
        
        {/* Simple grid helper for reference */}
        <gridHelper args={[100, 50, '#333', '#222']} />
      </Suspense>
    </Canvas>
    </>
  );
}

