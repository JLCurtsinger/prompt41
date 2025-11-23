// TEST PLAN (ZoneLabel)
// 1. Initial Display:
//    - On game start, currentZone should be 'zone1'
//    - ZoneLabel should fade in showing "ZONE 01 – PERIMETER BREACH"
//    - Should stay visible ~2.5s, then fade out over ~0.7s
// 2. Zone Transitions:
//    - Walk into Zone 2 -> label should fade in showing "ZONE 02 – PROCESSING YARD"
//    - Walk into Zone 3 -> label should fade in showing "ZONE 03 – CONDUIT HALL"
//    - Walk into Zone 4 -> label should fade in showing "ZONE 04 – CORE ACCESS CHAMBER"
// 3. Timing Verification:
//    - Fade in should take ~0.3s
//    - Visible duration should be ~2.5s
//    - Fade out should take ~0.7s
//    - Total display time should be ~3.5s per zone change
// 4. Reset Behavior:
//    - Die and respawn (R key) -> should show Zone 1 label again
//    - Verify label appears after resetPlayer() is called
// 5. Visual Verification:
//    - Text should be white or soft teal
//    - Should have subtle translucent dark background
//    - Should be positioned in lower-left or lower-center
//    - Should not interfere with other UI elements

import { useEffect, useState } from 'react';
import { useGameState } from '../../state/gameState';

const ZONE_LABELS: Record<'zone1' | 'zone2' | 'zone3' | 'zone4', string> = {
  zone1: 'ZONE 01 – PERIMETER BREACH',
  zone2: 'ZONE 02 – PROCESSING YARD',
  zone3: 'ZONE 03 – CONDUIT HALL',
  zone4: 'ZONE 04 – CORE ACCESS CHAMBER',
};

const FADE_IN_DURATION = 300; // milliseconds
const VISIBLE_DURATION = 2500; // milliseconds
const FADE_OUT_DURATION = 700; // milliseconds

export function ZoneLabel() {
  const currentZone = useGameState((state) => state.currentZone);
  const [opacity, setOpacity] = useState(0);
  const [displayText, setDisplayText] = useState<string | null>(null);
  const [lastZone, setLastZone] = useState<string | null>(null);
  
  useEffect(() => {
    // When zone changes (or on initial load), start the fade sequence
    const label = ZONE_LABELS[currentZone];
    if (!label) return;
    
    // Trigger on initial load (lastZone is null) or when zone changes
    if (lastZone !== null && lastZone === currentZone) {
      return;
    }
    
    setLastZone(currentZone);
    setDisplayText(label);
    setOpacity(0);
    
    // Fade in
    const fadeInStart = Date.now();
    const fadeIn = () => {
      const elapsed = Date.now() - fadeInStart;
      const progress = Math.min(elapsed / FADE_IN_DURATION, 1);
      setOpacity(progress);
      
      if (progress < 1) {
        requestAnimationFrame(fadeIn);
      }
    };
    requestAnimationFrame(fadeIn);
    
    // After fade in + visible duration, fade out
    const fadeOutStart = Date.now() + FADE_IN_DURATION + VISIBLE_DURATION;
    const fadeOut = () => {
      const elapsed = Date.now() - fadeOutStart;
      if (elapsed < 0) {
        setTimeout(() => requestAnimationFrame(fadeOut), 100);
        return;
      }
      
      const progress = Math.min(elapsed / FADE_OUT_DURATION, 1);
      setOpacity(1 - progress);
      
      if (progress < 1) {
        requestAnimationFrame(fadeOut);
      } else {
        // Clear text after fade out completes
        setDisplayText(null);
      }
    };
    
    // Start fade out after visible duration
    setTimeout(() => {
      requestAnimationFrame(fadeOut);
    }, FADE_IN_DURATION + VISIBLE_DURATION);
  }, [currentZone]);
  
  if (!displayText) {
    return null;
  }
  
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '40px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1200,
        pointerEvents: 'none',
        opacity: opacity,
        transition: 'opacity 0.05s linear',
      }}
    >
      <div
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          color: '#00ffff',
          padding: '12px 24px',
          borderRadius: '4px',
          fontFamily: 'monospace',
          fontSize: '18px',
          fontWeight: 'bold',
          textShadow: '0 0 8px rgba(0, 255, 255, 0.5)',
          letterSpacing: '2px',
          border: '1px solid rgba(0, 255, 255, 0.3)',
        }}
      >
        {displayText}
      </div>
    </div>
  );
}

