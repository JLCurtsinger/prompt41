import { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface EnergyCellModelProps {
  scale?: number | [number, number, number];
  position?: [number, number, number];
}

export function EnergyCellModel({ scale = 0.6, position }: EnergyCellModelProps) {
  const { scene } = useGLTF('/models/Energy-Cell.glb');
  const glassMeshRef = useRef<THREE.Mesh | null>(null);
  const groupRef = useRef<THREE.Group>(null);
  
  // Clone the model scene for this instance to avoid shared geometry issues
  const clonedModel = useMemo(() => scene.clone(), [scene]);
  
  // Find the inner glass mesh after cloning
  useEffect(() => {
    if (!clonedModel) return;
    
    clonedModel.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const name = child.name.toLowerCase();
        // Look for glass, inner, core, or similar names
        if (name.includes('glass') || name.includes('inner') || name.includes('core') || 
            name.includes('glow') || name.includes('energy') || name.includes('liquid')) {
          glassMeshRef.current = child;
          
          // Ensure the material is a MeshStandardMaterial or MeshPhysicalMaterial
          if (child.material instanceof THREE.MeshStandardMaterial || 
              child.material instanceof THREE.MeshPhysicalMaterial) {
            // Set emissive color to teal/cyan blue
            child.material.emissive = new THREE.Color(0x00a8cc); // Teal/cyan blue
            child.material.emissiveIntensity = 0.5;
            // Make sure emissive is enabled
            child.material.emissiveMap = null;
          } else if (Array.isArray(child.material)) {
            // Handle multi-material case
            child.material.forEach((mat) => {
              if (mat instanceof THREE.MeshStandardMaterial || 
                  mat instanceof THREE.MeshPhysicalMaterial) {
                mat.emissive = new THREE.Color(0x00a8cc);
                mat.emissiveIntensity = 0.5;
                mat.emissiveMap = null;
              }
            });
          }
        }
      }
    });
  }, [clonedModel]);
  
  // Pulse the emissive intensity
  const timeRef = useRef(0);
  useFrame((_, delta) => {
    if (glassMeshRef.current) {
      const material = glassMeshRef.current.material;
      timeRef.current += delta;
      
      // Gentle pulse: oscillate between 0.3 and 0.7 intensity (2 cycles per second)
      const pulseIntensity = 0.5 + Math.sin(timeRef.current * 2 * Math.PI) * 0.2;
      
      if (material instanceof THREE.MeshStandardMaterial || 
          material instanceof THREE.MeshPhysicalMaterial) {
        material.emissiveIntensity = pulseIntensity;
      } else if (Array.isArray(material)) {
        material.forEach((mat) => {
          if (mat instanceof THREE.MeshStandardMaterial || 
              mat instanceof THREE.MeshPhysicalMaterial) {
            mat.emissiveIntensity = pulseIntensity;
          }
        });
      }
    }
  });
  
  // Default Y offset to position the canister just above ground
  const yOffset = 0.6;
  
  return (
    <group 
      ref={groupRef}
      position={position ? [position[0], position[1] + yOffset, position[2]] : [0, yOffset, 0]}
      scale={scale}
    >
      <primitive object={clonedModel} />
      {/* Small PointLight inside the cell */}
      <pointLight
        position={[0, 0, 0]}
        color={0x00a8cc}
        intensity={0.3}
        distance={0.5}
        decay={2}
      />
    </group>
  );
}

// Defer preload - load on first use (Energy Cells are not immediately visible)
// useGLTF.preload('/models/Energy-Cell.glb');

