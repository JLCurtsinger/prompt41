// TEST PLAN (Door)
// 1. Initial State:
//    - Door should be visible and blocking when doorState is 'closed'
//    - Door should be positioned between Zone 1 and Zone 2
// 2. State Change:
//    - When doorState changes to 'open', door should move up (Y + 4) or scale down
//    - Player should be able to walk through the space where door was
// 3. Visual Feedback:
//    - Door should smoothly animate to open state
//    - Door should visually indicate locked/unlocked state

import { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGameState, getDoorState } from '../../state/gameState';
import * as THREE from 'three';

interface DoorProps {
  id: string;
  position: [number, number, number];
}

export function Door({ id, position }: DoorProps) {
  const doorRef = useRef<THREE.Group>(null);
  const { scene } = useThree();
  const doorState = useGameState((state) => getDoorState(state, id));
  const showInteractionPrompt = useGameState((state) => state.showInteractionPrompt);
  const clearInteractionPrompt = useGameState((state) => state.clearInteractionPrompt);
  const interactionPrompt = useGameState((state) => state.interactionPrompt);
  const [isInRange, setIsInRange] = useState(false);
  
  const isOpen = doorState === 'open';
  const targetY = isOpen ? position[1] + 4 : position[1];
  const INTERACTION_RANGE = 2.5;
  
  // Check if player is in range and update prompt
  useFrame((_, delta) => {
    if (!doorRef.current) return;
    
    // Animate door position
    const currentY = doorRef.current.position.y;
    const diff = targetY - currentY;
    
    // Smoothly animate to target position
    if (Math.abs(diff) > 0.01) {
      doorRef.current.position.y += diff * delta * 2; // Speed of animation
    } else {
      doorRef.current.position.y = targetY;
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
      setIsInRange(false);
      return;
    }
    
    const playerPos = playerPosition as THREE.Vector3;
    const doorPos = new THREE.Vector3(...position);
    const distance = playerPos.distanceTo(doorPos);
    const wasInRange = isInRange;
    const nowInRange = distance <= INTERACTION_RANGE;
    setIsInRange(nowInRange);
    
    // Update interaction prompt based on range and state
    // Priority: Terminal > Door > Crate
    const hasHigherPriorityPrompt = interactionPrompt.sourceId && 
      interactionPrompt.sourceId.startsWith('terminal-');
    
    if (nowInRange && !wasInRange && !isOpen && !hasHigherPriorityPrompt) {
      // Just entered range and door is closed
      // Check if door can be opened (hacked terminal or energy cell requirement)
      // For now, show generic prompt - door opens via terminal hack, not direct interaction
      showInteractionPrompt({
        message: 'Door locked (requires hack)',
        actionKey: null,
        sourceId: `door-${id}`,
      });
    } else if (!nowInRange && wasInRange) {
      // Just left range
      clearInteractionPrompt(`door-${id}`);
    } else if (nowInRange && isOpen && interactionPrompt.sourceId === `door-${id}`) {
      // In range but door is open - clear prompt
      clearInteractionPrompt(`door-${id}`);
    } else if (nowInRange && !isOpen && hasHigherPriorityPrompt && interactionPrompt.sourceId === `door-${id}`) {
      // Higher priority prompt appeared - clear door prompt
      clearInteractionPrompt(`door-${id}`);
    }
  });
  
  return (
    <group ref={doorRef} position={position}>
      {/* Door frame (left side) */}
      <mesh position={[-1, 2, 0]} castShadow>
        <boxGeometry args={[0.2, 4, 0.5]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      
      {/* Door frame (right side) */}
      <mesh position={[1, 2, 0]} castShadow>
        <boxGeometry args={[0.2, 4, 0.5]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      
      {/* Door frame (top) */}
      <mesh position={[0, 4, 0]} castShadow>
        <boxGeometry args={[2.2, 0.2, 0.5]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      
      {/* Main door panel */}
      <mesh position={[0, 2, 0]} castShadow>
        <boxGeometry args={[2, 4, 0.3]} />
        <meshStandardMaterial 
          color={isOpen ? "#1a1a1a" : "#3a3a3a"}
          metalness={0.6}
          roughness={0.4}
        />
      </mesh>
      
      {/* Door lock indicator (red light when closed) */}
      {!isOpen && (
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
      {isOpen && (
        <mesh position={[0.8, 2.5, 0.16]}>
          <boxGeometry args={[0.1, 0.1, 0.05]} />
          <meshStandardMaterial 
            color="#00ff00" 
            emissive="#00ff00" 
            emissiveIntensity={1}
          />
        </mesh>
      )}
      
      {/* Collision/blocking box - only active when closed */}
      {!isOpen && (
        <mesh position={[0, 2, 0]} visible={false}>
          <boxGeometry args={[2, 4, 0.5]} />
          <meshBasicMaterial visible={false} />
        </mesh>
      )}
    </group>
  );
}

