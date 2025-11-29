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

import { useRef, useEffect, useState, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGameState } from '../state/gameState';
import { PLAYER_SPAWN_POSITION } from './LevelLayout';
import { getEnemiesInRange, getAllEnemies } from './Enemies/enemyRegistry';
import { BatonSFX } from './audio/BatonSFX';
import type { BatonSFXHandle } from './audio/BatonSFX';
import { BatonImpactSpark } from './Effects/BatonImpactSpark';
import { ZeekoModel } from './models/ZeekoModel';
import { AudioManager } from './audio/AudioManager';
import * as THREE from 'three';

// Type for tracking active spark effects
interface ActiveSpark {
  id: number;
  position: [number, number, number];
}

interface PlayerProps {
  initialPosition?: [number, number, number];
}

export function Player({ initialPosition = [0, 0, 0] }: PlayerProps) {
  const playerRef = useRef<THREE.Group>(null);
  const batonRef = useRef<THREE.Group>(null);
  const batonSfxRef = useRef<BatonSFXHandle | null>(null);
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  const isGrounded = useRef(true);
  const wasGroundedRef = useRef(true);
  const verticalVelocity = useRef(0);
  
  // Impact spark state
  const [activeSparks, setActiveSparks] = useState<ActiveSpark[]>([]);
  const sparkIdCounter = useRef(0);
  
  // Callback to remove a spark when it completes
  const removeSpark = useCallback((id: number) => {
    setActiveSparks(prev => prev.filter(spark => spark.id !== id));
  }, []);
  
  const { camera } = useThree();
  const { isSwinging, setIsSwinging, isDead, resetPlayer, isEnding, setBatonSfxRef, setPlayerPosition, recentlyHit } = useGameState();
  
  // Touch mode and touch inputs
  const touchMode = useGameState((state) => state.touchMode);
  const touchMoveInput = useGameState((state) => state.touchMoveInput);
  const touchCameraDelta = useGameState((state) => state.touchCameraDelta);
  const resetTouchCameraDelta = useGameState((state) => state.resetTouchCameraDelta);
  const touchAttackPressed = useGameState((state) => state.touchAttackPressed);
  const touchJumpPressed = useGameState((state) => state.touchJumpPressed);
  const prevTouchAttackRef = useRef(false);
  const prevTouchJumpRef = useRef(false);
  
  // Audio state
  const audioVolume = useGameState((state) => state.audioVolume);
  const audioMuted = useGameState((state) => state.audioMuted);
  
  // Baton swing animation state
  const batonSwingTimeRef = useRef(0);
  const batonIsSwingingRef = useRef(false);
  
  // Camera shake state (triggered on player hit)
  const cameraShakeTimeRef = useRef(0);
  const cameraShakeActiveRef = useRef(false);
  const prevRecentlyHitRef = useRef(false);
  const CAMERA_SHAKE_DURATION = 0.15; // seconds
  const CAMERA_SHAKE_INTENSITY = 0.08; // amplitude
  
  // Baton swing recoil state
  const recoilTimeRef = useRef(0);
  const recoilActiveRef = useRef(false);
  const RECOIL_DURATION = 0.1; // seconds
  const RECOIL_INTENSITY = 0.03; // amplitude
  
  // Footstep sound state - looping footsteps
  const sneakingFootstepsAudioRef = useRef<HTMLAudioElement | null>(null);
  const isFootstepsPlayingRef = useRef(false);
  const quickFootstepsAudioRef = useRef<HTMLAudioElement | null>(null);
  const isQuickFootstepsPlayingRef = useRef(false);
  const prevIsMovingRef = useRef(false);
  const prevIsSprintingRef = useRef(false);
  
  // Movement constants
  const WALK_SPEED = 4;
  const SPRINT_SPEED = 8;
  const ACCELERATION = 15;
  const DECELERATION = 20;
  const ROTATION_SPEED = 8;
  
  // Footstep volume multipliers (as percentage of master volume)
  const SNEAKING_FOOTSTEPS_VOLUME = 0.2; // 40% of master volume
  const QUICK_FOOTSTEPS_VOLUME = 0.4; // 60% of master volume
  
  // Jump constants
  const JUMP_VELOCITY = 5; // m/s upward
  const DOUBLE_JUMP_VELOCITY = 5; // m/s upward (same as normal jump)
  const GRAVITY = -9.8; // m/s² (negative = downward)
  const GROUND_Y = 0; // Ground level
  
  // Combat constants
  const BATON_RANGE = 4; // meters
  const BATON_DAMAGE = 20; // damage per hit
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
    enter: false,
    arrowUp: false,
    arrowDown: false,
    arrowLeft: false,
    arrowRight: false,
  });
  
  // Attack state
  const lastAttackTime = useRef<number>(0);
  const mouseButtonPressed = useRef<boolean>(false);
  const prevMouseButtonState = useRef<boolean>(false);
  const enterKeyPressed = useRef<boolean>(false);
  const prevEnterState = useRef<boolean>(false);
  const hasHitThisSwing = useRef<boolean>(false); // Track if we've already hit an enemy this swing
  
  // Track previous states for console logging
  const prevSprintState = useRef(false);
  const prevSpaceState = useRef(false);
  const prevArrowLeftState = useRef(false);
  const prevArrowRightState = useRef(false);
  const prevArrowUpState = useRef(false);
  const prevArrowDownState = useRef(false);
  
  // Double jump state
  const hasDoubleJumped = useRef(false);
  
  // Mouse look state
  const mouseDelta = useRef({ x: 0, y: 0 });
  const cameraRotation = useRef({ horizontal: 0, vertical: 0 });
  const MOUSE_SENSITIVITY = 0.002;
  const VERTICAL_LIMIT = Math.PI / 3; // 60 degrees up/down
  const HORIZONTAL_ARROW_SPEED = 1.5; // radians per second
  const VERTICAL_ARROW_SPEED = 1.5; // radians per second
  
  // Register the SFX ref globally so attack logic can call it
  useEffect(() => {
    setBatonSfxRef(batonSfxRef);
  }, [setBatonSfxRef]);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Guard: Skip keyboard input when in touch mode (except respawn key R)
      const { touchMode: isTouchMode } = useGameState.getState();
      const key = e.key.toLowerCase();
      
      // Always allow respawn key even in touch mode
      if (key === 'r') {
        keys.current.r = true;
        return;
      }
      
      if (isTouchMode) return;
      
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
      // Enter/Return key for melee attack
      if (e.key === 'Enter' || e.code === 'Enter') {
        keys.current.enter = true;
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
      // Guard: Skip keyboard input when in touch mode (except respawn key R)
      const { touchMode: isTouchMode } = useGameState.getState();
      const key = e.key.toLowerCase();
      
      // Always allow respawn key even in touch mode
      if (key === 'r') {
        keys.current.r = false;
        return;
      }
      
      if (isTouchMode) return;
      
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
      // Enter/Return key for melee attack
      if (e.key === 'Enter' || e.code === 'Enter') {
        keys.current.enter = false;
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
      // Guard: Skip mouse input when in touch mode
      const { touchMode: isTouchMode } = useGameState.getState();
      if (isTouchMode) return;
      
      if (e.button === 0) {
        // Guard: Don't trigger baton swing when clicking on audio controls
        const target = e.target as HTMLElement | null;
        if (target && target.closest('#audio-controls')) {
          return; // Click was in audio UI, don't swing baton
        }
        mouseButtonPressed.current = true;
      }
    };
    
    const handleMouseUp = (e: MouseEvent) => {
      // Guard: Skip mouse input when in touch mode
      const { touchMode: isTouchMode } = useGameState.getState();
      if (isTouchMode) return;
      
      if (e.button === 0) {
        mouseButtonPressed.current = false;
      }
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      // Guard: Skip mouse input when in touch mode
      const { touchMode: isTouchMode } = useGameState.getState();
      if (isTouchMode) return;
      
      mouseDelta.current.x += e.movementX * MOUSE_SENSITIVITY;
      mouseDelta.current.y += e.movementY * MOUSE_SENSITIVITY;
    };
    
    const handlePointerLockChange = () => {
      if (document.pointerLockElement === null) {
        // Pointer lock was released
      }
    };
    
    const handleClick = () => {
      // Guard: Skip pointer lock when in touch mode
      const { touchMode: isTouchMode } = useGameState.getState();
      if (isTouchMode) return;
      
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
    
    // Freeze all controls when ending sequence has begun
    if (isEnding) {
      return;
    }
    
    // Trigger camera shake when player gets hit (recentlyHit transitions to true)
    if (recentlyHit && !prevRecentlyHitRef.current) {
      cameraShakeActiveRef.current = true;
      cameraShakeTimeRef.current = 0;
    }
    prevRecentlyHitRef.current = recentlyHit;
    
    // Update camera shake timer
    if (cameraShakeActiveRef.current) {
      cameraShakeTimeRef.current += delta;
      if (cameraShakeTimeRef.current >= CAMERA_SHAKE_DURATION) {
        cameraShakeActiveRef.current = false;
      }
    }
    
    // Update recoil timer
    if (recoilActiveRef.current) {
      recoilTimeRef.current += delta;
      if (recoilTimeRef.current >= RECOIL_DURATION) {
        recoilActiveRef.current = false;
      }
    }
    
    // ============================================================
    // ATTACK FLOW TRACE:
    // 1. Input system: Enter key sets keys.current.enter (line 142-144)
    //    OR Mouse0 sets mouseButtonPressed.current (line 201)
    // 2. Attack handler: Checks input + cooldown + !isSwinging (line 293)
    // 3. Sets batonIsSwingingRef.current = true (line 301)
    // 4. useFrame animation block reads batonIsSwingingRef and rotates batonRef (line 580+)
    // ============================================================
    
    // Handle Shock Baton attack
    const currentTime = state.clock.elapsedTime;
    const canAttack = currentTime - lastAttackTime.current >= ATTACK_COOLDOWN;
    
    // Update enter key state
    enterKeyPressed.current = keys.current.enter;
    const enterJustPressed = enterKeyPressed.current && !prevEnterState.current;
    
    // Update mouse button state - detect "just pressed" like Enter key
    const mouseJustPressed = mouseButtonPressed.current && !prevMouseButtonState.current;
    
    // Update touch attack state - detect "just pressed"
    const touchAttackJustPressed = touchAttackPressed && !prevTouchAttackRef.current;
    prevTouchAttackRef.current = touchAttackPressed;
    
    // Perform attack on mouse click, Enter key press, or touch attack button
    // Note: We check canAttack for cooldown, but allow animation even if isSwinging is true
    // (the animation should play every time an attack input is detected)
    if ((mouseJustPressed || enterJustPressed || touchAttackJustPressed) && canAttack) {
      // Start attack
      lastAttackTime.current = currentTime;
      setIsSwinging(true);
      setTimeout(() => setIsSwinging(false), 300);
      
      batonIsSwingingRef.current = true;
      batonSwingTimeRef.current = 0;
      hasHitThisSwing.current = false; // Reset hit flag for new swing
      
      // Trigger view recoil effect
      recoilActiveRef.current = true;
      recoilTimeRef.current = 0;
      
      // Play swing audio
      const sfx = batonSfxRef.current;
      sfx?.playSwing();
      
      // Update enter key tracking
      if (enterJustPressed) {
        prevEnterState.current = true;
      }
      
      // Update mouse button tracking
      if (mouseJustPressed) {
        prevMouseButtonState.current = true;
      }
      
      // Note: Touch attack state is auto-released by TouchControlsOverlay
    }
    
    // Reset enter key tracking when key is released
    if (!enterKeyPressed.current) {
      prevEnterState.current = false;
    }
    
    // Reset mouse button tracking when button is released
    if (!mouseButtonPressed.current) {
      prevMouseButtonState.current = false;
    }
    
    const player = playerRef.current;
    
    // Check if player is grounded (at or near ground level)
    const currentY = player.position.y;
    isGrounded.current = currentY <= GROUND_Y + 0.01; // Small threshold for floating point precision
    
    // Reset double jump when grounded
    if (isGrounded.current) {
      hasDoubleJumped.current = false;
    }
    
    // Handle jump input (check on key press, not hold)
    const spaceJustPressed = keys.current.space && !prevSpaceState.current;
    
    // Handle touch jump input
    const touchJumpJustPressed = touchJumpPressed && !prevTouchJumpRef.current;
    prevTouchJumpRef.current = touchJumpPressed;
    
    // Combine keyboard and touch jump
    const jumpInputDetected = spaceJustPressed || touchJumpJustPressed;
    
    if (jumpInputDetected) {
      if (isGrounded.current) {
        // Normal jump from ground
        verticalVelocity.current = JUMP_VELOCITY;
        isGrounded.current = false;
        hasDoubleJumped.current = false;
        prevSpaceState.current = true; // Mark as processed
      } else if (!hasDoubleJumped.current) {
        // Double jump in air
        verticalVelocity.current = DOUBLE_JUMP_VELOCITY;
        hasDoubleJumped.current = true;
        prevSpaceState.current = true; // Mark as processed
      } else {
        // Already used double jump - blocked
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
    
    // Detect landing: transition from airborne to grounded
    const wasGrounded = wasGroundedRef.current;
    if (!wasGrounded && isGrounded.current) {
      AudioManager.playSFX('JumpLanding');
    }
    wasGroundedRef.current = isGrounded.current;
    
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
    // Combine keyboard and touch inputs
    const moveForward = keys.current.w || touchMoveInput.forward;
    const moveBackward = keys.current.s || touchMoveInput.backward;
    const moveLeft = keys.current.a || touchMoveInput.left;
    const moveRight = keys.current.d || touchMoveInput.right;
    
    if (moveForward) {
      // Forward (in camera's forward direction)
      direction.current.add(cameraForward);
    }
    if (moveBackward) {
      // Backward (opposite of camera's forward direction)
      direction.current.sub(cameraForward);
    }
    if (moveLeft) {
      // Left (opposite of camera's right direction)
      direction.current.sub(cameraRight);
    }
    if (moveRight) {
      // Right (in camera's right direction)
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
    
    // Update sprint state tracking
    if (isMoving) {
      if (isSprinting !== prevSprintState.current) {
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
    
    // Clamp player to a circular arena to avoid getting too close to HDR walls
    const pos = player.position;
    const maxRadius = 60; // Allow access to all gameplay elements (exit portal at x=55)
    const radialDistance = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
    if (radialDistance > maxRadius) {
      const scale = maxRadius / radialDistance;
      pos.x *= scale;
      pos.z *= scale;
    }
    
    // Looping footsteps sound - start/stop based on movement state and sprinting
    const isCurrentlyMoving = isMoving && isGrounded.current;
    const isCurrentlySprinting = isSprinting && isCurrentlyMoving;
    
    // Footstep audio state machine - only one footstep loop plays at a time
    if (isCurrentlySprinting) {
      // Sprinting - stop walking footsteps, start running footsteps
      if (isFootstepsPlayingRef.current) {
        const sneakingAudio = sneakingFootstepsAudioRef.current;
        if (sneakingAudio) {
          try {
            sneakingAudio.pause();
            sneakingAudio.currentTime = 0;
            isFootstepsPlayingRef.current = false;
          } catch (err) {
            console.warn('Player: Error stopping sneaking footsteps:', err);
          }
        }
      }
      
      if (!isQuickFootstepsPlayingRef.current) {
        const quickAudio = quickFootstepsAudioRef.current;
        if (quickAudio) {
          try {
            quickAudio.currentTime = 0;
            quickAudio.volume = audioMuted ? 0 : audioVolume * QUICK_FOOTSTEPS_VOLUME;
            quickAudio.play().catch((err) => {
              console.warn('Player: Failed to play quick footsteps:', err);
            });
            isQuickFootstepsPlayingRef.current = true;
          } catch (err) {
            console.warn('Player: Error starting quick footsteps:', err);
          }
        }
      }
    } else if (isCurrentlyMoving) {
      // Walking (moving but not sprinting) - stop running footsteps, start walking footsteps
      if (isQuickFootstepsPlayingRef.current) {
        const quickAudio = quickFootstepsAudioRef.current;
        if (quickAudio) {
          try {
            quickAudio.pause();
            quickAudio.currentTime = 0;
            isQuickFootstepsPlayingRef.current = false;
          } catch (err) {
            console.warn('Player: Error stopping quick footsteps:', err);
          }
        }
      }
      
      if (!isFootstepsPlayingRef.current) {
        const sneakingAudio = sneakingFootstepsAudioRef.current;
        if (sneakingAudio) {
          try {
            sneakingAudio.currentTime = 0;
            sneakingAudio.volume = audioMuted ? 0 : audioVolume * SNEAKING_FOOTSTEPS_VOLUME;
            sneakingAudio.play().catch((err) => {
              console.warn('Player: Failed to play sneaking footsteps:', err);
            });
            isFootstepsPlayingRef.current = true;
          } catch (err) {
            console.warn('Player: Error starting sneaking footsteps:', err);
          }
        }
      }
    } else {
      // Idle - stop both footstep types
      if (isFootstepsPlayingRef.current) {
        const sneakingAudio = sneakingFootstepsAudioRef.current;
        if (sneakingAudio) {
          try {
            sneakingAudio.pause();
            sneakingAudio.currentTime = 0;
            isFootstepsPlayingRef.current = false;
          } catch (err) {
            console.warn('Player: Error stopping sneaking footsteps:', err);
          }
        }
      }
      
      if (isQuickFootstepsPlayingRef.current) {
        const quickAudio = quickFootstepsAudioRef.current;
        if (quickAudio) {
          try {
            quickAudio.pause();
            quickAudio.currentTime = 0;
            isQuickFootstepsPlayingRef.current = false;
          } catch (err) {
            console.warn('Player: Error stopping quick footsteps:', err);
          }
        }
      }
    }
    
    // Update volume if footsteps are playing
    if (isFootstepsPlayingRef.current && sneakingFootstepsAudioRef.current) {
      sneakingFootstepsAudioRef.current.volume = audioMuted ? 0 : audioVolume * SNEAKING_FOOTSTEPS_VOLUME;
    }
    if (isQuickFootstepsPlayingRef.current && quickFootstepsAudioRef.current) {
      quickFootstepsAudioRef.current.volume = audioMuted ? 0 : audioVolume * QUICK_FOOTSTEPS_VOLUME;
    }
    
    // Update previous movement state
    prevIsMovingRef.current = isCurrentlyMoving;
    prevIsSprintingRef.current = isCurrentlySprinting;
    
    // Write player world position to state
    if (playerRef.current) {
      const worldPos = new THREE.Vector3();
      playerRef.current.getWorldPosition(worldPos);
      setPlayerPosition({
        x: worldPos.x,
        y: worldPos.y,
        z: worldPos.z,
      });
    }
    
    // Rotate player to face movement direction
    // Keep player upright (no roll or pitch)
    player.rotation.x = 0;
    player.rotation.z = 0;
    
    if (velocity.current.length() > 0.1) {
      const targetRotation = Math.atan2(velocity.current.x, velocity.current.z);
      const currentRotation = player.rotation.y;
      
      let rotationDiff = targetRotation - currentRotation;
      // Normalize to [-PI, PI]
      if (rotationDiff > Math.PI) rotationDiff -= 2 * Math.PI;
      if (rotationDiff < -Math.PI) rotationDiff += 2 * Math.PI;
      
      // Smoothly interpolate to target rotation
      player.rotation.y = currentRotation + rotationDiff * ROTATION_SPEED * delta;
    }
    
    // Update camera rotation from mouse input
    if (document.pointerLockElement !== null) {
      cameraRotation.current.horizontal -= mouseDelta.current.x;
      cameraRotation.current.vertical -= mouseDelta.current.y;
      cameraRotation.current.vertical = Math.max(-VERTICAL_LIMIT, Math.min(VERTICAL_LIMIT, cameraRotation.current.vertical));
      mouseDelta.current.x = 0;
      mouseDelta.current.y = 0;
    }
    
    // Update camera rotation from touch input (when in touch mode)
    if (touchMode && (touchCameraDelta.x !== 0 || touchCameraDelta.y !== 0)) {
      cameraRotation.current.horizontal -= touchCameraDelta.x;
      cameraRotation.current.vertical -= touchCameraDelta.y;
      cameraRotation.current.vertical = Math.max(-VERTICAL_LIMIT, Math.min(VERTICAL_LIMIT, cameraRotation.current.vertical));
      resetTouchCameraDelta();
    }
    
    // Update camera rotation from arrow keys
    // Horizontal rotation (Left/Right arrows)
    if (keys.current.arrowLeft) {
      cameraRotation.current.horizontal -= HORIZONTAL_ARROW_SPEED * delta;
      prevArrowLeftState.current = true;
    } else {
      prevArrowLeftState.current = false;
    }
    
    if (keys.current.arrowRight) {
      cameraRotation.current.horizontal += HORIZONTAL_ARROW_SPEED * delta;
      prevArrowRightState.current = true;
    } else {
      prevArrowRightState.current = false;
    }
    
    // Vertical rotation (Up/Down arrows)
    if (keys.current.arrowUp) {
      cameraRotation.current.vertical += VERTICAL_ARROW_SPEED * delta;
      cameraRotation.current.vertical = Math.max(-VERTICAL_LIMIT, Math.min(VERTICAL_LIMIT, cameraRotation.current.vertical));
      prevArrowUpState.current = true;
    } else {
      prevArrowUpState.current = false;
    }
    
    if (keys.current.arrowDown) {
      cameraRotation.current.vertical -= VERTICAL_ARROW_SPEED * delta;
      cameraRotation.current.vertical = Math.max(-VERTICAL_LIMIT, Math.min(VERTICAL_LIMIT, cameraRotation.current.vertical));
      prevArrowDownState.current = true;
    } else {
      prevArrowDownState.current = false;
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
    
    // Apply camera shake offset (on player hit)
    if (cameraShakeActiveRef.current) {
      const shakeT = cameraShakeTimeRef.current / CAMERA_SHAKE_DURATION;
      const decay = 1 - shakeT; // Linear decay
      const shakeX = (Math.random() - 0.5) * 2 * CAMERA_SHAKE_INTENSITY * decay;
      const shakeY = (Math.random() - 0.5) * 2 * CAMERA_SHAKE_INTENSITY * decay;
      camera.position.x += shakeX;
      camera.position.y += shakeY;
    }
    
    // Apply recoil offset (on baton swing)
    if (recoilActiveRef.current) {
      const recoilT = recoilTimeRef.current / RECOIL_DURATION;
      const recoilDecay = 1 - recoilT; // Linear decay
      // Small pitch bump (rotate camera slightly up then back)
      const recoilPitch = Math.sin(recoilT * Math.PI) * RECOIL_INTENSITY * recoilDecay;
      camera.rotation.x -= recoilPitch;
    }
    
    // ============================================================
    // BATON ANIMATION BLOCK:
    // This is where useFrame reads batonIsSwingingRef and rotates batonRef
    // ============================================================
    
    // Baton swing animation (visible, simple, timer-based)
    const SWING_DURATION = 0.25; // seconds
    const SWING_ARC = Math.PI / 1.2; // big arc so it's clearly visible

    const baton = batonRef.current;
    if (!baton) {
      // Baton ref not attached - this should never happen if JSX is correct
      return;
    }

    // Continuous target tracking for HUD (find nearest enemy within combat range)
    const { setCurrentTargetEnemy } = useGameState.getState();
    const playerPos = playerRef.current.position.clone();
    const COMBAT_RANGE = 5; // Range for showing enemy health in HUD (larger than melee range)
    const allEnemies = getAllEnemies();
    
    if (allEnemies.length > 0) {
      // Find nearest enemy within combat range
      let nearestEnemy = null;
      let nearestDistance = COMBAT_RANGE;
      
      for (const enemy of allEnemies) {
        const enemyPos = enemy.getPosition();
        const distance = playerPos.distanceTo(enemyPos);
        
        if (distance <= COMBAT_RANGE && distance < nearestDistance) {
          nearestEnemy = enemy;
          nearestDistance = distance;
        }
      }
      
      // Update target for HUD
      if (nearestEnemy && nearestEnemy.getHealth && nearestEnemy.getMaxHealth && nearestEnemy.getEnemyName) {
        const health = nearestEnemy.getHealth();
        const maxHealth = nearestEnemy.getMaxHealth();
        const enemyName = nearestEnemy.getEnemyName();
        setCurrentTargetEnemy(nearestEnemy.id, enemyName, health, maxHealth);
      } else if (!nearestEnemy) {
        // No enemies in range, clear target
        setCurrentTargetEnemy(null, null, null, null);
      }
    } else {
      // No enemies at all, clear target
      setCurrentTargetEnemy(null, null, null, null);
    }
    
    // Melee hit detection during swing window
    // Check for hits during the active swing period (not just at the start)
    if (batonIsSwingingRef.current && !hasHitThisSwing.current) {
      // Find enemies in range during swing (already sorted nearest-first)
      const enemiesInRange = getEnemiesInRange(playerPos, BATON_RANGE);
      
      // Find the first valid, alive enemy (list is already nearest-first)
      let target: EnemyInstance | null = null;
      for (const enemy of enemiesInRange) {
        if (!enemy.isDead()) {
          target = enemy;
          break;
        }
      }
      
      if (!target) {
        // No valid enemy to hit; do not consume the swing
        return;
      }
      
      const enemyPos = target.getPosition();
      
      // Get enemy info before applying damage
      const enemyName = target.getEnemyName ? target.getEnemyName() : 
                       (target.id.includes('crawler') ? 'Crawler' : 
                        target.id.includes('shambler') ? 'Shambler' : 'Enemy');
      const maxHealth = target.getMaxHealth ? target.getMaxHealth() : 100;
      
      // Apply damage
      target.takeDamage(BATON_DAMAGE);
      hasHitThisSwing.current = true; // Consume the swing only after successful hit
      
      // Verify enemy is still alive after damage (might have died)
      const isStillAlive = !target.isDead();
      
      if (isStillAlive) {
        // Spawn impact spark at enemy position
        const sparkId = sparkIdCounter.current++;
        const sparkPos: [number, number, number] = [enemyPos.x, enemyPos.y + 1, enemyPos.z];
        setActiveSparks(prev => [...prev, { id: sparkId, position: sparkPos }]);
        
        // Play impact audio
        const sfx = batonSfxRef.current;
        sfx?.playImpact();
        
        // Update target enemy for HUD (get health after damage)
        const currentHealth = target.getHealth ? target.getHealth() : (maxHealth - BATON_DAMAGE);
        setCurrentTargetEnemy(target.id, enemyName, currentHealth, maxHealth);
      }
    }

    if (batonIsSwingingRef.current) {
      batonSwingTimeRef.current += delta;
      const t = Math.min(batonSwingTimeRef.current / SWING_DURATION, 1);

      // Ease-out curve: fast at the start, slows at the end
      const eased = 1 - (1 - t) * (1 - t);

      // Rotate from -SWING_ARC/2 to +SWING_ARC/2 around z, offset by idle rotation
      const angle = -SWING_ARC / 2 + eased * SWING_ARC;
      const idleZ = -0.3; // keep the same idle angle you used before

      // Apply swing rotation on Z axis
      baton.rotation.z = idleZ + angle;

      if (t >= 1) {
        // End of swing: reset and stop
        batonIsSwingingRef.current = false;
        batonSwingTimeRef.current = 0;
        hasHitThisSwing.current = false; // Reset hit flag for next swing
        baton.rotation.z = idleZ;
      }
    } else {
      // Not swinging: ensure baton is in idle pose
      const idleZ = -0.3;
      baton.rotation.z = idleZ;
    }
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
  
  // Initialize looping footsteps audio elements
  useEffect(() => {
    try {
      const sneakingAudio = new Audio('/audio/Sneaking-Footsteps.ogg');
      sneakingAudio.loop = true;
      sneakingAudio.volume = 0;
      sneakingAudio.preload = 'auto';
      
      sneakingAudio.addEventListener('error', () => {
        console.warn('Player: Failed to load Sneaking-Footsteps.ogg');
      });
      
      sneakingFootstepsAudioRef.current = sneakingAudio;
      
      const quickAudio = new Audio('/audio/Quick-Footsteps.ogg');
      quickAudio.loop = true;
      quickAudio.volume = 0;
      quickAudio.preload = 'auto';
      
      quickAudio.addEventListener('error', () => {
        console.warn('Player: Failed to load Quick-Footsteps.ogg');
      });
      
      quickFootstepsAudioRef.current = quickAudio;
      
      return () => {
        // Cleanup on unmount
        if (sneakingAudio) {
          sneakingAudio.pause();
          sneakingAudio.src = '';
        }
        if (quickAudio) {
          quickAudio.pause();
          quickAudio.src = '';
        }
        sneakingFootstepsAudioRef.current = null;
        quickFootstepsAudioRef.current = null;
        isFootstepsPlayingRef.current = false;
        isQuickFootstepsPlayingRef.current = false;
      };
    } catch (err) {
      console.warn('Player: Error creating footsteps audio:', err);
    }
  }, []);
  
  return (
    <>
      <group ref={playerRef} position={initialPosition} rotation={[0, Math.PI, 0]}>
        {/* Keep the capsule collider for physics, but make it invisible */}
        <mesh position={[0, 1, 0]} visible={false}>
          <capsuleGeometry args={[0.4, 1.2, 4, 8]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
        
        {/* New visual player model */}
        <ZeekoModel
          scale={0.8}
          position={[0, 0, 0]}
          rotation={[0, 0, 0]}
        />
        
        {/* Shock Baton - wrapped in group for animation */}
        <BatonSFX ref={batonSfxRef}>
          <group ref={batonRef} position={[0.3, 0.85, 0.35]} rotation={[0, 0, -0.3]}>
            {/* Baton blade - simple narrow box */}
            <mesh position={[0, 0.1, 0]} castShadow>
              <boxGeometry args={[0.08, 0.5, 0.08]} />
              <meshStandardMaterial 
                color="#4a4a4a" 
                emissive="#00ffff" 
                emissiveIntensity={0.6}
                metalness={0.8}
                roughness={0.2}
              />
            </mesh>
            {/* Baton handle/grip */}
            <mesh position={[0, -0.1, 0]} castShadow>
              <boxGeometry args={[0.1, 0.2, 0.1]} />
              <meshStandardMaterial 
                color="#2a2a2a" 
                metalness={0.3}
                roughness={0.7}
              />
            </mesh>
          </group>
        </BatonSFX>
      </group>
      
      {/* Impact sparks rendered at world positions */}
      {activeSparks.map(spark => (
        <BatonImpactSpark
          key={spark.id}
          position={spark.position}
          onComplete={() => removeSpark(spark.id)}
        />
      ))}
    </>
  );
}

