// Source Code Pickup - collectible data fragment
// Collectible that increments sourceCodeCount and heals +5 HP
// Distinct cyan/blue visual to differentiate from energy cell pickups

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameState } from '../../state/gameState';
import { AudioManager } from '../audio/AudioManager';
import * as THREE from 'three';

interface SourceCodePickupProps {
  position: [number, number, number];
}

export function SourceCodePickup({ position }: SourceCodePickupProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [isCollected, setIsCollected] = useState(false);
  const bobOffsetRef = useRef(0);
  
  const addSourceCode = useGameState((state) => state.addSourceCode);
  const healPlayer = useGameState((state) => state.healPlayer);
  
  const PICKUP_RANGE = 1.5;
  const PICKUP_RANGE_SQ = PICKUP_RANGE * PICKUP_RANGE; // Squared distance for performance
  const ROTATION_SPEED = 1.5; // radians per second
  const BOB_SPEED = 1.5; // cycles per second
  const BOB_AMPLITUDE = 0.15; // meters
  
  // Store base Y for bobbing calculation
  const baseY = position[1];
  
  // Single useFrame for rotation, bobbing, position update, and pickup detection
  useFrame((_, delta) => {
    if (isCollected || !groupRef.current) return;
    
    // Rotate the pickup
    groupRef.current.rotation.y += ROTATION_SPEED * delta;
    
    // Update bob offset (no setState)
    bobOffsetRef.current = Math.sin(Date.now() * 0.001 * BOB_SPEED * Math.PI * 2) * BOB_AMPLITUDE;
    
    // Update position with bob directly
    groupRef.current.position.set(
      position[0],
      baseY + bobOffsetRef.current,
      position[2]
    );
    
    // Check player distance using game state player position (optimized - no scene traversal)
    const playerPos = useGameState.getState().playerPosition;
    const dx = playerPos.x - position[0];
    const dy = playerPos.y - (baseY + bobOffsetRef.current);
    const dz = playerPos.z - position[2];
    const distanceSq = dx * dx + dy * dy + dz * dz;
    
    if (distanceSq <= PICKUP_RANGE_SQ) {
      // Pick up the source code
      setIsCollected(true);
      addSourceCode(1);
      healPlayer(5); // Heal +5 HP on pickup
      AudioManager.playSFX('pickupSourceCode');
    }
  });
  
  if (isCollected) {
    return null;
  }
  
  // Cyan/blue visual distinct from energy cells (green) - using icosahedron for data fragment aesthetic
  return (
    <group ref={groupRef} position={[position[0], position[1], position[2]]}>
      {/* Core data fragment - cyan/blue icosahedron */}
      <mesh castShadow>
        <icosahedronGeometry args={[0.2, 1]} />
        <meshStandardMaterial 
          color="#00baff"
          emissive="#00baff"
          emissiveIntensity={1.5}
        />
      </mesh>
      
      {/* Outer glow shell */}
      <mesh>
        <icosahedronGeometry args={[0.28, 1]} />
        <meshStandardMaterial 
          color="#00baff"
          emissive="#00baff"
          emissiveIntensity={0.4}
          transparent
          opacity={0.25}
        />
      </mesh>
      
      {/* Subtle point light for local glow */}
      <pointLight 
        color="#00baff"
        intensity={0.6}
        distance={2.5}
        decay={2}
      />
    </group>
  );
}
