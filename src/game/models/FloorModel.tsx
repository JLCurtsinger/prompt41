import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import type { JSX } from 'react';

type FloorModelProps = JSX.IntrinsicElements['group'] & {
  /** Allow overriding scale if needed */
  scaleMultiplier?: number;
  /** Mobile device flag for performance optimizations */
  isMobile?: boolean;
};

export function FloorModel({ scaleMultiplier = 1, isMobile = false, ...groupProps }: FloorModelProps) {
  const gltf = useGLTF('/models/Floor.glb');

  const clonedScene = useMemo(() => {
    const clone = gltf.scene.clone(true);

    type MeshWithHeight = {
      mesh: any;
      height: number;
    };

    const meshes: MeshWithHeight[] = [];

    // First pass: collect all meshes and compute their heights
    clone.traverse((obj) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mesh = obj as any;
      if (mesh.isMesh && mesh.geometry) {
        mesh.geometry.computeBoundingBox();
        const bbox = mesh.geometry.boundingBox;
        if (bbox) {
          const height = bbox.max.y - bbox.min.y;
          meshes.push({ mesh, height });
        }
      }
    });

    if (meshes.length === 0) {
      return clone;
    }

    // Find the minimum height among all meshes (assumed to be the floor tile)
    let minHeight = meshes[0].height;
    for (const entry of meshes) {
      if (entry.height < minHeight) {
        minHeight = entry.height;
      }
    }

    // Define a tolerance so slightly thicker floor pieces are still kept
    const TOLERANCE = 1.25; // keep meshes whose height <= minHeight * TOLERANCE

    // Second pass: configure visibility and shadows
    for (const { mesh, height } of meshes) {
      mesh.castShadow = !isMobile;
      mesh.receiveShadow = true;

      const isFloorLike = height <= minHeight * TOLERANCE;

      // Keep only the flattest meshes (floor); hide everything else (e.g., pillar)
      if (!isFloorLike) {
        mesh.visible = false;
      }
    }

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

