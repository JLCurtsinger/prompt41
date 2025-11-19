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

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameState, getDoorState } from '../../state/gameState';
import * as THREE from 'three';

interface DoorProps {
  id: string;
  position: [number, number, number];
}

export function Door({ id, position }: DoorProps) {
  const doorRef = useRef<THREE.Group>(null);
  const doorState = useGameState((state) => getDoorState(state, id));
  
  const isOpen = doorState === 'open';
  const targetY = isOpen ? position[1] + 4 : position[1];
  
  // Smooth animation when door opens/closes
  useFrame((_, delta) => {
    if (!doorRef.current) return;
    
    const currentY = doorRef.current.position.y;
    const diff = targetY - currentY;
    
    // Smoothly animate to target position
    if (Math.abs(diff) > 0.01) {
      doorRef.current.position.y += diff * delta * 2; // Speed of animation
    } else {
      doorRef.current.position.y = targetY;
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

