// TEST PLAN (TriggerVolume)
// - Spawns at specified position with specified size
// - Detects when player enters volume (fires onEnter once)
// - Detects when player exits volume (fires onExit if provided)
// - Does not spam onEnter if player stays inside
// - Works correctly with multiple trigger volumes in scene
// - Blue area crash fix: onEnter callback should be safely called even if it throws
// - Step on blue floor areas -> should not crash, should handle missing/invalid callbacks gracefully

import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface TriggerVolumeProps {
  position: [number, number, number];
  size: [number, number, number]; // [width, height, depth]
  onEnter: () => void;
  onExit?: () => void;
  name?: string; // Optional name for debugging
}

export function TriggerVolume({ 
  position, 
  size, 
  onEnter, 
  onExit,
  name = 'TriggerVolume'
}: TriggerVolumeProps) {
  const hasEntered = useRef(false);
  const { scene } = useThree();
  
  useFrame(() => {
    // Find player in scene by searching for the Player group
    // We look for a group that contains a capsule mesh (the player placeholder)
    let playerPosition: THREE.Vector3 | null = null;
    
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
          playerPosition = object.position.clone();
        }
      }
    });
    
    if (!playerPosition) return;
    
    // Calculate distance from player to trigger center
    const triggerCenter = new THREE.Vector3(...position);
    const halfSize = new THREE.Vector3(size[0] / 2, size[1] / 2, size[2] / 2);
    
    // Check if player is inside the bounding box
    const playerLocal = playerPosition.clone().sub(triggerCenter);
    const isInside = 
      Math.abs(playerLocal.x) <= halfSize.x &&
      Math.abs(playerLocal.y) <= halfSize.y &&
      Math.abs(playerLocal.z) <= halfSize.z;
    
    if (isInside && !hasEntered.current) {
      hasEntered.current = true;
      // Defensive check: safely call onEnter, catch any errors to prevent crashes
      try {
        if (onEnter && typeof onEnter === 'function') {
          onEnter();
        } else {
          console.warn(`TriggerVolume ${name}: onEnter callback is missing or invalid`);
        }
      } catch (error) {
        console.error(`TriggerVolume ${name}: Error in onEnter callback:`, error);
        // Don't re-throw - allow game to continue
      }
    } else if (!isInside && hasEntered.current && onExit) {
      hasEntered.current = false;
      // Defensive check: safely call onExit
      try {
        if (typeof onExit === 'function') {
          onExit();
        }
      } catch (error) {
        console.error(`TriggerVolume ${name}: Error in onExit callback:`, error);
        // Don't re-throw - allow game to continue
      }
    }
  });
  
  // Optional: render a wireframe box for debugging (can be removed later)
  return (
    <mesh position={position} visible={false} userData={{ isTrigger: true, triggerName: name }}>
      <boxGeometry args={size} />
      <meshBasicMaterial visible={false} />
    </mesh>
  );
}

