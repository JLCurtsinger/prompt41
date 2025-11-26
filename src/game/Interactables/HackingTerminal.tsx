// TEST PLAN (HackingTerminal)
// 1. Range Detection:
//    - Walk towards terminal from various angles
//    - When within 2.5 units, "Press E to hack" prompt should appear
//    - When outside range, prompt should disappear
// 2. Interaction Flow:
//    - Press E when in range and terminal is locked -> overlay should open
//    - Player movement should be paused while overlay is open
//    - Click any of the three buttons -> overlay should close, terminal state should be 'hacked', door should open
//    - Player movement should resume after overlay closes
// 3. Already Hacked State:
//    - After terminal is hacked, pressing E should show "Terminal already hacked" or do nothing
//    - Terminal screen should visually indicate hacked state (optional)

import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameState, getTerminalState } from '../../state/gameState';
import { AudioManager } from '../audio/AudioManager';
import * as THREE from 'three';

interface HackingTerminalProps {
  id: string;
  position: [number, number, number];
  disabledUntilSentinelDefeated?: boolean;
}


export function HackingTerminal({ id, position, disabledUntilSentinelDefeated = false }: HackingTerminalProps) {
  const terminalRef = useRef<THREE.Group>(null);
  const [isInRange, setIsInRange] = useState(false);
  
  const terminalState = useGameState((state) => getTerminalState(state, id));
  const sentinelDefeated = useGameState((state) => state.sentinelDefeated);
  const playHostLine = useGameState((state) => state.playHostLine);
  const showInteractionPrompt = useGameState((state) => state.showInteractionPrompt);
  const clearInteractionPrompt = useGameState((state) => state.clearInteractionPrompt);
  const openHackingOverlay = useGameState((state) => state.openHackingOverlay);
  const closeHackingOverlay = useGameState((state) => state.closeHackingOverlay);
  const hackingOverlay = useGameState((state) => state.hackingOverlay);
  // Use playerPosition from gameState (set by Player.tsx using getWorldPosition)
  const playerPosition = useGameState((state) => state.playerPosition);
  
  const INTERACTION_RANGE = 2.5;
  
  // Check if this terminal is locked by Sentinel
  const isLockedBySentinel = disabledUntilSentinelDefeated && !sentinelDefeated && terminalState === 'locked';
  
  // Track previous in-range state with a ref to avoid stale closure issues
  const wasInRangeRef = useRef(false);
  
  // Check if player is in range
  useFrame(() => {
    if (!terminalRef.current) return;
    
    // Get player world position from gameState (set by Player.tsx using getWorldPosition)
    const playerPos = new THREE.Vector3(playerPosition.x, playerPosition.y, playerPosition.z);
    
    // Get terminal world position
    const terminalWorldPos = new THREE.Vector3();
    terminalRef.current.getWorldPosition(terminalWorldPos);
    
    const distance = playerPos.distanceTo(terminalWorldPos);
    const wasInRange = wasInRangeRef.current;
    const nowInRange = distance <= INTERACTION_RANGE;
    
    // Update interaction prompt based on range and state
    if (nowInRange && !wasInRange) {
      // Just entered range
      console.log(`[HackingTerminal ${id}] Player entered range (distance: ${distance.toFixed(2)})`);
      if (terminalState === 'locked') {
        if (isLockedBySentinel) {
          // Don't show prompt if locked by Sentinel
          console.log(`[HackingTerminal ${id}] Locked by Sentinel - no prompt`);
          clearInteractionPrompt(id);
        } else {
          console.log(`[HackingTerminal ${id}] Showing interaction prompt`);
          showInteractionPrompt({
            message: 'Hack terminal',
            actionKey: 'E',
            sourceId: id,
          });
        }
      } else {
        // Already hacked - no prompt
        console.log(`[HackingTerminal ${id}] Already hacked - no prompt`);
        clearInteractionPrompt(id);
      }
    } else if (!nowInRange && wasInRange) {
      // Just left range
      console.log(`[HackingTerminal ${id}] Player left range`);
      clearInteractionPrompt(id);
    } else if (nowInRange && terminalState === 'hacked') {
      // In range but already hacked - clear prompt
      clearInteractionPrompt(id);
    }
    
    // Update refs and state
    wasInRangeRef.current = nowInRange;
    setIsInRange(nowInRange);
  });
  
  // Handle E key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Log all E key presses for debugging
      if (e.key.toLowerCase() === 'e') {
        console.log(`[HackingTerminal ${id}] E key pressed - isInRange: ${isInRange}, hackingOverlay.isOpen: ${hackingOverlay.isOpen}, terminalState: ${terminalState}`);
      }
      
      if (e.key.toLowerCase() === 'e' && isInRange && !hackingOverlay.isOpen) {
        try {
          if (terminalState === 'locked') {
            // Check if terminal is locked by Sentinel
            if (isLockedBySentinel) {
              console.log(`[HackingTerminal ${id}] Terminal locked by Sentinel - cannot hack`);
              return;
            }
            
            // Open normal hacking overlay
            try {
              console.log(`[HackingTerminal ${id}] Opening hacking overlay...`);
              openHackingOverlay(id, 'normal');
              clearInteractionPrompt(id); // Clear prompt when overlay opens
              
              // Safely call playHostLine
              try {
                playHostLine('hacking:start');
              } catch (error) {
                console.warn(`HackingTerminal ${id}: Error playing host line:`, error);
              }
              
              // Safely play SFX
              try {
                AudioManager.playSFX('hackingStart');
              } catch (error) {
                console.warn(`HackingTerminal ${id}: Error playing SFX:`, error);
              }
              
              // Exit pointer lock if active
              try {
                if (document.pointerLockElement) {
                  document.exitPointerLock();
                }
              } catch (error) {
                console.warn(`HackingTerminal ${id}: Error exiting pointer lock:`, error);
              }
            } catch (error) {
              console.error(`HackingTerminal ${id}: Error opening overlay:`, error);
            }
          } else if (terminalState === 'hacked') {
            openHackingOverlay(id, 'alreadyHacked');
            // Auto-close already hacked message after 1 second
            setTimeout(() => {
              closeHackingOverlay();
            }, 1000);
          }
        } catch (error) {
          console.error(`HackingTerminal ${id}: Error in key handler:`, error);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isInRange, terminalState, hackingOverlay.isOpen, isLockedBySentinel, id, clearInteractionPrompt, sentinelDefeated, playHostLine, openHackingOverlay, closeHackingOverlay]);
  
  
  const isHacked = terminalState === 'hacked';
  
  return (
    <>
      <group ref={terminalRef} position={position}>
        {/* Terminal base/stand */}
        <mesh position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[0.4, 1, 0.4]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
        
        {/* Terminal screen */}
        <mesh position={[0, 1.2, 0.21]} castShadow>
          <boxGeometry args={[0.6, 0.4, 0.05]} />
          <meshStandardMaterial 
            color={isHacked ? "#00ff00" : "#001100"} 
            emissive={isHacked ? "#00ff00" : "#003300"} 
            emissiveIntensity={isHacked ? 0.8 : 0.3}
          />
        </mesh>
        
        {/* Terminal panel */}
        <mesh position={[0, 1, 0]} castShadow>
          <boxGeometry args={[0.8, 0.6, 0.2]} />
          <meshStandardMaterial 
            color="#2a2a2a" 
            metalness={0.7}
            roughness={0.3}
          />
        </mesh>
      </group>
    </>
  );
}

