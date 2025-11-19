import { Suspense, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { Player } from './Player';
import { LevelLayout, PLAYER_SPAWN_POSITION } from './LevelLayout';
import { TriggerVolume } from './Interactables/TriggerVolume';
import { EnemyCrawler } from './Enemies/EnemyCrawler';
import { EnemyShambler } from './Enemies/EnemyShambler';
import * as THREE from 'three';

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
  
  return (
    <Canvas
      style={{ width: '100vw', height: '100vh' }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
    >
      <Suspense fallback={null}>
        {/* Lighting */}
        <ambientLight intensity={0.3} />
        <directionalLight position={[10, 10, 5]} intensity={0.8} castShadow />
        <pointLight position={[-10, 5, -5]} intensity={0.5} />
        
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
        
        {/* Trigger volumes for zone detection and scripted events */}
        {/* Zone 1 perimeter trigger - fires when player enters the breach area */}
        <TriggerVolume
          position={[-15, 1, 0]}
          size={[8, 4, 8]}
          onEnter={() => {
            console.log('Entered Zone 1 perimeter trigger');
            // TODO: Hook into micro-cutscene system, ambient effects, or tutorial prompts
          }}
          name="Zone1_PerimeterTrigger"
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
        
        {/* Zone 4 core chamber intro trigger - fires when player approaches final arena */}
        <TriggerVolume
          position={[35, 1, 0]}
          size={[6, 4, 6]}
          onEnter={() => {
            console.log('Core chamber intro trigger fired');
            // TODO: Hook into Sentinel Zombot boot-up micro-cutscene
            // TODO: Trigger THE HOST voice line
            // TODO: Adjust lighting for dramatic reveal
          }}
          name="Zone4_CoreChamberIntro"
        />
        
        {/* Simple ground plane for reference (can be removed once level geometry is complete) */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
        
        {/* Simple grid helper for reference */}
        <gridHelper args={[100, 50, '#333', '#222']} />
      </Suspense>
    </Canvas>
  );
}

