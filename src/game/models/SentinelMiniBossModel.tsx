import { useLayoutEffect, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { Box3, Group, Vector3 } from 'three';
import * as THREE from 'three';

interface SentinelMiniBossModelProps {
  scale?: number | [number, number, number];
  position?: [number, number, number];
  rotation?: [number, number, number];
}

export function SentinelMiniBossModel(props: SentinelMiniBossModelProps) {
  const { scene } = useGLTF('/models/Sentinel-Mini-Boss.glb');
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

    // Optionally adjust model position so it sits on the ground
    const box = new Box3().setFromObject(groupRef.current);
    const size = new Vector3();
    const center = new Vector3();
    box.getSize(size);
    box.getCenter(center);

    // Move the model so its lowest point sits at y = 0
    const minY = box.min.y;
    groupRef.current.position.y -= minY;
  }, []);

  return (
    <group ref={groupRef} {...props} dispose={null} frustumCulled={true}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload('/models/Sentinel-Mini-Boss.glb');

