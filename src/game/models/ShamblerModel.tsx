import { useLayoutEffect, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { Box3, Group } from 'three';
import * as THREE from 'three';

interface ShamblerModelProps {
  scale?: number | [number, number, number];
  position?: [number, number, number];
  rotation?: [number, number, number];
}

export function ShamblerModel(props: ShamblerModelProps) {
  const { scene } = useGLTF('/models/Shambler.glb');
  const groupRef = useRef<Group>(null);
  const innerGroupRef = useRef<Group>(null);

  useLayoutEffect(() => {
    if (!groupRef.current || !innerGroupRef.current) return;

    // Enable shadows on all meshes in the model
    groupRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.frustumCulled = true;
      }
    });

    // Calculate the bounding box of the model to determine ground offset
    const box = new Box3().setFromObject(innerGroupRef.current);
    const minY = box.min.y;
    
    // Apply local Y offset to bring feet to ground level
    // The inner group's position is relative to the outer group
    innerGroupRef.current.position.y = -minY;
  }, []);

  return (
    <group ref={groupRef} {...props} dispose={null} frustumCulled={true}>
      <group ref={innerGroupRef}>
        <primitive object={scene} />
      </group>
    </group>
  );
}

useGLTF.preload('/models/Shambler.glb');

