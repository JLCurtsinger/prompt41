// TEST PLAN (Player Movement)
// 1. W/S/A/D Directions:
//    - W should move forward relative to camera (player moves in direction camera is facing)
//    - S should move backward relative to camera
//    - A should strafe left relative to camera
//    - D should strafe right relative to camera
//    - Test by rotating camera with mouse, then pressing W - should always move forward relative to view
// 2. Sprint:
//    - Hold Shift while moving - should see "Sprint: ON" in console and movement speed should double
//    - Release Shift - should see "Sprint: OFF" and return to walk speed
//    - Sprint should only work while moving (no sprint while idle)
// 3. Jump:
//    - Press Space while grounded (y = 0) - should see "Jump: START" in console, player jumps upward
//    - Press Space while in air - should see "Jump: BLOCKED (not grounded)" and nothing happens
//    - Player should fall back down due to gravity
//    - Player should land smoothly at y = 0 and be able to jump again
//    - Test grounding: jump, wait to land, jump again - should work each time
// 4. Death & Respawn:
//    - When health reaches 0, player controls should freeze (no movement, jump, or camera rotation)
//    - Press R key to respawn: health restored, position reset to spawn point, controls re-enabled
// 5. Arrow Keys Camera Control:
//    - Arrow keys rotate camera: Left/Right pan horizontally, Up/Down tilt vertically
//    - Left arrow should rotate camera left (decrease horizontal angle)
//    - Right arrow should rotate camera right (increase horizontal angle)
//    - Up arrow should tilt camera up (increase vertical angle)
//    - Down arrow should tilt camera down (decrease vertical angle)
//    - Arrow keys should NOT move the player character
//    - Mouse look should still work alongside arrow keys
//    - Vertical rotation should be clamped to prevent camera flipping

import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGameState } from '../state/gameState';
import { PLAYER_SPAWN_POSITION } from './LevelLayout';
import { getEnemiesInRange } from './Enemies/enemyRegistry';
import * as THREE from 'three';

interface PlayerProps {
  initialPosition?: [number, number, number];
}

