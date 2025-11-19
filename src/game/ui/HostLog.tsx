// TEST PLAN (HostLog)
// 1. Display Messages:
//    - Call playHostLine('zoneEntry', { zoneId: 'zone1' })
//    - Verify message appears in top-right corner
//    - Call playHostLine('hacking:start')
//    - Verify second message appears below first
//    - Messages should stack vertically, newest at bottom
// 2. Fade Out:
//    - Wait 6 seconds after a message appears
//    - Verify message opacity fades to 0
//    - Verify message slides up slightly during fade
// 3. Message Limit:
//    - Call playHostLine 7 times with different events
//    - Verify only last 5 messages are visible
//    - Oldest messages should be removed
// 4. Styling:
//    - Verify monospace font
//    - Verify off-white text color (#f5f5f5)
//    - Verify semi-transparent dark background
//    - Verify subtle glow effect
// 5. Multiple Events:
//    - Trigger zoneEntry, hacking:start, combat:lowHealth
//    - Verify all three messages appear and fade independently

import { useEffect, useState } from 'react';
import { useGameState } from '../../state/gameState';

const FADE_DURATION = 6000; // 6 seconds

export function HostLog() {
  const hostMessages = useGameState((state) => state.hostMessages);
  const [messageOpacities, setMessageOpacities] = useState<Record<string, number>>({});
  
  // Update opacities based on message timestamps
  useEffect(() => {
    const updateOpacities = () => {
      const now = Date.now();
      const newOpacities: Record<string, number> = {};
      
      hostMessages.forEach((msg) => {
        const age = now - msg.timestamp;
        if (age >= FADE_DURATION) {
          newOpacities[msg.id] = 0;
        } else {
          // Fade starts at 3 seconds, completes at 6 seconds
          const fadeStart = FADE_DURATION * 0.5; // 3 seconds
          if (age < fadeStart) {
            newOpacities[msg.id] = 1;
          } else {
            const fadeProgress = (age - fadeStart) / (FADE_DURATION - fadeStart);
            newOpacities[msg.id] = Math.max(0, 1 - fadeProgress);
          }
        }
      });
      
      setMessageOpacities(newOpacities);
    };
    
    // Update immediately
    updateOpacities();
    
    // Update every frame for smooth fade
    const interval = setInterval(updateOpacities, 16); // ~60fps
    
    return () => clearInterval(interval);
  }, [hostMessages]);
  
  if (hostMessages.length === 0) {
    return null;
  }
  
  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: 1500,
        maxWidth: '400px',
        pointerEvents: 'none',
      }}
    >
      {hostMessages.map((msg) => {
        const opacity = messageOpacities[msg.id] ?? 1;
        const age = Date.now() - msg.timestamp;
        const slideOffset = age > FADE_DURATION * 0.5 ? (age - FADE_DURATION * 0.5) * 0.1 : 0;
        
        return (
          <div
            key={msg.id}
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              color: '#f5f5f5',
              padding: '10px 15px',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '14px',
              opacity: opacity,
              transform: `translateY(-${slideOffset}px)`,
              transition: 'opacity 0.1s linear, transform 0.1s linear',
              textShadow: '0 0 4px rgba(245, 245, 245, 0.5)',
              border: '1px solid rgba(245, 245, 245, 0.2)',
            }}
          >
            {msg.text}
          </div>
        );
      })}
    </div>
  );
}

