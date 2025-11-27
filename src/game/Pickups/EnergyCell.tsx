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

import { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGameState } from '../../state/gameState';
import { AudioManager } from '../audio/AudioManager';
import { EnergyCellModel } from '../models/EnergyCellModel';
import * as THREE from 'three';

interface EnergyCellProps {
  position: [number, number, number];
}

export function EnergyCell({ position }: EnergyCellProps) {
  const cellRef = useRef<THREE.Group>(null);
  const { scene } = useThree();
  const [isCollected, setIsCollected] = useState(false);
  const [bobOffset, setBobOffset] = useState(0);
  
  const addEnergyCell = useGameState((state) => state.addEnergyCell);
  
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
      // playHostLine('pickup:energyCell'); // TEMP disabled to avoid visual hitch
      AudioManager.playSFX('pickupEnergyCell');
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
      <EnergyCellModel scale={0.8} />
    </group>
  );
}

