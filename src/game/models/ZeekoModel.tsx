import { useLayoutEffect, useRef, useEffect } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Box3, Group, Vector3 } from 'three';
import * as THREE from 'three';

interface ZeekoModelProps {
  scale?: number | [number, number, number];
  position?: [number, number, number];
  rotation?: [number, number, number];
  isMoving?: boolean;
  isSprinting?: boolean;
  isSwinging?: boolean;
  onSceneReady?: (scene: THREE.Group) => void;
}

export function ZeekoModel(props: ZeekoModelProps) {
  const { scene, animations } = useGLTF('/models/Zeeko.glb');
  const groupRef = useRef<Group>(null);
  const { actions, mixer } = useAnimations(animations, groupRef);
  const { isMoving = false, isSprinting = false, isSwinging = false, onSceneReady } = props;
  
  // Track current animation state
  const currentAnimationRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (!groupRef.current) return;

    const box = new Box3().setFromObject(groupRef.current);
    const size = new Vector3();
    const center = new Vector3();
    box.getSize(size);
    box.getCenter(center);

    // Move the model so its lowest point sits at y = 0.
    // box.min.y is the lowest point in world space; shift by -minY.
    const minY = box.min.y;
    groupRef.current.position.y -= minY;
    
    // Notify parent that scene is ready (for bone access)
    if (onSceneReady && groupRef.current) {
      onSceneReady(groupRef.current);
    }
  }, [onSceneReady]);

  // Configure death animation as one-shot (but don't play it yet)
  useEffect(() => {
    const deathAction = actions['Armature|Dying|baselayer'];
    if (deathAction) {
      deathAction.setLoop(THREE.LoopOnce, 1);
      deathAction.clampWhenFinished = true;
    }
  }, [actions]);

  // Animation state machine - handles transitions between idle, walk, run, and melee
  useEffect(() => {
    if (!actions) return;

    // Determine which animation to play based on player state
    let targetAnimation: string;
    
    if (isSwinging) {
      targetAnimation = 'Armature|Melee|baselayer';
    } else if (isMoving && isSprinting) {
      targetAnimation = 'Armature|Running|baselayer';
    } else if (isMoving) {
      targetAnimation = 'Armature|Walking|baselayer';
    } else {
      targetAnimation = 'Armature|Idle|baselayer';
    }

    // Only switch animations if the target has changed
    if (currentAnimationRef.current === targetAnimation) {
      return;
    }

    const currentAction = currentAnimationRef.current ? actions[currentAnimationRef.current] : null;
    const newAction = actions[targetAnimation];

    if (!newAction) {
      console.warn(`ZeekoModel: Animation "${targetAnimation}" not found`);
      return;
    }

    // Stop current animation and start new one
    if (currentAction && currentAction.isRunning()) {
      currentAction.fadeOut(0.1);
    }

    newAction.reset().fadeIn(0.1).play();
    
    // Set looping behavior
    if (targetAnimation === 'Armature|Melee|baselayer') {
      // Melee is one-shot, will handle transition back when it finishes
      newAction.setLoop(THREE.LoopOnce, 1);
      newAction.clampWhenFinished = false;
    } else {
      // Idle, walk, and run loop forever
      newAction.setLoop(THREE.LoopRepeat, Infinity);
    }

    currentAnimationRef.current = targetAnimation;

  }, [actions, isMoving, isSprinting, isSwinging]);

  // Update animation mixer each frame
  useFrame((_, delta) => {
    if (mixer) {
      mixer.update(delta);
    }
  });

  return (
    <group ref={groupRef} {...props} dispose={null}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload('/models/Zeeko.glb');
