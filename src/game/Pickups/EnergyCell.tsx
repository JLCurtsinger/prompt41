// TEST PLAN (EnergyCell)
// 1. Visual:
//    - Should be visible as a glowing cylinder with emissive core
//    - Should rotate slowly around Y axis
//    - Should bob up and down slightly
// 2. Pickup Detection:
//    - Walk towards EnergyCell
//    - When within 1.5 units, should be picked up automatically
// 3. Pickup Behavior:
//    - When picked up, should call addEnergyCell(1)
//    - Should trigger playHostLine('pickup:energyCell')
//    - Should disappear (isCollected = true)
//    - HUD should show Energy Cells count increment
// 4. Multiple Pickups:
//    - Pick up multiple EnergyCells
//    - Verify count increments correctly each time
//    - Verify HOST line appears for each pickup

import { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGameState } from '../../state/gameState';
import * as THREE from 'three';

interface EnergyCellProps {
  position: [number, number, number];
}

export function EnergyCell({ position }: EnergyCellProps) {
  const cellRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const { scene } = useThree();
  const [isCollected, setIsCollected] = useState(false);
  const [bobOffset, setBobOffset] = useState(0);
  
  const addEnergyCell = useGameState((state) => state.addEnergyCell);
  const playHostLine = useGameState((state) => state.playHostLine);
  
  const PICKUP_RANGE = 1.5;
  const ROTATION_SPEED = 1.0; // radians per second
  const BOB_SPEED = 2.0; // cycles per second
  const BOB_AMPLITUDE = 0.1; // meters
  
  // Check if player is in range for pickup
  useFrame((_, delta) => {
    if (isCollected || !cellRef.current) return;
    
    // Rotate the cell
    if (cellRef.current) {
      cellRef.current.rotation.y += ROTATION_SPEED * delta;
    }
    
    // Bob up and down
    setBobOffset(Math.sin(Date.now() * 0.001 * BOB_SPEED * Math.PI * 2) * BOB_AMPLITUDE);
    
    // Check player distance
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
          playerPosition = object.position.clone() as THREE.Vector3;
        }
      }
    });
    
    if (!playerPosition) return;
    
    const playerPos = playerPosition as THREE.Vector3;
    const cellPos = new THREE.Vector3(...position);
    const distance = playerPos.distanceTo(cellPos);
    
    if (distance <= PICKUP_RANGE) {
      // Pick up the cell
      setIsCollected(true);
      addEnergyCell(1);
      playHostLine('pickup:energyCell');
    }
  });
  
  // Update position with bob
  useFrame(() => {
    if (cellRef.current && !isCollected) {
      cellRef.current.position.set(
        position[0],
        position[1] + bobOffset,
        position[2]
      );
    }
  });
  
  if (isCollected) {
    return null;
  }
  
  return (
    <group ref={cellRef} position={position}>
      {/* Outer casing */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.15, 0.15, 0.3, 16]} />
        <meshStandardMaterial 
          color="#2a5a7a" 
          metalness={0.7} 
          roughness={0.3}
        />
      </mesh>
      
      {/* Glowing core */}
      <mesh ref={coreRef} position={[0, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.25, 16]} />
        <meshStandardMaterial 
          color="#00ffff" 
          emissive="#00ffff" 
          emissiveIntensity={1.5}
        />
      </mesh>
      
      {/* Top and bottom caps (optional detail) */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 0.02, 16]} />
        <meshStandardMaterial color="#1a3a5a" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, -0.15, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 0.02, 16]} />
        <meshStandardMaterial color="#1a3a5a" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
}

