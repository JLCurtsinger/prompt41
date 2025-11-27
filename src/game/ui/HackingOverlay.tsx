// TEST PLAN (HackingOverlay with Mini-Game)
// 1. Display:
//    - Should show centered modal when hackingOverlay.isOpen === true
//    - Should not display when isDead or isShuttingDown
//    - Should show different content based on mode and miniGamePhase
// 2. Choose Action Phase (miniGamePhase === 'chooseAction'):
//    - Should display directive title and three options
//    - Clicking an option should call startHackingAction and switch to 'playing' phase
// 3. Playing Phase (miniGamePhase === 'playing'):
//    - Should show timing bar mini-game
//    - Clicking when cursor is in green zone = success
//    - Clicking outside zone decrements attempts
//    - When attempts reach 0 with no success = failure
// 4. Result Phase (miniGamePhase === 'result'):
//    - Success: "ACCESS GRANTED // SOURCE CODE CAPTURED", awards 1 source code
//    - Failure: "ACCESS DENIED // SECURITY COUNTERMEASURE TRIGGERED"
//    - Shows Close button or auto-closes after timeout
// 5. ESC Key:
//    - Should close overlay and resume game at any phase
// 6. Audio:
//    - Loop plays during 'playing' phase
//    - Success SFX on success result
//    - Failure SFX on failure result

import { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import { useGameState } from '../../state/gameState';
import { AudioManager } from '../audio/AudioManager';
import directivesData from '../../assets/data/directives.json';

interface DirectiveData {
  title: string;
  options: string[];
  successMessage: string;
}

type HackingActionType = 'disableSentries' | 'overrideGate' | 'convertWatcher';

// --- Timing Bar Mini-Game Component (used for "Disable local sentries") ---
function TimingBarMiniGame({
  selectedActionLabel,
  attemptsRemaining,
  onSuccess,
  onFailedAttempt,
}: {
  selectedActionLabel: string;
  attemptsRemaining: number;
  onSuccess: () => void;
  onFailedAttempt: () => void;
}) {
  const [cursorPosition, setCursorPosition] = useState(0);
  const directionRef = useRef(1);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Disable sentries uses a slow speed, wide zone (easy)
  const speed = 0.6;
  const zoneWidth = 0.25;
  
  // Success zone is centered (around 0.5)
  const zoneStart = 0.5 - zoneWidth / 2;
  const zoneEnd = 0.5 + zoneWidth / 2;

  // Animation loop
  useEffect(() => {
    const animate = (time: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = time;
      }
      
      const deltaTime = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;
      
      setCursorPosition((prev) => {
        let next = prev + directionRef.current * speed * deltaTime;
        
        // Bounce at edges
        if (next >= 1) {
          next = 1;
          directionRef.current = -1;
        } else if (next <= 0) {
          next = 0;
          directionRef.current = 1;
        }
        
        return next;
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Handle click
  const handleClick = useCallback(() => {
    const isInZone = cursorPosition >= zoneStart && cursorPosition <= zoneEnd;
    
    if (isInZone) {
      onSuccess();
    } else {
      onFailedAttempt();
    }
  }, [cursorPosition, zoneStart, zoneEnd, onSuccess, onFailedAttempt]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px',
        width: '100%',
        maxWidth: '500px',
      }}
    >
      {/* Action label */}
      <div style={{ fontSize: '18px', color: '#00ff00', textTransform: 'uppercase' }}>
        {selectedActionLabel}
      </div>

      {/* Timing bar container */}
      <div
        onClick={handleClick}
        style={{
          width: '100%',
          height: '40px',
          backgroundColor: '#001100',
          border: '2px solid #00ff00',
          borderRadius: '4px',
          position: 'relative',
          cursor: 'pointer',
          overflow: 'hidden',
        }}
      >
        {/* Success zone (green) */}
        <div
          style={{
            position: 'absolute',
            left: `${zoneStart * 100}%`,
            width: `${zoneWidth * 100}%`,
            height: '100%',
            backgroundColor: 'rgba(0, 255, 0, 0.3)',
            borderLeft: '2px solid #00ff00',
            borderRight: '2px solid #00ff00',
          }}
        />
        
        {/* Moving cursor */}
        <div
          style={{
            position: 'absolute',
            left: `${cursorPosition * 100}%`,
            top: '0',
            width: '4px',
            height: '100%',
            backgroundColor: '#ffffff',
            boxShadow: '0 0 8px #ffffff, 0 0 16px #00ff00',
            transform: 'translateX(-50%)',
          }}
        />
      </div>

      {/* Instructions */}
      <div style={{ fontSize: '14px', color: '#00ff00', opacity: 0.8 }}>
        Click when the signal is inside the green zone
      </div>

      {/* Attempts remaining */}
      <div style={{ fontSize: '16px', color: attemptsRemaining === 1 ? '#ff4444' : '#00ff00' }}>
        ATTEMPTS: {attemptsRemaining}
      </div>
    </div>
  );
}

// --- Override Gate Mini-Game Component (dual timing bars) ---
function OverrideGateMiniGame({
  selectedActionLabel,
  attemptsRemaining,
  onSuccess,
  onFailedAttempt,
}: {
  selectedActionLabel: string;
  attemptsRemaining: number;
  onSuccess: () => void;
  onFailedAttempt: () => void;
}) {
  const [cursorPos1, setCursorPos1] = useState(0);
  const [cursorPos2, setCursorPos2] = useState(0.3); // Start offset for visual variety
  const direction1Ref = useRef(1);
  const direction2Ref = useRef(1);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Two bars with different speeds so they drift relative to each other
  const speed1 = 1.0;
  const speed2 = 1.3;

  // Different success zones for each bar
  const zone1 = { start: 0.3, end: 0.55 };
  const zone2 = { start: 0.45, end: 0.75 };

  // Animation loop
  useEffect(() => {
    const animate = (time: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = time;
      }
      
      const deltaTime = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;
      
      // Update cursor 1
      setCursorPos1((prev) => {
        let next = prev + direction1Ref.current * speed1 * deltaTime;
        if (next >= 1) {
          next = 1;
          direction1Ref.current = -1;
        } else if (next <= 0) {
          next = 0;
          direction1Ref.current = 1;
        }
        return next;
      });

      // Update cursor 2
      setCursorPos2((prev) => {
        let next = prev + direction2Ref.current * speed2 * deltaTime;
        if (next >= 1) {
          next = 1;
          direction2Ref.current = -1;
        } else if (next <= 0) {
          next = 0;
          direction2Ref.current = 1;
        }
        return next;
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Handle click - both cursors must be in their zones
  const handleClick = useCallback(() => {
    const cursor1InZone = cursorPos1 >= zone1.start && cursorPos1 <= zone1.end;
    const cursor2InZone = cursorPos2 >= zone2.start && cursorPos2 <= zone2.end;
    
    if (cursor1InZone && cursor2InZone) {
      onSuccess();
    } else {
      onFailedAttempt();
    }
  }, [cursorPos1, cursorPos2, onSuccess, onFailedAttempt]);

  // Shared bar style
  const barStyle: React.CSSProperties = {
    width: '100%',
    height: '35px',
    backgroundColor: '#001100',
    border: '2px solid #00ff00',
    borderRadius: '4px',
    position: 'relative',
    overflow: 'hidden',
  };

  return (
    <div
      onClick={handleClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
        width: '100%',
        maxWidth: '500px',
        cursor: 'pointer',
      }}
    >
      {/* Action label */}
      <div style={{ fontSize: '18px', color: '#00ff00', textTransform: 'uppercase' }}>
        {selectedActionLabel}
      </div>

      {/* Bar 1 */}
      <div style={barStyle}>
        {/* Success zone */}
        <div
          style={{
            position: 'absolute',
            left: `${zone1.start * 100}%`,
            width: `${(zone1.end - zone1.start) * 100}%`,
            height: '100%',
            backgroundColor: 'rgba(0, 255, 0, 0.3)',
            borderLeft: '2px solid #00ff00',
            borderRight: '2px solid #00ff00',
          }}
        />
        {/* Moving cursor */}
        <div
          style={{
            position: 'absolute',
            left: `${cursorPos1 * 100}%`,
            top: '0',
            width: '4px',
            height: '100%',
            backgroundColor: '#ffffff',
            boxShadow: '0 0 8px #ffffff, 0 0 16px #00ff00',
            transform: 'translateX(-50%)',
          }}
        />
      </div>

      {/* Bar 2 */}
      <div style={barStyle}>
        {/* Success zone */}
        <div
          style={{
            position: 'absolute',
            left: `${zone2.start * 100}%`,
            width: `${(zone2.end - zone2.start) * 100}%`,
            height: '100%',
            backgroundColor: 'rgba(0, 255, 0, 0.3)',
            borderLeft: '2px solid #00ff00',
            borderRight: '2px solid #00ff00',
          }}
        />
        {/* Moving cursor */}
        <div
          style={{
            position: 'absolute',
            left: `${cursorPos2 * 100}%`,
            top: '0',
            width: '4px',
            height: '100%',
            backgroundColor: '#ffffff',
            boxShadow: '0 0 8px #ffffff, 0 0 16px #00ff00',
            transform: 'translateX(-50%)',
          }}
        />
      </div>

      {/* Instructions */}
      <div style={{ fontSize: '14px', color: '#00ff00', opacity: 0.8 }}>
        Click when BOTH signals overlap their green zones
      </div>

      {/* Attempts remaining */}
      <div style={{ fontSize: '16px', color: attemptsRemaining === 1 ? '#ff4444' : '#00ff00' }}>
        ATTEMPTS: {attemptsRemaining}
      </div>
    </div>
  );
}

// --- Convert Watcher Mini-Game Component (pattern matching grid) ---
function ConvertWatcherMiniGame({
  selectedActionLabel,
  attemptsRemaining,
  onSuccess,
  onFailedAttempt,
}: {
  selectedActionLabel: string;
  attemptsRemaining: number;
  onSuccess: () => void;
  onFailedAttempt: () => void;
}) {
  // Generate puzzle on mount (only once per hacking attempt)
  const [puzzle] = useState(() => {
    // Generate a random 3-character target code from '0' and '1'
    const generateCode = () => {
      let code = '';
      for (let i = 0; i < 3; i++) {
        code += Math.random() < 0.5 ? '0' : '1';
      }
      return code;
    };

    // Generate a code that differs from target by at least one character
    const generateDifferentCode = (target: string) => {
      let code: string;
      do {
        code = generateCode();
      } while (code === target);
      return code;
    };

    const targetCode = generateCode();
    const correctIndex = Math.floor(Math.random() * 9);
    
    // Generate 9 tile codes
    const tiles: string[] = [];
    for (let i = 0; i < 9; i++) {
      if (i === correctIndex) {
        tiles.push(targetCode);
      } else {
        tiles.push(generateDifferentCode(targetCode));
      }
    }

    return { targetCode, tiles, correctIndex };
  });

  // Handle tile click
  const handleTileClick = useCallback((index: number) => {
    if (puzzle.tiles[index] === puzzle.targetCode) {
      onSuccess();
    } else {
      onFailedAttempt();
    }
  }, [puzzle, onSuccess, onFailedAttempt]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
        width: '100%',
        maxWidth: '400px',
      }}
    >
      {/* Action label */}
      <div style={{ fontSize: '18px', color: '#00ff00', textTransform: 'uppercase' }}>
        {selectedActionLabel}
      </div>

      {/* Target signature */}
      <div style={{ fontSize: '16px', color: '#00ff00' }}>
        Target signature: <span style={{ fontWeight: 'bold', letterSpacing: '4px' }}>{puzzle.targetCode}</span>
      </div>

      {/* 3x3 Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '10px',
          width: '100%',
          maxWidth: '300px',
        }}
      >
        {puzzle.tiles.map((code, index) => (
          <button
            key={index}
            onClick={() => handleTileClick(index)}
            style={{
              padding: '20px',
              backgroundColor: '#001100',
              color: '#00ff00',
              border: '2px solid #00ff00',
              fontFamily: 'monospace',
              fontSize: '18px',
              fontWeight: 'bold',
              letterSpacing: '2px',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#003300';
              e.currentTarget.style.boxShadow = '0 0 10px #00ff00';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#001100';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {code}
          </button>
        ))}
      </div>

      {/* Instructions */}
      <div style={{ fontSize: '14px', color: '#00ff00', opacity: 0.8 }}>
        Click the tile matching the target signature
      </div>

      {/* Attempts remaining */}
      <div style={{ fontSize: '16px', color: attemptsRemaining === 1 ? '#ff4444' : '#00ff00' }}>
        ATTEMPTS: {attemptsRemaining}
      </div>
    </div>
  );
}

// --- Main Overlay Component ---
export function HackingOverlay() {
  // ALL HOOKS MUST BE CALLED UNCONDITIONALLY AT THE TOP
  const hackingOverlay = useGameState((state) => state.hackingOverlay);
  const isDead = useGameState((state) => state.isDead);
  const isShuttingDown = useGameState((state) => state.isShuttingDown);
  const closeHackingOverlay = useGameState((state) => state.closeHackingOverlay);
  const resetHackingState = useGameState((state) => state.resetHackingState);
  const startHackingAction = useGameState((state) => state.startHackingAction);
  const setMiniGameResult = useGameState((state) => state.setMiniGameResult);
  const decrementAttempts = useGameState((state) => state.decrementAttempts);
  const addEnergyCell = useGameState((state) => state.addEnergyCell);
  const setTerminalState = useGameState((state) => state.setTerminalState);
  const unlockZone2Door = useGameState((state) => state.unlockZone2Door);
  const completeLevel = useGameState((state) => state.completeLevel);
  const playHostLine = useGameState((state) => state.playHostLine);

  // Extract values for easier use
  const { isOpen, terminalId, mode, miniGamePhase, miniGameResult, attemptsRemaining, selectedAction } = hackingOverlay;

  // Track if we've already awarded source code for this result
  const hasAwardedRef = useRef(false);

  // Reset award tracking when phase changes away from result
  useEffect(() => {
    if (miniGamePhase !== 'result') {
      hasAwardedRef.current = false;
    }
  }, [miniGamePhase]);

  // Start/stop hacking loop based on mini-game phase
  useEffect(() => {
    if (isOpen && miniGamePhase === 'playing') {
      // Start hacking loop when entering playing phase
      AudioManager.startHackingLoop();
    } else {
      // Stop hacking loop when not in playing phase or overlay closes
      AudioManager.stopHackingLoop();
    }
    
    // Cleanup on unmount
    return () => {
      AudioManager.stopHackingLoop();
    };
  }, [isOpen, miniGamePhase]);

  // Handle ESC key to close overlay - called unconditionally
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeHackingOverlay();
        resetHackingState();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, closeHackingOverlay, resetHackingState]);

  // Handle result phase: award source code, play SFX, apply terminal effects
  useEffect(() => {
    if (!isOpen || miniGamePhase !== 'result' || !miniGameResult || !terminalId) return;
    
    // Only process once per result
    if (hasAwardedRef.current) return;
    hasAwardedRef.current = true;

    if (miniGameResult === 'success') {
      // Award source code (displayed as "Source Codes" in HUD, uses energyCellCount)
      addEnergyCell(1);
      
      // Mark terminal as hacked
      setTerminalState(terminalId, 'hacked');
      
      // Zone-specific effects
      if (terminalId === 'terminal-zone2-main') {
        unlockZone2Door();
      } else if (terminalId === 'final_terminal') {
        completeLevel();
      }
      
      // Play host line and SFX
      try {
        playHostLine('hacking:success');
        AudioManager.playSFX('hackingSuccess');
      } catch (error) {
        console.warn('HackingOverlay: Error playing success feedback:', error);
      }
    } else {
      // Failure SFX
      try {
        AudioManager.playSFX('hackingFail');
      } catch (error) {
        console.warn('HackingOverlay: Error playing failure SFX:', error);
      }
    }
  }, [isOpen, miniGamePhase, miniGameResult, terminalId, addEnergyCell, setTerminalState, unlockZone2Door, completeLevel, playHostLine]);

  // Auto-close after result is shown (optional)
  useEffect(() => {
    if (!isOpen || miniGamePhase !== 'result') return;

    const timer = window.setTimeout(() => {
      closeHackingOverlay();
      resetHackingState();
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [isOpen, miniGamePhase, closeHackingOverlay, resetHackingState]);

  // Memoize directive data computation
  const directiveData = useMemo(() => {
    if (!terminalId) return null;

    let directive: DirectiveData | undefined;
    try {
      if (directivesData && typeof directivesData === 'object') {
        const directives = directivesData as Record<string, unknown>;
        const entry = directives[terminalId];
        // Check if entry is a DirectiveData object (has title, options, successMessage)
        if (entry && typeof entry === 'object' && 'title' in entry && 'options' in entry) {
          directive = entry as DirectiveData;
        }
      }
    } catch (error) {
      console.warn('HackingOverlay: Error loading directive data:', error);
    }

    const title = directive?.title ?? 'DIRECTIVE INTERFACE';
    const options = directive?.options ?? ['Disable local sentries', 'Override access gate', 'Convert watcher node'];

    return { title, options };
  }, [terminalId]);

  // Map button index to action type
  const ACTION_MAP: HackingActionType[] = ['disableSentries', 'overrideGate', 'convertWatcher'];

  // Handle action selection (chooseAction phase)
  const handleActionSelect = useCallback((index: number) => {
    const action = ACTION_MAP[index];
    if (action) {
      startHackingAction(action);
    }
  }, [startHackingAction]);

  // Handle mini-game success
  const handleMiniGameSuccess = useCallback(() => {
    setMiniGameResult('success');
  }, [setMiniGameResult]);

  // Handle mini-game miss
  const handleMiniGameMiss = useCallback(() => {
    const remainingAfterDecrement = decrementAttempts();
    if (remainingAfterDecrement <= 0) {
      setMiniGameResult('failure');
    }
  }, [decrementAttempts, setMiniGameResult]);

  // Handle manual close from result screen
  const handleClose = useCallback(() => {
    closeHackingOverlay();
    resetHackingState();
  }, [closeHackingOverlay, resetHackingState]);

  // NOW AFTER ALL HOOKS, do conditional rendering
  if (!isOpen || isDead || isShuttingDown) {
    return null;
  }

  if (!terminalId) {
    return null;
  }

  const { title, options } = directiveData || {
    title: 'DIRECTIVE INTERFACE',
    options: ['Disable local sentries', 'Override access gate', 'Convert watcher node'],
  };

  // Derive body content based on mode and miniGamePhase
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
  } else if (miniGamePhase === 'result') {
    // Result phase
    const isSuccess = miniGameResult === 'success';
    body = (
      <div
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.95)',
          padding: '40px 60px',
          borderRadius: '5px',
          fontFamily: 'monospace',
          textAlign: 'center',
          border: `2px solid ${isSuccess ? '#00ff00' : '#ff0000'}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
        }}
      >
        <div
          style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: isSuccess ? '#00ff00' : '#ff0000',
          }}
        >
          {isSuccess ? 'ACCESS GRANTED' : 'ACCESS DENIED'}
        </div>
        <div
          style={{
            fontSize: '16px',
            color: isSuccess ? '#00ff00' : '#ff4444',
            opacity: 0.9,
          }}
        >
          {isSuccess ? '// SOURCE CODE CAPTURED' : '// SECURITY COUNTERMEASURE TRIGGERED'}
        </div>
        <button
          onClick={handleClose}
          style={{
            marginTop: '12px',
            padding: '10px 24px',
            backgroundColor: '#001100',
            color: '#00ff00',
            border: '2px solid #00ff00',
            fontFamily: 'monospace',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#003300';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#001100';
          }}
        >
          CLOSE
        </button>
      </div>
    );
  } else if (miniGamePhase === 'playing' && selectedAction) {
    // Playing phase - render appropriate mini-game based on selectedAction
    let miniGameComponent: React.ReactNode = null;

    if (selectedAction === 'disableSentries') {
      // Disable local sentries uses the timing-bar mini-game
      miniGameComponent = (
        <TimingBarMiniGame
          selectedActionLabel="// DISABLING SENTRIES"
          attemptsRemaining={attemptsRemaining}
          onSuccess={handleMiniGameSuccess}
          onFailedAttempt={handleMiniGameMiss}
        />
      );
    } else if (selectedAction === 'overrideGate') {
      // Override access gate uses the dual timing-bar mini-game
      miniGameComponent = (
        <OverrideGateMiniGame
          selectedActionLabel="// OVERRIDING ACCESS GATE"
          attemptsRemaining={attemptsRemaining}
          onSuccess={handleMiniGameSuccess}
          onFailedAttempt={handleMiniGameMiss}
        />
      );
    } else if (selectedAction === 'convertWatcher') {
      // Convert watcher node uses the pattern-matching grid mini-game
      miniGameComponent = (
        <ConvertWatcherMiniGame
          selectedActionLabel="// CONVERTING WATCHER NODE"
          attemptsRemaining={attemptsRemaining}
          onSuccess={handleMiniGameSuccess}
          onFailedAttempt={handleMiniGameMiss}
        />
      );
    }

    body = (
      <div
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.95)',
          padding: '40px',
          borderRadius: '5px',
          fontFamily: 'monospace',
          border: '2px solid #00ff00',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div style={{ marginBottom: '24px', fontSize: '24px', fontWeight: 'bold', color: '#00ff00' }}>
          {title}
        </div>
        {miniGameComponent}
        <div style={{ marginTop: '24px', fontSize: '12px', color: '#00ff00', opacity: 0.6 }}>
          Press ESC to cancel
        </div>
      </div>
    );
  } else {
    // Choose action phase (normal mode) - main hacking interface with 3 buttons
    body = (
      <div
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.95)',
          maxWidth: '640px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
          color: '#00ff00',
          fontFamily: 'monospace',
          fontSize: '24px',
          border: '2px solid #00ff00',
          borderRadius: '5px',
        }}
      >
        <div style={{ marginBottom: '40px', fontSize: '28px', fontWeight: 'bold' }}>
          {title}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '400px', width: '100%' }}>
          {options.map((option, index) => {
            const optionText = typeof option === 'string' && option.trim() ? option.trim() : `Option ${index + 1}`;

            return (
              <button
                key={index}
                onClick={() => handleActionSelect(index)}
                style={{
                  padding: '15px 30px',
                  backgroundColor: '#001100',
                  color: '#00ff00',
                  border: '2px solid #00ff00',
                  fontFamily: 'monospace',
                  fontSize: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#003300';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#001100';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {optionText}
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: '32px', fontSize: '12px', opacity: 0.6 }}>
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
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
      }}
    >
      {body}
    </div>
  );
}