export function Player({ initialPosition = [0, 0, 0] }: PlayerProps) {
  const playerRef = useRef<THREE.Group>(null);
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  const isGrounded = useRef(true);
  const verticalVelocity = useRef(0);
  
  const { camera } = useThree();
  const { isSwinging, setIsSwinging, isDead, resetPlayer } = useGameState();
  
  // Movement constants
  const WALK_SPEED = 3;
  const SPRINT_SPEED = 6;
  const ACCELERATION = 15;
  const DECELERATION = 20;
  const ROTATION_SPEED = 8;
  
  // Jump constants
  const JUMP_VELOCITY = 5; // m/s upward
  const GRAVITY = -9.8; // m/s² (negative = downward)
  const GROUND_Y = 0; // Ground level
  
  // Combat constants
  const BATON_RANGE = 2; // meters
  const BATON_DAMAGE = 35; // damage per hit
  const ATTACK_COOLDOWN = 0.4; // seconds between attacks
  
  // Camera constants
  const CAMERA_DISTANCE = 3; // Distance behind player
  const CAMERA_HEIGHT = 1.6; // Height offset (head level)
  const CAMERA_SHOULDER_OFFSET = 0.5; // Horizontal offset to the right
  const CAMERA_SMOOTHNESS = 0.1;
  
  const keys = useRef({
    w: false,
    a: false,
    s: false,
    d: false,
    shift: false,
    space: false,
    r: false,
    arrowUp: false,
    arrowDown: false,
    arrowLeft: false,
    arrowRight: false,
  });
  
  // Attack state
  const lastAttackTime = useRef<number>(0);
  const mouseButtonPressed = useRef<boolean>(false);
  
  // Track previous states for console logging
  const prevSprintState = useRef(false);
  const prevSpaceState = useRef(false);
  const prevArrowLeftState = useRef(false);
  const prevArrowRightState = useRef(false);
  const prevArrowUpState = useRef(false);
  const prevArrowDownState = useRef(false);
  
  // Mouse look state
  const mouseDelta = useRef({ x: 0, y: 0 });
  const cameraRotation = useRef({ horizontal: 0, vertical: 0 });
  const MOUSE_SENSITIVITY = 0.002;
  const VERTICAL_LIMIT = Math.PI / 3; // 60 degrees up/down
  const HORIZONTAL_ARROW_SPEED = 1.5; // radians per second
  const VERTICAL_ARROW_SPEED = 1.5; // radians per second
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'w') keys.current.w = true;
      if (key === 'a') keys.current.a = true;
      if (key === 's') keys.current.s = true;
      if (key === 'd') keys.current.d = true;
      if (key === 'shift') {
        keys.current.shift = true;
      }
      if (key === ' ') {
        e.preventDefault();
        if (!keys.current.space) {
          // Only set to true if not already true (prevents repeat triggers)
          keys.current.space = true;
        }
      }
      if (key === 'r') {
        keys.current.r = true;
      }
      // Arrow keys (use exact key names, not lowercase)
      if (e.key === 'ArrowUp') {
        keys.current.arrowUp = true;
      }
      if (e.key === 'ArrowDown') {
        keys.current.arrowDown = true;
      }
      if (e.key === 'ArrowLeft') {
        keys.current.arrowLeft = true;
      }
      if (e.key === 'ArrowRight') {
        keys.current.arrowRight = true;
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'w') keys.current.w = false;
      if (key === 'a') keys.current.a = false;
      if (key === 's') keys.current.s = false;
      if (key === 'd') keys.current.d = false;
      if (key === 'shift') {
        keys.current.shift = false;
        // Reset sprint state tracking when shift is released
        if (prevSprintState.current) {
          prevSprintState.current = false;
        }
      }
      if (key === ' ') {
        keys.current.space = false;
        prevSpaceState.current = false;
      }
      if (key === 'r') {
        keys.current.r = false;
      }
      // Arrow keys (use exact key names, not lowercase)
      if (e.key === 'ArrowUp') {
        keys.current.arrowUp = false;
      }
      if (e.key === 'ArrowDown') {
        keys.current.arrowDown = false;
      }
      if (e.key === 'ArrowLeft') {
        keys.current.arrowLeft = false;
      }
      if (e.key === 'ArrowRight') {
        keys.current.arrowRight = false;
      }
    };
    
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        mouseButtonPressed.current = true;
        if (!isSwinging) {
          setIsSwinging(true);
          setTimeout(() => setIsSwinging(false), 300);
        }
      }
    };
    
    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        mouseButtonPressed.current = false;
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
    window.addEventListener('mouseup', handleMouseUp);
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
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      if (canvas) {
        canvas.removeEventListener('click', handleClick);
      }
    };
  }, [isSwinging, setIsSwinging]);
  
  useFrame((state, delta) => {
    if (!playerRef.current) return;
    
    // Handle respawn (R key) - only works when dead
    if (isDead && keys.current.r) {
      resetPlayer();
      // Reset player position to spawn
      playerRef.current.position.set(...PLAYER_SPAWN_POSITION);
      // Reset camera to default position
      camera.position.set(0, 2, 5);
      camera.rotation.set(0, 0, 0);
      keys.current.r = false; // Prevent repeat triggers
      return;
    }
    
    // Freeze all controls when dead
    if (isDead) {
      return;
    }
    
    // Handle Shock Baton attack
    const currentTime = state.clock.elapsedTime;
    const canAttack = currentTime - lastAttackTime.current >= ATTACK_COOLDOWN;
    
    if (mouseButtonPressed.current && canAttack && !isSwinging) {
      // Perform attack
      lastAttackTime.current = currentTime;
      setIsSwinging(true);
      setTimeout(() => setIsSwinging(false), 300);
      
      // Get player position and forward direction
      const playerPos = playerRef.current.position;
      
      // Calculate forward direction from camera
      const cameraForward = new THREE.Vector3();
      camera.getWorldDirection(cameraForward);
      cameraForward.y = 0; // Keep on horizontal plane
      cameraForward.normalize();
      
      // Find enemies in range
      const enemiesInRange = getEnemiesInRange(playerPos, BATON_RANGE);
      
      if (enemiesInRange.length > 0) {
        // Hit the first enemy in range
        const hitEnemy = enemiesInRange[0];
        hitEnemy.takeDamage(BATON_DAMAGE);
        console.log(`[Combat] Baton hit enemy for ${BATON_DAMAGE}`);
      } else {
        // Swing but no target
        console.log('[Combat] Baton swing - no target in range');
      }
    }
    
    const player = playerRef.current;
    
    // Check if player is grounded (at or near ground level)
    const currentY = player.position.y;
    isGrounded.current = currentY <= GROUND_Y + 0.01; // Small threshold for floating point precision
    
    // Handle jump input (check on key press, not hold)
    const spaceJustPressed = keys.current.space && !prevSpaceState.current;
    
    if (spaceJustPressed) {
      if (isGrounded.current) {
        // Start jump
        verticalVelocity.current = JUMP_VELOCITY;
        isGrounded.current = false;
        console.log('Jump: START');
        prevSpaceState.current = true; // Mark as processed
      } else {
        // Blocked - not grounded
        console.log('Jump: BLOCKED (not grounded)');
        prevSpaceState.current = true; // Mark as processed to prevent spam
      }
    }
    
    // Reset space key tracking when space is released
    if (!keys.current.space) {
      prevSpaceState.current = false;
    }
    
    // Apply gravity to vertical velocity
    verticalVelocity.current += GRAVITY * delta;
    
    // Update vertical position
    const newY = currentY + verticalVelocity.current * delta;
    
    // Clamp to ground and handle landing
    if (newY <= GROUND_Y) {
      player.position.y = GROUND_Y;
      verticalVelocity.current = 0;
      isGrounded.current = true;
    } else {
      player.position.y = newY;
      isGrounded.current = false;
    }
    
    // Calculate camera forward and right vectors for movement
    const cameraForward = new THREE.Vector3();
    camera.getWorldDirection(cameraForward);
    cameraForward.y = 0; // Keep movement on horizontal plane
    cameraForward.normalize();
    
    const cameraRight = new THREE.Vector3();
    cameraRight.crossVectors(cameraForward, new THREE.Vector3(0, 1, 0)).normalize();
    
    // Calculate movement direction in camera space
    direction.current.set(0, 0, 0);
    
    // Build movement vector relative to camera
    if (keys.current.w) {
      // W = forward (in camera's forward direction)
      direction.current.add(cameraForward);
    }
    if (keys.current.s) {
      // S = backward (opposite of camera's forward direction)
      direction.current.sub(cameraForward);
    }
    if (keys.current.a) {
      // A = left (opposite of camera's right direction)
      direction.current.sub(cameraRight);
    }
    if (keys.current.d) {
      // D = right (in camera's right direction)
      direction.current.add(cameraRight);
    }
    
    // Normalize diagonal movement
    if (direction.current.length() > 0.1) {
      direction.current.normalize();
    }
    
    // Determine target speed
    let targetSpeed = 0;
    const isMoving = direction.current.length() > 0.1;
    const isSprinting = keys.current.shift && isMoving;
    
    if (isMoving) {
      targetSpeed = isSprinting ? SPRINT_SPEED : WALK_SPEED;
    }
    
    // Log sprint state changes (only when actually moving)
    if (isMoving) {
      if (isSprinting !== prevSprintState.current) {
        if (isSprinting) {
          console.log('Sprint: ON');
        } else {
          console.log('Sprint: OFF');
        }
        prevSprintState.current = isSprinting;
      }
    } else {
      // Reset sprint state when not moving
      if (prevSprintState.current) {
        prevSprintState.current = false;
      }
    }
    
    // Apply acceleration/deceleration
    if (targetSpeed > 0) {
      const targetVelocity = direction.current.clone().multiplyScalar(targetSpeed);
      velocity.current.lerp(targetVelocity, ACCELERATION * delta);
    } else {
      velocity.current.lerp(new THREE.Vector3(0, 0, 0), DECELERATION * delta);
    }
    
    // Prevent sliding by zeroing out very small velocities
    if (velocity.current.length() < 0.01) {
      velocity.current.set(0, 0, 0);
    }
    
    // Update horizontal position (Y is handled separately by jump/gravity)
    const horizontalVelocity = new THREE.Vector3(velocity.current.x, 0, velocity.current.z);
    const deltaMovement = horizontalVelocity.clone().multiplyScalar(delta);
    player.position.x += deltaMovement.x;
    player.position.z += deltaMovement.z;
    
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
    
    // Update camera rotation from arrow keys
    // Horizontal rotation (Left/Right arrows)
    if (keys.current.arrowLeft) {
      cameraRotation.current.horizontal -= HORIZONTAL_ARROW_SPEED * delta;
      if (!prevArrowLeftState.current) {
        console.log('Camera: arrow horizontal start LEFT');
        prevArrowLeftState.current = true;
      }
    } else {
      if (prevArrowLeftState.current) {
        console.log('Camera: arrow horizontal stop');
        prevArrowLeftState.current = false;
      }
    }
    
    if (keys.current.arrowRight) {
      cameraRotation.current.horizontal += HORIZONTAL_ARROW_SPEED * delta;
      if (!prevArrowRightState.current) {
        console.log('Camera: arrow horizontal start RIGHT');
        prevArrowRightState.current = true;
      }
    } else {
      if (prevArrowRightState.current) {
        console.log('Camera: arrow horizontal stop');
        prevArrowRightState.current = false;
      }
    }
    
    // Vertical rotation (Up/Down arrows)
    if (keys.current.arrowUp) {
      cameraRotation.current.vertical += VERTICAL_ARROW_SPEED * delta;
      cameraRotation.current.vertical = Math.max(-VERTICAL_LIMIT, Math.min(VERTICAL_LIMIT, cameraRotation.current.vertical));
      if (!prevArrowUpState.current) {
        console.log('Camera: arrow vertical start UP');
        prevArrowUpState.current = true;
      }
    } else {
      if (prevArrowUpState.current) {
        console.log('Camera: arrow vertical stop');
        prevArrowUpState.current = false;
      }
    }
    
    if (keys.current.arrowDown) {
      cameraRotation.current.vertical -= VERTICAL_ARROW_SPEED * delta;
      cameraRotation.current.vertical = Math.max(-VERTICAL_LIMIT, Math.min(VERTICAL_LIMIT, cameraRotation.current.vertical));
      if (!prevArrowDownState.current) {
        console.log('Camera: arrow vertical start DOWN');
        prevArrowDownState.current = true;
      }
    } else {
      if (prevArrowDownState.current) {
        console.log('Camera: arrow vertical stop');
        prevArrowDownState.current = false;
      }
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
      // Ensure player starts grounded if Y is at or near ground level
      if (initialPosition[1] <= GROUND_Y + 0.01) {
        isGrounded.current = true;
        verticalVelocity.current = 0;
      }
    }
  }, [initialPosition]);
  
  return (
    <group ref={playerRef} position={initialPosition}>
      {/* TODO: Replace this placeholder capsule with the actual player GLB model (mainChar.png) */}
      <mesh position={[0, 1, 0]} castShadow>
        <capsuleGeometry args={[0.4, 1.2, 4, 8]} />
        <meshStandardMaterial 
          color="#6ab8ff" 
          emissive="#2a5a99" 
          emissiveIntensity={0.4}
        />
      </mesh>
      {/* Simple visor glow effect placeholder */}
      <mesh position={[0, 1.8, 0.2]} castShadow>
        <planeGeometry args={[0.3, 0.2]} />
        <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={1} />
      </mesh>
    </group>
  );
}

