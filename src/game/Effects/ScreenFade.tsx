// TEST PLAN (ScreenFade Shutdown Effect)
// 1. Shutdown Trigger:
//    - Hack final terminal in Zone 4 after defeating Sentinel
//    - isShuttingDown should become true
//    - ScreenFade should start fading in
// 2. Fade Animation:
//    - Black overlay should fade from opacity 0 to 1 over 4 seconds
//    - Should cover entire screen
// 3. Fully Opaque State:
//    - After fade completes, should show:
//      - Large text: "SYSTEM SHUTDOWN"
//      - Small text: "Press R to reboot"
// 4. Reboot:
//    - Press R key when fully opaque
//    - Should call resetPlayer() which resets:
//      - Player health and position
//      - Door states
//      - Terminal states
//      - sentinelDefeated
//      - isShuttingDown
// 5. Full Level Reset:
//    - After reboot, player should spawn at start position
//    - All enemies should reset
//    - All doors should be closed
//    - All terminals should be locked
//    - Full game loop should be reset

import { useEffect, useState } from 'react';
import { useGameState } from '../../state/gameState';

export function ScreenFade() {
  const isShuttingDown = useGameState((state) => state.isShuttingDown);
  const resetPlayer = useGameState((state) => state.resetPlayer);
  const setIsShuttingDown = useGameState((state) => state.setIsShuttingDown);
  
  const [opacity, setOpacity] = useState(0);
  const [showRebootText, setShowRebootText] = useState(false);
  const [hasReset, setHasReset] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  
  const FADE_DURATION = 4; // seconds
  
  // Handle fade-in animation
  useEffect(() => {
    if (isShuttingDown && !hasReset) {
      if (startTime === null) {
        setStartTime(performance.now() / 1000);
      }
      
      // Update opacity continuously
      const interval = setInterval(() => {
        const currentStartTime = startTime;
        if (currentStartTime === null) return;
        
        const currentTime = performance.now() / 1000;
        const elapsed = currentTime - currentStartTime;
        const progress = Math.min(elapsed / FADE_DURATION, 1);
        setOpacity(progress);
        
        if (progress >= 1) {
          setShowRebootText(true);
          clearInterval(interval);
        }
      }, 16); // ~60fps
      
      return () => {
        clearInterval(interval);
      };
    } else if (!isShuttingDown) {
      // Reset fade when shutdown is turned off
      setOpacity(0);
      setShowRebootText(false);
      setStartTime(null);
      setHasReset(false);
    }
  }, [isShuttingDown, startTime, hasReset]);
  
  // Handle R key for reboot
  useEffect(() => {
    if (!showRebootText || hasReset) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'r') {
        // Reset everything via resetPlayer
        resetPlayer();
        setIsShuttingDown(false);
        setOpacity(0);
        setShowRebootText(false);
        setStartTime(null);
        setHasReset(true);
        
        // Reset player position (this would ideally be done in Player component, but since we can't modify it,
        // we'll just reset the game state and let the level reset)
        console.log('System rebooted. Level reset.');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showRebootText, hasReset, resetPlayer, setIsShuttingDown]);
  
  // Don't render if not shutting down and fully transparent
  if (!isShuttingDown && opacity === 0) {
    return null;
  }
  
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000000',
        opacity: opacity,
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: opacity >= 1 ? 'auto' : 'none',
        transition: opacity < 1 ? 'opacity 0.1s linear' : 'none',
      }}
    >
      {showRebootText && (
        <>
          <div
            style={{
              color: '#ffffff',
              fontFamily: 'monospace',
              fontSize: '48px',
              fontWeight: 'bold',
              marginBottom: '20px',
              textAlign: 'center',
              textShadow: '0 0 10px rgba(255, 255, 255, 0.5)',
            }}
          >
            SYSTEM SHUTDOWN
          </div>
          <div
            style={{
              color: '#888888',
              fontFamily: 'monospace',
              fontSize: '18px',
              textAlign: 'center',
            }}
          >
            Press R to reboot
          </div>
        </>
      )}
    </div>
  );
}

