import { useLayoutEffect, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { Group } from 'three';
import * as THREE from 'three';

interface HackingStationModelProps {
  scale?: number | [number, number, number];
  position?: [number, number, number];
  rotation?: [number, number, number];
}

export function HackingStationModel(props: HackingStationModelProps) {
  const { scene } = useGLTF('/models/Hacking-Station.glb');
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
    <group ref={groupRef} {...props} dispose={null}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload('/models/Hacking-Station.glb');

