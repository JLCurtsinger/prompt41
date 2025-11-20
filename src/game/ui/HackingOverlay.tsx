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

import { useEffect, useCallback, useMemo } from 'react';
import { useGameState, getTerminalState } from '../../state/gameState';
import { AudioManager } from '../audio/AudioManager';
import directivesData from '../../assets/data/directives.json';

interface DirectiveData {
  title: string;
  options: string[];
  successMessage: string;
}

export function HackingOverlay() {
  // ALL HOOKS MUST BE CALLED UNCONDITIONALLY AT THE TOP
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
  const unlockZone2Door = useGameState((state) => state.unlockZone2Door);
  const completeLevel = useGameState((state) => state.completeLevel);

  // Extract values for easier use
  const { isOpen, terminalId, mode } = hackingOverlay;

  // Handle ESC key to close overlay - called unconditionally
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeHackingOverlay();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, closeHackingOverlay]);

  // Handle success mode auto-close - called unconditionally
  useEffect(() => {
    if (!isOpen || mode !== 'success') return;

    const timer = window.setTimeout(() => {
      closeHackingOverlay();
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [isOpen, mode, closeHackingOverlay]);

  // Memoize directive data computation
  const directiveData = useMemo(() => {
    if (!terminalId) return null;

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

    return { title, options, successMessage };
  }, [terminalId]);

  // Handle directive option click - useCallback for stable reference
  const handleDirectiveSelect = useCallback((optionIndex: number) => {
    if (!isOpen || !terminalId) return;

    try {
      // Simple mini-game: first button (index 0) is correct, others are wrong
      const CORRECT_OPTION_INDEX = 0;
      const isCorrect = optionIndex === CORRECT_OPTION_INDEX;
      
      if (isCorrect) {
        // Success: hack terminal and unlock door
        setTerminalState(terminalId, 'hacked');

        // Zone 2 terminal unlocks Zone 2 -> Zone 3 door
        if (terminalId === 'terminal-zone2-main') {
          unlockZone2Door();
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
        } else if (terminalId === 'final_terminal') {
          // Final terminal hack - complete the level
          completeLevel();
          try {
            playHostLine('hacking:finalSuccess');
          } catch (error) {
            console.warn(`HackingOverlay: Error playing final host line:`, error);
          }
          try {
            AudioManager.playSFX('hackingSuccess');
          } catch (error) {
            console.warn(`HackingOverlay: Error playing success SFX:`, error);
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
      } else {
        // Failure: close overlay and log failure
        console.log('[Hacking] Terminal hack failed');
        closeHackingOverlay();
      }
    } catch (error) {
      console.error(`HackingOverlay: Error in handleDirectiveSelect:`, error);
      // Ensure overlay closes even on error
      closeHackingOverlay();
    }
  }, [isOpen, terminalId, setTerminalState, unlockZone2Door, completeLevel, playHostLine, setHackingOverlayMode, closeHackingOverlay]);

  // NOW AFTER ALL HOOKS, do conditional rendering
  if (!isOpen || isDead || isShuttingDown) {
    return null;
  }

  if (!terminalId) {
    return null;
  }

  const { title, options, successMessage } = directiveData || {
    title: 'DIRECTIVE INTERFACE',
    options: ['Disable', 'Override', 'Convert'],
    successMessage: 'DIRECTIVE ACCEPTED.'
  };

  // Derive body content based on mode (no hooks inside this logic)
  let body: React.ReactNode;

  if (mode === 'locked') {
    body = (
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
    );
  } else if (mode === 'alreadyHacked') {
    body = (
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
    );
  } else if (mode === 'success') {
    body = (
      <>
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
          {successMessage}
        </div>
        <style>{`
          @keyframes fadeOut {
            0% { opacity: 1; }
            70% { opacity: 1; }
            100% { opacity: 0; }
          }
        `}</style>
      </>
    );
  } else {
    // Normal mode - main hacking interface
    body = (
      <div
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          maxWidth: '640px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          color: '#00ff00',
          fontFamily: 'monospace',
          fontSize: '24px',
        }}
      >
        <div style={{ marginBottom: '40px', fontSize: '32px', fontWeight: 'bold' }}>
          {title}
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
    );
  }

  // Render overlay container with body
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: isOpen ? 'auto' : 'none',
        zIndex: 1900,
        backgroundColor: mode === 'normal' ? 'rgba(0, 0, 0, 0.9)' : 'transparent',
      }}
    >
      {body}
    </div>
  );
}

