// TEST PLAN (Door)
// 1. Initial State:
//    - Door should be visible and blocking when doorState is 'closed'
//    - Door should be positioned at ground level (Y=0 for base, Y=2 for door panel center)
// 2. State Change:
//    - When doorState changes to 'open', door should move up (Y + 4) or hide
//    - Player should be able to walk through the space where door was
//    - Collision should be removed when door is open
// 3. Visual Feedback:
//    - Door should smoothly animate to open state
//    - Door should visually indicate locked/unlocked state

import { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGameState } from '../../state/gameState';
import { registerWallColliderFromObject, unregisterWallCollider } from '../colliders/wallColliders';
import { DoorModel } from '../models/DoorModel';
import * as THREE from 'three';

interface DoorProps {
  doorId: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
}

export function Door({ doorId, position, rotation = [0, 0, 0], scale = [1, 1, 1] }: DoorProps) {
  const doorRef = useRef<THREE.Group>(null);
  const doorPanelRef = useRef<THREE.Group>(null);
  const colliderRef = useRef<THREE.Mesh>(null);
  const { scene } = useThree();
  const isDoorOpen = useGameState((state) => state.isDoorOpen(doorId));
  const showInteractionPrompt = useGameState((state) => state.showInteractionPrompt);
  const clearInteractionPrompt = useGameState((state) => state.clearInteractionPrompt);
  const interactionPrompt = useGameState((state) => state.interactionPrompt);
  // @ts-expect-error - isInRange state kept for React state management, but we use isInRangeRef for comparisons to avoid unnecessary re-renders
  const [isInRange, setIsInRange] = useState(false);
  // Performance optimization: track last isInRange value to avoid unnecessary state updates
  const isInRangeRef = useRef(false);
  
  // Ensure door is at ground level - door panel center should be at Y=2 (4 units tall)
  // Position is the base position, so we adjust the door panel to be at Y=2
  const normalizedPosition: [number, number, number] = [position[0], 0, position[2]];
  // Door panel starts at Y=2 relative to door group, slides up 4 units when opening
  const targetY = isDoorOpen ? 2 + 4 : 2;
  const INTERACTION_RANGE = 2.5;
  
  // Register/unregister collision based on door state
  useEffect(() => {
    const colliderDebugId = `door-${doorId}`;
    
    if (!isDoorOpen) {
      // Register collision when door is closed
      if (colliderRef.current) {
        registerWallColliderFromObject(colliderRef.current, colliderDebugId);
      }
    } else {
      // Unregister collision when door is open
      unregisterWallCollider(colliderDebugId);
    }
    
    // Cleanup: unregister on unmount
    return () => {
      unregisterWallCollider(colliderDebugId);
    };
  }, [isDoorOpen, doorId]);
  
  // Check if player is in range and update prompt
  useFrame((_, delta) => {
    if (!doorRef.current || !doorPanelRef.current) return;
    
    // Animate door position (slide up when opening)
    const currentY = doorPanelRef.current.position.y;
    const diff = targetY - currentY;
    
    // Smoothly animate to target position
    if (Math.abs(diff) > 0.01) {
      doorPanelRef.current.position.y += diff * delta * 2; // Speed of animation
    } else {
      doorPanelRef.current.position.y = targetY;
    }
    
    // Check player distance for interaction prompt
    let playerPosition: THREE.Vector3 | null = null;
    
    scene.traverse((object) => {
      if (object instanceof THREE.Group) {
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
    
    if (!playerPosition) {
      // Only update state when value actually changes
      if (isInRangeRef.current !== false) {
        setIsInRange(false);
        isInRangeRef.current = false;
      }
      return;
    }
    
    const playerPos = playerPosition as THREE.Vector3;
    const doorPos = new THREE.Vector3(...normalizedPosition);
    const distance = playerPos.distanceTo(doorPos);
    const nowInRange = distance <= INTERACTION_RANGE;
    const wasInRange = isInRangeRef.current;
    // Only update state when value actually changes
    if (nowInRange !== isInRangeRef.current) {
      setIsInRange(nowInRange);
      isInRangeRef.current = nowInRange;
    }
    
    // Update interaction prompt based on range and state
    // Priority: Terminal > Door > Crate
    const hasHigherPriorityPrompt = interactionPrompt.sourceId && 
      interactionPrompt.sourceId.startsWith('terminal-');
    
    if (nowInRange && !wasInRange && !isDoorOpen && !hasHigherPriorityPrompt) {
      // Just entered range and door is closed
      showInteractionPrompt({
        message: 'Door locked (requires hack)',
        sourceId: `door-${doorId}`,
      });
    } else if (!nowInRange && wasInRange) {
      // Just left range
      clearInteractionPrompt(`door-${doorId}`);
    } else if (nowInRange && isDoorOpen && interactionPrompt.sourceId === `door-${doorId}`) {
      // In range but door is open - clear prompt
      clearInteractionPrompt(`door-${doorId}`);
    } else if (nowInRange && !isDoorOpen && hasHigherPriorityPrompt && interactionPrompt.sourceId === `door-${doorId}`) {
      // Higher priority prompt appeared - clear door prompt
      clearInteractionPrompt(`door-${doorId}`);
    }
  });
  
  return (
    <group ref={doorRef} position={normalizedPosition} rotation={rotation} scale={scale}>
      {/* Door model - slides up when opening */}
      <group ref={doorPanelRef} position={[0, 2, 0]}>
        <DoorModel />
      </group>
      
      {/* Door lock indicator (red light when closed) */}
      {!isDoorOpen && (
        <mesh position={[0.8, 2.5, 0.16]}>
          <boxGeometry args={[0.1, 0.1, 0.05]} />
          <meshStandardMaterial 
            color="#ff0000" 
            emissive="#ff0000" 
            emissiveIntensity={1}
          />
        </mesh>
      )}
      
      {/* Door unlock indicator (green light when open) */}
      {isDoorOpen && (
        <mesh position={[0.8, 2.5, 0.16]}>
          <boxGeometry args={[0.1, 0.1, 0.05]} />
          <meshStandardMaterial 
            color="#00ff00" 
            emissive="#00ff00" 
            emissiveIntensity={1}
          />
        </mesh>
      )}
      
      {/* Collision/blocking box - only active when closed, matches door panel dimensions */}
      {!isDoorOpen && (
        <mesh ref={colliderRef} position={[0, 2, 0]} visible={false}>
          <boxGeometry args={[2, 4, 0.5]} />
          <meshBasicMaterial visible={false} />
        </mesh>
      )}
    </group>
  );
}

