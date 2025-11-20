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
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useGameState, getTerminalState } from '../../state/gameState';
import { AudioManager } from '../audio/AudioManager';
import * as THREE from 'three';
import directivesData from '../../assets/data/directives.json';

interface HackingTerminalProps {
  id: string;
  position: [number, number, number];
}

interface DirectiveData {
  title: string;
  options: string[];
  successMessage: string;
}

export function HackingTerminal({ id, position }: HackingTerminalProps) {
  const terminalRef = useRef<THREE.Group>(null);
  const { scene } = useThree();
  const [isInRange, setIsInRange] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [showAlreadyHacked, setShowAlreadyHacked] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  
  const terminalState = useGameState((state) => getTerminalState(state, id));
  const setTerminalState = useGameState((state) => state.setTerminalState);
  const setDoorState = useGameState((state) => state.setDoorState);
  const setPaused = useGameState((state) => state.setPaused);
  const sentinelDefeated = useGameState((state) => state.sentinelDefeated);
  const setIsShuttingDown = useGameState((state) => state.setIsShuttingDown);
  const playHostLine = useGameState((state) => state.playHostLine);
  const showInteractionPrompt = useGameState((state) => state.showInteractionPrompt);
  const clearInteractionPrompt = useGameState((state) => state.clearInteractionPrompt);
  const [showLockedMessage, setShowLockedMessage] = useState(false);
  
  const INTERACTION_RANGE = 2.5;
  
  // Get directive data for this terminal with defensive checks
  let directive: DirectiveData | undefined;
  try {
    // Safely access directivesData - handle case where import might fail or be undefined
    if (!directivesData || typeof directivesData !== 'object') {
      console.warn(`HackingTerminal ${id}: directivesData is invalid or missing`);
    } else {
      const directives = directivesData as Record<string, any>;
      if (directives && typeof directives === 'object' && id && directives[id]) {
        directive = directives[id] as DirectiveData;
      }
    }
  } catch (error) {
    console.warn(`HackingTerminal ${id}: Error loading directive data:`, error);
  }
  
  // Safe fallbacks for all directive fields
  const title = (directive && typeof directive === 'object' && typeof directive.title === 'string')
    ? directive.title
    : 'DIRECTIVE INTERFACE';
  
  const options = (directive && 
                   typeof directive === 'object' && 
                   Array.isArray(directive.options) && 
                   directive.options.length > 0)
    ? directive.options
    : ['Disable', 'Override', 'Convert'];
  
  const successMessage = (directive && 
                          typeof directive === 'object' && 
                          typeof directive.successMessage === 'string')
    ? directive.successMessage
    : 'DIRECTIVE ACCEPTED.';
  
  // Log warning if directive is missing (for debugging)
  if (!directive) {
    console.warn(`HackingTerminal ${id}: No directive data found, using fallback values`);
  }
  
  // Check if this is the final terminal and if Sentinel must be defeated
  const isFinalTerminal = id === 'terminal-zone4-final';
  const isLockedBySentinel = isFinalTerminal && !sentinelDefeated && terminalState === 'locked';
  
  // Check if player is in range
  useFrame(() => {
    if (!terminalRef.current) return;
    
    let playerPosition: THREE.Vector3 | null = null;
    
    scene.traverse((object) => {
      if (object instanceof THREE.Group) {
        let hasCapsule = false;
        object.traverse((child) => {
          if (child instanceof THREE.Mesh && child.geometry instanceof THREE.CapsuleGeometry) {
            hasCapsule = true;
          }
        });
        if (hasCapsule) {
          playerPosition = object.position.clone() as THREE.Vector3;
        }
      }
    });
    
    if (!playerPosition) {
      setIsInRange(false);
      return;
    }
    
    // TypeScript needs explicit type assertion here
    const playerPos = playerPosition as THREE.Vector3;
    const terminalPos = new THREE.Vector3(...position);
    const distance = playerPos.distanceTo(terminalPos);
    const wasInRange = isInRange;
    const nowInRange = distance <= INTERACTION_RANGE;
    setIsInRange(nowInRange);
    
    // Update interaction prompt based on range and state
    if (nowInRange && !wasInRange) {
      // Just entered range
      if (terminalState === 'locked') {
        if (isLockedBySentinel) {
          // Don't show prompt if locked by Sentinel
          clearInteractionPrompt(id);
        } else {
          showInteractionPrompt({
            message: 'Hack terminal',
            actionKey: 'E',
            sourceId: id,
          });
        }
      } else {
        // Already hacked - no prompt
        clearInteractionPrompt(id);
      }
    } else if (!nowInRange && wasInRange) {
      // Just left range
      clearInteractionPrompt(id);
    } else if (nowInRange && terminalState === 'hacked') {
      // In range but already hacked - clear prompt
      clearInteractionPrompt(id);
    }
  });
  
  // Handle E key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'e' && isInRange && !showOverlay) {
        try {
          if (terminalState === 'locked') {
            // Check if final terminal is locked by Sentinel
            if (isLockedBySentinel) {
              setShowLockedMessage(true);
              setTimeout(() => setShowLockedMessage(false), 2000);
              return;
            }
            
            // Safely open overlay with defensive checks
            try {
              setShowOverlay(true);
              setPaused(true);
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
              // Reset state on error to prevent stuck overlay
              setShowOverlay(false);
              setPaused(false);
            }
          } else if (terminalState === 'hacked') {
            setShowAlreadyHacked(true);
            setTimeout(() => setShowAlreadyHacked(false), 1000);
          }
        } catch (error) {
          console.error(`HackingTerminal ${id}: Error in key handler:`, error);
          // Ensure game state is valid even on error
          setShowOverlay(false);
          setPaused(false);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isInRange, terminalState, showOverlay, isLockedBySentinel, id, clearInteractionPrompt, sentinelDefeated, playHostLine, setPaused]);
  
  // Handle overlay button clicks
  const handleDirectiveSelect = (_optionIndex: number) => {
    try {
      // For now, any button click counts as success
      setTerminalState(id, 'hacked');
      
      // Zone 2 terminal opens door, Zone 4 terminal triggers shutdown
      if (id === 'terminal-zone2-main') {
        setDoorState('zone1-zone2-main', 'open');
        try {
          playHostLine('hacking:success');
        } catch (error) {
          console.warn(`HackingTerminal ${id}: Error playing success host line:`, error);
        }
        try {
          AudioManager.playSFX('hackingSuccess');
        } catch (error) {
          console.warn(`HackingTerminal ${id}: Error playing success SFX:`, error);
        }
      } else if (id === 'terminal-zone4-final') {
        try {
          playHostLine('hacking:finalSuccess');
          playHostLine('shutdown:start');
        } catch (error) {
          console.warn(`HackingTerminal ${id}: Error playing final host lines:`, error);
        }
        setIsShuttingDown(true);
        try {
          AudioManager.playSFX('hackingSuccess');
          AudioManager.playSFX('shutdownStart');
        } catch (error) {
          console.warn(`HackingTerminal ${id}: Error playing final SFX:`, error);
        }
      } else {
        try {
          playHostLine('hacking:success');
          AudioManager.playSFX('hackingSuccess');
        } catch (error) {
          console.warn(`HackingTerminal ${id}: Error playing success feedback:`, error);
        }
      }
      
      // Always close overlay and resume game, even if other operations fail
      setShowOverlay(false);
      setPaused(false);
      setShowSuccessMessage(true);
      // Hide success message after 2 seconds
      setTimeout(() => setShowSuccessMessage(false), 2000);
    } catch (error) {
      console.error(`HackingTerminal ${id}: Error in handleDirectiveSelect:`, error);
      // Ensure overlay closes and game resumes even on error
      setShowOverlay(false);
      setPaused(false);
    }
  };
  
  // Handle overlay close (ESC key)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showOverlay) {
        try {
          setShowOverlay(false);
          setPaused(false);
          // Re-request pointer lock if game is not paused
          // (This will be handled by Player component when controls resume)
        } catch (error) {
          console.error(`HackingTerminal ${id}: Error closing overlay:`, error);
          // Force close on error
          setShowOverlay(false);
          setPaused(false);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showOverlay, setPaused, id]);
  
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
      
      {/* UI Overlay for hacking mini-game - wrapped in Html for R3F compatibility */}
      {showOverlay && (
        <Html fullscreen>
          <div
            className="hacking-overlay-root"
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              color: '#00ff00',
              fontFamily: 'monospace',
              fontSize: '24px',
            }}
          >
            <div
              style={{
                maxWidth: '640px',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
              }}
            >
              <div style={{ marginBottom: '40px', fontSize: '32px', fontWeight: 'bold' }}>
                {typeof title === 'string' ? title : 'DIRECTIVE INTERFACE'}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: '400px', width: '100%' }}>
                {Array.isArray(options) && options.length > 0 ? (
                  options.map((option, index) => {
                    // Ensure option is a valid string
                    const optionText = (typeof option === 'string' && option.trim()) 
                      ? option.trim() 
                      : `Option ${index + 1}`;
                    
                    return (
                      <button
                        key={index}
                        onClick={() => handleDirectiveSelect(index)}
                        style={{
                          padding: '15px 30px',
                          backgroundColor: '#001100',
                          color: '#00ff00',
                          border: '2px solid #00ff00',
                          fontFamily: 'monospace',
                          fontSize: '18px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#003300';
                          e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#001100';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        {optionText}
                      </button>
                    );
                  })
                ) : (
                  // Fallback if options array is invalid
                  <div style={{ color: '#ffaa00', fontSize: '16px', textAlign: 'center' }}>
                    No directive options available. Using fallback.
                  </div>
                )}
              </div>
              
              <div style={{ marginTop: '40px', fontSize: '14px', opacity: 0.7 }}>
                Press ESC to cancel
              </div>
            </div>
          </div>
        </Html>
      )}
      
      
      {/* "ACCESS LOCKED – THREAT ACTIVE" message - wrapped in Html for R3F compatibility */}
      {showLockedMessage && (
        <Html fullscreen>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1001,
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                color: '#ff0000',
                padding: '15px 30px',
                borderRadius: '5px',
                fontFamily: 'monospace',
                fontSize: '20px',
                border: '2px solid #ff0000',
              }}
            >
              ACCESS LOCKED – THREAT ACTIVE
            </div>
          </div>
        </Html>
      )}
      
      {/* "Terminal already hacked" message - wrapped in Html for R3F compatibility */}
      {showAlreadyHacked && (
        <Html fullscreen>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1001,
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                color: '#00ff00',
                padding: '10px 20px',
                borderRadius: '5px',
                fontFamily: 'monospace',
                fontSize: '18px',
              }}
            >
              Terminal already hacked
            </div>
          </div>
        </Html>
      )}
      
      {/* Success message overlay (brief) - wrapped in Html for R3F compatibility */}
      {showSuccessMessage && (
        <Html fullscreen>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1001,
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                color: '#00ff00',
                padding: '20px 40px',
                borderRadius: '5px',
                fontFamily: 'monospace',
                fontSize: '20px',
                animation: 'fadeOut 2s ease-out forwards',
              }}
            >
              {typeof successMessage === 'string' ? successMessage : 'DIRECTIVE ACCEPTED.'}
              <style>{`
                @keyframes fadeOut {
                  0% { opacity: 1; }
                  70% { opacity: 1; }
                  100% { opacity: 0; }
                }
              `}</style>
            </div>
          </div>
        </Html>
      )}
    </>
  );
}

