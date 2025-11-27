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
import { useFrame } from '@react-three/fiber';
import { useGameState } from '../../state/gameState';
import { AudioManager } from '../audio/AudioManager';
import { EnergyCellModel } from '../models/EnergyCellModel';
import * as THREE from 'three';

interface EnergyCellProps {
  position: [number, number, number];
}

export function EnergyCell({ position }: EnergyCellProps) {
  const cellRef = useRef<THREE.Group>(null);
  const [isCollected, setIsCollected] = useState(false);
  const bobOffsetRef = useRef(0);
  
  const addEnergyCell = useGameState((state) => state.addEnergyCell);
  const playHostLine = useGameState((state) => state.playHostLine);
  
  const PICKUP_RANGE = 1.5;
  const PICKUP_RANGE_SQ = PICKUP_RANGE * PICKUP_RANGE; // Squared distance for performance
  const ROTATION_SPEED = 1.0; // radians per second
  const BOB_SPEED = 2.0; // cycles per second
  const BOB_AMPLITUDE = 0.1; // meters
  
  const baseY = position[1];
  
  // Single useFrame for rotation, bobbing, position update, and pickup detection
  useFrame((_, delta) => {
    if (isCollected || !cellRef.current) return;
    
    // Rotate the cell
    cellRef.current.rotation.y += ROTATION_SPEED * delta;
    
    // Update bob offset (no setState)
    bobOffsetRef.current = Math.sin(Date.now() * 0.001 * BOB_SPEED * Math.PI * 2) * BOB_AMPLITUDE;
    
    // Update position with bob directly
    cellRef.current.position.set(
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
      // Pick up the cell
      setIsCollected(true);
      addEnergyCell(1);
      playHostLine('pickup:energyCell');
      AudioManager.playSFX('pickupEnergyCell');
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

