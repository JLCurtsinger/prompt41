import { useLayoutEffect, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { Group } from 'three';
import * as THREE from 'three';

interface ShamblerModelProps {
  scale?: number | [number, number, number];
  position?: [number, number, number];
  rotation?: [number, number, number];
}

const MODEL_Y_OFFSET = -1.0; // Visual offset to align Shambler feet with floor

export function ShamblerModel(props: ShamblerModelProps) {
  const { scene } = useGLTF('/models/Shambler.glb');
  const groupRef = useRef<Group>(null);

  useLayoutEffect(() => {
    if (!groupRef.current) return;

    // Enable shadows on all meshes in the model
    groupRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.frustumCulled = true;
      }
    });
  }, []);

  return (
    <group ref={groupRef} {...props} dispose={null} frustumCulled={true}>
      <group position={[0, MODEL_Y_OFFSET, 0]}>
        <primitive object={scene} />
      </group>
    </group>
  );
}

// Deferred preload - only preload when player approaches Zone 3
// useGLTF.preload('/models/Shambler.glb');

