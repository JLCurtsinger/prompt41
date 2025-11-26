// EnemyDeathFragments - fragment explosion effect when enemy dies
// Self-contained, auto-removes after lifetime expires

import { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface EnemyDeathFragmentsProps {
  position: [number, number, number];
  color?: string;
  onComplete?: () => void;
}

// Number of fragment particles
const FRAGMENT_COUNT = 8;
// Fragment lifetime in seconds
const LIFETIME = 0.45;
// Initial burst velocity
const BURST_SPEED = 5;
// Gravity applied to fragments
const GRAVITY = -12;

export function EnemyDeathFragments({ 
  position, 
  color = '#ff6600',
  onComplete 
}: EnemyDeathFragmentsProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [isComplete, setIsComplete] = useState(false);
  const elapsedRef = useRef(0);
  
  // Pre-generate random directions and velocities for each fragment
  const fragmentData = useMemo(() => {
    const data: { 
      direction: THREE.Vector3; 
      position: THREE.Vector3;
      rotation: THREE.Euler;
      rotationSpeed: THREE.Vector3;
      velocity: THREE.Vector3;
      scale: number;
    }[] = [];
    
    for (let i = 0; i < FRAGMENT_COUNT; i++) {
      // Random direction - more spread outward and upward
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.6; // Upper hemisphere bias
      const direction = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.cos(phi) * 0.3 + 0.7, // Strong upward bias
        Math.sin(phi) * Math.sin(theta)
      ).normalize();
      
      // Random initial velocity based on direction
      const speed = BURST_SPEED * (0.6 + Math.random() * 0.8);
      const velocity = direction.clone().multiplyScalar(speed);
      
      // Random rotation speeds
      const rotationSpeed = new THREE.Vector3(
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 15
      );
      
      // Random initial scale
      const scale = 0.08 + Math.random() * 0.12;
      
      data.push({
        direction,
        position: new THREE.Vector3(0, 0, 0),
        rotation: new THREE.Euler(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        ),
        rotationSpeed,
        velocity,
        scale,
      });
    }
    return data;
  }, []);
  
  // Pre-allocate refs for fragment meshes
  const fragmentRefs = useRef<(THREE.Mesh | null)[]>([]);
  
  useFrame((_, delta) => {
    if (isComplete) return;
    
    elapsedRef.current += delta;
    const t = elapsedRef.current / LIFETIME;
    
    if (t >= 1) {
      setIsComplete(true);
      onComplete?.();
      return;
    }
    
    // Animate each fragment
    fragmentRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      
      const data = fragmentData[i];
      
      // Apply gravity to velocity
      data.velocity.y += GRAVITY * delta;
      
      // Update position based on velocity
      data.position.addScaledVector(data.velocity, delta);
      
      mesh.position.copy(data.position);
      
      // Update rotation
      mesh.rotation.x += data.rotationSpeed.x * delta;
      mesh.rotation.y += data.rotationSpeed.y * delta;
      mesh.rotation.z += data.rotationSpeed.z * delta;
      
      // Scale down over time (ease out)
      const scaleT = 1 - t * t;
      mesh.scale.setScalar(data.scale * scaleT);
      
      // Fade out via opacity
      const material = mesh.material as THREE.MeshStandardMaterial;
      if (material.opacity !== undefined) {
        material.opacity = 0.9 * (1 - t);
      }
    });
  });
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Reset fragment positions for safety
      fragmentData.forEach(data => {
        data.position.set(0, 0, 0);
        data.velocity.set(0, 0, 0);
      });
    };
  }, [fragmentData]);
  
  if (isComplete) {
    return null;
  }
  
  return (
    <group ref={groupRef} position={position}>
      {fragmentData.map((data, i) => (
        <mesh
          key={i}
          ref={(el) => { fragmentRefs.current[i] = el; }}
          position={[0, 0, 0]}
          rotation={data.rotation}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={1.5}
            transparent
            opacity={0.9}
          />
        </mesh>
      ))}
    </group>
  );
}

