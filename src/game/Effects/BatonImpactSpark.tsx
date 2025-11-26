// BatonImpactSpark - brief spark effect when baton hits an enemy
// Self-contained, auto-removes after lifetime expires

import { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface BatonImpactSparkProps {
  position: [number, number, number];
  onComplete?: () => void;
}

// Number of spark particles
const PARTICLE_COUNT = 6;
// Spark lifetime in seconds
const LIFETIME = 0.2;
// Initial burst velocity
const BURST_SPEED = 3;

export function BatonImpactSpark({ position, onComplete }: BatonImpactSparkProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [isComplete, setIsComplete] = useState(false);
  const elapsedRef = useRef(0);
  
  // Pre-generate random directions for each particle (stable across frames)
  const particleData = useMemo(() => {
    const data: { direction: THREE.Vector3; offset: THREE.Vector3 }[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Random direction in a hemisphere (mostly outward/upward)
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.5; // Upper hemisphere
      const direction = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.cos(phi) * 0.5 + 0.5, // Bias upward
        Math.sin(phi) * Math.sin(theta)
      ).normalize();
      
      data.push({
        direction,
        offset: new THREE.Vector3(0, 0, 0),
      });
    }
    return data;
  }, []);
  
  // Pre-allocate refs for particle meshes
  const particleRefs = useRef<(THREE.Mesh | null)[]>([]);
  
  useFrame((_, delta) => {
    if (isComplete) return;
    
    elapsedRef.current += delta;
    const t = elapsedRef.current / LIFETIME;
    
    if (t >= 1) {
      setIsComplete(true);
      onComplete?.();
      return;
    }
    
    // Animate each particle
    particleRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      
      const data = particleData[i];
      
      // Move outward with deceleration
      const speed = BURST_SPEED * (1 - t * t); // Ease out
      data.offset.addScaledVector(data.direction, speed * delta);
      
      mesh.position.set(
        data.offset.x,
        data.offset.y,
        data.offset.z
      );
      
      // Scale down over time
      const scale = 1 - t;
      mesh.scale.setScalar(scale);
      
      // Fade out via emissive intensity
      const material = mesh.material as THREE.MeshStandardMaterial;
      if (material.emissiveIntensity !== undefined) {
        material.emissiveIntensity = 3 * (1 - t);
      }
    });
  });
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Reset particle offsets for safety
      particleData.forEach(data => data.offset.set(0, 0, 0));
    };
  }, [particleData]);
  
  if (isComplete) {
    return null;
  }
  
  return (
    <group ref={groupRef} position={position}>
      {particleData.map((_, i) => (
        <mesh
          key={i}
          ref={(el) => { particleRefs.current[i] = el; }}
          position={[0, 0, 0]}
        >
          <sphereGeometry args={[0.04, 4, 4]} />
          <meshStandardMaterial
            color="#00ffff"
            emissive="#00ffff"
            emissiveIntensity={3}
            transparent
            opacity={0.9}
          />
        </mesh>
      ))}
    </group>
  );
}

