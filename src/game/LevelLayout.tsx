import * as THREE from 'three';
import { TriggerVolume } from './Interactables/TriggerVolume';
import { HackingTerminal } from './Interactables/HackingTerminal';
import { Door } from './Interactables/Door';

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
      
      {/* Ground plane for Zone 1 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-15, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#3a3a3a" />
      </mesh>
      
      {/* Broken wall / breach opening */}
      <mesh position={[-15, 2, -8]} castShadow>
        <boxGeometry args={[12, 4, 0.5]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      {/* Breach gap in wall */}
      <mesh position={[-15, 2, -8]} castShadow>
        <boxGeometry args={[4, 4, 0.5]} />
        <meshStandardMaterial color="#1a1a1a" opacity={0.3} transparent />
      </mesh>
      
      {/* Broken gate / fencing on right side */}
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
      
      {/* Ground plane for Zone 2 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 25]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      
      {/* Machinery / equipment blocks creating paths */}
      <mesh position={[-5, 1.5, 2]} castShadow>
        <boxGeometry args={[4, 3, 4]} />
        <meshStandardMaterial color="#3a3a3a" />
      </mesh>
      
      <mesh position={[5, 1.5, -3]} castShadow>
        <boxGeometry args={[5, 3, 3]} />
        <meshStandardMaterial color="#3a3a3a" />
      </mesh>
      
      <mesh position={[0, 1, -8]} castShadow>
        <boxGeometry args={[6, 2, 4]} />
        <meshStandardMaterial color="#3a3a3a" />
      </mesh>
      
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
      
      {/* Main corridor ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[15, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 8]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      
      {/* Corridor walls */}
      <mesh position={[15, 2, -4]} castShadow>
        <boxGeometry args={[20, 4, 0.5]} />
        <meshStandardMaterial color="#3a3a3a" />
      </mesh>
      <mesh position={[15, 2, 4]} castShadow>
        <boxGeometry args={[20, 4, 0.5]} />
        <meshStandardMaterial color="#3a3a3a" />
      </mesh>
      
      {/* Side room (branch path) */}
      <group position={[25, 0, -6]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[6, 6]} />
          <meshStandardMaterial color="#2a2a2a" />
        </mesh>
        <mesh position={[0, 2, -3]} castShadow>
          <boxGeometry args={[6, 4, 0.5]} />
          <meshStandardMaterial color="#3a3a3a" />
        </mesh>
        <mesh position={[0, 2, 3]} castShadow>
          <boxGeometry args={[6, 4, 0.5]} />
          <meshStandardMaterial color="#3a3a3a" />
        </mesh>
        <mesh position={[-3, 2, 0]} castShadow>
          <boxGeometry args={[0.5, 4, 6]} />
          <meshStandardMaterial color="#3a3a3a" />
        </mesh>
        {/* TODO: Environmental log or collectible will be placed here */}
      </group>
      
      {/* Conduits / pipes along ceiling */}
      <mesh position={[15, 3.5, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 20, 8]} />
        <meshStandardMaterial color="#4a4a4a" />
      </mesh>
      
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
      
      {/* Circular arena ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[40, 0, 0]} receiveShadow>
        <cylinderGeometry args={[12, 12, 0.1, 32]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      
      {/* Arena walls (partial circle) */}
      {Array.from({ length: 16 }).map((_, i) => {
        const angle = (i / 16) * Math.PI * 2;
        const x = Math.cos(angle) * 12;
        const z = Math.sin(angle) * 12;
        return (
          <mesh key={i} position={[40 + x, 2, z]} castShadow>
            <boxGeometry args={[1.5, 4, 0.5]} />
            <meshStandardMaterial color="#2a2a2a" />
          </mesh>
        );
      })}
      
      {/* Central server core / reactor structure */}
      <mesh position={[40, 2, 0]} castShadow>
        <cylinderGeometry args={[2, 2, 4, 16]} />
        <meshStandardMaterial 
          color="#1a3a5a" 
          emissive="#1a4a7a" 
          emissiveIntensity={0.4} 
        />
      </mesh>
      <mesh position={[40, 4, 0]}>
        <cylinderGeometry args={[2.5, 2, 0.5, 16]} />
        <meshStandardMaterial 
          color="#2a4a6a" 
          emissive="#2a5a8a" 
          emissiveIntensity={0.6} 
        />
      </mesh>
      
      {/* TODO: Final terminal will be placed near the core at [40, 0, -3] */}
      {/* Center feature placeholder */}
      <group
        name="core_chamber_center"
        position={[40, 0, 0]} // center of the room
      />
      {/* Sentinel spawn placeholder */}
      <group
        name="sentinel_spawn_placeholder"
        position={[40, 0, 5]} // where the miniboss will appear later
      />
    </group>
  );
}

// Main level layout component combining all zones
export function LevelLayout() {
  return (
    <group name="LevelLayout">
      <PerimeterZone />
      <ProcessingYardZone />
      <ConduitHallZone />
      <CoreAccessChamberZone />
      
      {/* Transition connectors between zones */}
      {/* Zone 1 to Zone 2 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-5, 0, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      
      {/* Zone 2 to Zone 3 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[10, 0, 0]} receiveShadow>
        <planeGeometry args={[10, 8]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      
      {/* Door gating Zone 2 -> Zone 3 */}
      <Door
        id="zone2-zone3-main"
        position={[10, 0, 0]}
      />
      
      {/* Zone 3 to Zone 4 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[30, 0, 0]} receiveShadow>
        <planeGeometry args={[10, 8]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      
      {/* ======================
          TRIGGER VOLUMES
          ====================== */}
      
      {/* Trigger: First encounter (placeholder, logging only)
          Placed at the transition between Zone 1 and Zone 2 */}
      {/* TODO: Hook this trigger to the Crawler reveal micro-cutscene later */}
      <TriggerVolume
        name="trigger_zone2_first_encounter"
        size={[8, 4, 8]}
        position={[-5, 1, 0]}
        onEnter={() => console.log("Entered Zone 2 — first encounter trigger fired")}
      />
      
      {/* Trigger: Branching fork
          Placed where the level branches into side path / main path */}
      <TriggerVolume
        name="trigger_zone3_branch"
        size={[6, 4, 6]}
        position={[20, 1, 0]}
        onEnter={() => console.log("Entered Zone 3 — branching area trigger fired")}
      />
      
      {/* Trigger: Core chamber entry
          Placed at the entrance to the final room */}
      <TriggerVolume
        name="trigger_zone4_core_entry"
        size={[8, 4, 8]}
        position={[35, 1, 0]}
        onEnter={() => console.log("Entered Zone 4 — core chamber trigger fired")}
      />
    </group>
  );
}

