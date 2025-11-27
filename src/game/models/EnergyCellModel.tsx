import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';

interface EnergyCellModelProps {
  scale?: number | [number, number, number];
  position?: [number, number, number];
}

export function EnergyCellModel({ scale = 0.7, position }: EnergyCellModelProps) {
  const { scene } = useGLTF('/models/Energy-Cell.glb');
  
  // Clone the model scene for this instance to avoid shared geometry issues
  const clonedModel = useMemo(() => scene.clone(), [scene]);
  
  // Default Y offset to position the canister just above ground
  const yOffset = 0.3;
  
  return (
    <group 
      position={position ? [position[0], position[1] + yOffset, position[2]] : [0, yOffset, 0]}
      scale={scale}
    >
      <primitive object={clonedModel} />
    </group>
  );
}

useGLTF.preload('/models/Energy-Cell.glb');

