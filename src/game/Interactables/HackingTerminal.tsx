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
import { useGameState, getTerminalState } from '../../state/gameState';
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
  const [showLockedMessage, setShowLockedMessage] = useState(false);
  
  const INTERACTION_RANGE = 2.5;
  
  // Get directive data for this terminal
  const directive = (directivesData as Record<string, DirectiveData>)[id];
  const title = directive?.title || 'DIRECTIVE INTERFACE';
  const options = directive?.options || ['Disable', 'Override', 'Convert'];
  const successMessage = directive?.successMessage || 'DIRECTIVE ACCEPTED.';
  
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
    setIsInRange(distance <= INTERACTION_RANGE);
  });
  
  // Check if this is the final terminal and if Sentinel must be defeated
  const isFinalTerminal = id === 'terminal-zone4-final';
  const isLockedBySentinel = isFinalTerminal && !sentinelDefeated && terminalState === 'locked';
  
  // Handle E key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'e' && isInRange && !showOverlay) {
        if (terminalState === 'locked') {
          // Check if final terminal is locked by Sentinel
          if (isLockedBySentinel) {
            setShowLockedMessage(true);
            setTimeout(() => setShowLockedMessage(false), 2000);
            return;
          }
          
          setShowOverlay(true);
          setPaused(true);
          // Exit pointer lock if active
          if (document.pointerLockElement) {
            document.exitPointerLock();
          }
        } else if (terminalState === 'hacked') {
          setShowAlreadyHacked(true);
          setTimeout(() => setShowAlreadyHacked(false), 1000);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isInRange, terminalState, showOverlay, isLockedBySentinel]);
  
  // Handle overlay button clicks
  const handleDirectiveSelect = (_optionIndex: number) => {
    // For now, any button click counts as success
    setTerminalState(id, 'hacked');
    
    // Zone 2 terminal opens door, Zone 4 terminal triggers shutdown
    if (id === 'terminal-zone2-main') {
      setDoorState('zone1-zone2-main', 'open');
    } else if (id === 'terminal-zone4-final') {
      setIsShuttingDown(true);
    }
    
    setShowOverlay(false);
    setPaused(false);
    setShowSuccessMessage(true);
    // Hide success message after 2 seconds
    setTimeout(() => setShowSuccessMessage(false), 2000);
  };
  
  // Handle overlay close (ESC key)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showOverlay) {
        setShowOverlay(false);
        setPaused(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showOverlay, setPaused]);
  
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
      
      {/* UI Overlay for hacking mini-game */}
      {showOverlay && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
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
          <div style={{ marginBottom: '40px', fontSize: '32px', fontWeight: 'bold' }}>
            {title}
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: '400px' }}>
            {options.map((option, index) => (
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
                {option}
              </button>
            ))}
          </div>
          
          <div style={{ marginTop: '40px', fontSize: '14px', opacity: 0.7 }}>
            Press ESC to cancel
          </div>
        </div>
      )}
      
      {/* "Press E to hack" prompt */}
      {isInRange && terminalState === 'locked' && !showOverlay && !isLockedBySentinel && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: '#ffffff',
            padding: '10px 20px',
            borderRadius: '5px',
            fontFamily: 'monospace',
            fontSize: '18px',
            zIndex: 100,
            pointerEvents: 'none',
          }}
        >
          Press E to hack
        </div>
      )}
      
      {/* "ACCESS LOCKED – THREAT ACTIVE" message */}
      {showLockedMessage && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            color: '#ff0000',
            padding: '15px 30px',
            borderRadius: '5px',
            fontFamily: 'monospace',
            fontSize: '20px',
            zIndex: 100,
            pointerEvents: 'none',
            border: '2px solid #ff0000',
          }}
        >
          ACCESS LOCKED – THREAT ACTIVE
        </div>
      )}
      
      {/* "Terminal already hacked" message */}
      {showAlreadyHacked && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: '#00ff00',
            padding: '10px 20px',
            borderRadius: '5px',
            fontFamily: 'monospace',
            fontSize: '18px',
            zIndex: 100,
            pointerEvents: 'none',
          }}
        >
          Terminal already hacked
        </div>
      )}
      
      {/* Success message overlay (brief) */}
      {showSuccessMessage && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            color: '#00ff00',
            padding: '20px 40px',
            borderRadius: '5px',
            fontFamily: 'monospace',
            fontSize: '20px',
            zIndex: 100,
            pointerEvents: 'none',
            animation: 'fadeOut 2s ease-out forwards',
          }}
        >
          {successMessage}
          <style>{`
            @keyframes fadeOut {
              0% { opacity: 1; }
              70% { opacity: 1; }
              100% { opacity: 0; }
            }
          `}</style>
        </div>
      )}
    </>
  );
}

