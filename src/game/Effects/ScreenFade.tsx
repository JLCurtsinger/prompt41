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
  const hasCompletedLevel = useGameState((state) => state.hasCompletedLevel);
  const isEnding = useGameState((state) => state.isEnding);
  const resetPlayer = useGameState((state) => state.resetPlayer);
  
  const [opacity, setOpacity] = useState(0);
  const [showText, setShowText] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  
  const FADE_DURATION = 2; // seconds
  
  // Handle fade-in animation
  useEffect(() => {
    if (hasCompletedLevel) {
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
          setShowText(true);
          clearInterval(interval);
        }
      }, 16); // ~60fps
      
      return () => {
        clearInterval(interval);
      };
    } else {
      // Reset fade when level is not completed
      setOpacity(0);
      setShowText(false);
      setStartTime(null);
    }
  }, [hasCompletedLevel, startTime]);
  
  // Don't render if not completed and fully transparent
  if (!hasCompletedLevel && opacity === 0) {
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
      {showText && (
        <>
          <div
            style={{
              color: '#ffffff',
              fontFamily: 'monospace',
              fontSize: '32px',
              fontWeight: 'bold',
              marginBottom: '15px',
              textAlign: 'center',
              textShadow: '0 0 10px rgba(255, 255, 255, 0.5)',
            }}
          >
            SYSTEM OVERRIDE COMPLETE
          </div>
          <div
            style={{
              color: '#ffffff',
              fontFamily: 'monospace',
              fontSize: '24px',
              textAlign: 'center',
            }}
          >
            PROCESS SUSPENDED
          </div>
        </>
      )}
    </div>
  );
}

