import React, { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { GroupProps } from '@react-three/fiber';
import * as THREE from 'three';

type FloorModelProps = GroupProps & {
  /** Allow overriding scale if needed */
  scaleMultiplier?: number;
};

export function FloorModel({ scaleMultiplier = 1, ...groupProps }: FloorModelProps) {
  const gltf = useGLTF('/models/Floor.glb');

  const clonedScene = useMemo(() => {
    const clone = gltf.scene.clone(true);
    clone.traverse((obj) => {
      // Ensure all materials are mesh standard/physical and cast/receive shadows correctly
      // without changing their look.
      // Only do minimal adjustments, no color/roughness reworks.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mesh = obj as any;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    return clone;
  }, [gltf.scene]);

  return (
    <group {...groupProps} scale={scaleMultiplier}>
      <primitive object={clonedScene} />
    </group>
  );
}

// Preload for performance
useGLTF.preload('/models/Floor.glb');

