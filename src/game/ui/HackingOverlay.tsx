// TEST PLAN (HackingOverlay)
// 1. Display:
//    - Should show centered modal when hackingOverlay.isOpen === true
//    - Should not display when isDead or isShuttingDown
//    - Should show different content based on mode (normal, locked, alreadyHacked, success)
// 2. Normal Mode:
//    - Should display directive title and options
//    - Should allow clicking options to hack terminal
// 3. Locked Mode:
//    - Should show "ACCESS LOCKED – THREAT ACTIVE" message
// 4. Already Hacked Mode:
//    - Should show "Terminal already hacked" message
// 5. Success Mode:
//    - Should show success message and auto-close after timeout
// 6. ESC Key:
//    - Should close overlay and resume game

import { useEffect } from 'react';
import { useGameState, getTerminalState } from '../../state/gameState';
import { AudioManager } from '../audio/AudioManager';
import directivesData from '../../assets/data/directives.json';

interface DirectiveData {
  title: string;
  options: string[];
  successMessage: string;
}

export function HackingOverlay() {
  const hackingOverlay = useGameState((state) => state.hackingOverlay);
  const isDead = useGameState((state) => state.isDead);
  const isShuttingDown = useGameState((state) => state.isShuttingDown);
  const terminalStates = useGameState((state) => state.terminalStates);
  const sentinelDefeated = useGameState((state) => state.sentinelDefeated);
  const closeHackingOverlay = useGameState((state) => state.closeHackingOverlay);
  const setTerminalState = useGameState((state) => state.setTerminalState);
  const setDoorState = useGameState((state) => state.setDoorState);
  const setIsShuttingDown = useGameState((state) => state.setIsShuttingDown);
  const playHostLine = useGameState((state) => state.playHostLine);
  const setHackingOverlayMode = useGameState((state) => state.setHackingOverlayMode);

  // Don't render if not open, dead, or shutting down
  if (!hackingOverlay.isOpen || isDead || isShuttingDown) {
    return null;
  }

  const terminalId = hackingOverlay.terminalId;
  if (!terminalId) {
    return null;
  }

  // Get directive data for this terminal with defensive checks
  let directive: DirectiveData | undefined;
  try {
    if (!directivesData || typeof directivesData !== 'object') {
      console.warn(`HackingOverlay: directivesData is invalid or missing`);
    } else {
      const directives = directivesData as Record<string, any>;
      if (directives && typeof directives === 'object' && terminalId && directives[terminalId]) {
        directive = directives[terminalId] as DirectiveData;
      }
    }
  } catch (error) {
    console.warn(`HackingOverlay: Error loading directive data:`, error);
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

  // Handle ESC key to close overlay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && hackingOverlay.isOpen) {
        closeHackingOverlay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hackingOverlay.isOpen, closeHackingOverlay]);

  // Handle success mode auto-close
  useEffect(() => {
    if (hackingOverlay.mode === 'success') {
      const timer = setTimeout(() => {
        closeHackingOverlay();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [hackingOverlay.mode, closeHackingOverlay]);

  // Handle directive option click
  const handleDirectiveSelect = (_optionIndex: number) => {
    try {
      // For now, any button click counts as success
      setTerminalState(terminalId, 'hacked');

      // Zone 2 terminal opens door, Zone 4 terminal triggers shutdown
      if (terminalId === 'terminal-zone2-main') {
        setDoorState('zone1-zone2-main', 'open');
        try {
          playHostLine('hacking:success');
        } catch (error) {
          console.warn(`HackingOverlay: Error playing success host line:`, error);
        }
        try {
          AudioManager.playSFX('hackingSuccess');
        } catch (error) {
          console.warn(`HackingOverlay: Error playing success SFX:`, error);
        }
      } else if (terminalId === 'terminal-zone4-final') {
        try {
          playHostLine('hacking:finalSuccess');
          playHostLine('shutdown:start');
        } catch (error) {
          console.warn(`HackingOverlay: Error playing final host lines:`, error);
        }
        setIsShuttingDown(true);
        try {
          AudioManager.playSFX('hackingSuccess');
          AudioManager.playSFX('shutdownStart');
        } catch (error) {
          console.warn(`HackingOverlay: Error playing final SFX:`, error);
        }
      } else {
        try {
          playHostLine('hacking:success');
          AudioManager.playSFX('hackingSuccess');
        } catch (error) {
          console.warn(`HackingOverlay: Error playing success feedback:`, error);
        }
      }

      // Switch to success mode, which will auto-close after timeout
      setHackingOverlayMode('success');
    } catch (error) {
      console.error(`HackingOverlay: Error in handleDirectiveSelect:`, error);
      // Ensure overlay closes even on error
      closeHackingOverlay();
    }
  };

  // Render based on mode
  if (hackingOverlay.mode === 'locked') {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1900,
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
    );
  }

  if (hackingOverlay.mode === 'alreadyHacked') {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1900,
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
    );
  }

  if (hackingOverlay.mode === 'success') {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1900,
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
    );
  }

  // Normal mode - main hacking interface
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1900,
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
  );
}

