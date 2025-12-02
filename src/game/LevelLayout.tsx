import * as THREE from 'three';
import React, { useState, useMemo } from 'react';
import type { JSX } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { TriggerVolume } from './Interactables/TriggerVolume';
import { HackingTerminal } from './Interactables/HackingTerminal';
import { Door } from './Interactables/Door';
// TODO: Deprecated - EnemySentinel replaced by Simple enemy architecture
// import { EnemySentinel } from './Enemies/EnemySentinel';
import hostLinesData from '../assets/data/hostLines.json';
import { FloorModel } from './models/FloorModel';
import { registerWallColliderFromObject } from './colliders/wallColliders';

function WallColliderWrapper({
  children,
  debugId,
}: {
  children: React.ReactNode;
  debugId: string;
}) {
  const groupRef = React.useRef<THREE.Group>(null);
  React.useEffect(() => {
    if (groupRef.current) {
      registerWallColliderFromObject(groupRef.current, debugId);
    }
  }, [debugId]);

  return <group ref={groupRef}>{children}</group>;
}

// Sentinel Mini-Boss component
function SentinelMiniBoss(props: React.ComponentPropsWithoutRef<'group'>) {
  const { scene } = useGLTF('/models/Sentinel-Mini-Boss.glb');

  return (
    <group {...props}>
      <primitive object={scene} />
    </group>
  );
}

// TODO: Wire this layout to match Zones 1–4 from CoreGameDetails.md (perimeter → yard → conduit → core chamber)

// Player spawn point in Zone 1 (Perimeter Breach)
export const PLAYER_SPAWN_POSITION: [number, number, number] = [-15, 0, 0];

