import React, { useRef, useEffect } from "react";

import { useFrame } from "@react-three/fiber";

import * as THREE from "three";

type TestCrawlerProps = {

  start?: [number, number, number];

  end?: [number, number, number];

};

const startDefault: [number, number, number] = [0, 0.5, 0];

const endDefault: [number, number, number] = [5, 0.5, 0];

export const TestCrawler: React.FC<TestCrawlerProps> = ({

  start = startDefault,

  end = endDefault,

}) => {

  const groupRef = useRef<THREE.Group>(null);

  const dirRef = useRef<1 | -1>(1);

  const startVec = new THREE.Vector3(...start);

  const endVec = new THREE.Vector3(...end);

  const tmpDir = new THREE.Vector3();

  const lastLogTimeRef = useRef(0);

  useEffect(() => {

    console.log("[TestCrawler] mounted, start:", start, "end:", end);

  }, [start, end]);

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

    // Debug log every second (throttled)

    const now = performance.now() / 1000; // Convert to seconds

    if (now - lastLogTimeRef.current >= 1.0) {

      lastLogTimeRef.current = now;

      const worldPos = new THREE.Vector3();

      g.getWorldPosition(worldPos);

      console.log(

        "[TestCrawler] world position:",

        `(${worldPos.x.toFixed(2)}, ${worldPos.y.toFixed(2)}, ${worldPos.z.toFixed(2)})`,

        "| local:",

        `(${g.position.x.toFixed(2)}, ${g.position.y.toFixed(2)}, ${g.position.z.toFixed(2)})`,

      );

    }

  });

  return (

    <group ref={groupRef} position={start}>

      <mesh castShadow receiveShadow>

        <boxGeometry args={[0.6, 0.6, 0.6]} />

        <meshBasicMaterial color="red" />

      </mesh>

    </group>

  );

};
