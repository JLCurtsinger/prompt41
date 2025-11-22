import * as THREE from 'three';
import React, {
  forwardRef,
  useRef,
  useImperativeHandle,
  useEffect,
} from 'react';
import { PositionalAudio } from '@react-three/drei';

export type BatonSFXHandle = {
  playSwing: () => void;
  playImpact: () => void;
};

type BatonSFXProps = React.JSX.IntrinsicElements['group'];

export const BatonSFX = forwardRef<BatonSFXHandle, BatonSFXProps>(
  function BatonSFX(props, ref) {
    const swingRef = useRef<THREE.PositionalAudio | null>(null);
    const impactRef = useRef<THREE.PositionalAudio | null>(null);

    // Ensure non-looping behavior once buffer is loaded
    useEffect(() => {
      const s = swingRef.current;
      const i = impactRef.current;
      if (s && s.buffer) s.setLoop(false);
      if (i && i.buffer) i.setLoop(false);
    });

    useImperativeHandle(ref, () => ({
      playSwing() {
        const a = swingRef.current;
        if (!a) return;
        a.setLoop(false);
        a.stop();      // ensure no stacking
        a.offset = 0;  // reset to beginning
        a.play();
      },
      playImpact() {
        const a = impactRef.current;
        if (!a) return;
        a.setLoop(false);
        a.stop();
        a.offset = 0;
        a.play();
      },
    }));

    return (
      <group {...props}>
        <PositionalAudio
          ref={swingRef}
          url="/audio/baton-swing.ogg"
          loop={false}
          distance={5}
        />
        <PositionalAudio
          ref={impactRef}
          url="/audio/baton-impact.ogg"
          loop={false}
          distance={5}
        />
        {props.children}
      </group>
    );
  }
);

BatonSFX.displayName = 'BatonSFX';