// ======================
// ZONE 1 — PERIMETER BREACH
// ======================
// Mixed indoor/outdoor transition space with breach in wall, broken gate
// Smallish entry area with walls and debris boxes
// Single clear forward path into Zone 2
function PerimeterZone() {
  return (
    <group name="Zone1_PerimeterBreach">
      {/* TODO: Replace with actual level_blockout.glb geometry */}
      
      {/* ======================
          ZONE 1 — SPAWN MARKER
          ====================== */}
      <group name="zone1_spawn" position={[-15, 0, 0]} />
      
      {/* Ground plane for Zone 1 - replaced with FloorModel */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-15, 0, 0]} receiveShadow visible={false}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#3a3a3a" />
      </mesh>
      
      {/* Broken wall / breach opening (manual colliders in wallColliders.ts) */}
      <mesh position={[-15, 2, -8]} castShadow>
        <boxGeometry args={[12, 4, 0.5]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      {/* Breach gap in wall */}
      <mesh position={[-15, 2, -8]} castShadow>
        <boxGeometry args={[4, 4, 0.5]} />
        <meshStandardMaterial color="#1a1a1a" opacity={0.3} transparent />
      </mesh>
      
      {/* Broken gate / fencing on right side (visual only, no collider - has rotation) */}
      <mesh position={[-8, 1.5, -5]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <boxGeometry args={[8, 3, 0.2]} />
        <meshStandardMaterial color="#4a4a4a" />
      </mesh>
      
      {/* Debris / collapsed structure */}
      <mesh position={[-20, 0.5, 3]} rotation={[0, 0, Math.PI / 6]} castShadow>
        <boxGeometry args={[3, 1, 4]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      
      {/* Exposed cables (simple representation) */}
      <mesh position={[-12, 1, -6]}>
        <cylinderGeometry args={[0.05, 0.05, 3, 8]} />
        <meshStandardMaterial color="#ff4444" emissive="#ff0000" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

// ======================
// ZONE 2 — PROCESSING YARD
// ======================
// Wide interior / yard-like area
// Clear open space where the first combat encounter will later happen
// Logical spot where the first terminal + door will eventually be
function ProcessingYardZone() {
  return (
    <group name="Zone2_ProcessingYard">
      {/* TODO: Replace with actual level_blockout.glb geometry */}
      
      {/* Ground plane for Zone 2 - replaced with FloorModel */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow visible={false}>
        <planeGeometry args={[40, 35]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      
      {/* Machinery / equipment blocks creating paths */}
      {/* Adjusted position to ensure clear path from spawn to crawler */}
      <WallColliderWrapper debugId="zone2-machinery-block-1">
        <mesh position={[-5, 1.5, 3]} castShadow>
          <boxGeometry args={[4, 3, 4]} />
          <meshStandardMaterial color="#3a3a3a" />
        </mesh>
      </WallColliderWrapper>
      
      <WallColliderWrapper debugId="zone2-machinery-block-2">
        <mesh position={[5, 1.5, -3]} castShadow>
          <boxGeometry args={[5, 3, 3]} />
          <meshStandardMaterial color="#3a3a3a" />
        </mesh>
      </WallColliderWrapper>
      
      <WallColliderWrapper debugId="zone2-machinery-block-3">
        <mesh position={[0, 1, -8]} castShadow>
          <boxGeometry args={[6, 2, 4]} />
          <meshStandardMaterial color="#3a3a3a" />
        </mesh>
      </WallColliderWrapper>
      
      {/* Central path marker (where terminal will be) */}
      <mesh position={[0, 0.1, -5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3, 3]} />
        <meshStandardMaterial color="#1a4a6a" emissive="#1a4a6a" emissiveIntensity={0.2} />
      </mesh>
      
      {/* Zone 2 terminal controlling Zone 2 -> Zone 3 door */}
      <HackingTerminal
        id="terminal-zone2-main"
        position={[0, 0, -5]}
      />
      
      {/* Door terminal for Zone 1 -> Zone 2 door (placed near the door) */}
      <HackingTerminal
        id="terminal-zone1-door"
        position={[-5, 0, 2]}
        terminalMode="door"
        doorId="zone1-door"
      />
    </group>
  );
}

// ======================
// ZONE 3 — BRANCHING CONDUIT WING
// ======================
// Fork: Side path → short corridor/room (for a log / scare later)
// Main path → corridor leading toward Zone 4
// Simple box walls or corridors to make the fork visually clear
function ConduitHallZone() {
  return (
    <group name="Zone3_ConduitHall">
      {/* TODO: Replace with actual level_blockout.glb geometry */}
      
      {/* Main corridor ground - replaced with FloorModel */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[20, 0, 0]} receiveShadow visible={false}>
        <planeGeometry args={[30, 12]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      
      {/* Corridor walls - expanded */}
      <WallColliderWrapper debugId="zone3-corridor-wall-left">
        <mesh position={[20, 2, -6]} castShadow>
          <boxGeometry args={[30, 4, 0.5]} />
          <meshStandardMaterial color="#3a3a3a" />
        </mesh>
      </WallColliderWrapper>
      <WallColliderWrapper debugId="zone3-corridor-wall-right">
        <mesh position={[20, 2, 6]} castShadow>
          <boxGeometry args={[30, 4, 0.5]} />
          <meshStandardMaterial color="#3a3a3a" />
        </mesh>
      </WallColliderWrapper>
      
      {/* Side room (branch path) */}
      <group position={[25, 0, -6]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow visible={false}>
          <planeGeometry args={[6, 6]} />
          <meshStandardMaterial color="#2a2a2a" />
        </mesh>
        <WallColliderWrapper debugId="zone3-side-room-wall-left">
          <mesh position={[0, 2, -3]} castShadow>
            <boxGeometry args={[6, 4, 0.5]} />
            <meshStandardMaterial color="#3a3a3a" />
          </mesh>
        </WallColliderWrapper>
        <WallColliderWrapper debugId="zone3-side-room-wall-right">
          <mesh position={[0, 2, 3]} castShadow>
            <boxGeometry args={[6, 4, 0.5]} />
            <meshStandardMaterial color="#3a3a3a" />
          </mesh>
        </WallColliderWrapper>
        <WallColliderWrapper debugId="zone3-side-room-wall-back">
          <mesh position={[-3, 2, 0]} castShadow>
            <boxGeometry args={[0.5, 4, 6]} />
            <meshStandardMaterial color="#3a3a3a" />
          </mesh>
        </WallColliderWrapper>
        {/* TODO: Environmental log or collectible will be placed here */}
      </group>
      
      {/* Conduits / pipes along ceiling - expanded */}
      <mesh position={[20, 3.5, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 30, 8]} />
        <meshStandardMaterial color="#4a4a4a" />
      </mesh>
      
      {/* Zone 3 terminal (awards Source Code) - adjusted to new corridor center */}
      <HackingTerminal
        id="terminal-zone3"
        position={[25, 0, 0]}
        rotation={[0, -Math.PI, 0]}
      />
      
      {/* TODO: Hazard area (steam vents, sparks) will be added here */}
    </group>
  );
}

// ======================
// ZONE 4 — CORE ACCESS CHAMBER
// ======================
// Larger room at the end of the main path
// Roughly circular or polygonal shape (approximated with multiple boxes)
// Clear center feature placeholder and Sentinel spawn placeholder
function CoreAccessChamberZone() {
  return (
    <group name="Zone4_CoreAccessChamber">
      {/* TODO: Replace with actual level_blockout.glb geometry */}
      
      {/* Circular arena ground - replaced with FloorModel */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[45, 0, 0]} receiveShadow visible={false}>
        <cylinderGeometry args={[16, 16, 0.1, 32]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      
      {/* Arena walls (partial circle) - expanded */}
      {Array.from({ length: 20 }).map((_, i) => {
        const angle = (i / 20) * Math.PI * 2;
        const x = Math.cos(angle) * 16;
        const z = Math.sin(angle) * 16;
        return (
          <WallColliderWrapper key={i} debugId={`zone4-arena-wall-${i}`}>
            <mesh position={[45 + x, 2, z]} castShadow>
              <boxGeometry args={[1.5, 4, 0.5]} />
              <meshStandardMaterial color="#2a2a2a" />
            </mesh>
          </WallColliderWrapper>
        );
      })}
      
      {/* Center feature placeholder */}
      <group
        name="core_chamber_center"
        position={[45, 0, 0]} // center of the room
      />
      
      {/* Sentinel containment cylinder */}
      <mesh position={[45, 3.75, 0]}>
        <cylinderGeometry args={[4.5, 4.5, 7.5, 32]} />
        <meshPhysicalMaterial
          color="#2b6cff"
          transparent
          opacity={0.35}
          roughness={0.1}
          metalness={0.4}
        />
      </mesh>
      
      {/* Sentinel Mini-Boss - final boss encounter */}
      <SentinelMiniBoss
        position={[45, 0, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        scale={1.5}
      />
    </group>
  );
}

// Main level layout component combining all zones
export function LevelLayout({ isMobile = false }: { isMobile?: boolean }) {
  const { scene } = useThree();
  const [_playerPosition, setPlayerPosition] = useState<[number, number, number]>([-15, 0, 0]);
  const [_isSentinelActivated, setIsSentinelActivated] = useState(false);
  
  // Track player position for enemies
  useFrame(() => {
    scene.traverse((object) => {
      if (object instanceof THREE.Group) {
        let hasCapsule = false;
        object.traverse((child) => {
          if (child instanceof THREE.Mesh && child.geometry instanceof THREE.CapsuleGeometry) {
            hasCapsule = true;
          }
        });
        if (hasCapsule) {
          const pos = object.position;
          setPlayerPosition([pos.x, pos.y, pos.z]);
        }
      }
    });
  });
  
  return (
    <group name="LevelLayout">
      <PerimeterZone />
      <ProcessingYardZone />
      <ConduitHallZone />
      <CoreAccessChamberZone />
      
      {/* Transition connectors between zones - replaced with FloorModel */}
      {/* Zone 1 to Zone 2 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-5, 0, 0]} receiveShadow visible={false}>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      
      {/* Door between Zone 1 and Zone 2 */}
      <Door
        doorId="zone1-door"
        position={[-5, 0, 0]}
      />
      
      {/* Zone 2 to Zone 3 - adjusted position */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[12, 0, 0]} receiveShadow visible={false}>
        <planeGeometry args={[10, 8]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      
      {/* Door gating Zone 2 -> Zone 3 - adjusted position */}
      <Door
        doorId="zone2-door"
        position={[12, 0, 0]}
      />
      
      {/* Door terminal for Zone 2 -> Zone 3 door (placed near the door) */}
      <HackingTerminal
        id="terminal-zone2-door"
        position={[12, 0, 2]}
        terminalMode="door"
        doorId="zone2-door"
      />
      
      {/* Zone 3 to Zone 4 - adjusted position */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[35, 0, 0]} receiveShadow visible={false}>
        <planeGeometry args={[10, 8]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      
      {/* Tiled FloorModel covering the entire play area - memoized for performance */}
      {useMemo(() => {
        const tiles: JSX.Element[] = [];

        // Approximate play area bounds.
        const X_START = -20;
        const X_END = 60;
        const Z_START = -12;
        const Z_END = 12;

        // Slight overlap to completely eliminate visible gaps between tiles.
        const TILE_SPACING_X = 1.8;
        const TILE_SPACING_Z = 1.8;

        for (let x = X_START; x <= X_END; x += TILE_SPACING_X) {
          for (let z = Z_START; z <= Z_END; z += TILE_SPACING_Z) {
            tiles.push(
              <FloorModel
                key={`${x}-${z}`}
                position={[x, 0, z]}
                scaleMultiplier={1}
                isMobile={isMobile}
              />
            );
          }
        }

        return tiles;
      }, [isMobile])}
      
      {/* ======================
          TRIGGER VOLUMES
          ====================== */}
      
      {/* Trigger: First encounter (placeholder)
          Placed at the transition between Zone 1 and Zone 2 */}
      {/* TODO: Hook this trigger to the Crawler reveal micro-cutscene later */}
      <TriggerVolume
        name="trigger_zone2_first_encounter"
        size={[8, 4, 8]}
        position={[-5, 1, 0]}
        onEnter={() => {}}
      />
      
      {/* Trigger: Branching fork
          Placed where the level branches into side path / main path */}
      <TriggerVolume
        name="trigger_zone3_branch"
        size={[6, 4, 6]}
        position={[20, 1, 0]}
        onEnter={() => {}}
      />
      
      {/* Trigger: Core chamber entry
          Placed at the entrance to the final room - adjusted position */}
      <TriggerVolume
        name="trigger_zone4_core_entry"
        size={[8, 4, 8]}
        position={[40, 1, 0]}
        onEnter={() => {
          setIsSentinelActivated(true);
          // Core entry - show coreEntry line
          const hostLines = hostLinesData as Record<string, any>;
          if (hostLines.coreEntry && Array.isArray(hostLines.coreEntry) && hostLines.coreEntry.length > 0) {
            const randomLine = hostLines.coreEntry[Math.floor(Math.random() * hostLines.coreEntry.length)];
            console.log(randomLine);
          }
        }}
      />
      
      {/* Deprecated enemy (replaced by Simple enemies) */}
      {/* Sentinel spawn in Zone 4 */}
      {/* <EnemySentinel
        initialPosition={[40, 0, 5]}
        playerPosition={playerPosition}
        isActivated={isSentinelActivated}
      /> */}
      
      {/* Final Terminal in Zone 4 - now always hackable when in range */}
      <HackingTerminal
        id="final_terminal"
        position={[45, 0, 5]}
        rotation={[0, -Math.PI, 0]}
      />
    </group>
  );
}

// Preload Sentinel Mini-Boss model
useGLTF.preload('/models/Sentinel-Mini-Boss.glb');

