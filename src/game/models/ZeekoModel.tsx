import { useGLTF } from '@react-three/drei';

interface ZeekoModelProps {
  scale?: number | [number, number, number];
  position?: [number, number, number];
  rotation?: [number, number, number];
}

export function ZeekoModel(props: ZeekoModelProps) {
  const { scene } = useGLTF('/models/Zeeko.glb');

  return (
    <group {...props} dispose={null}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload('/models/Zeeko.glb');

