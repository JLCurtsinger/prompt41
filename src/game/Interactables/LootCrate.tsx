// TEST PLAN (LootCrate)
// 1. Initial State:
//    - Crate should be closed (lid at 0 rotation)
//    - isOpened should be false
// 2. Range Detection:
//    - Walk towards crate from various angles
//    - When within 2.5 units, "Press E to open crate" prompt should appear
//    - When outside range, prompt should disappear
// 3. First Open:
//    - Press E when in range and crate is closed
//    - Lid should animate open (rotate up) over ~0.4s
//    - EnergyCell should spawn above crate after animation
//    - isOpened should become true
// 4. Subsequent Visits:
//    - After crate is opened, pressing E should show "Crate is empty" message
//    - No new EnergyCell should spawn
//    - Crate should remain in opened state
// 5. Visual Feedback:
//    - Crate should be visible as a box with lid
//    - Lid animation should be smooth

import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EnergyCell } from '../Pickups/EnergyCell';

interface LootCrateProps {
  id: string;
  position: [number, number, number];
}

export function LootCrate({ id, position }: LootCrateProps) {
  const crateRef = useRef<THREE.Group>(null);
  const lidRef = useRef<THREE.Group>(null);
  const { scene } = useThree();
  const [isInRange, setIsInRange] = useState(false);
  const [isOpened, setIsOpened] = useState(false);
  const [lidRotation, setLidRotation] = useState(0);
  const [showEmptyMessage, setShowEmptyMessage] = useState(false);
  const [spawnEnergyCell, setSpawnEnergyCell] = useState(false);
  
  const INTERACTION_RANGE = 2.5;
  const LID_OPEN_ANGLE = Math.PI / 3; // 60 degrees
  const ANIMATION_DURATION = 400; // milliseconds
  
  // Check if player is in range
  useFrame(() => {
    if (!crateRef.current) return;
    
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
    
    if (!playerPosition) {
      setIsInRange(false);
      return;
    }
    
    const playerPos = playerPosition as THREE.Vector3;
    const cratePos = new THREE.Vector3(...position);
    const distance = playerPos.distanceTo(cratePos);
    setIsInRange(distance <= INTERACTION_RANGE);
  });
  
  // Animate lid opening
  useEffect(() => {
    if (isOpened && lidRotation < LID_OPEN_ANGLE) {
      const startTime = Date.now();
      const startRotation = lidRotation;
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / ANIMATION_DURATION, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3); // Ease out cubic
        const newRotation = startRotation + (LID_OPEN_ANGLE - startRotation) * easeOut;
        
        setLidRotation(newRotation);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          // Spawn energy cell after animation completes
          setSpawnEnergyCell(true);
        }
      };
      
      requestAnimationFrame(animate);
    }
  }, [isOpened, lidRotation]);
  
  // Handle E key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'e' && isInRange) {
        if (!isOpened) {
          setIsOpened(true);
        } else {
          // Show empty message
          setShowEmptyMessage(true);
          setTimeout(() => setShowEmptyMessage(false), 2000);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isInRange, isOpened]);
  
  // Update lid rotation in 3D
  useFrame(() => {
    if (lidRef.current) {
      lidRef.current.rotation.x = lidRotation;
    }
  });
  
  return (
    <>
      <group ref={crateRef} position={position}>
        {/* Crate base */}
        <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.8, 0.6, 0.8]} />
          <meshStandardMaterial color="#4a4a4a" metalness={0.3} roughness={0.7} />
        </mesh>
        
        {/* Crate lid - rotates around back edge */}
        <group ref={lidRef} position={[0, 0.6, 0]} rotation={[0, 0, 0]}>
          <mesh
            position={[0, 0, 0.4]}
            castShadow
          >
            <boxGeometry args={[0.8, 0.1, 0.8]} />
            <meshStandardMaterial color="#5a5a5a" metalness={0.3} roughness={0.7} />
          </mesh>
        </group>
        
        {/* Optional: Teal/orange emissive bands (as per CoreGameDetails) */}
        <mesh position={[0, 0.3, 0.41]} castShadow>
          <boxGeometry args={[0.82, 0.6, 0.05]} />
          <meshStandardMaterial 
            color="#00ffff" 
            emissive="#00ffff" 
            emissiveIntensity={0.3}
          />
        </mesh>
      </group>
      
      {/* Spawn EnergyCell above crate when opened */}
      {spawnEnergyCell && (
        <EnergyCell position={[position[0], position[1] + 1.2, position[2]]} />
      )}
      
      {/* "Press E to open crate" prompt */}
      {isInRange && !isOpened && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: '#ffffff',
            padding: '10px 20px',
            borderRadius: '5px',
            fontFamily: 'monospace',
            fontSize: '18px',
            zIndex: 100,
            pointerEvents: 'none',
          }}
        >
          Press E to open crate
        </div>
      )}
      
      {/* "Crate is empty" message */}
      {showEmptyMessage && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: '#888888',
            padding: '10px 20px',
            borderRadius: '5px',
            fontFamily: 'monospace',
            fontSize: '18px',
            zIndex: 100,
            pointerEvents: 'none',
          }}
        >
          Crate is empty
        </div>
      )}
    </>
  );
}

