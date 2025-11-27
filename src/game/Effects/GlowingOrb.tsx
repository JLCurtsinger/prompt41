// GlowingOrb - Decorative glowing sphere for ambient lighting
// Pure visual element with no pickup logic or game state interaction

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface GlowingOrbProps {
  position: [number, number, number];
  color?: string;
  scale?: number;
}

export function GlowingOrb({ position, color = '#00ff88', scale = 1 }: GlowingOrbProps) {
  const groupRef = useRef<THREE.Group>(null);
  
  const ROTATION_SPEED = 1.5; // radians per second
  const BOB_SPEED = 1.5; // cycles per second
  const BOB_AMPLITUDE = 0.15; // meters
  
  const baseY = position[1];
  
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    
    // Rotate the orb
    groupRef.current.rotation.y += ROTATION_SPEED * delta;
    
    // Bob up and down
    const bobOffset = Math.sin(Date.now() * 0.001 * BOB_SPEED * Math.PI * 2) * BOB_AMPLITUDE;
    groupRef.current.position.y = baseY + bobOffset;
  });
  
  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* Glowing orb core */}
      <mesh castShadow>
        <icosahedronGeometry args={[0.2, 1]} />
        <meshStandardMaterial 
          color={color}
          emissive={color}
          emissiveIntensity={2.0}
        />
      </mesh>
      
      {/* Outer glow shell */}
      <mesh>
        <icosahedronGeometry args={[0.3, 1]} />
        <meshStandardMaterial 
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          transparent
          opacity={0.3}
        />
      </mesh>
      
      {/* Point light for local glow effect */}
      <pointLight 
        color={color}
        intensity={0.8}
        distance={3}
        decay={2}
      />
    </group>
  );
}

