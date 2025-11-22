import * as THREE from 'three';
import React, { forwardRef, useRef, useImperativeHandle } from 'react';
import { PositionalAudio } from '@react-three/drei';

export type BatonSFXHandle = {
  playSwing: () => void;
  playImpact: () => void;
};

export const BatonSFX = forwardRef<BatonSFXHandle>((props, ref) => {
  const swingRef = useRef<THREE.PositionalAudio | null>(null);
  const impactRef = useRef<THREE.PositionalAudio | null>(null);

  useImperativeHandle(ref, () => ({
    playSwing() {
      const a = swingRef.current;
      if (!a) return;
      a.stop();
      a.offset = 0;
      a.play();
    },
    playImpact() {
      const a = impactRef.current;
      if (!a) return;
      a.stop();
      a.offset = 0;
      a.play();
    }
  }));

  return (
    <group>
      <PositionalAudio
        ref={swingRef}
        url="/audio/baton-swing.ogg"
        distance={5}
      />
      <PositionalAudio
        ref={impactRef}
        url="/audio/baton-impact.ogg"
        distance={5}
      />
      {props.children}
    </group>
  );
});

