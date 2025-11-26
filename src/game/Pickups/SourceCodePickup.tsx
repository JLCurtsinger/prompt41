// Source Code Pickup - collectible data fragment
// Glowing orb that player can collect to increment sourceCodeCount

import { useRef, useState, useMemo } from 'react';
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
  
  const addSourceCode = useGameState((state) => state.addSourceCode);
  const playerPosition = useGameState((state) => state.playerPosition);
  
  const PICKUP_RANGE = 1.5;
  const ROTATION_SPEED = 1.5; // radians per second
  const BOB_SPEED = 1.5; // cycles per second
  const BOB_AMPLITUDE = 0.15; // meters
  
  // Store base Y for bobbing calculation
  const baseY = position[1];
  
  // Pre-allocate Vector3 instances to avoid per-frame allocations
  const playerPosVec = useMemo(() => new THREE.Vector3(), []);
  const pickupPosVec = useMemo(() => new THREE.Vector3(position[0], baseY, position[2]), [position, baseY]);
  
  useFrame((_, delta) => {
    if (isCollected || !groupRef.current) return;
    
    // Rotate the pickup
    groupRef.current.rotation.y += ROTATION_SPEED * delta;
    
    // Bob up and down - update position directly without React state
    const bobOffset = Math.sin(Date.now() * 0.001 * BOB_SPEED * Math.PI * 2) * BOB_AMPLITUDE;
    groupRef.current.position.y = baseY + bobOffset;
    
    // Check player distance using game state player position
    // Reuse pre-allocated Vector3 instances - no allocations in the loop
    playerPosVec.set(playerPosition.x, playerPosition.y, playerPosition.z);
    const distance = playerPosVec.distanceTo(pickupPosVec);
    
    if (distance <= PICKUP_RANGE) {
      // Pick up the source code
      setIsCollected(true);
      addSourceCode(1);
      AudioManager.playSFX('pickupSourceCode');
    }
  });
  
  if (isCollected) {
    return null;
  }
  
  return (
    <group ref={groupRef} position={[position[0], position[1], position[2]]}>
      {/* Glowing orb core */}
      <mesh castShadow>
        <icosahedronGeometry args={[0.2, 1]} />
        <meshStandardMaterial 
          color="#00ff88"
          emissive="#00ff88"
          emissiveIntensity={2.0}
        />
      </mesh>
      
      {/* Outer glow shell */}
      <mesh>
        <icosahedronGeometry args={[0.3, 1]} />
        <meshStandardMaterial 
          color="#00ff88"
          emissive="#00ff88"
          emissiveIntensity={0.5}
          transparent
          opacity={0.3}
        />
      </mesh>
      
      {/* Point light for local glow effect */}
      <pointLight 
        color="#00ff88"
        intensity={0.8}
        distance={3}
        decay={2}
      />
    </group>
  );
}
