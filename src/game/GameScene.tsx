import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { Player } from './Player';

export function GameScene() {
  return (
    <Canvas
      style={{ width: '100vw', height: '100vh' }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
    >
      <Suspense fallback={null}>
        {/* Lighting */}
        <ambientLight intensity={0.3} />
        <directionalLight position={[10, 10, 5]} intensity={0.8} castShadow />
        <pointLight position={[-10, 5, -5]} intensity={0.5} />
        
        {/* Camera is controlled by Player component's useFrame hook */}
        <PerspectiveCamera makeDefault position={[0, 2, 5]} fov={75} />
        
        {/* Player component - camera rig is handled inside Player */}
        <Player />
        
        {/* Simple ground plane for reference */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[50, 50]} />
          <meshStandardMaterial color="#2a2a2a" />
        </mesh>
        
        {/* Simple grid helper */}
        <gridHelper args={[50, 50, '#444', '#222']} />
      </Suspense>
    </Canvas>
  );
}

