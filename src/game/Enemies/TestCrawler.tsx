import React, { useRef, useEffect } from "react";

import { useFrame } from "@react-three/fiber";

import type { Mesh } from "three";

type TestCrawlerProps = {

  position?: [number, number, number];

};

export const TestCrawler: React.FC<TestCrawlerProps> = ({ position = [0, 1, 0] }) => {

  const meshRef = useRef<Mesh | null>(null);

  useEffect(() => {

    console.log("[TestCrawler] mounted at", position);

  }, [position]);

  useFrame((_, delta) => {

    if (!meshRef.current) return;

    // Simple idle animation: hover + slow rotation

    meshRef.current.rotation.y += delta;

    meshRef.current.position.y = position[1] + Math.sin(performance.now() / 500) * 0.2;

  });

  return (

    <mesh ref={meshRef} position={position}>

      <boxGeometry args={[1, 1, 1]} />

      {/* Basic material so it's always visible, unaffected by lights */}

      <meshBasicMaterial color="red" />

    </mesh>

  );

};
