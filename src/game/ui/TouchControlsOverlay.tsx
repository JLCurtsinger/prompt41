import { useRef, useCallback } from 'react';
import { useGameState } from '../../state/gameState';
import './TouchControlsOverlay.css';

// Virtual joystick configuration
const JOYSTICK_RADIUS = 50; // pixels
const JOYSTICK_DEADZONE = 15; // pixels
const CAMERA_SENSITIVITY = 0.004;

// Tap detection thresholds
const TAP_MAX_DURATION = 250; // milliseconds
const TAP_MAX_DISTANCE = 20; // pixels

export function TouchControlsOverlay() {
  const touchMode = useGameState((state) => state.touchMode);
  const setTouchMoveInput = useGameState((state) => state.setTouchMoveInput);
  const addTouchCameraDelta = useGameState((state) => state.addTouchCameraDelta);
  const setTouchAttackPressed = useGameState((state) => state.setTouchAttackPressed);
  const setTouchInteractPressed = useGameState((state) => state.setTouchInteractPressed);
  const setTouchJumpPressed = useGameState((state) => state.setTouchJumpPressed);
  
  // Joystick state refs
  const joystickStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const joystickTouchIdRef = useRef<number | null>(null);
  const joystickThumbRef = useRef<HTMLDivElement>(null);
  const joystickMovedRef = useRef(false); // Track if joystick was moved (not just tapped)
  
  // Camera swipe state refs
  const cameraStartRef = useRef<{ x: number; y: number; time: number; initialX: number; initialY: number } | null>(null);
  const cameraTouchIdRef = useRef<number | null>(null);
  const cameraMovedRef = useRef(false); // Track if camera was swiped (not just tapped)
  
  // --- Joystick Handlers ---
  const handleJoystickTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch) return;
    
    joystickTouchIdRef.current = touch.identifier;
    joystickStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    joystickMovedRef.current = false;
    
    // Reset thumb position
    if (joystickThumbRef.current) {
      joystickThumbRef.current.style.transform = 'translate(-50%, -50%)';
    }
  }, []);
  
  const handleJoystickTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (joystickTouchIdRef.current === null || !joystickStartRef.current) return;
    
    // Find the correct touch
    let touch: React.Touch | null = null;
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === joystickTouchIdRef.current) {
        touch = e.touches[i];
        break;
      }
    }
    if (!touch) return;
    
    const dx = touch.clientX - joystickStartRef.current.x;
    const dy = touch.clientY - joystickStartRef.current.y;
    
    // Clamp to radius
    const distance = Math.sqrt(dx * dx + dy * dy);
    const clampedDistance = Math.min(distance, JOYSTICK_RADIUS);
    const angle = Math.atan2(dy, dx);
    const clampedX = Math.cos(angle) * clampedDistance;
    const clampedY = Math.sin(angle) * clampedDistance;
    
    // Mark as moved if distance exceeds tap threshold
    if (distance > TAP_MAX_DISTANCE) {
      joystickMovedRef.current = true;
    }
    
    // Update thumb visual position
    if (joystickThumbRef.current) {
      joystickThumbRef.current.style.transform = `translate(calc(-50% + ${clampedX}px), calc(-50% + ${clampedY}px))`;
    }
    
    // Convert to movement input (with deadzone)
    if (distance > JOYSTICK_DEADZONE) {
      const normalizedX = clampedX / JOYSTICK_RADIUS;
      const normalizedY = clampedY / JOYSTICK_RADIUS;
      
      setTouchMoveInput({
        forward: normalizedY < -0.3,
        backward: normalizedY > 0.3,
        left: normalizedX < -0.3,
        right: normalizedX > 0.3,
      });
    } else {
      // In deadzone - no movement
      setTouchMoveInput({ forward: false, backward: false, left: false, right: false });
    }
  }, [setTouchMoveInput]);
  
  const handleJoystickTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    
    // Check if our touch ended
    let found = false;
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === joystickTouchIdRef.current) {
        found = true;
        break;
      }
    }
    
    if (!found && joystickStartRef.current) {
      const duration = Date.now() - joystickStartRef.current.time;
      
      // Check for tap (short duration, minimal movement)
      if (!joystickMovedRef.current && duration < TAP_MAX_DURATION) {
        // Tap on left side = JUMP
        setTouchJumpPressed(true);
        setTimeout(() => setTouchJumpPressed(false), 100);
      }
      
      // Our touch ended
      joystickTouchIdRef.current = null;
      joystickStartRef.current = null;
      joystickMovedRef.current = false;
      
      // Reset thumb position
      if (joystickThumbRef.current) {
        joystickThumbRef.current.style.transform = 'translate(-50%, -50%)';
      }
      
      // Reset movement
      setTouchMoveInput({ forward: false, backward: false, left: false, right: false });
    }
  }, [setTouchMoveInput, setTouchJumpPressed]);
  
  // --- Camera Swipe Handlers ---
  const handleCameraTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch) return;
    
    cameraTouchIdRef.current = touch.identifier;
    cameraStartRef.current = { 
      x: touch.clientX, 
      y: touch.clientY, 
      time: Date.now(),
      initialX: touch.clientX,
      initialY: touch.clientY
    };
    cameraMovedRef.current = false;
  }, []);
  
  const handleCameraTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (cameraTouchIdRef.current === null || !cameraStartRef.current) return;
    
    // Find the correct touch
    let touch: React.Touch | null = null;
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === cameraTouchIdRef.current) {
        touch = e.touches[i];
        break;
      }
    }
    if (!touch) return;
    
    const dx = touch.clientX - cameraStartRef.current.x;
    const dy = touch.clientY - cameraStartRef.current.y;
    
    // Check total distance from initial position
    const totalDx = touch.clientX - cameraStartRef.current.initialX;
    const totalDy = touch.clientY - cameraStartRef.current.initialY;
    const totalDistance = Math.sqrt(totalDx * totalDx + totalDy * totalDy);
    
    // Mark as moved if total distance exceeds tap threshold
    if (totalDistance > TAP_MAX_DISTANCE) {
      cameraMovedRef.current = true;
    }
    
    // Update camera delta (will be consumed by Player.tsx)
    addTouchCameraDelta(dx * CAMERA_SENSITIVITY, dy * CAMERA_SENSITIVITY);
    
    // Update start position for continuous movement
    cameraStartRef.current.x = touch.clientX;
    cameraStartRef.current.y = touch.clientY;
  }, [addTouchCameraDelta]);
  
  const handleCameraTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    
    // Check if our touch ended
    let found = false;
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === cameraTouchIdRef.current) {
        found = true;
        break;
      }
    }
    
    if (!found && cameraStartRef.current) {
      const duration = Date.now() - cameraStartRef.current.time;
      
      // Check for tap (short duration, minimal movement)
      if (!cameraMovedRef.current && duration < TAP_MAX_DURATION) {
        // Tap on right side = ATTACK
        setTouchAttackPressed(true);
        setTimeout(() => setTouchAttackPressed(false), 100);
      }
      
      cameraTouchIdRef.current = null;
      cameraStartRef.current = null;
      cameraMovedRef.current = false;
    }
  }, [setTouchAttackPressed]);
  
  // --- Attack Button Handler ---
  const handleAttackTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setTouchAttackPressed(true);
    // Auto-release after a short delay (attack is triggered on press)
    setTimeout(() => setTouchAttackPressed(false), 100);
  }, [setTouchAttackPressed]);
  
  // --- Interact Button Handler ---
  const handleInteractTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setTouchInteractPressed(true);
    
    // Dispatch a keyboard event to trigger E key handlers (for hacking terminals, etc.)
    const keydownEvent = new KeyboardEvent('keydown', {
      key: 'e',
      code: 'KeyE',
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(keydownEvent);
    
    // Auto-release after a short delay
    setTimeout(() => {
      setTouchInteractPressed(false);
      // Also dispatch keyup
      const keyupEvent = new KeyboardEvent('keyup', {
        key: 'e',
        code: 'KeyE',
        bubbles: true,
        cancelable: true,
      });
      window.dispatchEvent(keyupEvent);
    }, 100);
  }, [setTouchInteractPressed]);
  
  // Only render in touch mode
  if (!touchMode) return null;
  
  return (
    <div className="touch-controls-overlay">
      {/* Left side: Movement joystick */}
      <div
        className="touch-joystick-area"
        onTouchStart={handleJoystickTouchStart}
        onTouchMove={handleJoystickTouchMove}
        onTouchEnd={handleJoystickTouchEnd}
        onTouchCancel={handleJoystickTouchEnd}
      >
        <div className="touch-joystick-base">
          <div ref={joystickThumbRef} className="touch-joystick-thumb" />
        </div>
      </div>
      
      {/* Right side: Camera look area */}
      <div
        className="touch-look-area"
        onTouchStart={handleCameraTouchStart}
        onTouchMove={handleCameraTouchMove}
        onTouchEnd={handleCameraTouchEnd}
        onTouchCancel={handleCameraTouchEnd}
      />
      
      {/* Attack button (right side, above audio controls) */}
      <button
        className="touch-attack-button"
        onTouchStart={handleAttackTouchStart}
      >
        ⚡ ATTACK
      </button>
      
      {/* Interact button (right side, above attack) */}
      <button
        className="touch-interact-button"
        onTouchStart={handleInteractTouchStart}
      >
        E INTERACT
      </button>
    </div>
  );
}
