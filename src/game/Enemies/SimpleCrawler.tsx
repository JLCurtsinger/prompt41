import { useRef } from "react";

import { Group, Vector3 } from "three";

import { useFrame } from "@react-three/fiber";

type SimpleCrawlerProps = {

  id?: string; // ignored for now

  start: [number, number, number];

  end: [number, number, number];

};

export function SimpleCrawler({ start, end }: SimpleCrawlerProps) {

  const enemyRef = useRef<Group>(null);

  const startVec = useRef(new Vector3(...start));

  const endVec = useRef(new Vector3(...end));

  const tRef = useRef(0);

  const dirRef = useRef<1 | -1>(1);

  useFrame((_state, delta) => {

    const root = enemyRef.current;

    if (!root) return;

    const speed = 0.35;

    tRef.current += dirRef.current * speed * delta;

    if (tRef.current >= 1) {

      tRef.current = 1;

      dirRef.current = -1;

    } else if (tRef.current <= 0) {

      tRef.current = 0;

      dirRef.current = 1;

    }

    root.position.lerpVectors(startVec.current, endVec.current, tRef.current);

  });

  return (

    <group ref={enemyRef}>

      <mesh>

        <boxGeometry args={[1, 0.6, 1]} />

        <meshStandardMaterial color="red" />

      </mesh>

    </group>

  );

}
