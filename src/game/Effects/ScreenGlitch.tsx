// TEST PLAN (ScreenGlitch)
// 1. Idle State:
//    - Start game with full health
//    - Verify very subtle glitch effect (idle intensity)
//    - Should be barely noticeable
// 2. Hit Effect:
//    - Get hit by an enemy
//    - Verify glitch intensity spikes to "alert" level briefly
//    - Should return to idle after ~200ms
// 3. Low Health:
//    - Reduce health below 30%
//    - Verify glitch intensity increases to "critical" level
//    - Should remain at critical while health is low
// 4. Sentinel Active:
//    - Enter Zone 4 and activate Sentinel
//    - Verify glitch intensity increases (if Sentinel active triggers critical)
// 5. Shutdown:
//    - Hack final terminal to trigger shutdown
//    - Verify glitch intensity peaks to "shutdown" level
//    - Should be strongest during shutdown sequence
// 6. Visual Verification:
//    - Verify horizontal bands jitter position
//    - Verify opacity changes create glitch effect
//    - Verify effect is fullscreen overlay

import { useEffect, useState, useRef, useMemo } from 'react';
import { useGameState } from '../../state/gameState';

type GlitchIntensity = 'idle' | 'alert' | 'critical' | 'shutdown';

// Intensity to visual parameters (constant, defined outside component)
const intensityParams = {
  idle: { bandCount: 1, maxOpacity: 0.05, jitterAmount: 0.5 },
  alert: { bandCount: 2, maxOpacity: 0.15, jitterAmount: 2 },
  critical: { bandCount: 3, maxOpacity: 0.25, jitterAmount: 3 },
  shutdown: { bandCount: 4, maxOpacity: 0.4, jitterAmount: 5 }
};

export function ScreenGlitch() {
  const recentlyHit = useGameState((state) => state.recentlyHit);
  const playerHealth = useGameState((state) => state.playerHealth);
  const playerMaxHealth = useGameState((state) => state.playerMaxHealth);
  const isShuttingDown = useGameState((state) => state.isShuttingDown);
  
  const [intensity, setIntensity] = useState<GlitchIntensity>('idle');
  const [bandPositions, setBandPositions] = useState<number[]>([]);
  const [bandOpacities, setBandOpacities] = useState<number[]>([]);
  const animationFrameRef = useRef<number | undefined>(undefined);
  
  // Memoize params based on intensity
  const params = useMemo(() => intensityParams[intensity], [intensity]);
  
  // Determine intensity based on game state
  useEffect(() => {
    if (isShuttingDown) {
      setIntensity('shutdown');
    } else if (recentlyHit) {
      setIntensity('alert');
      // Return to previous state after hit effect
      const timer = setTimeout(() => {
        const healthRatio = playerHealth / playerMaxHealth;
        if (healthRatio < 0.3) {
          setIntensity('critical');
        } else {
          setIntensity('idle');
        }
      }, 200);
      return () => clearTimeout(timer);
    } else {
      const healthRatio = playerHealth / playerMaxHealth;
      if (healthRatio < 0.3) {
        setIntensity('critical');
      } else {
        setIntensity('idle');
      }
    }
  }, [recentlyHit, playerHealth, playerMaxHealth, isShuttingDown]);
  
  // Initialize bands
  useEffect(() => {
    const newBands = Array.from({ length: params.bandCount }, () => Math.random() * 100);
    setBandPositions(newBands);
    const newOpacities = Array.from({ length: params.bandCount }, () => Math.random() * params.maxOpacity);
    setBandOpacities(newOpacities);
  }, [intensity, params]);
  
  // Animate bands
  useEffect(() => {
    const animate = () => {
      setBandPositions((prev) =>
        prev.map((pos) => {
          const jitter = (Math.random() - 0.5) * params.jitterAmount;
          return Math.max(0, Math.min(100, pos + jitter));
        })
      );
      
      setBandOpacities((prev) =>
        prev.map(() => Math.random() * params.maxOpacity)
      );
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [intensity, params]);
  
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 1400,
        overflow: 'hidden',
      }}
    >
      {bandPositions.map((position, index) => (
        <div
          key={index}
          style={{
            position: 'absolute',
            top: `${position}%`,
            left: 0,
            width: '100%',
            height: '2px',
            backgroundColor: '#ffffff',
            opacity: bandOpacities[index] || 0,
            transform: `translateX(${(Math.random() - 0.5) * params.jitterAmount}px)`,
            transition: 'none',
          }}
        />
      ))}
      {/* Additional noise overlay for shutdown */}
      {intensity === 'shutdown' && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: `
              repeating-linear-gradient(
                0deg,
                transparent,
                transparent 2px,
                rgba(255, 0, 0, 0.03) 2px,
                rgba(255, 0, 0, 0.03) 4px
              )
            `,
            opacity: 0.3,
          }}
        />
      )}
    </div>
  );
}

