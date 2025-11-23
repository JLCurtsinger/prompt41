import React, { useRef } from "react";

import * as THREE from "three";

import { useFrame } from "@react-three/fiber";

type TestCrawlerProps = {

  id?: string;

  start?: [number, number, number];

  end?: [number, number, number];

};

const startDefault: [number, number, number] = [0, 0, 0];

const endDefault: [number, number, number] = [5, 0, 0];

export function TestCrawler({

  id = "test-crawler-0",

  start = startDefault,

  end = endDefault,

}: TestCrawlerProps) {

  const groupRef = useRef<THREE.Group>(null);

  const dirRef = useRef<1 | -1>(1);

  const startVec = new THREE.Vector3(...start);

  const endVec = new THREE.Vector3(...end);

  const tmpDir = new THREE.Vector3();

  useFrame((_, delta) => {

    const g = groupRef.current;

    if (!g) return;

    // Simple ping-pong between start and end

    const target = dirRef.current === 1 ? endVec : startVec;

    tmpDir.copy(target).sub(g.position);

    const dist = tmpDir.length();

    if (dist < 0.1) {

      dirRef.current = dirRef.current === 1 ? -1 : 1;

      return;

    }

    tmpDir.normalize();

    const speed = 1.5; // units per second

    g.position.addScaledVector(tmpDir, speed * delta);

  });

  return (

    <group ref={groupRef} position={start}>

      <mesh castShadow receiveShadow>

        <boxGeometry args={[0.6, 0.6, 0.6]} />

        <meshStandardMaterial color={"red"} />

      </mesh>

    </group>

  );

}

export default TestCrawler;

