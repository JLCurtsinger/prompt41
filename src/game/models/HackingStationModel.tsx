import { useLayoutEffect, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { Group } from 'three';
import * as THREE from 'three';

export function HackingStationModel(props: any) {
  const { scene } = useGLTF('/models/Hacking-Station.glb');
  const groupRef = useRef<Group>(null);

  // Allow rotation to be controlled from the outside.
  // If none is provided, use the previous default.
  const { rotation, ...rest } = props;
  const defaultRotation: [number, number, number] = [0, Math.PI, 0];
  const finalRotation = rotation ?? defaultRotation;

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
    <group
      ref={groupRef}
      {...rest}
      dispose={null}
      rotation={finalRotation}
    >
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload('/models/Hacking-Station.glb');

