import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGameState } from '../state/gameState';
import * as THREE from 'three';

interface PlayerProps {
  initialPosition?: [number, number, number];
}

export function Player({ initialPosition = [0, 0, 0] }: PlayerProps) {
  const playerRef = useRef<THREE.Group>(null);
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  const isOnGround = useRef(true);
  const dodgeCooldown = useRef(0);
  
  const { camera } = useThree();
  const { isSwinging, setIsSwinging } = useGameState();
  
  // Movement constants
  const WALK_SPEED = 3;
  const SPRINT_SPEED = 6;
  const DODGE_SPEED = 12;
  const DODGE_DURATION = 0.3;
  const DODGE_COOLDOWN = 1.5;
  const ACCELERATION = 15;
  const DECELERATION = 20;
  const ROTATION_SPEED = 8;
  
  // Camera constants
  const CAMERA_DISTANCE = 3; // Distance behind player
  const CAMERA_HEIGHT = 1.6; // Height offset (head level)
  const CAMERA_SHOULDER_OFFSET = 0.5; // Horizontal offset to the right
  const CAMERA_SMOOTHNESS = 0.1;
  const CAMERA_ROTATION_SMOOTHNESS = 0.1;
  
  const keys = useRef({
    w: false,
    a: false,
    s: false,
    d: false,
    shift: false,
    space: false,
  });
  
  const dodgeState = useRef({
    isDodging: false,
    dodgeDirection: new THREE.Vector3(),
    dodgeTimer: 0,
  });
  
  // Mouse look state
  const mouseDelta = useRef({ x: 0, y: 0 });
  const cameraRotation = useRef({ horizontal: 0, vertical: 0 });
  const MOUSE_SENSITIVITY = 0.002;
  const VERTICAL_LIMIT = Math.PI / 3; // 60 degrees up/down
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'w') keys.current.w = true;
      if (key === 'a') keys.current.a = true;
      if (key === 's') keys.current.s = true;
      if (key === 'd') keys.current.d = true;
      if (key === 'shift') keys.current.shift = true;
      if (key === ' ') {
        e.preventDefault();
        keys.current.space = true;
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'w') keys.current.w = false;
      if (key === 'a') keys.current.a = false;
      if (key === 's') keys.current.s = false;
      if (key === 'd') keys.current.d = false;
      if (key === 'shift') keys.current.shift = false;
      if (key === ' ') keys.current.space = false;
    };
    
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0 && !isSwinging && !dodgeState.current.isDodging) {
        setIsSwinging(true);
        setTimeout(() => setIsSwinging(false), 300);
      }
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      mouseDelta.current.x += e.movementX * MOUSE_SENSITIVITY;
      mouseDelta.current.y += e.movementY * MOUSE_SENSITIVITY;
    };
    
    const handlePointerLockChange = () => {
      if (document.pointerLockElement === null) {
        // Pointer lock was released
      }
    };
    
    const handleClick = () => {
      // Request pointer lock on canvas click
      const canvas = document.querySelector('canvas');
      if (canvas) {
        canvas.requestPointerLock();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.addEventListener('click', handleClick);
    }
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      if (canvas) {
        canvas.removeEventListener('click', handleClick);
      }
    };
  }, [isSwinging, setIsSwinging]);
  
  useFrame((state, delta) => {
    if (!playerRef.current) return;
    
    const player = playerRef.current;
    
    // Update dodge cooldown
    if (dodgeCooldown.current > 0) {
      dodgeCooldown.current -= delta;
    }
    
    // Handle dodge input
    if (keys.current.space && dodgeCooldown.current <= 0 && !dodgeState.current.isDodging) {
      dodgeState.current.isDodging = true;
      dodgeState.current.dodgeTimer = DODGE_DURATION;
      dodgeCooldown.current = DODGE_COOLDOWN;
      
      // Calculate dodge direction from current movement or forward
      if (direction.current.length() > 0.1) {
        dodgeState.current.dodgeDirection.copy(direction.current).normalize();
      } else {
        dodgeState.current.dodgeDirection.set(0, 0, -1).applyQuaternion(player.quaternion);
      }
    }
    
    // Update dodge state
    if (dodgeState.current.isDodging) {
      dodgeState.current.dodgeTimer -= delta;
      if (dodgeState.current.dodgeTimer <= 0) {
        dodgeState.current.isDodging = false;
      }
    }
    
    // Calculate movement direction in camera space
    direction.current.set(0, 0, 0);
    
    if (!dodgeState.current.isDodging) {
      if (keys.current.w) direction.current.z -= 1;
      if (keys.current.s) direction.current.z += 1;
      if (keys.current.a) direction.current.x -= 1;
      if (keys.current.d) direction.current.x += 1;
      
      // Normalize diagonal movement
      if (direction.current.length() > 0) {
        direction.current.normalize();
      }
      
      // Transform direction to world space based on camera horizontal rotation
      const horizontalAngle = cameraRotation.current.horizontal;
      const forwardX = Math.sin(horizontalAngle);
      const forwardZ = Math.cos(horizontalAngle);
      const rightX = Math.cos(horizontalAngle);
      const rightZ = -Math.sin(horizontalAngle);
      
      const worldDirection = new THREE.Vector3();
      worldDirection.x = forwardX * -direction.current.z + rightX * direction.current.x;
      worldDirection.z = forwardZ * -direction.current.z + rightZ * direction.current.x;
      worldDirection.normalize();
      
      direction.current.copy(worldDirection);
    } else {
      // During dodge, use stored dodge direction
      direction.current.copy(dodgeState.current.dodgeDirection);
    }
    
    // Determine target speed
    let targetSpeed = 0;
    if (dodgeState.current.isDodging) {
      targetSpeed = DODGE_SPEED;
    } else if (direction.current.length() > 0.1) {
      targetSpeed = keys.current.shift ? SPRINT_SPEED : WALK_SPEED;
    }
    
    // Apply acceleration/deceleration
    const currentSpeed = velocity.current.length();
    if (targetSpeed > 0) {
      velocity.current.lerp(direction.current.multiplyScalar(targetSpeed), ACCELERATION * delta);
    } else {
      velocity.current.lerp(new THREE.Vector3(0, 0, 0), DECELERATION * delta);
    }
    
    // Prevent sliding by zeroing out very small velocities
    if (velocity.current.length() < 0.01) {
      velocity.current.set(0, 0, 0);
    }
    
    // Update position
    const deltaMovement = velocity.current.clone().multiplyScalar(delta);
    player.position.add(deltaMovement);
    
    // Rotate player to face movement direction
    if (velocity.current.length() > 0.1) {
      const targetRotation = Math.atan2(velocity.current.x, velocity.current.z);
      const currentRotation = Math.atan2(
        2 * player.quaternion.x * player.quaternion.w - 2 * player.quaternion.y * player.quaternion.z,
        1 - 2 * player.quaternion.x * player.quaternion.x - 2 * player.quaternion.z * player.quaternion.z
      );
      
      let rotationDiff = targetRotation - currentRotation;
      if (rotationDiff > Math.PI) rotationDiff -= 2 * Math.PI;
      if (rotationDiff < -Math.PI) rotationDiff += 2 * Math.PI;
      
      player.rotation.y += rotationDiff * ROTATION_SPEED * delta;
    }
    
    // Update camera rotation from mouse input
    if (document.pointerLockElement !== null) {
      cameraRotation.current.horizontal -= mouseDelta.current.x;
      cameraRotation.current.vertical -= mouseDelta.current.y;
      cameraRotation.current.vertical = Math.max(-VERTICAL_LIMIT, Math.min(VERTICAL_LIMIT, cameraRotation.current.vertical));
      mouseDelta.current.x = 0;
      mouseDelta.current.y = 0;
    }
    
    // Calculate camera position based on rotation around player
    const horizontalAngle = cameraRotation.current.horizontal;
    const verticalAngle = cameraRotation.current.vertical;
    
    // Calculate offset in spherical coordinates
    // Base offset: behind player, at shoulder height, slightly to the right
    const horizontalDistance = CAMERA_DISTANCE * Math.cos(verticalAngle);
    const verticalOffset = CAMERA_DISTANCE * Math.sin(verticalAngle);
    
    const baseOffset = new THREE.Vector3(
      CAMERA_SHOULDER_OFFSET * Math.cos(horizontalAngle), // Right offset rotated
      CAMERA_HEIGHT + verticalOffset, // Height with vertical tilt
      horizontalDistance // Distance behind with vertical tilt
    );
    
    // Rotate the Z component around Y axis by horizontal angle
    const rotatedZ = baseOffset.z * Math.cos(horizontalAngle) - baseOffset.x * Math.sin(horizontalAngle);
    const rotatedX = baseOffset.z * Math.sin(horizontalAngle) + baseOffset.x * Math.cos(horizontalAngle);
    baseOffset.x = rotatedX;
    baseOffset.z = rotatedZ;
    
    const targetCameraPosition = player.position.clone().add(baseOffset);
    
    // Simple collision avoidance: raycast from player to camera target
    const raycaster = new THREE.Raycaster();
    raycaster.set(player.position, targetCameraPosition.clone().sub(player.position).normalize());
    const distanceToTarget = player.position.distanceTo(targetCameraPosition);
    
    // Check for obstacles (simple sphere cast for now)
    // In a full implementation, you'd check against level geometry
    let finalCameraDistance = distanceToTarget;
    const hit = raycaster.intersectObjects([]); // Empty for now, add level geometry later
    if (hit.length > 0 && hit[0].distance < distanceToTarget) {
      finalCameraDistance = Math.max(0.5, hit[0].distance - 0.2);
      // Recalculate position with limited distance
      const directionToCamera = targetCameraPosition.clone().sub(player.position).normalize();
      targetCameraPosition.copy(player.position).add(directionToCamera.multiplyScalar(finalCameraDistance));
    }
    
    // Smooth camera position
    camera.position.lerp(targetCameraPosition, CAMERA_SMOOTHNESS);
    
    // Update camera rotation to look at player (with slight offset for over-the-shoulder feel)
    const lookAtTarget = player.position.clone();
    lookAtTarget.y += 1.5; // Look at player's head height
    
    camera.lookAt(lookAtTarget);
  });
  
  // Set initial position on mount
  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.position.set(...initialPosition);
    }
  }, [initialPosition]);
  
  return (
    <group ref={playerRef} position={initialPosition}>
      {/* TODO: Replace this placeholder capsule with the actual player GLB model (mainChar.png) */}
      <mesh position={[0, 1, 0]}>
        <capsuleGeometry args={[0.4, 1.2, 4, 8]} />
        <meshStandardMaterial color="#4a9eff" emissive="#1a3a66" emissiveIntensity={0.3} />
      </mesh>
      {/* Simple visor glow effect placeholder */}
      <mesh position={[0, 1.8, 0.2]}>
        <planeGeometry args={[0.3, 0.2]} />
        <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={1} />
      </mesh>
    </group>
  );
}

