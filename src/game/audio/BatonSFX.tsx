import * as THREE from 'three';
import React, {
  forwardRef,
  useRef,
  useImperativeHandle,
  useEffect,
} from 'react';
import { PositionalAudio } from '@react-three/drei';
import { useGameState } from '../../state/gameState';

export type BatonSFXHandle = {
  playSwing: () => void;
  playImpact: () => void;
};

type BatonSFXProps = React.JSX.IntrinsicElements['group'];

export const BatonSFX = forwardRef<BatonSFXHandle, BatonSFXProps>(
  function BatonSFX(props, ref) {
    const swingRef = useRef<THREE.PositionalAudio | null>(null);
    const impactRef = useRef<THREE.PositionalAudio | null>(null);
    
    // Subscribe to global audio state
    const audioVolume = useGameState((state) => state.audioVolume);
    const audioMuted = useGameState((state) => state.audioMuted);

    // Update volume when global state changes
    useEffect(() => {
      const effectiveVolume = audioMuted ? 0 : audioVolume;
      
      const s = swingRef.current;
      const i = impactRef.current;
      
      if (s) s.setVolume(effectiveVolume);
      if (i) i.setVolume(effectiveVolume);
    }, [audioVolume, audioMuted]);

    // Ensure non-looping behavior once buffer is loaded
    useEffect(() => {
      const s = swingRef.current;
      const i = impactRef.current;
      if (s && s.buffer) s.setLoop(false);
      if (i && i.buffer) i.setLoop(false);
    });

    useImperativeHandle(ref, () => ({
      playSwing() {
        const state = useGameState.getState();
        if (state.audioMuted) return; // Don't play if muted
        
        const a = swingRef.current;
        if (!a) return;
        a.setLoop(false);
        a.setVolume(state.audioVolume);
        a.stop();      // ensure no stacking
        a.offset = 0;  // reset to beginning
        a.play();
      },
      playImpact() {
        const state = useGameState.getState();
        if (state.audioMuted) return; // Don't play if muted
        
        const a = impactRef.current;
        if (!a) return;
        a.setLoop(false);
        a.setVolume(state.audioVolume);
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
