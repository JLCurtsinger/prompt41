// TEST PLAN (ScanlineOverlay)
// 1. Always Visible:
//    - Start game
//    - Verify scanlines are always present (low opacity)
//    - Should be subtle but visible
// 2. Shutdown Intensity:
//    - Hack final terminal to trigger shutdown
//    - Verify scanline opacity increases during shutdown
//    - Should be more visible than normal
// 3. Hacking Intensity:
//    - Open hacking terminal overlay
//    - Verify scanline opacity slightly increases (if accessible)
//    - Should remain visible during hacking
// 4. Visual Verification:
//    - Verify repeating horizontal lines across screen
//    - Verify lines are evenly spaced
//    - Verify slight vertical movement over time
// 5. Fullscreen Coverage:
//    - Verify scanlines cover entire screen
//    - Verify they are below other UI elements

import { useEffect, useState, useRef } from 'react';
import { useGameState } from '../../state/gameState';

export function ScanlineOverlay() {
  const isShuttingDown = useGameState((state) => state.isShuttingDown);
  const isPaused = useGameState((state) => state.isPaused);
  
  const [offset, setOffset] = useState(0);
  const animationFrameRef = useRef<number>();
  
  // Base opacity
  const baseOpacity = 0.15;
  // Increased opacity during shutdown or hacking
  const enhancedOpacity = 0.3;
  const currentOpacity = (isShuttingDown || isPaused) ? enhancedOpacity : baseOpacity;
  
  // Animate vertical movement
  useEffect(() => {
    const animate = () => {
      setOffset((prev) => (prev + 0.5) % 4); // Move slowly, loop every 4px
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);
  
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 1300,
        opacity: currentOpacity,
        background: `
          repeating-linear-gradient(
            0deg,
            transparent,
            transparent 1px,
            rgba(0, 255, 0, 0.1) 1px,
            rgba(0, 255, 0, 0.1) 2px
          )
        `,
        transform: `translateY(${offset}px)`,
        transition: 'opacity 0.3s ease',
      }}
    />
  );
}

