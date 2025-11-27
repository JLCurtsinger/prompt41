import { useLayoutEffect, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { Box3, Group, Vector3 } from 'three';

interface ZeekoModelProps {
  scale?: number | [number, number, number];
  position?: [number, number, number];
  rotation?: [number, number, number];
}

export function ZeekoModel(props: ZeekoModelProps) {
  const { scene } = useGLTF('/models/Zeeko.glb');
  const groupRef = useRef<Group>(null);

  useLayoutEffect(() => {
    if (!groupRef.current) return;

    const box = new Box3().setFromObject(groupRef.current);
    const size = new Vector3();
    const center = new Vector3();
    box.getSize(size);
    box.getCenter(center);

    // Move the model so its lowest point sits at y = 0.
    // box.min.y is the lowest point in world space; shift by -minY.
    const minY = box.min.y;
    groupRef.current.position.y -= minY;
  }, []);

  return (
    <group ref={groupRef} {...props} dispose={null}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload('/models/Zeeko.glb');
