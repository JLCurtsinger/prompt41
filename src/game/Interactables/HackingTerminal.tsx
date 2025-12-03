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
import { HackingStationModel } from '../models/HackingStationModel';
import * as THREE from 'three';

type HackingMode = 'timing' | 'code';

interface HackingTerminalProps {
  id: string;
  position: [number, number, number];
  rotation?: [number, number, number]; // Optional rotation for the terminal
  mode?: HackingMode; // Optional, defaults to 'timing'
  terminalMode?: 'sourcecode' | 'door'; // Optional, defaults to 'sourcecode'
  doorId?: string; // Required when terminalMode is 'door'
}


export function HackingTerminal({ id, position, rotation, mode, terminalMode = 'sourcecode', doorId }: HackingTerminalProps) {
  const hackMode: HackingMode = mode ?? 'timing';
  
  // Validate door mode
  if (terminalMode === 'door' && !doorId) {
    console.warn(`HackingTerminal ${id}: doorMode is 'door' but doorId is not provided`);
  }
  const terminalRef = useRef<THREE.Group>(null);
  const [isInRange, setIsInRange] = useState(false);
  
  const terminalState = useGameState((state) => getTerminalState(state, id));
  const playHostLine = useGameState((state) => state.playHostLine);
  const showInteractionPrompt = useGameState((state) => state.showInteractionPrompt);
  const clearInteractionPrompt = useGameState((state) => state.clearInteractionPrompt);
  const openHackingOverlay = useGameState((state) => state.openHackingOverlay);
  const closeHackingOverlay = useGameState((state) => state.closeHackingOverlay);
  const hackingOverlay = useGameState((state) => state.hackingOverlay);
  const canHackTerminal = useGameState((state) => state.canHackTerminal);
  const getTerminalCooldownRemaining = useGameState((state) => state.getTerminalCooldownRemaining);
  // Use playerPosition from gameState (set by Player.tsx using getWorldPosition)
  const playerPosition = useGameState((state) => state.playerPosition);
  
  const INTERACTION_RANGE = 2.5;
  
  // Simplified canHack logic - no Sentinel gating
  // ================================================================
  // CANONICAL canHack RULE:
  // canHack = isPlayerInRange && isTerminalLockState && !isOnCooldown
  // Where:
  //   - isPlayerInRange: distance <= INTERACTION_RANGE (2.5 units)
  //   - isTerminalLockState: terminalState === 'locked'
  //   - isOnCooldown: !canHackTerminal(id) (terminal is in shutdown/reboot state)
  // ================================================================
  
  // Check if terminal is in normal locked state (can be hacked)
  const isTerminalLockState = terminalState === 'locked';
  
  // Track previous in-range state with a ref to avoid stale closure issues
  const wasInRangeRef = useRef(false);
  // Track if we've shown the prompt for this terminal to avoid unnecessary updates
  const promptShownRef = useRef(false);
  
  // Check if player is in range - optimized to reduce per-frame work
  useFrame(() => {
    if (!terminalRef.current) return;
    
    // CRITICAL: If hacking overlay is open for this terminal, skip all prompt management
    // The overlay should only close on minigame completion/cancel, not based on canHack/distance
    const currentOverlay = useGameState.getState().hackingOverlay;
    if (currentOverlay.isOpen && currentOverlay.terminalId === id) {
      // Overlay is open - do NOT manage prompts or check canHack
      // Just update range tracking for when overlay closes
      const playerPos = new THREE.Vector3(playerPosition.x, playerPosition.y, playerPosition.z);
      const terminalWorldPos = new THREE.Vector3();
      terminalRef.current.getWorldPosition(terminalWorldPos);
      const distance = playerPos.distanceTo(terminalWorldPos);
      const nowInRange = distance <= INTERACTION_RANGE;
      wasInRangeRef.current = nowInRange;
      setIsInRange(nowInRange);
      return; // Exit early - don't touch prompts or canHack logic
    }
    
    // Get player world position from gameState (set by Player.tsx using getWorldPosition)
    const playerPos = new THREE.Vector3(playerPosition.x, playerPosition.y, playerPosition.z);
    
    // Get terminal world position
    const terminalWorldPos = new THREE.Vector3();
    terminalRef.current.getWorldPosition(terminalWorldPos);
    
    const distance = playerPos.distanceTo(terminalWorldPos);
    const wasInRange = wasInRangeRef.current;
    const nowInRange = distance <= INTERACTION_RANGE;
    
    // Early exit if player is far away and not in range (skip expensive state lookups)
    if (!nowInRange && !wasInRange && distance > INTERACTION_RANGE * 2) {
      return;
    }
    
    // Calculate canHack using simplified rule (no Sentinel gating)
    const isOnCooldown = !canHackTerminal(id);
    const canHack = nowInRange && isTerminalLockState && !isOnCooldown;
    
    if (nowInRange && !wasInRange) {
      // Just entered range
      if (canHack) {
        showInteractionPrompt({
          message: 'Hack terminal',
          actionKey: 'E',
          sourceId: id,
        });
        promptShownRef.current = true;
      } else if (isOnCooldown) {
        // Show shutdown message if on cooldown
        const remaining = Math.ceil(getTerminalCooldownRemaining(id));
        showInteractionPrompt({
          message: `Shutdown in progress. Reboot in ${remaining}s.`,
          actionKey: undefined,
          sourceId: id,
        });
        promptShownRef.current = true;
      } else {
        // Already hacked - no prompt
        clearInteractionPrompt(id);
        promptShownRef.current = false;
      }
    } else if (!nowInRange && wasInRange) {
      // Just left range
      // NOTE: Do NOT close overlay here - overlay should only close on minigame completion/cancel
      clearInteractionPrompt(id);
      promptShownRef.current = false;
    } else if (nowInRange) {
      // Continuously ensure prompt is shown/hidden based on current state
      // This fixes the issue where prompt might be cleared by another terminal
      // NOTE: Do NOT close overlay here - overlay should only close on minigame completion/cancel
      if (canHack) {
        // Re-show prompt if we should be showing it but it's not currently shown
        // Check current state to see if our prompt is active
        const currentPrompt = useGameState.getState().interactionPrompt;
        if (currentPrompt.sourceId !== id || !currentPrompt.message) {
          showInteractionPrompt({
            message: 'Hack terminal',
            actionKey: 'E',
            sourceId: id,
          });
          promptShownRef.current = true;
        } else {
          promptShownRef.current = true;
        }
      } else if (isOnCooldown) {
        // Update cooldown message with remaining time (throttle updates to once per second)
        const remaining = Math.ceil(getTerminalCooldownRemaining(id));
        const currentPrompt = useGameState.getState().interactionPrompt;
        // Only update if message changed or not shown
        if (currentPrompt.sourceId !== id || !currentPrompt.message || !currentPrompt.message.includes('Shutdown') || 
            !currentPrompt.message.includes(`${remaining}s`)) {
          showInteractionPrompt({
            message: `Shutdown in progress. Reboot in ${remaining}s.`,
            actionKey: undefined,
            sourceId: id,
          });
          promptShownRef.current = true;
        }
      } else {
        // Clear prompt if we're in range but can't hack (already hacked)
        // NOTE: Do NOT close overlay here - overlay should only close on minigame completion/cancel
        clearInteractionPrompt(id);
        promptShownRef.current = false;
      }
    }
    
    // Update refs and state
    wasInRangeRef.current = nowInRange;
    setIsInRange(nowInRange);
  });
  
  // Handle E key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'e' && !hackingOverlay.isOpen) {
        try {
          // Use simplified canHack logic - same rule as in useFrame (no Sentinel gating)
          const isOnCooldown = !canHackTerminal(id);
          const canHack = isInRange && isTerminalLockState && !isOnCooldown;
          
          // Early return if cannot hack
          if (!canHack) {
            // If already hacked, show message
            if (terminalState === 'hacked') {
              openHackingOverlay(id, 'alreadyHacked');
              // Auto-close already hacked message after 1 second
              setTimeout(() => {
                const state = useGameState.getState();
                console.log('[HACK-INTERRUPT] closing overlay from HackingTerminal.tsx:alreadyHacked', {
                  hackMiniGameKind: state.hackingOverlay.hackMiniGameKind,
                  miniGamePhase: state.hackingOverlay.miniGamePhase,
                  miniGameResult: state.hackingOverlay.miniGameResult,
                  isOpen: state.hackingOverlay.isOpen,
                });
                closeHackingOverlay();
              }, 1000);
            }
            return;
          }
            
          // Open hacking overlay with terminal mode
          try {
            // Determine hackMiniGameKind: doors use 'door-bars', SourceCode terminals use 'code-quiz'
            const hackMiniGameKind = terminalMode === 'door' ? 'door-bars' : 'code-quiz';
            openHackingOverlay(id, 'normal', hackMode, terminalMode, doorId, hackMiniGameKind);
            AudioManager.playSFX('ActiveHacking');
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
        } catch (error) {
          console.error(`HackingTerminal ${id}: Error in key handler:`, error);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isInRange, terminalState, hackingOverlay.isOpen, isTerminalLockState, id, clearInteractionPrompt, playHostLine, openHackingOverlay, closeHackingOverlay, canHackTerminal, getTerminalCooldownRemaining, hackMode, terminalMode, doorId]);
  
  
  return (
    <>
      <group ref={terminalRef} position={position} rotation={rotation}>
        {/* Visual fallback base - small pedestal so GLB model visually dominates */}
        <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.4, 0.5, 0.4]} />
          <meshStandardMaterial color="#111111" />
        </mesh>
        {/* GLB model, scaled and positioned to dominate visually */}
        <HackingStationModel
          // Positioned so it sits nicely above the small pedestal
          position={[0, 0.9, 0]}
          scale={1.5}
          rotation={rotation}
        />
      </group>
    </>
  );
}

